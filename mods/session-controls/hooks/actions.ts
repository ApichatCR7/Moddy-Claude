import type { EngineInterface } from 'claude-code'

import { readSnapshot, refresh } from './state'

// Every change goes through Claude Code's own channels and is saved by it for
// all future sessions. The Mod never writes a settings file. After each action
// the snapshot is rebuilt, so what is drawn is what Claude Code ended up with.

/** Turns Autocompact on or off, the opposite of how it stands now. */
export async function toggleAutocompact($: EngineInterface): Promise<void> {
  const state = await readSnapshot($)

  if (state === null) {
    return
  }
  await $.config.set({ key: 'autoCompact', value: !state.autocompact.isOn })
  await refresh($)
}
