"""Exercise the real Linux PTY and tmux bridge on an isolated socket."""
import asyncio
import json
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
        self.old_command = server.CMD
        self.old_home = server.USER_HOME
        server.USER_HOME = self.temp.name
        server.CMD = ["/usr/bin/tmux", "-S", self.socket, "-f", "/dev/null",
                      "new-session", "-A", "-s", "test", "/bin/sh"]
        self.bridge = await serve(server.handler, "127.0.0.1", 0)
        self.url = f"ws://127.0.0.1:{self.bridge.sockets[0].getsockname()[1]}"

    async def asyncTearDown(self):
        self.bridge.close()
        await self.bridge.wait_closed()
        subprocess.run(["tmux", "-S", self.socket, "kill-server"],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        server.CMD = self.old_command
        server.USER_HOME = self.old_home
        self.temp.cleanup()

    async def read_until(self, ws, needle):
        data = b""
        async with asyncio.timeout(8):
            while needle not in data:
                message = await ws.recv()
                if isinstance(message, bytes):
                    data += message
        return data

    async def test_terminal_input_resize_and_reconnect(self):
        async with connect(self.url) as ws:
            await ws.send(b"printf 'ROUND_%s\\n' TRIP\r")
            await self.read_until(ws, b"ROUND_TRIP")
            await ws.send(json.dumps({"type": "resize", "rows": 41, "cols": 101}))
            await ws.send(b"stty size\r")
            # tmux reserves one row for its default status bar.
            await self.read_until(ws, b"40 101")
            await ws.send(b"export MOBILE_TUI_TEST=kept\r")
            await ws.send(b"printf 'READY_%s\\n' NOW\r")
            await self.read_until(ws, b"READY_NOW")
        async with connect(self.url) as ws:
            await ws.send(b"printf 'SESSION_%s\\n' \"$MOBILE_TUI_TEST\"\r")
            await self.read_until(ws, b"SESSION_kept")

    async def test_invalid_control_messages_do_not_disconnect(self):
        async with connect(self.url) as ws:
            for message in ['not-json', 'null', '[]', '42',
                            '{"type":"resize","rows":"invalid"}']:
                await ws.send(message)
            await ws.send('{"type":"ping"}')
            async with asyncio.timeout(8):
                while True:
                    message = await ws.recv()
                    if isinstance(message, str):
                        self.assertEqual(json.loads(message), {"type": "pong"})
                        break

    async def test_child_exit_closes_websocket(self):
        server.CMD = ["/bin/sh", "-c", "printf CHILD_FINISHED"]
        async with connect(self.url) as ws:
            await self.read_until(ws, b"CHILD_FINISHED")
            await asyncio.wait_for(ws.wait_closed(), 8)


if __name__ == "__main__":
    unittest.main()
