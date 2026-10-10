# Mobile TUI Remote

[English](README.en.md) | 简体中文

在手机浏览器里操作服务器上的真实终端，最初为远程使用 **Claude Code** 编写，也可以运行 shell 和其他终端程序。

这是运行在你自己 Linux 服务器上的手机终端入口。**在服务器安装 → 配置访问地址 → 用手机浏览器打开**，手机无需安装本项目。

服务器上的 Python 后端负责连接 tmux，网页负责显示与输入。仅将 `web/` 上传到静态网站托管平台无法控制终端，网页和 WebSocket 后端必须通过同一个访问地址提供服务。

当前仍保留首发的基础终端功能，并增加中英文界面自动适配；触控滚动、文本选择与输入体验将继续改进。

## 功能

- xterm.js 显示真实终端，WebSocket + PTY 连接持久 tmux 会话。
- Esc、Ctrl+C、Tab、Enter 和方向键快捷按钮。
- 打开手机键盘输入，复制终端选区、粘贴剪贴板。
- 连接状态提示、断线自动重连、窗口尺寸同步。
- 可切换触控板模式：滑动发送方向键，轻点发送 Enter。
- 静态前端，无需 npm 安装或构建。
- 按浏览器首选语言自动选择中英文；右上角可手动切换并记住偏好。

```text
手机浏览器 → HTTPS/WSS + 身份验证 → Python PTY 桥接 → tmux → Claude Code / shell
```

## 1. 在服务器安装

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

后端默认监听 `127.0.0.1:7690`，不提供 HTML 页面。保持它运行，继续下一步配置网页访问。长期运行可以使用 [systemd 示例](deploy/mobile-tui.service.example)。

## 2. 配置访问地址

选择适合自己的方式，不需要部署两个版本：

| 访问方式 | 适合谁 | 手机打开什么 |
|---|---|---|
| 私有网络 / VPN | 个人使用，不想公开服务 | `http://服务器的VPN地址:8080/mobile/`，或私网 HTTPS 地址 |
| 域名 + HTTPS + 登录保护 | 希望随时通过网址访问 | `https://你的域名/mobile/` |

完整步骤和可复制的 Nginx 配置见 [部署教程](docs/deployment.zh.md)。私网方式也需要提供网页并代理 WebSocket；Python 后端默认不提供网页。通过 VPN IP 使用 HTTP 时，浏览器可能限制剪贴板；要完整使用复制粘贴，使用 HTTPS 或手机本机 SSH 转发地址。

**部署前必须为页面和 WebSocket 同时配置 HTTPS 与身份验证，或仅通过经过身份验证的私有网络 / VPN 访问。** 桥接默认只监听本机，不内置登录功能；获得访问权就等于获得该服务用户的终端权限。请阅读 [SECURITY.md](SECURITY.md)。

## 3. 用手机打开

1. 保持服务器上的后端运行；私网方案先连接 VPN。
2. 用手机浏览器打开上表中的 `/mobile/` 地址，公网方案先通过身份验证。
3. 状态显示“已连接 / Connected”后，点击“键盘 / Keyboard”输入，或使用快捷键。
4. 右上角的语言选择默认是“自动 / Auto”。它只改变网页按钮和提示，Claude Code 等终端程序的输出语言由程序自身决定。

关闭网页不会主动结束 tmux 中的应用。重新打开可重新连接已有会话。不要把 `/mobile/ws` 当作网页打开，它是终端连接端点。

## 界面语言

浏览器首选语言为 `zh`、`zh-CN`、`zh-TW` 等中文语言时显示简体中文，其余默认英文。手动选择保存在当前浏览器、当前网站的本地存储中；选择“自动”即可恢复检测。若浏览器禁止本地存储，切换仍对当前页面有效，但刷新后可能需要重新选择。

## 配置

| 变量 | 默认值 | 用途 |
|---|---|---|
| `TUI_HOST` | `127.0.0.1` | 桥接监听地址 |
| `TUI_PORT` | `7690` | 桥接端口 |
| `TUI_HOME` | 当前用户的主目录 | 子进程 HOME 和工作目录 |
| `TMUX_SESSION` | `claude-code` | 持久 tmux 会话名 |

修改会话名后，创建会话和启动应用的命令也要使用相同名称。

## 当前限制

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

完整英文说明见 [README.en.md](README.en.md)，英文部署教程见 [Deployment guide](docs/deployment.en.md)。

## License

MIT. [LICENSE](LICENSE). Vendored xterm.js and fit addon notices are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

本项目是独立项目，与 Anthropic 无隶属关系；不包含 Claude Code 本体、账号、API 密钥、Cookie 或登录状态。
