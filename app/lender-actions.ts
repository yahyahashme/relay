"use server";

// Lenders (#207): sign-up with the business's details, the /admin approvals (approve_lender and
// revoke_lender with the admin key), and the signed-in lender's own deposits and withdrawals.
// The server holds each lender's test key (testnet only), so every move is confirmed with the
// lender's passkey or PIN first, like a shop payment (#199).

import { checkIdentity, type IdentityDetails } from "@/lib/identity";
import { signUp } from "@/lib/server/accounts";
import { ensureIdentityColumns, recordIdentity } from "@/lib/server/identity";
import { mayActAs, NOT_YOURS } from "@/lib/server/authz";
import { getDb, requireDb } from "@/lib/server/db";
import { getDirectory, type Party } from "@/lib/server/directory";
import { autoApproveSeconds } from "@/lib/server/distributors";
import {
  approveLenderIfDue,
  checkLenderDetails,
  decideLender,
  ensureLenderTables,
  isDistributorBusiness,
  type Lender,
  LenderRefused,
  type LenderDetails,
  lenderForUser,
  listLendersForAdmin,
  NO_DISTRIBUTORS,
  registerLender,
  STARTING_TEST_DOLLARS,
} from "@/lib/server/lenders";
import { redeemConfirm, unitsToCents } from "@/lib/server/pay-confirm";
import { confirmOwner } from "@/lib/server/pay-owner";
import { signUpBlocked, TOO_MANY } from "@/lib/server/rate-limit";
import { currentUser, startSession } from "@/lib/server/session";
import { sendTestDollars } from "@/lib/server/wallet";
import { readClient } from "@/lib/stellar/client";
import { config, explorerTx } from "@/lib/stellar/config";
import { ContractError, FALLBACK_MESSAGE } from "@/lib/stellar/errors";
import { read, run } from "@/lib/stellar/send";
import { toDollars, toUnits } from "@/lib/stellar/units";
import type { MyLender, Receipt } from "@/lib/types";

type Reply = { ok: true } | { ok: false; message: string };

const NO_ACCOUNTS = "Las cuentas todavía no están activas en este servidor.";
const TRY_LATER = "No pudimos crear su cuenta en este momento. Intente de nuevo en un minuto.";
const ADMINS_ONLY = "Solo para administradores de Relay.";

/** approve_lender or revoke_lender, signed by the admin key on the server. */
async function lenderOnChain(stellarAddress: string, approve: boolean): Promise<void> {
  await run("admin", (client) => (approve ? client.approve_lender({ lender: stellarAddress }) : client.revoke_lender({ lender: stellarAddress })));
}

export async function signUpLenderAction(input: { name: string; contact: string; password: string; details: LenderDetails; identity: IdentityDetails }): Promise<Reply> {
  const db = getDb();
  if (!db) return { ok: false, message: NO_ACCOUNTS };
  const problem = checkLenderDetails(input.details) ?? checkIdentity(input.identity); // before anything is created
  if (problem) return { ok: false, message: problem };
  let address: string;
  try {
    if (await signUpBlocked()) return { ok: false, message: TOO_MANY };
    // Distributors never fund the pool: a signed-in distributor, or a distributor's business name, is refused.
    const signedIn = await currentUser();
    if (signedIn?.role === "distribuidora" || (await isDistributorBusiness(db, input.details.businessName))) {
      return { ok: false, message: NO_DISTRIBUTORS };
    }
    await ensureLenderTables(db); // the "prestamista" role, before the user row
    const result = await signUp({ role: "prestamista", name: input.name, contact: input.contact, password: input.password });
    if (!result.ok) return result;
    const lender = await registerLender(result.user, input.details);
    await recordIdentity(db, "lenders", lender.id, input.identity); // numbers and status only (#215)
    await startSession(result.sessionId);
    address = result.user.stellarAddress;
  } catch (error) {
    console.error("[lender] sign-up", error instanceof Error ? error.message : error);
    return { ok: false, message: TRY_LATER };
  }
  // The account exists now; if the test dollars don't arrive, the lender still gets in and sees $0.
  try {
    await sendTestDollars(address, STARTING_TEST_DOLLARS);
  } catch (error) {
    console.error("[lender] test dollars", error instanceof Error ? error.message : error);
  }
  return { ok: true };
}

/** The lender's test dollars on hand, from Horizon (its trustline balance). */
async function balanceOf(address: string): Promise<number> {
  const res = await fetch(`${config.horizonUrl}/accounts/${address}`, { cache: "no-store" });
  if (!res.ok) return 0;
  const account = (await res.json()) as { balances?: { asset_code?: string; asset_issuer?: string; balance: string }[] };
  const line = account.balances?.find((b) => b.asset_code === config.token.code && b.asset_issuer === config.token.issuer);
  return line ? Number(line.balance) : 0;
}

/** The signed-in lender, or null for anyone else (the page then shows the public demo). The demo approves when it's time. */
export async function getMyLender(): Promise<MyLender | null> {
  const user = await currentUser();
  if (!user || user.role !== "prestamista") return null;
  let lender = await lenderForUser(user.id);
  if (!lender) return null;
  try {
    lender = await approveLenderIfDue(lender, lenderOnChain);
  } catch (error) {
    if (!(error instanceof LenderRefused)) console.error("[lender] auto-approve", error instanceof Error ? error.message : error); // try again on the next poll
  }
  const [view, pool, balance] = await Promise.all([
    read(readClient().get_lender({ lender: lender.stellarAddress })),
    read(readClient().get_pool()),
    balanceOf(lender.stellarAddress).catch(() => 0),
  ]);
  const value = toDollars(view.value);
  return {
    id: lender.id,
    businessName: lender.businessName,
    status: lender.status,
    autoApprove: autoApproveSeconds() !== null,
    value,
    netDeposited: toDollars(view.net_deposited),
    canWithdraw: Math.min(value, toDollars(pool.available)),
    balance,
  };
}

/** The signed-in user's own lender as a party, or the message for the screen. */
async function myLenderParty(lenderId: string): Promise<{ lender: Lender; party: Party } | string> {
  const user = await currentUser();
  if (!user || user.role !== "prestamista") return NOT_YOURS;
  const lender = await lenderForUser(user.id);
  const party = (await getDirectory()).find(String(lenderId), "lender");
  if (!lender || !party || lender.id !== party.id || !(await mayActAs(party))) return NOT_YOURS;
  return { lender, party };
}

async function confirmed(party: Party, action: "lend" | "withdraw", confirmId: string | undefined, units: bigint): Promise<string | null> {
  const db = getDb();
  if (!db) return "No se puede confirmar pagos en este servidor.";
  return redeemConfirm(db, await confirmOwner(party, false), confirmId, { action, partyId: party.id, invoiceId: null, cents: unitsToCents(units) });
}

const fail = (message: string): Receipt => ({ ok: false, message });
function failure(error: unknown): Receipt {
  if (error instanceof ContractError) return fail(error.message);
  console.error("[lender]", error);
  return fail(FALLBACK_MESSAGE);
}

/** Poner dinero: `amount` dollars from the lender's own account into the pool. */
export async function lenderDeposit(lenderId: string, amount: number, confirmId?: string): Promise<Receipt> {
  try {
    const mine = await myLenderParty(lenderId);
    if (typeof mine === "string") return fail(mine);
    if (mine.lender.status !== "aprobado") return fail("Relay quitó su aprobación: no puede poner más dinero, pero siempre puede retirar el suyo.");
    if (!Number.isFinite(amount) || amount <= 0) return fail("Monto inválido.");
    const units = toUnits(amount);
    const problem = await confirmed(mine.party, "lend", confirmId, units);
    if (problem) return fail(problem);
    const { hash } = await run(mine.party.id, (client) => client.deposit({ lender: mine.lender.stellarAddress, amount: units }));
    return { ok: true, message: "Dinero puesto en el fondo.", txHash: hash, explorerUrl: explorerTx(hash) };
  } catch (error) {
    return failure(error);
  }
}

/**
 * Retirar: `amount` dollars, or everything with "all". The contract takes shares, so an amount
 * becomes the shares worth at least that much (never more than the lender has); "all" sends
 * exactly the lender's shares.
 */
export async function lenderWithdraw(lenderId: string, amount: number | "all", confirmId?: string): Promise<Receipt> {
  try {
    const mine = await myLenderParty(lenderId);
    if (typeof mine === "string") return fail(mine);
    const address = mine.lender.stellarAddress;
    const [view, pool] = await Promise.all([read(readClient().get_lender({ lender: address })), read(readClient().get_pool())]);
    if (view.shares <= 0n) return fail("No tiene dinero en el fondo.");
    const worth = pool.available + pool.lent;
    let shares: bigint;
    if (amount === "all") {
      shares = view.shares;
    } else {
      if (!Number.isFinite(amount) || amount <= 0) return fail("Monto inválido.");
      const units = toUnits(amount);
      if (units > view.value) return fail("Es más de lo que tiene en el fondo.");
      shares = worth > 0n ? (units * pool.shares + worth - 1n) / worth : units; // rounded up
      if (shares > view.shares) shares = view.shares;
    }
    const out = pool.shares > 0n ? (shares * worth) / pool.shares : 0n; // what the contract will send
    if (out > pool.available) return fail("Hoy el fondo no tiene tanto sin prestar. Lo prestado vuelve cuando las tiendas pagan.");
    const problem = await confirmed(mine.party, "withdraw", confirmId, amount === "all" ? out : toUnits(amount));
    if (problem) return fail(problem);
    const { hash } = await run(mine.party.id, (client) => client.withdraw({ lender: address, shares }));
    return { ok: true, message: "Dinero retirado del fondo.", txHash: hash, explorerUrl: explorerTx(hash) };
  } catch (error) {
    return failure(error);
  }
}

// ---------- /admin ----------

export type LenderAdminRow = Pick<Lender, "id" | "businessName" | "country" | "licence" | "nit" | "status" | "ownerName" | "ownerContact" | "createdAt" | "idCheck" | "repDui" | "matricula"> & {
  explorerUrl: string;
};

const toRow = (l: Lender): LenderAdminRow => ({
  id: l.id,
  businessName: l.businessName,
  country: l.country,
  licence: l.licence,
  nit: l.nit,
  status: l.status,
  ownerName: l.ownerName,
  ownerContact: l.ownerContact,
  createdAt: l.createdAt,
  idCheck: l.idCheck,
  repDui: l.repDui,
  matricula: l.matricula,
  explorerUrl: `${config.explorer}/account/${l.stellarAddress}`,
});

/** null when the signed-in user isn't a Relay admin. */
export async function getLenderAdminList(): Promise<{ pending: LenderAdminRow[]; decided: LenderAdminRow[] } | null> {
  const user = await currentUser();
  if (user?.role !== "admin") return null;
  await ensureIdentityColumns(requireDb()); // so the list can show the identity check (#215)
  const { pending, decided } = await listLendersForAdmin();
  return { pending: pending.map(toRow), decided: decided.map(toRow) };
}

export async function adminDecideLender(id: string, status: "aprobado" | "revocado"): Promise<Reply> {
  const user = await currentUser();
  if (user?.role !== "admin") return { ok: false, message: ADMINS_ONLY };
  try {
    await decideLender(String(id), status, lenderOnChain);
    return { ok: true };
  } catch (error) {
    if (error instanceof LenderRefused || error instanceof ContractError) return { ok: false, message: error.message };
    console.error("[admin] lender", error instanceof Error ? error.message : error);
    return { ok: false, message: FALLBACK_MESSAGE };
  }
}
