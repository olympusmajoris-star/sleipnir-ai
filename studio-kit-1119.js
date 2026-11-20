/* =====================================================================
   STUDIO KIT 1119 — shared shell for Danny's real-Dart studio pages.
   Each screen module (e.g. raven-dial-1119.js) registers with
   StudioKit.screen({...}) and supplies: spec, draw, highlight drawing,
   zoom bounds, pick, pointer handlers. The kit supplies: phone stage,
   see-through background (camera / tilt / plain), grouped controls with
   info + original + reset, gold highlight edges, live close-up window,
   pick-a-part mode, undo/redo, autosave to Supabase studio_designs.
   ===================================================================== */
(() => {
'use strict';
const SB = { url: 'https://afnihsdxtisneuyehatw.supabase.co', key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmbmloc2R4dGlzbmV1eWVoYXR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NjUxMDcsImV4cCI6MjA4NzE0MTEwN30.q94Gw7BVKgyGm-I_XXGaoScVK50MMfQMk2RHms3qhps' };
const TAU = Math.PI * 2, D2R = Math.PI / 180;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ease = t => 1 - Math.pow(1 - t, 3);
const smooth = x => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const $ = id => document.getElementById(id);
const hexCache = {};
function rgb(h) { if (Array.isArray(h)) return h; if (hexCache[h]) return hexCache[h]; let s = String(h).replace('#', ''); if (s.length === 3) s = s.split('').map(c => c + c).join(''); const n = parseInt(s.slice(0, 6), 16) || 0; return (hexCache[h] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]); }
function rgba(h, a) { const c = rgb(h); return `rgba(${c[0]},${c[1]},${c[2]},${clamp(a, 0, 1)})`; }
function mix(a, b, t) { a = rgb(a); b = rgb(b); return a.map((v, i) => Math.round(v + (b[i] - v) * t)); }
function hsv(h, s, v) { h = ((h % 360) + 360) % 360; const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c; let r = 0, g = 0, b = 0; if (h < 60) [r, g, b] = [c, x, 0]; else if (h < 120) [r, g, b] = [x, c, 0]; else if (h < 180) [r, g, b] = [0, c, x]; else if (h < 240) [r, g, b] = [0, x, c]; else if (h < 300) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x]; return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)]; }
const WHITE = [255, 255, 255];
function scaleOf(ctx) { const t = ctx.getTransform(); return Math.sqrt(Math.abs(t.a * t.d - t.b * t.c)); }
function blur(ctx, sigma) { ctx.filter = sigma > 0 ? `blur(${(sigma * scaleOf(ctx)).toFixed(2)}px)` : 'none'; }
function arc(ctx, c, r, start, sweep, width, color, alpha, glow) {
  if (width <= 0 || alpha <= 0 || r <= 0 || sweep === 0) return;
  ctx.save(); ctx.lineCap = 'butt'; ctx.lineWidth = width; ctx.strokeStyle = rgba(color, alpha);
  if (glow > 0) blur(ctx, glow);
  ctx.beginPath(); ctx.arc(c.x, c.y, r, start, start + sweep, sweep < 0); ctx.stroke(); ctx.restore();
}
function shadowBlurFor(ctx, flutterBlurRadius) { return 2 * (flutterBlurRadius * .57735 + .5) * scaleOf(ctx); }
const BG_LIST = Array.from({ length: 23 }, (_, i) => 'bg' + String(i + 1).padStart(2, '0'));
function bgSpec(def) {
  def('Background', 'Mode', 'bg', 'bg.mode', 'Background', 'select', 'camera', { opts: [['camera', 'Live camera (see-through)'], ['tilt', 'Tilt backdrop (moves with phone)'], ['plain', 'Plain black']], info: 'What shows behind the page. Live camera = see-through. Tilt backdrop = one of your bg images that shifts as you tilt the phone (mouse on PC).' });
  def('Background', 'Mode', 'bg', 'bg.facing', 'Camera', 'select', 'environment', { opts: [['environment', 'Back camera'], ['user', 'Front camera']] });
  def('Background', 'Mode', 'bg', 'bg.image', 'Backdrop image', 'select', 'bg02', { opts: BG_LIST.map(b => [b, b]), info: 'Your images from the studio bg folder, used by Tilt backdrop.' });
  def('Background', 'Tilt', 'bg', 'bg.tilt', 'Tilt travel', 'num', 40, { min: 0, max: 160, step: 1, unit: 'px' });
  def('Background', 'Tilt', 'bg', 'bg.zoom', 'Backdrop zoom', 'num', 1.25, { min: 1, max: 2.5, step: .01, unit: '×' });
  def('Background', 'Tilt', 'bg', 'bg.smooth', 'Tilt smoothing', 'num', .85, { min: 0, max: .97, step: .01 });
  def('Background', 'Look', 'bg', 'bg.dim', 'Darken', 'num', .35, { min: 0, max: .95, step: .01, info: 'Darkens what is behind so the page stays readable.' });
  def('Background', 'Look', 'bg', 'bg.dimColor', 'Darken color', 'color', '#000000');
  def('Background', 'Look', 'bg', 'bg.blur', 'Blur', 'num', 0, { min: 0, max: 24, step: .5, unit: 'px' });
}
function makeSpec(builder) {
  const SPEC = [];
  const def = (group, section, target, k, label, type, d, o = {}) => SPEC.push(Object.assign({ group, section, target, k, label, type, def: d }, o));
  builder(def);
  const DEF = {}, BY = {};
  SPEC.forEach(s => { DEF[s.k] = s.def; BY[s.k] = s; });
  return { SPEC, DEF, BY };
}

/* ---------- DOM shell ---------- */
const CSS = `:root{--bg:#0a0e13;--panel:#111821;--panel2:#16202b;--line:#233142;--text:#e2eaf3;--mut:#8ea3b8;--acc:#3fd0ae;--hl:#ffc83d}
*{box-sizing:border-box}html,body{margin:0;height:100%;background:var(--bg);color:var(--text);font:13px/1.35 Roboto,system-ui,sans-serif;overflow:hidden;-webkit-tap-highlight-color:transparent}
button,select,input{font:inherit;color:var(--text)}button{background:var(--panel2);border:1px solid var(--line);border-radius:8px;padding:6px 10px;cursor:pointer;white-space:nowrap}button:hover{border-color:#3b4f66}button.on{border-color:var(--acc);background:#123029;color:#bff3e6}button:disabled{opacity:.4;cursor:default}
select,input[type=text],input[type=number]{background:#0c1219;border:1px solid var(--line);border-radius:7px;padding:4px 6px}
#app{display:grid;grid-template-columns:auto 1fr;height:100%}#stageWrap{position:relative;height:100%;padding:10px;display:flex;align-items:center;justify-content:center;background:#04060a;border-right:1px solid var(--line)}
#stage{display:block;border-radius:24px;background:#000;touch-action:none;box-shadow:0 0 0 1px #1c2734}#stageWrap.pick #stage{cursor:crosshair}
#side{display:flex;flex-direction:column;min-width:0;height:100%}#bar{display:flex;gap:6px;align-items:center;padding:8px 10px;border-bottom:1px solid var(--line);flex-wrap:wrap}
#crumb{font-weight:500;margin-right:auto;font-size:14px}#crumb small{color:var(--mut);font-weight:400}#status{color:var(--mut);font-size:12px;padding:0 10px 6px;min-height:20px}
#screens,#tabs,#chips{display:flex;gap:6px;padding:8px 10px;flex-wrap:wrap;border-bottom:1px solid var(--line)}#screens:empty{display:none}#screens button{padding:7px 14px;font-weight:500}#screens button.on{background:#14304a;border-color:#4aa8ff;color:#d6ecff}
#tabs button{padding:7px 12px}#chips button{padding:5px 10px;font-size:12px;border-radius:999px}
#work{flex:1;min-height:0;display:grid;grid-template-columns:minmax(320px,580px) minmax(260px,380px);gap:14px;padding:12px;overflow:hidden;align-content:start}#controls{overflow:auto;max-height:100%;padding-right:4px}
.box{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:8px 10px}.boxHead{display:flex;align-items:center;gap:8px;padding:2px 2px 8px;border-bottom:1px solid var(--line);margin-bottom:6px}.boxHead b{font-size:14px;font-weight:500;margin-right:auto}
.row{display:grid;grid-template-columns:150px minmax(0,1fr) 28px;gap:8px;align-items:center;padding:5px 6px;border-radius:8px;border:1px solid transparent}.row:hover,.row.act{background:#172230;border-color:#2c3d52}
.lab{display:flex;align-items:center;gap:6px;min-width:0}.lab span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.info{width:18px;height:18px;padding:0;border-radius:50%;font-size:11px;line-height:16px;flex:none;color:var(--mut)}
.ctl{display:flex;align-items:center;gap:8px;min-width:0}.ctl input[type=range]{flex:1;min-width:60px;max-width:220px;accent-color:var(--acc)}.ctl input[type=number]{width:74px}.ctl input[type=text]{flex:1;min-width:0}
.ctl input[type=color]{width:34px;height:26px;padding:0;border:1px solid var(--line);border-radius:6px;background:none}.unit{color:var(--mut);font-size:11px;min-width:16px}.rst{width:26px;height:26px;padding:0;color:var(--mut)}
.sw{width:44px;height:24px;border-radius:12px;padding:0;position:relative;background:#26313d}.sw::after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#8ea3b8;transition:left .15s}.sw.on{background:#1d6b59;border-color:#2aa486}.sw.on::after{left:23px;background:#e6fff8}
.note{grid-column:1/-1;color:var(--mut);font-size:12px;padding:2px 2px 4px 26px}#zoomBox{display:flex;flex-direction:column;gap:8px}#zoomWrap{background:#000;border:1px solid var(--line);border-radius:12px;overflow:hidden;position:relative}#zoom{display:block;width:100%;aspect-ratio:1/1}
#zoomLab{position:absolute;left:8px;top:6px;font-size:11px;color:#cfe;background:rgba(0,0,0,.55);padding:2px 6px;border-radius:6px}#zoomHelp{color:var(--mut);font-size:12px}#legend{display:flex;align-items:center;gap:6px;color:var(--mut);font-size:12px}#legend i{display:inline-block;width:22px;height:0;border-top:2px dashed var(--hl)}
#toast{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom) + 96px);transform:translateX(-50%) translateY(20px);max-width:86vw;background:rgba(10,14,19,.92);color:#e8eef5;border:1px solid #2a3a4a;border-radius:14px;padding:10px 14px;font:500 13px/1.35 Roboto,system-ui,sans-serif;text-align:center;opacity:0;pointer-events:none;transition:opacity .2s,transform .2s;z-index:20}#toast.on{opacity:1;transform:translateX(-50%) translateY(0)}html.viewonly #mobBtns,html.viewonly #side{display:none!important}#mobBtns{display:none}#phoneLink{font-size:12px;color:var(--mut)}#phoneLink a{color:#9fe}
@media (max-width:820px){#app{display:block}#stageWrap{position:fixed;inset:0;padding:0;border:0}#stage{border-radius:0;box-shadow:none}#side{position:fixed;left:0;right:0;bottom:0;height:52vh;background:rgba(10,14,19,.97);border-top:1px solid var(--line);border-radius:16px 16px 0 0;transform:translateY(105%);transition:transform .25s;z-index:5}#side.open{transform:none}#work{grid-template-columns:1fr;padding:8px;overflow:auto}#zoomBox{display:none}#controls{max-height:none;overflow:visible}.row{grid-template-columns:118px minmax(0,1fr) 28px}#bar .desk{display:none}#mobBtns{display:flex;gap:8px;position:fixed;right:10px;top:calc(env(safe-area-inset-top) + 10px);z-index:6}#mobBtns button{background:rgba(10,14,19,.75);backdrop-filter:blur(6px)}}`;
const HTML = `<div id="app"><div id="stageWrap"><canvas id="stage"></canvas></div><div id="side"><div id="bar"><div id="crumb"></div><span id="screenBtns"></span><button id="bUndo">Undo</button><button id="bRedo">Redo</button><button id="bPick" title="Click a part to open its controls">Pick part</button><button id="bHl" class="on" title="Show the highlighted edges">Highlights</button><select id="selPhone" class="desk" title="Phone screen size"></select><button id="bSave" title="Save to the shared studio">Save</button></div><div id="status">Loading…</div><div id="screens"></div><div id="tabs"></div><div id="chips"></div><div id="work"><div id="controls"></div><div id="zoomBox"><div id="zoomWrap"><canvas id="zoom"></canvas><div id="zoomLab"></div></div><div id="legend"><i></i> dashed gold edge = what the control you're on changes</div><div id="zoomHelp">Close-up of the part you're editing, live.</div><div id="phoneLink"></div></div></div></div></div><div id="mobBtns"><button id="mPick">Pick part</button><button id="mCtl">Controls</button></div><video id="cam" playsinline muted autoplay style="display:none"></video>`;

const K = { TAU, D2R, clamp, ease, smooth, wrap, rgb, rgba, mix, hsv, WHITE, scaleOf, blur, arc, shadowBlurFor, makeSpec, bgSpec, W: 390, H: 844, isMobile: false, screens: {}, order: [] };
let cur = null; // current screen
let pickMode = false, showHL = true, hover = null, hoverUntil = 0, cssScale = 1, frame = 0, last = performance.now(), frozen = false;
let stage, sctx, zoom, zctx, cam;

/* ---------- background ---------- */
let camState = 'off', camFacing = null, camStream = null; const bgImg = new Image(); let bgLoaded = '';
const tilt = { tx: 0, ty: 0, x: 0, y: 0 }; K.tilt = tilt;
async function ensureCamera() {
  const P = cur.P;
  if (P['bg.mode'] !== 'camera') { stopCamera(); return; }
  if (camState === 'on' && camFacing === P['bg.facing']) return;
  if (camState === 'starting') return;
  stopCamera(); camState = 'starting';
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw Error('no camera api');
    camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: P['bg.facing'] }, width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false });
    cam.srcObject = camStream; await cam.play().catch(() => {}); camState = 'on'; camFacing = P['bg.facing'];
  } catch (e) { camState = 'failed'; status('Camera not available here (' + (e.name || e.message) + '). Showing black. On the phone, allow the camera.'); }
}
function stopCamera() { if (camStream) camStream.getTracks().forEach(t => t.stop()); camStream = null; camState = cur && cur.P['bg.mode'] === 'camera' && camState === 'failed' ? 'failed' : 'off'; camFacing = null; }
function cover(ctx, src, sw, sh, zm, ox, oy, mirror) { const W = K.W, H = K.H, s = Math.max(W / sw, H / sh) * zm, dw = sw * s, dh = sh * s; ctx.save(); if (mirror) { ctx.translate(W, 0); ctx.scale(-1, 1); } ctx.drawImage(src, (W - dw) / 2 + ox, (H - dh) / 2 + oy, dw, dh); ctx.restore(); }
function drawBackground(ctx, P) {
  const W = K.W, H = K.H;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
  if (P['bg.blur'] > 0) blur(ctx, P['bg.blur']);
  if (P['bg.mode'] === 'camera' && camState === 'on' && cam.videoWidth) cover(ctx, cam, cam.videoWidth, cam.videoHeight, 1, 0, 0, P['bg.facing'] === 'user');
  else if (P['bg.mode'] === 'tilt') { const f = 'bg/' + P['bg.image'] + '.jpg'; if (bgLoaded !== f) { bgLoaded = f; bgImg.src = f; } if (bgImg.complete && bgImg.naturalWidth) cover(ctx, bgImg, bgImg.naturalWidth, bgImg.naturalHeight, P['bg.zoom'], tilt.x * P['bg.tilt'], tilt.y * P['bg.tilt'], false); }
  ctx.restore();
  if (P['bg.dim'] > 0) { ctx.fillStyle = rgba(P['bg.dimColor'], P['bg.dim']); ctx.fillRect(0, 0, W, H); }
}

K.drawBackground = (ctx, P) => drawBackground(ctx, P);
/* ---------- highlight ---------- */
function activeTarget() { if (hover && (hoverUntil === Infinity || performance.now() < hoverUntil)) return hover; return null; }
function sectionTarget() { const s = cur.SPEC.find(x => x.group === cur.ui.group && x.section === cur.ui.section); return s ? s.target.split(':')[0] : null; }
function hlStroke(ctx, build, now, strong) {
  const k = Math.min(window.devicePixelRatio || 1, 3) / scaleOf(ctx);
  const a = strong ? .75 + .25 * Math.sin(now / 170) : .45;
  ctx.save(); ctx.setLineDash([]); ctx.lineWidth = 3.4 * k; ctx.strokeStyle = 'rgba(0,0,0,.55)'; build(); ctx.stroke();
  ctx.lineWidth = (strong ? 1.8 : 1.2) * k; ctx.setLineDash([6 * k, 4 * k]); ctx.lineDashOffset = -now / 45 * k; ctx.strokeStyle = `rgba(255,200,61,${a})`; build(); ctx.stroke(); ctx.restore();
}
K.hl = function (ctx, now) {
  if (!showHL) return;
  if (K.isMobile && !$('side').classList.contains('open') && !activeTarget()) return;
  let tg = activeTarget(), strong = true;
  if (!tg) { tg = sectionTarget(); strong = false; }
  if (!tg) return;
  const H1 = fn => hlStroke(ctx, fn, now, strong);
  const [base, sub] = tg.split(':');
  if (base === 'bg') { H1(() => { ctx.beginPath(); ctx.rect(3, 3 - (cur.ty || 0), K.W - 6, K.H - 6); }); return; }
  cur.highlight(ctx, base, sub, H1, now);
};
function targetBounds() { const tg = activeTarget() || sectionTarget(); if (tg && tg.split(':')[0] === 'bg') return { x: 0, y: (K.H - K.W) / 2, s: K.W }; return cur.bounds(tg ? tg.split(':')[0] : null, tg ? tg.split(':')[1] : null); }

/* ---------- stage ---------- */
const PHONES = [['390x844', '390 × 844 (standard)'], ['360x780', '360 × 780 (Galaxy S)'], ['384x832', '384 × 832 (Galaxy)'], ['412x915', '412 × 915 (Galaxy Ultra)'], ['393x852', '393 × 852 (iPhone 15)']];
function layout() {
  K.isMobile = window.matchMedia('(max-width:820px)').matches;
  K.viewOnly = K.isMobile && !/[?&]edit=1/.test(location.search); document.documentElement.classList.toggle('viewonly', K.viewOnly);
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  if (K.isMobile) { K.W = Math.round(window.innerWidth); K.H = Math.round(window.innerHeight); cssScale = 1; stage.style.width = K.W + 'px'; stage.style.height = K.H + 'px'; }
  else { const [pw, ph] = ($('selPhone').value || '390x844').split('x').map(Number); K.W = pw; K.H = ph; const availH = window.innerHeight - 20, availW = Math.max(240, window.innerWidth * .42); cssScale = Math.min(availH / K.H, availW / K.W); stage.style.width = K.W * cssScale + 'px'; stage.style.height = K.H * cssScale + 'px'; }
  stage.width = Math.round(K.W * cssScale * dpr); stage.height = Math.round(K.H * cssScale * dpr);
  const zr = zoom.getBoundingClientRect(); zoom.width = Math.round((zr.width || 340) * dpr); zoom.height = Math.round((zr.width || 340) * dpr);
  if (cur && cur.onLayout) cur.onLayout();
}
function toLocal(ev) { const r = stage.getBoundingClientRect(); return { x: (ev.clientX - r.left) / r.width * K.W, y: (ev.clientY - r.top) / r.height * K.H }; }
function vibrate(ms) { if (navigator.vibrate) try { navigator.vibrate(ms); } catch (e) {} }
K.vibrate = vibrate;

/* ---------- controls ---------- */
function fmt(v, s) { if (s.type === 'int') return String(Math.round(v)); const st = s.step || .01, dec = st >= 1 ? 0 : st >= .1 ? 1 : st >= .01 ? 2 : 3; return Number(v).toFixed(dec); }
function shownDefault(s) { if (s.type === 'bool') return s.def ? 'On' : 'Off'; if (s.type === 'select') { const o = s.opts.find(o => String(o[0]) === String(s.def)); return o ? o[1] : s.def; } return s.type === 'num' || s.type === 'int' ? fmt(s.def, s) + (s.unit ? ' ' + s.unit : '') : s.def; }
const rowRefs = {};
function groups() { return [...new Set(cur.SPEC.map(s => s.group))]; }
function buildScreens() {
  const el = $('screens'); el.innerHTML = '';
  if (K.order.length < 2) return;
  K.order.forEach(id => { const s = K.screens[id], b = document.createElement('button'); b.textContent = s.title; b.className = s === cur ? 'on' : ''; b.onclick = () => K.show(id); el.appendChild(b); });
}
function buildTabs() { const el = $('tabs'); el.innerHTML = ''; groups().forEach(g => { const b = document.createElement('button'); b.textContent = g; b.className = g === cur.ui.group ? 'on' : ''; b.onclick = () => openSection(g, cur.ui.last[g]); el.appendChild(b); }); }
function buildChips() {
  const el = $('chips'); el.innerHTML = '';
  [...new Set(cur.SPEC.filter(s => s.group === cur.ui.group).map(s => s.section))].forEach(sec => {
    const b = document.createElement('button'); b.textContent = sec; b.className = sec === cur.ui.section ? 'on' : '';
    const tgt = cur.SPEC.find(s => s.group === cur.ui.group && s.section === sec).target.split(':')[0];
    b.onclick = () => openSection(cur.ui.group, sec);
    b.onpointerenter = () => { hover = tgt; hoverUntil = Infinity; }; b.onpointerleave = () => { hoverUntil = performance.now(); };
    el.appendChild(b);
  });
}
function openSection(g, sec) {
  const secs = [...new Set(cur.SPEC.filter(s => s.group === g).map(s => s.section))];
  cur.ui.group = g; cur.ui.section = secs.includes(sec) ? sec : secs[0]; cur.ui.last[g] = cur.ui.section;
  buildTabs(); buildChips(); buildControls();
  if (pickMode && K.isMobile) $('side').classList.add('open');
  hover = null;
}
K.openSection = openSection;
function buildControls() {
  for (const k in rowRefs) delete rowRefs[k];
  const el = $('controls'); el.innerHTML = '';
  const box = document.createElement('div'); box.className = 'box';
  const head = document.createElement('div'); head.className = 'boxHead'; head.innerHTML = `<b>${cur.ui.group} › ${cur.ui.section}</b>`;
  const rs = document.createElement('button'); rs.textContent = 'Reset section'; rs.title = 'Back to the Dart originals for this section';
  rs.onclick = () => { cur.SPEC.filter(s => s.group === cur.ui.group && s.section === cur.ui.section).forEach(s => setVal(s.k, s.def, false)); commit(); buildControls(); };
  head.appendChild(rs); box.appendChild(head);
  for (const s of cur.SPEC.filter(s => s.group === cur.ui.group && s.section === cur.ui.section)) box.appendChild(makeRow(s));
  el.appendChild(box); $('zoomLab').textContent = cur.title + ' › ' + cur.ui.group + ' › ' + cur.ui.section;
}
function makeRow(s) {
  const P = cur.P;
  const row = document.createElement('div'); row.className = 'row';
  const lab = document.createElement('div'); lab.className = 'lab';
  const ib = document.createElement('button'); ib.className = 'info'; ib.textContent = 'i'; ib.title = 'What this does';
  const ls = document.createElement('span'); ls.textContent = s.label; ls.title = s.label; lab.append(ib, ls);
  const ctl = document.createElement('div'); ctl.className = 'ctl';
  const rst = document.createElement('button'); rst.className = 'rst'; rst.textContent = '↺'; rst.title = 'Back to original: ' + shownDefault(s);
  const note = document.createElement('div'); note.className = 'note'; note.style.display = 'none';
  note.textContent = (s.info ? s.info + ' ' : '') + 'Original: ' + shownDefault(s) + (s.dart ? '  ·  Dart: ' + s.dart : '');
  ib.onclick = () => { note.style.display = note.style.display === 'none' ? 'block' : 'none'; };
  let refresh;
  if (s.type === 'num' || s.type === 'int') {
    const r = document.createElement('input'); r.type = 'range'; r.min = s.min; r.max = s.max; r.step = s.step || (s.type === 'int' ? 1 : .01);
    const n = document.createElement('input'); n.type = 'number'; n.step = r.step; n.min = s.min; n.max = s.max;
    const un = document.createElement('span'); un.className = 'unit'; un.textContent = s.unit || '';
    refresh = () => { r.value = cur.P[s.k]; n.value = fmt(cur.P[s.k], s); };
    r.oninput = () => setVal(s.k, s.type === 'int' ? Math.round(+r.value) : +r.value); r.onchange = () => commit();
    n.onchange = () => { let v = +n.value; if (!isFinite(v)) v = s.def; setVal(s.k, s.type === 'int' ? Math.round(v) : v); commit(); };
    ctl.append(r, n, un);
  } else if (s.type === 'bool') {
    const b = document.createElement('button'); b.className = 'sw'; const t = document.createElement('span'); t.className = 'unit';
    refresh = () => { b.classList.toggle('on', !!cur.P[s.k]); t.textContent = cur.P[s.k] ? 'On' : 'Off'; };
    b.onclick = () => { setVal(s.k, !cur.P[s.k]); commit(); }; ctl.append(b, t);
  } else if (s.type === 'color') {
    const c = document.createElement('input'); c.type = 'color'; const tx = document.createElement('input'); tx.type = 'text'; tx.style.maxWidth = '96px';
    refresh = () => { c.value = String(cur.P[s.k]).slice(0, 7); tx.value = String(cur.P[s.k]).toUpperCase(); };
    c.oninput = () => setVal(s.k, c.value.toUpperCase()); c.onchange = () => commit();
    tx.onchange = () => { const v = tx.value.trim(); if (/^#?[0-9a-f]{6}$/i.test(v)) { setVal(s.k, ('#' + v.replace('#', '')).toUpperCase()); commit(); } else refresh(); };
    ctl.append(c, tx);
  } else if (s.type === 'select') {
    const sel = document.createElement('select'); s.opts.forEach(([v, l]) => { const o = document.createElement('option'); o.value = v; o.textContent = l; sel.appendChild(o); });
    refresh = () => { sel.value = String(cur.P[s.k]); }; sel.onchange = () => { setVal(s.k, typeof s.def === 'number' ? +sel.value : sel.value); commit(); }; ctl.append(sel);
  } else {
    const tx = document.createElement('input'); tx.type = 'text';
    refresh = () => { if (document.activeElement !== tx) tx.value = cur.P[s.k]; }; tx.oninput = () => setVal(s.k, tx.value); tx.onchange = () => commit(); ctl.append(tx);
  }
  rst.onclick = () => { setVal(s.k, s.def); commit(); };
  const r1 = refresh; refresh = () => { r1(); rst.disabled = JSON.stringify(cur.P[s.k]) === JSON.stringify(s.def); };
  refresh(); rowRefs[s.k] = refresh;
  const tgt = s.target;
  row.addEventListener('pointerenter', () => { hover = tgt; hoverUntil = Infinity; row.classList.add('act'); });
  row.addEventListener('pointerleave', () => { if (hover === tgt) hoverUntil = performance.now() + (K.isMobile ? 1500 : 0); row.classList.remove('act'); });
  row.addEventListener('focusin', () => { hover = tgt; hoverUntil = Infinity; }); row.addEventListener('focusout', () => { hoverUntil = performance.now() + 1200; });
  row.addEventListener('touchstart', () => { hover = tgt; hoverUntil = Infinity; }, { passive: true }); row.addEventListener('touchend', () => { hoverUntil = performance.now() + 1500; }, { passive: true });
  row.append(lab, ctl, rst, note); return row;
}

/* ---------- values, history, save ---------- */
function setVal(k, v, refreshRow = true) {
  cur.P[k] = v; cur.dirty = true;
  if (cur.onSet) cur.onSet(k, v);
  if (k === 'bg.mode' || k === 'bg.facing') ensureCamera();
  if (refreshRow && rowRefs[k]) rowRefs[k]();
}
K.setVal = setVal;
function diff(s) { const o = {}; for (const k in s.P) if (JSON.stringify(s.P[k]) !== JSON.stringify(s.DEF[k])) o[k] = s.P[k]; return o; }
function commit() {
  const s = JSON.stringify(cur.P); if (cur.hist[cur.hi] === s) return;
  cur.hist = cur.hist.slice(0, cur.hi + 1); cur.hist.push(s); if (cur.hist.length > 300) cur.hist.shift(); cur.hi = cur.hist.length - 1;
  Object.values(rowRefs).forEach(f => f()); updUndo();
  localSet(cur.docId, diff(cur)); clearTimeout(cur.saveTimer); const sc = cur; cur.saveTimer = setTimeout(() => save(sc, true), 1500);
}
function applySnap(json) { cur.P = Object.assign({}, cur.DEF, JSON.parse(json)); ensureCamera(); if (cur.onLoad) cur.onLoad(); buildControls(); }
function updUndo() { $('bUndo').disabled = cur.hi <= 0; $('bRedo').disabled = cur.hi >= cur.hist.length - 1; }
function status(t) { $('status').textContent = t; }
let toastTimer = 0; function toast(t) { let el = $('toast'); if (!el) { el = document.createElement('div'); el.id = 'toast'; document.body.appendChild(el); } el.textContent = t; el.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('on'), 3200); }
K.status = t => { status(t); toast(t); }; K.toast = toast;
function localGet(k) { try { return JSON.parse(localStorage.getItem('studioKit1119.' + k)); } catch (e) { return null; } }
function localSet(k, v) { try { localStorage.setItem('studioKit1119.' + k, JSON.stringify(v)); } catch (e) {} }
async function save(sc, auto) {
  if (K.viewOnly) return;
  const values = diff(sc), body = JSON.stringify(values);
  if (auto && body === sc.lastSaved) return;
  try {
    const r = await fetch(SB.url + '/rest/v1/studio_designs?on_conflict=id', { method: 'POST', headers: { apikey: SB.key, Authorization: 'Bearer ' + SB.key, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ id: sc.docId, page: sc.docId, data: Object.assign({ schema: 1, values, changed: Object.keys(values).length }, sc.docMeta || {}), updated_by: 'studio-kit-1119', updated_at: new Date().toISOString() }) });
    if (!r.ok) throw Error('HTTP ' + r.status);
    sc.lastSaved = body; sc.dirty = false;
    if (sc === cur) status('Saved to the shared studio ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + ' · ' + Object.keys(values).length + ' setting(s) changed from the Dart.');
  } catch (e) { if (sc === cur) status('Not saved to the shared studio (' + e.message + '). Your changes are kept on this device.'); }
}
async function load(sc) {
  let values = null, src = '';
  try { const r = await fetch(SB.url + '/rest/v1/studio_designs?id=eq.' + sc.docId + '&select=data', { headers: { apikey: SB.key, Authorization: 'Bearer ' + SB.key } }); if (r.ok) { const j = await r.json(); if (j[0]) { values = j[0].data?.values || {}; src = 'shared studio'; sc.lastSaved = JSON.stringify(values); } } } catch (e) {}
  if (!values) { values = localGet(sc.docId); if (values) src = 'this device'; }
  if (values) for (const k in values) if (k in sc.DEF) sc.P[k] = values[k];
  sc.hist = [JSON.stringify(sc.P)]; sc.hi = 0; sc.loaded = true; sc.loadedFrom = src;
  if (sc.onLoad) sc.onLoad();
}

/* ---------- registration & switching ---------- */
K.screen = function (def) {
  const sc = def; const { SPEC, DEF } = makeSpec(d => { def.spec(d); bgSpec(d); });
  sc.SPEC = SPEC; sc.DEF = DEF; sc.P = Object.assign({}, DEF); sc.hist = []; sc.hi = -1; sc.lastSaved = ''; sc.loaded = false;
  sc.ui = { group: def.startGroup || SPEC[0].group, section: def.startSection || SPEC[0].section, last: {} };
  K.screens[def.id] = sc; K.order.push(def.id); return sc;
};
K.show = async function (id, opts) {
  opts = opts || {}; const sc = K.screens[id]; if (!sc) return; const firstShow = !cur;
  if (cur && cur.onHide) cur.onHide();
  cur = sc; K.cur = sc;
  if (!sc.loaded) await load(sc);
  $('crumb').innerHTML = sc.crumb;
  const btns = $('screenBtns'); btns.innerHTML = '';
  (sc.toolbar || []).forEach(t => { const b = document.createElement('button'); b.textContent = t.label; b.title = t.title || ''; b.onclick = t.onclick; btns.appendChild(b); });
  buildScreens(); openSection(sc.ui.group, sc.ui.section); updUndo(); ensureCamera();
  if (sc.onShow) sc.onShow();
  status(sc.loadedFrom ? 'Loaded your saved settings for ' + sc.title + ' from the ' + sc.loadedFrom + '.' : sc.title + ': all values are the Dart originals. Changes save automatically.');
  try { if (opts.fromPop) {} else if (firstShow || opts.replace) history.replaceState(null, '', '#' + id); else if (location.hash !== '#' + id) history.pushState(null, '', '#' + id); } catch (e) {}
};
K.go = (id, how) => { if (K.screens[id]) { K.show(id); return true; } if (how && how.href) { location.href = how.href; return true; } return false; };
K.back = () => { if (history.length > 1) history.back(); };

/* ---------- loop ---------- */
function render(now) {
  const dpr = Math.min(window.devicePixelRatio || 1, 3), k = cssScale * dpr;
  sctx.setTransform(k, 0, 0, k, 0, 0); sctx.filter = 'none';
  drawBackground(sctx, cur.P); cur.draw(sctx, now, true);
  if (!K.isMobile && frame % 2 === 0) {
    const b = targetBounds(), zs = zoom.width / b.s;
    zctx.setTransform(1, 0, 0, 1, 0, 0); zctx.fillStyle = '#000'; zctx.fillRect(0, 0, zoom.width, zoom.height);
    zctx.setTransform(zs, 0, 0, zs, -b.x * zs, -b.y * zs); zctx.filter = 'none';
    drawBackground(zctx, cur.P); cur.draw(zctx, now, true);
  }
  frame++;
}
function loop(now) {
  const dt = clamp((now - last) / 1000, 0, .08); last = now;
  if (!frozen) { cur.update(dt, now); const s = cur.P['bg.smooth']; tilt.x = tilt.x * s + tilt.tx * (1 - s); tilt.y = tilt.y * s + tilt.ty * (1 - s); }
  try { render(now); } catch (e) { console.error(e); }
  requestAnimationFrame(loop);
}
K.renderNow = () => render(performance.now());
K.freeze = on => { frozen = on; };
K.showHighlights = on => { showHL = on; };
K.setHover = t => { hover = t; hoverUntil = t ? Infinity : 0; };
K.save = () => save(cur, false);

/* ---------- start ---------- */
K.start = async function ({ title, first }) {
  document.title = title;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const fl = document.createElement('link'); fl.rel = 'stylesheet'; fl.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;600;700&display=swap'; document.head.appendChild(fl);
  document.body.insertAdjacentHTML('afterbegin', HTML);
  stage = $('stage'); sctx = stage.getContext('2d'); zoom = $('zoom'); zctx = zoom.getContext('2d'); cam = $('cam');
  PHONES.forEach(([v, l]) => { const o = document.createElement('option'); o.value = v; o.textContent = l; $('selPhone').appendChild(o); });
  const ph = localGet('phone'); if (ph) $('selPhone').value = ph;
  $('selPhone').onchange = () => { localSet('phone', $('selPhone').value); layout(); };
  window.addEventListener('resize', layout);
  $('bUndo').onclick = () => { if (cur.hi > 0) { cur.hi--; applySnap(cur.hist[cur.hi]); updUndo(); const sc = cur; clearTimeout(sc.saveTimer); sc.saveTimer = setTimeout(() => save(sc, true), 1500); } };
  $('bRedo').onclick = () => { if (cur.hi < cur.hist.length - 1) { cur.hi++; applySnap(cur.hist[cur.hi]); updUndo(); const sc = cur; clearTimeout(sc.saveTimer); sc.saveTimer = setTimeout(() => save(sc, true), 1500); } };
  const setPick = on => { pickMode = on; $('bPick').classList.toggle('on', on); $('mPick').classList.toggle('on', on); $('stageWrap').classList.toggle('pick', on); if (on) K.status('Pick part: tap any part to open its controls. Press Pick part again to go back to using the page.'); };
  $('bPick').onclick = () => setPick(!pickMode); $('mPick').onclick = () => setPick(!pickMode);
  $('bHl').onclick = () => { showHL = !showHL; $('bHl').classList.toggle('on', showHL); };
  $('bSave').onclick = () => save(cur, false);
  $('mCtl').onclick = () => $('side').classList.toggle('open');
  $('phoneLink').innerHTML = 'On the phone, open:<br><a href="' + location.href.split('#')[0] + '">' + location.href.split('#')[0] + '</a>';
  stage.addEventListener('pointerdown', ev => { const p = toLocal(ev); if (pickMode) { const r = cur.pick(p); if (r) openSection(r[0], r[1]); ev.preventDefault(); return; } try { stage.setPointerCapture(ev.pointerId); } catch (e) {} cur.pointer && cur.pointer.down(p, ev); });
  stage.addEventListener('pointermove', ev => { const p = toLocal(ev); if (!K.isMobile && cur.P['bg.mode'] === 'tilt') { tilt.tx = clamp((p.x / K.W - .5) * 2, -1, 1); tilt.ty = clamp((p.y / K.H - .5) * 2, -1, 1); } cur.pointer && cur.pointer.move(p, ev); });
  stage.addEventListener('pointerup', ev => cur.pointer && cur.pointer.up(toLocal(ev), ev));
  stage.addEventListener('pointercancel', ev => cur.pointer && cur.pointer.cancel && cur.pointer.cancel(toLocal(ev), ev));
  window.addEventListener('deviceorientation', e => { if (e.gamma == null) return; tilt.tx = clamp(e.gamma / 30, -1, 1); tilt.ty = clamp((e.beta - 45) / 30, -1, 1); });
  layout();
  try { await document.fonts.load('500 23px Roboto'); await document.fonts.load('400 14px Roboto'); await document.fonts.load('700 16px Roboto'); } catch (e) {}
  window.addEventListener('popstate', () => { const id = (location.hash || '').slice(1); if (K.screens[id] && (!cur || cur.id !== id)) K.show(id, { fromPop: true }); });
  const want = (location.hash || '').slice(1);
  await K.show(K.screens[want] ? want : first || K.order[0]);
  last = performance.now();
  requestAnimationFrame(loop);
};
window.StudioKit = K;
})();
