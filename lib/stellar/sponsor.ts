import "server-only";
import {
  BASE_FEE,
  Keypair,
  Transaction,
  TransactionBuilder,
  rpc,
} from "@stellar/stellar-sdk";
import config from "../../config/testnet.json";

// Fee sponsorship: the shop signs its transaction, we wrap it in a fee bump
// signed by our sponsor account, so the sponsor pays the network fee and the
// shop never spends XLM (docs/context.md section 8.3).

const POLL_TRIES = 30; // about 30 seconds in all
const WAIT_MS = 1000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Switchable = { switch(): { name: string } };

// The name of a Stellar result code, e.g. "txBadSeq". Never throws.
function codeName(value: unknown): string {
  try {
    return (value as Switchable).switch().name;
  } catch {
    return "unknown";
  }
}

// Describes why the network said no, e.g. "txFailed (paymentUnderfunded)" or
// "txFeeBumpInnerFailed (txBadSeq)". Never throws: the error you read in the
// logs must not be replaced by an error from reading the error.
function describeResult(txResult: unknown): string {
  try {
    const result = (txResult as { result(): unknown }).result();
    const code = codeName(result);
    if (code === "txFeeBumpInnerFailed") {
      const inner = (
        result as {
          innerResultPair(): { result(): { result(): unknown } };
        }
      )
        .innerResultPair()
        .result()
        .result();
      return `${code} (${describeOperations(inner) ?? codeName(inner)})`;
    }
    const operations = describeOperations(result);
    return operations ? `${code} (${operations})` : code;
  } catch {
    return "unknown";
  }
}

// For a transaction that failed in its operations: the first operation's
// result, e.g. "paymentUnderfunded". Undefined when there is none.
function describeOperations(result: unknown): string | undefined {
  try {
    const first = (result as { results(): unknown[] }).results()[0];
    const inner = (first as { tr(): { value(): unknown } }).tr().value();
    return codeName(inner);
  } catch {
    return undefined;
  }
}

/**
 * Wraps a transaction the shop already signed in a fee bump paid by the
 * sponsor, sends it and waits until it is in a ledger.
 * Returns the hash of the fee-bump transaction (the one stellar.expert shows).
 */
export async function sendSponsored(
  signedInner: Transaction,
): Promise<{ hash: string }> {
  const secret = process.env.STELLAR_SECRET_SPONSOR;
  if (!secret) throw new Error("STELLAR_SECRET_SPONSOR is not set");
  const sponsor = Keypair.fromSecret(secret);

  // baseFee is the fee per operation, not the inner transaction's total: the
  // SDK adds the inner resource fee (contract calls) on its own.
  const feeBump = TransactionBuilder.buildFeeBumpTransaction(
    sponsor,
    BASE_FEE,
    signedInner,
    config.networkPassphrase,
  );
  feeBump.sign(sponsor);

  const server = new rpc.Server(config.rpcUrl);

  let hash = "";
  for (let attempt = 1; ; attempt++) {
    const sent = await server.sendTransaction(feeBump);
    if (sent.status === "ERROR") {
      throw new Error(
        `Sponsored payment rejected: ${describeResult(sent.errorResult)}`,
      );
    }
    if (sent.status !== "TRY_AGAIN_LATER") {
      hash = sent.hash; // PENDING, or DUPLICATE (already sent: just wait for it)
      break;
    }
    if (attempt >= POLL_TRIES) {
      throw new Error("Sponsored payment not accepted: network is busy");
    }
    await sleep(WAIT_MS);
  }

  for (let attempt = 1; attempt <= POLL_TRIES; attempt++) {
    const got = await server.getTransaction(hash);
    if (got.status === rpc.Api.GetTransactionStatus.SUCCESS) return { hash };
    if (got.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error(
        `Sponsored payment failed (${hash}): ${describeResult(got.resultXdr)}`,
      );
    }
    await sleep(WAIT_MS); // NOT_FOUND: not in a ledger yet
  }
  throw new Error(`Sponsored payment not confirmed in time (${hash})`);
}
