import { dueLabel } from "./dates";
import { formatUSD } from "./money";

export function reminderLink({
  phone,
  shopName,
  amountUnits,
  dueAt,
  now,
}: {
  phone: string;
  shopName: string;
  amountUnits: bigint;
  dueAt: number;
  now: number;
}): string {
  const compact = phone.replace(/[ -]/g, "").replace(/^\+/, "");
  const digits = /^503\d{8}$/.test(compact) ? compact.slice(3) : compact;
  if (!/^[267]\d{7}$/.test(digits)) {
    throw new Error("Número de teléfono inválido: use 8 dígitos de El Salvador, por ejemplo 7123-4567");
  }
  if (amountUnits <= 0n) throw new Error("Monto inválido.");

  const amount = formatUSD(amountUnits);
  const reminder = dueAt > 0
    ? `le recordamos que su pago de ${amount} ${dueLabel(dueAt, now)}`
    : `le recordamos su pago pendiente de ${amount}`;
  const message = `Hola ${shopName}, ${reminder}. Puede pagar desde el enlace de su factura. ¡Gracias!`;

  return `https://wa.me/503${digits}?text=${encodeURIComponent(message)}`;
}
