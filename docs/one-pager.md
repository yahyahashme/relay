# One-page solution form: draft

Draft for issue #8. **Nothing has been submitted.** We submit on the Thu Nov 12 9 PM call (#31); the form closes Fri Nov 13, 8:30 AM ET.

Form: "BlockChain Innovation Challenge: Project Showcase Submission" ([link](https://airtable.com/apprwC5wqwb4We3jo/pageD4iVuMUuoOvFs/form)). The form shows **no word or character limits** (checked Nov 10; Jack will say if one appears). We write to the targets below.

**Before submitting**
- Delete every `(Rohan to confirm)` marker and every `[bracketed placeholder]`, then re-count.
- Every number marked `(Rohan to confirm)` comes from the open fact-sheet PR #59 (`docs/facts.md`, not on `main` yet). Rohan checks each against his final file (#50, #51) and `docs/assumptions.md` (#12).
- Never use: the $7B figure, "70,000 shops", the Chivo $30 bonus, or MoneyGram's 5% as a comparison. We compare to loan sharks.

---

## 1. Team Topic & Number (picker)

- Topic: Space 1, savings, credit and inflation resilience.
- Number: **TODO**, pick our number from the form's list.

## 2. Team Name

**TBD.** We pick the name Wed Nov 11 (context §1); the app still shows "Nombre pendiente".

## 3. Team Members (picker)

Yahya, Jack, Ruhaan, Rohan. Pick each from the form's list. If one is missing, type them in the "cannot find someone" box.

## 4. One-line summary

Target: about 20 words.

<!-- q4 -->
A mobile web app where El Salvador's neighbourhood shops pay distributors in digital dollars or buy stock on credit, interest-free.
<!-- /q4 -->

## 5. What specific problem is your solution working to solve, how does it benefit the future of this problem space?

Target: 120 to 150 words.

<!-- q5 -->
[WORLDWIDE MARKET NUMBER: one sentence from #51.] Distributors sell El Salvador's 85,265 neighbourhood shops and small retailers about $2 billion a year (Conamype estimate). Most pay in cash (regional survey: 8 in 10). (Rohan to confirm) Short of cash, 6 in 10 informal small businesses have borrowed from loan sharks, about $35 per $100 (2019 survey). (Rohan to confirm)

We built a mobile web app on our own open Soroban contract on Stellar. A shop pays now in digital dollars (USDC), records cash with two taps, or pays in 7 days with no interest. On-time repayment raises its limit from $200 to $500: a credit record it never had. Stellar settles in seconds for a fraction of a cent, and anyone can check the rules and fees.

Distributors pay, never shops: 0.1% of each invoice paid now or in cash, 0.25% of each pay-in-7-days sale. (Rohan to confirm, #12)
<!-- /q5 -->

## 6. Why is your team best suited to solve this problem?

Target: 120 to 150 words.

<!-- q6 -->
We are four first-year University of Waterloo students, new to finance and blockchain, and none of us has run a shop or a delivery route. So we learned this by talking to people: [N] conversations with shop owners, distributors and experts, [N] prototype walkthroughs ([N] usability-only), and [N] emails to banks and cash-in companies (from docs/research.md).

Our engineers wrote the open contract, with tests for the failure cases, and the app (testnet link: [add Thu from #28]). One of us runs outreach and sources our numbers.

We also say the hardest part plainly. Risk #1: turning cash into digital dollars isn't solved in El Salvador, and our demo simulates it; MoneyGram covers cash-out only. Our plan: shops repay weekly like a bill at a bank or payment point, and a licensed partner converts in bulk and does KYC on shops and KYB on distributors.
<!-- /q6 -->

## 7. Submit your Devpost link

**TODO.** Yahya adds it once the Devpost page exists (deadline still TBD in context §2).

---

## Number check

Every number in answers 4 to 6. "Confirm" means Rohan checks it against his final file before we submit.

| Number | Answer | Source | Status |
|---|---|---|---|
| 85,265 shops and small retailers (2025) | 5 | `facts.md` entry 2 (PR #59) | Rohan to confirm. Wording from the "Say this, not that" table. |
| about $2 billion a year (Conamype estimate) | 5 | `facts.md` entry 1 | Rohan to confirm. One official, via Diario El Salvador, 27 Feb 2026. |
| 8 in 10 small businesses pay suppliers mainly in cash, four countries | 5 | `facts.md` entry 11 | Rohan to confirm. **Regional** (2022 survey), not El Salvador alone. |
| 6 in 10 informal small businesses have borrowed from loan sharks | 5 | `facts.md` entry 9 (62.2%) | Rohan to confirm. "Informal" must stay in the sentence. |
| about $35 per $100 (2019 survey) | 5 | `facts.md` entry 10 | Rohan to confirm. Keep the year. |
| $200 starting limit, $500 cap | 5 | Context §16 (Nov 9); contract `LIMIT_CAP` is $500 and tested | Our design numbers. Confirm against `assumptions.md` (#12). |
| 0.1% on invoices paid now or in cash | 5 | Context §5 and §16; contract `USAGE_FEE_BPS` = 10 | **Flagged for Rohan**, see below. |
| 0.25% of each pay-in-7-days sale | 5 | Context §5 and §16; contract `OUR_BPS` = 25 | **Flagged for Rohan**, see below. |
| 7 days | 4, 5 | Product rule, context §7.3 | Design, not a measurement. |
| four first-year students | 6 | Context header | True as of Nov 10. |
| [N] conversations, walkthroughs, emails | 6 | `docs/research.md` (#7, #30) | **Empty until Rohan's real counts land.** Honest numbers only. |

**Fee wording, for Rohan.** Issue #8 says "0.1% of every invoice plus 0.25% of each pay-in-7-days sale". Context §5 and the Nov 10 decision say credit sales pay **no** usage fee: the distributor pays one 1.5% fee ($98.50 per $100), and our 0.25% is inside it. The contract does the same. The draft says "0.1% of each invoice paid now or in cash, 0.25% of each pay-in-7-days sale", which matches §5. Please confirm this is Rohan's final wording from #12, and say if the one-pager should also state the 1.5%.

## Not in the answers (for the Thu 9 PM call)

Cut for length, still needed in the pitch and Q&A:
- **Go-to-market:** one mid-size distributor's routes first; a bank or cash-in company as the cash partner; a licensed lender or cooperative funding the pool.
- **Where next:** Ecuador and Panama (they also use US dollars), then Guatemala and Honduras, then Mexico and Peru. Use the expansion path in `docs/facts.md` (#51) once it lands.
- **"Why not BFA?":** the state bank BFA lends tiendas up to $10,000, approved within 72 hours (`facts.md` entry 20, which has a suggested answer). Not in the one-pager.
- **The live build:** testnet app URL and contract ID, added Thu from #28.

## Word counts

Counted with `<!-- qN -->` markers: `(Rohan to confirm)` markers excluded, `[placeholders]` counted as written.

| Answer | Target | As written | What changes at submit |
|---|---|---|---|
| 4. One-line summary | about 20 | 20 | Nothing. |
| 5. Problem and benefit | 120 to 150 | 139 | The 7-word `[WORLDWIDE MARKET NUMBER]` placeholder becomes Rohan's sentence. It can be up to about 18 words and still fit in 150. |
| 6. Why our team | 120 to 150 | 144 | Remove "(from docs/research.md)" (3 words) and swap `[add Thu from #28]` (4 words) for the URL (1 word): about 138. Each `[N]` stays one word. |

Re-count after every edit. The counting script is not in the repo; it splits on spaces and treats "$2" and "pay-in-7-days" as one word each.
