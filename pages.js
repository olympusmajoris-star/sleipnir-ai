/* Asgard Studio — Pages: one studio for every Asgard page (home, share, conversation, Heimdall).
   Settings save to the shared Supabase (table studio_designs, id "page_<name>"), so Danny, Claude and ChatGPT see the same thing. */
(() => {
'use strict';
const SB = { url:'https://afnihsdxtisneuyehatw.supabase.co', key:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmbmloc2R4dGlzbmV1eWVoYXR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NjUxMDcsImV4cCI6MjA4NzE0MTEwN30.q94Gw7BVKgyGm-I_XXGaoScVK50MMfQMk2RHms3qhps' };
const H = (x) => Object.assign({ apikey: SB.key, Authorization: 'Bearer ' + SB.key }, x || {});
const UI = SB.url + '/storage/v1/object/public/asgard_ui/';
const EARTH = SB.url + '/storage/v1/object/public/raven_earth/v34/';
const STUDIO = SB.url + '/storage/v1/object/public/studio/';
const W = 390, HH = 844;
const $ = (s) => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const FAVS = [['02','Freya'],['03','Loki'],['04','Sif'],['05','Tyr'],['06','Baldr'],['07','Hel']];
const SPINS = { '02':1, '05':1, '06':1 };
const NAMES = ['Freya','Loki','Baldr','Hel','Tyr','Sif','Gerd','Forseti','Skadi','Eir'];
const EARTHS = ['changing-landscapes','close-farmland','farmland','forest-river','green-rivers','ice-fjords','japan','river-plains','terrain','woodlands'];

/* ---------- images / video cache ---------- */
const IMG = {};
function img(src){ if(!IMG[src]){ const i = new Image(); i.crossOrigin='anonymous'; i.src = src; IMG[src] = i; } return IMG[src]; }
const ok = (i) => i && i.complete && i.naturalWidth > 0;
const VID = {};
function vid(src){ if(!VID[src]){ const v = document.createElement('video'); v.crossOrigin='anonymous'; v.muted=true; v.loop=true; v.playsInline=true; v.src=src; v.play().catch(()=>{}); VID[src]=v; } return VID[src]; }

/* ---------- control helpers ---------- */
const R = (k, label, min, max, step) => ({ t:'r', k, label, min, max, step });
const K = (k, label) => ({ t:'k', k, label });
const C = (k, label) => ({ t:'c', k, label });
const Sel = (k, label, opts) => ({ t:'s', k, label, opts });
const U = (k, label) => ({ t:'u', k, label });

/* ======================= PAGE DEFINITIONS ======================= */
const PAGES = {
  home: {
    title: 'Asgard home',
    defaults: {
      bg: '#05070a',
      sky: { height: 0.34, image: 9, bright: 0.9, drift: 6, fade: 0.25, holes: 3, holeSize: 30, holeSpeed: 14, faceShow: true },
      post: { margin: 14, radius: 18, gap: 22, border: 3, borderColor: '#c9a46a', glow: 0.35, glowColor: '#f0c070', imgRatio: 1.25, headSize: 15, nameColor: '#f2e6cf', textSize: 13, textColor: '#e7dcc8', autoScroll: 18, runes: true, runeColor: '#d8b878', runeSpeed: 30 },
      act: { place: 'under', slots: 4, size: 24, gap: 22, glow: 0, glowColor: '#ffffff', counts: false, countSize: 12, countColor: '#ffffff', icon1:'', icon2:'', icon3:'', icon4:'', icon5:'', icon6:'' },
      dock: { size: 46, gap: 26, y: 0.93, shadow: 0.6, shadowBlur: 14, shadowY: 10, spin: 0 },
    },
    sections: [
      { id:'sky', name:'Sky above', sub:'Space strip & live black holes', groups:[
        { name:'Sky strip', ctrls:[R('sky.height','How tall the sky is (share of screen)',0.1,0.6,.005), R('sky.image','Space picture',1,23,1), R('sky.bright','Brightness',0.2,1.6,.01), R('sky.drift','Drift speed',0,40,.5), R('sky.fade','Fade into the feed',0,0.6,.01), C('bg','Page background')]},
        { name:'Live black holes (look comes from the Raven page)', ctrls:[R('sky.holes','How many',0,4,1), R('sky.holeSize','Size',12,60,1), R('sky.holeSpeed','Drift speed',0,60,1), K('sky.faceShow','Show faces')]},
      ]},
      { id:'post', name:'Posts', sub:'Cards, border & runes', groups:[
        { name:'Card', ctrls:[R('post.margin','Side margin',0,40,1), R('post.radius','Corner rounding',0,40,1), R('post.gap','Space between posts',0,60,1), R('post.imgRatio','Picture height (x width)',0.6,1.8,.01), R('post.autoScroll','Preview scroll speed',0,80,1)]},
        { name:'Border (sandstone ruins)', ctrls:[R('post.border','Border thickness',0,16,.5), C('post.borderColor','Border color'), R('post.glow','Border glow',0,1.5,.01), C('post.glowColor','Glow color'), K('post.runes','Norse runes rolling along the border'), C('post.runeColor','Rune color'), R('post.runeSpeed','Rune speed',0,120,1)]},
        { name:'Text', ctrls:[R('post.headSize','Name size',10,24,.5), C('post.nameColor','Name color'), R('post.textSize','Caption size',9,20,.5), C('post.textColor','Caption color')]},
      ]},
      { id:'act', name:'Like, share & buy', sub:'Where the icons go & how they look', groups:[
        { name:'Icon slots on each post (empty until you add your own)', ctrls:[R('act.slots','How many icons',0,6,1), Sel('act.place','Where they sit',[['under','Row under the picture'],['over','Over the bottom of the picture'],['side','Column on the right side']]), R('act.size','Icon size',14,60,1), R('act.gap','Space between icons',0,60,1), R('act.glow','Glow',0,1.5,.01), C('act.glowColor','Glow color'), K('act.counts','Show a number next to each'), R('act.countSize','Number size',8,18,.5), C('act.countColor','Number color')]},
        { name:'Your icon images', ctrls:[U('act.icon1','Icon 1'), U('act.icon2','Icon 2'), U('act.icon3','Icon 3'), U('act.icon4','Icon 4'), U('act.icon5','Icon 5'), U('act.icon6','Icon 6')]},
      ]},
      { id:'dock', name:'Floating icons', sub:'Raven, feather, horn, wayfinder', groups:[
        { name:'The 4 floating icons', ctrls:[R('dock.size','Icon size',24,80,1), R('dock.gap','Space between',4,60,1), R('dock.y','Height on screen',0.75,0.98,.002), R('dock.shadow','Shadow on the post',0,1,.01), R('dock.shadowBlur','Shadow softness',0,40,1), R('dock.shadowY','Shadow drop',0,30,1), R('dock.spin','Gentle bob',0,1,.01)]},
      ]},
    ],
    draw: drawHome,
  },
  share: {
    title: 'Share (favs as 3D figures)',
    defaults: {
      bg: '#04060a',
      post: { y: 0.62, width: 0.82, tilt: 0.45, dim: 0.35, ripple: 0.7, rippleSpeed: 1 },
      fig: { size: 1.0, lean: 0.12, spread: 0.9, band: 0.32, top: 0.12, swing: 3, still: 1, spin: 2, swingDeg: 60, swingSpeed: 0.6, spinSpeed: 0.25, flicker: 0.15, names: true, nameColor: '#e8f6ff', emerge: 1.2, glow: 0 },
      btn: { y: 0.9, size: 13, color: '#e9c46a', fill: 'rgba(20,16,10,.65)', show: true },
    },
    sections: [
      { id:'figs', name:'Fav figures', sub:'Who comes out of the post', groups:[
        { name:'Figures', ctrls:[R('fig.size','Figure size',0.4,1.8,.01), R('fig.lean','Lean back',0,0.5,.01), R('fig.spread','Spread across',0.3,1,.01), R('fig.top','Highest figure position',0,0.4,.005), R('fig.band','Height band they spread over',0.05,0.5,.005), R('fig.flicker','Flicker',0,0.6,.01), R('fig.glow','Glow (0 = real person, no hologram)',0,1,.01), K('fig.names','Show names'), C('fig.nameColor','Name color')]},
        { name:'How they turn (out of 6)', ctrls:[R('fig.swing','Swing back and forth',0,6,1), R('fig.still','Stand still',0,6,1), R('fig.spin','Full 360 spin (only people with a 360)',0,6,1), R('fig.swingDeg','Swing angle (degrees)',10,60,1), R('fig.swingSpeed','Swing speed',0.05,2,.01), R('fig.spinSpeed','Spin speed',0.02,1,.01)]},
        { name:'Coming out of the post', ctrls:[R('fig.emerge','Seconds to rise out',0.2,4,.05)]},
      ]},
      { id:'post', name:'The shared post', sub:'Lies back like water', groups:[
        { name:'Post', ctrls:[R('post.y','Post position',0.4,0.85,.005), R('post.width','Post width',0.4,1,.01), R('post.tilt','Lie back (tilt)',0,0.85,.01), R('post.dim','Darken',0,0.9,.01), R('post.ripple','Ripple strength',0,1.5,.01), R('post.rippleSpeed','Ripple speed',0.1,3,.01), C('bg','Page background')]},
      ]},
      { id:'btn', name:'Buttons', sub:'Loose the Ravens, Mead Hall, Return', groups:[
        { name:'Buttons', ctrls:[K('btn.show','Show buttons'), R('btn.y','Height on screen',0.7,0.98,.002), R('btn.size','Text size',9,20,.5), C('btn.color','Color')]},
      ]},
    ],
    actions: [['Replay coming out', () => { STATE.t0 = performance.now(); }]],
    draw: drawShare,
  },
  convo: {
    title: 'Conversation (clouds + earth)',
    defaults: {
      // these first fields are the same ones the app already reads live (table raven_scene_settings)
      day_speed: 8, night_speed: 24, cloud_speed: 1, cloud_padding: 18, cloud_growth_ms: 250, ground_brightness: 1, cloud_shadow: 0.3, message_spacing: 14, cloud_variety: 0.85, ambient_count: 3, ambient_speed: 1, ambient_scale: 1, ambient_opacity: 0.55, water_shimmer: 0.5, earth_mode: 0,
      earth: { pick: 'farmland', horizon: 0.42, tilt: 0.7, haze: 0.35, skyTop: '#6f8fb3', skyLow: '#cfdbe6', night: false, city: 'london' },
      msg: { size: 1, text: 15, textColor: '#26313d', mineX: 0.62, peerX: 0.36, sway: 1, opacity: 0.96, newEvery: 3.2 },
      head: { show: true, size: 1, y: 0.06, nameSize: 18, nameColor: '#ffffff' },
    },
    sections: [
      { id:'earth', name:'Earth below', sub:'The ground under the clouds', groups:[
        { name:'Ground', ctrls:[Sel('earth.pick','Which land',EARTHS.map(e=>[e,e.replace(/-/g,' ')])), K('earth.night','Night (city lights)'), Sel('earth.city','City at night',[['london','London'],['new-york','New York']]), R('day_speed','Day ground speed',0,40,.5), R('night_speed','Night ground speed',0,60,.5), R('ground_brightness','Ground brightness',0.2,1.8,.01), R('water_shimmer','Water shimmer',0,1,.01)]},
        { name:'View', ctrls:[R('earth.horizon','Horizon height',0.15,0.75,.005), R('earth.tilt','How flat the ground lies',0,1,.01), R('earth.haze','Haze',0,1,.01), C('earth.skyTop','Sky color (top)'), C('earth.skyLow','Sky color (horizon)')]},
      ]},
      { id:'msg', name:'Message clouds', sub:'Each message is a cloud', groups:[
        { name:'Clouds', ctrls:[R('msg.size','Cloud size',0.5,2,.01), R('cloud_padding','Room around the words',4,40,1), R('message_spacing','Space between messages',0,60,1), R('cloud_growth_ms','How fast a new cloud puffs up (ms)',50,2000,10), R('cloud_variety','Cloud shape variety',0,1,.01), R('cloud_speed','Cloud billow speed',0,3,.01), R('msg.sway','Sway',0,3,.01), R('msg.opacity','See-through',0.3,1,.01), R('cloud_shadow','Shadows on the ground',0,1,.01)]},
        { name:'Words', ctrls:[R('msg.text','Text size',10,24,.5), C('msg.textColor','Text color'), R('msg.mineX','Your clouds sit at',0.4,0.85,.005), R('msg.peerX','Their clouds sit at',0.15,0.6,.005), R('msg.newEvery','Preview: a new message every (s)',1,10,.1)]},
        { name:'Background clouds', ctrls:[R('ambient_count','How many',0,10,1), R('ambient_speed','Speed',0,4,.01), R('ambient_scale','Size',0.3,2.5,.01), R('ambient_opacity','See-through',0,1,.01)]},
      ]},
      { id:'head', name:'Person on top', sub:'Their 3D bust & name', groups:[
        { name:'Header', ctrls:[K('head.show','Show'), R('head.size','Bust size',0.4,1.8,.01), R('head.y','Height',0,0.2,.002), R('head.nameSize','Name size',10,30,.5), C('head.nameColor','Name color')]},
      ]},
    ],
    push: true,
    draw: drawConvo,
  },
  heimdall: {
    title: 'Heimdall (notifications)',
    defaults: {
      space: { image: 1, bright: 0.85, zoom: 1.08, drift: 0.4, bend: 0.3 },
      moon: { y: 0.8, size: 1.3, bright: 0.9 },
      man: { x: 0.5, y: 0.58, size: 0.95, rise: 1.6, horn: 1, hornGlow: 0.6, hornColor: '#ffd27a', hornX: 0.08, hornY: -0.12, hornSize: 0.35 },
    },
    sections: [
      { id:'space', name:'Space', sub:'Drifting, bending sky', groups:[
        { name:'Space', ctrls:[R('space.image','Space picture',1,16,1), R('space.bright','Brightness',0.2,1.6,.01), R('space.zoom','Zoom',1,1.6,.01), R('space.drift','Drift speed',0,2,.01), R('space.bend','Slow bending',0,1,.01)]},
      ]},
      { id:'moon', name:'Moon ground', sub:'Barren cratered moon', groups:[
        { name:'Moon', ctrls:[R('moon.y','Height',0.55,1,.005), R('moon.size','Size',0.8,2.5,.01), R('moon.bright','Brightness',0.2,1.6,.01)]},
      ]},
      { id:'man', name:'Heimdall', sub:'Void silhouette & gold horn', groups:[
        { name:'Heimdall', ctrls:[R('man.x','Left / right',0.2,0.8,.005), R('man.y','Height',0.3,0.8,.005), R('man.size','Size',0.4,1.6,.01), R('man.rise','Seconds to rise on a notification',0.2,5,.05), R('man.hornSize','Horn size',0.1,1.2,.01), R('man.hornX','Horn left / right',-0.5,0.5,.005), R('man.hornY','Horn up / down',-0.5,0.5,.005), R('man.horn','Horn brightness',0,2,.01), R('man.hornGlow','Horn glow',0,2,.01), C('man.hornColor','Glow color')]},
      ]},
    ],
    actions: [['Play a notification (he rises)', () => { STATE.t0 = performance.now(); }]],
    draw: drawHeimdall,
  },
};

/* ======================= SHARED STYLE TOOLS (boxes, text, backgrounds, image slots) ======================= */
const X = (k, label) => ({ t:'x', k, label });
const FONTS = [['system-ui','Clean (system)'],['Inter','Inter'],['Oswald','Oswald'],['Bebas Neue','Bebas Neue'],['Playfair Display','Playfair'],['Cinzel','Cinzel (Norse serif)'],['Cinzel Decorative','Cinzel Decorative'],['MedievalSharp','MedievalSharp'],['Uncial Antiqua','Uncial Antiqua']];
(() => { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800;900&family=Oswald:wght@300;400;600;700&family=Bebas+Neue&family=Playfair+Display:wght@400;600;800;900&family=Cinzel:wght@400;600;800;900&family=Cinzel+Decorative:wght@400;700;900&family=MedievalSharp&family=Uncial+Antiqua&display=swap'; document.head.appendChild(l); })();
const BOX = (o) => Object.assign({ fill:'#15120d', fillA:0.92, tex:'', texA:1, radius:16, bw:1, bc:'#c9a46a', sh:0.5, shBlur:18, shY:8, glow:0, glowC:'#f0c070' }, o || {});
const boxC = (p, n) => [C(p+'.fill', n+': fill color'), R(p+'.fillA', n+': fill see-through', 0, 1, .01), U(p+'.tex', n+': your texture / image'), R(p+'.texA', n+': texture strength', 0, 1, .01), R(p+'.radius', n+': corner rounding', 0, 60, 1), R(p+'.bw', n+': border thickness', 0, 12, .5), C(p+'.bc', n+': border color'), R(p+'.sh', n+': shadow darkness', 0, 1, .01), R(p+'.shBlur', n+': shadow softness', 0, 60, 1), R(p+'.shY', n+': shadow drop', 0, 40, 1), R(p+'.glow', n+': glow', 0, 1.5, .01), C(p+'.glowC', n+': glow color')];
const TXT = (size, color, o) => Object.assign({ font:'system-ui', size, weight:600, color, shA:0, caps:false }, o || {});
const txtC = (p, n) => [Sel(p+'.font', n+': font', FONTS), R(p+'.size', n+': size', 6, 64, .5), R(p+'.weight', n+': thickness', 300, 900, 100), C(p+'.color', n+': color'), R(p+'.shA', n+': shadow', 0, 1, .01), K(p+'.caps', n+': ALL CAPS')];
const BG = (c) => ({ color:c, img:'', imgA:1, dim:0 });
const bgC = (p) => [C(p+'.color','Background color'), U(p+'.img','Your background image'), R(p+'.imgA','Background image strength',0,1,.01), R(p+'.dim','Darken',0,1,.01)];
const SLOTS = (n, size) => ({ n, size, gap:22, y:0.88, glow:0, glowC:'#ffffff', i1:'', i2:'', i3:'', i4:'', i5:'' });
const slotC = (p, n) => [R(p+'.n', n+': how many', 0, 5, 1), R(p+'.size', n+': size', 16, 120, 1), R(p+'.gap', n+': spacing', 0, 80, 1), R(p+'.y', n+': height on screen', 0.4, 0.99, .002), R(p+'.glow', n+': glow', 0, 1.5, .01), C(p+'.glowC', n+': glow color'), U(p+'.i1', n+': image 1'), U(p+'.i2', n+': image 2'), U(p+'.i3', n+': image 3'), U(p+'.i4', n+': image 4'), U(p+'.i5', n+': image 5')];
function hexA(h, a){ const n = parseInt(String(h || '#000000').slice(1, 7), 16) || 0; return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
function box(x, X0, Y0, w, h, b){ if(w <= 0 || h <= 0) return; x.save(); const r = Math.max(0, Math.min(b.radius, w / 2, h / 2)); rr(x, X0, Y0, w, h, r);
  if(b.sh > 0){ x.shadowColor = `rgba(0,0,0,${b.sh})`; x.shadowBlur = b.shBlur; x.shadowOffsetY = b.shY; }
  x.fillStyle = hexA(b.fill, b.fillA); x.fill(); x.shadowColor = 'transparent'; x.shadowBlur = 0; x.shadowOffsetY = 0;
  if(b.tex){ const t = img(b.tex); if(ok(t)){ x.save(); x.clip(); x.globalAlpha = b.texA; cover(x, t, X0, Y0, w, h); x.restore(); rr(x, X0, Y0, w, h, r); } }
  if(b.glow > 0){ x.shadowColor = b.glowC; x.shadowBlur = 22 * b.glow; }
  if(b.bw > 0){ x.lineWidth = b.bw; x.strokeStyle = b.bc; x.stroke(); } else if(b.glow > 0){ x.lineWidth = 1; x.strokeStyle = hexA(b.glowC, 0.4); x.stroke(); }
  x.restore(); }
function fontOf(t){ return `${t.weight} ${t.size}px "${t.font}", system-ui`; }
function tx(x, t, str, X0, Y0, align, maxW){ x.save(); x.font = fontOf(t); x.fillStyle = t.color; x.textAlign = align || 'left'; x.textBaseline = 'alphabetic';
  if(t.shA > 0){ x.shadowColor = `rgba(0,0,0,${t.shA})`; x.shadowBlur = 6; x.shadowOffsetY = 2; }
  const full = t.caps ? String(str).toUpperCase() : String(str); let s = full;
  if(maxW){ while(s.length > 1 && x.measureText(s + (s !== full ? '…' : '')).width > maxW) s = s.slice(0, -1); if(s !== full) s += '…'; }
  x.fillText(s, X0, Y0); x.restore(); }
function tw(x, t, str){ x.save(); x.font = fontOf(t); const w = x.measureText(t.caps ? String(str).toUpperCase() : String(str)).width; x.restore(); return w; }
function bgDraw(x, b){ x.fillStyle = b.color; x.fillRect(0, 0, W, HH * 1.3); if(b.img){ const i = img(b.img); if(ok(i)){ x.save(); x.globalAlpha = b.imgA; cover(x, i, 0, 0, W, HH); x.restore(); } } if(b.dim > 0){ x.fillStyle = `rgba(0,0,0,${b.dim})`; x.fillRect(0, 0, W, HH); } }
function dashed(x, X0, Y0, w, h, label){ x.save(); x.setLineDash([4, 4]); x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 1; x.strokeRect(X0 + .5, Y0 + .5, w - 1, h - 1); if(label){ x.fillStyle = 'rgba(255,255,255,.45)'; x.font = '10px system-ui'; x.textAlign = 'center'; x.fillText(label, X0 + w / 2, Y0 + h / 2 + 3); } x.restore(); }
function slotsDraw(x, s, Yc){ const n = Math.round(s.n); if(!n) return; const tot = n * s.size + (n - 1) * s.gap, Y0 = (Yc ?? HH * s.y) - s.size / 2;
  for(let i = 0; i < n; i++){ const X0 = (W - tot) / 2 + i * (s.size + s.gap), u = s['i' + (i + 1)], im = u ? img(u) : null;
    if(im && ok(im)){ x.save(); if(s.glow > 0){ x.shadowColor = s.glowC; x.shadowBlur = 14 * s.glow; } x.drawImage(im, X0, Y0, s.size, s.size); x.restore(); } else dashed(x, X0, Y0, s.size, s.size, 'slot ' + (i + 1)); } }
function contain(x, im, X0, Y0, w, h, pad){ if(!ok(im)) return; const p = pad || 0, ww = w - 2 * p, hh = h - 2 * p, s = Math.min(ww / im.naturalWidth, hh / im.naturalHeight), dw = im.naturalWidth * s, dh = im.naturalHeight * s; x.drawImage(im, X0 + p + (ww - dw) / 2, Y0 + p + (hh - dh) / 2, dw, dh); }
const ease = (p) => p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
const money = (v) => '$' + (Math.round(v * 100) / 100).toFixed(2);

/* real stores + products from the app (preview only) */
const DATA = { items: [], rates: [] };
const fixUrl = (u) => String(u || '').replace(/ /g, '%20').replace(/'/g, '%27');
(async () => {
  try { const r = await fetch(SB.url + '/rest/v1/products?select=name,price,image_url,stores!inner(name,logo_url,category,is_live)&image_url=like.*supabase.co*&price=gt.0&stores.is_live=is.true&stores.logo_url=like.*supabase.co*&order=id&limit=400', { headers: H() });
    if(r.ok){ const j = await r.json(), seen = {}; j.forEach(p => { const s = p.stores; if(!s || seen[s.name]) return; seen[s.name] = 1; DATA.items.push({ name: p.name, price: +p.price, img: fixUrl(p.image_url), store: s.name, logo: fixUrl(s.logo_url), cat: s.category }); }); } } catch(e){}
  try { const r = await fetch(SB.url + '/rest/v1/ad_rates?select=*', { headers: H() }); if(r.ok) DATA.rates = await r.json(); } catch(e){}
})();
const item = (i) => DATA.items.length ? DATA.items[((i % DATA.items.length) + DATA.items.length) % DATA.items.length] : { name:'Loading…', price:0, img:'', store:'', logo:'', cat:'' };
const SELLERS = ['Freya','Loki','Baldr','Hel','Tyr','Sif','Gerd','Forseti','Skadi','Eir'];

/* ======================= SHOPPING PAGES ======================= */
Object.assign(PAGES, {
  swap: {
    title: 'Swap & Sell (swipe)',
    defaults: {
      bg: BG('#0b0d10'),
      head: { show: true, text: 'Swap & Sell', y: 0.065, t: TXT(24, '#f2e6cf', { font: 'Cinzel', weight: 800 }) },
      filter: { show: true, text: 'Within', miles: 10, y: 0.105, box: BOX({ radius: 20, fill: '#1d2026', bw: 1, bc: '#3a3f48', sh: 0 }), t: TXT(12, '#cfd6e0') },
      card: { w: 0.88, h: 0.6, y: 0.135, photo: 0.66, photoBg: '#ffffff', photoPad: 18, box: BOX({ radius: 22 }) },
      stack: { count: 3, drop: 12, shrink: 0.05, turn: 3, dim: 0.25 },
      info: { pad: 16, used: 0.6, avatar: 26, showSeller: true, showMiles: true, title: TXT(18, '#f2e6cf'), price: TXT(24, '#e9c46a', { weight: 800 }), seller: TXT(12, '#aab3bf', { weight: 500 }) },
      chip: { show: true, text: 'Deliver it', place: 'photo', box: BOX({ radius: 14, fill: '#e9c46a', fillA: 1, bw: 0, sh: 0.3, shBlur: 8, shY: 3 }), t: TXT(12, '#1b1406', { weight: 800 }) },
      swipe: { auto: true, every: 2.6, speed: 0.45, tilt: 14, fly: 1.3, upFly: 1.2 },
      stamp: { show: true, save: 'SAVE', skip: 'SKIP', offer: 'OFFER', saveC: '#4ade80', skipC: '#f87171', offerC: '#60a5fa', bw: 3, turn: -14, t: TXT(34, '#ffffff', { font: 'Bebas Neue', weight: 400 }) },
      btns: SLOTS(3, 58),
    },
    sections: [
      { id:'look', name:'Page', sub:'Background, title, distance filter', groups:[
        { name:'Background', ctrls: bgC('bg') },
        { name:'Title', ctrls: [K('head.show','Show title'), X('head.text','Title text'), R('head.y','Height',0.02,0.2,.002), ...txtC('head.t','Title')] },
        { name:'Distance filter ("within X miles")', ctrls: [K('filter.show','Show'), X('filter.text','Word before the miles'), R('filter.miles','Miles',1,50,1), R('filter.y','Height',0.05,0.25,.002), ...txtC('filter.t','Filter text'), ...boxC('filter.box','Filter pill')] },
      ]},
      { id:'card', name:'Listing card', sub:'Size, photo, stack behind', groups:[
        { name:'Card', ctrls: [R('card.w','Width',0.5,1,.005), R('card.h','Height',0.3,0.8,.005), R('card.y','Top position',0.05,0.4,.002), R('card.photo','Photo share of card',0.3,0.9,.005), C('card.photoBg','Photo background'), R('card.photoPad','Photo padding',0,60,1), ...boxC('card.box','Card')] },
        { name:'Cards stacked behind', ctrls: [R('stack.count','How many show',1,5,1), R('stack.drop','Peek below',0,40,1), R('stack.shrink','Shrink each',0,0.15,.005), R('stack.turn','Fan angle',0,12,.5), R('stack.dim','Darken behind',0,0.8,.01)] },
      ]},
      { id:'info', name:'Item details', sub:'Title, price, seller', groups:[
        { name:'Layout', ctrls: [R('info.pad','Inner spacing',4,40,1), R('info.used','Preview price (x store price)',0.1,1,.01), K('info.showSeller','Show seller'), K('info.showMiles','Show miles away'), R('info.avatar','Seller photo size',0,48,1)] },
        { name:'Item name', ctrls: txtC('info.title','Name') }, { name:'Price', ctrls: txtC('info.price','Price') }, { name:'Seller line', ctrls: txtC('info.seller','Seller') },
      ]},
      { id:'chip', name:'"Deliver it" tag', sub:'Sleipnir driver brings it', groups:[
        { name:'Tag', ctrls: [K('chip.show','Show'), X('chip.text','Tag text'), Sel('chip.place','Where',[['photo','On the photo'],['info','Next to the price'],['top','Top corner of card']]), ...txtC('chip.t','Tag text'), ...boxC('chip.box','Tag')] },
      ]},
      { id:'swipe', name:'Swiping', sub:'Save, skip, offer motion', groups:[
        { name:'Motion', ctrls: [K('swipe.auto','Play swipes in the preview'), R('swipe.every','Seconds per card',1,8,.1), R('swipe.speed','Swipe speed (share of time)',0.15,0.9,.01), R('swipe.tilt','Tilt while swiping',0,40,.5), R('swipe.fly','Throw distance (sideways)',0.6,2,.01), R('swipe.upFly','Throw distance (up)',0.6,2,.01)] },
        { name:'Stamps', ctrls: [K('stamp.show','Show stamps'), X('stamp.save','Right swipe word'), C('stamp.saveC','Right color'), X('stamp.skip','Left swipe word'), C('stamp.skipC','Left color'), X('stamp.offer','Up swipe word'), C('stamp.offerC','Up color'), R('stamp.bw','Stamp border',0,8,.5), R('stamp.turn','Stamp angle',-40,40,1), ...txtC('stamp.t','Stamp')] },
      ]},
      { id:'btns', name:'Buttons', sub:'Your images, empty until you add them', groups:[ { name:'Button slots', ctrls: slotC('btns','Buttons') } ]},
    ],
    draw: drawSwap,
  },
  ads: {
    title: 'Ads for local businesses',
    defaults: {
      bg: BG('#07080b'),
      label: { show: true, text: 'Sponsored', place: 'corner', t: TXT(10, '#e9c46a', { weight: 700, caps: true }), box: BOX({ radius: 8, fill: '#000000', fillA: 0.55, bw: 1, bc: '#e9c46a', sh: 0 }) },
      feed: { every: 3, margin: 14, gap: 18, ratio: 1, scroll: 22, img: '', head: 'Fresh and hot, delivered', body: 'Free delivery on your first order', logo: 34, card: BOX({ radius: 18 }), normal: BOX({ radius: 18, fill: '#121418', bw: 0, sh: 0.3 }), headT: TXT(17, '#f2e6cf', { weight: 800 }), bodyT: TXT(13, '#cfc6b4', { weight: 400 }), nameT: TXT(13, '#ffffff', { weight: 700 }), photoBg: '#ffffff' },
      cta: { text: 'Order now', w: 0.42, h: 40, box: BOX({ radius: 12, fill: '#e9c46a', fillA: 1, bw: 0, sh: 0 }), t: TXT(14, '#1b1406', { weight: 800 }) },
      banner: { h: 0.14, y: 0.03, margin: 12, every: 4, trans: 'slide', transSec: 0.6, dots: true, dotC: '#e9c46a', img: '', text: 'Today only', box: BOX({ radius: 16 }), t: TXT(16, '#ffffff', { weight: 800, shA: 0.6 }), photoBg: '#ffffff' },
      take: { every: 7, inSec: 0.6, kind: 'zoom', dim: 0.65, w: 0.9, h: 0.72, img: '', head: 'DEAL OF THE DAY', count: true, hours: 6, close: 30, box: BOX({ radius: 26 }), headT: TXT(34, '#ffffff', { font: 'Bebas Neue', weight: 400, shA: 0.5 }), countT: TXT(22, '#e9c46a', { weight: 800 }), photoBg: '#ffffff' },
      book: { title: 'Advertise on Sleipnir', accent: '#e9c46a', box: BOX({ radius: 16, fill: '#14161b', bw: 1, bc: '#2b2f38', sh: 0 }), titleT: TXT(22, '#ffffff', { weight: 800 }), labelT: TXT(12, '#9aa3af', { weight: 500 }), priceT: TXT(18, '#e9c46a', { weight: 800 }), weeks: 2, pay: 'Start my ad' },
    },
    sections: [
      { id:'feed', name:'Ad in the feed', sub:'A sponsored card every few posts', groups:[
        { name:'Where & how often', ctrls: [R('feed.every','An ad every N posts',2,10,1), R('feed.margin','Side margin',0,40,1), R('feed.gap','Space between',0,50,1), R('feed.scroll','Preview scroll speed',0,80,1), C('bg.color','Page background')] },
        { name:'Ad card', ctrls: [R('feed.ratio','Picture height (x width)',0.4,1.5,.01), U('feed.img','Ad picture (blank = real store product)'), C('feed.photoBg','Picture background'), R('feed.logo','Store logo size',0,60,1), X('feed.head','Headline'), X('feed.body','Line under it'), ...boxC('feed.card','Ad card')] },
        { name:'Ad text', ctrls: [...txtC('feed.nameT','Store name'), ...txtC('feed.headT','Headline'), ...txtC('feed.bodyT','Line under')] },
        { name:'Normal posts around it', ctrls: boxC('feed.normal','Normal post') },
      ]},
      { id:'banner', name:'Top banner', sub:'Rotating ads in the sky strip', groups:[
        { name:'Banner', ctrls: [R('banner.h','Height',0.06,0.3,.002), R('banner.y','Top position',0,0.3,.002), R('banner.margin','Side margin',0,40,1), R('banner.every','Seconds per ad',1.5,12,.1), Sel('banner.trans','Change style',[['slide','Slide'],['fade','Fade'],['flip','Flip']]), R('banner.transSec','Change speed (s)',0.1,2,.05), K('banner.dots','Show dots'), C('banner.dotC','Dot color'), U('banner.img','Banner picture (blank = real stores)'), C('banner.photoBg','Picture background'), X('banner.text','Line of text'), ...txtC('banner.t','Banner text'), ...boxC('banner.box','Banner')] },
      ]},
      { id:'take', name:'Deal of the day', sub:'Full-screen takeover once a day', groups:[
        { name:'Takeover', ctrls: [R('take.every','Preview: replay every (s)',3,20,.5), R('take.inSec','Open speed (s)',0.1,2,.05), Sel('take.kind','How it opens',[['zoom','Zoom up'],['rise','Rise from bottom'],['fade','Fade in'],['drop','Drop from top']]), R('take.dim','Darken behind',0,1,.01), R('take.w','Width',0.5,1,.005), R('take.h','Height',0.3,0.95,.005), U('take.img','Picture (blank = real store product)'), C('take.photoBg','Picture background'), X('take.head','Headline'), K('take.count','Show countdown'), R('take.hours','Countdown hours',1,24,1), R('take.close','Close button size',16,60,1), ...boxC('take.box','Takeover')] },
        { name:'Takeover text', ctrls: [...txtC('take.headT','Headline'), ...txtC('take.countT','Countdown')] },
      ]},
      { id:'cta', name:'Button & label', sub:'"Order now" & "Sponsored"', groups:[
        { name:'Button', ctrls: [X('cta.text','Button text'), R('cta.w','Width',0.2,0.9,.005), R('cta.h','Height',24,70,1), ...txtC('cta.t','Button text'), ...boxC('cta.box','Button')] },
        { name:'"Sponsored" label', ctrls: [K('label.show','Show'), X('label.text','Label text'), Sel('label.place','Where',[['corner','Top corner of the picture'],['header','Next to the store name'],['bottom','Under the button']]), ...txtC('label.t','Label'), ...boxC('label.box','Label')] },
      ]},
      { id:'book', name:'Business buys an ad', sub:'Self-serve: pick area & weeks', groups:[
        { name:'Booking screen', ctrls: [X('book.title','Title'), X('book.pay','Pay button text'), C('book.accent','Picked option color'), R('book.weeks','Preview weeks',1,12,1), ...boxC('book.box','Option boxes')] },
        { name:'Booking text', ctrls: [...txtC('book.titleT','Title'), ...txtC('book.labelT','Small labels'), ...txtC('book.priceT','Prices')] },
      ]},
    ],
    draw: drawAds,
  },
  shoppost: {
    title: 'Shop the post',
    defaults: {
      bg: BG('#05070a'),
      post: { margin: 14, y: 0.08, ratio: 1.15, img: '', photoBg: '#101114', box: BOX({ radius: 18 }), avatar: 30, nameT: TXT(14, '#f2e6cf', { weight: 700 }), caption: 'Best thing I ate all week', capT: TXT(13, '#e7dcc8', { weight: 400 }) },
      pin: { x: 0.55, y: 0.6, size: 14, color: '#ffffff', ring: '#e9c46a', ringW: 2, pulse: 1, pulseSpeed: 1, img: '' },
      card: { auto: true, every: 4, open: 0.65, place: 'over', w: 0.74, imgSize: 58, photoBg: '#ffffff', box: BOX({ radius: 16, fill: '#15120d', fillA: 0.95 }), nameT: TXT(14, '#ffffff', { weight: 700 }), storeT: TXT(11, '#aab3bf', { weight: 500 }), priceT: TXT(16, '#e9c46a', { weight: 800 }) },
      btn: { text: 'Get it delivered', h: 36, box: BOX({ radius: 10, fill: '#e9c46a', fillA: 1, bw: 0, sh: 0 }), t: TXT(13, '#1b1406', { weight: 800 }) },
      credit: { show: true, text: 'earns credit when you order', box: BOX({ radius: 12, fill: '#000000', fillA: 0.5, bw: 0, sh: 0 }), t: TXT(11, '#e9c46a', { weight: 600 }) },
      bar: { show: true, text: 'Shop this post', y: 0.9, h: 50, box: BOX({ radius: 25, fill: '#e9c46a', fillA: 1, bw: 0, sh: 0.5 }), t: TXT(16, '#1b1406', { weight: 800 }) },
    },
    sections: [
      { id:'post', name:'The post', sub:'Picture, name, caption', groups:[
        { name:'Post', ctrls: [R('post.margin','Side margin',0,40,1), R('post.y','Top position',0,0.3,.002), R('post.ratio','Picture height (x width)',0.6,1.6,.01), U('post.img','Post picture (blank = real product)'), C('post.photoBg','Picture background'), R('post.avatar','Poster photo size',0,50,1), X('post.caption','Caption'), ...boxC('post.box','Post')] },
        { name:'Post text', ctrls: [...txtC('post.nameT','Name'), ...txtC('post.capT','Caption')] },
        { name:'Background', ctrls: bgC('bg') },
      ]},
      { id:'pin', name:'Product tag dot', sub:'Tap it to see the product', groups:[
        { name:'Dot', ctrls: [R('pin.x','Left / right',0,1,.005), R('pin.y','Up / down',0,1,.005), R('pin.size','Size',4,40,.5), C('pin.color','Dot color'), C('pin.ring','Ring color'), R('pin.ringW','Ring thickness',0,8,.5), R('pin.pulse','Pulse',0,2,.01), R('pin.pulseSpeed','Pulse speed',0.1,3,.01), U('pin.img','Your dot image (optional)')] },
      ]},
      { id:'card', name:'Product card', sub:'Pops up from the dot', groups:[
        { name:'Card', ctrls: [K('card.auto','Open and close in the preview'), R('card.every','Preview cycle (s)',1.5,10,.1), R('card.open','Time open (share)',0.2,1,.01), Sel('card.place','Where it opens',[['over','Over the picture by the dot'],['below','Under the picture'],['sheet','Slides up from the bottom']]), R('card.w','Width',0.4,1,.005), R('card.imgSize','Product picture size',0,100,1), C('card.photoBg','Product picture background'), ...boxC('card.box','Card')] },
        { name:'Card text', ctrls: [...txtC('card.nameT','Product name'), ...txtC('card.storeT','Store name'), ...txtC('card.priceT','Price')] },
        { name:'Button', ctrls: [X('btn.text','Button text'), R('btn.h','Height',22,60,1), ...txtC('btn.t','Button text'), ...boxC('btn.box','Button')] },
      ]},
      { id:'credit', name:'Creator credit', sub:'Poster earns when you order', groups:[
        { name:'Credit tag', ctrls: [K('credit.show','Show'), X('credit.text','Text after the name'), ...txtC('credit.t','Credit text'), ...boxC('credit.box','Credit tag')] },
        { name:'Bottom shop bar', ctrls: [K('bar.show','Show'), X('bar.text','Text'), R('bar.y','Height on screen',0.6,0.99,.002), R('bar.h','Bar thickness',30,80,1), ...txtC('bar.t','Bar text'), ...boxC('bar.box','Bar')] },
      ]},
    ],
    draw: drawShopPost,
  },
  deals: {
    title: 'Flash deals & near you now',
    defaults: {
      bg: BG('#0a0b0e'),
      head: { text: 'Flash Deals', y: 0.06, t: TXT(26, '#f2e6cf', { font: 'Cinzel', weight: 800 }) },
      near: { show: true, text: 'Near you now', miles: 5, y: 0.1, box: BOX({ radius: 16, fill: '#1d2026', bw: 1, bc: '#3a3f48', sh: 0 }), t: TXT(12, '#cfd6e0') },
      list: { layout: 'grid', cols: 2, margin: 14, gap: 12, top: 0.14, ratio: 0.9, scroll: 14, photoBg: '#ffffff', photoPad: 10, card: BOX({ radius: 16, fill: '#15120d' }) },
      txt: { nameT: TXT(13, '#f2e6cf', { weight: 600 }), priceT: TXT(17, '#e9c46a', { weight: 800 }), oldT: TXT(11, '#8a8f98', { weight: 500 }), storeT: TXT(10, '#aab3bf', { weight: 500 }), discount: 0.3, showOld: true, showStore: true },
      off: { show: true, place: 'tl', box: BOX({ radius: 10, fill: '#dc2626', fillA: 1, bw: 0, sh: 0.3, shBlur: 6, shY: 2 }), t: TXT(12, '#ffffff', { weight: 800 }) },
      timer: { show: true, hours: 3, place: 'photo', box: BOX({ radius: 8, fill: '#000000', fillA: 0.65, bw: 0, sh: 0 }), t: TXT(11, '#ffffff', { weight: 700, font: 'Oswald' }) },
      qty: { show: true, total: 20, h: 6, bg: '#2a2d33', fill: '#e9c46a', label: 'left', t: TXT(10, '#cfd6e0', { weight: 600 }) },
    },
    sections: [
      { id:'look', name:'Page', sub:'Background, title, near you', groups:[
        { name:'Background', ctrls: bgC('bg') },
        { name:'Title', ctrls: [X('head.text','Title text'), R('head.y','Height',0.02,0.2,.002), ...txtC('head.t','Title')] },
        { name:'"Near you now" pill', ctrls: [K('near.show','Show'), X('near.text','Text'), R('near.miles','Miles',1,30,1), R('near.y','Height',0.05,0.25,.002), ...txtC('near.t','Pill text'), ...boxC('near.box','Pill')] },
      ]},
      { id:'list', name:'Deal cards', sub:'Grid, list or carousel', groups:[
        { name:'Layout', ctrls: [Sel('list.layout','Layout',[['grid','Grid'],['list','List (one per row)'],['carousel','Sideways carousel']]), R('list.cols','Columns (grid)',1,3,1), R('list.margin','Side margin',0,40,1), R('list.gap','Space between',0,40,1), R('list.top','Where cards start',0.08,0.4,.002), R('list.ratio','Picture height (x width)',0.4,1.5,.01), R('list.scroll','Preview scroll speed',0,60,1), C('list.photoBg','Picture background'), R('list.photoPad','Picture padding',0,40,1), ...boxC('list.card','Card')] },
      ]},
      { id:'txt', name:'Prices & text', sub:'Deal price, old price, store', groups:[
        { name:'What shows', ctrls: [R('txt.discount','Preview discount',0.05,0.8,.01), K('txt.showOld','Show crossed-out old price'), K('txt.showStore','Show store name')] },
        { name:'Product name', ctrls: txtC('txt.nameT','Name') }, { name:'Deal price', ctrls: txtC('txt.priceT','Price') }, { name:'Old price', ctrls: txtC('txt.oldT','Old price') }, { name:'Store name', ctrls: txtC('txt.storeT','Store') },
      ]},
      { id:'badges', name:'Badges', sub:'% off, countdown, how many left', groups:[
        { name:'% off badge', ctrls: [K('off.show','Show'), Sel('off.place','Corner',[['tl','Top left'],['tr','Top right'],['bl','Bottom left'],['br','Bottom right']]), ...txtC('off.t','Badge text'), ...boxC('off.box','Badge')] },
        { name:'Countdown', ctrls: [K('timer.show','Show'), R('timer.hours','Hours left (preview)',1,48,1), Sel('timer.place','Where',[['photo','On the picture'],['under','Under the price']]), ...txtC('timer.t','Countdown text'), ...boxC('timer.box','Countdown')] },
        { name:'How many left', ctrls: [K('qty.show','Show'), R('qty.total','Starting quantity',2,100,1), R('qty.h','Bar thickness',2,16,.5), C('qty.bg','Bar background'), C('qty.fill','Bar fill'), X('qty.label','Word after the number'), ...txtC('qty.t','Text')] },
      ]},
    ],
    draw: drawDeals,
  },
});

/* ---------- Swap & Sell ---------- */
function drawSwapCard(x, it, i, cx, top, w, h, S){
  const C2 = S.card, I = S.info, P = S.chip, X0 = cx - w / 2;
  box(x, X0, top, w, h, C2.box);
  const ph = h * C2.photo, r = Math.min(C2.box.radius, w / 2);
  x.save(); rr(x, X0, top, w, h, r); x.clip(); x.fillStyle = C2.photoBg; x.fillRect(X0, top, w, ph); if(it.img) contain(x, img(it.img), X0, top, w, ph, C2.photoPad); x.restore();
  let y = top + ph + I.pad + I.title.size;
  tx(x, I.title, it.name, X0 + I.pad, y, 'left', w - I.pad * 2);
  y += I.price.size + 6; const pr = money(it.price * I.used); tx(x, I.price, pr, X0 + I.pad, y);
  const chipDraw = (cx2, cy2) => { const cw = tw(x, P.t, P.text) + 22, ch = P.t.size + 14; box(x, cx2, cy2, cw, ch, P.box); tx(x, P.t, P.text, cx2 + cw / 2, cy2 + ch / 2 + P.t.size * 0.36, 'center'); return cw; };
  if(P.show && P.place === 'info') chipDraw(X0 + I.pad + tw(x, I.price, pr) + 10, y - I.price.size + 2);
  if(I.showSeller){ y += 12 + Math.max(I.avatar, I.seller.size); const nm = SELLERS[i % SELLERS.length], ax = X0 + I.pad;
    if(I.avatar > 0){ const av = img('faces/' + nm + '.jpg'); x.save(); x.beginPath(); x.arc(ax + I.avatar / 2, y - I.avatar / 2, I.avatar / 2, 0, 7); x.clip(); if(ok(av)) cover(x, av, ax, y - I.avatar, I.avatar, I.avatar); x.restore(); }
    tx(x, I.seller, nm + (I.showMiles ? ' · ' + (1 + (i * 37 % 90) / 10).toFixed(1) + ' mi away' : ''), ax + I.avatar + (I.avatar ? 8 : 0), y - I.avatar / 2 + I.seller.size * 0.36, 'left', w - I.pad * 2 - I.avatar); }
  if(P.show && P.place === 'photo') chipDraw(X0 + 12, top + ph - P.t.size - 26);
  if(P.show && P.place === 'top'){ const cw = tw(x, P.t, P.text) + 22; chipDraw(X0 + w - cw - 12, top + 12); }
}
function drawSwap(x, t, S){
  bgDraw(x, S.bg);
  if(S.head.show) tx(x, S.head.t, S.head.text, W / 2, HH * S.head.y, 'center', W - 30);
  if(S.filter.show){ const s = S.filter.text + ' ' + S.filter.miles + ' mi', fw = tw(x, S.filter.t, s) + 28, fh = S.filter.t.size + 14, fy = HH * S.filter.y; box(x, (W - fw) / 2, fy, fw, fh, S.filter.box); tx(x, S.filter.t, s, W / 2, fy + fh / 2 + S.filter.t.size * 0.36, 'center'); }
  const C2 = S.card, Sw = S.swipe, St = S.stack, w = W * C2.w, h = HH * C2.h, top = HH * C2.y, cx = W / 2;
  const k = Sw.auto ? Math.floor(t / Sw.every) : 0, ph = Sw.auto ? (t % Sw.every) / Sw.every : 0, p = ease(clamp((ph - (1 - Sw.speed)) / Sw.speed, 0, 1)), dir = k % 3; // 0 save(right) 1 skip(left) 2 offer(up)
  const n = Math.round(St.count);
  for(let j = n - 1; j >= 1; j--){ const jj = j - p, sc = 1 - jj * St.shrink, rot = (j % 2 ? 1 : -1) * St.turn * jj * Math.PI / 180;
    x.save(); x.translate(cx, top + h / 2 + jj * St.drop); x.rotate(rot); x.scale(sc, sc); drawSwapCard(x, item(k + j), k + j, 0, -h / 2, w, h, S);
    if(St.dim > 0){ rr(x, -w / 2, -h / 2, w, h, Math.min(C2.box.radius, w / 2)); x.fillStyle = `rgba(0,0,0,${St.dim * jj / Math.max(1, n - 1)})`; x.fill(); } x.restore(); }
  const dx = dir === 0 ? p * W * Sw.fly : dir === 1 ? -p * W * Sw.fly : 0, dy = dir === 2 ? -p * HH * 0.6 * Sw.upFly : 0, rot = (dir === 2 ? 0 : (dir === 0 ? 1 : -1)) * Sw.tilt * p * Math.PI / 180;
  x.save(); x.translate(cx + dx, top + h / 2 + dy); x.rotate(rot); drawSwapCard(x, item(k), k, 0, -h / 2, w, h, S);
  if(S.stamp.show && p > 0){ const word = [S.stamp.save, S.stamp.skip, S.stamp.offer][dir], col = [S.stamp.saveC, S.stamp.skipC, S.stamp.offerC][dir], sw2 = tw(x, S.stamp.t, word) + 24, sh2 = S.stamp.t.size + 12;
    x.save(); x.globalAlpha = clamp(p * 2.2, 0, 1); x.translate(dir === 1 ? w / 2 - sw2 / 2 - 20 : dir === 0 ? -w / 2 + sw2 / 2 + 20 : 0, -h / 2 + sh2 + 20); x.rotate(S.stamp.turn * Math.PI / 180 * (dir === 1 ? -1 : 1));
    x.lineWidth = S.stamp.bw; x.strokeStyle = col; if(S.stamp.bw > 0) x.strokeRect(-sw2 / 2, -sh2 / 2, sw2, sh2); tx(x, Object.assign({}, S.stamp.t, { color: col }), word, 0, S.stamp.t.size * 0.36, 'center'); x.restore(); }
  x.restore();
  slotsDraw(x, S.btns);
}

/* ---------- Ads ---------- */
function sponsored(x, S, X0, Y0, align){ const L = S.label; if(!L.show) return 0; const lw = tw(x, L.t, L.text) + 14, lh = L.t.size + 8, lx = align === 'right' ? X0 - lw : X0; box(x, lx, Y0, lw, lh, L.box); tx(x, L.t, L.text, lx + lw / 2, Y0 + lh / 2 + L.t.size * 0.36, 'center'); return lw; }
function ctaDraw(x, S, cx, Y0, wMax){ const B = S.cta, bw = Math.min(wMax, W * B.w); box(x, cx - bw / 2, Y0, bw, B.h, B.box); tx(x, B.t, B.text, cx, Y0 + B.h / 2 + B.t.size * 0.36, 'center', bw - 10); return B.h; }
function adCardH(S, cw){ const F = S.feed; return 50 + cw * F.ratio + 14 + F.headT.size + 6 + F.bodyT.size + 14 + S.cta.h + 16 + (S.label.show && S.label.place === 'bottom' ? S.label.t.size + 14 : 0); }
function drawAdCard(x, S, it, X0, Y0, cw){
  const F = S.feed, h = adCardH(S, cw); box(x, X0, Y0, cw, h, F.card);
  if(F.logo > 0 && it.logo){ const lg = img(it.logo); x.save(); x.beginPath(); x.arc(X0 + 12 + F.logo / 2, Y0 + 25, F.logo / 2, 0, 7); x.fillStyle = '#fff'; x.fill(); x.clip(); contain(x, lg, X0 + 12, Y0 + 25 - F.logo / 2, F.logo, F.logo, 2); x.restore(); }
  const nx = X0 + 12 + (F.logo > 0 ? F.logo + 10 : 0); tx(x, F.nameT, it.store, nx, Y0 + 25 + F.nameT.size * 0.36, 'left', cw - (nx - X0) - 100);
  if(S.label.place === 'header') sponsored(x, S, X0 + cw - 12, Y0 + 25 - (S.label.t.size + 8) / 2, 'right');
  const py = Y0 + 50, phh = cw * F.ratio; x.save(); x.beginPath(); x.rect(X0 + F.card.bw, py, cw - 2 * F.card.bw, phh); x.clip(); x.fillStyle = F.photoBg; x.fillRect(X0, py, cw, phh);
  if(F.img) cover(x, img(F.img), X0, py, cw, phh); else if(it.img) contain(x, img(it.img), X0, py, cw, phh, 14); x.restore();
  if(S.label.place === 'corner') sponsored(x, S, X0 + cw - 10, py + 10, 'right');
  let y = py + phh + 14 + F.headT.size; tx(x, F.headT, F.head, X0 + 14, y, 'left', cw - 28); y += 6 + F.bodyT.size; tx(x, F.bodyT, F.body, X0 + 14, y, 'left', cw - 28);
  y += 14; ctaDraw(x, S, X0 + cw / 2, y, cw - 28); y += S.cta.h + 8;
  if(S.label.place === 'bottom'){ const lw = tw(x, S.label.t, S.label.text) + 14; sponsored(x, S, X0 + (cw - lw) / 2, y); }
  return h; }
function feedDraw(x, t, S, dim){
  const F = S.feed, cw = W - F.margin * 2, normH = cw * 1.1 + 70; let entries = []; for(let k = 0; k < 24; k++) entries.push((k + 1) % Math.round(F.every) === 0 ? 'ad' : 'post');
  const hs = entries.map(e => (e === 'ad' ? adCardH(S, cw) : normH) + F.gap), total = hs.reduce((a, b) => a + b, 0), sc = (t * F.scroll) % total;
  let y = 20 - sc, ai = 0;
  for(let rep = 0; rep < 2; rep++) entries.forEach((e, k) => { const hh = hs[k]; if(y < HH && y + hh > 0){
      if(e === 'ad') drawAdCard(x, S, item(7 + ai * 3), F.margin, y, cw);
      else { box(x, F.margin, y, cw, normH, F.normal); const it = item(k * 5 + 1), nm = SELLERS[k % SELLERS.length], av = img('faces/' + nm + '.jpg'); x.save(); x.beginPath(); x.arc(F.margin + 26, y + 24, 14, 0, 7); x.clip(); if(ok(av)) cover(x, av, F.margin + 12, y + 10, 28, 28); x.restore();
        tx(x, F.nameT, nm, F.margin + 48, y + 29); x.save(); x.beginPath(); x.rect(F.margin, y + 48, cw, cw * 1.1 - 4); x.clip(); cover(x, img(bgSrc(1 + (k * 3) % 23)), F.margin, y + 48, cw, cw * 1.1 - 4); x.restore(); } }
    if(e === 'ad') ai++; y += hh; });
  if(dim){ x.fillStyle = `rgba(0,0,0,${dim})`; x.fillRect(0, 0, W, HH); }
}
function drawAds(x, t, S, since){
  bgDraw(x, S.bg); const sec = STATE.sec;
  if(sec === 'feed' || sec === 'cta'){ feedDraw(x, t, S); return; }
  if(sec === 'banner'){ const B = S.banner, bw = W - B.margin * 2, bh = HH * B.h, by = HH * B.y;
    feedDraw(x, t * 0.3, S); x.fillStyle = S.bg.color; x.fillRect(0, 0, W, by + bh + 12);
    const n = Math.floor(t / B.every), ph = (t % B.every), tr = clamp(ph / B.transSec, 0, 1), e = ease(tr);
    const drawB = (idx, ox, alpha, sy) => { const it = item(11 + idx * 2); x.save(); x.globalAlpha = alpha; x.translate(B.margin + ox + bw / 2, by + bh / 2); x.scale(1, sy); x.translate(-bw / 2, -bh / 2);
      box(x, 0, 0, bw, bh, B.box); x.save(); rr(x, 0, 0, bw, bh, Math.min(B.box.radius, bh / 2)); x.clip(); x.fillStyle = B.photoBg; x.fillRect(bw * 0.55, 0, bw * 0.45, bh);
      if(B.img) cover(x, img(B.img), 0, 0, bw, bh); else { if(it.img) contain(x, img(it.img), bw * 0.55, 0, bw * 0.45, bh, 6); if(it.logo){ const lg = img(it.logo); contain(x, lg, 12, 10, bh * 0.5, bh * 0.5, 0); } } x.restore();
      tx(x, B.t, B.text, 14, bh - 14 - B.t.size - 4, 'left', bw * 0.5); tx(x, Object.assign({}, B.t, { size: B.t.size * 0.8, weight: 500 }), it.store, 14, bh - 12, 'left', bw * 0.5);
      if(S.label.show) sponsored(x, S, bw * 0.55 - 8, 8, 'right'); x.restore(); };
    if(B.trans === 'slide'){ drawB(n - 1, -e * (bw + B.margin), 1, 1); drawB(n, (1 - e) * (bw + B.margin), 1, 1); }
    else if(B.trans === 'fade'){ drawB(n - 1, 0, 1 - e, 1); drawB(n, 0, e, 1); }
    else { if(e < 0.5) drawB(n - 1, 0, 1, 1 - e * 2); else drawB(n, 0, 1, (e - 0.5) * 2); }
    if(B.dots){ for(let i = 0; i < 5; i++){ x.fillStyle = i === n % 5 ? B.dotC : 'rgba(255,255,255,.3)'; x.beginPath(); x.arc(W / 2 + (i - 2) * 12, by + bh + 8, 3, 0, 7); x.fill(); } }
    return; }
  if(sec === 'take'){ const T = S.take; const ph = t % T.every, p = ease(clamp(ph / T.inSec, 0, 1)), out = ease(clamp((ph - (T.every - T.inSec)) / T.inSec, 0, 1)), v = p * (1 - out);
    feedDraw(x, t * 0.2, S, T.dim * v);
    const w = W * T.w, h = HH * T.h, cx = W / 2, cy = HH / 2, it = item(23);
    x.save(); x.globalAlpha = T.kind === 'fade' ? v : clamp(v * 3, 0, 1); x.translate(cx, cy + (T.kind === 'rise' ? (1 - v) * HH : T.kind === 'drop' ? -(1 - v) * HH : 0)); const z = T.kind === 'zoom' ? 0.6 + 0.4 * v : 1; x.scale(z, z); x.translate(-w / 2, -h / 2);
    box(x, 0, 0, w, h, T.box); x.save(); rr(x, 0, 0, w, h, Math.min(T.box.radius, w / 2)); x.clip(); x.fillStyle = T.photoBg; x.fillRect(0, 0, w, h * 0.55); if(T.img) cover(x, img(T.img), 0, 0, w, h * 0.55); else if(it.img) contain(x, img(it.img), 0, 0, w, h * 0.55, 20); x.restore();
    let y = h * 0.55 + 16 + T.headT.size; tx(x, T.headT, T.head, w / 2, y, 'center', w - 24); y += 10 + S.feed.nameT.size; tx(x, S.feed.nameT, it.store + ' · ' + money(it.price), w / 2, y, 'center', w - 24);
    if(T.count){ const left = Math.max(0, T.hours * 3600 - Math.floor(t)), hh = String(Math.floor(left / 3600)).padStart(2, '0'), mm = String(Math.floor(left / 60) % 60).padStart(2, '0'), ss = String(left % 60).padStart(2, '0'); y += 14 + T.countT.size; tx(x, T.countT, `${hh}:${mm}:${ss}`, w / 2, y, 'center'); }
    ctaDraw(x, S, w / 2, h - S.cta.h - 18, w - 40);
    const cs = T.close; x.fillStyle = 'rgba(0,0,0,.55)'; x.beginPath(); x.arc(w - cs * 0.8, cs * 0.8, cs / 2, 0, 7); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 2; x.beginPath(); x.moveTo(w - cs * 0.8 - cs * 0.18, cs * 0.8 - cs * 0.18); x.lineTo(w - cs * 0.8 + cs * 0.18, cs * 0.8 + cs * 0.18); x.moveTo(w - cs * 0.8 + cs * 0.18, cs * 0.8 - cs * 0.18); x.lineTo(w - cs * 0.8 - cs * 0.18, cs * 0.8 + cs * 0.18); x.stroke();
    if(S.label.show) sponsored(x, S, 12, 12);
    x.restore(); return; }
  if(sec === 'book'){ const B = S.book, m = 18; let y = 70; tx(x, B.titleT, B.title, m, y, 'left', W - 2 * m);
    const rates = DATA.rates.length ? DATA.rates : [{ scope:'county', weekly_cents:2500 }, { scope:'state', weekly_cents:7500 }, { scope:'all', weekly_cents:15000 }], names = { county:'My county', state:'All of Florida', all:'Everywhere' }, pick = Math.floor(t / 2.5) % rates.length;
    y += 22; tx(x, B.labelT, 'Who sees it', m, y + B.labelT.size); y += B.labelT.size + 12;
    rates.forEach((r, i) => { const bh = 58; const b = i === pick ? Object.assign({}, B.box, { bc: B.accent, bw: Math.max(2, B.box.bw) }) : B.box; box(x, m, y, W - 2 * m, bh, b);
      tx(x, Object.assign({}, B.titleT, { size: 15, weight: 700 }), names[r.scope] || r.scope, m + 16, y + 26); tx(x, B.labelT, 'per week', m + 16, y + 44); tx(x, B.priceT, money(r.weekly_cents / 100), W - m - 16, y + 36, 'right'); y += bh + 10; });
    y += 8; tx(x, B.labelT, 'Weeks', m, y + B.labelT.size); tx(x, B.priceT, String(B.weeks), W - m - 16, y + B.labelT.size + 2, 'right'); y += 34;
    tx(x, B.labelT, 'Your ad', m, y + B.labelT.size); y += B.labelT.size + 10; const mw = W - 2 * m, sc = 0.55; x.save(); x.translate(m + mw * (1 - sc) / 2, y); x.scale(sc, sc); const ch = drawAdCard(x, S, item(7), 0, 0, mw); x.restore(); y += ch * sc + 14;
    const r = rates[pick]; tx(x, B.labelT, 'Total', m, y + 14); tx(x, B.priceT, money(r.weekly_cents / 100 * B.weeks), W - m - 16, y + 16, 'right'); y += 30; ctaDraw(x, Object.assign({}, S, { cta: Object.assign({}, S.cta, { text: B.pay }) }), W / 2, Math.min(y, HH - S.cta.h - 30), W - 2 * m);
    return; }
}

/* ---------- Shop the post ---------- */
function drawShopPost(x, t, S){
  bgDraw(x, S.bg); const P = S.post, it = item(5), cw = W - P.margin * 2, X0 = P.margin, Y0 = HH * P.y, phh = cw * P.ratio, head = 52, nm = 'Freya';
  const capH = P.capT.size + 24, ph = head + phh + capH; box(x, X0, Y0, cw, ph, P.box);
  if(P.avatar > 0){ const av = img('faces/' + nm + '.jpg'); x.save(); x.beginPath(); x.arc(X0 + 14 + P.avatar / 2, Y0 + head / 2, P.avatar / 2, 0, 7); x.clip(); if(ok(av)) cover(x, av, X0 + 14, Y0 + head / 2 - P.avatar / 2, P.avatar, P.avatar); x.restore(); }
  tx(x, P.nameT, nm, X0 + 14 + P.avatar + (P.avatar ? 10 : 0), Y0 + head / 2 + P.nameT.size * 0.36);
  const py = Y0 + head; x.save(); x.beginPath(); x.rect(X0 + P.box.bw, py, cw - 2 * P.box.bw, phh); x.clip(); x.fillStyle = P.photoBg; x.fillRect(X0, py, cw, phh); if(P.img) cover(x, img(P.img), X0, py, cw, phh); else if(it.img) contain(x, img(it.img), X0, py, cw, phh, 30); x.restore();
  tx(x, P.capT, P.caption, X0 + 14, py + phh + 14 + P.capT.size, 'left', cw - 28);
  // credit tag
  const Cr = S.credit; if(Cr.show){ const s = nm + ' ' + Cr.text, w2 = tw(x, Cr.t, s) + 20, h2 = Cr.t.size + 12; box(x, X0 + 12, py + 12, w2, h2, Cr.box); tx(x, Cr.t, s, X0 + 22, py + 12 + h2 / 2 + Cr.t.size * 0.36); }
  // tag dot
  const Pn = S.pin, px = X0 + cw * Pn.x, pyy = py + phh * Pn.y;
  if(Pn.pulse > 0){ for(let k = 0; k < 2; k++){ const q = (t * Pn.pulseSpeed * 0.8 + k * 0.5) % 1; x.strokeStyle = hexA(Pn.ring, (1 - q) * 0.6 * Math.min(1, Pn.pulse)); x.lineWidth = 2; x.beginPath(); x.arc(px, pyy, Pn.size / 2 + q * Pn.size * 1.6 * Pn.pulse, 0, 7); x.stroke(); } }
  if(Pn.img && ok(img(Pn.img))) x.drawImage(img(Pn.img), px - Pn.size / 2, pyy - Pn.size / 2, Pn.size, Pn.size);
  else { x.fillStyle = Pn.color; x.beginPath(); x.arc(px, pyy, Pn.size / 2, 0, 7); x.fill(); if(Pn.ringW > 0){ x.strokeStyle = Pn.ring; x.lineWidth = Pn.ringW; x.stroke(); } }
  // product card
  const Cd = S.card, Bt = S.btn, phs = Cd.auto ? (t % Cd.every) / Cd.every : 0.5, open = Cd.auto ? clamp(Math.min(phs / 0.08, (Cd.open - phs) / 0.08), 0, 1) : 1;
  if(open > 0){ const w = W * Cd.w, pad = 12, ch = Math.max(Cd.imgSize, Cd.nameT.size + Cd.storeT.size + Cd.priceT.size + 16) + pad * 3 + Bt.h; let cx0, cy0;
    if(Cd.place === 'over'){ cx0 = clamp(px - w / 2, X0 + 8, X0 + cw - w - 8); cy0 = pyy - ch - Pn.size - 8; if(cy0 < py + 8) cy0 = pyy + Pn.size + 8; }
    else if(Cd.place === 'below'){ cx0 = (W - w) / 2; cy0 = py + phh + capH + 10; }
    else { cx0 = (W - w) / 2; cy0 = HH - ch - 20 + (1 - ease(open)) * (ch + 30); }
    x.save(); x.globalAlpha = Cd.place === 'sheet' ? 1 : ease(open); if(Cd.place !== 'sheet'){ const z = 0.85 + 0.15 * ease(open); x.translate(px, pyy); x.scale(z, z); x.translate(-px, -pyy); }
    box(x, cx0, cy0, w, ch, Cd.box);
    if(Cd.imgSize > 0){ x.save(); rr(x, cx0 + pad, cy0 + pad, Cd.imgSize, Cd.imgSize, 10); x.fillStyle = Cd.photoBg; x.fill(); x.clip(); contain(x, img(it.img), cx0 + pad, cy0 + pad, Cd.imgSize, Cd.imgSize, 4); x.restore(); }
    const tx0 = cx0 + pad + (Cd.imgSize > 0 ? Cd.imgSize + 10 : 0), tw0 = w - (tx0 - cx0) - pad; let yy = cy0 + pad + Cd.nameT.size;
    tx(x, Cd.nameT, it.name, tx0, yy, 'left', tw0); yy += Cd.storeT.size + 5; tx(x, Cd.storeT, it.store, tx0, yy, 'left', tw0); yy += Cd.priceT.size + 6; tx(x, Cd.priceT, money(it.price), tx0, yy);
    const by = cy0 + ch - pad - Bt.h; box(x, cx0 + pad, by, w - pad * 2, Bt.h, Bt.box); tx(x, Bt.t, Bt.text, cx0 + w / 2, by + Bt.h / 2 + Bt.t.size * 0.36, 'center', w - pad * 4);
    x.restore(); }
  const Br = S.bar; if(Br.show){ const bw = W * 0.8, by = HH * Br.y - Br.h / 2; box(x, (W - bw) / 2, by, bw, Br.h, Br.box); tx(x, Br.t, Br.text, W / 2, by + Br.h / 2 + Br.t.size * 0.36, 'center', bw - 20); }
}

/* ---------- Flash deals ---------- */
function drawDeals(x, t, S){
  bgDraw(x, S.bg); const L = S.list, T = S.txt;
  const cols = L.layout === 'grid' ? Math.round(L.cols) : 1, top = HH * L.top;
  let cw = (W - L.margin * 2 - (cols - 1) * L.gap) / cols; if(L.layout === 'carousel') cw = W * 0.62;
  const photoH = L.layout === 'list' ? cw * 0.32 * L.ratio : cw * L.ratio, infoH = 12 + T.nameT.size + 6 + T.priceT.size + (T.showStore ? T.storeT.size + 6 : 0) + (S.qty.show ? 18 + S.qty.h : 0) + (S.timer.show && S.timer.place === 'under' ? S.timer.t.size + 16 : 0) + 10;
  const ch = L.layout === 'list' ? Math.max(photoH + 20, infoH) : photoH + infoH;
  const drawCard = (i, X0, Y0) => { const it = item(i * 3 + 2), disc = T.discount, now = it.price * (1 - disc); box(x, X0, Y0, cw, ch, L.card);
    const pw = L.layout === 'list' ? photoH : cw, pX = L.layout === 'list' ? X0 + 10 : X0, pY = L.layout === 'list' ? Y0 + 10 : Y0;
    x.save(); if(L.layout === 'list') rr(x, pX, pY, pw, photoH, 10); else rr(x, X0, Y0, cw, photoH + L.card.radius, Math.min(L.card.radius, cw / 2)); x.clip(); x.fillStyle = L.photoBg; x.fillRect(pX, pY, pw, photoH); if(it.img) contain(x, img(it.img), pX, pY, pw, photoH, L.photoPad); x.restore();
    if(S.off.show){ const s = '-' + Math.round(disc * 100) + '%', bw = tw(x, S.off.t, s) + 14, bh = S.off.t.size + 10, pl = S.off.place, bx = pl[1] === 'l' ? pX + 8 : pX + pw - bw - 8, by = pl[0] === 't' ? pY + 8 : pY + photoH - bh - 8; box(x, bx, by, bw, bh, S.off.box); tx(x, S.off.t, s, bx + bw / 2, by + bh / 2 + S.off.t.size * 0.36, 'center'); }
    const left = Math.max(0, S.timer.hours * 3600 - Math.floor(t) - i * 731), tStr = String(Math.floor(left / 3600)).padStart(2, '0') + ':' + String(Math.floor(left / 60) % 60).padStart(2, '0') + ':' + String(left % 60).padStart(2, '0');
    const timerAt = (bx, by) => { const bw = tw(x, S.timer.t, tStr) + 14, bh = S.timer.t.size + 8; box(x, bx, by, bw, bh, S.timer.box); tx(x, S.timer.t, tStr, bx + bw / 2, by + bh / 2 + S.timer.t.size * 0.36, 'center'); };
    if(S.timer.show && S.timer.place === 'photo'){ const bw = tw(x, S.timer.t, tStr) + 14; timerAt(S.off.place === 'bl' ? pX + pw - bw - 8 : pX + 8, pY + photoH - S.timer.t.size - 16); }
    const ix = L.layout === 'list' ? pX + pw + 12 : X0 + 10, iw = L.layout === 'list' ? cw - (ix - X0) - 10 : cw - 20; let y = (L.layout === 'list' ? Y0 + 4 : Y0 + photoH) + 12 + T.nameT.size;
    tx(x, T.nameT, it.name, ix, y, 'left', iw); if(T.showStore){ y += T.storeT.size + 6; tx(x, T.storeT, it.store, ix, y, 'left', iw); }
    y += T.priceT.size + 6; tx(x, T.priceT, money(now), ix, y); if(T.showOld){ const ow = tw(x, T.priceT, money(now)) + 8, s = money(it.price); tx(x, T.oldT, s, ix + ow, y); const sw = tw(x, T.oldT, s); x.strokeStyle = T.oldT.color; x.lineWidth = 1; x.beginPath(); x.moveTo(ix + ow, y - T.oldT.size * 0.35); x.lineTo(ix + ow + sw, y - T.oldT.size * 0.35); x.stroke(); }
    if(S.timer.show && S.timer.place === 'under'){ y += 8; timerAt(ix, y); y += S.timer.t.size + 8; }
    if(S.qty.show){ const Q = S.qty, leftN = Math.max(1, Math.round(Q.total * (0.15 + 0.7 * ((i * 0.37) % 1)) - (t * 0.05 % 3))); y += 10; x.fillStyle = Q.bg; rr(x, ix, y, iw, Q.h, Q.h / 2); x.fill(); x.fillStyle = Q.fill; rr(x, ix, y, Math.max(Q.h, iw * leftN / Q.total), Q.h, Q.h / 2); x.fill(); y += Q.h + Q.t.size + 3; tx(x, Q.t, leftN + ' ' + Q.label, ix, y); } };
  // header (drawn after the cards so cards scroll under it)
  if(L.layout === 'carousel'){ const off = (t * L.scroll) % (cw + L.gap); for(let i = -1; i < 6; i++) drawCard(i + 1 + Math.floor(t * L.scroll / (cw + L.gap)), L.margin + i * (cw + L.gap) - off, top); for(let i = 0; i < 4; i++) drawCard(i + 20, L.margin + i * ((W - L.margin * 2 - L.gap) / 2 + L.gap), top + ch + 24); }
  else { const rowH = ch + L.gap, rows = 40, sc = (t * L.scroll) % (rowH * 20); x.save(); x.beginPath(); x.rect(0, top, W, HH - top); x.clip(); for(let r = 0; r < rows; r++){ const y = top + r * rowH - sc; if(y > HH || y + ch < top) continue; for(let c = 0; c < cols; c++) drawCard(r * cols + c, L.margin + c * (cw + L.gap), y); } x.restore(); }
  tx(x, S.head.t, S.head.text, W / 2, HH * S.head.y, 'center', W - 30);
  if(S.near.show){ const s = S.near.text + ' · ' + S.near.miles + ' mi', fw = tw(x, S.near.t, s) + 28, fh = S.near.t.size + 14, fy = HH * S.near.y; box(x, (W - fw) / 2, fy, fw, fh, S.near.box); tx(x, S.near.t, s, W / 2, fy + fh / 2 + S.near.t.size * 0.36, 'center'); }
}

/* Shared asteroid navigation is independent of page and Raven settings. */
PAGES.track = { title:'Track', defaults:{ bg:'#020408' }, sections:[{id:'rocks',name:'Rock navigation',sub:'Carvings, motion, debris & stars',groups:[]}], draw:(x)=>{x.fillStyle='#020408';x.fillRect(0,0,W,HH);x.fillStyle='#c7dce5';x.font='600 24px system-ui';x.textAlign='center';x.fillText('Track',W/2,74);x.textAlign='left';} };
for(const P of Object.values(PAGES)){P.sections=P.sections.filter(s=>s.id!=='dock');if(!P.sections.some(s=>s.id==='rocks'))P.sections.push({id:'rocks',name:'Rock navigation',sub:'Carvings, motion, debris & stars',groups:[]});}
const ROCK_NAV = new AsgardRockNav.Navigation({stage:$('#stage'),url:SB.url,key:SB.key,assetBase:STUDIO+'navigation/rocks-v1/',page:'home',shareAvailable:true,onNavigate:openPage});
window.asgardRockNavigation = ROCK_NAV;
/* ======================= STORE PAGE (one design per store) ======================= */
const STORE = { id: new URLSearchParams(location.search).get('store') || '', row: null, items: [], loading: false };
async function loadStore(){
  if(!STORE.id || STORE.loading || STORE.row) return; STORE.loading = true;
  try {
    const r = await fetch(SB.url + '/rest/v1/stores?id=eq.' + STORE.id + '&select=id,name,logo_url,category,address,is_valhalla', { headers: H() });
    if(r.ok){ const j = await r.json(); STORE.row = j[0] || null; }
    const p = await fetch(SB.url + '/rest/v1/products?store_id=eq.' + STORE.id + '&select=name,price,image_url,category&order=section_rank.asc.nullslast,sort_order.asc.nullslast&limit=80', { headers: H() });
    if(p.ok) STORE.items = (await p.json()).map(x => ({ name: x.name, price: +x.price || 0, img: fixUrl(x.image_url), cat: x.category }));
  } catch(e){}
  STORE.loading = false;
}
const docId = (page) => page === 'store' ? 'page_store_' + STORE.id : 'page_' + page;
Object.assign(PAGES, {
  store: {
    title: 'Store page',
    defaults: {
      bg: BG('#0a0b0e'),
      sky: { show: true, height: 0.27, image: 6, custom: '', bright: 0.9, drift: 6, fade: 0.3 },
      streams: { on: true, count: 2, size: 26, speed: 12, faces: true },
      clouds: { on: false, count: 3, speed: 1, size: 1, opacity: 0.6 },
      raven: { on: false, every: 9, size: 46 },
      heimdall: { on: false, every: 14, size: 0.5 },
      head: { logo: 64, round: true, showAddr: true, nameT: TXT(22, '#f2e6cf', { font: 'Cinzel', weight: 800 }), addrT: TXT(11, '#aab3bf', { weight: 500 }) },
      list: { layout: 'grid', cols: 2, margin: 14, gap: 12, ratio: 0.9, scroll: 12, photoBg: '#ffffff', photoPad: 8, card: BOX({ radius: 16 }), nameT: TXT(13, '#f2e6cf', { weight: 600 }), priceT: TXT(16, '#e9c46a', { weight: 800 }) },
    },
    sections: [
      { id:'sky', name:'Sky', sub:'Space, your picture, fade', groups:[
        { name:'Sky strip', ctrls:[K('sky.show','Show the sky'), R('sky.height','How tall',0.1,0.6,.005), R('sky.image','Space picture',1,23,1), U('sky.custom','Your own sky picture'), R('sky.bright','Brightness',0.2,1.6,.01), R('sky.drift','Drift speed',0,40,.5), R('sky.fade','Fade into the page',0,0.6,.01)] },
        { name:'Page background', ctrls: bgC('bg') },
      ]},
      { id:'streams', name:'Live streams', sub:'Black holes over the store', groups:[
        { name:'Black holes', ctrls:[K('streams.on','Show live streams'), R('streams.count','How many',0,4,1), R('streams.size','Size',10,60,1), R('streams.speed','Drift speed',0,60,1), K('streams.faces','Show faces')] },
      ]},
      { id:'events', name:'Clouds & Asgard events', sub:'Clouds, raven, Heimdall', groups:[
        { name:'Clouds', ctrls:[K('clouds.on','Show clouds'), R('clouds.count','How many',0,8,1), R('clouds.speed','Speed',0,4,.01), R('clouds.size','Size',0.3,2.5,.01), R('clouds.opacity','See-through',0,1,.01)] },
        { name:'Raven flies in with a message', ctrls:[K('raven.on','Show it'), R('raven.every','Every (seconds)',3,30,.5), R('raven.size','Size',20,120,1)] },
        { name:'Heimdall rises on a notification', ctrls:[K('heimdall.on','Show it'), R('heimdall.every','Every (seconds)',4,40,.5), R('heimdall.size','Size',0.2,1,.01)] },
      ]},
      { id:'head', name:'Store name & logo', sub:'Header under the sky', groups:[
        { name:'Logo', ctrls:[R('head.logo','Logo size',0,120,1), K('head.round','Round logo'), K('head.showAddr','Show the address')] },
        { name:'Store name', ctrls: txtC('head.nameT','Name') }, { name:'Address', ctrls: txtC('head.addrT','Address') },
      ]},
      { id:'list', name:'Products', sub:'Grid or list of real items', groups:[
        { name:'Layout', ctrls:[Sel('list.layout','Layout',[['grid','Grid'],['list','List (one per row)']]), R('list.cols','Columns (grid)',1,3,1), R('list.margin','Side margin',0,40,1), R('list.gap','Space between',0,40,1), R('list.ratio','Picture height (x width)',0.4,1.5,.01), R('list.scroll','Preview scroll speed',0,60,1), C('list.photoBg','Picture background'), R('list.photoPad','Picture padding',0,40,1), ...boxC('list.card','Card')] },
        { name:'Product name', ctrls: txtC('list.nameT','Name') }, { name:'Price', ctrls: txtC('list.priceT','Price') },
      ]},
    ],
    draw: drawStore,
  },
});
function drawStore(x, t, S){
  loadStore(); bgDraw(x, S.bg); const sk = S.sky, skyH = sk.show ? HH * sk.height : 0, L = S.list, Hd = S.head;
  const st = STORE.row || { name: STORE.id ? 'Loading…' : 'Pick a store on the left', address: '', logo_url: '' };
  // products scroll under the sky
  const cols = L.layout === 'grid' ? Math.round(L.cols) : 1, cw = (W - L.margin * 2 - (cols - 1) * L.gap) / cols;
  const ph = L.layout === 'list' ? cw * 0.28 * L.ratio : cw * L.ratio, info = 14 + L.nameT.size + 8 + L.priceT.size + 10, ch = L.layout === 'list' ? Math.max(ph + 20, info + 6) : ph + info;
  const headH = Math.max(Hd.logo, 30) + 30, top = skyH + headH;
  const n = STORE.items.length, rows = Math.ceil(n / cols), rowH = ch + L.gap, total = Math.max(1, rows * rowH), sc = rows > 3 ? (t * L.scroll) % total : 0;
  x.save(); x.beginPath(); x.rect(0, top, W, HH - top); x.clip();
  for(let rep = 0; rep < 2; rep++) for(let i = 0; i < n; i++){ const r = Math.floor(i / cols), c = i % cols, y = top + 8 + r * rowH - sc + rep * total; if(y > HH || y + ch < top) continue;
    const it = STORE.items[i], X0 = L.margin + c * (cw + L.gap); box(x, X0, y, cw, ch, L.card);
    const pw = L.layout === 'list' ? ph : cw, pX = L.layout === 'list' ? X0 + 10 : X0, pY = L.layout === 'list' ? y + 10 : y;
    x.save(); if(L.layout === 'list') rr(x, pX, pY, pw, ph, 10); else rr(x, X0, y, cw, ph + L.card.radius, Math.min(L.card.radius, cw / 2)); x.clip(); x.fillStyle = L.photoBg; x.fillRect(pX, pY, pw, ph); if(it.img) contain(x, img(it.img), pX, pY, pw, ph, L.photoPad); x.restore();
    const ix = L.layout === 'list' ? pX + pw + 12 : X0 + 10, iw = L.layout === 'list' ? cw - (ix - X0) - 10 : cw - 20; let yy = (L.layout === 'list' ? y + 4 : y + ph) + 12 + L.nameT.size;
    tx(x, L.nameT, it.name, ix, yy, 'left', iw); yy += L.priceT.size + 8; if(it.price) tx(x, L.priceT, money(it.price), ix, yy); }
  if(STORE.id && !n && !STORE.loading) tx(x, TXT(13, '#8a8f98'), 'No products for this store yet', W / 2, top + 60, 'center');
  x.restore();
  // header: logo + name + address
  x.fillStyle = S.bg.color; x.fillRect(0, skyH, W, headH);
  let nx = L.margin; if(Hd.logo > 0 && st.logo_url){ const lg = img(fixUrl(st.logo_url)); x.save(); const ly = skyH + (headH - Hd.logo) / 2; if(Hd.round){ x.beginPath(); x.arc(nx + Hd.logo / 2, ly + Hd.logo / 2, Hd.logo / 2, 0, 7); x.fillStyle = '#fff'; x.fill(); x.clip(); } contain(x, lg, nx, ly, Hd.logo, Hd.logo, Hd.round ? Hd.logo * 0.12 : 0); x.restore(); nx += Hd.logo + 12; }
  tx(x, Hd.nameT, st.name, nx, skyH + headH / 2 + (Hd.showAddr ? -2 : Hd.nameT.size * 0.36), 'left', W - nx - 10);
  if(Hd.showAddr && st.address) tx(x, Hd.addrT, st.address, nx, skyH + headH / 2 + Hd.addrT.size + 6, 'left', W - nx - 10);
  // sky on top
  if(sk.show){ const im = img(sk.custom || bgSrc(sk.image)); x.save(); x.beginPath(); x.rect(0, 0, W, skyH); x.clip(); x.filter = `brightness(${sk.bright})`; if(ok(im)){ const pan = (t * sk.drift) % 200; cover(x, im, -pan * 0.3 - 20, 0, W + 80, skyH); } x.filter = 'none';
    const C2 = S.clouds; if(C2.on) for(let i = 0; i < C2.count; i++){ const ci = img(UI + 'raven_cloud_v20/' + CLOUDS[3 + (i % 3)] + '.webp'); if(!ok(ci)) continue; const cw2 = 150 * C2.size * (0.7 + 0.2 * (i % 3)), chh = cw2 * ci.naturalHeight / ci.naturalWidth, span = W + cw2 * 2; const cx2 = ((t * 9 * C2.speed * (0.6 + i * 0.13) + i * span / Math.max(1, C2.count)) % span) - cw2; x.save(); x.globalAlpha = C2.opacity; x.globalCompositeOperation = 'screen'; x.drawImage(ci, cx2, skyH * (0.15 + 0.5 * ((i * 0.37) % 1)) - chh / 2, cw2, chh); x.restore(); }
    const Sm = S.streams; if(Sm.on) for(let i = 0; i < Sm.count; i++){ const sp = Sm.speed * (0.8 + i * 0.17), r = Sm.size * (0.8 + 0.25 * i) / 2, span = W + r * 6; const hx = W + r * 3 - ((t * sp + i * span / Math.max(1, Sm.count)) % span), hy = skyH * (0.3 + 0.4 * ((i * 0.618) % 1)); drawHole(x, hx, hy, r, Sm.faces ? NAMES[i] : null, t); }
    const Hm = S.heimdall; if(Hm.on){ const man = img(UI + 'heimdall_void_v1.png'), per = Math.max(2, Hm.every), p = (t % per) / per, up = p < 0.15 ? p / 0.15 : p < 0.55 ? 1 : p < 0.7 ? 1 - (p - 0.55) / 0.15 : 0; if(ok(man) && up > 0){ const mh = skyH * 1.6 * Hm.size, mw = mh * man.naturalWidth / man.naturalHeight; x.globalAlpha = 0.9; x.drawImage(man, W * 0.72 - mw / 2, skyH - mh * up * 0.85, mw, mh); x.globalAlpha = 1; } }
    x.restore();
    if(sk.fade > 0){ const g = x.createLinearGradient(0, skyH - skyH * sk.fade, 0, skyH); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, S.bg.color); x.fillStyle = g; x.fillRect(0, skyH - skyH * sk.fade, W, skyH * sk.fade + 1); } }
  const Rv = S.raven; if(Rv.on){ const ic = img(UI + 'raven_v3/ic_raven.webp'), per = Math.max(2, Rv.every), p = (t % per) / per; if(ok(ic) && p < 0.5){ const q = p / 0.5, rx = -Rv.size + (W + Rv.size * 2) * q, ry = HH * 0.18 + Math.sin(q * Math.PI * 3) * 14; x.drawImage(ic, rx, ry, Rv.size, Rv.size); } }
}

/* ======================= STATE / SAVE ======================= */
const STATE = { page: 'home', S: null, sec: null, t0: performance.now() };
const deep = (o) => JSON.parse(JSON.stringify(o));
function merge(d, s){ const o = deep(d); for(const k in (s||{})){ if(s[k] && typeof s[k]==='object' && !Array.isArray(s[k]) && o[k] && typeof o[k]==='object') o[k] = merge(o[k], s[k]); else o[k] = s[k]; } return o; }
const get = (o, p) => p.split('.').reduce((a, k) => a == null ? a : a[k], o);
function set(o, p, v){ const ks = p.split('.'); let a = o; for(let i=0;i<ks.length-1;i++){ a = a[ks[i]] = a[ks[i]] || {}; } a[ks[ks.length-1]] = v; }
const saveTimers = new Map();
const editHistory=new Map();
function rememberPage(){let h=editHistory.get(STATE.page);if(!h){h={items:[deep(STATE.S)],at:0};editHistory.set(STATE.page,h);}const snap=JSON.stringify(STATE.S);if(JSON.stringify(h.items[h.at])!==snap){h.items=h.items.slice(0,h.at+1);h.items.push(deep(STATE.S));if(h.items.length>120)h.items.shift();h.at=h.items.length-1;}}
function save(record=true){ if(record)rememberPage(); const page=STATE.page, snapshot=deep(STATE.S); $('#saveState').textContent = '● Saving…'; clearTimeout(saveTimers.get(page)); saveTimers.set(page, setTimeout(async () => {
  try { localStorage.setItem('asgard-' + docId(page), JSON.stringify(snapshot)); } catch(e){}
  try { const r = await fetch(SB.url + '/rest/v1/studio_designs?on_conflict=id', { method:'POST', headers: H({ 'Content-Type':'application/json', Prefer:'resolution=merge-duplicates,return=minimal' }), body: JSON.stringify({ id: docId(page), page: page, data: snapshot, updated_by:'studio', updated_at: new Date().toISOString() }) });
    $('#saveState').textContent = r.ok ? '● All changes saved' : '● Saved on this computer only'; } catch(e){ $('#saveState').textContent = '● Saved on this computer only'; }
}, 700)); }
async function load(page){
  let s = null;
  try { const r = await fetch(SB.url + '/rest/v1/studio_designs?id=eq.' + docId(page) + '&select=data', { headers: H() }); if(r.ok){ const j = await r.json(); s = j[0] && j[0].data; } } catch(e){}
  if(!s){ try { s = JSON.parse(localStorage.getItem('asgard-' + docId(page)) || 'null'); } catch(e){} }
  if(!s && page === 'convo'){ try { const r = await fetch(SB.url + '/rest/v1/raven_scene_settings?select=*&limit=1', { headers: H() }); if(r.ok){ const j = await r.json(); if(j[0]){ s = j[0]; delete s.id; } } } catch(e){} }
  return merge(PAGES[page].defaults, s || {});
}
async function pushToApp(){
  const S = STATE.S, keys = ['day_speed','night_speed','cloud_speed','cloud_padding','cloud_growth_ms','ground_brightness','cloud_shadow','message_spacing','cloud_variety','ambient_count','ambient_speed','ambient_scale','ambient_opacity','water_shimmer','earth_mode'];
  const body = {}; keys.forEach(k => body[k] = S[k]); body.earth_mode = S.earth && S.earth.night ? 1 : 0;
  try { const r = await fetch(SB.url + '/rest/v1/raven_scene_settings?id=eq.1', { method:'PATCH', headers: H({ 'Content-Type':'application/json', Prefer:'return=representation' }), body: JSON.stringify(body) });
    const j = r.ok ? await r.json() : []; alert(r.ok && j.length ? 'Sent. The app reads these on the conversation screen.' : 'Not sent: the app settings table only accepts signed-in edits. Your settings are saved in the studio.'); } catch(e){ alert('Could not reach the app.'); }
}

/* ======================= UI ======================= */
function nav(){
  const P = PAGES[STATE.page]; const n = $('#secNav'); n.innerHTML = '<div class="cap">THIS PAGE</div>';
  P.sections.forEach(s => { const b = document.createElement('button'); b.className = 'sec' + (STATE.sec === s.id ? ' on' : ''); b.innerHTML = `<i>◆</i><span><b>${s.name}</b><small>${s.sub}</small></span>`; b.onclick = () => { STATE.sec = s.id; { const q=new URLSearchParams(location.search); q.set('page',STATE.page); if(s.id==='rocks') q.set('section','rocks'); else q.delete('section'); history.replaceState(null,'','?'+q.toString()); } nav(); panel(); }; n.appendChild(b); });
  (P.actions || []).forEach(([label, fn]) => { const b = document.createElement('button'); b.className = 'cosmic'; b.innerHTML = `<b>▶ ${label}</b>`; b.onclick = fn; n.appendChild(b); });
  AsgardStudioLayout.setPage(STATE.page); $('#pgTitle').textContent = P.title; $('#docTitle').textContent = P.title; $('#pushBtn').hidden = !P.push;
}
function panel(){
  if(STATE.sec==='rocks'){ROCK_NAV.showEditor($('#panel'));return;}ROCK_NAV.hideEditor();$('#panel').classList.remove('rn-editor');
  const P = PAGES[STATE.page], sec = P.sections.find(s => s.id === STATE.sec) || P.sections[0], pn = $('#panel'); pn.innerHTML = '';
  sec.groups.forEach(g => { const d = document.createElement('details'); d.className = 'pg-grp'; d.open = true; d.innerHTML = `<summary>${g.name}</summary>`;
    g.ctrls.forEach(c => { const v = get(STATE.S, c.k); let el;
      if(c.t === 'r'){ el = document.createElement('div'); el.className = 'pg-row'; el.innerHTML = `<label>${c.label}<em>${fmt(v)}</em></label><input type="range" min="${c.min}" max="${c.max}" step="${c.step}" value="${v}">`;
        const inp = el.querySelector('input'), em = el.querySelector('em'); inp.oninput = () => { const nv = parseFloat(inp.value); set(STATE.S, c.k, nv); em.textContent = fmt(nv); save(); }; }
      else if(c.t === 'k'){ el = document.createElement('label'); el.className = 'pg-chk'; el.innerHTML = `<input type="checkbox" ${v ? 'checked' : ''}> ${c.label}`; el.querySelector('input').onchange = (e) => { set(STATE.S, c.k, e.target.checked); save(); }; }
      else if(c.t === 'c'){ el = document.createElement('div'); el.className = 'pg-row'; el.innerHTML = `<label>${c.label}</label><input type="color" value="${/^#/.test(v) ? v : '#ffffff'}">`; el.querySelector('input').oninput = (e) => { set(STATE.S, c.k, e.target.value); save(); }; }
      else if(c.t === 's'){ el = document.createElement('div'); el.className = 'pg-row'; el.innerHTML = `<label>${c.label}</label><select class="pg-sel">${c.opts.map(([val, lab]) => `<option value="${val}" ${val === v ? 'selected' : ''}>${lab}</option>`).join('')}</select>`; el.querySelector('select').onchange = (e) => { set(STATE.S, c.k, e.target.value); save(); }; }
      else if(c.t === 'x'){ el = document.createElement('div'); el.className = 'pg-row'; el.innerHTML = `<label>${c.label}</label><input type="text" class="pg-sel">`; const ti = el.querySelector('input'); ti.value = v == null ? '' : v; ti.oninput = () => { set(STATE.S, c.k, ti.value); save(); }; }
      else if(c.t === 'u'){ el = document.createElement('div'); el.className = 'pg-row'; el.innerHTML = `<label>${c.label}${v ? ' <em>set</em>' : ''}</label><input type="file" accept="image/*"> ${v ? '<button class="ghost">Clear</button>' : ''}`;
        el.querySelector('input').onchange = async (e) => { const f = e.target.files[0]; if(!f) return; const path = 'uploads/pages/' + Date.now() + '-' + f.name.replace(/[^\w.-]/g, '_');
          try { const r = await fetch(SB.url + '/storage/v1/object/studio/' + path, { method:'POST', headers: H({ 'Content-Type': f.type, 'x-upsert':'true' }), body: f }); if(!r.ok) throw 0; set(STATE.S, c.k, STUDIO + path); } catch(err){ set(STATE.S, c.k, URL.createObjectURL(f)); alert('Upload failed, showing it on this computer only.'); }
          save(); panel(); };
        const cb = el.querySelector('button'); if(cb) cb.onclick = () => { set(STATE.S, c.k, ''); save(); panel(); }; }
      el.querySelectorAll('input,select,textarea').forEach(i=>i.dataset.control=c.k);d.appendChild(el); });
    pn.appendChild(d); });
  AsgardStudioLayout.arrange(pn,STATE.sec);
}
const fmt = (v) => typeof v === 'number' ? (Math.abs(v) >= 10 ? Math.round(v * 10) / 10 : Math.round(v * 1000) / 1000) : v;
async function openPage(page){
  if(page === 'raven'){ location.href = 'index.html'; return; }
  STATE.page = page; STATE.S = null; STATE.sec = new URLSearchParams(location.search).get('section')==='rocks'?'rocks':PAGES[page].sections[0].id; STATE.t0 = performance.now();
  ROCK_NAV.setContext(page,['home','swap','shoppost','deals','share'].includes(page));
  { const q=new URLSearchParams(location.search); q.set('page',page); if(STATE.sec==='rocks') q.set('section','rocks'); else q.delete('section'); if(page!=='store') q.delete('store'); history.replaceState(null,'','?'+q.toString()); } $('#pagePick').value = page;
  const loaded=await load(page);if(STATE.page!==page)return;STATE.S=loaded;editHistory.set(page,{items:[deep(loaded)],at:0});nav();panel();
}
$('#pagePick').onchange = (e) => openPage(e.target.value);
$('#resetBtn').onclick = () => { if(confirm('Put this page back to its starting settings?')){ STATE.S = deep(PAGES[STATE.page].defaults); save(); panel(); } };
$('#pushBtn').onclick = pushToApp;

/* ======================= RENDER LOOP ======================= */
const cv = $('#pgCanvas'), ctx = cv.getContext('2d');
function frame(now){
  const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
  if(r.width > 0 && (cv.width !== Math.round(r.width * dpr) || cv.height !== Math.round(r.height * dpr))){ cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
  if(STATE.S && r.width > 0){ const sc = cv.width / W; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.setTransform(sc, 0, 0, sc, 0, 0);
    try { PAGES[STATE.page].draw(ctx, now / 1000, STATE.S, (now - STATE.t0) / 1000); } catch(e){ console.error(e); } }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ======================= DRAWING ======================= */
function cover(x, im, dx, dy, dw, dh, ox, oy){ if(!ok(im)) return; const ir = im.naturalWidth / im.naturalHeight, r = dw / dh; let sw, sh; if(ir > r){ sh = im.naturalHeight; sw = sh * r; } else { sw = im.naturalWidth; sh = sw / r; } const sx = clamp((im.naturalWidth - sw) * (ox ?? 0.5), 0, im.naturalWidth - sw), sy = clamp((im.naturalHeight - sh) * (oy ?? 0.5), 0, im.naturalHeight - sh); x.drawImage(im, sx, sy, sw, sh, dx, dy, dw, dh); }
function rr(x, X, Y, w, h, r){ x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
const bgSrc = (n) => 'bg/bg' + String(clamp(Math.round(n), 1, 23)).padStart(2, '0') + '.jpg';
const RUNES = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';
const POSTS = [ { n:'Freya', c:'Sunrise over the Flagler pier', i:3, likes:241, com:18, sale:false }, { n:'Loki', c:'Selling my old bike, barely used', i:7, likes:56, com:9, sale:true }, { n:'Baldr', c:'Best tacos in Palm Coast, no contest', i:12, likes:412, com:63, sale:false }, { n:'Hel', c:'Storm rolling in over Bunnell', i:16, likes:98, com:12, sale:false }, { n:'Tyr', c:'Gym is packed today', i:20, likes:33, com:4, sale:false } ];

function drawHole(x, X, Y, r, face, t){ const g = x.createRadialGradient(X, Y, r * 0.9, X, Y, r * 2.6); g.addColorStop(0, 'rgba(0,0,0,.85)'); g.addColorStop(0.35, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.beginPath(); x.arc(X, Y, r * 2.6, 0, 7); x.fill();
  x.strokeStyle = 'rgba(255,240,220,.25)'; x.lineWidth = 1; x.beginPath(); x.arc(X, Y, r * 1.06, 0, 7); x.stroke();
  x.save(); x.beginPath(); x.arc(X, Y, r, 0, 7); x.clip(); x.fillStyle = '#000'; x.fillRect(X - r, Y - r, 2 * r, 2 * r); if(face){ const im = img('faces/' + face + '.jpg'); if(ok(im)){ x.globalAlpha = 0.9; cover(x, im, X - r * 0.8, Y - r * 0.8, r * 1.6, r * 1.6); } } x.restore(); }

function drawHome(x, t, S){
  const sky = S.sky, P = S.post, A = S.act, D = S.dock, skyH = HH * sky.height;
  x.fillStyle = S.bg; x.fillRect(0, 0, W, HH);
  // feed (drawn first, scrolls under the sky)
  const cardW = W - P.margin * 2, imgH = cardW * P.imgRatio, headH = 44, actH = A.place === 'under' ? A.size + 24 : 8, capH = 40, cardH = headH + imgH + actH + capH;
  const total = POSTS.length * (cardH + P.gap), scroll = (t * P.autoScroll) % total;
  for(let k = -1; k < POSTS.length + 1; k++){ const idx = ((k % POSTS.length) + POSTS.length) % POSTS.length, p = POSTS[idx]; let y = skyH + 10 + k * (cardH + P.gap) - scroll; if(y > HH || y + cardH < skyH - cardH) continue;
    const X = P.margin;
    // glow + border (sandstone ruins)
    x.save(); if(P.glow > 0){ x.shadowColor = P.glowColor; x.shadowBlur = 18 * P.glow; } rr(x, X, y, cardW, cardH, P.radius); x.fillStyle = '#0d0b08'; x.fill(); x.restore();
    if(P.border > 0){ x.save(); rr(x, X, y, cardW, cardH, P.radius); x.lineWidth = P.border; x.strokeStyle = P.borderColor; x.stroke(); x.restore(); }
    if(P.runes){ x.save(); rr(x, X, y, cardW, cardH, P.radius); x.clip(); x.fillStyle = P.runeColor; x.globalAlpha = 0.55; x.font = '11px serif'; const off = (t * P.runeSpeed) % 16; for(let rx = X - 16 + off; rx < X + cardW; rx += 16) x.fillText(RUNES[Math.floor(Math.abs(rx * 7 + idx * 3)) % RUNES.length], rx, y + 12); x.restore(); }
    // header
    const av = img('faces/' + p.n + '.jpg'); x.save(); x.beginPath(); x.arc(X + 26, y + 24, 14, 0, 7); x.clip(); if(ok(av)) cover(x, av, X + 12, y + 10, 28, 28); x.restore();
    x.fillStyle = P.nameColor; x.font = `600 ${P.headSize}px system-ui`; x.fillText(p.n, X + 48, y + 29);
    // picture
    const iy = y + headH; x.save(); x.beginPath(); x.rect(X + P.border, iy, cardW - P.border * 2, imgH); x.clip(); cover(x, img(bgSrc(p.i)), X + P.border, iy, cardW - P.border * 2, imgH); x.restore();
    // action icons
    const nS = Math.round(A.slots);
    x.save(); x.textBaseline = 'middle';
    for(let i = 0; i < nS; i++){ let gx, gy; if(A.place === 'side'){ gx = X + cardW - A.size - 12; gy = iy + imgH - 20 - (nS - 1 - i) * (A.size + A.gap); } else { gx = X + 14 + i * (A.size + A.gap + (A.counts ? 18 : 0)); gy = A.place === 'over' ? iy + imgH - A.size * 0.8 : iy + imgH + 12 + A.size / 2; }
      const u = A['icon' + (i + 1)], ic = u ? img(u) : null;
      if(ic && ok(ic)){ x.save(); if(A.glow > 0){ x.shadowColor = A.glowColor; x.shadowBlur = 10 * A.glow; } x.drawImage(ic, gx, gy - A.size / 2, A.size, A.size); x.restore(); }
      else { x.save(); x.setLineDash([3, 3]); x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 1; x.strokeRect(gx + .5, gy - A.size / 2 + .5, A.size - 1, A.size - 1); x.restore(); }
      if(A.counts){ x.fillStyle = A.countColor; x.font = `${A.countSize}px system-ui`; x.fillText('0', gx + A.size + 3, gy); } }
    x.restore();
    x.fillStyle = P.textColor; x.font = `${P.textSize}px system-ui`; x.fillText(p.c, X + 14, y + headH + imgH + actH + 22);
  }
  // sky strip on top
  const im = img(bgSrc(sky.image)); x.save(); x.beginPath(); x.rect(0, 0, W, skyH); x.clip(); x.filter = `brightness(${sky.bright})`; if(ok(im)){ const pan = (t * sky.drift) % 200; cover(x, im, -pan * 0.3 - 20, 0, W + 80, skyH); } x.filter = 'none';
  for(let i = 0; i < sky.holes; i++){ const sp = sky.holeSpeed * (0.8 + i * 0.17), span = W + 160; const hx = W + 80 - ((t * sp + i * span / Math.max(1, sky.holes)) % span), hy = skyH * (0.3 + 0.4 * ((i * 0.618) % 1)); drawHole(x, hx, hy, sky.holeSize * (0.8 + 0.25 * i) / 2, sky.faceShow ? NAMES[i] : null, t); }
  x.restore();
  if(sky.fade > 0){ const g = x.createLinearGradient(0, skyH - skyH * sky.fade, 0, skyH); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, S.bg); x.fillStyle = g; x.fillRect(0, skyH - skyH * sky.fade, W, skyH * sky.fade + 1); }
  // The shared rock navigation draws above this page. Legacy dock values are retained.

}

function drawShare(x, t, S, since){
  const P = S.post, F = S.fig, B = S.btn; x.fillStyle = S.bg; x.fillRect(0, 0, W, HH);
  // the shared post lying back like water
  const pw = W * P.width, ph = pw * 1.2, cx = W / 2, cy = HH * P.y, sy = 1 - P.tilt, im = img(bgSrc(3));
  x.save(); x.translate(cx, cy); x.scale(1, sy); x.globalAlpha = 1; if(ok(im)) cover(x, im, -pw / 2, -ph / 2, pw, ph); x.fillStyle = `rgba(0,0,0,${P.dim})`; x.fillRect(-pw / 2, -ph / 2, pw, ph);
  // ripples spreading where they came out
  if(P.ripple > 0){ x.strokeStyle = 'rgba(220,235,255,.5)'; for(let k = 0; k < 4; k++){ const ph2 = ((t * P.rippleSpeed * 0.35 + k / 4) % 1); x.globalAlpha = (1 - ph2) * 0.5 * P.ripple; x.lineWidth = 2; x.beginPath(); x.ellipse(0, 0, pw * 0.5 * ph2, pw * 0.5 * ph2, 0, 0, 7); x.stroke(); } }
  x.restore();
  // six favs: swing / still / spin mix, spaced so none block each other
  const modes = []; for(let i = 0; i < F.spin; i++) modes.push('spin'); for(let i = 0; i < F.swing; i++) modes.push('swing'); for(let i = 0; i < F.still; i++) modes.push('still');
  const surf = cy, rise = clamp(since / Math.max(0.2, F.emerge), 0, 1), e = 1 - Math.pow(1 - rise, 3);
  const slots = [[0.18, 0.55], [0.5, 0.2], [0.82, 0.6], [0.32, 0.95], [0.68, 0.9], [0.5, 0.65]];
  let spinUsed = 0;
  FAVS.forEach(([id, name], i) => { let mode = modes[i] || 'still'; if(mode === 'spin'){ if(SPINS[id] && spinUsed < F.spin){ spinUsed++; } else mode = 'swing'; }
    const fw = 92 * F.size, fh = fw * 2, sx2 = W * (0.5 + (slots[i][0] - 0.5) * F.spread), baseY = HH * (F.top + F.band * slots[i][1]) + fh;
    const y = surf + (baseY - surf) * e; // rises out of the post surface
    let src, frames, fr;
    if(mode === 'spin'){ src = 'pages/figs/s' + id + '.webp'; frames = 48; fr = Math.floor(((t * F.spinSpeed) % 1) * 48); }
    else { src = 'pages/figs/p' + id + '.webp'; frames = 25; const mid = 12, amp = 12 * (F.swingDeg / 60); fr = mode === 'still' ? mid : Math.round(mid + amp * Math.sin(t * F.swingSpeed * 2 + i)); }
    const im2 = img(src); if(!ok(im2)) return; const fwS = im2.naturalWidth / frames;
    x.save(); x.beginPath(); x.rect(0, 0, W, surf + 2); x.clip(); // only above the water line while coming out
    x.translate(sx2, y); x.transform(1, 0, -F.lean * 0.6, 1 - F.lean * 0.3, 0, 0);
    x.globalAlpha = 1 - F.flicker * (0.5 + 0.5 * Math.sin(t * 23 + i * 7)) * (Math.random() < 0.1 ? 1 : 0.3);
    if(F.glow > 0){ x.shadowColor = 'rgba(120,220,255,.9)'; x.shadowBlur = 20 * F.glow; }
    x.drawImage(im2, clamp(fr, 0, frames - 1) * fwS, 0, fwS, im2.naturalHeight, -fw / 2, -fh, fw, fh); x.restore();
    if(F.names && rise >= 1){ x.fillStyle = F.nameColor; x.font = '600 12px system-ui'; x.textAlign = 'center'; x.fillText(name, sx2, y + 14); x.textAlign = 'left'; } });
  if(B.show){ const labels = ['Loose the Ravens', 'Mead Hall', 'Return'], by = HH * B.y; x.font = `600 ${B.size}px system-ui`; const ws = labels.map(l => x.measureText(l).width + 26), tw = ws.reduce((a, b) => a + b, 0) + 16; let bx = (W - tw) / 2;
    labels.forEach((l, i) => { rr(x, bx, by - B.size - 8, ws[i], B.size + 18, 10); x.fillStyle = B.fill; x.fill(); x.strokeStyle = B.color; x.lineWidth = 1; x.stroke(); x.fillStyle = B.color; x.fillText(l, bx + 13, by + 2); bx += ws[i] + 8; }); }
}

const MSGS = [ ['peer', 'Hey, you still coming tonight?'], ['mine', 'Yeah! Leaving in 20'], ['peer', 'Bring the speaker'], ['mine', 'Already in the car'], ['peer', 'Perfect, see you soon'], ['mine', 'On my way'] ];
const CLOUDS = ['cloud-mine-billows-v27', 'cloud-peer-billows-v27', 'message-cloud', 'cloud-billows-166852-v29', 'cloud-anvil-258398-v29', 'cloud-tower-365034-v29'];
function drawConvo(x, t, S){
  const E = S.earth, M = S.msg, Hd = S.head, hz = HH * E.horizon;
  // sky
  const g = x.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, E.night ? '#05070d' : E.skyTop); g.addColorStop(1, E.night ? '#1a2333' : E.skyLow); x.fillStyle = g; x.fillRect(0, 0, W, hz + 2);
  // ground laid nearly flat: draw the earth video in horizontal strips that shrink toward the horizon
  const src = E.night ? null : vid(EARTH + 'earth-' + E.pick + '-continuous-v34.mp4');
  if(src){ src.playbackRate = clamp(S.day_speed / 8, 0.1, 4); if(src.paused) src.play().catch(()=>{}); }
  const cityIm = E.night ? img(UI + 'raven_cloud_v20/' + E.city + '.webp') : null;
  const sw = src ? src.videoWidth : (cityIm && ok(cityIm) ? cityIm.naturalWidth : 0), sh = src ? src.videoHeight : (cityIm && ok(cityIm) ? cityIm.naturalHeight : 0);
  const srcEl = src && src.readyState >= 2 ? src : (cityIm && ok(cityIm) ? cityIm : null);
  if(srcEl && sw){ const rows = 70, gh = HH - hz, nightPan = E.night ? (t * S.night_speed * 0.6) % (sh * 0.5) : 0; x.save(); x.filter = `brightness(${S.ground_brightness})`;
    for(let k = 0; k < rows; k++){ const a = k / rows, b = (k + 1) / rows; const da = Math.pow(a, 1 + E.tilt * 2.2), db = Math.pow(b, 1 + E.tilt * 2.2);
      const y0 = hz + gh * da, y1 = hz + gh * db, widen = 1 + (1 - a) * E.tilt * 2.4, dw = W * widen; const sy0 = sh * 0.05 + (sh * 0.9) * a * 0.999 + nightPan * 0, sh0 = (sh * 0.9) / rows;
      x.drawImage(srcEl, 0, (sy0 + nightPan) % (sh - sh0), sw, sh0, (W - dw) / 2, y0, dw, Math.max(1, y1 - y0 + 0.6)); }
    x.restore(); }
  // haze at the horizon
  if(E.haze > 0){ const hg = x.createLinearGradient(0, hz - 30, 0, hz + 140); hg.addColorStop(0, 'rgba(0,0,0,0)'); hg.addColorStop(0.25, E.night ? `rgba(30,40,60,${E.haze})` : `rgba(220,232,242,${E.haze})`); hg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = hg; x.fillRect(0, hz - 30, W, 170); }
  // background clouds
  for(let i = 0; i < S.ambient_count; i++){ const ci = img(UI + 'raven_cloud_v20/' + CLOUDS[3 + (i % 3)] + '.webp'); if(!ok(ci)) continue; const cw = 170 * S.ambient_scale * (0.7 + 0.2 * (i % 3)), ch = cw * ci.naturalHeight / ci.naturalWidth, span = W + cw * 2;
    const cx2 = ((t * 9 * S.ambient_speed * (0.6 + i * 0.13) + i * span / Math.max(1, S.ambient_count)) % span) - cw, cy2 = hz - 40 - (i * 53) % (hz * 0.6);
    x.save(); x.globalAlpha = S.ambient_opacity; x.globalCompositeOperation = 'screen'; x.drawImage(ci, cx2, cy2, cw, ch); x.restore(); }
  // message clouds, newest at the bottom, each puffing up as it arrives
  const per = Math.max(0.5, M.newEvery), n = Math.floor(t / per), shown = Math.min(MSGS.length, 3 + (n % (MSGS.length - 2)));
  let yy = HH - 120; x.font = `600 ${M.text}px system-ui`; x.textAlign = 'center'; x.textBaseline = 'middle';
  for(let k = shown - 1; k >= 0; k--){ const [who, txt] = MSGS[k], isNew = k === shown - 1, age = isNew ? (t % per) * 1000 : 99999, grow = clamp(age / S.cloud_growth_ms, 0, 1), gs = 0.3 + 0.7 * (1 - Math.pow(1 - grow, 3));
    const tw = x.measureText(txt).width, cw = (tw + S.cloud_padding * 4) * M.size, cl = img(UI + 'raven_cloud_v20/' + (S.cloud_variety > 0.5 && k % 3 === 2 ? CLOUDS[2] : (who === 'mine' ? CLOUDS[0] : CLOUDS[1])) + '.webp');
    if(!ok(cl)) continue; const ch = cw * cl.naturalHeight / cl.naturalWidth * 0.75, cx3 = W * (who === 'mine' ? M.mineX : M.peerX) + Math.sin(t * 0.6 * M.sway + k) * 6 * M.sway, cy3 = yy - ch / 2 + Math.sin(t * S.cloud_speed + k * 1.7) * 2;
    if(S.cloud_shadow > 0){ x.save(); x.fillStyle = `rgba(0,0,0,${0.35 * S.cloud_shadow})`; x.filter = 'blur(8px)'; x.beginPath(); x.ellipse(cx3 + 30, Math.min(HH - 10, cy3 + ch * 0.9 + 40), cw * 0.35 * gs, ch * 0.12 * gs, 0, 0, 7); x.fill(); x.restore(); }
    x.save(); x.translate(cx3, cy3); x.scale(gs * (1 + Math.sin(t * S.cloud_speed * 1.3 + k) * 0.015), gs); x.globalAlpha = M.opacity; x.drawImage(cl, -cw / 2, -ch / 2, cw, ch); x.globalAlpha = 1; x.fillStyle = M.textColor; if(grow > 0.6) x.fillText(txt, 0, 2); x.restore();
    yy -= ch + S.message_spacing; if(yy < HH * 0.2) break; }
  x.textAlign = 'left'; x.textBaseline = 'alphabetic';
  // the person on top
  if(Hd.show){ const bu = img('busts/Freya.webp'); if(ok(bu)){ const fw = bu.naturalWidth / 11, bw = 110 * Hd.size, bh = bw * bu.naturalHeight / fw; x.drawImage(bu, 5 * fw, 0, fw, bu.naturalHeight, W / 2 - bw / 2, HH * Hd.y, bw, bh);
    x.fillStyle = Hd.nameColor; x.font = `700 ${Hd.nameSize}px system-ui`; x.textAlign = 'center'; x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 6; x.fillText('Freya', W / 2, HH * Hd.y + bh + Hd.nameSize + 4); x.shadowBlur = 0; x.textAlign = 'left'; } }
}

function drawHeimdall(x, t, S, since){
  const Sp = S.space, Mo = S.moon, Mn = S.man;
  const sp = img(UI + 'heimdall/space_' + String(clamp(Math.round(Sp.image), 1, 16)).padStart(2, '0') + '.jpg');
  x.fillStyle = '#000'; x.fillRect(0, 0, W, HH);
  if(ok(sp)){ x.save(); x.filter = `brightness(${Sp.bright})`; const z = Sp.zoom + Math.sin(t * 0.07) * 0.04 * Sp.bend, pan = Math.sin(t * 0.05 * Sp.drift) * 30; x.translate(W / 2 + pan, HH / 2); x.rotate(Math.sin(t * 0.03) * 0.03 * Sp.bend); x.scale(z, z); cover(x, sp, -W / 2, -HH / 2, W, HH); x.restore(); }
  const rise = clamp(since / Math.max(0.2, Mn.rise), 0, 1), e = 1 - Math.pow(1 - rise, 3);
  const man = img(UI + 'heimdall_void_v1.png'), horn = img(UI + 'heimdall_horn_v2.png'), mh = HH * 0.62 * Mn.size, mw = ok(man) ? mh * man.naturalWidth / man.naturalHeight : 0, my = HH * Mn.y + (1 - e) * mh * 0.9;
  const moon = img(UI + 'heimdall_moon_v1.jpg'); const moonY = HH * Mo.y;
  // Heimdall stands behind the moon's horizon and rises up on a notification
  if(ok(man)){ x.save(); x.beginPath(); x.rect(0, 0, W, moonY + 4); x.clip(); x.drawImage(man, W * Mn.x - mw / 2, my - mh / 2, mw, mh);
    if(ok(horn)){ x.globalCompositeOperation = 'lighter'; x.globalAlpha = Math.min(1, Mn.horn); x.shadowColor = Mn.hornColor; x.shadowBlur = 24 * Mn.hornGlow; const hh = mh * Mn.hornSize, hw = hh * horn.naturalWidth / horn.naturalHeight; x.drawImage(horn, W * Mn.x + mw * Mn.hornX - hw / 2, my + mh * Mn.hornY - hh / 2, hw, hh); } x.restore(); }
  if(ok(moon)){ const mwid = W * Mo.size; x.save(); x.filter = `brightness(${Mo.bright})`; x.beginPath(); x.ellipse(W / 2, moonY + mwid * 0.42, mwid / 2, mwid * 0.42, 0, Math.PI, 2 * Math.PI); x.lineTo(W, HH); x.lineTo(0, HH); x.closePath(); x.clip(); cover(x, moon, W / 2 - mwid / 2, moonY, mwid, mwid * 0.84); x.fillStyle = '#000'; x.fillRect(0, moonY + mwid * 0.84, W, HH); x.restore(); }
}

async function savePageNow(){
 if(ROCK_NAV.edits.size||ROCK_NAV.saving)await AsgardStudioLayout.saveNavigation(ROCK_NAV);
 if(!STATE.S)return;const page=STATE.page,snapshot=deep(STATE.S);clearTimeout(saveTimers.get(page));rememberPage();
 localStorage.setItem('asgard-'+docId(page),JSON.stringify(snapshot));
 const r=await fetch(SB.url+'/rest/v1/studio_designs?on_conflict=id',{method:'POST',headers:H({'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'}),body:JSON.stringify({id:docId(page),page,data:snapshot,updated_by:'studio',updated_at:new Date().toISOString()})});
 $('#saveState').textContent=r.ok?'● All changes saved':'● Shared save failed';if(!r.ok)throw Error('Save failed');
}
AsgardStudioLayout.mount({kind:'pages',page:new URLSearchParams(location.search).get('page')||'home',openPage,beforePage:savePageNow,save:savePageNow,undo:()=>{if(STATE.sec==='rocks'){const prev=ROCK_NAV.history.pop();if(prev){ROCK_NAV.future.push(deep(ROCK_NAV.S));ROCK_NAV.applyState(prev);}return;}const h=editHistory.get(STATE.page);if(h?.at>0){STATE.S=deep(h.items[--h.at]);save(false);panel();}},preview:()=>{STATE.t0=performance.now();}});
/* ---------- start ---------- */
const start = new URLSearchParams(location.search).get('page');
openPage(PAGES[start] ? start : 'home');
})();

