# AGENTS.md

## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues for `ApichatCR7/Moddy-Claude`. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default label names: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Mods

Read `docs/agents/mod-platform.md` before writing, testing, trying in the app or releasing a Mod. It holds the desktop app's behaviour, the engine rules, the dev-load loop and the version rule. `scripts/check.sh` runs every check. Enable it once per clone as the pre-commit hook: `git config core.hooksPath .githooks`.
