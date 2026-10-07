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
