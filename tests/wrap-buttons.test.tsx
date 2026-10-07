import type { RenderPropsOf } from 'claude-code'
import { expect, test } from 'claude-code/testing'

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
