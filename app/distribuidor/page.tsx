"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { BackLink, Card, Chip, Label, LoadError, Loading, ReceiptView, Screen } from "@/components/ui";
import { CsvImport } from "@/components/csv-import";
import { createDemoInvoice, getDrivers, getInvoiceHistory, getShop, getTotals, handInCash } from "@/lib/api";
import { DEMO_PHONES, DEMO_SHOP_IDS } from "@/lib/demo-contacts";
import { formatDay, formatMoney } from "@/lib/format";
import { toUnits } from "@/lib/money";
import { reminderLink } from "@/lib/whatsapp";
import { invoiceStatus, METHOD_LABEL, type StatusTone } from "@/lib/labels";
import type { Invoice, Receipt, Shop } from "@/lib/types";
import { usePolling } from "@/lib/use-polling";

const STATUS_FILTERS: { label: string; tone?: StatusTone }[] = [
  { label: "Todas" },
  { label: "Pendiente", tone: "due" },
  { label: "Parcial", tone: "part" },
  { label: "Pagada", tone: "paid" },
  { label: "Crédito", tone: "credit" },
];

/** `pages` pages of history (newest first): every refresh re-reads all of them, so nothing goes stale. */
async function loadDashboard(pages: number) {
  const [history, drivers, totals] = await Promise.all([getInvoiceHistory(pages), getDrivers(), getTotals()]);
  const { invoices, total } = history;
  // Every demo shop, not only those with an invoice on the loaded page: a shop's
  // debt must count in "En crédito" even when its invoices are older.
  const shopIds = [...new Set([...DEMO_SHOP_IDS, ...invoices.map((i) => i.shopId)])];
  const shops = (await Promise.all(shopIds.map(getShop))).filter((s): s is Shop => s !== null);
  return { invoices, total, totals, drivers, shops };
}

const HIGHLIGHT_MS = 4000;

/** WhatsApp link with the reminder ready, or null if the shop has no demo phone. */
function shopReminder(shop: Shop): string | null {
  const phone = DEMO_PHONES[shop.id];
  if (!phone || shop.creditOwed <= 0) return null;
  const site = process.env.NEXT_PUBLIC_SITE_URL || (typeof window === "undefined" ? "" : window.location.origin);
  try {
    return reminderLink({
      phone,
      shopName: shop.name,
      amountUnits: toUnits(shop.creditOwed.toFixed(2)),
      dueAt: shop.creditDue ? Math.floor(Date.parse(shop.creditDue) / 1000) : 0,
      now: Math.floor(Date.now() / 1000),
      link: site ? `${site}/tienda/cuenta/${shop.id}` : undefined,
    });
  } catch {
    return null;
  }
}


/** What a row looks like; when it changes between refreshes, the row lights up. */
const rowKey = (i: Invoice) => `${i.status}|${i.paid}|${i.method ?? ""}|${i.cashClaim ?? ""}`;

/**
 * Ids of invoices that are new or changed since the last refresh, for a few seconds.
 * "New" means newer than anything loaded before: older rows that "Ver más" adds don't light up.
 */
function useChangedRows(invoices: Invoice[] | undefined): Set<number> {
  const seen = useRef<Map<number, string> | null>(null);
  const [changed, setChanged] = useState<Map<number, number>>(new Map());
  useEffect(() => {
    if (!invoices) return;
    const before = seen.current;
    seen.current = new Map(invoices.map((i) => [i.id, rowKey(i)]));
    if (!before) return; // first load: nothing "changed"
    const now = Date.now();
    const newestBefore = Math.max(0, ...before.keys());
    const fresh = invoices
      .filter((i) => (before.has(i.id) ? before.get(i.id) !== rowKey(i) : i.id > newestBefore))
      .map((i) => i.id);
    if (fresh.length === 0) return;
    setChanged((old) => new Map([...old, ...fresh.map((id) => [id, now] as const)]));
  }, [invoices]);
  useEffect(() => {
    if (changed.size === 0) return;
    const timer = setTimeout(
      () => setChanged((old) => new Map([...old].filter(([, at]) => Date.now() - at < HIGHLIGHT_MS))),
      HIGHLIGHT_MS,
    );
    return () => clearTimeout(timer);
  }, [changed]);
  return new Set(changed.keys());
}

const sum = (values: number[]) => Math.round(values.reduce((a, b) => a + b, 0) * 100) / 100;

function Filter({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-12 rounded-full border px-4 font-medium ${
        active ? "border-brand bg-brand text-white" : "border-line bg-card text-ink active:bg-brand-soft"
      }`}
    >
      {children}
    </button>
  );
}

function Total({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Card className="flex flex-col gap-1">
      <Label>{label}</Label>
      <div className="text-2xl font-semibold tabular-nums lg:text-4xl">{children}</div>
    </Card>
  );
}

export default function Dashboard() {
  const [pages, setPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const { data, failed, reload } = usePolling("dashboard", () => loadDashboard(pages));
  const firstPages = useRef(pages);
  useEffect(() => {
    if (pages === firstPages.current) return; // the first load is usePolling's
    firstPages.current = pages;
    setLoadingMore(true);
    void reload().finally(() => setLoadingMore(false));
  }, [pages, reload]);
  const [statusFilter, setStatusFilter] = useState<StatusTone | "all">("all");
  const [driverFilter, setDriverFilter] = useState("all");
  const [creating, setCreating] = useState(false);
  const [newest, setNewest] = useState<number | null>(null);
  const changed = useChangedRows(data?.invoices);
  const [handingIn, setHandingIn] = useState<string | null>(null);
  const [cashReceipt, setCashReceipt] = useState<Receipt | null>(null);

  async function cashHandedIn(driverId: string, amount: number) {
    setHandingIn(driverId);
    setCashReceipt(null);
    const result = await handInCash(driverId, amount);
    if (result.ok) await reload();
    setCashReceipt(result);
    setHandingIn(null);
  }

  async function newDemoInvoice() {
    setCreating(true);
    try {
      const invoice = await createDemoInvoice();
      await reload();
      setNewest(invoice.id);
    } finally {
      setCreating(false);
    }
  }

  const header = (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl font-bold">Distribuidora El Sol</h1>
        <p className="text-muted">Se actualiza cada 5 segundos.</p>
      </div>
      <button
        type="button"
        onClick={newDemoInvoice}
        disabled={creating || !data}
        className="min-h-12 rounded-xl bg-brand px-5 text-lg font-semibold text-white active:bg-brand-dark disabled:bg-line disabled:text-muted"
      >
        {creating ? "Creando..." : "Nueva factura de demo"}
      </button>
    </header>
  );

  if (!data) {
    return (
      <Screen wide>
        <BackLink />
        {header}
        {failed ? <LoadError /> : <Loading />}
      </Screen>
    );
  }

  const { invoices, total, totals, drivers, shops } = data;
  const shopName = (id: string) => shops.find((s) => s.id === id)?.name ?? id;
  const driverName = (id: string) => drivers.find((d) => d.id === id)?.name ?? id;

  const collected = totals.digital; // all history, from the contract's running totals
  const onCredit = sum(shops.map((s) => s.creditOwed));
  const overdue = sum(shops.filter((s) => s.overdue).map((s) => s.creditOwed));
  const owing = shops.filter((s) => s.creditOwed > 0);

  const rows = invoices.filter( // already newest first
    (i) =>
      (statusFilter === "all" || invoiceStatus(i).tone === statusFilter) &&
      (driverFilter === "all" || i.driverId === driverFilter),
  );

  return (
    <Screen wide>
      <BackLink />
      {header}
      {failed && <LoadError />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Total label="Cobrado digital">{formatMoney(collected)}</Total>
        <Total label="Efectivo por motorista">
          <span className="flex flex-col gap-2 text-lg">
            {drivers.map((d) => (
              <span key={d.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <span className="whitespace-nowrap">
                  {d.name} {formatMoney(d.cashHeld)}
                </span>
                {d.cashHeld > 0 && (
                  <button
                    type="button"
                    onClick={() => cashHandedIn(d.id, d.cashHeld)}
                    disabled={handingIn !== null}
                    className="min-h-12 rounded-xl border border-brand px-3 text-base font-semibold text-brand active:bg-brand-soft disabled:border-line disabled:text-muted"
                  >
                    {handingIn === d.id ? "Guardando..." : "Marcar efectivo entregado"}
                  </button>
                )}
              </span>
            ))}
          </span>
        </Total>
        <Total label="En crédito">{formatMoney(onCredit)}</Total>
        <Total label="Vencido">
          <span className={overdue > 0 ? "text-bad" : ""}>{formatMoney(overdue)}</span>
        </Total>
      </div>

      {cashReceipt && <ReceiptView receipt={cashReceipt} />}

      {owing.length > 0 && (
        <section className="flex flex-col gap-3">
          <Label>Tiendas con deuda</Label>
          <ul className="flex flex-col gap-3">
            {owing.map((shop) => {
              const href = shopReminder(shop);
              return (
                <li key={shop.id}>
                  <Card className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-col">
                      <span className="text-lg font-semibold">{shop.name}</span>
                      <span className={shop.overdue ? "font-medium text-bad" : "text-muted"}>
                        Debe {formatMoney(shop.creditOwed)}
                        {shop.creditDue ? ` · ${shop.overdue ? "venció" : "vence"} el ${formatDay(shop.creditDue)}` : ""}
                      </span>
                    </div>
                    {href && (
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="flex min-h-12 items-center rounded-xl border border-brand px-4 text-base font-semibold text-brand active:bg-brand-soft"
                      >
                        Recordar por WhatsApp
                      </a>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
          <p className="text-sm text-muted">Demo: los números son de prueba. Revise el mensaje, pero no lo envíe.</p>
        </section>
      )}

      <CsvImport shopName={shopName} driverName={driverName} onCreated={reload} />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Label>Estado</Label>
          {STATUS_FILTERS.map((f) => (
            <Filter key={f.label} active={statusFilter === (f.tone ?? "all")} onClick={() => setStatusFilter(f.tone ?? "all")}>
              {f.label}
            </Filter>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Label>Motorista</Label>
          <Filter active={driverFilter === "all"} onClick={() => setDriverFilter("all")}>
            Todos
          </Filter>
          {drivers.map((d) => (
            <Filter key={d.id} active={driverFilter === d.id} onClick={() => setDriverFilter(d.id)}>
              {d.name}
            </Filter>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="w-full min-w-[760px] text-left">
          <thead className="border-b border-line text-sm text-muted">
            <tr>
              {["Factura", "Tienda", "Motorista", "Monto", "Pagado", "Estado", "Método", "Vence"].map((h) => (
                <th key={h} scope="col" className={`px-4 py-3 font-semibold ${h === "Monto" || h === "Pagado" ? "text-right" : ""}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((invoice) => {
              const status = invoiceStatus(invoice);
              return (
                <tr
                  key={invoice.id}
                  className={`transition-colors duration-700 lg:text-lg ${invoice.id === newest || changed.has(invoice.id) ? "bg-brand-soft" : ""}`}
                >
                  <td className="px-4 py-3 font-medium tabular-nums">{invoice.id}</td>
                  <td className="px-4 py-3">{shopName(invoice.shopId)}</td>
                  <td className="px-4 py-3">{driverName(invoice.driverId)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatMoney(invoice.amount)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatMoney(invoice.paid)}
                    {invoice.creditFee !== undefined && (
                      <span className="block text-sm text-muted">comisión de crédito {formatMoney(invoice.creditFee)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex flex-wrap gap-1">
                      <Chip tone={status.tone}>{status.label}</Chip>
                      {invoice.cashClaim !== undefined && <Chip tone="cash">Efectivo por confirmar</Chip>}
                    </span>
                  </td>
                  <td className="px-4 py-3">{invoice.method ? METHOD_LABEL[invoice.method] : "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDay(invoice.dueDate)}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-muted">
                  No hay facturas con este filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col items-center gap-3">
        <p className="text-muted">
          Mostrando las {invoices.length} facturas más recientes de {total}.
        </p>
        {invoices.length < total && (
          <button
            type="button"
            onClick={() => setPages((p) => p + 1)}
            disabled={loadingMore}
            className="min-h-12 rounded-xl border border-brand px-5 text-lg font-semibold text-brand active:bg-brand-soft disabled:border-line disabled:text-muted"
          >
            {loadingMore ? "Cargando..." : "Ver más"}
          </button>
        )}
      </div>
    </Screen>
  );
}
