export type InvoiceStatus = "due" | "part_paid" | "paid";
export type PayMethod = "digital" | "cash" | "credit" | "mixed";
export type Invoice = { id: number; shopId: string; driverId: string; amount: number; paid: number; dueDate: string; status: InvoiceStatus; method?: PayMethod; cashClaim?: number; creditFee?: number };
export type Shop = {
  id: string; name: string; owner: string; creditLimit: number; creditOwed: number; creditDue?: string; overdue: boolean;
  onTime: number;
  /** All late repayments (and defaults). `lateMinor` = 2-7 days late, `lateMajor` = 8+ days. */
  late: number; lateMinor: number; lateMajor: number;
  /** The most days late it ever repaid; 0 if never late. */
  maxDaysLate: number;
  /** When it first used credit; absent if never. */
  firstCredit?: string;
};
export type Driver = { id: string; name: string; cashHeld: number };
export type Pool = { available: number; buffer: number };
/** Everything ever paid, by method (dollars), and how many invoices exist. */
export type Totals = { invoices: number; digital: number; cash: number; credit: number };
/** Newest first, `pages` pages of `HISTORY_PAGE`; `total` is how many exist. */
export type InvoiceHistory = { invoices: Invoice[]; total: number };
export const HISTORY_PAGE = 30; // the contract's MAX_PAGE
export type Receipt = { ok: boolean; message: string; txHash?: string; explorerUrl?: string };
export type InvoiceRow = { invoiceId: number; shopId: string; driverId: string; amount: string; dueDate: string };
