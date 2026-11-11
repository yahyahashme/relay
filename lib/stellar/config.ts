import "server-only";

import testnet from "../../config/testnet.json";

/** Network, contract IDs, public addresses and display names. No secrets here. */
export const config = testnet;

export type Role =
  | "admin"
  | "sponsor"
  | "lender"
  | "distributor"
  | "motorista-1"
  | "motorista-2"
  | "tienda-1"
  | "tienda-2"
  | "tienda-3";

export const SHOP_IDS = Object.keys(testnet.accounts.shops) as Role[];
export const DRIVER_IDS = Object.keys(testnet.accounts.drivers) as Role[];

/** Owner names aren't on chain or in config. Same people as lib/mock.ts. */
export const OWNERS: Record<string, string> = {
  "tienda-1": "Rosa Martínez",
  "tienda-2": "Luis Hernández",
  "tienda-3": "Marta López",
};

/** Public address of a role, or undefined if config doesn't have it. */
export function addressOf(role: string): string | undefined {
  const { accounts } = testnet;
  const shops: Record<string, string> = accounts.shops;
  const drivers: Record<string, string> = accounts.drivers;
  const others: Record<string, string> = {
    admin: accounts.admin,
    sponsor: accounts.sponsor,
    lender: accounts.lender,
    distributor: accounts.distributor,
  };
  return shops[role] ?? drivers[role] ?? others[role];
}

const ROLE_BY_ADDRESS = new Map<string, string>(
  [...SHOP_IDS, ...DRIVER_IDS, "admin", "sponsor", "lender", "distributor"].map((r) => [addressOf(r) as string, r]),
);

/** G... address -> "tienda-1" / "motorista-1". Unknown addresses come back as they are. */
export function roleOf(address: string): string {
  return ROLE_BY_ADDRESS.get(address) ?? address;
}

export const nameOf = (role: string): string => (testnet.names as Record<string, string>)[role] ?? role;

export const explorerTx = (hash: string) => `${testnet.explorer}/tx/${hash}`;
