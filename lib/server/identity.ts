import "server-only";

import { checkIdentity, type IdentityDetails, normalizeDui, normalizeMatricula } from "@/lib/identity";
import type { Db } from "./db";
import { ensureLenderTables } from "./lenders";

// The identity check's record (#215): only the numbers and a status, never the photos. The live
// database was set up before these columns: they are added on first use, like the lenders table.

const ready = new WeakSet<Db>();
export async function ensureIdentityColumns(db: Db): Promise<void> {
  if (ready.has(db)) return;
  await ensureLenderTables(db);
  for (const table of ["distributors", "lenders"]) {
    await db.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS rep_dui TEXT`);
    await db.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS rep_birth_date DATE`);
    await db.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS cnr_matricula TEXT`);
    await db.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS id_check TEXT`);
    await db.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS id_checked_at TIMESTAMPTZ`);
  }
  await db.query(`ALTER TABLE lenders ADD COLUMN IF NOT EXISTS nit TEXT`);
  ready.add(db);
}

/**
 * After the simulated check passed on the phone: the numbers, checked again here, and the status
 * "verificada_demo". In production the status comes from the verification partner instead.
 */
export async function recordIdentity(db: Db, table: "distributors" | "lenders", id: string, details: IdentityDetails): Promise<void> {
  if (checkIdentity(details)) throw new Error("identity details not checked");
  await ensureIdentityColumns(db);
  await db.query(
    `UPDATE ${table} SET rep_dui = $2, rep_birth_date = $3, cnr_matricula = $4, id_check = 'verificada_demo', id_checked_at = now() WHERE id = $1`,
    [id, normalizeDui(details.dui), details.birthDate, normalizeMatricula(details.matricula)],
  );
}
