"use client";

import { type ReactNode, useState } from "react";
import { BackLink, Card, Chip, Label, LoadError, Loading, Screen } from "@/components/ui";
import { createDemoInvoice, getDrivers, getInvoices, getShop } from "@/lib/api";
import { formatDay, formatMoney } from "@/lib/format";
import { creditPayout, invoiceStatus, METHOD_LABEL, type StatusTone } from "@/lib/labels";
import type { Shop } from "@/lib/types";
import { usePolling } from "@/lib/use-polling";

const STATUS_FILTERS: { label: string; tone?: StatusTone }[] = [
  { label: "Todas" },
  { label: "Pendiente", tone: "due" },
  { label: "Parcial", tone: "part" },
  { label: "Pagada", tone: "paid" },
  { label: "Crédito", tone: "credit" },
];

async function loadDashboard() {
  const [invoices, drivers] = await Promise.all([getInvoices(), getDrivers()]);
  const shopIds = [...new Set(invoices.map((i) => i.shopId))];
  const shops = (await Promise.all(shopIds.map(getShop))).filter((s): s is Shop => s !== null);
  return { invoices, drivers, shops };
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
      <div className="text-2xl font-semibold tabular-nums">{children}</div>
    </Card>
  );
}

export default function Dashboard() {
  const { data, failed, reload } = usePolling("dashboard", loadDashboard);
  const [statusFilter, setStatusFilter] = useState<StatusTone | "all">("all");
  const [driverFilter, setDriverFilter] = useState("all");
  const [creating, setCreating] = useState(false);
  const [newest, setNewest] = useState<number | null>(null);

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

  const { invoices, drivers, shops } = data;
  const shopName = (id: string) => shops.find((s) => s.id === id)?.name ?? id;
  const driverName = (id: string) => drivers.find((d) => d.id === id)?.name ?? id;

  const collected = sum(invoices.filter((i) => i.method === "digital").map((i) => i.paid));
  const onCredit = sum(shops.map((s) => s.creditOwed));
  const overdue = sum(shops.filter((s) => s.overdue).map((s) => s.creditOwed));

  const rows = invoices.filter(
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
          <span className="text-lg">
            {drivers.map((d, index) => (
              <span key={d.id}>
                {index > 0 && " · "}
                <span className="whitespace-nowrap">
                  {d.name} {formatMoney(d.cashHeld)}
                </span>
              </span>
            ))}
          </span>
        </Total>
        <Total label="En crédito">{formatMoney(onCredit)}</Total>
        <Total label="Vencido">
          <span className={overdue > 0 ? "text-bad" : ""}>{formatMoney(overdue)}</span>
        </Total>
      </div>

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
                <tr key={invoice.id} className={invoice.id === newest ? "bg-brand-soft" : ""}>
                  <td className="px-4 py-3 font-medium tabular-nums">{invoice.id}</td>
                  <td className="px-4 py-3">{shopName(invoice.shopId)}</td>
                  <td className="px-4 py-3">{driverName(invoice.driverId)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatMoney(invoice.amount)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatMoney(invoice.paid)}
                    {invoice.method === "credit" && (
                      <span className="block text-sm text-muted">recibió {formatMoney(creditPayout(invoice.paid))}</span>
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
    </Screen>
  );
}
