import { describe, expect, it } from "vitest";
import { creditPayout } from "./labels";

describe("creditPayout", () => {
  it("takes the 1.5% credit fee off, like the contract", () => {
    expect(creditPayout(100)).toBe(98.5);
    expect(creditPayout(150)).toBe(147.75);
    expect(creditPayout(85.5)).toBe(84.2175);
  });
});
