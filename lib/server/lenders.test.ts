import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
process.env.WALLET_KEY = randomBytes(32).toString("base64");
process.env.SESSION_SECRET = randomBytes(32).toString("base64");

const { setDbForTests } = await import("./db");
const { applySchema, seedDemo } = await import("./setup");
const { signUp } = await import("./accounts");
const { getDirectory, invalidateDirectory } = await import("./directory");
const { owns } = await import("./authz");
const l = await import("./lenders");
const d = await import("./distributors");

const noNetwork = { fund: async () => {}, addUsdcTrustline: async () => {} };
const details = { businessName: "Cooperativa  Ahorro Sur", country: "El Salvador", licence: "SSF-COOP-0142", nit: "0614-120394-101-3" };
type Db = { query: (text: string, params?: unknown[]) => Promise<never[]> };
let db: Db;

async function freshDb(schema = readFileSync("db/schema.sql", "utf8")) {
  const pg = new PGlite();
  db = { query: async (text: string, params: unknown[] = []) => (await pg.query(text, params)).rows as never[] };
  await applySchema(db, schema);
  await seedDemo(db);
  setDbForTests(db);
  invalidateDirectory();
}

async function newLender(contact = "ana@coop.example", over: Partial<typeof details> = {}) {
  await l.ensureLenderTables(db);
  const result = await signUp({ role: "prestamista", name: "Ana Pérez", contact, password: "segura123" }, noNetwork);
  if (!result.ok) throw new Error(result.message);
  return { user: result.user, lender: await l.registerLender(result.user, { ...details, ...over }) };
}

afterEach(() => {
  delete process.env.RELAY_AUTO_APPROVE_SECONDS;
});

describe("lender details", () => {
  it("explains what's missing", () => {
    expect(l.checkLenderDetails(details)).toBeNull();
    expect(l.checkLenderDetails({ ...details, businessName: " " })).toBe("Escriba el nombre de la empresa.");
    expect(l.checkLenderDetails({ ...details, country: "" })).toBe("Escriba el país.");
    expect(l.checkLenderDetails({ ...details, licence: "x" })).toBe("Escriba el número de licencia o registro.");
    expect(l.checkLenderDetails({ businessName: 5, country: "SV", licence: "123" } as never)).toBe("Escriba el nombre de la empresa.");
  });
});

describe("lender sign-up and approval (#207)", () => {
  beforeEach(() => freshDb());

  it("registers the business as pending, on the owner's own account, and it is the owner's party", async () => {
    const { user, lender } = await newLender();
    expect(lender).toMatchObject({
      businessName: "Cooperativa Ahorro Sur",
      country: "El Salvador",
      licence: "SSF-COOP-0142",
      status: "pendiente",
      stellarAddress: user.stellarAddress,
      ownerName: "Ana Pérez",
      ownerContact: "ana@coop.example",
    });
    expect(user.role).toBe("prestamista");
    expect(await l.lenderForUser(user.id)).toEqual(lender);
    const party = (await getDirectory()).find(lender.id, "lender");
    expect(party).toMatchObject({ address: user.stellarAddress, status: "pendiente" });
    expect(await owns(user, { id: lender.id, kind: "lender" })).toBe(true);
  });

  it("approves on the contract, takes the approval away, and approves again", async () => {
    const { lender } = await newLender();
    const onChain = vi.fn(async () => {});
    expect(await l.decideLender(lender.id, "revocado", onChain)).toMatchObject({ status: "pendiente" }); // nothing to take away yet
    expect(onChain).not.toHaveBeenCalled();
    expect(await l.decideLender(lender.id, "aprobado", onChain)).toMatchObject({ status: "aprobado" });
    expect(onChain).toHaveBeenLastCalledWith(lender.stellarAddress, true);
    expect(await l.decideLender(lender.id, "revocado", onChain)).toMatchObject({ status: "revocado" });
    expect(onChain).toHaveBeenLastCalledWith(lender.stellarAddress, false);
    expect(await l.decideLender(lender.id, "aprobado", onChain)).toMatchObject({ status: "aprobado" });
    expect(onChain).toHaveBeenCalledTimes(3);
    const list = await l.listLendersForAdmin();
    expect(list.pending).toHaveLength(0);
    expect(list.decided.map((x) => x.id)).toEqual([lender.id]);
  });

  it("stays pending if the contract call fails", async () => {
    const { lender } = await newLender();
    await expect(l.decideLender(lender.id, "aprobado", async () => Promise.reject(new Error("rpc down")))).rejects.toThrow("rpc down");
    expect((await l.lenderById(lender.id))?.status).toBe("pendiente");
  });

  it("never approves a distributor's business: distributors don't fund the pool", async () => {
    const dist = await signUp({ role: "distribuidora", name: "Luis", contact: "luis@norte.example", password: "segura123" }, noNetwork);
    if (!dist.ok) throw new Error(dist.message);
    await d.registerDistributor(dist.user, { businessName: "Distribuidora Norte", nit: "06141203941013", address: "Calle 5, San Miguel", sells: ["Snacks"], shopsApprox: "", driversApprox: "" });
    expect(await l.isDistributorBusiness(db, "  distribuidora   NORTE ")).toBe(true);
    expect(await l.isDistributorBusiness(db, "Cooperativa Ahorro Sur")).toBe(false);
    expect(await l.isDistributorBusiness(db, "otro nombre", dist.user.stellarAddress)).toBe(true);

    const { lender } = await newLender("caja@norte.example", { businessName: "Distribuidora Norte" });
    const onChain = vi.fn(async () => {});
    await expect(l.decideLender(lender.id, "aprobado", onChain)).rejects.toThrow(l.NO_DISTRIBUTORS);
    expect(onChain).not.toHaveBeenCalled();
  });

  it("auto-approves after the demo's seconds, never before, and never undoes a revoke", async () => {
    const { lender } = await newLender();
    const onChain = vi.fn(async () => {});
    expect(await l.approveLenderIfDue(lender, onChain)).toMatchObject({ status: "pendiente" }); // setting off
    process.env.RELAY_AUTO_APPROVE_SECONDS = "8";
    const created = Date.parse(lender.createdAt);
    expect(await l.approveLenderIfDue(lender, onChain, created + 5_000)).toMatchObject({ status: "pendiente" });
    expect(await l.approveLenderIfDue(lender, onChain, created + 9_000)).toMatchObject({ status: "aprobado" });
    const revoked = await l.decideLender(lender.id, "revocado", onChain);
    expect(await l.approveLenderIfDue(revoked!, onChain, created + 60_000)).toMatchObject({ status: "revocado" });
  });
});

describe("identity record (#215)", () => {
  beforeEach(() => freshDb());

  it("keeps only the numbers and the status, and shows them to /admin", async () => {
    const { recordIdentity } = await import("./identity");
    const { lender } = await newLender();
    expect(lender).toMatchObject({ idCheck: "sin_verificar", repDui: null, matricula: null, nit: "0614-120394-101-3" });
    await recordIdentity(db, "lenders", lender.id, { dui: "012345678", birthDate: "1985-04-02", matricula: "2016 012345" });
    expect(await l.lenderById(lender.id)).toMatchObject({ idCheck: "verificada_demo", repDui: "01234567-8", matricula: "2016012345" });
    await expect(recordIdentity(db, "lenders", lender.id, { dui: "1", birthDate: "", matricula: "" })).rejects.toThrow();
  });
});

describe("the live database from before lenders", () => {
  it("adds the lender role and table on first use", async () => {
    const old = readFileSync("db/schema.sql", "utf8")
      .replace("'admin', 'prestamista'", "'admin'")
      .replace(/CREATE TABLE IF NOT EXISTS lenders \([\s\S]*?\);/, "")
      .replace(/^ALTER TABLE lenders .*$/gm, "");
    await freshDb(old);
    expect(await getDirectory()).toBeTruthy(); // no lenders table yet: the directory still works
    const early = await signUp({ role: "prestamista", name: "Ana", contact: "early@coop.example", password: "segura123" }, noNetwork).catch((e) => e);
    expect(String(early)).toMatch(/check|constraint/i);
    const { lender } = await newLender();
    expect(lender.status).toBe("pendiente");
    expect((await getDirectory()).find(lender.id, "lender")).toBeTruthy();
  });
});
