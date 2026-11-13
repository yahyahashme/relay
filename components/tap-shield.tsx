"use client";

import { useRef } from "react";

/** How long a screen stays held after a payment lands. */
export const QUIET_MS = 900;

/**
 * A payment changes what sits under the thumb: one button goes away and something else takes its place.
 * While the payment runs, <TapShield> covers the screen and notes every tap. `settle()` then waits one
 * beat, and longer while the taps keep coming, so a repeat tap can't land on whatever comes next.
 */
export function useTapShield() {
  const lastTap = useRef(0);
  const noteTap = () => {
    lastTap.current = Date.now();
  };
  const settle = async () => {
    let wait = QUIET_MS;
    while (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait));
      wait = lastTap.current + QUIET_MS - Date.now();
    }
  };
  return { noteTap, settle };
}

/** Invisible, and only on screen while a payment runs. Scrolling still works through it. */
export function TapShield({ onTap }: { onTap: () => void }) {
  return <div aria-hidden className="fixed inset-0 z-10" onPointerDown={onTap} />;
}
