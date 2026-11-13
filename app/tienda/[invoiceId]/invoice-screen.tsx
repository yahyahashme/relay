"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Option, OptionList, Stamp, ThumbBar, Ticket, TicketRow, TicketRule } from "@/components/ticket";
import { BackLink, Button, ButtonLink, Chip, LoadError, Loading, NotFound, ReceiptView, Screen } from "@/components/ui";
import { confirmCash, getDrivers, getInvoice, getShop, payLater, payNow } from "@/lib/api";
import { formatDay, formatMoney } from "@/lib/format";
import { invoiceStatus, leftToPay, METHOD_LABEL, parseAmount, partPayError } from "@/lib/labels";
import type { Invoice, Receipt, Shop } from "@/lib/types";
import { usePolling } from "@/lib/use-polling";

type Action = "now" | "part" | "later" | "cash";


/** Why "Pagar en 7 días" is greyed out, or null if the shop can use it. */
function creditBlocked(shop: Shop | null, invoice: Invoice): string | null {
  if (!shop || shop.creditLimit <= 0) return "Su tienda aún no tiene crédito";
  if (shop.overdue) return "Tiene un pago vencido";
  const owedAfter = Math.round((shop.creditOwed + leftToPay(invoice)) * 100);
  if (owedAfter > Math.round(shop.creditLimit * 100)) return "Supera su límite de crédito";
  return null;
}

export default function InvoiceScreen() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const id = Number(invoiceId);
  const { data, failed, reload } = usePolling(`invoice-${invoiceId}`, async () => {
    const [invoice, drivers] = await Promise.all([getInvoice(id), getDrivers()]);
    const shop = invoice ? await getShop(invoice.shopId) : null;
    return { invoice, shop, drivers };
  });
  const [busy, setBusy] = useState<Action | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [showCash, setShowCash] = useState(false);
  const [showPart, setShowPart] = useState(false);
  const [partText, setPartText] = useState("");
  const [partError, setPartError] = useState<string | null>(null);

  async function run(action: Action, write: () => Promise<Receipt>) {
    setBusy(action);
    setReceipt(null);
    const result = await write();
    if (result.ok) {
      await reload(); // show the receipt and the new status together
      setShowCash(false);
      setShowPart(false);
      setPartText("");
    }
    setReceipt(result);
    setBusy(null);
  }

  if (!data) {
    return (
      <Screen>
        <BackLink />
        {failed ? <LoadError /> : <Loading />}
      </Screen>
    );
  }

  const { invoice, shop, drivers } = data;
  if (!invoice) {
    return (
      <Screen>
        <BackLink />
        <NotFound>No encontramos la factura {invoiceId}.</NotFound>
      </Screen>
    );
  }

  const status = invoiceStatus(invoice);
  const left = leftToPay(invoice);
  const isPaid = invoice.status === "paid";
  const blocked = creditBlocked(shop, invoice);
  const driver = drivers.find((d) => d.id === invoice.driverId);

  const settled = isPaid && receipt?.ok === true; // paid on this visit: let the stamp land
  return (
    <Screen>
      <div className="flex items-center justify-between">
        <BackLink />
        {shop && !isPaid && (
          <Link href={`/tienda/cuenta/${shop.id}`} className="-mr-1 inline-flex min-h-12 items-center px-1 text-base font-medium text-brand">
            Mi cuenta
          </Link>
        )}
      </div>

      {failed && <LoadError />}

      <Ticket>
        <header>
          <h1 className="text-2xl font-bold text-balance">{shop?.name ?? "Tienda"}</h1>
          <p className="text-muted">Factura {invoice.id} · Distribuidora El Sol</p>
        </header>
        <TicketRule />
        {invoice.status === "part_paid" && (
          <div className="flex flex-col gap-1 text-lg">
            <TicketRow label="Total">{formatMoney(invoice.amount)}</TicketRow>
            <TicketRow label="Pagado">−{formatMoney(invoice.paid)}</TicketRow>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <p className="flex items-baseline justify-between gap-3 text-muted">
            <span>{invoice.status === "part_paid" ? "Falta" : "Total"}</span>
            <span>
              {isPaid ? `Pagada${invoice.method ? ` · ${METHOD_LABEL[invoice.method]}` : ""}` : `Vence el ${formatDay(invoice.dueDate)}`}
            </span>
          </p>
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <p className="text-5xl font-bold tracking-tight tabular-nums">{formatMoney(isPaid ? invoice.amount : left)}</p>
            {isPaid ? (
              <Stamp tone={status.tone === "credit" ? "credit" : "paid"} fresh={settled}>
                {status.label}
              </Stamp>
            ) : (
              <Chip tone={status.tone}>{status.label}</Chip>
            )}
          </div>
        </div>
      </Ticket>

      {receipt && <ReceiptView receipt={receipt} />}

      {!isPaid && (
        <>
          <OptionList>
            <Option
              title="Pagar en 7 días"
              hint={blocked ?? "Sin intereses"}
              onClick={() => run("later", () => payLater(id))}
              busy={busy === "later"}
              disabled={busy !== null || blocked !== null}
            />
            <Option title="Pagar otro monto" open={showPart} onClick={() => setShowPart((open) => !open)} disabled={busy !== null}>
              <label className="flex flex-col gap-1 text-lg">
                ¿Cuánto paga ahora? <span className="text-base text-muted">Falta {formatMoney(left)}</span>
                <input
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0.00"
                  autoFocus
                  value={partText}
                  onChange={(e) => {
                    setPartText(e.target.value);
                    setPartError(null);
                  }}
                  className="min-h-14 rounded-xl border-2 border-line bg-card px-3 scroll-mb-28 text-2xl font-semibold tabular-nums placeholder:font-normal placeholder:text-muted focus:border-brand focus:outline-none"
                />
              </label>
              {partError && (
                <p className="font-medium text-bad" role="alert">
                  {partError}
                </p>
              )}
              <Button
                onClick={() => {
                  const error = partPayError(partText, left, invoice.cashClaim);
                  if (error) return setPartError(error);
                  void run("part", () => payNow(id, parseAmount(partText)!));
                }}
                busy={busy === "part"}
                disabled={busy !== null || partText.trim() === ""}
                hint="Con dólares digitales"
              >
                Pagar este monto
              </Button>
            </Option>
            <Option title="Pagué en efectivo" open={showCash} onClick={() => setShowCash((open) => !open)} disabled={busy !== null}>
              {invoice.cashClaim !== undefined ? (
                <>
                  <p className="text-lg">
                    {driver?.name ?? "El motorista"} registró <strong>{formatMoney(invoice.cashClaim)}</strong> en efectivo.
                  </p>
                  <Button
                    variant="secondary"
                    onClick={() => run("cash", () => confirmCash(id, invoice.cashClaim ?? 0))}
                    busy={busy === "cash"}
                    disabled={busy !== null}
                  >
                    Confirmo
                  </Button>
                </>
              ) : (
                <p className="text-lg">El motorista aún no registró el efectivo.</p>
              )}
            </Option>
          </OptionList>

          {!showPart && (
            <ThumbBar>
              <Button
                onClick={() => run("now", () => payNow(id))}
                busy={busy === "now"}
                disabled={busy !== null}
                hint={`${formatMoney(left)} con dólares digitales`}
              >
                Pagar ahora
              </Button>
            </ThumbBar>
          )}
        </>
      )}

      {shop && isPaid && (
        <ButtonLink href={`/tienda/cuenta/${shop.id}`} variant="secondary">
          Mi cuenta
        </ButtonLink>
      )}
    </Screen>
  );
}
