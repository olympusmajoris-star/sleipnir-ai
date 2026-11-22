/* Sky drafts stay private until the Studio owner publishes this page. */
(function (root) {
  'use strict';
  const defaults = Object.freeze({features: Object.freeze({})});
  const routePattern = /^[A-Za-z][A-Za-z0-9_]{0,79}(\/[A-Za-z][A-Za-z0-9_-]{0,39})?$/;
  const origin = 'https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/';
  const backgrounds = ['asgard_ui/raven_sky/clouds_v1.jpg', 'asgard_ui/raven_sky/midgard_v1.jpg', 'black%20hole/86697_web.jpg'];
  const fields = ['enabled', 'schedule', 'opacity', 'scale', 'x', 'y'];
  const has = (o, key) => Object.hasOwn(o, key);
  const dict = o => o !== null && typeof o === 'object' && !Array.isArray(o);
  const keysOnly = (o, keys) => dict(o) && Object.keys(o).every(k => keys.includes(k));
  const between = (n, lo, hi) => Number.isFinite(n) && n >= lo && n <= hi;

  function assetURL(url, kind) {
    if (kind === 'streamers' || typeof url !== 'string' || !url.startsWith(origin) || url.length > 2000) return false;
    const path = url.slice(origin.length);
    if (path === 'asgard_ui/raven_v3/ic_raven.webp') return kind === 'raven';
    if (backgrounds.includes(path)) return kind === 'background' || kind === 'stars';
    if (!/^(studio|studio-published-media)\/.+/u.test(path)) return false;
    const decoded = path.replace(/%20/g, ' ').replace(/%28/g, '(').replace(/%29/g, ')').replace(/%2c/ig, ',');
    return !/[\x00-\x1f\x7f?#%\\]/u.test(decoded) && !/(^|\/)\.{1,2}(\/|$)|\/\//u.test(decoded) &&
      /\.(?:png|jpe?g|webp|avif|gif)$/iu.test(decoded);
  }

  function checked(settings) {
    if (!keysOnly(settings, ['features','day_start','night_start','day_url','night_url']) ||
        !keysOnly(settings.features,['stars','streamers','raven'])) throw Error('Invalid page sky settings.');
    const value = {...settings, features:{}};
    for (const key of ['day_start','night_start']) {
      if (has(settings,key) && (!Number.isInteger(settings[key]) || !between(settings[key],0,23))) {
        throw Error('Choose local day and night hours between 0 and 23.');
      }
    }
    if ((settings.day_start ?? 6) === (settings.night_start ?? 19)) throw Error('Day and night must begin at different hours.');
    for (const key of ['day_url','night_url']) {
      if (has(settings,key) && !assetURL(settings[key],'background')) throw Error('Choose a background from Studio media.');
    }
    for (const [id, f] of Object.entries(settings.features)) {
      if (!keysOnly(f,[...fields,'asset_url']) || !fields.every(k => has(f,k)) || typeof f.enabled !== 'boolean' ||
          !['day','night','both'].includes(f.schedule) || !between(f.opacity,0,1) || !between(f.scale,.2,3) ||
          !between(f.x,0,1) || !between(f.y,0,1) || (has(f,'asset_url') && !assetURL(f.asset_url,id))) {
        throw Error('Check the '+id+' sky settings and its selected media.');
      }
      value.features[id] = {...f};
    }
    return value;
  }

  function pageId(page) {
    if (typeof page !== 'string' || !routePattern.test(page)) throw Error('Choose a page or scene in Studio.');
    return page;
  }
  function revision(value) {
    if (!Number.isSafeInteger(value) || value < 0) throw Error('Reload the sky settings before making this edit.');
    return value;
  }
  const levels = ['store','aisle','part','layer'];
  function scope(raw) {
    if (raw == null) return {};
    if (!keysOnly(raw,levels)) throw Error('Choose a valid sky target.');
    const value = {};
    for (const level of levels) {
      if (!has(raw,level)) continue;
      const id=raw[level];
      if (typeof id !== 'string' || !id.length || id !== id.trim() || [...id].length>180 || /[\x00-\x1f\x7f]/u.test(id)) {
        throw Error('Use the original item, layer, aisle, or store ID.');
      }
      value[level]=id;
    }
    if ((value.aisle && !value.store) || (value.store && !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/u.test(value.store))) {
      throw Error('Choose the wired store that owns this target.');
    }
    if (new TextEncoder().encode(JSON.stringify(value)).length>1200) throw Error('This sky target ID is too large.');
    return value;
  }
  async function publicRPC(name, body) {
    if (!['studio_page_sky_published','studio_resolve_page_sky','studio_target_effects'].includes(name)) {
      throw Error('Unknown public scene reader.');
    }
    const path='/rest/v1/rpc/'+name;
    if (root.StudioJobs?.request) return root.StudioJobs.request(path,{method:'POST',body,auth:false});
    const config=root.StudioTransferConfig;
    if (!config?.url || !config.key) throw Error('Public scene settings are unavailable.');
    const response=await root.fetch(config.url+path,{
      method:'POST',cache:'no-store',credentials:'omit',
      headers:{apikey:config.key,Authorization:'Bearer '+config.key,'Content-Type':'application/json'},
      body:JSON.stringify(body)
    });
    if (!response.ok) throw Error('The published scene could not load ('+response.status+').');
    return response.json();
  }
  async function request(name, page, body, auth, target, resolve = false) {
    const where = scope(target), scoped=Object.keys(where).length > 0;
    const params={p_page:pageId(page), ...body, ...((scoped || resolve) ? {p_target:where} : {})};
    if (auth && !root.StudioJobs?.request) throw Error('Connect the Studio owner before editing a sky.');
    const result = auth
      ? await root.StudioJobs.request('/rest/v1/rpc/'+name,{method:'POST',body:params,auth:true})
      : await publicRPC(name,params);
    if (result?.page !== page || JSON.stringify(scope(result?.target)) !== JSON.stringify(where)) {
      throw Error('The returned sky belongs to a different page or target.');
    }
    const value = {page, settings:checked(result.settings), revision:revision(result.revision), publishedRevision:revision(result.publishedRevision)};
    if (scoped) value.target=where;
    if (resolve) {
      value.exactSettings=checked(result.exactSettings);
      if (!Array.isArray(result.sources)) throw Error('The returned sky is missing its source revisions.');
      value.sources=result.sources.map(s => ({target:scope(s.target), revision:revision(s.revision)}));
    }
    return value;
  }
  const read = (page,target) => request('studio_page_sky_published',page,{},false,target);
  const draft = (page,target) => request('studio_page_sky_draft',page,{},true,target);
  const resolve = (page,target) => request('studio_resolve_page_sky',page,{},false,target,true);
  const save = (page,settings,expectedDraftRevision,target) => request('studio_save_page_sky_draft',page,
    {p_settings:checked(settings),p_expected_draft_revision:revision(expectedDraftRevision)},true,target);
  async function publish(page,expectedDraftRevision,expectedPublishedRevision,target) {
    const saved = await request('studio_publish_page_sky',page,{
      p_expected_draft_revision:revision(expectedDraftRevision),p_expected_published_revision:revision(expectedPublishedRevision)
    },true,target);
    // Notify ordinary preview windows only after the owner publication succeeds.
    const detail = {page,settings:saved.settings,publishedRevision:saved.publishedRevision,
      ...(saved.target ? {target:saved.target} : {})};
    root.dispatchEvent(new CustomEvent('sleipnir:sky-published',{detail}));
    if (typeof root.BroadcastChannel === 'function') {
      try {
        const channel=new root.BroadcastChannel('sleipnir:sky-published');
        try { channel.postMessage(detail); } finally { channel.close(); }
      } catch { /* Browsers with isolated storage still receive the local event. */ }
    }
    return saved;
  }
  root.SleipnirPageSky = Object.freeze({defaults, assetURL, pageId, scope, publicRPC, read, draft, save, publish, resolve});
})(window);
