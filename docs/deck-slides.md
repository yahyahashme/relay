# Finals deck: slide text (#41)

Written Wed Nov 11 from `docs/deck-outline.md`, `docs/pitch.md` (PR #83) and `docs/facts.md`. Paste this into Velocity's template; `docs/deck-outline.md` keeps the sources, what each slide still needs, and the open questions.

**Rules each slide follows:** a headline of 8 words or fewer, at most 3 lines of about 10 words (12 at most), readable in 5 seconds. Sources go in the small print under the slide, never in the 3 lines. A `[bracket]` is something the team has not decided or we don't have yet: **do not paste a bracket into the real deck.** Words were counted on Wed Nov 11; recount after any edit.

**Words to avoid** (facts "Never use", PR #83 "Never say"): $7 billion; "85,265 neighbourhood shops"; "$98.40"; a "$2.5 million" revenue figure; "open source"; "audited"; MoneyGram's 5%; "blockchain", "wallet" or "crypto" for shops. Say "public contract", "digital dollars", "test dollars".

**Waiting on other PRs.** Entries 22, 25 and 26 are in PR #73 and entry 29 is in PR #84; neither PR is on `main` yet. The numbers below are the same ones those PRs source, so merge them before the deck goes out.

## 1. Name and one-line pitch (10 s)

**Headline:** [NAME]

1. Pay the truck now, in cash, or in 7 days.
2. No interest.

**Small print:** none.
**Visual:** the name, large. No logo yet.
**Waiting on:** the team name (#26).

## 2. The problem (30 s)

**Headline:** Small shops struggle to get credit for stock

1. About $5.7 trillion: credit small businesses in developing countries can't get
2. Distributors sell 50,000+ neighbourhood shops about $2 billion a year (Conamype estimate)
3. About $35 per $100: what a loan shark charges (2019 survey)

**Small print:** $5.7 trillion: IFC and SME Finance Forum, "MSME Finance Gap", Mar 2025 (2019 data), entry 22. $2 billion: Conamype, via Diario El Salvador, 27 Feb 2026. Shop count: Distribución Dinámica, via Diario El Mundo, 1 Mar 2026. Entries 1 and 3. $35 per $100: CIOPS (UTEC) survey of 1,285 merchants, 2019, entry 10.
**Visual:** three big numbers, no chart. Lead with the worldwide number.
**Waiting on:** entry 22 (PR #73).

## 3. The product (25 s)

**Headline:** One shop screen, three ways to pay

1. Pay now, in digital dollars.
2. Pay in 7 days, no interest.
3. Cash, confirmed by two taps.

**Small print:** Live on Stellar testnet with test dollars. Cash-in is simulated.
**Visual:** three phone screenshots of the live app, left to right as the three lines (steps in `docs/deck-outline.md`, "Capturing the three phone screenshots"). `docs/screenshots/mock-screens-nov10.png` is a mock: don't use it.
**Waiting on:** the Thursday redeploy (#52), then Jack's capture.

## 4. How it works on Stellar (20 s)

**Headline:** The rules live in a public contract

1. Amounts are public. Names are not.
2. Every payment and fee split is recorded on Stellar.
3. Testnet, test dollars.

**Small print:** none (the diagram carries it).
**Visual:** `docs/img/architecture.png`. When PR #81 (fee sponsorship) merges, change "Will pay the network fees" to "Pays the network fees" in `docs/slides/architecture.html` and re-render. Until then, don't say fee sponsorship works.
**Waiting on:** PR #81.

## 5. The code (15 s)

**Headline:** Real contract code, not a mock-up

1. Three credit checks run before the pool pays.
2. Late payment, over the limit, empty pool: all refused.

**Small print:** Abridged from `pay_with_credit` in `contracts/route_ledger/src/lib.rs`. The contract ID and its stellar.expert link are on the image.
**Visual:** `docs/img/code-slide.png`. **Not ready:** it still shows PENDING until the final deploy (PR #82). Re-render it at the print size too if the slide is printed.
**Waiting on:** the redeploy (#52), then Yahya confirming this is the deployed code.

## 6. Money in 30 seconds, and go-to-market (30 s)

**Headline:** Distributors pay. Shops never do.

1. $100 sale: shop repays $100 in 7 days; distributor gets $98.50 now
2. The 1.5% fee: $0.75 buffer, $0.50 lenders, $0.25 us.
3. Start with one distributor's routes, then Ecuador and Panama.

**Small print:** Cash or digital invoices pay 0.1%. Credit sales pay no usage fee. Ecuador and Panama also use the US dollar. A plan, not a deal: no distributor, bank or lender has agreed to anything. Entries 29 (PR #84), 25 and 26 (PR #73).
**Visual:** the $100 example as 3 rows.
**Waiting on:** PRs #84 and #73 merged.

## 7. Risk #1, our plan, what users told us (30 s)

**Headline:** Risk #1: turning cash into digital dollars

1. Not solved yet. Our demo simulates it.
2. Plan: a licensed partner converts cash in bulk and does KYC/KYB.
3. We spoke to [N] people and changed [one thing].

**Small print:** KYC/KYB: checking who shops and distributors are. Shops would repay weekly, like a bill. A plan, not a deal: no bank, cash-in company or lender has agreed to anything.
**Visual:** text only.
**Waiting on:** the real count and the one change (#30; `docs/research.md` is PR #72).

## 8. Team and our ask (20 s)

**Headline:** Who we are, and what we ask

1. Yahya: contract and app. Jack: security review and slides.
2. Rohan: research and facts. Ruhaan: helper code.
3. [our ask]

**Small print:** none.
**Visual:** names, large.
**Waiting on:** the team picks the ask. Candidate, not decided: "Introductions to a distributor, a cash-in partner and a licensed lender" (context §14).
