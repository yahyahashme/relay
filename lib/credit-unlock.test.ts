import { describe, expect, it } from "vitest";
import { firstLimit, neverHadCredit, unlockProgress } from "./credit-unlock";

const WEEK = 7 * 24 * 3600 * 1000;
const at = (days: number, cents = 120_00) => ({ at: days * 24 * 3600 * 1000, cents });

describe("unlocking a new shop's credit (#217)", () => {
  it("needs two door payments a credit period apart", () => {
    expect(unlockProgress([], WEEK)).toEqual({ counted: 0 });
    expect(unlockProgress([at(0)], WEEK)).toEqual({ counted: 1, nextFrom: WEEK });
    expect(unlockProgress([at(0), at(3)], WEEK)).toEqual({ counted: 1, nextFrom: WEEK }); // same week: one
    expect(unlockProgress([at(3), at(0), at(7)], WEEK)).toEqual({ counted: 2 });
    expect(unlockProgress([at(0), at(6), at(8)], WEEK)).toEqual({ counted: 2 }); // day 8 is a week after day 0
  });

  it("starts at half the usual delivery, $50 to $100, down to $5", () => {
    expect(firstLimit([at(0, 120_00), at(7, 150_00)])).toBe(65); // average $135, half $67.50
    expect(firstLimit([at(0, 40_00), at(7, 60_00)])).toBe(50);
    expect(firstLimit([at(0, 900_00), at(7, 300_00)])).toBe(100);
    expect(firstLimit([])).toBe(50);
  });

  it("only ever applies to a shop that never had credit", () => {
    const fresh = { limit: 0n, first_credit_at: 0n, written_off: 0n, late: 0 };
    expect(neverHadCredit(fresh)).toBe(true);
    expect(neverHadCredit({ ...fresh, limit: 2_000_000_000n })).toBe(false);
    expect(neverHadCredit({ ...fresh, first_credit_at: 1n })).toBe(false); // a default took its limit to 0
    expect(neverHadCredit({ ...fresh, written_off: 5n })).toBe(false);
    expect(neverHadCredit({ ...fresh, late: 1 })).toBe(false);
  });
});
