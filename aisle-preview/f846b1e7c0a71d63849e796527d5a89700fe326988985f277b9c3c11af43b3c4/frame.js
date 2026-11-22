(() => {
  'use strict';
  const channel = 'sleipnir-aisle-editor-v1';
  const allowed = origin => {
    try {
      const url = new URL(origin);
      return url.origin === 'https://olympusmajoris-star.github.io' ||
        (url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname));
    } catch { return false; }
  };
  let parentOrigin = '';
  try {
    const ref = new URL(document.referrer).origin;
    if (allowed(ref)) parentOrigin = ref;
  } catch {}
  let ready;
  const send = detail => {
    if (parentOrigin && window.parent !== window)
      window.parent.postMessage({...detail, channel}, parentOrigin);
  };
  window.addEventListener('message', event => {
    if (event.source !== window.parent || !allowed(event.origin) ||
        (parentOrigin && parentOrigin !== event.origin) || event.data?.channel !== channel) return;
    if (!parentOrigin) { parentOrigin = event.origin; if (ready) send(ready); }
    const command = event.data;
    if (command.type === 'hello') { if (ready) send(ready); return; }
    if (!['set-aisle','set-scale','set-mode','sync','move','search','focus-product'].includes(command.type)) return;
    document.dispatchEvent(new CustomEvent('sleipnir-preview-down',{detail:JSON.stringify(command)}));
  });
  document.addEventListener('sleipnir-preview-up', event => {
    let detail;
    try { detail = JSON.parse(event.detail); } catch { return; }
    if (detail.type === 'ready') { ready=detail; document.querySelector('#startup')?.remove(); }
    send(detail);
  });
})();
