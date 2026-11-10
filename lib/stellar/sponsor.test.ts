import {
  Account,
  Asset,
  BASE_FEE,
  FeeBumpTransaction,
  Keypair,
  Networks,
  Operation,
  Transaction,
  TransactionBuilder,
  rpc,
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

// A payment from the shop, already signed by the shop, like the app sends it.
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

// What the RPC returns when the network rejects a transaction: only the part
// of the result XDR that sponsor.ts reads.
const txResult = (code: string) => ({
  result: () => ({ switch: () => ({ name: code }) }),
});

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
      sendTransaction("ERROR", { errorResult: txResult("txBadSeq") }),
    );
    const get = vi.spyOn(rpc.Server.prototype, "getTransaction");

    const out = await run(signedInner());

    expect(out).toMatchObject({ error: { message: expect.stringContaining("txBadSeq") } });
    expect(get).not.toHaveBeenCalled();
  });

  it("throws with the result code when the transaction fails in a ledger", async () => {
    vi.spyOn(rpc.Server.prototype, "sendTransaction").mockResolvedValue(
      sendTransaction("PENDING"),
    );
    vi.spyOn(rpc.Server.prototype, "getTransaction").mockResolvedValue(
      getTransaction("FAILED", { resultXdr: txResult("txFailed") }),
    );

    const out = await run(signedInner());

    expect(out).toMatchObject({
      error: { message: expect.stringMatching(/txFailed.*abc123|abc123.*txFailed/) },
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
