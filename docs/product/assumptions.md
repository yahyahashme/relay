# Assumptions and money math

Every number links to a `docs/facts.md` entry or is marked **(guess, check in interviews)**. Owner: Rohan (#12). Fees as built in #139: the credit fee is **up to 1.5%**. It is 1.50% when the whole invoice goes on credit and slides down to 1.00% the more the shop paid up front (half up front: 1.22% on the half left). Lenders always get 0.50%; the rest splits 3:1 buffer : us. Every worked number below is the full-credit case, which is the most the distributor pays (facts entries 29 and 30).

## 30-second answer: "How do you make money?"

> "Distributors pay, shops never do. 0.1% of each invoice paid at delivery, and on a 'pay in 7 days' sale the distributor pays up to 1.5% to be paid now, less when the shop pays part up front: at most 0.25% to us, the rest to the lenders and a loss buffer."

**Costs in one line:** "Our founders are the engineers, plus one local sales hire, so fixed costs are about $150K a year plus about $4,000 per distributor, and we break even at around 24 distributors. The pilot year needs funding."

## Assumptions

| Assumption | Value | Why it's realistic | Source |
|---|---|---|---|
| Market: distributor sales to tiendas | about $2B a year | Conamype's estimate | facts.md entry 1 |
| Number of shops | 85,265 shops and small retailers; 50,133 tiendas | Distribución Dinámica count, 2025 | facts.md entries 2, 3 |
| Deliveries per shop per week | 1 per distributor | Weekly routes are the norm for snacks and drinks | (guess, check in interviews) |
| Average delivery | $150 | Matches our demo invoices | (guess, check in interviews) |
| Precedent: short stock credit size | under $500 per loan, about 3 a month | Tienda Pago in Mexico and Peru | facts.md entry 28 (replaces the unsourced "$250 to $300" in context §7.3) |
| Share of sales on "pay in 7 days" | 20% for one distributor; 10% for the ceiling | Only shops short on cash use it | (guess, check in interviews) |
| Default rate | under 0.75% of credit volume | That's the most the buffer can absorb at full credit; less when shops pay part up front (context §5). Limits start at $200, grow $25 after an on-time $40+ cycle ($10+ with half up front; once per period, $500 cap), drop $25 or $50 when repaid late, and freeze when overdue (`docs/product/credit-model.md`) | (guess, check in interviews) |
| Our usage fee | 0.1% of every invoice paid at delivery (not on pay-in-7-days sales) | Contract constant `USAGE_FEE_BPS = 10` | facts.md entry 29 |
| Credit fee, paid by the distributor | Up to 1.5% of what goes on credit: 0.75% buffer, 0.50% lenders, 0.25% us at full credit; down to 1.00% when the shop pays part up front | Contract constants `CREDIT_FEE_BPS = 150` (top) and `MIN_CREDIT_FEE_BPS = 100` (floor), `LENDER_BPS = 50`; the rest 3:1 buffer : us (#139) | facts.md entry 29 |
| Why a distributor accepts up to 1.5% | Paid at delivery instead of in 7 days, no default risk, less cash and extortion risk; or it skips credit and the shop pays at delivery | Suppliers already give up about 37% a year with "2/10 net 30" discounts | context §5; facts.md entries 7, 52 |
| Loan-shark cost for the shop | about $35 per $100 (2019); $0 with us | CIOPS survey | facts.md entry 10 |
| Cash-in partner fee | unknown per $100 | Account holders deposit at payment points for $0 (BAC, Nequi), but what a network charges its partner isn't published; no partner has replied yet (#10) | facts.md entries 42, 43; the partner price is (guess, check with partners) |

## Money math

The contract rounds fees down: fee = amount × bps ÷ 10,000 (100 bps = 1%).

### Per $100 on "pay in 7 days"

| Who | Amount | How |
|---|---|---|
| Distributor receives today | $98.50 | $100 − $1.50 credit fee (no usage fee on credit sales) |
| Default buffer | $0.75 | 0.75% of $100 |
| Lenders | $0.50 | 0.50% of $100 |
| Us | $0.25 | Our share of the 1.5% credit fee (full credit; less when the shop paid part up front) |
| Shop repays on day 7 | $100 | No interest |

The pool puts in $99.50 at delivery ($98.50 + $0.75 + $0.25) and gets back $100 on day 7, so lenders earn $0.50.

### Ceiling (ceiling, not a forecast)

- If 10% of the volume uses "pay in 7 days", the usage fee applies to the other 90%: 0.1% × 90% × $2B = **$1.8M a year**.
- Our credit share on the 10%: 10% × $2B × 0.25% = **$500K a year**.
- Total ceiling: **$2.3M a year**.

### Realistic first year: one mid-size distributor

| Input | Value | Source |
|---|---|---|
| Routes | 10 | (guess, check in interviews) |
| Shops per route | 100 | (guess, check in interviews) |
| Deliveries per shop per week | 1 | (guess, check in interviews) |
| Average delivery | $150 | (guess, check in interviews) |
| Share on credit | 20% | (guess, check in interviews) |

Step by step:
1. Yearly invoices: 10 × 100 × 1 × 52 × $150 = **$7,800,000**
2. Usage fee on the 80% paid at delivery: 0.1% × 80% × $7,800,000 = **$6,240**
3. Credit volume: 20% × $7,800,000 = $1,560,000
4. Our credit share: 0.25% × $1,560,000 = **$3,900**
5. **Our revenue: $6,240 + $3,900 = $10,140 a year**
6. Lenders earn: 0.50% × $1,560,000 = $7,800
7. Buffer collects: 0.75% × $1,560,000 = $11,700
8. Money the pool needs out at any time: $1,560,000 ÷ 52 = **about $30,000**

### Costs

Team model (Nov 15, Rohan; replaces the "2 founders + 2 engineers" draft in #198): **the founders are the engineers**, plus **one local sales and partnerships hire** in El Salvador once the pilot works. Signing up distributors is our biggest risk and a full-time job on the ground, so it gets its own person. Sourced inputs are marked **S**, guesses **G**. USD per year.

**Fixed costs (the same at 1 or 30 distributors)**

| Line | Calculation | $/yr |
|---|---|---|
| 2 founder-engineers (build the product, run partners and fundraising) | 2 × $30K (G; between the local software median of about $13K, **S** GlobalCostData, and senior contract rates of $32–45/hr, **S** Lemon.io) | 60,000 |
| 1 local sales and partnerships hire (signs up distributors, works with the licensed lender and cash-in partner) | $1,000/mo (G; about 2.5× the $408.80 minimum wage, **S** EY) | 12,000 |
| Employer on-costs (social security, pension, 13th-month bonus) | +25% on salaries (G; check with an accountant) | 18,000 |
| Legal (fee-vs-interest opinion, contracts, partner agreements) | (G) | 20,000 |
| Smart-contract audit | (G) | 20,000 |
| Office, accounting, insurance | (G) | 12,000 |
| Hosting, RPC, monitoring (Stellar network fees are under a cent per payment, facts.md entry 37) | (G) | 5,000 |
| **Fixed total** | | **147,000** |

**Variable costs (per distributor of 10 routes × 100 shops, the case above)**

| Line | Calculation | $/yr per distributor |
|---|---|---|
| KYC on 1,000 shop owners | 1,000 × $1.35 (Sumsub Basic list price, **S**) | 1,350 |
| Field staff (shop sign-up, driver training) | 4 staff per 30 distributors × $800/mo (about 2× minimum wage, **S** EY) + 25% | 1,600 |
| Support staff | 2 staff per 30 distributors × $600/mo + 25% | 600 |
| Travel and training materials | $10K ÷ 30 (G) | 333 |
| **Variable total** | | **about 3,900** |

Other costs that sit outside our budget: the licensed lender's share is the 0.50% above (context §16), and the cash-in partner's fee per $100 is still unknown (facts.md entries 42, 43; check with partners).

**Break-even**
- Revenue per distributor: **$10,140 a year** (the realistic first year above).
- Contribution per distributor: $10,140 − $3,900 ≈ **$6,250**.
- **Break-even = fixed ÷ contribution = $147,000 ÷ $6,250 ≈ 24 distributors.** Total costs at that scale: $147K + 24 × $3.9K ≈ **$240K a year**. This is a volume business, so sales should target groups of distributors and big brands, not single shops.

**Sensitivity (the numbers a judge can push on)**

| If… | Revenue per distributor | Break-even |
|---|---|---|
| Base case above | $10,140 | ≈ 24 |
| The licensed partner does KYC at its own cost (our plan says the partner does KYC) | $10,140 | ≈ 19 |
| A cheaper KYC vendor (Didit lists $0.30 a check, **S**) | $10,140 | ≈ 20 |
| No sales hire yet (founders sell) | $10,140 | ≈ 21 |
| Fixed costs rise by $10K | $10,140 | ≈ 25 (each $10K adds about 1.6) |
| **Half of credit sales are pay-later (#194, the distributor gives the 7 days itself) or vouched (#185)**: those earn us only 0.10%, not 0.25% | $8,970 | **≈ 29** |
| Only 10% of sales on credit instead of 20% | $8,970 | ≈ 29 |
| **All** credit sales are pay-later or vouched | $7,800 | ≈ 38 |

Heavy use of pay-later or vouching is good for shops and distributors but pushes our break-even up, because we earn 0.10% instead of 0.25% on those sales.

**The pilot year looks very different.** One route of about 60 shops (context §7.7, guess): about $468K of invoices a year, so about **$600 in revenue**, against about **$138K in costs** (2 founder-engineers, 1 field person, legal, audit, hosting; no sales hire yet). The pilot needs **funding** (a grant or pre-seed) and we say so openly. Its job is to prove repayment and adoption, not to make money.

Sources for the cost lines: GlobalCostData, Software Engineer salary in El Salvador (2026), https://globalcostdata.com/salary/el-salvador/software-engineer/ ; Lemon.io, El Salvador developer rates, https://lemon.io/rate-calculator/el-salvador/ ; EY, El Salvador minimum wage ($408.80), https://www.ey.com/es_ce/technical/tax/tax-alerts/el-salvador-salario-minimo-2026 ; Sumsub pricing (Basic $1.35 per verification), https://sumsub.com/pricing2/ ; Didit pricing ($0.30 per check), https://docs.didit.me/getting-started/competition-analysis.md

### Numbers a finance judge will check

- **Distributor's cost, annualized (Q&A only, never a headline; the full-credit case, the most it can be):** $1.50 ÷ $98.50 = 1.52% a week; × 365 ÷ 7 ≈ **79% a year** simple, about 120% compounded (facts.md entry 56). The shop pays 0%. It's the price of being paid at the door with no default risk, not just of waiting a week. A distributor that doesn't want it simply doesn't offer credit; since #139 the fee is lower when the shop pays part up front.
- **Lenders' return:** 0.5% a week × 365 ÷ 7 ≈ **26% a year** if the money is lent out every week (facts.md entry 56). At 50% use, about 13%.

## Risk #1: cash to digital dollars

Turning cash into digital dollars (cash-in) isn't solved in El Salvador yet; MoneyGram's coverage data lists cash-out there but, as far as we found, not cash-in (facts.md entry 38). The counters exist (8,900 bank correspondent points, facts.md entry 41), and lenders already take loan payments at payment points (44). Our plan: shops repay like a bill there, once a week, and a licensed partner registered with the CNAD converts in bulk (context §6, facts 46 and 47).

## Legal note

Shops pay no interest; the distributor pays a fee to be paid early. El Salvador caps interest rates (Ley Contra la Usura, facts.md entries 18 and 49). A lawyer should confirm the fee isn't treated as interest (context §11.1).

## Never use

$7B, "about 70,000 shops", $5B as our market, MoneyGram's 5% as a comparison.
