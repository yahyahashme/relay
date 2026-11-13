import {
  Account,
  Asset,
  BASE_FEE,
  Contract,
  FeeBumpTransaction,
  Keypair,
  Networks,
  Operation,
  SorobanDataBuilder,
  StrKey,
  Transaction,
  TransactionBuilder,
  rpc,
  xdr,
} from "@stellar/stellar-sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// "server-only" throws outside the Next.js server; the config is #15's file.
vi.mock("server-only", () => ({}));
vi.mock("../../config/testnet.json", () => ({
  default: {
    rpcUrl: "https://rpc.test.invalid",
    networkPassphrase: Networks.TESTNET,
  },
}));

import { sendSponsored } from "./sponsor";

const sponsor = Keypair.random();
const shop = Keypair.random();

// A payment from the shop, already signed by the shop.
function signedInner(): Transaction {
  const tx = new TransactionBuilder(new Account(shop.publicKey(), "100"), {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.payment({
        destination: Keypair.random().publicKey(),
        asset: new Asset("USDC", Keypair.random().publicKey()),
        amount: "0.01",
      }),
    )
    .setTimeout(60)
    .build();
  tx.sign(shop);
  return tx;
}

// A contract call from the shop, signed, like the app sends it: it carries soroban
// data, and the builder adds that resource fee to the fee. (On testnet a simulated
// get_pool came to 6,677 stroops: 100 plus 6,577.)
const RESOURCE_FEE = 6577;
function signedContractCall(): Transaction {
  const tx = new TransactionBuilder(new Account(shop.publicKey(), "100"), {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
    sorobanData: new SorobanDataBuilder().setResourceFee(RESOURCE_FEE).build(),
  })
    .addOperation(new Contract(StrKey.encodeContract(Buffer.alloc(32, 7))).call("get_pool"))
    .setTimeout(60)
    .build();
  tx.sign(shop);
  return tx;
}

// Real result XDR, hand-encoded and parsed by the SDK, so these tests see the
// same object shape the RPC gives us (a fake with the old result().switch()
// methods passed while the real thing did not).
const FEE = "0000000000000064"; // feeCharged 100
const EXT = "00000000";
const parseResult = (...parts: string[]) =>
  xdr.TransactionResult.fromXDR(Buffer.from(parts.join(""), "hex"));

// txBAD_SEQ
const badSeq = () => parseResult(FEE, "fffffffb", EXT);
// txFAILED: one payment operation, PAYMENT_UNDERFUNDED
const failedUnderfunded = () =>
  parseResult(FEE, "ffffffff", "00000001", "00000000", "00000001", "fffffffe", EXT);
// txFEE_BUMP_INNER_FAILED: the inner transaction was txBAD_SEQ
const innerBadSeq = () =>
  parseResult("00000000000000c8", "fffffff3", "00".repeat(32), FEE, "fffffffb", EXT, EXT);

const sendTransaction = (status: string, extra: object = {}) =>
  ({ status, hash: "abc123", ...extra }) as rpc.Api.SendTransactionResponse;

const getTransaction = (status: string, extra: object = {}) =>
  ({ status, txHash: "abc123", ...extra }) as rpc.Api.GetTransactionResponse;

describe("sendSponsored", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    process.env.STELLAR_SECRET_SPONSOR = sponsor.secret();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    delete process.env.STELLAR_SECRET_SPONSOR;
  });

  // Runs sendSponsored to the end, moving the fake clock past its waits.
  async function run(inner: Transaction) {
    const result = sendSponsored(inner).then(
      (value) => ({ value }),
      (error: Error) => ({ error }),
    );
    await vi.runAllTimersAsync();
    return result;
  }

  it("sends the shop's payment inside a fee bump paid and signed by the sponsor", async () => {
    const inner = signedInner();
    const send = vi
      .spyOn(rpc.Server.prototype, "sendTransaction")
      .mockResolvedValue(sendTransaction("PENDING"));
    vi.spyOn(rpc.Server.prototype, "getTransaction").mockResolvedValue(
      getTransaction("SUCCESS"),
    );

    const out = await run(inner);

    expect(out).toEqual({ value: { hash: "abc123" } });
    const sent = send.mock.calls[0][0] as FeeBumpTransaction;
    expect(sent).toBeInstanceOf(FeeBumpTransaction);
    expect(sent.feeSource).toBe(sponsor.publicKey());
    expect(sent.innerTransaction.hash()).toEqual(inner.hash());
    // The fee is the sponsor's: BASE_FEE for the one payment plus one for the bump.
    expect(sent.fee).toBe(String(Number(BASE_FEE) * 2));
    // The sponsor signed the bump, and the shop's own signature is untouched.
    expect(sent.signatures).toHaveLength(1);
    expect(sponsor.verify(sent.hash(), sent.signatures[0].signature)).toBe(true);
    expect(sent.innerTransaction.signatures).toHaveLength(1);
    expect(shop.verify(inner.hash(), inner.signatures[0].signature)).toBe(true);
  });

  it("sponsors a contract call: the bump covers its resource fee at the plain BASE_FEE bid", async () => {
    const inner = signedContractCall();
    const send = vi
      .spyOn(rpc.Server.prototype, "sendTransaction")
      .mockResolvedValue(sendTransaction("PENDING"));
    vi.spyOn(rpc.Server.prototype, "getTransaction").mockResolvedValue(
      getTransaction("SUCCESS"),
    );

    expect(await run(inner)).toEqual({ value: { hash: "abc123" } });
    const sent = send.mock.calls[0][0] as FeeBumpTransaction;
    expect(sent.innerTransaction.fee).toBe(String(Number(BASE_FEE) + RESOURCE_FEE));
    // BASE_FEE for the one operation plus one for the bump, plus the inner
    // resource fee: the same shape as the real testnet run (6,677 inner, 6,777 outer).
    expect(sent.fee).toBe(String(Number(BASE_FEE) * 2 + RESOURCE_FEE));
  });

  it("waits for the transaction to reach a ledger", async () => {
    vi.spyOn(rpc.Server.prototype, "sendTransaction").mockResolvedValue(
      sendTransaction("PENDING"),
    );
    const get = vi
      .spyOn(rpc.Server.prototype, "getTransaction")
      .mockResolvedValueOnce(getTransaction("NOT_FOUND"))
      .mockResolvedValueOnce(getTransaction("NOT_FOUND"))
      .mockResolvedValueOnce(getTransaction("SUCCESS"));

    expect(await run(signedInner())).toEqual({ value: { hash: "abc123" } });
    expect(get).toHaveBeenCalledTimes(3);
  });

  it("sends again after TRY_AGAIN_LATER", async () => {
    const send = vi
      .spyOn(rpc.Server.prototype, "sendTransaction")
      .mockResolvedValueOnce(sendTransaction("TRY_AGAIN_LATER"))
      .mockResolvedValueOnce(sendTransaction("PENDING"));
    vi.spyOn(rpc.Server.prototype, "getTransaction").mockResolvedValue(
      getTransaction("SUCCESS"),
    );

    expect(await run(signedInner())).toEqual({ value: { hash: "abc123" } });
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("stops asking when the network stays busy", async () => {
    const send = vi
      .spyOn(rpc.Server.prototype, "sendTransaction")
      .mockResolvedValue(sendTransaction("TRY_AGAIN_LATER"));

    const out = await run(signedInner());

    expect(out).toMatchObject({ error: { message: expect.stringContaining("busy") } });
    expect(send.mock.calls.length).toBeLessThan(50);
  });

  it("throws with the result code when the network rejects it", async () => {
    vi.spyOn(rpc.Server.prototype, "sendTransaction").mockResolvedValue(
      sendTransaction("ERROR", { errorResult: badSeq() }),
    );
    const get = vi.spyOn(rpc.Server.prototype, "getTransaction");

    const out = await run(signedInner());

    expect(out).toMatchObject({
      error: { message: "Sponsored payment rejected: txBadSeq" },
    });
    expect(get).not.toHaveBeenCalled();
  });

  it("names the inner failure when the fee bump wraps a failed transaction", async () => {
    vi.spyOn(rpc.Server.prototype, "sendTransaction").mockResolvedValue(
      sendTransaction("ERROR", { errorResult: innerBadSeq() }),
    );

    const out = await run(signedInner());

    expect(out).toMatchObject({
      error: {
        message: "Sponsored payment rejected: txFeeBumpInnerFailed (txBadSeq)",
      },
    });
  });

  it("throws with the result code when the transaction fails in a ledger", async () => {
    vi.spyOn(rpc.Server.prototype, "sendTransaction").mockResolvedValue(
      sendTransaction("PENDING"),
    );
    vi.spyOn(rpc.Server.prototype, "getTransaction").mockResolvedValue(
      getTransaction("FAILED", { resultXdr: failedUnderfunded() }),
    );

    const out = await run(signedInner());

    expect(out).toMatchObject({
      error: {
        message: "Sponsored payment failed (abc123): txFailed (paymentUnderfunded)",
      },
    });
  });

  it("gives up if the transaction never shows up", async () => {
    vi.spyOn(rpc.Server.prototype, "sendTransaction").mockResolvedValue(
      sendTransaction("PENDING"),
    );
    const get = vi
      .spyOn(rpc.Server.prototype, "getTransaction")
      .mockResolvedValue(getTransaction("NOT_FOUND"));

    const out = await run(signedInner());

    expect(out).toMatchObject({ error: { message: expect.stringContaining("abc123") } });
    expect(get.mock.calls.length).toBeLessThan(50);
  });

  it("needs the sponsor key, and never prints it", async () => {
    delete process.env.STELLAR_SECRET_SPONSOR;
    const out = await run(signedInner());
    expect(out).toMatchObject({
      error: { message: "STELLAR_SECRET_SPONSOR is not set" },
    });
  });
});
