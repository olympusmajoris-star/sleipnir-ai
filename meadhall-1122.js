/* =====================================================================
   MEAD HALL — group chat screen (studio 1122, not in the Dart yet).
   Opened from the Raven dial's "Mead Hall" stop (page id "groups").
   Top: the stage. Everyone in the hall stands as a still, whole-body 3D
   figure (their real HoloWorker models): 2 rows, 8 per screen, swipe
   sideways for more. Bottom: one ordinary thread, read top to bottom.
   Link between the two: whoever is talking steps forward into the
   light while the others dim. Tap a figure = only their messages.
   Tap a message = its sender steps forward.
   Art slots (empty until ChatGPT renders them): rune mark, light
   thread, floor shadow. Paste the image link into each slot.
   Test people = the studio's fake test accounts (People button).
   ===================================================================== */
(() => {
'use strict';
const K = window.StudioKit; if (!K) return;
const { clamp, rgba } = K;
let P = {};

/* ---------- people (the studio's test accounts) ---------- */
const BUILT = [['freya', 'Freya'], ['loki', 'Loki'], ['baldr', 'Baldr'], ['sif', 'Sif'], ['tyr', 'Tyr'], ['hel', 'Hel'], ['testwoman', 'Test Woman']];
const COLORS = ['#E8B04A', '#6FD6FF', '#B78CFF', '#7FE0A8', '#FF8A7A', '#F5D76E', '#8FB3FF', '#FF9ED8', '#9BE15D', '#FFB86B'];
let PEOPLE = BUILT.map(([id, name], i) => ({ id, name, color: COLORS[i % COLORS.length], src: null }));
let BY_ID = Object.fromEntries(PEOPLE.map(p => [p.id, p]));
const YOU = { id: 'you', name: 'You', color: '#9FB4CC' };

/* ---------- a test conversation between them ---------- */
const DEMO = [
  ['freya', 'Who is in for Saturday on the beach?'],
  ['loki', 'Depends. Is Tyr cooking again?'],
  ['tyr', 'I heard that.'],
  ['sif', 'I can bring the cooler and the chairs'],
  ['you', 'Count me in. Flagler pier at noon?'],
  ['baldr', 'Noon works. I will grab ice on the way'],
  ['hel', 'Running late but I will be there by 1'],
  ['testwoman', 'Sending the photo from last time'],
  ['freya', 'That photo is legendary'],
  ['loki', 'Delete it'],
  ['tyr', 'Never'],
  ['sif', 'Who has the speaker?'],
  ['baldr', 'Mine is charged'],
  ['you', 'Perfect. See everyone Saturday'],
];
const MORE = [
  ['hel', 'Save me a chair'], ['loki', 'I am bringing a surprise'], ['freya', 'That is what worries me'],
  ['testwoman', 'Sunscreen people. Seriously'], ['tyr', 'Grill is packed'], ['sif', 'On my way'], ['baldr', 'Parking is wide open'],
];
let MSGS = DEMO.map(([who, text], i) => ({ who, text, t: i }));
let moreAt = 0;

/* ---------- figure art (front frame of each person's 3D model) ---------- */
const ART = {};
const ready = im => im && im.complete && im.naturalWidth > 0;
function scan(im, n, f) {
  const fw = Math.floor(im.naturalWidth / n), fh = im.naturalHeight, c = document.createElement('canvas'); c.width = fw; c.height = fh;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, f * fw, 0, fw, fh, 0, 0, fw, fh);
  let d; try { d = x.getImageData(0, 0, fw, fh).data; } catch (e) { return { fw, fh, t: 0, b: fh, l: 0, r: fw }; }
  let t = fh, b = 0, l = fw, r = 0;
  for (let y = 0; y < fh; y++) for (let xx = 0; xx < fw; xx++) if (d[(y * fw + xx) * 4 + 3] > 40) { if (y < t) t = y; if (y > b) b = y; if (xx < l) l = xx; if (xx > r) r = xx; }
  return b > t ? { fw, fh, t, b: b + 1, l, r: r + 1 } : { fw, fh, t: 0, b: fh, l: 0, r: fw };
}
function art(p) {
  const src = p.src ? p.src.profile : 'asgard/figs/' + p.id + '_profile.webp?v=1121u', key = p.id + '|' + src;
  if (ART[key]) return ART[key];
  const a = ART[key] = { img: new Image(), n: p.src ? p.src.n || 25 : 25, box: null };
  a.img.crossOrigin = 'anonymous';
  a.img.onload = () => { a.box = scan(a.img, a.n, Math.floor(a.n / 2)); };
  a.img.src = src;
  return a;
}
function syncPeople() {
  const list = K.people ? K.people.list() : []; if (!list.length) return;
  PEOPLE = list.map((q, i) => ({ id: q.key, name: q.name, color: COLORS[i % COLORS.length], src: { profile: q.profile, n: q.profileFrames } }));
  BY_ID = Object.fromEntries(PEOPLE.map(q => [q.id, q]));
  PEOPLE.forEach(art);
  MSGS = MSGS.filter(m => m.who === 'you' || BY_ID[m.who]);
}
if (K.people) K.people.on(syncPeople);
PEOPLE.forEach(art);
const person = id => id === 'you' ? YOU : BY_ID[id] || { id, name: id, color: '#9FB4CC' };

/* ---------- art slots (filled by ChatGPT renders) ---------- */
const SLOT = {};
function slotImg(link) {
  const u = String(link || '').trim(); if (!u) return null;
  const href = /^https?:/i.test(u) ? u : window.StudioTransferConfig.url + '/storage/v1/object/public/menu-images/' + u.split('/').map(encodeURIComponent).join('/');
  if (!SLOT[href]) { const im = new Image(); im.crossOrigin = 'anonymous'; im.src = href; SLOT[href] = im; }
  return ready(SLOT[href]) ? SLOT[href] : null;
}
const tinted = new Map();
function tint(im, color) {
  const key = im.src + '|' + color; if (tinted.has(key)) return tinted.get(key);
  const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
  const x = c.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = color; x.globalAlpha = .65; x.fillRect(0, 0, c.width, c.height);
  tinted.set(key, c); return c;
}

/* ---------- state (studio only, not saved) ---------- */
const ST = {
  focus: null, filter: null, page: 0, pageAnim: 0, pageFrom: 0, scroll: 0, maxScroll: 0,
  glow: {}, beam: null, flick: {}, replay: null, down: null, time: 0,
};
let G = {};

/* ---------- geometry ---------- */
function geometry() {
  const W = K.W, H = K.H, top = P['hdr.top'];
  const hdr = { x: 0, y: top, w: W, h: P['hdr.on'] ? 46 : 0 };
  const stageTop = hdr.y + hdr.h + 2, stageBottom = Math.max(stageTop + 120, H * P['stage.split']);
  const inH = P['in.on'] ? P['in.h'] : 0, inY = H - P['in.bottom'] - inH;
  const input = { x: 12, y: inY, w: W - 24, h: inH };
  const thread = { x: 0, y: stageBottom + P['thr.gap'], w: W, h: Math.max(40, inY - 8 - (stageBottom + P['thr.gap'])) };
  return { W, H, hdr, stage: { x: 0, y: stageTop, w: W, h: stageBottom - stageTop }, thread, input };
}
function perPage() { return clamp(Math.round(P['stage.perRow']), 2, 6) * 2; }
function pages() { return Math.max(1, Math.ceil(PEOPLE.length / perPage())); }
function stageSpots(g, list) {
  const per = clamp(Math.round(P['stage.perRow']), 2, 6), out = [], s = g.stage, m = P['stage.margin'];
  const two = list.length > per, back = two ? list.slice(0, list.length - per) : [], front = two ? list.slice(-per) : list;
  const place = (row, feet, h, shift) => row.forEach((p, i) => {
    const span = s.w - m * 2, x = m + span * (i + .5 + shift) / row.length;
    out.push({ p, x, feet, h });
  });
  if (back.length) place(back, s.y + s.h * P['stage.backFeet'], P['stage.backH'], P['stage.stagger'] && back.length === per ? -.25 : 0);
  place(front, s.y + s.h - P['stage.floorGap'], P['stage.frontH'], P['stage.stagger'] && back.length === per ? .25 : 0);
  return out;
}

/* ---------- drawing ---------- */
function drawFigure(ctx, spot, f, dimmed) {
  const a = art(spot.p); if (!ready(a.img) || !a.box) return null;
  const b = a.box, fw = Math.floor(a.img.naturalWidth / a.n), bh = b.b - b.t, bw = b.r - b.l;
  const scale = 1 + f * P['spot.step'], h = spot.h * scale, k = h / bh, w = bw * k;
  const feet = spot.feet + f * P['spot.lift'], x = spot.x - w / 2, y = feet - h;
  // floor shadow (art slot)
  const sh = P['shadow.on'] && slotImg(P['shadow.img']);
  if (sh) {
    const sw = w * P['shadow.w'], shh = P['shadow.h'] * scale;
    ctx.save(); ctx.globalAlpha = P['shadow.alpha'] * (dimmed ? 1 - P['spot.dim'] * .5 : 1);
    ctx.drawImage(P['shadow.tint'] ? tint(sh, spot.p.color) : sh, spot.x - sw / 2, feet - shh / 2, sw, shh); ctx.restore();
  }
  ctx.save();
  const dim = dimmed ? 1 - P['spot.dim'] * (1 - f) : 1;
  if (dim < .999) ctx.filter = `brightness(${dim.toFixed(3)})`;
  ctx.drawImage(a.img, Math.floor(a.n / 2) * fw + b.l, b.t, bw, bh, x, y, w, h);
  ctx.restore();
  // rune mark (art slot)
  const rn = P['rune.on'] && slotImg(P['rune.img']);
  if (rn) {
    const fl = ST.flick[spot.p.id] || 0, rs = P['rune.size'] * scale, rx = spot.x + P['rune.x'] * w, ry = feet - h * P['rune.y'];
    ctx.save(); ctx.globalAlpha = clamp(P['rune.alpha'] + fl * (1 - P['rune.alpha']), 0, 1); ctx.drawImage(rn, rx - rs / 2, ry - rs / 2, rs, rs); ctx.restore();
  }
  return { x, y, w, h, feet, cx: spot.x, p: spot.p };
}
function drawStage(ctx, g) {
  const s = g.stage, per = perPage(), n = pages();
  ST.page = clamp(ST.page, 0, n - 1);
  const t = clamp(ST.pageAnim, 0, 1), e = t < 1 ? 1 - Math.pow(1 - t, 3) : 1;
  const figs = [], names = [];
  const drawPage = (pg, dx) => {
    const list = PEOPLE.slice(pg * per, pg * per + per), spots = stageSpots(g, list);
    const focus = ST.focus, anyFocus = P['spot.on'] && focus && list.some(p => p.id === focus);
    spots.sort((a, b) => a.feet - b.feet || (a.p.id === focus) - (b.p.id === focus));
    ctx.save(); ctx.translate(dx, 0);
    for (const sp of spots) {
      const f = P['spot.on'] ? (ST.glow[sp.p.id] || 0) : 0;
      const r = drawFigure(ctx, sp, f, anyFocus && sp.p.id !== focus);
      if (r && dx === 0) figs.push(r);
      if (P['stage.names']) {
        ctx.font = `600 ${P['stage.nameSize']}px system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        const y = (r ? r.feet : sp.feet) + 3, dimmed = anyFocus && sp.p.id !== focus;
        ctx.fillStyle = rgba(P['stage.nameColor'], dimmed ? .45 : .92); ctx.fillText(sp.p.name, sp.x, y);
        if (dx === 0) { const tw = ctx.measureText(sp.p.name).width; names.push({ x: sp.x - tw / 2, y, w: tw, h: P['stage.nameSize'] + 2 }); }
      }
    }
    ctx.restore();
  };
  ctx.save(); ctx.beginPath(); ctx.rect(s.x, s.y, s.w, s.h + 18); ctx.clip();
  if (t < 1) { const dir = ST.page > ST.pageFrom ? 1 : -1; drawPage(ST.pageFrom, -dir * s.w * e); drawPage(ST.page, dir * s.w * (1 - e)); }
  else drawPage(ST.page, 0);
  ctx.restore();
  // page dots
  if (n > 1) {
    const y = s.y + 6; for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.arc(g.W / 2 + (i - (n - 1) / 2) * 12, y, 3, 0, Math.PI * 2); ctx.fillStyle = i === ST.page ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.3)'; ctx.fill(); }
  }
  G.figs = figs; G.names = names;
}
function wrap(ctx, text, maxW) {
  const words = String(text).split(/\s+/), lines = []; let line = '';
  for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line); return lines;
}
function layoutThread(ctx, g) {
  const list = MSGS.filter(m => !ST.filter || m.who === ST.filter), out = [];
  const font = `400 ${P['thr.font']}px system-ui,sans-serif`, nameFont = `600 ${P['thr.nameSize']}px system-ui,sans-serif`;
  const maxW = g.W * P['thr.maxW'], lh = P['thr.font'] * 1.3;
  let y = 0, prev = null;
  for (const m of list) {
    ctx.font = font; const lines = wrap(ctx, m.text, maxW - P['thr.padX'] * 2), tw = Math.max(...lines.map(l => ctx.measureText(l).width));
    const showName = P['thr.nameOn'] && m.who !== 'you' && (prev !== m.who || ST.filter);
    const nameH = showName ? P['thr.nameSize'] + 4 : 0, bw = tw + P['thr.padX'] * 2, bh = lines.length * lh + P['thr.padY'] * 2;
    y += prev && prev !== m.who ? P['thr.gapMsg'] * 1.8 : P['thr.gapMsg'];
    out.push({ m, lines, showName, nameH, y, bw, bh, lh, font, nameFont });
    y += nameH + bh; prev = m.who;
  }
  return { items: out, total: y + 6 };
}
function drawThread(ctx, g) {
  const t = g.thread, L = layoutThread(ctx, g), own = P['thr.own'];
  ST.maxScroll = Math.max(0, L.total - t.h); ST.scroll = clamp(ST.scroll, 0, ST.maxScroll);
  const base = t.y + t.h - L.total + ST.scroll;   // newest at the bottom
  const bubbles = [], rn = P['rune.on'] && P['rune.inThread'] && slotImg(P['rune.img']);
  ctx.save(); ctx.beginPath(); ctx.rect(t.x, t.y, t.w, t.h); ctx.clip();
  for (const it of L.items) {
    const m = it.m, who = person(m.who), mine = m.who === 'you', top = base + it.y;
    if (top + it.nameH + it.bh < t.y - 4 || top > t.y + t.h + 4) continue;
    const lead = 14 + (rn ? P['rune.threadSize'] + 6 : 0), x = mine ? g.W - 14 - it.bw : lead, by = top + it.nameH;
    if (it.showName) { ctx.font = it.nameFont; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = rgba(who.color, .95); ctx.fillText(who.name, x + 2, top); }
    const focused = P['spot.on'] && ST.focus === m.who;
    ctx.beginPath(); ctx.roundRect(x, by, it.bw, it.bh, P['thr.radius']);
    ctx.fillStyle = rgba(mine ? own : P['thr.bubble'], P['thr.alpha']); ctx.fill();
    if (P['thr.edgeOn'] && !mine) {
      ctx.save(); ctx.clip(); ctx.fillStyle = rgba(who.color, focused ? 1 : .8); ctx.fillRect(x, by, P['thr.edge'], it.bh); ctx.restore();
    }
    if (rn && !mine) { const rs = P['rune.threadSize']; ctx.save(); ctx.globalAlpha = .9; ctx.drawImage(rn, 12, by + it.bh / 2 - rs / 2, rs, rs); ctx.restore(); }
    ctx.font = it.font; ctx.fillStyle = P['thr.text']; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    it.lines.forEach((l, i) => ctx.fillText(l, x + P['thr.padX'] + (P['thr.edgeOn'] && !mine ? P['thr.edge'] * .5 : 0), by + P['thr.padY'] + i * it.lh + (it.lh - P['thr.font']) / 2));
    bubbles.push({ x, y: by, w: it.bw, h: it.bh, m, nameY: top });
  }
  ctx.restore();
  // soft fade where the thread meets the stage
  if (P['thr.fade'] > 0) {
    const gr = ctx.createLinearGradient(0, t.y, 0, t.y + P['thr.fade']); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr; ctx.fillRect(t.x, t.y, t.w, P['thr.fade']);
  }
  // "only this person" chip
  G.chip = null;
  if (ST.filter) {
    const who = person(ST.filter), label = 'Only ' + who.name + '   ✕';
    ctx.font = '600 12px system-ui,sans-serif'; const w = ctx.measureText(label).width + 22, x = g.W / 2 - w / 2, y = t.y + 4;
    ctx.beginPath(); ctx.roundRect(x, y, w, 24, 12); ctx.fillStyle = 'rgba(10,14,20,.85)'; ctx.fill(); ctx.strokeStyle = rgba(who.color, .9); ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#EEF2F6'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, g.W / 2, y + 12);
    G.chip = { x, y, w, h: 24 };
  }
  G.bubbles = bubbles;
}
function drawBeam(ctx, g) {
  const bm = ST.beam, im = P['beam.on'] && slotImg(P['beam.img']); if (!bm || !im) return;
  const age = ST.time - bm.t, life = Math.max(.2, P['beam.life']); if (age > life) { ST.beam = null; return; }
  const fig = (G.figs || []).find(f => f.p.id === bm.who), bub = (G.bubbles || []).slice().reverse().find(b => b.m === bm.m) || (G.bubbles || []).slice().reverse().find(b => b.m.who === bm.who);
  if (!fig || !bub) return;
  const x0 = fig.cx, y0 = fig.feet, x1 = bub.x + 8, y1 = bub.y, len = Math.hypot(x1 - x0, y1 - y0), ang = Math.atan2(y1 - y0, x1 - x0) - Math.PI / 2;
  ctx.save(); ctx.globalAlpha = P['beam.alpha'] * (1 - age / life); ctx.translate(x0, y0); ctx.rotate(ang);
  ctx.drawImage(im, -P['beam.width'] / 2, 0, P['beam.width'], len); ctx.restore();
}
function drawHeader(ctx, g) {
  G.back = null; if (!P['hdr.on']) return;
  const h = g.hdr, cy = h.y + h.h / 2;
  if (P['hdr.back']) { ctx.font = '400 30px system-ui,sans-serif'; ctx.fillStyle = rgba(P['hdr.color'], .9); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('‹', 14, cy - 2); G.back = { x: 4, y: h.y, w: 44, h: h.h }; }
  ctx.textAlign = 'center'; ctx.fillStyle = P['hdr.color']; ctx.font = `700 ${P['hdr.size']}px system-ui,sans-serif`; ctx.textBaseline = P['hdr.sub'] ? 'alphabetic' : 'middle';
  ctx.fillText(P['hdr.title'], g.W / 2, P['hdr.sub'] ? cy + 1 : cy);
  if (P['hdr.sub']) { ctx.font = '500 11px system-ui,sans-serif'; ctx.fillStyle = rgba(P['hdr.color'], .6); ctx.textBaseline = 'top'; ctx.fillText((PEOPLE.length + 1) + ' in the hall', g.W / 2, cy + 4); }
  G.header = { x: g.W / 2 - 90, y: h.y, w: 180, h: h.h };
}
function drawInput(ctx, g) {
  if (!P['in.on']) { G.input = null; return; }
  const r = g.input; ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, Math.min(P['in.radius'], r.h / 2));
  ctx.fillStyle = rgba(P['in.color'], P['in.alpha']); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.font = '400 15px system-ui,sans-serif'; ctx.fillStyle = P['in.textColor']; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(P['in.text'], r.x + 16, r.y + r.h / 2);
  const cr = r.h / 2 - 6; ctx.beginPath(); ctx.arc(r.x + r.w - r.h / 2, r.y + r.h / 2, cr, 0, Math.PI * 2); ctx.fillStyle = rgba(P['in.send'], .9); ctx.fill();
  ctx.fillStyle = '#05070A'; ctx.font = `700 ${Math.round(cr * 1.2)}px system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.fillText('↑', r.x + r.w - r.h / 2, r.y + r.h / 2 + 1);
  G.input = r;
}

/* ---------- actions ---------- */
function focusOn(id, m) {
  ST.focus = id; if (m || id) ST.beam = { who: id, m: m || null, t: ST.time };
  if (id) ST.flick[id] = 1;
  const i = PEOPLE.findIndex(p => p.id === id); if (i >= 0) { const pg = Math.floor(i / perPage()); if (pg !== ST.page) goPage(pg); }
}
function goPage(pg) { pg = clamp(pg, 0, pages() - 1); if (pg === ST.page) return; ST.pageFrom = ST.page; ST.page = pg; ST.pageAnim = 0; }
function newMessage() {
  const live = MORE.filter(([w]) => BY_ID[w]); if (!live.length) return;
  const [who, text] = live[moreAt++ % live.length], m = { who, text, t: MSGS.length };
  MSGS.push(m); ST.scroll = 0; if (P['spot.followNewest']) focusOn(who, m);
}
function replay() {
  const list = MSGS.filter(m => m.who !== 'you'); if (!list.length) return;
  ST.replay = { i: 0, next: 0 }; ST.filter = null; K.status('Replaying the conversation in order.');
}
function scrollTo(m) {
  const ctx = document.createElement('canvas').getContext('2d'), g = geometry(), L = layoutThread(ctx, g), it = L.items.find(i => i.m === m); if (!it) return;
  const want = L.total - (it.y + it.nameH + it.bh) - g.thread.h * .35; ST.scroll = clamp(want, 0, Math.max(0, L.total - g.thread.h));
}

/* ---------- controls ---------- */
const sc = K.screen({
  id: 'groups', title: 'Mead Hall', docId: 'raven_mead_hall', area: 'Asgard',
  crumb: 'Asgard › Raven › Mead Hall <small>· group chat · studio 1122, no Dart yet</small>',
  docMeta: { widget: 'AsgardRaven (planned)', part: 'Mead Hall group chat', source: 'studio 1122' },
  startGroup: 'Stage', startSection: 'Figures',
  spec(def) {
    def('Header', 'Text', 'header', 'hdr.on', 'Show the header', 'bool', true);
    def('Header', 'Text', 'header', 'hdr.title', 'Title', 'text', 'Mead Hall');
    def('Header', 'Text', 'header', 'hdr.sub', 'Show how many are in the hall', 'bool', true);
    def('Header', 'Text', 'header', 'hdr.back', 'Back arrow', 'bool', true, { info: 'Tap it to go back to the Raven dial.' });
    def('Header', 'Text', 'header', 'hdr.size', 'Title size', 'num', 20, { min: 12, max: 34, step: .5, unit: 'px' });
    def('Header', 'Text', 'header', 'hdr.color', 'Color', 'color', '#F2E6CF');
    def('Header', 'Place', 'header', 'hdr.top', 'Distance from the top', 'num', 54, { min: 0, max: 120, step: 1, unit: 'px', info: '54 clears the iPhone 17 Dynamic Island.' });

    def('Stage', 'Area', 'stage', 'stage.split', 'Where the stage ends', 'num', .5, { min: .3, max: .7, step: .005, unit: 'of height', info: 'Everything above this line is the figures, everything below is the conversation.' });
    def('Stage', 'Figures', 'stage', 'stage.perRow', 'People per row', 'int', 4, { min: 2, max: 6, step: 1, info: 'Two rows, so 4 per row = 8 per screen. More people = swipe sideways.' });
    def('Stage', 'Figures', 'stage', 'stage.frontH', 'Front row height', 'num', 170, { min: 60, max: 320, step: 1, unit: 'px' });
    def('Stage', 'Figures', 'stage', 'stage.backH', 'Back row height', 'num', 128, { min: 40, max: 280, step: 1, unit: 'px' });
    def('Stage', 'Figures', 'stage', 'stage.backFeet', 'Back row feet', 'num', .6, { min: .25, max: .95, step: .005, unit: 'of stage' });
    def('Stage', 'Figures', 'stage', 'stage.floorGap', 'Front row feet up from the line', 'num', 18, { min: 0, max: 80, step: 1, unit: 'px' });
    def('Stage', 'Figures', 'stage', 'stage.margin', 'Side margins', 'num', 10, { min: 0, max: 80, step: 1, unit: 'px' });
    def('Stage', 'Figures', 'stage', 'stage.stagger', 'Stagger the rows', 'bool', true, { info: 'Back row sits between the front row, like a group photo.' });
    def('Stage', 'Names', 'names', 'stage.names', 'Names under their feet', 'bool', true);
    def('Stage', 'Names', 'names', 'stage.nameSize', 'Name size', 'num', 10, { min: 6, max: 18, step: .5, unit: 'px' });
    def('Stage', 'Names', 'names', 'stage.nameColor', 'Name color', 'color', '#ECF4FF');
    def('Stage', 'Swipe', 'stage', 'stage.swipeTime', 'Slide time', 'num', .35, { min: .1, max: 1.5, step: .01, unit: 's' });

    def('Spotlight', 'Who is talking', 'spot', 'spot.on', 'Talker steps forward', 'bool', true);
    def('Spotlight', 'Who is talking', 'spot', 'spot.step', 'How much bigger', 'num', .14, { min: 0, max: .6, step: .005, unit: '×' });
    def('Spotlight', 'Who is talking', 'spot', 'spot.lift', 'Step down toward you', 'num', 8, { min: -20, max: 40, step: 1, unit: 'px' });
    def('Spotlight', 'Who is talking', 'spot', 'spot.dim', 'Dim everyone else', 'num', .45, { min: 0, max: .95, step: .01 });
    def('Spotlight', 'Who is talking', 'spot', 'spot.speed', 'How fast they step', 'num', 6, { min: .5, max: 20, step: .1 });
    def('Spotlight', 'Who is talking', 'spot', 'spot.followNewest', 'New message moves the spotlight', 'bool', true);
    def('Spotlight', 'Replay', 'spot', 'spot.replayGap', 'Time per message', 'num', 1.6, { min: .3, max: 5, step: .05, unit: 's', info: 'Replay (toolbar) walks the spotlight through the conversation in order.' });

    def('Thread', 'Area', 'thread', 'thr.gap', 'Gap under the stage', 'num', 4, { min: 0, max: 60, step: 1, unit: 'px' });
    def('Thread', 'Area', 'thread', 'thr.fade', 'Fade at the top', 'num', 18, { min: 0, max: 80, step: 1, unit: 'px' });
    def('Thread', 'Bubbles', 'bubble', 'thr.font', 'Text size', 'num', 15, { min: 10, max: 24, step: .5, unit: 'px' });
    def('Thread', 'Bubbles', 'bubble', 'thr.text', 'Text color', 'color', '#EEF2F6');
    def('Thread', 'Bubbles', 'bubble', 'thr.bubble', 'Their bubble color', 'color', '#141B24');
    def('Thread', 'Bubbles', 'bubble', 'thr.own', 'Your bubble color', 'color', '#24476B');
    def('Thread', 'Bubbles', 'bubble', 'thr.alpha', 'Bubble opacity', 'num', .82, { min: 0, max: 1, step: .01 });
    def('Thread', 'Bubbles', 'bubble', 'thr.radius', 'Corner roundness', 'num', 16, { min: 0, max: 30, step: .5, unit: 'px' });
    def('Thread', 'Bubbles', 'bubble', 'thr.padX', 'Side padding', 'num', 12, { min: 4, max: 30, step: .5, unit: 'px' });
    def('Thread', 'Bubbles', 'bubble', 'thr.padY', 'Top / bottom padding', 'num', 8, { min: 2, max: 24, step: .5, unit: 'px' });
    def('Thread', 'Bubbles', 'bubble', 'thr.gapMsg', 'Space between messages', 'num', 5, { min: 0, max: 24, step: .5, unit: 'px' });
    def('Thread', 'Bubbles', 'bubble', 'thr.maxW', 'Widest bubble', 'num', .74, { min: .4, max: .95, step: .01, unit: 'of width' });
    def('Thread', 'Names', 'bubble', 'thr.nameOn', 'Sender name above their messages', 'bool', true);
    def('Thread', 'Names', 'bubble', 'thr.nameSize', 'Name size', 'num', 11, { min: 7, max: 18, step: .5, unit: 'px' });
    def('Thread', 'Person colors', 'bubble', 'thr.edgeOn', 'Color edge on their bubbles', 'bool', true, { info: 'Each person has a color. It also tints their floor shadow.' });
    def('Thread', 'Person colors', 'bubble', 'thr.edge', 'Edge width', 'num', 3, { min: 1, max: 10, step: .5, unit: 'px' });

    def('Input bar', 'Bar', 'input', 'in.on', 'Show the input bar', 'bool', true);
    def('Input bar', 'Bar', 'input', 'in.text', 'Placeholder', 'text', 'Message the hall');
    def('Input bar', 'Bar', 'input', 'in.h', 'Height', 'num', 44, { min: 30, max: 70, step: 1, unit: 'px' });
    def('Input bar', 'Bar', 'input', 'in.bottom', 'Up from the bottom', 'num', 132, { min: 0, max: 240, step: 1, unit: 'px', info: '132 sits it just above the rock row.' });
    def('Input bar', 'Bar', 'input', 'in.radius', 'Corner roundness', 'num', 22, { min: 0, max: 35, step: .5, unit: 'px' });
    def('Input bar', 'Bar', 'input', 'in.color', 'Color', 'color', '#10161E');
    def('Input bar', 'Bar', 'input', 'in.alpha', 'Opacity', 'num', .9, { min: 0, max: 1, step: .01 });
    def('Input bar', 'Bar', 'input', 'in.textColor', 'Placeholder color', 'color', '#7F8FA3');
    def('Input bar', 'Bar', 'input', 'in.send', 'Send button color', 'color', '#E8B04A');

    const slotInfo = 'Empty until ChatGPT renders it. Paste the image link (a full https link, or its path in the menu-images bucket).';
    def('Rune mark', 'Art', 'rune', 'rune.on', 'Use the rune mark', 'bool', false);
    def('Rune mark', 'Art', 'rune', 'rune.img', 'Rune image link', 'text', '', { info: slotInfo });
    def('Rune mark', 'On the figure', 'rune', 'rune.size', 'Size', 'num', 22, { min: 6, max: 80, step: .5, unit: 'px' });
    def('Rune mark', 'On the figure', 'rune', 'rune.y', 'Height on the body', 'num', .64, { min: 0, max: 1, step: .005, unit: 'of figure', info: 'From the feet: .64 is about the chest.' });
    def('Rune mark', 'On the figure', 'rune', 'rune.x', 'Left / right', 'num', 0, { min: -.5, max: .5, step: .005, unit: 'of figure' });
    def('Rune mark', 'On the figure', 'rune', 'rune.alpha', 'How faint when quiet', 'num', .35, { min: 0, max: 1, step: .01 });
    def('Rune mark', 'On the figure', 'rune', 'rune.flicker', 'Flicker time on a new message', 'num', .8, { min: 0, max: 4, step: .05, unit: 's' });
    def('Rune mark', 'In the thread', 'rune', 'rune.inThread', 'Same rune beside their messages', 'bool', true);
    def('Rune mark', 'In the thread', 'rune', 'rune.threadSize', 'Size in the thread', 'num', 14, { min: 6, max: 40, step: .5, unit: 'px' });

    def('Light thread', 'Art', 'beam', 'beam.on', 'Use the light thread', 'bool', false);
    def('Light thread', 'Art', 'beam', 'beam.img', 'Light thread image link', 'text', '', { info: slotInfo + ' A tall, thin strip of light. It is stretched from the talker\'s feet to their message.' });
    def('Light thread', 'Look', 'beam', 'beam.width', 'Width', 'num', 6, { min: 1, max: 40, step: .5, unit: 'px' });
    def('Light thread', 'Look', 'beam', 'beam.alpha', 'Strength', 'num', .8, { min: 0, max: 1, step: .01 });
    def('Light thread', 'Look', 'beam', 'beam.life', 'How long it stays', 'num', 1.6, { min: .2, max: 6, step: .05, unit: 's' });

    def('Floor shadow', 'Art', 'shadow', 'shadow.on', 'Use the floor shadow', 'bool', false);
    def('Floor shadow', 'Art', 'shadow', 'shadow.img', 'Shadow image link', 'text', '', { info: slotInfo + ' A soft oval shadow, seen from the front.' });
    def('Floor shadow', 'Look', 'shadow', 'shadow.tint', 'Tint with their color', 'bool', true);
    def('Floor shadow', 'Look', 'shadow', 'shadow.w', 'Width', 'num', 1.3, { min: .3, max: 3, step: .01, unit: '× figure' });
    def('Floor shadow', 'Look', 'shadow', 'shadow.h', 'Height', 'num', 18, { min: 2, max: 80, step: .5, unit: 'px' });
    def('Floor shadow', 'Look', 'shadow', 'shadow.alpha', 'Strength', 'num', .6, { min: 0, max: 1, step: .01 });
  },
  toolbar: [
    { label: 'New message', title: 'A test person sends a message', onclick: () => newMessage() },
    { label: 'Replay', title: 'Walk the spotlight through the conversation in order', onclick: () => replay() },
    { label: 'Back to dial', title: 'Same as the back arrow', onclick: () => K.show('dial') },
  ],
  onShow() { ST.scroll = 0; ST.replay = null; if (!ST.focus) { const last = [...MSGS].reverse().find(m => m.who !== 'you'); if (last) ST.focus = last.who; } },
  update(dt) {
    P = sc.P; ST.time += dt;
    if (ST.pageAnim < 1) ST.pageAnim = clamp(ST.pageAnim + dt / Math.max(.05, P['stage.swipeTime']), 0, 1);
    const k = 1 - Math.exp(-dt * P['spot.speed']);
    for (const p of PEOPLE) { const want = ST.focus === p.id ? 1 : 0, cur = ST.glow[p.id] || 0; ST.glow[p.id] = cur + (want - cur) * k; }
    for (const id in ST.flick) ST.flick[id] = Math.max(0, ST.flick[id] - dt / Math.max(.05, P['rune.flicker']));
    const r = ST.replay;
    if (r && ST.time >= r.next) {
      const list = MSGS.filter(m => m.who !== 'you');
      if (r.i >= list.length) { ST.replay = null; K.status('Replay finished.'); }
      else { const m = list[r.i++]; focusOn(m.who, m); scrollTo(m); r.next = ST.time + P['spot.replayGap']; }
    }
  },
  draw(ctx, now, studio) {
    P = sc.P; sc.ty = 0; G = {};
    const g = geometry(); G.g = g;
    drawHeader(ctx, g);
    drawStage(ctx, g);
    drawThread(ctx, g);
    drawBeam(ctx, g);
    drawInput(ctx, g);
    if (studio) K.hl(ctx, now);
  },
  highlight(ctx, base, sub, H1) {
    const g = G.g; if (!g) return;
    const box = (b, pad = 3) => () => { ctx.beginPath(); ctx.roundRect(b.x - pad, b.y - pad, b.w + pad * 2, b.h + pad * 2, 6); };
    if (base === 'header' && G.header) H1(box(G.header));
    else if (base === 'stage') { H1(box(g.stage, -2)); (G.figs || []).forEach(f => H1(box(f, 1))); }
    else if (base === 'names') (G.names || []).forEach(n => H1(box(n, 2)));
    else if (base === 'spot') { const f = (G.figs || []).find(f => f.p.id === ST.focus); if (f) H1(box(f, 3)); }
    else if (base === 'thread') H1(box(g.thread, -2));
    else if (base === 'bubble') (G.bubbles || []).forEach(b => H1(box(b, 2)));
    else if (base === 'input' && G.input) H1(box(G.input));
    else if (base === 'rune') (G.figs || []).forEach(f => { const s = P['rune.size'], x = f.cx + P['rune.x'] * f.w, y = f.feet - f.h * P['rune.y']; H1(() => { ctx.beginPath(); ctx.arc(x, y, s / 2 + 3, 0, Math.PI * 2); }); });
    else if (base === 'beam') { const f = (G.figs || []).find(f => f.p.id === ST.focus), b = (G.bubbles || []).slice().reverse().find(b => b.m.who === ST.focus); if (f && b) H1(() => { ctx.beginPath(); ctx.moveTo(f.cx, f.feet); ctx.lineTo(b.x + 8, b.y); }); }
    else if (base === 'shadow') (G.figs || []).forEach(f => { const w = f.w * P['shadow.w'], h = P['shadow.h']; H1(() => { ctx.beginPath(); ctx.ellipse(f.cx, f.feet, w / 2, h / 2, 0, 0, Math.PI * 2); }); });
  },
  bounds(base) {
    const g = G.g || geometry(), sq = (x, y, s) => ({ x: x - s / 2, y: y - s / 2, s });
    if (base === 'header') return sq(g.W / 2, g.hdr.y + g.hdr.h / 2, g.W * .8);
    if (base === 'thread' || base === 'bubble') return sq(g.W / 2, g.thread.y + g.thread.h / 2, Math.max(g.W, g.thread.h));
    if (base === 'input') return sq(g.W / 2, g.input.y + g.input.h / 2, g.W * .9);
    const f = (G.figs || []).find(f => f.p.id === ST.focus) || (G.figs || [])[0];
    if ((base === 'rune' || base === 'shadow' || base === 'spot') && f) return sq(f.cx, f.y + f.h / 2, f.h * 1.4);
    return sq(g.W / 2, g.stage.y + g.stage.h / 2, Math.max(g.W, g.stage.h));
  },
  pick(p) {
    const g = G.g || geometry(), inR = b => b && p.x >= b.x - 4 && p.x <= b.x + b.w + 4 && p.y >= b.y - 4 && p.y <= b.y + b.h + 4;
    if (inR(G.header) || inR(G.back)) return ['Header', 'Text'];
    if (inR(G.input)) return ['Input bar', 'Bar'];
    for (const b of G.bubbles || []) if (inR(b)) return ['Thread', 'Bubbles'];
    for (const n of G.names || []) if (inR(n)) return ['Stage', 'Names'];
    for (const f of G.figs || []) if (inR(f)) return f.p.id === ST.focus ? ['Spotlight', 'Who is talking'] : ['Stage', 'Figures'];
    if (inR(g.thread)) return ['Thread', 'Area'];
    if (inR(g.stage)) return ['Stage', 'Area'];
    return ['Background', 'Mode'];
  },
  anchors() {
    return (G.figs || []).map(f => { const last = [...MSGS].reverse().find(m => m.who === f.p.id); return { id: 'fig:' + f.p.id, label: f.p.name, x: f.cx, y: f.y, fields: { name: f.p.name, count: 0, msg: last ? last.text : '' } }; });
  },
  pointer: {
    down(p, ev) { ST.down = { x: p.x, y: p.y, lx: p.x, ly: p.y, id: ev.pointerId, moved: 0, zone: null, scroll0: ST.scroll }; },
    move(p, ev) {
      const d = ST.down; if (!d || ev.pointerId !== d.id) return;
      const g = G.g || geometry(), dx = p.x - d.x, dy = p.y - d.y; d.moved = Math.max(d.moved, Math.hypot(dx, dy));
      if (!d.zone && d.moved > 6) d.zone = d.y >= g.thread.y && d.y <= g.thread.y + g.thread.h && Math.abs(dy) >= Math.abs(dx) ? 'thread' : d.y < g.thread.y && Math.abs(dx) > Math.abs(dy) ? 'stage' : 'none';
      if (d.zone === 'thread') ST.scroll = clamp(d.scroll0 + dy, 0, ST.maxScroll);
    },
    up(p, ev) {
      const d = ST.down; if (!d || ev.pointerId !== d.id) return; ST.down = null;
      if (d.zone === 'stage') { if (Math.abs(p.x - d.x) > 40) goPage(ST.page + (p.x < d.x ? 1 : -1)); return; }
      if (d.moved > 8) return;
      const inR = b => b && p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
      if (inR(G.back)) { K.show('dial'); return; }
      if (inR(G.chip)) { ST.filter = null; ST.scroll = 0; return; }
      for (const f of (G.figs || []).slice().reverse()) if (inR(f)) { ST.filter = ST.filter === f.p.id ? null : f.p.id; ST.scroll = 0; focusOn(f.p.id); K.status(ST.filter ? 'Showing only ' + f.p.name + '. Tap them again for everyone.' : 'Showing everyone.'); return; }
      for (const b of G.bubbles || []) if (inR(b)) { if (b.m.who !== 'you') focusOn(b.m.who, b.m); return; }
      if (inR(G.input)) K.status('In the app this opens the keyboard.');
    },
    cancel() { ST.down = null; },
  },
});
// Space backdrop by default (the Background part changes it, or switches to the live camera).
for (const [k, v] of [['bg.mode', 'tilt'], ['bg.image', 'bg01'], ['bg.dim', .45]]) {
  sc.DEF[k] = v; sc.P[k] = v; const s = sc.SPEC.find(s => s.k === k); if (s) s.def = v;
}
sc.ST = ST; sc.G = () => G;
})();
