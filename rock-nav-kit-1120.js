/* =====================================================================
   ROCK NAV FOR STUDIO KIT 1120 — the floating rune rocks on EVERY Asgard
   screen of the kit studio (all current screens and any registered later),
   with all of their controls.
   Same rock textures (storage studio/navigation/rocks-v1) and the same
   shared settings row (studio_designs id 'navigation') the earlier studio
   and the app runtime use, so the rocks come back exactly as tuned.
   Row order and page names live in that row too ('order', 'labels').
   The Raven (Messages) rock sits last in the row.
   Shared by every Asgard screen. Sleipnir shopping home stays separate.
   ===================================================================== */
(() => {
'use strict';
const K = window.StudioKit, A = window.AsgardRockNav;
if (!K || !A || !A.RockTexture) return;
const SB = 'https://afnihsdxtisneuyehatw.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmbmloc2R4dGlzbmV1eWVoYXR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NjUxMDcsImV4cCI6MjA4NzE0MTEwN30.q94Gw7BVKgyGm-I_XXGaoScVK50MMfQMk2RHms3qhps';
const ROW = SB + '/rest/v1/studio_designs';
const BASE = SB + '/storage/v1/object/public/studio/navigation/rocks-v1/';
const TAU = Math.PI * 2;
const NAME = { home: 'Home', swap: 'Swap', track: 'Track', share: 'Share', messages: 'Raven' };
const DEFAULT_ORDER = ['home', 'swap', 'track', 'share', 'messages'];
const NOT_ASGARD = new Set(['home']); // Sleipnir home is not an Asgard page
const PAGES = { sky: { page: 'home' }, way: { page: 'track' }, dial: { page: 'messages' }, directory: { page: 'messages' }, conversation: { page: 'convo' } };
const ROUTES = { home: 'sky', swap: 'market', track: 'way', share: 'share-post', messages: 'dial' };
const DESTINATIONS = [['sky', 'Asgard posts'], ['market', 'Marketplace'], ['way', 'Wayfinder'], ['horn', 'Gjallarhorn'], ['share-post', 'Share a post'], ['dial', 'Raven dial'], ['directory', 'Raven contacts'], ['conversation', 'Raven conversation']];
const H = extra => Object.assign({ apikey: KEY, Authorization: 'Bearer ' + KEY }, extra);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const clone = x => x === undefined ? x : JSON.parse(JSON.stringify(x));
const seed = n => { const v = Math.sin(n * 127.17 + 91.79) * 43758.5453; return v - Math.floor(v); };
const get = (o, p) => p.split('.').reduce((v, k) => v == null ? v : v[k], o);
function setPath(o, p, v) { const keys = p.split('.'); if (keys.some(k => ['__proto__', 'prototype', 'constructor'].includes(k))) return; let a = o; for (const k of keys.slice(0, -1)) a = a[k] ?? (a[k] = {}); a[keys[keys.length - 1]] = v; }

/* ---------- shared settings ---------- */
function extras(raw) {
  const order = Array.isArray(raw?.order) ? raw.order.filter(id => A.IDS.includes(id)) : [];
  for (const id of DEFAULT_ORDER) if (!order.includes(id)) order.push(id);
  const labels = {}; for (const id of A.IDS) labels[id] = typeof raw?.labels?.[id] === 'string' ? raw.labels[id] : NAME[id];
  const routes = {}; for (const id of A.IDS) routes[id] = DESTINATIONS.some(d => d[0] === raw?.routes?.[id]) ? raw.routes[id] : ROUTES[id];
  return { order: [...new Set(order)], labels, routes };
}
const full = raw => {
  const s = Object.assign(A.merge(A.defaults(), raw || {}), extras(raw));
  s.layout.fit = raw?.layout?.fit !== false;
  // This changes the carving only; all saved transforms and light values survive.
  s.rocks.messages.rune.symbol = raw?.rocks?.messages?.rune?.symbol === 'ansuz' ? 'ansuz' : 'raven';
  return s;
};
const NAV = { S: full({}), t: 0, loaded: false, edits: new Map(), saving: false, timer: 0, warned: false, assets: {}, debris: new Image() };
for (const id of A.IDS) NAV.assets[id] = new A.RockTexture(id, BASE + id + '.png');
NAV.debris.crossOrigin = 'anonymous'; NAV.debris.src = BASE + 'debris.png';
const wrapped = new Set();

async function load() {
  try {
    const r = await fetch(ROW + '?id=eq.navigation&select=data,updated_at', { headers: H(), cache: 'no-store' });
    if (!r.ok) throw Error('HTTP ' + r.status);
    const a = await r.json(); if (!NAV.edits.size) NAV.S = full(a[0]?.data);
  } catch (e) {
    try { NAV.S = full(JSON.parse(localStorage.getItem('asgard-rock-navigation') || '{}')); } catch (_) {}
  }
  NAV.loaded = true;
  updateLooks();
  for (const sc of wrapped) if (sc.loaded) pull(sc);
  if (K.cur && wrapped.has(K.cur)) K.openSection(K.cur.ui.group, K.cur.ui.section);
}
function change(path, v) {
  setPath(NAV.S, path, clone(v)); NAV.edits.set(path, clone(v));
  clearTimeout(NAV.timer); NAV.timer = setTimeout(save, 600);
}
async function save() {
  if (NAV.saving || !NAV.edits.size || K.viewOnly) return;
  NAV.saving = true; const batch = [...NAV.edits]; NAV.edits.clear(); let done = false;
  try {
    for (let i = 0; i < 3 && !done; i++) {
      const r = await fetch(ROW + '?id=eq.navigation&select=data,updated_at', { headers: H(), cache: 'no-store' });
      if (!r.ok) throw Error('read');
      const row = (await r.json())[0], data = full(row?.data), now = new Date().toISOString();
      for (const [p, v] of batch) setPath(data, p, clone(v));
      const req = row
        ? { method: 'PATCH', url: ROW + '?id=eq.navigation&updated_at=eq.' + encodeURIComponent(row.updated_at), prefer: 'return=representation', body: { data, updated_by: 'studio-kit-rocks', updated_at: now } }
        : { method: 'POST', url: ROW + '?on_conflict=id', prefer: 'resolution=ignore-duplicates,return=representation', body: { id: 'navigation', page: 'navigation', data, updated_by: 'studio-kit-rocks', updated_at: now } };
      const rr = await fetch(req.url, { method: req.method, headers: H({ 'Content-Type': 'application/json', Prefer: req.prefer }), body: JSON.stringify(req.body) });
      if (!rr.ok) throw Error('write');
      if ((await rr.json()).length) done = true;
    }
    if (!done) throw Error('conflict');
    NAV.warned = false;
  } catch (e) {
    for (const [p, v] of batch) if (!NAV.edits.has(p)) NAV.edits.set(p, v);
    if (!NAV.warned) { NAV.warned = true; K.status('Rock settings not saved online yet. They are kept on this device and will retry.'); }
    clearTimeout(NAV.timer); NAV.timer = setTimeout(save, 5000);
  } finally {
    NAV.saving = false;
    try { localStorage.setItem('asgard-rock-navigation', JSON.stringify(NAV.S)); } catch (_) {}
    if (done && NAV.edits.size) { clearTimeout(NAV.timer); NAV.timer = setTimeout(save, 100); }
  }
}

/* ---------- geometry ---------- */
function cfg(sc) { return Object.assign({ page: 'asgard' }, PAGES[sc.id] || {}, typeof sc.nav === 'object' ? sc.nav : {}, sc.rockContext?.() || {}); }
function visibleIds(sc) { return NAV.S.order.slice(); }
function positions(sc) {
  const S = NAV.S, L = S.layout, ids = visibleIds(sc), span = (ids.length - 1) * (L.size + L.gap);
  const row = ids.map((id, i) => { const R = S.rocks[id]; return { id, x: -span / 2 + i * (L.size + L.gap) + R.x, y: K.H * L.y + R.y, size: L.size * R.size, bob: Math.sin(NAV.t * R.driftSpeed + A.IDS.indexOf(id) * 1.7) * R.drift }; });
  const reach = Math.max(...row.map(p => Math.abs(p.x) + p.size * .58));
  const scale = L.fit ? Math.min(1, (K.W - 24) / (2 * Math.max(1, reach))) : 1;
  return row.map(p => Object.assign(p, { x: K.W * L.x + p.x * scale, size: p.size * scale }));
}
function footprint(sc) { if (sc?.P?.navshow === false || !wrapped.has(sc)) return 0; return Math.max(0, K.H - Math.min(...positions(sc).map(p => p.y - p.size * .6 - Math.abs(NAV.S.rocks[p.id].drift))) + 12); }
function hitRock(sc, p) {
  if (sc.P.navshow === false) return null;
  for (const q of positions(sc)) if (Math.hypot(p.x - q.x, p.y - (q.y + q.bob)) < Math.max(22, q.size * .5)) return q.id;
  return null;
}

/* ---------- drawing (port of AsgardRockNav.Navigation.draw) ---------- */
function fragment(x, i, px, py, size, angle, opacity) {
  const im = NAV.debris; if (!im.complete || !im.naturalWidth) return;
  const cw = im.naturalWidth / 3, ch = im.naturalHeight / 2, k = i % 6;
  x.save(); x.translate(px, py); x.rotate(angle); x.globalAlpha = clamp(opacity, 0, 1);
  x.drawImage(im, (k % 3) * cw, Math.floor(k / 3) * ch, cw, ch, -size / 2, -size * .75, size, size * 1.5); x.restore();
}
function drawDebris(x, sc, t, front) {
  const S = NAV.S, D = S.debris, y = K.H * S.layout.y + D.y, span = K.W + 60, active = A.activeId(cfg(sc).page);
  for (let i = 0; i < Math.round(D.count); i++) {
    const z = seed(i + 6); if ((z > .65) !== front) continue;
    const speed = D.speed * (1 - D.depth * .8 + D.depth * z * 1.7), px = ((seed(i + 91) * span + t * speed * D.direction) % span + span) % span - 30, py = y + (seed(i + 70) - .5) * D.spread;
    fragment(x, i, px, py, D.min + (D.max - D.min) * z, t * D.spin * (seed(i + 81) - .5) + i, D.opacity * (.35 + .65 * z));
  }
  for (const p of positions(sc)) {
    const act = p.id === active, n = Math.round(D.orbit + (act ? S.active.extraDebris : 0));
    for (let j = 0; j < n; j++) {
      const phase = t * D.orbitSpeed * (act ? S.active.speed : 1) + j * 2.399 + A.IDS.indexOf(p.id), z = Math.sin(phase); if ((z > 0) !== front) continue;
      fragment(x, j + A.IDS.indexOf(p.id), p.x + Math.cos(phase) * D.orbitRadius, p.y + Math.sin(phase) * D.orbitRadius * .33, (D.min + (D.max - D.min) * .38) * (.8 + z * .2), phase * .35, D.opacity * (.5 + z * .15));
    }
  }
}
function drawNav(x, sc) {
  if (sc.P.navshow === false) return;
  const S = NAV.S, t = NAV.t, L = S.layout, W = K.W, Hh = K.H, active = A.activeId(cfg(sc).page);
  x.save(); x.filter = 'none'; x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.setLineDash([]);
  const top = Hh * L.fadeTop, end = Math.min(Hh, Hh * L.y - 30), y0 = Math.min(top, end - 1);
  if (L.black > 0) { const g = x.createLinearGradient(0, y0, 0, end); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${L.black})`); x.fillStyle = g; x.fillRect(0, y0, W, Hh - y0); }
  const st = S.stars, sh = Hh - top, wrapW = W + 40, layers = Math.max(1, Math.round(st.layers));
  for (let i = 0; i < st.count; i++) {
    const depth = (i % layers + 1) / Math.max(1, st.layers), px = ((seed(i + 87) * wrapW - t * st.speed * depth) % wrapW + wrapW) % wrapW - 20, py = top + seed(i + 201) * sh, fade = clamp((py - top) / 40, 0, 1);
    x.fillStyle = `rgba(190,209,225,${st.brightness * fade * (.25 + .65 * depth)})`; x.beginPath(); x.arc(px, py, st.size * (.45 + .7 * depth), 0, TAU); x.fill();
  }
  drawDebris(x, sc, t, false);
  for (const p of positions(sc)) {
    NAV.assets[p.id].draw(x, S.rocks[p.id], p.x, p.y + p.bob, p.size, t, active === p.id ? S.active.glow : 1, sc.P['navlayer:' + p.id] || 'all');
    if (L.labels) { x.fillStyle = p.id === active ? '#d8f8ff' : '#97acb6'; x.font = `${p.id === active ? 600 : 400} ${L.labelSize}px system-ui`; x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.fillText(NAV.S.labels[p.id] ?? NAME[p.id], p.x, p.y + p.size * .55 + L.labelSize + 3); }
  }
  drawDebris(x, sc, t, true);
  x.restore();
}

/* ---------- controls ---------- */
const NAV_KEY = /^nav(:|label:|order:)/;
function navValue(k) {
  if (k.startsWith('nav:')) return get(NAV.S, k.slice(4));
  if (k.startsWith('navlabel:')) return NAV.S.labels[k.slice(9)];
  if (k.startsWith('navorder:')) return NAV.S.order.indexOf(k.slice(9)) + 1;
}
// Bring the shared rock values into a screen without creating edits.
function pull(sc) {
  if (!NAV.loaded) return;
  for (const s of sc.SPEC) if (NAV_KEY.test(s.k)) { const v = navValue(s.k); if (v !== undefined) { sc.P[s.k] = clone(v); sc.DEF[s.k] = clone(v); } }
  if (Array.isArray(sc.hist)) sc.hist = sc.hist.map(h => { try { const o = JSON.parse(h); for (const s of sc.SPEC) if (NAV_KEY.test(s.k)) o[s.k] = sc.P[s.k]; return JSON.stringify(o); } catch (e) { return h; } });
  sc._navReady = true;
}
// Undo / redo changed the screen values: send rock values back to the shared row.
function push(sc) {
  for (const s of sc.SPEC) {
    const k = s.k, v = sc.P[k];
    if (k.startsWith('nav:') && JSON.stringify(v) !== JSON.stringify(get(NAV.S, k.slice(4)))) change(k.slice(4), v);
    else if (k.startsWith('navlabel:') && v !== NAV.S.labels[k.slice(9)]) change('labels.' + k.slice(9), v);
  }
  const order = [...NAV.S.order].sort((a, b) => (sc.P['navorder:' + a] ?? 99) - (sc.P['navorder:' + b] ?? 99));
  if (JSON.stringify(order) !== JSON.stringify(NAV.S.order)) change('order', order);
}
function addSpec(sc) {
  const D = full({});
  const add = (group, section, target, k, label, type, d, o = {}) => { sc.SPEC.push(Object.assign({ group, section, target, k, label, type, def: clone(d) }, o)); sc.DEF[k] = clone(d); sc.P[k] = clone(d); };
  const num = (g, s, t, path, label, min, max, step, o = {}) => add(g, s, t, 'nav:' + path, label, o.int ? 'int' : 'num', get(D, path), Object.assign({ min, max, step }, o));
  const bool = (g, s, t, path, label, o = {}) => add(g, s, t, 'nav:' + path, label, 'bool', get(D, path), o);
  const color = (g, s, t, path, label, o = {}) => add(g, s, t, 'nav:' + path, label, 'color', String(get(D, path)).toUpperCase(), o);
  const G = 'Rock row', SHARED = ' Shared by every Asgard page.';
  add(G, 'Show & place', 'nav.row', 'navshow', 'Show the rocks on this page', 'bool', true, { info: 'Turns the rock row off for this page only, while you design it. The rocks belong on every Asgard page.' });
  num(G, 'Show & place', 'nav.row', 'layout.size', 'All rocks: size', 35, 100, 1, { unit: 'px', info: 'Size of every rock.' + SHARED });
  num(G, 'Show & place', 'nav.row', 'layout.gap', 'Space between rocks', 0, 60, 1, { unit: 'px' });
  bool(G, 'Show & place', 'nav.row', 'layout.fit', 'Keep all five rocks inside the screen', { info: 'Fits the complete row to the phone width without changing your saved sizes or gaps.' });
  num(G, 'Show & place', 'nav.row', 'layout.x', 'Whole row: left / right', .25, .75, .005, { unit: 'of width' });
  num(G, 'Show & place', 'nav.row', 'layout.y', 'Whole row: height', .55, .95, .005, { unit: 'of height' });
  bool(G, 'Show & place', 'nav.row', 'layout.labels', 'Show page names');
  num(G, 'Show & place', 'nav.row', 'layout.labelSize', 'Page name size', 8, 17, .5, { unit: 'px' });
  num(G, 'Black sky & motion', 'nav.stars', 'layout.fadeTop', 'Black sky starts at', .4, .9, .005, { unit: 'of height', info: 'The black fade behind the rocks.' });
  num(G, 'Black sky & motion', 'nav.stars', 'layout.black', 'Black sky strength', 0, 1, .01);
  num(G, 'Black sky & motion', 'nav.row', 'motion.speed', 'Overall motion speed', 0, 3, .05, { unit: '×' });
  bool(G, 'Black sky & motion', 'nav.row', 'motion.paused', 'Pause all rock motion');
  num(G, 'Debris', 'nav.debris', 'debris.count', 'Passing fragments', 0, 70, 1, { int: true });
  num(G, 'Debris', 'nav.debris', 'debris.min', 'Smallest fragment', 1, 16, .5, { unit: 'px' });
  num(G, 'Debris', 'nav.debris', 'debris.max', 'Largest fragment', 2, 30, .5, { unit: 'px' });
  num(G, 'Debris', 'nav.debris', 'debris.speed', 'Travel speed', 0, 65, .5);
  add(G, 'Debris', 'nav.debris', 'nav:debris.direction', 'Travel direction', 'select', D.debris.direction, { opts: [[-1, 'Right to left'], [1, 'Left to right']] });
  num(G, 'Debris', 'nav.debris', 'debris.spread', 'Height of debris field', 20, 280, 1, { unit: 'px' });
  num(G, 'Debris', 'nav.debris', 'debris.y', 'Move debris up / down', -180, 80, 1, { unit: 'px' });
  num(G, 'Debris', 'nav.debris', 'debris.opacity', 'Visibility', 0, 1, .01);
  num(G, 'Debris', 'nav.debris', 'debris.depth', 'Near / far speed difference', 0, 1, .01);
  num(G, 'Debris', 'nav.debris', 'debris.spin', 'Fragment turning speed', 0, 2, .01);
  num(G, 'Debris', 'nav.row', 'debris.orbit', 'Orbiting pieces per rock', 0, 8, 1, { int: true });
  num(G, 'Debris', 'nav.row', 'debris.orbitRadius', 'Orbit distance', 15, 90, 1, { unit: 'px' });
  num(G, 'Debris', 'nav.row', 'debris.orbitSpeed', 'Orbit speed', 0, .8, .01);
  num(G, 'Active page', 'nav.active', 'active.glow', 'This page\'s rock: brightness', 1, 3, .01, { unit: '×', info: 'The rock for the page you are on glows brighter.' });
  num(G, 'Active page', 'nav.active', 'active.extraDebris', 'This page\'s rock: extra pieces', 0, 8, 1, { int: true });
  num(G, 'Active page', 'nav.active', 'active.speed', 'This page\'s rock: orbit speed', 1, 3, .05, { unit: '×' });
  num(G, 'Stars', 'nav.stars', 'stars.count', 'Star count', 0, 120, 1, { int: true });
  num(G, 'Stars', 'nav.stars', 'stars.size', 'Star size', .2, 1.6, .05, { unit: 'px' });
  num(G, 'Stars', 'nav.stars', 'stars.brightness', 'Star brightness', 0, 1, .01);
  num(G, 'Stars', 'nav.stars', 'stars.speed', 'Drift speed', 0, 15, .1);
  num(G, 'Stars', 'nav.stars', 'stars.layers', 'Depth layers', 2, 3, 1, { int: true });
  add(G, 'Saved looks', 'nav.row', 'navlook', 'Saved rock look', 'select', '', { opts: [['', 'Choose a saved look'], ...NAV.S.variants.map(v => [v.id, v.name])] });
  add(G, 'Saved looks', 'nav.row', 'navlookName', 'Name for this look', 'text', '');
  add(G, 'Saved looks', 'nav.row', 'navlookSave', 'Save this rock look', 'action', false, { onclick: () => saveLook(sc) });
  add(G, 'Saved looks', 'nav.row', 'navlookDownload', 'Download rock settings', 'action', false, { onclick: () => download(JSON.stringify(NAV.S, null, 2), 'asgard-rock-navigation.json', 'application/json') });
  for (const id of DEFAULT_ORDER) {
    const g = NAME[id] + ' rock', t = 'nav.rock:' + id, r = 'rocks.' + id + '.', rune = A.META[id][1] + ' ' + A.META[id][2];
    add(g, 'Rock', t, 'navorder:' + id, 'Place in the row', 'select', DEFAULT_ORDER.indexOf(id) + 1, { opts: DEFAULT_ORDER.map((_, i) => [i + 1, i === 0 ? '1 · far left' : i === DEFAULT_ORDER.length - 1 ? i + 1 + ' · far right (last)' : String(i + 1)]), info: 'All five rocks are on every Asgard page. Raven starts in the last position.' });
    add(g, 'Rock', t, 'navlabel:' + id, 'Page name under it', 'text', NAME[id]);
    add(g, 'Rock', t, 'nav:routes.' + id, 'Open when tapped', 'select', ROUTES[id], { opts: DESTINATIONS });
    num(g, 'Rock', t, r + 'size', 'Rock size', .45, 2, .01, { unit: '×', info: 'Rune: ' + rune + '.' + SHARED });
    num(g, 'Rock', t, r + 'x', 'Left / right', -100, 100, 1, { unit: 'px' });
    num(g, 'Rock', t, r + 'y', 'Up / down', -180, 80, 1, { unit: 'px' });
    num(g, 'Rock', t, r + 'rotation', 'Rock rotation', -180, 180, 1, { unit: '°' });
    num(g, 'Rock', t, r + 'lean', 'Lean', -55, 55, 1, { unit: '°' });
    num(g, 'Rock', t, r + 'brightness', 'Surface brightness', .1, 2, .01, { unit: '×' });
    num(g, 'Rock', t, r + 'drift', 'Floating distance', 0, 20, .1, { unit: 'px' });
    num(g, 'Rock', t, r + 'driftSpeed', 'Floating speed', 0, .8, .01);
    num(g, 'Rock', t, r + 'turn', 'Gentle turning', 0, 12, .1, { unit: '°' });
    add(g, 'Rock', t, 'navlayer:' + id, 'Look at one layer', 'select', 'all', { opts: [['all', 'Complete rock'], ['rock', 'Original rock · unchanged'], ['carving', 'Carving only'], ['rune', 'Rune glow only'], ['cracks', 'Original crack light only']], info: 'Studio view only. The app always shows the complete rock.' });
    add(g, 'Rock', t, 'navexport:' + id, 'Download selected layer', 'action', false, { onclick: () => exportLayer(sc, id) });
    if (id === 'messages') add(g, 'Carving', t, 'nav:rocks.messages.rune.symbol', 'Carved symbol', 'select', 'raven', { opts: [['raven', 'Raven · spread wings'], ['ansuz', 'Original Ansuz rune']] });
    num(g, 'Carving', t, r + 'rune.x', 'Carving left / right', .05, .95, .005);
    num(g, 'Carving', t, r + 'rune.y', 'Carving up / down', .05, .95, .005);
    num(g, 'Carving', t, r + 'rune.size', 'Rune size', .1, .7, .005);
    num(g, 'Carving', t, r + 'rune.angle', 'Rune angle', -180, 180, 1, { unit: '°' });
    num(g, 'Carving', t, r + 'rune.slant', 'Follow the face angle', -.8, .8, .01);
    num(g, 'Carving', t, r + 'rune.height', 'Rune height', .4, 1.6, .01, { unit: '×' });
    num(g, 'Carving', t, r + 'rune.width', 'Carved line thickness', .008, .12, .001);
    num(g, 'Carving', t, r + 'rune.depth', 'Carving depth', 0, 1, .01);
    num(g, 'Carving', t, r + 'rune.roughness', 'Chipped, uneven edges', 0, 1.5, .01);
    num(g, 'Carving', t, r + 'rune.follow', 'Follow the rock ridges', 0, 1.5, .01, { info: 'The groove bends with surface detail and stays clipped to the rock.' });
    color(g, 'Rune light', t, r + 'rune.color', 'Rune light color');
    num(g, 'Rune light', t, r + 'rune.intensity', 'Glow intensity', 0, 3, .01, { unit: '×' });
    num(g, 'Rune light', t, r + 'rune.spread', 'Glow spread', 0, 4, .05);
    num(g, 'Rune light', t, r + 'rune.softness', 'Glow softness', 0, 4, .05);
    num(g, 'Rune light', t, r + 'rune.pulse', 'Slow breathing glow', 0, .6, .01);
    num(g, 'Rune light', t, r + 'rune.pulseSpeed', 'Breathing speed', .03, .5, .01);
    num(g, 'Original cracks', t, r + 'cracks.intensity', 'Original crack brightness', 0, 3, .01, { unit: '×', info: 'Brightness 1 keeps the source crack light. The original rock image is always kept.' });
    num(g, 'Original cracks', t, r + 'cracks.spread', 'Original crack glow spread', 0, 3, .01);
    bool(g, 'Original cracks', t, r + 'cracks.recolor', 'Change the original crack color');
    color(g, 'Original cracks', t, r + 'cracks.color', 'Crack color (when changed)');
  }
}

function download(content, name, type) {
  const url = URL.createObjectURL(new Blob([content], { type })), a = document.createElement('a');
  a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function updateLooks() { for (const sc of wrapped) { const s = sc.SPEC.find(s => s.k === 'navlook'); if (s) s.opts = [['', 'Choose a saved look'], ...NAV.S.variants.map(v => [v.id, v.name])]; } }
function saveLook(sc) {
  const name = String(sc.P.navlookName || '').trim().slice(0, 80);
  if (!name) { K.status('Enter a name for this rock look.'); return; }
  const data = clone(NAV.S); delete data.variants;
  change('variants', [...NAV.S.variants, { id: 'rock-' + Date.now(), name, data }]); updateLooks();
  K.openSection('Rock row', 'Saved looks');
}
function applyLook(sc, id) {
  const look = NAV.S.variants.find(v => v.id === id); if (!look) return;
  const next = full(Object.assign({}, look.data, { variants: NAV.S.variants }));
  // Restore via actual controls so the normal Undo button can undo the restore.
  for (const s of sc.SPEC) {
    if (s.k.startsWith('nav:')) K.setVal(s.k, clone(get(next, s.k.slice(4))), false);
    else if (s.k.startsWith('navlabel:')) K.setVal(s.k, next.labels[s.k.slice(9)], false);
  }
  change('order', next.order); for (const x of A.IDS) sc.P['navorder:' + x] = next.order.indexOf(x) + 1;
  K.openSection('Rock row', 'Saved looks');
}
function exportLayer(sc, id) {
  const asset = NAV.assets[id]; if (!asset.ready) { K.status('The rock image is still loading.'); return; }
  const c = document.createElement('canvas'); c.width = c.height = 1024;
  asset.draw(c.getContext('2d'), NAV.S.rocks[id], 512, 512, 800, NAV.t, 1, sc.P['navlayer:' + id] || 'all');
  c.toBlob(b => b && download(b, 'asgard-' + id + '-' + (sc.P['navlayer:' + id] || 'all') + '.png', 'image/png'));
}

/* ---------- attach to screens ---------- */
let NAV_HL = false;
function navHighlight(sc, ctx, base, sub, H1) {
  const ps = positions(sc), S = NAV.S;
  const ring = p => () => { ctx.beginPath(); ctx.arc(p.x, p.y + p.bob, p.size * .55, 0, TAU); };
  if (base === 'nav.rock') { const p = ps.find(q => q.id === sub); if (p) H1(ring(p)); }
  else if (base === 'nav.row') ps.forEach(p => H1(ring(p)));
  else if (base === 'nav.active') { const id = A.activeId(cfg(sc).page); (id ? ps.filter(p => p.id === id) : ps).forEach(p => H1(ring(p))); }
  else if (base === 'nav.debris') { const D = S.debris, y = K.H * S.layout.y + D.y; H1(() => { ctx.beginPath(); ctx.rect(4, y - D.spread / 2, K.W - 8, D.spread); }); }
  else if (base === 'nav.stars') { const top = K.H * S.layout.fadeTop; H1(() => { ctx.beginPath(); ctx.rect(4, top, K.W - 8, K.H - top - 4); }); }
}
function navBounds(sc, base, sub) {
  const ps = positions(sc), p = base === 'nav.rock' ? ps.find(q => q.id === sub) : null;
  if (p) { const s = Math.max(90, p.size * 2.2); return { x: p.x - s / 2, y: p.y + p.bob - s / 2, s }; }
  const y = K.H * NAV.S.layout.y; return { x: 0, y: y - K.W / 2, s: K.W };
}
async function navigate(sc, id) {
  const target = NAV.S.routes[id] || ROUTES[id];
  const screen = ['market', 'share-post'].includes(target) ? 'sky' : target;
  if (!K.screens[screen]) return false;
  if (K.cur !== K.screens[screen]) await K.show(screen);
  if (screen === 'sky') K.screens.sky.rockNavigate?.(target);
  return true;
}
function attach(sc) {
  if (!sc || wrapped.has(sc) || NOT_ASGARD.has(sc.id)) return;
  wrapped.add(sc); addSpec(sc);
  // The shared row replaces, rather than overlays, the old gold navigation.
  sc.SPEC = sc.SPEC.filter(s => s.group !== 'Bottom icons');
  const o = { draw: sc.draw, update: sc.update, highlight: sc.highlight, bounds: sc.bounds, pick: sc.pick, pointer: sc.pointer, onSet: sc.onSet, onLoad: sc.onLoad, onShow: sc.onShow };
  sc.draw = function (ctx, now, studio) {
    if (o.draw) o.draw.call(this, ctx, now, studio);
    try { drawNav(ctx, sc); if (studio && String(K.currentTarget()).startsWith('nav')) { NAV_HL = true; K.hl(ctx, now); } } finally { NAV_HL = false; }
  };
  sc.update = function (dt, now) { if (o.update) o.update.call(this, dt, now); if (!NAV.S.motion.paused) NAV.t += dt * NAV.S.motion.speed; };
  sc.highlight = function (ctx, base, sub, H1, now) {
    if (String(base).startsWith('nav')) { if (NAV_HL) navHighlight(sc, ctx, base, sub, H1); return; }
    if (NAV_HL) return;
    return o.highlight && o.highlight.call(this, ctx, base, sub, H1, now);
  };
  sc.bounds = function (base, sub) { if (base && String(base).startsWith('nav')) return navBounds(sc, base, sub); return o.bounds ? o.bounds.call(this, base, sub) : { x: 0, y: (K.H - K.W) / 2, s: K.W }; };
  sc.pick = function (p) { const id = hitRock(sc, p); if (id) return [NAME[id] + ' rock', 'Rock']; return o.pick ? o.pick.call(this, p) : null; };
  let held = null;
  sc.pointer = {
    down(p, ev) { const id = hitRock(sc, p); if (id) { held = { pointer: ev.pointerId, id, x: p.x, y: p.y, moved: false }; return; } o.pointer?.down?.(p, ev); },
    move(p, ev) { if (held && ev.pointerId === held.pointer) { if (Math.hypot(p.x - held.x, p.y - held.y) > 12) held.moved = true; return; } o.pointer?.move?.(p, ev); },
    up(p, ev) { if (held && ev.pointerId === held.pointer) { const down = held; held = null; const id = hitRock(sc, p); if (!down.moved && id === down.id && Math.hypot(p.x - down.x, p.y - down.y) <= 12) navigate(sc, id); return; } o.pointer?.up?.(p, ev); },
    cancel(p, ev) { if (held && ev.pointerId === held.pointer) { held = null; return; } o.pointer?.cancel?.(p, ev); },
  };
  sc.onSet = function (k, v) {
    if (k === 'navlook') return applyLook(sc, v);
    if (k === 'navlookName') return;
    if (k.startsWith('nav:')) return change(k.slice(4), v);
    if (k.startsWith('navlabel:')) return change('labels.' + k.slice(9), v);
    if (k.startsWith('navorder:')) {
      const id = k.slice(9), order = NAV.S.order.filter(x => x !== id); order.splice(clamp(v - 1, 0, order.length), 0, id);
      change('order', order); for (const x of A.IDS) if (('navorder:' + x) in sc.P) sc.P['navorder:' + x] = order.indexOf(x) + 1;
      return;
    }
    if (o.onSet) return o.onSet.call(this, k, v);
  };
  sc.onLoad = function () { if (sc._navReady) push(sc); else pull(sc); if (o.onLoad) return o.onLoad.call(this); };
  sc.onShow = function () { held = null; const r = o.onShow ? o.onShow.call(this) : undefined; pull(sc); updateLooks(); if (K.cur === sc) K.openSection(sc.ui.group === 'Bottom icons' ? 'Rock row' : sc.ui.group, sc.ui.section); return r; };
}
const register = K.screen;
K.screen = function (def) { const sc = register.call(this, def); attach(sc); return sc; };
for (const id of K.order) attach(K.screens[id]);
K.rockNav = { NAV, positions, attach, navigate, footprint, has: sc => wrapped.has(sc), version: '1120-rocks-2' };
load();
})();
