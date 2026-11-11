# Trifold and pitch script v1 (#37)

Draft for issue #37, written Wed Nov 11. The pitcher picked in #26 owns the script from v1 on. **Not final:** the open items below are things v1 could not fill, and every one is marked in the text with a `[bracket]`.

## Open items

| # | What is missing | Who | What v1 does meanwhile |
|---|---|---|---|
| 1 | Final wording of the worldwide number (#51), due Sat noon | Rohan | Uses the opening line in PR #73 (entry 22, $5.7 trillion). That PR is not merged, so entry 22 is not in `docs/facts.md` on `main` yet. |
| 2 | Team name (#26) | Everyone | Writes `[NAME]`. |
| 3 | Pitcher (#26) | Everyone | Written for one speaker, in first person. |
| 4 | "What we heard from N people" (#30). `docs/research.md` does not exist yet | Rohan | Writes `[N]` and `[what we changed]`. If N is under 5, say the real number (context §13). |
| 5 | Real phone screenshots. `docs/screenshots/mock-screens-nov10.png` is a mock | Jack, from the live app | Describes the three shots. Capture them at 360 px with the grey testnet banner in frame. |
| 6 | Demo QR `public/qr-demo.png` (#55; PR #70 is not merged) | Yahya | Reserves the spot. |
| 7 | Board size | Team | Assumes 36 x 48 in. Measure ours. |
| 8 | Paper sketch agreed, print-ready file link in the group chat | Team | **Not done by this PR.** These are two of the three "Done means" lines of #37. |
| 9 | The video (#35). Its first shot is also the worldwide number (context §3.7, PR #77) | Yahya | The pitch opens with that number at 0:00, so the video should open on the shop screens, or the number is said twice in the first minute. |

**Fee fix needed.** Issue #37 and Rohan's assumptions draft (PR #74) say the distributor gets **$98.40** on a $100 sale. The contract pays **$98.50**. $98.40 was the older version with a 0.10% usage fee on top of the 1.5% credit fee. That fee was dropped for credit sales on Nov 10 (context §16; `lib.rs:19` and `:519`). This file uses $98.50. Rohan should correct #74 before the finals.

## 1. Trifold

**Board:** assumed 36 x 48 in open, so three panels of about 16 x 36 in. **Type:** title about 96 pt, headings 30 to 40 pt, body 24 to 32 pt, sources in small print (14 pt). **Text:** at most 25% of the board. The panel text below is about 300 words; at 28 pt that is very roughly 150 sq in, about 9% of 1,728 sq in. Check this on the real layout, it is an estimate.

```
+----------------------+----------------------+----------------------+
| THE PROBLEM          |  [NAME]  (96 pt)     | THE BUSINESS         |
| 36 pt                |  tagline, 2 key pts  | 36 pt                |
|                      |                      |                      |
| Rosa's morning       | HOW IT WORKS (36 pt) | The $100 delivery    |
| 2 lines, 28 pt       | [phone] [phone] [ph] | (3 rows)             |
|                      |  pay    7 days  cash | Our plan (3 lines)   |
| $5.7 trillion        |                      | Where we go next     |
| $2 billion a year    | [QR] Scan to try it  | Risk #1 and our plan |
| $35 per $100         |                      | What we heard: [N]   |
| sources, 14 pt       | [diagram]            |                      |
+----------------------+----------------------+----------------------+
```

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
> Not solved yet. Our demo simulates it. Plan: shops repay weekly like a bill at a bank or payment point, and a licensed partner converts in bulk and does KYC.
>
> **What we heard**
> We talked to [N] people and [N] tried the prototype. Because of them we changed [what we changed].

"Our plan" is a plan, not a deal: no bank, cash-in company or lender has agreed to anything yet. Do not word it as if one had.

## 2. Pitch script v1 (3:00, one speaker, the 1-minute video included)

At 140 words a minute, 25 seconds holds about 58 words and 30 seconds about 70. v1 is at 62 and 71 for the first two segments, 74 (of about 82) for 1:55 to 2:30, 47 (of about 47) for 2:30 to 2:50 and 21 for the close, 275 words in all. Time it in the first run-through (#39) and cut the first two segments first. Counts are of the spoken lines only, and a `[placeholder]` counts as one word per word inside it.

### 0:00 to 0:25

> Around the world, small businesses in developing countries can't get about $5.7 trillion in credit they need. In El Salvador, more than 50,000 neighbourhood shops buy about $2 billion a year from distributors, says Conamype. Picture Rosa, who runs one. The truck is at her door and she's short. A loan shark lends today: about $35 per $100, in a 2019 survey.

### 0:25 to 0:55

> So we built [NAME]. The shop pays now in digital dollars, or pays cash that driver and shop both confirm with two taps, or pays in seven days at full price, no interest. A lender pool pays the distributor at the door. The rules and fee split sit in a public contract on Stellar: dollars already work in El Salvador, and Stellar settles in seconds for a fraction of a cent.

### 0:55 to 1:55: the video (#35)

Play it. Say nothing over it. Have the MP4 on the laptop in case the Wi-Fi fails.

### 1:55 to 2:30

> Who pays? The distributor, never the shop. On a $100 sale paid in seven days, the pool pays the distributor $98.50 now. That 1.5% fee is 75 cents to a default buffer, 50 to lenders, 25 to us. The shop repays $100 and builds a record it never had. We start with one distributor's routes, a bank or cash-in partner, and a licensed lender. Then Ecuador and Panama, which also use the US dollar.

### 2:30 to 2:50

> Our biggest risk: turning a shop's cash into digital dollars isn't solved, and our demo simulates it. Our plan: shops repay weekly like a bill, and a licensed partner converts in bulk and does KYC. We spoke to [N] people, and they made us change [one thing].

### 2:50 to 3:00

> Stock without the loan shark. Payment at the door. [NAME]: one record everyone can trust. Scan the code to try it.

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
