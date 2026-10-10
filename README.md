# Mobile TUI Remote

在手机浏览器里操作服务器上的真实终端，最初为远程使用 **Claude Code** 编写，也可以运行 shell 和其他终端程序。

**v0.1.0 · 首个公开版本**。这是从最初原型整理出的基础版：保留实时终端和手机快捷键，后续逐步改进触控滚动、文本选择与输入体验。

## 功能

- xterm.js 显示真实终端，WebSocket + PTY 连接持久 tmux 会话。
- Esc、Ctrl+C、Tab、Enter 和方向键快捷按钮。
- 打开手机键盘输入，复制终端选区、粘贴剪贴板。
- 连接状态提示、断线自动重连、窗口尺寸同步。
- 可切换触控板模式：滑动发送方向键，轻点发送 Enter。
- 静态前端，无需 npm 安装或构建。

```text
手机浏览器 → HTTPS/WSS + 身份验证 → Python PTY 桥接 → tmux → Claude Code / shell
```

## 快速开始

服务端需要 Linux、Python 3.10+、tmux；客户端需要现代手机浏览器。Claude Code 由你自行安装和登录。

```bash
git clone https://github.com/collapsingsea/mobile-tui-remote.git
cd mobile-tui-remote
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# 根据需要编辑 .env；它不会自动加载。
set -a; . ./.env; set +a

# 先创建 shell 会话，应用退出后仍可重新启动。
bash scripts/create-session.sh
# 如果已经安装 Claude Code，可在会话里启动它：
tmux send-keys -t claude-code:0.0 'claude' C-m

python server.py
```

通过反向代理把 `web/` 映射到 `/mobile/`，把 `/mobile/ws` 转发到 `127.0.0.1:7690`，然后用手机打开 `https://你的域名/mobile/`。部署片段见 [Nginx 示例](deploy/nginx.conf.example)，长期运行见 [systemd 示例](deploy/mobile-tui.service.example)。使用 systemd 时需替换用户、目录，并将 `.env` 配置放到示例指定的 `/etc/mobile-tui-remote.env`。

**部署前必须为页面和 WebSocket 同时配置 HTTPS 与身份验证，或仅通过私有 VPN 访问。** 桥接默认只监听本机，不内置登录功能；获得访问权就等于获得该服务用户的终端权限。请阅读 [SECURITY.md](SECURITY.md)。

## 配置

| 变量 | 默认值 | 用途 |
|---|---|---|
| `TUI_HOST` | `127.0.0.1` | 桥接监听地址 |
| `TUI_PORT` | `7690` | 桥接端口 |
| `TUI_HOME` | 当前用户的主目录 | 子进程 HOME 和工作目录 |
| `TMUX_SESSION` | `claude-code` | 持久 tmux 会话名 |

修改会话名后，创建会话和启动应用的命令也要使用相同名称。

## v0.1.0 的限制

- 触控板滑动发送方向键，尚未实现真实鼠标滚轮协议；不要把它当作完整的历史浏览功能。
- 复制依赖 xterm 的选区，手机长按选区体验仍需改进；剪贴板需要 HTTPS 和浏览器授权。
- 中文输入法的组合输入与软键盘遮挡仍需在不同手机上验证。
- 多客户端连接同一会话会共用输入与终端尺寸。
- 不包含独立历史记录界面、原生文本镜像、完整 PC 键盘或 PWA 离线支持。

后续方向见 [ROADMAP.md](ROADMAP.md)，已发布改动见 [CHANGELOG.md](CHANGELOG.md)。欢迎提交复现步骤、浏览器版本和问题截图。

## 开发验证

```bash
python -m unittest discover -s tests -v
```

测试在 Linux 上运行，需要 tmux 和已安装的 Python 依赖；测试使用独立 tmux socket，不会访问你的日常会话。

## English

A mobile browser client for a live remote terminal, originally built for Claude Code. This first public release provides a WebSocket/PTY bridge to tmux, touch-friendly quick keys, clipboard controls, reconnect and resize. The initial touchpad sends arrow keys; improved scrolling and native selection are planned. Run the Linux backend with `python server.py`, serve `web/` at `/mobile/`, and proxy `/mobile/ws` through an authenticated HTTPS reverse proxy. Read the security and deployment notes above before use.

## License

MIT. [LICENSE](LICENSE). Vendored xterm.js and fit addon notices are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

本项目是独立项目，与 Anthropic 无隶属关系；不包含 Claude Code 本体、账号、API 密钥、Cookie 或登录状态。
