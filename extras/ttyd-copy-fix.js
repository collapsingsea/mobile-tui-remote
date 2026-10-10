/* Optional ttyd desktop helper.
 * With an xterm selection, Ctrl+C copies; without a selection, Ctrl+C keeps
 * its normal terminal SIGINT behavior. Ctrl+Shift+C always means copy.
 */
(() => {
  async function copy(text) {
    if (!text) return false;
    try { await navigator.clipboard.writeText(text); return true; }
    catch (_) {}
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }

  window.addEventListener('keydown', async (event) => {
    const key = (event.key || '').toLowerCase();
    const ctrl = event.ctrlKey || event.metaKey;
    if (!ctrl || key !== 'c') return;
    let selected = '';
    try { selected = window.term?.getSelection?.() || ''; } catch (_) {}
    if (!selected) selected = String(window.getSelection?.() || '');
    if (selected || event.shiftKey) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (selected) await copy(selected);
    }
  }, true);
})();
