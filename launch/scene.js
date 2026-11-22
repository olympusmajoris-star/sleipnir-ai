/* Canvas rendition of the launch artwork, in the reference photograph's space. */
(() => {
  'use strict';
  const duration = 3.8;
  const background = '#11161c';
  let geometry;
  const smooth = (a, b, n) => {
    const x = Math.min(1, Math.max(0, (n - a) / (b - a)));
    return x * x * (3 - 2 * x);
  };

  function makeShape(points) {
    const shape = new Path2D();
    shape.moveTo(...points[0]);
    for (let i = 1; i < points.length; i++) shape.lineTo(...points[i]);
    return shape;
  }

  function setGeometry(data) {
    const paths = data.paths.map(source => {
      const { points } = source;
      const lengths = [0];
      for (let i = 1; i < points.length; i++) {
        const [x, y] = points[i];
        const [oldX, oldY] = points[i - 1];
        lengths.push(lengths[i - 1] + Math.hypot(x - oldX, y - oldY));
      }
      return { ...source, lengths, length: lengths[lengths.length - 1], shape: makeShape(points) };
    });
    const groups = new Map();
    for (const path of paths.filter(p => p.role === 'horse')) {
      const group = groups.get(path.component) || { clip: new Path2D(), end: -Infinity };
      group.clip.addPath(path.shape);
      group.end = Math.max(group.end, path.end);
      groups.set(path.component, group);
    }
    const ring = new Path2D();
    ring.arc(256, 256, 246, 0, 2 * Math.PI);
    ring.moveTo(478, 256);
    ring.arc(256, 256, 222, 0, 2 * Math.PI);
    geometry = { size: data.size, paths, groups, ring };
  }

  // Walk the original line at a constant rate along its length, irrespective
  // of how many points were needed to sample a tight curl or straight leg.
  function span(path, from, to) {
    if (from <= 0 && to >= 1) return path.shape;
    const shape = new Path2D();
    const first = from * path.length, last = to * path.length;
    let begun = false;
    for (let i = 1; i < path.points.length; i++) {
      const a = path.lengths[i - 1], b = path.lengths[i];
      if (b < first || b === a) continue;
      if (a > last) break;
      const [x0, y0] = path.points[i - 1], [x1, y1] = path.points[i];
      if (!begun) {
        const u = Math.max(0, (first - a) / (b - a));
        shape.moveTo(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u);
        begun = true;
      }
      const v = Math.min(1, (last - a) / (b - a));
      shape.lineTo(x0 + (x1 - x0) * v, y0 + (y1 - y0) * v);
      if (v < 1) break;
    }
    return shape;
  }

  function draw(ctx, width, height, elapsed, image) {
    if (!geometry) throw new Error('Load the Sleipnir geometry before drawing.');
    const t = Math.max(0, elapsed);
    const { size, paths, groups, ring } = geometry;
    const side = .90 * Math.min(width, height);
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
    ctx.translate((width - side) / 2, (height - side) / 2);
    ctx.scale(side / size, side / size);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const photo = opacity => {
      if (opacity <= 0) return;
      ctx.globalAlpha = opacity;
      ctx.drawImage(image, 0, 0, size, size);
    };
    const reveal = (clip, opacity) => {
      if (opacity <= 0) return;
      ctx.save();
      ctx.clip(clip, 'evenodd');
      photo(opacity);
      ctx.restore();
    };
    const globalPhoto = smooth(2.34, 3.36, t);
    photo(globalPhoto);
    if (globalPhoto === 1) {
      ctx.restore();
      return;
    }
    reveal(ring, smooth(1.15, 2.20, t) * (1 - globalPhoto));
    for (const group of groups.values()) {
      reveal(group.clip, smooth(group.end - .13, group.end + .49, t) * (1 - globalPhoto));
    }
    const styles = {
      guide: ['#8396a8', .53 * (1 - smooth(1.72, 2.84, t))],
      horse: ['#c9d4df', .92 * (1 - smooth(2.52, 3.32, t))],
      ring: ['#b9c9d6', .86 * (1 - smooth(2.35, 3.22, t))],
    };
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (const path of paths) {
      const p = smooth(path.start, path.end, t);
      const [color, alpha] = styles[path.role];
      if (!p || !alpha) continue;
      ctx.lineWidth = path.width;
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.stroke(span(path, 0, p));
      if (path.role !== 'guide' && p > .012 && p < .988) {
        ctx.lineWidth = path.width * 1.25;
        ctx.globalAlpha = alpha * .82;
        ctx.strokeStyle = '#e7edf2';
        ctx.stroke(span(path, Math.max(0, p - .025), p));
      }
    }
    ctx.restore();
  }
  window.SleipnirLaunch = Object.freeze({ duration, background, setGeometry, draw });
})();
