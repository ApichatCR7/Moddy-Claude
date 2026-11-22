# Coding standards

Judgement calls for reviewing a Mod diff. Mechanical rules are left to `scripts/check.sh`: typecheck, tests, validate, and the version bump. Each rule below comes from a bug that shipped, and `docs/agents/mod-platform.md` holds the platform facts the rules depend on.

## Show the effective value

What a Mod shows must be the value Claude Code is using right now, as the engine reports it. A saved setting or the Mod's own memory of the last pick is not enough. When the session and the saved setting differ, the session wins.

_Why_: the Band showed `Advisor: Off` after `/advisor opus`, because the desktop `/advisor` changes only the session and the Mod read the saved setting.

_Look for_: a displayed figure that reads `$.settings` or a stored pick when the engine has an in-effect reading (`$.session.usage`, the accepted `/advisor` reply).

## Draw without session start

Every render path must draw correctly when `session.start` never ran for this Mod, because a Mod installed from the app joins sessions that are already running. Each piece of drawn state needs a fallback to a fresh reading, and a test that mounts without `startSession`.

_Why_: the first release drew nothing after install, because its snapshot was only built at session start.

_Look for_: new state that is only filled by `session.start`, or new UI tested only after `startSession`.

## Change values through Claude Code

Change a setting only by the same means the person would use: `$.command.run` of Claude Code's own command, or `$.config.set`. A Mod must never write a settings file. Claude Code then validates the value, applies it to the session, and owns how it persists.

_Look for_: file writes to `settings.json` or anything under `~/.claude`, or a value that a Mod sets in one place and Claude Code reads from another.

## Keep the fake engine honest

`tests/engine.ts` must behave the way the desktop app does, as `docs/agents/mod-platform.md` describes it. A change that relies on engine behaviour updates the doc first, from something observed in the app, and then makes the fake match. A test passing against a fake that models the terminal proves nothing about the desktop app.

_Why_: the `/advisor` bug passed every test because the fake applied `/advisor` to the saved setting, as the terminal does.

_Look for_: a fake that gains or changes behaviour with no matching line in `mod-platform.md`, or a doc fact the fake contradicts.
