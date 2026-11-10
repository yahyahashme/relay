// One-off check for fee sponsorship (#33): sends one 0.01 test USDC payment from
// tienda-1 to the treasury, with our sponsor paying the network fee.
//
//   npx tsx --conditions=react-server scripts/sponsor-check.ts
//
// (--conditions=react-server lets `import "server-only"` load outside Next.js.)
// Needs `./scripts/setup.sh` to have run: it writes .env.local and config/testnet.json.
// It never prints a secret key.
import {
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import config from "../config/testnet.json";
import { sendSponsored } from "../lib/stellar/sponsor";

try {
  process.loadEnvFile(".env.local");
} catch {
  console.error(".env.local is missing. Run ./scripts/setup.sh first.");
  process.exit(1);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function xlmBalance(horizon: Horizon.Server, address: string) {
  const account = await horizon.loadAccount(address);
  return account.balances.find((b) => b.asset_type === "native")?.balance;
}

async function main() {
  const shopSecret = process.env.STELLAR_SECRET_TIENDA_1;
  if (!shopSecret) throw new Error("STELLAR_SECRET_TIENDA_1 is not set in .env.local");
  const shop = Keypair.fromSecret(shopSecret);
  const shopAddress = config.accounts.shops["tienda-1"];
  if (shop.publicKey() !== shopAddress) {
    throw new Error(
      "STELLAR_SECRET_TIENDA_1 does not belong to tienda-1 in config/testnet.json. Run ./scripts/setup.sh again.",
    );
  }

  const horizon = new Horizon.Server(config.horizonUrl);
  const account = await horizon.loadAccount(shopAddress);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(
      Operation.payment({
        destination: config.accounts.treasury,
        asset: new Asset(config.token.code, config.token.issuer),
        amount: "0.01",
      }),
    )
    .setTimeout(60)
    .build();
  tx.sign(shop);

  const before = await xlmBalance(horizon, shopAddress);
  console.log(`tienda-1 XLM before: ${before}`);

  console.log("Sending 0.01 USDC from tienda-1 to the treasury, fee paid by the sponsor...");
  const { hash } = await sendSponsored(tx);

  // Horizon can take a few seconds to catch up with the RPC.
  let feeAccount: string | undefined;
  for (let tries = 0; tries < 10 && !feeAccount; tries++) {
    try {
      feeAccount = (await horizon.transactions().transaction(hash).call()).fee_account;
    } catch {
      await sleep(1000);
    }
  }
  const after = await xlmBalance(horizon, shopAddress);
  console.log(`tienda-1 XLM after:  ${after}`);
  console.log(`https://stellar.expert/explorer/testnet/tx/${hash}`);

  const sponsorOk = feeAccount === config.accounts.sponsor;
  const balanceOk = before === after;
  console.log(
    `Fee paid by the sponsor: ${sponsorOk ? "yes" : `NO (fee source: ${feeAccount ?? "not found yet"})`}`,
  );
  console.log(`tienda-1 XLM unchanged:  ${balanceOk ? "yes" : "NO"}`);
  if (!sponsorOk || !balanceOk) process.exit(1);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
