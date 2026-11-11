import "server-only";

import { basicNodeSigner } from "@stellar/stellar-sdk/contract";
import { Client } from "@/packages/route_ledger/src/index";
import { addressOf, config, type Role } from "./config";
import { keypairFor } from "./keys";

const base = () => ({
  contractId: config.contracts.routeLedger,
  rpcUrl: config.rpcUrl,
  networkPassphrase: config.networkPassphrase,
});

let reader: Client | undefined;

/** For reads: simulate only, never sign. Any funded account works as the source. */
export function readClient(): Client {
  return (reader ??= new Client({ ...base(), publicKey: config.accounts.admin }));
}

const signers = new Map<Role, Client>();

/** For writes: builds, simulates and signs as `role`. */
export function clientFor(role: Role): Client {
  let client = signers.get(role);
  if (!client) {
    const keypair = keypairFor(role);
    client = new Client({
      ...base(),
      publicKey: addressOf(role) ?? keypair.publicKey(),
      ...basicNodeSigner(keypair, config.networkPassphrase),
    });
    signers.set(role, client);
  }
  return client;
}
