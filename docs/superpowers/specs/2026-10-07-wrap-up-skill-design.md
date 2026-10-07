# Bundled wrap-up skill with one-time setup interview

Date: 2026-10-07 · Target version: 0.2.0

## Problem

The band only appears when a reply contains the handoff card, so users without a wrap-up skill get nothing. The README says "works with any wrap-up skill" but gives no way to get one.

## Goal

`/plugin install wrap-buttons` gives a working wrap-up out of the box (basic), and a one-time interview turns it into the user's own routine.

## Components

### 1. Skill: `skills/wrap-up/SKILL.md`

One skill, two modes.

**`/wrap-up` (wrap up)**
1. Look for a routine: `.claude/wrap-up.md` in the project, else `~/.claude/wrap-up.md`. Project wins; no merging.
2. Routine found → follow its steps, then write the card.
3. No routine (basic mode) → write the card only, then ask "Set up your wrap-up routine now?". Yes → run the interview. This is the end-of-session safeguard.

**`/wrap-up setup` (interview)** — one question at a time:
1. When to wrap up: only when asked, or also offer when a task looks done.
2. What to update: changelog, daily note, other docs. Detect what exists in the project (e.g. `CHANGELOG.md`, `docs/`), offer those, accept extra paths.
3. Git at wrap-up: nothing / show status / commit.
4. Card fields: defaults plus any extras.
5. Save for all projects (`~/.claude/wrap-up.md`) or just this one (`.claude/wrap-up.md`).

Writes the routine as plain markdown the user can hand-edit. Re-running setup overwrites the chosen file after confirming.

**Card format (fixed)** — always:

```
### Session Handoff Card
- **Completed**: ...
- **Files Touched**: ...
- **Next Up**: ...
```

Extra fields from the routine go between Files Touched and Next Up. The heading text and `Next Up` label cannot be changed by the interview, so the band's default options always match.

### 2. Setup band (`hooks/register.tsx`)

- On `session.start`, if `e` reports a person at the prompt, and `$.store` key `setupPrompted` is unset, and neither routine file exists (`$.fs.exists`, home from `$.env.get("HOME")`) → show the band.
- Band: "Set up your wrap-up routine?" with **1 Set up now** · **2 At end of session**.
  - 1 → hide band, `$.prompt.submit({ text: '/wrap-up setup', asUser: true })`.
  - 2 → hide band. The skill's basic-mode safeguard handles it later.
- Either button sets `setupPrompted` in `$.store`, so the band shows once ever.
- Not shown alongside the wrap-up band; the wrap-up band takes priority.

### 3. Strict marker (`hooks/card.ts`)

`parseHandoff` matches the marker only on a heading line (line starts with `#`). A mid-sentence mention no longer triggers the band.

## Tests (`tests/wrap-buttons.test.tsx`)

- Setup band shows on start when no routine and `setupPrompted` unset.
- Hidden when a routine exists (either location) or `setupPrompted` is set.
- Button 1 submits `/wrap-up setup`; both buttons set `setupPrompted`.
- Marker mid-sentence → no handoff; marker on a heading → handoff parsed.

## Docs

- README: replace "works with any wrap-up skill" with a section on `/wrap-up`, basic mode, and `/wrap-up setup`. Note custom wrap-ups still work via the two options, provided the marker is a heading.
- Bump `plugin.json` to 0.2.0.

## Out of scope

- Merging global and project routines.
- Auto-detecting "task looks done" in the mod; that is a routine instruction the model follows.
