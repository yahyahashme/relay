import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Mono, Atkinson_Hyperlegible_Next, Inter } from "next/font/google";
import type { ReactNode } from "react";
import { TestnetBand } from "@/components/kit/band";
import { APP_NAME, TAGLINE } from "@/lib/brand";
import "./globals.css";

// All fonts are downloaded at build time and served from our own domain (Latin subset only).
// Atkinson Hyperlegible Next: all reading text (made for low vision; older shop owners read it easily).
const sans = Atkinson_Hyperlegible_Next({ variable: "--font-atkinson", subsets: ["latin"], weight: "variable", display: "swap", adjustFontFallback: false });
// Atkinson Hyperlegible Mono: every amount, invoice number and code.
const mono = Atkinson_Hyperlegible_Mono({ variable: "--font-atkinson-mono", subsets: ["latin"], weight: "variable", display: "swap", adjustFontFallback: false });
// Inter: the big headings only (Wise look).
const display = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: `${APP_NAME} · ${TAGLINE}`,
  description: "Las tiendas pagan a su distribuidor con dólares digitales, en efectivo o en 7 días sin intereses.",
};

// viewportFit "cover" lets the screens use the safe areas (notch, home bar) themselves.
export const viewport: Viewport = { themeColor: "#ffffff", viewportFit: "cover" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${sans.variable} ${mono.variable} ${display.variable} h-full antialiased`}>
      <body className="flex min-h-dvh flex-col font-sans">
        <TestnetBand />
        {children}
      </body>
    </html>
  );
}
