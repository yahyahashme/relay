// Fraud flags (#231). The main fraud a pool lender fears: a distributor invents shops (or uses
// friends') and sells them goods on credit that never existed, so the pool pays the distributor
// and the "shops" never repay. These rules look over each distributor's invoices for the signs
// and say why, in plain words. A flag is not a verdict: Relay asks for proof first (the Hacienda
// electronic invoice code, a delivery photo) and a person decides. Rules run on numbers only and
// return structured flags; the screens write the words in Spanish and English.

export type FraudInvoice = {
  id: number;
  shopId: string;
  amount: number;
  /** Some of it went on the lender pool. */
  credit: boolean;
  /** The shop took 7 days on the distributor's own money. */
  later: boolean;
  paid: number;
  /** Unix ms. */
  due: number;
};

export type FraudShop = {
  id: string;
  name: string;
  /** Unix ms; absent for shops without a database row (the demo's). */
  createdAt?: number;
  phones: string[];
  passkeys: string[];
  limit: number;
  /** Written off, or paid 8+ days late. */
  defaulted: boolean;
  /** Unix ms of its first pool credit, if any (#221). */
  firstCreditAt?: number;
  /** Unix ms its credit is (or was) due, if any (#221). */
  dueAt?: number;
};

export type FraudDistributor = {
  id: string;
  name: string;
  phones: string[];
  passkeys: string[];
  /** Shops whose unlock payments looped back to this distributor (#221 circle check). */
  circleShops?: string[];
};

export type FlagRule =
  | "same_contact"
  | "big_invoice"
  | "new_shops_credit"
  | "defaults"
  | "near_limit"
  | "later_unpaid"
  | "circle_unlock"
  | "new_shops_together"
  | "defaults_together";

export type Flag = {
  rule: FlagRule;
  shopId?: string;
  shopName?: string;
  invoiceId?: number;
  /** How many invoices or shops the rule counted. */
  count?: number;
  /** For big_invoice: the invoice and the usual size, in dollars. For defaults: the distributor's and the average rate, 0-1. */
  value?: number;
  usual?: number;
};

export const BIG_TIMES = 3;
export const NEW_SHOP_DAYS = 7;
export const NEW_SHOP_CREDIT_MAX = 3; // this many credit sales to brand-new shops is a flag
export const NEAR_LIMIT = 0.9;
export const NEAR_LIMIT_MAX = 3;
export const LATER_UNPAID_MAX = 2;
/** #221: this many of one distributor's shops first borrowing inside one week, in the last 4 weeks. */
export const TOGETHER_SHOPS = 3;
export const TOGETHER_WINDOW_DAYS = 7;
export const TOGETHER_LOOKBACK_DAYS = 28;
/** #221: this many of its shops defaulting with due dates this close together. */
export const DEFAULTS_TOGETHER = 2;
export const DEFAULTS_WINDOW_DAYS = 14;
const DAY = 86_400_000;

/** The biggest group of times that fit inside one window, earliest first. */
function tightestGroup<T>(items: T[], time: (t: T) => number, windowMs: number): T[] {
  const sorted = [...items].sort((a, b) => time(a) - time(b));
  let best: T[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const group = sorted.filter((t, j) => j >= i && time(t) - time(sorted[i]) <= windowMs);
    if (group.length > best.length) best = group;
  }
  return best;
}

/** A stable key for a flag: an admin who clears it isn't asked about the same thing again. */
export const flagKey = (f: Flag) => [f.rule, f.shopId ?? "", f.invoiceId ?? ""].join(":");

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Everything that looks off about one distributor. `invoices` are its own; `shops` every shop
 * they name; `averageDefaultRate` the share of all shops on Relay that defaulted.
 */
export function checkDistributor(
  d: FraudDistributor,
  invoices: FraudInvoice[],
  shops: Map<string, FraudShop>,
  averageDefaultRate: number,
  now: number,
): Flag[] {
  const flags: Flag[] = [];
  const mine = [...new Set(invoices.map((i) => i.shopId))].map((id) => shops.get(id)).filter((s): s is FraudShop => s !== undefined);

  // 1. The shop and the distributor are the same people: same phone or the same passkey.
  for (const s of mine) {
    if (s.phones.some((p) => d.phones.includes(p)) || s.passkeys.some((k) => d.passkeys.includes(k))) {
      flags.push({ rule: "same_contact", shopId: s.id, shopName: s.name });
    }
  }

  // 2. An invoice far bigger than what this distributor, or this shop, usually sells.
  for (const inv of invoices) {
    const others = invoices.filter((i) => i.id !== inv.id);
    const forShop = others.filter((i) => i.shopId === inv.shopId);
    const usual = forShop.length >= 3 ? median(forShop.map((i) => i.amount)) : others.length >= 5 ? median(others.map((i) => i.amount)) : null;
    if (usual !== null && usual > 0 && inv.amount > BIG_TIMES * usual) {
      flags.push({ rule: "big_invoice", invoiceId: inv.id, shopId: inv.shopId, shopName: shops.get(inv.shopId)?.name, value: inv.amount, usual });
    }
  }

  // 3. Many credit sales to shops that were created days ago.
  const fresh = invoices.filter((i) => {
    const created = shops.get(i.shopId)?.createdAt;
    return i.credit && created !== undefined && now - created < NEW_SHOP_DAYS * DAY;
  });
  if (fresh.length >= NEW_SHOP_CREDIT_MAX) flags.push({ rule: "new_shops_credit", count: fresh.length });

  // 4. Its shops default far more than the shops on Relay as a whole.
  const defaulted = mine.filter((s) => s.defaulted).length;
  if (mine.length > 0 && defaulted >= 2) {
    const rate = defaulted / mine.length;
    if (rate > 2 * averageDefaultRate) flags.push({ rule: "defaults", count: defaulted, value: rate, usual: averageDefaultRate });
  }

  // 5. Credit sales just under the shop's limit, again and again: taking all the pool allows.
  const nearLimit = invoices.filter((i) => {
    const limit = shops.get(i.shopId)?.limit ?? 0;
    return i.credit && limit > 0 && i.amount >= NEAR_LIMIT * limit && i.amount <= limit;
  });
  if (nearLimit.length >= NEAR_LIMIT_MAX) flags.push({ rule: "near_limit", count: nearLimit.length });

  // 6. Pay-later invoices (its own money, so a cover for fake sales) that never get paid.
  const unpaid = invoices.filter((i) => i.later && i.paid < i.amount && now > i.due + DAY);
  if (unpaid.length >= LATER_UNPAID_MAX) flags.push({ rule: "later_unpaid", count: unpaid.length });

  // 7. #221 circle check: a shop's unlock payment was the distributor's own money coming back.
  const circles = [...new Set(d.circleShops ?? [])];
  if (circles.length > 0) {
    flags.push({ rule: "circle_unlock", count: circles.length, shopId: circles.length === 1 ? circles[0] : undefined, shopName: circles.length === 1 ? shops.get(circles[0])?.name : undefined });
  }

  // 8. #221: several of its shops took their first credit in the same week (a batch of made-up shops).
  const recent = mine.filter((s) => s.firstCreditAt !== undefined && s.firstCreditAt > 0 && now - s.firstCreditAt < TOGETHER_LOOKBACK_DAYS * DAY);
  const together = tightestGroup(recent, (s) => s.firstCreditAt!, TOGETHER_WINDOW_DAYS * DAY);
  if (together.length >= TOGETHER_SHOPS) flags.push({ rule: "new_shops_together", count: together.length, shopId: together[0].id });

  // 9. #221: several of its shops defaulted on credit due about the same time (they ran together).
  const gone = mine.filter((s) => s.defaulted && s.dueAt !== undefined && s.dueAt > 0);
  const ranTogether = tightestGroup(gone, (s) => s.dueAt!, DEFAULTS_WINDOW_DAYS * DAY);
  if (ranTogether.length >= DEFAULTS_TOGETHER) flags.push({ rule: "defaults_together", count: ranTogether.length, shopId: ranTogether[0].id });

  return flags;
}

/** The share of shops that defaulted (0 if none on Relay yet). */
export function defaultRate(shops: FraudShop[]): number {
  return shops.length === 0 ? 0 : shops.filter((s) => s.defaulted).length / shops.length;
}
