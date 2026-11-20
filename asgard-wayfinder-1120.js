/* =====================================================================
   WAYFINDER — Vegvisir dial. Screen module for studio-kit-1119.
   Port of _AsWayfinderView + _AsVegvisirPainter from the Asgard custom
   widget (FlutterFlow export 2026-11-19): the turning stave with its 8
   arm marks, ring of ticks, chosen-arm marker, labels, big title, the
   "coming soon" flash, spin with fling + snap, flick up to open.
   ===================================================================== */
(() => {
'use strict';
const K = window.StudioKit;
const { TAU, clamp, rgba, scaleOf } = K;
let P = {};
class DartRandom {
  constructor(seed) { const M = (1n << 64n) - 1n, s64 = v => BigInt.asIntN(64, v); let s = BigInt(seed); s = s64((~s) + (s << 21n)); s = s64(s ^ (s >> 24n)); s = s64((s + (s << 3n)) + (s << 8n)); s = s64(s ^ (s >> 14n)); s = s64((s + (s << 2n)) + (s << 4n)); s = s64(s ^ (s >> 28n)); s = s64(s + (s << 31n)); if (s === 0n) s = 0x5a17n; const u = s & M; this.lo = u & 0xFFFFFFFFn; this.hi = (u >> 32n) & 0xFFFFFFFFn; for (let i = 0; i < 4; i++) this.next(); }
  next() { const st = 0xFFFFDA61n * this.lo + this.hi; this.lo = st & 0xFFFFFFFFn; this.hi = (st >> 32n) & 0xFFFFFFFFn; }
  nextInt(max) { if ((max & -max) === max) { this.next(); return Number(this.lo & BigInt(max - 1)); } let r, res; do { this.next(); r = Number(this.lo); res = r % max; } while (r - res + max > 4294967296); return res; }
  nextDouble() { return (this.nextInt(1 << 26) * 134217728 + this.nextInt(1 << 27)) / 9007199254740992; }
}
const STAR_RAW = (() => { const r = new DartRandom(7), out = []; for (let i = 0; i < 140; i++) out.push([r.nextDouble(), r.nextDouble()]); return out; })();
const ST = { t: 0, rot: -2.5, vel: 0, drag: false, snap: true, target: 0, flash: '', flashAt: -10 };
let G = {};
const names = () => [0, 1, 2, 3, 4, 5, 6, 7].map(i => P['name' + i]);
const selected = () => (((Math.round(ST.rot) % 8) + 8) % 8);

// one stave arm pointing straight up from the inner ring, as polylines
function arm(i, r0, r) {
  const e = -r, s = r * .11, L = [[[0, -r0], [0, -r]]], circle = (cx, cy, rr) => { const pts = []; for (let k = 0; k <= 24; k++) { const a = k / 24 * TAU - Math.PI / 2; pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); } return pts; };
  switch (i % 8) {
    case 0: L.push([[-s, e + s * 1.6], [-s, e + s * .2]], [[s, e + s * 1.6], [s, e + s * .2]], [[-s, e + s * 1.6], [s, e + s * 1.6]]); break;
    case 1: L.push(circle(0, e - s * .55, s * .55), [[-s, e + s * 1.2], [s, e + s * 1.2]]); break;
    case 2: L.push([[-s, e + s * .3], [s, e + s * .3]], [[-s * .7, e + s * 1.3], [s * .7, e + s * 1.3]]); break;
    case 3: L.push([[0, e + s * 1.4], [-s, e]], [[0, e + s * 1.4], [s, e]]); break;
    case 4: L.push([[-s, e + s * .8], [s, e + s * .8]], circle(-s, e + s * .8, s * .28), circle(s, e + s * .8, s * .28)); break;
    case 5: L.push([[-s, e + s * .9], [0, e + s * .1], [s, e + s * .9]], [[-s, e + s * 1.8], [0, e + s], [s, e + s * 1.8]]); break;
    case 6: L.push([[-s, e + s * .2], [s, e + s * .2]], [[-s, e + s * 1.0], [s, e + s * 1.0]], [[-s, e + s * 1.8], [s, e + s * 1.8]]); break;
    default: L.push([[-s, e + s * 1.2], [-s, e + s * .3], [-s * .3, e]], [[s, e + s * 1.2], [s, e + s * .3], [s * .3, e]]);
  }
  return L;
}
// Flutter's Path._part: each contour drawn up to frac of ITS OWN length
function strokePart(ctx, polys, frac) {
  ctx.beginPath();
  for (const q of polys) {
    let len = 0; for (let i = 1; i < q.length; i++) len += Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]);
    let rem = frac >= 1 ? Infinity : len * frac; ctx.moveTo(q[0][0], q[0][1]);
    for (let i = 1; i < q.length; i++) { const d = Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]); if (d >= rem) { const f = rem / d; ctx.lineTo(q[i - 1][0] + (q[i][0] - q[i - 1][0]) * f, q[i - 1][1] + (q[i][1] - q[i - 1][1]) * f); break; } ctx.lineTo(q[i][0], q[i][1]); rem -= d; }
  }
  ctx.stroke();
}
const ringPoly = rr => { const pts = []; for (let k = 0; k <= 96; k++) { const a = k / 96 * TAU; pts.push([rr * Math.cos(a), rr * Math.sin(a)]); } return pts; };
function glowText(ctx, text, x, y, size, weight, spacing, color, glow, glowBlur) {
  ctx.font = `${weight} ${size}px Roboto`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  const chars = [...text]; let w = 0; for (const c of chars) w += ctx.measureText(c).width + spacing; w -= spacing;
  const draw = () => { let cx = x - w / 2; for (const c of chars) { ctx.fillText(c, cx, y); cx += ctx.measureText(c).width + spacing; } };
  ctx.save(); ctx.fillStyle = color; ctx.shadowColor = glow; ctx.shadowBlur = K.shadowBlurFor(ctx, glowBlur); draw(); ctx.restore();
  return { x: x - w / 2, y: y - size * .7, w, h: size * 1.4 };
}

const sc = K.screen({
  id: 'way', title: 'Wayfinder (Vegvisir)', docId: 'asgard_wayfinder',
  crumb: 'Asgard › Wayfinder › Vegvisir dial <small>· Asgard Dart</small>',
  docMeta: { widget: 'Asgard', part: 'Wayfinder (Vegvisir dial)', source: 'FlutterFlow export 2026-11-19' },
  startGroup: 'Stave', startSection: 'Size',
  spec(def) {
    def('Stave', 'Size', 'stave', 'st.size', 'Dial size (share of width)', 'num', .36, { min: .15, max: .5, step: .005 });
    def('Stave', 'Size', 'stave', 'st.sizeH', 'Dial size cap (share of height)', 'num', .27, { min: .1, max: .45, step: .005 });
    def('Stave', 'Size', 'stave', 'st.y', 'Dial height on screen', 'num', .44, { min: .2, max: .8, step: .005 });
    def('Stave', 'Size', 'stave', 'st.inner', 'Inner ring', 'num', .2, { min: .05, max: .6, step: .01, unit: '× size' });
    def('Stave', 'Size', 'stave', 'st.outer', 'Outer ring', 'num', 1.02, { min: .5, max: 1.4, step: .01, unit: '× size' });
    def('Stave', 'Size', 'stave', 'st.armLen', 'Arm length', 'num', .92, { min: .3, max: 1.4, step: .01, unit: '× size' });
    def('Stave', 'Gold', 'stave', 'st.gold', 'Gold lines', 'color', '#F2CF86');
    def('Stave', 'Gold', 'stave', 'st.goldSel', 'Chosen arm color', 'color', '#FFE6AA');
    def('Stave', 'Gold', 'stave', 'st.glow', 'Glow color', 'color', '#F2BE64');
    def('Stave', 'Gold', 'stave', 'st.lineW', 'Line width', 'num', 2.2, { min: .5, max: 8, step: .1, unit: 'px' });
    def('Stave', 'Gold', 'stave', 'st.lineWSel', 'Chosen arm line width', 'num', 2.8, { min: .5, max: 8, step: .1, unit: 'px' });
    def('Stave', 'Gold', 'stave', 'st.glowW', 'Glow width', 'num', 7, { min: 0, max: 30, step: .5, unit: 'px' });
    def('Stave', 'Gold', 'stave', 'st.glowWSel', 'Chosen arm glow width', 'num', 10, { min: 0, max: 30, step: .5, unit: 'px' });
    def('Stave', 'Gold', 'stave', 'st.glowA', 'Glow strength', 'num', .32, { min: 0, max: 1, step: .01 });
    def('Stave', 'Gold', 'stave', 'st.glowASel', 'Chosen arm glow strength', 'num', .7, { min: 0, max: 1, step: .01 });
    def('Stave', 'Gold', 'stave', 'st.flicker', 'Flicker', 'num', .03, { min: 0, max: .3, step: .005 });
    def('Stave', 'Gold', 'stave', 'st.core', 'Centre glow', 'num', .9, { min: 0, max: 1, step: .01 });
    def('Stave', 'Tick ring', 'ticks', 'tk.on', 'Outer tick ring', 'bool', true);
    def('Stave', 'Tick ring', 'ticks', 'tk.count', 'Ticks', 'int', 72, { min: 8, max: 180, step: 1 });
    def('Stave', 'Tick ring', 'ticks', 'tk.alpha', 'Tick strength', 'num', .22, { min: 0, max: 1, step: .01 });
    def('Stave', 'Tick ring', 'ticks', 'tk.speed', 'Turn speed', 'num', .08, { min: -1, max: 1, step: .01, unit: 'rad/s' });
    def('Stave', 'Tick ring', 'ticks', 'tk.long', 'Long tick', 'num', 10, { min: 0, max: 30, step: .5, unit: 'px' });
    def('Stave', 'Tick ring', 'ticks', 'tk.short', 'Short tick', 'num', 4, { min: 0, max: 20, step: .5, unit: 'px' });
    def('Stave', 'Marker', 'marker', 'mk.color', 'Top marker color', 'color', '#49F2E6');
    def('Stave', 'Marker', 'marker', 'mk.size', 'Marker size', 'num', 9, { min: 2, max: 30, step: .5, unit: 'px' });
    def('Labels', 'Arm labels', 'labels', 'lb.dist', 'Distance from centre', 'num', 1.28, { min: .8, max: 2, step: .01, unit: '× size' });
    def('Labels', 'Arm labels', 'labels', 'lb.size', 'Size', 'num', 10.5, { min: 6, max: 24, step: .5, unit: 'px' });
    def('Labels', 'Arm labels', 'labels', 'lb.sizeSel', 'Chosen size', 'num', 12.5, { min: 6, max: 28, step: .5, unit: 'px' });
    def('Labels', 'Arm labels', 'labels', 'lb.spacing', 'Letter spacing', 'num', 2, { min: 0, max: 10, step: .25, unit: 'px' });
    def('Labels', 'Arm labels', 'labels', 'lb.alpha', 'Other labels strength', 'num', .55, { min: 0, max: 1, step: .01 });
    def('Labels', 'Title', 'title', 'tt.size', 'Big title size', 'num', 24, { min: 10, max: 60, step: .5, unit: 'px' });
    def('Labels', 'Title', 'title', 'tt.spacing', 'Big title spacing', 'num', 6, { min: 0, max: 20, step: .5, unit: 'px' });
    def('Labels', 'Title', 'title', 'tt.y', 'Big title below dial', 'num', 1.62, { min: 1, max: 3, step: .01, unit: '× size' });
    def('Labels', 'Title', 'title', 'tt.flashColor', '"Coming soon" flash color', 'color', '#49F2E6');
    for (let i = 0; i < 8; i++) def('Labels', 'Words', 'labels', 'name' + i, 'Arm ' + (i + 1), 'text', ['DISCOVER', 'FOLLOWING', 'TOPICS', 'THINGS', 'SHOP', 'MARKETPLACE', 'EVENTS', 'MY PROFILE'][i]);
    def('Sky', 'Background', 'sky', 'sk.inner', 'Centre color', 'color', '#1A2230');
    def('Sky', 'Background', 'sky', 'sk.mid', 'Middle color', 'color', '#070A10');
    def('Sky', 'Background', 'sky', 'sk.outer', 'Edge color', 'color', '#000000');
    def('Sky', 'Background', 'sky', 'sk.stars', 'Stars', 'int', 140, { min: 0, max: 140, step: 1 });
    def('Sky', 'Background', 'sky', 'sk.starAlpha', 'Star strength', 'num', 1, { min: 0, max: 2, step: .05 });
    def('Feel', 'Spin', 'stave', 'fl.snap', 'Snap speed', 'num', .0012, { min: .00001, max: .2, step: .0001, info: 'Smaller = snaps faster.' });
    def('Feel', 'Spin', 'stave', 'fl.friction', 'Fling slow-down', 'num', .08, { min: .001, max: .9, step: .001, info: 'Smaller = stops sooner.' });
    def('Feel', 'Spin', 'stave', 'fl.fling', 'Fling reach', 'num', .25, { min: 0, max: 1, step: .01 });
    def('Feel', 'Spin', 'stave', 'fl.intro', 'Opening spin time', 'num', .9, { min: .1, max: 3, step: .05, unit: 's' });
  },
  toolbar: [
    { label: 'Replay opening', title: 'Draw the stave again', onclick: () => { ST.t = 0; ST.rot = -2.5; ST.target = 0; ST.snap = true; } },
    { label: 'Next arm', title: 'Turn one arm', onclick: () => { ST.target = Math.round(ST.rot) + 1; ST.snap = true; } },
  ],
  onShow() { P = sc.P; ST.t = 0; ST.rot = -2.5; ST.target = 0; ST.snap = true; },
  update(dt) {
    P = sc.P; ST.t += dt; const now = ST.t, intro = P['fl.intro'];
    if (now < intro) ST.rot = -2.5 + 2.5 * (1 - Math.pow(1 - now / intro, 3));
    else if (!ST.drag) {
      if (ST.snap) { const k = 1 - Math.pow(P['fl.snap'], dt); ST.rot += (ST.target - ST.rot) * k; if (Math.abs(ST.target - ST.rot) < .0005) ST.rot = ST.target; }
      else { ST.rot += ST.vel * dt; ST.vel *= Math.pow(P['fl.friction'], dt); if (Math.abs(ST.vel) < .25) { ST.target = Math.round(ST.rot); ST.snap = true; } }
    }
  },
  draw(ctx, now, studio) {
    P = sc.P; sc.ty = 0; const W = K.W, H = K.H, t = ST.t, r = Math.min(W * P['st.size'], H * P['st.sizeH']), cx = W / 2, cy = H * P['st.y'], ro = ST.rot, sel = selected(), k = scaleOf(ctx), NM = names();
    G = { cx, cy, r };
    // Flutter RadialGradient radius 1.1 is a fraction of the shortest side; centre x=0, y at the dial
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 1.1 * Math.min(W, H)); g.addColorStop(0, P['sk.inner']); g.addColorStop(.55, P['sk.mid']); g.addColorStop(1, P['sk.outer']); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const ns = Math.round(P['sk.stars']);
    for (let i = 0; i < ns; i++) { const a = (.25 + .3 * (.5 + .5 * Math.sin(t * (.7 + (i % 7) * .2) + i))) * P['sk.starAlpha']; ctx.fillStyle = `rgba(220,230,255,${clamp(a, 0, 1)})`; ctx.beginPath(); ctx.arc(STAR_RAW[i][0] * W, STAR_RAW[i][1] * H, i % 9 === 0 ? 1.3 : .8, 0, TAU); ctx.fill(); }
    const draw = clamp(t / .9, 0, 1), flick = 1 - P['st.flicker'] * (7 / 3) + Math.sin(t * 9) * P['st.flicker'];
    if (P['tk.on']) { ctx.save(); ctx.translate(cx, cy); ctx.rotate(-t * P['tk.speed']); ctx.strokeStyle = rgba(P['st.gold'], P['tk.alpha'] * draw); ctx.lineWidth = 1; ctx.beginPath(); const n = Math.round(P['tk.count']); for (let i = 0; i < n; i++) { const a = i * TAU / n, l = i % 9 === 0 ? P['tk.long'] : P['tk.short'], c = Math.cos(a), s = Math.sin(a); ctx.moveTo(c * r * 1.12, s * r * 1.12); ctx.lineTo(c * (r * 1.12 + l), s * (r * 1.12 + l)); } ctx.stroke(); ctx.restore(); }
    ctx.save(); ctx.translate(cx, cy); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const stroke2 = (polys, frac, glowW, glowA, coreW, coreCol) => { ctx.save(); ctx.filter = `blur(${(6 * k).toFixed(2)}px)`; ctx.lineWidth = glowW; ctx.strokeStyle = rgba(P['st.glow'], glowA * flick); strokePart(ctx, polys, frac); ctx.restore(); ctx.lineWidth = coreW; ctx.strokeStyle = coreCol; strokePart(ctx, polys, frac); };
    stroke2([ringPoly(r * P['st.inner']), ringPoly(r * P['st.outer'])], draw, 7, .35, 2.2, rgba(P['st.gold'], .9 * flick));
    for (let i = 0; i < 8; i++) {
      const isSel = i === sel, ad = clamp((t - .1 - i * .05) / .7, 0, 1); if (ad <= 0) continue;
      ctx.save(); ctx.rotate((i - ro) * Math.PI / 4);
      stroke2(arm(i, r * P['st.inner'], r * P['st.armLen']), ad, isSel ? P['st.glowWSel'] : P['st.glowW'], isSel ? P['st.glowASel'] : P['st.glowA'], isSel ? P['st.lineWSel'] : P['st.lineW'], rgba(P['st.goldSel'], (isSel ? 1 : .82) * flick));
      ctx.restore();
    }
    const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, r * .12); cg.addColorStop(0, `rgba(255,240,200,${P['st.core'] * draw})`); cg.addColorStop(1, rgba(P['st.gold'], 0)); ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0, 0, r * .12, 0, TAU); ctx.fill();
    ctx.restore();
    const ms = P['mk.size']; ctx.save(); ctx.filter = `blur(${(1 * k).toFixed(2)}px)`; ctx.fillStyle = rgba(P['mk.color'], .95 * draw); ctx.beginPath(); ctx.moveTo(cx - ms, cy - r * 1.2 - 14); ctx.lineTo(cx + ms, cy - r * 1.2 - 14); ctx.lineTo(cx, cy - r * 1.2 - 2); ctx.closePath(); ctx.fill(); ctx.restore();
    G.marker = { x: cx - ms - 2, y: cy - r * 1.2 - 16, w: ms * 2 + 4, h: 16 };
    G.labels = [];
    const la = clamp((t - .6) / .4, 0, 1);
    for (let i = 0; i < 8; i++) { const ang = (i - ro) * Math.PI / 4 - Math.PI / 2, lx = cx + Math.cos(ang) * r * P['lb.dist'], ly = cy + Math.sin(ang) * r * P['lb.dist'], isSel = i === sel;
      G.labels.push(Object.assign(glowText(ctx, NM[i], lx, ly, isSel ? P['lb.sizeSel'] : P['lb.size'], isSel ? 800 : 600, P['lb.spacing'], isSel ? `rgba(255,236,190,${la})` : rgba(P['st.gold'], P['lb.alpha'] * la), 'rgba(242,207,134,.8)', 8), { i })); }
    const ta = clamp((t - .8) / .4, 0, 1);
    G.title = glowText(ctx, NM[sel], W / 2, cy + r * P['tt.y'], P['tt.size'], 900, P['tt.spacing'], `rgba(255,236,190,${ta})`, 'rgba(242,207,134,.8)', 16);
    const fa = 1 - (t - ST.flashAt) / 1.2;
    if (fa > 0 && ST.flash) glowText(ctx, ST.flash, W / 2, cy + r * P['tt.y'] + 26 + 7, 11, 700, 3, rgba(P['tt.flashColor'], clamp(fa, 0, 1)), 'rgba(0,0,0,0)', 0);
    if (studio) K.hl(ctx, now);
  },
  highlight(ctx, base, sub, H1) {
    const W = K.W, H = K.H, box = (b, pad = 3, r = 6) => () => { ctx.beginPath(); ctx.roundRect(b.x - pad, b.y - pad, b.w + pad * 2, b.h + pad * 2, r); };
    if (base === 'stave') H1(() => { ctx.beginPath(); ctx.arc(G.cx, G.cy, G.r * 1.08, 0, TAU); });
    else if (base === 'ticks') H1(() => { ctx.beginPath(); ctx.arc(G.cx, G.cy, G.r * 1.12 + 12, 0, TAU); });
    else if (base === 'marker' && G.marker) H1(box(G.marker, 3, 4));
    else if (base === 'labels' && G.labels) G.labels.forEach(b => H1(box(b, 3, 4)));
    else if (base === 'title' && G.title) H1(box(G.title, 4, 6));
    else H1(() => { ctx.beginPath(); ctx.rect(4, 4, W - 8, H - 8); });
  },
  bounds(base) {
    const W = K.W, H = K.H, sq = (x, y, s) => ({ x: x - s / 2, y: y - s / 2, s });
    if (base === 'title' && G.title) return sq(W / 2, G.title.y + G.title.h / 2, W * .9);
    if (base === 'marker') return sq(G.cx, G.cy - G.r * 1.2, G.r * 1.2);
    if (base === 'sky') return sq(W / 2, H / 2, W);
    return sq(G.cx, G.cy + G.r * .15, G.r * 3.2);
  },
  pick(p) {
    if (G.title && p.x >= G.title.x && p.x <= G.title.x + G.title.w && p.y >= G.title.y && p.y <= G.title.y + G.title.h) return ['Labels', 'Title'];
    for (const b of G.labels || []) if (p.x >= b.x - 6 && p.x <= b.x + b.w + 6 && p.y >= b.y - 6 && p.y <= b.y + b.h + 6) return ['Labels', 'Arm labels'];
    const d = Math.hypot(p.x - G.cx, p.y - G.cy); if (d <= G.r * 1.05) return ['Stave', 'Size']; if (d <= G.r * 1.25) return ['Stave', 'Tick ring'];
    return ['Sky', 'Background'];
  },
  pointer: {
    down(p) { ST.drag = true; ST.snap = false; ST.vel = 0; ST.lastAng = Math.atan2(p.y - G.cy, p.x - G.cx); ST.down = { x: p.x, y: p.y, t: performance.now() }; ST.last = { x: p.x, y: p.y, t: performance.now() }; },
    move(p) { if (!ST.drag) return; const a = Math.atan2(p.y - G.cy, p.x - G.cx); let da = a - ST.lastAng; if (da > Math.PI) da -= TAU; if (da < -Math.PI) da += TAU; ST.lastAng = a; const steps = -da / (Math.PI / 4); ST.rot += steps; ST.vel = ST.vel * .6 + steps * 60 * .4; const now = performance.now(); ST.v = { x: (p.x - ST.last.x) / Math.max(1, now - ST.last.t) * 1000, y: (p.y - ST.last.y) / Math.max(1, now - ST.last.t) * 1000 }; ST.last = { x: p.x, y: p.y, t: now }; },
    up(p) {
      if (!ST.drag) return; ST.drag = false; const v = ST.v || { x: 0, y: 0 }; ST.v = null;
      const moved = Math.hypot(p.x - ST.down.x, p.y - ST.down.y);
      if (moved < 6) { // tap
        for (const b of G.labels || []) if (Math.hypot(p.x - (b.x + b.w / 2), p.y - (b.y + b.h / 2)) < 42) { if (b.i === selected()) open(b.i); else { let d = ((b.i - ST.rot) % 8 + 8) % 8; if (d > 4) d -= 8; ST.target = Math.round(ST.rot + d); ST.snap = true; } return; }
        if (G.title && p.x >= K.W * .1 && p.x <= K.W * .9 && Math.abs(p.y - (G.title.y + G.title.h / 2)) < 28) open(selected());
        ST.target = Math.round(ST.rot); ST.snap = true; return;
      }
      const fromC = Math.hypot(p.x - G.cx, p.y - G.cy);
      if (v.y < -900 && Math.abs(v.x) < Math.abs(v.y) * .6 && fromC < G.r * 1.4) { ST.target = Math.round(ST.rot); ST.snap = true; open(selected()); return; }
      if (v.y > 1100 && Math.abs(v.x) < Math.abs(v.y) * .5) { ST.target = Math.round(ST.rot); ST.snap = true; K.go('sky'); return; }
      ST.target = Math.round(ST.rot + clamp(ST.vel * P['fl.fling'], -4, 4)); ST.snap = true;
    },
    cancel() { ST.drag = false; ST.snap = true; ST.target = Math.round(ST.rot); },
  },
});
function open(i) { const NM = names(); if (i === 3 || i === 6) { ST.flash = NM[i]; ST.flashAt = ST.t; return; } if (i === 0 || i === 1) { K.go('sky'); return; } K.status(NM[i] + ' is not built in the studio yet. Swipe down to go back to Asgard.'); }
sc.ST = ST; sc.G = () => G;
})();
