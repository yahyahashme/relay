"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BackLink, Button, Card, Chip, Label, LoadError, Loading, NotFound, ReceiptView, Screen } from "@/components/ui";
import { getHistory, getShop, repay } from "@/lib/api";
import { formatDay, formatMoney, plural } from "@/lib/format";
import { invoiceStatus, leftToPay, METHOD_LABEL } from "@/lib/labels";
import type { Receipt } from "@/lib/types";
import { usePolling } from "@/lib/use-polling";

const PAGE_ROWS = 20;

export default function AccountScreen() {
  const { shopId } = useParams<{ shopId: string }>();
  const [shown, setShown] = useState(PAGE_ROWS);
  const [loadingMore, setLoadingMore] = useState(false);
  const { data, failed, reload } = usePolling(`account-${shopId}`, async () => {
    const [shop, history] = await Promise.all([getShop(shopId), getHistory({ shopId }, shown)]);
    return {
      shop,
      unpaid: history.invoices.filter((i) => i.status !== "paid"),
      paid: history.invoices.filter((i) => i.status === "paid"),
      more: history.invoices.length < history.total,
    };
  });
  // "Ver más" grows `shown`; load the bigger page once it has.
  useEffect(() => {
    if (!loadingMore) return;
    void reload().finally(() => setLoadingMore(false));
  }, [shown]); // eslint-disable-line react-hooks/exhaustive-deps
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

  const { shop, unpaid, paid, more } = data;
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

      {paid.length > 0 && (
        <section className="flex flex-col gap-2">
          <Label>Facturas pagadas</Label>
          <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-card">
            {paid.map((invoice) => (
              <li key={invoice.id}>
                <Link
                  href={`/tienda/${invoice.id}`}
                  className="flex min-h-12 items-center justify-between gap-3 px-4 py-2 active:bg-brand-soft"
                >
                  <span className="flex flex-col">
                    <span className="text-lg">Factura {invoice.id}</span>
                    <span className="text-sm text-muted">
                      {invoiceStatus(invoice).label}
                      {invoice.method ? ` · ${METHOD_LABEL[invoice.method]}` : ""}
                    </span>
                  </span>
                  <span className="text-lg font-semibold tabular-nums">{formatMoney(invoice.amount)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {more && (
        <Button
          variant="secondary"
          onClick={() => {
            setLoadingMore(true);
            setShown((n) => n + PAGE_ROWS);
          }}
          busy={loadingMore}
        >
          Ver más facturas
        </Button>
      )}
    </Screen>
  );
}
