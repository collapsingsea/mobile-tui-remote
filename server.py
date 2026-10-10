#!/usr/bin/env python3
"""Minimal WebSocket <-> PTY bridge for Mobile TUI Remote."""

import asyncio
import contextlib
import fcntl
import json
import os
import pty
import shlex
import signal
import struct
import termios
from pathlib import Path

from websockets.server import serve

HOST = os.environ.get("TUI_HOST", "127.0.0.1")
PORT = int(os.environ.get("TUI_PORT", "7690"))
HOME_DIR = Path(os.environ.get("TUI_HOME", str(Path.home()))).expanduser()
TMUX_SESSION = os.environ.get("TMUX_SESSION", "claude-code")
TMUX_SOCKET = os.environ.get("TMUX_SOCKET", "").strip()
TMUX_BIN = os.environ.get("TMUX_BIN", "/usr/bin/tmux")
TUI_COMMAND = os.environ.get("TUI_COMMAND", "").strip()


def build_command() -> list[str]:
    if TUI_COMMAND:
        return shlex.split(TUI_COMMAND)
    cmd = [TMUX_BIN]
    if TMUX_SOCKET:
        cmd += ["-S", TMUX_SOCKET]
    return cmd + ["attach-session", "-t", TMUX_SESSION]


COMMAND = build_command()
CHILD_ENV = os.environ.copy()
CHILD_ENV.update(
    {
        "HOME": str(HOME_DIR),
        "TERM": "xterm-256color",
        "COLORTERM": "truecolor",
    }
)


def set_winsize(fd: int, rows: int, cols: int) -> None:
    rows = max(5, min(int(rows), 300))
    cols = max(10, min(int(cols), 500))
    fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack("HHHH", rows, cols, 0, 0))


async def handler(ws) -> None:
    pid, fd = pty.fork()
    if pid == 0:
        try:
            os.chdir(HOME_DIR)
            os.execvpe(COMMAND[0], COMMAND, CHILD_ENV)
        except Exception:
            os._exit(1)

    os.set_blocking(fd, False)
    loop = asyncio.get_running_loop()
    queue: asyncio.Queue[bytes | None] = asyncio.Queue()

    def readable() -> None:
        try:
            data = os.read(fd, 65536)
            queue.put_nowait(data or None)
        except (BlockingIOError, InterruptedError):
            pass
        except OSError:
            queue.put_nowait(None)

    loop.add_reader(fd, readable)

    async def pump_output() -> None:
        while True:
            data = await queue.get()
            if data is None:
                await ws.close()
                return
            await ws.send(data)

    output_task = asyncio.create_task(pump_output())

    try:
        async for message in ws:
            if isinstance(message, bytes):
                if message:
                    try:
                        os.write(fd, message)
                    except OSError:
                        break
                continue

            try:
                payload = json.loads(message)
            except (TypeError, ValueError):
                continue
            if not isinstance(payload, dict):
                continue

            msg_type = payload.get("type")
            if msg_type == "resize":
                try:
                    set_winsize(fd, payload.get("rows", 24), payload.get("cols", 80))
                except (TypeError, ValueError, OverflowError, OSError):
                    pass
            elif msg_type == "ping":
                await ws.send(json.dumps({"type": "pong"}))
    finally:
        loop.remove_reader(fd)
        output_task.cancel()
        with contextlib.suppress(asyncio.CancelledError, Exception):
            await output_task
        try:
            os.close(fd)
        except OSError:
            pass
        try:
            os.kill(pid, signal.SIGHUP)
        except ProcessLookupError:
            pass
        try:
            await asyncio.to_thread(os.waitpid, pid, 0)
        except ChildProcessError:
            pass


async def main() -> None:
    async with serve(
        handler,
        HOST,
        PORT,
        max_size=2**20,
        ping_interval=20,
        ping_timeout=20,
        compression=None,
    ):
        print(f"Mobile TUI bridge listening on ws://{HOST}:{PORT}")
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
