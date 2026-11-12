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

/* ======================= STATE / SAVE ======================= */
const STATE = { page: 'home', S: null, sec: null, t0: performance.now() };
const deep = (o) => JSON.parse(JSON.stringify(o));
function merge(d, s){ const o = deep(d); for(const k in (s||{})){ if(s[k] && typeof s[k]==='object' && !Array.isArray(s[k]) && o[k] && typeof o[k]==='object') o[k] = merge(o[k], s[k]); else o[k] = s[k]; } return o; }
const get = (o, p) => p.split('.').reduce((a, k) => a == null ? a : a[k], o);
function set(o, p, v){ const ks = p.split('.'); let a = o; for(let i=0;i<ks.length-1;i++){ a = a[ks[i]] = a[ks[i]] || {}; } a[ks[ks.length-1]] = v; }
let saveT = null;
function save(){ $('#saveState').textContent = '● Saving…'; clearTimeout(saveT); saveT = setTimeout(async () => {
  try { localStorage.setItem('asgard-page-' + STATE.page, JSON.stringify(STATE.S)); } catch(e){}
  try { const r = await fetch(SB.url + '/rest/v1/studio_designs?on_conflict=id', { method:'POST', headers: H({ 'Content-Type':'application/json', Prefer:'resolution=merge-duplicates,return=minimal' }), body: JSON.stringify({ id:'page_' + STATE.page, page: STATE.page, data: STATE.S, updated_by:'studio', updated_at: new Date().toISOString() }) });
    $('#saveState').textContent = r.ok ? '● All changes saved' : '● Saved on this computer only'; } catch(e){ $('#saveState').textContent = '● Saved on this computer only'; }
}, 700); }
async function load(page){
  let s = null;
  try { const r = await fetch(SB.url + '/rest/v1/studio_designs?id=eq.page_' + page + '&select=data', { headers: H() }); if(r.ok){ const j = await r.json(); s = j[0] && j[0].data; } } catch(e){}
  if(!s){ try { s = JSON.parse(localStorage.getItem('asgard-page-' + page) || 'null'); } catch(e){} }
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
  P.sections.forEach(s => { const b = document.createElement('button'); b.className = 'sec' + (STATE.sec === s.id ? ' on' : ''); b.innerHTML = `<i>◆</i><span><b>${s.name}</b><small>${s.sub}</small></span>`; b.onclick = () => { STATE.sec = s.id; nav(); panel(); }; n.appendChild(b); });
  (P.actions || []).forEach(([label, fn]) => { const b = document.createElement('button'); b.className = 'cosmic'; b.innerHTML = `<b>▶ ${label}</b>`; b.onclick = fn; n.appendChild(b); });
  $('#pgTitle').textContent = P.title; $('#docTitle').textContent = P.title; $('#pushBtn').hidden = !P.push;
}
function panel(){
  const P = PAGES[STATE.page], sec = P.sections.find(s => s.id === STATE.sec) || P.sections[0], pn = $('#panel'); pn.innerHTML = '';
  sec.groups.forEach(g => { const d = document.createElement('details'); d.className = 'pg-grp'; d.open = true; d.innerHTML = `<summary>${g.name}</summary>`;
    g.ctrls.forEach(c => { const v = get(STATE.S, c.k); let el;
      if(c.t === 'r'){ el = document.createElement('div'); el.className = 'pg-row'; el.innerHTML = `<label>${c.label}<em>${fmt(v)}</em></label><input type="range" min="${c.min}" max="${c.max}" step="${c.step}" value="${v}">`;
        const inp = el.querySelector('input'), em = el.querySelector('em'); inp.oninput = () => { const nv = parseFloat(inp.value); set(STATE.S, c.k, nv); em.textContent = fmt(nv); save(); }; }
      else if(c.t === 'k'){ el = document.createElement('label'); el.className = 'pg-chk'; el.innerHTML = `<input type="checkbox" ${v ? 'checked' : ''}> ${c.label}`; el.querySelector('input').onchange = (e) => { set(STATE.S, c.k, e.target.checked); save(); }; }
      else if(c.t === 'c'){ el = document.createElement('div'); el.className = 'pg-row'; el.innerHTML = `<label>${c.label}</label><input type="color" value="${/^#/.test(v) ? v : '#ffffff'}">`; el.querySelector('input').oninput = (e) => { set(STATE.S, c.k, e.target.value); save(); }; }
      else if(c.t === 's'){ el = document.createElement('div'); el.className = 'pg-row'; el.innerHTML = `<label>${c.label}</label><select class="pg-sel">${c.opts.map(([val, lab]) => `<option value="${val}" ${val === v ? 'selected' : ''}>${lab}</option>`).join('')}</select>`; el.querySelector('select').onchange = (e) => { set(STATE.S, c.k, e.target.value); save(); }; }
      else if(c.t === 'u'){ el = document.createElement('div'); el.className = 'pg-row'; el.innerHTML = `<label>${c.label}${v ? ' <em>set</em>' : ''}</label><input type="file" accept="image/*"> ${v ? '<button class="ghost">Clear</button>' : ''}`;
        el.querySelector('input').onchange = async (e) => { const f = e.target.files[0]; if(!f) return; const path = 'icons/' + Date.now() + '-' + f.name.replace(/[^\w.-]/g, '_');
          try { const r = await fetch(SB.url + '/storage/v1/object/studio/' + path, { method:'POST', headers: H({ 'Content-Type': f.type, 'x-upsert':'true' }), body: f }); if(!r.ok) throw 0; set(STATE.S, c.k, STUDIO + path); } catch(err){ set(STATE.S, c.k, URL.createObjectURL(f)); alert('Upload failed, showing it on this computer only.'); }
          save(); panel(); };
        const cb = el.querySelector('button'); if(cb) cb.onclick = () => { set(STATE.S, c.k, ''); save(); panel(); }; }
      d.appendChild(el); });
    pn.appendChild(d); });
}
const fmt = (v) => typeof v === 'number' ? (Math.abs(v) >= 10 ? Math.round(v * 10) / 10 : Math.round(v * 1000) / 1000) : v;
async function openPage(page){
  if(page === 'raven'){ location.href = 'index.html'; return; }
  STATE.page = page; STATE.sec = PAGES[page].sections[0].id; STATE.t0 = performance.now();
  history.replaceState(null, '', '?page=' + page); $('#pagePick').value = page;
  STATE.S = await load(page); nav(); panel();
}
$('#pagePick').onchange = (e) => openPage(e.target.value);
$('#resetBtn').onclick = () => { if(confirm('Put this page back to its starting settings?')){ STATE.S = deep(PAGES[STATE.page].defaults); save(); panel(); } };
$('#pushBtn').onclick = pushToApp;

/* ======================= RENDER LOOP ======================= */
const cv = $('#pgCanvas'), ctx = cv.getContext('2d');
function frame(now){
  const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
  if(r.width > 0 && (cv.width !== Math.round(r.width * dpr) || cv.height !== Math.round(r.height * dpr))){ cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
  if(STATE.S && r.width > 0){ const sc = cv.width / W; ctx.setTransform(sc, 0, 0, sc, 0, 0); ctx.clearRect(0, 0, W, HH);
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
  // floating icons with shadows cast on the post
  const icons = ['ic_wayfinder', 'ic_feather', 'ic_horn', 'ic_raven'], tw = icons.length * D.size + (icons.length - 1) * D.gap, y0 = HH * D.y - D.size / 2;
  icons.forEach((n, i) => { const ix = (W - tw) / 2 + i * (D.size + D.gap), bob = Math.sin(t * 1.4 + i) * 3 * D.spin, ic = img(UI + 'raven_v3/' + n + '.webp'); if(!ok(ic)) return;
    x.save(); x.shadowColor = `rgba(0,0,0,${D.shadow})`; x.shadowBlur = D.shadowBlur; x.shadowOffsetY = D.shadowY; x.drawImage(ic, ix, y0 + bob, D.size, D.size); x.restore(); });
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

/* ---------- start ---------- */
const start = new URLSearchParams(location.search).get('page');
openPage(PAGES[start] ? start : 'home');
})();
