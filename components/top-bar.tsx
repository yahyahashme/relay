"use client";

import { type Lang, setLang, useHtmlLang, useI18n } from "@/lib/i18n";

const OPTIONS: { lang: Lang; label: string; name: string }[] = [
  { lang: "es", label: "ES", name: "Español" },
  { lang: "en", label: "EN", name: "English" },
];

/** The test-mode banner on every screen, with the language switch at its right end. */
export function TopBar() {
  const { lang, t } = useI18n();
  useHtmlLang(lang);
  return (
    <div className="flex items-center gap-3 bg-warn-soft py-1.5 pl-4 pr-2 text-warn">
      <p className="min-w-0 flex-1 text-center text-sm font-medium text-balance">
        {t("Demo en testnet · dinero de prueba · cash-in simulado")}
      </p>
      <div role="group" aria-label={t("Idioma")} className="flex shrink-0 rounded-lg bg-card/70 p-0.5 ring-1 ring-warn/25">
        {OPTIONS.map((option) => (
          <button
            key={option.lang}
            type="button"
            lang={option.lang}
            aria-label={option.name}
            aria-pressed={lang === option.lang}
            onClick={() => setLang(option.lang)}
            className={`min-h-9 min-w-11 rounded-md px-2 text-sm font-bold tracking-wide transition-colors duration-150 ${
              lang === option.lang ? "bg-brand text-white" : "text-warn active:bg-warn-soft"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
