(function (global) {
  'use strict';
  const channel = 'sleipnir-native-commerce-v1';
  const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
  const readers = {retail:'Retail store',convenience:'Retail store',fast_food:'Drive-thru menu',drive_thru:'Drive-thru menu',fast_casual:'Fast-casual menu',sit_down:'Restaurant menu',restaurant:'Restaurant menu'};
  const asRow = value => Array.isArray(value) ? value[0] : value;
  const el = (tag, label) => { const n=document.createElement(tag); if(label!==undefined)n.textContent=label; return n; };

  async function open(id) {
    const core=global.StudioWorkspaceCore, jobs=global.StudioJobs;
    const shell=el('main');shell.id='commerce-editor';
    const head=el('header'), directory=el('a','Store directory'), title=el('h1','Opening store…');
    directory.href='store-directory.html';head.append(directory,title);
    const status=el('p');status.setAttribute('role','status'); shell.append(head,status);document.body.replaceChildren(shell);
    if(!uuid.test(id||'')){title.textContent='Store unavailable';return;}
    let store;
    try {store=await core.appStoreById(id);}
    catch { title.textContent='Store directory unavailable';status.textContent='Reload to check the shopper app’s store list.';return; }
    if(!store){title.textContent='Store unavailable';status.textContent='This location is outside the app’s store list.';return;}
    const grocery=core.groceryEntranceForStore(store);
    if(grocery){location.replace(grocery);return;}
    title.textContent=store.name;
    const repairs=el('a','Flag store or display'); repairs.href='store-repairs.html?'+new URLSearchParams({store:id});head.append(repairs);
    if(!readers[store.menu_type]){status.textContent='This location has no supported native display.';return;}
    const isStreet=store.native_renderer==='ValhallaStreet'||store.app_surface==='valhalla';
    if(isStreet){const street=el('a','Edit street and storefronts');street.href='valhalla-street-editor.html?'+new URLSearchParams({store:id});head.append(street);}
    const source=new URL(isStreet?'native-valhalla/index.html':'native-commerce-preview/index.html',location.href);source.search=new URLSearchParams({store:id});
    const frame=el('iframe');frame.title=store.name+' shopper display';frame.setAttribute('referrerpolicy','same-origin');
    const viewer=el('section');viewer.className='commerce-viewer';
    const mode=el('button','Browse store'), prev=el('button','Previous panel'), next=el('button','Next panel');prev.hidden=next.hidden=true;
    const nav=el('nav');nav.setAttribute('aria-label','Preview controls');nav.append(mode,prev,next);
    const panelLabel=el('span');nav.append(panelLabel);
    viewer.append(nav,frame);
    const inspector=el('aside'), cue=el('p','Select an item in the store to see its details.'), selection=el('section');
    inspector.append(el('h2','Product details'),cue,selection);
    const body=el('div');body.className='commerce-body';body.append(viewer,inspector);shell.append(body);
    frame.hidden=true;nav.hidden=true;selection.inert=true;
    let loadedView='studio', shopperView=false, confirmedBuild=false, editing=true, product=null, owner=false, sequence=0, scalable=false, sourceDigest='', panel=1, maxPanel=1, renderer='', busy=false;
    global.StudioSelectionTarget=()=>({page:isStreet?'ValhallaV2':({retail:'RetailStorePage',convenience:'RetailStorePage',fast_food:'DriveThruBoard',fast_casual:'FastCasualMenu',sit_down:'RestaurantMenu',restaurant:'RestaurantMenu'})[store.menu_type],
      store:id,item:isStreet?'vbrowse':store.menu_type==='convenience'?'retail':store.menu_type,part:product?.id||'',label:product?.name||store.name});
    let menuEditor=null,latestMenuPage=null;
    const saved=new Map(), drafts=new Map(), notes=new Map();
    const query=(table,params)=>jobs.request('/rest/v1/'+table+'?'+new URLSearchParams(params),{auth:false});
    const rpc=(name,body)=>jobs.request('/rest/v1/rpc/'+name,{method:'POST',body});
    const send=(type,data={})=>frame.contentWindow?.postMessage({channel,type,...data},source.origin);
    const sync=()=>send('sync',{scales:Object.fromEntries([...saved].map(([key,r])=>[key,r.scale]).concat([...drafts]))});
    async function readScales() {
      const limit=500;
      for(let offset=0;;offset+=limit){
        const rows=await query('studio_grocery_product_scales',{store_id:'eq.'+id,select:'product_id,scale,revision',order:'product_id',limit,offset});
        for(const r of rows)saved.set(r.product_id,{scale:Number(r.scale),revision:Number(r.revision)});
        if(rows.length<limit)break;
      }sync();
    }
    async function confirmOwner() {
      if(owner)return;
      await jobs.connect();if(asRow(await rpc('studio_grocery_editor_access',{}))!==true)throw Error('This account lacks product editing access.');
      owner=true;
    }
    const action=(label,operation)=>{
      const button=el('button',label);
      button.onclick=async()=>{if(busy||!confirmedBuild)return;busy=true;button.disabled=true;
        try{await operation();}catch(e){status.textContent=e.message||'The change could not be saved.';}
        finally{busy=false;button.disabled=false;} };
      return button;
    };
    function showProduct() {
      selection.replaceChildren();if(!product)return;
      const p=product, pid=p.id;
      cue.textContent=p.category||readers[store.menu_type];
      selection.append(el('h3',p.name));
      if(p.price!=null && Number.isFinite(Number(p.price)))selection.append(el('p',new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(p.price))));
      selection.append(global.StudioProductDetails.button({
        storeId:id,productId:pid,current:()=>confirmedBuild && editing && product?.id===pid,
        surface:isStreet?'This updates the item’s catalog details and base price. Menu option prices, availability and embedded dish photos use separate records.':
          'This updates the catalog item and its base price. Printed menu artwork and separately priced sizes use their own sources.',
        onSaved(row){
          if(!confirmedBuild || shopperView)return;
          if(product?.id===pid){product={...product,...row};showProduct();}
          panel=1;frame.src=source.href;
        }
      }));
      const baseline=()=>saved.get(pid)||{scale:1,revision:0};
      if(scalable){
        const label=el('label','Product image scale'), output=el('output'), range=el('input');
        range.type='range';range.min='0.1';range.max='4';range.step='0.01';range.value=drafts.get(pid)??baseline().scale;range.setAttribute('aria-label','Product image scale');
        const print=()=>output.textContent=Math.round(Number(range.value)*100)+'%';print();
        range.oninput=()=>{const scale=Number(range.value);drafts.set(pid,scale);print();send('set-scale',{product_id:pid,scale});};
        label.append(output,range);
        selection.append(label,action('Save scale',async()=>{
          const value=drafts.get(pid);if(value==null){status.textContent='The saved scale is already in use.';return;}
          const old=baseline();await confirmOwner();let r;
          try {r=asRow(await rpc('studio_save_grocery_product_scale',{p_store_id:id,p_product_id:pid,p_scale:value,p_expected_revision:old.revision}));}
          catch(e){const rows=await query('studio_grocery_product_scales',{store_id:'eq.'+id,product_id:'eq.'+pid,select:'scale,revision'});if(rows.length)saved.set(pid,{scale:Number(rows[0].scale),revision:Number(rows[0].revision)});throw e;}
          if(r?.product_id!==pid||r.store_id!==id||Number(r.scale)!==value||Number(r.revision)<old.revision)throw Error('The store could not confirm this change.');
          saved.set(pid,{scale:value,revision:Number(r.revision)});if(drafts.get(pid)===value)drafts.delete(pid);
          status.textContent='Scale saved for '+p.name+'.';
        }));
      }else if(!menuEditor)selection.append(el('p',renderer==='fast_food'?'This menu uses a shared board image. Flag the item to request a board artwork edit.':'This product has no individual photo to resize.'));
      const note=el('textarea');note.maxLength=4000;note.rows=3;note.value=notes.get(pid)||'';note.setAttribute('aria-label','Product repair note');note.placeholder='Describe the product or display problem';
      note.oninput=()=>notes.set(pid,note.value);
      const flag=action('Flag product',async()=>{
        const text=note.value.trim();if(!text)throw Error('Add a repair note.');
        await confirmOwner();
        const r=asRow(await rpc('studio_flag_grocery_product',{p_store_id:id,p_product_id:pid,p_aisle:p.category||readers[store.menu_type],p_version:sourceDigest||null,p_page_key:renderer==='fast_food'?'board/'+panel:renderer,p_note:text}));
        if(r?.product_id!==pid||r.store_id!==id)throw Error('The store could not confirm this flag.');
        if(notes.get(pid)===text){notes.delete(pid);note.value='';}status.textContent='Repair flag saved for '+p.name+'.';
      });
      selection.append(note,flag);
    }
    async function choose(pid,canScale){
      const token=++sequence;product=null;selection.replaceChildren();cue.textContent='Checking selected product…';
      try {
        const rows=await query('products',{id:'eq.'+pid,store_id:'eq.'+id,select:'id,name,category,price',limit:1});
        if(token!==sequence)return;
        if(rows[0]?.id!==pid){cue.textContent='This item has no matching product in this store.';return;}
        product=rows[0];scalable=canScale;showProduct();menuEditor?.choose(product);
      }catch{if(token===sequence)cue.textContent='Product details could not be loaded.';}
    }
    if(isStreet||['fast_food','drive_thru','fast_casual','sit_down','restaurant'].includes(store.menu_type)){
      const menuHost=el('section');inspector.prepend(menuHost);
      if(global.StudioRestaurantMenus){
        menuEditor=global.StudioRestaurantMenus.mount(menuHost,{store,send,confirmOwner,current:()=>confirmedBuild&&!shopperView&&editing,chooseProduct:pid=>choose(pid,false)});
        const shortcut=el('button',isStreet?'Edit menu':(['sit_down','restaurant'].includes(store.menu_type)?'Edit menu book':'Edit menu board'));
        shortcut.onclick=()=>menuEditor.open();head.append(shortcut);
      }
    }
    function drawPanel(){panelLabel.textContent=maxPanel>1?((!isStreet && ['sit_down','restaurant'].includes(store.menu_type))?'Page ':'Panel ')+panel+' of '+maxPanel:'';prev.hidden=next.hidden=maxPanel<2;prev.disabled=panel<=1;next.disabled=panel>=maxPanel;}
    function move(forward){if(panel+(forward?1:-1)<1||panel+(forward?1:-1)>maxPanel)return;panel+=forward?1:-1;send('move',{direction:forward?'next':'previous'});drawPanel();}
    prev.onclick=()=>move(false);next.onclick=()=>move(true);
    mode.onclick=()=>{editing=!editing;mode.textContent=editing?'Browse store':'Select products';mode.setAttribute('aria-pressed',String(!editing));send('set-mode',{mode:editing?'select':'browse'});menuEditor?.state(confirmedBuild&&editing&&!shopperView);if(editing&&latestMenuPage)menuEditor?.page(latestMenuPage);};
    global.addEventListener('message',event=>{
      const m=event.data;
      if(event.origin!==source.origin||event.source!==frame.contentWindow||m?.channel!==channel||m.store_id!==id)return;
      if(m.type==='menu-page' && !shopperView){
        latestMenuPage=m;if(confirmedBuild){panel=Number(m.page)||1;maxPanel=Number(m.pages)||1;drawPanel();menuEditor?.page(m);}
      }
      if(m.type==='ready'){renderer=m.renderer;maxPanel=Number(latestMenuPage?.pages)||Number(m.panels)||1;drawPanel();send('set-mode',{mode:editing&&!shopperView?'select':'browse'});if(!shopperView)sync();}
      if(m.type==='error')status.textContent=m.message||'The native display could not open.';
      if(m.type==='select'&&editing&&confirmedBuild&&uuid.test(m.product_id))choose(m.product_id,m.scalable===true);
    });
    frame.addEventListener('load',()=>send('hello'));frame.src=source.href;
    const releaseURL=new URL('release.json',source).href;
    const versions=el('section');inspector.append(versions);
    fetch(releaseURL,{cache:'no-store'}).then(r=>r.json()).then(release=>{
      sourceDigest=release.artifactSHA256||release.artifactSha256||'';
      if(!global.NativeCommerceSource)throw Error('Source verification is unavailable.');
      return global.NativeCommerceSource.mount(versions,{
        adapter:isStreet?'valhalla':store.menu_type, storeId:id, releaseURL, release, expectedArtifactSHA256:sourceDigest,
        onState(state){
          shopperView=false;
          if(state.status==='shopper'&&!isStreet){
            const exact=new URL('native-shopper-preview/index.html',location.href);
            exact.search=new URLSearchParams({store:id});
            let approved;
            try {approved=new URL(state.previewURL,location.href);}catch{}
            if(approved?.origin===exact.origin&&['native-shopper-preview/index.html','native-shopper-preview-v1/index.html','native-commerce-preview-v1/index.html'].some(path=>new URL(path,location.href).pathname===approved.pathname)&&approved.searchParams.get('store')===id&&[...approved.searchParams].length===1){
              shopperView=true;
              if(loadedView!=='shopper'||frame.src!==approved.href){loadedView='shopper';panel=1;frame.src=approved.href;}
            }
          }
          confirmedBuild=state.status==='published'||state.status==='verified';
          menuEditor?.state(confirmedBuild&&!shopperView);if(confirmedBuild && latestMenuPage)menuEditor?.page(latestMenuPage);
          if(loadedView==='shopper'&&confirmedBuild){loadedView='studio';panel=1;frame.src=source.href;}
          frame.hidden=nav.hidden=!confirmedBuild&&!shopperView;
          mode.hidden=shopperView; selection.inert=!confirmedBuild;
          if(!confirmedBuild){
            sequence++;product=null;selection.replaceChildren();
            cue.textContent=shopperView?'Browsing the uploaded shopper widget. Use the published Studio build to select and edit products.':'A verified native build is required to edit products.';
          }else if(!product)cue.textContent='Select an item in the store to see its details.';
        }
      });
    }).catch(()=>{versions.textContent='Source verification is unavailable for this display.';});
    readScales().catch(()=>{status.textContent='Saved product scales could not be loaded. Reload before editing.';});
    query('products',{select:'id',store_id:'eq.'+id,limit:1}).then(rows=>{if(!rows.length)cue.textContent='This store has no catalog products to select. Use Flag store or display to report a missing menu.';}).catch(()=>{});
  }
  global.NativeCommerceEditor={open};
})(window);
