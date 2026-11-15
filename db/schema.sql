-- Relay accounts (#129). Safe to run again: every statement is IF NOT EXISTS.
-- Apply with `npm run db:setup` (it also adds the demo accounts as seed rows).
--
-- A "party" is anyone with a Stellar address the contract knows: a shop, a
-- driver or a distributor. Users sign in; a shop can exist before its owner
-- has a user (a distributor adds it, #132), so shops and users are separate.

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  role          TEXT NOT NULL CHECK (role IN ('tienda', 'distribuidora', 'motorista', 'admin', 'prestamista')),
  name          TEXT NOT NULL,
  phone         TEXT UNIQUE,
  email         TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  stellar_address TEXT NOT NULL UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (phone IS NOT NULL OR email IS NOT NULL)
);

-- Secret keys for accounts Relay holds (testnet-only custody for the demo; the
-- real product uses passkey smart wallets, #127). Encrypted with WALLET_KEY
-- (AES-256-GCM). The demo seed accounts have no row: their keys stay in Vercel
-- env vars (STELLAR_SECRET_*), as before.
CREATE TABLE IF NOT EXISTS wallets (
  address    TEXT PRIMARY KEY,
  secret_enc TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS distributors (
  id            TEXT PRIMARY KEY,
  owner_user_id TEXT REFERENCES users(id),
  business_name TEXT NOT NULL,
  nit           TEXT,
  address       TEXT,
  status        TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'aprobado', 'rechazado')),
  stellar_address TEXT NOT NULL UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shops (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  address       TEXT,
  owner_user_id TEXT REFERENCES users(id),
  owner_name    TEXT,           -- for shops without an owner user yet (the demo shops)
  created_by    TEXT REFERENCES distributors(id),
  stellar_address TEXT NOT NULL UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS drivers (
  id             TEXT PRIMARY KEY,
  user_id        TEXT REFERENCES users(id),
  distributor_id TEXT NOT NULL REFERENCES distributors(id),
  name           TEXT NOT NULL,
  phone          TEXT,
  stellar_address TEXT NOT NULL UNIQUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS distributor_shops (
  distributor_id TEXT NOT NULL REFERENCES distributors(id),
  shop_id        TEXT NOT NULL REFERENCES shops(id),
  nickname       TEXT,          -- what the distributor calls it; only they see it (#132)
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (distributor_id, shop_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,  -- random; the cookie carries it, signed with SESSION_SECRET
  user_id    TEXT NOT NULL REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_user ON sessions (user_id);
CREATE INDEX IF NOT EXISTS drivers_distributor ON drivers (distributor_id);

-- #130: what a distributor tells us at sign-up, and when it was decided.
ALTER TABLE distributors ADD COLUMN IF NOT EXISTS sells TEXT;
ALTER TABLE distributors ADD COLUMN IF NOT EXISTS shops_approx INTEGER;
ALTER TABLE distributors ADD COLUMN IF NOT EXISTS drivers_approx INTEGER;
ALTER TABLE distributors ADD COLUMN IF NOT EXISTS decided_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS distributors_owner ON distributors (owner_user_id);

-- #131: drivers join by invite link. A removed driver keeps their history (active = false).
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
CREATE TABLE IF NOT EXISTS driver_invites (
  token          TEXT PRIMARY KEY,
  distributor_id TEXT NOT NULL REFERENCES distributors(id),
  name           TEXT NOT NULL,
  phone          TEXT NOT NULL,
  driver_id      TEXT REFERENCES drivers(id),  -- set when the driver signs up
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  removed_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS driver_invites_distributor ON driver_invites (distributor_id);

-- #132: distributors add shops. The assigned driver, and one claim code per shop
-- without an owner (QR at the next delivery, or WhatsApp).
ALTER TABLE distributor_shops ADD COLUMN IF NOT EXISTS driver_id TEXT REFERENCES drivers(id);
ALTER TABLE shops ADD COLUMN IF NOT EXISTS phone TEXT;
CREATE TABLE IF NOT EXISTS shop_invites (
  code           TEXT PRIMARY KEY,          -- 6 letters/digits, easy to read out loud
  shop_id        TEXT NOT NULL REFERENCES shops(id),
  distributor_id TEXT NOT NULL REFERENCES distributors(id),
  phone          TEXT,
  claimed_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shop_invites_shop ON shop_invites (shop_id);

-- Invoice notes / products (#133). The contract keeps the money; the note lives here.
CREATE TABLE IF NOT EXISTS invoice_notes (
  invoice_id BIGINT PRIMARY KEY,
  distributor_id TEXT NOT NULL REFERENCES distributors(id),
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Shop sign-up (#134): what kind of shop, and up to 3 trusted contacts per person.
ALTER TABLE shops ADD COLUMN IF NOT EXISTS kind TEXT;
CREATE TABLE IF NOT EXISTS trusted_contacts (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  name       TEXT NOT NULL,
  phone      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trusted_contacts_user ON trusted_contacts (user_id);

-- Who may read a note (Jack's review of #149): the invoice's shop and driver.
ALTER TABLE invoice_notes ADD COLUMN IF NOT EXISTS shop_id TEXT;
ALTER TABLE invoice_notes ADD COLUMN IF NOT EXISTS driver_id TEXT;

-- Rate limits (sign-ups per IP, wrong passwords per phone/email and IP), shared by every server instance.
CREATE TABLE IF NOT EXISTS rate_events (
  key TEXT NOT NULL,
  at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rate_events_key_at ON rate_events (key, at);

-- Payment confirmation (#199): after a shop taps pay, Face ID / fingerprint (a passkey) or a 6-digit PIN.
-- `owner` is "user:<id>" for a real account, "device:<id>" for a phone paying as a demo shop.
-- lib/server/pay-confirm.ts also creates these on first use, so the live database needs no setup step.
CREATE TABLE IF NOT EXISTS pay_passkeys (
  id         TEXT PRIMARY KEY,   -- the credential id, base64url
  owner      TEXT NOT NULL,
  public_key TEXT NOT NULL,      -- COSE key, base64url
  counter    BIGINT NOT NULL DEFAULT 0,
  transports TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pay_passkeys_owner ON pay_passkeys (owner);
CREATE TABLE IF NOT EXISTS pay_pins (
  owner      TEXT PRIMARY KEY,
  pin_hash   TEXT NOT NULL,      -- scrypt, like passwords
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- One per tap on a pay button: bound to what will move, single use, two minutes.
CREATE TABLE IF NOT EXISTS pay_challenges (
  id          TEXT PRIMARY KEY,
  owner       TEXT NOT NULL,
  action      TEXT NOT NULL,     -- pay | later | cash | repay
  party_id    TEXT NOT NULL,     -- the shop
  invoice_id  BIGINT,            -- null for repay
  cents       BIGINT NOT NULL,
  challenge   TEXT NOT NULL,     -- base64url, what the passkey signs
  expires_at  TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  method      TEXT,              -- passkey | pin
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lenders (#207): a business Relay approves (approve_lender on the contract) before it can put
-- money in the pool. "revocado" = revoke_lender: no new deposits, it can always withdraw.
CREATE TABLE IF NOT EXISTS lenders (
  id              TEXT PRIMARY KEY,
  owner_user_id   TEXT NOT NULL REFERENCES users(id),
  business_name   TEXT NOT NULL,
  country         TEXT NOT NULL,
  licence         TEXT NOT NULL,
  nit             TEXT,
  status          TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'aprobado', 'revocado')),
  stellar_address TEXT NOT NULL UNIQUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at      TIMESTAMPTZ
);

-- Identity check at sign-up (#215): the legal representative's DUI and birth date, the company's
-- CNR registration, and the check's status. Never the photos.
ALTER TABLE distributors ADD COLUMN IF NOT EXISTS rep_dui TEXT;
ALTER TABLE distributors ADD COLUMN IF NOT EXISTS rep_birth_date DATE;
ALTER TABLE distributors ADD COLUMN IF NOT EXISTS cnr_matricula TEXT;
ALTER TABLE distributors ADD COLUMN IF NOT EXISTS id_check TEXT;
ALTER TABLE distributors ADD COLUMN IF NOT EXISTS id_checked_at TIMESTAMPTZ;
ALTER TABLE lenders ADD COLUMN IF NOT EXISTS rep_dui TEXT;
ALTER TABLE lenders ADD COLUMN IF NOT EXISTS rep_birth_date DATE;
ALTER TABLE lenders ADD COLUMN IF NOT EXISTS cnr_matricula TEXT;
ALTER TABLE lenders ADD COLUMN IF NOT EXISTS id_check TEXT;
ALTER TABLE lenders ADD COLUMN IF NOT EXISTS id_checked_at TIMESTAMPTZ;
ALTER TABLE lenders ADD COLUMN IF NOT EXISTS nit TEXT;
