import { describe, expect, it } from "vitest";
import { creditPayout, parseAmount } from "./labels";

describe("creditPayout", () => {
  it("takes the 1.5% credit fee off, like the contract", () => {
    expect(creditPayout(100)).toBe(98.5);
    expect(creditPayout(150)).toBe(147.75);
    expect(creditPayout(85.5)).toBe(84.2175);
  });
});

describe("parseAmount", () => {
  it("reads what a shop types", () => {
    expect(parseAmount("12.5")).toBe(12.5);
    expect(parseAmount(" 12,50 ")).toBe(12.5);
    expect(parseAmount("40")).toBe(40);
  });
  it("refuses anything that isn't a positive amount in cents", () => {
    for (const bad of ["", "0", "-5", "abc", "1.234", "1e3", "$5"]) expect(parseAmount(bad)).toBeNull();
  });
});
