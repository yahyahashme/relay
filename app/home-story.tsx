"use client";

import { type ReactNode, useEffect, useRef } from "react";

/**
 * Scrollytelling for the home page's "Qué hacemos": every child marked `data-reveal` fades in when it scrolls
 * into view, and a curly arrow (`.draw`) draws itself. The page is drawn on the server with everything showing;
 * only once this runs are the parts below the fold hidden until they arrive, so nothing is lost without
 * JavaScript. With reduced motion everything simply shows (globals.css).
 */
export function ScrollStory({ children, className }: { children: ReactNode; className?: string }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const parts = [...el.querySelectorAll<HTMLElement>("[data-reveal]")];
    const show = (part: Element) => part.setAttribute("data-shown", "");
    if (typeof IntersectionObserver === "undefined") {
      parts.forEach(show);
      return;
    }
    // What is already on screen shows at once, before the rest is hidden, so nothing blinks.
    const fold = window.innerHeight * 0.92;
    for (const part of parts) if (part.getBoundingClientRect().top < fold) show(part);
    el.setAttribute("data-ready", "");
    const watcher = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          show(entry.target);
          watcher.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.2 },
    );
    for (const part of parts) if (!part.hasAttribute("data-shown")) watcher.observe(part);
    return () => watcher.disconnect();
  }, []);

  return (
    <div ref={root} className={`story ${className ?? ""}`}>
      {children}
    </div>
  );
}
