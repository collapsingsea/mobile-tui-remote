"""Temporary same-origin HTTP/WebSocket test host; no production sessions used."""
import asyncio
from http import HTTPStatus
import mimetypes
import os
from pathlib import Path
import subprocess
import sys
import tempfile
from urllib.parse import urlsplit

from websockets.server import serve

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import server


async def fixture(ws):
    async for message in ws:
        if isinstance(message, str) and '"resize"' in message:
            await ws.send(b''.join(f"BROWSER_HISTORY_{i:03}\r\n".encode() for i in range(1, 241)) + b"FIXTURE_READY\r\n")
            break
    async for message in ws:
        if message == b"ENABLE_ALT":
            await ws.send(b"\x1b[?1049h\x1b[?1000h\x1b[?1006hALT_READY")


async def request(path, headers):
    path = urlsplit(path).path
    if path in ("/mobile/ws", "/fixture/ws"):
        return None
    prefix = "/mobile/" if path.startswith('/mobile/') else '/fixture/'
    rel = path.removeprefix(prefix) or "index.html"
    file = (ROOT / "web" / rel).resolve()
    if not file.is_relative_to(ROOT / "web") or not file.is_file():
        return HTTPStatus.NOT_FOUND, [], b"Not found"
    return HTTPStatus.OK, [('Content-Type', mimetypes.guess_type(file)[0] or 'application/octet-stream')], file.read_bytes()


async def main():
    tmux = os.environ.get("TMUX_BIN", "/usr/bin/tmux")
    with tempfile.TemporaryDirectory(prefix='mobile-tui-browser-') as d:
        sock = str(Path(d) / 'tmux.sock')
        env = {**os.environ, 'TMUX_BIN': tmux, 'TMUX_SOCKET': sock,
               'TMUX_SESSION': 'browser', 'TUI_WORKDIR': d}
        subprocess.run(['bash', str(ROOT / 'scripts/create-session.sh')], env=env, check=True)
        server.HOME_DIR = Path(d)
        server.COMMAND = [tmux, '-S', sock, 'attach-session', '-t', 'browser']
        async def handler(ws):
            await (fixture(ws) if ws.path == '/fixture/ws' else server.handler(ws))
        try:
            async with serve(handler, '127.0.0.1', 0, process_request=request) as host:
                port = host.sockets[0].getsockname()[1]
                process = await asyncio.create_subprocess_exec(
                    'node', str(ROOT / 'tests/browser.mjs'),
                    env={**env, 'TEST_BASE_URL': f'http://127.0.0.1:{port}'})
                try:
                    code = await asyncio.wait_for(process.wait(), 90)
                finally:
                    if process.returncode is None:
                        process.kill()
                        await process.wait()
                if code:
                    raise SystemExit(code)
        finally:
            subprocess.run([tmux, '-S', sock, 'kill-server'], check=False,
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


if __name__ == '__main__':
    asyncio.run(main())
