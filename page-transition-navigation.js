/* Play the owner's saved transitions on the ordinary Studio phone preview. */
(() => {
  'use strict';
  if (new URLSearchParams(location.search).has('transition-frame')) return;
  const kit = window.StudioKit, store = window.SleipnirTransitionStore;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let manifest, pending, playback, cameraLease = false, revision = 0;
  let current = {from: null, to: null, entered: performance.now(), duration: 0};

  function settings(route = current) {
    return store.resolve(manifest, route.from, route.to || kit.transitionRoute(kit.cur?.id));
  }
  function clock(route = current) {
    return {elapsedMs: Math.max(0, performance.now() - route.entered), transitionMs: route.duration,
      camera: kit.transitionCamera?.source?.(), mirror: kit.transitionCamera?.mirrored?.() || false};
  }
  function refreshCamera() {
    const camera = kit.transitionCamera;
    if (!camera) return;
    const glass = settings().glass;
    const needed = !!kit.cur?.loaded && !document.hidden && !kit.previewCovered && glass?.source === 'camera' &&
      glass.material !== 'none' && camera.paneAllowed?.() && window.PageGlass?.visible(glass, clock());
    if (Boolean(needed) === cameraLease) return;
    cameraLease = Boolean(needed);
    if (cameraLease) camera.start(undefined, undefined, 'page').catch(() => {});
    else camera.stop('page');
  }
  window.SleipnirTransitionNavigation = {
    currentGlass() { refreshCamera(); return settings().glass; },
    currentGlassClock: () => clock()
  };
  function accept(data) {
    if (!data?.default || !Array.isArray(data.routes)) return;
    manifest = data;
    refreshCamera();
  }
  function read() {
    const serial = ++revision;
    store.read().then(data => { if (serial === revision) accept(data); }).catch(() => {});
  }
  window.addEventListener('sleipnir:transitions-saved', e => { ++revision; accept(e.detail); });
  read();
  window.addEventListener('pageshow', event => { if (event.persisted) read(); });

  function stop() {
    pending = null;
    if (!playback) return;
    const old = playback;
    playback = null;
    old.run?.cancel();
    old.output.remove();
  }
  function baseSource(id, planes, route, routeSettings) {
    const glass = routeSettings.glass, raw = planes.base;
    if (!planes.separated) return raw;
    if (!planes.seeThrough && !planes.underSky && (!glass || glass.material === 'none')) return raw;
    const base = document.createElement('canvas');
    base.width = raw.width; base.height = raw.height;
    const ctx = base.getContext('2d');
    return () => {
      if (!kit.captureTransitionBackground(id, base, planes)) {
        ctx.clearRect(0, 0, base.width, base.height);
        ctx.drawImage(raw, 0, 0);
      }
      if (glass?.material && glass.material !== 'none') {
        window.PageGlass.draw(ctx, glass, null, base.width, base.height, clock(route));
      }
      return base;
    };
  }

  function place(output, stage) {
    const wrap = stage.parentElement;
    output.style.cssText = 'position:absolute;pointer-events:none;z-index:1;display:block;';
    output.style.left = stage.offsetLeft + 'px';
    output.style.top = stage.offsetTop + 'px';
    output.style.width = stage.offsetWidth + 'px';
    output.style.height = stage.offsetHeight + 'px';
    output.style.borderRadius = getComputedStyle(stage).borderRadius;
    output.setAttribute('aria-hidden', 'true');
    output.width = stage.width; output.height = stage.height;
    wrap.append(output);
  }
  window.addEventListener('studio:page-leaving', event => {
    stop();
    const {from, to} = event.detail;
    if (from === to || reduced.matches || kit.previewCovered) return;
    const target = {from:kit.transitionRoute(from), to:kit.transitionRoute(to)};
    const next = settings(target);
    if (!next || next.effect === 'off') return;
    const planes = kit.captureTransitionScreen(from);
    if (planes) pending = {from,to,planes,previous:current,priorSettings:settings(),next};
  });
  window.addEventListener('studio:page-shown', event => {
    const {from,to} = event.detail, saved = pending;
    pending = null;
    if (kit.cur?.id !== to) return;
    current = {from:kit.transitionRoute(from), to:kit.transitionRoute(to), entered:performance.now(), duration:0};
    const willPlay = saved && saved.from === from && saved.to === to && !reduced.matches && !kit.previewCovered;
    if (!willPlay) { refreshCamera(); return; }
    const dest = kit.captureTransitionScreen(to), stage = document.getElementById('stage');
    if (!dest || !stage) return;
    current.duration = saved.next.durationMs;
    refreshCamera();
    const source = saved.planes;
    const fromBase = baseSource(from, source, saved.previous, saved.priorSettings);
    const toBase = baseSource(to, dest, current, saved.next);
    function full(planes, base) {
      if (typeof base !== 'function') return planes.full;
      const c = document.createElement('canvas');
      c.width = planes.full.width; c.height = planes.full.height;
      const ctx = c.getContext('2d');
      return () => {
        ctx.clearRect(0, 0, c.width, c.height);
        ctx.drawImage(base(), 0, 0);
        ctx.drawImage(planes.layer, 0, 0);
        return c;
      };
    }
    const options = saved.next.layer === 'controls' && source.separated && dest.separated
      ? {fromLayer:source.layer,toLayer:dest.layer,fromBase,toBase}
      : {from:full(source, fromBase),to:full(dest, toBase)};
    const output = document.createElement('canvas');
    place(output, stage);
    const active = {output,run:null}; playback = active;
    try {
      active.run = window.SleipnirSceneTransitions.play({...options,settings:saved.next,canvas:output,
        onFinish:() => { output.remove(); if (playback === active) playback = null; }});
    } catch (error) {
      stop(); console.warn('Studio page transition could not be drawn.', error);
    }
  });
  function onCoverChange() {
    if (kit.previewCovered) stop();
    refreshCamera();
  }
  window.addEventListener('studio:transition-editor-opened', onCoverChange);
  window.addEventListener('studio:transition-editor-closed', onCoverChange);
  const storeEditor = document.getElementById('store-workspace');
  if (storeEditor) new MutationObserver(onCoverChange).observe(storeEditor,{attributes:true,attributeFilter:['open']});
  window.addEventListener('resize', stop);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); refreshCamera(); });
  window.addEventListener('pagehide', () => {
    stop();
    if (cameraLease) { cameraLease = false; kit.transitionCamera.stop('page'); }
  });
})();
