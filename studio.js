/* Asgard Studio (Claude) — editor around RavenScene. */
(function(){
'use strict';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const LIB = window.LIBRARY || [];
const KEY = 'asgard-claude-raven-v1', VKEY = 'asgard-claude-raven-versions-v1';
const store = { get(k){ try{ return JSON.parse(localStorage.getItem(k)); }catch(e){ return null; } }, set(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); return true; }catch(e){ toast('Browser storage is full — use Export to keep a copy'); return false; } } };
const clone = o => JSON.parse(JSON.stringify(o));
const DASH = { friends:'Followers', viewers:'Views' };
const COUNT_WORD = { friends:'followers', followers:'followers', viewers:'viewers' };

/* ---------------- uploads kept in IndexedDB (big files never hit localStorage) ---------------- */
const idb = (() => { let db; const open = () => db ? Promise.resolve(db) : new Promise((res, rej) => { const r = indexedDB.open('asgard-claude-media', 1); r.onupgradeneeded = () => r.result.createObjectStore('m'); r.onsuccess = () => res(db = r.result); r.onerror = () => rej(r.error); });
  return { put: (k, v) => open().then(d => new Promise(res => { const t = d.transaction('m', 'readwrite'); t.objectStore('m').put(v, k); t.oncomplete = res; })),
           get: k => open().then(d => new Promise(res => { const q = d.transaction('m').objectStore('m').get(k); q.onsuccess = () => res(q.result); q.onerror = () => res(null); })) }; })();
const blobUrls = {};
async function resolveSrc(src){ if(!src || !src.startsWith('idb:')) return src; if(blobUrls[src]) return blobUrls[src]; const b = await idb.get(src.slice(4)); if(!b) return null; return blobUrls[src] = URL.createObjectURL(b); }

/* ---------------- platform (artifact capabilities) ---------------- */
const P = { db:null, assets:null, downloads:null };
const capReady = (async () => { try { if(!window.claude || !window.claude.use) return; const [db, as, dl] = await Promise.all([window.claude.use('db'), window.claude.use('assets'), window.claude.use('downloads')]); P.db=db; P.assets=as; P.downloads=dl; } catch(e){} })();
async function saveFile(filename, data){
  if(P.downloads){ try{ await P.downloads.save({ filename, data }); toast('Saved '+filename); return true; } catch(e){ if(e && e.code==='declined') return false; toast('Could not save: '+(e && e.message || e)); return false; } }
  try{ const a=document.createElement('a'); a.href=URL.createObjectURL(data instanceof Blob?data:new Blob([data])); a.download=filename; a.click(); return true; }catch(e){ toast('Downloads are not available here'); return false; }
}
/* ---------------- shared hub (Supabase): one design + files + board for Danny, Claude and ChatGPT ---------------- */
const SB = { url:'https://afnihsdxtisneuyehatw.supabase.co', key:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmbmloc2R4dGlzbmV1eWVoYXR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NjUxMDcsImV4cCI6MjA4NzE0MTEwN30.q94Gw7BVKgyGm-I_XXGaoScVK50MMfQMk2RHms3qhps', ok:null };
const sbH = (extra) => Object.assign({ apikey: SB.key, Authorization: 'Bearer '+SB.key }, extra||{});
let sbT = null;
function sbSave(){ clearTimeout(sbT); sbT = setTimeout(async () => { try{ const r = await fetch(SB.url+'/rest/v1/studio_designs?on_conflict=id', { method:'POST', headers: sbH({ 'Content-Type':'application/json', Prefer:'resolution=merge-duplicates,return=minimal' }), body: JSON.stringify({ id:'raven', page:'raven', data:S, updated_by:'studio', updated_at:new Date().toISOString() }) }); SB.ok = r.ok; }catch(e){ SB.ok = false; } if(!dirty){ $('#saveState').className=SB.ok?'saved':'unsaved'; $('#saveState').textContent=SB.ok?'● Saved to shared studio':'● Saved locally · shared save failed'; } }, 1200); }
async function sbLoad(){ try{ const r = await fetch(SB.url+'/rest/v1/studio_designs?id=eq.raven&select=data,updated_at', { headers: sbH() }); if(!r.ok) return null; const j = await r.json(); SB.ok = true; return j[0] && j[0].data && Object.keys(j[0].data).length ? j[0].data : null; }catch(e){ SB.ok = false; return null; } }
async function sbUpload(f){ try{ const path = 'uploads/'+Date.now().toString(36)+'-'+f.name.replace(/[^\w.-]+/g,'_'); const r = await fetch(SB.url+'/storage/v1/object/studio/'+path, { method:'POST', headers: sbH({ 'Content-Type': f.type || 'application/octet-stream', 'x-upsert':'true' }), body: f }); return r.ok ? SB.url+'/storage/v1/object/public/studio/'+path : null; }catch(e){ return null; } }
async function boardLoad(){ try{ const r = await fetch(SB.url+'/rest/v1/studio_board?select=*&order=created_at.desc&limit=80', { headers: sbH() }); return r.ok ? await r.json() : []; }catch(e){ return []; } }
async function boardPost(o){ try{ const r = await fetch(SB.url+'/rest/v1/studio_board', { method:'POST', headers: sbH({ 'Content-Type':'application/json', Prefer:'return=minimal' }), body: JSON.stringify(o) }); return r.ok; }catch(e){ return false; } }
async function boardShow(){ $('#board').hidden=false; const L = await boardLoad(); $('#bList').innerHTML = L.length ? L.map(b=>`<div style="border:1px solid #ffffff1a;border-radius:10px;padding:10px 12px;margin:6px 0"><div style="display:flex;justify-content:space-between;gap:8px"><b>${esc(b.who)} · ${esc(b.title)}</b><small>${new Date(b.created_at).toLocaleString()} · ${esc(b.status)}</small></div>${b.body?`<div style="white-space:pre-wrap;opacity:.85;margin-top:4px">${esc(b.body)}</div>`:''}</div>`).join('') : '<small>Nothing on the board yet.</small>'; }
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
let dbWriting = Promise.resolve();
function dbSave(){ sbSave(); if(!P.db) return; const json = JSON.stringify(S); dbWriting = dbWriting.then(() => P.db.doc('studio/current').set({ json, at: Date.now() })).catch(e => console.warn('db save', e)); }
async function dbLoad(){ if(!P.db) return null; try{ const d = await P.db.doc('studio/current').get(); return d.exists ? JSON.parse(d.data().json) : null; }catch(e){ return null; } }
async function versionsList(){ if(P.db){ try{ const q = await P.db.collection('versions').orderBy('at','desc').limit(60).get(); return q.docs.map(d=>Object.assign({ id:d.id }, d.data())); }catch(e){} } return (store.get(VKEY)||[]).map((v,i)=>Object.assign({ id:'l'+i, json:JSON.stringify(v.data) }, v)); }
async function versionAdd(name){ const v={ name, at:Date.now(), json:JSON.stringify(S) }; if(P.db){ try{ await P.db.collection('versions').add(v); return; }catch(e){} } const vs=store.get(VKEY)||[]; vs.unshift({ name, at:v.at, data:clone(S) }); store.set(VKEY, vs.slice(0,40)); }
async function versionDel(id){ if(P.db && !id.startsWith('l')){ try{ await P.db.doc('versions/'+id).delete(); return; }catch(e){} } const vs=store.get(VKEY)||[]; vs.splice(+id.slice(1),1); store.set(VKEY,vs); }

/* ---------------- state + history ---------------- */
function starterSettings(){
  const s = clone(Raven.DEFAULT_SETTINGS);
  s.bg.layers = [
    { id:'L1', name:'Your background 13', src:'bg/bg13.jpg', thumb:'lib/thumbs/bg13.jpg', cycle:true, visible:true, brightness:1, opacity:1, zoom:1, panX:0, panY:0, move:1 },
    { id:'L2', name:'Your background 09', src:'bg/bg09.jpg', thumb:'lib/thumbs/bg09.jpg', cycle:true, visible:true, brightness:1, opacity:1, zoom:1, panX:0, panY:0, move:1 },
    { id:'L3', name:'Your background 17', src:'bg/bg17.jpg', thumb:'lib/thumbs/bg17.jpg', cycle:true, visible:true, brightness:1, opacity:1, zoom:1, panX:0, panY:0, move:1 },
  ];
  return Raven.ensureDashboards(s);
}
function applyChatImport(s){
  const I = window.CHAT_IMPORT; if(!I || s.chatImported >= 3) return s;
  const D = BH.BH_DEFAULTS, P = BH.BH_PRESETS;
  for(const m of ['friends','followers']){ const old = s.holes.dashboards[m].tiers; s.holes.dashboards[m].tiers = I[m].map((t,i)=>{ const base = old[i] || old[old.length-1]; const look = t.look ? Object.assign({}, D, P['cold-blue-rim'], t.look) : Object.assign({}, base.look); return { start:t.start, name:t.name || base.name, seconds:t.seconds || 2, libId:t.libId || base.libId || null, look }; }); }
  Object.assign(s.sphere, I.sphere); Object.assign(s.tabs, I.tabs); Object.assign(s.rolodex, I.rolodex); Object.assign(s.bg, I.bg); Object.assign(s.holes.behavior, I.behavior);
  s.bg.layers = I.layers.map(l=>({ id:'C'+l.k, name:l.name, src:'bg/'+l.k+'.jpg', thumb:'lib/thumbs/'+l.k+'.jpg', cycle:l.cycle, visible:l.visible, brightness:l.brightness, opacity:l.opacity, zoom:1, panX:0, panY:0, move:0, top:l.top, bottom:l.bottom, fadeBottom:l.fadeBottom, fadeFrom:l.fadeFrom, fadeTo:l.fadeTo }));
  s.chatImported = 3; return s;
}
let S = store.get(KEY) || starterSettings();
S = applyChatImport(Raven.ensureDashboards(S));
S.holes.referencePreview ||= {on:false,x:.5,y:.235,radius:40,speed:1,lens:.45};
let hist = [clone(S)], hi = 0, dirty = false, secNow = 'holes', selLayer = null, testContact = null;
const ui = store.get(KEY + '-ui') || { open:{} , fs:1 };

function commit(label){
  hist = hist.slice(0, hi + 1); hist.push(clone(S)); if(hist.length > 120) hist.shift(); hi = hist.length - 1;
  persist();
}
let pt;
function persist(){ dirty = true; $('#saveState').className='unsaved'; $('#saveState').textContent='● Saving…'; clearTimeout(pt); pt = setTimeout(async () => { store.set(KEY, S); dbSave(); await dbWriting; dirty=false; $('#saveState').className='unsaved'; $('#saveState').textContent='● Saving to shared studio…'; }, 700); }
let ct; function change(){ applyToScene(); clearTimeout(ct); ct = setTimeout(commit, 350); }
function undo(){ if(hi>0){ hi--; S = clone(hist[hi]); persist(); applyToScene(true); render(); } }
function redo(){ if(hi<hist.length-1){ hi++; S = clone(hist[hi]); persist(); applyToScene(true); render(); } }

/* ---------------- scene ---------------- */
const scene = new Raven.RavenScene($('#stage'), S, {});
const ROCK_NAV = new AsgardRockNav.Navigation({stage:$('#stage'),url:SB.url,key:SB.key,assetBase:SB.url+'/storage/v1/object/public/studio/navigation/rocks-v1/',page:'raven',shareAvailable:false,onNavigate:id=>{ROCK_NAV.selected=id==='convo'?'messages':id;ROCK_NAV.group='carving';showSec('rocks');}});
window.asgardRockNavigation=ROCK_NAV;
window.scene = scene;
async function applyToScene(full){
  const s = clone(S);
  for(const L of s.bg.layers) L.src = await resolveSrc(L.src) || L.src;
  scene.setSettings(s);
  scene._testContact = testContact;
  if(full) scene.sky = [];
}
applyToScene(true);
scene.onHoleTap = h => { const d = S.holes.dashboards[S.holes.active]; S.holes.selTier = parseInt(h.tier) || 0; testContact = h.c; showSec('holes'); toast(`${h.c.name}: ${DASH[S.holes.active]} tier ${(parseInt(h.tier)||0)+1} (${h.c.counts[S.holes.active]} ${COUNT_WORD[S.holes.active]})`); applyToScene(); };
scene.onTurn = (dx, dy) => { if(S.holes.modelPreview?.on){const m=S.holes.modelPreview,a=AsgardModelPreview.hole(m);m.randomAxis=false;m.look.rotX=clamp(a.rotX-dy*.4,3,90);m.look.rotY=clamp(a.rotY+dx*.6,-80,80);m.look.rotZ=a.rotZ;change();refreshValues();return;} if(scene.anglePractice)return; const L = curLook(); L.angleManual=true; L.rotY = clamp(L.rotY + dx*0.6, -180, 180); L.rotX = clamp(L.rotX - dy*0.4, -90, 90); change(); if(secNow==='holes') refreshValues(); };
scene.onFrame = sc => { $('#tLbl').textContent = sc.time.toFixed(1)+'s'; referenceReadout(); };
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));

/* ---------------- control helpers ---------------- */
function getPath(obj, path){ return path.split('.').reduce((o,k) => o == null ? o : o[k], obj); }
function setPath(obj, path, v){ const ks = path.split('.'); const last = ks.pop(); const o = ks.reduce((o,k) => o[k], obj); o[last] = v; }
function curTier(){ return S.holes.dashboards[S.holes.active].tiers[S.holes.selTier]; }
function curLook(){ return S.holes.active==='viewers'&&S.holes.quickTier===3&&S.holes.modelPreview?S.holes.modelPreview.look:curTier().look; }
function referenceLiveSettings(){
  return AsgardVariants.liveSettings(S.holes.referencePreview,S.holes.referenceGrowth?.streamerId??'freya',S.holes.orientation,S.holes.referenceGrowth);
}
function referenceReadout(){
  const modelNode=$('#modelGrowthReadout'),m=S.holes.modelPreview;
  if(modelNode&&m){const g=AsgardModelPreview.growth(m),h=AsgardModelPreview.hole(m);const label=(g.on?Math.round(g.views)+' views':'Manual disk')+' · ring size '+h.diskOut.toFixed(2);if(modelNode.textContent!==label)modelNode.textContent=label;}
  const node=$('#refLiveReadout');if(!node)return;
  const live=referenceLiveSettings(),growth=S.holes.referenceGrowth;
  const label=(growth.on?Math.round(growth.views)+' views':'Manual disk')+' · ring '+live.ringSize.toFixed(2)+' · density '+live.density.toFixed(2)+' · angle '+Math.round(live.tilt)+'° · axis '+Math.round(live.axisY)+'° · rotation '+Math.round(live.axisZ)+'°';
  if(node.textContent!==label)node.textContent=label;
}
function root(path){ if(path.startsWith('look.')) return [curLook(), path.slice(5)]; if(path.startsWith('layer.')) return [S.bg.layers.find(l=>l.id===selLayer), path.slice(6)]; return [S, path]; }
const R = (path, label, min, max, step, fmt) => ({ t:'r', path, label, min, max, step: step || (max-min)/100, fmt });
const C = (path, label) => ({ t:'c', path, label });
const K = (path, label) => ({ t:'k', path, label });
const SEL = (path, label, opts) => ({ t:'s', path, label, opts });
function ctlHtml(c, i){
  const [o, p] = root(c.path); if(!o) return ''; const liveKeys=['ringSize','density','view3d','tilt','axisY','axisZ'];
  const key=c.path.slice('holes.referencePreview.'.length);
  const modelAngle=(/^holes\.modelPreview\.look\.rot[XYZ]$/.test(c.path)&&S.holes.modelPreview?.randomAxis)||(c.path==='holes.modelPreview.look.diskOut'&&S.holes.modelPreview?.growth?.on);
  const v=modelAngle?AsgardModelPreview.hole(S.holes.modelPreview)[c.path.split('.').pop()]:c.path.startsWith('holes.referencePreview.')&&liveKeys.includes(key)?referenceLiveSettings()[key]:getPath(o,p); const id = 'c'+i+Math.random().toString(36).slice(2,6);
  if(c.t==='r') return `<div class="c"><label for="${id}">${c.label}<em data-v="${c.path}">${fmtv(v,c)}</em></label><input type="range" id="${id}" data-p="${c.path}" min="${c.min}" max="${c.max}" step="${c.step}" value="${v}"></div>`;
  if(c.t==='c') return `<div class="c col"><label for="${id}">${c.label}<input type="color" id="${id}" data-p="${c.path}" value="${toHex(v)}"></label></div>`;
  if(c.t==='k') return `<div class="c chk"><label><input type="checkbox" data-p="${c.path}" ${v?'checked':''}>&nbsp;${c.label}</label></div>`;
  if(c.t==='s') return `<div class="c"><label>${c.label}</label><select data-p="${c.path}">${c.opts.map(([k,l])=>`<option value="${k}" ${String(v)===String(k)?'selected':''}>${l}</option>`).join('')}</select></div>`;
}
function fmtv(v,c){ if(typeof v !== 'number') return v; if(c && c.fmt) return c.fmt(v); const st = c ? c.step : 0.01; return st >= 1 ? Math.round(v) : v.toFixed(st >= 0.1 ? 1 : 2); }
function toHex(c){ if(!c) return '#000000'; if(c[0]==='#') return c.length===4 ? '#'+c.slice(1).split('').map(z=>z+z).join('') : c.slice(0,7); const m = c.match(/\d+(\.\d+)?/g); if(!m) return '#000000'; return '#'+m.slice(0,3).map(n=>(+n|0).toString(16).padStart(2,'0')).join(''); }
function group(title, ctls, key){ key = key || title; const open = ui.open[key] ? 'open' : '';
  return `<details class="grp" data-k="${key}" ${open}><summary>${title}</summary><div class="gb">${ctls.map(ctlHtml).join('')}</div></details>`; }
function wire(el){
  el.querySelectorAll('[data-p]').forEach(inp => {
    const rawPath=inp.dataset.p;const path=rawPath.startsWith('look.')&&S.holes.active==='viewers'&&S.holes.quickTier===3&&S.holes.modelPreview?'holes.modelPreview.'+rawPath:rawPath;const [o,p]=root(path);
    const ev = inp.type==='range' ? 'input' : 'change';
    inp.addEventListener(ev, () => {
      const [o,p] = root(path); if(!o) return;
      let v = inp.type==='range' ? +inp.value : inp.type==='checkbox' ? inp.checked : inp.value;
      if(inp.tagName==='SELECT' && !isNaN(+v) && v!=='') v = +v;
      if(/^holes\.modelPreview\.look\.rot[XYZ]$/.test(path)&&S.holes.modelPreview.randomAxis){
        const actual=AsgardModelPreview.hole(S.holes.modelPreview);
        for(const key of ['rotX','rotY','rotZ'])S.holes.modelPreview.look[key]=actual[key];
        S.holes.modelPreview.randomAxis=false;
      }
      const manualAxis=['holes.referencePreview.tilt','holes.referencePreview.axisY','holes.referencePreview.axisZ','holes.referencePreview.view3d'].includes(path);
      if(manualAxis && S.holes.orientation.random){
        Object.assign(S.holes.referencePreview,AsgardVariants.orientationFor(S.holes.referenceGrowth.streamerId,S.holes.orientation.seed));
        S.holes.orientation.random=false;
        const random=el.querySelector('[data-p="holes.orientation.random"]');if(random)random.checked=false;
      }
      if(path==='holes.referencePreview.ringSize'||path==='holes.referencePreview.density'){
        const effective=referenceLiveSettings();S.holes.referencePreview.ringSize=effective.ringSize;S.holes.referencePreview.density=effective.density;
        S.holes.referenceGrowth.on=false;
        const growth=el.querySelector('[data-p="holes.referenceGrowth.on"]');if(growth)growth.checked=false;
      }
      if(S.holes.together?.on&&path==='holes.referenceGrowth.views'){S.holes.referenceGrowth.on=true;S.holes.together.variety=false;}
      if(S.holes.together?.on&&path==='holes.modelPreview.growth.views'){S.holes.modelPreview.growth.on=true;S.holes.together.variety=false;}
      if(path==='holes.modelPreview.look.diskOut')S.holes.modelPreview.growth.on=false;
      setPath(o, p, v);
      if(path==='holes.behavior.speed'&&S.holes.together)S.holes.together.speed=v;
      if(path==='holes.together.speed')S.holes.behavior.speed=v;
      if(path==='holes.behavior.driftViews'&&S.holes.together)S.holes.together.drift=v;
      if(path==='holes.together.drift')S.holes.behavior.driftViews=v;
      if(path==='holes.together.variety'||path==='holes.together.variedFollowers'){change();render();return;}
      if(/^holes\.modelPreview\.growth\.ring(Start|End)$/.test(path))AsgardModelPreview.setEndpoint(S.holes.modelPreview,path.split('.').pop(),v);
      if(path==='holes.modelPreview.look.diskIn')S.holes.modelPreview.growth=AsgardModelPreview.growth(S.holes.modelPreview);
      if(/^holes\.referenceGrowth\.ring(Start|End)$/.test(path)){const g=S.holes.referenceGrowth;g.on=true;if(path.endsWith('Start')){g.ringEnd=Math.max(g.ringEnd,g.ringStart);g.views=21;}else{g.ringStart=Math.min(g.ringStart,g.ringEnd);g.views=149;}}
      const em = el.querySelector(`em[data-v="${CSS.escape(path)}"]`); if(em) em.textContent = fmtv(v, {step:+inp.step||0.01});
      if(/^look\.rot[XYZ]$/.test(path)) {o.angleManual=true;setAnglePractice(null);}
      let refRefresh=false;
      if(path==='holes.referencePreview.tilt'||path==='holes.referencePreview.axisY'||path==='holes.referencePreview.axisZ'||path==='holes.referencePreview.thickness'){
        S.holes.referencePreview.view3d=true;
        const toggle=el.querySelector('[data-p="holes.referencePreview.view3d"]');if(toggle)toggle.checked=true;
      }
      if(path==='holes.referencePreview.tintColor'){S.holes.referencePreview.tintAmount=1;refreshValues();}
      if(path==='holes.referencePreview.view3d')refRefresh=true;
      change(); referenceReadout(); refreshValues(); if(inp.dataset.re || path==='sphere.autoLight'||refRefresh) render();
      if(path.indexOf('band')>=0) scene._bandFlash = performance.now();
      if(path==='holes.friendSize.min' || path==='holes.friendSize.max'){ const n=S.holes.dashboards.friends.tiers.length; if(S.holes.mode==='friendsOne' || S.holes.mode==='focus'){ S.holes.selTier = path.endsWith('min') ? 0 : n-1; scene.s.holes.selTier = S.holes.selTier; } fsReadout(); }
    });
  });
  el.querySelectorAll('details.grp').forEach(d => d.addEventListener('toggle', () => { ui.open[d.dataset.k] = d.open; store.set(KEY+'-ui', ui); }));
}
function refreshValues(){ const live=referenceLiveSettings();$$('#panel [data-p]').forEach(inp => { const [o,p] = root(inp.dataset.p); if(!o) return; const key=inp.dataset.p.slice('holes.referencePreview.'.length),use=inp.dataset.p.startsWith('holes.referencePreview.')&&['ringSize','density','tilt','axisY','axisZ','view3d'].includes(key); const modelAngle=(/^holes\.modelPreview\.look\.rot[XYZ]$/.test(inp.dataset.p)&&S.holes.modelPreview?.randomAxis)||(inp.dataset.p==='holes.modelPreview.look.diskOut'&&S.holes.modelPreview?.growth?.on); const v=modelAngle?AsgardModelPreview.hole(S.holes.modelPreview)[inp.dataset.p.split('.').pop()]:use?live[key]:getPath(o,p); if(inp.type==='range'){ inp.value=v; const em=$(`#panel em[data-v="${CSS.escape(inp.dataset.p)}"]`); if(em)em.textContent=fmtv(v,{step:+inp.step}); }else if(inp.type==='checkbox')inp.checked=!!v; }); }

/* ---------------- sections ---------------- */
function head(eyebrow, title, note){ return `<div class="eyebrow">${eyebrow}</div><h2>${title}</h2>${note?`<p class="note">${note}</p>`:''}`; }

function secSphere(){
  return head('EDITING','Sphere','Your rotating surface, the light that reveals it, and the busts riding its curve.')
  + group('Move & size', [R('sphere.x','Move left or right',0,1,.005), R('sphere.y','Move up or down',.3,1.2,.005), R('sphere.r','Make it bigger',.15,.9,.005), K('sphere.show','Show the sphere')])
  + group('Color & light', [K('sphere.tint','Tint the original surface'), C('sphere.tintColor','Tint color'), K('sphere.autoLight','Lit automatically by the sky and nearby black holes'), R('sphere.autoStrength','How strongly they light it',0,3,.01), ...(S.sphere.autoLight===false?[R('sphere.topLight','Light from above',0,4,.05), R('sphere.topSharp','How tight the light from above',0.5,12,.1), R('sphere.topToward','Light comes from the front',-1,2,.01), R('sphere.topSide','Light from left / right',-2,2,.01), C('sphere.topColor','Light from above color')]:[]), R('sphere.tabLight','Light from the tabs',0,4,.05), R('sphere.lightWidth','Spread the light sideways',0,1,.01), R('sphere.lightHeight','Spread the light up and down',0,.5,.005), R('sphere.ambient','How much shows with no light',0,1,.005), R('sphere.limb','Darken toward the edge',0,1,.01), R('sphere.body','Solid dark ball (0 = invisible)',0,1,.01)], 'sphLight')
  + group('Surface movement', [R('sphere.spin','How fast the surface turns',-1,1,.005), R('sphere.tilt','Lean the spinning axis',-90,90,.1), SEL('sphere.texture','Surface',[['ui/sphere_red.jpg','Your runes'],['ui/sphere_teal.jpg','Your runes (teal version)']]), R('sphere.texRepeat','Rune size (smaller = bigger runes)',1,6,.1)], 'sphSurf')
  + group('Busts on the curve', [R('rolodex.count','People on the curve',3,13,1), R('rolodex.bustH','Bust size',50,220,1), R('rolodex.minScale','Smallest bust (top & bottom)',.2,1,.01), R('rolodex.spacing','Space between people',8,40,.5), R('rolodex.side','Move busts left or right (they keep flowing around the sphere)',-90,90,.5), R('rolodex.pathR','How far out from the sphere they ride',.6,1.8,.01), R('rolodex.bulge','Curve depth',0,1.5,.01), R('rolodex.offsetX','Nudge the whole path left / right',-.5,.5,.005), R('rolodex.offsetY','Curve up / down',-.3,.3,.005), R('rolodex.turn','How much busts turn with the curve',0,2,.01), R('rolodex.behindFade','Fade people going behind',0,1,.01)])
  + group('Rolodex swipe & coast', [K('rolodex.inertia','Keep coasting after a swipe'), R('rolodex.swipe','Swipe strength',.2,3,.05), R('rolodex.coast','Coast time (seconds)',.1,2,.01), R('rolodex.maxSpeed','Top speed (people / second)',1,30,.5), K('rolodex.settle','Settle on the nearest person')]);
}
function secTabs(){
  return head('EDITING','Message tabs','Name → tether line → tab. Always attached. Move the tab and the line stretches to follow.')
  + group('Move & size', [K('tabs.show','Show message tabs'), SEL('tabs.follow','Tabs follow',[['bust','Each bust along the curve'],['sphere','The sphere’s curved edge']]), R('tabs.tabX','Move the tab left or right',-120,200,1), R('tabs.tabY','Move the tab up or down',-60,60,1), R('tabs.offsetX','Move name + tab left or right',-60,120,1), R('tabs.offsetY','Move name + tab up or down',-60,60,1), R('tabs.boxW','Make the tab longer',40,260,1), R('tabs.boxH','Make the tab taller',12,80,1), R('tabs.corners','Round the corners',0,30,.5), K('tabs.shrink','Shrink tabs with smaller busts'), R('tabs.minScale','Hide tabs on the smallest busts',0,1,.01), R('tabs.edgeMargin','Keep tabs this far from the screen edge',0,60,1)], 'tMove')
  + group('Color & see-through', [SEL('tabs.style','Tab look',[['fill','See-through color'],['outline','Outline only']]), C('tabs.box','Main color'), C('tabs.color2','Color at the other end'), R('tabs.gradientAngle','Color direction',0,360,1), R('tabs.gradientEnd','Where the second color starts',.01,1,.01), R('tabs.boxOpacity','How solid it looks',0,2,.01), R('tabs.border','Edge thickness',.2,5,.05)], 'tColor')
  + group('Glow & light (also lights the sphere)', [C('tabs.glowColor','Glow color'), R('tabs.glow','Make the glow brighter',0,3,.01), R('tabs.glowSpread','Spread the glow',0,80,1), R('tabs.glowSoft','Soften the glowing edge',0,20,.5), R('tabs.glowAngle','Point the glow',0,360,1), R('tabs.glowShift','Move glow toward that direction',0,60,1)], 'tGlow')
  + group('Names', [R('tabs.nameNear','Name brightness up close',0,1,.01), R('tabs.nameFar','Name brightness far away',0,1,.01), R('tabs.nameSize','Name size',7,30,.5), C('tabs.nameColor','Name color'), SEL('tabs.nameFont','Letter style',[['system-ui','Clean'],['Georgia','Classic'],['ui-monospace','Technical'],['Impact','Bold display']]), SEL('tabs.nameStyle','Weight & slant',[[0,'Regular'],[1,'Bold'],[2,'Slanted'],[3,'Bold and slanted']])], 'tName')
  + group('Message text', [R('tabs.msgNear','Message brightness up close',0,1,.01), R('tabs.msgFar','Message brightness far away',0,1,.01), R('tabs.msgSize','Message size',6,28,.5), C('tabs.msgColor','Message color'), SEL('tabs.msgFont','Letter style',[['system-ui','Clean'],['Georgia','Classic'],['ui-monospace','Technical'],['Impact','Bold display']]), SEL('tabs.msgStyle','Weight & slant',[[0,'Regular'],[1,'Bold'],[2,'Slanted'],[3,'Bold and slanted']]), R('tabs.msgPad','Space inside the tab',0,30,.5)], 'tText')
  + group('Tether line (name → tab)', [R('tabs.lineLen','Line length',0,120,1), R('tabs.lineWidth','Line thickness',.3,4,.05), C('tabs.lineColor','Line color'), R('tabs.lineOpacity','How solid the line looks',0,1,.01), R('tabs.lineFade','Fade toward the name (0 = solid)',0,1,.01), R('tabs.lineFadeLen','Where the fade gets full',0.05,0.99,.01), R('tabs.lineGlow','Line glow',0,3,.01)], 'tLine')
  + group('New, unread & read', [R('tabs.newTint','New message tint',0,1,.01), R('tabs.unreadTint','Unread message tint',0,1,.01), R('tabs.readTint','Read message tint',0,1,.01), R('tabs.unreadGlow','Extra glow when unread',1,4,.01), R('tabs.readDim','Brightness once read',.1,1,.01)], 'tState');
}
function secBackground(){
  const L = S.bg.layers.find(l=>l.id===selLayer);
  let h = head('EDITING','Background','Your sky behind the black holes. Everything here is what the holes bend.')
  + group('Changing backgrounds', [R('bg.cycleSeconds','Seconds each image stays',3,180,1), R('bg.blendSeconds','Seconds to blend into the next',0,30,.1), K('bg.randomOrder','Random order'), K('bg.randomTime','Random time each image stays'), R('bg.drift','Slow drift',0,2,.01)], 'bgcycle')
  + group('Move the background (to judge the bending)', [K('bg.pan','Keep the background moving'), R('bg.panSpeedX','Left / right speed',-80,80,.5), R('bg.panSpeedY','Up / down speed',-80,80,.5)], 'bgPan')
  + group('Rendered stars', [K('bg.starsOn','Show rendered stars'), R('bg.stars','How many stars',0,1000,10), R('bg.starSize','Star size',.3,3,.05), C('bg.starColor','Star color'), R('bg.starFadeStart','Where stars begin to fade',0,1,.005), R('bg.starFadeEnd','Where stars disappear',0,1.2,.005), R('bg.twinkle','Twinkle',0,1,.01)], 'bgStars')
  + `<div class="btnrow"><button class="btn" id="shuffle">Shuffle again</button><button class="btn" id="restartCycle">Restart cycle</button></div>`
  + group('Fade to show the sphere', [R('bg.fadeStart','Fade starts',0,1,.005), R('bg.fadeEnd','Fully faded at',0,1.2,.005), R('bg.fadeAmount','Fade strength',0,1,.01), C('bg.fadeColor','Fade color'), R('bg.skyDim','Whole sky brightness',0,1.5,.01)], 'bgfade');
  h += `<p class="note">Click a picture to show it right now and edit it. Pictures with “In the cycle” ticked take turns; unticked ones sit on top. “Use only this” makes it your one background.</p><div class="thumbs">` + S.bg.layers.map(l=>`<div class="thumb ${l.id===selLayer?'on':''}"><img data-ly="${l.id}" src="${l.thumb||l.src}" title="Edit"><div class="tb"><b>${esc(l.name)}</b><label><input type="checkbox" data-cyc="${l.id}" ${l.cycle?'checked':''}> In the cycle</label><label><input type="checkbox" data-vis="${l.id}" ${l.visible!==false?'checked':''}> Visible</label><div class="btnrow"><button class="btn" data-only="${l.id}">Use only this</button><button class="btn" data-del="${l.id}">Remove</button></div></div></div>`).join('') + `</div>`;
  h += `<div class="btnrow"><button class="btn acc" id="addBgLib">＋ Add from your backgrounds & clips</button><button class="btn" id="addBgFile">＋ Upload</button></div>`;
  if(L) h += `<h2 style="margin-top:16px;font-size:18px">${esc(L.name)}</h2>` + group('This picture', [R('layer.brightness','Brightness',0,2.5,.01), R('layer.opacity','See-through',0,1,.01), R('layer.saturate','Color strength',0,2,.01), R('layer.hue','Color shift',-180,180,1), R('layer.blur','Blur',0,12,.1)], 'lyLook')
    + group('Crop & position', [R('layer.zoom','Zoom in',1,4,.01), R('layer.panX','Move left / right',-1,1,.005), R('layer.panY','Move up / down',-1,1,.005), R('layer.top','Top edge',0,1,.005), R('layer.bottom','Bottom edge',0,1.2,.005), R('layer.move','Drift amount',0,3,.01)], 'lyCrop')
    + group('Fade this picture out at the bottom', [K('layer.fadeBottom','Fade the bottom'), R('layer.fadeFrom','Fade starts',0,1,.005), R('layer.fadeTo','Gone by',0,1.2,.005)], 'lyFade');
  return h;
}
const LOOK = {
  shape: [R('look.size','Size',8,90,.5), R('look.rotX','Tilt (0 = edge-on, 90 = face-on)',-90,90,.5), R('look.rotY','Turn left / right',-180,180,.5), R('look.rotZ','Roll',-180,180,.5), R('look.camDist','Camera distance (perspective)',12,80,.5)],
  lens: [R('look.lens','Light bending strength',0,3,.01), R('look.reach','Size of the bent-light ring (Einstein ring)',0,3,.01), R('look.edgeWidth','How tight the bending hugs the edge (small = tight)',.2,20,.1)],
  horizon: [C('look.horizonColor','Shadow color'), R('look.faceAmt','Show their face inside',0,1,.01), R('look.faceZoom','Face size',.4,1.4,.01), R('look.faceSphere','Wrap the face around a ball',0,1,.01), R('look.faceShade','Shade the ball (light & dark side)',0,1,.01), R('look.faceTurn','Ball turns left / right',0,1.2,.01), R('look.faceCover','How much of the ball the face covers',.6,1.6,.01)],
  disk: [SEL('look.disk','Disk',[[1,'On'],[0,'Off']]), R('look.diskIn','Inner edge',2,8,.05), R('look.diskOut','Outer edge',4,40,.1), R('look.diskBright','Brightness',0,5,.01), R('look.diskFalloff','Fade outward',0,4,.01), C('look.diskColorIn','Inner color'), C('look.diskColorOut','Outer color'), R('look.temp','Color spread',0,1,.01), R('look.diskOpacity','Solid / see-through',0,1,.01), R('look.diskThick','Thickness (haze)',0,1,.01)],
  gas: [R('look.diskTexture','Turbulence',0,1,.01), R('look.diskStreaks','Fine streaks',0,1,.01), R('look.clumps','Clumps & debris',0,1.5,.01), R('look.arms','Spiral arms (0 = none)',0,6,1), R('look.armSharp','Arm sharpness',1,16,.1), R('look.diskSwirl','Swirl',0,6,.01), R('look.diskSpin','Spin speed',0,4,.01), SEL('look.diskDir','Spin direction',[[1,'Counter-clockwise'],[-1,'Clockwise']]), R('look.doppler','Bright side / dim side (Doppler)',0,1.5,.01)],
  ring: [R('look.ring','Photon ring',0,4,.01), C('look.ringColor','Ring color'), R('look.ringWidth','Ring thickness',.02,1,.005), R('look.corona','Shell of light',0,3,.01), C('look.coronaColor','Shell color'), R('look.coronaWidth','Shell reach',.1,5,.01), R('look.shellMotion','Shell movement',0,1,.01)],
  extra: [R('look.glow','Soft glow',0,2,.01), C('look.glowColor','Glow color'), R('look.flare','Horizontal flare',0,3,.01), C('look.flareColor','Flare color'), R('look.flareLen','Flare length',.5,20,.1), R('look.flareWidth','Flare thickness',.01,.4,.005), R('look.jets','Jets',0,3,.01), C('look.jetColor','Jet color'), R('look.jetLen','Jet length',2,60,.5), R('look.jetWidth','Jet width',.1,4,.01)],
  sky: [R('look.envColor','Colors come from the sky around it',0,1,.01), R('look.envRadius','How far around it to pick up color',1,6,.05), R('look.envFeed','Bright clouds feed a brighter glow',0,1.5,.01), R('look.vary','Every hole different (angle, spin)',0,2,.01)],
  finish: [R('look.exposure','Exposure',.2,3,.01), R('look.form','Fully formed',0,1,.01)],
  pair: [SEL('look.pair','Two holes orbiting (never merge)',[[0,'Off'],[1,'On']]), R('look.pairRatio','Second hole size',.15,1,.01), R('look.pairSep','Distance apart',1.6,8,.05), R('look.pairSpeed','Orbit speed',0,2,.01), R('look.pairTilt','Orbit tilt (0 = flat line)',0,1,.01)],
};
function useModelPreview(item){
  const hs=S.holes;hs.modelDrafts ||= {};
  if(hs.modelPreview)hs.modelDrafts[hs.modelPreview.id]=clone(hs.modelPreview);
  hs.quickTier=3;
  hs.modelPreview=hs.modelDrafts[item.id]?{...clone(hs.modelDrafts[item.id]),on:true}:AsgardModelPreview.create(item,hs.referencePreview);
  if(!hs.modelPreview)return;
  if(hs.together)hs.together.on=false;
  for(const layer of S.bg.layers)if(layer.src===item.clip||layer.src===item.still){layer.visible=false;}
  setAnglePractice(null);change();$('#lib').hidden=true;showSec('holes');$('#panel').scrollTop=0;
  toast('Live animated 3D · '+item.name);
}
function tierQuickNav(){
  const stage=S.holes.quickTier||(S.holes.modelPreview?.on?3:(S.holes.referencePreview?.on?2:1));
  return `<div aria-label="Views tier selection" style="position:sticky;top:0;z-index:5;background:#13181c;padding:10px 0;border-bottom:1px solid #36424a"><b>Views tiers</b><div class="btnrow" style="margin-top:8px"><button class="btn acc" id="playBothTiers" ${S.holes.modelPreview?'':'disabled'}>${S.holes.together?.on?'All tiers drifting left → right':'▶ Run all tiers left → right'}</button></div><div class="btnrow" style="margin-top:8px"><button class="btn ${stage===1?'acc':''}" data-quick-tier="1">1 · 0–20</button><button class="btn ${stage===2?'acc':''}" data-quick-tier="2">2 · 21–149</button><button class="btn ${stage===3?'acc':''}" data-quick-tier="3" ${S.holes.modelPreview?'':'disabled'}>3 · 150–499</button></div><div class="btnrow" style="margin-top:8px"><button class="btn" data-jump="axis">Axis controls</button><button class="btn" data-jump="rings">Smallest / largest rings</button></div></div>`;
}
function playBothTiers(){
  if(!S.holes.modelPreview)return toast('Choose your tier 3 look first');
  S.holes.together={followers:50,speed:18,...S.holes.together,on:true,variety:true,variedFollowers:true,drift:true};
  S.holes.behavior.direction=1;
  S.holes.active='viewers';S.holes.mode='sky';setAnglePractice(null);
  scene.playing=true;if(scene.speed<=0){scene.speed=1;$('#speed').value=1;}
  $('#playBtn').textContent='❚❚';$('#playLbl').textContent='Moving';
  change();showSec('holes');$('#panel').scrollTop=0;
}
function secTogether(){
  const hs=S.holes;hs.together={followers:50,drift:true,speed:18,variety:true,variedFollowers:true,...hs.together};
  hs.modelPreview.growth=AsgardModelPreview.growth(hs.modelPreview);
  ui.open.togetherViews=true;ui.open.togetherMotion=true;
  let h=head('LIVE SKY · ALL TIERS','All tiers drifting left → right','Diskless holes and both feeding tiers, with different view counts, follower sizes and fixed random angles. They leave at the right and return from the left.');
  if(!scene.engine.gl)h+='<p role="status" class="note">Tier 3 needs WebGL 2. This browser can only show the tier 2 renderer.</p>';
  h+=group('Sky population',[K('holes.together.variety','Mixed views · small, medium and large disks'),K('holes.together.variedFollowers','Different follower counts · different sphere sizes'),K('holes.together.drift','Drift left to right'),R('holes.together.speed','Drift speed',0,40,.5)],'togetherMotion');
  if(!hs.together.variedFollowers)h+=group('Follower size',[R('holes.together.followers','Followers for every hole',0,20000,1)],'togetherFollowers');
  h+='<p class="note">Tier 1: 0–20 views, no disk. Tier 2: 21–149 views. Tier 3: 150–499 views. Views set the rings; followers set sphere size. Every streamer keeps its own angle.</p>';
  if(!hs.together.variety){
    h+=group('Compare selected view counts',[R('holes.referenceGrowth.views','Tier 2 · preview views',21,149,1),R('holes.modelPreview.growth.views','Tier 3 · preview views',150,499,1)],'togetherViews');
    h+='<div class="btnrow"><button class="btn" id="bothSmall">Both smallest rings</button><button class="btn" id="bothLarge">Both largest rings</button></div>';
    h+=group('Follower size',[R('holes.together.followers','Followers for every hole',0,20000,1)],'togetherFollowers');
  }
  h+=`<p class="note">Tier 2 ring limits: ${hs.referenceGrowth.ringStart.toFixed(2)} → ${hs.referenceGrowth.ringEnd.toFixed(2)}<br>Tier 3 ring limits: ${hs.modelPreview.growth.ringStart.toFixed(1)} → ${hs.modelPreview.growth.ringEnd.toFixed(1)}</p>`;
  h+='<div class="btnrow"><button class="btn" data-quick-tier="1">Edit tier 1</button><button class="btn" data-quick-tier="2">Edit tier 2 · rings & axis</button><button class="btn" data-quick-tier="3">Edit tier 3 · rings & axis</button></div><p class="note">Whole sky returns to all tiers drifting left to right.</p>';
  return h;
}
function secModelPreview(){
  const m=S.holes.modelPreview,p='holes.modelPreview.',l=p+'look.';
  S.holes.modelVariants ||= [];m.growth=AsgardModelPreview.growth(m);
  for(const key of ['modelSize','modelDisk','modelMotion','modelGrowth','modelAxisLimits'])if(ui.open[key]===undefined)ui.open[key]=true;
  let h=head('LIVE 3D DRAFT',m.name,'The same animated model you chose in the library, now bending your live sky. Tier 2 is kept separately.');
  if(!scene.engine.gl)h+='<p role="status" class="note">This browser cannot display the 3D model because WebGL 2 is unavailable. Your settings remain editable.</p>';
  h+=`<div class="btnrow"><button class="btn" id="backToTier2">Back to tier 2</button><button class="btn" id="pickLib">Choose another 3D look</button></div>`;
  h+=group('Smallest & largest ring · tier 3',[K(p+'growth.on','Grow the ring with views'),R(p+'growth.ringStart','Smallest ring · 150 views',3.2,40,.1),R(p+'growth.ringEnd','Largest ring · 499 views',3.2,40,.1),R(p+'growth.views','Preview views · tier 3',150,499,1)],'modelGrowth');
  h+='<div class="btnrow"><button class="btn" id="modelSmall">Show smallest</button><button class="btn" id="modelLarge">Show largest</button></div><p id="modelGrowthReadout" class="note" role="status"></p><p class="note">Adjust either endpoint to preview it immediately. The ring grows between your two sizes; the black sphere keeps its follower size.</p>';
  h+=group('Angle & axis',[K(p+'randomAxis','Different fixed axis for each streamer'),SEL(p+'streamerId','Preview a different streamer',scene.contacts.map(c=>[c.id,c.name])),R(l+'rotX','View angle · side to above',3,90,1),R(l+'rotY','Turn the disk axis left / right',-80,80,1),R(l+'rotZ','Rotate the whole axis on screen',-180,180,1)],'modelAxisLimits');
  h+=group('Entire black hole',[R(l+'size','Entire black hole size',12,80,.5),R(p+'x','Move left / right',0,1,.005),R(p+'y','Move up / down',.05,.65,.005)],'modelSize');
  h+=group('Ring size & density',[R(l+'diskOut','Current ring size · manual',3.2,40,.1),R(l+'diskIn','Inner edge of disk',2,8,.05),R(l+'diskOpacity','Gas density / opacity',0,1,.01),R(l+'diskThick','Disk thickness',.005,.3,.005)],'modelDisk');
  h+=group('Spin & drift',[R(l+'diskSpin','Ring spinning speed',0,4,.05),SEL(l+'diskDir','Spin direction',[[1,'Forward'],[-1,'Reverse']]),K(p+'drift','Let this black hole drift'),R(p+'driftSpeed','Drifting speed',0,3,.05)],'modelMotion');
  h+='<p class="note">The disk revolves while its axis stays fixed. Angle sliders switch to manual.</p>';
  h+=group('Color & glow',[C(l+'diskColorIn','Inner gas color'),C(l+'diskColorOut','Outer gas color'),R(l+'diskBright','Disk glow / brightness',0,6,.05),R(l+'diskFalloff','Fade toward the outer edge',.1,5,.05),R(l+'glow','Glow around the disk',0,2,.01),C(l+'glowColor','Outer glow color')],'modelColor');
  h+=group('Inner rings & fine detail',[R(l+'ring','Inner ring brightness',0,4,.05),R(l+'ringWidth','Inner ring thickness',.01,.5,.01),C(l+'ringColor','Inner ring color'),R(l+'corona','Soft light around the edge',0,2,.01),R(l+'coronaWidth','Soft light width',.1,3,.05),R(l+'diskTexture','Gas texture',0,1,.01),R(l+'diskStreaks','Fine gas streaks',0,1,.01),R(l+'doppler','Bright side of the spinning disk',0,1,.01)],'modelDetail');
  h+=group('Live light bending',[R(l+'lens','Lensing strength',0,2,.01),R(l+'reach','Lensing reach',.1,1.5,.01),R(l+'edgeWidth','Outer lens blending',.5,6,.05)],'modelLens');
  h+=group('Jets',[R(l+'jets','Jet intensity',0,2,.05),R(l+'jetLen','Jet length',1,30,.5),R(l+'jetWidth','Jet width',.1,3,.05),C(l+'jetColor','Jet color')],'modelJets');
  h+=`<section class="grp"><div class="gb"><h3>Save this look</h3><p class="hint">Changes save automatically to the shared studio. Save a variant to keep another version.</p><select id="modelVariant" aria-label="Saved 3D variants"><option value="">Current working look</option>${S.holes.modelVariants.map(v=>`<option value="${esc(v.id)}" ${m.variantId===v.id?'selected':''}>${esc(v.name)}</option>`).join('')}</select><input id="modelVariantName" aria-label="3D variant name" placeholder="Name this variant" maxlength="80"><div class="btnrow"><button class="btn acc" id="saveModelVariant">Save new variant</button><button class="btn" id="updateModelVariant" ${m.variantId?'':'disabled'}>Update saved</button><button class="btn" id="resetModel">Restore library look</button></div></div></section>`;
  return h;
}
function secQuietPreview(){
  const h=AsgardModelPreview.quiet(S.holes);S.holes.quietPreview ||= {x:h.x,y:h.y,size:h.size,lens:h.lens,reach:h.reach};
  const p='holes.quietPreview.';ui.open.quietSize=true;ui.open.quietLens=true;
  return head('VIEWS TIER 1 · 0–20','No viewers','The quiet black sphere and its live light bending, before tier 2 starts feeding.')+group('Size & position',[R(p+'size','Entire black hole size',12,80,.5),R(p+'x','Move left / right',0,1,.005),R(p+'y','Move up / down',.05,.65,.005)],'quietSize')+group('Live light bending',[R(p+'lens','Lensing strength',0,2,.01),R(p+'reach','Lensing reach',.1,1.5,.01)],'quietLens');
}
function secHoles(){
  const hs=S.holes;
  let h=tierQuickNav();
  if(hs.together?.on && hs.modelPreview)h+=secTogether();
  if(hs.active==='viewers'){
    const tier=hs.quickTier|| (hs.modelPreview?.on?3:2);
    h+=tier===1?secQuietPreview():tier===3&&hs.modelPreview?secModelPreview():secReferencePreview();
  }
  return h+secSavedHoleControls();
}
function secReferencePreview(){
  const hs = S.holes, d = hs.dashboards[hs.active], t = curTier();
  let h = head('EDITING','Black holes','Shape your selected black hole live, then save each look as its own variant.');
  hs.referencePreview = AsgardVariants.settings(hs.referencePreview || {on:false,x:.5,y:.235,radius:40,speed:1.35});
  hs.referenceOriginal ||= clone(hs.referencePreview);
  hs.referenceVariants ||= [];
  hs.referencePreview.spinDirection ??= 1;
  if(ui.open.hReference===undefined)ui.open.hReference=true;
  if(ui.open.hRefShape===undefined)ui.open.hRefShape=true;
  if(ui.open.hRefAngle===undefined)ui.open.hRefAngle=true;
  if(ui.open.hRefGrowth===undefined)ui.open.hRefGrowth=true;
  const ref='holes.referencePreview.';
  h += `<section class="grp" aria-label="Entire black hole"><div class="gb"><h3>Entire black hole</h3>${[K(ref+'on','Show this black hole live'),R(ref+'radius','Entire black hole size',12,80,.5)].map(ctlHtml).join('')}<p class="hint">Scales the black center and all its gas together. Ring size below changes only the disk.</p></div></section>`;
  h += `<div class="gb" style="padding:10px 14px"><label for="refVariant">Saved variants</label><select id="refVariant" style="width:100%;margin:8px 0;padding:8px;background:#111820;color:#eaf4f6;border:1px solid #39444d;border-radius:6px"><option value="">Current working look</option>${hs.referenceVariants.map(v=>`<option value="${esc(v.id)}" ${hs.referenceVariantId===v.id?'selected':''}>${esc(v.name)}</option>`).join('')}</select><input id="refVariantName" aria-label="Variant name" placeholder="Name this variant" maxlength="80" style="width:100%;box-sizing:border-box;margin-bottom:8px;padding:8px;background:#111820;color:#eaf4f6;border:1px solid #39444d;border-radius:6px" value="${esc(hs.referenceVariants.find(v=>v.id===hs.referenceVariantId)?.name||'')}"><div class="btnrow"><button class="btn acc" id="saveRefVariant">Save new variant</button><button class="btn" id="updateRefVariant" ${hs.referenceVariantId?'':'disabled'}>Update saved</button></div><button class="btn" id="refOriginal" style="margin-top:8px">Return to approved original</button></div>`;
  h += group('Tier 2 · grow with views', [K('holes.referenceGrowth.on','Grow the disk with views'),R('holes.referenceGrowth.ringStart','Smallest ring · 21 views',.45,1.8,.01),R('holes.referenceGrowth.ringEnd','Largest ring · 149 views',.45,1.8,.01),R('holes.referenceGrowth.views','Preview views · tier 2',21,149,1)], 'hRefGrowth');
  h += '<div class="btnrow"><button class="btn" id="tier2Start">21 views · start</button><button class="btn" id="tier2End">149 views · full disk</button></div>';
  h += '<p class="note">Set your smallest ring at 21 views and your largest at 149. Moving an endpoint previews it immediately. Follower size stays independent.</p><p class="note" id="refLiveReadout" role="status"></p>';
  h += group('Ring size & density', [R(ref+'ringSize','Ring size',.45,1.8,.01),R(ref+'density','Gas density / opacity',0,3,.05)], 'hRefShape');
  h += group('Angle & axis', [K('holes.orientation.random','Different fixed axis for each black hole'),SEL('holes.referenceGrowth.streamerId','Preview a different streamer',scene.contacts.map(c=>[c.id,c.name])),K(ref+'view3d','Adjust the viewing angle in 3D'),R(ref+'tilt','View angle · 3° side / 90° above',3,90,1),R(ref+'axisY','Turn the disk axis left / right',-80,80,1),R(ref+'axisZ','Rotate the whole axis on screen',-180,180,1),R(ref+'thickness','3D disk thickness',.3,2,.05)], 'hRefAngle');
  h += '<div class="btnrow"><button class="btn" id="newHoleAxes">Choose a new random set of axes</button></div><p class="note">Each streamer keeps the same angle while drifting and gaining views. Moving an angle slider switches to manual. Editing ring size or density switches off growth by views.</p>';
  h += group('Color & glow', [C(ref+'tintColor','Gas color'),R(ref+'tintAmount','Color blend · 0 keeps original colors',0,1,.05),R(ref+'glow','Glow / brightness',0,3,.05)], 'hRefColor');
  h += group('Motion & live lensing', [K('holes.behavior.driftViews','Drift across the sky'),R('holes.behavior.speed','Drift speed',0,60,.5),SEL('holes.behavior.direction','Drift direction',[[1,'Left to right'],[-1,'Right to left']]),R(ref+'speed','Ring rotation speed',0,3,.05),SEL(ref+'spinDirection','Ring direction',[[1,'Clockwise'],[-1,'Counter-clockwise']]),R('holes.rule.lens','Live sky lensing',0,2.5,.05),R('holes.rule.edge','How far lensing reaches',.3,3.2,.05)], 'hRefMotion');
  return h;
}
function secSavedHoleControls(){
  const hs=S.holes,d=hs.dashboards[hs.active],t=curTier();let h='';
  h += `<div class="dash">${Object.entries(DASH).map(([k,l])=>`<button data-dash="${k}" class="${k===hs.active?'on':''}">${l}</button>`).join('')}</div>`;
  h += hs.active==='friends' ? `<p class="note"><b>Followers set the size of the hole</b> (and the hole itself). Disk, feeding and strong warping come from <b>Views</b> as viewers grow.</p>`
     : hs.active==='viewers' ? `<p class="note"><b>Views set the disk, feeding and warping.</b> Tier 1 = no extra (the Followers hole as is). Size always comes from Followers.</p>` : `<p class="note">Followers are not used for the look right now.</p>`;
  if(hs.active==='friends' || hs.active==='viewers'){
    h += `<div class="dash"><button data-view="sky" class="${hs.mode==='sky'?'on':''}">Whole sky</button><button data-view="friendsAll" class="${hs.mode==='friendsAll'?'on':''}">All side by side</button><button data-view="friendsOne" class="${hs.mode==='friendsOne'?'on':''}">One by itself</button><button data-view="viewsTour" class="${hs.mode==='viewsTour'?'on':''}">One after another</button></div>`;
    if(hs.mode==='friendsOne') h += `<div class="btnrow"><button class="btn" id="tPrev">◀ Previous</button><button class="btn" id="tNext">Next ▶</button></div>`;
  }
  if(hs.active==='friends'){
    h += group('How many & where they fly', [R('holes.behavior.count','Holes on screen at once',1,4,1), R('holes.behavior.bandTop','Highest they fly',0,1,.005), R('holes.behavior.bandBottom','Lowest they fly',0,1,.005), R('holes.behavior.minGap','Space kept between holes',0,120,1), R('holes.behavior.warpApart','Keep their warps apart (1 = warps never touch)',0,1.5,.01), R('holes.behavior.capture','Big ones catch small ones (0 = off)',0,1,.01), R('holes.behavior.captureRatio','How small to get caught (vs the big one)',0.3,0.95,.01), R('holes.behavior.orbitTime','Seconds orbiting before slung away',2,40,1), R('holes.behavior.orbitSpeed','Orbit speed',0.05,1.5,.01), R('holes.behavior.sling','Sling-away force',1,2.5,.01), R('holes.behavior.interact','Gravity between holes (bigger pulls smaller)',0,3,.01), R('holes.behavior.mutual','Holes bend each other’s light',0,2,.01)], 'hRange');
    h += group('Drift', [K('holes.behavior.driftViews','Holes drift across, then start over'), R('holes.behavior.speed','Drift speed',0,60,.5), SEL('holes.behavior.direction','Drift direction',[[1,'Left to right'],[-1,'Right to left']]), K('bg.pan','Also move the background')], 'hDrift');
    h += group('Sizes (you set smallest & biggest, the rest fill in)', [K('holes.friendSize.auto','Fill in the sizes between automatically'), R('holes.friendSize.min','Smallest (tier 1)',4,80,.5), R('holes.friendSize.max','Biggest (tier 6)',4,120,.5)], 'hFSize');
    const T = hs.dashboards.friends.tiers; h += `<div class="kv" id="fsRead" style="flex-wrap:wrap;gap:8px"></div>`;
  }
  h += `<div class="tiers">` + d.tiers.map((t,i)=>`<div class="tier ${i===hs.selTier?'on':''}" data-tier="${i}"><img src="${t.libId?(LIB.find(x=>x.id===t.libId)||{}).thumb||'':''}" onerror="this.style.visibility='hidden'"><div><b>${i+1}. ${esc(t.name)}</b><small>${t.libId?esc((LIB.find(x=>x.id===t.libId)||{}).name||''):'Built-in look'}</small></div><input type="number" min="0" value="${t.start}" data-start="${i}" title="Starts at this many ${COUNT_WORD[hs.active]}" ${i===0?'disabled':''}></div>`).join('') + `</div>`;
  h += `<div class="btnrow"><button class="btn acc" id="pickLegacyLib">Choose this tier’s black hole</button><button class="btn" id="formPrev">Preview forming</button><button class="btn" id="copyTier">Copy look</button><button class="btn" id="pasteTier">Paste look</button></div>`;
  h += `<div class="c"><label>Tier name</label><input type="text" id="tierName" value="${esc(t.name)}"></div>`;
  h += `<div class="c"><label>Seconds to change into this tier<em>${t.seconds}</em></label><input type="range" min="0" max="10" step=".1" value="${t.seconds}" id="tierSecs"></div>`;
  const shape = (hs.active==='friends' && hs.friendSize && hs.friendSize.auto) ? LOOK.shape.filter(c=>c.path!=='look.size') : LOOK.shape;
  h += group('Size & angle (X, Y, Z)', shape, 'hShape') + group('Light bending', LOOK.lens, 'hLens') + group('Shadow & face', LOOK.horizon, 'hHor')
     + group('Disk & hot gas', LOOK.disk, 'hDisk') + group('Gas detail & spin', LOOK.gas, 'hGas') + group('Photon ring & shell of light', LOOK.ring, 'hRing')
     + group('Glow, flare & jets', LOOK.extra, 'hExtra') + group('Exposure & forming', LOOK.finish, 'hFin') + group('Pair — two holes orbiting', LOOK.pair, 'hPair');
  if(hs.active==='viewers') h += group('Feeding from the sky around it', LOOK.sky, 'hSky');
  if(hs.active==='friends') h += group('Face as a reflection on a glossy black ball', [K('holes.refl.on','Show the face as a reflection'), R('holes.refl.size','How much of the ball the face covers (smaller = bigger face)',0.3,1.6,.01), R('holes.refl.bright','Face brightness',0,1.6,.01), R('holes.refl.blur','Face softness',0,3,.05), R('holes.refl.rimSky','Sky mirrored around the rim',0,2,.01), R('holes.refl.catch','Catchlight (light caught on the ball)',0,3,.01), R('holes.refl.gloss','Catchlight size',0.2,4,.01)], 'hRefl');
  if(hs.active==='friends'){ const sel=Math.max(0,Math.min(hs.dashboards.friends.tiers.length-1,parseInt(hs.selTier)||0)), tr=hs.dashboards.friends.tiers[sel];
    tr.build=Object.assign({ on:false, crestOn:true, crest:1.2, crestAngle:-120, crestSpan:6, crestWidth:0.03, crestColor:'#ffe2b8', diskOn:true, kind:0.5, size:4, gap:0.2, tilt:18, roll:-15, vary:0, dir:1, spin:0.8, thick:0.03, see:0.8, dark:0.6, bright:1, turb:0.8, streaks:0.7, skyTint:0.4, tumble:0, tumbleSpeed:0.15 }, tr.build||{});
    const P='holes.dashboards.friends.tiers.'+sel+'.build.';
    if(ui.open.hBuild===undefined) ui.open.hBuild=true;
    h += group('Build your hole: tier '+(sel+1)+' ('+tr.name+')', [K(P+'on','Use my build for this tier'),
      K(P+'crestOn','Glare (crest of shine) on the edge'), R(P+'crest','Glare brightness',0,4,.01), R(P+'crestAngle','Glare position around the edge',-180,180,1), R(P+'crestSpan','Glare length (higher = shorter)',1,40,.5), R(P+'crestWidth','Glare thickness',0.004,0.15,.001), C(P+'crestColor','Glare color'),
      K(P+'diskOn','Disk'), R(P+'kind','Disk kind: distortion → dust → gas → white-hot plasma',0,1,.01), R(P+'tilt','Disk angle (0 = edge-on, 90 = from above)',0,90,.5), R(P+'roll','Disk roll (pivot left/right)',-90,90,.5), R(P+'size','Disk size',0.5,14,.1), R(P+'gap','Gap between bubble and disk',0,4,.05), R(P+'thick','Disk thickness',0,0.3,.005), R(P+'see','Disk see-through (0 = clear)',0,1,.01), R(P+'dark','Dust darkness',0,1,.01), R(P+'bright','Glow brightness',0,3,.01), R(P+'turb','Gas texture',0,1,.01), R(P+'streaks','Streaks',0,1,.01), R(P+'skyTint','Take color from the sky',0,1,.01), R(P+'spin','Spin speed',0,4,.01), R(P+'dir','Spin direction (-1 / 1)',-1,1,2),
      R(P+'tumble','Slowly change angle (degrees)',0,40,.5), R(P+'tumbleSpeed','How fast it changes angle',0,1,.01), R(P+'vary','Each hole a different roll (degrees)',0,90,1)], 'hBuild'); }
  if(hs.active==='friends') h += group('How every follower hole bends space (one rule, all sizes)', [K('holes.rule.on','Use one rule for all follower holes'), R('holes.rule.lens','Bending strength',0,2.5,.01), R('holes.rule.reach','Ring size',0.1,2,.01), R('holes.rule.edge','How far the bending reaches',0.3,6,.05), R('holes.rule.taper','Big holes: keep bending tight (taper)',0,1.5,.01), R('holes.rule.funnel','Inward curve: how dark/deep before the black',0,1,.01), R('holes.rule.width','Inward curve: how far out it starts',1.3,8,.05), R('holes.rule.smear','Stars swirled around the hole',0,1.5,.01), R('holes.rule.glare','Glare on the rim',0,2,.01), R('holes.rule.crest','Crest of shine on the edge',0,4,.01), R('holes.rule.crestWidth','Crest thickness',0.005,0.12,.001), R('holes.rule.tiltMin','Lowest view (0 = along the disk)',0,88,1), R('holes.rule.tiltMax','Highest view (90 = from above)',0,88,1), R('holes.rule.tumble','How many slowly change angle',0,1,.01), R('holes.rule.tumbleSpeed','How fast they change angle',0,1,.01), R('holes.rule.dustFrom','Dark dust disk starts at tier',1,7,1), R('holes.rule.dust','Dust disk darkness',0,1,.01), R('holes.rule.dustSize','Dust disk size',0.3,6,.05), R('holes.rule.dustSpin','Dust disk spin',0,3,.01)], 'hRule');
  h += group('Gas & dust always in the sky (ChatGPT layers)', [K('holes.gas.on','Show the gas & dust'), R('holes.gas.bright','Brightness',0,3,.01), R('holes.gas.speed','Drift speed',0,5,.01), R('holes.gas.scale','Size',0.6,3,.01), ...S.holes.gas.layers.map((L,i)=>R('holes.gas.layers.'+i+'.a', L.src.split('/').pop().replace('.webp','').replace('_',' ')+': strength',0,2,.01))], 'hGasLayers');
  if(hs.mode==='viewsTour' && ui.open.hTour===undefined) ui.open.hTour = true;
  if(hs.mode==='viewsTour') h += group('One after another', [R('holes.behavior.tourGap','Space between one hole and the next',0,500,1), R('holes.behavior.tourSpeed','Drift speed',5,200,1), R('holes.behavior.tourY','Height on screen',0.05,0.6,.005), R('holes.behavior.tourZig','Up/down offset between holes',0,0.2,.005)], 'hTour', true);
  if(hs.active==='viewers') h += group('Real footage from your videos (one per stage)', [K('holes.clips.on','Use the real footage around each hole'), R('holes.clips.scale','Footage size around the hole',0.5,2,.01), R('holes.clips.bright','Footage brightness',0.2,2,.01), R('holes.clips.turn','Every hole at a different angle',0,2,.01)], 'hClips');
  if(hs.active==='viewers') h += group('What they feed on (real gas, dust & stars)', [K('holes.feed.on','Steady flow of gas & dust from the sky around them'), R('holes.feed.amount','How much gas & dust flows in',0.2,4,.05), R('holes.feed.pull','How hard they pull it in',0.2,3,.05), R('holes.feed.spiralSeconds','Seconds to spiral in',2,20,.5)], 'hFeed');
  h += group('How they move in the sky', [R('holes.behavior.count','Holes in the sky',1,4,1), R('holes.behavior.speed','Drift speed',0,60,.5), SEL('holes.behavior.direction','Drift direction',[[-1,'Right to left'],[1,'Left to right']]), R('holes.behavior.bandTop','Highest they fly',0,1,.005), R('holes.behavior.bandBottom','Lowest they fly',0,1,.005), R('holes.behavior.minGap','Space kept between holes',0,120,1), R('holes.behavior.warpApart','Keep their warps apart (1 = warps never touch)',0,1.5,.01), R('holes.behavior.capture','Big ones catch small ones (0 = off)',0,1,.01), R('holes.behavior.captureRatio','How small to get caught (vs the big one)',0.3,0.95,.01), R('holes.behavior.orbitTime','Seconds orbiting before slung away',2,40,1), R('holes.behavior.orbitSpeed','Orbit speed',0.05,1.5,.01), R('holes.behavior.sling','Sling-away force',1,2.5,.01), R('holes.behavior.interact','Pull on each other (big pulls small)',0,3,.01), R('holes.behavior.wobble','Wobble',0,3,.01), R('holes.behavior.formSeconds','Seconds to form when one appears',0,10,.1), R('holes.behavior.sizeScale','All holes size',.3,2.5,.01), R('holes.behavior.lensAll','All holes light bending',0,3,.01)], 'hMove');
  h += group('Name & view tags on each hole', [K('holes.callout.on','Show the tags'), K('holes.callout.auto','Move tags out of the way automatically'), R('holes.callout.dodge','How hard they dodge other holes',0,3,.05), R('holes.callout.smooth','How smoothly they move',.5,10,.1),
     R('holes.callout.angle','Line direction',-180,180,1), R('holes.callout.len1','First line length',0,80,1), R('holes.callout.len2','Second line length',0,80,1), R('holes.callout.lineWidth','Line thickness',.2,4,.05), C('holes.callout.lineColor','Line color'), R('holes.callout.lineOpacity','How solid the line looks',0,1,.01), R('holes.callout.lineGlow','Line glow',0,4,.05),
     C('holes.callout.tabColor','Tag edge color'), C('holes.callout.tabFill','Tag fill color'), R('holes.callout.tabOpacity','Tag see-through',0,1,.01), R('holes.callout.tabGlow','Tag glow',0,4,.05), R('holes.callout.border','Tag edge thickness',0,4,.05), R('holes.callout.corners','Round the corners',0,12,.5), R('holes.callout.padX','Tag width padding',0,20,.5), R('holes.callout.padY','Tag height padding',0,12,.5),
     R('holes.callout.nameSize','Name size',6,22,.5), C('holes.callout.nameColor','Name color'), K('holes.callout.nameBold','Bold name'),
     K('holes.callout.showCount','Show live views under the name'), R('holes.callout.countSize','Views number size',6,20,.5), C('holes.callout.countColor','Views number color'), SEL('holes.callout.countFormat','Number style',[['short','1.2K'],['full','1,234']]), K('holes.liveViews','Run live test views (fake accounts)')], 'hTags');
  h += group('Quality', [R('holes.behavior.renderScale','Render sharpness (lower = faster)',.35,1.5,.05), K('holes.behavior.autoQuality','Lower sharpness automatically if the phone slows down')], 'hQ');
  h += `<details class="grp" data-k="hTest" ${ui.open.hTest?'open':''}><summary>Test counts (who lands in which tier)</summary><div class="gb"><p class="note">These are pretend counts for the fake accounts so you can see every tier in the sky.</p><div class="contacts">${scene.contacts.map((c,i)=>`<div class="ct"><img src="${c.face}"><span>${c.name} <small style="color:#8a97a2">→ tier ${Raven.tierAt(d.tiers, c.counts[hs.active])+1}</small></span><input type="number" min="0" value="${c.counts[hs.active]}" data-cnt="${i}"></div>`).join('')}</div></div></details>`;
  return h;
}
function secMedia(){
  let h = head('EDITING','Images & videos','Everything you can put in the sky: your backgrounds, every clip and still cut from your videos, and your own uploads.');
  h += `<div class="btnrow"><button class="btn acc" id="addBgFile2">＋ Upload image or video</button><button class="btn" id="openLib2">Browse cosmic clips & stills</button></div>`;
  h += `<div class="thumbs">` + S.bg.layers.map(l=>`<div class="thumb"><img data-ly="${l.id}" src="${l.thumb||l.src}"><div class="tb"><b>${esc(l.name)}</b><div class="kv"><span>${l.cycle?'In the cycle':'On top'}</span><span>${l.visible===false?'Hidden':'Visible'}</span></div></div></div>`).join('') + `</div>`;
  return h;
}
function esc(s){ return String(s??'').replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

function render(){
  { const n=S.holes.dashboards[S.holes.active].tiers.length; let st=parseInt(S.holes.selTier); if(!(st>=0)) st=0; S.holes.selTier=Math.min(st,n-1); if(S.holes.behavior.count>4) S.holes.behavior.count=4; }
  $$('.sec').forEach(b=>b.classList.toggle('on', b.dataset.sec===secNow));
  const p = $('#panel'); const st = p.scrollTop;
  if(secNow==='rocks'){ROCK_NAV.group ||= 'carving';ROCK_NAV.showEditor(p);p.scrollTop=0;return;}
  ROCK_NAV.hideEditor();p.classList.remove('rn-editor');
  p.innerHTML = ({ sphere:secSphere, tabs:secTabs, background:secBackground, holes:secHoles, media:secMedia })[secNow]();
  $('#modeBoth').classList.toggle('on',!!S.holes.together?.on);
  $('#modeBoth').disabled=!S.holes.modelPreview;
  wire(p); bindPanel(p); fsReadout(); AsgardStudioLayout.arrange(p,secNow); renderLayers(); renderVersions();
  $('#modeSky').classList.toggle('on', S.holes.mode!=='focus'); $('#modeFocus').classList.toggle('on', S.holes.mode==='focus'); if(scene.anglePractice)setAnglePractice(scene.anglePractice);
}
function fsReadout(){ const el=document.getElementById('fsRead'); if(!el) return; const fs=S.holes.friendSize, n=S.holes.dashboards.friends.tiers.length; el.innerHTML = Array.from({length:n},(_,i)=>`<span>T${i+1}: ${(fs.auto? fs.min+(fs.max-fs.min)*(n>1?i/(n-1):0) : S.holes.dashboards.friends.tiers[i].look.size).toFixed(1)}</span>`).join(''); }
function showSec(s){ if(s!==secNow)$('#panel').scrollTop=0;secNow=s;render(); }
let lookClip = null;
function bindPanel(p){
  p.querySelectorAll('[data-dash]').forEach(b=>b.onclick=()=>{ S.holes.active=b.dataset.dash;S.holes.selTier=0;S.holes.quickTier=0;if(S.holes.together)S.holes.together.on=false;if(S.holes.modelPreview)S.holes.modelPreview.on=false;S.holes.referencePreview.on=false;S.holes.mode='sky';change();render(); });
  p.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{ S.holes.mode=b.dataset.view; change(); render(); });
  const tp=p.querySelector('#tPrev'), tnx=p.querySelector('#tNext'); if(tp) tp.onclick=()=>{ S.holes.selTier=Math.max(0,S.holes.selTier-1); change(); render(); }; if(tnx) tnx.onclick=()=>{ S.holes.selTier=Math.min(S.holes.dashboards[S.holes.active].tiers.length-1,S.holes.selTier+1); change(); render(); };
  p.querySelectorAll('[data-tier]').forEach(b=>b.onclick=e=>{ if(e.target.tagName==='INPUT') return; S.holes.selTier=+b.dataset.tier; if(!S.holes.mode.startsWith('friends')) S.holes.mode='focus'; change(); render(); });
  p.querySelectorAll('[data-start]').forEach(inp=>inp.onchange=()=>{ const i=+inp.dataset.start, ts=S.holes.dashboards[S.holes.active].tiers; let v=Math.max(0,Math.round(+inp.value)); const lo=ts[i-1].start+1, hiV=i<ts.length-1?ts[i+1].start-1:1e9; v=clamp(v,lo,hiV); ts[i].start=v; inp.value=v; change(); });
  p.querySelectorAll('[data-cnt]').forEach(inp=>inp.onchange=()=>{ scene.contacts[+inp.dataset.cnt].counts[S.holes.active]=Math.max(0,+inp.value); render(); });
  const on=(id,f)=>{ const e=p.querySelector('#'+id); if(e) e.onclick=f; };
  p.querySelectorAll('[data-quick-tier]').forEach(b=>b.onclick=()=>{
    const tier=+b.dataset.quickTier;S.holes.quickTier=tier;S.holes.active='viewers';S.holes.selTier=tier-1;if(!S.holes.together?.on)S.holes.mode='focus';
    if(S.holes.modelPreview)S.holes.modelPreview.on=tier===3;
    S.holes.referencePreview.on=tier===2;
    setAnglePractice(null);change();render();$('#panel').scrollTop=0;
  });
  p.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>AsgardStudioLayout.select(b.dataset.jump==='axis'?'Angles & axes':'Ring growth with views'));
  on('playBothTiers',playBothTiers);
  on('bothSmall',()=>{S.holes.referenceGrowth.on=true;S.holes.referenceGrowth.views=21;S.holes.modelPreview.growth.on=true;S.holes.modelPreview.growth.views=150;change();refreshValues();});
  on('bothLarge',()=>{S.holes.referenceGrowth.on=true;S.holes.referenceGrowth.views=149;S.holes.modelPreview.growth.on=true;S.holes.modelPreview.growth.views=499;change();refreshValues();});
  on('modelSmall',()=>{const g=S.holes.modelPreview.growth;g.on=true;g.views=150;change();refreshValues();referenceReadout();});
  on('modelLarge',()=>{const g=S.holes.modelPreview.growth;g.on=true;g.views=499;change();refreshValues();referenceReadout();});
  on('tier2Start',()=>{S.holes.referenceGrowth.on=true;S.holes.referenceGrowth.views=21;change();refreshValues();referenceReadout();});
  on('tier2End',()=>{S.holes.referenceGrowth.on=true;S.holes.referenceGrowth.views=149;change();refreshValues();referenceReadout();});
  on('backToTier2',()=>{S.holes.quickTier=2;S.holes.modelPreview.on=false;S.holes.referencePreview.on=true;change();render();$('#panel').scrollTop=0;});
  on('resumeModel',()=>{S.holes.quickTier=3;S.holes.modelPreview.on=true;change();render();$('#panel').scrollTop=0;});
  on('resetModel',()=>{const m=S.holes.modelPreview,item=LIB.find(x=>x.id===m.id);if(!item)return;S.holes.modelPreview=AsgardModelPreview.create(item,{radius:m.look.size,x:m.x,y:m.y});change();render();});
  const modelSelect=p.querySelector('#modelVariant');
  if(modelSelect)modelSelect.onchange=()=>{const v=S.holes.modelVariants.find(v=>v.id===modelSelect.value);if(!v)return;S.holes.modelPreview={...clone(v.settings),on:true,variantId:v.id};change();render();};
  on('saveModelVariant',()=>{const id='model-'+Date.now().toString(36),name=p.querySelector('#modelVariantName').value.trim()||S.holes.modelPreview.name+' variant';S.holes.modelPreview.variantId=id;S.holes.modelVariants.push({id,name,settings:clone(S.holes.modelPreview)});change();render();toast('3D variant saved');});
  on('updateModelVariant',()=>{const v=S.holes.modelVariants.find(v=>v.id===S.holes.modelPreview.variantId);if(!v)return;v.name=p.querySelector('#modelVariantName').value.trim()||v.name;v.settings=clone(S.holes.modelPreview);change();render();toast('3D variant updated');});
  on('newHoleAxes',()=>{S.holes.orientation.seed=(S.holes.orientation.seed||1)+1;S.holes.orientation.random=true;if(S.holes.modelPreview){S.holes.modelPreview.randomAxis=true;S.holes.modelPreview.seed=S.holes.orientation.seed;}change();render();});
  const refSelect=p.querySelector('#refVariant');
  if(refSelect)refSelect.onchange=()=>{const v=S.holes.referenceVariants.find(v=>v.id===refSelect.value);if(!v)return;S.holes.referencePreview={...clone(v.settings),on:true};S.holes.orientation.random=false;S.holes.referenceGrowth.on=false;S.holes.referenceVariantId=v.id;change();render();};
  on('saveRefVariant',()=>{
    const name=(p.querySelector('#refVariantName').value||'').trim()||`Variant ${S.holes.referenceVariants.length+1}`;
    const v={id:'ref-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6),name,settings:clone(referenceLiveSettings()),createdAt:new Date().toISOString()};
    S.holes.referenceVariants.push(v);S.holes.referenceVariantId=v.id;change();render();toast('Variant saved');
  });
  on('updateRefVariant',()=>{const v=S.holes.referenceVariants.find(v=>v.id===S.holes.referenceVariantId);if(!v)return;v.name=(p.querySelector('#refVariantName').value||'').trim()||v.name;v.settings=clone(referenceLiveSettings());v.updatedAt=new Date().toISOString();change();render();toast('Saved variant updated');});
  on('refOriginal',()=>{S.holes.referencePreview={...clone(S.holes.referenceOriginal),on:true};S.holes.orientation.random=false;S.holes.referenceGrowth.on=false;S.holes.referenceVariantId='';change();render();toast('Approved original restored');});
  on('pickLib', ()=>openLib('tier')); on('pickLegacyLib', ()=>openLib('tier'));
  on('formPrev', ()=>{ S.holes.mode='focus'; applyToScene(); let t0=performance.now(); const L=curLook(); const step=()=>{ const k=Math.min(1,(performance.now()-t0)/1000/Math.max(.3,S.holes.behavior.formSeconds)); scene.formPreview=k*k*(3-2*k); if(k<1) requestAnimationFrame(step); else scene.formPreview=1; }; step(); });
  on('copyTier', ()=>{ lookClip=clone(curLook()); toast('Look copied'); });
  on('pasteTier', ()=>{ if(!lookClip) return toast('Copy a look first'); const t=curTier(); const keep={size:t.look.size}; t.look=Object.assign(clone(lookClip),keep); change(); render(); });
  const tn=p.querySelector('#tierName'); if(tn) tn.onchange=()=>{ curTier().name=tn.value; change(); render(); };
  const ts=p.querySelector('#tierSecs'); if(ts) ts.oninput=()=>{ curTier().seconds=+ts.value; ts.previousElementSibling.querySelector('em').textContent=ts.value; change(); };
  // background
  p.querySelectorAll('[data-ly]').forEach(im=>im.onclick=()=>{ selLayer=im.dataset.ly; const L=S.bg.layers.find(l=>l.id===selLayer); if(L && L.visible===false){ L.visible=true; change(); } scene.showLayer(selLayer); showSec('background'); });
  p.querySelectorAll('[data-cyc]').forEach(c=>c.onchange=()=>{ S.bg.layers.find(l=>l.id===c.dataset.cyc).cycle=c.checked; change(); render(); });
  p.querySelectorAll('[data-vis]').forEach(c=>c.onchange=()=>{ S.bg.layers.find(l=>l.id===c.dataset.vis).visible=c.checked; change(); if(c.checked) scene.showLayer(c.dataset.vis); render(); });
  p.querySelectorAll('[data-only]').forEach(b=>b.onclick=()=>{ for(const l of S.bg.layers){ l.visible = l.id===b.dataset.only; } change(); scene.showLayer(b.dataset.only); render(); });
  p.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{ S.bg.layers=S.bg.layers.filter(l=>l.id!==b.dataset.del); if(selLayer===b.dataset.del) selLayer=null; change(); render(); });
  on('shuffle', ()=>{ S.bg.seed=(S.bg.seed||1)+1; S.bg.randomOrder=true; change(); render(); });
  on('restartCycle', ()=>{ scene.time=0; });
  on('addBgLib', ()=>openLib('bg')); on('addBgFile', ()=>$('#fileIn').click()); on('addBgFile2', ()=>$('#fileIn').click()); on('openLib2', ()=>openLib('bg'));
}
function renderLayers(){
  $('#layerList').innerHTML = S.bg.layers.map(l=>`<div class="ly ${l.id===selLayer?'on':''}"><img src="${l.thumb||l.src}"><span data-l="${l.id}">${esc(l.name)}</span><button data-eye="${l.id}" title="Show / hide">${l.visible===false?'◌':'◉'}</button></div>`).join('') || '<div class="kv">No layers yet</div>';
  $$('#layerList [data-l]').forEach(s=>s.onclick=()=>{ selLayer=s.dataset.l; const L=S.bg.layers.find(l=>l.id===selLayer); if(L && L.visible===false){ L.visible=true; change(); } scene.showLayer(selLayer); showSec('background'); });
  $$('#layerList [data-eye]').forEach(b=>b.onclick=()=>{ const l=S.bg.layers.find(x=>x.id===b.dataset.eye); l.visible=l.visible===false; change(); render(); });
}
let verCache = [];
async function renderVersions(){
  verCache = await versionsList();
  $('#versionList').innerHTML = `<div class="vr"><input id="verName" placeholder="Name this version" style="flex:1;background:#0f1316;border:1px solid #2a3138;border-radius:7px;padding:5px 7px;font-size:12px"><button id="verAdd" title="Save">＋</button></div>` + (verCache.map(v=>`<div class="vr"><span data-ver="${v.id}" title="Restore">${esc(v.name)}</span><button data-vdel="${v.id}" title="Delete">✕</button></div>`).join('') || '<div class="kv">None yet</div>');
  $('#verAdd').onclick = async () => { const n = $('#verName').value.trim() || ('Version '+new Date().toLocaleString()); await versionAdd(n); renderVersions(); toast('Saved “'+n+'”'); };
  $$('[data-ver]').forEach(s=>s.onclick=()=>{ const v=verCache.find(x=>x.id===s.dataset.ver); if(!v) return; S=Raven.ensureDashboards(JSON.parse(v.json)); commit(); applyToScene(true); render(); toast('Restored “'+v.name+'” (Undo to go back)'); });
  $$('[data-vdel]').forEach(b=>b.onclick=async ()=>{ if(b.dataset.armed){ await versionDel(b.dataset.vdel); renderVersions(); } else { b.dataset.armed=1; b.textContent='Delete?'; setTimeout(()=>{ b.textContent='✕'; delete b.dataset.armed; }, 2500); } });
}

/* ---------------- library ---------------- */
let libMode = 'tier', libCat = 'All', libSel = null;
function openLib(mode){ libMode = mode; $('#lib').hidden = false;
  $('#libTitle').textContent = mode==='tier' ? `Choose a black hole · ${DASH[S.holes.active]} · tier ${S.holes.selTier+1}` : 'Cosmic clips & stills';
  $('#libSub').textContent = `${LIB.filter(x=>x.clip).length} clips · ${LIB.length} stills · cut from your 6 videos + your ${LIB.filter(x=>x.cat==='Backgrounds').length} backgrounds`;
  renderLib(); }
function renderLib(){
  const q = $('#libFind').value.toLowerCase();
  const cats = ['All', ...new Set(LIB.map(x=>x.cat))];
  $('#catList').innerHTML = cats.map(c=>`<button class="cat ${c===libCat?'on':''}" data-cat="${c}">${c}<small>${c==='All'?LIB.length:LIB.filter(x=>x.cat===c).length}</small></button>`).join('');
  $$('#catList [data-cat]').forEach(b=>b.onclick=()=>{ libCat=b.dataset.cat; renderLib(); });
  const items = LIB.filter(x=>(libCat==='All'||x.cat===libCat) && (!q || (x.name+' '+x.cat).toLowerCase().includes(q)));
  $('#libGrid').innerHTML = items.map(x=>`<div class="card ${libSel===x.id?'on':''}" data-it="${x.id}"><img src="${x.thumb}" loading="lazy">${BH.LIB_TO_PRESET[x.id]?'<i class="badge">3D</i>':''}<span>${esc(x.name)}</span></div>`).join('');
  $$('#libGrid .card').forEach(cd=>{
    const x = LIB.find(i=>i.id===cd.dataset.it);
    cd.onclick=()=>{ libSel=x.id; $$('#libGrid .card').forEach(c=>c.classList.toggle('on',c===cd)); renderDetail(x); };
    if(x.clip){ cd.onmouseenter=()=>{ const v=document.createElement('video'); v.src=x.clip; v.muted=true; v.loop=true; v.autoplay=true; v.playsInline=true; cd.replaceChild(v, cd.querySelector('img')); }; cd.onmouseleave=()=>{ const v=cd.querySelector('video'); if(v){ const im=document.createElement('img'); im.src=x.thumb; cd.replaceChild(im,v); } }; }
  });
}
let cmpScene = null;
function renderDetail(x){
  const pr = BH.LIB_TO_PRESET[x.id];
  let h = `<h3>${esc(x.name)}</h3><div class="kv"><span>${esc(x.cat)}</span><span>${esc(x.src)}</span></div>`;
  h += x.clip ? `<video id="libSourceVideo" src="${x.clip}" poster="${x.still}" autoplay muted loop playsinline controls></video><p id="libSourceError" class="note" hidden>Source clip unavailable. The animated 3D model below works independently.</p>` : `<img src="${x.still}" style="width:100%;border-radius:10px">`;
  if(pr){ h += `<p style="margin:12px 0 4px">Rebuilt in 3D with real light bending:</p><div class="compare"><canvas id="cmpCv" style="width:100%;height:100%"></canvas></div>`; }
  h += `<div class="btnrow" style="margin-top:12px">`;
  if(pr) h += `<button class="btn acc" id="useModel">Use animated 3D in sky</button><button class="btn" id="useTier">Use for ${DASH[S.holes.active]} tier ${S.holes.selTier+1}</button>`;
  if(x.clip) h += `<button class="btn" id="addClip">Add source clip as background</button>`;
  h += `<button class="btn" id="addStill">Add source still as background</button>`;
  h += `<button class="btn" id="dlStill">Download still</button>` + (x.clip?`<button class="btn" id="dlClip">Download clip</button>`:'');
  h += `</div>`;
  if(pr) h += `<p class="note">Use animated 3D in sky opens this spinning model with its own controls. It does not change an assigned tier. Source clip/still buttons add the original footage as a background.</p>`;
  $('#libDetail').innerHTML = h;
  const source=$('#libSourceVideo');if(source)source.onerror=()=>{source.hidden=true;$('#libSourceError').hidden=false;};
  if(pr){ const cv=$('#cmpCv'); const r=cv.getBoundingClientRect(); try{ cmpScene = cmpScene || null; const eng=new BH.BHScene(cv,{scale:Math.min(2,devicePixelRatio||1)}); eng.resize(r.width,r.height); const im=new Image(); im.onload=()=>{ eng.setBackground('A',im); eng.coverFit('A'); const loop=t=>{ if(!document.body.contains(cv)) return; eng.holes=[Object.assign({},BH.BH_PRESETS[pr],{x:.5,y:.5,size:Math.min(r.width,r.height)*.11})]; eng.render(t/1000); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }; im.src='bg/bg13.jpg'; }catch(e){ console.warn(e); } }
  const model=$('#useModel');if(model)model.onclick=()=>useModelPreview(x);
  const u=$('#useTier'); if(u) u.onclick=()=>{ const t=curTier(); const keep={size:t.look.size, faceAmt:t.look.faceAmt}; t.look=Object.assign({}, BH.BH_DEFAULTS, clone(BH.BH_PRESETS[pr]), keep); t.libId=x.id; S.holes.mode='focus'; change(); $('#lib').hidden=true; showSec('holes'); toast(`Tier ${S.holes.selTier+1} is now “${x.name}”`); };
  const ac=$('#addClip'); if(ac) ac.onclick=()=>addLayer({ name:x.name, src:x.clip, thumb:x.thumb, cycle:false });
  $('#addStill').onclick=()=>addLayer({ name:x.name, src:x.still, thumb:x.thumb, cycle:true });
  $('#dlStill').onclick=async()=>saveFile(x.id+'.jpg', await (await fetch(x.still)).blob());
  const dc=$('#dlClip'); if(dc) dc.onclick=async()=>saveFile(x.id+'.mp4', await (await fetch(x.clip)).blob());
}
function addLayer(o){ const id='L'+Date.now().toString(36); S.bg.layers.push(Object.assign({ id, visible:true, brightness:1, opacity:1, zoom:1, panX:0, panY:0, move:1 }, o)); selLayer=id; change(); scene.showLayer(id); $('#lib').hidden=true; showSec('background'); toast('Added “'+o.name+'”'); }

/* ---------------- uploads ---------------- */
const fileIn = document.createElement('input'); fileIn.type='file'; fileIn.accept='image/*,video/*'; fileIn.multiple=true; fileIn.id='fileIn'; fileIn.hidden=true; document.body.appendChild(fileIn);
fileIn.onchange = async () => { for(const f of fileIn.files){ let src;
  toast('Uploading '+f.name+' to the shared drawer…'); src = await sbUpload(f);
  if(!src && P.assets){ try{ toast('Uploading '+f.name+'…'); const r = await P.assets.upload(f); src = '/_blob/'+r.id; }catch(e){ toast('Upload failed: '+(e.code||e.message)); } }
  if(!src){ const k='up-'+Date.now().toString(36)+Math.random().toString(36).slice(2,5); await idb.put(k, f); src='idb:'+k; }
  let thumb=null; if(f.type.startsWith('image/')){ thumb = await makeThumb(f); }
  addLayer({ name:f.name, src, thumb, cycle:f.type.startsWith('image/') }); } fileIn.value=''; };
function makeThumb(f){ return new Promise(res=>{ const im=new Image(); im.onload=()=>{ const c=document.createElement('canvas'); const s=Math.min(1,240/im.width); c.width=im.width*s; c.height=im.height*s; c.getContext('2d').drawImage(im,0,0,c.width,c.height); res(c.toDataURL('image/jpeg',.75)); }; im.src=URL.createObjectURL(f); }); }

/* ---------------- Get Dart ---------------- */
async function toDataUrl(src, maxDim){
  const url = await resolveSrc(src); const r = await fetch(url); const b = await r.blob();
  if(b.type.startsWith('image/') && maxDim){ const im = await createImageBitmap(b); const s=Math.min(1, maxDim/Math.max(im.width,im.height)); const c=document.createElement('canvas'); c.width=Math.round(im.width*s); c.height=Math.round(im.height*s); c.getContext('2d').drawImage(im,0,0,c.width,c.height); return c.toDataURL('image/jpeg',.86); }
  return await new Promise(res=>{ const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.readAsDataURL(b); });
}
async function getDart(){
  $('#dartModal').hidden=false; $('#dartSub').textContent='Packing your design…'; $('#dartBody').innerHTML='<p>Packing backgrounds, faces and busts into one file…</p>';
  try{
    const stamp = new Date(); const tag = String(stamp.getMonth()+1).padStart(2,'0')+String(stamp.getDate()).padStart(2,'0')+String(stamp.getHours()).padStart(2,'0')+String(stamp.getMinutes()).padStart(2,'0');
    const cls = 'RavenStudio'+tag;
    const s = clone(S); s.holes.mode='sky';
    const used = s.bg.layers.filter(l=>l.visible!==false);
    for(const L of used){ L.src = await toDataUrl(L.src, /\.(mp4|webm)$/i.test(L.src)?0:1440); delete L.thumb; }
    s.bg.layers = used;
    for(const L of s.holes.gas?.layers||[]){ if(L.on!==false&&L.src)L.src=await toDataUrl(L.src); }
    s.sphere.texture = await toDataUrl(s.sphere.texture, 1024);
    const contacts = [];
    for(const c of scene.contacts){ contacts.push(Object.assign({}, c, { bust: await toDataUrl(c.bust), face: await toDataUrl(c.face, 256) })); }
    const eng = await (await fetch('bh-engine.js',{cache:'no-cache'})).text(), run = await (await fetch('raven-scene.js',{cache:'no-cache'})).text(), ref = await (await fetch('reference-hole.js',{cache:'no-cache'})).text(), variants = await (await fetch('reference-variants.js',{cache:'no-cache'})).text();
    const modelCode=await(await fetch('model-preview.js',{cache:'no-cache'})).text();
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#s{position:absolute;inset:0}</style></head><body><div id="s"></div><script>${eng}<\/script><script>${ref}<\/script><script>${variants}<\/script><script>${modelCode}<\/script><script>${run}<\/script><script>
var SETTINGS=${JSON.stringify(s)};var DEMO=${JSON.stringify(contacts)};
var sc=new Raven.RavenScene(document.getElementById('s'),SETTINGS,{contacts:DEMO});
window.ravenSetContacts=function(j){try{var l=typeof j==='string'?JSON.parse(j):j;if(Array.isArray(l)&&l.length){l.forEach(function(c){c.counts=c.counts||{friends:0,followers:0,viewers:0};});sc.setContacts(l);}}catch(e){}};
sc.onContactTap=function(c){try{RavenBridge.postMessage(String(c.id||c.name));}catch(e){}};
<\/script></body></html>`;
    if(html.includes("'''")) throw new Error('packing conflict');
    const dart = `// ${cls} — Asgard Studio (Claude) Raven page. Built ${stamp.toLocaleString()}.
// Automatic FlutterFlow imports
import '/flutter_flow/flutter_flow_theme.dart';
import '/flutter_flow/flutter_flow_util.dart';
import '/custom_code/widgets/index.dart';
import '/custom_code/actions/index.dart';
import 'package:flutter/material.dart';
// Begin custom widget code
// DO NOT REMOVE OR MODIFY THE CODE ABOVE!

import 'dart:convert';
import 'package:webview_flutter/webview_flutter.dart';

class ${cls} extends StatefulWidget {
  const ${cls}({
    super.key,
    this.width,
    this.height,
    this.contactsJson,
    this.onContactTap,
  });

  final double? width;
  final double? height;
  /// Optional JSON list: [{"id","name","msg","unread","bust","face","counts":{"friends","followers","viewers"}}]
  final String? contactsJson;
  final Future Function(String contactId)? onContactTap;

  @override
  State<${cls}> createState() => _${cls}State();
}

class _${cls}State extends State<${cls}> {
  late final WebViewController _c;
  bool _ready = false;

  @override
  void initState() {
    super.initState();
    _c = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF000000))
      ..addJavaScriptChannel('RavenBridge', onMessageReceived: (m) {
        widget.onContactTap?.call(m.message);
      })
      ..setNavigationDelegate(NavigationDelegate(onPageFinished: (_) {
        _ready = true;
        _push();
      }))
      ..loadHtmlString(_ravenHtml${tag}, baseUrl: 'https://asgard.local/');
  }

  void _push() {
    final j = widget.contactsJson;
    if (_ready && j != null && j.trim().isNotEmpty) {
      _c.runJavaScript('window.ravenSetContacts(' + jsonEncode(j) + ')');
    }
  }

  @override
  void didUpdateWidget(covariant ${cls} oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.contactsJson != widget.contactsJson) _push();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: widget.width ?? double.infinity,
      height: widget.height ?? double.infinity,
      child: WebViewWidget(controller: _c),
    );
  }
}

const String _ravenHtml${tag} = r'''${html}''';
`;
    const blob = new Blob([dart], {type:'text/plain'}); window._lastDart = dart; const fname = `${cls}.dart`;
    $('#dartSub').textContent = `${fname} · ${(dart.length/1048576).toFixed(1)} MB · one full-replacement file`;
    $('#dartBody').innerHTML = `<div class="btnrow"><button class="btn acc" id="dartCopy">Copy the whole Dart</button><button class="btn" id="dartSave">Download (${fname}.txt)</button></div>
      <ol><li>FlutterFlow → Custom Code → <b>+ Add Widget</b>, name it <b>${cls}</b>.</li><li>Paste the whole file (replace everything) and Save.</li><li>Dependencies: <b>webview_flutter</b> (already in your project from AsgardLiveHeader).</li><li>Put <b>${cls}</b> on the Raven page, width & height = infinity.</li><li>Optional: pass <b>contactsJson</b> with real contacts; until then it shows the fake test accounts. <b>onContactTap</b> gives you the tapped contact's id.</li></ol>
      <p class="note">Everything you see in the studio — your backgrounds, the cycle, every tier, the real light bending, the sphere, busts and tabs — is inside this one file.</p>`;
    $('#dartCopy').onclick=async()=>{ try{ await navigator.clipboard.writeText(dart); toast('Dart copied — paste it into FlutterFlow'); }catch(e){ toast('Copy was blocked — use Download'); } };
    $('#dartSave').onclick=()=>saveFile(fname+'.txt', blob);
  }catch(e){ console.error(e); $('#dartBody').innerHTML = '<p>Could not pack: '+esc(e.message)+'</p>'; }
}

async function saveCurrentDesign(){
  clearTimeout(ct);clearTimeout(pt);clearTimeout(sbT);if(JSON.stringify(hist[hi])!==JSON.stringify(S)){hist=hist.slice(0,hi+1);hist.push(clone(S));if(hist.length>120)hist.shift();hi=hist.length-1;}store.set(KEY,S);
  const r=await fetch(SB.url+'/rest/v1/studio_designs?on_conflict=id',{method:'POST',headers:sbH({'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'}),body:JSON.stringify({id:'raven',page:'raven',data:S,updated_by:'studio',updated_at:new Date().toISOString()})});
  if(!r.ok){toast('Shared save failed. Your local copy is kept.');throw Error('Save failed');}
  dirty=false;SB.ok=true;$('#saveState').className='saved';$('#saveState').textContent='● Saved to shared studio';toast('Saved');
}
AsgardStudioLayout.mount({kind:'raven',page:'raven',undo:()=>{if(secNow==='rocks'){const prev=ROCK_NAV.history.pop();if(prev){ROCK_NAV.future.push(clone(ROCK_NAV.S));ROCK_NAV.applyState(prev);}}else undo();},save:()=>secNow==='rocks'?AsgardStudioLayout.saveNavigation(ROCK_NAV):saveCurrentDesign(),beforePage:async()=>{if(ROCK_NAV.edits.size||ROCK_NAV.saving)await AsgardStudioLayout.saveNavigation(ROCK_NAV);await saveCurrentDesign();},preview:()=>{scene.playing=true;if(scene.speed<=0){scene.speed=1;$('#speed').value=1;}$('#playBtn').textContent='❚❚';$('#playLbl').textContent='Moving';}});
/* ---------------- top bar & misc ---------------- */
function toast(m){ const t=$('#toast'); t.textContent=m; t.hidden=false; clearTimeout(toast._t); toast._t=setTimeout(()=>t.hidden=true, 2600); }
$$('.sec').forEach(b=>b.onclick=()=>showSec(b.dataset.sec));
$('#openLib').onclick=()=>openLib(secNow==='holes'?'tier':'bg');
$('#libClose').onclick=()=>$('#lib').hidden=true; $('#libFind').oninput=renderLib;
$('#dartClose').onclick=()=>$('#dartModal').hidden=true;
$('#undoBtn').onclick=undo; $('#redoBtn').onclick=redo;
document.addEventListener('keydown', e=>{ if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='z'){ e.preventDefault(); e.shiftKey?redo():undo(); } if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='y'){ e.preventDefault(); redo(); } });
$('#saveBtn').onclick=async ()=>{ const n='Version '+new Date().toLocaleString(); await versionAdd(n); renderVersions(); toast('Saved “'+n+'”'); };
$('#exportBtn').onclick=()=>saveFile('asgard-raven-settings-'+Date.now()+'.json', JSON.stringify(S,null,1));
$('#importFile').onchange=async e=>{ const f=e.target.files[0]; if(!f) return; try{ S=Raven.ensureDashboards(JSON.parse(await f.text())); commit(); applyToScene(true); render(); toast('Settings loaded'); }catch(err){ toast('That file is not a studio settings file'); } };
$('#dartBtn').onclick=getDart;
$('#boardBtn').onclick=boardShow; $('#boardClose').onclick=()=>$('#board').hidden=true;
$('#bPost').onclick=async()=>{ const o={ who:$('#bWho').value, title:$('#bTitle').value.trim(), body:$('#bBody').value.trim() }; if(!o.title) return toast('Give it a title'); if(await boardPost(o)){ $('#bTitle').value=''; $('#bBody').value=''; boardShow(); toast('Posted'); } else toast('Could not reach the board'); };
$('#addLayerBtn').onclick=()=>openLib('bg');
function setAnglePractice(view){
  if(view&&S.holes.together?.on){S.holes.together.on=false;applyToScene();}
  scene.anglePractice=BH.ANGLE_STUDIES[view]?view:null;
  $('#angleViews').hidden=!scene.anglePractice;
  $('#modeAngles').classList.toggle('on',!!scene.anglePractice);
  $('#angleLow').classList.toggle('on',scene.anglePractice==='low');$('#angleDiagonal').classList.toggle('on',scene.anglePractice==='diagonal');
  $('#modeSky').classList.toggle('on',!scene.anglePractice&&S.holes.mode!=='focus');$('#modeFocus').classList.toggle('on',!scene.anglePractice&&S.holes.mode==='focus');
  $('#hint').textContent=scene.anglePractice?BH.ANGLE_STUDIES[scene.anglePractice].label+' · spherical body with foreground gas crossing its lower half':'● Real light-bending black holes · drag the busts to browse · click a black hole to edit its tier';
}
$('#modeAngles').onclick=()=>setAnglePractice(scene.anglePractice?null:'low');
$('#angleLow').onclick=()=>setAnglePractice('low');$('#angleDiagonal').onclick=()=>setAnglePractice('diagonal');
$('#angleSize').onchange=e=>{scene.angleDiameter=+e.target.value;};
$('#modeBoth').onclick=playBothTiers;
$('#modeSky').onclick=()=>{if(S.holes.modelPreview)return playBothTiers();setAnglePractice(null);S.holes.mode='sky'; change(); render();};
$('#modeFocus').onclick=()=>{if(S.holes.together)S.holes.together.on=false;setAnglePractice(null);S.holes.mode='focus'; change(); render();};
$('#playBtn').onclick=()=>{ scene.playing=!scene.playing; $('#playBtn').textContent=scene.playing?'❚❚':'▶'; $('#playLbl').textContent=scene.playing?'Moving':'Paused'; };
$('#speed').oninput=e=>scene.speed=+e.target.value;
$('#snapBtn').onclick=async ()=>{ const b = await (await fetch(scene.snapshot())).blob(); saveFile('raven-'+Date.now()+'.png', b); };
const setFs=()=>{ document.documentElement.style.setProperty('--fs', ui.fs); $('#zv').textContent=Math.round(ui.fs*100)+'%'; store.set(KEY+'-ui', ui); };
$('#zm').onclick=()=>{ ui.fs=Math.max(.8,ui.fs-.1); setFs(); }; $('#zp').onclick=()=>{ ui.fs=Math.min(1.6,ui.fs+.1); setFs(); }; setFs();
window.addEventListener('beforeunload', ()=>{ store.set(KEY, S); });
render();
setAnglePractice(new URLSearchParams(location.search).get('angles'));
capReady.then(async () => {
  const remote = (await sbLoad()) || (await dbLoad());
  if(remote){ const was = remote.chatImported >= 3; S = applyChatImport(Raven.ensureDashboards(remote)); hist=[clone(S)]; hi=0; store.set(KEY,S); if(!was) dbSave(); applyToScene(true); render(); }
  else if(P.db) dbSave();
  $('#saveState').className='saved'; $('#saveState').textContent=SB.ok?'● Loaded from shared studio':(P.db?'● All changes saved':'● Saved in this browser');
  renderVersions();
});
})();
