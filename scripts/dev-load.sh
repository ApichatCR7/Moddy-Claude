#!/usr/bin/env bash
# Loads a Mod into the running Claude Code session: copies mods/<name>/ into
# the session's dev-mods folder, which the engine reloads when the turn ends.
#
#   scripts/dev-load.sh <mod-name>
set -euo pipefail

name=${1:?usage: scripts/dev-load.sh <mod-name>}
root=$(git rev-parse --show-toplevel)
src="$root/mods/$name"
[ -d "$src" ] || { echo "no Mod at mods/$name" >&2; exit 1; }

session=${CLAUDE_CODE_SESSION_ID:?not inside a Claude Code session}
dest="$HOME/.claude/dev-mods/$session/$name"

mkdir -p "$(dirname "$dest")"
rm -rf "$dest"
cp -r "$src" "$dest"

version=$(grep -o '"version": *"[^"]*"' "$src/.claude-plugin/plugin.json")
echo "loaded $name ($version) into $dest: it reloads when this turn ends"
