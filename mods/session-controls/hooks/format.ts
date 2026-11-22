/** 160000 -> `160k`. */
export const formatTokens = (tokens: number): string =>
  `${Math.round(tokens / 1000)}k`

/** Whole percent of the model's full context window, never past 100. */
export const percentOf = (tokens: number, window: number): number =>
  Math.min(100, Math.round((tokens / window) * 100))

/** The Compact threshold as `<tokens in k> (<percent>%)`, e.g. `160k (80%)`. */
export const formatThreshold = (tokens: number, window: number): string =>
  `${formatTokens(tokens)} (${percentOf(tokens, window)}%)`

export const formatOnOff = (isOn: boolean): string => (isOn ? 'ON' : 'OFF')

/** A Locked control: its label, a lock and the reason, as one line. */
export const formatLocked = (label: string, reason: string): string =>
  `${label} 🔒 ${reason}`
