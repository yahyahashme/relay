"use server";

// Fraud reviews on /admin (#231): run the checks, read the reviews, and decide. Admins only.
// Closing a distributor revokes it on the contract (no new invoices; its shops keep paying what
// they owe). Closing a shop sets its credit limit to $0 and signs its owner out.

import { getDb, type Db } from "@/lib/server/db";
import { getDirectory, invalidateDirectory } from "@/lib/server/directory";
import { decideReview, listReviews, type Review, type ReviewKind, saveNote, scan } from "@/lib/server/fraud";
import { scanInput } from "@/lib/server/fraud-scan";
import { currentUser } from "@/lib/server/session";
import { FALLBACK_MESSAGE } from "@/lib/stellar/errors";
import { run } from "@/lib/stellar/send";

type Reply = { ok: true; opened?: number } | { ok: false; message: string };

const ADMINS_ONLY = "Solo para administradores de Relay.";

async function adminDb(): Promise<Db | null> {
  const user = await currentUser();
  if (user?.role !== "admin") return null;
  return getDb();
}

/** "Revisar ahora" on /admin, and after each new invoice. */
export async function runFraudScan(): Promise<Reply> {
  const db = await adminDb();
  if (!db) return { ok: false, message: ADMINS_ONLY };
  try {
    return { ok: true, opened: await scan(db, await scanInput(db)) };
  } catch (error) {
    console.error("[fraud] scan", error);
    return { ok: false, message: FALLBACK_MESSAGE };
  }
}

export async function getFraudReviews(): Promise<Review[] | null> {
  const db = await adminDb();
  if (!db) return null;
  return listReviews(db);
}

export async function saveFraudNote(kind: ReviewKind, partyId: string, note: string): Promise<Reply> {
  const db = await adminDb();
  if (!db) return { ok: false, message: ADMINS_ONLY };
  await saveNote(db, kind, String(partyId), String(note));
  return { ok: true };
}

/** "Pedir prueba", "Despejar" or "Cerrar cuenta". */
export async function decideFraud(kind: ReviewKind, partyId: string, status: "prueba_pedida" | "despejada" | "cerrada"): Promise<Reply> {
  const db = await adminDb();
  if (!db) return { ok: false, message: ADMINS_ONLY };
  if (!["prueba_pedida", "despejada", "cerrada"].includes(status) || !["distributor", "shop"].includes(kind)) return { ok: false, message: FALLBACK_MESSAGE };
  try {
    if (status === "cerrada") {
      const directory = await getDirectory();
      const party = directory.find(String(partyId), kind);
      if (!party) return { ok: false, message: "No encontramos esa cuenta." };
      if (kind === "distributor") {
        await run("admin", (client) => client.revoke_distributor({ distributor: party.address }));
        await db.query(`UPDATE distributors SET status = 'rechazado', decided_at = now() WHERE id = $1`, [party.id]);
        await db.query(`DELETE FROM sessions WHERE user_id = (SELECT owner_user_id FROM distributors WHERE id = $1)`, [party.id]);
        invalidateDirectory();
      } else {
        await run("admin", (client) => client.set_terms({ shop: party.address, limit: 0n }));
        await db.query(`DELETE FROM sessions WHERE user_id = (SELECT owner_user_id FROM shops WHERE id = $1)`, [party.id]);
      }
    }
    await decideReview(db, kind, String(partyId), status);
    return { ok: true };
  } catch (error) {
    console.error("[fraud] decide", error);
    return { ok: false, message: FALLBACK_MESSAGE };
  }
}
