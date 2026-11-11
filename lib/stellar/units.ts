import "server-only";

// Minimal stand-in for Ruhaan's lib/money.ts (#53), same signatures.
// When #53 merges, import from "@/lib/money" instead and delete this file.

export const UNITS_PER_DOLLAR = 10_000_000n;

/** "85.50" or 85.5 -> 855000000n. No floats: the string is split at the dot. */
export function toUnits(dollars: string | number): bigint {
  const text = String(dollars).trim();
  if (!/^\d+(\.\d{1,7})?$/.test(text)) throw new Error("Monto inválido.");
  const [whole, fraction = ""] = text.split(".");
  return BigInt(whole) * UNITS_PER_DOLLAR + BigInt(fraction.padEnd(7, "0"));
}

/** 1476000000n -> "147.60" (exact, at least 2 decimals). */
export function fromUnits(units: bigint): string {
  const sign = units < 0n ? "-" : "";
  const abs = units < 0n ? -units : units;
  const whole = abs / UNITS_PER_DOLLAR;
  const fraction = (abs % UNITS_PER_DOLLAR).toString().padStart(7, "0").replace(/0+$/, "").padEnd(2, "0");
  return `${sign}${whole}.${fraction}`;
}

/** Units -> dollars as a number for the screens (display only, never for math sent to the contract). */
export const toDollars = (units: bigint): number => Number(fromUnits(units));
