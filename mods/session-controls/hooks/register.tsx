import type { Register } from 'claude-code'

import { drawBand } from './band'
import { drawPane } from './pane'
import { refresh, setNotice } from './state'

export const register: Register = on => {
  // So the Band is right before the first message.
  on('session.start', async ($, e, next) => {
    const started = await next(e)
    await refresh($)

    return started
  })

  // After each main turn: this also catches what the person typed meanwhile
  // (`/autocompact`, `/advisor`, `/model`).
  on('session.measure', async ($, e, next) => {
    const measured = await next(e)
    // Claude Code's words about an earlier change may be stale by now.
    await setNotice($, null)
    await refresh($)

    return measured
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    // A survey holds the band while it is up: the Band gives way to it.
    if (e.props.hasSurvey) {
      return next(e)
    }
    const row = await drawBand($, e)

    return row ?? next(e)
  })

  // The same id `openPane` opens the Pane under.
  on('ui.render', { component: 'Pane', requestId: 'session-controls' }, ($, e) =>
    drawPane($, e),
  )
}
