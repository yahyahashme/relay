"use server";

// "Reiniciar demo" (#223), for Relay admins: the three demo shops back to the start, and every
// demo phone's PIN or passkey forgotten. lib/server/demo-reset.ts holds the steps.

import { getDb } from "@/lib/server/db";
import { resetDemoShops, type ResetChain } from "@/lib/server/demo-reset";
import { getDirectory } from "@/lib/server/directory";
import { clearDemoConfirms } from "@/lib/server/pay-confirm";
import { currentUser } from "@/lib/server/session";
import { sendTestDollars } from "@/lib/server/wallet";
import { readClient } from "@/lib/stellar/client";
import { config } from "@/lib/stellar/config";
import { ContractError, FALLBACK_MESSAGE } from "@/lib/stellar/errors";
import { read, run } from "@/lib/stellar/send";
import { toDollars, toUnits } from "@/lib/stellar/units";
import { HISTORY_PAGE, type Receipt } from "@/lib/types";

const DEMO_SHOPS = ["tienda-1", "tienda-2", "tienda-3"];
const MAX_PAGES = 20; // 600 newest invoices: open pay-later ones are at most a week old

async function balanceUnits(address: string): Promise<bigint> {
  const res = await fetch(`${config.horizonUrl}/accounts/${address}`, { cache: "no-store" });
  if (!res.ok) return 0n;
  const account = (await res.json()) as { balances?: { asset_code?: string; asset_issuer?: string; balance: string }[] };
  const line = account.balances?.find((b) => b.asset_code === config.token.code && b.asset_issuer === config.token.issuer);
  return line ? toUnits(line.balance) : 0n;
}

const chain: ResetChain = {
  async shop(address) {
    const view = await read(readClient().get_shop({ shop: address }));
    return { owed: view.owed, writtenOff: view.written_off, laterOwed: view.later_owed, limit: view.limit };
  },
  async openLater(address, owed) {
    const total = await read(readClient().invoice_count());
    const found: { id: bigint; left: bigint }[] = [];
    let sum = 0n;
    for (let page = 0, before = total; page < MAX_PAGES && before > 0 && sum < owed; page++, before -= HISTORY_PAGE) {
      const list = await read(readClient().list_invoices_page({ before, limit: HISTORY_PAGE }));
      for (const i of list) {
        if (i.shop !== address || !i.later || i.status.tag === "Paid") continue;
        const left = i.amount - i.paid;
        found.push({ id: i.id, left });
        sum += left;
      }
    }
    return found;
  },
  balance: balanceUnits,
  async send(address, units) {
    // Whole cents, rounded up, so the shop never ends a cent short.
    await sendTestDollars(address, Math.ceil(toDollars(units) * 100) / 100);
  },
  async repay(shopId, address, units) {
    await run(shopId, (client) => client.repay({ shop: address, amount: units }));
  },
  async pay(shopId, address, id, units) {
    await run(shopId, (client) => client.pay({ shop: address, id, amount: units }));
  },
  async setTerms(address, limit) {
    await run("admin", (client) => client.set_terms({ shop: address, limit }));
  },
};

export async function resetDemo(): Promise<Receipt> {
  const user = await currentUser();
  if (user?.role !== "admin") return { ok: false, message: "Solo para administradores de Relay." };
  try {
    const directory = await getDirectory();
    const shops = DEMO_SHOPS.map((id) => directory.find(id, "shop")).filter((p) => p !== undefined);
    await resetDemoShops(
      shops.map((p) => ({ id: p.id, address: p.address })),
      chain,
    );
    const db = getDb();
    if (db) await clearDemoConfirms(db);
    return { ok: true, message: "Listo. Las tiendas de demo están como al principio." };
  } catch (error) {
    console.error("[admin] reset demo", error);
    return { ok: false, message: error instanceof ContractError ? error.message : FALLBACK_MESSAGE };
  }
}
