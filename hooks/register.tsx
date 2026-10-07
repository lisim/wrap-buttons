import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { carryOver, parseHandoff } from './card'

const handoff = atom({ plugin: 'wrap-buttons', key: 'handoff' } as const, null)
const setupBand = atom({ plugin: 'wrap-buttons', key: 'setupBand' } as const, false)

// A routine in the project or the home folder means setup is done.
async function hasRoutine($: EngineInterface, cwd: string) {
  const home = await $.env.get('HOME')
  for (const path of [`${cwd}/.claude/wrap-up.md`, ...(home ? [`${home}/.claude/wrap-up.md`] : [])])
    if (await $.fs.exists(path)) return true
  return false
}

// Either button answers the question for good.
async function closeSetup($: EngineInterface, runSetup: boolean) {
  await update($, setupBand, () => false)
  await $.store.set('setupPrompted', true)
  if (runSetup) await $.command.run({ command: 'wrap-buttons:wrap-up', args: 'setup' })
}

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

  on('session.start', async ($, e, next) => {
    const result = await next(e)
    if (e.isInteractive && !(await $.store.get('setupPrompted')) && !(await hasRoutine($, e.cwd)))
      await update($, setupBand, () => true)
    return result
  })

  on('turn.complete', async ($, e, next) => {
    const found = e.reason === 'answer' ? parseHandoff(e.answer, marker, nextLabel) : null
    if (found) await update($, handoff, () => found)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const card = await read($, handoff)
    if (e.props.hasSurvey || e.props.isWorking) return next(e)
    const { Box, Button, Text } = $.ui.resolve(e)
    if (card === null) {
      if (!(await read($, setupBand))) return next(e)
      return (
        <Box flexDirection="column" borderStyle="round" paddingX={1}>
          <Text bold>👋 Set up your wrap-up routine? Press 1-2</Text>
          <Box gap={1}>
            <Box key="b-setup-now" borderStyle="round" borderColor="green" paddingX={1}>
              <Button key="setup-now" hotkey="1" plain label="Set up now" onPress={() => closeSetup($, true)} />
            </Box>
            <Box key="b-setup-later" borderStyle="round" borderColor="blue" paddingX={1}>
              <Button key="setup-later" hotkey="2" plain label="Later / I have my own" onPress={() => closeSetup($, false)} />
            </Box>
          </Box>
        </Box>
      )
    }
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
