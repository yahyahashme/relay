"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { decideAppealAction, getAppeals } from "@/app/second-chance-actions";
import { TextButton } from "@/components/kit/button";
import { RowButton } from "@/components/kit/ledger";
import { Stamp } from "@/components/kit/stamp";
import { Loading } from "@/components/kit/states";
import { formatDay, formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { RESTART_LIMIT } from "@/lib/second-chance";
import type { Appeal } from "@/lib/server/second-chance";

const HEADING = "text-lead leading-tight font-bold";

const STATUS: Record<Appeal["status"], { tone: "warn" | "ok" | "bad"; es: string; en: string }> = {
  pendiente: { tone: "warn", es: "Por revisar", en: "To review" },
  aprobada: { tone: "ok", es: "Aprobada", en: "Approved" },
  rechazada: { tone: "bad", es: "Rechazada", en: "Declined" },
};

/**
 * Second-chance requests on /admin. A shop whose credit stopped after a default says why it fell behind,
 * what changed and how it will pay the old debt. "Aprobar" restarts it at $50 on pool credit; at most one
 * approval per shop every 6 months. A shop closed for fraud can't be approved.
 */
export function AppealsAdmin() {
  const { lang, t, msg } = useT();
  const [appeals, setAppeals] = useState<Appeal[] | null | undefined>(undefined);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const running = useRef(false);

  const load = useCallback(async () => setAppeals(await getAppeals()), []);
  useEffect(() => {
    let live = true;
    getAppeals().then(
      (found) => live && setAppeals(found),
      () => live && setAppeals(null),
    );
    return () => {
      live = false;
    };
  }, []);

  async function decide(a: Appeal, approve: boolean) {
    if (running.current) return;
    running.current = true;
    setBusy(`${approve ? "yes" : "no"}:${a.id}`);
    setError(null);
    try {
      const reply = await decideAppealAction(a.id, approve);
      if (!reply.ok) setError(reply.message);
      await load();
    } catch {
      setError("No se pudo completar. Intente de nuevo.");
    }
    setBusy(null);
    running.current = false;
  }

  if (appeals === null) return null; // not an admin
  const open = appeals?.filter((a) => a.status === "pendiente") ?? [];
  const done = appeals?.filter((a) => a.status !== "pendiente") ?? [];

  const card = (a: Appeal) => {
    const s = STATUS[a.status];
    return (
      <li key={a.id} className="flex flex-col gap-2 rounded-paper bg-paper px-4 py-3">
        <span className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-bold">{a.shopName}</span>
          <Stamp small tone={s.tone}>
            {lang === "en" ? s.en : s.es}
          </Stamp>
        </span>
        <dl className="flex flex-col gap-1 text-pretty">
          <dt className="text-label font-semibold text-muted">{t("Por qué no pudo pagar", "Why it couldn't pay")}</dt>
          <dd>{a.why}</dd>
          <dt className="text-label font-semibold text-muted">{t("Qué cambió", "What changed")}</dt>
          <dd>{a.changed}</dd>
          <dt className="text-label font-semibold text-muted">{t("Cómo pagará la deuda anterior", "How it will pay the earlier debt")}</dt>
          <dd>{a.plan}</dd>
        </dl>
        <p className="text-label text-muted">
          {[
            a.writtenOff > 0 ? t(`Deuda anterior ${formatMoney(a.writtenOff)}`, `Earlier debt ${formatMoney(a.writtenOff)}`) : "",
            t(`Enviada el ${formatDay(a.createdAt)}`, `Sent ${formatDay(a.createdAt, "en")}`),
            a.decidedAt ? t(`decidida el ${formatDay(a.decidedAt)}`, `decided ${formatDay(a.decidedAt, "en")}`) : "",
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {a.status === "pendiente" && (
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <RowButton onClick={() => void decide(a, true)} disabled={busy !== null} busy={busy === `yes:${a.id}`}>
              {t(`Aprobar (${formatMoney(RESTART_LIMIT)})`, `Approve (${formatMoney(RESTART_LIMIT)})`)}
            </RowButton>
            <RowButton onClick={() => void decide(a, false)} disabled={busy !== null} busy={busy === `no:${a.id}`}>
              {t("Rechazar", "Decline")}
            </RowButton>
          </span>
        )}
      </li>
    );
  };

  return (
    <section id="oportunidades" className="flex max-w-[40rem] flex-col gap-2">
      <h2 className={HEADING}>{t("Solicitudes de otra oportunidad", "Second-chance requests")}</h2>
      <p className="text-pretty">
        {t(
          `Tiendas que perdieron su crédito por no pagar y piden volver. Aprobar les da ${formatMoney(RESTART_LIMIT)} de crédito del fondo, que crece con las reglas normales. Una aprobación por tienda cada 6 meses.`,
          `Shops that lost their credit for not paying and ask to come back. Approving gives them ${formatMoney(RESTART_LIMIT)} of pool credit, which grows by the normal rules. One approval per shop every 6 months.`,
        )}
      </p>
      <p role="alert" className="min-h-[1lh] font-semibold text-bad">
        {error && msg(error)}
      </p>
      {appeals === undefined ? (
        <Loading lines={3} torn={false} />
      ) : open.length === 0 ? (
        <p>{t("No hay solicitudes por revisar.", "No requests to review.")}</p>
      ) : (
        <ul className="flex flex-col gap-2">{open.map(card)}</ul>
      )}
      {done.length > 0 && (
        <>
          <TextButton onClick={() => setShowDone((v) => !v)}>
            {showDone ? t("Ocultar las decididas", "Hide decided ones") : t(`Ver las decididas (${done.length})`, `See decided ones (${done.length})`)}
          </TextButton>
          {showDone && <ul className="flex flex-col gap-2">{done.map(card)}</ul>}
        </>
      )}
    </section>
  );
}
