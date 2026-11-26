/* Store authoring stays in the current Sleipnir Studio screen. */
(() => {
  'use strict';
  const dialog = document.getElementById('store-workspace');
  const frame = document.getElementById('store-workspace-frame');
  const directory = new URL('store-directory.html', location.href);
  const returnPath = location.pathname;
  const editorPath = new URL('store-editor.html', location.href).pathname;
  const rooms = window.DiningRoomNavigation;
  const roomLink = document.getElementById('store-workspace-room');
  const picker = roomLink.href;
  let revision = 0;
  async function followEditor() {
    const ticket = ++revision;
    const doc = frame.contentDocument;
    if (!doc) return;
    const url = new URL(doc.URL);
    roomLink.href = picker;
    roomLink.textContent = 'Dining rooms';
    roomLink.hidden = false;
    if (url.origin !== location.origin || url.pathname !== editorPath) return;
    roomLink.hidden = true;
    try {
      const room = await rooms.resolve(url.searchParams.get('store'), url.searchParams.get('view'));
      if (!room || ticket !== revision || frame.contentDocument !== doc) return;
      roomLink.href = room;
      roomLink.textContent = 'Open dining room';
      roomLink.hidden = false;
      if (dialog.open && url.searchParams.get('classic') !== '1') rooms.navigate(room);
    } catch { /* The frame can still present its own recovery flow. */ }
  }
  const openers = document.querySelectorAll('[data-open-store-workspace]');

  function directoryURL(type) {
    revision++;
    const url = new URL(directory);
    url.searchParams.set('rooms', '4');
    if (type) url.searchParams.set('type', type);
    return url.href;
  }

  function open(type) {
    if (type || !frame.hasAttribute('src')) frame.src = directoryURL(type);
    if (!dialog.open) dialog.showModal();
    if (!type) followEditor();
    window.StudioKit.previewCovered = true;
  }

  dialog.addEventListener('close', () => { window.StudioKit.previewCovered = dialog.open; });
  for (const button of openers) button.addEventListener('click', () => open());
  document.getElementById('store-workspace-close').addEventListener('click', () => dialog.close());
  document.getElementById('store-workspace-all').addEventListener('click', () => {
    frame.src = directoryURL();
  });
  frame.addEventListener('load', () => {
    followEditor();
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
