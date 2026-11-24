/* Opens the windshield sample in the existing Studio workspace. */
(function (G) {
  'use strict';
  const requested = location.hash === '#raven-road';
  let previous = '#conversation', opening = false, mounted = false, originalAllow = null;
  function close() {
    const dialog = document.getElementById('extDlg');
    if (opening && dialog && dialog.open) dialog.close();
  }
  function open() {
    const dialog = document.getElementById('extDlg'), frame = document.getElementById('extFrame');
    if (!dialog || !frame) return;
    if (location.hash !== '#raven-road') previous = location.hash || '#conversation';
    document.getElementById('extTitle').textContent = 'Raven · Windshield';
    frame.title = 'Raven windshield sample conversation';
    if (!opening) originalAllow = frame.getAttribute('allow');
    frame.setAttribute('allow', 'microphone; camera');
    frame.src = new URL('raven-road-studio.html?embed=1&v=1124road1', location.href).href;
    opening = true; G.StudioKit.previewCovered = true;
    if (!dialog.open) dialog.showModal();
    if (location.hash !== '#raven-road') history.pushState(null, '', '#raven-road');
    if (!mounted) {
      mounted = true;
      dialog.addEventListener('close', () => {
        if (!opening) return;
        opening = false;
        if (originalAllow === null) frame.removeAttribute('allow'); else frame.setAttribute('allow', originalAllow);
        if (location.hash === '#raven-road') history.replaceState(null, '', previous);
      });
      G.addEventListener('popstate', () => {
        if (location.hash === '#raven-road') { if (!opening) open(); }
        else if (opening && dialog.open) dialog.close();
      });
    }
  }
  G.RavenWindshieldWorkspace = { open, close };
  document.addEventListener('DOMContentLoaded', () => {
    Promise.resolve(G.StudioKit.ready).then(() => { if (requested) open(); });
  }, { once: true });
})(window);
