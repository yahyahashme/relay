import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { TestnetBand } from "@/components/kit/band";
import { APP_NAME, TAGLINE } from "@/lib/brand";
import "./globals.css";

// Inter is downloaded at build time and served from our own domain (Latin subset only). One variable file covers
// every weight: body text, heavy headings, and amounts (with tabular figures, see globals.css).
const sans = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: `${APP_NAME} · ${TAGLINE}`,
  description: "Las tiendas pagan a su distribuidor con dólares digitales, en efectivo o en 7 días sin intereses.",
};

// viewportFit "cover" lets the screens use the safe areas (notch, home bar) themselves.
export const viewport: Viewport = { themeColor: "#ffffff", viewportFit: "cover" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${sans.variable} h-full antialiased`}>
      <body className="flex min-h-dvh flex-col font-sans">
        <TestnetBand />
        {children}
      </body>
    </html>
  );
}
