import {
  Account,
  BASE_FEE,
  FeeBumpTransaction,
  Keypair,
  Networks,
  Operation,
  Transaction,
  TransactionBuilder,
  rpc,
  xdr,
} from "@stellar/stellar-sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// submitSigned is the one place the app sends a transaction (#33): with the
// sponsor key it sends a fee bump, and it turns the "another server instance
// used this sequence number" answers into a retry (BadSequence) for run().
vi.mock("server-only", () => ({}));
vi.mock("./client", () => ({ clientFor: () => ({}) }));

const { submitSigned } = await import("./send");

const shop = Keypair.random();
const sponsor = Keypair.random();
const BAD_SEQUENCE = "Sequence number already used (another call from the same account won)";

function signed(): Transaction {
  const tx = new TransactionBuilder(new Account(shop.publicKey(), "100"), {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.bumpSequence({ bumpTo: "0" }))
    .setTimeout(60)
    .build();
  tx.sign(shop);
  return tx;
}

// Real result XDR parsed by the SDK, the same shape the RPC gives us.
const FEE = "0000000000000064";
const EXT = "00000000";
const parse = (...parts: string[]) => xdr.TransactionResult.fromXDR(Buffer.from(parts.join(""), "hex"));
const badSeq = () => parse(FEE, "fffffffb", EXT); // txBAD_SEQ
const insufficientFee = () => parse(FEE, "fffffff7", EXT); // txINSUFFICIENT_FEE
const innerBadSeq = () => parse("00000000000000c8", "fffffff3", "00".repeat(32), FEE, "fffffffb", EXT, EXT);

const rejected = (errorResult: unknown) =>
  ({ status: "ERROR", hash: "h", errorResult }) as unknown as rpc.Api.SendTransactionResponse;

function mockSend(response: rpc.Api.SendTransactionResponse) {
  return vi.spyOn(rpc.Server.prototype, "sendTransaction").mockResolvedValue(response);
}

describe("submitSigned", () => {
  beforeEach(() => {
    process.env.STELLAR_SECRET_SPONSOR = sponsor.secret();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.STELLAR_SECRET_SPONSOR;
  });

  it("sends a fee bump paid by the sponsor, and returns once the ledger has it", async () => {
    const send = mockSend({ status: "PENDING", hash: "bump" } as rpc.Api.SendTransactionResponse);
    vi.spyOn(rpc.Server.prototype, "getTransaction").mockResolvedValue({
      status: rpc.Api.GetTransactionStatus.SUCCESS,
    } as rpc.Api.GetTransactionResponse);

    await expect(submitSigned(signed())).resolves.toEqual({ hash: "bump" });
    const sent = send.mock.calls[0][0];
    expect(sent).toBeInstanceOf(FeeBumpTransaction);
    expect((sent as FeeBumpTransaction).feeSource).toBe(sponsor.publicKey());
  });

  it("sends the signer's own transaction when there is no sponsor key", async () => {
    delete process.env.STELLAR_SECRET_SPONSOR;
    const send = mockSend(rejected(badSeq()));
    await expect(submitSigned(signed())).rejects.toThrow(BAD_SEQUENCE);
    expect(send.mock.calls[0][0]).toBeInstanceOf(Transaction);
  });

  it("retries when the fee bump's inner transaction used a taken sequence number", async () => {
    mockSend(rejected(innerBadSeq()));
    await expect(submitSigned(signed())).rejects.toThrow(BAD_SEQUENCE);
  });

  it("retries on txInsufficientFee for a fee bump: another instance's transaction with that number is pending", async () => {
    mockSend(rejected(insufficientFee()));
    await expect(submitSigned(signed())).rejects.toThrow(BAD_SEQUENCE);
  });

  it("does not retry txInsufficientFee on an unsponsored transaction, and names the code", async () => {
    delete process.env.STELLAR_SECRET_SPONSOR;
    mockSend(rejected(insufficientFee()));
    await expect(submitSigned(signed())).rejects.toThrow("sendTransaction failed: txInsufficientFee");
  });
});
