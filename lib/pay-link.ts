// "Enviar enlace de pago por WhatsApp" (Yahya, Nov 17): the shop gets its invoice's own payment page, so it can
// pay any day (the last day of its 7 days, say) even when the driver can't come. Any unpaid invoice, not just credit.

import { leftToPay } from "./labels";
import { toUnits } from "./money";
import type { Invoice, PayTarget } from "./types";
import { payLinkMessage } from "./whatsapp";

/** The wa.me link for one unpaid invoice, or null when there is nothing to pay or no target was given. */
export function invoicePayHref(invoice: Invoice, shopName: string, target: PayTarget | undefined, nowMs: number, site?: string): string | null {
  const left = leftToPay(invoice);
  if (!target || invoice.status === "paid" || left <= 0) return null;
  const origin = site || process.env.NEXT_PUBLIC_SITE_URL || (typeof window === "undefined" ? "" : window.location.origin);
  if (!origin) return null;
  try {
    return payLinkMessage({
      to: target.to,
      shopName,
      distributorName: target.distributorName,
      invoiceId: invoice.id,
      amountUnits: toUnits(left.toFixed(2)),
      dueAt: Math.floor(Date.parse(invoice.dueDate) / 1000),
      now: Math.floor(nowMs / 1000),
      link: `${origin}/tienda/${invoice.id}`,
    });
  } catch {
    return null;
  }
}
