// The only data layer pages call. Signatures stay the same with mocks or the
// real contract: only the inside of this file changes.
//
// Mock mode unless NEXT_PUBLIC_USE_MOCKS is "false". Mocks wait 1 second so
// the screens show "Cargando..." like they will on a slow connection.
// Live mode calls the server actions in app/actions.ts (testnet, signed on the server).
// Writes never throw: they return { ok: false, message } in Spanish.

import * as live from "@/app/actions";
import * as distributors from "@/app/distributor-actions";
import * as shops from "@/app/shop-actions";
import * as invoices from "@/app/invoice-actions";
import * as recourse from "@/app/recourse-actions";
import * as confirm from "@/app/confirm-actions";
import * as lenders from "@/app/lender-actions";
import * as secondChance from "@/app/second-chance-actions";
import type { AppealInput } from "./second-chance";
import type { LenderHistory } from "./lender-history";
import { type ConfirmFinish, type ConfirmProof, type ConfirmRequest, type ConfirmStart, DEMO_PIN } from "./pay-confirm";
import type { DistributorView } from "@/app/distributor-actions";
import * as mock from "./mock";
import type { Driver, Invoice, LenderView, MyLender, InvoiceHistory, InvoiceRow, Pool, PoolHealth, Profile, Receipt, RecourseView, Shop, ShopHistory, Supplier, Totals } from "./types";

export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";

const MOCK_DELAY_MS = 1000;
const NOT_CONNECTED = "Todavía no está conectado al contrato.";

const wait = () => new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));

async function read<T>(mockRead: () => T, liveRead?: () => Promise<T>): Promise<T> {
  if (!USE_MOCKS) {
    if (!liveRead) throw new Error(NOT_CONNECTED);
    return liveRead();
  }
  await wait();
  return mockRead();
}

async function write(mockWrite: () => Receipt, liveWrite?: () => Promise<Receipt>): Promise<Receipt> {
  try {
    if (!USE_MOCKS) return liveWrite ? await liveWrite() : { ok: false, message: NOT_CONNECTED }; // not wired yet: CSV import (#32)
    await wait();
    return mockWrite();
  } catch {
    return { ok: false, message: "Algo salió mal. Intente de nuevo." };
  }
}

// ---------- reads ----------

export const getInvoices = (): Promise<Invoice[]> => read(mock.getInvoices, live.getInvoices);
export const getInvoice = (id: number): Promise<Invoice | null> =>
  read(() => mock.getInvoice(id), () => live.getInvoice(id));
export const getShop = (shopId: string): Promise<Shop | null> =>
  read(() => mock.getShop(shopId), () => live.getShop(shopId));
export const getDrivers = (): Promise<Driver[]> => read(mock.getDrivers, live.getDrivers);
export const getPool = (): Promise<Pool> => read(mock.getPool, live.getPool);
/** The demo lender's place in the pool: what it put in and what that is worth now. */
export const getLender = (): Promise<LenderView> => read(mock.getLender, live.getLender);
/** The signed-in lender's own place in the pool (#207), or null (the page shows the public demo). */
/** A lender's own movements (#224): the signed-in lender's (`mine`), or the demo lender's. */
export const getLenderHistory = (mine: boolean): Promise<LenderHistory | null> =>
  read(() => mock.getLenderHistory(mine), () => lenders.getLenderHistory(mine));
export const getMyLender = (): Promise<MyLender | null> =>
  read(() => mock.getMyLender(typeof window !== "undefined" && new URLSearchParams(window.location.search).get("prestamista") === "demo"), lenders.getMyLender);
/** The whole history a page at a time: `pages` pages, newest first. */
export const getInvoiceHistory = (pages: number): Promise<InvoiceHistory> =>
  read(() => mock.getInvoiceHistory(pages), () => live.getInvoiceHistory(pages));
/** The distributor dashboard for whoever is looking: their own business once approved (#130), else the demo. */
export const getDistributorView = (pages: number): Promise<DistributorView> =>
  read(() => mock.getDistributorView(pages), () => distributors.getDistributorView(pages));
/** Notes / products on these invoices (#133); the demo's have none. */
/** How each stop was paid (#235): digital, cash, credit. */
export const getStopPayments = (ids: number[]) => read(() => mock.getStopPayments(ids), () => live.getStopPayments(ids));
export const getInvoiceNotes = (ids: number[]) => read(() => ({}) as Record<number, string>, () => invoices.getInvoiceNotes(ids));
/** Who sent an invoice, and its note (#133). The demo's come from Distribuidora El Sol. */
export const getInvoiceSource = (id: number) =>
  read(() => ({ distributorName: "Distribuidora El Sol", note: null as string | null }), () => invoices.getInvoiceSource(id));
/** Claim codes for the stops on a route, shown only to that driver or their distributor (#132). */
export const getRouteInvites = (driverId: string, shopIds: string[]) =>
  read(() => ({ distributorName: "", codes: {} as Record<string, string> }), () => shops.getRouteInvites(driverId, shopIds));
/** The distributor's recourse deposit and the vouched credit it backs (#185). */
export const getRecourse = (): Promise<RecourseView> => read(mock.getRecourse, recourse.getRecourse);
/** Pool-level numbers for lenders (#220). */
export const getPoolHealth = (): Promise<PoolHealth> => read(mock.getPoolHealth, live.getPoolHealth);
/** Everything ever paid, by method, for the dashboard's totals. */
export const getTotals = (): Promise<Totals> => read(mock.getTotals, live.getTotals);
/** Every payment the shop made, and what it still owes, newest first (#136). */
export const getShopHistory = (shopId: string): Promise<ShopHistory | null> =>
  read(() => mock.getShopHistory(shopId), () => live.getShopHistory(shopId));
/** The shop's dollars digitales on hand. */
export const getBalance = (shopId: string): Promise<number | null> =>
  read(() => mock.getBalance(shopId), () => live.getBalance(shopId));
export const getSuppliers = (shopId: string): Promise<Supplier[]> =>
  read(() => mock.getSuppliers(shopId), () => live.getSuppliers(shopId));
// The shop's details aren't on chain. Until accounts (#129) they stay with the demo data in both modes.
export const getProfile = (shopId: string): Promise<Profile | null> => read(() => mock.getProfile(shopId), async () => mock.getProfile(shopId));
export const saveProfile = (shopId: string, profile: Profile) =>
  write(() => mock.saveProfile(shopId, profile), async () => mock.saveProfile(shopId, profile));
export const createDemoInvoice = (shopId?: string): Promise<Invoice> =>
  read(() => mock.createDemoInvoice(shopId), () => live.createDemoInvoice());

// ---------- writes ----------

// Every write that moves the shop's money takes `confirmId`: the confirmation the owner just gave
// with Face ID, fingerprint or PIN (components/pay-confirm.tsx). The server refuses without it.

/** A tap on a pay button: what the confirm sheet needs. Mock mode has no server, so it asks for the demo PIN. */
export async function startPayConfirm(request: ConfirmRequest): Promise<ConfirmStart> {
  if (!USE_MOCKS) return confirm.startPayConfirm(request).catch(() => ({ ok: false as const, message: "Algo salió mal. Intente de nuevo." }));
  return { ok: true, id: "demo", shopId: request.shopId ?? request.lenderId ?? "", mode: "demo", hasPin: true };
}
export async function finishPayConfirm(id: string, shopId: string, proof: ConfirmProof): Promise<ConfirmFinish> {
  if (!USE_MOCKS) return confirm.finishPayConfirm(id, shopId, proof).catch(() => ({ ok: false as const, message: "Algo salió mal. Intente de nuevo." }));
  return proof.kind === "pin" && proof.pin === DEMO_PIN ? { ok: true } : { ok: false, message: "PIN incorrecto.", again: true };
}

/** No amount = pay what's left. */
export const payNow = (invoiceId: number, amount?: number, confirmId?: string) =>
  write(() => mock.payNow(invoiceId, amount), () => live.payNow(invoiceId, amount, confirmId));
export const payLater = (invoiceId: number, confirmId?: string) =>
  write(() => mock.payLater(invoiceId), () => live.payLater(invoiceId, confirmId));
export const claimCash = (invoiceId: number, amount: number) =>
  write(() => mock.claimCash(invoiceId, amount), () => live.claimCash(invoiceId, amount));
/** `amount` is the claim the shop saw: if the driver changed it since, nothing happens. */
export const confirmCash = (invoiceId: number, amount: number, confirmId?: string) =>
  write(() => mock.confirmCash(invoiceId, amount), () => live.confirmCash(invoiceId, amount, confirmId));
/** Split at the door (#235): `amount` now (digital, or `cash` = the driver's claim), the rest on 7 days. */
export const payPartLater = (invoiceId: number, amount: number, cash: boolean, confirmId?: string) =>
  write(() => mock.payPartLater(invoiceId, amount, cash), () => live.payPartLater(invoiceId, amount, cash, confirmId));
export const repay = (shopId: string, amount: number, confirmId?: string) =>
  write(() => mock.repay(shopId, amount), () => live.repay(shopId, amount, confirmId));
/** The distributor got a driver's cash at the warehouse (only lowers the driver's cash count). */
export const handInCash = (driverId: string, amount: number) =>
  write(() => mock.handInCash(driverId, amount), () => live.handInCash(driverId, amount));
/** CSV import (#32): checks every row, then creates them one by one. */
export const createInvoices = (rows: InvoiceRow[]) =>
  write(() => mock.createInvoices(rows), () => live.createInvoices(rows));
/** The distributor vouches for a shop (0.25% credit fee, its deposit covers late payers), or stops (#185). */
export const vouchShop = (shopId: string, on: boolean) =>
  write(() => mock.vouchShop(shopId, on), () => recourse.vouchShop(shopId, on));
/** A shop whose credit stopped after a default asks Relay for a second chance at $50 (reviewed in /admin). */
export const sendAppeal = (shopId: string, answers: AppealInput) =>
  write(() => mock.sendAppeal(shopId), () => secondChance.sendAppeal(shopId, answers));
/** The distributor gives a shop the 7 days itself (no credit fee, it waits and carries the risk), or goes back to the pool (#194). */
export const offerOwnCredit = (shopId: string, on: boolean) =>
  write(() => mock.offerOwnCredit(shopId, on), () => recourse.offerOwnCredit(shopId, on));
export const getOwnCredit = (shopId: string): Promise<boolean> =>
  read(() => mock.getOwnCredit(shopId), () => recourse.getOwnCredit(shopId));
export const depositRecourse = (amount: number) =>
  write(() => mock.depositRecourse(amount), () => recourse.depositRecourse(amount));
export const withdrawRecourse = (amount: number) =>
  write(() => mock.withdrawRecourse(amount), () => recourse.withdrawRecourse(amount));
/** A lender puts money in the pool from its own account (#207). */
export const lenderDeposit = (lenderId: string, amount: number, confirmId?: string) =>
  write(() => mock.lenderDeposit(amount), () => lenders.lenderDeposit(lenderId, amount, confirmId));
/** A lender takes money out: an amount, or "all" (exactly its shares). */
export const lenderWithdraw = (lenderId: string, amount: number | "all", confirmId?: string) =>
  write(() => mock.lenderWithdraw(amount), () => lenders.lenderWithdraw(lenderId, amount, confirmId));
