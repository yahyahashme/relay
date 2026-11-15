import "server-only";

/**
 * Not one of ours: the token refused because the payer's balance is too low (#205). The token's
 * BalanceError is also #10, our NothingOwed, and testnet RPC returns only "Error(Contract, #10)",
 * so it is told apart by the call: only these contract functions ever return NothingOwed.
 */
export const LOW_BALANCE = 1010;
const NOTHING_OWED = 10;
const CAN_RETURN_NOTHING_OWED = new Set(["repay", "cover_default", "call_recourse"]);

/** The error number for a refusal of `method`: a #10 from any other function is the token's low balance. */
export function codeFor(method: string | undefined, code: number | null): number | null {
  return code === NOTHING_OWED && method !== undefined && !CAN_RETURN_NOTHING_OWED.has(method) ? LOW_BALANCE : code;
}

// Contract error code -> what the screens say (same numbers as
// contracts/route_ledger/src/lib.rs `enum Error`).
const MESSAGES: Record<number, string> = {
  1: "Esa factura ya existe.",
  2: "No encontramos esa factura.",
  3: "Monto inválido.",
  4: "El monto es mayor que lo pendiente.",
  5: "Esta factura ya está pagada.",
  6: "Esta factura no es de su tienda.",
  7: "Tiene un pago vencido. Pague su deuda para volver a usar crédito.",
  8: "Esta compra supera su límite de crédito.",
  9: "El crédito no está disponible en este momento.",
  10: "No tiene deuda pendiente.",
  11: "El motorista aún no registró el efectivo.",
  12: "Su tienda aún no tiene crédito.",
  13: "Esta distribuidora no está aprobada en Relay.",
  15: "El motorista cambió el monto. Revise el nuevo monto y confirme de nuevo.",
  16: "Solo los prestamistas aprobados pueden poner dinero en el fondo.",
  17: "No tiene tantas participaciones en el fondo.",
  18: "Su depósito de respaldo debe cubrir al menos el 20% del crédito que respalda.",
  19: "Solo puede cambiar el respaldo cuando la tienda no debe nada.",
  20: "Su distribuidora no le da los 7 días en esta factura.",
  21: "Esta factura ya está en 7 días con su distribuidora.",
  [LOW_BALANCE]: "No tiene suficientes dólares digitales para este pago.",
};

export const FALLBACK_MESSAGE = "No se pudo completar. Intente de nuevo.";

/** The contract's error number inside an SDK error text, e.g. "Error(Contract, #4)". */
export function contractErrorCode(text: string): number | null {
  const match = /Error\(Contract, #(\d+)\)/.exec(text);
  return match ? Number(match[1]) : null;
}

export function errorMessage(code: number | null): string {
  return (code !== null && MESSAGES[code]) || FALLBACK_MESSAGE;
}

/** A contract said no: carries the Spanish message for the receipt. */
export class ContractError extends Error {
  constructor(public readonly code: number | null) {
    super(errorMessage(code));
  }
}
