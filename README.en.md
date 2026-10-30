# Mobile TUI Remote

English | [简体中文](README.md)

Control a real terminal on your Linux server from your phone's browser. Originally built for **Claude Code**, the WebSocket → PTY → tmux bridge also works with shells and other terminal applications.

**v0.2.0** brings live TUI touch scrolling, native text selection, an optional PC keyboard, Chinese/English controls, and a preserved archive of the project's development history.

The current public version is **v0.2.1**; its only change from v0.2.0 is `VERSION`. See the [source provenance record](docs/source-provenance.md) for upload/tag comparisons and the investigation of the “0.20” name. This documentation review does not introduce a new application version.

## Install on the server

Requirements: Linux, Python 3.10+, tmux, a modern mobile browser, and an authenticated reverse proxy or private network. Install and authenticate your terminal application separately.

```bash
# Debian/Ubuntu; use equivalent packages on other distributions.
sudo apt-get install python3-venv tmux nginx

git clone https://github.com/collapsingsea/mobile-tui-remote.git
cd mobile-tui-remote
git checkout v0.2.1
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Edit TUI_HOME to your actual home directory. The backend does not load .env.
set -a; . ./.env; set +a

# Create a shell-backed session first so exiting the TUI does not destroy it.
bash scripts/create-session.sh
# Optional, if Claude Code is already installed:
tmux send-keys -t claude-code:0.0 'claude' C-m
python server.py
```

You can also download `mobile-tui-remote-v0.2.1.zip` from the [Release](https://github.com/collapsingsea/mobile-tui-remote/releases/tag/v0.2.1), unzip it, and run the setup from its `mobile-tui-remote/` directory; skip the Git commands. An additional ZIP named `reviewed-…` contains the same application source plus the current provenance documentation and verification tool. Its full source commit is listed in the release verification notes.

The backend listens on `127.0.0.1:7690` and does **not** serve HTML. Host the entire `web/` directory at `/mobile/`, including `i18n.js`, CSS and `vendor/`; proxy `/mobile/ws` to the backend. A static hosting service alone cannot control a terminal. No npm install or frontend build is required.

## Configure access and open on your phone

Use the [English deployment guide](docs/deployment.en.md) or [Chinese guide](docs/deployment.zh.md) for complete Nginx, systemd and authentication instructions.

| Method | Phone address |
|---|---|
| Authenticated VPN/private network | `http://SERVER_VPN_IP:8080/mobile/` or private HTTPS |
| Domain + HTTPS + authentication | `https://YOUR_DOMAIN/mobile/` |
| SSH forwarding from the phone | `http://localhost:8080/mobile/` while the phone's tunnel is open |

Protect **both** the page and WebSocket with authentication and HTTPS, or restrict them to an authenticated private network. Access controls the terminal as the Linux user running the bridge. Do not expose port 7690 directly. See [SECURITY.md](SECURITY.md). Clipboard access generally requires HTTPS or localhost and browser permission.

## Use the terminal

- Wait for **Connected**. Tap **Phone IME** to type; use Esc, Ctrl+C, Tab, Enter and arrows for quick input.
- Drag vertically to send actual xterm wheel events. Full-screen mouse-aware TUIs handle these in their live screen; they retain their colors and interactive regions.
- Tap the active cursor row to move the cursor and open the phone keyboard. Tap other TUI regions to forward a terminal mouse click.
- Long-press on a touch device to select the transparent DOM text mirror; tap **Copy**. Desktop clients can use xterm selection. **Paste** sends clipboard text to the terminal.
- **⌨ PC** toggles the extended keyboard, including Ctrl/Alt/Shift, navigation and F1–F12. Caps/Win/Fn display an unmapped-key notice.
- **Latest** sends Ctrl+End (handled by the remote application) and moves local xterm scrollback to the bottom. **Reconnect** reconnects to the same tmux session.

Clients sharing one tmux session share input and terminal dimensions. Closing a page detaches its client; it does not terminate the tmux application.

## Interface language

The top bar offers **Auto / English / 中文**. Auto selects Simplified Chinese for Chinese browser locales and English otherwise. Manual preferences are saved per browser and website. If local storage is blocked, switching works for the current page. Changing language updates controls, status, notices and accessibility labels without reconnecting or clearing the terminal. Terminal output belongs to the remote program and is not translated.

## History and its limits

Two kinds of history are included:

1. **Development archive:** [HISTORY.md](HISTORY.md) explains the design phases; [history/README.md](history/README.md) indexes 9 frontend and 5 backend snapshots. All 14 uploaded source snapshots are preserved byte for byte. Their internal v2.x labels describe historical experiments, not the public release version. Deploy the root `server.py` and `web/`, not these archives.
2. **Terminal scrollback:** xterm retains up to 20,000 normal-buffer lines in the current page. The persistent tmux pane retains its configured scrollback across disconnects. For a regular shell, enter tmux copy mode with Ctrl+B then `[` to browse retained history after reopening, and `q` to leave. Tmux's default history limit is installation dependent; configure it before creating the session if you need more lines.

Full-screen alternate-buffer TUIs manage their own history and mouse-wheel behavior. Reloading the page does not automatically replay all old output into xterm. v0.2.0 does not enable the archived JSONL transcript experiment or promise persistent model-chat transcripts.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `TUI_HOST` | `127.0.0.1` | Backend bind address |
| `TUI_PORT` | `7690` | Backend port |
| `TUI_HOME` | Current user's home | Child HOME and working directory |
| `TMUX_SESSION` | `claude-code` | Existing session to attach |
| `TMUX_SOCKET` | Empty | Custom tmux socket (also used by the session script) |
| `TMUX_BIN` | `/usr/bin/tmux` | Tmux executable (also used by the session script) |
| `TUI_COMMAND` | Empty | Shell-quoted argv overriding tmux attach; no shell expansion |

The session script also accepts `TUI_WORKDIR` (defaults to `$HOME`) and optional `TUI_APP_COMMAND`. With a custom socket, use `tmux -S "$TMUX_SOCKET"` in manual tmux commands. With a custom session, use that name when starting the TUI. See the [systemd example](deploy/mobile-tui.service.example) for persistent operation.

## Development checks

```bash
python -m unittest discover -s tests -v
python scripts/verify-source.py
node --check web/app.js
node --check web/i18n.js
bash -n scripts/create-session.sh
```

Python tests exercise real PTY input, resize, invalid controls, child exit, reconnect and 120 lines of tmux history on an isolated socket. The browser integration test uses Playwright installed outside this repository:

```bash
PLAYWRIGHT_MODULE=/absolute/path/to/node_modules/playwright/index.mjs \
  python tests/run_browser.py
```

It runs temporary local servers and isolated tmux, checks real xterm scrolling and alternate-screen mouse events, language switching/storage, IME, keyboard controls, reconnect, and mobile layout, then stops its processes. No frontend build step is needed. See [CHANGELOG.md](CHANGELOG.md) and [release verification](docs/verification-v0.2.0.md).

## License

MIT. See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Independent project, not affiliated with Anthropic. No Claude Code binaries, accounts, API keys, cookies or login state are included.
