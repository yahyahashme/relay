"use client";

import { setLang, useT } from "@/lib/i18n";

/** Español / English. The language on screen is plain ink (a fact); the other one is a blue link (an action). */
export function LangSwitch() {
  const { lang } = useT();
  const option = (value: "es" | "en", label: string, name: string) => (
    <button
      type="button"
      onClick={() => setLang(value)}
      aria-pressed={lang === value}
      aria-label={name}
      lang={value}
      className={`relative min-h-(--band-h) min-w-11 px-2 text-label font-bold tracking-[0.08em] before:absolute before:inset-x-0 before:-bottom-2 before:top-0 gloves:min-w-[56px] gloves:before:-bottom-5 ${
        lang === value ? "text-ink" : "text-brand underline decoration-2 underline-offset-4"
      }`}
    >
      {label}
    </button>
  );
  return (
    <div role="group" aria-label="Idioma / Language" className="-mr-2 flex shrink-0 items-center">
      {option("es", "ES", "Español")}
      <span aria-hidden className="text-muted gloves:px-1">
        ·
      </span>
      {option("en", "EN", "English")}
    </div>
  );
}

/**
 * The thin band above every screen, like the MUESTRA or COPIA marking on a slip: this is a demo.
 * It stays at the top while the screen scrolls, and holds the language switch.
 */
export function TestnetBand() {
  const { t } = useT();
  return (
    <div className="sticky top-0 z-5 border-b border-dashed border-counter-rule bg-paper pt-[env(safe-area-inset-top)]">
      <div className="flex min-h-(--band-h) items-center justify-between gap-3 pl-[max(var(--gutter),env(safe-area-inset-left))] pr-[max(var(--gutter),env(safe-area-inset-right))]">
        <p className="py-1 text-[0.6875rem]/[1.3] font-semibold uppercase tracking-[0.14em] text-muted text-balance">
          {t("Demo en testnet · dinero de prueba · cash-in simulado", "Testnet demo · test money · simulated cash-in")}
        </p>
        <LangSwitch />
      </div>
    </div>
  );
}
