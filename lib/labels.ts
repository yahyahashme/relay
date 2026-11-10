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
