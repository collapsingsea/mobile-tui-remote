# Changelog

## 0.2.0 — 2026-10-10

- Import the uploaded live-TUI client: real touch wheel/mouse forwarding, native text mirror, phone IME, PC keyboard and manifest.
- Preserve all 14 archival frontend/backend snapshots, with development-history documentation.
- Retain automatic Chinese/English selection and saved manual preferences; translate all new controls, statuses, notices and accessibility labels.
- Fix invalid control-message handling, child exit/cleanup, duplicate reconnects, keyboard overlay sizing, native selection preservation, F1–F12 sequences and custom tmux socket session creation.
- Add real PTY/tmux scrollback and reconnect tests plus browser integration coverage.
- Update bilingual installation, usage and deployment documentation; clarify normal-buffer history, tmux persistence and alternate-screen limits.

中文：合入新版实时 TUI，完整保留 14 份开发快照，补齐中英文界面与文档，修复连接和键盘问题，并实测滚动历史与重连。

## 0.1.1 — 2026-10-10

- Automatically select Chinese or English from the browser's preferred language.
- Add Auto / English / 中文 controls with a saved manual preference.
- Translate UI buttons, connection status, notifications and accessibility labels.
- Adjust mobile controls to fit English labels on narrow screens.
- Add a complete English README and bilingual deployment guides covering private VPN access, phone-local SSH forwarding and authenticated HTTPS access.
- Clarify the server/backend requirement and the exact address to open on a phone.

## 0.1.0 — 2026-10-10

First public release.

- Live xterm.js terminal backed by WebSocket, PTY and a persistent tmux session.
- Mobile quick keys, keyboard input and clipboard controls.
- Initial arrow-key touchpad mode, reconnect and terminal resize.
- Environment configuration, Linux deployment examples and MIT licensing.
- Basic protocol validation and connection cleanup for the public package.
