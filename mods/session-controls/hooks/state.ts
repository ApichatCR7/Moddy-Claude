import { atom, read, update } from 'claude-code'
import type { EngineInterface } from 'claude-code'

import type { ControlsNotice, ControlsSnapshot } from '../types'
import { advisorValue } from './advisors'
import { buildSnapshot } from './snapshot'

// Every read and write of the Mod's session state lives in this file: the
// engine reads a module's state use off its source, so each atom is written in
// the file that reads it. Other files call these functions with `$`.

// Change a tag when that value's fields change: it declines what an earlier
// version stored, which outlives a reload.
const snapshot = atom(
  { plugin: 'session-controls', key: 'snapshot' } as const,
  null,
  { shape: 'snapshot-2' },
)

// Claude Code's own words about the last change, shown beside its control.
const notice = atom(
  { plugin: 'session-controls', key: 'notice' } as const,
  null,
  { shape: 'notice-1' },
)

// The Advisor this session uses, once an `/advisor` was accepted.
const sessionAdvisor = atom(
  { plugin: 'session-controls', key: 'sessionAdvisor' } as const,
  null,
)

/** The `$.store` key for the Advisor model the person last set. */
const REMEMBERED_ADVISOR = 'advisor'

/** How Claude Code's `/advisor` begins its answer when it made the change. */
const ADVISOR_ACCEPTED = /^Advisor (set to|disabled)/i

// Which Pane control the Band asked the Pane to open at.
const focus = atom({ plugin: 'session-controls', key: 'focus' } as const, null)

/** Rebuilds the snapshot; the Band and the Pane redraw when it changes. */
export async function refresh($: EngineInterface): Promise<void> {
  const next = await buildSnapshot($)

  await update($, snapshot, () => next)
}

/**
 * The snapshot as last built or, before the first one, a fresh one read from
 * Claude Code. A Mod installed mid-session joins after `session.start` has
 * passed, and a render hook may not write state, so it draws from a fresh read
 * until the next refresh stores one.
 */
export async function readSnapshot(
  $: EngineInterface,
): Promise<ControlsSnapshot> {
  const base = (await read($, snapshot)) ?? (await buildSnapshot($))
  const advisor = await read($, sessionAdvisor)

  // The saved setting says nothing about a change made for this session only.
  return advisor === null
    ? base
    : { ...base, advisor: { ...base.advisor, model: advisor } }
}

/**
 * Notes what an `/advisor` run did to this session, whoever typed it: the
 * model it named, once Claude Code's answer says the change was made. A bare
 * `/advisor` only asks, and a rejection changes nothing.
 */
export async function noteAdvisorRun(
  $: EngineInterface,
  args: string,
  text: string,
): Promise<void> {
  const named = args.trim()

  if (named === '' || !ADVISOR_ACCEPTED.test(text.trim())) {
    return
  }
  const model = advisorValue(named)

  await update($, sessionAdvisor, () => model)
  // Kept past the session: the next one starts by setting it again.
  await $.store.set(REMEMBERED_ADVISOR, model)
}

/** The Advisor model last set in any session, or undefined for none. */
export async function readRememberedAdvisor(
  $: EngineInterface,
): Promise<string | undefined> {
  const model = await $.store.get(REMEMBERED_ADVISOR)

  return typeof model === 'string' && model !== '' ? model : undefined
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
