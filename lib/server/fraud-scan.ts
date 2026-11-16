import "server-only";

// Reads what the fraud scan (#231) needs: every invoice on the contract, every distributor and
// shop, and the phones and passkeys behind their accounts. lib/server/fraud.ts runs the rules.

import { readClient } from "@/lib/stellar/client";
import { read } from "@/lib/stellar/send";
import { toDollars } from "@/lib/stellar/units";
import { HISTORY_PAGE } from "@/lib/types";
import type { Db } from "./db";
import { getDb } from "./db";
import { getDirectory } from "./directory";
import { after } from "next/server";
import { scan, type ScanInput } from "./fraud";

const MAX_PAGES = 40; // the newest 1,200 invoices

/** Every invoice, every distributor and shop, and the contacts behind them. */
export async function scanInput(db: Db): Promise<ScanInput> {
  const directory = await getDirectory();
  const total = await read(readClient().invoice_count());
  const befores = Array.from({ length: MAX_PAGES }, (_, i) => total - i * HISTORY_PAGE).filter((b) => b > 0);
  const invoices = (await Promise.all(befores.map((before) => read(readClient().list_invoices_page({ before, limit: HISTORY_PAGE }))))).flat();

  const people = await db.query<{ kind: string; id: string; created_at: string | Date | null; phone: string | null; owner_phone: string | null; owner_id: string | null }>(
    `SELECT 'shop' AS kind, s.id, s.created_at, s.phone, u.phone AS owner_phone, u.id AS owner_id FROM shops s LEFT JOIN users u ON u.id = s.owner_user_id
     UNION ALL
     SELECT 'distributor', d.id, d.created_at, NULL, u.phone, u.id FROM distributors d LEFT JOIN users u ON u.id = d.owner_user_id`,
  );
  // The pay-confirm table only exists once someone confirmed a payment.
  const keys = await db.query<{ owner: string; public_key: string }>(`SELECT owner, public_key FROM pay_passkeys WHERE owner LIKE 'user:%'`).catch(() => []);
  const passkeysOf = (userId: string | null) => (userId ? keys.filter((k) => k.owner === `user:${userId}`).map((k) => k.public_key) : []);
  const row = (kind: string, id: string) => people.find((p) => p.kind === kind && p.id === id);
  const phonesOf = (r?: (typeof people)[number]) => [r?.phone, r?.owner_phone].filter((p): p is string => !!p);

  const shopIds = [...new Set(invoices.map((i) => directory.byAddress(i.shop)?.id).filter((id): id is string => !!id))];
  const shops = await Promise.all(
    shopIds.map(async (id) => {
      const party = directory.find(id, "shop")!;
      const view = await read(readClient().get_shop({ shop: party.address }));
      const r = row("shop", id);
      return {
        id,
        name: party.name,
        createdAt: r?.created_at ? new Date(r.created_at).getTime() : undefined,
        phones: phonesOf(r),
        passkeys: passkeysOf(r?.owner_id ?? null),
        limit: toDollars(view.limit),
        defaulted: view.written_off > 0n || view.late_major > 0,
      };
    }),
  );

  const distributors = directory.ofKind("distributor").map((d) => {
    const r = row("distributor", d.id);
    return {
      id: d.id,
      name: d.name,
      phones: phonesOf(r),
      passkeys: passkeysOf(r?.owner_id ?? null),
      invoices: invoices
        .filter((i) => i.distributor === d.address)
        .map((i) => ({
          id: Number(i.id),
          shopId: directory.byAddress(i.shop)?.id ?? i.shop,
          amount: toDollars(i.amount),
          credit: i.credit_fee > 0n,
          later: i.later,
          paid: toDollars(i.paid),
          due: Number(i.due) * 1000,
        })),
    };
  });
  return { distributors, shops, now: Date.now() };
}

/** The scan without an admin, for the server's own use after an invoice is created. Never throws. */
export async function scanQuietly(): Promise<void> {
  const db = getDb();
  if (!db) return;
  await scan(db, await scanInput(db)).catch((error) => console.error("[fraud] scan", error));
}


/** Runs the scan once the reply has gone out (Next's `after`); outside a request (tests, scripts) it skips. */
export function scanLater(): void {
  try {
    after(scanQuietly);
  } catch {
    // no request scope: nothing to wait for
  }
}
