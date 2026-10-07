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

```
/plugin install wrap-buttons --marketplace lisim/wrap-buttons
```

Answer `y` to add the marketplace, pick a scope, then set the two options (or keep the defaults).

## Options

| Option | Default | Meaning |
|---|---|---|
| Wrap-up marker | `Session Handoff Card` | Text in a reply that means the wrap-up is done. The reply from that line on is the handoff carried over. |
| Next step label | `Next Up` | The handoff line holding the next step, e.g. `- **Next Up**: ...` |

Works with any wrap-up skill or prompt that ends with a card containing those two strings.

## Develop

```
claude plugin validate .
claude plugin test .
```

## Status

Provided as-is, no support. Built on the Claude Code mods API (early access, may change between releases); tested on 2.1.292. Mods run with your permissions: read the ~70 lines in `hooks/` before installing.

MIT licensed.
