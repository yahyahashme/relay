"use server";

// Server side of lib/api.ts when NEXT_PUBLIC_USE_MOCKS is "false".
// Talks to route_ledger on testnet. Secret keys never leave the server:
// everything under lib/stellar starts with `import "server-only"`.

import { formatMoney } from "@/lib/format";
import { addressOf, DRIVER_IDS, explorerTx, nameOf, roleOf, SHOP_IDS, type Role } from "@/lib/stellar/config";
import { readClient } from "@/lib/stellar/client";
import { ContractError, FALLBACK_MESSAGE } from "@/lib/stellar/errors";
import { toInvoice, toShop } from "@/lib/stellar/map";
import { read, run } from "@/lib/stellar/send";
import { toDollars, toUnits } from "@/lib/stellar/units";
import type { Driver, Invoice, Pool, Receipt, Shop } from "@/lib/types";

// ---------- reads ----------

export async function getInvoices(): Promise<Invoice[]> {
  const list = await read(readClient().list_invoices());
  return list.map(toInvoice).sort((a, b) => a.id - b.id);
}

async function chainInvoice(id: number) {
  if (!Number.isSafeInteger(id) || id < 0) return null;
  try {
    const result = await read(readClient().get_invoice({ id: BigInt(id) }));
    return result.isOk() ? result.unwrap() : null;
  } catch (error) {
    if (error instanceof ContractError && error.code === 2) return null; // NotFound
    throw error;
  }
}

export async function getInvoice(id: number): Promise<Invoice | null> {
  const invoice = await chainInvoice(id);
  return invoice ? toInvoice(invoice) : null;
}

export async function getShop(shopId: string): Promise<Shop | null> {
  const address = addressOf(shopId);
  if (!address || !SHOP_IDS.includes(shopId as Role)) return null;
  return toShop(shopId, await read(readClient().get_shop({ shop: address })));
}

export async function getDrivers(): Promise<Driver[]> {
  return Promise.all(
    DRIVER_IDS.map(async (id) => ({
      id,
      name: nameOf(id),
      cashHeld: toDollars(await read(readClient().get_driver_cash({ driver: addressOf(id) as string }))),
    })),
  );
}

export async function getPool(): Promise<Pool> {
  const pool = await read(readClient().get_pool());
  return { available: toDollars(pool.available), buffer: toDollars(pool.buffer) };
}

// ---------- writes ----------

const fail = (message: string): Receipt => ({ ok: false, message });

function failure(error: unknown): Receipt {
  if (error instanceof ContractError) return fail(error.message);
  console.error("[actions]", error);
  return fail(FALLBACK_MESSAGE);
}

/** The shop pays (part of) an invoice in dollars digitales. No amount = what's left. */
export async function payNow(invoiceId: number, amount?: number): Promise<Receipt> {
  try {
    const invoice = await chainInvoice(invoiceId);
    if (!invoice) return fail("No encontramos esa factura.");
    const left = invoice.amount - invoice.paid;
    if (left <= 0n) return fail("Esta factura ya está pagada.");

    let units = left;
    if (amount !== undefined) {
      if (!Number.isFinite(amount) || amount <= 0) return fail("Monto inválido.");
      units = toUnits(amount.toFixed(2));
    }
    if (units > left) return fail(`El monto es mayor que lo que falta pagar (${formatMoney(toDollars(left))}).`);

    const shop = roleOf(invoice.shop);
    if (!SHOP_IDS.includes(shop as Role)) return fail("Esta factura no es de su tienda.");

    const { hash } = await run(shop as Role, (client) =>
      client.pay({ shop: invoice.shop, id: invoice.id, amount: units }),
    );
    const paid = formatMoney(toDollars(units));
    const message =
      units === left
        ? `Pago recibido: ${paid} en dólares digitales.`
        : `Pago recibido: ${paid}. Falta ${formatMoney(toDollars(left - units))}.`;
    return { ok: true, message, txHash: hash, explorerUrl: explorerTx(hash) };
  } catch (error) {
    return failure(error);
  }
}
