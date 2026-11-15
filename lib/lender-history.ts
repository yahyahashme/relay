// A lender's own movements on /prestamista (#224): what it put in, what it took out, and its part
// of every credit sale. The contract keeps no per-lender ledger, only shares: every lender owns
// shares of the pool, and each credit sale's 0.50% raises what every share is worth. So its part
// of a sale = its shares / all shares at that moment. Walking the events from newest to oldest,
// starting from the shares the contract holds today, gives those shares at each moment.

export const LENDER_BPS = 50n; // 0.50% of a credit sale goes to the lenders
export const RECOURSE_LENDER_BPS = 15n; // 0.15% when a distributor vouches for the shop (#185)

const UNITS = 10_000_000; // 7 decimals
const dollars = (units: bigint | number) => Number(units) / UNITS;

export type PoolEvent =
  | { kind: "deposit" | "withdraw"; lender: string; amount: bigint; shares: bigint; at: string; txHash?: string }
  | { kind: "credit"; invoiceId: number; amount: bigint; recourse: boolean; at: string; txHash?: string }
  | { kind: "default"; owed: bigint; covered: bigint; at: string; txHash?: string };

export type LenderMove =
  /** Puso / Retiró: dollars moved. */
  | { kind: "in" | "out"; at: string; amount: number; txHash?: string }
  /** Su parte: dollars of theirs the sale used, and what they earned on it. */
  | { kind: "share"; at: string; invoiceId: number; used: number; earned: number; txHash?: string }
  /** A debt the backup fund couldn't cover: their part of the loss. */
  | { kind: "loss"; at: string; lost: number; txHash?: string }
  /** What happened before the oldest event the network still keeps, so the totals add up. */
  | { kind: "earlier"; putIn: number; earned: number };

export type LenderHistory = { moves: LenderMove[]; putIn: number; earned: number };

/**
 * `events` newest first. `now` = the lender's shares and all the pool's shares today, and the
 * figures the screen shows (Puso = netDeposited, Ganó = value − netDeposited), which the moves add up to.
 */
export function buildLenderHistory(
  events: PoolEvent[],
  lender: string,
  now: { shares: bigint; poolShares: bigint; value: number; netDeposited: number },
): LenderHistory {
  const moves: LenderMove[] = [];
  let mine = now.shares;
  let all = now.poolShares;
  let putIn = 0;
  let earned = 0;
  for (const e of events) {
    if (e.kind === "deposit" || e.kind === "withdraw") {
      const me = e.lender === lender;
      if (me) {
        moves.push({ kind: e.kind === "deposit" ? "in" : "out", at: e.at, amount: dollars(e.amount), txHash: e.txHash });
        putIn += e.kind === "deposit" ? dollars(e.amount) : -dollars(e.amount);
      }
      // Before this event the shares were different: undo it.
      const sign = e.kind === "deposit" ? -1n : 1n;
      all += sign * e.shares;
      if (me) mine += sign * e.shares;
      continue;
    }
    if (mine <= 0n || all <= 0n) continue;
    const part = Number(mine) / Number(all);
    if (e.kind === "credit") {
      const toLenders = (e.amount * (e.recourse ? RECOURSE_LENDER_BPS : LENDER_BPS)) / 10_000n;
      const row = { kind: "share" as const, at: e.at, invoiceId: e.invoiceId, used: dollars(e.amount) * part, earned: dollars(toLenders) * part, txHash: e.txHash };
      moves.push(row);
      earned += row.earned;
    } else if (e.kind === "default" && e.owed > e.covered) {
      const lost = dollars(e.owed - e.covered) * part;
      moves.push({ kind: "loss", at: e.at, lost, txHash: e.txHash });
      earned -= lost;
    }
  }
  const totalEarned = now.value - now.netDeposited;
  const earlier = { putIn: round(now.netDeposited - putIn), earned: round(totalEarned - earned) };
  if (Math.abs(earlier.putIn) >= 0.01 || Math.abs(earlier.earned) >= 0.01) moves.push({ kind: "earlier", ...earlier });
  return { moves, putIn: now.netDeposited, earned: round(totalEarned) };
}

const round = (n: number) => Math.round(n * 100) / 100;
