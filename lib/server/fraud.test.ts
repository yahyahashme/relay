import { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { decideReview, inReview, listReviews, recordFlags, scan } = await import("./fraud");

async function freshDb() {
  const pg = new PGlite();
  return { query: async (text: string, params: unknown[] = []) => (await pg.query(text, params)).rows as never[] };
}

const SAME = [{ rule: "same_contact" as const, shopId: "t1", shopName: "Tienda 1" }];
const BIG = [{ rule: "big_invoice" as const, invoiceId: 9, shopId: "t1" }];

describe("fraud reviews (#231)", () => {
  let db: Awaited<ReturnType<typeof freshDb>>;
  beforeEach(async () => {
    db = await freshDb();
  });

  it("opens a review, pauses credit, and stays quiet about flags an admin cleared", async () => {
    expect(await recordFlags(db, "distributor", "d1", "El Sol", SAME)).toBe(true);
    expect(await inReview(db, "distributor", "d1")).toBe(true);
    await decideReview(db, "distributor", "d1", "prueba_pedida", "Pedimos el DTE");
    expect(await inReview(db, "distributor", "d1")).toBe(true);
    await decideReview(db, "distributor", "d1", "despejada");
    expect(await inReview(db, "distributor", "d1")).toBe(false);

    expect(await recordFlags(db, "distributor", "d1", "El Sol", SAME)).toBe(false); // already cleared
    expect(await inReview(db, "distributor", "d1")).toBe(false);
    expect(await recordFlags(db, "distributor", "d1", "El Sol", [...SAME, ...BIG])).toBe(true); // something new
    const [review] = await listReviews(db);
    expect(review).toMatchObject({ status: "en_revision", note: "Pedimos el DTE", flags: [...SAME, ...BIG] });
  });

  it("never reopens a closed account", async () => {
    await recordFlags(db, "shop", "t1", "Tienda 1", SAME);
    await decideReview(db, "shop", "t1", "cerrada");
    expect(await recordFlags(db, "shop", "t1", "Tienda 1", BIG)).toBe(false);
    expect((await listReviews(db))[0].status).toBe("cerrada");
  });

  it("scans distributors and flags shops that defaulted", async () => {
    const now = Date.UTC(2026, 10, 16);
    const opened = await scan(db, {
      now,
      distributors: [{ id: "d1", name: "El Sol", phones: ["70000001"], passkeys: [], invoices: [{ id: 1, shopId: "t1", amount: 50, credit: true, later: false, paid: 50, due: now }] }],
      shops: [{ id: "t1", name: "Tienda 1", phones: ["70000001"], passkeys: [], limit: 200, defaulted: true }],
    });
    expect(opened).toBe(2);
    expect((await listReviews(db)).map((r) => [r.kind, r.partyId])).toEqual(
      expect.arrayContaining([
        ["distributor", "d1"],
        ["shop", "t1"],
      ]),
    );
  });
});
