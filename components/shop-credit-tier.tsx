"use client";

import { useState } from "react";
import { Button, TextButton } from "@/components/kit/button";
import { MoneyField } from "@/components/kit/field";
import { Paper } from "@/components/kit/paper";
import { Answer } from "@/components/kit/states";
import { depositRecourse, getOwnCredit, getRecourse, getShop, offerOwnCredit, vouchShop, withdrawRecourse } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { HIGHLY_TRUSTED_CYCLES, parseAmount, recourseRequired, shopCreditFeeBps, TRUSTED_CYCLES, trustLevel } from "@/lib/labels";
import type { Receipt } from "@/lib/types";
import { usePolling } from "@/lib/use-polling";

const percent = (bps: number) => `${(bps / 100).toFixed(2)}%`;

/**
 * What a credit sale to this shop costs the distributor (#185), and the two ways it gets cheaper:
 * the shop's own record (4 and 8 good cycles in a row), or the distributor vouching for it with a
 * deposit that covers late payers (0.25%). Shown on the distributor's view of one shop.
 */
export function ShopCreditTier({ shopId }: { shopId: string }) {
  const { t } = useT();
  const { data, reload } = usePolling(`tier-${shopId}`, async () => {
    const [shop, recourse, own] = await Promise.all([getShop(shopId), getRecourse(), getOwnCredit(shopId)]);
    return { shop, recourse, own };
  });
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<Receipt | null>(null);
  const [amount, setAmount] = useState("");

  if (!data?.shop) return null;
  const { shop, recourse, own } = data;
  const laterPaid = (shop.laterOnTime ?? 0) + (shop.laterLate ?? 0);
  const poolPaid = shop.onTime + shop.late;
  const good = shop.goodCycles ?? 0;
  const mine = shop.voucherId !== undefined && shop.voucherId === recourse.distributorId;
  const other = shop.voucherId !== undefined && !mine;
  const fullBps = shopCreditFeeBps(1, 1, good);
  const level = trustLevel(good);
  // The next $100 sale on credit still gets 0.25% only if the deposit covers 20% of it too.
  const room = Math.max(0, Math.floor((recourse.deposit / 0.2 - recourse.vouchedOut) * 100) / 100);
  const parsed = parseAmount(amount);

  async function act(action: () => Promise<Receipt>) {
    setBusy(true);
    setAnswer(null);
    const result = await action();
    if (result.ok) {
      setAmount("");
      await reload();
    }
    setAnswer(result);
    setBusy(false);
  }

  const fee = mine
    ? t(`Usted la respalda: paga ${percent(25)} por cada venta a crédito mientras su depósito la cubra.`, `You back it: you pay ${percent(25)} on each credit sale while your deposit covers it.`)
    : level === 0
      ? t(`Paga hasta ${percent(fullBps)} por cada venta a crédito.`, `You pay up to ${percent(fullBps)} on each credit sale.`)
      : t(`Tienda confiable: paga hasta ${percent(fullBps)} en lugar de 1.50%.`, `Trusted shop: you pay up to ${percent(fullBps)} instead of 1.50%.`);
  const next = level === 0 ? TRUSTED_CYCLES : HIGHLY_TRUSTED_CYCLES;
  const cycles =
    level === 2
      ? t(`${good} ciclos pagados a tiempo seguidos. Tiene la comisión más baja.`, `${good} cycles paid on time in a row. It has the lowest fee.`)
      : t(
          `${good} de ${next} ciclos pagados a tiempo seguidos para bajar a ${level === 0 ? "1.25%" : "1.00%"}. Un atraso vuelve a cero.`,
          `${good} of ${next} cycles paid on time in a row to drop to ${level === 0 ? "1.25%" : "1.00%"}. Paying late starts it over.`,
        );

  // Paper holds the facts; the buttons sit on the counter below it.
  return (
    <>
      <section className="flex flex-col gap-3" aria-label={t("Quién da los 7 días", "Who gives the 7 days")}>
        <Paper className="flex flex-col gap-2 p-4">
          <h2 className="text-lead font-bold">{t("Quién da los 7 días", "Who gives the 7 days")}</h2>
          <p className="text-pretty">
            {own
              ? t(
                  "Usted, con su propio dinero. Cuando la tienda elige «Pagar en 7 días», usted espera el pago y corre el riesgo. No paga comisión de crédito: solo el 0.10% cuando la tienda le paga.",
                  "You, with your own money. When the shop picks “Pay in 7 days”, you wait for the money and carry the risk. You pay no credit fee: only 0.10% when the shop pays you.",
                )
              : t(
                  "El fondo de crédito, con dinero de prestamistas con licencia, no suyo. Cuando la tienda elige «Pagar en 7 días», a usted le pagan al entregar y usted paga la comisión de crédito.",
                  "The credit pool, with licensed lenders' money, not yours. When the shop picks “Pay in 7 days”, you get paid at delivery and you pay the credit fee.",
                )}
          </p>
          <div className="mt-1 flex flex-col gap-1 border-t border-paper-rule pt-2">
            <h3 className="font-bold">{t("Su historial en Relay, con todas las distribuidoras", "Its record on Relay, with every distributor")}</h3>
            {poolPaid + laterPaid === 0 ? (
              <p className="text-pretty">{t("Todavía no tiene pagos a 7 días en Relay.", "No 7-day payments on Relay yet.")}</p>
            ) : (
              <ul className="flex flex-col gap-0.5">
                <li>{t(`Con el fondo: pagó a tiempo ${shop.onTime} de ${poolPaid}.`, `With the pool: paid on time ${shop.onTime} of ${poolPaid}.`)}</li>
                <li>{t(`Con distribuidoras: pagó a tiempo ${shop.laterOnTime ?? 0} de ${laterPaid}.`, `With distributors: paid on time ${shop.laterOnTime ?? 0} of ${laterPaid}.`)}</li>
                {(shop.laterOwed ?? 0) > 0 && (
                  <li>{t(`Debe ${formatMoney(shop.laterOwed ?? 0)} a 7 días ahora.`, `Owes ${formatMoney(shop.laterOwed ?? 0)} on 7 days now.`)}</li>
                )}
              </ul>
            )}
            <p className="text-label text-muted text-pretty">
              {t(
                "Solo los pagos a tiempo al fondo le suben el límite. Un atraso con usted también se lo baja.",
                "Only on-time payments to the pool raise its limit. Paying you late lowers it too.",
              )}
            </p>
          </div>
        </Paper>
        <Button
          onClick={() => act(() => offerOwnCredit(shopId, !own))}
          busy={busy}
          hint={
            own
              ? t("Vuelve al fondo: le pagan al entregar. Lo que ya está a 7 días sigue con usted.", "Back to the pool: you get paid at delivery. What's already on 7 days stays with you.")
              : t("Para tiendas que conoce, cuando no necesita el dinero hoy.", "For shops you know, when you don't need the money today.")
          }
        >
          {own ? t("Volver al fondo", "Go back to the pool") : t("Dar yo los 7 días", "Give the 7 days myself")}
        </Button>
      </section>
      <section className="flex flex-col gap-3" aria-label={t("Comisión de crédito para esta tienda", "Credit fee for this shop")}>
        <Paper className="flex flex-col gap-2 p-4">
          <h2 className="text-lead font-bold">{t("Comisión de crédito para esta tienda", "Credit fee for this shop")}</h2>
          <p className="text-pretty">{fee}</p>
          <p className="text-label text-muted text-pretty">{cycles}</p>
          <div className="mt-1 flex flex-col gap-1 border-t border-paper-rule pt-2">
            <h3 className="font-bold">{t("Su depósito de respaldo", "Your backing deposit")}</h3>
            <p className="text-pretty">
              {t(
                `${formatMoney(recourse.deposit)} en el fondo. Respalda ${formatMoney(recourse.vouchedOut)} de crédito ahora (mínimo ${formatMoney(recourse.required)}). Cabe ${formatMoney(room)} más.`,
                `${formatMoney(recourse.deposit)} in the pool. It backs ${formatMoney(recourse.vouchedOut)} of credit now (minimum ${formatMoney(recourse.required)}). Room for ${formatMoney(room)} more.`,
              )}
            </p>
            <p className="text-label text-muted text-pretty">
              {t(
                "El depósito debe ser al menos el 20% del crédito que respalda. Si no alcanza, la venta usa la comisión normal.",
                "The deposit must be at least 20% of the credit you back. If it falls short, the sale uses the normal fee.",
              )}
            </p>
          </div>
        </Paper>

        {other ? (
          <p className="text-label text-muted">{t("Otra distribuidora respalda esta tienda.", "Another distributor backs this shop.")}</p>
        ) : (
          <Button
            onClick={() => act(() => vouchShop(shopId, !mine))}
            busy={busy}
            disabled={shop.creditOwed > 0}
            hint={
              shop.creditOwed > 0
                ? t("Puede cambiarlo cuando la tienda no deba nada.", "You can change this when the shop owes nothing.")
                : mine
                  ? t("Vuelve a la comisión normal.", "It goes back to the normal fee.")
                  : t(
                      "Paga 0.25%. Si se atrasa más de 7 días, su depósito le paga al fondo y usted le cobra a la tienda.",
                      "You pay 0.25%. If it is more than 7 days late, your deposit pays the pool and you collect from the shop.",
                    )
            }
          >
            {mine ? t("Dejar de respaldar", "Stop backing") : t("Respaldar esta tienda", "Back this shop")}
          </Button>
        )}

        <MoneyField label={t("Monto del depósito", "Deposit amount")} value={amount} onChange={(event) => setAmount(event.target.value)} />
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => parsed && act(() => depositRecourse(parsed))} busy={busy} disabled={!parsed} size="sm">
            {t("Agregar al depósito", "Add to deposit")}
          </Button>
          <TextButton onClick={() => parsed && act(() => withdrawRecourse(parsed))} disabled={busy || !parsed || parsed > recourse.deposit - recourseRequired(recourse.vouchedOut)}>
            {t("Retirar", "Take out")}
          </TextButton>
        </div>
        {answer && <Answer receipt={answer} />}
      </section>
    </>
  );
}
