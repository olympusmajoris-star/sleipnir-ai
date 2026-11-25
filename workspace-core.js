/* Shared, DOM-independent workshop rules. No application data is changed here. */
(function(G){
'use strict';
const clone=x=>x==null?x:JSON.parse(JSON.stringify(x));
const forbidden=new Set(['__proto__','prototype','constructor']);
function parts(path){const a=String(path).split('.');if(!a.length||a.some(k=>!k||forbidden.has(k)))throw Error('Invalid setting path');return a;}
function get(object,path){return parts(path).reduce((a,k)=>a?.[k],object);}
function set(object,path,value){const keys=parts(path);let at=object;for(const k of keys.slice(0,-1)){if(!at[k]||typeof at[k]!=='object')at[k]={};at=at[k];}at[keys.at(-1)]=clone(value);return object;}
function enforceLocks(document,previous=document){const locks=previous?._studioEditor?.locks||{},next={};for(const [path,l]of Object.entries(locks)){if(!l||!Object.hasOwn(l,'value'))continue;let key=path;if(l.layerId){const collection=l.collection||'_studioLayers';let i=document[collection]?.findIndex(x=>x.id===l.layerId)??-1;if(i<0){const original=previous[collection]?.find(x=>x.id===l.layerId);if(!original)continue;document[collection]||=[];document[collection].push(clone(original));i=document[collection].length-1;}key=collection+'.'+i+'.'+path.split('.').slice(2).join('.');}set(document,key,l.value);next[key]=clone(l);}document._studioEditor={...(document._studioEditor||{}),locks:next};return document;}
function preserveLocks(previous,next){const out=enforceLocks(clone(next),previous);out._studioEditor.presets=clone(previous?._studioEditor?.presets||out._studioEditor?.presets||[]);return out;}
function preset(document){const copy=clone(document);if(copy?._studioEditor)delete copy._studioEditor.presets;return copy;}
const OLD_GROUPS=[
 {id:'sky',name:'Sky & people',pages:[['raven','Raven sky','Black holes, gas, lensing & favorites','index.html'],['rocks','Floating navigation','Carved rocks, light & debris','index.html?section=rocks']]},
 {id:'social',name:'Posts & sharing',pages:[['home','Home & posts','Your social feed, sky & post appearance','pages.html?page=home'],['share','Share scene','Water, figures & sharing','pages.html?page=share'],['swap','Marketplace','Buy, sell & listing appearance','pages.html?page=swap'],['shoppost','Shop the post','Product tags & display','pages.html?page=shoppost'],['ads','Local ads','Ad cards & presentation','pages.html?page=ads'],['deals','Deals','Offers & countdown appearance','pages.html?page=deals']]},
 {id:'messages',name:'Messages & alerts',pages:[['effects','Construction & cloud motion','Object formation, living clouds & clip editing','studio-effects.html'],['convo','Messages','Clouds, Earth, words & movement','pages.html?page=convo'],['heimdall','Heimdall','Notification scene','pages.html?page=heimdall']]},
 {id:'shopping',name:'Stores & displays',pages:[['shome','Shopping home','Norse art, search & categories','pages.html?page=shome'],['stores','Edit a store','Town → type → store',null],['grocery','Grocery discovery','Store browsing','pages.html?page=browse&type=grocery'],['retail','Retail discovery','Store browsing','pages.html?page=browse&type=retail'],['fast_food','Fast food discovery','Store browsing','pages.html?page=browse&type=fast_food'],['restaurant','Restaurant discovery','Store browsing','pages.html?page=browse&type=restaurant'],['vbrowse','Valhalla street & stores','Local store discovery','pages.html?page=browse&type=valhalla']]},
 {id:'delivery',name:'Delivery & orders',pages:[['track','Tracking','Tracking editor','pages.html?page=track'],['delivery-original','Delivery screens','Sources received; native route verification pending',null]]},
 {id:'assets',name:'⚙ Tools & files',pages:[['native-store','Original store test','Test a rendered shelf with the original cart','native-store.html'],['native','Original app controls','Native Raven & cloud conversation','native-controls.html'],['assets','All images & videos','Folders, categories & reusable art','workspace-tools.html?tool=assets'],['jobs','Forge & render jobs','Collection, review & rendering briefs','workspace-tools.html?tool=jobs']]}
];
const STORE_TYPES=[['grocery','Groceries'],['retail','Retail stores'],['vbrowse','Valhalla streets and storefronts'],['fast_food','Fast food'],['fast_casual','Fast casual'],['sit_down','Sit-down restaurants'],['cafe','Cafés and coffee shops'],['bakery','Bakeries and pastry shops'],['dessert','Dessert and ice cream shops'],['deli','Delis and sandwich shops'],['food_truck','Food trucks and walk-up stands'],['bar','Bars and pubs'],['buffet','Buffets']];
const valhallaStreet = ['street','Valhalla storefronts','Palm Coast street and storefront sky',null];
const appPages = ['app-pages','App pages','Transitions, glass and camera placement',null];
const GROUPS=[
 {id:'shopping',name:'Sleipnir',pages:[['shome','Shopping home','Your existing shopping home','pages.html?page=shome'],['aisle-workshop','Aisles & shelves','Entrances, blackboards and product placement','grocery-aisle-builder.html'],['menu-workshop','Menu boards & books','Page designs and dish photos','store-directory.html?type=menus'],valhallaStreet,appPages,...STORE_TYPES.map(([id,name])=>[id,name,'Choose city and store',null])]},
 {id:'social',name:'Asgard',pages:[...OLD_GROUPS.filter(g=>['sky','social','messages'].includes(g.id)).flatMap(g=>g.pages),['raven-cabin','Raven cabin designer','Dashboards, symbols, colors & camera pan','raven-cabin-studio.html?embed=1&v=1125video3'],['raven-scenes','Raven scene designer','14 messaging scenes with editable text, artwork & controls','raven-scenes-studio.html?embed=1&v=1124billboards2'],appPages]}
];
function storeTypeMatches(section,store){
 const type=String(store.menu_type||'').toLowerCase(),cat=String(store.category||'').toLowerCase();
 if(section==='vbrowse')return store.app_surface==='valhalla';
 if(store.app_surface==='valhalla')return false;
 const grocery=groceryModeForStore(store);
 if(section==='grocery'||grocery)return section==='grocery'&&Boolean(grocery);
 const aliases={retail:['retail','convenience'],fast_food:['fast_food'],fast_casual:['fast_casual'],sit_down:['sit_down','restaurant'],cafe:['cafe','coffee'],bakery:['bakery'],dessert:['dessert','ice_cream'],deli:['deli','sandwich'],food_truck:['food_truck','walk_up'],bar:['bar','pub'],buffet:['buffet']};
 return (aliases[section]||[]).some(t=>type===t||cat===t||cat===t.replaceAll('_',' '));
}

function normalizeLocation(value={}){let groupId=value.group;if(['sky','messages'].includes(groupId))groupId='social';if(groupId==='delivery'||groupId==='valhalla')groupId='shopping';const group=GROUPS.find(g=>g.id===groupId)||GROUPS[0];let pageId=value.page;if(value.group==='valhalla'&&!pageId)pageId='street';if(pageId==='stores')pageId='grocery';if(pageId==='restaurant')pageId='sit_down';const page=group.pages.find(p=>p[0]===pageId)||group.pages[0];const store=STORE_TYPES.some(p=>p[0]===page[0])&&typeof value.store==='string'?value.store:'';return {group:group.id,page:page[0],store,feature:typeof value.feature==='string'?value.feature:'',topic:typeof value.topic==='string'?value.topic:'',asset:typeof value.asset==='string'?value.asset:'',...(page[0]==='app-pages'&&typeof value.from==='string'&&value.from?{from:value.from}:{}),...Object.fromEntries(['tool','edit','part','layer','toolPage','toolNative','targetType','aisle','targetLabel','bounds'].filter(k=>typeof value[k]==='string'&&value[k]).map(k=>[k,value[k]])),...(value.toolbox?{toolbox:true}:{})};}
async function restoreEditor(api,location){if(!api||!location.feature)return;await api.feature?.(location.feature);if(location.asset)await api.asset?.(location.asset);await api.topic?.(location.topic||null);}
function historyPush(state,location){const next=normalizeLocation(location);if(JSON.stringify(state.items[state.at])===JSON.stringify(next))return state;const items=state.items.slice(0,state.at+1);items.push(next);if(items.length>80)items.shift();return{items,at:items.length-1};}
function displayFor(category){const s=String(category||'').toLowerCase();if(/frozen|ice cream/.test(s))return'freezer';if(/dairy|milk|yogurt|cheese|refrigerat|chilled/.test(s))return'refrigerator';if(/produce|fruit|vegetable/.test(s))return'produce';if(/appetizer|entree|combo|sandwich|pizza|menu/.test(s))return'menu';if(/clothing|apparel|dress|shirt/.test(s))return'clothing';if(/tool|hardware|auto/.test(s))return'pegboard';return'shelf';}
function duplicateKey(product){const name=String(product.name||product.official_title||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();return[String(product.store_id||''),name].join('|');}
function duplicates(products){const groups=new Map();for(const p of products){const k=duplicateKey(p);if(!k.split('|')[1])continue;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(p);}return[...groups.values()].filter(g=>g.length>1);}
function renderPlan(products,rules={}){const rows=Math.max(1,Math.min(12,Math.round(+rules.rows||3))),brandsPerRow=Math.max(1,Math.min(12,Math.round(+rules.brandsPerRow||3))),facings=Math.max(1,Math.min(12,Math.round(+rules.facings||3)));const list=products.map(p=>({id:p.id,name:p.name,price:p.price,image_url:p.image_url,category:p.category,brand:p.brand||rules.brandOverrides?.[p.id]||'Unassigned'}));const groups=new Map();for(const p of list){const key=p.category||'Uncategorized';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p);}const boards=[];for(const [category,items]of groups){items.sort((a,b)=>a.brand.localeCompare(b.brand)||a.name.localeCompare(b.name));const size=rows*brandsPerRow;for(let offset=0;offset<items.length;offset+=size){const batch=items.slice(offset,offset+size);boards.push({category,display:rules.display&&rules.display!=='auto'?rules.display:displayFor(category),rows,brandsPerRow,facings,products:batch,slots:batch.map((p,i)=>({productId:p.id,row:Math.floor(i/brandsPerRow)+1,column:i%brandsPerRow+1,facings})),instruction:'Use the exact product packaging and names from the supplied references. Keep every product identity and price tag correct. Repeat each product '+facings+' times in its slot. No invented brands or substitutions. Leave clear, editable price-tag areas. Photoreal stocked display; preserve the chosen shelving material and viewpoint.'});}}return{schemaVersion:1,rules:{...rules,rows,brandsPerRow,facings},boards,needsBrandReview:list.some(p=>p.brand==='Unassigned'),productCount:list.length};}
const storeIdPattern=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const nativeStoreModes=Object.freeze({
 '35ef70d0-3d20-4599-96a3-648ee3c7c340':'target',
 '189581c9-d728-4e5d-9e02-ae4de19a15af':'publix',
 'e5a01340-424a-4a41-b0e6-99cb9e944733':'published',
 '0600cb61-45f9-402b-a209-134abdaef10f':'dollar-general'
});
const scopeFile=G.document?.currentScript?.src?new URL('store-scope.json',G.document.currentScript.src).href:'store-scope.json';
const retention=60000;
let appRows=null,appLookup=new Map(),loadedAt=0,pendingAppStores=null;
let scopeIds=null,scopeAt=0,pendingScope=null;
const checkedById=new Map(),pendingById=new Map();
function physicalCity(row){
 const address=String(row?.address||'').trim();
 const match=address.match(/,\s*([^,]+?)\s*,\s*(?:FL|Florida)\b/i);
 if(match)return match[1].trim().replace(/\s+/g,' ');
 // Operator branch 1680 lists this exact street in Palm Coast; the catalog address omits city and state.
 if(row?.id==='3eb517cb-1328-4e94-a73e-68ed48398c7d'&&/^5234 (?:E|East) Highway 100\.?$/i.test(address))return 'Palm Coast';
 return '';
}
function localCandidate(row){
 return row?.is_live===true&&physicalCity(row).toLowerCase()==='palm coast'
  &&['grocery','retail','convenience','fast_food','fast_casual','sit_down'].includes(String(row.menu_type||'').toLowerCase());
}
async function appTable(conf,name,params,splitOnTimeout){
 const url=conf.url+'/rest/v1/'+name+'?'+new URLSearchParams(params);
 const options={headers:{apikey:conf.key,Authorization:'Bearer '+conf.key},cache:'no-store'};
 const failure=new Error('The shopping directory could not verify the Palm Coast store selection.');
 for(let attempt=0;attempt<2;attempt++){
  let res;
  try{res=await G.fetch(url,options);}catch(error){if(attempt)throw failure;continue;}
  if(res.ok){const rows=await res.json();if(!Array.isArray(rows))throw Error('Invalid shopping directory response.');return rows;}
  if(res.status<500)throw failure;
  const problem=await res.json().catch(()=>null);
  if(splitOnTimeout&&problem?.code==='57014'){failure.code=problem.code;throw failure;}
 }
 throw failure;
}
async function approvedIds(force=false){
 if(!force&&scopeIds&&Date.now()-scopeAt<retention)return scopeIds;
 if(pendingScope)return pendingScope;
 pendingScope=(async()=>{
  const response=await G.fetch(scopeFile,{cache:'no-store'});
  if(!response.ok)throw Error('The app store list could not be loaded.');
  const scope=await response.json();
  if(!Array.isArray(scope.stores)||!scope.stores.length||scope.stores.some(s=>!storeIdPattern.test(s?.id||'')))throw Error('The app store list could not be verified.');
  scopeIds=new Set(scope.stores.map(s=>s.id.toLowerCase()));scopeAt=Date.now();return scopeIds;
 })().finally(()=>{pendingScope=null;});
 return pendingScope;
}
async function readApprovedLocations(ids){
 const conf=G.StudioTransferConfig;
 if(!conf?.url||!conf?.key)throw Error('The shopping directory configuration is unavailable.');
 const list=[...ids];let rows;
 try{rows=await appTable(conf,'rpc/studio_palm_coast_editor_locations',{p_store_ids:'{'+list.join(',')+'}'},list.length>1);}
 catch(error){
  if(error.code!=='57014')throw error;
  const middle=Math.ceil(list.length/2);
  // Each worker recovers one half at a time to keep retries within the same concurrency limit.
  const first=await readApprovedLocations(new Set(list.slice(0,middle)));
  const second=await readApprovedLocations(new Set(list.slice(middle)));
  return new Map([...first,...second]);
 }
 const verified=new Map();
 for(const row of rows){
  if(!ids.has(row.id)||!localCandidate(row))continue;
  const street=row.app_surface==='valhalla'&&row.native_renderer==='ValhallaStreet'&&Number.isInteger(row.valhalla_menu_count)&&row.valhalla_menu_count>0;
  const ordinary=row.app_surface==='ordinary'&&!row.native_renderer&&Number.isInteger(row.product_count)&&row.product_count>0;
  if(street||ordinary)verified.set(row.id,Object.freeze({...row}));
 }
 return verified;
}
async function loadAppStores(options={}){
 if(!options.force&&appRows&&Date.now()-loadedAt<retention)return appRows;
 if(pendingAppStores)return pendingAppStores;
 pendingAppStores=(async()=>{
  const ids=await approvedIds(options.force);
  const list=[...ids];
  const workerCount=Math.min(4,Math.ceil(list.length/32));
  // Distribute the large catalogs at the start of the approved list across workers.
  const workers=Array.from({length:workerCount},()=>[]);
  list.forEach((id,index)=>workers[index%workerCount].push(id));
  const groups=await Promise.all(workers.map(async stores=>{
   const entries=[];
   for(let start=0;start<stores.length;start+=32){
    const batch=await readApprovedLocations(new Set(stores.slice(start,start+32)));
    entries.push(...batch);
   }
   return entries;
  }));
  const verified=new Map(groups.flatMap(group=>[...group]));
  appRows=Object.freeze([...ids].filter(id=>verified.has(id)).map(id=>verified.get(id)));
  appLookup=verified;loadedAt=Date.now();checkedById.clear();return appRows;
 })().finally(()=>{pendingAppStores=null;});
 return pendingAppStores;
}
async function appStoreById(value){
 const id=String(value||'').toLowerCase();if(!storeIdPattern.test(id))return null;
 if(pendingAppStores){await pendingAppStores;return appLookup.get(id)||null;}
 if((appRows&&Date.now()-loadedAt<retention)||Date.now()-(checkedById.get(id)||0)<retention)return appLookup.get(id)||null;
 if(pendingById.has(id))return pendingById.get(id);
 const request=(async()=>{
  const ids=await approvedIds();
  const row=ids.has(id)?(await readApprovedLocations(new Set([id]))).get(id):null;
  if(row)appLookup.set(id,row);else appLookup.delete(id);
  checkedById.set(id,Date.now());return row||null;
 })().finally(()=>{pendingById.delete(id);});
 pendingById.set(id,request);return request;
}
function groceryModeForStore(row){
 row=appLookup.get(String(row?.id||'').toLowerCase());
 if(!row||row.app_surface==='valhalla')return '';
 const id=row.id.toLowerCase(),name=String(row.name||'').trim().toLowerCase();
 if(nativeStoreModes[id])return nativeStoreModes[id];
 if(row.has_published_aisles===true)return 'published';
 if(name.includes('dollar general')||name.startsWith('dg market'))return 'dollar-general';
 const type=String(row.menu_type||'').trim().toLowerCase(),category=String(row.category||'').trim().toLowerCase();
 return type==='grocery'||category==='grocery'||category==='wholesale'?'grocery':'';
}
function groceryEntranceForStore(value){
 const row=typeof value==='string'?{id:value}:value;
 return groceryModeForStore(row)?'grocery-entrance.html?store='+row.id.toLowerCase():'';
}
function storeEditorForStore(row){
 row=appLookup.get(String(row?.id||'').toLowerCase());
 if(!row)return '';
 const entrance=groceryEntranceForStore(row);
 if(entrance)return entrance;
 const type=String(row.menu_type||'retail').trim().toLowerCase();
 const params=new URLSearchParams({store:row.id.toLowerCase(),type,native:'1'});
 if(row.native_renderer)params.set('renderer',row.native_renderer);
 return 'store-editor.html?'+params;
}
const api={loadAppStores,appStoreById,physicalCity,storeEditorForStore,groceryModeForStore,groceryEntranceForStore,restoreEditor,STORE_TYPES,storeTypeMatches,clone,get,set,enforceLocks,preserveLocks,preset,GROUPS,normalizeLocation,historyPush,displayFor,duplicateKey,duplicates,renderPlan};if(typeof module!=='undefined'&&module.exports)module.exports=api;G.StudioWorkspaceCore=api;
})(typeof window==='undefined'?globalThis:window);
