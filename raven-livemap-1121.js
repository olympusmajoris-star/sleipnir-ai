/* =====================================================================
   RAVEN LIVE MAP — studio 1121. Replaces the Earth footage under the
   message clouds with a live Mapbox satellite map of the user's town
   that follows the real clock: day, dusk, night (lit streets), dawn.
   The camera drifts over the town like the old footage. Load after
   raven-conversation-1119.js. Uses Danny's Mapbox public token.
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
const STYLES = [['standard-satellite', 'Satellite (real photos)'], ['standard', 'Map (3D buildings)']];

/* ---------- controls ---------- */
const add = [], first = sc.SPEC.findIndex(s => s.group === 'Earth');
const def = (section, target, k, label, type, d, o = {}) => add.push(Object.assign({ group: G, section, target, k, label, type, def: d }, o));
def('Map', 'earth', 'lm.on', 'Live map instead of the Earth footage', 'bool', true, { info: 'A live Mapbox map of the town that follows the real time of day. Off = the old Earth footage.' });
def('Map', 'earth', 'lm.style', 'Look', 'select', 'standard-satellite', { opts: STYLES });
def('Map', 'earth', 'lm.place', 'Town', 'select', 'palmcoast', { opts: CITIES.map(c => [c[0], c[1]]), info: 'In the app this is the user\'s own town (from their location). Picking any city is a subscription extra.' });
def('Map', 'earth', 'lm.follow', 'Use this device\'s location', 'bool', false, { info: 'On the phone it starts over wherever the phone is.' });
def('Map', 'earth', 'lm.zoom', 'How close', 'num', 14.2, { min: 9, max: 18.5, step: .05, info: 'Higher = closer to the ground.' });
def('Map', 'earth', 'lm.pitch', 'Tilt (0 = straight down)', 'num', 0, { min: 0, max: 75, step: .5, unit: '°' });
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
sc.SPEC.splice(first < 0 ? 0 : first, 0, ...add);
add.forEach(s => { sc.DEF[s.k] = s.def; sc.P[s.k] = s.def; });

/* ---------- mapbox ---------- */
let map = null, loading = null, holder = null, styleNow = '', presetNow = '', cfgKey = '', ready = false;
const S = { lat: CITIES[0][2], lng: CITIES[0][3], home: [CITIES[0][2], CITIES[0][3]], bearing: 0, heading: 35, last: 0, place: '' };
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
  if (tokenP) return tokenP;
  tokenP = fetch(K.SB.url + '/rest/v1/studio_public_config?name=eq.mapbox_public_token&select=value', { headers: { apikey: K.SB.key, Authorization: 'Bearer ' + K.SB.key } })
    .then(r => r.json()).then(j => { TOKEN = (j && j[0] && j[0].value) || ''; if (!TOKEN) throw Error('no token'); })
    .catch(e => { tokenP = null; K.status('Live map: could not read the Mapbox token (' + e.message + ').'); return new Promise(() => {}); });
  return tokenP;
}
function presetFor(h, p) { return h >= p['lm.night'] || h < p['lm.dawn'] ? 'night' : h < p['lm.day'] ? 'dawn' : h < p['lm.dusk'] ? 'day' : 'dusk'; }
function hourNow(p) { if (!p['lm.clock']) return p['lm.hour']; const d = new Date(); return d.getHours() + d.getMinutes() / 60; }
function ensure() {
  const p = sc.P; if (!p['lm.on']) return;
  if (!TOKEN) { loadToken().then(ensure); return; }
  if (!window.mapboxgl) { loadGL().then(ensure).catch(e => K.status('Live map could not load: ' + e)); return; }
  if (!holder) { holder = document.createElement('div'); holder.style.cssText = 'position:fixed;left:-10000px;top:0;width:' + K.W + 'px;height:' + K.H + 'px;pointer-events:none;opacity:0'; document.body.appendChild(holder); }
  const style = 'mapbox://styles/mapbox/' + p['lm.style'];
  if (!map) {
    window.mapboxgl.accessToken = TOKEN;
    map = new window.mapboxgl.Map({ container: holder, style, center: [S.lng, S.lat], zoom: p['lm.zoom'], pitch: p['lm.pitch'], bearing: S.bearing, interactive: false, attributionControl: false, preserveDrawingBuffer: true, pixelRatio: Math.min(2, window.devicePixelRatio || 1), fadeDuration: 0 });
    styleNow = style; ready = false; presetNow = ''; cfgKey = '';
    map.on('style.load', () => { ready = true; presetNow = ''; cfgKey = ''; });
    map.on('error', e => console.warn('live map', e && e.error));
  } else if (style !== styleNow) { styleNow = style; ready = false; map.setStyle(style); }
}
function applyConfig(p, preset) {
  if (!map || !ready) return;
  const key = [p['lm.roads'], p['lm.places'], p['lm.pois'], p['lm.streets'], p['lm.style']].join('|');
  try {
    if (preset !== presetNow) { map.setConfigProperty('basemap', 'lightPreset', preset); presetNow = preset; }
    if (key !== cfgKey) {
      cfgKey = key;
      map.setConfigProperty('basemap', 'showRoadLabels', !!p['lm.roads']);
      map.setConfigProperty('basemap', 'showPlaceLabels', !!p['lm.places']);
      map.setConfigProperty('basemap', 'showPointOfInterestLabels', !!p['lm.pois']);
      map.setConfigProperty('basemap', 'showTransitLabels', false);
      if (p['lm.style'] === 'standard-satellite') map.setConfigProperty('basemap', 'showRoadsAndTransit', !!p['lm.streets']);
    }
  } catch (e) { /* older style without config */ }
}
function setPlace(p) {
  const c = CITIES.find(c => c[0] === p['lm.place']) || CITIES[0];
  if (S.place === c[0]) return; S.place = c[0]; S.home = [c[2], c[3]]; S.lat = c[2]; S.lng = c[3];
}
let geoAsked = false;
function follow(p) {
  if (!p['lm.follow'] || geoAsked || !navigator.geolocation) return; geoAsked = true;
  navigator.geolocation.getCurrentPosition(pos => { S.home = [pos.coords.latitude, pos.coords.longitude]; S.lat = S.home[0]; S.lng = S.home[1]; S.place = 'device'; }, () => K.status('Location was not allowed; using the town picked in Live map.'), { enableHighAccuracy: false, timeout: 8000 });
}
function step(now) {
  const p = sc.P, dt = Math.min(.1, Math.max(0, (now - (S.last || now)) / 1000)); S.last = now;
  if (!p['lm.follow'] || S.place !== 'device') setPlace(p); follow(p);
  const kmh = p['lm.speed'], dist = kmh / 3600 * dt; // km this frame
  if (!S.headingSet || S.headingBase !== p['lm.heading']) { S.heading = p['lm.heading']; S.headingBase = p['lm.heading']; S.headingSet = true; }
  if (dist > 0) {
    const r = S.heading * Math.PI / 180; S.lat += dist / 110.574 * Math.cos(r); S.lng += dist / (111.32 * Math.cos(S.lat * Math.PI / 180)) * Math.sin(r);
    if (p['lm.wander']) { const dy = (S.lat - S.home[0]) * 110.574, dx = (S.lng - S.home[1]) * 111.32 * Math.cos(S.lat * Math.PI / 180); if (Math.hypot(dx, dy) > p['lm.range']) { const back = Math.atan2(-dx, -dy) * 180 / Math.PI; S.heading += ((back - S.heading + 540) % 360 - 180) * Math.min(1, dt * .6); } }
  }
  S.bearing = (S.bearing + p['lm.turn'] * dt) % 360;
  if (map) map.jumpTo({ center: [S.lng, S.lat], zoom: p['lm.zoom'], pitch: p['lm.pitch'], bearing: S.bearing });
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
    const p = sc.P; ensure(); if (!map) return false;
    if (holder && (holder.style.width !== W + 'px' || holder.style.height !== H + 'px')) { holder.style.width = W + 'px'; holder.style.height = H + 'px'; map.resize(); }
    const preset = presetFor(hourNow(p), p); applyConfig(p, preset); step(now);
    if (!ready) return false;
    const cv = map.getCanvas();
    ctx.save(); ctx.globalAlpha *= p['lm.opacity']; ctx.filter = `brightness(${p['lm.bright']}) saturate(${p['lm.sat']})`;
    ctx.drawImage(cv, 0, 0, W, H); ctx.restore();
    const v = (preset === 'night' || p['lm.auroraAll']) ? aurora(p) : null;
    if (v) { const s = Math.max(W / v.videoWidth, H / v.videoHeight), dw = v.videoWidth * s, dh = v.videoHeight * s; ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = p['lm.auroraOp']; ctx.drawImage(v, (W - dw) / 2, (H - dh) / 2, dw, dh); ctx.restore(); }
    // Mapbox requires its credit on screen
    ctx.save(); ctx.font = `500 ${p['lm.creditSize']}px Roboto, system-ui, sans-serif`; ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 3;
    ctx.textBaseline = 'bottom'; ctx.fillText('© Mapbox © OpenStreetMap © Maxar', p['lm.creditX'], H - p['lm.creditY']); ctx.restore();
    return true;
  },
  preset: () => presetFor(hourNow(sc.P), sc.P),
};
const set0 = sc.onSet; sc.onSet = function (k, v) { if (set0) set0.call(this, k, v); if (k === 'lm.place') S.place = ''; if (k === 'lm.follow') geoAsked = false; };
const show0 = sc.onShow; sc.onShow = function () { if (show0) show0.call(this); ensure(); };
})();
