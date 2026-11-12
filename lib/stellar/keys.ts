import "server-only";

import { Keypair } from "@stellar/stellar-sdk";
import type { Role } from "./config";

/** "motorista-1" -> "STELLAR_SECRET_MOTORISTA_1" */
export const secretEnvName = (role: Role) => `STELLAR_SECRET_${role.toUpperCase().replace(/-/g, "_")}`;

/** The role's keypair from its server-only env var. Throws if it isn't set. */
export function keypairFor(role: Role): Keypair {
  const secret = process.env[secretEnvName(role)];
  if (!secret) throw new Error(`Missing ${secretEnvName(role)}`);
  return Keypair.fromSecret(secret);
}
