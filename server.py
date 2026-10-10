#!/usr/bin/env python3
"""Mobile terminal prototype: WebSocket <-> PTY <-> persistent tmux shell."""

import asyncio
import contextlib
import fcntl
import json
import os
import pty
import signal
import struct
import termios

from websockets.server import serve

HOST = os.environ.get("TUI_HOST", "127.0.0.1")
PORT = int(os.environ.get("TUI_PORT", "7690"))
USER_HOME = os.path.expanduser(os.environ.get("TUI_HOME", "~"))
SESSION = os.environ.get("TMUX_SESSION", "claude-code")
CMD = ["/usr/bin/tmux", "new-session", "-A", "-s", SESSION, "-c", USER_HOME]
ENV = os.environ.copy()
ENV.update(HOME=USER_HOME, TERM="xterm-256color", COLORTERM="truecolor")


def set_winsize(fd, rows, cols):
    rows = max(5, min(int(rows), 300))
    cols = max(10, min(int(cols), 500))
    fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack("HHHH", rows, cols, 0, 0))


async def handler(ws):
    pid, fd = pty.fork()
    if pid == 0:
        try:
            os.chdir(USER_HOME)
            os.execvpe(CMD[0], CMD, ENV)
        except Exception:
            os._exit(1)

    os.set_blocking(fd, False)
    loop = asyncio.get_running_loop()
    queue = asyncio.Queue()

    def readable():
        try:
            queue.put_nowait(os.read(fd, 65536) or None)
        except (BlockingIOError, InterruptedError):
            pass
        except OSError:
            queue.put_nowait(None)

    loop.add_reader(fd, readable)

    async def pump_output():
        while True:
            data = await queue.get()
            if data is None:
                await ws.close()
                return
            await ws.send(data)

    output = asyncio.create_task(pump_output())
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
            if payload.get("type") == "resize":
                try:
                    set_winsize(fd, payload.get("rows", 24), payload.get("cols", 80))
                except (TypeError, ValueError, OverflowError, OSError):
                    pass
            elif payload.get("type") == "ping":
                await ws.send(json.dumps({"type": "pong"}))
    finally:
        loop.remove_reader(fd)
        output.cancel()
        with contextlib.suppress(asyncio.CancelledError, Exception):
            await output
        with contextlib.suppress(OSError):
            os.close(fd)
        with contextlib.suppress(ProcessLookupError):
            os.kill(pid, signal.SIGHUP)
        with contextlib.suppress(ChildProcessError):
            await asyncio.to_thread(os.waitpid, pid, 0)


async def main():
    async with serve(handler, HOST, PORT, max_size=2**20,
                     ping_interval=20, ping_timeout=20, compression=None):
        print(f"Mobile TUI bridge listening on ws://{HOST}:{PORT}", flush=True)
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
