// The Relay rating (#220, replaces the 0-100 score of #137): 1 to 10, the answer to "how likely is
// this shop to repay pool credit within 7 days?". Worked out off-chain from the contract's counters.
//
// - A Beta prior worth 10 cycles at 60%, so a new shop starts at 6 and a few on-time weeks don't
//   make it a 10. Each on-time credit or pay-later cycle is a success; 2-7 days late is half a miss,
//   8+ days late a whole miss, a written-off debt 3 misses.
// - p = (6 + successes) / (10 + successes + misses); rating = round(10 p), kept to 1..10.
// - Caps, whatever the record: 3 while anything is overdue, 2 while a written-off debt (4+ weeks
//   unpaid) is unpaid, so the ceiling only drops the longer a debt stays unpaid,
//   7 with under 4 weeks of history.
// - Recency (8-week half-life) needs a date per cycle; the contract keeps counts, not dates, so for
//   now every cycle weighs the same. Pay-at-delivery doesn't count: it says nothing about credit.

import type { HistoryRow, Shop } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
const PRIOR_CYCLES = 10;
const PRIOR_RATE = 0.6;

export type ScoreLabel = "excelente" | "bueno" | "regular" | "riesgo";
/** A reason in both languages, and whether it helps (+) or hurts (-). */
export type Reason = { es: string; en: string; good: boolean; weight: number };
/** `score` is the 1-10 rating. `later`: the shop's record on a distributor's own 7 days (#194, #203). */
export type CreditScore = {
  score: number;
  label: ScoreLabel;
  reasons: Reason[];
  tips: { es: string; en: string }[];
  isNew: boolean;
  later?: { onTime: number; paid: number };
};

/** The 1-10 rating from the counters alone, so a distributor's list can show it without the history. */
export function shopRating(shop: Shop, now: number, firstSeen?: number): { rating: number; p: number; onTime: number; cycles: number; cap: number } {
  const onTime = shop.onTime + (shop.laterOnTime ?? 0);
  const minor = shop.lateMinor;
  const major = shop.lateMajor + (shop.laterLate ?? 0);
  const defaulted = (shop.writtenOff ?? 0) > 0;
  const successes = onTime + 0.5 * minor;
  const misses = 0.5 * minor + major + (defaulted ? 3 : 0);
  const p = (PRIOR_CYCLES * PRIOR_RATE + successes) / (PRIOR_CYCLES + successes + misses);
  const start = Math.min(shop.firstCredit ? Date.parse(shop.firstCredit) : Infinity, firstSeen ?? Infinity);
  const shortHistory = !Number.isFinite(start) || now - start < 28 * DAY_MS;
  const cap = defaulted ? 2 : shop.overdue || shop.laterOverdue ? 3 : shortHistory ? 7 : 10;
  const rating = Math.max(1, Math.min(cap, Math.round(10 * p)));
  return { rating, p, onTime, cycles: onTime + minor + major, cap };
}

export const labelOf = (rating: number): ScoreLabel => (rating >= 8 ? "excelente" : rating >= 6 ? "bueno" : rating >= 4 ? "regular" : "riesgo");

export function creditScore(shop: Shop, rows: HistoryRow[], _suppliers: number, now: number): CreditScore {
  const dates = rows.filter((r) => r.at).map((r) => Date.parse(r.at as string));
  const firstSeen = Math.min(...dates, Infinity);
  const { rating, onTime, cycles, cap } = shopRating(shop, now, Number.isFinite(firstSeen) ? firstSeen : undefined);
  const isNew = cycles === 0;
  const reasons: Reason[] = [];
  if (cap === 2) reasons.push({ es: "Tiene una deuda de crédito que no pagó", en: "Has credit debt it did not repay", good: false, weight: 2 });
  else if (cap === 3) reasons.push({ es: "Tiene un pago vencido", en: "Has a payment past due", good: false, weight: 1.5 });
  if (cycles > 0) {
    reasons.push({ es: `Pagó a tiempo ${onTime} de ${cycles} créditos`, en: `Repaid ${onTime} of ${cycles} credits on time`, good: onTime / cycles >= 0.8, weight: 1 });
  } else {
    reasons.push({ es: "Todavía no ha usado crédito", en: "Has not used credit yet", good: false, weight: 0.6 });
  }
  if (cap === 7) reasons.push({ es: "Menos de 4 semanas en Relay", en: "Under 4 weeks on Relay", good: false, weight: 0.5 });
  else if (cycles >= 8) reasons.push({ es: `${cycles} créditos pagados`, en: `${cycles} credits repaid`, good: true, weight: 0.4 });

  const tips: { es: string; en: string }[] = [];
  if (cap <= 3) tips.push({ es: "Pague lo vencido: es lo primero que se mira.", en: "Pay what is past due: it is the first thing anyone checks." });
  tips.push({ es: "Pague cada crédito a tiempo: es lo que más cuenta.", en: "Repay every credit on time: it counts the most." });
  if (cycles < 8) tips.push({ es: "Cada semana que paga a tiempo alarga su historial.", en: "Every week you pay on time makes your history longer." });

  const laterPaid = (shop.laterOnTime ?? 0) + (shop.laterLate ?? 0);
  const later = laterPaid > 0 ? { onTime: shop.laterOnTime ?? 0, paid: laterPaid } : undefined;
  return { score: rating, label: labelOf(rating), reasons: reasons.slice(0, 3), tips: tips.slice(0, 2), isNew, later };
}

export const SCORE_LABEL: Record<ScoreLabel, { es: string; en: string; tone: "paid" | "credit" | "due" | "overdue" }> = {
  excelente: { es: "Excelente", en: "Excellent", tone: "paid" },
  bueno: { es: "Bueno", en: "Good", tone: "credit" },
  regular: { es: "Regular", en: "Fair", tone: "due" },
  riesgo: { es: "En riesgo", en: "At risk", tone: "overdue" },
};
