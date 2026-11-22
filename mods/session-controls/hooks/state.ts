import { atom, read, update } from 'claude-code'
import type { EngineInterface } from 'claude-code'

import type { ControlsSnapshot } from '../types'
import { buildSnapshot } from './snapshot'

// Every read and write of the Mod's session state lives in this file: the
// engine reads a module's state use off its source, so each atom is written in
// the file that reads it. Other files call these functions with `$`.

// Change a tag when that value's fields change: it declines what an earlier
// version stored, which outlives a reload.
const snapshot = atom(
  { plugin: 'session-controls', key: 'snapshot' } as const,
  null,
  { shape: 'snapshot-1' },
)

/** Rebuilds the snapshot; the Band and the Pane redraw when it changes. */
export async function refresh($: EngineInterface): Promise<void> {
  const next = await buildSnapshot($)

  await update($, snapshot, () => next)
}

/** The snapshot as last built, or null before the first one. */
export async function readSnapshot(
  $: EngineInterface,
): Promise<ControlsSnapshot | null> {
  return read($, snapshot)
}
