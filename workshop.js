/* Five-area workspace around the existing editors. */
(() => {
'use strict';
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));


const T=window.TransitionWorkshop,C=StudioWorkspaceCore,AREAS=Object.fromEntries(C.GROUPS.map(g=>[g.id,g.pages.map(([id,name,sub,url])=>({id,name,sub,url,stores:C.STORE_TYPES.some(t=>t[0]===id)?()=>true:null}))]));
const TYPE={fast_food:'Fast food',fast_casual:'Fast casual',sit_down:'Sit-down',grocery:'Grocery',retail:'Retail',convenience:'Convenience'};
const townOf=a=>String(a||'').match(/,\s*([^,]+),\s*FL/i)?.[1]?.trim()||'Other';
let M={};try{M=JSON.parse(localStorage.getItem('asgard-workspace-v2')||'{}');}catch{}
M.page||={};M.pick||={};M.locations||={};
const q=new URLSearchParams(location.search),legacy={Asgard:'sky',Sleipnir:'shopping',Valhalla:'shopping',Valkyries:'delivery'};
const returnId=q.get('returnStudio');
if(['home','sky','dial','horn','way','directory','conversation','convo'].includes(returnId)){
  const anchor=document.createElement('a');anchor.textContent='Return to Studio';
  anchor.href='sleipnir-studio-1120.html#'+returnId;anchor.className='transition-return';
  document.querySelector('.workspace-crumbs').prepend(anchor);
}
let here=C.normalizeLocation({group:q.get('group')||legacy[q.get('area')]||M.group||'shopping',page:q.get('item')||M.page[q.get('group')||M.group||'sky'],store:q.get('store')||'',feature:q.get('feature')||'',topic:q.get('topic')||'',asset:q.get('asset')||'',from:q.get('from')||'',toolbox:q.get('tools')==='1',
 ...Object.fromEntries(['tool','edit','part','layer','toolPage','toolNative','targetType','aisle','targetLabel','bounds'].map(k=>[k,q.get(k)||'']))});
let toolNavigation=null;
let trail={items:[here],at:0},loading=false,curUrl='',frameReady=Promise.resolve(),frameResolve=null,navRevision=0,STORES=null,inventoryRequest=null,inventoryLoadedAt=0,flushCounter=0,restoring=false;const pending=new Map();
const keep=()=>{M.group=here.group;M.page[here.group]=here.page;try{localStorage.setItem('asgard-workspace-v2',JSON.stringify(M));}catch{}const u=new URL(location.href);u.searchParams.delete('area');u.searchParams.set('group',here.group);u.searchParams.set('item',here.page);if(here.store)u.searchParams.set('store',here.store);else u.searchParams.delete('store');if(here.feature)u.searchParams.set('feature',here.feature);else u.searchParams.delete('feature');if(here.topic)u.searchParams.set('topic',here.topic);else u.searchParams.delete('topic');if(here.asset)u.searchParams.set('asset',here.asset);else u.searchParams.delete('asset');if(here.from)u.searchParams.set('from',here.from);else u.searchParams.delete('from');for(const k of ['tool','edit','part','layer','toolPage','toolNative','targetType','aisle','targetLabel','bounds']){if(here[k])u.searchParams.set(k,here[k]);else u.searchParams.delete(k);}if(here.toolbox)u.searchParams.set('tools','1');else u.searchParams.delete('tools');history.replaceState(null,'',u);};
async function flush(){const f=$('#ed');if(f.hidden||!curUrl)return;try{const api=f.contentWindow.AsgardWorkspaceEditor;if(api?.save){await api.save();return;}}catch(e){if(e.name!=='SecurityError')throw e;} }
async function move(next,travel=false){if(loading){
 if(!travel&&(T.active(here)||T.active(next)))toolNavigation=next;return;
}loading=true;document.body.classList.remove('wide-tools');$('#workspaceStatus').textContent='Saving your place…';try{await flush();here=C.normalizeLocation(next);if(!travel)trail=C.historyPush(trail,here);keep();areas();restoring=true;await pages();if(!T.active(here)&&here.feature){const api=$('#ed').contentWindow.AsgardWorkspaceEditor;await C.restoreEditor(api,here);}restoring=false;breadcrumbs();}catch(e){$('#workspaceStatus').textContent='Could not save before leaving: '+e.message;}finally{loading=false;restoring=false;if(toolNavigation){const queued=toolNavigation;toolNavigation=null;queueMicrotask(()=>move(queued));}}}
function areas(){$('#areas').innerHTML=C.GROUPS.map(g=>`<button class="area ${g.id===here.group?'on':''} ${g.id==='assets'?'tools-area':''}" data-a="${g.id}" ${g.id==='assets'?'title="Utilities: test exports, render jobs and your image library. Not app pages."':''}>${esc(g.name)}</button>`).join('');document.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>move({group:b.dataset.a,page:M.page[b.dataset.a]}));}
function breadcrumbs(){const g=C.GROUPS.find(g=>g.id===here.group),p=AREAS[here.group].find(p=>p.id===here.page),loc=M.locations[curUrl]||{};$('#crumbPath').replaceChildren();const path=T.active(here)?[[g.name,()=>move({group:g.id,page:g.pages[0][0]})],...T.crumbs(here,move)]:[[g.name,()=>move({group:g.id,page:M.page[g.id]})],[p.name,()=>{const a=$('#ed').contentWindow.AsgardWorkspaceEditor;if(a?.topic)a.topic(null);}],[loc.feature,()=>$('#ed').contentWindow.AsgardWorkspaceEditor?.topic(null)],[loc.topic,null]];for(const [label,fn]of path){if(!label)continue;const b=document.createElement('button');b.textContent=({storepage:'Store page',basket:'Order basket',aisles:'Aisles & departments',shelves:'Shelves',checkout:'Checkout',produce:'Produce displays',stations:'Department displays',entrances:'Store entrances',products:'Products',boards:'Menu boards',holes:'Black holes',catalog:'Products & displays',design:'Images & buttons',bg:'Background',sky:'Sky',rocks:'Floating rocks',tabs:'Message tabs',sphere:'Sphere',media:'Images & videos'})[label]||label.replaceAll('_',' ');if(fn)b.onclick=fn;else b.className='trail-current';$('#crumbPath').append(b);const sep=document.createElement('span');sep.textContent='›';$('#crumbPath').append(sep);}$('#navBack').disabled=trail.at===0;$('#navForward').disabled=trail.at>=trail.items.length-1;}
$('#workspaceToolbox').onclick=async()=>{
 if(loading)return;
 if(here.toolbox){
   if(q.get('toolHost')==='selection'&&parent!==window){parent.postMessage({type:'studio:close-store-toolbox'},location.origin);return;}
   move({...here,toolbox:false,tool:'',edit:''});return;
 }
 const currentFrame=$('#ed');if(!currentFrame.hidden&&currentFrame.contentWindow.StudioSelectionToolbox?.open&&currentFrame.contentWindow.StudioSelectionToolbox.current?.()){
   currentFrame.contentWindow.StudioSelectionToolbox.open();return;
 }
 await T.inventory().catch(()=>{});
 const t=StudioToolTargets.capture(here,$('#ed').hidden?null:$('#ed').contentWindow);
 move({...here,toolbox:true,tool:'',edit:'',toolPage:t.page,toolNative:t.nativePage,aisle:t.aisle,part:t.part,layer:t.layer,targetType:t.type,targetLabel:t.label,bounds:t.bounds?JSON.stringify(t.bounds):''});
};
$('#navHome').onclick=()=>move({group:C.GROUPS[0].id,page:C.GROUPS[0].pages[0][0]});
addEventListener('message',e=>{if(e.origin!==location.origin)return;const d=e.data||{};
 if(e.source===$('#ed').contentWindow&&T.active(here)&&d.type==='studio:toolbox-topic'&&d.tool===T.feature(here)&&
    StudioToolbox.get(d.tool)?.ownsChooser&&typeof d.topic==='string'&&d.topic.length<=160){
   if(T.topic(here)!==d.topic){here=T.change(here,d.tool,d.topic);trail=C.historyPush(trail,here);keep();}
   document.body.classList.toggle('transition-focused',T.focused(here));breadcrumbs();return;
 }
 if(e.source===$('#ed').contentWindow&&T.active(here)&&['studio:toolbox-back','studio:portable-back'].includes(d.type)){
   move(T.topic(here)?T.change(here,T.feature(here)):T.change(here,''));return;
 }
 if(e.source===$('#ed').contentWindow&&T.sky(here)){
   if(d.type==='sleipnir:workshop-topic'&&d.feature==='sky'&&T.skyTopic(d.topic)){
     if(T.topic(here)!==d.topic){here=T.change(here,'sky',d.topic);trail=C.historyPush(trail,here);keep();}
     document.body.classList.toggle('transition-focused',T.focused(here));breadcrumbs();return;
   }
   if(d.type==='sleipnir:workshop-back'){move(T.change(here,''));return;}
 }
 if(['studio-transition-back','studio:transition-workshop-back'].includes(d.type)&&e.source===$('#ed').contentWindow&&T.active(here)&&T.topic(here)){move(T.change(here,T.feature(here)));return;}
if(d.type==='studio-wide')document.body.classList.remove('wide-tools');
 if(d.type==='studio-open'){ // tapping something in the preview opens it, like the app would
  if(d.target==='store'&&d.storeId){
   stores().then(list=>{const row=list.find(s=>s.id===d.storeId);if(!row)return;
    const page=row.app_surface==='valhalla'?'vbrowse':C.groceryModeForStore(row)?'grocery':row.menu_type==='convenience'?'retail':row.menu_type;
    move({group:'shopping',page,store:row.id});}).catch(e=>{$('#workspaceStatus').textContent=e.message;});return;
  }
  const types={grocery:'grocery',retail:'retail',fast_food:'fast_food',restaurant:'restaurant',valhalla:'vbrowse'};
  if(d.target==='browse'&&types[d.pageType]){move({group:'shopping',page:types[d.pageType]});return;}
  for(const g of C.GROUPS)for(const pg of g.pages)if(pg[0]===d.target||(pg[3]||'').includes('page='+d.target+'&')||(pg[3]||'').endsWith('page='+d.target)){move({group:g.id,page:pg[0]});return;}}});
$('#navBack').onclick=async()=>{if(trail.at<=0)return;try{await flush();trail.at--;await move(trail.items[trail.at],true);}catch(e){$('#workspaceStatus').textContent=e.message;}};
$('#navForward').onclick=async()=>{if(trail.at>=trail.items.length-1)return;try{await flush();trail.at++;await move(trail.items[trail.at],true);}catch(e){$('#workspaceStatus').textContent=e.message;}};
$('#workshopTransfer').onclick=()=>{const f=$('#ed');if(!f.hidden)f.contentWindow.postMessage({type:'asgard-open-transfer'},location.origin);};
async function stores(){
 const rows=await C.loadAppStores();
 return rows.map(s=>({...s,town:C.physicalCity(s),type:TYPE[s.menu_type]||'Other'})).sort((a,b)=>a.name.localeCompare(b.name));
}
async function pages(){const revision=++navRevision;document.body.classList.toggle('transition-workshop',T.active(here));document.body.classList.toggle('transition-focused',T.active(here)&&T.focused(here));$('#workspaceToolbox').textContent=here.toolbox?'Return to selection':'Toolbox';const nav=$('#pages'),list=AREAS[here.group];nav.innerHTML=`<div class="cap">CHOOSE WHAT TO WORK ON</div>`+list.map(p=>`<button class="pg ${p.id===here.page?'on':''}" data-p="${p.id}">${esc(p.name)}<small>${esc(p.sub)}</small></button>${p.stores&&p.id===here.page?'<div class="drill" id="drill">Loading stores…</div>':''}`).join('');nav.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{if(b.dataset.p===here.page&&C.STORE_TYPES.some(t=>t[0]===here.page))chooseStore(list.find(p=>p.id===here.page));else move({group:here.group,page:b.dataset.p});});const p=list.find(p=>p.id===here.page);
 if(here.toolbox){const d=nav.querySelector('#drill');if(d)d.remove();}
 if(T.active(here))return T.render(here,{nav,empty:$('#empty')},move,show,()=>revision===navRevision);if(p.stores)await drill(p);else if(p.url)return show(p.url);else show(null,'<div class="workspace-source-note"><h2>Keep the original app screen</h2><p>Your delivery, checkout and merchant screens already exist in the app. Their current source is needed to expose their real controls here without substituting a different screen.</p><p>Existing app behavior is preserved. Work on the connected editors using the sections above.</p></div>');}
function storefrontSkyButton(close) {
 const b=document.createElement('button');b.type='button';b.className='retry-stores';b.textContent='Storefront sky';
 b.onclick=()=>{if(close)close();move({group:'shopping',page:'street',feature:'sky'});};return b;
}
async function drill(page){
 const d=$('#drill');d.replaceChildren();if(page.id==='vbrowse')d.append(storefrontSkyButton());
 const change=document.createElement('button');change.className='retry-stores';change.textContent='Choose city and store';change.onclick=()=>chooseStore(page);d.append(change);
 if(here.store){const all=await stores(),store=all.find(s=>s.id===here.store&&C.storeTypeMatches(page.id,s));if(store){const info=document.createElement('p');info.textContent=store.name+' · '+store.town;d.append(info);return show(C.storeEditorForStore(store));}here.store='';}
 show(null,'<div><h2>Choose a city and store</h2><p>Your selected store’s components will appear here.</p></div>');await chooseStore(page);
}
async function chooseStore(page){
 document.getElementById('storePicker')?.remove();
 const dialog=document.createElement('dialog');dialog.id='storePicker';dialog.className='store-picker';
 dialog.innerHTML='<div class="picker-heading"><h2></h2><button class="retry-stores" data-close>Close</button></div><label>City<select aria-label="City"><option value="">Choose a city…</option></select></label><p role="status">Loading current store information…</p><div class="store-cards"></div>';
 dialog.querySelector('h2').textContent=page.name;
 if(page.id==='vbrowse')dialog.querySelector('.picker-heading').after(storefrontSkyButton(()=>dialog.close()));
 dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();
 try{const inventory=await stores();
  const choices=page.id==='sit_down'&&window.PalmCoastDesignLocations?window.PalmCoastDesignLocations.withDiningRooms(inventory):inventory;
  const rows=choices.filter(s=>C.storeTypeMatches(page.id,s)).sort((a,b)=>a.name.localeCompare(b.name)),cities=[...new Set(rows.map(s=>s.town))].sort(),city=dialog.querySelector('select'),cards=dialog.querySelector('.store-cards'),status=dialog.querySelector('[role=status]');
 for(const name of cities){const o=document.createElement('option');o.value=name;o.textContent=name;city.append(o);}
 status.textContent=rows.length?'Choose a city.':'No live stores in this category.';
 city.onchange=()=>{
  cards.replaceChildren();const selectedCity=city.value,matches=rows.filter(s=>s.town===selectedCity);
  if(!selectedCity){status.textContent='Choose a city.';return;}
  status.textContent=matches.length+' stores in '+selectedCity;
  for(const st of matches){
   const card=document.createElement('article');card.className='store-card';
   const count=Number(st.product_count)||0,photos=Number(st.image_count)||0;
   const description=st.designRoomUrl?'Dining room design':st.app_surface==='valhalla'?st.valhalla_menu_count.toLocaleString()+' orderable menu items':count?count.toLocaleString()+' products · '+photos.toLocaleString()+' images':'No catalog products recorded';
   card.innerHTML='<h3>'+esc(st.name)+'</h3><p>'+esc(st.address||'Address not recorded')+'</p><p>'+esc(description)+'</p><button class="retry-stores">Edit this store</button>';
   const edit=card.querySelector('button');
   if(st.designRoomUrl){
    const link=document.createElement('a');link.href=st.designRoomUrl;link.target='_top';link.className='retry-stores';link.textContent='Open dining room';edit.replaceWith(link);
   }else edit.onclick=()=>{dialog.close();move({group:'shopping',page:page.id,store:st.id});};
   cards.append(card);
  }
 };
 }catch(e){dialog.querySelector('[role=status]').textContent=e.message;}
}

function show(url,message){const f=$('#ed'),e=$('#empty');if(!url){if(curUrl.includes('workshopFocus=1')||curUrl.includes('page-sky-editor.html'))f.removeAttribute('src');f.hidden=true;e.hidden=false;e.innerHTML=message||'';curUrl='';$('#workspaceStatus').textContent='Choose what to work on';return;}e.hidden=true;f.hidden=false;
 if(T.sky(here)&&curUrl.includes('page-sky-editor.html')&&f.contentWindow.ValhallaSkyWorkshop?.focus){
   const prev=new URL(curUrl,document.baseURI),next=new URL(url,document.baseURI);
   if(prev.pathname===next.pathname&&['page','store','aisle','part','layer','targetType'].every(k=>prev.searchParams.get(k)===next.searchParams.get(k))){
     curUrl=url;f.contentWindow.ValhallaSkyWorkshop.focus(T.topic(here)||'');return;
   }
 }
 if(curUrl===url)return T.active(here)?undefined:frameReady;curUrl=url;frameReady=new Promise(resolve=>{frameResolve=resolve;});const target=new URL(url,document.baseURI);target.searchParams.set('embed','1');target.searchParams.set('editor','claude-1118c');f.src=target.href;$('#workspaceStatus').textContent=T.active(here)?'Page editor':'Draft workspace · app changes require approval';breadcrumbs();return T.active(here)?undefined:frameReady;}
$('#ed').addEventListener('load',async()=>{const f=$('#ed');let doc;try{doc=f.contentDocument;}catch{return;}if(!curUrl||!doc||doc.location.href==='about:blank'||doc.getElementById('ws-embed'))return;const isPages=/pages\.html/.test(doc.location.pathname),st=doc.createElement('style');st.id='ws-embed';st.textContent=`.app-tabs,.page-tree,main>.left{display:none!important}.studio-shell main{height:calc(100% - 60px)!important;grid-template-columns:430px minmax(350px,1fr)!important;overflow:hidden!important}.studio-shell .center{padding:10px!important;height:100%!important;overflow:auto!important}.studio-shell .right{min-width:0!important}.studio-shell .top{min-width:0!important}.studio-shell .top .brand{display:none}.studio-shell .panel,#panel{overflow:auto!important;min-height:0}.studio-shell .center .phonewrap{min-height:0}.studio-shell .ctitle h1{font-size:18px!important}`;doc.head.append(st);
 const fit=()=>{const center=doc.querySelector('.center'),phone=doc.querySelector('.phone'),wrap=doc.querySelector('.phonewrap');if(!center||!phone||!wrap)return;const rect=center.getBoundingClientRect(),top=wrap.getBoundingClientRect().top;const h=Math.max(160,rect.bottom-top-65);phone.style.setProperty('height',h+'px','important');phone.style.setProperty('width',(h*390/844)+'px','important');phone.style.setProperty('min-height','0','important');wrap.style.setProperty('min-height','0','important');center.style.setProperty('overflow','hidden','important');};new ResizeObserver(fit).observe(f);fit();
 $('#workshopTransfer').textContent=/store-editor\.html/.test(doc.location.pathname)?'Save / export design':'App transfer / Get Dart';const loadingUrl=curUrl,resolve=frameResolve;try{await f.contentWindow.AsgardWorkspaceEditor?.ready;}catch(error){$('#workspaceStatus').textContent='Could not open this editor: '+error.message;resolve?.();return;}if(curUrl!==loadingUrl){resolve?.();return;}
 const left=doc.querySelector('main>.left');if(left){const opener=doc.createElement('button');opener.className='btn';opener.textContent='Layers & versions';opener.onclick=()=>{const d=doc.createElement('dialog'),marker=doc.createComment('original layer panel'),close=doc.createElement('button');d.className='wb-help ws-original-panel';close.className='btn';close.textContent='Close';close.onclick=()=>d.close();left.before(marker);d.append(close,left);doc.body.append(d);d.addEventListener('close',()=>{marker.replaceWith(left);d.remove();},{once:true});d.showModal();};doc.querySelector('.editor-toolbar')?.append(opener);}

 f.contentWindow.addEventListener('workspace-feature',e=>{if(here.toolbox)return;M.locations[curUrl]={feature:e.detail.feature,topic:e.detail.topic,asset:e.detail.asset||''};if(!restoring){here={...here,feature:e.detail.feature,topic:e.detail.topic||'',asset:e.detail.asset||''};trail=C.historyPush(trail,here);}keep();breadcrumbs();});const loc=!T.active(here)&&here.feature?{feature:here.feature,topic:here.topic,asset:here.asset}:null;restoring=true;if(loc?.feature){await C.restoreEditor(f.contentWindow.AsgardWorkspaceEditor,loc);}restoring=false;breadcrumbs();resolve?.();});
addEventListener('studio:tool-registered',()=>{if(T.active(here)&&!T.feature(here)&&!loading)pages().then(breadcrumbs);});
keep();areas();pages().then(async()=>{const a=$('#ed').contentWindow.AsgardWorkspaceEditor;if(!T.active(here)&&here.feature){restoring=true;await C.restoreEditor(a,here);restoring=false;}breadcrumbs();});
})();
