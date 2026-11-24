/* Opens the post workspace inside the existing studio and preserves its page. */
(function (G) {
'use strict';
const requested = location.hash === '#posts';
let previous = '#sky', opening = false, mounted = false;
function open() {
  const dialog = document.getElementById('extDlg'), frame = document.getElementById('extFrame');
  if (!dialog || !frame) return;
  if (location.hash !== '#posts') previous = location.hash || '#sky';
  document.getElementById('extTitle').textContent = 'Asgard · Post page';
  frame.title = 'Asgard post page editor';
  frame.src = new URL('asgard-post-editor.html?embed=1&v=1123symbols1', location.href).href;
  opening = true;
  G.StudioKit.previewCovered = true;
  if (!dialog.open) dialog.showModal();
  if (location.hash !== '#posts') history.pushState(null, '', '#posts');
  if (!mounted) {
    mounted = true;
    dialog.addEventListener('close', () => {
      if (!opening) return;
      opening = false;
      if (location.hash === '#posts') history.replaceState(null, '', previous);
    });
    G.addEventListener('popstate', () => {
      if (location.hash === '#posts') { if (!opening) open(); }
      else if (opening && dialog.open) dialog.close();
    });
  }
}
G.AsgardPostWorkspace = { open };
document.addEventListener('DOMContentLoaded', () => {
  Promise.resolve(G.StudioKit.ready).then(() => { if (requested) open(); });
}, { once: true });
})(window);
