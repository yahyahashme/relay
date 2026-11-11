// Checks docs/one-pager.md before the Thu 9 PM call and again before Jack submits the form (#31).
//
//   node scripts/check-one-pager.mjs [path-to-one-pager] [--online]
//
// FAIL (exit code 1) means do not submit yet. WARN means decide on the call.
// Offline by default. --online also opens every URL in the answers and expects a 2xx.
// No npm packages. It never prints more than the lines it complains about.
//
// What it checks, per answer between <!-- qN --> and <!-- /qN -->:
//   word count against the target, "(Rohan to confirm)" markers, [placeholders], TODO/TBD,
//   file paths like docs/research.md, the "never use" list from docs/facts.md,
//   and the contract ID against config/testnet.json (contracts.routeLedger).
// And the form fields outside the answers (team number, team name, Devpost link) for TODO/TBD.
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Word targets from docs/one-pager.md. Question 4 says "about 20 words", so allow a few either way.
export const TARGETS = { 4: [15, 25], 5: [120, 150], 6: [120, 150] };

// Same method as the "Word counts" table in docs/one-pager.md: split on spaces,
// "(Rohan to confirm)" markers excluded, [placeholders] counted as written.
const MARKER = /\(\w+ to confirm[^)]*\)/g;
export function countWords(text) {
  return text.replace(MARKER, " ").split(/\s+/).filter(Boolean).length;
}

// "Never use" in docs/facts.md and docs/context.md section 16.
const NEVER = [
  [/\$7\s?(B\b|billion)/i, "the $7B figure (unsourced)"],
  [/70,000/, '"about 70,000 shops" (replaced by the 50,133 count)'],
  [/Chivo/i, "the Chivo $30 bonus or fuel discounts (2021 perks)"],
  [/MoneyGram.{0,40}\b5\s?%/i, "MoneyGram's 5% (a cross-border fee; compare to loan sharks)"],
  [/\$5\s?(B\b|billion)/i, "$5 billion as our market (it counts the same goods twice)"],
  [/85,265 neighbou?rhood shops(?! and small retailers)/i, '"85,265 neighbourhood shops" on its own (it also counts eateries and street vendors)'],
  [/\b62(\.2)?\s?% of small businesses/i, '"62% of small businesses" (it is informal ones)'],
];

// Allowed to submit, but the team should decide on the call. Each says why.
const WARN = [
  [/\bopen(-source| Soroban| contract)/i, 'says "open": the licence is all rights reserved (#48). Say "public".'],
  [/\baudit(ed)?\b/i, "says audited: we did a safety review with tests, not an outside audit"],
  [/passkey|fee sponsorship/i, "fee sponsorship and passkeys are not on main"],
  [/MoneyGram[^.]{0,60}only/i, "MoneyGram claim: our own locator check found cash-out points, not that cash-in is missing (docs/submit-one-pager.md)"],
  [/fraction of a cent/i, '"fraction of a cent" has no entry in docs/facts.md: add a source or cut it'],
];

const KEY = /\bS[A-Z2-7]{55}\b/;
const CONTRACT_ID = /\bC[A-Z2-7]{55}\b/g;

export function checkOnePager(text, config = {}) {
  const fails = [];
  const warns = [];
  const infos = [];
  const answers = [];
  const urls = new Set();

  if (KEY.test(text)) fails.push("A string that looks like a Stellar secret key (S + 55 characters) is in the file. Remove it.");

  for (const m of text.matchAll(/<!-- q(\d+) -->([\s\S]*?)<!-- \/q\1 -->/g)) {
    const n = Number(m[1]);
    const body = m[2];
    const words = countWords(body);
    const [min, max] = TARGETS[n] ?? [0, Infinity];
    answers.push({ n, words, min, max });
    if (words < min || words > max) fails.push(`Answer ${n}: ${words} words, target ${min} to ${max}.`);
    else if (max - words <= 3) infos.push(`Answer ${n}: ${words} of ${max} words, so cut something before adding anything.`);

    for (const line of body.split("\n")) {
      if (/\(\w+ to confirm[^)]*\)/.test(line)) fails.push(`Answer ${n}: "(... to confirm)" marker left in: ${line.trim().slice(0, 70)}...`);
    }
    for (const p of body.matchAll(/\[[^\]]+\](?!\()/g)) fails.push(`Answer ${n}: placeholder ${p[0]} not filled in.`);
    for (const t of body.matchAll(/\b(TODO|TBD)\b/g)) fails.push(`Answer ${n}: ${t[0]} left in.`);
    for (const f of body.matchAll(/\bdocs\/[\w./-]+/g)) fails.push(`Answer ${n}: file path "${f[0]}" is in the answer, so judges would read it as text.`);
    for (const [re, why] of NEVER) if (re.test(body)) fails.push(`Answer ${n}: never say ${why}.`);
    for (const [re, why] of WARN) if (re.test(body)) warns.push(`Answer ${n}: ${why}`);

    for (const id of body.match(CONTRACT_ID) ?? []) {
      if (config.tokenId && id === config.tokenId) fails.push(`Answer ${n}: ${id.slice(0, 8)}... is the test USDC token, not our contract.`);
      else if (config.contractId && id !== config.contractId) {
        fails.push(`Answer ${n}: contract ${id.slice(0, 8)}... is not contracts.routeLedger in config/testnet.json (${config.contractId.slice(0, 8)}...). Redeployed? Copy the new ID.`);
      } else if (!config.contractId) warns.push(`Answer ${n}: no contracts.routeLedger in config/testnet.json to compare ${id.slice(0, 8)}... with.`);
    }
    for (const u of body.match(/https?:\/\/[^\s)]+/g) ?? []) urls.add(u.replace(/[.,;:]+$/, ""));
  }

  for (const n of [4, 5, 6]) {
    if (!answers.some((a) => a.n === n)) fails.push(`Answer ${n}: no <!-- q${n} --> block found.`);
  }

  // Form fields outside the answers: team number (1), team name (2), team members (3), Devpost link (7).
  for (const chunk of text.split(/^## /m).slice(1)) {
    const head = chunk.match(/^(\d+)\. (.*)/);
    if (!head || [4, 5, 6].includes(Number(head[1]))) continue;
    if (/\b(TODO|TBD)\b/.test(chunk)) fails.push(`Form field ${head[1]} (${head[2].trim()}) is still TODO or TBD.`);
  }

  return { answers, fails, warns, infos, urls: [...urls] };
}

function loadConfig(root) {
  const file = resolve(root, "config/testnet.json");
  if (!existsSync(file)) return {};
  const json = JSON.parse(readFileSync(file, "utf8"));
  return { contractId: json.contracts?.routeLedger, tokenId: json.token?.contractId };
}

async function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const args = process.argv.slice(2);
  const online = args.includes("--online");
  const file = resolve(args.find((a) => !a.startsWith("--")) ?? resolve(root, "docs/one-pager.md"));
  if (!existsSync(file)) {
    console.error(`No such file: ${file}`);
    process.exit(2);
  }
  const result = checkOnePager(readFileSync(file, "utf8"), loadConfig(root));

  console.log(`Checked ${file}\n`);
  for (const a of result.answers) console.log(`  Answer ${a.n}: ${String(a.words).padStart(3)} words (target ${a.min} to ${a.max})`);

  if (online) {
    for (const url of result.urls) {
      try {
        const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(15000) });
        if (res.ok) result.infos.push(`${url} answered ${res.status}. Still open it once in a private window on a phone.`);
        else result.fails.push(`${url} answered ${res.status}.`);
      } catch (error) {
        result.fails.push(`${url} did not answer (${error.name}).`);
      }
    }
  } else if (result.urls.length) {
    result.infos.push(`Not opened (no --online): ${result.urls.join(" ")}`);
  }

  for (const [label, list] of [["FAIL", result.fails], ["WARN", result.warns], ["INFO", result.infos]]) {
    for (const line of list) console.log(`${label}  ${line}`);
  }
  console.log(result.fails.length ? `\n${result.fails.length} to fix before submitting.` : "\nNo FAILs. Read the WARNs, then do the manual checks in docs/submit-one-pager.md.");
  process.exit(result.fails.length ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
