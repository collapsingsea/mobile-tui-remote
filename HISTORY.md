# Development history

The project started as a small phone-friendly wrapper around a remote terminal.
The difficult part was not WebSocket transport; it was reconciling four behaviors
that desktop terminals get almost for free:

1. smooth scrollback,
2. full-screen alternate-screen TUIs,
3. mouse interaction,
4. native mobile text selection and IME input.

The historical snapshots in `history/` capture the major approaches tried along
the way.

## Phase A — mobile controls around a terminal

The earliest builds added large Esc/Ctrl+C/navigation buttons and experimented
with touch gestures. These versions worked for input but tended to reinterpret a
finger drag as arrow keys or tmux copy-mode commands.

## Phase B — selection and editing

v2.1-v2.7 focused on selection, cursor movement, deleting/cutting selected input,
and avoiding accidental sends. This exposed an important conflict: the same
finger gesture could mean terminal scrolling, text selection, or mouse input.

## Phase C — transparent native text mirror

Around v2.9, a transparent DOM mirror was layered above xterm. The visible screen
still comes from xterm, but Android receives real DOM text for long-press
selection. This remains useful in the current architecture.

## Phase D — scrollback experiments

v2.12-v2.14 tried local xterm scrolling and server-side tmux history. Claude Code
uses an alternate screen heavily, so tmux history could be empty or only a few
lines even though the user had seen much more content.

## Phase E — transcript/history layer experiment

v2.15-v2.18 parsed Claude Code session JSONL and rendered an independent history
view. It solved reconnect history, but created a worse product problem: the user
was no longer looking at the real TUI. Shell-command cards stopped being truly
interactive, colors/state diverged, and typing could happen behind the history
view.

## Phase F — real TUI everywhere

v2.19 removed the history view from the interaction path. The client stays on the
real xterm screen. A phone drag is translated into a genuine xterm wheel event;
in an alternate-screen TUI with mouse reporting, xterm emits the same terminal
mouse/wheel protocol it uses on desktop. Taps outside the active input row are
likewise forwarded as terminal mouse clicks.

That is the architecture used by the maintained open-source client.
