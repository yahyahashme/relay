"use client";

import { useRef, useState } from "react";
import { resetDemo } from "@/app/demo-reset-actions";
import { Button } from "@/components/kit/button";
import { Answer } from "@/components/kit/states";
import { useSecondTap } from "@/components/tap-shield";
import { useT } from "@/lib/i18n";
import type { Receipt } from "@/lib/types";

/**
 * "Reiniciar demo" (#223), first thing on /admin so it's one tap at the booth: the demo shops owe
 * nothing again, have their $200 limit and $500, and demo phones set a new PIN. It asks for a second tap.
 */
export function DemoReset() {
  const { t } = useT();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<Receipt | null>(null);
  const running = useRef(false);
  const secondTap = useSecondTap();

  async function tap() {
    if (running.current) return;
    if (!asking) {
      secondTap.asked();
      setAsking(true);
      setTimeout(() => setAsking(false), 4000);
      return;
    }
    if (secondTap.tooSoon()) return;
    running.current = true;
    setAsking(false);
    setBusy(true);
    setAnswer(null);
    try {
      setAnswer(await resetDemo());
    } catch {
      setAnswer({ ok: false, message: "No se pudo completar. Intente de nuevo." });
    }
    setBusy(false);
    running.current = false;
  }

  return (
    <section id="reiniciar-demo" className="flex max-w-[34rem] flex-col gap-2 rounded-[2px] bg-paper p-4">
      <h2 className="text-lead leading-tight font-bold">{t("Reiniciar demo", "Reset the demo")}</h2>
      <p>
        {t(
          "Las 3 tiendas de demo vuelven al principio: no deben nada, tienen $200 de crédito y $500 en dólares digitales, y cada teléfono crea su PIN otra vez.",
          "The 3 demo shops go back to the start: they owe nothing, have $200 of credit and $500 in digital dollars, and each phone sets its PIN again.",
        )}
      </p>
      <p className="text-label text-muted">
        {t(
          "Las facturas pagadas quedan en el historial: el registro no se puede borrar. Tarda unos 30 segundos.",
          "Paid invoices stay in the history: the record can't be erased. It takes about 30 seconds.",
        )}
      </p>
      <Button onClick={() => void tap()} busy={busy} tone={asking ? "danger" : "primary"}>
        {asking ? t("Toque otra vez para reiniciar", "Tap again to reset") : t("Reiniciar demo", "Reset the demo")}
      </Button>
      <div className="min-h-11">{answer && <Answer receipt={answer} />}</div>
    </section>
  );
}
