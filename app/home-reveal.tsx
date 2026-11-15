"use client";

import { type ReactNode, useEffect, useRef } from "react";

/**
 * Shows its children as they scroll into view: a card rises and fades in, a curly arrow draws itself
 * (.reveal in globals.css). The server draws everything visible, so nothing is lost without JavaScript;
 * on arrival, only what is still below the screen is hidden, then shown when it comes up. Nothing moves
 * with reduced motion.
 */
export function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return; // already on screen: leave it
    el.dataset.reveal = "waiting";
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.dataset.reveal = "shown";
        observer.disconnect();
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}>
      {children}
    </div>
  );
}
