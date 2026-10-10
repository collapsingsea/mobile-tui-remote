# Mobile TUI Remote

English | [简体中文](README.md)

Control a real terminal on your Linux server from your phone's browser. Originally built for **Claude Code**, it also works with a shell and other terminal applications.

**Install on your server → configure an access address → open it on your phone.** Your phone does not need to install this project.

The Python backend connects to tmux; the web frontend displays the terminal and sends input. Uploading `web/` to a static hosting service alone will not work. Both the page and WebSocket backend must be served through the same address.

## Features

- Live xterm.js terminal over WebSocket and PTY, backed by a persistent tmux session.
- Esc, Ctrl+C, Tab, Enter and arrow-key buttons.
- Mobile keyboard input, terminal-selection copy and clipboard paste.
- Connection status, automatic reconnect and terminal resizing.
- Initial touchpad mode: dragging sends arrow keys; tapping sends Enter.
- Static frontend with no npm install or build step.
- Automatic Chinese/English UI selection, with a manual switch and saved preference.

```text
Phone browser → HTTPS/WSS + authentication → Python PTY bridge → tmux → Claude Code / shell
```

## 1. Install on your server

You need Linux, Python 3.10+, tmux and a modern mobile browser. Install and authenticate Claude Code separately if you want to use it.

```bash
git clone https://github.com/collapsingsea/mobile-tui-remote.git
cd mobile-tui-remote
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Edit as needed. The backend does not load .env automatically.
set -a; . ./.env; set +a

# Keep a shell as the session parent so you can restart the application.
bash scripts/create-session.sh
# Optional, if Claude Code is already installed:
tmux send-keys -t claude-code:0.0 'claude' C-m

python server.py
```

The backend listens on `127.0.0.1:7690` by default. It does not serve the HTML page. Keep it running while configuring access in the next step.

## 2. Choose how to access it

| Access method | Suitable for | Address to open on your phone |
|---|---|---|
| Private network / VPN | Personal use without a public service | `http://SERVER_VPN_IP:8080/mobile/`, or a private HTTPS address |
| Domain + HTTPS + authentication | Access through a regular website address | `https://YOUR_DOMAIN/mobile/` |

Follow the [deployment guide](docs/deployment.en.md) for complete Nginx examples. Both methods serve `web/` at `/mobile/` and proxy `/mobile/ws` to the backend. HTTP over a VPN IP may restrict browser clipboard access; use HTTPS or an SSH tunnel to a phone-local address for clipboard features.

**Protect both the page and WebSocket endpoint with HTTPS and authentication, or restrict them to an authenticated private network/VPN.** Terminal access gives the permissions of the Linux user running the bridge. Never expose the backend port directly to the Internet. See [SECURITY.md](SECURITY.md).

## 3. Open it on your phone

1. Keep the server backend running. Connect to your VPN first if using private access.
2. Open the `/mobile/` address in your phone browser. Authenticate if using the public HTTPS setup.
3. Once the status says **Connected**, tap **Keyboard** to type or use the quick keys.
4. Use the language selector in the top bar to choose **Auto**, **English** or **中文**.

Closing the page does not intentionally stop the application in tmux. Reopening reconnects to the existing session. `/mobile/ws` is a WebSocket endpoint, not a page to open directly.

## Interface language

Auto mode uses the browser's preferred language: `zh`, `zh-CN`, `zh-TW` and other Chinese locales select Simplified Chinese; all other languages select English. Manual preferences are saved per browser and website. Select **Auto** to return to detection. If local storage is blocked, switching still works for the current page but may not survive a reload.

Only the client's buttons, status messages and notifications are translated. Claude Code and other terminal programs control their own output language.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `TUI_HOST` | `127.0.0.1` | Backend bind address |
| `TUI_PORT` | `7690` | Backend port |
| `TUI_HOME` | Current user's home | Child process HOME and working directory |
| `TMUX_SESSION` | `claude-code` | Persistent tmux session name |

If you change the session name, use the same name in commands that create the session and start your application. Long-running service example: [systemd](deploy/mobile-tui.service.example).

## Current limitations

- Touchpad gestures send arrow keys, not terminal mouse-wheel events; this is not a full history browser.
- Copy relies on xterm selection; native mobile long-press selection still needs improvement. Clipboard features require browser permission and a secure context.
- Chinese IME composition and soft-keyboard overlap need further device testing.
- Multiple clients share the same session input and terminal size.
- No separate history UI, native text mirror, full PC keyboard or offline PWA support.

See [ROADMAP.md](ROADMAP.md) for planned work and [CHANGELOG.md](CHANGELOG.md) for recorded changes. Reports with reproduction steps and browser versions are welcome.

## Development checks

```bash
python -m unittest discover -s tests -v
```

Run on Linux with tmux and the Python dependencies installed. Tests use an isolated tmux socket and do not access your everyday sessions.

## License

MIT. See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for the vendored xterm.js files.

Independent project, not affiliated with Anthropic. Does not include Claude Code, accounts, API keys, cookies or login state.
