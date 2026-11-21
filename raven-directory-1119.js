/* =====================================================================
   RAVEN DIRECTORY — screen module for studio-kit-1119.
   Faithful port of the Raven contact directory in the AsgardRaven custom
   widget (FlutterFlow export 2026-11-19): _RvGeometry, _RvScenePainter
   (_drawLitRunes, _paintBust, _paintName, tabRect), _directoryChrome and
   the _tick scroll physics. Defaults = the Dart / its owner-tuning
   defaults. Busts = the fake test accounts' 3D bust sprites.
   ===================================================================== */
(() => {
'use strict';
const K = window.StudioKit;
const { TAU, D2R, clamp, ease, smooth, rgb, rgba, mix, hsv, WHITE, scaleOf, blur } = K;
let P = {};

/* ---------- test people (the studio's fake test accounts) ---------- */
const DEMO = [['Test Woman', 'I sent you the photo', 1], ['Freya', 'That looks amazing', 1], ['Loki', 'See you tonight?', 0], ['Hel', "I'll be there at six", 1], ['Tyr', 'Training at dawn', 0], ['Sif', 'Hair appointment moved', 0], ['Saga', 'Story time later', 1], ['Eir', 'Feeling better!', 0], ['Skadi', 'Snow trip this weekend?', 0], ['Njord', 'Boat is ready', 0], ['Bragi', 'New song drop', 1], ['Ullr', 'Archery Sunday', 0], ['Vidar', 'On my way', 0], ['Forseti', 'Settled it', 0], ['Gerd', 'Garden looks great', 0]];
const PEOPLE = DEMO.map(([name, msg, unread], i) => { const img = new Image(); img.src = 'busts/' + name.replace(/ /g, '') + '.webp'; return { name, msg, group: i === 0 ? 0 : unread ? 1 : 2, img, frames: 11, minAngle: -25, angleStep: 5 }; });
const NAME_STYLES = [[0, 'Regular'], [1, 'Bold'], [2, 'Italic'], [3, 'Bold italic']];
// studio People list (add / remove test people without Claude): rebuild the Rolodex from it once it loads
if (K.people) K.people.on(() => {
  const list = K.people.list().filter(q => q.bust); if (!list.length) return;
  const order = new Map(DEMO.map(([n], i) => [n, i])), msgs = new Map(DEMO.map(([n, m, u]) => [n, [m, u]]));
  list.sort((a, b) => (order.has(a.name) ? order.get(a.name) : 999) - (order.has(b.name) ? order.get(b.name) : 999) || a.name.localeCompare(b.name));
  const next = list.map((q, i) => { const old = PEOPLE.find(o => o.name === q.name && o.img && o.img.src && o.img.src.includes(String(q.bust).split('?')[0])); const img = old ? old.img : new Image(); if (!old) { img.crossOrigin = 'anonymous'; img.src = q.bust; }
    const [msg, unread] = msgs.get(q.name) || ['', 0]; return { name: q.name, msg, group: i === 0 ? 0 : unread ? 1 : 2, img, frames: q.bustFrames || 11, minAngle: -25, angleStep: 5 }; });
  PEOPLE.splice(0, PEOPLE.length, ...next);
});

/* ---------- state ---------- */
const ST = { scroll: 0, entry: 0, velocity: 0, settle: null, dragging: false, spinPhase: 0, time: 0, down: null, lastY: 0, lastT: 0, vy: 0, moved: 0 };
let G = { items: [], tabs: [], names: [] };


/* ---------- YOUR SPHERE (SphereGL from your studio, with your saved settings) ---------- */
class SphereGL {
  constructor() {
    const c = this.c = document.createElement('canvas'); const gl = this.gl = c.getContext('webgl2', { premultipliedAlpha: true, alpha: true }); if (!gl) return;
    const vs = `#version 300 es
in vec2 a; out vec2 v; void main(){ v=a; gl_Position=vec4(a,0.,1.); }`;
    const fs = `#version 300 es
precision highp float; in vec2 v; out vec4 o;
uniform sampler2D T; uniform float uSpin, uTilt, uRepeat, uAmb, uTint, uRim, uLimb, uBody; uniform vec3 uTintC, uRimC; uniform vec4 uTop; uniform vec3 uTopC;
uniform vec3 uEnvC,uEnvD; uniform float uEnvDiffuse;
void main(){
  vec2 p = vec2(v.x, -v.y); float r2 = dot(p,p); if(r2>1.){ o=vec4(0); return; }
  vec3 n = vec3(p.x, -p.y, sqrt(1.-r2));
  float ct=cos(uTilt), st=sin(uTilt); vec3 q = vec3(n.x*ct + n.y*st, -n.x*st + n.y*ct, n.z);
  float lon = atan(q.x, q.z) + uSpin; float lat = asin(clamp(q.y,-1.,1.));
  vec2 uv = vec2(lon/6.2831853, 0.5 - lat/3.1415926) * vec2(uRepeat*2., uRepeat);
  vec3 tex = texture(T, fract(uv)).rgb;
  if(uTint > 0.5){ float l = dot(tex, vec3(.3,.59,.11)); tex = uTintC * l * 1.6; }
  vec3 light = vec3(uAmb);
  { vec3 ld = normalize(vec3(uTop.w, 1., uTop.z)); float t = max(dot(n, ld), 0.); light += uTopC * pow(t, uTop.y) * uTop.x; }
  light += uEnvC * max(dot(n,uEnvD),0.) * uEnvDiffuse;
  float limb = mix(1., pow(n.z, .6), uLimb);
  vec3 col = tex * light * limb;
  float rim = pow(1.-n.z, 3.) * uRim; col += uRimC * rim;
  float edge = smoothstep(1., .985, sqrt(r2));
  float al = clamp(max(uBody, max(col.r, max(col.g, col.b))), 0., 1.) * edge;
  o = vec4(col*edge, al);
}`;
    const sh = (t, src) => { const o = gl.createShader(t); gl.shaderSource(o, src); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    const pr = this.p = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr); gl.useProgram(pr);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const l = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 2, gl.FLOAT, false, 0, 0);
    this.u = {}; for (const k of ['T', 'uSpin', 'uTilt', 'uRepeat', 'uAmb', 'uTint', 'uRim', 'uLimb', 'uBody', 'uTintC', 'uRimC', 'uTop', 'uTopC','uEnvC','uEnvD','uEnvDiffuse']) this.u[k] = gl.getUniformLocation(pr, k);
    this.t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  }
  setTexture(img) { const gl = this.gl; if (!gl || img === this.img) return; this.img = img; gl.bindTexture(gl.TEXTURE_2D, this.t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); gl.generateMipmap(gl.TEXTURE_2D); }
  render(sizePx, time) {
    const gl = this.gl; if (!gl) return null; const n = Math.max(2, Math.round(sizePx)); if (this.c.width !== n) { this.c.width = n; this.c.height = n; }
    gl.viewport(0, 0, n, n); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.useProgram(this.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.t); gl.uniform1i(this.u.T, 0);
    const h3 = c => { const v = rgb(c); return [v[0] / 255, v[1] / 255, v[2] / 255]; };
    gl.uniform1f(this.u.uSpin, time * P['sb.spin'] * .6); gl.uniform1f(this.u.uTilt, P['sb.tilt'] * D2R); gl.uniform1f(this.u.uRepeat, P['sb.repeat']); gl.uniform1f(this.u.uAmb, P['sb.ambient']);
    gl.uniform1f(this.u.uTint, P['sb.tint'] ? 1 : 0); gl.uniform3fv(this.u.uTintC, h3(P['sb.tintColor'])); gl.uniform1f(this.u.uRim, P['sb.rimLight']); gl.uniform3fv(this.u.uRimC, h3(P['sb.rim'])); gl.uniform1f(this.u.uLimb, P['sb.limb']); gl.uniform1f(this.u.uBody, P['sb.body']);
    gl.uniform4f(this.u.uTop, P['sb.topOn']===false?0:P['sb.topLight'], P['sb.topSharp'], P['sb.topToward'], P['sb.topSide']); gl.uniform3fv(this.u.uTopC, h3(P['sb.topColor']));
    const env=window.RavenEnvironment.frame(P,time);gl.uniform3fv(this.u.uEnvC,env.color);gl.uniform3fv(this.u.uEnvD,env.direction);gl.uniform1f(this.u.uEnvDiffuse,P['env.on']?P['env.diffuse']:0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); return this.c;
  }
}
const SPH_TEX = { red: (() => { const i = new Image(); i.src = 'ui/sphere_red.jpg'; return i; })(), teal: (() => { const i = new Image(); i.src = 'ui/sphere_teal.jpg'; return i; })() };
let SPH = null;
function drawSphereBody(ctx, g) {
  if (!P['sb.on']) return; if (!SPH) { try { SPH = new SphereGL(); } catch (e) { console.warn(e); SPH = { render: () => null, setTexture() {} }; } }
  const tex = SPH_TEX[P['sb.texture']] || SPH_TEX.red; if (tex.complete && tex.naturalWidth) SPH.setTexture(tex);
  const cv = SPH.render(2 * g.radius * Math.min(2.5, scaleOf(ctx)), ST.time); if (cv) ctx.drawImage(cv, g.cx - g.radius, g.cy - g.radius, g.radius * 2, g.radius * 2);
  else if(P['sb.body']>0){ctx.save();ctx.fillStyle=rgba('#000000',P['sb.body']);ctx.beginPath();ctx.arc(g.cx,g.cy,g.radius,0,TAU);ctx.fill();ctx.restore();}
  window.RavenEnvironment.sphereOverlay(ctx,g,P,ST.time,!cv);
}

/* ---------- STREAMER BLACK HOLES UP TOP (_RvCosmicHeader, sphere view) bending the see-through background ---------- */
const HOLE_ART = [0, 1].map(i => { const im = new Image(); im.src = 'raven/hole' + i + '.webp'; return im; });
const LIVE = ['Baldr', 'Saga', 'Tyr', 'Vidar', 'Sif', 'Idun', 'Skadi', 'Loki', 'Ullr', 'Eir', 'Freya', 'Bragi'];
const DEMO_SECONDS = 20;
const winF = (t, a, b, f) => smooth((t - a) / f) * (1 - smooth((t - b + f) / f));
function periodic(pts, phase) { const q = (((phase % 1) + 1) % 1) * pts.length, i = Math.floor(q), u = q - i, p = j => pts[((j % pts.length) + pts.length) % pts.length], a = p(i - 1), b = p(i), c = p(i + 1), d = p(i + 2); return [0, 1].map(k => (b[k] * 2 + (c[k] - a[k]) * u + (a[k] * 2 - b[k] * 5 + c[k] * 4 - d[k]) * u * u + (-a[k] + b[k] * 3 - c[k] * 3 + d[k]) * u * u * u) * .5); }
function holePoses(W, H, g, seconds) {
  const t = seconds % DEMO_SECONDS, bottom = g.cy - g.radius, top = Math.max(P['hh.top'] + 44, 65), low = Math.max(top + 70, bottom - 38), scale = clamp(W / 390, .7, 1.3) * P['hh.size'];
  const project = q => [q[0] * W, top + q[1] * (low - top)], travel = seconds / 160 * P['hh.speed'];
  const primary = project([.48 + .065 * Math.sin(seconds * .045), .94 + .04 * Math.sin(TAU * (seconds - 5) / 20)]);
  const angle = TAU * seconds / 40, ecc = .22; let E = angle; for (let j = 0; j < 5; j++) E -= (E - ecc * Math.sin(E) - angle) / (1 - ecc * Math.cos(E));
  const sep = P['hh.pairGap'] * scale, orbit = [(Math.cos(E) - ecc) * sep, Math.sin(E) * sep * .75];
  const large = [primary[0] - orbit[0] * .13, primary[1] - orbit[1] * .13], small = [primary[0] + orbit[0] * .87, primary[1] + orbit[1] * .87];
  const sling = project(periodic([[.85, .13], [.73, .27], [.55, .78], [.20, .91], [.12, .48], [.31, .25], [.68, .40], [.84, .65]], travel));
  const fling = winF(t, 16, 20, 1.5), fly = [W * .50 + g.radius * .78 + 4 * Math.sin(seconds * .13), g.cy - g.radius * .66 + fling * 9];
  const name = i => i < LIVE.length ? LIVE[i] : '';
  const out = [{ name: name(0), c: large, r: 22 * scale, kind: 1 }, { name: name(1), c: small, r: 11 * scale, kind: 0 }, { name: name(2), c: sling, r: 30 * scale, kind: 0 }, { name: name(3), c: fly, r: 9 * scale, kind: 1, behind: t > 16 && t < 20 }];
  const more = Math.round(P['hh.extra']);
  for (let i = 4; i < Math.min(LIVE.length, 4 + more); i++) { const q = TAU * (seconds / 180 + i * .137); out.push({ name: LIVE[i], c: [W * (.5 + .60 * Math.cos(q)), top + (low - top) * (.22 + .12 * Math.sin(q * 2))], r: (12 + (i % 3) * 4) * scale, kind: i % 2 }); }
  const excess = Math.max(out[0].c[1] - (bottom - out[0].r - 34), out[1].c[1] - (bottom - out[1].r - 34)), shift = (excess + Math.sqrt(excess * excess + 36)) * .5;
  out[0].c = [out[0].c[0], out[0].c[1] - shift]; out[1].c = [out[1].c[0], out[1].c[1] - shift];
  return out;
}
const HPR = 2; let hgl = null, hglc = null, hprog = null, htex = null, hbad = false, hsnap = null;
function holeLens(W, H, holes) {
  if (hbad) return null;
  if (!hgl) { hglc = document.createElement('canvas'); hgl = hglc.getContext('webgl', { premultipliedAlpha: true, alpha: true }); if (!hgl) { hbad = true; return null; }
    const vs = 'attribute vec2 p;varying vec2 v;void main(){v=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}';
    const fs = `precision highp float;varying vec2 v;uniform sampler2D sky;uniform vec2 size;uniform int n;uniform vec4 L[12];uniform float reach,ein;
    void main(){vec2 q=v*size;vec4 col=vec4(0.);
    for(int i=0;i<12;i++){if(i>=n)break;vec2 c=L[i].xy;float r=L[i].z;if(r<2.)continue;vec2 d=q-c;float rho=length(d);float ro=r*reach;
     if(rho>=r*.92&&rho<=ro){float u=(rho-r)/(ro-r);float fade=1.-clamp(u,0.,1.)*clamp(u,0.,1.)*(3.-2.*clamp(u,0.,1.));float e=r*ein*L[i].w;float beta=rho-(e*e/max(rho,1.))*fade;
      vec2 s=c+normalize(d)*beta;vec2 uv=s/size;uv=1.-abs(1.-mod(uv,2.));col=vec4(texture2D(sky,uv).rgb,1.);}}
    gl_FragColor=col;}`;
    const sh = (t, src) => { const s = hgl.createShader(t); hgl.shaderSource(s, src); hgl.compileShader(s); if (!hgl.getShaderParameter(s, hgl.COMPILE_STATUS)) throw new Error(hgl.getShaderInfoLog(s)); return s; };
    try { hprog = hgl.createProgram(); hgl.attachShader(hprog, sh(hgl.VERTEX_SHADER, vs)); hgl.attachShader(hprog, sh(hgl.FRAGMENT_SHADER, fs)); hgl.linkProgram(hprog); hgl.useProgram(hprog); } catch (e) { console.warn(e); hbad = true; return null; }
    const b = hgl.createBuffer(); hgl.bindBuffer(hgl.ARRAY_BUFFER, b); hgl.bufferData(hgl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), hgl.STATIC_DRAW); const loc = hgl.getAttribLocation(hprog, 'p'); hgl.enableVertexAttribArray(loc); hgl.vertexAttribPointer(loc, 2, hgl.FLOAT, false, 0, 0);
    htex = hgl.createTexture(); hgl.bindTexture(hgl.TEXTURE_2D, htex); [hgl.TEXTURE_MIN_FILTER, hgl.TEXTURE_MAG_FILTER].forEach(k => hgl.texParameteri(hgl.TEXTURE_2D, k, hgl.LINEAR)); [hgl.TEXTURE_WRAP_S, hgl.TEXTURE_WRAP_T].forEach(k => hgl.texParameteri(hgl.TEXTURE_2D, k, hgl.CLAMP_TO_EDGE));
    hsnap = document.createElement('canvas'); }
  const SW = Math.round(W * HPR / 2), SH = Math.round(H * HPR / 2); if (hsnap.width !== SW || hsnap.height !== SH) { hsnap.width = SW; hsnap.height = SH; }
  const sx = hsnap.getContext('2d'); sx.setTransform(SW / W, 0, 0, SH / H, 0, 0); sx.filter = 'none'; K.drawBackground(sx, P);
  const CW = Math.round(W * HPR), CH = Math.round(H * HPR); if (hglc.width !== CW || hglc.height !== CH) { hglc.width = CW; hglc.height = CH; }
  hgl.viewport(0, 0, CW, CH); hgl.clearColor(0, 0, 0, 0); hgl.clear(hgl.COLOR_BUFFER_BIT); hgl.useProgram(hprog);
  hgl.bindTexture(hgl.TEXTURE_2D, htex); hgl.texImage2D(hgl.TEXTURE_2D, 0, hgl.RGBA, hgl.RGBA, hgl.UNSIGNED_BYTE, hsnap);
  const arr = new Float32Array(48); const hs = holes.slice(0, 12); hs.forEach((h, i) => arr.set([h.c[0], h.c[1], h.r, h.s || 1], i * 4));
  hgl.uniform4fv(hgl.getUniformLocation(hprog, 'L'), arr); hgl.uniform1i(hgl.getUniformLocation(hprog, 'n'), hs.length); hgl.uniform2f(hgl.getUniformLocation(hprog, 'size'), W, H);
  hgl.uniform1f(hgl.getUniformLocation(hprog, 'reach'), P['hh.reach']); hgl.uniform1f(hgl.getUniformLocation(hprog, 'ein'), P['hh.bend']);
  hgl.drawArrays(hgl.TRIANGLE_STRIP, 0, 4); return hglc;
}
function drawHoles(ctx, g) {
  if (!P['hh.on']) { G.holes = []; return; }
  if (P['hh.source'] === 'saved') { G.holes = window.RavenSavedTiers.draw(ctx, P, g, ST.time); return; }
  const W = K.W, H = K.H, seconds = ST.time, t = seconds % DEMO_SECONDS, holes = holePoses(W, H, g, seconds).filter(h => h.c[0] > -100 && h.c[0] < W + 100); G.holes = holes;
  const outsideSphere = () => { ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(g.cx, g.cy, g.radius, 0, TAU, true); ctx.clip('evenodd'); };
  if (P['hh.lens'] && P['bg.mode'] !== 'plain') { const out = holeLens(W, H, holes); if (out) { ctx.save(); outsideSphere(); ctx.drawImage(out, 0, 0, W, H); ctx.restore(); } }
  // space ripples from the pair (10–16 s), outside the sphere
  if (P['hh.ripples'] && holes.length >= 2 && t >= 10 && t < 16) { const o = [(holes[0].c[0] + holes[1].c[0]) / 2, (holes[0].c[1] + holes[1].c[1]) / 2]; ctx.save(); outsideSphere();
    for (let j = 0; j < 3; j++) { const age = t - 10 - j * .65; if (age < 0) continue; const r = age * 58 + 8, a = smooth(age / .25) * clamp(1 - age / 6, 0, 1) * .5; ctx.beginPath(); for (let k = 0; k <= 120; k++) { const an = TAU * k / 120, wb = 1 + .025 * Math.sin(an * 4 - t * 2), x = o[0] + Math.cos(an) * r * wb, y = o[1] + Math.sin(an) * r * .7 * wb; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.save(); ctx.filter = `blur(${(4 * scaleOf(ctx)).toFixed(1)}px)`; ctx.lineWidth = 5; ctx.strokeStyle = `rgba(113,200,244,${a * .22})`; ctx.stroke(); ctx.restore(); ctx.lineWidth = .8; ctx.strokeStyle = `rgba(179,232,255,${a})`; ctx.stroke(); }
    ctx.restore(); }
  // the bridge of light between the pair (7–15 s)
  if (P['hh.bridge'] && holes.length >= 2) { const op = winF(t, 7, 15, 2); if (op > 0) { const a = holes[0], b = holes[1], dx = b.c[0] - a.c[0], dy = b.c[1] - a.c[1], d = Math.hypot(dx, dy) || 1, ax = dx / d, ay = dy / d, nx = -ay, ny = ax, st = [a.c[0] + ax * a.r * .95, a.c[1] + ay * a.r * .95], en = [b.c[0] - ax * b.r * .95, b.c[1] - ay * b.r * .95], m = [(st[0] + en[0]) / 2 + nx * Math.sin(t * 2) * 5, (st[1] + en[1]) / 2 + ny * Math.sin(t * 2) * 5], col = mix('#FFCB80', '#94E8FF', .55);
    for (const w of [9, 3, .85]) { ctx.save(); ctx.lineCap = 'round'; ctx.filter = `blur(${((w > 5 ? 5 : .5) * scaleOf(ctx)).toFixed(1)}px)`; ctx.lineWidth = w; ctx.strokeStyle = rgba(col, op * (w > 5 ? .12 : w > 1 ? .35 : .9)); ctx.beginPath(); ctx.moveTo(st[0], st[1]); ctx.quadraticCurveTo(m[0], m[1], en[0], en[1]); ctx.stroke(); ctx.restore(); } } }
  for (const h of holes) {
    const im = HOLE_ART[h.kind]; ctx.save(); if (h.behind) outsideSphere();
    if (im.complete && im.naturalWidth) { const w = h.r * (h.kind === 0 ? 3.78 : 7.0), hh = w * im.naturalHeight / im.naturalWidth; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(h.c[0], h.c[1], h.r * .92, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'screen'; ctx.drawImage(im, h.c[0] - w / 2, h.c[1] - hh / 2, w, hh); }
    ctx.restore();
  }
  if (P['hh.names']) { ctx.font = `500 ${P['hh.nameSize']}px Roboto`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; for (const h of holes) { if (!h.name || h.behind) continue; ctx.save(); ctx.shadowColor = '#000'; ctx.shadowBlur = K.shadowBlurFor(ctx, 5); ctx.fillStyle = P['hh.nameColor']; ctx.fillText(h.name, h.c[0], h.c[1] + h.r + 13); ctx.restore(); } }
}

/* ---------- geometry (_RvGeometry) ---------- */
function geometry() {
  const W = K.W, H = K.H;
  const base = Math.min(H * P['sphere.heightFrac'], W * P['sphere.widthFrac'] / 2);
  const radius = base * P['sphere.size'] * P['sphere.scale'];
  const cx = W * P['sphere.x'];
  const cy = Math.min(H * P['sphere.maxY'], H - P['sphere.bottomGap'] - 0 - base * 1.25) + H * P['sphere.height'];
  return { W, H, radius, cx, cy };
}
function pathPoint(g,t) {
  const a=P['path.curve']*t,sn=Math.sin(a),cs=Math.cos(a),px=g.radius*P['path.radius']*(-P['path.bulge']*cs+P['path.lean']*sn+P['path.flare']*Math.pow(Math.abs(sn),4))*(P['path.mirror']?-1:1),py=-g.radius*P['path.radius']*sn,angle=P['path.rotate']*D2R;
  return {x:g.cx+px*Math.cos(angle)-py*Math.sin(angle)+P['path.offsetX'],y:g.cy+px*Math.sin(angle)+py*Math.cos(angle)+P['path.offsetY']};
}
function place(g, people, scroll) {
  if (!people.length) return [];
  const out = [], middle = Math.floor(scroll), step = P['path.step'], limit = P['path.limit'];
  for (let i = Math.max(0, middle - 1); i < Math.min(people.length, middle + Math.round(P['path.count']) - 1); i++) {
    const t = P['path.start'] - (i - scroll) * step;
    if (Math.abs(t) > limit) continue;
    const u = clamp(Math.abs(t) / limit, 0, 1);
    const theta = P['path.curve'] * t, sn = Math.sin(theta), cs = Math.cos(theta);
    const {x,y}=pathPoint(g,t);
    const depth = clamp(cs, 0, 1);
    const scale = clamp(1 - P['bust.shrink'] * Math.pow(u, P['bust.shrinkCurve']), P['bust.min'], 1);
    out.push({ person: people[i], index: i, t, cx: x, cy: y, width: g.radius * P['bust.width'] * scale, depth, yaw: clamp(-P['bust.yaw'] * t / limit, -P['bust.yaw'], P['bust.yaw']), tip: -P['bust.tip'] * Math.sign(t) * Math.pow(u, 2) });
  }
  out.sort((a, b) => a.depth - b.depth);
  return out;
}
const occlusion = it => clamp((Math.abs(it.t) - P['occl.start']) / P['occl.range'], 0, 1);
const covered = it => Math.max(occlusion(it), 1 - smooth((P['names.fadeAt'] - Math.abs(it.t)) / P['names.fadeRange']));
const nameInk = () => P['names.white'] ? WHITE : hsv(P['names.hue'], .65, 1);
const msgInk = () => P['tabs.textWhite'] ? WHITE : hsv(P['tabs.textHue'], .65, 1);
const tabInk = () => hsv(P['tabs.hue'], .65, 1);
const sphereInk = () => P['sphere.white'] ? WHITE : hsv(P['sphere.hue'], .65, 1);
function fontFor(style, size) { return `${style >= 2 ? 'italic ' : ''}${style % 2 ? 700 : 400} ${size}px Roboto`; }
let measureCtx = document.createElement('canvas').getContext('2d');
function nameText(it) { return it.person.name.trim().split(/\s+/)[0]; }
function nameWidth(it) { measureCtx.font = fontFor(P['names.style'], P['names.size']); return measureCtx.measureText(nameText(it)).width; }
function tether(g) { return Math.max(P['tether.min'], P['tether.base'] + (g.W * .27 - g.W * P['tabs.width']) * .5); }
function tabRect(g, it) {
  const width = g.W * P['tabs.width'];
  const height = Math.max(P['tabs.height'], P['tabs.textSize'] * 1.25 + 12);
  const desired = it.cx + it.width * .5 + P['names.gap'] + nameWidth(it) + tether(g);
  const left = Math.min(desired, g.W - width - P['tabs.margin']);
  return { x: left, y: it.cy - height / 2, w: width, h: height };
}

/* ---------- WebGL sphere (_drawLitRunes) ---------- */
const GL = { ok: false, canvas: document.createElement('canvas'), tex: null, img: new Image(), ready: false };
GL.img.onload = () => { GL.ready = true; if (GL.gl) uploadTexture(); };
GL.img.src = 'raven/runes.webp';
const MAXL = 30;
(function initGL() {
  const c = GL.canvas; c.width = c.height = 512;
  const gl = c.getContext('webgl', { premultipliedAlpha: true, alpha: true, preserveDrawingBuffer: true });
  if (!gl) return; GL.gl = gl;
  const vs = `attribute vec2 a; varying vec2 v; void main(){ v=vec2(a.x,-a.y); gl_Position=vec4(a,0.,1.); }`;
  const fs = `precision highp float; varying vec2 v; uniform sampler2D T; uniform float uSpin,uTilt,uEdge,uMax,uCap,uHasTex; uniform vec3 uBase,uInk; uniform vec2 uReach; uniform vec4 uL[${MAXL}]; uniform int uN;
  void main(){ vec2 p=v; float r2=dot(p,p); if(r2>1.) discard; float nx=p.x, ny=p.y, nz=sqrt(max(0.,1.-r2)); float tab=0.;
    for(int i=0;i<${MAXL};i++){ if(i>=uN) break; vec4 L=uL[i]; float dx=nx-L.x, dy=ny-L.y; tab+=L.w*exp(-(dx*dx/uReach.x+dy*dy/uReach.y))*nz; }
    tab=clamp(tab,0.,uCap); float e=clamp(nz/uEdge,0.,1.); float a=clamp(tab,0.,uMax)*e*e*(3.-2.*e);
    float c=cos(uTilt), s=sin(uTilt); float rx=nx*c+ny*s, ry=-nx*s+ny*c;
    vec2 uv=vec2(fract(.5+atan(rx,nz)/6.2831853-uSpin), clamp(.5+asin(clamp(ry,-1.,1.))/3.14159265,0.,1.));
    vec3 tex=uHasTex>.5?texture2D(T,uv).rgb:vec3(.8,.5,.2); vec3 ink=mix(uBase,uInk,clamp(tab/.25,0.,1.));
    gl_FragColor=vec4(tex*ink*a,a); }`;
  const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); return null; } return s; };
  const p = gl.createProgram(); const a = sh(gl.VERTEX_SHADER, vs), b = sh(gl.FRAGMENT_SHADER, fs); if (!a || !b) return;
  gl.attachShader(p, a); gl.attachShader(p, b); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return;
  gl.useProgram(p); GL.p = p;
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(p, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  GL.u = {}; ['T', 'uSpin', 'uTilt', 'uEdge', 'uMax', 'uCap', 'uHasTex', 'uBase', 'uInk', 'uReach', 'uL', 'uN'].forEach(n => GL.u[n] = gl.getUniformLocation(p, n));
  GL.ok = true; if (GL.ready) uploadTexture();
})();
function uploadTexture() { const gl = GL.gl; GL.tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, GL.tex); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, GL.img); }
function renderSphere(g, lamps) {
  if (!GL.ok || !P['sphere.on']) return false;
  const gl = GL.gl, u = GL.u;
  gl.viewport(0, 0, 512, 512); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.uniform1f(u.uSpin, ST.spinPhase); gl.uniform1f(u.uTilt, P['sphere.tilt'] * D2R); gl.uniform1f(u.uEdge, Math.max(.001, P['sphere.edgeFade']));
  gl.uniform1f(u.uMax, P['sphere.maxLight']); gl.uniform1f(u.uCap, P['light.cap']); gl.uniform1f(u.uHasTex, GL.tex ? 1 : 0);
  const b = rgb(P['sphere.baseInk']).map(x => x / 255), k = sphereInk().map(x => x / 255);
  gl.uniform3f(u.uBase, b[0], b[1], b[2]); gl.uniform3f(u.uInk, k[0], k[1], k[2]);
  gl.uniform2f(u.uReach, Math.max(.001, P['light.reachX']), Math.max(.001, P['light.reachY']));
  const arr = new Float32Array(MAXL * 4); const n = Math.min(MAXL, lamps.length);
  for (let i = 0; i < n; i++) { arr[i * 4] = lamps[i].x; arr[i * 4 + 1] = lamps[i].y; arr[i * 4 + 2] = 0; arr[i * 4 + 3] = lamps[i].p; }
  gl.uniform4fv(u.uL, arr); gl.uniform1i(u.uN, n);
  if (GL.tex) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, GL.tex); gl.uniform1i(u.T, 0); }
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  return true;
}

/* ---------- painters ---------- */
function drawBust(ctx, g, it) {
  const p = it.person, img = p.img, occ = occlusion(it);
  if (!P['busts.on'] || occ >= 1) return;
  const W = it.width;
  if (!img.complete || !img.naturalWidth) {
    const h = W * 1.06, x = it.cx - W / 2, y = it.cy - h / 2;
    ctx.save(); ctx.fillStyle = '#718694';
    ctx.beginPath(); ctx.ellipse(it.cx, y + h * .28, W * .15, h * .18, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x, y + h); ctx.quadraticCurveTo(x + W * .04, y + h * .52, it.cx, y + h * .51); ctx.quadraticCurveTo(x + W - W * .04, y + h * .52, x + W, y + h); ctx.closePath(); ctx.fill(); ctx.restore();
    return;
  }
  const fw = img.naturalWidth / p.frames, fh = img.naturalHeight;
  const frameIdx = clamp(Math.round((it.yaw - p.minAngle) / p.angleStep), 0, p.frames - 1);
  const h = W * fh / fw, dst = { x: it.cx - W / 2, y: it.cy - h / 2, w: W, h };
  const shade = clamp(P['bust.shadeBase'] + (1 - P['bust.shadeBase']) * it.depth, 0, 1);
  ctx.save();
  if (occ > 0) {
    const crestY = dst.y + dst.h + 2 - (dst.h + 4) * occ, maskR = g.radius * P['occl.mask'];
    const offX = clamp(it.cx - g.cx, -maskR * .98, maskR * .98), from = Math.sqrt(maskR * maskR - offX * offX);
    const clip = new Path2D(); clip.rect(dst.x - 12, dst.y - 12, dst.w + 24, dst.h + 24); clip.arc(g.cx, crestY + from, maskR, 0, TAU);
    ctx.clip(clip, 'evenodd');
  }
  ctx.translate(it.cx, it.cy); ctx.rotate(it.tip); ctx.translate(-it.cx, -it.cy);
  // draw into a temp so the bottom fade only darkens the bust (srcATop)
  const tw = Math.max(1, Math.ceil(dst.w * 2)), th = Math.max(1, Math.ceil(dst.h * 2));
  const t = drawBust.tmp || (drawBust.tmp = document.createElement('canvas'));
  if (t.width < tw) t.width = tw; if (t.height < th) t.height = th;
  const tc = t.getContext('2d'); tc.setTransform(1, 0, 0, 1, 0, 0); tc.clearRect(0, 0, t.width, t.height);
  tc.filter = `brightness(${shade})`; tc.drawImage(img, frameIdx * fw, 0, fw, fh, 0, 0, tw, th); tc.filter = 'none';
  tc.globalCompositeOperation = 'source-atop';
  const gr = tc.createLinearGradient(0, 0, 0, th); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(clamp(P['bust.baseFade'], 0, 1), 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
  tc.fillStyle = gr; tc.fillRect(0, 0, tw, th); tc.globalCompositeOperation = 'source-over';
  ctx.drawImage(t, 0, 0, tw, th, dst.x, dst.y, dst.w, dst.h);
  ctx.restore();
  G.busts.push({ it, x: dst.x, y: dst.y, w: dst.w, h: dst.h });
}
function drawName(ctx, g, it) {
  const cov = covered(it); if (cov >= P['names.hideAt']) return;
  const r = tabRect(g, it), tl = tether(g), nw = nameWidth(it), ink = nameInk(), cyan = tabInk(), glow = P['tabs.glow'];
  const tint = clamp([P['tabs.tintNew'], P['tabs.tintUnread'], P['tabs.tintRead']][it.person.group] * (P['tabs.tintFloor'] + (1 - P['tabs.tintFloor']) * glow), 0, .78);
  const nameLeft = r.x - tl - nw;
  ctx.save(); ctx.globalAlpha = 1 - cov;
  if (P['names.on']) {
    ctx.font = fontFor(P['names.style'], P['names.size']); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const k = scaleOf(ctx);
    ctx.save(); ctx.shadowColor = rgba(ink, P['names.glow2']); ctx.shadowBlur = K.shadowBlurFor(ctx, P['names.glow2Blur']); ctx.fillStyle = rgba(ink, 1); ctx.fillText(nameText(it), nameLeft, it.cy); ctx.restore();
    ctx.save(); ctx.shadowColor = rgba(ink, P['names.glow1']); ctx.shadowBlur = K.shadowBlurFor(ctx, P['names.glow1Blur']); ctx.fillStyle = rgba(ink, 1); ctx.fillText(nameText(it), nameLeft, it.cy); ctx.restore();
    G.names.push({ x: nameLeft, y: it.cy - P['names.size'] * .6, w: nw, h: P['names.size'] * 1.2, it });
  }
  if (P['tether.on']) {
    const s = { x: r.x - tl + P['tether.inset'], y: it.cy }, e = { x: r.x, y: it.cy };
    ctx.save(); ctx.lineWidth = P['tether.glowWidth']; ctx.strokeStyle = rgba(cyan, P['tether.glowOpacity']); blur(ctx, P['tether.glowBlur']); ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y); ctx.stroke(); ctx.restore();
    ctx.lineWidth = P['tether.width']; ctx.strokeStyle = rgba(cyan, 1); ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y); ctx.stroke();
    ctx.fillStyle = rgba(mix(cyan, WHITE, .45), 1); ctx.beginPath(); ctx.arc(s.x, s.y, P['tether.dot'], 0, TAU); ctx.fill();
    G.tethers.push({ x: s.x, y: s.y - 4, w: e.x - s.x, h: 8 });
  }
  if (P['tabs.on']) {
    if (!P['tabs.outlineOnly']) {
      ctx.save(); ctx.fillStyle = rgba(cyan, clamp(P['tabs.fillGlow'] * glow, 0, .54)); blur(ctx, P['tabs.fillGlowBlur']); ctx.fillRect(r.x, r.y, r.w, r.h); ctx.restore();
      ctx.fillStyle = rgba('#000000', P['tabs.dark']); ctx.fillRect(r.x, r.y, r.w, r.h);
      const v75 = hsv(P['tabs.hue'], .65, .75), gr = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
      gr.addColorStop(0, rgba(cyan, tint)); gr.addColorStop(.55, rgba(v75, tint * .45)); gr.addColorStop(1, rgba(cyan, tint * .20)); ctx.fillStyle = gr; ctx.fillRect(r.x, r.y, r.w, r.h);
    }
    ctx.save(); ctx.lineWidth = P['tabs.edgeGlowWidth']; ctx.strokeStyle = rgba(cyan, clamp(P['tabs.edgeGlow'] * glow, 0, .75)); blur(ctx, P['tabs.edgeGlowBlur']); ctx.strokeRect(r.x, r.y, r.w, r.h); ctx.restore();
    ctx.lineWidth = P['tabs.edgeWidth']; ctx.strokeStyle = rgba(cyan, 1); ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.lineWidth = P['tabs.topLineWidth']; ctx.strokeStyle = rgba(mix(cyan, WHITE, .65), P['tabs.topLine']); ctx.beginPath(); ctx.moveTo(r.x + 1, r.y + 1); ctx.lineTo(r.x + r.w - 1, r.y + 1); ctx.stroke();
    // preview text (one line, ellipsis)
    const mi = msgInk(); ctx.font = fontFor(P['tabs.textStyle'], P['tabs.textSize']); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    let txt = (it.person.msg || P['tabs.empty']).replace(/\s+/g, ' ').trim(); const maxW = r.w - P['tabs.pad'] * 2;
    if (ctx.measureText(txt).width > maxW) { while (txt.length && ctx.measureText(txt + '…').width > maxW) txt = txt.slice(0, -1); txt += '…'; }
    ctx.save(); ctx.shadowColor = rgba(mi, clamp(P['tabs.textGlow'] * glow, 0, .9)); ctx.shadowBlur = K.shadowBlurFor(ctx, P['tabs.textGlowBlur']); ctx.fillStyle = rgba(mi, 1); ctx.fillText(txt, r.x + P['tabs.pad'], r.y + r.h / 2); ctx.restore();
    G.tabs.push(Object.assign({ it }, r));
  }
  ctx.restore();
}
const ICON_BACK = new Path2D('M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z');
const ICON_REFRESH = new Path2D('M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z');
function drawChrome(ctx, g, people) {
  const W = K.W, H = K.H;
  if (P['owner.on']) {
    const top = 8, h = Math.max(105, Math.max(P['header.min'], H * P['header.top']) - 22) - 8;
    ctx.fillStyle = '#000'; ctx.fillRect(12, top, W - 24, h); ctx.strokeStyle = 'rgba(112,242,255,.35)'; ctx.lineWidth = 1; ctx.strokeRect(12.5, top + .5, W - 25, h - 1);
    ctx.fillStyle = '#70F2FF'; ctx.font = '400 12px Roboto'; ctx.textBaseline = 'top'; ctx.fillText('Owner tuning area (in the app, only the owner sees sliders here)', 24, top + 10);
    G.owner = { x: 12, y: top, w: W - 24, h };
  } else G.owner = null;
  if (!P['header.on']) { G.header = null; return; }
  const top = Math.max(P['header.min'], H * P['header.top']), side = P['header.side'], rowH = 48;
  G.header = { x: side, y: top, w: W - side * 2, h: rowH };
  const ic = P['header.iconColor'];
  ctx.save(); ctx.translate(side + 12, top + 12); ctx.fillStyle = ic; ctx.fill(ICON_BACK); ctx.restore();
  G.back = { x: side, y: top, w: 48, h: 48 };
  if (P['header.refresh']) { ctx.save(); ctx.translate(W - side - 36, top + 12); ctx.fillStyle = ic; ctx.fill(ICON_REFRESH); ctx.restore(); G.refresh = { x: W - side - 48, y: top, w: 48, h: 48 }; } else G.refresh = null;
  const i = clamp(Math.round(ST.scroll), 0, Math.max(0, people.length - 1)), group = people.length ? people[i].group : 0;
  ctx.font = `400 ${P['header.labelSize']}px Roboto`; ctx.fillStyle = P['header.labelColor']; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.fillText([P['header.new'], P['header.unread'], P['header.read']][group], side + 48, top + rowH / 2);
}

/* open the cloud conversation with the tapped person */
function openConvo(name) {
  const conv = K.screens.conversation;
  if (!conv) { K.status('Tapped ' + name + ': the conversation screen is not loaded in this Studio.'); return; }
  conv.withName = name; conv.backTo = 'directory'; K.show('conversation');
}

/* ---------- module ---------- */
const sc = K.screen({
  id: 'directory', title: 'Sphere & black holes', docId: 'raven_directory',
  crumb: 'Asgard › Raven › Sphere & black holes <small>· AsgardRaven Dart</small>',
  docMeta: { widget: 'AsgardRaven', part: 'Raven directory (sphere, busts, names, tabs)', source: 'FlutterFlow export 2026-11-19' },
  startGroup: 'Sphere', startSection: 'Move & size',
  spec(def) {
    // Keep basic placement first; light controls follow it.
    // Sphere
    def('Sphere', 'Move & size', 'sphere', 'sphere.x', 'Move left / right', 'num', .42, { min: .25, max: .65, step: .005, unit: 'of width', dart: 'sphereX .42' });
    def('Sphere', 'Move & size', 'sphere', 'sphere.height', 'Move up / down', 'num', -.17, { min: -.35, max: .15, step: .005, unit: 'of height', dart: 'sphereOffset -.17' });
    def('Sphere', 'Move & size', 'sphere', 'sphere.scale', 'Smaller / bigger', 'num', 1, { min: .5, max: 1.5, step: .01, unit: '×', info: 'Busts, path and tabs all scale with the sphere.' });
    def('Sphere', 'Layout limits', 'sphere', 'sphere.widthFrac', 'Max width share', 'num', .67, { min: .2, max: 1, step: .01, dart: '_rvSphereWidthFraction' });
    def('Sphere', 'Layout limits', 'sphere', 'sphere.heightFrac', 'Max height share', 'num', .20, { min: .05, max: .45, step: .005 });
    def('Sphere', 'Layout limits', 'sphere', 'sphere.size', 'Radius factor', 'num', .85, { min: .3, max: 1.5, step: .01 });
    def('Sphere', 'Layout limits', 'sphere', 'sphere.maxY', 'Lowest center', 'num', .66, { min: .3, max: .95, step: .005, unit: 'of height' });
    def('Sphere', 'Layout limits', 'sphere', 'sphere.bottomGap', 'Bottom clearance', 'num', 124, { min: 0, max: 400, step: 1, unit: 'px' });
    window.RavenEnvironment.controls(def);
    def('Sphere', 'Body', 'sphere', 'sb.on', 'Show the sphere', 'bool', true, { info: 'Your sphere from your earlier studio (your saved settings), with the app\'s lit runes on top.' });
    def('Sphere', 'Body', 'sphere', 'sb.texture', 'Surface', 'select', 'red', { opts: [['red', 'Your runes (red-gold)'], ['teal', 'Your runes (teal)']] });
    def('Sphere', 'Body', 'sphere', 'sb.repeat', 'Rune size (smaller = bigger)', 'num', 2, { min: 1, max: 6, step: .1 });
    def('Sphere', 'Body', 'sphere', 'sb.spin', 'How fast it turns', 'num', .22, { min: -1, max: 1, step: .005 });
    def('Sphere', 'Body', 'sphere', 'sb.tilt', 'Lean the spinning axis', 'num', 17.9, { min: -90, max: 90, step: .1, unit: '°' });
    def('Sphere', 'Body', 'sphere', 'sb.body', 'Solid dark ball', 'num', 1, { min: 0, max: 1, step: .01 });
    def('Sphere', 'Body', 'sphere', 'sb.ambient', 'How much shows with no light', 'num', 0, { min: 0, max: 1, step: .005 });
    def('Sphere', 'Body', 'sphere', 'sb.limb', 'Darken toward the edge', 'num', .34, { min: 0, max: 1, step: .01 });
    def('Sphere', 'Body light', 'sphere', 'sb.topLight', 'Light from above', 'num', 1.2, { min: 0, max: 4, step: .05 });
    def('Sphere', 'Body light', 'sphere', 'sb.topOn', 'Use body light', 'bool', true);
    def('Sphere', 'Body light', 'sphere', 'sb.topSharp', 'Light sharpness', 'num', 3, { min: .5, max: 20, step: .1 });
    def('Sphere', 'Body light', 'sphere', 'sb.topToward', 'Light toward you', 'num', .6, { min: -1, max: 2, step: .01 });
    def('Sphere', 'Body light', 'sphere', 'sb.topSide', 'Light from the side', 'num', 0, { min: -2, max: 2, step: .01 });
    def('Sphere', 'Body light', 'sphere', 'sb.topColor', 'Light color', 'color', '#FFFFFF');
    def('Sphere', 'Body light', 'sphere', 'sb.tint', 'Tint the surface', 'bool', false);
    def('Sphere', 'Body light', 'sphere', 'sb.tintColor', 'Tint color', 'color', '#E40B05');
    def('Sphere', 'Body light', 'sphere', 'sb.rimLight', 'Edge light', 'num', 0, { min: 0, max: 2, step: .01 });
    def('Sphere', 'Body light', 'sphere', 'sb.rim', 'Edge light color', 'color', '#6FD6FF');
    def('Streamer black holes', 'Holes', 'holes', 'hh.on', 'Streamer black holes up top', 'bool', true);
    def('Streamer black holes', 'Holes', 'holes', 'hh.source', 'Preview source', 'select', 'saved', { opts: [['saved', 'My saved tiers 1–4'], ['pair', 'Opus pair animation']], info: 'Uses your existing saved tier artwork and renderer over the live camera. It does not replace your saved tier designs.' });
    def('Streamer black holes', 'Holes', 'holes', 'hh.tier', 'Show tier', 'select', 0, { opts: [[0, 'All four together'], [1, 'Tier 1 · 0–20 views'], [2, 'Tier 2 · 21–149 views'], [3, 'Tier 3 · 150–499 views'], [4, 'Tier 4 · 500–1,999 views']] });
    def('Streamer black holes', 'Holes', 'holes', 'hh.size', 'Size', 'num', 1, { min: .3, max: 3, step: .01, unit: '×' });
    def('Streamer black holes', 'Holes', 'holes', 'hh.top', 'Top of their sky', 'num', 21, { min: 0, max: 200, step: 1, unit: 'px' });
    def('Streamer black holes', 'Holes', 'holes', 'hh.extra', 'Extra streamers drifting', 'int', 8, { min: 0, max: 8, step: 1 });
    def('Streamer black holes', 'Holes', 'holes', 'hh.pairGap', 'Pair orbit size', 'num', 50, { min: 10, max: 150, step: 1, unit: 'px' });
    def('Streamer black holes', 'Floating', 'holes', 'hh.drift', 'Float across the screen', 'bool', true);
    def('Streamer black holes', 'Floating', 'holes', 'hh.direction', 'Travel direction', 'select', 1, { opts: [[1, 'Left to right'], [-1, 'Right to left']] });
    def('Streamer black holes', 'Floating', 'holes', 'hh.speed', 'Floating speed', 'num', 1, { min: 0, max: 5, step: .05, unit: '×', info: 'Multiplies your saved floating speed. Zero holds the holes still.' });
    def('Streamer black holes', 'Floating', 'holes', 'hh.wobble', 'Gentle up / down', 'num', .35, { min: 0, max: 2, step: .01 });
    def('Streamer black holes', 'Faces', 'holes', 'hh.faces', 'Show reflected faces', 'bool', true, { info: 'Your existing glossy black-sphere reflection. Faces stay attached to their black holes as they float.' });
    def('Streamer black holes', 'Faces', 'holes', 'hh.faceAmount', 'Face opacity', 'num', .85, { min: 0, max: 1, step: .01 });
    def('Streamer black holes', 'Faces', 'holes', 'hh.faceSize', 'Reflection size', 'num', .7, { min: .1, max: 1.5, step: .01, info: 'How much of the black sphere the reflection covers. The dark rim remains visible.' });
    def('Streamer black holes', 'Faces', 'holes', 'hh.faceBright', 'Face brightness', 'num', .8, { min: 0, max: 2, step: .01 });
    def('Streamer black holes', 'Faces', 'holes', 'hh.faceBlur', 'Reflection softness', 'num', .6, { min: 0, max: 4, step: .05 });
    def('Streamer black holes', 'Faces', 'holes', 'hh.faceGloss', 'Surface gloss', 'num', .7, { min: .1, max: 3, step: .05 });
    def('Streamer black holes', 'Faces', 'holes', 'hh.faceRim', 'Surrounding edge light', 'num', .5, { min: 0, max: 2, step: .01 });
    def('Streamer black holes', 'Faces', 'holes', 'hh.faceLight', 'Surrounding light strength', 'num', 1, { min: 0, max: 3, step: .01 });
    def('Streamer black holes', 'Faces', 'holes', 'hh.faceCatch', 'Reflected light glint', 'num', 0, { min: 0, max: 2, step: .01 });
    def('Streamer black holes', 'Faces', 'holes', 'hh.faceX', 'Face left / right', 'num', 0, { min: -1, max: 1, step: .01 });
    def('Streamer black holes', 'Faces', 'holes', 'hh.faceY', 'Face up / down', 'num', 0, { min: -1, max: 1, step: .01 });
    def('Streamer black holes', 'Faces', 'holes', 'hh.faceZoom', 'Face zoom', 'num', 1, { min: .5, max: 3, step: .01, unit: '×' });
    def('Streamer black holes', 'Faces', 'holes', 'hh.faceTurn', 'Face rotation', 'num', 0, { min: -180, max: 180, step: 1, unit: '°' });
    for (const [tier, name] of [[1, 'Baldr'], [2, 'Freya'], [3, 'Loki'], [4, 'Hel']]) def('Streamer black holes', 'Faces', 'holes', 'hh.face' + tier, 'Tier ' + tier + ' preview face', 'select', name, { opts: DEMO.map(person => [person[0], person[0]]), info: 'Uses the existing Studio test people. It does not reassign live streamers.' });
    def('Streamer black holes', 'Bending', 'holes', 'hh.lens', 'Bend what is behind the phone', 'bool', true, { info: 'The holes bend the live camera / tilt background in real time.' });
    def('Streamer black holes', 'Bending', 'holes', 'hh.bend', 'Bend strength', 'num', 1.16, { min: 0, max: 3, step: .01 });
    def('Streamer black holes', 'Bending', 'holes', 'hh.reach', 'Bend reach', 'num', 3.5, { min: 1.2, max: 10, step: .1, unit: '× hole' });
    def('Streamer black holes', 'Pair', 'holes', 'hh.bridge', 'Light bridge between the pair', 'bool', true);
    def('Streamer black holes', 'Pair', 'holes', 'hh.ripples', 'Space ripples from the pair', 'bool', true);
    def('Streamer black holes', 'Names', 'holes', 'hh.names', 'Names under holes', 'bool', true);
    def('Streamer black holes', 'Names', 'holes', 'hh.nameSize', 'Name size', 'num', 13, { min: 6, max: 24, step: .5, unit: 'px' });
    def('Streamer black holes', 'Names', 'holes', 'hh.nameColor', 'Name color', 'color', '#ECF4FF');
    def('Sphere', 'Runes', 'sphere', 'sphere.on', 'Lit runes sphere', 'bool', true, { info: 'The amber rune texture wrapped on the sphere. It only shows where the message tabs light it.' });
    def('Sphere', 'Runes', 'sphere', 'sphere.spin', 'Spin speed', 'num', 1, { min: 0, max: 12, step: .05, unit: '×', dart: 'spinSpeed (1 turn / 160 s at 1×)' });
    def('Sphere', 'Runes', 'sphere', 'sphere.tilt', 'Spin axis tilt', 'num', 23.4, { min: -90, max: 90, step: .1, unit: '°' });
    def('Sphere', 'Runes', 'sphere', 'sphere.white', 'Lit runes white', 'bool', false);
    def('Sphere', 'Runes', 'sphere', 'sphere.hue', 'Lit runes hue', 'num', 184, { min: 0, max: 360, step: 1, unit: '°' });
    def('Sphere', 'Runes', 'sphere', 'sphere.baseInk', 'Dim runes tint', 'color', '#A8C5DC');
    def('Sphere', 'Runes', 'sphere', 'sphere.edgeFade', 'Edge fade', 'num', .22, { min: .01, max: 1, step: .01, info: 'How soon the runes fade toward the sphere edge.' });
    def('Sphere', 'Runes', 'sphere', 'sphere.maxLight', 'Max brightness', 'num', .85, { min: 0, max: 1, step: .01 });
    def('Sphere', 'Light from tabs', 'sphere.light', 'light.reachX', 'Light spread sideways', 'num', .32, { min: .01, max: 2, step: .01 });
    def('Sphere', 'Light from tabs', 'sphere.light', 'light.on', 'Message tabs light the sphere', 'bool', true);
    def('Sphere', 'Light from tabs', 'sphere.light', 'light.reachY', 'Light spread up/down', 'num', .075, { min: .005, max: 1, step: .005 });
    def('Sphere', 'Light from tabs', 'sphere.light', 'light.cap', 'Light cap', 'num', .65, { min: 0, max: 1, step: .01 });
    def('Sphere', 'Light from tabs', 'sphere.light', 'light.first', 'Near-edge lamp', 'num', .42, { min: 0, max: 2, step: .01 });
    def('Sphere', 'Light from tabs', 'sphere.light', 'light.other', 'Other lamps', 'num', .22, { min: 0, max: 2, step: .01 });
    def('Sphere', 'Light from tabs', 'sphere.light', 'light.new', 'New strength', 'num', 1, { min: 0, max: 2, step: .01 });
    def('Sphere', 'Light from tabs', 'sphere.light', 'light.unread', 'Unread strength', 'num', .80, { min: 0, max: 2, step: .01 });
    def('Sphere', 'Light from tabs', 'sphere.light', 'light.read', 'Read strength', 'num', .62, { min: 0, max: 2, step: .01 });
    def('Sphere', 'Light from tabs', 'sphere.light', 'light.reveal', 'Reveal brightness', 'num', 1, { min: 0, max: 4, step: .05, dart: 'revealBrightness' });
    // Busts
    def('Busts', 'Path', 'busts.path', 'path.count', 'People considered along path', 'int', 7, { min: 2, max: 15, step: 1 });
    def('Busts', 'Path', 'busts.path', 'path.radius', 'Path distance from sphere', 'num', 1, { min: .3, max: 2.5, step: .01 });
    def('Busts', 'Path', 'busts.path', 'path.mirror', 'Mirror path to other side', 'bool', false);
    def('Busts', 'Path', 'busts.path', 'path.rotate', 'Rotate the whole path', 'num', 0, { min: -180, max: 180, step: 1, unit: '°' });
    def('Busts', 'Path', 'busts.path', 'path.offsetX', 'Path left / right', 'num', 0, { min: -200, max: 200, step: 1, unit: 'px' });
    def('Busts', 'Path', 'busts.path', 'path.offsetY', 'Path up / down', 'num', 0, { min: -300, max: 300, step: 1, unit: 'px' });
    def('Busts', 'Path', 'busts.path', 'path.step', 'Spacing', 'num', .58, { min: .2, max: 1.5, step: .01, dart: '_rvStep' });
    def('Busts', 'Path', 'busts.path', 'path.limit', 'Path length', 'num', 1.45, { min: .5, max: 3, step: .01, dart: '_rvPathLimit' });
    def('Busts', 'Path', 'busts.path', 'path.start', 'Lead position', 'num', 1.05, { min: -1.5, max: 2.5, step: .01 });
    def('Busts', 'Path', 'busts.path', 'path.curve', 'Arc sweep', 'num', 1.30, { min: .2, max: 3, step: .01 });
    def('Busts', 'Path', 'busts.path', 'path.bulge', 'Bulge left', 'num', .67, { min: -1.5, max: 1.5, step: .01 });
    def('Busts', 'Path', 'busts.path', 'path.lean', 'Lean', 'num', .04, { min: -1, max: 1, step: .01 });
    def('Busts', 'Path', 'busts.path', 'path.flare', 'End flare', 'num', .08, { min: -1, max: 1, step: .01 });
    def('Busts', 'Size', 'busts', 'busts.on', 'Show busts', 'bool', true);
    def('Busts', 'Size', 'busts', 'bust.width', 'Bust size', 'num', .62, { min: .1, max: 1.5, step: .01, unit: 'of radius' });
    def('Busts', 'Size', 'busts', 'bust.shrink', 'Shrink toward ends', 'num', .57, { min: 0, max: 1, step: .01 });
    def('Busts', 'Size', 'busts', 'bust.shrinkCurve', 'Shrink curve', 'num', 1.25, { min: .2, max: 4, step: .05 });
    def('Busts', 'Size', 'busts', 'bust.min', 'Smallest size', 'num', .40, { min: .05, max: 1, step: .01 });
    def('Busts', 'Turn', 'busts', 'bust.yaw', 'Head turn', 'num', 25, { min: 0, max: 25, step: .5, unit: '°', info: 'How far busts turn their heads along the path (the sprites have ±25°).' });
    def('Busts', 'Turn', 'busts', 'bust.tip', 'Tip at ends', 'num', .13, { min: -1, max: 1, step: .01, unit: 'rad' });
    def('Busts', 'Shade', 'busts', 'bust.shadeBase', 'Back-row darkness', 'num', .73, { min: 0, max: 1, step: .01, info: 'Brightness of busts at the back. Front busts are full brightness.' });
    def('Busts', 'Shade', 'busts', 'bust.baseFade', 'Bottom fade starts', 'num', .82, { min: 0, max: 1, step: .01, unit: 'of height' });
    def('Busts', 'Behind sphere', 'busts', 'occl.start', 'Starts hiding at', 'num', 1.10, { min: 0, max: 3, step: .01 });
    def('Busts', 'Behind sphere', 'busts', 'occl.range', 'Hide distance', 'num', .34, { min: .01, max: 2, step: .01 });
    def('Busts', 'Behind sphere', 'busts', 'occl.mask', 'Horizon curve size', 'num', 1.10, { min: .3, max: 3, step: .01 });
    // Names
    def('Names', 'Text', 'names', 'names.on', 'Show names', 'bool', true);
    def('Names', 'Text', 'names', 'names.size', 'Size', 'num', 16, { min: 8, max: 40, step: .5, unit: 'px', dart: 'nameSize 16' });
    def('Names', 'Text', 'names', 'names.style', 'Style', 'select', 1, { opts: NAME_STYLES });
    def('Names', 'Text', 'names', 'names.white', 'White', 'bool', true);
    def('Names', 'Text', 'names', 'names.hue', 'Hue (if not white)', 'num', 184, { min: 0, max: 360, step: 1, unit: '°' });
    def('Names', 'Text', 'names', 'names.gap', 'Gap from bust', 'num', 5, { min: -40, max: 60, step: .5, unit: 'px' });
    def('Names', 'Glow', 'names', 'names.glow1', 'Inner glow', 'num', .6, { min: 0, max: 1, step: .01 });
    def('Names', 'Glow', 'names', 'names.glow1Blur', 'Inner glow blur', 'num', 4, { min: 0, max: 30, step: .5, unit: 'px' });
    def('Names', 'Glow', 'names', 'names.glow2', 'Outer glow', 'num', .27, { min: 0, max: 1, step: .01 });
    def('Names', 'Glow', 'names', 'names.glow2Blur', 'Outer glow blur', 'num', 9, { min: 0, max: 40, step: .5, unit: 'px' });
    def('Names', 'Fade at ends', 'names', 'names.fadeAt', 'Fade starts', 'num', 1.27, { min: 0, max: 3, step: .01 });
    def('Names', 'Fade at ends', 'names', 'names.fadeRange', 'Fade length', 'num', .22, { min: .01, max: 2, step: .01 });
    def('Names', 'Fade at ends', 'names', 'names.hideAt', 'Hide when covered', 'num', .65, { min: .05, max: 1, step: .01 });
    // Tethers
    def('Tethers', 'Line', 'tethers', 'tether.on', 'Show tether lines', 'bool', true);
    def('Tethers', 'Line', 'tethers', 'tether.base', 'Length', 'num', 38, { min: 0, max: 160, step: 1, unit: 'px' });
    def('Tethers', 'Line', 'tethers', 'tether.min', 'Shortest', 'num', 12, { min: 0, max: 80, step: 1, unit: 'px' });
    def('Tethers', 'Line', 'tethers', 'tether.width', 'Width', 'num', 1.1, { min: .1, max: 6, step: .05, unit: 'px' });
    def('Tethers', 'Line', 'tethers', 'tether.inset', 'Start inset', 'num', 3, { min: -20, max: 40, step: .5, unit: 'px' });
    def('Tethers', 'Line', 'tethers', 'tether.dot', 'End dot', 'num', 1.3, { min: 0, max: 8, step: .1, unit: 'px' });
    def('Tethers', 'Glow', 'tethers', 'tether.glowWidth', 'Glow width', 'num', 3, { min: 0, max: 16, step: .1, unit: 'px' });
    def('Tethers', 'Glow', 'tethers', 'tether.glowOpacity', 'Glow strength', 'num', .25, { min: 0, max: 1, step: .01 });
    def('Tethers', 'Glow', 'tethers', 'tether.glowBlur', 'Glow blur', 'num', 2, { min: 0, max: 20, step: .5, unit: 'px' });
    // Tabs
    def('Message tabs', 'Box', 'tabs', 'tabs.on', 'Show tabs', 'bool', true);
    def('Message tabs', 'Box', 'tabs', 'tabs.width', 'Width', 'num', .27, { min: .18, max: .48, step: .005, unit: 'of screen', dart: 'tabWidth .27' });
    def('Message tabs', 'Box', 'tabs', 'tabs.height', 'Height', 'num', 27, { min: 20, max: 80, step: .5, unit: 'px', dart: 'tabHeight 27' });
    def('Message tabs', 'Box', 'tabs', 'tabs.margin', 'Right margin', 'num', 8, { min: 0, max: 60, step: .5, unit: 'px' });
    def('Message tabs', 'Box', 'tabs', 'tabs.hue', 'Tab hue', 'num', 184, { min: 0, max: 360, step: 1, unit: '°', dart: 'tabHue 184' });
    def('Message tabs', 'Box', 'tabs', 'tabs.glow', 'Glow', 'num', 1, { min: 0, max: 3, step: .05, unit: '×', dart: 'tabGlow 1' });
    def('Message tabs', 'Box', 'tabs', 'tabs.outlineOnly', 'Outline only', 'bool', false);
    def('Message tabs', 'Fill', 'tabs', 'tabs.fillGlow', 'Face glow', 'num', .18, { min: 0, max: .54, step: .01 });
    def('Message tabs', 'Fill', 'tabs', 'tabs.fillGlowBlur', 'Face glow blur', 'num', 7, { min: 0, max: 30, step: .5, unit: 'px' });
    def('Message tabs', 'Fill', 'tabs', 'tabs.dark', 'Dark backing', 'num', .15, { min: 0, max: 1, step: .01 });
    def('Message tabs', 'Fill', 'tabs', 'tabs.tintNew', 'Tint: New', 'num', .38, { min: 0, max: .78, step: .01 });
    def('Message tabs', 'Fill', 'tabs', 'tabs.tintUnread', 'Tint: Unread', 'num', .30, { min: 0, max: .78, step: .01 });
    def('Message tabs', 'Fill', 'tabs', 'tabs.tintRead', 'Tint: Read', 'num', .23, { min: 0, max: .78, step: .01 });
    def('Message tabs', 'Fill', 'tabs', 'tabs.tintFloor', 'Tint at zero glow', 'num', .20, { min: 0, max: 1, step: .01 });
    def('Message tabs', 'Outline', 'tabs', 'tabs.edgeWidth', 'Line width', 'num', 1.25, { min: 0, max: 6, step: .05, unit: 'px' });
    def('Message tabs', 'Outline', 'tabs', 'tabs.edgeGlow', 'Edge glow', 'num', .28, { min: 0, max: .75, step: .01 });
    def('Message tabs', 'Outline', 'tabs', 'tabs.edgeGlowWidth', 'Edge glow width', 'num', 3, { min: 0, max: 16, step: .1, unit: 'px' });
    def('Message tabs', 'Outline', 'tabs', 'tabs.edgeGlowBlur', 'Edge glow blur', 'num', 3, { min: 0, max: 20, step: .5, unit: 'px' });
    def('Message tabs', 'Outline', 'tabs', 'tabs.topLine', 'Top shine', 'num', .65, { min: 0, max: 1, step: .01 });
    def('Message tabs', 'Outline', 'tabs', 'tabs.topLineWidth', 'Top shine width', 'num', .65, { min: 0, max: 4, step: .05, unit: 'px' });
    def('Message tabs', 'Message text', 'tabs.text', 'tabs.textSize', 'Size', 'num', 12, { min: 10, max: 28, step: .5, unit: 'px', dart: 'messageSize 12' });
    def('Message tabs', 'Message text', 'tabs.text', 'tabs.textStyle', 'Style', 'select', 0, { opts: NAME_STYLES });
    def('Message tabs', 'Message text', 'tabs.text', 'tabs.textWhite', 'White', 'bool', false);
    def('Message tabs', 'Message text', 'tabs.text', 'tabs.textHue', 'Hue (if not white)', 'num', 184, { min: 0, max: 360, step: 1, unit: '°' });
    def('Message tabs', 'Message text', 'tabs.text', 'tabs.pad', 'Side padding', 'num', 7, { min: 0, max: 30, step: .5, unit: 'px' });
    def('Message tabs', 'Message text', 'tabs.text', 'tabs.textGlow', 'Glow', 'num', .5, { min: 0, max: .9, step: .01 });
    def('Message tabs', 'Message text', 'tabs.text', 'tabs.textGlowBlur', 'Glow blur', 'num', 4, { min: 0, max: 20, step: .5, unit: 'px' });
    def('Message tabs', 'Message text', 'tabs.text', 'tabs.empty', 'No-message text', 'text', 'Start a conversation');
    // Motion
    def('Motion', 'Scroll', 'busts.path', 'motion.direction', 'Swipe direction', 'select', 1, { opts: [[1,'Follow swipe'],[-1,'Reverse swipe']] });
    def('Motion', 'Scroll', 'busts.path', 'motion.swipe', 'Swipe sensitivity', 'num', 1, { min: .1, max: 4, step: .05 });
    def('Motion', 'Scroll', 'busts.path', 'motion.inertia', 'Coast after release', 'bool', true);
    def('Motion', 'Scroll', 'busts.path', 'motion.maxSpeed', 'Maximum fling speed', 'num', 9, { min: .1, max: 25, step: .1, unit: 'slots / s' });
    def('Motion', 'Scroll', 'busts.path', 'motion.entry', 'Entry time', 'num', .90, { min: .05, max: 5, step: .05, unit: 's', info: 'Press Replay entry to see it.' });
    def('Motion', 'Scroll', 'busts.path', 'motion.entryTravel', 'Entry travel', 'num', 4.6, { min: 0, max: 15, step: .1, unit: 'slots' });
    def('Motion', 'Scroll', 'busts.path', 'motion.friction', 'Fling glide', 'num', .46, { min: .05, max: 3, step: .01, unit: 's' });
    def('Motion', 'Scroll', 'busts.path', 'motion.settle', 'Snap speed', 'num', .10, { min: .01, max: 1, step: .01, unit: 's' });
    def('Motion', 'Scroll', 'busts.path', 'motion.snapBelow', 'Snap when slower than', 'num', .18, { min: 0, max: 2, step: .01, unit: 'slots/s' });
    // Header
    def('Header', 'Bar', 'header', 'header.on', 'Show bar', 'bool', true);
    def('Header', 'Bar', 'header', 'header.top', 'Top position', 'num', .275, { min: 0, max: .8, step: .005, unit: 'of height' });
    def('Header', 'Bar', 'header', 'header.min', 'Lowest top', 'num', 210, { min: 0, max: 600, step: 1, unit: 'px' });
    def('Header', 'Bar', 'header', 'header.side', 'Side margins', 'num', 16, { min: 0, max: 60, step: 1, unit: 'px' });
    def('Header', 'Bar', 'header', 'header.iconColor', 'Icon color', 'color', '#99CAE6');
    def('Header', 'Bar', 'header', 'header.refresh', 'Refresh button', 'bool', true);
    def('Header', 'Label', 'header', 'header.labelSize', 'Size', 'num', 16, { min: 8, max: 40, step: .5, unit: 'px' });
    def('Header', 'Label', 'header', 'header.labelColor', 'Color', 'color', '#B8D9EC');
    def('Header', 'Label', 'header', 'header.new', 'New wording', 'text', 'New');
    def('Header', 'Label', 'header', 'header.unread', 'Unread wording', 'text', 'Unread');
    def('Header', 'Label', 'header', 'header.read', 'Read wording', 'text', 'Read');
    def('Header', 'Owner area', 'owner', 'owner.on', 'Show owner tuning area', 'bool', false, { info: 'In the app the owner sees in-app sliders at the top. Turn on to see the space it takes.' });
  },
  toolbar: [{ label: 'Replay entry', title: 'Play the busts sliding in again', onclick: () => { ST.entry = 0; ST.scroll = 0; ST.velocity = 0; ST.settle = null; } }, { label: 'Back to dial', title: 'Same as the back arrow', onclick: () => K.show('dial') }, { label: 'Reload saved tiers', title: 'Read your current tier designs without changing them', onclick: () => window.RavenSavedTiers.reload() }],
  onShow() { ST.entry = 0; ST.scroll = 0; ST.velocity = 0; ST.settle = null; },
  update(dt) {
    P = sc.P; ST.time += dt;
    if (ST.entry < 1) ST.entry = clamp(ST.entry + dt / Math.max(.01, P['motion.entry']), 0, 1);
    if (!ST.dragging && ST.settle == null && Math.abs(ST.velocity) >= .004) { ST.scroll += ST.velocity * dt; ST.velocity *= Math.exp(-dt / Math.max(.01, P['motion.friction'])); if (Math.abs(ST.velocity) < .004) ST.velocity = 0; }
    if (!ST.dragging) {
      if (ST.settle == null && Math.abs(ST.velocity) < P['motion.snapBelow']) { ST.velocity = 0; ST.settle = Math.round(ST.scroll); }
      if (ST.settle != null) { const gap = ST.settle - ST.scroll; ST.scroll = Math.abs(gap) < .0005 ? ST.settle : ST.scroll + gap * (1 - Math.exp(-dt / Math.max(.005, P['motion.settle']))); if (ST.scroll === ST.settle) ST.settle = null; }
    }
    ST.scroll = clamp(ST.scroll, 0, PEOPLE.length - 1);
    ST.spinPhase = (ST.spinPhase + dt * P['sphere.spin'] / 160) % 1;
  },
  draw(ctx, now, studio) {
    P = sc.P; sc.ty = 0;
    const g = geometry(); G = { g, items: [], busts: [], names: [], tethers: [], tabs: [] };
    const items = place(g, PEOPLE, ST.scroll - (1 - ease(ST.entry)) * P['motion.entryTravel']); G.items = items;
    // tab lamps light the runes
    const lamps = [];
    for (const it of items) {
      const cov = covered(it); if (cov >= .65 || P['tabs.glow'] <= 0 || P['light.on']===false) continue;
      const r = tabRect(g, it), str = [P['light.new'], P['light.unread'], P['light.read']][it.person.group] * (1 - cov) * P['tabs.glow'] * P['light.reveal'];
      for (let j = 0; j < 3; j++) lamps.push({ x: (r.x + r.w * j / 3 - g.cx) / g.radius, y: (r.y + r.h / 2 - g.cy) / g.radius, p: str * (j === 0 ? P['light.first'] : P['light.other']) });
    }
    G.lamps = lamps;
    drawHoles(ctx, g);
    drawSphereBody(ctx, g);
    if (renderSphere(g, lamps)) ctx.drawImage(GL.canvas, g.cx - g.radius, g.cy - g.radius, g.radius * 2, g.radius * 2);
    for (const it of items) { drawBust(ctx, g, it); drawName(ctx, g, it); }
    drawChrome(ctx, g, PEOPLE);
    if (studio) K.hl(ctx, now);
  },
  highlight(ctx, base, sub, H1) {
    const g = G.g; if (!g) return;
    const box = (b, pad = 3) => () => { ctx.beginPath(); ctx.roundRect(b.x - pad, b.y - pad, b.w + pad * 2, b.h + pad * 2, 5); };
    if (base === 'sphere' || base === 'sphere.light') { H1(() => { ctx.beginPath(); ctx.arc(g.cx, g.cy, g.radius + 3, 0, TAU); }); if (base === 'sphere.light') for (const l of G.lamps) H1(() => { ctx.beginPath(); ctx.arc(g.cx + l.x * g.radius, g.cy + l.y * g.radius, 4, 0, TAU); }); }
    else if (base === 'holes') (G.holes || []).forEach(h => H1(() => { ctx.beginPath(); ctx.arc(h.c[0], h.c[1], h.r + 6, 0, TAU); }));
    else if (base === 'busts') G.busts.forEach(b => H1(box(b, 2)));
    else if (base === 'busts.path') { H1(() => { ctx.beginPath(); const lim = P['path.limit']; for (let k = 0; k <= 60; k++) { const t = -lim + 2 * lim * k / 60, th = P['path.curve'] * t, sn = Math.sin(th), cs = Math.cos(th); const {x,y}=pathPoint(g,t); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } }); G.busts.forEach(b => H1(() => { ctx.beginPath(); ctx.arc(b.x + b.w / 2, b.y + b.h / 2, 3, 0, TAU); })); }
    else if (base === 'names') G.names.forEach(b => H1(box(b)));
    else if (base === 'tethers') G.tethers.forEach(b => H1(box(b, 1)));
    else if (base === 'tabs' || base === 'tabs.text') G.tabs.forEach(b => H1(box(b, base === 'tabs' ? 3 : -2)));
    else if (base === 'header' && G.header) H1(box(G.header));
    else if (base === 'owner' && G.owner) H1(box(G.owner));
  },
  bounds(base) {
    const g = G.g || geometry(), sq = (x, y, s) => ({ x: x - s / 2, y: y - s / 2, s });
    const front = G.items && G.items.length ? G.items[G.items.length - 1] : null;
    if (base === 'holes') return sq(K.W / 2, Math.max(60, (g.cy - g.radius) * .55), K.W);
    if (base === 'header' && G.header) return sq(G.header.x + G.header.w / 2, G.header.y + G.header.h / 2, G.header.w * 1.05);
    if (base === 'owner' && G.owner) return sq(G.owner.x + G.owner.w / 2, G.owner.y + G.owner.h / 2, G.owner.w * 1.05);
    if ((base === 'tabs' || base === 'tabs.text' || base === 'tethers' || base === 'names') && front) { const t = G.tabs.find(t => t.it === front) || G.tabs[0]; if (t) return sq(t.x + t.w / 2 - 30, t.y + t.h / 2, Math.max(150, t.w * 1.9)); }
    if (base === 'busts' && front) return sq(front.cx, front.cy, front.width * 2.2);
    if (base === 'sphere' || base === 'sphere.light') return sq(g.cx + g.radius * .4, g.cy, g.radius * 2.9);
    return sq(g.cx, g.cy, g.radius * 3.4);
  },
  pick(p) {
    const inR = b => b && p.x >= b.x - 4 && p.x <= b.x + b.w + 4 && p.y >= b.y - 4 && p.y <= b.y + b.h + 4;
    if (inR(G.header)) return ['Header', 'Bar'];
    if (inR(G.owner)) return ['Header', 'Owner area'];
    for (const t of G.tabs) if (inR(t)) return ['Message tabs', 'Box'];
    for (const n of G.names) if (inR(n)) return ['Names', 'Text'];
    for (const t of G.tethers) if (inR(t)) return ['Tethers', 'Line'];
    for (let i = G.busts.length - 1; i >= 0; i--) if (inR(G.busts[i])) return ['Busts', 'Size'];
    const g = G.g; if (g && Math.hypot(p.x - g.cx, p.y - g.cy) < g.radius) return ['Sphere', 'Move & size'];
    return ['Background', 'Mode'];
  },
  pointer: {
    down(p, ev) { ST.down = { x: p.x, y: p.y, id: ev.pointerId }; ST.dragging = true; ST.velocity = 0; ST.settle = null; ST.lastY = p.y; ST.lastT = performance.now(); ST.vy = 0; ST.moved = 0; },
    move(p, ev) {
      if (!ST.down || ev.pointerId !== ST.down.id) return;
      const g = G.g || geometry(), slot = g.radius * P['path.step'], dy = p.y - ST.lastY, now = performance.now();
      ST.moved += Math.abs(dy); ST.scroll = clamp(ST.scroll - dy / slot * P['motion.swipe'] * P['motion.direction'], 0, PEOPLE.length - 1);
      const dtm = Math.max(1, now - ST.lastT); ST.vy = ST.vy * .6 + (dy / dtm * 1000) * .4; ST.lastY = p.y; ST.lastT = now;
    },
    up(p, ev) {
      if (!ST.down || ev.pointerId !== ST.down.id) return;
      const g = G.g || geometry(), slot = g.radius * P['path.step'];
      ST.dragging = false; const tap = ST.moved < 8; ST.down = null;
      if (!tap) { ST.velocity = P['motion.inertia'] ? clamp(-ST.vy / slot * P['motion.swipe'] * P['motion.direction'], -P['motion.maxSpeed'], P['motion.maxSpeed']) : 0; return; }
      const inR = b => b && p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
      if (inR(G.back)) { K.show('dial'); return; }
      if (inR(G.refresh)) { ST.entry = 0; K.status('Refresh: in the app this reloads your conversations.'); return; }
      for (let i = G.busts.length - 1; i >= 0; i--) if (inR(G.busts[i])) { openConvo(G.busts[i].it.person.name); return; }
      for (const t of G.tabs) if (inR(t)) { openConvo(t.it.person.name); return; }
    },
    cancel() { ST.dragging = false; ST.down = null; },
  },
});
sc.ST = ST; sc.geometry = () => { P = sc.P; return geometry(); }; sc.G = () => G;
})();


