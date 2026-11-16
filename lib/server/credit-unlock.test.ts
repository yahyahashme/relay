import { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { circleShops, recordDoorPayment, unlockIfDue, unlockStatus } = await import("./credit-unlock");

type Db = { query: (text: string, params?: unknown[]) => Promise<never[]> };
let db: Db;
const fresh = { limit: 0n, first_credit_at: 0n, written_off: 0n, late: 0 };
const PERIOD = 120_000; // the demo's 2-minute credit period
const shop = { id: "tienda-nueva", address: "GSHOP" };

beforeEach(() => {
  const pg = new PGlite();
  db = { query: async (text: string, params: unknown[] = []) => (await pg.query(text, params)).rows as never[] };
});

describe("door payments unlock a new shop's credit (#217)", () => {
  it("gives the first limit after the second payment a period later, once per invoice", async () => {
    const setTerms = vi.fn(async () => {});
    const t0 = Date.parse("2026-11-15T20:00:00Z");
    await recordDoorPayment(db as never, shop.id, 7001, 90_00, new Date(t0));
    await recordDoorPayment(db as never, shop.id, 7001, 90_00, new Date(t0 + PERIOD)); // same invoice again: ignored
    expect(await unlockIfDue(db as never, shop, setTerms, fresh, PERIOD)).toBeNull();
    expect(await unlockStatus(db as never, shop.id, fresh, PERIOD)).toEqual({ paid: 1, needed: 2, nextFrom: new Date(t0 + PERIOD).toISOString() });

    await recordDoorPayment(db as never, shop.id, 7002, 130_00, new Date(t0 + PERIOD));
    expect(await unlockIfDue(db as never, shop, setTerms, fresh, PERIOD)).toBe(55); // average $110, half $55
    expect(setTerms).toHaveBeenCalledWith("GSHOP", 550_000_000n);
  });

  it("leaves a shop that already had credit alone", async () => {
    const setTerms = vi.fn(async () => {});
    const t0 = Date.now();
    await recordDoorPayment(db as never, shop.id, 1, 100_00, new Date(t0));
    await recordDoorPayment(db as never, shop.id, 2, 100_00, new Date(t0 + PERIOD));
    const defaulted = { ...fresh, first_credit_at: 1n, written_off: 10n };
    expect(await unlockIfDue(db as never, shop, setTerms, defaulted, PERIOD)).toBeNull();
    expect(await unlockStatus(db as never, shop.id, defaulted, PERIOD)).toBeNull();
    expect(setTerms).not.toHaveBeenCalled();
  });

  it("a payment that looped back from the distributor never counts, and the scan sees it (#221)", async () => {
    const setTerms = vi.fn(async () => {});
    const t0 = Date.now();
    await recordDoorPayment(db as never, shop.id, 1, 100_00, new Date(t0), { circle: true, distributorId: "dist-1" });
    await recordDoorPayment(db as never, shop.id, 2, 100_00, new Date(t0 + PERIOD), { distributorId: "dist-1" });
    expect(await unlockIfDue(db as never, shop, setTerms, fresh, PERIOD)).toBeNull();
    expect(await unlockStatus(db as never, shop.id, fresh, PERIOD)).toMatchObject({ paid: 1 });
    expect(await circleShops(db as never)).toEqual(new Map([["dist-1", [shop.id]]]));
  });
});
