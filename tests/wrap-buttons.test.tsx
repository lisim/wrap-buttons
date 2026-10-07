import type { On, RenderPropsOf } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

import { parseHandoff } from '../hooks/card'

const CARD = [
  'All done.',
  '',
  '### 🏁 Session Handoff Card',
  '- **Completed**: built it',
  '- **Next Up**: push the repo',
  '---',
].join('\n')

const DONE = { answer: CARD, durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' } as const

test('parses the card and its next step', async () => {
  expect(parseHandoff(CARD, 'Session Handoff Card', 'Next Up')).toEqual({
    card: CARD.slice(CARD.indexOf('###')),
    next: 'push the repo',
  })
  expect(parseHandoff('no card here', 'Session Handoff Card', 'Next Up')).toBe(null)
})

test('matches the marker only on a heading line', async () => {
  const mention = 'The band reads the Session Handoff Card.\n- **Next Up**: nothing'
  expect(parseHandoff(mention, 'Session Handoff Card', 'Next Up')).toBe(null)
  expect(parseHandoff(`${mention}\n\n${CARD}`, 'Session Handoff Card', 'Next Up')?.next).toBe('push the repo')
})

for (const surface of ['terminal', 'desktop'] as const) {
  test(`${surface}: buttons appear after a wrap-up, and Prefill clears then fills`, async ($, on) => {
    const ran: string[] = []
    let filled = ''
    on('ui.render', ($e, e) => {
      const { Box } = $e.ui.resolve(e)
      return <Box key="engine" />
    })
    on('turn.complete', () => ({ text: CARD }))
    on('command.run', { command: 'clear' }, () => {
      ran.push('clear')
      return { text: '' }
    })
    on('prompt.fill', (_$, e) => {
      filled = e.text
      return { isFilled: true }
    })

    // Only the two fields the band reads; the rest are the surface's.
    const props = { hasSurvey: false, isWorking: false } as RenderPropsOf['AbovePrompt']
    const before = await $.ui.mount({ plugin: 'wrap-buttons', surface, component: 'AbovePrompt', props })
    expect(await before.find({ key: 'prefill' })).toBe(undefined)

    await $.turn.complete(DONE)
    const ui = await $.ui.mount({ plugin: 'wrap-buttons', surface, component: 'AbovePrompt', props })
    expect(await ui.findAll({ type: 'Button' })).toHaveLength(4)

    await ui.press({ key: 'prefill' })
    expect(ran).toEqual(['clear'])
    expect(filled).toContain('Next Up: push the repo')
    expect(await ui.find({ key: 'prefill' })).toBe(undefined)
  })
}

const PROPS = { hasSurvey: false, isWorking: false } as RenderPropsOf['AbovePrompt']

// Engine stand-ins for the setup band; `routines` lists the routine paths that exist.
function world(on: On, routines: string[], store: Record<string, unknown> = {}) {
  const ran: string[] = []
  on('ui.render', ($e, e) => {
    const { Box } = $e.ui.resolve(e)
    return <Box key="engine" />
  })
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  mock.store(on, store)
  mock.env(on, { HOME: '/home/u' })
  on('fs.exists', (_$, e) => ({ value: routines.includes(e.path) }))
  on('command.run', (_$, e) => {
    ran.push(`${e.command} ${e.args}`)
    return { text: '' }
  })
  return ran
}

for (const surface of ['terminal', 'desktop'] as const) {
  test(`${surface}: setup band shows once, and Set up now runs setup`, async ($, on) => {
    const ran = world(on, [])
    await $.session.start({ cwd: '/proj', surface, isInteractive: true })
    const ui = await $.ui.mount({ plugin: 'wrap-buttons', surface, component: 'AbovePrompt', props: PROPS })
    expect(await ui.findAll({ type: 'Button' })).toHaveLength(2)

    await ui.press({ key: 'setup-now' })
    expect(ran).toEqual(['wrap-buttons:wrap-up setup'])
    expect(await ui.find({ key: 'setup-now' })).toBe(undefined)

    await $.session.start({ cwd: '/proj', surface, isInteractive: true })
    const again = await $.ui.mount({ plugin: 'wrap-buttons', surface, component: 'AbovePrompt', props: PROPS })
    expect(await again.find({ key: 'setup-now' })).toBe(undefined)
  })

  test(`${surface}: At end of session hides the band and runs nothing`, async ($, on) => {
    const ran = world(on, [])
    await $.session.start({ cwd: '/proj', surface, isInteractive: true })
    const ui = await $.ui.mount({ plugin: 'wrap-buttons', surface, component: 'AbovePrompt', props: PROPS })
    await ui.press({ key: 'setup-later' })
    expect(ran).toEqual([])
    expect(await ui.find({ key: 'setup-later' })).toBe(undefined)

    await $.session.start({ cwd: '/proj', surface, isInteractive: true })
    const again = await $.ui.mount({ plugin: 'wrap-buttons', surface, component: 'AbovePrompt', props: PROPS })
    expect(await again.find({ key: 'setup-later' })).toBe(undefined)
  })
}

const HIDDEN: [string, string[], Record<string, unknown>, boolean][] = [
  ['already prompted', [], { setupPrompted: true }, true],
  ['global routine exists', ['/home/u/.claude/wrap-up.md'], {}, true],
  ['project routine exists', ['/proj/.claude/wrap-up.md'], {}, true],
  ['not interactive', [], {}, false],
]
for (const [why, routines, store, isInteractive] of HIDDEN) {
  test(`no setup band when ${why}`, async ($, on) => {
    world(on, routines, store)
    await $.session.start({ cwd: '/proj', surface: 'terminal', isInteractive })
    const ui = await $.ui.mount({ plugin: 'wrap-buttons', surface: 'terminal', component: 'AbovePrompt', props: PROPS })
    expect(await ui.find({ key: 'setup-now' })).toBe(undefined)
  })
}
