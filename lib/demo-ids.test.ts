import { describe, expect, it } from "vitest";
import { nextDemoId } from "./demo-ids";

describe("demo invoice numbers", () => {
  it("count on from the demo's own range, ignoring other numbers on the contract", () => {
    expect(nextDemoId([])).toBe(1001n);
    expect(nextDemoId([1001n, 1008n, 1004n])).toBe(1009n);
    expect(nextDemoId([1001n, 1008n, 998473n, 910131n])).toBe(1009n); // a test invoice and a real distributor's
    expect(nextDemoId([5n, 998473n])).toBe(1001n);
  });
});
