"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { useT } from "@/lib/i18n";

// The home page's bar: the logo and two plain words, Demo and Ayuda, that take you to those parts.
// It is always the same light blue as the first screen. Scrolling down tucks it away so the page has the room;
// scrolling up a little brings it back. At the top of the page it is always there.

/** True while the bar should be tucked away: the reader is scrolling down, past the top of the page. */
function useTucked(): boolean {
  const [tucked, setTucked] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    const update = () => {
      const y = window.scrollY;
      if (y < 80) setTucked(false);
      else if (y > last + 4) setTucked(true);
      else if (y < last - 4) setTucked(false);
      last = y;
    };
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return tucked;
}

export function HomeNav() {
  const { t } = useT();
  const tucked = useTucked();
  const word = "press inline-flex min-h-11 items-center rounded-full px-2 text-[1.0625rem] min-[22rem]:px-3 font-bold text-ink hover:underline underline-offset-4 decoration-2";

  return (
    <header
      className={`sticky top-(--band-h) z-4 bg-accent transition-transform duration-300 ease-snap motion-reduce:transition-none ${tucked ? "-translate-y-[calc(100%+var(--band-h))]" : "translate-y-0"}`}
    >
      <div className="mx-auto flex min-h-16 w-full max-w-[calc(28rem+2*var(--gutter))] items-center justify-between gap-3 pr-[max(var(--gutter),env(safe-area-inset-right))] pl-[max(var(--gutter),env(safe-area-inset-left))] min-[40rem]:max-w-[calc(64rem+2*var(--gutter))]">
        <Link href="/" aria-label="Relay" className="press -ml-1 inline-flex min-h-11 shrink-0 items-center rounded-full px-1" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <Logo className="h-auto w-[6.75rem]" />
        </Link>
        <nav aria-label={t("Partes de la página", "Parts of the page")} className="flex items-center min-[22rem]:-mr-3 min-[22rem]:gap-1">
          <a href="#demo" className={word}>
            {t("Demo", "Demo")}
          </a>
          <a href="#ayuda" className={word}>
            {t("Ayuda", "Help")}
          </a>
        </nav>
      </div>
    </header>
  );
}
