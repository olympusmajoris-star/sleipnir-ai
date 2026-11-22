/* Glass is painted between the live scene and its interactive controls. Positions
   are normalized to the viewport and follow it across device orientations. */
(function (root) {
  'use strict';

  const defaults = Object.freeze({material: 'none', tint: '#91c9db', transmission: .9, frost: 0,
    x: .08, y: .66, width: .84, height: .22, shape: 'rounded',
    source: 'scene', show: 'always', delayMs: 0, visibleMs: 1500});
  const materials = ['none', 'clear', 'frosted', 'tinted'];
  const shapes = ['rounded', 'rectangle', 'ellipse'];
  const modes = ['always', 'during', 'after', 'window'];
  const presets = {clear: [.95, 0], frosted: [.8, .65], tinted: [.7, .08]};
  const frac = n => Math.round(n * 10000) / 10000;
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  function num(value, fallback, min = 0, max = 1) {
    return frac(clamp(Number.isFinite(value) ? value : fallback, min, max));
  }
  function normalize(value) {
    const v = value || {}, width = num(v.width, defaults.width, .04), height = num(v.height, defaults.height, .04);
    return {material: materials.includes(v.material) ? v.material : 'none',
      tint: typeof v.tint === 'string' && /^#[\da-f]{6}$/i.test(v.tint) ? v.tint.toLowerCase() : defaults.tint,
      transmission: num(v.transmission, defaults.transmission), frost: num(v.frost, defaults.frost),
      x: num(v.x, defaults.x, 0, 1 - width), y: num(v.y, defaults.y, 0, 1 - height), width, height,
      shape: shapes.includes(v.shape) ? v.shape : defaults.shape,
      source: v.source === 'camera' ? 'camera' : 'scene', show: modes.includes(v.show) ? v.show : 'always',
      delayMs: Math.round(num(v.delayMs, 0, 0, 60000)), visibleMs: Math.round(num(v.visibleMs, 1500, 100, 60000))};
  }
  function visible(g, clock = {}) {
    if (!g || !materials.includes(g.material) || g.material === 'none') return false;
    const elapsed = clock?.elapsedMs ?? 0, duration = Math.max(0, clock?.transitionMs || 0);
    if (elapsed < 0) return false;
    if (g.show === 'during') return elapsed < duration;
    if (g.show === 'after') return elapsed >= duration;
    if (g.show === 'window') return elapsed >= (g.delayMs ?? 0) && elapsed < (g.delayMs ?? 0) + (g.visibleMs ?? 1500);
    return true;
  }
  function cameraFrame(clock) {
    const frame = clock && Object.hasOwn(clock, 'camera') ? clock.camera : document.getElementById('cam');
    if (!frame || ('readyState' in frame && (frame.readyState < 2 || !frame.videoWidth))) return null;
    const width = frame.videoWidth || frame.naturalWidth || frame.width, height = frame.videoHeight || frame.naturalHeight || frame.height;
    return width > 0 && height > 0 ? {frame, width, height} : null;
  }
  function drawCamera(ctx, camera, W, H, sigma, mirror) {
    const s = Math.max(W / camera.width, H / camera.height), w = camera.width * s, h = camera.height * s;
    ctx.save();
    if (mirror) { ctx.translate(W, 0); ctx.scale(-1, 1); }
    let image = camera.frame;
    if (sigma && typeof ctx.filter === 'string') ctx.filter = 'blur(' + (sigma * Math.hypot(ctx.getTransform().a, ctx.getTransform().b)) + 'px)';
    else if (sigma) {
      let tmp = scratch.get(ctx);
      if (!tmp) { tmp = document.createElement('canvas'); scratch.set(ctx, tmp); }
      const cw = Math.max(1, Math.ceil(w / (sigma * 1.5))), ch = Math.max(1, Math.ceil(h / (sigma * 1.5)));
      if (tmp.width !== cw) tmp.width = cw;
      if (tmp.height !== ch) tmp.height = ch;
      tmp.getContext('2d').drawImage(image, 0, 0, cw, ch); image = tmp;
    }
    ctx.drawImage(image, (W - w) / 2, (H - h) / 2, w, h);
    ctx.restore();
  }
  function rgba(hex, alpha) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${alpha})`;
  }
  function shapePath(x, y, w, h, shape, radius) {
    const path = new Path2D();
    if (shape === 'ellipse') path.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    else if (shape === 'rounded') path.roundRect(x, y, w, h, radius);
    else path.rect(x, y, w, h);
    return path;
  }
  const scratch = new WeakMap();
  // Only the pixels behind the pane and a blur-kernel margin need a snapshot.
  // This also supports canvases containing camera/video frames without CPU readback.
  function blurScene(ctx, scene, x, y, w, h, W, H, sigma) {
    const matrix = ctx.getTransform();
    const source = scene || ctx.canvas;
    const sx = scene ? source.width / W : matrix.a, sy = scene ? source.height / H : matrix.d;
    const tx = scene ? 0 : matrix.e, ty = scene ? 0 : matrix.f;
    if (sx <= 0 || sy <= 0) return;
    const padding = 3.5 * sigma;
    const left = clamp(Math.floor((x - padding) * sx + tx), 0, source.width);
    const top = clamp(Math.floor((y - padding) * sy + ty), 0, source.height);
    const right = clamp(Math.ceil((x + w + padding) * sx + tx), 0, source.width);
    const bottom = clamp(Math.ceil((y + h + padding) * sy + ty), 0, source.height);
    if (right <= left || bottom <= top) return;
    const sw = right - left, sh = bottom - top;
    let tmp = scratch.get(ctx);
    if (!tmp) { tmp = document.createElement('canvas'); scratch.set(ctx, tmp); }
    const filter = typeof ctx.filter === 'string';
    const factor = filter ? 1 : Math.max(1, sigma * sx * 1.5);
    const cw = Math.max(1, Math.ceil(sw / factor)), ch = Math.max(1, Math.ceil(sh / factor));
    if (tmp.width !== cw) tmp.width = cw;
    if (tmp.height !== ch) tmp.height = ch;
    const copy = tmp.getContext('2d');
    copy.globalCompositeOperation = 'copy';
    copy.drawImage(source, left, top, sw, sh, 0, 0, cw, ch);
    ctx.save();
    if (filter) ctx.filter = `blur(${sigma * Math.hypot(matrix.a, matrix.b)}px)`;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(tmp, (left - tx) / sx, (top - ty) / sy, sw / sx, sh / sy);
    ctx.restore();
  }
  function draw(ctx, value, scene, width, height, clock) {
    if (!visible(value, clock)) return;
    const g = normalize(value), m = ctx.getTransform();
    const camera = g.source === 'camera' ? cameraFrame(clock) : null;
    if (g.source === 'camera' && !camera) return;
    const W = width || ctx.canvas.width / Math.hypot(m.a, m.b), H = height || ctx.canvas.height / Math.hypot(m.c, m.d);
    if (!(W > 0 && H > 0)) return;
    const scale = Math.min(W, H) / 390, x = g.x * W, y = g.y * H, w = g.width * W, h = g.height * H;
    const path = shapePath(x, y, w, h, g.shape, Math.min(16 * scale, w / 2, h / 2));
    ctx.save();
    ctx.clip(path);
    const sigma = 14 * g.frost * scale;
    if (camera) drawCamera(ctx, camera, W, H, sigma, clock?.mirror === true);
    else if (sigma > 0) blurScene(ctx, scene, x, y, w, h, W, H, sigma);
    ctx.fillStyle = rgba(g.material === 'tinted' ? g.tint : '#f5f9ff', 1 - g.transmission);
    ctx.fill(path);
    ctx.lineWidth = 2 * scale;
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.stroke(path);
    ctx.restore();
  }
  function boundsCSS(el, g) {
    Object.assign(el.style, {left: `${g.x * 100}%`, top: `${g.y * 100}%`, width: `${g.width * 100}%`, height: `${g.height * 100}%`});
  }
  function cssRadius(g, scale) { return g.shape === 'ellipse' ? '50%' : g.shape === 'rounded' ? `${16 * scale}px` : '0'; }
  function installPane(host, initial, beforeForeground, initialClock) {
    const el = document.createElement('div');
    el.ariaHidden = 'true';
    el.style.cssText = 'position:absolute;pointer-events:none;box-sizing:border-box;overflow:hidden;';
    const cameraCanvas = document.createElement('canvas'), glaze = document.createElement('div');
    cameraCanvas.style.cssText = glaze.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border-radius:inherit;pointer-events:none';
    el.append(cameraCanvas, glaze);
    host.insertBefore(el, beforeForeground || null);
    let value = normalize(initial), clock = initialClock;
    function update(next, nextClock = clock) {
      if (next !== undefined) value = normalize(next);
      clock = nextClock;
      const camera = value.source === 'camera' ? cameraFrame(clock) : null;
      el.hidden = !visible(value, clock) || (value.source === 'camera' && !camera);
      if (el.hidden) return;
      const W = host.clientWidth, H = host.clientHeight, scale = Math.min(W, H) / 390;
      boundsCSS(el, value);
      const sigma = 14 * value.frost * scale, blur = camera ? 'none' : `blur(${sigma}px)`;
      Object.assign(el.style, {borderRadius: cssRadius(value, scale), backdropFilter: blur, webkitBackdropFilter: blur});
      Object.assign(glaze.style, {boxShadow: `inset 0 0 0 ${scale}px rgba(255,255,255,.35)`,
        backgroundColor: rgba(value.material === 'tinted' ? value.tint : '#f5f9ff', 1 - value.transmission)});
      cameraCanvas.hidden = !camera;
      if (camera && W && H) {
        const ratio = Math.min(3, root.devicePixelRatio || 1), px = Math.ceil(value.width * W * ratio), py = Math.ceil(value.height * H * ratio);
        if (cameraCanvas.width !== px) cameraCanvas.width = px;
        if (cameraCanvas.height !== py) cameraCanvas.height = py;
        const ctx = cameraCanvas.getContext('2d');
        ctx.setTransform(ratio, 0, 0, ratio, -value.x * W * ratio, -value.y * H * ratio);
        drawCamera(ctx, camera, W, H, sigma, clock?.mirror === true);
      }
    }
    const observer = new ResizeObserver(() => update()); observer.observe(host); update();
    return {update, dispose() { observer.disconnect(); el.remove(); }};
  }

  function addStyles() {
    if (document.getElementById('sleipnir-glass-style')) return;
    const style = document.createElement('style'); style.id = 'sleipnir-glass-style';
    style.textContent = `
    .pg-glass-controls {display:grid;gap:.7rem;min-width:0}
    .pg-glass-controls [hidden],.pg-glass-handles[hidden]{display:none!important}
    .pg-glass-controls label,.pg-glass-controls fieldset{margin:0;min-width:0}
    .pg-glass-controls label{display:grid;gap:.28rem;color:inherit;font:inherit}
    .pg-glass-controls input,.pg-glass-controls select{box-sizing:border-box;min-width:0;width:100%}
    .pg-glass-controls input[type=color]{min-height:2rem;padding:2px}
    .pg-glass-controls .pg-glass-values{display:grid;gap:.55rem}
    .pg-glass-controls .pg-glass-row{display:grid;grid-template-columns:minmax(5.6rem,1fr) minmax(3rem,1.2fr) 4.3rem;align-items:center;gap:.5rem}
    .pg-glass-controls .pg-glass-row label{min-width:0}
    .pg-glass-row input[type=number]{padding-inline:.25rem}
    .pg-glass-controls .pg-glass-pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.55rem}
    .pg-glass-controls button{justify-self:start}
    .pg-glass-handles{position:absolute;box-sizing:border-box;outline:1px dashed #8ef1eb;outline-offset:-1px;touch-action:none;cursor:move;z-index:5;pointer-events:auto;background:transparent}
    .pg-glass-handles:focus-visible,.pg-glass-corner:focus-visible{outline:2px solid #fff;outline-offset:-2px}
    .pg-glass-handles .pg-glass-corner{position:absolute;display:grid;place-items:center;right:0;bottom:0;width:23px;height:23px;min-width:23px;min-height:23px;margin:0;border:0;padding:0;background:transparent;cursor:nwse-resize;touch-action:none;transform:translate(20%,20%)}
    .pg-glass-corner::after{content:'';display:block;width:9px;height:9px;border:1px solid #122225;box-shadow:0 0 0 1px #fff9;background:#8ef1eb}
    `;
    document.head.append(style);
  }
  // A foreground plane contains only the actual controls of this destination.
  // Work at thumbnail resolution once, when the owner explicitly requests a fit.
  function controlBounds(plane) {
    if (!plane?.width || !plane.height) return null;
    const s = Math.min(1, 180 / Math.max(plane.width, plane.height)), c = document.createElement('canvas');
    const w = c.width = Math.max(1, Math.round(plane.width * s)), h = c.height = Math.max(1, Math.round(plane.height * s));
    const ctx = c.getContext('2d', {willReadFrequently:true});
    let pixels;
    try { ctx.drawImage(plane,0,0,w,h); pixels = ctx.getImageData(0,0,w,h).data; } catch { return null; }
    let l = w, t = h, r = -1, b = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (pixels[(y*w+x)*4+3] < 40) continue;
      l = Math.min(l,x); r = Math.max(r,x); t = Math.min(t,y); b = Math.max(b,y);
    }
    if (r < l) return null;
    const pad = Math.max(1, Math.round(Math.min(w,h)*.02));
    const x = Math.max(0,(l-pad)/w), y = Math.max(0,(t-pad)/h);
    return {x, y, width:Math.min(1,(r+1+pad)/w)-x, height:Math.min(1,(b+1+pad)/h)-y};
  }
  let instanceId = 0;
  function mountControls(host, initial, onChange, options = {}) {
    addStyles();
    const id = 'page-glass-' + ++instanceId, box = document.createElement('div'); box.className = 'pg-glass-controls';
    const values = document.createElement('div'); values.className = 'pg-glass-values';
    let current = normalize(initial);
    const inputs = {};
    function group(el, name) { el.dataset.ptGroup = name; return el; }
    function emit(patch) { update({...current, ...patch}); onChange({...current}); }
    function menu(parent, key, title, options, change) {
      const label = document.createElement('label'), field = document.createElement('select');
      label.textContent = title; field.setAttribute('aria-label', title); label.append(field); parent.append(label);
      for (const [value, text] of options) field.add(new Option(text, value));
      field.onchange = () => change(field.value); inputs[key] = field; return field;
    }
    const materialMenu = menu(box, 'material', 'Glass material', [['none','Off'],['clear','Clear glass'],['frosted','Frosted glass'],['tinted','Tinted glass']], material => {
      const p = presets[material]; emit(p ? {material, transmission:p[0], frost:p[1]} : {material});
    });
    group(materialMenu.parentElement,'material');
    box.append(values);
    group(menu(values, 'source', 'Pane source', [['scene','Page scene'],['camera','Live camera']], source => emit({source})).parentElement,'camera');
    const cameraTools = document.createElement('div'), cameraInfo = document.createElement('span');
    cameraInfo.setAttribute('role','status'); cameraInfo.textContent = 'Live camera stays inside this pane.';
    cameraTools.append(cameraInfo);
    if (options.requestCamera) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Enable preview camera'; button.onclick = () => options.requestCamera();
      cameraTools.prepend(button);
    }
    values.append(group(cameraTools,'camera'));
    group(menu(values, 'show', 'Show pane', [['always','Throughout the page'],['during','During the entrance'],['after','After the entrance'],['window','Timed from page entry']], show => emit({show})).parentElement,'camera');
    const times = document.createElement('div'); times.className = 'pg-glass-pair'; values.append(group(times,'camera'));
    for (const [key, text, min] of [['delayMs','Starts after (ms)',0],['visibleMs','Visible for (ms)',100]]) {
      const label = document.createElement('label'), field = document.createElement('input');
      label.textContent = text; field.type = 'number'; field.min = min; field.max = 60000; field.step = 1;
      field.onchange = () => { if (Number.isFinite(field.valueAsNumber)) emit({[key]:field.valueAsNumber}); else update(current); };
      label.append(field); times.append(label); inputs[key] = field;
    }
    const colorLabel = document.createElement('label'), color = document.createElement('input');
    colorLabel.textContent = 'Tint color'; color.type = 'color'; colorLabel.append(color); values.append(group(colorLabel,'material'));
    color.oninput = () => emit({tint: color.value}); inputs.tint = color;
    const rows = new Map();
    function percent(key, title, min, max) {
      const line = document.createElement('div'), label = document.createElement('label'), range = document.createElement('input'), number = document.createElement('input');
      line.className = 'pg-glass-row'; label.textContent = title; range.type = 'range'; number.type = 'number';
      range.id = id + '-' + key; label.htmlFor = range.id; number.setAttribute('aria-label', title + ' percent');
      for (const el of [range, number]) { el.min = min; el.max = max; el.step = '1'; }
      range.oninput = () => emit({[key]: range.valueAsNumber / 100});
      // Allow a full numeric entry (including replacing all digits) before clamping.
      number.onchange = () => { if (Number.isFinite(number.valueAsNumber)) emit({[key]: number.valueAsNumber / 100}); else update(current); };
      line.append(label, range, number); values.append(group(line,['transmission','frost'].includes(key) ? 'material' : 'placement')); rows.set(key, {range, number});
    }
    percent('transmission','Transmission (%)',0,100); percent('frost','Frost (%)',0,100);
    const pair = document.createElement('div'); pair.className = 'pg-glass-pair'; values.append(group(pair,'placement'));
    menu(pair, 'shape', 'Pane shape', [['rounded','Rounded'],['rectangle','Rectangle'],['ellipse','Ellipse']], shape => emit({shape}));
    const places = {upper:{x:.06,y:.04,width:.88,height:.17},center:{x:.06,y:.30,width:.88,height:.40},lower:{x:.06,y:.77,width:.88,height:.19},full:{x:0,y:0,width:1,height:1}};
    const placement = menu(pair, 'placement', 'Place pane', [['custom','Custom'],['upper','Header area'],['center','Center area'],['lower','Bottom controls'],['full','Full screen']], key => { if (places[key]) emit(places[key]); });
    if (options.getForeground) {
      const fit = document.createElement('button'), feedback = document.createElement('span');
      fit.type = 'button'; fit.textContent = 'Fit to destination controls'; feedback.setAttribute('role','status'); feedback.hidden = true;
      fit.onclick = () => {
        const bounds = controlBounds(options.getForeground());
        feedback.hidden = !!bounds;
        if (bounds) emit(bounds);
        else feedback.textContent = 'Control bounds are unavailable for this view. Drag the pane or enter its size.';
      };
      values.append(group(fit,'placement'), group(feedback,'placement'));
    }
    percent('x','Left (%)',0,96); percent('y','Top (%)',0,96); percent('width','Width (%)',4,100); percent('height','Height (%)',4,100);
    const reset = document.createElement('button'); reset.type = 'button'; reset.textContent = 'Reset placement';
    reset.onclick = () => emit({x:defaults.x, y:defaults.y, width:defaults.width, height:defaults.height, shape:defaults.shape});
    values.append(group(reset,'placement')); host.append(box);
    function update(next) {
      current = normalize(next); inputs.material.value = current.material;
      values.hidden = current.material === 'none'; colorLabel.hidden = current.material !== 'tinted';
      inputs.source.value = current.source; inputs.show.value = current.show;
      times.hidden = current.show !== 'window'; cameraTools.hidden = current.source !== 'camera';
      inputs.delayMs.value = current.delayMs; inputs.visibleMs.value = current.visibleMs;
      inputs.tint.value = current.tint; inputs.shape.value = current.shape;
      placement.value = Object.keys(places).find(key => Object.entries(places[key]).every(([p, v]) => current[p] === v)) || 'custom';
      for (const [key, {range, number}] of rows) {
        const max = key === 'x' ? 1 - current.width : key === 'y' ? 1 - current.height : 1;
        range.max = number.max = Math.round(max * 10000) / 100;
        range.value = number.value = String(Math.round(current[key] * 10000) / 100);
      }
    }
    update(current);
    return {update, setCameraStatus(text) { cameraInfo.textContent = String(text || 'Live camera stays inside this pane.'); }, dispose() {box.remove();}};
  }

  function attachHandles(stage, getGlass, onChange) {
    addStyles();
    // A canvas cannot render child elements. Use its actual on-screen rectangle
    // inside the same offset parent, including any preview letterboxing.
    const isCanvas = stage.tagName === 'CANVAS', host = isCanvas ? stage.parentElement : stage;
    const priorPosition = host.style.position, madeRelative = getComputedStyle(host).position === 'static';
    if (madeRelative) host.style.position = 'relative';
    const overlay = document.createElement('div'), handle = document.createElement('div'), corner = document.createElement('button');
    overlay.dataset.ptHandles = '';
    overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:5;overflow:visible';
    handle.className = 'pg-glass-handles'; handle.tabIndex = 0; handle.setAttribute('role','group');
    handle.setAttribute('aria-label','Move glass pane. Use arrow keys.'); corner.type = 'button'; corner.className = 'pg-glass-corner';
    corner.setAttribute('aria-label','Resize glass pane. Use arrow keys.'); handle.append(corner); overlay.append(handle); host.append(overlay);
    let drag = null;
    function update() {
      const g = normalize(getGlass()); handle.hidden = g.material === 'none';
      if (isCanvas) {
        const base = host.getBoundingClientRect(), s = stage.getBoundingClientRect();
        Object.assign(overlay.style, {inset:'auto', left:`${s.left - base.left - host.clientLeft + host.scrollLeft}px`, top:`${s.top - base.top - host.clientTop + host.scrollTop}px`, width:`${s.width}px`, height:`${s.height}px`});
      }
      if (!handle.hidden) { boundsCSS(handle, g); handle.style.borderRadius = cssRadius(g, Math.min(overlay.clientWidth, overlay.clientHeight) / 390); }
    }
    function change(g, dx, dy, resize) {
      const patch = resize ? {width: num(g.width + dx,g.width,.04,1-g.x), height: num(g.height + dy,g.height,.04,1-g.y)} : {x:g.x + dx,y:g.y + dy};
      const next = normalize({...g, ...patch}); onChange(next); update();
    }
    handle.onpointerdown = e => {
      if (!e.isPrimary || e.button !== 0 || drag) return;
      const bounds = overlay.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      drag = {id:e.pointerId, start:normalize(getGlass()), x:e.clientX,y:e.clientY,w:bounds.width,h:bounds.height,resize:e.target === corner};
      e.preventDefault(); e.stopPropagation(); (drag.resize ? corner : handle).focus({preventScroll:true}); handle.setPointerCapture(e.pointerId);
    };
    handle.onpointermove = e => { if (!drag || drag.id !== e.pointerId) return; e.preventDefault(); change(drag.start,(e.clientX-drag.x)/drag.w,(e.clientY-drag.y)/drag.h,drag.resize); };
    handle.onpointerup = handle.onpointercancel = handle.onlostpointercapture = e => { if (drag?.id === e.pointerId) drag = null; };
    handle.onkeydown = e => {
      const arrows = {ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
      if (!arrows[e.key]) return;
      e.preventDefault(); e.stopPropagation(); const step = e.shiftKey ? .05 : .01;
      change(normalize(getGlass()), arrows[e.key][0] * step, arrows[e.key][1] * step, e.target === corner);
    };
    const observer = new ResizeObserver(update); observer.observe(stage); if (isCanvas) observer.observe(host); update();
    return {update, dispose() { observer.disconnect(); overlay.remove(); if (madeRelative && host.style.position === 'relative') host.style.position = priorPosition; }};
  }
  root.PageGlass = Object.freeze({defaults, normalize, visible, draw, installPane, mountControls, attachHandles});
})(typeof window === 'undefined' ? globalThis : window);
