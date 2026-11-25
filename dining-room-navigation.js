/* Studio navigation for the Palm Coast dining room workspaces. */
(function () {
  'use strict';

  const core = window.StudioWorkspaceCore;
  const origin = 'https://palm-coast-chain-dining-studio.transparentmoth1.chatgpt.site';
  const names = new Set([
    'bob evans', 'cracker barrel old country store', 'ihop',
    'longhorn steakhouse', 'metro diner', "houligan's palm coast",
  ]);
  const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

  // Callers supply rows verified by loadAppStores or appStoreById.
  function urlFor(store, view) {
    if (!store || !uuid.test(store.id) || store.menu_type !== 'sit_down' ||
        store.app_surface !== 'ordinary' || store.is_valhalla !== false ||
        store.is_live !== true || store.native_renderer ||
        core.physicalCity(store).toLowerCase() !== 'palm coast') return '';
    const name = String(store.name || '').trim().toLowerCase().replace(/[’‘]/g, "'");
    if (!names.has(name)) return '';
    const url = new URL('/', origin);
    url.searchParams.set('store', store.id);
    if (view === 'phone') url.searchParams.set('view', 'phone');
    return url.href;
  }

  async function enterEditor(legacyScript) {
    const query = new URLSearchParams(location.search);
    const main = document.querySelector('main');
    let url = '';
    if (query.get('classic') !== '1' && uuid.test(query.get('store'))) {
      main.hidden = true;
      try {
        const row = await core.appStoreById(query.get('store'));
        url = urlFor(row, query.get('view'));
      } catch {
        // Let the original editor handle directory errors and recovery.
      }
    }
    if (!url) {
      main.hidden = false;
      const script = document.createElement('script');
      script.src = legacyScript;
      document.body.append(script);
      return;
    }
    // Frames embedded by another origin may require a click to leave the host.
    const heading = document.createElement('h1');
    heading.textContent = 'Dining room Studio';
    const open = document.createElement('a');
    open.href = url;
    open.target = '_top';
    open.textContent = query.get('view') === 'phone' ? 'Open iPhone dining room preview' : 'Open dining room';
    const classic = document.createElement('a');
    const back = new URL(location.href);
    back.searchParams.set('classic', '1');
    classic.href = back.href;
    classic.textContent = 'Open the classic store editor';
    const alternatives = document.createElement('p');
    alternatives.append(classic);
    document.body.replaceChildren(heading, open, alternatives);
    try { window.top.location.replace(url); } catch { /* The top-level link remains usable. */ }
  }

  window.DiningRoomNavigation = Object.freeze({urlFor});
  const legacyScript = document.currentScript?.dataset.editorScript;
  if (legacyScript) enterEditor(legacyScript);
})();
