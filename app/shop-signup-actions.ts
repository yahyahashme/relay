"use server";

// A shop owner signs up (#134), alone from /registro or from a distributor's
// invite (#132). A new shop starts with no pool credit (#217): it unlocks after
// two deliveries paid in dólares digitales at the door (lib/credit-unlock.ts).
// A shop that already has a limit (a claimed one may) keeps it.

import { getDb } from "@/lib/server/db";
import { callerIp, countRecent, noteEvent, signUpBlocked, TOO_MANY } from "@/lib/server/rate-limit";
import { getDirectory } from "@/lib/server/directory";
import { currentUser, startSession } from "@/lib/server/session";
import { checkOwner, claimShop, saveTrustedContacts, type ShopDetails, signUpShop, trustedContacts } from "@/lib/server/shops";
import { readClient } from "@/lib/stellar/client";
import { read } from "@/lib/stellar/send";
import { toDollars } from "@/lib/stellar/units";

type Reply = { ok: true } | { ok: false; message: string };
const NO_ACCOUNTS = "Las cuentas todavía no están activas en este servidor.";
const TRY_LATER = "No pudimos crear su cuenta en este momento. Intente de nuevo en un minuto.";

/** The shop's limit if it already has one (a claimed shop may), in dollars. New shops start at $0 (#217). */
async function currentLimit(stellarAddress: string): Promise<number> {
  return toDollars((await read(readClient().get_shop({ shop: stellarAddress }))).limit);
}

/** Step 1: checks the owner's details before anything is created. */
export async function checkOwnerAction(input: { name: string; phone: string; password: string }): Promise<Reply> {
  const db = getDb();
  if (!db) return { ok: false, message: NO_ACCOUNTS };
  // It says whether a phone has an account: a cap per IP so it can't be used to walk through numbers.
  const key = `checkowner:${await callerIp()}`;
  if ((await countRecent(db, key, 600)) >= 20) return { ok: false, message: TOO_MANY };
  await noteEvent(db, key);
  const problem = await checkOwner(input);
  return problem ? { ok: false, message: problem } : { ok: true };
}

export type ShopSignUpReply = { ok: true; shopId: string; creditLimit: number } | { ok: false; message: string };

/** Step 2: the account, the shop (new, or the invited one), the session, then its limit if it has one. */
export async function signUpShopAction(
  input: { name: string; phone: string; password: string } & ShopDetails,
  code?: string,
): Promise<ShopSignUpReply> {
  if (!getDb()) return { ok: false, message: NO_ACCOUNTS };
  let shopId: string;
  try {
    if (await signUpBlocked()) return { ok: false, message: TOO_MANY };
    const result = code
      ? await claimShop(code, { ownerName: input.name, phone: input.phone, password: input.password, shopName: input.shopName, address: input.address, kind: input.kind })
      : await signUpShop(input);
    if (!result.ok) return result;
    shopId = result.shopId!;
    await startSession(result.sessionId);
  } catch (error) {
    console.error("[shop sign-up]", error instanceof Error ? error.message : error);
    return { ok: false, message: TRY_LATER };
  }
  // The account exists now; if the read fails, the shop still gets in.
  let creditLimit = 0;
  try {
    const shop = (await getDirectory()).find(shopId, "shop");
    if (shop) creditLimit = await currentLimit(shop.address);
  } catch (error) {
    console.error("[shop sign-up] limit", error instanceof Error ? error.message : error);
  }
  return { ok: true, shopId, creditLimit };
}

/** Step 3: up to 3 trusted contacts, now or later. */
export async function saveTrustedContactsAction(contacts: { name: string; phone: string }[]): Promise<Reply> {
  const user = await currentUser();
  if (!user) return { ok: false, message: "Entre a su cuenta primero." };
  const problem = await saveTrustedContacts(user, contacts);
  return problem ? { ok: false, message: problem } : { ok: true };
}

export async function getTrustedContacts(): Promise<{ name: string; phone: string }[]> {
  const user = await currentUser();
  return user && getDb() ? trustedContacts(user) : [];
}
