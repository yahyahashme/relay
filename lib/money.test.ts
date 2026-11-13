import { describe, expect, it } from "vitest";
import { feeBps, formatUSD, fromUnits, toUnits, UNITS_PER_DOLLAR } from "./money";

describe("toUnits", () => {
  it("uses seven decimal places per dollar", () => {
    expect(UNITS_PER_DOLLAR).toBe(10_000_000n);
    expect(toUnits("1")).toBe(UNITS_PER_DOLLAR);
  });

  it.each<[string | number, bigint]>([
    ["150", 1_500_000_000n],
    ["0.1", 1_000_000n],
    ["85.50", 855_000_000n],
    [150, 1_500_000_000n],
    ["0.0000001", 1n],
    [" 12.5 ", 125_000_000n],
    ["9007199254740993.0000001", 90_071_992_547_409_930_000_001n],
  ])("converts %s to %s units exactly", (dollars, units) => {
    expect(toUnits(dollars)).toBe(units);
  });

  it.each(["-5", "", "abc", "1.23456789", "1e3", "1,000", "$1", NaN, Infinity, 1e-7])(
    "rejects invalid input %j",
    (dollars) => {
      expect(() => toUnits(dollars)).toThrow("Monto inválido.");
    },
  );
});

describe("fromUnits", () => {
  it.each([
    [1_476_000_000n, "147.60"],
    [5_250_000n, "0.525"],
    [0n, "0.00"],
    [1n, "0.0000001"],
    [1_500_000_000n, "150.00"],
    [-5_000_000n, "-0.50"],
  ])("formats %s units as the exact dollar amount %s", (units, dollars) => {
    expect(fromUnits(units)).toBe(dollars);
  });
});

describe("formatUSD", () => {
  it.each([
    [12_345_000_000n, "$1,234.50"],
    [5_250_000n, "$0.53"],
    [5_249_999n, "$0.52"],
    [0n, "$0.00"],
    [-1n, "$0.00"],
    [-49_999n, "$0.00"],
    [-50_000n, "-$0.01"],
    [1_000_000_000_000n, "$100,000.00"],
    [-5_250_000n, "-$0.53"],
    [9_999_950_000n, "$1,000.00"],
    [90_071_992_547_409_930_100_000n, "$9,007,199,254,740,993.01"],
  ])("formats %s units as %s with half-up rounding", (units, formatted) => {
    expect(formatUSD(units)).toBe(formatted);
  });
});

describe("feeBps", () => {
  it.each([
    [1_000_000_000n, 150, 15_000_000n],
    [1_500_000_000n, 150, 22_500_000n],
    [1_500_000_000n, 10, 1_500_000n],
    [1n, 150, 0n],
    [1_000_000_000n, 0, 0n],
  ])("calculates the fee for %s units at %s basis points", (units, bps, expected) => {
    expect(feeBps(units, bps)).toBe(expected);
  });

  it.each([[-1n, 150], [1n, -1], [1n, 1.5], [1n, NaN], [1n, Infinity]])(
    "rejects %s units at %s basis points",
    (units, bps) => {
      expect(() => feeBps(units, bps)).toThrow("Monto inválido.");
    },
  );

  it.each([
    [1_500_000_000n, 150, "147.75"],
    [1_000_000_000n, 150, "98.50"],
    [1_500_000_000n, 10, "149.85"],
  ])("matches the payout for %s units charged at %s basis points", (units, bps, dollars) => {
    expect(fromUnits(units - feeBps(units, bps))).toBe(dollars);
  });
});
