// Payment confirmation (#199), the part both sides share. After a shop taps a pay button, the
// phone asks for the owner's face, finger or PIN before any money moves, the way a UPI payment
// asks for a PIN. The server checks it (lib/server/pay-confirm.ts) before it signs anything.

import type { AuthenticationResponseJSON, PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON, RegistrationResponseJSON } from "@simplewebauthn/browser";

/**
 * What the shop is confirming: pay (all or part), take the 7 days, confirm cash, or pay back credit.
 * A lender (#207): put money in the pool ("lend") or take it out ("withdraw").
 * A split (#235): pay a part now in dólares digitales ("split") and the rest goes on 7 days in the
 * same confirm. The amount is the part paid today. Cash is never split.
 */
export type ConfirmAction = "pay" | "later" | "cash" | "split" | "repay" | "lend" | "withdraw";

export type ConfirmRequest = {
  action: ConfirmAction;
  /** Every action but "repay" is about one invoice. */
  invoiceId?: number;
  /** "repay" names the shop instead. */
  shopId?: string;
  /** "lend" and "withdraw" name the lender. */
  lenderId?: string;
  /** The dollars on the sheet. The server only lets this exact amount move. */
  amount: number;
};

/**
 * How the sheet asks: "passkey" (this owner has one; a PIN may be there too), "pin" (only a PIN),
 * "setup" (nothing yet: the first payment sets one up), "demo" (mock mode: PIN 123456).
 */
export type ConfirmMode = "passkey" | "pin" | "setup" | "demo";

export type ConfirmStart =
  | {
      ok: true;
      id: string;
      /** The shop it's for, as the server found it on the invoice. */
      shopId: string;
      mode: ConfirmMode;
      hasPin: boolean;
      authOptions?: PublicKeyCredentialRequestOptionsJSON;
      setupOptions?: PublicKeyCredentialCreationOptionsJSON;
    }
  | { ok: false; message: string };

export type ConfirmProof =
  | { kind: "passkey"; response: AuthenticationResponseJSON }
  | { kind: "new-passkey"; response: RegistrationResponseJSON }
  | { kind: "pin"; pin: string }
  | { kind: "new-pin"; pin: string };

export type ConfirmFinish = { ok: true } | { ok: false; message: string; /** The same sheet can try again (a wrong PIN). */ again?: boolean };

/** Mock mode only: there is no server to keep a PIN, so every demo phone uses this one. */
export const DEMO_PIN = "123456";

export const PIN_LENGTH = 6;

/** Six digits, and not one anybody would guess first (111111, 123456, 654321). */
export function pinProblem(pin: string): string | null {
  if (!/^\d{6}$/.test(pin)) return "El PIN debe tener 6 números.";
  const steps = [...pin].slice(1).map((d, i) => Number(d) - Number(pin[i]));
  if (steps.every((s) => s === 0) || steps.every((s) => s === 1) || steps.every((s) => s === -1)) {
    return "Ese PIN es muy fácil de adivinar. Elija otro.";
  }
  return null;
}

/** Dollars on screen to whole cents, the unit a confirmation is bound to. */
export const toCents = (dollars: number) => Math.round(dollars * 100);
