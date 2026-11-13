/* Sleipnir Workshop: area tabs on top, that area's pages on the left, the existing editors on the right.
   Editors are the same files Danny, Claude and ChatGPT already use (index.html, pages.html); nothing is copied. */
(() => {
'use strict';
const SB = { url:'https://afnihsdxtisneuyehatw.supabase.co', key:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmbmloc2R4dGlzbmV1eWVoYXR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NjUxMDcsImV4cCI6MjA4NzE0MTEwN30.q94Gw7BVKgyGm-I_XXGaoScVK50MMfQMk2RHms3qhps' };
const H = { apikey: SB.key, Authorization: 'Bearer ' + SB.key };
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));

const AREAS = {
  Sleipnir: [
    { id:'stores', name:'Stores', sub:'Town → type → store, then its page look', stores: s => !s.is_valhalla },
    { id:'swap', name:'Swap & Sell', sub:'Swipe to buy, sell, trade', url:'pages.html?page=swap' },
    { id:'ads', name:'Local ads', sub:'Feed card, banner, deal of the day', url:'pages.html?page=ads' },
    { id:'shoppost', name:'Shop the post', sub:'Tag dot, product card, credit', url:'pages.html?page=shoppost' },
    { id:'deals', name:'Flash deals', sub:'Countdown, % off, near you', url:'pages.html?page=deals' },
  ],
  Asgard: [
    { id:'raven', name:'Raven sky', sub:'Black holes, sphere, busts, rocks', url:'index.html' },
    { id:'home', name:'Home & posts', sub:'Sky strip, posts, floating icons', url:'pages.html?page=home' },
    { id:'convo', name:'Messages', sub:'Clouds & earth below', url:'pages.html?page=convo' },
    { id:'share', name:'Share', sub:'Favs as 3D figures', url:'pages.html?page=share' },
    { id:'heimdall', name:'Heimdall', sub:'Notifications', url:'pages.html?page=heimdall' },
  ],
  Valhalla: [
    { id:'vstores', name:'Valhalla stores', sub:'Town → type → store, then its page look', stores: s => !!s.is_valhalla },
  ],
  Valkyries: [],
};
const TYPE = { fast_food:'Fast food', fast_casual:'Fast casual', sit_down:'Sit-down', grocery:'Grocery', retail:'Retail', convenience:'Convenience' };
const townOf = (a) => { const m = String(a || '').match(/,\s*([^,]+),\s*FL/i); return m ? m[1].trim() : 'Other'; };

let M = {}; try { M = JSON.parse(localStorage.getItem('sleipnir-workshop') || '{}'); } catch(e){}
M.area ||= 'Asgard'; M.page ||= {}; M.pick ||= {};
const keep = () => { try { localStorage.setItem('sleipnir-workshop', JSON.stringify(M)); } catch(e){} };
let STORES = null;

async function stores(){
  if(STORES) return STORES;
  try { const r = await fetch(SB.url + '/rest/v1/stores?select=id,name,address,menu_type,category,is_valhalla&is_live=is.true&order=name', { headers: H }); STORES = r.ok ? await r.json() : []; } catch(e){ STORES = []; }
  STORES.forEach(s => { s.town = townOf(s.address); s.type = TYPE[s.menu_type] || 'Other'; });
  return STORES;
}

function areas(){
  $('#areas').innerHTML = Object.keys(AREAS).map(a => `<button class="area ${a === M.area ? 'on' : ''}" data-a="${a}">${a}</button>`).join('');
  document.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { M.area = b.dataset.a; keep(); areas(); pages(); });
}

async function pages(){
  const list = AREAS[M.area], nav = $('#pages');
  if(!list.length){ nav.innerHTML = `<div class="cap">${M.area.toUpperCase()} · PAGES</div><p class="note">No ${M.area} screens exist yet. Tell Claude which one to start (order board, tracking, earnings) and it gets its own controls here.</p>`; show(null); return; }
  const cur = M.page[M.area] && list.find(p => p.id === M.page[M.area]) ? M.page[M.area] : list[0].id;
  let h = `<div class="cap">${M.area.toUpperCase()} · PAGES</div>`;
  for(const p of list){
    h += `<button class="pg ${p.id === cur ? 'on' : ''}" data-p="${p.id}">${esc(p.name)}<small>${esc(p.sub)}</small></button>`;
    if(p.stores && p.id === cur) h += `<div class="drill" id="drill"><span class="note">Loading stores…</span></div>`;
  }
  nav.innerHTML = h;
  nav.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { M.page[M.area] = b.dataset.p; keep(); pages(); });
  const page = list.find(p => p.id === cur);
  if(page.stores) await drill(page); else show(page.url);
}

async function drill(page){
  const all = (await stores()).filter(page.stores), pk = M.pick[page.id] ||= { town:'', type:'', store:'' };
  const towns = [...new Set(all.map(s => s.town))].sort((a, b) => a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b));
  const inTown = all.filter(s => !pk.town || s.town === pk.town);
  const types = [...new Set(inTown.map(s => s.type))].sort();
  if(pk.type && !types.includes(pk.type)) pk.type = '';
  const list = inTown.filter(s => !pk.type || s.type === pk.type);
  if(pk.store && !list.some(s => s.id === pk.store)) pk.store = '';
  const opt = (v, l, sel) => `<option value="${esc(v)}" ${v === sel ? 'selected' : ''}>${esc(l)}</option>`;
  const d = $('#drill'); if(!d) return;
  d.innerHTML = `<label>1 · TOWN<select id="dTown">${opt('', 'Every town', pk.town)}${towns.map(t => opt(t, t, pk.town)).join('')}</select></label>
    <label>2 · TYPE<select id="dType">${opt('', 'Every type', pk.type)}${types.map(t => opt(t, t, pk.type)).join('')}</select></label>
    <label>3 · STORE<select id="dStore">${opt('', 'Choose a store…', pk.store)}${list.map(s => opt(s.id, s.name + (pk.town ? '' : ' · ' + s.town), pk.store)).join('')}</select></label>
    <span class="count">${list.length} store${list.length === 1 ? '' : 's'}</span>`;
  $('#dTown').onchange = e => { pk.town = e.target.value; keep(); drill(page); };
  $('#dType').onchange = e => { pk.type = e.target.value; keep(); drill(page); };
  $('#dStore').onchange = e => { pk.store = e.target.value; keep(); drill(page); };
  if(pk.store) show('pages.html?page=store&store=' + encodeURIComponent(pk.store));
  else show(null, '<b>Pick a store</b>Choose a town, a type, then a store on the left. Its page opens here with every control.');
}

let curUrl = '';
function show(url, msg){
  const f = $('#ed'), e = $('#empty');
  if(!url){ f.hidden = true; e.hidden = false; e.innerHTML = msg || '<b>Nothing here yet</b>'; curUrl = ''; return; }
  e.hidden = true; f.hidden = false;
  const full = url + (url.includes('?') ? '&' : '?') + 'embed=1';
  if(full !== curUrl){ curUrl = full; f.src = full; }
}

// Inside the editor: hide its own area tabs and page list (they live out here now), keep every control.
$('#ed').addEventListener('load', () => {
  let doc; try { doc = $('#ed').contentDocument; } catch(e){ return; }
  if(!doc || doc.getElementById('ws-embed')) return;
  const pagesEditor = /pages\.html/.test(doc.location.pathname);
  const st = doc.createElement('style'); st.id = 'ws-embed';
  st.textContent = `.app-tabs,.page-tree{display:none!important}
    .studio-shell main{height:calc(100% - 60px)!important}
    ${pagesEditor ? '.studio-shell main>.left{display:none!important}.studio-shell main{grid-template-columns:minmax(300px,430px) minmax(380px,1fr)!important}' : ''}`;
  doc.head.appendChild(st);
  // After Save, move straight on to the next option so the next change is one click away.
  doc.addEventListener('click', ev => {
    if(!ev.target.closest || !ev.target.closest('[data-editor-save]')) return;
    setTimeout(() => {
      const btns = [...doc.querySelectorAll('#studioOptions .option-button[data-option]')], i = btns.findIndex(b => b.classList.contains('on'));
      if(i >= 0 && btns[i + 1]) btns[i + 1].click();
    }, 1400);
  }, true);
});

areas(); pages();
})();
