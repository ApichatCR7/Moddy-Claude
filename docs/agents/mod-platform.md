# Mod platform

Facts about Claude Code's Mod engine and the desktop app that this repo has verified. Neither the engine types nor the `plugin-authoring` skill says these, and each one cost a release to find. When an observation contradicts a line here, fix the line in the same commit as the code.

## The desktop app

The Mods here are made for the Claude Code desktop app. It behaves differently from the terminal in ways the engine API hides:

- **`/advisor` is per session.** It changes only the current session and replies `Advisor set to <model> for this session — run /advisor in the terminal to change your default`. The saved `advisorModel` setting stays as it was. A Mod that shows the Advisor must use the session's value (the last accepted `/advisor` reply), not the saved one. Turning the Advisor on or off applies at once; a change of model applies after the next `/clear` or `/compact`.
- **No widgets.** `$.ui.open` with `placement: 'widget'` returns `isPlaced: true`, but the app draws a full docked Pane.
- **No toolbar.** The mod API has no site for an icon in the app's toolbar.
- **Installed mid-session.** A Mod installed from the app becomes active in sessions already running, after their `session.start` has fired. Every render must therefore work from a fresh reading of the engine, with no state stored at session start.
- **Band timing.** In a local session the `AbovePrompt` Band appears only after the chat has started.
- **Transcript rows.** Every `$.command.run` leaves a command row and an output row in the chat. The user accepted this for this repo's Mods, so do not try to hide them.

## Compaction

- `/autocompact <tokens>` sets the current model's auto-compact window (the glossary's Compact threshold). The minimum is 100k.
- Compaction actually starts earlier, at about `window − min(maxOutput, 20000) − 13000`.
- `$.session.usage({ breakdown: 'summary' })` reports what is in effect:
  - `context.breakdown.rawMaxTokens` is the window that `/autocompact` set.
  - `autocompactSource` is `'settings'` when someone picked it and `'env'` when `CLAUDE_CODE_AUTO_COMPACT_WINDOW` decides it.
  - `isAutoCompactEnabled` says whether Autocompact is on.

## Engine rules

The engine enforces these at load time or runtime, and none of them appear in the types:

- A `ui.render` hook cannot write `$.state`. Write it from an action or another hook.
- `$` can be passed only into function declarations, not into arrow functions stored in variables.
- Every `$.state` atom must be read and written in the same file. In `session-controls` they all live in `hooks/state.ts`.
- `$.state` lasts one session. `$.store` lasts across sessions.

## Types

The engine writes its types to `<mod>/.claude-plugin/types/claude-code/index.d.ts` when it loads a Mod. That folder is gitignored, and no CLI command lays it, so a fresh clone cannot typecheck. `vendor/claude-code-types/index.d.ts` is a pinned copy (its first line names the Claude Code version that wrote it), and `scripts/check.sh` lays it into any Mod that lacks one.

When Claude Code updates, refresh the vendored copy from a loaded Mod's types folder. Then bump the version pins in `.github/workflows/check.yml` to match.

## Testing

- `claude plugin test <mod>` runs a Mod's tests through `claude-code/testing`. It needs no login and no type files.
- A test that calls `$.command.run` must pass `origin` and `presentation` (`typed()` in `session-controls/tests/engine.ts` builds them).
- The fake engine in `tests/engine.ts` stands in for the desktop app. Its behaviour must match the facts on this page; that is how a test catches the desktop-only bugs above.
- `scripts/check.sh` runs typecheck, tests and `claude plugin validate` for every Mod and the Marketplace, along with the version rule. The pre-commit hook and CI both call it.

## Trying a Mod in the app

Tests use the fake engine. To see the real app, load the working copy into this session:

1. Run `scripts/dev-load.sh <mod>`. It copies the Mod into `~/.claude/dev-mods/$CLAUDE_CODE_SESSION_ID/`, and the engine reloads it when the turn ends.
2. End the turn and ask the user to look at the session in the app, or to do the action under test.
3. To learn what the engine returned, have the dev copy write the value to `$.store` and read it back from `~/.claude/plugins/store/<mod>_inline-<hash>.json`. No debug log is written by default.
4. Keep diagnostic code in the dev copy only. Reload the clean working copy and delete the store file when done.

Run `claude plugin list` first. If the same Mod is also installed (the Default cloud environment's setup script installs `session-controls` in new sessions), both copies may draw.

## Releasing

- The Marketplace is `.claude-plugin/marketplace.json`. The app installs Mods from this public repo. The cloud setup script cannot fetch a private one, so the repo must stay public.
- An installed copy updates only when the Mod's `version` in `.claude-plugin/plugin.json` changes. `scripts/check.sh` fails a change to a Mod's shipped files (everything except `tests/`) that leaves the version unchanged.
- A local install is updated by reinstalling it from the app.
