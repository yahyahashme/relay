"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { signUpDistributorAction } from "@/app/distributor-actions";
import { FormError, PasswordField, TextField } from "@/components/form";
import { Button } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

// The same list as lib/server/distributors.ts SELLS (the server checks it again).
const SELLS = ["Snacks", "Bebidas", "Pan", "Lácteos", "Abarrotes", "Limpieza", "Otros"];

/**
 * Distributor sign-up (#130): "Su empresa" then "Su cuenta". Two steps on a
 * phone; on a laptop both sections sit side by side and it's one screen.
 */
export function DistributorForm() {
  const { t, msg } = useI18n();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [businessName, setBusinessName] = useState("");
  const [nit, setNit] = useState("");
  const [address, setAddress] = useState("");
  const [sells, setSells] = useState<string[]>([]);
  const [shopsApprox, setShopsApprox] = useState("");
  const [driversApprox, setDriversApprox] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (item: string) => setSells((list) => (list.includes(item) ? list.filter((s) => s !== item) : [...list, item]));

  /** Step 1's own checks, so the phone flow catches them before step 2. */
  function businessProblem(): string | null {
    if (businessName.trim().length < 2) return "Escriba el nombre de la empresa.";
    if (nit.replace(/\D/g, "").length !== 14) return "El NIT debe tener 14 dígitos.";
    if (address.trim().length < 5) return "Escriba la dirección de la empresa.";
    if (sells.length === 0) return "Elija qué vende.";
    return null;
  }

  function next() {
    const problem = businessProblem();
    setError(problem);
    if (!problem) setStep(2);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const problem = businessProblem();
    if (problem) {
      setError(problem);
      setStep(1);
      return;
    }
    setBusy(true);
    setError(null);
    const reply = await signUpDistributorAction({
      name,
      contact,
      password,
      details: { businessName, nit, address, sells, shopsApprox, driversApprox },
    });
    if (reply.ok) {
      router.push("/distribuidor/espera");
      return;
    }
    setError(reply.message);
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="grid gap-6 lg:grid-cols-2">
        <fieldset className={`flex-col gap-4 ${step === 1 ? "flex" : "hidden lg:flex"}`}>
          <legend className="mb-4 text-xl font-semibold">
            <span className="lg:hidden">{t("Paso {n} de 2", { n: 1 })} · </span>
            {t("Su empresa")}
          </legend>
          <TextField label={t("Nombre de la empresa")} autoComplete="organization" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
          <TextField label={t("NIT")} hint={t("14 dígitos, con o sin guiones.")} inputMode="numeric" required value={nit} onChange={(e) => setNit(e.target.value)} />
          <TextField label={t("Dirección")} autoComplete="street-address" required value={address} onChange={(e) => setAddress(e.target.value)} />
          <div className="flex flex-col gap-1.5">
            <p className="text-base font-semibold" id="sells">
              {t("¿Qué vende?")}
            </p>
            <div className="flex flex-wrap gap-2" role="group" aria-labelledby="sells">
              {SELLS.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={sells.includes(item)}
                  onClick={() => toggle(item)}
                  className={`min-h-12 rounded-full border-2 px-4 text-base font-medium ${
                    sells.includes(item) ? "border-brand bg-brand text-white" : "border-line bg-card active:bg-brand-soft"
                  }`}
                >
                  {t(item)}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField label={t("Tiendas (aprox.)")} inputMode="numeric" value={shopsApprox} onChange={(e) => setShopsApprox(e.target.value)} />
            <TextField label={t("Motoristas (aprox.)")} inputMode="numeric" value={driversApprox} onChange={(e) => setDriversApprox(e.target.value)} />
          </div>
        </fieldset>

        <fieldset className={`flex-col gap-4 ${step === 2 ? "flex" : "hidden lg:flex"}`}>
          <legend className="mb-4 text-xl font-semibold">
            <span className="lg:hidden">{t("Paso {n} de 2", { n: 2 })} · </span>
            {t("Su cuenta")}
          </legend>
          <TextField label={t("Nombre de la persona de contacto")} autoComplete="name" required={step === 2} value={name} onChange={(e) => setName(e.target.value)} />
          <TextField
            label={t("Teléfono o correo")}
            hint={t("Teléfono de El Salvador (8 dígitos) o correo.")}
            autoComplete="username"
            inputMode="email"
            required={step === 2}
            value={contact}
            onChange={(e) => setContact(e.target.value)}
          />
          <PasswordField
            label={t("Contraseña")}
            hint={t("Al menos 8 caracteres.")}
            autoComplete="new-password"
            minLength={8}
            required={step === 2}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="rounded-xl bg-brand-soft px-3 py-2 text-brand">
            {t("En el producto real, un socio con licencia verifica la empresa antes de aprobarla.")}
          </p>
        </fieldset>
      </div>

      {error && <FormError>{msg(error)}</FormError>}

      {step === 1 && (
        <div className="lg:hidden">
          <Button onClick={next}>{t("Siguiente")}</Button>
        </div>
      )}
      <div className={`flex-col gap-3 ${step === 2 ? "flex" : "hidden lg:flex"}`}>
        <Button type="submit" busy={busy}>
          {t("Crear cuenta")}
        </Button>
        {step === 2 && (
          <button type="button" onClick={() => setStep(1)} disabled={busy} className="min-h-12 text-lg font-semibold text-brand lg:hidden">
            {t("Atrás")}
          </button>
        )}
        {busy && <p className="text-center text-muted">{t("Estamos creando su cuenta de dólares digitales. Toma unos segundos.")}</p>}
      </div>
    </form>
  );
}
