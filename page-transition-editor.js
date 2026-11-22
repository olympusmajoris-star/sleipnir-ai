/* The editor captures the registered Studio pages in an isolated phone viewport.
   All edits and playback stay local until the owner saves a scope. */
(() => {
  'use strict';
  if (new URLSearchParams(location.search).has('transition-frame')) return;
  const K = window.StudioKit, store = window.SleipnirTransitionStore, effects = window.SleipnirSceneTransitions;
  const screens = new Map(K.order.map(id => [K.transitionRoute(id), id]));
  const $ = id => document.getElementById('pt-' + id);
  const option = (value, text) => new Option(text, value);
  const copy = value => JSON.parse(JSON.stringify(value));
  const title = route => K.screens[screens.get(route)]?.title || route;
  const glass = window.PageGlass, selections = window.SleipnirSelectionPreview;
  let selectedView = null, targetRow = null, targetError = '';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const sleep = ms => new Promise(done => setTimeout(done, ms));
  function within(promise, ms) {
    let guard;
    const timed = new Promise((_, reject) => { guard = setTimeout(() => reject(Error('The page preview timed out.')), ms); });
    return Promise.race([promise, timed]).finally(() => clearTimeout(guard));
  }
  const state = {scope:'default', from:'HomePage', to:'Asgard/dial', manifest:null, dirty:false, assets:null, example:false};
  let dialog, frame, frameReady, snapshots, queue, epoch = 0, opened = 0, writing = false;
  let controls, handles, animation, tickId, playStart, held = 1, holdElapsed = 0;
  let fromWork, toWork, srcFull, dstFull;
  let loadError = '', previousCovered = false, inventoryJob;
  const history = []; let lastEdit = '', lastEditTime = 0;
  const params = new URLSearchParams(location.search);
  const embedded = params.get('workshopFocus') === '1' && window.parent !== window;

  function build() {
    dialog = document.createElement('dialog'); dialog.id = 'pt-editor'; dialog.setAttribute('aria-labelledby','pt-title');
    dialog.innerHTML = `
      <header><h2 id="pt-title">Page transitions</h2><a href="sleipnir-launch-preview.html" target="_blank" rel="noopener">Preview app launch ↗</a><button type="button" id="pt-close" autofocus>Close</button></header>
      <div class="pt-body"><section class="pt-settings" aria-label="Transition settings">
        <fieldset><legend>Apply to</legend><label><select aria-label="Apply to" id="pt-scope">
          <option value="default">App default</option><option value="page">This destination page</option><option value="route">This direction only</option><option value="selection" hidden>When this selection appears</option></select></label>
          <div class="pt-grid"><label>From page<select id="pt-from"></select></label><label>To page<select id="pt-to"></select></label></div>
          <p id="pt-inheritance"></p></fieldset>
        <fieldset><legend>Transition</legend><div class="pt-grid">
          <label>Effect<select id="pt-effect"></select></label><label>Animate<select id="pt-layer"><option value="controls">Floating controls</option><option value="page">Whole page</option></select></label>
          <label id="pt-variant-wrap">Drawing style<select id="pt-variant"></select></label>
          <label>Direction<select id="pt-direction"><option value="forward">Forward</option><option value="reverse">Reverse</option></select></label>
          <label>Effect color<input id="pt-color" type="color"></label>
          <label>Intensity <output id="pt-intensity-value"></output><input id="pt-intensity" type="range" min="0" max="100"></label>
          <label>Duration <output id="pt-duration-value"></output><input id="pt-duration" type="range" min="200" max="4000" step="1"></label>
        </div><p id="pt-layer-info"></p></fieldset>
        <div id="pt-glass"></div>
        <details id="pt-camera"><summary>Preview camera</summary><div class="pt-grid"><label>Facing<select id="pt-facing"><option value="environment">Back camera</option><option value="user">Front camera</option></select></label>
        <label>Device<select id="pt-device"><option value="">Automatic camera</option></select></label></div>
        <label class="pt-check"><input type="checkbox" id="pt-camera-backdrop"> Use camera behind transparent pages in this preview</label>
        <button type="button" id="pt-camera-on">Enable camera preview</button> <button type="button" id="pt-camera-off" hidden>Turn camera off</button><p id="pt-camera-status" role="status">Uses the camera already enabled for this page, or request a device here.</p></details>
      </section><section class="pt-preview" aria-label="Preview">
        <figure><div id="pt-stage"><canvas id="pt-canvas" width="390" height="844" aria-label="Transition preview"></canvas></div><figcaption id="pt-caption"></figcaption></figure>
        <div class="pt-preview-buttons"><button id="pt-play" type="button" class="pt-primary">Play transition</button><button id="pt-end" type="button">Show destination</button><button id="pt-example" type="button" hidden>Preview with Home and Raven dial</button></div>
        <label>Preview position<input id="pt-progress" type="range" min="0" max="100" value="100"></label>
        <p id="pt-preview-status" role="status" aria-live="polite"></p>
      </section></div>
      <footer class="pt-actions"><button id="pt-save" class="pt-primary" type="button">Save settings</button><button id="pt-reset" type="button">Reset app default</button>
      <button id="pt-discard" type="button" hidden>Discard draft</button><button id="pt-reload" type="button" hidden>Reload saved settings</button>
      <p id="pt-status" role="status" aria-live="polite"></p></footer>`;
    document.body.append(dialog);
    dialog.classList.toggle('pt-workshop-focus',embedded);
    $('effect').replaceChildren(...effects.effects.map(e=>option(e.id,e.id === 'off' ? 'Off (instant)' : e.label)));
    const targets = ['scope','from','to']; targets.forEach(key => $(key).onchange = () => {
      state[key] = $(key).value; state.example = false; selectScope(); preparePair(); if (state.scope === 'selection' && !targetRow) refresh();
    });
    for (const key of ['effect','variant','layer','direction','color','intensity','duration']) {
      $(key).addEventListener('input', () => {
        const next = {...state.settings}, value = $(key).value;
        if (key === 'duration') next.durationMs = Number(value);
        else if (key === 'intensity') next.intensity = Number(value) / 100;
        else next[key] = value;
        if (key === 'effect') next.variant = value === 'draw' ? 'ink' : 'default';
        edit(next,key);
      });
    }
    $('close').onclick = () => dialog.close();
    dialog.addEventListener('close', close);
    $('play').onclick = play;
    $('end').onclick = () => { stop(); held = 1; holdElapsed = timeline(); $('progress').value = 100; draw(); };
    $('progress').oninput = () => { stop(); holdElapsed = timeline()*Number($('progress').value)/100; held = duration() ? Math.min(1,holdElapsed/duration()) : Number($('progress').value)>0 ? 1 : 0; draw(); };
    $('example').onclick = () => { state.example = true; preparePair(); };
    $('save').onclick = () => publish(false); $('reset').onclick = () => publish(true);
    $('discard').onclick = () => { if (isSelection()) selections.clear(state.target); else store.clearDraft(scope()); selectScope(); };
    $('reload').onclick = () => {
      if (isSelection()) selections.clear(state.target); else store.clearDraft(scope());
      state.dirty = false; refresh();
    };
    $('camera-on').onclick = enableCamera; $('camera-backdrop').onchange = () => draw();
    $('camera-off').onclick = () => { K.transitionCamera.stop('editor'); $('camera-off').hidden = true; $('camera-status').textContent = 'Camera preview released.'; controls?.setCameraStatus?.($('camera-status').textContent); draw(); };
    $('camera').ontoggle = () => { if ($('camera').open) refreshDevices(); };
    function updateGlass(value) {
      const field = Object.keys(value).filter(key => state.settings.glass[key] !== value[key]).join(',');
      if (field) edit({...state.settings,glass:value}, 'glass.' + field);
    }
    controls = glass?.mountControls($('glass'), store.defaults.glass, updateGlass, {
      getForeground:() => state.assets?.b?.separated ? state.assets.b.layer : null,
      requestCamera:() => { $('camera').open = true; return enableCamera(); }
    });
    handles = glass?.attachHandles($('stage'), () => state.settings?.glass || store.defaults.glass, updateGlass);
  }
  function isSelection() { return state.scope === 'selection'; }
  function canSave() { return !writing && (isSelection() ? !!targetRow : state.scope !== 'route' || state.from !== state.to); }
  function scope() {
    if (state.scope === 'page') return {from:'*',to:state.to};
    return state.scope === 'route' ? {from:state.from,to:state.to} : {};
  }
  function entry(s = scope()) {
    if (isSelection()) return targetRow?.revision && targetRow.settings;
    if (!s.from) return state.manifest?.default;
    return state.manifest?.routes.find(r => r.from === s.from && r.to === s.to)?.settings;
  }
  function effective() {
    if (isSelection()) return targetRow?.settings || store.defaults;
    if (state.scope === 'default') return state.manifest?.default || store.defaults;
    const s = scope(); return store.resolve(state.manifest,s.from,s.to);
  }
  function selectScope() {
    history.length = 0; lastEdit = '';
    const draft = isSelection() ? selections.draft(state.target)?.settings : store.getDraft(scope());
    state.settings = copy(draft || effective() || store.defaults);
    state.dirty = !!draft;
    $('from').disabled = $('to').disabled = isSelection();
    $('inheritance').textContent = isSelection() ? 'Applies only to '+state.selectionLabel+' when it appears.' : state.scope === 'default' ? 'Preview this default between any two pages.' :
      state.scope === 'page' ? 'Applies when arriving from any page. A saved direction takes priority.' :
      entry() ? 'This direction has its own settings.' : 'This direction inherits the destination or app default.';
    $('reset').textContent = isSelection() ? 'Reset selection' : state.scope === 'default' ? 'Reset app default' : 'Remove override';
    $('status').textContent = draft ? 'Unsaved draft on this device.' : (isSelection() ? targetError || (!targetRow ? 'Loading selected appearance…' : '') : loadError) || 'Showing saved settings.';
    reflect(); rebuild(); historyChange();
  }
  function reflect() {
    const s = state.settings;
    const waiting = isSelection() && !targetRow;
    $('effect').closest('fieldset').disabled = waiting; $('glass').inert = waiting;
    const variants = effects.effects.find(e => e.id === s.effect)?.variants || [];
    $('variant').replaceChildren(...variants.map(v=>option(v.id,v.label))); $('variant-wrap').hidden = variants.length < 2;
    for (const key of ['effect','variant','layer','direction','color']) $(key).value = s[key];
    $('duration').value = s.durationMs; $('duration-value').value = (s.durationMs/1000).toFixed(2) + ' sec';
    $('intensity').value = s.intensity * 100; $('intensity-value').value = Math.round(s.intensity * 100) + '%';
    $('discard').hidden = !state.dirty; $('save').disabled = !canSave();
    $('reset').disabled = writing || !entry(); $('reload').hidden = !(isSelection() ? targetError : loadError);
    $('layer').closest('label').hidden = isSelection();
    $('layer-info').textContent = isSelection() ? 'The effect stays inside the selected item.' : s.layer === 'controls' ? 'Keeps the sky, camera or page background in place while the foreground moves.' : 'Moves the page background and foreground together.';
    controls?.update(s.glass); handles?.update();
  }
  function historyChange() { dispatchEvent(new Event('studio:transition-history')); }
  function undo() {
    if (!history.length || writing) return;
    const next = history.pop(); lastEdit = ''; applyEdit(next, false);
  }
  function edit(next,key) {
    if (writing || isSelection() && !targetRow) return;
    const now = performance.now();
    if (key !== lastEdit || now - lastEditTime > 650) {
      history.push(copy(state.settings)); if (history.length > 60) history.shift();
    }
    lastEdit = key; lastEditTime = now;
    applyEdit(next, key.startsWith('glass.'));
  }
  function applyEdit(next, onlyGlass) {
    state.settings = next; state.dirty = true;
    try { if (isSelection()) selections.stash(state.target,next,targetRow?.revision); else store.setDraft({...scope(),settings:next}); $('status').textContent = 'Unsaved draft on this device.'; }
    catch(error) { $('status').textContent = 'Unsaved changes · ' + error.message; }
    reflect(); if (isSelection()) { selectedView?.bind?.(next); draw(); } else if (onlyGlass) draw(); else rebuild(); historyChange();
  }
  async function publish(reset) {
    if (!canSave()) return;
    const where = scope(), generation = opened, scoped = isSelection(), t = state.target;
    if (state.scope === 'route' && state.from === state.to) return;
    writing = true; dialog.querySelector('.pt-settings').inert = true; reflect(); $('status').textContent = 'Saving…';
    try {
      const settings = reset ? null : copy(state.settings);
      if (scoped) {
        const revision = selections.draft(t)?.revision ?? targetRow.revision;
        const saved = await window.SleipnirTargetEffects.save(t,settings,revision);
        selections.clear(t);
        if (opened === generation) {targetRow=saved;targetError='';}
      } else {
        const manifest = await store.save({...where,settings});
        store.clearDraft(where); state.manifest = manifest; loadError = '';
        dispatchEvent(new CustomEvent('sleipnir:transitions-saved',{detail:manifest}));
      }
      if (opened === generation) { selectScope(); $('status').textContent = scoped ? (reset ? 'Reset the selected appearance.' : 'Saved the selected appearance.') : reset ? 'Saved inherited settings.' : 'Saved to the app.'; }
    } catch(error) { if (opened === generation) { $('status').textContent = 'Could not save. ' + error.message; $('reload').hidden = false; } }
    finally { writing = false; dialog.querySelector('.pt-settings').inert = false; if (dialog.open) { $('save').disabled = !canSave(); $('reset').disabled = !entry(); historyChange(); } }
  }
  function routes(pages = []) {
    const known = [...screens.keys()];
    for (const name of ['from','to']) {
      const viewable = document.createElement('optgroup'); viewable.label = 'Studio previews';
      for (const route of known) viewable.append(option(route, title(route)));
      const native = document.createElement('optgroup'); native.label = 'Native pages';
      for (const page of pages.filter(p=>!screens.has(p.name)).sort((a,b)=>a.name.localeCompare(b.name))) native.append(option(page.name,page.name));
      $(name).replaceChildren(viewable,native); $(name).value = state[name];
    }
  }
  async function refresh() {
    const generation = opened;
    if (isSelection()) {
      const t=state.target;
      try {
        const row=await window.SleipnirTargetEffects.read(t);
        if (generation!==opened || !isSelection()) return;
        targetRow=row; targetError='';
        if (state.dirty) {reflect(); historyChange();} else selectScope();
      } catch(error) {
        if (generation!==opened || !isSelection()) return;
        targetError=error.message; targetRow=null; $('status').textContent=targetError; reflect();
      }
      return;
    }
    try {
      const manifest = await store.read();
      if (opened !== generation || !dialog.open || isSelection()) return;
      state.manifest = manifest; loadError = '';
      if (state.dirty) { reflect(); historyChange(); } else selectScope();
    } catch(error) { if (opened === generation && dialog.open) { loadError = 'Could not read shared settings. ' + error.message; selectScope(); } }
  }
  async function open(options = {}) {
    if (!dialog) build();
    if (dialog.open) return;
    $('camera-backdrop').checked = K.transitionCamera.wholeAllowed();
    const generation = ++opened; epoch++; snapshots = new Map(); queue = Promise.resolve();
    state.to = K.transitionRoute(K.cur?.id || 'dial'); state.from = state.to === 'HomePage' ? 'Asgard/dial' : 'HomePage';
    state.from = options.from && options.from !== '*' ? options.from : state.from; state.to = options.to || state.to;
    state.scope = ['default','page','route'].includes(options.scope) ? options.scope : options.from === '*' ? 'page' : options.from && options.to ? 'route' : 'default';
    const requested=options.target || ['target','selection'].includes(options.scope);
    state.target=selections.target(options); state.targetBounds=selections.bounds(options.bounds);
    const fields=['layer','part','aisle','store'];
    state.selectionLabel=String(options.targetLabel || fields.map(k=>state.target[k]).find(Boolean) || 'this selection');
    dialog.dataset.ptSelectionLabel=state.selectionLabel; targetRow=null; targetError='';
    $('scope').querySelector('[value=selection]').hidden=!requested;
    if(requested) {state.scope='selection';state.to=state.target.page || state.to;}
    state.example = false; state.assets = null; $('scope').value = state.scope;
    previousCovered = K.previewCovered; K.previewCovered = true; dialog.showModal();
    routes(); selectScope(); preparePair(); refresh();
    dispatchEvent(new CustomEvent('studio:transition-editor-opened',{detail:{...options,group:options.group || '',embedded}}));
    inventoryJob ||= fetch('original-page-inventory.json').then(r=>{if(!r.ok)throw Error(r.status);return r.json();}).then(j=>j.pages).catch(e=>{inventoryJob=null;throw e;});
    try { const pages = await inventoryJob; if (opened === generation && dialog.open) routes(pages); }
    catch { if (opened === generation && dialog.open) $('status').textContent = 'Native page inventory could not load. Reopen to retry.'; }
  }
  function close() {
    ++opened; ++epoch; selectedView?.dispose?.(); selectedView=null; stop(); cancelAnimationFrame(tickId); tickId = 0; animation?.dispose(); animation = null;
    K.previewCovered = embedded ? true : previousCovered; K.transitionCamera.stop();
    $('camera-off').hidden = true;
    dispatchEvent(new Event('studio:transition-editor-closed'));
    if (embedded) window.parent.postMessage({type:'studio-transition-back'},location.origin);
    frame?.remove(); frame = frameReady = null; snapshots?.clear(); state.assets = null;
  }
  function captureFrame(id) {
    if (frameReady) return frameReady;
    const f = document.createElement('iframe'); frame = f;
    f.className = 'pt-frame'; f.width = K.W; f.height = K.H; f.inert = true; f.tabIndex = -1;
    f.title = 'Studio scene capture'; f.setAttribute('aria-hidden','true'); f.setAttribute('allow',"camera 'none'; microphone 'none'");
    const url = new URL(location.pathname,location.href); url.searchParams.set('transition-frame','1'); url.hash = id;
    frameReady = (async () => {
      f.src = url; document.body.append(f);
      const cutoff = performance.now()+25000;
      while (f.isConnected && performance.now()<cutoff) {
        if (f.contentWindow?.StudioKit?.ready) { const kit = f.contentWindow.StudioKit; await within(kit.ready,25000); return kit; }
        await sleep(75);
      }
      throw Error('The Studio preview could not start.');
    })();
    return frameReady;
  }
  function snapshot(route) {
    if (snapshots.has(route)) return snapshots.get(route);
    const id = screens.get(route), generation = opened, cache = snapshots;
    const job = queue.then(async () => {
      if (generation !== opened) throw Error('Preview closed.');
      const kit = await captureFrame(id);
      if (generation !== opened) throw Error('Preview closed.');
      kit.previewCovered = false;
      if (kit.cur?.id !== id) await within(kit.show(id,{fromPop:true}),25000);
      if (generation !== opened) throw Error('Preview closed.');
      // Settle the authored entrance even if this offscreen frame is throttled.
      // The editor never advances the actual page the owner is working on.
      const now = performance.now();
      const frameNow = frame.contentWindow.performance.now();
      for (let n = 0; n < 120; n++) kit.cur.update(1/30, frameNow + n * (1000/30));
      await sleep(Math.max(100, 350 - (performance.now()-now)));
      await within(kit.preparePageSky?.(id) || Promise.resolve(),6000).catch(()=>{});
      const result = kit.captureTransitionScreen(id); kit.previewCovered = true;
      if (!result) throw Error(title(route) + ' could not be captured.');
      result.hasSky = () => id !== 'sky' && kit.hasPageSky?.(id);
      result.drawSky = ctx => {
        ctx.save(); ctx.setTransform(ctx.canvas.width/kit.W,0,0,ctx.canvas.height/kit.H,0,0);
        try { kit.drawPageSky?.(ctx,id); } finally { ctx.restore(); }
      };
      result.cameraBackground = result.seeThrough && kit.cur.P['bg.mode'] === 'camera' ? Object.fromEntries(Object.entries(kit.cur.P).filter(([key])=>key.startsWith('bg.'))) : null;
      return result;
    });
    queue = job.catch(()=>{}); cache.set(route,job);
    job.catch(()=>{if(cache.get(route) === job)cache.delete(route);});
    return job;
  }
  function surface(source) {
    const c = document.createElement('canvas'); c.width = source.width; c.height = source.height; return c;
  }
  function duplicateScene(target, source) {
    const c = target.getContext('2d'); c.clearRect(0,0,target.width,target.height); c.drawImage(source,0,0,target.width,target.height); return c;
  }
  function setPreview(enabled) {
    for (const id of ['play','end','progress']) $(id).disabled = !enabled;
    $('stage').style.visibility = enabled ? '' : 'hidden';
  }
  function attachHandles(node) {
    handles?.dispose(); handles = glass?.attachHandles(node,()=>state.settings.glass,
      value=>{const field=Object.keys(value).filter(k=>value[k]!==state.settings.glass[k]).join(',');if(field)edit({...state.settings,glass:value},'glass.'+field);});
  }
  async function preparePair() {
    selectedView?.dispose?.(); selectedView=null; attachHandles($('stage'));
    stop(); animation?.dispose(); animation = null; state.assets = null; setPreview(false);
    const ticket = ++epoch, from = state.example ? 'HomePage' : state.from, to = state.example ? 'Asgard/dial' : state.to;
    if(isSelection()) {
      const t=state.target;
      $('stage').hidden=false; $('example').hidden=true;
      $('caption').textContent='Selected appearance · '+state.selectionLabel;
      $('preview-status').textContent='Loading the selected source…';
      try {
        const preview=await selections.load({target:t,bounds:state.targetBounds,stage:$('stage'),canvas:$('canvas'),label:state.selectionLabel,
          current:()=>ticket===epoch && dialog.open,scene:screens.has(t.page)?()=>snapshot(t.page):null});
        if(ticket!==epoch || !dialog.open){preview.dispose?.();return;}
        selectedView=preview;
        if(!preview.node){$('stage').hidden=true;$('preview-status').textContent=preview.message;return;}
        setPreview(true); attachHandles(preview.node); $('caption').textContent=preview.label;
        $('preview-status').textContent='Ready to preview the selected appearance.';rebuild();
      } catch(error) {if(ticket===epoch){$('stage').hidden=true;$('preview-status').textContent='The selected source could not load. '+error.message;}}
      return;
    }
    const available = screens.has(from) && screens.has(to); $('example').hidden = available; $('example').textContent = 'Preview with Home and Raven dial';
    $('stage').hidden = !available;
    $('caption').textContent = (state.example ? 'Example · ' : '') + title(from) + ' → ' + title(to);
    if (!available) { $('preview-status').textContent = 'A Studio preview is unavailable for ' + [from,to].filter(r=>!screens.has(r)).map(title).join(' and ') + '. You can still save its settings.'; return; }
    $('preview-status').textContent = 'Loading the two Studio pages…';
    try {
      const [a,b] = await Promise.all([snapshot(from),snapshot(to)]);
      if (ticket !== epoch || !dialog.open) return;
      state.assets = {a,b}; const c = $('canvas'); c.width = b.full.width; c.height = b.full.height;
      $('stage').parentElement.style.setProperty('--pt-aspect',String(c.width/c.height));
      fromWork = surface(a.base); toWork = surface(b.base); srcFull = surface(a.full); dstFull = surface(b.full);
      $('preview-status').textContent = !a.separated || !b.separated ? 'This view draws one combined layer. Its preview moves with the whole page.' : 'Ready to preview.';
      setPreview(true); rebuild(); handles?.update();
    } catch(error) {
      if (ticket !== epoch || !dialog.open) return;
      $('preview-status').textContent = error.message;
      $('example').hidden = false; $('example').textContent = 'Retry with Home and Raven dial';
    }
  }
  function duration() { return reduced.matches || state.settings?.effect === 'off' ? 0 : state.settings?.durationMs || 0; }
  function timeline() {
    const g = state.settings?.glass;
    return Math.max(duration(), g?.material !== 'none' && g?.show === 'window' ? g.delayMs + g.visibleMs : 0);
  }
  function clock(elapsed) { return {elapsedMs:elapsed,transitionMs:duration(),camera:K.transitionCamera.source(),mirror:K.transitionCamera.mirrored()}; }
  function updatePlanes(elapsed) {
    const {a,b} = state.assets, g = state.settings.glass;
    const pageBase = (target,scene) => {
      const ctx = duplicateScene(target,scene.underSky || scene.base);
      if ($('camera-backdrop').checked && scene.cameraBackground) K.transitionCamera.draw(target,scene.cameraBackground);
      if (scene.hasSky()) scene.drawSky(ctx);
      return ctx;
    };
    pageBase(fromWork,a); const c = pageBase(toWork,b);
    if (b.separated && g?.material !== 'none') glass?.draw(c,g,null,toWork.width,toWork.height,clock(elapsed));
    const src = duplicateScene(srcFull,fromWork), dst = duplicateScene(dstFull,toWork);
    src.drawImage(a.layer,0,0); dst.drawImage(b.layer,0,0);
  }
  function rebuild() {
    if (isSelection()) {
      if (!selectedView?.node) return;
      stop(); held=1; holdElapsed=timeline(); $('progress').value=100; selectedView.bind(state.settings); selectedView.seek(1,holdElapsed);return;
    }
    if (!state.assets || !dialog.open) return;
    stop(); animation?.dispose();
    const {a,b} = state.assets; held = 1; holdElapsed = timeline();
    updatePlanes(holdElapsed);
    const settings = {...state.settings};
    if (!a.separated || !b.separated) settings.layer = 'page';
    animation = effects.prepare({...settings, from:srcFull,to:dstFull,fromBase:fromWork,toBase:toWork,fromLayer:a.layer,toLayer:b.layer});
    $('progress').value = 100; draw();
  }
  function stop() { playStart = null; if (dialog) $('play').textContent = 'Play transition'; }
  function draw(now = performance.now()) {
    cancelAnimationFrame(tickId); tickId = 0;
    if (!dialog.open || (isSelection() ? !selectedView?.node : !animation || !state.assets)) return;
    let elapsed = holdElapsed, progress = held;
    if (playStart != null) {
      elapsed = Math.max(0, now-playStart);
      progress = duration() && !reduced.matches ? Math.min(1,elapsed/duration()) : 1;
      held = progress; holdElapsed = elapsed;
      const end = timeline(); $('progress').value = end ? Math.min(100,Math.round(elapsed/end*100)) : 100;
      if (elapsed >= end) stop();
    }
    if (isSelection()) {
      selectedView.seek(progress,elapsed);
      if(playStart!=null || state.settings.glass.source==='camera' && K.transitionCamera.source()) tickId=requestAnimationFrame(draw);
      return;
    }
    updatePlanes(elapsed); animation.draw($('canvas').getContext('2d'),progress);
    const feed = K.transitionCamera.source();
    const {a,b} = state.assets;
    if ((feed && (($('camera-backdrop').checked && (a.cameraBackground || b.cameraBackground)) || state.settings.glass.source === 'camera')) || a.hasSky() || b.hasSky() || playStart != null) tickId = requestAnimationFrame(draw);
  }
  function play() {
    if (isSelection() ? !selectedView?.node : !animation) return;
    if (playStart != null) { stop(); draw(); return; }
    rebuild();
    playStart = performance.now(); $('play').textContent = 'Pause preview'; draw(playStart);
    if (reduced.matches) $('preview-status').textContent = 'Reduced motion is on. The destination appears immediately.';
  }
  async function refreshDevices() {
    const input = $('device'), old = input.value;
    try { const options = await K.transitionCamera.devices(); input.replaceChildren(...options.map(d=>option(d.value,d.label))); input.value = options.some(o=>o.value===old) ? old : ''; }
    catch { $('camera-status').textContent = 'Camera device names are unavailable.'; }
  }
  async function enableCamera() {
    const generation = opened;
    $('camera-status').textContent = 'Opening the selected camera…'; $('camera-on').disabled = true;
    try {
      const status = await K.transitionCamera.start($('facing').value,$('device').value);
      if (generation !== opened || !dialog.open) return;
      $('camera-status').textContent = status.message; controls?.setCameraStatus?.(status.message);
      $('camera-off').hidden = !status.live; await refreshDevices(); draw();
    } catch(error) { if (generation === opened && dialog.open) $('camera-status').textContent = error.message; }
    finally { $('camera-on').disabled = false; }
  }
  addEventListener('studio:sky-render-changed', () => { if (dialog?.open && state.assets) draw(); });
  document.addEventListener('click', e => { if (e.target.closest('[data-open-transitions]')) open(); });
  window.SleipnirTransitionEditor = Object.freeze({open,undo,canUndo:() => !!history.length && !writing});
  if (params.get('transitionEditor') === '1') addEventListener('DOMContentLoaded', async () => {
    await K.ready; open(Object.fromEntries(params));
  },{once:true});
})();
