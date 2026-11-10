"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { BackLink, Button, Card, Chip, Label, LoadError, Loading, NotFound, ReceiptView, Screen } from "@/components/ui";
import { getInvoices, getShop, repay } from "@/lib/api";
import { formatDay, formatMoney, plural } from "@/lib/format";
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
        <Label>Debe</Label>
        <div className="flex items-start justify-between gap-3">
          <p className="text-4xl font-bold tabular-nums">{formatMoney(shop.creditOwed)}</p>
          {shop.overdue && <Chip tone="overdue">Vencido</Chip>}
        </div>
        {owes && shop.creditDue && (
          <p className={shop.overdue ? "font-medium text-bad" : "text-muted"}>
            {shop.overdue ? "Venció" : "Vence"} el {formatDay(shop.creditDue)}
          </p>
        )}
        {owes ? (
          <Button onClick={payDebt} busy={busy} hint="Con dólares digitales">
            Pagar deuda
          </Button>
        ) : (
          <p className="text-lg text-muted">No tiene deudas pendientes.</p>
        )}
      </Card>

      {receipt && <ReceiptView receipt={receipt} />}

      <Card className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Límite de crédito</Label>
            <p className="text-2xl font-semibold tabular-nums">{formatMoney(shop.creditLimit)}</p>
          </div>
          <div>
            <Label>Disponible</Label>
            <p className="text-2xl font-semibold tabular-nums">{formatMoney(available)}</p>
          </div>
        </div>
        <p className="rounded-xl bg-brand-soft px-3 py-2 text-brand">+$25 por pago a tiempo (uno por semana, compras desde $40), hasta $500. Si paga tarde, baja $25.</p>
        <p>
          Historial: {plural(shop.onTime, "pago", "pagos")} a tiempo, {shop.late} tarde
        </p>
      </Card>

      {unpaid.length > 0 && (
        <section className="flex flex-col gap-2">
          <Label>Facturas por pagar</Label>
          <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-card">
            {unpaid.map((invoice) => (
              <li key={invoice.id}>
                <Link
                  href={`/tienda/${invoice.id}`}
                  className="flex min-h-12 items-center justify-between gap-3 px-4 py-2 text-lg active:bg-brand-soft"
                >
                  <span>Factura {invoice.id}</span>
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
