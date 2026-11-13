"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { QUIET_MS, TapShield, useTapShield } from "@/components/tap-shield";
import { Option, OptionList, Stamp, ThumbBar, Ticket, TicketRow, TicketRule } from "@/components/ticket";
import { BackLink, Button, ButtonLink, Chip, LoadError, Loading, NotFound, ReceiptView, Screen } from "@/components/ui";
import { confirmCash, getDrivers, getInvoice, getShop, payLater, payNow } from "@/lib/api";
import { formatDay, formatMoney } from "@/lib/format";
import { invoiceStatus, leftToPay, METHOD_LABEL, parseAmount, partPayError } from "@/lib/labels";
import type { Invoice, Receipt, Shop } from "@/lib/types";
import { usePolling } from "@/lib/use-polling";

type Action = "now" | "part" | "later" | "cash";
type Panel = "later" | "part" | "cash";

/**
 * True for a beat after `value` changes (not on its first value). The pay
 * buttons swap places when a cash amount arrives or a part payment lands, so
 * they stay inert for that beat: a tap aimed at the old button can't hit the new one.
 */
function useQuietAfterChange(value: boolean | null): boolean {
  const [seen, setSeen] = useState<{ value: boolean; quiet: boolean } | null>(null);
  if (value !== null && seen?.value !== value) setSeen({ value, quiet: seen !== null });
  useEffect(() => {
    if (!seen?.quiet) return;
    const timer = setTimeout(() => setSeen((now) => now && { ...now, quiet: false }), QUIET_MS);
    return () => clearTimeout(timer);
  }, [seen]);
  return seen?.quiet ?? false;
}

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
  // Which option is unfolded (one at a time). undefined = the shop hasn't picked yet,
  // so a cash amount the driver registered opens its own panel.
  const [choice, setChoice] = useState<Panel | null | undefined>(undefined);
  const [partText, setPartText] = useState("");
  const [partError, setPartError] = useState<string | null>(null);
  const [landed, setLanded] = useState(false); // the stamp has played; don't replay it on Back
  const { noteTap, settle } = useTapShield();
  const claimJustChanged = useQuietAfterChange(data?.invoice ? data.invoice.cashClaim !== undefined : null);

  async function run(action: Action, write: () => Promise<Receipt>) {
    setBusy(action);
    setReceipt(null);
    const result = await write();
    if (result.ok) {
      await reload(); // show the receipt and the new status together
      setChoice(undefined);
      setPartText("");
    }
    setReceipt(result);
    // The bar comes back where the panel's button was: hold everything until the taps stop, so a repeat tap can't pay the rest.
    if (result.ok && action !== "now") await settle();
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

  const settled = isPaid && (busy !== null || receipt?.ok === true); // paid on this visit: let the stamp land
  const locked = busy !== null || claimJustChanged;
  const hasClaim = invoice.cashClaim !== undefined;
  const partAmount = parseAmount(partText);
  const partOk = partAmount !== null && partPayError(partText, left, invoice.cashClaim) === null;

  let panel: Panel | null = choice === undefined ? (hasClaim ? "cash" : null) : choice;
  if (panel === "later" && blocked !== null) panel = null;
  const toggle = (next: Panel) => setChoice(panel === next ? null : next);
  // A panel with its own button takes over from the bottom bar, so there is one main button at a time.
  const panelHasButton = panel === "later" || panel === "part" || (panel === "cash" && hasClaim);

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
      <p role="status" className="sr-only">
        {busy !== null ? "Procesando..." : ""}
      </p>
      {busy !== null && <TapShield onTap={noteTap} />}

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
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2">
            <p className={`text-5xl font-bold tracking-tight tabular-nums ${isPaid ? "-mr-6" : ""}`}>{formatMoney(isPaid ? invoice.amount : left)}</p>
            {isPaid ? (
              <Stamp tone={status.tone === "credit" ? "credit" : "paid"} fresh={settled && !landed} onLanded={() => setLanded(true)}>
                {status.label}
              </Stamp>
            ) : (
              <Chip tone={status.tone}>{status.label}</Chip>
            )}
          </div>
        </div>
      </Ticket>

      {receipt && (
        <div className="unfold">
          <ReceiptView receipt={receipt} />
        </div>
      )}

      {!isPaid && (
        <>
          <OptionList>
            <Option
              title="Pagar en 7 días"
              hint={blocked ?? "Sin intereses"}
              open={blocked === null ? panel === "later" : undefined}
              onClick={() => toggle("later")}
              disabled={locked || blocked !== null}
            >
              <p className="text-lg">
                Hoy no paga nada. Paga <strong>{formatMoney(left)}</strong> en 7 días.
              </p>
              <Button onClick={() => run("later", () => payLater(id))} busy={busy === "later"} disabled={locked}>
                Confirmo
              </Button>
            </Option>
            <Option title="Pagar otro monto" open={panel === "part"} onClick={() => toggle("part")} disabled={locked}>
              <label className="flex flex-col gap-1 text-lg">
                ¿Cuánto paga ahora? <span className="text-base text-muted">Falta {formatMoney(left)}</span>
                <input
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0.00"
                  autoFocus
                  value={partText}
                  aria-invalid={partError !== null}
                  onChange={(e) => {
                    setPartText(e.target.value);
                    setPartError(null);
                  }}
                  className="min-h-14 scroll-mb-28 rounded-xl border-2 border-line bg-card px-3 text-2xl font-semibold tabular-nums placeholder:font-normal placeholder:text-muted focus:border-brand focus:outline-none aria-invalid:border-bad"
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
                  if (error || partAmount === null) return setPartError(error ?? "Monto inválido.");
                  void run("part", () => payNow(id, partAmount));
                }}
                busy={busy === "part"}
                disabled={locked || partText.trim() === ""}
                hint={partOk ? `${formatMoney(partAmount)} con dólares digitales` : "Con dólares digitales"}
              >
                Pagar este monto
              </Button>
            </Option>
            <Option
              title="Pagué en efectivo"
              hint={hasClaim ? "Efectivo por confirmar" : undefined}
              open={panel === "cash"}
              onClick={() => toggle("cash")}
              disabled={locked}
            >
              {invoice.cashClaim !== undefined ? (
                <>
                  <p className="text-lg">
                    {driver?.name ?? "El motorista"} registró <strong>{formatMoney(invoice.cashClaim)}</strong> en efectivo.
                  </p>
                  <Button onClick={() => run("cash", () => confirmCash(id, invoice.cashClaim ?? 0))} busy={busy === "cash"} disabled={locked}>
                    Confirmo
                  </Button>
                </>
              ) : (
                <p className="text-lg">El motorista aún no registró el efectivo.</p>
              )}
            </Option>
          </OptionList>

          {!panelHasButton && (
            <ThumbBar>
              <Button
                onClick={() => run("now", () => payNow(id))}
                busy={busy === "now"}
                disabled={locked}
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
