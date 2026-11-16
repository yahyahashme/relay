"use client";

import { VOUCHED_FIRST_LIMIT } from "@/lib/credit-unlock";
import { formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { CREDIT_FEE_BPS, RECOURSE_COVER_BPS, RECOURSE_FEE_BPS } from "@/lib/labels";

const percent = (bps: number) => `${(bps / 100).toFixed(2)}%`;

/**
 * What "Respaldar" means for the distributor (#227), shown above the search for shops on Relay:
 * what it costs, what its deposit covers, and what the shop gets.
 */
export function VouchNote() {
  const { t } = useT();
  const fee = percent(RECOURSE_FEE_BPS);
  const full = percent(CREDIT_FEE_BPS);
  const cover = `${RECOURSE_COVER_BPS / 100}%`;
  const first = formatMoney(VOUCHED_FIRST_LIMIT);
  return (
    <div className="flex flex-col gap-1.5 rounded-paper bg-paper px-4 py-3 text-pretty">
      <p className="font-bold">{t("Respaldar una tienda", "Back a shop")}</p>
      <ul className="flex list-disc flex-col gap-1 pl-5">
        <li>
          {t(
            `Usted conoce a la tienda y responde por ella. Cada venta a crédito le cuesta ${fee} en vez de hasta ${full}.`,
            `You know the shop and answer for it. Each credit sale costs you ${fee} instead of up to ${full}.`,
          )}
        </li>
        <li>
          {t(
            `Su depósito de respaldo debe cubrir el ${cover} de lo que la tienda debe. Si la tienda no paga, usted paga lo que deba, primero de su depósito y luego de sus próximos cobros, y le cobra a la tienda.`,
            `Your backing deposit must cover ${cover} of what the shop owes. If the shop doesn't pay, you pay what it owes, first from your deposit and then from your next payments, and collect from the shop.`,
          )}
        </li>
        <li>
          {t(
            `Una tienda nueva recibe ${first} de crédito al momento, sin esperar 2 pagos, si su depósito lo cubre.`,
            `A new shop gets ${first} of credit right away, without waiting for 2 payments, if your deposit covers it.`,
          )}
        </li>
        <li>{t("Solo puede respaldar una tienda que no debe nada.", "You can only back a shop that owes nothing.")}</li>
      </ul>
    </div>
  );
}
