import { expect, test } from 'claude-code/testing'

import { fakeEngine, measured, startSession } from './engine'
import {
  BAND,
  PANE,
  PANE_ID,
  bandText,
  chosenIn,
  lockedText as locked,
  optionsOf,
} from './screen'

test('the Band shows Context usage and the Advisor model', async ($, on) => {
  fakeEngine(on, { contextUsage: 62, advisorModel: 'opus' })
  await startSession($)

  const ui = await $.ui.mount(BAND)
  const band = await ui.find({ type: 'Box', key: 'band' })

  expect(band?.text).toContain('Context: 62%')
  expect(band?.text).toContain('Advisor: Opus')
  await ui.unmount()
})

test('the Band shows Autocompact on, with its Compact threshold in tokens and percent', async ($, on) => {
  fakeEngine(on, { autoCompactWindow: 160_000, autocompactSource: 'settings' })
  await startSession($)

  const ui = await $.ui.mount(BAND)
  const band = await ui.find({ type: 'Box', key: 'band' })

  expect(band?.text).toContain('Autocompact: ON · 160k (80%)')
  await ui.unmount()
})

test('the Band shows Autocompact off without a Compact threshold', async ($, on) => {
  fakeEngine(on, { isAutoCompactEnabled: false, autoCompactWindow: 160_000 })
  await startSession($)

  const ui = await $.ui.mount(BAND)
  const band = await ui.find({ type: 'Box', key: 'band' })

  expect(band?.text).toContain('Autocompact: OFF')
  expect(band?.text).not.toContain('160k')
  await ui.unmount()
})

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

test('a session measure event with new usage updates the Band', async ($, on) => {
  const engine = fakeEngine(on, { contextUsage: 62 })
  await startSession($)
  const ui = await $.ui.mount(BAND)
  expect(await bandText(ui)).toContain('Context: 62%')

  engine.state.contextUsage = 71
  await $.session.measure(measured(71))

  expect(await bandText(ui)).toContain('Context: 71%')
  await ui.unmount()
})

test('a change made by typing /advisor shows on the Band after the next turn', async ($, on) => {
  const engine = fakeEngine(on, { advisorModel: 'opus' })
  await startSession($)
  const ui = await $.ui.mount(BAND)

  engine.state.advisorModel = 'sonnet'
  await $.session.measure(measured(10))

  expect(await bandText(ui)).toContain('Advisor: Sonnet')
  await ui.unmount()
})

test('the Band keeps showing the settings while Context usage is not available yet', async ($, on) => {
  fakeEngine(on, { contextUsage: undefined, advisorModel: 'opus' })
  await startSession($)
  const ui = await $.ui.mount(BAND)

  const text = await bandText(ui)
  expect(text).toContain('Context: —')
  expect(text).toContain('Autocompact: ON')
  expect(text).toContain('Advisor: Opus')
  await ui.unmount()
})

test('the gear on the Band opens the Pane', async ($, on) => {
  const engine = fakeEngine(on)
  await startSession($)
  const ui = await $.ui.mount(BAND)

  await ui.press({ key: 'pane' })

  expect(engine.calls).toContainEqual({
    call: 'ui.open',
    pane: { id: PANE_ID, title: 'Session controls' },
  })
  await ui.unmount()
})

test('tapping Advisor on the Band opens the Pane and asks for focus on the Advisor picker', async ($, on) => {
  const engine = fakeEngine(on, { advisorModel: 'opus' })
  await startSession($)
  const ui = await $.ui.mount(BAND)

  await ui.press({ key: 'advisor' })

  expect(engine.calls).toContainEqual({
    call: 'ui.open',
    pane: { id: PANE_ID, title: 'Session controls', focus: true },
  })
  await ui.unmount()
})

test('on a 200k-window model the Pane offers Auto and 50% to 90%, each as tokens and percent', async ($, on) => {
  fakeEngine(on, { window: 200_000 })
  await startSession($)
  const ui = await $.ui.mount(PANE)

  expect(await optionsOf(ui, 'threshold')).toEqual([
    'Auto',
    '100k (50%)',
    '120k (60%)',
    '140k (70%)',
    '160k (80%)',
    '180k (90%)',
  ])
  await ui.unmount()
})

test('on a 200k-window model no option below 50% is offered', async ($, on) => {
  fakeEngine(on, { window: 200_000 })
  await startSession($)
  const ui = await $.ui.mount(PANE)

  const percents = (await optionsOf(ui, 'threshold'))
    .map(label => /\((\d+)%\)/.exec(label ?? '')?.[1])
    .filter(percent => percent !== undefined)
    .map(Number)

  expect(Math.min(...percents)).toBe(50)
  await ui.unmount()
})

test('options whose token count is below the 100k minimum are left out', async ($, on) => {
  fakeEngine(on, { window: 150_000, autoCompactWindow: 150_000 })
  await startSession($)
  const ui = await $.ui.mount(PANE)

  expect(await optionsOf(ui, 'threshold')).toEqual([
    'Auto',
    '105k (70%)',
    '120k (80%)',
    '135k (90%)',
  ])
  await ui.unmount()
})

test('on a 200k-window model, picking 80% runs the autocompact command with 160000', async ($, on) => {
  const engine = fakeEngine(on, { window: 200_000 })
  await startSession($)
  const ui = await $.ui.mount(PANE)

  await ui.select({ key: 'threshold', value: '80' })

  expect(engine.calls).toContainEqual({
    call: 'command.run',
    command: 'autocompact',
    args: '160000',
  })
  expect(await chosenIn(ui, 'threshold')).toBe('160k (80%)')
  await ui.unmount()
})

test('after picking 80% the Band shows 160k (80%), the figure the person picked', async ($, on) => {
  fakeEngine(on, { window: 200_000 })
  await startSession($)
  const band = await $.ui.mount(BAND)
  const pane = await $.ui.mount(PANE)

  await pane.select({ key: 'threshold', value: '80' })

  expect(await bandText(band)).toContain('Autocompact: ON · 160k (80%)')
  await pane.unmount()
  await band.unmount()
})

test('picking Auto runs the autocompact command with auto', async ($, on) => {
  const engine = fakeEngine(on, { autoCompactWindow: 160_000, autocompactSource: 'settings' })
  await startSession($)
  const ui = await $.ui.mount(PANE)
  expect(await chosenIn(ui, 'threshold')).toBe('160k (80%)')

  await ui.select({ key: 'threshold', value: 'auto' })

  expect(engine.calls).toContainEqual({
    call: 'command.run',
    command: 'autocompact',
    args: 'auto',
  })
  expect(await chosenIn(ui, 'threshold')).toBe('Auto')
  await ui.unmount()
})

test('a threshold set earlier that is not one of the options is still shown as the current value', async ($, on) => {
  fakeEngine(on, { autoCompactWindow: 123_000, autocompactSource: 'settings' })
  await startSession($)
  const ui = await $.ui.mount(PANE)

  expect(await chosenIn(ui, 'threshold')).toBe('123k (62%)')
  await ui.unmount()
})

test('the Pane has an Autocompact toggle that sets the autoCompact config row', async ($, on) => {
  const engine = fakeEngine(on)
  await startSession($)
  const ui = await $.ui.mount(PANE)

  await ui.press({ key: 'autocompact' })

  expect(engine.calls).toContainEqual({
    call: 'config.set',
    key: 'autoCompact',
    value: false,
  })
  expect((await ui.find({ type: 'Button', key: 'autocompact' }))?.text).toContain('OFF')
  await ui.unmount()
})

test('the Pane shows Autocompact Locked with the reason, and no toggle', async ($, on) => {
  const engine = fakeEngine(on, { env: { DISABLE_AUTO_COMPACT: '1' } })
  await startSession($)
  const ui = await $.ui.mount(PANE)

  expect(await locked(ui, 'Autocompact')).toContain('DISABLE_AUTO_COMPACT')
  expect(await ui.find({ type: 'Button', key: 'autocompact' })).toBeUndefined()
  expect(engine.calls.filter(call => call.call === 'config.set')).toEqual([])
  await ui.unmount()
})

test('an environment variable that forces the Autocompact window makes the Compact threshold Locked', async ($, on) => {
  const engine = fakeEngine(on, {
    env: { CLAUDE_CODE_AUTO_COMPACT_WINDOW: '150000' },
    autoCompactWindow: 150_000,
    autocompactSource: 'env',
  })
  await startSession($)
  const ui = await $.ui.mount(PANE)

  expect(await locked(ui, 'Compact threshold')).toContain('CLAUDE_CODE_AUTO_COMPACT_WINDOW')
  expect(await locked(ui, 'Compact threshold')).toContain('150k (75%)')
  expect(await ui.find({ type: 'Select', key: 'threshold' })).toBeUndefined()
  expect(engine.calls.filter(call => call.call === 'command.run')).toEqual([])
  await ui.unmount()
})

test('the Pane offers Fable, Opus, Sonnet and Off as the Advisor model, with the current one chosen', async ($, on) => {
  fakeEngine(on, { advisorModel: 'opus' })
  await startSession($)
  const ui = await $.ui.mount(PANE)

  expect(await optionsOf(ui, 'advisor')).toEqual(['Fable', 'Opus', 'Sonnet', 'Off'])
  expect(await chosenIn(ui, 'advisor')).toBe('Opus')
  await ui.unmount()
})

test('picking an Advisor model runs the advisor command with it, and the Band and Pane show the result', async ($, on) => {
  const engine = fakeEngine(on, { advisorModel: 'opus' })
  await startSession($)
  const band = await $.ui.mount(BAND)
  const pane = await $.ui.mount(PANE)

  await pane.select({ key: 'advisor', value: 'sonnet' })

  expect(engine.calls).toContainEqual({
    call: 'command.run',
    command: 'advisor',
    args: 'sonnet',
  })
  expect(await chosenIn(pane, 'advisor')).toBe('Sonnet')
  expect(await bandText(band)).toContain('Advisor: Sonnet')
  await pane.unmount()
  await band.unmount()
})

test('picking Off runs the advisor command with off', async ($, on) => {
  const engine = fakeEngine(on, { advisorModel: 'opus' })
  await startSession($)
  const ui = await $.ui.mount(PANE)

  await ui.select({ key: 'advisor', value: 'off' })

  expect(engine.calls).toContainEqual({
    call: 'command.run',
    command: 'advisor',
    args: 'off',
  })
  expect(await chosenIn(ui, 'advisor')).toBe('Off')
  await ui.unmount()
})

test('when Claude Code rejects an Advisor model its text is shown and the display keeps the real value', async ($, on) => {
  const rejection = 'Opus cannot advise a main model that ranks above it.'
  fakeEngine(on, { advisorModel: 'sonnet', advisorRejection: rejection })
  await startSession($)
  const band = await $.ui.mount(BAND)
  const pane = await $.ui.mount(PANE)

  await pane.select({ key: 'advisor', value: 'opus' })

  expect(await pane.find({ type: 'Text', text: rejection })).toBeDefined()
  expect(await chosenIn(pane, 'advisor')).toBe('Sonnet')
  expect(await bandText(band)).toContain('Advisor: Sonnet')
  await pane.unmount()
  await band.unmount()
})

test('an Advisor model saved as something else is still shown as the current value', async ($, on) => {
  fakeEngine(on, { advisorModel: 'claude-haiku-9' })
  await startSession($)
  const ui = await $.ui.mount(PANE)

  expect(await chosenIn(ui, 'advisor')).toBe('claude-haiku-9')
  await ui.unmount()
})

test('CLAUDE_CODE_DISABLE_ADVISOR_TOOL makes the Advisor Locked with a reason on the Band and in the Pane', async ($, on) => {
  const engine = fakeEngine(on, {
    advisorModel: 'opus',
    env: { CLAUDE_CODE_DISABLE_ADVISOR_TOOL: '1' },
  })
  await startSession($)
  const band = await $.ui.mount(BAND)
  const pane = await $.ui.mount(PANE)

  expect(await locked(band, 'Advisor')).toContain('CLAUDE_CODE_DISABLE_ADVISOR_TOOL')
  expect(await band.find({ type: 'Button', key: 'advisor' })).toBeUndefined()
  expect(await locked(pane, 'Advisor')).toContain('CLAUDE_CODE_DISABLE_ADVISOR_TOOL')
  expect(await pane.find({ type: 'Select', key: 'advisor' })).toBeUndefined()
  expect(engine.calls.filter(call => call.call === 'command.run')).toEqual([])
  await pane.unmount()
  await band.unmount()
})

test('an Advisor that Claude Code does not offer (account or provider) is Locked with a reason', async ($, on) => {
  fakeEngine(on, { isAdvisorOffered: false })
  await startSession($)
  const band = await $.ui.mount(BAND)
  const pane = await $.ui.mount(PANE)

  expect(await locked(band, 'Advisor')).toContain('account or provider')
  expect(await locked(pane, 'Advisor')).toContain('account or provider')
  expect(await pane.find({ type: 'Select', key: 'advisor' })).toBeUndefined()
  await pane.unmount()
  await band.unmount()
})

test('the Pane opened from the Advisor segment starts on the Advisor picker, and from the gear it does not', async ($, on) => {
  fakeEngine(on, { advisorModel: 'opus' })
  await startSession($)
  const band = await $.ui.mount(BAND)

  await band.press({ key: 'advisor' })
  const fromAdvisor = await $.ui.mount(PANE)
  expect((await fromAdvisor.find({ type: 'Select', key: 'advisor' }))?.props.autoFocus).toBe(true)
  await fromAdvisor.unmount()

  await band.press({ key: 'pane' })
  const fromGear = await $.ui.mount(PANE)
  expect((await fromGear.find({ type: 'Select', key: 'advisor' }))?.props.autoFocus).toBeUndefined()
  await fromGear.unmount()
  await band.unmount()
})

test('percent and tokens are measured against the model window, not the compaction window', async ($, on) => {
  const engine = fakeEngine(on, {
    window: 1_000_000,
    autoCompactWindow: 400_000,
    autocompactSource: 'settings',
  })
  await startSession($)
  const band = await $.ui.mount(BAND)
  const pane = await $.ui.mount(PANE)

  expect(await bandText(band)).toContain('Autocompact: ON · 400k (40%)')
  expect(await optionsOf(pane, 'threshold')).toEqual([
    'Auto',
    '500k (50%)',
    '600k (60%)',
    '700k (70%)',
    '800k (80%)',
    '900k (90%)',
    // The 400k set earlier is none of the options: it is added as the current one.
    '400k (40%)',
  ])
  expect(await chosenIn(pane, 'threshold')).toBe('400k (40%)')

  await pane.select({ key: 'threshold', value: '70' })
  expect(engine.calls).toContainEqual({
    call: 'command.run',
    command: 'autocompact',
    args: '700000',
  })
  await pane.unmount()
  await band.unmount()
})

test('when Claude Code refuses the Autocompact change the reason is shown and the Band keeps the real state', async ($, on) => {
  const reason = 'Autocompact is managed by your organization.'
  const engine = fakeEngine(on, { configDeny: reason })
  await startSession($)
  const band = await $.ui.mount(BAND)
  const pane = await $.ui.mount(PANE)

  await band.press({ key: 'autocompact' })

  expect(engine.calls).toContainEqual({ call: 'ui.toast', text: reason })
  expect(await pane.find({ type: 'Text', text: reason })).toBeDefined()
  expect(await bandText(band)).toContain('Autocompact: ON')
  await pane.unmount()
  await band.unmount()
})

test('the Band still shows Autocompact and the Advisor when usage is not available', async ($, on) => {
  fakeEngine(on, { isUsageUnavailable: true, advisorModel: 'opus' })
  await startSession($)
  const ui = await $.ui.mount(BAND)

  const text = await bandText(ui)
  expect(text).toContain('Autocompact: ON')
  expect(text).toContain('Context: —')
  expect(text).toContain('Advisor: Opus')
  await ui.unmount()
})

test('the Band gives way to a survey', async ($, on) => {
  fakeEngine(on)
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>engine</Text>
  })
  await startSession($)

  const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, hasSurvey: true } })

  expect(await ui.find({ type: 'Box', key: 'band' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: 'engine' })).toBeDefined()
  await ui.unmount()
})

test('the Pane still offers Autocompact and the Advisor when usage is not available, but no threshold picker', async ($, on) => {
  fakeEngine(on, { isUsageUnavailable: true, advisorModel: 'opus' })
  await startSession($)
  const ui = await $.ui.mount(PANE)

  expect(await ui.find({ type: 'Button', key: 'autocompact' })).toBeDefined()
  expect(await chosenIn(ui, 'advisor')).toBe('Opus')
  expect(await ui.find({ type: 'Select', key: 'threshold' })).toBeUndefined()
  await ui.unmount()
})

test('Claude Code\'s words about a rejected change are gone after the next turn', async ($, on) => {
  const rejection = 'Opus cannot advise a main model that ranks above it.'
  fakeEngine(on, { advisorModel: 'sonnet', advisorRejection: rejection })
  await startSession($)
  const pane = await $.ui.mount(PANE)
  await pane.select({ key: 'advisor', value: 'opus' })
  expect(await pane.find({ type: 'Text', text: rejection })).toBeDefined()

  await $.session.measure(measured(10))

  expect(await pane.find({ type: 'Text', text: rejection })).toBeUndefined()
  await pane.unmount()
})

// Installing the Mod from the desktop app makes it active in the session that
// is already open, so `session.start` has passed before the Mod is there.
test('the Band shows on a session the Mod joined after it started', async ($, on) => {
  fakeEngine(on, { contextUsage: 62, advisorModel: 'opus' })
  const ui = await $.ui.mount(BAND)

  const text = await bandText(ui)

  expect(text).toContain('Context: 62%')
  expect(text).toContain('Advisor: Opus')
  await ui.unmount()
})

test('the Pane offers its controls on a session the Mod joined after it started', async ($, on) => {
  fakeEngine(on, { window: 200_000 })
  const ui = await $.ui.mount(PANE)

  expect(await optionsOf(ui, 'threshold')).toContain('160k (80%)')
  await ui.unmount()
})

test('tapping Autocompact works on a session the Mod joined after it started', async ($, on) => {
  const engine = fakeEngine(on)
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
