"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { getMyDrivers, type InviteView, inviteDriverAction, type MyDriver, removeDriverAction } from "@/app/driver-actions";
import { FormError, TextField } from "@/components/form";
import { BackLink, Button, Card, Chip, Label, Loading, Screen } from "@/components/ui";
import { formatMoney, formatPhone } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { chatLink } from "@/lib/whatsapp";

const inviteUrl = (token: string) =>
  `${process.env.NEXT_PUBLIC_SITE_URL || (typeof window === "undefined" ? "" : window.location.origin)}/invitacion/${token}`;

/** The invite message goes to a Salvadoran driver, so it's always Spanish. */
const inviteMessage = (name: string, distributor: string, url: string) =>
  `Hola ${name}, ${distributor} lo invita a Relay para su ruta. Cree su cuenta aquí: ${url}`;

/** A pending invite's link, ready to copy or send by WhatsApp. */
function InviteCard({ invite, distributorName }: { invite: InviteView; distributorName: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const url = inviteUrl(invite.token);
  let whatsapp: string | null = null;
  try {
    whatsapp = chatLink(invite.phone, inviteMessage(invite.name, distributorName, url));
  } catch {
    whatsapp = null;
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-brand-soft p-3">
      <p className="text-base">{t("Invitación para {name}. Envíele este enlace:", { name: invite.name })}</p>
      <p className="rounded-lg bg-card px-3 py-2 font-mono text-sm break-all">{url}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {whatsapp && (
          <a
            href={whatsapp}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-12 items-center justify-center rounded-xl bg-brand px-4 text-base font-semibold text-white active:bg-brand-dark"
          >
            {t("Enviar por WhatsApp")}
          </a>
        )}
        <button
          type="button"
          onClick={copy}
          className="min-h-12 rounded-xl border-2 border-brand bg-card px-4 text-base font-semibold text-brand active:bg-brand-soft"
        >
          {copied ? t("Copiado") : t("Copiar enlace")}
        </button>
      </div>
    </div>
  );
}

/** The distributor's drivers (#131): invite by link, see who joined, remove. */
export default function Drivers() {
  const { t, msg } = useI18n();
  const [data, setData] = useState<{ distributorName: string; drivers: MyDriver[] } | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fresh, setFresh] = useState<InviteView | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const load = useCallback(async () => setData(await getMyDrivers()), []);
  useEffect(() => {
    let live = true;
    void getMyDrivers().then((found) => {
      if (live) setData(found);
    });
    return () => {
      live = false;
    };
  }, []);

  async function invite(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const reply = await inviteDriverAction(name, phone);
    if (reply.ok) {
      setFresh(reply);
      setName("");
      setPhone("");
      await load();
    } else {
      setError(reply.message);
    }
    setBusy(false);
  }

  async function remove(id: string) {
    if (confirming !== id) {
      setConfirming(id);
      setTimeout(() => setConfirming((c) => (c === id ? null : c)), 4000);
      return;
    }
    setConfirming(null);
    const reply = await removeDriverAction(id);
    if (!reply.ok) setError(reply.message);
    if (fresh?.token === id) setFresh(null);
    await load();
  }

  if (data === undefined) {
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  }
  if (data === null) {
    return (
      <Screen>
        <BackLink href="/distribuidor" label={t("Panel")} />
        <p className="text-lg">{t("Solo la distribuidora aprobada puede hacer esto.")}</p>
      </Screen>
    );
  }

  return (
    <Screen>
      <BackLink href="/distribuidor" label={t("Panel")} />
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold">{t("Motoristas")}</h1>
        <p className="text-lg text-muted">{data.distributorName}</p>
      </header>

      <Card className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">{t("Agregar motorista")}</h2>
        <form onSubmit={invite} className="flex flex-col gap-4">
          <TextField label={t("Nombre")} autoComplete="off" required value={name} onChange={(e) => setName(e.target.value)} />
          <TextField
            label={t("Teléfono")}
            hint={t("Teléfono de El Salvador (8 dígitos).")}
            inputMode="tel"
            autoComplete="off"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          {error && <FormError>{msg(error)}</FormError>}
          <Button type="submit" busy={busy}>
            {t("Crear invitación")}
          </Button>
        </form>
        {fresh && <InviteCard invite={fresh} distributorName={data.distributorName} />}
      </Card>

      <section className="flex flex-col gap-2">
        <Label>{t("Sus motoristas")}</Label>
        {data.drivers.length === 0 ? (
          <Card>
            <p className="text-center text-lg text-muted">{t("Todavía no tiene motoristas.")}</p>
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {data.drivers.map((driver) => (
              <li key={driver.id}>
                <Card className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col">
                      <span className="text-lg font-semibold">{driver.name}</span>
                      <span className="text-muted tabular-nums">{driver.phone ? formatPhone(driver.phone) : ""}</span>
                    </div>
                    <Chip tone={driver.status === "activo" ? "paid" : "due"}>
                      {driver.status === "activo" ? t("Activo") : t("Invitación enviada")}
                    </Chip>
                  </div>
                  {driver.status === "activo" && (
                    <p className="text-base">
                      {t("Efectivo en mano")}: <strong className="tabular-nums">{formatMoney(driver.cashHeld)}</strong>
                    </p>
                  )}
                  {driver.status === "invitado" && open === driver.id && driver.inviteToken && driver.phone && (
                    <InviteCard invite={{ token: driver.inviteToken, name: driver.name, phone: driver.phone }} distributorName={data.distributorName} />
                  )}
                  <div className="flex flex-wrap gap-2">
                    {driver.status === "invitado" && (
                      <button
                        type="button"
                        onClick={() => setOpen(open === driver.id ? null : driver.id)}
                        className="min-h-12 rounded-xl border-2 border-brand px-4 text-base font-semibold text-brand active:bg-brand-soft"
                      >
                        {open === driver.id ? t("Ocultar enlace") : t("Ver enlace")}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(driver.id)}
                      className={`min-h-12 rounded-xl border-2 px-4 text-base font-semibold ${
                        confirming === driver.id ? "border-bad bg-bad text-white" : "border-line text-bad active:bg-bad-soft"
                      }`}
                    >
                      {confirming === driver.id ? t("Toque otra vez para quitar") : t("Quitar")}
                    </button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Screen>
  );
}
