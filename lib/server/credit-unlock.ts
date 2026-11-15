import "server-only";

// The server half of #217: record each delivery a shop pays in full digitally, and give a new
// shop its first limit once the rule in lib/credit-unlock.ts is met. No contract change: it is
// the same admin `set_terms` that used to give $200 at sign-up.

import { DOOR_PAYMENTS_NEEDED, type DoorPayment, firstLimit, neverHadCredit, unlockProgress, VOUCHED_FIRST_LIMIT } from "@/lib/credit-unlock";
import type { Db } from "@/lib/server/db";
import { readClient } from "@/lib/stellar/client";
import { read, run } from "@/lib/stellar/send";
import { toUnits } from "@/lib/stellar/units";

const ready = new WeakSet<Db>();
export async function ensureDoorPayments(db: Db): Promise<void> {
  if (ready.has(db)) return;
  await db.query(`CREATE TABLE IF NOT EXISTS door_payments (
    shop_id TEXT NOT NULL, invoice_id BIGINT NOT NULL, cents BIGINT NOT NULL,
    paid_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (shop_id, invoice_id))`);
  ready.add(db);
}

/** A delivery the shop just finished paying in dólares digitales. Once per invoice. */
export async function recordDoorPayment(db: Db, shopId: string, invoiceId: number, cents: number, at = new Date()): Promise<void> {
  await ensureDoorPayments(db);
  await db.query(`INSERT INTO door_payments (shop_id, invoice_id, cents, paid_at) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`, [
    shopId,
    invoiceId,
    cents,
    at.toISOString(),
  ]);
}

export async function doorPayments(db: Db, shopId: string): Promise<DoorPayment[]> {
  await ensureDoorPayments(db);
  const rows = await db.query<{ paid_at: string | Date; cents: string | number }>(`SELECT paid_at, cents FROM door_payments WHERE shop_id = $1`, [shopId]);
  return rows.map((r) => ({ at: new Date(r.paid_at).getTime(), cents: Number(r.cents) }));
}

/** The credit period in ms, from the contract (a week for real, 2 minutes in the demo). */
export async function creditPeriodMs(): Promise<number> {
  return Number((await read(readClient().get_config())).credit_period_secs) * 1000;
}

export type Unlock = { paid: number; needed: number; nextFrom?: string };

/** Where a shop with no credit yet stands, or null if the rule doesn't apply to it. */
export async function unlockStatus(db: Db, shopId: string, view: Parameters<typeof neverHadCredit>[0], periodMs?: number): Promise<Unlock | null> {
  if (!neverHadCredit(view)) return null;
  const progress = unlockProgress(await doorPayments(db, shopId), periodMs ?? (await creditPeriodMs()));
  return { paid: progress.counted, needed: DOOR_PAYMENTS_NEEDED, ...(progress.nextFrom ? { nextFrom: new Date(progress.nextFrom).toISOString() } : {}) };
}

type SetTerms = (address: string, limitUnits: bigint) => Promise<unknown>;
const adminSetTerms: SetTerms = (address, limit) => run("admin", (client) => client.set_terms({ shop: address, limit }));

/** After a door payment: gives the first limit if the rule is now met. Returns it in dollars, or null. */
export async function unlockIfDue(
  db: Db,
  shop: { id: string; address: string },
  setTerms: SetTerms = adminSetTerms,
  view?: Parameters<typeof neverHadCredit>[0],
  periodMs?: number,
): Promise<number | null> {
  const now = view ?? (await read(readClient().get_shop({ shop: shop.address })));
  if (!neverHadCredit(now)) return null;
  const payments = await doorPayments(db, shop.id);
  if (unlockProgress(payments, periodMs ?? (await creditPeriodMs())).counted < DOOR_PAYMENTS_NEEDED) return null;
  const limit = firstLimit(payments);
  await setTerms(shop.address, toUnits(limit.toFixed(2)));
  return limit;
}

/** A distributor vouches for a shop with no credit yet: it gets $100 straight away. */
export async function unlockVouched(shop: { address: string }, setTerms: SetTerms = adminSetTerms): Promise<number | null> {
  const view = await read(readClient().get_shop({ shop: shop.address }));
  if (!neverHadCredit(view)) return null;
  await setTerms(shop.address, toUnits(VOUCHED_FIRST_LIMIT.toFixed(2)));
  return VOUCHED_FIRST_LIMIT;
}
