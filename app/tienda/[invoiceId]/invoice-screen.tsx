"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { BackLink, Button, ButtonLink, Card, Chip, LoadError, Loading, NotFound, ReceiptView, Screen } from "@/components/ui";
import { confirmCash, getDrivers, getInvoice, getShop, payLater, payNow } from "@/lib/api";
import { formatDay, formatMoney } from "@/lib/format";
import { invoiceStatus, leftToPay, METHOD_LABEL, parseAmount } from "@/lib/labels";
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
      setShowCash(false);
      setShowPart(false);
      setPartText("");
      await reload(); // show the receipt and the new status together
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

  return (
    <Screen>
      <BackLink />
      <header>
        <h1 className="text-2xl font-bold">{shop?.name ?? "Tienda"}</h1>
        <p className="text-muted">Factura {invoice.id} · Distribuidora El Sol</p>
      </header>

      {failed && <LoadError />}

      <Card className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <p className="text-4xl font-bold tabular-nums">{formatMoney(invoice.amount)}</p>
          <Chip tone={status.tone}>{status.label}</Chip>
        </div>
        {invoice.status === "part_paid" && (
          <p className="text-lg">
            Pagado {formatMoney(invoice.paid)} · <strong>Falta {formatMoney(left)}</strong>
          </p>
        )}
        <p className="text-muted">
          {isPaid ? `Pagada${invoice.method ? ` · ${METHOD_LABEL[invoice.method]}` : ""}` : `Vence el ${formatDay(invoice.dueDate)}`}
        </p>
      </Card>

      {receipt && <ReceiptView receipt={receipt} />}

      {!isPaid && (
        <div className="flex flex-col gap-3">
          <Button onClick={() => run("now", () => payNow(id))} busy={busy === "now"} disabled={busy !== null} hint="Con dólares digitales">
            Pagar ahora
          </Button>
          <button
            type="button"
            onClick={() => setShowPart((open) => !open)}
            disabled={busy !== null}
            className="-mt-1 min-h-12 self-center px-2 text-base font-medium text-brand underline"
          >
            Pagar otro monto
          </button>

          {showPart && (
            <Card className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-lg">
                ¿Cuánto paga ahora? <span className="text-base text-muted">Falta {formatMoney(left)}</span>
                <input
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0.00"
                  value={partText}
                  onChange={(e) => {
                    setPartText(e.target.value);
                    setPartError(null);
                  }}
                  className="min-h-12 rounded-xl border border-line bg-card px-3 text-xl tabular-nums"
                />
              </label>
              {partError && <p className="font-medium text-bad">{partError}</p>}
              <Button
                onClick={() => {
                  const amount = parseAmount(partText);
                  if (amount === null) return setPartError("Monto inválido.");
                  if (Math.round(amount * 100) > Math.round(left * 100)) {
                    return setPartError("El monto es mayor que lo pendiente.");
                  }
                  void run("part", () => payNow(id, amount));
                }}
                busy={busy === "part"}
                disabled={busy !== null || partText.trim() === ""}
                hint="Con dólares digitales"
              >
                Pagar este monto
              </Button>
            </Card>
          )}

          <Button
            variant="secondary"
            onClick={() => run("later", () => payLater(id))}
            busy={busy === "later"}
            disabled={busy !== null || blocked !== null}
            hint={blocked ?? "Sin intereses"}
          >
            Pagar en 7 días
          </Button>
          <Button variant="secondary" onClick={() => setShowCash((open) => !open)} disabled={busy !== null}>
            Pagué en efectivo
          </Button>

          {showCash && (
            <Card className="flex flex-col gap-3">
              {invoice.cashClaim !== undefined ? (
                <>
                  <p className="text-lg">
                    {driver?.name ?? "El motorista"} registró <strong>{formatMoney(invoice.cashClaim)}</strong> en efectivo.
                  </p>
                  <Button onClick={() => run("cash", () => confirmCash(id))} busy={busy === "cash"} disabled={busy !== null}>
                    Confirmo
                  </Button>
                </>
              ) : (
                <p className="text-lg">El motorista aún no registró el efectivo.</p>
              )}
            </Card>
          )}
        </div>
      )}

      {shop && (
        <ButtonLink href={`/tienda/cuenta/${shop.id}`} variant="secondary">
          Mi cuenta
        </ButtonLink>
      )}
    </Screen>
  );
}
