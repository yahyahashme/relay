#!/usr/bin/env bash
# usage: ./scripts/wt.sh 12 cash-confirm
set -euo pipefail
N=$1; SLUG=$2
ROOT=$(git rev-parse --show-toplevel)
git fetch origin main
git worktree add "$ROOT/../ts-$N-$SLUG" -b "$N-$SLUG" origin/main
cd "$ROOT/../ts-$N-$SLUG"
# gitignored secrets aren't copied into worktrees, so link them.
# Next.js only loads env files from app/, so link that one too.
if [ -f "$ROOT/.env.local" ]; then
  ln -s "$ROOT/.env.local" .env.local
fi
if [ -f "$ROOT/app/.env.local" ] && [ -d app ]; then
  ln -s "$ROOT/app/.env.local" app/.env.local
fi
[ -d app ] && (cd app && npm install)
# Claude Code only finds CLAUDE.md, /take-issue and the permission rules if they are in
# this worktree. A worktree starts from origin/main, so it lacks them until the setup PR is merged.
CLAUDE_FILES=(CLAUDE.md .claude/commands/take-issue.md .claude/settings.json)
missing=()
for f in "${CLAUDE_FILES[@]}"; do
  [ -f "$f" ] || missing+=("$f")
done
if [ ${#missing[@]} -gt 0 ]; then
  echo "WARNING: this worktree is missing: ${missing[*]}" >&2
  echo "This worktree was created from a main that doesn't have the Claude Code setup yet. Merge PR #49 and run git merge origin/main in this worktree, then restart claude." >&2
  # Temporary fallback: copy the files from the clone that ran this script and hide them
  # from git so they can't be committed by accident. (info/exclude is shared by all worktrees.)
  EXCLUDE=$(git rev-parse --git-path info/exclude)
  mkdir -p "$(dirname "$EXCLUDE")"
  for f in "${missing[@]}"; do
    if [ -f "$ROOT/$f" ]; then
      mkdir -p "$(dirname "$f")"
      cp "$ROOT/$f" "$f"
      grep -qxF "/$f" "$EXCLUDE" 2>/dev/null || echo "/$f" >> "$EXCLUDE"
      echo "Fallback: copied $f from $ROOT and added it to git exclude. Temporary; git merge origin/main replaces it." >&2
    else
      echo "Fallback not possible for $f: it isn't in $ROOT either." >&2
    fi
  done
fi
echo "Ready: $(pwd)  ->  run: claude"
