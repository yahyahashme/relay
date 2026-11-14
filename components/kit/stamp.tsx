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
 * A status label: Pagada, Confirmado, En crédito, Vence pronto, Vencida. A soft tinted pill with a dot,
 * always words plus colour (globals.css, .stamp). It was a tilted rubber stamp until Nov 14; the name stayed.
 * `small` is for dense tables.
 *
 * `fresh` plays a short fade once (and a short buzz where the phone allows it), for a payment that just
 * completed. `onLanded` lets the screen make sure it never replays. `tilt` and `fit` are kept so old
 * callers still compile; they no longer change anything.
 */
export function Stamp({
  children,
  tone = "ink",
  small = false,
  fresh = false,
  onLanded,
  tilt,
  fit,
  className = "",
}: {
  children: ReactNode;
  tone?: StampTone;
  small?: boolean;
  fresh?: boolean;
  onLanded?: () => void;
  /** Degrees, between -6 and -4. */
  tilt?: number;
  /** How many letters the word has, so the large stamp never gets wider than the paper it is on. */
  fit?: number;
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
  void tilt;
  void fit;
  return (
    <span onAnimationEnd={onLanded} className={`stamp ${TONE[tone]} ${small ? "stamp-small text-label" : "text-base"} ${fresh ? "stamp-land" : ""} ${className}`}>
      {children}
    </span>
  );
}
