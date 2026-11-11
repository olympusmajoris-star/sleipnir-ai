/* Raven page runtime — the same code runs in the studio preview and in the app (Get Dart).
   Sky (background layers + real-lensing black holes) + sphere + 3D bust rolodex + message tabs. */
(function (G) {
'use strict';
const W = 390, H = 844;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);

const DEFAULT_SETTINGS = {
  bg: {
    layers: [], cycleSeconds: 20, blendSeconds: 8, randomOrder: false, randomTime: false,
    fadeStart: 0.42, fadeEnd: 0.7, fadeColor: '#000000', fadeAmount: 1.0, skyDim: 1.0, drift: 0.25,
    pan: false, panSpeedX: -12, panSpeedY: 0,
    starsOn: false, stars: 300, starSize: 1.2, starColor: '#badce9', starFadeStart: 0.12, starFadeEnd: 0.43, twinkle: 0.4,
  },
  holes: {
    mode: 'sky',                 // sky | focus
    active: 'friends',
    selTier: 0,
    dashboards: null,            // filled by ensureDashboards
    behavior: {
      count: 4, speed: 9, direction: 1, driftViews: true, warpApart: 0.75, capture: 1, captureRatio: 0.7, orbitTime: 14, orbitSpeed: 0.3, sling: 1.3, bandTop: 0.03, bandBottom: 0.42, minGap: 14, interact: 0.5,
      wobble: 0.35, formSeconds: 2.5, sizeScale: 1.0, nameTabs: true, tabColor: '#5fd4ff', tabText: '#e8f6ff', tabSize: 10,
      lensAll: 1.0, renderScale: 0.75, autoQuality: true,
    },
    focus: { x: 0.5, y: 0.2 },
    friendSize: { auto: true, min: 33, max: 66 },
    liveViews: true,
    refl: { on: true, size: 0.7, gloss: 0.7, rimSky: 0.5, catch: 0, bright: 0.8, blur: 0.6 },
    gas: { on: true, bright: 1, speed: 1, scale: 1.1, layers: [
      { src: 'gas/dust_lanes.webp', a: 0.8, sp: 3, y: 0.0 }, { src: 'gas/gas_teal.webp', a: 0.7, sp: 5, y: 0.12 }, { src: 'gas/gas_amber.webp', a: 0.7, sp: 7, y: -0.08 },
      { src: 'gas/gas_magenta.webp', a: 0.6, sp: 4, y: 0.2 }, { src: 'gas/gas_mixed.webp', a: 0.75, sp: 10, y: 0.05 } ] },
    rule: { on: true, lens: 0.9, reach: 0.6, edge: 1.6, taper: 0.7, funnel: 0.45, width: 3.8, smear: 0.7, glare: 0.9, tiltMin: 4, tiltMax: 70, tumble: 0.4, tumbleSpeed: 0.12, dustFrom: 3, dust: 0, dustSize: 1.6, dustSpin: 0.6, crest: 2.2, crestWidth: 0.035 },
    clips: { on: true, scale: 1, bright: 1, turn: 1 },
    feed: { on: false, ambient: 5, pull: 1, pieceSize: 1, spiralSeconds: 7, amount: 1, drift: 6 },
    callout: {
      on: true, auto: true, angle: -40, len1: 16, len2: 14, lineWidth: 0.9, lineColor: '#79dbff', lineOpacity: 0.9, lineGlow: 1.5,
      tabColor: '#79dbff', tabFill: '#123345', tabOpacity: 0.7, tabGlow: 1.2, corners: 4, padX: 6, padY: 3, border: 1,
      nameSize: 10, nameColor: '#e8f6ff', nameBold: true, showCount: true, countSize: 9, countColor: '#59eaff', countLabel: '', countFormat: 'short',
      dodge: 1.0, smooth: 4,
    },
  },
  sphere: {
    x: 0.55, y: 0.67, r: 0.45, spin: 0.08, tilt: 23.4, texture: 'ui/sphere_red.jpg', texRepeat: 2, ambient: 0.03,
    tabLight: 1.15, lightWidth: 0.06, lightHeight: 0.06, tint: false, tintColor: '#59eaff', limb: 0.6, lightColor: '', body: 1,
    rim: '#6fd6ff', rimLight: 0.0, show: true, topLight: 1.2, topSharp: 3, topToward: 0.6, topSide: 0, topColor: '#ffffff', autoLight: true, autoStrength: 1,
  },
  rolodex: {
    count: 5, spacing: 40, pathR: 0.98, side: -70, bulge: 1, offsetX: 0.0, offsetY: 0.0, bustH: 90, minScale: 0.5, turn: 1.0,
    inertia: true, swipe: 1.0, coast: 0.46, maxSpeed: 9, settle: true, behindFade: 0.0,
  },
  tabs: {
    show: true, nameSize: 14, nameColor: '#ffffff', msgSize: 11, msgColor: '#8fe6ff', box: '#4aa8ff', boxFill: 'rgba(10,40,80,0.55)',
    glow: 1.4, glowColor: '#1192fb', glowSpread: 26, glowSoft: 8, glowAngle: 284, glowShift: 18, lineColor: '#59eaff', lineLen: 14, boxW: 140, boxH: 26, offsetX: 4, offsetY: 0,
    tabX: 0, tabY: 0, follow: 'bust', shrink: false, corners: 0, style: 'fill', color2: '#164e70', gradientAngle: 91, gradientEnd: 0.54, boxOpacity: 1, border: 1.7,
    nameFont: 'system-ui', nameStyle: 1, msgFont: 'system-ui', msgStyle: 0, msgPad: 7, lineWidth: 1.1, lineOpacity: 1, lineGlow: 1, newTint: 0.38, unreadTint: 0.30, readTint: 0.23, nameNear: 1.0, nameFar: 0.92, msgNear: 1.0, msgFar: 0.92, edgeMargin: 10, readDim: 0.55, unreadGlow: 1.6, minScale: 0.62,
  },
};

const DEMO_CONTACTS = [
  ['Freya','That looks amazing',1], ['Baldr','I sent you the photo',1], ['Loki','See you tonight?',0], ['Hel',"I'll be there at six",1],
  ['Tyr','Training at dawn',0], ['Sif','Hair appointment moved',0], ['Saga','Story time later',1], ['Eir','Feeling better!',0],
  ['Skadi','Snow trip this weekend?',0], ['Njord','Boat is ready',0], ['Bragi','New song drop',1], ['Ullr','Archery Sunday',0],
  ['Vidar','On my way',0], ['Forseti','Settled it',0], ['Gerd','Garden looks great',0],
].map(([name, msg, unread], i) => ({ id: name.toLowerCase(), name, msg, unread: !!unread, bust: `busts/${name}.webp`, face: `faces/${name}.jpg`,
  counts: { friends: [3, 40, 120, 260, 600, 1200, 2500, 15, 80, 300, 900, 5, 60, 150, 2000][i], followers: [12000, 900, 45000, 300, 2200, 80, 7000, 150, 600, 30, 1500000, 20, 400, 3000, 90][i], viewers: [6, 60, 260, 900, 3200, 14000, 40, 180, 700, 2500, 11000, 0, 30, 400, 0][i] } }));

function deepMerge(base, over) {
  if (Array.isArray(base)) return over !== undefined ? over : base;
  if (base && typeof base === 'object') { const o = {}; for (const k of new Set([...Object.keys(base), ...Object.keys(over || {})])) o[k] = deepMerge(base[k], over ? over[k] : undefined); return o; }
  return over !== undefined ? over : base;
}

// VIEWS: feeding stages. Colors come from the sky the hole is in (envColor), never preset pink/blue/yellow.
function viewStages() {
  const D = G.BH.BH_DEFAULTS;
  const base = { envColor: 1, envRadius: 2.4, faceZoom: 0.62, vary: 1, lens: 1.4, edgeWidth: 2.5 };
  const S = [
    { start: 0, name: 'No viewers', look: { faceZoom: 1, envColor: 0, vary: 0 } },
    { start: 21, name: 'Glow', look: { disk: 0, glow: 0.55, corona: 0.9, coronaWidth: 1.2, ring: 0.6, ringWidth: 0.2, shellMotion: 0.5, envFeed: 0.6, reach: 1.0 } },
    { start: 150, name: 'Swirling', look: { disk: 1, diskIn: 3.2, diskOut: 8.5, diskBright: 0.55, diskFalloff: 0.9, diskOpacity: 0.45, diskThick: 0.35, diskTexture: 1, diskStreaks: 0.2, clumps: 0.5, arms: 2, armSharp: 3, diskSwirl: 3, diskSpin: 0.7, doppler: 0.3, glow: 0.35, corona: 0.5, ring: 0.8, envFeed: 0.8, rotX: 22, reach: 1.15 } },
    { start: 500, name: 'Disk forming', look: { disk: 1, diskIn: 3, diskOut: 6.5, diskBright: 0.9, diskFalloff: 1.4, diskOpacity: 0.85, diskThick: 0.12, diskTexture: 0.75, diskStreaks: 0.6, clumps: 0.4, diskSwirl: 0.8, diskSpin: 1, doppler: 0.55, glow: 0.25, corona: 0.3, ring: 1.2, envFeed: 0.9, rotX: 14, reach: 1.3 } },
    { start: 2000, name: 'Feeding', look: { disk: 1, diskIn: 3, diskOut: 7.5, diskBright: 1.3, diskFalloff: 1.2, diskOpacity: 0.95, diskThick: 0.08, diskTexture: 0.6, diskStreaks: 0.9, clumps: 0.2, diskSpin: 1.3, doppler: 0.6, glow: 0.35, corona: 0.35, ring: 1.6, envFeed: 1, rotX: 8, reach: 1.5, lens: 1.6 } },
    { start: 10000, name: 'Quasar', look: { disk: 1, diskIn: 3, diskOut: 8.5, diskBright: 1.7, diskFalloff: 1.1, diskOpacity: 1, diskThick: 0.1, diskTexture: 0.7, diskStreaks: 0.9, diskSpin: 1.6, doppler: 0.65, glow: 0.8, corona: 0.6, ring: 2, jets: 1.2, jetLen: 12, envFeed: 1, rotX: 10, reach: 1.7, lens: 1.8 } },
  ];
  return S.map(t => ({ start: t.start, name: t.name, seconds: 3, libId: null, look: Object.assign({}, D, base, t.look) }));
}
function defaultTiers(metric) {
  if (metric === 'viewers') return viewStages();
  const P = G.BH.BH_PRESETS, D = G.BH.BH_DEFAULTS;
  const starts = metric === 'viewers' ? [0, 10, 25, 150, 500, 2000] : metric === 'followers' ? [0, 1000, 10000, 100000, 500000, 1000000] : [0, 50, 200, 1000, 5000, 20000];
  const looks = metric === 'viewers'
    ? ['quiet-dark', 'cold-blue-rim', 'grey-lens', 'orange-garg', 'gargantua', 'quasar']
    : metric === 'followers' ? ['quiet-dark', 'cold-blue-rim', 'white-tilt', 'gargantua', 'gargantua-edge', 'fire-disk']
    : ['quiet-dark', 'cold-blue-rim', 'violet-rim', 'blue-thin', 'orange-garg', 'neon-garg'];
  const sizes = [26, 28, 31, 34, 38, 42];
  return starts.map((start, i) => ({ start, name: ['Quiet', 'Stirring', 'Glowing', 'Feeding', 'Lit', 'Blazing'][i], seconds: 2,
    look: Object.assign({}, D, P[looks[i]], { size: sizes[i], faceAmt: 0.85 }), libId: null }));
}
const FEED_SPRITES = [{"src": "feed/g00.webp", "kind": "gas"}, {"src": "feed/g01.webp", "kind": "gas"}, {"src": "feed/g02.webp", "kind": "gas"}, {"src": "feed/g03.webp", "kind": "gas"}, {"src": "feed/g04.webp", "kind": "gas"}, {"src": "feed/g05.webp", "kind": "gas"}, {"src": "feed/g06.webp", "kind": "gas"}, {"src": "feed/g07.webp", "kind": "gas"}, {"src": "feed/g08.webp", "kind": "gas"}, {"src": "feed/g09.webp", "kind": "gas"}, {"src": "feed/g10.webp", "kind": "gas"}, {"src": "feed/g11.webp", "kind": "gas"}, {"src": "feed/g12.webp", "kind": "gas"}, {"src": "feed/g13.webp", "kind": "gas"}, {"src": "feed/g14.webp", "kind": "gas"}, {"src": "feed/g15.webp", "kind": "gas"}, {"src": "feed/g16.webp", "kind": "gas"}, {"src": "feed/g17.webp", "kind": "gas"}, {"src": "feed/s18.webp", "kind": "stars"}, {"src": "feed/s19.webp", "kind": "stars"}, {"src": "feed/s20.webp", "kind": "stars"}, {"src": "feed/s21.webp", "kind": "stars"}, {"src": "feed/s22.webp", "kind": "stars"}, {"src": "feed/s23.webp", "kind": "stars"}, {"src": "feed/s24.webp", "kind": "stars"}, {"src": "feed/s25.webp", "kind": "stars"}];
function ensureDashboards(s) {
  // any setting missing from a saved design gets its default, so every control has a real value
  const fill = (t, d) => { for (const k in d) { const dv = d[k]; if (t[k] === undefined || t[k] === null && dv !== null) t[k] = JSON.parse(JSON.stringify(dv)); else if (dv && typeof dv === 'object' && !Array.isArray(dv) && t[k] && typeof t[k] === 'object' && !Array.isArray(t[k]) && k !== 'dashboards') fill(t[k], dv); } };
  fill(s, DEFAULT_SETTINGS);
  if (!s.holes.dashboards) s.holes.dashboards = {};
  if (!(s.layoutV >= 6)) { const D = JSON.parse(JSON.stringify(DEFAULT_SETTINGS)); s.rolodex = D.rolodex; s.sphere = D.sphere; s.tabs = D.tabs; s.layoutV = 6; }
  if (!(s.layoutV >= 8) && s.tabs) s.tabs.nameFar = 0.92;
  if (!(s.layoutV >= 7)) { Object.assign(s.rolodex, { side: -70, bulge: 1, offsetX: 0, pathR: 0.98 }); s.sphere.x = 0.55; s.layoutV = 7; }
  if (!(s.layoutV >= 8)) s.layoutV = 8;
  if (!(s.layoutV >= 10) && s.holes.dashboards && s.holes.dashboards.friends) { s.holes.dashboards.friends.tiers.forEach((t, i) => Object.assign(t.look, { reach: +(0.14 + 0.016 * i).toFixed(3), lens: 1, disk: 0, ring: 0, corona: 0, glow: 0, flare: 0, jets: 0, shellMotion: 0 })); s.layoutV = Math.max(s.layoutV || 0, 10); s.friendsTight = 1; }
  if (!(s.layoutV >= 39)) { if (s.holes && s.holes.rule) s.holes.rule.dust = 0; s.layoutV = Math.max(s.layoutV || 0, 39); }
  if (!(s.layoutV >= 37)) { if (s.holes && s.holes.rule) Object.assign(s.holes.rule, { tiltMin: 4, tiltMax: 70, tumble: 0.4, tumbleSpeed: 0.12, dustFrom: 3, dust: 0, dustSize: 1.6, dustSpin: 0.6, crest: 2.2, crestWidth: 0.035, glare: 0 }); s.layoutV = Math.max(s.layoutV || 0, 37); }
  if (!(s.layoutV >= 35)) { if (s.holes && s.holes.refl) Object.assign(s.holes.refl, { catch: 0, rimSky: 0.5 }); s.layoutV = Math.max(s.layoutV || 0, 35); }
  if (!(s.layoutV >= 34)) { if (s.holes) s.holes.rule = { on: true, lens: 0.9, reach: 0.6, edge: 1.6, taper: 0.7, funnel: 0.45, width: 3.8, smear: 0.7, glare: 0.9 }; s.layoutV = Math.max(s.layoutV || 0, 34); }
  if (!(s.layoutV >= 32)) { if (s.holes) { s.holes.feed = Object.assign(s.holes.feed || {}, { on: false }); s.holes.clips = Object.assign({ on: true, scale: 1, bright: 1, turn: 1 }, s.holes.clips || {}); } s.layoutV = Math.max(s.layoutV || 0, 32); }
  if (!(s.layoutV >= 31)) { const v = s.holes && s.holes.dashboards && s.holes.dashboards.viewers; if (v && v.tiers[1]) v.tiers[1].start = 21; s.layoutV = Math.max(s.layoutV || 0, 31); }
  if (!(s.layoutV >= 30)) { if (s.sphere) { s.sphere.autoLight = true; s.sphere.autoStrength = 1; } s.layoutV = Math.max(s.layoutV || 0, 30); }
  if (!(s.layoutV >= 29)) { if (s.sphere) s.sphere.body = 1; s.layoutV = Math.max(s.layoutV || 0, 29); }
  if (!(s.layoutV >= 28)) { if (s.sphere) Object.assign(s.sphere, { body: 1, tabLight: 0, rimLight: 0, topLight: 1.2, topSharp: 3, topToward: 0.6, topSide: 0, topColor: '#ffffff' }); s.layoutV = Math.max(s.layoutV || 0, 28); }
  if (!(s.layoutV >= 27)) { if (s.holes && s.holes.behavior) Object.assign(s.holes.behavior, { orbitSpeed: 0.3, sling: 1.3, orbitTime: 14 }); s.layoutV = Math.max(s.layoutV || 0, 27); }
  if (!(s.layoutV >= 26)) { if (s.holes && s.holes.behavior) s.holes.behavior.interact = 1; s.layoutV = Math.max(s.layoutV || 0, 26); }
  if (!(s.layoutV >= 25)) { if (s.holes && s.holes.behavior) s.holes.behavior.count = Math.min(4, s.holes.behavior.count || 4); s.layoutV = Math.max(s.layoutV || 0, 25); }
  if (!(s.layoutV >= 24)) { if (s.holes && s.holes.behavior) { const sp = s.sphere || { y: 0.7, r: 0.4 }; const topSphere = (sp.y * H - sp.r * W) / H; s.holes.behavior.bandBottom = Math.max(s.holes.behavior.bandBottom || 0.35, Math.min(0.5, topSphere - 0.12)); s.holes.behavior.bandTop = Math.min(s.holes.behavior.bandTop ?? 0.07, 0.08); s.holes.behavior.interact = Math.min(s.holes.behavior.interact ?? 0.5, 0.3); s.holes.behavior.minGap = Math.max(s.holes.behavior.minGap || 14, 16); } s.layoutV = Math.max(s.layoutV || 0, 24); }
  if (!(s.layoutV >= 23)) { if (s.holes.dashboards) s.holes.dashboards.viewers = { tiers: viewStages(), testCount: null }; s.layoutV = Math.max(s.layoutV || 0, 23); }
  if (!(s.layoutV >= 20)) { const D = s.holes.dashboards; if (D && D.friends) { D.followers = JSON.parse(JSON.stringify(D.friends)); } s.layoutV = Math.max(s.layoutV || 0, 20); }
  if (!(s.layoutV >= 19)) { const f = s.holes.dashboards && s.holes.dashboards.friends; if (f) f.tiers.forEach((t, i) => Object.assign(t.look, { lens: 1.4, reach: +(0.8 + 0.1 * i).toFixed(2), edgeWidth: +(1.2 + 0.25 * i).toFixed(2) })); s.layoutV = Math.max(s.layoutV || 0, 19); }
  if (!(s.layoutV >= 18)) { for (const m of ['friends','followers','viewers']) if (s.holes.dashboards && s.holes.dashboards[m]) s.holes.dashboards[m].tiers.forEach(t => { Object.assign(t.look, { faceSphere: 0, faceShade: 0, faceTurn: 0, faceZoom: 1 }); }); s.layoutV = Math.max(s.layoutV || 0, 18); }
  if (!(s.layoutV >= 17)) { if (s.holes && s.holes.behavior) { s.holes.behavior.driftViews = true; s.holes.behavior.direction = 1; if (!(s.holes.behavior.speed >= 8)) s.holes.behavior.speed = 14; } if (s.bg) s.bg.pan = false; s.layoutV = Math.max(s.layoutV || 0, 17); }
  if (!(s.layoutV >= 16)) { if (s.bg) s.bg.pan = false; if (s.holes && s.holes.behavior) { s.holes.behavior.direction = 1; s.holes.behavior.driftViews = true; if (!(s.holes.behavior.speed > 0)) s.holes.behavior.speed = 12; } s.layoutV = Math.max(s.layoutV || 0, 16); }
  if (!(s.layoutV >= 15)) { for (const m of ['friends','followers','viewers']) if (s.holes.dashboards && s.holes.dashboards[m]) s.holes.dashboards[m].tiers.forEach(t => { t.look.faceTurn = 0; t.look.faceShade = 0; t.look.faceSphere = 1; t.look.faceCover = 1.0; t.look.faceZoom = 1; }); s.layoutV = Math.max(s.layoutV || 0, 15); }
  if (!(s.layoutV >= 11)) { if (s.bg) { s.bg.pan = true; s.bg.panSpeedX = -12; s.bg.panSpeedY = 0; } s.layoutV = Math.max(s.layoutV || 0, 11); }
  if (!(s.layoutV >= 9)) { s.holes.friendSize = Object.assign({ auto: true }, s.holes.friendSize || {}, { min: 33 }); if (!(s.holes.friendSize.max > 33)) s.holes.friendSize.max = 66; s.holes.friendSizeInit = 1; s.layoutV = 9; }
  if (!s.holes.friendSizeInit && s.holes.dashboards && s.holes.dashboards.friends) { const t = s.holes.dashboards.friends.tiers; s.holes.friendSize = { auto: true, min: +(t[0].look.size || 12).toFixed(1), max: +(t[t.length - 1].look.size || 34).toFixed(1) }; s.holes.friendSizeInit = 1; }
  for (const m of ['friends', 'followers', 'viewers']) {
    if (!s.holes.dashboards[m]) s.holes.dashboards[m] = { tiers: defaultTiers(m), testCount: null };
    for (const t of s.holes.dashboards[m].tiers) t.look = Object.assign({}, G.BH.BH_DEFAULTS, t.look);
  }
  return s;
}
// what the VIEWS tiers control (everything about the disk and how hard it warps); FRIENDS tiers own the hole itself and its size
const VIEW_KEYS = ['disk','diskIn','diskOut','diskBright','diskFalloff','diskColorIn','diskColorOut','diskTexture','diskStreaks','diskSwirl','arms','armSharp','diskSpin','diskDir','diskThick','diskOpacity','doppler','temp','clumps',
  'ring','ringColor','ringWidth','corona','coronaColor','coronaWidth','shellMotion','flare','flareColor','flareLen','flareWidth','jets','jetColor','jetLen','jetWidth','glow','glowColor','exposure','rotX','rotY','rotZ','camDist','pair','pairRatio','pairSep','pairSpeed','pairTilt','envColor','envRadius','envFeed','faceZoom','vary'];
function hash(str) { let x = 2166136261; for (const ch of String(str)) x = Math.imul(x ^ ch.charCodeAt(0), 16777619); return k => { let y = Math.imul(x ^ (k * 2654435761), 1597334677); y ^= y >>> 15; return ((y >>> 0) % 10000) / 10000; }; }
function tierAt(tiers, count) { let k = 0; for (let i = 1; i < tiers.length; i++) if (count >= tiers[i].start) k = i; return k; }

/* --------- sphere rune texture (procedural, made once) --------- */
function runeTexture(color) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, 1024, 512);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  x.strokeStyle = color; x.lineCap = 'round';
  for (let i = 0; i < 900; i++) {
    const cx = rnd() * 1024, cy = rnd() * 512, s = 6 + rnd() * 14; x.globalAlpha = 0.25 + rnd() * 0.6; x.lineWidth = 0.8 + rnd() * 1.4;
    x.beginPath(); x.moveTo(cx, cy - s); x.lineTo(cx, cy + s);
    const k = Math.floor(rnd() * 5);
    if (k === 0) { x.moveTo(cx, cy - s); x.lineTo(cx + s * .7, cy - s * .3); }
    if (k === 1) { x.moveTo(cx, cy); x.lineTo(cx + s * .7, cy - s * .6); x.moveTo(cx, cy); x.lineTo(cx + s * .7, cy + s * .6); }
    if (k === 2) { x.moveTo(cx - s * .6, cy - s * .5); x.lineTo(cx + s * .6, cy + s * .5); }
    if (k === 3) { x.moveTo(cx, cy - s); x.lineTo(cx + s * .6, cy - s * .5); x.lineTo(cx, cy); }
    if (k === 4) { x.moveTo(cx - s * .5, cy); x.lineTo(cx + s * .5, cy); }
    x.stroke();
  }
  x.globalAlpha = 0.18; x.lineWidth = 1;
  for (let r = 40; r < 600; r += 34) { x.beginPath(); x.arc(512, 256, r, 0, Math.PI * 2); x.stroke(); }
  return c;
}

/* --------- the real sphere: your rune texture on a 3D ball, revealed by light from the tabs --------- */
class SphereGL {
  constructor() {
    const c = this.c = document.createElement('canvas'); const gl = this.gl = c.getContext('webgl2', { premultipliedAlpha: true, alpha: true });
    if (!gl) return;
    const vs = `#version 300 es
in vec2 a; out vec2 v; void main(){ v=a; gl_Position=vec4(a,0.,1.); }`;
    const fs = `#version 300 es
precision highp float; in vec2 v; out vec4 o;
uniform sampler2D T; uniform float uSpin, uTilt, uRepeat, uAmb, uReveal, uLW, uLH, uTint, uRim, uLimb; uniform vec3 uTintC, uRimC;
uniform float uBody; uniform vec4 uTop; uniform vec3 uTopC; uniform vec4 uHL[4]; uniform vec3 uHC[4]; uniform int uN; uniform vec4 uL[12]; uniform vec4 uLS[12]; uniform vec3 uLC[12]; uniform float uAsp;
void main(){
  vec2 p = vec2(v.x, -v.y); float r2 = dot(p,p); if(r2>1.){ o=vec4(0); return; }
  vec3 n = vec3(p.x, -p.y, sqrt(1.-r2));
  // tilt the spin axis, then spin
  float ct=cos(uTilt), st=sin(uTilt); vec3 q = vec3(n.x*ct + n.y*st, -n.x*st + n.y*ct, n.z);
  float lon = atan(q.x, q.z) + uSpin; float lat = asin(clamp(q.y,-1.,1.));
  vec2 uv = vec2(lon/6.2831853, 0.5 - lat/3.1415926) * vec2(uRepeat*2., uRepeat);
  vec3 tex = texture(T, fract(uv)).rgb;
  if(uTint > 0.5){ float l = dot(tex, vec3(.3,.59,.11)); tex = uTintC * l * 1.6; }
  // light from the tabs (screen-space, soft ellipse)
  vec3 light = vec3(uAmb);
  for(int i=0;i<12;i++){ if(i>=uN) break;
    vec2 q2 = max(abs(p - uL[i].xy) - uLS[i].xy, 0.) / max(vec2(uLW, uLH), vec2(1e-3));   // distance outside the tab box
    float d2 = dot(q2,q2); float f = exp(-d2) * uL[i].z * mix(1., smoothstep(0., 1., 1. - sqrt(d2)/3.), uL[i].w);
    light += uLC[i] * f * uReveal; }
  { vec3 ld = normalize(vec3(uTop.w, 1., uTop.z)); float t = max(dot(n, ld), 0.); light += uTopC * pow(t, uTop.y) * uTop.x; }
  for(int i=0;i<4;i++){ float t = max(dot(n, normalize(uHL[i].xyz + 1e-4)), 0.); light += uHC[i] * pow(t, 2.2) * uHL[i].w; }
  float limb = mix(1., pow(n.z, .6), uLimb);
  vec3 col = tex * light * limb;
  float rim = pow(1.-n.z, 3.) * uRim; col += uRimC * rim;
  float edge = smoothstep(1., .985, sqrt(r2));
  float a = clamp(max(uBody, max(col.r, max(col.g, col.b))), 0., 1.) * edge;
  o = vec4(col*edge + vec3(0.)*uBody, a);
}`;
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    const p = this.p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); gl.useProgram(p);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const l = gl.getAttribLocation(p, 'a'); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 2, gl.FLOAT, false, 0, 0);
    this.u = {}; for (const k of ['uBody','T','uSpin','uTilt','uRepeat','uAmb','uReveal','uLW','uLH','uTint','uRim','uLimb','uTintC','uRimC','uN','uL','uLS','uLC','uAsp','uTop','uTopC','uHL','uHC']) this.u[k] = gl.getUniformLocation(p, k);
    this.t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  }
  setTexture(img) { const gl = this.gl; if (!gl || img === this.img) return; this.img = img; gl.bindTexture(gl.TEXTURE_2D, this.t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); gl.generateMipmap(gl.TEXTURE_2D); }
  render(sizePx, S, lights, time) {
    const gl = this.gl; if (!gl) return null; const n = Math.max(2, Math.round(sizePx));
    if (this.c.width !== n) { this.c.width = n; this.c.height = n; }
    gl.viewport(0, 0, n, n); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.useProgram(this.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.t); gl.uniform1i(this.u.T, 0);
    gl.uniform1f(this.u.uSpin, time * S.spin * 0.6); gl.uniform1f(this.u.uTilt, (S.tilt || 0) * Math.PI / 180); gl.uniform1f(this.u.uRepeat, S.texRepeat || 2);
    gl.uniform1f(this.u.uAmb, S.ambient); gl.uniform1f(this.u.uReveal, S.tabLight * 1.1); gl.uniform1f(this.u.uLW, S.lightWidth); gl.uniform1f(this.u.uLH, S.lightHeight);
    gl.uniform1f(this.u.uTint, S.tint ? 1 : 0); gl.uniform3fv(this.u.uTintC, hex3(S.tintColor)); gl.uniform1f(this.u.uRim, S.rimLight); gl.uniform3fv(this.u.uRimC, hex3(S.rim)); gl.uniform1f(this.u.uLimb, S.limb ?? 0.6); gl.uniform1f(this.u.uBody, S.body ?? 0); const A = S._auto; if (A) { gl.uniform4f(this.u.uTop, A.top, 2.5, 0.5, A.side); gl.uniform3fv(this.u.uTopC, A.topC); gl.uniform4fv(this.u.uHL, A.hl); gl.uniform3fv(this.u.uHC, A.hc); }
    else { gl.uniform4f(this.u.uTop, S.topLight ?? 0, S.topSharp ?? 3, S.topToward ?? 0.6, S.topSide ?? 0); gl.uniform3fv(this.u.uTopC, hex3(S.topColor || '#ffffff')); gl.uniform4fv(this.u.uHL, new Float32Array(16)); gl.uniform3fv(this.u.uHC, new Float32Array(12)); };
    const L = new Float32Array(48), LS = new Float32Array(48), LC = new Float32Array(36); const m = Math.min(12, lights.length);
    for (let i = 0; i < m; i++) { L.set([lights[i].x, lights[i].y, lights[i].k, lights[i].soft || 0], i * 4); LS.set([lights[i].hx || 0, lights[i].hy || 0, 0, 0], i * 4); LC.set(hex3(lights[i].c), i * 3); }
    gl.uniform1i(this.u.uN, m); gl.uniform4fv(this.u.uL, L); gl.uniform4fv(this.u.uLS, LS); gl.uniform3fv(this.u.uLC, LC);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); return this.c;
  }
}
function hex3(c) { let h = String(c || '#000').replace('#', ''); if (h.length === 3) h = h.split('').map(z => z + z).join(''); const n = parseInt(h, 16) || 0; return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }

class RavenScene {
  constructor(root, settings, opts = {}) {
    this.root = root; this.opts = opts; this.base = opts.base || '';
    if (getComputedStyle(root).position === 'static') root.style.position = 'relative'; root.style.overflow = 'hidden'; root.style.background = '#000';
    this.gl = document.createElement('canvas'); this.ov = document.createElement('canvas');
    this.fx = document.createElement('canvas'); this.fx.style.mixBlendMode = 'screen'; this.fx.style.pointerEvents = 'none';
    for (const c of [this.gl, this.fx, this.ov]) { c.style.position = 'absolute'; c.style.left = '0'; c.style.top = '0'; c.style.width = '100%'; c.style.height = '100%'; root.appendChild(c); }
    this.bgc = document.createElement('canvas');
    this.engine = new G.BH.BHScene(this.gl, { scale: 1 });
    this.ctx = this.ov.getContext('2d');
    this.images = {}; this.time = 0; this.playing = true; this.speed = 1;
    this.contacts = opts.contacts || DEMO_CONTACTS.map(c => Object.assign({}, c));
    this.sky = []; this.roll = { off: 0, vel: 0 }; this.selected = null;
    this.setSettings(settings || {});
    this._bindInput();
    this._resize(); new ResizeObserver(() => this._resize()).observe(root);
    this._loop = this._loop.bind(this); requestAnimationFrame(this._loop);
  }
  setSettings(s) {
    const prevRs = this.s && this.s.holes.behavior.renderScale;
    this.s = ensureDashboards(deepMerge(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)), s));
    this._preload();
    if (this.engine && prevRs !== undefined && prevRs !== this.s.holes.behavior.renderScale) this._resize();
  }
  showLayer(id, seconds) { this.forceId = id; this.forceUntil = this.time + (seconds || Math.max(8, this.s.bg.cycleSeconds)); }
  setContacts(list) { this.contacts = list; this.sky = []; this._preload(); }
  img(src) {
    if (!src) return null; if (this.images[src]) return this.images[src];
    const isVid = /\.(mp4|webm|mov)(\?|$)/i.test(src) || src.startsWith('data:video');
    let el;
    if (isVid) { el = document.createElement('video'); el.muted = true; el.loop = true; el.playsInline = true; el.crossOrigin = 'anonymous'; el.src = this._u(src); el.play().catch(() => {}); }
    else { el = new Image(); el.crossOrigin = 'anonymous'; el.src = this._u(src); }
    this.images[src] = el; return el;
  }
  _u(src) { return /^(data:|blob:|https?:)/.test(src) ? src : this.base + src; }
  _ready(el) { return el && ((el.tagName === 'VIDEO' && el.readyState >= 2) || (el.complete && el.naturalWidth)); }
  _preload() { this.img(this.s.sphere.texture); for (const L of this.s.bg.layers) this.img(L.src); for (const c of this.contacts) { this.img(c.bust); this.img(c.face); } }
  _resize() {
    const r = this.root.getBoundingClientRect(); if (!r.width || !r.height) return;
    const k = Math.max(r.width / W, r.height / H); const cw = W * k, ch = H * k;
    for (const c of [this.gl, this.fx, this.ov]) { c.style.width = cw + 'px'; c.style.height = ch + 'px'; c.style.left = (r.width - cw) / 2 + 'px'; c.style.top = (r.height - ch) / 2 + 'px'; }
    this.scaleCss = k; const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rs = this.s.holes.behavior.renderScale * (this._aq || 1);
    this.engine.scale = this.scaleCss * dpr * rs; this.engine.resize(W, H);
    this.ov.width = Math.round(cw * dpr); this.ov.height = Math.round(ch * dpr); this.fx.width = this.ov.width; this.fx.height = this.ov.height; this.ovScale = this.ov.width / W;
    this.bgc.width = Math.round(W * 1.6); this.bgc.height = Math.round(H * 1.6);
  }
  /* ---------------- background composite ---------------- */
  _drawLayer(x, L, alpha) {
    const el = this.img(L.src); if (!this._ready(el)) return;
    const iw = el.videoWidth || el.naturalWidth, ih = el.videoHeight || el.naturalHeight; const cw = this.bgc.width, ch = this.bgc.height;
    const top = (L.top ?? 0) * ch, bot = (L.bottom ?? 1) * ch, rh = bot - top;
    const s = Math.max(cw / iw, rh / ih) * (L.zoom || 1); const w = iw * s, h = ih * s;
    const dr = (this.s.bg.drift || 0) * (L.move ?? 1);
    const t = this.time * 0.02 * dr;
    const px = (L.panX || 0) + Math.sin(t) * 0.06 * dr, py = (L.panY || 0) + Math.cos(t * 0.7) * 0.04 * dr;
    let dx = (cw - w) / 2 + px * w * 0.5, dy = top + (rh - h) / 2 + py * h * 0.5;
    const pan = this.s.bg.pan ? 1 : 0; const ox = pan * this.time * (this.s.bg.panSpeedX || 0) * (cw / W), oy = pan * this.time * (this.s.bg.panSpeedY || 0) * (ch / H);
    x.save(); x.globalAlpha = alpha * (L.opacity ?? 1);
    x.filter = `brightness(${L.brightness ?? 1}) saturate(${L.saturate ?? 1}) hue-rotate(${L.hue || 0}deg)` + (L.blur ? ` blur(${L.blur}px)` : '');
    if (L.fadeBottom) {
      // per-layer bottom fade: draw to temp then mask
      const tc = this._tmp || (this._tmp = document.createElement('canvas')); tc.width = cw; tc.height = ch; const tx = tc.getContext('2d');
      tx.clearRect(0, 0, cw, ch); tx.filter = x.filter; this._tiled(tx, el, dx, dy, w, h, ox, oy); tx.filter = 'none';
      tx.globalCompositeOperation = 'destination-in';
      const g = tx.createLinearGradient(0, (L.fadeFrom ?? 0.5) * ch, 0, (L.fadeTo ?? 0.8) * ch); for (let k = 0; k <= 16; k++) { const t = k / 16, e = t * t * t * (t * (t * 6 - 15) + 10); g.addColorStop(t, `rgba(0,0,0,${1 - e})`); }
      tx.fillStyle = g; tx.fillRect(0, 0, cw, ch); tx.globalCompositeOperation = 'source-over';
      x.filter = 'none'; x.drawImage(tc, 0, 0);
    } else { x.beginPath(); x.rect(0, top, cw, rh); x.clip(); this._tiled(x, el, dx, dy, w, h, ox, oy); }
    x.restore();
  }
  // draw an image that can scroll forever: mirrored copies side by side so there is no seam
  _tiled(x, el, dx, dy, w, h, ox, oy) {
    if (!ox && !oy) { x.drawImage(el, dx, dy, w, h); return; }
    const mx = ((ox % (2 * w)) + 2 * w) % (2 * w), my = ((oy % (2 * h)) + 2 * h) % (2 * h);
    for (let i = -2; i <= 1; i++) for (let j = -2; j <= 1; j++) {
      const X = dx + mx + i * w, Y = dy + my + j * h; const fx = ((i % 2) + 2) % 2, fy = ((j % 2) + 2) % 2;
      if (X > this.bgc.width || X + w < 0 || Y > this.bgc.height || Y + h < 0) continue;
      x.save(); x.translate(X + (fx ? w : 0), Y + (fy ? h : 0)); x.scale(fx ? -1 : 1, fy ? -1 : 1); x.drawImage(el, 0, 0, w, h); x.restore();
    }
  }
  _cycleState() {
    const b = this.s.bg; const cyc = b.layers.filter(l => l.visible !== false && l.cycle);
    if (this.forceId) { const f = b.layers.find(l => l.id === this.forceId); if (f && this.time < this.forceUntil) return { cyc, cur: f, next: null, mix: 0 }; this.forceId = null; }
    if (!cyc.length) return { cyc, cur: null, next: null, mix: 0 };
    if (cyc.length === 1) return { cyc, cur: cyc[0], next: null, mix: 0 };
    const per = Math.max(1, b.cycleSeconds), bl = Math.min(b.blendSeconds, per * 0.95);
    // deterministic order (random option = seeded shuffle)
    let order = cyc.map((_, i) => i);
    if (b.randomOrder) { let sd = (b.seed || 1) * 9301; order.sort((p, q) => ((p * 7919 + sd) % 101) - ((q * 7919 + sd) % 101)); }
    let t = this.time, k = 0, durs = order.map((_, i) => b.randomTime ? per * (0.6 + 0.8 * (((i * 7919 + (b.seed || 1) * 31) % 97) / 97)) : per);
    const total = durs.reduce((a, c) => a + c, 0); t = t % total;
    while (t > durs[k]) { t -= durs[k]; k++; }
    const cur = cyc[order[k]], next = cyc[order[(k + 1) % order.length]];
    const mix = ease((t - (durs[k] - bl)) / bl);
    return { cyc, cur, next, mix: t > durs[k] - bl ? mix : 0 };
  }
  _composeBg() {
    const x = this.bgc.getContext('2d'), cw = this.bgc.width, ch = this.bgc.height, b = this.s.bg;
    x.globalCompositeOperation = 'source-over'; x.fillStyle = '#000'; x.fillRect(0, 0, cw, ch);
    const st = this._cycleState(); this.cycle = st;
    if (st.cur) this._drawLayer(x, st.cur, 1);
    if (st.next && st.mix > 0) this._drawLayer(x, st.next, st.mix);
    for (const L of b.layers) if (L.visible !== false && !L.cycle) this._drawLayer(x, L, 1);
    if (b.starsOn && b.stars > 0) {
      if (!this._starList || this._starList.n !== b.stars) { let sd = 11; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647; const L = []; for (let i = 0; i < b.stars; i++) L.push([rnd(), rnd(), 0.4 + rnd() * 1.2, rnd() * 6.28, rnd()]); L.n = b.stars; this._starList = L; }
      const k = cw / W; x.fillStyle = b.starColor;
      for (const [sx, sy, sz, ph, br] of this._starList) {
        const fy = sy < b.starFadeStart ? 1 : sy > b.starFadeEnd ? 0 : 1 - (sy - b.starFadeStart) / Math.max(0.001, b.starFadeEnd - b.starFadeStart);
        if (fy <= 0) continue; const tw = 1 - b.twinkle * 0.5 * (1 + Math.sin(this.time * 2 + ph));
        x.globalAlpha = fy * (0.35 + 0.65 * br) * tw; x.beginPath(); x.arc(sx * cw, sy * ch, sz * b.starSize * k * 0.6, 0, 6.283); x.fill();
      }
      x.globalAlpha = 1;
    }
    this._drawGas(x, cw, ch);
    this._drawFeed(x, cw / W);
    if (b.skyDim !== 1) { x.fillStyle = `rgba(0,0,0,${clamp(1 - b.skyDim, 0, 1)})`; x.fillRect(0, 0, cw, ch); }
    if (b.fadeAmount > 0) {
      const f0 = Math.min(b.fadeStart, b.fadeEnd) * ch, f1 = Math.max(b.fadeStart, b.fadeEnd) * ch; const g = x.createLinearGradient(0, f0, 0, Math.max(f1, f0 + 1)); const col = b.fadeColor || '#000';
      for (let k = 0; k <= 16; k++) { const t = k / 16, e = t * t * t * (t * (t * 6 - 15) + 10); g.addColorStop(t, hexA(col, b.fadeAmount * e)); }
      x.fillStyle = g; x.fillRect(0, f0, cw, f1 - f0 + 1); x.fillStyle = hexA(col, b.fadeAmount); x.fillRect(0, f1, cw, ch);
    }
    this.engine.bg.A = this.bgc; this.engine._upload(this.engine.tex.A, this.bgc); this.engine.bg.fitA = [1, 1, 0, 0]; this.engine.bg.mix = 0;
  }
  /* ---------------- feeding material: real pieces of sky that get pulled in ---------------- */
  _gateByFuel(holes) {
    // one rule for every follower hole (only the size differs): bending tapered so a big hole doesn't warp the whole sky
    const RU = this.s.holes.rule; if (RU && RU.on !== false) { const s0 = Math.max(4, this.friendSizeAt(0) * this.s.holes.behavior.sizeScale);
      for (const h of holes) { h.lens = RU.lens; h.reach = RU.reach; h.edgeWidth = RU.edge * Math.pow(s0 / Math.max(s0, h.size), RU.taper);
        h.fl = h._pairB ? [0, 3.6, 0, 0] : [RU.funnel, RU.width, RU.smear, RU.glare]; h.ring = 0; h.corona = 0;
        // every hole its own angle; some slowly tumble as they float; the face always stays facing you
        const sd = (h.seed || 0) * 12.9898, rnd = k => { const v = Math.sin(sd * 78.233 + k * 37.719) * 43758.5453; return v - Math.floor(v); };
        let tilt = (RU.tiltMin ?? 4) + ((RU.tiltMax ?? 70) - (RU.tiltMin ?? 4)) * rnd(1);
        if (rnd(2) < (RU.tumble ?? 0.4)) tilt += Math.sin(this.time * (RU.tumbleSpeed ?? 0.12) * (0.6 + rnd(3)) + rnd(4) * 6.28) * 22;
        h.rotX = clamp(tilt, 1, 88); h.rotZ = (rnd(5) - 0.5) * 50; h.diskDir = rnd(6) < 0.5 ? -1 : 1;
        // which follower tier this hole is (by size)
        let ft = 0, best = 1e9; const nT = this.s.holes.dashboards.friends.tiers.length;
        for (let k = 0; k < nT; k++) { const dd = Math.abs(this.friendSizeAt(k) * this.s.holes.behavior.sizeScale - h.size); if (dd < best) { best = dd; ft = k; } }
        // the disk depends on the tier: low tiers only the warp, higher tiers a dark revolving dust disk
        if (!(h._vi > 0) && !h._pairB) { if (ft + 1 >= (RU.dustFrom ?? 3) && (RU.dust ?? 0) > 0) {
            h.disk = 1; h.dust = RU.dust; h.diskIn = 3.0; h.diskOut = 3.0 + (RU.dustSize ?? 1.6) * (1 + 0.2 * (ft + 1 - (RU.dustFrom ?? 3))); h.diskBright = 0.35; h.diskFalloff = 0.8;
            h.diskColorIn = '#3a2a1e'; h.diskColorOut = '#120c08'; h.diskTexture = 0.95; h.diskStreaks = 0.7; h.diskOpacity = 0.7; h.diskThick = 0.03; h.diskSpin = RU.dustSpin ?? 0.6; h.doppler = 0.2; h.clumps = 0.3;
          } else { h.disk = 0; h.dust = 0; } }
        // warp zone squashed along the disk's axis when tilted (circle only when seen from above)
        const rz = h.rotZ * Math.PI / 180, flat = 0.3 + 0.7 * Math.sin(h.rotX * Math.PI / 180);
        h.fa = [Math.cos(rz), Math.sin(rz), flat, 0];
      } }
    const CL = this.s.holes.clips; if (CL && CL.on !== false) { for (const h of holes) if (h._vi >= 0) { h.disk = 0; h.ring = 0; h.corona = 0; h.glow = 0; h.jets = 0; h.flare = 0; h.envFeed = 0; } return holes; }
    const F = this.s.holes.feed; this._fuel = this._fuel || {};
    if (!F || F.on === false) return holes;
    for (const h of holes) { if (h._vi === 0) { const g0 = Math.min(1, Math.max(0, this._fuel[h._fid] || 0)), e0 = g0 * g0 * (3 - 2 * g0);
        h.disk = 0; h.jets = 0; h.ring = 0.45 * e0; h.ringWidth = 0.22; h.ringColor = '#f3e9ff'; h.corona = 0.35 * e0; h.coronaWidth = 1.1; h.coronaColor = '#d9d2e6'; h.glow = 0.12 * e0; h.glowColor = '#e8dcff'; h.envColor = 1; h.envFeed = 0.4 * e0; continue; }
      if (!(h._vi > 0)) continue; const g = Math.min(1, Math.max(0, this._fuel[h._fid] || 0)); const e = g * g * (3 - 2 * g);
      h.disk = (h.disk || 0) * e; h.ring = (h.ring || 0) * (0.25 + 0.75 * e); h.corona = (h.corona || 0) * e; h.glow = (h.glow || 0) * (0.15 + 0.85 * e); h.jets = (h.jets || 0) * e; h.envFeed = (h.envFeed || 0) * e; }
    return holes;
  }
  _lightHoles(holes) {
    // Run after clip/fuel gating: an invisible or unlit disk cannot cast a crest.
    const pixels = this._sampleSky(), rule = this.s.holes.rule || {};
    const previous = this._holeLights || (this._holeLights = new Map()), live = new Set();
    const blend = 1 - Math.exp(-Math.min(.05, this._dtLast || .016) * 18);
    for (const h of holes) {
      const light = G.BH.surfaceLighting(h, holes, pixels, W, H, rule);
      if (rule.on === false) light.crest[0] = 0;
      const key = (h._fid || h.seed || 0) + (h._pairB ? ':pair' : ':main'); live.add(key);
      const old = previous.get(key);
      if (old && light.surfaceLight[3] > 0 && old.surfaceLight[3] > 0) {
        for (let j = 0; j < 3; j++) {
          light.surfaceLight[j] = lerp(old.surfaceLight[j], light.surfaceLight[j], blend);
          light.surfaceColor[j] = lerp(old.surfaceColor[j], light.surfaceColor[j], blend);
        }
      }
      previous.set(key, light); Object.assign(h, light);
    }
    for (const key of previous.keys()) if (!live.has(key)) previous.delete(key);
    return holes;
  }
  _newPiece(target) {
    const F = this.s.holes.feed; const gas = FEED_SPRITES.filter(f => f.kind === 'gas'), st = FEED_SPRITES.filter(f => f.kind !== 'gas');
    const list = Math.random() < 0.75 ? gas : st; const spr = list[Math.floor(Math.random() * list.length)];
    const p = { src: spr.src, kind: spr.kind, size: (55 + Math.random() * 70) * (F.pieceSize || 1), rot: Math.random() * 6.28, spin: (Math.random() - 0.5) * 0.06, a: 0, mass: 0.3 + Math.random() * 0.25, host: null, state: 'free' };
    if (target) { // comes in from off-screen on the far side of the hole's path
      const ang = Math.random() * 6.28, d = Math.max(W, H) * 0.65; p.x = clamp(target.x + Math.cos(ang) * d, -120, W + 120); p.y = clamp(target.y + Math.sin(ang) * d * 0.5, -120, H * 0.6);
      if (p.x > -100 && p.x < W + 100 && p.y > -100) { if (Math.abs(p.x - W / 2) > Math.abs(p.y)) p.x = p.x < W / 2 ? -110 : W + 110; else p.y = -110; }
      const dx = target.x - p.x, dy = target.y - p.y, dd = Math.hypot(dx, dy) || 1; p.vx = dx / dd * 14; p.vy = dy / dd * 14; p.host = target.id; p.state = 'pull';
    } else { const fromL = Math.random() < 0.5; p.x = fromL ? -110 : W + 110; p.y = Math.random() * H * 0.55; p.vx = (fromL ? 1 : -1) * (F.drift || 6) * (0.6 + Math.random() * 0.8); p.vy = (Math.random() - 0.5) * 2; }
    return p;
  }
  // the real footage from Danny's videos: one cut per Views stage, laid around each hole (black drops out)
  _drawClips() {
    const fx = this.fx; if (!fx) return; const x = fx.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, fx.width, fx.height);
    const CL = this.s.holes.clips; if (!CL || CL.on === false) return; const k = this.ovScale;
    this._vids = this._vids || [];
    for (const h of this.engine.holes || []) { if (!(h._vi >= 0) || h._pairB) continue; const i = Math.min(5, h._vi);
      let v = this._vids[i]; if (!v) { v = this._vids[i] = document.createElement('video'); v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true; v.crossOrigin = 'anonymous'; v.onerror = () => { v._bad = true; }; v.src = 'stage/s' + i + '.mp4'; v.play().catch(() => {}); }
      if (v._bad) continue;
      if (v.readyState < 2) { if (v.paused) v.play().catch(() => {}); continue; }
      const side = h.size * 7 * (CL.scale || 1) * k, sd = (h.seed || 0) * 37.3, ang = (((sd % 70) - 35) * (CL.turn ?? 1) + (h.rotZ || 0) * 0.3) * Math.PI / 180;
      x.save(); x.globalAlpha = Math.min(1, (CL.bright || 1) * (h.form ?? 1) * (h.opacity ?? 1)); x.translate(h.x * W * k, h.y * H * k); x.rotate(ang); if ((h.diskDir || 1) < 0) x.scale(-1, 1);
      x.drawImage(v, -side / 2, -side / 2, side, side); if ((CL.bright || 1) > 1) { x.globalCompositeOperation = 'lighter'; x.globalAlpha = Math.min(1, (CL.bright - 1)); x.drawImage(v, -side / 2, -side / 2, side, side); } x.restore(); }
  }
  // ChatGPT's gas & dust layers: always there over every background, each drifting at its own speed (part of the sky, so the holes bend it)
  _drawGas(x, cw, ch) {
    const G = this.s.holes.gas; if (!G || G.on === false || !G.layers) return;
    x.save(); x.globalCompositeOperation = 'lighter';
    G.layers.forEach((L, i) => { if (L.on === false) return; const im = this.img(L.src); if (!this._ready(im)) return;
      const h = ch * (G.scale || 1.1), w = h * im.naturalWidth / im.naturalHeight;
      let off = (this.time * (L.sp || 5) * (G.speed ?? 1) * (cw / W) * (i % 2 ? -1 : 1)) % w; if (off > 0) off -= w;
      const y = (ch - h) / 2 + (L.y || 0) * ch; x.globalAlpha = Math.min(1, (L.a ?? 0.7) * (G.bright ?? 1));
      for (let xx = off; xx < cw; xx += w) x.drawImage(im, xx, y, w, h); });
    x.restore();
  }
  _sampleSky() { if (this._sampF === this._frameN) return this._px; this._sampF = this._frameN;
    if (this._px && this.time - (this._sampT || -9) < 0.25 && this.time >= this._sampT) return this._px;
    this._samp = this._samp || document.createElement('canvas'); this._samp.width = 78; this._samp.height = 169;
    const sx = this._samp.getContext('2d', { willReadFrequently: true }); try { sx.drawImage(this.bgc, 0, 0, 78, 169); this._px = sx.getImageData(0, 0, 78, 169).data; } catch (e) { this._px = null; } this._sampT = this.time; return this._px; }
  // finds real dust near a hole and tears a soft piece off it (a copy of that patch of sky)
  _cutFromSky(h) {
    const px = this._sampleSky(); if (!px) return null; const sc = 78 / W; let best = 0, bx = 0, by = 0;
    for (let k = 0; k < 90; k++) { const a = Math.random() * 6.283, rr = h.size * (2.2 + Math.random() * 4), X = h.x + Math.cos(a) * rr, Y = h.y + Math.sin(a) * rr; if (X < 0 || X > W || Y < 0 || Y > H) continue;
      const i = (Math.floor(Y * 169 / H) * 78 + Math.floor(X * sc)) * 4, l = (px[i] * .3 + px[i + 1] * .59 + px[i + 2] * .11) / 255; if (l > best) { best = l; bx = X; by = Y; } }
    if (best < 0.1) return null;
    const size = h.size * (h.vi === 0 ? 1.6 : 2.2), ksc = this.bgc.width / W, s = Math.max(8, Math.round(size * ksc));
    const cv = document.createElement('canvas'); cv.width = s; cv.height = s; const x = cv.getContext('2d');
    x.drawImage(this.bgc, (bx - size / 2) * ksc, (by - size / 2) * ksc, size * ksc, size * ksc, 0, 0, s, s);
    // keep the bright gas, drop the dark sky, soft ragged edge
    const im = x.getImageData(0, 0, s, s), d = im.data; for (let yy = 0; yy < s; yy++) for (let xx = 0; xx < s; xx++) { const i = (yy * s + xx) * 4, l = (d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11) / 255;
      const u = (xx / s) * 2 - 1, v = (yy / s) * 2 - 1, ang = Math.atan2(v, u), rr = Math.hypot(u, v) * (1 + 0.2 * Math.sin(3 * ang + bx)), f = Math.max(0, Math.min(1, (1 - rr) / 0.6));
      
      d[i + 3] = Math.round(255 * Math.min(1, Math.max(0, (l - best * 0.45) / Math.max(0.05, best * 0.55))) * f * f); }
    x.putImageData(im, 0, 0);
    return { canvas: cv, kind: 'gas', size, rot: 0, spin: 0, a: 0.4, mass: 0.3, x: bx, y: by, vx: 0, vy: 0, host: h.id, state: 'pull' };
  }
  // a steady flow of the real gas & dust around each hole, barely there far out, swirling, heating and lighting up as it falls in
  _feedSources(h) {
    this._src = this._src || {}; const c = this._src[h.id]; if (c && this.time - c.t < 0.4 && this.time >= c.t) return c.pts;
    const px = this._sampleSky(); const pts = [];
    if (px) for (let k = 0; k < 70; k++) { const a = Math.random() * 6.283, rr = h.size * (2.4 + Math.random() * 5), X = h.x + Math.cos(a) * rr, Y = h.y + Math.sin(a) * rr; if (X < 0 || X > W || Y < 0 || Y > H) continue;
      const i = (Math.floor(Y * 169 / H) * 78 + Math.floor(X * 78 / W)) * 4, R = px[i] / 255, G2 = px[i + 1] / 255, B2 = px[i + 2] / 255, l = R * .3 + G2 * .59 + B2 * .11; if (l > 0.06) pts.push({ X, Y, l, c: [R, G2, B2] }); }
    pts.sort((a, b) => b.l - a.l); const top = pts.slice(0, 18); this._src[h.id] = { t: this.time, pts: top }; return top;
  }
  _updateFeed(dt) {
    const F = this.s.holes.feed; this.feed = this.feed || []; this._fuel = this._fuel || {};
    if (!F || F.on === false) { this.feed.length = 0; return; }
    const holes = (this.engine.holes || []).filter(h => h._fid && h.size > 0 && h._vi >= 0).map(h => ({ id: h._fid, vi: h._vi, x: h.x * W, y: h.y * H, size: h.size, dir: h.diskDir || 1, rotZ: (h.rotZ || 0) * Math.PI / 180, flat: 0.3 + 0.28 * Math.abs(Math.sin((h.rotX || 15) * Math.PI / 180)) }));
    const byId = {}; for (const h of holes) { byId[h.id] = h; this._fuel[h.id] = Math.min(1, (this._fuel[h.id] || 0) + dt * 0.35); }
    for (const id in this._fuel) if (!byId[id]) delete this._fuel[id];
    this._emit = this._emit || {};
    for (const h of holes) {
      const rate = (F.amount || 1) * (14 + 16 * h.vi), cap = 160 + 60 * h.vi; this._emit[h.id] = (this._emit[h.id] || 0) + rate * dt;
      let n = Math.floor(this._emit[h.id]); this._emit[h.id] -= n; const have = this.feed.reduce((s, p) => s + (p.hid === h.id), 0); n = Math.min(n, Math.max(0, cap - have));
      const src = this._feedSources(h), c = Math.cos(-h.rotZ), s2 = Math.sin(-h.rotZ);
      for (let k = 0; k < n; k++) { let X, Y, col, lum;
        if (src.length && Math.random() < 0.85) { const q = src[Math.floor(Math.pow(Math.random(), 1.6) * src.length)]; X = q.X + (Math.random() - 0.5) * h.size * 0.8; Y = q.Y + (Math.random() - 0.5) * h.size * 0.8; col = q.c; lum = q.l; }
        else { const a = Math.random() * 6.283, rr = h.size * (4 + Math.random() * 3); X = h.x + Math.cos(a) * rr; Y = h.y + Math.sin(a) * rr; col = [0.55, 0.58, 0.68]; lum = 0.08; }
        const lx = X - h.x, ly = Y - h.y, ux = lx * c - ly * s2, uy = (lx * s2 + ly * c) / h.flat;
        const m = Math.max(...col, 1e-3);
        this.feed.push({ hid: h.id, r: Math.max(h.size * 1.6, Math.hypot(ux, uy)), ang: Math.atan2(uy, ux), col: col.map(v => 0.35 + 0.65 * v / m), lum, sz: 0.6 + Math.random() * 1.6, age: 0, jit: Math.random() }); }
    }
    for (const p of this.feed) { const h = byId[p.hid]; if (!h) { p.dead = true; continue; }
      p.age += dt; const sp = (0.55 + 0.18 * h.vi) * (F.pull || 1);
      const w = h.dir * sp * 1.4 * Math.pow(h.size * 2 / p.r, 1.5); p.prevA = p.ang; p.prevR = p.r;
      p.ang += w * dt; p.r -= (p.r * 0.09 + h.size * 0.25) * sp * dt * (7 / Math.max(2, F.spiralSeconds || 7));
      if (p.r < h.size * 1.03) p.dead = true; p.h = h; }
    this.feed = this.feed.filter(p => !p.dead);
  }
  _drawFeed(x, sc) {
    if (!this.feed || !this.feed.length) return;
    x.save(); x.lineCap = 'round';
    for (const p of this.feed) { const h = p.h; if (!h) continue;
      const c = Math.cos(h.rotZ), s2 = Math.sin(h.rotZ), pos = (a, rr) => { const ux = Math.cos(a) * rr, uy = Math.sin(a) * rr * h.flat; return [(h.x + ux * c - uy * s2) * sc, (h.y + ux * s2 + uy * c) * sc]; };
      const t = Math.max(0, Math.min(1, 1 - (p.r - h.size) / (h.size * 5))), heat = Math.min(1, h.vi / 5) * t;
      // far out: barely there; in the swirl: brighter, and hotter the more viewers
      const a = Math.min(1, (0.035 + 0.5 * t * t) * (0.45 + 0.22 * h.vi) * Math.min(1, p.age * 2) * (0.7 + 0.6 * p.lum));
      const hot = [1, 0.93 + 0.05 * h.vi / 5, 0.82 + 0.15 * h.vi / 5], col = p.col.map((v, i) => Math.min(1, v * (1 - heat) + hot[i] * heat) * (0.7 + 0.5 * t + 0.25 * h.vi * t));
      const [x0, y0] = pos(p.prevA ?? p.ang, p.prevR ?? p.r), [x1, y1] = pos(p.ang, p.r), tail = 2.5 + 5 * t;
      x.globalCompositeOperation = t > 0.3 ? 'lighter' : 'source-over'; x.strokeStyle = `rgba(${col[0] * 255 | 0},${col[1] * 255 | 0},${col[2] * 255 | 0},${a})`;
      x.lineWidth = p.sz * sc * (1.4 - 0.6 * t); x.beginPath(); x.moveTo(x1 + (x0 - x1) * tail, y1 + (y0 - y1) * tail); x.lineTo(x1, y1); x.stroke(); }
    x.restore();
  }
  // Views preview: every stage, one after another, the next comes in as the last one starts to leave
  _tourHoles(out, faces) {
    const hs = this.s.holes, B = hs.behavior, isF = hs.active !== 'viewers', T = isF ? hs.dashboards.friends.tiers : hs.dashboards.viewers.tiers, v = B.tourSpeed ?? 55;
    const dt = Math.max(0, Math.min(0.1, this.time - (this._tourT ?? this.time))); this._tourT = this.time;
    const szOf = i => (isF ? this.friendSizeAt(i) : this.friendSizeAt(Math.min(2, hs.dashboards.friends.tiers.length - 1)) * (hs.oneZoom || 1.4)) * B.sizeScale; const sz = szOf(T.length - 1), m = sz * 3.5;
    if (!this._tour || !this._tour.length || this._tourF !== isF) { this._tourF = isF; this._tour = [{ i: 0, x: szOf(0) * 1.5, n: (this._tourN = (this._tourN || 0) + 1) }]; }
    for (const t of this._tour) t.x += v * dt;
    const last = this._tour[this._tour.length - 1]; const ni = (last.i + 1) % T.length, nx = last.x - (B.tourGap ?? 140) - szOf(last.i) - szOf(ni); if (nx >= -szOf(ni) * 3.5) this._tour.push({ i: ni, x: nx, n: (this._tourN = (this._tourN || 0) + 1) });
    this._tour = this._tour.filter(t => t.x < W + m);
    const tags = [];
    for (const t of this._tour) { const c = this.contacts[t.i % this.contacts.length]; const fake = { id: c.id, name: c.name, counts: isF ? { followers: T[t.i].start, viewers: 0 } : { followers: hs.dashboards.friends.tiers[2].start, viewers: T[t.i].start } }; const tsz = szOf(t.i);
      const L = this.lookFor(fake), y = (B.tourY ?? 0.22) + (t.n % 2 ? 0 : (B.tourZig ?? 0.06));
      this._expand(Object.assign({}, L.look, { x: t.x / W, y, size: tsz, lens: L.look.lens * B.lensAll, seed: t.n * 1.7, _vi: isF ? -1 : t.i, _fid: 'tour' + t.n }), c, out, faces);
      tags.push({ c, x: t.x, y: y * H, r: tsz, form: 1, label: `${t.i + 1}. ${T[t.i].name}`, sub: `${T[t.i].start}+ ${isF ? 'followers' : 'viewers'}`, tier: t.i }); }
    this._faceSlots(faces.slice(0, G.BH.MAXH)); this._tagged = tags; return out.slice(0, G.BH.MAXH);
  }
  /* ---------------- black holes ---------------- */
  friendSizeAt(i) {
    const fs = this.s.holes.friendSize, t = this.s.holes.dashboards.friends.tiers; const n = t.length;
    if (!fs || !fs.auto) return t[i].look.size;
    return fs.min + (fs.max - fs.min) * (n > 1 ? i / (n - 1) : 0);
  }
  lookFor(contact) {
    const D = this.s.holes.dashboards; const fT = D.friends.tiers, vT = D.viewers.tiers; const hs = this.s.holes;
    let fi = tierAt(fT, contact.counts?.followers || 0), vi = tierAt(vT, contact.counts?.viewers || 0);
    // on the Followers dash, the sky shows one hole of every Followers tier (no view effects)
    if (hs.active === 'friends' && hs.mode === 'sky') { const k = this.contacts.indexOf(contact); if (k >= 0) { fi = k % fT.length; vi = 0; } }
    const look = Object.assign({}, fT[fi].look);
    if (vi > 0) for (const k of VIEW_KEYS) if (vT[vi].look[k] !== undefined) look[k] = vT[vi].look[k];
    look.size = this.friendSizeAt(fi);
    if (vi > 0 && look.vary > 0) { const h = hash(contact.id || contact.name);
      look.rotX = Math.max(0, Math.min(88, look.rotX + (h(1) - 0.3) * 60 * look.vary));
      look.rotZ = (look.rotZ || 0) + (h(2) - 0.5) * 90 * look.vary; look.rotY = (look.rotY || 0) + (h(3) - 0.5) * 40 * look.vary;
      if (h(4) < 0.4) look.diskDir = -1; look.seed = h(5) * 20; }
    return { tier: fi + ':' + vi, fi, vi, look, seconds: vi > 0 ? vT[vi].seconds : fT[fi].seconds };
  }
  _spawn(c, fresh) {
    const B = this.s.holes.behavior; const L = this.lookFor(c);
    const y = lerp(B.bandTop, B.bandBottom, Math.random()) * H;
    const x = fresh ? (this.sky.length + 0.5) / Math.max(1, Math.min(B.count, this.contacts.length)) * W * 1.6 - W * 0.3 : (B.direction < 0 ? W + 60 : -60);
    return { c, x, y, y0: y, ph: Math.random() * 6.28, form: fresh ? 1 : 0, tier: L.tier, cur: Object.assign({}, L.look), from: null, tt: 1, vx: 0, vy: 0 };
  }
  _updateSky(dt) {
    const B = this.s.holes.behavior, hs = this.s.holes;
    if (hs.mode !== 'sky') return;
    const want = Math.min(B.count, this.contacts.length, G.BH.MAXH);
    // keep pool
    while (this.sky.length < want) { const used = new Set(this.sky.map(h => h.c)); const c = this.contacts.find(k => !used.has(k)); if (!c) break; this.sky.push(this._spawn(c, true)); }
    while (this.sky.length > want) this.sky.pop();
    for (const h of this.sky) {
      const L = this.lookFor(h.c);
      h.vi = L.vi;
      if (L.tier !== h.tier) { h.from = Object.assign({}, h.cur); h.tier = L.tier; h.tt = 0; h.tdur = Math.max(0.01, L.seconds); }
      if (h.tt < 1) { h.tt = Math.min(1, h.tt + dt / h.tdur); h.cur = blendLook(h.from, L.look, ease(h.tt)); } else h.cur = Object.assign({}, L.look);
      h.form = Math.min(1, h.form + dt / Math.max(0.05, B.formSeconds));
    }
    // motion: each hole keeps its own lane, drifts, and is never allowed to overlap another (hard rule)
    const n = this.sky.length; const top = B.bandTop * H, bot = Math.max(B.bandTop * H + 40, B.bandBottom * H);
    const ext = h => h.cur.size * B.sizeScale * (h.cur.disk > 0.5 ? Math.max(1.35, h.cur.diskOut / 2.6 * 0.5) : 1.35);
    const sz = h => h.cur.size * B.sizeScale;
    const warpR = h => sz(h) * (1 + 0.9 * Math.min(6, h.cur.edgeWidth ?? 3)) * (h.cur.lens > 0.2 ? 1 : 0.5);
    // capture: a much smaller hole that wanders into a big one's warp gets caught, orbits it, then is slung away
    const cap = B.capture ?? 1;
    for (const a of this.sky) { a.cool = Math.max(0, (a.cool || 0) - dt); a.slung = Math.max(0, (a.slung || 0) - dt); if (a.host && !this.sky.includes(a.host)) a.host = null; }
    if (cap > 0) for (const a of this.sky) {
      if (a.host || a.cool > 0 || this.sky.some(o => o.host === a)) continue;
      for (const b2 of this.sky) { if (b2 === a || b2.host || sz(a) > sz(b2) * (B.captureRatio ?? 0.7)) continue;
        const dx = a.x - b2.x, dy = (a.y - b2.y) / 0.55, d = Math.hypot(dx, dy);
        if (d < warpR(b2) * (0.8 + 0.8 * cap)) { a.host = b2; a.orR = d; a.orA = Math.atan2(dy, dx);
          const vt = -((a.vx || 0) - (b2.vx || 0)) * Math.sin(a.orA) + ((a.vy || 0) - (b2.vy || 0)) * Math.cos(a.orA);
          a.orDir = vt !== 0 ? Math.sign(vt) : (Math.random() < 0.5 ? -1 : 1); a.orT = (B.orbitTime ?? 14) * (0.6 + 0.8 * Math.random()); a.orE = 0; break; } } }
    for (const a of this.sky) { if (!a.host) continue; const h0 = a.host;
      const rIn = ext(h0) + ext(a) + B.minGap * 0.5, rT = Math.max(rIn, Math.min(a.orR, ext(h0) * 1.5 + ext(a)));
      a.orR += (rT - a.orR) * Math.min(1, dt * 0.15);
      const w = (B.orbitSpeed ?? 0.3) * 0.9 * Math.pow((ext(h0) * 2) / a.orR, 1.5) * a.orDir; a.orE = Math.min(1, (a.orE ?? 1) + dt / 3); a.orA += w * a.orE * dt;
      const nx = h0.x + Math.cos(a.orA) * a.orR, ny = h0.y + Math.sin(a.orA) * a.orR * 0.55;
      a.vx = (nx - a.x) / Math.max(dt, 1e-3); a.vy = (ny - a.y) / Math.max(dt, 1e-3); a.x = nx; a.y = ny;
      a.orT -= dt; if (a.orT <= 0) { const k = (B.sling ?? 1.3); a.vx *= k; a.vy *= k; const sp = Math.hypot(a.vx, a.vy), mx = 80; if (sp > mx) { a.vx *= mx / sp; a.vy *= mx / sp; } a.host = null; a.cool = 9; a.slung = 3; } }
    this.sky.forEach((a, i) => {
      if (a.lane === undefined) a.lane = i;
      if (a.host) return;
      const laneY = n > 1 ? top + (bot - top) * ((a.lane % n) / (n - 1)) : (top + bot) / 2;
      a.ph += dt * 0.35; const wob = Math.sin(a.ph) * B.wobble * 5;
      a.x += B.direction * B.speed * (0.8 + 0.4 * ((a.lane * 37) % 10) / 10) * dt;
      a.y += (laneY + wob - a.y) * Math.min(1, dt * (a.slung > 0 ? 0.08 : 0.6));
    });
    // real pull: every hole accelerates toward the others by their mass (size cubed) over distance squared;
    // bigger ones swing the smaller ones off their lanes, then the lane slowly brings them back
    if (B.interact > 0) { const m = h => Math.pow(h.cur.size * B.sizeScale / 30, 3);
      for (const a of this.sky) { if (a.host) continue; let ax = 0, ay = 0; for (const b2 of this.sky) { if (a === b2) continue; const dx = b2.x - a.x, dy = b2.y - a.y, d2 = dx * dx + dy * dy + 900, d = Math.sqrt(d2);
          const g = B.interact * 9000 * m(b2) / d2; ax += dx / d * g; ay += dy / d * g; }
        a.vx = (a.vx || 0) * Math.exp(-dt * 0.8) + ax * dt; a.vy = (a.vy || 0) * Math.exp(-dt * 0.8) + ay * dt;
        const sp = Math.hypot(a.vx, a.vy), vcap = a.slung > 0 ? 80 : 60; if (sp > vcap) { a.vx *= vcap / sp; a.vy *= vcap / sp; }
        a.x += a.vx * dt; a.y += a.vy * dt; } }
    for (let it = 0; it < 4; it++) for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const a = this.sky[i], b2 = this.sky[j]; if (a.host === b2 || b2.host === a) continue; const dx = b2.x - a.x, dy = b2.y - a.y, d = Math.hypot(dx, dy) + 1e-3;
      const warp = h => h.cur.size * B.sizeScale * (1 + 0.9 * Math.min(6, h.cur.edgeWidth ?? 3)) * (h.cur.lens > 0.2 ? 1 : 0.5); const small = (B.capture ?? 1) > 0 && Math.min(sz(a), sz(b2)) <= Math.max(sz(a), sz(b2)) * (B.captureRatio ?? 0.7); const min = small ? ext(a) + ext(b2) + B.minGap : Math.max(ext(a) + ext(b2) + B.minGap, (warp(a) + warp(b2)) * (B.warpApart ?? 0.75)); if (d < min) { const ma = Math.pow(a.cur.size, 3), mb = Math.pow(b2.cur.size, 3), ka = mb / (ma + mb), kb = ma / (ma + mb); const push = (min - d); a.x -= dx / d * push * ka; a.y -= dy / d * push * ka; b2.x += dx / d * push * kb; b2.y += dy / d * push * kb;
        const nx = dx / d, ny = dy / d, rv = ((b2.vx || 0) - (a.vx || 0)) * nx + ((b2.vy || 0) - (a.vy || 0)) * ny; if (rv < 0) { a.vx = (a.vx || 0) + nx * rv * ka; a.vy = (a.vy || 0) + ny * rv * ka; b2.vx = (b2.vx || 0) - nx * rv * kb; b2.vy = (b2.vy || 0) - ny * rv * kb; } }
    }
    for (const a of this.sky) {
      if (!a.host && !a.slung) a.y = clamp(a.y, top, bot); else a.y = clamp(a.y, top - 80, bot + 60);
      const out = B.direction < 0 ? a.x < -ext(a) - 30 : a.x > W + ext(a) + 30;
      if (out) { const lane = a.lane; const far = B.direction < 0 ? Math.max(W, ...this.sky.map(o => o.x + ext(o))) + ext(a) * 2.5 + B.minGap + 20 : Math.min(0, ...this.sky.map(o => o.x - ext(o))) - ext(a) * 2.5 - B.minGap - 20;
        const used = new Set(this.sky.map(o => o.c)); this._rot = (this._rot || 0); let nc = a.c;
        for (let k = 0; k < this.contacts.length; k++) { this._rot = (this._rot + 1) % this.contacts.length; const c = this.contacts[this._rot]; if (!used.has(c)) { nc = c; break; } }
        for (const o of this.sky) if (o.host === a) { o.host = null; o.cool = 4; } Object.assign(a, this._spawn(nc, false)); a.host = null; a.slung = 0; a.lane = lane; a.x = far; a.y = n > 1 ? top + (bot - top) * (lane / (n - 1)) : (top + bot) / 2; }
    }
  }
  _expand(h, c, out, faces) {
    if (!h.pair) { out.push(h); faces.push(c); return; }
    const ang = this.time * h.pairSpeed * Math.PI * 0.5, q = h.pairRatio, sepPx = h.size * h.pairSep;
    const r1 = sepPx * q / (1 + q), r2 = sepPx / (1 + q), ca = Math.cos(ang), sa = Math.sin(ang);
    const a = Object.assign({}, h, { x: h.x + ca * r1 / W, y: h.y + sa * h.pairTilt * r1 / H });
    const b = Object.assign({}, h, { x: h.x - ca * r2 / W, y: h.y - sa * h.pairTilt * r2 / H, size: h.size * q, seed: (h.seed || 0) + 3.3, _pairB: 1 });
    if (sa > 0) { out.push(b, a); faces.push(null, c); } else { out.push(a, b); faces.push(c, null); }
  }
  _holesForEngine() {
    const hs = this.s.holes, B = hs.behavior, out = [], faces = [];
    if (hs.mode === 'focus') {
      const TT = hs.dashboards[hs.active].tiers; const t = TT[Math.min(TT.length - 1, Math.max(0, parseInt(hs.selTier) || 0))]; const look = this.focusLook || t.look;
      const sz = hs.active === 'friends' ? this.friendSizeAt(hs.selTier) : look.size;
      let fx = hs.focus.x; if (B.driftViews !== false && B.speed > 0) { const span = W + 160; fx = ((((fx * W + this.time * B.speed * (B.direction || 1) + 80) % span) + span) % span - 80) / W; }
      this._expand(Object.assign({}, look, { x: fx, y: hs.focus.y, size: sz * B.sizeScale * (hs.active === 'friends' ? 1 : (this.focusZoom || 1.6)), lens: look.lens * B.lensAll, form: look.form * (this.formPreview ?? 1), _vi: hs.active === 'viewers' ? (parseInt(hs.selTier) || 0) : -1, _fid: 'focus' }), this._testContact || this.contacts[0], out, faces);
      this._faceSlots(faces); this._tagged = [{ c: this._testContact || this.contacts[0], x: fx * W, y: hs.focus.y * H, r: sz * B.sizeScale * (hs.active === 'friends' ? 1 : (this.focusZoom || 1.6)), form: 1, label: t.name }];
      return out;
    }
    if (hs.mode === 'viewsTour') return this._tourHoles(out, faces);
    if (hs.mode === 'friendsAll' || hs.mode === 'friendsOne') {
      const isV = hs.active === 'viewers'; const T = isV ? hs.dashboards.viewers.tiers : hs.dashboards.friends.tiers; const tags = [];
      const idx = hs.mode === 'friendsOne' ? [Math.min(hs.selTier, T.length - 1)] : T.map((_, i) => i);
      idx.forEach((i, k) => {
        const n = idx.length; const col = n === 1 ? 0 : k % 3, row = n === 1 ? 0 : Math.floor(k / 3);
        let x = n === 1 ? 0.5 : 0.18 + col * 0.32; const y = n === 1 ? 0.22 : 0.11 + row * 0.22;
        if (B.driftViews !== false) { const span = W + 160; const px = ((x * W + this.time * B.speed * (B.direction || 1) + 80) % span + span) % span - 80; x = px / W; }
        const c = this.contacts[i % this.contacts.length];
        let look = T[i].look, szBase = this.friendSizeAt(i);
        if (isV) { const fake = { id: c.id, name: c.name, counts: { followers: hs.dashboards.friends.tiers[2].start, viewers: T[i].start } }; const L = this.lookFor(fake); look = L.look; szBase = L.look.size; }
        const sz = szBase * B.sizeScale * (n === 1 ? (hs.oneZoom || 1.4) : 1);
        this._expand(Object.assign({}, look, { x, y, size: sz, lens: look.lens * B.lensAll, seed: i * 2.1, _vi: isV ? i : -1, _fid: 't' + i }), c, out, faces);
        tags.push({ c, x: x * W, y: y * H, r: sz, form: 1, label: `${i + 1}. ${T[i].name}`, sub: `${T[i].start}+ ${isV ? 'viewers' : 'followers'}`, tier: i });
      });
      this._faceSlots(faces.slice(0, G.BH.MAXH)); this._tagged = tags;
      return out.slice(0, G.BH.MAXH);
    }
    for (const h of this.sky) { if (out.length >= G.BH.MAXH) break; this._expand(Object.assign({}, h.cur, { x: h.x / W, y: h.y / H, size: h.cur.size * B.sizeScale, lens: h.cur.lens * B.lensAll, form: h.cur.form * h.form, seed: (h.c.name.charCodeAt(0) % 17) * 1.7, _vi: hs.active === 'viewers' ? (h.vi || 0) : -1, _fid: 'c' + (h.c.id || h.c.name) }), h.c, out, faces); }
    this._faceSlots(faces.slice(0, G.BH.MAXH));
    const fT2 = hs.dashboards.friends.tiers; const showTier = hs.active === 'friends';
    this._tagged = this.sky.map(h => { const k = this.contacts.indexOf(h.c) % fT2.length;
      return { c: h.c, x: h.x, y: h.y, r: h.cur.size * B.sizeScale, form: h.form, h, label: showTier ? `${k + 1}. ${fT2[k].name}` : undefined, sub: showTier ? `${fT2[k].start}+ followers` : undefined }; });
    return out.slice(0, G.BH.MAXH);
  }
  _faceSlots(cs) {
    const key = cs.map(c => c && c.face + (this._ready(this.img(c.face)) ? 1 : 0)).join('|'); if (key === this._faceKey) return; this._faceKey = key;
    this.engine.faces = cs.map(c => c && this._ready(this.img(c.face)) ? this.img(c.face) : null); this.engine._uploadFaces();
  }
  /* ---------------- sphere + rolodex + tabs ---------------- */
  _drawOverlay() {
    const x = this.ctx, k = this.ovScale; x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, this.ov.width, this.ov.height); x.setTransform(k, 0, 0, k, 0, 0);
    if (this._bandFlash && performance.now() - this._bandFlash < 2500) { const B2 = this.s.holes.behavior; const a = 1 - (performance.now() - this._bandFlash) / 2500;
      x.save(); x.globalAlpha = 0.85 * a; x.strokeStyle = '#59eaff'; x.setLineDash([6, 5]); x.lineWidth = 1.2; x.fillStyle = 'rgba(89,234,255,0.08)';
      x.fillRect(0, B2.bandTop * H, W, (B2.bandBottom - B2.bandTop) * H);
      for (const yy of [B2.bandTop, B2.bandBottom]) { x.beginPath(); x.moveTo(0, yy * H); x.lineTo(W, yy * H); x.stroke(); } x.restore(); }
    // name + live view tags tethered to each hole
    if (this.s.holes.callout.on && this._tagged) this._drawCallouts(x, this._tagged);
    const S = this.s.sphere, R = this.s.rolodex, T = this.s.tabs;
    const cx = S.x * W, cy = S.y * H, rad = S.r * W;
    const items = this._rollItems(cx, cy, rad);
    for (const it of items) it.box = this._tabBox(x, it);
    if (items.some(it => it.z < 0)) { x.save(); x.beginPath(); x.rect(0, 0, W, H); x.arc(cx, cy, rad, 0, Math.PI * 2, true); x.clip('evenodd'); for (const it of items) if (it.z < 0) this._drawBust(x, it); x.restore(); }
    if (S.show) this._drawSphere(x, cx, cy, rad, items);
    for (const it of items) if (it.z >= 0) this._drawBust(x, it);
    if (T.show) for (const it of items) if (it.z >= 0 && it.s >= T.minScale) this._drawTab(x, it);
    this._items = items;
  }
  _fmtCount(n) { const f = this.s.holes.callout.countFormat; if (f === 'full') return Math.round(n).toLocaleString(); if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M'; if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + 'K'; return String(Math.round(n)); }
  _drawCallouts(x, tags) {
    const C = this.s.holes.callout; this._co = this._co || new Map();
    const dims = tags.map(t => { x.font = `${C.nameBold ? 700 : 500} ${C.nameSize}px system-ui,sans-serif`; const nw = x.measureText(t.label || t.c.name).width;
      const cnt = t.sub || (this._fmtCount(t.c.counts?.viewers || 0) + (C.countLabel ? ' ' + C.countLabel : '')); x.font = `600 ${C.countSize}px system-ui,sans-serif`; const cw = C.showCount ? x.measureText(cnt).width : 0;
      return { w: Math.max(nw, 10) + C.padX * 2, h: C.nameSize + C.padY * 2, cnt, cw }; });
    const dt = Math.min(0.05, this._dtLast || 0.016);
    tags.forEach((t, i) => {
      const d = dims[i]; const key = t.c.id + (t.tier ?? '');
      // choose the side whose tag stays clear of other holes and on screen (auto), else the angle you set
      const cands = C.auto ? [C.angle, 180 - C.angle] : [C.angle];
      let best = null;
      for (const ang of cands) {
        const g = this._calloutGeo(t, ang, d); let pen = 0;
        for (const o of tags) { if (o === t) continue; const cx = g.tx + d.w / 2, cy = g.ty + d.h / 2; const dd = Math.hypot(cx - o.x, cy - o.y); const need = o.r * 1.6 + Math.max(d.w, d.h) * 0.6; if (dd < need) pen += (need - dd) * 3 * C.dodge;
          const g2 = this._co.get(o.c.id + (o.tier ?? '')); if (g2) { const ox = Math.max(0, Math.min(g.tx + d.w, g2.tx + g2.w) - Math.max(g.tx, g2.tx)), oy = Math.max(0, Math.min(g.ty + d.h + C.countSize + 4, g2.ty + g2.h) - Math.max(g.ty, g2.ty)); pen += ox * oy * 0.05 * C.dodge; } }
        if (g.tx < 4) pen += (4 - g.tx) * 4; if (g.tx + d.w > W - 4) pen += (g.tx + d.w - W + 4) * 4; if (g.ty < 4) pen += (4 - g.ty) * 4;
        if (ang !== C.angle) pen += 6; const prev = this._co.get(key); if (prev && prev.ang === ang) pen -= 10;
        if (!best || pen < best.pen) best = { ang, pen, g };
      }
      const prev = this._co.get(key); const k = 1 - Math.exp(-dt * C.smooth * 3);
      const cur = prev ? { ang: best.ang, tx: prev.tx + (best.g.tx - prev.tx) * k, ty: prev.ty + (best.g.ty - prev.ty) * k, bx: prev.bx + (best.g.bx - prev.bx) * k, by: prev.by + (best.g.by - prev.by) * k, w: d.w, h: d.h + (C.showCount ? C.countSize + 4 : 0) } : Object.assign({ ang: best.ang, w: d.w, h: d.h }, best.g);
      cur.ex = t.x + Math.cos(best.ang * Math.PI / 180) * t.r * 1.08; cur.ey = t.y + Math.sin(best.ang * Math.PI / 180) * t.r * 1.08;
      this._co.set(key, cur);
      // draw: hole edge -> bend -> tag
      x.save(); x.globalAlpha = (t.form ?? 1);
      x.strokeStyle = C.lineColor; x.lineWidth = C.lineWidth; x.shadowColor = C.lineColor; x.shadowBlur = 5 * C.lineGlow; x.globalAlpha *= C.lineOpacity;
      const side = cur.tx + d.w / 2 < cur.bx ? 1 : 0; const ax = side ? cur.tx + d.w : cur.tx, ay = cur.ty + d.h / 2;
      x.beginPath(); x.moveTo(cur.ex, cur.ey); x.lineTo(cur.bx, cur.by); x.lineTo(ax, ay); x.stroke(); x.restore();
      x.save(); x.globalAlpha = (t.form ?? 1);
      x.fillStyle = hexA(C.tabFill, C.tabOpacity); x.strokeStyle = C.tabColor; x.lineWidth = C.border; x.shadowColor = C.tabColor; x.shadowBlur = 8 * C.tabGlow;
      x.beginPath(); if (x.roundRect && C.corners > 0) x.roundRect(cur.tx, cur.ty, d.w, d.h, Math.min(C.corners, d.h / 2)); else x.rect(cur.tx, cur.ty, d.w, d.h); x.fill(); x.stroke(); x.shadowBlur = 0;
      x.fillStyle = C.nameColor; x.textBaseline = 'middle'; x.textAlign = 'center'; x.font = `${C.nameBold ? 700 : 500} ${C.nameSize}px system-ui,sans-serif`;
      x.fillText(t.label || t.c.name, cur.tx + d.w / 2, cur.ty + d.h / 2 + 0.5);
      if (C.showCount) { x.font = `600 ${C.countSize}px system-ui,sans-serif`; x.fillStyle = C.countColor; x.shadowColor = C.countColor; x.shadowBlur = 4; x.textAlign = side ? 'right' : 'left';
        x.fillText(d.cnt, side ? cur.tx + d.w : cur.tx, cur.ty + d.h + C.countSize / 2 + 3); }
      x.restore();
    });
  }
  _calloutGeo(t, ang, d) {
    const C = this.s.holes.callout; const a = ang * Math.PI / 180; const ex = t.x + Math.cos(a) * t.r * 1.08, ey = t.y + Math.sin(a) * t.r * 1.08;
    const bx = ex + Math.cos(a) * C.len1, by = ey + Math.sin(a) * C.len1; const dir = Math.cos(a) >= 0 ? 1 : -1;
    const tx = dir > 0 ? bx + C.len2 : bx - C.len2 - d.w; const ty = by - d.h / 2;
    return { bx, by, tx, ty };
  }
  _rollItems(cx, cy, rad) {
    const R = this.s.rolodex; const n = this.contacts.length; if (!n) return [];
    const out = []; const off = this.roll.off; const base = Math.floor(off); const frac = off - base;
    const half = Math.ceil(R.count / 2) + 1;
    for (let k = -half; k <= half; k++) {
      const idx = ((base + k) % n + n) % n; const c = this.contacts[idx];
      const a = (k - frac) * R.spacing * Math.PI / 180;            // angle along drum
      if (Math.abs(a) > Math.PI * 0.75) continue;
      // the path: an arc that bulges left across the sphere, extends past its top and bottom, then hooks round behind it
      // a ring around the sphere, turned to the side you choose: busts ride it, ends roll over the top and bottom and sink behind
      const side = (R.side ?? -70) * Math.PI / 180, pr = rad * R.pathR;
      const px = cx + R.offsetX * W + Math.sin(side) * Math.cos(a) * pr * R.bulge, py = cy + R.offsetY * H + Math.sin(a) * pr;
      const z = Math.cos(a);
      const sc = lerp(R.minScale, 1, clamp(z, 0, 1));
      out.push({ c, idx, a, x: px, y: py, z, s: sc, k: k - frac });
    }
    out.sort((p, q) => p.z - q.z); return out;
  }
  _drawBust(x, it) {
    const R = this.s.rolodex; const el = this.img(it.c.bust); if (!this._ready(el)) return;
    const frames = 11, fw = el.naturalWidth / frames, fh = el.naturalHeight;
    const ang = clamp(-it.a * 180 / Math.PI * R.turn, -25, 25); const f = clamp(Math.round((ang + 25) / 5), 0, 10);
    const h = R.bustH * it.s, w = h * fw / fh;
    x.save(); x.globalAlpha = it.z < 0 ? clamp(1 + it.z * 2, 0, 1) * (1 - R.behindFade) : 1;
    x.drawImage(el, f * fw, 0, fw, fh, it.x - w / 2, it.y - h * 0.62, w, h); x.restore();
  }
  _drawSphere(x, cx, cy, r, items) {
    const S = this.s.sphere; this._sph = this._sph || new SphereGL();
    const tex = this.img(S.texture); if (this._ready(tex)) this._sph.setTexture(tex);
    // each message tab lights the surface just behind it
    const T = this.s.tabs; const ga = (T.glowAngle || 0) * Math.PI / 180, gs = T.glowShift || 0;
    const lights = items.filter(it => it.z > 0 && T.show && it.box).map(it => { const b = it.box;
      return { x: (b.x + b.w / 2 + Math.cos(ga) * gs - cx) / r, y: (b.y + b.h / 2 - Math.sin(ga) * gs - cy) / r, hx: b.w / 2 / r, hy: b.h / 2 / r,
        k: Math.max(0, it.z) * (it.c.unread ? 1.2 : 0.85) * (T.glow || 1), soft: Math.min(1, (T.glowSoft || 0) / 20), c: S.lightColor || '#ffffff' }; });
    const sp = (T.glowSpread || 20) * 0.45 / r; const S2 = Object.assign({}, S, { lightWidth: S.lightWidth + sp, lightHeight: S.lightHeight + sp });
    if (S.autoLight !== false) S2._auto = this._autoLight(cx, cy, r, S.autoStrength ?? 1);
    const cv = this._sph.render(2 * r * this.ovScale, S2, lights, this.time);
    if (cv) x.drawImage(cv, cx - r, cy - r, 2 * r, 2 * r);
    else { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fillStyle = '#05060a'; x.fill(); }
  }
  // the sphere is lit by what is really around it: the sky above and any glowing black hole nearby
  _autoLight(cx, cy, r, k) {
    const now = this.time; if (!this._samp || now - (this._sampT || -9) > 0.25 || now < this._sampT) {
      this._samp = this._samp || document.createElement('canvas'); this._samp.width = 78; this._samp.height = 169;
      const sx = this._samp.getContext('2d', { willReadFrequently: true }); try { sx.drawImage(this.bgc, 0, 0, 78, 169); this._px = sx.getImageData(0, 0, 78, 169).data; } catch (e) { this._px = null; } this._sampT = now; }
    const px = this._px; const at = (fx, fy) => { if (!px) return [0.3, 0.3, 0.35]; const i = (Math.min(168, Math.max(0, Math.floor(fy * 169))) * 78 + Math.min(77, Math.max(0, Math.floor(fx * 78)))) * 4; return [px[i] / 255, px[i + 1] / 255, px[i + 2] / 255]; };
    const avg = (x0, x1, y0, y1) => { const s = [0, 0, 0]; let n = 0; for (let fy = y0; fy <= y1; fy += 0.02) for (let fx = x0; fx <= x1; fx += 0.04) { const c = at(fx, fy); s[0] += c[0]; s[1] += c[1]; s[2] += c[2]; n++; } return s.map(v => v / Math.max(1, n)); };
    // only light bright enough to actually illuminate counts (bright nebula, stars, glows) — dark sky gives nothing
    const emit = (x0, x1, y0, y1) => { const s = [0, 0, 0]; let n = 0; for (let fy = y0; fy <= y1; fy += 0.02) for (let fx = x0; fx <= x1; fx += 0.04) { const c = at(fx, fy); const l = c[0] * .3 + c[1] * .59 + c[2] * .11, e = Math.max(0, l - 0.32) / Math.max(l, 1e-3); s[0] += c[0] * e; s[1] += c[1] * e; s[2] += c[2] * e; n++; } return s.map(v => v / Math.max(1, n)); };
    // light from the sky all around it (above and beside): every bright patch shines on the side of the sphere facing it
    // every bright pixel around it (single stars, star clusters, nebula) shines on the side of the sphere facing it, falling off with distance
    let ex = 0, ey = 0, ez = 0; const ec = [0, 0, 0]; const thr = this.s.sphere.autoThreshold ?? 0.12;
    if (px) { const sc = 78 / W, pcx = cx * sc, pcy = cy * sc, pr = r * sc;
      for (let yy = Math.max(0, Math.floor(pcy - pr * 2.6)); yy < Math.min(169, pcy + pr * 2.6); yy++) for (let xx = Math.max(0, Math.floor(pcx - pr * 2.6)); xx < Math.min(78, pcx + pr * 2.6); xx++) {
        const dx = xx + 0.5 - pcx, dy = yy + 0.5 - pcy, rr = Math.hypot(dx, dy) / pr; if (rr < 1.0 || rr > 2.6) continue;
        const i = (yy * 78 + xx) * 4, c0 = px[i] / 255, c1 = px[i + 1] / 255, c2 = px[i + 2] / 255, l = c0 * .3 + c1 * .59 + c2 * .11; const e = Math.max(0, l - thr) / (rr * rr); if (e <= 0) continue;
        ec[0] += c0 * e; ec[1] += c1 * e; ec[2] += c2 * e; ex += dx / (rr * pr) * e; ey += -dy / (rr * pr) * e; ez += 0.2 * e; } }
    const eTot = ec[0] * .3 + ec[1] * .59 + ec[2] * .11, ecm = Math.max(1e-4, ...ec);
    const env = { k: Math.min(3.5, eTot * 0.07) * k, dir: [ex, ey, ez + 1e-4].map(v => v / Math.max(1e-4, Math.hypot(ex, ey, ez))), c: ec.map(v => 0.25 + 0.75 * v / ecm) };
    const top = 0, side = 0, topC = [0, 0, 0];
    const hl = new Float32Array(16), hc = new Float32Array(12); const hs = (this.engine.holes || []).map(h => {
      const hx = h.x * W, hy = h.y * H, d = Math.hypot(hx - cx, hy - cy), sz = h.size || 20;
      const br = (h.glow || 0) + 0.4 * (h.ring || 0) + 0.5 * (h.corona || 0) + (h.disk || 0) * (h.diskBright || 1) * (h.diskOpacity ?? 1) * 0.6 + 0.3 * (h.jets || 0);
      const near = Math.min(2, Math.pow(sz * 5 / Math.max(sz, d - r), 1.2));
      const c = avg(Math.max(0, (hx - sz * 2) / W), Math.min(1, (hx + sz * 2) / W), Math.max(0, (hy - sz * 2) / H), Math.min(1, (hy + sz * 2) / H)); const cm = Math.max(1e-3, ...c);
      return { k: br * near * k * (h.form ?? 1) * (h.opacity ?? 1) * 3, dir: [(hx - cx) / Math.max(d, 1), -(hy - cy) / Math.max(d, 1), 0.45], c: c.map(v => 0.3 + 0.7 * v / cm) }; })
      .concat([env]).sort((a, b) => b.k - a.k).slice(0, 4);
    hs.forEach((h, i) => { hl.set([h.dir[0], h.dir[1], h.dir[2], h.k], i * 4); hc.set(h.c, i * 3); });
    return { top, side, topC: new Float32Array(topC), hl, hc };
  }
  _tabGeo(x, it) {
    const T = this.s.tabs, S = this.s.sphere; const sc = T.shrink ? it.s : 1; const k = it.s;
    const nameX = it.x + 34 * k + T.offsetX, y = it.y - 6 * k + (T.offsetY || 0);
    x.font = `${T.nameStyle & 2 ? 'italic ' : ''}${T.nameStyle & 1 ? 700 : 400} ${T.nameSize * sc}px ${T.nameFont},sans-serif`; const nw = x.measureText(it.c.name).width;
    let bx;
    if (T.follow === 'sphere') { const cx = S.x * W, cy = S.y * H, rad = S.r * W; const dy = Math.max(-rad, Math.min(rad, y - cy)); bx = cx - Math.sqrt(rad * rad - dy * dy) * 0.55 + 40 + T.tabX; }
    else bx = nameX + nw + 3 + T.lineLen * sc + T.tabX;
    bx = Math.max(bx, nameX + nw + 4);
    let bw = T.boxW * sc; const bh = T.boxH * sc;
    // never run off the screen: slide the tab back toward its name, then shorten it if it still won't fit
    const edge = W - (T.edgeMargin ?? 10);
    if (bx + bw > edge) { bx = Math.max(nameX + nw + 6, edge - bw); if (bx + bw > edge) bw = Math.max(30, edge - bx); }
    return { sc, nameX, nameY: y, nw, box: { x: bx, y: y + (T.tabY || 0) - bh / 2, w: bw, h: bh } };
  }
  _tabBox(x, it) { return this._tabGeo(x, it).box; }
  _drawTab(x, it) {
    const T = this.s.tabs; const g = this._tabGeo(x, it), b = g.box, sc = g.sc;
    const a = Math.max(0, Math.min(1, (it.s - T.minScale) / (1 - T.minScale + 1e-3)));
    const state = it.c.unread ? (it.c.isNew ? 'new' : 'unread') : 'read';
    const alpha = a * (state === 'read' ? T.readDim : 1);
    x.save(); x.globalAlpha = Math.max(alpha, 0.6 + 0.4 * a);
    // name (its own brightness, not the tab's fade)
    x.font = `${T.nameStyle & 2 ? 'italic ' : ''}${T.nameStyle & 1 ? 700 : 400} ${T.nameSize * sc}px ${T.nameFont},sans-serif`; x.textBaseline = 'middle'; x.textAlign = 'left';
    { const keep = x.globalAlpha; const z = Math.max(0, Math.min(1, it.z)); x.globalAlpha = (T.nameFar ?? 0.92) + ((T.nameNear ?? 1) - (T.nameFar ?? 0.92)) * z;
      x.fillStyle = T.nameColor; x.shadowColor = 'rgba(0,0,0,.8)'; x.shadowBlur = 4; x.fillText(it.c.name, g.nameX, g.nameY); x.shadowBlur = 0; x.globalAlpha = keep; }
    // tether: name -> tab, always attached, stretches when the tab moves
    const l0x = g.nameX + g.nw + 3, l0y = g.nameY, l1x = b.x, l1y = b.y + b.h / 2;
    x.save(); x.globalAlpha *= T.lineOpacity; const lf = T.lineFade ?? 1, lg = x.createLinearGradient(l0x, l0y, l1x, l1y); lg.addColorStop(0, hexA(T.lineColor, 1 - lf)); lg.addColorStop(Math.min(0.99, Math.max(0.01, T.lineFadeLen ?? 0.75)), hexA(T.lineColor, 1 - lf * 0.15)); lg.addColorStop(1, hexA(T.lineColor, 1)); x.strokeStyle = lg; x.lineWidth = T.lineWidth; x.shadowColor = T.lineColor; x.shadowBlur = 6 * T.lineGlow;
    x.beginPath(); x.moveTo(l0x, l0y); if (Math.abs(l1y - l0y) > 1) { const mx = (l0x + l1x) / 2; x.lineTo(mx, l0y); x.lineTo(mx, l1y); } x.lineTo(l1x, l1y); x.stroke();
    x.fillStyle = T.lineColor; x.shadowBlur = 0; x.beginPath(); x.arc(l1x, l1y, 1.4, 0, 7); x.fill(); if (lf < 0.5) { x.beginPath(); x.arc(l0x, l0y, 1.4, 0, 7); x.fill(); } x.restore();
    // the tab
    const tint = state === 'new' ? T.newTint : state === 'unread' ? T.unreadTint : T.readTint;
    let fill = 'rgba(0,0,0,0)';
    if (T.style === 'fill') { const ang = (T.gradientAngle || 0) * Math.PI / 180; const cxm = b.x + b.w / 2, cym = b.y + b.h / 2, dx = Math.cos(ang) * b.w / 2, dy = Math.sin(ang) * b.h / 2;
      const gr = x.createLinearGradient(cxm - dx, cym - dy, cxm + dx, cym + dy); gr.addColorStop(0, hexA(T.box, tint * T.boxOpacity)); gr.addColorStop(Math.min(1, Math.max(0.01, T.gradientEnd)), hexA(T.color2, tint * T.boxOpacity * 0.9)); gr.addColorStop(1, hexA(T.color2, tint * T.boxOpacity * 0.6)); fill = gr; }
    const glow = T.glow * (it.c.unread ? T.unreadGlow : 1);
    glassBox(x, b.x, b.y, b.w, b.h, T.box, fill, glow, T.glowColor, T);
    // message
    x.font = `${T.msgStyle & 2 ? 'italic ' : ''}${T.msgStyle & 1 ? 700 : 500} ${T.msgSize * sc}px ${T.msgFont},sans-serif`; x.fillStyle = T.msgColor;
    const pad = T.msgPad * sc; let msg = it.c.msg || ''; const maxw = b.w - pad * 2; let cut = false;
    while (msg.length > 2 && x.measureText(msg).width > maxw) { msg = msg.slice(0, -1); cut = true; }
    if (cut) msg = msg.slice(0, -1) + '…';
    { const keep = x.globalAlpha; const z = Math.max(0, Math.min(1, it.z)); x.globalAlpha = (T.msgFar ?? 0.92) + ((T.msgNear ?? 1) - (T.msgFar ?? 0.92)) * z;
      x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 3; x.fillText(msg, b.x + pad, b.y + b.h / 2 + 0.5); x.shadowBlur = 0; x.globalAlpha = keep; }
    if (it.c.unread) { x.fillStyle = T.box; x.shadowColor = T.box; x.shadowBlur = 8; x.beginPath(); x.arc(b.x + b.w, b.y, 2.6, 0, 7); x.fill(); }
    x.restore();
  }
  /* ---------------- input ---------------- */
  _bindInput() {
    let drag = null;
    const pt = e => { const r = this.ov.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; };
    this.root.addEventListener('pointerdown', e => {
      const p = pt(e); drag = { p, last: p, t: performance.now(), moved: false };
      if (this.s.holes.mode === 'focus' && p.y < this.s.sphere.y * H - this.s.sphere.r * W) drag.kind = 'turn'; else drag.kind = 'roll';
      this.roll.vel = 0; this.root.setPointerCapture(e.pointerId);
    });
    this.root.addEventListener('pointermove', e => {
      if (!drag) return; const p = pt(e); const dy = p.y - drag.last.y, dx = p.x - drag.last.x; const now = performance.now(); const dtt = Math.max(1, now - drag.t) / 1000;
      if (Math.hypot(p.x - drag.p.x, p.y - drag.p.y) > 4) drag.moved = true;
      if (drag.kind === 'turn' && this.onTurn) this.onTurn(dx, dy);
      else { const R = this.s.rolodex; const step = (R.spacing * Math.PI / 180) * this.s.sphere.r * W * R.pathR; const d = -dy / step * R.swipe; this.roll.off += d; this.roll.vel = clamp(d / dtt, -R.maxSpeed, R.maxSpeed); }
      drag.last = p; drag.t = now;
    });
    this.root.addEventListener('pointerup', e => {
      if (!drag) return; const p = pt(e);
      if (!drag.moved) this._tap(p);
      if (!this.s.rolodex.inertia) this.roll.vel = 0;
      drag = null;
    });
  }
  _tap(p) {
    for (const h of this.sky) { const r = h.cur.size * this.s.holes.behavior.sizeScale; if (Math.hypot(p.x - h.x, p.y - h.y) < r * 1.4) { this.onHoleTap && this.onHoleTap(h); return; } }
    for (const it of (this._items || []).slice().reverse()) if (it.z > 0 && Math.abs(p.y - it.y) < 22 * it.s && p.x > it.x - 40 * it.s && p.x < it.x + 200 * it.s) { this.onContactTap && this.onContactTap(it.c); return; }
    this.onTapEmpty && this.onTapEmpty(p);
  }
  /* ---------------- loop ---------------- */
  _loop(now) {
    const rawDt = (now - (this._last || now)) / 1000; const dt = Math.min(0.05, rawDt); this._last = now;
    // keep it smooth: if frames get slow, lower the render sharpness a little (and raise it back when there is room)
    if (this.s.holes.behavior.autoQuality !== false && rawDt > 0) { this._ft = (this._ft || 0.016) * 0.95 + rawDt * 0.05; this._aq = this._aq || 1;
      if (++this._aqN > 40) { this._aqN = 0; const old = this._aq; if (this._ft > 0.034 && this._aq > 0.45) this._aq *= 0.85; else if (this._ft < 0.02 && this._aq < 1) this._aq = Math.min(1, this._aq * 1.1); if (old !== this._aq) this._resize(); } }
    else this._aq = 1;
    this._aqN = this._aqN || 0;
    if (this.playing) this.time += dt * this.speed;
    const sdt = this.playing ? dt * this.speed : 0; this._dtLast = dt;
    if (this.s.holes.liveViews && sdt > 0) { this._vt = (this._vt || 0) + sdt; if (this._vt > 0.7) { this._vt = 0; for (const c of this.contacts) { const v = c.counts.viewers || 0; if (v <= 0) continue; const step = Math.max(1, Math.round(v * 0.02)); c.counts.viewers = Math.max(1, v + Math.round((Math.random() - 0.45) * 2 * step)); } } }
    // rolodex inertia
    const R = this.s.rolodex;
    if (Math.abs(this.roll.vel) > 0.01) { this.roll.off += this.roll.vel * dt; this.roll.vel *= Math.exp(-dt / Math.max(0.05, R.coast)); }
    else if (R.settle) { const tgt = Math.round(this.roll.off); this.roll.off += (tgt - this.roll.off) * Math.min(1, dt * 6); this.roll.vel = 0; }
    try {
      this._updateSky(sdt);
      this._frameN = (this._frameN || 0) + 1; this._updateFeed(sdt);
      this._composeBg();
      this.engine.mutual = this.s.holes.behavior.mutual ?? 0.6; this.engine.holes = this._lightHoles(this._gateByFuel(this._holesForEngine())); this.engine.refl = this.s.holes.refl;
      this.engine.render(this.time);
      this._drawClips();
      this._drawOverlay();
    } catch (err) { if (!this._errShown) { console.error(err); this._errShown = true; } }
    if (this.onFrame) this.onFrame(this);
    requestAnimationFrame(this._loop);
  }
  snapshot() { const c = document.createElement('canvas'); c.width = this.ov.width; c.height = this.ov.height; const x = c.getContext('2d'); x.drawImage(this.gl, 0, 0, c.width, c.height); x.drawImage(this.ov, 0, 0); return c.toDataURL('image/png'); }
}

function blendLook(a, b, t) { if (!a) return Object.assign({}, b); const o = {}; for (const k in b) { const va = a[k], vb = b[k]; o[k] = (typeof vb === 'number' && typeof va === 'number') ? lerp(va, vb, t) : (t < 0.5 ? (va ?? vb) : vb); } return o; }
function hexA(c, a) { if (!c) return `rgba(0,0,0,${a})`; if (c.startsWith('rgba')) return c; if (c.startsWith('rgb(')) return c.replace('rgb(', 'rgba(').replace(')', `,${a})`); let h = c.replace('#', ''); if (h.length === 3) h = h.split('').map(z => z + z).join(''); const n = parseInt(h, 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
function shade(c, f) { let h = c.replace('#', ''); if (h.length === 3) h = h.split('').map(z => z + z).join(''); const n = parseInt(h, 16); const r = Math.min(255, (n >> 16 & 255) * f), g = Math.min(255, (n >> 8 & 255) * f), b = Math.min(255, (n & 255) * f); return `rgb(${r | 0},${g | 0},${b | 0})`; }
function glassBox(x, X, Y, w, h, stroke, fill, glow, glowColor, T) {
  x.save(); x.fillStyle = fill; x.strokeStyle = stroke; x.lineWidth = T ? (T.border || 1.4) : 1.4; x.shadowColor = glowColor || stroke;
  if (T) { const a = (T.glowAngle || 0) * Math.PI / 180; x.shadowBlur = ((T.glowSpread || 10) * 0.5 + (T.glowSoft || 0)) * glow; x.shadowOffsetX = Math.cos(a) * (T.glowShift || 0) * 0.3; x.shadowOffsetY = -Math.sin(a) * (T.glowShift || 0) * 0.3; } else x.shadowBlur = 12 * glow;
  x.beginPath(); const rr = T ? Math.min(T.corners || 0, h / 2) : 0; if (rr > 0 && x.roundRect) x.roundRect(X, Y, w, h, rr); else x.rect(X, Y, w, h); x.fill(); x.stroke(); x.shadowBlur = 0;
  x.globalAlpha *= 0.5; x.strokeStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.moveTo(X + 1, Y + 1); x.lineTo(X + w - 1, Y + 1); x.stroke(); x.restore();
}

G.Raven = { FEED_SPRITES, RavenScene, DEFAULT_SETTINGS, DEMO_CONTACTS, defaultTiers, tierAt, ensureDashboards, W, H, hexA };
})(window);
