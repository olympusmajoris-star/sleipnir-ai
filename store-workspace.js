/* Store authoring stays in the current Sleipnir Studio screen. */
(() => {
  'use strict';
  const dialog = document.getElementById('store-workspace');
  const frame = document.getElementById('store-workspace-frame');
  const directory = new URL('store-directory.html', location.href);
  const returnPath = location.pathname;
  const openers = document.querySelectorAll('[data-open-store-workspace]');

  function directoryURL(type) {
    const url = new URL(directory);
    if (type) url.searchParams.set('type', type);
    return url.href;
  }

  function open(type) {
    if (type || !frame.hasAttribute('src')) frame.src = directoryURL(type);
    if (!dialog.open) dialog.showModal();
    window.StudioKit.previewCovered = true;
  }

  dialog.addEventListener('close', () => { window.StudioKit.previewCovered = dialog.open; });
  for (const button of openers) button.addEventListener('click', () => open());
  document.getElementById('store-workspace-close').addEventListener('click', () => dialog.close());
  document.getElementById('store-workspace-all').addEventListener('click', () => {
    frame.src = directoryURL();
  });
  frame.addEventListener('load', () => {
    const doc = frame.contentDocument;
    if (!doc) return;
    // A standalone directory links back to Studio. In this window that same
    // action closes the editor and restores the screen already underneath it.
    doc.addEventListener('click', event => {
      const link = event.target.closest?.('a[href]');
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const url = new URL(link.href);
      if (url.origin === location.origin && url.pathname === returnPath && !url.search && !url.hash) {
        event.preventDefault();
        dialog.close();
      }
    });
  });
  window.SleipnirStoreWorkspace = {open};
})();
