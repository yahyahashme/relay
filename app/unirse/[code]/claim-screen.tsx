"use client";

import { useParams, useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { claimShopAction, getShopInvite } from "@/app/shop-actions";
import { FormError, PasswordField, TextField } from "@/components/form";
import { BackLink, Button, ButtonLink, Card, Loading, Screen } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

/**
 * A shop owner opens a distributor's invite (#132): their own account, their
 * own shop name, and the invoices the distributor already made stay theirs.
 * (#134 turns this into the full step-by-step shop sign-up.)
 */
export default function ClaimScreen() {
  const { code } = useParams<{ code: string }>();
  const { t, msg } = useI18n();
  const router = useRouter();
  const [invite, setInvite] = useState<{ distributorName: string } | null | undefined>(undefined);
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [shopName, setShopName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void getShopInvite(code).then((found) => {
      if (live) setInvite(found);
    });
    return () => {
      live = false;
    };
  }, [code]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const reply = await claimShopAction(code, { ownerName, phone, password, shopName });
    if (reply.ok) {
      router.push(`/tienda/cuenta/${reply.shopId}`);
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
        <h1 className="text-3xl font-bold">{t("Este código ya no es válido")}</h1>
        <p className="text-lg">{t("Pida otro a su distribuidora, o entre si ya creó su cuenta.")}</p>
        <ButtonLink href="/entrar">{t("Entrar")}</ButtonLink>
      </Screen>
    );
  }

  return (
    <Screen>
      <header className="flex flex-col gap-1 pt-2">
        <h1 className="text-3xl font-bold text-balance">{t("{distributor} lo agregó en Relay", { distributor: invite.distributorName })}</h1>
        <p className="text-lg text-muted">{t("Cree su cuenta para pagar sus facturas desde el teléfono.")}</p>
      </header>
      <Card>
        <p className="text-base">{t("Sus facturas de {distributor} ya estarán en su cuenta.", { distributor: invite.distributorName })}</p>
      </Card>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <TextField label={t("Nombre de su tienda")} autoComplete="organization" required value={shopName} onChange={(e) => setShopName(e.target.value)} />
        <TextField label={t("Su nombre")} autoComplete="name" required value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
        <TextField
          label={t("Teléfono")}
          hint={t("Teléfono de El Salvador (8 dígitos).")}
          inputMode="tel"
          autoComplete="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
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
      </form>
    </Screen>
  );
}
