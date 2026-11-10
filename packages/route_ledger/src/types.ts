import {Address} from '@stellar/stellar-sdk';

    /**
 * The contract's token balance is always `available + buffer`.
 * Money lent to shops is counted again when they repay.
 */
export interface Pool {
  available: bigint;
  buffer: bigint;
}

/**
 * Error Enum: Error
 */
export const Error = {
  1 : { message: "AlreadyExists" },
  2 : { message: "NotFound" },
  3 : { message: "InvalidAmount" },
  4 : { message: "Overpay" },
  5 : { message: "AlreadyPaid" },
  6 : { message: "NotYourInvoice" },
  7 : { message: "Overdue" },
  8 : { message: "OverLimit" },
  9 : { message: "PoolTooLow" },
  10 : { message: "NothingOwed" },
  11 : { message: "NoCashClaim" },
  12 : { message: "NoCreditTerms" },
  13 : { message: "NotApproved" },
  14 : { message: "NotInDefault" }
}

/**
 * Struct: Config
 */
export interface Config {
  admin: string;
  credit_period_secs: bigint;
  token: string;
  treasury: string;
}

/**
 * Event: Repaid
 */
export interface RepaidEvent {
  name: "Repaid";
  data: {
    shop: string;
    amount?: bigint;
    owed?: bigint;
  };
}

/**
 * Struct: Invoice
 */
export interface Invoice {
  amount: bigint;
  distributor: string;
  driver: string;
  /**
   * Unix seconds.
   */
  due: bigint;
  id: bigint;
  method: PayMethod;
  paid: bigint;
  shop: string;
  status: InvoiceStatus;
}

/**
 * What the app shows. A shop with no credit terms gets all zeros.
 */
export interface ShopView {
  due_at: bigint;
  late: number;
  limit: bigint;
  on_time: number;
  overdue: boolean;
  owed: bigint;
  total_repaid: bigint;
  written_off: bigint;
}

/**
 * Event: TermsSet
 */
export interface TermsSetEvent {
  name: "TermsSet";
  data: {
    shop: string;
    limit?: bigint;
  };
}

/**
 * Union: PayMethod
 */
 export type PayMethod =
  { tag: "None"; values: void } |
  { tag: "Digital"; values: void } |
  { tag: "Cash"; values: void } |
  { tag: "Credit"; values: void } |
  { tag: "Mixed"; values: void };

/**
 * Event: Deposited
 */
export interface DepositedEvent {
  name: "Deposited";
  data: {
    lender: string;
    amount?: bigint;
  };
}

/**
 * Event: CashClaimed
 */
export interface CashClaimedEvent {
  name: "CashClaimed";
  data: {
    id: bigint;
    driver?: string;
    amount?: bigint;
  };
}

/**
 * Event: InvoicePaid
 */
export interface InvoicePaidEvent {
  name: "InvoicePaid";
  data: {
    id: bigint;
    shop?: string;
    amount?: bigint;
    usage_fee?: bigint;
  };
}

/**
 * Event: BufferFunded
 */
export interface BufferFundedEvent {
  name: "BufferFunded";
  data: {
    from: string;
    amount?: bigint;
  };
}

/**
 * Event: CashHandedIn
 */
export interface CashHandedInEvent {
  name: "CashHandedIn";
  data: {
    driver: string;
    distributor?: string;
    amount?: bigint;
  };
}

/**
 * Union: InvoiceStatus
 */
 export type InvoiceStatus =
  { tag: "Due"; values: void } |
  { tag: "PartPaid"; values: void } |
  { tag: "Paid"; values: void };

/**
 * Event: CashConfirmed
 */
export interface CashConfirmedEvent {
  name: "CashConfirmed";
  data: {
    id: bigint;
    shop?: string;
    driver?: string;
    amount?: bigint;
  };
}

/**
 * Event: DefaultCovered
 */
export interface DefaultCoveredEvent {
  name: "DefaultCovered";
  data: {
    shop: string;
    owed?: bigint;
    /**
     * How much the buffer could pay back to the lenders (at most `owed`).
     */
    covered?: bigint;
  };
}

/**
 * Event: InvoiceCreated
 */
export interface InvoiceCreatedEvent {
  name: "InvoiceCreated";
  data: {
    id: bigint;
    distributor?: string;
    shop?: string;
    amount?: bigint;
    due?: bigint;
  };
}

/**
 * Event: PaidWithCredit
 */
export interface PaidWithCreditEvent {
  name: "PaidWithCredit";
  data: {
    id: bigint;
    shop?: string;
    amount?: bigint;
    payout?: bigint;
    due_at?: bigint;
  };
}

/**
 * Event: DistributorApproved
 */
export interface DistributorApprovedEvent {
  name: "DistributorApproved";
  data: {
    distributor: string;
  };
}
    export type ContractEvent = RepaidEvent | TermsSetEvent | DepositedEvent | CashClaimedEvent | InvoicePaidEvent | BufferFundedEvent | CashHandedInEvent | CashConfirmedEvent | DefaultCoveredEvent | InvoiceCreatedEvent | PaidWithCreditEvent | DistributorApprovedEvent;
    