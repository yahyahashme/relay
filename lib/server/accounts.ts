import "server-only";

import { hashPassword, newId, newToken, verifyPassword } from "./crypto";
import { requireDb } from "./db";
import { invalidateDirectory } from "./directory";
import { createWallet, type WalletNetwork } from "./wallet";

// Users, passwords and sessions (#129). Messages are Spanish, like every
// receipt; lib/i18n.tsx translates them on screen.

export type Role = "tienda" | "distribuidora" | "motorista" | "admin";

export type User = {
  id: string;
  role: Role;
  name: string;
  phone: string | null;
  email: string | null;
  stellarAddress: string;
};

export type AuthResult = { ok: true; user: User; sessionId: string } | { ok: false; message: string };

export const SESSION_DAYS = 30;
export const MIN_PASSWORD = 8;

/** El Salvador numbers: 8 digits starting with 2, 6 or 7, with or without +503. */
export function normalizePhone(text: string): string | null {
  const digits = text.replace(/[\s()-]/g, "").replace(/^\+?503/, "");
  return /^[267]\d{7}$/.test(digits) ? `+503${digits}` : null;
}

export function normalizeEmail(text: string): string | null {
  const email = text.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 ? email : null;
}

/** A phone or an email, whichever it looks like. */
export function parseContact(text: string): { phone: string } | { email: string } | null {
  if (text.includes("@")) {
    const email = normalizeEmail(text);
    return email ? { email } : null;
  }
  const phone = normalizePhone(text);
  return phone ? { phone } : null;
}

type UserRow = {
  id: string;
  role: Role;
  name: string;
  phone: string | null;
  email: string | null;
  stellar_address: string;
  password_hash: string;
};

const toUser = (row: UserRow): User => ({
  id: row.id,
  role: row.role,
  name: row.name,
  phone: row.phone,
  email: row.email,
  stellarAddress: row.stellar_address,
});

async function findByContact(contact: { phone: string } | { email: string }): Promise<UserRow | undefined> {
  const db = requireDb();
  const [column, value] = "phone" in contact ? ["phone", contact.phone] : ["email", contact.email];
  const rows = await db.query<UserRow>(`SELECT * FROM users WHERE ${column} = $1`, [value]);
  return rows[0];
}

async function newSession(userId: string): Promise<string> {
  const id = newToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await requireDb().query(`INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)`, [id, userId, expires.toISOString()]);
  return id;
}

export type SignUpInput = { role: Role; name: string; contact: string; password: string };

/**
 * A new user with their own Stellar account (funded, with the USDC trustline).
 * Drivers only come in through a distributor's invite (#131), admins by hand.
 */
export async function signUp(input: SignUpInput, network?: WalletNetwork): Promise<AuthResult> {
  if (input.role !== "tienda" && input.role !== "distribuidora") {
    return { ok: false, message: "Los motoristas se registran con la invitación de su distribuidora." };
  }
  const name = input.name.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 80) return { ok: false, message: "Escriba su nombre." };
  const contact = parseContact(input.contact);
  if (!contact) return { ok: false, message: "Escriba un teléfono de El Salvador (8 dígitos) o un correo válido." };
  if (input.password.length < MIN_PASSWORD) return { ok: false, message: "La contraseña debe tener al menos 8 caracteres." };
  if (await findByContact(contact)) {
    return { ok: false, message: "Ya hay una cuenta con ese teléfono o correo. Entre con su contraseña." };
  }

  const [passwordHash, wallet] = await Promise.all([hashPassword(input.password), createWallet(network)]);
  const id = newId("u");
  const db = requireDb();
  await db.query(`INSERT INTO wallets (address, secret_enc) VALUES ($1, $2)`, [wallet.address, wallet.secretEnc]);
  try {
    await db.query(
      `INSERT INTO users (id, role, name, phone, email, password_hash, stellar_address) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, input.role, name, "phone" in contact ? contact.phone : null, "email" in contact ? contact.email : null, passwordHash, wallet.address],
    );
  } catch (error) {
    // Two sign-ups with the same phone at the same moment: the second loses on the UNIQUE constraint.
    if (String(error).includes("unique") || String(error).includes("duplicate")) {
      return { ok: false, message: "Ya hay una cuenta con ese teléfono o correo. Entre con su contraseña." };
    }
    throw error;
  }
  invalidateDirectory();
  const user: User = {
    id,
    role: input.role,
    name,
    phone: "phone" in contact ? contact.phone : null,
    email: "email" in contact ? contact.email : null,
    stellarAddress: wallet.address,
  };
  return { ok: true, user, sessionId: await newSession(id) };
}

const WRONG = "Teléfono, correo o contraseña incorrectos.";

let dummy: Promise<string> | undefined;
const dummyHash = () => (dummy ??= hashPassword("relay-no-such-user"));

export async function signIn(contactText: string, password: string): Promise<AuthResult> {
  const contact = parseContact(contactText);
  if (!contact) return { ok: false, message: WRONG };
  const row = await findByContact(contact);
  // Check a real hash anyway when there's no such user, so both answers take the same time.
  const ok = await verifyPassword(password, row?.password_hash ?? (await dummyHash()));
  if (!row || !ok) return { ok: false, message: WRONG };
  return { ok: true, user: toUser(row), sessionId: await newSession(row.id) };
}

export async function userForSession(sessionId: string | null): Promise<User | null> {
  if (!sessionId) return null;
  const rows = await requireDb().query<UserRow>(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = $1 AND s.expires_at > now()`,
    [sessionId],
  );
  return rows[0] ? toUser(rows[0]) : null;
}

export async function endSession(sessionId: string | null): Promise<void> {
  if (sessionId) await requireDb().query(`DELETE FROM sessions WHERE id = $1`, [sessionId]);
}
