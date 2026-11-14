import "server-only";

import { randomBytes } from "node:crypto";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { type ConfirmAction, type ConfirmFinish, type ConfirmProof, type ConfirmStart, pinProblem } from "@/lib/pay-confirm";
import { hashPassword, verifyPassword } from "./crypto";
import type { Db } from "./db";
import { clearEvents, countRecent, noteEvent } from "./rate-limit";

// Payment confirmation (#199). The server signs payments for the shop, so a tap on "Pagar" alone
// must not be enough: the owner confirms with Face ID / fingerprint (a passkey) or a 6-digit PIN,
// and the server only signs once that confirmation is checked here.
//
// 1. startConfirm: one challenge per tap, bound to {action, shop, invoice, cents}, two minutes.
// 2. finishConfirm: the passkey's signature over that challenge, or the PIN. Marks it verified.
// 3. redeemConfirm: the pay action, right before it signs, uses the verified challenge once,
//    and only for the same action, invoice and amount.

/** Who confirms: "user:<id>" for a real account, "device:<id>" for a phone paying as a demo shop. */
export type Owner = { key: string; name: string };

/** The site the passkey belongs to: rpID is the host name, origin what the browser reports. */
export type RelyingParty = { id: string; origin: string };

export type ConfirmTarget = { action: ConfirmAction; partyId: string; invoiceId: number | null; cents: number };

export const CONFIRM_SECONDS = 120;
export const WRONG_PIN = { max: 5, windowSeconds: 15 * 60 };

const RP_NAME = "Relay";

const b64url = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64url");
const fromB64url = (text: string) => new Uint8Array(Buffer.from(text, "base64url"));

// The live database was set up before these tables existed: create them on first use (cheap, once per server).
const ready = new WeakSet<Db>();
async function ensureTables(db: Db): Promise<void> {
  if (ready.has(db)) return;
  await db.query(`CREATE TABLE IF NOT EXISTS pay_passkeys (
    id TEXT PRIMARY KEY, owner TEXT NOT NULL, public_key TEXT NOT NULL, counter BIGINT NOT NULL DEFAULT 0,
    transports TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  await db.query(`CREATE INDEX IF NOT EXISTS pay_passkeys_owner ON pay_passkeys (owner)`);
  await db.query(`CREATE TABLE IF NOT EXISTS pay_pins (owner TEXT PRIMARY KEY, pin_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  await db.query(`CREATE TABLE IF NOT EXISTS pay_challenges (
    id TEXT PRIMARY KEY, owner TEXT NOT NULL, action TEXT NOT NULL, party_id TEXT NOT NULL, invoice_id BIGINT,
    cents BIGINT NOT NULL, challenge TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL, verified_at TIMESTAMPTZ,
    method TEXT, used_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  await db.query(`CREATE TABLE IF NOT EXISTS rate_events (key TEXT NOT NULL, at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  ready.add(db);
}

type Passkey = { id: string; public_key: string; counter: string | number; transports: string | null };

const passkeysOf = (db: Db, owner: string) => db.query<Passkey>(`SELECT id, public_key, counter, transports FROM pay_passkeys WHERE owner = $1`, [owner]);
const pinOf = async (db: Db, owner: string) =>
  (await db.query<{ pin_hash: string }>(`SELECT pin_hash FROM pay_pins WHERE owner = $1`, [owner]))[0]?.pin_hash ?? null;
const transportsOf = (row: Passkey) => (row.transports ? (row.transports.split(",") as never[]) : undefined);

/** A new challenge for one tap on a pay button, and how this owner can answer it. */
export async function startConfirm(db: Db, owner: Owner, target: ConfirmTarget, rp: RelyingParty): Promise<ConfirmStart> {
  if (!Number.isSafeInteger(target.cents) || target.cents <= 0) return { ok: false, message: "Monto inválido." };
  await ensureTables(db);
  const id = b64url(randomBytes(18));
  const challenge = b64url(randomBytes(32));
  await db.query(
    `INSERT INTO pay_challenges (id, owner, action, party_id, invoice_id, cents, challenge, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, now() + make_interval(secs => $8))`,
    [id, owner.key, target.action, target.partyId, target.invoiceId, target.cents, challenge, CONFIRM_SECONDS],
  );
  if (Math.random() < 0.05) await db.query(`DELETE FROM pay_challenges WHERE expires_at < now() - interval '1 day'`);

  const [passkeys, pin] = await Promise.all([passkeysOf(db, owner.key), pinOf(db, owner.key)]);
  if (passkeys.length > 0) {
    const authOptions = await generateAuthenticationOptions({
      rpID: rp.id,
      challenge: fromB64url(challenge),
      userVerification: "required",
      timeout: 60_000,
      allowCredentials: passkeys.map((p) => ({ id: p.id, transports: transportsOf(p) })),
    });
    return { ok: true, id, shopId: target.partyId, mode: "passkey", hasPin: pin !== null, authOptions };
  }
  if (pin) return { ok: true, id, shopId: target.partyId, mode: "pin", hasPin: true };
  // Nothing yet: this first payment sets up Face ID / fingerprint (or a PIN) and is confirmed by it.
  const setupOptions = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: rp.id,
    userName: owner.name,
    userDisplayName: owner.name,
    userID: new TextEncoder().encode(owner.key),
    challenge: fromB64url(challenge),
    attestationType: "none",
    timeout: 60_000,
    authenticatorSelection: { authenticatorAttachment: "platform", residentKey: "preferred", userVerification: "required" },
    preferredAuthenticatorType: "localDevice",
  });
  return { ok: true, id, shopId: target.partyId, mode: "setup", hasPin: false, setupOptions };
}

type Challenge = { challenge: string; verified_at: string | null };

const EXPIRED = "La confirmación venció. Toque pagar otra vez.";
const NOT_CONFIRMED = "No se pudo confirmar. Intente de nuevo.";

/** The owner answers the challenge: a passkey signature, a PIN, or (first time) a new passkey or PIN. */
export async function finishConfirm(db: Db, owner: Owner, id: string, proof: ConfirmProof, rp: RelyingParty): Promise<ConfirmFinish> {
  await ensureTables(db);
  const [row] = await db.query<Challenge>(
    `SELECT challenge, verified_at FROM pay_challenges WHERE id = $1 AND owner = $2 AND used_at IS NULL AND expires_at > now()`,
    [id, owner.key],
  );
  if (!row) return { ok: false, message: EXPIRED };
  if (row.verified_at) return { ok: true };

  const checked = await check(db, owner, row.challenge, proof, rp);
  if (!checked.ok) return checked;
  await db.query(`UPDATE pay_challenges SET verified_at = now(), method = $3 WHERE id = $1 AND owner = $2`, [id, owner.key, checked.method]);
  return { ok: true };
}

async function check(
  db: Db,
  owner: Owner,
  challenge: string,
  proof: ConfirmProof,
  rp: RelyingParty,
): Promise<{ ok: true; method: "passkey" | "pin" } | { ok: false; message: string; again?: boolean }> {
  switch (proof.kind) {
    case "passkey": {
      const [key] = await db.query<Passkey>(`SELECT id, public_key, counter, transports FROM pay_passkeys WHERE id = $1 AND owner = $2`, [
        proof.response?.id,
        owner.key,
      ]);
      if (!key) return { ok: false, message: "Esta llave no es de esta cuenta. Use su PIN.", again: true };
      try {
        const result = await verifyAuthenticationResponse({
          response: proof.response,
          expectedChallenge: challenge,
          expectedOrigin: rp.origin,
          expectedRPID: rp.id,
          requireUserVerification: true,
          credential: { id: key.id, publicKey: fromB64url(key.public_key), counter: Number(key.counter), transports: transportsOf(key) },
        });
        if (!result.verified) return { ok: false, message: NOT_CONFIRMED, again: true };
        await db.query(`UPDATE pay_passkeys SET counter = $2 WHERE id = $1`, [key.id, result.authenticationInfo.newCounter]);
        return { ok: true, method: "passkey" };
      } catch (error) {
        console.error("[pay-confirm] passkey", error instanceof Error ? error.message : error);
        return { ok: false, message: NOT_CONFIRMED, again: true };
      }
    }
    case "new-passkey": {
      // Only the first time. Adding a way to pay later must not skip the one already there.
      if (await hasAnything(db, owner.key)) return { ok: false, message: "Sus pagos ya están protegidos. Confirme con su cara, huella o PIN.", again: true };
      try {
        const result = await verifyRegistrationResponse({
          response: proof.response,
          expectedChallenge: challenge,
          expectedOrigin: rp.origin,
          expectedRPID: rp.id,
          requireUserVerification: true,
        });
        if (!result.verified) return { ok: false, message: NOT_CONFIRMED, again: true };
        const { credential } = result.registrationInfo;
        await db.query(`INSERT INTO pay_passkeys (id, owner, public_key, counter, transports) VALUES ($1, $2, $3, $4, $5)`, [
          credential.id,
          owner.key,
          b64url(credential.publicKey),
          credential.counter,
          credential.transports?.join(",") ?? null,
        ]);
        return { ok: true, method: "passkey" };
      } catch (error) {
        console.error("[pay-confirm] new passkey", error instanceof Error ? error.message : error);
        return { ok: false, message: NOT_CONFIRMED, again: true };
      }
    }
    case "pin": {
      const stored = await pinOf(db, owner.key);
      if (!stored) return { ok: false, message: "Aún no tiene un PIN.", again: true };
      const key = `pin:${owner.key}`;
      const wrong = await countRecent(db, key, WRONG_PIN.windowSeconds);
      if (wrong >= WRONG_PIN.max) return { ok: false, message: "PIN bloqueado por 5 intentos. Espere 15 minutos." };
      if (typeof proof.pin === "string" && (await verifyPassword(proof.pin, stored))) {
        await clearEvents(db, key);
        return { ok: true, method: "pin" };
      }
      await noteEvent(db, key);
      const left = WRONG_PIN.max - wrong - 1;
      if (left <= 0) return { ok: false, message: "PIN bloqueado por 5 intentos. Espere 15 minutos." };
      return { ok: false, message: left === 1 ? "PIN incorrecto. Le queda 1 intento." : `PIN incorrecto. Le quedan ${left} intentos.`, again: true };
    }
    case "new-pin": {
      if (await hasAnything(db, owner.key)) return { ok: false, message: "Sus pagos ya están protegidos. Confirme con su cara, huella o PIN.", again: true };
      const problem = pinProblem(String(proof.pin ?? ""));
      if (problem) return { ok: false, message: problem, again: true };
      await db.query(`INSERT INTO pay_pins (owner, pin_hash) VALUES ($1, $2) ON CONFLICT (owner) DO NOTHING`, [owner.key, await hashPassword(proof.pin)]);
      return { ok: true, method: "pin" };
    }
    default:
      return { ok: false, message: NOT_CONFIRMED };
  }
}

async function hasAnything(db: Db, owner: string): Promise<boolean> {
  const [passkeys, pin] = await Promise.all([passkeysOf(db, owner), pinOf(db, owner)]);
  return passkeys.length > 0 || pin !== null;
}

/**
 * Right before the server signs: use a verified confirmation once, for exactly this action,
 * shop, invoice and amount. Null when it may go ahead, else the message for the screen.
 */
export async function redeemConfirm(db: Db, owner: Owner | null, id: string | undefined, target: ConfirmTarget): Promise<string | null> {
  if (!owner || !id) return "Confirme el pago con su cara, huella o PIN.";
  await ensureTables(db);
  const used = await db.query(
    `UPDATE pay_challenges SET used_at = now()
     WHERE id = $1 AND owner = $2 AND verified_at IS NOT NULL AND used_at IS NULL AND expires_at > now()
       AND action = $3 AND party_id = $4 AND invoice_id IS NOT DISTINCT FROM $5::bigint AND cents = $6
     RETURNING id`,
    [id, owner.key, target.action, target.partyId, target.invoiceId, target.cents],
  );
  if (used.length > 0) return null;
  const [row] = await db.query<{ cents: string | number; verified_at: string | null; action: string; invoice_id: string | number | null }>(
    `SELECT cents, verified_at, action, invoice_id FROM pay_challenges WHERE id = $1 AND owner = $2 AND used_at IS NULL AND expires_at > now()`,
    [id, owner.key],
  );
  if (!row) return EXPIRED;
  if (!row.verified_at) return "Confirme el pago con su cara, huella o PIN.";
  return "El monto cambió. Confirme el pago otra vez.";
}

/** Contract units (7 decimals) to whole cents, rounded the way the screen shows them. */
export const unitsToCents = (units: bigint) => Number((units + 50_000n) / 100_000n);
