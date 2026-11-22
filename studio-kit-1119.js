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
const SB = window.StudioTransferConfig;
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
  def('Background', 'Camera & backdrop', 'bg', 'bg.overlay', 'Add backdrop over camera', 'bool', false, { info: 'Keep Live camera selected, then blend your chosen backdrop over it. The camera keeps running behind it.' });
  def('Background', 'Camera & backdrop', 'bg', 'bg.overlayOpacity', 'Backdrop opacity', 'num', .5, { min: 0, max: 1, step: .01, info: '0 = camera only. Between = both. 1 = fully opaque backdrop. Glass controls are independent.' });
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
#app{display:grid;grid-template-columns:210px auto minmax(0,1fr);grid-template-rows:auto minmax(0,1fr);height:100%}
#areas{grid-column:1/-1;display:flex;gap:6px;align-items:center;padding:8px 12px;border-bottom:1px solid var(--line);background:#0d131a;flex-wrap:wrap}#areas button{padding:8px 20px;font-size:14px;font-weight:500}#areas button.on{background:#14304a;border-color:#4aa8ff;color:#d6ecff}
#pages{grid-row:2;grid-column:1;min-height:0;overflow-y:auto;border-right:1px solid var(--line);padding:8px;display:flex;flex-direction:column;gap:4px}#pages button{text-align:left;white-space:normal;padding:9px 10px;width:100%}#pages button.on{background:#14304a;border-color:#4aa8ff;color:#d6ecff}#pages button small{display:block;color:var(--mut);font-size:11px;margin-top:2px}#pages button.nb{opacity:.5}#pages .grp{margin:10px 2px 2px;font-size:11px;color:var(--mut);letter-spacing:.05em}
#stageWrap{grid-row:2;grid-column:2;position:relative;min-height:0;height:100%;padding:10px;display:flex;align-items:center;justify-content:center;background:#04060a;border-right:1px solid var(--line)}
#stage{display:block;border-radius:24px;background:#000;touch-action:none;box-shadow:0 0 0 1px #1c2734}#stageWrap.pick #stage{cursor:crosshair}
#side{grid-row:2;grid-column:3;display:flex;flex-direction:column;min-width:0;min-height:0;overflow:hidden}
#tabs{flex-shrink:0;display:flex;gap:6px;padding:8px 12px;flex-wrap:wrap;border-bottom:1px solid var(--line)}#tabs button{padding:7px 12px}#tabs button.shared{border-style:dashed;color:var(--mut)}#tabs button.shared.on{color:#bff3e6}
#work{flex:1;min-height:0;display:flex;flex-direction:column;padding:8px 12px 10px;position:relative}
#workHead{flex-shrink:0;display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding-bottom:4px}#workHead button{padding:5px 10px}#workTitle{font-size:14px;font-weight:500;margin-right:auto;min-width:0}#workHead .sep{width:1px;height:22px;background:var(--line);margin:0 2px}#bBack[hidden]{display:none}
#status{flex-shrink:0;color:var(--mut);font-size:12px;min-height:18px;padding:0 2px 6px}
#bar{position:absolute;right:12px;top:44px;z-index:8;width:min(620px,94%);max-height:70vh;overflow:auto;background:var(--panel);border:1px solid #2f4258;border-radius:12px;padding:10px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;box-shadow:0 14px 40px rgba(0,0,0,.55)}#bar[hidden]{display:none}#bar .tt{width:100%;font-size:11px;color:var(--mut);letter-spacing:.05em}#crumb{width:100%;font-size:12px;color:var(--mut)}#crumb small{color:var(--mut)}#screenBtns{display:contents}
#workBody{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) minmax(220px,360px);grid-template-rows:minmax(0,1fr);gap:14px}
#workBody.choosing #controls{display:none}#workBody:not(.choosing) #chips{display:none}
#chips{min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:2px;padding-right:6px}
.tn{display:flex;align-items:center;gap:8px;width:100%;text-align:left;background:none;border:1px solid transparent;border-radius:8px;padding:8px 10px;font-size:13px;white-space:normal}.tn:hover{background:#172230;border-color:#2c3d52}.tn .tw{width:14px;flex:none;color:var(--mut);text-align:center}.tn .all{margin-left:auto;font-size:11px;color:var(--mut);white-space:nowrap}.tn.trunk{font-weight:500;font-size:14px;background:var(--panel2);border-color:var(--line)}.tn.leaf .tw{color:#3f6d63}
.tkids{margin-left:17px;border-left:1px solid var(--line);padding-left:6px;display:flex;flex-direction:column;gap:2px}
#controls{min-height:0;min-width:0;height:100%;overflow-y:scroll;overflow-x:hidden;padding-right:8px;scrollbar-gutter:stable;overscroll-behavior:contain;display:flex;flex-direction:column;gap:12px}#controls,#zoomBox,#chips{scrollbar-width:auto;scrollbar-color:#48a895 #111821}#controls::-webkit-scrollbar,#zoomBox::-webkit-scrollbar,#chips::-webkit-scrollbar{width:12px}#controls::-webkit-scrollbar-thumb,#zoomBox::-webkit-scrollbar-thumb,#chips::-webkit-scrollbar-thumb{background:#48a895;border:3px solid #111821;border-radius:8px}
#extDlg{box-sizing:border-box;position:fixed;inset:0;width:100%;height:100%;max-width:none;max-height:none;margin:0;padding:0;border:0;color:#edf3f1;background:#0d1518}#extDlg[open]{display:flex;flex-direction:column}#extDlg header{display:flex;align-items:center;gap:8px;border-bottom:1px solid #304044;padding:8px 12px}#extDlg header b{flex:1}#extDlg iframe{border:0;width:100%;flex:1;min-height:0}
.box{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:8px 10px}.boxHead{position:sticky;top:0;z-index:1;background:var(--panel);display:flex;align-items:center;gap:8px;padding:2px 2px 8px;border-bottom:1px solid var(--line);margin-bottom:6px}.boxHead b{font-size:14px;font-weight:500;margin-right:auto}
.row{display:grid;grid-template-columns:150px minmax(0,1fr) 28px;gap:8px;align-items:center;padding:5px 6px;border-radius:8px;border:1px solid transparent}.row:hover,.row.act{background:#172230;border-color:#2c3d52}
.lab{display:flex;align-items:center;gap:6px;min-width:0}.lab span{white-space:normal;overflow-wrap:anywhere;line-height:1.3}.info{width:18px;height:18px;padding:0;border-radius:50%;font-size:11px;line-height:16px;flex:none;color:var(--mut)}
.ctl{display:flex;align-items:center;gap:8px;min-width:0}.ctl input[type=range]{flex:1;min-width:60px;max-width:220px;accent-color:var(--acc)}.ctl input[type=number]{width:74px}.ctl input[type=text]{flex:1;min-width:0}
.ctl input[type=color]{width:34px;height:26px;padding:0;border:1px solid var(--line);border-radius:6px;background:none}.unit{color:var(--mut);font-size:11px;min-width:16px}.rst{width:26px;height:26px;padding:0;color:var(--mut)}
.sw{width:44px;height:24px;border-radius:12px;padding:0;position:relative;background:#26313d}.sw::after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#8ea3b8;transition:left .15s}.sw.on{background:#1d6b59;border-color:#2aa486}.sw.on::after{left:23px;background:#e6fff8}
.note{grid-column:1/-1;color:var(--mut);font-size:12px;padding:2px 2px 4px 26px}#zoomBox{display:flex;flex-direction:column;gap:8px;min-height:0;overflow:auto}#zoomWrap{flex-shrink:0}#zoomWrap{background:#000;border:1px solid var(--line);border-radius:12px;overflow:hidden;position:relative}#zoom{display:block;width:100%;aspect-ratio:1/1}
#zoomLab{position:absolute;left:8px;top:6px;font-size:11px;color:#cfe;background:rgba(0,0,0,.55);padding:2px 6px;border-radius:6px}#zoomHelp{color:var(--mut);font-size:12px}#legend{display:flex;align-items:center;gap:6px;color:var(--mut);font-size:12px}#legend i{display:inline-block;width:22px;height:0;border-top:2px dashed var(--hl)}
#toast{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom) + 96px);transform:translateX(-50%) translateY(20px);max-width:86vw;background:rgba(10,14,19,.92);color:#e8eef5;border:1px solid #2a3a4a;border-radius:14px;padding:10px 14px;font:500 13px/1.35 Roboto,system-ui,sans-serif;text-align:center;opacity:0;pointer-events:none;transition:opacity .2s,transform .2s;z-index:20}#toast.on{opacity:1;transform:translateX(-50%) translateY(0)}html.viewonly #mobBtns,html.viewonly #side{display:none!important}#mobBtns{display:none}#phoneLink{font-size:12px;color:var(--mut)}#phoneLink a{color:#9fe}
#cameraTools{margin:0 10px 6px;border:1px solid var(--line);border-radius:8px;padding:6px 10px}#cameraTools[hidden]{display:none}#cameraTools summary{cursor:pointer;color:#b9e5dc}#cameraSourceRow{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding-top:8px}#selCamera{max-width:260px}#cameraInfo{font-size:12px;color:var(--mut);padding-top:6px}#cameraPreview[hidden]{display:none}#cameraPreview{padding-top:8px}#cam{display:block;max-width:100%;width:260px;height:146px;object-fit:contain;background:#000}#cameraPreview p{margin:4px 0;color:var(--mut);font-size:12px}
@media (max-width:820px){#app{display:block}#areas,#pages{display:none}#workBody{display:block}#workBody.choosing #chips{display:flex}#bar{top:40px}#stageWrap{position:fixed;inset:0;padding:0;border:0}#stage{border-radius:0;box-shadow:none}#side{position:fixed;left:0;right:0;bottom:0;height:52vh;background:rgba(10,14,19,.97);border-top:1px solid var(--line);border-radius:16px 16px 0 0;transform:translateY(105%);transition:transform .25s;z-index:5}#side.open{transform:none}#work{display:block;flex:1 0 180px;min-height:180px;padding:8px;overflow:auto}#zoomBox{display:none}#controls{height:auto;overflow:visible;padding-right:0}.row{grid-template-columns:118px minmax(0,1fr) 28px}#bar .desk{display:none}#mobBtns{display:flex;gap:8px;position:fixed;right:10px;top:calc(env(safe-area-inset-top) + 10px);z-index:6}#mobBtns button{background:rgba(10,14,19,.75);backdrop-filter:blur(6px)}}`;
const HTML = `<div id="app"><div id="areas"></div><div id="pages"><div id="screens"></div></div><div id="stageWrap"><canvas id="stage"></canvas></div><div id="side"><div id="tabs"></div><div id="work"><div id="workHead"><button id="bBack" title="Back to the list">← Back</button><b id="workTitle"></b><button id="bUndo">Undo</button><button id="bRedo">Redo</button><button id="bHl" title="See the page clean, without the gold edges">Preview</button><button id="bSave" title="Save to the shared studio, then pick the next thing">Save</button><span class="sep"></span><button id="bPick" title="Click a part on the phone to open its controls">Pick part</button><span id="pinBtns"></span><button id="bTools" title="Page tools, phone size, camera, store editor, transitions">Tools ▾</button></div><div id="status">Loading…</div><div id="bar" hidden><div class="tt">PAGE TOOLS</div><div id="crumb"></div><span id="screenBtns"></span><select id="selPhone" class="desk" title="Phone screen size"></select><details id="cameraTools" hidden><summary>Camera source &amp; original feed</summary><div id="cameraSourceRow"><label for="selCamera">Camera</label><select id="selCamera"><option value="">Automatic camera</option></select><button id="bCameraReconnect">Reconnect</button><button id="bCameraPreview">Show original feed</button></div><div id="cameraInfo" role="status"></div><div id="cameraPreview" hidden><video id="cam" playsinline muted autoplay></video><p>This is the camera before any Studio effects. If the white symbol appears here, check the selected camera or its privacy shutter.</p></div></details></div><div id="workBody" class="choosing"><div id="chips"></div><div id="controls" tabindex="0" role="region" aria-label="Scrollable settings"></div><div id="zoomBox"><div id="zoomWrap"><canvas id="zoom"></canvas><div id="zoomLab"></div></div><div id="legend"><i></i> dashed gold edge = what the control you're on changes</div><div id="zoomHelp">Close-up of the part you're editing, live.</div><div id="phoneLink"></div></div></div></div></div></div><div id="mobBtns"><button id="mPick">Pick part</button><button id="mCtl">Controls</button></div><dialog id="extDlg"><header><b id="extTitle"></b><button id="extClose">Close</button></header><iframe id="extFrame" title="Editor"></iframe></dialog>`;

const K = { TAU, D2R, clamp, ease, smooth, wrap, rgb, rgba, mix, hsv, WHITE, scaleOf, blur, arc, shadowBlurFor, makeSpec, bgSpec, W: 390, H: 844, isMobile: false, screens: {}, order: [] };
let cur = null; // current screen
let pickMode = false, showHL = true, hover = null, hoverUntil = 0, cssScale = 1, frame = 0, last = performance.now(), frozen = false;
let stage, sctx, zoom, zctx, cam;

/* ---------- background ---------- */
let camState = 'off', camFacing = null, camDevice = '', camStream = null, camRequest = 0;
const bgImg = new Image(); let bgLoaded = '';
const tilt = { tx: 0, ty: 0, x: 0, y: 0 }; K.tilt = tilt;
function cameraInfo(message) { if ($('cameraInfo')) $('cameraInfo').textContent = message; }
function cameraEnabled() {
  if (new URLSearchParams(location.search).has('transition-frame')) return false;
  const saved = localGet('cameraEnabled');
  if (typeof saved === 'boolean') return saved;
  // Desktop camera drivers can send a phone/lock slate as valid video. Keep
  // that feed out of the editor until enabled, without changing phone designs.
  return !!navigator.userAgentData?.mobile || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
async function refreshCameraDevices() {
  const select = $('selCamera'); if (!select) return;
  const selected = localGet('cameraDevice') || '';
  const devices = await navigator.mediaDevices?.enumerateDevices?.().catch(() => []) || [];
  select.innerHTML = ''; const auto = document.createElement('option'); auto.value = ''; auto.textContent = 'Automatic camera'; select.appendChild(auto);
  devices.filter(d => d.kind === 'videoinput').forEach((d, i) => {
    const option = document.createElement('option'); option.value = d.deviceId;
    option.textContent = d.label || 'Camera ' + (i + 1); select.appendChild(option);
  });
  if (selected && !devices.some(d => d.kind === 'videoinput' && d.deviceId === selected)) {
    const option = document.createElement('option'); option.value = selected; option.textContent = 'Saved camera (currently unavailable)'; select.appendChild(option);
  }
  select.value = selected;
}
let previewCamera = null;
let deferBackgroundCamera = new URLSearchParams(location.search).get('transitionEditor') === '1';
const cameraConsumers = new Map();
async function ensureCamera(force = false) {
  if (deferBackgroundCamera && !previewCamera && !force) { stopCamera(); return; }
  const P = cur.P, facing = previewCamera?.facing || P['bg.facing'];
  const needed = !!previewCamera || P['bg.mode'] === 'camera' || (P['env.on'] && P['env.source'] === 'camera');
  $('cameraTools').hidden = !needed;
  const enabled = !!previewCamera || cameraEnabled(), toggle = $('bCameraToggle');
  if (toggle) {
    toggle.hidden = !needed; toggle.textContent = enabled ? 'Camera on' : 'Camera off';
    toggle.classList.toggle('on', enabled); toggle.setAttribute('aria-pressed', String(enabled));
    toggle.title = enabled ? 'Turn off the camera on this device' : 'Turn on the camera on this device';
  }
  if (!needed || !enabled) {
    stopCamera();
    if (needed) cameraInfo('Camera is off on this device. Click Camera off to turn it on.');
    return;
  }
  const device = previewCamera ? previewCamera.device : localGet('cameraDevice') || '';
  if (!force && camState === 'on' && camFacing === facing && camDevice === device) return;
  if (!force && camState === 'starting') return;
  stopCamera(); const request = ++camRequest; camState = 'starting'; cameraInfo('Opening camera…');
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw Error('no camera api');
    const video = { width: { ideal: 1280 }, height: { ideal: 1280 } };
    if (device) video.deviceId = { exact: device }; else video.facingMode = { ideal: facing };
    const stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
    if (request !== camRequest) { stream.getTracks().forEach(t => t.stop()); return; }
    camStream = stream; cam.srcObject = stream; await cam.play().catch(() => {});
    if (request !== camRequest) { stream.getTracks().forEach(t => t.stop()); return; }
    camState = 'on'; camFacing = facing; camDevice = device;
    const track = stream.getVideoTracks()[0];
    cameraInfo('Receiving video from ' + (track?.label || 'the selected camera') + '.');
    if (track) track.onended = () => { if (camStream === stream) { camState = 'off'; cameraInfo('Camera stopped. Choose a source or press Reconnect.'); } };
    await refreshCameraDevices();
  } catch (e) {
    if (request !== camRequest) return;
    camState = 'failed';
    cameraInfo('Camera unavailable (' + (e.name || e.message) + '). Select another source or reconnect.');
    await refreshCameraDevices();
    status('Camera unavailable here. The preview uses black until camera video is available.');
  }
}
function stopCamera() {
  camRequest++; if (camStream) camStream.getTracks().forEach(t => t.stop());
  camStream = null; if (cam) cam.srcObject = null; camState = 'off'; camFacing = null; camDevice = '';
}
function cover(ctx, src, sw, sh, zm, ox, oy, mirror) { const W = K.W, H = K.H, s = Math.max(W / sw, H / sh) * zm, dw = sw * s, dh = sh * s; ctx.save(); if (mirror) { ctx.translate(W, 0); ctx.scale(-1, 1); } ctx.drawImage(src, (W - dw) / 2 + ox, (H - dh) / 2 + oy, dw, dh); ctx.restore(); }
function drawBackground(ctx, P, previewFullCamera = false) {
  const W = K.W, H = K.H;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
  if (P['bg.blur'] > 0) blur(ctx, P['bg.blur']);
  if (P['bg.mode'] === 'camera' && camState === 'on' && cam.videoWidth && (previewFullCamera || cameraEnabled())) cover(ctx, cam, cam.videoWidth, cam.videoHeight, 1, 0, 0, P['bg.facing'] === 'user');
  if (P['bg.mode'] === 'tilt' || (P['bg.mode'] === 'camera' && P['bg.overlay'])) { const f = 'bg/' + P['bg.image'] + '.jpg'; if (bgLoaded !== f) { bgLoaded = f; bgImg.src = f; } if (bgImg.complete && bgImg.naturalWidth) { ctx.save(); ctx.globalAlpha *= P['bg.mode'] === 'camera' ? clamp(P['bg.overlayOpacity'] ?? .5, 0, 1) : 1; cover(ctx, bgImg, bgImg.naturalWidth, bgImg.naturalHeight, P['bg.zoom'], tilt.x * P['bg.tilt'], tilt.y * P['bg.tilt'], false); ctx.restore(); } }
  ctx.restore();
  if (P['bg.dim'] > 0) { ctx.fillStyle = rgba(P['bg.dimColor'], P['bg.dim']); ctx.fillRect(0, 0, W, H); }
}

K.drawBackground = (ctx, P) => drawBackground(ctx, P);
K.drawEnvironment = (ctx, P, source) => drawBackground(ctx, {
  ...P, 'bg.dim': 0, 'bg.blur': 0,
  'bg.mode': source === 'camera' ? 'camera' : source === 'backdrop' ? 'tilt' : P['bg.mode'],
  'bg.overlay': source === 'camera' ? false : P['bg.overlay']
});
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
  else { const [pw, ph] = ($('selPhone').value || '390x844').split('x').map(Number); K.W = pw; K.H = ph; const availH = window.innerHeight - ($('areas') ? $('areas').offsetHeight : 0) - 20, availW = Math.max(240, window.innerWidth * .34); cssScale = Math.min(availH / K.H, availW / K.W); stage.style.width = K.W * cssScale + 'px'; stage.style.height = K.H * cssScale + 'px'; }
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
/* Area 1: main areas. Area 2: that area's pages. Area 3: the page's parts. Area 4: a tree of the part. Area 5: every control for what is picked. */
const AREAS = ['Home', 'Shopping', 'Asgard', 'Valkyries', 'Business', 'Account'];
const SHARED_PART = 'Rocks & background';
const isShared = g => g === 'Background' || g === 'Rock row' || / rock$/.test(g);
const store = type => () => { if (window.SleipnirStoreWorkspace) window.SleipnirStoreWorkspace.open(type); else K.status('The store editor is not loaded on this page.'); };
const ext = (title, url) => () => { $('extTitle').textContent = title; const u = new URL(url, location.href); u.searchParams.set('embed', '1'); $('extFrame').src = u.href; if (!$('extDlg').open) $('extDlg').showModal(); K.previewCovered = true; };
const click = (id, why) => () => { const b = $(id); if (b) b.click(); else K.status(why); };
const PAGES = {
  Home: [['screen', 'home'], ['Rock navigation', 'The rocks on every page', () => { if (cur.id !== 'home') K.show('home').then(() => pickPart(SHARED_PART)); else pickPart(SHARED_PART); }], ['Launch screen', 'Opening animation', ext('Launch screen', 'sleipnir-launch-preview.html')], ['Page transitions', 'Moving between pages', click('transition-open-desktop', 'Page transitions are not loaded on this page.')]],
  Shopping: [['Fast food', 'Town → store → menu board', store('fast_food')], ['Fast casual', 'Town → store → menu', store('fast_casual')], ['Sit-down', 'Town → store → menu', store('sit_down')], ['Grocery', 'Town → store → entrance & aisles', store('grocery')], ['Retail', 'Town → store', store('retail')], ['Convenience', 'Town → store', store('convenience')], ['Valhalla street', 'Local storefronts', store('valhalla')], ['Cart & checkout', '', null], ['Track order', 'Chat’s editor', ext('Track order', 'pages.html?page=track')]],
  Asgard: [['screen', 'sky'], ['screen', 'dial'], ['screen', 'conversation'], ['screen', 'directory'], ['Mead Hall', 'Chat’s editor', ext('Mead Hall', 'pages.html?page=group')], ['Deals', 'Chat’s editor', ext('Deals', 'pages.html?page=deals')], ['Swap', 'Chat’s editor', ext('Swap', 'pages.html?page=swap')], ['Share scene', 'Chat’s editor', ext('Share scene', 'pages.html?page=share')], ['Shop the post', 'Chat’s editor', ext('Shop the post', 'pages.html?page=shoppost')], ['Be Alive (live)', '', null], ['screen', 'horn'], ['screen', 'way'], ['Local ads', 'Chat’s editor', ext('Local ads', 'pages.html?page=ads')]],
  Valkyries: [['Driver home / go online', '', null], ['Order offers', '', null], ['Pickup & drop-off', '', null], ['Load board', '', null], ['Find a driver', '', null], ['Earnings & cash-out', '', null], ['Driver profile', '', null]],
  Business: [['Owner sign-up', '', null], ['Valhalla store builder', '', null], ['Menu & catalog', '', null], ['Ads portal', '', null], ['Sleipnir Drive', '', null], ['Orders & payouts', '', null], ['Shelf placement slots', '', null]],
  Account: [['Sign-up & 18+ gate', '', null], ['3D figure & 360 builder', '', null], ['Profile', '', null], ['Settings', '', null], ['Subscriptions', '', null]],
};
function areaOf(id) { const sc = K.screens[id]; if (sc && sc.area) return sc.area; for (const a of AREAS) if (PAGES[a].some(p => p[0] === 'screen' && p[1] === id)) return a; return 'Asgard'; }
let area = null; const lastPage = {};
function buildScreens() {
  if (!area) area = areaOf(cur.id);
  if (areaOf(cur.id) === area) lastPage[area] = cur.id;
  const ar = $('areas'); ar.innerHTML = '';
  AREAS.forEach(a => { const b = document.createElement('button'); b.textContent = a; b.className = a === area ? 'on' : ''; b.onclick = () => { area = a; const id = lastPage[a] || (PAGES[a].find(p => p[0] === 'screen' && K.screens[p[1]]) || [])[1]; if (id && id !== cur.id) K.show(id); else buildScreens(); }; ar.appendChild(b); });
  const el = $('screens'); el.innerHTML = '';
  const listed = new Set();
  PAGES[area].forEach(p => {
    const b = document.createElement('button');
    if (p[0] === 'screen') { const s = K.screens[p[1]]; if (!s) return; listed.add(p[1]); b.innerHTML = s.title; b.className = s === cur ? 'on' : ''; b.onclick = () => K.show(p[1]); }
    else { b.innerHTML = p[0] + (p[1] || !p[2] ? '<small>' + (p[2] ? p[1] : 'Not built yet') + '</small>' : ''); if (p[2]) b.onclick = p[2]; else { b.className = 'nb'; b.onclick = () => K.status(p[0] + ' is not built yet.'); } }
    el.appendChild(b);
  });
  // Any studio page not placed above still shows in its own area, so nothing is left out.
  K.order.forEach(id => { if (listed.has(id) || areaOf(id) !== area || PAGES[area].some(p => p[0] === 'screen' && p[1] === id)) return; const s = K.screens[id], b = document.createElement('button'); b.textContent = s.title; b.className = s === cur ? 'on' : ''; b.onclick = () => K.show(id); el.appendChild(b); });
}
function parts() { const gs = groups(), own = gs.filter(g => !isShared(g)); if (gs.some(isShared)) own.push(SHARED_PART); return own; }
function partOf(g) { return isShared(g) ? SHARED_PART : g; }
function sectionsOf(g) { return [...new Set(cur.SPEC.filter(s => s.group === g).map(s => s.section))]; }
function buildTabs() {
  const el = $('tabs'); el.innerHTML = '';
  parts().forEach(g => { const b = document.createElement('button'); b.textContent = g; b.className = (g === SHARED_PART ? 'shared ' : '') + (g === cur.ui.part ? 'on' : ''); b.onclick = () => pickPart(g); el.appendChild(b); });
}
function pickPart(g) {
  cur.ui.part = g; cur.ui.choosing = true;
  const gs = g === SHARED_PART ? groups().filter(isShared) : [g];
  if (gs.length === 1 && sectionsOf(gs[0]).length === 1) { openNode(gs[0] + ' › ' + sectionsOf(gs[0])[0], [[gs[0], sectionsOf(gs[0])[0]]]); return; }
  if (gs[0]) { cur.ui.group = gs[0]; cur.ui.section = cur.ui.last[gs[0]] || sectionsOf(gs[0])[0]; }
  buildTabs(); buildChips(); buildControls(); hover = null;
}
function treeNode(host, label, pairs, kids, cls) {
  const b = document.createElement('button'); b.className = 'tn ' + cls;
  b.innerHTML = `<span class="tw">${kids ? '▾' : '•'}</span><span></span>` + (pairs.length > 1 ? `<span class="all">all ${pairs.length}</span>` : '');
  b.children[1].textContent = label;
  const first = cur.SPEC.find(s => s.group === pairs[0][0] && s.section === pairs[0][1]), tgt = first && first.target;
  b.onclick = () => openNode(label, pairs);
  b.onpointerenter = () => { hover = tgt; hoverUntil = Infinity; }; b.onpointerleave = () => { hoverUntil = performance.now(); };
  host.appendChild(b);
  if (kids) { const k = document.createElement('div'); k.className = 'tkids'; host.appendChild(k); kids(k); }
}
function buildChips() {
  const el = $('chips'); el.innerHTML = '';
  const part = cur.ui.part || partOf(cur.ui.group);
  const visible = g => sectionsOf(g).filter(sec => { const f = cur.SPEC.find(s => s.group === g && s.section === sec); return !(f.hideIf && f.hideIf(cur.P)); });
  if (part === SHARED_PART) {
    const gs = groups().filter(isShared);
    treeNode(el, SHARED_PART, gs.flatMap(g => visible(g).map(sec => [g, sec])), host => gs.forEach(g => {
      const secs = visible(g); if (!secs.length) return;
      treeNode(host, g, secs.map(sec => [g, sec]), secs.length > 1 ? h2 => secs.forEach(sec => treeNode(h2, sec, [[g, sec]], null, 'leaf')) : null, secs.length > 1 ? 'branch' : 'leaf');
    }), 'trunk');
  } else {
    const secs = visible(part), branches = cur.tree && cur.tree[part];
    treeNode(el, part, secs.map(sec => [part, sec]), host => {
      if (branches) {
        const used = new Set();
        branches.forEach(([label, list]) => { const ss = list.filter(s => secs.includes(s)); if (!ss.length) return; ss.forEach(s => used.add(s)); treeNode(host, label, ss.map(s => [part, s]), h2 => ss.forEach(s => treeNode(h2, s, [[part, s]], null, 'leaf')), 'branch'); });
        secs.filter(s => !used.has(s)).forEach(s => treeNode(host, s, [[part, s]], null, 'leaf'));
      } else secs.forEach(s => treeNode(host, s, [[part, s]], null, 'leaf'));
    }, 'trunk');
  }
  $('workBody').classList.toggle('choosing', !!cur.ui.choosing);
  $('bBack').hidden = !!cur.ui.choosing;
  $('workTitle').textContent = cur.ui.choosing ? part + ' — pick what to change' : (cur.ui.node ? cur.ui.node.label : cur.ui.group + ' › ' + cur.ui.section);
}
function openNode(label, pairs) {
  if (!pairs.length) return;
  if (pairs.length === 1 && label === pairs[0][1]) label = pairs[0][0] + ' › ' + label;
  cur.ui.node = { label, pairs }; cur.ui.choosing = false;
  cur.ui.group = pairs[0][0]; cur.ui.section = pairs[0][1]; cur.ui.last[cur.ui.group] = cur.ui.section; cur.ui.part = partOf(cur.ui.group);
  buildTabs(); buildChips(); buildControls();
  if (pickMode && K.isMobile) $('side').classList.add('open');
  hover = null;
}
function openSection(g, sec) {
  const secs = sectionsOf(g); if (!secs.length) return;
  const s = secs.includes(sec) ? sec : secs[0];
  // A refresh of what is already showing (other modules re-open the current section after loading) keeps the view as it is.
  const n = cur.ui.node, same = g === cur.ui.group && s === cur.ui.section;
  if (same && (cur.ui.choosing || (n && n.pairs[0][0] === g && n.pairs[0][1] === s))) { buildTabs(); buildChips(); if (!cur.ui.choosing) buildControls(); return; }
  openNode(g + ' › ' + s, [[g, s]]);
}
K.openSection = openSection;
function buildControls() {
  for (const k in rowRefs) delete rowRefs[k];
  const el = $('controls'); el.innerHTML = '';
  const pairs = (cur.ui.node && cur.ui.node.pairs) || [[cur.ui.group, cur.ui.section]];
  pairs.forEach(([g, sec]) => {
    const specs = cur.SPEC.filter(s => s.group === g && s.section === sec); if (!specs.length) return;
    const box = document.createElement('div'); box.className = 'box';
    const head = document.createElement('div'); head.className = 'boxHead'; const hb = document.createElement('b'); hb.textContent = g + ' › ' + sec; head.appendChild(hb);
    const rs = document.createElement('button'); rs.textContent = 'Reset section'; rs.title = 'Back to the Dart originals for this section';
    rs.onclick = () => { specs.forEach(s => setVal(s.k, s.def, false)); commit(); buildControls(); };
    head.appendChild(rs); box.appendChild(head);
    const tgt = specs[0].target; box.onpointerenter = () => { hover = tgt; hoverUntil = Infinity; }; box.onpointerleave = () => { hoverUntil = performance.now(); };
    for (const s of specs) box.appendChild(makeRow(s));
    el.appendChild(box);
  });
  $('zoomLab').textContent = cur.title + ' › ' + (cur.ui.node ? cur.ui.node.label : cur.ui.group + ' › ' + cur.ui.section);
  if (!cur.ui.choosing) $('workTitle').textContent = cur.ui.node ? cur.ui.node.label : cur.ui.group + ' › ' + cur.ui.section;
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
  } else if (s.type === 'action') {
    const b = document.createElement('button'); b.textContent = s.label;
    b.onclick = () => s.onclick?.(); ctl.append(b); refresh = () => {}; rst.hidden = true;
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
  if (k === 'bg.mode' || k === 'bg.facing' || k === 'env.source' || k === 'env.on') ensureCamera();
  if (refreshRow && rowRefs[k]) rowRefs[k]();
}
K.setVal = setVal;
function diff(s) { const o = {}; for (const k in s.P) if (JSON.stringify(s.P[k]) !== JSON.stringify(s.DEF[k])) o[k] = s.P[k]; return o; }
function commit() {
  if (K.componentInstance) return;
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
K.commit = () => commit();
K.SB = SB;
K.rebuild = () => { if (cur) { buildTabs(); buildChips(); buildControls(); } };
K.pickPart = g => { if (cur) pickPart(g); };
K.openSectionOf = (sc, g, sec) => { if (cur === sc) openSection(g, sec); };
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
  const route = cur && cur !== sc ? {from: cur.id, to: sc.id} : null;
  if (route) window.dispatchEvent(new CustomEvent('studio:page-leaving', {detail: route}));
  if (cur && cur.onHide) cur.onHide();
  cur = sc; K.cur = sc;
  if (!sc.loaded) await load(sc);
  if (cur !== sc) return;
  $('crumb').innerHTML = sc.crumb;
  const btns = $('screenBtns'), pins = $('pinBtns'); btns.innerHTML = ''; pins.innerHTML = '';
  (sc.toolbar || []).forEach(t => { const b = document.createElement('button'); b.textContent = t.label; b.title = t.title || ''; b.onclick = t.onclick; (t.label === 'People' ? pins : btns).appendChild(b); });
  area = areaOf(sc.id); buildScreens();
  if (opts.group) openSection(opts.group, opts.section); else if (sc.ui.node && !sc.ui.choosing) openNode(sc.ui.node.label, sc.ui.node.pairs); else pickPart(sc.ui.part || partOf(sc.ui.group));
  updUndo(); ensureCamera();
  if (sc.onShow) sc.onShow();
  if (route) window.dispatchEvent(new CustomEvent('studio:page-shown', {detail: route}));
  status(sc.loadedFrom ? 'Loaded your saved settings for ' + sc.title + ' from the ' + sc.loadedFrom + '.' : sc.title + ': all values are the Dart originals. Changes save automatically.');
  try { if (opts.fromPop) {} else if (firstShow || opts.replace) history.replaceState(null, '', '#' + id); else if (location.hash !== '#' + id) history.pushState(null, '', '#' + id); } catch (e) {}
};
K.go = (id, how) => { if (K.screens[id]) { K.show(id); return true; } if (how && how.href) { location.href = how.href; return true; } return false; };
K.back = () => { if (history.length > 1) history.back(); };

/* ---------- scene planes shared by the preview and normal navigation ---------- */
const routes = {home:'HomePage', sky:'Asgard', horn:'Asgard/horn', way:'Asgard/way', dial:'Asgard/dial', directory:'Asgard/directory', conversation:'Asgard/conversation'};
const boundaries = new WeakMap();
const seeThrough = id => id === 'dial' || id === 'directory';
K.transitionRoute = id => routes[id] || id;
K.transitionBoundary = ctx => boundaries.get(ctx)?.();
function surface(width, height) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; return canvas;
}
function atPixels(ctx, action) {
  ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.filter = 'none'; ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over'; action(); ctx.restore();
}
function paintScene(ctx, sc, now, studio) {
  drawBackground(ctx, sc.P);
  if (seeThrough(sc.id)) K.transitionBoundary(ctx);
  // The conversation combines Earth imagery and controls in one native paint.
  // Its transparent areas can reveal the sky; a complete frame moves as one.
  if (sc.id === 'conversation') K.drawPageSky?.(ctx,sc.id);
  if (sc.id === 'sky' && K.paintAsgardScene && (boundaries.has(ctx) || K.hasPageSky?.(sc.id))) K.paintAsgardScene(ctx,sc,() => sc.draw(ctx,now,studio));
  else sc.draw(ctx, now, studio);
}
function drawScene(ctx, now) {
  const glass = window.SleipnirTransitionNavigation?.currentGlass();
  const sky = cur.id !== 'sky' && K.hasPageSky?.(cur.id);
  const pane = glass?.material && glass.material !== 'none' && window.PageGlass;
  if (sky || pane) boundaries.set(ctx, () => {
    if (sky) K.drawPageSky(ctx,cur.id);
    if (pane) window.PageGlass.draw(ctx, glass, null, K.W, K.H, window.SleipnirTransitionNavigation?.currentGlassClock?.());
  });
  try { paintScene(ctx, cur, now, true); } finally { boundaries.delete(ctx); }
}
K.captureTransitionScreen = function (id) {
  const sc = K.screens[id];
  if (!stage || !sc?.loaded) return null;
  const layer = surface(stage.width, stage.height), ctx = layer.getContext('2d');
  const base = surface(layer.width, layer.height), full = surface(layer.width, layer.height);
  let separated = false, underSky = null;
  const sky = id !== 'sky' && K.hasPageSky?.(id);
  boundaries.set(ctx, () => {
    if (separated) return;
    separated = true;
    if (sky) {
      underSky = surface(layer.width,layer.height); underSky.getContext('2d').drawImage(layer,0,0);
      K.drawPageSky(ctx,id);
    }
    base.getContext('2d').drawImage(layer, 0, 0);
    atPixels(ctx, () => ctx.clearRect(0, 0, layer.width, layer.height));
  });
  ctx.setTransform(layer.width / K.W, 0, 0, layer.height / K.H, 0, 0);
  try { paintScene(ctx, sc, performance.now(), false); } finally { boundaries.delete(ctx); }
  const out = full.getContext('2d');
  out.drawImage(base, 0, 0); out.drawImage(layer, 0, 0);
  return {full,base,layer,underSky,separated,seeThrough:seeThrough(id)};
};
K.captureTransitionBackground = function (id, canvas, planes) {
  const sc = K.screens[id], transparent = seeThrough(id);
  if (!sc?.loaded || !canvas || (!transparent && !planes?.underSky)) return null;
  const ctx = canvas.getContext('2d'); ctx.save();
  ctx.setTransform(canvas.width / K.W, 0, 0, canvas.height / K.H, 0, 0);
  if (transparent) drawBackground(ctx, sc.P);
  else { ctx.clearRect(0,0,K.W,K.H); ctx.drawImage(planes.underSky,0,0,K.W,K.H); }
  K.drawPageSky?.(ctx,id);
  ctx.restore(); return canvas;
};
K.transitionCamera = {
  async devices() { await refreshCameraDevices(); return Array.from($('selCamera').options, o => ({value:o.value,label:o.textContent})); },
  paneAllowed() { return localGet('paneCameraAllowed') === true || localGet('cameraEnabled') === true; },
  async start(facing, device, consumer = 'editor') {
    if (consumer === 'page' && deferBackgroundCamera) return this.status();
    if (consumer === 'editor') localSet('paneCameraAllowed', true);
    if (!this.paneAllowed() || !cur) return this.status();
    cameraConsumers.set(consumer, {facing:facing || cur.P['bg.facing'], device:device ?? localGet('cameraDevice') ?? ''});
    previewCamera = cameraConsumers.get('editor') || cameraConsumers.get('page');
    await ensureCamera(); return this.status();
  },
  stop(consumer = 'editor') {
    if (!cameraConsumers.delete(consumer)) return;
    previewCamera = cameraConsumers.get('editor') || cameraConsumers.get('page') || null;
    if (cur) ensureCamera();
  },
  revoke() { localSet('paneCameraAllowed', false); localSet('cameraEnabled', false); cameraConsumers.clear(); previewCamera = null; stopCamera(); if (cur) ensureCamera(); },
  source() { return camState === 'on' && cam.videoWidth ? cam : null; },
  mirrored() { return camFacing === 'user'; },
  wholeAllowed:cameraEnabled,
  status() {return {live:camState === 'on' && !!cam.videoWidth, message:$('cameraInfo')?.textContent || 'Camera is off.'};},
  draw(canvas, backdrop) {
    if (camState !== 'on' || !cam.videoWidth) return false;
    const ctx = canvas.getContext('2d'); ctx.save();
    ctx.setTransform(canvas.width / K.W, 0, 0, canvas.height / K.H, 0, 0);
    if (backdrop) drawBackground(ctx, {...backdrop, 'bg.facing':camFacing}, true);
    else cover(ctx, cam, cam.videoWidth, cam.videoHeight, 1, 0, 0, camFacing === 'user');
    ctx.restore(); return true;
  }
};

window.addEventListener('studio:transition-editor-closed', () => {
  if (!deferBackgroundCamera) return;
  deferBackgroundCamera = false;
  if (cur && !K.previewCovered) ensureCamera();
});

/* ---------- loop ---------- */
function render(now) {
  const dpr = Math.min(window.devicePixelRatio || 1, 3), k = cssScale * dpr;
  sctx.setTransform(k, 0, 0, k, 0, 0); sctx.filter = 'none';
  drawScene(sctx, now);
  if (!K.isMobile && frame % 2 === 0) {
    const b = targetBounds(), zs = zoom.width / b.s;
    zctx.setTransform(1, 0, 0, 1, 0, 0); zctx.fillStyle = '#000'; zctx.fillRect(0, 0, zoom.width, zoom.height);
    zctx.setTransform(zs, 0, 0, zs, -b.x * zs, -b.y * zs); zctx.filter = 'none';
    drawScene(zctx, now);
  }
  frame++;
}
function loop(now) {
  const dt = clamp((now - last) / 1000, 0, .08); last = now;
  if (K.previewCovered) { requestAnimationFrame(loop); return; }
  if (!frozen) { cur.update(dt, now); const s = cur.P['bg.smooth']; tilt.x = tilt.x * s + tilt.tx * (1 - s); tilt.y = tilt.y * s + tilt.ty * (1 - s); }
  try { render(now); } catch (e) { console.error(e); }
  requestAnimationFrame(loop);
}
K.renderNow = () => render(performance.now());
K.freeze = on => { frozen = on; };
K.showHighlights = on => { showHL = on; };
K.setHover = t => { hover = t; hoverUntil = t ? Infinity : 0; };
K.currentTarget = () => activeTarget() || sectionTarget() || '';
K.save = () => save(cur, false);
K.frameId = () => frame;
// Read an existing design without changing it or the current screen's values.
K.readSavedDesign = async id => {
  const response = await fetch(SB.url + '/rest/v1/studio_designs?id=eq.' + encodeURIComponent(id) + '&select=data', { headers: { apikey: SB.key, Authorization: 'Bearer ' + SB.key }, cache: 'no-store' });
  if (!response.ok) throw Error('Saved design could not load (HTTP ' + response.status + ')');
  const rows = await response.json();
  if (!rows[0]?.data) throw Error('Saved design was not found');
  return rows[0].data;
};

// Paint a referenced screen without starting the editor, its inputs or autosave.
K.openComponentScene = async function(id, output, permitted) {
  const sc = K.screens[id];
  if (!sc || !location.pathname.endsWith('/studio-component-surface.html')) throw Error('Unknown component source.');
  K.componentInstance = true; K.viewOnly = true; K.isMobile = true;
  cur = K.cur = sc; stage = output; sctx = output.getContext('2d');
  K.W = 390; K.H = 844; stage.width = 390; stage.height = 844;
  let baseline = {...sc.DEF}, source = 'Authored defaults';
  try {
    const doc = await K.readSavedDesign(sc.docId);
    for (const [key,value] of Object.entries(doc.values || {})) if (permitted(key,value)) baseline[key] = value;
    source = 'Published Studio settings';
  } catch { /* Public authored defaults are available offline. */ }
  Object.assign(sc.P, baseline);sc.loaded = true;
  if (sc.onLoad) sc.onLoad(); if (sc.onShow) sc.onShow();
  baseline = {...sc.P};
  function apply(values) {
    const previous = {...sc.P};
    Object.assign(sc.P, baseline);
    for (const [key,value] of Object.entries(values)) if (permitted(key,value)) sc.P[key] = value;
    if (sc.onSet) for (const key of Object.keys(sc.P)) if (sc.P[key] !== previous[key]) sc.onSet(key,sc.P[key]);
  }
  function draw(now, dt, plane) {
    sc.update(dt,now);
    const ctx = sctx;
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,K.W,K.H);
    let boundary = false;
    if (plane === 'foreground') boundaries.set(ctx, () => {
      if (boundary) return;
      boundary = true; atPixels(ctx, () => ctx.clearRect(0,0,K.W,K.H));
    });
    try { paintScene(ctx,sc,now,false); } finally { boundaries.delete(ctx); }
    if (plane === 'foreground' && !boundary) ctx.clearRect(0,0,K.W,K.H);
  }
  return {baseline,source,apply,draw,dispose(){ if (sc.onHide) sc.onHide(); }};
};

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
  $('bHl').classList.remove('on'); $('bHl').onclick = () => { showHL = !showHL; $('bHl').classList.toggle('on', !showHL); };
  $('bSave').onclick = async () => { await save(cur, false); if (!cur.ui.choosing) pickPart(cur.ui.part || partOf(cur.ui.group)); };
  $('bBack').onclick = () => pickPart(cur.ui.part || partOf(cur.ui.group));
  $('bTools').onclick = e => { e.stopPropagation(); $('bar').hidden = !$('bar').hidden; $('bTools').classList.toggle('on', !$('bar').hidden); };
  document.addEventListener('pointerdown', e => { if (!$('bar').hidden && !e.target.closest('#bar,#bTools')) { $('bar').hidden = true; $('bTools').classList.remove('on'); } });
  $('extClose').onclick = () => $('extDlg').close(); $('extDlg').addEventListener('close', () => { K.previewCovered = false; $('extFrame').removeAttribute('src'); });
  $('mCtl').onclick = () => $('side').classList.toggle('open');
  const cameraToggle = document.createElement('button'); cameraToggle.id = 'bCameraToggle';
  $('bar').appendChild(cameraToggle);
  cameraToggle.onclick = () => { if (cameraEnabled() || previewCamera) K.transitionCamera.revoke(); else { localSet('cameraEnabled', true); localSet('paneCameraAllowed', true); ensureCamera(true); } };
  $('selCamera').onchange = () => { localSet('cameraDevice', $('selCamera').value); localSet('cameraEnabled', true); ensureCamera(true); };
  $('bCameraReconnect').onclick = () => { localSet('cameraEnabled', true); ensureCamera(true); };
  $('bCameraPreview').onclick = () => { const panel = $('cameraPreview'); panel.hidden = !panel.hidden; $('bCameraPreview').textContent = panel.hidden ? 'Show original feed' : 'Hide original feed'; };
  if (navigator.mediaDevices?.addEventListener) navigator.mediaDevices.addEventListener('devicechange', refreshCameraDevices);
  const phoneUrl = new URL(location.href); phoneUrl.searchParams.delete('edit'); phoneUrl.hash = '';
  $('phoneLink').innerHTML = 'On the phone, open:<br>'; const phoneAnchor = document.createElement('a'); phoneAnchor.href = phoneUrl.href; phoneAnchor.textContent = phoneUrl.href; $('phoneLink').appendChild(phoneAnchor);
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


