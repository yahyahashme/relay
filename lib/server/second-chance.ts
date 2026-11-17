import "server-only";

// Appeals for a second chance (route 3 in lib/second-chance.ts), kept in Postgres, and the check
// that a shop was closed for fraud (those never restart through a second chance).

import { type AppealInput, type AppealRecord, type AppealStatus, appealBlock, RESTART_LIMIT } from "@/lib/second-chance";
import type { Db } from "@/lib/server/db";
import { run } from "@/lib/stellar/send";
import { toUnits } from "@/lib/stellar/units";

/** Gives a stopped shop its $50 again (routes 1 to 3). */
export async function restartCredit(address: string): Promise<void> {
  await run("admin", (client) => client.set_terms({ shop: address, limit: toUnits(RESTART_LIMIT.toFixed(2)) }));
}

const ready = new WeakSet<Db>();
export async function ensureAppeals(db: Db): Promise<void> {
  if (ready.has(db)) return;
  await db.query(`CREATE TABLE IF NOT EXISTS credit_appeals (
    id SERIAL PRIMARY KEY, shop_id TEXT NOT NULL, shop_name TEXT NOT NULL,
    why TEXT NOT NULL, changed TEXT NOT NULL, plan TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendiente', note TEXT NOT NULL DEFAULT '',
    written_off_cents BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), decided_at TIMESTAMPTZ)`);
  ready.add(db);
}

export type Appeal = AppealInput & {
  id: number;
  shopId: string;
  shopName: string;
  status: AppealStatus;
  /** The written-off debt when it was sent, in dollars. */
  writtenOff: number;
  createdAt: string;
  decidedAt?: string;
};

type Row = { id: number; shop_id: string; shop_name: string; why: string; changed: string; plan: string; status: AppealStatus; written_off_cents: string | number; created_at: string | Date; decided_at: string | Date | null };

const toAppeal = (r: Row): Appeal => ({
  id: Number(r.id),
  shopId: r.shop_id,
  shopName: r.shop_name,
  why: r.why,
  changed: r.changed,
  plan: r.plan,
  status: r.status,
  writtenOff: Number(r.written_off_cents) / 100,
  createdAt: new Date(r.created_at).toISOString(),
  ...(r.decided_at ? { decidedAt: new Date(r.decided_at).toISOString() } : {}),
});

export async function shopAppeals(db: Db, shopId: string): Promise<Appeal[]> {
  await ensureAppeals(db);
  const rows = await db.query<Row>(`SELECT * FROM credit_appeals WHERE shop_id = $1 ORDER BY created_at DESC, id DESC`, [shopId]);
  return rows.map(toAppeal);
}

/** Pending first, then the newest. */
export async function listAppeals(db: Db): Promise<Appeal[]> {
  await ensureAppeals(db);
  const rows = await db.query<Row>(`SELECT * FROM credit_appeals ORDER BY (status = 'pendiente') DESC, created_at DESC, id DESC LIMIT 100`);
  return rows.map(toAppeal);
}

const records = (appeals: Appeal[]): AppealRecord[] => appeals.map((a) => ({ status: a.status, createdAt: a.createdAt, decidedAt: a.decidedAt }));

/** Saves an appeal unless one is pending or one was approved in the last 6 months. */
export async function addAppeal(
  db: Db,
  shop: { id: string; name: string; writtenOffCents: number },
  input: AppealInput,
  now = Date.now(),
): Promise<{ ok: true; appeal: Appeal } | { ok: false; block: NonNullable<ReturnType<typeof appealBlock>> }> {
  const block = appealBlock(records(await shopAppeals(db, shop.id)), now);
  if (block) return { ok: false, block };
  const [row] = await db.query<Row>(
    `INSERT INTO credit_appeals (shop_id, shop_name, why, changed, plan, written_off_cents) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [shop.id, shop.name, input.why, input.changed, input.plan, Math.round(shop.writtenOffCents)],
  );
  return { ok: true, appeal: toAppeal(row) };
}

export async function getAppeal(db: Db, id: number): Promise<Appeal | null> {
  await ensureAppeals(db);
  const [row] = await db.query<Row>(`SELECT * FROM credit_appeals WHERE id = $1`, [id]);
  return row ? toAppeal(row) : null;
}

/** Approve only while no other appeal of this shop was approved in the last 6 months. */
export async function mayApprove(db: Db, appeal: Appeal, now = Date.now()): Promise<boolean> {
  const others = (await shopAppeals(db, appeal.shopId)).filter((a) => a.id !== appeal.id);
  return appealBlock(records(others).filter((a) => a.status !== "pendiente"), now) === null;
}

/** Marks a pending appeal decided. False if it was already decided. */
export async function decideAppeal(db: Db, id: number, status: "aprobada" | "rechazada"): Promise<boolean> {
  await ensureAppeals(db);
  const rows = await db.query(`UPDATE credit_appeals SET status = $2, decided_at = now() WHERE id = $1 AND status = 'pendiente' RETURNING id`, [id, status]);
  return rows.length > 0;
}

/** A shop closed in a fraud review ("Cerrar cuenta"): no second chance through these routes. */
export async function closedForFraud(db: Db | null, shopId: string): Promise<boolean> {
  if (!db) return false;
  await db.query(`CREATE TABLE IF NOT EXISTS fraud_reviews (
    kind TEXT NOT NULL, party_id TEXT NOT NULL, name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'en_revision', flags TEXT NOT NULL DEFAULT '[]',
    cleared TEXT NOT NULL DEFAULT '[]', note TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (kind, party_id))`);
  const rows = await db.query(`SELECT 1 FROM fraud_reviews WHERE kind = 'shop' AND party_id = $1 AND status = 'cerrada'`, [shopId]);
  return rows.length > 0;
}

export type SecondChance = { appeal?: AppealStatus; appealAt?: string; nextAppealFrom?: string };

/** What a stopped shop's own screen shows about a second chance; null for a shop closed for fraud. */
export async function secondChanceFor(db: Db, shopId: string, now = Date.now()): Promise<SecondChance | null> {
  if (await closedForFraud(db, shopId)) return null;
  const appeals = await shopAppeals(db, shopId);
  const block = appealBlock(records(appeals), now);
  const last = appeals[0];
  return {
    ...(last ? { appeal: last.status, appealAt: last.decidedAt ?? last.createdAt } : {}),
    ...(block?.reason === "cooldown" ? { nextAppealFrom: block.from } : {}),
  };
}
