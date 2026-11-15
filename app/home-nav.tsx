"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/logo";
import { useT } from "@/lib/i18n";

// The home page's bar (Wise.com style): it stays at the top while you scroll. It is always the same light blue as the
// first screen; once you scroll it gets a soft shadow so the page slides under it. On the right it says where you are and takes you to
// each part: every part as a pill on a laptop, one pill with a small menu on a phone.

const PARTS = [
  { id: "como", es: "Cómo funciona", en: "How it works" },
  { id: "demo", es: "Demo", en: "Demo" },
  { id: "limite", es: "Límite", en: "Limit" },
  { id: "problema", es: "El problema", en: "The problem" },
  { id: "ayuda", es: "Ayuda", en: "Help" },
] as const;

type PartId = (typeof PARTS)[number]["id"];

/** Which part of the page is in view: the last one whose top has passed the upper third of the screen. */
function useCurrentPart(): PartId | null {
  const [current, setCurrent] = useState<PartId | null>(null);
  useEffect(() => {
    const update = () => {
      const line = window.innerHeight / 3;
      let found: PartId | null = null;
      for (const part of PARTS) {
        const el = document.getElementById(part.id);
        if (el && el.getBoundingClientRect().top <= line) found = part.id;
      }
      // At the very bottom the footer may never reach the line: count it once the page can't scroll further.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) found = "ayuda";
      setCurrent(found);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  return current;
}

function useScrolled(): boolean {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return scrolled;
}

export function HomeNav() {
  const { t, lang } = useT();
  const current = useCurrentPart();
  const scrolled = useScrolled();
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const label = (part: (typeof PARTS)[number]) => (lang === "en" ? part.en : part.es);
  const currentPart = PARTS.find((part) => part.id === current);

  // The phone menu closes on a tap outside it or on Escape.
  useEffect(() => {
    if (!menu) return;
    const outside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenu(false);
    };
    const escape = (event: KeyboardEvent) => event.key === "Escape" && setMenu(false);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [menu]);

  return (
    <header className={`sticky top-(--band-h) z-4 transition-[box-shadow] duration-200 bg-accent ${scrolled ? "shadow-[0_6px_20px_rgb(11_31_58/0.10)]" : ""}`}>
      <div className="mx-auto flex min-h-16 w-full max-w-[calc(28rem+2*var(--gutter))] items-center justify-between gap-3 pr-[max(var(--gutter),env(safe-area-inset-right))] pl-[max(var(--gutter),env(safe-area-inset-left))] min-[40rem]:max-w-[calc(64rem+2*var(--gutter))]">
        <Link
          href="/"
          aria-label="Relay"
          className="press -ml-1 inline-flex min-h-11 shrink-0 items-center rounded-full px-1"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <Logo className="h-auto w-[6.75rem]" />
        </Link>

        {/* Laptop: every part, the one in view filled. */}
        <nav aria-label={t("Partes de la página", "Parts of the page")} className="hidden items-center gap-1 rounded-full border border-edge bg-white p-1 min-[52rem]:flex">
          {PARTS.map((part) => (
            <a
              key={part.id}
              href={`#${part.id}`}
              aria-current={current === part.id ? "location" : undefined}
              className={`press inline-flex min-h-11 items-center rounded-full px-4 text-base font-semibold whitespace-nowrap ${current === part.id ? "bg-ink text-white" : "text-ink hover:bg-paper"}`}
            >
              {label(part)}
            </a>
          ))}
        </nav>

        {/* Phone: one pill that says where you are; it opens the list. */}
        <div ref={menuRef} className="relative min-[52rem]:hidden">
          <button
            type="button"
            aria-expanded={menu}
            aria-controls="home-partes"
            onClick={() => setMenu(!menu)}
            className="press inline-flex min-h-11 items-center gap-2 rounded-full border border-edge bg-white py-1 pr-3 pl-4 text-base font-semibold text-ink"
          >
            <span className="max-w-[9.5rem] truncate">{currentPart ? label(currentPart) : t("Explorar", "Explore")}</span>
            <svg
              viewBox="0 0 20 20"
              className={`size-5 shrink-0 text-brand transition-[rotate] duration-200 ${menu ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4.5 7.5 10 13l5.5-5.5" />
            </svg>
          </button>
          {menu && (
            <nav
              id="home-partes"
              aria-label={t("Partes de la página", "Parts of the page")}
              className="menu-in absolute top-[calc(100%+0.5rem)] right-0 flex w-56 flex-col overflow-hidden rounded-card border border-edge bg-white p-1.5 shadow-[0_12px_32px_rgb(11_31_58/0.14)]"
            >
              {PARTS.map((part) => (
                <a
                  key={part.id}
                  href={`#${part.id}`}
                  onClick={() => setMenu(false)}
                  aria-current={current === part.id ? "location" : undefined}
                  className={`press flex min-h-12 items-center rounded-[0.875rem] px-4 text-[1.0625rem] font-semibold ${current === part.id ? "bg-accent text-ink" : "text-ink hover:bg-paper"}`}
                >
                  {label(part)}
                </a>
              ))}
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
