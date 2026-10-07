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
        <Text bold>✅ Wrap-up done. Start a fresh session? Press 1-4</Text>
        <Box key="preview" flexDirection="column" borderStyle="round" borderColor="green" paddingX={1}>
          <Text dimColor>1 sends, 2 drafts, in a fresh session:</Text>
          <Text bold color="green">{`${nextLabel}: ${card.next || '(none found, the handoff alone)'}`}</Text>
          <Text dimColor>{`+ the handoff card (${card.card.split('\n').length} lines)`}</Text>
        </Box>
        <Box gap={1}>
          <Box key="b-start" borderStyle="round" borderColor="green" paddingX={1}>
            <Button key="start" hotkey="1" plain label={`Clear & send ${nextLabel}`} onPress={() => reset($, 'start', nextLabel)} />
          </Box>
          <Box key="b-prefill" borderStyle="round" paddingX={1}>
            <Button key="prefill" hotkey="2" plain label={`Clear & draft ${nextLabel}`} onPress={() => reset($, 'prefill', nextLabel)} />
          </Box>
          <Box key="b-blank" borderStyle="round" paddingX={1}>
            <Button key="blank" hotkey="3" plain label="Clear only" onPress={() => reset($, 'none', nextLabel)} />
          </Box>
          <Box key="b-stay" borderStyle="round" borderColor="blue" paddingX={1}>
            <Button key="stay" hotkey="4" plain label="Stay here" onPress={() => update($, handoff, () => null)} />
          </Box>
        </Box>
      </Box>
    )
  })
}
