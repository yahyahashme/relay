// Repeat-tap safety for the shop's pay buttons and the driver's "Recibí efectivo". Accidental payment is the
// worst bug this product can have, so every button that moves money is tapped the way a worried thumb taps:
// twice quickly, then again and again one second apart, then two seconds apart, while the screen changes underneath.
//
//   npm run build && npm run start          (mock data; the mock answers in a second, like a slow phone)
//   node scripts/pay-taps.mjs [--base http://localhost:3000] [--only "este monto"]
//
// Passes when each run makes exactly one payment and no later tap lands on any button or link. One scenario
// taps a stop on the driver's sheet instead, at the spot where "Recibí efectivo" is once the stop is open:
// it passes when no cash is recorded at all.
// Needs Playwright where Node can find it, like scripts/screens.mjs. Exits 1 if any run fails.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://localhost:3000";
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : ""; // part of a scenario's name

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error("Playwright isn't installed where Node can find it. Try: npm i -g playwright && npx playwright install chromium");
  process.exit(1);
}

/** [name, how many taps, milliseconds between them] */
const RHYTHMS = [
  ["twice quickly", 2, 90],
  ["every second", 6, 1000],
  ["every two seconds", 5, 2000],
];

const button = (page, name) => page.getByRole("button", { name }).first();
/** A stop on the driver's sheet, by its invoice number. */
const stop = (page, invoice) => page.locator("main a", { hasText: String(invoice) }).first();
const ready = async (page, selector = "main button:not([disabled])") => {
  await page.waitForSelector(selector, { timeout: 20_000 });
  await page.waitForTimeout(900); // a pay button ignores taps for its first 0.6 s
};
const ROUTE = "/ruta/motorista-1";

/**
 * name, how to get the pay button on screen, the button, and what the slip must say afterwards.
 * Also: `start` and `end` (the page it begins and must end on; the shop's invoice unless given), `ready` (what
 * shows that the first page has loaded), `read` (the text `after` is given; the slip unless given), `point`
 * (where to tap, instead of the middle of `target`) and `check` (instead of "one tap reached a button" and `after`).
 */
const SCENARIOS = [
  {
    name: "Pagar ahora",
    target: (page) => button(page, "Pagar ahora"),
    after: (text) => /Pagada · Digital/.test(text),
  },
  {
    name: "Pagar este monto ($ 50 of $ 150)",
    setup: async (page) => {
      await button(page, "Pagar otro monto").tap();
      await page.locator("main input").fill("50");
      await page.waitForTimeout(900);
    },
    target: (page) => button(page, "Pagar este monto"),
    // One payment of 50 and no more: 50 paid of 150, 100 left, and the slip is not stamped paid.
    after: (text) => /Pagado\s*\$50\.00 de \$150\.00/.test(text) && /Falta[\s\S]*\$100\.00/.test(text) && !/Pagada ·/.test(text),
  },
  {
    name: "Confirmo (Pagar en 7 días)",
    setup: async (page) => {
      await button(page, "Pagar en 7 días").tap();
      await page.waitForTimeout(900);
    },
    target: (page) => button(page, "Confirmo"),
    after: (text) => /Pagada · Crédito/.test(text),
  },
  {
    name: "Confirmo (Pagué en efectivo)",
    start: ROUTE,
    ready: "main [data-next]",
    setup: async (page) => {
      // The driver marks the cash first, then the same browser opens the shop's invoice (the mock lives in the tab).
      await stop(page, 1001).tap();
      await button(page, "Recibí efectivo").tap();
      await page.waitForTimeout(2500);
      await page.evaluate(() => window.next.router.push("/tienda/1001"));
      await page.waitForSelector("text=Efectivo por confirmar", { timeout: 20_000 });
      await page.waitForTimeout(1500);
    },
    target: (page) => button(page, "Confirmo"),
    after: (text) => /Pagada · Efectivo/.test(text),
  },
  {
    // The driver's own money button: one record, and the taps that follow reach nothing (not the invitation, not a link).
    name: "Recibí efectivo (the driver's stop)",
    start: ROUTE,
    end: ROUTE,
    ready: "main [data-next]",
    setup: async (page) => {
      await stop(page, 1001).tap();
      await page.waitForTimeout(900);
    },
    target: (page) => button(page, "Recibí efectivo"),
    read: (page) => page.locator("main").innerText(),
    after: (text) => /Efectivo registrado\s*\$150\.00 por confirmar/.test(text) && !/Recibí efectivo/.test(text),
  },
  {
    // Opening a stop puts "Recibí efectivo" on screen, for some rows right where the row was tapped.
    // Taps that keep landing on that spot were meant for the row: none of them may record cash.
    name: "A stop's row, at the spot where Recibí efectivo will be",
    start: ROUTE,
    end: ROUTE,
    ready: "main [data-next]",
    point: async (page) => {
      // Open the last stop to see where its button lies, go back to the sheet, and aim there.
      await stop(page, 1008).tap();
      const box = await button(page, "Recibí efectivo").boundingBox();
      const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      await page.goBack();
      await page.waitForSelector("main [data-next]", { timeout: 20_000 });
      await page.waitForTimeout(3000); // longer than the same-spot guard remembers the taps above
      const row = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest("main a")?.innerText ?? null, point);
      if (row === null) throw new Error("no stop lies where Recibí efectivo will be: pick another row for this scenario");
      return point;
    },
    read: (page) => page.locator("main").innerText(),
    check: ({ hits, text, url }) => [
      ...(hits.length === 0 ? ["the first tap did not open the stop"] : []),
      ...(url.searchParams.has("parada") ? [] : ["the stop is not open"]),
      ...(/Efectivo registrado|Procesando/.test(text) || !/Recibí efectivo/.test(text) ? [`cash was recorded: ${text.replace(/\s+/g, " ").slice(-160)}`] : []),
    ],
  },
];

const browser = await chromium.launch();
const failures = [];

for (const scenario of SCENARIOS) {
  if (!scenario.name.includes(only)) continue;
  for (const [rhythm, taps, gap] of RHYTHMS) {
    const context = await browser.newContext({ viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    // Every tap that reaches a button, a link or an input is written down.
    await page.addInitScript(() => {
      window.__hits = [];
      addEventListener(
        "click",
        (event) => {
          const hit = event.target instanceof Element ? event.target.closest("a, button, input") : null;
          if (hit) window.__hits.push((hit.innerText || hit.tagName).trim().split("\n")[0]);
        },
        true,
      );
    });
    await page.goto(new URL(scenario.start ?? "/tienda/1001", base).href, { waitUntil: "networkidle" });
    await ready(page, scenario.ready);
    await scenario.setup?.(page);

    let x, y;
    if (scenario.point) {
      ({ x, y } = await scenario.point(page));
    } else {
      const target = scenario.target(page);
      await target.scrollIntoViewIfNeeded();
      const box = await target.boundingBox();
      [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
    }
    await page.evaluate(() => (window.__hits = []));
    for (let tap = 0; tap < taps; tap++) {
      if (tap > 0) await page.waitForTimeout(gap);
      await page.touchscreen.tap(x, y);
    }
    await page.waitForTimeout(6500); // the payment, the reload, and the hold after the last tap

    const hits = await page.evaluate(() => window.__hits);
    const slip = await (scenario.read ? scenario.read(page) : page.locator("main section").first().innerText());
    const url = new URL(page.url());
    const problems = [];
    if (scenario.check) {
      problems.push(...scenario.check({ hits, text: slip, url }));
    } else {
      if (hits.length !== 1) problems.push(`${hits.length} taps reached a button or link: ${hits.join(" | ")}`);
      if (!scenario.after(slip)) problems.push(`the slip reads: ${slip.replace(/\s+/g, " ").slice(0, 160)}`);
    }
    if (url.pathname !== (scenario.end ?? "/tienda/1001")) problems.push(`ended on ${url.pathname}`);
    if (context.pages().length !== 1) problems.push("opened another tab");

    console.log(`${problems.length ? "FAIL" : "ok  "}  ${scenario.name}, tapped ${rhythm}`);
    for (const problem of problems) failures.push(`${scenario.name}, tapped ${rhythm}: ${problem}`);
    await context.close();
  }
}

await browser.close();

if (failures.length) {
  console.log(`\n${failures.length} to fix:`);
  for (const failure of failures) console.log(`  ${failure}`);
  process.exit(1);
}
console.log("\nEvery run made one payment, and no later tap reached a button or a link.");
