import { describe, expect, it } from "vitest";
import { reminderLink } from "./whatsapp";

const now = 1_794_506_400;
const input = {
  phone: "7123-4567",
  shopName: "Tienda Rosa",
  amountUnits: 1_500_000_000n,
  dueAt: now + 172_800,
  now,
};

describe("reminderLink", () => {
  it.each(["7123-4567", "71234567", "+503 7123 4567", "503 71234567"])(
    "normalizes mobile number %s",
    (phone) => {
      expect(reminderLink({ ...input, phone })).toMatch(/^https:\/\/wa\.me\/50371234567\?text=/);
    },
  );

  it.each([
    ["2234-5678", "/50322345678"],
    ["6234-5678", "/50362345678"],
  ])("accepts local number %s", (phone, pathname) => {
    const url = new URL(reminderLink({ ...input, phone }));
    expect(url.origin).toBe("https://wa.me");
    expect(url.pathname).toBe(pathname);
  });

  it.each(["1234567", "+1 519 555 0123", "51234567", "abc", "++503 7123 4567"])(
    "rejects invalid phone number %s",
    (phone) => {
      expect(() => reminderLink({ ...input, phone })).toThrow(
        "Número de teléfono inválido: use 8 dígitos de El Salvador, por ejemplo 7123-4567",
      );
    },
  );

  it("prefills the Spanish reminder for an upcoming payment", () => {
    const url = new URL(reminderLink(input));
    expect(url.searchParams.get("text")).toBe(
      "Hola Tienda Rosa, le recordamos que su pago de $150.00 vence en 2 días. ¡Gracias!",
    );
  });

  it("prefills the Spanish reminder for an overdue payment", () => {
    const url = new URL(reminderLink({ ...input, dueAt: now - 259_200 }));
    expect(url.searchParams.get("text")).toBe(
      "Hola Tienda Rosa, le recordamos que su pago de $150.00 venció hace 3 días. ¡Gracias!",
    );
  });

  it.each([0, -1])("prefills the pending-payment reminder for due timestamp %s", (dueAt) => {
    const url = new URL(reminderLink({ ...input, dueAt }));
    expect(url.searchParams.get("text")).toBe(
      "Hola Tienda Rosa, le recordamos su pago pendiente de $150.00. ¡Gracias!",
    );
  });

  it("includes the supplied payment URL in the encoded reminder", () => {
    const link = "https://relay-sv.vercel.app/tienda/1001?from=whatsapp&lang=es";
    const url = new URL(reminderLink({ ...input, link }));
    expect([...url.searchParams.keys()]).toEqual(["text"]);
    expect(url.searchParams.get("text")).toBe(
      `Hola Tienda Rosa, le recordamos que su pago de $150.00 vence en 2 días. Puede pagar aquí: ${link} ¡Gracias!`,
    );
  });

  it("keeps shop name punctuation and accents inside the message", () => {
    const url = new URL(reminderLink({ ...input, shopName: "Tienda Peña & Hijos #1" }));
    expect([...url.searchParams.keys()]).toEqual(["text"]);
    expect(url.searchParams.get("text")).toContain("Hola Tienda Peña & Hijos #1,");
    expect(url.hash).toBe("");
  });

  it.each([0n, -1n])("rejects a payment amount of %s units", (amountUnits) => {
    expect(() => reminderLink({ ...input, amountUnits })).toThrow("Monto inválido.");
  });
});
