# Credit model (proposal)

> **Status: Rohan's proposal from Nov 10, partly overtaken.** For what is live today (starting limit, part-payment, vouching, ID checks, fraud policy) read [`docs/context.md` §7.8](../context.md#78-whats-live-and-whats-planned-nov-16) first; it wins where this file differs. Numbers marked **(guess)** are placeholders until interviews (#7) give real ones.

How "pay in 7 days" decides who gets credit, how much, and what happens when someone pays late. Think of it as a level system: everyone starts small, levels up by paying on time, and drops levels for paying late.

## 1. Goals
- Losses stay below the **default buffer (0.75% at full credit; less when shops pay part up front, #139)** per 7-day cycle.
- Rules are simple enough to put in the contract and explain to a shop owner in one sentence.
- A fake or dishonest shop can only ever take a little.

## 2. Who gets credit on day one
All of these:
- On a distributor's route for **3+ months, with 8+ deliveries** (the distributor already has this history) **(guess)**.
- Owner's DUI checked by the licensed partner (KYC). **One credit line per DUI.**
- Not overdue anywhere on the system.
- Optional: the distributor vouches and shares the loss (option 2 in context §5).

## 3. Starting limit
~~Every shop starts at $200~~ (retired Nov 15, #217). **Built (#218):** a new shop gets no credit until it has paid 2 deliveries in full in dólares digitales at the door, a week apart. Then it starts at half its usual delivery, $50 to $100. A shop its distributor vouches for starts at $100 at once.

## 4. Levelling up
- **Live since the Nov 16 redeploy (#220, PR #222):** the limit shows as **"Crédito Relay X/500"** and grows by tier on each on-time repayment of pool credit: up to $30 → +10, $30–50 → +15, $50–75 → +20, $75–100 → +25, over $100 → +30, at most once a credit period, sized by everything repaid on time that period, from $10. Cap 500. ~~+$25 per on-time repayment~~ (built in #58, replaced by #222).
- **Calificación Relay (1–10, #222):** how likely the shop is to repay within 7 days, from its whole history. Shown to the shop, its distributors and (as pool-level numbers only) lenders.
- **Built in #58 (Nov 10), widened in #139:** a repayment only counts if the shop borrowed **$40 or more** in that cycle (or **$10 or more** when it paid half of every credited invoice up front), and the limit rises **at most once per credit period** (once a week for real). This stops a shop from borrowing $1 and repaying it over and over to reach $500 in minutes.
- Later, only with real data: the cap rises to $750 after 6 months with no late payments **(guess)**.
- **Pay later with a distributor only counts against** (**built**, #200, changed by #203). A pay-later invoice paid on time goes on the shop's record ("Pagó a tiempo X de Y con sus distribuidoras", shown with the Relay score), but it never raises the pool limit or counts as a good cycle: the distributor and the shop could cycle invoices at no cost, and lenders carry the limit (Yahya, option B). Paying it late lowers the limit as in §5. Since Nov 16 it can only be paid in dólares digitales (#241).
- **A good record also makes credit cheaper** (**built**, #185). Each on-time repayment past the same bar, once per period, is a "good cycle"; any late payment starts the count over. After 4 good cycles in a row the buffer's share of the fee drops by a third, after 8 by two thirds: 1.50% → 1.25% → 1.00% at full credit. The distributor pays less to sell on credit to that shop. Lenders still get 0.50%.
- **Or the distributor vouches for the shop** (**built**, #185, option 2 in context §5): 0.25% per credit sale, backed by a deposit of at least 20% of the vouched credit still owed. More than 7 days late, the deposit pays the pool and the distributor collects from the shop. **Full liability since the Nov 16 redeploy:** if the deposit is short, the rest becomes a debt the distributor owes the pool, taken from its next payouts first, and it can't vouch again until it's cleared.

## 5. Late-payment ladder

| Days late | What happens |
|---|---|
| Day 8 | Overdue: no new credit (**built**) |
| Paid 1 day late | Still on time: a grace day (**built**, #137) |
| Paid 2–7 days late | Unfrozen, but the limit drops $25 (**built**, #137) |
| Paid 8+ days late | The limit drops $50 and can't grow for 4 credit periods (**built**, #137) |
| ~~4–14 days late: limit resets to the start~~ | Replaced by the built 2–7 and 8+ day rows above (#137) |
| ~~15–28 days late: credit off, every distributor sees it~~ | Replaced: after 4 credit periods the admin can `cover_default` (built) |
| 28+ days (4 credit periods) | Default: the admin calls `cover_default`. The buffer pays the lenders back what it can, credit goes to $0, and the debt stays on the shop's record. Any later payment goes back into the buffer (**built**) |

## 6. Fraud controls

> The fraud policy decided Nov 16 (flag, ask for proof, close, legal action) is in [`docs/context.md` §7.8](../context.md#78-whats-live-and-whats-planned-nov-16); Rohan's detailed checks are in #221.

- Only shops the truck actually visits can get credit.
- Cash payments need two taps (driver and shop).
- One DUI, one credit line, shared across distributors.
- Alarm: a burst of new shops on one route in one week gets reviewed.
- Only distributors the admin approves can create invoices (**built**, `approve_distributor`). Without this, a shop could invoice itself from a fake "distributor" address and take pool money as cash.
- With that in place, credit pays for stock delivered by a known distributor, not cash, so there is less to steal.
- No cheap levelling up: $40+ per cycle (or $10+ with half up front) and one raise per week (§4).

## 7. Exposure caps
- One distributor's shops: at most **25%** of the pool **(guess)**.
- Shops in their first 2 months: at most **20%** of credit outstanding **(guess)**.
- A hard cap on the total pool until we have 3 months of data.

## 8. The buffer as a dial
- **Buffer rate = observed loss rate × 1.5**, reviewed quarterly. Losses at 0.3% → buffer could drop to 0.45%; losses at 1% → it rises.
- The buffer is seeded at launch so it isn't empty on day one (**built**: `fund_buffer`; `deploy.sh` seeds $200).
- **Target (Yahya, Nov 15, plan only):** 25% of the money lent out. What happens above it is decided after the pilot ([`docs/context.md` §5](../context.md#5-how-we-make-our-cut)).

## 9. Stress test
1,000 shops × about $150 outstanding = **$150K** outstanding **(guess)**. Buffer in per week, at full credit: 0.75% × $150K = **$1,125** (less if shops pay part up front). This assumes every shop repays and borrows again each week, because the buffer grows with each credit sale, not with the amount outstanding.

| Scenario | Loss | Weeks of buffer |
|---|---|---|
| 1% of shops default the same week | $1,500 | ~1.3 |
| 5% default (remittance drop, storm) | $7,500 | ~7 |
| 20 fake shops at $200 | $4,000 | ~3.5 |
| A 200-shop distributor closes, half don't pay | $15,000 | ~13 |

Normal weeks are fine; a big shock needs **about $10–15K of seed money** at launch, which is why the caps in §7 exist.

## 10. What to track weekly
On-time rate; roll rates (how many 1–7 days late slide to 8–30); loss rate vs. the buffer (up to 0.75%); how much of a default is eventually recovered; how much of the pool is actually lent out.

## 11. Demo vs. real
- **Built in the contract (#58, merged Nov 10):** $200 start; +$25 per on-time repayment, only after a $40+ cycle (or $10+ with half up front, #139) and once per credit period; $500 cap; frozen while overdue; a late repayment drops the limit $25 (2–7 days late) or $50 with no raises for 4 periods (8+ days late, #137); `cover_default` after 4 credit periods late (the buffer repays lenders, credit off, debt kept on record); `fund_buffer`; approved distributors only.
- **Pitch only, not built:** eligibility checks, every distributor seeing a default, exposure caps, the buffer dial, the stress test.

## 12. Questions for interviews (#7)
- How many shops on a route never pay their *fiado* today, and how much gets recovered?
- How often do shops pay late, and by how many days?
- How big is a typical delivery?
