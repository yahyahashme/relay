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

const DAY_MS = 24 * 60 * 60 * 1000;
const localDay = (time: number) => Math.floor((time - EL_SALVADOR_OFFSET_MS) / DAY_MS);

/** "Vence el 17 nov", or "Venció el 17 nov" once that day is over in El Salvador. `now` is in milliseconds. */
export function dueOn(iso: string, now: number): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return "";
  return `${localDay(time) < localDay(now) ? "Venció" : "Vence"} el ${formatDay(iso)}`;
}

/** "1 pago" / "2 pagos" */
export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}
