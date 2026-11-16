import "server-only";

// The server side of the circle check (#221): reads payments into an account from Horizon and runs
// lib/circle.ts. If Horizon can't be reached, the payment counts (fail open) and the error is logged:
// a slow network must never stop a real shop from unlocking credit.

import { type Inflow, loopsBack } from "@/lib/circle";
import { config } from "@/lib/stellar/config";
import type { Directory } from "./directory";

type Record = {
  type: string;
  created_at: string;
  from?: string;
  to?: string;
  amount?: string;
  asset_code?: string;
  asset_issuer?: string;
  asset_balance_changes?: { type: string; from?: string; to?: string; amount: string; asset_code?: string; asset_issuer?: string }[];
};

const isToken = (r: { asset_code?: string; asset_issuer?: string }) => r.asset_code === config.token.code && r.asset_issuer === config.token.issuer;
const PAGES = 3;

/** Dólares digitales paid into `address`, newest first, back to `since`. Only accounts (G...) as senders. */
export function parseInflows(address: string, records: Record[]): Inflow[] {
  const out: Inflow[] = [];
  for (const r of records) {
    const at = Date.parse(r.created_at);
    if (r.type === "payment" || r.type.startsWith("path_payment")) {
      if (r.to === address && r.from && isToken(r)) out.push({ from: r.from, at, amount: Number(r.amount) });
    } else if (r.type === "invoke_host_function") {
      for (const c of r.asset_balance_changes ?? []) {
        if (c.type === "transfer" && c.to === address && c.from && isToken(c)) out.push({ from: c.from, at, amount: Number(c.amount) });
      }
    }
  }
  return out.filter((i) => i.from.startsWith("G"));
}

export async function horizonInflows(address: string, since: number, before: number): Promise<Inflow[]> {
  let url: string | undefined = `${config.horizonUrl}/accounts/${address}/payments?order=desc&limit=200&include_failed=false`;
  const out: Inflow[] = [];
  for (let page = 0; page < PAGES && url; page++) {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (res.status === 404) return out; // an account that doesn't exist yet got nothing
    if (!res.ok) throw new Error(`horizon ${res.status}`);
    const body = (await res.json()) as { _embedded?: { records?: Record[] }; _links?: { next?: { href: string } } };
    const records = body._embedded?.records ?? [];
    out.push(...parseInflows(address, records));
    const oldest = records.length ? Date.parse(records[records.length - 1].created_at) : 0;
    url = records.length === 200 && oldest >= since ? body._links?.next?.href : undefined;
  }
  return out.filter((i) => i.at >= since && i.at < before);
}

/** Relay's own accounts: money from them is not a distributor's. */
function relayAccounts(): Set<string> {
  const a = config.accounts as { admin: string; issuer: string; sponsor: string; treasury: string };
  return new Set([a.admin, a.issuer, a.sponsor, a.treasury, config.contracts.routeLedger]);
}

/**
 * True if this door payment loops back to the shop's own distributor (or its drivers).
 * Never throws: on any error the payment counts.
 */
export async function isCircle(directory: Directory, shopAddress: string, distributorAddress: string, paidAt = Date.now(), inflows = horizonInflows): Promise<boolean> {
  try {
    const distributor = directory.byAddress(distributorAddress);
    const drivers = distributor ? directory.ofKind("driver").filter((d) => d.distributorId === distributor.id).map((d) => d.address) : [];
    return await loopsBack(shopAddress, new Set([distributorAddress, ...drivers]), paidAt, inflows, relayAccounts());
  } catch (error) {
    console.error("[circle check]", error instanceof Error ? error.message : error);
    return false;
  }
}
