"use client";

import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { BackLink, Button, Card, Chip, Label, LoadError, Loading, NotFound, ReceiptView, Screen } from "@/components/ui";
import { claimCash, getDrivers, getInvoices, getShop } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { invoiceStatus, leftToPay } from "@/lib/labels";
import type { Receipt, Shop } from "@/lib/types";
import { usePolling } from "@/lib/use-polling";

/** Where the QR sends the shop. Local and preview builds have no NEXT_PUBLIC_SITE_URL. */
function invoiceUrl(invoiceId: number) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
  return `${siteUrl}/tienda/${invoiceId}`;
}

export default function RouteScreen() {
  const { driverId } = useParams<{ driverId: string }>();
  const { data, failed, reload } = usePolling(`route-${driverId}`, async () => {
    const [drivers, invoices] = await Promise.all([getDrivers(), getInvoices()]);
    const stops = invoices.filter((i) => i.driverId === driverId);
    const shopIds = [...new Set(stops.map((i) => i.shopId))];
    const shops = (await Promise.all(shopIds.map(getShop))).filter((s): s is Shop => s !== null);
    return { driver: drivers.find((d) => d.id === driverId) ?? null, stops, shops };
  });
  const [open, setOpen] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<{ invoiceId: number; receipt: Receipt } | null>(null);
  const { t } = useI18n();

  if (!data) {
    return (
      <Screen>
        <BackLink />
        {failed ? <LoadError /> : <Loading />}
      </Screen>
    );
  }

  const { driver, stops, shops } = data;
  if (!driver) {
    return (
      <Screen>
        <BackLink />
        <NotFound>{t("No encontramos a ese motorista.")}</NotFound>
      </Screen>
    );
  }

  async function receivedCash(invoiceId: number, amount: number) {
    setBusy(true);
    setReceipt(null);
    const result = await claimCash(invoiceId, amount);
    if (result.ok) await reload();
    setReceipt({ invoiceId, receipt: result });
    setBusy(false);
  }

  const shopName = (shopId: string) => shops.find((s) => s.id === shopId)?.name ?? shopId;
  const pending = stops.filter((i) => i.status !== "paid").length;

  return (
    <Screen>
      <BackLink />
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">{t("Ruta de {name}", { name: driver.name })}</h1>
        <p className="text-muted">
          {t(stops.length === 1 ? "1 parada hoy · {pending} por cobrar" : "{stops} paradas hoy · {pending} por cobrar", { stops: stops.length, pending })}
        </p>
      </header>

      {failed && <LoadError />}

      <Card className="flex items-center justify-between gap-3">
        <Label>{t("Efectivo en mano")}</Label>
        <p className="text-2xl font-semibold tabular-nums">{formatMoney(driver.cashHeld)}</p>
      </Card>

      <ul className="flex flex-col gap-3">
        {stops.map((invoice) => {
          const status = invoiceStatus(invoice);
          const isOpen = open === invoice.id;
          const left = leftToPay(invoice);
          return (
            <li key={invoice.id}>
              <section className={`flex flex-col rounded-2xl border bg-card ${isOpen ? "border-brand" : "border-line"}`}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : invoice.id)}
                  aria-expanded={isOpen}
                  className="flex min-h-12 w-full flex-col gap-2 rounded-2xl p-4 text-left active:bg-brand-soft"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="flex flex-col">
                      <span className="text-lg font-semibold">{shopName(invoice.shopId)}</span>
                      <span className="text-sm text-muted">{t("Factura {id}", { id: invoice.id })}</span>
                    </span>
                    <span className="text-lg font-semibold tabular-nums">{formatMoney(invoice.amount)}</span>
                  </span>
                  <span className="flex flex-wrap gap-2">
                    <Chip tone={status.tone}>{t(status.label)}</Chip>
                    {invoice.cashClaim !== undefined && <Chip tone="cash">{t("Efectivo por confirmar")}</Chip>}
                  </span>
                </button>

                {isOpen && (
                  <div className="flex flex-col items-center gap-3 px-4 pb-4">
                    <div className="rounded-xl bg-white p-2">
                      <QRCodeSVG value={invoiceUrl(invoice.id)} size={280} level="M" title={t("Factura {id}", { id: invoice.id })} />
                    </div>
                    <p className="text-center text-muted">{t("La tienda escanea este código para pagar.")}</p>
                    {receipt?.invoiceId === invoice.id && <ReceiptView receipt={receipt.receipt} />}
                    {invoice.status !== "paid" &&
                      (invoice.cashClaim === undefined ? (
                        <Button onClick={() => receivedCash(invoice.id, left)} busy={busy} hint={formatMoney(left)}>
                          {t("Recibí efectivo")}
                        </Button>
                      ) : (
                        <p className="text-center text-lg">
                          {t("Esperando que la tienda confirme {amount}.", { amount: formatMoney(invoice.cashClaim) })}
                        </p>
                      ))}
                  </div>
                )}
              </section>
            </li>
          );
        })}
      </ul>
    </Screen>
  );
}
