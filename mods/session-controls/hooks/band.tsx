import type { EngineInterface, RenderInput } from 'claude-code'

import { openPane, toggleAutocompact } from './actions'
import { advisorLabel } from './advisors'
import { formatLocked, formatOnOff } from './format'
import { readSnapshot } from './state'

/**
 * The Band: one short row above the prompt with Autocompact ON or OFF, the
 * Advisor model and a gear. The Compact threshold lives in the Pane.
 */
export async function drawBand(
  $: EngineInterface,
  e: RenderInput<'AbovePrompt'>,
) {
  const { Box, Button, Text } = $.ui.resolve(e)
  const state = await readSnapshot($)
  const autocompact = `Autocompact: ${formatOnOff(state.autocompact.isOn)}`

  return (
    <Box key="band" flexDirection="row" flexWrap="wrap" columnGap={2}>
      {state.autocompact.lock === undefined ? (
        <Button
          key="autocompact"
          label={autocompact}
          onPress={() => toggleAutocompact($)}
        />
      ) : (
        <Text>{formatLocked(autocompact, state.autocompact.lock)}</Text>
      )}
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
