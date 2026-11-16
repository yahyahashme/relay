# Security notes

This is the page to open when someone asks "who can move the money?". It covers the `route_ledger` contract (`contracts/route_ledger/src/lib.rs`), how keys are handled, what is real versus demo, and how we handle fraud. It is a testnet demo: no real dollars, no outside audit.

Reviewed Nov 16, 2026 against `lib.rs` on main: the live contract `CCNMBJD4…5MHVPF` (redeployed Nov 16 after #251): PR #222 (credit v3, full recourse, cash rules) plus #251 (trusted tiers at 26/52 good weeks, cash usage fees collected). Claims about the contract have a test in `contracts/route_ledger/src/test.rs`; the names are in brackets.

## 1. Who can move the money

Every state-changing function either calls `require_auth()` on the address it takes first (the shop, driver, distributor, lender or payer), or checks `config.admin`. `call_recourse` and `cover_default` need no signer, but only work once a shop is late enough, and they move money inside the contract only. A call signed by anyone else fails before anything moves [`each_function_asks_for_exactly_its_documented_signer`, `wrong_signer_*`, `only_the_admin_can_revoke`].

| Function | Who must sign | What it checks | What it can move |
|---|---|---|---|
| `__constructor` | the deployer, once | can't run twice [`constructor_cannot_be_run_again`] | nothing. Stores admin, token, treasury and the credit period, none of which can change later. |
| `approve_distributor` / `revoke_distributor` | admin | signer is `config.admin` | nothing directly. Approval lets an address invoice, vouch, offer its own 7 days and be paid from the pool. Revoked: none of that any more; its shops still pay what they owe, and its deposit stays behind its vouched shops [`a_revoked_distributor_gets_no_new_invoices_or_pool_money`]. |
| `approve_lender` / `revoke_lender` | admin | signer is `config.admin` | nothing. A revoked lender can't deposit but can always withdraw [`a_revoked_lender_cannot_deposit_but_can_withdraw_everything`]. |
| `create_invoice` | the distributor | approved (`NotApproved`), new id, amount above 0 | nothing; it records an invoice. |
| `pay` | the shop on the invoice | its invoice, not paid, amount above 0 and not over what is left | the shop's own tokens: 0.10% to the treasury, the rest to the distributor. If the distributor owes the pool for a vouched shop, that debt is paid first [`a_distributor_in_debt_pays_it_from_its_next_payouts`]. |
| `cash_claim` | the driver on the invoice | its invoice, not paid, **not on the distributor's own 7 days** (`OnPayLater`), amount above 0 and not over what is left | nothing; it stores the claim [`pay_later_is_never_paid_in_cash`]. |
| `cash_confirm` | the shop on the invoice | a claim exists, it equals the amount the shop saw (`ClaimChanged`), still fits what is left | no tokens. Adds to `paid`, the driver's cash total and the distributor's usage fee owed. Records the cash part, which earns no up-front fee benefit [`cash_up_front_earns_no_lower_credit_fee`, `cash_up_front_does_not_count_as_half_paid`]. |
| `cash_handed_in` | a distributor that was ever approved | amount above 0 and not over what the driver holds | no tokens; lowers the driver's cash total (limit 3). |
| `settle_usage` (#251) | the distributor | amount above 0 and not over what it owes | its own tokens to the treasury, for usage fees on cash. Its next payout (digital, credit or deposit withdrawal) also pays them first, after any recourse debt. |
| `deposit` | an approved lender | approved and not revoked (`NotLender`), amount above 0 | the lender's own tokens into the pool, for shares at today's value [`only_approved_lenders_can_deposit`, `a_later_lender_does_not_take_earlier_earnings`]. |
| `withdraw` | the lender | has the shares (`NotEnoughShares`), the money isn't lent out (`PoolTooLow`) | **pool money**, to that lender only, at the shares' value [`lender_earns_on_credit_and_withdraws_it`, `lent_money_cannot_be_withdrawn_until_repaid`]. |
| `set_terms` | admin | limit not negative | nothing directly; sets a shop's limit. |
| `pay_with_credit` | the shop on the invoice | its invoice, not paid, not on pay later, distributor still approved, terms exist, nothing overdue (pool or pay later), within the limit, `available` covers it | **pool money** to the distributor (its recourse debt first) and our share to the treasury. Fee 1.00% to 1.50% by the digital part paid up front, lower for trusted shops, 0.25% if vouched and the deposit covers it. Lenders' 0.50% stays in the pool. |
| `repay` | the shop that owes | something owed, amount above 0 and not over the debt | the shop's own tokens into the pool (or into the buffer for a written-off debt). Credit is only repaid this way, in dólares digitales. |
| `vouch` | an approved distributor | the shop has terms and owes nothing (`ShopOwes`); turning it on needs no recourse debt (`RecourseDebtOwed`) | nothing [`vouching_rules`, `a_distributor_in_debt_cant_vouch_or_get_the_vouched_fee`]. |
| `deposit_recourse` | an approved distributor | amount above 0 | its own tokens into its recourse deposit. |
| `withdraw_recourse` | the distributor | the deposit stays at least 20% of its vouched credit still out (`NotEnoughDeposit`) | its own deposit back, minus any recourse debt [`the_deposit_can_only_drop_to_twenty_percent`]. |
| `call_recourse` | anyone | a vouched shop is more than 7 days late (`NotInDefault`) | inside the contract only: the deposit pays the pool the vouched part; what it can't pay becomes the distributor's debt [`recourse_pays_the_pool_after_seven_days_late`, `a_default_takes_the_deposit_then_the_distributor_owes_the_rest`]. |
| `cover_default` | anyone | the shop owes and is 4 credit periods late (`NotInDefault`) | inside the contract only: deposit first (full recourse), then the buffer pays the lenders what it can; the rest is the lenders' shared loss. The shop's limit goes to $0 [`default_is_covered_by_the_buffer`, `a_default_the_buffer_cannot_cover_is_shared_by_lenders`, `set_terms_needs_the_admin_and_anyone_can_cover_a_due_default`]. |
| `offer_own_credit` | an approved distributor | approved | nothing; lets its shops use `pay_later` on its invoices. |
| `pay_later` | the shop on the invoice | its invoice, not paid, not already on pay later, distributor approved and offering it (`NotOffered`), nothing overdue | nothing. The distributor waits a credit period for its own money; no pool, no credit fee [`pay_later_once_and_never_onto_the_pool`, `pay_later_checks_shop_and_pool_lateness`]. |
| `fund_buffer` | whoever pays | amount above 0 | the payer's own tokens into the buffer. |
| `get_*`, `list_invoices*`, `invoice_count`, `is_distributor`, `is_lender`, `offers_own_credit` | nobody | reads only | nothing. |

### Where pool money can go

Tokens leave the contract in three functions, each to one fixed kind of receiver:
- `pay_with_credit`: the payout to the invoice's approved distributor and our share to the treasury. Never more than the shop's limit, never from the buffer.
- `withdraw`: to the lender that holds the shares, only from money not lent out.
- `withdraw_recourse`: a distributor's own deposit back to it, only above 20% of its vouched credit.

There is no sweep, upgrade, admin withdraw or arbitrary-call function. The admin can't move tokens itself.

- Over a full cycle (deposit, buffer, credit, part and full repay, on time and late, default, repaying a written-off debt) the contract's token balance equals `pool.available + pool.buffer` after every step, and drops only in `pay_with_credit` [`contract_balance_equals_the_pool_and_only_credit_sends_money_out`]. That test runs without lender withdrawals or vouching; those paths are checked by their own tests above.
- Fees round down, so a credit sale never pays out more than the invoice, checked for every amount from 1 to 200,000 units and near the overflow edge [`credit_split_never_pays_out_more_than_the_invoice`, `credit_never_pays_out_more_than_the_invoice_in_the_contract`].
- Full recourse (Nov 16): a vouched shop's unpaid credit is the distributor's debt (`RecourseDebt`), still counted as lent, and paid first out of every later payout to that distributor.

### Overflow

The deployed Wasm is built with `overflow-checks = true`, so an overflow traps and nothing changes. The code doesn't lean on it: fee math uses `checked_mul` and the limit check `checked_add` [`huge_amounts_overflow_nothing_and_move_nothing`].

## 2. Keys

- The demo's secret keys live server-side only: Vercel environment variables and `.env.local` on a teammate's computer. Never in a `NEXT_PUBLIC_` variable, the repo, a screenshot or a chat.
- The repo enforces it: `.gitignore` blocks `.env*` (except `.env.example`), `.stellar/` and `.soroban/`; `.claude/settings.json` stops Claude Code reading `.env*` or running `stellar keys`.
- The demo has one key per role, and new sign-ups get keys the server holds. Anyone with the server's environment can act as every role. Fine on testnet, not with real money.
- A leaked key on testnet means a rotation. The admin and treasury are fixed at deploy, so a leak of those means a redeploy (only the deploy owner runs `scripts/deploy.sh`).

## 3. Demo versus the real product

| | Demo | Real product |
|---|---|---|
| Who signs | our server, with a key per account; a sponsor pays network fees. Every shop payment still needs the owner's passkey or 6-digit PIN first (#199) | each person signs with a passkey smart wallet, fees sponsored |
| Identity | **simulated** ID check at distributor and lender sign-up (#216): DUI, date of birth, DUI photo and selfie, CNR matrícula (lenders also NIT). Formats are checked, photos never leave the phone, auto-approved after 8 seconds and labelled "(demo)" | an identity partner checks the DUI against the RNPN with a liveness selfie; an admin checks the CNR registration; payouts only to an account in the company's name |
| Distributor approval | admin approves | established distributors only, after KYB and a signed liability agreement (§5 below) |
| Money | test dollars we issue | USDC |
| Cash in and out | simulated, labelled on screen | a licensed partner; Risk #1 in `docs/context.md` §6 |
| Admin | one key | the licensed partner, ideally a multisig |

## 4. On-chain and off-chain

- **On-chain:** invoice amounts, status and due dates, payments, cash confirmations, credit, repayments, fees, pool balances, limits, vouching and recourse. Public, so **amounts are visible even without names.**
- **Off-chain:** names, phones, invoice lines, ID numbers and status, fraud reviews, door payments. No name or phone is written to the contract. The circle check keeps only yes/no per payment, never the accounts it walked through.

## 5. Fraud cases

What stops each one today, and what's left. Flags are in `lib/fraud.ts`; reviews in `/admin` (#231). A flag alerts the admin; it never blocks by itself.

| Case | What stops it | What's left |
|---|---|---|
| **Fake shops** (our biggest risk): a distributor sets up shops it controls, unlocks their credit with its own money, then they all take "pay in 7 days" and vanish. 20 shops × $100 ≈ $2,000 of lender money | (1) **Circle check** (#221): each unlock payment is traced back up to 3 steps and 14 days on Horizon; if the money came from the shop's own distributor or its drivers, it doesn't count toward unlock and the admin sees "circle_unlock". (2) **Pattern flags**: 3+ of its shops taking first credit in one week, 2+ defaulting on credit due within 2 weeks, plus the #231 rules (same phone or passkey, credit to brand-new shops, defaults above twice the average). (3) **Liability agreement** and legal action for estafa. (4) **Established distributors only.** While in review, its invoices can't use the pool | Cash breaks the trail (withdraw, a friend buys at a counter). Parts 2 to 4 cover it. Long term: count only payments from ID-checked sources (licensed cash-in points) |
| **Shop bust-out**: a real shop takes credit and leaves | Credit only after 2 digital door payments a week apart; first limit $50 to $100, growing +$10 to +$30 per on-time cycle, up to $500; no new credit while overdue; the buffer | A shop can take about $100 once and lose its supplier |
| **Limit farming** through pay later | Pay later never raises the pool limit or the trusted fee, only lowers them when late (#203) | None known |
| **Driver skimming cash** | Shop confirms the exact amount (`ClaimChanged`); driver cash totals per driver | Totals are bookkeeping; the distributor checks them at the warehouse |
| **Stolen phone** | Passkey or PIN before every payment, for that invoice and amount (#199) | — |
| **Vouching abuse**: vouch for fake shops at 0.25% | Deposit of 20% of vouched credit; full recourse makes the distributor owe the rest; no new vouching while it owes | A distributor that walks away owes a debt we collect off-chain (agreement) |
| **Dirty lender** | Only lenders approved after KYB can deposit; revoke stops new money | Withdrawals always work, by design |
| **Insider (admin)** | Admin can't move tokens | Limit 1 below |

**Policy for distributors (from #221, Yahya's OK Nov 16):**
- **Established only.** 2+ years in business, real routes and trucks, and references from manufacturers it already supplies, found through warm introductions (ADES, Distribución Dinámica). This keeps out a shell company set up only to steal, the one case legal action doesn't scare.
- **Liability agreement**, signed at approval and drafted by a Salvadoran lawyer: liable for credit drawn through shops it set up fraudulently; liable for vouched shops beyond its 20% deposit (the contract records that debt); unpaid usage fees on cash are capped (for example $250 or 30 days, whichever comes first), past which new invoices pause until it pays; and we pursue fraud legally (estafa).
- **Steps when flagged:** pause credit, ask for proof (the Hacienda DTE code or a delivery photo signed by the shop), clear or close the account (`revoke_distributor`), then legal action if serious.
- In the pilot there is no lender, so no one's money is exposed while we learn.

## 6. Testnet reset risk

The Stellar Development Foundation can wipe testnet, which deletes our contract, token and accounts. Recovery is `./scripts/setup.sh --fresh && ./scripts/deploy.sh` (deploy owner only). Contract data expires about 30 days after its last write, so check `get_pool` before any demo.

## 7. Known limits

1. **The admin is trusted.** It can't move tokens, but with `approve_distributor` and `set_terms` it could make an address it controls a distributor and give a shop it controls a large limit. For real: the licensed partner as a multisig, a cap on limits, and vetting for each distributor.
2. **Usage fees on cash are collected only from payouts or by choice.** Since #251 (live Nov 16) the next payout to the distributor pays them first, and `settle_usage` lets a cash-only distributor pay. A distributor that never takes a payout and never settles still owes them; the liability agreement caps how much can stay unpaid (policy, not code).
3. **`cash_handed_in` can't tell which distributor a driver works for.** Any approved (or revoked) distributor can lower any driver's cash total. Bookkeeping only; no tokens move.
4. **The buffer only moves in `cover_default`,** from the buffer back to the lenders. A written-off debt repaid later refills the buffer, not the lenders who took the loss.
5. **A stale cash claim stays in storage** after the invoice is paid another way. `cash_confirm` rejects it; screens ignore it.
6. **Invoice ids are global, first come first served.**
7. **Tokens sent straight to the contract** (not through `deposit`, `repay`, `deposit_recourse` or `fund_buffer`) aren't counted and can't be withdrawn.
8. **The circle check is off-chain and best effort.** It reads Horizon; if Horizon is down, the payment counts and the error is logged. It follows the 10 biggest senders per account and at most 30 accounts per check.
9. **Credit risk is real.** A shop that never repays costs the deposit (if vouched), then the buffer, then the lenders.
