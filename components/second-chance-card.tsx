"use client";

import { DetailLink } from "@/components/kit/button";
import { Card } from "@/components/kit/account";
import { MoneyText } from "@/components/kit/money";
import { formatDay, formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { RESTART_LIMIT } from "@/lib/second-chance";
import type { Shop } from "@/lib/types";

/**
 * On Mi cuenta, for a shop whose credit stopped after a default: the three ways back to $50 of credit
 * (pay the earlier debt, a distributor vouches for it, or an appeal Relay reviews).
 */
export function SecondChanceCard({ shopId, chance, oldDebt }: { shopId: string; chance: NonNullable<Shop["secondChance"]>; oldDebt: number }) {
  const { t } = useT();
  const restart = formatMoney(RESTART_LIMIT);
  const appeal =
    chance.appeal === "pendiente" ? (
      <p className="font-semibold">
        {t(`Su solicitud a Relay está en revisión desde el ${formatDay(chance.appealAt!)}.`, `Your request to Relay has been under review since ${formatDay(chance.appealAt!, "en")}.`)}
      </p>
    ) : chance.nextAppealFrom ? (
      <p>{t(`Puede pedir otra oportunidad a Relay desde el ${formatDay(chance.nextAppealFrom)}.`, `You can ask Relay for another chance from ${formatDay(chance.nextAppealFrom, "en")}.`)}</p>
    ) : (
      <>
        {chance.appeal === "rechazada" && <p>{t("Relay no aprobó su última solicitud.", "Relay didn't approve your last request.")}</p>}
        <DetailLink href={`/tienda/cuenta/${shopId}/oportunidad`}>{t("Pedir otra oportunidad a Relay", "Ask Relay for a second chance")}</DetailLink>
      </>
    );

  return (
    <Card as="section" className="flex flex-col gap-2 px-5 py-4">
      <h2 className="text-lead font-bold">{t("Otra oportunidad", "A second chance")}</h2>
      <p className="text-pretty">
        <MoneyText>
          {t(
            `Los negocios a veces caen. Su crédito puede volver con ${restart} de una de estas maneras:`,
            `Businesses sometimes fall behind. Your credit can come back at ${restart} in one of these ways:`,
          )}
        </MoneyText>
      </p>
      <ol className="flex list-decimal flex-col gap-1 pl-5 text-pretty">
        {oldDebt > 0 && (
          <li>
            <MoneyText>{t(`Pague su deuda anterior (${formatMoney(oldDebt)}). Su crédito vuelve solo.`, `Pay your earlier debt (${formatMoney(oldDebt)}). Your credit comes back by itself.`)}</MoneyText>
          </li>
        )}
        <li>{t("Pida a una distribuidora que lo conoce que lo respalde en Relay.", "Ask a distributor that knows you to back you on Relay.")}</li>
        <li className="flex flex-col items-start">
          <span>{t("Cuéntele a Relay qué pasó y qué cambió.", "Tell Relay what happened and what changed.")}</span>
          {appeal}
        </li>
      </ol>
    </Card>
  );
}
