const EL_SALVADOR_OFFSET_SECONDS = 6 * 60 * 60; // UTC-6 year-round
const SECONDS_PER_DAY = 24 * 60 * 60;
const SECONDS_PER_HOUR = 60 * 60;
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const ISO_DATE_OR_TIMESTAMP = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)(Z|[+-]\d{2}:?\d{2})?)?$/i;
const EXPLICIT_ZONE = /(?:\b(?:GMT|UTC)(?:[+-]\d{4})?|\b\d{2}:\d{2}(?::\d{2})?\s*(?:Z|[+-]\d{2}:?\d{2}))$/i;

function parseDateString(input: string): number {
  const text = input.trim();
  const iso = ISO_DATE_OR_TIMESTAMP.exec(text);

  if (iso) {
    const [, year, month, day, time = "00:00:00", zone = "-06:00"] = iso;
    const date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    // Date parsing can carry an out-of-range day into the next month.
    if (new Date(`${date}T00:00:00Z`).toJSON()?.slice(0, 10) !== date) return NaN;
    return Date.parse(`${date}T${time}${zone}`);
  }

  // Legacy date strings need an explicit zone to avoid machine-local parsing.
  return EXPLICIT_ZONE.test(text) ? Date.parse(text) : NaN;
}

export function toUnixSeconds(date: Date | string): number {
  const milliseconds = typeof date === "string" ? parseDateString(date) : date.getTime();
  if (Number.isNaN(milliseconds)) throw new Error("Fecha inválida");
  return Math.floor(milliseconds / 1000);
}

export function fromUnixSeconds(seconds: number): Date {
  return new Date(seconds * 1000);
}

export function isOverdue(dueAt: number, now: number): boolean {
  return dueAt > 0 && now > dueAt;
}

export function formatDateEs(date: Date): string {
  const milliseconds = date.getTime();
  if (Number.isNaN(milliseconds)) return "";

  const local = new Date(milliseconds - EL_SALVADOR_OFFSET_SECONDS * 1000);
  return `${local.getUTCDate()} ${MONTHS[local.getUTCMonth()]}`;
}

function localDay(seconds: number): number {
  return Math.floor((seconds - EL_SALVADOR_OFFSET_SECONDS) / SECONDS_PER_DAY);
}

export function dueLabel(dueAt: number, now: number): string {
  if (!Number.isFinite(dueAt) || !Number.isFinite(now) || dueAt <= 0) return "";

  const difference = dueAt - now;
  if (difference >= 0 && difference < SECONDS_PER_HOUR) {
    const minutes = Math.max(1, Math.ceil(difference / 60));
    return `vence en ${minutes} min`;
  }
  if (difference < 0 && difference > -SECONDS_PER_HOUR) {
    const minutes = Math.max(1, Math.floor(-difference / 60));
    return `venció hace ${minutes} min`;
  }

  const days = localDay(dueAt) - localDay(now);
  if (difference > 0) {
    if (days === 0) return "vence hoy";
    if (days === 1) return "vence mañana";
    return `vence en ${days} días`;
  }

  if (days === 0) return "venció hoy";
  if (days === -1) return "venció hace 1 día";
  return `venció hace ${-days} días`;
}
