// Second chances (Yahya, Nov 17; judges asked how a shop that failed comes back). Shops are
// businesses and businesses fail. A shop whose credit stopped after a default (limit $0, nothing
// owed now) can restart at $50 on the pool in three ways, all through the admin's `set_terms`
// (no contract change):
//   1. It pays back its written-off debt in full: automatic.
//   2. Any approved distributor vouches for it, if its deposit covers 20% of the $50 (full
//      recourse, like any vouched shop). Works before the old debt is paid.
//   3. It sends an appeal (why it fell behind, what changed, how it will pay the old debt) that a
//      Relay admin approves in /admin. At most one approved appeal every 6 months.
// After a restart the normal growth rules apply. A shop closed for fraud never restarts this way.

export const RESTART_LIMIT = 50;
/** One approved appeal per shop in this window. */
export const APPEAL_COOLDOWN_DAYS = 182;
const DAY_MS = 24 * 60 * 60 * 1000;
export const APPEAL_MAX_CHARS = 600;

type View = { limit: bigint; owed: bigint; first_credit_at: bigint; written_off: bigint; late: number };

/** A shop that had pool credit and lost it: limit $0 and nothing owed right now. */
export function creditStopped(view: View): boolean {
  const hadCredit = view.first_credit_at > 0n || view.written_off > 0n || view.late > 0;
  return view.limit === 0n && view.owed === 0n && hadCredit;
}

/** Route 1: this repayment cleared the last of a written-off debt on a stopped shop. */
export function restartsAfterRepay(before: View, after: View & { later_overdue: boolean }): boolean {
  return before.written_off > 0n && after.written_off === 0n && creditStopped(after) && !after.later_overdue;
}

export type AppealStatus = "pendiente" | "aprobada" | "rechazada";
export type AppealRecord = { status: AppealStatus; createdAt: string; decidedAt?: string };

/** Why a shop can't send (or an admin can't approve) an appeal right now, and from when it can again. */
export function appealBlock(appeals: AppealRecord[], now: number): { reason: "pending" } | { reason: "cooldown"; from: string } | null {
  if (appeals.some((a) => a.status === "pendiente")) return { reason: "pending" };
  const lastApproved = appeals
    .filter((a) => a.status === "aprobada" && a.decidedAt)
    .map((a) => Date.parse(a.decidedAt!))
    .sort((a, b) => b - a)[0];
  if (lastApproved !== undefined && now - lastApproved < APPEAL_COOLDOWN_DAYS * DAY_MS) {
    return { reason: "cooldown", from: new Date(lastApproved + APPEAL_COOLDOWN_DAYS * DAY_MS).toISOString() };
  }
  return null;
}

export type AppealInput = { why: string; changed: string; plan: string };

/** Trims the three answers; null if one is too short to review or too long. */
export function cleanAppeal(input: AppealInput): AppealInput | null {
  const out = {
    why: String(input.why ?? "").trim(),
    changed: String(input.changed ?? "").trim(),
    plan: String(input.plan ?? "").trim(),
  };
  const fine = (s: string) => s.length >= 10 && s.length <= APPEAL_MAX_CHARS;
  return fine(out.why) && fine(out.changed) && fine(out.plan) ? out : null;
}
