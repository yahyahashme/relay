"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { signUpAction } from "@/app/auth-actions";
import { FormError, PasswordField, TextField } from "@/components/form";
import { BackLink, Button, Card, Screen } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { DistributorForm } from "./distributor-form";

type Choice = "tienda" | "distribuidora" | "motorista";

const CHOICES: { role: Choice; title: string; hint: string }[] = [
  { role: "tienda", title: "Tienda", hint: "Compro a distribuidores" },
  { role: "distribuidora", title: "Distribuidora", hint: "Vendo y entrego a tiendas" },
  { role: "motorista", title: "Motorista", hint: "Entrego para una distribuidora" },
];

export default function SignUp() {
  const { t, msg } = useI18n();
  const router = useRouter();
  const [role, setRole] = useState<Choice | null>(null);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (role !== "tienda") return;
    setBusy(true);
    setError(null);
    const reply = await signUpAction({ role, name, contact, password });
    if (reply.ok) {
      router.push("/cuenta");
      return;
    }
    setError(reply.message);
    setBusy(false);
  }

  return (
    <Screen wide={role === "distribuidora"}>
      <BackLink />
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold">{t("Crear cuenta")}</h1>
        <p className="text-lg text-muted">{t("Es gratis. Las tiendas nunca pagan comisiones.")}</p>
      </header>

      <section className="flex max-w-md flex-col gap-2" aria-labelledby="who">
        <h2 id="who" className="text-xl font-semibold">
          {t("¿Qué es usted?")}
        </h2>
        <div className="flex flex-col gap-2" role="radiogroup" aria-labelledby="who">
          {CHOICES.map((choice) => (
            <button
              key={choice.role}
              type="button"
              role="radio"
              aria-checked={role === choice.role}
              onClick={() => {
                setRole(choice.role);
                setError(null);
              }}
              className={`flex min-h-16 items-center justify-between gap-3 rounded-2xl border-2 px-4 py-2 text-left transition-colors duration-150 ${
                role === choice.role ? "border-brand bg-brand-soft" : "border-line bg-card active:bg-brand-soft"
              }`}
            >
              <span className="flex flex-col">
                <span className="text-lg font-semibold">{t(choice.title)}</span>
                <span className="text-muted">{t(choice.hint)}</span>
              </span>
              <span
                aria-hidden
                className={`flex size-7 shrink-0 items-center justify-center rounded-full border-2 ${
                  role === choice.role ? "border-brand bg-brand text-white" : "border-line"
                }`}
              >
                {role === choice.role && (
                  <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m4.5 10.5 3.5 3.5 7.5-8" />
                  </svg>
                )}
              </span>
            </button>
          ))}
        </div>
      </section>

      {role === "motorista" && (
        <Card className="flex flex-col gap-2">
          <p className="text-lg">{t("Los motoristas se registran con la invitación de su distribuidora.")}</p>
          <p className="text-muted">{t("Pídale el enlace a su distribuidora y ábralo en este teléfono.")}</p>
        </Card>
      )}

      {role === "distribuidora" && <DistributorForm />}

      {role === "tienda" && (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <TextField
            label={t("Su nombre")}
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <TextField
            label={t("Teléfono o correo")}
            hint={t("Teléfono de El Salvador (8 dígitos) o correo.")}
            autoComplete="username"
            inputMode="email"
            required
            value={contact}
            onChange={(e) => setContact(e.target.value)}
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
            {t("Crear cuenta")}
          </Button>
          {busy && <p className="text-center text-muted">{t("Estamos creando su cuenta de dólares digitales. Toma unos segundos.")}</p>}
        </form>
      )}

      <p className="text-center text-lg">
        {t("¿Ya tiene cuenta?")}{" "}
        <Link href="/entrar" className="font-semibold text-brand underline">
          {t("Entrar")}
        </Link>
      </p>
    </Screen>
  );
}
