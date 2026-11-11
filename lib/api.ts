// The only data layer pages call. Signatures stay the same with mocks or the
// real contract: only the inside of this file changes.
//
// Mock mode unless NEXT_PUBLIC_USE_MOCKS is "false". Mocks wait 1 second so
// the screens show "Cargando..." like they will on a slow connection.
// Live mode calls the server actions in app/actions.ts (testnet, signed on the server).
// Writes never throw: they return { ok: false, message } in Spanish.

import * as live from "@/app/actions";
import * as mock from "./mock";
import type { Driver, Invoice, InvoiceRow, Pool, Receipt, Shop } from "./types";

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
export const createDemoInvoice = (shopId?: string): Promise<Invoice> =>
  read(() => mock.createDemoInvoice(shopId), () => live.createDemoInvoice(shopId));

// ---------- writes ----------

/** No amount = pay what's left. */
export const payNow = (invoiceId: number, amount?: number) =>
  write(() => mock.payNow(invoiceId, amount), () => live.payNow(invoiceId, amount));
export const payLater = (invoiceId: number) =>
  write(() => mock.payLater(invoiceId), () => live.payLater(invoiceId));
export const claimCash = (invoiceId: number, amount: number) =>
  write(() => mock.claimCash(invoiceId, amount), () => live.claimCash(invoiceId, amount));
export const confirmCash = (invoiceId: number) =>
  write(() => mock.confirmCash(invoiceId), () => live.confirmCash(invoiceId));
export const repay = (shopId: string, amount: number) =>
  write(() => mock.repay(shopId, amount), () => live.repay(shopId, amount));
export const createInvoices = (rows: InvoiceRow[]) => write(() => mock.createInvoices(rows));
