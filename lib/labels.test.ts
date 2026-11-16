import { describe, expect, it } from "vitest";
import { creditFee, creditFeeBps, parseAmount, partPayError, recourseRequired, shopCreditFeeBps, splitBlock, trustedBufferBps, trustLevel } from "./labels";

describe("credit fee", () => {
  it("is 1.5% when the whole invoice goes on credit", () => {
    expect(creditFee(100, 100)).toBe(1.5);
    expect(creditFee(150, 150)).toBe(2.25);
    expect(creditFee(85.5, 85.5)).toBe(1.2825);
  });
  it("slides down to 1% the more the shop paid up front, like the contract's tests", () => {
    expect(creditFeeBps(50, 100)).toBe(122);
    expect(creditFee(50, 100)).toBe(0.61);
    expect(creditFeeBps(100, 150)).toBe(131);
    expect(creditFeeBps(10, 100)).toBe(100);
    expect(creditFeeBps(1, 100)).toBe(100);
    // The same rate whether amounts are in cents or 7-decimal units.
    expect(creditFeeBps(50_00, 100_00)).toBe(creditFeeBps(500_000_000, 1_000_000_000));
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

describe("trusted shops and the recourse tier (#185), same math as the contract", () => {
  it("cuts the buffer's share by thirds at 4 and 8 good cycles", () => {
    expect(trustedBufferBps(75, 3)).toBe(75);
    expect(trustedBufferBps(75, 4)).toBe(50);
    expect(trustedBufferBps(75, 8)).toBe(25);
    expect(trustedBufferBps(38, 4)).toBe(25);
    expect(trustedBufferBps(38, 8)).toBe(12);
  });

  it("gives the whole rate: 1.50% -> 1.25% -> 1.00%, or 0.25% when vouched", () => {
    expect(shopCreditFeeBps(100, 100)).toBe(150);
    expect(shopCreditFeeBps(100, 100, 4)).toBe(125);
    expect(shopCreditFeeBps(100, 100, 9)).toBe(100);
    expect(shopCreditFeeBps(10, 100, 8)).toBe(74); // 50 lenders + 12 buffer + 12 us
    expect(shopCreditFeeBps(100, 100, 0, true)).toBe(25);
    expect(creditFee(100, 100, 4)).toBe(1.25);
    expect(creditFee(100, 100, 0, true)).toBe(0.25);
    expect(trustLevel(3)).toBe(0);
    expect(trustLevel(4)).toBe(1);
    expect(trustLevel(8)).toBe(2);
  });

  it("needs a deposit of 20% of the vouched credit, rounded up to the cent", () => {
    expect(recourseRequired(0)).toBe(0);
    expect(recourseRequired(100)).toBe(20);
    expect(recourseRequired(0.01)).toBe(0.01);
    expect(recourseRequired(85.5)).toBe(17.1);
  });
});

describe("split at the door (#235)", () => {
  const shop = { id: "s", name: "S", owner: "O", creditLimit: 200, creditOwed: 50, overdue: false, onTime: 0, late: 0, lateMinor: 0, lateMajor: 0, maxDaysLate: 0 };
  const invoice = { id: 1, shopId: "s", driverId: "d", amount: 220, paid: 0, dueDate: "", status: "due" as const };
  it("lets the rest on credit when it fits the limit and the pool", () => {
    expect(splitBlock(shop, invoice, 150, 1000)).toBeNull();
    expect(splitBlock(shop, invoice, 150.01, 1000)).toBe("Supera su límite de crédito.");
    expect(splitBlock(shop, invoice, 150, 100)).toBe("Hoy no hay fondos para crédito. Intente más tarde.");
    expect(splitBlock(shop, invoice, 0)).toBe("Para pagar todo, use «Pagar ahora».");
  });
  it("is closed while late, without credit, or already on 7 days", () => {
    expect(splitBlock({ ...shop, overdue: true }, invoice, 10)).toBe("Tiene un pago vencido.");
    expect(splitBlock({ ...shop, laterOverdue: true }, { ...invoice, ownCredit: true }, 10)).toBe("Tiene un pago vencido.");
    expect(splitBlock({ ...shop, unlock: { paid: 1, needed: 2 } }, invoice, 10)).toBe("Su tienda aún no tiene crédito.");
    expect(splitBlock(shop, { ...invoice, later: true }, 10)).toBe("Esta factura ya está en 7 días con su distribuidora.");
    // The distributor's own 7 days have no pool limit.
    expect(splitBlock({ ...shop, creditLimit: 0 }, { ...invoice, ownCredit: true }, 500)).toBeNull();
  });
});
