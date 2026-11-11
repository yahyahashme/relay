import { beforeEach, describe, expect, it } from "vitest";
import * as mock from "./mock";

const NOW = Date.parse("2026-11-12T18:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
let now = NOW;

beforeEach(() => {
  now = NOW;
  mock.resetMock(() => now);
});

describe("seed data", () => {
  it("has the 8 demo invoices, unpaid and due in 7 days", () => {
    const invoices = mock.getInvoices();
    expect(invoices.map((i) => i.id)).toEqual([1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008]);
    expect(invoices[1]).toMatchObject({ shopId: "tienda-2", driverId: "motorista-1", amount: 85.5, paid: 0, status: "due" });
    expect(invoices[0].dueDate).toBe(new Date(NOW + 7 * DAY).toISOString());
  });

  it("has three shops with a $200 limit and a $5,000 pool", () => {
    expect(mock.getShop("tienda-1")).toMatchObject({ name: "Tienda Rosa", creditLimit: 200, creditOwed: 0, overdue: false });
    expect(mock.getShop("nope")).toBeNull();
    expect(mock.getPool()).toEqual({ available: 5000, buffer: 50 });
    expect(mock.getDrivers().map((d) => d.name)).toEqual(["Carlos", "Ana"]);
  });
});

describe("pay now", () => {
  it("pays what's left when no amount is given", () => {
    expect(mock.payNow(1001).ok).toBe(true);
    expect(mock.getInvoice(1001)).toMatchObject({ paid: 150, status: "paid", method: "digital" });
    expect(mock.payNow(1001)).toEqual({ ok: false, message: "Esta factura ya está pagada." });
  });

  it("allows part payments but not overpaying", () => {
    expect(mock.payNow(1002, 50).message).toBe("Pago recibido: $50.00. Falta $35.50.");
    expect(mock.getInvoice(1002)?.status).toBe("part_paid");
    expect(mock.payNow(1002, 40).ok).toBe(false);
    expect(mock.payNow(1002, 0).message).toBe("Monto inválido.");
  });
});

describe("cash", () => {
  it("is a driver claim, then a shop confirm", () => {
    expect(mock.confirmCash(1001, 150).message).toBe("El motorista aún no registró el efectivo.");
    expect(mock.claimCash(1001, 150).ok).toBe(true);
    expect(mock.getInvoice(1001)?.cashClaim).toBe(150);
    expect(mock.getInvoice(1001)?.status).toBe("due");

    expect(mock.confirmCash(1001, 150).ok).toBe(true);
    expect(mock.getInvoice(1001)).toMatchObject({ status: "paid", method: "cash" });
    expect(mock.getInvoice(1001)?.cashClaim).toBeUndefined();
    expect(mock.getDrivers()[0].cashHeld).toBe(150);
  });

  it("marks part cash and part digital as mixed", () => {
    mock.claimCash(1001, 50);
    mock.confirmCash(1001, 50);
    mock.payNow(1001);
    expect(mock.getInvoice(1001)).toMatchObject({ status: "paid", method: "mixed" });
  });
});

describe("pay in 7 days", () => {
  it("is due in 7 days and uses the pool like the contract", () => {
    expect(mock.payLater(1001).ok).toBe(true);
    expect(mock.getInvoice(1001)).toMatchObject({ status: "paid", method: "credit" });
    expect(mock.getShop("tienda-1")).toMatchObject({ creditOwed: 150, overdue: false, creditDue: new Date(NOW + 7 * DAY).toISOString() });
    // $150 on credit: the pool gives up $149.25 and keeps $1.125 as a buffer.
    expect(mock.getPool()).toEqual({ available: 4850.75, buffer: 51.125 });
  });

  it("stops at the limit and while overdue", () => {
    expect(mock.payLater(1003).message).toBe("Supera su límite de crédito.");
    mock.payLater(1001); // tienda-1 owes $150
    expect(mock.payLater(1004).message).toBe("Supera su límite de crédito."); // $150 + $60 > $200
    expect(mock.payLater(1007).ok).toBe(true); // $150 + $40 = $190

    now = NOW + 8 * DAY;
    expect(mock.getShop("tienda-1")?.overdue).toBe(true);
    mock.createDemoInvoice("tienda-1");
    const newest = mock.getInvoices().at(-1)!;
    expect(mock.payLater(newest.id).message).toBe("Tiene un pago vencido.");
  });
});

describe("repay", () => {
  it("adds $25 to the limit when the whole debt is paid on time", () => {
    mock.payLater(1001);
    expect(mock.repay("tienda-1", 100).message).toBe("Pago recibido: $100.00. Falta $50.00.");
    expect(mock.repay("tienda-1", 50).message).toBe("Deuda pagada a tiempo. Su límite subió a $225.00.");
    expect(mock.getShop("tienda-1")).toMatchObject({ creditLimit: 225, creditOwed: 0, onTime: 1, late: 0 });
    expect(mock.getShop("tienda-1")?.creditDue).toBeUndefined();
    expect(mock.repay("tienda-1", 1).message).toBe("No tiene deudas pendientes.");
  });

  it("drops the limit $25 when paid late", () => {
    mock.payLater(1001);
    now = NOW + 8 * DAY;
    expect(mock.repay("tienda-1", 150).message).toBe("Deuda pagada con atraso. Su límite bajó a $175.00.");
    expect(mock.getShop("tienda-1")).toMatchObject({ creditLimit: 175, onTime: 0, late: 1 });
  });

  it("only grows after a $40+ cycle, once per week", () => {
    mock.payLater(1001); // $150
    mock.repay("tienda-1", 150);
    expect(mock.getShop("tienda-1")?.creditLimit).toBe(225);
    mock.payLater(1004); // $60, same week
    expect(mock.repay("tienda-1", 60).message).toBe("Deuda pagada a tiempo. Gracias.");
    expect(mock.getShop("tienda-1")?.creditLimit).toBe(225);

    now = NOW + 7 * DAY;
    mock.payLater(1007); // $40 is enough
    mock.repay("tienda-1", 40);
    expect(mock.getShop("tienda-1")?.creditLimit).toBe(250);
  });

  it("never grows the limit past $500", () => {
    for (let round = 0; round < 14; round++) {
      now = NOW + round * 7 * DAY;
      const invoice = mock.createDemoInvoice("tienda-2");
      expect(mock.payLater(invoice.id).ok).toBe(true);
      mock.repay("tienda-2", invoice.amount);
    }
    expect(mock.getShop("tienda-2")).toMatchObject({ creditLimit: 500, onTime: 14 });
  });
});

describe("cash confirm", () => {
  it("refuses a claim changed after the shop looked", () => {
    mock.claimCash(1001, 10);
    mock.claimCash(1001, 90);
    expect(mock.confirmCash(1001, 10).message).toBe("El monto en efectivo cambió. Revise y confirme de nuevo.");
    expect(mock.getInvoice(1001)?.paid).toBe(0);
    expect(mock.confirmCash(1001, 90).ok).toBe(true);
  });
});

describe("history and totals", () => {
  it("lists newest first, filtered, with the full count", () => {
    const all = mock.getHistory({}, 3);
    expect(all.total).toBe(8);
    expect(all.invoices.map((i) => i.id)).toEqual([1008, 1007, 1006]);
    const rosa = mock.getHistory({ shopId: "tienda-1" }, 60);
    expect(rosa.invoices.map((i) => i.id)).toEqual([1007, 1004, 1001]);
    expect(mock.getHistory({ driverId: "motorista-2" }, 60).total).toBe(3);
  });

  it("adds every payment to the running totals", () => {
    const before = mock.getTotals();
    expect(before.digital).toBe(0);
    mock.payNow(1001, 50);
    mock.claimCash(1001, 100);
    mock.confirmCash(1001, 100);
    mock.payLater(1002);
    mock.createDemoInvoice("tienda-1");
    const after = mock.getTotals();
    expect(after).toMatchObject({ digital: 50, cash: 100, credit: 85.5, invoices: before.invoices + 1 });
  });
});

describe("cash hand-in", () => {
  it("lowers what the driver holds, never below zero", () => {
    expect(mock.handInCash("motorista-1", 10).message).toBe("Monto inválido.");
    mock.claimCash(1004, 60);
    mock.confirmCash(1004, 60);
    expect(mock.handInCash("motorista-1", 60)).toMatchObject({ ok: true, message: "Listo. Carlos entregó $60.00 en efectivo." });
    expect(mock.getDrivers().find((d) => d.id === "motorista-1")?.cashHeld).toBe(0);
    expect(mock.handInCash("nadie", 1).ok).toBe(false);
  });
});

describe("create invoices", () => {
  it("adds valid rows and rejects a duplicate id", () => {
    const row = { invoiceId: 2001, shopId: "tienda-3", driverId: "motorista-2", amount: "12.50", dueDate: "2026-11-20" };
    expect(mock.createInvoices([row]).message).toBe("Se creó 1 factura.");
    expect(mock.getInvoice(2001)).toMatchObject({ amount: 12.5, dueDate: "2026-11-20T06:00:00.000Z" });
    expect(mock.createInvoices([row]).message).toBe("Fila 1: la factura 2001 ya existe.");
    expect(mock.createInvoices([{ ...row, invoiceId: 2002, amount: "-3" }]).message).toBe("Fila 1: monto inválido.");
  });
});
