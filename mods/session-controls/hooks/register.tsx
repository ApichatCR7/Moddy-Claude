import type { Register } from 'claude-code'

import { drawBand } from './band'
import { refresh } from './state'

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await refresh($)

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const row = await drawBand($, e)

    return row ?? next(e)
  })
}
