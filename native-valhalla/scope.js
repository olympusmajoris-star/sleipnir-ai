(async () => {
  const id=new URLSearchParams(location.search).get('store');
  const sink=document.querySelector('#startup');
  try {
    const row=await window.StudioWorkspaceCore.appStoreById(id);
    if (!row || row.native_renderer!=='ValhallaStreet') throw Error('This store has no active Palm Coast Valhalla menu.');
    const runner=document.createElement('script');runner.src='flutter_bootstrap.js?v=e56b7a057257b7d6c6bbea1865a12d582f891eba99e3476d0a2b7737605318b2';document.body.append(runner);
  } catch(e){sink.textContent=e.message||'The app could not confirm this store.';}
})();
