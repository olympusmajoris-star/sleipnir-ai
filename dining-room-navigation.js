/* Only owner Studio entry points call this router. Catalog rows come from the scoped location RPC. */
(function () {
  'use strict';

  const origin = 'https://palm-coast-chain-dining-studio.transparentmoth1.chatgpt.site';
  const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
  function urlFor(store, view) {
    if (!store || !uuid.test(store.id) || !['sit_down','restaurant'].includes(store.menu_type) ||
        store.app_surface !== 'ordinary' || store.is_valhalla !== false ||
        store.is_live !== true || store.native_renderer ||
        window.StudioWorkspaceCore.physicalCity(store).toLowerCase() !== 'palm coast') return '';
    const url = new URL('/', origin);
    url.searchParams.set('store', store.id);
    if (view === 'phone') url.searchParams.set('view', 'phone');
    return url.href;
  }
  async function resolve(id, view) {
    if (!uuid.test(id || '')) return '';
    return urlFor(await window.StudioWorkspaceCore.appStoreById(id), view);
  }
  function linkTo(href, label='Open dining room') {
    const link=document.createElement('a');
    link.href=href;
    link.target='_top';
    link.textContent=label;
    return link;
  }

  function navigate(href) {
    try {window.top.location.replace(href);} catch { /* The visible _top link enables a user-initiated transition. */ }
  }
  function openRoom(href, view) {
    const heading=document.createElement('h1');
    heading.textContent='Dining room Studio';
    const open=linkTo(href,view==='phone'?'Open iPhone dining room preview':'Open dining room');
    const alternatives=document.createElement('p');
    const classic=document.createElement('a'),back=new URL(location.href);
    back.searchParams.set('classic','1');
    classic.href=back.href;
    classic.textContent='Open the classic store editor';
    alternatives.append(classic);
    document.body.replaceChildren(heading,open,alternatives);
    navigate(href);
  }

  async function enterEditor(legacyScript) {
    const query=new URLSearchParams(location.search);
    const main=document.querySelector('main');
    const requested=query.get('store'),view=query.get('view');
    const classic=query.get('classic')==='1';
    if(uuid.test(requested||'')){
      main.hidden=!classic;
      try{
        const href=await resolve(requested,view);
        if(href && !classic){openRoom(href,view);return;}
        if(href)document.querySelector('body > header')?.append(linkTo(href));
      }catch{/* The legacy editor displays its own directory recovery message. */}
    }
    main.hidden=false;
    const script=document.createElement('script');
    script.src=legacyScript;
    document.body.append(script);
  }
  window.DiningRoomNavigation=Object.freeze({urlFor,resolve,openRoom,navigate,linkTo});
  const script=document.currentScript;
  if(script?.dataset.editorScript)enterEditor(script.dataset.editorScript);
  if(script?.hasAttribute('data-legacy-page') && !window.AsgardRuntime){
    const query=new URLSearchParams(location.search);
    if(query.get('page')==='store' && query.get('legacy')==='1'){
      resolve(query.get('store'),query.get('view')).then(href=>{
        if(href)document.querySelector('body > header')?.append(linkTo(href));
      }).catch(()=>{});
    }
  }
})();
