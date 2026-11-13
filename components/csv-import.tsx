"use client";

import { useRef, useState } from "react";
import { Card, ReceiptView } from "@/components/ui";
import { createInvoices } from "@/lib/api";
import { type CsvError, type Known, parseInvoiceCsv } from "@/lib/csv";
import { formatMoney } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { InvoiceRow, Receipt } from "@/lib/types";

// The demo's shops and drivers (the ids in the CSV's shop_id and driver_id columns).
const DEMO = { shops: ["tienda-1", "tienda-2", "tienda-3"], drivers: ["motorista-1", "motorista-2"] };
// Same limit as createInvoices in app/actions.ts: each invoice is its own
// transaction (about 5 s) and the server has 60 s for the whole file.
const MAX_ROWS = 10;

type Parsed = { fileName: string; rows: InvoiceRow[]; errors: CsvError[] };

/** One red row per bad line, with every reason on it. */
function errorLines(errors: CsvError[]): [number, string][] {
  const byLine = new Map<number, string[]>();
  for (const e of errors) byLine.set(e.line, [...(byLine.get(e.line) ?? []), e.message]);
  return [...byLine.entries()].sort(([a], [b]) => a - b).map(([line, messages]) => [line, messages.join(" · ")]);
}

/** "Importar facturas (CSV)" on the distributor dashboard (#32): pick a file, check it, create the good rows. */
export function CsvImport({
  shopName,
  driverName,
  onCreated,
  known,
}: {
  shopName: (id: string) => string;
  driverName: (id: string) => string;
  onCreated: () => Promise<void>;
  /** A real distributor's shops and drivers (#133): the file can use their names. The demo's ids otherwise. */
  known?: { shops: Known[]; drivers: Known[] };
}) {
  const input = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Receipt | null>(null);
  const { t, msg, day } = useI18n();

  async function pick(file: File | undefined) {
    if (!file) return;
    setResult(null);
    const text = await file.text();
    setParsed({ fileName: file.name, ...parseInvoiceCsv(text, known ?? DEMO) });
    if (input.current) input.current.value = ""; // picking the same file again still triggers
  }

  async function create() {
    if (!parsed) return;
    setBusy(true);
    const receipt = await createInvoices(parsed.rows);
    if (receipt.ok) {
      setParsed(null);
      await onCreated();
    }
    setResult(receipt);
    setBusy(false);
  }

  const rows = parsed?.rows ?? [];
  const bad = parsed ? errorLines(parsed.errors) : [];
  const tooMany = rows.length > MAX_ROWS;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="min-h-12 rounded-xl border border-brand px-5 text-lg font-semibold text-brand active:bg-brand-soft disabled:border-line disabled:text-muted"
        >
          {t("Importar facturas (CSV)")}
        </button>
        <input
          ref={input}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(event) => void pick(event.target.files?.[0])}
        />
        <span className="text-sm text-muted">
          {t("Columnas: invoice_id, shop_id, driver_id, amount, due_date")}
          {known && ` · ${t("En tienda y motorista puede poner el nombre.")}`}
          {` · ${t("Hasta {max} facturas por archivo.", { max: MAX_ROWS })}`}
        </span>
      </div>

      {result && <ReceiptView receipt={result} />}

      {parsed && (
        <Card className="flex flex-col gap-3">
          <p className="text-lg">
            <strong>{parsed.fileName}</strong>: {rows.length === 1 ? t("1 factura lista") : t("{count} facturas listas", { count: rows.length })}
            {bad.length > 0 &&
              `, ${bad.length === 1 ? t("1 fila con error (no se crea)") : t("{count} filas con error (no se crean)", { count: bad.length })}`}
            .
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead className="border-b border-line text-sm text-muted">
                <tr>
                  {["Factura", "Tienda", "Motorista", "Monto", "Vence"].map((h) => (
                    <th key={h} scope="col" className={`px-3 py-2 font-semibold ${h === "Monto" ? "text-right" : ""}`}>
                      {t(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((row) => (
                  <tr key={row.invoiceId}>
                    <td className="px-3 py-2 tabular-nums">{row.invoiceId}</td>
                    <td className="px-3 py-2">{shopName(row.shopId)}</td>
                    <td className="px-3 py-2">{driverName(row.driverId)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatMoney(Number(row.amount))}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{day(`${row.dueDate}T06:00:00Z`)}</td>
                  </tr>
                ))}
                {bad.map(([line, reason]) => (
                  <tr key={`bad-${line}`} className="bg-bad-soft text-bad">
                    <td className="px-3 py-2 font-medium" colSpan={5}>
                      {t("Línea {line}: {reason}", { line, reason: reason.split(" · ").map(msg).join(" · ") })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {tooMany && (
            <p className="text-bad">
              {t("Máximo {max} facturas por archivo.", { max: MAX_ROWS })} {t("Cada factura se registra por separado y toma unos segundos. Divida el archivo en partes.")}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void create()}
              disabled={busy || rows.length === 0 || tooMany}
              className="min-h-12 rounded-xl bg-brand px-5 text-lg font-semibold text-white active:bg-brand-dark disabled:bg-line disabled:text-muted"
            >
              {busy ? t("Creando...") : rows.length === 1 ? t("Crear 1 factura") : t("Crear {count} facturas", { count: rows.length })}
            </button>
            <button
              type="button"
              onClick={() => setParsed(null)}
              disabled={busy}
              className="min-h-12 rounded-xl border border-line px-5 text-lg font-semibold text-ink active:bg-brand-soft"
            >
              {t("Cancelar")}
            </button>
          </div>
          {busy && <p className="text-muted">{t("Se crean una por una, unos segundos cada una.")}</p>}
        </Card>
      )}
    </section>
  );
}
