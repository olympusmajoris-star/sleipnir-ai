(async () => {
  'use strict';
  const id=new URLSearchParams(location.search).get('store');
  const sink=document.querySelector('#startup');
  try {
    let core=window.StudioWorkspaceCore;
    try { if(parent!==window && parent.location.origin===location.origin && parent.StudioWorkspaceCore)core=parent.StudioWorkspaceCore; } catch {}
    const row=await core.appStoreById(id);
    if (!row || core.groceryEntranceForStore(row) || row.native_renderer==='ValhallaStreet' || row.app_surface==='valhalla') throw Error('This store is outside the active shopper menu directory.');
    const response=await fetch('release.json',{cache:'no-store'});
    if(!response.ok)throw Error('The native store build is unavailable.');
    const release=await response.json();
    if(!/^[a-f0-9]{64}$/.test(release.bootstrapSHA256))throw Error('The native store build could not be verified.');
    const runner=document.createElement('script');runner.src='flutter_bootstrap.js?v='+release.bootstrapSHA256;
    const bytes=release.bootstrapSHA256.match(/../g).map(hex=>parseInt(hex,16));
    runner.integrity='sha256-'+btoa(String.fromCharCode(...bytes));document.body.append(runner);
  }catch(e){sink.textContent=e.message||'The app could not confirm this store.';}
})();
