/* Asgard Studio — Pages: one studio for every Asgard page (home, share, conversation, Heimdall).
   Settings save to the shared Supabase (table studio_designs, id "page_<name>"), so Danny, Claude and ChatGPT see the same thing. */
(() => {
'use strict';
// The approved player supplies its immutable envelope before this file runs.
// It never falls back to editable drafts or the editor's local browser state.
const RUNTIME = window.AsgardRuntime || null;
const RUNTIME_PREVIEW = !!(RUNTIME && RUNTIME.preview === true);
let runtimeContext = {}, runtimePaused = false, runtimePauseAt = 0, runtimePauseOffset = 0, runtimeStopped = false, runtimeFrame = null;
const runtimeHits = [], runtimeAssetRefs = new Set(), runtimeDataAssets = new Set();
function allowDataAssets(urls){const assets=[];for(const value of urls){if(typeof value!=='string'||!value)continue;for(const url of [value,fixUrl(value)]){runtimeDataAssets.add(url);assets.push(url);}}RUNTIME?.allowDataAssets?.(assets);}
function runtimeAsset(src){if(!src)return src;if(!runtimeDataAssets.has(src))runtimeAssetRefs.add(src);return RUNTIME?.resolveAsset?RUNTIME.resolveAsset(src):src;}
const BROWSE_TYPES = ['grocery','fast_food','restaurant','retail','valhalla'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const runtimeEmit = (type,payload={}) => { if(RUNTIME) RUNTIME.emit(type,payload); };
function hit(x,y,w,h,action){runtimeHits.push({x,y,w,h,action});}
function runtimeAction(action){
 if(!RUNTIME || !action || typeof action !== 'object') return;
 if(action.type==='navigate' && ['raven','home','shome','store','browse','convo','share','heimdall','track','swap','ads','shoppost','deals'].includes(action.target)){
  if(action.target==='store'&&!UUID.test(action.storeId||''))return;
  if(action.target==='browse'&&action.pageType&&!BROWSE_TYPES.includes(action.pageType))return;
  runtimeEmit('navigate',{target:action.target,...(action.target==='store'?{storeId:action.storeId}:{}),...(action.target==='browse'?{pageType:action.pageType||'grocery'}:{})});
 }else if(action.type==='product'&&UUID.test(action.productId||'')&&UUID.test(action.storeId||''))runtimeEmit('product',{productId:action.productId,storeId:action.storeId});
 else if(action.type==='contact'&&typeof action.contactId==='string'&&action.contactId.length>0&&action.contactId.length<=128)runtimeEmit('contact',{contactId:action.contactId});
}

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
const EARTH_VIDEOS = ['v34/earth-changing-landscapes-continuous-v34.mp4','v34/earth-close-farmland-continuous-v34.mp4','v34/earth-farmland-continuous-v34.mp4','v34/earth-forest-river-continuous-v34.mp4','v34/earth-green-rivers-continuous-v34.mp4','v34/earth-ice-fjords-continuous-v34.mp4','v34/earth-japan-continuous-v34.mp4','v34/earth-river-plains-continuous-v34.mp4','v34/earth-terrain-continuous-v34.mp4','v34/earth-woodlands-continuous-v34.mp4','v32/earth-egypt-rigid-v32.mp4','v32/earth-florida-rigid-v32.mp4','v32/earth-green-valleys-rigid-v32.mp4','v32/earth-san-francisco-rigid-v32.mp4','v29/earth-changing-landscapes-v29.mp4','v29/earth-close-farmland-v29.mp4','v29/earth-egypt-v29.mp4','v29/earth-farmland-v29.mp4','v29/earth-florida-v29.mp4','v29/earth-forest-river-v29.mp4','v29/earth-green-rivers-v29.mp4','v29/earth-green-valleys-v29.mp4','v29/earth-ice-fjords-v29.mp4','v29/earth-japan-v29.mp4','v29/earth-river-plains-v29.mp4','v29/earth-san-francisco-v29.mp4','v29/earth-terrain-v29.mp4','v29/earth-woodlands-v29.mp4'];
const CLOUD_FILMS = ['cloud-mine-billows-v27','cloud-peer-billows-v27','message-cloud','cloud-mine-video-v26','cloud-peer-video-v26','cloud-mine-video-v24','cloud-peer-video-v24','cloud-billows-166852-v29','cloud-anvil-258398-v29','cloud-tower-365034-v29'];
const RAVEN_CLIPS = [['San Francisco','v32/earth-san-francisco-rigid-v32.mp4',.2],['Egypt','v32/earth-egypt-rigid-v32.mp4',.2],['Japan','v34/earth-japan-continuous-v34.mp4',.2],['Coast and green valleys','v32/earth-green-valleys-rigid-v32.mp4',.2],['Florida coast','v32/earth-florida-rigid-v32.mp4',.2],['Terrain','v34/earth-terrain-continuous-v34.mp4',.4],['River plains','v34/earth-river-plains-continuous-v34.mp4',.4],['Woodlands','v34/earth-woodlands-continuous-v34.mp4',.4],['Forest river','v34/earth-forest-river-continuous-v34.mp4',.4],['Changing landscapes','v34/earth-changing-landscapes-continuous-v34.mp4',.4],['Green rivers','v34/earth-green-rivers-continuous-v34.mp4',.4],['Farmland','v34/earth-farmland-continuous-v34.mp4',.4],['Close farmland','v34/earth-close-farmland-continuous-v34.mp4',.4],['Ice and fjords','v34/earth-ice-fjords-continuous-v34.mp4',.4]];
const CLOUD_ART = ['cloud-mine-billows-v27','cloud-peer-billows-v27','message-cloud','cloud-billows-166852-v29','cloud-anvil-258398-v29','cloud-tower-365034-v29','cloud-mine-video-v24','cloud-mine-video-v26','cloud-peer-video-v24','cloud-peer-video-v26'].map(n => SB.url + '/storage/v1/object/public/asgard_ui/raven_cloud_v20/' + n + '.webp');
const G = (k, label, items) => ({ t:'g', k, label, items });
const earthNow = (E, t) => { const L = (Array.isArray(E.list) ? E.list : []).filter(Boolean); if(!L.length) return E.pick; if(E.order === 'one') return L[0]; const k = Math.floor(Math.max(0, t) / Math.max(1, +E.each || 20)); let seq = L.slice(); if(E.order === 'reverse') seq.reverse(); if(E.order === 'shuffle'){ let s = (Math.floor(k / seq.length) + 1) * 9301; seq = seq.map(p => [p, (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648]).sort((a, b) => a[1] - b[1]).map(a => a[0]); } return seq[k % seq.length]; };
const earthSrc = p => String(p||'').includes('/') ? SB.url + '/storage/v1/object/public/raven_earth/' + p : EARTH + 'earth-' + p + '-continuous-v34.mp4';
const EARTHS = ['changing-landscapes','close-farmland','farmland','forest-river','green-rivers','ice-fjords','japan','river-plains','terrain','woodlands'];

/* ---------- images / video cache ---------- */
const IMG = {};
function img(src){ if(SharedStudioMedia.kind(src)==='video')return vid(src); src=runtimeAsset(src); if(!IMG[src]){ const i = new Image(); i.crossOrigin='anonymous'; i.src = src; IMG[src] = i; } return IMG[src]; }
const ok = (i) => i && (i.tagName==='VIDEO'?i.readyState>=2&&i.videoWidth>0:i.complete&&i.naturalWidth>0);
const VID = {};
function vid(src){ src=runtimeAsset(src); if(!VID[src]){ const v = document.createElement('video'); v.crossOrigin='anonymous'; v.muted=true; v.loop=true; v.playsInline=true; v.src=src; if(!runtimePaused)v.play().catch(()=>{}); VID[src]=v; } return VID[src]; }

/* ---------- control helpers ---------- */
const R = (k, label, min, max, step) => ({ t:'r', k, label, min, max, step });
const K = (k, label) => ({ t:'k', k, label });
const C = (k, label) => ({ t:'c', k, label });
const Sel = (k, label, opts) => ({ t:'s', k, label, opts });
const U = (k, label, accept='image/*') => ({ t:'u', k, label, accept });
const M = (k,label)=>({t:'m',k,label});
const SHARED_MEDIA = SharedStudioMedia.create({url:SB.url,headers:H});

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
    title: 'Messages (your real Raven conversation screen)',
    defaults: {
      // the 15 values the app reads live from raven_scene_settings, same defaults and limits as AsgardRaven
      day_speed: 8, night_speed: 24, cloud_speed: 1, cloud_padding: 18, cloud_growth_ms: 250, ground_brightness: 1, cloud_shadow: 0.3, message_spacing: 14, cloud_variety: 0.85, ambient_count: 3, ambient_speed: 1, ambient_scale: 1, ambient_opacity: 0.55, water_shimmer: 0.5, earth_mode: 0,
      // the app's map playlist (_rvEarthClips): same 14 maps, same order, same per-map speed
      earth: { clips: RAVEN_CLIPS.map(c => ({ p: c[1], name: c[0], speed: c[2] })), night: false, paused:false, pauseDrift:false, playback:'forward', driftAngle:135, driftSpeed:0, driftDistance:80, driftMode:'bounce', x:0, y:0, zoom:1, rotate:0, flipX:false, flipY:false, contrast:1, saturation:1, hue:0, blur:0, joinBlend:.4, dragToPan:false },
      preview: { name: 'Freya', messages: 6, draft: 'Bring the big speaker and the cooler, we are staying at the beach until the fireworks start tonight' },
      fx: { mineFilm: 'cloud-mine-billows-v27', peerFilm: 'cloud-peer-billows-v27', blend: 1, maxWidth: 440, minWidth: 150, height: 0.75, opacity: 1, inkSize: 19, ink: '#101B28', inkShadow: 0, inkWeight: 600, bob: 2, bobSpeed: 1, breathe: 1.2, sway: 0, margin: 10, shadowBlur: 8, shadowX: 24, shadowY: 0.62,
        every: 30, mixSmall: 62, mixMedium: 29, smallMin: 76, smallMax: 110, mediumMin: 116, mediumMax: 162, largeMin: 170, largeMax: 212, attachMin: 5.5, attachMax: 8.5, driftMin: 6, driftMax: 9, largeDrift: 5, wander: 1.3, turn: 0.65,
        lifeSmallMin: 15, lifeSmallMax: 30, lifeMin: 44, lifeMax: 72, dissolveSmall: 72, absorbMedium: 58, absorbTime: 4.2, absorbReach: 0.3, fadeTime: 2, pieceOpacity: 0.85,
        farMax: 3, farMin: 25, farMaxW: 52, farLifeMin: 27, farLifeMax: 52, farEvery: 14, farGroundX: -5, farGroundY: 3,
        // message clouds built from Danny's own time-lapse footage
        useKling: true, useKlingB: true, useC123: true, useC258: true, seed: 0, round: 3.2, lift: 0.55, even: 0.25, feather: 26, fill: '#f6f7f9', billowSize: 64, billowSpread: 0.8, billowOut: 0.35, edgeJit: 25, flipOk: true, gain: 1, contrast: 1, warm: 0, lineGap: 1.35,
        // pieces tearing off the clouds' own billowing edges
        piecesOn: false, pEvery: 9, pieceMin: 36, pieceMax: 72, pieceDepth: 0.55, tearTime: 3.5, tearDist: 22, neck: 0.85, regrow: 9, windX: 6, windY: -2, pDrift: 40, pAbsorb: 35, pDissolve: 25, pReach: 16, dissolveAfter: 3,
        pJitter: .4, pChance: 1, pBurst: 1, pCooldown: 8, pSizeBias: 1, pAspect: 1, pRound: 2, pSoft: .28, pDensity: 1, pWisps: .25,
        pTop: 1, pRight: 1, pBottom: .25, pLeft: 1, pClearance: 10, pSwell: .12, pSwellTime: 1.2, pPinch: 1.2, pNeckWidth: .3, pHealDelay: 0,
        pSpeedMin: 3, pSpeedMax: 7, pAcceleration: .6, pDrag: .25, pRise: 0, pTurbulenceRate: .4, pFollow: .6, pStretch: .12,
        pAttract: 300, pApproach: 10, pMatch: .6, pMergeSoft: 1, pErode: .65, pDensityLoss: .3, pLastWisp: .25, pLife: 90,
        pInherit: true, pBright: 1, pContrast: 1, pShadow: .15, pShadowBlur: 8, pShadowX: 24, pShadowY: 24,
        edgeSoft: .24, edgeRound: 2, textureDetail: 1, motionVariety: .18, outlineVariety: .045, outlineSpeed: .15, textInsetX: 0, textInsetY: 0,
        inkAlign: 'center', inkFont: 'Roboto', inkSpacing: 0, inkOffsetX: 0, inkOffsetY: 0, inkShadowColor: '#ffffff', bobPhase: 1.7, swaySpeed: .5, breatheSpeed: 1.3,
        farBlur: 0, farHeight: .65, farRate: 1, farShadow: 0 },
      msg: {}, head: {},
    },
    sections: [
      { id:'earth', name:'Earth (whole screen)', sub:'The map playlist behind everything', groups:[
        { name:'Maps, cuts & play order', ctrls:[{ t:'pl', k:'earth.clips', label:'Maps' }]},
        { name:'Direction & movement', ctrls:[{t:'direction',k:'earth.driftAngle',label:'Map drift direction'}, R('earth.driftSpeed','Added map drift (px per second)',0,80,.5), R('earth.driftDistance','Drift travel distance (px)',0,300,1), Sel('earth.driftMode','At the edge of the travel',[['bounce','Ease back smoothly'],['loop','Restart the same direction']]), K('earth.pauseDrift','Pause map drift')]},
        { name:'Video playback', ctrls:[K('earth.paused','Pause map video'), R('day_speed','Map speed (all maps)',0.0625,32,.0625), Sel('earth.playback','Video plays',[['forward','Forward'],['reverse','Reverse']]), R('earth.joinBlend','Blend between kept sections (s)',0,3,.05)]},
        { name:'Framing & angle', ctrls:[K('earth.dragToPan','Drag the map in the phone preview'), R('earth.x','Move map sideways (px)',-390,390,1), R('earth.y','Move map up / down (px)',-844,844,1), R('earth.zoom','Map zoom',1,6,.01), R('earth.rotate','Map rotation (degrees)',-180,180,1), K('earth.flipX','Mirror map left / right'), K('earth.flipY','Mirror map up / down')]},
        { name:'Map color & detail', ctrls:[R('ground_brightness','Map brightness',0.3,1.5,.01), R('earth.contrast','Map contrast',0,3,.01), R('earth.saturation','Map color strength',0,3,.01), R('earth.hue','Shift map colors',-180,180,1), R('earth.blur','Map softness (px)',0,12,.1), R('water_shimmer','Water shimmer',0,1,.01)]},
        { name:'Night', ctrls:[K('earth.night','Night (city lights)'), R('night_speed','Night speed',0.0625,64,.0625)]},
      ]},
      { id:'msg', name:'Message clouds', sub:'Base cloud under the words, wrapped in the billowing edge of your own cloud footage', groups:[
        { name:'Your cloud footage', ctrls:[K('fx.useKling','Use clip: KlingAI cloud (first half)'), K('fx.useKlingB','Use clip: KlingAI cloud (second half)'), K('fx.useC123','Use clip: 123409 cumulus'), K('fx.useC258','Use clip: 258398 tower'), R('cloud_speed','Rolling speed (time-lapse)',0.125,4,.005), R('fx.blend','Frame blending (smoothness)',0,1,.01)]},
        { name:'No two alike', ctrls:[R('cloud_variety','How different each cloud is',0,1,.01), K('fx.flipOk','Allow mirrored billows'), R('fx.seed','Reshuffle all clouds',0,500,1), R('fx.motionVariety','Individual footage speed variation',0,.5,.01), R('fx.outlineVariety','Outline variation',0,.12,.002), R('fx.outlineSpeed','Outline evolution speed',0,1,.01)]},
        { name:'Base cloud (under the words)', ctrls:[R('cloud_padding','Room around the words',12,60,1), R('fx.textInsetX','Extra room at left and right',0,40,1), R('fx.textInsetY','Extra room above and below',0,40,1), R('fx.round','Base fullness',2,4.5,.1), R('fx.lift','Cloud whiteness (base and edge)',0,1,.01), R('fx.even','Cloud color blending',0,1,.01), R('fx.feather','Base blends into the billows',2,40,1), C('fx.fill','Cloud color')]},
        { name:'Billowing edge', ctrls:[R('fx.billowSize','Billow size (px)',16,120,1), R('fx.edgeJit','Billow size variety (%)',0,60,1), R('fx.billowSpread','Space between billows',0.5,2,.01), R('fx.billowOut','How far the billows stick out',0.1,0.9,.01), R('fx.edgeSoft','Billow edge softness',.08,.6,.01), R('fx.edgeRound','Billow fullness',1.4,3.5,.05), R('fx.textureDetail','Footage texture scale',.5,2,.01)]},
        { name:'Size & growing', ctrls:[R('fx.maxWidth','Widest a cloud gets',150,440,1), R('fx.minWidth','Narrowest a cloud gets',80,300,1), R('fx.height','Extra height',0.75,1.4,.01), R('cloud_growth_ms','How fast a cloud grows (ms)',80,1500,10)]},
        { name:'Color & light', ctrls:[R('fx.opacity','Cloud see-through',0.2,1,.01), R('fx.gain','Brightness',0.5,1.5,.01), R('fx.contrast','Contrast',0.5,1.5,.01), R('fx.warm','Cool ↔ warm',-0.3,0.3,.01)]},
        { name:'Words on the cloud', ctrls:[R('fx.inkSize','Text size',10,30,.5), C('fx.ink','Text color'), R('fx.inkWeight','Text thickness',300,900,100), Sel('fx.inkFont','Text font',[['Roboto','Roboto'],['system-ui','System'],['Inter','Inter'],['Georgia','Georgia']]), Sel('fx.inkAlign','Text alignment',[['left','Left'],['center','Center'],['right','Right']]), R('fx.inkSpacing','Letter spacing',0,3,.1), R('fx.inkShadow','Text glow',0,20,.5), C('fx.inkShadowColor','Text glow color'), R('fx.lineGap','Line spacing',1,2,.01), R('fx.inkOffsetX','Text horizontal offset',-20,20,.5), R('fx.inkOffsetY','Text vertical offset',-20,20,.5)]},
        { name:'Float & breathe', ctrls:[R('fx.bob','Bob up and down',0,12,.1), R('fx.bobSpeed','Bob speed',0,4,.01), R('fx.bobPhase','Different bob phase per cloud',0,6,.05), R('fx.breathe','Breathing (swell %)',0,6,.1), R('fx.breatheSpeed','Breathing speed',0,4,.01), R('fx.sway','Side to side sway',0,12,.1), R('fx.swaySpeed','Sway speed',0,4,.01), R('fx.margin','Distance from screen edge',0,60,1)]},
        { name:'Shadow on the ground', ctrls:[R('cloud_shadow','Shadow darkness',0,0.7,.01), R('fx.shadowBlur','Shadow softness',0,30,.5), R('fx.shadowX','Shadow offset sideways',-60,60,1), R('fx.shadowY','Shadow drop',0.2,1.2,.01)]},
        { name:'Spacing & messages', ctrls:[R('message_spacing','Space between messages',4,64,1), R('preview.messages','Messages shown in the preview',0,6,1), { t:'x', k:'preview.draft', label:'Type a message here and watch your cloud grow' }]},
      ]},
      { id:'pieces', name:'Cloud pieces', sub:'Pieces tear off a cloud\'s own billowing edge, then drift off, get absorbed or dissolve', groups:[
        { name:'On / off & how often', ctrls:[K('fx.piecesOn','Preview organic break-offs'), R('ambient_count','Most pieces at once',0,12,1), R('fx.pEvery','Seconds between break-offs',2,90,1), R('fx.pJitter','Timing variation',0,.9,.01), R('fx.pChance','Chance at each interval',0,1,.01), R('fx.pBurst','Pieces per event',1,4,1), R('fx.pCooldown','Same cloud rests for (s)',0,60,1)]},
        { name:'Piece size & shape', ctrls:[R('fx.pieceMin','Smallest piece (px)',10,120,1), R('fx.pieceMax','Biggest piece (px)',10,160,1), R('fx.pSizeBias','Prefer small ↔ large pieces',.25,4,.05), R('fx.pAspect','Piece width relative to height',.4,2,.05), R('fx.pRound','Piece fullness',1.4,4,.05), R('fx.pSoft','Piece edge softness',.08,.65,.01), R('fx.pDensity','Density after separation',.3,1.5,.01), R('fx.pWisps','Fine edge wisps',0,1,.01), R('fx.pieceDepth','How deep it tears into the billows',0.15,0.9,.01)]},
        { name:'Where pieces form', ctrls:[R('fx.pTop','Chance from top edge',0,1,.05), R('fx.pRight','Chance from right edge',0,1,.05), R('fx.pBottom','Chance from bottom edge',0,1,.05), R('fx.pLeft','Chance from left edge',0,1,.05), R('fx.pClearance','Extra protected room around text',0,40,1)]},
        { name:'Tearing off & healing', ctrls:[R('fx.pSwell','Billow swell before separation',0,.6,.01), R('fx.pSwellTime','Swell takes (s)',.2,8,.1), R('fx.tearTime','Tearing takes (s)',0.5,12,.1), R('fx.tearDist','Stretch before it lets go (px)',4,80,1), R('fx.neck','Connecting neck strength',0,1,.01), R('fx.pNeckWidth','Connecting neck width',.1,.8,.01), R('fx.pPinch','How quickly the neck thins',.4,4,.05), R('fx.pHealDelay','Pause before healing (s)',0,10,.1), R('fx.regrow','Cloud heals in (s)',1,30,.5)]},
        { name:'Wind & drifting', ctrls:[R('ambient_speed','Overall drift speed',0.1,3,.01), R('fx.windX','Wind sideways',-30,30,.5), R('fx.windY','Wind up/down',-30,30,.5), R('fx.pSpeedMin','Smallest outward release speed',0,20,.5), R('fx.pSpeedMax','Largest outward release speed',0,30,.5), R('fx.pAcceleration','Acceleration into the wind',0,3,.05), R('fx.pDrag','Resistance to sideways motion',0,2,.05), R('fx.pRise','Additional rise / fall',-15,15,.25), R('fx.wander','Turbulence strength',0,10,.1), R('fx.pTurbulenceRate','Turbulence pace',.05,3,.05), R('fx.pFollow','Inherit parent cloud movement',0,1,.05), R('fx.pStretch','Deformation in the wind',0,.5,.01), R('fx.pLife','Longest life before fading (s)',5,180,1)]},
        { name:'What happens to them', ctrls:[R('fx.pDrift','Drift off screen (share)',0,100,1), R('fx.pAbsorb','Absorbed by another cloud (share)',0,100,1), R('fx.pDissolve','Dissolve (share)',0,100,1)]},
        { name:'Absorbing into another cloud', ctrls:[R('fx.pAttract','Find another cloud within (px)',40,600,5), R('fx.pApproach','Approach speed',1,40,.5), R('fx.pMatch','Match the receiving cloud speed',0,1,.05), R('fx.pReach','How close before absorbed (px)',0,80,1), R('fx.absorbTime','Absorbing takes (s)',0.5,15,.1), R('fx.pMergeSoft','Softness of the join',.3,3,.05)]},
        { name:'Dissolving & last wisps', ctrls:[R('fx.dissolveAfter','Dissolving starts after (s)',0,20,.5), R('fx.fadeTime','Dissolving takes (s)',0.2,10,.1), R('fx.pErode','Thin edges disappear first',0,1,.01), R('fx.pDensityLoss','Density lost while fading',0,1,.01), R('fx.pLastWisp','Length of the final wisp fade',0,.8,.01)]},
        { name:'Piece light & shadow', ctrls:[R('fx.pieceOpacity','Piece opacity',0,1,.01), K('fx.pInherit','Use parent cloud lighting'), R('fx.pBright','Separate piece brightness',.5,1.5,.01), R('fx.pContrast','Separate piece contrast',.5,1.5,.01), R('fx.pShadow','Piece shadow darkness',0,.6,.01), R('fx.pShadowBlur','Piece shadow softness',0,30,.5), R('fx.pShadowX','Piece shadow offset sideways',-60,60,1), R('fx.pShadowY','Piece shadow drop',0,100,1)]},
        { name:'Far-away clouds', ctrls:[R('fx.farMax','How many far away',0,8,1), R('fx.farMin','Far: narrowest',5,120,1), R('fx.farMaxW','Far: widest',5,160,1), R('fx.farEvery','New far cloud every (s)',3,60,1), R('fx.farLifeMin','Far: life shortest (s)',5,120,1), R('fx.farLifeMax','Far: life longest (s)',5,180,1), R('fx.farGroundX','Move with the map sideways',-40,40,.5), R('fx.farGroundY','Move with the map up/down',-40,40,.5), R('ambient_opacity','Far clouds see-through',0,1,.01), R('fx.farBlur','Far cloud softness',0,8,.25), R('fx.farHeight','Far cloud height range',.15,.9,.01), R('fx.farRate','Far cloud rolling speed',.1,3,.05), R('fx.farShadow','Far cloud shadow',0,.4,.01)]},
      ]},
      { id:'cloudvid', name:'Cloud videos', sub:'Trim, crop, key out, loop and prepare the cloud footage', groups:[] },
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
(() => { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800;900&family=Inter+Tight:wght@400;600;700&family=Oswald:wght@300;400;600;700&family=Bebas+Neue&family=Playfair+Display:wght@400;600;800;900&family=Cinzel:wght@400;600;800;900&family=Cinzel+Decorative:wght@400;700;900&family=MedievalSharp&family=Uncial+Antiqua&display=swap'; document.head.appendChild(l); })();
const BOX = (o) => Object.assign({ fill:'#15120d', fillA:0.92, tex:'', texA:1, radius:16, bw:1, bc:'#c9a46a', sh:0.5, shBlur:18, shY:8, glow:0, glowC:'#f0c070' }, o || {});
const boxC = (p, n) => [C(p+'.fill', n+': fill color'), R(p+'.fillA', n+': fill see-through', 0, 1, .01), U(p+'.tex', n+': your texture / image'), R(p+'.texA', n+': texture strength', 0, 1, .01), R(p+'.radius', n+': corner rounding', 0, 60, 1), R(p+'.bw', n+': border thickness', 0, 12, .5), C(p+'.bc', n+': border color'), R(p+'.sh', n+': shadow darkness', 0, 1, .01), R(p+'.shBlur', n+': shadow softness', 0, 60, 1), R(p+'.shY', n+': shadow drop', 0, 40, 1), R(p+'.glow', n+': glow', 0, 1.5, .01), C(p+'.glowC', n+': glow color')];
const TXT = (size, color, o) => Object.assign({ font:'system-ui', size, weight:600, color, shA:0, caps:false, spacing:0, italic:false, underline:false, align:'auto' }, o || {});
const txtC = (p, n) => [Sel(p+'.font', n+': font', FONTS), R(p+'.size', n+': size', 6, 64, .5), R(p+'.weight', n+': thickness', 300, 900, 100), C(p+'.color', n+': color'), R(p+'.shA', n+': shadow', 0, 1, .01), K(p+'.caps', n+': ALL CAPS'), R(p+'.spacing',n+': letter spacing',-2,12,.1), K(p+'.italic',n+': italic'), K(p+'.underline',n+': underline'), Sel(p+'.align',n+': alignment',[['auto','Keep current alignment'],['left','Left'],['center','Center'],['right','Right']])];
const BG = (c) => ({ color:c, img:'', imgA:1, dim:0 });
const bgC = (p) => [C(p+'.color','Background color'), U(p+'.img','Background image / video','image/*,video/*'), R(p+'.imgA','Background image strength',0,1,.01), R(p+'.dim','Darken',0,1,.01)];
const SLOTS = (n, size) => ({ n, size, gap:22, y:0.88, glow:0, glowC:'#ffffff', i1:'', i2:'', i3:'', i4:'', i5:'' });
const slotC = (p, n) => [R(p+'.n', n+': how many', 0, 5, 1), R(p+'.size', n+': size', 16, 120, 1), R(p+'.gap', n+': spacing', 0, 80, 1), R(p+'.y', n+': height on screen', 0.4, 0.99, .002), R(p+'.glow', n+': glow', 0, 1.5, .01), C(p+'.glowC', n+': glow color'), U(p+'.i1', n+': image 1'), U(p+'.i2', n+': image 2'), U(p+'.i3', n+': image 3'), U(p+'.i4', n+': image 4'), U(p+'.i5', n+': image 5')];
function hexA(h, a){ const n = parseInt(String(h || '#000000').slice(1, 7), 16) || 0; return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
function box(x, X0, Y0, w, h, b){ if(w <= 0 || h <= 0) return; x.save(); const r = b.shape==='square'?0:(b.shape==='circle'||b.shape==='pill')?Math.min(w,h)/2:Math.max(0, Math.min(b.radius, w / 2, h / 2)); rr(x, X0, Y0, w, h, r);
  if(b.sh > 0){ x.shadowColor = `rgba(0,0,0,${b.sh})`; x.shadowBlur = b.shBlur; x.shadowOffsetY = b.shY; }
  x.fillStyle = hexA(b.fill, b.fillA); x.fill(); x.shadowColor = 'transparent'; x.shadowBlur = 0; x.shadowOffsetY = 0;
  if(b.tex){ const t = img(b.tex); if(ok(t)){ x.save(); x.clip(); x.globalAlpha = b.texA; cover(x, t, X0, Y0, w, h); x.restore(); rr(x, X0, Y0, w, h, r); } }
  if(b.glow > 0){ x.shadowColor = b.glowC; x.shadowBlur = 22 * b.glow; }
  if(b.bw > 0){ x.lineWidth = b.bw; x.strokeStyle = b.bc; x.stroke(); } else if(b.glow > 0){ x.lineWidth = 1; x.strokeStyle = hexA(b.glowC, 0.4); x.stroke(); }
  x.restore(); }
function fontOf(t){ return `${t.italic?'italic ':''}${t.weight} ${t.size}px "${t.font}", system-ui`; }
function tx(x, t, str, X0, Y0, align, maxW){ x.save(); x.font = fontOf(t); x.fillStyle = t.color; x.textAlign = (t.align&&t.align!=='auto'?t.align:align)||'left'; x.textBaseline = 'alphabetic'; if('letterSpacing' in x)x.letterSpacing=(t.spacing||0)+'px'; if(maxW&&t.align&&t.align!=='auto'){const left=X0-(align==='center'?maxW/2:align==='right'?maxW:0);X0=left+(t.align==='center'?maxW/2:t.align==='right'?maxW:0);}
  if(t.shA > 0){ x.shadowColor = `rgba(0,0,0,${t.shA})`; x.shadowBlur = 6; x.shadowOffsetY = 2; }
  const full = t.caps ? String(str).toUpperCase() : String(str); let s = full;
  if(maxW){ while(s.length > 1 && x.measureText(s + (s !== full ? '…' : '')).width > maxW) s = s.slice(0, -1); if(s !== full) s += '…'; }
  x.fillText(s, X0, Y0); if(t.underline){const w=x.measureText(s).width,start=X0-(x.textAlign==='center'?w/2:x.textAlign==='right'?w:0);x.fillRect(start,Y0+2,w,Math.max(1,t.size/18));} x.restore(); }
function tw(x, t, str){ x.save(); x.font = fontOf(t); if('letterSpacing' in x)x.letterSpacing=(t.spacing||0)+'px'; const w = x.measureText(t.caps ? String(str).toUpperCase() : String(str)).width; x.restore(); return w; }
function bgDraw(x, b){ x.fillStyle = b.color; x.fillRect(0, 0, W, HH * 1.3); if(b.img){ const i = img(b.img); if(ok(i)){ x.save(); x.globalAlpha = b.imgA; cover(x, i, 0, 0, W, HH); x.restore(); } } if(b.dim > 0){ x.fillStyle = `rgba(0,0,0,${b.dim})`; x.fillRect(0, 0, W, HH); } }
function dashed(x, X0, Y0, w, h, label){ x.save(); x.setLineDash([4, 4]); x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 1; x.strokeRect(X0 + .5, Y0 + .5, w - 1, h - 1); if(label){ x.fillStyle = 'rgba(255,255,255,.45)'; x.font = '10px system-ui'; x.textAlign = 'center'; x.fillText(label, X0 + w / 2, Y0 + h / 2 + 3); } x.restore(); }
function slotsDraw(x, s, Yc){ const n = Math.round(s.n); if(!n) return; const tot = n * s.size + (n - 1) * s.gap, Y0 = (Yc ?? HH * s.y) - s.size / 2;
  for(let i = 0; i < n; i++){ const X0 = (W - tot) / 2 + i * (s.size + s.gap), u = s['i' + (i + 1)], im = u ? img(u) : null;
    if(im && ok(im)){ x.save(); if(s.glow > 0){ x.shadowColor = s.glowC; x.shadowBlur = 14 * s.glow; } x.drawImage(im, X0, Y0, s.size, s.size); x.restore(); } else dashed(x, X0, Y0, s.size, s.size, 'slot ' + (i + 1)); } }
function contain(x, im, X0, Y0, w, h, pad){ if(!ok(im)) return; const p = pad || 0, ww = w - 2 * p, hh = h - 2 * p, iw=im.videoWidth||im.naturalWidth, ih=im.videoHeight||im.naturalHeight, s = Math.min(ww / iw, hh / ih), dw = iw * s, dh = ih * s; x.drawImage(im, X0 + p + (ww - dw) / 2, Y0 + p + (hh - dh) / 2, dw, dh); }
const ease = (p) => p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
const money = (v) => '$' + (Math.round(v * 100) / 100).toFixed(2);

/* real stores + products from the app (preview only) */
const DATA = { items: [], rates: [] };
const fixUrl = (u) => String(u || '').replace(/ /g, '%20').replace(/'/g, '%27');
(async () => {
  if(RUNTIME) return;
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
  const hs = entries.map(e => (e === 'ad' ? adCardH(S, cw) : normH) + F.gap), total = hs.reduce((a, b) => a + b, 0), sc = feedOffset(t, F.scroll, total, HH);
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
  if(L.layout === 'carousel'){ const off = PREVIEW_MOTION ? (t * L.scroll) % (cw + L.gap) : 0; for(let i = -1; i < 6; i++) drawCard(i + 1 + Math.floor((PREVIEW_MOTION ? t * L.scroll : 0) / (cw + L.gap)), L.margin + i * (cw + L.gap) - off, top); for(let i = 0; i < 4; i++) drawCard(i + 20, L.margin + i * ((W - L.margin * 2 - L.gap) / 2 + L.gap), top + ch + 24); }
  else { const rowH = ch + L.gap, rows = 40, sc = feedOffset(t, L.scroll, rowH * 20, HH - top); x.save(); x.beginPath(); x.rect(0, top, W, HH - top); x.clip(); for(let r = 0; r < rows; r++){ const y = top + r * rowH - sc; if(y > HH || y + ch < top) continue; for(let c = 0; c < cols; c++) drawCard(r * cols + c, L.margin + c * (cw + L.gap), y); } x.restore(); }
  tx(x, S.head.t, S.head.text, W / 2, HH * S.head.y, 'center', W - 30);
  if(S.near.show){ const s = S.near.text + ' · ' + S.near.miles + ' mi', fw = tw(x, S.near.t, s) + 28, fh = S.near.t.size + 14, fy = HH * S.near.y; box(x, (W - fw) / 2, fy, fw, fh, S.near.box); tx(x, S.near.t, s, W / 2, fy + fh / 2 + S.near.t.size * 0.36, 'center'); }
}

/* Shared asteroid navigation is independent of page and Raven settings. */
PAGES.track = { title:'Track', defaults:{ bg:'#020408' }, sections:[{id:'rocks',name:'Rock navigation',sub:'Carvings, motion, debris & stars',groups:[]}], draw:(x)=>{x.fillStyle='#020408';x.fillRect(0,0,W,HH);x.fillStyle='#c7dce5';x.font='600 24px system-ui';x.textAlign='center';x.fillText('Track',W/2,74);x.textAlign='left';} };
for(const P of Object.values(PAGES)){P.sections=P.sections.filter(s=>s.id!=='dock');}
const ROCK_NAV = new AsgardRockNav.Navigation({stage:$('#stage'),url:SB.url,key:SB.key,assetBase:STUDIO+'navigation/rocks-v1/',page:'home',shareAvailable:true,onNavigate:openPage,readOnly:!!RUNTIME,settings:RUNTIME?.envelope?.navigation,resolveAsset:RUNTIME?.resolveAsset});
window.asgardRockNavigation = ROCK_NAV;
/* ======================= STORE PAGE (one design per store) ======================= */
const STORE = { id: RUNTIME?.envelope?.storeId || new URLSearchParams(location.search).get('store') || '', row: null, items: [], loading: false, loaded:false, error:'', offset:0, limit:80, count:0, query:'', revision:0, abort:null, scroll:0, scrollMax:0 };
async function loadStore(offset=STORE.offset,query=STORE.query,force=false){
 if(!UUID.test(STORE.id)||(!force&&(STORE.loading||STORE.loaded)))return;
 STORE.abort?.abort();const abort=STORE.abort=new AbortController(),revision=++STORE.revision,id=STORE.id;
 const nextOffset=Math.max(0,Math.floor(Number(offset)||0)),nextQuery=String(query||'').trim().slice(0,160);
 STORE.loading=true;STORE.error='';updateCatalogControls();
 try{
  let row=STORE.row;
  if(!row){const r=await fetch(SB.url+'/rest/v1/stores?'+new URLSearchParams({id:'eq.'+id,select:'id,name,logo_url,category,address,is_valhalla,website_url,hours'}),{headers:H(),signal:abort.signal});if(!r.ok)throw Error('Store information could not be loaded.');row=(await r.json())[0]||null;if(!row)throw Error('Store not found.');}
  const qs=new URLSearchParams({store_id:'eq.'+id,select:'id,store_id,name,description,price,image_url,category,section,shelf_group,weight_lbs',order:'section_rank.asc.nullslast,sort_order.asc.nullslast,id.asc',limit:String(STORE.limit),offset:String(nextOffset)});
  if(nextQuery)qs.set('name','ilike.*'+nextQuery.replace(/[\*%_]/g,'')+'*');
  const r=await fetch(SB.url+'/rest/v1/products?'+qs,{headers:H({Prefer:'count=exact'}),signal:abort.signal});if(!r.ok)throw Error('Products could not be loaded.');
  const items=await r.json();if(!Array.isArray(items))throw Error('Unexpected product response.');
  if(revision!==STORE.revision||id!==STORE.id)return;
  const total=Number((r.headers.get('content-range')||'').split('/')[1]);
  allowDataAssets([row.logo_url,...items.map(v=>v.image_url)]);
  STORE.row=row;STORE.items=items.map(v=>({...v,img:fixUrl(v.image_url),cat:v.category,price:v.price==null?null:Number(v.price)}));STORE.count=Number.isFinite(total)?total:nextOffset+items.length;STORE.offset=nextOffset;STORE.query=nextQuery;STORE.scroll=0;STORE.loaded=true;
 }catch(e){if(e.name==='AbortError'||revision!==STORE.revision)return;STORE.error=e.message;STORE.loaded=true;}
 finally{if(revision===STORE.revision){STORE.loading=false;updateCatalogControls();}}
 return {items:STORE.items,count:STORE.count,offset:STORE.offset,error:STORE.error};
}
let catalogControls=null;
function updateCatalogControls(){
 if(!RUNTIME||!catalogControls)return;
 const {status,prev,next,search,bar}=catalogControls;bar.hidden=STATE.page!=='store';bar.style.display=STATE.page==='store'?'flex':'none';
 status.textContent=STORE.loading?'Loading products…':STORE.error||(!STORE.count?'No products found':`${STORE.offset+1}–${STORE.offset+STORE.items.length} of ${STORE.count.toLocaleString()}`);
 prev.disabled=STORE.loading||STORE.offset===0;next.disabled=STORE.loading||STORE.offset+STORE.items.length>=STORE.count;search.disabled=STORE.loading;
}
function mountCatalogControls(){
 if(!RUNTIME||catalogControls)return;
 const bar=document.createElement('div');bar.className='asgard-catalog-controls';bar.setAttribute('aria-label','Complete store catalog');
 Object.assign(bar.style,{position:'absolute',left:'10px',right:'10px',bottom:'118px',zIndex:10,display:'flex',gap:'5px',flexWrap:'wrap',padding:'7px',background:'rgba(8,14,18,.94)',border:'1px solid #34505c',borderRadius:'8px',font:'12px system-ui',color:'#e6eef0'});
 const search=document.createElement('input');search.type='search';search.placeholder='Search all products';search.setAttribute('aria-label','Search the complete store catalog');search.style.cssText='min-width:90px;flex:1;background:#10202a;color:white;border:1px solid #45616b;border-radius:4px;padding:5px';
 const prev=document.createElement('button'),next=document.createElement('button'),status=document.createElement('span');prev.textContent='Previous';next.textContent='Next';status.setAttribute('role','status');status.style.cssText='width:100%;font-size:11px';for(const b of [prev,next])b.style.cssText='background:#19343e;color:#e6eef0;border:1px solid #45616b;border-radius:4px;padding:5px;cursor:pointer';
 prev.onclick=()=>loadStore(Math.max(0,STORE.offset-STORE.limit),STORE.query,true);next.onclick=()=>loadStore(STORE.offset+STORE.limit,STORE.query,true);
 search.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();loadStore(0,search.value,true);}};search.onchange=()=>loadStore(0,search.value,true);
 bar.append(search,prev,next,status);$('#stage').append(bar);catalogControls={bar,search,prev,next,status};updateCatalogControls();
}
let docId = (page) => page === 'store' ? 'page_store_' + STORE.id : 'page_' + page;
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
        { name:'Sky strip', ctrls:[K('sky.show','Show the sky'), R('sky.height','How tall',0.1,0.6,.005), R('sky.image','Space picture',1,23,1), U('sky.custom','Sky image / video','image/*,video/*'), R('sky.bright','Brightness',0.2,1.6,.01), R('sky.drift','Drift speed',0,40,.5), R('sky.fade','Fade into the page',0,0.6,.01)] },
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
  const catalogDraft=!RUNTIME?S._catalogDraft:null;const st = {...(STORE.row || { name: STORE.id ? 'Loading…' : 'Pick a store on the left', address: '', logo_url: '' }),...(catalogDraft?.storeOverrides||{})};const previewItems=(!RUNTIME?[...(catalogDraft?.added||[]),...STORE.items]:STORE.items).map(p=>{const a={...p,...(catalogDraft?.overrides?.[p.id]||{})};return {...a,img:fixUrl(a.image_url||a.img||'')};});
  // products scroll under the sky
  const cols = L.layout === 'grid' ? Math.round(L.cols) : 1, cw = (W - L.margin * 2 - (cols - 1) * L.gap) / cols;
  const ph = L.layout === 'list' ? cw * 0.28 * L.ratio : cw * L.ratio, info = 14 + L.nameT.size + 8 + L.priceT.size + 10, ch = L.layout === 'list' ? Math.max(ph + 20, info + 6) : ph + info;
  const headH = Math.max(Hd.logo, 30) + 30, top = skyH + headH;
  const n = previewItems.length, rows = Math.ceil(n / cols), rowH = ch + L.gap, total = Math.max(1, rows * rowH);
  STORE.scrollMax=Math.max(0,total-(HH-top-210));
  const sc = (RUNTIME||!PREVIEW_MOTION) ? clamp(STORE.scroll,0,STORE.scrollMax) : rows > 3 ? (t * L.scroll) % total : 0;
  x.save(); x.beginPath(); x.rect(0, top, W, HH - top); x.clip();
  for(let rep = 0; rep < (RUNTIME?1:2); rep++) for(let i = 0; i < n; i++){ const r = Math.floor(i / cols), c = i % cols, y = top + 8 + r * rowH - sc + rep * total; if(y > HH || y + ch < top) continue;
    const it = previewItems[i], X0 = L.margin + c * (cw + L.gap); box(x, X0, y, cw, ch, L.card);
    const pw = L.layout === 'list' ? ph : cw, pX = L.layout === 'list' ? X0 + 10 : X0, pY = L.layout === 'list' ? y + 10 : y;
    x.save(); if(L.layout === 'list') rr(x, pX, pY, pw, ph, 10); else rr(x, X0, y, cw, ph + L.card.radius, Math.min(L.card.radius, cw / 2)); x.clip(); x.fillStyle = L.photoBg; x.fillRect(pX, pY, pw, ph); if(it.img) contain(x, img(it.img), pX, pY, pw, ph, L.photoPad); x.restore();
    const ix = L.layout === 'list' ? pX + pw + 12 : X0 + 10, iw = L.layout === 'list' ? cw - (ix - X0) - 10 : cw - 20; let yy = (L.layout === 'list' ? y + 4 : y + ph) + 12 + L.nameT.size;
    tx(x, L.nameT, it.name, ix, yy, 'left', iw); yy += L.priceT.size + 8; if(it.price!=null) tx(x, L.priceT, money(it.price), ix, yy); if(y+ch>top&&y<HH-110)hit(X0,Math.max(y,top),cw,Math.max(0,Math.min(y+ch,HH-110)-Math.max(y,top)),{type:'product',productId:it.id,storeId:STORE.id}); }
  if(STORE.id && !n && !STORE.loading) tx(x, TXT(13, '#8a8f98'), STORE.error||'No products for this store yet', W / 2, top + 60, 'center');
  x.restore();
  // header: logo + name + address
  x.fillStyle = S.bg.color; x.fillRect(0, skyH, W, headH);
  let nx = L.margin; if(Hd.logo > 0 && st.logo_url){ const lg = logoImg(fixUrl(st.logo_url)); x.save(); const ly = skyH + (headH - Hd.logo) / 2; if(Hd.round){ x.beginPath(); x.arc(nx + Hd.logo / 2, ly + Hd.logo / 2, Hd.logo / 2, 0, 7); x.fillStyle = '#fff'; x.fill(); x.clip(); } contain(x, lg, nx, ly, Hd.logo, Hd.logo, Hd.round ? Hd.logo * 0.12 : 0); x.restore(); nx += Hd.logo + 12; }
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

/* ======================= SLEIPNIR HOME + CATEGORY BROWSE PAGES ======================= */
const QS = new URLSearchParams(location.search);
const BROWSE = { type: RUNTIME?.envelope?.pageType || QS.get('type') || 'grocery', all: null, loading: false };
const BTYPES = { grocery: 'Grocery', fast_food: 'Fast Food', restaurant: 'Restaurants', retail: 'Retail', valhalla: 'Valhalla' };
async function loadBrowse(){
  if(BROWSE.all || BROWSE.loading) return; BROWSE.loading = true;
  try { const r = await fetch(SB.url + '/rest/v1/stores?select=id,name,logo_url,address,menu_type,category,is_valhalla&is_live=is.true&order=name', { headers: H() }); BROWSE.all = r.ok ? await r.json() : [];allowDataAssets(BROWSE.all.map(s=>s.logo_url)); } catch(e){ BROWSE.all = []; }
  BROWSE.loading = false;
}
function browseList(){
  const a = BROWSE.all || [], t = BROWSE.type;
  return a.filter(s => t === 'valhalla' ? s.is_valhalla : !s.is_valhalla && (
    t === 'grocery' ? (s.menu_type === 'grocery' || /grocery|wholesale/i.test(s.category || '')) :
    t === 'fast_food' ? s.menu_type === 'fast_food' :
    t === 'restaurant' ? (s.menu_type === 'sit_down' || s.menu_type === 'fast_casual') :
    t === 'retail' ? ((s.menu_type === 'retail' || s.menu_type === 'convenience') && !/grocery|wholesale/i.test(s.category || '')) : false));
}
const MOTION=()=>({mode:'still',distance:8,period:6});
const motionC=p=>[Sel(p+'.mode','Floating motion',[['still','Still'],['float','Float up / down'],['sway','Sway sideways'],['orbit','Small orbit']]),R(p+'.distance','Movement distance',0,60,1),R(p+'.period','Seconds per movement',.5,60,.5)];
function motionOffset(m,t,i){if(!m||m.mode==='still')return [0,0];const a=t*2*Math.PI/Math.max(.5,m.period)+i*.7,d=m.distance;return [m.mode==='float'?0:Math.sin(a)*d,m.mode==='sway'?0:Math.cos(a)*d];}
const shapes=p=>Sel(p+'.shape','Button shape',[['custom','Current corners'],['pill','Pill'],['circle','Round'],['square','Square']]);
const TILE = (label,target='',pageType='') => ({ show: true, label, icon:'', target, pageType });
const BTN = (text,target='') => ({ show: true, text, img:'', target });
const ROUTES=[['','Not connected'],['shome','Shopping home'],['home','Posts home'],['raven','Raven'],['browse','Store categories'],['swap','Swap & sell'],['convo','Messages'],['share','Share'],['track','Track'],['deals','Deals'],['heimdall','Notifications'],['ads','Ads'],['shoppost','Shop the post']];
const routeC=p=>[Sel(p+'.target','Tap opens',ROUTES),Sel(p+'.pageType','Store category',[['','Default'],['grocery','Grocery'],['fast_food','Fast food'],['restaurant','Restaurants'],['retail','Retail'],['valhalla','Valhalla']])];
const prevDocId = docId;
docId = (page) => page === 'browse' ? 'page_browse_' + BROWSE.type : prevDocId(page);
Object.assign(PAGES, {
  shome: {
    title: 'Sleipnir home',
    defaults: {
      bg: BG('#bdbdbd'),
      norse: { on: true, speed: 10, opacity: 0.35 },
      profile: { show: true, size: 34, box: BOX({ radius: 8, fill: '#4f46e5', fillA: 1, bw: 0, sh: 0.2, shBlur: 6, shY: 2 }), icon: '' },
      logo: { img: '', size: 0.3, y: 0.02 },
      title: { show: true, text: 'SLEIPNIR', y: 0.135, t: TXT(19, '#8b1d1d', { font: 'Cinzel', weight: 800, shA: 0.2 }) },
      search: { show: true, text: 'Search stores, items, meals…', y: 0.165, h: 34, margin: 14, box: BOX({ radius: 17, fill: '#000000', fillA: 1, bw: 2, bc: '#e9c46a', sh: 0 }), t: TXT(12, '#8a8f98', { weight: 400 }) },
      odin: { show: true, img: '', size: 66, y: 0.235, box: BOX({ radius: 8, fill: '#000000', fillA: 1, bw: 0, sh: 0.4 }) },
      tiles: { motion:MOTION(), cols: 4, y: 0.35, gap: 22, rowGap: 30, icon: 50, margin: 10, box: BOX({ radius: 12, fill: '#ffffff', fillA: 0, bw: 0, sh: 0 }), t: TXT(11, '#3a3a3a', { weight: 700 }),
        t1: TILE('Grocery','browse','grocery'), t2: TILE('Fast Food','browse','fast_food'), t3: TILE('Restaurant','browse','restaurant'), t4: TILE('Retail','browse','retail'), t5: TILE('Odin Concierge'), t6: TILE('P2P','swap'), t7: TILE('Valhalla','browse','valhalla'), t8: TILE('Virtual Shop') },
      btns: { motion:MOTION(), y: 0.735, w: 0.36, h: 32, gap: 9, box: BOX({ radius: 8, fill: '#4f46e5', fillA: 1, bw: 0, sh: 0.25, shBlur: 6, shY: 2 }), t: TXT(13, '#ffffff', { weight: 700 }),
        b1: BTN('Become a Valkyrie'), b2: BTN('My account'), b3: BTN('Asgard','home'), b4: BTN('Admin') },
    },
    sections: [
      { id:'bg', name:'Background', sub:'Color, picture, Norse scroll', groups:[
        { name:'Background', ctrls: bgC('bg') },
        { name:'Scrolling Norse art', ctrls: [K('norse.on','Show it'), R('norse.speed','Scroll speed',0,60,.5), R('norse.opacity','Strength',0,1,.01)] },
      ]},
      { id:'top', name:'Top', sub:'Profile, logo, title, search', groups:[
        { name:'Profile button', ctrls: [K('profile.show','Show'), R('profile.size','Size',20,60,1),R('profile.x','Right margin',0,80,1),R('profile.y','Height on screen',0,.3,.002), U('profile.icon','Your icon'), ...boxC('profile.box','Profile button')] },
        { name:'Logo', ctrls: [U('logo.img','Your logo'),Sel('logo.fit','Image fit',[['cover','Fill the original square'],['contain','Show whole image']]),R('logo.glow','Glow softness',0,40,1),C('logo.glowColor','Glow color'), R('logo.size','Size (share of width)',0.1,0.8,.005), R('logo.y','Height',0,0.3,.002)] },
        { name:'Title', ctrls: [K('title.show','Show'), X('title.text','Text'), R('title.y','Height',0,0.4,.002), ...txtC('title.t','Title')] },
        { name:'Search bar', ctrls: [K('search.show','Show'), X('search.text','Placeholder text'), R('search.y','Height on screen',0,0.5,.002), R('search.h','Bar thickness',24,60,1), R('search.margin','Side margin',0,60,1), ...txtC('search.t','Placeholder'), ...boxC('search.box','Search bar')] },
        { name:'Odin', ctrls: [K('odin.show','Show'), U('odin.img','Odin picture'), R('odin.size','Size',30,160,1), R('odin.y','Height',0,0.5,.002), ...boxC('odin.box','Odin frame')] },
      ]},
      { id:'tiles', name:'Category buttons', sub:'Grocery, Fast Food, Restaurant…', groups:[
        { name:'Layout', ctrls: [Sel('tiles.layout','Layout',[['original','Original app layout'],['grid','Even grid']]),R('tiles.firstHeight','First group height',60,300,1),R('tiles.secondHeight','Second group height',60,300,1),R('tiles.cols','Per row',2,5,1), R('tiles.y','Where they start',0.2,0.8,.002), R('tiles.icon','Icon size',24,100,1), R('tiles.gap','Space side to side',0,40,1), R('tiles.rowGap','Space between rows',0,60,1), R('tiles.margin','Side margin',0,40,1)] },
        { name:'Label text', ctrls: txtC('tiles.t','Label') },
        { name:'Button backing', ctrls: [shapes('tiles.box'),...boxC('tiles.box','Backing')] },
        {name:'Floating category buttons',ctrls:motionC('tiles.motion')},
        ...[1,2,3,4,5,6,7,8,9,10,11,12].map(i => ({ name:'Button ' + i, ctrls:[K('tiles.t'+i+'.show','Show'), X('tiles.t'+i+'.label','Label'), U('tiles.t'+i+'.icon','Icon image'),...(i===6||i===7?[X('tiles.t'+i+'.buttonText','Text inside button')]:[]),...routeC('tiles.t'+i)] })),
      ]},
      { id:'btns', name:'Bottom buttons', sub:'Valkyrie, account, Asgard, admin', groups:[
        { name:'Layout', ctrls: [K('btns.fitText','Fit each button to its text'),R('btns.y','Where they start',0.4,0.95,.002), R('btns.w','Width',0.2,0.9,.005), R('btns.h','Height',20,60,1), R('btns.gap','Space between',0,30,1)] },
        { name:'Text', ctrls: txtC('btns.t','Button text') }, { name:'Look', ctrls: [shapes('btns.box'),...boxC('btns.box','Button')] },
        {name:'Floating bottom buttons',ctrls:motionC('btns.motion')},
        ...[1,2,3,4].map(i => ({ name:'Button ' + i, ctrls:[K('btns.b'+i+'.show','Show'), X('btns.b'+i+'.text','Text'),U('btns.b'+i+'.img','Button image'),...routeC('btns.b'+i)] })),
      ]},
    ],
    draw: drawSHome,
  },
  browse: {
    title: 'Category page',
    defaults: {
      bg: BG('#0d0f12'),
      norse: { on: false, speed: 10, opacity: 0.25 },
      head: { text: '', y: 0.06, back: true, t: TXT(24, '#f2e6cf', { font: 'Cinzel', weight: 800 }) },
      search: { show: true, text: 'Search stores…', y: 0.095, h: 36, margin: 14, box: BOX({ radius: 18, fill: '#1b1f25', bw: 1, bc: '#3a3f48', sh: 0 }), t: TXT(12, '#8a8f98', { weight: 400 }) },
      chips: { show: true, y: 0.155, box: BOX({ radius: 14, fill: '#1d2026', bw: 1, bc: '#3a3f48', sh: 0 }), on: BOX({ radius: 14, fill: '#e9c46a', fillA: 1, bw: 0, sh: 0 }), t: TXT(11, '#cfd6e0', { weight: 600 }), onT: TXT(11, '#1b1406', { weight: 800 }) },
      grid: { cols: 2, top: 0.2, margin: 14, gap: 12, tileH: 1, logo: 0.6, scroll: 10, box: BOX({ radius: 16, fill: '#ffffff', fillA: 1, bw: 0, sh: 0.35 }), name: true, nameT: TXT(12, '#1b1b1b', { weight: 700 }), town: true, townT: TXT(10, '#6b7280', { weight: 500 }) },
    },
    sections: [
      { id:'look', name:'Page', sub:'Background, title, search', groups:[
        { name:'Background', ctrls: bgC('bg') },
        { name:'Scrolling Norse art', ctrls: [K('norse.on','Show it'), R('norse.speed','Scroll speed',0,60,.5), R('norse.opacity','Strength',0,1,.01)] },
        { name:'Title', ctrls: [X('head.text','Title (blank = category name)'), R('head.y','Height',0.02,0.2,.002), K('head.back','Show back arrow'), ...txtC('head.t','Title')] },
        { name:'Search bar', ctrls: [K('search.show','Show'), X('search.text','Placeholder text'), R('search.y','Height on screen',0.03,0.3,.002), R('search.h','Bar thickness',24,60,1), R('search.margin','Side margin',0,60,1), ...txtC('search.t','Placeholder'), ...boxC('search.box','Search bar')] },
      ]},
      { id:'chips', name:'Town chips', sub:'Filter by town', groups:[
        { name:'Chips', ctrls: [K('chips.show','Show'), R('chips.y','Height on screen',0.05,0.35,.002), ...txtC('chips.t','Chip text'), ...txtC('chips.onT','Picked chip text')] },
        { name:'Chip look', ctrls: boxC('chips.box','Chip') }, { name:'Picked chip look', ctrls: boxC('chips.on','Picked chip') },
      ]},
      { id:'grid', name:'Store tiles', sub:'Logo grid of real stores', groups:[
        { name:'Layout', ctrls: [R('grid.cols','Per row',1,4,1), R('grid.top','Where tiles start',0.1,0.5,.002), R('grid.margin','Side margin',0,40,1), R('grid.gap','Space between',0,40,1), R('grid.tileH','Tile height (x width)',0.5,1.6,.01), R('grid.logo','Logo size (share of tile)',0.2,1,.01), R('grid.scroll','Preview scroll speed',0,60,1)] },
        { name:'Tile look', ctrls: boxC('grid.box','Tile') },
        { name:'Store name', ctrls: [K('grid.name','Show'), ...txtC('grid.nameT','Name')] },
        { name:'Town', ctrls: [K('grid.town','Show'), ...txtC('grid.townT','Town')] },
      ]},
    ],
    draw: drawBrowse,
  },
});
const IMG2 = {};
function logoImg(src){ src=runtimeAsset(src); if(!IMG2[src]){ const i = new Image(); i.src = src; IMG2[src] = i; } return IMG2[src]; }
function norseLayer(x, t, N){ if(!N.on) return;
 if(N.style==='original-strip')return originalNorseLayer(x,t,N);
 if(N.media?.length){const h=N.height||100,gap=N.gap??16,step=h+gap,rows=N.rows||3,dir=N.direction==='right'?1:-1,travel=t*N.speed*dir,phase=Math.floor(travel/step),off=((travel%step)+step)%step;x.save();x.globalAlpha=N.opacity;
  for(let row=0;row<rows;row++)for(let col=-1;col<Math.ceil(W/step)+1;col++){const a=N.media[((col+row-phase)%N.media.length+N.media.length)%N.media.length],im=img(a.url||a);if(ok(im))contain(x,im,col*step+off,HH*(N.y??.05)+row*step,h,h);}x.restore();return;
 }
 x.save(); x.globalAlpha = N.opacity; x.fillStyle = '#5a4a32'; x.font = '22px serif';
  for(let r = 0; r < 14; r++){ const y = 40 + r * 62, off = ((t * N.speed * (r % 2 ? 1 : -0.7)) % 300 + 300) % 300; for(let X0 = -300 + off; X0 < W + 30; X0 += 30) x.fillText(RUNES[Math.abs(Math.floor(X0 / 30) * 7 + r * 3) % RUNES.length], X0, y); }
  x.restore(); }
// Flutter's horizontal ListView stretches each 300px image to the cross-axis
// height. Preserve that full-height moving strip instead of a grid of fake runes.
const homeNorseOrder={key:'',media:[]};
function originalNorseLayer(x,t,N){
 if(!N.media?.length)return;
 const key=JSON.stringify(N.media.map(a=>a.url||a));
 if(homeNorseOrder.key!==key){homeNorseOrder.key=key;homeNorseOrder.media=[...N.media];for(let i=homeNorseOrder.media.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[homeNorseOrder.media[i],homeNorseOrder.media[j]]=[homeNorseOrder.media[j],homeNorseOrder.media[i]];}}
 const media=homeNorseOrder.media,w=N.height||300,gap=N.gap||0,step=w+gap,y=HH*(N.y||0),bottom=STATE.S?.safeArea?.bottom??28,h=HH-y-bottom;
 const travel=t*N.speed*(N.direction==='right'?1:-1),phase=Math.floor(travel/step),off=((travel%step)+step)%step;
 x.save();x.globalAlpha=N.opacity;x.beginPath();x.rect(0,y,W,h);x.clip();
 for(let col=-1;col<Math.ceil(W/step)+1;col++){const a=media[((col-phase)%media.length+media.length)%media.length],im=img(a.url||a);if(ok(im))cover(x,im,col*step+off,y,w,h);}
 x.restore();
}
function drawHomeTile(x,tl,T,B,X,y,cw,ch,t,i,second=false){
 if(!tl?.show)return;
 const [dx,dy]=motionOffset(T.motion,t,i);X+=dx;y+=dy;
 const scale=T.icon/55,iw=(tl.width||55)*scale,ih=(tl.height||55)*scale;
 const textHeight=T.t.size*1.25,pad=tl.pad||0,button=tl.kind==='button';
 const label=!(second&&i===1),h=button?B.h:ih;
 const block=h+(label?textHeight+pad:0)+(i===3&&!second?10:0),top=y+(ch-block)/2;
 box(x,X,y,cw,ch,T.box);
 if(button){const text=tl.buttonText||tl.label,bw=Math.min(cw,tw(x,B.t,text)+32);box(x,X+(cw-bw)/2,top,bw,B.h,B.box);tx(x,B.t,text,X+cw/2,top+B.h/2+B.t.size*.36,'center',bw-12);}
 else if(tl.icon){x.save();rr(x,X+(cw-iw)/2,top,iw,ih,Math.min(8,iw/2));x.clip();cover(x,img(tl.icon),X+(cw-iw)/2,top,iw,ih);x.restore();}
 if(label)tx(x,T.t,tl.label,X+cw/2,top+h+pad+T.t.size,'center',cw);
 if(tl.target)hit(X,y,cw,ch,{type:'navigate',target:tl.target,pageType:tl.pageType});
}
function drawSHome(x, t, S){
 bgDraw(x,S.bg);norseLayer(x,t,S.norse);
 const P=S.profile;if(P.show){const X0=W-P.size-(P.x||0),Y0=HH*(P.y??60/HH);box(x,X0,Y0,P.size,P.size,P.box);if(P.icon&&ok(img(P.icon)))contain(x,img(P.icon),X0,Y0,P.size,P.size,4);else{x.fillStyle='#fff';x.beginPath();x.arc(X0+P.size/2,Y0+P.size*.34,P.size*.14,0,7);x.fill();x.beginPath();x.ellipse(X0+P.size/2,Y0+P.size*.73,P.size*.28,P.size*.16,0,Math.PI,0);x.fill();}}
 const Lg=S.logo,lw=W*Lg.size;if(Lg.img){x.save();if(Lg.glow){x.shadowColor=Lg.glowColor||'#e9ffff';x.shadowBlur=Lg.glow;}if(Lg.fit==='cover'){x.beginPath();x.rect((W-lw)/2,HH*Lg.y,lw,lw);x.clip();cover(x,img(Lg.img),(W-lw)/2,HH*Lg.y,lw,lw);}else contain(x,img(Lg.img),(W-lw)/2,HH*Lg.y,lw,lw);x.restore();}
 if(S.title.show)tx(x,S.title.t,S.title.text,W/2,HH*S.title.y,'center',W-20);
 const Se=S.search;if(Se.show){const y=HH*Se.y;box(x,Se.margin,y,W-Se.margin*2,Se.h,Se.box);tx(x,Se.t,Se.text,Se.margin+12,y+Se.h/2+Se.t.size*.36,'left',W-Se.margin*2-24);}
 const O=S.odin;if(O.show&&O.img){const y=HH*O.y,X=(W-O.size)/2,h=O.size*(O.ratio||1.4);box(x,X,y,O.size,h,O.box);x.save();rr(x,X,y,O.size,h,Math.min(O.box.radius,O.size/2));x.clip();cover(x,img(O.img),X,y,O.size,h);x.restore();}
 const T=S.tiles,B=S.btns,cols=Math.round(T.cols),cw=(W-T.margin*2-(cols-1)*T.gap)/cols;
 if(T.layout==='original'){
  const first=[1,2,3,4,9,10,11,12],second=[5,6,7,8],firstH=T.firstHeight,secondH=T.secondHeight,start=HH*T.y;
  // Keep each original GridView's clipping/spacing, including its partly visible
  // second row. These are editable source elements, not a flattened screenshot.
  for(const [list,y,height,ratio,isSecond]of [[first,start,firstH,.9,false],[second,start+firstH+T.rowGap,secondH,1.1,true]]){
   const ch=cw/ratio;x.save();x.beginPath();x.rect(0,y,W,height);x.clip();
   list.forEach((id,i)=>drawHomeTile(x,T['t'+id],T,B,T.margin+(i%cols)*(cw+T.gap),y+Math.floor(i/cols)*(ch+T.rowGap),cw,ch,t,i,isSecond));
   if(isSecond)tx(x,T.t,T.t6.label,T.margin+cw/2,y+ch+T.rowGap+T.t.size,'center',cw);
   x.restore();
  }
 }else{
  [1,2,3,4,5,6,7,8].filter(i=>T['t'+i]?.show).forEach((id,i)=>drawHomeTile(x,T['t'+id],T,B,T.margin+i%cols*(cw+T.gap),HH*T.y+Math.floor(i/cols)*(T.icon+T.t.size+14+T.rowGap),cw,T.icon+T.t.size+18,t,i));
 }
 [1,2,3,4].map(i=>B['b'+i]).filter(b=>b?.show).forEach((b,i)=>{const [dx,dy]=motionOffset(B.motion,t,i),y=HH*B.y+i*(B.h+B.gap)+dy,bw=B.fitText?Math.min(W-20,(tw(x,B.t,b.text)+32+(b.img?B.h:0))*B.w/.36):W*B.w,X=(W-bw)/2+dx;box(x,X,y,bw,B.h,B.box);if(b.target)hit(X,y,bw,B.h,{type:'navigate',target:b.target,pageType:b.pageType});if(b.img)contain(x,img(b.img),X+5,y+4,B.h-8,B.h-8);tx(x,B.t,b.text,W/2+dx+(b.img?B.h/3:0),y+B.h/2+B.t.size*.36,'center',bw-16-(b.img?B.h:0));});
}
function drawBrowse(x, t, S){
  loadBrowse(); bgDraw(x, S.bg); norseLayer(x, t, S.norse);
  const list = browseList(), G2 = S.grid, cols = Math.round(G2.cols), cw = (W - G2.margin * 2 - (cols - 1) * G2.gap) / cols, th = cw * G2.tileH, top = HH * G2.top;
  const rows = Math.ceil(list.length / cols), rowH = th + G2.gap, total = Math.max(1, rows * rowH), sc = rows * rowH > HH - top ? feedOffset(t, G2.scroll, total, HH - top) : 0;
  x.save(); x.beginPath(); x.rect(0, top, W, HH - top); x.clip();
  for(let rep = 0; rep < (sc ? 2 : 1); rep++) list.forEach((s, i) => { const c = i % cols, r = Math.floor(i / cols), X0 = G2.margin + c * (cw + G2.gap), y = top + 6 + r * rowH - sc + rep * total; if(y > HH || y + th < top) return;
    box(x, X0, y, cw, th, G2.box);if(y+th>top&&y<HH-110)hit(X0,Math.max(top,y),cw,Math.max(0,Math.min(y+th,HH-110)-Math.max(top,y)),{type:'navigate',target:'store',storeId:s.id}); const textH = (G2.name ? G2.nameT.size + 6 : 0) + (G2.town ? G2.townT.size + 4 : 0), ls = Math.min(cw, th - textH - 8) * G2.logo;
    if(s.logo_url) contain(x, logoImg(fixUrl(s.logo_url)), X0 + (cw - ls) / 2, y + (th - textH - ls) / 2, ls, ls);
    let yy = y + th - textH + (G2.name ? G2.nameT.size : 0); if(G2.name) tx(x, G2.nameT, s.name, X0 + cw / 2, yy, 'center', cw - 10);
    if(G2.town){ yy += G2.townT.size + 4; tx(x, G2.townT, (String(s.address || '').match(/,\s*([^,]+),\s*FL/i) || [])[1] || '', X0 + cw / 2, yy, 'center', cw - 10); } });
  if(BROWSE.all && !list.length) tx(x, TXT(13, '#8a8f98'), 'No live stores in this category', W / 2, top + 50, 'center');
  x.restore();
  x.save(); x.fillStyle = S.bg.color; x.globalAlpha = 0.92; x.fillRect(0, 0, W, top); x.restore();
  const Hd = S.head; tx(x, Hd.t, Hd.text || BTYPES[BROWSE.type] || 'Stores', W / 2, HH * Hd.y, 'center', W - 70);
  if(Hd.back){hit(4,HH*Hd.y-Hd.t.size,44,44,{type:'navigate',target:'shome'}); x.strokeStyle = Hd.t.color; x.lineWidth = 2.5; x.beginPath(); x.moveTo(26, HH * Hd.y - Hd.t.size * 0.65); x.lineTo(16, HH * Hd.y - Hd.t.size * 0.3); x.lineTo(26, HH * Hd.y + Hd.t.size * 0.05); x.stroke(); }
  const Se = S.search; if(Se.show){ const y = HH * Se.y; box(x, Se.margin, y, W - Se.margin * 2, Se.h, Se.box); tx(x, Se.t, Se.text, Se.margin + 16, y + Se.h / 2 + Se.t.size * 0.36, 'left', W - Se.margin * 2 - 30); }
  const Ch = S.chips; if(Ch.show){ const towns = ['All', ...[...new Set(list.map(s => (String(s.address || '').match(/,\s*([^,]+),\s*FL/i) || [])[1]).filter(Boolean))].sort()]; let cx = 14; const y = HH * Ch.y;
    towns.forEach((tn, i) => { const tt = i === 0 ? Ch.onT : Ch.t, w = tw(x, tt, tn) + 22, h = tt.size + 14; if(cx > W) return; box(x, cx, y, w, h, i === 0 ? Ch.on : Ch.box); tx(x, tt, tn, cx + w / 2, y + h / 2 + tt.size * 0.36, 'center'); cx += w + 8; }); }
}

const norseExtras=()=>[M('norse.media','Norse artwork / replacement images & videos'),R('norse.height','Artwork size',20,300,1),Sel('norse.style','Artwork layout',[['original-strip','Original full-height strip'],['grid','Artwork grid']]),R('norse.rows','Artwork rows (grid)',1,12,1),R('norse.gap','Space between artwork',0,100,1),R('norse.y','Artwork starts down screen',0,.95,.01),Sel('norse.direction','Scroll direction',[['left','Right to left'],['right','Left to right']])];
for(const P of Object.values(PAGES)){
 const existed=!!P.defaults.norse;
 P.defaults.norse=Object.assign({on:false,speed:10,opacity:.25,media:[],height:100,rows:3,gap:16,y:.05,direction:'left'},P.defaults.norse||{});
 if(existed){for(const sec of P.sections)for(const g of sec.groups)if(g.name==='Scrolling Norse art')g.ctrls.push(...norseExtras());}
 else if(false)P.sections.push({id:'norse',name:'Scrolling Norse art',sub:'Reuse artwork, images or video',groups:[{name:'Scrolling Norse art',ctrls:[K('norse.on','Show it'),R('norse.speed','Scroll speed',0,60,.5),R('norse.opacity','Strength / opacity',0,1,.01),...norseExtras()]}]});
 P.defaults._studioLayers=[];
 P.sections.push({id:'design',name:'Add images & buttons',sub:'Shared folders, layers, text, frames & motion',groups:[]});
}
const LEGACY_SHOME_DEFAULTS=JSON.parse(JSON.stringify(PAGES.shome.defaults));
PAGES.shome.defaults=ShoppingHomeSource.defaults(LEGACY_SHOME_DEFAULTS);
/* ======================= STATE / SAVE ======================= */
const STATE = { page: 'home', S: null, sec: null, t0: performance.now() };
let navigationEpoch=0,cloudEditorFlush=null;
const cloudSourceAssignments=new WeakMap();
const deep = (o) => JSON.parse(JSON.stringify(o));
function merge(d, s){ const o = deep(d); for(const k of Object.keys(s||{})){ if(['__proto__','prototype','constructor'].includes(k))continue; if(s[k] && typeof s[k]==='object' && !Array.isArray(s[k]) && o[k] && typeof o[k]==='object') o[k] = merge(o[k], s[k]); else o[k] = s[k]; } return o; }
const get = (o, p) => p.split('.').reduce((a, k) => a == null ? a : a[k], o);
function set(o, p, v){ const ks = p.split('.'); let a = o; for(let i=0;i<ks.length-1;i++){ a = a[ks[i]] = a[ks[i]] || {}; } a[ks[ks.length-1]] = v; }
const saveTimers = new Map();
const editHistory=new Map();
const sharedPages=RUNTIME?null:StudioSaveGuard.create({request:async(path,options)=>{const r=await fetch(SB.url+path,{...options,headers:H(options.headers)});if(!r.ok)throw Error(r.status===409?'Someone created this shared page while you were editing. Reload the shared version.':'Shared save failed. Your edit is kept on this computer.');return r.json();},writeLocal:(id,json)=>localStorage.setItem('asgard-'+id,json)});
let pageSaveNotice=0;
function rememberPage(){let h=editHistory.get(STATE.page);if(!h){h={items:[deep(STATE.S)],at:0};editHistory.set(STATE.page,h);}const snap=JSON.stringify(STATE.S);if(JSON.stringify(h.items[h.at])!==snap){h.items=h.items.slice(0,h.at+1);h.items.push(deep(STATE.S));if(h.items.length>120)h.items.shift();h.at=h.items.length-1;}}
function save(record=true){ if(RUNTIME)return; StudioWorkspaceCore.enforceLocks(STATE.S);if(record)rememberPage(); const page=STATE.page, id=docId(page), snapshot=deep(STATE.S),notice=++pageSaveNotice; $('#saveState').textContent = '● Saving…'; clearTimeout(saveTimers.get(page)); saveTimers.set(page, setTimeout(async () => {
  try { await sharedPages.save(id,page,snapshot);if(notice===pageSaveNotice&&STATE.page===page)$('#saveState').textContent='● All changes saved'; }
  catch(e){if(notice===pageSaveNotice&&STATE.page===page){$('#saveState').textContent='● Kept locally · shared save needs attention';StudioWorkbench?.status(e.message,true);}}
}, 700)); }
async function load(page){
  if(RUNTIME){if(page!==RUNTIME.envelope.page)throw Error('Runtime page does not match approved design');return merge(PAGES[page].defaults,RUNTIME.envelope.settings||{});}
  let s = null,stamp=null,sharedLoaded=false;
  try { const r = await fetch(SB.url + '/rest/v1/studio_designs?id=eq.' + docId(page) + '&select=data,updated_at', { headers: H() }); if(r.ok){ const j = await r.json(); s = j[0] && j[0].data;stamp=j[0]?.updated_at??null;sharedLoaded=true; } } catch(e){}
  if(!s){ try { s = JSON.parse(localStorage.getItem('asgard-' + docId(page)) || 'null'); } catch(e){} }
  if(!s && page === 'convo'){ try { const r = await fetch(SB.url + '/rest/v1/raven_scene_settings?select=*&limit=1', { headers: H() }); if(r.ok){ const j = await r.json(); if(j[0]){ s = j[0]; delete s.id; } } } catch(e){} }
  if(page==='shome')s=ShoppingHomeSource.migrate(s,LEGACY_SHOME_DEFAULTS,PAGES.shome.defaults);
  const result=merge(PAGES[page].defaults,s||{});if(sharedLoaded)sharedPages.loaded(docId(page),stamp,result);return result;
}
async function pushToApp(){
  if(RUNTIME)return;
  const S = STATE.S, keys = ['day_speed','night_speed','cloud_speed','cloud_padding','cloud_growth_ms','ground_brightness','cloud_shadow','message_spacing','cloud_variety','ambient_count','ambient_speed','ambient_scale','ambient_opacity','water_shimmer','earth_mode'];
  const body = {}; keys.forEach(k => body[k] = S[k]); body.earth_mode = S.earth && S.earth.night ? 1 : 0;
  try { const r = await fetch(SB.url + '/rest/v1/raven_scene_settings?id=eq.1', { method:'PATCH', headers: H({ 'Content-Type':'application/json', Prefer:'return=representation' }), body: JSON.stringify(body) });
    const j = r.ok ? await r.json() : []; alert(r.ok && j.length ? 'Sent. The app reads these on the conversation screen.' : 'Not sent: the app settings table only accepts signed-in edits. Your settings are saved in the studio.'); } catch(e){ alert('Could not reach the app.'); }
}

/* ======================= UI ======================= */
function navigationError(error){$('#pagePick').value=STATE.page;$('#saveState').textContent='● Could not leave this editor · edits kept here';window.StudioWorkbench?.status(error.message,true);}
async function selectFeature(id){
 if(RUNTIME||!STATE.S||!PAGES[STATE.page].sections.some(s=>s.id===id))return false;
 const epoch=++navigationEpoch,page=STATE.page,document=STATE.S;
 if(id===STATE.sec){$('#pagePick').value=page;return true;}
 try{await flushCloudEditor();}catch(error){navigationError(error);return false;}
 if(epoch!==navigationEpoch||STATE.page!==page||STATE.S!==document)return false;
 STATE.sec=id;AsgardStudioLayout.rememberFeature(id);
 const q=new URLSearchParams(location.search);q.set('page',page);if(id==='rocks')q.set('section','rocks');else q.delete('section');history.replaceState(null,'','?'+q.toString());
 $('#pagePick').value=page;nav();panel();return true;
}
function nav(){
  const P = PAGES[STATE.page]; const n = $('#secNav'); n.innerHTML = '<div class="cap">THIS PAGE</div>';
  P.sections.forEach(s => { const b = document.createElement('button'); b.className = 'sec' + (STATE.sec === s.id ? ' on' : ''); b.innerHTML = `<i>◆</i><span><b>${s.name}</b><small>${s.sub}</small></span>`; b.onclick = () => selectFeature(s.id); n.appendChild(b); });
  (P.actions || []).forEach(([label, fn]) => { const b = document.createElement('button'); b.className = 'cosmic'; b.innerHTML = `<b>▶ ${label}</b>`; b.onclick = fn; n.appendChild(b); });
  AsgardStudioLayout.setPage(STATE.page); $('#pgTitle').textContent = P.title; $('#docTitle').textContent = P.title; $('#pushBtn').hidden = !P.push;
}
// Redraw the controls after a click without throwing you back to "Choose an option": same option stays open, same scroll spot
function redraw(){
  const name = window.__studioOption || '', keep = [];
  for(let n = document.getElementById('panel'); n && n !== document.body; n = n.parentElement) if(n.scrollTop > 0) keep.push([n, n.scrollTop]);
  panel();
  if(name && window.AsgardStudioLayout) AsgardStudioLayout.select(name, false);
  for(const [n, top] of keep) n.scrollTop = top;
  requestAnimationFrame(() => { for(const [n, top] of keep) n.scrollTop = top; });
}
function panel(){
  if(!STATE.S)return;
  if(STATE.sec==='catalog'&&STATE.page==='store'){ROCK_NAV.hideEditor();$('#panel').classList.remove('rn-editor');STORE_WORKBENCH.panel($('#panel'));return;}
  if(STATE.sec==='design'){ROCK_NAV.hideEditor();$('#panel').classList.remove('rn-editor');PAGE_TOOLS.panel($('#panel'));return;}
  if(STATE.sec==='cloudvid'){ROCK_NAV.hideEditor();const pn=$('#panel');pn.classList.remove('rn-editor');pn.innerHTML='';const f=document.createElement('iframe');f.src='studio-effects.html?embed=1';f.title='Cloud footage editor';f.style.cssText='width:100%;height:calc(100vh - 230px);min-height:600px;border:0;border-radius:8px;background:#0e1316';pn.append(f);AsgardStudioLayout.custom(pn,'Cloud videos · clip editor');return;}
  if(STATE.sec==='rocks'){ROCK_NAV.showEditor($('#panel'));return;}ROCK_NAV.hideEditor();$('#panel').classList.remove('rn-editor');
  const P = PAGES[STATE.page], sec = P.sections.find(s => s.id === STATE.sec) || P.sections[0], pn = $('#panel'); pn.innerHTML = '';
  sec.groups.forEach(g => { const d = document.createElement('details'); d.className = 'pg-grp'; d.dataset.studioGroup = g.name; d.open = true; d.innerHTML = `<summary>${g.name}</summary>`;
    g.ctrls.forEach(c => { const v = get(STATE.S, c.k); let el;
      if(c.t === 'r'){ el = document.createElement('div'); el.className = 'pg-row'; el.innerHTML = `<label>${c.label}<em>${fmt(v)}</em></label><input type="range" min="${c.min}" max="${c.max}" step="${c.step}" value="${v}">`;
        const inp = el.querySelector('input'), em = el.querySelector('em'); inp.oninput = () => { const nv = parseFloat(inp.value); set(STATE.S, c.k, nv); em.textContent = fmt(nv); save(); }; }
      else if(c.t === 'k'){ el = document.createElement('label'); el.className = 'pg-chk'; el.innerHTML = `<input type="checkbox" ${v ? 'checked' : ''}> ${c.label}`; el.querySelector('input').onchange = (e) => { set(STATE.S, c.k, e.target.checked); save(); }; }
      else if(c.t === 'c'){ el = document.createElement('div'); el.className = 'pg-row'; el.innerHTML = `<label>${c.label}</label><input type="color" value="${/^#/.test(v) ? v : '#ffffff'}">`; el.querySelector('input').oninput = (e) => { set(STATE.S, c.k, e.target.value); save(); }; }
      else if(c.t === 'direction'){el=StudioEarthTools.direction({get:()=>get(STATE.S,c.k),change:n=>{set(STATE.S,c.k,n);save();}});}
      else if(c.t === 'pl' && window.StudioEarthTools && EARTH_PLAYER){el=StudioEarthTools.playlist({getState:()=>STATE.S,change:list=>{set(STATE.S,c.k,list);save();},player:EARTH_PLAYER,available:EARTH_VIDEOS,original:RAVEN_CLIPS,src:p=>runtimeAsset(SB.url+'/storage/v1/object/public/raven_earth/'+p)});}
      else if(c.t === 'pl'){ el = document.createElement('div'); el.className = 'pg-row map-playlist'; el.style.display = 'block'; const list = Array.isArray(v) ? v.map(o => Object.assign({}, o)) : []; const hid = document.createElement('input'); hid.type = 'hidden';
        const commit = () => { set(STATE.S, c.k, list); save(); redraw(); }, thumb = (p, slot) => { const ck = (slot || 'list') + ':' + p; if(window.__plThumbs && __plThumbs[ck]) return __plThumbs[ck]; window.__plThumbs = window.__plThumbs || {}; const vd = __plThumbs[ck] = document.createElement('video'); vd.dataset.src = SB.url + '/storage/v1/object/public/raven_earth/' + p + '#t=1'; vd.muted = true; vd.loop = true; vd.playsInline = true; vd.preload = 'none'; plLazy(vd); vd.style.cssText = 'width:112px;height:63px;object-fit:cover;border-radius:6px;flex:none;background:#000'; vd.onmouseenter = () => vd.play().catch(()=>{}); vd.onmouseleave = () => vd.pause(); return vd; };
        const h1 = document.createElement('b'); h1.textContent = 'Play order (' + list.length + ' maps) — each map plays to its end, then the next'; el.append(hid, h1);
        list.forEach((m, i) => { const r = document.createElement('div'); r.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:6px 0;padding:6px;border:1px solid #2a3a42;border-radius:8px;min-width:0';
          const num = document.createElement('b'); num.textContent = i + 1; num.style.cssText = 'width:22px;text-align:center;color:#ffb347'; const nm = document.createElement('div'); nm.style.cssText = 'flex:1;min-width:0;overflow:hidden'; nm.innerHTML = '<div style="font-size:13px"></div><small style="color:#8fa3ab"></small>'; nm.firstChild.textContent = m.name || m.p; nm.lastChild.textContent = m.p.split('/')[0];
          const sp = document.createElement('label'); sp.style.cssText = 'font-size:12px;color:#8fa3ab'; sp.textContent = 'Speed '; const si = document.createElement('input'); si.type = 'number'; si.step = '0.05'; si.min = '0.05'; si.max = '4'; si.value = m.speed; si.style.cssText = 'width:58px;background:#0f1519;color:#e8eff1;border:1px solid #3a4a52;border-radius:5px;padding:4px 6px;font-size:13px'; si.onchange = () => { const n = parseFloat(si.value); if(isFinite(n) && n > 0){ list[i].speed = n; commit(); } }; sp.append(si);
          const mk = (txt, tip, fn, dis) => { const x = document.createElement('button'); x.type = 'button'; x.className = 'ghost'; x.textContent = txt; x.title = tip; x.disabled = !!dis; x.onclick = () => { fn(); commit(); }; x.style.cssText = 'flex:none;padding:5px 9px;min-width:0'; return x; };
          const bar = document.createElement('div'); bar.style.cssText = 'flex:1 1 100%;display:flex;align-items:center;justify-content:flex-end;gap:6px;flex-wrap:wrap'; bar.append(sp, mk('↑', 'Play earlier', () => { [list[i - 1], list[i]] = [list[i], list[i - 1]]; }, i === 0), mk('↓', 'Play later', () => { [list[i + 1], list[i]] = [list[i], list[i + 1]]; }, i === list.length - 1), mk('✕', 'Take out of the playlist', () => { list.splice(i, 1); }, list.length <= 1)); r.append(num, thumb(m.p), nm, bar); el.append(r); });
        const h2 = document.createElement('b'); h2.textContent = 'All your map videos — click one to add it to the end'; h2.style.cssText = 'display:block;margin-top:14px'; const grid = document.createElement('div'); grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin-top:6px';
        for(const p of EARTH_VIDEOS){ const inList = list.some(m => m.p === p); const b = document.createElement('button'); b.type = 'button'; b.title = p; b.style.cssText = 'padding:0;border:3px solid ' + (inList ? '#ffb347' : '#2a3a42') + ';border-radius:8px;background:#000;cursor:pointer;text-align:left;overflow:hidden'; const vv = thumb(p, 'grid'); vv.style.width = '100%'; vv.style.height = '84px'; vv.style.borderRadius = '0'; vv.style.pointerEvents = 'none'; b.onmouseenter = () => vv.play().catch(()=>{}); b.onmouseleave = () => vv.pause();
          const cap = document.createElement('small'); cap.style.cssText = 'display:block;padding:4px 6px;color:#d8eef0;font-size:11px'; cap.textContent = p.replace(/^v\d+\/earth-/, '').replace(/-(continuous|rigid)?-?v\d+\.mp4$/, '').replace(/-/g, ' ') + ' · ' + p.split('/')[0] + (inList ? ' · in playlist' : ''); b.append(vv, cap);
          b.onclick = () => { const known = RAVEN_CLIPS.find(cc => cc[1] === p); list.push({ p, name: known ? known[0] : cap.textContent.split(' · ')[0], speed: known ? known[2] : .4 }); commit(); }; grid.append(b); }
        const reset = document.createElement('button'); reset.type = 'button'; reset.className = 'ghost'; reset.textContent = 'Back to the app\'s original 14 maps and order'; reset.style.marginTop = '10px'; reset.onclick = () => { set(STATE.S, c.k, RAVEN_CLIPS.map(cc => ({ p: cc[1], name: cc[0], speed: cc[2] }))); save(); redraw(); };
        el.append(h2, grid, reset); }
      else if(c.t === 'g'){ el = document.createElement('div'); el.className = 'pg-row cloud-pick'; el.style.display = 'block'; const list = Array.isArray(v) ? v.slice() : []; const lab = document.createElement('label'); lab.textContent = c.label + ' — click to use, click again to take out' + (list.length ? ' (' + list.length + ' in use, they take turns)' : ' (none picked: the original clouds are used)'); const hid = document.createElement('input'); hid.type = 'hidden';
        const grid = document.createElement('div'); grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;width:100%;margin:6px 0 12px';
        for(const u of c.items){ const at = list.indexOf(u); const b = document.createElement('button'); b.type = 'button'; b.title = u.split('/').pop(); b.style.cssText = 'position:relative;padding:4px;border:3px solid ' + (at >= 0 ? '#ffb347' : '#2a3a42') + ';border-radius:8px;background:linear-gradient(#6f8fb3,#cfdbe6);cursor:pointer;height:96px';
          const im = document.createElement('img'); im.src = u; im.alt = ''; im.style.cssText = 'width:100%;height:100%;object-fit:contain;pointer-events:none'; b.append(im);
          if(at >= 0){ const n = document.createElement('b'); n.textContent = at + 1; n.style.cssText = 'position:absolute;left:4px;top:4px;background:#ffb347;color:#201000;border-radius:10px;min-width:20px;height:20px;display:grid;place-items:center;font-size:12px'; b.append(n); }
          b.onclick = () => { const i = list.indexOf(u); if(i >= 0) list.splice(i, 1); else list.push(u); set(STATE.S, c.k, list); save(); redraw(); }; grid.append(b); }
        el.append(lab, hid, grid); }
      else if(c.t === 's' && c.k === 'earth.pick'){ el = document.createElement('div'); el.className = 'pg-row earth-pick'; el.style.display = 'block'; const E = STATE.S.earth; E.list = Array.isArray(E.list) ? E.list : [];
        const nameOf = p => String(p).replace(/^v\d+\/earth-/, '').replace(/-(continuous|rigid)?-?v\d+\.mp4$/, '').replace(/-/g, ' ') + ' · ' + String(p).split('/')[0];
        const lab = document.createElement('label'); lab.textContent = 'Maps (' + EARTH_VIDEOS.length + ') — click to add to the play order, click again to take it out. Hover to play.'; const hid = document.createElement('input'); hid.type = 'hidden';
        const grid = document.createElement('div'); grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px;width:100%;margin:8px 0 14px';
        for(const p of EARTH_VIDEOS){ const at = E.list.indexOf(p), showing = earthSrc(earthNow(E, 0)) === earthSrc(p) && !E.list.length || earthSrc(E.pick) === earthSrc(p); const b = document.createElement('button'); b.type = 'button'; b.title = p; b.style.cssText = 'position:relative;padding:0;border:3px solid ' + (at >= 0 ? '#ffb347' : showing ? '#7fe3e0' : '#2a3a42') + ';border-radius:8px;background:#000;overflow:hidden;cursor:pointer;text-align:left';
          const vd = document.createElement('video'); vd.src = earthSrc(p) + '#t=1'; vd.muted = true; vd.loop = true; vd.playsInline = true; vd.preload = 'metadata'; vd.style.cssText = 'width:100%;height:110px;object-fit:cover;display:block;pointer-events:none';
          b.onmouseenter = () => vd.play().catch(()=>{}); b.onmouseleave = () => vd.pause();
          const cap = document.createElement('small'); cap.textContent = nameOf(p); cap.style.cssText = 'display:block;padding:5px 7px;color:#d8eef0;font-size:12px'; b.append(vd, cap);
          if(at >= 0){ const n = document.createElement('b'); n.textContent = at + 1; n.style.cssText = 'position:absolute;left:6px;top:6px;background:#ffb347;color:#201000;border-radius:12px;min-width:24px;height:24px;display:grid;place-items:center;font-size:13px'; b.append(n); }
          b.onclick = () => { const i = E.list.indexOf(p); if(i >= 0) E.list.splice(i, 1); else E.list.push(p); E.pick = p; save(); redraw(); }; grid.append(b); }
        const ord = document.createElement('div'); ord.style.cssText = 'border:1px solid #2a3a42;border-radius:8px;padding:8px'; const oh = document.createElement('b'); oh.textContent = E.list.length ? 'Play order' : 'Play order — empty: only the map with the blue border plays'; ord.append(oh);
        E.list.forEach((p, i) => { const r = document.createElement('div'); r.style.cssText = 'display:flex;align-items:center;gap:6px;margin-top:6px'; const s = document.createElement('span'); s.textContent = (i + 1) + '. ' + nameOf(p); s.style.flex = '1';
          const mk = (txt, tip, fn, dis) => { const x = document.createElement('button'); x.type = 'button'; x.className = 'ghost'; x.textContent = txt; x.title = tip; x.disabled = !!dis; x.onclick = () => { fn(); save(); redraw(); }; return x; };
          r.append(s, mk('↑', 'Play earlier', () => { [E.list[i - 1], E.list[i]] = [E.list[i], E.list[i - 1]]; }, i === 0), mk('↓', 'Play later', () => { [E.list[i + 1], E.list[i]] = [E.list[i], E.list[i + 1]]; }, i === E.list.length - 1), mk('✕', 'Take out', () => { E.list.splice(i, 1); })); ord.append(r); });
        el.append(lab, hid, grid, ord); }
      else if(c.t === 's'){ el = document.createElement('div'); el.className = 'pg-row'; el.innerHTML = `<label>${c.label}</label><select class="pg-sel">${c.opts.map(([val, lab]) => `<option value="${val}" ${val === v ? 'selected' : ''}>${lab}</option>`).join('')}</select>`; el.querySelector('select').onchange = (e) => { set(STATE.S, c.k, e.target.value); save(); }; }
      else if(c.t === 'x'){ el = document.createElement('div'); el.className = 'pg-row'; el.innerHTML = `<label>${c.label}</label><input type="text" class="pg-sel">`; const ti = el.querySelector('input'); ti.value = v == null ? '' : v; ti.oninput = () => { set(STATE.S, c.k, ti.value); save(); }; }
      else if(c.t==='m'){el=document.createElement('div');el.className='pg-row';const label=document.createElement('label');label.textContent=c.label;const holder=document.createElement('input');holder.type='text';holder.readOnly=true;holder.value=(v||[]).length+' selected';holder.setAttribute('aria-label',c.label);const choose=document.createElement('button');choose.className='ghost';choose.textContent='Choose replacement artwork';const clear=document.createElement('button');clear.className='ghost';clear.textContent=STATE.page==='shome'?'Return to original artwork':'Return to original runes';clear.onclick=()=>{set(STATE.S,c.k,deep(get(PAGES[STATE.page].defaults,c.k)||[]));save();redraw();};const state=STATE.S;choose.onclick=()=>SHARED_MEDIA.open({multiple:true,onSelect:assets=>{if(STATE.S!==state)return;set(state,c.k,assets.map(a=>({url:a.url,kind:a.kind,name:a.name})));save();redraw();}});el.append(label,holder,choose,clear);}
      else if(c.t === 'u'){const state=STATE.S;el=SHARED_MEDIA.field(c.label,v,asset=>{if(STATE.S!==state)return;set(state,c.k,asset.url);save();redraw();},c.accept);}
      el.querySelectorAll('input,select,textarea').forEach(i=>{if(i.dataset.editorLocal==='true')return;if(!i.dataset.control)i.dataset.control=c.k;if(!i.getAttribute('aria-label'))i.setAttribute('aria-label',c.label);});d.appendChild(el); });
    pn.appendChild(d); });
  AsgardStudioLayout.arrange(pn,STATE.sec);
  needsNotes(pn);
}
/* Some controls only show once their content exists. Say what to add instead of leaving sliders that seem dead. */
function needsNotes(pn){const S=STATE.S||{};const add=(prefix,missing,text)=>{if(!missing)return;const bodies=new Set([...pn.querySelectorAll(`[data-control^="${prefix}"]`)].map(i=>i.closest('.tool-page')).filter(Boolean));for(const body of bodies){if(body.querySelector('.needs-note[data-for="'+prefix+'"]'))continue;const n=document.createElement('div');n.className='off-note needs-note';n.dataset.for=prefix;n.textContent=text;(body.querySelector('.tool-title')||body.firstChild)?.after(n);}};
 add('norse.',S.norse&&!(S.norse.media||[]).length,'No artwork is chosen yet, so these settings have nothing to move. Choose replacement artwork below first.');
 const act=S.act;if(act){const icons=[1,2,3,4,5,6].some(k=>act['icon'+k]);add('act.',!icons,'No icons added yet, so size, color and spacing have nothing to show. Add your icons in the icon slots first.');}}
const fmt = (v) => typeof v === 'number' ? (Math.abs(v) >= 10 ? Math.round(v * 10) / 10 : Math.round(v * 1000) / 1000) : v;
async function openPage(page){
  if(RUNTIME){runtimeAction({type:'navigate',target:page});return;}
  if(page!=='raven'&&!PAGES[page]){navigationError(Error('This studio page is unavailable.'));return false;}
  const epoch=++navigationEpoch;
  if(STATE.S){
   // The shell may already have saved through beforePage; unchanged documents are a no-op in StudioSaveGuard.
   try{await savePageNow();}catch(error){if(epoch===navigationEpoch)navigationError(error);return false;}
   if(epoch!==navigationEpoch){$('#pagePick').value=STATE.page;return false;}
   if(page===STATE.page){$('#pagePick').value=page;return true;}
  }
  STORE.scroll=0;STORE.scrollMax=0;
  if(page === 'raven'){ location.href = 'index.html'; return; }
  STATE.page = page; STATE.S = null; STATE.sec = new URLSearchParams(location.search).get('section')||AsgardStudioLayout.lastFeature(page)||PAGES[page].sections[0].id;if(!PAGES[page].sections.some(s=>s.id===STATE.sec))STATE.sec=PAGES[page].sections[0].id; STATE.t0 = performance.now();
  ROCK_NAV.root.hidden=page==='shome'||page==='convo';
  ROCK_NAV.setContext(page,['home','swap','shoppost','deals','share'].includes(page));
  { const q=new URLSearchParams(location.search); q.set('page',page); if(STATE.sec==='rocks') q.set('section','rocks'); else q.delete('section'); if(page!=='store') q.delete('store'); if(page!=='browse') q.delete('type'); history.replaceState(null,'','?'+q.toString()); } $('#pagePick').value = page;
  const loaded=await load(page);if(epoch!==navigationEpoch||STATE.page!==page)return false;STATE.S=loaded;editHistory.set(page,{items:[deep(loaded)],at:0});nav();panel();return true;
}
if(!RUNTIME){
$('#pagePick').onchange = (e) => openPage(e.target.value);
$('#resetBtn').onclick = () => { if(confirm('Put this page back to its starting settings?')){ STATE.S = StudioWorkspaceCore.preserveLocks(STATE.S,PAGES[STATE.page].defaults); save(); redraw(); } };
$('#pushBtn').onclick = ()=>window.StudioTransfer?StudioTransfer.open():pushToApp();
}

PAGES.store.sections.push({id:'catalog',name:'Products & displays',sub:'Search, corrections, grouping, inspection & Forge',groups:[]});

/* Preview auto-scroll is OFF unless Danny turns it on; when off, drag or wheel scrolls the preview by hand. */
let PREVIEW_MOTION=(()=>{try{return localStorage.getItem('asgard-preview-motion')==='1';}catch(e){return false;}})();
function feedOffset(t,speed,total,visible){const span=Math.max(0,total-(visible||0));if(PREVIEW_MOTION||RUNTIME)return (t*speed)%total;STORE.scrollMax=span;return clamp(STORE.scroll,0,span);}
/* ======================= RENDER LOOP ======================= */
const cv = $('#pgCanvas'), ctx = cv.getContext('2d');
const PAGE_TOOLS=StudioPageTools.mount({stage:$('#stage'),canvas:cv,media:SHARED_MEDIA,getState:()=>STATE,save,readOnly:!!RUNTIME,onAction:runtimeAction,arrange:RUNTIME?(()=>{}):AsgardStudioLayout.arrange,selectSection:()=>selectFeature('design')});
const STORE_WORKBENCH=!RUNTIME?StudioStoreWorkbench.mount({url:SB.url,headers:H,getStore:()=>STORE,getDocument:()=>STATE.S,save:savePageNow,media:SHARED_MEDIA,arrange:AsgardStudioLayout.arrange,addLayers:assets=>PAGE_TOOLS.add('image',assets)}):null;
/* While Danny edits a part that only shows for a moment, hold the preview on that moment (not while he's tuning speed or motion). */
const HOLDS={shoppost:{card:S=>S.card&&S.card.auto?S.card.every*(S.card.open/2):null},ads:{take:S=>S.take?S.take.inSec+Math.max(0,S.take.every-2*S.take.inSec)/2:null},swap:{swipe:S=>S.swipe&&S.swipe.auto?S.swipe.every*(1-S.swipe.speed*0.75):null}};
function previewHold(){if(RUNTIME||PREVIEW_MOTION)return null;const f=HOLDS[STATE.page]?.[STATE.sec];if(!f||!STATE.S)return null;const opt=String(window.__studioOption||'');if(/speed|motion|timing/i.test(opt))return null;try{const v=f(STATE.S);return Number.isFinite(v)?v:null;}catch(e){return null;}}
function frame(now){
  if(runtimeStopped)return;
  if(RUNTIME)now=(runtimePaused?runtimePauseAt:now)-runtimePauseOffset;
  const held=previewHold();if(held!=null){STATE.holdBase??=now;now=STATE.holdBase;}else STATE.holdBase=null;const heldT=held;
  runtimeHits.length=0;
  const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
  if(r.width > 0 && (cv.width !== Math.round(r.width * dpr) || cv.height !== Math.round(r.height * dpr))){ cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
  if(STATE.S && r.width > 0){ const sc = cv.width / W; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.setTransform(sc, 0, 0, sc, 0, 0);
    try { if(RUNTIME&&!RUNTIME_PREVIEW&&runtimeNeedsBinding())drawRuntimeUnconnected(ctx,STATE.S);else PAGES[STATE.page].draw(ctx, heldT!=null?heldT:now / 1000, STATE.S, heldT!=null?heldT+30:(now - STATE.t0) / 1000);if(!['shome','browse'].includes(STATE.page))norseLayer(ctx,now/1000,STATE.S.norse); } catch(e){ console.error(e); } }
  PAGE_TOOLS.sync();
  runtimeFrame=requestAnimationFrame(frame);
}
runtimeFrame=requestAnimationFrame(frame);

/* ======================= DRAWING ======================= */
function cover(x, im, dx, dy, dw, dh, ox, oy){ if(!ok(im)) return; const iw=im.videoWidth||im.naturalWidth,ih=im.videoHeight||im.naturalHeight,ir = iw / ih, r = dw / dh; let sw, sh; if(ir > r){ sh = ih; sw = sh * r; } else { sw = iw; sh = sw / r; } const sx = clamp((iw - sw) * (ox ?? 0.5), 0, iw - sw), sy = clamp((ih - sh) * (oy ?? 0.5), 0, ih - sh); x.drawImage(im, sx, sy, sw, sh, dx, dy, dw, dh); }
function rr(x, X, Y, w, h, r){ x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
const bgSrc = (n) => 'bg/bg' + String(clamp(Math.round(n), 1, 23)).padStart(2, '0') + '.jpg';
const RUNES = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';
const POSTS = [ { n:'Freya', c:'Sunrise over the Flagler pier', i:3, likes:241, com:18, sale:false }, { n:'Loki', c:'Selling my old bike, barely used', i:7, likes:56, com:9, sale:true }, { n:'Baldr', c:'Best tacos in Palm Coast, no contest', i:12, likes:412, com:63, sale:false }, { n:'Hel', c:'Storm rolling in over Bunnell', i:16, likes:98, com:12, sale:false }, { n:'Tyr', c:'Gym is packed today', i:20, likes:33, com:4, sale:false } ];

function drawHole(x, X, Y, r, face, t){ if(RUNTIME&&!RUNTIME_PREVIEW)face=null; const g = x.createRadialGradient(X, Y, r * 0.9, X, Y, r * 2.6); g.addColorStop(0, 'rgba(0,0,0,.85)'); g.addColorStop(0.35, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.beginPath(); x.arc(X, Y, r * 2.6, 0, 7); x.fill();
  x.strokeStyle = 'rgba(255,240,220,.25)'; x.lineWidth = 1; x.beginPath(); x.arc(X, Y, r * 1.06, 0, 7); x.stroke();
  x.save(); x.beginPath(); x.arc(X, Y, r, 0, 7); x.clip(); x.fillStyle = '#000'; x.fillRect(X - r, Y - r, 2 * r, 2 * r); if(face){ const im = img('faces/' + face + '.jpg'); if(ok(im)){ x.globalAlpha = 0.9; cover(x, im, X - r * 0.8, Y - r * 0.8, r * 1.6, r * 1.6); } } x.restore(); }

function drawHome(x, t, S){
  const sky = S.sky, P = S.post, A = S.act, D = S.dock, skyH = HH * sky.height;
  x.fillStyle = S.bg; x.fillRect(0, 0, W, HH);
  // feed (drawn first, scrolls under the sky)
  const cardW = W - P.margin * 2, imgH = cardW * P.imgRatio, headH = 44, actH = A.place === 'under' ? A.size + 24 : 8, capH = 40, cardH = headH + imgH + actH + capH;
  const total = POSTS.length * (cardH + P.gap), scroll = feedOffset(t, P.autoScroll, total, HH - skyH);
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
// The cloud grows with the message: words wrap inside the widest-cloud limit and the cloud gets taller line by line
function rvWrap(x, txt, maxW){
  const out = [], limit = Math.max(8, Number(maxW) || 8), split = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined,{granularity:'grapheme'}) : null;
  for(const para of String(txt).split('\n')){ let line = '';
    for(const word of para.trim().split(/\s+/)){ if(!word) continue; const together = line ? line + ' ' + word : word;
      if(x.measureText(together).width <= limit){ line = together; continue; }
      if(line){ out.push(line); line = ''; }
      if(x.measureText(word).width <= limit){ line = word; continue; }
      for(const ch of split ? Array.from(split.segment(word),s=>s.segment) : Array.from(word)){ if(line && x.measureText(line + ch).width > limit){ out.push(line); line = ''; } line += ch; }
    }
    out.push(line);
  }
  return out.length ? out : [''];
}
// Cloud art has empty space around it; like the app (contentBounds) only the visible cloud is stretched around the words
const RV_BOUNDS = new WeakMap();
function rvBounds(im){ let b = RV_BOUNDS.get(im); if(b) return b; const w = im.naturalWidth || im.width, h = im.naturalHeight || im.height; b = { sx: 0, sy: 0, sw: w, sh: h };
  try{ const c = document.createElement('canvas'), k = Math.min(1, 256 / Math.max(w, h)); c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k)); const q = c.getContext('2d'); q.drawImage(im, 0, 0, c.width, c.height); const d = q.getImageData(0, 0, c.width, c.height).data; let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
    for(let y = 0; y < c.height; y++) for(let x = 0; x < c.width; x++) if(d[(y * c.width + x) * 4 + 3] > 24){ if(x < x0) x0 = x; if(x > x1) x1 = x; if(y < y0) y0 = y; if(y > y1) y1 = y; }
    if(x1 > x0 && y1 > y0) b = { sx: x0 / k, sy: y0 / k, sw: (x1 - x0 + 1) / k, sh: (y1 - y0 + 1) / k }; }catch(e){}
  RV_BOUNDS.set(im, b); return b; }
// Rolling time-lapse cloud footage: every frame of the animated cloud picture, played at your speed
const RV_FILMS = {};
function rvFilm(name){ const url = UI + 'raven_cloud_v20/' + name + '.webp'; let f = RV_FILMS[url]; if(f) return f; f = RV_FILMS[url] = { frames: [], dur: [], total: 0, still: img(url) };
  if('ImageDecoder' in window) fetch(runtimeAsset(url)).then(r => r.arrayBuffer()).then(async buf => { const d = new ImageDecoder({ data: buf, type: 'image/webp' }); await d.tracks.ready; const c = d.tracks.selectedTrack.frameCount; for(let i = 0; i < c; i++){ const r = await d.decode({ frameIndex: i }); const bm = await createImageBitmap(r.image); const du = (r.image.duration || 66000) / 1e6; r.image.close(); f.frames.push(bm); f.dur.push(du); f.total += du; } }).catch(() => {});
  return f; }
function rvFrame(f, t, speed, blend){ if(f.frames.length < 2) return ok(f.still) ? { a: f.still } : (f.frames[0] ? { a: f.frames[0] } : null); let tt = (t * speed) % f.total; for(let i = 0; i < f.frames.length; i++){ if(tt < f.dur[i]) return { a: f.frames[i], b: f.frames[(i + 1) % f.frames.length], mix: blend * tt / f.dur[i] }; tt -= f.dur[i]; } return { a: f.frames[0] }; }
// Cloud pieces: same rules as the app (_RvMistScene), with every number adjustable
const RV_MIST = { list: [], last: null, next: 0, nextFar: 3, id: 0 };
function rvRand(a, b){ return a + Math.random() * Math.max(0, b - a); }
function rvMist(x, t, S, F, rects){ const M = RV_MIST, dt = M.last == null ? 0 : clamp(t - M.last, 0, .1); M.last = t; const budget = Math.round(clamp(S.ambient_count, 0, 8));
  if(!budget){ M.list = []; return; }
  M.next -= dt; if(M.next <= 0 && rects.length && M.list.filter(p => !p.far).length < budget){ const r = rects[Math.floor(Math.random() * rects.length)], roll = Math.random() * 100, kind = roll < F.mixSmall ? 's' : roll < F.mixSmall + F.mixMedium ? 'm' : 'l';
    const w = (kind === 's' ? rvRand(F.smallMin, F.smallMax) : kind === 'm' ? rvRand(F.mediumMin, F.mediumMax) : rvRand(F.largeMin, F.largeMax)) * S.ambient_scale, sideways = Math.random() < .7, nx = sideways ? (Math.random() < .5 ? -1 : 1) : (Math.random() - .5) * .5, ny = sideways ? .23 : (Math.random() < .5 ? -1 : 1);
    const ax = nx < -0.3 ? 0 : nx > .3 ? 1 : rvRand(.2, .8), ay = sideways ? rvRand(.2, .8) : (ny < 0 ? 0 : 1);
    const fate = kind === 'l' ? 'drift' : kind === 's' ? (Math.random() * 100 < F.dissolveSmall ? 'dissolve' : 'drift') : (Math.random() * 100 < F.absorbMedium ? 'absorb' : 'drift');
    M.list.push({ id: M.id++, src: r.key, ax, ay, nx, ny, w, kind, fate, age: 0, fade: 0, merge: 0, attach: rvRand(F.attachMin, F.attachMax), life: kind === 's' ? rvRand(F.lifeSmallMin, F.lifeSmallMax) : rvRand(F.lifeMin, F.lifeMax), v: kind === 'l' ? F.largeDrift : rvRand(F.driftMin, F.driftMax), turn: (Math.random() - .5) * F.turn, skin: Math.floor(Math.random() * 5), x: 0, y: 0 });
    M.next = F.every * rvRand(.74, 1.26); } else if(M.next <= 0) M.next = F.every * rvRand(.74, 1.26);
  M.nextFar -= dt; if(M.nextFar <= 0){ if(M.list.filter(p => p.far).length < Math.min(F.farMax, budget)) M.list.push({ id: M.id++, far: true, x: rvRand(25, W - 25), y: rvRand(110, HH - 110), w: rvRand(F.farMin, F.farMaxW) * S.ambient_scale, fate: 'dissolve', age: 0, fade: 0, merge: 0, life: rvRand(F.farLifeMin, F.farLifeMax), turn: (Math.random() - .5) * .7, skin: Math.floor(Math.random() * 5) }); M.nextFar = F.farEvery * rvRand(1, 1.7); }
  const SK = ['cloud-billows-166852-v29', 'cloud-anvil-258398-v29', 'cloud-tower-365034-v29', F.mineFilm, F.peerFilm], byKey = Object.fromEntries(rects.map(r => [r.key, r]));
  for(const p of M.list){ p.age += dt; const src = byKey[p.src];
    if(p.far){ p.x += F.farGroundX * dt; p.y += F.farGroundY * dt; }
    else if(p.age < p.attach){ if(src){ const ox = src.x0 + p.ax * (src.x1 - src.x0) - p.nx * 22, oy = src.y0 + p.ay * (src.y1 - src.y0) - p.ny * 22, g = Math.min(1, p.age / p.attach); p.x = ox + p.nx * p.w * .4 * g; p.y = oy + p.ny * p.w * .4 * g; } else p.fade = Math.min(1, p.fade + dt / F.fadeTime); }
    else if(p.target != null){ const r = byKey[p.target]; if(!r){ p.target = null; p.fade = Math.max(p.fade, .1); } else { p.merge = Math.min(1, p.merge + dt / F.absorbTime); const e = p.merge * p.merge * (3 - 2 * p.merge), ex = clamp(p.mx, r.x0 + 10, r.x1 - 10), ey = clamp(p.my, r.y0 + 10, r.y1 - 10); p.x = p.mx + (ex - p.mx) * e; p.y = p.my + (ey - p.my) * e; if(p.merge >= 1) p.dead = true; } }
    else { p.x += (p.nx * p.v + Math.sin(t * .13 + p.id * 2.1) * F.wander) * dt * S.ambient_speed; p.y += (p.ny * p.v + Math.cos(t * .11 + p.id * .9) * F.wander * .65) * dt * S.ambient_speed;
      if(p.fate === 'absorb' && !p.fade && p.age > p.attach + 4) for(const r of rects){ const pad = p.w * F.absorbReach; if(r.key !== p.src && p.x > r.x0 - pad && p.x < r.x1 + pad && p.y > r.y0 - pad && p.y < r.y1 + pad){ p.target = r.key; p.mx = p.x; p.my = p.y; break; } } }
    if(p.fate !== 'drift' && p.age > p.life && p.target == null) p.fade = Math.min(1, p.fade + dt / F.fadeTime); if(p.fade >= 1) p.dead = true;
    if(p.x < -p.w * 1.5 || p.x > W + p.w * 1.5 || p.y < -p.w || p.y > HH + p.w) p.dead = true; }
  M.list = M.list.filter(p => !p.dead);
  for(const p of M.list){ const ci = img(UI + 'raven_cloud_v20/' + SK[p.skin] + '.webp'); if(!ok(ci)) continue; const g = p.far || p.age >= p.attach ? 1 : Math.min(1, p.age / p.attach), w = p.w * Math.max(.15, g) * (1 - .6 * p.merge), h = w * ci.naturalHeight / ci.naturalWidth * .68;
    x.save(); x.globalAlpha = S.ambient_opacity * F.pieceOpacity * (1 - p.fade) * (1 - .7 * p.merge) * Math.min(1, p.age / .8); x.translate(p.x, p.y); x.rotate(p.turn * p.age * .05); x.drawImage(ci, -w / 2, -h / 2, w, h); x.restore(); }
}
// Your real Raven conversation screen (AsgardRaven _RvConversation), drawn piece for piece.
const RV = { idx: 0, vids: {}, key: '', last: null, since: 0, diag: false };
const EARTH_PLAYER = window.StudioEarthTools?.createPlayer({src:p=>runtimeAsset(SB.url+'/storage/v1/object/public/raven_earth/'+p),width:W,height:HH,nightImage:()=>img(UI+'raven_cloud_v20/london.webp')}) || null;
if(!RUNTIME)window.StudioEarthTools?.bindCanvas(document.getElementById('pgCanvas'),{getState:()=>STATE.S,active:()=>STATE.page==='convo'&&STATE.sec==='earth',change:()=>save()});
// thumbnails in the map list only download once they scroll into view
const plSeen = 'IntersectionObserver' in window ? new IntersectionObserver(es => { for(const e of es) if(e.isIntersecting){ const v = e.target; plSeen.unobserve(v); if(!v.src && v.dataset.src){ v.preload = 'metadata'; v.src = v.dataset.src; } } }) : null;
function plLazy(v){ if(plSeen) plSeen.observe(v); else { v.preload = 'metadata'; v.src = v.dataset.src; } }
// the map videos sit in the page (hidden) so the browser never parks them
function rvHold(){ let d = document.getElementById('rvMapHold'); if(!d){ d = document.createElement('div'); d.id = 'rvMapHold'; d.style.cssText = 'position:fixed;left:-4px;top:-4px;width:2px;height:2px;overflow:hidden;opacity:0;pointer-events:none'; document.body.appendChild(d); } return d; }
function rvVideo(p){ const src = runtimeAsset(SB.url + '/storage/v1/object/public/raven_earth/' + p); let v = RV.vids[src]; if(!v){ v = document.createElement('video'); v.crossOrigin = 'anonymous'; v.muted = true; v.loop = false; v.playsInline = true; v.preload = 'auto'; v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.width = 2; v.height = 2; v.src = src; v.addEventListener('ended', () => { if(v === RV.cur) RV.idx++; }); rvHold().appendChild(v); RV.vids[src] = v; } return v; }
// one-time report of how the map is doing in this browser, sent to the shared relay table
function rvReport(clips){ if(RV.diag || RUNTIME) return; RV.diag = true; setTimeout(() => { try { const c = RV.cur, k = Object.values(RV.vids).map(v => ({ src: v.src.split('/').pop(), ready: v.readyState, net: v.networkState, err: v.error && v.error.code, paused: v.paused, t: Math.round(v.currentTime), dur: Math.round(v.duration || 0) }));
  fetch(SB.url + '/rest/v1/claude_relay', { method: 'POST', headers: H({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }), body: JSON.stringify({ tag: 'map-diag', payload: JSON.stringify({ at: new Date().toISOString(), ua: navigator.userAgent, h264: document.createElement('video').canPlayType('video/mp4; codecs="avc1.640028"'), clips: clips.length, idx: RV.idx, cur: c && c.src.split('/').pop(), drawn: !!RV.last, vids: k, hidden: document.hidden, inFrame: window !== top }) }) }).catch(()=>{}); } catch(e){} }, 15000); }
function rvShadowText(x, str, X, Y, font, color, align){ x.save(); x.font = font; x.fillStyle = color; x.textAlign = align || 'left'; x.textBaseline = 'middle'; x.shadowColor = 'rgba(0,0,0,.87)'; x.shadowBlur = 8; x.fillText(str, X, Y); x.restore(); }
// ===================== Message clouds made from Danny's own time-lapse cloud footage =====================
// Every message sits on a solid base cloud. Around the whole base sit real filmed clouds (his time-lapse loops,
// playing), tucked under the base's edge, so the base is always in the middle of a billowing cloud and the two
// read as one. Each message gets its own clips, sizes, flips, positions and start points, so no two match.
// Pieces tear off the outer part of one of a cloud's own billows (no spinning, nothing popping in), stretch,
// let go, and then drift off, get absorbed by another cloud, or dissolve with the thin parts going first.
const RVC_HOME = new URL('clouds/', (document.currentScript && document.currentScript.src) || location.href).href;
const RVC_CLIPS = [['kling-0', 'fx.useKling'], ['klingb-0', 'fx.useKlingB'], ['c123-0', 'fx.useC123'], ['c258-0', 'fx.useC258']];
const RVC = { meta: null, originals: null, loading: false, sourceKey: '', srcs: {}, gl: null, prog: null, u: null, cv: null, clouds: {}, pieces: [], far: [], nextPiece: 3, nextFar: 1, last: null, warned: false };
const RVC_GOLD = 0.6180339887;
function rvcLoad(S){
  if(!RVC.loading){ RVC.loading = true; fetch(runtimeAsset(RVC_HOME + 'clouds.json')).then(r=>{if(!r.ok)throw Error('Cloud list unavailable');return r.json();}).then(m=>{RVC.originals=m;RVC.sourceKey='';}).catch(e=>console.warn('[clouds] list',e)); }
  if(!RVC.originals)return;
  const sources=S.fx?.cloudSources||{}, key=JSON.stringify(RVC_CLIPS.map(([id])=>[id,sources[id]||null])); if(key===RVC.sourceKey)return;
  RVC.sourceKey=key; RVC.meta=Object.assign({},RVC.originals);
  for(const [id] of RVC_CLIPS){ const custom=sources[id], original=RVC.originals[id]; const url=custom&&typeof custom.url==='string'&&/^https:\/\//.test(custom.url)?custom.url:null;
    const descriptor=url?{...original,file:url,custom:true,speed:clamp(+custom.speed||1,.1,4),fps:clamp(+custom.fps||8,1,60)}:original;
    if(RVC.srcs[id]?.m.file===descriptor.file&&RVC.srcs[id]?.m.speed===descriptor.speed)continue;
    const old=RVC.srcs[id];if(old){old.disposed=true;for(const frame of old.frames)frame.close?.();if(old.tex&&RVC.gl)RVC.gl.deleteTexture(old.tex);}
    RVC.meta[id]=descriptor;rvcSource(id);
  }
  RVC.clouds={};RVC.pieces=[];RVC.far=[];RVC.canvasFrames?.clear();
}
function rvcSource(id){ const m = {...RVC.meta[id]}, s = RVC.srcs[id] = { id, m, frames: [], ready: false, tex: null, up: 0 };
  const url=runtimeAsset(new URL(m.file,RVC_HOME).href);
  fetch(url).then(r=>{if(!r.ok)throw Error('Cloud footage unavailable ('+r.status+')');return r.arrayBuffer();}).then(async buf=>{
    let decoder=null;
    try{
      if('ImageDecoder' in window){ decoder=new ImageDecoder({data:buf,type:'image/webp',premultiplyAlpha:'none',colorSpaceConversion:'none'});await decoder.tracks.ready;
        const n=Math.max(1,decoder.tracks.selectedTrack.frameCount), stride=Math.max(1,Math.ceil(n/160)),keptFrames=Math.ceil(n/stride);m.fps/=stride;
        for(let i=0;i<n;i+=stride){if(s.disposed)return;const r=await decoder.decode({frameIndex:i});const pixels=r.image.displayWidth*r.image.displayHeight;if(pixels>16777216){r.image.close();throw Error('Cloud frame is too large');}
          // At most 24 MiB of decoded RGBA pixels per source, preserving the original small assets at full resolution.
          const factor=Math.min(1,512/r.image.displayWidth,384/r.image.displayHeight,Math.sqrt(6*1024*1024/(keptFrames*pixels))), width=Math.max(1,Math.floor(r.image.displayWidth*factor)),height=Math.max(1,Math.floor(r.image.displayHeight*factor));
          const frame=await createImageBitmap(r.image,{resizeWidth:width,resizeHeight:height,premultiplyAlpha:'none',colorSpaceConversion:'none'});r.image.close();if(s.disposed){frame.close?.();return;}s.frames.push(frame);
        }
      }else{const frame=await createImageBitmap(new Blob([buf],{type:'image/webp'}));if(s.disposed){frame.close?.();return;}s.frames.push(frame);if(!RVC.warned){RVC.warned=true;console.warn('[clouds] Still cloud fallback: animated image decoding is unavailable.');}}
      if(!s.frames.length)return;
      const first=s.frames[0], scaleX=first.width/m.w,scaleY=first.height/m.h;m.w=first.width;m.h=first.height;
      if(m.custom){ const cv=document.createElement('canvas');cv.width=m.w;cv.height=m.h;const cx=cv.getContext('2d',{willReadFrequently:true});cx.drawImage(first,0,0);const pixels=cx.getImageData(0,0,m.w,m.h).data;let l=m.w,t=m.h,r=0,b=0;
        for(let y=0;y<m.h;y+=2)for(let x=0;x<m.w;x+=2)if(pixels[(y*m.w+x)*4+3]>32){l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y);}
        if(r<=l||b<=t){l=0;t=0;r=m.w;b=m.h;}m.bx=l;m.by=t;m.bw=r-l;m.bh=b-t;m.body=[(l+r)/2,(t+b)/2];
        m.puffs=[[l,t,m.bw*.7,m.bh],[l+m.bw*.3,t,m.bw*.7,m.bh],[l,t,m.bw,m.bh]];
      }else if(scaleX!==1||scaleY!==1){m.bx*=scaleX;m.by*=scaleY;m.bw*=scaleX;m.bh*=scaleY;m.body=[m.body[0]*scaleX,m.body[1]*scaleY];m.puffs=m.puffs.map(p=>[p[0]*scaleX,p[1]*scaleY,p[2]*scaleX,p[3]*scaleY]);}
      s.ready=true;
    }finally{decoder?.close();}
  }).catch(e=>{s.error=e.message;console.warn('[clouds]',id,e);});
}
function rvcRb(a, b, n, th){ const c = Math.abs(Math.cos(th)), s = Math.abs(Math.sin(th)); return 1 / Math.pow(Math.pow(c / a, n) + Math.pow(s / b, n), 1 / n); }
// the base's edge walked at even steps, so billows can be spread evenly around it
function rvcEdge(A, B, n){ const N = 96, pts = [], cum = [0]; let tot = 0;
  for(let i = 0; i <= N; i++){ const th = i / N * Math.PI * 2, r = rvcRb(A, B, n, th); pts.push([Math.cos(th) * r, Math.sin(th) * r]); if(i){ tot += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); cum.push(tot); } }
  return { at(u){ const want = ((u % 1) + 1) % 1 * tot; let j = 0; while(j < N - 1 && cum[j + 1] < want) j++; const f = (want - cum[j]) / Math.max(1e-6, cum[j + 1] - cum[j]), p = [pts[j][0] + (pts[j + 1][0] - pts[j][0]) * f, pts[j][1] + (pts[j + 1][1] - pts[j][1]) * f];
      const tx = pts[j + 1][0] - pts[j][0], ty = pts[j + 1][1] - pts[j][1], l = Math.hypot(tx, ty) || 1; return { x: p[0], y: p[1], nx: ty / l, ny: -tx / l }; }, perim: tot }; }
const RVC_VS = `#version 300 es
in vec2 aP; uniform vec4 uRect; uniform vec2 uView; out vec2 vP;
void main(){ vec2 p = uRect.xy + aP * uRect.zw; vP = p; vec2 c = p / uView * 2.0 - 1.0; gl_Position = vec4(c.x, -c.y, 0.0, 1.0); }`;
const RVC_FS = `#version 300 es
precision highp float; precision highp sampler2DArray;
in vec2 vP; out vec4 o;
uniform sampler2DArray uTex; uniform float uLa, uLb, uMix; uniform vec2 uSrcSize, uSrcC;
uniform vec2 uC; uniform float uScale, uFlip, uOpacity, uGain, uContrast, uWarm; uniform vec3 uFill;
uniform int uMode;
uniform float uA, uB, uN, uFeather, uLift, uEven;
uniform vec2 uDir; uniform float uExt, uCut, uCutW; uniform vec2 uOff; uniform float uNeck, uErode; uniform vec4 uCrop;
uniform vec4 uPart, uShape; uniform float uPhase, uClock, uWarp, uNeckWidth, uErosion, uDensityLoss, uOutline;
vec4 tex(vec2 sp){ vec2 uv = sp / uSrcSize; if(uv.x <= 0.0 || uv.y <= 0.0 || uv.x >= 1.0 || uv.y >= 1.0) return vec4(0.0); vec4 c = mix(texture(uTex, vec3(uv, uLa)), texture(uTex, vec3(uv, uLb)), uMix); vec2 d = min(sp, uSrcSize - sp); c.a *= smoothstep(0.0, 5.0, min(d.x, d.y)); return c; }
float fullness(vec2 q, float n){ return pow(pow(abs(q.x),n)+pow(abs(q.y),n),1.0/n); }
vec4 sprite(vec2 q){
  if(uFlip > 0.5) q.x = -q.x;
  vec2 sp = uSrcC + q / uScale; vec4 c = tex(sp);
  if(uCrop.z > 0.0){
    vec2 p = (sp - uCrop.xy - uCrop.zw*.5) / max(uCrop.zw*.5, vec2(1.0));
    float angle = atan(p.y,p.x), ripple = .025*sin(angle*5.0+uPhase)+.018*sin(angle*7.0-uClock*.3+uPhase*2.0);
    float d = fullness(p, uShape.x) / (1.0+ripple);
    c.a *= 1.0-smoothstep(1.0-uShape.y,1.0,d);
  }
  return c;
}
// where q sits along the billow's outward direction: -1 inner side .. 1 outer tip
float along(vec2 q){ return dot(q, uDir) / max(uExt, 1.0); }
float part(vec2 q){
  vec2 side=vec2(-uDir.y,uDir.x), center=uDir*uExt*(uCut+.38);
  vec2 z=vec2(dot(q-center,side)/max(2.0,uPart.x*uPart.y),dot(q-center,uDir)/max(2.0,uPart.x));
  float wisps=1.0+uShape.w*(.07*sin(q.x*.12+uClock*.3+uPhase)+.05*sin(q.y*.19-uClock*.2));
  float mask=1.0-smoothstep(1.0-uPart.w,1.0,fullness(z,uPart.z)/wisps);
  return mask*smoothstep(uCut-.18,uCut+.18,along(q));
}
vec3 grade(vec3 c){ c=mix(c,uFill,uEven); c+=(1.0-c)*uLift; c = (c - 0.5) * uContrast + 0.5; c *= uGain; c += vec3(uWarm, uWarm * 0.4, -uWarm); return clamp(c, 0.0, 1.0); }
void main(){
  vec2 p = vP - uC; vec4 c;
  if(uMode == 0){
    // the base under the words: cloud body, solid, fading into the billows at its edge
    float r = length(p), th = atan(p.y, p.x); float Rb = 1.0 / pow(pow(abs(cos(th)) / uA, uN) + pow(abs(sin(th)) / uB, uN), 1.0 / uN);
    float swell = uOutline*min(uA,uB)*(.55+.25*sin(th*5.0+uPhase+uClock)+.20*sin(th*7.0-uClock*.7));
    float w = 1.0 - smoothstep(Rb - uFeather, Rb+swell, r);
    vec4 b = sprite(p); vec3 rgb = mix(uFill, b.rgb, b.a);
    c = vec4(rgb, w);
  } else if(uMode == 1){
    // a billow of the cloud: its outer part goes missing while a piece is torn from it, and grows back
    c = sprite(p); if(uCutW > 0.0) c.a *= 1.0 - uCutW * part(p);
  } else if(uMode == 2){
    // the torn piece: the outer part of that billow, pulled away by uOff, with a stretchy neck while it tears
    vec2 side=vec2(-uDir.y,uDir.x), q=p-uOff;
    q += side*sin(dot(q,uDir)*.055+uClock+uPhase)*uWarp*uPart.x;
    vec4 s = sprite(q); float a = s.a * part(q); vec3 rgb = s.rgb;
    if(uNeck > 0.001){ for(int k = 1; k < 10; k++){ float f = float(k) / 10.0; vec2 qk = p - uOff * f; float pinch = uNeckWidth + (1.0-uNeckWidth) * abs(2.0 * f - 1.0); vec2 qs = uDir * dot(qk, uDir) + side * dot(qk, side) / pinch; vec4 sk = sprite(qs); float ak = sk.a * part(qs) * uNeck; if(ak > a){ a = ak; rgb = sk.rgb; } } }
    a=1.0-pow(1.0-clamp(a,0.0,1.0),uShape.z);
    if(uErode > 0.0){ float er=min(.995,uErode*uErosion); a = smoothstep(er, min(1.0, er + .35), a) * (1.0-uErode*uDensityLoss) * (1.0-uErode); }
    c = vec4(rgb, a);
  } else { c = sprite(p); }
  vec3 rgb = grade(c.rgb); float a = clamp(c.a * uOpacity, 0.0, 1.0);
  o = vec4(rgb * a, a);
}`;
function rvcGL(pw, ph){ if(RVC.gl === false) return null;
  if(!RVC.gl){ const cv = document.createElement('canvas'); const gl = cv.getContext('webgl2', { premultipliedAlpha: true, alpha: true, antialias: false, depth: false }); if(!gl){ RVC.gl = false; console.warn('[clouds] WebGL2 not available'); return null; }
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    try { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, RVC_VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, RVC_FS)); gl.linkProgram(p); if(!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); RVC.prog = p; }
    catch(e){ console.warn('[clouds] shader', e); RVC.gl = false; return null; }
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    gl.useProgram(RVC.prog); const loc = gl.getAttribLocation(RVC.prog, 'aP'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = {}; for(const n of ['uRect', 'uView', 'uTex', 'uLa', 'uLb', 'uMix', 'uSrcSize', 'uSrcC', 'uC', 'uScale', 'uFlip', 'uOpacity', 'uGain', 'uContrast', 'uWarm', 'uFill', 'uMode', 'uA', 'uB', 'uN', 'uFeather', 'uLift', 'uEven', 'uDir', 'uExt', 'uCut', 'uCutW', 'uOff', 'uNeck', 'uErode', 'uCrop', 'uPart', 'uShape', 'uPhase', 'uClock', 'uWarp', 'uNeckWidth', 'uErosion', 'uDensityLoss', 'uOutline']) U[n] = gl.getUniformLocation(RVC.prog, n);
    RVC.u = U; RVC.cv = cv; RVC.gl = gl; gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.uniform1i(U.uTex, 0); }
  const gl = RVC.gl; if(RVC.cv.width !== pw || RVC.cv.height !== ph){ RVC.cv.width = pw; RVC.cv.height = ph; }
  gl.viewport(0, 0, pw, ph); return gl; }
// footage frames go to the graphics card a few at a time, so nothing stutters
function rvcUpload(gl, s){ if(!s || !s.ready) return false; if(!s.tex){ s.tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D_ARRAY, s.tex); gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, s.m.w, s.m.h, s.frames.length);
    for(const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D_ARRAY, k, v); }
  if(s.up < s.frames.length){ gl.bindTexture(gl.TEXTURE_2D_ARRAY, s.tex); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    for(let k = 0; k < 12 && s.up < s.frames.length; k++, s.up++) gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, s.up, s.m.w, s.m.h, 1, gl.RGBA, gl.UNSIGNED_BYTE, s.frames[s.up]); }
  return s.up >= s.frames.length; }
function rvcOk(id){ const s = RVC.srcs[id]; return !!(s && s.ready && s.frames.length && (RVC.gl===false || (s.tex && s.up >= s.frames.length))); }
function rvcHex(h){ const m = /^#?([0-9a-f]{6})$/i.exec(String(h || '')); const v = m ? parseInt(m[1], 16) : 0xf2f4f6; return [(v >> 16 & 255) / 255, (v >> 8 & 255) / 255, (v & 255) / 255]; }
function rvcRand(seed){ let h = 2166136261 >>> 0; for(const ch of String(seed)){ h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return () => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return (h % 1000003) / 1000003; }; }
// a filmed cloud drawn as one billow: size h (px tall), centred at (x, y)
function rvcSprite(id, h, pi){ const m = RVC.srcs[id].m, c = pi == null ? [m.bx, m.by, m.bw, m.bh] : m.puffs[pi % m.puffs.length], scale = h / c[3]; return { scale, w: c[2] * scale, h, sc: [c[0] + c[2] / 2, c[1] + c[3] / 2], crop: [c[0],c[1],c[2],c[3]] }; }
function rvcDraw(gl, d, F, S, t){ const U = RVC.u, s = RVC.srcs[d.src]; if(!rvcOk(d.src)) return;
  const n = s.frames.length, rate=(1+Math.sin(d.off||0)*F.motionVariety*S.cloud_variety)*(d.rate??1)*(s.m.speed||1), pos = ((t * s.m.fps * S.cloud_speed * rate + d.off) % n + n) % n, la = Math.floor(pos), lb = (la + 1) % n;
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D_ARRAY, s.tex);
  gl.uniform2f(U.uView, W, HH); gl.uniform4f(U.uRect, d.rx, d.ry, d.rw, d.rh);
  gl.uniform1f(U.uLa, la); gl.uniform1f(U.uLb, lb); gl.uniform1f(U.uMix, (pos - la) * clamp(F.blend, 0, 1));
  gl.uniform2f(U.uSrcSize, s.m.w, s.m.h); gl.uniform2f(U.uSrcC, d.sc[0], d.sc[1]); gl.uniform2f(U.uC, d.cx, d.cy); gl.uniform1f(U.uScale, d.scale); gl.uniform1f(U.uFlip, d.flip ? 1 : 0);
  gl.uniform1i(U.uMode, d.mode); gl.uniform1f(U.uOpacity, clamp(d.alpha, 0, 1));
  gl.uniform1f(U.uGain, d.mode===2&&!F.pInherit?F.pBright:F.gain); gl.uniform1f(U.uContrast, d.mode===2&&!F.pInherit?F.pContrast:F.contrast); gl.uniform1f(U.uWarm, F.warm); gl.uniform3fv(U.uFill, rvcHex(F.fill));
  gl.uniform1f(U.uA, d.A || 1); gl.uniform1f(U.uB, d.B || 1); gl.uniform1f(U.uN, d.n || 3); gl.uniform1f(U.uFeather, d.feather || 1); gl.uniform1f(U.uLift, F.lift); gl.uniform1f(U.uEven, F.even);
  gl.uniform2f(U.uDir, d.dir ? d.dir[0] : 0, d.dir ? d.dir[1] : -1); gl.uniform1f(U.uExt, d.ext || 1); gl.uniform1f(U.uCut, d.cut || 0.3); gl.uniform1f(U.uCutW, d.cutW || 0);
  gl.uniform2f(U.uOff, d.ox || 0, d.oy || 0); gl.uniform1f(U.uNeck, d.neck || 0); gl.uniform1f(U.uErode, d.erode || 0); gl.uniform4fv(U.uCrop, d.crop || [0, 0, 0, 0]);
  gl.uniform4fv(U.uPart,d.part||[30,F.pAspect,F.pRound,F.pSoft]);gl.uniform4f(U.uShape,F.edgeRound,F.edgeSoft,d.mode===2?F.pDensity:1,F.pWisps);
  gl.uniform1f(U.uPhase,d.off||0);gl.uniform1f(U.uClock,t*(d.mode===0?F.outlineSpeed:F.pTurbulenceRate));gl.uniform1f(U.uWarp,d.warp||0);
  gl.uniform1f(U.uNeckWidth,F.pNeckWidth);gl.uniform1f(U.uErosion,F.pErode);gl.uniform1f(U.uDensityLoss,F.pDensityLoss);gl.uniform1f(U.uOutline,F.outlineVariety*S.cloud_variety);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }
// the billows of one message cloud, spread evenly around its base (golden-ratio spacing: a new billow never moves the others)
function rvcBillows(c, F, S, t, ids){ const st = RVC.clouds[c.key] || (RVC.clouds[c.key] = { list: [], extra: [] }), v = clamp(S.cloud_variety, 0, 1), size = clamp(F.billowSize, 16, 120), signature=ids.join('|')+':'+F.seed+':'+F.flipOk;
  if(st.signature!==signature){st.signature=signature;st.list=[];st.extra=[];st.inner=null;RVC.pieces=RVC.pieces.filter(p=>p.key!==c.key);}
  const spec = j => { while(st.list.length <= j){ const index=st.list.length,rnd=rvcRand(c.key+':b:'+F.seed+':'+index),pool=ids,prev=index?st.list[index-1].src:null; let src=pool[Math.floor(rnd()*pool.length)%pool.length];if(src===prev&&pool.length>1)src=pool[(pool.indexOf(src)+1)%pool.length];
      st.list.push({ j:index, src, pi:Math.floor(rnd()*8), flip:F.flipOk&&rnd()<.5, variation:rnd()*2-1, out:rnd(), off:rnd()*1000, cutW:0 }); } return st.list[j]; };
  const out = [], per = c.edge.perim; let s = 0, j = 0;
  while(s < per && j < 80){ const b = spec(j++); if(!RVC.srcs[b.src] || !rvcOk(b.src)) continue; const hf=1+b.variation*F.edgeJit/100*v, h = Math.min(size * hf * (1+(b.swell||0)), Math.max(c.B * 2.4, size * .6)), sp = rvcSprite(b.src, h, b.pi), e = c.edge.at(c.u0 + s / per), projected=(Math.abs(e.nx)*sp.w+Math.abs(e.ny)*sp.h)/2,push = -projected+(c.rim||20)*(.65+b.out*.25);
    const along = Math.abs(e.ny) * sp.w + Math.abs(e.nx) * sp.h, step = along * .5 * F.billowSpread, fade = clamp((per - s) / Math.max(1, step * .6), 0, 1);
    out.push({ b, src: b.src, flip: b.flip, off: b.off, x: c.cx + e.x + e.nx * push, y: c.cy + e.y + e.ny * push, nx: e.nx, ny: e.ny, sp, alpha: fade }); s += step; }
  // inside: a few big billows under the base, so the middle is real cloud too
  const inner = st.inner || (st.inner = Array.from({ length: 9 }, (_, i) => {const rnd=rvcRand(c.key+':inside:'+F.seed+':'+i);return { src: ids[Math.floor(rnd() * ids.length) % ids.length], pi: Math.floor(rnd() * 8), flip: rnd() < .5, u: rnd() * 2 - 1, v: rnd() * 2 - 1, hf: .8 + rnd() * .5, off: rnd() * 1000 };}));
  const nIn = clamp(Math.round(c.A * c.B / (size * size * .9)), 1, 9), ins = [];
  for(let i = 0; i < nIn; i++){ const b = inner[i]; if(!rvcOk(b.src)) continue; const h = Math.min(c.B * 2 * b.hf, Math.max(size * 1.4, c.B * 1.2)), sp = rvcSprite(b.src, h, b.pi); ins.push({ b: { cut: 0, cutW: 0 }, inner: true, src: b.src, flip: b.flip, off: b.off, x: c.cx + b.u * Math.max(0, c.A - sp.w * .45), y: c.cy + b.v * Math.max(0, c.B - h * .45), nx: 0, ny: -1, sp, alpha: 1 }); }
  out.unshift(...ins);
  for(const b of st.extra){ if(!rvcOk(b.src)) continue; const h = Math.min(size * b.hf, Math.max(c.B * 2.4, size * .6)), sp = rvcSprite(b.src, h, b.pi), e = c.edge.at(b.u),projected=(Math.abs(e.nx)*sp.w+Math.abs(e.ny)*sp.h)/2,push=-projected+(c.rim||20)*.8;
    out.push({ b, src: b.src, flip: b.flip, off: b.off, x: c.cx + e.x + e.nx * push, y: c.cy + e.y + e.ny * push, nx: e.nx, ny: e.ny, sp, alpha: b.alpha }); }
  return out; }
// tearing, drifting, absorbing and dissolving pieces of the clouds' own billows
function rvcPieces(t, dt, S, F, clouds){ const R = Math.random, P = RVC.pieces, byKey = Object.fromEntries(clouds.map(c => [c.key, c]));
  if(!F.piecesOn){RVC.pieces=[];RVC.nextPiece=t+Math.max(2,F.pEvery);for(const st of Object.values(RVC.clouds)){for(const b of st.list){b.busy=false;b.cutW=0;b.swell=0;b.healAt=null;}st.extra=[];}return;}
  if(clouds.length && t >= RVC.nextPiece){ RVC.nextPiece = t + Math.max(.5,F.pEvery * (1 + (R()*2-1)*F.pJitter));
    if(R()<F.pChance)for(let event=0;event<Math.round(F.pBurst)&&P.length<Math.round(S.ambient_count);event++){
      const parents=clouds.filter(c=>t-(RVC.clouds[c.key].lastTear??-Infinity)>=F.pCooldown);if(!parents.length)break;const c=parents[Math.floor(R()*parents.length)];
      const candidates=(c.bill||[]).filter(x=>!x.inner&&x.alpha>=.99&&!x.b.extra&&!x.b.busy&&((Math.abs(x.x-c.cx)>c.textW/2+F.pClearance)||(Math.abs(x.y-c.cy)>c.textH/2+F.pClearance))).map(x=>({x,weight:Math.max(0,x.nx)*F.pRight+Math.max(0,-x.nx)*F.pLeft+Math.max(0,x.ny)*F.pBottom+Math.max(0,-x.ny)*F.pTop}));
      const total=candidates.reduce((sum,q)=>sum+q.weight,0);if(total<=0)continue;let dice=R()*total,selected=candidates[candidates.length-1];for(const q of candidates){dice-=q.weight;if(dice<=0){selected=q;break;}}
      const x=selected.x,lo=Math.min(F.pieceMin,F.pieceMax),hi=Math.max(F.pieceMin,F.pieceMax),diam=lo+(hi-lo)*Math.pow(R(),1/Math.max(.1,F.pSizeBias));x.b.busy=true;RVC.clouds[c.key].lastTear=t;
      const part=[diam/2,F.pAspect,F.pRound,F.pSoft];x.b.part=part;
      P.push({key:c.key,b:x.b,src:x.src,flip:x.flip,off:x.off,sp:x.sp,dir:[x.nx,x.ny],born:t,state:'swell',cx:x.x,cy:x.y,ox:0,oy:0,vx:0,vy:0,parentVx:0,parentVy:0,erode:0,alpha:0,part,diam,cut:clamp(1-2*F.pieceDepth,-.8,.8)});
    }
  }
  const wind = [F.windX, F.windY-F.pRise], spd = S.ambient_speed;
  for(const p of P){ const par = byKey[p.key];
    p.part=[p.diam/2,F.pAspect,F.pRound,F.pSoft];p.b.part=p.part;
    if(p.state === 'swell'||p.state === 'tear'){ const live = par && (par.bill || []).find(x => x.b === p.b); if(live){ p.parentVx=dt?(live.x-p.cx)/dt:0;p.parentVy=dt?(live.y-p.cy)/dt:0;p.cx = live.x; p.cy = live.y; p.dir = [live.nx, live.ny]; p.sp = live.sp; }
      if(!live){p.dead=true;p.b.busy=false;p.b.cutW=0;continue;}
      const swell=clamp((t-p.born)/Math.max(.1,F.pSwellTime),0,1);p.b.swell=F.pSwell*swell*swell*(3-2*swell);
      if(swell<1)continue;p.state='tear';
      const s = clamp((t - p.born-F.pSwellTime) / Math.max(.2, F.tearTime), 0, 1), e = s * s * (3 - 2 * s),take=clamp(s/.45,0,1);p.alpha=take*take*(3-2*take);p.ox = p.dir[0] * F.tearDist * e; p.oy = p.dir[1] * F.tearDist * e; p.neck = F.neck * Math.pow(1 - s, F.pPinch); p.b.cutW=p.alpha;p.b.cut=p.cut;
      if(s >= 1){ p.state = 'free'; p.freeAt = t; p.neck = 0; p.b.cutW = 1; p.b.healAt = t+F.pHealDelay; const tot = F.pDrift + F.pAbsorb + F.pDissolve || 1, r = R() * tot; p.fate = r < F.pDrift ? 'drift' : r < F.pDrift + F.pAbsorb ? 'absorb' : 'dissolve';
        const lo=Math.min(F.pSpeedMin,F.pSpeedMax),hi=Math.max(F.pSpeedMin,F.pSpeedMax),o2=lo+R()*(hi-lo); p.vx = p.dir[0] * o2 + wind[0]+clamp(p.parentVx,-30,30)*F.pFollow; p.vy = p.dir[1] * o2 + wind[1]+clamp(p.parentVy,-30,30)*F.pFollow;
        if(p.fate === 'absorb'){ let best = null, bd = F.pAttract; for(const c of clouds){ if(c.key === p.key) continue; const d = Math.hypot(c.cx - p.cx, c.cy - p.cy); if(d < bd){ bd = d; best = c; } } p.target = best ? best.key : null; if(!best) p.fate = 'drift'; } } }
    else { const age = t - p.freeAt,phase=t*F.pTurbulenceRate+p.off;
      p.vx += (wind[0]-p.vx)*Math.min(1,dt*F.pAcceleration)+Math.sin(phase)*F.wander*dt; p.vy += (wind[1]-p.vy)*Math.min(1,dt*F.pAcceleration)+Math.cos(phase*.73)*F.wander*dt;
      const wlen=Math.hypot(...wind)||1,side=[-wind[1]/wlen,wind[0]/wlen],cross=p.vx*side[0]+p.vy*side[1],drag=Math.min(1,dt*F.pDrag);p.vx-=side[0]*cross*drag;p.vy-=side[1]*cross*drag;
      const wx = p.cx + p.ox + p.dir[0] * p.sp.h * .3, wy = p.cy + p.oy + p.dir[1] * p.sp.h * .3;
      if(p.fate === 'absorb'){ const tg = byKey[p.target]; if(!tg){ p.fate = 'drift'; } else { const dx = tg.cx - wx, dy = tg.cy - wy, d = Math.hypot(dx, dy) || 1, ta = Math.atan2(-dy, -dx), reach = rvcRb(tg.A, tg.B, tg.n, ta) + F.billowSize * .5 + F.pReach;
          const wantv=F.pApproach,match=clamp(1-(d-reach)/Math.max(1,F.pAttract),0,1)*F.pMatch; p.vx += (dx / d * wantv+(tg.vx||0)*match-p.vx) * Math.min(1, dt * .6); p.vy += (dy / d * wantv+(tg.vy||0)*match-p.vy) * Math.min(1, dt * .6);
          if(d < reach && p.absorbAt == null){ p.absorbAt = t; const st = RVC.clouds[tg.key]; if(st){ // it becomes one of the target's billows where it touched
              const ex = tg.edge, best = { u: 0, d: 1e9 }; for(let i = 0; i < 64; i++){ const q = ex.at(i / 64), dd = Math.hypot(tg.cx + q.x - wx, tg.cy + q.y - wy); if(dd < best.d){ best.d = dd; best.u = i / 64; } }
              p.joined = { extra: true, u: best.u, src: p.src, pi: p.b.pi, flip: p.flip, hf: p.sp.h / Math.max(1, F.billowSize), out: .5, off: p.off, alpha: 0, cutW: 0, j: -1, bornAt: t }; st.extra.push(p.joined); } }
          if(p.absorbAt != null){ const raw=clamp((t-p.absorbAt)/Math.max(.3,F.absorbTime),0,1),a=Math.pow(raw,F.pMergeSoft);p.alpha=1-a;if(p.joined)p.joined.alpha=a;p.vx*=1-Math.min(1,dt*F.pMatch*3);p.vy*=1-Math.min(1,dt*F.pMatch*3);if(raw>=1){p.dead=true;if(p.joined)p.joined.healAt=t;} } } }
      if((p.fate === 'dissolve' && age > F.dissolveAfter)||age>F.pLife){ const start=p.fate==='dissolve'?Math.min(F.dissolveAfter,F.pLife):F.pLife,duration=Math.max(.2,F.fadeTime)*(1+F.pLastWisp),raw=clamp((age-start)/duration,0,1);p.erode=raw;if(raw>=1)p.dead=true; }
      p.ox += p.vx * dt * spd; p.oy += p.vy * dt * spd;
      if(wx < -260 || wx > W + 260 || wy < -260 || wy > HH + 260) p.dead = true; } }
  RVC.pieces = P.filter(p => !p.dead);
  // torn billows grow back; absorbed pieces melt into their new cloud over time
  for(const st of Object.values(RVC.clouds)){ for(const b of st.list) if(b.healAt != null){ b.cutW = 1 - clamp((t - b.healAt) / Math.max(.5, F.regrow), 0, 1);b.swell=F.pSwell*b.cutW; if(b.cutW <= 0){ b.cutW = 0;b.swell=0; b.healAt = null; b.busy = false; } }
    st.extra = st.extra.filter(b => { if(b.healAt == null) return true; b.alpha = 1 - clamp((t - b.healAt - F.regrow) / Math.max(.5, F.regrow), 0, 1); return b.alpha > 0; }); } }
// small whole clouds far below, drifting with the map
function rvcFar(t, dt, S, F, ids){ const R = Math.random, L = RVC.far;
  L.splice(Math.round(F.farMax));
  if(ids.length && t >= RVC.nextFar){ RVC.nextFar = t + F.farEvery * (0.6 + 0.8 * R()); if(L.length < Math.round(F.farMax)){ const src = ids[Math.floor(R() * ids.length)], w = F.farMin + R() * Math.max(0, F.farMaxW - F.farMin), m = RVC.srcs[src].m;
      L.push({ src, w, sizeRoll:R(),lifeRoll:R(),yRoll:R(),x:R()*W,y:110,dy:0,born:t,life:30,off:R()*400,flip:R()<.5,sp:rvcSprite(src,w*m.bh/m.bw) }); } }
  for(const f of L){ f.x += F.farGroundX * dt * S.ambient_speed;f.dy+=F.farGroundY*dt*S.ambient_speed;f.y=110+f.yRoll*HH*F.farHeight+f.dy; f.age = t - f.born;f.life=Math.min(F.farLifeMin,F.farLifeMax)+f.lifeRoll*Math.abs(F.farLifeMax-F.farLifeMin);f.w=Math.min(F.farMin,F.farMaxW)+f.sizeRoll*Math.abs(F.farMaxW-F.farMin);const m=RVC.srcs[f.src].m;f.sp=rvcSprite(f.src,f.w*m.bh/m.bw); f.alpha = clamp(Math.min(f.age / 3, (f.life - f.age) / 3), 0, 1); }
  RVC.far = L.filter(f => f.age < f.life && f.x > -200 && f.x < W + 200 && f.y > -200 && f.y < HH + 200); }
// Canvas2D uses the same footage, timing and particle state when WebGL2 is unavailable.
// Rounded masks are made before compositing, so source rectangles can never become cloud edges.
function rvcCanvasPath(q,A,B,n,phase=0,amount=.035){q.beginPath();for(let i=0;i<=96;i++){const a=i/96*Math.PI*2,r=rvcRb(Math.max(1,A),Math.max(1,B),n,a)*(1+amount*(.55*Math.sin(a*5+phase)+.45*Math.sin(a*7-phase*.7)));const px=Math.cos(a)*r,py=Math.sin(a)*r;i?q.lineTo(px,py):q.moveTo(px,py);}q.closePath();}
function rvcCanvasPool(w,h){RVC.pool??=[];const index=RVC.poolIndex++,cv=RVC.pool[index]||(RVC.pool[index]=document.createElement('canvas'));w=Math.max(2,Math.ceil(w));h=Math.max(2,Math.ceil(h));if(cv.width!==w)cv.width=w;if(cv.height!==h)cv.height=h;const q=cv.getContext('2d');q.setTransform(1,0,0,1,0,0);q.globalAlpha=1;q.globalCompositeOperation='source-over';q.filter='none';q.clearRect(0,0,w,h);return{cv,q};}
function rvcCanvasFrame(src,frame,crop,F,mask=true,piece=false){
  RVC.canvasFrames??=new Map();const s=RVC.srcs[src],box=crop||[0,0,s.m.w,s.m.h],gain=piece&&!F.pInherit?F.pBright:F.gain,contrast=piece&&!F.pInherit?F.pContrast:F.contrast;
  const key=[src,s.m.file,frame,box.join(','),mask,piece,gain,contrast,F.warm,F.fill,F.lift,F.even,F.edgeRound,F.edgeSoft].join('|');if(RVC.canvasFrames.has(key))return RVC.canvasFrames.get(key);
  const cv=document.createElement('canvas');cv.width=Math.max(2,Math.ceil(box[2]));cv.height=Math.max(2,Math.ceil(box[3]));const q=cv.getContext('2d');q.filter=`brightness(${gain}) contrast(${contrast})`;q.drawImage(s.frames[frame],box[0],box[1],box[2],box[3],0,0,cv.width,cv.height);q.filter='none';
  q.globalCompositeOperation='source-atop';q.globalAlpha=F.even;q.fillStyle=F.fill;q.fillRect(0,0,cv.width,cv.height);q.globalAlpha=F.lift;q.fillStyle='#ffffff';q.fillRect(0,0,cv.width,cv.height);
  if(F.warm){q.globalAlpha=Math.abs(F.warm)*.6;q.fillStyle=F.warm>0?'#ffd2a1':'#a1ceff';q.fillRect(0,0,cv.width,cv.height);}q.globalAlpha=1;
  if(mask){const m=document.createElement('canvas');m.width=cv.width;m.height=cv.height;const k=m.getContext('2d');k.translate(m.width/2,m.height/2);k.filter=`blur(${Math.max(1,Math.min(m.width,m.height)*F.edgeSoft*.13)}px)`;k.fillStyle='#ffffff';rvcCanvasPath(k,m.width*.465,m.height*.465,F.edgeRound,frame*.13,.035);k.fill();q.globalCompositeOperation='destination-in';q.drawImage(m,0,0);}
  RVC.canvasFrames.set(key,cv);while(RVC.canvasFrames.size>160)RVC.canvasFrames.delete(RVC.canvasFrames.keys().next().value);return cv;
}
function rvcCanvasStamp(b,F,S,t,piece=false){
  const s=RVC.srcs[b.src],sp=b.sp,n=s.frames.length,rate=(1+Math.sin(b.off||0)*F.motionVariety*S.cloud_variety)*(b.rate??1)*(s.m.speed||1),pos=((t*s.m.fps*S.cloud_speed*rate+b.off)%n+n)%n,la=Math.floor(pos),lb=(la+1)%n,mix=(pos-la)*F.blend;
  const {cv,q}=rvcCanvasPool(sp.w+12,sp.h+12);q.translate(cv.width/2,cv.height/2);if(b.flip)q.scale(-1,1);
  for(const [frame,weight] of [[la,1-mix],[lb,mix]])if(weight>0){q.globalAlpha=weight;q.globalCompositeOperation='lighter';q.drawImage(rvcCanvasFrame(b.src,frame,sp.crop,F,true,piece),-sp.w/2,-sp.h/2,sp.w,sp.h);}q.globalAlpha=1;q.globalCompositeOperation='source-over';if(b.flip)q.scale(-1,1);
  const part=b.part||b.b?.part,cut=b.cut??b.b?.cut,cutW=b.b?.cutW||0;
  if(part&&(piece||cutW>0)){
    const {cv:mask,q:m}=rvcCanvasPool(cv.width,cv.height),nx=b.dir?.[0]??b.nx,ny=b.dir?.[1]??b.ny,ext=(Math.abs(nx)*sp.w+Math.abs(ny)*sp.h)/2,er=piece?(b.erode||0):0;
    m.translate(mask.width/2+nx*ext*(cut+.38),mask.height/2+ny*ext*(cut+.38));m.rotate(Math.atan2(ny,nx)-Math.PI/2);m.filter=`blur(${Math.max(.5,part[0]*part[3]*.3)}px)`;m.fillStyle='#fff';
    const remain=1-er*F.pErode*.85;rvcCanvasPath(m,part[0]*part[1]*remain,part[0]*remain,part[2],b.off+t*F.pTurbulenceRate,F.pWisps*.09);m.fill();
    q.setTransform(1,0,0,1,0,0);q.globalCompositeOperation=piece?'destination-in':'destination-out';q.globalAlpha=piece?1:cutW;q.drawImage(mask,0,0);q.globalAlpha=1;q.globalCompositeOperation='source-over';
  }
  return cv;
}
function rvcCanvasRender(x,t,S,F,clouds){
  RVC.poolIndex=0;
  for(const f of RVC.far){const stamp=rvcCanvasStamp({...f,rate:F.farRate},F,S,t);x.save();x.globalAlpha=f.alpha*S.ambient_opacity;x.filter=F.farBlur?`blur(${F.farBlur}px)`:'none';if(F.farShadow){x.shadowColor=`rgba(0,0,0,${F.farShadow})`;x.shadowBlur=6;x.shadowOffsetX=10;x.shadowOffsetY=16;}x.drawImage(stamp,f.x-stamp.width/2,f.y-stamp.height/2);x.restore();}
  for(const c of clouds){if(!c.bodySrc)continue;const source=RVC.srcs[c.bodySrc],frame=Math.floor(((t*source.m.fps*S.cloud_speed+c.bodyOff)%source.frames.length+source.frames.length)%source.frames.length),m=source.m;
    x.save();x.translate(c.cx,c.cy);x.globalAlpha=F.opacity;x.fillStyle=F.fill;x.shadowColor=F.fill;x.shadowBlur=c.feather*.4;rvcCanvasPath(x,c.A,c.B,c.n,c.bodyOff+t*F.outlineSpeed,F.outlineVariety*S.cloud_variety);x.fill();x.shadowBlur=0;x.clip();
    const ki=Math.max(c.A/Math.max(20,m.bw*.16),c.B/Math.max(20,m.bh*.16))/F.textureDetail,texture=rvcCanvasFrame(c.bodySrc,frame,null,F,false);x.globalAlpha=F.opacity;
    x.drawImage(texture,-m.body[0]*ki,-m.body[1]*ki,m.w*ki,m.h*ki);x.restore();
    for(const b of c.bill){const stamp=rvcCanvasStamp(b,F,S,t);x.save();x.globalAlpha=b.alpha*F.opacity;x.drawImage(stamp,b.x-stamp.width/2,b.y-stamp.height/2);x.restore();}
  }
  for(const p of RVC.pieces){if(p.alpha<=0)continue;const stamp=rvcCanvasStamp(p,F,S,t,true),gx=p.cx+p.ox,gy=p.cy+p.oy,er=p.erode||0,alpha=p.alpha*F.pieceOpacity*F.opacity*(1-er)*(1-er*F.pDensityLoss);
    x.save();if(F.pShadow){x.globalAlpha=alpha*F.pShadow;x.filter=`brightness(0) blur(${F.pShadowBlur}px)`;x.drawImage(stamp,gx-stamp.width/2+F.pShadowX,gy-stamp.height/2+F.pShadowY);x.filter='none';}
    if(p.neck>0){for(let k=1;k<9;k++){const f=k/9,pinch=F.pNeckWidth+(1-F.pNeckWidth)*Math.abs(2*f-1);x.save();x.translate(p.cx+p.ox*f,p.cy+p.oy*f);x.rotate(Math.atan2(p.dir[1],p.dir[0])-Math.PI/2);x.scale(pinch,1);x.rotate(-Math.atan2(p.dir[1],p.dir[0])+Math.PI/2);x.globalAlpha=alpha*p.neck/4;x.drawImage(stamp,-stamp.width/2,-stamp.height/2);x.restore();}}
    x.globalAlpha=clamp(alpha*F.pDensity,0,1);
    if(p.state==='free'&&F.pStretch>0){for(let y=0;y<stamp.height;y+=6){const dy=Math.min(6,stamp.height-y),shift=Math.sin(y*.055+t*F.pTurbulenceRate+p.off)*F.pStretch*p.part[0];x.drawImage(stamp,0,y,stamp.width,dy,gx-stamp.width/2+shift,gy-stamp.height/2+y,stamp.width,dy);}}
    else x.drawImage(stamp,gx-stamp.width/2,gy-stamp.height/2);x.restore();
  }
}
// lay out, animate and draw all message clouds; returns them so the words can be written on top
function rvcMessages(x, t, S, F, rows, composerTop){
  rvcLoad(S);x.save(); const dt = RVC.last == null ? 0 : clamp(t - RVC.last, 0, .1); RVC.last = t;
  const ids = RVC_CLIPS.filter(([id, k]) => F[k.slice(3)] !== false && RVC.srcs[id]).map(c => c[0]);
  const sc = x.canvas.width / W, gl = rvcGL(Math.round(W * sc), Math.round(HH * sc));
  if(gl) for(const id of ids) rvcUpload(gl, RVC.srcs[id]);
  const ready = ids.filter(rvcOk);
  const tfont = `${F.inkWeight} ${F.inkSize}px "${F.inkFont}", system-ui`; x.font = tfont;if('letterSpacing'in x)x.letterSpacing=F.inkSpacing+'px';
  const lineH = F.inkSize * F.lineGap, n = clamp(F.round, 2, 4.5), kse = Math.pow(2, 1 / n), P = Math.max(12,S.cloud_padding), out = [], size = clamp(F.billowSize, 16, 120);
  const rim = Math.min(40,size * (F.billowOut*.35+.18)), feather=Math.max(2,Math.min(F.feather,P*.9));
  const px=P+F.textInsetX+Math.abs(F.inkOffsetX),py=P+F.textInsetY+Math.abs(F.inkOffsetY);
  let yy = composerTop - 12;
  const grow = 1 - Math.exp(-dt * 1000 / Math.max(40, S.cloud_growth_ms) * 3);
  for(let k = rows.length - 1; k >= 0; k--){ const [who, txt] = rows[k], key = who + ':' + k, rnd = rvcRand(key + ':' + (F.seed || 0)), maxTot = Math.max(170,Math.min(F.maxWidth,W-2*F.margin-2*F.sway));
    const twMax = Math.max(F.inkSize*2,2*((maxTot/2-rim-feather)/kse-px)), lines = rvWrap(x, txt, twMax), tw = Math.max(...lines.map(l => x.measureText(l).width)), th = lines.length * lineH;
    const safeA=(tw/2+px)*kse+feather,safeB=(th/2+py)*kse+feather;
    const A = Math.max(safeA,Math.min(F.minWidth,maxTot)/2-rim), B=safeB*Math.max(1,F.height/.75);
    const st = RVC.clouds[key] || (RVC.clouds[key] = { list: [], extra: [] }); if(!st.z)st.z={A,B};
    st.z.A += (A-st.z.A)*grow;st.z.B+=(B-st.z.B)*grow;
    // The dense text-safe core is a lower bound at every frame; growth only animates the surrounding volume.
    const br=1+(Math.sin(t*S.cloud_speed*F.breatheSpeed+k)+1)*.5*F.breathe/100,Az=Math.max(safeA,st.z.A)*br,Bz=Math.max(safeB,st.z.B)*br,hx=Az+rim,hy=Bz+rim;
    if(yy-2*hy<92&&out.length)break;
    const cx=clamp((who==='mine'?W-F.margin-hx:F.margin+hx)+Math.sin(t*F.swaySpeed+k)*F.sway,hx+2,W-hx-2),cy=yy-hy+Math.sin(t*F.bobSpeed+k*F.bobPhase)*F.bob;
    const vx=dt&&st.position?(cx-st.position.x)/dt:0,vy=dt&&st.position?(cy-st.position.y)/dt:0;st.position={x:cx,y:cy};
    const c = {key,k,who,txt,lines,lineH,tfont,textW:tw,textH:th,A:Az,B:Bz,n,cx,cy,hx,hy,rim,vx,vy,u0:rnd(),bodySrc:null,bodyFlip:F.flipOk&&rnd()<.5,bodyOff:rnd()*1000,feather};
    c.edge = rvcEdge(Az, Bz, n); if(ready.length){ c.bodySrc = ready[Math.floor(rnd() * ready.length)]; c.bill = rvcBillows(c, F, S, t, ready); }
    out.push(c); yy -= 2 * hy + S.message_spacing; }
  // shadows on the ground
  if(S.cloud_shadow > 0) for(const c of out){ if(!c.bodySrc) continue; x.save(); x.fillStyle = `rgba(0,0,0,${0.35 * S.cloud_shadow})`; x.filter = `blur(${F.shadowBlur}px)`; x.beginPath(); x.ellipse(c.cx + F.shadowX, c.cy + c.hy * F.shadowY * 1.6, c.hx * .72, c.hy * .26, 0, 0, 7); x.fill(); x.restore(); }
  if(!ready.length){for(const c of out){x.save();x.globalAlpha=F.opacity;x.fillStyle=F.fill;x.beginPath();for(let i=0;i<=128;i++){const a=i/128*Math.PI*2,r=rvcRb(c.A,c.B,c.n,a)*(1+F.outlineVariety*(.55+.25*Math.sin(a*5+c.bodyOff)+.2*Math.sin(a*7+t*F.outlineSpeed)));const xx=c.cx+Math.cos(a)*r,yy=c.cy+Math.sin(a)*r;i?x.lineTo(xx,yy):x.moveTo(xx,yy);}x.closePath();x.shadowColor=F.fill;x.shadowBlur=feather*.6;x.fill();x.restore();c.fallback=true;}x.restore();return out;}
  rvcPieces(t, dt, S, F, out.filter(c => c.bodySrc)); rvcFar(t, dt, S, F, ready);
  if(!gl){rvcCanvasRender(x,t,S,F,out);x.restore();return out;}
  gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.useProgram(RVC.prog);
  for(const f of RVC.far){if(F.farShadow>0){x.save();x.filter='blur(6px)';x.fillStyle=`rgba(0,0,0,${f.alpha*F.farShadow})`;x.beginPath();x.ellipse(f.x+10,f.y+16,f.sp.w*.4,f.sp.h*.2,0,0,Math.PI*2);x.fill();x.restore();}rvcDraw(gl,{mode:3,src:f.src,off:f.off,flip:f.flip,rate:F.farRate,cx:f.x,cy:f.y,sc:f.sp.sc,scale:f.sp.scale,crop:f.sp.crop,rx:f.x-f.sp.w*.56,ry:f.y-f.sp.h*.56,rw:f.sp.w*1.12,rh:f.sp.h*1.12,alpha:f.alpha*S.ambient_opacity},F,S,t);}
  x.save();x.filter=F.farBlur>0?`blur(${F.farBlur}px)`:'none';x.drawImage(RVC.cv,0,0,W,HH);x.restore();gl.clear(gl.COLOR_BUFFER_BIT);
  for(const c of out){ if(!c.bodySrc) continue;
    const m = RVC.srcs[c.bodySrc].m, ki = Math.max(c.A / Math.max(20, m.bw * .16), c.B / Math.max(20, m.bh * .16))/F.textureDetail;
    rvcDraw(gl, { mode: 0, src: c.bodySrc, off: c.bodyOff, flip: c.bodyFlip, cx: c.cx, cy: c.cy, sc: m.body, scale: ki, A: c.A, B: c.B, n: c.n, feather: c.feather, rx: c.cx - c.A*1.14-2, ry: c.cy - c.B*1.14-2, rw: 2.28*c.A+4, rh: 2.28*c.B+4, alpha: F.opacity }, F, S, t);
    for(const b of c.bill){ const ext = (Math.abs(b.nx) * b.sp.w + Math.abs(b.ny) * b.sp.h) / 2;
      rvcDraw(gl, { mode: 1, src: b.src, off: b.off, flip: b.flip, cx: b.x, cy: b.y, sc: b.sp.sc, scale: b.sp.scale, crop: b.sp.crop, rx: b.x - b.sp.w*.56, ry: b.y - b.sp.h*.56, rw: b.sp.w*1.12, rh: b.sp.h*1.12, alpha: b.alpha * F.opacity, dir: [b.nx, b.ny], ext, cut: b.b.cut, cutW: b.b.cutW,part:b.b.part }, F, S, t); }
  }
  for(const p of RVC.pieces){ const ext = (Math.abs(p.dir[0]) * p.sp.w + Math.abs(p.dir[1]) * p.sp.h) / 2, gx = p.cx + p.ox, gy = p.cy + p.oy,warpPad=F.pStretch*(p.part?.[0]||0)+4, hw = p.sp.w / 2 + warpPad, hh = p.sp.h / 2 + warpPad;
    if(F.pShadow>0&&p.alpha>0){x.save();x.filter=`blur(${F.pShadowBlur}px)`;x.fillStyle=`rgba(0,0,0,${p.alpha*(1-p.erode)*F.pShadow})`;x.beginPath();x.ellipse(gx+F.pShadowX,gy+F.pShadowY,p.diam*.4*F.pAspect,p.diam*.18,0,0,Math.PI*2);x.fill();x.restore();}
    rvcDraw(gl, { mode: 2, src: p.src, off: p.off, flip: p.flip, cx: p.cx, cy: p.cy, sc: p.sp.sc, scale: p.sp.scale, crop: p.sp.crop, dir: p.dir, ext, cut: p.cut, ox: p.ox, oy: p.oy, neck: p.neck || 0, erode: p.erode,part:p.part,warp:p.state==='free'?F.pStretch:0,alpha:p.alpha*F.pieceOpacity*F.opacity,
      rx: Math.min(p.cx, gx) - hw, ry: Math.min(p.cy, gy) - hh, rw: Math.abs(gx - p.cx) + 2 * hw, rh: Math.abs(gy - p.cy) + 2 * hh }, F, S, t); }
  x.drawImage(RVC.cv, 0, 0, W, HH);
  x.restore();return out; }

function drawConvo(x, t, S){
  const E = S.earth || {}, clips = (Array.isArray(E.clips) && E.clips.length ? E.clips : RAVEN_CLIPS.map(c => ({ p: c[1], name: c[0], speed: c[2] })));
  x.fillStyle = '#F0DFC0'; x.fillRect(0, 0, W, HH);
  // 1. The same full-screen map, with reversible source cuts and independent camera / playback controls.
  if(EARTH_PLAYER) EARTH_PLAYER.draw(x,t,S,{paused:runtimePaused,clips});
  else {
  const key = clips.map(c => c.p).join('|'); if(key !== RV.key){ RV.key = key; RV.idx = 0; }
  const cur = clips[RV.idx % clips.length];
  for(const v of Object.values(RV.vids)) if(v !== RV.cur && !v.paused) v.pause();
  if(E.night){ const city = img(UI + 'raven_cloud_v20/london.webp'); if(ok(city)){ x.save(); x.filter = `brightness(${S.ground_brightness})`; const pan = (t * S.night_speed * 0.6) % 200; cover(x, city, 0, -pan * 0, W, HH, 0.5, ((t * S.night_speed) / 400) % 1); x.restore(); } }
  else if(cur){ const v = rvVideo(cur.p); if(RV.cur !== v){ RV.cur = v; RV.since = performance.now(); } rvReport(clips); v.playbackRate = clamp((+cur.speed || .4) * S.day_speed / 8, .0625, 4); if(v.ended){ v.currentTime = 0; } if(v.paused && !runtimePaused && !v.ended) v.play().catch(()=>{});
    // get the next map ready while this one plays, so there is no gap between maps
    const nx = clips[(RV.idx + 1) % clips.length]; if(nx && v.duration && v.currentTime > v.duration * 0.6) rvVideo(nx.p);
    // a map that errors or still has nothing after 12 s is skipped
    if((v.error || (v.readyState < 2 && performance.now() - RV.since > 12000)) && clips.length > 1){ RV.idx++; }
    const show = v.readyState >= 2 ? v : RV.last && RV.last.readyState >= 2 ? RV.last : null; if(show === v) RV.last = v;
    if(show){ x.save(); x.filter = `brightness(${S.ground_brightness ?? 1})`; cover(x, show, 0, 0, W, HH); x.restore(); } }
  }
  // water shimmer: the app lights the water using each map's water mask; here a light sweep stands in for it
  if(S.water_shimmer > 0 && !E.night){ x.save(); x.globalCompositeOperation = 'soft-light'; x.globalAlpha = S.water_shimmer * .25; const g = x.createLinearGradient(0, 0, W, HH); const ph = (t * .15) % 1; g.addColorStop(Math.max(0, ph - .1), 'rgba(255,255,255,0)'); g.addColorStop(ph, 'rgba(255,255,255,1)'); g.addColorStop(Math.min(1, ph + .1), 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, W, HH); x.restore(); }
  // 2. dark fade top and bottom (0x90071823 → clear at 18%, clear to 76% → 0xB0071823)
  const fg = x.createLinearGradient(0, 0, 0, HH); fg.addColorStop(0, 'rgba(7,24,35,.565)'); fg.addColorStop(.18, 'rgba(7,24,35,0)'); fg.addColorStop(.76, 'rgba(7,24,35,0)'); fg.addColorStop(1, 'rgba(7,24,35,.69)'); x.fillStyle = fg; x.fillRect(0, 0, W, HH);
  // 3. message clouds: a solid base under the words, wrapped in the real billowing edge of Danny's filmed clouds
  const F = Object.assign({}, PAGES.convo.defaults.fx, S.fx || {}), P = S.preview || {}, n = Math.max(0, Math.min(MSGS.length, Math.round(P.messages ?? 6)));
  const composerTop = HH - 10 - 52 - 6;
  const rows = MSGS.slice(0, n).map(m => m.slice()); if(String(P.draft || '').trim()) rows.push(['mine', String(P.draft), true]);
  // 4. (inside) pieces tear off the clouds' own edges, then drift off, get absorbed, or dissolve
  const clouds = rvcMessages(x, t, S, F, rows, composerTop);
  for(const c of clouds){ if(!c.bodySrc && !c.fallback) continue; x.save(); x.font = c.tfont; x.fillStyle = F.ink; x.textAlign = F.inkAlign; x.textBaseline = 'middle';if('letterSpacing'in x)x.letterSpacing=F.inkSpacing+'px';if(F.inkShadow>0){x.shadowColor=F.inkShadowColor;x.shadowBlur=F.inkShadow;}
    const textX=c.cx+F.inkOffsetX+(F.inkAlign==='left'?-c.textW/2:F.inkAlign==='right'?c.textW/2:0);
    c.lines.forEach((l,i)=>x.fillText(l,textX,c.cy+F.inkOffsetY+(i-(c.lines.length-1)/2)*c.lineH));x.restore(); }
  if(!n && !String(P.draft || '').trim()) rvShadowText(x, 'Write a message.', W / 2, HH * .45, '16px system-ui', '#fff', 'center'), rvShadowText(x, 'Watch your cloud form.', W / 2, HH * .45 + 26, '16px system-ui', '#fff', 'center');
  x.textAlign = 'left'; x.textBaseline = 'alphabetic';
  // 5. header: back arrow, name, save contact, scene controls (only you), refresh
  const hy = 44 + 4 + 24; rvShadowText(x, '←', 18, hy, '600 24px system-ui', '#fff'); rvShadowText(x, String(P.name || 'Freya'), 58, hy, '600 17px system-ui', '#fff');
  rvShadowText(x, '👤+', W - 132, hy, '17px system-ui', '#fff'); rvShadowText(x, '⚙', W - 84, hy, '20px system-ui', '#8CE8ED'); rvShadowText(x, '⟳', W - 40, hy, '600 22px system-ui', '#fff');
  // 6. message box: "Write into the clouds…" and the round send button
  const bx = 14, by = composerTop, bw = W - 28, bh = 52; x.save(); rr(x, bx, by, bw, bh, 24); x.fillStyle = 'rgba(255,255,255,.98)'; x.fill(); x.lineWidth = 1; x.strokeStyle = 'rgba(201,220,226,.7)'; x.stroke(); x.restore();
  x.save(); x.font = '18px system-ui'; x.fillStyle = '#566776'; x.textBaseline = 'middle'; x.fillText('Write into the clouds…', bx + 18, by + bh / 2); x.restore();
  x.save(); x.beginPath(); x.arc(bx + bw - 26, by + bh / 2, 19, 0, 7); x.fillStyle = '#175E70'; x.fill(); x.restore(); rvShadowText(x, '↑', bx + bw - 26, by + bh / 2 + 1, '700 20px system-ui', '#fff', 'center');
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

async function flushCloudEditor(){
 if(RUNTIME||STATE.sec!=='cloudvid')return;const editor=document.querySelector('#panel iframe[title="Cloud footage editor"]')?.contentWindow?.AsgardWorkspaceEditor;if(!editor)return;
 if(cloudEditorFlush?.editor===editor)return cloudEditorFlush.promise;
 const pending={editor,promise:null};pending.promise=(async()=>{await editor.ready;await editor.save();})();cloudEditorFlush=pending;
 try{await pending.promise;}finally{if(cloudEditorFlush===pending)cloudEditorFlush=null;}
}
async function savePageNow(){
 if(RUNTIME)return;
 await flushCloudEditor();
 if(ROCK_NAV.edits.size||ROCK_NAV.saving)await AsgardStudioLayout.saveNavigation(ROCK_NAV);
 if(!STATE.S)return;StudioWorkspaceCore.enforceLocks(STATE.S);const page=STATE.page,snapshot=deep(STATE.S),notice=++pageSaveNotice;clearTimeout(saveTimers.get(page));rememberPage();
 try{await sharedPages.save(docId(page),page,snapshot);if(notice===pageSaveNotice)$('#saveState').textContent='● All changes saved';}
 catch(e){$('#saveState').textContent='● Kept locally · shared save needs attention';StudioWorkbench?.status(e.message,true);throw e;}
}
// Prepared footage is explicitly assigned by the embedded editor, then saved with the same version guard.
function rollbackCloudSource(change){
 if(!change||STATE.S!==change.document||cloudSourceAssignments.get(change.document)?.get(change.slot)!==change)return false;
 const sources=change.document.fx?.cloudSources||{},present=Object.prototype.hasOwnProperty.call(sources,change.slot);
 if(present!==change.assignedPresent||sources[change.slot]!==change.assigned||JSON.stringify(sources[change.slot])!==change.signature)return false;
 const restore=document=>{if(change.had)set(document,change.path,deep(change.previous));else if(document.fx?.cloudSources)delete document.fx.cloudSources[change.slot];};
 restore(change.document);
 const history=editHistory.get(change.page);
 for(const snapshot of history?.items||[]){if(change.historyEntries.has(snapshot))continue;const value=get(snapshot,change.path),exists=Object.prototype.hasOwnProperty.call(snapshot.fx?.cloudSources||{},change.slot);if(exists===change.assignedPresent&&JSON.stringify(value)===change.signature)restore(snapshot);}
 // A pending autosave captured the rejected source. Keep other edits locally with the corrected assignment.
 clearTimeout(saveTimers.get(change.page));saveTimers.delete(change.page);
 try{localStorage.setItem('asgard-'+docId(change.page),JSON.stringify(change.document));}catch{}
 return true;
}
window.addEventListener('message',async event=>{
 const m=event.data,frame=document.querySelector('#panel iframe[title="Cloud footage editor"]');
 if(RUNTIME||STATE.page!=='convo'||event.origin!==location.origin||event.source!==frame?.contentWindow||m?.type!=='studio-cloud-source')return;
 const reply=(ok,message)=>event.source.postMessage({type:'studio-cloud-source-result',requestId:m.requestId,ok,message},event.origin);
 let change=null;try{
  if(!['kling-0','klingb-0','c123-0','c258-0'].includes(m.slot))throw Error('Choose one of the four message cloud sources.');
  const a=m.asset,path='fx.cloudSources.'+m.slot,locks=STATE.S._studioEditor?.locks||{};
  if(Object.keys(locks).some(k=>path===k||path.startsWith(k+'.')||k.startsWith(path+'.')))throw Error('This source is locked. Unlock it in the message cloud settings first.');
  let assigned;if(a!==null){
   const url=new URL(a?.url||'',location.href);if(url.origin!==new URL(SB.url).origin||!/^\/storage\/v1\/object\/public\/(studio-published-media|studio|asgard_ui)\//.test(url.pathname)||!url.pathname.toLowerCase().endsWith('.webp'))throw Error('Choose a prepared cloud from the shared studio.');
   for(const key of ['width','height','frames','fps','speed'])if(!Number.isFinite(+a[key]))throw Error('The prepared cloud is missing its playback details.');
   if(a.width<1||a.width>4096||a.height<1||a.height>4096||a.frames<1||a.frames>600||a.fps<=0||a.fps>60||a.speed<.1||a.speed>3)throw Error('The prepared cloud dimensions or playback rate are outside the supported range.');
   assigned={url:url.href,width:+a.width,height:+a.height,frames:+a.frames,fps:+a.fps,speed:+a.speed};
  }
  change={document:STATE.S,page:STATE.page,slot:m.slot,path,had:Object.prototype.hasOwnProperty.call(STATE.S.fx?.cloudSources||{},m.slot),previous:get(STATE.S,path),assigned,assignedPresent:a!==null,signature:JSON.stringify(assigned),historyEntries:new Set(editHistory.get(STATE.page)?.items||[])};
  let assignments=cloudSourceAssignments.get(STATE.S);if(!assignments){assignments=new Map();cloudSourceAssignments.set(STATE.S,assignments);}assignments.set(m.slot,change);
  if(a!==null)set(STATE.S,path,assigned);else if(STATE.S.fx.cloudSources)delete STATE.S.fx.cloudSources[m.slot];
  await savePageNow();reply(true,a===null?'Original cloud source restored.':'Prepared footage is saved and playing on the message clouds.');
 }catch(e){rollbackCloudSource(change);reply(false,e.message);}
});
// Runtime capabilities are explicit: a visual preview does not imply app behavior.
const RUNTIME_BINDINGS={heimdall:['real notification events','notification actions'],home:['feed data','post actions'],convo:['original Dart cloud conversation','authenticated messaging'],share:['selected post','real favorites','share action'],swap:['real listings','seller data','offer and buy actions'],ads:['approved ads','ad actions'],shoppost:['selected post','tagged products','purchase actions'],deals:['active deals','deal actions'],track:['real orders','tracking screen']};
function runtimeNeedsBinding(){return !!RUNTIME_BINDINGS[STATE.page];}
function runtimeDescriptor(){
 const missingBindings=RUNTIME_BINDINGS[STATE.page]||[],actions=!runtimeNeedsBinding();
 return {page:STATE.page,designId:RUNTIME?.envelope?.designId||docId(STATE.page),visualReady:true,fullAppParity:false,readOnly:!!RUNTIME,actions,productionDataReady:actions,missingBindings,
 note:(missingBindings.length?'Still needs: '+missingBindings.join(', ')+'. ':'Declared navigation and catalog callbacks are available. ')+(STATE.page==='shome'?'Profile, global search and unassigned buttons still need their original app connections. ':'')+'App callback and FlutterFlow device testing is still required.',
 capabilities:{layerActions:true,navigation:true,productSelection:STATE.page==='store',fullCatalog:STATE.page==='store',realMessaging:false},catalog:STATE.page==='store'?{count:STORE.count,offset:STORE.offset,limit:STORE.limit,error:STORE.error}:null};
}
function referencedAssets(){
 const refs=new Set(runtimeAssetRefs),seen=new WeakSet();
 function walk(value){if(typeof value==='string'){if(/^(?:https?:|data:|blob:)/i.test(value)||/\.(?:png|jpe?g|webp|gif|avif|svg|mp4|webm|mov)(?:[?#]|$)/i.test(value))refs.add(value);return;}if(!value||typeof value!=='object'||seen.has(value))return;seen.add(value);for(const child of Object.values(value))walk(child);}
 walk(STATE.S);walk(ROCK_NAV.S);return [...refs];
}
function drawRuntimeUnconnected(x,S){
 const bg=typeof S.bg==='object'?S.bg:{color:S.bg||'#05070a'};bgDraw(x,bg);
 x.save();x.fillStyle='#d6e5e8';x.font='600 18px system-ui';x.textAlign='center';x.fillText(PAGES[STATE.page].title,W/2,HH*.30);x.font='14px system-ui';x.fillText('This page needs its app connection.',W/2,HH*.36);x.fillStyle='#91a7b0';x.font='12px system-ui';x.fillText('Use its original app screen until connected.',W/2,HH*.40);x.restore();
}
function runtimeUpdate(envelope){
 if(!envelope||!Object.hasOwn(PAGES,envelope.page)||!envelope.settings||typeof envelope.settings!=='object'||Array.isArray(envelope.settings))throw Error('Unsupported page release');
 if(envelope.page==='store'&&!UUID.test(envelope.storeId||''))throw Error('Store release has no valid store ID');
 if(envelope.page==='browse'&&envelope.pageType&&!BROWSE_TYPES.includes(envelope.pageType))throw Error('Browse release has no valid store category');
 const oldStore=STORE.id;RUNTIME.envelope=envelope;STATE.page=envelope.page;STATE.S=merge(PAGES[STATE.page].defaults,envelope.settings);STATE.sec=null;STATE.t0=(runtimePaused?runtimePauseAt:performance.now())-runtimePauseOffset;
 STORE.id=envelope.storeId||'';if(STORE.id!==oldStore){STORE.abort?.abort();STORE.revision++;Object.assign(STORE,{row:null,items:[],loading:false,loaded:false,error:'',offset:0,count:0,query:'',scroll:0,scrollMax:0});}
 BROWSE.type=envelope.pageType||'grocery';ROCK_NAV.setRuntimeSettings?.(envelope.navigation);ROCK_NAV.S=AsgardRockNav.merge?AsgardRockNav.merge(AsgardRockNav.defaults(),envelope.navigation||{}):merge(AsgardRockNav.defaults(),envelope.navigation||{});ROCK_NAV.S.motion ||= {};ROCK_NAV.S.motion.paused=runtimePaused||!!envelope.navigation?.motion?.paused;ROCK_NAV.root.hidden=STATE.page==='shome';ROCK_NAV.setContext(STATE.page,['home','swap','shoppost','deals','share'].includes(STATE.page));
 mountCatalogControls();updateCatalogControls();PAGE_TOOLS.sync();return runtimeDescriptor();
}
function runtimePause(paused){
 const value=!!paused;if(value===runtimePaused)return;
 if(value)runtimePauseAt=performance.now();else runtimePauseOffset+=performance.now()-runtimePauseAt;runtimePaused=value;
 for(const v of Object.values(VID)){if(value)v.pause();else v.play().catch(()=>{});}PAGE_TOOLS.pause?.(value);
 ROCK_NAV.S.motion.paused=value||!!RUNTIME.envelope.navigation?.motion?.paused;
}
if(RUNTIME){
 let pan=null,suppressClickUntil=0;
 const canScroll=()=>STATE.page==='store';
 const scrollBy=dy=>{STORE.scroll=clamp(STORE.scroll+dy,0,STORE.scrollMax);};
 cv.tabIndex=0;cv.setAttribute('aria-label','Page preview. Scroll or swipe to browse store products.');
 cv.style.touchAction='none';
 cv.addEventListener('wheel',event=>{if(canScroll()){event.preventDefault();scrollBy(event.deltaY);}}, {passive:false});
 cv.addEventListener('keydown',event=>{if(!canScroll())return;const dy={ArrowDown:60,ArrowUp:-60,PageDown:500,PageUp:-500}[event.key];if(dy){event.preventDefault();scrollBy(dy);}});
 cv.addEventListener('pointerdown',event=>{if(canScroll()){pan={y:event.clientY,total:0};cv.setPointerCapture?.(event.pointerId);}});
 cv.addEventListener('pointermove',event=>{if(!pan||!canScroll())return;const dy=(pan.y-event.clientY)*W/cv.getBoundingClientRect().width;pan.y=event.clientY;pan.total+=Math.abs(dy);scrollBy(dy);if(pan.total>6)suppressClickUntil=performance.now()+350;});
 cv.addEventListener('pointerup',()=>{pan=null;});cv.addEventListener('pointercancel',()=>{pan=null;});
 cv.addEventListener('click',event=>{if(performance.now()<suppressClickUntil)return;const r=cv.getBoundingClientRect(),x=(event.clientX-r.left)*W/r.width,y=(event.clientY-r.top)*W/r.width;for(let i=runtimeHits.length-1;i>=0;i--){const h=runtimeHits[i];if(x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h){runtimeAction(h.action);break;}}});
 runtimeUpdate(RUNTIME.envelope);
 RUNTIME.setRenderer({update:runtimeUpdate,setContext(context){runtimeContext=context&&typeof context==='object'?context:{};return runtimeDescriptor();},pause:runtimePause,descriptor:runtimeDescriptor,referencedAssets,getCatalogPage:(offset=0,query='')=>loadStore(offset,query,true),destroy(){runtimeStopped=true;cancelAnimationFrame(runtimeFrame);STORE.abort?.abort();for(const v of Object.values(VID))v.pause();PAGE_TOOLS.pause?.(true);catalogControls?.bar.remove();}});
}else{
 AsgardStudioLayout.mount({kind:'pages',page:new URLSearchParams(location.search).get('page')||'home',openPage,beforePage:savePageNow,save:savePageNow,undo:()=>{if(STATE.sec==='rocks'){const prev=ROCK_NAV.history.pop();if(prev){ROCK_NAV.future.push(deep(ROCK_NAV.S));ROCK_NAV.applyState(prev);}return;}const h=editHistory.get(STATE.page);if(h?.at>0){STATE.S=StudioWorkspaceCore.preserveLocks(STATE.S,deep(h.items[--h.at]));save(false);panel();}},preview:()=>{STATE.t0=performance.now();}});
 /* Hands-on preview: drag or wheel scrolls a still preview; a plain click picks what to edit at that spot. */
 {let pan=null,moved=0;const canPan=()=>!PREVIEW_MOTION&&STORE.scrollMax>0;const by=dy=>{STORE.scroll=clamp(STORE.scroll+dy,0,STORE.scrollMax);};
  cv.addEventListener('wheel',e=>{if(canPan()){e.preventDefault();by(e.deltaY);}},{passive:false});
  cv.addEventListener('pointerdown',e=>{pan={y:e.clientY};moved=0;});
  cv.addEventListener('pointermove',e=>{if(!pan)return;const dy=(pan.y-e.clientY)*W/cv.getBoundingClientRect().width;pan.y=e.clientY;moved+=Math.abs(dy);if(canPan())by(dy);});
  cv.addEventListener('pointerup',()=>{pan=null;});cv.addEventListener('pointercancel',()=>{pan=null;});
  cv.addEventListener('click',e=>{if(moved>6)return;const P=PAGES[STATE.page];if(!P)return;
   {const r0=cv.getBoundingClientRect(),px=(e.clientX-r0.left)*W/r0.width,py=(e.clientY-r0.top)*W/r0.width;const h=[...runtimeHits].reverse().find(z=>px>=z.x&&px<=z.x+z.w&&py>=z.y&&py<=z.y+z.h);const a=h?.action;
    if(a&&a.type==='navigate'&&parent!==window){parent.postMessage({type:'studio-open',target:a.target,storeId:a.storeId||'',pageType:a.pageType||''},location.origin);return;}
    if(a&&a.type==='navigate'&&a.target==='store'&&a.storeId){location.href='pages.html?page=store&store='+encodeURIComponent(a.storeId);return;}}const items=(P.sections||[]).map(sec=>({id:sec.id,name:sec.name,sub:sec.sub}));
   document.querySelector('.canvas-pick')?.remove();const m=document.createElement('div');m.className='canvas-pick';m.style.left=Math.max(4,Math.min(e.clientX,innerWidth-260))+'px';m.style.top=Math.max(4,Math.min(e.clientY,innerHeight-50-items.length*46))+'px';const h=document.createElement('div');h.className='canvas-pick-title';h.textContent='Edit what is here';m.append(h);
   for(const it of items){const b=document.createElement('button');b.type='button';const bb=document.createElement('b');bb.textContent=it.name;const sm=document.createElement('small');sm.textContent=it.sub||'';b.append(bb,sm);b.onclick=async()=>{if(await selectFeature(it.id))m.remove();};m.append(b);}
   document.body.append(m);setTimeout(()=>document.addEventListener('pointerdown',function off(ev){if(!m.contains(ev.target)){m.remove();document.removeEventListener('pointerdown',off,true);}},true),0);});
 }
 {const t=document.querySelector('.ctitle');if(t){const l=document.createElement('label');l.className='phone-size-control preview-motion';l.title='Off: the preview stays still and you scroll it by dragging or with the mouse wheel. On: lists and feeds scroll by themselves.';const c=document.createElement('input');c.type='checkbox';c.checked=PREVIEW_MOTION;c.onchange=()=>{PREVIEW_MOTION=c.checked;STORE.scroll=0;try{localStorage.setItem('asgard-preview-motion',c.checked?'1':'0');}catch(e){}};l.append(c,document.createTextNode(' Auto-scroll preview'));t.append(l);}}
 const start=new URLSearchParams(location.search).get('page');const editorReady=openPage(PAGES[start]?start:'home');
 // Export adapter reads the current in-memory edit without changing the saved draft.
 function wbDocument(){return STATE.sec==='rocks'?ROCK_NAV.S:STATE.S;}
 function wbPath(path){if(path.startsWith('_studioLayers.')&&STATE.sec==='design'){const id=PAGE_TOOLS.selectedId?.(),i=STATE.S._studioLayers?.findIndex(l=>l.id===id);return i>=0?'_studioLayers.'+i+'.'+path.slice(14):null;}return path;}
 StudioWorkbench.mount({document:wbDocument,path:wbPath,read:p=>StudioWorkspaceCore.get(wbDocument(),p),navigation:()=>ROCK_NAV.S,save:async()=>{if(STATE.sec==='rocks')ROCK_NAV.edits.set('_studioEditor',deep(ROCK_NAV.S._studioEditor));await savePageNow();},restore:async(doc,nav)=>{if(STATE.sec==='rocks')ROCK_NAV.applyState(StudioWorkspaceCore.preserveLocks(ROCK_NAV.S,doc));else {STATE.S=StudioWorkspaceCore.preserveLocks(STATE.S,doc);if(nav)ROCK_NAV.applyState(StudioWorkspaceCore.preserveLocks(ROCK_NAV.S,nav));panel();}}});
 window.AsgardWorkspaceEditor={ready:editorReady,save:savePageNow,feature:selectFeature,topic:AsgardStudioLayout.select};
 window.AsgardPageEditor={snapshot:()=>({schemaVersion:1,designId:docId(STATE.page),page:STATE.page,storeId:STATE.page==='store'?STORE.id:null,pageType:STATE.page==='browse'?BROWSE.type:null,settings:deep(STATE.S),navigation:deep(ROCK_NAV.S),bindingContract:{version:1}}),save:savePageNow,descriptor:runtimeDescriptor,referencedAssets};
 if(window.StudioTransfer)StudioTransfer.mount(window.AsgardPageEditor);
}
})();
