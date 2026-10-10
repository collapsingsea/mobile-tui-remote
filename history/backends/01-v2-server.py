#!/usr/bin/env python3
import asyncio, os, pty, signal, struct, fcntl, termios, json, subprocess
from websockets.server import serve

HOST='127.0.0.1'; PORT=7690
USER_HOME=os.environ.get('TUI_HOME', os.path.expanduser('~'))
CMD=['/usr/bin/tmux','new-session','-A','-s','claude-code','-c',USER_HOME]
ENV=os.environ.copy()
ENV.update({'HOME':USER_HOME,'USER':os.environ.get('USER','tui'),'LOGNAME':os.environ.get('LOGNAME',os.environ.get('USER','tui')),'TERM':'xterm-256color','COLORTERM':'truecolor','PATH':f'{USER_HOME}/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'})

def set_winsize(fd, rows, cols):
    rows=max(5,min(int(rows),300)); cols=max(10,min(int(cols),500))
    fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack('HHHH', rows, cols, 0, 0))

async def handler(ws):
    pid, fd = pty.fork()
    if pid == 0:
        os.chdir(USER_HOME)
        os.execvpe(CMD[0], CMD, ENV)
    os.set_blocking(fd, False)
    loop=asyncio.get_running_loop()
    q=asyncio.Queue()
    def readable():
        try:
            b=os.read(fd,65536)
            if b: q.put_nowait(b)
            else: q.put_nowait(None)
        except (BlockingIOError, InterruptedError): pass
        except OSError: q.put_nowait(None)
    loop.add_reader(fd, readable)
    async def pump_out():
        while True:
            b=await q.get()
            if b is None: break
            await ws.send(b)
    out=asyncio.create_task(pump_out())
    try:
        async for msg in ws:
            if isinstance(msg, bytes):
                if msg:
                    try: os.write(fd,msg)
                    except OSError: break
            else:
                try:
                    d=json.loads(msg)
                except Exception:
                    continue
                t=d.get('type')
                if t=='resize':
                    try: set_winsize(fd,d.get('rows',24),d.get('cols',80))
                    except Exception: pass
                elif t=='control':
                    action=d.get('action','')
                    target='claude-code:0.0'
                    try:
                        if action=='scroll_up':
                            subprocess.run(['/usr/bin/tmux','copy-mode','-e','-t',target],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
                            subprocess.run(['/usr/bin/tmux','send-keys','-X','-t',target,'-N',str(max(1,min(int(d.get('n',3)),30))),'scroll-up'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
                        elif action=='scroll_down':
                            subprocess.run(['/usr/bin/tmux','send-keys','-X','-t',target,'-N',str(max(1,min(int(d.get('n',3)),30))),'scroll-down'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
                        elif action=='bottom':
                            subprocess.run(['/usr/bin/tmux','send-keys','-X','-t',target,'cancel'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
                    except Exception:
                        pass
                elif t=='ping':
                    await ws.send(json.dumps({'type':'pong'}))
    finally:
        loop.remove_reader(fd)
        out.cancel()
        try: os.close(fd)
        except OSError: pass
        try: os.kill(pid, signal.SIGHUP)
        except ProcessLookupError: pass
        try: os.waitpid(pid, os.WNOHANG)
        except ChildProcessError: pass

async def main():
    async with serve(handler,HOST,PORT,max_size=2**20,ping_interval=20,ping_timeout=20,compression=None):
        await asyncio.Future()
if __name__=='__main__': asyncio.run(main())
