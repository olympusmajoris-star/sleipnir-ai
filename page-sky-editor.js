(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const page = params.get('page') || 'ValhallaV2';
  const views = {HomePage:'home',Asgard:'sky','Asgard/dial':'dial','Asgard/directory':'directory','Asgard/conversation':'conversation','Asgard/horn':'horn','Asgard/way':'way'};
  const names = {day:'Day sky',night:'Night sky',stars:'Stars',streamers:'Streamer black holes',raven:'Perched raven'};
  const target = {};
  for(const key of ['store','aisle','part','layer']){
    const value=params.get(key);
    const previewStore=key==='store' && page==='ValhallaV2' && params.get('targetType')!=='store' && !['aisle','part','layer'].some(k=>params.get(k));
    if(value && !previewStore)target[key]=value;
  }
  const scoped=Object.keys(target).length>0;
  const storageKey='sleipnir.page-sky.device.v1.'+page+(scoped?'|'+JSON.stringify(target):'');
  let inherited={features:{}};
  const effective=()=>({...inherited,...state.settings,features:{...inherited.features,...state.settings.features}});
  const state = {settings:{features:{}},base:{features:{}},dirty:false,owner:false,conflict:null,revision:0,publishedRevision:0,publishedSettings:null,busy:false,valid:false};
  const canvas = $('sky-canvas'), ctx = canvas.getContext('2d'), phone = $('phone'), caption = $('scene-caption');
  let topic = Object.hasOwn(names,params.get('feature')) ? params.get('feature') : '';
  let library, nativeFrame, storeId, currentMerchant, nativeRect, streetPhoto, nativeReady = false, kit, liveStage, liveLayers, planes, drawId = 0, nextTime = 0, placement, loading = true;
  const channel = 'sleipnir-native-commerce-v1';
  const copy = value => structuredClone(value);
  const stable = value => value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])])) : value;
  const same = (a,b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));
  const status = text => { $('status').textContent = text; };
  const defaults = () => copy(window.SleipnirPageSky?.defaults || {features:{}});
  function make(tag, text, className) {
    const node = document.createElement(tag);
    if (text != null) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function button(text,click) {
    const element = make('button',text); element.type = 'button'; element.onclick = click; return element;
  }
  function option(value,label) { return new Option(label,value); }
  function featureDefaults(key) {
    const config = window.SleipnirSkyLayers?.catalog?.features?.[key]?.defaults;
    if (!config) throw Error('The sky feature catalog is unavailable.');
    return {...config,enabled:false};
  }
  function selected(key) { return {...featureDefaults(key),...effective().features?.[key]}; }
  function deviceRecord() {
    try { const d=JSON.parse(localStorage.getItem(storageKey)); return d?.settings && d?.base ? d : null; }
    catch {return null;}
  }
  function stash() {
    state.dirty = !same(state.settings,state.base);
    try {
      if (state.dirty) localStorage.setItem(storageKey,JSON.stringify({settings:state.settings,base:state.base}));
      else localStorage.removeItem(storageKey);
      status(state.dirty ? 'Device draft saved here.' : 'No pending edits.');
    } catch { status('Device storage is unavailable. Your edits are in this tab.'); }
    refreshButtons(); updatePreview();
  }
  function change(key,value) {
    if (value === undefined) delete state.settings[key]; else state.settings[key]=value;
    stash();
  }
  function featureChange(key,value) {
    state.settings.features ||= {};
    state.settings.features[topic] = {...selected(topic),[key]:value};
    if (!state.settings.features[topic].asset_url) delete state.settings.features[topic].asset_url;
    stash();
  }
  function differsFromPublished() {
    return state.revision>0 && (state.publishedSettings==null || !same(state.settings,state.publishedSettings));
  }
  function refreshButtons() {
    $('controls').inert = state.busy || !state.valid || Boolean(state.conflict);
    $('connect').textContent = state.owner ? 'Reload owner draft' : 'Connect owner'; $('connect').disabled = state.busy || !state.valid || loading || Boolean(state.conflict);
    $('save').hidden = $('publish').hidden = !state.owner;
    $('save').disabled = !state.dirty || state.busy || Boolean(state.conflict);
    $('publish').disabled = state.dirty || state.busy || Boolean(state.conflict) || !differsFromPublished();
    $('review').hidden = !state.conflict;
  }
  function leave() {
    if (topic) { focus(''); return; }
    if (window.parent !== window) { parent.postMessage({type:'sleipnir:workshop-back',section:page==='ValhallaV2'?'valhalla':'app-pages',category:'storefront',page},location.origin); return; }
    const dest = page==='ValhallaV2' ? {group:'valhalla',item:'street'} : {group:'social',item:'app-pages',asset:page};
    location.href = 'workshop.html?' + new URLSearchParams(dest);
  }
  function focus(id,notify=true) {
    topic = Object.hasOwn(names,id) ? id : ''; endPlacement();
    const url = new URL(location.href);
    if (topic) url.searchParams.set('feature',topic); else url.searchParams.delete('feature');
    history.replaceState(null,'',url); render(); $('heading').focus({preventScroll:true});
    if (notify && window.parent!==window) parent.postMessage({type:'sleipnir:workshop-topic',section:page==='ValhallaV2'?'valhalla':'app-pages',feature:'sky',page,topic},location.origin);
  }
  window.ValhallaSkyWorkshop = {focus:id=>focus(id,false)};
  $('back').onclick = leave;
  $('heading').tabIndex = -1;
  $('page-name').textContent = page === 'ValhallaV2' ? 'Valhalla · Storefronts' : page.replace(/([a-z])([A-Z])/g,'$1 $2').replaceAll('/',' · ');
  if(scoped) {
    const description=params.get('targetLabel') || target.layer || target.part || target.aisle || 'Selected storefront';
    $('page-name').textContent+=' · '+description;
  }
  $('lighting').onchange = () => updatePreview();
  function endPlacement() { placement?.remove(); placement=null; }
  function placeOnPreview() {
    if (placement) { endPlacement(); return; }
    const targetTopic = topic;
    placement = make('button',null,'placement'); placement.setAttribute('aria-label','Place '+names[topic]+' on the preview');
    const strip=page==='Asgard' && kit?.cur?.id==='sky' && kit.cur.P;
    let area=nativeRect;
    if(strip) area={x:0,y:0,width:1,height:Math.min(strip['strip.max'],kit.H*strip['strip.share'])/kit.H};
    if(area && [area.x,area.y,area.width,area.height].every(Number.isFinite)){
      Object.assign(placement.style,{inset:'auto',left:area.x*100+'%',top:area.y*100+'%',width:area.width*100+'%',height:area.height*100+'%'});
    }
    phone.append(placement);
    status('Tap or drag on the preview to place '+names[topic].toLowerCase()+'.');
    const position = event => {
      if (topic!==targetTopic) return;
      const box = placement.getBoundingClientRect(), trim = n => Math.round(Math.max(0,Math.min(1,n))*1000)/1000;
      state.settings.features ||= {};
      state.settings.features[topic] = {...selected(topic),x:trim((event.clientX-box.left)/box.width),y:trim((event.clientY-box.top)/box.height)};
      for (const key of ['x','y']) {
        const input = document.getElementById('sky-'+key); input.value = state.settings.features[topic][key]*100;
        input.closest('label').querySelector('output').textContent = input.value+'%';
      }
      stash();
    };
    placement.onpointerdown=e=>{if(e.button!==0)return;placement.setPointerCapture(e.pointerId);position(e);};
    placement.onpointermove=e=>{if(placement?.hasPointerCapture(e.pointerId))position(e);};
    placement.onpointerup=e=>{position(e);endPlacement();};
    placement.onkeydown=e=>{if(e.key==='Escape')endPlacement();};
    placement.focus();
  }
  function media() {
    if (library) return library;
    const cfg=window.StudioTransferConfig;
    library=SharedStudioMedia.create({url:cfg.url,headers:extra=>({apikey:cfg.key,Authorization:'Bearer '+(StudioJobs.current()?.access_token||cfg.key),...extra})});
    return library;
  }
  function mediaName(url) {
    try {return decodeURIComponent(url.split('/').pop().split('?')[0]);}catch{return 'Selected artwork';}
  }
  function assetControl(root, value, choices, changeAsset, isBackground) {
    root.append(make('h2','Artwork','asset-title'));
    const selection=make('select'); selection.setAttribute('aria-label','Artwork');
    const hasNative=(choices||[]).some(v=>!v.url);
    if(!hasNative) selection.append(option('',isBackground?(scoped?'Inherit background':'Original page background'):'Original artwork'));
    for(const choice of choices||[]) selection.append(option(choice.url||'',choice.label));
    if(value&&!Array.from(selection.options).some(o=>o.value===value)) selection.append(option(value,mediaName(value)));
    selection.value=value||'';
    selection.onchange=()=>{changeAsset(selection.value||undefined);render();};
    const row=make('div',null,'row'); row.append(selection);root.append(row);
    if(value) {
      const img=make('img');img.alt='Selected '+names[topic].toLowerCase()+' artwork';img.src=value;row.prepend(img);
    }
    const subject=topic;
    function allowed(asset) {
      if(!asset || asset.kind!=='image')return false;
      if(window.SleipnirPageSky?.assetURL)return SleipnirPageSky.assetURL(asset.url,isBackground?'background':subject);
      if((choices||[]).some(item=>item.url===asset.url))return true;
      try {
        const u=new URL(asset.url),origin=new URL(window.StudioTransferConfig.url).origin;
        return u.origin===origin && !u.search && !u.hash && /^\/storage\/v1\/object\/public\/(studio|studio-published-media)\/[^?#]+\.(webp|png|jpe?g|avif|gif)$/i.test(u.pathname);
      }catch{return false;}
    }
    function accept(asset) {
      if(subject!==topic)return;
      if(!allowed(asset)){status('Choose a catalog preset or an image from Studio uploads or Studio published media.');return;}
      changeAsset(asset.url);render();
    }
    const choose=button('Choose from Studio',()=>media().open({accept:'image/*',initialSource:'studio',initialPath:'',onSelect:accept}));
    const file=make('input');file.type='file';file.accept='image/png,image/jpeg,image/webp,image/avif,image/gif';file.hidden=true;
    const upload=button('Upload image',()=>file.click());upload.disabled=!state.owner;
    upload.title=state.owner?'Upload an image to Studio':'Connect owner to upload artwork';
    file.onchange=async()=>{
      const image=file.files?.[0];if(!image||!state.owner)return;
      if(!/^image\/(png|jpeg|webp|avif|gif)$/.test(image.type)||!(/\.(png|jpe?g|webp|avif|gif)$/i.test(image.name))){status('Choose a PNG, JPEG, WebP, AVIF or GIF.');return;}
      upload.disabled=true;
      try{status('Uploading artwork…');accept(await media().upload(image));}catch(error){status(error.message);}finally{upload.disabled=false;}
    };
    row.append(choose,upload,file);
  }
  function slider(root,key,label,value,min,max,step=1) {
    const field=make('label',null,'setting'),caption=make('span',label),out=make('output',Math.round(value*100)+'%');
    caption.append(out);const input=make('input');input.type='range';input.min=min;input.max=max;input.step=step;input.value=Math.round(value*100);input.id='sky-'+key;
    input.oninput=()=>{out.textContent=input.value+'%';featureChange(key,Number(input.value)/100);};
    field.append(caption,input);root.append(field);
  }
  function timeEditor(root) {
    const field=make('label',null,'setting');field.append(make('span',topic==='day'?'Day starts at local hour':'Night starts at local hour'));
    const sel=make('select');sel.append(option('',scoped?'Inherit local hour':'Use page clock'));for(let n=0;n<24;n++)sel.append(option(String(n),String(n).padStart(2,'0')+':00'));
    const hour=topic+'_start', url=topic+'_url';sel.value=String(state.settings[hour]??'');
    sel.onchange=()=>change(hour,sel.value===''?undefined:Number(sel.value));field.append(sel);root.append(field);
    const choices=window.SleipnirSkyLayers?.catalog?.backgrounds || [];
    assetControl(root,state.settings[url],choices,value=>change(url,value),true);
  }
  function featureEditor(root) {
    const data=selected(topic),catalog=window.SleipnirSkyLayers.catalog.features[topic];
    const on=make('label',null,'toggle'),enabled=make('input');enabled.type='checkbox';enabled.checked=data.enabled;
    enabled.onchange=()=>featureChange('enabled',enabled.checked);on.append(enabled,document.createTextNode('Show '+names[topic].toLowerCase()+' on this page'));root.append(on);
    const field=make('label',null,'setting');field.append(make('span','Appears during'));const sel=make('select');
    sel.append(option('both','Day and night'),option('day','Day only'),option('night','Night only'));sel.value=data.schedule;
    sel.onchange=()=>featureChange('schedule',sel.value);field.append(sel);root.append(field);
    slider(root,'opacity','Opacity',data.opacity,0,100);slider(root,'scale','Size',data.scale,20,300);
    slider(root,'x','Horizontal position',data.x,0,100);slider(root,'y','Vertical position',data.y,0,100);
    root.append(button('Place on preview',placeOnPreview));
    if(catalog.assets && topic!=='streamers') assetControl(root,data.asset_url,catalog.assets,value=>featureChange('asset_url',value),false);
    if(topic==='streamers') {
      const message=make('p','Shows eligible live streamers while they are broadcasting.','hint');
      message.id='live-streams-status';root.append(message);
    }
    root.append(button(scoped?'Use inherited feature':'Reset this feature',()=>{if(state.settings.features)delete state.settings.features[topic];stash();render();}));
  }
  function render() {
    const root=$('controls');root.replaceChildren();$('heading').textContent=names[topic]||'Sky library';
    if(!topic) {
      const list=make('div',null,'feature-list');
      for(const [key,name] of Object.entries(names)){
        const entry=button(name,()=>focus(key)),d=state.settings.features?.[key];
        const sub=key==='day'||key==='night' ? (state.settings[key+'_url']||state.settings[key+'_start']!=null?'Customized':'Page default') :
          (d?.enabled ? ({both:'Day & night',day:'Day',night:'Night'}[d.schedule]||'On') : 'Off');
        const inherit=scoped && (key==='day'||key==='night' ? !state.settings[key+'_url']&&state.settings[key+'_start']==null : !d);
        const parent=inherited.features?.[key];
        const inheritedState=parent?.enabled ? (parent.schedule==='both'?'Day & night':parent.schedule==='day'?'Day':'Night') : 'Off';
        entry.append(make('small',(inherit ? (key==='day'||key==='night'?'Inherited':'Inherited · '+inheritedState) : sub)+'  ›'));list.append(entry);
      }
      root.append(list);
    } else if(topic==='day'||topic==='night')timeEditor(root);
    else if(window.SleipnirSkyLayers?.catalog?.features?.[topic])featureEditor(root);
    else root.append(make('p','The sky artwork catalog could not load. Reload to retry.','hint'));
    refreshButtons();
  }
  function nativeSend() {
    if(!nativeReady || (target.store && currentMerchant && target.store!==currentMerchant))return;
    nativeFrame.contentWindow.postMessage({channel,type:'page-sky-settings',store_id:storeId,page,target,settings:effective(),sky_override:$('lighting').value},location.origin);
  }
  function updatePreview() {
    nativeSend();
    if(kit?.previewPageSky)kit.previewPageSky(page,effective(),$('lighting').value);
    scheduleDraw();
  }
  function scheduleDraw() {
    nextTime=0;if(!drawId&&!nativeReady&&!document.hidden)drawId=requestAnimationFrame(paint);
  }
  function paint(now) {
    drawId=0;
    if(nativeReady||document.hidden)return;
    if(now>=nextTime){
      nextTime=now+1000/16;const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);
      if(streetPhoto){
        nativeRect=streetPhoto.draw(ctx,w,h,effective(),$('lighting').value,scheduleDraw,phone.clientWidth,phone.clientHeight);
      } else if(liveStage && kit?.previewPageSky)ctx.drawImage(liveStage,0,0,w,h);
      else {
        if(planes?.separated)ctx.drawImage(planes.base,0,0,w,h);
        window.SleipnirSkyLayers?.draw(ctx,effective(),w,h,{lighting:$('lighting').value,onUpdate:scheduleDraw});
        if(planes?.separated)ctx.drawImage(planes.layer,0,0,w,h);
      }
    }
    if(topic==='streamers') {
      const message=$('live-streams-status'),feed=(liveLayers||window.SleipnirSkyLayers)?.status();
      const enabled=effective().features?.streamers?.enabled;
      if(message&&enabled&&feed?.streamers!=='idle') {
        const value=feed?.message||(feed?.count ? feed.count+' live stream'+(feed.count===1?'':'s')+'.' : '');
        if(value&&message.textContent!==value)message.textContent=value;
      }
    }
    if(liveStage||effective().features?.stars?.enabled||effective().features?.streamers?.enabled)drawId=requestAnimationFrame(paint);
  }
  let clockTimer;
  function followLocalClock() {
    clearTimeout(clockTimer);
    if(document.hidden || $('lighting').value!=='local')return;
    clockTimer=setTimeout(()=>{updatePreview();followLocalClock();},60000-Date.now()%60000+25);
  }
  $('lighting').addEventListener('change',followLocalClock);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)updatePreview();followLocalClock();});
  window.addEventListener('pagehide',()=>clearTimeout(clockTimer));
  window.addEventListener('pageshow',followLocalClock);
  followLocalClock();
  function fallback(reason) {
    phone.classList.add('checkered');canvas.hidden=false;
    nativeFrame?.remove();nativeFrame=null;nativeReady=false;
    caption.textContent='Sky layer preview · '+reason;updatePreview();
  }
  async function prepareScene() {
    if(target.part||target.layer||target.aisle){fallback('The selected '+(target.layer?'layer':target.part?'part':'aisle')+' has no independent Studio sky capture.');return;}
    if(page==='ValhallaV2'){
      const requested=params.get('store');
      const row=requested ? await StudioWorkspaceCore.appStoreById(requested) : (await StudioWorkspaceCore.loadAppStores()).find(s=>s.native_renderer==='ValhallaStreet');
      if(!row||row.native_renderer!=='ValhallaStreet')throw Error('No wired Palm Coast storefront was available.');
      storeId=row.id;
      window.ValhallaStorefrontArtwork.open(row).then(photo=>{
        streetPhoto=photo;
        if(!nativeReady){caption.textContent=photo.name+' · Storefront artwork'+(photo.masked?'':' · original sky');phone.classList.remove('checkered');updatePreview();}
      }).catch(()=>{});
      nativeFrame=make('iframe');nativeFrame.title='Palm Coast storefront preview';
      addEventListener('message',event=>{
        const d=event.data;if(event.source!==nativeFrame?.contentWindow||event.origin!==location.origin||d?.channel!==channel||d.store_id!==storeId)return;
        if(d.sky_rect&&typeof d.sky_rect==='object')nativeRect=d.sky_rect;
        if(d.type==='page-sky-unavailable' && nativeReady){
          caption.textContent=(row.name||'Storefront')+' · Original photograph; sky mask unavailable.';
        }
        if(d.type==='error' && !nativeReady && streetPhoto){
          caption.textContent=streetPhoto.name+' · Storefront artwork';
        }
        if(d.type==='ready'&&d.street===true){
          if(!d.page_sky){
            if(streetPhoto)caption.textContent=streetPhoto.name+' · Storefront artwork';
            return;
          }
          currentMerchant=storeId;nativeReady=true;canvas.hidden=true;nativeFrame.style.visibility='visible';phone.classList.remove('checkered');caption.textContent=row.name+' · Palm Coast storefront';nativeSend();}
        if(d.type==='street-stop'&&d.label&&nativeReady){
          const changed=currentMerchant!==d.merchant_id;
          currentMerchant=d.merchant_id||null;
          caption.textContent=d.label+' · Palm Coast storefront'+(target.store&&target.store!==currentMerchant?' · outside selected store':'');
          if(changed && target.store===currentMerchant)nativeSend();
        }
      });
      nativeFrame.onload=()=>nativeFrame?.contentWindow.postMessage({channel,type:'hello'},location.origin);
      nativeFrame.src='native-valhalla/index.html?'+new URLSearchParams({store:storeId,street:'1',v:'street-sky-1'});
      nativeFrame.style.cssText='position:absolute;inset:0;visibility:hidden';phone.append(nativeFrame);
      phone.classList.add('checkered');caption.textContent='Loading '+row.name+' · showing sky layer meanwhile.';updatePreview();
      return;
    }
    const id=views[page];
    if(!id){fallback('No Studio scene for '+page+'.');return;}
    const frame=make('iframe');frame.className='capture';frame.title='Studio scene capture';frame.tabIndex=-1;frame.inert=true;frame.setAttribute('allow',"camera 'none'; microphone 'none'");
    frame.src='sleipnir-studio-1120.html?transition-frame=1&sky-editor-frame=1#'+id;document.body.append(frame);
    const stop=performance.now()+30000;while(!frame.contentWindow?.StudioKit?.ready&&performance.now()<stop)await new Promise(r=>setTimeout(r,75));
    kit=frame.contentWindow?.StudioKit;if(!kit)throw Error('The Studio scene is unavailable.');
    await kit.ready;if(kit.cur?.id!==id)await kit.show(id,{fromPop:true});
    liveStage=frame.contentDocument.getElementById('stage');liveLayers=frame.contentWindow.SleipnirSkyLayers;
    if(!kit.previewPageSky){
      for(let n=0;n<100;n++)kit.cur.update(1/30,frame.contentWindow.performance.now()+n*33);
      planes=kit.captureTransitionScreen(id);if(!planes?.separated)throw Error('This scene has no independent sky layer.');
      kit.previewCovered=true;
    }
    caption.textContent=$('page-name').textContent+' · Studio scene';phone.classList.remove('checkered');updatePreview();
  }
  async function open() {
    const record=deviceRecord();
    const inventory=await fetch('original-page-inventory.json').then(r=>{if(!r.ok)throw Error('Could not verify the app page.');return r.json();});
    if(scoped && typeof window.SleipnirPageSky?.resolve!=='function')throw Error('The target-specific sky controls could not load. Reload to retry.');
    const group=params.get('sourceGroup'),item=params.get('sourceItem');
    const studioTarget=params.get('previewSource')==='studio-only' && group && item &&
      page==='Studio_'+group+'_'+item.replaceAll('-','_') &&
      StudioWorkspaceCore.GROUPS.some(g=>g.id===group && g.pages.some(p=>p[0]===item));
    state.valid=Boolean(studioTarget||Object.hasOwn(views,page)||inventory.pages.some(p=>p.name===page));
    if(!state.valid)throw Error('This page is outside the app page list.');
    if(record){state.settings=copy(record.settings);state.base=copy(record.base);state.dirty=!same(state.settings,state.base);}
    render();prepareScene().catch(e=>fallback(e.message));updatePreview();
    try {
      const parentTarget={...target};
      delete parentTarget[Object.keys(parentTarget).at(-1)];
      const [saved,parent]=await Promise.all([SleipnirPageSky.read(page,target),
        scoped ? SleipnirPageSky.resolve(page,parentTarget) : null]);
      if(parent)inherited=copy(parent.settings||defaults());
      if(!state.dirty){state.settings=copy(saved.settings||defaults());state.base=copy(state.settings);}
      state.publishedRevision=saved.publishedRevision??saved.revision;state.publishedSettings=copy(saved.settings);
      status(state.dirty?'Device draft restored.':'Published sky settings loaded.');
    } catch(e){status(state.dirty?'Device draft restored. Shared settings unavailable.':'Editing a device preview. Shared settings unavailable.');}
    finally {loading=false;render();updatePreview();}
  }
  function useOwnerDraft(remote,keep) {
    state.owner=true;state.revision=remote.revision;
    if(state.publishedRevision!==remote.publishedRevision)state.publishedSettings=null;
    state.publishedRevision=remote.publishedRevision;
    state.base=copy(remote.settings||defaults());if(!keep)state.settings=copy(state.base);
    state.conflict=null;stash();render();status(state.dirty?'Owner connected. Device edits ready to save.':'Owner draft loaded.');
  }
  $('use-local').onclick=()=>useOwnerDraft(state.conflict,true);
  $('use-remote').onclick=()=>useOwnerDraft(state.conflict,false);
  async function work(job) {
    if(state.busy)return;state.busy=true;refreshButtons();
    try{await job();}catch(e){status(e.message||'The request failed.');}
    finally{state.busy=false;refreshButtons();}
  }
  $('connect').onclick=()=>work(async()=>{
    if(!StudioJobs.current())await StudioJobs.connect();
    const [remote,released]=await Promise.all([SleipnirPageSky.draft(page,target),SleipnirPageSky.read(page,target)]);
    state.publishedSettings=copy(released.settings);state.publishedRevision=released.publishedRevision;
    if(state.dirty&&!same(state.base,remote.settings)&&!same(state.settings,remote.settings)) {
      state.conflict=remote;status('Choose the draft to continue editing.');
    } else useOwnerDraft(remote,state.dirty);
  });
  $('save').onclick=()=>work(async()=>{
    if(!state.owner||!state.dirty)return;
    const s=state.settings;
    if(s.day_start!=null&&s.day_start===s.night_start)throw Error('Choose different hours for day and night.');
    const saved=await SleipnirPageSky.save(page,copy(s),state.revision,target);
    useOwnerDraft(saved,false);status('Owner draft saved.');
  });
  $('publish').onclick=()=>work(async()=>{
    if(!state.owner||state.dirty||!differsFromPublished())return;
    if(!window.confirm('Publish the saved sky for '+page+' to shoppers?'))return;
    const saved=await SleipnirPageSky.publish(page,state.revision,state.publishedRevision,target);
    state.publishedRevision=saved.publishedRevision??saved.revision;state.publishedSettings=copy(saved.settings);status('Published the sky for '+page+'.');
  });
  render();open().catch(e=>{loading=false;status(e.message);refreshButtons();});
})();
