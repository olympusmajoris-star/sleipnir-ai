(() => {
  'use strict';
  const skyParams = new URLSearchParams(location.search);
  if (skyParams.get('view') === 'sky') {
    skyParams.delete('view'); skyParams.set('page','ValhallaV2');
    location.replace('page-sky-editor.html?' + skyParams); return;
  }
  const $=id=>document.getElementById(id),form=$('fields'),f=form.elements,frame=$('scene');
  const channel='sleipnir-native-commerce-v1', store=new URL(location.href).searchParams.get('store');
  const rpc=(name,body={},auth=true)=>StudioJobs.request('/rest/v1/rpc/'+name,{method:'POST',auth,body});
  const status=text=>{$('status').textContent=text;}, fail=e=>status(e.message||'Request failed.');
  const settings=()=>state.settings, state={settings:{},original:{},order:[],adjacencies:new Set(),merchant:null,ready:false,owner:false,dirty:false,saving:false,draft:0,published:0};
  window.StudioSelectionTarget=()=>state.merchant?{page:'ValhallaV2',item:'vbrowse',store:state.merchant,label:state.order.find(r=>r.id===state.merchant)?.name||state.merchant}:null;
  const copy=v=>structuredClone(v),items=v=>Array.isArray(v)?v:[],int=v=>Number.isInteger(v)&&v>=0;
  const opt=(s,list,value)=>{s.replaceChildren(...list.map(([id,name])=>new Option(name,id)));if([...s.options].some(o=>o.value===value))s.value=value;};
  const front=()=>settings().fronts?.[state.merchant]||{};
  const number=(key,def)=>f[key].value===''?def:Number(f[key].value);
  const send=(type,data)=>{if(state.ready)frame.contentWindow.postMessage({channel,type,store_id:store,...data},location.origin);};
  function buttons(){$('save').disabled=!state.owner||state.saving||!state.dirty;$('publish').disabled=!state.owner||!state.draft||state.dirty||state.saving;$('preview').disabled=!state.ready;}
  function dirty(){state.dirty=true;buttons();}
  const pendingPhotos=new Map();
  const allowedBuckets=new Set(['studio-published-media','studio','menu-images','Vahalla bg','Vahalla icons','asgard','asgard_ui','raven_earth','business logos','logos','Homepage logos','slei-logo']);
  let library;
  function media(){
    const cfg=window.StudioTransferConfig;
    if(!library)library=window.SharedStudioMedia.create({url:cfg.url,headers:extra=>({apikey:cfg.key,Authorization:'Bearer '+(StudioJobs.current()?.access_token||cfg.key),...extra})});
    return library;
  }
  function allowedMedia(url){
    try {const cfg=window.StudioTransferConfig,uri=new URL(url),root=new URL(cfg.url),prefix='/storage/v1/object/public/';
      return uri.origin===root.origin && uri.pathname.startsWith(prefix) && !uri.search && !uri.hash &&
        allowedBuckets.has(decodeURIComponent(uri.pathname.slice(prefix.length).split('/')[0])) && /\.(png|jpe?g|webp|avif|gif)$/i.test(uri.pathname);
    }catch{return false;}
  }
  const photoControls=new Map();
  function setupArtwork(key,title){
    const input=f[key],label=input.closest('label'),panel=document.createElement('div');panel.className='street-artwork';
    const browse=document.createElement('button');browse.type='button';browse.textContent='Choose '+title+' from Studio';
    const upload=document.createElement('button');upload.type='button';upload.textContent='Upload '+title+' from device';
    const file=document.createElement('input');file.type='file';file.accept='image/png,image/jpeg,image/webp,image/avif,image/gif';file.hidden=true;
    const thumb=document.createElement('img');thumb.alt='Selected '+title;thumb.hidden=true;
    const hint=document.createElement('small');hint.setAttribute('role','status');
    const manual=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Image URL';manual.append(summary);
    label.after(panel);panel.append(browse,upload,file,thumb,hint,manual);manual.append(label);
    function sync(){const p=pendingPhotos.get(input.value),url=p?.objectURL||input.value;
      if(p||allowedMedia(url)){thumb.src=url;thumb.hidden=false;}else{thumb.hidden=true;thumb.removeAttribute('src');}
      hint.textContent=p?p.file.name+' · uploads when you save the draft.':'';}
    photoControls.set(key,sync);input.addEventListener('input',sync);
    browse.onclick=()=>media().open({accept:'image/*',onSelect:item=>{
      if(item.kind!=='image'||!allowedMedia(item.url)){hint.textContent='Choose an image from published Studio storage, or upload one from your device.';return;}
      input.value=item.url;sync();dirty();}});
    upload.onclick=()=>file.click();
    file.onchange=()=>{const raw=file.files[0];if(!raw)return;
      if(!/^image\/(png|jpeg|webp|avif|gif)$/.test(raw.type)||!/\.(png|jpe?g|webp|avif|gif)$/i.test(raw.name)){hint.textContent='Choose a PNG, JPEG, WebP, AVIF or GIF image.';return;}
      const token='pending-image:'+crypto.randomUUID();pendingPhotos.set(token,{file:raw,objectURL:URL.createObjectURL(raw)});input.value=token;file.value='';sync();dirty();};
  }
  for(const [key,title] of Object.entries({day_url:'day sky',night_url:'night sky',window_url:'window artwork',ad_url:'advertisement'}))setupArtwork(key,title);
  function clearPreviewTokens(data){return JSON.parse(JSON.stringify(data,(k,v)=>pendingPhotos.has(v)?'':v));}
  async function uploadSelected(data){
    const selected=new Set();JSON.stringify(data,(k,v)=>{if(pendingPhotos.has(v))selected.add(v);return v;});
    for(const id of selected){
      const p=pendingPhotos.get(id);
      if(!p.url){const asset=await media().upload(p.file);if(!allowedMedia(asset.url))throw Error('Studio did not confirm a published image URL.');p.url=asset.url;}
    }
    return JSON.parse(JSON.stringify(data,(k,v)=>pendingPhotos.get(v)?.url||v));
  }
  function preview(){send('street-settings',{settings:clearPreviewTokens(settings()),sky_override:f.lighting.value});}
  function showStreet(){const s=settings(),k=s.sky||{};
    for(const [n,value] of Object.entries({curb_y:s.curb_y??.882,day_start:k.day_start??6,night_start:k.night_start??19,day_url:k.day_url||'',night_url:k.night_url||''}))f[n].value=value;photoControls.get('day_url')();photoControls.get('night_url')();

  }
  function showWindow(id=''){const windows=items(front().windows);opt(f.window,[['','New window artwork'],...windows.map(a=>[a.id,a.label||a.id])],id);
    const w=windows.find(a=>a.id===f.window.value)||{};for(const [k,v] of Object.entries({window_url:w.image_url||'',window_label:w.label||'',x:w.x??.2,y:w.y??.5,w:w.w??.2,h:w.h??.12}))f[k].value=v;photoControls.get('window_url')();}
  function showFront(id){if(!state.order.some(r=>r.id===id))return;state.merchant=id;f.merchant.value=id;const p=front();
    for(const [k,v] of Object.entries({scale:p.scale??1,offset_x:p.offset_x??0,offset_y:p.offset_y??0,source_curb_y:p.source_curb_y??.882}))f[k].value=v;
    showWindow();}
  function showAd(id=''){const [before,after]=f.gap.value.split('|'),ads=items(settings().ads).filter(a=>a.after_store_id===before&&a.before_store_id===after);
    opt(f.ad,[['','New advertisement'],...ads.map(a=>[a.id,a.label||a.id])],id);const a=ads.find(a=>a.id===f.ad.value)||{};f.ad_url.value=a.image_url||'';f.ad_label.value=a.label||'';photoControls.get('ad_url')();}
  function storeFields(){if(!form.reportValidity())return false;
    const s=settings();s.sky={...(s.sky||{})};for(const n of ['day_url','night_url']){if(f[n].value.trim())s.sky[n]=f[n].value.trim();else delete s.sky[n];}
    s.sky.day_start=number('day_start',6);s.sky.night_start=number('night_start',19);if(s.sky.day_start===s.sky.night_start){status('Day and night must start at different hours.');return false;}
    s.curb_y=number('curb_y',.882);
    if(state.merchant){s.fronts||={};const p=s.fronts[state.merchant]||={};for(const key of ['scale','offset_x','offset_y','source_curb_y'])p[key]=number(key,0);}
    return true;}
  function artwork(pair,remove){if(!state.ready||!form.reportValidity())return;const s=settings();
    if(!storeFields())return;let list,id,save,record;
    if(pair==='window'){const p=s.fronts[state.merchant];list=items(p.windows);id=f.window.value;save=v=>p.windows=v;
      record={id:id||crypto.randomUUID(),image_url:f.window_url.value.trim(),label:f.window_label.value.trim(),x:number('x',0),y:number('y',0),w:number('w',.2),h:number('h',.1)};
      if(!remove&&(record.x+record.w>1||record.y+record.h>1)){status('The window must fit inside the storefront.');return;}}
    else {list=items(s.ads);id=f.ad.value;save=v=>s.ads=v;const [after,before]=f.gap.value.split('|');if(!after||!before)return;
      record={id:id||crypto.randomUUID(),image_url:f.ad_url.value.trim(),label:f.ad_label.value.trim(),after_store_id:after,before_store_id:before};}
    if(!remove&&(!record.image_url||!record.label)){status('Enter the artwork URL and its label.');return;}
    if(remove&&!id)return;
    const i=list.findIndex(a=>a.id===record.id);const next=list.slice();if(remove){next.splice(i,1);}else if(i>=0){next[i]=record;}else next.push(record);save(next);
    (pair==='window'?showWindow:showAd)(remove?'':record.id);dirty();preview();}
  async function loadOwner(){
    if(!StudioJobs.current())await StudioJobs.connect();
    const r=await rpc('studio_valhalla_street_draft');
    if(r?.version!==1||!int(r.revision)||!int(r.published_revision))throw Error('The owner draft could not be verified.');
    const keep=state.dirty && window.confirm('Keep the current local preview as your working draft? Cancel to open the saved owner draft instead.');
    if(!keep){state.settings=copy(r.settings||{});state.dirty=false;}state.owner=true;state.draft=r.revision;state.published=r.published_revision;
    $('owner').textContent='Owner connected';showStreet();showFront(state.merchant);showAd();preview();buttons();status('Owner draft loaded.');}
  form.addEventListener('change',e=>{if(!['merchant','window','gap','ad','lighting'].includes(e.target.name))dirty();});
  f.merchant.onchange=()=>{showFront(f.merchant.value);send('street-move',{merchant_id:state.merchant});};
  f.lighting.onchange=preview;
  f.window.onchange=()=>showWindow(f.window.value);f.ad.onchange=()=>showAd(f.ad.value);f.gap.onchange=()=>showAd();
  for(const [name,pair,remove] of [['putWindow','window',false],['removeWindow','window',true],['putAd','ad',false],['removeAd','ad',true]])$(name).onclick=()=>artwork(pair,remove);
  $('preview').onclick=()=>{if(storeFields()){preview();dirty();status('Previewing changes on this screen.');}};
  $('owner').onclick=()=>loadOwner().catch(fail);
  $('save').onclick=async()=>{if(!state.owner||!state.dirty||!storeFields())return;state.saving=true;buttons();try{
    const submitted=await uploadSelected(settings());
    const r=await rpc('studio_save_valhalla_street_draft',{p_settings:submitted,p_expected_revision:state.draft});
    if(r.version!==1||!int(r.revision))throw Error('Draft save could not be verified.');state.settings=copy(r.settings);state.draft=r.revision;state.published=r.published_revision;state.dirty=false;const windowId=f.window.value,adId=f.ad.value;showStreet();showFront(state.merchant);showWindow(windowId);showAd(adId);preview();status('Draft saved.');
  }catch(e){fail(e);}finally{state.saving=false;buttons();}};
  $('publish').onclick=async()=>{if(!state.owner||state.dirty||state.saving||!window.confirm('Publish the saved Valhalla Street draft to shoppers?'))return;
    state.saving=true;buttons();try{const r=await rpc('studio_publish_valhalla_street',{p_expected_draft_revision:state.draft,p_expected_published_revision:state.published});
      if(r.version!==1||!int(r.revision))throw Error('Publication could not be verified.');state.published=r.revision;status('Published street revision '+r.revision+'.');
    }catch(e){fail(e);}finally{state.saving=false;buttons();}};
  addEventListener('message',e=>{const d=e.data;if(e.origin!==location.origin||e.source!==frame.contentWindow||d?.channel!==channel||d.store_id!==store)return;
    if(d.type==='ready'&&d.street===true){state.ready=true;buttons();return;}
    if(d.type==='open-street-menu'&&state.order.some(s=>s.id===d.merchant_id)){location.href='store-editor.html?'+new URLSearchParams({store:d.merchant_id,native:'1',renderer:'ValhallaStreet'});return;}
    if(d.type!=='street-stop'||!Array.isArray(d.order))return;
    const previous=state.order;state.order=d.order.filter(s=>typeof s.name==='string'&&/^[a-f\d-]{36}$/i.test(s.id));
    if(!previous.length){opt(f.merchant,state.order.map(r=>[r.id,r.name]),store);
      opt(f.gap,state.order.slice(1).map((r,i)=>[state.order[i].id+'|'+r.id,state.order[i].name+' → '+r.name]).filter(([key])=>state.adjacencies.has(key)),'');showAd();}
    if(d.merchant_id&&d.merchant_id!==state.merchant)showFront(d.merchant_id);$('position').textContent=(d.is_ad?'Advertisement · ':'')+d.label+' · '+(d.index+1)+' / '+d.count;});
  (async()=>{const row=await StudioWorkspaceCore.appStoreById(store);
    if(row?.native_renderer!=='ValhallaStreet')throw Error('This location has no active Valhalla Street storefront.');
    const [r,streets]=await Promise.all([rpc('studio_valhalla_street_published',{},false),
      StudioJobs.request('/rest/v1/valhalla_stores?select=store_id&is_active=eq.true&order=sort_order.desc.nullslast,store_id.desc',{auth:false})]);
    state.adjacencies=new Set(items(streets).slice(1).map((row,i)=>streets[i].store_id+'|'+row.store_id));
    if(r?.version!==1||!int(r.revision))throw Error('Published street settings are unavailable.');
    state.settings=copy(r.settings||{});state.published=r.revision;showStreet();buttons();
    $('back').href='store-editor.html?'+new URLSearchParams({store,native:'1',renderer:'ValhallaStreet'});$('back').textContent=row.name+' menu';
    frame.onload=()=>frame.contentWindow.postMessage({channel,type:'hello'},location.origin);
    frame.src='native-valhalla/index.html?'+new URLSearchParams({store,street:'1'});frame.hidden=false;status('Swipe through storefronts to check their curb and windows.');
  })().catch(fail);
})();
