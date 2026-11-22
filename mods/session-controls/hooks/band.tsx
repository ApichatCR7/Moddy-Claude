import type { EngineInterface, RenderInput } from 'claude-code'

import { openPane, toggleAutocompact } from './actions'
import { advisorLabel } from './advisors'
import { formatLocked, formatOnOff, formatThreshold } from './format'
import { readSnapshot } from './state'

export async function drawBand(
  $: EngineInterface,
  e: RenderInput<'AbovePrompt'>,
) {
  const { Box, Button, Text } = $.ui.resolve(e)
  const state = await readSnapshot($)
  const context =
    state.contextUsage === undefined ? '—' : `${state.contextUsage}%`
  const { tokens } = state.threshold
  const threshold =
    state.autocompact.isOn && tokens !== undefined && state.window !== undefined
      ? ` · ${formatThreshold(tokens, state.window)}`
      : ''
  const autocompact = `Autocompact: ${formatOnOff(state.autocompact.isOn)}`

  return (
    <Box key="band" flexDirection="row" flexWrap="wrap" columnGap={3}>
      {state.autocompact.lock === undefined ? (
        <Button
          key="autocompact"
          label={`${autocompact}${threshold}`}
          onPress={() => toggleAutocompact($)}
        />
      ) : (
        <Text>{formatLocked(autocompact, state.autocompact.lock)}</Text>
      )}
      <Text>Context: {context}</Text>
      {state.advisor.lock === undefined ? (
        <Button
          key="advisor"
          label={`Advisor: ${advisorLabel(state.advisor.model)}`}
          onPress={() => openPane($, 'advisor')}
        />
      ) : (
        <Text>{formatLocked('Advisor', state.advisor.lock)}</Text>
      )}
      <Button key="pane" label="⚙" onPress={() => openPane($, null)} />
    </Box>
  )
}
