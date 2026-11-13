import type { ReactNode } from "react";

/** The invoice drawn as the paper factura a shop already knows: white slip, torn bottom edge. */
export function Ticket({ children }: { children: ReactNode }) {
  return (
    <div className="ticket-shadow">
      <section className="ticket flex flex-col gap-3.5 rounded-t-2xl bg-card px-[17px] pb-7 pt-4">{children}</section>
    </div>
  );
}

export function TicketRule() {
  return <hr className="border-0 border-t-2 border-dashed border-line" />;
}

export function TicketRow({ label, children, strong = false }: { label: string; children: ReactNode; strong?: boolean }) {
  return (
    <p className={`flex items-baseline justify-between gap-3 ${strong ? "font-semibold text-ink" : "text-muted"}`}>
      <span>{label}</span>
      <span className="tabular-nums">{children}</span>
    </p>
  );
}

/** The rubber stamp on a settled invoice. `fresh` plays the stamp landing once, right after paying. */
export function Stamp({ children, tone, fresh = false }: { children: ReactNode; tone: "paid" | "credit"; fresh?: boolean }) {
  return (
    <span
      className={`stamp ml-auto shrink-0 rounded-md border-[3px] px-2 py-0.5 text-lg font-extrabold uppercase tracking-wide ${
        tone === "paid" ? "border-ok text-ok" : "border-credit text-credit"
      } ${fresh ? "stamp-fresh" : ""}`}
    >
      {children}
    </span>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className={`size-5 shrink-0 transition-transform duration-200 ease-snap ${open ? "rotate-90" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7.5 4.5 13 10l-5.5 5.5" />
    </svg>
  );
}

/** Brings a panel that just unfolded into view, clear of the bottom bar. Stable, so it runs once per opening. */
function reveal(panel: HTMLDivElement | null) {
  panel?.scrollIntoView({ block: "nearest" });
}

/** The other ways to pay, as one quiet list instead of a stack of equal buttons. */
export function OptionList({ children }: { children: ReactNode }) {
  return <div className="flex flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">{children}</div>;
}

export function Option({
  title,
  hint,
  onClick,
  disabled = false,
  busy = false,
  open,
  children,
}: {
  title: string;
  hint?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
  /** Set for options that unfold a panel; leave out for a row that can't be opened. */
  open?: boolean;
  children?: ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || busy}
        aria-expanded={open}
        className="flex min-h-14 w-full scroll-mb-28 items-center justify-between gap-3 px-4 py-2 text-left text-brand -outline-offset-3 transition-colors duration-150 active:bg-brand-soft disabled:cursor-not-allowed disabled:text-muted"
      >
        <span className="flex flex-col">
          <span className="text-lg font-semibold">{busy ? "Procesando..." : title}</span>
          {hint && <span className="text-sm text-muted">{hint}</span>}
        </span>
        {open !== undefined && <Chevron open={open} />}
      </button>
      {open && children && (
        <div ref={reveal} className="option-panel flex scroll-mb-28 flex-col gap-3 px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}

/** Keeps the one main action under the thumb while the rest of the screen scrolls. */
export function ThumbBar({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none sticky bottom-0 -mx-4 -mb-10 mt-auto bg-linear-to-t from-paper from-70% to-transparent px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-4 *:pointer-events-auto">
      {children}
    </div>
  );
}
