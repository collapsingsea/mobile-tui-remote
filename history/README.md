# Historical snapshots

This directory preserves the major design turns that led to the current client.
They are **archival source snapshots**, not the recommended deployment target.
Use the repository root + `web/` for the maintained version.

The snapshots were recovered from timestamped deployment backups and sanitized
before packaging. Private hostnames, IPs, usernames, session IDs, SSH material,
credentials, and login state are not included.

## Ten representative stages

| Stage | Snapshot | Why it matters |
|---|---|---|
| 1 | `frontends/00-initial.html` | Initial mobile terminal prototype: WebSocket terminal, touch-oriented controls and the first scrolling experiments. |
| 2 | `frontends/01-v2.1-selection.html` | Added explicit text-selection/copy concepts and early tmux copy-mode integration. |
| 3 | `frontends/02-v2.2-unified.html` | Began merging browse and input interaction instead of forcing a dedicated touchpad/browse mode. |
| 4 | `frontends/03-v2.4-freeze.html` | Selection-state work: tried to keep terminal output from invalidating an active selection/edit operation. |
| 5 | `frontends/04-v2.7-native-selection.html` | Shift toward Android/browser-native text selection plus better VisualViewport/keyboard handling. |
| 6 | `frontends/05-v2.9-native-text-mirror.html` | Introduced the transparent DOM text mirror layered over xterm so Android can long-press real selectable text. |
| 7 | `frontends/06-v2.12-local-scroll.html` | Local scrolling path: moved away from slow one-line tmux scrolling and refined touch gesture handling. |
| 8 | `frontends/07-v2.15-history-layer.html` | Experimental separate JSONL/history layer, created to survive reconnects and missing tmux scrollback. Useful experiment, but it broke true TUI interactivity. |
| 9 | `frontends/08-v2.18-seamless-history.html` | Tried to hide the history/live mode boundary and make the two layers look continuous. This still wasn't equivalent to a real live terminal. |
| 10 | current `web/` | Final architectural turn: stay on the real xterm/TUI at all times. Touch drags synthesize real xterm wheel events and taps synthesize terminal mouse clicks. |

## Backend snapshots

`backends/` contains five sanitized server-side snapshots showing how the bridge
evolved from a simple PTY bridge through tmux scrolling and the temporary
transcript/history experiment.

They intentionally preserve historical rough edges. The maintained generic
bridge is `../server.py`.

## Why some minor versions are omitted

Deployment backups also exist for intermediate versions such as v2.3, v2.5,
v2.6, v2.8, v2.10, v2.11, v2.13, v2.14, v2.16 and v2.17. Most were incremental
bug-fix steps inside one of the architectural phases above. The ten stages here
are meant to tell the implementation story without turning the repository into a
backup dump.
