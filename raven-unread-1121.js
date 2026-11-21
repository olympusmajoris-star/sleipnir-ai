/* =====================================================================
   RAVEN UNREAD PEOPLE — studio layer on the Raven dial (studio 1121,
   not in the AsgardRaven Dart yet).
   People with unread messages stand above the dial as whole-body 3D
   figures (their real HoloWorker models), still, each with a comic
   speech bubble holding the whole message. 360 members can be spun.
   Edit by hand: drag a person to place them, drag a bubble to move it,
   drag a face from the tray (next to the close-up) onto the phone to
   add or swap someone. Every number is a control.
   ===================================================================== */
(() => {
'use strict';
const K = window.StudioKit, sc = K && K.screens && K.screens.dial;
if (!sc) return;
const { TAU, clamp, smooth, rgba } = K;
const G0 = 'Unread people';

/* ---------- people with real figures ---------- */
const PEOPLE = [
  { id: 'testwoman', name: 'Test Woman', is360: true, spin: true },
  { id: 'freya', name: 'Freya', is360: true, spin: true },
  { id: 'loki', name: 'Loki' },
  { id: 'sif', name: 'Sif' },
  { id: 'tyr', name: 'Tyr', spin: true },
  { id: 'baldr', name: 'Baldr', spin: true },
  { id: 'hel', name: 'Hel' },
];
const BY_ID = Object.fromEntries(PEOPLE.map(p => [p.id, p]));
const MAX = 6;
// who, message, x (of width), feet y (of height), height px, unread count, bubble side
const START = [
  ['testwoman', 'I sent you the photo', .12, .272, 168, 2, 'right', 8, -12],
  ['freya', 'That looks amazing', .88, .272, 164, 1, 'left', -8, -12],
  ['hel', "I'll be there at six", .27, .236, 112, 1, 'right', -12, 47],
  ['tyr', 'Training at dawn', .73, .236, 114, 3, 'left', 0, 106],
  ['loki', 'See you tonight?', .30, .20, 95, 1, 'above', 0, 0],
  ['sif', 'Hair appointment moved', .70, .20, 95, 2, 'above', 0, 0],
];

/* ---------- figure art (front frames from each person's 3D model) ---------- */
const ART = {};
function scan(im, n, f) {
  const fw = Math.floor(im.naturalWidth / n), fh = im.naturalHeight, c = document.createElement('canvas'); c.width = fw; c.height = fh;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, f * fw, 0, fw, fh, 0, 0, fw, fh);
  const d = x.getImageData(0, 0, fw, fh).data; let t = fh, b = 0, l = fw, r = 0;
  for (let y = 0; y < fh; y++) for (let xx = 0; xx < fw; xx++) if (d[(y * fw + xx) * 4 + 3] > 40) { if (y < t) t = y; if (y > b) b = y; if (xx < l) l = xx; if (xx > r) r = xx; }
  return b > t ? { fw, fh, t, b: b + 1, l, r: r + 1 } : { fw, fh, t: 0, b: fh, l: 0, r: fw };
}
function art(id) {
  if (ART[id]) return ART[id];
  const a = ART[id] = { prof: new Image(), spin: null, box: null, n: 25, sn: 48 };
  a.prof.onload = () => { a.box = scan(a.prof, a.n, 12); buildTray(); };
  a.prof.src = 'asgard/figs/' + id + '_profile.webp?v=1121u';
  if (BY_ID[id] && BY_ID[id].spin) { a.spin = new Image(); a.spin.src = 'asgard/figs/' + id + '_spin.webp?v=1121u'; }
  return a;
}
PEOPLE.forEach(p => art(p.id));
const ready = im => im && im.complete && im.naturalWidth > 0;

/* ---------- controls ---------- */
const ADD = [];
const def = (section, target, k, label, type, d, o = {}) => ADD.push(Object.assign({ group: G0, section, target, k, label, type, def: d }, o));
const NEW = 'Studio addition, not in the Dart yet.';
def('People', 'unread', 'un.on', 'Show unread people', 'bool', true, { info: 'People with unread messages stand above the dial with their message in a comic bubble. ' + NEW });
def('People', 'unread', 'un.count', 'How many on screen', 'int', 4, { min: 0, max: MAX, step: 1, info: 'Most unread people shown at once. Extra people wait their turn. You can also drag a face from the tray onto the phone to add one.' });
def('People', 'unread', 'un.scaleAll', 'Size of everyone', 'num', 1, { min: .3, max: 3, step: .01, unit: '×' });
def('People', 'unread', 'un.lock', 'Lock positions', 'bool', false, { info: 'On = dragging on the phone turns the dial instead of moving people.' });
def('People', 'unread', 'un.snap', 'Snap to grid', 'int', 0, { min: 0, max: 40, step: 1, unit: 'px', info: '0 = no snapping. Any other value snaps feet and bubbles to that grid while you drag.' });
def('People', 'unread', 'un.keepOn', 'Keep bubbles on screen', 'bool', true);
def('People', 'unread', 'un.tapStudio', 'Tap opens conversation in the studio', 'bool', false, { info: 'On the phone a tap on a person always opens their conversation. In the studio this is off so clicks do not leave the page while you place people.' });
def('People', 'unread', 'un.replay', 'Replay arrival', 'action', null, { onclick: () => { T0 = performance.now(); } });
for (let i = 0; i < MAX; i++) {
  const [who, msg, x, y, h, n, side, bx0, by0] = START[i], S = 'Person ' + (i + 1), t = 'unread.p:' + i, p = 'un.p' + i + '.';
  def(S, t, p + 'show', 'Show this person', 'bool', true);
  def(S, t, p + 'who', 'Who', 'select', who, { opts: PEOPLE.map(q => [q.id, q.name + (q.is360 ? ' (360)' : '')]), info: 'Their real 3D figure. Or drag a face from the tray onto this person.' });
  def(S, t, p + 'msg', 'Message', 'text', msg, { info: 'The whole message shows in the bubble. In the app this is their newest unread message.' });
  def(S, t, p + 'count', 'Unread count', 'int', n, { min: 0, max: 99, step: 1 });
  def(S, t, p + 'x', 'Left / right', 'num', x, { min: -.2, max: 1.2, step: .001, unit: 'of width', info: 'Or drag the person on the phone.' });
  def(S, t, p + 'y', 'Feet up / down', 'num', y, { min: 0, max: 1, step: .001, unit: 'of height' });
  def(S, t, p + 'h', 'Height', 'num', h, { min: 30, max: 700, step: 1, unit: 'px' });
  def(S, t, p + 'turn', 'Facing', 'num', 0, { min: -60, max: 60, step: 1, unit: '°', info: '0 = straight at you. Other values show the matching side of their real 3D model. They still stand still.' });
  def(S, t, p + 'flip', 'Mirror', 'bool', false);
  def(S, t, p + 'layer', 'In front / behind', 'int', i >= 2 ? -1 : 0, { min: -5, max: 5, step: 1, info: 'Higher = drawn in front of the others.' });
  def(S, t, p + 'spin', 'Spin 360 (360 members only)', 'bool', false, { info: 'Only people who paid for 360 can spin. Everyone else ignores this.' });
  def(S, t, p + 'spinSec', 'Seconds per spin', 'num', 8, { min: 1, max: 60, step: .5, unit: 's' });
  def(S, t, p + 'bSide', 'Bubble side', 'select', side, { opts: [['auto', 'Auto'], ['right', 'Right of head'], ['left', 'Left of head'], ['above', 'Above head']] });
  def(S, t, p + 'bx', 'Bubble left / right', 'num', bx0, { min: -300, max: 300, step: 1, unit: 'px', info: 'Or drag the bubble on the phone.' });
  def(S, t, p + 'by', 'Bubble up / down', 'num', by0, { min: -400, max: 400, step: 1, unit: 'px' });
  def(S, t, p + 'bScale', 'Bubble size', 'num', 1, { min: .4, max: 2.5, step: .01, unit: '×' });
}
// figure look
def('Figure look', 'unread', 'un.bright', 'Brightness', 'num', 1, { min: .3, max: 2, step: .01, unit: '×' });
def('Figure look', 'unread', 'un.contrast', 'Contrast', 'num', 1, { min: .3, max: 2, step: .01, unit: '×' });
def('Figure look', 'unread', 'un.sat', 'Color strength', 'num', 1, { min: 0, max: 2, step: .01, unit: '×' });
def('Figure look', 'unread', 'un.opacity', 'Opacity', 'num', 1, { min: .1, max: 1, step: .01 });
def('Figure look', 'unread', 'un.flicker', 'Flicker', 'num', 0, { min: 0, max: 1, step: .01, info: '0 = solid, like a real person standing there.' });
def('Figure look', 'unread', 'un.edge', 'Edge light', 'num', 0, { min: 0, max: 1, step: .01, info: 'A thin light around the body. 0 = none.' });
def('Figure look', 'unread', 'un.edgeColor', 'Edge light color', 'color', '#5FD8FF');
def('Figure look', 'unread', 'un.edgeBlur', 'Edge light softness', 'num', 4, { min: 0, max: 20, step: .5, unit: 'px' });
def('Figure look', 'unread', 'un.shadow', 'Shadow under feet', 'bool', true);
def('Figure look', 'unread', 'un.shadowOp', 'Shadow darkness', 'num', .5, { min: 0, max: 1, step: .01 });
def('Figure look', 'unread', 'un.shadowW', 'Shadow width', 'num', .9, { min: .2, max: 2.5, step: .01, unit: 'of body' });
def('Figure look', 'unread', 'un.shadowH', 'Shadow depth', 'num', .06, { min: .01, max: .3, step: .005, unit: 'of height' });
// bubble shape
def('Bubble shape', 'unread.bubble', 'un.b.style', 'Bubble style', 'select', 'round', { opts: [['oval', 'Comic oval'], ['round', 'Rounded box'], ['cloud', 'Thought cloud'], ['box', 'Square box']] });
def('Bubble shape', 'unread.bubble', 'un.b.fill', 'Fill color', 'color', '#FFFFFF');
def('Bubble shape', 'unread.bubble', 'un.b.fillOp', 'Fill opacity', 'num', 1, { min: 0, max: 1, step: .01 });
def('Bubble shape', 'unread.bubble', 'un.b.line', 'Outline color', 'color', '#111111');
def('Bubble shape', 'unread.bubble', 'un.b.lineW', 'Outline width', 'num', 2, { min: 0, max: 8, step: .1, unit: 'px' });
def('Bubble shape', 'unread.bubble', 'un.b.round', 'Corner roundness', 'num', 14, { min: 0, max: 60, step: 1, unit: 'px', info: 'Rounded box only.' });
def('Bubble shape', 'unread.bubble', 'un.b.padX', 'Inside space sides', 'num', 12, { min: 2, max: 50, step: 1, unit: 'px' });
def('Bubble shape', 'unread.bubble', 'un.b.padY', 'Inside space top / bottom', 'num', 8, { min: 2, max: 50, step: 1, unit: 'px' });
def('Bubble shape', 'unread.bubble', 'un.b.maxW', 'Widest line', 'num', 128, { min: 60, max: 360, step: 1, unit: 'px', info: 'Text wraps onto more lines past this width. The whole message always shows.' });
def('Bubble shape', 'unread.bubble', 'un.b.gap', 'Distance from head', 'num', 8, { min: -40, max: 120, step: 1, unit: 'px' });
def('Bubble shape', 'unread.bubble', 'un.b.tilt', 'Tilt', 'num', 0, { min: -20, max: 20, step: .5, unit: '°' });
def('Bubble shape', 'unread.bubble', 'un.b.opacity', 'Bubble opacity', 'num', 1, { min: .1, max: 1, step: .01 });
def('Bubble shape', 'unread.bubble', 'un.b.shadow', 'Drop shadow', 'bool', true);
def('Bubble shape', 'unread.bubble', 'un.b.shadowColor', 'Shadow color', 'color', '#000000');
def('Bubble shape', 'unread.bubble', 'un.b.shadowOp', 'Shadow strength', 'num', .35, { min: 0, max: 1, step: .01 });
def('Bubble shape', 'unread.bubble', 'un.b.shadowBlur', 'Shadow softness', 'num', 8, { min: 0, max: 30, step: .5, unit: 'px' });
def('Bubble shape', 'unread.bubble', 'un.b.shadowY', 'Shadow drop', 'num', 3, { min: -20, max: 20, step: .5, unit: 'px' });
// tail
def('Bubble tail', 'unread.bubble', 'un.t.on', 'Tail', 'bool', true);
def('Bubble tail', 'unread.bubble', 'un.t.w', 'Tail width at bubble', 'num', 16, { min: 2, max: 60, step: 1, unit: 'px' });
def('Bubble tail', 'unread.bubble', 'un.t.len', 'Tail reach toward mouth', 'num', .8, { min: .1, max: 1, step: .01, info: '1 = the tip touches the person.' });
def('Bubble tail', 'unread.bubble', 'un.t.bend', 'Tail curve', 'num', .25, { min: -1, max: 1, step: .01 });
def('Bubble tail', 'unread.bubble', 'un.t.aimY', 'Tail aims at', 'num', .1, { min: 0, max: .5, step: .005, unit: 'down the body', info: 'Where on the body the tail points. About 0.1 = mouth.' });
// text
def('Bubble text', 'unread.bubble', 'un.f.font', 'Font', 'select', 'Comic Neue', { opts: [['Comic Neue', 'Comic Neue'], ['Bangers', 'Bangers (comic caps)'], ['Patrick Hand', 'Patrick Hand (handwritten)'], ['Roboto', 'Roboto (app font)']] });
def('Bubble text', 'unread.bubble', 'un.f.size', 'Text size', 'num', 14, { min: 8, max: 36, step: .5, unit: 'px' });
def('Bubble text', 'unread.bubble', 'un.f.weight', 'Weight', 'select', '700', { opts: [['400', 'Regular'], ['700', 'Bold']] });
def('Bubble text', 'unread.bubble', 'un.f.color', 'Text color', 'color', '#111111');
def('Bubble text', 'unread.bubble', 'un.f.lh', 'Line spacing', 'num', 1.15, { min: .8, max: 2, step: .01, unit: '×' });
def('Bubble text', 'unread.bubble', 'un.f.align', 'Alignment', 'select', 'center', { opts: [['center', 'Center'], ['left', 'Left']] });
def('Bubble text', 'unread.bubble', 'un.f.caps', 'ALL CAPS', 'bool', false);
def('Bubble text', 'unread.bubble', 'un.f.name', 'Name on top', 'bool', true);
def('Bubble text', 'unread.bubble', 'un.f.nameColor', 'Name color', 'color', '#0B6BCB');
def('Bubble text', 'unread.bubble', 'un.f.nameSize', 'Name size', 'num', 12, { min: 7, max: 30, step: .5, unit: 'px' });
// badge
def('Unread badge', 'unread.badge', 'un.u.on', 'Unread count badge', 'bool', true);
def('Unread badge', 'unread.badge', 'un.u.where', 'Sits on', 'select', 'bubble', { opts: [['bubble', 'Bubble corner'], ['head', 'Above head']] });
def('Unread badge', 'unread.badge', 'un.u.color', 'Badge color', 'color', '#FF3B30');
def('Unread badge', 'unread.badge', 'un.u.text', 'Number color', 'color', '#FFFFFF');
def('Unread badge', 'unread.badge', 'un.u.size', 'Badge size', 'num', 18, { min: 8, max: 44, step: .5, unit: 'px' });
// arrival
def('Arrival', 'unread', 'un.a.style', 'How people appear', 'select', 'rise', { opts: [['fade', 'Fade in'], ['rise', 'Rise in'], ['pop', 'Pop in'], ['beam', 'Build up from the feet'], ['none', 'Already there']] });
def('Arrival', 'unread', 'un.a.wait', 'Start after page opens', 'int', 2800, { min: 0, max: 8000, step: 10, unit: 'ms', info: 'Default waits for the dial to finish building.' });
def('Arrival', 'unread', 'un.a.dur', 'Appear time', 'int', 700, { min: 50, max: 4000, step: 10, unit: 'ms' });
def('Arrival', 'unread', 'un.a.gap', 'Delay between people', 'int', 220, { min: 0, max: 2000, step: 10, unit: 'ms' });
def('Arrival', 'unread', 'un.a.bubble', 'How bubbles appear', 'select', 'pop', { opts: [['pop', 'Pop'], ['fade', 'Fade'], ['type', 'Type out the words'], ['none', 'With the person']] });
def('Arrival', 'unread', 'un.a.bubbleDelay', 'Bubble delay after person', 'int', 150, { min: 0, max: 3000, step: 10, unit: 'ms' });
def('Arrival', 'unread', 'un.a.loop', 'Replay on a loop while editing', 'bool', false, { info: 'Studio only.' });

// put the tab first and open on it
sc.SPEC.unshift(...ADD);
ADD.forEach(s => { sc.DEF[s.k] = s.def; sc.P[s.k] = s.def; });
sc.ui.group = G0; sc.ui.section = 'People';

/* ---------- fonts ---------- */
try { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Bangers&family=Comic+Neue:wght@400;700&family=Patrick+Hand&display=swap'; document.head.appendChild(l); } catch (e) {}

/* ---------- layout + draw ---------- */
let T0 = performance.now();
const L = { figs: [], bubs: [] };
const P = () => sc.P;
const off = document.createElement('canvas'), ox = off.getContext('2d');

function slots() {
  const p = P(), n = clamp(Math.round(p['un.count']), 0, MAX), out = [];
  for (let i = 0; i < n; i++) { const q = 'un.p' + i + '.'; if (!p[q + 'show']) continue; out.push({ i, q, who: BY_ID[p[q + 'who']] || PEOPLE[0], layer: p[q + 'layer'], fy: p[q + 'y'] }); }
  return out;
}
function figGeom(s) {
  const p = P(), a = art(s.who.id), box = a.box; if (!box) return null;
  const H = p[s.q + 'h'] * p['un.scaleAll'], k = H / Math.max(1, box.b - box.t);
  const X = p[s.q + 'x'] * K.W, Y = p[s.q + 'y'] * K.H, w = (box.r - box.l) * k;
  return { X, Y, H, k, w, top: Y - H, box, a };
}
function arrival(i, order, now) {
  const p = P(); if (p['un.a.style'] === 'none') return { u: 1, b: 1, chars: Infinity };
  const el = now - T0 - p['un.a.wait'] - order * p['un.a.gap'];
  const u = clamp(el / Math.max(1, p['un.a.dur']), 0, 1);
  const bs = el - p['un.a.dur'] * .6 - p['un.a.bubbleDelay'];
  const b = p['un.a.bubble'] === 'none' ? u : clamp(bs / 280, 0, 1);
  return { u, b, chars: p['un.a.bubble'] === 'type' ? Math.max(0, Math.floor(bs / 32)) : Infinity, bs };
}
function frameOf(s, g, now) {
  const p = P(), a = g.a, spin = s.who.is360 && p[s.q + 'spin'] && ready(a.spin);
  if (spin) { const pos = ((now / 1000) / Math.max(.5, p[s.q + 'spinSec']) % 1) * a.sn, f0 = Math.floor(pos) % a.sn; return { im: a.spin, n: a.sn, f0, f1: (f0 + 1) % a.sn, mix: pos - Math.floor(pos) }; }
  const mid = (a.n - 1) / 2, pos = clamp(mid + clamp(p[s.q + 'turn'], -60, 60) / 60 * mid, 0, a.n - 1), f0 = Math.floor(pos);
  return { im: a.prof, n: a.n, f0, f1: Math.min(f0 + 1, a.n - 1), mix: pos - f0 };
}
function drawFigure(ctx, s, g, now, ar) {
  const p = P(), fr = frameOf(s, g, now), fw = Math.floor(fr.im.naturalWidth / fr.n), fh = fr.im.naturalHeight, k = g.k;
  const dw = fw * k, dh = fh * k, cx = (g.box.l + g.box.r) / 2 * k, dx = g.X - cx, dy = g.Y - g.box.b * k;
  let alpha = p['un.opacity'], yOff = 0, sc0 = 1, reveal = 1; const e = smooth(ar.u), st = p['un.a.style'];
  if (st === 'fade') alpha *= e; else if (st === 'rise') { alpha *= e; yOff = (1 - e) * 40; } else if (st === 'pop') { alpha *= e; sc0 = .6 + .4 * e; } else if (st === 'beam') { reveal = e; alpha *= Math.min(1, e * 4); }
  if (p['un.flicker'] > 0) { const ph = now / 1000 * TAU * 6 + s.i * 1.7; alpha *= 1 - p['un.flicker'] * .25 * (1 + Math.sin(ph) * Math.sin(ph * 2.3 + 1)) / 2; }
  if (alpha <= .001) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.translate(g.X, g.Y + yOff); ctx.scale(sc0, sc0); if (p[s.q + 'flip']) ctx.scale(-1, 1); ctx.translate(-g.X, -g.Y);
  if (p['un.shadow']) { const rx = g.w * p['un.shadowW'] / 2, ry = Math.max(2, g.H * p['un.shadowH'] / 2), gr = ctx.createRadialGradient(g.X, g.Y, 0, g.X, g.Y, rx);
    gr.addColorStop(0, `rgba(0,0,0,${p['un.shadowOp']})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.save(); ctx.translate(g.X, g.Y); ctx.scale(1, ry / rx); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill(); ctx.restore(); }
  if (reveal < 1) { const ry = g.Y - (g.Y - (dy)) * reveal; ctx.beginPath(); ctx.rect(dx - 20, ry, dw + 40, g.Y - ry + 4); ctx.save(); ctx.clip(); }
  const put = (f, a) => { if (a <= .002) return; ctx.globalAlpha *= a; ctx.drawImage(fr.im, f * fw, 0, fw, fh, dx, dy, dw, dh); ctx.globalAlpha /= a; };
  if (p['un.edge'] > 0) {
    const kk = K.scaleOf(ctx), cw = Math.max(2, Math.ceil(dw * kk)), ch = Math.max(2, Math.ceil(dh * kk));
    if (off.width < cw || off.height < ch) { off.width = Math.max(off.width, cw); off.height = Math.max(off.height, ch); }
    ox.setTransform(1, 0, 0, 1, 0, 0); ox.globalCompositeOperation = 'source-over'; ox.clearRect(0, 0, off.width, off.height); ox.drawImage(fr.im, fr.f0 * fw, 0, fw, fh, 0, 0, cw, ch);
    ox.globalCompositeOperation = 'source-in'; ox.fillStyle = p['un.edgeColor']; ox.fillRect(0, 0, cw, ch); ox.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.globalAlpha *= p['un.edge']; ctx.filter = `blur(${(p['un.edgeBlur'] * kk).toFixed(2)}px)`; ctx.drawImage(off, 0, 0, cw, ch, dx, dy, dw, dh); ctx.restore();
  }
  ctx.filter = `brightness(${p['un.bright']}) contrast(${p['un.contrast']}) saturate(${p['un.sat']})`;
  put(fr.f0, 1); if (fr.f1 !== fr.f0) put(fr.f1, fr.mix);
  ctx.filter = 'none';
  if (reveal < 1) { ctx.restore(); const ry = g.Y - (g.Y - dy) * reveal; ctx.globalAlpha = Math.min(1, ctx.globalAlpha * 2); ctx.fillStyle = 'rgba(220,245,255,.9)'; ctx.fillRect(dx, ry - 1, dw, 2); }
  ctx.restore();
}
function wrapText(ctx, text, maxW) {
  const words = String(text || '').split(/\s+/).filter(Boolean), lines = []; let line = '';
  for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line); return lines.length ? lines : [''];
}
function fontOf(size, weight, fam) { return `${weight} ${size}px "${fam}", ${fam === 'Roboto' ? 'Roboto, ' : ''}system-ui, sans-serif`; }
function bubbleLayout(ctx, s, g) {
  const p = P(), z = p[s.q + 'bScale'], fs = p['un.f.size'] * z, fam = p['un.f.font'], wt = p['un.f.weight'];
  let msg = p[s.q + 'msg']; if (p['un.f.caps']) msg = String(msg).toUpperCase();
  ctx.save(); ctx.font = fontOf(fs, wt, fam); const lines = wrapText(ctx, msg, p['un.b.maxW'] * z); const tw = Math.max(...lines.map(l => ctx.measureText(l).width));
  let nw = 0, nh = 0; if (p['un.f.name']) { ctx.font = fontOf(p['un.f.nameSize'] * z, 700, fam); nw = ctx.measureText(s.who.name).width; nh = p['un.f.nameSize'] * z * 1.2; } ctx.restore();
  const lh = fs * p['un.f.lh'], cw = Math.max(tw, nw), ch = nh + lines.length * lh;
  let w = cw + p['un.b.padX'] * 2 * z, h = ch + p['un.b.padY'] * 2 * z, style = p['un.b.style'];
  if (style === 'oval') { w *= 1.22; h *= 1.5; } else if (style === 'cloud') { w += 14 * z; h += 14 * z; }
  const headX = g.X, headY = g.top + g.H * .06, headR = Math.max(8, g.w * .22);
  let side = p[s.q + 'bSide']; if (side === 'auto') side = g.X < K.W / 2 ? 'right' : 'left';
  const gap = p['un.b.gap'] * z; let cx, cy;
  if (side === 'above') { cx = headX; cy = g.top - gap - h / 2 - 10 * z; }
  else { const dir = side === 'right' ? 1 : -1; cx = headX + dir * (headR + gap + w / 2); cy = headY - h * .35; }
  cx += p[s.q + 'bx']; cy += p[s.q + 'by'];
  if (p['un.keepOn']) { cx = clamp(cx, w / 2 + 4, K.W - w / 2 - 4); cy = clamp(cy, h / 2 + 4, K.H - h / 2 - 4); }
  const aim = { x: headX + (side === 'left' ? -1 : side === 'right' ? 1 : 0) * headR * .35, y: g.top + g.H * p['un.t.aimY'] };
  return { cx, cy, w, h, lines, lh, fs, nh, z, side, aim, style, fam, wt };
}
function bodyPath(ctx, b) {
  const p = P(), x = b.cx - b.w / 2, y = b.cy - b.h / 2;
  ctx.beginPath();
  if (b.style === 'oval') ctx.ellipse(b.cx, b.cy, b.w / 2, b.h / 2, 0, 0, TAU);
  else if (b.style === 'box') ctx.rect(x, y, b.w, b.h);
  else if (b.style === 'cloud') {
    const r = Math.max(6, 11 * b.z), ix = x + r * .6, iy = y + r * .6, iw = b.w - r * 1.2, ih = b.h - r * 1.2; ctx.rect(ix, iy, iw, ih);
    const per = 2 * (iw + ih), n = Math.max(8, Math.round(per / (r * 1.35)));
    for (let k = 0; k < n; k++) { let d = k / n * per, px, py; if (d < iw) { px = ix + d; py = iy; } else if ((d -= iw) < ih) { px = ix + iw; py = iy + d; } else if ((d -= ih) < iw) { px = ix + iw - d; py = iy + ih; } else { d -= iw; px = ix; py = iy + ih - d; }
      const rr = r * (.85 + .3 * Math.abs(Math.sin(k * 2.17))); ctx.moveTo(px + rr, py); ctx.arc(px, py, rr, 0, TAU); }
  } else ctx.roundRect(x, y, b.w, b.h, Math.min(p['un.b.round'] * b.z, b.h / 2, b.w / 2));
}
function tailPath(ctx, b) {
  const p = P(); ctx.beginPath(); if (!p['un.t.on']) return false;
  {
    const dx = b.aim.x - b.cx, dy = b.aim.y - b.cy, L0 = Math.hypot(dx, dy) || 1, ux = dx / L0, uy = dy / L0;
    const edge = Math.min(Math.abs((b.w / 2) / (ux || 1e-6)), Math.abs((b.h / 2) / (uy || 1e-6))) * (b.style === 'oval' ? .82 : 1);
    const bx = b.cx + ux * edge * .7, by = b.cy + uy * edge * .7, tl = Math.max(0, L0 - edge) * p['un.t.len'] + edge * .3;
    const tx = b.cx + ux * (edge + tl - edge * .3), ty = b.cy + uy * (edge + tl - edge * .3), tw = p['un.t.w'] * b.z / 2, nx = -uy, ny = ux, bend = p['un.t.bend'] * tl * .5;
    if (b.style === 'cloud') { for (const [f, rr] of [[.45, .32], [.8, .2]]) { const px = bx + (tx - bx) * f, py = by + (ty - by) * f, R = tw * rr * 2.2; ctx.moveTo(px + R, py); ctx.arc(px, py, R, 0, TAU); } }
    else { ctx.moveTo(bx + nx * tw, by + ny * tw); ctx.quadraticCurveTo((bx + tx) / 2 + nx * bend, (by + ty) / 2 + ny * bend, tx, ty); ctx.quadraticCurveTo((bx + tx) / 2 + nx * bend * .6, (by + ty) / 2 + ny * bend * .6, bx - nx * tw, by - ny * tw); ctx.closePath(); }
  }
  return true;
}
function drawBubble(ctx, s, g, b, ar, count) {
  const p = P(); if (ar.b <= 0 && p['un.a.bubble'] !== 'type') return; if (p['un.a.bubble'] === 'type' && ar.bs < 0) return;
  let sc0 = 1, alpha = p['un.b.opacity'];
  if (p['un.a.bubble'] === 'pop') { const t = ar.b; sc0 = t < 1 ? .3 + .7 * (1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2)) : 1; alpha *= Math.min(1, t * 3); }
  else if (p['un.a.bubble'] === 'fade' || p['un.a.bubble'] === 'none') alpha *= ar.b;
  if (alpha <= .001) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.translate(b.cx, b.cy); ctx.rotate(p['un.b.tilt'] * Math.PI / 180); ctx.scale(sc0, sc0); ctx.translate(-b.cx, -b.cy);
  const lw = p['un.b.lineW'];
  const both = fn => { if (tailPath(ctx, b)) fn(); bodyPath(ctx, b); fn(); };
  if (p['un.b.shadow'] && p['un.b.shadowOp'] > 0) { ctx.save(); ctx.shadowColor = rgba(p['un.b.shadowColor'], p['un.b.shadowOp']); ctx.shadowBlur = p['un.b.shadowBlur'] * K.scaleOf(ctx); ctx.shadowOffsetY = p['un.b.shadowY'] * K.scaleOf(ctx); ctx.fillStyle = rgba(p['un.b.fill'], Math.max(.01, p['un.b.fillOp'])); both(() => ctx.fill()); ctx.restore(); }
  if (lw > 0) { ctx.lineJoin = 'round'; ctx.lineWidth = lw * 2; ctx.strokeStyle = p['un.b.line']; both(() => ctx.stroke()); }
  ctx.fillStyle = rgba(p['un.b.fill'], p['un.b.fillOp']); both(() => ctx.fill());
  // words
  ctx.textBaseline = 'middle'; ctx.font = fontOf(b.fs, b.wt, b.fam); const left = p['un.f.align'] === 'left', tx = left ? b.cx - Math.max(0, ...b.lines.map(l => ctx.measureText(l).width)) / 2 : b.cx;
  ctx.textAlign = left ? 'left' : 'center';
  let y = b.cy - (b.nh + b.lines.length * b.lh) / 2;
  if (b.nh) { ctx.font = fontOf(p['un.f.nameSize'] * b.z, 700, b.fam); ctx.fillStyle = p['un.f.nameColor']; ctx.fillText(s.who.name, tx, y + b.nh / 2); y += b.nh; }
  ctx.font = fontOf(b.fs, b.wt, b.fam); ctx.fillStyle = p['un.f.color']; let left2 = ar.chars;
  for (const l of b.lines) { const show = left2 >= l.length ? l : l.slice(0, Math.max(0, left2)); left2 -= l.length + 1; if (show) ctx.fillText(show, tx, y + b.lh / 2); y += b.lh; }
  ctx.restore();
  if (p['un.u.on'] && count > 0 && p['un.u.where'] === 'bubble') badge(ctx, b.cx + b.w / 2 * (b.style === 'oval' ? .72 : .96), b.cy - b.h / 2 * (b.style === 'oval' ? .72 : .96), count, alpha);
}
function badge(ctx, x, y, n, alpha) {
  const p = P(), r = p['un.u.size'] / 2, t = n > 99 ? '99+' : String(n);
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = p['un.u.color']; ctx.beginPath(); ctx.roundRect(x - Math.max(r, r * .55 * t.length + 3), y - r, Math.max(r, r * .55 * t.length + 3) * 2, r * 2, r); ctx.fill();
  ctx.fillStyle = p['un.u.text']; ctx.font = `700 ${(r * 1.15).toFixed(1)}px Roboto, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, x, y + .5); ctx.restore();
}
function drawUnread(ctx, now) {
  const p = P(); L.figs = []; L.bubs = [];
  if (!p['un.on']) return;
  if (p['un.a.loop']) { const n = slots().length, total = p['un.a.wait'] + n * p['un.a.gap'] + p['un.a.dur'] + 2600; if (now - T0 > total) T0 = now; }
  const list = slots().map((s, order) => ({ s, order, g: figGeom(s) })).filter(o => o.g);
  list.sort((a, b) => (a.s.layer - b.s.layer) || (a.g.Y - b.g.Y));
  for (const o of list) { const ar = arrival(o.s.i, o.order, now); o.ar = ar; drawFigure(ctx, o.s, o.g, now, ar); L.figs.push({ i: o.s.i, x: o.g.X - o.g.w / 2, y: o.g.top, w: o.g.w, h: o.g.H }); }
  for (const o of list) {
    const b = bubbleLayout(ctx, o.s, o.g), cnt = p[o.s.q + 'count']; drawBubble(ctx, o.s, o.g, b, o.ar, cnt);
    if (p['un.u.on'] && cnt > 0 && p['un.u.where'] === 'head') badge(ctx, o.g.X, o.g.top - p['un.u.size'], cnt, smooth(o.ar.u));
    L.bubs.push({ i: o.s.i, x: b.cx - b.w / 2, y: b.cy - b.h / 2, w: b.w, h: b.h });
  }
}

/* ---------- hook into the dial screen ---------- */
const draw0 = sc.draw;
sc.draw = function (ctx, now, studio) {
  draw0.call(this, ctx, now, studio);
  try { drawUnread(ctx, now); } catch (e) { console.error(e); }
  if (studio && (K.currentTarget ? K.currentTarget() : '').startsWith('unread')) K.hl(ctx, now);
};
const inside = (p, r, pad = 0) => p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad;
function hit(p) {
  if (!P()['un.on']) return null;
  for (let k = L.bubs.length - 1; k >= 0; k--) if (inside(p, L.bubs[k], 2)) return { kind: 'bubble', i: L.bubs[k].i };
  for (let k = L.figs.length - 1; k >= 0; k--) { const f = L.figs[k]; if (inside(p, { x: f.x + f.w * .1, y: f.y, w: f.w * .8, h: f.h }, 2)) return { kind: 'fig', i: f.i }; }
  return null;
}
const hl0 = sc.highlight;
sc.highlight = function (ctx, base, sub, H1, now) {
  if (!String(base).startsWith('unread')) return hl0.call(this, ctx, base, sub, H1, now);
  const box = r => () => { ctx.beginPath(); ctx.roundRect(r.x - 3, r.y - 3, r.w + 6, r.h + 6, 8); };
  if (base === 'unread.p') { const f = L.figs.find(q => q.i === +sub), b = L.bubs.find(q => q.i === +sub); if (f) H1(box(f)); if (b) H1(box(b)); return; }
  if (base === 'unread.bubble' || base === 'unread.badge') { L.bubs.forEach(b => H1(box(b))); return; }
  L.figs.forEach(f => H1(box(f)));
};
const bounds0 = sc.bounds;
sc.bounds = function (base, sub) {
  if (!String(base).startsWith('unread')) return bounds0.call(this, base, sub);
  let rs = base === 'unread.p' ? [...L.figs, ...L.bubs].filter(r => r.i === +sub) : base === 'unread' ? L.figs.concat(L.bubs) : L.bubs;
  if (!rs.length) return bounds0.call(this, null, null);
  const x = Math.min(...rs.map(r => r.x)), y = Math.min(...rs.map(r => r.y)), x2 = Math.max(...rs.map(r => r.x + r.w)), y2 = Math.max(...rs.map(r => r.y + r.h)), s = Math.max(x2 - x, y2 - y) * 1.15 + 20;
  return { x: (x + x2) / 2 - s / 2, y: (y + y2) / 2 - s / 2, s };
};
const pick0 = sc.pick;
sc.pick = function (p) { const h = hit(p); if (h) return [G0, h.kind === 'bubble' ? 'Bubble shape' : 'Person ' + (h.i + 1)]; return pick0.call(this, p); };

let drag = null;
const snap = v => { const g = P()['un.snap']; return g > 0 ? Math.round(v / g) * g : v; };
const ptr0 = sc.pointer;
sc.pointer = {
  down(p, e) {
    const h = hit(p);
    if (!h) return ptr0.down(p, e);
    const q = 'un.p' + h.i + '.', P0 = P();
    drag = { h, q, sx: p.x, sy: p.y, moved: false, edit: !K.viewOnly && !P0['un.lock'], x0: P0[q + 'x'], y0: P0[q + 'y'], bx0: P0[q + 'bx'], by0: P0[q + 'by'] };
    if (drag.edit) K.openSection(G0, h.kind === 'bubble' ? 'Person ' + (h.i + 1) : 'Person ' + (h.i + 1));
  },
  move(p, e) {
    if (!drag) return ptr0.move(p, e);
    const dx = p.x - drag.sx, dy = p.y - drag.sy; if (Math.hypot(dx, dy) > 4) drag.moved = true;
    if (!drag.edit || !drag.moved) return;
    if (drag.h.kind === 'fig') { K.setVal(drag.q + 'x', +(snap(drag.x0 * K.W + dx) / K.W).toFixed(4)); K.setVal(drag.q + 'y', +(snap(drag.y0 * K.H + dy) / K.H).toFixed(4)); }
    else { K.setVal(drag.q + 'bx', Math.round(snap(drag.bx0 + dx))); K.setVal(drag.q + 'by', Math.round(snap(drag.by0 + dy))); }
  },
  up(p, e) {
    if (!drag) return ptr0.up(p, e);
    const d = drag; drag = null;
    if (d.moved && d.edit) { if (K.commit) K.commit(); return; }
    if (!d.moved && (K.viewOnly || P()['un.tapStudio'])) { const who = BY_ID[P()[d.q + 'who']]; const conv = K.screens.conversation; if (conv) { conv.withName = who ? who.name : ''; K.show('conversation'); } else K.status('Tapped ' + (who ? who.name : '') + ': opens their conversation in the app.'); }
  },
  cancel(p, e) { if (drag) { drag = null; return; } ptr0.cancel && ptr0.cancel(p, e); },
};
sc.toolbar = (sc.toolbar || []).map(t => t.label === 'Replay' ? Object.assign({}, t, { onclick: () => { t.onclick(); T0 = performance.now(); } }) : t);
sc.toolbar.push({ label: 'Replay people', title: 'Play the unread people arriving again', onclick: () => { T0 = performance.now(); } });
const show0 = sc.onShow, hide0 = sc.onHide;
sc.onShow = function () { if (show0) show0.call(this); T0 = performance.now(); buildTray(); tray(true); };
sc.onHide = function () { if (hide0) hide0.call(this); tray(false); };

/* ---------- tray: drag a face onto the phone ---------- */
let trayEl = null;
function tray(on) { if (!trayEl) buildTray(); if (trayEl) trayEl.style.display = on && !K.viewOnly ? '' : 'none'; }
function thumb(id) {
  const a = art(id), c = document.createElement('canvas'); c.width = 64; c.height = 112; c.draggable = true; c.title = 'Drag onto the phone';
  c.style.cssText = 'background:#0c1219;border:1px solid #233142;border-radius:8px;cursor:grab;width:48px;height:84px';
  if (a.box && ready(a.prof)) { const x = c.getContext('2d'), b = a.box, fw = Math.floor(a.prof.naturalWidth / a.n), k = Math.min(100 / (b.b - b.t), 58 / (b.r - b.l)); x.drawImage(a.prof, 12 * fw, 0, fw, a.prof.naturalHeight, 32 - (b.l + b.r) / 2 * k, 106 - b.b * k, fw * k, a.prof.naturalHeight * k); }
  c.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', 'unread:' + id); e.dataTransfer.effectAllowed = 'copy'; });
  c.addEventListener('click', () => placePerson(id, null));
  return c;
}
function buildTray() {
  const host = document.getElementById('zoomBox'); if (!host) return;
  if (!trayEl) {
    trayEl = document.createElement('div'); trayEl.id = 'unTray';
    trayEl.style.cssText = 'background:#111821;border:1px solid #233142;border-radius:12px;padding:8px 10px;display:none';
    host.insertBefore(trayEl, host.firstChild);
    const stage = document.getElementById('stage');
    stage.addEventListener('dragover', e => { if (K.cur === sc) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } });
    stage.addEventListener('drop', e => { const d = e.dataTransfer.getData('text/plain') || ''; if (K.cur !== sc || !d.startsWith('unread:')) return; e.preventDefault(); const r = stage.getBoundingClientRect(); placePerson(d.slice(7), { x: (e.clientX - r.left) / r.width * K.W, y: (e.clientY - r.top) / r.height * K.H }); });
  }
  trayEl.innerHTML = '<div style="font-weight:500;margin-bottom:6px">Unread people · drag a face onto the phone</div><div style="color:#8ea3b8;font-size:12px;margin-bottom:6px">Drop on a person to swap them, or on an empty spot to add one. Drag people and bubbles on the phone to place them.</div>';
  const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap';
  PEOPLE.forEach(q => { const w = document.createElement('div'); w.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:2px;font-size:11px;color:#cfe'; w.append(thumb(q.id), Object.assign(document.createElement('span'), { textContent: q.name + (q.is360 ? ' · 360' : '') })); row.appendChild(w); });
  trayEl.appendChild(row);
  if (K.cur === sc) tray(true);
}
function placePerson(id, at) {
  const p = P(); if (!BY_ID[id]) return;
  const h = at ? hit(at) : null;
  if (h) { K.setVal('un.p' + h.i + '.who', id); K.openSection(G0, 'Person ' + (h.i + 1)); if (K.commit) K.commit(); return; }
  let n = clamp(Math.round(p['un.count']), 0, MAX), i;
  const hidden = []; for (let k = 0; k < n; k++) if (!p['un.p' + k + '.show']) hidden.push(k);
  if (hidden.length) i = hidden[0]; else if (n < MAX) { i = n; K.setVal('un.count', n + 1); } else { i = n - 1; }
  const q = 'un.p' + i + '.';
  K.setVal(q + 'show', true); K.setVal(q + 'who', id);
  if (at) { const hh = p[q + 'h'] * p['un.scaleAll']; K.setVal(q + 'x', +(at.x / K.W).toFixed(4)); K.setVal(q + 'y', +(clamp(at.y + hh / 2, 0, K.H) / K.H).toFixed(4)); }
  K.openSection(G0, 'Person ' + (i + 1)); if (K.commit) K.commit();
}
})();
