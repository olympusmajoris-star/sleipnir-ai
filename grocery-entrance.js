/* Published store doors and shopping displays selected by the native grocery navigator. */
(function (global) {
'use strict';
const PUBLIX='189581c9-d728-4e5d-9e02-ae4de19a15af';
const TARGET='35ef70d0-3d20-4599-96a3-648ee3c7c340';
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const aisles=['Snacks','Beverages','Breakfast','Canned Goods & Soups','Dry Goods & Pasta','Condiments & Sauces','Personal Care','Health Care','Household','Baby','Pet Care','Bread & Rolls'];
const produce=[
 ['Fresh Fruits','produce-entrances/fresh-fruits.png','loose-fruit'],['Bagged Fruits','produce-entrances/bagged-fruits.png','bag-fruit'],
 ['Packaged Fruits','produce-packaged/pp-entrance-fruit.png','pkg-fruit'],['Fresh Veggies','produce-entrances/fresh-veggies.png','veg-bins'],
 ['Bagged Veggies','produce-entrances/bagged-veggies.png','bag-veg'],['Prepared Produce','produce-packaged/pp-entrance-veg.png','pkg-veg']
];
const stations=[
 ['Deli','stations-0927/door_deli.png'],['Bakery','stations-0927/door_bakery.png'],['Meat & Poultry','stations-0927/door_meat.png'],
 ['Seafood','stations-0927/door_seafood.png'],['Dairy & Eggs','produce-entrances/dairy-eggs.png'],['Frozen Foods','produce-entrances/frozen-foods.png'],
 ['Freezer Bins','produce-entrances/freezer-bins.png'],['Beer & Wine','produce-entrances/beer-wine.png'],['Floral','stations-0927/door_floral.png']
];
function publixDoors(){
 return [...produce.map(([label,art,zone])=>({label,art,zone,kind:'Produce'})),
 ...stations.map(([label,art])=>({label,art,kind:'Departments'})),
 ...aisles.map(label=>({label,art:'grocery stations/grocery-aisle-entrance-phone-v3.png',kind:'Aisles'}))];
}
function mediaPath(value, base, requiredFolder=''){
 if(typeof value!=='string'||!value.trim())return '';
 const prefix=base+'/storage/v1/object/public/menu-images/';
 let path=value.trim();
 try{if(path.startsWith(prefix))path=path.slice(prefix.length);
  if(/^(?:[a-z][a-z0-9+.-]*:|\/)|[?#\\]/i.test(path))return '';
  const segments=path.split('/').map(decodeURIComponent);
  if(segments.some(s=>!s||s==='.'||s==='..'||/[\/\\?#]/.test(s))||!/[.](?:png|jpe?g|webp|avif)$/i.test(segments.at(-1)))return '';
  if(requiredFolder&&segments[0]!==requiredFolder)return '';
  return prefix+segments.map(encodeURIComponent).join('/');
 }catch{return '';}
}
function validBox(box){
 return Array.isArray(box)&&box.length===4&&box.every(n=>Number.isFinite(n)&&n>=0&&n<=1)&&box[0]<box[2]&&box[1]<box[3];
}
function rect(row,prefix){return [row[prefix+'x0'],row[prefix+'y0'],row[prefix+'x1'],row[prefix+'y1']];}
function panelsFor(rows,products,storeId,media){
 const byId=new Map(products.filter(p=>p.store_id===storeId).map(p=>[p.id,p]));
 const panels=new Map();
 for(const r of rows){
  const p=byId.get(r.product_id),url=media(r.image_path);
  if(!p||!url)continue;
  const boxes=[rect(r,'z'),rect(r,'t'),...(Array.isArray(r.tags)?r.tags:[])].filter(validBox);
  if(!boxes.length)continue;
  let panel=panels.get(url);
  if(!panel){panel={url,label:r.station||'',spots:[]};panels.set(url,panel);}
  const spot={id:p.id,name:p.name,price:p.price,boxes};
  if(r.zone&&validBox(rect(r,'t'))){spot.priceBox=rect(r,'t');spot.produceTag=['pkg-fruit','pkg-veg','wall'].includes(r.zone)?'chip':'card';if(r.zone==='wall')spot.nameBox=spot.priceBox;}
  panel.spots.push(spot);
 }
 return [...panels.values()];
}
function mergeAuthoredDoors(original,records,storeId){
 const doors=original.map(door=>({...door})),byLabel=new Map(doors.map(door=>[door.label,door]));
 for(const row of records){
  if(row.store_id!==storeId||!UUID.test(row.aisle_id||'')||!row.title?.trim()||!Number.isInteger(row.published_revision))continue;
  if(row.source_aisle){
   const current=byLabel.get(row.source_aisle);if(current&&!current.authored)current.authored=row;
  }else if(row.stock_mode==='custom')doors.push({label:row.title,art:'',kind:'Created aisles',authored:row});
 }
 return doors;
}
const doorKey=door=>door.authored&&!door.authored.source_aisle?'studio:'+door.authored.aisle_id:door.label;
function authoredImage(value,base){
 if(typeof value!=='string'||!value.startsWith(base+'/storage/v1/object/public/'))return '';
 try{const u=new URL(value),parts=u.pathname.split('/').slice(5).map(decodeURIComponent);
  return !u.search&&!u.hash&&parts.length>1&&parts.every(s=>s&&s!=='.'&&s!=='..'&&!/[\\/?#]/.test(s))&&/\.(?:png|jpe?g|webp|avif)$/i.test(parts.at(-1))?value:'';
 }catch{return '';}
}
const api={PUBLIX,TARGET,publixDoors,mediaPath,validBox,panelsFor,calibratedSpot,mergeAuthoredDoors,doorKey,authoredImage};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
global.GroceryDoorAssets={publixDoors,mediaPath};
if(!global.document?.getElementById('doorProducts'))return;
const $=id=>document.getElementById(id),conf=global.StudioTransferConfig;
const args=()=>new URLSearchParams(location.search);
const id=(args().get('store')||'').toLowerCase();
const media=(path,folder)=>mediaPath(path,conf.url,folder);
let doors=[],panels=[],currentDoor,activeSku,controller,store,mode,initialLoaded=false,revision=0,dgShelfMount=null;
const formatPrice=value=>value==null||!Number.isFinite(Number(value))?'Price unavailable':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(value));
async function read(table,params,signal){
 const rows=[],maximum=params.limit?Math.max(1,Number(params.limit)):Infinity;
 for(let offset=0;offset<maximum;offset+=500){
  const limit=Math.min(500,maximum-offset),query=new URLSearchParams({...params,limit:String(limit),offset:String(offset)});
  const response=await fetch(conf.url+'/rest/v1/'+table+'?'+query,{headers:{apikey:conf.key,Authorization:'Bearer '+conf.key},signal});
  if(!response.ok)throw Error('Could not load the published '+table.replaceAll('_',' ')+' records.');
  const batch=await response.json();
  rows.push(...batch);if(batch.length<limit)return rows;
 }
 return rows;
}
async function ownedProducts(rows,signal){
 const ids=[...new Set(rows.map(r=>r.product_id).filter(x=>typeof x==='string'&&UUID.test(x)))],batches=[];
 for(let i=0;i<ids.length;i+=65){batches.push(read('products',{select:'id,store_id,name,price',store_id:'eq.'+id,id:'in.('+ids.slice(i,i+65).join(',')+')'},signal));}
 return (await Promise.all(batches)).flat();
}
async function targetDoors(signal){
 const [entrances,categories]=await Promise.allSettled([read('store_entrances',{select:'label,image_path,sort',store_id:'eq.'+TARGET,is_active:'eq.true',order:'sort,label'},signal),
  global.StudioJobs.request('/rest/v1/rpc/target_catalog_categories',{auth:false,method:'POST',body:{}})]);
 if(entrances.status==='rejected'&&categories.status==='rejected')throw Error('The Target entrance directory is unavailable.');
 const first=entrances.status==='fulfilled'?entrances.value:[],counts=categories.status==='fulfilled'?new Set(categories.value.filter(r=>r.product_count>0).map(r=>r.category)):null;
 const result=new Map();
 for(const r of first){if((!counts||counts.has(r.label))&&media(r.image_path,'target-entrances')&&!result.has(r.label))result.set(r.label,{label:r.label,art:r.image_path,kind:'Aisles'});}
 for(const label of counts||[]){if(!result.has(label))result.set(label,{label,art:'',kind:'Aisles'});}
 return [...result.values()];
}
async function doorsForStore(row,signal){
 if(mode==='publix')return publixDoors();
 if(mode==='target')return targetDoors(signal);
 const registered=await read('store_entrances',{select:'store_id,label,image_path,sort',store_id:'eq.'+row.id,is_active:'eq.true',order:'sort,label'},signal);
 if(mode==='published'||registered.length){
  const doors=new Map();
  for(const r of registered){if(r.store_id===row.id&&r.label?.trim()&&media(r.image_path)&&!doors.has(r.label))doors.set(r.label,{label:r.label,art:r.image_path,kind:'Published aisles'});}
  return [...doors.values()];
 }
 const [categories,sort]=await Promise.all([global.StudioJobs.request('/rest/v1/rpc/studio_product_categories',{auth:false,method:'POST',body:{p_store_id:row.id}}),
   read('store_categories',{select:'category,sort_order',store_id:'eq.'+row.id,order:'sort_order,category'},signal)]);
 const countByLabel=new Map(categories.filter(c=>typeof c.category==='string'&&c.category.trim()&&Number(c.product_count)>0).map(c=>[c.category,Number(c.product_count)]));
 const priority=new Map(sort.map((r,i)=>[r.category,i]));
 return [...countByLabel].sort(([a],[b])=>(priority.get(a)??Infinity)-(priority.get(b)??Infinity)||a.localeCompare(b)).map(([label,count])=>({label,art:'',count,kind:'Aisles',preview:true}));
}
function catalogPhoto(value){
 const internal=media(value);if(internal)return internal;
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!/\.svg$/i.test(url.pathname)?url.href:'';}catch{return '';}
}
const productPreviewCache=new Map();
async function drawProductPreview(door,signal){
 const host=$('doorProducts');host.replaceChildren();host.hidden=true;
 if(!door.preview)return;
 if(!productPreviewCache.has(door.label)){
  const rows=await read('products',{select:'id,store_id,name,price,image_url,image_url_orig',store_id:'eq.'+id,category:'eq.'+door.label,order:'name,id',limit:100},signal);
  if(signal.aborted)return;
  const products=rows.filter(r=>r.store_id===id&&r.price!=null&&Number.isFinite(Number(r.price)))
   .map(r=>({...r,photo:catalogPhoto(r.image_url)||catalogPhoto(r.image_url_orig)})).filter(r=>r.photo).slice(0,6);
  productPreviewCache.set(door.label,products);
 }
 if(signal.aborted||currentDoor!==door)return;
 for(const product of productPreviewCache.get(door.label)){
  const face=document.createElement('span');face.className='category-product';
  const pic=document.createElement('img');pic.alt=product.name;pic.referrerPolicy='no-referrer';pic.src=product.photo;
  pic.onerror=()=>{pic.hidden=true;};const price=document.createElement('small');price.textContent=formatPrice(product.price);
  face.append(pic,price);host.append(face);
 }
 host.hidden=!host.childElementCount;
}
function calibratedSpot(slot,layout,anchors){
 const dimensions=/^(2|3)x3$/.exec(layout);
 if(!dimensions)return [];
 const cols=Number(dimensions[1]),index=Number(slot.slot)-1;
 if(!Number.isInteger(index)||index<0||index>=3*cols)return [];
 const tag=anchors.get(slot.slot);
 if(!tag)return [];
 const x=Number(tag.tag_x),y=Number(tag.tag_y),w=Number(tag.tag_w),h=Number(tag.tag_h);
 const ticket=[x,y,x+w,y+h];if(!validBox(ticket))return [];
 const row=Math.floor(index/cols),col=index%cols;
 const previous=[...anchors.values()].filter(a=>Math.floor((Number(a.slot)-1)/cols)===row-1).map(a=>Number(a.tag_y)+Number(a.tag_h)).filter(Number.isFinite);
 const top=row?(previous.length?Math.max(...previous):row/3):0;
 const box=[col/cols,top,(col+1)/cols,y+h];
 return validBox(box)?[box,ticket]:[ticket];
}
async function publishedPanels(door,signal){
 const scope={store_id:'eq.'+id,aisle:'eq.'+door.label};
 const [renders,slots,coords]=await Promise.all([
  read('aisle_renders',{...scope,select:'store_id,aisle,render_no,image_path,width,height,layout,publish_status',publish_status:'eq.ready',order:'render_no'},signal),
  read('aisle_slots_v',{...scope,select:'store_id,aisle,render_no,slot,product_id,name,shelf_group,price',order:'render_no,slot'},signal),
  read('aisle_slots',{...scope,select:'store_id,aisle,render_no,slot,product_id,tag_x,tag_y,tag_w,tag_h',order:'render_no,slot'},signal)
 ]);
 const owned=new Map((await ownedProducts(slots,signal)).map(p=>[p.id,p]));
 const exact=r=>r.store_id===id&&r.aisle===door.label;
 const result=[];
 for(const r of renders.filter(exact)){
  const url=media(r.image_path);if(!url||!(r.width>0&&r.height>0))continue;
  const anchors=new Map(coords.filter(a=>exact(a)&&a.render_no===r.render_no).map(a=>[a.slot,a]));
  const spots=[];
  for(const s of slots.filter(s=>exact(s)&&s.render_no===r.render_no)){
   const product=owned.get(s.product_id),anchor=anchors.get(s.slot);if(!product||anchor?.product_id!==s.product_id)continue;
   const boxes=calibratedSpot(s,r.layout,anchors);if(!boxes.length)continue;
   spots.push({id:product.id,name:product.name,price:product.price,boxes});
  }
  result.push({url,label:door.label,renderNo:r.render_no,spots});
 }
 return result;
}
function navigate(door,inside=false,page=0,replace=false){
 const here=new URL(location.href);here.searchParams.set('door',doorKey(door));
 if(inside){here.searchParams.set('view','display');here.searchParams.set('panel',String(page+1));}
 else{here.searchParams.delete('view');here.searchParams.delete('panel');}
 history[replace?'replaceState':'pushState'](null,'',here);route();
}
function resetScene(){
 $('picture').hidden=true;$('pagination').hidden=true;$('spots').replaceChildren();$('productList').replaceChildren();
 $('status').textContent='';$('retry').hidden=true;$('storeRepair').hidden=true;
 if($('sku').open)$('sku').close();
}
function destroyDgShelf(){
 const mounted=dgShelfMount;dgShelfMount=null;
 mounted?.destroy();
 const host=$('dgShelfEntrance');host.hidden=true;host.replaceChildren();
}
function drawDgShelf(door,label){
 const host=$('dgShelfEntrance');host.hidden=false;host.setAttribute('aria-label',label+' product shelves');
 if(!global.DollarGeneralShelf?.mount)throw Error('The Dollar General shelf preview could not load. Please try again.');
 const mounted=global.DollarGeneralShelf.mount(host,{store:id,aisle:door.label,mode:'dollar-general',shopping:true});
 dgShelfMount=mounted;
 Promise.resolve(mounted.ready).catch(error=>{
  if(error?.name==='AbortError'||dgShelfMount!==mounted||currentDoor!==door)return;
  $('status').textContent=error?.message||'The aisle products could not load.';$('retry').hidden=false;
 });
}
const entranceGroups=new Map();
async function physicalBoardGroups(source,signal){
 if(!entranceGroups.has(source)){
  const rows=await read('products',{select:'shelf_group',store_id:'eq.'+id,category:'eq.'+(source==='Bread & Rolls'?'Bakery':source),
   shelf_group:source==='Bread & Rolls'?'eq.Bread & Rolls':'not.is.null',order:'shelf_rank.asc,id.asc'},signal);
  if(signal.aborted)return [];
  entranceGroups.set(source,[...new Set(rows.map(r=>String(r.shelf_group||'').trim()).filter(Boolean))]);
 }
 return entranceGroups.get(source);
}
function drawEntrance(door){
 $('entrances').hidden=false;$('display').hidden=true;$('departments').value=doorKey(door);
 const appearance=door.authored?.appearance||{},label=appearance.entrance_title||door.authored?.title||door.label;
 const originalArt=media(door.art,id===TARGET?'target-entrances':'');
 const art=authoredImage(appearance.entrance_url,conf.url)||originalArt;
 const decorated=Boolean(global.GroceryDoorPreview&&door.authored&&(!door.authored.source_aisle||appearance.entrance_url||appearance.entrance_title||appearance.board_title||appearance.board_body));
 const denseShelf=mode==='dollar-general'&&door.preview&&!decorated;
 $('publishedDoor').hidden=!decorated;$('originalDoor').hidden=decorated||denseShelf;
 if(decorated){
  const options={container:$('publishedDoor'),storeId:id,source:door.authored.source_aisle,title:door.authored.title,art:originalArt,appearance,onSelect:enter,shopping:true};
  global.GroceryDoorPreview.render({...options,groups:entranceGroups.get(options.source)||[]});
  if(mode==='publix'&&aisles.includes(options.source)&&!appearance.board_body&&!entranceGroups.has(options.source)){
   const signal=controller.signal;
   physicalBoardGroups(options.source,signal).then(groups=>{if(!signal.aborted&&currentDoor===door)global.GroceryDoorPreview.render({...options,groups});}).catch(()=>{});
  }
 }
 const img=$('doorPhoto');img.onload=null;img.onerror=null;
 if(art){img.onload=()=>{if(currentDoor===door)img.hidden=false;};img.onerror=()=>{img.hidden=true;};img.hidden=true;img.src=art;}else{img.hidden=true;img.removeAttribute('src');}
 $('doorProducts').hidden=true;$('doorProducts').replaceChildren();
 $('doorImage').classList.toggle('catalog-door',Boolean(door.preview));
 $('doorImage').classList.toggle('text-door',!art&&!door.preview);
 $('doorImage').classList.toggle('dg-door',mode==='dollar-general');
 if(door.preview&&!denseShelf&&!decorated)drawProductPreview(door,controller.signal).catch(()=>{});
 $('doorName').textContent=label;$('doorImage').setAttribute('aria-label','Enter '+label);$('enter').textContent='Enter '+label;
 const board=$('doorBoard');board.hidden=!(appearance.board_title||appearance.board_body);
 $('boardName').textContent=appearance.board_title||'';$('boardBody').textContent=appearance.board_body||'';
 board.style.backgroundColor=/^#[a-f0-9]{6}$/i.test(appearance.board_color)?appearance.board_color:'';
 board.style.color=/^#[a-f0-9]{6}$/i.test(appearance.ink_color)?appearance.ink_color:'';
 $('editAisle').href='grocery-aisle-builder.html?'+new URLSearchParams(door.authored?{store:id,aisle:door.authored.aisle_id}:{store:id,source:door.label});
 if(denseShelf)drawDgShelf(door,label);
}
async function loadPanels(door,signal){
 if(door.kind==='Published aisles')return publishedPanels(door,signal);
 if(door.kind==='Produce'){
  const zones=door.zone==='veg-bins'?['veg-bins','wall']:[door.zone];
  const blocks=await Promise.all(zones.map(zone=>read('produce_render_plan',{select:'zone,grid_col,grid_row,image_path,product_id,zx0,zy0,zx1,zy1,tx0,ty0,tx1,ty1',zone:'eq.'+zone,order:'block_order,grid_row,grid_col,item_no'},signal)));
  const rows=blocks.flat(),grid=new Map();
  for(const r of rows.filter(r=>r.zone==='wall')){const shape=grid.get(r.image_path)||{cols:0,rows:0};shape.cols=Math.max(shape.cols,r.grid_col+1);shape.rows=Math.max(shape.rows,r.grid_row+1);grid.set(r.image_path,shape);}
  for(const r of rows.filter(r=>r.zone==='wall')){const shape=grid.get(r.image_path);r.zx0=r.grid_col/shape.cols;r.zx1=(r.grid_col+1)/shape.cols;r.zy0=Math.max(0,r.ty1-1/shape.rows);r.zy1=r.ty1;}
  return panelsFor(rows,await ownedProducts(rows,signal),id,media);
 }
 if(['Dairy & Eggs','Beer & Wine'].includes(door.label))return global.GroceryStationFixtures?global.GroceryStationFixtures.load(door.label,id,{read,media,signal}):[];
 const sections=await read('door_sections',{select:'door,kind,station,ord',door:'eq.'+door.label,order:'ord'},signal);
 const priced={'Frozen Foods':'Publix Frozen Foods Priced 20261120','Frozen Seafood':'Publix Frozen Seafood Priced 20261120','Freezer Bins':'Publix Freezer Bins Priced 20261120'};
 const lists=await Promise.all(sections.map(async section=>{
  if(door.label==='Deli'&&section.kind!=='render'&&global.GroceryStationFixtures?.loadSection){
   return global.GroceryStationFixtures.loadSection(door.label,section,id,{read,media,signal});
  }
  const rows=await read('station_render_v',{select:'station,image_path,image_order,spot_no,product_id,zx0,zy0,zx1,zy1,tags,store_id,product_name,price',store_id:'eq.'+id,station:'eq.'+(priced[section.station]||section.station),order:'image_order,spot_no'},signal);
  const products=rows.filter(r=>r.store_id===id).map(r=>({id:r.product_id,store_id:r.store_id,name:r.product_name,price:r.price}));
  return panelsFor(rows,products,id,media);
 }));
 return lists.flat();
}
const panelCache=new Map(),appliedScales=new Map();
async function loadScales(panel,signal){
 if(!panel.layered)return true;
 const ids=[...new Set(panel.spots.map(p=>p.id).filter(id=>UUID.test(id)))];
 if(!ids.length)return false;
 const rows=await read('studio_grocery_product_scales',{select:'product_id,scale,revision',store_id:'eq.'+id,product_id:'in.('+ids.join(',')+')'},signal);
 if(signal?.aborted)return false;
 for(const key of ids)appliedScales.set(key,{scale:1,revision:0});
 for(const row of rows)if(ids.includes(row.product_id))appliedScales.set(row.product_id,{scale:Number(row.scale),revision:Number(row.revision)});
 return true;
}
function previewScale(sku,scale){
 document.querySelectorAll('.product-layer').forEach(layer=>{if(layer.dataset.product===sku)layer.style.transform='scale('+scale+')';});
 $('sizePhoto').style.transform='scale('+scale+')';$('scaleText').textContent=Math.round(scale*100)+'%';
}
function position(node,box){Object.assign(node.style,{left:box[0]*100+'%',top:box[1]*100+'%',width:(box[2]-box[0])*100+'%',height:(box[3]-box[1])*100+'%'});}
function showSku(product,panel,index){
 activeSku={product,panel,index,door:currentDoor};$('skuName').textContent=product.name;$('skuPrice').textContent=formatPrice(product.price);$('skuContext').textContent=store.name+' · '+currentDoor.label+' · Display '+(index+1);$('skuSource').textContent=panel.layered?'The product photo is a separate layer on this department display.':'This product is part of a published display photograph. A repair flag identifies its exact position for the next render.';
 const selection=activeSku, doorLabel=currentDoor.label;
 $('skuCatalogEdit').replaceChildren(global.StudioProductDetails.button({
   storeId:id,productId:product.id,current:()=>activeSku===selection && $('sku').open,
   surface:panel.layered?'This item uses a separate photo on its display. The catalog supplies the product details and base price.':
     'The selected spot belongs to a published photograph. Edits update its catalog details; changing stock or a printed ticket in this photograph requires a new render.',
   async onSaved(){
     panelCache.delete(doorLabel);
     if(currentDoor?.label!==doorLabel)return;
     if($('sku').open)$('sku').close();
     await route();
   }
 }));
 $('sizeEditor').hidden=!(panel.layered&&product.photo);
 if(!$('sizeEditor').hidden){const saved=appliedScales.get(product.id);$('scale').value=String(saved?.scale||1);$('scale').disabled=!saved;$('saveScale').disabled=true;$('scaleStatus').textContent=saved?'':'The saved size could not be loaded. Reopen this display to retry.';$('sizePhoto').src=product.photo;previewScale(product.id,Number($('scale').value));}
 $('flagNote').value='';$('flagStatus').textContent='';$('flag').disabled=false;$('sku').showModal();
}
function drawPanel(index){
 const panel=panels[index];$('status').textContent='';$('retry').hidden=true;$('storeRepair').hidden=Boolean(panel.spots.length);
 const names=[currentDoor.label];
 if(panel.layered&&panel.station&&!names.includes(panel.station)&&!(panel.label||'').startsWith(panel.station))names.push(panel.station);
 if(panel.label&&!names.includes(panel.label))names.push(panel.label);
 $('sectionName').textContent=names.join(' · ');
 $('prevPage').disabled=index===0;$('nextPage').disabled=index===panels.length-1;
 $('pageInfo').textContent='Display '+(index+1)+' of '+panels.length;
 $('pagination').hidden=false;$('spots').replaceChildren();$('productList').replaceChildren();
 const image=$('scene'),drawRevision=revision;
 $('status').textContent='Loading display photo…';
 image.onload=()=>{if(drawRevision===revision){$('picture').hidden=false;$('status').textContent='';}};
 image.onerror=()=>{if(drawRevision===revision){$('picture').hidden=true;$('status').textContent='This display photograph could not load. Its products are listed below.';$('retry').hidden=false;}};
 image.alt=currentDoor.label+' shopping display '+(index+1);image.src=panel.url;
 if(image.complete&&image.naturalWidth)image.onload();
 for(const heading of panel.headings||[]){if(!validBox(heading.box))continue;const text=document.createElement('span');text.className='menu-heading';text.textContent=heading.label;position(text,heading.box);$('spots').append(text);}
 for(const product of panel.spots){
  if(validBox(product.nameBox)){const tag=document.createElement('span');tag.className='produce-name';tag.textContent=product.name;position(tag,product.nameBox);$('spots').append(tag);}
  if(validBox(product.priceBox)&&product.price!=null){const price=document.createElement('span');price.className='produce-price '+product.produceTag;price.textContent=formatPrice(product.price);const b=product.priceBox;
   const box=product.produceTag==='chip'?[Math.max(b[0],b[2]-.14),Math.max(0,b[1]-.023),b[2],Math.max(.042,b[1]+.019)]:b;position(price,box);$('spots').append(price);}
  if(validBox(product.thumbnailBox)){const backing=document.createElement('span');backing.className='menu-thumbnail';position(backing,product.thumbnailBox);$('spots').append(backing);}
  if(product.photo){
   const faces=Array.isArray(product.facings)?product.facings:[{box:product.photoBox,opacity:1}];
   for(const face of faces){if(!validBox(face.box))continue;const layer=document.createElement('img');layer.className='product-layer';layer.alt='';layer.src=product.photo;layer.dataset.product=product.id;layer.style.transform='scale('+(appliedScales.get(product.id)?.scale||1)+')';layer.style.opacity=String(face.opacity);position(layer,face.box);$('spots').append(layer);}
  }
  if(validBox(product.railBox)){const rail=document.createElement('span');rail.className='front-rail';position(rail,product.railBox);$('spots').append(rail);}
  if(validBox(product.tagBox)){const price=document.createElement('span');price.className='price-layer'+(product.menuRow?' menu-row':'');const name=document.createElement('span'),amount=document.createElement('b');if(product.menuRow&&/^#[a-f0-9]{6}$/i.test(product.textColor||''))price.style.color=product.textColor;name.textContent=product.name;amount.textContent=formatPrice(product.price);price.append(name,amount);position(price,product.tagBox);$('spots').append(price);}
  for(const [i,box] of product.boxes.filter(validBox).entries()){
   const hit=document.createElement('button');hit.className='hit';hit.type='button';hit.title=product.name;hit.setAttribute('aria-label',product.name+(i===0?'':' price ticket'));if(i>0)hit.tabIndex=-1;
   hit.dataset.product=product.id;position(hit,box);hit.onclick=()=>showSku(product,panel,index);$('spots').append(hit);
  }
  const choice=document.createElement('button');choice.textContent=product.name;choice.dataset.product=product.id;choice.onclick=()=>showSku(product,panel,index);$('productList').append(choice);
 }
}
async function route(){
 const request=++revision;controller?.abort();destroyDgShelf();controller=new AbortController();const signal=controller.signal;
 resetScene();
 try{
  if(!UUID.test(id))throw Error('This link does not identify a store.');
  if(!initialLoaded){
   store=await global.StudioWorkspaceCore.appStoreById(id);
   if(signal.aborted)return;
   mode=global.StudioWorkspaceCore.groceryModeForStore(store);
   if(!mode){const route=global.StudioWorkspaceCore.storeEditorForStore(store);if(route){location.replace(route);return;}throw Error('This store is unavailable.');}
   $('storeName').textContent=store.name;$('address').textContent=store.address||'';
   $('repairLink').href='store-repairs.html?'+new URLSearchParams({store:id});
   $('createAisle').href='grocery-aisle-builder.html?'+new URLSearchParams({store:id});$('createAisle').hidden=false;
   const [native,authored]=await Promise.allSettled([doorsForStore(store,signal),read('rpc/studio_grocery_aisles',{p_store_id:id,select:'aisle_id,store_id,title,fixture,published_revision,source_aisle,appearance,stock_mode'},signal)]);
   if(signal.aborted||request!==revision)return;
   if(native.status==='rejected')throw native.reason;
   doors=mergeAuthoredDoors(native.value,authored.status==='fulfilled'?authored.value:[],id);
   $('authoredError').hidden=authored.status==='fulfilled';
   if(!doors.length){$('entrances').hidden=true;$('display').hidden=true;$('status').textContent='This store has no published aisles or catalog products.';$('storeRepair').hidden=false;return;}
   const select=$('departments');select.replaceChildren();
   for(const group of [...new Set(doors.map(d=>d.kind))]){const opt=document.createElement('optgroup');opt.label=group;for(const door of doors.filter(d=>d.kind===group)){const o=document.createElement('option');o.value=doorKey(door);o.textContent=door.authored?.title||door.label;opt.append(o);}select.append(opt);}initialLoaded=true;
  }
  const q=args(),requested=q.get('door');
  currentDoor=requested?doors.find(d=>doorKey(d)===requested):doors[0];
  if(!currentDoor){$('storeRepair').hidden=false;throw Error('This department is unavailable for '+store.name+'.');}
  if(q.get('view')!=='display'||currentDoor.kind==='Aisles'||currentDoor.authored?.stock_mode==='custom'){drawEntrance(currentDoor);return;}
  $('entrances').hidden=true;$('display').hidden=false;$('sectionName').textContent=currentDoor.label;$('status').textContent='Loading shopping displays…';
  const key=currentDoor.label;
  if(!panelCache.has(key)){const collection=await loadPanels(currentDoor,signal);if(signal.aborted||request!==revision)return;panelCache.set(key,collection);}
  panels=panelCache.get(key);if(!panels.length){$('status').textContent='No published product display is available for this department.';$('storeRepair').hidden=false;return;}
  const wanted=Number(q.get('panel'));const page=Number.isSafeInteger(wanted)&&wanted>0?Math.min(wanted-1,panels.length-1):0;
  try{await loadScales(panels[page],signal);}catch(error){if(signal.aborted)return;for(const item of panels[page].spots)appliedScales.delete(item.id);}
  if(signal.aborted||request!==revision)return;drawPanel(page);
  $('prevPage').onclick=()=>navigate(currentDoor,true,page-1);$('nextPage').onclick=()=>navigate(currentDoor,true,page+1);
 }catch(error){if(error.name==='AbortError'||request!==revision)return;$('status').textContent=error.message;$('retry').hidden=false;}
}
function enter(){
 if(!currentDoor)return;
 if(currentDoor.authored?.stock_mode==='custom'){location.assign('grocery-aisle-editor.html?'+new URLSearchParams({store:id,authored:currentDoor.authored.aisle_id}));return;}
 if(currentDoor.kind==='Aisles'){location.assign('grocery-aisle-editor.html?'+new URLSearchParams({store:id,aisle:currentDoor.label}));return;}
 navigate(currentDoor,true);
}
$('retryAuthored').onclick=()=>{initialLoaded=false;route();};
global.StudioSelectionTarget=()=>!store?null:{item:'grocery',page:'StoreEntrancePage',store:id,
  aisle:currentDoor?doorKey(currentDoor):'',part:activeSku?.product?.id||'',label:activeSku?.product?.name||currentDoor?.label||store.name};
$('departments').onchange=e=>{const item=doors.find(d=>doorKey(d)===e.target.value);if(item)navigate(item);};
function turnDoor(delta){const count=doors.length;if(count)navigate(doors[(doors.indexOf(currentDoor)+delta+count)%count]);}
$('previousDoor').onclick=()=>turnDoor(-1);$('nextDoor').onclick=()=>turnDoor(1);$('enter').onclick=enter;$('doorImage').onclick=enter;
$('backDoors').onclick=()=>navigate(currentDoor);$('retry').onclick=()=>{panelCache.delete(currentDoor?.label);route();};
$('sku').addEventListener('close',()=>{if(activeSku){const item=activeSku.product;previewScale(item.id,appliedScales.get(item.id)?.scale||1);activeSku=null;}});
$('scale').oninput=()=>{if(!activeSku)return;const v=Number($('scale').value),saved=appliedScales.get(activeSku.product.id);previewScale(activeSku.product.id,v);$('saveScale').disabled=!saved||v===saved.scale;};
$('saveScale').onclick=async()=>{
 const selection=activeSku;if(!selection||!selection.panel.layered)return;
 const key=selection.product.id,old=appliedScales.get(key),next=Number($('scale').value);if(!old||next===old.scale)return;
 $('saveScale').disabled=true;$('scale').disabled=true;$('scaleStatus').textContent='Saving size…';
 try{const row=await global.StudioJobs.request('/rest/v1/rpc/studio_save_grocery_product_scale',{method:'POST',body:{p_store_id:id,p_product_id:key,p_scale:next,p_expected_revision:old.revision}});
  if(row?.store_id!==id||row?.product_id!==key||!Number.isSafeInteger(Number(row.revision)))throw Error('Could not verify the saved size.');
  appliedScales.set(key,{scale:Number(row.scale),revision:Number(row.revision)});
  if(activeSku===selection){previewScale(key,Number(row.scale));$('scaleStatus').textContent='Saved.';}
 }catch(error){if(activeSku===selection){$('scaleStatus').textContent=error.message;try{await loadScales(selection.panel);const current=appliedScales.get(key);if(current&&activeSku===selection){$('scale').value=String(current.scale);previewScale(key,current.scale);}}catch{}}}
 finally{if(activeSku===selection)$('scale').disabled=false;}
};
$('flag').onclick=async()=>{
 if(!activeSku||!$('sku').open)return;
 const selection=activeSku,product=selection.product,btn=$('flag');btn.disabled=true;$('flagStatus').textContent='Saving repair flag…';
 try{const row=await global.StudioJobs.request('/rest/v1/rpc/studio_flag_grocery_product',{method:'POST',body:{p_store_id:id,p_product_id:product.id,p_aisle:selection.door.kind==='Produce'?'Produce':selection.door.label,p_version:null,p_page_key:selection.door.label+' / '+(selection.panel.renderNo??(selection.index+1)),p_note:$('flagNote').value.trim()}});
 if(activeSku===selection)$('flagStatus').textContent=row?.id?'Flag saved for '+product.name+'.':'The flag was submitted.';
 }catch(error){if(activeSku===selection){$('flagStatus').textContent=error.message;btn.disabled=false;}}
};
global.addEventListener('popstate',route);route();
})(typeof window!=='undefined'?window:globalThis);
