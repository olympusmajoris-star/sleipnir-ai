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
const PR = 2; let skyCanvas = null, skyKey = '';
function skySnap(w, h) {
  if (!SKY.complete || !SKY.naturalWidth) return null; const key = w + '|' + h + '|' + P['sky.dark'];
  if (skyKey === key) return skyCanvas;
  const c = document.createElement('canvas'); c.width = Math.round(w * PR); c.height = Math.round(h * PR); const x = c.getContext('2d');
  const iw = SKY.naturalWidth, ih = SKY.naturalHeight, k = Math.max(w / iw, h / ih), sw = w / k, sh = h / k;
  x.scale(PR, PR); x.imageSmoothingQuality = 'high'; x.drawImage(SKY, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, w, h); x.fillStyle = `rgba(0,0,6,${P['sky.dark']})`; x.fillRect(0, 0, w, h);
  skyCanvas = c; skyKey = key; lensTexDirty = true; return c;
}

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
let lensFrame = -1, lensOut = null;
function lensLayer(w, h, lenses, sky) {
  if (glFail || !sky) return null; if (!gl) initGL(); if (glFail) return null;
  const fr = K.frameId ? K.frameId() : performance.now(); if (lensFrame === fr && lensOut) return lensOut; lensFrame = fr;
  const W = Math.round(w * PR), H = Math.round(h * PR); if (glc.width !== W || glc.height !== H) { glc.width = W; glc.height = H; }
  gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  if (lensTexDirty) { gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sky); lensTexDirty = false; }
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
const footprint = () => P['bar.height'] + P['bar.bottom'];
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
  p.headBox = { x, y, w, h: hh };
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
  icon(ctx, MI.chat, ix, mid - 12.5, 25, '#fff'); ix += 25 + 4; ctx.fillText(String(p.comments), ix, mid); ix += ctx.measureText(String(p.comments)).width + P['post.gap'];
  icon(ctx, MI.send, ix, mid - 12, 24, '#fff');
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
  const diag = Math.hypot(W, H), cam = flightCam(F, q, W, H), prev = flightCam(F, Math.max(0, q - .02), W, H);
  const vel = [(cam.c[0] - prev.c[0]) * cam.s, (cam.c[1] - prev.c[1]) * cam.s]; let speed = clamp(Math.hypot(vel[0], vel[1]) / (diag * .12), 0, 1); speed = Math.max(speed, clamp(((cam.s / prev.s) - 1) * 3, 0, 1));
  const rot = clamp(-vel[0] / (diag * .9), -.07, .07) * (1 - smooth((q - .8) / .2)) * P['fl.bank'];
  const rel = [(F.target[0] - cam.c[0]) * cam.s, (F.target[1] - cam.c[1]) * cam.s], focus = [W / 2 + rel[0] * Math.cos(rot) - rel[1] * Math.sin(rot), H / 2 + rel[0] * Math.sin(rot) + rel[1] * Math.cos(rot)];
  const spaceIn = clamp((q - .42) / .58, 0, 1), travel = 2.4 * Math.pow(spaceIn, 1.7), black = smooth((q - .84) / .16);
  flightWorld(ctx, F, cam, rot, W, H, smooth((q - .4) / .25), 1);
  if (P['fl.blur'] && speed > .12 && q > .02) for (let g = 1; g <= 2; g++) flightWorld(ctx, F, flightCam(F, Math.max(0, q - .016 * g), W, H), rot, W, H, 0, clamp((g === 1 ? .2 : .1) * speed, 0, 1));
  const alpha = smooth((q - .42) / .22) * (1 - black) * P['fl.dust'];
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
  if (F.dir !== 0) { ctx.font = '400 12px Roboto'; ctx.fillStyle = '#C7D5E2'; ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillText('Skip effect', W - 12 - 8, 10 + 14); }
}
function startFlight(o) {
  const W = K.W, H = K.H, top = G.top || 48;
  // freeze exactly what is on screen (the flight starts from it)
  const snap = document.createElement('canvas'); snap.width = Math.round(W * 2.5); snap.height = Math.round(H * 2.5); const sx = snap.getContext('2d'); sx.scale(2.5, 2.5);
  const keepHL = true; ST.flight = null; sc.draw(sx, performance.now(), false);
  const posts = Math.round(P['fl.posts']), ms = clamp(Math.round(1500 + 1500 * Math.min(1, posts / 1000)), 1500, 3000) * P['fl.speed'];
  const slots = Math.round(ms / 1000 * 14), walls = POSTS.map(p => p.pic0 || p.pic).filter(Boolean).slice(0, slots); walls.push(o.person.pic);
  const flyMs = Math.min(1000, Math.max(650, ms * .42)), tailMs = Math.min(600, Math.max(320, ms * .22));
  ST.flight = { orb: Object.assign({}, o), top, target: [o.x, o.y + top], holeD: o.d, snap, walls, ms, flyEnd: flyMs / ms, tunnelEnd: 1 - tailMs / ms, t: 0, dir: 1 };
  K.status('Flying into ' + o.person.name + '’s black hole. Tap "Return through the black hole" to come back.');
}

/* ---------- labels ---------- */
const PLACE = new Path2D('M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zM7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 2.88-2.88 7.19-5 9.88C9.92 16.21 7 11.85 7 9zm5 2.5c1.38 0 2.5-1.12 2.5-2.5S13.38 6.5 12 6.5 9.5 7.62 9.5 9s1.12 2.5 2.5 2.5z');
function spaced(ctx, text, x, y, spacing) { let cx = x; for (const ch of text) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + spacing; } return cx - x; }

/* ---------- module ---------- */
const sc = K.screen({
  id: 'sky', title: 'Asgard feed', docId: 'asgard_sky',
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
    def('Test people', 'Live test accounts', 'holes', 'test.count', 'How many streaming', 'int', 12, { min: 0, max: 12, step: 1, info: 'Baldr, Saga, Tyr, Vidar… from live_streams, most viewers first.' });
    def('Test people', 'Live test accounts', 'holes', 'test.viewers', 'Viewers ×', 'num', 1, { min: .01, max: 20, step: .01, info: 'Scale everyone\'s viewers to watch holes change stage.' });
    def('Test people', 'Live test accounts', 'holes', 'test.live', 'They are live', 'bool', true);
  },
  toolbar: [
    { label: 'Pause drift', title: 'Stop / start the drift', onclick: () => { ST.paused = !ST.paused; K.status(ST.paused ? 'Drift paused. Drag the strip sideways to move it.' : 'Drift running.'); } },
    { label: 'Re-center', title: 'Clear the swipe offset', onclick: () => { ST.swipe = 0; } },
    { label: 'Fly into a hole', title: 'Play the black-hole flight into the hole nearest the middle', onclick: () => { if (ST.flight) { ST.flight = null; return; } const o = G.orbs.slice().sort((a, b) => Math.abs(a.x - K.W / 2) - Math.abs(b.x - K.W / 2))[0]; if (o) startFlight(o); } },
  ],
  onShow() { P = sc.P; },
  update(dt) { P = sc.P; if (ST.flight && ST.flight.dir) { const F = ST.flight; F.t = clamp(F.t + F.dir * dt * 1000 / F.ms, 0, 1); if (F.t >= 1 && F.dir > 0) F.dir = 0; if (F.t <= 0 && F.dir < 0) ST.flight = null; } if (!ST.paused) ST.motion = (ST.motion + dt / Math.max(1, P['move.loop'])) % 1; if (!ST.drag && ST.vel) { ST.scroll += ST.vel * dt; ST.vel *= Math.pow(.135, dt); if (Math.abs(ST.vel) < 5) ST.vel = 0; } if (G.maxScroll != null) { if (ST.scroll < 0) { ST.scroll = 0; ST.vel = 0; } if (ST.scroll > G.maxScroll) { ST.scroll = G.maxScroll; ST.vel = 0; } } },
  draw(ctx, now, studio) {
    P = sc.P; sc.ty = 0;
    if (ST.flight) { drawFlight(ctx, now); if (studio) K.hl(ctx, now); return; }
    const W = K.W, H = K.H, sh = Math.min(P['strip.max'], H * P['strip.share']), top = P['strip.orbTop'], lh = sh - top - 5;
    G.strip = { x: 0, y: 0, w: W, h: sh };
    if (P['feed.bg']) { ctx.fillStyle = P['post.bg']; ctx.fillRect(0, 0, W, H); }
    const feedTop = sh - P['strip.fade'], pageH = H - feedTop; G.feedTop = feedTop; G.pageH = pageH; G.maxScroll = Math.max(0, POSTS.length * pageH + footprint() - pageH);
    POSTS[0].pic0 = POSTS[0].pic0 || POSTS[0].pic; POSTS[0].pic = P['test.textOnly'] ? null : POSTS[0].pic0;
    G.posts = [];
    for (let i = 0; i < POSTS.length; i++) { const y = feedTop + i * pageH - ST.scroll; if (y > H || y + pageH < feedTop) continue; drawPost(ctx, POSTS[i], 0, y, W, pageH, feedTop); G.posts.push(POSTS[i]); }
    const orbs = orbLayout(W, lh); G.orbs = orbs;
    // strip layer (faded into the feed at the bottom)
    const k = scaleOf(ctx), Lw = Math.ceil(W * k), Lh = Math.ceil(sh * k);
    const L = sc._layer || (sc._layer = document.createElement('canvas')); if (L.width !== Lw || L.height !== Lh) { L.width = Lw; L.height = Lh; }
    const x = L.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.filter = 'none'; x.clearRect(0, 0, Lw, Lh); x.scale(k, k);
    x.drawImage(deepSpace(W, sh, Math.min(3, k)), 0, 0, W, sh);
    const sky = P['sky.on'] ? skySnap(W, sh) : null; if (sky) x.drawImage(sky, 0, 0, W, sh);
    const lensesLive = orbs.filter(o => o.live).map(o => ({ x: o.x, y: o.y + top, r: o.d / 2, s: o.strength }));
    if (P['lens.on'] && sky && lensesLive.length) { const out = lensLayer(W, sh, lensesLive, sky); if (out) x.drawImage(out, 0, 0, W, sh); }
    drawRims(x, orbs.map(o => ({ x: o.x, y: o.y + top, r: o.d / 2 })));
    drawLinks(x, top);
    for (const o of orbs) { drawOrb(x, o, top); drawName(x, o, top); }
    for (const o of orbs) if (o.live) drawHole(x, o, top);
    // labels
    x.textBaseline = 'top'; x.textAlign = 'left';
    x.font = `700 ${P['lab.titleSize']}px Roboto`; x.fillStyle = P['lab.titleColor']; const tw = spaced(x, P['lab.title'], 18, 16, 1.6); G.labels.title = { x: 18, y: 16, w: tw, h: P['lab.titleSize'] * 1.2 };
    x.font = `400 ${P['lab.liveSize']}px Roboto`; x.fillStyle = P['lab.liveColor']; const lw = spaced(x, P['lab.live'], 18, 53, 1.0); G.labels.live = { x: 18, y: 53, w: lw, h: P['lab.liveSize'] * 1.2 };
    x.font = `400 10px Roboto`; const aw = x.measureText(P['lab.area']).width, ax = W - 12 - aw; x.fillStyle = P['lab.areaColor']; x.fillText(P['lab.area'], ax, 12 + 1); x.save(); x.translate(ax - 3 - 13, 12); x.scale(13 / 24, 13 / 24); x.fillStyle = '#8A9BAD'; x.fill(PLACE); x.restore(); G.labels.area = { x: ax - 16, y: 12, w: aw + 16, h: 14 };
    if (P['strip.fade'] > 0) { x.globalCompositeOperation = 'destination-in'; const g = x.createLinearGradient(0, 0, 0, sh); g.addColorStop(0, '#fff'); g.addColorStop(clamp((sh - P['strip.fade']) / sh, 0, 1), '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, W, sh); x.globalCompositeOperation = 'source-over'; }
    ctx.drawImage(L, 0, 0, Lw, Lh, 0, 0, W, sh);
    G.top = top;
    drawBar(ctx, now);
    if (studio) K.hl(ctx, now);
  },
  highlight(ctx, base, sub, H1) {
    const W = K.W, top = G.top || 48, box = (b, pad = 3, r = 6) => () => { ctx.beginPath(); ctx.roundRect(b.x - pad, b.y - pad, b.w + pad * 2, b.h + pad * 2, r); };
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
    const top = G.top || 48;
    for (const o of G.orbs) { if (o.nameBox && p.x >= o.nameBox.x && p.x <= o.nameBox.x + o.nameBox.w && p.y >= o.nameBox.y && p.y <= o.nameBox.y + o.nameBox.h) return ['Faces and names', 'Name']; if (Math.hypot(p.x - o.x, p.y - o.y - top) <= o.d / 2) return ['Faces and names', 'Face']; if (Math.hypot(p.x - o.x, p.y - o.y - top) <= o.d * 1.2) return ['Black holes', 'Look']; }
    if (G.bar && p.y >= G.bar.y && p.y <= G.bar.y + G.bar.h) return ['Bottom icons', 'Layout'];
    if (G.strip && p.y >= G.strip.h) { for (const q of G.posts || []) { if (q.headBox && p.y >= q.headBox.y && p.y <= q.headBox.y + q.headBox.h) return ['Post', 'Header']; if (q.bottomBox && p.y >= q.bottomBox.y && p.y <= q.bottomBox.y + q.bottomBox.h) return ['Post', 'Likes row']; } return ['Post', 'Page']; }
    if (G.strip && p.y < 70) return ['Strip', 'Labels'];
    if (G.strip && p.y < G.strip.h) return ['Strip', 'Deep space'];
    return ['Background', null];
  },
  pointer: {
    down(p) { if (ST.flight) { ST.drag = { mode: 'flight', x0: p.x, y0: p.y }; return; } const now = performance.now(); if (G.strip && p.y < G.strip.h - (P['strip.fade'] || 0)) ST.drag = { mode: 'strip', x: p.x, x0: p.x, y0: p.y, t: now, v: 0 }; else { ST.vel = 0; ST.drag = { mode: 'feed', y: p.y, x0: p.x, y0: p.y, t: now, v: 0 }; } },
    move(p) { const d = ST.drag; if (!d) return; const now = performance.now(); if (d.mode === 'strip') { const dx = p.x - d.x; ST.swipe += dx; d.v = dx / Math.max(1, now - d.t) * 1000; d.x = p.x; } else { const dy = p.y - d.y; ST.scroll = clamp(ST.scroll - dy, 0, G.maxScroll || 0); d.v = -dy / Math.max(1, now - d.t) * 1000; d.y = p.y; } d.t = now; },
    up(p) {
      const d = ST.drag; ST.drag = null; if (!d) return;
      if (d.mode === 'flight') { const F = ST.flight; if (!F) return; const inR = b => b && p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
        if (F.dir !== 0 && p.y < 60 && p.x > K.W - 120) { F.t = F.dir > 0 ? 1 : 0; if (F.dir > 0) F.dir = 0; else ST.flight = null; return; }
        if (F.dir === 0 && (inR(F.ret) || (p.y < 60 && p.x < 60))) { F.dir = -1; return; }
        if (F.dir === 0 && inR(F.btn)) { K.status('In the app this enters ' + F.orb.person.name + '’s live stream.'); } return; }
      if (d.mode === 'feed') {
        if (Math.hypot(p.x - d.x0, p.y - d.y0) < 6) { const b = (G.barBtns || []).find(b => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h); if (b) { K.status(b.label + ': opens its page in the app.'); return; } const q = (G.posts || []).find(q => q.likeBox && p.x >= q.likeBox.x && p.x <= q.likeBox.x + q.likeBox.w && p.y >= q.likeBox.y && p.y <= q.likeBox.y + q.likeBox.h); if (q) { q.liked = !q.liked; q.likes += q.liked ? 1 : -1; } return; }
        ST.vel = clamp(d.v, -4000, 4000); return;
      }
      if (Math.abs(p.x - d.x0) < 6) { const top = G.top || 48, hit = G.orbs.find(o => Math.hypot(p.x - o.x, p.y - o.y - top) <= o.d / 2 + 6); if (hit) startFlight(hit); return; }
      ST.swipe += clamp(d.v, -650, 650) * .14;
    },
    cancel() { ST.drag = null; },
  },
});
sc.ST = ST; sc.G = () => G; sc.DartRandom = DartRandom;
})();
