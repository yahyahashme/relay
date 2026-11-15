// How a new shop unlocks pool credit (#217). We can't check a shop's ID, so credit starts with
// what the shop already does: paying its deliveries at the door. Two deliveries paid in full in
// dólares digitales, at least one credit period apart (a week; 2 minutes in the demo), show the
// shop is real, has a phone and buys every week. Then the first limit is half its usual delivery,
// between $50 and $100, so a shop that runs takes at most about $100 of stock and loses its supplier.

export const DOOR_PAYMENTS_NEEDED = 2;
export const FIRST_LIMIT_MIN = 50;
export const FIRST_LIMIT_MAX = 100;
/** A shop its distributor vouches for skips the wait: the deposit backs it. */
export const VOUCHED_FIRST_LIMIT = 100;

/** One delivery the shop paid in full digitally: when (ms) and the invoice's amount in cents. */
export type DoorPayment = { at: number; cents: number };

/** How many door payments count so far (each one a period after the last that counted), and when the next one can. */
export function unlockProgress(payments: DoorPayment[], periodMs: number): { counted: number; nextFrom?: number } {
  const times = payments.map((p) => p.at).sort((a, b) => a - b);
  let counted = 0;
  let last = -Infinity;
  for (const at of times) {
    if (at - last >= periodMs) {
      counted += 1;
      last = at;
      if (counted === DOOR_PAYMENTS_NEEDED) return { counted };
    }
  }
  return counted === 0 ? { counted } : { counted, nextFrom: last + periodMs };
}

/** The first limit in dollars: half the average paid delivery, down to $5, kept to $50..$100. */
export function firstLimit(payments: DoorPayment[]): number {
  if (payments.length === 0) return FIRST_LIMIT_MIN;
  const average = payments.reduce((sum, p) => sum + p.cents, 0) / payments.length / 100;
  const half = Math.floor(average / 2 / 5) * 5;
  return Math.min(FIRST_LIMIT_MAX, Math.max(FIRST_LIMIT_MIN, half));
}

/** True for a shop that has never had pool credit: the only kind this rule ever gives a limit to. */
export function neverHadCredit(view: { limit: bigint; first_credit_at: bigint; written_off: bigint; late: number }): boolean {
  return view.limit === 0n && view.first_credit_at === 0n && view.written_off === 0n && view.late === 0;
}
