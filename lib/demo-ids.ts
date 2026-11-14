// Demo invoices (#53, /demo and "Nueva factura de demo") are numbered 1001,
// 1002… Real distributors and tests may use any number on the same contract
// (a test once made 998473), so the demo counts only within its own range.

export const DEMO_FIRST_ID = 1001n;
export const DEMO_LAST_ID = 99_999n;

/** The next demo number after the highest one already used in the demo's range. */
export function nextDemoId(ids: bigint[]): bigint {
  const inRange = ids.filter((id) => id >= DEMO_FIRST_ID && id <= DEMO_LAST_ID);
  return inRange.reduce((max, id) => (id > max ? id : max), DEMO_FIRST_ID - 1n) + 1n;
}
