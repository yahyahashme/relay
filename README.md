# tiendas-stellar

Neighbourhood shops (tiendas) in El Salvador pay their suppliers in cash when the truck arrives, and often borrow from loan sharks to buy stock. This app lets a shop pay its supplier digitally, or take the stock now and pay in 7 days with no interest, while a Stellar smart contract keeps the record and enforces the credit rules.

Built for the Velocity x Stellar challenge (Nov 2026) by Yahya, Jack, Rohan and Ruhaan.

## Status

Work in progress. Nothing runs yet. The plan and every decision are in [docs/context.md](docs/context.md). Tasks are in [Issues](../../issues).

## What it will have

- **Shop screen:** pay now in digital dollars, pay in 7 days on credit, or record a cash payment.
- **Driver screen:** the day's route, invoices with QR codes, cash collected.
- **Distributor screen:** what's paid, what's owed, and which driver holds which cash.
- **One Soroban contract (`route_ledger`)** on Stellar testnet: invoices, cash records, and a lender pool for the 7-day credit.

## Risk #1: turning cash into digital dollars

Shops are paid in cash. For digital payments to work, that cash has to become digital dollars somewhere, cheaply. We haven't solved this yet. As of Nov 7, the MoneyGram cash-in points we found on Stellar are all in central San Salvador, and none offer cash-out, so our first pilot route stays near them and shops cash in once a week only what they owe. Our ideas so far are in section 6 of [docs/context.md](docs/context.md).

## How to run it

Coming with the first working version (target: Nov 12). This section will list the setup steps, the testnet contract IDs and the demo accounts.

## Never commit secret keys

Stellar secret keys start with `S`. They go in `.env.local` on your computer and in Vercel's settings, never in this repo.
