"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { signUpLenderAction } from "@/app/lender-actions";
import { Field, PasswordField } from "@/components/kit/field";
import { Form, FormHead, FormSubmit } from "@/components/kit/form";
import { type Blank, blankOf } from "@/lib/form-errors";
import { useT } from "@/lib/i18n";

/**
 * Lender sign-up (#207), one slip: the business (name, country, licence) and the person to talk to.
 * Relay approves it on the contract before it can put money in (/prestamista waits for that).
 */
export function LenderForm() {
  const { t, msg } = useT();
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [country, setCountry] = useState("El Salvador");
  const [licence, setLicence] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const reply = await signUpLenderAction({ name, contact, password, details: { businessName, country, licence } });
    if (reply.ok) {
      router.push("/prestamista");
      return;
    }
    setError(reply.message);
    setBusy(false);
  }

  // A message about one blank goes under that blank; anything else goes above the button.
  const blank = blankOf(error);
  const under = (which: Blank) => (error && blank === which ? msg(error) : undefined);
  const aboveButton = error && blank === undefined ? msg(error) : undefined;

  return (
    <Form onSubmit={submit} error={error}>
      <FormHead step={t("Crear cuenta", "Create account")} title={t("Prestamista", "Lender")}>
        {t(
          "Para empresas con licencia para prestar. Relay revisa la empresa antes de aprobarla. Las distribuidoras no ponen dinero en el fondo.",
          "For businesses licensed to lend. Relay checks the business before approving it. Distributors don't put money in the pool.",
        )}
      </FormHead>
      <Field
        label={t("Nombre de la empresa", "Business name")}
        autoComplete="organization"
        autoCapitalize="words"
        required
        value={businessName}
        onChange={(e) => setBusinessName(e.target.value)}
        error={under("businessName")}
      />
      <Field label={t("País", "Country")} autoComplete="country-name" required value={country} onChange={(e) => setCountry(e.target.value)} error={under("country")} />
      <Field
        label={t("Número de licencia o registro", "Licence or registration number")}
        hint={t("El que le dio el regulador de su país.", "The one your country's regulator gave you.")}
        autoComplete="off"
        autoCapitalize="characters"
        required
        value={licence}
        onChange={(e) => setLicence(e.target.value)}
        error={under("licence")}
      />
      <Field
        label={t("Nombre de la persona de contacto", "Contact person's name")}
        autoComplete="name"
        autoCapitalize="words"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={under("name")}
      />
      <Field
        label={t("Teléfono o correo", "Phone or email")}
        hint={t("Teléfono de El Salvador (8 dígitos) o correo.", "A Salvadoran phone number (8 digits) or an email.")}
        autoComplete="username"
        inputMode="email"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        required
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        error={under("contact")}
      />
      <PasswordField
        label={t("Contraseña", "Password")}
        hint={t("Al menos 8 caracteres.", "At least 8 characters.")}
        autoComplete="new-password"
        minLength={8}
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={under("password")}
      />
      <p className="text-muted text-pretty">
        {t(
          "En la demo le damos $5,000 en dólares de prueba para ponerlos en el fondo.",
          "In the demo we give you $5,000 in test dollars to put in the pool.",
        )}
      </p>
      <FormSubmit
        error={aboveButton}
        note={busy ? t("Estamos creando su cuenta de dólares digitales. Toma unos segundos.", "We're creating your digital dollar account. It takes a few seconds.") : undefined}
        busy={busy}
      >
        {t("Crear cuenta", "Create account")}
      </FormSubmit>
    </Form>
  );
}
