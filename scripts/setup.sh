#!/usr/bin/env bash
# Create the demo accounts and test dollars on Stellar testnet (#15).
#
#   ./scripts/setup.sh           reuse the accounts on this computer, top the test dollars back up
#   ./scripts/setup.sh --fresh   start over: new keys for every account and a new test-dollar token
#
# Writes config/testnet.json (public addresses, committed) and .env.local (secret keys,
# NEVER committed). Safe to run again: it only tops up what is missing. Testnet is reset
# sometimes; rerunning rebuilds everything. Run ./scripts/deploy.sh after it (#52).
# It never prints secret keys. Do not add `set -x`.
set -euo pipefail
cd "$(dirname "$0")/.."

NETWORK=testnet
CONFIG=config/testnet.json
ENV_FILE=.env.local
SHOP_UNITS=5000000000      # $500.00 (7 decimals: $1.00 = 10,000,000)
LENDER_UNITS=100000000000  # $10,000.00
RETRY_DELAY=${RETRY_DELAY:-5}

# Every account is a Stellar CLI identity called tiendas-<name>.
IDENTITIES="admin issuer sponsor treasury lender distributor motorista-1 motorista-2 tienda-1 tienda-2 tienda-3"
TRUSTLINES="treasury lender distributor tienda-1 tienda-2 tienda-3"
# identity:ENV_VAR. The issuer and treasury secrets are not written: the app never needs them.
SECRETS="admin:STELLAR_SECRET_ADMIN sponsor:STELLAR_SECRET_SPONSOR lender:STELLAR_SECRET_LENDER
distributor:STELLAR_SECRET_DISTRIBUTOR motorista-1:STELLAR_SECRET_MOTORISTA_1
motorista-2:STELLAR_SECRET_MOTORISTA_2 tienda-1:STELLAR_SECRET_TIENDA_1
tienda-2:STELLAR_SECRET_TIENDA_2 tienda-3:STELLAR_SECRET_TIENDA_3"

die() { echo "setup.sh: $*" >&2; exit 1; }
step() { printf '\n==> %s\n' "$*"; }
# Hide anything that looks like a secret key (S + 55 characters) before printing it.
scrub() { sed -E 's/S[A-Z2-7]{55}/S********(hidden)/g'; }

FRESH=0
for arg in "$@"; do
  case $arg in
    --fresh) FRESH=1 ;;
    *) die "unknown option: $arg (the only option is --fresh)" ;;
  esac
done

ERRF=$(mktemp)
ENV_TMP=
trap 'rm -f "$ERRF" "$ENV_TMP"' EXIT

# try <ok-pattern> <command...>: run up to 3 times, a few seconds apart (testnet times out
# now and then). A failure whose output matches <ok-pattern> counts as success (use ''
# for none). stdout of the last run is left in $OUT.
try() {
  local ok=$1 n all
  shift
  for n in 1 2 3; do
    if OUT=$("$@" 2>"$ERRF"); then return 0; fi
    all="$OUT
$(cat "$ERRF")"
    if [ -n "$ok" ] && printf '%s' "$all" | grep -Eqi "$ok"; then return 0; fi
    if [ "$n" -lt 3 ]; then
      echo "   (failed, trying again in $RETRY_DELAY s)" >&2
      sleep "$RETRY_DELAY"
    fi
  done
  echo "setup.sh: failed 3 times: $*" >&2
  printf '%s\n' "$all" | scrub >&2
  return 1
}

# ---------- 0. Check this computer ----------
command -v stellar >/dev/null ||
  die "the stellar CLI is not installed. Mac: brew install stellar-cli. Windows: winget install --id Stellar.StellarCLI"
command -v node >/dev/null || die "node is not installed (Node 20 or newer)."
VERSION=$(stellar --version 2>/dev/null | sed -n '1s/[^0-9]*\([0-9][0-9]*\).*/\1/p' || true)
if [ -z "$VERSION" ]; then
  echo "setup.sh: could not read the stellar CLI version; it must be 30 or newer." >&2
elif [ "$VERSION" -lt 30 ]; then
  die "the stellar CLI is version $VERSION; it must be 30 or newer (brew upgrade stellar-cli)."
fi
# Refuse to write secret keys anywhere git would pick them up.
if git rev-parse --is-inside-work-tree >/dev/null 2>&1 && ! git check-ignore -q "$ENV_FILE"; then
  die "git does not ignore $ENV_FILE. Fix .gitignore first: secret keys must never be committed."
fi

# ---------- 1. Accounts ----------
step "Accounts, funded by friendbot ($([ "$FRESH" = 1 ] && echo "--fresh: all new" || echo "reusing the ones on this computer"))"
for name in $IDENTITIES; do
  id=tiendas-$name
  if [ "$FRESH" = 1 ] || ! stellar keys address "$id" >/dev/null 2>&1; then
    try '' stellar keys generate "$id" --network "$NETWORK" --fund --overwrite
    echo "   $id: new"
  else
    try 'already' stellar keys fund "$id" --network "$NETWORK" # "already funded" is fine
    echo "   $id: reused"
  fi
done

addr() { stellar keys address "tiendas-$1" | tr -d '\r'; }
ADMIN=$(addr admin)
ISSUER=$(addr issuer)
SPONSOR=$(addr sponsor)
TREASURY=$(addr treasury)
LENDER=$(addr lender)
DISTRIBUTOR=$(addr distributor)
M1=$(addr motorista-1)
M2=$(addr motorista-2)
T1=$(addr tienda-1)
T2=$(addr tienda-2)
T3=$(addr tienda-3)
for v in ADMIN ISSUER SPONSOR TREASURY LENDER DISTRIBUTOR M1 M2 T1 T2 T3; do
  [[ ${!v} =~ ^G[A-Z2-7]{55}$ ]] || die "the stellar CLI gave no valid address for $v (got: ${!v})."
done

# ---------- 2. Trustlines ----------
step "Trustlines, so these accounts can hold test USDC"
for name in $TRUSTLINES; do
  try '' stellar tx new change-trust --source-account "tiendas-$name" --line "USDC:$ISSUER" --network "$NETWORK"
  echo "   tiendas-$name: ok"
done

# ---------- 3. Token ----------
step "Test USDC token (our own asset, issued by tiendas-issuer)"
# No --alias here: if the alias already exists (a --fresh run), the CLI could refuse before
# deploying. The alias is set below instead, with --overwrite.
try 'already|ExistingValue' stellar contract asset deploy --asset "USDC:$ISSUER" \
  --source-account tiendas-issuer --network "$NETWORK" # "already exists" is fine
try '' stellar contract id asset --asset "USDC:$ISSUER" --network "$NETWORK"
TOKEN=$(printf '%s' "$OUT" | tail -n 1 | tr -d '\r')
[[ $TOKEN =~ ^C[A-Z2-7]{55}$ ]] || die "could not read the token contract ID (got: $TOKEN)."
try '' stellar contract alias add tiendas-usdc --id "$TOKEN" --network "$NETWORK" --overwrite
echo "   $TOKEN"

# ---------- 4. Mint ----------
# The USDC balance of an address in 7-decimal units (the CLI prints dollars with --decimal).
balance_units() {
  stellar token balance --id "$TOKEN" --account "$1" --network "$NETWORK" --decimal | node -e '
    let s = "";
    process.stdin.on("data", (d) => (s += d)).on("end", () => {
      const m = s.replace(/["\s]/g, "").match(/^(\d+)(?:\.(\d+))?$/);
      if (!m) {
        console.error("cannot read the balance: " + JSON.stringify(s.slice(0, 60)));
        process.exit(1);
      }
      const frac = (m[2] || "").padEnd(7, "0").slice(0, 7);
      console.log((BigInt(m[1]) * 10000000n + BigInt(frac)).toString());
    });
  '
}

# top_up <address> <target units>: mint only what is missing, so balances never keep
# growing. It looks at the balance on every try, so a retry after a timeout can't mint twice.
# (Inside try this runs in a subshell without `set -e`: each step must `|| return 1`.)
top_up() {
  local have missing
  have=$(balance_units "$1") || return 1
  missing=$(($2 - have))
  [ "$missing" -gt 0 ] || return 0
  stellar token mint --id "$TOKEN" --to "$1" --amount "$missing" \
    --source-account tiendas-issuer --network "$NETWORK" || return 1
}

step "Minting test dollars (only what is missing)"
for pair in "tienda-1:$T1" "tienda-2:$T2" "tienda-3:$T3"; do
  try '' top_up "${pair#*:}" "$SHOP_UNITS"
  echo "   tiendas-${pair%%:*}: topped up to \$500"
done
try '' top_up "$LENDER" "$LENDER_UNITS"
echo "   tiendas-lender: topped up to \$10,000"

# ---------- 5. config/testnet.json ----------
step "Writing $CONFIG"
mkdir -p "$(dirname "$CONFIG")"
node - "$CONFIG" "$FRESH" "$TOKEN" "$ISSUER" "$ADMIN" "$SPONSOR" "$TREASURY" "$LENDER" "$DISTRIBUTOR" \
  "$M1" "$M2" "$T1" "$T2" "$T3" <<'EOF'
const fs = require("fs");
const [file, fresh, token, issuer, admin, sponsor, treasury, lender, distributor, m1, m2, t1, t2, t3] =
  process.argv.slice(2);
let old = {};
try {
  old = JSON.parse(fs.readFileSync(file, "utf8"));
} catch (e) {
  // no config yet
}
// Keep a deployed contract ID, unless --fresh or the test-dollar token changed under it.
const keep =
  fresh !== "1" && old.token && old.token.contractId === token && old.contracts && old.contracts.routeLedger;
const config = {
  network: "testnet",
  rpcUrl: "https://soroban-testnet.stellar.org",
  horizonUrl: "https://horizon-testnet.stellar.org",
  networkPassphrase: "Test SDF Network ; September 2015",
  explorer: "https://stellar.expert/explorer/testnet",
  token: { code: "USDC", issuer, contractId: token, decimals: 7 },
  contracts: { routeLedger: keep ? old.contracts.routeLedger : null },
  accounts: {
    admin,
    issuer,
    sponsor,
    treasury,
    lender,
    distributor,
    drivers: { "motorista-1": m1, "motorista-2": m2 },
    shops: { "tienda-1": t1, "tienda-2": t2, "tienda-3": t3 },
  },
  names: {
    distributor: "Distribuidora El Sol",
    "motorista-1": "Carlos",
    "motorista-2": "Ana",
    "tienda-1": "Tienda Rosa",
    "tienda-2": "Tienda Don Luis",
    "tienda-3": "Mini Súper La Esquina",
  },
};
fs.writeFileSync(file, JSON.stringify(config, null, 2) + "\n");
EOF

# ---------- 6. .env.local ----------
step "Writing $ENV_FILE (secret keys: never commit it, never paste it in a chat)"
ENV_TMP=$(mktemp ".env.local.XXXXXX") # next to the target; git ignores .env*
{
  for pair in $SECRETS; do
    printf '%s=' "${pair#*:}"
    stellar keys secret "tiendas-${pair%%:*}" | tr -d '\r'
  done
  echo "NEXT_PUBLIC_USE_MOCKS=true"
  echo "NEXT_PUBLIC_SITE_URL=http://localhost:3000"
} >"$ENV_TMP"
cat "$ENV_TMP" >"$ENV_FILE" # writes through a symlink (wt.sh links worktrees to the root file)
rm -f "$ENV_TMP"
ENV_TMP=
chmod 600 "$ENV_FILE" 2>/dev/null || true
echo "   9 secret keys + NEXT_PUBLIC_USE_MOCKS=true (flip it to false once the app reads the contract)"

# ---------- 7. Balances ----------
step "Balances (test USDC)"
printf '%-14s %s\n' "account" "USDC"
for pair in "treasury:$TREASURY" "lender:$LENDER" "distributor:$DISTRIBUTOR" \
  "tienda-1:$T1" "tienda-2:$T2" "tienda-3:$T3"; do
  try '' stellar token balance --id "$TOKEN" --account "${pair#*:}" --network "$NETWORK" --decimal
  printf '%-14s %s\n' "${pair%%:*}" "$(printf '%s' "$OUT" | tr -d '"\r ')"
done

echo
echo "Done. Commit $CONFIG (public addresses only). $ENV_FILE stays on this computer."
echo "Next: ./scripts/deploy.sh"
