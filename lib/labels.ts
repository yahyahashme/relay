import type { Invoice, PayMethod } from "./types";

export type StatusTone = "due" | "part" | "paid" | "credit";

/** The chip label for each tone, in both languages. */
export const STATUS_LABEL: Record<StatusTone, { es: string; en: string }> = {
  due: { es: "Pendiente", en: "Unpaid" },
  part: { es: "Parcial", en: "Part paid" },
  paid: { es: "Pagada", en: "Paid" },
  credit: { es: "Crédito", en: "Credit" },
};

/** The chip on an invoice: Pendiente, Parcial, Pagada, or Crédito (paid with credit). */
export function invoiceStatus(invoice: Invoice, lang: "es" | "en" = "es"): { label: string; tone: StatusTone } {
  const tone: StatusTone =
    invoice.status === "paid" ? (invoice.method === "credit" ? "credit" : "paid") : invoice.status === "part_paid" ? "part" : "due";
  return { label: STATUS_LABEL[tone][lang], tone };
}

const METHODS: Record<PayMethod, { es: string; en: string }> = {
  digital: { es: "Digital", en: "Digital" },
  cash: { es: "Efectivo", en: "Cash" },
  credit: { es: "Crédito", en: "Credit" },
  mixed: { es: "Mixto", en: "Mixed" },
};

/** How an invoice was paid: Digital, Efectivo, Crédito or Mixto. */
export function methodLabel(method: PayMethod, lang: "es" | "en" = "es"): string {
  return METHODS[method][lang];
}

export const METHOD_LABEL: Record<PayMethod, string> = {
  digital: METHODS.digital.es,
  cash: METHODS.cash.es,
  credit: METHODS.credit.es,
  mixed: METHODS.mixed.es,
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
