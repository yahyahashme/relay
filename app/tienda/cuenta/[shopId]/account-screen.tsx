"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { TapShield, useTapShield } from "@/components/tap-shield";
import { OptionLink, OptionList, Stamp, ThumbBar, Ticket, TicketRow, TicketRule, reveal } from "@/components/ticket";
import { BackLink, Button, Chip, LoadError, Loading, NotFound, ReceiptView, Screen } from "@/components/ui";
import { getInvoices, getShop, repay } from "@/lib/api";
import { formatDay, formatMoney, plural } from "@/lib/format";
import { leftToPay } from "@/lib/labels";
import type { Invoice, Receipt } from "@/lib/types";
import { usePolling } from "@/lib/use-polling";

/** The line under an unpaid invoice: what the shop most needs to know about it. */
function invoiceNote(invoice: Invoice): string {
  if (invoice.cashClaim !== undefined) return "Efectivo por confirmar";
  if (invoice.status === "part_paid") return `Pagado ${formatMoney(invoice.paid)} de ${formatMoney(invoice.amount)}`;
  return `Vence el ${formatDay(invoice.dueDate)}`;
}

export default function AccountScreen() {
  const { shopId } = useParams<{ shopId: string }>();
  const { data, failed, reload } = usePolling(`account-${shopId}`, async () => {
    const [shop, invoices] = await Promise.all([getShop(shopId), getInvoices()]);
    return { shop, unpaid: invoices.filter((i) => i.shopId === shopId && i.status !== "paid") };
  });
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  // The debt paid on this visit, so the slip can show it stamped and say how the limit moved.
  const [paid, setPaid] = useState<{ amount: number; limit: number } | null>(null);
  const [landed, setLanded] = useState(false);
  const { noteTap, settle } = useTapShield();

  if (!data) {
    return (
      <Screen>
        <BackLink />
        {failed ? <LoadError /> : <Loading />}
      </Screen>
    );
  }

  const { shop, unpaid } = data;
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
    const before = { amount: shop.creditOwed, limit: shop.creditLimit };
    setBusy(true);
    setReceipt(null);
    const result = await repay(shop.id, before.amount);
    if (result.ok) {
      setPaid(before);
      setLanded(false);
      await reload();
    }
    setReceipt(result);
    // Hold the button in place until the taps stop, so a repeat tap can't open the invoice row behind it.
    if (result.ok) await settle();
    setBusy(false);
  }

  const owes = shop.creditOwed > 0;
  const justPaid = paid !== null && !owes;
  const available = Math.max(0, Math.round((shop.creditLimit - shop.creditOwed) * 100) / 100);
  const limitMoved = justPaid ? Math.round((shop.creditLimit - paid.limit) * 100) / 100 : 0;
  const payments = shop.onTime + shop.late;
  // A "paid" message stops being true once the shop owes again; an error stays until the next try.
  const result = receipt && (!receipt.ok || justPaid) ? receipt : null;

  return (
    <Screen>
      <BackLink />

      {failed && <LoadError />}
      <p role="status" className="sr-only">
        {busy ? "Procesando..." : ""}
      </p>
      {busy && <TapShield onTap={noteTap} />}

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
          {owes && (
            <>
              <TicketRow label="Menos lo que debe">−{formatMoney(shop.creditOwed)}</TicketRow>
              <hr className="ml-auto w-28 border-0 border-t-2 border-ink" />
            </>
          )}
          <p className={`flex items-baseline justify-between gap-3 ${shop.overdue ? "text-muted" : ""}`}>
            <span className="font-semibold">Disponible</span>
            <span className="text-2xl font-bold tabular-nums">{formatMoney(available)}</span>
          </p>
          {shop.overdue && <p className="text-base font-medium text-bad">Pague su deuda para volver a usar Pagar en 7 días.</p>}
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
              <OptionLink key={invoice.id} href={`/tienda/${invoice.id}`} title={`Factura ${invoice.id}`} hint={invoiceNote(invoice)}>
                {formatMoney(leftToPay(invoice))}
              </OptionLink>
            ))}
          </OptionList>
        </section>
      )}

      <section className="flex flex-col gap-1 px-1">
        <h2 className="text-lg font-semibold">Cómo sube su límite</h2>
        <TicketRow label="Cada pago a tiempo">
          <span className="font-semibold text-ok">+$25</span>
        </TicketRow>
        <TicketRow label="Cada pago tarde">
          <span className="font-semibold text-bad">−$25</span>
        </TicketRow>
        <p className="text-muted">Sube una vez por semana, con compras desde $40, hasta $500.</p>
        <p className="text-muted">Sin intereses: paga lo mismo que compró.</p>
        {payments > 0 && (
          <p className="mt-2">
            Lleva {plural(shop.onTime, "pago", "pagos")} a tiempo y {shop.late} tarde.
          </p>
        )}
      </section>

      {(owes || busy) && (
        <ThumbBar>
          <Button onClick={payDebt} busy={busy} hint={`${formatMoney(owes ? shop.creditOwed : (paid?.amount ?? 0))} con dólares digitales`}>
            Pagar deuda
          </Button>
        </ThumbBar>
      )}
    </Screen>
  );
}
