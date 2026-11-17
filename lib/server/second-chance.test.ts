import { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/stellar/send", () => ({ run: vi.fn() }));
const { addAppeal, closedForFraud, decideAppeal, getAppeal, listAppeals, mayApprove, secondChanceFor } = await import("./second-chance");

async function freshDb() {
  const pg = new PGlite();
  return { query: async (text: string, params: unknown[] = []) => (await pg.query(text, params)).rows as never[] };
}

const SHOP = { id: "t1", name: "Tienda Rosa", writtenOffCents: 6000 };
const ANSWERS = { why: "Me robaron la mercadería", changed: "Ahora cierro con reja", plan: "$10 cada semana" };

describe("second-chance appeals", () => {
  let db: Awaited<ReturnType<typeof freshDb>>;
  beforeEach(async () => {
    db = await freshDb();
  });

  it("keeps one pending appeal, then one approval every 6 months", async () => {
    const first = await addAppeal(db, SHOP, ANSWERS);
    expect(first.ok).toBe(true);
    expect(await addAppeal(db, SHOP, ANSWERS)).toEqual({ ok: false, block: { reason: "pending" } });
    expect(await secondChanceFor(db, "t1")).toMatchObject({ appeal: "pendiente" });

    const id = first.ok ? first.appeal.id : 0;
    expect(await mayApprove(db, (await getAppeal(db, id))!)).toBe(true);
    expect(await decideAppeal(db, id, "aprobada")).toBe(true);
    expect(await decideAppeal(db, id, "rechazada")).toBe(false); // already decided

    const again = await addAppeal(db, SHOP, ANSWERS);
    expect(again).toMatchObject({ ok: false, block: { reason: "cooldown" } });
    expect((await secondChanceFor(db, "t1"))?.nextAppealFrom).toBeDefined();
    expect((await addAppeal(db, SHOP, ANSWERS, Date.now() + 200 * 24 * 60 * 60 * 1000)).ok).toBe(true);
    const [newest] = await listAppeals(db);
    expect(newest).toMatchObject({ status: "pendiente", shopName: "Tienda Rosa", writtenOff: 60, why: ANSWERS.why });
  });

  it("gives no second chance to a shop closed for fraud", async () => {
    expect(await closedForFraud(db, "t1")).toBe(false);
    await db.query(`INSERT INTO fraud_reviews (kind, party_id, name, status) VALUES ('shop', 't1', 'Tienda Rosa', 'cerrada')`);
    expect(await closedForFraud(db, "t1")).toBe(true);
    expect(await secondChanceFor(db, "t1")).toBeNull();
  });
});
