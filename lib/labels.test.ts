import { describe, expect, it } from "vitest";
import { creditPayout, parseAmount, partPayError } from "./labels";

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

describe("partPayError", () => {
  it("checks the amount against what's left", () => {
    expect(partPayError("abc", 100)).toBe("Monto inválido.");
    expect(partPayError("100.01", 100)).toBe("El monto es mayor que lo pendiente.");
    expect(partPayError("50", 100)).toBeNull();
    expect(partPayError("100", 100)).toBeNull();
  });
  it("leaves room for cash the driver already recorded", () => {
    expect(partPayError("40", 100, 60)).toBeNull();
    expect(partPayError("40,01", 100, 60)).toBe("Hay $60.00 en efectivo por confirmar. Puede pagar hasta $40.00.");
  });
});
