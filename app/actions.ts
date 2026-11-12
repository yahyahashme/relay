"use server";

// Server side of lib/api.ts when NEXT_PUBLIC_USE_MOCKS is "false".
// Talks to route_ledger on testnet. Secret keys never leave the server:
// everything under lib/stellar starts with `import "server-only"`.

import { formatDay, formatMoney } from "@/lib/format";
import { addressOf, DRIVER_IDS, explorerTx, nameOf, roleOf, SHOP_IDS, type Role } from "@/lib/stellar/config";
import { readClient } from "@/lib/stellar/client";
import { ContractError, FALLBACK_MESSAGE } from "@/lib/stellar/errors";
import { toInvoice, toShop } from "@/lib/stellar/map";
import { read, run } from "@/lib/stellar/send";
import { toDollars, toUnits } from "@/lib/stellar/units";
import type { Invoice as ChainInvoice } from "@/packages/route_ledger/src/index";
import type { Driver, Invoice, Pool, Receipt, Shop } from "@/lib/types";

// ---------- reads ----------

/** Pending cash claims only exist on unpaid invoices, so only those are asked. */
async function withCashClaim(invoice: ChainInvoice): Promise<Invoice> {
  if (invoice.status.tag === "Paid") return toInvoice(invoice);
  return toInvoice(invoice, await read(readClient().get_cash_claim({ id: invoice.id })));
}

export async function getInvoices(): Promise<Invoice[]> {
  const list = await read(readClient().list_invoices());
  return (await Promise.all(list.map(withCashClaim))).sort((a, b) => a.id - b.id);
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
  return invoice ? withCashClaim(invoice) : null;
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

const receipt = (hash: string, message: string): Receipt => ({ ok: true, message, txHash: hash, explorerUrl: explorerTx(hash) });

const shopView = (address: string) => read(readClient().get_shop({ shop: address }));

/** The pool pays what's left now; the shop owes it within the credit period. */
export async function payLater(invoiceId: number): Promise<Receipt> {
  try {
    const invoice = await chainInvoice(invoiceId);
    if (!invoice) return fail("No encontramos esa factura.");
    const left = invoice.amount - invoice.paid;
    if (left <= 0n) return fail("Esta factura ya está pagada.");
    const shop = roleOf(invoice.shop);
    if (!SHOP_IDS.includes(shop as Role)) return fail("Esta factura no es de su tienda.");

    const { hash } = await run(shop as Role, (client) => client.pay_with_credit({ shop: invoice.shop, id: invoice.id }));
    const after = await shopView(invoice.shop);
    const due = new Date(Number(after.due_at) * 1000).toISOString();
    return receipt(hash, `Listo. Tiene hasta el ${formatDay(due)} para pagar ${formatMoney(toDollars(left))}, sin intereses.`);
  } catch (error) {
    return failure(error);
  }
}

/** Cash, step 1: the driver says how much cash the shop handed over. Nothing moves yet. */
export async function claimCash(invoiceId: number, amount: number): Promise<Receipt> {
  try {
    const invoice = await chainInvoice(invoiceId);
    if (!invoice) return fail("No encontramos esa factura.");
    if (invoice.amount - invoice.paid <= 0n) return fail("Esta factura ya está pagada.");
    if (!Number.isFinite(amount) || amount <= 0) return fail("Monto inválido.");
    const driver = roleOf(invoice.driver);
    if (!DRIVER_IDS.includes(driver as Role)) return fail("Este motorista no está en la ruta.");

    const units = toUnits(amount.toFixed(2));
    const { hash } = await run(driver as Role, (client) =>
      client.cash_claim({ driver: invoice.driver, id: invoice.id, amount: units }),
    );
    return receipt(hash, "Listo. Ahora la tienda debe tocar «Confirmo».");
  } catch (error) {
    return failure(error);
  }
}

/** Cash, step 2: the shop confirms the driver's claim. */
export async function confirmCash(invoiceId: number): Promise<Receipt> {
  try {
    const invoice = await chainInvoice(invoiceId);
    if (!invoice) return fail("No encontramos esa factura.");
    const shop = roleOf(invoice.shop);
    if (!SHOP_IDS.includes(shop as Role)) return fail("Esta factura no es de su tienda.");
    const claim = await read(readClient().get_cash_claim({ id: invoice.id }));

    const { hash } = await run(shop as Role, (client) => client.cash_confirm({ shop: invoice.shop, id: invoice.id }));
    return receipt(hash, `Listo. Confirmó ${formatMoney(toDollars(claim))} en efectivo.`);
  } catch (error) {
    return failure(error);
  }
}

/** The shop pays back credit. Paying the whole debt on time can raise the limit. */
export async function repay(shopId: string, amount: number): Promise<Receipt> {
  try {
    const address = addressOf(shopId);
    if (!address || !SHOP_IDS.includes(shopId as Role)) return fail("No encontramos esa tienda.");
    if (!Number.isFinite(amount) || amount <= 0) return fail("Monto inválido.");
    const before = await shopView(address);
    if (before.owed <= 0n) return fail("No tiene deudas pendientes.");
    // The screen sends dollars; "pay everything" must send the exact units owed.
    const asked = toUnits(amount.toFixed(2));
    const units = asked >= before.owed || toDollars(before.owed) === amount ? before.owed : asked;

    const { hash } = await run(shopId as Role, (client) => client.repay({ shop: address, amount: units }));
    const after = await shopView(address);
    if (after.owed > 0n) {
      return receipt(hash, `Pago recibido: ${formatMoney(toDollars(units))}. Falta ${formatMoney(toDollars(after.owed))}.`);
    }
    const limit = formatMoney(toDollars(after.limit));
    if (after.late > before.late) {
      return receipt(hash, after.limit < before.limit ? `Deuda pagada con atraso. Su límite bajó a ${limit}.` : "Deuda pagada con atraso.");
    }
    return receipt(hash, after.limit > before.limit ? `Deuda pagada a tiempo. Su límite subió a ${limit}.` : "Deuda pagada a tiempo. Gracias.");
  } catch (error) {
    return failure(error);
  }
}

// ---------- demo invoices (the distributor's "Nueva factura de demo") ----------

const DEMO_SHOPS = ["tienda-1", "tienda-2", "tienda-3"] as const;
const DEMO_DRIVER: Record<string, string> = { "tienda-1": "motorista-1", "tienda-2": "motorista-1", "tienda-3": "motorista-2" };
const DEMO_AMOUNTS = ["45.00", "60.00", "85.50"]; // several fit under a $200 limit
const WEEK_SECS = 7n * 24n * 60n * 60n;
const DEMO_TRIES = 3;

/** A new invoice from the approved distributor. Throws a Spanish message if it can't. */
export async function createDemoInvoice(shopId?: string): Promise<Invoice> {
  if (shopId !== undefined && !SHOP_IDS.includes(shopId as Role)) throw new Error("Tienda desconocida.");
  let skip = 0n; // ids found taken by someone else (code 1, AlreadyExists)
  for (let attempt = 0; attempt < DEMO_TRIES; attempt++) {
    let id = 0n;
    try {
      await run("distributor", async (client) => {
        // Picked inside the distributor's queue so two taps never pick the same id.
        const list = await read(readClient().list_invoices());
        id = list.reduce((max, i) => (i.id > max ? i.id : max), 1000n) + 1n + skip;
        const shop = shopId ?? DEMO_SHOPS[Number(id % 3n)];
        // A few random seconds so two server instances never build the very same
        // transaction: identical ones share a hash, and both judges would get one invoice.
        const jitter = BigInt(Math.floor(Math.random() * 600));
        const due = BigInt(Math.floor(Date.now() / 1000)) + WEEK_SECS + jitter;
        return client.create_invoice({
          distributor: addressOf("distributor") as string,
          id,
          shop: addressOf(shop) as string,
          driver: addressOf(DEMO_DRIVER[shop]) as string,
          amount: toUnits(DEMO_AMOUNTS[Number(id % 3n)]),
          due,
        });
      });
    } catch (error) {
      if (error instanceof ContractError && error.code === 1) {
        skip += 1n;
        continue;
      }
      // Another server instance took the same id between our simulation and the
      // ledger (the transaction fails with no code). Pick again from a fresh list.
      if (error instanceof ContractError && error.code === null) continue;
      console.error("[actions]", error);
      throw new Error(error instanceof ContractError ? error.message : FALLBACK_MESSAGE);
    }
    const created = await getInvoice(Number(id));
    if (created) return created;
  }
  throw new Error(FALLBACK_MESSAGE);
}
