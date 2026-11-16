"use client";

import { useEffect, useState } from "react";
import { getRecourse } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";

/**
 * Full recourse: what the distributor owes the pool for vouched shops that didn't pay, beyond its
 * deposit. Its next payouts pay it first, and it can't vouch for new shops until it's paid.
 * Shows nothing while it owes nothing.
 */
export function RecourseDebt() {
  const { t } = useT();
  const [debt, setDebt] = useState(0);
  useEffect(() => {
    let live = true;
    getRecourse().then(
      (r) => live && setDebt(r.debt),
      () => {},
    );
    return () => {
      live = false;
    };
  }, []);
  if (debt <= 0) return null;
  return (
    <p role="status" className="rounded-paper border-[1.5px] border-bad bg-paper px-4 py-3 text-pretty">
      <span className="font-bold text-bad">{t(`Debe ${formatMoney(debt)} al fondo`, `You owe the pool ${formatMoney(debt)}`)}</span>
      <br />
      {t(
        "Una tienda que usted respalda no pagó y su depósito no alcanzó. Sus próximos cobros pagan esto primero. Hasta entonces no puede respaldar tiendas nuevas.",
        "A shop you back didn't pay and your deposit wasn't enough. Your next payments go to this first. Until then you can't back new shops.",
      )}
    </p>
  );
}
