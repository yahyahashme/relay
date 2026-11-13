// Display helpers for the screens (dollars as plain numbers).
// Exact money math on contract amounts (bigint units) lives in lib/money.ts (#53).

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** 1234.5 -> "$1,234.50" */
export function formatMoney(dollars: number): string {
  return usd.format(dollars);
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const EL_SALVADOR_OFFSET_MS = 6 * 60 * 60 * 1000; // UTC-6 all year, no daylight saving

/** An ISO timestamp -> "17 nov", in El Salvador time. */
export function formatDay(iso: string): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return "";
  const local = new Date(time - EL_SALVADOR_OFFSET_MS);
  return `${local.getUTCDate()} ${MONTHS[local.getUTCMonth()]}`;
}

/** "1 pago" / "2 pagos" */
export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** "+50370000132" -> "7000-0132" (how numbers are written in El Salvador); anything else as it is. */
export function formatPhone(phone: string): string {
  const match = /^\+503(\d{4})(\d{4})$/.exec(phone);
  return match ? `${match[1]}-${match[2]}` : phone;
}
