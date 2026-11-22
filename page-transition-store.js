(function (root) {
  'use strict';

  const glassDefaults = Object.freeze({
    material: 'none', tint: '#91c9db', transmission: .9, frost: 0,
    x: .08, y: .66, width: .84, height: .22, shape: 'rounded',
    source: 'scene', show: 'always', delayMs: 0, visibleMs: 1500
  });
  const defaults = Object.freeze({
    effect: 'off', variant: 'default', intensity: 0.65, durationMs: 900,
    direction: 'forward', layer: 'controls', color: '#75e9ff', seed: 1, glass: glassDefaults
  });
  const pageId = /^[A-Za-z][A-Za-z0-9_]{0,79}(\/[A-Za-z][A-Za-z0-9_-]{0,39})?$/;
  const known = new Map();
  const draftPrefix = 'sleipnir.transitions.v1.';
  let readGeneration = 0;

  function scope({from = '', to = ''} = {}) {
    if (typeof from !== 'string' || typeof to !== 'string' ||
        ((from || to) && ((from !== '*' && !pageId.test(from)) || !pageId.test(to)))) {
      throw new Error('Choose both transition pages or the app default.');
    }
    return {from, to, key: JSON.stringify([from, to])};
  }

  function inRange(n, min, max) {
    return Number.isFinite(n) && n >= min && n <= max;
  }

  function checkedGlass(value = {}) {
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
        Object.keys(value).some(key => !Object.hasOwn(glassDefaults, key))) {
      throw new Error('Invalid glass layer settings.');
    }
    const g = {...glassDefaults, ...value};
    if (!['none','clear','frosted','tinted'].includes(g.material) ||
        !['scene','camera'].includes(g.source) || !['always','during','after','window'].includes(g.show) ||
        !Number.isInteger(g.delayMs) || !inRange(g.delayMs, 0, 60000) ||
        !Number.isInteger(g.visibleMs) || !inRange(g.visibleMs, 100, 60000) ||
        !['rounded','rectangle','ellipse'].includes(g.shape) || typeof g.tint !== 'string' ||
        !/^#[a-f0-9]{6}$/i.test(g.tint) || !inRange(g.frost, 0, 1) || !inRange(g.transmission, 0, 1) ||
        !inRange(g.width, .04, 1) || !inRange(g.height, .04, 1) ||
        !inRange(g.x, 0, 1.000000001 - g.width) || !inRange(g.y, 0, 1.000000001 - g.height)) {
      throw new Error('Keep the glass within the page and check its material settings.');
    }
    return {...g, tint: g.tint.toLowerCase()};
  }

  function checked(s) {
    if (!s || typeof s !== 'object' || Array.isArray(s) ||
        Object.keys(s).some(k => !(Object.hasOwn(defaults, k))) ||
        !['off','draw','filaments','aperture','mesh','glass'].includes(s.effect) ||
        !(s.effect === 'draw' ? ['ink','pencil','wireframe'].includes(s.variant) : s.variant === 'default') ||
        !['forward','reverse'].includes(s.direction) || !['controls','page'].includes(s.layer) ||
        !inRange(s.intensity, 0, 1) || !Number.isInteger(s.durationMs) || !inRange(s.durationMs, 200, 4000) ||
        !Number.isInteger(s.seed) || !inRange(s.seed, 1, 2147483647) ||
        typeof s.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(s.color)) {
      throw new Error('Invalid page transition settings.');
    }
    return {...s, color: s.color.toLowerCase(), glass: checkedGlass(s.glass)};
  }

  function manifest(value) {
    if (value?.version !== 1 || !Array.isArray(value.routes)) {
      throw new Error('The app returned an invalid transition manifest.');
    }
    return {version: 1, default: checked(value.default), routes: value.routes.map(route => {
      const {from, to} = scope(route);
      if (!from) throw new Error('The app returned an unnamed transition route.');
      return {from, to, settings: checked(route.settings)};
    })};
  }

  function entry(data, from, to) {
    if (!from && !to) return data.default;
    return data.routes.find(route => route.from === from && route.to === to)?.settings || null;
  }

  function resolve(data, from, to) {
    if (!data) return defaults;
    return entry(data, from, to) || (to ? entry(data, '*', to) : null) || data.default;
  }

  function request(name, body, auth) {
    return root.StudioJobs.request('/rest/v1/rpc/' + name, {method: 'POST', body, auth}).then(manifest);
  }

  async function read() {
    const generation = ++readGeneration;
    const data = await request('studio_page_transition_manifest', {}, false);
    if (generation === readGeneration) {
      known.clear();
      known.set(scope().key, checked(data.default));
      for (const route of data.routes) known.set(scope(route).key, checked(route.settings));
    }
    return data;
  }

  function draftRecord(key) {
    try {
      const item = JSON.parse(root.localStorage.getItem(draftPrefix + key));
      if (!item || !Object.hasOwn(item, 'settings')) return null;
      return {
        settings: item.settings === null ? null : checked(item.settings),
        ...(Object.hasOwn(item, 'base') ? {base: item.base === null ? null : checked(item.base)} : {})
      };
    } catch {
      return null;
    }
  }

  // The owner's browser may retain an unsubmitted edit across navigation. Its
  // original base travels with it, so resuming it cannot overwrite newer work.
  function setDraft(edit) {
    const {key} = scope(edit);
    const previous = draftRecord(key);
    const record = {settings: edit.settings === null ? null : checked(edit.settings)};
    if (previous && Object.hasOwn(previous, 'base')) record.base = previous.base;
    else if (known.has(scope().key)) record.base = known.get(key) || null;
    root.localStorage.setItem(draftPrefix + key, JSON.stringify(record));
    return record.settings;
  }

  function getDraft(where = {}) {
    return draftRecord(scope(where).key)?.settings ?? null;
  }

  function clearDraft(where = {}) {
    root.localStorage.removeItem(draftPrefix + scope(where).key);
  }

  async function save(edit) {
    const {from, to, key} = scope(edit);
    const settings = edit.settings === null ? null : checked(edit.settings);
    const draft = draftRecord(key);
    let base;
    if (Object.hasOwn(edit, 'expectedSettings')) base = edit.expectedSettings;
    else if (draft && Object.hasOwn(draft, 'base')) base = draft.base;
    else {
      if (!known.has(scope().key)) await read();
      base = known.get(key) || null;
    }
    const data = await request('studio_save_page_transition', {
      p_from: from, p_to: to, p_settings: settings, p_expected_settings: base
    }, true);
    // Invalidate outstanding reads so a slower old response cannot reset the
    // baseline for a later save. Other routes keep their own original baselines.
    ++readGeneration;
    const saved = entry(data, from, to);
    known.set(key, saved ? checked(saved) : null);
    return data;
  }

  root.SleipnirTransitionStore = Object.freeze({defaults, checked, read, save, resolve, getDraft, setDraft, clearDraft});
})(window);
