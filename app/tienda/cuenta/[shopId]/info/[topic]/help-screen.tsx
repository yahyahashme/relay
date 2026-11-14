"use client";

import { useParams } from "next/navigation";
import { ActionLink } from "@/components/kit/button";
import { Card } from "@/components/kit/account";
import { Stamp } from "@/components/kit/stamp";
import { Empty } from "@/components/kit/states";
import { HELP, isHelpTopic } from "@/lib/account-help";
import { useT } from "@/lib/i18n";
import { AccountPage } from "../../account-page";

/** One of Mi cuenta's explainers: how an option will work, clearly marked as not built yet. An account card with nothing to tap on it. */
export default function HelpScreen() {
  const { shopId, topic } = useParams<{ shopId: string; topic: string }>();
  const { lang, t } = useT();
  const back = <ActionLink href={`/tienda/cuenta/${shopId}`} title={t("Volver a Mi cuenta", "Back to My account")} />;

  if (!isHelpTopic(topic)) {
    return (
      <AccountPage shopId={shopId}>
        <Empty action={back}>{t("No encontramos esa página.", "We couldn't find that page.")}</Empty>
      </AccountPage>
    );
  }

  const help = HELP[topic][lang];
  return (
    <AccountPage shopId={shopId}>
      <Card as="section" className="flex flex-col gap-4 px-5 py-5">
        {/* The mark comes first, beside the title: nobody should read the steps thinking they can do them today. */}
        <header className="flex flex-col gap-2">
          <span className="text-label text-muted">{t("Así funcionará", "How it will work")}</span>
          <h1 className="text-title font-bold text-balance">{help.title}</h1>
          <span>
            <Stamp small tone="warn">
              {t("Aún no activo", "Not live yet")}
            </Stamp>
          </span>
        </header>
        <p className="text-lead text-pretty">{help.intro}</p>
        <ol className="flex flex-col divide-y divide-paper-rule">
          {help.points.map((point, i) => (
            <li key={i} className="flex items-start gap-3 py-3 text-pretty">
              <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-tint text-label font-bold text-brand">
                {i + 1}
              </span>
              <span className="pt-0.5">{point}</span>
            </li>
          ))}
        </ol>
        <p className="text-label text-muted text-pretty">
          {t(
            "Un socio autorizado revisa la identidad de cada tienda y mueve el efectivo. Relay no lo hace por su cuenta.",
            "A licensed partner checks each shop's identity and handles the cash. Relay doesn't do that on its own.",
          )}
        </p>
      </Card>
      {back}
    </AccountPage>
  );
}
