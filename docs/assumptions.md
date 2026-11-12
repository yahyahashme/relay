# Assumptions and money math

Every number links to a `docs/facts.md` entry or is marked **(guess, check in interviews)**. Jack writes the one-pager's money section from this file (#8). Owner: Rohan (#12).

## 30-second answer: "How do you make money?"

> "Distributors pay, shops never do. 0.1% of each invoice paid at delivery, and on a 'pay in 7 days' sale the distributor pays 1.5% to be paid now: 0.25% to us, the rest to the lenders and a loss buffer."

## Assumptions

| Assumption | Value | Why it's realistic | Source |
|---|---|---|---|
| Market: distributor sales to tiendas | about $2B a year | Conamype's estimate | facts.md entry 1 |
| Number of shops | 85,265 shops and small retailers; 50,133 tiendas | Distribución Dinámica count, 2025 | facts.md entries 2, 3 |
| Deliveries per shop per week | 1 per distributor | Weekly routes are the norm for snacks and drinks | (guess, check in interviews) |
| Average delivery | $150 | Matches our demo invoices | (guess, check in interviews) |
| Precedent: short stock credit size | under $500 per loan, about 3 a month | Tienda Pago in Mexico and Peru | facts.md entry 28 (replaces the unsourced "$250 to $300" in context §7.3) |
| Share of sales on "pay in 7 days" | 20% for one distributor; 10% for the ceiling | Only shops short on cash use it | (guess, check in interviews) |
| Default rate | under 0.75% of credit volume per 7-day cycle | Limits start at $200, grow $25 per on-time repayment, and freeze when overdue (`docs/credit-model.md`) | (guess, check in interviews) |
| Our usage fee | 0.1% of every invoice paid at delivery (not on pay-in-7-days sales) | Contract parameter | context §5, §16 |
| Credit fee, paid by the distributor | 1.5% of each credit sale: 0.75% buffer, 0.50% lenders, 0.25% us | Contract parameter | context §16 |
| Why a distributor accepts 1.5% | Paid at delivery instead of in 7 days, no default risk, less cash and extortion risk; or it waits and gets 100% | Same logic as card fees and early-payment discounts | context §5, facts.md entry 7 |
| Loan-shark cost for the shop | about $35 per $100 (2019); $0 with us | CIOPS survey | facts.md entry 10 |
| Cash-in partner fee | about $X per $100 | No partner has replied yet (#10) | (guess, check in interviews) |

## Money math

The contract rounds fees down: fee = amount × bps ÷ 10,000 (100 bps = 1%).

### Per $100 on "pay in 7 days"

| Who | Amount | How |
|---|---|---|
| Distributor receives today | $98.50 | $100 − $1.50 credit fee (no usage fee on credit sales) |
| Default buffer | $0.75 | 0.75% of $100 |
| Lenders | $0.50 | 0.50% of $100 |
| Us | $0.25 | Our share of the 1.5% credit fee |
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

| Cost | Rough size | Source |
|---|---|---|
| Cash-in/cash-out partner fees | about $X per $100 | (guess, check in interviews) |
| Licensed lender's share | the 0.50% above | context §16 |
| Network fees | a fraction of a cent per payment; fee sponsorship means users never hold XLM | context §3.3 |
| Support and signing up distributors | about $300K a year for a small team | (guess) |

**Break-even:** $300,000 ÷ $10,140 per distributor ≈ **30 distributors** (guess). This is a volume business, so sales should target groups of distributors and big brands, not single shops.

### Numbers a finance judge will check

- **Distributor's cost, annualized:** $1.50 ÷ $98.50 = 1.52% a week; × 52 ≈ **79% a year** (simple). It's the price of a sale that wouldn't happen and of carrying no default risk, not the price of waiting a week. Distributors who disagree can fund the credit themselves at $0 (context §5).
- **Lenders' return:** 0.5% a week × 52 = **26% a year** if the money is lent out every week. At 50% use, about 13%.

## Risk #1: cash to digital dollars

Turning cash into digital dollars (cash-in) isn't solved in El Salvador yet; MoneyGram there is cash-out only. Our plan: shops repay like a bill at a bank or payment point, once a week, and a licensed partner converts in bulk (context §6).

## Legal note

Shops pay no interest; the distributor pays a fee to be paid early. El Salvador caps interest rates (Ley Contra la Usura, facts.md entry 18). A lawyer should confirm the fee isn't treated as interest.

## Never use

$7B, "about 70,000 shops", $5B as our market, MoneyGram's 5% as a comparison.
