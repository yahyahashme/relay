import Link from "next/link";
import type { ReactNode } from "react";
import { Chevron } from "./icons";

// La hoja de ruta: the driver's delivery manifest. Numbered stops, big and checkable.
// The row is paper (the facts of the stop) with a blue end (the way in): paper holds facts, blue holds actions.

/** The numbered list of stops. */
export function Manifest({ children, label }: { children: ReactNode; label: string }) {
  return (
    <ol aria-label={label} className="flex flex-col gap-2">
      {children}
    </ol>
  );
}

/**
 * One stop: big number, shop name, amount, status stamp. The whole row opens the stop (a target for
 * gloves and wet hands, at least 56 px tall); `next` makes it the large row pinned at the top.
 * A finished stop keeps its stamp and gets an outlined end instead of a filled one.
 */
export function ManifestRow({
  number,
  name,
  detail,
  amount,
  stamp,
  href,
  openLabel,
  next = false,
  done = false,
}: {
  number: number;
  name: ReactNode;
  /** A mono line under the name: the invoice number. */
  detail?: ReactNode;
  amount: ReactNode;
  stamp?: ReactNode;
  href: string;
  /** Spoken name of the link: "Abrir parada 1: Tienda Rosa". */
  openLabel: string;
  next?: boolean;
  done?: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        aria-label={openLabel}
        className={`flex items-stretch transition-[scale] duration-[120ms] ease-snap active:scale-[0.98] ${next ? "min-h-24" : "min-h-16"}`}
      >
        <span className="flex min-w-0 flex-1 items-stretch rounded-l-paper bg-paper">
          <span
            className={`flex shrink-0 items-center justify-center border-r-2 border-dotted border-paper-rule font-mono font-semibold ${
              next ? "w-16 text-[2.5rem]" : "w-13 text-[1.75rem]"
            } ${done ? "text-muted" : "text-ink"}`}
          >
            {number}
          </span>
          <span className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] content-center items-baseline gap-x-3 gap-y-1 px-3 py-2.5">
            <span className={`font-bold text-balance ${next ? "text-lead" : "text-[1.0625rem]"}`}>{name}</span>
            <span className={`text-right font-mono font-semibold ${next ? "text-figure" : "text-[1.125rem]"}`}>{amount}</span>
            <span className="font-mono text-label font-medium text-muted">{detail}</span>
            <span className="justify-self-end">{stamp}</span>
          </span>
        </span>
        <span
          aria-hidden
          className={`flex w-14 shrink-0 items-center justify-center rounded-r-control ${
            done ? "border-[1.5px] border-l-0 border-brand text-brand" : "bg-brand text-white"
          }`}
        >
          <Chevron className={next ? "size-7" : "size-6"} />
        </span>
      </Link>
    </li>
  );
}
