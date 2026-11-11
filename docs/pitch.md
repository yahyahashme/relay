# Trifold and pitch script v1 (#37)

Draft for issue #37, written Wed Nov 11. The pitcher picked in #26 owns the script from v1 on. **Not final:** the open items below are things v1 could not fill, and every one is marked in the text with a `[bracket]`.

## Open items

| # | What is missing | Who | What v1 does meanwhile |
|---|---|---|---|
Status as of Wed Nov 11. Update the "Status" column when an input lands, and delete the row when the placeholder is gone from the text.

| # | What is missing | Who | Status | What v1 does meanwhile |
|---|---|---|---|---|
| 1 | Final wording of the worldwide number (#51), due Sat noon | Rohan | **Open.** PR #73 is still not merged, so entry 22 is not in `docs/facts.md` on `main`. | Uses the opening line approved in #73 ($5.7 trillion). |
| 2 | Team name (#26) | Everyone | **Open.** `lib/brand.ts` on `main` still says "Nombre pendiente". | `[NAME]` in the script and a yellow box on the board. |
| 3 | Pitcher (#26) | Everyone | **Open.** | Written for one speaker, in first person. |
| 4 | "What we heard from N people" (#30). | Rohan | **Open.** `docs/research.md` does not exist yet. | `[N]` and `[what we changed]` in the script and on the board (yellow). If N is under 5, say the real number (context §13). |
| 5 | Three real phone screenshots. `docs/screenshots/mock-screens-nov10.png` is a mock, not for the board | Jack | **Open.** | Three yellow phone frames on the board. Files go in `docs/trifold/img/` as `shop-pay.png`, `shop-credit.png`, `driver-cash.png`: 360 px wide, device pixel ratio 3 (1080 px wide, 180 pixels per inch at 6 in), grey testnet banner in frame. |
| 6 | Demo QR `public/qr-demo.png` (#55, PR #70) | Yahya | **Ready, not merged.** The file is on PR #70's branch (1200 x 1200 px, well over 200 pixels per inch at its printed size). I decoded it on Nov 11: it opens `https://tiendas-stellar.vercel.app/demo`. | The layout reads `public/qr-demo.png` and shows a yellow box until #70 merges. |
| 7 | Board size: do the panels fold 12 + 24 + 12 in or 16 + 16 + 16 in? | Jack | **Open: measure the board** (see section 1). | Both layouts are built and pass the same checks. Pick one when measured. |
| 8 | Paper sketch agreed, print-ready file link in the group chat | Team | **Not done by this PR.** The layout builds a 48 x 36 in PDF in both versions (`node docs/trifold/render.mjs`), but it carries yellow placeholders until rows 2, 4, 5 and 6 close. These are two of the three "Done means" lines of #37. | The PDFs are not committed (`out/` is git-ignored); Jack builds the final one and shares it. |
| 9 | The video (#35). Its first shot is also the worldwide number (context §3.7, PR #77) | Yahya | **Open.** My review of #77 asked for the #73 opening line there too. | The pitch opens with that number at 0:00, so the video should open on the shop screens, or the number is said twice in the first minute. |
| 10 | A sharper diagram: `docs/img/architecture.png` is 1920 x 1080 px, which is 113 pixels per inch on the 12 + 24 + 12 board and 132 on the 16 + 16 + 16 one | Owner of the slide renders (PR #85's scaffold), asked through Jack | **Not asked yet.** Request text is in section 1. | The layout uses the 1x file and prints a warning. It picks up `architecture@2x.png` by itself when it exists. |

**Fee fix needed.** Issue #37 and Rohan's assumptions draft (PR #74) say the distributor gets **$98.40** on a $100 sale. The contract pays **$98.50**. $98.40 was the older version with a 0.10% usage fee on top of the 1.5% credit fee. That fee was dropped for credit sales on Nov 10 (context §16; `lib.rs:19` and `:519`). This file uses $98.50. Rohan should correct #74 before the finals.

## 1. Trifold

**The print file** is `docs/trifold/trifold.html`: the layout at the board's real size, 48 x 36 in open. `node docs/trifold/render.mjs` builds, for each fold layout below, a PDF of the whole board plus one PDF per panel (`-left`, `-centre`, `-right`, each at its own size, for a shop that prints panel by panel) in `docs/trifold/out/` (git-ignored: share the PDFs, don't commit them), and a small preview with the fold marks drawn on (`docs/trifold/preview-12-24-12.jpg`, `preview-16-16-16.jpg`). It needs Google Chrome and no npm packages. The call script and email for the print shop are in `docs/trifold/print-shop.md`. Anything still missing is yellow, and `node docs/trifold/render.mjs --final` refuses to build while yellow is left or a picture is under 100 pixels per inch. The copy in the panels below is the copy on the board; edit both together.

### Which fold? Measure the board first

Nobody has measured our board. Most 36 x 48 in tri-fold boards are 36 in tall and fold **12 + 24 + 12 in**: a wide centre and two narrow wings. The first draft of this file assumed **three 16 in panels**. The two layouts are very different, so both are built:

| | **A: 12 + 24 + 12 in** | **B: 16 + 16 + 16 in** |
|---|---|---|
| Preview | `preview-12-24-12.jpg` | `preview-16-16-16.jpg` |
| Left: the problem | 12 in wing | 16 in |
| Centre: name, two key points, phones, QR, diagram | 24 in | 16 in |
| Right: the business | 12 in wing | 16 in |
| Phones, each | 6 in wide | 3.95 in wide |
| Two key points | 50 pt | 40 pt |
| Diagram | 17 in wide: 113 pixels per inch at 1x | 14.5 in wide: 132 pixels per inch at 1x |
| Text share of the board | 15% | 14.5% |

**To measure:** open the board flat. With a tape measure, write down the height, then the distance from the left edge to the first crease, from the first crease to the second, and from the second to the right edge. If it reads about 12, 24, 12, use A. If it reads three equal panels, use B. If it is something else, the widths are two lines of CSS at the top of `trifold.html`; send me the numbers.

```
A: 12 + 24 + 12 in                                B: 16 + 16 + 16 in
+----------+--------------------+----------+     +--------------+--------------+--------------+
| THE      | [NAME]  (96 pt)    | THE      |     | THE PROBLEM  | [NAME]       | THE BUSINESS |
| PROBLEM  | tagline            | BUSINESS |     |              | tagline      |              |
|          | KEY POINT 1        |          |     | Rosa, 2 para | KEY POINT 1  | $100 delivery|
| Rosa     | KEY POINT 2        | $100     |     |              | KEY POINT 2  | Our plan     |
|          | HOW IT WORKS       | delivery |     | $5.7 tn      | HOW IT WORKS | Where next   |
| $5.7 tn  | [ph]  [ph]  [ph]   | Our plan |     | $2 bn a year | [ph][ph][ph] | Risk #1      |
| $2 bn    |                    | Next     |     | $35 per $100 | [QR] Scan    | What we heard|
| $35      | [QR]  [diagram   ] | Risk #1  |     |              | [diagram   ] |              |
| sources  |                    | Heard [N]|     | sources      |              |              |
+----------+--------------------+----------+     +--------------+--------------+--------------+
```

### What the layout checks (Nov 11, both layouts pass)

- Nothing runs past the bottom or the sides of a panel, so nothing crosses a fold. Blocks are spread from top to bottom; the biggest gap between blocks is 9.8 in on the left wing in A, so it still looks airy, not crowded.
- Text covers 15% (A) and 14.5% (B) of the board, against the 25% limit. The board carries **401 words**, 81 of them 16 pt source lines. (The first draft guessed "about 300 words" and 9%; this is the measured figure.)
- Type: body 32 pt (the top of Velocity's 24 to 32 pt), captions 28 pt, headings 38 to 40 pt, title 96 pt, source lines 16 pt. The three big numbers (104 pt) and the two key points (50 pt or 40 pt) are display type, on purpose larger than a heading.
- The QR is 5 in square with a white border (the assembly spec in PR #85, `docs/trifold-assembly.md`, asks for at least 4 in). The PDF is one page, 3456 x 2592 pt, with the fonts embedded and the text kept as text.

### To ask for, through Jack (the owner of PR #85, the Sunday scaffold)

> Please re-render `docs/img/architecture.png` at 2x (3840 x 2160 px) and save it as `docs/img/architecture@2x.png`. Keep the 1x file as it is, because the README, the slides and the deck use it. Change `--force-device-scale-factor=1` and the matching `--window-size` in `docs/slides/render.mjs`, as `docs/trifold-assembly.md` says, and keep the text crisp. It is the only picture from `docs/img/` on the board, because the code slide is not on it. At 2x it is 226 pixels per inch in layout A and 265 in layout B. 3x is not needed.

The layout picks up `architecture@2x.png` by itself when it exists, and `render.mjs` prints each picture's pixels per inch so we can see it worked.

### Two key points (proposal, the team agrees on the paper sketch)

> **Stock on credit at no interest, not about $35 per $100.**
> **Distributors pay a small fee. Shops never do.**

### Centre: title

> **[NAME]**
> Pay the truck now, in cash, or in 7 days. No interest.

### Left panel: the problem

> **The problem**
> Rosa's truck is at the door and she is short on cash. A loan shark hands her the money today, at about $35 for every $100.
> Back at the warehouse, nobody can easily see which driver collected what cash.
>
> **$5.7 trillion**
> in credit that small businesses in developing countries need and can't get
>
> **$2 billion a year**
> what distributors sell to El Salvador's 50,000+ neighbourhood shops (Conamype estimate)
>
> **$35 per $100**
> what a loan shark charges (2019 survey). 6 in 10 informal small businesses have borrowed from one.

Small print (14 pt):
- "Rosa is an example, not a real interview."
- $5.7 trillion: IFC and SME Finance Forum, "MSME Finance Gap", Mar 2025 (2019 data). Facts entry 22.
- $2 billion: Conamype estimate, via Diario El Salvador, 27 Feb 2026. Shop count: Distribución Dinámica, via Diario El Mundo, 1 Mar 2026. Entries 1 and 3.
- $35 per $100: CIOPS (UTEC) survey of 1,285 merchants, 2019, via Revista E&N. 6 in 10: FUSAI and ASOMI, via El Diario de Hoy, Jul 2026. Entries 9 and 10.

### Middle panel: how it works

> **How it works**
> Pay now: digital dollars
> Pay in 7 days: full price, no interest
> Cash: driver and shop confirm with two taps
> Scan to try it
> Live on Stellar testnet with test dollars. Cash-in is simulated.

- **Three phone screenshots, left to right:** the shop's "Pagar ahora / Pagar en 7 días / Pagué en efectivo" screen; the shop's "Debe … vence …" screen after a credit payment; the driver's "Recibí efectivo" screen. The app is in Spanish, so the captions above are in English.
- **QR:** `public/qr-demo.png` from #55 (not on `main` yet).
- **Diagram:** `docs/img/architecture.png` (#62), titled "How it works on Stellar". It says "Amounts are public. Names are not."
- Leave the contract ID off the board. It changes at the Thursday redeploy (#52); the QR and README always carry the current one.

### Right panel: the business

> **The business**
> **One $100 delivery, paid in 7 days**
> The lender pool pays the distributor now: **$98.50**
> The shop repays in 7 days: **$100**, no interest
> The 1.5% fee: $0.75 buffer, $0.50 lenders, $0.25 us
> The distributor pays because it is paid at the door, carries no risk of the shop not paying, and sells more.
>
> **Our plan**
> One distributor's routes first
> A bank or cash-in partner for the cash
> A licensed lender funds the pool
>
> **Where we go next**
> El Salvador, then Ecuador and Panama (they also use the US dollar), then Guatemala and Honduras, then Mexico and Peru
>
> **Risk #1: cash to digital dollars**
> Not solved yet. Our demo simulates it. Plan: shops repay weekly like a bill at a bank or payment point, and a licensed partner converts in bulk and does KYC and KYB.
>
> **What we heard**
> We talked to [N] people and [N] tried the prototype. Because of them we changed [what we changed].

"Our plan" is a plan, not a deal: no bank, cash-in company or lender has agreed to anything yet. Do not word it as if one had.

## 2. Pitch script v1 (3:00, one speaker, the 1-minute video included)

**Re-timed Nov 11 at 140 words a minute.** The first draft was 275 spoken words: 117.9 s, so 2:58 with the video and no time to start or stop it, and three segments ran past their windows. This version is shorter and timed as one run, not window by window. The pool-pays-the-distributor line was said twice (0:25 and 1:55); it is now only in the 1:55 segment. Counts are spoken lines only, and a `[placeholder]` counts one word per word inside it. Re-count with the table below after every edit, and time it aloud in the first run-through (#39): 140 wpm is an average, and a slower speaker will need the cuts listed under the table.

### 0:00 to 0:25

> Around the world, small businesses in developing countries can't get about $5.7 trillion in credit they need. In El Salvador, more than 50,000 neighbourhood shops buy about $2 billion a year from distributors, says Conamype. Picture Rosa, short when the truck arrives. A loan shark lends today: about $35 per $100 (2019 survey).

### 0:25 to 0:55

> So we built [NAME]. A shop pays in digital dollars, pays cash that driver and shop confirm with two taps, or pays in seven days at full price, no interest. The rules and fees sit in a public Stellar contract: El Salvador already uses dollars, and Stellar settles in seconds for a fraction of a cent. Watch.

### 0:55 to 1:55: the video (#35)

Play it. Say nothing over it. Have the MP4 on the laptop in case the Wi-Fi fails.

### 1:55 to 2:30

> Who pays? The distributor, never the shop. On a $100 sale paid in seven days, a lender pool pays the distributor $98.50 now. That 1.5% fee is 75 cents to a default buffer, 50 to lenders, 25 to us. The shop repays $100 and builds a record it never had. We start with one distributor's routes, a bank or cash-in partner, and a licensed lender. Then Ecuador and Panama, which also use the US dollar.

### 2:30 to 2:50

> Our biggest risk: turning a shop's cash into digital dollars isn't solved, and our demo simulates it. Our plan: shops repay weekly like a bill, and a licensed partner converts in bulk and does KYC and KYB. We spoke to [N] people; they made us change [one thing].

### 2:50 to 3:00

> Stock without the loan shark. Payment at the door. [NAME]: one record everyone can trust. Scan the code to try it.

### Timing at 140 words a minute

The headings above are the issue's windows. Because the first two segments are shorter now, the video starts earlier than 0:55 and everything after it moves up. What counts is the total.

| Part | Words | Seconds | Starts at | Ends at |
|---|---|---|---|---|
| 0:00 segment | 53 | 22.7 | 0:00.0 | 0:22.7 |
| 0:25 segment, ends on "Watch." | 57 | 24.4 | 0:22.7 | 0:47.1 |
| Start the video | | 2.0 | 0:47.1 | 0:49.1 |
| The video (#35), silent | | 60.0 | 0:49.1 | 1:49.1 |
| Stop the video, step back to the mic | | 2.0 | 1:49.1 | 1:51.1 |
| 1:55 segment | 75 | 32.1 | 1:51.1 | 2:23.2 |
| 2:30 segment | 48 | 20.6 | 2:23.2 | 2:43.8 |
| Close | 21 | 9.0 | 2:43.8 | 2:52.8 |
| **Total** | **254** | | | **2:52.8** |

That leaves **7.2 s** under the 3:00 limit. A speaker at 130 words a minute needs about 8 s more, so cut from this list, in this order, until a timed run comes in under 2:55:
1. 0:25 segment: "El Salvador already uses dollars, and" (6 words, 2.6 s). The board and the 1:55 segment still say it uses the dollar.
2. 1:55 segment: "That 1.5% fee is 75 cents to a default buffer, 50 to lenders, 25 to us." (16 words, 6.9 s). The board carries the split.
3. 1:55 segment: "and builds a record it never had" (7 words, 3.0 s). Keep it if there is time: it is the credit-record point.

Do not cut "says Conamype", "(2019 survey)", or "KYC and KYB". The fact sheet and Misha require them.

**Delivery notes**
- "Rosa" is made up. Say "picture", so nobody takes her for a real interview, and drop her if #30 gives us a real story we may tell.
- Keep "in a 2019 survey" and "says Conamype". The fact sheet's "say this, not that" table requires the year and the attribution.
- To answer "how do you make money" in 30 seconds, add: "And 10 cents per $100 on invoices paid now or in cash." That is the 0.1% usage fee (`USAGE_FEE_BPS = 10`). It is not in the script because it does not fit the 35 seconds.

## 3. Checked against the repo

| What the pitch or trifold says | Checked against | Result |
|---|---|---|
| The distributor gets $98.50 per $100 paid in 7 days | `lib.rs:19`, `:519` (payout = amount minus `CREDIT_FEE_BPS` = 150); `lib/labels.ts` | Matches. Issue #37 and PR #74 say $98.40, which is out of date. |
| The 1.5% splits $0.75 buffer, $0.50 lenders, $0.25 us | `lib.rs:22-29`, with a compile-time check that the three add up | Matches |
| The shop pays no fee and no interest | `lib.rs:354-357` (the usage fee comes out of the distributor's side, so the shop pays the invoice amount); `:544` (the shop owes only `amount`) | Matches |
| 0.1% on invoices paid now or in cash | `USAGE_FEE_BPS = 10` (`lib.rs:20`); context §5 | Matches. Credit sales pay no usage fee. |
| Repaying on time builds a record | The limit grows by $25 up to $500 (`LIMIT_STEP`, `LIMIT_CAP`, `lib.rs:32-34`, `:617`), only after a $40+ cycle and once per credit period (context §16, Nov 10) | Matches. The script says "builds a record" and no more. |
| Live on Stellar testnet with test dollars, cash-in simulated | Context §6; the diagram says "Stellar testnet" and "Test USDC" | Matches |
| Names stay off the public ledger | Context §8.4; the diagram | Matches. Amounts are public. |
| "Public contract", not "open source" | #48 removed the MIT licence; the code is all rights reserved | The repo is public and the contract is checkable on Stellar. Do not say "open source". |
| Ecuador and Panama use the US dollar | Context §7.6 (order); entries 25 and 26 are in PR #73 | Order matches `main`. Sources arrive with #73. |
| Fee sponsorship and passkeys | Not on `main`. The diagram says "Will pay the network fees". | **Not claimed** in either text. |

## 4. Never say

- $7 billion, "about 70,000 shops", $5 billion as our market, MoneyGram's 5%, the Chivo $30 bonus or fuel discounts.
- "$5.7 trillion" as our market or what we can earn. It is a finance gap.
- "85,265 neighbourhood shops" on its own (it counts eateries and street vendors), "85% owned by women" (say "most"), "62% of small businesses" (it is informal ones), "$35 per $100" without the year.
- "8 in 10 pay suppliers in cash" or "mostly in cash" for El Salvador alone. The 80% covers four countries.
- "Open source", "audited" (we did a contract safety review with tests, `docs/security.md`, not an outside audit), "fee sponsorship" or "passkeys" as built.
- That any bank, cash-in company or lender has agreed to anything.
- To shop owners: "blockchain", "wallet", "crypto". Say "dólares digitales". To judges, say Stellar.

## 5. Answer bank for the judge questions (#39)

The eight questions from #39, each with an answer that fits **20 seconds (46 words at 140 words a minute)**; the money answer gets 30 seconds (70 words). Written Nov 11, using only facts from `docs/facts.md`, the contract, `docs/credit-model.md` and `docs/context.md`. Where something is our own reasoning or a guess, the answer says so. A `[bracket]` is filled from `docs/research.md` (#7, #30); if a count is zero, say zero.

**How to grade a run-through answer** (for the asker, #39): 1) *Accurate:* every number matches its "Facts" line. 2) *Clear:* someone who has never heard of a tienda follows it. 3) *On time:* 20 seconds or less. 4) *Honest:* it says "plan" where nothing is signed, and "our guess" where it is one. Write what was weak under "Sunday fixes" at the end of this section, and rewrite the answer here.

### 1. How do you make money? (30 seconds)

> Distributors pay us; shops never do. On a pay-in-seven-days sale the distributor pays a 1.5% fee to be paid at the door: 25 cents of each $100 is ours, the rest goes to lenders and a loss buffer. On invoices paid now or in cash we take 0.1%. Both fees are written into a public contract anyone can check.

59 words, 25.3 s.
- **Facts:** the contract: `CREDIT_FEE_BPS` 150, split `BUFFER_BPS` 75, `LENDER_BPS` 50, `OUR_BPS` 25; `USAGE_FEE_BPS` 10. Credit sales pay no usage fee (context §16, Nov 10). For cash the 0.1% is recorded and billed later, not collected yet (`docs/security.md` limit 6).
- **Must include:** the distributor pays, the shop never does; both fee rates; the contract is public.
- **Never:** MoneyGram's 5%, or "we charge shops".
- **If they push, "how big could it get?" (20 s):** > As a ceiling, not a forecast: if 10% of the $2 billion went through pay in 7 days, our 0.25% is about $500,000 a year, plus 0.1% on the rest, about $1.8 million. That is our guess; Rohan is checking it. (41 words; context §5. Rohan's `docs/assumptions.md` (#12) replaces this when it lands.)

### 2. How do you get into El Salvador?

> We start with one mid-size distributor's routes: the driver's QR opens the app, nothing to install. For cash, a bank or cash-in partner. A licensed lender or cooperative funds the pool. That's a plan: nobody has agreed yet. We've emailed [N] partners.

42 words, 18.0 s.
- **Facts:** context §14; Adam Chu (§14): partner with banks and cash-in companies that already have a reputation in El Salvador. The count of emails and replies comes from `docs/research.md`.
- **Must include:** one distributor first; a partner for cash; a licensed lender; that none of it is agreed.
- **Never:** that any bank, cash-in company or lender has agreed to anything.
- **If they push, "why would a distributor switch?":** > It is paid at the door instead of a week later, sells more because shops can buy beyond their cash, and carries less cash and less risk. (27 words; context §5.)

### 3. How does a shop get digital dollars? (Risk #1)

> Our biggest risk, and not solved: cash-in. MoneyGram covers cash-out only. Our plan: shops repay weekly like a bill, at a bank or payment point, and a licensed partner converts the cash in bulk. No shop pre-loads money. Our demo simulates cash-in.

42 words, 18.0 s.
- **Facts:** context §6: the Nov 7 finding (MoneyGram has cash-out points, cash-in is open), ideas 1 (repay like a bill), 2 and 10 (one weekly trip, no deposit at sign-up) and 12 (partner, don't build). README "Risk #1". The demo labels cash-in as simulated on screen.
- **Must include:** say it first, say "not solved", then the plan.
- **Never:** that cash-in is solved, that a partner exists, or that shops can already convert cash cheaply.
- **If they push, "what does cash-in cost?":** > We don't know yet what cash-in costs per $100, or how far a typical shop is from a payment point. Finding that out is the next step with a partner. (30 words; context §6 "Still to find out".)

### 4. What if a shop doesn't pay?

> Limits start small and top out at $500. No new credit while anything is overdue. A buffer, 75 cents of each $100 fee, absorbs losses first. Four periods late, it repays the lenders what it can and the shop's credit is cut off.

43 words, 18.4 s.
- **Facts:** the contract: `LIMIT_CAP` $500; the `Overdue` check in `pay_with_credit`; `BUFFER_BPS` 75; `cover_default` after `DEFAULT_AFTER_PERIODS` = 4 credit periods. **`cover_default` is called by the admin; it does not run by itself.** The start limit is the lower of $200 and one average delivery (`docs/credit-model.md`). `docs/security.md` limit 11: credit risk is real.
- **Must include:** small limits, nothing new while overdue, the buffer, the four-period rule.
- **Never:** "no risk", or that the contract writes off a debt automatically.
- **If they push, "what if losses beat the buffer?":** > Past about 0.75% of credit sales lost, the buffer is used up and the lenders take the loss. That's why limits start small and a licensed lender, not us, funds the pool. (32 words; context §5, "what could break it".)

### 5. Is it legal? (interest-rate cap, KYC/KYB)

> Shops pay no interest; distributors pay a fee to be paid early. Interest is capped by law, so a lawyer should confirm that fee isn't interest. A licensed partner lends and does KYC on shop owners and KYB on distributors. We aren't the lender.

44 words, 18.9 s.
- **Facts:** `docs/facts.md` entry 18 (Ley Contra la Usura; its caveat: "a lawyer should confirm that fee isn't treated as interest"); context §11 and §14 (a licensed lender; KYC and KYB done by the licensed partner; we are not the lender).
- **Must include:** no interest for shops; the lawyer check; KYC and KYB; "not the lender".
- **Never:** "it is legal" or "it is approved", or that we hold a licence. We have none.
- **If they push, "what is the cap?":** > The cap is 1.6 times the average rate for each type of loan, published by the central bank twice a year. We haven't found the exact microcredit cap, so we'd ask a lawyer. (33 words; entry 18, whose 1.6x and January and July details come from secondary sources: check Arts. 5 to 8 of the law before saying the article number.)

### 6. Why Stellar, and not Transfer365 plus a database?

> Transfer365 only moves money between bank accounts; fewer than half of adults have one. No credit, no invoice matching. A distributor's database isn't a record lenders trust. Our public contract enforces the rules, and Stellar settles in seconds for a fraction of a cent.

44 words, 18.9 s.
- **Facts:** entry 14 (Transfer365: free, between bank accounts, more than $4 billion a month; say "more than 9 in 10", not 93% or 95.3%); entries 12 and 13 ("fewer than half of adults"); context §14 for the reasoning.
- **Must include:** Transfer365 is free and good but needs an account; no credit or invoice records; a shared, checkable record; settles fast and cheap.
- **Never:** that cheaper transfers are our pitch, "open source" (say "public contract"), or fee sponsorship and passkeys as built.

### 7. What do El Salvador's credit bureaus already cover? Do tiendas have DUNS numbers?

> Three private bureaus: Equifax, TransUnion and INFORED. They see only formal credit, so a shop's supplier credit and loan-shark debt never show up; our payment record fills that gap. A DUNS number is a nine-digit business ID; I'd expect most tiendas don't have one.

44 words, 18.9 s.
- **Facts:** entry 15 (the three bureaus, licensed and supervised by the SSF; they only see formal credit), entry 16 (the SSF's public credit registry, also only supervised lenders), entry 17 (a DUNS number: nine digits, free to request, not required to operate).
- **Must include:** the three names; formal credit only; what a DUNS number is.
- **Never:** state "tiendas have no DUNS number" as a fact. It is our expectation (entry 17 labels it our reasoning), because Conamype says the state bank's tienda loans are open even to informal shops.

### 8. Have real users tried it?

> We spoke to [N] people and [N] tried the prototype. Walkthroughs with non-Salvadoran shop owners only show whether it's easy to use, not that the problem is real. Because of them we changed [one thing].

35 words, 15.0 s.
- **Facts:** `docs/research.md` (#7, #30), which does not exist yet. Context §13: tests with local corner-store owners count for "is it easy to use", not as proof of the El Salvador problem; if fewer than 5 conversations, say the real number.
- **Must include:** the real counts, the usability-only label, one thing we changed.
- **Never:** round up, count a walkthrough as an interview, or call the Rosa story a real interview.

### Extra: "Why not BFA?" (flagged on #8: judges may ask it)

> BFA, the state bank, lends tiendas up to $10,000, approved in 72 hours: a loan you apply for. Ours is seven-day stock credit at the truck, tied to each delivery, no interest, and it builds a payment record.

38 words, 16.3 s. **Facts:** entry 20 (BFA, backed by Conamype's guarantees; more than $1.4 million in 440 loans, so about $3,200 each by our maths).

### Sunday fixes (fill in during the run-throughs, #39)

`docs/run-throughs/` (PR #85) holds the timings and the full Q&A log. This table records only what was changed in this file.

| Run | Question | What was weak | The fix (new wording is above) |
|---|---|---|---|
| | | | |
