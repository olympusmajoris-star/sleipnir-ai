/* Opens the live cabin design workspace inside the existing Studio. */
(function (G) {
  'use strict';
  const cabinHash=hash=>hash==='#raven-cabin'||hash==='#raven-road';
  const requested = cabinHash(location.hash);
  let previous = '#conversation', opening = false, mounted = false, originalAllow = null;
  function close() {
    const dialog = document.getElementById('extDlg');
    if (opening && dialog && dialog.open) dialog.close();
  }
  function open() {
    const dialog = document.getElementById('extDlg'), frame = document.getElementById('extFrame');
    if (!dialog || !frame) return;
    if (!cabinHash(location.hash)) previous = location.hash || '#conversation';
    document.getElementById('extTitle').textContent = 'Raven · Cabin designer';
    frame.title = 'Raven cabin designer';
    if (!opening) originalAllow = frame.getAttribute('allow');
    frame.setAttribute('allow', 'microphone; camera; autoplay');
    frame.src = new URL('raven-cabin-studio.html?embed=1&v=1124refine2', location.href).href;
    opening = true; G.StudioKit.previewCovered = true;
    if (!dialog.open) dialog.showModal();
    if (!cabinHash(location.hash)) history.pushState(null, '', '#raven-cabin');
    if (!mounted) {
      mounted = true;
      dialog.addEventListener('close', () => {
        if (!opening) return;
        opening = false;
        if (originalAllow === null) frame.removeAttribute('allow'); else frame.setAttribute('allow', originalAllow);
        frame.src='about:blank';
        if (cabinHash(location.hash)) history.replaceState(null, '', previous);
      });
      G.addEventListener('popstate', () => {
        if (cabinHash(location.hash)) { if (!opening) open(); }
        else if (opening && dialog.open) dialog.close();
      });
    }
  }
  G.RavenWindshieldWorkspace = { open, close };
  document.addEventListener('DOMContentLoaded', () => {
    Promise.resolve(G.StudioKit.ready).then(() => { if (requested) open(); });
  }, { once: true });
})(window);
