#!/usr/bin/env bash
# Regenerate the TypeScript client in packages/route_ledger after any contract change.
#   ./scripts/bindings.sh           from the deployed contract (config/testnet.json, needs testnet)
#   ./scripts/bindings.sh --wasm    from a local build (stellar contract build first; no network)
# The app imports packages/route_ledger/src/index.ts directly, so there's no build step.
set -euo pipefail
cd "$(dirname "$0")/.."

OUT=packages/route_ledger
if [[ "${1:-}" == "--wasm" ]]; then
  SOURCE=(--wasm target/wasm32v1-none/release/route_ledger.wasm)
else
  ID=$(node -p 'require("./config/testnet.json").contracts.routeLedger')
  SOURCE=(--contract-id "$ID" --network testnet)
fi

npx @stellar/stellar-sdk generate "${SOURCE[@]}" --output-dir "$OUT" --contract-name route-ledger --overwrite

# Keep only the source; Next's bundler can't resolve the generator's "./x.js" imports of .ts files.
rm -f "$OUT/package.json" "$OUT/tsconfig.json" "$OUT/.gitignore"
sed -i.bak -E "s#from (['\"])\./([a-z_]+)\.js(['\"])#from \1./\2\3#g" "$OUT"/src/*.ts
rm -f "$OUT"/src/*.bak
echo "✓ $OUT updated. Commit it."
