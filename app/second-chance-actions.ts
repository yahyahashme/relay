"use server";

// Second chances (lib/second-chance.ts): the shop's appeal form, and the admin's review of it in
// /admin. Approving restarts the shop at $50 on pool credit with the admin's `set_terms`.

import { cleanAppeal, creditStopped, type AppealInput } from "@/lib/second-chance";
import { formatDay } from "@/lib/format";
import { mayActAs, NOT_YOURS } from "@/lib/server/authz";
import { getDb } from "@/lib/server/db";
import { getDirectory } from "@/lib/server/directory";
import { addAppeal, type Appeal, closedForFraud, decideAppeal, getAppeal, listAppeals, mayApprove, restartCredit } from "@/lib/server/second-chance";
import { currentUser } from "@/lib/server/session";
import { readClient } from "@/lib/stellar/client";
import { FALLBACK_MESSAGE } from "@/lib/stellar/errors";
import { read } from "@/lib/stellar/send";
import { toDollars } from "@/lib/stellar/units";
import type { Receipt } from "@/lib/types";

const fail = (message: string): Receipt => ({ ok: false, message });
const ADMINS_ONLY = "Solo para administradores de Relay.";

/** The shop's "Pedir otra oportunidad" form. */
export async function sendAppeal(shopId: string, input: AppealInput): Promise<Receipt> {
  try {
    const db = getDb();
    if (!db) return fail("Las solicitudes no están disponibles en este servidor.");
    const shop = (await getDirectory()).find(String(shopId), "shop");
    if (!shop) return fail("No encontramos esa tienda.");
    if (!(await mayActAs(shop))) return fail(NOT_YOURS);
    const answers = cleanAppeal(input);
    if (!answers) return fail("Responda las tres preguntas (de 10 a 600 letras cada una).");
    const view = await read(readClient().get_shop({ shop: shop.address }));
    if (!creditStopped(view) || (await closedForFraud(db, shop.id))) return fail("Su tienda no necesita una solicitud ahora.");
    const saved = await addAppeal(db, { id: shop.id, name: shop.name, writtenOffCents: toDollars(view.written_off) * 100 }, answers);
    if (!saved.ok) {
      return fail(
        saved.block.reason === "pending"
          ? "Ya tiene una solicitud en revisión."
          : `Ya tuvo otra oportunidad hace poco. Puede pedir otra desde el ${formatDay(saved.block.from)}.`,
      );
    }
    return { ok: true, message: "Listo. Relay revisará su solicitud y le avisará." };
  } catch (error) {
    console.error("[second chance] appeal", error);
    return fail(FALLBACK_MESSAGE);
  }
}

async function adminDb() {
  const user = await currentUser();
  if (user?.role !== "admin") return null;
  return getDb();
}

/** For /admin; null when the viewer isn't an admin. */
export async function getAppeals(): Promise<Appeal[] | null> {
  const db = await adminDb();
  if (!db) return null;
  return listAppeals(db);
}

/** "Aprobar" restarts the shop at $50; "Rechazar" only closes the appeal. */
export async function decideAppealAction(id: number, approve: boolean): Promise<{ ok: true } | { ok: false; message: string }> {
  const db = await adminDb();
  if (!db) return { ok: false, message: ADMINS_ONLY };
  try {
    const appeal = await getAppeal(db, Number(id));
    if (!appeal || appeal.status !== "pendiente") return { ok: false, message: "Esa solicitud ya fue decidida." };
    if (!approve) {
      await decideAppeal(db, appeal.id, "rechazada");
      return { ok: true };
    }
    if (!(await mayApprove(db, appeal))) return { ok: false, message: "Esta tienda ya tuvo otra oportunidad en los últimos 6 meses." };
    if (await closedForFraud(db, appeal.shopId)) return { ok: false, message: "Esta tienda fue cerrada por fraude." };
    const shop = (await getDirectory()).find(appeal.shopId, "shop");
    if (!shop) return { ok: false, message: "No encontramos esa tienda." };
    const view = await read(readClient().get_shop({ shop: shop.address }));
    // Already back (a distributor vouched, or it paid the old debt): just close the appeal.
    if (creditStopped(view)) await restartCredit(shop.address);
    await decideAppeal(db, appeal.id, "aprobada");
    return { ok: true };
  } catch (error) {
    console.error("[second chance] decide", error);
    return { ok: false, message: FALLBACK_MESSAGE };
  }
}
