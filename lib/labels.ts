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

// The credit fee the distributor pays, the same math as the contract's credit_fee_bps (#135):
// 1.50% when the whole invoice goes on credit, sliding to 1.00% when 10% or less does.
export const CREDIT_FEE_BPS = 150;
export const MIN_CREDIT_FEE_BPS = 100;

/** The rate in bps when `credited` of an invoice of `total` goes on credit (any unit, integers). */
export function creditFeeBps(credited: number, total: number): number {
  if (total <= 0 || credited >= total) return CREDIT_FEE_BPS;
  const tenfold = Math.min(Math.max(credited * 10, total), total * 10);
  return MIN_CREDIT_FEE_BPS + Math.floor(((tenfold - total) * (CREDIT_FEE_BPS - MIN_CREDIT_FEE_BPS)) / (total * 9));
}

/**
 * The credit fee in dollars when `credited` dollars of an invoice of `total` go on credit,
 * rounded down in 7-decimal units like the contract ($100 of $100 -> $1.50, $50 of $100 -> $0.61).
 */
export function creditFee(credited: number, total: number): number {
  const units = Math.round(credited * 100) * 100_000;
  const rate = creditFeeBps(Math.round(credited * 100), Math.round(total * 100));
  return Math.floor((units * rate) / 10_000) / 10_000_000;
}

/** "12,50" or "12.5" -> 12.5; null if it isn't a positive amount with at most 2 decimals. */
export function parseAmount(text: string): number | null {
  const clean = text.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  const value = Number(clean);
  return value > 0 ? value : null;
}

/**
 * Why a part payment can't go ahead, or null. A pending cash claim keeps its
 * share of what's left, so the shop can still confirm the cash afterwards.
 */
export function partPayError(text: string, left: number, cashClaim = 0): string | null {
  const amount = parseAmount(text);
  if (amount === null) return "Monto inválido.";
  const cents = (n: number) => Math.round(n * 100);
  if (cents(amount) > cents(left)) return "El monto es mayor que lo pendiente.";
  const room = cents(left) - cents(cashClaim);
  if (cashClaim > 0 && cents(amount) > room) {
    return `Hay $${cashClaim.toFixed(2)} en efectivo por confirmar. Puede pagar hasta $${(room / 100).toFixed(2)}.`;
  }
  return null;
}
