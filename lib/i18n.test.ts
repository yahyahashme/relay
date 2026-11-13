import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseInvoiceCsv } from "./csv";
import { EN, formatDayIn, message, translate } from "./i18n";
import { METHOD_LABEL, partPayError } from "./labels";
import * as mock from "./mock";

vi.mock("server-only", () => ({}));
const { FALLBACK_MESSAGE, errorMessage } = await import("./stellar/errors");

// ---------- every screen string has English ----------

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) && !name.includes(".test.") ? [path] : [];
  });
}

/** Every string literal passed to t(...), including both sides of t(cond ? "a" : "b"). */
function tKeys(): Set<string> {
  const keys = new Set<string>();
  for (const file of [...sourceFiles("app"), ...sourceFiles("components")]) {
    const text = readFileSync(file, "utf8");
    for (const call of text.matchAll(/\bt\(\s*([^()]*?(?:\([^()]*\)[^()]*?)*)\)/g)) {
      const head = call[1].split(/,\s*\{/)[0]; // the template, not the values object
      const literals = [...head.matchAll(/"((?:[^"\\]|\\.)*)"/g)];
      // t(cond ? "a" : "b"): only the answers. A "?" inside a string ("¿Qué vende?") isn't a condition.
      const outside = head.replace(/"((?:[^"\\]|\\.)*)"/g, (m) => " ".repeat(m.length));
      const question = outside.indexOf("?");
      for (const literal of literals) if (question < 0 || (literal.index ?? 0) > question) keys.add(literal[1]);
    }
  }
  return keys;
}

// Keys reached through variables: status chips, methods, filters, table headers, why credit is blocked.
const VARIABLE_KEYS = [
  "Pendiente", "Parcial", "Pagada", "Crédito",
  ...Object.values(METHOD_LABEL),
  "Todas", "Factura", "Tienda", "Motorista", "Monto", "Pagado", "Estado", "Método", "Vence",
  "Su tienda aún no tiene crédito", "Tiene un pago vencido", "Supera su límite de crédito", "Sin intereses",
  "Snacks", "Bebidas", "Pan", "Lácteos", "Abarrotes", "Limpieza", "Otros", // what a distributor sells (#130)
  "Tienda", "Distribuidora", "Motorista", "Administrador", // account types (#129)
  "Compro a distribuidores", "Vendo y entrego a tiendas", "Entrego para una distribuidora",
];

describe("screen text", () => {
  it("finds the t() strings in the screens", () => {
    expect(tKeys().size).toBeGreaterThan(80);
  });

  it("has English for every string the screens translate", () => {
    const missing = [...tKeys(), ...VARIABLE_KEYS].filter((key) => EN[key] === undefined);
    expect(missing).toEqual([]);
  });

  it("keeps the same {placeholders} and <b> marks in Spanish and English", () => {
    const marks = (s: string) => [...s.matchAll(/\{\w+\}|<\/?b>/g)].map((m) => m[0]).sort();
    const wrong = Object.entries(EN).filter(([es, en]) => marks(es).join() !== marks(en).join());
    expect(wrong).toEqual([]);
  });

  it("leaves no Spanish behind in English", () => {
    const spanish = /[áéíóúñ¿¡]|\b(el|la|los|las|de|del|que|con|para|por|una|factura|tienda|pago|monto)\b/i;
    const keep = ["Distribuidora El Sol"]; // a name
    const wrong = Object.values(EN).filter((en) => spanish.test(keep.reduce((s, k) => s.replaceAll(k, ""), en)));
    expect(wrong).toEqual([]);
  });

  it("fills values in either language", () => {
    expect(translate("es", "Factura {id}", { id: 1001 })).toBe("Factura 1001");
    expect(translate("en", "Factura {id}", { id: 1001 })).toBe("Invoice 1001");
    expect(translate("en", "Ruta de {name}", { name: "Carlos" })).toBe("Carlos's route");
  });
});

describe("dates", () => {
  it("writes the day Spanish style or English style, in El Salvador time", () => {
    expect(formatDayIn("es", "2026-11-19T06:00:00Z")).toBe("19 nov");
    expect(formatDayIn("en", "2026-11-19T06:00:00Z")).toBe("Nov 19");
    expect(formatDayIn("en", "2026-11-19T05:00:00Z")).toBe("Nov 18"); // still the 18th in San Salvador
    expect(formatDayIn("en", "not a date")).toBe("");
  });
});

// ---------- every message the app can show has English ----------

/** The live server's messages (app/actions.ts), with sample values. */
const LIVE = [
  "No encontramos esa factura.",
  "Esta factura ya está pagada.",
  "Monto inválido.",
  "El monto es mayor que lo que falta pagar ($50.00).",
  "Hay $20.00 en efectivo por confirmar. Puede pagar hasta $30.00.",
  "Esta factura no es de su tienda.",
  "Pago recibido: $45.00 en dólares digitales.",
  "Pago recibido: $10.00. Falta $50.00.",
  "Pago recibido: $1,234.50. Falta $0.50.",
  "Listo. Tiene hasta el 19 nov para pagar $85.50, sin intereses.",
  "Este motorista no está en la ruta.",
  "Listo. Ahora la tienda debe tocar «Confirmo».",
  "Listo. Confirmó $60.00 en efectivo.",
  "No encontramos esa tienda.",
  "No tiene deudas pendientes.",
  "Deuda pagada con atraso. Su límite bajó a $175.00.",
  "Deuda pagada con atraso.",
  "Deuda pagada a tiempo. Su límite subió a $225.00.",
  "Deuda pagada a tiempo. Gracias.",
  "No encontramos a ese motorista.",
  "Listo. Carlos entregó $80.00 en efectivo.",
  "No hay facturas para crear.",
  "Máximo 10 facturas por archivo.",
  "Fila 1: tienda desconocida.",
  "Fila 2: motorista desconocido.",
  "Fila 3: número de factura inválido.",
  "Fila 2: la factura 3101 está repetida.",
  "Fila 1: monto inválido.",
  "Fila 1: fecha inválida.",
  "Fila 1: la factura 3001 ya existe.",
  "Listo. Se creó 1 factura.",
  "Listo. Se crearon 8 facturas.",
  "Se crearon 3 de 8 facturas. No se pudo completar. Intente de nuevo.",
  "Tienda desconocida.",
  "Todavía no está conectado al contrato.",
  "Algo salió mal. Intente de nuevo.",
  // Accounts and distributors (#129, #130)
  "Las cuentas todavía no están activas en este servidor.",
  "No pudimos crear su cuenta en este momento. Intente de nuevo en un minuto.",
  "Los motoristas se registran con la invitación de su distribuidora.",
  "Escriba su nombre.",
  "Escriba un teléfono de El Salvador (8 dígitos) o un correo válido.",
  "La contraseña debe tener al menos 8 caracteres.",
  "Ya hay una cuenta con ese teléfono o correo. Entre con su contraseña.",
  "Teléfono, correo o contraseña incorrectos.",
  "Escriba el nombre de la empresa.",
  "El NIT debe tener 14 dígitos.",
  "Escriba la dirección de la empresa.",
  "Elija qué vende.",
  "Escriba un número aproximado.",
  "Solo para administradores de Relay.",
  // Drivers (#131)
  "Escriba el nombre del motorista.",
  "Escriba un teléfono de El Salvador (8 dígitos).",
  "Ya invitó a ese teléfono. Comparta el mismo enlace.",
  "Esta invitación ya no es válida. Pida otra a su distribuidora.",
  "Esta invitación ya se usó. Entre con su contraseña.",
  "Solo la distribuidora aprobada puede hacer esto.",
  "No encontramos a ese motorista.",
  FALLBACK_MESSAGE,
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15].map((code) => errorMessage(code)),
];

describe("messages", () => {
  it("translates every live server message", () => {
    const missing = LIVE.filter((text) => message(text, "en") === text);
    expect(missing).toEqual([]);
  });

  it("puts values in the right places", () => {
    expect(message("Pago recibido: $10.00. Falta $50.00.", "en")).toBe("Payment received: $10.00. $50.00 left to pay.");
    expect(message("Listo. Tiene hasta el 19 nov para pagar $85.50, sin intereses.", "en")).toBe(
      "Done. You have until Nov 19 to pay $85.50, with no interest.",
    );
    expect(message("Se crearon 3 de 8 facturas. Esa factura ya existe.", "en")).toBe(
      "3 of 8 invoices created. That invoice already exists.",
    );
    expect(message("Pago recibido: $45.00 en dólares digitales.", "es")).toBe("Pago recibido: $45.00 en dólares digitales.");
  });

  it("translates the part-payment checks", () => {
    for (const text of [partPayError("abc", 50), partPayError("60", 50), partPayError("40", 50, 20)]) {
      expect(text).not.toBeNull();
      expect(message(text as string, "en")).not.toBe(text);
    }
  });

  it("translates every CSV check", () => {
    const csv = [
      "invoice_id,shop_id,driver_id,amount,due_date",
      "2001,tienda-1,motorista-1,150.00,2026-11-20",
      "2001,tienda-9,motorista-9,-5,2026-02-30",
      ",,,,",
      "abc,tienda-1,motorista-1,1.234,20/11/2026",
      "2003,tienda-1,motorista-1,0",
      "2004,tienda-1,motorista-1,0.00,2026-11-20",
    ].join("\n");
    const known = { shops: ["tienda-1"], drivers: ["motorista-1"] };
    const messages = [
      ...parseInvoiceCsv(csv, known).errors,
      ...parseInvoiceCsv("invoice_id,shop_id,driver_id,amount,due_date\n", known).errors,
      ...parseInvoiceCsv("wrong header", known).errors,
    ].map((e) => e.message);
    expect(messages.length).toBeGreaterThan(10);
    const missing = messages.filter((text) => message(text, "en") === text);
    expect(missing).toEqual([]);
  });
});

describe("demo data messages", () => {
  beforeEach(() => mock.resetMock());

  it("translates what the demo data says while you use it", () => {
    const said = [
      mock.payNow(1001, 10).message,
      mock.payNow(1001).message,
      mock.payNow(1001).message,
      mock.payNow(9999).message,
      mock.payNow(1002, 9999).message,
      mock.payLater(1002).message,
      mock.payLater(1003).message,
      mock.claimCash(1004, 60).message,
      mock.confirmCash(1004, 10).message,
      mock.confirmCash(1004, 60).message,
      mock.handInCash("motorista-1", 60).message,
      mock.repay("tienda-2", 85.5).message,
      mock.repay("tienda-2", 1).message,
      mock.createInvoices([]).message,
      mock.createInvoices([{ invoiceId: 1001, shopId: "tienda-1", driverId: "motorista-1", amount: "1.00", dueDate: "2026-11-20" }]).message,
      mock.createInvoices([{ invoiceId: 4001, shopId: "tienda-1", driverId: "motorista-1", amount: "1.00", dueDate: "2026-11-20" }]).message,
    ];
    const missing = said.filter((text) => message(text, "en") === text);
    expect(missing).toEqual([]);
  });
});
