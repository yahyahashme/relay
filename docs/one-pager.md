# One-page solution form: draft

Draft for issue #8. **Nothing has been submitted.** We submit on the Thu Nov 12 9 PM call (#31); the form closes Fri Nov 13, 8:30 AM ET.

Form: "BlockChain Innovation Challenge: Project Showcase Submission" ([link](https://airtable.com/apprwC5wqwb4We3jo/pageD4iVuMUuoOvFs/form)). The form shows **no word or character limits** (checked Nov 10; Jack will say if one appears). We write to the targets below.

**Before submitting**
- Delete every `(Rohan to confirm)` marker and every `[bracketed placeholder]`, then re-count.
- Every number marked `(Rohan to confirm)` comes from the fact sheet `docs/facts.md` (merged in #59), or from the opening line in PR #73 (#51; wording approved by Yahya, not merged yet). Rohan checks each against his final file and `docs/assumptions.md` (#12, not in the repo yet).
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
Around the world, small businesses in developing countries can't get about $5.7 trillion in credit they need. In El Salvador alone, more than 50,000 neighbourhood shops buy about $2 billion a year from distributors (Conamype estimate). (Rohan to confirm) Shops pay trucks in cash, with no record of who collected what. Short of cash, 6 in 10 informal small businesses have borrowed from loan sharks, about $35 per $100 (2019 survey). (Rohan to confirm)

We built a mobile web app on our public Soroban contract. A shop pays now in test dollars, records cash with two taps, or pays in 7 days, interest-free. On-time repayment raises its limit, up to $500: a credit record it never had. Stellar settles in seconds for a fraction of a cent.

Distributors pay, never shops: 1.5% to be paid instantly on pay-in-7-days sales (0.25% ours, the rest to lenders and a loss buffer), and 0.1% of other invoices. (Rohan to confirm, #12)
<!-- /q5 -->

## 6. Why is your team best suited to solve this problem?

Target: 120 to 150 words.

<!-- q6 -->
Rohan studies FARM (Financial Analysis and Risk Management), which covers the credit and risk side. Three engineers (software, two computer) built and tested our public contract, CAPQ6ZDDWDS3OE42BM5LM3M7YEQ3TJ7IJZ5ZT7A2Z3RTSI35OJKV3I23 on Stellar testnet, and the app: https://tiendas-stellar.vercel.app. Then we asked people: [N] conversations with shop owners, distributors and experts, [N] prototype walkthroughs ([N] usability-only), and [N] emails to banks and cash-in companies (from docs/research.md). We are first-year Waterloo students and none of us has run a shop, so we learned this from them.

We also say the hardest part plainly. Risk #1: turning cash into digital dollars isn't solved in El Salvador, and our demo simulates it; MoneyGram covers cash-out only. Our plan: shops repay weekly like a bill at a bank or payment point, and a licensed partner converts in bulk and does KYC on shops and KYB on distributors.
<!-- /q6 -->

## 7. Submit your Devpost link

**TODO.** Yahya adds it once the Devpost page exists (deadline still TBD in context §2).

---

## Number check

Every number in answers 4 to 6. "Confirm" means Rohan checks it against his final file before we submit.

| Number | Answer | Source | Status |
|---|---|---|---|
| about $5.7 trillion credit gap for small businesses in developing countries | 5 | Opening line in PR #73, `facts.md` entry 22 (IFC/World Bank) | Rohan to confirm. A finance **gap**, never our market. Wording approved by Yahya (Nov 11); PR #73 not merged yet. |
| more than 50,000 neighbourhood shops | 5 | Opening line in PR #73; `facts.md` entry 3 | Rohan to confirm. Replaces 85,265 (Yahya, Nov 11), because 85,265 also counts eateries and street vendors. |
| about $2 billion a year from distributors (Conamype estimate) | 5 | `facts.md` entry 1 (merged in #59) | Rohan to confirm. One official, via Diario El Salvador, 27 Feb 2026. The opening line has no "(Conamype estimate)"; we keep it. |
| 6 in 10 informal small businesses have borrowed from loan sharks | 5 | `facts.md` entry 9 (62.2%) | Rohan to confirm. "Informal" must stay in the sentence. |
| about $35 per $100 (2019 survey) | 5 | `facts.md` entry 10 | Rohan to confirm. Keep the year. |
| $500 cap on a shop's limit | 5 | `docs/credit-model.md` and context §16; contract `LIMIT_CAP` is $500 and tested | Our design number. Confirm against `assumptions.md` (#12). The start limit (the lower of $200 and one average delivery) is not in the answer. |
| 1.5% paid by the distributor on a pay-in-7-days sale | 5 | Context §5 and §16; contract `CREDIT_FEE_BPS` = 150 | Added after Yahya's review (Nov 11). Rohan to confirm against #12. |
| 0.25% of that is ours; the rest goes to lenders and a loss buffer | 5 | Context §5; contract `OUR_BPS` = 25, `LENDER_BPS` = 50, `BUFFER_BPS` = 75 | Rohan to confirm against #12. |
| 0.1% of other invoices (paid now or in cash) | 5 | Context §5 and §16; contract `USAGE_FEE_BPS` = 10 | Rohan to confirm against #12. |
| 7 days | 4, 5 | Product rule, context §7.3 | Design, not a measurement. |
| four first-year students | 6 | Context header | True as of Nov 10. |
| Rohan studies FARM (Financial Analysis and Risk Management) | 6 | Yahya's review comment on #64 (Nov 10). Context says only "FARM". | Rohan to confirm the wording. |
| Three engineers (software, two computer) built and tested the contract and app | 6 | Yahya's review comment on #64; context header lists the programs | Yahya to confirm this fairly describes all three. |
| Contract `CAPQ6ZDD…` and https://tiendas-stellar.vercel.app | 6 | `config/testnet.json` (`contracts.routeLedger`) and the README table; the URL returned HTTP 200 on Nov 11 | Verified. `CANWPJKT…` in the same file is the test USDC token, not our contract. |
| [N] conversations, walkthroughs, emails | 6 | `docs/research.md` (#7, #30) | **Still empty.** The file doesn't exist yet. Honest numbers only. |

**Fee wording (resolved Nov 11).** Issue #8 said "0.1% of every invoice plus 0.25% of each pay-in-7-days sale". Context §5, the Nov 10 decision and the contract say credit sales pay **no** usage fee: the distributor pays one 1.5% fee ($98.50 per $100), and our 0.25% is inside it. Yahya confirmed the §5 wording, and answer 5 now states the 1.5% and where it goes, because "0.25%" alone left out who pays the lenders and the buffer. Rohan still confirms against #12.

## Not in the answers (for the Thu 9 PM call)

Cut for length, still needed in the pitch and Q&A:
- **Go-to-market:** one mid-size distributor's routes first; a bank or cash-in company as the cash partner; a licensed lender or cooperative funding the pool.
- **Where next:** Ecuador and Panama (they also use US dollars), then Guatemala and Honduras, then Mexico and Peru. Use the expansion path in `docs/facts.md` (#51) once it lands.
- **"Why not BFA?":** the state bank BFA lends tiendas up to $10,000, approved within 72 hours (`facts.md` entry 20, which has a suggested answer). Not in the one-pager.
- **Why the shop-cash numbers aren't in answer 5:** "8 in 10 small businesses pay suppliers mainly in cash" (`facts.md` entry 11) covers four countries, not El Salvador alone, so it stays out of the one-pager. Say "regional" if asked.

## Word counts

Counted with `<!-- qN -->` markers: `(Rohan to confirm)` markers excluded, `[placeholders]` counted as written.

| Answer | Target | As written | What changes at submit |
|---|---|---|---|
| 4. One-line summary | about 20 | 20 | Nothing. |
| 5. Problem and benefit | 120 to 150 | 148 | Nothing: no placeholders left. Only 2 words of room, so cut something before adding anything. |
| 6. Why our team | 120 to 150 | 138 | Remove "(from docs/research.md)" (3 words): about 135. Each `[N]` stays one word. |

Re-count after every edit. The counting script is not in the repo; it splits on spaces and treats "$2" and "pay-in-7-days" as one word each.
