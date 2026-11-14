"use client";

import { useEffect, useState } from "react";
import { Slip } from "@/components/kit/layout";
import { Failure } from "@/components/kit/states";
import { useT } from "@/lib/i18n";

/** Something broke while drawing a screen: a slip, one sentence, one way out. */
export default function ErrorScreen({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useT();
  const [retrying, setRetrying] = useState(false);
  useEffect(() => {
    console.error("[screen]", error.digest ?? error.message);
  }, [error]);
  return (
    <Slip className="pt-6">
      <h1 className="text-title font-bold">{t("Algo salió mal", "Something went wrong")}</h1>
      <Failure
        busy={retrying}
        onRetry={() => {
          setRetrying(true);
          reset();
          // If the screen breaks again this page stays: give the button back.
          setTimeout(() => setRetrying(false), 1500);
        }}
      >
        {t("No pudimos mostrar esta pantalla. Su dinero y sus datos están como estaban.", "We couldn't show this screen. Your money and your data are as they were.")}
      </Failure>
    </Slip>
  );
}
