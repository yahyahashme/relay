import { describe, expect, it } from "vitest";
import { invoicePayHref } from "./pay-link";
import type { Invoice } from "./types";
import { waNumber } from "./whatsapp";

const NOW = Date.parse("2026-11-17T15:00:00Z");
const invoice = (over: Partial<Invoice> = {}): Invoice => ({
  id: 1004, shopId: "tienda-1", driverId: "motorista-1", amount: 60, paid: 0, dueDate: "2026-11-18T18:00:00Z", status: "due", ...over,
});

describe("Enviar enlace de pago", () => {
  it("sends the invoice's own page, what's left and the due date to the given number", () => {
    const href = invoicePayHref(invoice({ paid: 20, status: "part_paid" }), "Tienda Rosa", { to: "50370001234", distributorName: "Distribuidora El Sol" }, NOW, "https://relay-sv.vercel.app")!;
    expect(href.startsWith("https://wa.me/50370001234?text=")).toBe(true);
    const text = decodeURIComponent(href.split("text=")[1]);
    expect(text).toBe(
      "Hola Tienda Rosa, su factura 1004 de Distribuidora El Sol por $40.00 está lista para pagar (vence mañana). Puede pagarla aquí con dólares digitales cuando quiera, sin esperar al motorista: https://relay-sv.vercel.app/tienda/1004",
    );
  });

  it("lets WhatsApp ask who to send to when there is no number", () => {
    expect(invoicePayHref(invoice(), "Tienda Rosa", { to: "" }, NOW, "https://x.test")!.startsWith("https://wa.me/?text=")).toBe(true);
  });

  it("has nothing to send for a paid invoice or without a target", () => {
    expect(invoicePayHref(invoice({ paid: 60, status: "paid" }), "Tienda Rosa", { to: "" }, NOW, "https://x.test")).toBeNull();
    expect(invoicePayHref(invoice(), "Tienda Rosa", undefined, NOW, "https://x.test")).toBeNull();
  });

  it("reads El Salvador numbers only", () => {
    expect(waNumber("7123-4567")).toBe("50371234567");
    expect(waNumber("+503 7123 4567")).toBe("50371234567");
    expect(waNumber("12345")).toBe("");
    expect(waNumber(null)).toBe("");
  });
});
