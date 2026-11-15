import "server-only";

import type { User } from "./accounts";
import { newId } from "./crypto";
import { type Db, requireDb } from "./db";
import { autoApproveSeconds } from "./distributors";
import { invalidateDirectory } from "./directory";

// Lender sign-up and approval (#207). Only lenders approved on the contract (approve_lender) can put
// money in the pool. In the real product Relay checks the business (KYB) and its licence first; in
// the demo an admin approves, or the demo approves by itself after RELAY_AUTO_APPROVE_SECONDS, the
// same setting distributors use. "Quitar aprobación" is revoke_lender: no new deposits, but the
// lender can always take its money out.

export type LenderStatus = "pendiente" | "aprobado" | "revocado";

export type Lender = {
  id: string;
  businessName: string;
  country: string;
  licence: string;
  status: LenderStatus;
  stellarAddress: string;
  ownerName: string | null;
  ownerContact: string | null;
  createdAt: string;
};

export type LenderDetails = { businessName: string; country: string; licence: string };

/** Spanish message if the details won't do, else null. */
export function checkLenderDetails(d: LenderDetails): string | null {
  if (typeof d?.businessName !== "string" || typeof d.country !== "string" || typeof d.licence !== "string") {
    return "Escriba el nombre de la empresa.";
  }
  const name = d.businessName.trim();
  if (name.length < 2 || name.length > 120) return "Escriba el nombre de la empresa.";
  const country = d.country.trim();
  if (country.length < 2 || country.length > 60) return "Escriba el país.";
  const licence = d.licence.trim();
  if (licence.length < 3 || licence.length > 60) return "Escriba el número de licencia o registro.";
  return null;
}

// The live database was set up before lenders existed: add the table, and the "prestamista" role,
// on first use (cheap, once per server). db/schema.sql has the same for a fresh database.
const ready = new WeakSet<Db>();
export async function ensureLenderTables(db: Db): Promise<void> {
  if (ready.has(db)) return;
  const [check] = await db.query<{ def: string }>(
    `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conrelid = 'users'::regclass AND conname = 'users_role_check'`,
  );
  if (check && !check.def.includes("prestamista")) {
    try {
      await db.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`);
      await db.query(
        `ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('tienda', 'distribuidora', 'motorista', 'admin', 'prestamista'))`,
      );
    } catch (error) {
      // Another server did it at the same moment: fine if the new check is there now.
      const [again] = await db.query<{ def: string }>(
        `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conrelid = 'users'::regclass AND conname = 'users_role_check'`,
      );
      if (!again?.def.includes("prestamista")) throw error;
    }
  }
  await db.query(`CREATE TABLE IF NOT EXISTS lenders (
    id TEXT PRIMARY KEY, owner_user_id TEXT NOT NULL REFERENCES users(id), business_name TEXT NOT NULL,
    country TEXT NOT NULL, licence TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'aprobado', 'revocado')),
    stellar_address TEXT NOT NULL UNIQUE, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), decided_at TIMESTAMPTZ)`);
  ready.add(db);
}

type Row = {
  id: string;
  business_name: string;
  country: string;
  licence: string;
  status: LenderStatus;
  stellar_address: string;
  owner_name: string | null;
  owner_contact: string | null;
  created_at: string | Date;
};

const SELECT = `SELECT l.*, u.name AS owner_name, COALESCE(u.phone, u.email) AS owner_contact
                  FROM lenders l LEFT JOIN users u ON u.id = l.owner_user_id`;

const toLender = (r: Row): Lender => ({
  id: r.id,
  businessName: r.business_name,
  country: r.country,
  licence: r.licence,
  status: r.status,
  stellarAddress: r.stellar_address,
  ownerName: r.owner_name,
  ownerContact: r.owner_contact,
  createdAt: new Date(r.created_at).toISOString(),
});

/** The business for a lender user, using the user's own Stellar account. */
export async function registerLender(user: User, details: LenderDetails): Promise<Lender> {
  const db = requireDb();
  await ensureLenderTables(db);
  const id = newId("l");
  await db.query(
    `INSERT INTO lenders (id, owner_user_id, business_name, country, licence, stellar_address) VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      id,
      user.id,
      details.businessName.trim().replace(/\s+/g, " "),
      details.country.trim().replace(/\s+/g, " "),
      details.licence.trim(),
      user.stellarAddress,
    ],
  );
  invalidateDirectory();
  return (await lenderById(id))!;
}

export async function lenderById(id: string): Promise<Lender | null> {
  const db = requireDb();
  await ensureLenderTables(db);
  const rows = await db.query<Row>(`${SELECT} WHERE l.id = $1`, [id]);
  return rows[0] ? toLender(rows[0]) : null;
}

export async function lenderForUser(userId: string): Promise<Lender | null> {
  const db = requireDb();
  await ensureLenderTables(db);
  const rows = await db.query<Row>(`${SELECT} WHERE l.owner_user_id = $1 ORDER BY l.created_at DESC LIMIT 1`, [userId]);
  return rows[0] ? toLender(rows[0]) : null;
}

/** Waiting first (oldest first), then approved and revoked, newest decision first. */
export async function listLendersForAdmin(): Promise<{ pending: Lender[]; decided: Lender[] }> {
  const db = requireDb();
  await ensureLenderTables(db);
  const [pending, decided] = await Promise.all([
    db.query<Row>(`${SELECT} WHERE l.status = 'pendiente' ORDER BY l.created_at ASC`),
    db.query<Row>(`${SELECT} WHERE l.status <> 'pendiente' ORDER BY l.decided_at DESC NULLS LAST LIMIT 40`),
  ]);
  return { pending: pending.map(toLender), decided: decided.map(toLender) };
}

/** approve_lender or revoke_lender with the admin key. */
export type LenderOnChain = (stellarAddress: string, approve: boolean) => Promise<void>;

/** Aprobar (also after a revoke: approve_lender clears it) or Quitar aprobación (only once approved). */
export async function decideLender(id: string, status: "aprobado" | "revocado", onChain: LenderOnChain): Promise<Lender | null> {
  const lender = await lenderById(id);
  if (!lender || lender.status === status) return lender;
  if (status === "revocado" && lender.status !== "aprobado") return lender; // nothing on chain to take away
  if (status === "aprobado" && (await isDistributorBusiness(requireDb(), lender.businessName, lender.stellarAddress))) {
    throw new LenderRefused(NO_DISTRIBUTORS);
  }
  await onChain(lender.stellarAddress, status === "aprobado");
  await requireDb().query(`UPDATE lenders SET status = $2, decided_at = now() WHERE id = $1`, [id, status]);
  invalidateDirectory();
  return lenderById(id);
}

/** An approval the rules don't allow; its message is for the screen. */
export class LenderRefused extends Error {}

/** For the waiting screen: approve now if the demo setting says it's time. Never undoes a revoke. */
export async function approveLenderIfDue(lender: Lender, onChain: LenderOnChain, now = Date.now()): Promise<Lender> {
  const seconds = autoApproveSeconds();
  if (lender.status !== "pendiente" || seconds === null) return lender;
  if (now - Date.parse(lender.createdAt) < seconds * 1000) return lender;
  return (await decideLender(lender.id, "aprobado", onChain)) ?? lender;
}

/** Distributors never fund the pool (Yahya, Nov 15): they carry credit with "Dar yo los 7 días" instead. */
export const NO_DISTRIBUTORS = "Las distribuidoras no ponen dinero en el fondo: dan los 7 días con su propio dinero.";

/**
 * Is this business a distributor on Relay? The same name as a distributor (any case or spacing),
 * or the same Stellar account. Checked at sign-up and again before an admin approves.
 */
export async function isDistributorBusiness(db: Db, businessName: string, stellarAddress?: string): Promise<boolean> {
  const name = businessName.trim().replace(/\s+/g, " ").toLowerCase();
  const rows = await db.query(
    `SELECT 1 FROM distributors WHERE lower(regexp_replace(trim(business_name), '\\s+', ' ', 'g')) = $1 OR stellar_address = $2 LIMIT 1`,
    [name, stellarAddress ?? ""],
  );
  return rows.length > 0;
}

/** Test dollars a new lender starts with, like the demo lender's deposit. */
export const STARTING_TEST_DOLLARS = 5_000;
