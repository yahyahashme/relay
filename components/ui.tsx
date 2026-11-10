import Link from "next/link";
import type { ReactNode } from "react";
import type { StatusTone } from "@/lib/labels";
import type { Receipt } from "@/lib/types";

export function Screen({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <main className={`mx-auto flex w-full flex-col gap-5 px-4 pb-10 pt-4 ${wide ? "max-w-6xl" : "max-w-md"}`}>
      {children}
    </main>
  );
}

export function BackLink({ href = "/", label = "Inicio" }: { href?: string; label?: string }) {
  return (
    <Link href={href} className="-ml-1 inline-flex min-h-12 items-center gap-1 self-start px-1 text-base font-medium text-brand">
      <span aria-hidden>‹</span> {label}
    </Link>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-line bg-card p-4 ${className}`}>{children}</section>;
}

export function Label({ children }: { children: ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-wider text-muted">{children}</p>;
}

type Variant = "primary" | "secondary";

const BUTTON =
  "flex min-h-14 w-full flex-col items-center justify-center rounded-xl px-5 py-2 text-center text-lg font-semibold transition-colors disabled:cursor-not-allowed";
const VARIANT: Record<Variant, string> = {
  primary: "bg-brand text-white active:bg-brand-dark disabled:bg-line disabled:text-muted",
  secondary: "border-2 border-brand bg-card text-brand active:bg-brand-soft disabled:border-line disabled:text-muted",
};

export function Button({
  children,
  hint,
  onClick,
  disabled = false,
  busy = false,
  variant = "primary",
}: {
  children: ReactNode;
  hint?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
  variant?: Variant;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled || busy} className={`${BUTTON} ${VARIANT[variant]}`}>
      <span>{busy ? "Procesando..." : children}</span>
      {hint && <span className="text-sm font-normal opacity-85">{hint}</span>}
    </button>
  );
}

export function ButtonLink({ href, children, variant = "primary" }: { href: string; children: ReactNode; variant?: Variant }) {
  return (
    <Link href={href} className={`${BUTTON} ${VARIANT[variant]}`}>
      {children}
    </Link>
  );
}

const CHIP: Record<StatusTone | "cash" | "overdue", string> = {
  due: "bg-warn-soft text-warn",
  part: "bg-brand-soft text-brand",
  paid: "bg-ok-soft text-ok",
  credit: "bg-credit-soft text-credit",
  cash: "bg-warn-soft text-warn ring-1 ring-warn/40",
  overdue: "bg-bad-soft text-bad",
};

export function Chip({ tone, children }: { tone: keyof typeof CHIP; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-semibold ${CHIP[tone]}`}>
      {children}
    </span>
  );
}

export function Loading() {
  return (
    <p className="animate-pulse py-10 text-center text-lg text-muted" role="status">
      Cargando...
    </p>
  );
}

export function LoadError() {
  return (
    <p className="rounded-xl bg-bad-soft px-4 py-3 text-bad" role="alert">
      No se pudo cargar. Reintentando...
    </p>
  );
}

export function NotFound({ children }: { children: ReactNode }) {
  return (
    <Card>
      <p className="text-lg">{children}</p>
    </Card>
  );
}

export function ReceiptView({ receipt }: { receipt: Receipt }) {
  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-xl px-4 py-3 text-base ${receipt.ok ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad"}`}
    >
      <span aria-hidden className="text-xl leading-6">{receipt.ok ? "✓" : "!"}</span>
      <div className="flex flex-col gap-1">
        <p className="font-medium">{receipt.message}</p>
        {receipt.explorerUrl && (
          <a href={receipt.explorerUrl} target="_blank" rel="noreferrer" className="text-sm underline">
            Ver detalles
          </a>
        )}
      </div>
    </div>
  );
}
