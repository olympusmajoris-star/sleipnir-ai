(function () {
  'use strict';

  const start = new URLSearchParams(location.search);
  const store = (start.get('store') || '').trim().toLowerCase();
  const channel = 'sleipnir-aisle-editor-v1';
  const requestedAuthored = start.has('authored') ? (start.get('authored') || '').trim().toLowerCase() : null;
  const authoredFeature = 'preview-authored-aisle';
  const dgRenderer = 'dg-shelves-20261125-3';
  const dgBuild = {capabilities:[authoredFeature],aisleRouting:{otherStores:'catalog',standard:[]}};
  const requestedAisle = (start.get('aisle') || '').trim().slice(0,140);
  const hashPattern = /^[0-9a-f]{64}$/;
  const idPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
  const manifestURL = new URL('aisle-preview/manifest.json', location.href);
  const previewRoot = new URL('./', manifestURL);
  const privateOrigin = 'http://127.0.0.1:48180';
  const versionsPath = '/rest/v1/studio_grocery_dart_versions';
  const versionFields = 'id,sha256,filename,byte_size,created_at,preview_url,preview_sha256,preview_status';
  const jobs = window.StudioJobs;
  const el = id => document.getElementById(id);
  const row = value => Array.isArray(value) ? value[0] : value;
  const message = (id, value) => { el(id).textContent = value || ''; };
  const make = (tag, value) => {
    const node = document.createElement(tag);
    if (value !== undefined) node.textContent = value;
    return node;
  };
  const failText = err => err && err.message ? err.message : 'Request failed. Please try again.';
  const rpc = (name, body, auth = true) => jobs.request('/rest/v1/rpc/' + name, { method: 'POST', body, auth });
  const fresh = { 'Cache-Control':'no-cache, no-store' };
  const request = (path, params, auth = true) => jobs.request('/rest/v1/' + path + '?' + new URLSearchParams(params), {auth,headers:fresh});
  const percentage = n => Math.round(n * 100) + '%';
  const number = x => typeof x === 'number' && Number.isFinite(x);
  const round = x => Math.round(x * 100) / 100;
  const state = {
    hosted: new Map(), versions: new Map(), local: new Map(), saved: new Map(), drafts: new Map(),
    notes: new Map(), productNames: new Map(), defaultSha: '', selectedSha: '', selected: null, aisle: requestedAisle,
    authoredId:requestedAuthored, authoredRows:new Map(), mode:'', catalog:[], stockedShelves:[], breadAlias:false, storeReady:false, catalogReady:false,
    editing: true, owner: false, authPending: false, uploading: false, building: false, previewURL: null,
    ready: false, readOnly: false, frameSequence: 0, selectionSequence: 0, versionSequence: 0, flagSequence: 0,
    saveBusy: new Set(), flagBusy: new Set(), flags: [], sourceFile: null, frameTimer: null,
    dgView: null, dgShopping: null
  };
  window.StudioSelectionTarget=()=>window.ShelfLayoutWorkspace?.toolTarget?.()||(!state.storeReady?null:{
    page:'GroceryAislePage',item:'grocery',store,aisle:state.authoredId?'studio:'+state.authoredId:state.aisle,
    part:state.selected?.id||'',label:state.selected?.name||state.aisle,
    parts:state.selected?[{id:state.selected.id,label:state.selected.name}]:[]
  });
  function openLayout(group, anchorId, saved, shopping = false) {
    if (!state.storeReady || !state.catalogReady || (!state.authoredId && !state.stockedShelves.includes(state.aisle))) return;
    window.ShelfLayoutWorkspace.open({
      store, aisle: state.aisle, authoredId: state.authoredId, mode:state.mode, group, anchorId, saved,
      onShopProduct: shopping ? openCompiledShopping : null,
      getScales: () => ({
        ...Object.fromEntries([...state.saved].filter(([,r])=>r.revision>0).map(([id,r])=>[id,r.scale])),
        ...Object.fromEntries(state.drafts)
      }),
      getScaleData: () => state.scaleLoad,
      async authorize() {
        if (!state.owner || !jobs?.current()) await connectOwner(true);
        if (!state.owner || !jobs?.current()) throw Error(el('editor-status').textContent || 'Connect the owner account to save.');
      }
    });
  }
  function maybeOpenLayout() {
    const key = state.authoredId ? 'studio:'+state.authoredId : state.aisle;
    const group = start.get('group') || '';
    if (start.get('layout') === '1') { openLayout(group); return; }
    if (start.get('layout') === '0') return;
    // DG's main shelf now honors the saved layout directly; no modal is needed on arrival.
    if (state.selectedSha === dgRenderer) return;
    const activity = window.ShelfLayoutWorkspace?.activity;
    window.ShelfLayoutStore?.load(store,key).then(saved => {
      if (saved.layout && window.ShelfLayoutWorkspace.activity === activity && key === (state.authoredId ? 'studio:'+state.authoredId : state.aisle) && !state.selected) openLayout('',null,saved);
    }).catch(() => {});
  }
  function currentVersion() { return state.versions.get(state.selectedSha); }
  function setNotice(text) { message('editor-status', text); }
  function scaleMap() {
    const current = {};
    for (const [id, record] of state.saved) current[id] = record.scale;
    for (const [id, scale] of state.drafts) current[id] = scale;
    return current;
  }
  function send(type, data = {}) {
    if (state.dgView) {
      state.dgView.command(type,type==='sync'?{...data,draftScales:Object.fromEntries(state.drafts)}:data);
      return;
    }
    if (!state.ready || !state.previewURL) return;
    el('editor-frame').contentWindow.postMessage({channel, type, ...data}, state.previewURL.origin);
  }
  function previewRoute() {
    const src = new URL(state.previewURL);
    src.searchParams.set('store',store);
    if (state.authoredId) src.searchParams.set('authored',state.authoredId);
    else src.searchParams.set('aisle',state.aisle);
    return src;
  }
  async function previewShopping() {
    if (state.dgView) { openDollarGeneralShopping(); return; }
    if (!state.ready || state.readOnly || !state.previewURL) return;
    const sha = state.selectedSha, key = state.authoredId ? 'studio:'+state.authoredId : state.aisle;
    if (sha === state.defaultSha && state.hosted.get(sha)?.capabilities?.includes('focus-product')) {
      let saved;
      try { saved = await window.ShelfLayoutStore.load(store,key); }
      catch { setNotice('Could not load the saved shelf layout. Opening the compiled aisle.'); }
      if (state.selectedSha !== sha || key !== (state.authoredId ? 'studio:'+state.authoredId : state.aisle)) return;
      if (saved?.layout) { openLayout('',state.selected?.id,saved,true); return; }
    }
    openCompiledShopping();
  }
  function openCompiledShopping(productId) {
    if (state.dgView) { openDollarGeneralShopping(productId); return; }
    const dialog = el('shopping-preview');
    if (!state.ready || state.readOnly || !state.previewURL || dialog.open) return;
    const url = previewRoute(), sha = state.selectedSha, frame = make('iframe');
    const aisle = state.authoredId ? 'studio:'+state.authoredId : state.aisle;
    message('close-shopping',productId ? 'Back to shelves' : 'Back to editing');
    frame.id = 'shopping-frame';
    frame.title = 'Shop this aisle';
    frame.setAttribute('sandbox','allow-scripts allow-same-origin');
    frame.referrerPolicy = 'no-referrer';
    frame.inert = true;
    const post = (type, data = {}) => frame.contentWindow.postMessage({channel,type,...data},url.origin);
    const receive = event => {
      const data = event.data;
      if (!dialog.open || event.source !== frame.contentWindow || event.origin !== url.origin ||
          !data || data.channel !== channel || data.store_id !== store || data.sourceSha256 !== sha) return;
      if (data.type === 'error') {
        clearTimeout(timer);
        message('shopping-status',String(data.message || 'The shopping preview could not open.').slice(0,350));
      } else if (data.type === 'ready' && frame.inert) {
        clearTimeout(timer);
        post('set-mode',{mode:'shop'});
        post('sync',{scales:scaleMap()});
        if (productId) post('focus-product',{product_id:productId,aisle});
        frame.inert = false;
        message('shopping-status','');
      }
    };
    const timer = setTimeout(()=>message('shopping-status','The shopping preview is taking longer to open.'),25000);
    window.addEventListener('message',receive);
    dialog.addEventListener('close',()=>{
      clearTimeout(timer);
      window.removeEventListener('message',receive);
      frame.remove();
    },{once:true});
    frame.addEventListener('load',()=>{if(dialog.open)post('hello');},{once:true});
    frame.src = url.href;
    message('shopping-status','Opening shopping preview…');
    dialog.append(frame);
    dialog.showModal();
  }
  function setOptions(select, entries, chosen) {
    select.replaceChildren(...entries.map(([value, label]) => {
      const option = make('option', label);
      option.value = value;
      return option;
    }));
    select.value = chosen;
  }
  function availableShelves(build) {
    const rules = build?.aisleRouting;
    if (!rules) return Array.from(new Set([...state.catalog,...(state.breadAlias ? ['Bread & Rolls'] : [])]));
    const standard = new Set(rules.standard || []);
    const dynamic = state.mode !== 'publix' && (rules.otherStores === 'catalog' ||
      (rules.dynamicStoreIds || []).includes(store) || (rules.dollarGeneralByName && state.mode === 'dollar-general'));
    const groups = state.catalog.filter(name => dynamic || standard.has(name));
    if (state.breadAlias && state.mode !== 'dollar-general' && (dynamic || standard.has('Bread & Rolls'))) groups.push('Bread & Rolls');
    return Array.from(new Set(groups)).sort((a,b) => a.localeCompare(b));
  }
  const authoredRow = () => state.authoredRows.get(state.authoredId);
  function hasAuthored(build) { return build?.capabilities?.includes(authoredFeature) === true; }
  async function loadPublishedAisles() {
    let rows;
    try { rows = await rpc('studio_grocery_aisles',{p_store_id:store},false); }
    catch (error) { if (state.authoredId !== null) throw error; return; }
    const authorized=new Map();
    for(const r of Array.isArray(rows)?rows:[]) {
      if(r?.store_id!==store||!idPattern.test(r.aisle_id||'')||(typeof r.title!=='string'||!r.title.trim())||
          !Number.isInteger(r.published_revision)||r.published_revision<1||
          !['native','custom'].includes(r.stock_mode)||!Array.isArray(r.product_ids)||
          !r.product_ids.every(id=>typeof id==='string'&&idPattern.test(id))||
          new Set(r.product_ids).size!==r.product_ids.length)continue;
      authorized.set(r.aisle_id,{...r,title:r.title.trim()});
    }
    state.authoredRows=authorized;
    if(state.authoredId!==null) {
      const r=authoredRow();
      if(!r)throw Error('This published aisle is unavailable for the selected store.');
      state.aisle=r.title;
      if(r.stock_mode==='native') {
        if(!r.source_aisle?.trim())throw Error('The published aisle has no native source.');
        state.authoredId=null;state.aisle=r.source_aisle;writeAisleRoute();
      }
    }
  }
  function writeAisleRoute(){
    const url=new URL(location.href);url.searchParams.set('store',store);
    if(state.authoredId){url.searchParams.set('authored',state.authoredId);url.searchParams.delete('aisle');}
    else{url.searchParams.delete('authored');url.searchParams.set('aisle',state.aisle);}
    try{history.replaceState(null,'',url);}catch(_){}
  }
  function chooseShelves(build) {
    const groups = state.stockedShelves = availableShelves(build);
    const preferred = state.mode === 'target' ? 'Canned Goods & Soups' : 'Snacks';
    if (!state.aisle) state.aisle = groups.includes(preferred) ? preferred : groups[0] || '';
    const authored=authoredRow();
    const back=new URL('grocery-entrance.html',location.href);
    back.searchParams.set('store',store);
    if(authored)back.searchParams.set('door',authored.source_aisle||'studio:'+authored.aisle_id);
    else if(state.aisle)back.searchParams.set('door',state.aisle);
    el('store-back').href=back.href;
    const supported = state.authoredId!==null ? Boolean(authored&&hasAuthored(build)) : groups.includes(state.aisle);
    const options = groups.map(g => [g,g]);
    for(const r of state.authoredRows.values())if(r.stock_mode==='custom'&&(hasAuthored(build)||r.aisle_id===state.authoredId))options.push(['studio:'+r.aisle_id,r.title+' · published aisle']);
    if (!supported) options.unshift(['',groups.length ? 'Choose an available aisle' : 'No stocked aisles']);
    setOptions(el('department'),options,authored?'studio:'+authored.aisle_id:supported?state.aisle:'');
    el('department').disabled = !options.some(entry=>entry[0]);
    return supported;
  }
  function getVersionLabel(v) {
    if (v.nativeShelf) return v.label;
    const label = v.label || v.filename || 'GroceryAisle.dart';
    return label + ' · ' + v.sha256.slice(0,8);
  }
  function showVersions() {
    const list = Array.from(state.versions.values());
    list.sort((a,b) => (b.created_at || '').localeCompare(a.created_at || '') || getVersionLabel(a).localeCompare(getVersionLabel(b)));
    setOptions(el('version-list'), list.map(v => [v.sha256,getVersionLabel(v)]), state.selectedSha);
    el('version-list').disabled = !list.length;
  }
  async function loadManifest() {
    const response = await fetch(manifestURL, {cache:'no-store', credentials:'omit'});
    if (!response.ok) throw Error('The compiled preview registry is unavailable.');
    const manifest = await response.json();
    const latest = new Map();
    let preferred = '';
    for (const [digest, item] of Object.entries(manifest.versions || {})) {
      if (!hashPattern.test(digest) || !item || typeof item.path !== 'string' ||
          !hashPattern.test(item.artifactSha256 || '')) continue;
      const url = new URL(item.path, previewRoot);
      const expected = new URL(digest + '/index.html', previewRoot);
      if (url.href !== expected.href) continue;
      const version = {sha256:digest, filename:item.filename, label:item.label,buildFlavor:item.buildFlavor,
        artifactSha256:item.artifactSha256, capabilities:Array.isArray(item.capabilities)?item.capabilities:[], url, readOnly:!!item.readOnly,aisleRouting:item.aisleRouting || null};
      latest.set(digest, version);
      if (item.default === true) preferred = digest;
    }
    if (latest.has(manifest.defaultSourceSha256)) preferred = manifest.defaultSourceSha256;
    for (const sha of state.hosted.keys()) if (!latest.has(sha) && !state.versions.get(sha)?.id) state.versions.delete(sha);
    state.hosted = latest;
    for (const [sha,v] of latest) state.versions.set(sha,{...state.versions.get(sha),...v});
    state.defaultSha = preferred || latest.keys().next().value || '';
    if (!state.defaultSha) throw Error('No verified compiled Dart version is available.');
  }
  async function loadVersions() {
    if (!state.owner) return;
    const size = 250;
    let offset = 0;
    while (true) {
      const result = await jobs.request(versionsPath + '?' + new URLSearchParams({select:versionFields,order:'created_at.desc,id.asc',limit:size,offset}),{headers:fresh});
      for (const v of result || []) {
        if (!hashPattern.test(v.sha256)) continue;
        state.versions.set(v.sha256, {...v,...state.hosted.get(v.sha256)});
      }
      if (!Array.isArray(result) || result.length < size) break;
      offset += size;
    }
    showVersions();
  }
  async function loadAisles() {
    const result = state.mode === 'target' ? await rpc('target_catalog_categories', {}, false) :
      await rpc('studio_product_categories',{p_store_id:store},false);
    const categories = new Set(result.filter(r => Number(r.product_count) > 0 && typeof r.category === 'string' && r.category.trim()).map(r => r.category));
    if (categories.has('Uncategorized')) {
      const found = await request('products',{select:'id',store_id:'eq.'+store,category:'eq.Uncategorized',limit:1},false);
      if (!found?.length) categories.delete('Uncategorized');
    }
    let breadAlias = false;
    if (!['target','dollar-general'].includes(state.mode) && categories.has('Bakery')) {
      const bread = await request('products',{select:'id',store_id:'eq.' + store,category:'eq.Bakery',shelf_group:'eq.Bread & Rolls',limit:1},false);
      breadAlias = !!bread?.length;
      // This native route selects Bakery + shelf_group even when a direct category shares its name.
      if (!breadAlias) categories.delete('Bread & Rolls');
    }
    state.catalog = [...categories].sort((a,b) => a.localeCompare(b));
    state.breadAlias = breadAlias;
    state.catalogReady = true;
  }
  async function loadScales() {
    const limit = 500;
    let offset = 0;
    while (true) {
      const result = await request('studio_grocery_product_scales',
        {select:'store_id,product_id,scale,revision',store_id:'eq.' + store,order:'product_id',limit,offset},false);
      for (const r of result || []) acceptScale(r);
      if (!Array.isArray(result) || result.length < limit) break;
      offset += limit;
    }
    send('sync', {scales:scaleMap()});
    updateControls();
  }
  function acceptScale(r) {
    if (!r || r.store_id !== store || !idPattern.test(r.product_id || '') || !number(Number(r.scale)) || !Number.isInteger(Number(r.revision))) return;
    const current = state.saved.get(r.product_id);
    if (!current || Number(r.revision) >= current.revision) state.saved.set(r.product_id,{scale:Number(r.scale),revision:Number(r.revision)});
  }
  async function loadSkuScale(id) {
    const rows = await request('studio_grocery_product_scales', {select:'store_id,product_id,scale,revision',store_id:'eq.' + store,product_id:'eq.' + id,limit:1},false);
    const latest = row(rows);
    if (latest && (latest.store_id !== store || latest.product_id !== id)) throw Error('Scale does not match this store product.');
    if (latest) acceptScale(latest);
    else if (!state.saved.has(id)) state.saved.set(id,{scale:1,revision:0});
  }
  async function refreshFlags() {
    const seq = ++state.flagSequence;
    if (!state.owner) return;
    const limit = 200, flags = [], fields = 'id,store_id,product_id,aisle,version,page_key,note,status,created_at,updated_at';
    let offset = 0;
    do {
      const rows = await request('studio_grocery_product_flags',{select:fields,store_id:'eq.' + store,order:'created_at.desc,id.asc',limit,offset});
      if (seq !== state.flagSequence) return;
      flags.push(...rows.filter(flag => flag.store_id === store && idPattern.test(flag.product_id)));
      if (rows.length < limit) break;
      offset += limit;
    } while (true);
    state.flags = flags;
    drawFlags();
    // Supply readable identities even after reopening an old review session.
    const missing = [...new Set(flags.map(f => f.product_id).filter(id => idPattern.test(id) && !state.productNames.has(id)))];
    for (let i = 0; i < missing.length; i += 50) {
      const group = missing.slice(i,i + 50);
      const rows = await request('products', {select:'id,name',store_id:'eq.' + store,id:'in.(' + group.join(',') + ')'}, false);
      if (seq !== state.flagSequence) return;
      for (const p of rows) state.productNames.set(p.id, p.name);
    }
    if (missing.length) drawFlags();
  }
  function drawFlags() {
    const list = el('repair-list');
    list.replaceChildren();
    message('repair-count', state.owner ? '(' + state.flags.length + ')' : '');
    if (!state.owner || !state.flags.length) {
      list.append(make('li', state.owner ? 'No repair flags for this store.' : 'Connect the owner account to view flagged products.'));
      return;
    }
    for (const f of state.flags) {
      const li = make('li'), link = make('button',state.productNames.get(f.product_id) || 'View product ' + f.product_id.slice(0,8));
      link.type = 'button';
      link.disabled = !state.ready;
      link.addEventListener('click', () => {
        const dest = state.versions.has(f.version) ? f.version : state.selectedSha;
        state.focus = {product_id:f.product_id, aisle:f.aisle, pageKey:f.page_key};
        if (dest !== state.selectedSha) selectVersion(dest);
        else navigateToFlag();
      });
      li.append(link,make('span',f.aisle + ' · ' + (f.status || 'open')),make('p',f.note));
      list.append(li);
    }
  }
  function navigateToFlag() {
    if (!state.focus || !state.ready) return;
    const {product_id,aisle,pageKey} = state.focus;
    const key = typeof pageKey==='string' && /^studio:([a-f0-9-]+)\/page\/(\d+)\/slot\/(\d+)$/i.exec(pageKey);
    const r=key && state.authoredRows.get(key[1]);
      if(key ? (!r || !hasAuthored(state.selectedSha===dgRenderer?dgBuild:state.hosted.get(state.selectedSha)||state.local.get(state.selectedSha)) ||
        r.product_ids[(Number(key[2])-1)*12+Number(key[3])-1]!==product_id) : !state.stockedShelves.includes(aisle)){
      state.focus=null;setNotice('This flagged aisle is unavailable in the selected version.');return;
    }
    const target=r?'studio:'+r.aisle_id:aisle;
    if(state.authoredId!==(r?.aisle_id??null)){changeAisle(target);return;}
    state.focus=null;
    if(!r && state.aisle!==aisle)changeAisle(aisle);
    send('focus-product',{product_id,aisle:r?target:aisle});
  }
  async function connectOwner(interactive) {
    if (!state.storeReady || state.authPending) return;
    state.authPending = true;
    updateControls();
    try {
      if (!jobs) throw Error('Workshop owner connection is unavailable.');
      if (!jobs.current()) {
        if (!interactive) return;
        await jobs.connect();
      }
      const ok = await rpc('studio_grocery_editor_access',{});
      if (ok !== true && row(ok) !== true) throw Error('This account does not have aisle editing access.');
      state.owner = true;
      setNotice('');
      await Promise.allSettled([loadVersions(), refreshFlags()]).then(results => {
        for (const result of results) if (result.status === 'rejected') setNotice(failText(result.reason));
      });
    } catch (err) { state.owner = false; setNotice(failText(err)); }
    finally { state.authPending = false; updateControls(); }
  }
  function versionStatus() {
    const v = currentVersion();
    if (v?.nativeShelf) return 'Live catalog shelves · changes appear immediately in the preview.';
    const local = state.local.has(state.selectedSha);
    const compiled = state.hosted.has(state.selectedSha) || local;
    if (!v) return 'No Dart version loaded.';
    if (compiled) return (local ? 'Private compiled preview' : v.buildFlavor === 'original-with-studio-adapter' ? 'Compiled original with Studio selection adapter' : 'Compiled Flutter preview') + ' · SHA-256 ' + v.sha256;
    return 'Source saved · No compiled preview for SHA-256 ' + v.sha256;
  }
  function clearSelection() {
    state.selected = null;
    ++state.selectionSequence;
    el('repair-note').value = '';
    el('product-detail').replaceChildren(make('p', state.editing ? 'Click a product on the shelf to resize it.' : 'This Dart version supports shopping only.'));
    updateControls();
  }
  function selectDollarGeneralVersion() {
    ++state.versionSequence;
    const serial=++state.frameSequence;
    state.dgView?.destroy();state.dgView=null;
    state.selectedSha=dgRenderer;
    state.ready=false;state.readOnly=false;state.editing=true;state.previewURL=null;
    clearTimeout(state.frameTimer);
    const supported=chooseShelves(dgBuild);
    clearSelection();showVersions();
    const old=el('editor-frame'),frame=old.cloneNode(false);
    frame.removeAttribute('src');frame.hidden=true;old.replaceWith(frame);
    const host=el('dg-aisle-view');
    host.hidden=!supported;
    el('preview-host').classList.add('dg-preview-host');
    el('frame-status').hidden=false;
    message('version-status',versionStatus());
    if(!supported){message('frame-status','Choose a stocked aisle.');updateControls();return;}
    message('frame-status','Loading shelf products…');
    try {
      const view=window.DollarGeneralShelf.mount(host,{
        store,aisle:state.aisle,authoredId:state.authoredId,mode:state.mode,scales:scaleMap(),draftScales:Object.fromEntries(state.drafts),shopping:false,
        onReady:()=>{
          if(serial!==state.frameSequence || !state.dgView)return;
          state.ready=true;el('frame-status').hidden=true;
          updateControls();drawFlags();
        },
        onSelect:data=>{if(serial===state.frameSequence)selectProduct(data);},
        onDeselect:()=>{if(serial===state.frameSequence)clearSelection();},
        onStatus:text=>{if(serial===state.frameSequence)setNotice(text);}
      });
      state.dgView=view;
      view.ready.then(()=>{
        if(serial!==state.frameSequence || state.dgView!==view)return;
        state.ready=true;el('frame-status').hidden=true;
        send('sync',{scales:scaleMap()});
        updateControls();drawFlags();navigateToFlag();
        if(start.get('product'))send('focus-product',{product_id:start.get('product')});
      }).catch(error=>{
        if(serial!==state.frameSequence)return;
        state.ready=false;el('frame-status').hidden=false;
        message('frame-status',failText(error));updateControls();
      });
    } catch(error){message('frame-status',failText(error));}
    updateControls();
  }
  function openDollarGeneralShopping(productId) {
    const dialog=el('shopping-preview');
    if(!state.ready || dialog.open || !state.dgView)return;
    const host=make('div');host.id='dg-shopping-view';
    message('close-shopping','Back to editing');message('shopping-status','');
    dialog.append(host);
    const view=window.DollarGeneralShelf.mount(host,{
      store,aisle:state.aisle,authoredId:state.authoredId,mode:state.mode,scales:scaleMap(),draftScales:Object.fromEntries(state.drafts),shopping:true,
      onStatus:text=>{if(dialog.open)message('shopping-status',text);}
    });
    state.dgShopping=view;
    dialog.addEventListener('close',()=>{
      view.destroy();host.remove();
      if(state.dgShopping===view)state.dgShopping=null;
    },{once:true});
    dialog.showModal();
    view.ready.then(()=>{if(dialog.open&&productId)view.command('focus-product',{product_id:productId});})
      .catch(error=>{if(dialog.open)message('shopping-status',failText(error));});
  }
  function selectVersion(digest) {
    if (digest === dgRenderer && state.mode === 'dollar-general') { selectDollarGeneralVersion(); return; }
    state.dgView?.destroy(); state.dgView=null;
    el('dg-aisle-view').hidden=true;
    el('preview-host').classList.remove('dg-preview-host');
    ++state.versionSequence;
    state.selectedSha = state.versions.has(digest) ? digest : '';
    const v = currentVersion(), build = state.hosted.get(digest) || state.local.get(digest);
    const serial = ++state.frameSequence;
    state.ready = false;
    const editableIds = build?.aisleRouting?.editableStoreIds;
    state.readOnly = !!build?.readOnly || Array.isArray(editableIds) && !editableIds.includes(store);
    state.editing = !state.readOnly;
    const supported = chooseShelves(build);
    state.previewURL = supported && build ? build.url : null;
    clearTimeout(state.frameTimer);
    clearSelection();
    showVersions();
    const old = el('editor-frame');
    const frame = old.cloneNode(false);
    frame.removeAttribute('src');
    old.replaceWith(frame);
    frame.hidden = !state.previewURL;
    el('frame-status').hidden = false;
    message('version-status', versionStatus() + (state.readOnly ? ' · Shopping preview only for this store.' : ''));
    if (state.previewURL) {
      message('frame-status','Starting the compiled Flutter preview…');
      const src = previewRoute();
      frame.addEventListener('load',() => {
        if (state.frameSequence === serial)
          frame.contentWindow.postMessage({channel,type:'hello'},build.url.origin);
      },{once:true});
      frame.src = src.href;
      state.frameTimer = setTimeout(() => {
        if (state.frameSequence === serial && !state.ready)
          message('frame-status','The compiled preview has not connected. Reload this version to retry.');
      }, 25000);
    } else {
      const text = state.authoredId && !hasAuthored(build) ? 'This Dart version does not support published aisles. Select a compatible compiled version or return to the store entrance.' : !supported && state.catalogReady ?
        (state.stockedShelves.length ? 'This aisle is unavailable in the selected version. Choose another aisle or return to the store entrance.' : 'This store has no stocked aisles available in the selected version.') :
        v ? 'This Dart version needs a compiled preview.' : 'A verified Flutter preview is unavailable.';
      message('frame-status',text);
    }
    drawFlags();
    updateControls();
  }
  function changeAisle(aisle) {
    const authored=aisle.startsWith('studio:') ? state.authoredRows.get(aisle.slice(7)) : null;
    if(authored ? authored.stock_mode!=='custom' : !state.stockedShelves.includes(aisle))return;
    const oldAuthored=state.authoredId;
    state.authoredId=authored?.aisle_id??null;
    state.aisle=authored?.title??aisle;
    el('department').value=aisle;
    writeAisleRoute();
    clearSelection();
    if (state.selectedSha === dgRenderer) { selectDollarGeneralVersion(); return; }
    if ((oldAuthored!==state.authoredId || !state.previewURL) && state.selectedSha)selectVersion(state.selectedSha);
    else if(!state.authoredId)send('set-aisle',{aisle});
  }
  function currentScale() {
    const p = state.selected;
    return p ? state.drafts.get(p.id) ?? (state.dgView?p.initial:state.saved.get(p.id)?.scale ?? p.initial) : 1;
  }
  function updateControls() {
    const p = state.selected, scale = currentScale();
    const valid = !!(state.ready && state.editing && !state.readOnly && p?.verified);
    const scalable = valid && p.scalable;
    const saving = !!p && state.saveBusy.has(p.id);
    const signed = state.owner && !!jobs?.current();
    el('open-layout').disabled = !state.storeReady || !state.catalogReady || (!state.authoredId && !state.stockedShelves.includes(state.aisle));
    el('enlarge-layout').hidden = !p?.verified;
    el('phone-size-tools').hidden = !p;
    message('phone-size-product',p?.name);
    el('scale-range').setAttribute('aria-valuetext',percentage(scale));
    el('inspect-selected').hidden = !p;
    el('return-preview').hidden = !p;
    if (p) message('inspect-selected','Edit ' + p.name);
    el('connect-owner').textContent = state.authPending ? 'Connecting…' : signed ? 'Owner connected' : 'Connect owner';
    el('connect-owner').disabled = !state.storeReady || state.authPending || signed;
    for (const id of ['aisle-search','search-go','prev-panel','next-panel']) el(id).disabled = !state.ready;
    el('mode-toggle').disabled = !state.ready || state.readOnly;
    el('mode-toggle').textContent = state.readOnly ? 'Shopping only' : 'Preview shopping';
    el('scale-range').min = p?.min ?? 0.5;
    el('scale-range').max = p?.max ?? 1.5;
    el('scale-range').value = scale;
    el('scale-range').disabled = !scalable;
    el('scale-minus').disabled = !scalable || scale <= p.min;
    const needsRoom = scalable && scale >= p.max;
    el('scale-plus').disabled = !scalable;
    el('scale-plus').textContent = needsRoom ? 'More room' : '+10%';
    el('scale-plus').setAttribute('aria-label',needsRoom ? 'Make more room in the aisle organizer' : 'Make product larger by 10 percentage points');
    el('scale-reset').disabled = !scalable || scale === 1 || !p || p.min > 1 || p.max < 1;
    message('scale-value',p ? percentage(scale) : '—');
    const dirty = Boolean(p && state.drafts.has(p.id));
    el('save-scale').disabled = !scalable || !dirty || saving || state.authPending;
    el('save-scale').textContent = saving ? 'Saving…' : dirty && !signed ? 'Connect to save size' : 'Save size';
    el('repair-note').disabled = !valid;
    el('flag-product').disabled = !valid || !signed || !el('repair-note').value.trim() || state.flagBusy.has(p.id);
    message('draft-status',p ? (!p.verified ? p.status : !p.scalable ? 'This display supports repair flags. Product scaling is unavailable.' : state.drafts.has(p.id) ?
      'Unsaved draft · saved scale ' + percentage(state.dgView?p.initial:state.saved.get(p.id)?.scale ?? 1) + (signed ? '' : ' · Connect the owner account to save.') :
      'Saved scale ' + percentage(scale) + ' · ' + percentage(p.min) + '–' + percentage(p.max) + ' available') : '');
    el('upload').disabled = !el('dart-file').files.length || !signed || state.uploading;
    el('upload').textContent = state.uploading ? 'Saving…' : 'Save version';
    const unbuilt = !!currentVersion() && !currentVersion().nativeShelf && !state.hosted.has(state.selectedSha) && !state.local.has(state.selectedSha);
    el('compile-version').hidden = !unbuilt;
    el('compile-version').disabled = !signed || state.building;
    el('compile-version').textContent = state.building ? 'Building preview…' : 'Build private preview';
    el('pairing-help').hidden = !unbuilt;
    el('pair-local-compiler').hidden = !unbuilt;
    el('pair-local-compiler').disabled = !signed || state.building;
    el('refresh-versions').hidden = !currentVersion() && !signed;
    el('refresh-versions').textContent = state.ready ? 'Refresh versions' : 'Reload version';
  }
  function showProduct(p) {
    const box = el('product-detail');
    box.replaceChildren(make('h3',p.name),make('p',[p.size, p.price !== null ? new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(p.price) : 'Price unavailable'].filter(Boolean).join(' · ')));
    const detail = make('small',[p.authoredId ? p.aisle+' · Shelf '+p.page : p.render != null ? 'Shelf ' + p.render : p.aisle, p.slot != null ? 'Spot ' + p.slot : '', 'SKU ' + p.id].filter(Boolean).join(' · '));
    box.append(detail);
    if(!p.verified || !state.editing || state.readOnly)return;
    const savedAisle=state.aisle, savedSha=state.selectedSha;
    const dynamicAisle=!state.authoredId && state.mode==='grocery';
    box.append(window.StudioProductDetails.button({
      storeId:store,productId:p.id,
      aisles:dynamicAisle ? state.catalog.filter(name=>!(state.breadAlias && name==='Bread & Rolls')) : [],
      current:()=>state.selected?.id===p.id && state.editing && state.ready && !state.readOnly && state.selectedSha===savedSha,
      surface:dynamicAisle || state.mode==='dollar-general'?'This shelf uses the live catalog product, price and photograph. Updated details appear when the aisle refreshes.':
        'The app can read updated catalog details and base prices. Stock already painted into a shelf or floor photograph must be updated in that display’s artwork.',
      async onSaved(row,patch){
        if(state.selectedSha!==savedSha || state.aisle!==savedAisle)return;
        state.productNames.set(row.id,row.name);
        if(Object.hasOwn(patch,'category'))await loadAisles();
        selectVersion(savedSha);
      }
    }));
  }
  async function matchesShelf(product, spot) {
    if(state.authoredId!==null){
      const r=authoredRow();
      return Boolean(r && spot.authoredId===r.aisle_id && r.product_ids[(spot.page-1)*12+spot.slot-1]===product.id);
    }
    if (product.category === spot.aisle) return true;
    if (state.mode !== 'target')
      return state.breadAlias && spot.aisle === 'Bread & Rolls' && product.category === 'Bakery' && product.shelf_group === 'Bread & Rolls';
    // A Target shelf may intentionally stock an item from a historical catalog category.
    if (spot.render !== null && spot.slot !== null) {
      const placed = await request('target_render_slots',{select:'product_id,slot,target_renders!inner(aisle,status)',
        render_no:'eq.'+spot.render,slot:'eq.'+spot.slot,product_id:'eq.'+spot.id,'target_renders.aisle':'eq.'+spot.aisle,
        'target_renders.status':'eq.done',limit:1},false);
      return row(placed)?.product_id === spot.id;
    }
    const moved = await request('target_aisle_override',{select:'product_id,aisle',product_id:'eq.'+spot.id,aisle:'eq.'+spot.aisle,limit:1},false);
    return row(moved)?.product_id === spot.id;
  }
  async function selectProduct(data) {
    if (!state.editing || state.readOnly || data.store_id !== store || data.aisle !== state.aisle || !idPattern.test(data.product_id || '')) return;
    const id = data.product_id.toLowerCase();
    if(state.authoredId!==null){
      const r=authoredRow();
      if(!r || data.aisle_id!==r.aisle_id || !Number.isInteger(data.page)||data.page<1 ||
          !Number.isInteger(data.slot)||data.slot<1||data.slot>12||r.product_ids[(data.page-1)*12+data.slot-1]!==id) return;
    } else if(data.aisle_id) return;
    const min = Math.ceil(100 * Math.max(0.1, number(data.min_scale) ? data.min_scale : 0.5) - 0.000001) / 100;
    const max = Math.floor(100 * Math.min(4, number(data.max_scale) ? data.max_scale : 1.5) + 0.000001) / 100;
    if (min > max) return;
    const previous = state.selected;
    // The widget echoes the selected SKU when its preview scale changes.
    if (previous?.id === id && previous.verified && previous.authoredId===state.authoredId && previous.page===(data.page??null) && previous.render === (data.render_no ?? null) && previous.slot === (data.slot ?? null)) {
      previous.min = min;
      previous.max = max;
      previous.scalable = data.editable !== false;
      if(state.dgView && !state.drafts.has(id) && number(data.scale))previous.initial=data.scale;
      updateControls();
      return;
    }
    const seq = ++state.selectionSequence;
    const p = {id,aisle:state.aisle,authoredId:state.authoredId,page:data.page??null,name:String(data.name || 'Selected product').slice(0,220),
      size:String(data.size || '').slice(0,100),price:null,render:Number.isInteger(data.render_no) ? data.render_no:null,
      slot:Number.isInteger(data.slot) ? data.slot:null,min,max,initial:number(data.scale) ? data.scale:1,
      scalable:data.editable !== false,verified:false,status:'Checking the store product…'};
    state.selected = p;
    el('repair-note').value = state.notes.get(id) || '';
    showProduct(p);
    updateControls();
    try {
      const [products] = await Promise.all([request('products',{select:'id,name,price,store_id,category,shelf_group',store_id:'eq.' + store,id:'eq.' + id,limit:1},false),loadSkuScale(id)]);
      if (seq !== state.selectionSequence) return;
      const actual = row(products);
      if (!actual || actual.id !== id || actual.store_id !== store) throw Error('This product could not be verified in this store.');
      if (!await matchesShelf(actual,p)) throw Error('This product belongs to a different aisle in this store.');
      if (seq !== state.selectionSequence) return;
      p.name = actual.name || p.name;
      const price = Number(actual.price);
      p.price = number(price) && price > 0 ? price : null;
      p.verified = true;
      state.productNames.set(id,p.name);
      showProduct(p);
      const scale = Math.max(min,Math.min(currentScale(),max));
      if (p.scalable && Math.abs(scale - p.initial) > 0.0001) send('set-scale',{product_id:id,scale});
    } catch (err) { if (seq === state.selectionSequence) p.status = failText(err); }
    if (seq === state.selectionSequence) updateControls();
  }
  function draftScale(value) {
    const p = state.selected;
    if (!p?.verified || !p.scalable || !state.editing || !state.ready || !number(value)) return;
    const scale = round(Math.max(p.min,Math.min(value,p.max)));
    if (scale === (state.dgView?p.initial:state.saved.get(p.id)?.scale ?? 1)) state.drafts.delete(p.id);
    else state.drafts.set(p.id,scale);
    send('set-scale',{product_id:p.id,scale});
    updateControls();
  }
  async function saveScale() {
    const p = state.selected;
    if (!p?.verified || !p.scalable || !state.drafts.has(p.id) || state.saveBusy.has(p.id)) return;
    const value = state.drafts.get(p.id), revision = state.saved.get(p.id)?.revision ?? 0, dgView=state.dgView;
    state.saveBusy.add(p.id);
    updateControls();
    try {
      if (!state.owner || !jobs?.current()) {
        await connectOwner(true);
        if (!state.owner || !jobs?.current() || state.selected !== p || state.drafts.get(p.id) !== value) return;
      }
      if(dgView) {
        if(state.dgView!==dgView) return;
        await dgView.saveScale(p.id,value);
        if(state.drafts.get(p.id)===value)state.drafts.delete(p.id);
        p.initial=value;
        setNotice('Saved '+percentage(value)+' for '+p.name+'.');
        return;
      }
      const r = row(await rpc('studio_save_grocery_product_scale',{p_store_id:store,p_product_id:p.id,p_scale:value,p_expected_revision:revision}));
      if (!r || r.product_id !== p.id || r.store_id !== store || Number(r.scale) !== value || Number(r.revision) <= revision)
        throw Error('The store did not confirm this scale change.');
      acceptScale(r);
      if (state.drafts.get(p.id) === value) state.drafts.delete(p.id);
      setNotice('Saved ' + percentage(value) + ' for ' + p.name + '.');
    } catch (err) {
      try { await loadSkuScale(p.id); } catch (_) {}
      setNotice(failText(err) + ' Your draft is still available.');
    } finally { state.saveBusy.delete(p.id); updateControls(); }
  }
  async function flagProduct() {
    const p = state.selected, note = el('repair-note').value.trim(), version = state.selectedSha;
    if (!p?.verified || !state.owner || !note || state.flagBusy.has(p.id)) return;
    state.flagBusy.add(p.id);
    updateControls();
    try {
      const f = row(await rpc('studio_flag_grocery_product', {p_store_id:store,p_product_id:p.id,p_aisle:p.aisle,p_version:version,
        p_page_key:p.authoredId ? 'studio:'+p.authoredId+'/page/'+p.page+'/slot/'+p.slot : p.render != null ? 'r' + p.render + (p.slot != null ? '/slot/' + p.slot : '') : null,p_note:note}));
      if (!f || !f.id || f.store_id !== store || f.product_id !== p.id || f.aisle !== p.aisle) throw Error('The store did not confirm this repair flag.');
      if (state.notes.get(p.id)?.trim() === note) {
        state.notes.delete(p.id);
        if (state.selected?.id === p.id) el('repair-note').value = '';
      }
      state.flags = [f,...state.flags.filter(other => other.id !== f.id)];
      drawFlags();
      setNotice('Flagged ' + p.name + ' for repair.');
      await refreshFlags();
    } catch (err) { setNotice(failText(err)); }
    finally { state.flagBusy.delete(p.id); updateControls(); }
  }
  async function digest(bytes) {
    return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)), b => b.toString(16).padStart(2,'0')).join('');
  }
  async function upload() {
    const file = el('dart-file').files[0];
    if (!file || !state.owner || state.uploading) return;
    if (!/\.dart$/i.test(file.name) || !file.size || file.size > 8 * 1024 * 1024) { setNotice('Choose a nonempty .dart source file of up to 8 MiB.'); return; }
    state.uploading = true;
    updateControls();
    try {
      const bytes = await file.arrayBuffer(), sha = await digest(bytes);
      const source = new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);
      const v = row(await rpc('studio_register_grocery_dart',{p_filename:file.name,p_source:source}));
      if (!v || v.sha256 !== sha || Number(v.byte_size) !== bytes.byteLength) throw Error('The saved source did not match the uploaded bytes.');
      state.sourceFile = {sha,file};
      state.versions.set(sha,{...v,...state.hosted.get(sha)});
      selectVersion(sha);
      el('dart-file').value = '';
      setNotice('Saved ' + file.name + ' · ' + sha.slice(0,12) + '.');
      if (!state.previewURL) await buildPreview();
    } catch (err) { setNotice(failText(err)); }
    finally { state.uploading = false; updateControls(); }
  }
  async function buildPreview() {
    const sha = state.selectedSha, serial = state.versionSequence, v = currentVersion();
    if (!v || !state.owner || state.building || state.previewURL) return;
    state.building = true;
    updateControls();
    try {
      const builder = window.GroceryPrivateBuild;
      if (!builder?.open) throw Error('Pair the private compiler on your computer to build this Dart version.');
      let file = state.sourceFile?.sha === sha ? state.sourceFile.file : null;
      if (!file) {
        const version = row(await request('studio_grocery_dart_versions',{select:'source',sha256:'eq.' + sha,limit:1}));
        if (!version || typeof version.source !== 'string') throw Error('The saved Dart source is unavailable.');
        file = new File([new TextEncoder().encode(version.source)],v.filename || 'GroceryAisle.dart',{type:'text/plain;charset=utf-8'});
      }
      if (await digest(await file.arrayBuffer()) !== sha) throw Error('The build source does not match this saved Dart version.');
      const result = await builder.open(file,{onStatus:status => {
        if (serial === state.versionSequence) message('frame-status', typeof status === 'string' ? status : String(status?.message || 'Building this Dart version…'));
      }});
      const url = new URL(result.url);
      const expected = new URL('/preview/' + sha + '/index.html',privateOrigin);
      if (result.sha256 !== sha || url.href !== expected.href) throw Error('The private compiler returned a different source or preview location.');
      state.local.set(sha,{url,capabilities:Array.isArray(result.capabilities)?result.capabilities:[],readOnly:!!result.readOnly,aisleRouting:result.aisleRouting || null});
      if (serial === state.versionSequence) {
        selectVersion(sha);
        setNotice(result.readOnly ? 'Private build ready in shopping mode. This source has no product editing bridge.' : 'Private compiled preview ready.');
      }
    } catch (err) {
      if (serial === state.versionSequence) {
        message('frame-status','This saved Dart version has no available compiled preview.');
        setNotice(failText(err));
      }
    } finally { state.building = false; updateControls(); }
  }
  window.addEventListener('message', event => {
    const data = event.data;
    if (!state.previewURL || event.origin !== state.previewURL.origin || event.source !== el('editor-frame').contentWindow ||
        !data || data.channel !== channel) return;
    if (data.type === 'error' && data.sourceSha256 === state.selectedSha && data.store_id === store) {
      clearTimeout(state.frameTimer);
      state.ready = false;
      el('editor-frame').hidden = true;
      el('frame-status').hidden = false;
      message('frame-status',String(data.message || 'The compiled preview could not open this store.').slice(0,350));
      clearSelection();
      return;
    }
    if (data.type === 'ready') {
      if (data.sourceSha256 !== state.selectedSha || data.store_id !== store) {
        message('frame-status','The running preview does not match the selected Dart source.');
        return;
      }
      if (state.ready) return;
      if(state.authoredId && (!Array.isArray(data.capabilities)||!data.capabilities.includes(authoredFeature))){
        clearTimeout(state.frameTimer);el('editor-frame').hidden=true;el('frame-status').hidden=false;
        message('frame-status','The compiled preview did not confirm published aisle support.');return;
      }
      clearTimeout(state.frameTimer);
      state.ready = true;
      el('frame-status').hidden = true;
      if(!state.authoredId)send('set-aisle',{aisle:state.aisle});
      send('set-mode',{mode:state.editing ? 'select':'shop'});
      send('sync',{scales:scaleMap()});
      updateControls();
      drawFlags();
      navigateToFlag();
    } else if (state.ready && data.type === 'select') selectProduct(data);
    else if (state.ready && data.type === 'status' && typeof data.message === 'string') setNotice(data.message.slice(0,350));
  });
  el('open-layout').addEventListener('click',() => openLayout('',state.selected?.id));
  el('enlarge-layout').addEventListener('click',() => openLayout('',state.selected?.id));
  el('connect-owner').addEventListener('click',() => connectOwner(true));
  el('inspect-selected').addEventListener('click',() => {el('product-heading').focus({preventScroll:true}); el('inspector').scrollIntoView({block:'start'});});
  el('department').addEventListener('change',e => changeAisle(e.target.value));
  el('version-list').addEventListener('change',e => selectVersion(e.target.value));
  el('mode-toggle').addEventListener('click',previewShopping);
  el('close-shopping').addEventListener('click',()=>el('shopping-preview').close());
  el('layout-workspace').addEventListener('close',()=>{
    if (state.dgView && !el('layout-workspace').open) state.dgView.reload?.().catch(error=>setNotice(failText(error)));
  });
  const smallScreen = window.matchMedia('(max-width: 760px)');
  function placeSizeTools() {
    const sizeTools = el('product-size-tools');
    if (smallScreen.matches) el('phone-size-tools').append(sizeTools);
    else el('return-preview').before(sizeTools);
  }
  placeSizeTools();
  smallScreen.addEventListener('change',placeSizeTools);
  el('scale-minus').addEventListener('click',() => draftScale(currentScale() - 0.10));
  el('scale-plus').addEventListener('click',() => {
    if(state.selected && currentScale() >= state.selected.max) openLayout('',state.selected.id);
    else draftScale(currentScale() + 0.10);
  });
  el('scale-range').addEventListener('input',e => draftScale(Number(e.target.value)));
  el('scale-reset').addEventListener('click',() => draftScale(1));
  el('save-scale').addEventListener('click',saveScale);
  el('repair-note').addEventListener('input',e => {if (state.selected) state.notes.set(state.selected.id,e.target.value); updateControls();});
  el('flag-product').addEventListener('click',flagProduct);
  el('dart-file').addEventListener('change',updateControls);
  el('upload').addEventListener('click',upload);
  el('pair-local-compiler').addEventListener('click',async () => {
    try {
      await window.GroceryPrivateBuild.pair();
      setNotice('Compiler paired for this tab.');
      await buildPreview();
    } catch (err) { setNotice(failText(err)); }
  });
  el('compile-version').addEventListener('click',buildPreview);
  el('refresh-versions').addEventListener('click',async () => {
    const sha = state.selectedSha;
    try {
      const stores = await window.StudioWorkspaceCore.loadAppStores({force:true});
      if (!stores.some(row => row.id === store)) { location.reload(); return; }
      await Promise.all([loadManifest(),loadAisles(),loadPublishedAisles()]);
      await loadVersions();
      selectVersion(state.versions.has(sha) ? sha : state.defaultSha);
    }
    catch (err) { setNotice(failText(err)); }
  });
  el('prev-panel').addEventListener('click',() => send('move',{direction:'left'}));
  el('next-panel').addEventListener('click',() => send('move',{direction:'right'}));
  el('search-form').addEventListener('submit',e => { e.preventDefault(); send('search',{query:el('aisle-search').value.trim()}); });
  if (!start.has('store')) { location.replace('store-directory.html?type=grocery'); return; }
  el('department').disabled = true;
  drawFlags();
  updateControls();
  const openStore = async () => {
    if (!idPattern.test(store)) { message('frame-status','This store link contains an invalid store ID.'); return; }
    if(requestedAuthored!==null&&!idPattern.test(requestedAuthored))throw Error('Invalid published aisle link.');
    const core = window.StudioWorkspaceCore;
    if (!core?.appStoreById || !core.groceryModeForStore) throw Error('The store directory could not load.');
    const info = await core.appStoreById(store);
    if (!info) { message('frame-status','This store is unavailable in the app.'); return; }
    state.mode = core.groceryModeForStore(info);
    if (!state.mode) {
      message('frame-status',info.name + ' uses a different store editor.');
      const route = core.storeEditorForStore?.(info);
      if (route) { el('store-back').href = route; message('store-back','‹ ' + info.name + ' editor'); }
      return;
    }
    state.storeReady = true;
    if (state.mode==='dollar-general') {
      state.versions.set(dgRenderer,{sha256:dgRenderer,label:'Dollar General · Stocked shelves',nativeShelf:true,created_at:'2026-11-25'});
      message('version-heading','Shelf renderer');
    }
    message('preview-heading',info.name + ' aisle');
    el('store-back').href = 'grocery-entrance.html?store=' + encodeURIComponent(store);
    message('store-back','‹ ' + info.name + ' entrance');
    await Promise.all([loadManifest(),loadAisles(),loadPublishedAisles()]);
    const compatible=state.authoredId&&!hasAuthored(state.hosted.get(state.defaultSha))?
      [...state.hosted.values()].find(hasAuthored):null;
    selectVersion(state.mode==='dollar-general'?dgRenderer:compatible?.sha256??state.defaultSha);
    state.scaleLoad = loadScales().catch(() => {});
    maybeOpenLayout();
    connectOwner(false);
  };
  el('retry-store').addEventListener('click',() => location.reload());
  openStore().catch(err => {
    message('frame-status',failText(err));
    el('retry-store').hidden = false;
  });
})();
