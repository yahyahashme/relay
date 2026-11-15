import Link from "next/link";
import { Logo } from "@/components/logo";
import { TAGLINE, TAGLINE_EN } from "@/lib/brand";
import { T } from "@/lib/i18n";

// The home page's footer, after Wise.com: help, Relay, legal, and social links, then the small print.
// Pages that don't exist yet go to /pronto/<tema> (lib/pronto.ts), which says they are being prepared.

type FooterLink = { href: string; es: string; en: string };

const COLUMNS: { es: string; en: string; links: FooterLink[] }[] = [
  {
    es: "Ayuda",
    en: "Help",
    links: [
      { href: "/pronto/ayuda", es: "Centro de ayuda", en: "Help centre" },
      { href: "/pronto/preguntas", es: "Preguntas frecuentes", en: "FAQs" },
      { href: "/pronto/contacto", es: "Contactar a soporte", en: "Contact support" },
      { href: "/pronto/seguridad", es: "Seguridad y fraudes", en: "Security and fraud" },
    ],
  },
  {
    es: "Relay",
    en: "Relay",
    links: [
      { href: "/pronto/nosotros", es: "Sobre Relay", en: "About Relay" },
      { href: "#como", es: "Qué hacemos", en: "What we do" },
      { href: "/registro/distribuidora", es: "Para distribuidoras", en: "For distributors" },
      { href: "/prestamista", es: "Para prestamistas", en: "For lenders" },
    ],
  },
  {
    es: "Legal",
    en: "Legal",
    links: [
      { href: "/pronto/privacidad", es: "Privacidad", en: "Privacy" },
      { href: "/pronto/terminos", es: "Términos y condiciones", en: "Terms and conditions" },
      { href: "/pronto/cookies", es: "Cookies", en: "Cookies" },
      { href: "/pronto/aviso-legal", es: "Aviso legal", en: "Legal notice" },
    ],
  },
];

const SOCIAL: FooterLink[] = [
  { href: "/pronto/instagram", es: "Instagram", en: "Instagram" },
  { href: "/pronto/facebook", es: "Facebook", en: "Facebook" },
  { href: "/pronto/linkedin", es: "LinkedIn", en: "LinkedIn" },
  { href: "/pronto/tiktok", es: "TikTok", en: "TikTok" },
];

const SIDE = "pl-[max(var(--gutter),env(safe-area-inset-left))] pr-[max(var(--gutter),env(safe-area-inset-right))]";

export function HomeFooter() {
  return (
    <footer id="ayuda" className={`scroll-mt-[calc(var(--band-h)+4.5rem)] bg-paper pt-12 pb-[max(2.5rem,env(safe-area-inset-bottom))] ${SIDE}`}>
      <div className="mx-auto flex w-full max-w-[calc(28rem+2*var(--gutter))] flex-col gap-10 min-[40rem]:max-w-[calc(64rem+2*var(--gutter))]">
        <div className="flex flex-col gap-2">
          <Logo className="h-auto w-[7.5rem]" />
          <p className="font-semibold text-muted">
            <T es={TAGLINE} en={TAGLINE_EN} />
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 min-[30rem]:grid-cols-2 min-[52rem]:grid-cols-4">
          {COLUMNS.map((column) => (
            <nav key={column.es} aria-label={column.es} className="flex flex-col gap-1">
              <h2 className="pb-1 text-lead font-bold">
                <T es={column.es} en={column.en} />
              </h2>
              {column.links.map((link) => (
                <Link key={link.href} href={link.href} className="press -ml-2 inline-flex min-h-11 items-center self-start rounded-full px-2 text-ink underline-offset-4 hover:underline">
                  <T es={link.es} en={link.en} />
                </Link>
              ))}
            </nav>
          ))}
          <nav aria-label="Redes" className="flex flex-col gap-1">
            <h2 className="pb-1 text-lead font-bold">
              <T es="Síganos" en="Follow us" />
            </h2>
            <div className="flex flex-wrap gap-2">
              {SOCIAL.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="press inline-flex min-h-11 items-center rounded-full border border-edge bg-white px-4 font-semibold text-ink hover:bg-brand-tint"
                >
                  {link.es}
                </Link>
              ))}
            </div>
          </nav>
        </div>

        <div className="flex flex-col gap-2 border-t border-paper-rule pt-6 text-label text-muted">
          <p className="text-pretty">
            <T
              es="Relay es una demostración en testnet: todo el dinero es de prueba y nada de lo que ve aquí es una oferta de crédito."
              en="Relay is a testnet demo: all the money is test money and nothing here is an offer of credit."
            />
          </p>
          <p>© 2026 Relay</p>
        </div>
      </div>
    </footer>
  );
}
