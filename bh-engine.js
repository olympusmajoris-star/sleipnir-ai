/* Asgard black-hole engine — real Schwarzschild ray tracing of a live background.
   One WebGL2 canvas. Up to 8 holes. Every pixel near a hole is traced through curved
   spacetime (exact null geodesics, r_s = 1); far pixels use the analytic deflection, so
   stars, nebulae and video behind a hole bend for real as it drifts past. */
(function (G) {
'use strict';
const MAXH = 8;

const BH_DEFAULTS = {
  // placement
  x: 0.5, y: 0.3, size: 60, rotX: 12, rotY: 0, rotZ: 0, camDist: 32,
  // lensing
  lens: 1.0, reach: 0.55, edgeWidth: 3, envColor: 0, envRadius: 2.4, envFeed: 0, vary: 0,
  // horizon
  horizonColor: '#000000', faceAmt: 0, faceZoom: 1.0, faceSphere: 0, faceShade: 0, faceTurn: 0, faceCover: 1.0,
  // disk
  disk: 1, diskIn: 3.0, diskOut: 14, diskBright: 1.4, diskFalloff: 1.6, diskColorIn: '#fff2dc', diskColorOut: '#ff8a2a',
  diskTexture: 0.65, diskStreaks: 0.6, diskSwirl: 0.0, arms: 0, armSharp: 3, diskSpin: 1.0, diskDir: 1, diskThick: 0.06, diskOpacity: 0.92,
  doppler: 0.6, temp: 0.5, clumps: 0.0,
  // photon shell / corona
  ring: 0.0, ringColor: '#fff4e8', ringWidth: 0.12, corona: 0.0, coronaColor: '#ffd9a8', coronaWidth: 1.2, shellMotion: 0.0,
  // extras
  flare: 0.0, flareColor: '#cfe3ff', flareLen: 6, flareWidth: 0.06,
  jets: 0.0, jetColor: '#b8d4ff', jetLen: 18, jetWidth: 0.8,
  glow: 0.0, glowColor: '#ffb070',
  exposure: 1.0, form: 1.0, opacity: 1.0,
  // pair: a second hole orbiting a shared centre (never merging)
  pair: 0, pairRatio: 0.6, pairSep: 3.2, pairSpeed: 0.35, pairTilt: 0.35,
};

/* Presets matched to the extracted footage (id = library item). */
const P = (o) => Object.assign({}, BH_DEFAULTS, o);
const BH_PRESETS = {
  'quiet-dark':      P({ disk: 0, lens: 1.0 }),
  'cold-blue-rim':   P({ disk: 0, ring: 1.4, ringColor:'#bfe0ff', ringWidth: 0.2, corona: 0.55, coronaColor:'#5aa8ff', coronaWidth: 1.6, shellMotion: 0.8, glow: 0.05 }),
  'gargantua':       P({ rotX: 8, diskOut: 12, diskFalloff: 2.2, diskColorIn:'#fff6e6', diskColorOut:'#ff9a3c', diskBright: 1.8, diskStreaks: 0.85, doppler: 0.55, corona: 0.25 }),
  'gargantua-edge':  P({ rotX: 6, diskOut: 24, diskFalloff: 1.0, diskColorIn:'#ffffff', diskColorOut:'#e39a52', diskBright: 3.4, diskStreaks: 0.95, diskTexture: 0.5, doppler: 0.4, ring: 1.4, corona: 0.15, camDist: 22 }),
  'white-tilt':      P({ rotX: 28, rotZ: -18, diskOut: 13, diskFalloff: 1.0, diskColorIn:'#ffffff', diskColorOut:'#e8e4ff', diskBright: 3.4, diskStreaks: 0.9, doppler: 0.7, corona: 0.1, glow: 0.05 }),
  'blue-thin':       P({ rotX: 6, diskOut: 20, diskColorIn:'#e6f4ff', diskColorOut:'#4f8fe0', diskBright: 1.3, diskTexture: 0.85, diskStreaks: 0.4, clumps: 0.6, ring: 1.6, ringColor:'#cfe8ff', corona: 0.5, coronaColor:'#5c9cff', glow: 0.05 }),
  'orange-garg':     P({ rotX: 12, diskOut: 14, diskFalloff: 2.0, diskColorIn:'#fff0d8', diskColorOut:'#ff6a1a', diskBright: 3.0, diskStreaks: 0.6, ring: 1.6, ringColor:'#ffd6a0', corona: 0.5, coronaColor:'#ff8a3a', glow: 0.3, glowColor:'#ff6a20' }),
  'red-tilt':        P({ rotX: 30, rotZ: 14, diskOut: 18, diskColorIn:'#ffe2c0', diskColorOut:'#d0301a', diskBright: 1.9, diskTexture: 0.9, clumps: 0.4, doppler: 0.8, glow: 0.4, glowColor:'#ff3010' }),
  'purple-tilt':     P({ rotX: 32, rotZ: -24, diskOut: 20, diskColorIn:'#f6e8ff', diskColorOut:'#8a4dff', diskBright: 1.8, diskStreaks: 0.8, ring: 1.3, ringColor:'#e6d0ff', corona: 0.3, coronaColor:'#9a6bff' }),
  'violet-rim':      P({ disk: 0, ring: 1.2, ringColor:'#f0dcff', corona: 0.7, coronaColor:'#b77cff', coronaWidth: 1.8, glow: 0 }),
  'orange-corona':   P({ disk: 0, ring: 2.0, ringColor:'#ffe0b0', ringWidth: 0.3, corona: 1.2, coronaColor:'#ff8a30', coronaWidth: 2.4, shellMotion: 0.9, glow: 0.5, glowColor:'#ff6a20' }),
  'white-glow':      P({ disk: 0, ring: 1.3, ringColor:'#ffffff', corona: 0.8, coronaColor:'#e8eeff', coronaWidth: 1.8, flare: 0.6, flareColor:'#ffffff', flareLen: 3, glow: 0.1 }),
  'blue-flare':      P({ disk: 0, ring: 1.8, ringColor:'#eaf3ff', corona: 1.4, coronaColor:'#7fb2ff', coronaWidth: 2.2, flare: 1.2, flareColor:'#bcd6ff', flareLen: 10, flareWidth: 0.05 }),
  'edge-line':       P({ rotX: 0, diskOut: 40, diskColorIn:'#ffffff', diskColorOut:'#c8c4d8', diskBright: 0.9, diskTexture: 0.9, diskStreaks: 0.2, clumps: 0.8, ring: 0.6, corona: 0.15 }),
  'blue-eye':        P({ rotX: 72, diskOut: 9, diskColorIn:'#ffffff', diskColorOut:'#3d8cff', diskBright: 2.0, diskSwirl: 1.4, diskStreaks: 0.3, doppler: 0.3, ring: 1.4, ringColor:'#d6ecff', corona: 0.8, coronaColor:'#4c9dff' }),
  'blue-spiral':     P({ rotX: 82, diskIn: 3.6, diskOut: 14, diskColorIn:'#ffffff', diskColorOut:'#6aa6ff', diskBright: 1.8, diskSwirl: 2.2, arms: 3, armSharp: 7, diskTexture: 0.5, diskStreaks: 0.0, diskFalloff: 1.4, clumps: 0.0, doppler: 0.2, ring: 0.9, corona: 0.2, coronaColor:'#8ab8ff' }),
  'fire-disk':       P({ rotX: 26, rotZ: 38, diskIn: 3, diskOut: 13, diskColorIn:'#fffbe0', diskColorOut:'#ff5a0a', diskBright: 2.6, diskTexture: 1.0, clumps: 0.9, diskStreaks: 0.2, jets: 0.6, jetColor:'#ffe6b0', glow: 0.6, glowColor:'#ff6a10' }),
  'quasar':          P({ rotX: 20, diskOut: 12, diskColorIn:'#ffffff', diskColorOut:'#ffb070', diskBright: 3.0, jets: 1.2, jetColor:'#cfe0ff', flare: 0.8, glow: 0.8, glowColor:'#ffd090' }),
  'neon-garg':       P({ rotX: 10, diskOut: 15, diskColorIn:'#ffffff', diskColorOut:'#7a8cff', diskBright: 2.2, diskStreaks: 0.9, ring: 1.8, ringColor:'#e8f0ff', corona: 0.6, coronaColor:'#8fa4ff', glow: 0.2, glowColor:'#8090ff' }),
  'orange-pair':     P({ rotX: 12, diskOut: 8, diskColorIn:'#fff0d8', diskColorOut:'#ff7a2a', diskBright: 2.2, ring: 1.8, ringColor:'#ffd6a0', corona: 0.7, coronaColor:'#ff8a3a', glow: 0.3, pair: 1, pairRatio: 0.85, pairSep: 2.6 }),
  'blue-pair':       P({ disk: 0, ring: 1.6, ringColor:'#bfe0ff', ringWidth: 0.2, corona: 0.6, coronaColor:'#5aa8ff', coronaWidth: 1.6, glow: 0.05, pair: 1, pairRatio: 0.35, pairSep: 3.6, pairSpeed: 0.25 }),
  'purple-pair':     P({ disk: 0, ring: 0.6, ringColor:'#e6d0ff', corona: 0.4, coronaColor:'#9a6bff', glow: 0.2, glowColor:'#8a4dff', pair: 1, pairRatio: 0.9, pairSep: 2.4, pairSpeed: 0.5 }),
  'grey-lens':       P({ disk: 0, lens: 1.2, reach: 0.8 }),
};

const LIB_TO_PRESET = {
  'v1-purple-small':'quiet-dark','v1-thin-ring':'cold-blue-rim','v1-red-ring':'orange-corona','v1-garg-shorts':'gargantua','v1-garg-shorts2':'blue-spiral',
  'v1-white-tilt':'white-tilt','v1-earth-hole':'orange-garg','v1-mountain-ring':'orange-garg','v1-mountain-ring2':'white-tilt','v1-horizon-tilt':'orange-garg',
  'v1-garg-close':'gargantua','v1-garg-edge':'gargantua-edge','v1-garg-pass':'gargantua-edge','v1-disk-streaks':'gargantua-edge','v1-distant-white':'white-tilt',
  'v1-garg-big':'gargantua','v1-tde-arc':'gargantua-edge','v1-arc-debris':'gargantua-edge','v1-quasar-flash':'quasar','v1-purple-core':'purple-tilt','v1-purple-merge':'purple-pair',
  'v2-blue-thin':'blue-thin','v2-orange-pair':'orange-pair','v2-distant-ring':'edge-line','v2-galaxy-ring':'orange-garg','v2-quiet-lens':'grey-lens','v2-blue-spiral':'blue-spiral',
  'v3-faint-ring':'quiet-dark','v3-blue-wisp':'blue-thin','v3-orange-garg':'orange-garg','v3-einstein-small':'cold-blue-rim','v3-blue-flare':'blue-flare',
  'v3-white-tilt':'white-tilt','v3-quasar':'quasar','v3-nebula-garg':'orange-garg','v3-three-row':'blue-pair','v3-horizon-edge':'quiet-dark',
  'v4-red-tilt':'red-tilt','v4-pale-disk':'white-tilt','v4-neon-ring':'neon-garg','v4-thin-nebula':'gargantua-edge','v4-fire-disk':'fire-disk','v4-violet-rim':'violet-rim',
  'v5-blue-eye':'blue-eye','v5-grey-lens':'grey-lens','v5-orange-corona':'orange-corona','v5-blue-pair':'blue-pair','v5-purple-tilt':'purple-tilt','v5-crescent':'quiet-dark',
  'v5-einstein-galaxy':'grey-lens',
  'v6-quiet-glow':'white-glow','v6-forming':'orange-garg','v6-edge-line':'edge-line','v6-neon-garg':'neon-garg',
};

const VS = `#version 300 es
in vec2 a; out vec2 vUv; void main(){ vUv = a*0.5+0.5; gl_Position = vec4(a,0.,1.); }`;

const FS = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
#define MAXH ${MAXH}
uniform vec2 uRes; uniform float uTime;
uniform sampler2D uBgA, uBgB, uFaces; uniform float uBgMix; uniform vec4 uFitA, uFitB; uniform float uBgBright;
uniform int uN;
uniform vec4 uH0[MAXH];   // x,y (px), size(px), camDist
uniform mat3 uRot[MAXH];
uniform vec4 uH1[MAXH];   // lens, reach, faceAmt, form
uniform vec4 uH2[MAXH];   // disk, diskIn, diskOut, diskBright
uniform vec4 uH3[MAXH];   // falloff, texture, streaks, swirl
uniform vec4 uH4[MAXH];   // spin*dir, thick, opacity, doppler
uniform vec4 uH5[MAXH];   // temp, clumps, ring, ringWidth
uniform vec4 uH6[MAXH];   // corona, coronaWidth, shellMotion, glow
uniform vec4 uH7[MAXH];   // flare, flareLen, flareWidth, jets
uniform vec4 uH8[MAXH];   // jetLen, jetWidth, exposure, opacity
uniform vec4 uH9[MAXH];   // faceZoom, seed, -, -
uniform vec4 uFL[MAXH]; uniform vec4 uDust[MAXH]; uniform vec4 uCR[MAXH]; uniform vec4 uFA[MAXH];
uniform vec3 uCrestColor[MAXH], uSurfaceColor[MAXH];
uniform vec4 uSurfaceLight[MAXH]; // direction in camera coordinates, incident brightness
uniform vec4 uProfile[MAXH]; // projected disk axis xy, visible opening aspect z
 uniform vec4 uRefl; uniform vec4 uRefl2;   // reflection: amount, face size, gloss, rim sky | catchlight, face brightness, blur, -   // follower rule: funnel darkness, influence width (hole radii), swirl smear, edge glare
uniform vec4 uHF[MAXH]; uniform vec4 uFaceEdge; uniform float uEdgeW[MAXH]; uniform vec4 uEnv[MAXH]; uniform float uMutual;   // env: colorFromSky, sampleRadius, feedFromSky, -   // faceSphere, faceShade, -, -
uniform vec3 uCDin[MAXH], uCDout[MAXH], uCRing[MAXH], uCCor[MAXH], uCFlare[MAXH], uCJet[MAXH], uCGlow[MAXH], uCHor[MAXH];

float h21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
vec2 intoProfile(int i, vec2 d){
  vec4 p=uProfile[i]; vec2 q=vec2(d.x*p.x+d.y*p.y,-d.x*p.y+d.y*p.x);
  q.y/=max(p.z,.45); return vec2(q.x*p.x-q.y*p.y,q.x*p.y+q.y*p.x);
}
vec2 outOfProfile(int i, vec2 d){
  vec4 p=uProfile[i]; vec2 q=vec2(d.x*p.x+d.y*p.y,-d.x*p.y+d.y*p.x);
  q.y*=max(p.z,.45); return vec2(q.x*p.x-q.y*p.y,q.x*p.y+q.y*p.x);
}
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
float h31(vec3 p){ p=fract(p*vec3(.1031,.1030,.0973)); p+=dot(p,p.yxz+33.33); return fract((p.x+p.y)*p.z); }
float vn3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm3(vec3 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*vn3(p); p=p*2.02+vec3(3.1,1.7,9.2); a*=.5; } return s; }
float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*vnoise(p); p=p*2.03+vec2(1.7,9.2); a*=.5; } return s; }

vec2 bgUV(vec2 px, vec4 fit){ vec2 uv = px / uRes; vec2 a = (uv - .5) * fit.xy + .5 + fit.zw; return abs(mod(a+1.,2.)-1.); }
vec3 bgAtG(vec2 px, vec2 dx, vec2 dy){
  vec2 a = bgUV(px, uFitA), b = bgUV(px, uFitB);
  vec2 ga = dx / uRes * uFitA.xy, gb = dy / uRes * uFitA.xy;
  float m = 0.05; ga = clamp(ga, -m, m); gb = clamp(gb, -m, m);
  vec3 c = mix(textureGrad(uBgA, a, ga, gb).rgb, textureGrad(uBgB, b, ga, gb).rgb, uBgMix);
  return c * uBgBright;
}
/* disk emission at hole-frame point p, photon travelling along n (unit) */
float gCross = 0.; vec3 gEnvIn = vec3(1); vec3 gEnvOut = vec3(1); float gEnvK = 0.; float gFeed = 1.;
vec3 diskEm(int i, vec3 p, vec3 n, out float alpha){
  vec4 h2=uH2[i], h3=uH3[i], h4=uH4[i], h5=uH5[i];
  float form = uH1[i].w;
  float r = length(p.xz);
  float rIn = h2.y, rOut = mix(h2.y*1.2, h2.z, form);
  if(r < rIn*0.92 || r > rOut){ alpha = 0.; return vec3(0); }
  float t = uTime;
  float om = h4.x * 0.9 * pow(max(r,1.5), -1.5);
  float phi = atan(p.z, p.x) - om*t*6.0 + (uH9[i].z > 0.5 ? 0. : h3.w*log(r));
  float lr = log(r);
  vec2 cs = vec2(cos(phi), sin(phi));
  float sd = uH9[i].y;
  float turb = fbm3(vec3(lr*5.0 + sd, cs*2.2));
  float fine = fbm3(vec3(lr*70.0 + sd, cs*1.6));
  float fil = pow(clamp(fine*1.25,0.,1.), 2.2)*2.6;
  float streak = mix(1.0, 0.15 + fil, h3.z*(1.0-0.85*clamp(gCross,0.,1.)));
  // spiral arms (face-on swirls)
  float arms = uH9[i].z;
  if(arms > 0.5){ float ap = phi + uH3[i].w*(lr - log(rIn))*0.9; float aw = pow(0.5+0.5*cos(arms*ap + turb*1.2), uH9[i].w); streak *= mix(1.0, aw*2.2, clamp(uH9[i].w/2.0,0.,1.)); }
  float tex = mix(1.0, 0.35 + 1.3*turb, h3.y*(1.0-0.9*clamp(gCross,0.,1.))) * streak;
  float clump = h5.y > 0. ? smoothstep(.72, .92, vn3(vec3(lr*30., cs*9.))) * h5.y * 3. : 0.;
  float edgeIn = smoothstep(rIn*0.92, rIn*1.15, r);
  float edgeOut = 1.0 - smoothstep(rOut*0.55, rOut, r);
  float prof = pow(rIn / r, h3.x) * edgeIn * edgeOut;
  float I = h2.w * prof * (tex + clump) * form * gFeed;
  // relativistic: orbital velocity + gravitational redshift
  float beta = clamp(sqrt(0.5/max(r-1.0,0.6)), 0., 0.75) * sign(h4.x+1e-4);
  vec3 tang = normalize(vec3(-p.z, 0., p.x));
  float gam = 1.0/sqrt(1.0-beta*beta);
  float dop = 1.0/(gam*(1.0 - beta*dot(tang, n)));
  float g = dop * sqrt(max(1.0 - 1.0/r, 0.05));
  float gI = mix(1.0, pow(g, 3.5), h4.w);
  float x = clamp((r - rIn)/(rOut - rIn), 0., 1.);
  vec3 col = mix(mix(uCDin[i], gEnvIn, gEnvK), mix(uCDout[i], gEnvOut, gEnvK), pow(x, mix(0.3, 1.0, h5.x)));
  col = mix(col, col*vec3(0.75,0.85,1.25), clamp((g-1.0)*1.5*h4.w,0.,1.));
  col = mix(col, col*vec3(1.2,0.85,0.6), clamp((1.0-g)*1.2*h4.w,0.,1.));
  float dk = uDust[i].x;   // dark dust disk: absorbs the sky behind it instead of glowing
  alpha = clamp(I*3.5*(1.0 + dk*40.0), 0., h4.z);
  return col * I * gI * (1.0 - dk*0.8);
}

void main(){
  vec2 px = vec2(vUv.x, 1.-vUv.y) * uRes;   // y down, matches canvas px
  vec2 src = px;
  vec3 em = vec3(0); float T = 1.0; bool captured = false; int capI = -1; vec2 capD = vec2(0);
  vec3 overlay = vec3(0); float photonK = 0.; vec2 srcSmooth = px;
  // every hole bends the light of every other hole too: work out each hole's pull on this pixel first
  vec2 defl[MAXH]; vec2 deflSum = vec2(0);
  for(int j=0;j<MAXH;j++){
    defl[j] = vec2(0); if(j>=uN) continue;
    float sj = uH0[j].z / 2.598; vec2 dj = intoProfile(j,px - uH0[j].xy); float bj = max(length(dj)/sj, 2.75);
    float Dj = uH0[j].w, Lj = Dj * uH1[j].y; float kj = Lj*Dj/(Dj+Lj);
    float wj = exp(-max(bj - 2.6, 0.) / max(uEdgeW[j], 0.05));
    defl[j] = outOfProfile(j,-normalize(dj + 1e-4) * (2.0/bj + 2.945/(bj*bj)) * uH1[j].x * kj * sj * uH8[j].w * wj * uMutual);
    deflSum += defl[j];
  }

  for(int i=0;i<MAXH;i++){
    if(i>=uN) break;
    vec4 h0=uH0[i]; vec4 h1=uH1[i];
    float s = h0.z / 2.598;                  // px per r_s
    vec2 md = deflSum - defl[i]; md *= min(1.0, h0.z*0.35 / max(length(md), 1e-3));   // keep it smooth: no tearing
    vec2 d = intoProfile(i,px + md - h0.xy); // silhouette, disk and bent sky share one projected view
    float D = h0.w;
    float L = D * h1.y;
    float kk = L*D/(D+L);                    // lens geometry factor (r_s)
    float rTrace = max(16.0, uH2[i].z*1.15*uH2[i].x + 4.0);
    vec2 q = d / s;                          // r_s at hole plane
    float b = length(q);
    float hOp = uH8[i].w;
    // what this hole is sitting in: average the sky around it (blurred), so its glow and disk take that color
    gEnvK = uEnv[i].x; gFeed = 1.;
    if(gEnvK > 0.){
      vec3 env = vec3(0); float er = h0.z * uEnv[i].y;
      for(int k=0;k<8;k++){ float a = float(k)*0.785398; env += textureLod(uBgA, bgUV(h0.xy + vec2(cos(a),sin(a))*er, uFitA), 4.0).rgb; }
      env = env/8.0 * uBgBright;
      float mx = max(env.r, max(env.g, env.b)); float lum = dot(env, vec3(.3,.59,.11));
      vec3 hue = env / max(mx, 0.02);
      hue = mix(vec3(dot(hue, vec3(.333))), hue, 1.9);                 // a touch richer than the raw sky
      gEnvOut = clamp(hue, 0., 1.5); gEnvIn = mix(gEnvOut, vec3(1.0), 0.18);
      gFeed = mix(1.0, 0.35 + 1.6*sqrt(lum), uEnv[i].z);                // bright clouds feed a brighter disk
    }
    { float bb = max(b, 2.75); float alS = (2.0/bb + 2.945/(bb*bb)) * h1.x; float wS = exp(-max(bb - 2.6, 0.) / max(uEdgeW[i], 0.05));
      srcSmooth -= outOfProfile(i,normalize(d + 1e-4) * alS * kk * s * hOp * wS); }
    float wEdge = exp(-max(b - 2.6, 0.) / max(uHF[i].y > -1. ? uEdgeW[i] : 3.0, 0.05));   // keep the bending hugging the hole
    if(b > rTrace){
      float al = (2.0/b + 2.945/(b*b)) * h1.x;
      src -= outOfProfile(i,normalize(d) * al * kk * s * hOp * wEdge);
    } else {
      // exact null geodesic, camera frame -> hole frame
      mat3 R = uRot[i];
      vec3 pos = R * vec3(0,0,-D);
      vec3 v = R * normalize(vec3(q.x, -q.y, D));
      vec3 hv = cross(pos, v); float h2 = dot(hv,hv);
      float minR = 1e9; bool cap=false;
      vec3 jet = vec3(0);
      gCross = 0.;
      for(int k=0;k<320;k++){
        float r = length(pos);
        minR = min(minR, r);
        if(r < 1.0){ cap = true; break; }
        if(r > D*1.1 && dot(pos,v) > 0.) break;
        float dt = clamp(0.07*r*r/(r+3.0), 0.015, 1.2);
        // velocity-Verlet with a = -1.5 h^2 x / r^5 (exact Schwarzschild null orbits)
        vec3 acc = -1.5*h2*pos/pow(r,5.0);
        vec3 vh = v + 0.5*dt*acc;
        vec3 np = pos + dt*vh;
        float nr = length(np);
        vec3 nacc = -1.5*h2*np/pow(nr,5.0);
        v = vh + 0.5*dt*nacc;
        // disk plane crossing
        if(uH2[i].x > 0.5 && sign(np.y) != sign(pos.y)){
          float f = pos.y/(pos.y-np.y);
          vec3 c = mix(pos, np, f);
          float a; vec3 e = diskEm(i, c, -normalize(v), a);
          em += T*e; T *= (1.0-a); gCross += 1.0;
        }
        // thick disk haze
        if(uH2[i].x > 0.5 && uH4[i].y > 0.01){
          float rr = length(np.xz);
          float hz = uH4[i].y*0.25*rr;
          if(abs(np.y) < 2.5*hz && rr > uH2[i].y && rr < uH2[i].z){
            float a; vec3 e = diskEm(i, vec3(np.x,0.,np.z), -normalize(v), a);
            float w = exp(-pow(np.y/hz,2.0)) * dt * 0.06 / max(hz,0.05);
            em += T*e*w; T *= (1.0 - a*w);
          }
        }
        // relativistic jets along +-y
        if(uH7[i].w > 0.){
          float rho = length(np.xz); float ay = abs(np.y);
          float jw = uH8[i].y*(0.6 + ay*0.12);
          jet += mix(uCJet[i], gEnvIn, gEnvK*0.6) * uH7[i].w * exp(-pow(rho/jw,2.0)) * exp(-ay/uH8[i].x) * smoothstep(1.5,4.0,ay) * dt * 0.25;
        }
        pos = np;
      }
      em += T*jet;
      // the ball's edge: rays that only skim the shadow belong to the ball too, so there is no dark gap between the face and the bent sky
      if(!cap && uH1[i].z > 0. && minR < uFaceEdge.x){ cap = true; }
      if(cap){
        captured = true; capI = i; capD = d;
      } else {
        // where the ray lands on the background plane (camera frame)
        vec3 cp = transpose(R)*pos, cv = transpose(R)*normalize(v);
        vec2 hit;
        if(cv.z > 0.05){ float tt = (L - cp.z)/cv.z; hit = (cp.xy + cv.xy*tt); }
        else { hit = cv.xy/max(abs(cv.z),0.05) * (D+L); }
        hit.y = -hit.y;
        vec2 srcRel = hit * D/(D+L);         // back to hole-plane r_s
        photonK = max(photonK, smoothstep(2.0, 1.6, minR));
        vec2 straight = q;
        vec2 dTr = (srcRel - straight) * s * h1.x * hOp;
        float alW = (2.0/max(b,1.0) + 2.945/max(b*b,1.0)) * h1.x;
        vec2 dWk = -normalize(d + 1e-4) * alW * kk * s * hOp;
        src += outOfProfile(i,mix(dTr, dWk, smoothstep(rTrace*0.55, rTrace, b))) * wEdge;
        // photon shell + corona from closest approach
        float ring = uH5[i].z * exp(-(minR-1.5)/max(uH5[i].w,0.01));
        float ang = atan(q.y,q.x);
        float shell = mix(1.0, 0.45+1.1*fbm(vec2(ang*2.0 - uTime*1.3, uTime*0.4) + uH9[i].y), uH6[i].z);
        float cor = uH6[i].x * exp(-(minR-1.5)/max(uH6[i].y,0.01)) * shell;
        em += T*(mix(uCRing[i], gEnvIn, gEnvK)*ring*shell + mix(uCCor[i], gEnvOut, gEnvK)*cor) * h1.w * gFeed;
      }
    }
    // screen-space glow + anamorphic flare
    float dl = length(d)/h0.z;
    overlay += mix(uCGlow[i], gEnvOut, gEnvK) * gFeed * uH6[i].w * exp(-max(dl-1.0,0.)*1.6) * smoothstep(0.98,1.15,dl) * 0.6 * h1.w;
    if(uH7[i].x > 0.){
      float fx = abs(d.x)/(h0.z*uH7[i].y), fy = abs(d.y)/(h0.z*uH7[i].z);
      overlay += uCFlare[i] * uH7[i].x * exp(-fy) * exp(-fx*1.5) * h1.w;
    }
    em *= 1.0;
  }
  // filter the bent sky by how much it is squeezed here (no glitter at the photon ring)
  vec2 sdx = dFdx(src), sdy = dFdy(src);
  photonK = max(photonK, smoothstep(14.0, 45.0, max(length(sdx), length(sdy))));   // sky squeezed so hard it would glitter
  // right at the photon ring the sky is squeezed into razor-thin copies that glitter as the hole moves: smooth them into a soft, dim band
  float blurPx = photonK * 24.0;
  sdx = sdx + vec2(blurPx, 0.); sdy = sdy + vec2(0., blurPx);
  vec3 skyC = mix(bgAtG(src, sdx, sdy), bgAtG(srcSmooth, dFdx(srcSmooth), dFdy(srcSmooth)), smoothstep(0.15, 0.85, photonK));
  // follower rule (like the reference): stars smeared round the hole, space sinking into a darker inward curve just before the black, a soft glare on the rim
  if(!captured){
    for(int i=0;i<MAXH;i++){ if(i>=uN) break; vec4 fl = uFL[i]; vec4 cr = uCR[i]; if(fl.x + fl.z + fl.w + cr.x <= 0.) continue;
      vec2 c = uH0[i].xy; float R = uH0[i].z; vec2 projected=intoProfile(i,px-c); float dlc = length(projected) / R; float W = max(fl.y, 1.2);
      // tilted holes: the warp zone follows the disk plane, so it is an ellipse, not a perfect circle
      vec4 fa = uFA[i]; vec2 q0 = px - c; vec2 qe = vec2(q0.x*fa.x + q0.y*fa.y, -q0.x*fa.y + q0.y*fa.x); qe.y /= max(fa.z, 0.2);
      float dl = max(length(qe) / R, dlc);
      if(dl > W) continue;
      float t = clamp((W - dl) / (W - 1.0), 0., 1.);

      if(fl.z > 0.){ vec2 rel = src - c; float a = fl.z * 0.55 * pow(t, 1.4); vec3 acc = skyC; float n = 1.;
        for(int k=1;k<=5;k++){ float aa = a * float(k) / 5.; float cs = cos(aa), sn = sin(aa);
          acc += bgAtG(c + mat2(cs, sn, -sn, cs) * rel, sdx, sdy); acc += bgAtG(c + mat2(cs, -sn, sn, cs) * rel, sdx, sdy); n += 2.; }
        skyC = mix(skyC, acc / n, clamp(fl.z, 0., 1.)); }
      float f = pow(t, 1.8);                                   // gentle far out, curving down hard right before the edge
      skyC *= 1.0 - fl.x * f;
      // A smooth crest needs incident light and an inclined disk. No ambient rim,
      // fixed upper-left light, or independent sparkle animation.
      if(cr.x > 0.){ vec2 dd = projected; float an = atan(dd.y, dd.x);
        float side = pow(max(0., cos(an - cr.y)), max(cr.w, 1.));
        float width = max(cr.z, max(0.9 / max(R, 1.),fwidth(dlc)*0.8));
        float band = exp(-pow((dlc - 1.0 - width * 1.35) / width, 2.));
        skyC += uCrestColor[i] * cr.x * side * band;
        if(fl.w > 0.) skyC += uCrestColor[i] * cr.x * side * fl.w * 0.2 * exp(-pow((dlc - 1.04) / (width * 2.5), 2.)); }
    }
  }
  vec3 col;
  if(captured){
    vec3 hor = uCHor[capI];
    float fa = uH1[capI].z;
    if(fa > 0.){
      float rr = uH0[capI].z * uH9[capI].x * uFaceEdge.y;
      vec2 q = capD/rr;                                   // -1..1 across the face disk
      float qr = length(q);
      // wrap the face around a ball: squeeze toward the rim like a globe, and shade the edge
      // real globe: the face is painted on the front of a ball (longitude/latitude), so it squeezes hard toward the rim
      vec3 nb = vec3(q.x, -q.y, sqrt(max(0., 1. - qr*qr)));
      float turn = sin(uTime * 0.6 + uH9[capI].y) * uHF[capI].z;       // gentle left/right turn of the ball
      float lon = atan(nb.x, nb.z) + turn, lat = asin(clamp(nb.y, -1., 1.));
      vec2 globe = vec2(lon, -lat) / 1.5708 * uHF[capI].w;            // face covers +-90deg * coverage
      vec2 qs = mix(q, globe, uHF[capI].x);
      vec2 fuv = qs*0.5 + 0.5;
      float cell = float(capI);
      vec2 auv = vec2((mod(cell,4.0) + clamp(fuv.x,0.,1.))/4.0, (floor(cell/4.0) + clamp(fuv.y,0.,1.))/2.0);
      vec3 fc = texture(uFaces, auv).rgb;
      if(uRefl.x > 0.){
        // the hole is a perfectly round, glossy black ball: the face is a reflection on the side facing us, like a pupil
        vec2 p2 = capD / uH0[capI].z; float pr = min(length(p2), 0.999);
        vec3 n = vec3(p2.x, -p2.y, sqrt(max(0., 1. - pr*pr)));
        vec3 rf = reflect(vec3(0,0,-1), n);                               // what this point of the ball mirrors
        vec2 m = rf.xy / (1.0 + max(rf.z, -0.95));                        // sphere-map: squeezes hard toward the rim
        vec2 fu = clamp(vec2(m.x, -m.y) / max(uRefl.y, 0.05) * 0.5 + 0.5, 0., 1.);
        vec2 auv2 = vec2((mod(cell,4.0) + fu.x)/4.0, (floor(cell/4.0) + fu.y)/2.0);
        vec3 face = textureLod(uFaces, auv2, uRefl2.z).rgb;
        float win = smoothstep(1.0, 0.72, length(m) / max(uRefl.y, 0.05)) * smoothstep(-0.2, 0.45, rf.z);
        // the rest of the ball mirrors the sky around the hole, swept round the curve
        vec3 sky = bgAtG(uH0[capI].xy + vec2(rf.x, -rf.y) * uH0[capI].z * 3.5, vec2(6.,0.), vec2(0.,6.));
        float fres = 0.05 + 0.95 * pow(1.0 - n.z, 4.0);
        vec3 c = face * uRefl2.y * win * (0.55 + 0.45 * n.z);
        vec4 light = uSurfaceLight[capI];
        float mirror = light.w * pow(max(dot(rf, normalize(light.xyz + vec3(0.,0.,1e-5))), 0.), 6.);
        c += sky * fres * uRefl.w * mirror * (1.0 - win * 0.85);
        c *= smoothstep(1.0, 0.94, pr);                                   // crisp dark edge of the ball
        fc = c;
        hor = mix(hor, fc, fa);
      }

      if(uRefl.x <= 0.){
      float z = sqrt(max(0., 1. - qr*qr));
      vec4 light = uSurfaceLight[capI];
      float lam = max(0., dot(nb, normalize(light.xyz + vec3(0.,0.,1e-5)))) * min(light.w, 1.);
      float limb = pow(nb.z, 0.9);                                     // edges of the ball fall into shadow
      float shade = mix(1.0, (0.65 + 0.5*lam) * (0.55 + 0.45*limb), uHF[capI].y);
      fc = fc * shade;
      float edge = smoothstep(1.0, 0.985, qr);
      fc *= mix(1.0, 0.0, uHF[capI].y * smoothstep(0.86, 1.0, qr) * 0.0);
      hor = mix(hor, fc, fa*edge);
      }
    }
    // A nearby visible source can reflect on a head-on ball too. This lobe follows
    // that source, and has exactly zero energy when no source is present.
    vec4 light = uSurfaceLight[capI];
    if(light.w > 0. && uRefl.x > 0.){
      vec2 p = capD / uH0[capI].z; float pr = min(length(p), 0.999);
      vec3 n = normalize(vec3(p.x, -p.y, sqrt(max(0., 1. - pr*pr))));
      vec3 rf = reflect(vec3(0,0,-1), n);
      float sp = pow(max(dot(rf, normalize(light.xyz)), 0.), 70. / max(uRefl.z, 0.1));
      hor += uSurfaceColor[capI] * light.w * sp * (uRefl.w + uRefl2.x) * smoothstep(1., 0.94, pr);
    }
    col = hor + em;
  } else {
    col = skyC + em;
  }
  // per-hole exposure folded globally (holes rarely overlap)
  float ex = 1.0; for(int i=0;i<MAXH;i++){ if(i>=uN) break; float dl=length(px-uH0[i].xy)/uH0[i].z; ex = mix(ex, uH8[i].z, smoothstep(12.0,3.0,dl)); }
  // emission tone-mapped, background left untouched
  vec3 base = captured ? col - em : skyC;
  vec3 lit = (em + overlay) * ex;
  lit = 1.0 - exp(-lit*1.6);
  vec3 outc = base*T*(captured?1.0:1.0) + lit*(1.0 - 0.5*clamp(dot(base*T,vec3(.33)),0.,1.));
  o = vec4(outc, 1.0);
}`;

function hex(c){ c=c.replace('#',''); if(c.length===3) c=c.split('').map(x=>x+x).join(''); const n=parseInt(c,16); return [(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]; }
function lin(c){ return hex(c).map(v=>Math.pow(v,2.0)); }
function rotM(rx,ry,rz){ // degrees -> mat3 (column-major) mapping camera frame -> hole frame
  const a=rx*Math.PI/180,b=ry*Math.PI/180,c=rz*Math.PI/180;
  const ca=Math.cos(a),sa=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b),cc=Math.cos(c),sc=Math.sin(c);
  const X=[1,0,0, 0,ca,sa, 0,-sa,ca], Y=[cb,0,-sb, 0,1,0, sb,0,cb], Z=[cc,sc,0, -sc,cc,0, 0,0,1];
  const mul=(A,B)=>{const R=new Array(9);for(let i=0;i<3;i++)for(let j=0;j<3;j++){let s=0;for(let k=0;k<3;k++)s+=A[k*3+i]*B[j*3+k];R[j*3+i]=s;}return R;};
  return mul(X,mul(Y,Z));
}

// Lighting uses the same orientation as the ray-traced disk (its normal is +Y).
// rotX=90 is face-on; rotX=0 is edge-on. A dark/distortion-only disk emits no light.
function surfaceLighting(h, holes, pixels, sceneW, sceneH, rule = {}) {
  const limit = (x, a=0, b=1) => Math.max(a, Math.min(b, x));
  const smooth = (a,b,x) => { const t=limit((x-a)/(b-a)); return t*t*(3-2*t); };
  const lum = c => c[0]*0.2126+c[1]*0.7152+c[2]*0.0722;
  const visible = q => limit(q.form ?? 1)*limit(q.opacity ?? 1);
  const radiance = q => (q.disk > 0 && !(q.dust > 0)) ? Math.max(0,q.disk)*Math.max(0,q.diskBright ?? 0)*limit(q.diskOpacity ?? 1)*visible(q) : 0;
  const cx=h.x*sceneW, cy=h.y*sceneH, radius=Math.max(1,h.size);
  const read = (x,y) => {
    if(!pixels || x<0 || y<0 || x>=sceneW || y>=sceneH) return [0,0,0];
    const fx=limit(x/sceneW*78-.5,0,77), fy=limit(y/sceneH*169-.5,0,168);
    const x0=Math.floor(fx), y0=Math.floor(fy), tx=fx-x0, ty=fy-y0, c=[0,0,0];
    for(let dy=0;dy<2;dy++) for(let dx=0;dx<2;dx++) {
      const at=(Math.min(168,y0+dy)*78+Math.min(77,x0+dx))*4, w=(dx?tx:1-tx)*(dy?ty:1-ty);
      for(let j=0;j<3;j++) c[j]+=pixels[at+j]/255*w;
    } return c;
  };
  const samples=[], mean=[0,0,0];
  for(let k=0;k<32;k++) for(const reach of [1.3,1.65,2,2.5,3.2,4]) {
    const a=k*Math.PI/16, dx=Math.cos(a), dy=Math.sin(a), c=read(cx+dx*radius*reach,cy+dy*radius*reach);
    samples.push({dx,dy,c,l:lum(c),reach}); for(let j=0;j<3;j++) mean[j]+=c[j]/192;
  }
  // A diffuse sky is not an extra lamp. Require a bright, localized patch.
  const threshold=Math.max(.42,lum(mean)+.16);
  let strongest=null, score=0;
  for(const p of samples) {
    p.energy=Math.max(0,p.l-threshold)*smooth(threshold,threshold+.16,p.l)*3/(p.reach*p.reach);
    if(p.energy>score) { strongest=p; score=p.energy; }
  }
  let direction=[0,0,1], color=[0,0,0], strength=0;
  if(strongest) {
    let dx=0,dy=0,sum=0; const rgb=[0,0,0];
    for(const p of samples) {
      const alignment=p.dx*strongest.dx+p.dy*strongest.dy;
      const e=p.energy*smooth(.8,1,alignment);
      dx+=p.dx*e; dy+=p.dy*e; sum+=e; for(let j=0;j<3;j++) rgb[j]+=p.c[j]*e;
    }
    const len=Math.max(1e-6,Math.hypot(dx,dy)); direction=[dx/len,-dy/len,.25];
    color=rgb.map(v=>v/Math.max(sum,1e-6)); strength=Math.min(1.5,score*3);
  }
  // Other glowing holes are explicit light sources, with distance falloff.
  for(const other of holes) {
    if(other===h) continue;
    const dx=(other.x-h.x)*sceneW, dy=(other.y-h.y)*sceneH, d=Math.hypot(dx,dy);
    if(d<=radius+Math.max(1,other.size)*.5) continue;
    const power=radiance(other)+((other.glow||0)*.5+(other.ring||0)*.15+(other.corona||0)*.2)*visible(other);
    const energy=power*Math.pow(Math.max(1,other.size)/Math.max(d-radius,1),2);
    if(energy>strength) { direction=[dx/d,-dy/d,.25]; strength=Math.min(1.5,energy); color=hex(other.disk>0?other.diskColorIn:(other.glowColor||other.ringColor||'#000000')); }
  }
  const norm=Math.hypot(...direction); direction=direction.map(v=>v/norm);
  strength*=visible(h);
  const R=rotM(h.rotX||0,h.rotY||0,h.rotZ||0), nx=R[1], ny=R[4];
  const inclination=smooth(.3,.85,Math.hypot(nx,ny));
  let diskColor=lin(h.diskColorIn||'#000000');
  const mx=Math.max(...mean,.02), env=mean.map(v=>v/mx*.82+.18);
  diskColor=diskColor.map((v,j)=>v*(1-limit(h.envColor||0))+env[j]*limit(h.envColor||0));
  const diskPower=radiance(h)*lum(diskColor)*.65;
  const flip=R[7]>0?-1:1;
  // The crest belongs to the exposed upper rim, never to the brightest star's
  // screen position. A passing light can illuminate that rim or reflect inside it.
  const crestAngle=Math.atan2(-ny*flip,nx*flip);
  const alignment=Math.max(0,direction[0]*Math.cos(crestAngle)-direction[1]*Math.sin(crestAngle));
  const outsidePower=strength*alignment*alignment, crestPower=diskPower+outsidePower;
  const crestColor=diskColor.map((v,j)=>(v*diskPower+color[j]*outsidePower)/Math.max(crestPower,1e-6)), span=2.8;
  return {
    crest: [Math.min(2,crestPower)*inclination*Math.max(0,rule.crest??1.4),crestAngle,rule.crestWidth??.025,span],
    crestColor,
    exposedRim: inclination,
    surfaceLight: [...direction,strength], surfaceColor: color,
  };
}

function projectedProfile(h) {
  const R=rotM(h.rotX||0,h.rotY||0,h.rotZ||0), p=Math.hypot(R[1],R[4]);
  const axis=p>1e-5?[R[4]/p,R[1]/p]:[1,0];
  const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
  const elevation=Math.abs(R[7]);
  // Art-directed apparent opening: grazing view is a dome cut by its foreground
  // disk, oblique view is an oval, overhead view becomes round. Footage keeps its own silhouette.
  const aspect=h._vi>=0?1:(h.openingAspect??(1-.38*smooth(.18,.48,elevation)*(1-smooth(.82,1,elevation))));
  return [...axis,Math.max(.45,Math.min(1,aspect)),0];
}

function settleLighting(next, previous, dt) {
  const step=Math.max(0,Math.min(.05,dt||0)), mix=(a,b,k)=>a+(b-a)*k;
  const out={...next,crest:[...next.crest],crestColor:[...next.crestColor],surfaceLight:[...next.surfaceLight],surfaceColor:[...next.surfaceColor]};
  if(!previous) {out.crest[0]=0;out.surfaceLight[3]=0;return out;}
  const ease=(seconds)=>1-Math.exp(-step/seconds);
  const angle=(a,b,k)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*k;
  out.crest[0]=mix(previous.crest[0],next.crest[0],ease(next.crest[0]>previous.crest[0]?1.8:1.1));
  if(next.exposedRim===0)out.crest[0]=0;
  out.crest[1]=angle(previous.crest[1],next.crest[1],ease(2.8));
  if(next.crest[0]===0 && out.crest[0]<.002)out.crest[0]=0;
  out.surfaceLight[3]=mix(previous.surfaceLight[3],next.surfaceLight[3],ease(next.surfaceLight[3]>previous.surfaceLight[3]?1.5:.8));
  if(next.surfaceLight[3]===0&&out.surfaceLight[3]<.002)out.surfaceLight[3]=0;
  const oldA=Math.atan2(previous.surfaceLight[1],previous.surfaceLight[0]);
  let target=Math.atan2(next.surfaceLight[1],next.surfaceLight[0]);
  const gap=Math.abs(Math.atan2(Math.sin(target-oldA),Math.cos(target-oldA)));
  let held=previous._candidateTime||0;
  if(gap>Math.PI/3 && previous.surfaceLight[3]>.02 && next.surfaceLight[3]>0){
    const last=previous._candidateAngle??target;
    held=Math.abs(Math.atan2(Math.sin(target-last),Math.cos(target-last)))<.3?held+step:0;
    out._candidateAngle=target;out._candidateTime=held;
    if(held<2.5)target=oldA;
  }else out._candidateTime=0;
  const a=angle(oldA,target,ease(2.8));
  out.surfaceLight[0]=Math.cos(a)*.9701425;out.surfaceLight[1]=Math.sin(a)*.9701425;out.surfaceLight[2]=.2425356;
  for(let j=0;j<3;j++){
    out.crestColor[j]=mix(previous.crestColor[j],next.crestColor[j],ease(1.4));
    out.surfaceColor[j]=mix(previous.surfaceColor[j],next.surfaceColor[j],ease(1.4));
  }
  return out;
}

const ANGLE_STUDIES={
  low:{label:'Low across the disk',rotX:7,rotY:0,rotZ:8,openingAspect:1,disk:1,diskIn:2.6,diskOut:20,diskBright:2.6,diskOpacity:1,diskFalloff:1.3,diskThick:.12,diskTexture:.92,diskStreaks:.7,diskSpin:.4,doppler:.35,diskColorIn:'#fff2cf',diskColorOut:'#db6e21',ring:0,corona:0,glow:0,camDist:22},
  diagonal:{label:'Looking down diagonally',rotX:38,rotY:0,rotZ:-37,openingAspect:.66,disk:1,diskIn:2.5,diskOut:9,diskBright:2.6,diskOpacity:1,diskFalloff:1.4,diskThick:.08,diskTexture:.92,diskStreaks:.7,diskSpin:.4,doppler:.35,diskColorIn:'#fff0c7',diskColorOut:'#e55c12',ring:0,corona:0,glow:0,camDist:28}
};

class BHScene {
  constructor(canvas, opts={}){
    this.canvas = canvas; this.scale = opts.scale || 1; this.holes = []; this.t0 = performance.now(); this.timeScale = 1; this.paused=false; this.time=0;
    const gl = this.gl = canvas.getContext('webgl2', {antialias:false, premultipliedAlpha:false, preserveDrawingBuffer:true});
    if(!gl) throw new Error('WebGL2 not available');
    const sh=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(o));return o;};
    const p=this.prog=gl.createProgram(); gl.attachShader(p,sh(gl.VERTEX_SHADER,VS)); gl.attachShader(p,sh(gl.FRAGMENT_SHADER,FS)); gl.linkProgram(p);
    if(!gl.getProgramParameter(p,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    gl.useProgram(p);
    const buf=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buf); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    const loc=gl.getAttribLocation(p,'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    this.u={}; const n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);
    for(let i=0;i<n;i++){const info=gl.getActiveUniform(p,i); const nm=info.name.replace('[0]',''); this.u[nm]=gl.getUniformLocation(p,info.name);}
    this.tex={A:this._mkTex(),B:this._mkTex(),F:this._mkTex()};
    this.bg={A:null,B:null,mix:0,fitA:[1,1,0,0],fitB:[1,1,0,0],bright:1};
    this._faceCanvas=document.createElement('canvas'); this._faceCanvas.width=2048; this._faceCanvas.height=1024; this.faces=[];
    this._uploadFaces();
  }
  _mkTex(){const gl=this.gl,t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([4,6,12,255]));
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;}
  _upload(t,src){const gl=this.gl;gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
    try{gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,src);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);}catch(e){}}
  /* slot 'A' or 'B'; src = image, video or canvas */
  setBackground(slot, src){ this.bg[slot]=src; if(src && !(src instanceof HTMLVideoElement)) this._upload(this.tex[slot],src); }
  setFace(i, img){ this.faces[i]=img; this._uploadFaces(); }
  _uploadFaces(){ const c=this._faceCanvas,x=c.getContext('2d'); x.fillStyle='#000'; x.fillRect(0,0,2048,1024);
    this.faces.forEach((im,i)=>{ if(!im) return; const cx=(i%4)*512, cy=Math.floor(i/4)*512; const s=Math.max(512/im.width,512/im.height);
      const w=im.width*s,h=im.height*s; x.save(); x.beginPath(); x.rect(cx,cy,512,512); x.clip(); x.drawImage(im,cx+(512-w)/2,cy+(512-h)/2,w,h); x.restore(); });
    this._upload(this.tex.F,c); }
  coverFit(slot, pan=[0,0], zoom=1){ // keep background aspect, cover the canvas
    const src=this.bg[slot]; if(!src) return; const iw=src.videoWidth||src.naturalWidth||src.width, ih=src.videoHeight||src.naturalHeight||src.height;
    const ca=this.canvas.width/this.canvas.height, ia=iw/ih; let sx=1,sy=1; if(ca>ia) sy=ia/ca; else sx=ca/ia;
    this.bg['fit'+slot]=[sx/zoom,sy/zoom,pan[0],pan[1]]; }
  resize(w,h){ const c=this.canvas; c.width=Math.round(w*this.scale); c.height=Math.round(h*this.scale); this.cssW=w; this.cssH=h; this.gl.viewport(0,0,c.width,c.height); }
  render(time){
    const gl=this.gl,u=this.u; if(time===undefined){ const now=performance.now(); if(!this.paused) this.time += (now-(this._last||now))/1000*this.timeScale; this._last=now; time=this.time; }
    for(const s of ['A','B']){ const v=this.bg[s]; if(v instanceof HTMLVideoElement && v.readyState>=2) this._upload(this.tex[s],v); }
    gl.uniform2f(u.uRes,this.canvas.width,this.canvas.height); gl.uniform1f(u.uTime,time);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,this.tex.A); gl.uniform1i(u.uBgA,0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D,this.tex.B); gl.uniform1i(u.uBgB,1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D,this.tex.F); gl.uniform1i(u.uFaces,2);
    gl.uniform1f(u.uBgMix,this.bg.mix); gl.uniform4fv(u.uFitA,this.bg.fitA); gl.uniform4fv(u.uFitB,this.bg.fitB); gl.uniform1f(u.uBgBright,this.bg.bright);
    const H=this.holes.slice(0,MAXH), n=H.length, sc=this.scale;
    const A=(k,f)=>{const arr=new Float32Array(MAXH*4); H.forEach((h,i)=>arr.set(f(h,i),i*4)); gl.uniform4fv(u[k],arr);};
    const C=(k,f)=>{const arr=new Float32Array(MAXH*3); H.forEach((h,i)=>arr.set(f(h),i*3)); gl.uniform3fv(u[k],arr);};
    gl.uniform1i(u.uN,n);
    A('uH0',h=>[h.x*this.canvas.width, h.y*this.canvas.height, h.size*sc, h.camDist]);
    A('uProfile',h=>projectedProfile(h));
    const R=new Float32Array(MAXH*9); H.forEach((h,i)=>R.set(rotM(h.rotX,h.rotY,h.rotZ),i*9)); gl.uniformMatrix3fv(u.uRot,false,R);
    A('uH1',h=>[h.lens,h.reach,h.faceAmt,h.form]);
    A('uH2',h=>[h.disk,h.diskIn,h.diskOut,h.diskBright]);
    A('uH3',h=>[h.diskFalloff,h.diskTexture,h.diskStreaks,h.diskSwirl]);
    A('uH4',h=>[h.diskSpin*(h.diskDir<0?-1:1),h.diskThick,h.diskOpacity,h.doppler]);
    A('uH5',h=>[h.temp,h.clumps,h.ring,h.ringWidth]);
    A('uH6',h=>[h.corona,h.coronaWidth,h.shellMotion,h.glow]);
    A('uH7',h=>[h.flare,h.flareLen,h.flareWidth,h.jets]);
    A('uH8',h=>[h.jetLen,h.jetWidth,h.exposure,h.opacity]);
    gl.uniform4f(u.uFaceEdge, this.faceEdge ?? 1.0, this.faceScale ?? 1.0, 0, 0); { const R = this.refl || {}; gl.uniform4f(u.uRefl, R.on === false ? 0 : 1, R.size ?? 0.75, R.gloss ?? 1, R.rimSky ?? 0.8); gl.uniform4f(u.uRefl2, R.catch ?? 0.9, R.bright ?? 0.85, R.blur ?? 0.6, 0); }
    { const ew = new Float32Array(MAXH); H.forEach((h,i)=>ew[i] = h.edgeWidth ?? 3); gl.uniform1fv(u.uEdgeW, ew); }
    gl.uniform1f(u.uMutual, this.mutual ?? 0.6);
    A('uEnv',h=>[h.envColor ?? 0, h.envRadius ?? 2.4, h.envFeed ?? 0, 0]);
    A('uHF',h=>[h.faceSphere ?? 0, h.faceShade ?? 0, h.faceTurn ?? 0, h.faceCover ?? 1.0]);
    A('uFL',h=>h.fl||[0,3.6,0,0]); A('uDust',h=>[h.dust||0,0,0,0]); A('uCR',h=>h.crest||[0,0,0.02,0]); A('uFA',h=>h.fa||[1,0,1,0]);
    C('uCrestColor',h=>h.crestColor||[0,0,0]);
    A('uSurfaceLight',h=>h.surfaceLight||[0,0,1,0]); C('uSurfaceColor',h=>h.surfaceColor||[0,0,0]);
    A('uH9',(h,i)=>[h.faceZoom,(h.seed!==undefined?h.seed:i*7.31),h.arms||0,h.armSharp||3]);
    C('uCDin',h=>lin(h.diskColorIn)); C('uCDout',h=>lin(h.diskColorOut)); C('uCRing',h=>lin(h.ringColor)); C('uCCor',h=>lin(h.coronaColor));
    C('uCFlare',h=>lin(h.flareColor)); C('uCJet',h=>lin(h.jetColor)); C('uCGlow',h=>lin(h.glowColor)); C('uCHor',h=>lin(h.horizonColor));
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  }
}

G.BH = { BHScene, BH_DEFAULTS, BH_PRESETS, LIB_TO_PRESET, MAXH, rotM, surfaceLighting, projectedProfile, settleLighting, ANGLE_STUDIES };
})(window);
