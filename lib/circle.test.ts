import { describe, expect, it } from "vitest";
import { CIRCLE_DAYS, type Inflow, loopsBack } from "./circle";

const DAY = 86_400_000;
const NOW = 100 * DAY;

/** A toy ledger: address -> payments into it. */
function ledger(rows: Record<string, Inflow[]>) {
  const calls: string[] = [];
  const inflows = async (address: string, since: number, before: number) => {
    calls.push(address);
    return (rows[address] ?? []).filter((i) => i.at >= since && i.at < before);
  };
  return { inflows, calls };
}

describe("loopsBack (#221)", () => {
  it("finds the distributor paying the shop directly", async () => {
    const { inflows } = ledger({ SHOP: [{ from: "DIST", at: NOW - DAY, amount: 50 }] });
    expect(await loopsBack("SHOP", new Set(["DIST"]), NOW, inflows)).toBe(true);
  });

  it("finds it through two friends (3 steps)", async () => {
    const { inflows } = ledger({
      SHOP: [{ from: "A", at: NOW - DAY, amount: 50 }],
      A: [{ from: "B", at: NOW - 2 * DAY, amount: 50 }],
      B: [{ from: "DIST", at: NOW - 3 * DAY, amount: 50 }],
    });
    expect(await loopsBack("SHOP", new Set(["DIST"]), NOW, inflows)).toBe(true);
  });

  it("stops at 3 steps", async () => {
    const { inflows } = ledger({
      SHOP: [{ from: "A", at: NOW - DAY, amount: 50 }],
      A: [{ from: "B", at: NOW - 2 * DAY, amount: 50 }],
      B: [{ from: "C", at: NOW - 3 * DAY, amount: 50 }],
      C: [{ from: "DIST", at: NOW - 4 * DAY, amount: 50 }],
    });
    expect(await loopsBack("SHOP", new Set(["DIST"]), NOW, inflows)).toBe(false);
  });

  it("ignores money older than 14 days", async () => {
    const { inflows } = ledger({ SHOP: [{ from: "DIST", at: NOW - (CIRCLE_DAYS + 1) * DAY, amount: 50 }] });
    expect(await loopsBack("SHOP", new Set(["DIST"]), NOW, inflows)).toBe(false);
  });

  it("needs each step earlier than the next", async () => {
    // A got the distributor's money after it paid the shop: not a circle.
    const { inflows } = ledger({
      SHOP: [{ from: "A", at: NOW - 3 * DAY, amount: 50 }],
      A: [{ from: "DIST", at: NOW - DAY, amount: 50 }],
    });
    expect(await loopsBack("SHOP", new Set(["DIST"]), NOW, inflows)).toBe(false);
  });

  it("doesn't follow Relay's own accounts", async () => {
    const { inflows, calls } = ledger({
      SHOP: [{ from: "SPONSOR", at: NOW - DAY, amount: 5 }],
      SPONSOR: [{ from: "DIST", at: NOW - 2 * DAY, amount: 50 }],
    });
    expect(await loopsBack("SHOP", new Set(["DIST"]), NOW, inflows, new Set(["SPONSOR"]))).toBe(false);
    expect(calls).toEqual(["SHOP"]);
  });

  it("counts the distributor's drivers as the distributor", async () => {
    const { inflows } = ledger({ SHOP: [{ from: "DRIVER", at: NOW - DAY, amount: 50 }] });
    expect(await loopsBack("SHOP", new Set(["DIST", "DRIVER"]), NOW, inflows)).toBe(true);
  });

  it("a shop topped up by strangers is fine", async () => {
    const { inflows } = ledger({ SHOP: [{ from: "CASHIN", at: NOW - DAY, amount: 50 }], CASHIN: [{ from: "X", at: NOW - 2 * DAY, amount: 500 }] });
    expect(await loopsBack("SHOP", new Set(["DIST"]), NOW, inflows)).toBe(false);
  });
});
