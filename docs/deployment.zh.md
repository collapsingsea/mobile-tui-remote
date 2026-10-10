# 部署教程

[English](deployment.en.md) | [返回 README](../README.md)

先按 README 在 Linux 服务器安装并启动 `python server.py`。默认后端地址是 `127.0.0.1:7690`；页面由 Nginx 提供。以下配置都在服务器上执行。

## 准备网页目录

在项目目录运行 `pwd`，记下绝对路径。下文示例中的 `/opt/mobile-tui-remote/web/` 必须替换成你实际的 `web/` 路径。Nginx 用户需要有权限遍历父目录并读取网页文件；不要给整个主目录或 `.env` 开放权限。若主目录不可访问，可以只复制网页：

```bash
sudo mkdir -p /var/www/mobile-tui-remote
sudo cp -r web/. /var/www/mobile-tui-remote/
```

此时将 Nginx 的 `alias` 设为 `/var/www/mobile-tui-remote/`。更新版本后需要再次复制完整网页，包括 `app.js`、`app.css`、`i18n.js`、manifest 和 `vendor/`。

以下安装命令适用于 Debian/Ubuntu；其他发行版请使用对应的软件包和 Nginx 配置目录。

```bash
sudo apt-get update
sudo apt-get install nginx apache2-utils
```

## 方式 A：私有网络 / VPN

适合仅自己访问，且手机和服务器已经连接同一个经过身份验证的 VPN。仅有普通公网地址时请使用方式 B。

1. 复制 [私网 Nginx 示例](../deploy/nginx-private.conf.example) 到 `/etc/nginx/sites-available/mobile-tui`。
2. 将 `YOUR_VPN_IP` 换成服务器 VPN 网卡的地址，修改 `alias` 为实际网页目录。只监听该私网地址，并限制 VPN 成员访问；不开放公网端口或路由器端口转发。
3. 首次启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/mobile-tui /etc/nginx/sites-enabled/mobile-tui
sudo nginx -t && sudo systemctl reload nginx
```

4. 手机上连接 VPN，再打开 `http://服务器VPN地址:8080/mobile/`。

这里的 HTTP/WS 由 VPN 隧道提供网络加密，但浏览器仍可能将 VPN IP 的 HTTP 页面视为不安全上下文，因而禁止剪贴板。需要完整复制粘贴时，可在私网也配置方式 B 的 HTTPS，或使用下面的 SSH 转发。

### 无域名的 SSH 转发选项

把私网示例的监听地址改为 `127.0.0.1:8080`，重新加载 Nginx。在**手机上的 SSH 客户端**创建本地转发，等价命令为：

```bash
ssh -N -L 8080:127.0.0.1:8080 your-user@your-server
```

保持手机 SSH 连接，然后在该手机浏览器打开 `http://localhost:8080/mobile/`。现代浏览器通常将 localhost 视为安全上下文；剪贴板仍需授权。转发必须在手机端建立，在电脑上建立不会让手机的 localhost 自动可用。

## 方式 B：域名 + HTTPS + 登录保护

需要域名指向服务器，并已有有效 TLS 证书。将下面的 `YOUR_DOMAIN`、证书路径和网页路径替换后，保存为 `/etc/nginx/sites-available/mobile-tui`：

```nginx
server {
    listen 443 ssl;
    server_name YOUR_DOMAIN;
    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    auth_basic "Mobile TUI";
    auth_basic_user_file /etc/nginx/mobile-tui.htpasswd;

    location = /mobile { return 302 /mobile/; }
    location /mobile/ {
        alias /opt/mobile-tui-remote/web/;
        index index.html;
        add_header Cache-Control "no-store";
    }
    location = /mobile/ws {
        proxy_pass http://127.0.0.1:7690;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
        proxy_buffering off;
    }
}
```

首次创建访问密码，命令会交互式提示输入密码，密码不要放进命令行或仓库：

```bash
sudo htpasswd -c /etc/nginx/mobile-tui.htpasswd mobile
sudo chown root:www-data /etc/nginx/mobile-tui.htpasswd
sudo chmod 640 /etc/nginx/mobile-tui.htpasswd
sudo ln -s /etc/nginx/sites-available/mobile-tui /etc/nginx/sites-enabled/mobile-tui
sudo nginx -t && sudo systemctl reload nginx
```

`www-data` 是 Debian/Ubuntu 常见的 Nginx 用户组，请按实际环境调整。已有密码文件时，增加或修改用户应去掉 `-c`，避免覆盖其他账号。配置已经启用时无需重复创建符号链接。如果域名已有 HTTPS server 块，可以直接加入两个 location 和 server 级认证配置，避免重复 server_name。

手机打开 `https://你的域名/mobile/`，输入设置的用户名 `mobile` 和密码。认证在 server 级生效，同时保护网页和 WebSocket；不要对 `/mobile/ws` 关闭认证。公网仅开放 HTTPS，不开放后端 `7690` 端口。

## 长期运行与排错

临时测试可以在终端运行后端；长期运行使用 [systemd 示例](../deploy/mobile-tui.service.example)，替换用户、组、工作目录和虚拟环境路径，并将 `.env` 配置放到 `/etc/mobile-tui-remote.env`。保护该文件中的私有配置。

| 现象 | 检查什么 |
|---|---|
| 页面 404 / 403 | `/mobile/` 路径、alias 末尾斜杠、网页目录和 Nginx 读取权限 |
| 页面打开但连接失败 | 后端是否运行、端口是否一致、`/mobile/ws` 是否代理和认证、Nginx 错误日志 |
| 502 Bad Gateway | Python 后端未启动，或 Nginx 转发到了错误端口 |
| HTTPS 页面却无法连接 | WebSocket 也需要经同一 HTTPS 地址连接，不能直接访问 HTTP 后端 |
| 无法复制粘贴 | HTTPS/localhost 安全上下文、剪贴板权限和终端选区 |
| 更新后仍显示旧界面 | 同步整个 `web/`，刷新页面并检查代理缓存 |

首次验证先使用普通 shell；确认“已连接”并能输入后，再在 tmux 中启动自己的 Claude Code。切换网页语言不会改变终端程序的语言或清空会话。
