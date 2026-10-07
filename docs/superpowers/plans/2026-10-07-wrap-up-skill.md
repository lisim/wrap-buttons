# Bundled Wrap-Up Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a `/wrap-buttons:wrap-up` skill with the plugin (basic card out of the box, one-time setup interview), a once-ever setup band, and a heading-only marker match.

**Architecture:** The skill is a markdown file the plugin ships under `skills/`. The mod (`hooks/register.tsx`) gains a `session.start` hook that raises a second band when no routine file exists and the plugin's `$.store` says it has never asked. `hooks/card.ts` only matches the marker on `#` heading lines.

**Tech Stack:** Claude Code mods API 2.1.292 (`claude-code`, `claude-code/testing`), TSX, `claude plugin test` / `claude plugin validate`.

**Spec:** `docs/superpowers/specs/2026-10-07-wrap-up-skill-design.md`

## Global Constraints

- Card heading text `Session Handoff Card` and label `Next Up` are fixed; the interview cannot change them.
- Routine files: project `.claude/wrap-up.md` wins over `~/.claude/wrap-up.md`; no merging.
- Store key `setupPrompted` (plugin `$.store`); session atom `setupBand: boolean`.
- Setup runs via `$.command.run({ command: 'wrap-buttons:wrap-up', args: 'setup' })`.
- Version 0.2.0.
- API reference for this build: `/tmp/claude-1000/bundled-skills/2.1.292/cff88b9de9a3ba9040343913210cb3d3/plugin-authoring/types/claude-code.d.ts` (path changes per process; reload the `plugin-authoring` skill to get the current one).

---

### Task 0: Commit the in-progress preview change

**Files:** Modify: `hooks/register.tsx` (already edited, uncommitted)

- [ ] **Step 1: Run the tests**

Run: `claude plugin test .`
Expected: PASS (2 tests, terminal + desktop, plus the parser test)

- [ ] **Step 2: Commit it alone**

```bash
git add hooks/register.tsx
git commit -m "Band: preview box for what 1/2 carry over"
```

---

### Task 1: Heading-only marker match

**Files:**
- Modify: `hooks/card.ts:4-12`
- Test: `tests/wrap-buttons.test.tsx`

**Interfaces:**
- Produces: `parseHandoff(answer, marker, nextLabel): Handoff | null` — unchanged signature; now `null` unless the marker is on a line starting with `#` (leading whitespace allowed).

- [ ] **Step 1: Write the failing test** — append to `tests/wrap-buttons.test.tsx` after the existing parser test:

```tsx
test('matches the marker only on a heading line', async () => {
  const mention = 'The band reads the Session Handoff Card.\n- **Next Up**: nothing'
  expect(parseHandoff(mention, 'Session Handoff Card', 'Next Up')).toBe(null)
  expect(parseHandoff(`${mention}\n\n${CARD}`, 'Session Handoff Card', 'Next Up')?.next).toBe('push the repo')
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `claude plugin test .`
Expected: FAIL on `matches the marker only on a heading line` (first assertion gets a Handoff, not null)

- [ ] **Step 3: Implement** — replace the body of `parseHandoff` in `hooks/card.ts`:

```ts
// The handoff from the marker's heading on, and its next-step line; null when no heading carries the marker.
export function parseHandoff(answer: string, marker: string, nextLabel: string): Handoff | null {
  const lines = answer.split('\n')
  const at = lines.findIndex(l => l.trimStart().startsWith('#') && l.includes(marker))
  if (at < 0) return null
  const card = lines.slice(at).join('\n').trim()
  const line = card.split('\n').find(l => l.includes(nextLabel)) ?? ''
  const after = line.slice(line.indexOf(nextLabel) + nextLabel.length)
  const next = after.replace(/^[*_\s]*:?[*_\s]*:?\s*/, '').trim()
  return { card, next }
}
```

- [ ] **Step 4: Run tests**

Run: `claude plugin test .`
Expected: PASS, all tests

- [ ] **Step 5: Commit**

```bash
git add hooks/card.ts tests/wrap-buttons.test.tsx
git commit -m "Match the wrap-up marker only on a heading line"
```

---

### Task 2: Setup band

**Files:**
- Modify: `types/index.d.ts`
- Modify: `hooks/register.tsx`
- Test: `tests/wrap-buttons.test.tsx`

**Interfaces:**
- Consumes: `handoff` atom, `reset()` (existing, `hooks/register.tsx`)
- Produces: atom `setupBand` (`{ plugin: 'wrap-buttons', key: 'setupBand' }`, initial `false`); store key `setupPrompted: true`; Button keys `setup-now`, `setup-later`.

- [ ] **Step 1: Declare the state** — `types/index.d.ts` becomes:

```ts
export type Handoff = { card: string; next: string }

declare module 'claude-code' {
  interface PluginState {
    'wrap-buttons': { handoff: Handoff | null; setupBand: boolean }
  }
}
```

- [ ] **Step 2: Write the failing tests** — change the imports to `import type { On, RenderPropsOf } from 'claude-code'` and `import { expect, mock, test } from 'claude-code/testing'`, then append:

```tsx
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
```

- [ ] **Step 3: Run them to verify they fail**

Run: `claude plugin test .`
Expected: FAIL on the two `setup band shows once` / `At end of session` tests (0 Buttons, not 2). The `no setup band` tests pass already.

- [ ] **Step 4: Implement** — in `hooks/register.tsx`, below the `handoff` atom:

```tsx
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
```

Inside `register`, before the `turn.complete` hook:

```tsx
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    if (e.isInteractive && !(await $.store.get('setupPrompted')) && !(await hasRoutine($)))
      await update($, setupBand, () => true)
    return result
  })
```

Replace the first two lines of the `ui.render` hook body:

```tsx
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
              <Button key="setup-later" hotkey="2" plain label="At end of session" onPress={() => closeSetup($, false)} />
            </Box>
          </Box>
        </Box>
      )
    }
```

(Delete the old `if (card === null || ...) return next(e)` line and the old `const { Box, Button, Text } = ...` line; the wrap-up band JSX below stays as is.)

- [ ] **Step 5: Run tests**

Run: `claude plugin test .`
Expected: PASS, all tests

- [ ] **Step 6: Validate**

Run: `claude plugin validate .`
Expected: no errors; lists `session.start`, `turn.complete`, `ui.render` hooks and the `setupBand` state key.

- [ ] **Step 7: Commit**

```bash
git add types/index.d.ts hooks/register.tsx tests/wrap-buttons.test.tsx
git commit -m "Setup band: offer the wrap-up interview once"
```

---

### Task 3: The wrap-up skill

**Files:** Create: `skills/wrap-up/SKILL.md`

**Interfaces:**
- Consumes: routine paths and card format from Global Constraints.
- Produces: command `/wrap-buttons:wrap-up` (args `setup` → interview).

- [ ] **Step 1: Write `skills/wrap-up/SKILL.md`**

````markdown
---
name: wrap-up
description: Wrap up the session with a handoff card (Completed, Files Touched, Next Up), following the user's saved routine if they have one. Use when the user says "wrap up", "done for now", "finish", or runs /wrap-up. With the argument "setup", runs the one-time interview that saves their routine.
---

# Wrap-up

## If the argument is `setup`: the interview

Ask these one at a time, multiple choice where possible. Wait for each answer.

1. **When**: Only when you ask, or should I also offer a wrap-up when a task looks done?
2. **What to update**: List what exists in this project (`CHANGELOG.md`, `docs/`, a notes or daily-notes folder) and ask which to update at wrap-up. Accept other paths.
3. **Git**: At wrap-up, do nothing, show `git status`, or commit?
4. **Card**: The card always has Completed, Files Touched, Next Up. Any extra fields?
5. **Where to save**: All projects (`~/.claude/wrap-up.md`) or just this one (`.claude/wrap-up.md`)?

If the chosen file exists, show it and confirm before overwriting. Write it as plain markdown:

```markdown
# Wrap-up routine

- When: <answer 1>
- Update: <paths, one per line>
- Git: <nothing | status | commit>
- Extra card fields: <list or none>
```

Then say where it was saved and that it can be edited by hand. Stop; do not wrap up.

## Otherwise: wrap up

1. Read `.claude/wrap-up.md` in the project. If missing, read `~/.claude/wrap-up.md`. Use only the first one found.
2. **Routine found**: do its Update and Git steps, then write the card with its extra fields.
3. **No routine**: write the card only.
4. End the reply with the card, exactly in this shape (the heading line and `Next Up` label must not change; a button band reads them):

```
### 🏁 Session Handoff Card
- **Completed**: <1-2 bullets of verified work>
- **Files Touched**: <paths>
- **<Extra field>**: <...>
- **Next Up**: <one next step>
```

5. **No routine only**: after the card, ask "Want to set up your own wrap-up routine now? It's 5 quick questions." On yes, run the interview above.
````

- [ ] **Step 2: Validate**

Run: `claude plugin validate .`
Expected: no errors; the skill `wrap-up` is listed.

- [ ] **Step 3: Confirm the command name**

Run: `claude --plugin-dir ~/Projects/wrap-buttons -p "/help" 2>/dev/null | grep -i wrap-up` — or start an interactive session with `--plugin-dir` and type `/wrap`.
Expected: `wrap-buttons:wrap-up`. If the name differs, update `closeSetup` in `hooks/register.tsx`, the Task 2 test expectation, and Global Constraints, rerun `claude plugin test .`.

- [ ] **Step 4: Commit**

```bash
git add skills/wrap-up/SKILL.md
git commit -m "Ship a wrap-up skill with a one-time setup interview"
```

---

### Task 4: README and version

**Files:**
- Modify: `README.md` (line "Works with any wrap-up skill...")
- Modify: `.claude-plugin/plugin.json` (`"version"`)

- [ ] **Step 1: Bump** `"version": "0.1.1"` → `"version": "0.2.0"` in `.claude-plugin/plugin.json`.

- [ ] **Step 2: Replace** the README line `Works with any wrap-up skill or prompt that ends with a card containing those two strings.` with:

```markdown
## Wrap-up skill

The plugin ships `/wrap-buttons:wrap-up`. Out of the box it ends your session with a handoff card, which brings up the buttons.

To make it yours, run `/wrap-buttons:wrap-up setup` (or press **1** on the band shown in your first session). Five questions: when to wrap up, which docs to update, what to do with git, extra card fields, and whether the routine is for all projects (`~/.claude/wrap-up.md`) or just this one (`.claude/wrap-up.md`). The project file wins when both exist. Both are plain markdown you can edit.

Using your own wrap-up instead? Set the two options above to match it. The marker must be on a heading line (starting with `#`).
```

- [ ] **Step 3: Update** the Status line's "read the ~70 lines in `hooks/`" to the new count: run `cat hooks/*.ts* | wc -l` and round to the nearest 10.

- [ ] **Step 4: Validate and test**

Run: `claude plugin validate . && claude plugin test .`
Expected: no errors, all tests PASS

- [ ] **Step 5: Commit**

```bash
git add README.md .claude-plugin/plugin.json
git commit -m "README: bundled wrap-up skill; bump 0.2.0"
```

Pushing is not part of this plan; ask Pete.
