// What a person sees and does on the desktop surface, in the Mod's own words:
// the Band above the prompt and the Pane beside the chat. Helpers here read
// only what a person reads (text, which options exist, which is chosen).
import type { ElementQuery, FoundElement } from 'claude-code/testing'

export const PLUGIN = 'session-controls'
export const PANE_ID = 'session-controls'

export const BAND = {
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

export const PANE = {
  plugin: PLUGIN,
  surface: 'desktop',
  component: 'Pane',
  requestId: PANE_ID,
  props: {
    title: 'Session controls',
    isFocused: false,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 30 },
    view: {},
  },
} as const

/** The Pane in its small form on the desktop app, in the chat area's corner. */
export const WIDGET = {
  ...PANE,
  props: { ...PANE.props, placement: 'widget', anchoredEdges: ['bottom', 'right'] },
} as const

type Mounted = { find: (query: ElementQuery) => Promise<FoundElement | undefined> }
type Option = { value: string; label?: string }

/** Everything the Band says on its one row. */
export const bandText = async (band: Mounted): Promise<string | undefined> =>
  (await band.find({ type: 'Box', key: 'band' }))?.text

/** The words of a Locked control (a 🔒 and its reason), or undefined. */
export const lockedText = async (
  screen: Mounted,
  control: string,
): Promise<string | undefined> =>
  (await screen.find({ type: 'Text', text: new RegExp(`${control}.*🔒`) }))?.text

/** The labels of a picker's options, in the order drawn. */
export const optionsOf = async (pane: Mounted, key: string): Promise<(string | undefined)[]> => {
  const select = await pane.find({ type: 'Select', key })

  return (select?.props.options as Option[]).map(option => option.label)
}

/** The label of the option a picker shows as chosen. */
export const chosenIn = async (pane: Mounted, key: string): Promise<string | undefined> => {
  const select = await pane.find({ type: 'Select', key })
  const { options, value } = select?.props as { options: Option[]; value: string }

  return options.find(option => option.value === value)?.label
}
