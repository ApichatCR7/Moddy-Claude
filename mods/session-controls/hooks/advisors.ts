// The Advisor models the Mod offers. It does not encode which one may advise
// which main model: Claude Code decides that and says so when it refuses.
export const ADVISOR_MODELS = [
  { value: 'fable', label: 'Fable' },
  { value: 'opus', label: 'Opus' },
  { value: 'sonnet', label: 'Sonnet' },
  { value: 'off', label: 'Off' },
] as const

/** The picker value for the saved `advisorModel` setting. */
export const advisorValue = (setting: unknown): string => {
  if (typeof setting !== 'string' || setting === '') {
    return 'off'
  }
  const lowered = setting.toLowerCase()
  const known = ADVISOR_MODELS.find(
    one => one.value !== 'off' && lowered.includes(one.value),
  )

  return known?.value ?? setting
}

export const advisorLabel = (value: string): string =>
  ADVISOR_MODELS.find(one => one.value === value)?.label ?? value
