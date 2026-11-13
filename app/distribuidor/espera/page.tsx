"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getMyDistributor, type MyDistributor } from "@/app/distributor-actions";
import { BackLink, ButtonLink, Card, Loading, Screen } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

const POLL_MS = 3000;

/** After a distributor signs up (#130): "we're checking your business", until it's approved. */
export default function Waiting() {
  const { t } = useI18n();
  const router = useRouter();
  const [mine, setMine] = useState<MyDistributor | null | undefined>(undefined);

  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = async () => {
      const found = await getMyDistributor().catch(() => undefined);
      if (!live) return;
      if (found === null) return router.replace("/entrar");
      if (found?.status === "aprobado") return router.replace("/distribuidor");
      if (found) setMine(found);
      timer = setTimeout(check, POLL_MS);
    };
    void check();
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [router]);

  if (!mine) {
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  }

  if (mine.status === "rechazado") {
    return (
      <Screen>
        <BackLink />
        <h1 className="text-3xl font-bold">{t("No pudimos aprobar su empresa")}</h1>
        <p className="text-lg">{t("Escríbanos y le explicamos qué falta.")}</p>
        <ButtonLink href="/cuenta" variant="secondary">
          {t("Mi cuenta")}
        </ButtonLink>
      </Screen>
    );
  }

  return (
    <Screen>
      <BackLink />
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-balance">{t("Estamos revisando su empresa")}</h1>
        <p className="text-lg text-muted">{mine.businessName}</p>
      </header>
      <Card className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">{t("Qué sigue")}</h2>
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-lg">
          <li>{t("Revisamos los datos de su empresa.")}</li>
          <li>{t("Al aprobarla, su cuenta puede crear facturas.")}</li>
          <li>{t("Luego agrega sus motoristas y sus tiendas.")}</li>
        </ol>
        <p className="text-muted">{t("En el producto real, un socio con licencia verifica la empresa antes de aprobarla.")}</p>
      </Card>
      <p className="animate-pulse text-center text-lg text-muted" role="status">
        {mine.autoApprove ? t("En esta demo se aprueba sola en unos segundos.") : t("Le avisamos aquí cuando esté aprobada.")}
      </p>
    </Screen>
  );
}
