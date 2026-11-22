(async () => {
  const id=new URLSearchParams(location.search).get('store');
  const sink=document.querySelector('#startup');
  try {
    const row=await window.StudioWorkspaceCore.appStoreById(id);
    if (!row || row.native_renderer!=='ValhallaStreet') throw Error('This store has no active Palm Coast Valhalla menu.');
    const runner=document.createElement('script');runner.src='flutter_bootstrap.js?v=f65807fcaa9e3bc3f25bccebd12d2ff0d052c8d29f52651ceca7ea5e0eacbb96';document.body.append(runner);
  } catch(e){sink.textContent=e.message||'The app could not confirm this store.';}
})();
