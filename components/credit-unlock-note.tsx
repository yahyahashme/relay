"use client";

import { useState } from "react";
import { formatDay } from "@/lib/format";
import { useT } from "@/lib/i18n";
import type { Shop } from "@/lib/types";

/** For a shop that never had credit (#217): how it opens, and how far along it is. */
export function CreditUnlockNote({ unlock }: { unlock: NonNullable<Shop["unlock"]> }) {
  const { t } = useT();
  const { paid, needed, nextFrom } = unlock;
  const [now] = useState(() => Date.now());
  const soon = nextFrom && Date.parse(nextFrom) > now;
  return (
    <p className="text-pretty">
      {t(
        `«Pagar en 7 días» se abre después de ${needed} entregas pagadas en dólares digitales, con una semana entre ellas. Lleva ${paid} de ${needed}.`,
        `“Pay in 7 days” opens after ${needed} deliveries paid in digital dollars, a week apart. ${paid} of ${needed} so far.`,
      )}
      {soon && ` ${t(`La próxima cuenta desde el ${formatDay(nextFrom)}.`, `The next one counts from ${formatDay(nextFrom, "en")}.`)}`}
    </p>
  );
}
