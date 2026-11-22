import type { ConfigRow, EngineInterface } from 'claude-code'

import type { ControlsSnapshot } from '../types'
import { advisorValue } from './advisors'

/** Claude Code reads an environment flag as set for these spellings only. */
const isFlagSet = (value: string | undefined): boolean =>
  value !== undefined && /^(1|true|yes|on)$/i.test(value.trim())

/** A reading that fails is a gap in the picture, not a reason to hide the rest. */
async function attempt<T>(reading: () => Promise<T>): Promise<T | undefined> {
  try {
    return await reading()
  } catch {
    return undefined
  }
}

/**
 * Why the Mod cannot change Autocompact, or undefined when it can: something
 * outside it (an environment variable, a managed source) decides the value.
 */
async function autocompactLock(
  $: EngineInterface,
  row: ConfigRow | undefined,
): Promise<string | undefined> {
  if (isFlagSet(await $.env.get('DISABLE_AUTO_COMPACT'))) {
    return 'turned off by DISABLE_AUTO_COMPACT'
  }
  if (isFlagSet(await $.env.get('DISABLE_COMPACT'))) {
    return 'turned off by DISABLE_COMPACT'
  }

  return row?.isLocked === true ? 'managed by your organization' : undefined
}

/**
 * Why the Mod cannot change the Advisor, or undefined when it can: the feature
 * is switched off by the environment, or Claude Code does not offer `/advisor`
 * here (the account lacks it, or the provider does not support it).
 */
async function advisorLock($: EngineInterface): Promise<string | undefined> {
  if (isFlagSet(await $.env.get('CLAUDE_CODE_DISABLE_ADVISOR_TOOL'))) {
    return 'disabled by CLAUDE_CODE_DISABLE_ADVISOR_TOOL'
  }
  const commands = await attempt(() => $.command.list())

  // Not knowing is no reason to lock a control that may well work.
  return commands === undefined ||
    commands.some(command => command.name === 'advisor')
    ? undefined
    : 'not available for this account or provider'
}

/**
 * Reads Claude Code once and says how things stand now. Every figure comes
 * from Claude Code; the Mod keeps no opinion of its own about any of them.
 *
 * Percentages are of the model's full context window (`context.window`), the
 * same basis as Context usage. The compaction window the engine measures its
 * own breakdown against is only ever read as a token count.
 */
export async function buildSnapshot(
  $: EngineInterface,
): Promise<ControlsSnapshot> {
  const usage = await attempt(() => $.session.usage({ breakdown: 'summary' }))
  const rows = await attempt(() => $.config.list())
  const advisor = await attempt(() => $.settings.read({ key: 'advisorModel' }))
  const row = rows?.find(one => one.key === 'autoCompact')
  const context = usage?.context
  const breakdown = context?.breakdown

  return {
    window: context?.window,
    contextPercent: context?.percent,
    autocompact: {
      isOn: breakdown?.isAutoCompactEnabled ?? row?.value === true,
      lock: await autocompactLock($, row),
    },
    threshold: {
      // `/autocompact` sets the window Claude Code compacts to, which is what
      // its breakdown calls `rawMaxTokens`; what the person picked reads back.
      tokens: breakdown?.rawMaxTokens,
      isAuto: breakdown?.autocompactSource !== 'settings',
      lock:
        breakdown?.autocompactSource === 'env'
          ? 'set by CLAUDE_CODE_AUTO_COMPACT_WINDOW'
          : undefined,
    },
    advisor: { model: advisorValue(advisor), lock: await advisorLock($) },
  }
}
