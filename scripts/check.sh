#!/usr/bin/env bash
# Checks every Mod and the Marketplace: typecheck, tests, validate, and the
# version rule (a change to a Mod's shipped files needs a version bump, or
# installed copies never update).
#
#   scripts/check.sh             version rule against staged changes (pre-commit)
#   scripts/check.sh <base-ref>  version rule against <base-ref>...HEAD (CI)
set -uo pipefail

root=$(git rev-parse --show-toplevel)
cd "$root" || exit 1
base=${1:-}
types=vendor/claude-code-types/index.d.ts
status=0

fail() {
  echo "✗ $*" >&2
  status=1
}

# Runs a command quietly, showing its full output only when it fails.
quiet() {
  local label=$1 out
  shift
  if out=$("$@" 2>&1); then
    echo "✓ $label"
  else
    echo "$out" >&2
    fail "$label"
  fi
}

# A base the clone lacks (a first push, a force push) skips the version rule.
if [ -n "$base" ] && ! git cat-file -e "$base^{commit}" 2>/dev/null; then
  echo "! base $base not in this clone: skipping the version rule"
  base=skip
fi

for dir in mods/*/; do
  mod=${dir%/}
  name=$(basename "$mod")
  echo "== $name"

  # The engine writes these when it loads the Mod; a fresh clone has none.
  laid="$mod/.claude-plugin/types/claude-code/index.d.ts"
  if [ ! -f "$laid" ]; then
    mkdir -p "$(dirname "$laid")"
    cp "$types" "$laid"
  fi

  quiet "$name: typecheck" tsc -p "$mod"
  quiet "$name: tests" claude plugin test "$mod"
  quiet "$name: validate" claude plugin validate "$mod"

  case $base in
    skip) continue ;;
    '') range=(--cached) ;;
    *) range=("$base...HEAD") ;;
  esac
  shipped=$(git diff --name-only "${range[@]}" -- "$mod" | grep -v "^$mod/tests/" || true)
  bumped=$(git diff "${range[@]}" -- "$mod/.claude-plugin/plugin.json" | grep -E '^\+.*"version"' || true)
  if [ -n "$shipped" ] && [ -z "$bumped" ]; then
    fail "$name: shipped files changed but the version in $mod/.claude-plugin/plugin.json did not; bump it so installed copies update"
  fi
done

quiet "marketplace: validate" claude plugin validate .
exit $status
