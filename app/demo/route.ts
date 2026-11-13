// The trifold QR points here. Each visit makes a new invoice for one of the
// demo shops and sends the phone to it, so every judge pays their own invoice.
// A route handler (not a page) so it runs on every request, also for curl.

import { connection, NextResponse } from "next/server";
import { createDemoInvoice } from "@/app/actions";
import { USE_MOCKS } from "@/lib/api";

const ERROR_TEXT = {
  es: {
    title: "No se pudo crear la factura",
    heading: "No pudimos crear su factura",
    body: "Puede ser la conexión. Espere unos segundos e intente de nuevo.",
    retry: "Intentar de nuevo",
  },
  en: {
    title: "Couldn't create the invoice",
    heading: "We couldn't create your invoice",
    body: "It may be the connection. Wait a few seconds and try again.",
    retry: "Try again",
  },
};

/** The error page in the language the visitor picked in the app (the "lang" cookie), Spanish by default. */
function errorHtml(lang: "es" | "en") {
  const text = ERROR_TEXT[lang];
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${text.title}</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 0; padding: 24px 16px; background: #fff; color: #111; }
  main { max-width: 28rem; margin: 0 auto; display: flex; flex-direction: column; gap: 16px; }
  h1 { font-size: 1.5rem; margin: 0; }
  a { display: block; text-align: center; padding: 14px; border-radius: 12px; background: #0b4ea2; color: #fff;
      font-size: 1.125rem; font-weight: 600; text-decoration: none; }
</style>
</head>
<body><main>
  <h1>${text.heading}</h1>
  <p>${text.body}</p>
  <a href="/demo">${text.retry}</a>
</main></body>
</html>`;
}

function langOf(request: Request): "es" | "en" {
  return /(?:^|;\s*)lang=en(?:;|$)/.test(request.headers.get("cookie") ?? "") ? "en" : "es";
}

// A burst of five judges can take ~30 s (one distributor account signs every invoice);
// give the function time to answer with our own page instead of a platform error.
export const maxDuration = 60;

// A public URL that signs transactions: cap how many invoices one server instance
// makes per minute, so a bot or a link checker can't fill the contract.
const MAX_PER_MINUTE = 20;
let recent: number[] = [];

function allowed(now = Date.now()): boolean {
  recent = recent.filter((at) => now - at < 60_000);
  if (recent.length >= MAX_PER_MINUTE) return false;
  recent.push(now);
  return true;
}

function redirect(path: string, request: Request) {
  const response = NextResponse.redirect(new URL(path, request.url), 303);
  response.headers.set("cache-control", "no-store"); // never replay a redirect to an earlier invoice
  return response;
}

function errorPage(request: Request) {
  return new NextResponse(errorHtml(langOf(request)), {
    status: 503,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

export async function GET(request: Request) {
  await connection(); // never prerender: every visit is a new invoice
  // The mock store lives in each browser tab, so in mock mode use a seeded invoice.
  if (USE_MOCKS) return redirect("/tienda/1001", request);
  if (!allowed()) return errorPage(request);
  try {
    const invoice = await createDemoInvoice();
    return redirect(`/tienda/${invoice.id}`, request);
  } catch {
    return errorPage(request);
  }
}

/** Next would answer HEAD by running GET; a link checker or `curl -I` must not make an invoice. */
export async function HEAD() {
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}
