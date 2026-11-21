/* =====================================================================
   ASGARD — LIVE DISCOVERY STRIP (the black holes). Screen module for
   studio-kit-1119. Port of the Asgard custom widget (FlutterFlow export
   2026-11-19): _scene(), _orbLayout(), _orbLayer(), _diskLayer(), _asTint(),
   AsgardDeepSpacePainter, _AsSkyPainter + _AsLensPainter (gravitational
   lensing of the Webb deep field), _AsSpacePainter rims, _AsLinkPainter.
   The stars use Dart's own Random algorithm and seeds, so they land where
   they do in the app. People = the live_streams test accounts.
   ===================================================================== */
(() => {
'use strict';
const K = window.StudioKit;
const { TAU, clamp, rgba, scaleOf } = K;
let P = {};
const smooth = v => { const t = clamp(v, 0, 1); return t * t * (3 - 2 * t); };

/* ---------- Dart's math.Random (VM: multiply-with-carry, Wang seed mix) ---------- */
class DartRandom {
  constructor(seed) {
    const M = (1n << 64n) - 1n, s64 = v => BigInt.asIntN(64, v);
    let s = BigInt(seed);
    s = s64((~s) + (s << 21n)); s = s64(s ^ (s >> 24n)); s = s64((s + (s << 3n)) + (s << 8n)); s = s64(s ^ (s >> 14n));
    s = s64((s + (s << 2n)) + (s << 4n)); s = s64(s ^ (s >> 28n)); s = s64(s + (s << 31n)); if (s === 0n) s = 0x5a17n;
    const u = s & M; this.lo = u & 0xFFFFFFFFn; this.hi = (u >> 32n) & 0xFFFFFFFFn;
    for (let i = 0; i < 4; i++) this.next();
  }
  next() { const st = 0xFFFFDA61n * this.lo + this.hi; this.lo = st & 0xFFFFFFFFn; this.hi = (st >> 32n) & 0xFFFFFFFFn; }
  nextInt(max) {
    if ((max & -max) === max) { this.next(); return Number(this.lo & BigInt(max - 1)); }
    let r, res; do { this.next(); r = Number(this.lo); res = r % max; } while (r - res + max > 4294967296); return res;
  }
  nextDouble() { return (this.nextInt(1 << 26) * 134217728 + this.nextInt(1 << 27)) / 9007199254740992; }
}

/* ---------- assets ---------- */
const img = src => { const i = new Image(); if (/^https?:/.test(src)) { i.crossOrigin = 'anonymous'; i.onerror = () => { if (i.crossOrigin) { i.onerror = null; i.removeAttribute('crossorigin'); i.src = src + (src.includes('?') ? '&' : '?') + 'nc=1'; } }; } i.src = src; return i; };
const KIND_IMG = ['blue', 'yellow', 'orange', 'grey', 'face', 'disk'].map(n => img('asgard/' + n + '.webp'));
const KINDS = [[264, 264, 90], [576, 236, 90], [902, 246, 90], [340, 338, 60], [404, 402, 70], [460, 250, 60]];
const SKY = img('asgard/sky.jpeg');
// live_streams rows for the test accounts (top 12 by viewers, as the app takes them)
const LIVE = [['ad58d4a8', 6, 'Baldr', 'https://i.pravatar.cc/300?img=47', 2500, 1200000], ['c629bbfb', 17, 'Saga', 'asgard/avatars/a17.jpg', 520, 210000], ['8d57245d', 5, 'Tyr', 'https://i.pravatar.cc/300?img=32', 300, 450000], ['e6ed49e6', 12, 'Vidar', 'asgard/avatars/a12.jpg', 160, 88000], ['44816937', 4, 'Sif', 'https://i.pravatar.cc/300?img=20', 120, 90000], ['6bbd8f09', 8, 'Idun', 'https://i.pravatar.cc/300?img=64', 80, 1000000], ['ca4514c3', 14, 'Skadi', 'asgard/avatars/a14.jpg', 60, 25000], ['d773845e', 3, 'Loki', 'https://i.pravatar.cc/300?img=16', 45, 18000], ['4cd96483', 11, 'Ullr', 'asgard/avatars/a11.jpg', 30, 12000], ['4c6c8946', 16, 'Eir', 'asgard/avatars/a16.jpg', 18, 5200], ['44d9f07d', 2, 'Freya', 'https://i.pravatar.cc/300?img=9', 12, 2500], ['b7db81e2', 10, 'Bragi', 'asgard/avatars/a10.jpg', 12, 3400]]
  .map(([sid, n, name, url, viewers, followers]) => ({ id: 'aaaaaaaa-0000-4000-8000-0000000000' + String(n).padStart(2, '0'), stream_id: sid, orb_key: 'stream:' + sid, name, url, viewer_count: viewers, follower_count: followers, is_live: true, pic: img(url) }));

/* ---------- state ---------- */
const ST = { motion: .18, swipe: 0, drag: null, links: [], orbs: [], scroll: 0, vel: 0 };
let G = { orbs: [], strip: null, labels: {} };
const asHash = key => { let h = 7; for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) & 0x7fffffff; return h; };
const asHeat = (v, lo, hi) => { const l = Math.log(lo), h = Math.log(hi), x = Math.log(Math.max(1, v)); return clamp((x - l) / (h - l), 0, 1); };
const massScale = f => { if (f < P['size.growStart']) return 1; const g = asHeat(f, P['size.growStart'], P['size.growMax']); return 1 + P['size.growBy'] * Math.pow(g, P['size.growCurve']); };
function people() {
  const n = clamp(Math.round(P['test.count']), 0, LIVE.length);
  return LIVE.slice(0, n).map(p => Object.assign({}, p, { viewer_count: Math.round(p.viewer_count * P['test.viewers']), is_live: P['test.live'] }));
}

/* ---------- _orbLayout ---------- */
function orbLayout(w, h) {
  const ppl = people(); const n = ppl.length; if (!n) { ST.links = []; return []; }
  const base = clamp(w * P['size.base'], P['size.min'], P['size.max']), motion = ST.motion;
  const keys = ppl.map(p => p.orb_key || p.id), views = ppl.map(p => Math.max(0, p.viewer_count | 0));
  const liveIdx = []; for (let i = 0; i < n; i++) if (ppl[i].is_live) liveIdx.push(i);
  liveIdx.sort((a, b) => (views[b] - views[a]) || (asHash(keys[a]) - asHash(keys[b])));
  let litKey = '', litScore = -1;
  for (const i of liveIdx) { if (views[i] < P['th.lit'] && ppl[i].is_exceptional !== true) continue; const score = (ppl[i].is_exceptional ? 1e9 : 0) + views[i]; if (score > litScore) { litScore = score; litKey = keys[i]; } }
  const fireSlots = Math.max(1, Math.round(liveIdx.length * P['mix.fire'])), glowSlots = Math.max(1, Math.round(liveIdx.length * P['mix.glow']));
  let fireUsed = 0, glowUsed = 0; const stage = new Array(n).fill(0), kind = new Array(n).fill(3), heat = new Array(n).fill(0), warm = new Array(n).fill(0);
  for (const i of liveIdx) {
    const v = views[i];
    if (litKey && keys[i] === litKey && P['look.lit']) { stage[i] = 4; kind[i] = 5; heat[i] = 1; }
    else if (v >= P['th.disk'] && fireUsed < fireSlots) { fireUsed++; stage[i] = v >= P['th.mid'] ? 3 : 2; kind[i] = [1, 2, 4][asHash(keys[i]) % 3]; heat[i] = asHeat(v, P['th.disk'], P['th.lit']); }
    else if (v >= P['th.glow'] && glowUsed < glowSlots) { glowUsed++; stage[i] = 1; kind[i] = 0; warm[i] = P['look.warmBase'] + P['look.warmRange'] * asHeat(v, P['th.glow'], P['th.disk']); heat[i] = asHeat(v, P['th.glow'], P['th.disk']); }
    else if (v >= P['th.glow']) { stage[i] = 0; kind[i] = 0; }
    else { stage[i] = 0; kind[i] = 3; }
  }
  const yellowTilt = [-.5, -.28, 0, .3, .55, 1.0, -1.0], sideTilt = [0, .18, -.18, .4, 1.35, -1.35, -.4], gargTilt = [-.2, .12, .42, -.45, .9, -.8], hues = [0, 0, -30, 40, 160, 215, 290];
  const dia = [], tilts = [], flips = [], hueList = [], exts = [];
  for (let i = 0; i < n; i++) {
    const diameter = base * massScale(Math.max(0, ppl[i].follower_count | 0)), hs = asHash(keys[i]); let t;
    switch (kind[i]) { case 1: t = yellowTilt[Math.floor(hs / 3) % yellowTilt.length]; break; case 2: t = sideTilt[Math.floor(hs / 3) % sideTilt.length]; break; case 5: t = gargTilt[Math.floor(hs / 3) % gargTilt.length]; break; default: t = (Math.floor(hs / 3) % 12) * .5236; }
    dia.push(diameter); tilts.push(t * P['look.tilt']); flips.push(Math.floor(hs / 7) % 2 === 0);
    const disk = stage[i] >= 2 && kind[i] !== 5; hueList.push(disk && P['look.hues'] ? hues[Math.floor(hs / 11) % hues.length] * Math.PI / 180 : 0);
    let f; if (stage[i] === 4) f = 1.55; else if (kind[i] === 0) f = .78; else if (kind[i] === 3) f = .95; else if (kind[i] === 1) f = stage[i] === 3 ? 1.35 : 1.05; else if (kind[i] === 2) f = stage[i] === 3 ? 1.55 : 1.25; else f = stage[i] === 3 ? 1.2 : .95;
    exts.push(diameter * f);
  }
  let bigD = 0; for (const d of dia) bigD = Math.max(bigD, d);
  const fitD = Math.max(24, h - 79);
  if (bigD > fitD) { const b0 = Math.min(base, fitD * .55), g = Math.log(fitD / b0) / Math.max(1e-6, Math.log(bigD / base)); for (let i = 0; i < n; i++) { const nd = b0 * Math.pow(Math.max(1, dia[i] / base), g), k = nd / dia[i]; dia[i] = nd; exts[i] *= k; } }
  let maxExt = 0, total = 0; for (const e of exts) { maxExt = Math.max(maxExt, e); total += e * 2 + P['move.gap']; }
  const span = Math.max(total, w + maxExt * 2 + 24), xs = [], ys = []; let cursor = 0;
  const sw = clamp(ST.swipe, -w * .16, w * .16);
  for (let i = 0; i < n; i++) {
    const slot = exts[i] * 2 + P['move.gap'], c0 = cursor + slot / 2; cursor += slot;
    const x = n === 1 ? w * .5 + Math.sin(motion * TAU) * w * .24 + sw : n === 2 ? w * (i === 0 ? .28 : .72) + Math.sin(motion * TAU + i * 2.8) * w * .12 + sw : (((c0 - motion * span + ST.swipe + span * 10 + maxExt) % span) + span) % span - maxExt;
    xs.push(x);
    const yr = dia[i] / 2 + 3, y0 = h * P['move.row'] + Math.sin(i * 2.24) * P['move.rowVary'] + Math.sin(motion * TAU + i) * 3, yLo = yr - 44, yHi = h + 3 - yr;
    ys.push(yLo > yHi ? (yLo + yHi) / 2 : clamp(y0, yLo, yHi));
  }
  if (n >= 3) for (let i = 0; i < n; i++) { const hs = asHash(keys[i]), f1 = 3 + hs % 4, ph = (hs % 628) / 100; xs[i] += Math.sin(motion * TAU * f1 + ph) * exts[i] * P['move.wander']; }
  const px = new Array(n).fill(0), py = new Array(n).fill(0), tw = new Array(n).fill(0), pairs = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const ddx = xs[j] - xs[i], ddy = ys[j] - ys[i], dist = Math.hypot(ddx, ddy) + 1e-6, sum = exts[i] + exts[j], reach = sum * P['pair.reach'] + 24;
    if (dist >= reach) continue; const s = smooth(1 - dist / reach); if (s <= .01) continue;
    const mi = dia[i] * dia[i], mj = dia[j] * dia[j], wi = mj / (mi + mj), wj = mi / (mi + mj), ux = ddx / dist, uy = ddy / dist;
    const pull = Math.min(P['pair.pull'], Math.max(0, dist - sum * .85) * .3) * s;
    px[i] += ux * pull * wi; py[i] += uy * pull * wi; px[j] -= ux * pull * wj; py[j] -= uy * pull * wj;
    const dir = ((asHash(keys[i]) ^ asHash(keys[j])) % 2 === 0) ? 1 : -1, a = P['pair.swing'] * s * dir;
    const cx = (xs[i] * mi + xs[j] * mj) / (mi + mj), cy = (ys[i] * mi + ys[j] * mj) / (mi + mj), ca = Math.cos(a), sa = Math.sin(a);
    const ix = xs[i] - cx, iy = ys[i] - cy; px[i] += (ix * ca - iy * sa) - ix; py[i] += ((ix * sa + iy * ca) - iy) * .6;
    const jx = xs[j] - cx, jy = ys[j] - cy; px[j] += (jx * ca - jy * sa) - jx; py[j] += ((jx * sa + jy * ca) - jy) * .6;
    const ang = Math.atan2(uy, ux); tw[i] += Math.sin(ang * 2) * .22 * s * wi + .18 * s * dir * wi; tw[j] += Math.sin(ang * 2) * .22 * s * wj - .18 * s * dir * wj;
    pairs.push([i, j, s]);
  }
  for (let i = 0; i < n; i++) { xs[i] += px[i]; ys[i] += py[i]; tilts[i] += tw[i]; }
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const ddx = xs[j] - xs[i], ddy = ys[j] - ys[i], dist = Math.hypot(ddx, ddy) + 1e-6, minSep = (exts[i] + exts[j]) * P['pair.minSep']; if (dist >= minSep) continue;
    const push = minSep - dist, ux = dist < 1e-3 ? 1 : ddx / dist, uy = dist < 1e-3 ? 0 : ddy / dist;
    if (dia[i] >= dia[j]) { xs[j] += ux * push; ys[j] += uy * push * .5; } else { xs[i] -= ux * push; ys[i] -= uy * push * .5; }
  }
  const finalY = [], shown = [];
  for (let i = 0; i < n; i++) { const minY = dia[i] / 2 + 25, maxY = Math.max(minY, h - dia[i] / 2 - 52); finalY[i] = clamp(ys[i], minY, maxY); if (xs[i] + exts[i] >= 0 && xs[i] - exts[i] <= w) shown.push(i); }
  shown.sort((a, b) => Math.abs(xs[a] - w / 2) - Math.abs(xs[b] - w / 2));
  const keep = shown.slice(0, Math.round(P['move.keep']));
  const result = keep.map(i => ({ person: ppl[i], x: xs[i], y: finalY[i], d: dia[i], stage: stage[i], kind: kind[i], heat: heat[i], warm: warm[i], tilt: tilts[i], flip: flips[i], hue: hueList[i], live: ppl[i].is_live === true, strength: kind[i] === 3 ? P['lens.grey'] : kind[i] === 0 ? P['lens.blue'] : kind[i] === 5 ? P['lens.lit'] : P['lens.disk'] }));
  ST.links = pairs.filter(([i, j]) => keep.includes(i) && keep.includes(j)).map(([i, j, s]) => [xs[i], finalY[i], dia[i] / 2, xs[j], finalY[j], dia[j] / 2, s]);
  return result;
}

/* ---------- AsgardDeepSpacePainter (cached; Dart Random seeds) ---------- */
const deepCache = new Map();
function deepSpace(w, h, k) {
  const key = [w, h, k, P['deep.band'], P['deep.stars'], P['deep.bright'], P['deep.grains'], P['deep.bandTilt']].join('|'); let c = deepCache.get(key); if (c) return c;
  c = document.createElement('canvas'); c.width = Math.ceil(w * k); c.height = Math.ceil(h * k); const x = c.getContext('2d'); x.scale(k, k);
  const g = x.createLinearGradient(0, 0, 0, h); [[0, '#02050A'], [.24, '#050A12'], [.55, '#040912'], [.80, '#03060C'], [1, '#010307']].forEach(([s, col]) => g.addColorStop(s, col)); x.fillStyle = g; x.fillRect(0, 0, w, h);
  const tones = ['#E5F0FF', '#D2E3F7', '#FFF6DD', '#FFDFB2', '#E8C6B5'], soft = '#A9B8C7', bandY = xn => .65 - .39 * xn;
  x.save(); x.translate(w * .51, h * .45); x.rotate(P['deep.bandTilt']);
  const veil = (y, hh, tone, alpha) => { alpha *= P['deep.band']; const cx = 0, cy = y * h, rx = w * 1.75 / 2, ry = hh * h / 2; x.save(); x.translate(cx, cy); x.scale(1, ry / rx); const gr = x.createRadialGradient(0, 0, 0, 0, 0, rx); gr.addColorStop(0, rgba(tone, alpha)); gr.addColorStop(.45, rgba(tone, alpha * .55)); gr.addColorStop(1, rgba(tone, 0)); x.fillStyle = gr; x.beginPath(); x.arc(0, 0, rx, 0, TAU); x.fill(); x.restore(); };
  veil(0, .44, '#8798A5', .088); veil(-.035, .27, '#C1C6C5', .036); veil(.072, .19, '#5B7180', .048); veil(.008, .060, '#795B43', .024); veil(.068, .043, '#69513E', .018); x.restore();
  const gr = new DartRandom(8201623);
  for (let i = 0; i < 1600; i++) {
    const px = gr.nextDouble() * w, lineY = bandY(px / w) * h, off = (gr.nextDouble() + gr.nextDouble() - 1) * h * .16, y = lineY + off;
    if (y < 0 || y > h * .81) continue; const fade = clamp(1 - Math.abs(off) / (h * .17), 0, 1); if (fade < .06) continue;
    const warmS = gr.nextDouble() < .085, a = (.013 + gr.nextDouble() * .044) * fade, r = .30 + gr.nextDouble() * 1.35;
    if (i >= P['deep.grains']) continue; x.fillStyle = rgba(warmS ? '#A18C78' : soft, a * P['deep.band']); x.beginPath(); x.arc(px, y, r, 0, TAU); x.fill();
  }
  const rng = new DartRandom(10801920);
  for (let i = 0; i < 4700; i++) {
    const inBand = i >= 3550, px = rng.nextDouble() * w; let y = rng.nextDouble() * h;
    if (inBand) { const a = rng.nextDouble() + rng.nextDouble() - 1; y = bandY(px / w) * h + a * h * .105; }
    if (y < 0 || y >= h) continue; if (y > .80 * h && rng.nextDouble() < .64) continue;
    const p = rng.nextDouble(), r = p < .86 ? .13 + rng.nextDouble() * .25 : .39 + rng.nextDouble() * .44, strength = (inBand ? .29 : .20) + rng.nextDouble() * .58, dim = y > h * .8 ? .48 : 1;
    const tone = tones[rng.nextInt(100) < 71 ? rng.nextInt(2) : 2 + rng.nextInt(3)];
    if (i >= P['deep.stars']) continue; x.fillStyle = rgba(tone, clamp(strength * dim * P['deep.starAlpha'], 0, 1)); x.beginPath(); x.arc(px, y, r, 0, TAU); x.fill();
  }
  const br = new DartRandom(402026);
  for (let i = 0; i < 25; i++) {
    const px = w * (.035 + br.nextDouble() * .93), y = h * (.035 + br.nextDouble() * .76);
    const color = i < 11 ? tones[br.nextInt(2)] : i < 18 ? tones[2] : i < 23 ? tones[3] : tones[4], r = .62 + br.nextDouble() * .82;
    if (i >= P['deep.bright']) continue;
    const halo = x.createRadialGradient(px, y, 0, px, y, r * 5.6); halo.addColorStop(0, rgba(color, .20)); halo.addColorStop(.28, rgba(color, .052)); halo.addColorStop(1, rgba(color, 0)); x.fillStyle = halo; x.beginPath(); x.arc(px, y, r * 5.6, 0, TAU); x.fill();
    if (i % 7 === 0) { const len = r * 4.5; x.strokeStyle = rgba(color, .17); x.lineWidth = .42; x.lineCap = 'round'; x.beginPath(); x.moveTo(px - len, y); x.lineTo(px + len, y); x.moveTo(px, y - len); x.lineTo(px, y + len); x.stroke(); }
    x.fillStyle = rgba(color, .36); x.beginPath(); x.arc(px, y, r * 1.43, 0, TAU); x.fill(); x.fillStyle = rgba(color, .95); x.beginPath(); x.arc(px, y, r * .70, 0, TAU); x.fill();
  }
  deepCache.set(key, c); if (deepCache.size > 8) deepCache.delete(deepCache.keys().next().value); return c;
}

/* ---------- sky snapshot (Webb deep field, cover-fit, dark veil) ---------- */
const PR = 2; const skyCache = new Map();
function skySnap(w, h) {
  if (!SKY.complete || !SKY.naturalWidth) return null; const key = w + '|' + h + '|' + P['sky.dark'];
  if (skyCache.has(key)) return skyCache.get(key);
  const c = document.createElement('canvas'); c.width = Math.round(w * PR); c.height = Math.round(h * PR); const x = c.getContext('2d');
  const iw = SKY.naturalWidth, ih = SKY.naturalHeight, k = Math.max(w / iw, h / ih), sw = w / k, sh = h / k;
  x.scale(PR, PR); x.imageSmoothingQuality = 'high'; x.drawImage(SKY, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, w, h); x.fillStyle = `rgba(0,0,6,${P['sky.dark']})`; x.fillRect(0, 0, w, h);
  skyCache.set(key, c); if (skyCache.size > 3) skyCache.delete(skyCache.keys().next().value); lensTexDirty = true; return c;
}

/* ---------- see-through sky: the live background, snapshotted each frame for the lens ---------- */
let thruCanvas = null;
function throughSnap(w, h) { if (!thruCanvas) thruCanvas = document.createElement('canvas'); const W = Math.round(w * PR), H = Math.round(h * PR); if (thruCanvas.width !== W || thruCanvas.height !== H) { thruCanvas.width = W; thruCanvas.height = H; } const x = thruCanvas.getContext('2d'); x.setTransform(PR, 0, 0, PR, 0, 0); x.filter = 'none'; K.drawBackground(x, P); lensTexDirty = true; return thruCanvas; }

/* ---------- _AsLensPainter as a WebGL shader (same lens equation, per pixel) ---------- */
let gl = null, glc = null, prog = null, tex = null, lensTexDirty = true, glFail = false;
function initGL() {
  glc = document.createElement('canvas'); gl = glc.getContext('webgl', { premultipliedAlpha: true, alpha: true }); if (!gl) { glFail = true; return; }
  const vs = 'attribute vec2 p;varying vec2 v;void main(){v=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}';
  const fs = `precision highp float;varying vec2 v;uniform sampler2D sky;uniform vec2 size;uniform int n;uniform vec4 L[7];uniform float reach,swirl,pw;
  void main(){vec2 q=v*size;vec4 col=vec4(0.);
  for(int i=0;i<7;i++){if(i>=n)break;vec2 c=L[i].xy;float r=L[i].z;if(r<4.)continue;vec2 d=q-c;float rho=length(d);float ro=r*reach;
   if(rho>=r&&rho<=ro){float u=(rho-r)/(ro-r);float fade=1.-u*u*(3.-2.*u);float te=r*L[i].w;float beta=rho-(te*te/rho)*fade;float ang=atan(d.y,d.x);float tw=swirl*fade*min(1.,te/rho);
    vec2 s=c+vec2(cos(ang+tw),sin(ang+tw))*beta;vec2 uv=s/size;uv=1.-abs(1.-mod(uv,2.));col=vec4(texture2D(sky,uv).rgb,1.);}}
  gl_FragColor=col;}`;
  const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  try { prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(prog); gl.useProgram(prog); } catch (e) { console.warn(e); glFail = true; return; }
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}
let lensFrame = -1, lensOut = null, lensTexSrc = null;
function lensLayer(w, h, lenses, sky) {
  if (glFail || !sky) return null; if (!gl) initGL(); if (glFail) return null;
  const fr = (K.frameId ? K.frameId() : performance.now()) + '|' + w + '|' + h + '|' + lenses.map(l => l.x.toFixed(1)).join(','); if (lensFrame === fr && lensOut && lensTexSrc === sky) return lensOut; lensFrame = fr;
  const W = Math.round(w * PR), H = Math.round(h * PR); if (glc.width !== W || glc.height !== H) { glc.width = W; glc.height = H; }
  gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  if (lensTexDirty || lensTexSrc !== sky) { gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sky); lensTexDirty = false; lensTexSrc = sky; }
  const arr = new Float32Array(28); const ls = lenses.slice(0, 7); ls.forEach((l, i) => arr.set([l.x, l.y, l.r, l.s], i * 4));
  gl.uniform4fv(gl.getUniformLocation(prog, 'L'), arr); gl.uniform1i(gl.getUniformLocation(prog, 'n'), ls.length); gl.uniform2f(gl.getUniformLocation(prog, 'size'), w, h);
  gl.uniform1f(gl.getUniformLocation(prog, 'reach'), P['lens.reach']); gl.uniform1f(gl.getUniformLocation(prog, 'swirl'), P['lens.swirl']);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); lensOut = glc; return glc;
}
// Note: in the app every frame recomputes the lens; here the stage and the zoom window share one result per frame.

/* ---------- black hole image with tint + disk thinning (_diskLayer / _asTint) ---------- */
const tintCache = new Map();
function tinted(kindIdx, o) {
  const im = KIND_IMG[kindIdx]; if (!im.complete || !im.naturalWidth) return null;
  let mat = null; const warmT = clamp(o.warm, 0, 1);
  if (o.kind === 0 && o.warm > 0 && P['look.warmOn']) { const a = 1 - warmT; mat = [a, 0, warmT, 0, 1, 0, warmT * .8, 0, a]; }
  else if (o.hue !== 0) { const c = Math.cos(o.hue), s = Math.sin(o.hue); mat = [.213 + c * .787 - s * .213, .715 - c * .715 - s * .715, .072 - c * .072 + s * .928, .213 - c * .213 + s * .143, .715 + c * .285 + s * .140, .072 - c * .072 - s * .283, .213 - c * .213 - s * .787, .715 - c * .715 + s * .715, .072 + c * .928 + s * .072]; }
  const key = kindIdx + '|' + (mat ? mat.map(v => v.toFixed(3)).join(',') : 'none'); let c = tintCache.get(key); if (c) return c;
  c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
  if (mat) { const d = x.getImageData(0, 0, c.width, c.height), p = d.data; for (let i = 0; i < p.length; i += 4) { const r = p[i], g = p[i + 1], b = p[i + 2]; p[i] = mat[0] * r + mat[1] * g + mat[2] * b; p[i + 1] = mat[3] * r + mat[4] * g + mat[5] * b; p[i + 2] = mat[6] * r + mat[7] * g + mat[8] * b; } x.putImageData(d, 0, 0); }
  tintCache.set(key, c); if (tintCache.size > 60) tintCache.delete(tintCache.keys().next().value); return c;
}
const maskCanvas = document.createElement('canvas');
function drawHole(ctx, o, oy) {
  const k = KINDS[o.kind], sc = o.d / (2 * k[2]), dw = k[0] * sc, dh = k[1] * sc;
  const pulse = 1 - P['look.pulse'] + P['look.pulse'] * Math.sin(ST.motion * Math.PI * P['look.pulseSpeed']);
  const op = o.stage >= 4 ? pulse : o.stage === 3 ? (P['op.mid'] + .16 * o.heat) * pulse : o.stage === 2 ? (P['op.thin'] + .32 * o.heat) * pulse : o.stage === 1 ? P['op.glow'] : P['op.quiet'];
  let src = tinted(o.kind, o); if (!src) return;
  if (o.stage === 2 || o.stage === 3) {
    const half = dw / 2, floor = o.d * .64 / half, solid = Math.max(o.stage === 3 ? P['mask.midSolid'] : P['mask.thinSolid'], floor), zero = Math.max(o.stage === 3 ? P['mask.midFade'] : P['mask.thinFade'], solid + .12);
    const kk = scaleOf(ctx), MW = Math.max(2, Math.ceil(dw * kk)), MH = Math.max(2, Math.ceil(dh * kk)); if (maskCanvas.width < MW || maskCanvas.height < MH) { maskCanvas.width = Math.max(maskCanvas.width, MW); maskCanvas.height = Math.max(maskCanvas.height, MH); }
    const x = maskCanvas.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, MW, MH); x.drawImage(src, 0, 0, MW, MH);
    x.globalCompositeOperation = 'destination-in'; const g = x.createRadialGradient(MW / 2, MH / 2, 0, MW / 2, MH / 2, MW / 2); g.addColorStop(0, '#fff'); g.addColorStop(clamp(solid, 0, .95), '#fff'); g.addColorStop(clamp(zero, 0, 1), 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, MW, MH); x.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.globalAlpha = clamp(op, 0, 1); ctx.translate(o.x, o.y + oy); ctx.rotate(o.tilt); ctx.scale(o.flip ? -1 : 1, 1); ctx.drawImage(maskCanvas, 0, 0, MW, MH, -dw / 2, -dh / 2, dw, dh); ctx.restore(); return;
  }
  ctx.save(); ctx.globalAlpha = clamp(op, 0, 1); ctx.translate(o.x, o.y + oy); ctx.rotate(o.tilt); ctx.scale(o.flip ? -1 : 1, 1); ctx.drawImage(src, -dw / 2, -dh / 2, dw, dh); ctx.restore();
}

/* ---------- avatar + name (orb layer) ---------- */
function drawOrb(ctx, o, oy) {
  const d = o.d, cx = o.x, cy = o.y + oy, r = (d - 4) / 2;
  if (!o.live) { ctx.save(); ctx.shadowColor = rgba(P['orb.glow'], P['orb.glowAlpha']); ctx.shadowBlur = K.shadowBlurFor(ctx, 11); ctx.fillStyle = 'rgba(0,0,0,0.01)'; ctx.beginPath(); ctx.arc(cx, cy, d / 2 + 2, 0, TAU); ctx.fill(); ctx.restore(); }
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip();
  const pic = o.person.pic;
  if (pic && pic.complete && pic.naturalWidth) { const s = Math.max(2 * r / pic.naturalWidth, 2 * r / pic.naturalHeight), w = pic.naturalWidth * s, h = pic.naturalHeight * s; ctx.drawImage(pic, cx - w / 2, cy - h / 2, w, h); }
  else { ctx.fillStyle = '#3A4350'; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r); ctx.fillStyle = '#fff'; ctx.font = `800 ${r * .9}px Roboto`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText((o.person.name || '?').slice(0, 1).toUpperCase(), cx, cy); }
  if (o.live && P['orb.vignette'] > 0) { const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.58, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${.5 * P['orb.vignette']})`); ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r); }
  ctx.restore();
  if (!o.live) { ctx.strokeStyle = P['orb.border']; ctx.lineWidth = 1.15; ctx.beginPath(); ctx.arc(cx, cy, d / 2 - .575, 0, TAU); ctx.stroke(); }
}
function drawName(ctx, o, oy) {
  if (!P['name.on']) return; const top = o.y + oy + o.d / 2 + P['name.gap'], boxW = o.d + 24;
  ctx.font = `700 ${P['name.size']}px Roboto`; const name = o.person.name || ''; let badgeW = 0;
  if (o.live && P['badge.on']) { ctx.font = `700 ${P['badge.size']}px Roboto`; badgeW = ctx.measureText(P['badge.text']).width + 6 + 4; ctx.font = `700 ${P['name.size']}px Roboto`; }
  let txt = name, tw = ctx.measureText(txt).width; const room = boxW - badgeW; while (tw > room && txt.length > 1) { txt = txt.slice(0, -1); tw = ctx.measureText(txt + '…').width; if (tw <= room) { txt += '…'; break; } }
  tw = ctx.measureText(txt).width; const total = badgeW + tw, lh = P['name.size'] * 1.17; let x = o.x - total / 2;
  if (badgeW) { const bh = P['badge.size'] * 1.17 + 2; ctx.fillStyle = P['badge.color']; ctx.beginPath(); ctx.roundRect(x, top + (lh - bh) / 2, badgeW - 4, bh, 3); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = `700 ${P['badge.size']}px Roboto`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(P['badge.text'], x + 3, top + lh / 2); x += badgeW; ctx.font = `700 ${P['name.size']}px Roboto`; }
  ctx.fillStyle = P['name.color']; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x, top + lh / 2);
  o.nameBox = { x: o.x - total / 2, y: top, w: total, h: lh };
}

/* ---------- _AsSpacePainter rims and _AsLinkPainter ---------- */
function drawRims(ctx, lenses) {
  if (!P['rim.on']) return; ctx.save(); ctx.lineWidth = .7;
  for (const l of lenses.slice(0, 5)) { ctx.strokeStyle = rgba(P['rim.color1'], P['rim.alpha1']); ctx.beginPath(); ctx.arc(l.x, l.y, l.r * 1.055, -.8, -.8 + 2.5); ctx.stroke(); ctx.strokeStyle = rgba(P['rim.color2'], P['rim.alpha2']); ctx.beginPath(); ctx.arc(l.x, l.y, l.r * 1.09, 2.1, 2.1 + 1.1); ctx.stroke(); }
  ctx.restore();
}
function drawLinks(ctx, dy) {
  if (!P['link.on']) return; const k = scaleOf(ctx);
  for (const l of ST.links) {
    const p1 = [l[0], l[1] + dy], r1 = l[2], p2 = [l[3], l[4] + dy], r2 = l[5], s = clamp(l[6], 0, 1); if (s < .03) continue;
    const dx = p2[0] - p1[0], dyy = p2[1] - p1[1], dist = Math.hypot(dx, dyy); if (dist < 1) continue;
    const ux = dx / dist, uy = dyy / dist, nx = -uy, ny = ux, big1 = r1 >= r2;
    const a = big1 ? [p2[0] - ux * r2 * .95, p2[1] - uy * r2 * .95] : [p1[0] + ux * r1 * .95, p1[1] + uy * r1 * .95];
    const b = big1 ? [p1[0] + ux * r1 * .95, p1[1] + uy * r1 * .95] : [p2[0] - ux * r2 * .95, p2[1] - uy * r2 * .95];
    const bend = P['link.bend'] * (big1 ? 1 : -1), c = [(a[0] + b[0]) / 2 + nx * dist * bend, (a[1] + b[1]) / 2 + ny * dist * bend];
    const path = () => { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(c[0], c[1], b[0], b[1]); };
    ctx.save(); ctx.lineCap = 'round'; ctx.filter = `blur(${(5 * k).toFixed(2)}px)`; ctx.lineWidth = 2 + 5 * s; ctx.strokeStyle = rgba(P['link.glow'], clamp(.24 * s * P['link.strength'], 0, 1)); path(); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = .9 + .8 * s; ctx.strokeStyle = rgba(P['link.core'], clamp(.62 * s * P['link.strength'], 0, 1)); path(); ctx.stroke(); ctx.restore();
    const beads = Math.round(P['link.beads']);
    for (let i = 0; i < beads; i++) { const q = ((i / beads + ST.motion * P['link.speed']) % 1 + 1) % 1, m1 = [a[0] + (c[0] - a[0]) * q, a[1] + (c[1] - a[1]) * q], m2 = [c[0] + (b[0] - c[0]) * q, c[1] + (b[1] - c[1]) * q], pt = [m1[0] + (m2[0] - m1[0]) * q, m1[1] + (m2[1] - m1[1]) * q];
      ctx.save(); ctx.filter = `blur(${(1.2 * k).toFixed(2)}px)`; ctx.fillStyle = `rgba(255,255,255,${clamp(.75 * s * P['link.strength'], 0, 1)})`; ctx.beginPath(); ctx.arc(pt[0], pt[1], 1.1 + 1.2 * s * (1 - Math.abs(q - .5)), 0, TAU); ctx.fill(); ctx.restore(); }
    const bendArc = (p, r, to) => { const ang = Math.atan2(to[1] - p[1], to[0] - p[0]); ctx.save(); ctx.filter = `blur(${(1.6 * k).toFixed(2)}px)`; ctx.lineWidth = 1.3; ctx.strokeStyle = rgba(P['link.arc'], clamp(.42 * s * P['link.strength'], 0, 1)); ctx.beginPath(); ctx.arc(p[0], p[1], r * 1.28, ang - .75, ang + .75); ctx.stroke(); ctx.restore(); };
    bendArc(p1, r1, p2); bendArc(p2, r2, p1);
  }
}

/* ---------- the feed under the strip (_stage / _postPage / _AsLift / _AsBottomBar) ---------- */
const POSTS = [['Idun', 'test_idun', 'https://i.pravatar.cc/300?img=64', 'Test saga 1 from Idun', 'https://picsum.photos/seed/idun1/600/800', 259, 7, '2026-10-25T19:08:30Z'], ['Thor', 'test_thor', 'https://i.pravatar.cc/300?img=5', 'Test saga 1 from Thor', 'https://picsum.photos/seed/thor1/600/800', 203, 27, '2026-10-25T18:55:44Z'], ['Idun', 'test_idun', 'https://i.pravatar.cc/300?img=64', 'Test saga 2 from Idun', 'https://picsum.photos/seed/idun2/600/800', 65, 23, '2026-10-25T17:56:37Z'], ['Thor', 'test_thor', 'https://i.pravatar.cc/300?img=5', 'Test saga 2 from Thor', 'https://picsum.photos/seed/thor2/600/800', 208, 9, '2026-10-25T17:21:35Z'], ['Idun', 'test_idun', 'https://i.pravatar.cc/300?img=64', 'Test saga 3 from Idun', 'https://picsum.photos/seed/idun3/600/800', 31, 12, '2026-10-25T16:58:46Z'], ['Thor', 'test_thor', 'https://i.pravatar.cc/300?img=5', 'Test saga 3 from Thor', 'https://picsum.photos/seed/thor3/600/800', 390, 28, '2026-10-25T16:56:38Z']]
  .map(([name, handle, av, body, im, likes, comments, at]) => ({ name, handle, avatar: img(av), body, pic: img(im), likes, comments, at: new Date(at), county: 'Flagler', state: 'FL', topic: 'general', liked: false }));
const ICONS = ['wayfinder', 'saga', 'gjallarhorn', 'raven'].map(n => img('asgard/' + n + '.webp')); const HORN = img('asgard/horn.webp');
const MI = { heartO: new Path2D('M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z'), heart: new Path2D('M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'), chat: new Path2D('M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z'), send: new Path2D('M2.01 21L23 12 2.01 3 2 10l15 2-15 2z'), more: new Path2D('M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z') };
function icon(ctx, path, x, y, size, color) { ctx.save(); ctx.translate(x, y); ctx.scale(size / 24, size / 24); ctx.fillStyle = color; ctx.fill(path); ctx.restore(); }
function ago(d) { const m = (Date.now() - d.getTime()) / 60000; if (m < 1) return 'now'; if (m < 60) return Math.floor(m) + 'm'; if (m < 1440) return Math.floor(m / 60) + 'h'; if (m < 10080) return Math.floor(m / 1440) + 'd'; return (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear(); }
function shadowText(ctx, t, x, y, blur1, blur2) { ctx.save(); ctx.shadowColor = '#000'; ctx.shadowBlur = K.shadowBlurFor(ctx, blur1); ctx.fillText(t, x, y); if (blur2) { ctx.shadowBlur = K.shadowBlurFor(ctx, blur2); ctx.fillText(t, x, y); } ctx.restore(); }
function wrapText(ctx, text, maxW, maxLines) { const words = text.split(/\s+/), lines = []; let line = ''; for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; } if (line) lines.push(line); if (lines.length > maxLines) { lines.length = maxLines; let l = lines[maxLines - 1]; while (ctx.measureText(l + '…').width > maxW && l.length) l = l.slice(0, -1); lines[maxLines - 1] = l + '…'; } return lines; }
const footprint = () => K.rockNav?.has(sc) ? K.rockNav.footprint(sc) : P['bar.height'] + P['bar.bottom'];
function bottomBlockH(ctx, p, w) { ctx.font = `400 ${P['post.capSize']}px Roboto`; const cap = (p.pic && p.body) ? wrapText(ctx, p.body, w - 24, 3).length * P['post.capSize'] * 1.3 : 0; const tags = (p.topic !== 'general' || p.store) ? 6 + 24 : 6; return 26 + cap + tags + 6 + 26 + 8; }
function drawPost(ctx, p, x, y, w, h, clipTop) {
  ctx.save(); ctx.beginPath(); ctx.rect(x, Math.max(y, clipTop), w, y + h - Math.max(y, clipTop)); ctx.clip();
  ctx.fillStyle = P['post.bg']; ctx.fillRect(x, y, w, h);
  const im = p.pic;
  if (im && im.complete && im.naturalWidth) { const s = Math.min(w / im.naturalWidth, h / im.naturalHeight), dw = im.naturalWidth * s, dh = im.naturalHeight * s; ctx.drawImage(im, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh); p.mediaBox = { x: x + (w - dw) / 2, y: y + (h - dh) / 2, w: dw, h: dh }; }
  else { const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, P['post.cardA']); g.addColorStop(1, P['post.cardB']); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#fff'; ctx.font = `700 ${P['post.cardSize']}px Roboto`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const ls = wrapText(ctx, p.body, w - 52, 12); const lh = P['post.cardSize'] * 1.3, cy = y + 80 + (h - 210) / 2; ls.forEach((l, i) => ctx.fillText(l, x + w / 2, cy + (i - (ls.length - 1) / 2) * lh)); p.mediaBox = { x, y, w, h }; }
  // header row
  const hh = 8 + 40 + 18; const tg = ctx.createLinearGradient(0, y, 0, y + hh); tg.addColorStop(0, `rgba(0,0,0,${P['post.topShade']})`); tg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = tg; ctx.fillRect(x, y, w, hh);
  const ar = P['post.avatar'], ax = x + 10 + ar, ay = y + 8 + 20; ctx.save(); ctx.beginPath(); ctx.arc(ax, ay, ar, 0, TAU); ctx.clip(); const av = p.avatar; if (av && av.complete && av.naturalWidth) { const s = Math.max(2 * ar / av.naturalWidth, 2 * ar / av.naturalHeight); ctx.drawImage(av, ax - av.naturalWidth * s / 2, ay - av.naturalHeight * s / 2, av.naturalWidth * s, av.naturalHeight * s); } else { ctx.fillStyle = '#3A4350'; ctx.fillRect(ax - ar, ay - ar, ar * 2, ar * 2); } ctx.restore();
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#fff'; ctx.font = `800 ${P['post.nameSize']}px Roboto`; shadowText(ctx, p.name, ax + ar + 10, ay - 3, 4);
  ctx.font = `400 ${P['post.subSize']}px Roboto`; ctx.fillStyle = `rgba(255,255,255,${P['post.subAlpha']})`; shadowText(ctx, '@' + p.handle + '  ·  ' + ago(p.at) + '  ·  ' + p.county + ', ' + p.state, ax + ar + 10, ay + P['post.subSize'] + 1, 4);
  icon(ctx, MI.more, x + w - 4 - 36, ay - 12, 24, '#fff');
  p.headBox = { x, y, w, h: hh }; p.authorBox = { x, y: y + 4, w: w - 60, h: 48 }; p.moreBox = { x: x + w - 56, y: y + 4, w: 52, h: 48 };
  // bottom block that rides above the floating icons (_AsLift)
  const bh = bottomBlockH(ctx, p, w), bottom = y + h, barTop = K.H - footprint(), cap = Math.max(footprint(), K.H * .5);
  const lift = P['post.lift'] ? clamp(bottom - barTop, 0, cap) : 0, rowBottom = bottom - lift - 8, show = P['post.lift'] ? clamp(1 - (rowBottom - barTop) / 24, 0, 1) : 1;
  const by = bottom - lift - bh; ctx.save(); ctx.globalAlpha *= show;
  const bg = ctx.createLinearGradient(0, by, 0, by + bh); bg.addColorStop(0, 'rgba(0,0,0,0)'); bg.addColorStop(1, `rgba(0,0,0,${P['post.bottomShade']})`); ctx.fillStyle = bg; ctx.fillRect(x, by, w, bh);
  let cy = by + 26; ctx.fillStyle = '#fff'; ctx.font = `400 ${P['post.capSize']}px Roboto`; ctx.textBaseline = 'top';
  if (p.pic && p.body) { for (const l of wrapText(ctx, p.body, w - 24, 3)) { shadowText(ctx, l, x + 12, cy, 4); cy += P['post.capSize'] * 1.3; } }
  cy += 6; cy += 6;
  const rowY = cy, mid = rowY + 13; ctx.textBaseline = 'middle'; ctx.font = `400 ${P['post.countSize']}px Roboto`;
  let ix = x + 12; icon(ctx, p.liked ? MI.heart : MI.heartO, ix, mid - P['post.likeIcon'] / 2, P['post.likeIcon'], p.liked ? P['post.liked'] : '#fff'); ix += P['post.likeIcon'] + 4; ctx.fillStyle = '#fff'; ctx.fillText(String(p.likes), ix, mid); ix += ctx.measureText(String(p.likes)).width + P['post.gap'];
  p.chatBox = { x: ix - 8, y: mid - 20, w: 41 + 8, h: 40 }; icon(ctx, MI.chat, ix, mid - 12.5, 25, '#fff'); ix += 25 + 4; ctx.fillText(String(p.comments), ix, mid); ix += ctx.measureText(String(p.comments)).width + P['post.gap'];
  p.sendBox = { x: ix - 10, y: mid - 20, w: 44, h: 40 }; icon(ctx, MI.send, ix, mid - 12, 24, '#fff');
  ctx.restore(); p.bottomBox = { x, y: by, w, h: bh }; p.likeBox = { x: x + 12, y: rowY, w: P['post.likeIcon'] + 40, h: 26 };
  ctx.restore();
}
function hornGlow(ctx, cx, cy, size, t) {
  const base = size / 2, pulse = .5 + .5 * Math.sin(t * TAU * 4), surge = .5 + .5 * Math.sin(t * TAU * 1.3), coreR = base * (.42 + .16 * pulse);
  let g = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR); g.addColorStop(0, 'rgba(255,251,232,.95)'); g.addColorStop(.45, 'rgba(255,211,106,.55)'); g.addColorStop(1, 'rgba(255,176,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, TAU); ctx.fill();
  const r = new DartRandom(7);
  for (let i = 0; i < 18; i++) { const jit = r.nextDouble(), reach = r.nextDouble(), wd = .05 + .05 * r.nextDouble(), a0 = i * TAU / 18 + jit * .25 + t * TAU * .15, flare = (pulse + reach * .7 + t * 3) % 1, len = base * (.7 + .55 * reach) * (.7 + .5 * flare * (.6 + .4 * surge));
    g = ctx.createRadialGradient(cx, cy, 0, cx, cy, len); g.addColorStop(0, 'rgba(255,244,204,.75)'); g.addColorStop(.5, 'rgba(255,196,77,.25)'); g.addColorStop(1, 'rgba(255,176,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a0 - wd) * base * .22, cy + Math.sin(a0 - wd) * base * .22); ctx.lineTo(cx + Math.cos(a0) * len, cy + Math.sin(a0) * len); ctx.lineTo(cx + Math.cos(a0 + wd) * base * .22, cy + Math.sin(a0 + wd) * base * .22); ctx.closePath(); ctx.fill(); }
}
function drawBar(ctx, now) {
  if (K.rockNav?.has(sc)) { G.bar = null; G.barBtns = []; return; }
  if (!P['bar.on']) { G.bar = null; return; }
  const W = K.W, H = K.H, bh = P['bar.height'], top = H - P['bar.bottom'] - bh, left = P['bar.side'], cw = (W - P['bar.side'] * 2) / 4, size = P['bar.icon'], k = scaleOf(ctx);
  const labels = [P['bar.l1'], P['bar.l2'], P['bar.l3'], P['bar.l4']]; G.bar = { x: left, y: top, w: W - P['bar.side'] * 2, h: bh }; G.barBtns = [];
  for (let i = 0; i < 4; i++) {
    const cx = left + cw * (i + .5), colH = size + 4 + P['bar.labelSize'] * 1.2, iy = top + (bh - colH) / 2, ix = cx - size / 2;
    const glowing = i === 2 && P['bar.hornGlow'], t = (now / 1000 / 1.6) % 1, im = glowing ? HORN : (i === 2 ? ICONS[2] : ICONS[i]);
    if (glowing) { const pad = 30; hornGlow(ctx, cx, iy + size / 2, size + pad * 2, t); }
    if (im.complete && im.naturalWidth) {
      if (!glowing) { ctx.save(); ctx.filter = `brightness(0) blur(${(P['bar.shadowBlur'] * k).toFixed(2)}px)`; ctx.globalAlpha = P['bar.shadowAlpha']; ctx.drawImage(im, ix, iy + P['bar.shadowY'], size, size); ctx.restore(); }
      const shake = glowing ? Math.sin(t * TAU * 23) * .8 : 0; ctx.drawImage(im, ix + shake, iy, size, size);
    }
    if (i === 2 && P['bar.hornDot'] && !glowing) { ctx.fillStyle = P['bar.dotColor']; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(ix + size + 2 - 5, iy - 2 + 5, 5 - .6, 0, TAU); ctx.fill(); ctx.stroke(); }
    ctx.font = `800 ${P['bar.labelSize']}px Roboto`; ctx.fillStyle = P['bar.labelColor']; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; shadowText(ctx, labels[i], cx, iy + size + 4, 4, 8);
    G.barBtns.push({ x: cx - cw / 2, y: top, w: cw, h: bh, icon: { x: ix, y: iy, w: size, h: size }, label: labels[i] });
  }
}

/* ---------- black-hole flight (_enterPortal / _flightScene / _AsFlightDustPainter / _AsWormPainter / _AsWormStreakPainter / _portalRoom) ---------- */
const easeOut = v => { const t = clamp(v, 0, 1); return 1 - Math.pow(1 - t, 3); };
const wormCenter = (u, W, H) => [W / 2 + Math.sin(u * Math.PI * 2.3) * W * .09, H / 2 + Math.cos(u * Math.PI * 1.7) * H * .05];
const wormRoll = u => Math.PI * 3 * u + .35 * Math.sin(u * Math.PI * 6);
const hermite = (p0, p1, m0, m1, t, dt) => { const t2 = t * t, t3 = t2 * t; return (2 * t3 - 3 * t2 + 1) * p0 + (t3 - 2 * t2 + t) * m0 * dt + (-2 * t3 + 3 * t2) * p1 + (t3 - t2) * m1 * dt; };
function spline(ts, vs, endSlope, q) { const n = ts.length, ms = new Array(n).fill(0); for (let k = 1; k < n - 1; k++) ms[k] = (vs[k + 1] - vs[k - 1]) / (ts[k + 1] - ts[k - 1]); ms[n - 1] = endSlope; let seg = 0; while (seg < n - 2 && q > ts[seg + 1]) seg++; const dt = ts[seg + 1] - ts[seg], t = clamp((q - ts[seg]) / dt, 0, 1); return hermite(vs[seg], vs[seg + 1], ms[seg], ms[seg + 1], t, dt); }
DartRandom.prototype.nextBool = function () { return this.nextInt(2) === 0; };
const DUST = (() => { const hz = new DartRandom(321), clouds = []; for (let i = 0; i < 5; i++) clouds.push([hz.nextDouble() * 2 - 1, hz.nextDouble() * 2 - 1, hz.nextDouble(), hz.nextInt(3)]);
  const r = new DartRandom(9091), fine = []; for (let i = 0; i < 110; i++) fine.push([r.nextDouble() * 2.3 - 1.15, r.nextDouble() * 2.3 - 1.15, r.nextDouble(), .7 + r.nextDouble() * .6, r.nextDouble() < .18, .45 + r.nextDouble() * .55]);
  const db = new DartRandom(7310), deb = []; for (let i = 0; i < 9; i++) { const sx = db.nextBool() ? 1 : -1, sy = db.nextBool() ? 1 : -1, ux = sx * (.3 + db.nextDouble() * .9), uy = sy * (.25 + db.nextDouble() * .9), z0 = db.nextDouble(), spd = .45 + db.nextDouble() * .35, base = 1.6 + db.nextDouble() * 2, spin = db.nextDouble() * TAU, jit = []; for (let j = 0; j < 7; j++) jit.push(.6 + db.nextDouble() * .55); deb.push({ ux, uy, z0, spd, base, spin, jit }); }
  return { clouds, fine, deb }; })();
const WORM = (() => { const r = new DartRandom(5521), neb = []; for (let i = 0; i < 16; i++) { const a = r.nextDouble() * TAU, spd = .6 + r.nextDouble() * .8, z0 = r.nextDouble(), tone = r.nextInt(4), st = .04 + .08 * r.nextDouble(); neb.push([a, spd, z0, tone, st]); }
  const sp = new DartRandom(777), dust = []; for (let i = 0; i < 240; i++) dust.push([sp.nextDouble() * TAU, 1.4 + sp.nextDouble() * 3, sp.nextDouble(), sp.nextDouble() < .14]);
  const st = new DartRandom(31), streaks = []; for (let i = 0; i < 60; i++) streaks.push([st.nextDouble() * TAU, 1.6 + st.nextDouble() * 2.4, st.nextDouble()]);
  return { neb, dust, streaks }; })();
// Reuse the studio's textured gas. The favourite artwork remains image sequences,
// independently placed in depth; these are not a substitute for future 3D meshes.
const FLIGHT_GAS = ['gas_amber', 'gas_teal', 'dust_lanes'].map(n => img('gas/' + n + '.webp'));
function holeAt(p, orbs, top) {
  return orbs.slice().reverse().find(o => Math.hypot(p.x - o.x, p.y - o.y - top) <= o.d / 2 + 6);
}
function prepareGroundFlight(F, S) {
  const W = K.W, H = K.H, f = W * 1.05, eye = 1.65, hz = S.floor.hz;
  const sky = document.createElement('canvas'); sky.width = Math.ceil(W * 2); sky.height = Math.ceil(H * 2);
  const x = sky.getContext('2d'); x.scale(2, 2); x.fillStyle = P['sh.bg']; x.fillRect(0, 0, W, H);
  x.save(); x.beginPath(); x.rect(0, 0, W, S.skyH); x.clip(); drawScene(x, W, S.skyH, 'share', hz); x.restore();
  const floor = document.createElement('canvas'), fw = Math.ceil(S.floor.plane.w * 2.5), fh = Math.ceil(S.floor.plane.h * 2.5);
  floor.width = fw; floor.height = fh; floor.getContext('2d').drawImage(FLOOR, 0, 0, fw, fh, 0, 0, fw, fh);
  const figures = [], boxes = S.figBoxes;
  S.figBoxes = [];
  for (const item of S.figScenes || []) {
    if (item.u <= 0) continue;
    const g = item.g, pad = 24, c = document.createElement('canvas');
    c.width = Math.ceil((g.w + pad * 2) * 2); c.height = Math.ceil((g.h * 1.14 + pad * 2 + 16) * 2);
    const cx = c.getContext('2d'); cx.scale(2, 2); cx.translate(pad - g.x, pad - g.y);
    drawFigure(cx, item.f, g, item.i, item.u, item.flick, item.mode, item.secs, item.seed);
    const feet = g.y + g.h, z = f * eye / Math.max(8, feet - hz);
    figures.push({ image: c, g: { ...g }, pad, z, worldX: (g.x + g.w / 2 - W / 2) * z / f });
  }
  S.figBoxes = boxes;
  const far = Math.max(4, ...figures.map(a => a.z));
  F.ground = { sky, floor, figures, hz, f, eye, far, plane: { ...S.floor.plane }, M: { ...S.floor.M } };
  F.ms = P['fl.duration'] * 1000 * P['fl.speed'];
  F.flyEnd = .74; F.tunnelEnd = .91;
}
function groundCam(F, q, W, H) {
  const G = F.ground, pass = smooth(q / .64), rise = smooth((q - .30) / .38), dive = smooth((q - .53) / .47);
  const side = Math.sign(F.target[0] - W / 2) || 1;
  return {
    z: G.far * 1.08 * pass * P['fl.pass'],
    x: side * Math.sin(pass * Math.PI) * .42 * P['fl.weave'],
    eye: G.eye - .22 * Math.sin(pass * Math.PI) + rise * P['fl.rise'],
    c: [W / 2 + (F.target[0] - W / 2) * dive, H / 2 + H * .10 * Math.sin(pass * Math.PI) * (1 - dive) + (F.target[1] - H / 2) * dive],
    s: Math.exp(Math.log(Math.max(8, Math.hypot(W, H) * 1.8 / F.holeD)) * Math.pow(dive, 1.3)),
    bank: -side * Math.sin(q * Math.PI) * .045 * P['fl.bank'],
    entry: smooth((q - .38) / .26)
  };
}
function groundPoint(G, cam, W, px, py) {
  const z = G.f * G.eye / Math.max(.05, py - G.hz), dz = z - cam.z;
  if (dz <= .18) return null;
  const X = (px - W / 2) * z / G.f;
  return [W / 2 + G.f * (X - cam.x) / dz, G.hz + G.f * cam.eye / dz];
}
function groundFlightWorld(ctx, F, cam, W, H, alpha = 1) {
  const G = F.ground;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(W / 2, H / 2); ctx.rotate(cam.bank);
  ctx.scale(cam.s, cam.s); ctx.translate(-cam.c[0], -cam.c[1]);
  ctx.drawImage(G.sky, 0, 0, W, H);
  if (cam.entry > 0) {
    ctx.save(); ctx.globalAlpha *= cam.entry; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(F.target[0], F.target[1], F.holeD * .495, 0, TAU); ctx.fill();
    if (F.orb.live) drawHole(ctx, F.orb, F.top); ctx.restore();
  }
  const pl = G.plane, N = 400;
  for (let i = 0; i < N; i++) {
    const y0 = pl.y + pl.h * i / N, y1 = pl.y + pl.h * (i + 1) / N;
    const a0 = fx(G.M, pl.x, y0), b0 = fx(G.M, pl.x + pl.w, y0), a1 = fx(G.M, pl.x, y1), b1 = fx(G.M, pl.x + pl.w, y1);
    const a = groundPoint(G, cam, W, ...a0), b = groundPoint(G, cam, W, ...b0), c = groundPoint(G, cam, W, ...a1), d = groundPoint(G, cam, W, ...b1);
    if (!a || !b || !c || !d || c[1] <= a[1]) continue;
    const left = (a[0] + c[0]) / 2, right = (b[0] + d[0]) / 2;
    ctx.drawImage(G.floor, 0, G.floor.height * i / N, G.floor.width, G.floor.height / N, left, a[1], right - left, c[1] - a[1] + .7);
  }
  drawHorizon(ctx, G.hz, 1, W);
  for (const item of G.figures.slice().sort((a, b) => b.z - a.z)) {
    const dz = item.z - cam.z; if (dz <= .24) continue;
    const scale = item.z / dz, x = W / 2 + G.f * (item.worldX - cam.x) / dz, feet = G.hz + G.f * cam.eye / dz;
    const w = item.image.width / 2 * scale, h = item.image.height / 2 * scale;
    const left = x - (item.g.w / 2 + item.pad) * scale, top = feet - (item.g.h + item.pad) * scale;
    if (Math.abs(left - cam.c[0]) * cam.s > W * 8 || Math.abs(top - cam.c[1]) * cam.s > H * 8) continue;
    ctx.drawImage(item.image, left, top, w, h);
  }
  ctx.restore();
}
function texturedFlightGas(ctx, focus, q, W, H, strength) {
  const phase = smooth((q - .19) / .3) * (1 - smooth((q - .91) / .09)); if (phase <= .001) return;
  for (let i = 0; i < 6; i++) {
    const im = FLIGHT_GAS[i % 3]; if (!ready(im)) continue;
    const z = .22 + ((i * .187 + 1.6 - q * .82) % 1), size = W * (1.1 + .8 / z), angle = (i - 2.5) * .53 + q * .34;
    const x = focus[0] + Math.cos(angle) * W * (.18 + i % 2 * .17), y = focus[1] + Math.sin(angle) * H * .24;
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = clamp(phase * strength * (.18 + .14 / z), 0, .65);
    ctx.translate(x, y); ctx.rotate(angle); ctx.drawImage(im, -size / 2, -size * .28, size, size * .56); ctx.restore();
  }
}
function flightCam(F, q, W, H) {
  const diag = Math.hypot(W, H), sceneH = Math.min(P['strip.max'], H * P['strip.share']), postTop = sceneH - 26, postH = Math.max(80, H - postTop), tg = F.target;
  const p1 = [W * .5, postTop + postH / 6], p2 = [W * .5 + (tg[0] - W * .5) * .6, postTop - Math.min(60, sceneH * .25)], holeD = Math.max(24, F.holeD), lsEnd = Math.log(Math.max(6, diag * 1.25 / holeD));
  const ts = [0, .30, .52, 1], xs = [W * .5, p1[0], p2[0], tg[0]], ys = [H * .5, p1[1], p2[1], tg[1]], ls = [0, Math.log(2.6), Math.log(1.9), lsEnd];
  return { c: [spline(ts, xs, (xs[3] - xs[2]) / .48 * 1.2, q), spline(ts, ys, (ys[3] - ys[2]) / .48 * 1.2, q)], s: Math.exp(spline(ts, ls, (ls[3] - ls[2]) / .48 * 2.2, q)) };
}
function flightWorld(ctx, F, cam, rot, W, H, holeOp, alpha) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(W / 2, H / 2); ctx.rotate(rot); ctx.scale(cam.s, cam.s); ctx.translate(-cam.c[0], -cam.c[1]);
  if (F.snap) ctx.drawImage(F.snap, 0, 0, W, H); else { ctx.fillStyle = '#02050A'; ctx.fillRect(0, 0, W, H); }
  if (F.orb && holeOp > .01) { ctx.globalAlpha *= holeOp; const o = F.orb, top = F.top; ctx.save(); ctx.beginPath(); ctx.arc(o.x, o.y + top, o.d / 2, 0, TAU); ctx.clip(); const pic = o.person.pic; if (pic && pic.complete && pic.naturalWidth) { const s = Math.max(o.d / pic.naturalWidth, o.d / pic.naturalHeight); ctx.drawImage(pic, o.x - pic.naturalWidth * s / 2, o.y + top - pic.naturalHeight * s / 2, pic.naturalWidth * s, pic.naturalHeight * s); } ctx.restore(); if (o.live) drawHole(ctx, o, top); }
  ctx.restore();
}
function flightScene(ctx, F, q, W, H) {
  const diag = Math.hypot(W, H), camera = F.ground ? groundCam : flightCam, cam = camera(F, q, W, H), prev = camera(F, Math.max(0, q - .02), W, H);
  const vel = [(cam.c[0] - prev.c[0]) * cam.s, (cam.c[1] - prev.c[1]) * cam.s]; let speed = clamp(Math.hypot(vel[0], vel[1]) / (diag * .12), 0, 1); speed = Math.max(speed, clamp(((cam.s / prev.s) - 1) * 3, 0, 1));
  const rot = clamp(-vel[0] / (diag * .9), -.07, .07) * (1 - smooth((q - .8) / .2)) * P['fl.bank'];
  const rel = [(F.target[0] - cam.c[0]) * cam.s, (F.target[1] - cam.c[1]) * cam.s], focus = [W / 2 + rel[0] * Math.cos(rot) - rel[1] * Math.sin(rot), H / 2 + rel[0] * Math.sin(rot) + rel[1] * Math.cos(rot)];
  const spaceIn = clamp((q - .20) / .80, 0, 1), travel = 2.4 * Math.pow(spaceIn, 1.7), black = smooth((q - .90) / .10);
  if (F.ground) groundFlightWorld(ctx, F, cam, W, H);
  else flightWorld(ctx, F, cam, rot, W, H, smooth((q - .4) / .25), 1);
  if (P['fl.blur'] && speed > .12 && q > .02) {
    if (F.ground) groundFlightWorld(ctx, F, prev, W, H, .08 * speed);
    else for (let g = 1; g <= 2; g++) flightWorld(ctx, F, flightCam(F, Math.max(0, q - .016 * g), W, H), rot, W, H, 0, clamp((g === 1 ? .2 : .1) * speed, 0, 1));
  }
  if (F.ground) texturedFlightGas(ctx, focus, q, W, H, P['fl.gas']);
  const alpha = smooth((q - (F.ground ? .24 : .42)) / .22) * (1 - black) * P['fl.dust'];
  if (alpha > .01) {
    for (const [ux, uy, z0, ci] of DUST.clouds) { const z = .15 + .85 * ((((z0 - travel * .35) % 1) + 1) % 1), k = .25 / z, px = focus[0] + ux * W * .55 * k, py = focus[1] + uy * H * .55 * k, rad = Math.min(W * 1.2, W * .30 * k), tint = ['#7A8794', '#8C7360', '#5E7392'][ci], al = clamp(alpha * .08 * smooth((1 - z) / .4), 0, 1); if (al <= .003) continue; const g = ctx.createRadialGradient(px, py, 0, px, py, rad); g.addColorStop(0, rgba(tint, al)); g.addColorStop(1, rgba(tint, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, rad, 0, TAU); ctx.fill(); }
    ctx.lineCap = 'round';
    for (const [ux, uy, z0, spd, warm, bright] of DUST.fine) { const z = .07 + .93 * ((((z0 - travel * spd) % 1) + 1) % 1), k = .2 / z, px = focus[0] + ux * W * .55 * k, py = focus[1] + uy * H * .55 * k; if (px < -40 || py < -40 || px > W + 40 || py > H + 40) continue; const a = clamp(alpha * bright * smooth((1 - z) / .45), 0, 1); if (a <= .01) continue; const tone = warm ? '#FFE2BF' : '#DDE9F7', tr = .03 + .11 * speed; ctx.lineWidth = .5 + 1.5 * (1 - z); ctx.strokeStyle = rgba(tone, a * .8); ctx.beginPath(); ctx.moveTo(px - (px - focus[0]) * tr, py - (py - focus[1]) * tr); ctx.lineTo(px, py); ctx.stroke(); ctx.fillStyle = rgba(tone, a); ctx.beginPath(); ctx.arc(px, py, .45 + 1.1 * (1 - z), 0, TAU); ctx.fill(); }
    for (const d of DUST.deb) { const z = .06 + .94 * ((((d.z0 - travel * d.spd) % 1) + 1) % 1), k = .24 / z, px = focus[0] + d.ux * W * .55 * k, py = focus[1] + d.uy * H * .55 * k, sz = d.base * (.9 / z); if (px < -sz || py < -sz || px > W + sz || py > H + sz) continue; const a = clamp(alpha * smooth((1 - z) / .5), 0, 1); if (a <= .01) continue; ctx.beginPath(); for (let j = 0; j < 7; j++) { const aa = d.spin + travel * 3 + j * TAU / 7, x = px + Math.cos(aa) * sz * d.jit[j], y = py + Math.sin(aa) * sz * d.jit[j]; j ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath(); ctx.fillStyle = `rgba(23,19,15,${a * .96})`; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = `rgba(192,144,96,${a * .5})`; ctx.stroke(); const tx = focus[0] - px, ty = focus[1] - py, dl = Math.hypot(tx, ty); if (dl > 1) { ctx.fillStyle = `rgba(255,201,138,${a * .4})`; ctx.beginPath(); ctx.arc(px + tx / dl * sz * .4, py + ty / dl * sz * .4, sz * .18, 0, TAU); ctx.fill(); } }
  }
  const vg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, .9 * Math.min(W, H)); vg.addColorStop(.55, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${clamp((.22 + .45 * speed) * P['fl.vignette'], 0, 1)})`); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = `rgba(0,0,0,${black})`; ctx.fillRect(0, 0, W, H);
}
const WTONES = ['#4A78A8', '#6A5AA0', '#B98443', '#3F8F9A'];
function wormhole(ctx, F, u, v, W, H, alpha) {
  const diag = Math.hypot(W, H), [cx, cy] = wormCenter(u, W, H), roll = wormRoll(u);
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.fillStyle = '#010307'; ctx.fillRect(0, 0, W, H);
  const gr = diag * (.10 + .34 * smooth(u)); let g = ctx.createRadialGradient(cx, cy, 0, cx, cy, gr); g.addColorStop(0, rgba(P['wh.light'], .20 + .30 * smooth(u))); g.addColorStop(.35, 'rgba(63,106,150,.12)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, gr, 0, TAU); ctx.fill();
  if (P['wh.nebula']) for (const [a0, spd, z0, ti, st] of WORM.neb) { const a = a0 + roll * .8, z = (z0 + u * spd * 1.4) % 1, rr = diag * .75 * Math.pow(z, 2.2), px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr, rad = diag * (.05 + .45 * Math.pow(z, 1.6)), al = clamp(st * Math.sin(Math.PI * z) * P['wh.nebulaAlpha'], 0, 1); g = ctx.createRadialGradient(px, py, 0, px, py, rad); g.addColorStop(0, rgba(WTONES[ti], al)); g.addColorStop(1, rgba(WTONES[ti], 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, rad, 0, TAU); ctx.fill(); }
  ctx.lineCap = 'round';
  const nd = Math.round(P['wh.dust']); for (let i = 0; i < nd; i++) { const [a0, spd, z0, warm] = WORM.dust[i], a = a0 + roll, z = (z0 + u * spd) % 1, r = diag * .72 * Math.pow(z, 2.5) + 3, len = 4 + r * .22, dx = Math.cos(a), dy = Math.sin(a), rIn = Math.max(0, r - len); ctx.lineWidth = .4 + z * 1.2; ctx.strokeStyle = rgba(warm ? '#E0BCA0' : '#B4CEE8', clamp(.05 + .5 * z, 0, 1)); ctx.beginPath(); ctx.moveTo(cx + dx * rIn, cy + dy * rIn); ctx.lineTo(cx + dx * r, cy + dy * r); ctx.stroke(); }
  if (v > 0) { const open = diag * 1.45 * easeOut(v); g = ctx.createRadialGradient(cx, cy, 0, cx, cy, open); g.addColorStop(0, '#05080F'); g.addColorStop(.82, '#05080F'); g.addColorStop(1, 'rgba(5,8,15,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, open, 0, TAU); ctx.fill(); }
  g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, .95 * Math.min(W, H)); g.addColorStop(.45, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.8)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // their pictures on the tunnel walls
  if (P['wh.tiles'] && F.walls.length) {
    const n = F.walls.length, wlen = .55, tiles = [];
    for (let i = 0; i < n; i++) { const start = n <= 1 ? .2 : i / (n - 1) * (1 - wlen), z = (u - start) / wlen; if (z <= .01 || z >= .995) continue; const a = i * 2.39996 + roll, r = 4 + Math.pow(z, 2.3) * diag * .8, sz = (12 + Math.pow(z, 1.9) * diag * .36) * P['wh.tileSize'], x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; if (x < -sz || y < -sz || x > W + sz || y > H + sz) continue; let o = 1; if (z < .1) o = z / .1; if (z > .88) o = (1 - z) / .12; if (o <= .02) continue; tiles.push({ z, a, sz, x, y, o, im: F.walls[i] }); }
    tiles.sort((p, q) => p.z - q.z);
    for (const t of tiles) { const stretch = 1 + 1.5 * Math.pow(t.z, 3); ctx.save(); ctx.globalAlpha *= clamp(t.o * .95, 0, 1); ctx.translate(t.x, t.y - t.sz * .375 + t.sz * .375); ctx.rotate(t.a + Math.PI / 2); ctx.scale(1, stretch); const w = t.sz, h = t.sz * .75; ctx.shadowColor = 'rgba(109,145,178,.3)'; ctx.shadowBlur = K.shadowBlurFor(ctx, 10); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 3); ctx.fill(); ctx.shadowBlur = 0; ctx.save(); ctx.clip(); const im = t.im; if (im && im.complete && im.naturalWidth) { const s = Math.max(w / im.naturalWidth, h / im.naturalHeight); ctx.drawImage(im, -im.naturalWidth * s / 2, -im.naturalHeight * s / 2, im.naturalWidth * s, im.naturalHeight * s); } ctx.restore(); ctx.lineWidth = .6; ctx.strokeStyle = 'rgba(180,206,232,.22)'; ctx.stroke(); ctx.restore(); }
  }
  if (P['wh.streaks']) { ctx.lineCap = 'round'; for (const [a0, spd, z0] of WORM.streaks) { const a = a0 + roll, z = (z0 + u * spd * 1.6) % 1, r = diag * .9 * Math.pow(z, 3.2), len = r * .35 + 6, dx = Math.cos(a), dy = Math.sin(a); ctx.lineWidth = .5 + z * 1.6; ctx.strokeStyle = `rgba(207,224,245,${clamp(.5 * z, 0, 1)})`; ctx.beginPath(); ctx.moveTo(cx + dx * Math.max(0, r - len), cy + dy * Math.max(0, r - len)); ctx.lineTo(cx + dx * r, cy + dy * r); ctx.stroke(); } }
  ctx.restore();
}
function portalRoom(ctx, F, W, H, alpha, scale) {
  const person = F.orb.person, live = person.is_live === true;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(W / 2, H / 2); ctx.scale(scale, scale); ctx.translate(-W / 2, -H / 2);
  ctx.fillStyle = '#03060B'; ctx.fillRect(0, 0, W, H);
  const pic = person.pic; if (pic && pic.complete && pic.naturalWidth) { ctx.save(); ctx.globalAlpha *= P['room.bgAlpha']; const s = Math.max(W / pic.naturalWidth, H / pic.naturalHeight); ctx.drawImage(pic, (W - pic.naturalWidth * s) / 2, (H - pic.naturalHeight * s) / 2, pic.naturalWidth * s, pic.naturalHeight * s); ctx.restore(); }
  let g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 1.2 * Math.min(W, H)); g.addColorStop(0, 'rgba(26,43,66,.17)'); g.addColorStop(1, 'rgba(3,6,11,.94)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  icon(ctx, new Path2D('M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z'), 12 + 12, 8 + 12, 24, '#DAE5F0');
  ctx.font = '400 11px Roboto'; ctx.fillStyle = '#ACC0D2'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; spaced(ctx, 'ASGARD', 12 + 48 + 4, 8 + 24, 3);
  const fs = P['room.face'], blockH = fs + 22 + 13 + 8 + 35 + 13 + (live ? 0 : 0) + 28 + 48, top = 8 + 48 + 5 + Math.max(0, (H - 8 - 48 - 5 - 28 - 48 - 28 - blockH) / 2), fx = W / 2, fy = top + fs / 2;
  ctx.save(); ctx.shadowColor = 'rgba(39,71,104,.27)'; ctx.shadowBlur = K.shadowBlurFor(ctx, 46); ctx.fillStyle = '#03060B'; ctx.beginPath(); ctx.arc(fx, fy, fs / 2, 0, TAU); ctx.fill(); ctx.restore();
  ctx.strokeStyle = 'rgba(139,159,183,.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(fx, fy, fs / 2 - .5, 0, TAU); ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.arc(fx, fy, fs / 2 - 3, 0, TAU); ctx.clip(); if (pic && pic.complete && pic.naturalWidth) { const s = Math.max((fs - 6) / pic.naturalWidth, (fs - 6) / pic.naturalHeight); ctx.drawImage(pic, fx - pic.naturalWidth * s / 2, fy - pic.naturalHeight * s / 2, pic.naturalWidth * s, pic.naturalHeight * s); } ctx.restore();
  let y = top + fs + 22; ctx.textAlign = 'left'; ctx.font = '400 10px Roboto'; ctx.fillStyle = '#8EA7BB'; const lab = live ? P['room.liveLabel'] : 'ASGARD PROFILE'; ctx.save(); ctx.textBaseline = 'top'; const lw = (() => { let w = 0; for (const c of lab) w += ctx.measureText(c).width + 2.2; return w - 2.2; })(); spaced(ctx, lab, W / 2 - lw / 2, y, 2.2); ctx.restore();
  y += 13 + 8; ctx.font = `400 ${P['room.nameSize']}px Georgia, serif`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(person.name, W / 2, y); y += P['room.nameSize'] * 1.2 + 13 + 28;
  ctx.font = '500 14px Roboto'; const bt = P['room.button'], bw = ctx.measureText(bt).width + 56, bh = 48; ctx.strokeStyle = '#5F7890'; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(W / 2 - bw / 2, y, bw, bh, 4); ctx.stroke(); ctx.fillStyle = '#E2E8EE'; ctx.textBaseline = 'middle'; ctx.fillText(bt, W / 2, y + bh / 2); F.btn = { x: W / 2 - bw / 2, y, w: bw, h: bh };
  ctx.font = '500 14px Roboto'; ctx.fillStyle = '#9DB2C5'; ctx.fillText(P['room.return'], W / 2, H - 28 - 24); F.ret = { x: W / 2 - 140, y: H - 28 - 48, w: 280, h: 48 };
  ctx.restore();
}
function drawFlight(ctx, now) {
  const F = ST.flight, W = K.W, H = K.H, t = F.t, a = F.flyEnd, b = F.tunnelEnd;
  const u = t <= a ? 0 : clamp((t - a) / (b - a), 0, 1), v = t <= b ? 0 : clamp((t - b) / (1 - b), 0, 1);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (t < a + .02) flightScene(ctx, F, clamp(t / a, 0, 1), W, H);
  if (t >= a) wormhole(ctx, F, u, v, W, H, smooth(u / .14));
  if (v > 0) portalRoom(ctx, F, W, H, smooth((v - .1) / .7), 1.5 - .5 * easeOut(v));
  if (F.dir !== 0) { ctx.font = '400 12px Roboto'; ctx.fillStyle = '#C7D5E2'; ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillText('Skip effect', W - 12 - 8, K.isMobile ? 64 : 24); }
}
function startFlight(o, top = G.top ?? P['strip.orbTop']) {
  const W = K.W, H = K.H;
  // freeze exactly what is on screen (the flight starts from it)
  const snap = document.createElement('canvas'); snap.width = Math.round(W * 2.5); snap.height = Math.round(H * 2.5); const sx = snap.getContext('2d'); sx.scale(2.5, 2.5);
  ST.flight = null; sc.draw(sx, performance.now(), false);
  const posts = Math.round(P['fl.posts']), ms = clamp(Math.round(1500 + 1500 * Math.min(1, posts / 1000)), 1500, 3000) * P['fl.speed'];
  const slots = Math.round(ms / 1000 * 14), walls = POSTS.map(p => p.pic0 || p.pic).filter(Boolean).slice(0, slots); walls.push(o.person.pic);
  const flyMs = Math.min(1000, Math.max(650, ms * .42)), tailMs = Math.min(600, Math.max(320, ms * .22));
  ST.flight = { orb: Object.assign({}, o), top, target: [o.x, o.y + top], holeD: o.d, snap, walls, ms, flyEnd: flyMs / ms, tunnelEnd: 1 - tailMs / ms, t: 0, dir: 1 };
  if (SH) prepareGroundFlight(ST.flight, SH);
  K.status('Flying into ' + o.person.name + '’s black hole. Tap "Return through the black hole" to come back.');
}

/* ---------- share: the post lays down as a floor under the night sky and the favs beam down onto it
   (_openShare / _shareLayer / _floorMatrix / _figSlots / _figGeom / _figU / _figModes / _figArt / _figureWidget /
   _shareSheet / _shareDeck / _bust / _tvWrap, _AsFloorPainter / _AsHorizonPainter / _AsSnapPainter /
   _AsFigurePainter / _AsBeamPainter / _AsBustPainter / _AsTvLinePainter) ---------- */
['6515e1f4-8d26-44c4-80d9-3a8ce2d1472c', '8a626efb-7ea8-42be-aaa7-343db8cf1b4f', '2c8538fd-10ba-4ce2-a8f7-a4236c52d350', '21ceb19f-9065-45b1-8a7c-76ddf1e26da0', 'eb0b6a18-37a2-4ec0-8b68-69fbfc64cb39', '5820cd29-8784-4f18-8f76-e3d5e6851f85'].forEach((id, i) => { POSTS[i].id = id; });
// Danny's favs (asgard_my_favs, oldest first) and their real figures from the figures bucket. Only Freya allows 360.
const FAVS = [['02', 'test_freya', 'Freya', 9, 'freya', true, null], ['03', 'test_loki', 'Loki', 16, 'loki', false, 6], ['04', 'test_sif', 'Sif', 20, 'sif', false, 18], ['05', 'test_tyr', 'Tyr', 32, 'tyr', true, null], ['18', 'test_woman360', 'Test Woman', 'faces/TestWoman.jpg', 'testwoman', false, null], ['07', 'test_hel', 'Hel', 49, 'hel', false, 9]]
  .map(([n, handle, name, av, key, hasSpin, avFrame]) => ({ id: 'aaaaaaaa-0000-4000-8000-0000000000' + n, handle, name, avUrl: String(av).includes('/') ? av : 'https://i.pravatar.cc/300?img=' + av, key, hasSpin, allow360: key === 'freya', avFrame, spin: null, prof: null, avatar: null }));
// asgard_share_targets for Danny (people he follows or who follow him), sorted by name
const TARGETS = [['06', 'test_baldr', 'Baldr', 47, true], ['02', 'test_freya', 'Freya', 9, true], ['07', 'test_hel', 'Hel', 49, true], ['08', 'test_idun', 'Idun', 64, false], ['03', 'test_loki', 'Loki', 16, true], ['04', 'test_sif', 'Sif', 20, true], ['01', 'test_thor', 'Thor', 5, false], ['05', 'test_tyr', 'Tyr', 32, true]]
  .map(([n, handle, name, av, fav]) => ({ id: 'aaaaaaaa-0000-4000-8000-0000000000' + n, handle, name, avUrl: 'https://i.pravatar.cc/300?img=' + av, fav, avatar: null }));
const CY = '#5FD8FF', YEL = '#FFC72C';
const SI = { check: new Path2D('M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'), star: new Path2D('M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z'), add: new Path2D('M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4V7zm-1-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z'), back: new Path2D('M17.77 3.77 16 2 6 12l10 10 1.77-1.77L9.54 12z') };
const dartShuffle = (a, r) => { let n = a.length; while (n > 1) { const pos = r.nextInt(n); n -= 1; const t = a[n]; a[n] = a[pos]; a[pos] = t; } return a; };
const easeIn = x => { // Curves.easeIn = Cubic(.42, 0, 1, 1)
  let lo = 0, hi = 1; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2, bx = 3 * .42 * m * (1 - m) * (1 - m) + 3 * m * m * (1 - m) + m * m * m; if (bx < x) lo = m; else hi = m; } const t = (lo + hi) / 2; return 3 * t * t * (1 - t) + t * t * t; };
const easeOutCubic = v => 1 - Math.pow(1 - clamp(v, 0, 1), 3);
let SH = null;
function loadFigs() { for (const f of FAVS) { if (!f.prof) f.prof = img('asgard/figs/' + f.key + '_profile.webp'); if (f.hasSpin && !f.spin) f.spin = img('asgard/figs/' + f.key + '_spin.webp'); if (!f.avatar) f.avatar = img(f.avUrl); } for (const t of TARGETS) if (!t.avatar) t.avatar = (FAVS.find(f => f.id === t.id) || {}).avatar || img(t.avUrl); }
const ready = im => im && im.complete && im.naturalWidth > 0;
function figArtOf(f) { const spin = f.hasSpin && (f.allow360 || P['sh.all360']); const im = spin ? f.spin : f.prof; if (!ready(im)) return null; return { im, kind: spin ? 'spin' : 'profile', frames: spin ? 48 : 25 }; }
function shareFigs() { return FAVS.slice(0, clamp(Math.round(P['sh.count']), 0, 6)); }
function openShare(post) {
  if (SH || ST.flight || !post) return; loadFigs();
  const W = K.W, H = K.H, snap = document.createElement('canvas'); snap.width = Math.round(W * 2); snap.height = Math.round(H * 2); const sx = snap.getContext('2d'); sx.scale(2, 2); sc.draw(sx, performance.now(), false);
  SH = { post, snap, t: 0, dir: 1, cT: 0, from: 0, closing: false, pick: [], deck: 0, deckDir: 0, sending: false, mode: '', tv: 0, tvDir: 0, sheet: P['sh.sheet'], scroll: 0, figBoxes: [], rows: [] };
}
function closeShare() { const S = SH; if (!S || S.closing) return; S.closing = true; S.deck = 0; S.deckDir = 0; S.dir = -1; S.cT = 0; S.from = S.t; }
function togglePick(id) { const S = SH; if (!S || S.sending || !id) return; const i = S.pick.indexOf(id); if (i >= 0) S.pick.splice(i, 1); else S.pick.push(id); }
function deckSend(group) {
  const S = SH; if (!S || S.sending || !S.pick.length) return; const n = S.pick.length; S.sending = true; S.mode = group ? 'hall' : 'each';
  setTimeout(() => { if (SH !== S) return; K.status(group && n >= 2 ? 'Sent to Mead Hall with ' + n + '.' : (n === 1 ? 'Raven sent.' : 'Ravens sent to ' + n + '.')); S.tvDir = 1; }, 450);
}
function shareUpdate(dt) {
  const S = SH; if (!S) return; const slow = P['sh.slow'];
  if (P['sh.hold'] && !S.closing && !S.tvDir) { S.t = clamp(P['sh.at'], 0, 1); S.dir = 0; }
  else if (S.dir > 0) { S.t = Math.min(1, S.t + dt * 1000 / (P['sh.ms'] * slow)); if (S.t >= 1) S.dir = 0; }
  else if (S.dir < 0) { S.cT += dt * 1000 / (P['sh.closeMs'] * slow); S.t = S.from * (1 - easeIn(clamp(S.cT, 0, 1))); if (S.cT >= 1) { SH = null; return; } }
  if (S.deckDir) { S.deck = clamp(S.deck + S.deckDir * dt * 1000 / (P['sh.deckMs'] * slow), 0, 1); if (S.deck >= 1 || S.deck <= 0) S.deckDir = 0; }
  if (S.tvDir) { S.tv += dt * 1000 / (P['sh.tvMs'] * slow); if (S.tv >= 1) SH = null; }
}
// _floorMatrix: tips the post back about its near edge, stretched so its far edge lands on the horizon
function floorM(q, plane, horizonY) {
  const thMax = P['sh.tilt'] * Math.PI / 180, pMax = P['sh.persp'], a0 = Math.max(40, plane.h), bottom = plane.y + plane.h, rise = Math.max(60, bottom - horizonY);
  const c = Math.cos(thMax), s = Math.sin(thMax), den = Math.max(.04, c - rise * pMax * s), syMax = clamp(rise / den / a0, .05, 12), th = thMax * q;
  return { pvx: plane.x + plane.w / 2, pvy: bottom, cos: Math.cos(th), sin: Math.sin(th), sx: 1 + P['sh.widen'] * q, sy: 1 + (syMax - 1) * q, p: pMax * q };
}
const fx = (M, x, y) => { const Y = M.sy * (y - M.pvy), w = M.p * -M.sin * Y + 1; return [M.pvx + M.sx * (x - M.pvx) / w, M.pvy + M.cos * Y / w]; };
function figSlots(n, seed, w, horizonY, nearY) {
  const rng = new DartRandom(asHash(seed || 'share')), farY = horizonY + (nearY - horizonY) * P['sh.far'];
  const depths = dartShuffle(Array.from({ length: n }, (_, k) => n === 1 ? .4 : k / (n - 1)), rng), step = w / Math.max(n, 3), out = [];
  for (let i = 0; i < n; i++) { const x = w / 2 + (i - (n - 1) / 2) * step + (rng.nextDouble() - .5) * step * P['sh.jitter']; const d = clamp(depths[i] + (rng.nextDouble() - .5) * .08, 0, 1); out.push([x, nearY - (nearY - farY) * d]); }
  return out;
}
function figGeom(feet, horizonY, nearY, w) {
  // Equal-height people on a ground plane share an eye-level horizon.
  // Their projected height changes with distance from that horizon.
  const rel = clamp((feet[1] - horizonY) / Math.max(1, nearY - horizonY), P['sh.minScale'], 1);
  const fw = w * P['sh.size'] * rel, fh = fw * P['sh.tall'];
  return { x: feet[0] - fw / 2, y: feet[1] - fh, w: fw, h: fh };
}
function figU(i, n, el, seed) {
  const order = dartShuffle(Array.from({ length: n }, (_, k) => k), new DartRandom(asHash('beam' + seed))), k = order.indexOf(i), r = new DartRandom(asHash('bt' + seed + i));
  const st = P['sh.beamStart'] + k * P['sh.beamGap'] + r.nextDouble() * .08, dur = P['sh.beamDur'] + r.nextDouble() * .38; return clamp((el - st) / dur, 0, 1);
}
function figModes(figs, seed) {
  const n = figs.length, rng = new DartRandom(asHash('modes' + seed)), modes = new Array(n).fill(1), order = dartShuffle(Array.from({ length: n }, (_, i) => i), rng);
  const pref = i => /freya|tyr/.test(figs[i].handle.toLowerCase()); order.sort((a, b) => (pref(b) ? 1 : 0) - (pref(a) ? 1 : 0));
  let spins = n >= 3 ? Math.round(P['sh.spins']) : 0; for (const i of order) { if (spins <= 0) break; const art = figArtOf(figs[i]); if (art && art.kind === 'spin') { modes[i] = 2; spins--; } }
  if (n >= 4 && P['sh.still']) { const rest = order.filter(i => modes[i] === 1); if (rest.length) modes[rest[rng.nextInt(rest.length)]] = 0; }
  return modes;
}
// scratch canvases for the figure painter
const FT = { b: document.createElement('canvas'), s: document.createElement('canvas'), o: document.createElement('canvas'), w: document.createElement('canvas') };
const fit = (c, w, h) => { if (c.width < w || c.height < h) { c.width = Math.max(c.width, w); c.height = Math.max(c.height, h); } const x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none'; x.clearRect(0, 0, c.width, c.height); return x; };
function tint(dst, src, w, h, color) { const x = fit(dst, w, h); x.drawImage(src, 0, 0, w, h, 0, 0, w, h); x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, w, h); x.globalCompositeOperation = 'source-over'; return dst; }
// _AsFigurePainter (holo): real colours, a thin blue outline, filling in from the feet up
function figPaint(ctx, art, frame, frame2, mix, bx, by, bw, bh, bright, glow, edge, reveal) {
  const im = art.im, n = Math.max(1, art.frames), fw = im.naturalWidth / n, ih = im.naturalHeight, availH = bh / 1.14, kk = Math.min(bw / fw, availH / ih), dw = fw * kk, dh = ih * kk;
  const dx = bx + (bw - dw) / 2, dy = by + availH - dh, feetY = by + availH, cx = bx + bw / 2, k = scaleOf(ctx), Mg = 10, CW = Math.max(2, Math.ceil((dw + Mg * 2) * k)), CH = Math.max(2, Math.ceil((dh + Mg * 2) * k));
  const src = f => [fw * clamp(f, 0, n - 1), 0, fw, ih], put = (x, f, a) => { x.globalAlpha = a; x.drawImage(im, ...src(f), Mg * k, Mg * k, dw * k, dh * k); x.globalAlpha = 1; };
  let g = ctx.createRadialGradient(cx, feetY, 0, cx, feetY, dw * .39); g.addColorStop(0, `rgba(0,0,0,${clamp(.55 * reveal, 0, 1)})`); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save(); ctx.translate(cx, feetY); ctx.scale(1, Math.max(5, dh * .05) / (dw * .78)); ctx.translate(-cx, -feetY); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, feetY, dw * .39, 0, TAU); ctx.fill(); ctx.restore();
  if (edge > 0) { ctx.save(); ctx.filter = `blur(${(.8 * k).toFixed(2)}px)`; ctx.lineWidth = 1; ctx.strokeStyle = rgba(P['sh.outline'], clamp(.5 * edge, 0, 1)); ctx.beginPath(); ctx.ellipse(cx, feetY, dw * .475, Math.max(6, dh * .06) / 2, 0, 0, TAU); ctx.stroke(); ctx.restore(); }
  const B = FT.b, bx2 = fit(B, CW, CH); put(bx2, frame, 1); if (frame2 >= 0 && frame2 !== frame && mix > .002) put(bx2, frame2, mix);
  const ox = dx - Mg, oy = dy - Mg, drawC = (c, a, filter, sx = 0, sy = 0) => { ctx.save(); ctx.globalAlpha = a; if (filter) ctx.filter = filter; ctx.drawImage(c, 0, 0, CW, CH, ox + sx, oy + sy, CW / k, CH / k); ctx.restore(); };
  if (glow > 0) { const x = fit(FT.w, CW, CH); put(x, frame, 1); x.globalCompositeOperation = 'source-in'; x.fillStyle = P['sh.glowColor']; x.fillRect(0, 0, CW, CH); x.globalCompositeOperation = 'source-over'; ctx.save(); ctx.globalAlpha = clamp(.95 * glow * reveal, 0, 1); ctx.filter = `blur(${(12 * k).toFixed(2)}px)`; const sxk = (dw + 10) / dw, syk = (dh + 10) / dh; ctx.translate(dx + dw / 2, dy + dh / 2); ctx.scale(sxk, syk); ctx.drawImage(FT.w, 0, 0, CW, CH, -dw / 2 - Mg, -dh / 2 - Mg, CW / k, CH / k); ctx.restore(); }
  const S = tint(FT.s, B, CW, CH, P['sh.outline']);
  if (edge > 0) {
    const e = clamp(edge * bright, 0, 1), O = fit(FT.o, CW, CH), o = 1.2 * k;
    O.globalAlpha = .5 * e; O.filter = `blur(${(2.6 * k).toFixed(2)}px)`; O.drawImage(S, 0, 0); O.filter = 'none'; O.globalAlpha = .95 * e;
    for (const [sx, sy] of [[o, 0], [-o, 0], [0, o], [0, -o]]) O.drawImage(S, sx, sy);
    O.globalAlpha = 1; O.globalCompositeOperation = 'destination-out'; O.drawImage(B, 0, 0); O.globalCompositeOperation = 'source-over'; drawC(FT.o, 1);
  }
  if (reveal > 0) {
    const cut = dy + dh - dh * reveal, b = 1 + .3 * glow; ctx.save(); ctx.beginPath(); ctx.rect(bx - 20, cut, bw + 40, by + bh - cut + 20); ctx.clip(); drawC(B, 1, b !== 1 ? `brightness(${b})` : null); ctx.restore();
    if (reveal < 1) { tint(FT.w, B, CW, CH, '#E8FBFF'); ctx.save(); ctx.beginPath(); ctx.rect(bx - 20, cut - 2.5, bw + 40, 4); ctx.clip(); drawC(FT.w, 1); ctx.restore(); }
  }
  if (reveal < 1 && edge > 0) { const cut = dy + dh - dh * reveal; ctx.save(); ctx.beginPath(); ctx.rect(bx - 20, by - 20, bw + 40, cut - by + 20); ctx.clip(); drawC(S, .12 * edge); ctx.restore(); }
}
function avatarCircle(ctx, im, name, cx, cy, r) {
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fillStyle = '#3A4350'; ctx.fill(); ctx.clip();
  if (ready(im)) { const s = Math.max(2 * r / im.naturalWidth, 2 * r / im.naturalHeight); ctx.drawImage(im, cx - im.naturalWidth * s / 2, cy - im.naturalHeight * s / 2, im.naturalWidth * s, im.naturalHeight * s); }
  else { ctx.fillStyle = '#fff'; ctx.font = `800 ${r * .9}px Roboto`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText((name || '?').slice(0, 1).toUpperCase(), cx, cy); }
  ctx.restore();
}
const spacedW = (ctx, t, sp) => { let w = 0; for (const ch of t) w += ctx.measureText(ch).width + sp; return w; };
function centerSpaced(ctx, t, cx, y, sp) { const w = spacedW(ctx, t, sp); ctx.textAlign = 'left'; spaced(ctx, t, cx - w / 2, y, sp); return w; }
// _figureWidget + _figArt
function drawFigure(ctx, f, g, i, u, flick, mode, secs, seed) {
  const S = SH, fw = g.w, fh = g.h, edge = smooth((u - .28) / .22), reveal = smooth((u - .42) / .5), picked = S.pick.includes(f.id), glow = picked ? P['sh.pickGlow'] : 0;
  const ph = flick * TAU * 6 + i * 1.7; let fl = .9 + .1 * Math.sin(ph) * Math.sin(ph * 2.3 + 1); if (((flick * 37 + i * .31) % 1) < .02) fl *= .7; if (!P['sh.flicker']) fl = 1;
  const rng = new DartRandom(asHash('mv' + seed + f.id)), phase = rng.nextDouble(); let ang = 0;
  if (mode === 1) { const period = P['sh.swingMin'] + rng.nextDouble() * 2.4; ang = P['sh.swing'] * Math.sin(TAU * (secs / period + phase)); }
  else if (mode === 2) { const period = P['sh.spinMin'] + rng.nextDouble() * 3; ang = 360 * ((secs / period + phase) % 1); }
  const boxH = fh * 1.14, art = figArtOf(f);
  if (art) {
    let frame = 0, frame2 = -1, mix = 0;
    if (art.kind === 'spin') { const pos = ang / 360 * art.frames, f0 = Math.floor(pos); frame = ((f0 % art.frames) + art.frames) % art.frames; frame2 = (frame + 1) % art.frames; mix = pos - f0; }
    else { const mid = Math.floor(art.frames / 2), a = clamp(ang, -60, 60), pos = clamp(mid + a / 60 * mid, 0, art.frames - 1); frame = Math.floor(pos); frame2 = Math.min(frame + 1, art.frames - 1); mix = pos - frame; }
    figPaint(ctx, art, frame, frame2, mix, g.x, g.y, fw, boxH, fl, glow, edge, reveal);
  } else {
    const r = fw * .42; ctx.save(); ctx.globalAlpha = clamp(reveal, 0, 1); const cx = g.x + fw / 2, cy = g.y + boxH * (1 + .62) / 2;
    if (glow > 0) { ctx.shadowColor = rgba(P['sh.glowColor'], .9 * glow); ctx.shadowBlur = K.shadowBlurFor(ctx, 22); }
    ctx.strokeStyle = CY; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx, cy, r + 1.5, 0, TAU); ctx.stroke(); ctx.shadowBlur = 0; avatarCircle(ctx, f.avatar, f.name, cx, cy, r); ctx.restore();
  }
  // name tag under the feet
  const name = (picked ? '✓ ' : '') + f.name; ctx.save(); ctx.globalAlpha = clamp(reveal, 0, 1); ctx.font = `800 ${P['sh.nameSize']}px Roboto`;
  const tw = Math.min(ctx.measureText(name).width, fw + 60 - 14), th = P['sh.nameSize'] * 1.17 + 4, tx = g.x + fw / 2 - tw / 2 - 7, ty = g.y + fh * 1.02;
  ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.beginPath(); ctx.roundRect(tx, ty, tw + 14, th, 9); ctx.fill(); ctx.lineWidth = picked ? 1.2 : .8; ctx.strokeStyle = picked ? YEL : 'rgba(95,216,255,.4)'; ctx.stroke();
  ctx.fillStyle = picked ? YEL : P['sh.nameColor']; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(name, g.x + fw / 2, ty + th / 2, fw + 60 - 14); ctx.restore();
  S.figBoxes.push({ f, x: g.x, y: g.y, w: fw, h: boxH + 16, tap: reveal > .5 });
}
// _AsBeamPainter: thin columns of light drop one by one, flash on impact, then fade as the figure forms
function drawBeams(ctx, beams) {
  const k = scaleOf(ctx), c = P['sh.beamColor'];
  for (const [x, fy, u, bw] of beams) {
    if (u <= 0 || u >= 1) continue; const drop = smooth(u / .26), head = fy * drop, fade = 1 - smooth((u - .5) / .38); if (fade <= 0) continue; const widen = smooth((u - .24) / .2);
    if (head > 2) {
      const gw = 8 + bw * .12 * widen; let g = ctx.createLinearGradient(0, 0, 0, head); g.addColorStop(0, rgba(c, 0)); g.addColorStop(.5, rgba(c, .2 * fade)); g.addColorStop(1, rgba(c, .4 * fade));
      ctx.save(); ctx.filter = `blur(${(7 * k).toFixed(2)}px)`; ctx.fillStyle = g; ctx.fillRect(x - gw, 0, gw * 2, head); ctx.restore();
      const cw = 1.3 + 1.7 * widen; g = ctx.createLinearGradient(0, 0, 0, head); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, `rgba(255,255,255,${.8 * fade})`); g.addColorStop(1, `rgba(255,255,255,${fade})`); ctx.fillStyle = g; ctx.fillRect(x - cw / 2, 0, cw, head);
    }
    if (drop < 1) { ctx.save(); ctx.filter = `blur(${(3 * k).toFixed(2)}px)`; ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.arc(x, head, 3.5, 0, TAU); ctx.fill(); ctx.restore(); }
    if (u > .24) {
      const kk = smooth((u - .24) / .5), rw = bw * (.3 + 1.1 * kk);
      ctx.save(); ctx.filter = `blur(${(1.5 * k).toFixed(2)}px)`; ctx.lineWidth = 1.4; ctx.strokeStyle = rgba(c, clamp(.85 * (1 - kk), 0, 1)); ctx.beginPath(); ctx.ellipse(x, fy, rw / 2, rw * .1, 0, 0, TAU); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.translate(x, fy); ctx.scale(1, .16 / .9); const g = ctx.createRadialGradient(0, 0, 0, 0, 0, bw * .45); g.addColorStop(0, `rgba(255,255,255,${clamp(.55 * (1 - kk), 0, 1)})`); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, bw * .45, 0, TAU); ctx.fill(); ctx.restore();
    }
  }
}
// _AsFloorPainter, drawn through the floor matrix row by row (the tilt is about a horizontal axis, so each row stays straight)
const FLOOR = document.createElement('canvas');
function drawFloor(ctx, snap, plane, q, M) {
  const k = Math.min(scaleOf(ctx), 3), FW = Math.ceil(plane.w * k), FH = Math.ceil(plane.h * k), x = fit(FLOOR, FW, FH), sk = snap.width / K.W;
  const dim = 1 - P['sh.dim'] * q; x.filter = `brightness(${dim})`; x.drawImage(snap, plane.x * sk, plane.y * sk, plane.w * sk, plane.h * sk, 0, 0, FW, FH); x.filter = 'none';
  if (q > 0) {
    x.globalCompositeOperation = 'lighter'; x.fillStyle = `rgb(0,${Math.round(P['sh.tintG'] * q)},${Math.round(P['sh.tintB'] * q)})`; x.fillRect(0, 0, FW, FH);
    const edgeA = clamp(1 - q, 0, 1); x.globalCompositeOperation = 'destination-in'; let g = x.createLinearGradient(0, 0, 0, FH); g.addColorStop(0, `rgba(255,255,255,${edgeA})`); g.addColorStop(Math.max(.01, P['sh.farFade'] * q), '#fff'); g.addColorStop(1, '#fff'); x.fillStyle = g; x.fillRect(0, 0, FW, FH);
    g = x.createLinearGradient(0, 0, FW, 0); g.addColorStop(0, `rgba(255,255,255,${edgeA})`); g.addColorStop(P['sh.sideFade'], '#fff'); g.addColorStop(1 - P['sh.sideFade'], '#fff'); g.addColorStop(1, `rgba(255,255,255,${edgeA})`); x.fillStyle = g; x.fillRect(0, 0, FW, FH); x.globalCompositeOperation = 'source-over';
  }
  const N = 160; for (let i = 0; i < N; i++) {
    const s0 = plane.y + plane.h * i / N, s1 = plane.y + plane.h * (i + 1) / N, a = fx(M, plane.x, s0), b = fx(M, plane.x + plane.w, s1), a2 = fx(M, plane.x, s1), b2 = fx(M, plane.x + plane.w, s0);
    const y0 = a[1], y1 = a2[1]; if (y1 - y0 <= 0) continue; const l = (a[0] + a2[0]) / 2, r = (b[0] + b2[0]) / 2;
    ctx.drawImage(FLOOR, 0, FH * i / N, FW, FH / N, l, y0, r - l, y1 - y0 + .6);
  }
}
function drawHorizon(ctx, y, a, W) {
  if (a <= .01) return; const k = scaleOf(ctx), c = P['sh.horizonGlow'];
  let g = ctx.createLinearGradient(0, y - 60, 0, y); g.addColorStop(0, rgba(c, 0)); g.addColorStop(1, rgba(c, .07 * a)); ctx.fillStyle = g; ctx.fillRect(0, y - 60, W, 60);
  ctx.save(); ctx.filter = `blur(${(6 * k).toFixed(2)}px)`; g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, rgba(c, 0)); g.addColorStop(.25, rgba(c, .22 * a)); g.addColorStop(.75, rgba(c, .22 * a)); g.addColorStop(1, rgba(c, 0)); ctx.fillStyle = g; ctx.fillRect(0, y - 10, W, 20); ctx.restore();
  const lc = P['sh.horizonLine']; g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, rgba(lc, 0)); g.addColorStop(.2, rgba(lc, P['sh.lineAlpha'] * a)); g.addColorStop(.8, rgba(lc, P['sh.lineAlpha'] * a)); g.addColorStop(1, rgba(lc, 0)); ctx.fillStyle = g; ctx.fillRect(0, y - .6, W, 1.2);
}
// _AsBustPainter: a still, chest-up hologram bust for the send panels
const bustCache = new Map();
function bustArt(f) {
  const art = figArtOf(f); if (!art) return null; const fr = art.kind === 'spin' ? 0 : clamp(f.avFrame == null ? Math.floor(art.frames / 2) : f.avFrame, 0, art.frames - 1), key = f.id + '|' + art.kind; let c = bustCache.get(key); if (c) return c;
  const fw = art.im.naturalWidth / art.frames, ih = art.im.naturalHeight, crop = [fw * fr, ih * .015, fw, ih * .4], cw = Math.round(crop[2]), chh = Math.round(crop[3]);
  const raw = document.createElement('canvas'); raw.width = cw; raw.height = chh; raw.getContext('2d').drawImage(art.im, ...crop, 0, 0, cw, chh);
  const holo = document.createElement('canvas'); holo.width = cw; holo.height = chh; const hx = holo.getContext('2d'); hx.drawImage(raw, 0, 0); const d = hx.getImageData(0, 0, cw, chh), p = d.data;
  for (let i = 0; i < p.length; i += 4) { const r = p[i], g = p[i + 1], b = p[i + 2]; p[i] = .383 * r + .187 * g + .037 * b; p[i + 1] = .22 * r + .718 * g + .084 * b + 4; p[i + 2] = .258 * r + .506 * g + .386 * b + 14; p[i + 3] *= .88; } hx.putImageData(d, 0, 0);
  const sil = c2 => { const s = document.createElement('canvas'); s.width = cw; s.height = chh; const x = s.getContext('2d'); x.drawImage(raw, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = c2; x.fillRect(0, 0, cw, chh); return s; };
  c = { raw, holo, cy: sil(CY), mg: sil('#FF4FD8'), w: cw, h: chh }; bustCache.set(key, c); return c;
}
function drawBust(ctx, f, t, hall, x0, y0, W, H) {
  const seed = (asHash(f.id + (hall ? 'h' : 'e')) % 1000) / 1000, b = bustArt(f), k = scaleOf(ctx);
  if (!b) { const glitch = ((t * .9 + seed * 7) % 1) < .09, r = W * .36; ctx.save(); ctx.globalAlpha = glitch ? .6 : .9; const cx = x0 + W / 2 + (glitch ? 3 : 0), cy = y0 + H / 2; ctx.shadowColor = 'rgba(95,216,255,.4)'; ctx.shadowBlur = K.shadowBlurFor(ctx, 14); ctx.strokeStyle = CY; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx, cy, r + 1.5, 0, TAU); ctx.stroke(); ctx.shadowBlur = 0; ctx.filter = 'grayscale(.6) sepia(.3) hue-rotate(160deg)'; avatarCircle(ctx, f.avatar, f.name, cx, cy, r); ctx.restore(); return; }
  const kk = Math.min(W / b.w, H * .9 / b.h), dw = b.w * kk, dh = b.h * kk, dx = x0 + (W - dw) / 2, dy = y0 + H * .9 - dh, baseY = y0 + H * .97, cxm = x0 + W / 2;
  let g = ctx.createLinearGradient(0, baseY, 0, dy); g.addColorStop(0, rgba(CY, .22)); g.addColorStop(1, rgba(CY, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cxm - W * .16, baseY); ctx.lineTo(dx + dw * .1, dy + dh * .2); ctx.lineTo(dx + dw - dw * .1, dy + dh * .2); ctx.lineTo(cxm + W * .16, baseY); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.translate(cxm, baseY); ctx.scale(1, 7 / (W * .5)); g = ctx.createRadialGradient(0, 0, 0, 0, 0, W * .25); g.addColorStop(0, 'rgba(255,255,255,.7)'); g.addColorStop(.5, rgba(CY, .35)); g.addColorStop(1, rgba(CY, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, W * .25, 0, TAU); ctx.fill(); ctx.restore();
  const glitch = ((t * .9 + seed * 7) % 1) < .09; let fa = .86 + .08 * Math.sin(t * 23 + seed * 40); if (glitch) fa *= .75;
  const Mg = 8, LW = Math.ceil((dw + Mg * 2) * k), LH = Math.ceil((dh + Mg * 2) * k), fadeB = x => { x.globalCompositeOperation = 'destination-in'; const gg = x.createLinearGradient(0, Mg * k, 0, (Mg + dh) * k); gg.addColorStop(0, '#fff'); gg.addColorStop(.74, '#fff'); gg.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gg; x.fillRect(0, 0, LW, LH); x.globalCompositeOperation = 'source-over'; };
  const at = (x, c, sx = 0, a = 1, filter) => { x.globalAlpha = a; if (filter) x.filter = filter; x.drawImage(c, 0, 0, b.w, b.h, Mg * k + sx * k, Mg * k, dw * k, dh * k); x.filter = 'none'; x.globalAlpha = 1; };
  let O = fit(FT.o, LW, LH); at(O, b.cy, 0, .45, `blur(${(2.4 * k).toFixed(2)}px)`); for (const s of [1.1, -1.1]) at(O, b.cy, s); O.drawImage(b.cy, 0, 0, b.w, b.h, Mg * k, (Mg + 1.1) * k, dw * k, dh * k); O.drawImage(b.cy, 0, 0, b.w, b.h, Mg * k, (Mg - 1.1) * k, dw * k, dh * k);
  O.globalCompositeOperation = 'destination-out'; at(O, b.raw); O.globalCompositeOperation = 'source-over'; fadeB(O); ctx.drawImage(FT.o, 0, 0, LW, LH, dx - Mg, dy - Mg, LW / k, LH / k);
  O = fit(FT.w, LW, LH); at(O, b.holo); fadeB(O); O.globalCompositeOperation = 'destination-out'; O.fillStyle = 'rgba(0,0,0,.24)'; for (let y = Mg + (t * 12) % 3; y < Mg + dh; y += 3) O.fillRect(0, y * k, LW, k); O.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.globalAlpha = fa; ctx.drawImage(FT.w, 0, 0, LW, LH, dx - Mg, dy - Mg, LW / k, LH / k); ctx.restore();
  if (glitch) { const r = new DartRandom(Math.floor(t * 30) + Math.floor(seed * 1000)); for (let j = 0; j < 3; j++) { const y = dy + r.nextDouble() * dh * .85, bh = 3 + r.nextDouble() * 9, ddx = (r.nextDouble() - .5) * 16; ctx.save(); ctx.beginPath(); ctx.rect(x0 - 20, y, W + 40, bh); ctx.clip(); ctx.globalAlpha = .7 * .85; ctx.drawImage(b.cy, dx + ddx, dy, dw, dh); ctx.globalAlpha = .35 * .5; ctx.drawImage(b.mg, dx - ddx * .6, dy, dw, dh); ctx.restore(); } }
}
// _shareSheet: PICK WHO GETS IT
function sheetLayout(H) { const S = SH, sh = S.sheet * H, top = H - sh, head = 42, rowH = 72, maxScroll = Math.max(0, head + TARGETS.length * rowH + 24 - sh); return { top, sh, head, rowH, maxScroll }; }
function drawSheet(ctx, W, H) {
  const S = SH, L = sheetLayout(H); S.scroll = clamp(S.scroll, 0, L.maxScroll); S.rows = [];
  ctx.save(); ctx.beginPath(); ctx.roundRect(0, L.top, W, L.sh + 20, [18, 18, 0, 0]); ctx.fillStyle = rgba(P['sh.sheetColor'], .94); ctx.fill(); ctx.clip();
  let y = L.top - S.scroll; ctx.fillStyle = 'rgba(255,255,255,.24)'; ctx.beginPath(); ctx.roundRect(W / 2 - 20, y + 8, 40, 4, 2); ctx.fill();
  ctx.font = '800 12px Roboto'; ctx.fillStyle = '#E5E8EF'; ctx.textBaseline = 'top'; ctx.textAlign = 'left'; spaced(ctx, P['sh.sheetTitle'], 16, y + 22, 1.5); y += L.head;
  for (const u of TARGETS) {
    const picked = S.pick.includes(u.id), mid = y + L.rowH / 2; avatarCircle(ctx, u.avatar, u.name, 16 + 18, mid, 18);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.font = '700 16px Roboto'; ctx.fillStyle = picked ? YEL : '#fff'; ctx.fillText(u.name, 68, mid - 2); ctx.font = '400 12px Roboto'; ctx.fillStyle = '#9EAFBF'; ctx.fillText('@' + u.handle, 68, mid + 15);
    icon(ctx, picked ? SI.check : u.fav ? SI.star : SI.add, W - 16 - 24, mid - 12, 24, picked ? YEL : 'rgba(255,255,255,.7)');
    S.rows.push({ u, y0: y, y1: y + L.rowH }); y += L.rowH;
  }
  ctx.restore(); S.sheetTop = L.top;
}
// _shareDeck: Mead Hall (one group) and Loose the Ravens (each their own)
function drawDeck(ctx, W, H, top, secs, layer) {
  const S = SH, v = S.deck; S.boxes = []; if (v <= 0) return; const e = easeOutCubic(v), k = scaleOf(ctx);
  if (P['sh.deckBlur'] > 0) { ctx.save(); ctx.filter = `blur(${(P['sh.deckBlur'] * e * k).toFixed(2)}px)`; ctx.drawImage(layer, 0, 0, layer.width, layer.height, 0, 0, W, H); ctx.restore(); }
  ctx.fillStyle = `rgba(2,8,18,${.32 * e})`; ctx.fillRect(0, 0, W, H);
  const ids = S.pick.slice(), group = ids.length >= 2, gap = 14, boxTop = top + 64, boxH = Math.min(H * .56, 440), bw = group ? (W - gap * 3) / 2 : W * .66, bob = Math.sin(secs * 1.2) * 3;
  const totalW = group ? bw * 2 + gap : bw; let x = (W - totalW) / 2 + (1 - e) * W; const y = boxTop + bob, c = P['sh.panelColor'];
  ctx.save(); ctx.globalAlpha = e;
  for (const hall of group ? [true, false] : [false]) {
    const sending = S.sending && S.mode === (hall ? 'hall' : 'each');
    ctx.save(); ctx.shadowColor = rgba(c, sending ? .5 : .24); ctx.shadowBlur = K.shadowBlurFor(ctx, sending ? 30 : 18); ctx.fillStyle = rgba(c, sending ? .22 : .1); ctx.beginPath(); ctx.roundRect(x, y, bw, boxH, 16); ctx.fill(); ctx.restore();
    ctx.strokeStyle = rgba(c, sending ? .95 : .55); ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(x + .5, y + .5, bw - 1, boxH - 1, 16); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, bw, boxH, 16); ctx.clip();
    ctx.fillStyle = '#E8FBFF'; ctx.font = '800 12.5px Roboto'; ctx.textBaseline = 'top'; centerSpaced(ctx, hall ? P['sh.hallTitle'] : P['sh.eachTitle'], x + bw / 2, y + 12, 2);
    ctx.fillStyle = '#9FDDF2'; ctx.font = '400 10.5px Roboto'; ctx.textAlign = 'center'; ctx.fillText(hall ? 'one group thread' : 'each gets their own', x + bw / 2, y + 12 + 15 + 2);
    const cols = ids.length <= 1 ? 1 : ids.length <= 6 ? 2 : 3, innerW = bw - 20, cellW = innerW / cols, bustW = Math.min(cellW - 8, 104), bustH = bustW * 1.1; let gy = y + 12 + 15 + 2 + 13 + 10;
    for (let r = 0; r * cols < ids.length; r++) { const row = ids.slice(r * cols, r * cols + cols), rx = x + 10 + (innerW - row.length * cellW) / 2;
      row.forEach((id, j) => { const f = FAVS.find(q => q.id === id) || TARGETS.find(q => q.id === id), cx = rx + j * cellW + cellW / 2; drawBust(ctx, f, secs, hall, cx - bustW / 2, gy, bustW, bustH); ctx.fillStyle = '#DDF6FF'; ctx.font = '700 12.5px Roboto'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(f.name, cx, gy + bustH + 3, cellW); });
      gy += bustH + 3 + 17 + 8; }
    ctx.restore(); S.boxes.push({ hall, x, y, w: bw, h: boxH }); x += bw + gap;
  }
  ctx.restore();
}
function drawReturn(ctx, top) { const S = SH; ctx.font = '800 12px Roboto'; const tw = spacedW(ctx, P['sh.retText'], 1.4), w = 10 + 13 + 6 + tw + 14, h = 27, x = 10, y = top + 8; ctx.fillStyle = 'rgba(16,23,32,.8)'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 18); ctx.fill(); ctx.strokeStyle = YEL; ctx.lineWidth = 1; ctx.stroke(); icon(ctx, SI.back, x + 10, y + h / 2 - 6.5, 13, YEL); ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; spaced(ctx, P['sh.retText'], x + 10 + 13 + 6, y + h / 2 + 1, 1.4); S.ret = { x, y, w, h }; }
function drawTvLine(ctx, a, b, c, W, H) {
  if (a < .55 || c >= 1) return; const k = scaleOf(ctx), cx = W / 2, cy = H / 2, fade = clamp(1 - c, 0, 1), lw = W * (1 - b);
  if (lw > 2) { ctx.save(); ctx.filter = `blur(${(6 * k).toFixed(2)}px)`; ctx.fillStyle = rgba(P['sh.tvColor'], .45 * fade); ctx.fillRect(cx - lw / 2 - 5, cy - 1.1 - 5, lw + 10, 12.2); ctx.restore(); ctx.fillStyle = `rgba(255,255,255,${fade})`; ctx.fillRect(cx - lw / 2, cy - 1.1, lw, 2.2); }
  const dotR = 2.5 + 3 * b; ctx.save(); ctx.filter = `blur(${(8 * k).toFixed(2)}px)`; ctx.fillStyle = rgba(P['sh.tvColor'], .5 * fade * b); ctx.beginPath(); ctx.arc(cx, cy, dotR * 2.4, 0, TAU); ctx.fill(); ctx.restore();
  ctx.fillStyle = `rgba(255,255,255,${fade * b})`; ctx.beginPath(); ctx.arc(cx, cy, dotR, 0, TAU); ctx.fill();
}
const LAYERS = new WeakMap();
function drawShare(ctx, now) {
  const S = SH, W = K.W, H = K.H, k = scaleOf(ctx), top = 0, el = S.t * 2.6, secs = now / 1000, flick = (secs / 4) % 1, seed = S.post.id || 'share';
  const sceneH = Math.min(P['strip.max'], H * P['strip.share']), postTop = top + sceneH - 26, foot = footprint();
  const plane = { x: 0, y: postTop + 56, w: W, h: Math.max(postTop + 176, H - foot) - (postTop + 56) };
  const figs = shareFigs(), sheetTop = H * (1 - (figs.length ? P['sh.sheet'] : .5));
  const nearY = Math.min(sheetTop - 30, H * .82, plane.y + plane.h - P['sh.nameSize'] * 1.2 - 16);
  const horizonY = Math.min(H * P['sh.horizon'], nearY - 60);
  const q = smooth(el / P['sh.tiltSecs']), M = floorM(q, plane, horizonY), hz = fx(M, W / 2, plane.y)[1];
  const skyH = Math.min(H, hz + H * P['sh.skyExtra']);
  const LW = Math.ceil(W * k), LH = Math.ceil(H * k); let L = LAYERS.get(ctx.canvas); if (!L) { L = document.createElement('canvas'); LAYERS.set(ctx.canvas, L); } if (L.width !== LW || L.height !== LH) { L.width = LW; L.height = LH; }
  const x = L.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none'; x.clearRect(0, 0, LW, LH); x.scale(k, k);
  x.fillStyle = P['sh.bg']; x.fillRect(0, 0, W, H);
  x.save(); x.beginPath(); x.rect(0, 0, W, skyH); x.clip(); S.orbs = drawScene(x, W, skyH, 'share', hz); x.restore();
  S.floor = { M, plane, hz }; S.orbTop = P['strip.orbTop']; S.skyH = skyH; S.nearY = nearY;
  drawFloor(x, S.snap, plane, q, M); drawHorizon(x, hz, q, W);
  const snapA = 1 - smooth(el / P['sh.snapFade']); if (snapA > .002) { x.save(); x.globalAlpha = clamp(snapA, 0, 1); x.drawImage(S.snap, 0, 0, W, H); x.restore(); }
  const n = figs.length, slots = figSlots(n, seed, W, Math.max(hz, horizonY), nearY), modes = figModes(figs, seed), order = slots.map((_, i) => i).sort((a, b) => slots[a][1] - slots[b][1]), beams = []; S.figBoxes = []; S.geoms = []; S.figScenes = [];
  for (const i of order) { const g = figGeom(slots[i], horizonY, nearY, W), u = figU(i, n, el, seed); beams.push([g.x + g.w / 2, g.y + g.h, u, g.w * .5]); S.geoms.push(g); S.figScenes.push({ f: figs[i], g, i, u, flick, mode: modes[i], secs, seed }); if (u > 0) drawFigure(x, figs[i], g, i, u, flick, modes[i], secs, seed); }
  S.beams = beams; drawBeams(x, beams);
  if (S.pick.length && S.deck === 0) { x.save(); x.globalAlpha = .55 + .45 * Math.abs(Math.sin(secs * 3)); x.font = '700 12.5px Roboto'; x.fillStyle = P['sh.hintColor']; x.textBaseline = 'top'; x.shadowColor = '#000'; x.shadowBlur = K.shadowBlurFor(x, 6); centerSpaced(x, P['sh.hint'] + '  ›  ' + S.pick.length + ' picked', W / 2, sheetTop - 22, 1.2); x.restore(); }
  drawSheet(x, W, H);
  // tvWrap around everything (sheet, deck and return button included)
  const v = S.tv, a = smooth(v / .45), b = smooth((v - .42) / .28), c = smooth((v - .7) / .3);
  if (v > 0) { ctx.fillStyle = `rgba(0,0,0,${1 - c})`; ctx.fillRect(0, 0, W, H); if (b >= 1) { drawTvLine(ctx, a, b, c, W, H); return; } ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(Math.max(.002, 1 - b), Math.max(.004, 1 - a)); ctx.translate(-W / 2, -H / 2); }
  ctx.drawImage(L, 0, 0, LW, LH, 0, 0, W, H); drawDeck(ctx, W, H, top, secs, L); drawReturn(ctx, top);
  if (v > 0) { ctx.fillStyle = `rgba(255,255,255,${clamp(.55 * a, 0, 1)})`; ctx.fillRect(0, 0, W, H); ctx.restore(); drawTvLine(ctx, a, b, c, W, H); }
}
function sharePointer(kind, p) {
  const S = SH; if (!S) return; const now = performance.now();
  if (kind === 'down') { const inR = r => r && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; let mode = 'layer'; if (S.tv > 0 || S.closing) mode = 'none'; else if (inR(S.ret)) mode = 'ret'; else if (S.deck > 0) mode = 'deck'; else if (S.sheetTop != null && p.y >= S.sheetTop) mode = 'sheet'; S.drag = { mode, x0: p.x, y0: p.y, x: p.x, y: p.y, t: now, t0: now, vx: 0 }; return; }
  const d = S.drag; if (!d) return;
  if (kind === 'move') { const dy = p.y - d.y, dt = Math.max(1, now - d.t); d.vx = (p.x - d.x) / dt * 1000;
    if (d.mode === 'sheet') { const H = K.H, mx = P['sh.sheetMax']; if (dy < 0) { const take = Math.min(Math.max(0, (mx - S.sheet) * H), -dy); S.sheet += take / H; S.scroll += -dy - take; } else { const s = Math.min(S.scroll, dy); S.scroll -= s; S.sheet = Math.max(.1, S.sheet - (dy - s) / H); } }
    d.x = p.x; d.y = p.y; d.t = now; return; }
  if (kind === 'up') {
    S.drag = null; const mdx = p.x - d.x0, mdy = p.y - d.y0, moved = Math.hypot(mdx, mdy) > 6, inR = r => r && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
    const vx = Math.abs(d.vx) > 1 ? d.vx : mdx / Math.max(1, now - d.t0) * 1000, horiz = Math.abs(mdx) > Math.abs(mdy) && Math.abs(mdx) > 18;
    if (d.mode === 'ret') { if (!moved && inR(S.ret)) closeShare(); return; }
    if (d.mode === 'deck') { if (moved && horiz && vx > 250 && !S.sending) S.deckDir = -1; else if (!moved) { const bx = (S.boxes || []).find(inR); if (bx) deckSend(bx.hall); } return; }
    if (d.mode === 'layer') {
      if (moved && horiz && Math.abs(vx) > 250 && S.pick.length && !S.sending) S.deckDir = 1;
      else if (!moved) {
        const person = S.figBoxes.slice().reverse().find(b => b.tap && inR(b));
        if (person) togglePick(person.f.id);
        else if (p.y < S.floor.hz) { const hole = holeAt(p, S.orbs || [], S.orbTop); if (hole) startFlight(hole, S.orbTop); }
      }
      return;
    }
    if (d.mode === 'sheet' && !moved) { const r = (S.rows || []).find(r => p.y >= r.y0 && p.y < r.y1); if (r) togglePick(r.u.id); }
  }
}

/* ---------- profile + marketplace (_openProfile / _profileView / _stat / _marketView / _postCard / _saleBar / _tag / _chip / _postMenu) ---------- */
const PGI = { place: new Path2D('M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'), sell: new Path2D('M21.41 11.41l-8.83-8.83c-.37-.37-.88-.58-1.41-.58H4c-1.1 0-2 .9-2 2v7.17c0 .53.21 1.04.59 1.41l8.83 8.83c.78.78 2.05.78 2.83 0l7.17-7.17c.78-.78.78-2.04-.01-2.83zM6.5 8C5.67 8 5 7.33 5 6.5S5.67 5 6.5 5 8 5.67 8 6.5 7.33 8 6.5 8z'), tag: new Path2D('M20 10V8h-4V4h-2v4h-4V4H8v4H4v2h4v4H4v2h4v4h2v-4h4v4h2v-4h4v-2h-4v-4h4zm-6 4h-4v-4h4v4z'), edit: new Path2D('M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z') };
const ME_ID = '8de1337c-ed44-4c6a-b68e-beae6b51893f', IDUN_ID = 'aaaaaaaa-0000-4000-8000-000000000008', THOR_ID = 'aaaaaaaa-0000-4000-8000-000000000001';
// real rows: social_profiles, social_follows counts, live_streams.follower_count, and the 20 newest posts (like/comment counts as stored)
const mkPosts = (who, name, av, data) => data.split(' ').map((s, i) => { const [lc, rest] = s.split('/'), [cc, at] = rest.split('@'); return { id: who + (i + 1), author: who === 'idun' ? IDUN_ID : THOR_ID, name, handle: 'test_' + who, avatar: av, county: 'Flagler', state: 'FL', body: 'Test saga ' + (i + 1) + ' from ' + name, imgs: [img('https://picsum.photos/seed/' + who + (i + 1) + '/600/800')], topic: 'general', kind: 'post', likes: +lc, comments: +cc, at: new Date(at), liked: false }; });
const AV = { idun: img('https://i.pravatar.cc/300?img=64'), thor: img('https://i.pravatar.cc/300?img=5'), me: img('https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/asgard/8de1337c-ed44-4c6a-b68e-beae6b51893f/avatar_1792767885871.jpg') };
const PROFILES = {
  [ME_ID]: { id: ME_ID, handle: 'swad30991', name: 'swad30991', county: 'Flagler', state: 'FL', bio: '', avatar: AV.me, fers: 1, fing: 8, posts: [], follow: 'me' },
  [IDUN_ID]: { id: IDUN_ID, handle: 'test_idun', name: 'Idun', county: 'Flagler', state: 'FL', bio: 'Asgard test account', avatar: AV.idun, fers: 1000000, fing: 0, follow: 'following', posts: mkPosts('idun', 'Idun', AV.idun, '259/7@2026-10-25T19:08:30Z 65/23@2026-10-25T17:56:37Z 31/12@2026-10-25T16:58:46Z 152/28@2026-10-25T15:33:26Z 50/28@2026-10-25T14:49:31Z 377/26@2026-10-25T13:47:22Z 391/1@2026-10-25T12:48:24Z 133/22@2026-10-25T11:37:27Z 277/17@2026-10-25T10:30:46Z 63/28@2026-10-25T09:57:57Z 147/27@2026-10-25T08:23:14Z 286/15@2026-10-25T08:04:21Z 254/8@2026-10-25T06:29:01Z 146/15@2026-10-25T06:00:10Z 172/15@2026-10-25T04:56:32Z 391/8@2026-10-25T03:34:23Z 390/15@2026-10-25T02:22:02Z 346/18@2026-10-25T01:44:13Z 378/8@2026-10-25T00:23:36Z 194/23@2026-10-24T23:25:41Z') },
  [THOR_ID]: { id: THOR_ID, handle: 'test_thor', name: 'Thor', county: 'Flagler', state: 'FL', bio: 'Asgard test account', avatar: AV.thor, fers: 120, fing: 1, follow: 'following', posts: mkPosts('thor', 'Thor', AV.thor, '203/27@2026-10-25T18:55:44Z 208/9@2026-10-25T17:21:35Z 390/28@2026-10-25T16:56:38Z 71/26@2026-10-25T15:42:09Z 389/11@2026-10-25T14:29:25Z 119/16@2026-10-25T13:27:32Z 333/0@2026-10-25T13:05:48Z 97/18@2026-10-25T11:44:30Z 66/7@2026-10-25T10:55:02Z 248/11@2026-10-25T10:08:02Z 96/24@2026-10-25T08:50:56Z 356/10@2026-10-25T07:33:24Z') },
};
POSTS.forEach(p => { p.author = p.handle === 'test_idun' ? IDUN_ID : THOR_ID; });
// No sale posts exist yet; these studio-only listings (from the test accounts) exercise the sale bar states.
const LISTINGS = [[THOR_ID, 'Test listing 1 from Thor', 18000, 'truck', 'Palm Coast', ''], [IDUN_ID, 'Test listing 2 from Idun', 4500, 'car', 'Bunnell', ''], [THOR_ID, 'Test listing 3 from Thor', 32050, 'freight', '', ''], [IDUN_ID, 'Test listing 4 from Idun', 1200, 'car', 'Flagler Beach', 'sold']]
  .map(([a, body, cents, size, town, st], i) => { const pr = PROFILES[a]; return { id: 'sale' + i, author: a, name: pr.name, handle: pr.handle, avatar: pr.avatar, county: 'Flagler', state: 'FL', body, imgs: [img('https://picsum.photos/seed/sale' + (i + 1) + '/600/600')], topic: 'general', kind: 'sale', cents, size, town, status: st, likes: 0, comments: 0, at: new Date(Date.now() - (i + 1) * 3.6e6 * 5), liked: false }; });
const VS = { profile: 0, market: 0 };
function openProfile(id) { ST.view = 'profile'; ST.profile = id; VS.profile = 0; ST.vel = 0; ST.menu = null; }
function goMarket() { ST.view = 'market'; VS.market = 0; ST.vel = 0; ST.menu = null; }
function goFeed() { ST.view = 'feed'; ST.vel = 0; ST.menu = null; }
const money = c => c % 100 === 0 ? '$' + (c / 100).toFixed(0) : '$' + (c / 100).toFixed(2);
function cover(ctx, im, x, y, w, h, r) { ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.clip(); if (ready(im)) { const s = Math.max(w / im.naturalWidth, h / im.naturalHeight), dw = im.naturalWidth * s, dh = im.naturalHeight * s; ctx.drawImage(im, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh); } else { ctx.fillStyle = 'rgba(0,0,0,.26)'; ctx.fillRect(x, y, w, h); } ctx.restore(); }
function btn(ctx, x, y, label, kind, color) { // Material 3 button: stadium, 40 high, 24 side padding
  ctx.font = '500 14px Roboto'; const w = ctx.measureText(label).width + 48, h = 40;
  ctx.save(); if (kind === 'filled') { ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = K.shadowBlurFor(ctx, 2); ctx.shadowOffsetY = 1; ctx.fillStyle = color.bg; ctx.beginPath(); ctx.roundRect(x, y, w, h, 20); ctx.fill(); } else { ctx.strokeStyle = color.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(x + .5, y + .5, w - 1, h - 1, 20); ctx.stroke(); } ctx.restore();
  ctx.fillStyle = color.fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, x + w / 2, y + h / 2 + .5); return w;
}
const hit = (x, y, w, h, fn, tag) => { G.hits.push({ x, y, w, h, fn, tag }); };
function postMenu(x, y, p) { const mine = p.author === ME_ID; ST.menu = { x, y, items: mine ? [['Delete', '#FF7A7A', () => K.status('In the app this deletes your post.')]] : [['Report', '#FFFFFF', () => K.status('In the app this opens the report reasons for this post.')], ['Block user', '#FF7A7A', () => K.status('In the app this blocks @' + p.handle + '.')]] }; }
// _postCard (+ _saleBar, _tag)
function drawCard(ctx, p, x, y, w) {
  const pad = P['cd.pad'], iw = w - pad * 2, muted = P['cd.muted'], bs = P['cd.bodySize'], lh = bs * 1.35;
  ctx.font = `400 ${bs}px Roboto`; const lines = p.body ? (p.body.split('\n').flatMap(l => wrapText(ctx, l, iw, 60))) : [];
  const n = p.imgs.length, imgH = n ? (n === 1 ? P['cd.imgOne'] : P['cd.imgMany']) : 0, tags = []; if (p.topic && p.topic !== 'general') tags.push([p.topic, PGI.tag]); if (p.store) tags.push([p.store, PGI.sell]);
  const sale = p.kind === 'sale', saleH = sale ? 10 + 12 + Math.max(P['mk.priceSize'] * 1.17 + 2 + 14, 40) + 12 : 0;
  const h = pad + 48 + (lines.length ? 10 + lines.length * lh : 0) + (n ? 10 + imgH : 0) + 10 + (tags.length ? 24 : 0) + saleH + 6 + 22 + pad;
  if (y > K.H || y + h < 0) return h;
  ctx.fillStyle = P['cd.color']; ctx.beginPath(); ctx.roundRect(x, y, w, h, P['cd.radius']); ctx.fill();
  let cy = y + pad; avatarCircle(ctx, p.avatar, p.name, x + pad + 18, cy + 24, 18);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = `800 ${P['cd.nameSize']}px Roboto`; ctx.fillStyle = '#fff'; ctx.fillText(p.name, x + pad + 46, cy + 7, iw - 46 - 48);
  ctx.font = `400 ${P['cd.subSize']}px Roboto`; ctx.fillStyle = muted; ctx.fillText('@' + p.handle + '  ·  ' + ago(p.at) + '  ·  ' + p.county + ', ' + p.state, x + pad + 46, cy + 7 + P['cd.nameSize'] * 1.35, iw - 46 - 48);
  icon(ctx, MI.more, x + w - pad - 36, cy + 12, 24, muted);
  hit(x + pad, cy, iw - 48, 48, () => openProfile(p.author), 'cards'); hit(x + w - pad - 48, cy, 48, 48, () => postMenu(x + w - pad, cy + 40, p), 'cards');
  cy += 48;
  if (lines.length) { cy += 10; ctx.font = `400 ${bs}px Roboto`; ctx.fillStyle = '#fff'; for (const l of lines) { ctx.fillText(l, x + pad, cy + (lh - bs * 1.17) / 2); cy += lh; } }
  if (n) { cy += 10; const iwid = n === 1 ? K.W - 56 : 200; ctx.save(); ctx.beginPath(); ctx.rect(x + pad, cy, iw, imgH); ctx.clip(); p.imgs.forEach((im, i) => { const ix = x + pad + i * (iwid + 8); cover(ctx, im, ix, cy, iwid, imgH, P['cd.imgRadius']); hit(ix, cy, Math.min(iwid, x + w - pad - ix), imgH, () => { ST.viewer = im; }, 'cards.img'); }); ctx.restore(); cy += imgH; }
  cy += 10; if (tags.length) { let tx = x + pad; for (const [t, ic] of tags) { ctx.font = '700 12px Roboto'; const tw = ctx.measureText(t).width + 8 + 13 + 4 + 8; ctx.fillStyle = '#11151C'; ctx.beginPath(); ctx.roundRect(tx, cy, tw, 24, 10); ctx.fill(); icon(ctx, ic, tx + 8, cy + 5.5, 13, YEL); ctx.fillStyle = YEL; ctx.textBaseline = 'middle'; ctx.fillText(t, tx + 8 + 13 + 4, cy + 12); tx += tw + 8; } cy += 24; }
  if (sale) { // _saleBar
    cy += 10; const bh = saleH - 10, sizeText = p.size === 'truck' ? 'Needs a pickup truck' : p.size === 'freight' ? 'Goes by freight' : 'Fits in a car', mine = p.author === ME_ID;
    let label = P['mk.btnLabel'], can = true; if (p.status === 'sold') { label = 'Sold'; can = false; } else if (p.status === 'held') { label = mine ? 'Valkyrie on the way' : 'Taken'; can = false; } else if (mine) { label = 'Your listing'; can = false; } else if (!P['mk.p2p']) { label = 'Opens soon'; can = false; } else if (p.size === 'freight') label = 'Freight delivery';
    ctx.fillStyle = '#11151C'; ctx.beginPath(); ctx.roundRect(x + pad, cy, iw, bh, 12); ctx.fill();
    ctx.font = '800 14px Roboto'; const bw = ctx.measureText(label).width + 32, bx = x + pad + iw - 12 - bw, by = cy + (bh - 40) / 2;
    ctx.fillStyle = can ? YEL : 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.roundRect(bx, by, bw, 40, 12); ctx.fill(); ctx.fillStyle = can ? '#000' : 'rgba(255,255,255,.38)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, bx + bw / 2, by + 20);
    if (can) hit(bx, by, bw, 40, () => K.status(p.size === 'freight' ? 'In the app this opens freight delivery (b2ppage).' : 'In the app this puts it in your bag and opens Checkout.'), 'mk.sale');
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = YEL; ctx.font = `900 ${P['mk.priceSize']}px Roboto`; const ty = cy + (bh - (P['mk.priceSize'] * 1.17 + 2 + 14)) / 2; ctx.fillText(money(p.cents), x + pad + 12, ty);
    ctx.font = '400 12px Roboto'; ctx.fillStyle = muted; ctx.fillText(p.town ? sizeText + '  ·  Pickup in ' + p.town : sizeText, x + pad + 12, ty + P['mk.priceSize'] * 1.17 + 2, bx - x - pad - 20); cy += bh;
  }
  cy += 6; const ic = P['cd.icon']; icon(ctx, p.liked ? MI.heart : MI.heartO, x + pad, cy + (22 - ic) / 2, ic, p.liked ? P['cd.liked'] : muted); ctx.font = '400 13px Roboto'; ctx.fillStyle = muted; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; const lt = String(p.likes); ctx.fillText(lt, x + pad + ic + 4, cy + 11);
  const lw = ic + 4 + ctx.measureText(lt).width; hit(x + pad, cy - 6, lw, 34, () => { p.liked = !p.liked; p.likes += p.liked ? 1 : -1; }, 'cards');
  const cx2 = x + pad + lw + 22; icon(ctx, MI.chat, cx2, cy + .5, 21, muted); ctx.fillText(String(p.comments), cx2 + 25, cy + 11); hit(cx2, cy - 6, 25 + ctx.measureText(String(p.comments)).width, 34, () => K.status('Comments are not built in the studio yet.'), 'cards');
  return h;
}
function listTop(view) { return view === 'market' ? 8 + 48 + 4 : 6 + 48; }
function drawProfile(ctx, W, H) {
  const pr = PROFILES[ST.profile] || PROFILES[IDUN_ID], mine = pr.id === ME_ID, top = listTop('profile'), sy = VS.profile; ctx.fillStyle = '#11151C'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.beginPath(); ctx.rect(0, top, W, H - top); ctx.clip();
  let y = top + 4 - sy; const x = 12, w = W - 24, A = P['pf.avatar'];
  // panel
  ctx.font = `400 ${P['pf.bioSize']}px Roboto`; const bio = pr.bio ? wrapText(ctx, pr.bio, w - 32, 10) : [];
  const ph = 16 + A * 2 + (mine ? 4 + 13 : 0) + 10 + P['pf.nameSize'] * 1.17 + P['pf.subSize'] * 1.17 + (bio.length ? 8 + bio.length * P['pf.bioSize'] * 1.17 : 0) + 12 + P['pf.statSize'] * 1.17 + P['pf.statLabel'] * 1.17 + 12 + 40 + 16;
  ctx.fillStyle = P['pf.panel']; ctx.beginPath(); ctx.roundRect(x, y, w, ph, 14); ctx.fill(); G.profCard = { x, y, w, h: ph };
  let cy = y + 16; avatarCircle(ctx, pr.avatar, pr.name, W / 2, cy + A, A); if (mine) hit(W / 2 - A, cy, A * 2, A * 2, () => K.status('In the app this lets you pick a new photo.'), 'prof.card'); cy += A * 2;
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  if (mine) { cy += 4; ctx.font = '400 11px Roboto'; ctx.fillStyle = P['cd.muted']; ctx.fillText('Tap photo to change', W / 2, cy); cy += 13; }
  cy += 10; ctx.font = `900 ${P['pf.nameSize']}px Roboto`; ctx.fillStyle = '#fff'; ctx.fillText(pr.name, W / 2, cy); cy += P['pf.nameSize'] * 1.17;
  ctx.font = `400 ${P['pf.subSize']}px Roboto`; ctx.fillStyle = P['cd.muted']; ctx.fillText('@' + pr.handle + '  ·  ' + pr.county + ', ' + pr.state, W / 2, cy); cy += P['pf.subSize'] * 1.17;
  if (bio.length) { cy += 8; ctx.font = `400 ${P['pf.bioSize']}px Roboto`; ctx.fillStyle = '#fff'; for (const l of bio) { ctx.fillText(l, W / 2, cy); cy += P['pf.bioSize'] * 1.17; } }
  cy += 12; const stats = [[String(pr.posts.length), 'Posts'], [String(pr.fers), 'Followers'], [String(pr.fing), 'Following']];
  ctx.font = `900 ${P['pf.statSize']}px Roboto`; const sw = stats.map(s => { ctx.font = `900 ${P['pf.statSize']}px Roboto`; const a = ctx.measureText(s[0]).width; ctx.font = `400 ${P['pf.statLabel']}px Roboto`; return Math.max(a, ctx.measureText(s[1]).width); }), free = (w - 32 - sw.reduce((a, b) => a + b, 0)) / 4;
  let sx = x + 16 + free; stats.forEach((s, i) => { const c = sx + sw[i] / 2; ctx.font = `900 ${P['pf.statSize']}px Roboto`; ctx.fillStyle = '#fff'; ctx.fillText(s[0], c, cy); ctx.font = `400 ${P['pf.statLabel']}px Roboto`; ctx.fillStyle = P['cd.muted']; ctx.fillText(s[1], c, cy + P['pf.statSize'] * 1.17); sx += sw[i] + free; });
  cy += P['pf.statSize'] * 1.17 + P['pf.statLabel'] * 1.17 + 12;
  const yel = P['pf.yellow'], btns = mine ? [[P['pf.edit'], 'outline', { line: yel, fg: yel }, () => K.status('In the app this opens Edit profile.')], [P['pf.fig'], 'outline', { line: yel, fg: yel }, () => K.status('In the app this opens "Your figure" (front and back photo for your 3D figure).')]]
    : [[pr.follow === 'following' ? 'Following' : pr.follow === 'pending' ? 'Requested' : 'Follow', 'filled', pr.follow ? { bg: '#11151C', fg: '#fff' } : { bg: yel, fg: '#000' }, () => { if (pr.follow === 'following') { pr.follow = null; pr.fers = Math.max(0, pr.fers - 1); } else if (pr.follow === 'pending') pr.follow = null; else { pr.follow = 'pending'; K.status('Follow request sent.'); } }], ['Options', 'outline', { line: 'rgba(255,255,255,.38)', fg: '#fff' }, () => K.status('In the app this opens the options for ' + pr.name + ' (message, favorite, 360, block).')]];
  ctx.font = '500 14px Roboto'; const bws = btns.map(b => ctx.measureText(b[0]).width + 48), tw = bws.reduce((a, b) => a + b, 0) + 10 * (btns.length - 1); let bx = W / 2 - tw / 2;
  btns.forEach((b, i) => { btn(ctx, bx, cy, b[0], b[1], b[2]); hit(bx, cy, bws[i], 40, b[3], 'prof.btns'); bx += bws[i] + 10; });
  y += ph + 12;
  if (!pr.posts.length) { ctx.font = '400 14px Roboto'; ctx.fillStyle = P['cd.muted']; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText('No posts yet.', W / 2, y + 24); y += 24 + 17 + 24; }
  G.cards = []; for (const p of pr.posts) { const h = drawCard(ctx, p, x, y, w); G.cards.push({ x, y, w, h }); y += h + P['cd.gap']; }
  ctx.restore();
  G.vMax = Math.max(0, y + sy + 90 - P['cd.gap'] - H);
  // header
  icon(ctx, SI.back, 6 + 12, 6 + 12, 24, '#fff'); hit(6, 6, 48, 48, goFeed, 'prof.head');
  ctx.font = `800 ${P['pf.titleSize']}px Roboto`; ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(P['pf.title'], 6 + 48, 6 + 24); G.profHead = { x: 6, y: 6, w: W - 12, h: 48 };
  if (!mine) { icon(ctx, MI.more, W - 6 - 36, 6 + 12, 24, '#fff'); hit(W - 54, 6, 48, 48, () => { ST.menu = { x: W - 6, y: 46, items: [['Report', '#FFFFFF', () => K.status('In the app this opens the report reasons for this profile.')], ['Block user', '#FF7A7A', () => K.status('In the app this blocks @' + pr.handle + '.')]] }; }, 'prof.head'); }
  if (mine) { const fx0 = W - 16 - 56, fy0 = H - 16 - footprint() - 56; ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = K.shadowBlurFor(ctx, 6); ctx.shadowOffsetY = 3; ctx.fillStyle = YEL; ctx.beginPath(); ctx.roundRect(fx0, fy0, 56, 56, 16); ctx.fill(); ctx.restore(); icon(ctx, PGI.edit, fx0 + 16, fy0 + 16, 24, '#000'); hit(fx0, fy0, 56, 56, () => K.status('In the app this opens the composer (post a saga).'), 'prof.btns'); }
}
function chip(ctx, x, y, ic, label, color) { ctx.font = '800 12px Roboto'; const w = 10 + 15 + (label ? 4 + ctx.measureText(label).width : 0) + 10, h = 27; ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 18); ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.stroke(); icon(ctx, ic, x + 10, y + 6, 15, color); if (label) { ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(label, x + 10 + 15 + 4, y + h / 2); } return w; }
function drawMarket(ctx, W, H) {
  const top = listTop('market'), sy = VS.market, list = P['mk.test'] ? LISTINGS : []; ctx.fillStyle = '#11151C'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.beginPath(); ctx.rect(0, top, W, H - top); ctx.clip(); let y = top + 8 - sy; G.cards = [];
  if (!list.length) { ctx.font = '400 15px Roboto'; ctx.fillStyle = P['cd.muted']; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; wrapText(ctx, P['mk.empty'], W - 48, 4).forEach((l, i) => ctx.fillText(l, W / 2, top + 80 + 24 + i * 15 * 1.17)); y = top; }
  for (const p of list) { const h = drawCard(ctx, p, 12, y, W - 24); G.cards.push({ x: 12, y, w: W - 24, h }); y += h + P['cd.gap']; }
  ctx.restore(); G.vMax = Math.max(0, y + sy + 30 - P['cd.gap'] - H);
  icon(ctx, SI.back, 6 + 12, 8 + 12, 24, '#fff'); hit(6, 8, 48, 48, goFeed, 'mk.head');
  const c = P['mk.chip']; ctx.font = '800 12px Roboto'; const sellW = 10 + 15 + 4 + ctx.measureText('Sell').width + 10, areaW = 10 + 15 + 4 + ctx.measureText(P['lab.area']).width + 10, sx = W - 10 - sellW, ax = sx - 8 - areaW, cy = 8 + 24 - 13.5;
  ctx.font = `900 ${P['mk.titleSize']}px Roboto`; ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(P['mk.title'], 6 + 48, 8 + 24, ax - 6 - 48 - 4);
  chip(ctx, ax, cy, PGI.place, P['lab.area'], c); hit(ax, cy, areaW, 27, () => K.status('In the app this picks your area (county / state / everywhere).'), 'mk.head');
  chip(ctx, sx, cy, PGI.sell, 'Sell', c); hit(sx, cy, sellW, 27, () => K.status('In the app this opens the composer for a sale listing.'), 'mk.head'); G.mkHead = { x: 6, y: 8, w: W - 16, h: 48 };
}
function drawMenu(ctx) { const m = ST.menu; if (!m) return; ctx.font = '400 16px Roboto'; const w = Math.max(112, ...m.items.map(i => ctx.measureText(i[0]).width + 32)), h = m.items.length * 48 + 16, x = clamp(m.x - w, 8, K.W - w - 8), y = clamp(m.y, 8, K.H - h - 8);
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = K.shadowBlurFor(ctx, 8); ctx.shadowOffsetY = 3; ctx.fillStyle = '#202630'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 4); ctx.fill(); ctx.restore();
  m.boxes = m.items.map((it, i) => { const iy = y + 8 + i * 48; ctx.fillStyle = it[1]; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(it[0], x + 16, iy + 24); return { x, y: iy, w, h: 48, fn: it[2] }; }); }
function drawViewer(ctx) { const im = ST.viewer; if (!im) return; ctx.fillStyle = 'rgba(0,0,0,.54)'; ctx.fillRect(0, 0, K.W, K.H); ctx.fillStyle = '#000'; ctx.fillRect(8, 8, K.W - 16, K.H - 16); if (ready(im)) { const s = Math.min((K.W - 16) / im.naturalWidth, (K.H - 16) / im.naturalHeight), w = im.naturalWidth * s, h = im.naturalHeight * s; ctx.drawImage(im, K.W / 2 - w / 2, K.H / 2 - h / 2, w, h); } }
function drawPage(ctx, now) { G.hits = []; const W = K.W, H = K.H; if (ST.view === 'profile') drawProfile(ctx, W, H); else drawMarket(ctx, W, H); drawBar(ctx, now); }

/* ---------- labels ---------- */
const PLACE = new Path2D('M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zM7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 2.88-2.88 7.19-5 9.88C9.92 16.21 7 11.85 7 9zm5 2.5c1.38 0 2.5-1.12 2.5-2.5S13.38 6.5 12 6.5 9.5 7.62 9.5 9s1.12 2.5 2.5 2.5z');
function spaced(ctx, text, x, y, spacing) { let cx = x; for (const ch of text) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + spacing; } return cx - x; }


/* ---------- _scene(): deep space, Webb sky, bent light, rims, streams, faces, holes, labels ---------- */
function drawScene(x, W, sh, mode, horizon = sh) {
  const top = P['strip.orbTop'], sceneH = mode === 'share' ? Math.min(sh, Math.max(180, horizon - P['sh.skyGap'])) : sh;
  const lh = sceneH - top - 5, orbs = orbLayout(W, lh), k = scaleOf(x), through = mode === 'strip' && P['sky.mode'] === 'through';
  if (!through) x.drawImage(deepSpace(W, sh, Math.min(3, k)), 0, 0, W, sh);
  const sky = through ? throughSnap(W, sh) : P['sky.on'] ? skySnap(W, sh) : null; if (sky && !through) x.drawImage(sky, 0, 0, W, sh);
  const lensesLive = orbs.filter(o => o.live).map(o => ({ x: o.x, y: o.y + top, r: o.d / 2, s: o.strength }));
  if (P['lens.on'] && sky && lensesLive.length) { const out = lensLayer(W, sh, lensesLive, sky); if (out) x.drawImage(out, 0, 0, W, sh); }
  x.save(); if (mode === 'share') { x.beginPath(); x.rect(0, 0, W, horizon); x.clip(); }
  drawRims(x, orbs.map(o => ({ x: o.x, y: o.y + top, r: o.d / 2 })));
  drawLinks(x, top);
  for (const o of orbs) { drawOrb(x, o, top); drawName(x, o, top); }
  for (const o of orbs) if (o.live) drawHole(x, o, top);
  x.restore();
  const lab = mode === 'strip' ? G.labels : {};
  x.textBaseline = 'top'; x.textAlign = 'left';
  x.font = `700 ${P['lab.titleSize']}px Roboto`; x.fillStyle = P['lab.titleColor']; const tw = spaced(x, P['lab.title'], 18, 16, 1.6); lab.title = { x: 18, y: 16, w: tw, h: P['lab.titleSize'] * 1.2 };
  x.font = `400 ${P['lab.liveSize']}px Roboto`; x.fillStyle = P['lab.liveColor']; const lw = spaced(x, P['lab.live'], 18, 53, 1.0); lab.live = { x: 18, y: 53, w: lw, h: P['lab.liveSize'] * 1.2 };
  x.font = `400 10px Roboto`; const aw = x.measureText(P['lab.area']).width, ax = W - 12 - aw; x.fillStyle = P['lab.areaColor']; x.fillText(P['lab.area'], ax, 12 + 1); x.save(); x.translate(ax - 3 - 13, 12); x.scale(13 / 24, 13 / 24); x.fillStyle = '#8A9BAD'; x.fill(PLACE); x.restore(); lab.area = { x: ax - 16, y: 12, w: aw + 16, h: 14 };
  return orbs;
}

/* ---------- module ---------- */
const sc = K.screen({
  id: 'sky', title: 'Asgard feed', docId: 'asgard_sky',
  rockContext() { return { page: SH ? 'share' : ST.view === 'market' ? 'swap' : 'home' }; },
  rockNavigate(target) {
    ST.drag = null; ST.viewer = null; ST.menu = null; ST.flight = null;
    if (target === 'market') { SH = null; goMarket(); }
    else if (target === 'share-post') {
      if (SH) return;
      const post = (G.posts || []).find(p => p.bottomBox && p.bottomBox.y > (G.feedTop || 0)) || (G.posts || [])[0] || POSTS[0];
      goFeed(); if (post) openShare(post);
    } else { SH = null; goFeed(); }
  },
  crumb: 'Asgard › Feed (black holes, posts, floating icons) <small>· Asgard Dart</small>',
  docMeta: { widget: 'Asgard', part: 'Live discovery strip (black holes)', source: 'FlutterFlow export 2026-11-19 + live_streams test accounts' },
  startGroup: 'Black holes', startSection: 'Look',
  spec(def) {
    def('Strip', 'Size', 'strip', 'strip.max', 'Tallest strip', 'num', 229, { min: 120, max: 400, step: 1, unit: 'px' });
    def('Strip', 'Size', 'strip', 'strip.share', 'Share of screen height', 'num', .3375, { min: .15, max: .6, step: .0025 });
    def('Strip', 'Size', 'strip', 'strip.fade', 'Fade into the feed', 'num', 26, { min: 0, max: 100, step: 1, unit: 'px' });
    def('Strip', 'Size', 'strip', 'strip.orbTop', 'Holes start below', 'num', 48, { min: 0, max: 120, step: 1, unit: 'px' });
    def('Strip', 'Deep space', 'strip', 'deep.band', 'Milky Way band strength', 'num', 1, { min: 0, max: 4, step: .05, info: 'The painted star sky sits under the Webb photo; turn the photo off (Photo sky) to see these.' });
    def('Strip', 'Deep space', 'strip', 'deep.bandTilt', 'Band angle', 'num', -.52, { min: -1.6, max: 1.6, step: .01, unit: 'rad', info: 'The painted star sky sits under the Webb photo; turn the photo off (Photo sky) to see these.' });
    def('Strip', 'Deep space', 'strip', 'deep.stars', 'Small stars', 'int', 4700, { min: 0, max: 4700, step: 50, info: 'The painted star sky sits under the Webb photo; turn the photo off (Photo sky) to see these.' });
    def('Strip', 'Deep space', 'strip', 'deep.starAlpha', 'Star brightness', 'num', 1, { min: 0, max: 2, step: .05, info: 'The painted star sky sits under the Webb photo; turn the photo off (Photo sky) to see these.' });
    def('Strip', 'Deep space', 'strip', 'deep.bright', 'Bright stars', 'int', 25, { min: 0, max: 25, step: 1, info: 'The painted star sky sits under the Webb photo; turn the photo off (Photo sky) to see these.' });
    def('Strip', 'Deep space', 'strip', 'deep.grains', 'Dust specks', 'int', 1600, { min: 0, max: 1600, step: 50, info: 'The painted star sky sits under the Webb photo; turn the photo off (Photo sky) to see these.' });
    def('Strip', 'Photo sky', 'strip', 'sky.mode', 'Sky behind the black holes', 'select', 'space', { opts: [['space', 'Space (Webb photo, as in the app)'], ['through', 'See-through: your camera / tilt background']], info: 'See-through: the black holes bend whatever is behind the phone, live. Pick the camera or tilt picture in the Background tab.' });
    def('Strip', 'Photo sky', 'strip', 'sky.on', 'Webb deep-field photo', 'bool', true);
    def('Strip', 'Photo sky', 'strip', 'sky.dark', 'Darken photo', 'num', .30, { min: 0, max: 1, step: .01 });
    def('Strip', 'Labels', 'labels', 'lab.title', 'Top label', 'text', 'A S G A R D');
    def('Strip', 'Labels', 'labels', 'lab.titleSize', 'Top label size', 'num', 10, { min: 6, max: 24, step: .5, unit: 'px' });
    def('Strip', 'Labels', 'labels', 'lab.titleColor', 'Top label color', 'color', '#D1DAE7');
    def('Strip', 'Labels', 'labels', 'lab.live', 'Live label', 'text', 'L I V E   D I S C O V E R Y');
    def('Strip', 'Labels', 'labels', 'lab.liveSize', 'Live label size', 'num', 9, { min: 6, max: 20, step: .5, unit: 'px' });
    def('Strip', 'Labels', 'labels', 'lab.liveColor', 'Live label color', 'color', '#93A4B7');
    def('Strip', 'Labels', 'labels', 'lab.area', 'Area', 'text', 'Flagler, FL');
    def('Strip', 'Labels', 'labels', 'lab.areaColor', 'Area color', 'color', '#9DAABA');
    def('Black holes', 'Look', 'holes', 'op.quiet', 'Quiet hole strength', 'num', .92, { min: 0, max: 1, step: .01 });
    def('Black holes', 'Look', 'holes', 'op.glow', 'Glowing ring strength', 'num', .96, { min: 0, max: 1, step: .01 });
    def('Black holes', 'Look', 'holes', 'op.thin', 'Thin disk strength', 'num', .62, { min: 0, max: 1, step: .01 });
    def('Black holes', 'Look', 'holes', 'op.mid', 'Mid disk strength', 'num', .82, { min: 0, max: 1, step: .01 });
    def('Black holes', 'Look', 'holes', 'look.pulse', 'Pulse amount', 'num', .03, { min: 0, max: .5, step: .005 });
    def('Black holes', 'Look', 'holes', 'look.pulseSpeed', 'Pulses per loop', 'num', 12, { min: 0, max: 60, step: 1 });
    def('Black holes', 'Look', 'holes', 'look.tilt', 'Tilt amount', 'num', 1, { min: 0, max: 2, step: .05 });
    def('Black holes', 'Look', 'holes', 'look.hues', 'Own color per disk', 'bool', true);
    def('Black holes', 'Look', 'holes', 'look.warmOn', 'Blue ring warms to gold', 'bool', true);
    def('Black holes', 'Look', 'holes', 'look.warmBase', 'Warmth at 10 viewers', 'num', .4, { min: 0, max: 1, step: .01 });
    def('Black holes', 'Look', 'holes', 'look.warmRange', 'Extra warmth to 150 viewers', 'num', .55, { min: 0, max: 1, step: .01 });
    def('Black holes', 'Look', 'holes', 'look.lit', 'One lit hole (Gargantua)', 'bool', true);
    def('Black holes', 'Disk thinning', 'holes.disk', 'mask.thinSolid', 'Thin disk: solid to', 'num', .38, { min: 0, max: .95, step: .01 });
    def('Black holes', 'Disk thinning', 'holes.disk', 'mask.thinFade', 'Thin disk: gone at', 'num', .66, { min: .05, max: 1, step: .01 });
    def('Black holes', 'Disk thinning', 'holes.disk', 'mask.midSolid', 'Mid disk: solid to', 'num', .55, { min: 0, max: .95, step: .01 });
    def('Black holes', 'Disk thinning', 'holes.disk', 'mask.midFade', 'Mid disk: gone at', 'num', .84, { min: .05, max: 1, step: .01 });
    def('Black holes', 'Who gets what', 'holes', 'th.glow', 'Glow starts at viewers', 'int', 10, { min: 1, max: 1000, step: 1 });
    def('Black holes', 'Who gets what', 'holes', 'th.disk', 'Thin disk at viewers', 'int', 150, { min: 2, max: 5000, step: 5 });
    def('Black holes', 'Who gets what', 'holes', 'th.mid', 'Mid disk at viewers', 'int', 500, { min: 2, max: 10000, step: 10 });
    def('Black holes', 'Who gets what', 'holes', 'th.lit', 'Lit hole at viewers', 'int', 2000, { min: 10, max: 50000, step: 50 });
    def('Black holes', 'Who gets what', 'holes', 'mix.fire', 'Share with disks', 'num', .12, { min: 0, max: 1, step: .01 });
    def('Black holes', 'Who gets what', 'holes', 'mix.glow', 'Share with glowing rings', 'num', .28, { min: 0, max: 1, step: .01 });
    def('Black holes', 'Size', 'holes', 'size.base', 'Normal size (share of width)', 'num', .151, { min: .05, max: .4, step: .001 });
    def('Black holes', 'Size', 'holes', 'size.min', 'Smallest normal size', 'num', 56, { min: 20, max: 120, step: 1, unit: 'px' });
    def('Black holes', 'Size', 'holes', 'size.max', 'Largest normal size', 'num', 66, { min: 20, max: 160, step: 1, unit: 'px' });
    def('Black holes', 'Size', 'holes', 'size.growStart', 'Grows after followers', 'int', 1000, { min: 1, max: 100000, step: 100 });
    def('Black holes', 'Size', 'holes', 'size.growMax', 'Full size at followers', 'int', 1000000, { min: 1000, max: 10000000, step: 10000 });
    def('Black holes', 'Size', 'holes', 'size.growBy', 'Extra size at full', 'num', 2, { min: 0, max: 5, step: .05, unit: '×' });
    def('Black holes', 'Size', 'holes', 'size.growCurve', 'Growth curve', 'num', 1.6, { min: .3, max: 4, step: .05 });
    def('Black holes', 'Bending light', 'lens', 'lens.on', 'Bend the sky around holes', 'bool', true);
    def('Black holes', 'Bending light', 'lens', 'lens.reach', 'Bend reach', 'num', 5.4, { min: 1.2, max: 10, step: .1, unit: '× hole' });
    def('Black holes', 'Bending light', 'lens', 'lens.swirl', 'Swirl', 'num', .5, { min: 0, max: 3, step: .02 });
    def('Black holes', 'Bending light', 'lens', 'lens.grey', 'Grey hole bend', 'num', 1.75, { min: 0, max: 3, step: .01 });
    def('Black holes', 'Bending light', 'lens', 'lens.blue', 'Blue ring bend', 'num', 1.45, { min: 0, max: 3, step: .01 });
    def('Black holes', 'Bending light', 'lens', 'lens.disk', 'Disk bend', 'num', 1.38, { min: 0, max: 3, step: .01 });
    def('Black holes', 'Bending light', 'lens', 'lens.lit', 'Lit hole bend', 'num', 1.55, { min: 0, max: 3, step: .01 });
    def('Black holes', 'Rim arcs', 'lens', 'rim.on', 'Thin rim arcs', 'bool', true);
    def('Black holes', 'Rim arcs', 'lens', 'rim.color1', 'Arc 1 color', 'color', '#7997B8');
    def('Black holes', 'Rim arcs', 'lens', 'rim.alpha1', 'Arc 1 strength', 'num', .13, { min: 0, max: 1, step: .01 });
    def('Black holes', 'Rim arcs', 'lens', 'rim.color2', 'Arc 2 color', 'color', '#B1C7DE');
    def('Black holes', 'Rim arcs', 'lens', 'rim.alpha2', 'Arc 2 strength', 'num', .09, { min: 0, max: 1, step: .01 });
    def('Motion', 'Drift', 'holes', 'move.loop', 'One full drift loop', 'num', 90, { min: 10, max: 600, step: 1, unit: 's' });
    def('Motion', 'Drift', 'holes', 'move.gap', 'Gap between holes', 'num', 12, { min: 0, max: 80, step: 1, unit: 'px' });
    def('Motion', 'Drift', 'holes', 'move.row', 'Row height', 'num', .48, { min: .1, max: .9, step: .01 });
    def('Motion', 'Drift', 'holes', 'move.rowVary', 'Up/down spread', 'num', 23, { min: 0, max: 80, step: 1, unit: 'px' });
    def('Motion', 'Drift', 'holes', 'move.wander', 'Wander', 'num', .55, { min: 0, max: 2, step: .01 });
    def('Motion', 'Drift', 'holes', 'move.keep', 'Most holes shown', 'int', 6, { min: 1, max: 12, step: 1 });
    def('Motion', 'Pairs', 'links', 'pair.reach', 'Pair reach', 'num', 1.5, { min: .5, max: 4, step: .05 });
    def('Motion', 'Pairs', 'links', 'pair.pull', 'Pull together (max)', 'num', 22, { min: 0, max: 80, step: 1, unit: 'px' });
    def('Motion', 'Pairs', 'links', 'pair.swing', 'Swing around each other', 'num', .5, { min: 0, max: 2, step: .01 });
    def('Motion', 'Pairs', 'links', 'pair.minSep', 'Closest allowed', 'num', .78, { min: .2, max: 2, step: .01 });
    def('Motion', 'Matter stream', 'links', 'link.on', 'Stream between close pairs', 'bool', true);
    def('Motion', 'Matter stream', 'links', 'link.strength', 'Stream strength', 'num', 1, { min: 0, max: 3, step: .05 });
    def('Motion', 'Matter stream', 'links', 'link.bend', 'Stream curve', 'num', .22, { min: -1, max: 1, step: .01 });
    def('Motion', 'Matter stream', 'links', 'link.glow', 'Glow color', 'color', '#FFB866');
    def('Motion', 'Matter stream', 'links', 'link.core', 'Core color', 'color', '#FFE2B0');
    def('Motion', 'Matter stream', 'links', 'link.arc', 'Bent-light arc color', 'color', '#DDEBFF');
    def('Motion', 'Matter stream', 'links', 'link.beads', 'Glowing beads', 'int', 7, { min: 0, max: 30, step: 1 });
    def('Motion', 'Matter stream', 'links', 'link.speed', 'Bead speed', 'num', 36, { min: 0, max: 200, step: 1 });
    def('Faces and names', 'Face', 'faces', 'orb.vignette', 'Dark edge on live faces', 'num', 1, { min: 0, max: 2, step: .05 });
    def('Faces and names', 'Face', 'faces', 'orb.border', 'Ring color (not live)', 'color', '#8099AE', { info: 'Only people who are not live get this. Test people › They are live = off to see it.' });
    def('Faces and names', 'Face', 'faces', 'orb.glow', 'Glow color (not live)', 'color', '#547894', { info: 'Only people who are not live get this. Test people › They are live = off to see it.' });
    def('Faces and names', 'Face', 'faces', 'orb.glowAlpha', 'Glow strength (not live)', 'num', .27, { min: 0, max: 1, step: .01, info: 'Only people who are not live get this.' });
    def('Faces and names', 'Name', 'names', 'name.on', 'Show names', 'bool', true);
    def('Faces and names', 'Name', 'names', 'name.size', 'Name size', 'num', 12, { min: 6, max: 24, step: .5, unit: 'px' });
    def('Faces and names', 'Name', 'names', 'name.color', 'Name color', 'color', '#E5EAF1');
    def('Faces and names', 'Name', 'names', 'name.gap', 'Gap under face', 'num', 7, { min: 0, max: 30, step: .5, unit: 'px' });
    def('Faces and names', 'Live badge', 'names', 'badge.on', 'Live badge', 'bool', true);
    def('Faces and names', 'Live badge', 'names', 'badge.text', 'Badge word', 'text', 'ALIVE');
    def('Faces and names', 'Live badge', 'names', 'badge.size', 'Badge text size', 'num', 7, { min: 4, max: 16, step: .5, unit: 'px' });
    def('Faces and names', 'Live badge', 'names', 'badge.color', 'Badge color', 'color', '#8F383E');
    def('Post', 'Page', 'post', 'feed.bg', 'Asgard page color behind everything', 'bool', true, { info: 'Off = see-through background (camera / tilt) instead of the dark page color.' });
    def('Post', 'Page', 'post', 'post.bg', 'Page color', 'color', '#11151C');
    def('Post', 'Page', 'post', 'post.cardA', 'Text-only post color 1', 'color', '#1B2A4A');
    def('Post', 'Page', 'post', 'post.cardB', 'Text-only post color 2', 'color', '#2A1F3D');
    def('Post', 'Page', 'post', 'post.cardSize', 'Text-only post text size', 'num', 22, { min: 12, max: 40, step: .5, unit: 'px' });
    def('Post', 'Page', 'post', 'test.textOnly', 'Show first post as text-only', 'bool', false);
    def('Post', 'Header', 'post.head', 'post.topShade', 'Top shade', 'num', .54, { min: 0, max: 1, step: .01 });
    def('Post', 'Header', 'post.head', 'post.avatar', 'Face size (radius)', 'num', 18, { min: 8, max: 40, step: .5, unit: 'px' });
    def('Post', 'Header', 'post.head', 'post.nameSize', 'Name size', 'num', 14, { min: 8, max: 28, step: .5, unit: 'px' });
    def('Post', 'Header', 'post.head', 'post.subSize', 'Handle line size', 'num', 11, { min: 7, max: 20, step: .5, unit: 'px' });
    def('Post', 'Header', 'post.head', 'post.subAlpha', 'Handle line brightness', 'num', .70, { min: .1, max: 1, step: .01 });
    def('Post', 'Likes row', 'post.bottom', 'post.bottomShade', 'Bottom shade', 'num', .87, { min: 0, max: 1, step: .01 });
    def('Post', 'Likes row', 'post.bottom', 'post.capSize', 'Caption size', 'num', 14, { min: 8, max: 28, step: .5, unit: 'px' });
    def('Post', 'Likes row', 'post.bottom', 'post.likeIcon', 'Heart size', 'num', 26, { min: 12, max: 48, step: .5, unit: 'px' });
    def('Post', 'Likes row', 'post.bottom', 'post.countSize', 'Count size', 'num', 13, { min: 8, max: 24, step: .5, unit: 'px' });
    def('Post', 'Likes row', 'post.bottom', 'post.gap', 'Gap between buttons', 'num', 22, { min: 4, max: 60, step: 1, unit: 'px' });
    def('Post', 'Likes row', 'post.bottom', 'post.liked', 'Liked heart color', 'color', '#FF7A7A', { info: 'Tap a heart on the phone to see it.' });
    def('Post', 'Likes row', 'post.bottom', 'post.lift', 'Ride above the floating icons', 'bool', true);
    def('Bottom icons', 'Layout', 'bar', 'bar.on', 'Show floating icons', 'bool', true);
    def('Bottom icons', 'Layout', 'bar', 'bar.icon', 'Icon size', 'num', 44, { min: 20, max: 80, step: 1, unit: 'px' });
    def('Bottom icons', 'Layout', 'bar', 'bar.height', 'Row height', 'num', 72, { min: 40, max: 140, step: 1, unit: 'px' });
    def('Bottom icons', 'Layout', 'bar', 'bar.side', 'Side gap', 'num', 14, { min: 0, max: 60, step: 1, unit: 'px' });
    def('Bottom icons', 'Layout', 'bar', 'bar.bottom', 'Bottom gap', 'num', 8, { min: 0, max: 60, step: 1, unit: 'px' });
    def('Bottom icons', 'Shadow', 'bar', 'bar.shadowY', 'Shadow drop', 'num', 8, { min: 0, max: 30, step: .5, unit: 'px' });
    def('Bottom icons', 'Shadow', 'bar', 'bar.shadowBlur', 'Shadow softness', 'num', 4, { min: 0, max: 20, step: .5, unit: 'px' });
    def('Bottom icons', 'Shadow', 'bar', 'bar.shadowAlpha', 'Shadow strength', 'num', .6, { min: 0, max: 1, step: .01 });
    def('Bottom icons', 'Labels', 'bar.labels', 'bar.labelSize', 'Label size', 'num', 10, { min: 6, max: 20, step: .5, unit: 'px' });
    def('Bottom icons', 'Labels', 'bar.labels', 'bar.labelColor', 'Label color', 'color', '#FFFFFF');
    def('Bottom icons', 'Labels', 'bar.labels', 'bar.l1', 'Button 1', 'text', 'Wayfinder');
    def('Bottom icons', 'Labels', 'bar.labels', 'bar.l2', 'Button 2', 'text', 'Carve a Saga');
    def('Bottom icons', 'Labels', 'bar.labels', 'bar.l3', 'Button 3', 'text', 'Gjallarhorn');
    def('Bottom icons', 'Labels', 'bar.labels', 'bar.l4', 'Button 4', 'text', 'Raven');
    def('Bottom icons', 'Gjallarhorn', 'bar', 'bar.hornGlow', 'Horn bursting (a saga was sent to you)', 'bool', false);
    def('Bottom icons', 'Gjallarhorn', 'bar', 'bar.hornDot', 'Dot (follow request waiting)', 'bool', false);
    def('Bottom icons', 'Gjallarhorn', 'bar', 'bar.dotColor', 'Dot color', 'color', '#FFC72C');
    def('Black-hole flight', 'Through the Fav 6', 'flight', 'fl.duration', 'Whole cinematic trip', 'num', 3.2, { min: 1.8, max: 8, step: .1, unit: 's' });
    def('Black-hole flight', 'Through the Fav 6', 'flight', 'fl.pass', 'Forward travel through people', 'num', 1, { min: .3, max: 1.4, step: .05 });
    def('Black-hole flight', 'Through the Fav 6', 'flight', 'fl.weave', 'Sideways camera sweep', 'num', 1, { min: 0, max: 2.5, step: .05 });
    def('Black-hole flight', 'Through the Fav 6', 'flight', 'fl.rise', 'Rise from ground into sky', 'num', 3.6, { min: 0, max: 8, step: .1 });
    def('Black-hole flight', 'Through the Fav 6', 'flight', 'fl.gas', 'Illuminated gas strength', 'num', 1.3, { min: 0, max: 3, step: .05 });
    def('Black-hole flight', 'Trip', 'flight', 'fl.posts', 'Their post count (sets trip length)', 'int', 40, { min: 0, max: 1000, step: 10, info: '1.5 s at few posts, 3 s at 1,000 posts. Tap a black hole, or press "Fly into a hole".' });
    def('Black-hole flight', 'Trip', 'flight', 'fl.speed', 'Slow motion', 'num', 1, { min: 1, max: 6, step: .25, unit: '×', info: 'Studio only: stretch the trip to study it.' });
    def('Black-hole flight', 'Trip', 'flight', 'fl.bank', 'Camera bank', 'num', 1, { min: 0, max: 4, step: .05 });
    def('Black-hole flight', 'Trip', 'flight', 'fl.blur', 'Motion blur', 'bool', true);
    def('Black-hole flight', 'Trip', 'flight', 'fl.dust', 'Space dust', 'num', 1, { min: 0, max: 3, step: .05 });
    def('Black-hole flight', 'Trip', 'flight', 'fl.vignette', 'Dark edges at speed', 'num', 1, { min: 0, max: 2, step: .05 });
    def('Black-hole flight', 'Wormhole', 'flight', 'wh.light', 'Light at the far end', 'color', '#BFD7F0');
    def('Black-hole flight', 'Wormhole', 'flight', 'wh.nebula', 'Nebula light on the walls', 'bool', true);
    def('Black-hole flight', 'Wormhole', 'flight', 'wh.nebulaAlpha', 'Nebula strength', 'num', 1, { min: 0, max: 4, step: .05 });
    def('Black-hole flight', 'Wormhole', 'flight', 'wh.dust', 'Rushing dust', 'int', 240, { min: 0, max: 240, step: 10 });
    def('Black-hole flight', 'Wormhole', 'flight', 'wh.streaks', 'Near streaks', 'bool', true);
    def('Black-hole flight', 'Wormhole', 'flight', 'wh.tiles', 'Their pictures on the walls', 'bool', true);
    def('Black-hole flight', 'Wormhole', 'flight', 'wh.tileSize', 'Picture size', 'num', 1, { min: .3, max: 3, step: .05 });
    def('Black-hole flight', 'Arrival', 'flight', 'room.face', 'Face size', 'num', 178, { min: 60, max: 320, step: 1, unit: 'px' });
    def('Black-hole flight', 'Arrival', 'flight', 'room.bgAlpha', 'Face behind everything', 'num', .18, { min: 0, max: 1, step: .01 });
    def('Black-hole flight', 'Arrival', 'flight', 'room.nameSize', 'Name size', 'num', 29, { min: 12, max: 60, step: .5, unit: 'px' });
    def('Black-hole flight', 'Arrival', 'flight', 'room.liveLabel', 'Live label', 'text', 'LIVE CREATOR');
    def('Black-hole flight', 'Arrival', 'flight', 'room.button', 'Button', 'text', 'Enter live stream');
    def('Black-hole flight', 'Arrival', 'flight', 'room.return', 'Return line', 'text', 'Return through the black hole');
    def('Share', 'Play', 'share', 'sh.ms', 'Whole animation', 'int', 2600, { min: 800, max: 8000, step: 50, unit: 'ms', info: 'Tap the paper-plane on a post (or "Share a post") to play it. RETURN goes back.' });
    def('Share', 'Play', 'share', 'sh.slow', 'Slow motion', 'num', 1, { min: 1, max: 8, step: .25, unit: '×', info: 'Studio only: stretch everything to study it.' });
    def('Share', 'Play', 'share', 'sh.hold', 'Hold at a moment', 'bool', false);
    def('Share', 'Play', 'share', 'sh.at', 'Moment', 'num', 1, { min: 0, max: 1, step: .005, info: 'Turn on "Hold at a moment" first. 0 = the tap, 1 = everyone has landed.' });
    def('Share', 'Play', 'share', 'sh.closeMs', 'Return animation', 'int', 700, { min: 100, max: 3000, step: 50, unit: 'ms' });
    def('Share', 'Floor', 'share.floor', 'sh.tilt', 'Lay-down angle', 'num', 74, { min: 20, max: 85, step: .5, unit: '°', dart: '_floorMatrix thMax' });
    def('Share', 'Floor', 'share.floor', 'sh.persp', 'Perspective', 'num', .0007, { min: 0, max: .002, step: .00005 });
    def('Share', 'Floor', 'share.floor', 'sh.widen', 'Widen as it lays down', 'num', .9, { min: 0, max: 3, step: .05 });
    def('Share', 'Floor', 'share.floor', 'sh.tiltSecs', 'Lay-down time', 'num', .75, { min: .1, max: 2.6, step: .05, unit: 's' });
    def('Share', 'Floor', 'share.floor', 'sh.snapFade', 'Screen dissolves in', 'num', .45, { min: .05, max: 2.6, step: .05, unit: 's' });
    def('Share', 'Floor', 'share.floor', 'sh.dim', 'Darken the floor', 'num', .3, { min: 0, max: 1, step: .01 });
    def('Share', 'Floor', 'share.floor', 'sh.tintG', 'Green lift', 'num', 2, { min: 0, max: 80, step: 1 });
    def('Share', 'Floor', 'share.floor', 'sh.tintB', 'Blue lift', 'num', 8, { min: 0, max: 80, step: 1 });
    def('Share', 'Floor', 'share.floor', 'sh.farFade', 'Far edge melts into space', 'num', .12, { min: 0, max: 1, step: .01 });
    def('Share', 'Floor', 'share.floor', 'sh.sideFade', 'Sides melt', 'num', .16, { min: .01, max: .45, step: .01 });
    def('Share', 'Sky', 'share.sky', 'sh.horizon', 'Ground horizon: up / down', 'num', .61, { min: .2, max: .8, step: .005, unit: 'of screen' });
    def('Share', 'Sky', 'share.sky', 'sh.skyGap', 'Space between holes and horizon', 'num', 65, { min: 0, max: 180, step: 1, unit: 'px' });
    def('Share', 'Sky', 'share.sky', 'sh.skyExtra', 'Stars reach below the horizon', 'num', 0, { min: 0, max: .6, step: .01, unit: 'of screen' });
    def('Share', 'Sky', 'share.sky', 'sh.bg', 'Night below the stars', 'color', '#02040A');
    def('Share', 'Sky', 'share.sky', 'sh.horizonLine', 'Horizon line color', 'color', '#E8FBFF');
    def('Share', 'Sky', 'share.sky', 'sh.lineAlpha', 'Horizon line strength', 'num', .6, { min: 0, max: 1, step: .01 });
    def('Share', 'Sky', 'share.sky', 'sh.horizonGlow', 'Horizon glow color', 'color', '#5FD8FF');
    def('Share', 'Figures', 'share.figs', 'sh.count', 'How many favs', 'int', 6, { min: 0, max: 6, step: 1, info: 'Your 6 favs: Freya, Loki, Sif, Tyr, Baldr, Hel (their real figures).' });
    def('Share', 'Figures', 'share.figs', 'sh.size', 'Body size', 'num', .24, { min: .1, max: .6, step: .005, unit: 'of width' });
    def('Share', 'Figures', 'share.figs', 'sh.tall', 'Height to width', 'num', 2.05, { min: 1, max: 3.5, step: .01 });
    def('Share', 'Figures', 'share.figs', 'sh.minScale', 'Smallest far body', 'num', .45, { min: .2, max: 1, step: .01 });
    def('Share', 'Figures', 'share.figs', 'sh.far', 'How far back they stand', 'num', .42, { min: 0, max: 1, step: .01 });
    def('Share', 'Figures', 'share.figs', 'sh.jitter', 'Side scatter', 'num', .18, { min: 0, max: 1, step: .01 });
    def('Share', 'Figures', 'share.figs', 'sh.outline', 'Hologram outline color', 'color', '#5FD8FF');
    def('Share', 'Figures', 'share.figs', 'sh.flicker', 'Hologram flicker', 'bool', true);
    def('Share', 'Figures', 'share.figs', 'sh.pickGlow', 'Picked glow', 'num', .75, { min: 0, max: 1, step: .01, info: 'Tap a figure to pick them.' });
    def('Share', 'Figures', 'share.figs', 'sh.glowColor', 'Picked glow color', 'color', '#FFE7A0');
    def('Share', 'Figures', 'share.figs', 'sh.nameSize', 'Name size', 'num', 13.5, { min: 8, max: 24, step: .5, unit: 'px' });
    def('Share', 'Figures', 'share.figs', 'sh.nameColor', 'Name color', 'color', '#FFFFFF');
    def('Share', 'Turning', 'share.figs', 'sh.spins', 'Most spinning 360', 'int', 2, { min: 0, max: 6, step: 1, info: 'Only people who allow you 360 can spin (Freya). The rest swing.' });
    def('Share', 'Turning', 'share.figs', 'sh.all360', 'Test: everyone with a back photo spins', 'bool', false, { info: 'Studio test: Tyr and Baldr have back photos but have not allowed you 360.' });
    def('Share', 'Turning', 'share.figs', 'sh.still', 'One stands still', 'bool', true);
    def('Share', 'Turning', 'share.figs', 'sh.swing', 'Swing angle', 'num', 60, { min: 0, max: 60, step: 1, unit: '°' });
    def('Share', 'Turning', 'share.figs', 'sh.swingMin', 'One swing takes', 'num', 5.5, { min: 1, max: 20, step: .1, unit: 's' });
    def('Share', 'Turning', 'share.figs', 'sh.spinMin', 'One full turn takes', 'num', 9, { min: 2, max: 30, step: .1, unit: 's' });
    def('Share', 'Beams', 'share.beams', 'sh.beamStart', 'First beam drops at', 'num', .55, { min: 0, max: 2, step: .01, unit: 's' });
    def('Share', 'Beams', 'share.beams', 'sh.beamGap', 'Next beam after', 'num', .17, { min: 0, max: 1, step: .01, unit: 's' });
    def('Share', 'Beams', 'share.beams', 'sh.beamDur', 'Beam lasts', 'num', .5, { min: .1, max: 2, step: .01, unit: 's' });
    def('Share', 'Beams', 'share.beams', 'sh.beamColor', 'Beam color', 'color', '#5FD8FF');
    def('Share', 'Pick list', 'share.sheet', 'sh.sheet', 'Starts this tall', 'num', .13, { min: .1, max: .75, step: .01, unit: 'of screen' });
    def('Share', 'Pick list', 'share.sheet', 'sh.sheetMax', 'Pulls up to', 'num', .75, { min: .1, max: 1, step: .01, unit: 'of screen' });
    def('Share', 'Pick list', 'share.sheet', 'sh.sheetColor', 'Color', 'color', '#101720');
    def('Share', 'Pick list', 'share.sheet', 'sh.sheetTitle', 'Title', 'text', 'PICK WHO GETS IT');
    def('Share', 'Pick list', 'share.sheet', 'sh.hint', 'Swipe hint', 'text', 'swipe to send');
    def('Share', 'Pick list', 'share.sheet', 'sh.hintColor', 'Swipe hint color', 'color', '#BFEFFF');
    def('Share', 'Send panels', 'share.deck', 'sh.deckMs', 'Slide-in time', 'int', 520, { min: 100, max: 2000, step: 20, unit: 'ms', info: 'Pick people, then swipe sideways.' });
    def('Share', 'Send panels', 'share.deck', 'sh.deckBlur', 'Blur behind', 'num', 12, { min: 0, max: 40, step: .5, unit: 'px' });
    def('Share', 'Send panels', 'share.deck', 'sh.panelColor', 'Panel color', 'color', '#5FD8FF');
    def('Share', 'Send panels', 'share.deck', 'sh.hallTitle', 'Group panel', 'text', 'MEAD HALL');
    def('Share', 'Send panels', 'share.deck', 'sh.eachTitle', 'One-by-one panel', 'text', 'LOOSE THE RAVENS');
    def('Share', 'TV off', 'share', 'sh.tvMs', 'Switch-off time', 'int', 700, { min: 100, max: 3000, step: 50, unit: 'ms', info: 'Plays after you tap a panel to send.' });
    def('Share', 'TV off', 'share', 'sh.tvColor', 'Line glow color', 'color', '#5FD8FF');
    def('Share', 'Return button', 'share.ret', 'sh.retText', 'Word', 'text', 'RETURN');
    def('Profile page', 'Who', 'prof.card', 'pf.who', 'Profile to show (studio test)', 'select', 'idun', { opts: [['idun', 'Idun (test account, 1,000,000 followers)'], ['thor', 'Thor (test account)'], ['me', 'You (swad30991)']], info: 'In the app: tap a name on a post, or the A S G A R D label for your own.' });
    def('Profile page', 'Header', 'prof.head', 'pf.title', 'Title', 'text', 'Profile');
    def('Profile page', 'Header', 'prof.head', 'pf.titleSize', 'Title size', 'num', 20, { min: 10, max: 36, step: .5, unit: 'px' });
    def('Profile page', 'Card', 'prof.card', 'pf.panel', 'Card color', 'color', '#202630');
    def('Profile page', 'Card', 'prof.card', 'pf.avatar', 'Photo size (radius)', 'num', 38, { min: 16, max: 80, step: .5, unit: 'px' });
    def('Profile page', 'Card', 'prof.card', 'pf.nameSize', 'Name size', 'num', 20, { min: 10, max: 40, step: .5, unit: 'px' });
    def('Profile page', 'Card', 'prof.card', 'pf.subSize', 'Handle line size', 'num', 13, { min: 8, max: 24, step: .5, unit: 'px' });
    def('Profile page', 'Card', 'prof.card', 'pf.bioSize', 'Bio size', 'num', 14, { min: 8, max: 28, step: .5, unit: 'px' });
    def('Profile page', 'Card', 'prof.card', 'pf.statSize', 'Count size', 'num', 18, { min: 8, max: 36, step: .5, unit: 'px' });
    def('Profile page', 'Card', 'prof.card', 'pf.statLabel', 'Count label size', 'num', 12, { min: 6, max: 24, step: .5, unit: 'px' });
    def('Profile page', 'Buttons', 'prof.btns', 'pf.yellow', 'Button gold', 'color', '#FFC72C');
    def('Profile page', 'Buttons', 'prof.btns', 'pf.edit', 'Edit button (yours)', 'text', 'Edit profile', { info: 'Shows on your own profile: Profile to show = You.' });
    def('Profile page', 'Buttons', 'prof.btns', 'pf.fig', 'Figure button (yours)', 'text', 'My figure', { info: 'Shows on your own profile: Profile to show = You.' });
    def('Post cards', 'Card', 'cards', 'cd.color', 'Card color', 'color', '#202630', { info: 'The cards on profiles and in the Marketplace.' });
    def('Post cards', 'Card', 'cards', 'cd.radius', 'Corner round', 'num', 14, { min: 0, max: 40, step: .5, unit: 'px' });
    def('Post cards', 'Card', 'cards', 'cd.pad', 'Inside padding', 'num', 12, { min: 4, max: 32, step: .5, unit: 'px' });
    def('Post cards', 'Card', 'cards', 'cd.gap', 'Gap between cards', 'num', 12, { min: 0, max: 40, step: .5, unit: 'px' });
    def('Post cards', 'Text', 'cards', 'cd.nameSize', 'Name size', 'num', 14, { min: 8, max: 28, step: .5, unit: 'px' });
    def('Post cards', 'Text', 'cards', 'cd.subSize', 'Handle line size', 'num', 11, { min: 6, max: 20, step: .5, unit: 'px' });
    def('Post cards', 'Text', 'cards', 'cd.bodySize', 'Text size', 'num', 15, { min: 8, max: 30, step: .5, unit: 'px' });
    def('Post cards', 'Text', 'cards', 'cd.muted', 'Grey text color', 'color', '#B8C0CB');
    def('Post cards', 'Pictures', 'cards.img', 'cd.imgOne', 'One picture: height', 'num', 260, { min: 80, max: 600, step: 1, unit: 'px', info: 'Tap a picture to open it full screen.' });
    def('Post cards', 'Pictures', 'cards.img', 'cd.imgMany', 'Several pictures: height', 'num', 170, { min: 60, max: 400, step: 1, unit: 'px', info: 'For posts with more than one picture (none of the test posts have that yet).' });
    def('Post cards', 'Pictures', 'cards.img', 'cd.imgRadius', 'Picture corner round', 'num', 12, { min: 0, max: 40, step: .5, unit: 'px' });
    def('Post cards', 'Likes', 'cards', 'cd.icon', 'Heart size', 'num', 22, { min: 12, max: 40, step: .5, unit: 'px' });
    def('Post cards', 'Likes', 'cards', 'cd.liked', 'Liked heart color', 'color', '#FF7A7A', { info: 'Tap a heart to see it.' });
    def('Marketplace', 'Header', 'mk.head', 'mk.title', 'Title', 'text', 'Marketplace', { info: 'In the app: swipe left on the feed. Swipe right (or the arrow) to go back.' });
    def('Marketplace', 'Header', 'mk.head', 'mk.titleSize', 'Title size', 'num', 22, { min: 10, max: 40, step: .5, unit: 'px' });
    def('Marketplace', 'Header', 'mk.head', 'mk.chip', 'Chip color', 'color', '#FFC72C');
    def('Marketplace', 'Listings', 'mk.list', 'mk.test', 'Test listings (studio only)', 'bool', true, { info: 'Nobody has listed anything yet, so the studio shows 4 test listings from Thor and Idun. Off = what the app shows today.' });
    def('Marketplace', 'Listings', 'mk.list', 'mk.empty', 'Nothing-for-sale text', 'text', 'Nothing for sale nearby yet. Tap Sell to list something.');
    def('Marketplace', 'Sale bar', 'mk.sale', 'mk.p2p', 'Selling is open (p2p_live)', 'bool', false, { info: 'Off today (delivery_fee_rules p2p_live = 0), so buttons say "Opens soon".' });
    def('Marketplace', 'Sale bar', 'mk.sale', 'mk.priceSize', 'Price size', 'num', 22, { min: 10, max: 40, step: .5, unit: 'px' });
    def('Marketplace', 'Sale bar', 'mk.sale', 'mk.btnLabel', 'Buy button', 'text', 'Get it now');
    def('Test people', 'Live test accounts', 'holes', 'test.count', 'How many streaming', 'int', 12, { min: 0, max: 12, step: 1, info: 'Baldr, Saga, Tyr, Vidar… from live_streams, most viewers first.' });
    def('Test people', 'Live test accounts', 'holes', 'test.viewers', 'Viewers ×', 'num', 1, { min: .01, max: 20, step: .01, info: 'Scale everyone\'s viewers to watch holes change stage.' });
    def('Test people', 'Live test accounts', 'holes', 'test.live', 'They are live', 'bool', true);
  },
  toolbar: [
    { label: 'Pause drift', title: 'Stop / start the drift', onclick: () => { ST.paused = !ST.paused; K.status(ST.paused ? 'Drift paused. Drag the strip sideways to move it.' : 'Drift running.'); } },
    { label: 'Re-center', title: 'Clear the swipe offset', onclick: () => { ST.swipe = 0; } },
    { label: 'Share a post', title: 'Play the share animation on the post in view (press again to return)', onclick: () => { if (SH) { closeShare(); return; } const p = (G.posts || []).find(q => q.bottomBox && q.bottomBox.y > (G.feedTop || 0)) || (G.posts || [])[0] || POSTS[0]; openShare(p); } },
    { label: 'Profile', title: 'Open the test profile (Profile page › Who)', onclick: () => { if (ST.view === 'profile') goFeed(); else openProfile({ idun: IDUN_ID, thor: THOR_ID, me: ME_ID }[sc.P['pf.who']] || IDUN_ID); } },
    { label: 'Marketplace', title: 'Open the Marketplace (swipe left on the feed in the app)', onclick: () => { if (ST.view === 'market') goFeed(); else goMarket(); } },
    { label: 'Fly into a hole', title: 'Play the black-hole flight into the hole nearest the middle', onclick: () => { if (ST.flight) { ST.flight = null; return; } const orbs = SH ? SH.orbs || [] : G.orbs; const o = orbs.slice().sort((a, b) => Math.abs(a.x - K.W / 2) - Math.abs(b.x - K.W / 2))[0]; if (o) startFlight(o, SH ? SH.orbTop : G.top); } },
  ],
  onShow() { P = sc.P; },
  onSet(k) { P = sc.P; if (SH && !/^(sh|fl|wh|room)\./.test(k)) SH = null;
    if (k.startsWith('pf.') && (k === 'pf.who' || ST.view !== 'profile')) openProfile({ idun: IDUN_ID, thor: THOR_ID, me: ME_ID }[sc.P['pf.who']] || IDUN_ID);
    if (k === 'pf.edit' || k === 'pf.fig') openProfile(ME_ID);
    if (k.startsWith('cd.') && ST.view === 'feed') openProfile(IDUN_ID); if (k.startsWith('cd.') && !ST.view) openProfile(IDUN_ID);
    if (k.startsWith('mk.') && ST.view !== 'market') goMarket();
    if (!k.startsWith('pf.') && !k.startsWith('cd.') && !k.startsWith('mk.') && ST.view && ST.view !== 'feed' && !k.startsWith('bar.') && !k.startsWith('bg.')) goFeed();
    if (k.startsWith('sh.') && !SH && !ST.flight) { const p = (G.posts || []).find(q => q.bottomBox && q.bottomBox.y > (G.feedTop || 0)) || (G.posts || [])[0] || POSTS[0]; openShare(p); } },
  update(dt) { P = sc.P; if (!ST.flight) shareUpdate(dt); if (ST.flight && ST.flight.dir) { const F = ST.flight; F.t = clamp(F.t + F.dir * dt * 1000 / F.ms, 0, 1); if (F.t >= 1 && F.dir > 0) F.dir = 0; if (F.t <= 0 && F.dir < 0) ST.flight = null; } if (!ST.paused) ST.motion = (ST.motion + dt / Math.max(1, P['move.loop'])) % 1; if (ST.view && ST.view !== 'feed') { if (!ST.drag && ST.vel) { VS[ST.view] = clamp(VS[ST.view] + ST.vel * dt, 0, G.vMax || 0); ST.vel *= Math.pow(.135, dt); if (Math.abs(ST.vel) < 5) ST.vel = 0; } return; } if (!ST.drag && ST.vel) { ST.scroll += ST.vel * dt; ST.vel *= Math.pow(.135, dt); if (Math.abs(ST.vel) < 5) ST.vel = 0; } if (G.maxScroll != null) { if (ST.scroll < 0) { ST.scroll = 0; ST.vel = 0; } if (ST.scroll > G.maxScroll) { ST.scroll = G.maxScroll; ST.vel = 0; } } },
  draw(ctx, now, studio) {
    P = sc.P; sc.ty = 0;
    if (ST.flight) { drawFlight(ctx, now); if (studio) K.hl(ctx, now); return; }
    if (SH && SH.tv <= 0) { drawShare(ctx, now); if (studio) K.hl(ctx, now); return; }
    if (ST.view && ST.view !== 'feed') { drawPage(ctx, now); drawMenu(ctx); drawViewer(ctx); if (studio) K.hl(ctx, now); return; }
    const W = K.W, H = K.H, sh = Math.min(P['strip.max'], H * P['strip.share']), top = P['strip.orbTop'], lh = sh - top - 5;
    G.strip = { x: 0, y: 0, w: W, h: sh };
    if (P['feed.bg']) { const y0 = P['sky.mode'] === 'through' ? sh - P['strip.fade'] : 0; ctx.fillStyle = P['post.bg']; ctx.fillRect(0, y0, W, H - y0); }
    const feedTop = sh - P['strip.fade'], pageH = H - feedTop; G.feedTop = feedTop; G.pageH = pageH; G.maxScroll = Math.max(0, POSTS.length * pageH + footprint() - pageH);
    POSTS[0].pic0 = POSTS[0].pic0 || POSTS[0].pic; POSTS[0].pic = P['test.textOnly'] ? null : POSTS[0].pic0;
    G.posts = [];
    for (let i = 0; i < POSTS.length; i++) { const y = feedTop + i * pageH - ST.scroll; if (y > H || y + pageH < feedTop) continue; drawPost(ctx, POSTS[i], 0, y, W, pageH, feedTop); G.posts.push(POSTS[i]); }
    // strip layer (faded into the feed at the bottom)
    const k = scaleOf(ctx), Lw = Math.ceil(W * k), Lh = Math.ceil(sh * k);
    const L = sc._layer || (sc._layer = document.createElement('canvas')); if (L.width !== Lw || L.height !== Lh) { L.width = Lw; L.height = Lh; }
    const x = L.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.filter = 'none'; x.clearRect(0, 0, Lw, Lh); x.scale(k, k);
    G.orbs = drawScene(x, W, sh, 'strip');
    if (P['strip.fade'] > 0) { x.globalCompositeOperation = 'destination-in'; const g = x.createLinearGradient(0, 0, 0, sh); g.addColorStop(0, '#fff'); g.addColorStop(clamp((sh - P['strip.fade']) / sh, 0, 1), '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, W, sh); x.globalCompositeOperation = 'source-over'; }
    ctx.drawImage(L, 0, 0, Lw, Lh, 0, 0, W, sh);
    G.top = top;
    drawBar(ctx, now);
    if (SH) drawShare(ctx, now);
    drawMenu(ctx); drawViewer(ctx);
    if (studio) K.hl(ctx, now);
  },
  highlight(ctx, base, sub, H1) {
    const W = K.W, top = G.top || 48, box = (b, pad = 3, r = 6) => () => { ctx.beginPath(); ctx.roundRect(b.x - pad, b.y - pad, b.w + pad * 2, b.h + pad * 2, r); };
    if (/^(prof|cards|mk)/.test(base)) { if (base === 'prof.card' && G.profCard) H1(box(G.profCard, -2, 14)); else if (base === 'prof.head' && G.profHead) H1(box(G.profHead, 0, 10)); else if (base === 'mk.head' && G.mkHead) H1(box(G.mkHead, 0, 10)); else if ((base === 'cards' || base === 'mk.list') && G.cards) G.cards.forEach(c => H1(box(c, -2, 14))); else (G.hits || []).filter(h => h.tag === base).forEach(h => H1(box(h, 2, 8))); return; }
    if (base.startsWith('share')) { const S = SH; if (!S) return; const F = S.floor;
      if (base === 'share.floor' && F) H1(() => { const pl = F.plane, a = fx(F.M, pl.x, pl.y), b = fx(F.M, pl.x + pl.w, pl.y), c = fx(F.M, pl.x + pl.w, pl.y + pl.h), d = fx(F.M, pl.x, pl.y + pl.h); ctx.beginPath(); ctx.moveTo(a[0] + 3, a[1] + 3); ctx.lineTo(b[0] - 3, b[1] + 3); ctx.lineTo(c[0] - 3, c[1] - 3); ctx.lineTo(d[0] + 3, d[1] - 3); ctx.closePath(); });
      else if (base === 'share.sky' && F) { H1(() => { ctx.beginPath(); ctx.rect(4, 4, W - 8, F.hz - 8); }); }
      else if (base === 'share.figs') (S.figBoxes || []).forEach(b => H1(box(b, 2, 8)));
      else if (base === 'share.beams') (S.beams || []).forEach(b => H1(() => { ctx.beginPath(); ctx.moveTo(b[0], 4); ctx.lineTo(b[0], b[1]); }));
      else if (base === 'share.sheet' && S.sheetTop != null) H1(box({ x: 0, y: S.sheetTop, w: W, h: K.H - S.sheetTop }, -3, 16));
      else if (base === 'share.deck') { if ((S.boxes || []).length) S.boxes.forEach(b => H1(box(b, 3, 16))); else (S.figBoxes || []).forEach(b => H1(box(b, 2, 8))); }
      else if (base === 'share.ret' && S.ret) H1(box(S.ret, 3, 18));
      else H1(box({ x: 0, y: 0, w: W, h: K.H }, -4, 8));
      return; }
    if (base === 'strip' && G.strip) H1(box(G.strip, -3, 8));
    else if (base === 'labels') Object.values(G.labels).forEach(b => H1(box(b, 3, 4)));
    else if (base === 'holes' || base === 'holes.disk' || base === 'lens') G.orbs.filter(o => base !== 'holes.disk' || o.stage === 2 || o.stage === 3).forEach(o => H1(() => { ctx.beginPath(); ctx.arc(o.x, o.y + top, (base === 'lens' ? o.d / 2 * Math.min(P['lens.reach'], 2.2) : o.d / 2 + 6), 0, TAU); }));
    else if (base === 'links') { ST.links.forEach(l => H1(() => { ctx.beginPath(); ctx.moveTo(l[0], l[1] + top); ctx.lineTo(l[3], l[4] + top); })); if (!ST.links.length) G.orbs.forEach(o => H1(() => { ctx.beginPath(); ctx.arc(o.x, o.y + top, o.d / 2 + 6, 0, TAU); })); }
    else if (base === 'faces') G.orbs.forEach(o => H1(() => { ctx.beginPath(); ctx.arc(o.x, o.y + top, o.d / 2 + 3, 0, TAU); }));
    else if (base === 'names') G.orbs.forEach(o => o.nameBox && H1(box(o.nameBox, 2, 4)));
    else if (base === 'post') (G.posts || []).forEach(p => p.mediaBox && H1(box(p.mediaBox, -2, 4)));
    else if (base === 'post.head') (G.posts || []).forEach(p => p.headBox && H1(box(p.headBox, -2, 4)));
    else if (base === 'post.bottom') (G.posts || []).forEach(p => p.bottomBox && H1(box(p.bottomBox, -2, 4)));
    else if (base === 'bar' && G.bar) (G.barBtns || []).forEach(b => H1(box(b.icon, 3, 10)));
    else if (base === 'bar.labels' && G.barBtns) G.barBtns.forEach(b => H1(box({ x: b.x + 4, y: b.icon.y + b.icon.h + 2, w: b.w - 8, h: P['bar.labelSize'] * 1.3 + 4 }, 1, 4)));
  },
  bounds(base) {
    if (base && /^(prof|cards|mk)/.test(base)) { const W = K.W, sq = (x, y, s) => ({ x: x - s / 2, y: y - s / 2, s }); const first = (G.hits || []).find(h => h.tag === base && h.y > 0 && h.y < K.H); if ((base === 'prof.head' || base === 'mk.head')) return sq(W / 2, 40, W); if (base === 'prof.card' && G.profCard) return sq(W / 2, Math.max(G.profCard.y + 120, W / 2), W); const c = (G.cards || []).find(c => c.y + c.h > 60 && c.y < K.H); if (first && base !== 'cards' && base !== 'mk.list') return sq(first.x + first.w / 2, first.y + first.h / 2, Math.max(W * .6, first.w + 40)); if (c) return sq(W / 2, Math.min(c.y + c.h / 2, K.H - W / 2), W); return sq(W / 2, K.H / 2, W); }
    if (base && base.startsWith('share') && SH) { const W = K.W, H = K.H, S = SH, sq = (x, y, s) => ({ x: x - s / 2, y: y - s / 2, s });
      if (base === 'share.ret' && S.ret) return sq(S.ret.x + S.ret.w / 2 + 40, S.ret.y + 40, 200);
      if (base === 'share.sheet' && S.sheetTop != null) return sq(W / 2, Math.max(S.sheetTop + 60, H - W / 2), W);
      if (base === 'share.deck' && (S.boxes || []).length) return sq(W / 2, S.boxes[0].y + S.boxes[0].h / 2, Math.max(W, S.boxes[0].h + 20));
      if ((base === 'share.figs' || base === 'share.beams') && (S.figBoxes || []).length) { const b = S.figBoxes[S.figBoxes.length - 1]; return sq(b.x + b.w / 2, b.y + b.h / 2, Math.max(b.h * 1.3, 200)); }
      if (base === 'share.sky' && S.floor) return sq(W / 2, S.floor.hz / 2, W);
      return sq(W / 2, H / 2, H); }
    const W = K.W, sh = G.strip ? G.strip.h : 229, top = G.top || 48, sq = (x, y, s) => ({ x: x - s / 2, y: y - s / 2, s });
    const center = G.orbs.slice().sort((a, b) => Math.abs(a.x - W / 2) - Math.abs(b.x - W / 2))[0];
    if (base === 'labels') return sq(W / 2, 40, W * .7);
    if ((base === 'bar' || base === 'bar.labels') && G.bar) return sq(W / 2, G.bar.y + G.bar.h / 2, W);
    if (base === 'post.head' && G.posts && G.posts[0] && G.posts[0].headBox) { const b = G.posts[0].headBox; return sq(W / 2, Math.max(b.y, G.feedTop) + 30, W * .9); }
    if (base === 'post.bottom' && G.posts && G.posts[0] && G.posts[0].bottomBox) { const b = G.posts.find(p => p.bottomBox.y > G.feedTop) || G.posts[0]; return sq(W / 2, b.bottomBox.y + b.bottomBox.h / 2, W); }
    if (center && (base === 'holes' || base === 'holes.disk' || base === 'faces' || base === 'names' || base === 'lens' || base === 'links')) return sq(center.x, center.y + top + 8, Math.max(center.d * 2.6, 150));
    return sq(W / 2, sh / 2, W);
  },
  pick(p) {
    if (ST.view === 'profile' || ST.view === 'market') { const h = (G.hits || []).slice().reverse().find(h => p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h); const map = { 'prof.head': ['Profile page', 'Header'], 'prof.card': ['Profile page', 'Card'], 'prof.btns': ['Profile page', 'Buttons'], 'cards': ['Post cards', 'Card'], 'cards.img': ['Post cards', 'Pictures'], 'mk.head': ['Marketplace', 'Header'], 'mk.sale': ['Marketplace', 'Sale bar'] };
      if (G.bar && p.y >= G.bar.y) return ['Bottom icons', 'Layout']; if (h && map[h.tag]) return map[h.tag]; if (p.y < 60) return ST.view === 'market' ? ['Marketplace', 'Header'] : ['Profile page', 'Header']; if (G.profCard && ST.view === 'profile' && p.y >= G.profCard.y && p.y <= G.profCard.y + G.profCard.h) return ['Profile page', 'Card']; return ['Post cards', 'Card']; }
    if (SH) { const S = SH, inR = r => r && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
      if (inR(S.ret)) return ['Share', 'Return button']; if ((S.boxes || []).some(inR)) return ['Share', 'Send panels']; if (S.sheetTop != null && p.y >= S.sheetTop) return ['Share', 'Pick list'];
      if ((S.figBoxes || []).some(inR)) return ['Share', 'Figures']; if (S.floor && p.y < S.floor.hz) return ['Share', 'Sky']; return ['Share', 'Floor']; }
    const top = G.top || 48;
    for (const o of G.orbs) { if (o.nameBox && p.x >= o.nameBox.x && p.x <= o.nameBox.x + o.nameBox.w && p.y >= o.nameBox.y && p.y <= o.nameBox.y + o.nameBox.h) return ['Faces and names', 'Name']; if (Math.hypot(p.x - o.x, p.y - o.y - top) <= o.d / 2) return ['Faces and names', 'Face']; if (Math.hypot(p.x - o.x, p.y - o.y - top) <= o.d * 1.2) return ['Black holes', 'Look']; }
    if (G.bar && p.y >= G.bar.y && p.y <= G.bar.y + G.bar.h) return ['Bottom icons', 'Layout'];
    if (G.strip && p.y >= G.strip.h) { for (const q of G.posts || []) { if (q.headBox && p.y >= q.headBox.y && p.y <= q.headBox.y + q.headBox.h) return ['Post', 'Header']; if (q.bottomBox && p.y >= q.bottomBox.y && p.y <= q.bottomBox.y + q.bottomBox.h) return ['Post', 'Likes row']; } return ['Post', 'Page']; }
    if (G.strip && p.y < 70) return ['Strip', 'Labels'];
    if (G.strip && p.y < G.strip.h) return ['Strip', 'Deep space'];
    return ['Background', null];
  },
  pointer: {
    down(p) { if (SH && !ST.flight) { sharePointer('down', p); return; } if (ST.viewer || ST.menu) { ST.drag = { mode: ST.viewer ? 'viewer' : 'menu', x0: p.x, y0: p.y }; return; } if (ST.view && ST.view !== 'feed') { ST.vel = 0; ST.drag = { mode: 'page', y: p.y, x0: p.x, y0: p.y, t: performance.now(), t0: performance.now(), v: 0 }; return; } if (ST.flight) { ST.drag = { mode: 'flight', x0: p.x, y0: p.y }; return; } const now = performance.now(); if (G.strip && p.y < G.strip.h - (P['strip.fade'] || 0)) ST.drag = { mode: 'strip', x: p.x, x0: p.x, y0: p.y, t: now, t0: now, v: 0 }; else { ST.vel = 0; ST.drag = { mode: 'feed', y: p.y, x0: p.x, y0: p.y, t: now, t0: now, v: 0 }; } },
    move(p) { if (SH && !ST.flight) { sharePointer('move', p); return; } const d = ST.drag; if (d && d.mode === 'page') { const now = performance.now(), dy = p.y - d.y; VS[ST.view] = clamp(VS[ST.view] - dy, 0, G.vMax || 0); d.v = -dy / Math.max(1, now - d.t) * 1000; d.y = p.y; d.t = now; return; } if (d && (d.mode === 'viewer' || d.mode === 'menu')) return; if (!d) return; const now = performance.now(); if (d.mode === 'strip') { const dx = p.x - d.x; ST.swipe += dx; d.v = dx / Math.max(1, now - d.t) * 1000; d.x = p.x; } else { const dy = p.y - d.y; ST.scroll = clamp(ST.scroll - dy, 0, G.maxScroll || 0); d.v = -dy / Math.max(1, now - d.t) * 1000; d.y = p.y; } d.t = now; },
    up(p) {
      if (SH && !ST.flight) { sharePointer('up', p); return; }
      const d = ST.drag; ST.drag = null; if (!d) return;
      const tap = Math.hypot(p.x - d.x0, p.y - d.y0) < 6, inB = b => b && p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
      const swipeX = () => { const dx = p.x - d.x0, dy = p.y - d.y0; return (performance.now() - (d.t0 || d.t || 0) < 800 && Math.abs(dx) > 110 && Math.abs(dx) > Math.abs(dy) * 2.5) ? dx : 0; };
      if (d.mode === 'viewer') { if (tap) ST.viewer = null; return; }
      if (d.mode === 'menu') { const m = ST.menu; ST.menu = null; if (tap && m && m.boxes) { const b = m.boxes.find(inB); if (b) b.fn(); } return; }
      if (d.mode === 'page') { if (tap) { const h = (G.hits || []).slice().reverse().find(inB); if (h) h.fn(); return; } const sx = swipeX(); if (sx > 0 && ST.view === 'market') { goFeed(); return; } ST.vel = clamp(d.v, -4000, 4000); return; }
      if (d.mode === 'feed' && !tap) { const sx = swipeX(); if (sx < 0) { goMarket(); return; } if (sx > 0) { K.go('home', { href: 'sleipnir-studio-1120.html#home' }); return; } }
      if (d.mode === 'feed' && tap) { const a = (G.posts || []).find(q => inB(q.moreBox) && p.y > (G.feedTop || 0)); if (a) { postMenu(a.moreBox.x + a.moreBox.w, a.moreBox.y + 40, a); return; } const b = (G.posts || []).find(q => inB(q.authorBox) && p.y > (G.feedTop || 0)); if (b) { openProfile(b.author); return; } }
      if (d.mode === 'strip' && tap && inB(G.labels.title && { x: G.labels.title.x - 6, y: G.labels.title.y - 8, w: G.labels.title.w + 12, h: G.labels.title.h + 16 })) { openProfile(ME_ID); return; }
      if (d.mode === 'flight') { const F = ST.flight; if (!F) return; const inR = b => b && p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
        if (F.dir !== 0 && p.y < (K.isMobile ? 100 : 60) && p.y > (K.isMobile ? 50 : 0) && p.x > K.W - 120) { F.t = F.dir > 0 ? 1 : 0; if (F.dir > 0) F.dir = 0; else ST.flight = null; return; }
        if (F.dir === 0 && (inR(F.ret) || (p.y < 60 && p.x < 60))) { F.dir = -1; return; }
        if (F.dir === 0 && inR(F.btn)) { K.status('In the app this enters ' + F.orb.person.name + '’s live stream.'); } return; }
      if (d.mode === 'feed') {
        if (Math.hypot(p.x - d.x0, p.y - d.y0) < 6) { const b = (G.barBtns || []).find(b => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h); if (b) { const i = G.barBtns.indexOf(b); if (i === 0) K.go('way'); else if (i === 2) K.go('horn'); else if (i === 3) K.go('dial', { href: 'sleipnir-studio-1120.html#dial' }); else K.status('Carve a Saga (Post a Saga / Be Alive menu) is not built in the studio yet.'); return; } const q = (G.posts || []).find(q => q.likeBox && p.x >= q.likeBox.x && p.x <= q.likeBox.x + q.likeBox.w && p.y >= q.likeBox.y && p.y <= q.likeBox.y + q.likeBox.h); if (q) { q.liked = !q.liked; q.likes += q.liked ? 1 : -1; return; } const inB = b => b && p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h; const s = (G.posts || []).find(q => inB(q.sendBox)); if (s) { openShare(s); return; } if ((G.posts || []).some(q => inB(q.chatBox))) K.status('Comments are not built in the studio yet.'); return; }
        ST.vel = clamp(d.v, -4000, 4000); return;
      }
      if (Math.abs(p.x - d.x0) < 6) { const top = G.top ?? P['strip.orbTop'], hit = holeAt(p, G.orbs, top); if (hit) startFlight(hit); return; }
      ST.swipe += clamp(d.v, -650, 650) * .14;
    },
    cancel() { ST.drag = null; if (SH) SH.drag = null; },
  },
});
sc.ST = ST; sc.G = () => G; sc.DartRandom = DartRandom; sc.SH = () => SH;
})();
