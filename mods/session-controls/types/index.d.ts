// What the session-controls Mod keeps in `$.state`, per session.
// A Locked control carries the short human reason it is Locked.

export type ControlsSnapshot = {
  /** The current model's full context window, in tokens. */
  window?: number
  /** Context usage: whole percent of that window. Absent until a response. */
  contextPercent?: number
  autocompact: { isOn: boolean; lock?: string }
  threshold: {
    /** The Compact threshold in tokens, as Claude Code's `/autocompact` sets it. */
    tokens?: number
    /** True while Claude Code's own default applies (no value was set). */
    isAuto: boolean
    lock?: string
  }
  /** `fable`, `opus`, `sonnet`, `off`, or the raw setting when it is none of them. */
  advisor: { model: string; lock?: string }
}

export type ControlsNotice = {
  section: 'autocompact' | 'threshold' | 'advisor'
  /** Claude Code's own words about the last change in that section. */
  text: string
}

declare module 'claude-code' {
  interface PluginState {
    'session-controls': {
      snapshot: Shaped<ControlsSnapshot | null>
      notice: Shaped<ControlsNotice | null>
      /** Which Pane control the Band asked the Pane to open at. */
      focus: 'advisor' | null
    }
  }
}
