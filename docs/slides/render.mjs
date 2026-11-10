// Renders the two pitch images for #56 into docs/img/:
//   code-slide.png    real lines from contracts/route_ledger/src/lib.rs (pay_with_credit)
//   architecture.png  "How it works on Stellar"
//
// Run from anywhere:  node docs/slides/render.mjs
// Needs Google Chrome or Chromium. It looks in the usual macOS, Windows and Linux places; if yours is
// somewhere else, set CHROME=/path/to/chrome. No npm packages.
//
// The code on the slide is read straight from lib.rs, so it cannot drift from the contract.
// If those lines change, this script stops and says so: update the slide, then re-run.
//
// Contract ID: CONTRACT_ID env var, else contracts.routeLedger in config/testnet.json.
// If neither exists the slide says "PENDING" in amber, so a placeholder can't pass for the real ID.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const outDir = join(root, "docs/img");
const CHROME_PATHS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];
const CHROME = process.env.CHROME || CHROME_PATHS.find((p) => existsSync(p)) || "";
const EXPLORER = "https://stellar.expert/explorer/testnet/contract";

const die = (msg) => {
  console.error(`render.mjs: ${msg}`);
  process.exit(1);
};

// ---------- 1. The code, copied from the contract ----------
const lib = readFileSync(join(root, "contracts/route_ledger/src/lib.rs"), "utf8").split("\n");
const start = lib.findIndex((l) => l.includes("pub fn pay_with_credit"));
if (start < 0) die("pay_with_credit not found in contracts/route_ledger/src/lib.rs.");

// Each block starts at a known line inside pay_with_credit and runs for `len` lines.
const BLOCKS = [
  { first: "if terms.owed > 0 && now > terms.due_at {", len: 3 }, // not overdue
  { first: "if terms.owed + amount > terms.limit {", len: 3 }, // within the limit
  { first: "let mut pool = load_pool(&env);", len: 4 }, // the pool has money
];

function takeBlock({ first, len }) {
  const i = lib.findIndex((l, n) => n > start && l.trim() === first);
  if (i < 0) die(`the line "${first}" is no longer in pay_with_credit. Update docs/slides/render.mjs and the slide.`);
  const lines = lib.slice(i, i + len);
  if (lines[len - 1].trim() !== "}") die(`the block starting "${first}" changed shape. Update docs/slides/render.mjs.`);
  const indent = Math.min(...lines.map((l) => l.match(/^ */)[0].length));
  return lines.map((l) => l.slice(indent)).join("\n");
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// One pass, so a replacement is never highlighted twice.
function highlight(code) {
  return esc(code).replace(
    /(\/\/.*)|\b(Error::\w+)\b|\b(if|let|mut|return)\b/g,
    (m, comment, err) => (comment ? `<span class="c">${m}</span>` : err ? `<span class="e">${m}</span>` : `<span class="k">${m}</span>`),
  );
}

// ---------- 2. The contract ID ----------
function contractId() {
  let id = process.env.CONTRACT_ID || "";
  const config = join(root, "config/testnet.json");
  if (!id && existsSync(config)) id = JSON.parse(readFileSync(config, "utf8")).contracts?.routeLedger || "";
  if (!id) return "";
  if (!/^C[A-Z2-7]{55}$/.test(id)) die(`"${id}" is not a contract ID (C followed by 55 letters and digits).`);
  return id;
}

const id = contractId();
const contractBlock = id
  ? `<div class="id">${id}</div>\n    <div class="url"><a href="${EXPLORER}/${id}">${EXPLORER.replace("https://", "")}/${id}</a></div>`
  : `<div class="id pending">PENDING: add the deployed contract ID (Yahya deploys, then re-run this script)</div>\n    <div class="url">stellar.expert/explorer/testnet/contract/&lt;ID&gt;</div>`;
if (!id) console.warn("render.mjs: no contract ID found. The code slide shows PENDING.");

// ---------- 3. Render ----------
if (!CHROME || !existsSync(CHROME)) die(`Chrome not found${CHROME ? ` at ${CHROME}` : ""}. Set CHROME=/path/to/chrome.`);
// Chrome refuses to run its sandbox as root (e.g. in a container).
const asRoot = typeof process.getuid === "function" && process.getuid() === 0;
mkdirSync(outDir, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), "slides-56-"));

function shoot(htmlPath, png) {
  execFileSync(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      ...(asRoot ? ["--no-sandbox"] : []),
      "--force-device-scale-factor=1",
      "--window-size=1920,1080",
      `--user-data-dir=${join(tmp, "profile")}`,
      `--screenshot=${join(outDir, png)}`,
      pathToFileURL(htmlPath).href,
    ],
    { stdio: "ignore" },
  );
  console.log(`wrote docs/img/${png}`);
}

let page = readFileSync(join(here, "code-slide.html"), "utf8");
BLOCKS.forEach((b, n) => {
  page = page.replace(`{{BLOCK_${n + 1}}}`, () => highlight(takeBlock(b)));
});
page = page.replace("{{CONTRACT_BLOCK}}", () => contractBlock);
const codeHtml = join(tmp, "code-slide.html");
writeFileSync(codeHtml, page);

shoot(codeHtml, "code-slide.png");
shoot(join(here, "architecture.html"), "architecture.png");
