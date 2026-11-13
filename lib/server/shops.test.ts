import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
process.env.WALLET_KEY = randomBytes(32).toString("base64");
process.env.SESSION_SECRET = randomBytes(32).toString("base64");

const { setDbForTests } = await import("./db");
const { applySchema, seedDemo } = await import("./setup");
const { signUp } = await import("./accounts");
const { getDirectory, invalidateDirectory, keypairForId } = await import("./directory");
const { registerDistributor, decide } = await import("./distributors");
const shops = await import("./shops");

const noNetwork = { fund: async () => {}, addUsdcTrustline: async () => {} };

async function distributor(name: string, email: string) {
  const owner = await signUp({ role: "distribuidora", name, contact: email, password: "segura123" }, noNetwork);
  if (!owner.ok) throw new Error(owner.message);
  const d = await registerDistributor(owner.user, {
    businessName: name,
    nit: "06141203941013",
    address: "Calle 5, San Miguel",
    sells: ["Snacks"],
    shopsApprox: "",
    driversApprox: "",
  });
  await decide(d.id, "aprobado", async () => {});
  return d;
}

async function setup() {
  const pg = new PGlite();
  const db = { query: async (text: string, params: unknown[] = []) => (await pg.query(text, params)).rows as never[] };
  await applySchema(db, readFileSync("db/schema.sql", "utf8"));
  await seedDemo(db);
  setDbForTests(db);
  invalidateDirectory();
  return { norte: await distributor("Norte", "ana@norte.example"), sol: await distributor("El Sol", "luis@sol.example") };
}

const marta = { nickname: "Tienda de Doña Marta, frente a la iglesia", address: "", phone: "7000-0132", driverId: null };
const claim = { ownerName: "Marta Pérez", phone: "7000-0132", password: "segura123", shopName: "Tienda Marta" };

describe("adding shops", () => {
  let norte = "";
  let sol = "";
  beforeEach(async () => {
    const both = await setup();
    norte = both.norte.id;
    sol = both.sol.id;
  });

  it("adds a shop without an account: held wallet, linked, invited, in the directory", async () => {
    const added = await shops.addShopWithoutAccount(norte, marta, noNetwork);
    if ("error" in added) throw new Error(added.error);
    expect(added.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    const [row] = await shops.listShops(norte);
    expect(row).toMatchObject({ id: added.shopId, nickname: marta.nickname, status: "invitada", inviteCode: added.code, phone: "+50370000132" });
    const party = (await getDirectory()).find(added.shopId, "shop");
    expect(party?.address).toMatch(/^G/);
    expect((await keypairForId(added.shopId)).publicKey()).toBe(party?.address);
  });

  it("checks the name and phone", async () => {
    expect(await shops.addShopWithoutAccount(norte, { ...marta, nickname: " " }, noNetwork)).toEqual({
      error: "Escriba un nombre para reconocer la tienda.",
    });
    expect(await shops.addShopWithoutAccount(norte, { ...marta, phone: "123" }, noNetwork)).toEqual({
      error: "Escriba un teléfono de El Salvador (8 dígitos) o déjelo vacío.",
    });
    const noPhone = await shops.addShopWithoutAccount(norte, { ...marta, phone: "" }, noNetwork);
    expect("shopId" in noPhone).toBe(true);
  });

  it("lets the owner claim it once: own name, same shop and wallet, nickname kept for the distributor", async () => {
    const added = await shops.addShopWithoutAccount(norte, marta, noNetwork);
    if ("error" in added) throw new Error(added.error);
    const before = (await getDirectory()).find(added.shopId, "shop")?.address;
    const claimed = await shops.claimShop(added.code.toLowerCase(), claim, noNetwork);
    expect(claimed).toMatchObject({ ok: true, shopId: added.shopId });
    const [row] = await shops.listShops(norte);
    expect(row).toMatchObject({ name: "Tienda Marta", nickname: marta.nickname, status: "activa", ownerName: "Marta Pérez", inviteCode: null });
    expect((await getDirectory()).find(added.shopId, "shop")?.address).toBe(before);
    expect(await shops.nicknames(norte)).toEqual({ [added.shopId]: marta.nickname });
    expect(await shops.pendingCodes([added.shopId])).toEqual({});
    expect(await shops.claimShop(added.code, { ...claim, phone: "7000-0133" }, noNetwork)).toEqual({
      ok: false,
      message: "Este código ya no es válido. Pida otro a su distribuidora.",
    });
    if (claimed.ok) expect(await shops.shopIdForUser(claimed.user)).toBe(added.shopId);
  });

  it("finds claimed shops for another distributor, who can add them; the shop can remove a supplier", async () => {
    const added = await shops.addShopWithoutAccount(norte, marta, noNetwork);
    if ("error" in added) throw new Error(added.error);
    expect(await shops.searchShops(sol, "marta")).toEqual([]); // not claimed yet: nobody to find
    const claimed = await shops.claimShop(added.code, claim, noNetwork);
    if (!claimed.ok) throw new Error(claimed.message);

    expect((await shops.searchShops(sol, "marta")).map((m) => m.id)).toEqual([added.shopId]);
    expect((await shops.searchShops(sol, "7000 0132")).map((m) => m.id)).toEqual([added.shopId]);
    expect(await shops.searchShops(norte, "marta")).toEqual([]); // already theirs
    expect(await shops.searchShops(sol, "%")).toEqual([]);
    expect(await shops.linkShop(sol, added.shopId, null)).toBe(true);
    expect(await shops.linkShop(sol, added.shopId, null)).toBe(false);
    expect((await shops.suppliersOf(added.shopId)).map((s) => s.name).sort()).toEqual(["El Sol", "Norte"]);

    const stranger = await signUp({ role: "tienda", name: "Otro", contact: "otro@example.com", password: "segura123" }, noNetwork);
    if (!stranger.ok) throw new Error(stranger.message);
    expect(await shops.removeSupplier(stranger.user, added.shopId, sol)).toBe(false);
    expect(await shops.removeSupplier(claimed.user, added.shopId, sol)).toBe(true);
    expect((await shops.suppliersOf(added.shopId)).map((s) => s.name)).toEqual(["Norte"]);
  });

  it("won't link a shop nobody owns from search", async () => {
    const added = await shops.addShopWithoutAccount(norte, marta, noNetwork);
    if ("error" in added) throw new Error(added.error);
    expect(await shops.linkShop(sol, added.shopId, null)).toBe(false);
  });
});
