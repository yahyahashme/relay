# tiendas-stellar

Neighbourhood shops (tiendas) in El Salvador pay their suppliers in cash when the truck arrives, and often borrow from loan sharks to buy stock. This app lets a shop pay its supplier digitally, or take the stock now and pay in 7 days with no interest, while a Stellar smart contract keeps the record and enforces the credit rules.

Built for the Velocity x Stellar challenge (Nov 2026) by Yahya, Jack, Rohan and Ruhaan.

## Status

Work in progress. The app runs on demo data (`npm install`, then `npm run dev`), and the contract is written and tested (`cargo test`); it goes on testnet on Wed Nov 11. The plan and every decision are in [docs/context.md](docs/context.md). Tasks are in [Issues](../../issues).

## What it will have

- **Shop screen:** pay now in digital dollars, pay in 7 days on credit, or record a cash payment.
- **Driver screen:** the day's route, invoices with QR codes, cash collected.
- **Distributor screen:** what's paid, what's owed, and which driver holds which cash.
- **One Soroban contract (`route_ledger`)** on Stellar testnet: invoices, cash records, and a lender pool for the 7-day credit.

## Risk #1: turning cash into digital dollars

Shops are paid in cash. For digital payments to work, that cash has to become digital dollars somewhere, cheaply. We haven't solved this yet. As of Nov 7, the other direction does exist: MoneyGram lets people turn USDC into cash at banks and supermarkets across El Salvador, so distributors can cash out. Getting cash in is the open problem. Our ideas so far are in section 6 of [docs/context.md](docs/context.md).

## How to run it

- You need the Stellar CLI (version 30 or newer) and Node.
- `./scripts/setup.sh` (add `--fresh` to start over) creates the demo accounts and test dollars and writes `config/testnet.json` and `.env.local`.
- Testnet is reset sometimes, so rerun it to rebuild.

Coming with the first working version (target: Nov 12). This section will list the setup steps, the testnet contract IDs and the demo accounts.

<!-- contract-ids:start -->
## Contract IDs

Stellar testnet, deployed 2026-11-10 by `scripts/deploy.sh`.

| What | ID | Explorer |
|---|---|---|
| `route_ledger` contract | `CAPQ6ZDDWDS3OE42BM5LM3M7YEQ3TJ7IJZ5ZT7A2Z3RTSI35OJKV3I23` | [stellar.expert](https://stellar.expert/explorer/testnet/contract/CAPQ6ZDDWDS3OE42BM5LM3M7YEQ3TJ7IJZ5ZT7A2Z3RTSI35OJKV3I23) |
| Test USDC token | `CANWPJKTWATAQKWD4VNDRMPHHWONWJ5IMCIJ2OTJNYFZ5IDQWX2E2NUP` | [stellar.expert](https://stellar.expert/explorer/testnet/contract/CANWPJKTWATAQKWD4VNDRMPHHWONWJ5IMCIJ2OTJNYFZ5IDQWX2E2NUP) |

Test USDC is our own, issued by `tiendas-issuer`, not Circle's.
<!-- contract-ids:end -->

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
