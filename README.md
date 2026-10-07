# wrap-buttons

A Claude Code mod. When a reply contains your wrap-up / handoff card, a band appears above the prompt:

```
╭────────────────────────────────────────────────────────────────────────────────────────╮
│ ✅ Wrap-up done. Start a fresh session? Press 1-4                                      │
│ Next Up: push the repo                                                                 │
│ ╭────────────────────────╮ ╭─────────────────────────╮ ╭─────────────╮ ╭────────────╮ │
│ │1: Clear & send Next Up │ │2: Clear & draft Next Up │ │3: Clear only│ │4: Stay here│ │
│ ╰────────────────────────╯ ╰─────────────────────────╯ ╰─────────────╯ ╰────────────╯ │
╰────────────────────────────────────────────────────────────────────────────────────────╯
```

| Key | Does |
|---|---|
| **1 Clear & send** (green) | `/clear`, then sends the handoff + next step as the first message of the fresh session, so Claude starts on it straight away |
| **2 Clear & draft** | `/clear`, then puts the handoff + next step in the prompt box for you to edit and send |
| **3 Clear only** | `/clear`, nothing carried over |
| **4 Stay here** (blue) | Hide the band, keep the session |

Type the digit into an empty prompt, or click.

## Install

```sh
claude plugin marketplace add lisim/wrap-buttons
claude plugin install wrap-buttons@wrap-buttons
```

Restart Claude Code after installing. The two options below are optional and use their defaults until set; change them with `/plugin configure wrap-buttons` in Claude Code.

## Options

| Option | Default | Meaning |
|---|---|---|
| Wrap-up marker | `Session Handoff Card` | Text on a heading line (`#`) of a reply that means the wrap-up is done. The reply from that line on is the handoff carried over. |
| Next step label | `Next Up` | The handoff line holding the next step, e.g. `- **Next Up**: ...` |

## Wrap-up skill

The plugin ships `/wrap-buttons:wrap-up`. Out of the box it ends your session with a handoff card, which brings up the buttons.

To make it yours, run `/wrap-buttons:wrap-up setup` (or press **1** on the band shown in your first session). Five questions: when to wrap up, which docs to update (in the project or an outside notes vault), what to do with git, extra card fields, and whether the routine is for all projects (`~/.claude/wrap-up.md`) or just this one (`.claude/wrap-up.md`). The project file wins when both exist. Both are plain markdown you can edit.

### Already have a wrap-up skill?

Yours keeps working. The bundled skill tells Claude to skip it when you have your own wrap-up skill or CLAUDE.md rules, so saying "wrap up" runs yours. This relies on Claude choosing correctly: if your skill's description doesn't mention wrapping up, add "wrap up" to it. You can always run either one by its command.

To get the buttons with your own wrap-up, set the two options above to match its card. The marker must be on a heading line (starting with `#`). On the setup band in your first session, press **2** (Later / I have my own) to dismiss it for good.

## Develop

```
claude plugin validate .
claude plugin test .
```

## Status

Provided as-is, no support. Built on the Claude Code mods API (early access, may change between releases); tested on 2.1.292. Mods run with your permissions: read the ~120 lines in `hooks/` and the skill in `skills/wrap-up/` before installing.

MIT licensed.
