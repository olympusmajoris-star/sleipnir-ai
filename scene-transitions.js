/* Transition captured app content on a transparent canvas. All raster analysis is done once per capture. */
(() => {
  'use strict';

  const effects = [
    { id: 'off', label: 'Instant', variants: [] },
    { id: 'draw', label: 'Draw into place', variants: [
      { id: 'ink', label: 'Ink contours' }, { id: 'pencil', label: 'Pencil & hatching' }, { id: 'wireframe', label: 'Wireframe' }
    ] },
    { id: 'filaments', label: 'Projector filaments', variants: [] },
    { id: 'aperture', label: 'Circular aperture', variants: [] },
    { id: 'mesh', label: 'Projected mesh', variants: [] },
    { id: 'glass', label: 'Floating panes', variants: [] }
  ];
  for (const entry of effects) {
    if (!entry.variants.length) entry.variants.push({ id: 'default', label: 'Original' });
  }
  const tau = Math.PI * 2;
  const clamp = (n, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));
  const ease = t => (t = clamp(t), t * t * (3 - 2 * t));
  const stage = (t, a, b) => ease((t - a) / (b - a));
  const read = plane => typeof plane === 'function' ? plane() : plane;
  const sizeOf = plane => {
    const item = read(plane);
    return item && [item.videoWidth || item.naturalWidth || item.width, item.videoHeight || item.naturalHeight || item.height];
  };
  function surface(w, h, analysis = false) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    const ctx = c.getContext('2d', analysis ? { willReadFrequently: true } : undefined);
    return { c, ctx };
  }
  function release(canvas) {
    if (canvas) canvas.width = canvas.height = 0;
  }
  function randomGenerator(seed) {
    let state = Number.isFinite(+seed) ? +seed | 0 : 1;
    return () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }
  function paint(ctx, plane, w, h, opacity = 1) {
    const item = read(plane);
    const dimensions = sizeOf(item);
    if (opacity <= 0 || !dimensions || !(dimensions[0] > 0 && dimensions[1] > 0)) return;
    ctx.globalAlpha = clamp(opacity);
    ctx.drawImage(item, 0, 0, w, h);
    ctx.globalAlpha = 1;
  }
  // Weighted premultiplied pixels keep fully opaque shared scenery opaque and true holes transparent.
  function mix(ctx, a, b, w, h, t) {
    paint(ctx, a, w, h, 1 - t);
    ctx.globalCompositeOperation = 'lighter';
    paint(ctx, b, w, h, t);
    ctx.globalCompositeOperation = 'source-over';
  }
  function sampleImage(plane, w, h, longSide = 510) {
    const ratio = Math.min(1, longSide / Math.max(w, h));
    const target = surface(w * ratio, h * ratio, true);
    try {
      paint(target.ctx, plane, target.c.width, target.c.height);
      return target.ctx.getImageData(0, 0, target.c.width, target.c.height);
    } catch {
      // Cross-origin media can still be composited. Only contour extraction needs readable pixels.
      return null;
    } finally { release(target.c); }
  }

  // Place the projector at the real controls, including overlays limited to a small area of the screen.
  function coverage(image) {
    if (!image) return null;
    const { width: w, height: h, data } = image;
    let left = w, top = h, right = -1, bottom = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] < 8) continue;
      left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
    return right < left ? null : [left / w, top / h, (right + 1) / w, (bottom + 1) / h];
  }

  // Non-maximum suppression and path following retain outlines of the actual text, glass, and artwork.
  function contours(image, variant, reverse, random, intensity, tint) {
    if (!image) return null;
    const { width: w, height: h, data } = image;
    const n = w * h;
    const luma = new Float32Array(n), alpha = new Float32Array(n), chroma = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const d = i * 4, a = data[d + 3] / 255;
      alpha[i] = a * 255;
      luma[i] = (.28 * data[d] + .57 * data[d + 1] + .15 * data[d + 2]) * a;
      chroma[i] = (data[d] - data[d + 2]) * .35 * a;
    }
    const gx = new Float32Array(n), gy = new Float32Array(n), mag = new Float32Array(n);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = x + y * w;
      let strength = 0;
      for (const channel of [luma, alpha, chroma]) {
        const dx = (channel[i + 1] - channel[i - 1]) * 2 + channel[i + 1 + w] - channel[i - 1 + w] + channel[i + 1 - w] - channel[i - 1 - w];
        const dy = (channel[i + w] - channel[i - w]) * 2 + channel[i + w + 1] - channel[i - w + 1] + channel[i + w - 1] - channel[i - w - 1];
        const m = Math.abs(dx) + Math.abs(dy);
        if (m > strength) { strength = m; gx[i] = dx; gy[i] = dy; }
      }
      mag[i] = strength;
    }
    const pixels = new Uint8Array(n);
    const neighbors = [-w, -w + 1, 1, w + 1, w, w - 1, -1, -w - 1];
    const threshold = 76 - 34 * intensity;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = x + y * w;
      const dx = gx[i], dy = gy[i], ax = Math.abs(dx), ay = Math.abs(dy);
      const step = ay < ax * .42 ? 1 : ax < ay * .42 ? w : dx * dy > 0 ? w + 1 : w - 1;
      if (mag[i] > threshold && mag[i] >= mag[i - step] && mag[i] > mag[i + step]) pixels[i] = 1;
    }
    const groupCount = 96;
    const groups = Array.from({ length: groupCount }, () => ({ fine: new Path2D(), bold: new Path2D(), texture: new Path2D() }));
    const [left, top, right, bottom] = coverage(image) || [0, 0, 1, 1];
    const index = (x, y, variance = 0) => {
      const sx = clamp((x / w - left) / (right - left)), sy = clamp((y / h - top) / (bottom - top));
      return Math.min(groupCount - 1, Math.floor(groupCount * clamp((reverse ? 1 - sx : sx) * .48 + sy * .37 + variance * .15)));
    };
    const follow = (start, initial) => {
      const chain = [];
      let last = start, angle = initial;
      while (chain.length < 144) {
        let next = -1, score = -1, nextAngle = angle;
        for (let k = 0; k < 8; k++) {
          const i = last + neighbors[k];
          if (!pixels[i]) continue;
          const turn = Math.abs(k - angle);
          const priority = (angle < 0 ? 0 : 4 - Math.min(turn, 8 - turn)) + Math.min(1, mag[i] / 1100);
          if (priority > score) { next = i; score = priority; nextAngle = k; }
        }
        if (next < 0) break;
        pixels[next] = 0; chain.push(next); last = next; angle = nextAngle;
      }
      return chain;
    };
    for (let i = w + 1; i < n - w; i++) {
      if (!pixels[i]) continue;
      pixels[i] = 0;
      const right = follow(i, -1);
      const left = follow(i, -1);
      const chain = left.reverse().concat(i, right);
      if (chain.length < 3) continue;
      const jitter = random();
      const step = variant === 'wireframe' ? 5 : variant === 'pencil' ? 2 : 1;
      let j = 0;
      while (j < chain.length - 1) {
        const start = chain[j], x = start % w, y = Math.floor(start / w);
        const group = groups[index(x, y, jitter)];
        const path = (mag[start] > 400 && variant !== 'wireframe') ? group.bold : group.fine;
        const end = Math.min(chain.length - 1, j + 18);
        path.moveTo(x, y);
        for (let k = j + step; k < end; k += step) path.lineTo(chain[k] % w, Math.floor(chain[k] / w));
        path.lineTo(chain[end] % w, Math.floor(chain[end] / w));
        if (variant === 'wireframe' && end - j > 10 && mag[start] > 210) {
          const mid = chain[(j + end) >> 1], a = chain[end] % w, b = Math.floor(chain[end] / w);
          group.texture.moveTo(x, y); group.texture.lineTo(a, b);
          group.texture.lineTo(mid % w, Math.floor(mid / w));
        }
        j = end;
      }
    }
    if (variant === 'pencil') {
      // Crosshatch shaded pixels next to actual detail. A blank backdrop stays blank.
      for (let y = 3; y < h - 6; y += 4) for (let x = 3 + (y % 3); x < w - 7; x += 5) {
        const i = y * w + x;
        if (alpha[i] < 36 || mag[i] < 20 || luma[i] > 200 || random() > .76) continue;
        const len = 2 + 4 * (1 - luma[i] / 255), stroke = groups[index(x, y, random())].texture;
        stroke.moveTo(x, y); stroke.lineTo(x + len, y - len * (.60 + random() * .3));
      }
    }
    const raster = surface(w, h);
    let rendered = 0;
    function upto(fraction) {
      const count = Math.round(groups.length * clamp(fraction));
      if (count < rendered) { rendered = 0; raster.ctx.clearRect(0, 0, w, h); }
      const c = raster.ctx;
      c.lineJoin = c.lineCap = 'round'; c.strokeStyle = tint;
      for (; rendered < count; rendered++) {
        const group = groups[rendered];
        c.globalAlpha = variant === 'pencil' ? .58 : .83;
        c.lineWidth = variant === 'wireframe' ? .77 : .83; c.stroke(group.fine);
        c.lineWidth = variant === 'pencil' ? 1 : 1.28; c.globalAlpha = .95; c.stroke(group.bold);
        c.lineWidth = .64; c.globalAlpha = variant === 'pencil' ? .61 : .50; c.stroke(group.texture);
      }
      c.globalAlpha = 1;
      return raster.c;
    }
    return { upto, dispose: () => release(raster.c) };
  }

  function paneHighlight(image, tint) {
    if (!image) return null;
    const { width: w, height: h, data } = image;
    const raster = surface(w, h), out = raster.ctx.createImageData(w, h);
    const color = parseInt(tint.slice(1), 16);
    for (let y = 1; y < h; y++) for (let x = 1; x < w; x++) {
      const i = (y * w + x) * 4, prev = i - 4 * w;
      const a = data[i + 3] / 255;
      if (!a) continue;
      // Glancing light catches existing upper and left edges of glass and lettering.
      const delta = Math.max(0, data[i + 3] - data[prev + 3], data[i + 3] - data[i - 1],
        (data[i] + data[i + 1] - data[prev] - data[prev + 1]) * .48);
      out.data[i] = color >> 16; out.data[i + 1] = (color >> 8) & 255; out.data[i + 2] = color & 255;
      out.data[i + 3] = Math.min(255, delta * 2) * a;
    }
    raster.ctx.putImageData(out, 0, 0);
    return raster.c;
  }

  function paneBands(image, count) {
    // Find gaps between actual controls near each nominal pane break when transparency is available.
    if (!image) return Array.from({ length: count + 1 }, (_, i) => i / count);
    const { data, width, height } = image, result = [0];
    for (let k = 1; k < count; k++) {
      const y0 = height * k / count, spread = height / (count * 2.8);
      let best = Math.round(y0), bestCost = Infinity;
      for (let y = Math.max(0, Math.ceil(y0 - spread)); y < Math.min(height, y0 + spread); y++) {
        let cost = Math.abs(y - y0) / spread * .08;
        for (let x = 0; x < width; x += 3) cost += data[4 * (y * width + x) + 3] / (255 * Math.ceil(width / 3));
        if (cost < bestCost) { bestCost = cost; best = y; }
      }
      result.push(best / height);
    }
    result.push(1);
    return result;
  }

  function prepare(options = {}) {
    const settings = { ...options.settings, ...options };
    const effect = effects.some(entry => entry.id === settings.effect) ? settings.effect : 'off';
    const controls = (settings.layer || (settings.layers === 'overlay' ? 'controls' : settings.layers) || 'controls') === 'controls';
    const hasPlanes = controls && Boolean(settings.fromLayer || settings.toLayer || settings.fromOverlay || settings.toOverlay);
    const from = hasPlanes ? settings.fromLayer || settings.fromOverlay : settings.from;
    const to = hasPlanes ? settings.toLayer || settings.toOverlay : settings.to;
    const fromBase = controls ? settings.fromBase : null, toBase = controls ? settings.toBase : null;
    const size = sizeOf(to) || sizeOf(from) || sizeOf(toBase) || sizeOf(fromBase) || [1, 1];
    const w = Math.max(1, size[0]), h = Math.max(1, size[1]);
    const reverse = settings.direction === 'reverse', sign = reverse ? -1 : 1;
    const variant = ['ink', 'pencil', 'wireframe'].includes(settings.variant) ? settings.variant : 'ink';
    const tint = /^#[\da-f]{6}$/i.test(settings.color) ? settings.color : '#75e9ff';
    const intensity = Number.isFinite(+settings.intensity) ? clamp(+settings.intensity) : .65;
    const random = randomGenerator(settings.seed);
    const sourceImage = effect === 'glass' ? sampleImage(from, w, h) : null;
    const targetImage = ['draw', 'glass', 'filaments'].includes(effect) ? sampleImage(to, w, h) : null;
    let bounds = [0, 0, 1, 1];
    if (controls && ['aperture', 'mesh', 'filaments'].includes(effect)) {
      const boxes = [coverage(sampleImage(from, w, h, 128)), coverage(targetImage || sampleImage(to, w, h, 128))].filter(Boolean);
      if (boxes.length) bounds = [Math.min(...boxes.map(b => b[0])), Math.min(...boxes.map(b => b[1])),
        Math.max(...boxes.map(b => b[2])), Math.max(...boxes.map(b => b[3]))];
    }
    const focusX = bounds[0] * w, focusY = bounds[1] * h;
    const focusW = (bounds[2] - bounds[0]) * w, focusH = (bounds[3] - bounds[1]) * h;
    const art = ['draw', 'filaments'].includes(effect) ? contours(targetImage, variant, reverse, random, intensity, tint) : null;
    const departureBands = effect === 'glass' ? paneBands(sourceImage, 4) : null;
    const arrivalBands = effect === 'glass' ? paneBands(targetImage, 4) : null;
    const glint = effect === 'glass' ? paneHighlight(targetImage, tint) : null;
    const buffer = surface(w, h);
    const c = buffer.ctx;
    // Build a repeatable network projected from one point onto a shallow floor.
    const strands = [];
    if (effect === 'filaments') for (let i = 0; i < 60; i++) {
      const angle = tau * (i + random() * .45) / 60;
      const length = .57 + .52 * random(), bend = (random() - .5) * .4;
      const path = [];
      for (let j = 0; j <= 16; j++) {
        const r = length * j / 16;
        const a = angle + bend * r + .035 * (random() - .5);
        path.push([r * Math.cos(a), r * Math.sin(a)]);
      }
      strands.push(path);
    }
    const unit = Math.min(w, h);
    let disposed = false;
    function circleReveal(t, mesh) {
      const cx = focusX + focusW * (.5 + sign * (mesh ? .025 : -.105) * (1 - t));
      const cy = focusY + focusH * (mesh ? .55 : .47);
      const max = Math.hypot(Math.max(cx - focusX, focusX + focusW - cx), Math.max(cy - focusY, focusY + focusH - cy));
      const p = stage(t, .035, .965), rx = Math.max(.1, p * max * (mesh ? 1.17 : 1.01));
      const ry = mesh ? rx * (.25 + .85 * p) : rx;
      const angle = mesh ? -.13 * sign : 0;
      const region = new Path2D();
      region.ellipse(cx, cy, rx, ry, angle, 0, tau);
      paint(c, from, w, h);
      c.save(); c.clip(region); c.clearRect(0, 0, w, h); paint(c, to, w, h); c.restore();
      const gain = Math.sin(Math.PI * t) * intensity;
      c.save(); c.translate(cx, cy); c.rotate(angle);
      c.strokeStyle = tint; c.lineWidth = Math.max(.75, unit * .0028); c.globalAlpha = gain;
      c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, tau); c.stroke();
      if (mesh) {
        c.save(); c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, tau); c.clip();
        const slope = (1 - p) * .21 * sign;
        c.globalAlpha = gain * .64; c.lineWidth = Math.max(.45, unit * .0013);
        c.beginPath();
        for (let n = -8; n <= 8; n++) {
          const lat = n * Math.PI / 18, z = Math.sin(lat), radius = Math.cos(lat);
          for (let j = 0; j <= 45; j++) {
            const a = j * tau / 45, x = Math.cos(a) * radius, y = z + slope * radius * Math.sin(a);
            if (j === 0) c.moveTo(rx * x, ry * y); else c.lineTo(rx * x, ry * y);
          }
        }
        for (let n = 0; n < 26; n++) {
          const a = n * tau / 26 + t * .48 * sign;
          for (let j = 0; j <= 24; j++) {
            const lat = (j / 24 - .5) * Math.PI, ring = Math.cos(lat);
            const x = rx * Math.cos(a) * ring, y = ry * (Math.sin(lat) + slope * Math.sin(a) * ring);
            if (j === 0) c.moveTo(x, y); else c.lineTo(x, y);
          }
        }
        c.stroke(); c.restore();
      } else {
        c.globalAlpha = gain * .70; c.lineWidth *= .55;
        const gap = unit * .014;
        for (let i = 0; i < 5; i++) {
          const start = i * tau / 5 + sign * t * .58;
          c.beginPath(); c.arc(0, 0, rx + gap * (1 + (i % 2)), start, start + .91); c.stroke();
        }
      }
      c.restore();
    }
    function projector(t) {
      const entrant = stage(t, .33, .92);
      mix(c, from, to, w, h, entrant);
      const fired = stage(t, .01, .60), fade = 1 - stage(t, .56, .97);
      const gain = fired * fade * intensity;
      if (art) paint(c, art.upto(stage(t, .21, .79)), w, h, .65 * gain);
      const baseX = focusX + (.5 + .06 * sign) * focusW, baseY = focusY + .79 * focusH;
      const project = point => [baseX + sign * point[0] * focusW * .64,
        baseY + point[1] * focusH * .115 - .16 * focusH * Math.exp(-5 * Math.hypot(...point))];
      c.save(); c.strokeStyle = tint; c.fillStyle = tint; c.lineJoin = 'round';
      c.lineWidth = Math.max(.65, unit * .0016);
      const extent = fired * 16, stop = Math.floor(extent), part = extent - stop;
      for (let i = 0; i < strands.length; i++) {
        const branch = strands[i];
        c.globalAlpha = gain * (.38 + (i % 4) * .12); c.beginPath();
        for (let j = 0; j <= stop; j++) {
          const [x, y] = project(branch[j]);
          if (!j) c.moveTo(x, y); else c.lineTo(x, y);
          if (j > 1 && (j + i) % 4 === 1) {
            const adjacent = project(strands[(i + 1) % strands.length][j]);
            c.lineTo(...adjacent); c.moveTo(x, y);
          }
        }
        if (stop < 16) {
          const a = branch[stop], b = branch[stop + 1];
          c.lineTo(...project([a[0] + (b[0] - a[0]) * part, a[1] + (b[1] - a[1]) * part]));
        }
        c.stroke();
        if (i % 3 === 0 && stop > 1) {
          const dot = project(branch[Math.max(1, (stop + i) % stop)]);
          c.beginPath(); c.arc(...dot, unit * .002, 0, tau); c.fill();
        }
      }
      c.restore();
    }
    function glassPlane(item, bands, t, leaving) {
      const src = read(item), dims = sizeOf(src);
      if (!dims || !dims[0] || !dims[1]) return;
      for (let i = 0; i < bands.length - 1; i++) {
        const order = reverse ? bands.length - 2 - i : i;
        const delay = order * .075;
        const q = stage(t, leaving ? delay : delay + .19, leaving ? delay + .57 : delay + .775);
        const amount = leaving ? q : 1 - q;
        if (amount >= 1) continue;
        const top = bands[i], height = bands[i + 1] - top, centerY = (top + height / 2) * h;
        const lateral = (leaving ? -1 : 1) * sign * amount * (.36 + .94 * intensity);
        c.save();
        c.globalAlpha = 1 - ease(amount); c.translate(w * .5 + w * .24 * lateral, centerY - amount * h * .032);
        c.transform(1 - amount * .24, lateral * .018, lateral * .055, 1 - amount * .11, 0, 0);
        c.drawImage(src, 0, top * dims[1], dims[0], height * dims[1],
          -w * .5, -height * h / 2, w, height * h);
        if (!leaving && glint) {
          c.globalAlpha *= Math.sin(Math.PI * amount) * intensity;
          c.drawImage(glint, 0, top * glint.height, glint.width, height * glint.height,
            -w * .5, -height * h / 2, w, height * h);
        }
        c.restore();
      }
    }
    function draw(ctx, progress) {
      if (disposed) return;
      const t = clamp(Number.isFinite(+progress) ? +progress : 0);
      const W = ctx.canvas.width, H = ctx.canvas.height;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, W, H);
      if (effect === 'off' || t === 0 || t === 1) {
        const dest = t > 0;
        paint(ctx, dest ? toBase : fromBase, W, H); paint(ctx, dest ? to : from, W, H);
        ctx.restore(); return;
      }
      if (fromBase || toBase) mix(ctx, fromBase, toBase, W, H, stage(t, .24, .82));
      c.clearRect(0, 0, w, h);
      if (effect === 'draw') {
        const resolved = stage(t, .47, .97);
        if (art) {
          paint(c, from, w, h, 1 - stage(t, .015, .52));
          paint(c, to, w, h, resolved);
          const glow = stage(t, .005, .23) * (1 - stage(t, .62, .98));
          paint(c, art.upto(stage(t, .0, .76)), w, h, glow * (.56 + .44 * intensity));
        } else mix(c, from, to, w, h, ease(t));
      } else if (effect === 'filaments') projector(t);
      else if (effect === 'aperture' || effect === 'mesh') circleReveal(t, effect === 'mesh');
      else {
        glassPlane(from, departureBands, t, true);
        glassPlane(to, arrivalBands, t, false);
      }
      paint(ctx, buffer.c, W, H);
      ctx.restore();
    }
    function dispose() {
      if (disposed) return;
      disposed = true;
      art?.dispose(); release(glint); release(buffer.c);
    }
    return { draw, dispose };
  }

  function play(options) {
    const { canvas, onFinish } = options, ctx = canvas.getContext('2d');
    const settings = { ...options, ...options.settings };
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const duration = Number.isFinite(+settings.durationMs) ? clamp(+settings.durationMs, 0, 20000) : 900;
    const instant = !effects.some(item => item.id === settings.effect && item.id !== 'off') || duration === 0 || settings.reducedMotion || media?.matches;
    const scene = prepare(instant ? { ...settings, effect: 'off' } : settings);
    let frameId = 0, done = false, start;
    function finish(commit) {
      if (done) return;
      done = true;
      cancelAnimationFrame(frameId);
      media?.removeEventListener?.('change', motionChange);
      if (commit) scene.draw(ctx, 1);
      scene.dispose();
      if (commit) onFinish?.();
    }
    function motionChange(e) { if (e.matches) finish(true); }
    function tick(now) {
      if (done) return;
      start ??= now;
      const progress = clamp((now - start) / duration);
      if (progress === 1) finish(true);
      else { scene.draw(ctx, progress); frameId = requestAnimationFrame(tick); }
    }
    if (instant) finish(true);
    else {
      media?.addEventListener?.('change', motionChange);
      scene.draw(ctx, 0); frameId = requestAnimationFrame(tick);
    }
    return { skip: () => finish(true), cancel: () => finish(false) };
  }
  window.SleipnirSceneTransitions = Object.freeze({ effects, prepare, play });
})();
