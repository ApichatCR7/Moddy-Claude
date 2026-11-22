import type { EngineInterface } from 'claude-code'

import type { ControlsSnapshot } from '../types'
import { advisorValue } from './advisors'

/** Claude Code reads an environment flag as set for these spellings only. */
const isFlagSet = (value: string | undefined): boolean =>
  value !== undefined && /^(1|true|yes|on)$/i.test(value.trim())

/**
 * Why the Mod cannot change Autocompact, or undefined when it can: something
 * outside it (an environment variable, a managed source) decides the value.
 */
async function autocompactLock(
  $: EngineInterface,
): Promise<string | undefined> {
  if (isFlagSet(await $.env.get('DISABLE_AUTO_COMPACT'))) {
    return 'turned off by DISABLE_AUTO_COMPACT'
  }
  if (isFlagSet(await $.env.get('DISABLE_COMPACT'))) {
    return 'turned off by DISABLE_COMPACT'
  }
  const rows = await $.config.list()

  return rows.find(row => row.key === 'autoCompact')?.isLocked === true
    ? 'managed by your organization'
    : undefined
}

/**
 * Reads Claude Code once and says how things stand now. Every figure comes
 * from Claude Code; the Mod keeps no opinion of its own about any of them.
 */
export async function buildSnapshot(
  $: EngineInterface,
): Promise<ControlsSnapshot> {
  const { context } = await $.session.usage({ breakdown: 'summary' })
  const advisor = await $.settings.read({ key: 'advisorModel' })

  return {
    window: context.window,
    contextPercent: context.percent,
    autocompact: {
      isOn: context.breakdown?.isAutoCompactEnabled ?? false,
      lock: await autocompactLock($),
    },
    threshold: {
      tokens: context.breakdown?.rawMaxTokens,
      isAuto: context.breakdown?.autocompactSource !== 'settings',
    },
    advisor: { model: advisorValue(advisor) },
  }
}
