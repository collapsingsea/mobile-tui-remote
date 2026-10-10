import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined, args: ['--no-sandbox'] });
const base = process.env.TEST_BASE_URL;
const errors = [];
async function context(locale = 'en-US', blocked = false) {
  const ctx = await browser.newContext({ locale, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript(({ blocked }) => {
    window.__sent = [];
    window.__connections = 0;
    window.__outputByConnection = {};
    const RealWS = window.WebSocket;
    window.WebSocket = class extends RealWS {
      constructor(...args) {
        super(...args);
        const id = ++window.__connections;
        window.__outputByConnection[id] = '';
        this.addEventListener('message', event => {
          if (typeof event.data !== 'string') window.__outputByConnection[id] += new TextDecoder().decode(event.data);
        });
      }
      send(data) {
        window.__sent.push(typeof data === 'string' ? data : new TextDecoder().decode(data));
        super.send(data);
      }
    };
    let Terminal;
    Object.defineProperty(window, 'Terminal', {
      get: () => Terminal,
      set: Real => { Terminal = class extends Real { constructor(...args) { super(...args); window.__term = this; } }; }
    });
    if (blocked) Object.defineProperty(window, 'localStorage', { get() { throw new Error('Blocked storage'); } });
  }, { blocked });
  return ctx;
}
const text = page => page.evaluate(() => {
  const b = window.__term.buffer.active;
  return Array.from({ length: b.length }, (_, i) => b.getLine(i)?.translateToString(true) || '').join('\n');
});
async function waitText(page, needle) {
  await page.waitForFunction(needle => {
    const b = window.__term?.buffer.active;
    return b && Array.from({ length: b.length }, (_, i) => b.getLine(i)?.translateToString(true) || '').join('\n').includes(needle);
  }, needle);
}
async function send(page, value) {
  await page.evaluate(value => {
    const ime = document.querySelector('#ime'); ime.value = value; ime.dispatchEvent(new Event('input'));
  }, value);
}
async function touch(page, delta) {
  await page.evaluate(delta => {
    const el = document.querySelector('#nativeText'), r = el.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const event = (name, ty) => el.dispatchEvent(new TouchEvent(name, {
      bubbles: true, touches: name === 'touchend' ? [] : [new Touch({ identifier: 1, target: el, clientX: x, clientY: ty })],
      changedTouches: [new Touch({ identifier: 1, target: el, clientX: x, clientY: ty })]
    }));
    event('touchstart', y); event('touchmove', y + delta); event('touchend', y + delta);
  }, delta);
}
try {
  const ctx = await context('zh-CN');
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${base}/mobile/`);
  await page.waitForFunction(() => document.querySelector('#status').textContent === '已连接');
  await waitText(page, '$');
  assert.equal(await page.locator('html').getAttribute('lang'), 'zh-CN');
  await send(page, "export MOBILE_BROWSER_TEST=kept; printf 'BROWSER_%s\\n' READY\r");
  await waitText(page, 'BROWSER_READY');
  const connections = await page.evaluate(() => window.__connections);
  await page.selectOption('#language', 'en');
  assert.equal(await page.locator('#status').innerText(), 'Connected');
  assert.equal(await page.locator('#imebtn').innerText(), 'Phone IME');
  assert.equal(await page.locator('#nativeText').getAttribute('aria-label'), 'Terminal text selection layer');
  assert.equal(await page.evaluate(() => window.__connections), connections);
  assert.ok((await text(page)).includes('BROWSER_READY'));
  await page.click('#copybtn');
  assert.equal(await page.locator('#toast').innerText(), 'Select text first');
  await page.click('#pcbtn');
  assert.ok(await page.locator('#pc').evaluate(el => el.classList.contains('show')));
  await page.locator('[data-pc="Caps"]').click();
  assert.equal(await page.locator('#toast').innerText(), 'Caps is not mapped');
  const beforeKeys = await page.evaluate(() => window.__sent.length);
  for (let i = 1; i <= 12; i++) await page.locator(`[data-pc="F${i}"]`).click();
  const keys = await page.evaluate(n => window.__sent.slice(n).filter(x => !x.startsWith('{')), beforeKeys);
  assert.deepEqual(keys, ['\x1bOP','\x1bOQ','\x1bOR','\x1bOS','\x1b[15~','\x1b[17~','\x1b[18~','\x1b[19~','\x1b[20~','\x1b[21~','\x1b[23~','\x1b[24~']);
  await page.click('#pcbtn');
  // Clear typed escape sequences before another shell command.
  await page.click('[data-key="ctrlc"]');
  const beforeReconnect = await page.evaluate(() => window.__connections);
  await page.click('#reconnectbtn');
  await page.waitForFunction(n => window.__connections === n + 1 && document.querySelector('#status').textContent === 'Connected', beforeReconnect);
  await page.waitForFunction(() => window.__outputByConnection[window.__connections].includes('BROWSER_READY'));
  await send(page, "printf 'PERSIST_%s\\n' \"$MOBILE_BROWSER_TEST\"\r");
  await waitText(page, 'PERSIST_kept');
  await page.reload();
  await page.waitForFunction(() => document.querySelector('#status').textContent === 'Connected');
  assert.equal(await page.locator('#language').inputValue(), 'en');
  await page.selectOption('#language', 'auto');
  assert.equal(await page.locator('#status').innerText(), '已连接');
  await page.setViewportSize({ width: 320, height: 640 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  console.log('PASS real PTY/tmux browser: IME input, session reconnect, F1–F12, Chinese→English→Auto, persisted preference, 320px layout');
  await ctx.close();

  const fixtureCtx = await context();
  await fixtureCtx.grantPermissions(['clipboard-read', 'clipboard-write']);
  const fixture = await fixtureCtx.newPage(); fixture.on('pageerror', e => errors.push(String(e)));
  await fixture.goto(`${base}/fixture/`); await waitText(fixture, 'FIXTURE_READY');
  assert.equal(await fixture.evaluate(() => window.__term.buffer.active.type), 'normal');
  await touch(fixture, 200);
  await fixture.waitForFunction(() => window.__term.buffer.active.viewportY < window.__term.buffer.active.baseY);
  assert.ok((await text(fixture)).includes('BROWSER_HISTORY_001'));
  const scrolled = await fixture.evaluate(() => ({ viewport: window.__term.buffer.active.viewportY, base: window.__term.buffer.active.baseY }));
  await fixture.click('#bottombtn');
  await fixture.waitForFunction(() => window.__term.buffer.active.viewportY === window.__term.buffer.active.baseY);
  await fixture.waitForFunction(() => [...document.querySelectorAll('#nativeText .nline')].some(el => el.textContent.includes('BROWSER_HISTORY_240')));
  await fixture.evaluate(() => {
    const row = [...document.querySelectorAll('#nativeText .nline')].find(el => el.textContent.includes('BROWSER_HISTORY_240'));
    const range = document.createRange(); range.selectNodeContents(row);
    getSelection().removeAllRanges(); getSelection().addRange(range);
  });
  assert.equal(await fixture.evaluate(() => String(getSelection())), 'BROWSER_HISTORY_240');
  await fixture.click('#copybtn');
  await fixture.waitForFunction(() => document.querySelector('#toast').textContent === 'Copied');
  assert.equal(await fixture.evaluate(() => navigator.clipboard.readText()), 'BROWSER_HISTORY_240');
  await fixture.evaluate(() => getSelection().removeAllRanges());
  await send(fixture, 'ENABLE_ALT'); await waitText(fixture, 'ALT_READY');
  assert.equal(await fixture.evaluate(() => window.__term.buffer.active.type), 'alternate');
  const sentBefore = await fixture.evaluate(() => window.__sent.length);
  await touch(fixture, 120);
  await fixture.waitForFunction(n => window.__sent.slice(n).some(x => /^\x1b\[<64;\d+;\d+M$/.test(x)), sentBefore);
  assert.equal(await fixture.evaluate(() => window.__term.buffer.active.type), 'alternate');
  console.log(`PASS browser history: 240 normal-buffer lines, earliest marker retained, touch moved viewport ${scrolled.base}→${scrolled.viewport}, Latest returned to bottom, DOM mirror copied to clipboard; alternate-screen drag sent SGR wheel protocol`);
  await fixtureCtx.close();

  const blockedCtx = await context('en-US', true);
  const blockedPage = await blockedCtx.newPage(); blockedPage.on('pageerror', e => errors.push(String(e)));
  await blockedPage.goto(`${base}/fixture/`); await waitText(blockedPage, 'FIXTURE_READY');
  await blockedPage.selectOption('#language', 'zh');
  assert.equal(await blockedPage.locator('#status').innerText(), '已连接');
  console.log('PASS blocked localStorage: language switching still works');
  await blockedCtx.close();
  assert.deepEqual(errors, []);
  console.log('PASS no browser JavaScript errors');
} finally {
  await browser.close();
}
