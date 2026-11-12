// The trifold QR points here. Each visit makes a new invoice for one of the
// demo shops and sends the phone to it, so every judge pays their own invoice.
// A route handler (not a page) so it runs on every request, also for curl.

import { connection, NextResponse } from "next/server";
import { createDemoInvoice } from "@/app/actions";
import { USE_MOCKS } from "@/lib/api";

const ERROR_PAGE = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>No se pudo crear la factura</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 0; padding: 24px 16px; background: #fff; color: #111; }
  main { max-width: 28rem; margin: 0 auto; display: flex; flex-direction: column; gap: 16px; }
  h1 { font-size: 1.5rem; margin: 0; }
  a { display: block; text-align: center; padding: 14px; border-radius: 12px; background: #0b4ea2; color: #fff;
      font-size: 1.125rem; font-weight: 600; text-decoration: none; }
</style>
</head>
<body><main>
  <h1>No pudimos crear su factura</h1>
  <p>Puede ser la conexión. Espere unos segundos e intente de nuevo.</p>
  <a href="/demo">Intentar de nuevo</a>
</main></body>
</html>`;

export async function GET(request: Request) {
  await connection(); // never prerender: every visit is a new invoice
  // The mock store lives in each browser tab, so in mock mode use a seeded invoice.
  if (USE_MOCKS) return NextResponse.redirect(new URL("/tienda/1001", request.url), 303);
  try {
    const invoice = await createDemoInvoice();
    return NextResponse.redirect(new URL(`/tienda/${invoice.id}`, request.url), 303);
  } catch {
    return new NextResponse(ERROR_PAGE, {
      status: 503,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    });
  }
}
