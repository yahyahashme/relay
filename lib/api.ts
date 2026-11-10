// The only data layer pages call. Signatures stay the same when the real
// contract calls arrive (#20, #25): only the inside of this file changes.
//
// Mock mode unless NEXT_PUBLIC_USE_MOCKS is "false". Mocks wait 1 second so
// the screens show "Cargando..." like they will on a slow connection.
// Writes never throw: they return { ok: false, message } in Spanish.

import * as mock from "./mock";
import type { Driver, Invoice, InvoiceRow, Pool, Receipt, Shop } from "./types";

export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";

const MOCK_DELAY_MS = 1000;
const NOT_CONNECTED = "Todavía no está conectado al contrato.";

const wait = () => new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));

async function read<T>(mockRead: () => T): Promise<T> {
  if (!USE_MOCKS) throw new Error(NOT_CONNECTED); // real reads: #20
  await wait();
  return mockRead();
}

async function write(mockWrite: () => Receipt): Promise<Receipt> {
  if (!USE_MOCKS) return { ok: false, message: NOT_CONNECTED }; // real writes: #20, #25
  try {
    await wait();
    return mockWrite();
  } catch {
    return { ok: false, message: "Algo salió mal. Intente de nuevo." };
  }
}

// ---------- reads ----------

export const getInvoices = (): Promise<Invoice[]> => read(mock.getInvoices);
export const getInvoice = (id: number): Promise<Invoice | null> => read(() => mock.getInvoice(id));
export const getShop = (shopId: string): Promise<Shop | null> => read(() => mock.getShop(shopId));
export const getDrivers = (): Promise<Driver[]> => read(mock.getDrivers);
export const getPool = (): Promise<Pool> => read(mock.getPool);
export const createDemoInvoice = (shopId?: string): Promise<Invoice> =>
  read(() => mock.createDemoInvoice(shopId));

// ---------- writes ----------

/** No amount = pay what's left. */
export const payNow = (invoiceId: number, amount?: number) => write(() => mock.payNow(invoiceId, amount));
export const payLater = (invoiceId: number) => write(() => mock.payLater(invoiceId));
export const claimCash = (invoiceId: number, amount: number) => write(() => mock.claimCash(invoiceId, amount));
export const confirmCash = (invoiceId: number) => write(() => mock.confirmCash(invoiceId));
export const repay = (shopId: string, amount: number) => write(() => mock.repay(shopId, amount));
export const createInvoices = (rows: InvoiceRow[]) => write(() => mock.createInvoices(rows));
