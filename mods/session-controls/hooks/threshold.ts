import type { ControlsSnapshot } from '../types'
import { formatThreshold } from './format'

/** Claude Code refuses an Autocompact window under this many tokens. */
const MINIMUM_TOKENS = 100_000

const PERCENTS = [50, 60, 70, 80, 90] as const

export type ThresholdOption = {
  /** `auto`, a percent such as `80`, or `current` for an unlisted value. */
  value: string
  label: string
}

const AUTO: ThresholdOption = { value: 'auto', label: 'Auto' }

/** Tokens for a percent of the model's full window, as `/autocompact` takes. */
export const tokensFor = (percent: number, window: number): number =>
  Math.round((percent / 100) * window)

/** Auto, then each percent whose token count Claude Code would accept. */
function thresholdOptions(window: number): ThresholdOption[] {
  const listed = PERCENTS.map(percent => ({
    percent,
    tokens: tokensFor(percent, window),
  }))
    .filter(({ tokens }) => tokens >= MINIMUM_TOKENS)
    .map(({ percent, tokens }) => ({
      value: String(percent),
      label: formatThreshold(tokens, window),
    }))

  return [AUTO, ...listed]
}

/**
 * The picker's options and which one is selected. A value set earlier (by
 * command, say) that matches no option is added, so the true one always shows.
 */
export function thresholdChoice(
  threshold: ControlsSnapshot['threshold'],
  window: number,
): { options: ThresholdOption[]; value: string } {
  const options = thresholdOptions(window)

  if (threshold.isAuto || threshold.tokens === undefined) {
    return { options, value: AUTO.value }
  }
  const { tokens } = threshold
  const listed = options.find(
    option => option.value !== AUTO.value && tokensFor(Number(option.value), window) === tokens,
  )

  if (listed !== undefined) {
    return { options, value: listed.value }
  }
  const current = { value: 'current', label: formatThreshold(tokens, window) }

  return { options: [...options, current], value: current.value }
}
