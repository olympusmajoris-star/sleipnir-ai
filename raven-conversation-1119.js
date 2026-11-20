/* =====================================================================
   RAVEN CONVERSATION — screen module for studio-kit-1119.
   Port of the Raven conversation page in the AsgardRaven custom widget
   (FlutterFlow export 2026-11-19): _RvEarthJourney (the 14 Earth
   recordings), the top/bottom gradient, header row, message clouds
   (_rvCloudParts, _RvCloudVolume, _RvCloudSurfacePainter, crowns and
   footage films), break-off / distant ambient clouds (_RvMistScene,
   _RvMistPainter) and _RvMessageComposer. Defaults = the Dart and the
   live raven_scene_settings row, including the construction entrance,
   registered terrain lines and water-shimmer reflection masks.
   ===================================================================== */
(() => {
'use strict';
const K = window.StudioKit;
const { TAU, clamp, rgb, rgba, mix, WHITE, scaleOf, blur } = K;
let P = {};
const easeIO = t => { t = clamp(t, 0, 1); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const ART = 'https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/asgard_ui/raven_cloud_v20/';
const EARTH = 'https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/raven_earth/';
const CLIPS = [['San Francisco', 'v32/earth-san-francisco-rigid-v32.mp4', 0.2, 'water-san-francisco-v29.json'], ['Egypt', 'v32/earth-egypt-rigid-v32.mp4', 0.2, 'water-egypt-v29.json'], ['Japan', 'v34/earth-japan-continuous-v34.mp4', 0.2, 'water-japan-v29.json'], ['Coast and green valleys', 'v32/earth-green-valleys-rigid-v32.mp4', 0.2, 'water-green-valleys-v29.json'], ['Florida coast', 'v32/earth-florida-rigid-v32.mp4', 0.2, 'water-florida-v29.json'], ['Terrain', 'v34/earth-terrain-continuous-v34.mp4', 0.4, 'water-terrain-v29.json'], ['River plains', 'v34/earth-river-plains-continuous-v34.mp4', 0.4, 'water-river-plains-v29.json'], ['Woodlands', 'v34/earth-woodlands-continuous-v34.mp4', 0.4, 'water-woodlands-v29.json'], ['Forest river', 'v34/earth-forest-river-continuous-v34.mp4', 0.4, 'water-forest-river-v29.json'], ['Changing landscapes', 'v34/earth-changing-landscapes-continuous-v34.mp4', 0.4, 'water-changing-landscapes-v29.json'], ['Green rivers', 'v34/earth-green-rivers-continuous-v34.mp4', 0.4, 'water-green-rivers-v29.json'], ['Farmland', 'v34/earth-farmland-continuous-v34.mp4', 0.4, 'water-farmland-v29.json'], ['Close farmland', 'v34/earth-close-farmland-continuous-v34.mp4', 0.4, 'water-close-farmland-v29.json'], ['Ice and fjords', 'v34/earth-ice-fjords-continuous-v34.mp4', 0.4, 'water-ice-fjords-v29.json']];
const MINE = 'cloud-mine-billows-v27.webp', PEER = 'cloud-peer-billows-v27.webp';
const FILM_ASSETS = [MINE, PEER, 'cloud-anvil-258398-v29.webp', 'cloud-tower-365034-v29.webp', 'cloud-billows-166852-v29.webp'];
const BOUNDS = { 'cloud-anvil-258398-v29.webp': [125, 110, 598, 356], 'cloud-billows-166852-v29.webp': [144, 130, 495, 296], 'cloud-tower-365034-v29.webp': [67, 107, 567, 331], [MINE]: [19, 87, 622, 340], [PEER]: [18, 87, 620, 341] };
const CROWNS = { [MINE]: [[100, 94, 285, 180], [260, 82, 435, 181]], [PEER]: [[178, 98, 355, 184], [300, 82, 470, 183]], 'cloud-anvil-258398-v29.webp': [[140, 137, 340, 272], [285, 102, 490, 257], [390, 124, 578, 272]], 'cloud-tower-365034-v29.webp': [[98, 157, 288, 282], [240, 114, 420, 254], [340, 99, 535, 247]], 'cloud-billows-166852-v29.webp': [[160, 171, 310, 278], [255, 170, 430, 289], [365, 161, 490, 283]] };
function hash(x) { x = ((x ^ 0x45d9f3b) * 1664525 + 1013904223) & 0x7fffffff; return (x ^ (x >> 13)) & 0x7fffffff; }
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const strSeed = s => { let a = 0; for (const c of s) a = (a * 31 + c.charCodeAt(0)) & 0x7fffffff; return a; };

/* ---------- cloud footage films (_RvCloudFilm) ---------- */
class Film {
  constructor(asset) { this.asset = asset; this.history = []; this.prev = null; this.cur = null; this.poster = null; this.blend = 0; this.motion = 0; this.dur = .1; this.speed = 1; this.ready = false; this.idx = 0; this.count = 0; this.decoding = false; this.retry = 0; this.cb = null; }
  async load() {
    try {
      if ('ImageDecoder' in window || window.RavenWebP) {
        const resp = await fetch(ART + this.asset); const buf = await resp.arrayBuffer();
        const Decoder = window.ImageDecoder || window.RavenWebP.Decoder; this.dec = new Decoder({ data: buf, type: 'image/webp' }); await this.dec.tracks.ready; this.count = this.dec.tracks.selectedTrack.frameCount || 1;
        const frames = [];
        for (let i = 0; i < Math.min(12, this.count); i++) { const r = await this.dec.decode({ frameIndex: i }); frames.push(await createImageBitmap(r.image)); this.dur = Math.max(.1, (r.image.duration || 0) / 1e6); r.image.close(); }
        this.idx = frames.length - 1; this.history = frames.slice(0, Math.max(0, frames.length - 2)); this.prev = frames[frames.length - 2] || frames[0]; this.cur = frames[frames.length - 1];
      } else { const img = new Image(); img.crossOrigin = 'anonymous'; img.src = ART + this.asset; await img.decode(); this.prev = this.cur = img; }
      this.poster = this.prev; const b = BOUNDS[this.asset], w = this.cur.width, h = this.cur.height, sx = w / 640, sy = h / 426;
      this.bounds = b ? { x: Math.max(0, b[0] * sx - 12 * sx), y: Math.max(0, b[1] * sy - 12 * sx), w: Math.min(w, (b[2] - b[0]) * sx + 24 * sx), h: Math.min(h, (b[3] - b[1]) * sy + 24 * sx) } : { x: 0, y: 0, w, h };
      this.ready = true; if (this.cb) this.cb();
    } catch (e) { console.warn('film', this.asset, e); this.failed = true; }
  }
  before(v) { const o = Math.abs(v) % 10; return o === 0 || this.history.length < o ? this.prev : this.history[this.history.length - o]; }
  after(v) { const o = Math.abs(v) % 10; return o === 0 || this.history.length < o ? this.cur : (o === 1 ? this.prev : this.history[this.history.length - o + 1]); }
  tick(dt) {
    if (!this.ready || !this.dec) return; const s = Math.min(dt, .1);
    this.motion += s * this.speed * (this.direction < 0 ? -1 : 1); this.blend = Math.min(1, this.blend + s * this.speed / Math.max(.1, this.dur));
    if (this.blend >= 1 && this.speed > 0 && !this.decoding && performance.now() >= this.retry) this.advance();
  }
  async advance() {
    this.decoding = true;
    try { this.idx = (this.idx + (this.direction < 0 ? -1 : 1) + this.count) % this.count; const r = await this.dec.decode({ frameIndex: this.idx }); const bmp = await createImageBitmap(r.image); this.dur = Math.max(.1, (r.image.duration || 0) / 1e6); r.image.close(); if (this.prev) this.history.push(this.prev); if (this.history.length > 10) { const old = this.history.shift(); if (old && old.close && old !== this.prev && old !== this.cur) old.close(); } this.prev = this.cur; this.cur = bmp; this.blend = 0; }
    catch (e) { this.retry = performance.now() + 2000; } finally { this.decoding = false; }
  }
}
const FILMS = FILM_ASSETS.map(a => new Film(a));
const FILM = Object.fromEntries(FILMS.map(f => [f.asset, f]));
let filmsStarted = false;
function startFilms() { if (filmsStarted) return; filmsStarted = true; FILMS.forEach(f => f.load()); }

/* ---------- scratch canvases ---------- */
const scratch = []; function sc2(i, w, h) { let c = scratch[i]; if (!c) { c = scratch[i] = document.createElement('canvas'); } const W = Math.max(2, Math.ceil(w)), H = Math.max(2, Math.ceil(h)); if (c.width < W || c.height < H) { c.width = Math.max(c.width, W); c.height = Math.max(c.height, H); } const x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.filter = 'none'; x.clearRect(0, 0, W, H); return [c, x, W, H]; }

/* ---------- film drawing (_rvDrawCloudFilm / _rvDrawCloudCrown) ----------
   Feathering is linear, so each source frame is feathered once (cached per
   frame), and the per-frame crossfade a·(1−blend) + b·blend is composed once
   per film/phase/crown and shared by every billow that uses it. */
const featherCache = new WeakMap();
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(2, Math.round(w)); c.height = Math.max(2, Math.round(h)); return c; }
function radialMask(x, W, H, cx, cy, r, stops) { x.save(); x.globalCompositeOperation = 'destination-in'; x.translate(W / 2, H / 2); x.scale(W / 2, H / 2); const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); stops.forEach(([s, a]) => g.addColorStop(s, `rgba(255,255,255,${a})`)); x.fillStyle = g; x.fillRect(-2, -2, 4, 4); x.restore(); }
function feathered(film, frame, ci) {
  let per = featherCache.get(frame); if (!per) { per = {}; featherCache.set(frame, per); }
  if (per[ci]) return per[ci];
  let c, x;
  if (ci < 0) {
    const b = film.bounds; c = mkCanvas(b.w, b.h); x = c.getContext('2d'); x.drawImage(frame, b.x, b.y, b.w, b.h, 0, 0, c.width, c.height);
    radialMask(x, c.width, c.height, 0, 0, 1.08, [[0, 1], [.69, 1], [1, 0]]);
  } else {
    const ch = CROWNS[film.asset], raw = ch[ci], sx = frame.width / 640, sy = frame.height / 426, sw = (raw[2] - raw[0]) * sx, sh = (raw[3] - raw[1]) * sy;
    c = mkCanvas(sw, sh); x = c.getContext('2d'); const W = c.width, H = c.height; x.drawImage(frame, raw[0] * sx, raw[1] * sy, sw, sh, 0, 0, W, H);
    x.globalCompositeOperation = 'destination-in';
    let g = x.createLinearGradient(0, 0, W, 0); [[0, 0], [.17, 1], [.83, 1], [1, 0]].forEach(([s, v]) => g.addColorStop(s, `rgba(255,255,255,${v})`)); x.fillStyle = g; x.fillRect(0, 0, W, H);
    g = x.createLinearGradient(0, 0, 0, H); [[0, 0], [.08, 1], [.76, 1], [1, 0]].forEach(([s, v]) => g.addColorStop(s, `rgba(255,255,255,${v})`)); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.globalCompositeOperation = 'source-over';
    if (film.asset !== MINE) radialMask(x, W, H, 0, .08, 1.03, [[0, 1], [.48, 1], [1, 0]]);
  }
  per[ci] = c; return c;
}
const mixPool = new Map();
function mixed(film, o, ci) {
  const a = film.before(o), b = film.after(o) || a, m = clamp(film.blend, 0, 1), key = film.asset + '|' + (Math.abs(o) % 10) + '|' + ci;
  let e = mixPool.get(key);
  const fa = feathered(film, a, ci);
  if (!e) { e = { c: mkCanvas(fa.width, fa.height) }; mixPool.set(key, e); }
  if (e.a === a && e.b === b && e.m === m) return e.c;
  if (e.c.width !== fa.width || e.c.height !== fa.height) { e.c.width = fa.width; e.c.height = fa.height; }
  const x = e.c.getContext('2d'); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.clearRect(0, 0, e.c.width, e.c.height);
  x.globalAlpha = 1 - m; x.drawImage(fa, 0, 0);
  if (m > 0 && b) { x.globalCompositeOperation = 'lighter'; x.globalAlpha = m; x.drawImage(feathered(film, b, ci), 0, 0, e.c.width, e.c.height); }
  x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; e.a = a; e.b = b; e.m = m; return e.c;
}
function drawFilm(ctx, film, dest, { phase = 0, opacity = 1, shadow = false } = {}) {
  if (!film || !film.ready || opacity <= 0) return;
  const c = mixed(film, phase, -1);
  ctx.save(); ctx.globalAlpha *= clamp(opacity, 0, 1); if (shadow) ctx.filter = (ctx.filter && ctx.filter !== 'none' ? ctx.filter + ' ' : '') + 'brightness(0)';
  ctx.drawImage(c, dest.x, dest.y, dest.w, dest.h); ctx.restore();
}
function crownIndex(film, seed) { const ch = CROWNS[film && film.asset]; return ch ? Math.abs(seed) % ch.length : 0; }
function crownRect(film, seed) { const ch = CROWNS[film && film.asset] || [[100, 80, 540, 300]]; return ch[Math.abs(seed) % ch.length]; }
function drawCrown(ctx, film, dest, seed, opacity) {
  if (!film || !film.ready || opacity <= 0) return;
  const c = mixed(film, seed, crownIndex(film, seed));
  ctx.globalAlpha = clamp(opacity, 0, 1); ctx.drawImage(c, dest.x, dest.y, dest.w, dest.h); ctx.globalAlpha = 1;
}
const whiteCache = new Map();
function whiteSprite(w, h, inflate, sigma, k) {
  const key = [w, h, inflate, sigma, k].map(v => Math.round(v * 10)).join('|'); let c = whiteCache.get(key);
  if (c) return c; const pad = sigma * 3 + 4, W = (w + 2 * pad) * k, H = (h + 2 * pad) * k; c = mkCanvas(W, H); const x = c.getContext('2d'); x.scale(k, k); x.filter = `blur(${(sigma * k).toFixed(2)}px)`; x.fillStyle = '#fff'; x.beginPath(); x.roundRect(pad, pad, w, h, Math.min(44, w / 2, h / 2)); x.fill();
  c.pad = pad; whiteCache.set(key, c); if (whiteCache.size > 60) whiteCache.delete(whiteCache.keys().next().value); return c;
}

/* ---------- cloud volume (_RvCloudVolume) ---------- */
function rrectPerimeter(r, rad) {
  const segs = [], { x, y, w, h } = r, R = Math.min(rad, w / 2, h / 2);
  const line = (x0, y0, x1, y1) => segs.push({ len: Math.hypot(x1 - x0, y1 - y0), at: t => ({ x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t, tx: (x1 - x0) / (Math.hypot(x1 - x0, y1 - y0) || 1), ty: (y1 - y0) / (Math.hypot(x1 - x0, y1 - y0) || 1) }) });
  const arcS = (cx, cy, a0) => segs.push({ len: R * Math.PI / 2, at: t => { const a = a0 + t * Math.PI / 2; return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a), tx: -Math.sin(a), ty: Math.cos(a) }; } });
  line(x + R, y, x + w - R, y); arcS(x + w - R, y + R, -Math.PI / 2); line(x + w, y + R, x + w, y + h - R); arcS(x + w - R, y + h - R, 0);
  line(x + w - R, y + h, x + R, y + h); arcS(x + R, y + h - R, Math.PI / 2); line(x, y + h - R, x, y + R); arcS(x + R, y + R, Math.PI);
  const total = segs.reduce((s, q) => s + q.len, 0);
  return { total, at(d) { d = ((d % total) + total) % total; for (const q of segs) { if (d <= q.len) return q.at(q.len ? d / q.len : 0); d -= q.len; } return segs[0].at(0); } };
}
function volume(w, h, variant) {
  const rand = rng(hash(variant)), dfl = Math.min(P['cl.coreInset'], Math.min(w, h) * P['cl.coreShare']);
  const core = { x: dfl, y: dfl, w: Math.max(1, w - dfl * 2), h: Math.max(1, h - dfl * 2) };
  const env = rrectPerimeter(core, Math.min(P['cl.envRound'], Math.min(core.w, core.h) * .35));
  const count = Math.max(12, Math.ceil(env.total / P['cl.stampGap'])), stamps = [];
  for (let i = 0; i < count; i++) {
    const p = env.at(env.total * (i + .12 + rand() * .35) / count), nx = p.ty, ny = -p.tx, seed = hash(variant + i * 7919);
    stamps.push({ cx: p.x, cy: p.y, nx, ny, width: P['cl.stampW'] + rand() * P['cl.stampWVar'], height: 90, rot: Math.atan2(ny, nx) + Math.PI / 2 + (rand() - .5) * .13, phase: seed % 10, filmIndex: (i + variant) % 5, seed });
  }
  return { core, stamps };
}
function rrectPath(c, r) { const p = new Path2D(); p.roundRect(c.x, c.y, c.w, c.h, Math.max(0, Math.min(r, c.w / 2, c.h / 2))); return p; }

/* ---------- message layout (_rvCloudParts) ---------- */
const mctx = document.createElement('canvas').getContext('2d');
function textFont() { return `${P['tx.weight']} ${P['tx.size']}px Roboto`; }
function wrapLines(text, maxW) {
  mctx.font = textFont(); const out = [];
  for (const para of text.split('\n')) { let line = ''; for (const word of para.split(/(\s+)/)) { const t = line + word; if (mctx.measureText(t.trimEnd()).width > maxW && line.trim()) { out.push(line.trimEnd()); line = word.trimStart(); while (mctx.measureText(line).width > maxW && line.length > 1) { let k = line.length; while (k > 1 && mctx.measureText(line.slice(0, k)).width > maxW) k--; out.push(line.slice(0, k)); line = line.slice(k); } } else line = t; } out.push(line.trimEnd()); }
  return out;
}
function cloudSize(body, avail) {
  const maxW = Math.max(150, Math.min(P['cl.maxW'], avail)), inset = Math.min(P['cl.inset'] + P['sc.padding'], (maxW - 24) / 2);
  const maxTextW = Math.max(24, maxW - 2 * inset), lines = wrapLines(body, Math.max(20, maxTextW - 4));
  mctx.font = textFont(); const tw = Math.max(...lines.map(l => mctx.measureText(l).width), 0), lh = P['tx.size'] * P['tx.line'];
  const textW = Math.max(24, tw + 4), textH = lines.length * lh;
  return { w: Math.min(maxW, Math.max(150, textW + 2 * inset)), h: Math.max(124, textH + 2 * inset), lines, textW: tw, textH, inset };
}

/* ---------- state ---------- */
const ST = { prog: 1, msgs: [], draft: '', draftId: 'd' + Date.now(), tiles: {}, active: false, activeUntil: 0, mist: [], mistTime: 0, nextOff: 0, nextDist: 4, mistInit: false, serial: 0, rand: rng(1119), clipIdx: 0, swap: null, focus: false };
let G = { clouds: [] };
const videos = [document.createElement('video'), document.createElement('video')];
videos.forEach(v => { v.crossOrigin = 'anonymous'; v.muted = true; v.playsInline = true; v.preload = 'auto'; v.loop = false; });
let vCur = 0;
function loadClip(vi, idx, play = true) { idx = clamp(Math.round(+idx || 0),0,CLIPS.length-1); const v = videos[vi]; if (+v.dataset.idx !== idx || !v.src) { v.src = EARTH + CLIPS[idx][1]; v.dataset.idx = idx; } v.playbackRate = rate(idx); if (play && P['earth.play']) v.play().catch(() => {}); else v.pause(); }
const rate = idx => clamp(CLIPS[+idx || 0][2] * P['sc.daySpeed'] / 8 * (P['earth.rate' + (+idx || 0)] ?? 1), .0625, 4);
let waterClock = 0, windClock = 0;
function tileFor(id, size) {
  let t = ST.tiles[id]; const now = performance.now();
  if (!t) t = ST.tiles[id] = { born: now, from: size, to: size, t0: now, vol: null, volKey: '' };
  if (t.to.w !== size.w || t.to.h !== size.h) { const cur = curSize(t, now); t.from = cur; t.to = size; t.t0 = now; }
  return t;
}
function curSize(t, now) { const p = clamp((now - t.t0) / Math.max(1, P['sc.growthMs']), 0, 1), e = 1 - Math.pow(1 - p, 3); return { w: t.from.w + (t.to.w - t.from.w) * e, h: t.from.h + (t.to.h - t.from.h) * e }; }
function prog() { return P['con.hold'] ? clamp(P['con.at'], 0, 1) : ST.prog; }
function startBuild() { ST.prog = 0; ST.tiles = {}; ST.mist = []; ST.mistInit = false; }
function noteActivity() { ST.active = true; ST.activeUntil = performance.now() + P['amb.activeFor'] * 1000; if (!ST.wasActive) ST.nextOff = schedule(); }
const schedule = () => clamp(P['amb.interval'], 18, 90) * (.74 + ST.rand() * .52);
function timeStr(d) { return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }

/* ---------- cloud surface (_RvCloudSurfacePainter) ---------- */
function drawCloud(ctx, x0, y0, w, h, formed, mine, variant, lines, textW, textH, inset) {
  const tileKey = variant + '|' + Math.round(w) + 'x' + Math.round(h) + '|' + [P['cl.coreInset'], P['cl.coreShare'], P['cl.envRound'], P['cl.stampGap'], P['cl.stampW'], P['cl.stampWVar']].join(',');
  const cache = drawCloud.cache || (drawCloud.cache = new Map()); let vol = cache.get(tileKey); if (!vol) { vol = volume(w, h, variant); cache.set(tileKey, vol); if (cache.size > 200) cache.delete(cache.keys().next().value); }
  const amount = clamp(formed, 0, 1), coreA = easeIO((amount - .22) / .54), spread = easeIO((amount - .08) / .82);
  const k = scaleOf(ctx), pad = 80, LW = (w + pad * 2), LH = (h + pad * 2);
  const [c, x] = sc2(2, LW * k, LH * k); x.scale(k, k); x.translate(pad, pad);
  // white core
  x.fillStyle = `rgba(255,255,255,${coreA})`; x.fill(rrectPath({ x: vol.core.x + 12, y: vol.core.y + 12, w: vol.core.w - 24, h: vol.core.h - 24 }, P['cl.coreRound']));
  const film0 = FILM[mine ? MINE : PEER];
  for (const s of vol.stamps) {
    const original = FILMS[s.filmIndex % FILMS.length], unsafe = original.asset === 'cloud-billows-166852-v29.webp';
    const sel = unsafe ? FILM[MINE] : original, t = sel.ready ? sel.motion : film0.motion;
    const freq = .09 + (s.seed % 37) / 310, ph = (s.seed % 628) / 100, swell = Math.sin(t * freq + ph), shift = (P['cl.swellBase'] + P['cl.swellVar'] * P['sc.variety']) * swell;
    const cx = s.cx + s.nx * shift, cy = s.cy + s.ny * shift, local = easeIO((amount - .10 - (s.seed % 23) / 200) / .66);
    if (local <= 0) continue;
    if (unsafe && original.ready) { x.save(); x.clip(rrectPath({ x: vol.core.x + 12, y: vol.core.y + 12, w: vol.core.w - 24, h: vol.core.h - 24 }, P['cl.coreRound'])); drawFilm(x, original, { x: cx - s.nx * 35 - s.width / 2, y: cy - s.ny * 35 - s.height / 2, w: s.width, h: s.height }, { phase: s.phase, opacity: local * .12 }); x.restore(); }
    x.save(); x.translate(cx, cy); x.rotate(s.rot + .035 * Math.sin(t * .08 + ph));
    const exp = P['cl.expand'] + (1 - P['cl.expand']) * local, cr = crownRect(sel, s.seed), cw = s.width * exp * (1 + .05 * swell), chh = cw * (cr[3] - cr[1]) / (cr[2] - cr[0]);
    drawCrown(x, sel, { x: -cw / 2, y: -chh * .42, w: cw, h: chh }, s.seed, local);
    x.restore();
  }
  // whiten where mass already exists (srcATop, blurred rrect core.inflate)
  { const inf = P['cl.whiteInflate'], ws = whiteSprite(vol.core.w + inf * 2, vol.core.h + inf * 2, inf, P['cl.whiteBlur'], k); x.save(); x.globalCompositeOperation = 'source-atop'; x.globalAlpha = coreA; x.drawImage(ws, vol.core.x - inf - ws.pad, vol.core.y - inf - ws.pad, ws.width / k, ws.height / k); x.restore(); }
  // construction pencil lines while forming
  if (amount < .8 && P['cl.pencil']) {
    const la = (1 - easeIO((amount - .42) / .38)) * .74;
    ctx.save(); ctx.translate(x0, y0); ctx.lineCap = 'round'; ctx.lineWidth = .8; ctx.strokeStyle = rgba(P['cl.pencilColor'], la);
    const o = { x: vol.core.x - 15, y: vol.core.y - 15, w: vol.core.w + 30, h: vol.core.h + 30 }, per = rrectPerimeter(o, 36), frac = clamp(amount / .32, 0, 1);
    ctx.beginPath(); for (let d = 0; d <= per.total * frac; d += 4) { const p = per.at(d); d ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); } ctx.stroke();
    ctx.strokeStyle = rgba('#997A58', la * .38); for (const s of vol.stamps) { if ((s.seed % 100) / 100 > amount / .4) continue; ctx.beginPath(); ctx.ellipse(s.cx, s.cy, s.width * .32, s.height * .32, 0, 0, TAU); ctx.stroke(); }
    ctx.restore();
  }
  // shadow then mass
  if (P['sc.shadow'] > 0 && spread > 0) { const q = .25, [sc3, sx3, SW, SH] = sc2(3, LW * k * q, LH * k * q); sx3.filter = `brightness(0) blur(${(P['cl.shadowBlur'] * k * q).toFixed(2)}px)`; sx3.drawImage(c, 0, 0, LW * k, LH * k, 0, 0, SW, SH); sx3.filter = 'none'; ctx.save(); ctx.globalAlpha = P['sc.shadow'] * spread; ctx.drawImage(sc3, 0, 0, SW, SH, x0 - pad + P['cl.shadowX'], y0 - pad + P['cl.shadowY'], LW, LH); ctx.restore(); }
  ctx.drawImage(c, 0, 0, LW * k, LH * k, x0 - pad, y0 - pad, LW, LH);
  // text
  if (formed >= .985 && lines.length) {
    const avail = { x: x0 + Math.min(P['cl.inset'] + P['sc.padding'], Math.max(0, Math.min((w - 24) / 2, (h - 24) / 2))), y: 0 }; avail.w = w - 2 * (avail.x - x0);
    const lh = P['tx.size'] * P['tx.line'], top = y0 + h / 2 - textH / 2;
    ctx.save(); ctx.beginPath(); ctx.rect(avail.x, y0 + Math.min(P['cl.inset'] + P['sc.padding'], Math.max(0, Math.min((w - 24) / 2, (h - 24) / 2))), avail.w, h - 2 * Math.min(P['cl.inset'] + P['sc.padding'], Math.max(0, Math.min((w - 24) / 2, (h - 24) / 2)))); ctx.clip();
    ctx.font = textFont(); ctx.fillStyle = P['tx.color']; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    lines.forEach((l, i) => ctx.fillText(l, x0 + w / 2, top + lh * (i + .5)));
    ctx.restore();
  }
  return vol;
}

/* ---------- ambient mist (_RvMistScene / _RvMistPainter) ---------- */
function offshoot(Wd, Hd, targets) {
  const r = ST.rand; if (!targets.length) return null;
  const roll = r(), small = P['amb.smallChance'], medium = Math.min(1 - small, P['amb.mediumChance']), kind = roll < small ? 'small' : roll < small + medium ? 'medium' : 'large';
  const width = kind === 'small' ? P['amb.smallW'] + r() * 34 : kind === 'medium' ? P['amb.mediumW'] + r() * 46 : P['amb.largeW'] + r() * 42;
  const entries = targets.slice().sort(() => r() - .5); let chosen = null, anchor = null, normal = null, best = -Infinity;
  for (const e of entries.slice(0, 5)) for (const n of [[-1, .24], [1, .22], [-.26, 1], [.24, -1]]) {
    const a = Math.abs(n[0]) > Math.abs(n[1]) ? [n[0] < 0 ? 0 : 1, .2 + r() * .6] : [.2 + r() * .6, n[1] < 0 ? 0 : 1];
    const sx = e.x + a[0] * e.w, sy = e.y + a[1] * e.h; if (sy < 115 || sy > Hd - 115) continue;
    const ax = sx + n[0] * width * .65, ay = sy + n[1] * width * .65;
    const covered = targets.some(o => o !== e && ax >= o.x - 15 && ax <= o.x + o.w + 15 && ay >= o.y - 15 && ay <= o.y + o.h + 15);
    const clearance = Math.min(Math.min(ax, Wd - ax), Math.min(ay - 95, Hd - 95 - ay)), score = clearance - (covered ? 180 : 0) + r() * 24;
    if (score > best) { best = score; chosen = e; anchor = a; normal = n; }
  }
  if (!chosen) return null;
  const naturalFate = kind === 'large' ? 'drift' : kind === 'small' ? (r() < .72 ? 'dissolve' : 'drift') : (r() < .58 ? 'absorb' : 'drift');
  const fate = P['amb.fate'] === 'natural' ? naturalFate : P['amb.fate'];
  const ox = chosen.x + anchor[0] * chosen.w - normal[0] * 22, oy = chosen.y + anchor[1] * chosen.h - normal[1] * 22, sp = kind === 'large' ? 5 : 6 + r() * 3;
  return { id: ST.serial++, source: chosen.id, anchor, normal, x: ox, y: oy, vx: normal[0] * sp, vy: normal[1] * sp, width, life: kind === 'small' ? P['amb.smallLife'] + r() * P['amb.smallLifeVar'] : P['amb.largeLife'] + r() * P['amb.largeLifeVar'], fate, skin: Math.floor(r() * 5), phase: Math.floor(r() * 10), turn: (r() - .5) * .65, kind, attach: P['amb.attach'] + r() * P['amb.attachVar'], aspect: .59 + r() * .2, age: 0, fade: 0, merging: 0, sp: { x: ox, y: oy } };
}
function distantCloud(Wd, Hd, targets) {
  const r = ST.rand; let pos = null;
  for (let i = 0; i < 16; i++) { const p = { x: 25 + r() * Math.max(1, Wd - 50), y: 110 + r() * Math.max(1, Hd - 220) }; if (!targets.some(t => p.x >= t.x - 32 && p.x <= t.x + t.w + 32 && p.y >= t.y - 32 && p.y <= t.y + t.h + 32)) { pos = p; break; } }
  if (!pos) return null;
  return { id: ST.serial++, x: pos.x, y: pos.y, vx: 0, vy: 0, width: P['amb.distantW'] + r() * 27, life: P['amb.distantLife'] + r() * P['amb.distantLifeVar'], fate: 'dissolve', skin: Math.floor(r() * 5), phase: Math.floor(r() * 10), turn: (r() - .5) * .7, kind: 'distant', attach: 0, aspect: .52 + r() * .24, age: 0, fade: 0, merging: 0 };
}
const mGrowth = p => p.attach > 0 ? easeIO(p.age / p.attach) : easeIO(p.age / 3);
const mOpacity = p => (p.kind === 'distant' ? easeIO(p.age / 3) : (.42 + .58 * mGrowth(p))) * (1 - p.fade) * (1 - p.merging);
const mScale = p => (p.source == null ? 1 : .42 + .58 * mGrowth(p)) * (1 + .18 * p.fade) * (1 - .64 * p.merging);
const mConn = p => p.source == null || !p.sp ? 0 : p.age < p.attach ? 1 : 1 - easeIO((p.age - p.attach) / 4.5);
function stepMist(dt, Wd, Hd, targets) {
  dt = clamp(dt, 0, .1); ST.mistTime += dt;
  if (!ST.mistInit) { ST.mistInit = true; ST.nextOff = schedule(); ST.nextDist = 3 + ST.rand() * 3; }
  const active = ST.active; if (active && !ST.wasActive) ST.nextOff = schedule(); ST.wasActive = active;
  const budget = clamp(Math.round(P['sc.ambientCount']), 0, 8);
  if (budget === 0) { ST.mist = []; return; }
  if (active) { ST.nextOff -= dt; if (ST.nextOff <= 0) { if (ST.mist.filter(p => p.kind !== 'distant').length < budget) { const c = offshoot(Wd, Hd, targets); if (c) ST.mist.push(c); } ST.nextOff = schedule(); } ST.nextDist = 4 + ST.rand() * .5; }
  else { ST.nextDist -= dt; if (ST.nextDist <= 0) { if (ST.mist.filter(p => p.kind === 'distant').length < Math.min(3, budget)) { const c = distantCloud(Wd, Hd, targets); if (c) ST.mist.push(c); } ST.nextDist = P['amb.distantEvery'] + ST.rand() * P['amb.distantEveryVar']; } }
  const byId = Object.fromEntries(targets.map(t => [t.id, t]));
  for (const p of ST.mist) {
    p.age += dt;
    if (p.source != null && p.age < p.attach + 4.5) { const r = byId[p.source]; p.sp = r ? { x: r.x + p.anchor[0] * r.w - p.normal[0] * 22, y: r.y + p.anchor[1] * r.h - p.normal[1] * 22 } : null; }
    if (p.source != null && p.age < p.attach) { if (!p.sp) { p.fade = Math.min(1, p.fade + dt / 2); continue; } p.x = p.sp.x + p.normal[0] * p.width * .40 * mGrowth(p); p.y = p.sp.y + p.normal[1] * p.width * .40 * mGrowth(p); continue; }
    if (p.target != null) { const r = byId[p.target]; if (!r) { p.target = null; p.fade = Math.max(p.fade, .1); } else { p.merging = Math.min(1, p.merging + dt / 4.2); const s = p.ms, ex = clamp(s.x, r.x + 10, r.x + r.w - 10), ey = clamp(s.y, r.y + 10, r.y + r.h - 10), e = easeIO(p.merging); p.x = s.x + (ex - s.x) * e; p.y = s.y + (ey - s.y) * e; if (p.merging >= 1) p.dead = true; continue; } }
    if (p.kind === 'distant') { p.x += P['amb.groundVX'] * dt; p.y += P['amb.groundVY'] * dt; }
    else { const wx = Math.sin(windClock * .13 + p.id * 2.1) * 1.3 * P['amb.turbulence'], wy = Math.cos(windClock * .11 + p.id * .9) * .85 * P['amb.turbulence']; p.x += (p.vx + wx + P['amb.windX']) * dt * P['sc.ambientSpeed']; p.y += (p.vy + wy + P['amb.windY']) * dt * P['sc.ambientSpeed']; }
    if (p.kind !== 'distant' && p.fade === 0 && p.fate === 'absorb' && p.age > p.attach + 4) for (const t of targets) if (t.id !== p.source && p.x >= t.x - p.width * .3 && p.x <= t.x + t.w + p.width * .3 && p.y >= t.y - p.width * .3 && p.y <= t.y + t.h + p.width * .3) { p.target = t.id; p.ms = { x: p.x, y: p.y }; break; }
    if (p.fade > 0 || (p.fate !== 'drift' && p.age > p.life + p.attach)) p.fade = Math.min(1, p.fade + dt / (p.kind === 'distant' ? 6 : 8));
    const m = p.width * P['sc.ambientScale']; if (p.fade >= 1 || p.x < -m || p.x > Wd + m || p.y < -m || p.y > Hd + m || p.age > 180) p.dead = true;
  }
  ST.mist = ST.mist.filter(p => !p.dead);
}
function drawMist(ctx) {
  if (!P['amb.on']) return;
  const clean = [FILM['cloud-anvil-258398-v29.webp'], FILM['cloud-tower-365034-v29.webp']].filter(f => f.ready);
  const ordered = ST.mist.slice().sort((a, b) => (a.kind === 'distant') === (b.kind === 'distant') ? 0 : a.kind === 'distant' ? -1 : 1);
  G.mist = [];
  for (const p of ordered) {
    const film = clean.length ? clean[p.skin % clean.length] : FILMS[p.skin % 5]; if (!film.ready) continue;
    const op = clamp(mOpacity(p) * P['sc.ambientOpacity'] * (p.kind === 'distant' ? .75 : 1.35), 0, 1);
    const w = p.width * P['sc.ambientScale'] * mScale(p), h = w * (film.bounds.h / film.bounds.w);
    const conn = shadow => {
      if (!p.sp || mConn(p) <= .001 || p.kind === 'distant') return;
      const dx = p.x - p.sp.x, dy = p.y - p.sp.y, n = Math.max(2, Math.ceil(Math.hypot(dx, dy) / Math.max(12, w * .3)));
      for (let i = 0; i < n; i++) {
        const t = (i + .5) / n, cx = p.sp.x + dx * t + (shadow ? P['amb.shadowX'] : 0), cy = p.sp.y + dy * t + (shadow ? P['amb.shadowY'] : 0);
        const nw = w * (.48 + .18 * Math.sin((i + 1) * 1.7)) * (.35 + .65 * mConn(p));
        ctx.save(); if (shadow) ctx.filter = `blur(${(7 * scaleOf(ctx)).toFixed(1)}px)`;
        drawFilm(ctx, film, { x: cx - nw / 2, y: cy - nw * .3, w: nw, h: nw * .6 }, { phase: p.phase + 3 + i, opacity: op * mConn(p) * (shadow ? P['sc.shadow'] : 1), shadow });
        ctx.restore();
      }
    };
    const body = shadow => {
      const dsp = p.kind === 'distant' ? [5, 8] : [P['amb.shadowX'], P['amb.shadowY']], cx = p.x + (shadow ? dsp[0] : 0), cy = p.y + (shadow ? dsp[1] : 0);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(p.turn + P['amb.angle'] * Math.PI / 180 + P['amb.rock'] * Math.PI / 180 * Math.sin(windClock * .10 + p.id));
      if (shadow) ctx.filter = `blur(${((p.kind === 'distant' ? 2.4 : 7) * scaleOf(ctx)).toFixed(1)}px)`;
      const dw = w * (1 + .045 * Math.sin(ST.mistTime * .17 + p.id)), dh = h * (1 + .035 * Math.cos(ST.mistTime * .13 + p.id * 1.7));
      drawFilm(ctx, film, { x: -dw / 2, y: -dh / 2, w: dw, h: dh }, { phase: p.phase, opacity: op * (shadow ? P['sc.shadow'] * (p.kind === 'distant' ? .8 : 1) : 1), shadow });
      if (p.kind !== 'distant') { const extra = clean.length ? clean[(p.skin + 1) % clean.length] : film, ratio = extra.bounds.h / extra.bounds.w; drawFilm(ctx, extra, { x: w * .19 - w * .63 / 2, y: -h * .07 - w * .63 * ratio / 2, w: w * .63, h: w * .63 * ratio }, { phase: p.phase + 7, opacity: op * (shadow ? P['sc.shadow'] : 1), shadow }); }
      ctx.restore();
    };
    conn(true); body(true); conn(false); body(false);
    G.mist.push({ x: p.x - w / 2, y: p.y - h / 2, w, h });
  }
}

/* ---------- water shimmer (_RvWaterTrack / _RvWaterPainter) ---------- */
let WATER = null; fetch('raven/water-1120.json').then(r => r.json()).then(d => { WATER = d; }).catch(() => {});
const waterMasks = new Map(), WS = 4;
const SPARK = (() => { const r = rng(1937), out = []; for (let i = 0; i < 1100; i++) { const x = r(), y = r(), ph = r() * TAU, sp = .6 + r() * .6, w = .7 + r() * 1.8; out.push([x, y, ph, sp, w]); } return out; })();
function waterMask(name, tr, i) {
  const key = name + '|' + i + '|' + P['wa.maskBlur']; let m = waterMasks.get(key); if (m) return m;
  const fr = tr.frames, A = fr[i] || [], B = fr[Math.min(i + 1, fr.length - 1)] || [], C = fr[Math.max(0, i - 1)] || [];
  const W = tr.width, H = tr.height, grid = n => { const g = new Uint8Array(W * H); for (const [x, y, w, h] of n) for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (xx >= 0 && yy >= 0 && xx < W && yy < H) g[yy * W + xx] = 1; return g; };
  const a = grid(A), b = grid(B), c = grid(C); let any = 0; const hard = mkCanvas(W * WS, H * WS), hx = hard.getContext('2d'); hx.fillStyle = '#fff';
  for (let k = 0; k < W * H; k++) if (a[k] && b[k] && c[k]) { any = 1; hx.fillRect((k % W) * WS, Math.floor(k / W) * WS, WS, WS); }
  if (!any) { m = { empty: true }; waterMasks.set(key, m); return m; }
  const soft = mkCanvas(W * WS, H * WS), sx = soft.getContext('2d'); sx.filter = `blur(${P['wa.maskBlur'] * WS}px)`; sx.drawImage(hard, 0, 0); sx.filter = 'none'; sx.globalCompositeOperation = 'destination-in'; sx.drawImage(hard, 0, 0);
  m = { hard, soft }; waterMasks.set(key, m); if (waterMasks.size > 40) waterMasks.delete(waterMasks.keys().next().value); return m;
}
const waterLayer = mkCanvas(240 * WS, 150 * WS);
function waterColor(tr, t) { const cs = tr.colors || []; if (!cs.length) return [0x21, 0x46, 0x56]; const i = clamp(Math.floor(t / tr.step), 0, cs.length - 1), j = Math.min(i + 1, cs.length - 1), f = (t / tr.step) % 1; return [0, 1, 2].map(k => cs[i][k] + (cs[j][k] - cs[i][k]) * f); }
const lerpC = (a, hex, f) => { const b = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]; return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * f)).join(',')})`; };
function drawWater(ctx, v, alpha, now) {
  const strength = P['sc.waterShimmer']; if (!WATER || strength <= 0 || !v.videoWidth || alpha <= 0 || !P['wa.on']) return;
  const clip = CLIPS[+v.dataset.idx]; const tr = clip && WATER[clip[3]]; if (!tr) return;
  const t = v.currentTime, i = clamp(Math.floor(t / tr.step), 0, tr.frames.length - 1), m = waterMask(clip[3], tr, i); if (m.empty) return;
  const W = K.W, H = K.H, vw = v.videoWidth, vh = v.videoHeight, sc0 = Math.max(W / vw, H / vh), sw = W / sc0, sh = H / sc0;
  const src = { x: (vw - sw) / 2 / vw * tr.width, y: (vh - sh) / 2 / vh * tr.height, w: sw / vw * tr.width, h: sh / vh * tr.height };
  const L = waterLayer, x = L.getContext('2d'), LW = L.width, LH = L.height, wc = waterColor(tr, t), clock = waterClock;
  x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.clearRect(0, 0, LW, LH);
  const g = x.createLinearGradient(0, 0, LW, LH); g.addColorStop(0, lerpC(wc, P['wa.light'], .10)); g.addColorStop(1, lerpC(wc, P['wa.deep'], .12));
  x.globalAlpha = P['wa.tint'] * strength; x.fillStyle = g; x.fillRect(0, 0, LW, LH); x.globalAlpha = 1;
  x.globalCompositeOperation = 'destination-in'; x.drawImage(m.soft, 0, 0); x.globalCompositeOperation = 'source-over';
  const hz = x.createRadialGradient(LW * .58, LH * .30, 0, LW * .58, LH * .30, LW * .55); hz.addColorStop(0, `rgba(255,246,218,${P['wa.haze'] * strength})`); hz.addColorStop(1, 'rgba(255,246,218,0)'); x.fillStyle = hz; x.fillRect(0, 0, LW, LH);
  const n = Math.min(SPARK.length, Math.round(P['wa.sparkles'])); x.fillStyle = '#FFF8E5';
  for (let k = 0; k < n; k++) {
    const [rx, ry, ph, sp, w] = SPARK[k], px = rx * tr.width, py = ry * tr.height;
    const crest = Math.pow(Math.max(0, Math.sin(clock * sp + ph)), 5), glare = Math.exp(-Math.pow((px - tr.width * .58) / (tr.width * .4), 2) - Math.pow((py - tr.height * .3) / (tr.height * .65), 2));
    const a = crest * glare * strength * P['wa.spark']; if (a < .005) continue;
    x.globalAlpha = Math.min(1, a); x.beginPath(); x.ellipse((px + Math.sin(clock * .24 + ph) * .7) * WS, py * WS, w / 2 * WS, .175 * WS, 0, 0, TAU); x.fill();
  }
  x.globalAlpha = 1; x.globalCompositeOperation = 'destination-in'; x.drawImage(m.hard, 0, 0); x.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.globalAlpha = alpha; ctx.drawImage(L, src.x * WS, src.y * WS, src.w * WS, src.h * WS, 0, 0, W, H); ctx.restore();
}

/* ---------- terrain outlines (_RvTerrainRegistration) ---------- */
let TERR = null; const terrCache = {}; fetch('raven/terrain-1120.json').then(r => r.json()).then(d => { TERR = d; }).catch(() => {});
const TALIAS = { 'earth-japan-continuous-v34.mp4': 'earth-japan-rigid-v32.mp4', 'earth-terrain-continuous-v34.mp4': 'earth-terrain-v29.mp4', 'earth-river-plains-continuous-v34.mp4': 'earth-river-plains-v29.mp4', 'earth-woodlands-continuous-v34.mp4': 'earth-woodlands-v29.mp4', 'earth-forest-river-continuous-v34.mp4': 'earth-forest-river-v29.mp4', 'earth-changing-landscapes-continuous-v34.mp4': 'earth-changing-landscapes-v29.mp4', 'earth-green-rivers-continuous-v34.mp4': 'earth-green-rivers-v29.mp4', 'earth-farmland-continuous-v34.mp4': 'earth-farmland-v29.mp4', 'earth-close-farmland-continuous-v34.mp4': 'earth-close-farmland-v29.mp4', 'earth-ice-fjords-continuous-v34.mp4': 'earth-ice-fjords-v29.mp4' };
function decodeTerrain(b64) {
  const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  const dv = new DataView(u.buffer); let c = 0; const byte = () => u[c++], short = () => { const v = dv.getUint16(c, true); c += 2; return v; }, num = () => { const v = dv.getFloat32(c, true); c += 4; return v; };
  if (byte() !== 1) return null; const sw = short(), sh = short(), duration = num(), count = short(), frames = [];
  for (let f = 0; f < count; f++) { const time = num(), pc = byte(), paths = []; for (let p = 0; p < pc; p++) { const n = byte(), pts = []; for (let k = 0; k < n; k++) { const packed = byte() | (byte() << 8) | (byte() << 16); pts.push([(packed & 4095) / 4095, (packed >> 12) / 4095]); } paths.push(pts); } const qc = byte(), poses = []; for (let q = 0; q < qc; q++) { const t = num(), m = [num(), num(), num(), num(), num(), num()]; poses.push({ t, m, e: num() }); } frames.push({ time, paths, poses }); }
  return { sw, sh, duration, frames };
}
function terrainAt(asset, seconds) {
  if (!TERR) return null; const file = asset.split('/').pop(), name = TALIAS[file] || file, enc = TERR[name]; if (!enc) return null;
  const reg = terrCache[name] || (terrCache[name] = decodeTerrain(enc)); if (!reg) return null;
  const time = isFinite(seconds) ? clamp(seconds, 0, reg.duration) : 0; let fr = reg.frames[0];
  for (const c of reg.frames) if (Math.abs(c.time - time) < Math.abs(fr.time - time)) fr = c;
  const ps = fr.poses; if (!ps.length || time < ps[0].t - .02 || time > ps[ps.length - 1].t + .02) return null;
  let a = ps[0], b = ps[ps.length - 1]; for (const q of ps) { if (q.t <= time) a = q; if (q.t >= time) { b = q; break; } }
  if (a.e >= 3 || b.e >= 3) return null; if (a.t > b.t) a = b; const span = b.t - a.t, f = span > 1e-5 ? clamp((time - a.t) / span, 0, 1) : 0, m = a.m.map((v, k) => v + (b.m[k] - v) * f);
  return fr.paths.map(pts => pts.map(([x, y]) => [m[0] * x + m[1] * y + m[2], m[3] * x + m[4] * y + m[5]]));
}

/* ---------- construction entrance (_RvConstructionPainter, mesh, assembly reveal) ---------- */
const cEase = (v, a, b) => easeIO(clamp((v - a) / (b - a), 0, 1)), cRamp = (v, a, b) => clamp((v - a) / (b - a), 0, 1);
function meshCells(W, H) {
  const cols = Math.max(1, Math.round(P['con.cols'])), rows = Math.max(1, Math.round(P['con.rows'])), cells = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const x0 = W * c / cols, x1 = W * (c + 1) / cols, y0 = H * r / rows, y1 = H * (r + 1) / rows, span = .36 / rows, ms = .42 + r * span + c * span * .14; cells.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0, ms, me: ms + span * .58 }); }
  return cells;
}
const cellReveal = (c, p) => easeIO(cRamp(p, c.ms, c.me));
function revealedPath(cells, p, W, H, into) { const path = into || new Path2D(); if (p >= .78) { path.rect(0, 0, W, H); return path; } for (const c of cells) { const a = cellReveal(c, p); if (a <= 0) continue; path.rect(c.x, c.y, c.w, c.h * Math.min(1, a)); } return path; }
function polyLen(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
function trace(ctx, polys, amount) {
  if (amount <= 0) return; if (!Array.isArray(polys[0][0])) polys = [polys];
  let rem = amount >= .999 ? Infinity : polys.reduce((s, q) => s + (q.len ?? (q.len = polyLen(q))), 0) * amount;
  ctx.beginPath();
  for (const q of polys) { if (rem <= 0) break; ctx.moveTo(q[0][0], q[0][1]); for (let i = 1; i < q.length; i++) { const d = Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]); if (d >= rem) { const f = rem / d; ctx.lineTo(q[i - 1][0] + (q[i][0] - q[i - 1][0]) * f, q[i - 1][1] + (q[i][1] - q[i - 1][1]) * f); rem = 0; break; } ctx.lineTo(q[i][0], q[i][1]); rem -= d; } }
  ctx.stroke();
}
function rrPoly(x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); const pts = [], arc = (cx, cy, a0) => { for (let k = 0; k <= 8; k++) { const a = a0 + k / 8 * Math.PI / 2; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } }; arc(x + w - r, y + r, -Math.PI / 2); arc(x + w - r, y + h - r, 0); arc(x + r, y + h - r, Math.PI / 2); arc(x + r, y + r, Math.PI); pts.push(pts[0].slice()); return pts; }
function ovalPoly(cx, cy, r) { const pts = []; for (let k = 0; k <= 32; k++) { const a = k / 32 * TAU; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return pts; }
function cross(ctx, x, y, alpha, radius = 3.5) { if (alpha <= 0) return; ctx.strokeStyle = rgba(P['con.charcoal'], alpha); ctx.lineWidth = .55; ctx.beginPath(); ctx.moveTo(x - radius, y); ctx.lineTo(x + radius, y); ctx.moveTo(x, y - radius); ctx.lineTo(x, y + radius); ctx.stroke(); ctx.fillStyle = rgba(P['con.amber'], alpha); ctx.beginPath(); ctx.arc(x, y, .75, 0, TAU); ctx.fill(); }
function measure(ctx, ax, ay, bx, by, amount, alpha) {
  if (amount <= 0 || alpha <= 0) return; const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy); if (L < 1) return; const tx = dx / L, ty = dy / L, nx = -ty, ny = tx;
  ctx.strokeStyle = rgba(P['con.charcoal'], alpha); ctx.lineWidth = .55; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + dx * amount, ay + dy * amount); ctx.moveTo(ax - nx * 3, ay - ny * 3); ctx.lineTo(ax + nx * 3, ay + ny * 3);
  if (amount > .98) { ctx.moveTo(bx - nx * 3, by - ny * 3); ctx.lineTo(bx + nx * 3, by + ny * 3); }
  for (let n = 1; n < 8; n++) { if (n / 8 > amount) break; const px = ax + dx * n / 8, py = ay + dy * n / 8; ctx.moveTo(px - nx * 1.5, py - ny * 1.5); ctx.lineTo(px + nx * 1.5, py + ny * 1.5); } ctx.stroke();
}
function partFrame(ctx, p, r, begin, end, dir, composer) {
  if (r.w <= 0 || r.h <= 0) return; const drawn = cEase(p, begin - .18, begin + .03), seated = cEase(p, begin - .09, end - .06), ret = 1 - cEase(p, end - .07, end + .07); if (drawn <= 0 || ret <= 0) return;
  const rad = Math.min(composer ? 24 : 13, r.h / 2), depthStep = composer ? P['con.cmpDepth'] : P['con.hdDepth'], col = [P['con.amber'], P['con.blue'], P['con.red']];
  ctx.lineWidth = .9; ctx.strokeStyle = rgba(P['con.charcoal'], .58 * ret); trace(ctx, rrPoly(r.x, r.y, r.w, r.h, rad), drawn);
  for (let layer = 0; layer < 3; layer++) {
    const z = (1 - seated) * (layer + 1) * depthStep, sx = dir * z * .37, sy = -z, inf = (1 - seated) * layer * 1.4, e = { x: r.x + sx - inf, y: r.y + sy - inf, w: r.w + inf * 2, h: r.h + inf * 2 }, color = col[layer];
    if (layer > 0) {
      ctx.save(); ctx.filter = `blur(${(3 * scaleOf(ctx)).toFixed(2)}px)`; ctx.fillStyle = rgba(P['con.amber'], .07 * drawn * ret); ctx.beginPath(); ctx.roundRect(e.x + 2, e.y + 3.5 + (1 - seated) * 3, e.w, e.h, rad); ctx.fill(); ctx.restore();
      ctx.fillStyle = rgba(color, (layer === 1 ? .045 : .065) * drawn * ret); ctx.beginPath(); ctx.roundRect(e.x, e.y, e.w, e.h, rad); ctx.fill();
      ctx.fillStyle = rgba(color, .20 * drawn * ret); ctx.beginPath(); ctx.roundRect(e.x, e.y, e.w, e.h, rad); ctx.roundRect(e.x + 1.7, e.y + 1.7, e.w - 3.4, e.h - 3.4, Math.max(0, rad - 1.7)); ctx.fill('evenodd');
    }
    ctx.lineWidth = layer === 2 ? 1.3 : .85; ctx.strokeStyle = rgba(color, .67 * ret); trace(ctx, rrPoly(e.x, e.y, e.w, e.h, rad), drawn);
    if (layer === 2 && seated < .995) for (const x of [r.x + rad, r.x + r.w - rad]) { const ty = r.y + r.h; ctx.strokeStyle = rgba(P['con.charcoal'], .45 * ret); ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(x, ty); ctx.lineTo(x + sx, ty + sy); ctx.stroke(); cross(ctx, x, ty, .36 * ret); }
  }
  const ins = Math.min(7, r.h * .17); ctx.lineWidth = .8; ctx.strokeStyle = rgba(P['con.blue'], .42 * ret); trace(ctx, rrPoly(r.x + ins, r.y + ins, r.w - ins * 2, r.h - ins * 2, Math.max(3, rad - 7)), drawn);
  const mx = r.x + r.w - Math.min(25, r.w * .09), my = r.y + r.h / 2; ctx.strokeStyle = rgba(P['con.amber'], .53 * ret); trace(ctx, ovalPoly(mx, my, Math.min(12, r.h * .24)), drawn); cross(ctx, mx, my, .33 * drawn * ret, 3);
  const divs = composer ? [r.x + r.w - Math.min(50, r.w * .18)] : [r.x + 45, r.x + r.w - Math.min(95, r.w * .26)];
  for (const x of divs) measure(ctx, x, r.y + 6, x, r.y + r.h - 6, drawn, .32 * ret);
  const along = composer ? r.y + r.h + 6 : r.y - 6; measure(ctx, r.x + rad, along, r.x + r.w - rad, along, drawn, .38 * ret);
}
function drawConstruction(ctx, p, W, H, cells, hdr, cmp, terrain) {
  if (p >= .96) return;
  const unfilled = new Path2D(); unfilled.rect(0, 0, W, H); revealedPath(cells, p, W, H, unfilled);
  ctx.save(); ctx.clip(unfilled, 'evenodd');
  const g = ctx.createRadialGradient(W / 2 - .35 * W / 2, H / 2 - .5 * H / 2, 0, W / 2 - .35 * W / 2, H / 2 - .5 * H / 2, 1.45 * Math.min(W, H)); g.addColorStop(0, P['con.paperLight']); g.addColorStop(.55, P['con.paper']); g.addColorStop(1, P['con.paperDark']); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
  const sa = 1 - cEase(p, .53, .79), bi = Math.min(12, W * .03), B = { x: bi, y: bi, w: W - bi * 2, h: H - bi * 2 };
  if (sa > 0 && P['con.scaffold']) {
    const tr = cEase(p, 0, .18); ctx.lineWidth = .6; ctx.strokeStyle = rgba(P['con.charcoal'], .22 * sa); trace(ctx, rrPoly(B.x, B.y, B.w, B.h, 24), tr);
    for (const [x, y] of [[B.x, B.y], [B.x + B.w, B.y], [B.x + B.w, B.y + B.h], [B.x, B.y + B.h]]) cross(ctx, x, y, (.15 + tr * .25) * sa, 5);
    const ap = cEase(p, .02, .22); measure(ctx, W / 2, B.y, W / 2, B.y + B.h, ap, .10 * sa);
    for (const r of [hdr, cmp]) if (r) measure(ctx, B.x, r.y + r.h / 2, B.x + B.w, r.y + r.h / 2, ap, .15 * sa);
  }
  const tp = terrain || [], ta = (1 - cEase(p, .60, .82)) * P['con.terrain'];
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (ta > 0) for (let i = 0; i < tp.length; i++) { const amt = cEase(p, .025 + (i % 7) * .012, .23 + (i % 5) * .021); ctx.lineWidth = i % 6 === 0 ? 1.05 : .63; ctx.strokeStyle = rgba(i % 6 === 0 ? P['con.amber'] : P['con.charcoal'], Math.min(1, (i % 6 === 0 ? .20 : .14) * ta)); trace(ctx, tp[i], amt); }
  const cx = W / 2, cy = H / 2, inks = [P['con.charcoal'], P['con.amber'], P['con.blue']], tints = [P['con.amber'], P['con.red'], P['con.blue']];
  for (let layer = 2; layer >= 0; layer--) {
    const drawn = cEase(p, .025 + layer * .035, .22 + layer * .055), seated = cEase(p, .16 + layer * .045, .52 + layer * .06), ret = 1 - cEase(p, .57 + layer * .025, .78 + layer * .015);
    if (drawn <= 0 || ret <= 0 || !tp.length) continue;
    const z = (1 - seated) * (P['con.lift'] + layer * P['con.liftStep']), sx = (layer - 1) * z * .24, sy = -z, scY = 1 - (1 - seated) * (.10 + layer * .055), alpha = drawn * ret * P['con.terrain'];
    ctx.save(); ctx.clip(unfilled, 'evenodd'); ctx.translate(cx + sx, cy + sy); ctx.scale(1, scY); ctx.translate(-cx, -cy);
    for (let i = layer; i < tp.length; i += 3) {
      const amt = cEase(p, .025 + (i % 7) * .012, .23 + (i % 5) * .021);
      if (z > 1) { ctx.save(); ctx.translate(z * .035, 2.2 + z * .07); ctx.lineJoin = 'round'; ctx.lineCap = 'butt'; ctx.lineWidth = 1.2; ctx.strokeStyle = rgba(tints[layer], Math.min(1, .26 * alpha)); trace(ctx, tp[i], amt); ctx.restore(); }
      ctx.lineCap = 'round'; ctx.lineWidth = i % 5 === 0 ? 1.10 : .76; ctx.strokeStyle = rgba(inks[layer], Math.min(1, .78 * alpha)); trace(ctx, tp[i], amt);
    }
    ctx.restore();
    if (z > 1.5) { let n = 0; for (let i = layer; i < tp.length && n < 6; i += 9) { const q = tp[i]; if (!q || q.length < 2) continue; const L = q.len ?? (q.len = polyLen(q)); if (L < 14) continue; let rem = L * .38, at = q[0]; for (let k = 1; k < q.length; k++) { const d = Math.hypot(q[k][0] - q[k - 1][0], q[k][1] - q[k - 1][1]); if (d >= rem) { const f = rem / d; at = [q[k - 1][0] + (q[k][0] - q[k - 1][0]) * f, q[k - 1][1] + (q[k][1] - q[k - 1][1]) * f]; break; } rem -= d; }
      const rx = cx + (at[0] - cx) + sx, ry = cy + (at[1] - cy) * scY + sy, inB = (x, y) => x >= 0 && y >= 0 && x <= W && y <= H; if (!inB(at[0], at[1]) || !inB(rx, ry)) continue;
      ctx.save(); ctx.clip(unfilled, 'evenodd'); ctx.lineWidth = .65; ctx.strokeStyle = rgba(inks[layer], .28 * alpha); ctx.beginPath(); ctx.moveTo(at[0], at[1]); ctx.lineTo(rx, ry); ctx.stroke(); cross(ctx, at[0], at[1], .31 * alpha, 2.8); ctx.strokeStyle = rgba(tints[layer], .56 * alpha); ctx.beginPath(); ctx.arc(rx, ry, 1.35, 0, TAU); ctx.stroke(); ctx.restore(); n++; } }
  }
  if (p > .42 && p < .78 && P['con.fronts']) for (const c of cells) {
    const a = cellReveal(c, p); if (a <= .001 || a >= .999) continue; const f = c.y + c.h * a, st = Math.sin(a * Math.PI);
    ctx.save(); ctx.filter = `blur(${(2.5 * scaleOf(ctx)).toFixed(2)}px)`; ctx.strokeStyle = rgba(P['con.charcoal'], .24 * st); ctx.lineWidth = 2.2; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.moveTo(c.x, f + 2.3); ctx.lineTo(c.x + c.w, f + 2.3); ctx.stroke(); ctx.restore();
    ctx.strokeStyle = rgba('#F8EAC9', .66 * st); ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(c.x, f); ctx.lineTo(c.x + c.w, f); ctx.stroke();
    ctx.strokeStyle = rgba(P['con.amber'], .35 * st); ctx.lineWidth = .65; ctx.beginPath(); ctx.moveTo(c.x, f + 1); ctx.lineTo(c.x + c.w, f + 1); ctx.stroke();
  }
  ctx.lineCap = 'butt';
  const fa = 1 - cEase(p, .70, .86);
  if (hdr && cmp && fa > 0) { const fx0 = Math.min(hdr.x, cmp.x) - 3, fx1 = Math.max(hdr.x + hdr.w, cmp.x + cmp.w) + 3, fy0 = hdr.y - 3, fy1 = cmp.y + cmp.h + 3, rails = cEase(p, .16, .40); for (const x of [fx0, fx1]) measure(ctx, x, fy0 + 13, x, fy1 - 20, rails, .23 * fa); cross(ctx, (fx0 + fx1) / 2, (fy0 + fy1) / 2, .13 * rails * fa, 5); }
  if (hdr) partFrame(ctx, p, hdr, P['con.hdBegin'], P['con.hdEnd'], -1, false);
  if (cmp) partFrame(ctx, p, cmp, P['con.cmpBegin'], P['con.cmpEnd'], 1, true);
}
// _RvAssemblyReveal: lift + squash + warm tint while a part seats.
let warmSvg = null;
function warmFilter(w) {
  if (!warmSvg) { warmSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); warmSvg.setAttribute('width', 0); warmSvg.setAttribute('height', 0); warmSvg.style.position = 'absolute'; warmSvg.innerHTML = '<filter id="rvWarm" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"/></filter>'; document.body.appendChild(warmSvg); }
  const m = [1 - w * .19, w * .15, w * .04, 0, w * 15 / 255, w * .07, 1 - w * .19, w * .08, 0, w * 8 / 255, w * .06, w * .07, 1 - w * .34, 0, 0, 0, 0, 0, 1, 0];
  warmSvg.querySelector('feColorMatrix').setAttribute('values', m.map(v => v.toFixed(4)).join(' ')); return 'url(#rvWarm)';
}
function withReveal(ctx, prog, box, begin, end, lift, fromSide, fn) {
  if (prog >= end) { fn(); return; }
  const p = cEase(prog, begin, end), mat = cEase(prog, begin + (end - begin) * .42, end), warm = 1 - mat, op = cRamp(p, 0, .42); if (op <= 0) return;
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2; ctx.save(); ctx.globalAlpha *= op; if (warm > .001) ctx.filter = warmFilter(warm);
  ctx.translate(cx, cy); ctx.translate(fromSide * (1 - p), -lift * (1 - p)); ctx.rotate(.012 * (1 - p) * (fromSide < 0 ? -1 : 1)); ctx.scale(1 - .018 * (1 - p), 1 - .11 * (1 - p)); ctx.translate(-cx, -cy);
  fn(); ctx.restore();
}

/* ---------- composer input overlay ---------- */
let input = null;
function ensureInput() {
  if (input) return input;
  input = document.createElement('textarea'); input.rows = 1; input.maxLength = 4000;
  Object.assign(input.style, { position: 'absolute', background: 'transparent', border: '0', outline: 'none', resize: 'none', color: 'transparent', caretColor: '#101B28', overflow: 'hidden', zIndex: 3, padding: '0', margin: '0' });
  input.addEventListener('input', () => { ST.draft = input.value; noteActivity(); });
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
  input.addEventListener('focus', () => { ST.focus = true; }); input.addEventListener('blur', () => { ST.focus = false; });
  document.getElementById('stageWrap').appendChild(input); return input;
}
function placeInput() {
  if (!input || !G.composer) return; const st = document.getElementById('stage'), r = st.getBoundingClientRect(), wr = document.getElementById('stageWrap').getBoundingClientRect(), s = r.width / K.W, c = G.composer;
  Object.assign(input.style, { left: (r.left - wr.left + (c.x + 17) * s) + 'px', top: (r.top - wr.top + (c.y + 1) * s) + 'px', width: ((c.w - 17 - 48) * s) + 'px', height: ((c.h - 2) * s) + 'px', font: `${P['cmp.weight']} ${P['cmp.size'] * s}px Roboto`, lineHeight: (P['cmp.size'] * P['cmp.line'] * s) + 'px', paddingTop: (12 * s) + 'px' });
}
function send() { const t = ST.draft.trim(); if (!t) return; ST.msgs.unshift({ id: 'm' + Date.now(), body: t, mine: true, at: new Date() }); const tile = ST.tiles['cloud-' + ST.draftId]; if (tile) ST.tiles['cloud-' + ST.msgs[0].id] = Object.assign({}, tile); ST.draftId = 'd' + Date.now(); ST.draft = ''; if (input) input.value = ''; noteActivity(); }

/* ---------- module ---------- */
const sc = K.screen({
  id: 'conversation', title: 'Raven conversation', docId: 'raven_conversation',
  crumb: 'Asgard › Raven page › Conversation <small>· AsgardRaven Dart</small>',
  docMeta: { widget: 'AsgardRaven', part: 'Raven conversation (Earth, clouds, composer)', source: 'FlutterFlow export 2026-11-19 + raven_scene_settings' },
  startGroup: 'Message clouds', startSection: 'Scene values',
  spec(def) {
    // Earth
    def('Earth', 'Footage', 'earth', 'earth.on', 'Earth footage', 'bool', true);
    def('Earth', 'Footage', 'earth', 'earth.clip', 'Recording', 'select', 0, { opts: CLIPS.map((c, i) => [i, c[0]]), info: 'The app plays all 14 recordings in order; pick one to look at here.' });
    def('Earth', 'Footage', 'earth', 'earth.cycle', 'Play all in order', 'bool', true);
    def('Earth', 'Footage', 'earth', 'earth.play', 'Play footage', 'bool', true, { info: 'Pause holds the current frame. The next recording starts only after the current one finishes.' });
    def('Earth', 'Footage', 'earth', 'sc.daySpeed', 'Travel speed', 'num', 8, { min: .0625, max: 32, step: .0625, dart: 'raven_scene_settings.day_speed (playback = .20 × speed ÷ 8)' });
    def('Earth', 'Footage', 'earth', 'sc.groundBrightness', 'Ground brightness', 'num', 1, { min: .3, max: 1.5, step: .01, dart: 'ground_brightness' });
    def('Earth', 'Footage', 'earth', 'earth.fade', 'Crossfade between clips', 'int', 1200, { min: 0, max: 5000, step: 50, unit: 'ms' });
    def('Earth', 'Footage', 'earth', 'earth.paper', 'Page color under Earth', 'color', '#F0DFC0');
    def('Earth', 'Place', 'earth', 'earth.x', 'Left / right', 'num', 0, { min: -.5, max: .5, step: .005, unit: 'of width' });
    def('Earth', 'Place', 'earth', 'earth.y', 'Up / down', 'num', 0, { min: -.5, max: .5, step: .005, unit: 'of height' });
    def('Earth', 'Place', 'earth', 'earth.zoom', 'Zoom', 'num', 1, { min: 1, max: 4, step: .01, unit: '×' });
    def('Earth', 'Place', 'earth', 'earth.angle', 'Map orientation', 'num', 0, { min: -180, max: 180, step: .5, unit: '°', info: 'Turns the footage, water, and terrain lines together. The travel path itself is part of each recording.' });
    def('Earth', 'Place', 'earth', 'earth.flipX', 'Mirror left / right', 'bool', false);
    def('Earth', 'Place', 'earth', 'earth.flipY', 'Mirror up / down', 'bool', false);
    def('Earth', 'Place', 'earth', 'earth.opacity', 'Footage opacity', 'num', 1, { min: 0, max: 1, step: .01 });
    CLIPS.forEach((clip, i) => def('Earth', 'Clip speeds', 'earth', 'earth.rate' + i, clip[0], 'num', 1, { min: .125, max: 4, step: .025, unit: '× travel speed' }));
    def('Earth', 'Shade bands', 'earth.shade', 'shade.on', 'Top/bottom shading', 'bool', true);
    def('Earth', 'Shade bands', 'earth.shade', 'shade.color', 'Shade color', 'color', '#071823');
    def('Earth', 'Shade bands', 'earth.shade', 'shade.top', 'Top strength', 'num', .565, { min: 0, max: 1, step: .005 });
    def('Earth', 'Shade bands', 'earth.shade', 'shade.topEnd', 'Top band reaches', 'num', .18, { min: 0, max: .6, step: .01, unit: 'of height' });
    def('Earth', 'Shade bands', 'earth.shade', 'shade.bottom', 'Bottom strength', 'num', .69, { min: 0, max: 1, step: .005 });
    def('Earth', 'Shade bands', 'earth.shade', 'shade.bottomStart', 'Bottom band starts', 'num', .76, { min: .3, max: 1, step: .01, unit: 'of height' });
    def('Earth', 'Water shimmer', 'earth', 'sc.waterShimmer', 'Water shimmer', 'num', .5, { min: 0, max: 1, step: .01, dart: 'water_shimmer' });
    def('Earth', 'Water shimmer', 'earth', 'wa.on', 'Show water shimmer', 'bool', true);
    def('Earth', 'Water shimmer', 'earth', 'wa.tint', 'Water tint strength', 'num', .38, { min: 0, max: 1, step: .01 });
    def('Earth', 'Water shimmer', 'earth', 'wa.light', 'Tint light color', 'color', '#7AA6AD');
    def('Earth', 'Water shimmer', 'earth', 'wa.deep', 'Tint deep color', 'color', '#0B2737');
    def('Earth', 'Water shimmer', 'earth', 'wa.haze', 'Sun haze', 'num', .06, { min: 0, max: .5, step: .005 });
    def('Earth', 'Water shimmer', 'earth', 'wa.spark', 'Sparkle brightness', 'num', .32, { min: 0, max: 1.5, step: .01 });
    def('Earth', 'Water shimmer', 'earth', 'wa.sparkles', 'Sparkle count', 'int', 1100, { min: 0, max: 1100, step: 10 });
    def('Earth', 'Water shimmer', 'earth', 'wa.maskBlur', 'Shoreline softness', 'num', 1.4, { min: 0, max: 6, step: .1 });
    def('Earth', 'Water shimmer', 'earth', 'wa.speed', 'Shimmer speed', 'num', 1, { min: 0, max: 4, step: .025, unit: '×' });
    // Construction entrance
    def('Construction', 'Timing', 'construct', 'con.on', 'Play when page opens', 'bool', true);
    def('Construction', 'Timing', 'construct', 'con.seconds', 'Duration', 'num', 4.8, { min: 3.2, max: 9, step: .1, unit: 's', dart: '_rvEntranceSeconds' });
    def('Construction', 'Timing', 'construct', 'con.hold', 'Freeze at a moment', 'bool', false, { info: 'Turn on, then slide Moment to look at any point of the build.' });
    def('Construction', 'Timing', 'construct', 'con.at', 'Moment', 'num', .35, { min: 0, max: 1, step: .005, info: '0 = start, 1 = finished.' });
    def('Construction', 'Blocks', 'construct', 'con.cols', 'Block columns', 'int', 4, { min: 1, max: 10, step: 1 });
    def('Construction', 'Blocks', 'construct', 'con.rows', 'Block rows', 'int', 7, { min: 1, max: 14, step: 1 });
    def('Construction', 'Blocks', 'construct', 'con.fronts', 'Bright edge on opening blocks', 'bool', true);
    def('Construction', 'Lines and layers', 'construct', 'con.scaffold', 'Outer guide frame', 'bool', true);
    def('Construction', 'Lines and layers', 'construct', 'con.terrain', 'Terrain drawing strength', 'num', 1, { min: 0, max: 2.5, step: .05 });
    def('Construction', 'Lines and layers', 'construct', 'con.lift', 'Layer lift', 'num', 24, { min: 0, max: 80, step: 1, unit: 'px' });
    def('Construction', 'Lines and layers', 'construct', 'con.liftStep', 'Extra lift per layer', 'num', 22, { min: 0, max: 60, step: 1, unit: 'px' });
    def('Construction', 'Colors', 'construct', 'con.charcoal', 'Pencil', 'color', '#413B32');
    def('Construction', 'Colors', 'construct', 'con.amber', 'Amber', 'color', '#AA7034');
    def('Construction', 'Colors', 'construct', 'con.red', 'Red', 'color', '#B64F32');
    def('Construction', 'Colors', 'construct', 'con.blue', 'Blue', 'color', '#48747A');
    def('Construction', 'Colors', 'construct', 'con.paperLight', 'Paper (light)', 'color', '#F8EBCB');
    def('Construction', 'Colors', 'construct', 'con.paper', 'Paper', 'color', '#F0E2BF');
    def('Construction', 'Colors', 'construct', 'con.paperDark', 'Paper (dark edge)', 'color', '#DBC99E');
    def('Construction', 'Header and composer', 'construct.parts', 'con.hdBegin', 'Header starts at', 'num', .46, { min: 0, max: .9, step: .01 });
    def('Construction', 'Header and composer', 'construct.parts', 'con.hdEnd', 'Header done at', 'num', .76, { min: .1, max: 1, step: .01 });
    def('Construction', 'Header and composer', 'construct.parts', 'con.hdLift', 'Header slide', 'num', -22, { min: -80, max: 80, step: 1, unit: 'px' });
    def('Construction', 'Header and composer', 'construct.parts', 'con.hdDepth', 'Header layer depth', 'num', 10, { min: 0, max: 40, step: .5, unit: 'px' });
    def('Construction', 'Header and composer', 'construct.parts', 'con.cmpBegin', 'Composer starts at', 'num', .50, { min: 0, max: .9, step: .01 });
    def('Construction', 'Header and composer', 'construct.parts', 'con.cmpEnd', 'Composer done at', 'num', .82, { min: .1, max: 1, step: .01 });
    def('Construction', 'Header and composer', 'construct.parts', 'con.cmpLift', 'Composer slide', 'num', 44, { min: -80, max: 120, step: 1, unit: 'px' });
    def('Construction', 'Header and composer', 'construct.parts', 'con.cmpDepth', 'Composer layer depth', 'num', 13, { min: 0, max: 40, step: .5, unit: 'px' });
    // Message clouds
    def('Message clouds', 'Scene values', 'clouds', 'sc.padding', 'Text padding', 'num', 18, { min: 12, max: 40, step: .5, unit: 'px', dart: 'cloud_padding' });
    def('Message clouds', 'Scene values', 'clouds', 'sc.growthMs', 'Grow time', 'int', 250, { min: 80, max: 1500, step: 10, unit: 'ms', dart: 'cloud_growth_ms', info: 'How fast a cloud grows as you type.' });
    def('Message clouds', 'Scene values', 'clouds', 'sc.shadow', 'Shadow', 'num', .3, { min: 0, max: .7, step: .01, dart: 'cloud_shadow' });
    def('Message clouds', 'Scene values', 'clouds', 'sc.spacing', 'Space between messages', 'num', 14, { min: 4, max: 64, step: 1, unit: 'px', dart: 'message_spacing' });
    def('Message clouds', 'Scene values', 'clouds', 'sc.variety', 'Billow movement', 'num', .85, { min: 0, max: 1, step: .01, dart: 'cloud_variety' });
    def('Message clouds', 'Scene values', 'clouds', 'sc.cloudSpeed', 'Footage speed', 'num', 1, { min: .125, max: 4, step: .025, unit: '×', dart: 'cloud_speed' });
    def('Message clouds', 'Scene values', 'clouds', 'cl.play', 'Animate cloud footage', 'bool', true);
    ['Your cloud', 'Their cloud', 'Anvil billows', 'Tower billows', 'Soft billows'].forEach((name, i) => {
      def('Message clouds', 'Footage layers', 'clouds', 'film.' + i + '.speed', name + ' speed', 'num', 1, { min: 0, max: 4, step: .025, unit: '×' });
      def('Message clouds', 'Footage layers', 'clouds', 'film.' + i + '.dir', name + ' direction', 'select', 1, { opts: [[1, 'Forward'], [-1, 'Reverse']], info: 'Controls this animated cloud source independently.' });
    });
    def('Message clouds', 'Size', 'clouds', 'cl.inset', 'Edge billow depth', 'num', 62, { min: 20, max: 120, step: 1, unit: 'px', dart: '_rvCloudInset 62' });
    def('Message clouds', 'Size', 'clouds', 'cl.maxW', 'Widest cloud', 'num', 440, { min: 200, max: 600, step: 5, unit: 'px' });
    def('Message clouds', 'Size', 'clouds', 'cl.side', 'Side offset', 'num', .16, { min: 0, max: 1, step: .01, info: 'Yours lean right, theirs lean left.' });
    def('Message clouds', 'Size', 'clouds', 'cl.form', 'Form-up time', 'int', 1100, { min: 100, max: 5000, step: 50, unit: 'ms' });
    def('Message clouds', 'Body', 'clouds', 'cl.coreInset', 'Solid core inset', 'num', 58, { min: 10, max: 120, step: 1, unit: 'px' });
    def('Message clouds', 'Body', 'clouds', 'cl.coreShare', 'Core inset share', 'num', .29, { min: .05, max: .45, step: .01 });
    def('Message clouds', 'Body', 'clouds', 'cl.coreRound', 'Core roundness', 'num', 18, { min: 0, max: 80, step: 1, unit: 'px' });
    def('Message clouds', 'Body', 'clouds', 'cl.whiteInflate', 'White fill reach', 'num', 18, { min: 0, max: 60, step: 1, unit: 'px' });
    def('Message clouds', 'Body', 'clouds', 'cl.whiteBlur', 'White fill softness', 'num', 11, { min: 0, max: 40, step: .5, unit: 'px' });
    def('Message clouds', 'Billows', 'clouds', 'cl.envRound', 'Billow ring roundness', 'num', 48, { min: 0, max: 120, step: 1, unit: 'px' });
    def('Message clouds', 'Billows', 'clouds', 'cl.stampGap', 'Billow spacing', 'num', 43, { min: 15, max: 120, step: 1, unit: 'px' });
    def('Message clouds', 'Billows', 'clouds', 'cl.stampW', 'Billow size', 'num', 104, { min: 30, max: 220, step: 1, unit: 'px' });
    def('Message clouds', 'Billows', 'clouds', 'cl.stampWVar', 'Billow size variety', 'num', 33, { min: 0, max: 120, step: 1, unit: 'px' });
    def('Message clouds', 'Billows', 'clouds', 'cl.expand', 'Start size while forming', 'num', .70, { min: 0, max: 1, step: .01 });
    def('Message clouds', 'Billows', 'clouds', 'cl.swellBase', 'Breathing', 'num', 3, { min: 0, max: 20, step: .5, unit: 'px' });
    def('Message clouds', 'Billows', 'clouds', 'cl.swellVar', 'Extra breathing × movement', 'num', 6, { min: 0, max: 30, step: .5, unit: 'px' });
    def('Message clouds', 'Shadow', 'clouds', 'cl.shadowX', 'Shadow right', 'num', 18, { min: -60, max: 60, step: 1, unit: 'px' });
    def('Message clouds', 'Shadow', 'clouds', 'cl.shadowY', 'Shadow down', 'num', 30, { min: -60, max: 80, step: 1, unit: 'px' });
    def('Message clouds', 'Shadow', 'clouds', 'cl.shadowBlur', 'Shadow softness', 'num', 10, { min: 0, max: 40, step: .5, unit: 'px' });
    def('Message clouds', 'Forming lines', 'clouds', 'cl.pencil', 'Pencil outline while forming', 'bool', true);
    def('Message clouds', 'Forming lines', 'clouds', 'cl.pencilColor', 'Pencil color', 'color', '#80684E');
    def('Message clouds', 'Text', 'clouds.text', 'tx.size', 'Size', 'num', 19, { min: 10, max: 40, step: .5, unit: 'px' });
    def('Message clouds', 'Text', 'clouds.text', 'tx.weight', 'Weight', 'select', 600, { opts: [[400, 'Regular'], [500, 'Medium'], [600, 'Semi-bold'], [700, 'Bold']] });
    def('Message clouds', 'Text', 'clouds.text', 'tx.color', 'Color', 'color', '#101B28');
    def('Message clouds', 'Text', 'clouds.text', 'tx.line', 'Line height', 'num', 1.35, { min: 1, max: 2.2, step: .01 });
    def('Message clouds', 'Captions', 'captions', 'cap.on', 'Show captions', 'bool', true);
    def('Message clouds', 'Captions', 'captions', 'cap.size', 'Size', 'num', 12, { min: 8, max: 20, step: .5, unit: 'px' });
    def('Message clouds', 'Captions', 'captions', 'cap.bg', 'Pill color', 'color', '#12242B');
    def('Message clouds', 'Captions', 'captions', 'cap.alpha', 'Pill strength', 'num', .65, { min: 0, max: 1, step: .01 });
    def('Message clouds', 'Captions', 'captions', 'cap.round', 'Pill roundness', 'num', 12, { min: 0, max: 20, step: .5, unit: 'px' });
    // Ambient clouds
    def('Drifting clouds', 'Scene values', 'mist', 'amb.on', 'Drifting clouds', 'bool', true);
    def('Drifting clouds', 'Scene values', 'mist', 'sc.ambientCount', 'How many', 'int', 3, { min: 0, max: 8, step: 1, dart: 'ambient_count' });
    def('Drifting clouds', 'Scene values', 'mist', 'sc.ambientSpeed', 'Drift speed', 'num', 1, { min: .2, max: 3, step: .05, unit: '×', dart: 'ambient_speed' });
    def('Drifting clouds', 'Scene values', 'mist', 'sc.ambientScale', 'Size', 'num', 1, { min: .5, max: 1.5, step: .01, unit: '×', dart: 'ambient_scale' });
    def('Drifting clouds', 'Scene values', 'mist', 'sc.ambientOpacity', 'Strength', 'num', .55, { min: .1, max: .85, step: .01, dart: 'ambient_opacity' });
    def('Drifting clouds', 'Break-offs', 'mist', 'amb.interval', 'Break-off every', 'num', 30, { min: 18, max: 90, step: 1, unit: 's', info: 'While you are chatting, a piece breaks off a cloud about this often. Press "Break off now" to see one.' });
    def('Drifting clouds', 'Break-offs', 'mist', 'amb.activeFor', 'Chat counts as active for', 'num', 45, { min: 5, max: 300, step: 5, unit: 's' });
    def('Drifting clouds', 'Break-offs', 'mist', 'amb.attach', 'Stays attached', 'num', 5.5, { min: .5, max: 20, step: .5, unit: 's' });
    def('Drifting clouds', 'Break-offs', 'mist', 'amb.attachVar', 'Extra attached time', 'num', 3, { min: 0, max: 20, step: .5, unit: 's' });
    def('Drifting clouds', 'Break-offs', 'mist', 'amb.smallChance', 'Small piece chance', 'num', .62, { min: 0, max: 1, step: .01 });
    def('Drifting clouds', 'Break-offs', 'mist', 'amb.mediumChance', 'Medium piece chance', 'num', .29, { min: 0, max: 1, step: .01, info: 'The remaining chance produces a large piece. Small takes priority if the two add to more than one.' });
    def('Drifting clouds', 'Break-offs', 'mist', 'amb.fate', 'What pieces do', 'select', 'natural', { opts: [['natural', 'Original mix by size'], ['drift', 'Keep drifting'], ['dissolve', 'Dissolve'], ['absorb', 'Merge into another cloud']] });
    def('Drifting clouds', 'Break-offs', 'mist', 'amb.smallW', 'Small piece size', 'num', 76, { min: 20, max: 200, step: 1, unit: 'px' });
    def('Drifting clouds', 'Break-offs', 'mist', 'amb.mediumW', 'Medium piece size', 'num', 116, { min: 40, max: 260, step: 1, unit: 'px' });
    def('Drifting clouds', 'Break-offs', 'mist', 'amb.largeW', 'Large piece size', 'num', 170, { min: 60, max: 320, step: 1, unit: 'px' });
    def('Drifting clouds', 'Distant clouds', 'mist', 'amb.distantW', 'Distant cloud size', 'num', 25, { min: 5, max: 120, step: 1, unit: 'px' });
    def('Drifting clouds', 'Distant clouds', 'mist', 'amb.groundVX', 'Drift with ground →', 'num', -5, { min: -40, max: 40, step: .5, unit: 'px/s' });
    def('Drifting clouds', 'Distant clouds', 'mist', 'amb.groundVY', 'Drift with ground ↓', 'num', 3, { min: -40, max: 40, step: .5, unit: 'px/s' });
    def('Drifting clouds', 'Distant clouds', 'mist', 'amb.distantEvery', 'Time between clouds', 'num', 14, { min: 1, max: 120, step: 1, unit: 's' });
    def('Drifting clouds', 'Distant clouds', 'mist', 'amb.distantEveryVar', 'Timing variation', 'num', 10, { min: 0, max: 60, step: 1, unit: 's' });
    for (const [key, label, val] of [['smallLife','Small piece life',15],['smallLifeVar','Small life variation',15],['largeLife','Medium / large piece life',44],['largeLifeVar','Medium / large life variation',28],['distantLife','Distant cloud life',27],['distantLifeVar','Distant life variation',25]]) def('Drifting clouds', 'Lifetime', 'mist', 'amb.' + key, label, 'num', val, { min: key.endsWith('Var') ? 0 : 1, max: 180, step: 1, unit: 's', info: 'Applies when the next cloud forms. Use Break off now to preview it.' });
    def('Drifting clouds', 'Wind and rotation', 'mist', 'amb.windX', 'Wind left / right', 'num', 0, { min: -40, max: 40, step: .5, unit: 'px/s' });
    def('Drifting clouds', 'Wind and rotation', 'mist', 'amb.windY', 'Wind up / down', 'num', 0, { min: -40, max: 40, step: .5, unit: 'px/s' });
    def('Drifting clouds', 'Wind and rotation', 'mist', 'amb.turbulence', 'Wind variation', 'num', 1, { min: 0, max: 5, step: .05, unit: '×' });
    def('Drifting clouds', 'Wind and rotation', 'mist', 'amb.windSpeed', 'Wind / rocking tempo', 'num', 1, { min: 0, max: 5, step: .05, unit: '×' });
    def('Drifting clouds', 'Wind and rotation', 'mist', 'amb.angle', 'Cloud rotation', 'num', 0, { min: -180, max: 180, step: .5, unit: '°' });
    def('Drifting clouds', 'Wind and rotation', 'mist', 'amb.rock', 'Rocking amount', 'num', .035 * 180 / Math.PI, { min: 0, max: 30, step: .1, unit: '°' });
    def('Drifting clouds', 'Shadow', 'mist', 'amb.shadowX', 'Shadow right', 'num', 17, { min: -60, max: 60, step: 1, unit: 'px' });
    def('Drifting clouds', 'Shadow', 'mist', 'amb.shadowY', 'Shadow down', 'num', 29, { min: -60, max: 80, step: 1, unit: 'px' });
    // Header
    def('Header', 'Row', 'header', 'hd.on', 'Show header', 'bool', true);
    def('Header', 'Row', 'header', 'hd.title', 'Title (test contact)', 'text', 'Freya');
    def('Header', 'Row', 'header', 'hd.size', 'Title size', 'num', 17, { min: 10, max: 32, step: .5, unit: 'px' });
    def('Header', 'Row', 'header', 'hd.weight', 'Title weight', 'select', 600, { opts: [[400, 'Regular'], [500, 'Medium'], [600, 'Semi-bold'], [700, 'Bold']] });
    def('Header', 'Row', 'header', 'hd.shadow', 'Title shadow blur', 'num', 8, { min: 0, max: 30, step: .5, unit: 'px' });
    def('Header', 'Row', 'header', 'hd.icon', 'Icon color', 'color', '#FFFFFF');
    def('Header', 'Row', 'header', 'hd.top', 'Top offset', 'num', 4, { min: 0, max: 80, step: 1, unit: 'px', info: 'Below the phone status bar.' });
    // Composer
    def('Composer', 'Box', 'composer', 'cmp.side', 'Side margins', 'num', 14, { min: 0, max: 60, step: 1, unit: 'px' });
    def('Composer', 'Box', 'composer', 'cmp.bottom', 'Bottom margin', 'num', 10, { min: 0, max: 80, step: 1, unit: 'px' });
    def('Composer', 'Box', 'composer', 'cmp.fill', 'Fill color', 'color', '#FFFFFF');
    def('Composer', 'Box', 'composer', 'cmp.fillAlpha', 'Fill strength', 'num', .98, { min: 0, max: 1, step: .01 });
    def('Composer', 'Box', 'composer', 'cmp.round', 'Roundness', 'num', 24, { min: 0, max: 40, step: .5, unit: 'px' });
    def('Composer', 'Box', 'composer', 'cmp.border', 'Border color', 'color', '#C9DCE2');
    def('Composer', 'Box', 'composer', 'cmp.borderAlpha', 'Border strength', 'num', .70, { min: 0, max: 1, step: .01 });
    def('Composer', 'Box', 'composer', 'cmp.borderW', 'Border width', 'num', .6, { min: 0, max: 4, step: .05, unit: 'px' });
    def('Composer', 'Text', 'composer', 'cmp.size', 'Text size', 'num', 18, { min: 10, max: 30, step: .5, unit: 'px' });
    def('Composer', 'Text', 'composer', 'cmp.weight', 'Text weight', 'select', 600, { opts: [[400, 'Regular'], [500, 'Medium'], [600, 'Semi-bold'], [700, 'Bold']] });
    def('Composer', 'Text', 'composer', 'cmp.line', 'Line height', 'num', 1.4, { min: 1, max: 2, step: .01 });
    def('Composer', 'Text', 'composer', 'cmp.color', 'Text color', 'color', '#101B28');
    def('Composer', 'Text', 'composer', 'cmp.hint', 'Hint wording', 'text', 'Write into the clouds…');
    def('Composer', 'Text', 'composer', 'cmp.hintColor', 'Hint color', 'color', '#566776');
    def('Composer', 'Send button', 'composer', 'cmp.send', 'Send arrow color', 'color', '#175E70');
    def('Composer', 'Send button', 'composer', 'cmp.sendOff', 'Send arrow (nothing typed)', 'color', '#81959C');
    def('Composer', 'Empty page', 'empty', 'em.text', 'Empty-page wording', 'text', 'Write a message.\nWatch your cloud form.');
    def('Composer', 'Empty page', 'empty', 'em.size', 'Empty-page text size', 'num', 16, { min: 8, max: 32, step: .5, unit: 'px' });
  },
  toolbar: [
    { label: 'Replay construction', title: 'Play the page building itself again', onclick: () => startBuild() },
    { label: 'Add test messages', title: 'Adds lines from the test accounts', onclick: () => { const lines = [['That looks amazing', false], ['I sent you the photo', true], ['See you tonight?', false], ["I'll be there at six", true]]; const now = Date.now(); lines.forEach(([b, mine], i) => ST.msgs.unshift({ id: 't' + now + i, body: b, mine, at: new Date(now - (lines.length - i) * 60000) })); noteActivity(); } },
    { label: 'Break off now', title: 'Spawn a break-off piece from a cloud right now', onclick: () => { noteActivity(); ST.wasActive = true; ST.mistInit = true; ST.nextOff = 0; } },
    { label: 'Clear', title: 'Remove all messages here', onclick: () => { ST.msgs = []; ST.mist = []; } },
  ],
  onShow() { P = sc.P; if (ST.hiddenAt != null && ST.swap?.t0 != null) ST.swap.t0 += performance.now() - ST.hiddenAt; ST.hiddenAt = null; if (ST.swap?.t0 != null && P['earth.on'] && P['earth.play']) videos[1-vCur].play().catch(() => {}); startFilms(); ensureInput().style.display = ''; if (!ST.seeded) { ST.seeded = true; const now = Date.now(); [['Hey, are you still coming to the market Saturday?', false], ['Yes! I will bring the honey cakes', true], ['Perfect. Bring the big basket too, the one with the handles', false], ['Already packed it', true]].forEach(([b, mine], i, a) => ST.msgs.unshift({ id: 's' + i, body: b, mine, at: new Date(now - (a.length - i) * 240000) })); } if (P['earth.on']) { if (videos[vCur].dataset.idx == null) loadClip(vCur, P['earth.clip']); else if (P['earth.play'] && !videos[vCur].ended) videos[vCur].play().catch(() => {}); } if (P['con.on']) startBuild(); else ST.prog = 1; },
  onHide() { if (input) input.style.display = 'none'; ST.hiddenAt = performance.now(); videos.forEach(v => v.pause()); },
  onSet(k, v) {
    P = sc.P;
    if (k === 'earth.clip') { ST.clipIdx = v; vCur = 0; loadClip(0, v); videos[1].pause(); ST.swap = null; }
    if (k === 'sc.daySpeed' || k.startsWith('earth.rate')) videos.forEach(x => { if (x.dataset.idx != null) x.playbackRate = rate(x.dataset.idx); });
    if (k === 'earth.play' || k === 'earth.on') { if (!P['earth.play'] || !P['earth.on']) videos.forEach(x => x.pause()); else { if (videos[vCur].dataset.idx == null) loadClip(vCur, P['earth.clip']); else if (!videos[vCur].ended) videos[vCur].play().catch(() => {}); if (ST.swap?.t0 != null) videos[1-vCur].play().catch(() => {}); } }
  },
  update(dt, now) {
    P = sc.P; FILMS.forEach((f,i) => { f.speed = P['cl.play'] ? P['sc.cloudSpeed'] * P['film.' + i + '.speed'] : 0; f.direction = P['film.' + i + '.dir']; f.tick(dt); });
    waterClock += dt * P['wa.speed']; windClock += dt * P['amb.windSpeed'];
    if (ST.active && now > ST.activeUntil) ST.active = false;
    // construction progress (waits at .28 until footage and clouds are ready, like the app)
    if (ST.prog < 1) { const ready = (!P['earth.on'] || videos[vCur].readyState >= 2) && FILMS.every(f => f.ready || f.failed); if (ready || ST.prog < .28) ST.prog = Math.min(ready ? 1 : .28, ST.prog + dt / Math.max(.5, P['con.seconds'])); }
    // Match _RvEarthJourney: keep every last frame, and wait for the next clip.
    const v = videos[vCur];
    if (P['earth.on'] && P['earth.cycle'] && v.dataset.idx != null && !ST.swap) { const ni = (+v.dataset.idx + 1) % CLIPS.length; if (+videos[1-vCur].dataset.idx !== ni) loadClip(1-vCur, ni, false); }
    const playing = P['earth.on'] && P['earth.play'];
    if (!playing && ST.swap?.t0 != null) ST.swap.t0 += dt * 1000;
    const decision = window.RavenEarthControls.journey(v, videos[1-vCur], ST.swap, now, P['earth.fade'], playing, P['earth.cycle']);
    if (decision.type === 'prepare') ST.swap = { t0: null };
    if (decision.type === 'start') { ST.swap.t0 = now; videos[1-vCur].play().catch(() => {}); }
    if (decision.type === 'commit') { v.pause(); vCur = 1-vCur; ST.swap = null; }
    const g = G.layout; if (g && prog() >= .96) stepMist(dt, K.W, K.H, g.targets);
    placeInput(); if (input) input.style.visibility = prog() >= P['con.cmpEnd'] ? 'visible' : 'hidden';
  },
  draw(ctx, now, studio) {
    P = sc.P; sc.ty = 0; const W = K.W, H = K.H, pr = prog(), cells = meshCells(W, H);
    const hdTop = P['hd.top'], hdr = P['hd.on'] ? { x: 6, y: hdTop, w: W - 12, h: 48 } : null;
    const navSpace = K.rockNav?.footprint(sc) || 0;
    const lh = P['cmp.size'] * P['cmp.line'], boxH = Math.max(48, lh + 24) + 2, cx = P['cmp.side'], cy = H - navSpace - P['cmp.bottom'] - boxH, cw = W - P['cmp.side'] * 2;
    G.composer = { x: cx, y: cy, w: cw, h: boxH };
    // paper + Earth (Earth is cut out block by block while the page builds)
    ctx.fillStyle = P['earth.paper']; ctx.globalAlpha = P['bg.mode'] === 'plain' ? 1 : 0; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    if (P['earth.on']) {
      ctx.save(); if (pr < .78) ctx.clip(revealedPath(cells, pr, W, H));
      ctx.transform(...window.RavenEarthControls.matrix(P,W,H));
      const drawV = (v, a) => { if (!v.videoWidth || a <= 0) return; a *= P['earth.opacity']; const s = Math.max(W / v.videoWidth, H / v.videoHeight), dw = v.videoWidth * s, dh = v.videoHeight * s; ctx.save(); ctx.globalAlpha = a; ctx.filter = `brightness(${P['sc.groundBrightness']})`; ctx.drawImage(v, (W - dw) / 2, (H - dh) / 2, dw, dh); ctx.restore(); ctx.save(); ctx.filter = `brightness(${P['sc.groundBrightness']})`; drawWater(ctx, v, a, now); ctx.restore(); };
      drawV(videos[vCur], 1); if (ST.swap?.t0 != null) drawV(videos[1 - vCur], clamp((now - ST.swap.t0) / Math.max(1, P['earth.fade']), 0, 1));
      ctx.restore();
    }
    if (P['shade.on']) { const op = cRamp(pr, .48, .82); if (op > 0) { const g = ctx.createLinearGradient(0, 0, 0, H), c = P['shade.color']; g.addColorStop(0, rgba(c, P['shade.top'])); g.addColorStop(P['shade.topEnd'], rgba(c, 0)); g.addColorStop(P['shade.bottomStart'], rgba(c, 0)); g.addColorStop(1, rgba(c, P['shade.bottom'])); ctx.save(); ctx.globalAlpha = op; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore(); } }
    // construction drawing over the page
    if (pr < .96) { let terr = null; const v = videos[vCur]; if (pr < .91 && v.videoWidth && v.dataset.idx != null) { const raw = terrainAt(CLIPS[+v.dataset.idx][1], v.currentTime); if (raw) { const vw = v.videoWidth, vh = v.videoHeight, s0 = Math.max(W / vw, H / vh), sw = W / s0, sh = H / s0, sx = (vw - sw) / 2, sy = (vh - sh) / 2; const transform = window.RavenEarthControls.matrix(P,W,H); terr = raw.filter(q => q.length >= 2).map(q => q.map(([x, y]) => window.RavenEarthControls.point(transform, (x * vw - sx) * W / sw, (y * vh - sy) * H / sh)));  } } G.terrain = terr ? terr.length : 0; drawConstruction(ctx, pr, W, H, cells, hdr, G.composer, terr); }
    // drifting clouds sit behind the message clouds
    if (pr >= .96) drawMist(ctx); else G.mist = [];
    // message clouds mount once the page is built, then form
    const listTop = hdTop + 48 + 4, listBottom = cy - 6 - 24, availW = W - 20 - 18;
    const placed = [], targets = [];
    if (pr >= .80) {
      const items = [], nowMs = performance.now();
      if (ST.draft.trim()) items.push({ id: 'cloud-' + ST.draftId, body: ST.draft, mine: true, cap: 'Your message · not sent', draft: true });
      for (const m of ST.msgs) items.push({ id: 'cloud-' + m.id, body: m.body, mine: m.mine, cap: (m.mine ? 'You' : P['hd.title']) + ' · ' + timeStr(m.at) });
      let y = listBottom;
      for (const it of items) {
        const s = cloudSize(it.body, availW), tile = tileFor(it.id, { w: s.w, h: s.h }), cur = curSize(tile, nowMs);
        const capH = P['cap.on'] ? P['cap.size'] * 1.3 + 8 + 2 : 0, blockH = cur.h + capH + P['sc.spacing'];
        y -= blockH; if (y + blockH < listTop - 200) break;
        const a = (it.mine ? 1 : -1) * P['cl.side'], left = 10 + (W - 20 - cur.w) * (a + 1) / 2;
        const formed = clamp((nowMs - tile.born) / Math.max(1, P['cl.form']), 0, 1);
        placed.push({ it, s, x: left, y, w: cur.w, h: cur.h, formed, capY: y + cur.h + 2, capH });
        targets.push({ id: it.id, x: left, y, w: cur.w, h: cur.h });
      }
      ctx.save(); ctx.beginPath(); ctx.rect(0, listTop, W, cy - listTop); ctx.clip();
      if (!placed.length) { ctx.fillStyle = '#fff'; ctx.font = `400 ${P['em.size']}px Roboto`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = '#000'; ctx.shadowBlur = K.shadowBlurFor(ctx, 8); const ls = P['em.text'].split('\n'); ls.forEach((l, i) => ctx.fillText(l, W / 2, (listTop + cy) / 2 + (i - (ls.length - 1) / 2) * P['em.size'] * 1.6)); ctx.shadowBlur = 0; }
      for (const p of placed) {
        if (p.y > cy || p.y + p.h < listTop - 100) continue;
        drawCloud(ctx, p.x, p.y, p.w, p.h, p.formed, p.it.mine, strSeed(p.it.id), p.s.lines, p.s.textW, p.s.textH, p.s.inset);
        if (P['cap.on']) { ctx.font = `400 ${P['cap.size']}px Roboto`; const tw = ctx.measureText(p.it.cap).width, pw = tw + 20, ph = P['cap.size'] * 1.3 + 8, px = p.x + p.w / 2 - pw / 2; ctx.fillStyle = rgba(P['cap.bg'], P['cap.alpha']); ctx.beginPath(); ctx.roundRect(px, p.capY, pw, ph, P['cap.round']); ctx.fill(); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(p.it.cap, px + pw / 2, p.capY + ph / 2); p.cap = { x: px, y: p.capY, w: pw, h: ph }; }
      }
      ctx.restore();
    }
    G.layout = { targets }; G.clouds = placed;
    // header row (slides in and seats)
    if (hdr) {
      withReveal(ctx, pr, { x: 0, y: hdTop - 4, w: W, h: 54 }, P['con.hdBegin'], P['con.hdEnd'], P['con.hdLift'], -1, () => {
        const ic = P['hd.icon'];
        const icon = (path, x, s = 24) => { ctx.save(); ctx.translate(x + 12, hdTop + 12); ctx.scale(s / 24, s / 24); ctx.fillStyle = ic; ctx.fill(path); ctx.restore(); };
        icon(BACK, 6); ctx.font = `${P['hd.weight']} ${P['hd.size']}px Roboto`; ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.shadowColor = 'rgba(0,0,0,.87)'; ctx.shadowBlur = K.shadowBlurFor(ctx, P['hd.shadow']); ctx.fillText(P['hd.title'], 6 + 48, hdTop + 24); ctx.shadowBlur = 0;
        icon(ADD, W - 6 - 96 + 2, 21); icon(REFRESH, W - 6 - 48);
      });
      G.header = hdr; G.back = { x: 6, y: hdTop, w: 48, h: 48 };
    } else G.header = null;
    // composer (rises in and seats)
    withReveal(ctx, pr, { x: 0, y: cy - 6, w: W, h: boxH + 16 }, P['con.cmpBegin'], P['con.cmpEnd'], P['con.cmpLift'], 1, () => {
      ctx.fillStyle = rgba(P['cmp.fill'], P['cmp.fillAlpha']); ctx.beginPath(); ctx.roundRect(cx, cy, cw, boxH, P['cmp.round']); ctx.fill();
      ctx.lineWidth = P['cmp.borderW']; ctx.strokeStyle = rgba(P['cmp.border'], P['cmp.borderAlpha']); ctx.stroke();
      ctx.font = `${P['cmp.weight']} ${P['cmp.size']}px Roboto`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      const shown = ST.draft ? ST.draft.split('\n').slice(-1)[0] : P['cmp.hint']; ctx.fillStyle = ST.draft ? P['cmp.color'] : P['cmp.hintColor'];
      ctx.save(); ctx.beginPath(); ctx.rect(cx + 17, cy, cw - 17 - 48, boxH); ctx.clip(); const tw = ctx.measureText(shown).width, maxw = cw - 17 - 48; ctx.fillText(shown, cx + 17 - Math.max(0, tw - maxw), cy + boxH / 2); ctx.restore();
      ctx.save(); ctx.translate(cx + cw - 3 - 36, cy + boxH / 2 - 12); ctx.fillStyle = ST.draft.trim() ? P['cmp.send'] : P['cmp.sendOff']; ctx.fill(UP); ctx.restore();
    });
    if (studio) K.hl(ctx, now);
  },
  highlight(ctx, base, sub, H1) {
    const box = (b, pad = 3, r = 6) => () => { ctx.beginPath(); ctx.roundRect(b.x - pad, b.y - pad, b.w + pad * 2, b.h + pad * 2, r); };
    const W = K.W, H = K.H;
    if (base === 'earth') H1(() => { ctx.beginPath(); ctx.rect(4, 4, W - 8, H - 8); });
    else if (base === 'earth.shade') { H1(() => { ctx.beginPath(); ctx.rect(4, 4, W - 8, H * P['shade.topEnd'] - 4); }); H1(() => { ctx.beginPath(); ctx.rect(4, H * P['shade.bottomStart'], W - 8, H * (1 - P['shade.bottomStart']) - 4); }); }
    else if (base === 'clouds' || base === 'clouds.text') G.clouds.forEach(c => H1(box(c, base === 'clouds' ? 4 : -40, 22)));
    else if (base === 'captions') G.clouds.forEach(c => c.cap && H1(box(c.cap, 2, 10)));
    else if (base === 'mist') (G.mist || []).forEach(m => H1(box(m, 2, 20)));
    else if (base === 'header' && G.header) H1(box(G.header));
    else if ((base === 'composer') && G.composer) H1(box(G.composer, 3, P['cmp.round'] + 3));
    else if (base === 'construct') H1(() => { ctx.beginPath(); ctx.rect(4, 4, W - 8, H - 8); });
    else if (base === 'construct.parts') { if (G.header) H1(box(G.header, 4, 14)); if (G.composer) H1(box(G.composer, 4, 26)); }
    else if (base === 'empty') H1(() => { ctx.beginPath(); ctx.rect(30, H * .4, W - 60, H * .15); });
  },
  bounds(base) {
    const sq = (x, y, s) => ({ x: x - s / 2, y: y - s / 2, s }), W = K.W, H = K.H;
    if ((base === 'clouds' || base === 'clouds.text' || base === 'captions') && G.clouds.length) { const c = G.clouds[0]; return sq(c.x + c.w / 2, c.y + c.h / 2, Math.max(c.w, c.h) * 1.35); }
    if (base === 'mist' && G.mist && G.mist.length) { const m = G.mist[G.mist.length - 1]; return sq(m.x + m.w / 2, m.y + m.h / 2, Math.max(m.w, m.h) * 2); }
    if (base === 'header' && G.header) return sq(W / 2, G.header.y + 24, W);
    if (base === 'composer' && G.composer) return sq(W / 2, G.composer.y + G.composer.h / 2, W);
    if (base === 'construct.parts' && G.composer) return sq(W / 2, G.composer.y + G.composer.h / 2 - 30, W);
    return sq(W / 2, H / 2, W);
  },
  pick(p) {
    const inR = b => b && p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
    if (inR(G.header)) return ['Header', 'Row'];
    if (inR(G.composer)) return ['Composer', 'Box'];
    for (const c of G.clouds) { if (c.cap && inR(c.cap)) return ['Message clouds', 'Captions']; if (inR(c)) return ['Message clouds', 'Body']; }
    for (const m of G.mist || []) if (inR(m)) return ['Drifting clouds', 'Scene values'];
    return prog() < .96 ? ['Construction', 'Timing'] : ['Earth', 'Footage'];
  },
  pointer: {
    down(p) { },
    move() { },
    up(p) { const inR = b => b && p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h; if (inR(G.back)) { K.show('directory'); return; } if (inR(G.composer) && input) { input.focus(); } },
  },
});
const BACK = new Path2D('M19 11H7.83l4.88-4.88c.39-.39.39-1.03 0-1.42-.39-.39-1.02-.39-1.41 0l-6.59 6.59c-.39.39-.39 1.02 0 1.41l6.59 6.59c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L7.83 13H19c.55 0 1-.45 1-1s-.45-1-1-1z');
const REFRESH = new Path2D('M17.65 6.35c-1.63-1.63-3.94-2.57-6.48-2.31-3.67.37-6.69 3.35-7.1 7.02C3.52 15.91 7.27 20 12 20c3.19 0 5.93-1.87 7.21-4.56.32-.67-.16-1.44-.9-1.44-.37 0-.72.2-.88.53-1.13 2.43-3.84 3.97-6.8 3.31-2.22-.49-4.01-2.3-4.48-4.52C5.31 9.44 8.26 6 12 6c1.66 0 3.14.69 4.22 1.78l-1.51 1.51c-.63.63-.19 1.71.7 1.71H19c.55 0 1-.45 1-1V6.41c0-.89-1.08-1.34-1.71-.71l-.64.65z');
const ADD = new Path2D('M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z');
const UP = new Path2D('M13 19V7.83l4.88 4.88c.39.39 1.03.39 1.42 0 .39-.39.39-1.02 0-1.41l-6.59-6.59c-.39-.39-1.02-.39-1.41 0l-6.6 6.58c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0L11 7.83V19c0 .55.45 1 1 1s1-.45 1-1z');
sc.ST = ST; sc.FILMS = FILMS; sc.videos = videos; sc.CLIPS = CLIPS; sc.dbg = () => ({ water: !!WATER, terr: !!TERR, idx: videos[vCur].dataset.idx, vCur, t: videos[vCur].currentTime, rs: videos[vCur].readyState, prog: prog(), targets: G.layout && G.layout.targets.length, mist: ST.mist.length, nextOff: ST.nextOff, active: ST.active });
})();

