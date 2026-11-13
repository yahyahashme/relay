"use client";

import { useParams, useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { acceptInviteAction, getInvite, type InvitePreview } from "@/app/driver-actions";
import { FormError, PasswordField, TextField } from "@/components/form";
import { BackLink, Button, ButtonLink, Card, Loading, Screen } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

/** A driver opens the distributor's invite link (#131): name prefilled, sets a password, lands on their route. */
export default function InviteScreen() {
  const { token } = useParams<{ token: string }>();
  const { t, msg } = useI18n();
  const router = useRouter();
  const [invite, setInvite] = useState<InvitePreview | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void getInvite(token).then((found) => {
      if (!live) return;
      setInvite(found);
      if (found) setName(found.name);
    });
    return () => {
      live = false;
    };
  }, [token]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const reply = await acceptInviteAction(token, name, password);
    if (reply.ok) {
      router.push(`/ruta/${reply.driverId}`);
      return;
    }
    setError(reply.message);
    setBusy(false);
  }

  if (invite === undefined) {
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  }

  if (invite === null) {
    return (
      <Screen>
        <BackLink />
        <h1 className="text-3xl font-bold">{t("Esta invitación ya no es válida")}</h1>
        <p className="text-lg">{t("Pida otra a su distribuidora, o entre si ya creó su cuenta.")}</p>
        <ButtonLink href="/entrar">{t("Entrar")}</ButtonLink>
      </Screen>
    );
  }

  return (
    <Screen>
      <header className="flex flex-col gap-1 pt-2">
        <h1 className="text-3xl font-bold text-balance">{t("{distributor} lo invita como motorista", { distributor: invite.distributorName })}</h1>
        <p className="text-lg text-muted">{t("Cree su cuenta para ver su ruta y registrar el efectivo.")}</p>
      </header>
      <Card>
        <p className="text-base">{t("Su usuario será su teléfono que termina en {end}.", { end: invite.phoneEnd })}</p>
      </Card>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <TextField label={t("Su nombre")} autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
        <PasswordField
          label={t("Contraseña")}
          hint={t("Al menos 8 caracteres.")}
          autoComplete="new-password"
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <FormError>{msg(error)}</FormError>}
        <Button type="submit" busy={busy}>
          {t("Crear mi cuenta")}
        </Button>
        {busy && <p className="text-center text-muted">{t("Estamos creando su cuenta de dólares digitales. Toma unos segundos.")}</p>}
      </form>
    </Screen>
  );
}
