export type InvoiceStatus = "due" | "part_paid" | "paid";
export type PayMethod = "digital" | "cash" | "credit" | "mixed";
export type Invoice = { id: number; shopId: string; driverId: string; amount: number; paid: number; dueDate: string; status: InvoiceStatus; method?: PayMethod; cashClaim?: number };
export type Shop = { id: string; name: string; owner: string; creditLimit: number; creditOwed: number; creditDue?: string; overdue: boolean; onTime: number; late: number };
export type Driver = { id: string; name: string; cashHeld: number };
export type Pool = { available: number; buffer: number };
export type Receipt = { ok: boolean; message: string; txHash?: string; explorerUrl?: string };
export type InvoiceRow = { invoiceId: number; shopId: string; driverId: string; amount: string; dueDate: string };
