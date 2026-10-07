import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { carryOver, parseHandoff } from './card'

const handoff = atom({ plugin: 'wrap-buttons', key: 'handoff' } as const, null)

// Clears the band first: the state may outlive the /clear.
async function reset($: EngineInterface, carry: 'start' | 'prefill' | 'none', nextLabel: string) {
  const card = await read($, handoff)
  await update($, handoff, () => null)
  await $.command.run({ command: 'clear' })
  if (!card || carry === 'none') return
  const text = carryOver(card, nextLabel)
  if (carry === 'start') await $.prompt.submit({ text, asUser: true })
  else await $.prompt.fill({ text })
}

export const register: Register = (on, options) => {
  const marker = String(options.marker || 'Session Handoff Card')
  const nextLabel = String(options.nextLabel || 'Next Up')

  on('turn.complete', async ($, e, next) => {
    const found = e.reason === 'answer' ? parseHandoff(e.answer, marker, nextLabel) : null
    if (found) await update($, handoff, () => found)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const card = await read($, handoff)
    if (card === null || e.props.hasSurvey || e.props.isWorking) return next(e)
    const { Box, Button, Text } = $.ui.resolve(e)
    // Border colour per button: green the suggested one, blue Stay, the rest the default.
    return (
      <Box flexDirection="column" borderStyle="round" paddingX={1}>
        <Text bold>✅ Wrap-up done · press 1-4</Text>
        {card.next ? <Text>{`${nextLabel}: ${card.next.slice(0, 100)}`}</Text> : null}
        <Box gap={1}>
          <Box key="b-start" borderStyle="round" borderColor="green" paddingX={1}>
            <Button key="start" hotkey="1" plain label="Start next" onPress={() => reset($, 'start', nextLabel)} />
          </Box>
          <Box key="b-prefill" borderStyle="round" paddingX={1}>
            <Button key="prefill" hotkey="2" plain label="Prefill next" onPress={() => reset($, 'prefill', nextLabel)} />
          </Box>
          <Box key="b-blank" borderStyle="round" paddingX={1}>
            <Button key="blank" hotkey="3" plain label="Blank slate" onPress={() => reset($, 'none', nextLabel)} />
          </Box>
          <Box key="b-stay" borderStyle="round" borderColor="blue" paddingX={1}>
            <Button key="stay" hotkey="4" plain label="Stay" onPress={() => update($, handoff, () => null)} />
          </Box>
        </Box>
      </Box>
    )
  })
}
