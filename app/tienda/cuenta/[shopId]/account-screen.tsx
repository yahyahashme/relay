"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { TapShield, useQuietOnArrival } from "@/components/tap-shield";
import { OptionLink, OptionList, Stamp, ThumbBar, Ticket, TicketRow, TicketRule, reveal } from "@/components/ticket";
import { BackLink, Button, Chip, LoadError, Loading, NotFound, ReceiptView, Screen } from "@/components/ui";
import { getInvoices, getShop, repay } from "@/lib/api";
import { dueOn, formatDay, formatMoney, plural } from "@/lib/format";
import { leftToPay } from "@/lib/labels";
import type { Invoice, Receipt } from "@/lib/types";
import { usePolling } from "@/lib/use-polling";

/** The line under an unpaid invoice: what the shop most needs to know about it. */
function invoiceNote(invoice: Invoice, now: number): string {
  if (invoice.cashClaim !== undefined) return `Efectivo por confirmar: ${formatMoney(invoice.cashClaim)}`;
  if (invoice.status === "part_paid") return `Pagado ${formatMoney(invoice.paid)} de ${formatMoney(invoice.amount)}`;
  return dueOn(invoice.dueDate, now);
}

export default function AccountScreen() {
  const { shopId } = useParams<{ shopId: string }>();
  const { data, failed, stale, reload } = usePolling(`account-${shopId}`, async () => {
    const [shop, invoices] = await Promise.all([getShop(shopId), getInvoices()]);
    return { shop, unpaid: invoices.filter((i) => i.shopId === shopId && i.status !== "paid"), now: Date.now() };
  });
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  // The debt paid on this visit, so the slip can show it stamped and say how the limit moved.
  const [paid, setPaid] = useState<{ amount: number; limit: number; due?: string } | null>(null);
  const [landed, setLanded] = useState(false);
  // "Pagar deuda" pays with one tap, so it waits a beat after it comes on screen: a double tap on the screen before can't pay.
  const arriving = useQuietOnArrival(Boolean(data?.shop && !stale && data.shop.creditOwed > 0));

  // Coming back to this screen is a new visit: the last visit's stamp and message don't carry over.
  if (stale && (paid !== null || receipt !== null)) {
    setPaid(null);
    setReceipt(null);
  }

  // Never show a debt from an earlier visit: wait for today's numbers.
  if (!data || stale) {
    return (
      <Screen>
        <BackLink />
        {failed ? <LoadError /> : <Loading />}
      </Screen>
    );
  }

  const { shop, unpaid, now } = data;
  if (!shop) {
    return (
      <Screen>
        <BackLink />
        <NotFound>No encontramos esa tienda.</NotFound>
      </Screen>
    );
  }

  async function payDebt() {
    if (!shop || busy) return;
    const before = { amount: shop.creditOwed, limit: shop.creditLimit, due: shop.creditDue };
    setBusy(true);
    setReceipt(null);
    const result = await repay(shop.id, before.amount);
    if (result.ok) {
      setPaid(before);
      setLanded(false);
      await reload(); // show the message and the new numbers together
    }
    setReceipt(result);
    setBusy(false);
  }

  const owes = shop.creditOwed > 0;
  const justPaid = paid !== null && !owes;
  const hasCredit = shop.creditLimit > 0;
  const available = Math.max(0, Math.round((shop.creditLimit - shop.creditOwed) * 100) / 100);
  const limitMoved = justPaid ? Math.round((shop.creditLimit - paid.limit) * 100) / 100 : 0;
  const payments = shop.onTime + shop.late;
  // A "paid" message stops being true once the shop has taken new credit (a new due date); an error stays until the next try.
  const owesAgain = owes && paid !== null && shop.creditDue !== paid.due;
  const result = receipt && (!receipt.ok || !owesAgain) ? receipt : null;

  return (
    <Screen>
      <BackLink />

      {failed && <LoadError />}
      <p role="status" className="sr-only">
        {busy ? "Procesando..." : ""}
      </p>
      {busy && <TapShield />}

      <Ticket>
        <header>
          <h1 className="text-2xl font-bold text-balance">{shop.name}</h1>
          <p className="text-muted">Mi cuenta · {shop.owner}</p>
        </header>
        <TicketRule />
        <div className="flex flex-col gap-1">
          <p className="flex items-baseline justify-between gap-3 text-muted">
            <span>{justPaid ? "Deuda" : "Debe"}</span>
            {justPaid && <span>Pagada hoy</span>}
            {owes && shop.creditDue && (
              <span className={shop.overdue ? "font-medium text-bad" : undefined}>
                {shop.overdue ? "Venció" : "Vence"} el {formatDay(shop.creditDue)}
              </span>
            )}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2">
            <p className={`text-5xl font-bold tracking-tight tabular-nums ${justPaid ? "-mr-6" : ""}`}>
              {formatMoney(justPaid ? paid.amount : shop.creditOwed)}
            </p>
            {justPaid && (
              <Stamp tone="paid" fresh={!landed} onLanded={() => setLanded(true)}>
                Pagada
              </Stamp>
            )}
            {shop.overdue && <Chip tone="overdue">Vencido</Chip>}
          </div>
          {!owes && !justPaid && <p className="font-medium text-ok">No tiene deudas pendientes.</p>}
        </div>
        <TicketRule />
        <div className="flex flex-col gap-1 text-lg">
          <TicketRow label="Límite de crédito" strong>
            {formatMoney(shop.creditLimit)}
          </TicketRow>
          {limitMoved !== 0 && (
            <p className={`unfold -mt-1 text-right text-base font-medium ${limitMoved > 0 ? "text-ok" : "text-bad"}`}>
              {limitMoved > 0 ? "Subió" : "Bajó"} {formatMoney(Math.abs(limitMoved))}
            </p>
          )}
          {shop.overdue ? (
            <>
              {/* No sum here: with a late debt the shop can't use what's left, so a dollar figure would mislead. */}
              <p className="flex items-baseline justify-between gap-3">
                <span className="font-semibold">Disponible</span>
                <span className="text-2xl font-bold text-bad">En pausa</span>
              </p>
              <p className="text-base">Pague su deuda para reactivarlo.</p>
            </>
          ) : (
            <>
              {owes && (
                <>
                  <TicketRow label="Menos lo que debe">{formatMoney(shop.creditOwed)}</TicketRow>
                  <hr className="ml-auto w-28 border-0 border-t-2 border-ink" />
                </>
              )}
              <p className="flex items-baseline justify-between gap-3">
                <span className="font-semibold">Disponible</span>
                <span className="text-2xl font-bold tabular-nums">{formatMoney(available)}</span>
              </p>
            </>
          )}
        </div>
      </Ticket>

      {result && (
        <div ref={reveal} className="unfold scroll-mb-28">
          <ReceiptView receipt={result} />
        </div>
      )}

      {unpaid.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-lg font-semibold">Facturas por pagar</h2>
          <OptionList>
            {unpaid.map((invoice) => (
              <OptionLink key={invoice.id} href={`/tienda/${invoice.id}`} title={`Factura ${invoice.id}`} hint={invoiceNote(invoice, now)}>
                <span className="sr-only">Falta </span>
                {formatMoney(leftToPay(invoice))}
              </OptionLink>
            ))}
          </OptionList>
        </section>
      )}

      <section className="flex flex-col gap-1 px-1">
        <h2 className="text-lg font-semibold">Cómo sube su límite</h2>
        {hasCredit ? (
          <>
            <TicketRow label="Si paga su deuda a tiempo">
              <span className="font-semibold text-ok">+$25</span>
            </TicketRow>
            <TicketRow label="Si paga su deuda tarde">
              <span className="font-semibold text-bad">−$25</span>
            </TicketRow>
            <p className="text-muted">
              Sube como máximo una vez cada 7 días, y solo si compró $40 o más con <span className="whitespace-nowrap">«Pagar en 7 días»</span>. El límite máximo es $500.
            </p>
            <p className="text-muted">Sin intereses: paga lo mismo que compró.</p>
          </>
        ) : (
          <p className="text-muted">Su tienda no tiene crédito por ahora.</p>
        )}
        {payments > 0 && (
          <p className="mt-2">
            Lleva {plural(shop.onTime, "pago", "pagos")} a tiempo y {shop.late} tarde.
          </p>
        )}
      </section>

      {(owes || busy) && (
        <ThumbBar>
          <Button
            onClick={payDebt}
            busy={busy}
            arriving={arriving}
            hint={`${formatMoney(owes ? shop.creditOwed : (paid?.amount ?? 0))} con dólares digitales`}
          >
            Pagar deuda
          </Button>
        </ThumbBar>
      )}
      {justPaid && !busy && (
        <ThumbBar>
          {/* Stays where the button was, so a repeat tap lands on nothing instead of on an invoice row. */}
          <p className="flex min-h-14 flex-col items-center justify-center rounded-xl bg-line px-5 py-2 text-center text-lg font-semibold text-muted">
            Deuda pagada
            <span className="text-sm font-normal">{formatMoney(paid.amount)} con dólares digitales</span>
          </p>
        </ThumbBar>
      )}
    </Screen>
  );
}
