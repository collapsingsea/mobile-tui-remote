#!/usr/bin/env bash
set -euo pipefail

SESSION="${TMUX_SESSION:-claude-code}"
WORKDIR="${TUI_WORKDIR:-$HOME}"
APP_COMMAND="${TUI_APP_COMMAND:-}"
TMUX=("${TMUX_BIN:-tmux}")
if [[ -n "${TMUX_SOCKET:-}" ]]; then
  TMUX+=(-S "$TMUX_SOCKET")
fi

if ! "${TMUX[@]}" has-session -t "$SESSION" 2>/dev/null; then
  "${TMUX[@]}" new-session -d -s "$SESSION" -c "$WORKDIR" /bin/bash -l
fi

if [[ -n "$APP_COMMAND" ]]; then
  "${TMUX[@]}" send-keys -t "$SESSION:0.0" "$APP_COMMAND" C-m
fi

printf 'tmux session ready: %s\n' "$SESSION"
