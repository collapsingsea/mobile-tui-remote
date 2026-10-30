# Mobile TUI Remote

[English](README.en.md) | 简体中文

用手机浏览器操作自己 Linux 服务器上的真实终端。最初为 **Claude Code** 编写，也支持 shell 和其他终端应用，使用 WebSocket → PTY → tmux 桥接。

**v0.2.0** 加入真实 TUI 触摸滚动、原生文字选择、电脑键盘、中英文控件，以及完整保留的开发历史快照。

当前公开版本为 **v0.2.1**，与 v0.2.0 相比仅修改 `VERSION`。源码来源、上传包与标签的比较，以及“0.20”命名核查见[来源核验记录](docs/source-provenance.md)。本次文档核验没有发布新的功能版本。

## 在服务器安装

需要 Linux、Python 3.10+、tmux、现代手机浏览器，以及有身份验证的反向代理或私有网络。终端应用由你自行安装和登录。

```bash
# Debian/Ubuntu；其他发行版使用对应的软件包。
sudo apt-get install python3-venv tmux nginx

git clone https://github.com/collapsingsea/mobile-tui-remote.git
cd mobile-tui-remote
git checkout v0.2.1
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# 将 TUI_HOME 改为你的实际主目录；后端不会自动加载 .env。
set -a; . ./.env; set +a

# 先创建 shell 会话，应用退出后会话仍存在。
bash scripts/create-session.sh
# 如果已安装 Claude Code，可选：
tmux send-keys -t claude-code:0.0 'claude' C-m
python server.py
```

也可以从 [Release](https://github.com/collapsingsea/mobile-tui-remote/releases/tag/v0.2.1) 下载 `mobile-tui-remote-v0.2.1.zip`，解压后进入 `mobile-tui-remote/`，跳过 Git 命令执行安装。带 `reviewed-` 的附加 ZIP 使用同一应用源码，另含当前核验文档与工具；其完整提交号见同页核验说明。

后端默认监听 `127.0.0.1:7690`，**不提供 HTML 页面**。将完整 `web/`（含 i18n.js、CSS、vendor）部署到 `/mobile/`，代理 `/mobile/ws` 到后端。只上传到静态网站不能操作终端；无需 npm 安装或前端构建。手机无需安装本项目。

## 配置访问地址并用手机打开

完整 Nginx、systemd 与登录保护说明见 [中文部署教程](docs/deployment.zh.md) 和 [英文部署教程](docs/deployment.en.md)。

| 方式 | 手机地址 |
|---|---|
| 有身份验证的 VPN / 私有网络 | `http://服务器VPN地址:8080/mobile/` 或私网 HTTPS |
| 域名 + HTTPS + 登录保护 | `https://你的域名/mobile/` |
| 手机上的 SSH 本地转发 | 隧道保持连接时打开 `http://localhost:8080/mobile/` |

页面和 WebSocket **都要**有身份验证与 HTTPS，或只允许经过身份验证的私网访问。访问者拥有运行桥接的 Linux 用户的终端权限；不要公开暴露 7690 端口。见 [SECURITY.md](SECURITY.md)。剪贴板通常需要 HTTPS / localhost 和浏览器授权。

## 使用终端

- 显示“已连接”后，点击“手机输入”打开输入法；使用 Esc、Ctrl+C、Tab、Enter 和方向快捷键。
- 上下拖动会发送真实 xterm 滚轮事件；支持鼠标的全屏 TUI 在实时界面中处理滚动，保留颜色和交互区域。
- 轻点当前光标行可移动光标并打开输入法；轻点其他 TUI 区域会转发终端鼠标点击。
- 触摸设备长按透明 DOM 文字镜像选择文字，再点击“复制”；电脑可使用 xterm 选区。“粘贴”发送剪贴板文字。
- “⌨ 电脑”展开电脑键盘，支持 Ctrl/Alt/Shift、导航键和 F1–F12；Caps/Win/Fn 会提示未映射。
- “最新”发送 Ctrl+End（由终端应用处理），并将本地 xterm 滚动到底部。“重连”连接同一 tmux 会话。

多个客户端共用一个 tmux 会话的输入和尺寸。关闭网页只会断开该客户端，不会主动结束 tmux 应用。

## 界面语言

顶部提供 **自动 / English / 中文**。浏览器首选语言为中文时自动显示简体中文，其余默认英文；手动选择保存在当前浏览器和网站中。禁止本地存储时仍可在当前页面切换。切换即时更新按钮、状态、提示和无障碍标签，不重连、不清空终端。终端程序自己的输出不会被翻译。

## 历史记录及边界

包含两种历史：

1. **开发历史**：[HISTORY.md](HISTORY.md) 说明设计阶段；[history/README.md](history/README.md) 索引 9 份前端和 5 份后端快照。上传包的 14 份源码快照逐字节保留。内部 v2.x 是早期实验编号，公开发行版本统一为 v0.2.0。部署根目录的 server.py 和 web/，不要部署归档版本。
2. **终端滚动历史**：当前页面的 xterm 普通缓冲区最多保存 20,000 行；持久 tmux pane 按其配置保留滚动历史，断线后仍存在。普通 shell 重新连接后可按 Ctrl+B，再按 `[` 进入 tmux 复制模式查看历史，按 `q` 返回。tmux 默认历史容量随安装配置而异，需要更多历史时在创建会话前配置。

全屏备用缓冲区 TUI 自己管理历史和鼠标滚轮。刷新页面不会自动将全部旧输出重放到 xterm。此版本未启用归档中的 JSONL 对话实验，也不承诺持久保存模型聊天记录。

## 配置

| 变量 | 默认值 | 用途 |
|---|---|---|
| `TUI_HOST` | `127.0.0.1` | 后端监听地址 |
| `TUI_PORT` | `7690` | 后端端口 |
| `TUI_HOME` | 当前用户主目录 | 子进程 HOME 与工作目录 |
| `TMUX_SESSION` | `claude-code` | 要连接的已有会话 |
| `TMUX_SOCKET` | 空 | 自定义 tmux socket；创建脚本也使用它 |
| `TMUX_BIN` | `/usr/bin/tmux` | tmux 可执行文件；创建脚本也使用它 |
| `TUI_COMMAND` | 空 | 用带 shell 引号的参数列表覆盖 tmux attach；不执行 shell 展开 |

创建脚本还支持 `TUI_WORKDIR`（默认 `$HOME`）和可选 `TUI_APP_COMMAND`。自定义 socket 时，手动命令使用 `tmux -S "$TMUX_SOCKET"`；自定义会话名时，启动应用也使用同名会话。长期运行见 [systemd 示例](deploy/mobile-tui.service.example)。

## 开发验证

```bash
python -m unittest discover -s tests -v
python scripts/verify-source.py
node --check web/app.js
node --check web/i18n.js
bash -n scripts/create-session.sh
```

Python 测试在独立 tmux socket 上实测 PTY 输入、尺寸、异常消息、子进程退出、重连和 120 行历史。浏览器集成测试使用仓库外安装的 Playwright：

```bash
PLAYWRIGHT_MODULE=/绝对路径/node_modules/playwright/index.mjs \
  python tests/run_browser.py
```

临时本地服务器与独立 tmux 测试真实 xterm 滚动、备用屏鼠标事件、语言保存、输入法、键盘、重连与手机布局，结束时清理进程。无需前端构建。见 [CHANGELOG.md](CHANGELOG.md) 和 [发行验证记录](docs/verification-v0.2.0.md)。

## License

MIT，见 [LICENSE](LICENSE)、[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。本项目与 Anthropic 无隶属关系；不包含 Claude Code 本体、账号、API 密钥、Cookie 或登录状态。
