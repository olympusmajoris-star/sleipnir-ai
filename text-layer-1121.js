/* =====================================================================
   TEXT LAYER — studio 1121. Add your own text anywhere on ANY studio page
   and attach it to anything on that page (the screen, a person, the dial,
   ...). Text attached to a person can show their name, unread count or
   newest message instead of typed words, and moves with them.
   Load after every screen script and before StudioKit.start().
   A screen can offer things to attach to with sc.anchors(): returns
   [{ id, label, x, y, fields: { name, count, msg } }] (x / y null = not on screen now).
   ===================================================================== */
(() => {
'use strict';
const K = window.StudioKit; if (!K) return;
const { TAU, clamp, rgba } = K;
const N = 16, G = 'Text & buttons';
let lastScreen = null, curScreen = null;
try { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Bangers&family=Cinzel:wght@500;700&family=Comic+Neue:wght@400;700&family=Patrick+Hand&family=Pirata+One&family=Oswald:wght@400;600&display=swap'; document.head.appendChild(l); } catch (e) {}

const FONTS = [['Roboto', 'Roboto (app font)'], ['Oswald', 'Oswald (tall)'], ['Cinzel', 'Cinzel (carved / Norse)'], ['Pirata One', 'Pirata One (old blackletter)'], ['Comic Neue', 'Comic Neue'], ['Bangers', 'Bangers (comic caps)'], ['Patrick Hand', 'Patrick Hand (handwritten)'], ['Georgia', 'Georgia (serif)']];
const SHOWS = [['custom', 'The words I type'], ['name', 'Their name'], ['first', 'Their first name'], ['count', 'Their unread count'], ['msg', 'Their newest message'], ['namecount', 'Name + unread count']];
const wrapped = new WeakSet();

function anchorsOf(sc) {
  const own = (typeof sc.anchors === 'function' ? sc.anchors() : []) || [];
  return [{ id: 'screen', label: 'The screen (stays put)', x: 0, y: 0, fields: null }, { id: 'center', label: 'Middle of the screen', x: K.W / 2, y: K.H / 2, fields: null }].concat(own);
}
function actionsOf(sc) {
  const out = [['none', 'Nothing (just text)'], ['back', 'Go back to the page before'], ['open', 'Open what it is attached to (e.g. their messages)']];
  for (const id of K.order) out.push(['go:' + id, 'Go to: ' + (K.screens[id].title || id)]);
  for (const a of (typeof sc.actions === 'function' ? sc.actions() : []) || []) out.push(['act:' + a.id, a.label]);
  return out;
}
function runAction(sc, q) {
  const v = String(sc.P[q + 'tap'] || 'none');
  if (v === 'none') return false;
  if (v === 'back') { if (lastScreen && K.screens[lastScreen]) K.show(lastScreen); return true; }
  if (v === 'open') { const a = anchorFor(sc, sc.P[q + 'attach']); if (a && a.open) { a.open(); return true; } K.status('That is attached to the screen, so there is nothing to open. Attach it to a person.'); return true; }
  if (v.startsWith('go:')) { const id = v.slice(3); if (K.screens[id]) K.show(id); return true; }
  if (v.startsWith('act:')) { const a = ((typeof sc.actions === 'function' ? sc.actions() : []) || []).find(x => x.id === v.slice(4)); if (a) a.run(); return true; }
  return false;
}
function anchorFor(sc, id) { return anchorsOf(sc).find(a => a.id === id) || null; }
function contentOf(p, q, a) {
  const show = p[q + 'show'], f = a && a.fields;
  let t = String(p[q + 'text'] || '');
  if (f && show !== 'custom') {
    if (show === 'name') t = f.name || ''; else if (show === 'first') t = String(f.name || '').split(' ')[0];
    else if (show === 'count') t = f.count ? String(f.count) : ''; else if (show === 'msg') t = f.msg || '';
    else if (show === 'namecount') t = (f.name || '') + (f.count ? ' · ' + f.count : '');
    if (p[q + 'text'] && show !== 'custom' && p[q + 'text'] !== 'Text') t = (p[q + 'prefix'] ? '' : '') + t;
  }
  if (p[q + 'before']) t = p[q + 'before'] + t; if (p[q + 'after']) t = t + p[q + 'after'];
  if (p[q + 'caps']) t = t.toUpperCase();
  return t.split('\\n');
}

function addSpec(sc) {
  const add = [], first = sc.SPEC.findIndex(s => s.group === 'Background');
  const def = (section, target, k, label, type, d, o = {}) => add.push(Object.assign({ group: G, section, target, k, label, type, def: d }, o));
  def('Add text', 'text', 'tx.add', 'Add a text', 'action', null, { onclick: () => addText(sc, false), info: 'Adds a new text to this page (up to ' + N + ' texts and buttons). Drag it on the phone to place it. Then pick what it is attached to and what it shows.' });
  def('Add text', 'text', 'tx.addBtn', 'Add a button', 'action', null, { onclick: () => addText(sc, true), info: 'A button is a text with a box that does something when tapped: go to any page, go back, open the person it is attached to, next batch, and more. Pick it under "When tapped".' });
  def('Add text', 'text', 'tx.showAll', 'Show all texts', 'bool', true, { info: 'Off hides every text on this page without deleting them.' });
  def('Add text', 'text', 'tx.lock', 'Lock texts (no dragging)', 'bool', false);
  def('Add text', 'text', 'tx.tryStudio', 'Buttons work in the studio on double-click', 'bool', true, { info: 'On the phone one tap works the button. In the studio one click selects it and a double-click works it, so you can still drag and edit it.' });
  for (let i = 0; i < N; i++) {
    const S = 'Text ' + (i + 1), t = 'text.' + i, q = 'tx' + i + '.', hide = P => !P[q + 'on'];
    const d = (k, label, type, v, o = {}) => def(S, t, q + k, label, type, v, Object.assign({ hideIf: hide }, o));
    d('on', 'Use this text', 'bool', false, { info: 'Off removes it from the page (its settings stay until you reuse the slot).' });
    d('text', 'Words', 'text', 'Text', { info: 'Type \\n for a new line. Used when "Shows" is "The words I type".' });
    const at = { group: G, section: S, target: t, k: q + 'attach', label: 'Attached to', type: 'select', def: 'screen', hideIf: hide, info: 'Whatever it is attached to, it moves with. Attach to a person to show their name, count or message.' };
    Object.defineProperty(at, 'opts', { get: () => anchorsOf(sc).map(a => [a.id, a.label]) }); add.push(at);
    d('show', 'Shows', 'select', 'custom', { opts: SHOWS, info: 'Name, count and message work when it is attached to a person.' });
    const tp = { group: G, section: S, target: t, k: q + 'tap', label: 'When tapped', type: 'select', def: 'none', hideIf: hide, info: 'Makes it a button. Pick any page to go to, go back, open what it is attached to, or this page\'s own actions.' };
    Object.defineProperty(tp, 'opts', { get: () => actionsOf(sc) }); add.push(tp);
    d('before', 'Words before it', 'text', '');
    d('after', 'Words after it', 'text', '');
    d('x', 'Left / right', 'num', 0, { min: -900, max: 900, step: 1, unit: 'px', info: 'From what it is attached to. Or drag it on the phone.' });
    d('y', 'Up / down', 'num', 0, { min: -1800, max: 1800, step: 1, unit: 'px' });
    d('rot', 'Turn', 'num', 0, { min: -180, max: 180, step: .5, unit: '°' });
    d('font', 'Font', 'select', 'Roboto', { opts: FONTS });
    d('size', 'Size', 'num', 16, { min: 4, max: 160, step: .5, unit: 'px' });
    d('weight', 'Weight', 'select', '500', { opts: [['300', 'Light'], ['400', 'Regular'], ['500', 'Medium'], ['700', 'Bold'], ['900', 'Black']] });
    d('italic', 'Italic', 'bool', false);
    d('caps', 'ALL CAPS', 'bool', false);
    d('spacing', 'Letter spacing', 'num', 0, { min: -4, max: 30, step: .1, unit: 'px' });
    d('lh', 'Line spacing', 'num', 1.2, { min: .6, max: 3, step: .01, unit: '×' });
    d('align', 'Alignment', 'select', 'center', { opts: [['left', 'Left'], ['center', 'Center'], ['right', 'Right']] });
    d('color', 'Color', 'color', '#FFFFFF');
    d('opacity', 'Opacity', 'num', 1, { min: 0, max: 1, step: .01 });
    d('glow', 'Glow', 'num', 0, { min: 0, max: 40, step: .5, unit: 'px' });
    d('glowColor', 'Glow color', 'color', '#5FD8FF');
    d('shadow', 'Shadow strength', 'num', .7, { min: 0, max: 1, step: .01 });
    d('shadowBlur', 'Shadow softness', 'num', 4, { min: 0, max: 30, step: .5, unit: 'px' });
    d('shadowY', 'Shadow drop', 'num', 1, { min: -20, max: 20, step: .5, unit: 'px' });
    d('outline', 'Outline width', 'num', 0, { min: 0, max: 12, step: .1, unit: 'px' });
    d('outlineColor', 'Outline color', 'color', '#000000');
    d('bg', 'Background box', 'bool', false);
    d('bgColor', 'Box color', 'color', '#000000');
    d('bgOp', 'Box opacity', 'num', .55, { min: 0, max: 1, step: .01 });
    d('bgRound', 'Box corner roundness', 'num', 12, { min: 0, max: 100, step: 1, unit: 'px' });
    d('bgPadX', 'Box space sides', 'num', 8, { min: 0, max: 80, step: 1, unit: 'px' });
    d('bgPadY', 'Box space top / bottom', 'num', 4, { min: 0, max: 80, step: 1, unit: 'px' });
    d('bgLine', 'Box outline width', 'num', 0, { min: 0, max: 10, step: .1, unit: 'px' });
    d('bgLineColor', 'Box outline color', 'color', '#FFFFFF');
    d('front', 'In front of everything', 'bool', true, { info: 'Off = drawn before the people layer (unread people cover it).' });
    d('del', 'Delete this text', 'action', null, { onclick: () => delText(sc, i) });
  }
  sc.SPEC.splice(first < 0 ? sc.SPEC.length : first, 0, ...add);
  add.forEach(s => { sc.DEF[s.k] = s.def; sc.P[s.k] = s.def; });
}
function addText(sc, button) {
  const p = sc.P; let i = -1; for (let k = 0; k < N; k++) if (!p['tx' + k + '.on']) { i = k; break; }
  if (i < 0) { K.status('All ' + N + ' text slots on this page are used. Delete one to add another.'); return; }
  const q = 'tx' + i + '.';
  K.setVal(q + 'on', true); K.setVal(q + 'attach', 'center'); K.setVal(q + 'x', 0); K.setVal(q + 'y', 0); K.setVal(q + 'text', button ? 'Button' : 'Text');
  if (button) { K.setVal(q + 'bg', true); K.setVal(q + 'bgColor', '#1E88E5'); K.setVal(q + 'bgOp', .9); K.setVal(q + 'bgPadX', 18); K.setVal(q + 'bgPadY', 10); K.setVal(q + 'bgRound', 22); K.setVal(q + 'weight', '700'); K.setVal(q + 'shadow', 0); K.setVal(q + 'tap', 'back'); }
  if (K.commit) K.commit(); K.rebuild(); K.openSection(G, 'Text ' + (i + 1));
}
function delText(sc, i) {
  const q = 'tx' + i + '.'; sc.SPEC.filter(s => s.k && s.k.startsWith(q) && s.type !== 'action').forEach(s => K.setVal(s.k, s.def, false));
  if (K.commit) K.commit(); K.rebuild(); K.openSection(G, 'Add text');
}

function layout(sc, ctx, i) {
  const p = sc.P, q = 'tx' + i + '.'; if (!p[q + 'on'] || !p['tx.showAll']) return null;
  const a = anchorFor(sc, p[q + 'attach']); if (!a || a.x == null) return null;
  const lines = contentOf(p, q, a); if (!lines.join('').trim()) return null;
  const fs = p[q + 'size'], font = `${p[q + 'italic'] ? 'italic ' : ''}${p[q + 'weight']} ${fs}px "${p[q + 'font']}", Roboto, system-ui, sans-serif`;
  ctx.save(); ctx.font = font; try { ctx.letterSpacing = p[q + 'spacing'] + 'px'; } catch (e) {}
  const w = Math.max(...lines.map(l => ctx.measureText(l).width)); ctx.restore();
  const lh = fs * p[q + 'lh'], h = lh * lines.length, x = a.x + p[q + 'x'], y = a.y + p[q + 'y'], al = p[q + 'align'];
  const left = al === 'left' ? x : al === 'right' ? x - w : x - w / 2;
  return { q, lines, font, fs, lh, w, h, x, y, left, top: y - h / 2, al, rot: p[q + 'rot'] * Math.PI / 180 };
}
function drawTexts(sc, ctx, front) {
  const p = sc.P; sc._tx = sc._tx || []; if (front) sc._tx = [];
  for (let i = 0; i < N; i++) {
    const q = 'tx' + i + '.'; if (!!p[q + 'front'] !== front) continue;
    const L = layout(sc, ctx, i); if (!L) continue;
    const padX = p[q + 'bg'] ? p[q + 'bgPadX'] : 0, padY = p[q + 'bg'] ? p[q + 'bgPadY'] : 0;
    const box = { x: L.left - padX, y: L.top - padY, w: L.w + padX * 2, h: L.h + padY * 2 };
    ctx.save(); ctx.globalAlpha *= p[q + 'opacity'];
    ctx.translate(L.x, L.y); ctx.rotate(L.rot); ctx.translate(-L.x, -L.y);
    if (p[q + 'bg']) {
      ctx.fillStyle = rgba(p[q + 'bgColor'], p[q + 'bgOp']); ctx.beginPath(); ctx.roundRect(box.x, box.y, box.w, box.h, Math.min(p[q + 'bgRound'], box.h / 2)); ctx.fill();
      if (p[q + 'bgLine'] > 0) { ctx.lineWidth = p[q + 'bgLine']; ctx.strokeStyle = p[q + 'bgLineColor']; ctx.stroke(); }
    }
    ctx.font = L.font; try { ctx.letterSpacing = p[q + 'spacing'] + 'px'; } catch (e) {}
    ctx.textAlign = L.al; ctx.textBaseline = 'middle';
    const kk = K.scaleOf(ctx);
    L.lines.forEach((line, n) => {
      const yy = L.top + L.lh * (n + .5);
      if (p[q + 'outline'] > 0) { ctx.save(); ctx.lineJoin = 'round'; ctx.lineWidth = p[q + 'outline'] * 2; ctx.strokeStyle = p[q + 'outlineColor']; ctx.strokeText(line, L.x, yy); ctx.restore(); }
      ctx.save();
      if (p[q + 'glow'] > 0) { ctx.shadowColor = p[q + 'glowColor']; ctx.shadowBlur = p[q + 'glow'] * kk; ctx.fillStyle = p[q + 'color']; ctx.fillText(line, L.x, yy); }
      if (p[q + 'shadow'] > 0) { ctx.shadowColor = `rgba(0,0,0,${p[q + 'shadow']})`; ctx.shadowBlur = p[q + 'shadowBlur'] * kk; ctx.shadowOffsetY = p[q + 'shadowY'] * kk; } else ctx.shadowColor = 'transparent';
      ctx.fillStyle = p[q + 'color']; ctx.fillText(line, L.x, yy); ctx.restore();
    });
    ctx.restore();
    sc._tx.push({ i, x: box.x, y: box.y, w: box.w, h: box.h, cx: L.x, cy: L.y, rot: L.rot });
  }
}
function hitText(sc, p, anyLock) {
  if (!sc._tx || (!anyLock && sc.P['tx.lock']) || !sc.P['tx.showAll']) return null;
  for (let k = sc._tx.length - 1; k >= 0; k--) {
    const r = sc._tx[k], c = Math.cos(-r.rot), s = Math.sin(-r.rot), dx = p.x - r.cx, dy = p.y - r.cy, x = r.cx + dx * c - dy * s, y = r.cy + dx * s + dy * c;
    if (x >= r.x - 4 && x <= r.x + r.w + 4 && y >= r.y - 4 && y <= r.y + r.h + 4) return r;
  }
  return null;
}

function attach(sc) {
  if (!sc || wrapped.has(sc) || !sc.SPEC) return; wrapped.add(sc);
  addSpec(sc);
  const o = { draw: sc.draw, highlight: sc.highlight, bounds: sc.bounds, pick: sc.pick, pointer: sc.pointer };
  sc.draw = function (ctx, now, studio) {
    if (o.draw) o.draw.call(this, ctx, now, studio);
    try { drawTexts(sc, ctx, true); } catch (e) { console.error(e); }
    if (studio && String(K.currentTarget ? K.currentTarget() : '').startsWith('text')) K.hl(ctx, now);
  };
  sc.highlight = function (ctx, base, sub, H1, now) {
    if (!String(base).startsWith('text')) return o.highlight ? o.highlight.call(this, ctx, base, sub, H1, now) : undefined;
    const idx = base === 'text' ? null : +String(base).split('.')[1];
    (sc._tx || []).filter(r => idx == null || r.i === idx).forEach(r => H1(() => { ctx.save(); ctx.translate(r.cx, r.cy); ctx.rotate(r.rot); ctx.translate(-r.cx, -r.cy); ctx.beginPath(); ctx.roundRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8, 6); ctx.restore(); }));
  };
  sc.bounds = function (base, sub) {
    if (!String(base).startsWith('text')) return o.bounds ? o.bounds.call(this, base, sub) : { x: 0, y: (K.H - K.W) / 2, s: K.W };
    const idx = base === 'text' ? null : +String(base).split('.')[1], rs = (sc._tx || []).filter(r => idx == null || r.i === idx);
    if (!rs.length) return o.bounds ? o.bounds.call(this, null, null) : { x: 0, y: (K.H - K.W) / 2, s: K.W };
    const x = Math.min(...rs.map(r => r.x)), y = Math.min(...rs.map(r => r.y)), x2 = Math.max(...rs.map(r => r.x + r.w)), y2 = Math.max(...rs.map(r => r.y + r.h)), s = Math.max(x2 - x, y2 - y) * 1.4 + 30;
    return { x: (x + x2) / 2 - s / 2, y: (y + y2) / 2 - s / 2, s };
  };
  sc.pick = function (p) { const r = hitText(sc, p); if (r) return [G, 'Text ' + (r.i + 1)]; return o.pick ? o.pick.call(this, p) : null; };
  let drag = null, tapQ = null, lastTap = { q: null, t: 0 };
  const ptr = o.pointer || {};
  sc.pointer = {
    down(p, e) {
      if (K.viewOnly) { const r = hitText(sc, p, true); if (r && sc.P['tx' + r.i + '.tap'] !== 'none') { tapQ = 'tx' + r.i + '.'; return; } }
      const r = K.viewOnly ? null : hitText(sc, p); if (r) { const q = 'tx' + r.i + '.'; drag = { q, sx: p.x, sy: p.y, x0: sc.P[q + 'x'], y0: sc.P[q + 'y'], moved: false }; K.openSection(G, 'Text ' + (r.i + 1)); return; } return ptr.down && ptr.down(p, e); },
    move(p, e) { if (drag) { const dx = p.x - drag.sx, dy = p.y - drag.sy; if (Math.hypot(dx, dy) > 3) drag.moved = true; if (drag.moved) { K.setVal(drag.q + 'x', Math.round(drag.x0 + dx)); K.setVal(drag.q + 'y', Math.round(drag.y0 + dy)); } return; } return ptr.move && ptr.move(p, e); },
    up(p, e) {
      if (drag) { const d = drag; drag = null; if (d.moved) { if (K.commit) K.commit(); return; }
        const now = performance.now(), dbl = lastTap.q === d.q && now - lastTap.t < 380; lastTap = { q: d.q, t: now };
        if (dbl && sc.P['tx.tryStudio']) runAction(sc, d.q); return; }
      if (tapQ) { const q = tapQ; tapQ = null; runAction(sc, q); return; }
      return ptr.up && ptr.up(p, e);
    },
    cancel(p, e) { if (drag || tapQ) { drag = null; tapQ = null; return; } return ptr.cancel && ptr.cancel(p, e); },
  };
  sc.toolbar = (sc.toolbar || []).concat([{ label: '+ Text', title: 'Add text anywhere on this page and attach it to anything', onclick: () => { if (K.cur === sc) addText(sc, false); } }, { label: '+ Button', title: 'Add a button anywhere that does whatever you pick', onclick: () => { if (K.cur === sc) addText(sc, true); } }]);
}
for (const id of K.order) attach(K.screens[id]);
const show0 = K.show; K.show = function (id, opts) { if (curScreen && curScreen !== id) lastScreen = curScreen; curScreen = id; return show0.call(this, id, opts); };
const scr0 = K.screen; K.screen = function (d) { const sc = scr0.call(this, d); attach(sc); return sc; };
K.textLayer = { attach, anchorsOf };
})();
