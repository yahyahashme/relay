import { formatMoney } from "@/lib/format";

/**
 * An amount, always in IBM Plex Mono: "$ 48.50", a thin gap after the sign, two decimals, tabular.
 * Size, weight and colour come from `className`. For plain text (hints, aria labels) use formatAmount().
 */
export function Money({ value, className = "" }: { value: number; className?: string }) {
  const digits = formatMoney(Math.abs(value)).slice(1);
  return (
    <span className={`money ${className}`}>
      {value < 0 && "−"}
      <span className="money-sign">$</span>
      {digits}
    </span>
  );
}

/** How many characters wide an amount is ("$ 1,234.50" = 10), for figures that shrink to fit. */
export function moneyWidth(value: number): number {
  return formatMoney(value).length + 1;
}
