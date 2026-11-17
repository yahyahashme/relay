"use server";

// "Enviar enlace de pago por WhatsApp": who each unpaid invoice's payment link goes to. Only the invoice's
// distributor or its driver learns a shop's number. Demo shops have made-up numbers that a real person may
// own, so their links go to the team's own number (DEMO_WHATSAPP) or to no number at all.

import { DEMO_WHATSAPP } from "@/lib/demo-contacts";
import { isDemoParty } from "@/lib/server/authz";
import { getDb } from "@/lib/server/db";
import { getDirectory } from "@/lib/server/directory";
import { distributorForUser } from "@/lib/server/distributors";
import { driverIdForUser } from "@/lib/server/drivers";
import { currentUser } from "@/lib/server/session";
import { readClient } from "@/lib/stellar/client";
import { read } from "@/lib/stellar/send";
import type { PayTarget } from "@/lib/types";
import { waNumber } from "@/lib/whatsapp";

export async function getPayTargets(invoiceIds: number[]): Promise<Record<number, PayTarget>> {
  const ids = [...new Set(invoiceIds.filter((id) => Number.isSafeInteger(id) && id >= 0))].slice(0, 60);
  if (ids.length === 0) return {};
  const directory = await getDirectory();
  const user = await currentUser();
  const db = getDb();
  const [mine, myDriver] = user && db ? await Promise.all([user.role === "distribuidora" ? distributorForUser(user.id) : null, driverIdForUser(user)]) : [null, null];
  const out: Record<number, PayTarget> = {};
  await Promise.all(
    ids.map(async (id) => {
      try {
        const result = await read(readClient().get_invoice({ id: BigInt(id) }));
        if (!result.isOk()) return;
        const invoice = result.unwrap();
        if (invoice.status.tag === "Paid") return;
        const shop = directory.byAddress(invoice.shop);
        const distributor = directory.byAddress(invoice.distributor);
        if (!shop || shop.kind !== "shop") return;
        const distributorName = distributor?.name;
        if (isDemoParty(shop.id)) {
          out[id] = { to: DEMO_WHATSAPP, distributorName };
          return;
        }
        const allowed = (mine && distributor?.id === mine.id) || (myDriver !== null && myDriver === directory.idOf(invoice.driver));
        if (!allowed || !db) return;
        const [row] = await db.query<{ phone: string | null }>(
          `SELECT COALESCE(s.phone, u.phone) AS phone FROM shops s LEFT JOIN users u ON u.id = s.owner_user_id WHERE s.id = $1`,
          [shop.id],
        );
        out[id] = { to: waNumber(row?.phone), distributorName };
      } catch (error) {
        console.error("[pay link]", id, error instanceof Error ? error.message : error);
      }
    }),
  );
  return out;
}
