(function () {
  'use strict';

  const targetStore = '35ef70d0-3d20-4599-96a3-648ee3c7c340';
  const publixStore = '189581c9-d728-4e5d-9e02-ae4de19a15af';
  const supportedShelves = ['Snacks','Beverages','Breakfast','Canned Goods & Soups','Dry Goods & Pasta','Condiments & Sauces','Personal Care','Health Care','Household','Baby','Pet Care','Bread & Rolls'];
  const start = new URLSearchParams(location.search);
  const store = start.has('store') ? start.get('store').trim().toLowerCase() : targetStore;
  const isTarget = store === targetStore;
  const channel = 'sleipnir-aisle-editor-v1';
  const requestedAisle = (start.get('aisle') || '').trim().slice(0,140);
  const initialAisle = requestedAisle || (isTarget ? 'Canned Goods & Soups' : 'Snacks');
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
  const request = (path, params, auth = true) => jobs.request('/rest/v1/' + path + '?' + new URLSearchParams(params), {auth});
  const percentage = n => Math.round(n * 100) + '%';
  const number = x => typeof x === 'number' && Number.isFinite(x);
  const round = x => Math.round(x * 100) / 100;
  const state = {
    hosted: new Map(), versions: new Map(), local: new Map(), saved: new Map(), drafts: new Map(),
    notes: new Map(), productNames: new Map(), defaultSha: '', selectedSha: '', selected: null, aisle: initialAisle,
    editing: true, owner: false, authPending: false, uploading: false, building: false, previewURL: null,
    ready: false, readOnly: false, frameSequence: 0, selectionSequence: 0, versionSequence: 0, flagSequence: 0,
    saveBusy: new Set(), flagBusy: new Set(), flags: [], sourceFile: null, frameTimer: null
  };
  function currentVersion() { return state.versions.get(state.selectedSha); }
  function setNotice(text) { message('editor-status', text); }
  function scaleMap() {
    const current = {};
    for (const [id, record] of state.saved) current[id] = record.scale;
    for (const [id, scale] of state.drafts) current[id] = scale;
    return current;
  }
  function send(type, data = {}) {
    if (!state.ready || !state.previewURL) return;
    el('editor-frame').contentWindow.postMessage({channel, type, ...data}, state.previewURL.origin);
  }
  function setOptions(select, entries, chosen) {
    select.replaceChildren(...entries.map(([value, label]) => {
      const option = make('option', label);
      option.value = value;
      return option;
    }));
    select.value = chosen;
  }
  function setAisles(aisles) {
    const values = Array.from(new Set(aisles.filter(v => typeof v === 'string' && v.trim())));
    if (!values.includes(state.aisle)) values.push(state.aisle);
    setOptions(el('department'), values.sort((a,b) => a.localeCompare(b)).map(a => [a,a]), state.aisle);
  }
  function getVersionLabel(v) {
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
    const response = await fetch(manifestURL, {cache:'no-cache', credentials:'omit'});
    if (!response.ok) throw Error('The compiled preview registry is unavailable.');
    const manifest = await response.json();
    for (const [digest, item] of Object.entries(manifest.versions || {})) {
      if (!hashPattern.test(digest) || !item || typeof item.path !== 'string' ||
          !hashPattern.test(item.artifactSha256 || '')) continue;
      const url = new URL(item.path, previewRoot);
      const expected = new URL(digest + '/index.html', previewRoot);
      if (url.href !== expected.href) continue;
      const version = { ...state.versions.get(digest), sha256:digest, filename:item.filename, label:item.label,buildFlavor:item.buildFlavor,
        artifactSha256:item.artifactSha256, url, readOnly:!!item.readOnly };
      state.hosted.set(digest, version);
      state.versions.set(digest, version);
      if (item.default === true) state.defaultSha = digest;
    }
    if (state.hosted.has(manifest.defaultSourceSha256)) state.defaultSha = manifest.defaultSourceSha256;
    if (!state.defaultSha) state.defaultSha = state.hosted.keys().next().value || '';
    if (!state.defaultSha) throw Error('No verified compiled Dart version is available.');
  }
  async function loadVersions() {
    if (!state.owner) return;
    const size = 250;
    let offset = 0;
    while (true) {
      const result = await jobs.request(versionsPath + '?' + new URLSearchParams({select:versionFields,order:'created_at.desc,id.asc',limit:size,offset}));
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
    try {
      const result = isTarget ? await rpc('target_catalog_categories', {}, false) :
        await rpc('studio_product_categories',{p_store_id:store},false);
      let aisles = result.filter(r => Number(r.product_count) > 0).map(r => r.category);
      if (!isTarget) {
        const hasBakery = aisles.includes('Bakery');
        aisles = aisles.filter(a => supportedShelves.includes(a));
        if (hasBakery && !aisles.includes('Bread & Rolls')) {
          const bread = await request('products',{select:'id',store_id:'eq.' + store,category:'eq.Bakery',shelf_group:'eq.Bread & Rolls',limit:1},false);
          if (bread?.length) aisles.push('Bread & Rolls');
        }
      }
      if (aisles.length) setAisles(aisles);
    } catch (_) {
      // The store's known entry remains usable while its independent directory is offline.
    }
  }
  async function loadScales() {
    const limit = 500;
    let offset = 0;
    while (true) {
      const result = await request('studio_grocery_product_scales',
        {select:'product_id,scale,revision',store_id:'eq.' + store,order:'product_id',limit,offset},false);
      for (const r of result || []) acceptScale(r);
      if (!Array.isArray(result) || result.length < limit) break;
      offset += limit;
    }
    send('sync', {scales:scaleMap()});
    updateControls();
  }
  function acceptScale(r) {
    if (!r || !idPattern.test(r.product_id || '') || !number(Number(r.scale)) || !Number.isInteger(Number(r.revision))) return;
    const current = state.saved.get(r.product_id);
    if (!current || Number(r.revision) >= current.revision) state.saved.set(r.product_id,{scale:Number(r.scale),revision:Number(r.revision)});
  }
  async function loadSkuScale(id) {
    const rows = await request('studio_grocery_product_scales', {select:'product_id,scale,revision',store_id:'eq.' + store,product_id:'eq.' + id,limit:1},false);
    const latest = row(rows);
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
      flags.push(...rows);
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
        state.focus = {product_id:f.product_id, aisle:f.aisle};
        if (dest !== state.selectedSha) selectVersion(dest);
        else navigateToFlag();
      });
      li.append(link,make('span',f.aisle + ' · ' + (f.status || 'open')),make('p',f.note));
      list.append(li);
    }
  }
  function navigateToFlag() {
    if (!state.focus || !state.ready) return;
    const {product_id,aisle} = state.focus;
    state.focus = null;
    changeAisle(aisle);
    send('focus-product',{product_id,aisle});
  }
  async function connectOwner(interactive) {
    if (state.authPending) return;
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
    el('product-detail').replaceChildren(make('p', state.editing ? 'Select a product in the preview to adjust its size or flag it for repair.' : 'Shopping mode opens the normal product details in the preview.'));
    updateControls();
  }
  function selectVersion(digest) {
    ++state.versionSequence;
    state.selectedSha = state.versions.has(digest) ? digest : '';
    const v = currentVersion(), build = state.hosted.get(digest) || state.local.get(digest);
    const serial = ++state.frameSequence;
    state.ready = false;
    state.readOnly = !!build?.readOnly;
    state.previewURL = build?.url || null;
    clearTimeout(state.frameTimer);
    clearSelection();
    showVersions();
    const old = el('editor-frame');
    const frame = old.cloneNode(false);
    frame.removeAttribute('src');
    old.replaceWith(frame);
    frame.hidden = !build;
    el('frame-status').hidden = false;
    message('version-status', versionStatus());
    if (build) {
      message('frame-status','Starting the compiled Flutter preview…');
      const src = new URL(build.url);
      src.searchParams.set('store',store);
      src.searchParams.set('aisle',state.aisle);
      frame.addEventListener('load',() => {
        if (state.frameSequence === serial)
          frame.contentWindow.postMessage({channel,type:'hello'},build.url.origin);
      },{once:true});
      frame.src = src.href;
      state.frameTimer = setTimeout(() => {
        if (state.frameSequence === serial && !state.ready)
          message('frame-status','The compiled preview has not connected. Reload this version to retry.');
      }, 25000);
    } else message('frame-status', v ? 'This Dart version needs a compiled preview.' : 'A verified Flutter preview is unavailable.');
    drawFlags();
    updateControls();
  }
  function changeAisle(aisle) {
    if (!aisle || typeof aisle !== 'string') return;
    if (!isTarget && !supportedShelves.includes(aisle)) return;
    state.aisle = aisle;
    if (!Array.from(el('department').options).some(o => o.value === aisle)) setAisles([...Array.from(el('department').options).map(o => o.value),aisle]);
    el('department').value = aisle;
    const route = new URL(location.href);
    route.searchParams.set('store',store);
    route.searchParams.set('aisle',aisle);
    try { history.replaceState(null,'',route); } catch (_) {}
    clearSelection();
    send('set-aisle',{aisle});
  }
  function currentScale() {
    const p = state.selected;
    return p ? state.drafts.get(p.id) ?? state.saved.get(p.id)?.scale ?? p.initial : 1;
  }
  function updateControls() {
    const p = state.selected, scale = currentScale();
    const valid = !!(state.ready && state.editing && !state.readOnly && p?.verified);
    const scalable = valid && p.scalable;
    const saving = !!p && state.saveBusy.has(p.id);
    const signed = state.owner && !!jobs?.current();
    el('inspect-selected').hidden = !p;
    el('return-preview').hidden = !p;
    if (p) message('inspect-selected','Edit ' + p.name);
    el('connect-owner').textContent = state.authPending ? 'Connecting…' : signed ? 'Owner connected' : 'Connect owner';
    el('connect-owner').disabled = state.authPending || signed;
    for (const id of ['aisle-search','search-go','prev-panel','next-panel']) el(id).disabled = !state.ready;
    el('mode-toggle').disabled = !state.ready || state.readOnly;
    el('mode-toggle').setAttribute('aria-pressed',String(state.editing));
    el('mode-toggle').textContent = state.editing ? 'Select products' : 'Shopping mode';
    el('scale-range').min = p?.min ?? 0.5;
    el('scale-range').max = p?.max ?? 1.5;
    el('scale-range').value = scale;
    el('scale-range').disabled = !scalable;
    el('scale-minus').disabled = !scalable || scale <= p.min;
    el('scale-plus').disabled = !scalable || scale >= p.max;
    el('scale-reset').disabled = !scalable || scale === 1 || !p || p.min > 1 || p.max < 1;
    message('scale-value',p ? percentage(scale) : '—');
    el('save-scale').disabled = !scalable || !signed || !state.drafts.has(p.id) || saving;
    el('save-scale').textContent = saving ? 'Saving…' : 'Save scale';
    el('repair-note').disabled = !valid;
    el('flag-product').disabled = !valid || !signed || !el('repair-note').value.trim() || state.flagBusy.has(p.id);
    message('draft-status',p ? (!p.verified ? p.status : !p.scalable ? 'This display supports repair flags. Product scaling is unavailable.' : state.drafts.has(p.id) ?
      'Unsaved draft · saved scale ' + percentage(state.saved.get(p.id)?.scale ?? 1) + (signed ? '' : ' · Connect the owner account to save.') :
      'Saved scale ' + percentage(scale) + ' · ' + percentage(p.min) + '–' + percentage(p.max) + ' available') : '');
    el('upload').disabled = !el('dart-file').files.length || !signed || state.uploading;
    el('upload').textContent = state.uploading ? 'Saving…' : 'Save version';
    const unbuilt = !!currentVersion() && !state.previewURL;
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
    const detail = make('small',[p.render != null ? 'Shelf ' + p.render : p.aisle, p.slot != null ? 'Spot ' + p.slot : '', 'SKU ' + p.id].filter(Boolean).join(' · '));
    box.append(detail);
  }
  async function selectProduct(data) {
    if (!state.editing || state.readOnly || data.store_id !== store || data.aisle !== state.aisle || !idPattern.test(data.product_id || '')) return;
    const id = data.product_id.toLowerCase();
    const min = Math.ceil(100 * Math.max(0.1, number(data.min_scale) ? data.min_scale : 0.5) - 0.000001) / 100;
    const max = Math.floor(100 * Math.min(4, number(data.max_scale) ? data.max_scale : 1.5) + 0.000001) / 100;
    if (min > max) return;
    const previous = state.selected;
    // The widget echoes the selected SKU when its preview scale changes.
    if (previous?.id === id && previous.verified && previous.render === (data.render_no ?? null) && previous.slot === (data.slot ?? null)) {
      previous.min = min;
      previous.max = max;
      previous.scalable = data.editable !== false;
      updateControls();
      return;
    }
    const seq = ++state.selectionSequence;
    const p = {id,aisle:state.aisle,name:String(data.name || 'Selected product').slice(0,220),
      size:String(data.size || '').slice(0,100),price:null,render:Number.isInteger(data.render_no) ? data.render_no:null,
      slot:Number.isInteger(data.slot) ? data.slot:null,min,max,initial:number(data.scale) ? data.scale:1,
      scalable:data.editable !== false,verified:false,status:'Checking the store product…'};
    state.selected = p;
    el('repair-note').value = state.notes.get(id) || '';
    showProduct(p);
    updateControls();
    try {
      const [products] = await Promise.all([request('products',{select:'id,name,price',store_id:'eq.' + store,id:'eq.' + id,limit:1},false),loadSkuScale(id)]);
      if (seq !== state.selectionSequence) return;
      const actual = row(products);
      if (!actual || actual.id !== id) throw Error('This product could not be verified in this store.');
      p.name = actual.name || p.name;
      p.price = actual.price != null && actual.price !== '' && number(Number(actual.price)) ? Number(actual.price) : null;
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
    if (scale === (state.saved.get(p.id)?.scale ?? 1)) state.drafts.delete(p.id);
    else state.drafts.set(p.id,scale);
    send('set-scale',{product_id:p.id,scale});
    updateControls();
  }
  async function saveScale() {
    const p = state.selected;
    if (!p?.verified || !state.drafts.has(p.id) || !state.owner || state.saveBusy.has(p.id)) return;
    const value = state.drafts.get(p.id), revision = state.saved.get(p.id)?.revision ?? 0;
    state.saveBusy.add(p.id);
    updateControls();
    try {
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
        p_page_key:p.render != null ? 'r' + p.render + (p.slot != null ? '/slot/' + p.slot : '') : null,p_note:note}));
      if (!f || !f.id || f.product_id !== p.id) throw Error('The store did not confirm this repair flag.');
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
      state.local.set(sha,{url,readOnly:!!result.readOnly});
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
    if (data.type === 'ready') {
      if (data.sourceSha256 !== state.selectedSha || (data.store_id !== undefined && data.store_id !== store)) {
        message('frame-status','The running preview does not match the selected Dart source.');
        return;
      }
      if (state.ready) return;
      clearTimeout(state.frameTimer);
      state.ready = true;
      if (state.readOnly) state.editing = false;
      el('frame-status').hidden = true;
      send('set-aisle',{aisle:state.aisle});
      send('set-mode',{mode:state.editing ? 'select':'shop'});
      send('sync',{scales:scaleMap()});
      updateControls();
      drawFlags();
      navigateToFlag();
    } else if (state.ready && data.type === 'select') selectProduct(data);
    else if (state.ready && data.type === 'status' && typeof data.message === 'string') setNotice(data.message.slice(0,350));
  });
  el('connect-owner').addEventListener('click',() => connectOwner(true));
  el('inspect-selected').addEventListener('click',() => {el('product-heading').focus({preventScroll:true}); el('inspector').scrollIntoView({block:'start'});});
  el('department').addEventListener('change',e => changeAisle(e.target.value));
  el('version-list').addEventListener('change',e => selectVersion(e.target.value));
  el('mode-toggle').addEventListener('click',() => { state.editing = !state.editing; clearSelection(); send('set-mode',{mode:state.editing ? 'select':'shop'}); });
  el('scale-minus').addEventListener('click',() => draftScale(currentScale() - 0.01));
  el('scale-plus').addEventListener('click',() => draftScale(currentScale() + 0.01));
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
    try { await loadManifest(); await loadVersions(); selectVersion(sha || state.defaultSha); }
    catch (err) { setNotice(failText(err)); }
  });
  el('prev-panel').addEventListener('click',() => send('move',{direction:'left'}));
  el('next-panel').addEventListener('click',() => send('move',{direction:'right'}));
  el('search-form').addEventListener('submit',e => { e.preventDefault(); send('search',{query:el('aisle-search').value.trim()}); });
  const knownStore = isTarget ? 'Target' : store === publixStore ? 'Publix (Island Walk)' : '';
  if (!idPattern.test(store) || (!isTarget && requestedAisle && !supportedShelves.includes(requestedAisle))) {
    el('connect-owner').disabled = true;
    el('department').disabled = true;
    message('preview-heading',knownStore || 'Store aisle');
    message('frame-status',idPattern.test(store) ? 'This department uses a different store display.' : 'This store link contains an invalid store ID.');
    if (idPattern.test(store)) {
      el('store-back').href = 'grocery-entrance.html?store=' + encodeURIComponent(store);
      message('store-back','‹ Store entrance');
    }
    return;
  }
  function setStoreName(name) {
    message('preview-heading',name + ' aisle');
    el('store-back').href = 'grocery-entrance.html?store=' + encodeURIComponent(store);
    message('store-back','‹ ' + name + ' entrance');
  }
  if (knownStore) setStoreName(knownStore);
  setAisles(isTarget ? [initialAisle,'Condiments & Sauces','Dairy & Eggs'] : [initialAisle]);
  drawFlags();
  updateControls();
  const verifiedStore = knownStore ? Promise.resolve() : request('stores',{select:'id,name',id:'eq.' + store,limit:1},false).then(rows => {
    if (row(rows)?.id !== store) throw Error('This store is unavailable.');
    setStoreName(row(rows).name || 'Store');
  });
  verifiedStore.then(() => loadManifest()).then(() => {if (!state.selectedSha) selectVersion(state.defaultSha); else showVersions();})
    .catch(err => {if (!state.selectedSha) selectVersion(''); setNotice(failText(err));});
  verifiedStore.then(() => {
    loadAisles();
    loadScales().catch(() => {}); // A fresh store-scoped read is also required on each selection.
    connectOwner(false);
  }).catch(() => { el('connect-owner').disabled = true; });
})();
