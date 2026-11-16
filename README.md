<h1>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/brand/relay-logo-white.svg">
    <img src="public/brand/relay-logo.svg" alt="Relay" height="56">
  </picture>
</h1>

*Del efectivo al crédito*

Neighbourhood shops (tiendas) in El Salvador buy their stock from distributors. In a four-country survey, 8 in 10 small businesses in El Salvador, Guatemala, Honduras and Mexico pay suppliers mainly in cash, and in El Salvador 6 in 10 informal small businesses have borrowed from loan sharks. This app lets a shop pay its supplier in digital dollars, or take the stock now and pay in 7 days with no interest, while a Stellar smart contract keeps the record and enforces the credit rules.

**Live app:** [relay-sv.vercel.app](https://relay-sv.vercel.app) · **Contract on Stellar testnet:** [`CCNMBJD4…HVPF` on stellar.expert](https://stellar.expert/explorer/testnet/contract/CCNMBJD4MPYBIOF66RNPFWCVUAKXVXUZGOCV7SURNT7GZPNJSI5MHVPF) (every payment and fee split is public) · Built for the Velocity x Stellar challenge (Nov 2026) by Yahya, Jack, Rohan and Ruhaan. Plan and decisions: [docs/context.md](docs/context.md).

## What's in this repo

| Folder | What it holds |
|---|---|
| `contracts/route_ledger/` | The Soroban smart contract (Rust): invoices, payments, credit, fee splits |
| `app/` | The web app (Next.js): every screen, one folder per page |
| `components/`, `lib/` | Shared screen parts and app logic. `lib/api.ts` is the one place screens get data from |
| `packages/route_ledger/` | The contract client, generated from the contract |
| `db/` | Database schema for accounts and sign-up |
| `config/testnet.json` | Contract and account addresses on testnet (public, no secrets) |
| `scripts/` | Setup, deploy and check scripts |
| `docs/` | Plan, facts, pitch material and test notes: start at [docs/README.md](docs/README.md) |

## How it works

Three screens (a website that works like a phone app): the **shop** pays an invoice, the **driver** sees the day's route, the **distributor** sees what's paid and owed. One Soroban contract, `route_ledger`, holds the invoices and the rules.

- **Pagar ahora:** the shop pays in digital dollars (USDC on Stellar) through our contract, straight to the distributor.
- **Cash in two taps:** the driver taps "Recibí efectivo", the shop taps "Confirmo". It's recorded on-chain as cash the driver holds for the distributor; no tokens move. A shop can pay part in cash ("Recibí otro monto") and put the rest on the lenders' 7 days (#242).
- **Pagar en 7 días:** a lender pool pays the distributor now, minus a fee the distributor pays: 1.5% when the whole invoice goes on credit, sliding down to 1.0% the more the shop paid up front (half paid first: 1.22%). Lenders always get 0.50%; the rest splits 3:1 between a safety buffer and us (0.75% / 0.25% at 1.5%). The shop repays within 7 days, with no interest.
- **Credit record:** a new shop unlocks credit after 2 deliveries paid digitally at the door, a week apart (#217); the first limit is half its average delivery, $50 to $100 ($100 at once if its distributor vouches for it). The limit ("Crédito Relay", out of 500) grows by tier on each on-time repayment of pool credit: up to $30 +10, to $50 +15, to $75 +20, to $100 +25, over $100 +30, at most once a week, from $10 (#220). Distributors also see a 1-10 rating of how likely the shop is to repay in 7 days. Lateness is graded by days past due: 1 day is a grace day, 2-7 days late lowers the limit $25, 8+ days lowers it $50 and stops raises for 4 weeks, and about 4 weeks late is a default. The record keeps on-time and late counts by band, the most days late, and the date of first credit.
- **Fees:** distributors pay a 0.1% usage fee on digital and cash payments (for cash it's recorded on-chain and taken from the distributor's next digital payout, #229). Shops never pay fees.
- **Network fee sponsorship:** every transaction goes out inside a fee bump paid by our sponsor account (`lib/stellar/sponsor.ts`, used by `lib/stellar/send.ts`), so shops, drivers and the distributor never hold or spend XLM for fees.
- **Split payment:** "Pagar una parte, el resto en 7 días" pays part now in digital dollars and puts the rest on 7 days in one confirm (#235).
- **Credit is repaid only in digital dollars** (#241): pool credit always was, and an invoice on the distributor's own 7 days can no longer be paid in cash (the app and, since the Nov 16 redeploy, the contract refuse it).
- **Who carries the 7 days:** per shop, the distributor picks the lender pool, the pool with the distributor vouching ("Respaldar esta tienda": 0.25% per credit sale, backed by a deposit of at least 20% of what vouched shops owe; if a vouched shop defaults, the distributor owes all of it, deposit first, then from its next payouts), or its own money ("Dar yo los 7 días": no credit fee, only the 0.1% usage fee). "Buscar en Relay" → "Agregar y respaldar" vouches for any shop on Relay, including a brand-new account (#228).
- **Lenders:** only lenders approved after a business check can deposit. Pool money sits in the contract, not in a wallet; each lender owns shares, so every credit sale and every earning splits in proportion to what it put in, and money that isn't lent can always come out. `/prestamista` shows the history.
- **Fraud checks:** Relay checks every distributor's invoices for signs of fake shops and other odd patterns. A flagged account loses pool credit while the admin asks for proof (a DTE code or a delivery photo), then clears it or closes the account (#232).
- **Simulated ID check:** distributor and lender sign-up asks for the legal representative's DUI, a selfie and the company registration; the demo only checks the formats (#216).

**What's live and what's planned** [docs/context.md §7.8](docs/context.md#78-whats-live-and-whats-planned-nov-16). Every contract change is deployed (the last redeploy, #234, closed Nov 16).

**Demo vs real product:** in the demo the server signs for each role with test keys. The real product uses passkey smart wallets on the users' phones, and a licensed partner does KYC on shop owners and KYB on distributors.

<!-- contract-ids:start -->
## Contract IDs

Stellar testnet, deployed 2026-11-16 by `scripts/deploy.sh`.

| What | ID | Explorer |
|---|---|---|
| `route_ledger` contract | `CCNMBJD4MPYBIOF66RNPFWCVUAKXVXUZGOCV7SURNT7GZPNJSI5MHVPF` | [stellar.expert](https://stellar.expert/explorer/testnet/contract/CCNMBJD4MPYBIOF66RNPFWCVUAKXVXUZGOCV7SURNT7GZPNJSI5MHVPF) |
| Test USDC token | `CANWPJKTWATAQKWD4VNDRMPHHWONWJ5IMCIJ2OTJNYFZ5IDQWX2E2NUP` | [stellar.expert](https://stellar.expert/explorer/testnet/contract/CANWPJKTWATAQKWD4VNDRMPHHWONWJ5IMCIJ2OTJNYFZ5IDQWX2E2NUP) |

Test USDC is our own, issued by `tiendas-issuer`, not Circle's.
<!-- contract-ids:end -->

## Demo accounts

Public keys only (from `config/testnet.json`, which is the source of truth after a redeploy).

| Role | Name | Public key |
|---|---|---|
| Admin | — | `GDD7KGT5UZNODMB26M6TRUQIOG3UMCXYYL52KQF7ESYS5DZ45LFDL3T3` |
| Lender (pool) | — | `GC24T2YOYPHSZ2BW42CFFMJVELOR3VBWXPCG2NCG257AHUDLSBQZFQRL` |
| Distributor | Distribuidora El Sol | `GBGNJTX64HA3NOMNCNLHUEBTYFRL2CVXKI3V3QFOVUGXC6OTSRUVJYDS` |
| Driver | Carlos | `GDUH4WF52CDM3G6M57B65IHDEF73CCXFZUSRLEFTB632GEJTTJO5T6WZ` |
| Driver | Ana | `GDBJ6GSKBXKCG2UY7EAHMRI32EVE2IPTNA2OI5JOVNOHNPUJTQLEQBRL` |
| Shop | Tienda Rosa | `GD2HWNZT4DQ4FXKKJ6FUXL4B5XWLSAJTRX2EGPQL5U3Q2VINRL4LRSOA` |
| Shop | Tienda Don Luis | `GDX3MHGPTGKZ4MQCMGMSRXVFCNQF2C4KNXG37D24JAUJQIA7V4BKGAU7` |
| Shop | Mini Súper La Esquina | `GDBFDE5UJXZKZNL7ZXHKPTNYIL4SFWWIT3CAHGDY7VHC32IBL45JVLZS` |

The test USDC is our own asset, issued by `tiendas-issuer` on testnet. It is not Circle's USDC.

## Accounts

Anyone can sign up at `/registro` (shop or distributor; drivers join by their distributor's invite) and sign in at `/entrar`.

- **Database:** Neon Postgres through the Vercel integration (`DATABASE_URL`). Tables in `db/schema.sql`. `npm run db:setup` creates them and adds the demo accounts above as seed rows. It's safe to run again.
- **Passwords:** salted scrypt. **Sessions:** a random id in an httpOnly cookie signed with `SESSION_SECRET`, stored in the database so signing out ends it.
- **A Stellar account per user:** made at sign-up. A new key, funded by friendbot, with the test-USDC trustline (the sponsor pays the fee). The secret key is stored encrypted with AES-256-GCM under `WALLET_KEY` and never leaves the server. This is testnet-only custody for the demo; the real product uses passkey wallets on the user's phone.
- **Who is who:** shops, drivers and distributors come from the database (`lib/server/directory.ts`), falling back to `config/testnet.json` when there is none, so the app still runs with demo data and no database.

## Risk #1: turning cash into digital dollars

We think shops are mostly paid in cash. For digital payments to work, that cash has to become digital dollars somewhere, cheaply. Cash-out already has an answer: MoneyGram lists cash-out points in El Salvador, such as banks and supermarkets. For cash-in, Ruhaan found three routes a shop could use today to turn cash into USDC on Stellar in its own wallet. Using published fees on $50:

| Route | Cost on $50 |
|---|---|
| A Chivo cash machine, then a swap in the LOBSTR Stellar wallet | about $1.25 |
| A Western Union counter, then Airtm | about $5.42 |
| An Athena machine, then the LOBSTR swap | about $11.47 |

These numbers come from published fees, not live quotes, and none of the routes has been field-tested yet. Sources: [docs/facts.md](docs/facts.md) entries 66 to 68. Full notes: section 6 of [docs/context.md](docs/context.md).

**Our plan:**
- Field-test the Chivo → LOBSTR route first. Keep the Western Union/Airtm counter route as the backup.
- One weekly cash-in of only what is owed, with no deposit at sign-up. Credit is repaid only in digital dollars.
- Long term, partner with a licensed bank or cash-in company in El Salvador that credits digital dollars straight from a cash deposit, so shops don't have to go through bitcoin or a peer trade.

The demo uses test dollars, with cash-in simulated and labelled on screen.

## Run it locally

**Just to look around:** `npm install`, then `npm run dev` and open http://localhost:3000. With no `.env.local` the app runs on demo data: no keys, no Stellar CLI, nothing on testnet.

**With the real contract** you need Node, the Stellar CLI (version 30 or newer) and Rust (https://rustup.rs, for the contract build and `cargo test`).

1. `npm install`
2. `./scripts/setup.sh` creates the demo accounts and test dollars and writes `config/testnet.json` and `.env.local` (add `--fresh` to start over; testnet is reset sometimes).
3. `./scripts/deploy.sh` deploys the contract, credit terms, pool money and demo invoices. In your own clone this overwrites `config/testnet.json` with your own accounts and contract, which is fine. Teammates: don't run `deploy.sh` on the shared setup; Yahya owns the shared deploy.
4. Check `.env.local`: nine `STELLAR_SECRET_...` lines, and `NEXT_PUBLIC_USE_MOCKS=false` to use the contract (`true` = demo data only, no keys needed).
5. `npm run dev` and open http://localhost:3000.

Tests: `cargo test` (contract) and `npm test` (app). After a contract change, `./scripts/bindings.sh` regenerates the app's contract client.

## Test a payment on Stellar testnet

1. Open the [distributor dashboard](https://relay-sv.vercel.app/distribuidor) in one tab and the [shop demo](https://relay-sv.vercel.app/demo) in another. The shop demo creates a new testnet invoice. Note the invoice number shown on the shop screen.
2. Tap **Pagar ahora** and pay the full balance using the demo's test dollars. The app asks the shop to confirm with Face ID or a fingerprint, or to create a 6-digit PIN and enter it again (#201). Then the shop screen should show **Pago recibido**.
3. Tap **Ver detalles** on the receipt. In Stellar Expert, check that the transaction is on **Testnet** and succeeded. The Route Ledger contract is linked in the contract table above.
4. Return to the dashboard and find the same invoice number. After the dashboard refreshes, the invoice should be marked **Pagada**.

See the [shop payment](docs/pitch/trifold/img/shop-pay.png), [shop credit](docs/pitch/trifold/img/shop-credit.png), and [driver cash](docs/pitch/trifold/img/driver-cash.png) screenshots, the [architecture diagram](docs/img/architecture.png), the [security review](docs/product/security.md), and the [research log](docs/research.md). Relay is also listed on [Devpost](https://devpost.com/software/tiendas).

## Before the showcase

Run on the laptop that ran `scripts/setup.sh` (it holds `tiendas-issuer`). Shop addresses (`G...`) are in `config/testnet.json` under `accounts.shops`.

1. Check a shop's test dollars (each starts with $500):
   `stellar token balance --id <test USDC ID from the table above> --account <shop G...> --network testnet --decimal`
2. Add $500 if it's low:
   `stellar token mint --id <test USDC ID from the table above> --to <shop G...> --amount 5000000000 --source-account tiendas-issuer --network testnet`
3. Open each shop's cuenta page (`/tienda/cuenta/tienda-1`, `-2`, `-3`) and tap "Pagar deuda" so credit is available again.
4. The trifold QR (`public/qr-demo.png`) opens `/demo`, which makes a new invoice for the judge and opens it. Put `/distribuidor` on the laptop screen. No Wi-Fi: use a phone hotspot. Last resort: the demo video.

## Never commit secret keys

Stellar secret keys start with `S`. They go in `.env.local` on your computer and in Vercel's settings, never in this repo.
