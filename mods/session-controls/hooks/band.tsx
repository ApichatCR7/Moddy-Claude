import type { EngineInterface } from 'claude-code'

import { openPane, toggleAutocompact } from './actions'
import { advisorLabel } from './advisors'
import { formatThreshold } from './format'
import { readSnapshot } from './state'

export async function drawBand(
  $: EngineInterface,
  e: Parameters<EngineInterface['ui']['resolve']>[0],
) {
  const { Box, Button, Text } = $.ui.resolve(e)
  const state = await readSnapshot($)

  if (state === null) {
    return null
  }
  const context =
    state.contextPercent === undefined ? '—' : `${state.contextPercent}%`
  const { tokens } = state.threshold
  const threshold =
    state.autocompact.isOn && tokens !== undefined && state.window !== undefined
      ? ` · ${formatThreshold(tokens, state.window)}`
      : ''

  const autocompact = `Autocompact: ${state.autocompact.isOn ? 'ON' : 'OFF'}`

  return (
    <Box key="band" flexDirection="row" flexWrap="wrap" columnGap={3}>
      {state.autocompact.lock === undefined ? (
        <Button
          key="autocompact"
          label={`${autocompact}${threshold}`}
          onPress={() => toggleAutocompact($)}
        />
      ) : (
        <Text>
          {autocompact} 🔒 {state.autocompact.lock}
        </Text>
      )}
      <Text>Context: {context}</Text>
      {state.advisor.lock === undefined ? (
        <Button
          key="advisor"
          label={`Advisor: ${advisorLabel(state.advisor.model)}`}
          onPress={() => openPane($, 'advisor')}
        />
      ) : (
        <Text>Advisor: 🔒 {state.advisor.lock}</Text>
      )}
      <Button key="pane" label="⚙" onPress={() => openPane($, null)} />
    </Box>
  )
}
