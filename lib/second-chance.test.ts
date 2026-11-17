import { describe, expect, it } from "vitest";
import { appealBlock, cleanAppeal, creditStopped, restartsAfterRepay } from "./second-chance";

const D = 10_000_000n; // one dollar in contract units
const view = (v: Partial<{ limit: bigint; owed: bigint; first_credit_at: bigint; written_off: bigint; late: number; later_overdue: boolean }> = {}) => ({
  limit: 0n, owed: 0n, first_credit_at: 0n, written_off: 0n, late: 0, later_overdue: false, ...v,
});
const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-11-17T12:00:00Z");

describe("second chances", () => {
  it("only counts a shop that had credit and lost it", () => {
    expect(creditStopped(view())).toBe(false); // never had credit: the 2-payment unlock applies
    expect(creditStopped(view({ written_off: 60n * D, late: 1, first_credit_at: 1n }))).toBe(true);
    expect(creditStopped(view({ late: 1, first_credit_at: 1n }))).toBe(true); // a voucher paid its default
    expect(creditStopped(view({ limit: 50n * D, first_credit_at: 1n }))).toBe(false);
    expect(creditStopped(view({ owed: 5n * D, first_credit_at: 1n }))).toBe(false);
  });

  it("restarts after the last of a written-off debt is paid", () => {
    const before = view({ written_off: 60n * D, late: 1, first_credit_at: 1n });
    expect(restartsAfterRepay(before, view({ written_off: 20n * D, late: 1, first_credit_at: 1n }))).toBe(false);
    expect(restartsAfterRepay(before, view({ late: 1, first_credit_at: 1n }))).toBe(true);
    expect(restartsAfterRepay(before, view({ late: 1, first_credit_at: 1n, later_overdue: true }))).toBe(false);
  });

  it("allows one pending appeal and one approval every 6 months", () => {
    expect(appealBlock([], NOW)).toBeNull();
    expect(appealBlock([{ status: "pendiente", createdAt: "x" }], NOW)).toEqual({ reason: "pending" });
    expect(appealBlock([{ status: "rechazada", createdAt: "x", decidedAt: new Date(NOW - DAY).toISOString() }], NOW)).toBeNull();
    const approved = new Date(NOW - 30 * DAY).toISOString();
    expect(appealBlock([{ status: "aprobada", createdAt: "x", decidedAt: approved }], NOW)).toMatchObject({ reason: "cooldown" });
    expect(appealBlock([{ status: "aprobada", createdAt: "x", decidedAt: new Date(NOW - 190 * DAY).toISOString() }], NOW)).toBeNull();
  });

  it("needs three real answers", () => {
    expect(cleanAppeal({ why: "  Me robaron la mercadería  ", changed: "Ahora cierro con reja", plan: "$10 cada semana" })).toEqual({
      why: "Me robaron la mercadería", changed: "Ahora cierro con reja", plan: "$10 cada semana",
    });
    expect(cleanAppeal({ why: "corto", changed: "Ahora cierro con reja", plan: "$10 cada semana" })).toBeNull();
    expect(cleanAppeal({ why: "x".repeat(601), changed: "Ahora cierro con reja", plan: "$10 cada semana" })).toBeNull();
  });
});
