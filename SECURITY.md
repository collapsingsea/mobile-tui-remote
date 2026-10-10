# Security

This project exposes an interactive terminal. Treat access to the web client and
WebSocket endpoint as equivalent to shell access as the service user.

Recommended deployment:

1. Bind the Python bridge to `127.0.0.1` only.
2. Terminate TLS at Nginx/Caddy.
3. Require authentication before both the static UI and WebSocket endpoint.
4. Run under a dedicated, least-privileged Linux user.
5. Do not store model/API credentials in this repository or in frontend code.
6. Keep tmux sockets and service files readable only by the intended account.

There is intentionally no built-in Internet-facing authentication layer in this
repository; deployments differ too much for a single safe default.
