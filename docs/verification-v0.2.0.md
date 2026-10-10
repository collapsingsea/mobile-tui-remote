# v0.2.0 release verification / 发行验证

Date / 日期：2026-10-10. Local platform / 本地环境：Ubuntu aarch64, Python 3.10.12, websockets 13.1, Node 24.17.0, tmux 3.2a, Playwright 1.55.0 with preinstalled Chromium.

The original upload was identified by file ID `458b8eb822b50b463333415bb8cfa0cd`, filename `mobile-tui-remote-v0.2.0-with-history.zip`, size 158,479 bytes and SHA-256:

```text
b2ddefb4e25f2b6079af63045d0fe2a5f3ff411c90f48c17ec9a0fae150a26a6
```

The ZIP's internal `VERSION` was 0.1.0. The maintained release is normalized to 0.2.0 and retains the repository's bilingual documentation, vendor license and hardened deployment examples. All 9 frontend and 5 backend archival source files match the upload byte for byte.

原包内部版本仍为 0.1.0，发行已统一为 0.2.0；保留仓库双语文档、第三方许可与安全部署示例。14 份归档源码与上传包逐字节一致。

## Commands and observed results / 命令与实际结果

The host did not have tmux installed globally. A distribution tmux package was extracted under `/tmp/mobile-tui-v020-tools` solely for tests; server configuration and system packages were not changed. Python dependencies were installed in the repository's ignored `.venv`.

```bash
TMUX_BIN=/tmp/mobile-tui-v020-tools/usr/bin/tmux \
  .venv/bin/python -m unittest discover -s tests -v
```

Result: **5 tests passed**. Real PTY input and resize were verified, malformed control messages remained connected, a finished child closed its WebSocket, command configuration was checked, and the tmux session retained its environment across reconnects.

Historical evidence: the test generated `HISTORY_001` through `HISTORY_120`, detached the WebSocket, captured tmux scrollback, reconnected and captured again. Both captures contained the first and last history markers; the reconnected shell accepted another command.

结果：**5 项通过**。生成的 `HISTORY_001` 至 `HISTORY_120` 在断开和重连后的 tmux 历史中均存在，重连后可以继续输入。

```bash
TMUX_BIN=/tmp/mobile-tui-v020-tools/usr/bin/tmux \
PLAYWRIGHT_MODULE=/srv/openai-worker/moka-pw/node_modules/playwright/index.mjs \
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/srv/openai-worker/cache/ms-playwright/chromium-1234/chrome-linux/chrome \
  .venv/bin/python tests/run_browser.py
```

Result: **passed**, with no browser JavaScript errors.

- Real same-origin browser → WebSocket → PTY → isolated tmux round trip, phone IME input and persistent session state after manual reconnect. The reconnected browser entered tmux copy mode and displayed the retained `BROWSER_SCROLL_001` marker from 120 earlier lines.
- Chinese automatic selection, English manual selection, persisted preference after reload, return to automatic detection, and switching with blocked local storage. Language changes did not open another WebSocket or clear terminal output.
- F1–F12 emitted their expected terminal sequences; opening the PC keyboard resized and clipped the terminal so its contents could not cover keys; keyboard toggle and unmapped-key notices worked. No horizontal page overflow at 320px width.
- A controlled WebSocket fixture fed **240 normal-buffer history lines** into the real vendored xterm. Touch forwarding moved the viewport from 201 to 189, the earliest marker remained in the buffer, Latest returned to the bottom, and the native DOM mirror selection survived pending rendering and copied the expected marker to the clipboard.
- After the fixture entered the alternate screen and enabled SGR mouse reporting, a touch drag emitted an actual SGR wheel sequence while staying in the alternate buffer.

浏览器验证通过：实测输入、会话保留、中英切换与保存、F1–F12、320px 布局，以及 240 行 xterm 历史。触摸事件使视口从 201 滚到 189；备用屏拖动发送真实 SGR 滚轮协议。没有 JavaScript 错误。

```bash
.venv/bin/python -m compileall -q server.py tests history/backends
node --check web/app.js
node --check web/i18n.js
node --check tests/browser.mjs
bash -n scripts/create-session.sh
git diff --check
```

Result: **passed**. The static frontend ships directly; no build bundle is required. Local Markdown links and all 14 archive comparisons also passed.

## Scope / 范围

Browser testing uses Chromium mobile emulation and synthetic touch events. Physical Android long-press selection, a real phone IME, an external HTTPS proxy and a logged-in Claude Code session were **not** exercised. The test uses a regular shell and an alternate-screen protocol fixture and never accesses personal model credentials or existing terminal sessions.

使用 Chromium 手机模拟和合成触摸事件；未实测实体 Android 长按选区、实体手机输入法、外部 HTTPS 代理或已登录的 Claude Code。所有测试使用隔离 shell 和协议测试数据。

Normal-buffer xterm history lasts for the current page; tmux scrollback lasts for its persistent session. Full-screen TUIs own their alternate-screen history. The archived JSONL transcript implementation is preserved for study and is not active in v0.2.0. See the bilingual READMEs for browsing tmux history after reconnect.
