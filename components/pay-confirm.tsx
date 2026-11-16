"use client";

import { platformAuthenticatorIsAvailable, startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button, TextButton } from "@/components/kit/button";
import { INPUT } from "@/components/kit/field";
import { Money, MoneyText } from "@/components/kit/money";
import { Receipt, ReceiptHeader, ReceiptLine, ReceiptLines, ReceiptTotal } from "@/components/kit/paper";
import { useQuietOnArrival } from "@/components/tap-shield";
import { finishPayConfirm, startPayConfirm } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { type ConfirmAction, type ConfirmProof, type ConfirmRequest, type ConfirmStart, DEMO_PIN, PIN_LENGTH, pinProblem } from "@/lib/pay-confirm";

// After a pay button, before any money moves: a sheet with what will be paid and to whom, then the
// phone's own Face ID / fingerprint prompt (a passkey), or the shop's 6-digit PIN. Like a UPI PIN.
// The first payment on a phone sets one up ("Proteja sus pagos") and is confirmed by it.
// The server checks the answer and only signs that exact payment (lib/server/pay-confirm.ts).

export type ConfirmAsk = ConfirmRequest & {
  /** Who gets the money, for the sheet ("Para"). */
  to?: string;
  /** A split (#235): what goes on 7 days after this part, shown as its own line. */
  rest?: number;
};

/** The confirmation id to send with the payment, or why there is none (no message = the shop cancelled). */
export type ConfirmAnswer = { ok: true; id: string } | { ok: false; message?: string };

type Step =
  | { kind: "loading" }
  | { kind: "choose"; start: Extract<ConfirmStart, { ok: true }> }
  | { kind: "pin"; start: Extract<ConfirmStart, { ok: true }>; create: boolean; first?: string };

type Open = { ask: ConfirmAsk; resolve: (answer: ConfirmAnswer) => void };

/** `ask()` opens the sheet and resolves once the owner confirmed or cancelled. Render `sheet` once on the screen. */
export function usePayConfirm(): { ask: (ask: ConfirmAsk) => Promise<ConfirmAnswer>; sheet: ReactNode } {
  const [open, setOpen] = useState<Open | null>(null);
  const ask = (request: ConfirmAsk) =>
    new Promise<ConfirmAnswer>((resolve) =>
      setOpen({
        ask: request,
        resolve: (answer) => {
          setOpen(null);
          resolve(answer);
        },
      }),
    );
  return { ask, sheet: open ? <ConfirmSheet key={JSON.stringify(open.ask)} ask={open.ask} done={open.resolve} /> : null };
}

const TITLE: Record<ConfirmAction, [string, string]> = {
  pay: ["Confirme el pago", "Confirm the payment"],
  later: ["Confirme el crédito", "Confirm the credit"],
  cash: ["Confirme el efectivo", "Confirm the cash"],
  split: ["Confirme el pago", "Confirm the payment"],
  repay: ["Confirme el pago", "Confirm the payment"],
  lend: ["Confirme el depósito", "Confirm the deposit"],
  withdraw: ["Confirme el retiro", "Confirm the withdrawal"],
};

const WHAT: Record<ConfirmAction, [string, string]> = {
  pay: ["Paga ahora", "You pay now"],
  later: ["Paga en 7 días", "You pay in 7 days"],
  cash: ["Pagó en efectivo", "You paid in cash"],
  split: ["Paga ahora", "You pay now"],
  repay: ["Paga su crédito", "You pay your credit"],
  lend: ["Pone en el fondo", "You put in the pool"],
  withdraw: ["Retira del fondo", "You take out of the pool"],
};

function ConfirmSheet({ ask, done }: { ask: ConfirmAsk; done: (answer: ConfirmAnswer) => void }) {
  const { t, msg } = useT();
  const [step, setStep] = useState<Step>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [canPasskey, setCanPasskey] = useState<boolean | null>(null);
  const started = useRef(false);
  const pinField = useRef<HTMLInputElement>(null);
  // The sheet comes up where the thumb just tapped "Pagar": its button waits a beat, so a double tap can't answer it.
  const arriving = useQuietOnArrival(step.kind !== "loading");

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      const [start, platform] = await Promise.all([startPayConfirm(ask), platformAuthenticatorIsAvailable().catch(() => false)]);
      setCanPasskey(platform);
      if (!start.ok) return done({ ok: false, message: start.message });
      if (start.mode === "pin" || start.mode === "demo") return setStep({ kind: "pin", start, create: false });
      // A first payment on a phone with no Face ID or fingerprint goes straight to making a PIN.
      if (start.mode === "setup" && !platform) return setStep({ kind: "pin", start, create: true });
      setStep({ kind: "choose", start });
    })();
  }, [ask, done]);

  useEffect(() => {
    if (step.kind === "pin") pinField.current?.focus();
  }, [step]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) done({ ok: false });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, done]);

  async function prove(start: Extract<ConfirmStart, { ok: true }>, proof: () => Promise<ConfirmProof>) {
    setBusy(true);
    setError(null);
    let answer: ConfirmProof;
    try {
      answer = await proof();
    } catch {
      // The shop closed the Face ID prompt, or the phone refused it.
      setBusy(false);
      setError(t("No se confirmó. Intente otra vez o use un PIN.", "Not confirmed. Try again or use a PIN."));
      return;
    }
    const result = await finishPayConfirm(start.id, start.shopId, answer);
    setBusy(false);
    if (result.ok) return done({ ok: true, id: start.id });
    if (!result.again) return done({ ok: false, message: result.message });
    setError(result.message);
    setPin("");
    pinField.current?.focus();
  }

  function submitPin(value: string) {
    if (step.kind !== "pin") return;
    if (!step.create) return void prove(step.start, async () => ({ kind: "pin", pin: value }));
    if (!step.first) {
      const problem = pinProblem(value);
      if (problem) return setError(problem);
      setError(null);
      setPin("");
      return setStep({ ...step, first: value });
    }
    if (value !== step.first) {
      setPin("");
      setError(t("Los dos PIN no son iguales. Empiece otra vez.", "The two PINs don't match. Start again."));
      return setStep({ ...step, first: undefined });
    }
    void prove(step.start, async () => ({ kind: "new-pin", pin: value }));
  }

  const [title, titleEn] = TITLE[ask.action];
  const [what, whatEn] = WHAT[ask.action];
  const setup = step.kind === "choose" ? step.start.mode === "setup" : step.kind === "pin" && step.create;

  let body: ReactNode;
  if (step.kind === "loading") {
    body = <p className="py-4 text-center text-muted">{t("Preparando...", "Getting ready...")}</p>;
  } else if (step.kind === "choose") {
    const { start } = step;
    body =
      start.mode === "setup" ? (
        <>
          <p className="text-pretty">
            {t(
              "Elija cómo confirmar cada pago en este teléfono. Así nadie más puede pagar desde su cuenta.",
              "Choose how to confirm each payment on this phone. That way nobody else can pay from your account.",
            )}
          </p>
          {canPasskey && (
            <Button
              onClick={() => start.setupOptions && void prove(start, async () => ({ kind: "new-passkey", response: await startRegistration({ optionsJSON: start.setupOptions! }) }))}
              busy={busy}
              arriving={arriving}
              hint={t("O con el bloqueo de su teléfono", "Or with your phone's screen lock")}
            >
              {t("Usar mi cara o huella", "Use my face or fingerprint")}
            </Button>
          )}
          <TextButton onClick={() => setStep({ kind: "pin", start, create: true })} disabled={busy}>
            {t("Crear un PIN de 6 números", "Create a 6-digit PIN")}
          </TextButton>
        </>
      ) : (
        <>
          <Button
            onClick={() => start.authOptions && void prove(start, async () => ({ kind: "passkey", response: await startAuthentication({ optionsJSON: start.authOptions! }) }))}
            busy={busy}
            arriving={arriving}
            hint={t("O con el bloqueo de su teléfono", "Or with your phone's screen lock")}
          >
            {t("Confirmar con mi cara o huella", "Confirm with my face or fingerprint")}
          </Button>
          {start.hasPin && (
            <TextButton onClick={() => setStep({ kind: "pin", start, create: false })} disabled={busy}>
              {t("Usar mi PIN", "Use my PIN")}
            </TextButton>
          )}
        </>
      );
  } else {
    const label = step.create
      ? step.first
        ? t("Repita su PIN", "Enter your PIN again")
        : t("Cree un PIN de 6 números", "Create a 6-digit PIN")
      : t("Escriba su PIN", "Enter your PIN");
    body = (
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          submitPin(pin);
        }}
      >
        <label htmlFor="pay-pin" className="text-[1.0625rem] font-bold">
          {label}
        </label>
        <input
          ref={pinField}
          id="pay-pin"
          name="pay-pin"
          inputMode="numeric"
          autoComplete="off"
          enterKeyHint="done"
          maxLength={PIN_LENGTH}
          value={pin}
          disabled={busy}
          aria-describedby="pay-pin-note"
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, "").slice(0, PIN_LENGTH);
            setPin(digits);
            setError(null);
            if (digits.length === PIN_LENGTH && !step.create) submitPin(digits);
          }}
          className={`${INPUT} text-center font-mono text-[1.5rem] font-semibold tracking-[0.5em] [-webkit-text-security:disc]`}
        />
        <p id="pay-pin-note" className="text-label text-muted text-pretty">
          {step.start.mode === "demo"
            ? t(`Solo en la demo: el PIN es ${DEMO_PIN}.`, `Demo only: the PIN is ${DEMO_PIN}.`)
            : step.create
              ? t("Lo pedimos en cada pago. No lo comparta con nadie, ni con el motorista.", "We ask for it on every payment. Don't share it with anyone, not even the driver.")
              : t("Tiene 5 intentos.", "You have 5 tries.")}
        </p>
        <Button type="submit" busy={busy} disabled={pin.length !== PIN_LENGTH} arriving={arriving}>
          {step.create && !step.first ? t("Seguir", "Continue") : t("Confirmar", "Confirm")}
        </Button>
        {step.start.mode === "passkey" && (
          <TextButton onClick={() => setStep({ kind: "choose", start: step.start })} disabled={busy}>
            {t("Usar mi cara o huella", "Use my face or fingerprint")}
          </TextButton>
        )}
        {step.create && canPasskey && step.start.mode === "setup" && (
          <TextButton onClick={() => setStep({ kind: "choose", start: step.start })} disabled={busy}>
            {t("Mejor con mi cara o huella", "Use my face or fingerprint instead")}
          </TextButton>
        )}
      </form>
    );
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/55 sm:items-center sm:p-6" onPointerDown={(event) => event.stopPropagation()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pay-confirm-title"
        className="flex max-h-[100dvh] w-full max-w-[28rem] flex-col gap-3 overflow-y-auto rounded-t-[1.75rem] bg-counter px-5 pt-5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-[1.75rem]"
      >
        <Receipt>
          <ReceiptHeader as="h2" from={<span id="pay-confirm-title">{setup ? t("Proteja sus pagos", "Protect your payments") : t(title, titleEn)}</span>} />
          {ask.to && (
            <ReceiptLines>
              <ReceiptLine label={t("Para", "To")} shorten>
                {ask.to}
              </ReceiptLine>
            </ReceiptLines>
          )}
          {ask.rest !== undefined && ask.rest > 0 && (
            <ReceiptLines>
              <ReceiptLine label={t("En 7 días", "In 7 days")}>
                <Money value={ask.rest} />
              </ReceiptLine>
            </ReceiptLines>
          )}
          <ReceiptTotal label={t(what, whatEn)} value={ask.amount} />
        </Receipt>
        {/* The sheet sits on the bottom edge, so a message here grows it upwards and the buttons stay put. */}
        <p role="alert" className="font-semibold text-bad text-pretty empty:hidden">
          {error ? <MoneyText>{msg(error)}</MoneyText> : null}
        </p>
        {body}
        <TextButton onClick={() => done({ ok: false })} disabled={busy}>
          {t("Cancelar", "Cancel")}
        </TextButton>
      </div>
    </div>
  );
}
