/* Continuous local-axis rotation for the four Raven glass shapes.
   Defaults match _RvOptionPainter: Y spin, followed by the existing X tilt. */
(function (root) {
  'use strict';
  const D = Math.PI / 180, TAU = Math.PI * 2;
  const finite = (v, fallback) => Number.isFinite(Number(v)) ? Number(v) : fallback;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function axis(p) {
    const known = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
    if (p.axis !== 'custom') return known[p.axis] || known.y;
    const a = [finite(p.axisX, 0), finite(p.axisY, 1), finite(p.axisZ, 0)];
    const length = Math.hypot(...a);
    return length > 1e-8 ? a.map(v => v / length) : known.y;
  }
  function quaternion(a, angle) {
    const s = Math.sin(angle / 2);
    return [a[0] * s, a[1] * s, a[2] * s, Math.cos(angle / 2)];
  }
  function multiply(a, b) {
    const [x, y, z, w] = a, [X, Y, Z, W] = b;
    return [w*X+x*W+y*Z-z*Y, w*Y-x*Z+y*W+z*X, w*Z+x*Y-y*X+z*W, w*W-x*X-y*Y-z*Z];
  }
  function target(p) {
    const rate = p.spinOn === false ? 0 : TAU / clamp(finite(p.period, 22), .1, 2400) * (Number(p.dir) < 0 ? -1 : 1);
    return axis(p).map(v => v * rate);
  }
  function create(p) {
    return { q: quaternion(axis(p), finite(p.start, 0) * D), velocity: target(p) };
  }
  function advance(state, p, dt) {
    dt = clamp(finite(dt, 0), 0, .08);
    if (!dt) return;
    if (p.spinOn === false) { state.velocity = [0, 0, 0]; return; }
    const next = target(p), response = clamp(finite(p.response, .18), 0, 3);
    // Integrate the exponential response analytically, so different frame rates
    // yield the same speed transition. Changing axes never resets orientation.
    const decay = response > 0 ? Math.exp(-dt / response) : 0;
    const delta = next.map((v, i) => v * dt + (response > 0 ? (state.velocity[i] - v) * response * (1 - decay) : 0));
    state.velocity = next.map((v, i) => v + (state.velocity[i] - v) * decay);
    const angle = Math.hypot(...delta);
    if (angle > 1e-12) {
      state.q = multiply(state.q, quaternion(delta.map(v => v / angle), angle));
      const length = Math.hypot(...state.q);
      state.q = state.q.map(v => v / length);
    }
  }
  function rotate(state, p, v) {
    const [x, y, z, w] = state.q;
    const tx = 2 * (y*v[2] - z*v[1]), ty = 2 * (z*v[0] - x*v[2]), tz = 2 * (x*v[1] - y*v[0]);
    let a = [v[0]+w*tx+y*tz-z*ty, v[1]+w*ty+z*tx-x*tz, v[2]+w*tz+x*ty-y*tx];
    // Static XYZ orientation is separate from ongoing spin; the existing tilt
    // remains the X orientation, with unchanged default and saved key.
    const rz = finite(p.roll, 0)*D, ry = finite(p.yaw, 0)*D, rx = finite(p.tilt, 0)*D;
    const cz = Math.cos(rz), sz = Math.sin(rz), cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx);
    a = [a[0]*cz-a[1]*sz, a[0]*sz+a[1]*cz, a[2]];
    a = [a[0]*cy+a[2]*sy, a[1], a[2]*cy-a[0]*sy];
    return [a[0], a[1]*cx-a[2]*sx, a[1]*sx+a[2]*cx];
  }
  const api = Object.freeze({ create, advance, rotate });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RavenMotion = api;
})(typeof window !== 'undefined' ? window : this);
