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
const api={PUBLIX,TARGET,publixDoors,mediaPath,validBox,panelsFor};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(!global.document)return;
const $=id=>document.getElementById(id),conf=global.StudioTransferConfig;
const args=()=>new URLSearchParams(location.search);
const id=(args().get('store')||'').toLowerCase();
const media=(path,folder)=>mediaPath(path,conf.url,folder);
let doors=[],panels=[],currentDoor,activeSku,controller,store,initialLoaded=false,revision=0;
const formatPrice=value=>value==null||!Number.isFinite(Number(value))?'Price unavailable':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(value));
async function read(table,params,signal){
 const rows=[];
 for(let offset=0;;offset+=500){
  const query=new URLSearchParams({...params,limit:'500',offset:String(offset)});
  const response=await fetch(conf.url+'/rest/v1/'+table+'?'+query,{headers:{apikey:conf.key,Authorization:'Bearer '+conf.key},signal});
  if(!response.ok)throw Error('Could not load the published '+table.replaceAll('_',' ')+' records.');
  const batch=await response.json();
  rows.push(...batch);if(batch.length<500)return rows;
 }
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
function navigate(door,inside=false,page=0,replace=false){
 const here=new URL(location.href);here.searchParams.set('door',door.label);
 if(inside){here.searchParams.set('view','display');here.searchParams.set('panel',String(page+1));}
 else{here.searchParams.delete('view');here.searchParams.delete('panel');}
 history[replace?'replaceState':'pushState'](null,'',here);route();
}
function resetScene(){
 $('picture').hidden=true;$('pagination').hidden=true;$('spots').replaceChildren();$('productList').replaceChildren();
 $('status').textContent='';$('retry').hidden=true;
 if($('sku').open)$('sku').close();
}
function drawEntrance(door){
 $('entrances').hidden=false;$('display').hidden=true;$('departments').value=door.label;
 const art=media(door.art,id===TARGET?'target-entrances':'');
 const img=$('doorPhoto');img.onload=null;img.onerror=null;
 if(art){img.onload=()=>{if(currentDoor===door)img.hidden=false;};img.onerror=()=>{img.hidden=true;};img.hidden=true;img.src=art;}else{img.hidden=true;img.removeAttribute('src');}
 $('doorName').textContent=door.label;$('doorImage').setAttribute('aria-label','Enter '+door.label);$('enter').textContent='Enter '+door.label;
}
async function loadPanels(door,signal){
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
 $('sizeEditor').hidden=!(panel.layered&&product.photo);
 if(!$('sizeEditor').hidden){const saved=appliedScales.get(product.id);$('scale').value=String(saved?.scale||1);$('scale').disabled=!saved;$('saveScale').disabled=true;$('scaleStatus').textContent=saved?'':'The saved size could not be loaded. Reopen this display to retry.';$('sizePhoto').src=product.photo;previewScale(product.id,Number($('scale').value));}
 $('flagNote').value='';$('flagStatus').textContent='';$('flag').disabled=false;$('sku').showModal();
}
function drawPanel(index){
 const panel=panels[index];$('status').textContent='';$('retry').hidden=true;
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
 const request=++revision;controller?.abort();controller=new AbortController();const signal=controller.signal;
 resetScene();
 try{
  if(id!==PUBLIX&&id!==TARGET)throw Error('This link does not identify a supported grocery store.');
  if(!initialLoaded){
   const [stores,found]=await Promise.all([read('stores',{id:'eq.'+id,select:'id,name,address,menu_type,category'},signal),id===PUBLIX?Promise.resolve(publixDoors()):targetDoors(signal)]);
   if(signal.aborted)return;
   store=stores.find(s=>s.id===id&&(s.menu_type==='grocery'||(id===TARGET&&s.menu_type==='retail'&&s.category==='Grocery')));if(!store)throw Error('This grocery store is unavailable.');
   doors=found;if(!doors.length)throw Error('No published doors are available for this store.');
   $('storeName').textContent=store.name;$('address').textContent=store.address||'';
   const select=$('departments');select.replaceChildren();
   for(const group of [...new Set(doors.map(d=>d.kind))]){const opt=document.createElement('optgroup');opt.label=group;for(const door of doors.filter(d=>d.kind===group)){const o=document.createElement('option');o.value=door.label;o.textContent=door.label;opt.append(o);}select.append(opt);}initialLoaded=true;
  }
  const q=args(),requested=q.get('door');
  currentDoor=requested?doors.find(d=>d.label===requested):doors[0];
  if(!currentDoor)throw Error('This department is unavailable for '+store.name+'.');
  if(q.get('view')!=='display'||currentDoor.kind==='Aisles'){drawEntrance(currentDoor);return;}
  $('entrances').hidden=true;$('display').hidden=false;$('sectionName').textContent=currentDoor.label;$('status').textContent='Loading shopping displays…';
  const key=currentDoor.label;
  if(!panelCache.has(key)){const collection=await loadPanels(currentDoor,signal);if(signal.aborted||request!==revision)return;panelCache.set(key,collection);}
  panels=panelCache.get(key);if(!panels.length){$('status').textContent='No published product display is available for this department.';return;}
  const wanted=Number(q.get('panel'));const page=Number.isSafeInteger(wanted)&&wanted>0?Math.min(wanted-1,panels.length-1):0;
  try{await loadScales(panels[page],signal);}catch(error){if(signal.aborted)return;for(const item of panels[page].spots)appliedScales.delete(item.id);}
  if(signal.aborted||request!==revision)return;drawPanel(page);
  $('prevPage').onclick=()=>navigate(currentDoor,true,page-1);$('nextPage').onclick=()=>navigate(currentDoor,true,page+1);
 }catch(error){if(error.name==='AbortError'||request!==revision)return;$('status').textContent=error.message;$('retry').hidden=false;}
}
function enter(){
 if(!currentDoor)return;
 if(currentDoor.kind==='Aisles'){location.assign('grocery-aisle-editor.html?'+new URLSearchParams({store:id,aisle:currentDoor.label}));return;}
 navigate(currentDoor,true);
}
$('departments').onchange=e=>{const item=doors.find(d=>d.label===e.target.value);if(item)navigate(item);};
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
 try{const row=await global.StudioJobs.request('/rest/v1/rpc/studio_flag_grocery_product',{method:'POST',body:{p_store_id:id,p_product_id:product.id,p_aisle:selection.door.kind==='Produce'?'Produce':selection.door.label,p_version:null,p_page_key:selection.door.label+' / '+(selection.index+1),p_note:$('flagNote').value.trim()}});
 if(activeSku===selection)$('flagStatus').textContent=row?.id?'Flag saved for '+product.name+'.':'The flag was submitted.';
 }catch(error){if(activeSku===selection){$('flagStatus').textContent=error.message;btn.disabled=false;}}
};
global.addEventListener('popstate',route);route();
})(typeof window!=='undefined'?window:globalThis);
