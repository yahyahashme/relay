import { readFileSync } from "node:fs";
import { createHash, generateKeyPairSync, randomBytes, sign, type KeyObject } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { isoCBOR } from "@simplewebauthn/server/helpers";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ConfirmStart } from "@/lib/pay-confirm";

vi.mock("server-only", () => ({}));

const { applySchema } = await import("./setup");
const { clearDemoConfirms, finishConfirm, redeemConfirm, startConfirm, unitsToCents } = await import("./pay-confirm");

const RP = { id: "relay-sv.vercel.app", origin: "https://relay-sv.vercel.app" };
const ROSA = { key: "user:rosa", name: "Tienda Rosa" };
const OTHER = { key: "device:someone-else", name: "Tienda 1 (demo)" };
const PAY_45 = { action: "pay" as const, partyId: "tienda-1", invoiceId: 1001, cents: 4500 };

async function freshDb() {
  const pg = new PGlite();
  const db = { query: async (text: string, params: unknown[] = []) => (await pg.query(text, params)).rows as never[] };
  await applySchema(db, readFileSync("db/schema.sql", "utf8"));
  return db;
}

type Ok = Extract<ConfirmStart, { ok: true }>;
const started = (result: ConfirmStart): Ok => {
  if (!result.ok) throw new Error(result.message);
  return result;
};

// ---------- a phone's Face ID, in software: a P-256 key that signs like a platform authenticator ----------

const b64 = (bytes: Uint8Array | Buffer) => Buffer.from(bytes).toString("base64url");
const sha256 = (data: Buffer) => createHash("sha256").update(data).digest();

class FakePhone {
  readonly credentialId = randomBytes(16);
  private readonly key: KeyObject;
  private readonly cose: Uint8Array;
  private count = 0;

  constructor() {
    const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
    this.key = privateKey;
    const jwk = publicKey.export({ format: "jwk" });
    this.cose = isoCBOR.encode(
      new Map<number, number | Uint8Array>([
        [1, 2],
        [3, -7],
        [-1, 1],
        [-2, Buffer.from(jwk.x!, "base64url")],
        [-3, Buffer.from(jwk.y!, "base64url")],
      ]),
    );
  }

  private authData(attested: boolean, verified = true) {
    const flags = 0x01 | (verified ? 0x04 : 0) | (attested ? 0x40 : 0);
    const counter = Buffer.alloc(4);
    counter.writeUInt32BE(++this.count);
    const parts = [sha256(Buffer.from(RP.id)), Buffer.from([flags]), counter];
    if (attested) {
      const length = Buffer.alloc(2);
      length.writeUInt16BE(this.credentialId.length);
      parts.push(Buffer.alloc(16), length, this.credentialId, Buffer.from(this.cose));
    }
    return Buffer.concat(parts);
  }

  private clientData(type: string, challenge: string, origin = RP.origin) {
    return Buffer.from(JSON.stringify({ type, challenge, origin, crossOrigin: false }));
  }

  /** What startRegistration() returns in the browser. */
  register(challenge: string) {
    const attestationObject = isoCBOR.encode(new Map<string, unknown>([["fmt", "none"], ["attStmt", new Map()], ["authData", this.authData(true)]]) as never);
    return {
      id: b64(this.credentialId),
      rawId: b64(this.credentialId),
      type: "public-key" as const,
      clientExtensionResults: {},
      response: { clientDataJSON: b64(this.clientData("webauthn.create", challenge)), attestationObject: b64(attestationObject), transports: ["internal" as const] },
    };
  }

  /** What startAuthentication() returns in the browser. */
  approve(challenge: string, { origin = RP.origin, verified = true } = {}) {
    const authData = this.authData(false, verified);
    const clientData = this.clientData("webauthn.get", challenge, origin);
    const signature = sign("sha256", Buffer.concat([authData, sha256(clientData)]), this.key);
    return {
      id: b64(this.credentialId),
      rawId: b64(this.credentialId),
      type: "public-key" as const,
      clientExtensionResults: {},
      response: { clientDataJSON: b64(clientData), authenticatorData: b64(authData), signature: b64(signature) },
    };
  }
}

const challengeOf = (start: Ok) => (start.authOptions?.challenge ?? start.setupOptions?.challenge)!;

describe("confirming a payment with face, fingerprint or PIN", () => {
  let db: Awaited<ReturnType<typeof freshDb>>;
  beforeEach(async () => {
    db = await freshDb();
  });

  it("asks a new owner to set one up, and that first passkey confirms the payment", async () => {
    const phone = new FakePhone();
    const start = started(await startConfirm(db, ROSA, PAY_45, RP));
    expect(start.mode).toBe("setup");
    expect(start.setupOptions?.authenticatorSelection?.userVerification).toBe("required");

    expect(await finishConfirm(db, ROSA, start.id, { kind: "new-passkey", response: phone.register(challengeOf(start)) }, RP)).toEqual({ ok: true });
    expect(await redeemConfirm(db, ROSA, start.id, PAY_45)).toBeNull();

    // The next payment asks for that passkey, and nothing else.
    const next = started(await startConfirm(db, ROSA, PAY_45, RP));
    expect(next.mode).toBe("passkey");
    expect(next.hasPin).toBe(false);
    expect(next.authOptions?.allowCredentials?.[0].id).toBe(b64(phone.credentialId));
    expect(await finishConfirm(db, ROSA, next.id, { kind: "passkey", response: phone.approve(challengeOf(next)) }, RP)).toEqual({ ok: true });
    expect(await redeemConfirm(db, ROSA, next.id, PAY_45)).toBeNull();
  });

  it("refuses a passkey answer for another challenge, another site, or without the face or finger", async () => {
    const phone = new FakePhone();
    const first = started(await startConfirm(db, ROSA, PAY_45, RP));
    await finishConfirm(db, ROSA, first.id, { kind: "new-passkey", response: phone.register(challengeOf(first)) }, RP);

    const start = started(await startConfirm(db, ROSA, PAY_45, RP));
    const old = phone.approve(challengeOf(first));
    expect(await finishConfirm(db, ROSA, start.id, { kind: "passkey", response: old }, RP)).toMatchObject({ ok: false, again: true });
    const phishing = phone.approve(challengeOf(start), { origin: "https://relay-sv.example" });
    expect(await finishConfirm(db, ROSA, start.id, { kind: "passkey", response: phishing }, RP)).toMatchObject({ ok: false });
    const presenceOnly = phone.approve(challengeOf(start), { verified: false });
    expect(await finishConfirm(db, ROSA, start.id, { kind: "passkey", response: presenceOnly }, RP)).toMatchObject({ ok: false });
    expect(await redeemConfirm(db, ROSA, start.id, PAY_45)).toBe("Confirme el pago con su cara, huella o PIN.");
  });

  it("does not let a passkey from another owner confirm", async () => {
    const mine = new FakePhone();
    const a = started(await startConfirm(db, ROSA, PAY_45, RP));
    await finishConfirm(db, ROSA, a.id, { kind: "new-passkey", response: mine.register(challengeOf(a)) }, RP);
    const theirs = started(await startConfirm(db, OTHER, PAY_45, RP));
    expect(await finishConfirm(db, OTHER, theirs.id, { kind: "passkey", response: mine.approve(challengeOf(theirs)) }, RP)).toMatchObject({ ok: false });
    // ...nor answer someone else's challenge.
    const b = started(await startConfirm(db, ROSA, PAY_45, RP));
    expect(await finishConfirm(db, OTHER, b.id, { kind: "pin", pin: "482913" }, RP)).toMatchObject({ ok: false });
  });

  it("sets up a PIN on a phone without Face ID, then asks for it", async () => {
    const start = started(await startConfirm(db, ROSA, PAY_45, RP));
    expect(await finishConfirm(db, ROSA, start.id, { kind: "new-pin", pin: "123456" }, RP)).toMatchObject({ ok: false, again: true });
    expect(await finishConfirm(db, ROSA, start.id, { kind: "new-pin", pin: "48291" }, RP)).toMatchObject({ ok: false, again: true });
    expect(await finishConfirm(db, ROSA, start.id, { kind: "new-pin", pin: "482913" }, RP)).toEqual({ ok: true });
    expect(await redeemConfirm(db, ROSA, start.id, PAY_45)).toBeNull();

    const next = started(await startConfirm(db, ROSA, PAY_45, RP));
    expect(next.mode).toBe("pin");
    expect(await finishConfirm(db, ROSA, next.id, { kind: "pin", pin: "482913" }, RP)).toEqual({ ok: true });
  });

  it("never lets a second way in skip the first one", async () => {
    const start = started(await startConfirm(db, ROSA, PAY_45, RP));
    await finishConfirm(db, ROSA, start.id, { kind: "new-pin", pin: "482913" }, RP);
    const next = started(await startConfirm(db, ROSA, PAY_45, RP));
    expect(await finishConfirm(db, ROSA, next.id, { kind: "new-pin", pin: "777001" }, RP)).toMatchObject({ ok: false });
    expect(await finishConfirm(db, ROSA, next.id, { kind: "new-passkey", response: new FakePhone().register(challengeOf(next)) }, RP)).toMatchObject({ ok: false });
    expect(await redeemConfirm(db, ROSA, next.id, PAY_45)).not.toBeNull();
  });

  it("locks the PIN after 5 wrong tries", async () => {
    const setup = started(await startConfirm(db, ROSA, PAY_45, RP));
    await finishConfirm(db, ROSA, setup.id, { kind: "new-pin", pin: "482913" }, RP);
    const start = started(await startConfirm(db, ROSA, PAY_45, RP));
    const answers = [];
    for (let i = 0; i < 5; i++) answers.push(await finishConfirm(db, ROSA, start.id, { kind: "pin", pin: "000111" }, RP));
    expect(answers[0]).toEqual({ ok: false, message: "PIN incorrecto. Le quedan 4 intentos.", again: true });
    expect(answers[3]).toEqual({ ok: false, message: "PIN incorrecto. Le queda 1 intento.", again: true });
    expect(answers[4]).toEqual({ ok: false, message: "PIN bloqueado por 5 intentos. Espere 15 minutos." });
    // The right PIN doesn't open it while it's locked.
    expect(await finishConfirm(db, ROSA, start.id, { kind: "pin", pin: "482913" }, RP)).toMatchObject({ ok: false });
  });

  it("lets a confirmation pay once, only that action, invoice and amount", async () => {
    const start = started(await startConfirm(db, ROSA, PAY_45, RP));
    await finishConfirm(db, ROSA, start.id, { kind: "new-pin", pin: "482913" }, RP);
    expect(await redeemConfirm(db, ROSA, start.id, { ...PAY_45, cents: 4501 })).toBe("El monto cambió. Confirme el pago otra vez.");
    expect(await redeemConfirm(db, ROSA, start.id, { ...PAY_45, invoiceId: 1002 })).not.toBeNull();
    expect(await redeemConfirm(db, ROSA, start.id, { ...PAY_45, action: "later" })).not.toBeNull();
    expect(await redeemConfirm(db, OTHER, start.id, PAY_45)).not.toBeNull();
    expect(await redeemConfirm(db, ROSA, start.id, PAY_45)).toBeNull();
    expect(await redeemConfirm(db, ROSA, start.id, PAY_45)).toBe("La confirmación venció. Toque pagar otra vez.");
  });

  it("refuses with no confirmation, and after two minutes", async () => {
    expect(await redeemConfirm(db, ROSA, undefined, PAY_45)).toBe("Confirme el pago con su cara, huella o PIN.");
    expect(await redeemConfirm(db, null, "x", PAY_45)).toBe("Confirme el pago con su cara, huella o PIN.");
    const start = started(await startConfirm(db, ROSA, PAY_45, RP));
    await finishConfirm(db, ROSA, start.id, { kind: "new-pin", pin: "482913" }, RP);
    await db.query(`UPDATE pay_challenges SET expires_at = now() - interval '1 second' WHERE id = $1`, [start.id]);
    expect(await redeemConfirm(db, ROSA, start.id, PAY_45)).toBe("La confirmación venció. Toque pagar otra vez.");
  });

  it("binds repayments to the shop, with no invoice", async () => {
    const repay = { action: "repay" as const, partyId: "tienda-1", invoiceId: null, cents: 6000 };
    const start = started(await startConfirm(db, ROSA, repay, RP));
    await finishConfirm(db, ROSA, start.id, { kind: "new-pin", pin: "482913" }, RP);
    expect(await redeemConfirm(db, ROSA, start.id, { ...repay, partyId: "tienda-2" })).not.toBeNull();
    expect(await redeemConfirm(db, ROSA, start.id, repay)).toBeNull();
  });

  it("rounds contract units to the cents on screen", () => {
    expect(unitsToCents(450_000_000n)).toBe(4500);
    expect(unitsToCents(123_456_789n)).toBe(1235);
    expect(unitsToCents(123_449_999n)).toBe(1234);
  });

  it("creates its tables on a database set up before them", async () => {
    const pg = new PGlite();
    const bare = { query: async (text: string, params: unknown[] = []) => (await pg.query(text, params)).rows as never[] };
    expect(started(await startConfirm(bare, ROSA, PAY_45, RP)).mode).toBe("setup");
  });

  it("Reiniciar demo forgets demo phones' PINs, never a real owner's (#223)", async () => {
    for (const owner of [ROSA, OTHER]) {
      const start = started(await startConfirm(db, owner, PAY_45, RP));
      expect(await finishConfirm(db, owner, start.id, { kind: "new-pin", pin: "482913" }, RP)).toEqual({ ok: true });
    }
    expect(await clearDemoConfirms(db)).toBe(1);
    expect(started(await startConfirm(db, OTHER, PAY_45, RP)).mode).toBe("setup");
    expect(started(await startConfirm(db, ROSA, PAY_45, RP)).mode).toBe("pin");
  });
});
