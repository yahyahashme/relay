import { describe, expect, it } from "vitest";
import { creditScore } from "./credit";
import type { HistoryRow, Shop } from "./types";

const NOW = Date.parse("2026-11-13T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const shop = (over: Partial<Shop> = {}): Shop => ({
  id: "tienda-1", name: "Tienda Rosa", owner: "Rosa", creditLimit: 200, creditOwed: 0, overdue: false, onTime: 0, late: 0, ...over,
});
const paid = (daysAgo: number, daysLate = 0, amount = 100): HistoryRow => ({
  key: `${daysAgo}-${daysLate}`, kind: "payment", invoiceId: 1, distributor: "El Sol", method: "digital",
  amount, partial: false, at: new Date(NOW - daysAgo * DAY).toISOString(), daysLate,
});

describe("Relay score (#137)", () => {
  it("is middling and says so for a shop with no history", () => {
    const s = creditScore(shop(), [], 1, NOW);
    expect(s.isNew).toBe(true);
    expect(s.score).toBeGreaterThanOrEqual(45);
    expect(s.score).toBeLessThan(65);
    expect(s.reasons.map((r) => r.es)).toContain("Todavía no tiene pagos en Relay");
  });

  it("is excellent for a long, on-time record with room on the limit and several suppliers", () => {
    const rows = Array.from({ length: 20 }, (_, i) => paid(i * 10));
    const s = creditScore(shop({ onTime: 14, creditOwed: 40 }), rows, 3, NOW);
    expect(s.label).toBe("excelente");
    expect(s.reasons[0]).toMatchObject({ es: "Pagó 34 de 34 a tiempo", good: true });
  });

  it("drops with late payments and a full limit, and names both", () => {
    const rows = [paid(5, 10), paid(12, 4), paid(20)];
    const s = creditScore(shop({ onTime: 1, late: 2, creditOwed: 195 }), rows, 1, NOW);
    expect(["regular", "riesgo"]).toContain(s.label);
    const texts = s.reasons.map((r) => r.es);
    expect(texts).toContain("Pagó 2 de 6 a tiempo");
    expect(texts).toContain("Usa casi todo su límite");
    expect(s.tips[0].es).toMatch(/a tiempo/);
  });

  it("counts a grace day as on time and old late marks as half", () => {
    const graceDay = creditScore(shop({ onTime: 4 }), [paid(3, 1)], 1, NOW).score;
    const onTime = creditScore(shop({ onTime: 4 }), [paid(3, 0)], 1, NOW).score;
    expect(graceDay).toBe(onTime);
    const recentLate = creditScore(shop({ onTime: 4 }), [paid(10, 10), paid(3)], 1, NOW).score;
    const oldLate = creditScore(shop({ onTime: 4 }), [paid(250, 10), paid(3)], 1, NOW).score;
    expect(oldLate).toBeGreaterThan(recentLate);
  });

  it("stays between 0 and 100", () => {
    const s = creditScore(shop({ late: 30, creditOwed: 200 }), [paid(1, 30)], 0, NOW);
    expect(s.score).toBeGreaterThanOrEqual(0);
    expect(s.label).toBe("riesgo");
  });
});
