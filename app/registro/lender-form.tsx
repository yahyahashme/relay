"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { signUpLenderAction } from "@/app/lender-actions";
import { IdentityFields, useIdentityCheck } from "@/components/identity-check";
import { TextButton } from "@/components/kit/button";
import { Field, PasswordField } from "@/components/kit/field";
import { Form, FormHead, FormSubmit } from "@/components/kit/form";
import { type Blank, blankOf } from "@/lib/form-errors";
import { normalizeMatricula } from "@/lib/identity";
import { useT } from "@/lib/i18n";

/** The step each blank is on. A message about a blank that isn't on screen goes above the button. */
const STEP_OF: Partial<Record<Blank, 1 | 2 | 3>> = {
  businessName: 1,
  country: 1,
  licence: 1,
  nit: 1,
  matricula: 1,
  dui: 2,
  birthDate: 2,
  photo: 2,
  name: 3,
  contact: 3,
  password: 3,
};

/**
 * Lender sign-up (#207): "Su empresa" (name, country, licence, NIT, CNR registration), "Representante
 * legal" (the identity check, #215, simulated in the demo), then "Su cuenta". Relay approves it on
 * the contract before it can put money in (/prestamista waits for that).
 */
export function LenderForm() {
  const { t, msg } = useT();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [businessName, setBusinessName] = useState("");
  const [country, setCountry] = useState("El Salvador");
  const [licence, setLicence] = useState("");
  const [nit, setNit] = useState("");
  const [matricula, setMatricula] = useState("");
  const identity = useIdentityCheck();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Each step starts at its top.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  /** Step 1's own checks, in the server's words. */
  function businessProblem(): string | null {
    if (businessName.trim().length < 2) return "Escriba el nombre de la empresa.";
    if (country.trim().length < 2) return "Escriba el país.";
    if (licence.trim().length < 3) return "Escriba el número de licencia o registro.";
    if (nit.replace(/\D/g, "").length !== 14) return "El NIT debe tener 14 dígitos.";
    if (!normalizeMatricula(matricula)) return "Escriba el número de matrícula de comercio del CNR.";
    return null;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (step === 1) {
      const problem = businessProblem();
      setError(problem);
      if (!problem) setStep(2);
      return;
    }
    if (step === 2) {
      if (identity.verified) return setStep(3);
      setError(await identity.verify(matricula));
      return;
    }
    setBusy(true);
    const reply = await signUpLenderAction({
      name,
      contact,
      password,
      details: { businessName, country, licence, nit },
      identity: { ...identity.details, matricula },
    });
    if (reply.ok) {
      router.push("/prestamista");
      return;
    }
    setError(reply.message);
    setBusy(false);
  }

  function back(to: 1 | 2) {
    setError(null);
    setStep(to);
  }

  // A message about one blank goes under that blank; anything else goes above the button.
  const blank = blankOf(error);
  const onScreen = blank !== undefined && STEP_OF[blank] === step;
  const under = (which: Blank) => (error && onScreen && blank === which ? msg(error) : undefined);
  const aboveButton = error && !onScreen ? msg(error) : undefined;

  return (
    <Form onSubmit={submit} noValidate={step !== 3} error={error}>
      <FormHead
        step={t(`Crear cuenta · Paso ${step} de 3`, `Create account · Step ${step} of 3`)}
        at={step}
        title={step === 1 ? t("Prestamista", "Lender") : step === 2 ? t("Representante legal", "Legal representative") : t("Su cuenta", "Your account")}
      >
        {step === 1 &&
          t(
            "Para empresas con licencia para prestar. Relay revisa la empresa antes de aprobarla. Las distribuidoras no ponen dinero en el fondo.",
            "For businesses licensed to lend. Relay checks the business before approving it. Distributors don't put money in the pool.",
          )}
      </FormHead>

      {step === 1 ? (
        <div key="empresa" className="contents">
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
            label={t("Número de licencia", "Licence number")}
            hint={t("El que le dio el regulador, por ejemplo la SSF.", "The one the regulator gave you, for example the SSF.")}
            autoComplete="off"
            autoCapitalize="characters"
            required
            value={licence}
            onChange={(e) => setLicence(e.target.value)}
            error={under("licence")}
          />
          <Field
            label={t("NIT", "Tax ID (NIT)")}
            hint={t("14 dígitos, con o sin guiones.", "14 digits, with or without dashes.")}
            inputMode="numeric"
            autoComplete="off"
            required
            value={nit}
            onChange={(e) => setNit(e.target.value)}
            error={under("nit")}
          />
          <Field
            label={t("Matrícula de comercio (CNR)", "Trade registration (CNR)")}
            hint={t("El número de registro de la empresa en el CNR.", "The company's registration number at the CNR.")}
            autoComplete="off"
            autoCapitalize="characters"
            required
            value={matricula}
            onChange={(e) => setMatricula(e.target.value)}
            error={under("matricula")}
          />
          <FormSubmit error={aboveButton}>{t("Siguiente", "Next")}</FormSubmit>
        </div>
      ) : step === 2 ? (
        <div key="identidad" className="contents">
          <p className="text-pretty">
            {t(
              "La persona que firma por la empresa. Relay verifica que la empresa y la persona sean reales antes de aprobarla.",
              "The person who signs for the business. Relay checks that the business and the person are real before approving it.",
            )}
          </p>
          <IdentityFields state={identity} error={error} />
          {!identity.checking && <FormSubmit error={aboveButton}>{identity.verified ? t("Siguiente", "Next") : t("Verificar identidad", "Verify identity")}</FormSubmit>}
          <TextButton onClick={() => back(1)} disabled={identity.checking}>
            {t("Atrás", "Back")}
          </TextButton>
        </div>
      ) : (
        <div key="cuenta" className="contents">
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
            {t("En la demo le damos $5,000 en dólares de prueba para ponerlos en el fondo.", "In the demo we give you $5,000 in test dollars to put in the pool.")}
          </p>
          <FormSubmit
            error={aboveButton}
            note={busy ? t("Estamos creando su cuenta de dólares digitales. Toma unos segundos.", "We're creating your digital dollar account. It takes a few seconds.") : undefined}
            busy={busy}
          >
            {t("Crear cuenta", "Create account")}
          </FormSubmit>
          <TextButton onClick={() => back(2)} disabled={busy}>
            {t("Atrás", "Back")}
          </TextButton>
        </div>
      )}
    </Form>
  );
}
