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
    { id:'shome', name:'Home page', sub:'Logo, search, Odin, category buttons', url:'pages.html?page=shome' },
    { id:'grocery', name:'Grocery', sub:'Store list page', url:'pages.html?page=browse&type=grocery' },
    { id:'fast_food', name:'Fast Food', sub:'Store list page', url:'pages.html?page=browse&type=fast_food' },
    { id:'restaurant', name:'Restaurants', sub:'Store list page', url:'pages.html?page=browse&type=restaurant' },
    { id:'retail', name:'Retail', sub:'Store list page', url:'pages.html?page=browse&type=retail' },
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
    { id:'vbrowse', name:'Valhalla page', sub:'Local store list page', url:'pages.html?page=browse&type=valhalla' },
    { id:'vstores', name:'Valhalla stores', sub:'Town → type → store, then its page look', stores: s => !!s.is_valhalla },
  ],
  Valkyries: [],
};
const TYPE = { fast_food:'Fast food', fast_casual:'Fast casual', sit_down:'Sit-down', grocery:'Grocery', retail:'Retail', convenience:'Convenience' };
const townOf = (a) => { const m = String(a || '').match(/,\s*([^,]+),\s*FL/i); return m ? m[1].trim() : 'Other'; };

let M = {}; try { M = JSON.parse(localStorage.getItem('sleipnir-workshop') || '{}'); } catch(e){}
const requestedArea = new URLSearchParams(location.search).get('area');
if(Object.hasOwn(AREAS, requestedArea)) M.area = requestedArea;
if(!Object.hasOwn(AREAS, M.area)) M.area = 'Asgard';
M.page ||= {}; M.pick ||= {};
const keep = () => {
  try { localStorage.setItem('sleipnir-workshop', JSON.stringify(M)); } catch(e){}
  const url = new URL(location.href); url.searchParams.set('area', M.area);
  history.replaceState(null, '', url);
};
let STORES = null, inventoryLoadedAt = 0, inventoryRequest = null, navRevision = 0;

async function stores(){
  if(STORES && Date.now() - inventoryLoadedAt < 60000) return STORES;
  if(inventoryRequest) return inventoryRequest;
  inventoryRequest = StudioStoreCatalog.load({ baseUrl:SB.url, headers:H }).then(rows => {
    rows.forEach(s => { s.town = townOf(s.address); s.type = TYPE[s.menu_type] || 'Other'; });
    STORES = rows.sort((a,b) => a.name.localeCompare(b.name)); inventoryLoadedAt = Date.now(); return STORES;
  }).finally(() => { inventoryRequest = null; });
  return inventoryRequest;
}

function areas(){
  $('#areas').innerHTML = Object.keys(AREAS).map(a => `<button class="area ${a === M.area ? 'on' : ''}" data-a="${a}">${a}</button>`).join('');
  document.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { M.area = b.dataset.a; keep(); areas(); pages(); });
}

async function pages(){
  ++navRevision;
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
  const ticket = ++navRevision, d = $('#drill'); if(!d) return;
  let areaStores;
  try { areaStores = (await stores()).filter(page.stores); }
  catch(error){
    if(ticket !== navRevision || d !== $('#drill')) return;
    d.innerHTML = '<p class="note">Could not load store information.</p><button class="retry-stores" id="retryStores">Try again</button>';
    $('#retryStores').onclick = () => drill(page); show(null,'<b>Store information unavailable</b>Try again to load your stores.'); return;
  }
  if(ticket !== navRevision || d !== $('#drill')) return;
  const pk = M.pick[page.id] ||= { town:'', type:'', store:'', folder:'working' };
  const folders = [['working','Selected stores'],['empty','Stores with no info']];
  if(areaStores.some(s => s.folder === 'other')) folders.push(['other','Other stores with products']);
  if(!folders.some(([id]) => id === pk.folder)) pk.folder = 'working';
  const all = areaStores.filter(s => s.folder === pk.folder);
  const towns = [...new Set(all.map(s => s.town))].sort((a, b) => a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b));
  if(pk.town && !towns.includes(pk.town)) pk.town = '';
  const inTown = all.filter(s => !pk.town || s.town === pk.town);
  const types = [...new Set(inTown.map(s => s.type))].sort();
  if(pk.type && !types.includes(pk.type)) pk.type = '';
  const list = inTown.filter(s => !pk.type || s.type === pk.type);
  if(pk.store && !list.some(s => s.id === pk.store)) pk.store = '';
  const opt = (v, l, sel) => `<option value="${esc(v)}" ${v === sel ? 'selected' : ''}>${esc(l)}</option>`;
  d.innerHTML = `<label>FOLDER<select id="dFolder">${folders.map(([id,label]) => opt(id,label+' ('+areaStores.filter(s=>s.folder===id).length+')',pk.folder)).join('')}</select></label>
    <label>1 · TOWN<select id="dTown">${opt('', 'Every town', pk.town)}${towns.map(t => opt(t, t, pk.town)).join('')}</select></label>
    <label>2 · TYPE<select id="dType">${opt('', 'Every type', pk.type)}${types.map(t => opt(t, t, pk.type)).join('')}</select></label>
    <label>3 · STORE<select id="dStore">${opt('', 'Choose a store…', pk.store)}${list.map(s => opt(s.id, s.name + (pk.town ? '' : ' · ' + s.town), pk.store)).join('')}</select></label>
    <span class="count">${list.length} store${list.length === 1 ? '' : 's'}</span>
    <button class="retry-stores" id="refreshStores">Refresh store info</button>
    <div id="storeInfo" class="store-info" ${pk.store ? '' : 'hidden'}></div>`;
  $('#dFolder').onchange = e => { pk.folder=e.target.value; pk.town=''; pk.type=''; pk.store=''; keep(); drill(page); };
  $('#refreshStores').onclick = () => { inventoryLoadedAt=0; drill(page); };
  $('#dTown').onchange = e => { pk.town = e.target.value; keep(); drill(page); };
  $('#dType').onchange = e => { pk.type = e.target.value; keep(); drill(page); };
  $('#dStore').onchange = e => { pk.store = e.target.value; keep(); drill(page); };
  if(pk.store){
    const selected = list.find(s=>s.id===pk.store); $('#storeInfo').innerHTML = storeInfo(selected);
    show('pages.html?page=store&store=' + encodeURIComponent(pk.store));
  }
  else show(null, '<b>Pick a store</b>Choose a town, a type, then a store on the left. Its page opens here with every control.');
}

function storeInfo(s){
  let website='';
  try{const u=new URL(s.website_url);if(['https:','http:'].includes(u.protocol))website=`<p><a href="${esc(u.href)}" target="_blank" rel="noopener noreferrer">Store website</a></p>`;}catch{}
  const hours = typeof s.hours==='string' ? s.hours : s.hours ? JSON.stringify(s.hours) : '';
  return `<strong>${esc(s.name)}</strong><p>${s.product_count.toLocaleString()} products / menu items<br>${s.image_count.toLocaleString()} with image links</p>
    <p>${esc(s.address||'Address not added')}</p>${website}${hours?`<details><summary>Hours</summary><p>${esc(hours)}</p></details>`:''}
    <small>${s.product_count===0?'No products or menu items yet.':'Image quality is checked separately.'}</small>`;
}

let curUrl = '';
function show(url, msg){
  const f = $('#ed'), e = $('#empty');
  if(!url){ f.hidden = true; e.hidden = false; e.innerHTML = msg || '<b>Nothing here yet</b>'; curUrl = ''; return; }
  e.hidden = true; f.hidden = false;
  const full = url + (url.includes('?') ? '&' : '?') + 'embed=1';
  if(full !== curUrl){ curUrl = full; f.src = full + (full.includes('?') ? '&' : '?') + 'editor=shared-media-2'; }
}

// Inside the editor: hide its own area tabs and page list (they live out here now), keep every control.
$('#ed').addEventListener('load', () => {
  let doc; try { doc = $('#ed').contentDocument; } catch(e){ return; }
  if(!doc || doc.getElementById('ws-embed')) return;
  const pagesEditor = /pages\.html/.test(doc.location.pathname);
  const st = doc.createElement('style'); st.id = 'ws-embed';
  st.textContent = `.app-tabs,.page-tree{display:none!important}
    .studio-shell main{height:calc(100% - 60px)!important}
    .studio-shell main{grid-template-columns:${pagesEditor ? '' : '200px '}minmax(390px,430px) minmax(360px,1fr)!important;overflow:auto}
    .studio-shell .center{padding:10px 10px 6px!important}.studio-shell .phone{border-radius:44px!important}
    ${pagesEditor ? '.studio-shell main>.left{display:none!important}' : ''}`;
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

keep(); areas(); pages();
})();



