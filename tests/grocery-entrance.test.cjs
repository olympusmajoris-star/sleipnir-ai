const test = require('node:test');
const assert = require('node:assert/strict');
const {loadAppStores,appStoreById,physicalCity,groceryEntranceForStore,storeEditorForStore,groceryModeForStore} = require('../workspace-core.js');
const {PUBLIX,TARGET,publixDoors,mediaPath,validBox,panelsFor,calibratedSpot} = require('../grocery-entrance.js');
const source='https://afnihsdxtisneuyehatw.supabase.co';
const media=path=>mediaPath(path,source);
const aldi='e5a01340-424a-4a41-b0e6-99cb9e944733',walmart='03dbd8fa-ed64-4236-85be-206c952da024',panda='3eb517cb-1328-4e94-a73e-68ed48398c7d';
const dg='fea775c8-8612-4f2e-bfc6-70d8e6ace6be',unlisted='9c969076-b1bf-427b-9175-10662406d703',empty='aaaaaaaa-0000-4000-8000-000000000001';
const street='8d687884-4576-4fb2-a9bb-03df08a2c5bc',phantom='0a7a3411-3c6a-4a43-9b87-e48b22b05cf3';
const roster=[PUBLIX,TARGET,aldi,walmart,panda,dg,empty,street,phantom];
const catalog=roster.map(id=>({id,is_live:true,name:'Store',address:'100 Garden St, Palm Coast, FL 32137',menu_type:'retail',category:'Grocery',product_count:10,app_surface:'ordinary',native_renderer:null,valhalla_menu_count:0}));
Object.assign(catalog.find(s=>s.id===panda),{address:'5234 E Highway 100',menu_type:'fast_casual',category:'Fast Casual'});
Object.assign(catalog.find(s=>s.id===dg),{name:'Dollar General Market (Bunnell)',address:'4530 N State St, Bunnell, FL 32110'});
Object.assign(catalog.find(s=>s.id===empty),{product_count:0});
Object.assign(catalog.find(s=>s.id===street),{is_valhalla:false,menu_type:'sit_down',category:'Pizza',product_count:0,app_surface:'valhalla',native_renderer:'ValhallaStreet',valhalla_menu_count:2});
Object.assign(catalog.find(s=>s.id===phantom),{is_valhalla:true,menu_type:'sit_down',category:'Pizza / Italian',app_surface:'valhalla',native_renderer:'ValhallaStreet',valhalla_menu_count:0});
catalog.push({id:unlisted,is_live:true,name:'Unselected local store',menu_type:'retail',address:'222 S, Palm Coast, FL 32164',product_count:10});
test.before(async()=>{
 const fetch=global.fetch,conf=global.StudioTransferConfig;
 global.StudioTransferConfig={url:source,key:'public-test'};
 global.fetch=async(url,opts)=>{
  assert.equal(opts.cache,'no-store');
  if(String(url).endsWith('store-scope.json'))return {ok:true,json:async()=>({stores:roster.map(id=>({id}))})};
  const u=new URL(url);assert.ok(u.pathname.endsWith('/rpc/studio_palm_coast_editor_locations'));
  assert.match(u.searchParams.get('p_store_ids'),/^\{[a-f0-9,-]+\}$/);
  return {ok:true,json:async()=>catalog};
 };
 try{await loadAppStores({force:true});}finally{global.fetch=fetch;global.StudioTransferConfig=conf;}
});
test('store identity selects the correct entrance',()=>{
 for(const store of [PUBLIX,TARGET])assert.equal(groceryEntranceForStore(store),'grocery-entrance.html?store='+store);
 for(const other of ['',null,'example'])assert.equal(groceryEntranceForStore(other),'');
 const doors=publixDoors();assert.equal(doors[0].label,'Fresh Fruits');assert.equal(doors.length,27);
 assert.equal(doors.filter(d=>d.kind==='Aisles').length,12);assert.equal(new Set(doors.map(d=>d.label)).size,27);
});
test('enforces genuine public bucket paths and Target entrance folder',()=>{
 const relative='produce-bins/loosefruit-1.png';assert.equal(media(media(relative)),media(relative));
 assert.ok(media('grocery stations/entrance.png').endsWith('grocery%20stations/entrance.png'));
 for(const path of ['https://sleipnir.local/virtual/1.png','/fruit.png','other/../secret.png','test/%2f/fruit.png','image.svg','x#code.png'])assert.equal(media(path),'');
 assert.equal(mediaPath(relative,source,'target-entrances'),'');
});
test('unscoped produce rows join against the exact store before exposing hotspots',()=>{
 const row={product_id:'gala',image_path:'produce-bins/loosefruit-1.png',zx0:.03,zy0:.2,zx1:.2,zy1:.66,tx0:.1,ty0:.12,tx1:.2,ty1:.2};
 const products=[{id:'gala',store_id:PUBLIX,name:'Gala Apple',price:1.67},{id:'other',store_id:TARGET,name:'Other store apple',price:7}];
 const groups=panelsFor([row,{...row,product_id:'other'}],products,PUBLIX,media);
 assert.equal(groups.length,1);assert.equal(groups[0].spots.length,1);assert.deepEqual(groups[0].spots[0],{id:'gala',name:'Gala Apple',price:1.67,boxes:[[.03,.2,.2,.66],[.1,.12,.2,.2]]});
 assert.equal(validBox([-1,0,1,1]),false);assert.equal(validBox([0,0,0,1]),false);
});
test('produce prices occupy their stored card and packaged-product anchors',()=>{
 const box={product_id:'a',image_path:'produce-bins/loosefruit-1.png',zx0:.05,zy0:.2,zx1:.3,zy1:.55,tx0:.1,ty0:.1,tx1:.25,ty1:.18};
 const row=[{id:'a',store_id:PUBLIX,name:'Apple',price:1.67}];
 for(const [zone,style] of [['loose-fruit','card'],['pkg-fruit','chip'],['wall','chip']]){
  const [spot]=panelsFor([{...box,zone}],row,PUBLIX,media)[0].spots;
  assert.deepEqual(spot.priceBox,[.1,.1,.25,.18]);assert.equal(spot.produceTag,style);
  assert.equal(Boolean(spot.nameBox),zone==='wall');
 }
});

test('only curated, active, stocked Palm Coast stores receive the new editors',async()=>{
 assert.equal((await loadAppStores()).length,6);
 for(const [id,mode] of [[PUBLIX,'publix'],[TARGET,'target'],[aldi,'published'],[walmart,'grocery'],[panda,'']])assert.equal(groceryModeForStore({id}),mode);
 assert.equal(storeEditorForStore({id:panda,menu_type:'grocery',category:'Grocery'}),'store-editor.html?store='+panda+'&type=fast_casual&native=1');
 for(const id of [unlisted,empty,dg,phantom]){
  assert.equal(await appStoreById(id),null);assert.equal(storeEditorForStore({id,menu_type:'grocery',is_live:true,address:'1 X, Palm Coast, FL 32137'}),'');
 }
 const menu=await appStoreById(street);
 assert.equal(menu.native_renderer,'ValhallaStreet');assert.equal(menu.valhalla_menu_count,2);
 assert.ok(storeEditorForStore(menu).endsWith('renderer=ValhallaStreet'));assert.equal(groceryModeForStore(menu),'');
 assert.equal(physicalCity({id:unlisted,address:'5234 E Highway 100'}),'');
 assert.equal(physicalCity({id:panda,address:'999 A, Port Orange, FL 32127'}),'Port Orange');
});
test('calibrated 3-column ALDI images include the ninth item and its exact price ticket',()=>{
 const anchors=new Map([[6,{slot:6,tag_x:.73,tag_y:.58,tag_w:.17,tag_h:.03}],[9,{slot:9,tag_x:.73,tag_y:.87,tag_w:.17,tag_h:.03}]]);
 const result=calibratedSpot({slot:9},'3x3',anchors);
 assert.equal(result.length,2);assert.ok(result.every(validBox));assert.equal(result[0][0],2/3);assert.equal(result[1][0],.73);
 assert.deepEqual(calibratedSpot({slot:9},'2x3',anchors),[]);
});
test('a cold direct link requests only the approved location and ignores foreign response rows',async()=>{
 const {readFileSync}=require('node:fs'),vm=require('node:vm');
 const queries=[];
 const browser={URL,URLSearchParams,StudioTransferConfig:{url:source,key:'public-test'}};
 browser.fetch=async(url,options)=>{
  assert.equal(options.cache,'no-store');
  if(String(url).endsWith('store-scope.json'))return {ok:true,json:async()=>({stores:[{id:PUBLIX},{id:empty}]})};
  const query=new URL(url);queries.push(query.searchParams.get('p_store_ids'));
  assert.equal(query.pathname,'/rest/v1/rpc/studio_palm_coast_editor_locations');
  return {ok:true,json:async()=>catalog.filter(s=>s.id===PUBLIX||s.id===TARGET)};
 };
 vm.runInNewContext(readFileSync(require.resolve('../workspace-core.js'),'utf8'),browser);
 const api=browser.StudioWorkspaceCore;
 assert.equal(await api.appStoreById(unlisted),null);assert.deepEqual(queries,[]);
 const [first,second]=await Promise.all([api.appStoreById(PUBLIX),api.appStoreById(PUBLIX)]);
 assert.equal(first.id,PUBLIX);assert.equal(first,second);
 assert.equal(api.storeEditorForStore({id:TARGET}),'');assert.deepEqual(queries,['{'+PUBLIX+'}']);
 assert.equal(await api.appStoreById(empty),null);assert.equal(await api.appStoreById(empty),null);
 assert.deepEqual(queries,['{'+PUBLIX+'}','{'+empty+'}']);
});
test('the full directory bounds candidate batches and retries a timed-out batch in two halves',async()=>{
 const {readFileSync}=require('node:fs'),vm=require('node:vm');
 const ids=Array.from({length:70},(_,i)=>'bbbbbbbb-0000-4000-8000-'+String(i).padStart(12,'0')),calls=[];
 const browser={URL,URLSearchParams,StudioTransferConfig:{url:source,key:'public-test'}};
 browser.fetch=async url=>{
  if(String(url).endsWith('store-scope.json'))return {ok:true,json:async()=>({stores:ids.map(id=>({id}))})};
  const batch=new URL(url).searchParams.get('p_store_ids').slice(1,-1).split(',');calls.push(batch);
  if(batch.length===32&&batch.includes(ids[0]))return {ok:false,status:500,json:async()=>({code:'57014'})};
  return {ok:true,json:async()=>batch.map(id=>({...catalog[0],id}))};
 };
 vm.runInNewContext(readFileSync(require.resolve('../workspace-core.js'),'utf8'),browser);
 const managed=await browser.StudioWorkspaceCore.loadAppStores();
 assert.deepEqual(Array.from(managed,row=>row.id),ids);
 assert.deepEqual(calls.map(c=>c.length).sort((a,b)=>a-b),[6,16,16,32,32]);
});
test('published aisle appearances update the exact original door and authored UUIDs survive duplicate display names',()=>{
 const {mergeAuthoredDoors,doorKey,authoredImage}=require('../grocery-entrance.js');
 const original=[{label:'Produce',art:'produce.png',kind:'Aisles'}];
 const authored={aisle_id:street,store_id:PUBLIX,title:'Market produce',published_revision:2,source_aisle:'Produce',stock_mode:'native',appearance:{board_title:'Fresh today'}};
 const extra={...authored,aisle_id:empty,title:'Produce',source_aisle:null,stock_mode:'custom'};
 const doors=mergeAuthoredDoors(original,[authored,extra,{...extra,store_id:TARGET}],PUBLIX);
 assert.equal(doors.length,2);assert.equal(doors[0].art,'produce.png');assert.equal(doors[0].authored.appearance.board_title,'Fresh today');
 assert.deepEqual(doors.map(doorKey),['Produce','studio:'+empty]);assert.equal(original[0].authored,undefined);
 assert.ok(authoredImage(source+'/storage/v1/object/public/menu-images/entrance/review.png',source));
 assert.equal(authoredImage('https://example.com/entrance.png',source),'');
 assert.equal(authoredImage(source+'/storage/v1/object/public/menu-images/bad%2Fpath.png',source),'');
});
