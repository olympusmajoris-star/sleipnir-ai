const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {parseHTML}=require('linkedom');
const root=path.join(__dirname,'..'),sid='189581c9-d728-4e5d-9e02-ae4de19a15af';
const catalog=[{id:'one',store_id:sid,name:'Pretzels',price:3.2,category:'Snacks',image_url:'https://assets.test/pretzels.png'},{id:'two',store_id:sid,name:'Chips',price:4.5,category:'Snacks',image_url:'https://assets.test/chips.png'},{id:'three',store_id:sid,name:'Water',price:2,category:'Beverages',image_url:'https://assets.test/water.png'}];
async function editor(type='grocery',saved=[],sources={},store=sid){const {window}=parseHTML(fs.readFileSync(path.join(root,'store-editor.html'),'utf8'));const document=window.document,calls=[],listeners={};Object.defineProperty(window.HTMLElement.prototype,'clientWidth',{get(){return 390;},configurable:true});Object.defineProperty(window.HTMLElement.prototype,'clientHeight',{get(){return 844;},configurable:true});Object.defineProperty(window.HTMLSelectElement.prototype,'value',{get(){return this.getAttribute('value')||this.querySelector('option')?.value||'';},set(v){this.setAttribute('value',v);},configurable:true});
 const ctx={document,location:{search:'?store='+store+'&type='+type,origin:'https://studio.test'},URL,URLSearchParams,console,Map,Set,JSON,Promise,Number,String,Math,Date,Array,Error,CustomEvent:window.CustomEvent,Event:window.Event,ResizeObserver:class{observe(){}},Image:function(){return document.createElement('img');},crypto:require('node:crypto').webcrypto,addEventListener:(n,fn)=>(listeners[n]||=[]).push(fn),dispatchEvent:e=>(listeners[e.type]||[]).forEach(fn=>fn(e)),setTimeout,clearTimeout};ctx.window=ctx;ctx.parent={};ctx.fetch=async(url,opts={})=>{if(['bath-body-catalog.json','retail-type-rules.json','retail-hardware-rules.json'].includes(url))return {ok:true,json:async()=>sources[url]||JSON.parse(fs.readFileSync(path.join(root,url),'utf8'))};const u=new URL(url);calls.push({url,method:opts.method||'GET',body:opts.body});let out=[];const table=u.pathname.split('/').at(-1);if(table==='stores')out=[{id:store,name:'Original Store',menu_type:type,logo_url:'https://assets.test/logo.png'}];if(table==='studio_designs'){out=opts.method==='POST'||opts.method==='PATCH'?[{...JSON.parse(opts.body),updated_at:'saved'}]:saved;}if(sources[table])out=sources[table];if(table==='store_entrances')out=[{id:'entrance',label:'Snacks',image_path:'entrance.png'}];if(table==='studio_product_categories'&&!sources[table])out=[{category:'Snacks',product_count:2},{category:'Beverages',product_count:1}];if(table==='products'){out=(sources.products||catalog).filter(p=>!u.searchParams.has('category')||u.searchParams.get('category')==='eq.'+p.category);out=out.slice(Number(u.searchParams.get('offset')||0),Number(u.searchParams.get('offset')||0)+Number(u.searchParams.get('limit')||500));}return{ok:true,status:200,json:async()=>out};};ctx.StudioTransferConfig={url:'https://data.test',key:'public-test-key'};vm.createContext(ctx);for(const name of ['store-editor-core.js','original-grocery-scene.js','native-page-controls.js','store-reference-scene.js','artwork-parts.js','store-editor.js'])vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),ctx,{filename:name});await ctx.AsgardWorkspaceEditor.ready;return{ctx,document,calls};}
async function choose(e,feature,id){await e.ctx.AsgardWorkspaceEditor.feature(feature);if(id)await e.ctx.AsgardWorkspaceEditor.asset(id);}
test('grocery reference loads actual artwork, edits a shelf, saves and restores without an app runtime',async()=>{const e=await editor();assert.equal(e.document.querySelectorAll('iframe').length,0);assert.match(e.document.querySelector('.reference-entrance img').src,/entrance.png/);await choose(e,'shelves','native-shelf:Snacks');assert.equal(e.document.querySelectorAll('.grocery-product').length,2);await e.ctx.AsgardWorkspaceEditor.topic('Shelf layout');const rows=e.document.querySelector('[data-control="rows"]');rows.value='1';rows.oninput();assert.equal(e.document.querySelectorAll('.grocery-rail').length,1);await e.ctx.AsgardWorkspaceEditor.save();const write=e.calls.find(c=>c.method==='POST');assert.match(write.url,/studio_designs/);const doc=JSON.parse(write.body);const restored=await editor('grocery',[doc]);await choose(restored,'shelves','native-shelf:Snacks');assert.equal(restored.document.querySelectorAll('.grocery-rail').length,1);assert.ok(e.calls.every(c=>c.method==='GET'||c.url.includes('/studio_designs')));});
test('clicking a grocery price opens appearance controls and edits only that tag',async()=>{const e=await editor();await choose(e,'shelves','native-shelf:Snacks');e.document.querySelector('.grocery-tag').onclick();const color=e.document.querySelector('[data-control="color"]');color.value='#00ffff';color.oninput();assert.equal(e.document.querySelector('.grocery-tag').style.color,'#00ffff');assert.notEqual(e.document.querySelectorAll('.grocery-tag')[1].style.color,'#00ffff');});
test('retail, both menu types, basket and checkout are editable references with read-only data access',async()=>{for(const type of ['retail','fast_casual','sit_down','fast_food']){const e=await editor(type);assert.ok(e.document.querySelector('[data-reference-page="'+type+'"]'));const price=e.document.querySelector('[data-editable="price"]');assert.ok(price,type);price.onclick({stopPropagation(){}});const size=e.document.querySelector('[data-control="fontSize"]');size.value='24';size.oninput();assert.equal(e.document.querySelector('[data-editable="price"]').style.fontSize,'24px');for(const feature of ['basket','checkout']){await choose(e,feature);const button=e.document.querySelector('.reference-order-button');assert.ok(button);button.onclick({stopPropagation(){}});assert.match(e.document.querySelector('#controls h2').textContent,/button appearance/);}assert.ok(e.calls.every(c=>c.method==='GET'));assert.equal(e.document.querySelectorAll('iframe').length,0);}});

test('a product-image replacement updates the selected reference only and undo restores it',async()=>{const e=await editor();await choose(e,'shelves','native-shelf:Snacks');e.document.querySelector('.grocery-product').onclick();const url=e.document.querySelector('[data-control="image_url"]');url.value='https://assets.test/replacement.png';url.oninput();assert.equal(e.document.querySelector('.grocery-product img').src,'https://assets.test/replacement.png');assert.notEqual(e.document.querySelectorAll('.grocery-product img')[1].src,'https://assets.test/replacement.png');e.document.querySelector('#undo').onclick();await Promise.resolve();assert.equal(e.document.querySelector('.grocery-product img').src,catalog[0].image_url);});

test('selected product size changes live, leaves neighbours unchanged, and survives save/reload',async()=>{const e=await editor('retail');const images=()=>e.document.querySelectorAll('[data-editable="product-image"]');images()[0].onclick({stopPropagation(){}});const scale=e.document.querySelector('[data-control="scale"]');assert.equal(scale.value,'100');scale.value='150';scale.oninput();assert.match(images()[0].style.transform,/scale\(1.5,1.5\)/);assert.ok(!images()[1].style.transform);const width=e.document.querySelector('[data-control="stretchX"]');width.value='120';width.oninput();assert.match(images()[0].style.transform,/scale\(1.8,1.5\)/);await e.ctx.AsgardWorkspaceEditor.save();const doc=JSON.parse(e.calls.find(c=>c.method==='POST').body),restored=await editor('retail',[doc]);assert.match(restored.document.querySelector('[data-editable="product-image"]').style.transform,/scale\(1.8,1.5\)/);});
test('individual shelf rails and aisle name open controls and update only selected elements',async()=>{const e=await editor();await choose(e,'shelves','native-shelf:Snacks');e.document.querySelector('.grocery-rail').onclick({stopPropagation(){}});assert.match(e.document.querySelector('#controls h2').textContent,/Shelf rail 1/);const size=e.document.querySelector('[data-control="scale"]');size.value='110';size.oninput();assert.match(e.document.querySelector('.grocery-rail').style.transform,/scale\(1.1,1.1\)/);assert.ok(!e.document.querySelectorAll('.grocery-rail')[1].style.transform);e.document.querySelector('.grocery-title').onclick({stopPropagation(){}});const text=e.document.querySelector('[data-control="text"]');assert.equal(text.value,'Snacks');text.value='My aisle';text.oninput();assert.equal(e.document.querySelector('.grocery-title').textContent,'My aisle');});
test('image transforms preserve original shelf scale and price positioning',async()=>{const e=await editor();await choose(e,'shelves','native-shelf:Snacks');e.document.querySelector('.grocery-product').onclick({stopPropagation(){}});const size=e.document.querySelector('[data-control="scale"]');size.value='125';size.oninput();assert.match(e.document.querySelector('.grocery-product').style.transform,/scale\(1\).*scale\(1.25,1.25\)/);});

test('drive-through references restore source-positioned names and prices over the original board',async()=>{const panels=[{id:'board-one',store_id:sid,daypart:'allday',panel_no:1,image_url:'https://assets.test/original-board.png',image_w:850,image_h:1851,crop:[60,280,480,1490],mode:'items',slots:[{x0:72,x1:280,y0:310,y1:470,name:'Pretzels'}]}];const e=await editor('fast_food',[],{store_board_panels:panels});assert.equal(e.document.querySelector('.reference-board-slot [data-editable="product-name"]').textContent,'Pretzels');assert.equal(e.document.querySelector('.reference-board-slot [data-editable="price"]').textContent,'$3.20');e.document.querySelector('.reference-board-slot [data-editable="product-name"]').onclick({stopPropagation(){}});const f=e.document.querySelector('[data-control="text"]');f.value='Custom name';f.oninput();assert.equal(e.document.querySelector('.reference-board-slot [data-editable="product-name"]').textContent,'Custom name');assert.ok(e.calls.filter(c=>c.url.includes('store_drive_thru_board')).every(c=>new URL(c.url).searchParams.get('store_id')==='eq.'+sid));});


test('Bath & Body Works reference filters all category products before paging and resets when switching categories',async()=>{
 const store='79377a42-fde7-40a4-b8d1-4bfc78d76bcb';
 const stock=Array.from({length:31},(_,i)=>({id:String(i),name:'Scent '+i,store_id:store,category:'Body Care',
  description:i===30?'3-in-1 Hair, Face & Body Wash':'Body Lotion',price:6.95}));
 stock.push({id:'candle',name:'Rose candle',store_id:store,category:'Candles',description:'Single Wick Candle',price:12});
 const e=await editor('retail',[],{products:stock,studio_product_categories:[{category:'Body Care',product_count:31},{category:'Candles',product_count:1}]},store);
 const preview=e.document.querySelector('#openRetailPhone');
 assert.equal(preview.hidden,false);assert.equal(preview.getAttribute('href'),'retail-phone.html?store='+store);assert.equal(preview.getAttribute('rel'),'noopener');
 const button=(query,label)=>[...e.document.querySelectorAll(query)].find(b=>b.textContent===label);
 const settle=()=>new Promise(resolve=>setImmediate(resolve));
 assert.equal(e.document.querySelectorAll('.reference-category-options button').length,3);
 button('.reference-category-tabs button','Body Care').click();await settle();
 assert.ok(e.document.querySelector('.reference-bath-body'));
 assert.equal(e.document.querySelectorAll('.reference-retail-grid .retail').length,24);
 for(const label of ['Face','Hair','Bath & Shower']){
  button('.reference-type-rail button',label).click();await settle();
  assert.equal(e.document.querySelectorAll('.reference-retail-grid .retail').length,1);
  assert.equal(e.document.querySelector('.reference-retail-grid .retail strong').textContent,'Scent 30');
  assert.equal(button('.reference-type-rail button',label).getAttribute('aria-pressed'),'true');
  assert.ok(button('.reference-type-rail button',label).querySelector('svg use').getAttribute('href').includes('.svg#'));
 }
 button('.reference-category-tabs button','Candles').click();await settle();
 assert.equal(e.document.querySelector('.reference-type-rail'),null);
 assert.equal(e.document.querySelector('.reference-retail-grid strong').textContent,'Rose candle');
});

test('Ace category and product-type rails can be paged, dragged, wheeled and opened in full',async()=>{
 const store='e466b922-93f8-4126-bf2d-20a1368e84a0';
 const departments=['Auto','Building Supplies','Electrical','Flooring & Tile','Garden & Outdoors','Hardware','Lighting','Paint','Plumbing','Safety','Tools'];
 const products=departments.map((category,i)=>({id:'stock-'+i,name:category+' item',store_id:store,category,price:1}));
 const tools=['Hammers','Wrenches','Sockets','Levels','Cutters','Drills','Pliers','Tape measures','Files'];
 products.push(...tools.map((label,i)=>({id:'tool-'+i,name:'Ace original '+label,store_id:store,category:'Tools',section:'Hand tools',shelf_group:'',price:3})));
 const toolRules=tools.map(label=>({id:label.toLowerCase(),label,icon:'hardware',pattern:label,stores:[store],categories:['Tools']}));
 const e=await editor('retail',[],{
  products,studio_product_categories:departments.map(category=>({category,product_count:products.filter(p=>p.category===category).length})),
  'retail-hardware-rules.json':{groups:toolRules},'retail-type-rules.json':{groups:[]}
 },store);
 const d=e.document, settle=()=>new Promise(resolve=>setImmediate(resolve));
 const fire=(el,type,data)=>{const ev=new e.ctx.Event(type,{bubbles:true,cancelable:true});Object.assign(ev,data);el.dispatchEvent(ev);return ev;};
 for(const [index,selector,count] of [[0,'.reference-category-tabs',departments.length+1],[1,'.reference-type-rail',tools.length+2]]){
  const strip=d.querySelector(selector),nav=strip.parentElement;
  Object.defineProperty(strip,'clientWidth',{value:170});Object.defineProperty(strip,'scrollWidth',{value:900});
  strip.getBoundingClientRect=()=>({width:170});
  strip.scrollLeft=0;fire(strip,'scroll');
  const [previous,next]=nav.querySelectorAll('.reference-rail-arrow');
  assert.ok(previous.disabled);assert.equal(next.disabled,false);assert.equal(next.hidden,false);
  next.click();assert.ok(strip.scrollLeft>0);previous.click();assert.equal(strip.scrollLeft,0);
  assert.equal(fire(strip,'wheel',{deltaY:77,deltaX:0,deltaMode:0}).defaultPrevented,true);
  assert.equal(strip.scrollLeft,77);
  fire(strip,'pointerdown',{pointerId:1,pointerType:'mouse',button:0,clientX:100});
  const tap=fire(strip,'pointermove',{pointerId:1,clientX:97});assert.equal(tap.defaultPrevented,false);
  fire(strip,'pointermove',{pointerId:1,clientX:44});assert.equal(strip.scrollLeft,133);
  fire(strip,'pointerup',{pointerId:1});
  const list=nav.querySelector('details');list.open=true;
  assert.equal(list.querySelectorAll('button').length,count);
  const choice=index===0?'Tools':'Wrenches';[...list.querySelectorAll('button')].find(b=>b.textContent===choice).click();await settle();
 }
 const rows=d.querySelectorAll('.reference-retail-grid strong');
 assert.equal(rows.length,1);assert.equal(rows[0].textContent,'Ace original Wrenches');
 assert.ok(!d.querySelector('.reference-bath-body'));
});

test('Ace catalog uses product purpose and keeps explicit shelf labels ahead of name matching',async()=>{
 const store='e466b922-93f8-4126-bf2d-20a1368e84a0',category='Household Essentials';
 const examples=[
  ['06cda3a1-cb01-4bbb-ab26-d3a448ff37d2','Cascade Complete Dishwasher Pods, Fresh','Cleaners & Wipes'],
  ['3177ba5d-e43a-4f94-9f80-04a8da8b8206','Trimaco 18" x 36" White Supertuff Cotton Tack Cloth','Towels & Cloths'],
  ['1ccd2c46-6a7d-4801-914e-6ae1fddeb996','Plink Garbage Disposal Cleaner and Deodorizer, Lemon Scented','Cleaners & Wipes'],
  ['0007b784-ccfa-4d27-b0f9-764c46fb6386','Ortho Insect Killer','Pest Control'],
  ['3140a103-5ab0-4cf7-b871-f9954c304a4e','Glad ForceFlex Heavy Duty Large Drawstring Trash Bags, Hold 80+ Pounds, 30 Gallon','Trash & Yard Bags']
 ];
 const products=examples.map(([id,name])=>({id,name,category,store_id:store,section:category}));
 products.push({...products[3],id:'owner-grouped',shelf_group:'Patio display'});
 const e=await editor('retail',[],{products,studio_product_categories:[{category,product_count:products.length}]},store);
 const pick=async(selector,label)=>{
  const button=[...e.document.querySelectorAll(selector)].find(b=>b.textContent===label);
  assert.ok(button,label);button.click();await new Promise(resolve=>setImmediate(resolve));
 };
 await pick('.reference-category-tabs button',category);
 for(const type of [...new Set(examples.map(a=>a[2])), 'Patio display']){
  await pick('.reference-type-rail button',type);
  const names=[...e.document.querySelectorAll('.reference-retail-grid strong')].map(n=>n.textContent).sort();
  assert.deepEqual(names,type==='Patio display'?['Ortho Insect Killer']:examples.filter(a=>a[2]===type).map(a=>a[1]).sort());
 }
 assert.ok(e.calls.filter(c=>c.url.includes('/rest/v1/products?')).every(c=>new URL(c.url).searchParams.get('store_id')==='eq.'+store));
 assert.ok(e.calls.every(c=>c.method==='GET'));
});
