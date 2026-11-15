import { describe, expect, it } from "vitest";
import { buildLenderHistory, type PoolEvent } from "./lender-history";

const D = 10_000_000n;
const at = (n: number) => `2026-11-15T0${n}:00:00Z`;

describe("a lender's movements (#224)", () => {
  // A puts in $1,000; B puts in $3,000; a $100 credit sale; A takes out $500; a $200 credit sale.
  // Shares are 1 per dollar until the first sale; A's withdrawal of $500 is 499.9375… shares.
  const events: PoolEvent[] = [
    { kind: "credit", invoiceId: 7, amount: 200n * D, recourse: false, at: at(5) },
    { kind: "withdraw", lender: "A", amount: 500n * D, shares: 4_999_375_078n, at: at(4) },
    { kind: "credit", invoiceId: 6, amount: 100n * D, recourse: false, at: at(3) },
    { kind: "deposit", lender: "B", amount: 3_000n * D, shares: 3_000n * D, at: at(2) },
    { kind: "deposit", lender: "A", amount: 1_000n * D, shares: 1_000n * D, at: at(1) },
  ];
  const aShares = 1_000n * D - 4_999_375_078n;
  const allShares = 4_000n * D - 4_999_375_078n;
  // Pool value today: 4,000 + 0.50 (sale 1) − 500 + 1.00 (sale 2) = 3,501.50; A's value = its shares' part.
  const aValue = (Number(aShares) / Number(allShares)) * 3_501.5;

  it("splits each credit sale by the shares the lender held at that moment", () => {
    const h = buildLenderHistory(events, "A", { shares: aShares, poolShares: allShares, value: aValue, netDeposited: 500 });
    const shares = h.moves.filter((m) => m.kind === "share");
    expect(shares).toHaveLength(2);
    // Sale 6: A held a quarter of the pool.
    expect(shares[1]).toMatchObject({ invoiceId: 6 });
    if (shares[1].kind === "share") {
      expect(shares[1].used).toBeCloseTo(25, 5);
      expect(shares[1].earned).toBeCloseTo(0.125, 5);
    }
    expect(h.moves.map((m) => m.kind)).toEqual(["share", "out", "share", "in"]);
    // Everything adds up to the screen's figures: no "earlier" row needed.
    expect(h.putIn).toBe(500);
    const earned = shares.reduce((s, m) => s + (m.kind === "share" ? m.earned : 0), 0);
    expect(Math.round(earned * 100) / 100).toBe(h.earned);
  });

  it("shows another lender nothing of A's money", () => {
    const h = buildLenderHistory(events, "B", { shares: 3_000n * D, poolShares: allShares, value: 3_000.9, netDeposited: 3_000 });
    expect(h.moves.filter((m) => m.kind === "in")).toHaveLength(1);
    expect(h.moves.some((m) => m.kind === "out")).toBe(false);
  });

  it("adds an 'earlier' row when the network no longer has the oldest events", () => {
    const h = buildLenderHistory(events.slice(0, 3), "A", { shares: aShares, poolShares: allShares, value: aValue, netDeposited: 500 });
    expect(h.moves.at(-1)).toEqual({ kind: "earlier", putIn: 1_000, earned: 0 });
  });

  it("counts a debt the backup fund couldn't cover as a loss", () => {
    const h = buildLenderHistory(
      [{ kind: "default", owed: 100n * D, covered: 60n * D, at: at(6) }],
      "A",
      { shares: 1n * D, poolShares: 4n * D, value: 990, netDeposited: 1_000 },
    );
    expect(h.moves[0]).toMatchObject({ kind: "loss", lost: 10 });
  });
});
