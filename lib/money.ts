export const UNITS_PER_DOLLAR = 10_000_000n;

const UNITS_PER_CENT = UNITS_PER_DOLLAR / 100n;
const dollarGrouping = new Intl.NumberFormat("en-US");

export function toUnits(dollars: string | number): bigint {
  const text = String(dollars).trim();
  if (!/^\d+(\.\d{1,7})?$/.test(text)) throw new Error("Monto inválido.");

  const [whole, fraction = ""] = text.split(".");
  return BigInt(whole) * UNITS_PER_DOLLAR + BigInt(fraction.padEnd(7, "0"));
}

export function fromUnits(units: bigint): string {
  const sign = units < 0n ? "-" : "";
  const magnitude = units < 0n ? -units : units;
  const whole = magnitude / UNITS_PER_DOLLAR;
  const fraction = (magnitude % UNITS_PER_DOLLAR)
    .toString()
    .padStart(7, "0")
    .replace(/0+$/, "")
    .padEnd(2, "0");

  return `${sign}${whole}.${fraction}`;
}

export function formatUSD(units: bigint): string {
  const magnitude = units < 0n ? -units : units;
  const cents = (magnitude + UNITS_PER_CENT / 2n) / UNITS_PER_CENT;
  const sign = units < 0n && cents > 0n ? "-" : "";
  const dollars = dollarGrouping.format(cents / 100n);
  const fraction = (cents % 100n).toString().padStart(2, "0");

  return `${sign}$${dollars}.${fraction}`;
}

export function feeBps(units: bigint, bps: number): bigint {
  if (units < 0n || !Number.isInteger(bps) || bps < 0) {
    throw new Error("Monto inválido.");
  }

  return (units * BigInt(bps)) / 10_000n;
}
