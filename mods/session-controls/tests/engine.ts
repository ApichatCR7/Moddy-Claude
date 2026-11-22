// A small fake of Claude Code, standing beneath the Mod at its one seam: the
// engine capabilities the Mod uses (session usage, settings read, config
// list/set, command run/list, env, pane open). It behaves like the real one in
// the few ways the Mod can observe, so a test can change something, then look
// at what the user sees. Nothing here knows how the Mod is built.
import { mock } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type {
  CommandInfo,
  ConfigRow,
  ContextWindowSource,
  On,
  PaneOpenArgs,
  SessionContextBreakdown,
} from 'claude-code'

export type EngineState = {
  /** The current model's full context window. */
  window: number
  /** Context usage as Claude Code reports it; undefined before a response. */
  contextUsage?: number
  isAutoCompactEnabled: boolean
  /** What Claude Code reports as the compaction window in force. */
  autoCompactWindow: number
  autocompactSource: ContextWindowSource
  /** The `advisorModel` setting as saved; undefined when none. */
  advisorModel?: string
  /** Whether `/advisor` is offered at all (feature, account, provider). */
  isAdvisorOffered: boolean
  /** Environment variables the session was started with. */
  env: Record<string, string>
  /** A managed source owns the `autoCompact` row. */
  isAutoCompactRowLocked: boolean
  /** `session.usage` fails, as it does where no session is bound yet. */
  isUsageUnavailable?: boolean
  /** What `config.set` answers for `autoCompact` instead of accepting. */
  configDeny?: string
  /**
   * The Advisor this session uses after `/advisor`, which the desktop app
   * keeps for the session only. Claude Code offers the Mod no way to read it.
   */
  sessionAdvisor?: string
  /** What `/advisor <model>` answers instead of accepting. */
  advisorRejection?: string
  /** What Claude Code says when it accepts a change. */
  settleText: string
}

export type Call =
  | { call: 'session.usage'; breakdown: string | undefined }
  | { call: 'config.set'; key: string; value: unknown }
  | { call: 'command.run'; command: string; args: string }
  | { call: 'ui.open'; pane: PaneOpenArgs }
  | { call: 'ui.toast'; text: string }

/** Where Claude Code starts compacting sits this far below its compaction window. */
const RESERVED_BELOW_WINDOW = 33_000

/** How the desktop app's `/advisor` ends its answer. */
const FOR_THIS_SESSION =
  ' for this session \u2014 run /advisor in the terminal to change your default'

/** Claude Code's own words, as the fake engine answers. */
export const ACCEPTED = 'Claude Code accepted that.'

export const fakeEngine = (on: On, initial: Partial<EngineState> = {}) => {
  const state: EngineState = {
    window: 200_000,
    isAutoCompactEnabled: true,
    autoCompactWindow: 200_000,
    autocompactSource: 'auto',
    isAdvisorOffered: true,
    env: {},
    isAutoCompactRowLocked: false,
    settleText: ACCEPTED,
    ...initial,
  }
  const calls: Call[] = []

  mock.env(on, state.env)

  // Claude Code reports the effective state: an environment variable that
  // disables compaction wins over the saved setting.
  const isOn = () =>
    state.isAutoCompactEnabled &&
    state.env.DISABLE_AUTO_COMPACT === undefined &&
    state.env.DISABLE_COMPACT === undefined

  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.measure', (_, e) => ({ changed: e.changed }))

  on('session.usage', (_, e) => {
    calls.push({ call: 'session.usage', breakdown: e.breakdown })
    if (state.isUsageUnavailable === true) {
      throw new Error('no session bound')
    }
    const tokens =
      state.contextUsage === undefined
        ? undefined
        : Math.round((state.contextUsage / 100) * state.window)
    // The engine measures the breakdown against the compaction window, and its
    // trigger point sits below that window. The Mod has to see through both.
    const breakdown = {
      isAutoCompactEnabled: isOn(),
      autoCompactThreshold: isOn()
        ? state.autoCompactWindow - RESERVED_BELOW_WINDOW
        : undefined,
      rawMaxTokens: state.autoCompactWindow,
      autocompactSource: state.autocompactSource,
      percentage: 0,
    } as unknown as SessionContextBreakdown

    return {
      value: {
        startedAt: 0,
        rateLimits: [],
        context: {
          window: state.window,
          tokens,
          percent: state.contextUsage,
          ...(e.breakdown === undefined ? {} : { breakdown }),
        },
      },
    }
  })

  on('settings.read', () => ({
    value:
      state.advisorModel === undefined
        ? {}
        : { advisorModel: state.advisorModel },
  }))

  on('config.list', () => {
    const row: ConfigRow = {
      key: 'autoCompact',
      label: 'Auto-compact',
      kind: 'boolean',
      value: state.isAutoCompactEnabled,
      provider: { plugin: 'engine', tier: 'core' },
      isLocked: state.isAutoCompactRowLocked,
    }

    return { value: [row] }
  })

  on('config.set', (_, e) => {
    calls.push({ call: 'config.set', key: e.key, value: e.value })

    if (state.configDeny !== undefined) {
      return { deny: state.configDeny }
    }
    state.isAutoCompactEnabled = e.value === true

    return { value: e.value }
  })

  on('command.list', () => {
    const names = state.isAdvisorOffered
      ? ['autocompact', 'advisor', 'compact']
      : ['autocompact', 'compact']
    const commands: CommandInfo[] = names.map(name => ({
      name,
      description: '',
      source: 'builtin',
    }))

    return { value: commands }
  })

  on('command.run', (_, e) => {
    calls.push({ call: 'command.run', command: e.command, args: e.args })

    if (e.command === 'autocompact') {
      if (e.args === 'auto') {
        state.autocompactSource = 'auto'
        state.autoCompactWindow = state.window
      } else {
        state.autocompactSource = 'settings'
        state.autoCompactWindow = Number(e.args)
      }

      return { text: state.settleText }
    }

    if (e.command === 'advisor') {
      if (e.args === '') {
        return { text: `Advisor: ${state.sessionAdvisor ?? state.advisorModel ?? 'off'}` }
      }
      if (state.advisorRejection !== undefined) {
        return { text: state.advisorRejection }
      }
      // As on the desktop app: the Advisor changes for this session only and
      // the saved `advisorModel` setting stays as it was.
      state.sessionAdvisor = e.args

      return {
        text:
          e.args === 'off'
            ? `Advisor disabled${FOR_THIS_SESSION}`
            : `Advisor set to ${e.args[0]?.toUpperCase()}${e.args.slice(1)} 5.5${FOR_THIS_SESSION}`,
      }
    }

    return { text: '' }
  })

  on('ui.open', (_, e) => {
    calls.push({ call: 'ui.open', pane: e })

    return { value: { isPlaced: true } }
  })

  on('ui.toast', (_, e) => {
    calls.push({ call: 'ui.toast', text: e.text })

    return { value: undefined }
  })

  return { state, calls }
}

/** Starts the session as the desktop app does. */
export const startSession = ($: Engine) =>
  $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

/** The event Claude Code raises after a main turn, with new Context usage. */
export const measured = (percent: number) => ({
  context: { window: 200_000, percent },
  rateLimits: [],
  changed: ['context' as const],
})

/** A slash command as the person types it in the desktop app's prompt box. */
export const typed = (command: string, args: string) => ({
  command,
  args,
  origin: { kind: 'composer' as const },
  presentation: { isFullscreen: false, columns: 120 },
})
