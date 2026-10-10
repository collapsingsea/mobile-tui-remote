/* UI language only; terminal output is owned by the remote application. */
(() => {
  const storageKey = 'mobile-tui-remote.language';
  const messages = {
    en: {
      keyboard: '⌨ Keyboard', copy: 'Copy', paste: 'Paste', touchpad: 'Touchpad', reconnect: 'Reconnect',
      language: 'Interface language', auto: 'Auto', input: 'Terminal input',
      connecting: 'Connecting…', connected: 'Connected', disconnected: 'Disconnected · reconnecting', error: 'Network error',
      keyboardOpened: 'Keyboard opened', selectFirst: 'Select text first', copied: 'Copied', copyFailed: 'Copy failed',
      pasted: 'Pasted', clipboardDenied: 'Clipboard access unavailable',
      touchpadMode: 'Touchpad mode', selectionMode: 'Text selection mode'
    },
    zh: {
      keyboard: '⌨ 键盘', copy: '复制', paste: '粘贴', touchpad: '触控板', reconnect: '重连',
      language: '界面语言', auto: '自动', input: '终端输入',
      connecting: '连接中…', connected: '已连接', disconnected: '连接已断开 · 重连中', error: '网络错误',
      keyboardOpened: '键盘已打开', selectFirst: '请先选择文本', copied: '已复制', copyFailed: '复制失败',
      pasted: '已粘贴', clipboardDenied: '无法访问剪贴板',
      touchpadMode: '触控板模式', selectionMode: '文本选择模式'
    }
  };
  let preference = 'auto';
  try {
    const saved = localStorage.getItem(storageKey);
    if (['auto', 'en', 'zh'].includes(saved)) preference = saved;
  } catch { /* Storage may be blocked; automatic detection still works. */ }
  const detect = () => /^zh(?:-|$)/i.test(navigator.languages?.[0] || navigator.language || '') ? 'zh' : 'en';
  let language;
  const t = key => messages[language][key] || messages.en[key] || key;
  function apply() {
    language = preference === 'auto' ? detect() : preference;
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    document.querySelectorAll('[data-i18n]').forEach(element => {
      element.textContent = t(element.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-label]').forEach(element => {
      element.setAttribute('aria-label', t(element.dataset.i18nLabel));
    });
    document.getElementById('language').value = preference;
  }
  document.getElementById('language').addEventListener('change', event => {
    preference = ['auto', 'en', 'zh'].includes(event.target.value) ? event.target.value : 'auto';
    try { localStorage.setItem(storageKey, preference); } catch { /* Keep the in-memory preference. */ }
    apply();
  });
  window.addEventListener('languagechange', () => {
    if (preference === 'auto') apply();
  });
  window.mobileTuiI18n = { t };
  apply();
})();
