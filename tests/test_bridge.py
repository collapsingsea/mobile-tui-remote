"""Exercise the real Linux PTY and tmux bridge on an isolated socket."""
import asyncio
import json
import os
import fcntl
import struct
import termios
from pathlib import Path
import subprocess
import tempfile
import unittest

from websockets.client import connect
from websockets.server import serve

import server


class BridgeTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.socket = str(Path(self.temp.name) / "tmux.sock")
        self.old_command = server.COMMAND
        self.old_home = server.HOME_DIR
        self.tmux = os.environ.get("TMUX_BIN", "/usr/bin/tmux")
        server.HOME_DIR = self.temp.name
        subprocess.run([self.tmux, "-S", self.socket, "-f", "/dev/null",
                        "new-session", "-d", "-s", "test",
                        "env PS1='TEST_PROMPT> ' /bin/sh"], check=True)
        server.COMMAND = [self.tmux, "-S", self.socket, "attach-session", "-t", "test"]
        self.bridge = await serve(server.handler, "127.0.0.1", 0)
        self.url = f"ws://127.0.0.1:{self.bridge.sockets[0].getsockname()[1]}"

    async def asyncTearDown(self):
        self.bridge.close()
        await self.bridge.wait_closed()
        subprocess.run([self.tmux, "-S", self.socket, "kill-server"],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        server.COMMAND = self.old_command
        server.HOME_DIR = self.old_home
        self.temp.cleanup()

    async def read_until(self, ws, needle):
        data = b""
        async def receive():
            nonlocal data
            while needle not in data:
                message = await ws.recv()
                if isinstance(message, bytes):
                    data += message
        try:
            await asyncio.wait_for(receive(), 8)
        except asyncio.TimeoutError:
            raise AssertionError(f"Missing {needle!r} in PTY output {data!r}") from None
        return data

    async def test_terminal_input_resize_and_reconnect(self):
        async with connect(self.url) as ws:
            await self.read_until(ws, b"TEST_PROMPT> ")
            await ws.send(b"printf 'ROUND_%s\\n' TRIP\r")
            await self.read_until(ws, b"ROUND_TRIP")
            await ws.send(json.dumps({"type": "resize", "rows": 41, "cols": 101}))
            pane_tty = subprocess.check_output([self.tmux, "-S", self.socket, "display-message", "-p", "-t", "test:0.0", "#{pane_tty}"]).decode().strip()
            async def wait_for_size():
                with open(pane_tty, "rb", buffering=0) as tty:
                    while struct.unpack("HHHH", fcntl.ioctl(tty, termios.TIOCGWINSZ, b"\0" * 8))[:2] != (40, 101):
                        await asyncio.sleep(0.02)
            await asyncio.wait_for(wait_for_size(), 8)
            await ws.send(b"stty size\r")
            # tmux reserves one row for its default status bar.
            await self.read_until(ws, b"40 101")
            await ws.send(b"export MOBILE_TUI_TEST=kept\r")
            await ws.send(b"printf 'READY_%s\\n' NOW\r")
            await self.read_until(ws, b"READY_NOW")
        async with connect(self.url) as ws:
            await self.read_until(ws, b"TEST_PROMPT> ")
            await ws.send(b"printf 'SESSION_%s\\n' \"$MOBILE_TUI_TEST\"\r")
            await self.read_until(ws, b"SESSION_kept")

    async def test_invalid_control_messages_do_not_disconnect(self):
        async with connect(self.url) as ws:
            for message in ['not-json', 'null', '[]', '42',
                            '{"type":"resize","rows":"invalid"}',
                            '{"type":"resize","rows":1e999}']:
                await ws.send(message)
            await ws.send('{"type":"ping"}')
            async def receive_pong():
                while True:
                    message = await ws.recv()
                    if isinstance(message, str):
                        self.assertEqual(json.loads(message), {"type": "pong"})
                        break
            await asyncio.wait_for(receive_pong(), 8)

    async def test_child_exit_closes_websocket(self):
        server.COMMAND = ["/bin/sh", "-c", "printf CHILD_FINISHED"]
        async with connect(self.url) as ws:
            await self.read_until(ws, b"CHILD_FINISHED")
            await asyncio.wait_for(ws.wait_closed(), 8)

    async def test_scrollback_survives_disconnect(self):
        async with connect(self.url) as ws:
            await self.read_until(ws, b"TEST_PROMPT> ")
            # Split the marker so an echoed command cannot satisfy the assertion.
            await ws.send(b"i=1; while [ $i -le 120 ]; do printf 'HISTORY_%03d\\n' $i; i=$((i+1)); done; printf 'DONE_%s\\n' HISTORY\r")
            await self.read_until(ws, b"DONE_HISTORY")
        capture = subprocess.check_output(
            [self.tmux, "-S", self.socket, "capture-pane", "-p", "-S", "-", "-t", "test:0.0"]
        )
        self.assertIn(b"HISTORY_001", capture)
        self.assertIn(b"HISTORY_120", capture)
        async with connect(self.url) as ws:
            await self.read_until(ws, b"TEST_PROMPT> ")
            await ws.send(b"printf 'RECONNECTED_%s\\n' OK\r")
            await self.read_until(ws, b"RECONNECTED_OK")
            capture_after = subprocess.check_output(
                [self.tmux, "-S", self.socket, "capture-pane", "-p", "-S", "-", "-t", "test:0.0"]
            )
            self.assertIn(b"HISTORY_001", capture_after)
            self.assertIn(b"HISTORY_120", capture_after)
            print("History evidence: lines HISTORY_001..HISTORY_120 retained across reconnect")

    async def test_command_configuration(self):
        old = server.TUI_COMMAND, server.TMUX_SOCKET, server.TMUX_SESSION
        try:
            server.TUI_COMMAND = '/bin/sh -c "printf configured"'
            self.assertEqual(server.build_command(), ["/bin/sh", "-c", "printf configured"])
            server.TUI_COMMAND = ""
            server.TMUX_SOCKET = self.socket
            server.TMUX_SESSION = "test"
            self.assertEqual(server.build_command(), [server.TMUX_BIN, "-S", self.socket, "attach-session", "-t", "test"])
        finally:
            server.TUI_COMMAND, server.TMUX_SOCKET, server.TMUX_SESSION = old


if __name__ == "__main__":
    unittest.main()
