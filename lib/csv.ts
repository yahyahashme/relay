import type { InvoiceRow } from "./types";

const HEADER = "invoice_id,shop_id,driver_id,amount,due_date";

export type CsvError = { line: number; field?: string; message: string };

export function parseInvoiceCsv(
  text: string,
  known: { shops: string[]; drivers: string[] },
): { rows: InvoiceRow[]; errors: CsvError[] } {
  const [header, ...dataLines] = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  const rows: InvoiceRow[] = [];
  const errors: CsvError[] = [];

  if (header.split(",").map((column) => column.trim()).join(",") !== HEADER) {
    return { rows, errors: [{ line: 1, message: `Encabezado inválido. Use: ${HEADER}` }] };
  }

  const shops = new Set(known.shops);
  const drivers = new Set(known.drivers);
  const seenIds = new Set<string>();

  for (const [index, rawLine] of dataLines.entries()) {
    if (!rawLine.trim()) continue;

    const line = index + 2;
    const values = rawLine.split(",").map((value) => value.trim());
    if (values.length !== 5) {
      errors.push({ line, message: "La fila debe tener 5 columnas" });
      continue;
    }

    const [id, shopId, driverId, amount, dueDate] = values;
    const previousErrorCount = errors.length;

    if (!id) {
      errors.push({ line, field: "invoice_id", message: "Falta el número de factura" });
    } else if (!/^[1-9]\d{0,14}$/.test(id)) {
      errors.push({ line, field: "invoice_id", message: `Número de factura inválido: ${id}` });
    } else if (seenIds.has(id)) {
      errors.push({ line, field: "invoice_id", message: `Factura repetida: ${id}` });
    } else {
      seenIds.add(id);
    }

    if (!shopId) {
      errors.push({ line, field: "shop_id", message: "Falta la tienda" });
    } else if (!shops.has(shopId)) {
      errors.push({ line, field: "shop_id", message: `Tienda desconocida: ${shopId}` });
    }

    if (!driverId) {
      errors.push({ line, field: "driver_id", message: "Falta el motorista" });
    } else if (!drivers.has(driverId)) {
      errors.push({ line, field: "driver_id", message: `Motorista desconocido: ${driverId}` });
    }

    if (!amount) {
      errors.push({ line, field: "amount", message: "Falta el monto" });
    } else if (!/^-?\d+(\.\d{1,2})?$/.test(amount)) {
      errors.push({ line, field: "amount", message: `Monto inválido: ${amount}` });
    } else if (amount.startsWith("-") || !/[1-9]/.test(amount)) {
      errors.push({ line, field: "amount", message: "El monto debe ser mayor que 0" });
    }

    if (!dueDate) {
      errors.push({ line, field: "due_date", message: "Falta la fecha" });
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || new Date(dueDate).toJSON()?.slice(0, 10) !== dueDate) {
      errors.push({ line, field: "due_date", message: "Fecha inválida (use AAAA-MM-DD)" });
    }

    if (errors.length === previousErrorCount) {
      const [dollars, cents = ""] = amount.split(".");
      rows.push({
        invoiceId: Number(id),
        shopId,
        driverId,
        amount: `${dollars.replace(/^0+(?=\d)/, "")}.${cents.padEnd(2, "0")}`,
        dueDate,
      });
    }
  }

  if (rows.length === 0 && errors.length === 0) {
    errors.push({ line: 1, message: "El archivo no tiene facturas" });
  }

  return { rows, errors };
}
