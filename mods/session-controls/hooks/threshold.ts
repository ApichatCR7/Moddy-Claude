import type { ControlsSnapshot } from '../types'
import { formatThreshold } from './format'

/** The only Compact thresholds the Pane offers, in tokens. */
const OFFERED_TOKENS = [400_000, 500_000, 1_000_000] as const

export type ThresholdOption = {
  /** A token count such as `500000`, `auto`, or `current` for an unlisted value. */
  value: string
  label: string
}

const AUTO: ThresholdOption = { value: 'auto', label: 'Auto' }

/** Each offered threshold that fits in the model's full window. */
function thresholdOptions(window: number): ThresholdOption[] {
  return OFFERED_TOKENS.filter(tokens => tokens <= window).map(tokens => ({
    value: String(tokens),
    label: formatThreshold(tokens, window),
  }))
}

/**
 * The picker's options and which one is selected. The value in force is added
 * when it is none of the options (Claude Code's default, or a value set by
 * command), so the true one always shows.
 */
export function thresholdChoice(
  threshold: ControlsSnapshot['threshold'],
  window: number,
): { options: ThresholdOption[]; value: string } {
  const options = thresholdOptions(window)

  if (threshold.isAuto || threshold.tokens === undefined) {
    return { options: [...options, AUTO], value: AUTO.value }
  }
  const value = String(threshold.tokens)

  if (options.some(option => option.value === value)) {
    return { options, value }
  }
  const current = { value: 'current', label: formatThreshold(threshold.tokens, window) }

  return { options: [...options, current], value: current.value }
}
