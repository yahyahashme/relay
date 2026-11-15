// Crédito Relay, out of 500 (#220): the shop's limit in dollars, shown as "300/500". An on-time
// repayment of pool credit raises it by tier on what the cycle borrowed, at most once per credit
// period, and only for cycles of $10 or more. The contract does the same (growth_step in
// contracts/route_ledger); this copy is for the demo and the screens.

export const CREDIT_OUT_OF = 500;
export const MIN_TO_GROW = 10;
export const GROWTH_TIERS: { upTo: number; step: number }[] = [
  { upTo: 30, step: 10 },
  { upTo: 50, step: 15 },
  { upTo: 75, step: 20 },
  { upTo: 100, step: 25 },
  { upTo: Infinity, step: 30 },
];

/** Dollars an on-time cycle with `repaid` dollars on credit adds to the limit. */
export function growthStep(repaid: number): number {
  if (repaid < MIN_TO_GROW) return 0;
  return GROWTH_TIERS.find((tier) => repaid <= tier.upTo)!.step;
}
