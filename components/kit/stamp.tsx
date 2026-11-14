"use client";

import { type ReactNode, useEffect } from "react";

export type StampTone = "ok" | "warn" | "bad" | "credit" | "confirm" | "ink";

const TONE: Record<StampTone, string> = {
  ok: "stamp-ok",
  warn: "stamp-warn",
  bad: "stamp-bad",
  credit: "stamp-credit",
  confirm: "stamp-confirm",
  ink: "",
};

/**
 * Status is a rubber stamp, never a pill: PAGADA, CONFIRMADO, EN CRÉDITO, VENCE PRONTO, VENCIDA.
 * Always words plus colour. The large form is tilted and worn; `small` is the upright mark for dense tables.
 *
 * `fresh` plays the landing once (and a short buzz where the phone allows it): the product's one moment
 * of delight, for a payment that just completed. `onLanded` lets the screen make sure it never replays.
 */
export function Stamp({
  children,
  tone = "ink",
  small = false,
  fresh = false,
  onLanded,
  tilt,
  className = "",
}: {
  children: ReactNode;
  tone?: StampTone;
  small?: boolean;
  fresh?: boolean;
  onLanded?: () => void;
  /** Degrees, between -6 and -4. */
  tilt?: number;
  className?: string;
}) {
  useEffect(() => {
    if (!fresh || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    try {
      navigator.vibrate?.(30);
    } catch {
      // no vibration on this phone
    }
  }, [fresh]);
  return (
    <span
      onAnimationEnd={onLanded}
      style={tilt === undefined ? undefined : ({ "--stamp-tilt": `${tilt}deg` } as React.CSSProperties)}
      className={`stamp ${TONE[tone]} ${small ? "stamp-small text-label" : "text-[1.375rem]"} ${fresh ? "stamp-land" : ""} ${className}`}
    >
      {children}
    </span>
  );
}
