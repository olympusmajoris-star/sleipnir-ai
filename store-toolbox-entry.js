/* Open tools with the actual store/aisle selection and retain the working editor. */
(() => {
  'use strict';
  // Legacy store editor exposes its current asset and the public store ID already.
  function storeSelection() {
    const api=window.StoreComponentEditor, assets=api?.assets;
    if(!assets?.length)return null;
    const query=new URLSearchParams(location.search),store=query.get('store');
    const a=assets.find(v=>v.id===api.selection.asset);
    const page={station:'StationPage',navigator:'GroceryAisle',produce:'ProduceWallPage',cart:'Cart',checkout:'Checkout',
      retail:'RetailStorePage',fast_food:'DriveThruBoard',fast_casual:'FastCasualMenu',sit_down:'RestaurantMenu',grocery:'StoreEntrancePage'}[a?.page];
    return {page:page||'Studio_shopping_store',nativePage:!!page,item:query.get('type')||'retail',store,
      part:a?.id||'',label:a?.name||'',parts:assets.map(x=>({id:x.id,label:x.name}))};
  }
  const current = () => window.StudioSelectionTarget?.() || window.AsgardWorkspaceEditor?.toolTarget?.() || storeSelection();
  const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
  let shell, frame;
  function open() {
    const t=current();
    if(!t || !uuid.test(t.store||'') || !t.page) return;
    const target={group:'shopping',page:t.item||'grocery',store:t.store,bounds:t.bounds?JSON.stringify(t.bounds):'',
      toolPage:t.page,toolNative:t.nativePage===false?'':t.page,aisle:t.aisle||'',part:t.part||'',layer:t.layer||'',
      targetLabel:t.label||t.aisle||'',targetType:t.layer?'layer':t.part?'part':t.aisle?'aisle':'store',
      tools:'1',toolHost:'selection'};
    if(!shell) {
      shell=document.createElement('dialog');shell.className='store-toolbox-dialog';
      const bar=document.createElement('header'), back=document.createElement('button');
      back.type='button';back.textContent='Return to selection';back.onclick=()=>shell.close();bar.append(back);
      frame=document.createElement('iframe');frame.title='Tools for the selected store or aisle';
      shell.append(bar,frame);document.body.append(shell);
      shell.addEventListener('close',()=>frame.removeAttribute('src'));
      addEventListener('message',e=>{if(e.origin===location.origin&&e.source===frame.contentWindow&&e.data?.type==='studio:close-store-toolbox')shell.close();});
    }
    const params=new URLSearchParams(target);params.set('item',target.page);params.delete('page');
    const k=JSON.stringify([target.group,target.page,target.store,target.aisle,'']);
    try{sessionStorage.setItem('studio-tool-target:'+k,JSON.stringify({page:t.page,nativePage:target.toolNative,
      candidates:(t.parts||[]).map(p=>({type:'part',id:p.id,label:p.label})),part:target.part,layer:target.layer}));}catch{}
    frame.src='workshop.html?'+params;shell.showModal();
  }
  function attach() {
    for(const head of document.querySelectorAll('[data-toolbox-host],#editor-header,.layout-top,body>header,#commerce-editor>header,main>header')) {
      if(head.matches('main>header') && head.closest('dialog'))continue;
      if(head.querySelector('[data-selection-toolbox]')||head.closest('.store-toolbox-dialog'))continue;
      const b=document.createElement('button');b.type='button';b.textContent='Toolbox';b.dataset.selectionToolbox='';b.onclick=open;
      head.append(b);
    }
  }
  function sync(){
    const t=current();
    for(const b of document.querySelectorAll('[data-selection-toolbox]'))b.disabled=!t?.page||!uuid.test(t?.store||'');
  }
  window.StudioSelectionToolbox=Object.freeze({open,current});
  function mount(){attach();sync();}
  new MutationObserver(mount).observe(document.body,{childList:true,subtree:true});
  addEventListener('change',sync);addEventListener('pageshow',mount);document.addEventListener('DOMContentLoaded',mount);mount();
})();
