import "server-only";

import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { isDemoParty } from "./authz";
import { signValue, unsignValue } from "./crypto";
import type { Party } from "./directory";
import type { Owner, RelyingParty } from "./pay-confirm";
import { currentUser } from "./session";

// Who confirms a payment (#199). A real shop is confirmed by its signed-in owner. The demo shops are
// open to anyone (a judge scanning the trifold QR), so there each phone confirms for itself: a
// random id in a signed cookie holds that phone's passkey or PIN.

const DEVICE = "relay_device";

async function deviceId(create: boolean): Promise<string | null> {
  const jar = await cookies();
  const known = unsignValue(jar.get(DEVICE)?.value);
  if (known || !create) return known;
  const id = randomBytes(16).toString("base64url");
  jar.set(DEVICE, signValue(id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
  });
  return id;
}

/**
 * The owner who must confirm for this shop. `create`: give this phone a device id if it has none
 * (when a confirmation starts; the pay action itself never makes one).
 */
export async function confirmOwner(party: Pick<Party, "id" | "name">, create: boolean): Promise<Owner | null> {
  if (isDemoParty(party.id)) {
    const id = await deviceId(create);
    return id ? { key: `device:${id}`, name: `${party.name} (demo)` } : null;
  }
  const user = await currentUser();
  return user ? { key: `user:${user.id}`, name: party.name } : null;
}

/** This site, as the browser sees it: the passkey is tied to the host name. */
export async function relyingParty(): Promise<RelyingParty> {
  const list = await headers();
  const host = (list.get("x-forwarded-host") ?? list.get("host") ?? "localhost").split(",")[0].trim();
  const hostname = host.replace(/:\d+$/, "");
  const local = hostname === "localhost" || hostname === "127.0.0.1";
  const proto = list.get("x-forwarded-proto")?.split(",")[0].trim() ?? (local ? "http" : "https");
  return { id: hostname, origin: `${proto}://${host}` };
}
