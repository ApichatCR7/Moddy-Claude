import type { EngineInterface, RenderInput } from 'claude-code'

import { pickAdvisor, pickThreshold, toggleAutocompact } from './actions'
import { advisorChoice } from './advisors'
import { formatLocked, formatOnOff, formatThreshold } from './format'
import { readFocus, readNotice, readSnapshot } from './state'
import { thresholdChoice } from './threshold'

export async function drawPane(
  $: EngineInterface,
  e: RenderInput<'Pane'>,
) {
  const { Box, Button, Select, Text } = $.ui.resolve(e)
  const state = await readSnapshot($)
  const notice = await readNotice($)
  const focus = await readFocus($)

  if (state === null) {
    return <Text dimColor>Waiting for Claude Code…</Text>
  }
  const { window, threshold } = state
  const isOn = state.autocompact.isOn
  const advisor = advisorChoice(state.advisor.model)
  const current =
    threshold.tokens === undefined || window === undefined
      ? '—'
      : formatThreshold(threshold.tokens, window)
  const choice = window === undefined ? null : thresholdChoice(threshold, window)

  return (
    <Box flexDirection="column" gap={1}>
      <Box flexDirection="column">
        <Text bold>Autocompact</Text>
        {state.autocompact.lock === undefined ? (
          <Button
            key="autocompact"
            label={`Autocompact: ${formatOnOff(isOn)} (tap to turn ${isOn ? 'off' : 'on'})`}
            onPress={() => toggleAutocompact($)}
          />
        ) : (
          <Text>
            {formatLocked(`Autocompact: ${formatOnOff(isOn)}`, state.autocompact.lock)}
          </Text>
        )}
        {notice?.section === 'autocompact' && <Text dimColor>{notice.text}</Text>}
      </Box>
      <Box flexDirection="column">
        {threshold.lock !== undefined ? (
          <Text>
            {formatLocked(`Compact threshold: ${current}`, threshold.lock)}
          </Text>
        ) : choice === null ? (
          <Text dimColor>Compact threshold: {current}</Text>
        ) : (
          <>
            <Text bold>Compact threshold</Text>
            <Select
              key="threshold"
              options={choice.options}
              value={choice.value}
              onSelect={picked => pickThreshold($, picked)}
            />
          </>
        )}
        {notice?.section === 'threshold' && <Text dimColor>{notice.text}</Text>}
      </Box>
      <Box flexDirection="column">
        {state.advisor.lock === undefined ? (
          <>
            <Text bold>Advisor model</Text>
            <Select
              key="advisor"
              options={advisor.options}
              value={advisor.value}
              {...(focus === 'advisor' ? { autoFocus: true as const } : {})}
              onSelect={picked => pickAdvisor($, picked)}
            />
          </>
        ) : (
          <Text>{formatLocked('Advisor', state.advisor.lock)}</Text>
        )}
        {notice?.section === 'advisor' && <Text dimColor>{notice.text}</Text>}
      </Box>
    </Box>
  )
}
