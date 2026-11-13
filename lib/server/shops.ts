import "server-only";

import { randomBytes } from "node:crypto";
import { normalizePhone, signUp, type AuthResult, type User } from "./accounts";
import { newId } from "./crypto";
import { requireDb } from "./db";
import { invalidateDirectory } from "./directory";
import { createWallet, type WalletNetwork } from "./wallet";

// Distributors add shops (#132): find one already on Relay, or add one by any
// name ("Tienda de Doña Marta, frente a la iglesia") with a Stellar account
// Relay holds for it, so invoices can be made right away. The shop claims the
// record later with a code (QR at the next delivery, or WhatsApp), keeps its
// invoices and picks its own name; the distributor's nickname stays theirs.

export type ShopStatus = "sin_cuenta" | "invitada" | "activa";

export type DistributorShopRow = {
  id: string;
  name: string;
  nickname: string | null;
  ownerName: string | null;
  address: string | null;
  phone: string | null;
  driverId: string | null;
  status: ShopStatus;
  inviteCode: string | null;
};

export type ShopMatch = { id: string; name: string; ownerName: string | null; address: string | null };

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O or 1/I: read out loud at the door

function newCode(): string {
  let out = "";
  for (const byte of randomBytes(6)) out += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  return out;
}

const clean = (text: string) => text.trim().replace(/\s+/g, " ");

/** Shops already on Relay (with an owner) this distributor doesn't have yet, by name or the owner's phone. */
export async function searchShops(distributorId: string, query: string): Promise<ShopMatch[]> {
  const q = clean(query);
  if (q.length < 2) return [];
  const phone = normalizePhone(q);
  const rows = await requireDb().query<{ id: string; name: string; owner_name: string | null; address: string | null }>(
    `SELECT s.id, s.name, u.name AS owner_name, s.address
       FROM shops s JOIN users u ON u.id = s.owner_user_id
      WHERE (s.name ILIKE $2 OR u.phone = $3)
        AND NOT EXISTS (SELECT 1 FROM distributor_shops ds WHERE ds.shop_id = s.id AND ds.distributor_id = $1)
      ORDER BY s.name LIMIT 10`,
    [distributorId, `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`, phone],
  );
  return rows.map((r) => ({ id: r.id, name: r.name, ownerName: r.owner_name, address: r.address }));
}

/** "Agregar" on a search result: the shop now buys from this distributor too. */
export async function linkShop(distributorId: string, shopId: string, driverId: string | null): Promise<boolean> {
  const rows = await requireDb().query(
    `INSERT INTO distributor_shops (distributor_id, shop_id, driver_id)
     SELECT $1, s.id, $3 FROM shops s WHERE s.id = $2 AND s.owner_user_id IS NOT NULL
     ON CONFLICT DO NOTHING RETURNING shop_id`,
    [distributorId, shopId, driverId],
  );
  return rows.length > 0;
}

export type NewShopInput = { nickname: string; address: string; phone: string; driverId: string | null };

/** "Agregar sin cuenta": a shop record with a held Stellar account, linked, with a claim code. */
export async function addShopWithoutAccount(
  distributorId: string,
  input: NewShopInput,
  network?: WalletNetwork,
): Promise<{ shopId: string; code: string } | { error: string }> {
  const nickname = clean(input.nickname);
  if (nickname.length < 2 || nickname.length > 120) return { error: "Escriba un nombre para reconocer la tienda." };
  const phone = input.phone.trim() === "" ? null : normalizePhone(input.phone);
  if (input.phone.trim() !== "" && !phone) return { error: "Escriba un teléfono de El Salvador (8 dígitos) o déjelo vacío." };

  const wallet = await createWallet(network);
  const db = requireDb();
  const shopId = newId("t");
  await db.query(`INSERT INTO wallets (address, secret_enc) VALUES ($1, $2)`, [wallet.address, wallet.secretEnc]);
  await db.query(
    `INSERT INTO shops (id, name, address, phone, created_by, stellar_address) VALUES ($1, $2, $3, $4, $5, $6)`,
    [shopId, nickname, clean(input.address) || null, phone, distributorId, wallet.address],
  );
  await db.query(`INSERT INTO distributor_shops (distributor_id, shop_id, nickname, driver_id) VALUES ($1, $2, $3, $4)`, [
    distributorId,
    shopId,
    nickname,
    input.driverId,
  ]);
  const code = await createShopInvite(shopId, distributorId, phone);
  invalidateDirectory();
  return { shopId, code };
}

async function createShopInvite(shopId: string, distributorId: string, phone: string | null): Promise<string> {
  for (let tries = 0; ; tries++) {
    const code = newCode();
    try {
      await requireDb().query(`INSERT INTO shop_invites (code, shop_id, distributor_id, phone) VALUES ($1, $2, $3, $4)`, [
        code,
        shopId,
        distributorId,
        phone,
      ]);
      return code;
    } catch (error) {
      if (tries >= 4) throw error; // a clash in 1 billion codes, five times running
    }
  }
}

/** Unclaimed invite codes for these shops, for the driver's route ("Invitar a Relay"). */
export async function pendingCodes(shopIds: string[]): Promise<Record<string, string>> {
  if (shopIds.length === 0) return {};
  const rows = await requireDb().query<{ shop_id: string; code: string }>(
    `SELECT DISTINCT ON (i.shop_id) i.shop_id, i.code
       FROM shop_invites i JOIN shops s ON s.id = i.shop_id
      WHERE i.shop_id = ANY($1) AND i.claimed_at IS NULL AND s.owner_user_id IS NULL
      ORDER BY i.shop_id, i.created_at DESC`,
    [shopIds],
  );
  return Object.fromEntries(rows.map((r) => [r.shop_id, r.code]));
}

/** The distributor's shop list. */
export async function listShops(distributorId: string): Promise<DistributorShopRow[]> {
  const rows = await requireDb().query<{
    id: string;
    name: string;
    nickname: string | null;
    owner_name: string | null;
    address: string | null;
    phone: string | null;
    driver_id: string | null;
    has_owner: boolean;
    code: string | null;
  }>(
    `SELECT s.id, s.name, ds.nickname, COALESCE(u.name, s.owner_name) AS owner_name, s.address, COALESCE(u.phone, s.phone) AS phone,
            ds.driver_id, (s.owner_user_id IS NOT NULL) AS has_owner,
            (SELECT i.code FROM shop_invites i WHERE i.shop_id = s.id AND i.claimed_at IS NULL ORDER BY i.created_at DESC LIMIT 1) AS code
       FROM distributor_shops ds JOIN shops s ON s.id = ds.shop_id LEFT JOIN users u ON u.id = s.owner_user_id
      WHERE ds.distributor_id = $1
      ORDER BY ds.created_at DESC`,
    [distributorId],
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    nickname: r.nickname,
    ownerName: r.has_owner ? r.owner_name : null,
    address: r.address,
    phone: r.phone,
    driverId: r.driver_id,
    status: r.has_owner ? "activa" : r.code ? "invitada" : "sin_cuenta",
    inviteCode: r.has_owner ? null : r.code,
  }));
}

// ---------- the shop's side ----------

export type ShopInvite = { code: string; shopId: string; distributorName: string };

export async function inviteByCode(codeText: string): Promise<ShopInvite | null> {
  const code = codeText.trim().toUpperCase();
  const rows = await requireDb().query<{ code: string; shop_id: string; business_name: string }>(
    `SELECT i.code, i.shop_id, d.business_name
       FROM shop_invites i JOIN distributors d ON d.id = i.distributor_id JOIN shops s ON s.id = i.shop_id
      WHERE i.code = $1 AND i.claimed_at IS NULL AND s.owner_user_id IS NULL`,
    [code],
  );
  return rows[0] ? { code: rows[0].code, shopId: rows[0].shop_id, distributorName: rows[0].business_name } : null;
}

export type ClaimInput = { ownerName: string; phone: string; password: string; shopName: string };

/**
 * The owner claims the shop record from an invite (basic version; #134 adds the
 * full sign-up steps): their own user, the shop's name they choose, and the
 * shop's Stellar account and invoices stay as they are.
 */
export async function claimShop(codeText: string, input: ClaimInput, network?: WalletNetwork): Promise<AuthResult & { shopId?: string }> {
  const invite = await inviteByCode(codeText);
  if (!invite) return { ok: false, message: "Este código ya no es válido. Pida otro a su distribuidora." };
  const shopName = clean(input.shopName);
  if (shopName.length < 2 || shopName.length > 80) return { ok: false, message: "Escriba el nombre de su tienda." };
  const result = await signUp({ role: "tienda", name: input.ownerName, contact: input.phone, password: input.password }, network);
  if (!result.ok) return result;
  const db = requireDb();
  const claimed = await db.query(
    `UPDATE shops SET owner_user_id = $2, name = $3 WHERE id = $1 AND owner_user_id IS NULL RETURNING id`,
    [invite.shopId, result.user.id, shopName],
  );
  if (claimed.length === 0) return { ok: false, message: "Este código ya no es válido. Pida otro a su distribuidora." };
  await db.query(`UPDATE shop_invites SET claimed_at = now() WHERE shop_id = $1 AND claimed_at IS NULL`, [invite.shopId]);
  invalidateDirectory();
  return { ...result, shopId: invite.shopId };
}

export async function shopIdForUser(user: User): Promise<string | null> {
  if (user.role !== "tienda") return null;
  const rows = await requireDb().query<{ id: string }>(`SELECT id FROM shops WHERE owner_user_id = $1 ORDER BY created_at LIMIT 1`, [user.id]);
  return rows[0]?.id ?? null;
}

export type Supplier = { distributorId: string; name: string; addedAt: string };

/** "Distribuidora El Sol lo agregó": the distributors a shop buys from. */
export async function suppliersOf(shopId: string): Promise<Supplier[]> {
  const rows = await requireDb().query<{ distributor_id: string; business_name: string; created_at: string | Date }>(
    `SELECT ds.distributor_id, d.business_name, ds.created_at
       FROM distributor_shops ds JOIN distributors d ON d.id = ds.distributor_id
      WHERE ds.shop_id = $1 ORDER BY ds.created_at DESC`,
    [shopId],
  );
  return rows.map((r) => ({ distributorId: r.distributor_id, name: r.business_name, addedAt: new Date(r.created_at).toISOString() }));
}

/** The shop's owner removes a distributor. Its old invoices stay on the record. */
export async function removeSupplier(user: User, shopId: string, distributorId: string): Promise<boolean> {
  const rows = await requireDb().query(
    `DELETE FROM distributor_shops ds USING shops s
      WHERE ds.shop_id = s.id AND s.id = $1 AND s.owner_user_id = $2 AND ds.distributor_id = $3 RETURNING ds.shop_id`,
    [shopId, user.id, distributorId],
  );
  return rows.length > 0;
}

/** For the distributor's views: the nickname they gave each shop (only they see it). */
export async function nicknames(distributorId: string): Promise<Record<string, string>> {
  const rows = await requireDb().query<{ shop_id: string; nickname: string }>(
    `SELECT shop_id, nickname FROM distributor_shops WHERE distributor_id = $1 AND nickname IS NOT NULL`,
    [distributorId],
  );
  return Object.fromEntries(rows.map((r) => [r.shop_id, r.nickname]));
}
