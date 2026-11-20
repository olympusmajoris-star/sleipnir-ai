/* =====================================================================
   ROCK NAV FOR STUDIO KIT 1120 — the floating rune rocks on EVERY Asgard
   screen of the kit studio (all current screens and any registered later),
   with all of their controls.
   Same rock textures (storage studio/navigation/rocks-v1) and the same
   shared settings row (studio_designs id 'navigation') the earlier studio
   and the app runtime use, so the rocks come back exactly as tuned.
   Row order and page names live in that row too ('order', 'labels').
   The Raven (Messages) rock sits last in the row.
   A screen can opt out with nav:false, or set nav:{page, share}.
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
const PAGES = { sky: { page: 'home', share: true }, dial: { page: 'messages' }, directory: { page: 'messages' }, conversation: { page: 'convo' } };
const TARGET = { home: 'sky', messages: 'dial' };
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
  return { order: [...new Set(order)], labels };
}
const full = raw => Object.assign(A.merge(A.defaults(), raw || {}), extras(raw));
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
function cfg(sc) { return Object.assign({ page: 'asgard', share: false }, PAGES[sc.id] || {}, typeof sc.nav === 'object' ? sc.nav : {}); }
function visibleIds(sc) { const c = cfg(sc), vis = A.visible(c.page, c.share); return NAV.S.order.filter(id => vis.includes(id)); }
function positions(sc) {
  const S = NAV.S, L = S.layout, ids = visibleIds(sc), span = (ids.length - 1) * (L.size + L.gap);
  return ids.map((id, i) => { const R = S.rocks[id]; return { id, x: K.W * L.x - span / 2 + i * (L.size + L.gap) + R.x, y: K.H * L.y + R.y, size: L.size * R.size, bob: Math.sin(NAV.t * R.driftSpeed + A.IDS.indexOf(id) * 1.7) * R.drift }; });
}
function hitRock(sc, p) {
  if (sc.P.navshow === false) return null;
  for (const q of positions(sc)) if (Math.hypot(p.x - q.x, p.y - (q.y + q.bob)) < q.size * .45) return q.id;
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
  const D = A.defaults();
  const add = (group, section, target, k, label, type, d, o = {}) => { sc.SPEC.push(Object.assign({ group, section, target, k, label, type, def: clone(d) }, o)); sc.DEF[k] = clone(d); sc.P[k] = clone(d); };
  const num = (g, s, t, path, label, min, max, step, o = {}) => add(g, s, t, 'nav:' + path, label, o.int ? 'int' : 'num', get(D, path), Object.assign({ min, max, step }, o));
  const bool = (g, s, t, path, label, o = {}) => add(g, s, t, 'nav:' + path, label, 'bool', get(D, path), o);
  const color = (g, s, t, path, label, o = {}) => add(g, s, t, 'nav:' + path, label, 'color', String(get(D, path)).toUpperCase(), o);
  const G = 'Rock row', SHARED = ' Shared by every Asgard page.';
  add(G, 'Show & place', 'nav.row', 'navshow', 'Show the rocks on this page', 'bool', true, { info: 'Turns the rock row off for this page only, while you design it. The rocks belong on every Asgard page.' });
  num(G, 'Show & place', 'nav.row', 'layout.size', 'All rocks: size', 35, 100, 1, { unit: 'px', info: 'Size of every rock.' + SHARED });
  num(G, 'Show & place', 'nav.row', 'layout.gap', 'Space between rocks', 0, 60, 1, { unit: 'px' });
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
  for (const id of DEFAULT_ORDER) {
    if (!A.visible(cfg(sc).page, cfg(sc).share).includes(id)) continue;
    const g = NAME[id] + ' rock', t = 'nav.rock:' + id, r = 'rocks.' + id + '.', rune = A.META[id][1] + ' ' + A.META[id][2];
    add(g, 'Rock', t, 'navorder:' + id, 'Place in the row', 'select', DEFAULT_ORDER.indexOf(id) + 1, { opts: DEFAULT_ORDER.map((_, i) => [i + 1, i === 0 ? '1 · far left' : i === DEFAULT_ORDER.length - 1 ? i + 1 + ' · far right (last)' : String(i + 1)]), info: 'The Raven rock is last by default. Pages without Share skip that spot.' });
    add(g, 'Rock', t, 'navlabel:' + id, 'Page name under it', 'text', NAME[id]);
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
function navigate(sc, id) {
  const target = TARGET[id];
  if (target && K.screens[target]) { if (K.cur !== K.screens[target]) K.show(target); return; }
  K.status((NAV.S.labels[id] || NAME[id]) + ' page is not in this studio yet.');
}
function attach(sc) {
  if (!sc || wrapped.has(sc) || NOT_ASGARD.has(sc.id) || sc.nav === false) return;
  wrapped.add(sc); addSpec(sc);
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
    down(p, ev) { if (hitRock(sc, p)) { held = ev.pointerId; return; } o.pointer?.down?.(p, ev); },
    move(p, ev) { if (held != null && ev.pointerId === held) return; o.pointer?.move?.(p, ev); },
    up(p, ev) { if (held != null && ev.pointerId === held) { held = null; const id = hitRock(sc, p); if (id) navigate(sc, id); return; } o.pointer?.up?.(p, ev); },
    cancel(p, ev) { if (held != null && ev.pointerId === held) { held = null; return; } o.pointer?.cancel?.(p, ev); },
  };
  sc.onSet = function (k, v) {
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
  sc.onShow = function () { const r = o.onShow ? o.onShow.call(this) : undefined; pull(sc); if (K.cur === sc) K.openSection(sc.ui.group, sc.ui.section); return r; };
}
const register = K.screen;
K.screen = function (def) { const sc = register.call(this, def); attach(sc); return sc; };
for (const id of K.order) attach(K.screens[id]);
K.rockNav = { NAV, positions, attach };
load();
})();
