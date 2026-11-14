import Link from "next/link";
import type { CSSProperties, MouseEvent, ReactNode, Ref } from "react";
import { Chevron } from "./icons";
import { Money, moneyWidth } from "./money";

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
 * gloves and wet hands, at least 64 px tall); `next` makes it the large row pinned at the top.
 * A finished stop keeps its stamp and gets an outlined end instead of a filled one.
 *
 * `current` is the stop already open beside the list (tablet, phone held sideways): the row is circled in ink
 * and its end turns to paper, a fact and no longer a way in. `onOpen` lets a screen that keeps the list and the
 * open stop in one page open it itself: call `event.preventDefault()` in it.
 */
export function ManifestRow({
  number,
  name,
  detail,
  amount,
  stamp,
  label,
  href,
  onOpen,
  openLabel,
  next = false,
  done = false,
  current = false,
}: {
  number: number;
  name: ReactNode;
  /** A mono line under the name: the invoice number. */
  detail?: ReactNode;
  amount: ReactNode;
  stamp?: ReactNode;
  /** A small line above the name of the `next` row: "Siguiente parada". */
  label?: ReactNode;
  href: string;
  onOpen?: (event: MouseEvent<HTMLAnchorElement>) => void;
  /** Spoken name of the link: "Abrir parada 1: Tienda Rosa". */
  openLabel: string;
  next?: boolean;
  done?: boolean;
  current?: boolean;
}) {
  return (
    <li value={number}>
      <Link
        href={href}
        prefetch={onOpen ? false : undefined}
        onClick={onOpen}
        aria-label={openLabel}
        aria-current={current ? "true" : undefined}
        data-next={next || undefined}
        className={`relative flex items-stretch transition-[scale] duration-[120ms] ease-snap active:scale-[0.98] ${next ? "min-h-24" : "min-h-16"} ${
          current
            ? "after:pointer-events-none after:absolute after:inset-0 after:hidden after:rounded-l-paper after:rounded-r-control after:border-[2.5px] after:border-ink @min-[40rem]/split:after:block"
            : ""
        }`}
      >
        <span className="flex min-w-0 flex-1 items-stretch rounded-l-paper bg-paper">
          <span
            className={`flex shrink-0 items-center justify-center border-r-2 border-dotted border-paper-rule font-mono font-semibold ${
              next ? "w-14 text-[2.5rem]" : "w-12 text-[1.75rem]"
            } ${done ? "text-muted" : "text-ink"}`}
          >
            {number}
          </span>
          {next ? (
            // The pinned row: the name gets the full width, the amount sits under it at the right, in line with the amounts below.
            <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-3 py-2.5">
              {(label || stamp) && (
                <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span className="text-label font-bold uppercase tracking-[0.12em] text-muted">{label}</span>
                  {stamp}
                </span>
              )}
              <span className="text-lead font-bold text-balance">{name}</span>
              <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="font-mono text-label font-medium text-muted">{detail}</span>
                <span className="ml-auto text-right font-mono text-figure font-semibold">{amount}</span>
              </span>
            </span>
          ) : (
            <span className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] content-center items-baseline gap-x-3 gap-y-1 px-3 py-2.5">
              <span className="text-[1.0625rem] font-bold text-balance">{name}</span>
              <span className="text-right font-mono text-[1.125rem] font-semibold">{amount}</span>
              <span className="font-mono text-label font-medium text-muted">{detail}</span>
              <span className="justify-self-end">{stamp}</span>
            </span>
          )}
        </span>
        <span
          aria-hidden
          className={`flex w-14 shrink-0 items-center justify-center rounded-r-control ${
            done ? "border-[1.5px] border-l-0 border-brand text-brand" : "bg-brand text-white"
          } ${current ? "@min-[40rem]/split:border-0 @min-[40rem]/split:bg-paper @min-[40rem]/split:text-ink" : ""}`}
        >
          <Chevron className={next ? "size-7" : "size-6"} />
        </span>
      </Link>
    </li>
  );
}

/**
 * The open stop: the row it was opened from, now all paper (nothing on it responds to a tap), over the code the
 * shop scans. The code is as large as the screen allows and never under 70% of a phone's width, yet it leaves
 * the button under the slip in view. On a phone held sideways (`sideways:`) the code moves beside the facts.
 *
 * `stamp` lands across the code once the stop is settled, and the code fades under it. `children` is the one
 * line under the code (what to do with it, or what went wrong): its two lines are kept free, so words that
 * come and go never move the button below.
 */
export function StopSlip({
  label,
  number,
  name,
  detail,
  value,
  code,
  stamp,
  headRef,
  children,
}: {
  /** Spoken name of the slip: "Parada 1: Tienda Rosa". */
  label: string;
  number: number;
  name: ReactNode;
  /** Mono lines under the name: the invoice number, what was already paid. */
  detail?: ReactNode;
  /** What the driver collects here, in dollars. */
  value: number;
  /** The QR, drawn to fill its box. */
  code: ReactNode;
  stamp?: ReactNode;
  /** The name is the heading a screen moves focus to when the stop opens. */
  headRef?: Ref<HTMLHeadingElement>;
  children?: ReactNode;
}) {
  return (
    <section aria-label={label} className="@container/stop">
      <div className="grid gap-2 rounded-paper bg-paper p-3 sideways:grid-cols-[auto_minmax(0,1fr)] sideways:items-start sideways:gap-x-3">
        <header className="@container grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 border-b-2 border-dotted border-paper-rule pb-2 sideways:col-start-2 sideways:row-start-1 sideways:grid-cols-1 sideways:gap-y-1 sideways:border-b-0 sideways:pb-0">
          <span className="flex min-h-12 items-center self-stretch border-r-2 border-dotted border-paper-rule pr-3 font-mono text-[2.5rem] leading-none font-semibold sideways:min-h-0 sideways:border-r-0 sideways:pr-0 sideways:text-[1.75rem]">
            {number}
          </span>
          <div className="flex min-w-0 flex-col">
            <h2 ref={headRef} tabIndex={-1} className="text-lead font-bold text-balance sideways:line-clamp-3">
              {name}
            </h2>
            <div className="font-mono text-label font-medium text-muted">{detail}</div>
          </div>
          <p
            className="fit-figure text-right font-mono leading-none font-semibold sideways:pt-1 sideways:text-left"
            style={{ "--fit-max": "var(--text-figure)", "--fit-chars": moneyWidth(value) } as CSSProperties}
          >
            <Money value={value} />
          </p>
        </header>
        <div
          data-code
          className="@container relative mx-auto w-[clamp(min(70vw,20rem),calc(100svh-23.75rem),100%)] tall:@min-[40rem]/split:w-full sideways:col-start-1 sideways:row-start-1 sideways:mx-0 sideways:w-[max(7rem,min(calc(100dvh-var(--band-h)-10.25rem),calc(100cqi-8.75rem)))]"
        >
          <div className={stamp ? "opacity-15" : ""}>{code}</div>
          {stamp && <div className="pointer-events-none absolute inset-0 grid place-items-center">{stamp}</div>}
        </div>
        <div className="flex min-h-[2.375rem] items-center justify-center text-center text-label sideways:hidden">{children}</div>
      </div>
    </section>
  );
}
