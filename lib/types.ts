export type InvoiceStatus = "due" | "part_paid" | "paid";
export type PayMethod = "digital" | "cash" | "credit" | "mixed";
export type Invoice = { id: number; shopId: string; driverId: string; amount: number; paid: number; dueDate: string; status: InvoiceStatus; method?: PayMethod; cashClaim?: number };
export type Shop = { id: string; name: string; owner: string; creditLimit: number; creditOwed: number; creditDue?: string; overdue: boolean; onTime: number; late: number };
export type Driver = { id: string; name: string; cashHeld: number };
export type Pool = { available: number; buffer: number };
/** Everything ever paid, by method (dollars), and how many invoices exist. */
export type Totals = { invoices: number; digital: number; cash: number; credit: number };
/** Newest first, `pages` pages of `HISTORY_PAGE`; `total` is how many exist. */
export type InvoiceHistory = { invoices: Invoice[]; total: number };
export const HISTORY_PAGE = 30; // the contract's MAX_PAGE
/** A shop's own details (Mi cuenta → Datos). Until accounts (#129) they live with the demo data. */
export type Profile = { owner: string; shopName: string; address: string; phone: string; dui: string };
/** A distributor the shop buys from, and how many of its invoices the shop has. */
export type Supplier = { id: string; name: string; invoices: number; unpaid: number };
export type Receipt = { ok: boolean; message: string; txHash?: string; explorerUrl?: string };
export type InvoiceRow = { invoiceId: number; shopId: string; driverId: string; amount: string; dueDate: string };
