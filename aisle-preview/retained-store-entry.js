/* Verify the current Studio location before starting a retained Flutter release. */
(async () => {
  'use strict';
  const store = (new URLSearchParams(location.search).get('store') ??
    '35ef70d0-3d20-4599-96a3-648ee3c7c340').trim().toLowerCase();
  const sourceSha256 = new URL('.',document.baseURI).pathname.split('/').filter(Boolean).pop();
  try {
    const core = window.StudioWorkspaceCore;
    const row = await core.appStoreById(store);
    if (!row || !core.groceryModeForStore(row)) throw new Error('Unavailable store');
    const script = document.createElement('script');
    script.src = 'flutter_bootstrap.js';
    document.body.append(script);
  } catch {
    const message = 'This store is unavailable in the Palm Coast grocery editor.';
    const startup = document.querySelector('#startup');
    if (startup) startup.textContent = message;
    document.dispatchEvent(new CustomEvent('sleipnir-preview-up', {
      detail: JSON.stringify({type:'error',store_id:store,sourceSha256,message})
    }));
  }
})();
