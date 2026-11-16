"use server";

// Server side of lib/api.ts when NEXT_PUBLIC_USE_MOCKS is "false".
// Talks to route_ledger on testnet. Secret keys never leave the server:
// everything under lib/stellar starts with `import "server-only"`.

import { formatDay, formatMoney } from "@/lib/format";
import { isDemoParty, mayActAs, NOT_YOURS } from "@/lib/server/authz";
import { getDirectory, type Directory } from "@/lib/server/directory";
import { addressOf, config, explorerTx, nameOf, roleOf, SHOP_IDS, type Role } from "@/lib/stellar/config";
import { readClient } from "@/lib/stellar/client";
import { ContractError, FALLBACK_MESSAGE } from "@/lib/stellar/errors";
import { toInvoice, toShop } from "@/lib/stellar/map";
import { read, run } from "@/lib/stellar/send";
import { toDollars, toUnits } from "@/lib/stellar/units";
import { buildHistory } from "@/lib/history";
import { poolHealth } from "@/lib/pool-health";
import { nativeToScVal, rpc, scValToNative } from "@stellar/stellar-sdk";
import type { Invoice as ChainInvoice } from "@/packages/route_ledger/src/index";
import { toUnixSeconds } from "@/lib/dates";
import { firstFreeId, nextDemoId } from "@/lib/demo-ids";
import { getDb } from "@/lib/server/db";
import { inReview } from "@/lib/server/fraud";
import { scanLater } from "@/lib/server/fraud-scan";
import { checkInvoice, choices, cleanAmount, dueAt, myApprovedDistributor } from "@/lib/server/invoices";
import { redeemConfirm, unitsToCents, type ConfirmTarget } from "@/lib/server/pay-confirm";
import { confirmOwner } from "@/lib/server/pay-owner";
import { recordDoorPayment, unlockIfDue, unlockStatus } from "@/lib/server/credit-unlock";
import type { Party } from "@/lib/server/directory";
import { HISTORY_PAGE, type Driver, type Invoice, type InvoiceHistory, type InvoiceRow, type LenderView, type Pool, type PoolHealth, type Receipt, type Payment, type Shop, type ShopHistory, type StopPayments, type Supplier, type Totals } from "@/lib/types";
import { splitBlock } from "@/lib/labels";

// ---------- reads ----------

/** Pending cash claims only exist on unpaid invoices, so only those are asked. */
async function withCashClaim(invoice: ChainInvoice, directory: Directory): Promise<Invoice> {
  if (invoice.status.tag === "Paid") return toInvoice(invoice, directory);
  return toInvoice(invoice, directory, await read(readClient().get_cash_claim({ id: invoice.id })));
}

export async function getInvoices(): Promise<Invoice[]> {
  const [list, directory] = await Promise.all([read(readClient().list_invoices()), getDirectory()]);
  return (await Promise.all(list.map((i) => withCashClaim(i, directory)))).sort((a, b) => a.id - b.id);
}

/** The newest `pages` pages of the whole history, newest first. */
export async function getInvoiceHistory(pages: number): Promise<InvoiceHistory> {
  const total = await read(readClient().invoice_count());
  const count = Math.max(1, Math.min(Math.floor(pages) || 1, 100));
  const befores = Array.from({ length: count }, (_, i) => total - i * HISTORY_PAGE).filter((b) => b > 0);
  const lists = await Promise.all(
    befores.map((before) => read(readClient().list_invoices_page({ before, limit: HISTORY_PAGE }))),
  );
  const directory = await getDirectory();
  return { invoices: await Promise.all(lists.flat().map((i) => withCashClaim(i, directory))), total };
}

export async function getTotals(): Promise<Totals> {
  const t = await read(readClient().get_totals());
  return { invoices: t.invoices, digital: toDollars(t.digital), cash: toDollars(t.cash), credit: toDollars(t.credit) };
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
  if (!invoice) return null;
  const view = await withCashClaim(invoice, await getDirectory());
  // Who gives the shop the 7 days on this invoice (#194): only asked while there is something left to pay.
  if (view.status !== "paid" && !invoice.later && (await offersOwnCredit(invoice))) view.ownCredit = true;
  return view;
}

const offersOwnCredit = (invoice: ChainInvoice) =>
  read(readClient().offers_own_credit({ distributor: invoice.distributor, shop: invoice.shop }));

/** Pool-level numbers for lenders (#220): no shop's own history. */
export async function getPoolHealth(): Promise<PoolHealth> {
  const directory = await getDirectory();
  const parties = directory.ofKind("shop");
  const [views, totals] = await Promise.all([
    Promise.all(parties.map((p) => read(readClient().get_shop({ shop: p.address })).catch(() => null))),
    read(readClient().get_totals()),
  ]);
  const shops = parties.flatMap((p, i) => (views[i] ? [toShop(p, views[i]!, directory)] : []));
  return poolHealth(shops, toDollars(totals.credit), Date.now());
}

export async function getShop(shopId: string): Promise<Shop | null> {
  const directory = await getDirectory();
  const party = directory.find(shopId, "shop");
  if (!party) return null;
  const view = await read(readClient().get_shop({ shop: party.address }));
  const shop = toShop(party, view, directory);
  // #217: a shop with no credit yet sees how close it is.
  const db = getDb();
  if (db) {
    const unlock = await unlockStatus(db, party.id, view).catch(() => null);
    if (unlock) shop.unlock = unlock;
  }
  return shop;
}

export async function getDrivers(): Promise<Driver[]> {
  const drivers = (await getDirectory()).ofKind("driver").filter((driver) => driver.active !== false);
  return Promise.all(
    drivers.map(async (driver) => ({
      id: driver.id,
      name: driver.name,
      distributorId: driver.distributorId,
      cashHeld: toDollars(await read(readClient().get_driver_cash({ driver: driver.address }))),
    })),
  );
}

/** The shop's test dollars on hand, read from Horizon (its trustline balance). */
export async function getBalance(shopId: string): Promise<number | null> {
  const address = addressOf(shopId);
  if (!address || !SHOP_IDS.includes(shopId as Role)) return null;
  const res = await fetch(`${config.horizonUrl}/accounts/${address}`, { cache: "no-store" });
  if (!res.ok) return 0;
  const account = (await res.json()) as { balances?: { asset_code?: string; asset_issuer?: string; balance: string }[] };
  const line = account.balances?.find((b) => b.asset_code === config.token.code && b.asset_issuer === config.token.issuer);
  return line ? Number(line.balance) : 0;
}

const PAYMENT_EVENTS: Record<string, Payment["method"]> = {
  invoice_paid: "digital",
  cash_confirmed: "cash",
  paid_with_credit: "credit",
  repaid: "repay",
};

/**
 * The shop's payments from the contract's events (InvoicePaid, CashConfirmed, PaidWithCredit,
 * Repaid). The network keeps about a week of events, so anything older shows from the invoice
 * alone, without a date (lib/history.ts adds those rows).
 */
async function shopPayments(address: string): Promise<Payment[]> {
  const server = new rpc.Server(config.rpcUrl);
  const health = await server.getHealth();
  const filters = [{ type: "contract" as const, contractIds: [config.contracts.routeLedger] }];
  const payments: Payment[] = [];
  let page = await server.getEvents({ filters, startLedger: Math.max(health.oldestLedger, health.latestLedger - 120_000), limit: 1000 });
  for (let pages = 0; pages < 20; pages++) {
    for (const e of page.events) {
      const name = String(scValToNative(e.topic[0]));
      const method = PAYMENT_EVENTS[name];
      if (!method) continue;
      const data = scValToNative(e.value) as { shop?: string; driver?: string; amount?: bigint };
      if (data.shop !== address || data.amount === undefined) continue;
      payments.push({
        invoiceId: method === "repay" ? null : Number(scValToNative(e.topic[1])),
        method,
        amount: toDollars(data.amount),
        at: new Date(e.ledgerClosedAt).toISOString(),
        driverId: data.driver ? roleOf(data.driver) : undefined,
        txHash: e.txHash,
      });
    }
    if (page.events.length < 1000) break;
    page = await server.getEvents({ filters, cursor: page.cursor, limit: 1000 });
  }
  return payments;
}

/** Every payment the shop made and what it still owes, newest first (#136). */
export async function getShopHistory(shopId: string): Promise<ShopHistory | null> {
  const address = addressOf(shopId);
  if (!address || !SHOP_IDS.includes(shopId as Role)) return null;
  const total = await read(readClient().invoice_count());
  const [history, shop, payments] = await Promise.all([
    getInvoiceHistory(Math.min(10, Math.ceil(total / HISTORY_PAGE) || 1)),
    getShop(shopId),
    shopPayments(address).catch((error) => {
      console.error("[actions] events", error);
      return [] as Payment[]; // the invoices alone still give a history, just without dates
    }),
  ]);
  if (!shop) return null;
  return buildHistory({
    invoices: history.invoices.filter((i) => i.shopId === shopId),
    payments,
    creditOwed: shop.creditOwed,
    creditDue: shop.creditDue,
    distributor: nameOf("distributor"),
    now: Date.now(),
    explorerTx,
  });
}

/** The distributors this shop buys from: today the one in config/testnet.json. */
export async function getSuppliers(shopId: string): Promise<Supplier[]> {
  const mine = (await getInvoices()).filter((i) => i.shopId === shopId);
  if (mine.length === 0) return [];
  return [{ id: "distributor", name: nameOf("distributor"), invoices: mine.length, unpaid: mine.filter((i) => i.status !== "paid").length }];
}

export async function getPool(): Promise<Pool> {
  const pool = await read(readClient().get_pool());
  return { available: toDollars(pool.available), buffer: toDollars(pool.buffer), lent: toDollars(pool.lent) };
}

/** The demo lender's place in the pool (config/testnet.json `accounts.lender`). Public on chain anyway. */
export async function getLender(): Promise<LenderView> {
  const address = addressOf("lender");
  if (!address) return { approved: false, value: 0, netDeposited: 0 };
  const view = await read(readClient().get_lender({ lender: address }));
  return { approved: view.approved, value: toDollars(view.value), netDeposited: toDollars(view.net_deposited) };
}

// ---------- writes ----------

const fail = (message: string): Receipt => ({ ok: false, message });

/**
 * Face ID, fingerprint or PIN (#199): the server signs for the shop, so it first uses up the
 * confirmation the owner gave for exactly this action, invoice and amount. Null = go ahead.
 */
async function confirmed(confirmId: string | undefined, shop: Party, target: Omit<ConfirmTarget, "partyId" | "cents">, units: bigint): Promise<string | null> {
  const db = getDb();
  if (!db) return "No se puede confirmar pagos en este servidor.";
  return redeemConfirm(db, await confirmOwner(shop, false), confirmId, { ...target, partyId: shop.id, cents: unitsToCents(units) });
}

function failure(error: unknown): Receipt {
  if (error instanceof ContractError) return fail(error.message);
  console.error("[actions]", error);
  return fail(FALLBACK_MESSAGE);
}

/** The shop pays (part of) an invoice in dollars digitales. No amount = what's left. */
export async function payNow(invoiceId: number, amount?: number, confirmId?: string): Promise<Receipt> {
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
    if (amount !== undefined) {
      // Leave room for cash the driver recorded, so the shop can still confirm it.
      const claim = await read(readClient().get_cash_claim({ id: invoice.id }));
      if (claim > 0n && units > left - claim) {
        return fail(
          `Hay ${formatMoney(toDollars(claim))} en efectivo por confirmar. Puede pagar hasta ${formatMoney(toDollars(left - claim))}.`,
        );
      }
    }

    const shop = (await getDirectory()).byAddress(invoice.shop);
    if (shop?.kind !== "shop") return fail("Esta factura no es de su tienda.");
    if (!(await mayActAs(shop))) return fail(NOT_YOURS);
    const unconfirmed = await confirmed(confirmId, shop, { action: "pay", invoiceId }, units);
    if (unconfirmed) return fail(unconfirmed);

    const { hash } = await run(shop.id, (client) =>
      client.pay({ shop: invoice.shop, id: invoice.id, amount: units }),
    );
    const paid = formatMoney(toDollars(units));
    let message =
      units === left
        ? `Pago recibido: ${paid} en dólares digitales.`
        : `Pago recibido: ${paid}. Falta ${formatMoney(toDollars(left - units))}.`;
    // #217: a delivery paid off digitally counts toward a new shop's first credit, if at least half of it
    // was this payment (a few cents after the cash doesn't count).
    const unlocked = units === left && units * 2n >= invoice.amount ? await countDoorPayment(shop, invoice) : null;
    if (unlocked) message += ` Su tienda ya tiene ${formatMoney(unlocked)} de crédito para «Pagar en 7 días».`;
    return { ok: true, message, txHash: hash, explorerUrl: explorerTx(hash) };
  } catch (error) {
    return failure(error);
  }
}

/** Records the door payment and gives the first limit if it's due. Never fails the payment. */
async function countDoorPayment(shop: Party, invoice: ChainInvoice): Promise<number | null> {
  const db = getDb();
  if (!db) return null;
  try {
    await recordDoorPayment(db, shop.id, Number(invoice.id), unitsToCents(invoice.amount));
    return await unlockIfDue(db, shop);
  } catch (error) {
    console.error("[credit unlock]", error instanceof Error ? error.message : error);
    return null;
  }
}

const receipt = (hash: string, message: string): Receipt => ({ ok: true, message, txHash: hash, explorerUrl: explorerTx(hash) });

const shopView = (address: string) => read(readClient().get_shop({ shop: address }));

/** The pool pays what's left now; the shop owes it within the credit period. */
export async function payLater(invoiceId: number, confirmId?: string): Promise<Receipt> {
  try {
    const invoice = await chainInvoice(invoiceId);
    if (!invoice) return fail("No encontramos esa factura.");
    const left = invoice.amount - invoice.paid;
    if (left <= 0n) return fail("Esta factura ya está pagada.");
    const shop = (await getDirectory()).byAddress(invoice.shop);
    if (shop?.kind !== "shop") return fail("Esta factura no es de su tienda.");
    if (!(await mayActAs(shop))) return fail(NOT_YOURS);
    const unconfirmed = await confirmed(confirmId, shop, { action: "later", invoiceId }, left);
    if (unconfirmed) return fail(unconfirmed);
    const ownCredit = !invoice.later && (await offersOwnCredit(invoice));
    if (!ownCredit && (await distributorInReview(invoice))) return fail(IN_REVIEW);
    const { hash, due } = await restOnLater(shop, invoice, ownCredit);
    return receipt(hash, `Listo. Tiene hasta el ${formatDay(due)} para pagar ${formatMoney(toDollars(left))}, sin intereses.`);
  } catch (error) {
    return failure(error);
  }
}

const IN_REVIEW = "Esta distribuidora está en revisión. Por ahora pague en dólares digitales o en efectivo.";

/** #231: while Relay reviews this distributor's invoices, they don't go on the lenders' money. */
async function distributorInReview(invoice: ChainInvoice): Promise<boolean> {
  const db = getDb();
  const seller = (await getDirectory()).byAddress(invoice.distributor);
  return Boolean(db && seller && (await inReview(db, "distributor", seller.id)));
}

/** What's left goes on 7 days: the distributor's own (#194, nothing moves today) or the pool's. */
async function restOnLater(shop: Party, invoice: ChainInvoice, ownCredit: boolean): Promise<{ hash: string; due: string }> {
  if (ownCredit) {
    const { hash } = await run(shop.id, (client) => client.pay_later({ shop: invoice.shop, id: invoice.id }));
    const after = await chainInvoice(Number(invoice.id));
    return { hash, due: new Date(Number(after?.due ?? 0n) * 1000).toISOString() };
  }
  const { hash } = await run(shop.id, (client) => client.pay_with_credit({ shop: invoice.shop, id: invoice.id }));
  const after = await shopView(invoice.shop);
  return { hash, due: new Date(Number(after.due_at) * 1000).toISOString() };
}

/**
 * Split at the door (#235): the shop pays a part now in dólares digitales and the rest goes on 7 days,
 * in one confirm. Cash is never part of a split (Yahya, Nov 15): it is all that's left or nothing.
 * Two contract calls (pay, then pay_with_credit or pay_later). Every check the second call makes is run first, so a part is only
 * paid on a split that can finish; if the second still fails, the part stays paid and the screen says so.
 */
export async function payPartLater(invoiceId: number, amount: number, confirmId?: string): Promise<Receipt> {
  try {
    const invoice = await chainInvoice(invoiceId);
    if (!invoice) return fail("No encontramos esa factura.");
    const left = invoice.amount - invoice.paid;
    if (left <= 0n) return fail("Esta factura ya está pagada.");
    if (!Number.isFinite(amount) || amount <= 0) return fail("Monto inválido.");
    const units = toUnits(amount.toFixed(2));
    if (units >= left) return fail("Para pagar todo, use «Pagar ahora».");
    const shop = (await getDirectory()).byAddress(invoice.shop);
    if (shop?.kind !== "shop") return fail("Esta factura no es de su tienda.");
    if (!(await mayActAs(shop))) return fail(NOT_YOURS);

    const claim = await read(readClient().get_cash_claim({ id: invoice.id }));
    if (claim > 0n) return fail("Hay efectivo por confirmar. Confírmelo primero en «Pagué en efectivo».");

    const ownCredit = !invoice.later && (await offersOwnCredit(invoice));
    if (!ownCredit && (await distributorInReview(invoice))) return fail(IN_REVIEW);
    const [view, pool] = await Promise.all([getShop(shop.id), ownCredit ? null : getPool()]);
    const blocked = splitBlock(view, { ...toInvoice(invoice, await getDirectory()), ownCredit }, toDollars(left - units), pool?.available);
    if (blocked) return fail(blocked);

    const unconfirmed = await confirmed(confirmId, shop, { action: "split", invoiceId }, units);
    if (unconfirmed) return fail(unconfirmed);

    const first = await run(shop.id, (client) => client.pay({ shop: invoice.shop, id: invoice.id, amount: units }));
    const part = formatMoney(toDollars(units));
    const rest = formatMoney(toDollars(left - units));
    const paidAfter = await chainInvoice(invoiceId);
    try {
      const { hash, due } = await restOnLater(shop, paidAfter ?? invoice, ownCredit);
      return receipt(hash, `Listo. Pagó ${part} hoy. Tiene hasta el ${formatDay(due)} para pagar ${rest}, sin intereses.`);
    } catch (error) {
      console.error("[split] rest", error);
      return receipt(first.hash, `Pagó ${part}. El resto (${rest}) no pasó a 7 días: páguelo aquí.`);
    }
  } catch (error) {
    return failure(error);
  }
}

/** How each stop was paid (#235), from the contract's events (about a week of them, today's route is in there). */
export async function getStopPayments(invoiceIds: number[]): Promise<Record<number, StopPayments>> {
  const wanted = new Set(invoiceIds.filter((id) => Number.isSafeInteger(id)).slice(0, 100));
  const out: Record<number, StopPayments> = {};
  if (wanted.size === 0) return out;
  const KIND: Record<string, keyof StopPayments> = { invoice_paid: "digital", cash_confirmed: "cash", paid_with_credit: "credit" };
  const server = new rpc.Server(config.rpcUrl);
  const health = await server.getHealth();
  const topics = Object.keys(KIND).map((name) => [nativeToScVal(name, { type: "symbol" }).toXDR("base64"), "*"]);
  const filters = [{ type: "contract" as const, contractIds: [config.contracts.routeLedger], topics }];
  let page = await server.getEvents({ filters, startLedger: Math.max(health.oldestLedger, health.latestLedger - 120_000), limit: 1000 });
  for (let pages = 0; pages < 20; pages++) {
    for (const e of page.events) {
      const kind = KIND[String(scValToNative(e.topic[0]))];
      const id = Number(scValToNative(e.topic[1]));
      if (!kind || !wanted.has(id)) continue;
      const data = scValToNative(e.value) as { amount?: bigint };
      if (data.amount === undefined) continue;
      out[id] ??= { digital: 0, cash: 0, credit: 0 };
      out[id][kind] = Math.round((out[id][kind] + toDollars(data.amount)) * 100) / 100;
    }
    if (page.events.length < 1000) break;
    page = await server.getEvents({ filters, cursor: page.cursor, limit: 1000 });
  }
  return out;
}

/** Cash, step 1: the driver says the shop handed over all that's left in cash. Nothing moves yet. */
export async function claimCash(invoiceId: number, amount: number): Promise<Receipt> {
  try {
    const invoice = await chainInvoice(invoiceId);
    if (!invoice) return fail("No encontramos esa factura.");
    const left = invoice.amount - invoice.paid;
    if (left <= 0n) return fail("Esta factura ya está pagada.");
    if (!Number.isFinite(amount) || amount <= 0) return fail("Monto inválido.");
    // Cash is all that's left or nothing (Yahya, Nov 15): a part is only paid in dólares digitales.
    if (toUnits(amount.toFixed(2)) !== left) return fail(`El efectivo es por todo lo que falta (${formatMoney(toDollars(left))}). Una parte solo se paga en dólares digitales.`);
    const driver = (await getDirectory()).byAddress(invoice.driver);
    if (driver?.kind !== "driver") return fail("Este motorista no está en la ruta.");
    if (!(await mayActAs(driver))) return fail(NOT_YOURS);

    const units = toUnits(amount.toFixed(2));
    const { hash } = await run(driver.id, (client) =>
      client.cash_claim({ driver: invoice.driver, id: invoice.id, amount: units }),
    );
    return receipt(hash, "Listo. Ahora la tienda debe tocar «Confirmo».");
  } catch (error) {
    return failure(error);
  }
}

/** Cash, step 2: the shop confirms the driver's claim. */
/** `amount` is the cash claim the shop was shown; the contract refuses if the driver changed it since. */
export async function confirmCash(invoiceId: number, amount: number, confirmId?: string): Promise<Receipt> {
  try {
    const invoice = await chainInvoice(invoiceId);
    if (!invoice) return fail("No encontramos esa factura.");
    const shop = (await getDirectory()).byAddress(invoice.shop);
    if (shop?.kind !== "shop") return fail("Esta factura no es de su tienda.");
    if (!(await mayActAs(shop))) return fail(NOT_YOURS);
    if (!Number.isFinite(amount) || amount <= 0) return fail("Monto inválido.");
    const units = toUnits(amount.toFixed(2));
    const unconfirmed = await confirmed(confirmId, shop, { action: "cash", invoiceId }, units);
    if (unconfirmed) return fail(unconfirmed);

    const { hash } = await run(shop.id, (client) =>
      client.cash_confirm({ shop: invoice.shop, id: invoice.id, amount: units }),
    );
    return receipt(hash, `Listo. Confirmó ${formatMoney(toDollars(units))} en efectivo.`);
  } catch (error) {
    return failure(error);
  }
}

/** The shop pays back credit. Paying the whole debt on time can raise the limit. */
export async function repay(shopId: string, amount: number, confirmId?: string): Promise<Receipt> {
  try {
    const shop = (await getDirectory()).find(shopId, "shop");
    if (!shop) return fail("No encontramos esa tienda.");
    if (!(await mayActAs(shop))) return fail(NOT_YOURS);
    const address = shop.address;
    if (!Number.isFinite(amount) || amount <= 0) return fail("Monto inválido.");
    const before = await shopView(address);
    if (before.owed <= 0n) return fail("No tiene deudas pendientes.");
    // The screen sends dollars; "pay everything" must send the exact units owed.
    const asked = toUnits(amount.toFixed(2));
    const units = asked >= before.owed || toDollars(before.owed) === amount ? before.owed : asked;
    const unconfirmed = await confirmed(confirmId, shop, { action: "repay", invoiceId: null }, units);
    if (unconfirmed) return fail(unconfirmed);

    const { hash } = await run(shop.id, (client) => client.repay({ shop: address, amount: units }));
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

/** The distributor got a driver's cash at the warehouse. No money moves on chain. */
export async function handInCash(driverId: string, amount: number): Promise<Receipt> {
  try {
    const directory = await getDirectory();
    const party = directory.find(driverId, "driver");
    if (!party) return fail("No encontramos a ese motorista.");
    const distributorId = party.distributorId ?? "distributor";
    const distributor = directory.find(distributorId, "distributor");
    if (!distributor) return fail("No encontramos a ese motorista.");
    if (!(await mayActAs(distributor))) return fail(NOT_YOURS);
    const driver = party.address;
    if (!Number.isFinite(amount) || amount <= 0) return fail("Monto inválido.");
    const held = await read(readClient().get_driver_cash({ driver }));
    // "Hand in everything" must send the exact units held.
    const asked = toUnits(amount.toFixed(2));
    const units = toDollars(held) === amount ? held : asked;
    const { hash } = await run(distributor.id, (client) =>
      client.cash_handed_in({ distributor: distributor.address, driver, amount: units }),
    );
    return receipt(hash, `Listo. ${party.name} entregó ${formatMoney(toDollars(units))} en efectivo.`);
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

// Each invoice is its own transaction (about 5 s), and the server action has 60 s
// (app/distribuidor/layout.tsx), so 10 per file stays well inside it.
const MAX_IMPORT = 10;
const AMOUNT = /^\d+(\.\d{1,7})?$/;

/**
 * CSV import (#32): checks every row first (shop and driver known, id not on
 * the contract yet), then creates them one at a time, signed by the
 * distributor. If one fails midway, says how many were created.
 * A signed-in, approved distributor (#133) imports for their own shops and
 * drivers; everyone else imports for the demo distributor.
 */
export async function createInvoices(rows: InvoiceRow[]): Promise<Receipt> {
  if (rows.length === 0) return fail("No hay facturas para crear.");
  if (rows.length > MAX_IMPORT) return fail(`Máximo ${MAX_IMPORT} facturas por archivo.`);
  let created = 0;
  let lastHash = "";
  try {
    const own = getDb() ? await myApprovedDistributor() : null;
    const mine = own ? await choices(own) : null;
    const directory = mine?.directory ?? (await getDirectory());
    const distributor = own ? { id: own.id, address: own.stellarAddress } : directory.find("distributor", "distributor");
    if (!distributor) return fail(FALLBACK_MESSAGE);
    // Who the rows may name: a signed-in distributor's own shops and drivers, or,
    // for everyone else, only the demo's (never a real shop billed by the demo distributor).
    const demo = (kind: "shop" | "driver") => new Set(directory.ofKind(kind).filter((p) => isDemoParty(p.id)).map((p) => p.id));
    const allowedShops = mine ? new Set(mine.shops.map((s) => s.id)) : demo("shop");
    const allowedDrivers = mine ? new Set(mine.drivers.map((d) => d.id)) : demo("driver");
    // Check everything before sending anything: the rows come from the browser.
    const ids = new Set<number>();
    for (const [index, row] of rows.entries()) {
      const line = `Fila ${index + 1}`;
      if (!directory.find(row.shopId, "shop") || !allowedShops.has(row.shopId)) return fail(`${line}: tienda desconocida.`);
      if (!directory.find(row.driverId, "driver") || !allowedDrivers.has(row.driverId)) return fail(`${line}: motorista desconocido.`);
      if (!Number.isSafeInteger(row.invoiceId) || row.invoiceId <= 0) return fail(`${line}: número de factura inválido.`);
      if (ids.has(row.invoiceId)) return fail(`${line}: la factura ${row.invoiceId} está repetida.`);
      ids.add(row.invoiceId);
      const amount = String(row.amount).trim();
      if (!AMOUNT.test(amount) || toUnits(amount) <= 0n) return fail(`${line}: monto inválido.`);
      try {
        toUnixSeconds(row.dueDate);
        if (own && dueAt(row.dueDate) === null) throw new Error("fecha");
      } catch {
        return fail(`${line}: fecha inválida.`);
      }
      // Every row follows the form's rules: cents only, up to $10,000, not due in the past.
      const problem = checkInvoice({ ...row, amount }, allowedShops, allowedDrivers);
      if (problem) return fail(`${line}: ${problem}`);
    }
    for (const [index, row] of rows.entries()) {
      if (await chainInvoice(row.invoiceId)) return fail(`Fila ${index + 1}: la factura ${row.invoiceId} ya existe.`);
    }
    for (const row of rows) {
      const { hash } = await run(distributor.id, (client) =>
        client.create_invoice({
          distributor: distributor.address,
          id: BigInt(row.invoiceId),
          shop: directory.find(row.shopId, "shop")!.address,
          driver: directory.find(row.driverId, "driver")!.address,
          amount: toUnits(cleanAmount(String(row.amount))!),
          due: BigInt(own ? dueAt(row.dueDate)! : toUnixSeconds(row.dueDate)),
        }),
      );
      created += 1;
      lastHash = hash;
    }
    scanLater(); // #231: look for anything off once the reply is sent
    const message = created === 1 ? "Listo. Se creó 1 factura." : `Listo. Se crearon ${created} facturas.`;
    return receipt(lastHash, message);
  } catch (error) {
    const result = failure(error);
    if (created === 0) return result;
    return { ...result, message: `Se crearon ${created} de ${rows.length} facturas. ${result.message}` };
  }
}

/** A new invoice from the approved distributor. Throws a Spanish message if it can't. */
/** A demo invoice for one of the demo shops (the trifold's /demo and the demo dashboard). */
export async function createDemoInvoice(): Promise<Invoice> {
  const directory = await getDirectory();
  const distributor = directory.find("distributor", "distributor");
  if (!distributor) throw new Error("Tienda desconocida.");
  let skip = 0n; // ids found taken by someone else (code 1, AlreadyExists)
  for (let attempt = 0; attempt < DEMO_TRIES; attempt++) {
    let id = 0n;
    try {
      await run(distributor.id, async (client) => {
        // Picked inside the distributor's queue so two taps never pick the same id.
        const list = await read(readClient().list_invoices());
        // Step past numbers already used: the list only shows the newest 60 invoices (Jack's review of #164).
        const free = await firstFreeId(nextDemoId(list.map((i) => i.id)) + skip, async (n) => (await chainInvoice(Number(n))) !== null);
        if (free === null) throw new Error(FALLBACK_MESSAGE);
        id = free;
        const shop = DEMO_SHOPS[Number(id % 3n)];
        // A few random seconds so two server instances never build the very same
        // transaction: identical ones share a hash, and both judges would get one invoice.
        const jitter = BigInt(Math.floor(Math.random() * 600));
        const due = BigInt(Math.floor(Date.now() / 1000)) + WEEK_SECS + jitter;
        return client.create_invoice({
          distributor: distributor.address,
          id,
          shop: directory.find(shop, "shop")!.address,
          driver: directory.find(DEMO_DRIVER[shop], "driver")!.address,
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
