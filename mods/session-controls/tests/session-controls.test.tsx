import { expect, test } from 'claude-code/testing'

import { fakeEngine } from './engine'

const PLUGIN = 'session-controls'

const BAND = {
  plugin: PLUGIN,
  surface: 'desktop',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isCollapsed: false,
    isWorking: false,
    maxRows: 6,
    bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 6 },
    view: {},
  },
} as const

const startSession = ($: { session: { start: (e: never) => Promise<unknown> } }) =>
  $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true } as never)

test('the Band shows Context usage and the Advisor model', async ($, on) => {
  fakeEngine(on, { contextPercent: 62, advisorModel: 'opus' })
  await startSession($)

  const ui = await $.ui.mount(BAND)
  const band = await ui.find({ type: 'Box', key: 'band' })

  expect(band?.text).toContain('Context: 62%')
  expect(band?.text).toContain('Advisor: Opus')
  await ui.unmount()
})

test('the Band shows Autocompact on, with its Compact threshold in tokens and percent', async ($, on) => {
  fakeEngine(on, { compactWindow: 160_000, compactSource: 'settings' })
  await startSession($)

  const ui = await $.ui.mount(BAND)
  const band = await ui.find({ type: 'Box', key: 'band' })

  expect(band?.text).toContain('Autocompact: ON · 160k (80%)')
  await ui.unmount()
})

test('the Band shows Autocompact off without a Compact threshold', async ($, on) => {
  fakeEngine(on, { isAutoCompactEnabled: false, compactWindow: 160_000 })
  await startSession($)

  const ui = await $.ui.mount(BAND)
  const band = await ui.find({ type: 'Box', key: 'band' })

  expect(band?.text).toContain('Autocompact: OFF')
  expect(band?.text).not.toContain('160k')
  await ui.unmount()
})

const bandText = async (ui: { find: (q: { type: string; key: string }) => Promise<{ text: string } | undefined> }) =>
  (await ui.find({ type: 'Box', key: 'band' }))?.text

test('tapping Autocompact sets the autoCompact config row to off, and the Band shows it off', async ($, on) => {
  const engine = fakeEngine(on)
  await startSession($)
  const ui = await $.ui.mount(BAND)

  await ui.press({ key: 'autocompact' })

  expect(engine.calls).toContainEqual({
    call: 'config.set',
    key: 'autoCompact',
    value: false,
  })
  expect(await bandText(ui)).toContain('Autocompact: OFF')
  await ui.unmount()
})

test('tapping Autocompact while it is off turns it on', async ($, on) => {
  const engine = fakeEngine(on, { isAutoCompactEnabled: false })
  await startSession($)
  const ui = await $.ui.mount(BAND)

  await ui.press({ key: 'autocompact' })

  expect(engine.calls).toContainEqual({
    call: 'config.set',
    key: 'autoCompact',
    value: true,
  })
  expect(await bandText(ui)).toContain('Autocompact: ON')
  await ui.unmount()
})

const locked = async (
  ui: { find: (q: { type: string; text: RegExp }) => Promise<{ text: string } | undefined> },
  control: string,
) => (await ui.find({ type: 'Text', text: new RegExp(`${control}.*🔒`) }))?.text

for (const variable of ['DISABLE_AUTO_COMPACT', 'DISABLE_COMPACT']) {
  test(`${variable} makes the Autocompact control Locked with a reason, and a tap makes no call`, async ($, on) => {
    const engine = fakeEngine(on, { env: { [variable]: '1' } })
    await startSession($)
    const ui = await $.ui.mount(BAND)

    expect(await locked(ui, 'Autocompact')).toContain(variable)
    expect(await ui.find({ type: 'Button', key: 'autocompact' })).toBeUndefined()
    expect(engine.calls.filter(call => call.call === 'config.set')).toEqual([])
    await ui.unmount()
  })
}

test('an environment variable set to 0 does not lock Autocompact', async ($, on) => {
  fakeEngine(on, { env: { DISABLE_AUTO_COMPACT: '0' } })
  await startSession($)
  const ui = await $.ui.mount(BAND)

  expect(await ui.find({ type: 'Button', key: 'autocompact' })).toBeDefined()
  await ui.unmount()
})

test('a managed source that owns the autoCompact row makes Autocompact Locked', async ($, on) => {
  fakeEngine(on, { isAutoCompactRowLocked: true })
  await startSession($)
  const ui = await $.ui.mount(BAND)

  expect(await locked(ui, 'Autocompact')).toContain('organization')
  expect(await ui.find({ type: 'Button', key: 'autocompact' })).toBeUndefined()
  await ui.unmount()
})
