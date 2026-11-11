import type { Invoice, PayMethod } from "./types";

export type StatusTone = "due" | "part" | "paid" | "credit";

/** The chip on an invoice: Pendiente, Parcial, Pagada, or Crédito (paid with credit). */
export function invoiceStatus(invoice: Invoice): { label: string; tone: StatusTone } {
  if (invoice.status === "paid") {
    return invoice.method === "credit" ? { label: "Crédito", tone: "credit" } : { label: "Pagada", tone: "paid" };
  }
  return invoice.status === "part_paid" ? { label: "Parcial", tone: "part" } : { label: "Pendiente", tone: "due" };
}

export const METHOD_LABEL: Record<PayMethod, string> = {
  digital: "Digital",
  cash: "Efectivo",
  credit: "Crédito",
  mixed: "Mixto",
};

/** What's still to pay, in dollars, without float leftovers like 0.30000000000000004. */
export function leftToPay(invoice: Invoice): number {
  return Math.round((invoice.amount - invoice.paid) * 100) / 100;
}

const CREDIT_FEE_BPS = 150; // paid by the distributor: 0.75% buffer, 0.50% lenders, 0.25% us

/**
 * What the distributor received for a credit payment of `amount` dollars:
 * amount - 1.5%, rounded down in 7-decimal units like the contract ($100 -> $98.50).
 */
export function creditPayout(amount: number): number {
  const units = Math.round(amount * 100) * 100_000;
  return (units - Math.floor((units * CREDIT_FEE_BPS) / 10_000)) / 10_000_000;
}
