"use client";

import { type CSSProperties, Fragment, type ReactNode, useState } from "react";
import { useT } from "@/lib/i18n";
import { Chevron } from "./icons";
import { Money, moneyWidth } from "./money";

// El libro mayor: the distributor's ledger. Ruled columns, right-aligned mono figures,
// totals under a double rule. With less than 60 rem of room it keeps its priority columns
// and folds the rest into each row; below 40 rem each row becomes a ledger card.
// It never scrolls sideways.

export type LedgerColumn<Row> = {
  id: string;
  header: ReactNode;
  /** A figure column: right-aligned mono between vertical rules, like the money columns of a ledger. */
  figure?: boolean;
  /** Mono (invoice numbers, dates). */
  mono?: boolean;
  /** Right-aligned without the rules (dates). */
  end?: boolean;
  /** Not a priority column: with less than 60 rem of room it moves into the row's fold. */
  secondary?: boolean;
  cell: (row: Row) => ReactNode;
  /** The total under this column, if the ledger has a totals row. */
  total?: ReactNode;
  /** Extra classes for this column's cells (width, wrapping). */
  className?: string;
};

export function Ledger<Row>({
  label,
  columns,
  rows,
  rowKey,
  rowName,
  card,
  actions,
  empty,
  rowClassName,
}: {
  /** What this ledger lists, for screen readers. */
  label: string;
  columns: LedgerColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string | number;
  /** What to call a row out loud ("factura 1010"), for the fold button. */
  rowName?: (row: Row) => string;
  /** The same row as a card, for phones: name and amount first, stamp and date second, actions last. */
  card: (row: Row) => ReactNode;
  /** Blue controls at the end of a row. With a mouse they show on hover or focus; on touch they always show. */
  actions?: (row: Row) => ReactNode;
  /** One plain sentence (plus the next action) for when there are no rows. */
  empty?: ReactNode;
  rowClassName?: (row: Row) => string;
}) {
  const { t } = useT();
  const [open, setOpen] = useState<ReadonlySet<string | number>>(new Set());
  const toggle = (key: string | number) =>
    setOpen((now) => {
      const next = new Set(now);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  const hasTotals = columns.some((column) => column.total !== undefined);
  const folded = columns.filter((column) => column.secondary);
  const place = (column: LedgerColumn<Row>) =>
    `${column.figure ? "border-x border-paper-rule text-right font-mono font-medium" : column.end ? "text-right" : "text-left"} ${column.mono ? "font-mono font-medium" : ""} ${
      column.secondary ? "hidden @min-[60rem]:table-cell" : ""
    }`;

  if (rows.length === 0 && empty) return <div className="rounded-paper bg-paper px-4 py-6">{empty}</div>;
  return (
    <div className="@container">
      <table className="hidden w-full border-collapse rounded-paper bg-paper @min-[40rem]:table">
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr className="border-b border-ink">
            {columns.map((column) => (
              <th key={column.id} scope="col" className={`h-10 px-3 text-label font-semibold uppercase tracking-[0.08em] whitespace-nowrap text-muted ${place(column)} font-sans`}>
                {column.header}
              </th>
            ))}
            {actions && (
              <th scope="col" className="w-0 px-3">
                <span className="sr-only">{t("Acciones", "Actions")}</span>
              </th>
            )}
            {folded.length > 0 && (
              <th scope="col" className="w-0 @min-[60rem]:hidden">
                <span className="sr-only">{t("Más", "More")}</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = rowKey(row);
            const isOpen = open.has(key);
            return (
              <Fragment key={key}>
                <tr className={`group border-b border-paper-rule ${rowClassName?.(row) ?? ""}`}>
                  {columns.map((column) => (
                    <td key={column.id} className={`h-11 px-3 py-1 text-base ${place(column)} ${column.className ?? ""}`}>
                      {column.cell(row)}
                    </td>
                  ))}
                  {actions && (
                    <td className="h-11 px-2 py-0 text-right whitespace-nowrap pointer-fine:opacity-0 pointer-fine:group-focus-within:opacity-100 pointer-fine:group-hover:opacity-100">
                      {actions(row)}
                    </td>
                  )}
                  {folded.length > 0 && (
                    <td className="h-11 p-0 text-right @min-[60rem]:hidden">
                      <button
                        type="button"
                        onClick={() => toggle(key)}
                        aria-expanded={isOpen}
                        aria-label={t(`Ver más de ${rowName?.(row) ?? key}`, `See more of ${rowName?.(row) ?? key}`)}
                        className="inline-flex size-11 items-center justify-center text-brand -outline-offset-3"
                      >
                        <Chevron open={isOpen} />
                      </button>
                    </td>
                  )}
                </tr>
                {isOpen && folded.length > 0 && (
                  <tr className="border-b border-paper-rule @min-[60rem]:hidden">
                    <td colSpan={columns.length + (actions ? 2 : 1)} className="px-3 pb-3 pt-1">
                      <dl className="flex flex-wrap gap-x-8 gap-y-1">
                        {folded.map((column) => (
                          <div key={column.id} className="flex items-baseline gap-2">
                            <dt className="text-label font-semibold uppercase tracking-[0.08em] text-muted">{column.header}</dt>
                            <dd className={column.figure || column.mono ? "font-mono font-medium" : ""}>{column.cell(row)}</dd>
                          </div>
                        ))}
                      </dl>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
        {hasTotals && (
          <tfoot>
            <tr className="border-t-[3px] border-double border-ink">
              {columns.map((column) => (
                <td key={column.id} className={`h-12 px-3 text-base ${place(column)} font-semibold`}>
                  {column.total}
                </td>
              ))}
              {actions && <td />}
              {folded.length > 0 && <td className="@min-[60rem]:hidden" />}
            </tr>
          </tfoot>
        )}
      </table>
      <ul className="flex flex-col gap-2 @min-[40rem]:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)} className={`rounded-paper bg-paper px-3 py-3 ${rowClassName?.(row) ?? ""}`}>
            {card(row)}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The usual shape of a ledger card: name and amount on the first line, stamp and date on the second, actions below. */
export function LedgerCard({ title, amount, stamp, note, actions }: { title: ReactNode; amount: ReactNode; stamp?: ReactNode; note?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 text-[1.0625rem] font-bold">{title}</span>
        <span className="shrink-0 font-mono text-[1.0625rem] font-semibold">{amount}</span>
      </p>
      <p className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="flex flex-wrap items-center gap-1.5">{stamp}</span>
        {note && <span className="font-mono text-label font-medium text-muted">{note}</span>}
      </p>
      {actions && <div className="flex flex-col gap-2 pt-1">{actions}</div>}
    </div>
  );
}

/** A small blue action at the end of a ledger row ("Repetir"). */
export function RowAction({ children, onClick, label }: { children: ReactNode; onClick: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control px-2.5 font-bold text-brand underline decoration-2 underline-offset-4 -outline-offset-3">
      {children}
    </button>
  );
}

/**
 * The strip of figures that opens a ledger page: labels above, big mono numbers, a double rule underneath.
 * Four across with room; two by two on a phone.
 */
export function LedgerFigures({ children }: { children: ReactNode }) {
  return (
    <div className="@container">
      <dl className="grid grid-cols-2 rounded-t-paper bg-paper @min-[44rem]:grid-cols-4">{children}</dl>
      <hr className="rule-double bg-paper" />
    </div>
  );
}

/** One figure of the strip. A long amount shrinks to stay inside its column. */
export function LedgerFigure({ label, value, note }: { label: ReactNode; value: number; note?: ReactNode }) {
  return (
    <div className="@container flex flex-col gap-1 border-paper-rule px-4 pb-3 pt-3 not-first:border-l max-[43.99rem]:nth-[3]:border-l-0 max-[43.99rem]:nth-[n+3]:border-t">
      <dt className="text-label font-semibold uppercase tracking-[0.08em] text-muted">{label}</dt>
      <dd
        className="fit-figure font-mono leading-tight font-semibold tracking-[-0.02em]"
        style={{ "--fit-max": "var(--text-figure)", "--fit-chars": moneyWidth(value) } as CSSProperties}
      >
        <Money value={value} />
      </dd>
      {note && <dd className="text-label text-muted">{note}</dd>}
    </div>
  );
}
