import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/stellar/config", () => ({
  config: {
    horizonUrl: "https://horizon.test",
    token: { code: "USDC", issuer: "GISSUER" },
    contracts: { routeLedger: "CCONTRACT" },
    accounts: { admin: "GADMIN", issuer: "GISSUER", sponsor: "GSPONSOR", treasury: "GTREASURY" },
  },
}));
const { isCircle, parseInflows } = await import("./circle-check");

const usdc = { asset_code: "USDC", asset_issuer: "GISSUER" };

describe("parseInflows (#221)", () => {
  it("keeps dólares digitales paid in by accounts, from payments and contract transfers", () => {
    const rows = parseInflows("GSHOP", [
      { type: "payment", created_at: "2026-11-15T00:00:00Z", from: "GA", to: "GSHOP", amount: "10", ...usdc },
      { type: "payment", created_at: "2026-11-15T00:00:00Z", from: "GSHOP", to: "GB", amount: "10", ...usdc }, // out, not in
      { type: "payment", created_at: "2026-11-15T00:00:00Z", from: "GC", to: "GSHOP", amount: "10", asset_code: "XLM" },
      { type: "invoke_host_function", created_at: "2026-11-15T00:00:00Z", asset_balance_changes: [{ type: "transfer", from: "GD", to: "GSHOP", amount: "5", ...usdc }] },
      { type: "invoke_host_function", created_at: "2026-11-15T00:00:00Z", asset_balance_changes: [{ type: "transfer", from: "CCONTRACT", to: "GSHOP", amount: "5", ...usdc }] },
    ]);
    expect(rows.map((r) => r.from)).toEqual(["GA", "GD"]);
  });
});

describe("isCircle (#221)", () => {
  const directory = {
    byAddress: (a: string) => (a === "GDIST" ? { id: "dist-1", kind: "distributor", address: "GDIST" } : undefined),
    ofKind: () => [{ id: "drv", kind: "driver", address: "GDRIVER", distributorId: "dist-1" }],
  };

  it("sees money from the distributor's driver", async () => {
    const inflows = async (a: string) => (a === "GSHOP" ? [{ from: "GDRIVER", at: Date.now() - 1000, amount: 50 }] : []);
    expect(await isCircle(directory as never, "GSHOP", "GDIST", Date.now(), inflows)).toBe(true);
  });

  it("counts the payment when Horizon fails", async () => {
    const inflows = async () => {
      throw new Error("down");
    };
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await isCircle(directory as never, "GSHOP", "GDIST", Date.now(), inflows)).toBe(false);
    log.mockRestore();
  });
});
