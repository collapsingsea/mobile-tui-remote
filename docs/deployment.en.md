# Deployment guide

[简体中文](deployment.zh.md) | [Back to README](../README.en.md)

Install the project on your Linux server and run `python server.py` as described in the README. The backend defaults to `127.0.0.1:7690`; Nginx serves the page. Run the commands below on the server unless stated otherwise.

## Prepare the web directory

Run `pwd` inside the project and note the absolute path. Replace `/opt/mobile-tui-remote/web/` in the examples with your actual `web/` path. Nginx must be able to traverse parent directories and read the web files. Avoid opening permissions on your entire home directory or `.env`. If your home directory is inaccessible, copy only the frontend instead:

```bash
sudo mkdir -p /var/www/mobile-tui-remote
sudo cp -r web/. /var/www/mobile-tui-remote/
```

Then set the Nginx `alias` to `/var/www/mobile-tui-remote/`. Repeat the copy after frontend updates, including `i18n.js` and `vendor/`.

These package commands and configuration paths are for Debian/Ubuntu. Use the equivalents for your distribution.

```bash
sudo apt-get update
sudo apt-get install nginx apache2-utils
```

## Option A: private network / VPN

Use this if your phone and server already share an authenticated VPN. If you only have a public server address, use Option B.

1. Copy the [private Nginx example](../deploy/nginx-private.conf.example) to `/etc/nginx/sites-available/mobile-tui`.
2. Replace `YOUR_VPN_IP` with the server's VPN interface address and set `alias` to your web directory. Listen only on that private address and restrict VPN membership/access. Do not expose or forward this port publicly.
3. Enable the configuration once:

```bash
sudo ln -s /etc/nginx/sites-available/mobile-tui /etc/nginx/sites-enabled/mobile-tui
sudo nginx -t && sudo systemctl reload nginx
```

4. Connect your phone to the VPN and open `http://SERVER_VPN_IP:8080/mobile/`.

The VPN encrypts HTTP/WS traffic in transit, but a browser may still treat HTTP on a VPN IP as an insecure context and block clipboard access. For clipboard features, use HTTPS inside your private network as in Option B, or use the SSH tunnel below.

### SSH tunnel without a domain

Change the private example to listen on `127.0.0.1:8080` and reload Nginx. Configure local forwarding in an SSH client **on your phone**, equivalent to:

```bash
ssh -N -L 8080:127.0.0.1:8080 your-user@your-server
```

Keep that phone SSH connection open and browse to `http://localhost:8080/mobile/` on the same phone. Modern browsers generally treat localhost as a secure context; clipboard permission is still required. Creating the tunnel on your computer will not make it available at your phone's localhost.

## Option B: domain + HTTPS + authentication

Point a domain to your server and obtain a valid TLS certificate first. Replace `YOUR_DOMAIN`, the certificate paths and web directory below, then save this as `/etc/nginx/sites-available/mobile-tui`:

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

Create the access password interactively. Do not put the password in a command or commit it:

```bash
sudo htpasswd -c /etc/nginx/mobile-tui.htpasswd mobile
sudo chown root:www-data /etc/nginx/mobile-tui.htpasswd
sudo chmod 640 /etc/nginx/mobile-tui.htpasswd
sudo ln -s /etc/nginx/sites-available/mobile-tui /etc/nginx/sites-enabled/mobile-tui
sudo nginx -t && sudo systemctl reload nginx
```

`www-data` is the usual Debian/Ubuntu Nginx group; adjust for your environment. Omit `-c` when adding or updating users in an existing password file so you do not overwrite it. Skip the symlink command if the configuration is already enabled. If the domain already has an HTTPS server block, add the two locations and server-level authentication there instead of duplicating the server name.

Open `https://YOUR_DOMAIN/mobile/` on your phone and enter username `mobile` and your chosen password. Server-level authentication protects both the page and WebSocket endpoint; do not disable it for `/mobile/ws`. Expose HTTPS publicly, not the backend's `7690` port.

## Keep it running and troubleshoot

Running the backend in a terminal is enough for an initial check. For a persistent service, use the [systemd example](../deploy/mobile-tui.service.example), replacing the user, group, working directory and virtualenv paths. Put the `.env` settings in `/etc/mobile-tui-remote.env` and protect any private configuration there.

| Symptom | What to check |
|---|---|
| Page returns 404 / 403 | `/mobile/` path, trailing slash in alias, actual web files and Nginx read permissions |
| Page loads but does not connect | Running backend, matching port, proxy and authentication for `/mobile/ws`, Nginx error log |
| 502 Bad Gateway | Backend not running or incorrect upstream port |
| HTTPS page cannot connect | WebSocket must go through the same HTTPS address, not directly to the HTTP backend |
| Clipboard does not work | Secure HTTPS/localhost context, browser permissions and a terminal selection |
| Old UI after updating | Copy the entire `web/` folder, refresh the page and check proxy caching |

Test with a regular shell first. Once the status is **Connected** and input works, start your own Claude Code inside tmux. Changing the UI language does not change terminal-program language or clear the session.
