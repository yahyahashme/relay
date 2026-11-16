"use client";

import { Card, icons, Meter, RowGroup, RowLink } from "@/components/kit/account";
import { Stamp, type StampTone } from "@/components/kit/stamp";
import { type CreditScore, SCORE_LABEL, type ScoreLabel } from "@/lib/credit";
import { useT } from "@/lib/i18n";

/** How long a shared history link stays valid. */
export const SHARE_DAYS = 30;

/** The link a shop sends to a lender or a new supplier: read-only, and it expires. */
export function shareLink(shopId: string, now: number, origin: string): { url: string; until: string } {
  const until = new Date(now + SHARE_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return { url: `${origin}/compartido/${shopId}?hasta=${until}`, until };
}

/** The stamp's ink. The word on it says which of the four it is; the colour only says good, careful or bad. */
const TONE: Record<ScoreLabel, StampTone> = {
  excelente: "ok",
  bueno: "ok",
  regular: "warn",
  riesgo: "bad",
};

/**
 * The Relay score and why (#137): the number, a bar, its word as a status label, and each reason in plain words with
 * "A favor" or "En contra" beside it. It has no paper of its own, so it can sit inside a slip (the shared
 * record) or on a sheet (Mi cuenta). `tips` are for the shop itself, not for whoever it shares the record with.
 */
export function ScoreFacts({ score, tips = true }: { score: CreditScore; tips?: boolean }) {
  const { lang, t } = useT();
  return (
    <>
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="flex items-baseline gap-2">
            <span className="font-mono text-[2.5rem] leading-none font-semibold tracking-[-0.03em]">{score.score}</span>
            <span className="text-base text-muted">{t("de 10", "of 10")}</span>
          </p>
          <Stamp tone={TONE[score.label]}>{SCORE_LABEL[score.label][lang]}</Stamp>
        </div>
        <Meter used={score.score} of={10} label={t("Calificación Relay", "Relay rating")} />
      </div>
      <ul className="flex flex-col border-t border-paper-rule">
        {score.reasons.map((reason) => (
          <li key={reason.es} className="flex items-baseline justify-between gap-3 border-b border-paper-rule py-2">
            <span className="min-w-0 text-pretty">{reason[lang]}</span>
            <span className={`shrink-0 text-label font-semibold ${reason.good ? "text-ok" : "text-bad"}`}>
              {reason.good ? t("A favor", "For") : t("En contra", "Against")}
            </span>
          </li>
        ))}
      </ul>
      {score.later && (
        <p className="text-pretty">
          {t(
            `Pagó a tiempo ${score.later.onTime} de ${score.later.paid} con sus distribuidoras, a 7 días.`,
            `Paid its distributors on time ${score.later.onTime} of ${score.later.paid} times, on 7 days.`,
          )}
        </p>
      )}
      {score.isNew && (
        <p className="text-muted text-pretty">{t("Todavía es nuevo en Relay: la calificación se afina con cada crédito.", "Still new on Relay: the rating sharpens with each credit.")}</p>
      )}
      {tips && score.tips.length > 0 && (
        <div className="flex flex-col gap-1">
          <h3 className="font-bold">{t("Para subirlo", "To raise it")}</h3>
          {score.tips.map((tip) => (
            <p key={tip.es} className="text-muted text-pretty">
              {tip[lang]}
            </p>
          ))}
        </div>
      )}
      <p className="text-label text-muted text-pretty">{t("Qué tan probable es que pague su crédito en 7 días, de 1 a 10. Calificación propia de Relay, no de un buró de crédito.", "How likely it is to repay its credit within 7 days, from 1 to 10. Relay's own rating, not a credit bureau's.")}</p>
    </>
  );
}

/** The score on its own sheet, for Mi cuenta. With `shareFrom`, the blue row under it sends the shop's history link by WhatsApp. */
export function CreditScoreCard({ score, shareFrom }: { score: CreditScore; shareFrom?: { shopId: string; shopName: string; now: number } }) {
  const { t } = useT();
  const share = shareFrom && typeof window !== "undefined" ? shareLink(shareFrom.shopId, shareFrom.now, window.location.origin) : null;

  return (
    <div className="flex flex-col gap-2">
      <Card className="flex flex-col gap-3 px-4 py-4">
        <ScoreFacts score={score} />
      </Card>
      {share && shareFrom && (
        <>
          <RowGroup>
            <RowLink
              external
              mark={icons.share}
              href={`https://wa.me/?text=${encodeURIComponent(
                t(`Historial de pagos de ${shareFrom.shopName} en Relay: ${share.url}`, `${shareFrom.shopName}'s payment history on Relay: ${share.url}`),
              )}`}
              title={t("Compartir mi historial", "Share my history")}
              hint={t(`Por WhatsApp. El enlace vale ${SHARE_DAYS} días`, `On WhatsApp. The link lasts ${SHARE_DAYS} days`)}
            />
          </RowGroup>
          <p className="text-label text-muted text-pretty">
            {t(
              "Quien tenga el enlace puede ver su puntaje, su límite y cuántos pagos hizo. Envíelo solo a quien usted elija. Relay no comparte su historial sin su permiso.",
              "Anyone with the link can see your score, your limit and how many payments you made. Send it only to people you choose. Relay never shares your history without your permission.",
            )}
          </p>
        </>
      )}
    </div>
  );
}
