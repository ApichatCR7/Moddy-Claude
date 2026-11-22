import { atom, read, update } from 'claude-code'
import type { EngineInterface } from 'claude-code'

import type { ControlsNotice, ControlsSnapshot } from '../types'
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

// Claude Code's own words about the last change, shown beside its control.
const notice = atom(
  { plugin: 'session-controls', key: 'notice' } as const,
  null,
  { shape: 'notice-1' },
)

// Which Pane control the Band asked the Pane to open at.
const focus = atom({ plugin: 'session-controls', key: 'focus' } as const, null)

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

/** The Pane control the Pane should open at, or null for the top. */
export async function readFocus($: EngineInterface): Promise<'advisor' | null> {
  return read($, focus)
}

export async function setFocus(
  $: EngineInterface,
  at: 'advisor' | null,
): Promise<void> {
  await update($, focus, () => at)
}

/** What Claude Code said about the last change, or null. */
export async function readNotice(
  $: EngineInterface,
): Promise<ControlsNotice | null> {
  return read($, notice)
}

/** Records Claude Code's words about a change; empty words clear them. */
export async function setNotice(
  $: EngineInterface,
  next: ControlsNotice | null,
): Promise<void> {
  await update($, notice, () => (next?.text === '' ? null : next))
}
