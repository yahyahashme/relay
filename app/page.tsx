import Link from "next/link";
import type { ReactNode } from "react";
import { ActionLink } from "@/components/kit/button";
import { Paper } from "@/components/kit/paper";
import { TAGLINE, TAGLINE_EN } from "@/lib/brand";
import { T } from "@/lib/i18n";
import { HomeFooter } from "./home-footer";
import { DriverLinks, ShopLinks } from "./home-links";
import { HomeNav } from "./home-nav";

// The home page, after Wise.com: the first screen is all light blue (the tagline, what Relay does, Crear cuenta
// and Entrar), with a bar at the top that stays while you scroll and takes you to each part. Then how it works and
// the demo's three ways in (both fold), how a shop's limit grows, the problem in three figures, and a footer.
// The page is drawn on the server; only the words (two languages), the bar and the demo's links wait for the browser.
// The figures and their sources are in docs/facts.md (entries 1, 9 and 10).

// The same side margins and safe areas as the Slip and Split layouts (components/kit/layout.tsx).
const SIDE = "pl-[max(var(--gutter),env(safe-area-inset-left))] pr-[max(var(--gutter),env(safe-area-inset-right))]";
/** One column of content, centred, inside a full-width band. */
const COLUMN = "mx-auto w-full max-w-[calc(28rem+2*var(--gutter))] min-[40rem]:max-w-[calc(64rem+2*var(--gutter))]";
const PILL = "press inline-flex min-h-13 items-center justify-center rounded-full px-7 text-[1.125rem] font-bold";
const TITLE = "text-[clamp(1.875rem,1.3rem+2.5vw,3rem)] leading-[1.05] font-black tracking-[-0.03em]";
/** Sections sit under the sticky bar when a link jumps to them. */
const ANCHOR = "scroll-mt-[calc(var(--band-h)+4.5rem)]";

/** The problem in three figures (docs/facts.md, entries 1, 9 and 10). */
const FIGURES: { figure: [string, string]; text: [string, string] }[] = [
  {
    figure: ["$2 mil millones", "$2 billion"],
    text: [
      "en mercadería al año le venden las distribuidoras a las tiendas de barrio. La mayoría se paga en efectivo al motorista.",
      "of stock a year is sold to neighbourhood shops by distributors. Most of it is paid in cash to the driver.",
    ],
  },
  {
    figure: ["6 de cada 10", "6 in 10"],
    text: ["microempresas informales le han pedido prestado a un prestamista.", "informal small businesses have borrowed from a loan shark."],
  },
  {
    figure: ["$35 por cada $100", "$35 per $100"],
    text: ["es lo que cobra de interés un prestamista, según una encuesta de 2019.", "is what a loan shark charges in interest, according to a 2019 survey."],
  },
];

/** How it works, in the order it happens on a delivery day. */
const STEPS: { icon: ReactNode; title: [string, string]; text: [string, string] }[] = [
  {
    icon: (
      <>
        <rect x="7" y="2.5" width="10" height="19" rx="2" />
        <path d="M10 6.5h4M10 10h4M10 13.5h2.5" />
      </>
    ),
    title: ["La factura llega al teléfono", "The invoice reaches the phone"],
    text: ["El motorista entrega el pedido y la factura aparece en el teléfono de la tienda.", "The driver delivers the order and the invoice shows up on the shop owner's phone."],
  },
  {
    icon: (
      <>
        <circle cx="9" cy="9" r="5.5" />
        <path d="M15.4 9.6a5.5 5.5 0 1 1-5.8 5.8" />
        <path d="M9 6.5v5" />
      </>
    ),
    title: ["La tienda elige cómo pagar", "The shop chooses how to pay"],
    text: [
      "Con dólares digitales, en efectivo confirmado por los dos en la app, o en 7 días sin intereses.",
      "In digital dollars, in cash that both sides confirm in the app, or in 7 days with no interest.",
    ],
  },
  {
    icon: (
      <>
        <path d="M3 20h18" />
        <path d="M5 16l5-5 3.5 3.5L20 8" />
        <path d="M15 8h5v5" />
      </>
    ),
    title: ["Pagar a tiempo abre más crédito", "Paying on time opens more credit"],
    text: [
      "Cada pago a tiempo sube el límite $25, hasta $500. El historial es de la tienda y lo puede mostrar a cualquier distribuidora, banco o cooperativa.",
      "Each on-time payment raises the limit by $25, up to $500. The record belongs to the shop, and it can show it to any distributor, bank or cooperative.",
    ],
  },
];

/** A hand-drawn arrow with a loop in it, from one step to the next: across on a laptop, down on a phone. */
function CurlyArrow() {
  return (
    <div className="flex h-24 w-12 items-center justify-center min-[64rem]:h-9 min-[64rem]:w-auto min-[64rem]:px-2" aria-hidden="true">
      <svg
        viewBox="0 0 80 48"
        className="h-12 w-20 shrink-0 rotate-90 text-ink min-[64rem]:h-auto min-[64rem]:w-full min-[64rem]:rotate-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 34C18 36 24 12 38 10C50 8 52 26 42 28C32 30 36 12 52 14C60 15 66 19 72 24" />
        <path d="M63 25.5L72.5 24.5L69 15.5" />
      </svg>
    </div>
  );
}

/** The fold's chevron: points right when closed, down when open (.fold-chevron in globals.css). */
function FoldChevron() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="fold-chevron size-6 shrink-0 text-brand"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7.5 4.5 13 10l-5.5 5.5" />
    </svg>
  );
}

/** One way into the demo: a card with a number and who you are. Tapping it unfolds one sentence and the people to choose from. */
function Role({ n, id, who, children, tryIt, note, links }: { n: number; id: string; who: ReactNode; children: ReactNode; tryIt: ReactNode; note?: ReactNode; links: ReactNode }) {
  return (
    <details className="fold group rounded-card border border-edge bg-paper">
      <summary className="press flex min-h-16 items-center gap-3 rounded-card px-4 py-3 hover:bg-brand-tint">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-base font-bold text-ink" aria-hidden="true">
          {n}
        </span>
        <h3 id={id} className="min-w-0 flex-1 text-lead font-bold">
          {who}
        </h3>
        <FoldChevron />
      </summary>
      <div className="flex flex-col gap-3 px-4 pb-4">
        <p className="text-pretty text-muted">{children}</p>
        {/* What to tap and what will happen, in one line. */}
        <p className="rounded-[0.875rem] bg-white px-3.5 py-2.5 text-pretty">
          <span className="font-bold">
            <T es="Pruebe: " en="Try it: " />
          </span>
          {tryIt}
        </p>
        {note && (
          <p className="flex gap-2 text-label text-muted text-pretty">
            <svg
              viewBox="0 0 24 24"
              className="mt-0.5 size-4 shrink-0 text-brand"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="5" y="10" width="14" height="11" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
            <span>{note}</span>
          </p>
        )}
        <div className="flex flex-col gap-2 [&_.bg-paper]:bg-white">{links}</div>
      </div>
    </details>
  );
}

/** The limit rules, for any shop (Mi cuenta keeps only the shop's own numbers). */
const LIMIT_STEPS: { label: [string, string]; change: number }[] = [
  { label: ["Si la tienda paga a tiempo", "If the shop pays on time"], change: 25 },
  { label: ["De 2 a 7 días tarde", "2 to 7 days late"], change: -25 },
  { label: ["8 días tarde o más", "8 or more days late"], change: -50 },
];

export default function Home() {
  return (
    <>
      <main className="flex w-full flex-1 flex-col">
        {/* The bar stays at the top of the page, always light blue. */}
        <HomeNav />
        {/* The first screen: all light blue, fading into the white page at its foot so the two blend. */}
        <div className="flex min-h-[calc(100svh-var(--band-h)-4rem)] flex-col bg-[linear-gradient(to_bottom,var(--color-accent)_calc(100%-9rem),var(--color-counter))]">
          <section className={`${SIDE} flex flex-1 flex-col justify-center pt-6 pb-14 min-[40rem]:pb-20`}>
            <div className={`${COLUMN} flex flex-col gap-5`}>
              <p className="text-base font-semibold text-ink/80">
                <T es="Pagos y crédito para tiendas de barrio · El Salvador" en="Payments and credit for neighbourhood shops · El Salvador" />
              </p>
              <h1 className="max-w-[14ch] text-[clamp(3rem,1.6rem+6.5vw,6.5rem)] leading-[0.92] font-black tracking-[-0.04em] text-ink text-balance">
                <T es={TAGLINE} en={TAGLINE_EN} />
              </h1>
              <p className="max-w-[40rem] text-lead text-ink text-pretty">
                <T
                  es="Relay cambia los pagos en efectivo por pagos en línea cuando una tienda compra mercadería. Nuestro sistema de crédito sube el límite de cada tienda con cada pago a tiempo."
                  en="Relay replaces cash payments with online transactions when a shop buys inventory. Our credit system raises each shop's limit with every on-time payment."
                />
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                <Link href="/registro" className={`${PILL} border-[1.5px] border-ink bg-ink text-white hover:bg-[#162f52]`}>
                  <T es="Crear cuenta" en="Create account" />
                </Link>
                <Link href="/entrar" className={`${PILL} border-[1.5px] border-accent-edge bg-white text-ink hover:bg-paper`}>
                  <T es="Entrar" en="Sign in" />
                </Link>
              </div>
            </div>
          </section>
        </div>

        <div className={`${SIDE} flex flex-col gap-14 pt-12 pb-16 min-[40rem]:gap-20 min-[40rem]:pt-16`}>
          <section id="como" aria-labelledby="como-titulo" className={`${COLUMN} ${ANCHOR}`}>
            <details className="fold rounded-card border border-edge bg-paper">
              <summary className="press flex items-center gap-4 rounded-card px-5 py-5 hover:bg-brand-tint min-[40rem]:px-8 min-[40rem]:py-6">
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <h2 id="como-titulo" className={TITLE}>
                    <T es="Cómo funciona" en="How it works" />
                  </h2>
                  <span className="text-muted text-pretty">
                    <T es="En 3 pasos: la factura llega, la tienda paga, el crédito crece." en="In 3 steps: the invoice arrives, the shop pays, the credit grows." />
                  </span>
                </span>
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-edge bg-white">
                  <FoldChevron />
                </span>
              </summary>
              <div className="flex flex-col gap-6 px-5 pb-6 min-[40rem]:px-8 min-[40rem]:pb-8">
                <ol className="grid min-[64rem]:grid-cols-[minmax(0,1fr)_5rem_minmax(0,1fr)_5rem_minmax(0,1fr)] min-[64rem]:items-start">
                  {STEPS.map(({ icon, title, text }, i) => (
                    <li key={i} className="contents">
                      {i > 0 && <CurlyArrow />}
                      <div className="flex flex-col gap-2">
                        <svg
                          viewBox="0 0 24 24"
                          className="box-content size-7 rounded-full bg-accent p-2.5 text-ink"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          {icon}
                        </svg>
                        <h3 className="text-lead font-bold text-balance">
                          <T es={title[0]} en={title[1]} />
                        </h3>
                        <p className="text-pretty">
                          <T es={text[0]} en={text[1]} />
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
                <p className="max-w-[44rem] text-muted text-pretty">
                  <T
                    es="Si la tienda elige 7 días, un fondo de prestamistas le paga a la distribuidora en el momento. Las reglas de crédito están escritas en un contrato público: no se cambian para una sola tienda ni en secreto."
                    en="If the shop picks 7 days, a lender pool pays the distributor right away. The credit rules are written in a public contract, so they can't be changed for one shop or quietly changed later."
                  />
                </p>
              </div>
            </details>
          </section>

          <section id="demo" aria-labelledby="demo-titulo" className={`${COLUMN} ${ANCHOR} flex flex-col gap-6`}>
            <header className="flex flex-col gap-2">
              <h2 id="demo-titulo" className={TITLE}>
                <T es="Probar la demo" en="Try the demo" />
              </h2>
              <p className="text-lead text-muted text-pretty">
                <T
                  es="Elija a quién ser: la tienda, el motorista, la distribuidora o el prestamista. No necesita cuenta, y todo usa dinero de prueba."
                  en="Choose who to be: the shop, the driver, the distributor or the lender. No account needed, and everything uses test money."
                />
              </p>
              <p className="text-pretty">
                <T
                  es="Lo mejor: abra la tienda en un teléfono y el panel de la distribuidora en otro. Cuando la tienda paga, el pago aparece en el panel en segundos."
                  en="Best of all: open the shop on one phone and the distributor's dashboard on another. When the shop pays, the payment shows up on the dashboard within seconds."
                />
              </p>
            </header>
            <div className="grid items-start gap-3 min-[64rem]:grid-cols-2 min-[64rem]:gap-4">
              <Role
                n={1}
                id="rol-tienda"
                who={<T es="La tienda" en="The shop" />}
                links={<ShopLinks />}
                tryIt={
                  <T
                    es="toque una tienda, abra una factura y elija «Pagar ahora». La factura queda pagada y la distribuidora lo ve al instante."
                    en="tap a shop, open an invoice and choose “Pay now”. The invoice is paid and the distributor sees it right away."
                  />
                }
                note={
                  <T
                    es="La primera vez que pague, este teléfono le pide crear su propio PIN de 6 números, o usar su cara o huella. Después lo pide en cada pago, como un banco."
                    en="The first time you pay, this phone asks you to make your own 6-digit PIN, or to use your face or fingerprint. After that it asks on every payment, like a bank."
                  />
                }
              >
                <T
                  es="Paga cada factura desde el teléfono: ahora, en efectivo o en 7 días sin intereses."
                  en="Pays each invoice from the phone: now, in cash, or in 7 days with no interest."
                />
              </Role>
              <Role
                n={2}
                id="rol-motorista"
                who={<T es="El motorista" en="The driver" />}
                links={<DriverLinks />}
                tryIt={
                  <T
                    es="abra una ruta, toque la siguiente parada y elija «Recibí efectivo». Después la tienda confirma ese efectivo desde su factura."
                    en="open a route, tap the next stop and choose “I received cash”. The shop then confirms that cash from its invoice."
                  />
                }
              >
                <T es="Lleva la ruta del día en el teléfono y registra el efectivo que recibe." en="Carries the day's route on the phone and records the cash received." />
              </Role>
              <Role
                n={3}
                id="rol-distribuidora"
                who={<T es="La distribuidora" en="The distributor" />}
                links={<ActionLink href="/distribuidor" title="Distribuidora El Sol" hint={<T es="Panel y facturas" en="Dashboard and invoices" />} />}
                tryIt={
                  <T
                    es="abra el panel y toque «Nueva factura de demo». Aparece una factura nueva que cualquier tienda de la demo puede pagar."
                    en="open the dashboard and tap “New demo invoice”. A new invoice appears that a demo shop can pay."
                  />
                }
              >
                <T es="Ve qué se cobró, qué falta y cuánto efectivo traen sus motoristas." en="Sees what was collected, what's left, and how much cash the drivers carry." />
              </Role>
              <Role
                n={4}
                id="rol-prestamista"
                who={<T es="El prestamista" en="The lender" />}
                links={
                  <ActionLink
                    href="/prestamista"
                    title={<T es="Fondo de crédito" en="Credit pool" />}
                    hint={<T es="El fondo y el prestamista de la demo" en="The pool and the demo lender" />}
                  />
                }
                tryIt={
                  <T
                    es="abra el fondo de crédito. Verá cuánto dinero hay, cuánto está prestado a las tiendas y lo que ganó el prestamista de la demo."
                    en="open the credit pool. You'll see how much money is in it, how much is lent to shops, and what the demo lender has earned."
                  />
                }
              >
                <T
                  es="Pone el dinero que le paga a la distribuidora cuando una tienda elige 7 días. Gana 0.50% de cada venta a crédito, que paga la distribuidora."
                  en="Puts in the money that pays the distributor when a shop picks 7 days. Earns 0.50% of each credit sale, paid by the distributor."
                />
              </Role>
            </div>
          </section>

          <section id="limite" aria-labelledby="limite-titulo" className={`${COLUMN} ${ANCHOR} flex flex-col gap-5`}>
            <header className="flex max-w-[44rem] flex-col gap-2">
              <h2 id="limite-titulo" className={TITLE}>
                <T es="Cómo sube el límite" en="How the limit grows" />
              </h2>
              <p className="text-lead text-pretty">
                <T
                  es="El crédito a 7 días se abre después de 2 entregas pagadas en dólares digitales, con una semana entre ellas. Empieza en la mitad de una entrega normal, hasta $100, sin intereses. Pagar a tiempo lo sube hasta $500."
                  en="7-day credit opens after 2 deliveries paid in digital dollars, a week apart. It starts at half a normal delivery, up to $100, with no interest. Paying on time raises it up to $500."
                />
              </p>
            </header>
            <div className="grid gap-4 min-[48rem]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] min-[48rem]:items-start">
              <ul className="flex flex-col divide-y divide-paper-rule rounded-card bg-paper px-5 py-2">
                {LIMIT_STEPS.map(({ label, change }) => (
                  <li key={label[0]} className="flex items-center justify-between gap-3 py-3">
                    <span className="text-[1.0625rem] font-semibold">
                      <T es={label[0]} en={label[1]} />
                    </span>
                    <span className={`shrink-0 rounded-full px-3 py-0.5 font-mono font-semibold ${change > 0 ? "bg-ok-tint text-ok" : "bg-bad-tint text-bad"}`}>
                      {change > 0 ? "+" : "−"}${Math.abs(change)}.00
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-2 text-muted text-pretty">
                <p>
                  <T
                    es="Un día tarde todavía cuenta a tiempo. El límite sube como máximo una vez por período, y solo si la tienda compró $40 o más con «Pagar en 7 días» del fondo ($10 si pagó la mitad al recibir)."
                    en="One day late still counts as on time. The limit goes up at most once per period, and only if the shop bought $40 or more with “Pay in 7 days” from the pool ($10 if it paid half on delivery)."
                  />
                </p>
                <p>
                  <T
                    es="Los 7 días que da la distribuidora quedan en el historial y no lo suben, pero pagarlos tarde sí lo baja. Con 8 días tarde o más, no sube durante 4 períodos."
                    en="7 days the distributor gives goes on the record and doesn't raise it, but paying that late does lower it. At 8 or more days late, it doesn't grow for 4 periods."
                  />
                </p>
                <p className="font-semibold text-ink">
                  <T es="Sin intereses: la tienda paga lo mismo que compró." en="No interest: the shop pays the same as it bought." />
                </p>
              </div>
            </div>
          </section>

          <section id="problema" aria-labelledby="problema-titulo" className={`${COLUMN} ${ANCHOR} flex flex-col gap-5`}>
            <header className="flex max-w-[44rem] flex-col gap-2">
              <h2 id="problema-titulo" className={TITLE}>
                <T es="El problema" en="The problem" />
              </h2>
              <p className="text-lead text-pretty">
                <T
                  es="Casi todas las tiendas le pagan el pedido al motorista en efectivo. Si el monto no cuadra, es la palabra de uno contra la del otro, y el pago no queda anotado en ningún lado: una tienda que ha pagado a tiempo por diez años se ve igual ante un banco que una que abrió la semana pasada."
                  en="Most shops pay the driver in cash when stock arrives. When the amounts don't match, it's one person's word against the other's, and the payment isn't recorded anywhere: a shop that has paid on time for ten years looks the same to a bank as one that opened last week."
                />
              </p>
            </header>
            <Paper as="div">
              <dl className="grid min-[48rem]:grid-cols-3">
                {FIGURES.map(({ figure, text }, i) => (
                  <div key={i} className="flex flex-col gap-1 border-paper-rule px-5 py-4 not-last:border-b min-[48rem]:not-last:border-r min-[48rem]:not-last:border-b-0">
                    <dt className="text-[2rem] leading-tight font-black tracking-[-0.03em]">
                      <T es={figure[0]} en={figure[1]} />
                    </dt>
                    <dd className="text-muted text-pretty">
                      <T es={text[0]} en={text[1]} />
                    </dd>
                  </div>
                ))}
              </dl>
            </Paper>
            <p className="text-label text-muted">
              <T
                es="Fuentes: Conamype (estimado, 2026); El Diario de Hoy (estudio de 2026); encuesta a 1,285 comerciantes (2019)."
                en="Sources: Conamype (estimate, 2026); El Diario de Hoy (2026 study); survey of 1,285 merchants (2019)."
              />
            </p>
          </section>
        </div>
      </main>
      <HomeFooter />
    </>
  );
}
