/* Shared published sky settings are read on demand by the Studio scene painters. */
(() => {
  'use strict';
  const kit = window.StudioKit;
  const draftFrame = new URLSearchParams(location.search).has('sky-editor-frame');
  const drafts = new Map();
  let host = window;
  try { if (window.top.location.origin === location.origin) host = window.top; } catch {}
  const cache = host.__sleipnirPublishedSkyCache ||= new Map();
  const route = id => kit.transitionRoute(id);
  const now = () => Date.now();
  const refreshMs = 60000;

  function record(page) {
    if (!cache.has(page)) cache.set(page,{settings:null,revision:-1,nextRead:0,request:null,generation:0});
    return cache.get(page);
  }
  function useable(settings) {
    return !!settings && (!!settings.day_url || !!settings.night_url || Object.values(settings.features || {}).some(f => f?.enabled === true));
  }
  function accept(data) {
    if (!data || typeof data.page !== 'string' || !data.settings || typeof data.settings !== 'object') return;
    // A narrower store, aisle or part can publish its own layer. This ordinary
    // page surface has no such target and only displays the page-wide release.
    if (data.target && (typeof data.target !== 'object' ||
      (data.target.page && data.target.page !== data.page) ||
      ['store','aisle','part','layer'].some(key => data.target[key]))) return;
    const entry = record(data.page);
    const revision = Number(data.publishedRevision);
    if (Number.isFinite(revision) && revision < entry.revision) return;
    entry.settings = useable(data.settings) ? data.settings : null;
    entry.revision = Number.isFinite(revision) ? revision : entry.revision;
    entry.nextRead = now()+refreshMs;
    entry.generation++;
    host.dispatchEvent(new CustomEvent('studio:sky-render-changed',{detail:{page:data.page}}));
  }
  function read(page) {
    if (draftFrame || !window.SleipnirPageSky?.read) return Promise.resolve(null);
    const e = record(page);
    if (e.request) return e.request;
    if (e.nextRead > now()) return Promise.resolve(e.settings);
    const generation = e.generation;
    e.request = window.SleipnirPageSky.read(page).then(data => {
      if (e.generation === generation) accept(data);
      return e.settings;
    }).catch(() => { if (e.generation === generation) e.nextRead = now()+15000; return e.settings; })
      .finally(() => { e.request = null; });
    return e.request;
  }
  function active(id) {
    const page = route(id);
    if (draftFrame) return drafts.get(page) || null;
    const entry = record(page);
    if (now() >= entry.nextRead && !entry.request) read(page);
    return entry.settings;
  }
  kit.preparePageSky = id => read(route(id));
  kit.hasPageSky = id => !!active(id);
  kit.previewPageSky = (id, settings, lighting = 'local') => {
    if (!draftFrame) return;
    const page = route(id);
    if (useable(settings)) drafts.set(page,{settings,lighting});
    else drafts.delete(page);
    if (kit.cur?.loaded && route(kit.cur.id) === page) kit.renderNow();
  };
  kit.drawPageSky = (ctx, id, width = kit.W, height = kit.H) => {
    const value = active(id);
    if (!value || !window.SleipnirSkyLayers) return;
    ctx.save();
    try {
      window.SleipnirSkyLayers.draw(ctx,draftFrame ? value.settings : value,width,height,
        {lighting:draftFrame ? value.lighting : 'local',timeSeconds:performance.now()/1000});
    } finally { ctx.restore(); }
  };
  if (draftFrame) return;
  let channel;
  try { channel = new BroadcastChannel('sleipnir:sky-published'); channel.onmessage = e => accept(e.data); } catch {}
  addEventListener('sleipnir:sky-published', e => accept(e.detail));
  addEventListener('message', e => { if (e.origin === location.origin && e.data?.type === 'sleipnir:sky-published') accept(e.data.detail || e.data); });
  addEventListener('pagehide', e => { if (!e.persisted) channel?.close(); });
})();
