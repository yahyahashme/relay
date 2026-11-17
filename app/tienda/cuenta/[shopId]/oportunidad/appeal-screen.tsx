"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { ActionLink, Button } from "@/components/kit/button";
import { AreaField } from "@/components/kit/field";
import { Answer, Empty, Failure, Loading } from "@/components/kit/states";
import { getShop, sendAppeal } from "@/lib/api";
import { formatDay, formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { APPEAL_MAX_CHARS, type AppealInput, RESTART_LIMIT } from "@/lib/second-chance";
import type { Receipt } from "@/lib/types";
import { usePolling } from "@/lib/use-polling";
import { AccountPage } from "../account-page";

const QUESTIONS: { key: keyof AppealInput; es: string; en: string; hintEs: string; hintEn: string }[] = [
  { key: "why", es: "¿Por qué no pudo pagar?", en: "Why couldn't you pay?", hintEs: "Por ejemplo: una enfermedad, un robo, ventas bajas.", hintEn: "For example: an illness, a theft, slow sales." },
  { key: "changed", es: "¿Qué cambió desde entonces?", en: "What has changed since then?", hintEs: "Lo que hace distinto hoy.", hintEn: "What you do differently today." },
  { key: "plan", es: "¿Cómo va a pagar la deuda anterior?", en: "How will you pay the earlier debt?", hintEs: "Por ejemplo: $10 cada semana.", hintEn: "For example: $10 every week." },
];

/** "Pedir otra oportunidad" (second chance, route 3): a shop whose credit stopped asks Relay to restart it at $50. */
export default function AppealScreen() {
  const { shopId } = useParams<{ shopId: string }>();
  const { t, lang } = useT();
  const { data, failed, reload } = usePolling(`appeal-${shopId}`, () => getShop(shopId), 0);
  const [form, setForm] = useState<AppealInput>({ why: "", changed: "", plan: "" });
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  if (data === undefined) return <AccountPage shopId={shopId}>{failed ? <Failure onRetry={reload} /> : <Loading torn={false} lines={5} />}</AccountPage>;
  const chance = data?.secondChance;
  const sent = receipt?.ok === true;
  if (!data || (!chance && !sent)) {
    return (
      <AccountPage shopId={shopId}>
        <Empty action={<ActionLink href={`/tienda/cuenta/${shopId}`} title={t("Volver a Mi cuenta", "Back to My account")} />}>
          {t("Su tienda no necesita una solicitud ahora.", "Your shop doesn't need a request right now.")}
        </Empty>
      </AccountPage>
    );
  }
  const waiting = !sent && chance?.appeal === "pendiente";
  const later = !sent && chance?.nextAppealFrom;

  async function send() {
    if (busy) return;
    setBusy(true);
    setReceipt(null);
    setReceipt(await sendAppeal(shopId, form));
    setBusy(false);
  }

  return (
    <AccountPage shopId={shopId}>
      <h1 className="text-title font-bold text-balance">{t("Pedir otra oportunidad", "Ask for a second chance")}</h1>
      <p className="text-pretty">
        {t(
          `Los negocios a veces caen. Cuéntenos qué pasó. Si Relay lo aprueba, su crédito vuelve con ${formatMoney(RESTART_LIMIT)} y crece de nuevo cuando paga a tiempo. Se aprueba una vez cada 6 meses.`,
          `Businesses sometimes fall behind. Tell us what happened. If Relay approves it, your credit starts again at ${formatMoney(RESTART_LIMIT)} and grows again when you pay on time. One approval every 6 months.`,
        )}
      </p>
      {waiting ? (
        <p className="font-semibold text-pretty">
          {t(
            `Su solicitud está en revisión desde el ${formatDay(chance!.appealAt!)}. Le avisaremos.`,
            `Your request has been under review since ${formatDay(chance!.appealAt!, "en")}. We'll let you know.`,
          )}
        </p>
      ) : later ? (
        <p className="font-semibold text-pretty">
          {t(`Puede pedir otra oportunidad desde el ${formatDay(later)}.`, `You can ask again from ${formatDay(later, "en")}.`)}
        </p>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          {QUESTIONS.map((q) => (
            <AreaField
              key={q.key}
              label={t(q.es, q.en)}
              hint={lang === "en" ? q.hintEn : q.hintEs}
              value={form[q.key]}
              maxLength={APPEAL_MAX_CHARS}
              required
              minLength={10}
              disabled={sent}
              onChange={(e) => {
                setForm({ ...form, [q.key]: e.target.value });
                setReceipt(null);
              }}
            />
          ))}
          <div className="flex flex-col gap-1">
            <div className="min-h-11">{receipt && <Answer receipt={receipt} />}</div>
            {!sent && (
              <Button type="submit" busy={busy}>
                {t("Enviar solicitud", "Send request")}
              </Button>
            )}
          </div>
        </form>
      )}
    </AccountPage>
  );
}
