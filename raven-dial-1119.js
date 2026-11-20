/* =====================================================================
   RAVEN DIAL — screen module for studio-kit-1119.
   Faithful canvas port of the dial in the AsgardRaven custom widget
   (FlutterFlow export 2026-11-19; dial code identical to v60):
   _RvDialOverlayState, _RvDialMetrics, _RvTropicalGlassPainter,
   _RvDialRingPainter, _RvDialPointerPainter, _RvOptionPainter.
   Every number those painters use is a control. Defaults = the Dart.
   ===================================================================== */
(() => {
'use strict';
const K = window.StudioKit;
const { TAU, D2R, clamp, ease, wrap, rgb, rgba, mix, WHITE, scaleOf, blur, arc } = K;
let P = {};
const shapeMotion = [];
function motionSettings(i) {
  const keys = ['spinOn','period','dir','start','axis','axisX','axisY','axisZ','response','tilt','yaw','roll'];
  return Object.fromEntries(keys.map(k => [k, P['s' + i + '.' + k]]));
}
function motionState(i) { return shapeMotion[i] || (shapeMotion[i] = window.RavenMotion.create(motionSettings(i))); }
// The 4 glass shapes
const SHAPES = [
  { tab: 'Messages', kind: 'Sphere', pos: [-1.5, -204], color: '#169EFF', period: 22, start: 11.459, icon: .84, iconY: 0 },
  { tab: 'People', kind: 'Triangle', pos: [128, -157.5], color: '#887CFF', period: 24, start: -14.324, icon: .78, iconY: .065 },
  { tab: 'Calls', kind: 'Cube', pos: [109.5, 189.5], color: '#45DACA', period: 20, start: 20.054, icon: .84, iconY: 0 },
  { tab: 'Groups', kind: 'Hexagon', pos: [-126.5, 147.5], color: '#FFAC78', period: 23, start: -8.594, icon: .84, iconY: 0 },
];

const ST = { angle: 0, hi: 0, ready: true, armed: false, confirmed: false, grab: false, insideTap: false, didTurn: false, active: null, prevA: null, travel: 0, drift: 0, origin: { x: 0, y: 0 }, grabAngle: 0, grabMode: 0, wasReady: false, idle: true, spin: 0, amb: 0, wob: 0, lastDetent: 0, closing: false, rise: { v: 0, mode: 'fwd', t0: performance.now(), from: 1 }, turn: { on: false, from: 0, to: 0, t0: 0 }, chose: null, dis: -1, disStay: false };
let G = {};
function annulus(c, inner, outer) { const p = new Path2D(); p.arc(c.x, c.y, outer, 0, TAU); p.moveTo(c.x + inner, c.y); p.arc(c.x, c.y, inner, 0, TAU); return p; }
/* ---------- geometry ---------- */
function metrics() {
  const W = K.W, H = K.H;
  const glassTop = H * P['glass.top'];
  const glassBottom = Math.max(glassTop + 1, H - 8);
  const available = Math.max(1, glassBottom - glassTop - 32);
  const unit = clamp(Math.min((W - 38) / 340, available / 505), .1, 1.25);
  const minY = glassTop + 250 * unit + 8, maxY = glassBottom - 248 * unit - 8;
  const mid = (glassTop + glassBottom) / 2;
  const cy = (maxY < minY ? mid : clamp(mid, minY, maxY)) + P['dial.y'] * unit;
  const cx = W / 2 + P['dial.x'] * unit;
  const m = { unit, glassTop, glassBottom, glassLeft: P['glass.side'], glassRight: W - P['glass.side'], cx, cy, radius: P['dial.size'] * unit, thickness: P['dial.thickness'] * unit };
  m.st = SHAPES.map((_, i) => ({ x: cx + P['s' + i + '.x'] * unit, y: cy + P['s' + i + '.y'] * unit, size: P['s' + i + '.size'] * unit }));
  m.angles = SHAPES.map((_, i) => Math.atan2(P['s' + i + '.y'], P['s' + i + '.x']));
  return m;
}
function nearest(m, a) { let best = 0, dist = Infinity; m.angles.forEach((x, i) => { const d = Math.abs(wrap(a - x)); if (d < dist) { dist = d; best = i; } }); return best; }
function alignment(m, a, i) { const d = Math.abs(wrap(a - m.angles[i])); const t = clamp(1 - d / (P['feel.alignZone'] * D2R), 0, 1); return t * t * (3 - 2 * t); }
function headingColor(m, a) {
  const n = m.angles.length;
  for (let i = 0; i < n; i++) {
    const nx = (i + 1) % n;
    const span = ((m.angles[nx] - m.angles[i]) % TAU + TAU) % TAU;
    const travel = ((a - m.angles[i]) % TAU + TAU) % TAU;
    if (travel <= span) { const f = travel / span, t = f * f * (3 - 2 * f); return mix(P['s' + i + '.color'], P['s' + nx + '.color'], t); }
  }
  return rgb(P['s' + nearest(m, a) + '.color']);
}
function ringPoint(c, lx, ly, a) { return { x: c.x + lx * Math.cos(a) - ly * Math.sin(a), y: c.y + lx * Math.sin(a) + ly * Math.cos(a) }; }
function pose() {
  if (!P['wobble.on']) return [1, 0, 0, 1];
  const w = ST.wob;
  const ax = P['wobble.x'] * D2R * Math.sin(w * .50), ay = P['wobble.y'] * D2R * Math.cos(w * .385), az = P['wobble.z'] * D2R * Math.sin(w * .25);
  const cx = Math.cos(ax), sx = Math.sin(ax), cy = Math.cos(ay), sy = Math.sin(ay), cz = Math.cos(az), sz = Math.sin(az);
  return [cy * cz, cx * sz + sx * sy * cz, -cy * sz, cx * cz - sx * sy * sz]; // a,b,c,d of Rx·Ry·Rz
}


/* ---------- glass panel (_RvTropicalGlassPainter) ---------- */
function drawGlass(ctx, m, t) {
  if (!P['glass.on']) return;
  const L = m.glassLeft, T = m.glassTop, R = m.glassRight, B = m.glassBottom, w = R - L;
  const pale = P['ring.pale'], blue = P['ring.blue'], e = P['glass.edge'];
  const g = ctx.createLinearGradient(L, T, R, B);
  g.addColorStop(0, rgba(pale, .32 * t * e)); g.addColorStop(.5, rgba(blue, .035 * t * e)); g.addColorStop(1, rgba(blue, .12 * t * e));
  ctx.save(); ctx.lineWidth = P['glass.width']; ctx.strokeStyle = g;
  ctx.beginPath(); ctx.roundRect(L, T, w, B - T, Math.min(P['glass.round'], w / 2, (B - T) / 2)); ctx.stroke();
  ctx.lineWidth = .8; ctx.strokeStyle = rgba(pale, .38 * t * P['glass.shine']);
  ctx.beginPath(); ctx.moveTo(L + 22, T + 1); ctx.lineTo(L + w * P['glass.shineLen'], T + 1); ctx.stroke(); ctx.restore();
}

/* ---------- ring (_RvDialRingPainter) ---------- */
function bandList(m, phase) {
  const u = m.thickness / 32, out = [];
  for (let k = 0; k < 3; k++) out.push({ rr: m.radius + (k - 1) * P['bands.gap'] * u, start: phase + P['bands.start' + (k + 1)] * D2R, sweep: P['bands.len' + (k + 1)] * D2R });
  return out;
}
function drawRing(ctx, m, reveal) {
  const u = m.thickness / 32, t = ease(clamp(reveal, 0, 1)); if (t <= 0) return;
  const c = { x: m.cx, y: m.cy }, radius = m.radius;
  const phase = ST.angle + ST.spin;
  const rear = { x: c.x + P['depth.x'] * u, y: c.y + P['depth.y'] * u };
  const blue = P['ring.blue'], pale = P['ring.pale'];
  const A = (p, r, s, sw, w, col, a, glow) => arc(ctx, p, r, s, sw * t, w * u, col, a * t, (glow || 0) * u);
  if (P['contours.on']) for (const d of [-1, 1]) {
    const rr = radius + d * P['contours.offset'] * u, gap = P['contours.backGap'] * D2R;
    A(rear, rr, phase + gap / 2, TAU - gap, P['contours.backWidth'], blue, P['contours.backOpacity']);
    A(c, rr, 0, TAU, P['contours.frontWidth'], blue, P['contours.frontOpacity']);
  }
  const bands = bandList(m, phase);
  for (const b of bands) {
    const { rr, start, sweep } = b;
    if (P['bands.on']) {
      A(c, rr, start, sweep, P['bands.width'], blue, P['bands.glowOpacity'], P['bands.glow']);
      A(c, rr, start, sweep, P['bands.bodyWidth'], blue, P['bands.bodyOpacity']);
    }
    if (P['edges.on']) {
      A(c, rr - P['edges.offset'] * u, start, sweep, P['edges.innerWidth'], pale, P['edges.innerOpacity']);
      A(c, rr + P['edges.offset'] * u, start, sweep, P['edges.outerWidth'], blue, P['edges.outerOpacity']);
    }
    if (P['streak.on']) A(c, rr, start + P['streak.offset'] * D2R, sweep * P['streak.len'], P['streak.width'], P['streak.color'], P['streak.opacity']);
    if (P['depth.on']) A(rear, rr, start, sweep, P['depth.railWidth'], blue, P['depth.railOpacity']);
    if (P['depth.on'] && P['depth.links'] && P['depth.linkWidth'] > 0) {
      ctx.save(); ctx.lineWidth = P['depth.linkWidth'] * u; ctx.strokeStyle = rgba(pale, P['depth.linkOpacity'] * t);
      for (const a of [start, start + sweep]) { const vx = Math.cos(a), vy = Math.sin(a); ctx.beginPath(); ctx.moveTo(c.x + vx * rr, c.y + vy * rr); ctx.lineTo(rear.x + vx * rr, rear.y + vy * rr); ctx.stroke(); }
      ctx.restore();
    }
  }
  if (P['bearing.on']) A(c, radius - P['bearing.inset'] * u, 0, TAU, P['bearing.width'], blue, P['bearing.opacity']);
  if (P['ticks.on']) {
    const n = Math.max(1, Math.round(P['ticks.count'])), every = Math.max(1, Math.round(P['ticks.majorEvery'])), rr = radius + P['ticks.offset'] * u;
    const tp = P['ticks.turn'] ? phase : 0;
    ctx.save();
    for (let i = 0; i < n; i++) {
      const a = tp + i * TAU / n, vx = Math.cos(a), vy = Math.sin(a), major = i % every === 0;
      const len = (major ? P['ticks.majorLen'] : P['ticks.minorLen']) * u, w = (major ? P['ticks.majorWidth'] : P['ticks.minorWidth']) * u;
      if (w <= 0 || len <= 0) continue;
      ctx.lineWidth = w; ctx.strokeStyle = rgba(major ? pale : blue, (major ? P['ticks.majorOpacity'] : P['ticks.minorOpacity']) * t);
      ctx.beginPath(); ctx.moveTo(c.x + vx * rr, c.y + vy * rr); ctx.lineTo(c.x + vx * (rr - len), c.y + vy * (rr - len)); ctx.stroke();
    }
    ctx.restore();
  }
  if (P['markers.on']) for (let i = 0; i < 4; i++) {
    const a = m.angles[i], e = alignment(m, ST.angle, i), half = P['markers.len'] * D2R / 2;
    A(c, radius - P['markers.inset'] * u, a - half, half * 2, P['markers.width'], P['s' + i + '.color'], P['markers.base'] + P['markers.boost'] * e);
  }
  if (P['grab.on'] && (ST.grab || P['grab.show'])) { const half = P['grab.len'] * D2R / 2; A(c, radius + P['grab.offset'] * u, phase - half, half * 2, P['grab.width'], pale, P['grab.opacity']); }
  G.bands = bands; G.phase = phase; G.rear = rear;
}

/* ---------- pointer (_RvDialPointerPainter) ---------- */
function groovePaths(m) {
  const c = { x: m.cx, y: m.cy }, th = m.thickness, inner = m.radius - th / 2, outer = m.radius + th / 2, rail = th * .075, a0 = ST.angle;
  const slots = [];
  for (const sign of [-1, 1]) {
    const a = { x: inner + rail, y: sign * th * P['grooves.spread'] }, b = { x: outer - rail, y: sign * th * P['grooves.tip'] };
    const dx = b.x - a.x, dy = b.y - a.y, dl = Math.hypot(dx, dy) || 1, k = th * P['grooves.slot'];
    const nx = -dy / dl * k, ny = dx / dl * k;
    const pts = [[a.x + nx, a.y + ny], [b.x + nx, b.y + ny], [b.x - nx, b.y - ny], [a.x - nx, a.y - ny]].map(p => ringPoint(c, p[0], p[1], a0));
    slots.push(pts);
  }
  return { slots, clip: annulus(c, inner + rail, outer - rail) };
}
function drawPointer(ctx, m) {
  const c = { x: m.cx, y: m.cy }, th = m.thickness, inner = m.radius - th / 2, outer = m.radius + th / 2, rail = th * .075, a0 = ST.angle;
  if (P['grooves.on']) {
    const gp = groovePaths(m);
    ctx.save(); ctx.clip(gp.clip, 'evenodd'); ctx.fillStyle = rgba(P['grooves.color'], P['grooves.opacity']);
    for (const s of gp.slots) { ctx.beginPath(); s.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
  if (P['arrow.on']) {
    const s = P['arrow.size'];
    const pts = [ringPoint(c, inner + rail * 2, -th * s, a0), ringPoint(c, outer - rail * 1.5, 0, a0), ringPoint(c, inner + rail * 2, th * s, a0)];
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineWidth = P['arrow.width']; ctx.strokeStyle = rgba(P['arrow.color'], P['arrow.opacity']);
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); ctx.lineTo(pts[1].x, pts[1].y); ctx.lineTo(pts[2].x, pts[2].y); ctx.stroke(); ctx.restore();
    G.arrow = pts;
  }
  if (P['pticks.on']) {
    ctx.save(); ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const al = alignment(m, a0, i), half = P['pticks.len'] * D2R / 2;
      ctx.lineWidth = P['pticks.width'] + al * P['pticks.widthBoost']; ctx.strokeStyle = rgba(P['ring.blue'], P['pticks.opacity'] + al * P['pticks.boost']);
      ctx.beginPath(); ctx.arc(c.x, c.y, outer + th * P['pticks.offset'], m.angles[i] - half, m.angles[i] + half); ctx.stroke();
    }
    ctx.restore();
  }
  const marker = ringPoint(c, inner - th * P['dot.inset'], 0, a0), dot = th * P['dot.size'];
  G.marker = marker; G.dot = dot;
  if (P['dot.on'] && dot > 0) {
    const level = alignment(m, a0, nearest(m, a0));
    const heading = P['dot.colorMode'] === 'fixed' ? rgb(P['dot.color']) : headingColor(m, a0);
    ctx.save(); blur(ctx, dot * P['dot.glow']); ctx.fillStyle = rgba(heading, P['dot.glowBase'] + P['dot.glowBoost'] * level);
    ctx.beginPath(); ctx.arc(marker.x, marker.y, dot, 0, TAU); ctx.fill(); ctx.restore();
    const gx = marker.x - dot * .2, gy = marker.y - dot * .3, g = ctx.createRadialGradient(gx, gy, 0, gx, gy, dot * 1.35);
    g.addColorStop(0, rgba(WHITE, .90)); g.addColorStop(.34, rgba(mix(heading, WHITE, .5), .98)); g.addColorStop(1, rgba(heading, .98));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(marker.x, marker.y, dot, 0, TAU); ctx.fill();
  }
}

/* ---------- center text ---------- */
function drawText(ctx, m, rv) {
  const u = m.unit, op = clamp((rv - P['text.fade']) / Math.max(.01, 1 - P['text.fade']), 0, 1);
  let y = m.cy + P['text.y'] * u; const cx = m.cx; G.text = {};
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  const line = (key, txt, size, weight, color, alpha, spacing, shadow) => {
    ctx.font = `${weight} ${size}px Roboto`; try { ctx.letterSpacing = spacing + 'px'; } catch (e) {}
    const w = ctx.measureText(txt).width, h = size * 1.171875;
    G.text[key] = { x: cx - w / 2 - 2, y, w: w + 4, h };
    if (op > 0 && alpha > 0) {
      ctx.save();
      if (shadow) { ctx.shadowColor = rgba(shadow.color, op); ctx.shadowBlur = 2 * (shadow.blur * .57735 + .5) * scaleOf(ctx); }
      ctx.fillStyle = rgba(color, alpha * op); ctx.fillText(txt, cx, y + size * .927734); ctx.restore();
    }
    y += h;
  };
  if (P['raven.on']) { line('raven', P['raven.text'], P['raven.size'] * u, P['raven.weight'], P['raven.color'], P['raven.opacity'], P['raven.spacing']); y += P['text.gap1'] * u; }
  const glow = P['title.glowOn'] && P['title.glowBlur'] > 0 ? { color: P['title.glowShape'] ? P['s' + ST.hi + '.color'] : P['title.glowColor'], blur: P['title.glowBlur'] } : null;
  line('title', P['label' + ST.hi], P['title.size'] * u, P['title.weight'], P['title.color'], 1, P['title.spacing'], glow);
  y += P['text.gap2'] * u;
  if (P['hint.on']) line('hint', ST.confirmed ? P['hint.done'] : (ST.ready ? P['hint.ready'] : P['hint.turning']), P['hint.size'] * u, P['hint.weight'], P['hint.color'], 1, 0);
  ctx.restore();
}

/* ---------- glass shapes (_RvOptionPainter) ---------- */
const VERTS = [
  null,
  [[0, -.47, 0], ...[0, 1, 2].map(i => [.48 * Math.cos(Math.PI / 6 + i * TAU / 3), .33, .48 * Math.sin(Math.PI / 6 + i * TAU / 3)])],
  [[-.305, -.305, -.305], [.305, -.305, -.305], [.305, .305, -.305], [-.305, .305, -.305], [-.305, -.305, .305], [.305, -.305, .305], [.305, .305, .305], [-.305, .305, .305]],
  [...[-.30, .30].flatMap(z => [0, 1, 2, 3, 4, 5].map(i => [.40 * Math.cos(i * Math.PI / 3), .40 * Math.sin(i * Math.PI / 3), z]))],
];
const FACES = [null, [[0, 1, 2], [0, 2, 3], [0, 3, 1], [1, 3, 2]], [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [3, 7, 6, 2], [0, 4, 7, 3], [1, 2, 6, 5]], [[0, 5, 4, 3, 2, 1], [6, 7, 8, 9, 10, 11], ...[0, 1, 2, 3, 4, 5].map(i => [i, (i + 1) % 6, (i + 1) % 6 + 6, i + 6])]];
function iconPaths(i) {
  const P2 = () => new Path2D(), circ = (x, y, r) => { const p = P2(); p.arc(x, y, r, 0, TAU); return p; };
  if (i === 0) { const p = P2(); p.moveTo(-.15, -.12); p.lineTo(.15, -.12); p.quadraticCurveTo(.17, -.12, .17, -.10); p.lineTo(.17, .085); p.quadraticCurveTo(.17, .105, .15, .105); p.lineTo(-.065, .105); p.lineTo(-.17, .18); p.lineTo(-.17, -.10); p.quadraticCurveTo(-.17, -.12, -.15, -.12); p.closePath(); return [p]; }
  if (i === 1) { const a = P2(); a.moveTo(-.16, .11); a.quadraticCurveTo(-.16, -.005, -.055, -.005); a.quadraticCurveTo(.055, -.005, .055, .11); a.closePath(); const b = P2(); b.moveTo(.065, .015); b.quadraticCurveTo(.18, -.002, .18, .11); b.lineTo(.095, .11); return [circ(-.055, -.095, .052), circ(.105, -.07, .042), a, b]; }
  if (i === 2) { const p = P2(); p.moveTo(-.15, -.17); p.lineTo(-.075, -.185); p.lineTo(-.025, -.065); p.lineTo(-.08, -.02); p.quadraticCurveTo(-.035, .06, .05, .10); p.lineTo(.105, .04); p.lineTo(.205, .09); p.lineTo(.195, .17); p.quadraticCurveTo(.17, .215, .09, .195); p.quadraticCurveTo(-.15, .13, -.19, -.075); p.quadraticCurveTo(-.21, -.145, -.15, -.17); p.closePath(); return [p]; }
  const a = P2(); a.moveTo(-.095, .14); a.quadraticCurveTo(-.095, .005, 0, .005); a.quadraticCurveTo(.095, .005, .095, .14); a.closePath();
  const l = P2(); l.moveTo(-.13, .035); l.quadraticCurveTo(-.225, .02, -.225, .13); l.lineTo(-.13, .13);
  const r = P2(); r.moveTo(.13, .035); r.quadraticCurveTo(.225, .02, .225, .13); r.lineTo(.13, .13);
  return [circ(0, -.105, .055), circ(-.145, -.06, .038), circ(.145, -.06, .038), a, l, r];
}
const ICONS = [0, 1, 2, 3].map(iconPaths);
function hull(pts) {
  const s = pts.slice().sort((a, b) => a.x === b.x ? a.y - b.y : a.x - b.x);
  const cr = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const lo = [], up = [];
  for (const p of s) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (const p of s.slice().reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return [...lo.slice(0, -1), ...up.slice(0, -1)];
}
function polyPath(pts) { const p = new Path2D(); pts.forEach((q, i) => i ? p.lineTo(q.x, q.y) : p.moveTo(q.x, q.y)); p.closePath(); return p; }
function drawIcon(ctx, i, ox, oy, size, e, color) {
  const S = k => P['s' + i + '.' + k];
  if (!S('iconOn')) return;
  ctx.save();
  ctx.translate(ox + size / 2 + S('iconX') * size, oy + size / 2 + S('iconY') * size);
  const k = size * S('iconSize'); ctx.scale(k, k);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const lw = S('iconLine');
  for (const p of ICONS[i]) {
    ctx.lineWidth = .043 * lw; ctx.strokeStyle = rgba(mix(color, '#25465C', .58), .80); ctx.stroke(p);
    if (S('iconGlow') > 0) { ctx.save(); ctx.lineWidth = .035 * lw; ctx.strokeStyle = rgba(color, Math.min(1, .75 * S('iconGlow'))); blur(ctx, .045 * S('iconGlow')); ctx.stroke(p); ctx.restore(); }
    ctx.lineWidth = .027 * lw; ctx.strokeStyle = rgba(S('iconCore'), .98); ctx.stroke(p);
  }
  ctx.restore();
}
function drawShape(ctx, i, ox, oy, size, e, phase) {
  const S = k => P['s' + i + '.' + k];
  e = clamp(e, 0, 1); const color = rgb(S('color')), boost = S('glowBoost');
  const state = motionState(i), settings = motionSettings(i);
  const rot = v => window.RavenMotion.rotate(state, settings, v);
  const proj = v => { const p = rot(v), per = 4 / (4 - p[2]), sc = size * .94; return { x: ox + size / 2 + p[0] * sc * per, y: oy + size / 2 + p[1] * sc * per, z: p[2] }; };
  if (i === 0) {
    const c = { x: ox + size / 2, y: oy + size / 2 }, r = size * S('r');
    ctx.save(); ctx.lineWidth = S('glowWidth') * (3 + e * boost) / 3; ctx.strokeStyle = rgba(color, S('glowOpacity')); blur(ctx, S('glowBlur') + 2 * e * boost);
    ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, TAU); ctx.stroke(); ctx.restore();
    const gx = c.x - r * .30, gy = c.y - r * .39, g = ctx.createRadialGradient(gx, gy, 0, gx, gy, r * 1.42), f = S('fill');
    g.addColorStop(0, rgba('#7BCBFF', .16 * f)); g.addColorStop(.28, rgba(color, .09 * f)); g.addColorStop(.72, rgba('#0344B8', .06 * f)); g.addColorStop(1, rgba(color, .18 * f));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, TAU); ctx.fill();
    const seams = front => {
      if (!S('seams')) return;
      for (const off of [0, Math.PI * .57]) {
        ctx.beginPath(); let started = false;
        for (let k = 0; k <= 96; k++) {
          const a = k * TAU / 96, rr = S('r');
          const p = proj([rr * Math.cos(a) * Math.cos(off), rr * Math.sin(a), rr * Math.cos(a) * Math.sin(off)]);
          if ((p.z >= 0) === front) { if (!started) { ctx.moveTo(p.x, p.y); started = true; } else ctx.lineTo(p.x, p.y); } else started = false;
        }
        ctx.lineWidth = front ? .85 : .6; ctx.strokeStyle = rgba(mix(color, WHITE, .45), front ? .25 : .17); ctx.stroke();
      }
    };
    seams(false); drawIcon(ctx, i, ox, oy, size, e, color); seams(true);
    const lg = ctx.createLinearGradient(c.x - r, c.y - r, c.x + r, c.y + r), ed = S('edge');
    lg.addColorStop(0, rgba('#F0FFFF', ed)); lg.addColorStop(.6, rgba(color, .83 * ed)); lg.addColorStop(1, rgba('#C8F8FF', ed));
    ctx.save(); ctx.lineWidth = 1.8 + e * .5; ctx.strokeStyle = lg; ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, TAU); ctx.stroke(); ctx.restore();
    if (S('arc')) { ctx.save(); ctx.lineWidth = 2.3; ctx.lineCap = 'round'; ctx.strokeStyle = rgba(WHITE, .48); ctx.beginPath(); ctx.arc(c.x, c.y, r * .94, -Math.PI * .91, -Math.PI * .91 + Math.PI * .55); ctx.stroke(); ctx.restore(); }
    if (S('glint')) { const gl = { x: c.x + Math.sin(phase) * r * .18 - r * .30, y: c.y - r * .49 }; ctx.save(); ctx.fillStyle = rgba(WHITE, .23); blur(ctx, r * .08); ctx.beginPath(); ctx.ellipse(gl.x, gl.y, r * .20, r * .08, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    return;
  }
  const pale = mix(color, WHITE, .72), deep = mix(color, '#1D314A', .40);
  const sw = S('w'), sh = S('h'), sd = S('d');
  const verts = VERTS[i].map(v => [v[0] * sw, v[1] * sh, v[2] * sd]);
  const pts = verts.map(proj);
  const hp = hull(pts), hullP = polyPath(hp);
  const xs = hp.map(p => p.x), ys = hp.map(p => p.y), bx = Math.min(...xs), by = Math.min(...ys), bw = Math.max(...xs) - bx, bh = Math.max(...ys) - by;
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineWidth = S('glowWidth') + e * 1.4 * boost; ctx.strokeStyle = rgba(color, S('glowOpacity') + e * .20 * boost); blur(ctx, S('glowBlur') + 2 * e * boost); ctx.stroke(hullP); ctx.restore();
  const f = S('fill');
  let g = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
  g.addColorStop(0, rgba(pale, .09 * f)); g.addColorStop(.29, rgba(color, .14 * f)); g.addColorStop(.70, rgba(deep, .08 * f)); g.addColorStop(1, rgba(color, .045 * f));
  ctx.fillStyle = g; ctx.fill(hullP);
  const facets = [];
  for (const face of FACES[i]) {
    const a = verts[face[0]], b = verts[face[1]], d = verts[face[2]];
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const cx = face.reduce((s, k) => s + verts[k][0], 0) / face.length, cy = face.reduce((s, k) => s + verts[k][1], 0) / face.length, cz = face.reduce((s, k) => s + verts[k][2], 0) / face.length;
    if (nx * cx + ny * cy + nz * cz < 0) { nx = -nx; ny = -ny; nz = -nz; }
    const len = Math.hypot(nx, ny, nz) || 1, n = rot([nx / len, ny / len, nz / len]);
    const light = clamp(.5 + .5 * (-.35 * n[0] - .65 * n[1] + .67 * n[2]), 0, 1);
    facets.push({ path: polyPath(face.map(k => pts[k])), depth: face.reduce((s, k) => s + pts[k].z, 0) / face.length, facing: n[2], light });
  }
  facets.sort((a, b) => a.depth - b.depth);
  for (const fc of facets) {
    g = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
    g.addColorStop(0, rgba(pale, (.025 + .045 * fc.light) * f)); g.addColorStop(.46, rgba(color, .045 * f)); g.addColorStop(1, rgba(deep, .055 * f));
    ctx.fillStyle = g; ctx.fill(fc.path);
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineWidth = fc.facing > 0 ? 1.25 : .75; ctx.strokeStyle = rgba(fc.facing > 0 ? pale : color, (fc.facing > 0 ? .80 * S('edge') : .46 * S('backEdge'))); ctx.stroke(fc.path); ctx.restore();
  }
  if (S('inner') > 0) {
    const ccx = bx + bw / 2, ccy = by + bh / 2;
    ctx.save(); ctx.translate(ccx, ccy); ctx.scale(.89, .89); ctx.translate(-ccx, -ccy); ctx.lineWidth = .65 / .89; ctx.strokeStyle = rgba(pale, .45 * S('inner')); ctx.stroke(hullP); ctx.restore();
  }
  drawIcon(ctx, i, ox, oy, size, e, color);
  for (const fc of facets.filter(x => x.facing > 0)) {
    if (S('shine') > 0) {
      ctx.save(); ctx.clip(fc.path);
      ctx.beginPath(); ctx.moveTo(bx - bw * .1, by + bh * .10); ctx.lineTo(bx + bw * 1.1, by - bh * .02); ctx.lineTo(bx + bw * 1.1, by + bh * .055); ctx.lineTo(bx - bw * .1, by + bh * .20); ctx.closePath();
      ctx.fillStyle = rgba(pale, (.11 + .10 * fc.light) * S('shine')); ctx.fill(); ctx.restore();
    }
    g = ctx.createLinearGradient(bx, by, bx + bw, by + bh); const ed = S('edge');
    g.addColorStop(0, rgba(WHITE, .91 * ed)); g.addColorStop(.57, rgba(color, .83 * ed)); g.addColorStop(1, rgba(pale, .94 * ed));
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineWidth = 1.5 + e * .4; ctx.strokeStyle = g; ctx.stroke(fc.path); ctx.restore();
  }
}
// Rotation advances only in update, never in the stage or close-up draw pass.
function shapePhase(i) { return motionState(i); }



/* ---------- interaction (port of _RvDialOverlayState) ---------- */
function toRing(m, p) { const ps = G.pose || [1, 0, 0, 1], [a, b, c, d] = ps, det = a * d - b * c || 1, dx = p.x - m.cx, dy = p.y - m.cy; return { x: m.cx + (d * dx - c * dy) / det, y: m.cy + (-b * dx + a * dy) / det }; }
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function insideWheel(m, p) { return dist(p, { x: m.cx, y: m.cy }) < m.radius - m.thickness / 2; }
function vib(ms) { if (P['feel.haptic']) K.vibrate(ms); }
function unRise(p) { return { x: p.x, y: p.y - (G.ty || 0) }; }
function pDown(p0, ev) {
  P = sc.P; const m = metrics(), raw = unRise(p0);
  if (ST.rise.mode === 'closed') { replay(); return; }
  if (ST.closing || ST.active != null || ST.rise.v < 1) return;
  const loc = toRing(m, raw), d = dist(loc, { x: m.cx, y: m.cy });
  const onMat = Math.abs(d - m.radius) <= m.thickness / 2;
  if (!onMat && !(ST.ready && !ST.turn.on && insideWheel(m, loc))) return;
  ST.active = ev.pointerId; ST.origin = loc; ST.drift = 0; ST.insideTap = !onMat;
  if (!onMat) return;
  ST.wasReady = ST.ready && !ST.turn.on; ST.grabAngle = ST.angle; ST.grabMode = ST.hi; ST.armed = false; ST.turn.on = false;
  ST.prevA = Math.atan2(loc.y - m.cy, loc.x - m.cx); ST.travel = 0;
  ST.idle = false; ST.grab = true; ST.confirmed = false; ST.didTurn = false; ST.ready = false; ST.chose = null;
}
function pMove(p0, ev) {
  P = sc.P; if (ST.closing || ev.pointerId !== ST.active) return;
  const m = metrics(), loc = toRing(m, unRise(p0)); ST.drift = Math.max(ST.drift, dist(loc, ST.origin));
  if (!ST.grab) return;
  const dx = loc.x - m.cx, dy = loc.y - m.cy;
  if (Math.abs(Math.hypot(dx, dy) - m.radius) > m.thickness / 2 + P['feel.grabMargin'] * m.unit) { ST.prevA = null; return; }
  const a = Math.atan2(dy, dx), prev = ST.prevA; ST.prevA = a; if (prev == null) return;
  const delta = wrap(a - prev); ST.travel += Math.abs(delta); ST.angle += delta;
  ST.didTurn = ST.travel >= P['feel.turnStart'] * D2R;
  if (ST.didTurn) { const next = nearest(m, ST.angle); if (next !== ST.hi) { const now = Date.now(); if (now - ST.lastDetent >= P['feel.detentGap']) { ST.lastDetent = now; vib(8); } ST.hi = next; } }
}
function pUp(p0, ev) {
  P = sc.P; if (ST.closing || ev.pointerId !== ST.active) return;
  const m = metrics(), loc = toRing(m, unRise(p0));
  const wasRing = ST.grab, turned = ST.didTurn;
  const confirm = ST.insideTap && ST.ready && !ST.turn.on && insideWheel(m, loc) && Math.max(ST.drift, dist(loc, ST.origin)) <= P['feel.tapTolerance'];
  ST.active = null; ST.prevA = null; ST.grab = false; ST.insideTap = false; ST.didTurn = false;
  if (wasRing) { if (turned) snap(m); else { ST.angle = ST.grabAngle; ST.hi = ST.grabMode; ST.ready = ST.wasReady; } return; }
  if (confirm) doConfirm();
}
function pCancel(p0, ev) { if (ev.pointerId !== ST.active) return; const wasRing = ST.grab; ST.active = null; ST.prevA = null; ST.grab = false; ST.insideTap = false; ST.didTurn = false; if (wasRing) { ST.angle = ST.grabAngle; ST.hi = ST.grabMode; ST.ready = ST.wasReady; } }
function snap(m) {
  if (ST.closing) return; ST.turn.on = false;
  const mode = nearest(m, ST.angle), from = ST.angle, to = ST.angle + wrap(m.angles[mode] - ST.angle), immediate = Math.abs(to - from) < .0001;
  ST.hi = mode; ST.ready = immediate; ST.armed = !immediate;
  if (immediate) ST.angle = to; else ST.turn = { on: true, from, to, t0: performance.now() };
}
function doConfirm() {
  if (!ST.ready || ST.turn.on || ST.closing) return; vib(15); ST.confirmed = true; ST.chose = P['label' + ST.hi];
  if (ST.hi === 0 && K.screens.directory) { K.status('Chose ' + ST.chose + '. Opening the Raven directory (what the app does next)…'); if (P['dis.on']) { ST.dis = 0; ST.disStay = false; } else setTimeout(() => K.show('directory'), 650); }
  else K.status('Chose ' + ST.chose + ' (in the app this opens that page). Turn the ring to choose again.');
}
function drawDismantleLines(ctx, m, p) {
  const alpha = Math.sin(Math.PI * p) * P['dis.alpha'], sep = K.smooth(p) * P['dis.spread'] * m.unit; if (alpha <= 0) return;
  ctx.save(); ctx.lineWidth = P['dis.width']; ctx.strokeStyle = rgba(P['dis.color'], alpha);
  for (let j = 0; j < 3; j++) {
    const cx = m.cx, cy = m.cy + (j - 1) * sep, r = Math.max(1, m.radius + (j - 1) * P['dis.ringGap'] * m.unit), start = p * 1.4 + j, sweep = TAU * (1 - K.smooth((p - .28) / .72));
    ctx.beginPath(); ctx.arc(cx, cy, r, start, start + sweep); ctx.stroke();
    const n = Math.round(P['dis.ticks']); ctx.beginPath();
    for (let i = 0; i < n; i++) { if (i / n > 1 - p) continue; const a = i * TAU / n + p * .6, vx = Math.cos(a), vy = Math.sin(a); ctx.moveTo(cx + vx * (r - 5), cy + vy * (r - 5)); ctx.lineTo(cx + vx * (r + 5), cy + vy * (r + 5)); }
    ctx.stroke();
  }
  for (let i = 0; i < 4; i++) {
    const s = m.st[i], r = s.size * (1 - K.smooth(p)) * .44; if (r <= 0) continue;
    ctx.strokeStyle = rgba(P['dis.color'], alpha); ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = rgba(P['dis.pull'], alpha * .4); ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + (m.cx - s.x) * (1 - p), s.y + (m.cy - s.y) * (1 - p)); ctx.stroke();
  }
  ctx.restore();
}
function replay() { P = sc.P; const m = metrics(); ST.rise = { v: 0, mode: 'fwd', t0: performance.now(), from: 1 }; ST.closing = false; ST.idle = true; ST.confirmed = false; ST.ready = true; ST.armed = false; ST.turn.on = false; ST.grab = false; ST.active = null; ST.angle = m.angles[ST.hi]; ST.chose = null; }
function closeDial() { if (ST.rise.mode === 'closed') { replay(); return; } ST.closing = true; ST.rise = { v: ST.rise.v, mode: 'rev', t0: performance.now(), from: ST.rise.v }; }

/* ---------- module ---------- */
const sc = K.screen({
  id: 'dial', title: 'Raven dial', docId: 'raven_dial',
  crumb: 'Asgard › Raven page › Raven dial <small>· AsgardRaven Dart</small>',
  docMeta: { widget: 'AsgardRaven', part: 'Raven dial', source: 'FlutterFlow export 2026-11-19 (dial identical to v60)' },
  startGroup: 'Ring', startSection: 'Light bands',
  spec(def) {
// Dial overall
def('Dial', 'Size & place', 'ring.all', 'dial.size', 'Dial size', 'num', 139.5, { min: 60, max: 230, step: .5, unit: 'px', dart: 'radius = 139.5 * unit' });
def('Dial', 'Size & place', 'ring.all', 'dial.thickness', 'Ring thickness', 'num', 32, { min: 8, max: 80, step: .5, unit: 'px', dart: 'thickness = 32 * unit', info: 'Width of the turnable ring. Everything on the ring scales with it.' });
def('Dial', 'Size & place', 'dial', 'dial.x', 'Left / right', 'num', -3.5, { min: -160, max: 160, step: .5, unit: 'px', dart: 'center.dx = width/2 - 3.5*unit' });
def('Dial', 'Size & place', 'dial', 'dial.y', 'Up / down', 'num', 0, { min: -300, max: 300, step: 1, unit: 'px' });
def('Dial', 'Glass panel', 'glass', 'glass.on', 'Glass panel', 'bool', true);
def('Dial', 'Glass panel', 'glass', 'glass.top', 'Top edge', 'num', .25, { min: 0, max: .6, step: .005, unit: 'of screen', dart: 'glassTop = height * .25' });
def('Dial', 'Glass panel', 'glass', 'glass.side', 'Side margin', 'num', 10, { min: 0, max: 60, step: 1, unit: 'px' });
def('Dial', 'Glass panel', 'glass', 'glass.round', 'Corner roundness', 'num', 16, { min: 0, max: 80, step: 1, unit: 'px' });
def('Dial', 'Glass panel', 'glass', 'glass.width', 'Edge line width', 'num', .7, { min: .1, max: 4, step: .05, unit: 'px' });
def('Dial', 'Glass panel', 'glass', 'glass.edge', 'Edge brightness', 'num', 1, { min: 0, max: 3, step: .05, unit: '×' });
def('Dial', 'Glass panel', 'glass.shine', 'glass.shine', 'Top reflection', 'num', 1, { min: 0, max: 3, step: .05, unit: '×' });
def('Dial', 'Glass panel', 'glass.shine', 'glass.shineLen', 'Reflection length', 'num', .43, { min: .05, max: 1, step: .01, unit: 'of width' });
def('Dial', 'Rise & close', 'dial', 'anim.rise', 'Rise-in time', 'int', 1600, { min: 100, max: 6000, step: 10, unit: 'ms', info: 'Press Replay to see it.' });
def('Dial', 'Rise & close', 'dial', 'anim.slide', 'Slide-up share', 'num', .4, { min: .05, max: 1, step: .01, info: 'Part of the rise spent sliding up from the bottom. The ring then keeps sweeping in.' });
def('Dial', 'Rise & close', 'dial', 'anim.close', 'Close time', 'int', 240, { min: 50, max: 3000, step: 10, unit: 'ms', info: 'Press Close to see it.' });
def('Dial', 'Wobble', 'ring.all', 'wobble.on', 'Wobble', 'bool', true, { info: 'The slow floating tilt of the ring.' });
def('Dial', 'Wobble', 'ring.all', 'wobble.x', 'Tilt forward / back', 'num', 2.005, { min: 0, max: 30, step: .05, unit: '°' });
def('Dial', 'Wobble', 'ring.all', 'wobble.y', 'Tilt side to side', 'num', 2.578, { min: 0, max: 30, step: .05, unit: '°' });
def('Dial', 'Wobble', 'ring.all', 'wobble.z', 'Twist', 'num', .573, { min: 0, max: 30, step: .05, unit: '°' });
def('Dial', 'Wobble', 'ring.all', 'wobble.speed', 'Wobble speed', 'num', 1, { min: 0, max: 6, step: .05, unit: '×' });

// Ring
def('Ring', 'Spin', 'ring.spin', 'ring.spinOn', 'Idle spin', 'bool', true, { info: 'The light bands and tick marks slowly turn by themselves.' });
def('Ring', 'Spin', 'ring.spin', 'ring.spinPeriod', 'Seconds per turn', 'num', 36, { min: 2, max: 240, step: .5, unit: 's' });
def('Ring', 'Spin', 'ring.spin', 'ring.spinDir', 'Direction', 'select', 1, { opts: [[1, 'Clockwise'], [-1, 'Counter-clockwise']] });
def('Ring', 'Spin', 'ring.spin', 'ring.spinAfterGrab', 'Keep spinning after a turn', 'bool', false, { info: 'In the Dart the idle spin stops for good once you grab the ring.' });
def('Ring', 'Colors', 'ring.all', 'ring.blue', 'Main blue', 'color', '#008BFF', { info: 'Shared blue. Also used by the glass edge and the pointer ticks.' });
def('Ring', 'Colors', 'ring.all', 'ring.pale', 'Main pale', 'color', '#BCEBFF', { info: 'Shared pale blue. Also used by the glass edge, arrow and hint text color default.' });
def('Ring', 'Light bands', 'ring.band', 'bands.on', 'Light bands', 'bool', true, { info: 'The 3 broad glowing partial rings.' });
def('Ring', 'Light bands', 'ring.band', 'bands.gap', 'Spacing', 'num', 12, { min: 0, max: 40, step: .5, unit: 'px' });
def('Ring', 'Light bands', 'ring.band', 'bands.width', 'Glow width', 'num', 9, { min: 0, max: 40, step: .5, unit: 'px' });
def('Ring', 'Light bands', 'ring.band', 'bands.glow', 'Glow blur', 'num', 7, { min: 0, max: 30, step: .5, unit: 'px' });
def('Ring', 'Light bands', 'ring.band', 'bands.glowOpacity', 'Glow strength', 'num', .30, { min: 0, max: 1, step: .01 });
def('Ring', 'Light bands', 'ring.band', 'bands.bodyWidth', 'Body width', 'num', 6.5, { min: 0, max: 40, step: .5, unit: 'px' });
def('Ring', 'Light bands', 'ring.band', 'bands.bodyOpacity', 'Body strength', 'num', .28, { min: 0, max: 1, step: .01 });
[[194.4, 6.88], [169.2, 194.9], [142.2, -26.36]].forEach(([len, st], i) => {
  def('Ring', 'Light bands', 'ring.band:' + i, 'bands.len' + (i + 1), `Band ${i + 1} length`, 'num', len, { min: 5, max: 360, step: .5, unit: '°' });
  def('Ring', 'Light bands', 'ring.band:' + i, 'bands.start' + (i + 1), `Band ${i + 1} start`, 'num', st, { min: -180, max: 360, step: .5, unit: '°' });
});
def('Ring', 'Band edges', 'ring.edges', 'edges.on', 'Band edge lines', 'bool', true);
def('Ring', 'Band edges', 'ring.edges', 'edges.offset', 'Edge distance', 'num', 2.8, { min: 0, max: 12, step: .1, unit: 'px' });
def('Ring', 'Band edges', 'ring.edges:in', 'edges.innerWidth', 'Inner line width', 'num', 1.05, { min: 0, max: 6, step: .05, unit: 'px' });
def('Ring', 'Band edges', 'ring.edges:in', 'edges.innerOpacity', 'Inner line strength', 'num', .95, { min: 0, max: 1, step: .01 });
def('Ring', 'Band edges', 'ring.edges:out', 'edges.outerWidth', 'Outer line width', 'num', 1.4, { min: 0, max: 6, step: .05, unit: 'px' });
def('Ring', 'Band edges', 'ring.edges:out', 'edges.outerOpacity', 'Outer line strength', 'num', .98, { min: 0, max: 1, step: .01 });
def('Ring', 'Band streak', 'ring.streak', 'streak.on', 'Bright streak', 'bool', true, { info: 'The brighter short segment riding each band.' });
def('Ring', 'Band streak', 'ring.streak', 'streak.len', 'Streak length', 'num', .34, { min: 0, max: 1, step: .01, unit: 'of band' });
def('Ring', 'Band streak', 'ring.streak', 'streak.width', 'Streak width', 'num', 2.3, { min: .2, max: 10, step: .1, unit: 'px' });
def('Ring', 'Band streak', 'ring.streak', 'streak.color', 'Streak color', 'color', '#70D6FF');
def('Ring', 'Band streak', 'ring.streak', 'streak.opacity', 'Streak strength', 'num', .85, { min: 0, max: 1, step: .01 });
def('Ring', 'Band streak', 'ring.streak', 'streak.offset', 'Streak start', 'num', 2.005, { min: -90, max: 360, step: .5, unit: '°' });
def('Ring', '3D depth', 'ring.depth', 'depth.on', 'Back rails', 'bool', true, { info: 'The recessed copy of each band that makes the ring look 3D.' });
def('Ring', '3D depth', 'ring.depth', 'depth.x', 'Depth shift right', 'num', 2, { min: -30, max: 30, step: .5, unit: 'px' });
def('Ring', '3D depth', 'ring.depth', 'depth.y', 'Depth shift down', 'num', 9, { min: -30, max: 30, step: .5, unit: 'px' });
def('Ring', '3D depth', 'ring.depth', 'depth.railWidth', 'Rail width', 'num', .8, { min: 0, max: 6, step: .05, unit: 'px' });
def('Ring', '3D depth', 'ring.depth', 'depth.railOpacity', 'Rail strength', 'num', .45, { min: 0, max: 1, step: .01 });
def('Ring', '3D depth', 'ring.depth:links', 'depth.links', 'End connectors', 'bool', true);
def('Ring', '3D depth', 'ring.depth:links', 'depth.linkWidth', 'Connector width', 'num', .8, { min: 0, max: 6, step: .05, unit: 'px' });
def('Ring', '3D depth', 'ring.depth:links', 'depth.linkOpacity', 'Connector strength', 'num', .62, { min: 0, max: 1, step: .01 });
def('Ring', 'Outline rings', 'ring.contours', 'contours.on', 'Outline rings', 'bool', true, { info: 'Thin full rings on the inside and outside edge, front and back.' });
def('Ring', 'Outline rings', 'ring.contours', 'contours.offset', 'Distance from center line', 'num', 17, { min: 0, max: 60, step: .5, unit: 'px' });
def('Ring', 'Outline rings', 'ring.contours:front', 'contours.frontWidth', 'Front width', 'num', .6, { min: 0, max: 6, step: .05, unit: 'px' });
def('Ring', 'Outline rings', 'ring.contours:front', 'contours.frontOpacity', 'Front strength', 'num', .38, { min: 0, max: 1, step: .01 });
def('Ring', 'Outline rings', 'ring.contours:back', 'contours.backWidth', 'Back width', 'num', 1, { min: 0, max: 6, step: .05, unit: 'px' });
def('Ring', 'Outline rings', 'ring.contours:back', 'contours.backOpacity', 'Back strength', 'num', .32, { min: 0, max: 1, step: .01 });
def('Ring', 'Outline rings', 'ring.contours:back', 'contours.backGap', 'Back ring gap', 'num', 11.46, { min: 0, max: 180, step: .5, unit: '°' });
def('Ring', 'Bearing', 'ring.bearing', 'bearing.on', 'Inner bearing line', 'bool', true);
def('Ring', 'Bearing', 'ring.bearing', 'bearing.inset', 'Distance inside', 'num', 22, { min: -40, max: 80, step: .5, unit: 'px' });
def('Ring', 'Bearing', 'ring.bearing', 'bearing.width', 'Width', 'num', .7, { min: 0, max: 6, step: .05, unit: 'px' });
def('Ring', 'Bearing', 'ring.bearing', 'bearing.opacity', 'Strength', 'num', .35, { min: 0, max: 1, step: .01 });
def('Ring', 'Tick marks', 'ring.ticks', 'ticks.on', 'Tick marks', 'bool', true);
def('Ring', 'Tick marks', 'ring.ticks', 'ticks.count', 'How many', 'int', 96, { min: 4, max: 360, step: 1 });
def('Ring', 'Tick marks', 'ring.ticks', 'ticks.majorEvery', 'Long tick every', 'int', 8, { min: 1, max: 60, step: 1 });
def('Ring', 'Tick marks', 'ring.ticks', 'ticks.offset', 'Distance outside', 'num', 22, { min: -40, max: 80, step: .5, unit: 'px' });
def('Ring', 'Tick marks', 'ring.ticks', 'ticks.majorLen', 'Long tick length', 'num', 5.5, { min: 0, max: 30, step: .1, unit: 'px' });
def('Ring', 'Tick marks', 'ring.ticks', 'ticks.minorLen', 'Short tick length', 'num', 2.4, { min: 0, max: 30, step: .1, unit: 'px' });
def('Ring', 'Tick marks', 'ring.ticks', 'ticks.majorWidth', 'Long tick width', 'num', 1, { min: 0, max: 6, step: .05, unit: 'px' });
def('Ring', 'Tick marks', 'ring.ticks', 'ticks.minorWidth', 'Short tick width', 'num', .65, { min: 0, max: 6, step: .05, unit: 'px' });
def('Ring', 'Tick marks', 'ring.ticks', 'ticks.majorOpacity', 'Long tick strength', 'num', .8, { min: 0, max: 1, step: .01 });
def('Ring', 'Tick marks', 'ring.ticks', 'ticks.minorOpacity', 'Short tick strength', 'num', .42, { min: 0, max: 1, step: .01 });
def('Ring', 'Tick marks', 'ring.ticks', 'ticks.turn', 'Turn with ring', 'bool', true);
def('Ring', 'Station markers', 'ring.markers', 'markers.on', 'Station markers', 'bool', true, { info: 'The 4 colored arcs on the inner ring, one per shape. They light up when lined up.' });
def('Ring', 'Station markers', 'ring.markers', 'markers.inset', 'Distance inside', 'num', 28, { min: -40, max: 80, step: .5, unit: 'px' });
def('Ring', 'Station markers', 'ring.markers', 'markers.len', 'Length', 'num', 20.63, { min: 1, max: 90, step: .5, unit: '°' });
def('Ring', 'Station markers', 'ring.markers', 'markers.width', 'Width', 'num', 1.4, { min: 0, max: 8, step: .05, unit: 'px' });
def('Ring', 'Station markers', 'ring.markers', 'markers.base', 'Resting strength', 'num', .20, { min: 0, max: 1, step: .01 });
def('Ring', 'Station markers', 'ring.markers', 'markers.boost', 'Lined-up boost', 'num', .70, { min: 0, max: 1, step: .01 });
def('Ring', 'Grab highlight', 'ring.grab', 'grab.on', 'Grab highlight', 'bool', true, { info: 'Pale arc that shows while your finger holds the ring.' });
def('Ring', 'Grab highlight', 'ring.grab', 'grab.show', 'Show it now (for editing)', 'bool', false);
def('Ring', 'Grab highlight', 'ring.grab', 'grab.offset', 'Distance outside', 'num', 24, { min: -40, max: 80, step: .5, unit: 'px' });
def('Ring', 'Grab highlight', 'ring.grab', 'grab.len', 'Length', 'num', 34.38, { min: 1, max: 360, step: .5, unit: '°' });
def('Ring', 'Grab highlight', 'ring.grab', 'grab.width', 'Width', 'num', 1.6, { min: 0, max: 10, step: .05, unit: 'px' });
def('Ring', 'Grab highlight', 'ring.grab', 'grab.opacity', 'Strength', 'num', 1, { min: 0, max: 1, step: .01 });

// Pointer
def('Pointer', 'Dot', 'pointer.dot', 'dot.on', 'Pointer dot', 'bool', true, { info: 'The glowing dot that shows which shape is selected.' });
def('Pointer', 'Dot', 'pointer.dot', 'dot.size', 'Dot size', 'num', .23, { min: .02, max: 1, step: .005, unit: 'of ring' });
def('Pointer', 'Dot', 'pointer.dot', 'dot.inset', 'Distance inside ring', 'num', .37, { min: -1, max: 2, step: .01, unit: 'of ring' });
def('Pointer', 'Dot', 'pointer.dot', 'dot.glow', 'Glow blur', 'num', .85, { min: 0, max: 4, step: .05, unit: '×' });
def('Pointer', 'Dot', 'pointer.dot', 'dot.glowBase', 'Glow strength', 'num', .38, { min: 0, max: 1, step: .01 });
def('Pointer', 'Dot', 'pointer.dot', 'dot.glowBoost', 'Lined-up glow boost', 'num', .28, { min: 0, max: 1, step: .01 });
def('Pointer', 'Dot', 'pointer.dot', 'dot.colorMode', 'Dot color', 'select', 'blend', { opts: [['blend', 'Blend of shape colors'], ['fixed', 'One color']] });
def('Pointer', 'Dot', 'pointer.dot', 'dot.color', 'Fixed color', 'color', '#169EFF');
def('Pointer', 'Arrow', 'pointer.arrow', 'arrow.on', 'Arrow', 'bool', true, { info: 'The pale chevron on the ring at the selection point.' });
def('Pointer', 'Arrow', 'pointer.arrow', 'arrow.size', 'Arrow size', 'num', .30, { min: .02, max: 1, step: .005, unit: 'of ring' });
def('Pointer', 'Arrow', 'pointer.arrow', 'arrow.width', 'Line width', 'num', 1.35, { min: .1, max: 8, step: .05, unit: 'px' });
def('Pointer', 'Arrow', 'pointer.arrow', 'arrow.opacity', 'Strength', 'num', .85, { min: 0, max: 1, step: .01 });
def('Pointer', 'Arrow', 'pointer.arrow', 'arrow.color', 'Color', 'color', '#BCEBFF');
def('Pointer', 'Grooves', 'pointer.grooves', 'grooves.on', 'Grooves', 'bool', true, { info: 'The two dark slanted slots cut into the ring at the selection point.' });
def('Pointer', 'Grooves', 'pointer.grooves', 'grooves.color', 'Color', 'color', '#075264');
def('Pointer', 'Grooves', 'pointer.grooves', 'grooves.opacity', 'Strength', 'num', .82, { min: 0, max: 1, step: .01 });
def('Pointer', 'Grooves', 'pointer.grooves', 'grooves.spread', 'Spread at inner edge', 'num', .48, { min: 0, max: 1.5, step: .01, unit: 'of ring' });
def('Pointer', 'Grooves', 'pointer.grooves', 'grooves.tip', 'Spread at outer edge', 'num', .06, { min: 0, max: 1.5, step: .01, unit: 'of ring' });
def('Pointer', 'Grooves', 'pointer.grooves', 'grooves.slot', 'Slot width', 'num', .06, { min: .005, max: .4, step: .005, unit: 'of ring' });
def('Pointer', 'Station ticks', 'pointer.ticks', 'pticks.on', 'Outer station ticks', 'bool', true, { info: 'Small blue marks just outside the ring at each shape position.' });
def('Pointer', 'Station ticks', 'pointer.ticks', 'pticks.len', 'Length', 'num', 5.5, { min: .5, max: 60, step: .1, unit: '°' });
def('Pointer', 'Station ticks', 'pointer.ticks', 'pticks.offset', 'Distance outside', 'num', .14, { min: -1, max: 2, step: .01, unit: 'of ring' });
def('Pointer', 'Station ticks', 'pointer.ticks', 'pticks.width', 'Width', 'num', 1, { min: .1, max: 8, step: .05, unit: 'px' });
def('Pointer', 'Station ticks', 'pointer.ticks', 'pticks.widthBoost', 'Lined-up width boost', 'num', .5, { min: 0, max: 6, step: .05, unit: 'px' });
def('Pointer', 'Station ticks', 'pointer.ticks', 'pticks.opacity', 'Strength', 'num', .35, { min: 0, max: 1, step: .01 });
def('Pointer', 'Station ticks', 'pointer.ticks', 'pticks.boost', 'Lined-up boost', 'num', .40, { min: 0, max: 1, step: .01 });

// Feel (behavior)
def('Feel', 'Turning', 'feel', 'feel.snap', 'Snap speed', 'int', 220, { min: 20, max: 2000, step: 10, unit: 'ms', info: 'How fast the ring settles onto the nearest shape after you let go.' });
def('Feel', 'Turning', 'feel', 'feel.haptic', 'Click per shape (vibrate)', 'bool', true, { info: 'Phone buzz as you pass each shape. Works on Android Chrome.' });
def('Feel', 'Turning', 'feel', 'feel.detentGap', 'Min time between clicks', 'int', 90, { min: 0, max: 500, step: 5, unit: 'ms' });
def('Feel', 'Turning', 'ring.markers', 'feel.alignZone', 'Lined-up zone', 'num', 25.78, { min: 2, max: 90, step: .5, unit: '°', info: 'How close the ring must be to a shape before it starts lighting up.' });
def('Feel', 'Turning', 'feel', 'feel.turnStart', 'Turn starts after', 'num', 1.03, { min: 0, max: 20, step: .05, unit: '°' });
def('Feel', 'Turning', 'feel', 'feel.grabMargin', 'Grab margin', 'num', 4, { min: 0, max: 40, step: .5, unit: 'px', info: 'How far off the ring your finger can drift and keep turning it.' });
def('Feel', 'Confirm', 'feel.inner', 'feel.tapTolerance', 'Tap wiggle allowed', 'num', 10, { min: 0, max: 60, step: .5, unit: 'px', info: 'A tap inside the ring confirms only if the finger moved less than this.' });
def('Exit', 'Dismantle', 'exit', 'dis.on', 'Dismantle when Messages is chosen', 'bool', true, { info: 'Press "Play exit" to watch it without leaving.' });
def('Exit', 'Dismantle', 'exit', 'dis.seconds', 'Duration', 'num', .78, { min: .2, max: 4, step: .02, unit: 's' });
def('Exit', 'Dismantle', 'exit', 'dis.strips', 'Strips', 'int', 18, { min: 2, max: 60, step: 1, info: 'The dial pulls away left in this many horizontal strips.' });
def('Exit', 'Dismantle', 'exit', 'dis.stagger', 'Strip delay', 'num', .017, { min: 0, max: .06, step: .001 });
def('Exit', 'Dismantle', 'exit', 'dis.sweep', 'Strip pull time', 'num', .40, { min: .05, max: 1, step: .01 });
def('Exit', 'Dismantle', 'exit', 'dis.fadeStart', 'Fade starts at', 'num', .12, { min: 0, max: .9, step: .01 });
def('Exit', 'Dismantle', 'exit', 'dis.fadeLen', 'Fade length', 'num', .65, { min: .05, max: 1, step: .01 });
def('Exit', 'Blueprint lines', 'exit.lines', 'dis.lines', 'Show blueprint lines', 'bool', true);
def('Exit', 'Blueprint lines', 'exit.lines', 'dis.color', 'Line color', 'color', '#BCEBFF');
def('Exit', 'Blueprint lines', 'exit.lines', 'dis.pull', 'Pull-line color', 'color', '#008BFF');
def('Exit', 'Blueprint lines', 'exit.lines', 'dis.alpha', 'Line strength', 'num', .66, { min: 0, max: 1, step: .01 });
def('Exit', 'Blueprint lines', 'exit.lines', 'dis.width', 'Line width', 'num', .65, { min: .2, max: 3, step: .05, unit: 'px' });
def('Exit', 'Blueprint lines', 'exit.lines', 'dis.spread', 'Rings spread apart', 'num', 25, { min: 0, max: 80, step: 1, unit: 'px' });
def('Exit', 'Blueprint lines', 'exit.lines', 'dis.ringGap', 'Ring size step', 'num', 13, { min: 0, max: 50, step: 1, unit: 'px' });
def('Exit', 'Blueprint lines', 'exit.lines', 'dis.ticks', 'Tick marks per ring', 'int', 12, { min: 0, max: 48, step: 1 });

// Center text
def('Text', 'RAVEN label', 'text.raven', 'raven.on', 'Show', 'bool', true);
def('Text', 'RAVEN label', 'text.raven', 'raven.text', 'Wording', 'text', 'R A V E N');
def('Text', 'RAVEN label', 'text.raven', 'raven.size', 'Size', 'num', 10, { min: 4, max: 40, step: .5, unit: 'px' });
def('Text', 'RAVEN label', 'text.raven', 'raven.spacing', 'Letter spacing', 'num', 3, { min: -2, max: 20, step: .5, unit: 'px' });
def('Text', 'RAVEN label', 'text.raven', 'raven.weight', 'Weight', 'select', 400, { opts: [[300, 'Light'], [400, 'Regular'], [500, 'Medium'], [600, 'Semi-bold'], [700, 'Bold']] });
def('Text', 'RAVEN label', 'text.raven', 'raven.color', 'Color', 'color', '#FFFFFF');
def('Text', 'RAVEN label', 'text.raven', 'raven.opacity', 'Strength', 'num', .75, { min: 0, max: 1, step: .01 });
def('Text', 'Mode name', 'text.title', 'title.size', 'Size', 'num', 23, { min: 6, max: 60, step: .5, unit: 'px' });
def('Text', 'Mode name', 'text.title', 'title.weight', 'Weight', 'select', 500, { opts: [[300, 'Light'], [400, 'Regular'], [500, 'Medium'], [600, 'Semi-bold'], [700, 'Bold']] });
def('Text', 'Mode name', 'text.title', 'title.color', 'Color', 'color', '#FFFFFF');
def('Text', 'Mode name', 'text.title', 'title.spacing', 'Letter spacing', 'num', 0, { min: -2, max: 20, step: .5, unit: 'px' });
def('Text', 'Mode name', 'text.title', 'title.glowOn', 'Glow', 'bool', true);
def('Text', 'Mode name', 'text.title', 'title.glowShape', 'Glow uses shape color', 'bool', true);
def('Text', 'Mode name', 'text.title', 'title.glowColor', 'Glow color (if not shape)', 'color', '#169EFF');
def('Text', 'Mode name', 'text.title', 'title.glowBlur', 'Glow blur', 'num', 12, { min: 0, max: 60, step: .5, unit: 'px', dart: 'Shadow(blurRadius: 12)', info: 'This was the only control the old studio showed (blur Radius 3).' });
def('Text', 'Hint line', 'text.hint', 'hint.on', 'Show', 'bool', true);
def('Text', 'Hint line', 'text.hint', 'hint.size', 'Size', 'num', 14, { min: 4, max: 40, step: .5, unit: 'px' });
def('Text', 'Hint line', 'text.hint', 'hint.weight', 'Weight', 'select', 400, { opts: [[300, 'Light'], [400, 'Regular'], [500, 'Medium'], [600, 'Semi-bold'], [700, 'Bold']] });
def('Text', 'Hint line', 'text.hint', 'hint.color', 'Color', 'color', '#BCEBFF');
def('Text', 'Hint line', 'text.hint', 'hint.ready', 'When lined up', 'text', 'Tap inside to confirm');
def('Text', 'Hint line', 'text.hint', 'hint.turning', 'While turning', 'text', 'Turn the ring');
def('Text', 'Hint line', 'text.hint', 'hint.done', 'After confirm', 'text', 'Aligned');
def('Text', 'Layout', 'text.all', 'text.y', 'Block up / down', 'num', -38, { min: -200, max: 200, step: .5, unit: 'px' });
def('Text', 'Layout', 'text.all', 'text.gap1', 'Gap under RAVEN', 'num', 10, { min: 0, max: 60, step: .5, unit: 'px' });
def('Text', 'Layout', 'text.all', 'text.gap2', 'Gap under name', 'num', 7, { min: 0, max: 60, step: .5, unit: 'px' });
def('Text', 'Layout', 'text.all', 'text.fade', 'Fade-in starts at', 'num', .45, { min: 0, max: .95, step: .01, unit: 'of rise' });
def('Text', 'Labels', 'text.title', 'label0', 'Messages shape', 'text', 'Messages');
def('Text', 'Labels', 'text.title', 'label1', 'People shape', 'text', 'People');
def('Text', 'Labels', 'text.title', 'label2', 'Calls shape', 'text', 'Calls');
def('Text', 'Labels', 'text.title', 'label3', 'Groups shape', 'text', 'Groups');

SHAPES.forEach((s, i) => {
  const g = s.tab + ' shape', t = 'shape:' + i, p = 's' + i + '.';
  def(g, 'Place', t, p + 'x', 'Left / right', 'num', s.pos[0], { min: -300, max: 300, step: .5, unit: 'px', info: 'Moving a shape also moves where the ring stops for it.' });
  def(g, 'Place', t, p + 'y', 'Up / down', 'num', s.pos[1], { min: -350, max: 350, step: .5, unit: 'px' });
  def(g, 'Place', t, p + 'size', 'Size', 'num', 73.44, { min: 20, max: 220, step: .5, unit: 'px' });
  def(g, 'Color', t, p + 'color', 'Color', 'color', s.color);
  def(g, 'Spin', t, p + 'spinOn', 'Spin', 'bool', true, { info: `The ${s.kind.toLowerCase()} turns slowly in place; the icon inside stays facing you.` });
  def(g, 'Spin', t, p + 'period', 'Seconds per turn', 'num', s.period, { min: 1, max: 240, step: .5, unit: 's' });
  def(g, 'Spin', t, p + 'dir', 'Direction', 'select', 1, { opts: [[1, 'Forward'], [-1, 'Reverse']] });
  def(g, 'Spin', t, p + 'axis', 'Spin axis', 'select', 'y', { opts: [['x', 'X · tumble up / down'], ['y', 'Y · turn left / right'], ['z', 'Z · turn like a wheel'], ['custom', 'Custom XYZ axis']], info: 'Each shape has its own axis. Changing it continues smoothly from the current pose.' });
  def(g, 'Spin', t, p + 'response', 'Speed / direction smoothing', 'num', .18, { min: 0, max: 2, step: .01, unit: 's', info: 'How gently motion responds to a changed speed, direction, or axis. Spin off holds the current pose.' });
  def(g, 'Spin', t, p + 'start', 'Start angle', 'num', s.start, { min: -180, max: 180, step: .5, unit: '°' });
  def(g, 'Orientation', t, p + 'tilt', 'X tilt toward you', 'num', -10.886, { min: -180, max: 180, step: .5, unit: '°' });
  def(g, 'Orientation', t, p + 'yaw', 'Y turn left / right', 'num', 0, { min: -180, max: 180, step: .5, unit: '°' });
  def(g, 'Orientation', t, p + 'roll', 'Z roll', 'num', 0, { min: -180, max: 180, step: .5, unit: '°' });
  for (const [a, v] of [['X', 0], ['Y', 1], ['Z', 0]]) def(g, 'Custom axis', t, p + 'axis' + a, a + ' weight', 'num', v, { min: -1, max: 1, step: .01, info: 'Used when Spin axis is Custom XYZ axis. Weights are normalized; all zero uses Y.' });
  if (i > 0) {
    def(g, 'Proportions', t, p + 'w', 'Width', 'num', 1, { min: .2, max: 2.5, step: .01, unit: '×' });
    def(g, 'Proportions', t, p + 'h', 'Height', 'num', 1, { min: .2, max: 2.5, step: .01, unit: '×' });
    def(g, 'Proportions', t, p + 'd', 'Depth', 'num', 1, { min: .2, max: 2.5, step: .01, unit: '×' });
  } else {
    def(g, 'Proportions', t, p + 'r', 'Sphere size inside box', 'num', .43, { min: .1, max: .7, step: .005, unit: 'of box' });
  }
  def(g, 'Glow', t, p + 'glowWidth', 'Glow width', 'num', 3, { min: 0, max: 20, step: .1, unit: 'px' });
  def(g, 'Glow', t, p + 'glowBlur', 'Glow blur', 'num', 4.5, { min: 0, max: 30, step: .1, unit: 'px' });
  def(g, 'Glow', t, p + 'glowOpacity', 'Glow strength', 'num', i === 0 ? .72 : .62, { min: 0, max: 1, step: .01 });
  def(g, 'Glow', t, p + 'glowBoost', 'Lined-up boost', 'num', 1, { min: 0, max: 4, step: .05, unit: '×', info: 'How much brighter and wider the glow gets when the ring lines up with this shape.' });
  def(g, 'Glass', t, p + 'fill', 'Glass fill', 'num', 1, { min: 0, max: 4, step: .05, unit: '×' });
  def(g, 'Glass', t, p + 'edge', 'Edge brightness', 'num', 1, { min: 0, max: 2, step: .05, unit: '×' });
  if (i > 0) {
    def(g, 'Glass', t, p + 'backEdge', 'Back edges', 'num', 1, { min: 0, max: 2, step: .05, unit: '×' });
    def(g, 'Glass', t, p + 'shine', 'Front shine', 'num', 1, { min: 0, max: 4, step: .05, unit: '×' });
    def(g, 'Glass', t, p + 'inner', 'Inner outline', 'num', 1, { min: 0, max: 2, step: .05, unit: '×' });
  } else {
    def(g, 'Glass', t, p + 'arc', 'Top shine arc', 'bool', true);
    def(g, 'Glass', t, p + 'seams', 'Seam lines', 'bool', true);
    def(g, 'Glass', t, p + 'glint', 'Glint', 'bool', true);
  }
  def(g, 'Icon', t, p + 'iconOn', 'Show icon', 'bool', true);
  def(g, 'Icon', t, p + 'iconSize', 'Icon size', 'num', s.icon, { min: .2, max: 2, step: .01, unit: 'of box' });
  def(g, 'Icon', t, p + 'iconX', 'Icon left / right', 'num', 0, { min: -.5, max: .5, step: .005, unit: 'of box' });
  def(g, 'Icon', t, p + 'iconY', 'Icon up / down', 'num', s.iconY, { min: -.5, max: .5, step: .005, unit: 'of box' });
  def(g, 'Icon', t, p + 'iconLine', 'Line thickness', 'num', 1, { min: .2, max: 4, step: .05, unit: '×' });
  def(g, 'Icon', t, p + 'iconGlow', 'Icon glow', 'num', 1, { min: 0, max: 5, step: .05, unit: '×' });
  def(g, 'Icon', t, p + 'iconCore', 'Core color', 'color', '#FFFFFF');
});


  },
  toolbar: [{ label: 'Replay', title: 'Play the rise-in again', onclick: () => replay() }, { label: 'Close', title: 'Play the close animation', onclick: () => closeDial() }, { label: 'Play exit', title: 'Play the dismantle the app runs after Messages is chosen, then come back', onclick: () => { ST.dis = 0; ST.disStay = true; } }],
  onSet(k) { P = sc.P; const reset = /^s([0-3])\.start$/.exec(k); if (reset) shapeMotion[+reset[1]] = window.RavenMotion.create(motionSettings(+reset[1])); if (/^s\d\.(x|y)$/.test(k) && !ST.grab && !ST.turn.on) { const m = metrics(); ST.angle = m.angles[ST.hi]; } },
  onLoad() { P = sc.P; shapeMotion.length = 0; if (!ST.grab) { const m = metrics(); ST.angle = m.angles[ST.hi]; } },
  onShow() { ST.dis = -1; replay(); },
  update(dt, now) {
    P = sc.P;
    for (let i = 0; i < 4; i++) window.RavenMotion.advance(motionState(i), motionSettings(i), dt);
    if (ST.rise.mode === 'fwd') { ST.rise.v = clamp((now - ST.rise.t0) / P['anim.rise'], 0, 1); if (ST.rise.v >= 1) ST.rise.mode = 'done'; }
    else if (ST.rise.mode === 'rev') { ST.rise.v = Math.max(0, ST.rise.from - (now - ST.rise.t0) / P['anim.close']); if (ST.rise.v <= 0) { ST.rise.mode = 'closed'; K.status('Dial closed. Press Close again or tap the screen to open it.'); } }
    if (ST.turn.on) { const p = clamp((now - ST.turn.t0) / P['feel.snap'], 0, 1); ST.angle = ST.turn.from + (ST.turn.to - ST.turn.from) * ease(p); if (p >= 1) { ST.turn.on = false; if (ST.armed && !ST.closing) { ST.armed = false; ST.ready = true; } } }
    if (ST.dis >= 0) { ST.dis = Math.min(1, ST.dis + dt / Math.max(.05, P['dis.seconds'])); if (ST.dis >= 1) { ST.dis = -1; if (ST.disStay) replay(); else K.show('directory'); } }
    ST.amb += dt; if (ST.active == null) ST.wob += dt * P['wobble.speed'];
    const motor = ST.idle || (P['ring.spinAfterGrab'] && !ST.grab);
    if (motor && P['ring.spinOn'] && ST.rise.v >= 1 && !ST.turn.on && !ST.closing) ST.spin += dt * TAU / Math.max(.5, P['ring.spinPeriod']) * P['ring.spinDir'];
  },
  draw(ctx, now, studio) {
    P = sc.P; const m = metrics(), H = K.H;
    const rv = ST.rise.v, t = ease(clamp(rv / Math.max(.01, P['anim.slide']), 0, 1));
    const ty = H * (1 - t); G.ty = ty; sc.ty = ty;
    const dp = ST.dis > 0 ? ST.dis : 0;
    if (dp > 0) { const n = Math.max(1, Math.round(P['dis.strips'])), W = K.W, clip = new Path2D(); for (let i = 0; i < n; i++) { const local = K.smooth((dp - i * P['dis.stagger']) / Math.max(.01, P['dis.sweep'])); clip.rect(0, H * i / n, W * (1 - local), H / n + .2); } ctx.save(); ctx.clip(clip); ctx.globalAlpha *= 1 - K.smooth((dp - P['dis.fadeStart']) / Math.max(.01, P['dis.fadeLen'])); }
    ctx.save(); ctx.translate(0, ty);
    drawGlass(ctx, m, t);
    const ps = pose(); G.pose = ps;
    ctx.save(); ctx.translate(m.cx, m.cy); ctx.transform(ps[0], ps[1], ps[2], ps[3], 0, 0); ctx.translate(-m.cx, -m.cy);
    drawRing(ctx, m, rv); ctx.restore();
    drawPointer(ctx, m);
    drawText(ctx, m, rv);
    for (let i = 0; i < 4; i++) { const s = m.st[i], e = alignment(m, ST.angle, i) * (ST.confirmed ? 1 : .7); drawShape(ctx, i, s.x - s.size / 2, s.y - s.size / 2, s.size, e, shapePhase(i)); }
    ctx.restore();
    if (dp > 0) { ctx.restore(); if (P['dis.lines']) drawDismantleLines(ctx, m, dp); }
    if (studio) { ctx.save(); ctx.translate(0, ty); K.hl(ctx, now); ctx.restore(); }
  },
  highlight(ctx, base, sub, H1, now) {
    P = sc.P; const m = metrics(), W = K.W, H = K.H; const strong = true;
  const c = { x: m.cx, y: m.cy }, u = m.thickness / 32, r = m.radius, th = m.thickness;
  const circ = rr => () => { ctx.beginPath(); ctx.arc(c.x, c.y, Math.max(1, rr), 0, TAU); };
  const box = (b, pad = 3) => () => { ctx.beginPath(); ctx.roundRect(b.x - pad, b.y - pad, b.w + pad * 2, b.h + pad * 2, 6); };
  const arcBand = (rr, w, s, sw) => () => { const a = rr + w / 2, b = Math.max(1, rr - w / 2); ctx.beginPath(); ctx.arc(c.x, c.y, a, s, s + sw); ctx.arc(c.x, c.y, b, s + sw, s, true); ctx.closePath(); };
  const ringPose = fn => { const ps = G.pose || [1, 0, 0, 1]; ctx.save(); ctx.translate(c.x, c.y); ctx.transform(ps[0], ps[1], ps[2], ps[3], 0, 0); ctx.translate(-c.x, -c.y); fn(); ctx.restore(); };
  const bands = G.bands || [];
  switch (base) {
    case 'bg': H1(() => { ctx.beginPath(); ctx.rect(3, 3 - G.ty, W - 6, H - 6); }); break;
    case 'exit': case 'exit.lines': H1(circ(r + th / 2 + 6)); for (let i = 0; i < 4; i++) { const st = m.st[i]; H1(() => { ctx.beginPath(); ctx.arc(st.x, st.y, st.size / 2 + 4, 0, TAU); }); } break;
    case 'dial': { let R = r + th; m.st.forEach(s => R = Math.max(R, Math.hypot(s.x - c.x, s.y - c.y) + s.size / 2)); H1(circ(R + 6)); break; }
    case 'glass': H1(() => { ctx.beginPath(); ctx.roundRect(m.glassLeft - 3, m.glassTop - 3, m.glassRight - m.glassLeft + 6, m.glassBottom - m.glassTop + 6, P['glass.round'] + 3); }); break;
    case 'glass.shine': H1(() => { ctx.beginPath(); ctx.roundRect(m.glassLeft + 18, m.glassTop - 5, (m.glassRight - m.glassLeft) * P['glass.shineLen'] - 14, 12, 4); }); break;
    case 'ring.all': case 'ring.spin': ringPose(() => { H1(circ(r + th / 2 + 2)); H1(circ(r - th / 2 - 2)); }); break;
    case 'ring.band': ringPose(() => bands.forEach((b, i) => { if (sub == null || +sub === i) H1(arcBand(b.rr, P['bands.width'] * u + 4, b.start, b.sweep)); })); break;
    case 'ring.edges': ringPose(() => bands.forEach(b => { if (sub !== 'out') H1(arcBand(b.rr - P['edges.offset'] * u, 3, b.start, b.sweep)); if (sub !== 'in') H1(arcBand(b.rr + P['edges.offset'] * u, 3, b.start, b.sweep)); })); break;
    case 'ring.streak': ringPose(() => bands.forEach(b => H1(arcBand(b.rr, P['streak.width'] * u + 4, b.start + P['streak.offset'] * D2R, b.sweep * P['streak.len'])))); break;
    case 'ring.depth': ringPose(() => { const rc = G.rear || c;
      if (sub === 'links') bands.forEach(b => [b.start, b.start + b.sweep].forEach(a => { const fx = c.x + Math.cos(a) * b.rr, fy = c.y + Math.sin(a) * b.rr, mx = fx + (rc.x - c.x) / 2, my = fy + (rc.y - c.y) / 2; H1(() => { ctx.beginPath(); ctx.arc(mx, my, Math.max(5, Math.hypot(rc.x - c.x, rc.y - c.y) / 2 + 3), 0, TAU); }); }));
      else bands.forEach(b => H1(() => { ctx.beginPath(); ctx.arc(rc.x, rc.y, b.rr + 2.5, b.start, b.start + b.sweep); ctx.arc(rc.x, rc.y, b.rr - 2.5, b.start + b.sweep, b.start, true); ctx.closePath(); })); }); break;
    case 'ring.contours': ringPose(() => { const o = P['contours.offset'] * u; if (sub !== 'back') { H1(circ(r + o)); H1(circ(r - o)); } if (sub !== 'front') { const rc = G.rear || c; [r + o, r - o].forEach(rr => H1(() => { ctx.beginPath(); ctx.arc(rc.x, rc.y, rr, 0, TAU); })); } }); break;
    case 'ring.bearing': ringPose(() => H1(arcBand(r - P['bearing.inset'] * u, 5, 0, TAU))); break;
    case 'ring.ticks': ringPose(() => { const rr = r + P['ticks.offset'] * u; H1(circ(rr + 2)); H1(circ(rr - Math.max(P['ticks.majorLen'], P['ticks.minorLen']) * u - 2)); }); break;
    case 'ring.markers': ringPose(() => m.angles.forEach(a => { const half = P['markers.len'] * D2R / 2; H1(arcBand(r - P['markers.inset'] * u, P['markers.width'] * u + 5, a - half, half * 2)); })); break;
    case 'ring.grab': ringPose(() => { const half = P['grab.len'] * D2R / 2; H1(arcBand(r + P['grab.offset'] * u, P['grab.width'] * u + 5, (G.phase || 0) - half, half * 2)); }); break;
    case 'pointer.dot': if (G.marker) H1(() => { ctx.beginPath(); ctx.arc(G.marker.x, G.marker.y, G.dot * 1.6 + 3, 0, TAU); }); break;
    case 'pointer.arrow': case 'pointer.grooves': { const p = ringPoint(c, r, 0, ST.angle); H1(() => { ctx.beginPath(); ctx.arc(p.x, p.y, th * .75 + 3, 0, TAU); }); break; }
    case 'pointer.ticks': m.angles.forEach(a => { const p = ringPoint(c, r + th / 2 + th * P['pticks.offset'], 0, a); H1(() => { ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(6, (r + th / 2) * P['pticks.len'] * D2R / 2 + 3), 0, TAU); }); }); break;
    case 'feel': H1(circ(r + th / 2)); H1(circ(r - th / 2)); break;
    case 'feel.inner': H1(circ(r - th / 2)); break;
    case 'text.raven': case 'text.title': case 'text.hint': { const b = G.text && G.text[base.split('.')[1]]; if (b) H1(box(b)); break; }
    case 'text.all': { const bs = Object.values(G.text || {}); if (bs.length) { const x = Math.min(...bs.map(b => b.x)), y = Math.min(...bs.map(b => b.y)), x2 = Math.max(...bs.map(b => b.x + b.w)), y2 = Math.max(...bs.map(b => b.y + b.h)); H1(box({ x, y, w: x2 - x, h: y2 - y }, 5)); } break; }
    case 'shape': { const s = m.st[+sub]; if (s) H1(box({ x: s.x - s.size / 2, y: s.y - s.size / 2, w: s.size, h: s.size }, 2)); break; }
  }

  },
  bounds(base, sub) {
    P = sc.P; const m = metrics(), W = K.W, H = K.H;

  const c = { x: m.cx, y: m.cy + G.ty }, r = m.radius, th = m.thickness;
  const sq = (x, y, s) => ({ x: x - s / 2, y: y - s / 2, s });
  if (!base) return sq(c.x, c.y, (r + th) * 2.6);
  if (base === 'bg') return { x: 0, y: (H - W) / 2, s: W };
  if (base === 'glass' || base === 'dial') return sq(c.x, c.y, Math.max(r * 3.4, 200));
  if (base === 'glass.shine') return sq(m.glassLeft + (m.glassRight - m.glassLeft) * .25, m.glassTop + G.ty, Math.max(120, (m.glassRight - m.glassLeft) * .55));
  if (base === 'pointer.dot' && G.marker) return sq(G.marker.x, G.marker.y + G.ty, Math.max(70, th * 3.2));
  if (base === 'pointer.arrow' || base === 'pointer.grooves') { const p = ringPoint(c, r, 0, ST.angle); return sq(p.x, p.y, Math.max(80, th * 3.2)); }
  if (base.startsWith('text')) { const k = base.split('.')[1]; const b = G.text && (k === 'all' ? null : G.text[k]); if (b) return sq(b.x + b.w / 2, b.y + b.h / 2 + G.ty, Math.max(b.w * 1.4, 110)); return sq(c.x, c.y, r * 1.6); }
  if (base === 'shape') { const s = m.st[+sub]; return sq(s.x, s.y + G.ty, s.size * 1.6); }
  if (base === 'ring.markers' || base === 'pointer.ticks' || base === 'feel' || base === 'feel.inner' || base === 'ring.all') return sq(c.x, c.y, (r + th) * 2.3);
  if (base === 'ring.band' && sub != null && G.bands && G.bands[+sub]) { const bd = G.bands[+sub], p = ringPoint(c, bd.rr, 0, bd.start + bd.sweep * .5); return sq(p.x, p.y, r * 1.15); }
  { const p = ringPoint(c, r, 0, ST.angle + .55); return sq(p.x, p.y, r * 1.15); }

  },
  pick(p) { P = sc.P; return pickPart(unRise(p)); },
  pointer: { down: (p, e) => { sc._flick = { x: p.x, y: p.y, t: performance.now(), lx: p.x, ly: p.y, lt: performance.now(), vx: 0, vy: 0 }; pDown(p, e); }, move: (p, e) => { const f = sc._flick; if (f) { const now = performance.now(), dt = Math.max(1, now - f.lt); f.vx = (p.x - f.lx) / dt * 1000; f.vy = (p.y - f.ly) / dt * 1000; f.lx = p.x; f.ly = p.y; f.lt = now; } pMove(p, e); }, up: (p, e) => { const f = sc._flick; sc._flick = null; if (f && !ST.didTurn) { const dy = p.y - f.y; if (dy > 60 && f.vy > 900 && Math.abs(f.vx) < f.vy * .6) { pCancel && pCancel(p, e); K.go('sky', { href: 'sleipnir-studio-1120.html#sky' }); return; } } pUp(p, e); }, cancel: pCancel },
});
sc.ST = ST; sc.metrics = () => { P = sc.P; return metrics(); }; sc.replay = replay; sc.closeDial = closeDial;
function pickPart(raw) {
  const m = metrics(), W = K.W, H = K.H;
  const p = raw, c = { x: m.cx, y: m.cy };
  for (let i = 0; i < 4; i++) { const s = m.st[i]; if (Math.abs(p.x - s.x) <= s.size / 2 && Math.abs(p.y - s.y) <= s.size / 2) return [SHAPES[i].tab + ' shape', 'Place']; }
  for (const [k, sec] of [['raven', 'RAVEN label'], ['title', 'Mode name'], ['hint', 'Hint line']]) { const b = G.text && G.text[k]; if (b && p.x >= b.x - 4 && p.x <= b.x + b.w + 4 && p.y >= b.y - 3 && p.y <= b.y + b.h + 3) return ['Text', sec]; }
  if (G.marker && dist(p, G.marker) < G.dot * 2.5 + 6) return ['Pointer', 'Dot'];
  const lr = toRing(m, p), d = dist(lr, c), u = m.thickness / 32;
  const ang = Math.atan2(lr.y - c.y, lr.x - c.x);
  if (Math.abs(wrap(ang - ST.angle)) < .2 && Math.abs(d - m.radius) <= m.thickness / 2 + 2) return ['Pointer', 'Arrow'];
  const tickR = m.radius + P['ticks.offset'] * u;
  if (d <= tickR + 3 && d >= tickR - P['ticks.majorLen'] * u - 3) return ['Ring', 'Tick marks'];
  if (Math.abs(d - (m.radius - P['markers.inset'] * u)) < 4) return ['Ring', 'Station markers'];
  if (Math.abs(d - (m.radius - P['bearing.inset'] * u)) < 3) return ['Ring', 'Bearing'];
  if (Math.abs(d - m.radius) <= m.thickness / 2 + 8) return ['Ring', 'Light bands'];
  if (d < m.radius - m.thickness / 2) return ['Text', 'Layout'];
  if (Math.abs(p.y - m.glassTop) < 8 || Math.abs(p.x - m.glassLeft) < 8 || Math.abs(p.x - m.glassRight) < 8) return ['Dial', 'Glass panel'];
  return ['Background', 'Mode'];
}


})();

