"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { BackLink, Button, Card, Chip, Label, LoadError, Loading, NotFound, ReceiptView, Screen } from "@/components/ui";
import { getInvoices, getShop, repay } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { leftToPay } from "@/lib/labels";
import type { Receipt } from "@/lib/types";
import { usePolling } from "@/lib/use-polling";

export default function AccountScreen() {
  const { shopId } = useParams<{ shopId: string }>();
  const { data, failed, reload } = usePolling(`account-${shopId}`, async () => {
    const [shop, invoices] = await Promise.all([getShop(shopId), getInvoices()]);
    return { shop, unpaid: invoices.filter((i) => i.shopId === shopId && i.status !== "paid") };
  });
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const { t, day } = useI18n();

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
        <NotFound>{t("No encontramos esa tienda.")}</NotFound>
      </Screen>
    );
  }

  async function payDebt() {
    if (!shop) return;
    setBusy(true);
    setReceipt(null);
    const result = await repay(shop.id, shop.creditOwed);
    if (result.ok) await reload();
    setReceipt(result);
    setBusy(false);
  }

  const owes = shop.creditOwed > 0;
  const available = Math.max(0, Math.round((shop.creditLimit - shop.creditOwed) * 100) / 100);

  return (
    <Screen>
      <BackLink />
      <header>
        <h1 className="text-2xl font-bold">{shop.name}</h1>
        <p className="text-muted">{shop.owner}</p>
      </header>

      {failed && <LoadError />}

      <Card className="flex flex-col gap-3">
        <Label>{t("Debe")}</Label>
        <div className="flex items-start justify-between gap-3">
          <p className="text-4xl font-bold tabular-nums">{formatMoney(shop.creditOwed)}</p>
          {shop.overdue && <Chip tone="overdue">{t("Vencido")}</Chip>}
        </div>
        {owes && shop.creditDue && (
          <p className={shop.overdue ? "font-medium text-bad" : "text-muted"}>
            {t(shop.overdue ? "Venció el {date}" : "Vence el {date}", { date: day(shop.creditDue) })}
          </p>
        )}
        {owes ? (
          <Button onClick={payDebt} busy={busy} hint={t("Con dólares digitales")}>
            {t("Pagar deuda")}
          </Button>
        ) : (
          <p className="text-lg text-muted">{t("No tiene deudas pendientes.")}</p>
        )}
      </Card>

      {receipt && <ReceiptView receipt={receipt} />}

      <Card className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t("Límite de crédito")}</Label>
            <p className="text-2xl font-semibold tabular-nums">{formatMoney(shop.creditLimit)}</p>
          </div>
          <div>
            <Label>{t("Disponible")}</Label>
            <p className="text-2xl font-semibold tabular-nums">{formatMoney(available)}</p>
          </div>
        </div>
        <p className="rounded-xl bg-brand-soft px-3 py-2 text-brand">{t("+$25 por pago a tiempo (uno por semana, compras desde $40), hasta $500. Si paga tarde, baja $25.")}</p>
        <p>
          {t("Historial: {onTime} a tiempo, {late} tarde", {
            onTime: shop.onTime === 1 ? t("1 pago") : t("{count} pagos", { count: shop.onTime }),
            late: shop.late,
          })}
        </p>
      </Card>

      {unpaid.length > 0 && (
        <section className="flex flex-col gap-2">
          <Label>{t("Facturas por pagar")}</Label>
          <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-card">
            {unpaid.map((invoice) => (
              <li key={invoice.id}>
                <Link
                  href={`/tienda/${invoice.id}`}
                  className="flex min-h-12 items-center justify-between gap-3 px-4 py-2 text-lg active:bg-brand-soft"
                >
                  <span>{t("Factura {id}", { id: invoice.id })}</span>
                  <span className="font-semibold tabular-nums">
                    {formatMoney(leftToPay(invoice))} <span aria-hidden className="text-brand">›</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Screen>
  );
}
