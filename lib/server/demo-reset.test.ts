import { describe, expect, it } from "vitest";
import { DEMO_START_BALANCE, DEMO_START_LIMIT, resetDemoShops, type DemoShopState, type ResetChain } from "./demo-reset";

const D = 10_000_000n; // one dollar in units

/** A pretend chain: three shops, their balances, and a log of every step. */
function fakeChain(states: Record<string, DemoShopState>, balances: Record<string, bigint>, later: Record<string, { id: bigint; left: bigint }[]> = {}) {
  const log: string[] = [];
  const chain: ResetChain = {
    shop: async (a) => ({ ...states[a] }),
    openLater: async (a) => later[a] ?? [],
    balance: async (a) => balances[a],
    send: async (a, u) => {
      balances[a] += u;
      log.push(`send ${a} ${u / D}`);
    },
    repay: async (_id, a, u) => {
      if (balances[a] < u) throw new Error("not enough");
      balances[a] -= u;
      log.push(`repay ${a} ${u / D}`);
    },
    pay: async (_id, a, id, u) => {
      balances[a] -= u;
      log.push(`pay ${a} #${id} ${u / D}`);
    },
    setTerms: async (a, l) => {
      log.push(`limit ${a} ${l / D}`);
    },
  };
  return { chain, log, balances };
}

const clean: DemoShopState = { owed: 0n, writtenOff: 0n, laterOwed: 0n, limit: DEMO_START_LIMIT };

describe("Reiniciar demo (#223)", () => {
  it("pays off credit and pay-later, sets $200 again and leaves $500", async () => {
    const { chain, log, balances } = fakeChain(
      {
        a: { owed: 85n * D, writtenOff: 0n, laterOwed: 45n * D, limit: 175n * D },
        b: { ...clean, writtenOff: 60n * D, limit: 0n },
        c: clean,
      },
      { a: 20n * D, b: 600n * D, c: 300n * D },
      { a: [{ id: 1003n, left: 45n * D }] },
    );
    const done = await resetDemoShops(
      ["a", "b", "c"].map((id) => ({ id, address: id })),
      chain,
    );
    expect(balances).toEqual({ a: DEMO_START_BALANCE, b: 540n * D, c: DEMO_START_BALANCE });
    expect(log).toEqual(expect.arrayContaining(["repay a 85", "pay a #1003 45", "limit a 200", "repay b 60", "limit b 200", "send c 200"]));
    expect(log).not.toContain("limit c 200"); // already at the start
    expect(done.find((d) => d.shopId === "a")).toMatchObject({ paidOff: 85n * D, laterPaid: 1 });
  });

  it("sends test dollars before any payment, one after another", async () => {
    const { chain, log } = fakeChain({ a: { ...clean, owed: 10n * D }, b: { ...clean, owed: 10n * D } }, { a: 0n, b: 0n });
    await resetDemoShops([{ id: "a", address: "a" }, { id: "b", address: "b" }], chain);
    expect(log.slice(0, 2)).toEqual(["send a 510", "send b 510"]);
  });
});
