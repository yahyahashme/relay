"use server";

// Sign-up, sign-in and the session cookie (#129). The cookie holds a random
// session id, signed with SESSION_SECRET, httpOnly: the browser never sees a key.

import { cookies } from "next/headers";
import { endSession, signIn, signUp, userForSession, type Role } from "@/lib/server/accounts";
import { signValue, unsignValue } from "@/lib/server/crypto";
import { getDb } from "@/lib/server/db";
import { config } from "@/lib/stellar/config";

const COOKIE = "relay_session";
const NO_ACCOUNTS = "Las cuentas todavía no están activas en este servidor.";
const TRY_LATER = "No pudimos crear su cuenta en este momento. Intente de nuevo en un minuto.";

/** What the screens may know about the signed-in person. No keys, no hashes. */
export type CurrentUser = {
  name: string;
  role: Role;
  contact: string;
  stellarAddress: string;
  explorerUrl: string;
};

export type AuthReply = { ok: true } | { ok: false; message: string };

async function sessionId(): Promise<string | null> {
  return unsignValue((await cookies()).get(COOKIE)?.value);
}

async function startSession(id: string) {
  (await cookies()).set(COOKIE, signValue(id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!getDb()) return null;
  try {
    const user = await userForSession(await sessionId());
    if (!user) return null;
    return {
      name: user.name,
      role: user.role,
      contact: user.phone ?? user.email ?? "",
      stellarAddress: user.stellarAddress,
      explorerUrl: `${config.explorer}/account/${user.stellarAddress}`,
    };
  } catch (error) {
    console.error("[auth] session", error);
    return null;
  }
}

export async function signUpAction(input: { role: Role; name: string; contact: string; password: string }): Promise<AuthReply> {
  if (!getDb()) return { ok: false, message: NO_ACCOUNTS };
  try {
    const result = await signUp(input);
    if (!result.ok) return result;
    await startSession(result.sessionId);
    return { ok: true };
  } catch (error) {
    console.error("[auth] sign-up", error instanceof Error ? error.message : error);
    return { ok: false, message: TRY_LATER };
  }
}

export async function signInAction(contact: string, password: string): Promise<AuthReply> {
  if (!getDb()) return { ok: false, message: NO_ACCOUNTS };
  try {
    const result = await signIn(contact, password);
    if (!result.ok) return result;
    await startSession(result.sessionId);
    return { ok: true };
  } catch (error) {
    console.error("[auth] sign-in", error instanceof Error ? error.message : error);
    return { ok: false, message: "No se pudo completar. Intente de nuevo." };
  }
}

export async function signOutAction(): Promise<void> {
  try {
    await endSession(await sessionId());
  } finally {
    (await cookies()).delete(COOKIE);
  }
}
