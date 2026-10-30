# Source provenance / 源码来源核验

Review date / 核验日期：2026-10-30.

## 中文

### 结论与范围

通过当前 GitHub 身份枚举仓库，确认目标为公开的
[`collapsingsea/mobile-tui-remote`](https://github.com/collapsingsea/mobile-tui-remote)。
核查了全部 3 个远程分支、4 个标签、4 条 Release、2 个已合并 PR、Git 提交历史、
可访问源码包以及既有发行工作区。没有发现另一个 `mobile-tui` 仓库或更晚的功能源码。
这只说明这些来源中的核查结果，不能证明其他机器或离线备份不存在新源码。

**最新可核实的功能实现是 v0.2.0，最新公开版本是 v0.2.1。**
后者只修改了 `VERSION`。没有 manifest、Git 标签、提交或发行记录支持将版本写成
`0.20`、`0.20.0` 或 `2.20`。历史文档中的 v2.x 是开发实验编号；`HISTORY.md`
说明最终实时 TUI 架构始于内部 v2.19，这不能推导出一个不存在证据的 v2.20 版本。

本轮保留应用版本 `0.2.1`、全部已有提交、标签、原始发行附件及 MIT 许可。
更改限于双语安装说明、来源记录、校验工具和 CI；没有把旧代码改版本号冒充新实现。
现有英文界面、自动/手动语言选择、偏好保存和英文部署文档均已核查并实测。

### 原始包与真正的代码差异

| 来源 | 证据 |
|---|---|
| `mobile-tui-remote-v0.1.0.zip` | 86,080 字节，SHA-256 `4f42fed8fa62e390489fe3df673b2e28ff7afd8dfc49df04c1341163aaaff96b` |
| `mobile-tui-remote-v0.2.0-with-history.zip` | 158,479 字节，SHA-256 `b2ddefb4e25f2b6079af63045d0fe2a5f3ff411c90f48c17ec9a0fae150a26a6`；内部 `VERSION` 仍是 `0.1.0` |
| 两个原始 ZIP 的比较 | 全部 21 个共同文件逐字节相同；第二个包仅新增 16 个历史文件，包括 14 份源码快照和两篇索引/说明 |
| v0.2.0 的真实功能合入 | 提交 `67e2f997359411f49ca3458758dd2548664011ba` 导入实时 TUI、触摸滚轮、文字镜像和电脑键盘，保留并补齐双语界面；37 个文件发生变化，新增 2,330 行、删除 186 行；随后补充浏览器测试修正 |
| 原始包到 v0.2.0 标签 | 原包 37 个文件中 25 个未变、12 个经适配；仓库另增 13 个文件。14 份归档源码全部逐字节保留；正式应用代码做过公开记录的修正，并非宣称与原包完全相同 |

完整原包文件哈希和发行包哈希见 [source-provenance.json](source-provenance.json)。
原始包内的版本、文件名和 GitHub 早期标签不能混为一谈。

### 标签与公开发行包

| 标签 | 指向提交 | 发行 ZIP 的 SHA-256 |
|---|---|---|
| v0.2.0 | `fbc19c88f0a6b9d05b0bc5b439c00b6e7eff9300` | `12c99f1b80d6440d0420843f4c61f664f674ef498f1bea365fcd63fed421ecc4` |
| v0.2.1 | `d6277f071b084099b8e21bda91a04300c56da433` | `bc4e755202a9819768b3acb712efb209931c9995cc5196a0811704c6b3e16a2f` |

重新从 GitHub 下载两个发行包并校验 `SHA256SUMS`。每个包均为 189,152 字节、
50 个文件，每个文件都与对应标签一致。两包之间唯一不同的文件是 `VERSION`。

```bash
git diff v0.2.0 v0.2.1
python scripts/verify-source.py
# 可选：你持有原始上传包时，核验包哈希、文件清单及所有 37 个文件。
python scripts/verify-source.py --original-zip /path/to/mobile-tui-remote-v0.2.0-with-history.zip
```

本轮附加的 `reviewed-…` 源码包由核验文档提交的 Git 树直接生成；应用版本仍为
0.2.1。其完整提交、文件名、校验和及验证结果记录在 Release 附件中，原始标签和
原始发行包不变。GitHub 自动生成的标签源码 ZIP 继续代表原始标签。

### 实测与公开内容审查

- 5 项真实 PTY/tmux 测试通过：输入、尺寸、异常控制消息、子进程退出、配置和重连；
  `HISTORY_001` 至 `HISTORY_120` 在断线后仍保留。
- Chromium 手机模拟通过：中英自动/手动切换、保存偏好、禁止 localStorage 后切换、
  不重连/不清屏、IME 输入、F1–F12、320px 布局、复制、重连后浏览 tmux 历史、
  240 行 xterm 历史及备用屏 SGR 滚轮；没有 JavaScript 错误。
- 追溯扫描现有 Git 全历史的 75 个独立源码 blob，以及当前文件和公开发行包，
  未发现高置信度私钥、GitHub/API token 或硬编码凭据。文件中 IP 仅为回环/监听示例，
  home 路径为占位符；旧验证记录中的测试工具路径不包含账号凭据或运行数据。
- 公开内容包含源码、测试、部署示例、文档、MIT 和第三方许可；不打包 `.git`、`.venv`、
  `.env`、数据库、会话日志或个人模型登录数据。校验工具只读取包，不解压或执行包内代码。

扫描不能保证不存在所有形式的秘密。测试使用临时本地服务器和隔离 tmux socket；
未读取私人运行数据，未测试已登录 Claude Code、实体手机或外部 HTTPS 部署，
也未部署本机远程控制服务。前端是静态源码，无 npm 构建步骤。

## English

### Findings and scope

Enumerating repositories with the active GitHub account identified the public
[`collapsingsea/mobile-tui-remote`](https://github.com/collapsingsea/mobile-tui-remote)
repository. The investigation covered all three remote branches, four tags, four
releases, two merged pull requests, Git history, accessible source uploads and
existing release workspaces. No separate `mobile-tui` repository or later
implementation was found in those sources. This does not rule out source on
another machine or in an offline backup.

**v0.2.0 is the latest verified functional implementation; v0.2.1 is the latest
public version.** The latter changes only `VERSION`. No manifest, tag, commit or
release establishes a `0.20`, `0.20.0` or `2.20` version. Internal v2.x names refer
to development experiments. `HISTORY.md` dates the live-TUI architecture to
internal v2.19; that does not establish a later v2.20 implementation.

This review preserves version `0.2.1`, all existing commits and tags, original
release assets and the MIT license. Only bilingual installation documentation,
provenance records, a verification tool and CI change. It does not relabel old
code as a new implementation. Existing English controls, automatic/manual
language selection, saved preferences and English deployment instructions were
reviewed and exercised.

### Source and release evidence

The original `mobile-tui-remote-v0.1.0.zip` is 86,080 bytes, with SHA-256
`4f42fed8fa62e390489fe3df673b2e28ff7afd8dfc49df04c1341163aaaff96b`.
The later `mobile-tui-remote-v0.2.0-with-history.zip` is 158,479 bytes, with SHA-256
`b2ddefb4e25f2b6079af63045d0fe2a5f3ff411c90f48c17ec9a0fae150a26a6`,
but still contains `VERSION=0.1.0`. All 21 shared files are identical; the later
ZIP adds 14 historical source snapshots and two history documents.

Commit `67e2f997359411f49ca3458758dd2548664011ba` imported the live-TUI
implementation, touch wheel forwarding, native text mirror and PC keyboard,
retained/completed localization and fixed application behavior. Its diff spans
37 files, with 2,330 insertions and 186 deletions, followed by browser-test fixes.
Of the original upload's 37 files, 25 match the v0.2.0 tag and 12 were adapted;
the repository adds another 13 files. All 14 historical source snapshots match
the upload byte for byte. The maintained application includes documented fixes
and is not claimed to be identical to the upload.

The tag commits and original release ZIP hashes are listed in the table above
and in [source-provenance.json](source-provenance.json). Both release ZIPs were
downloaded again and checked against their published `SHA256SUMS`: each contains
50 files, totals 189,152 bytes, and matches its tag exactly. Comparing v0.2.0 and
v0.2.1 reveals only the `VERSION` difference. Original upload names, embedded
versions and early GitHub tags are separate pieces of evidence.

Run the commands above to inspect the tag diff and verify all archived hashes.
With `--original-zip`, the tool also checks the original ZIP hash, inventory and
all 37 source entries, without extracting or executing them.

The additional `reviewed-…` source archive comes directly from the Git tree of
the documentation review commit. Its application version remains 0.2.1. The
release's verification attachment records its full commit, filename, checksums
and observed results. Original tags and release assets remain intact; GitHub's
automatic tag archives still represent the original tags.

### Verification and publication review

All five real PTY/tmux tests passed, covering input, resize, malformed controls,
child exit, configuration and reconnect. Markers `HISTORY_001` through
`HISTORY_120` survived disconnect. Chromium mobile emulation passed bilingual
automatic/manual switching and persistence, blocked-storage switching, switching
without reconnect/output loss, IME input, F1–F12, 320px layout, clipboard copy,
tmux history after reconnect, 240 xterm history lines and alternate-screen SGR
wheel forwarding. No browser JavaScript errors were reported.

Scanning the 75 unique source blobs in existing Git history, current files and
original public ZIPs found no high-confidence private keys, GitHub/API tokens or
hardcoded credentials. IP addresses are loopback/listen examples and home paths
are placeholders. Historical verification tool paths contain no credentials or
runtime data. Source archives include code, tests, deployment examples, docs,
MIT and third-party notices; they exclude `.git`, `.venv`, `.env`, databases,
session logs and personal model login data. Pattern scanning cannot prove that
every possible kind of secret is absent.

Tests use temporary local servers and isolated tmux sockets. No personal runtime
data was read. Logged-in Claude Code, physical phones and external HTTPS
deployment were not tested, and no local remote-control service was deployed.
The frontend ships as static source and requires no npm build.
