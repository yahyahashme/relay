import Link from "next/link";
import type { ReactNode } from "react";
import { Chevron } from "./icons";

// The account look (Nov 14): what a shop or distributor reads about its own account sits on white cards with
// soft corners, in plain type, with no dotted leaders. Amounts stay in mono. A list of places to go is one
// card of rows, each with a small round icon, a title, a line under it and a chevron, split by hairlines.
// Paper slips (the invoice, the route sheet) use the same calm look: plain rules, sentence-case labels, status pills.

/** A white card with soft corners. */
export function Card({ children, className = "", as: Tag = "div" }: { children: ReactNode; className?: string; as?: "div" | "section" }) {
  return <Tag className={`rounded-card bg-paper ${className}`}>{children}</Tag>;
}

/** A heading over a card: plain words, not capitals. */
export function CardHeading({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="px-1 text-lead font-bold">
      {children}
    </h2>
  );
}

/** Several rows in one card, split by hairlines. */
export function RowGroup({ children }: { children: ReactNode }) {
  return <Card className="flex flex-col divide-y divide-paper-rule overflow-hidden">{children}</Card>;
}

/** A small round mark at the start of a row: an icon, or a name's initials. */
export function RowMark({ children, tone = "brand" }: { children: ReactNode; tone?: "brand" | "ink" }) {
  return (
    <span
      aria-hidden
      className={`flex size-10 shrink-0 items-center justify-center rounded-full text-[0.9375rem] font-bold ${tone === "brand" ? "bg-white text-ink" : "bg-ink text-white"}`}
    >
      {children}
    </span>
  );
}

function RowBody({ mark, title, hint, figure, chevron }: { mark?: ReactNode; title: ReactNode; hint?: ReactNode; figure?: ReactNode; chevron: boolean }) {
  return (
    <>
      {mark && <RowMark>{mark}</RowMark>}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[1.0625rem] font-semibold text-ink">{title}</span>
        {hint && <span className="text-label text-muted text-pretty">{hint}</span>}
      </span>
      {figure && <span className="shrink-0 font-mono text-[1.0625rem] font-semibold text-ink">{figure}</span>}
      {chevron && <Chevron className="size-5 text-muted" />}
    </>
  );
}

const ROW = "flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left";
const TAPPABLE = "press hover:bg-brand-tint active:bg-brand-tint focus-visible:-outline-offset-3";

/** A row that opens another screen. `external` opens a new tab (WhatsApp). */
export function RowLink({
  href,
  title,
  hint,
  figure,
  mark,
  external = false,
}: {
  href: string;
  title: ReactNode;
  hint?: ReactNode;
  figure?: ReactNode;
  mark?: ReactNode;
  external?: boolean;
}) {
  const body = <RowBody mark={mark} title={title} hint={hint} figure={figure} chevron />;
  return external ? (
    <a href={href} target="_blank" rel="noreferrer" className={`${ROW} ${TAPPABLE}`}>
      {body}
    </a>
  ) : (
    <Link href={href} className={`${ROW} ${TAPPABLE}`}>
      {body}
    </Link>
  );
}

/** A row you only read. `end` sits at the right (a figure, a button). */
export function RowInfo({ title, hint, mark, end }: { title: ReactNode; hint?: ReactNode; mark?: ReactNode; end?: ReactNode }) {
  return (
    <div className={`${ROW} flex-wrap`}>
      <RowBody mark={mark} title={title} hint={hint} chevron={false} />
      {end && <span className="ml-auto shrink-0">{end}</span>}
    </div>
  );
}

/** A label and its value on one line, in plain type: "Límite      $ 200.00". */
export function Fact({ label, children, strong = false }: { label: ReactNode; children: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className={strong ? "font-semibold text-ink" : "text-muted"}>{label}</dt>
      <dd className={`text-right ${strong ? "font-semibold" : ""}`}>{children}</dd>
    </div>
  );
}

/** How much of a limit is free: a bar that fills with what is owed. */
export function Meter({ used, of, label }: { used: number; of: number; label: string }) {
  const share = of > 0 ? Math.min(1, Math.max(0, used / of)) : 0;
  return (
    <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={of} aria-valuenow={used} className="h-2.5 w-full overflow-hidden rounded-full bg-paper-rule">
      <div className="h-full rounded-full bg-brand" style={{ width: `${share * 100}%` }} />
    </div>
  );
}

/** A round shortcut under the account card (Agregar, Retirar, Historial): an icon over one word. */
export function Shortcut({ href, icon, children }: { href: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Link href={href} className="group flex min-h-11 min-w-0 flex-1 flex-col items-center gap-1.5 rounded-control py-1 text-center">
      <span
        aria-hidden
        className="flex size-13 items-center justify-center rounded-full bg-accent text-ink press group-hover:bg-accent-press group-active:scale-[0.92] motion-reduce:group-active:scale-100"
      >
        {icon}
      </span>
      <span className="text-label font-semibold text-ink">{children}</span>
    </Link>
  );
}

/** Two letters for a round mark: "Mini Súper La Esquina" → "ML". */
export function initials(name: string): string {
  const words = name.split(/\s+/).filter((w) => /^\p{L}/u.test(w) && w.length > 2);
  const picked = (words.length > 0 ? words : name.split(/\s+/)).slice(0, 2);
  return picked.map((w) => w[0]?.toUpperCase() ?? "").join("");
}

// Line icons, one stroke weight, drawn on a 24 px grid. Decorative: every row also says what it is.
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

export const icons = {
  add: (
    <Icon>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  ),
  withdraw: (
    <Icon>
      <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
    </Icon>
  ),
  history: (
    <Icon>
      <path d="M7 3h10v18l-2.5-1.5L12 21l-2.5-1.5L7 21z" />
      <path d="M10 8h4M10 12h4" />
    </Icon>
  ),
  share: (
    <Icon>
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6" />
    </Icon>
  ),
  person: (
    <Icon>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </Icon>
  ),
  lock: (
    <Icon>
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </Icon>
  ),
  key: (
    <Icon>
      <circle cx="8" cy="15" r="4" />
      <path d="M11 12l9-9M16 7l3 3" />
    </Icon>
  ),
  phone: (
    <Icon>
      <rect x="7" y="2.5" width="10" height="19" rx="2" />
      <path d="M11 18h2" />
    </Icon>
  ),
  people: (
    <Icon>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c1-3.5 3.5-5 6.5-5s5.5 1.5 6.5 5" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 15c2 .6 3.2 2.2 3.8 5" />
    </Icon>
  ),
  bell: (
    <Icon>
      <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </Icon>
  ),
  help: (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.5v.7M12 17h.01" />
    </Icon>
  ),
  close: (
    <Icon>
      <path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h9" />
    </Icon>
  ),
  invoice: (
    <Icon>
      <path d="M6 3h9l3 3v15H6z" />
      <path d="M9 10h6M9 14h6M9 18h3" />
    </Icon>
  ),
  store: (
    <Icon>
      <path d="M4 9l1.5-5h13L20 9M4 9h16M4 9v11h16V9" />
      <path d="M10 20v-5h4v5" />
    </Icon>
  ),
};
