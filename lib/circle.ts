// The circle check (#221). A distributor could fake a shop's two door payments (the way a new shop
// unlocks credit) by sending the "shop" the money first, maybe through a friend or two, and having
// it pay the invoice back. This walks the money in the shop's account backwards: who sent it, who
// sent them, up to 3 steps and 14 days before the payment. If the trail reaches the shop's own
// distributor, the payment is a circle: it doesn't count toward unlock and the admin sees a flag.
// It is never a ban by itself. Only the yes/no is kept, never the accounts walked through.

export const CIRCLE_STEPS = 3;
export const CIRCLE_DAYS = 14;
/** Per account, only the biggest senders are followed, so one busy account can't blow up the walk. */
export const CIRCLE_FAN_OUT = 10;
/** At most this many accounts are looked up per check. */
export const CIRCLE_LOOKUPS = 30;
const DAY = 86_400_000;

/** One payment into an account: who sent it and when (Unix ms). */
export type Inflow = { from: string; at: number; amount: number };

/** Payments into `address` between `since` and `before` (Unix ms). */
export type Inflows = (address: string, since: number, before: number) => Promise<Inflow[]>;

/**
 * True if money paid in by `shop` at `paidAt` came, within 3 steps and 14 days, from the shop's
 * distributor (`targets`: its account and its drivers'). Each step back must be earlier than the one after it. Accounts in `ignore` (Relay's own, the
 * contract, the token issuer) are not followed.
 */
export async function loopsBack(shop: string, targets: ReadonlySet<string>, paidAt: number, inflows: Inflows, ignore: ReadonlySet<string> = new Set()): Promise<boolean> {
  const since = paidAt - CIRCLE_DAYS * DAY;
  const seen = new Set([shop]);
  let level: { address: string; before: number }[] = [{ address: shop, before: paidAt }];
  let lookups = 0;
  for (let step = 0; step < CIRCLE_STEPS && level.length > 0; step++) {
    const next: { address: string; before: number }[] = [];
    for (const node of level) {
      if (lookups >= CIRCLE_LOOKUPS) return false;
      lookups++;
      const senders = new Map<string, Inflow>();
      for (const i of await inflows(node.address, since, node.before)) {
        if (i.at < since || i.at >= node.before || ignore.has(i.from)) continue;
        if (targets.has(i.from)) return true;
        const known = senders.get(i.from);
        // Keep each sender's latest payment: it leaves the most room to look further back.
        if (!known || i.at > known.at) senders.set(i.from, { ...i, amount: (known?.amount ?? 0) + i.amount });
      }
      const biggest = [...senders.values()].sort((a, b) => b.amount - a.amount).slice(0, CIRCLE_FAN_OUT);
      for (const s of biggest) {
        if (seen.has(s.from)) continue;
        seen.add(s.from);
        next.push({ address: s.from, before: s.at });
      }
    }
    level = next;
  }
  return false;
}
