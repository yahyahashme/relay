import { describe, expect, it } from "vitest";
import { checkOnePager, countWords } from "./check-one-pager.mjs";

const OURS = "CAPQ6ZDDWDS3OE42BM5LM3M7YEQ3TJ7IJZ5ZT7A2Z3RTSI35OJKV3I23";
const TOKEN = "CANWPJKTWATAQKWD4VNDRMPHHWONWJ5IMCIJ2OTJNYFZ5IDQWX2E2NUP";
const CONFIG = { contractId: OURS, tokenId: TOKEN };

const words = (n, extra = "") => `${Array.from({ length: n }, (_, i) => `w${i}`).join(" ")} ${extra}`.trim();

/** A one-pager that should pass, built from word counts so each test changes one thing. */
function onePager({ q4 = words(20), q5 = words(140), q6 = words(130), team = "Team name here", number = "12", devpost = "https://devpost.com/x" } = {}) {
  return `# One-page solution form

## 1. Team Topic & Number (picker)

- Number: ${number}

## 2. Team Name

${team}

## 3. Team Members (picker)

Yahya, Jack, Ruhaan, Rohan.

## 4. One-line summary

<!-- q4 -->
${q4}
<!-- /q4 -->

## 5. Problem

<!-- q5 -->
${q5}
<!-- /q5 -->

## 6. Team

<!-- q6 -->
${q6}
<!-- /q6 -->

## 7. Submit your Devpost link

${devpost}

## Number check

| a | b |
`;
}

describe("countWords", () => {
  it("splits on spaces and treats $2 and pay-in-7-days as one word each", () => {
    expect(countWords("pay-in-7-days costs $2 a year")).toBe(5);
  });

  it("leaves out (Rohan to confirm) markers but counts [placeholders]", () => {
    expect(countWords("about $2 billion (Rohan to confirm) and [N] people (Yahya to confirm, #12)")).toBe(6);
  });
});

describe("checkOnePager", () => {
  it("passes a finished one-pager", () => {
    const r = checkOnePager(onePager(), CONFIG);
    expect(r.fails).toEqual([]);
    expect(r.answers.map((a) => a.words)).toEqual([20, 140, 130]);
  });

  it("fails an answer outside its word target", () => {
    const r = checkOnePager(onePager({ q5: words(160), q6: words(100) }), CONFIG);
    expect(r.fails).toEqual(["Answer 5: 160 words, target 120 to 150.", "Answer 6: 100 words, target 120 to 150."]);
  });

  it("says when there is no room left", () => {
    const r = checkOnePager(onePager({ q5: words(149) }), CONFIG);
    expect(r.fails).toEqual([]);
    expect(r.infos[0]).toContain("149 of 150");
  });

  it("fails on confirm markers, placeholders, TODO and file paths", () => {
    const q6 = words(120, "about $2 billion (Rohan to confirm) [N] conversations TBD (from docs/research.md)");
    const r = checkOnePager(onePager({ q6 }), CONFIG);
    expect(r.fails.some((f) => f.includes("to confirm"))).toBe(true);
    expect(r.fails).toContain("Answer 6: placeholder [N] not filled in.");
    expect(r.fails).toContain("Answer 6: TBD left in.");
    expect(r.fails.some((f) => f.includes("docs/research.md"))).toBe(true);
  });

  it("does not mistake a markdown link for a placeholder", () => {
    const r = checkOnePager(onePager({ q6: words(125, "[our app](https://example.com/app)") }), CONFIG);
    expect(r.fails).toEqual([]);
  });

  it("fails the never-use list", () => {
    const q5 = words(120, "a $7B market, 70,000 shops, MoneyGram's 5% fee, a $5 billion channel, 85,265 neighbourhood shops and 62% of small businesses");
    const fails = checkOnePager(onePager({ q5 }), CONFIG).fails.join("\n");
    for (const part of ["$7B", "70,000", "MoneyGram's 5%", "$5 billion", "85,265", "62%"]) expect(fails).toContain(part);
  });

  it("allows 85,265 shops and small retailers", () => {
    const r = checkOnePager(onePager({ q5: words(125, "85,265 neighbourhood shops and small retailers") }), CONFIG);
    expect(r.fails).toEqual([]);
  });

  it("fails a stale contract ID and the token ID, and passes ours", () => {
    expect(checkOnePager(onePager({ q6: words(120, OURS) }), CONFIG).fails).toEqual([]);
    const redeployed = { ...CONFIG, contractId: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" };
    expect(checkOnePager(onePager({ q6: words(120, OURS) }), redeployed).fails[0]).toContain("Redeployed?");
    expect(checkOnePager(onePager({ q6: words(120, TOKEN) }), CONFIG).fails[0]).toContain("test USDC token");
  });

  it("fails form fields that are still TODO or TBD", () => {
    const r = checkOnePager(onePager({ team: "**TBD.** We pick the name Wed.", number: "**TODO**", devpost: "**TODO.**" }), CONFIG);
    expect(r.fails).toEqual([
      "Form field 1 (Team Topic & Number (picker)) is still TODO or TBD.",
      "Form field 2 (Team Name) is still TODO or TBD.",
      "Form field 7 (Submit your Devpost link) is still TODO or TBD.",
    ]);
  });

  it("fails a missing answer block", () => {
    const r = checkOnePager("## 1. Team Topic & Number\n\nx\n", CONFIG);
    expect(r.fails).toContain("Answer 4: no <!-- q4 --> block found.");
  });

  it("fails a string shaped like a secret key", () => {
    const secret = `S${"A".repeat(55)}`;
    expect(checkOnePager(onePager({ q6: words(120, secret) }), CONFIG).fails[0]).toContain("secret key");
  });

  it("warns, without failing, about claims the team should decide on", () => {
    const q5 = words(120, "our open Soroban contract. MoneyGram covers cash-out only. Stellar settles for a fraction of a cent.");
    const r = checkOnePager(onePager({ q5 }), CONFIG);
    expect(r.fails).toEqual([]);
    expect(r.warns).toHaveLength(3);
  });

  it("lists the URLs for a manual check", () => {
    const r = checkOnePager(onePager({ q6: words(120, "Try https://tiendas-stellar.vercel.app.") }), CONFIG);
    expect(r.urls).toEqual(["https://tiendas-stellar.vercel.app"]);
  });
});
