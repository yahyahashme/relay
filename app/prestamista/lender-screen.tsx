"use client";

import { useEffect, useState } from "react";
import testnet from "@/config/testnet.json";
import { Button, DetailLink, TextButton } from "@/components/kit/button";
import { MoneyField } from "@/components/kit/field";
import { Slip, TopNav } from "@/components/kit/layout";
import { LedgerFigure, LedgerFigures } from "@/components/kit/ledger";
import { Paper } from "@/components/kit/paper";
import { Answer, Failure, Loading } from "@/components/kit/states";
import { usePayConfirm } from "@/components/pay-confirm";
import { getLender, getLenderHistory, getMyLender, getPool, lenderDeposit, lenderWithdraw } from "@/lib/api";
import { formatDay, formatMoney } from "@/lib/format";
import type { LenderHistory, LenderMove } from "@/lib/lender-history";
import { useT } from "@/lib/i18n";
import { parseAmount } from "@/lib/labels";
import type { LenderView, MyLender, Pool, Receipt } from "@/lib/types";
import { usePolling } from "@/lib/use-polling";

type Data = { pool: Pool; lender: LenderView; mine: MyLender | null };

const HEADING = "text-lead leading-tight font-bold";
const contractUrl = `${testnet.explorer}/contract/${testnet.contracts.routeLedger}`;
const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Lenders: businesses Relay approves (KYB, a licence). They put money in the pool, earn 0.50% of
 * every credit sale and take out what isn't lent. Signed in as a lender (#207), the page shows its
 * own place in the pool with "Poner dinero" and "Retirar", each confirmed with its passkey or PIN.
 * Signed out, it shows the pool and the demo lender, read only.
 */
export default function LenderScreen() {
  const { t } = useT();
  const { data, failed, reload } = usePolling<Data>(
    "lender",
    async () => {
      const [pool, lender, mine] = await Promise.all([getPool(), getLender(), getMyLender()]);
      return { pool, lender, mine };
    },
    3000,
  );
  const [retrying, setRetrying] = useState(false);

  async function retry() {
    setRetrying(true);
    await reload();
    setRetrying(false);
  }

  const mine = data?.mine ?? null;
  const earned = data ? round(data.lender.value - data.lender.netDeposited) : 0;

  return (
    <Slip wide>
      <TopNav back="/" backLabel={t("Inicio", "Home")} />
      <h1 className="text-title font-bold">{mine ? mine.businessName : t("Fondo de crédito", "Credit pool")}</h1>
      {!mine && (
        <p className="max-w-[40rem] text-pretty">
          {t(
            "Prestamistas con licencia ponen dólares digitales en este fondo. El fondo le paga a la distribuidora cuando entrega, y la tienda le devuelve el dinero en 7 días, sin intereses.",
            "Licensed lenders put digital dollars in this pool. The pool pays the distributor at delivery, and the shop pays it back in 7 days, with no interest.",
          )}
        </p>
      )}

      {failed && !data ? (
        <Failure onRetry={() => void retry()} busy={retrying} />
      ) : !data ? (
        <Loading lines={5} torn={false} />
      ) : (
        <>
          {mine && <MyPlace mine={mine} reload={reload} />}
          {mine && mine.status !== "pendiente" && <LenderMoves mine version={`${mine.value}|${mine.netDeposited}`} />}

          <section className="flex flex-col gap-2">
            {mine && <h2 className={HEADING}>{t("El fondo de crédito", "The credit pool")}</h2>}
            <LedgerFigures>
              <LedgerFigure label={t("Disponible", "Available")} value={data.pool.available} />
              <LedgerFigure label={t("Prestado a tiendas", "Lent to shops")} value={data.pool.lent} />
              <LedgerFigure label={t("Fondo de respaldo", "Backup fund")} value={data.pool.buffer} />
              <LedgerFigure label={t("Total de los prestamistas", "Lenders' total")} value={round(data.pool.available + data.pool.lent)} />
            </LedgerFigures>
          </section>

          {!mine && (
            <section className="flex flex-col gap-2">
              <h2 className={HEADING}>{t("El prestamista de la demo", "The demo lender")}</h2>
              <LedgerFigures>
                <LedgerFigure label={t("Puso", "Put in")} value={data.lender.netDeposited} />
                <LedgerFigure label={t("Vale hoy", "Worth today")} value={data.lender.value} />
                <LedgerFigure label={t("Ganó", "Earned")} value={earned} />
                <LedgerFigure label={t("Puede retirar hoy", "Can take out today")} value={Math.min(data.lender.value, data.pool.available)} />
              </LedgerFigures>
            </section>
          )}
          {!mine && <LenderMoves mine={false} version={`${data.lender.value}|${data.lender.netDeposited}`} />}
        </>
      )}

      <section className="flex max-w-[40rem] flex-col gap-2">
        <h2 className={HEADING}>{t("Cómo funciona", "How it works")}</h2>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-pretty">
          <li>
            {t(
              "Solo los prestamistas que Relay aprueba, después de revisar la empresa, pueden poner dinero: prestamistas con licencia en El Salvador. Las distribuidoras no ponen dinero en el fondo: dan los 7 días con su propio dinero. Relay puede quitar la aprobación: entonces el prestamista no pone más dinero, pero siempre puede retirar el suyo.",
              "Only lenders Relay approves, after checking the business, can put money in: lenders licensed in El Salvador. Distributors don't put money in the pool: they give the 7 days with their own money. Relay can take the approval away: then the lender can't put more in, but it can always take its money out.",
            )}
          </li>
          <li>{t("Ganan 0.50% de cada venta a crédito. La distribuidora paga esa comisión, la tienda nunca.", "They earn 0.50% of every credit sale. The distributor pays that fee, never the shop.")}</li>
          <li>{t("Pueden retirar lo que no está prestado. Lo prestado vuelve cuando las tiendas pagan.", "They can take out what isn't lent. Lent money comes back as shops pay.")}</li>
          <li>{t("Si una tienda no paga, el fondo de respaldo cubre primero. Lo que no cubre, lo comparten todos los prestamistas.", "If a shop doesn't pay, the backup fund covers it first. What it can't cover, all lenders share.")}</li>
          <li>
            {t(
              "En la demo, Relay guarda la llave de prueba de cada prestamista y firma por él cuando lo confirma con su cara, huella o PIN. Un prestamista real firma desde su propia cuenta, y Relay no puede mover su dinero.",
              "In the demo, Relay keeps each lender's test key and signs for it once the lender confirms with its face, fingerprint or PIN. A real lender signs from its own account, and Relay can't move its money.",
            )}
          </li>
        </ul>
        <DetailLink href={contractUrl} external>
          {t("Ver detalles", "See details")}
        </DetailLink>
      </section>
    </Slip>
  );
}

/** The signed-in lender's own figures, and the two buttons. */
function MyPlace({ mine, reload }: { mine: MyLender; reload: () => Promise<void> }) {
  const { t } = useT();
  const { ask, sheet } = usePayConfirm();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState<"in" | "out" | "all" | null>(null);
  const [answer, setAnswer] = useState<Receipt | null>(null);
  const parsed = parseAmount(amount);
  const earned = round(mine.value - mine.netDeposited);

  async function move(kind: "in" | "out" | "all") {
    const dollars = kind === "all" ? mine.canWithdraw : parsed;
    if (!dollars || busy) return;
    setBusy(kind);
    setAnswer(null);
    // Face ID, fingerprint or PIN first: nothing moves until the lender confirms this amount.
    const confirm = await ask({ action: kind === "in" ? "lend" : "withdraw", lenderId: mine.id, amount: dollars, to: kind === "in" ? t("Fondo de crédito", "Credit pool") : mine.businessName });
    if (!confirm.ok) {
      if (confirm.message) setAnswer({ ok: false, message: confirm.message });
      setBusy(null);
      return;
    }
    // "All" sends exactly its shares when nothing of it is lent out; otherwise the most it can take today.
    const everything = kind === "all" && mine.canWithdraw >= mine.value;
    const result =
      kind === "in" ? await lenderDeposit(mine.id, dollars, confirm.id) : await lenderWithdraw(mine.id, everything ? "all" : dollars, confirm.id);
    if (result.ok) {
      setAmount("");
      await reload();
    }
    setAnswer(result);
    setBusy(null);
  }

  if (mine.status === "pendiente") {
    return (
      <Paper className="flex max-w-[40rem] flex-col gap-2 p-4">
        <h2 className={HEADING}>{t("Esperando aprobación", "Waiting for approval")}</h2>
        <p className="text-pretty">
          {mine.autoApprove
            ? t("En la demo, Relay aprueba su empresa sola en unos segundos. Esta página se actualiza sola.", "In the demo, Relay approves your business by itself in a few seconds. This page updates by itself.")
            : t("Relay revisa su empresa y su licencia. Cuando la apruebe, podrá poner dinero en el fondo.", "Relay is checking your business and its licence. Once it's approved, you can put money in the pool.")}
        </p>
        <p className="text-label text-muted">{t(`En su cuenta: ${formatMoney(mine.balance)} en dólares digitales.`, `In your account: ${formatMoney(mine.balance)} in digital dollars.`)}</p>
      </Paper>
    );
  }

  const revoked = mine.status === "revocado";
  const tooMuchIn = parsed !== null && parsed > mine.balance;
  const tooMuchOut = parsed !== null && parsed > mine.canWithdraw;

  return (
    <section className="flex flex-col gap-3" aria-label={t("Su lugar en el fondo", "Your place in the pool")}>
      {sheet}
      <h2 className={HEADING}>{t("Su lugar en el fondo", "Your place in the pool")}</h2>
      <LedgerFigures>
        <LedgerFigure label={t("Puso", "Put in")} value={mine.netDeposited} />
        <LedgerFigure label={t("Vale hoy", "Worth today")} value={mine.value} />
        <LedgerFigure label={t("Ganó", "Earned")} value={earned} />
        <LedgerFigure label={t("Puede retirar hoy", "Can take out today")} value={mine.canWithdraw} />
      </LedgerFigures>
      <p className="text-label text-muted">{t(`En su cuenta, sin poner: ${formatMoney(mine.balance)} en dólares digitales.`, `In your account, not put in: ${formatMoney(mine.balance)} in digital dollars.`)}</p>
      {revoked && (
        <p className="max-w-[40rem] font-semibold text-pretty">
          {t("Relay quitó su aprobación: no puede poner más dinero, pero siempre puede retirar el suyo.", "Relay removed your approval: you can't put more money in, but you can always take yours out.")}
        </p>
      )}
      <div className="flex max-w-[28rem] flex-col gap-3">
        <MoneyField label={t("Monto", "Amount")} value={amount} onChange={(event) => setAmount(event.target.value)} />
        <Button
          onClick={() => void move("in")}
          busy={busy === "in"}
          disabled={revoked || !parsed || tooMuchIn || busy !== null}
          hint={
            revoked
              ? t("Sin aprobación de Relay no puede poner más.", "Without Relay's approval you can't put more in.")
              : tooMuchIn
                ? t(`Tiene ${formatMoney(mine.balance)} en su cuenta.`, `You have ${formatMoney(mine.balance)} in your account.`)
                : t("Sale de su cuenta y entra al fondo.", "It leaves your account and goes into the pool.")
          }
        >
          {t("Poner dinero", "Put money in")}
        </Button>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button size="sm" onClick={() => void move("out")} busy={busy === "out"} disabled={!parsed || tooMuchOut || busy !== null}>
            {t("Retirar", "Take out")}
          </Button>
          <TextButton onClick={() => void move("all")} disabled={mine.canWithdraw <= 0 || busy !== null}>
            {t(`Retirar todo lo que puede (${formatMoney(mine.canWithdraw)})`, `Take out all you can (${formatMoney(mine.canWithdraw)})`)}
          </TextButton>
        </div>
        {tooMuchOut && (
          <p className="text-label text-muted text-pretty">
            {t(
              `Hoy puede retirar hasta ${formatMoney(mine.canWithdraw)}. Lo prestado vuelve cuando las tiendas pagan.`,
              `Today you can take out up to ${formatMoney(mine.canWithdraw)}. Lent money comes back as shops pay.`,
            )}
          </p>
        )}
      </div>
      {answer && <Answer receipt={answer} />}
    </section>
  );
}

/** Under $1, four decimals: a lender's part of one sale is often a few tenths of a cent. */
const fine = (n: number) => (Math.abs(n) < 1 && n !== 0 ? `$${n.toFixed(4)}` : formatMoney(n));

const SHOWN = 12;

/**
 * The lender's own movements (#224): Puso, Retiró, and its part of every credit sale (the dollars
 * of its own that the sale used and what it earned), adding up to "Puso" and "Ganó" above.
 * Read again whenever those figures change.
 */
function LenderMoves({ mine, version }: { mine: boolean; version: string }) {
  const { lang, t } = useT();
  const [history, setHistory] = useState<LenderHistory | null | undefined>(undefined);
  const [all, setAll] = useState(false);
  useEffect(() => {
    let live = true;
    getLenderHistory(mine).then(
      (found) => live && setHistory(found),
      () => live && setHistory(null),
    );
    return () => {
      live = false;
    };
  }, [mine, version]);

  const label = (m: LenderMove): [string, string, string | null] => {
    switch (m.kind) {
      case "in":
        return [t("Puso", "Put in"), `+${formatMoney(m.amount)}`, null];
      case "out":
        return [t("Retiró", "Took out"), `-${formatMoney(m.amount)}`, null];
      case "share":
        return [
          t(`Su parte de la factura ${m.invoiceId}`, `Its part of invoice ${m.invoiceId}`),
          `+${fine(m.earned)}`,
          t(`Usó ${fine(m.used)} de su dinero; vuelve cuando la tienda paga.`, `Used ${fine(m.used)} of its money; it comes back when the shop pays.`),
        ];
      case "loss":
        return [t("Deuda que no se pagó", "Debt that wasn't paid"), `-${fine(m.lost)}`, t("Lo que el fondo de respaldo no cubrió.", "What the backup fund didn't cover.")];
      case "earlier":
        return [
          t("Antes de esta lista", "Before this list"),
          `+${fine(m.earned)}`,
          t(`Puso ${formatMoney(m.putIn)} neto. La red guarda una semana de movimientos.`, `Put in ${formatMoney(m.putIn)} net. The network keeps a week of movements.`),
        ];
    }
  };

  return (
    <section className="flex max-w-[40rem] flex-col gap-2">
      <h2 className={HEADING}>{mine ? t("Sus movimientos", "Your movements") : t("Movimientos del prestamista de la demo", "The demo lender's movements")}</h2>
      {history === undefined ? (
        <Loading lines={3} torn={false} />
      ) : history === null ? (
        <p className="text-muted">{t("No pudimos leer los movimientos. Intente más tarde.", "We couldn't read the movements. Try later.")}</p>
      ) : history.moves.length === 0 ? (
        <p>{t("Todavía no hay movimientos.", "No movements yet.")}</p>
      ) : (
        <>
          <ul className="flex flex-col divide-y-2 divide-dotted divide-edge">
            {(all ? history.moves : history.moves.slice(0, SHOWN)).map((m, i) => {
              const [what, amount, note] = label(m);
              const tx = "txHash" in m && m.txHash ? m.txHash : null;
              return (
                <li key={i} className="flex flex-col gap-0.5 py-2">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-semibold">{what}</span>
                    <span className={`font-mono tabular-nums ${amount.startsWith("-") ? "text-bad" : ""}`}>{amount}</span>
                  </span>
                  <span className="flex flex-wrap items-baseline gap-x-3 text-label text-muted">
                    {"at" in m && <span>{formatDay(m.at, lang)}</span>}
                    {note && <span>{note}</span>}
                    {tx && (
                      <DetailLink href={`${testnet.explorer}/tx/${tx}`} external>
                        {t("Ver detalles", "See details")}
                      </DetailLink>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
          {!all && history.moves.length > SHOWN && (
            <TextButton onClick={() => setAll(true)}>{t(`Ver los ${history.moves.length}`, `See all ${history.moves.length}`)}</TextButton>
          )}
          <p className="text-label text-muted text-pretty">
            {t(
              `En total: puso ${formatMoney(history.putIn)} y ganó ${formatMoney(history.earned)}. Cada venta a crédito usa el dinero de todos los prestamistas según lo que cada uno puso, y cada uno gana su parte del 0.50%.`,
              `In total: put in ${formatMoney(history.putIn)} and earned ${formatMoney(history.earned)}. Each credit sale uses every lender's money in proportion to what each put in, and each earns its share of the 0.50%.`,
            )}
          </p>
        </>
      )}
    </section>
  );
}
