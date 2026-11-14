// Opens every screen of a group at every device size in DESIGN.md (portrait and landscape), checks each
// one, and writes a contact sheet per screen. For the redesign PRs: attach the sheets, paste the report.
//
//   npm run build && npm run start                  (in another terminal; mock data is enough)
//   node scripts/screens.mjs system                 one group: system, shop, distributor, driver, auth, account, admin
//   node scripts/screens.mjs shop --lang en         the same screens in English
//   node scripts/screens.mjs shop --base http://localhost:3000 --out docs/screenshots/redesign
//   node scripts/screens.mjs shop --zoom 2          the browser zoomed to 200%
//   node scripts/screens.mjs shop --text 1.5        the phone's text size raised by half
//
// Checked at each size: no sideways scroll, no clipped text, every touch target at least 44 px
// (the pay buttons are 52 px, the driver's 60 px; the script prints the smallest ones it finds).
// Needs Playwright where Node can find it (npm i -g playwright, or NODE_PATH). It is not a dependency
// of the app. Exits 1 if any check fails.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

/** A sheet is committed with its PR, so it is saved with a 256-colour palette (about a third of the size).
    sharp comes with Next; without it the sheet stays as it is. */
async function shrink(file) {
  try {
    const sharp = require("sharp");
    writeFileSync(file, await sharp(readFileSync(file)).png({ palette: true, quality: 90, effort: 8 }).toBuffer());
  } catch {}
}

/** name, path, and (optionally) what must be in view without scrolling at one size: { "360x640": selector }. */
const GROUPS = {
  system: [
    ["sistema", "/sistema"],
    ["sistema-split", "/sistema/split"],
    ["sistema-shell", "/sistema/shell"],
  ],
  shop: [
    // The floor: on a 360x640 phone "Pagar ahora" and the three other ways to pay are all in view.
    ["factura", "/tienda/1001", { "360x640": "main button" }],
    ["demo", "/demo", { "360x640": "main button" }],
  ],
  distributor: [["panel", "/distribuidor"]],
  driver: [["ruta", "/ruta/motorista-1"]],
  auth: [
    ["inicio", "/"],
    ["registro", "/registro"],
    ["entrar", "/entrar"],
    ["espera", "/distribuidor/espera"],
  ],
  account: [
    ["cuenta", "/tienda/cuenta/tienda-1"],
    ["historial", "/tienda/cuenta/tienda-1/historial"],
  ],
  admin: [
    ["nueva-factura", "/distribuidor/factura"],
    ["motoristas", "/distribuidor/motoristas"],
    ["tiendas", "/distribuidor/tiendas"],
    ["admin", "/admin"],
  ],
};

// The device bands of DESIGN.md. Phones and tablets are also turned on their side.
const PORTRAIT = [
  [280, 653], // foldable, folded
  [320, 568],
  [360, 640], // the floor
  [375, 667],
  [390, 844],
  [393, 852],
  [412, 915],
  [360, 800],
  [384, 854],
  [412, 919],
  [673, 841], // foldable, unfolded
  [768, 1024],
  [820, 1180],
  [800, 1280],
];
const DESKTOP = [
  [1280, 800], // the booth laptop
  [1366, 768],
  [1440, 900],
  [1920, 1080],
];
const SIZES = [...PORTRAIT, ...PORTRAIT.filter(([w]) => w >= 320).map(([w, h]) => [h, w]), ...DESKTOP].filter(
  ([w, h], i, all) => all.findIndex(([w2, h2]) => w2 === w && h2 === h) === i,
);

const args = process.argv.slice(2);
const flag = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const group = args.find((arg) => !arg.startsWith("--") && args[args.indexOf(arg) - 1]?.startsWith("--") !== true) ?? "system";
const base = flag("--base", "http://localhost:3000");
const lang = flag("--lang", "es");
const outDir = resolve(root, flag("--out", "docs/screenshots/redesign"));
const only = flag("--only"); // one screen name
const zoom = Number(flag("--zoom", "1")); // 2 = the browser zoomed to 200%: the same window, half as many CSS pixels
const text = Number(flag("--text", "1")); // 1.5 = the phone's text size raised by half
const variant = `${lang === "es" ? "" : `-${lang}`}${zoom === 1 ? "" : `-zoom${zoom}`}${text === 1 ? "" : `-text${text}`}`;
const MIN_TARGET = 44;

if (!GROUPS[group]) {
  console.error(`Unknown group "${group}". Use one of: ${Object.keys(GROUPS).join(", ")}`);
  process.exit(1);
}

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error("Playwright isn't installed where Node can find it. Try: npm i -g playwright && npx playwright install chromium");
  process.exit(1);
}

/** Runs in the page: what's wrong at this size? */
function inspect(minTarget) {
  const problems = [];
  const doc = document.documentElement;
  if (doc.scrollWidth > doc.clientWidth + 1) problems.push(`scrolls sideways by ${doc.scrollWidth - doc.clientWidth}px`);
  const shown = (el) => {
    const style = getComputedStyle(el);
    const box = el.getBoundingClientRect();
    return style.visibility !== "hidden" && style.display !== "none" && box.width > 0 && box.height > 0;
  };
  const name = (el) => (el.getAttribute("aria-label") || el.textContent || el.getAttribute("name") || el.tagName).trim().replace(/\s+/g, " ").slice(0, 40);
  let smallest = Infinity;
  for (const el of document.querySelectorAll("a[href], button, input, select, textarea, [role=button], summary")) {
    if (!shown(el) || el.closest("[aria-hidden=true]") || el.disabled) continue;
    const box = el.getBoundingClientRect();
    // A link inside a sentence is text, not a button.
    if (el.tagName === "A" && getComputedStyle(el).display === "inline") continue;
    // The tappable area can be bigger than the box (a ::before that extends it).
    const before = getComputedStyle(el, "::before");
    const extra = before.content !== "none" && before.position === "absolute" ? Math.abs(parseFloat(before.top) || 0) + Math.abs(parseFloat(before.bottom) || 0) : 0;
    const height = box.height + extra;
    smallest = Math.min(smallest, height, box.width);
    if (height < minTarget - 0.5 || box.width < minTarget - 0.5) problems.push(`small target ${Math.round(box.width)}x${Math.round(height)}: "${name(el)}"`);
    if (box.right > doc.clientWidth + 1 || box.left < -1) problems.push(`off screen: "${name(el)}"`);
  }
  for (const el of document.querySelectorAll("p, span, h1, h2, h3, dt, dd, td, th, a, button, label, li")) {
    if (!shown(el) || el.children.length > 0 || !el.textContent.trim() || el.closest(".sr-only")) continue;
    const style = getComputedStyle(el);
    if (el.scrollWidth > el.clientWidth + 1 && style.overflowX !== "visible" && style.textOverflow !== "ellipsis") problems.push(`clipped text: "${name(el)}"`);
    const box = el.getBoundingClientRect();
    if (box.right > doc.clientWidth + 1) problems.push(`text past the edge: "${name(el)}"`);
  }
  return { problems: [...new Set(problems)], smallest: Number.isFinite(smallest) ? Math.round(smallest) : null };
}

const browser = await chromium.launch();
const failures = [];
mkdirSync(outDir, { recursive: true });

for (const [screen, path, inView = {}] of GROUPS[group]) {
  if (only && only !== screen) continue;
  const shots = [];
  let smallest = Infinity;
  for (const [fullWidth, fullHeight] of SIZES) {
    const [width, height] = [Math.round(fullWidth / zoom), Math.round(fullHeight / zoom)];
    if (width < 280) continue; // nothing is narrower than the folded phone
    const touch = fullWidth < 1100;
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: touch && Math.min(width, height) < 700, hasTouch: touch });
    const page = await context.newPage();
    if (text !== 1) await page.addInitScript((scale) => document.addEventListener("DOMContentLoaded", () => (document.documentElement.style.fontSize = `${scale * 100}%`)), text);
    const url = new URL(path, base);
    if (lang !== "es") url.searchParams.set("lang", lang);
    await page.goto(url.href, { waitUntil: "networkidle" });
    // Mock reads answer after a second each, one after another: wait until "Cargando..." has gone, then for the slip to print in.
    await page.waitForFunction(() => ![...document.querySelectorAll("[role=status]")].some((el) => /Cargando|Loading/.test(el.textContent)), null, { timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const result = await page.evaluate(inspect, MIN_TARGET);
    const mustSee = zoom === 1 && text === 1 ? inView[`${width}x${height}`] : undefined;
    if (mustSee) {
      const hidden = await page.evaluate((selector) => {
        const below = [...document.querySelectorAll(selector)].filter((el) => el.getBoundingClientRect().bottom > window.innerHeight || el.getBoundingClientRect().top < 0);
        return { found: document.querySelectorAll(selector).length, below: below.map((el) => el.textContent.trim().slice(0, 30)) };
      }, mustSee);
      if (hidden.found === 0) result.problems.push(`nothing matches "${mustSee}"`);
      for (const text of hidden.below) result.problems.push(`not in view without scrolling: "${text}"`);
    }
    if (result.smallest !== null) smallest = Math.min(smallest, result.smallest);
    for (const problem of result.problems) failures.push(`${screen} ${width}x${height}: ${problem}`);
    const file = join(outDir, ".shots", `${group}-${screen}${variant}-${width}x${height}.png`);
    mkdirSync(dirname(file), { recursive: true });
    await page.screenshot({ path: file });
    shots.push({ file, width, height, bad: result.problems.length });
    await context.close();
  }

  // The contact sheet: every size side by side, at a third of its size (laptops at a quarter).
  const sheet = await browser.newPage({ viewport: { width: 2400, height: 1000 } });
  const cells = shots
    .map(({ file, width, height, bad }) => {
      const scale = width >= 1024 ? 0.3 : 0.4;
      const data = readFileSync(file).toString("base64");
      return `<figure><img width="${Math.round(width * scale)}" height="${Math.round(height * scale)}" src="data:image/png;base64,${data}"><figcaption class="${bad ? "bad" : ""}">${width}x${height}${bad ? ` · ${bad} to fix` : ""}</figcaption></figure>`;
    })
    .join("");
  await sheet.setContent(
    `<style>body{margin:0;padding:24px;background:#23272e;color:#e8e6df;font:14px system-ui,sans-serif}h1{font-size:18px;margin:0 0 16px}main{display:flex;flex-wrap:wrap;gap:18px;align-items:flex-end}figure{margin:0}img{display:block;outline:1px solid #555}figcaption{padding-top:5px;color:#b9bdc6}.bad{color:#ff9b8e}</style><h1>${group} · ${screen} · ${path} · ${lang}${zoom === 1 ? "" : ` · zoom ${zoom * 100}%`}${text === 1 ? "" : ` · text ${text * 100}%`} · ${shots.length} sizes</h1><main>${cells}</main>`,
  );
  const sheetFile = join(outDir, `${group}-${screen}${variant}.png`);
  await sheet.screenshot({ path: sheetFile, fullPage: true });
  await sheet.close();
  await shrink(sheetFile);
  console.log(`${screen}: ${shots.length} sizes, smallest touch target ${Number.isFinite(smallest) ? smallest : "-"}px, sheet ${sheetFile.replace(`${root}/`, "")}`);
}

await browser.close();

if (failures.length) {
  console.log(`\n${failures.length} to fix:`);
  for (const failure of failures) console.log(`  ${failure}`);
  process.exit(1);
}
console.log("\nEvery size passed: no sideways scroll, no clipped text, no touch target under 44 px.");
