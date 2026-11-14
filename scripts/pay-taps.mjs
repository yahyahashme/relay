// Repeat-tap safety for the shop's pay buttons. Accidental payment is the worst bug this product can have,
// so every button that moves money is tapped the way a worried thumb taps: twice quickly, then again and
// again one second apart, then two seconds apart, while the screen changes underneath.
//
//   npm run build && npm run start          (mock data; the mock answers in a second, like a slow phone)
//   node scripts/pay-taps.mjs [--base http://localhost:3000] [--only "este monto"]
//
// Passes when each run makes exactly one payment and no later tap lands on any button or link.
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
const ready = async (page) => {
  await page.waitForSelector("main button:not([disabled])", { timeout: 20_000 });
  await page.waitForTimeout(900); // a pay button ignores taps for its first 0.6 s
};

/** name, how to get the pay button on screen, the button, and what the slip must say afterwards. */
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
    start: "/ruta/motorista-1",
    setup: async (page) => {
      // The driver marks the cash first, then the same browser opens the shop's invoice (the mock lives in the tab).
      await page.locator("button", { hasText: "1001" }).first().tap();
      await button(page, "Recibí efectivo").tap();
      await page.waitForTimeout(2500);
      await page.evaluate(() => window.next.router.push("/tienda/1001"));
      await page.waitForSelector("text=Efectivo por confirmar", { timeout: 20_000 });
      await page.waitForTimeout(1500);
    },
    target: (page) => button(page, "Confirmo"),
    after: (text) => /Pagada · Efectivo/.test(text),
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
    await ready(page);
    await scenario.setup?.(page);

    const target = scenario.target(page);
    await target.scrollIntoViewIfNeeded();
    const box = await target.boundingBox();
    const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
    await page.evaluate(() => (window.__hits = []));
    for (let tap = 0; tap < taps; tap++) {
      if (tap > 0) await page.waitForTimeout(gap);
      await page.touchscreen.tap(x, y);
    }
    await page.waitForTimeout(6500); // the payment, the reload, and the hold after the last tap

    const hits = await page.evaluate(() => window.__hits);
    const slip = await page.locator("main section").first().innerText();
    const problems = [];
    if (hits.length !== 1) problems.push(`${hits.length} taps reached a button or link: ${hits.join(" | ")}`);
    if (!scenario.after(slip)) problems.push(`the slip reads: ${slip.replace(/\s+/g, " ").slice(0, 160)}`);
    if (new URL(page.url()).pathname !== "/tienda/1001") problems.push(`ended on ${new URL(page.url()).pathname}`);
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
