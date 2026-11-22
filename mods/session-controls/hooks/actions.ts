import type { EngineInterface } from 'claude-code'

import { PANE_ID, PANE_TITLE } from './pane-id'
import { readSavedAdvisor } from './snapshot'
import {
  claimWidgetOpening,
  noteAdvisorRun,
  readRememberedAdvisor,
  readSnapshot,
  refresh,
  setFocus,
  setNotice,
} from './state'

// Every change goes through Claude Code's own channels and is saved by it for
// all future sessions. The Mod never writes a settings file. After each action
// the snapshot is rebuilt, so what is drawn is what Claude Code ended up with.

/** Turns Autocompact on or off, the opposite of how it stands now. */
export async function toggleAutocompact($: EngineInterface): Promise<void> {
  const state = await readSnapshot($)

  await setNotice($, null)
  const { deny } = await $.config.set({
    key: 'autoCompact',
    value: !state.autocompact.isOn,
  })

  if (deny !== undefined) {
    await setNotice($, { section: 'autocompact', text: deny })
    $.ui.toast(deny)
  }
  await refresh($)
}

/**
 * Opens the Pane, at the top or, from the Band's Advisor segment, at the
 * Advisor model picker.
 */
export async function openPane(
  $: EngineInterface,
  at: 'advisor' | null,
): Promise<void> {
  await setFocus($, at)
  await $.ui.open({
    id: PANE_ID,
    title: PANE_TITLE,
    ...(at === null ? {} : { focus: true as const }),
  })
}

/**
 * Sets the Compact threshold for the model in use now: a token count such as
 * `500000`, as Claude Code's `/autocompact` takes it. Claude Code saves it per
 * model and applies it to this session at once.
 */
export async function pickThreshold(
  $: EngineInterface,
  value: string,
): Promise<void> {
  if (value === 'current' || value === 'auto') {
    return
  }
  await runCommand($, 'threshold', 'autocompact', value)
}

/**
 * Sets the Advisor model: `fable`, `opus`, `sonnet` or `off`. Claude Code
 * saves it and decides whether the model may advise this one; if it refuses,
 * its words are shown and the display keeps the value Claude Code kept.
 */
export async function pickAdvisor(
  $: EngineInterface,
  value: string,
): Promise<void> {
  await runCommand($, 'advisor', 'advisor', value)
}

/**
 * Runs one of Claude Code's own commands, keeps what it answered next to the
 * control that asked, then rebuilds the snapshot so the display shows the
 * value Claude Code ended up with, a rejected change included.
 */
async function runCommand(
  $: EngineInterface,
  section: 'threshold' | 'advisor',
  command: string,
  args: string,
): Promise<void> {
  await setNotice($, null)
  const { text } = await $.command.run({ command, args })

  if (command === 'advisor') {
    await noteAdvisorRun($, args, text ?? '')
  }

  await setNotice($, { section, text: text ?? '' })
  await refresh($)
}

/**
 * Opens the Pane in its small form, the Widget, once per session. On a
 * surface with no widgets it opens as the full Pane.
 */
export async function openWidget($: EngineInterface): Promise<void> {
  if (!(await claimWidgetOpening($))) {
    return
  }
  await $.ui.open({ id: PANE_ID, title: PANE_TITLE, placement: 'widget' })
}

/**
 * Sets the remembered Advisor model again as a session starts: the desktop
 * app keeps an `/advisor` change for one session only. Nothing runs when none
 * is remembered or it is what the settings already say.
 */
export async function restoreAdvisor($: EngineInterface): Promise<void> {
  const remembered = await readRememberedAdvisor($)

  if (remembered === undefined || remembered === (await readSavedAdvisor($))) {
    return
  }
  const { text } = await $.command.run({ command: 'advisor', args: remembered })

  await noteAdvisorRun($, remembered, text ?? '')
}
