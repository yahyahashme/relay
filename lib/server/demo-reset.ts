// "Reiniciar demo" (#223): puts the three demo shops back where a judge expects them, so a payment
// can be tried again on the spot. The contract can't forget anything, so a reset settles instead:
// it pays off what each demo shop owes (pool credit, an old written-off debt, open pay-later
// invoices) with test dollars, sets the starting limit again and tops the balance back up.
// Paid invoices stay in the history. The chain steps come in as `ResetChain`, so tests need no network.

export const DEMO_START_LIMIT = 2_000_000_000n; // $200, like scripts/deploy.sh
export const DEMO_START_BALANCE = 5_000_000_000n; // $500, like scripts/setup.sh

export type DemoShopState = {
  owed: bigint;
  writtenOff: bigint;
  laterOwed: bigint;
  limit: bigint;
};

export type OpenLater = { id: bigint; left: bigint };

export type ResetChain = {
  shop(address: string): Promise<DemoShopState>;
  /** The shop's unpaid pay-later invoices and what is left on each. */
  openLater(address: string, owed: bigint): Promise<OpenLater[]>;
  balance(address: string): Promise<bigint>;
  /** Test dollars from the demo lender's account (one at a time: one account signs them all). */
  send(address: string, units: bigint): Promise<void>;
  repay(shopId: string, address: string, units: bigint): Promise<void>;
  pay(shopId: string, address: string, id: bigint, units: bigint): Promise<void>;
  setTerms(address: string, limit: bigint): Promise<void>;
};

export type ShopReset = { shopId: string; paidOff: bigint; laterPaid: number; sent: bigint; limitSet: boolean };

/** What one demo shop must pay to owe nothing: credit (or a written-off debt) plus its open pay-later invoices. */
export function toSettle(state: DemoShopState, later: OpenLater[]): bigint {
  return state.owed + state.writtenOff + later.reduce((sum, l) => sum + l.left, 0n);
}

/** Resets every demo shop. Shops run side by side; test dollars go out one after another. */
export async function resetDemoShops(shops: { id: string; address: string }[], chain: ResetChain): Promise<ShopReset[]> {
  const plans = await Promise.all(
    shops.map(async (shop) => {
      const state = await chain.shop(shop.address);
      const later = state.laterOwed > 0n ? await chain.openLater(shop.address, state.laterOwed) : [];
      const balance = await chain.balance(shop.address);
      return { shop, state, later, balance };
    }),
  );

  // Enough for every debt, and $500 left once they're paid.
  const sent = new Map<string, bigint>();
  for (const { shop, state, later, balance } of plans) {
    const missing = toSettle(state, later) + DEMO_START_BALANCE - balance;
    if (missing > 0n) await chain.send(shop.address, missing);
    sent.set(shop.id, missing > 0n ? missing : 0n);
  }

  return Promise.all(
    plans.map(async ({ shop, state, later }) => {
      let paidOff = 0n;
      // repay pays the pool debt first; once that is 0 it pays a written-off debt back.
      for (const units of [state.owed, state.writtenOff]) {
        if (units <= 0n) continue;
        await chain.repay(shop.id, shop.address, units);
        paidOff += units;
      }
      for (const l of later) {
        if (l.left > 0n) await chain.pay(shop.id, shop.address, l.id, l.left);
      }
      // Paying late lowers the limit, so set it after the debts are gone.
      const limitSet = state.limit !== DEMO_START_LIMIT || paidOff > 0n;
      if (limitSet) await chain.setTerms(shop.address, DEMO_START_LIMIT);
      return { shopId: shop.id, paidOff, laterPaid: later.length, sent: sent.get(shop.id) ?? 0n, limitSet };
    }),
  );
}
