/* =====================================================================
   RAVEN LIVE MAP — studio 1121. A live Mapbox map under the message
   clouds that follows the real clock (day, dusk, night, dawn) and drifts
   over the town like the old footage. Load after raven-conversation-1119.js.
   Everything the Mapbox account offers lives in the Map designer pop-up:
   search any place, destinations the camera tours, every look (Standard,
   Satellite, Streets, Outdoors, Light, Dark, Night drive, your own styles),
   themes, 3D buildings / trees / landmarks, terrain, fog, labels, colors.
   Mapbox's terms need its credit on screen, so the credit line is drawn
   (you can move and resize it, not remove it).
   ===================================================================== */
(() => {
'use strict';
const K = window.StudioKit, sc = K && K.screens && K.screens.conversation;
if (!sc) return;
let TOKEN = '';   // Mapbox public token, read from Supabase (studio_public_config) so it is not in the repo
const GL = 'https://api.mapbox.com/mapbox-gl-js/v3.9.4/';
const G = 'Live map';
const CITIES = [
  ['palmcoast', 'Palm Coast, FL', 29.5847, -81.2081], ['flaglerbeach', 'Flagler Beach, FL', 29.4750, -81.1270], ['daytona', 'Daytona Beach, FL', 29.2108, -81.0228],
  ['ormond', 'Ormond Beach, FL', 29.2858, -81.0559], ['newsmyrna', 'New Smyrna Beach, FL', 29.0258, -80.9270], ['staugustine', 'St. Augustine, FL', 29.8947, -81.3145],
  ['orlando', 'Orlando, FL', 28.5384, -81.3789], ['miami', 'Miami, FL', 25.7617, -80.1918], ['nyc', 'New York, NY', 40.7580, -73.9855],
  ['lasvegas', 'Las Vegas, NV', 36.1147, -115.1728], ['la', 'Los Angeles, CA', 34.0522, -118.2437], ['paris', 'Paris', 48.8584, 2.2945],
  ['tokyo', 'Tokyo', 35.6595, 139.7005], ['dubai', 'Dubai', 25.1972, 55.2744], ['oslo', 'Oslo', 59.9139, 10.7522], ['reykjavik', 'Reykjavik', 64.1466, -21.9426],
];
// [id, name, what it is, family]
const LOOKS = [
  ['standard-satellite', 'Satellite', 'Real photos with live day / night lighting', 'std'],
  ['standard', '3D city', 'Mapbox Standard: 3D buildings, landmarks, lighting', 'std'],
  ['satellite-streets-v12', 'Satellite + streets', 'Classic satellite with roads and names', 'classic'],
  ['streets-v12', 'Streets', 'Classic street map', 'classic'],
  ['outdoors-v12', 'Outdoors', 'Terrain shading, trails and parks', 'classic'],
  ['light-v11', 'Light', 'Pale and minimal', 'classic'],
  ['dark-v11', 'Dark', 'Dark and minimal', 'classic'],
  ['navigation-night-v1', 'Night drive', 'Mapbox navigation night', 'classic'],
  ['custom', 'Your own style', 'Any style you made in Mapbox Studio', 'custom'],
];
const FONTS = [['', 'Mapbox default'], ['Inter', 'Inter'], ['Roboto', 'Roboto'], ['Montserrat', 'Montserrat'], ['Lato', 'Lato'], ['Open Sans', 'Open Sans'], ['Poppins', 'Poppins'], ['Raleway', 'Raleway'], ['Nunito Sans', 'Nunito Sans']];
const COLORS = [['colorWater', 'Water'], ['colorLand', 'Land'], ['colorGreenspace', 'Parks & green'], ['colorRoads', 'Roads'], ['colorMotorways', 'Highways'], ['colorTrunks', 'Main roads'], ['colorBuildings', 'Buildings'], ['colorCommercial', 'Commercial areas'], ['colorEducation', 'Schools'], ['colorMedical', 'Hospitals'], ['colorIndustrial', 'Industrial'], ['colorPlaceLabels', 'Town names'], ['colorRoadLabels', 'Road names'], ['colorPointOfInterestLabels', 'Place names'], ['colorAdminBoundaries', 'Borders']];

/* ---------- controls (all saved with the page) ---------- */
const add = [], first = sc.SPEC.findIndex(s => s.group === 'Earth');
const def = (section, target, k, label, type, d, o = {}) => add.push(Object.assign({ group: G, section, target, k, label, type, def: d }, o));
const hidden = { hideIf: () => true };
def('Map designer', 'earth', 'lm.open', 'Open the Map designer', 'action', null, { onclick: () => openDesigner(), info: 'Search any place, set destinations the camera tours, pick the look, 3D, terrain, labels and colors.' });
def('Map', 'earth', 'lm.on', 'Live map instead of the Earth footage', 'bool', true, { info: 'A live Mapbox map of the town that follows the real time of day. Off = the old Earth footage.' });
def('Map', 'earth', 'lm.style', 'Look', 'select', 'standard-satellite', { opts: LOOKS.map(l => [l[0], l[1]]) });
def('Map', 'earth', 'lm.place', 'Town', 'select', 'palmcoast', { opts: [...CITIES.map(c => [c[0], c[1]]), ['search', 'Searched place (Map designer)']], info: 'In the app this is the user\'s own town (from their location). Picking any city is a subscription extra.' });
def('Map', 'earth', 'lm.follow', 'Use this device\'s location', 'bool', false, { info: 'On the phone it starts over wherever the phone is.' });
def('Map', 'earth', 'lm.zoom', 'How close', 'num', 14.2, { min: 3, max: 19, step: .05, info: 'Higher = closer to the ground.' });
def('Map', 'earth', 'lm.pitch', 'Tilt (0 = straight down)', 'num', 0, { min: 0, max: 85, step: .5, unit: '°' });
def('Map', 'earth', 'lm.bright', 'Brightness', 'num', 1, { min: .2, max: 1.8, step: .01, unit: '×' });
def('Map', 'earth', 'lm.sat', 'Color strength', 'num', 1, { min: 0, max: 2, step: .01, unit: '×' });
def('Map', 'earth', 'lm.opacity', 'Opacity', 'num', 1, { min: 0, max: 1, step: .01 });
def('Movement', 'earth', 'lm.speed', 'Travel speed', 'num', 22, { min: 0, max: 400, step: 1, unit: 'km/h', info: 'How fast the camera drifts over the town. 0 = still.' });
def('Movement', 'earth', 'lm.heading', 'Travel direction', 'num', 35, { min: 0, max: 360, step: 1, unit: '°' });
def('Movement', 'earth', 'lm.turn', 'Slow turn', 'num', .6, { min: -20, max: 20, step: .05, unit: '°/s', info: 'The map slowly turns while it drifts. 0 = no turn.' });
def('Movement', 'earth', 'lm.wander', 'Wander back and forth', 'bool', true, { info: 'Turns around before going too far from town, so it never leaves the area.' });
def('Movement', 'earth', 'lm.range', 'How far it wanders', 'num', 4, { min: .5, max: 40, step: .5, unit: 'km' });
def('Time of day', 'earth', 'lm.clock', 'Follow the real clock', 'bool', true, { info: 'Day, dusk, night and dawn follow the phone\'s time. Off = use the preview hour below.' });
def('Time of day', 'earth', 'lm.hour', 'Preview hour', 'num', 21, { min: 0, max: 23.99, step: .05, unit: 'h', info: 'Studio preview when "Follow the real clock" is off. 21 = 9 PM.' });
def('Time of day', 'earth', 'lm.dawn', 'Dawn starts', 'num', 5.5, { min: 3, max: 9, step: .25, unit: 'h' });
def('Time of day', 'earth', 'lm.day', 'Day starts', 'num', 7, { min: 5, max: 11, step: .25, unit: 'h' });
def('Time of day', 'earth', 'lm.dusk', 'Dusk starts', 'num', 17.5, { min: 15, max: 21, step: .25, unit: 'h' });
def('Time of day', 'earth', 'lm.night', 'Night starts', 'num', 19.25, { min: 17, max: 23.5, step: .25, unit: 'h' });
def('Labels', 'earth', 'lm.roads', 'Road names', 'bool', false);
def('Labels', 'earth', 'lm.places', 'Town and area names', 'bool', false);
def('Labels', 'earth', 'lm.pois', 'Shops and places', 'bool', false);
def('Labels', 'earth', 'lm.streets', 'Show streets on the satellite', 'bool', true, { info: 'Satellite look only. Streets light up at night.' });
def('Aurora', 'earth', 'lm.aurora', 'Aurora video at night', 'text', '', { info: 'Paste a link to an aurora clip (ChatGPT render or footage). It plays over the map at night only, blended as light.' });
def('Aurora', 'earth', 'lm.auroraOp', 'Aurora strength', 'num', .7, { min: 0, max: 1, step: .01 });
def('Aurora', 'earth', 'lm.auroraAll', 'Show the aurora all day too', 'bool', false);
def('Credit', 'earth', 'lm.creditSize', 'Mapbox credit size', 'num', 8, { min: 7, max: 14, step: .5, unit: 'px', info: 'Mapbox requires its credit on the map. You can move it and size it, not hide it.' });
def('Credit', 'earth', 'lm.creditX', 'Credit left / right', 'num', 8, { min: 0, max: 400, step: 1, unit: 'px' });
def('Credit', 'earth', 'lm.creditY', 'Credit up from bottom', 'num', 205, { min: 0, max: 900, step: 1, unit: 'px' });
// Map designer values (edited in the pop-up; saved like every other control)
const D = (k, type, d, o = {}) => def('Map designer values', 'earth', k, k, type, d, Object.assign({}, hidden, o));
D('lm.searchName', 'text', ''); D('lm.searchCenter', 'text', '');
D('lm.styleUrl', 'text', ''); D('lm.nightStyle', 'select', 'same', { opts: [['same', 'same'], ['dark-v11', 'dark'], ['navigation-night-v1', 'night drive']] });
D('lm.theme', 'select', 'default', { opts: [['default', 'default'], ['faded', 'faded'], ['monochrome', 'monochrome']] });
D('lm.font', 'text', '');
D('lm.3d', 'bool', true); D('lm.3dBuildings', 'bool', true); D('lm.3dTrees', 'bool', true); D('lm.3dLandmarks', 'bool', true); D('lm.3dFacades', 'bool', true); D('lm.landmarkIcons', 'bool', false);
D('lm.terrain', 'num', 0, { min: 0, max: 3, step: .05 }); D('lm.fog', 'bool', true);
D('lm.transit', 'bool', false); D('lm.pedestrian', 'bool', false); D('lm.admin', 'bool', false);
D('lm.poiDensity', 'int', 3, { min: 1, max: 5, step: 1 }); D('lm.poiColor', 'select', 'default', { opts: [['default', 'default'], ['single', 'single']] });
D('lm.dests', 'text', '[]'); D('lm.tour', 'bool', false); D('lm.dwell', 'num', 14, { min: 2, max: 120, step: 1 }); D('lm.fly', 'num', 6, { min: 1, max: 30, step: .5 }); D('lm.flyOut', 'num', 1.5, { min: 0, max: 6, step: .1 });
COLORS.forEach(([k]) => D('lm.c.' + k, 'text', ''));
sc.SPEC.splice(first < 0 ? 0 : first, 0, ...add);
add.forEach(s => { sc.DEF[s.k] = s.def; sc.P[s.k] = s.def; });

/* ---------- mapbox engine ---------- */
let map = null, loading = null, holder = null, styleNow = '', presetNow = '', cfgKey = '', ready = false, colorsSet = new Set();
const S = { lat: CITIES[0][2], lng: CITIES[0][3], home: [CITIES[0][2], CITIES[0][3]], bearing: 0, heading: 35, last: 0, place: '', zoom: null };
function loadGL() {
  if (window.mapboxgl) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise((res, rej) => {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = GL + 'mapbox-gl.css'; document.head.appendChild(l);
    const s = document.createElement('script'); s.src = GL + 'mapbox-gl.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s);
  });
  return loading;
}
let tokenP = null;
function loadToken() {
  if (TOKEN) return Promise.resolve();
  if (tokenP) return tokenP;
  tokenP = fetch(K.SB.url + '/rest/v1/studio_public_config?name=eq.mapbox_public_token&select=value', { headers: { apikey: K.SB.key, Authorization: 'Bearer ' + K.SB.key } })
    .then(r => r.json()).then(j => { TOKEN = (j && j[0] && j[0].value) || ''; if (!TOKEN) throw Error('no token'); })
    .catch(e => { tokenP = null; K.status('Live map: could not read the Mapbox token (' + e.message + ').'); return new Promise(() => {}); });
  return tokenP;
}
const lookOf = id => LOOKS.find(l => l[0] === id) || LOOKS[0];
const isStd = id => lookOf(id)[3] === 'std';
function presetFor(h, p) { return h >= p['lm.night'] || h < p['lm.dawn'] ? 'night' : h < p['lm.day'] ? 'dawn' : h < p['lm.dusk'] ? 'day' : 'dusk'; }
function hourNow(p) { if (!p['lm.clock']) return p['lm.hour']; const d = new Date(); return d.getHours() + d.getMinutes() / 60; }
function styleURL(p, preset) {
  const id = p['lm.style'];
  if (id === 'custom') { const u = String(p['lm.styleUrl'] || '').trim(); if (/^mapbox:\/\/styles\/|^https:\/\//.test(u)) return u; return 'mapbox://styles/mapbox/standard-satellite'; }
  if (lookOf(id)[3] === 'classic' && preset === 'night' && p['lm.nightStyle'] !== 'same') return 'mapbox://styles/mapbox/' + p['lm.nightStyle'];
  return 'mapbox://styles/mapbox/' + id;
}
function ensure(preset) {
  const p = sc.P; if (!p['lm.on']) return;
  if (!TOKEN) { loadToken().then(() => ensure()); return; }
  if (!window.mapboxgl) { loadGL().then(() => ensure()).catch(e => K.status('Live map could not load: ' + e)); return; }
  if (!holder) { holder = document.createElement('div'); holder.style.cssText = 'position:fixed;left:-10000px;top:0;width:' + K.W + 'px;height:' + K.H + 'px;pointer-events:none;opacity:0'; document.body.appendChild(holder); }
  const style = styleURL(p, preset || presetFor(hourNow(p), p));
  if (!map) {
    window.mapboxgl.accessToken = TOKEN;
    map = new window.mapboxgl.Map({ container: holder, style, center: [S.lng, S.lat], zoom: p['lm.zoom'], pitch: p['lm.pitch'], bearing: S.bearing, interactive: false, attributionControl: false, preserveDrawingBuffer: true, pixelRatio: Math.min(2, window.devicePixelRatio || 1), fadeDuration: 0, maxPitch: 85 });
    styleNow = style; ready = false; presetNow = ''; cfgKey = '';
    map.on('style.load', () => { ready = true; presetNow = ''; cfgKey = ''; colorsSet = new Set(); });
    map.on('error', e => console.warn('live map', e && e.error));
  } else if (style !== styleNow) { styleNow = style; ready = false; map.setStyle(style); }
}
const setCfg = (k, v) => { try { map.setConfigProperty('basemap', k, v); } catch (e) { /* this look does not have it */ } };
function applyConfig(p, preset) {
  if (!map || !ready) return;
  const std = isStd(p['lm.style']) || p['lm.style'] === 'custom';
  if (std && preset !== presetNow) { setCfg('lightPreset', preset); presetNow = preset; }
  const keys = ['lm.style', 'lm.roads', 'lm.places', 'lm.pois', 'lm.streets', 'lm.theme', 'lm.font', 'lm.3d', 'lm.3dBuildings', 'lm.3dTrees', 'lm.3dLandmarks', 'lm.3dFacades', 'lm.landmarkIcons', 'lm.terrain', 'lm.fog', 'lm.transit', 'lm.pedestrian', 'lm.admin', 'lm.poiDensity', 'lm.poiColor', ...COLORS.map(c => 'lm.c.' + c[0])];
  const key = keys.map(k => p[k]).join('|'); if (key === cfgKey) return;
  // a color taken back to "default" needs a fresh style to restore Mapbox's own color
  if (COLORS.some(([c]) => colorsSet.has(c) && !p['lm.c.' + c])) { cfgKey = ''; styleNow = ''; ensure(preset); return; }
  cfgKey = key;
  if (std) {
    setCfg('showRoadLabels', !!p['lm.roads']); setCfg('showPlaceLabels', !!p['lm.places']); setCfg('showPointOfInterestLabels', !!p['lm.pois']);
    setCfg('showTransitLabels', !!p['lm.transit']); setCfg('showPedestrianRoads', !!p['lm.pedestrian']); setCfg('showAdminBoundaries', !!p['lm.admin']);
    setCfg('densityPointOfInterestLabels', Math.round(p['lm.poiDensity'])); setCfg('colorModePointOfInterestLabels', p['lm.poiColor']);
    if (p['lm.style'] === 'standard-satellite') setCfg('showRoadsAndTransit', !!p['lm.streets']);
    setCfg('theme', p['lm.theme']); if (p['lm.font']) setCfg('font', p['lm.font']);
    setCfg('show3dObjects', !!p['lm.3d']); setCfg('show3dBuildings', !!p['lm.3dBuildings']); setCfg('show3dTrees', !!p['lm.3dTrees']); setCfg('show3dLandmarks', !!p['lm.3dLandmarks']); setCfg('show3dFacades', !!p['lm.3dFacades']); setCfg('showLandmarkIcons', !!p['lm.landmarkIcons']);
    COLORS.forEach(([c]) => { const v = p['lm.c.' + c]; if (v) { setCfg(c, v); colorsSet.add(c); } });
  }
  try {
    if (p['lm.terrain'] > 0) { if (!map.getSource('mapbox-dem')) map.addSource('mapbox-dem', { type: 'raster-dem', url: 'mapbox://mapbox.mapbox-terrain-dem-v1', tileSize: 512, maxzoom: 14 }); map.setTerrain({ source: 'mapbox-dem', exaggeration: p['lm.terrain'] }); }
    else map.setTerrain(null);
  } catch (e) { console.warn('terrain', e); }
  try { if (!p['lm.fog']) map.setFog(null); else if (!std) map.setFog({}); } catch (e) { /* no fog on this look */ }
}
function destList(p) { try { const a = JSON.parse(p['lm.dests'] || '[]'); return Array.isArray(a) ? a.filter(d => isFinite(d.lat) && isFinite(d.lng)) : []; } catch (e) { return []; } }
function homeOf(p) {
  if (p['lm.place'] === 'search') { const [la, ln] = String(p['lm.searchCenter'] || '').split(',').map(Number); if (isFinite(la) && isFinite(ln) && p['lm.searchCenter']) return ['search:' + p['lm.searchCenter'], la, ln]; }
  const c = CITIES.find(c => c[0] === p['lm.place']) || CITIES[0]; return [c[0], c[2], c[3]];
}
function setPlace(p) { const [id, la, ln] = homeOf(p); if (S.place === id) return; S.place = id; S.home = [la, ln]; S.lat = la; S.lng = ln; }
let geoAsked = false;
function follow(p) {
  if (!p['lm.follow'] || geoAsked || !navigator.geolocation) return; geoAsked = true;
  navigator.geolocation.getCurrentPosition(pos => { S.home = [pos.coords.latitude, pos.coords.longitude]; S.lat = S.home[0]; S.lng = S.home[1]; S.place = 'device'; }, () => K.status('Location was not allowed; using the place picked in Live map.'), { enableHighAccuracy: false, timeout: 8000 });
}
// destinations tour: stay at each stop (drifting), then fly to the next with a zoom-out arc
const T = { key: '', i: 0, phase: 'stay', t0: 0, from: null };
const smooth = x => x * x * (3 - 2 * x);
function tour(p, now) {
  const list = destList(p); if (!p['lm.tour'] || list.length < 1) { T.key = ''; S.zoom = null; return false; }
  const key = p['lm.dests'] + '|' + p['lm.tour'];
  if (key !== T.key) { T.key = key; T.i = 0; T.phase = 'stay'; T.t0 = now; const d = list[0]; S.home = [d.lat, d.lng]; S.lat = d.lat; S.lng = d.lng; S.zoom = isFinite(d.zoom) ? d.zoom : p['lm.zoom']; }
  const cur = list[T.i % list.length];
  if (T.phase === 'stay') {
    S.zoom = isFinite(cur.zoom) ? cur.zoom : p['lm.zoom'];
    if (list.length > 1 && now - T.t0 > p['lm.dwell'] * 1000) { T.phase = 'fly'; T.t0 = now; T.from = { lat: S.lat, lng: S.lng, zoom: S.zoom }; }
    return false;
  }
  const next = list[(T.i + 1) % list.length], u = Math.min(1, (now - T.t0) / (p['lm.fly'] * 1000)), e = smooth(u), tz = isFinite(next.zoom) ? next.zoom : p['lm.zoom'];
  S.lat = T.from.lat + (next.lat - T.from.lat) * e; S.lng = T.from.lng + (next.lng - T.from.lng) * e;
  S.zoom = T.from.zoom + (tz - T.from.zoom) * e - p['lm.flyOut'] * Math.sin(Math.PI * e);
  if (u >= 1) { T.i = (T.i + 1) % list.length; T.phase = 'stay'; T.t0 = now; S.home = [next.lat, next.lng]; }
  return true;
}
function step(now) {
  const p = sc.P, dt = Math.min(.1, Math.max(0, (now - (S.last || now)) / 1000)); S.last = now;
  const touring = !!p['lm.tour'] && destList(p).length > 0;
  if (!touring && (!p['lm.follow'] || S.place !== 'device')) setPlace(p);
  if (!touring) follow(p);
  const flying = tour(p, now);
  if (!touring) S.place = S.place.startsWith('tour') ? '' : S.place;
  const kmh = p['lm.speed'], dist = flying ? 0 : kmh / 3600 * dt; // km this frame
  if (!S.headingSet || S.headingBase !== p['lm.heading']) { S.heading = p['lm.heading']; S.headingBase = p['lm.heading']; S.headingSet = true; }
  if (dist > 0) {
    const r = S.heading * Math.PI / 180; S.lat += dist / 110.574 * Math.cos(r); S.lng += dist / (111.32 * Math.cos(S.lat * Math.PI / 180)) * Math.sin(r);
    if (p['lm.wander']) { const dy = (S.lat - S.home[0]) * 110.574, dx = (S.lng - S.home[1]) * 111.32 * Math.cos(S.lat * Math.PI / 180); if (Math.hypot(dx, dy) > p['lm.range']) { const back = Math.atan2(-dx, -dy) * 180 / Math.PI; S.heading += ((back - S.heading + 540) % 360 - 180) * Math.min(1, dt * .6); } }
  }
  S.bearing = (S.bearing + p['lm.turn'] * dt) % 360;
  if (map) map.jumpTo({ center: [S.lng, S.lat], zoom: S.zoom != null ? S.zoom : p['lm.zoom'], pitch: p['lm.pitch'], bearing: S.bearing });
}
let aur = null, aurSrc = '';
function aurora(p) {
  const src = String(p['lm.aurora'] || '').trim(); if (!src) return null;
  if (src !== aurSrc) { aurSrc = src; aur = document.createElement('video'); aur.crossOrigin = 'anonymous'; aur.muted = true; aur.loop = true; aur.playsInline = true; aur.src = src; aur.play().catch(() => {}); }
  return aur && aur.videoWidth ? aur : null;
}
window.RavenLiveMap = {
  on: () => !!sc.P['lm.on'],
  ready: () => !!(map && ready),
  draw(ctx, W, H, now) {
    const p = sc.P, preset = presetFor(hourNow(p), p); ensure(preset); if (!map) return false;
    if (holder && (holder.style.width !== W + 'px' || holder.style.height !== H + 'px')) { holder.style.width = W + 'px'; holder.style.height = H + 'px'; map.resize(); }
    applyConfig(p, preset); step(now);
    if (!ready) return false;
    const cv = map.getCanvas();
    ctx.save(); ctx.globalAlpha *= p['lm.opacity']; ctx.filter = `brightness(${p['lm.bright']}) saturate(${p['lm.sat']})`;
    ctx.drawImage(cv, 0, 0, W, H); ctx.restore();
    const v = (preset === 'night' || p['lm.auroraAll']) ? aurora(p) : null;
    if (v) { const s = Math.max(W / v.videoWidth, H / v.videoHeight), dw = v.videoWidth * s, dh = v.videoHeight * s; ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = p['lm.auroraOp']; ctx.drawImage(v, (W - dw) / 2, (H - dh) / 2, dw, dh); ctx.restore(); }
    // Mapbox requires its credit on screen
    const sat = /satellite/.test(styleNow);
    ctx.save(); ctx.font = `500 ${p['lm.creditSize']}px Roboto, system-ui, sans-serif`; ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 3;
    ctx.textBaseline = 'bottom'; ctx.fillText('© Mapbox © OpenStreetMap' + (sat ? ' © Maxar' : ''), p['lm.creditX'], H - p['lm.creditY']); ctx.restore();
    return true;
  },
  preset: () => presetFor(hourNow(sc.P), sc.P),
  open: () => openDesigner(),
};
const set0 = sc.onSet; sc.onSet = function (k, v) { if (set0) set0.call(this, k, v); if (k === 'lm.place' || k === 'lm.searchCenter') S.place = ''; if (k === 'lm.follow') geoAsked = false; if (k === 'lm.tour' || k === 'lm.dests') { T.key = ''; S.place = ''; } };
const show0 = sc.onShow; sc.onShow = function () { if (show0) show0.call(this); ensure(); };
const hide0 = sc.onHide; sc.onHide = function () { if (hide0) hide0.call(this); closeDesigner(); };

/* =====================================================================
   MAP DESIGNER — a pop-up over the control area; the phone stays in view
   so every change shows live on the map.
   ===================================================================== */
const CSS = `
#mdz{position:fixed;z-index:40;display:flex;flex-direction:column;background:#0c1118;border:1px solid #2a3a4d;border-radius:18px;box-shadow:0 30px 80px rgba(0,0,0,.65),0 0 0 1px rgba(255,255,255,.02) inset;color:#e6eef6;font:13px/1.45 Roboto,system-ui,sans-serif;overflow:hidden}
#mdz[hidden]{display:none}
#mdz button{font:inherit;color:inherit;cursor:pointer;white-space:normal}
#mdz .h{display:flex;align-items:center;gap:14px;padding:16px 20px;border-bottom:1px solid #1e2a39;background:linear-gradient(180deg,#121a25,#0d141c)}
#mdz .h .ic{width:36px;height:36px;border-radius:10px;background:radial-gradient(circle at 30% 30%,#3fd0ae,#1b6f8f 70%);box-shadow:0 0 18px rgba(63,208,174,.35)}
#mdz .h b{display:block;font-size:16px;font-weight:500;letter-spacing:.2px}#mdz .h small{color:#8297ad}
#mdz .h .x{margin-left:auto;width:34px;height:34px;border-radius:10px;border:1px solid #2a3a4d;background:#121a24;font-size:16px}
#mdz .h .x:hover{border-color:#3fd0ae}
#mdz .bd{flex:1;min-height:0;display:grid;grid-template-columns:200px minmax(0,1fr)}
#mdz nav{border-right:1px solid #1e2a39;padding:12px;display:flex;flex-direction:column;gap:4px;background:#0a0f15;overflow-y:auto}
#mdz nav button{display:block;text-align:left;border:1px solid transparent;background:none;padding:10px 12px;border-radius:11px}
#mdz nav button b{display:block;font-weight:500;font-size:13.5px}#mdz nav button small{display:block;color:#71859a;font-size:11.5px}
#mdz nav button:hover{background:#111a24}#mdz nav button.on{background:linear-gradient(180deg,#123049,#0f2638);border-color:#2f7fc2}
#mdz .pn{overflow-y:auto;padding:20px 24px 28px;scrollbar-color:#48a895 #0c1118}
#mdz h3{margin:0 0 2px;font-size:17px;font-weight:500}#mdz .sub{margin:0 0 16px;color:#8297ad}
#mdz .card{background:#101822;border:1px solid #1e2a39;border-radius:14px;padding:6px 16px;margin-bottom:14px}
#mdz .card>.t{font-size:11.5px;letter-spacing:.08em;color:#6f8399;padding:10px 0 4px;text-transform:uppercase}
#mdz .r{display:grid;grid-template-columns:minmax(140px,220px) minmax(0,1fr) auto;gap:14px;align-items:center;padding:10px 0}
#mdz .r+.r{border-top:1px solid #182330}
#mdz .r .l b{display:block;font-weight:500}#mdz .r .l small{display:block;color:#71859a;font-size:11.5px}
#mdz input[type=range]{width:100%;accent-color:#3fd0ae;height:26px}
#mdz .num{width:72px;background:#0a1017;border:1px solid #243244;border-radius:8px;color:#e6eef6;padding:5px 7px;font:inherit}
#mdz .sw{width:46px;height:26px;border-radius:13px;border:1px solid #2a3a4d;background:#1d2732;position:relative;padding:0}
#mdz .sw::after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#8ea3b8;transition:left .15s}
#mdz .sw.on{background:#17604f;border-color:#2aa486}#mdz .sw.on::after{left:23px;background:#eafff9}
#mdz .seg{display:inline-flex;border:1px solid #2a3a4d;border-radius:10px;overflow:hidden}
#mdz .seg button{border:0;background:#111a24;padding:7px 14px;border-right:1px solid #2a3a4d}#mdz .seg button:last-child{border-right:0}
#mdz .seg button.on{background:#14304a;color:#d6ecff}
#mdz select,#mdz .in{background:#0a1017;border:1px solid #243244;border-radius:9px;color:#e6eef6;padding:8px 10px;font:inherit}
#mdz .search{display:flex;gap:8px;margin-bottom:12px}#mdz .search .in{flex:1;font-size:14px;padding:11px 14px}
#mdz .btn{border:1px solid #2a3a4d;background:#121b26;border-radius:10px;padding:8px 14px}#mdz .btn:hover{border-color:#3fd0ae}
#mdz .btn.p{background:linear-gradient(180deg,#1d6b59,#16594a);border-color:#2aa486;color:#eafff9}
#mdz .btn.s{padding:5px 10px;font-size:12px}
#mdz .res{display:flex;flex-direction:column;gap:6px}
#mdz .it{display:flex;align-items:center;gap:12px;background:#0f1720;border:1px solid #1e2a39;border-radius:12px;padding:10px 12px}
#mdz .it .pin{width:30px;height:30px;border-radius:9px;background:#13283a;display:flex;align-items:center;justify-content:center;color:#6fc3ff;flex:none;font-size:14px}
#mdz .it .tx{flex:1;min-width:0}#mdz .it .tx b{display:block;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#mdz .it .tx small{display:block;color:#71859a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#mdz .it.cur{border-color:#2aa486;background:#0f1f1c}
#mdz .chips{display:flex;flex-wrap:wrap;gap:6px;padding:4px 0 12px}
#mdz .chip{border:1px solid #2a3a4d;background:#111a24;border-radius:999px;padding:6px 12px;font-size:12px}#mdz .chip.on{border-color:#2aa486;background:#123029;color:#bff3e6}
#mdz .tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px;margin-bottom:14px}
#mdz .tile{border:1px solid #1e2a39;background:#0f1720;border-radius:14px;overflow:hidden;text-align:left;padding:0}
#mdz .tile .im{height:96px;background:#0a0f15 center/cover no-repeat;position:relative}
#mdz .tile .im i{position:absolute;inset:auto 8px 8px auto;font-style:normal;font-size:10.5px;background:rgba(0,0,0,.55);padding:2px 6px;border-radius:6px;color:#cfe}
#mdz .tile .tt{padding:9px 11px}#mdz .tile .tt b{display:block;font-weight:500}#mdz .tile .tt small{display:block;color:#71859a;font-size:11.5px}
#mdz .tile.on{border-color:#3fd0ae;box-shadow:0 0 0 1px #3fd0ae inset}#mdz .tile:hover{border-color:#2f7fc2}
#mdz .note{color:#71859a;font-size:12px;padding:4px 0 10px}
#mdz .empty{color:#71859a;text-align:center;padding:24px 10px;border:1px dashed #263445;border-radius:12px}
#mdz .ord{display:flex;flex-direction:column;gap:2px}#mdz .ord button{width:26px;height:20px;padding:0;border:1px solid #2a3a4d;background:#111a24;border-radius:6px;font-size:10px}
#mdz .cl{display:flex;align-items:center;gap:10px}#mdz .cl input[type=color]{width:42px;height:30px;border:1px solid #2a3a4d;border-radius:8px;background:none;padding:0}
#mdz .foot{display:flex;gap:10px;align-items:center;padding:12px 20px;border-top:1px solid #1e2a39;background:#0a0f15;color:#71859a;font-size:12px}
`;
let box = null, paneId = 'place', results = [], searching = false;
const P = () => sc.P;
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let commitT = 0;
function setv(k, v, redraw = true) { if (K.cur !== sc) return; K.setVal(k, v); clearTimeout(commitT); commitT = setTimeout(() => K.commit(), 350); if (redraw) render(); }
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
function row(label, hint, control, right) { const r = el('div', 'r'); const l = el('div', 'l', `<b>${esc(label)}</b>${hint ? `<small>${esc(hint)}</small>` : ''}`); r.append(l, control || el('span'), right || el('span')); return r; }
function toggle(k, label, hint) { const b = el('button', 'sw' + (P()[k] ? ' on' : '')); b.onclick = () => setv(k, !P()[k]); return row(label, hint, el('span'), b); }
function slider(k, label, hint, min, max, step, unit) {
  const r = el('input'); r.type = 'range'; r.min = min; r.max = max; r.step = step; r.value = P()[k];
  const n = el('input', 'num'); n.type = 'number'; n.min = min; n.max = max; n.step = step; n.value = P()[k];
  r.oninput = () => { n.value = r.value; setv(k, +r.value, false); }; n.onchange = () => { const v = Math.min(max, Math.max(min, +n.value || 0)); r.value = v; setv(k, v, false); };
  const right = el('span'); right.style.cssText = 'display:flex;align-items:center;gap:6px'; right.append(n); if (unit) right.append(el('small', '', esc(unit)));
  return row(label, hint, r, right);
}
function seg(k, label, hint, opts) { const s = el('div', 'seg'); opts.forEach(([v, t]) => { const b = el('button', String(P()[k]) === String(v) ? 'on' : '', esc(t)); b.onclick = () => setv(k, v); s.append(b); }); return row(label, hint, s); }
function card(title, ...rows) { const c = el('div', 'card'); if (title) c.append(el('div', 't', esc(title))); rows.forEach(r => r && c.append(r)); return c; }
function currentPlace() { const p = P(); if (p['lm.follow']) return ['This device\'s location', 'Asks the phone where it is']; if (p['lm.place'] === 'search' && p['lm.searchName']) return [p['lm.searchName'], p['lm.searchCenter']]; const c = CITIES.find(c => c[0] === p['lm.place']) || CITIES[0]; return [c[1], c[2].toFixed(4) + ', ' + c[3].toFixed(4)]; }
function thumb(id, lat, lng, z) {
  if (!TOKEN) return '';
  let path = 'mapbox/' + id;
  if (id === 'custom') { const m = String(P()['lm.styleUrl'] || '').match(/^mapbox:\/\/styles\/([^/]+\/[^/?#]+)/); if (!m) return ''; path = m[1]; }
  return `https://api.mapbox.com/styles/v1/${path}/static/${lng.toFixed(4)},${lat.toFixed(4)},${z.toFixed(1)},0/340x200@2x?access_token=${TOKEN}&attribution=false&logo=false`;
}
const FALLBACK = { 'standard-satellite': 'satellite-streets-v12', 'standard': 'streets-v12' };
function dests() { return destList(P()); }
window.__mdzHere = () => here();
function here() { if (map && ready) return [S.lat, S.lng]; const [, la, ln] = homeOf(P()); return [la, ln]; }
function saveDests(a) { setv('lm.dests', JSON.stringify(a)); }
async function doSearch(q) {
  q = q.trim(); if (!q) return; await loadToken(); searching = true; render();
  const [pl, pn] = here(), prox = `${pn.toFixed(4)},${pl.toFixed(4)}`;
  try {
    let j = await (await fetch(`https://api.mapbox.com/search/searchbox/v1/forward?q=${encodeURIComponent(q)}&limit=8&proximity=${prox}&access_token=${TOKEN}`)).json();
    let list = (j.features || []).map(f => ({ name: f.properties.name || f.properties.full_address, address: f.properties.full_address || f.properties.place_formatted || '', lat: f.properties.coordinates ? f.properties.coordinates.latitude : f.geometry.coordinates[1], lng: f.properties.coordinates ? f.properties.coordinates.longitude : f.geometry.coordinates[0], kind: f.properties.feature_type || '' }));
    if (!list.length) {
      j = await (await fetch(`https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(q)}&limit=8&proximity=${prox}&access_token=${TOKEN}`)).json();
      list = (j.features || []).map(f => ({ name: f.properties.name || f.properties.full_address, address: f.properties.full_address || f.properties.place_formatted || '', lat: f.properties.coordinates.latitude, lng: f.properties.coordinates.longitude, kind: f.properties.feature_type || '' }));
    }
    results = list;
  } catch (e) { results = []; K.status('Search failed: ' + e.message); }
  searching = false; render();
}
function usePlace(r) { setv('lm.follow', false, false); setv('lm.searchName', r.name, false); setv('lm.searchCenter', r.lat.toFixed(6) + ',' + r.lng.toFixed(6), false); setv('lm.place', 'search'); }
function addDest(r) { const a = dests(); a.push({ name: r.name, address: r.address || '', lat: +(+r.lat).toFixed(6), lng: +(+r.lng).toFixed(6), zoom: +P()['lm.zoom'] }); saveDests(a); K.status('Added "' + r.name + '" to destinations.'); }
const PANES = [
  ['place', 'Place', 'Search anywhere'],
  ['dest', 'Destinations', 'Tour between stops'],
  ['look', 'Look', 'Map styles & theme'],
  ['3d', '3D & terrain', 'Buildings, hills, fog'],
  ['labels', 'Labels & roads', 'Names, places, paths'],
  ['colors', 'Colors', 'Recolor the city'],
];
function paneBody() {
  const p = P(), pane = el('div');
  if (paneId === 'place') {
    const [nm, sub] = currentPlace();
    pane.append(el('h3', '', 'Place'), el('p', 'sub', 'Where the map sits under the clouds. Search a city, an address, a landmark or a business.'));
    const cur = el('div', 'it cur', `<div class="pin">◎</div><div class="tx"><b>${esc(nm)}</b><small>Showing now · ${esc(sub)}</small></div>`); pane.append(cur, el('div', '', '&nbsp;'));
    const s = el('div', 'search'); const q = el('input', 'in'); q.placeholder = 'Search places, addresses, landmarks…'; q.value = box._q || ''; q.oninput = () => { box._q = q.value; };
    q.onkeydown = e => { if (e.key === 'Enter') doSearch(q.value); }; const go = el('button', 'btn p', searching ? 'Searching…' : 'Search'); go.onclick = () => doSearch(q.value); s.append(q, go); pane.append(s);
    const res = el('div', 'res');
    results.forEach(r => { const it = el('div', 'it', `<div class="pin">⌖</div><div class="tx"><b>${esc(r.name)}</b><small>${esc(r.address || r.kind)}</small></div>`); const use = el('button', 'btn s p', 'Show here'); use.onclick = () => usePlace(r); const ad = el('button', 'btn s', '+ Destination'); ad.onclick = () => addDest(r); it.append(use, ad); res.append(it); });
    if (results.length) pane.append(card('Results', res));
    const chips = el('div', 'chips'); CITIES.forEach(c => { const b = el('button', 'chip' + (p['lm.place'] === c[0] && !p['lm.follow'] ? ' on' : ''), esc(c[1])); b.onclick = () => { setv('lm.follow', false, false); setv('lm.place', c[0]); }; chips.append(b); });
    pane.append(card('Quick towns', chips), card('Camera', toggle('lm.follow', 'Use this device\'s location', 'On the phone it opens over wherever the phone is'), slider('lm.zoom', 'How close', 'Higher = closer to the ground', 3, 19, .05), slider('lm.pitch', 'Tilt', '0 = straight down; tilt to see 3D buildings', 0, 85, .5, '°')));
  }
  if (paneId === 'dest') {
    const list = dests();
    pane.append(el('h3', '', 'Destinations'), el('p', 'sub', 'Stops the camera visits in order. It stays a while at each one (drifting), then flies to the next and starts over.'));
    pane.append(card('Tour', toggle('lm.tour', 'Tour the destinations', list.length ? list.length + ' stop' + (list.length > 1 ? 's' : '') : 'Add stops first'), slider('lm.dwell', 'Time at each stop', '', 2, 120, 1, 's'), slider('lm.fly', 'Flight between stops', '', 1, 30, .5, 's'), slider('lm.flyOut', 'Zoom out while flying', '0 = level flight', 0, 6, .1)));
    const wrap = el('div', 'res');
    if (!list.length) wrap.append(el('div', 'empty', 'No destinations yet. Search a place on the Place tab and press “+ Destination”, or add where the map is now.'));
    list.forEach((d, i) => {
      const it = el('div', 'it', `<div class="pin">${i + 1}</div><div class="tx"><b>${esc(d.name)}</b><small>${esc(d.address || (d.lat.toFixed(4) + ', ' + d.lng.toFixed(4)))}</small></div>`);
      const z = el('input', 'num'); z.type = 'number'; z.step = .5; z.min = 3; z.max = 19; z.value = isFinite(d.zoom) ? d.zoom : P()['lm.zoom']; z.title = 'How close at this stop'; z.onchange = () => { const a = dests(); a[i].zoom = +z.value; saveDests(a); };
      const ord = el('div', 'ord'); const up = el('button', '', '▲'), dn = el('button', '', '▼'); up.onclick = () => { if (!i) return; const a = dests(); [a[i - 1], a[i]] = [a[i], a[i - 1]]; saveDests(a); }; dn.onclick = () => { const a = dests(); if (i >= a.length - 1) return; [a[i + 1], a[i]] = [a[i], a[i + 1]]; saveDests(a); }; ord.append(up, dn);
      const show = el('button', 'btn s', 'Show'); show.onclick = () => usePlace(d);
      const rm = el('button', 'btn s', 'Remove'); rm.onclick = () => { const a = dests(); a.splice(i, 1); saveDests(a); };
      it.append(el('small', '', 'zoom'), z, ord, show, rm); wrap.append(it);
    });
    const here = el('button', 'btn', '+ Add where the map is now'); here.onclick = () => { const [nm] = currentPlace(), [la, ln] = window.__mdzHere(); addDest({ name: nm, address: '', lat: la, lng: ln }); };
    pane.append(card('Stops', wrap, el('div', '', '&nbsp;')), here);
  }
  if (paneId === 'look') {
    pane.append(el('h3', '', 'Look'), el('p', 'sub', 'Every map style on your Mapbox account. The previews show your current place.'));
    const tiles = el('div', 'tiles');
    LOOKS.forEach(([id, name, what, fam]) => {
      const t = el('button', 'tile' + (p['lm.style'] === id ? ' on' : '')); const im = el('div', 'im'); const [hl, hn] = here(), src = thumb(id, hl, hn, Math.min(16, P()['lm.zoom']));
      if (src) { const test = new Image(); test.onload = () => { im.style.backgroundImage = `url("${src}")`; }; test.onerror = () => { if (FALLBACK[id]) im.style.backgroundImage = `url("${thumb(FALLBACK[id], hl, hn, Math.min(16, P()['lm.zoom']))}")`; }; test.src = src; }
      im.append(el('i', '', fam === 'std' ? 'live lighting' : fam === 'custom' ? 'yours' : 'classic'));
      t.append(im, el('div', 'tt', `<b>${esc(name)}</b><small>${esc(what)}</small>`)); t.onclick = () => setv('lm.style', id); tiles.append(t);
    });
    pane.append(tiles);
    const urlIn = el('input', 'in'); urlIn.style.width = '100%'; urlIn.placeholder = 'mapbox://styles/your-name/style-id'; urlIn.value = p['lm.styleUrl'] || ''; urlIn.onchange = () => { setv('lm.styleUrl', urlIn.value.trim(), false); setv('lm.style', 'custom'); };
    pane.append(card('Your own style', row('Style link', 'Make a style at studio.mapbox.com, press Share, copy the Style URL', urlIn)));
    const font = el('select'); FONTS.forEach(([v, t]) => { const o = el('option', '', esc(t)); o.value = v; if ((p['lm.font'] || '') === v) o.selected = true; font.append(o); }); font.onchange = () => setv('lm.font', font.value);
    pane.append(card('Standard looks (Satellite, 3D city)', seg('lm.theme', 'Theme', 'Overall color treatment', [['default', 'Default'], ['faded', 'Faded'], ['monochrome', 'Monochrome']]), row('Label font', '', font)));
    pane.append(card('Classic looks at night', seg('lm.nightStyle', 'After dark switch to', 'Classic styles have no night lighting of their own', [['same', 'Stay the same'], ['dark-v11', 'Dark'], ['navigation-night-v1', 'Night drive']])));
    pane.append(card('Picture', slider('lm.bright', 'Brightness', '', .2, 1.8, .01, '×'), slider('lm.sat', 'Color strength', '', 0, 2, .01, '×'), slider('lm.opacity', 'Opacity', 'Let the paper show through', 0, 1, .01)));
  }
  if (paneId === '3d') {
    pane.append(el('h3', '', '3D & terrain'), el('p', 'sub', 'Tilt the camera (Place → Camera) to see buildings and hills stand up. 3D items work on the Satellite and 3D city looks.'));
    pane.append(card('3D', toggle('lm.3d', 'All 3D', 'Master switch for everything below'), toggle('lm.3dBuildings', 'Buildings', ''), toggle('lm.3dLandmarks', 'Landmarks', 'Detailed famous buildings'), toggle('lm.3dTrees', 'Trees', ''), toggle('lm.3dFacades', 'Building facades', 'Windows and detail on walls'), toggle('lm.landmarkIcons', 'Landmark icons', '')));
    pane.append(card('Ground', slider('lm.terrain', 'Hills & terrain height', '0 = flat ground', 0, 3, .05, '×'), toggle('lm.fog', 'Fog & atmosphere', 'Soft haze toward the horizon')));
  }
  if (paneId === 'labels') {
    pane.append(el('h3', '', 'Labels & roads'), el('p', 'sub', 'What is written on the map. Message clouds read best with fewer labels.'));
    pane.append(card('Names', toggle('lm.places', 'Town and area names', ''), toggle('lm.roads', 'Road names', ''), toggle('lm.pois', 'Shops and places', 'Restaurants, stores, parks…'), slider('lm.poiDensity', 'How many places', '1 = only the big ones', 1, 5, 1), seg('lm.poiColor', 'Place name color', '', [['default', 'By type'], ['single', 'One color']]), toggle('lm.transit', 'Transit names', 'Stations and stops')));
    pane.append(card('Roads & lines', toggle('lm.streets', 'Streets on the satellite', 'Satellite look; streets light up at night'), toggle('lm.pedestrian', 'Walking paths', ''), toggle('lm.admin', 'Borders', 'County, state and country lines')));
  }
  if (paneId === 'colors') {
    pane.append(el('h3', '', 'Colors'), el('p', 'sub', 'Recolor the city. Works on the 3D city look (and the vector parts of Satellite). Default = Mapbox\'s own color.'));
    const c = el('div', 'card');
    COLORS.forEach(([k, name]) => {
      const key = 'lm.c.' + k, v = p[key], cl = el('div', 'cl'), inp = el('input'); inp.type = 'color'; inp.value = v || '#888888'; inp.disabled = !v;
      inp.oninput = () => setv(key, inp.value, false);
      const d = el('button', 'sw' + (v ? ' on' : '')); d.title = 'Use your own color'; d.onclick = () => setv(key, v ? '' : inp.value);
      cl.append(inp, el('small', '', v ? esc(v) : 'Mapbox default')); c.append(row(name, '', cl, d));
    });
    pane.append(c);
  }
  return pane;
}
function render() {
  if (!box || box.hidden) return;
  const nav = box.querySelector('nav'), pn = box.querySelector('.pn'), top = pn.scrollTop; nav.innerHTML = '';
  PANES.forEach(([id, t, s]) => { const b = el('button', id === paneId ? 'on' : '', `<b>${esc(t)}</b><small>${esc(s)}</small>`); b.onclick = () => { paneId = id; pn.scrollTop = 0; render(); }; nav.append(b); });
  const keep = document.activeElement && pn.contains(document.activeElement) && document.activeElement.classList.contains('in') ? document.activeElement.placeholder : null;
  pn.innerHTML = ''; pn.append(paneBody()); pn.scrollTop = top;
  if (keep) { const i = [...pn.querySelectorAll('.in')].find(x => x.placeholder === keep); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
  const [nm] = currentPlace(); box.querySelector('.foot span').textContent = 'Showing: ' + nm + ' · ' + lookOf(P()['lm.style'])[1] + ' · ' + (P()['lm.tour'] && dests().length ? 'touring ' + dests().length + ' stops' : 'drifting') + ' · changes save automatically';
}
function place() {
  if (!box) return; const side = document.getElementById('side'); const r = side && side.getBoundingClientRect();
  if (r && r.width > 300) Object.assign(box.style, { left: r.left + 8 + 'px', top: r.top + 8 + 'px', width: r.width - 16 + 'px', height: r.height - 16 + 'px' });
  else Object.assign(box.style, { left: '4vw', top: '6vh', width: '92vw', height: '88vh' });
}
function openDesigner() {
  if (K.cur !== sc) return;
  if (!box) {
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    box = el('div'); box.id = 'mdz'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Map designer');
    box.innerHTML = `<div class="h"><div class="ic"></div><div><b>Map designer</b><small>The live map under the message clouds · powered by your Mapbox account</small></div><button class="x" title="Close (Esc)">✕</button></div><div class="bd"><nav></nav><div class="pn"></div></div><div class="foot"><span></span></div>`;
    box.querySelector('.x').onclick = closeDesigner;
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && box && !box.hidden) closeDesigner(); });
    window.addEventListener('resize', place);
    document.body.appendChild(box);
  }
  box.hidden = false; place(); loadToken().then(render); render();
}
function closeDesigner() { if (box) box.hidden = true; }
})();
