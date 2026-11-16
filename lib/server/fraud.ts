import "server-only";

// Fraud reviews (#231): the stored side of lib/fraud.ts. A scan reads every invoice on the contract
// and the accounts behind them, runs the rules per distributor (and flags shops that defaulted),
// and opens a review for anything new. While a distributor is in review, its shops can't put its
// invoices on the lender pool. An admin asks for proof, clears the review, or closes the account.

import { checkDistributor, defaultRate, type Flag, flagKey, type FraudInvoice, type FraudShop } from "@/lib/fraud";
import type { Db } from "./db";

export type ReviewKind = "distributor" | "shop";
export type ReviewStatus = "en_revision" | "prueba_pedida" | "despejada" | "cerrada";

export type Review = {
  kind: ReviewKind;
  partyId: string;
  name: string;
  status: ReviewStatus;
  flags: Flag[];
  note: string;
  updatedAt: string;
};

/** A review that pauses credit: still open. */
export const OPEN: ReviewStatus[] = ["en_revision", "prueba_pedida"];

const ready = new WeakSet<Db>();
export async function ensureFraudTables(db: Db): Promise<void> {
  if (ready.has(db)) return;
  await db.query(`CREATE TABLE IF NOT EXISTS fraud_reviews (
    kind TEXT NOT NULL, party_id TEXT NOT NULL, name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'en_revision', flags TEXT NOT NULL DEFAULT '[]',
    cleared TEXT NOT NULL DEFAULT '[]', note TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (kind, party_id))`);
  ready.add(db);
}

type Row = { kind: ReviewKind; party_id: string; name: string; status: ReviewStatus; flags: string; cleared: string; note: string; updated_at: string | Date };

const toReview = (r: Row): Review => ({
  kind: r.kind,
  partyId: r.party_id,
  name: r.name,
  status: r.status,
  flags: JSON.parse(r.flags) as Flag[],
  note: r.note,
  updatedAt: new Date(r.updated_at).toISOString(),
});

export async function listReviews(db: Db): Promise<Review[]> {
  await ensureFraudTables(db);
  const rows = await db.query<Row>(`SELECT * FROM fraud_reviews ORDER BY (status IN ('en_revision', 'prueba_pedida')) DESC, updated_at DESC`);
  return rows.map(toReview);
}

/** True while this distributor's review is open: its invoices can't go on the lender pool. */
export async function inReview(db: Db, kind: ReviewKind, partyId: string): Promise<boolean> {
  await ensureFraudTables(db);
  const rows = await db.query<{ status: string }>(`SELECT status FROM fraud_reviews WHERE kind = $1 AND party_id = $2`, [kind, partyId]);
  return rows.length > 0 && (OPEN as string[]).includes(rows[0].status);
}

/**
 * Records what a scan found for one party. New flags (not cleared before) open the review again;
 * flags an admin already cleared stay quiet. A closed account stays closed.
 */
export async function recordFlags(db: Db, kind: ReviewKind, partyId: string, name: string, flags: Flag[]): Promise<boolean> {
  await ensureFraudTables(db);
  if (flags.length === 0) return false;
  const [row] = await db.query<Row>(`SELECT * FROM fraud_reviews WHERE kind = $1 AND party_id = $2`, [kind, partyId]);
  if (!row) {
    await db.query(`INSERT INTO fraud_reviews (kind, party_id, name, flags) VALUES ($1, $2, $3, $4)`, [kind, partyId, name, JSON.stringify(flags)]);
    return true;
  }
  if (row.status === "cerrada") return false;
  const cleared = new Set(JSON.parse(row.cleared) as string[]);
  const fresh = flags.filter((f) => !cleared.has(flagKey(f)));
  if (fresh.length === 0) return false;
  const open = (OPEN as string[]).includes(row.status);
  await db.query(`UPDATE fraud_reviews SET flags = $3, name = $4, status = $5, updated_at = now() WHERE kind = $1 AND party_id = $2`, [
    kind,
    partyId,
    JSON.stringify(flags),
    name,
    open ? row.status : "en_revision",
  ]);
  return !open;
}

/** An admin's decision. "despejada" remembers the flags it saw, so the same ones don't come back. */
export async function decideReview(db: Db, kind: ReviewKind, partyId: string, status: ReviewStatus, note?: string): Promise<Review | null> {
  await ensureFraudTables(db);
  const [row] = await db.query<Row>(`SELECT * FROM fraud_reviews WHERE kind = $1 AND party_id = $2`, [kind, partyId]);
  if (!row) return null;
  const cleared = status === "despejada" ? JSON.stringify([...new Set([...(JSON.parse(row.cleared) as string[]), ...(JSON.parse(row.flags) as Flag[]).map(flagKey)])]) : row.cleared;
  const [updated] = await db.query<Row>(
    `UPDATE fraud_reviews SET status = $3, cleared = $4, note = COALESCE($5, note), updated_at = now() WHERE kind = $1 AND party_id = $2 RETURNING *`,
    [kind, partyId, status, cleared, note ?? null],
  );
  return toReview(updated);
}

export async function saveNote(db: Db, kind: ReviewKind, partyId: string, note: string): Promise<void> {
  await ensureFraudTables(db);
  await db.query(`UPDATE fraud_reviews SET note = $3 WHERE kind = $1 AND party_id = $2`, [kind, partyId, note.slice(0, 2000)]);
}

/** What a scan needs, read by the caller (contract + database), so the scan itself needs no network. */
export type ScanInput = {
  distributors: { id: string; name: string; phones: string[]; passkeys: string[]; invoices: FraudInvoice[] }[];
  shops: FraudShop[];
  now: number;
};

/** Runs every rule and records the results. Returns how many reviews opened. */
export async function scan(db: Db, input: ScanInput): Promise<number> {
  const shops = new Map(input.shops.map((s) => [s.id, s]));
  const average = defaultRate(input.shops);
  let opened = 0;
  for (const d of input.distributors) {
    const flags = checkDistributor(d, d.invoices, shops, average, input.now);
    if (await recordFlags(db, "distributor", d.id, d.name, flags)) opened++;
  }
  // A shop that took credit and didn't pay it back: kick-off is the admin's call.
  for (const s of input.shops) {
    if (s.defaulted && (await recordFlags(db, "shop", s.id, s.name, [{ rule: "defaults", shopId: s.id, shopName: s.name, count: 1 }]))) opened++;
  }
  return opened;
}
