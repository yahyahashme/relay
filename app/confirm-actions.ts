"use server";

// Payment confirmation (#199), the two steps the confirm sheet calls before a pay action.
// The pay actions in app/actions.ts then redeem the confirmation right before they sign.

import { mayActAs, NOT_YOURS } from "@/lib/server/authz";
import { getDb } from "@/lib/server/db";
import { getDirectory, type Party } from "@/lib/server/directory";
import { finishConfirm, startConfirm } from "@/lib/server/pay-confirm";
import { confirmOwner, relyingParty } from "@/lib/server/pay-owner";
import { readClient } from "@/lib/stellar/client";
import { ContractError, FALLBACK_MESSAGE } from "@/lib/stellar/errors";
import { read } from "@/lib/stellar/send";
import { type ConfirmFinish, type ConfirmProof, type ConfirmRequest, type ConfirmStart, toCents } from "@/lib/pay-confirm";

const NO_DB = "No se puede confirmar pagos en este servidor.";

/** The shop this confirmation is for, checked against the invoice on the contract. */
async function shopFor(request: ConfirmRequest): Promise<Party | string> {
  const directory = await getDirectory();
  if (request.action === "repay") {
    return directory.find(String(request.shopId ?? ""), "shop") ?? "No encontramos esa tienda.";
  }
  const id = Number(request.invoiceId);
  if (!Number.isSafeInteger(id) || id < 0) return "No encontramos esa factura.";
  try {
    const result = await read(readClient().get_invoice({ id: BigInt(id) }));
    if (!result.isOk()) return "No encontramos esa factura.";
    const shop = directory.byAddress(result.unwrap().shop);
    return shop?.kind === "shop" ? shop : "Esta factura no es de su tienda.";
  } catch (error) {
    if (error instanceof ContractError && error.code === 2) return "No encontramos esa factura.";
    throw error;
  }
}

/** A tap on a pay button: a fresh challenge for exactly this amount, and how this phone can answer it. */
export async function startPayConfirm(request: ConfirmRequest): Promise<ConfirmStart> {
  try {
    const db = getDb();
    if (!db) return { ok: false, message: NO_DB };
    if (!["pay", "later", "cash", "repay"].includes(request.action)) return { ok: false, message: "Monto inválido." };
    if (!Number.isFinite(request.amount) || request.amount <= 0) return { ok: false, message: "Monto inválido." };
    const shop = await shopFor(request);
    if (typeof shop === "string") return { ok: false, message: shop };
    if (!(await mayActAs(shop))) return { ok: false, message: NOT_YOURS };
    const owner = await confirmOwner(shop, true);
    if (!owner) return { ok: false, message: NOT_YOURS };
    const target = {
      action: request.action,
      partyId: shop.id,
      invoiceId: request.action === "repay" ? null : Number(request.invoiceId),
      cents: toCents(request.amount),
    };
    return await startConfirm(db, owner, target, await relyingParty());
  } catch (error) {
    console.error("[confirm]", error);
    return { ok: false, message: FALLBACK_MESSAGE };
  }
}

/** The owner's face, finger or PIN for that challenge. */
export async function finishPayConfirm(id: string, shopId: string, proof: ConfirmProof): Promise<ConfirmFinish> {
  try {
    const db = getDb();
    if (!db) return { ok: false, message: NO_DB };
    const shop = (await getDirectory()).find(String(shopId), "shop");
    if (!shop) return { ok: false, message: "No encontramos esa tienda." };
    const owner = await confirmOwner(shop, false);
    if (!owner) return { ok: false, message: NOT_YOURS };
    return await finishConfirm(db, owner, String(id), proof, await relyingParty());
  } catch (error) {
    console.error("[confirm]", error);
    return { ok: false, message: FALLBACK_MESSAGE };
  }
}
