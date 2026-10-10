(() => {
  'use strict';

  const t = window.mobileTuiI18n.t;
  let statusKey = 'connecting';
  const terminalHost = document.getElementById('terminal');
  const nativeText = document.getElementById('nativeText');
  const ime = document.getElementById('ime');
  const pc = document.getElementById('pc');
  const dot = document.getElementById('dot');
  const status = document.getElementById('status');
  const toastEl = document.getElementById('toast');

  const term = new Terminal({
    cursorBlink: true,
    scrollback: 20000,
    fontSize: 12,
    lineHeight: 1.15,
    fontFamily: 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',
    theme: {
      background: '#0d1117',
      foreground: '#c9d1d9',
      cursor: '#7ee787',
      selectionBackground: '#264f78'
    },
    allowProposedApi: true,
    disableStdin: false
  });
  const fit = new FitAddon.FitAddon();
  term.loadAddon(fit);
  term.open(terminalHost);
  fit.fit();

  let ws = null;
  let retry = 0;
  let reconnectTimer = null;
  let pingTimer = null;
  let mirrorRAF = 0;
  let mirrorDirty = false;
  let mirrorTouch = null;
  let mods = { ctrl: false, alt: false, shift: false };

  const seq = {
    esc: '\x1b', ctrlc: '\x03', tab: '\t', enter: '\r',
    up: '\x1b[A', down: '\x1b[B', left: '\x1b[D', right: '\x1b[C',
    backspace: '\x7f', del: '\x1b[3~', home: '\x1b[H', end: '\x1b[F',
    pgup: '\x1b[5~', pgdn: '\x1b[6~'
  };

  function setStatus(key, ok = false) {
    statusKey = key;
    status.textContent = t(key);
    dot.classList.toggle('ok', ok);
  }

  window.addEventListener('mobile-tui-languagechange', () => { status.textContent = t(statusKey); });

  function toast(text) {
    toastEl.textContent = text;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 1100);
  }

  function wsURL() {
    const u = new URL('ws', window.location.href);
    u.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return u.toString();
  }

  function sendRaw(data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(new TextEncoder().encode(data));
    }
  }

  function resize() {
    try {
      fit.fit();
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
      }
    } catch (_) {}
  }

  function connect() {
    clearTimeout(reconnectTimer);
    clearInterval(pingTimer);
    if (ws) { ws.onclose = null; ws.close(); }
    setStatus('connecting');
    ws = new WebSocket(wsURL());
    const socket = ws;
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      if (socket !== ws) return;
      retry = 0;
      setStatus('connected', true);
      resize();
      clearInterval(pingTimer);
      pingTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }));
      }, 15000);
    };

    ws.onmessage = (event) => {
      if (socket !== ws) return;
      if (typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'pong') return;
        } catch (_) {}
        return;
      }
      term.write(new Uint8Array(event.data), scheduleMirror);
    };

    ws.onclose = () => {
      if (socket !== ws) return;
      clearInterval(pingTimer);
      setStatus('disconnected');
      reconnectTimer = setTimeout(connect, Math.min(1000 * Math.pow(1.7, retry++), 8000));
    };
    ws.onerror = () => { if (socket === ws) setStatus('error'); };
  }

  // xterm emits keyboard input and, in alternate-screen mouse mode, wheel/mouse protocol data.
  term.onData(sendRaw);

  function nativeSelectionActive() {
    const selection = window.getSelection?.();
    return selection && !selection.isCollapsed && nativeText.contains(selection.anchorNode);
  }

  function renderNativeText() {
    mirrorRAF = 0;
    if (mirrorTouch || nativeSelectionActive()) {
      mirrorDirty = true;
      return;
    }
    mirrorDirty = false;
    try {
      const buffer = term.buffer.active;
      const start = buffer.viewportY;
      const fragment = document.createDocumentFragment();
      nativeText.textContent = '';
      const lineHeight = Math.max(12, nativeText.clientHeight / Math.max(1, term.rows));
      nativeText.style.setProperty('--native-line-h', `${lineHeight}px`);
      for (let i = 0; i < term.rows; i++) {
        const row = document.createElement('div');
        row.className = 'nline';
        const line = buffer.getLine(start + i);
        row.textContent = line ? line.translateToString(true) : ' ';
        if (!row.textContent) row.textContent = ' ';
        fragment.appendChild(row);
      }
      nativeText.appendChild(fragment);
    } catch (_) {}
  }

  function scheduleMirror() {
    if (mirrorTouch || nativeSelectionActive()) {
      mirrorDirty = true;
      return;
    }
    if (!mirrorRAF) mirrorRAF = requestAnimationFrame(renderNativeText);
  }

  document.addEventListener('selectionchange', () => {
    if (!nativeSelectionActive() && mirrorDirty) scheduleMirror();
  });

  function cellAt(x, y) {
    const rect = terminalHost.getBoundingClientRect();
    const col = Math.max(0, Math.min(term.cols - 1, Math.floor((x - rect.left) / Math.max(1, rect.width) * term.cols)));
    const viewRow = Math.max(0, Math.min(term.rows - 1, Math.floor((y - rect.top) / Math.max(1, rect.height) * term.rows)));
    return { col, row: term.buffer.active.viewportY + viewRow };
  }

  function focusIME() {
    ime.value = '';
    requestAnimationFrame(() => {
      try { ime.focus({ preventScroll: true }); }
      catch (_) { ime.focus(); }
    });
  }

  function tapToEdit(x, y) {
    const p = cellAt(x, y);
    const buffer = term.buffer.active;
    const currentRow = buffer.baseY + buffer.cursorY;
    if (p.row !== currentRow) return false;
    const delta = p.col - buffer.cursorX;
    const key = delta < 0 ? 'left' : 'right';
    for (let i = 0; i < Math.min(Math.abs(delta), 160); i++) sendRaw(seq[key]);
    focusIME();
    return true;
  }

  function xtermTarget() {
    return term.element || terminalHost.querySelector('.xterm');
  }

  function forwardWheel(delta, x, y) {
    const el = xtermTarget();
    if (!el) return;
    el.dispatchEvent(new WheelEvent('wheel', {
      deltaY: delta,
      deltaX: 0,
      deltaMode: WheelEvent.DOM_DELTA_PIXEL,
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y
    }));
  }

  function forwardClick(x, y) {
    const el = xtermTarget();
    if (!el) return;
    el.dispatchEvent(new MouseEvent('mousedown', { button: 0, buttons: 1, bubbles: true, cancelable: true, clientX: x, clientY: y }));
    el.dispatchEvent(new MouseEvent('mouseup',   { button: 0, buttons: 0, bubbles: true, cancelable: true, clientX: x, clientY: y }));
    el.dispatchEvent(new MouseEvent('click',     { button: 0, buttons: 0, bubbles: true, cancelable: true, clientX: x, clientY: y }));
  }

  nativeText.addEventListener('touchstart', (event) => {
    if (event.touches.length !== 1) return;
    if (mirrorRAF) {
      cancelAnimationFrame(mirrorRAF);
      mirrorRAF = 0;
      mirrorDirty = true;
    }
    const t = event.touches[0];
    mirrorTouch = { x: t.clientX, y: t.clientY, lastY: t.clientY, moved: false, started: performance.now() };
  }, { passive: true });

  nativeText.addEventListener('touchmove', (event) => {
    if (!mirrorTouch || event.touches.length !== 1) return;
    const t = event.touches[0];
    const dx = t.clientX - mirrorTouch.x;
    const dy = t.clientY - mirrorTouch.y;
    if (Math.hypot(dx, dy) > 8) mirrorTouch.moved = true;
    if (!mirrorTouch.moved || Math.abs(dy) <= Math.abs(dx) * 1.08) return;

    // If Android has started native text selection, do not turn the gesture into scrolling.
    const selected = window.getSelection ? String(window.getSelection() || '') : '';
    if (selected) return;

    const delta = t.clientY - mirrorTouch.lastY;
    mirrorTouch.lastY = t.clientY;
    forwardWheel(-delta, t.clientX, t.clientY);
  }, { passive: true });

  nativeText.addEventListener('touchend', (event) => {
    if (!mirrorTouch) return;
    let x = mirrorTouch.x;
    let y = mirrorTouch.lastY;
    if (event.changedTouches && event.changedTouches[0]) {
      x = event.changedTouches[0].clientX;
      y = event.changedTouches[0].clientY;
    }
    const wasMoved = mirrorTouch.moved;
    const duration = performance.now() - mirrorTouch.started;
    mirrorTouch = null;

    if (!wasMoved && duration < 350) {
      if (!tapToEdit(x, y)) forwardClick(x, y);
    }
    if (mirrorDirty) setTimeout(scheduleMirror, 24);
  }, { passive: true });

  nativeText.addEventListener('touchcancel', () => {
    mirrorTouch = null;
    if (mirrorDirty) setTimeout(scheduleMirror, 24);
  }, { passive: true });

  function renderMods() {
    pc.querySelectorAll('[data-pc]').forEach((b) => {
      const name = b.dataset.pc.toLowerCase();
      b.classList.toggle('active', Boolean(mods[name]));
    });
  }

  function sendKey(key) {
    let data = seq[key] ?? key;
    if (data.length === 1) {
      let ch = data;
      if (mods.shift && /[a-z]/.test(ch)) ch = ch.toUpperCase();
      if (mods.ctrl && /[a-zA-Z]/.test(ch)) ch = String.fromCharCode(ch.toUpperCase().charCodeAt(0) - 64);
      if (mods.alt) ch = '\x1b' + ch;
      data = ch;
    }
    sendRaw(data);
    mods = { ctrl: false, alt: false, shift: false };
    renderMods();
  }

  document.querySelectorAll('[data-key]').forEach((button) => {
    button.type = 'button';
    button.onclick = () => {
      button.classList.add('active');
      setTimeout(() => button.classList.remove('active'), 120);
      sendKey(button.dataset.key);
    };
  });

  const layout = [
    [{k:'`'},{k:'1'},{k:'2'},{k:'3'},{k:'4'},{k:'5'},{k:'6'},{k:'7'},{k:'8'},{k:'9'},{k:'0'},{k:'-'},{k:'='},{k:'Backspace',c:'u2'}],
    [{k:'Tab',c:'u15'},{k:'q'},{k:'w'},{k:'e'},{k:'r'},{k:'t'},{k:'y'},{k:'u'},{k:'i'},{k:'o'},{k:'p'},{k:'['},{k:']'},{k:'\\',c:'u15'}],
    [{k:'Caps',c:'u175'},{k:'a'},{k:'s'},{k:'d'},{k:'f'},{k:'g'},{k:'h'},{k:'j'},{k:'k'},{k:'l'},{k:';'},{k:"'"},{k:'Enter',c:'u225'}],
    [{k:'Shift',c:'u225'},{k:'z'},{k:'x'},{k:'c'},{k:'v'},{k:'b'},{k:'n'},{k:'m'},{k:','},{k:'.'},{k:'/'},{k:'Shift',c:'u275'}],
    [{k:'Ctrl',c:'u125'},{k:'Win',c:'u125'},{k:'Alt',c:'u125'},{k:'Space',c:'u6'},{k:'Alt',c:'u125'},{k:'Fn',c:'u125'},{k:'Ctrl',c:'u125'}]
  ];
  const topKeys = ['Esc','F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12'];
  const navKeys = ['Ins','Del','Home','End','PgUp','PgDn'];

  function makeKey(label, cls = '') {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.dataset.pc = label;
    if (cls) b.classList.add(cls);
    b.onclick = () => pcKey(label);
    return b;
  }

  function pcKey(key) {
    if (['Ctrl','Alt','Shift'].includes(key)) {
      const name = key.toLowerCase();
      mods[name] = !mods[name];
      renderMods();
      return;
    }
    if (['Caps','Win','Fn'].includes(key)) {
      toast(t('unmapped').replace('{key}', key));
      return;
    }
    if (/^F([1-9]|1[0-2])$/.test(key)) {
      const n = Number(key.slice(1));
      sendRaw(n <= 4 ? `\x1bO${'PQRS'[n - 1]}` : `\x1b[${[15,17,18,19,20,21,23,24][n - 5]}~`);
      return;
    }
    const map = {
      Backspace:'backspace', Ins:'\x1b[2~', Del:'del', Home:'home', End:'end',
      PgUp:'pgup', PgDn:'pgdn', Esc:'esc', Tab:'tab', Enter:'enter',
      '←':'left', '↑':'up', '↓':'down', '→':'right', Space:' '
    };
    const value = map[key] ?? key;
    if (typeof value === 'string' && value.startsWith('\x1b[') && value.endsWith('~')) sendRaw(value);
    else sendKey(value);
  }

  const keyboard = document.createElement('div');
  keyboard.className = 'kbd';
  pc.appendChild(keyboard);

  const topRow = document.createElement('div');
  topRow.className = 'kbdtop krow';
  topKeys.forEach((k) => topRow.appendChild(makeKey(k)));
  keyboard.appendChild(topRow);

  layout.forEach((row) => {
    const r = document.createElement('div');
    r.className = 'krow';
    row.forEach((key) => r.appendChild(makeKey(key.k, key.c)));
    keyboard.appendChild(r);
  });

  const nav = document.createElement('div');
  nav.className = 'navrow krow';
  navKeys.forEach((k) => nav.appendChild(makeKey(k)));
  keyboard.appendChild(nav);

  document.getElementById('pcbtn').onclick = () => {
    pc.classList.toggle('show');
    document.getElementById('pcbtn').classList.toggle('active', pc.classList.contains('show'));
    requestAnimationFrame(() => { resize(); scheduleMirror(); });
  };
  document.getElementById('imebtn').onclick = () => focusIME();

  ime.addEventListener('input', () => {
    if (!ime.value) return;
    sendRaw(ime.value);
    ime.value = '';
  });
  ime.addEventListener('keydown', (event) => {
    if (event.key === 'Backspace') { sendRaw('\x7f'); event.preventDefault(); }
    else if (event.key === 'Enter') { sendRaw('\r'); event.preventDefault(); }
    else if (event.key === 'Escape') { sendRaw('\x1b'); event.preventDefault(); }
  });

  document.getElementById('copybtn').onclick = async () => {
    const selected = (window.getSelection ? String(window.getSelection() || '') : '') || term.getSelection();
    if (!selected) return toast(t('selectFirst'));
    try { await navigator.clipboard.writeText(selected); toast(t('copied')); }
    catch (_) { toast(t('clipboardDenied')); }
  };

  document.getElementById('pastebtn').onclick = async () => {
    try { sendRaw(await navigator.clipboard.readText()); toast(t('pasted')); }
    catch (_) { toast(t('clipboardDenied')); }
  };

  document.getElementById('bottombtn').onclick = () => {
    // Ctrl+End, used by Claude Code to jump to the latest live view.
    sendRaw('\x1b[1;5F');
    try { term.scrollToBottom(); } catch (_) {}
    toast(t('bottom'));
  };

  document.getElementById('reconnectbtn').onclick = () => {
    connect();
  };

  function syncViewport() {
    const vv = window.visualViewport;
    const keyboardOpen = vv && (window.innerHeight - vv.height > 140);
    document.body.classList.toggle('keyboard', Boolean(keyboardOpen));
    if (keyboardOpen) pc.classList.remove('show');
    setTimeout(() => { resize(); scheduleMirror(); }, 80);
  }

  term.onRender(scheduleMirror);
  term.onScroll(scheduleMirror);
  window.addEventListener('resize', syncViewport);
  if (window.visualViewport) {
    visualViewport.addEventListener('resize', syncViewport);
    visualViewport.addEventListener('scroll', syncViewport);
  }
  screen.orientation?.addEventListener?.('change', () => setTimeout(resize, 250));

  connect();
  syncViewport();
  setTimeout(() => { resize(); scheduleMirror(); }, 300);
})();
