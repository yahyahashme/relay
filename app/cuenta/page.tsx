"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { type CurrentUser, getCurrentUser, signOutAction } from "@/app/auth-actions";
import { BackLink, Button, ButtonLink, Card, Label, Loading, Screen } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

const ROLE_LABEL: Record<CurrentUser["role"], string> = {
  tienda: "Tienda",
  distribuidora: "Distribuidora",
  motorista: "Motorista",
  admin: "Administrador",
};

/** "GDX3…U7" for a long address. */
const short = (address: string) => `${address.slice(0, 4)}…${address.slice(-4)}`;

/** The signed-in person's account (#129). The role screens build on this (#130, #131, #134). */
export default function Account() {
  const { t } = useI18n();
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null | undefined>(undefined);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let live = true;
    void getCurrentUser().then((found) => {
      if (!live) return;
      if (!found) router.replace("/entrar");
      else setUser(found);
    });
    return () => {
      live = false;
    };
  }, [router]);

  async function signOut() {
    setLeaving(true);
    await signOutAction();
    router.replace("/");
  }

  if (!user) {
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  }

  return (
    <Screen>
      <BackLink />
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold">{t("Hola, {name}", { name: user.name })}</h1>
        <p className="text-lg text-muted">{t("Su cuenta está lista.")}</p>
      </header>

      <Card className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t("Tipo de cuenta")}</Label>
            <p className="text-lg font-semibold">{t(ROLE_LABEL[user.role])}</p>
          </div>
          <div className="min-w-0">
            <Label>{t("Teléfono o correo")}</Label>
            <p className="truncate text-lg font-semibold">{user.contact}</p>
          </div>
        </div>
        <div>
          <Label>{t("Cuenta de dólares digitales")}</Label>
          <p className="text-lg font-semibold tabular-nums">{short(user.stellarAddress)}</p>
          <a href={user.explorerUrl} target="_blank" rel="noreferrer" className="text-sm text-brand underline">
            {t("Ver detalles")}
          </a>
        </div>
      </Card>

      <ButtonLink href="/" variant="secondary">
        {t("Ir al inicio")}
      </ButtonLink>
      <Button onClick={signOut} busy={leaving} variant="secondary">
        {t("Cerrar sesión")}
      </Button>
    </Screen>
  );
}
