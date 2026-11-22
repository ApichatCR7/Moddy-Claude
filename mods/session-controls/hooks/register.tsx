import type { Register } from 'claude-code'

import { openWidget, restoreAdvisor } from './actions'
import { drawBand } from './band'
import { drawPane } from './pane'
import { noteAdvisorRun, refresh, setNotice } from './state'

export const register: Register = on => {
  // So the Band is right before the first message.
  on('session.start', async ($, e, next) => {
    const started = await next(e)
    await restoreAdvisor($)
    await refresh($)
    await openWidget($)

    return started
  })

  // After each main turn: this also catches what the person typed meanwhile
  // (`/autocompact`, `/advisor`, `/model`).
  on('session.measure', async ($, e, next) => {
    const measured = await next(e)
    // Claude Code's words about an earlier change may be stale by now.
    await setNotice($, null)
    await refresh($)
    // A Mod installed mid-session missed `session.start`: open it now.
    await openWidget($)

    return measured
  })

  // A slash command runs no turn, so `session.measure` would not catch it:
  // the Band shows what `/advisor` or `/autocompact` did as soon as it ran.
  on('command.run', { command: 'advisor' }, async ($, e, next) => {
    const result = await next(e)
    await noteAdvisorRun($, e.args, result.text ?? '')
    await refresh($)

    return result
  })

  on('command.run', { command: 'autocompact' }, async ($, e, next) => {
    const result = await next(e)
    await refresh($)

    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    // A survey holds the band while it is up: the Band gives way to it.
    if (e.props.hasSurvey) {
      return next(e)
    }
    return drawBand($, e)
  })

  // The same id `openPane` opens the Pane under.
  on('ui.render', { component: 'Pane', requestId: 'session-controls' }, ($, e) =>
    drawPane($, e),
  )
}
