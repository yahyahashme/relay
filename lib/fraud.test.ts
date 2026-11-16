import { describe, expect, it } from "vitest";
import { checkDistributor, defaultRate, type FraudInvoice, type FraudShop, flagKey } from "./fraud";

const NOW = Date.UTC(2026, 10, 16);
const DAY = 86_400_000;
const D = { id: "d1", name: "El Sol", phones: ["70000001"], passkeys: ["pk-d"] };

const shop = (id: string, extra: Partial<FraudShop> = {}): FraudShop => ({ id, name: `Tienda ${id}`, phones: [], passkeys: [], limit: 200, defaulted: false, createdAt: NOW - 60 * DAY, ...extra });
let next = 1;
const inv = (shopId: string, amount: number, extra: Partial<FraudInvoice> = {}): FraudInvoice => ({ id: next++, shopId, amount, credit: false, later: false, paid: amount, due: NOW, ...extra });
const map = (...shops: FraudShop[]) => new Map(shops.map((s) => [s.id, s]));

describe("fraud flags (#231)", () => {
  it("says nothing about a normal distributor", () => {
    const invoices = [inv("a", 60), inv("a", 70), inv("b", 55), inv("b", 80, { credit: true }), inv("c", 65)];
    expect(checkDistributor(D, invoices, map(shop("a"), shop("b"), shop("c")), 0.05, NOW)).toEqual([]);
  });

  it("flags a shop with the distributor's phone or passkey", () => {
    const flags = checkDistributor(D, [inv("a", 50), inv("b", 50)], map(shop("a", { phones: ["70000001"] }), shop("b", { passkeys: ["pk-d"] })), 0, NOW);
    expect(flags.map((f) => [f.rule, f.shopId])).toEqual([
      ["same_contact", "a"],
      ["same_contact", "b"],
    ]);
  });

  it("flags an invoice over 3 times the usual size", () => {
    const invoices = [inv("a", 50), inv("a", 60), inv("a", 55), inv("a", 400)];
    const flags = checkDistributor(D, invoices, map(shop("a")), 0, NOW);
    expect(flags).toEqual([expect.objectContaining({ rule: "big_invoice", invoiceId: invoices[3].id, value: 400, usual: 55 })]);
  });

  it("flags many credit sales to brand-new shops, and sales just under the limit", () => {
    const fresh = shop("n", { createdAt: NOW - 2 * DAY, limit: 100 });
    const invoices = [inv("n", 95, { credit: true }), inv("n", 98, { credit: true }), inv("n", 100, { credit: true })];
    expect(checkDistributor(D, invoices, map(fresh), 0, NOW).map((f) => f.rule)).toEqual(["new_shops_credit", "near_limit"]);
  });

  it("flags shops defaulting far above the average", () => {
    const shops = [shop("a", { defaulted: true }), shop("b", { defaulted: true }), shop("c")];
    const flags = checkDistributor(D, [inv("a", 50), inv("b", 50), inv("c", 50)], map(...shops), 0.1, NOW);
    expect(flags).toEqual([expect.objectContaining({ rule: "defaults", count: 2 })]);
    expect(defaultRate(shops)).toBeCloseTo(2 / 3);
  });

  it("flags pay-later invoices that never get paid", () => {
    const late = { later: true, paid: 0, due: NOW - 3 * DAY };
    const flags = checkDistributor(D, [inv("a", 50, late), inv("a", 60, late)], map(shop("a")), 0, NOW);
    expect(flags.map(flagKey)).toEqual(["later_unpaid::"]);
  });
});

describe("pattern flags (#221)", () => {
  it("flags shops whose unlock money looped back to the distributor", () => {
    const flags = checkDistributor({ ...D, circleShops: ["a"] }, [inv("a", 50)], map(shop("a")), 0, NOW);
    expect(flags).toEqual([expect.objectContaining({ rule: "circle_unlock", count: 1, shopId: "a", shopName: "Tienda a" })]);
  });

  it("flags 3 shops first borrowing the same week, not 3 spread out", () => {
    const together = map(...["a", "b", "c"].map((id, i) => shop(id, { firstCreditAt: NOW - 10 * DAY + i * DAY })));
    const invoices = [inv("a", 50), inv("b", 50), inv("c", 50)];
    expect(checkDistributor(D, invoices, together, 0, NOW)).toEqual([expect.objectContaining({ rule: "new_shops_together", count: 3, shopId: "a" })]);
    const spread = map(...["a", "b", "c"].map((id, i) => shop(id, { firstCreditAt: NOW - 25 * DAY + i * 9 * DAY })));
    expect(checkDistributor(D, invoices, spread, 0, NOW)).toEqual([]);
    const old = map(...["a", "b", "c"].map((id) => shop(id, { firstCreditAt: NOW - 60 * DAY })));
    expect(checkDistributor(D, invoices, old, 0, NOW)).toEqual([]);
  });

  it("flags 2 shops defaulting on credit due within 2 weeks", () => {
    const shops = map(shop("a", { defaulted: true, dueAt: NOW - 20 * DAY }), shop("b", { defaulted: true, dueAt: NOW - 15 * DAY }), ...["c", "d", "e", "f"].map((id) => shop(id)));
    const invoices = ["a", "b", "c", "d", "e", "f"].map((id) => inv(id, 50));
    const rules = checkDistributor(D, invoices, shops, 0.5, NOW).map((f) => f.rule);
    expect(rules).toEqual(["defaults_together"]);
  });
});
