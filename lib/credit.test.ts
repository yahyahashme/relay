import { describe, expect, it } from "vitest";
import { creditScore, shopRating } from "./credit";
import { growthStep } from "./credit-tiers";
import type { Shop } from "./types";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-11-15T12:00:00Z");
const base: Shop = { id: "t", name: "T", owner: "O", creditLimit: 200, creditOwed: 0, overdue: false, onTime: 0, late: 0, lateMinor: 0, lateMajor: 0, maxDaysLate: 0 };
const shop = (over: Partial<Shop>): Shop => ({ ...base, ...over });
const since = (days: number) => new Date(NOW - days * DAY).toISOString();

describe("Crédito Relay growth tiers (#220)", () => {
  it("raises by the amount repaid on time", () => {
    expect([5, 10, 30, 31, 50, 75, 100, 101, 400].map(growthStep)).toEqual([0, 10, 10, 15, 15, 20, 25, 30, 30]);
  });
});

describe("Relay rating, 1 to 10 (#220)", () => {
  it("starts a new shop at 6", () => {
    const score = creditScore(base, [], 1, NOW);
    expect(score).toMatchObject({ score: 6, label: "bueno", isNew: true });
    expect(score.reasons[0].es).toBe("Todavía no ha usado crédito");
  });

  it("needs a long on-time record to reach 9 or 10, not a few weeks", () => {
    expect(shopRating(shop({ onTime: 3, firstCredit: since(21) }), NOW).rating).toBe(7); // under 4 weeks: capped at 7
    expect(shopRating(shop({ onTime: 4, firstCredit: since(35) }), NOW).rating).toBe(7);
    expect(shopRating(shop({ onTime: 15, firstCredit: since(120) }), NOW).rating).toBe(8);
    expect(shopRating(shop({ onTime: 30, firstCredit: since(220) }), NOW).rating).toBe(9);
  });

  it("weighs a 2-7 day late as half a miss and 8+ days as a whole one", () => {
    const minor = shopRating(shop({ onTime: 10, late: 2, lateMinor: 2, firstCredit: since(90) }), NOW);
    const major = shopRating(shop({ onTime: 10, late: 2, lateMajor: 2, firstCredit: since(90) }), NOW);
    expect(minor.p).toBeGreaterThan(major.p);
    expect([minor.rating, major.rating]).toEqual([8, 7]);
    expect(shopRating(shop({ onTime: 2, late: 6, lateMajor: 6, firstCredit: since(90) }), NOW).rating).toBe(4);
  });

  it("caps at 3 while overdue and 2 with an unpaid write-off", () => {
    const good = { onTime: 30, firstCredit: since(220) };
    expect(shopRating(shop({ ...good, overdue: true }), NOW).rating).toBe(3);
    expect(shopRating(shop({ ...good, laterOverdue: true }), NOW).rating).toBe(3);
    expect(shopRating(shop({ ...good, late: 1, lateMajor: 1, writtenOff: 120 }), NOW).rating).toBe(2);
    // written off and still overdue: the longer-unpaid cap wins, never a higher ceiling than overdue alone
    expect(shopRating(shop({ ...good, overdue: true, late: 1, lateMajor: 1, writtenOff: 120 }), NOW).rating).toBe(2);
    expect(creditScore(shop({ ...good, writtenOff: 120 }), [], 1, NOW).reasons[0].es).toBe("Tiene una deuda de crédito que no pagó");
    expect(creditScore(shop({ ...good, overdue: true }), [], 1, NOW).reasons[0].es).toBe("Tiene un pago vencido");
  });

  it("counts pay-later on a distributor's own money too, and stays within 1..10", () => {
    expect(shopRating(shop({ laterOnTime: 12, firstCredit: since(100) }), NOW).rating).toBe(8);
    for (let n = 0; n < 60; n += 7) {
      const r = shopRating(shop({ onTime: n, late: 60 - n, lateMajor: 60 - n, firstCredit: since(400) }), NOW).rating;
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(10);
    }
  });
});
