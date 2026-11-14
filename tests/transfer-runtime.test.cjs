const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const {webcrypto}=require('node:crypto');
const source=fs.readFileSync(path.join(__dirname,'../pages.js'),'utf8');
const STORE='189581c9-d728-4e5d-9e02-ae4de19a15af';
const PRODUCT='6e179aa7-cdf9-4872-8972-a72c14d06ea4';
function fixture(page,preview=false,options={}){
 const calls=[],events=[],frames=[],drawn=[],allowed=[],elements=new Map();let renderer;
 const ctx=new Proxy({measureText:s=>({width:String(s).length*6}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),fillText:s=>drawn.push(s)}, {get(o,k){return k in o?o[k]:(()=>{});},set(o,k,v){o[k]=v;return true;}});
 function el(tag='div'){const e={tagName:tag.toUpperCase(),children:[],style:{setProperty(){}},dataset:{},attrs:{},events:{},value:'',classList:{add(){},remove(){},toggle(){}},setAttribute(k,v){this.attrs[k]=v;},append(...nodes){this.children.push(...nodes);},addEventListener(k,f){this.events[k]=f;},getBoundingClientRect(){return {left:0,top:0,width:390,height:844};},getContext:()=>ctx,remove(){this.removed=true;}};return e;}
 elements.set('#stage',el());elements.set('#pgCanvas',el('canvas'));
 const envelope={schemaVersion:1,designId:page==='store'?'page_store_'+STORE:'page_'+page,page,settings:options.settings||{},navigation:{motion:{paused:false}},...(page==='store'?{storeId:STORE}:{})};
 const RT={envelope,preview,allowDataAssets:urls=>allowed.push(...urls),resolveAsset:s=>'https://assets.example/'+String(s).replace(/^https?:\/\//,''),emit:(type,p)=>events.push({type,...p}),setRenderer:r=>renderer=r};
 const sandbox={console,URL,URLSearchParams,Map,Set,Array,Object,Number,String,Date,Math,JSON,Promise,AbortController,crypto:webcrypto,performance:{now:()=>1000},window:{AsgardRuntime:RT,devicePixelRatio:1},location:{search:'',href:'https://studio.example/app-runtime.html'},document:{head:{appendChild(){}},querySelector:s=>{if(!elements.has(s))throw Error('Editor element accessed in runtime: '+s);return elements.get(s);},createElement:el},localStorage:{getItem(){throw Error('Runtime accessed draft local storage');},setItem(){throw Error('Runtime wrote local storage');}},history:{replaceState(){throw Error('Runtime changed editor history');}},Image:class{constructor(){this.complete=false;this.naturalWidth=0;}set src(value){calls.push({asset:value});}},SharedStudioMedia:{kind:s=>/mp4/.test(s)?'video':'image',create:()=>({})},StudioPageTools:{mount:o=>{assert.equal(o.readOnly,true);return {sync(){},pause(){}};}},AsgardRockNav:{defaults:()=>({motion:{paused:false}}),Navigation:class{constructor(o){assert.equal(o.readOnly,true);this.S={motion:{paused:false}};this.edits=new Map();}setContext(){} }},setTimeout,clearTimeout,requestAnimationFrame:f=>{frames.push(f);return frames.length;},cancelAnimationFrame(){},fetch:async(url,opts={})=>{calls.push({url,opts});assert.equal(opts.method,undefined,'runtime must only GET');assert.ok(!/studio_designs|raven_scene_settings/.test(url),'runtime must not read drafts');const u=new URL(url);if(options.failProducts&&u.pathname.endsWith('/products'))return {ok:false};if(u.pathname.endsWith('/stores'))return {ok:true,json:async()=>[{id:STORE,name:'Test store',address:'Test address'}]};if(u.pathname.endsWith('/products')){const offset=Number(u.searchParams.get('offset')||0);return {ok:true,headers:{get:()=>offset+'-'+(offset+79)+'/161'},json:async()=>Array.from({length:offset===160?1:80},(_,i)=>({id:PRODUCT,store_id:STORE,name:'Product '+(offset+i),description:'Exact product details',price:1,image_url:options.productImage||'',category:'Canned goods'}))};}throw Error('Unexpected request '+url);}};
 sandbox.window.SharedStudioMedia=sandbox.SharedStudioMedia;
 vm.runInNewContext(source,sandbox,{timeout:3000});
 return {calls,events,frames,drawn,elements,renderer,RT,allowed,nav:sandbox.window.asgardRockNavigation};
}
test('every page mounts read-only without draft reads, writes or editor DOM',()=>{
 for(const page of ['home','share','convo','heimdall','track','swap','ads','shoppost','deals','store','shome','browse']){
  const f=fixture(page);assert.ok(f.renderer,page);assert.equal(f.renderer.descriptor().readOnly,true);assert.equal(f.calls.length,0);assert.equal(f.RT.envelope.page,page);
 }
});
test('unsupported production pages show a truthful connection state instead of fake people',()=>{
 const f=fixture('convo');f.frames.shift()(2000);assert.ok(f.drawn.includes('This page needs its app connection.'));assert.ok(!f.drawn.some(s=>/Bring the speaker|Freya|Hey, you/.test(s)));assert.equal(f.renderer.descriptor().productionDataReady,false);assert.ok(f.renderer.descriptor().missingBindings.includes('original Dart cloud conversation'));
});
test('catalog requests preserve IDs and reach items beyond first 80 with stable order',async()=>{
 const f=fixture('store');const first=await f.renderer.getCatalogPage(0,'');const second=await f.renderer.getCatalogPage(80,'');const last=await f.renderer.getCatalogPage(160,'');
 assert.equal(first.items.length,80);assert.equal(second.items[0].name,'Product 80');assert.equal(last.items[0].name,'Product 160');assert.equal(last.count,161);assert.equal(last.items[0].id,PRODUCT);assert.equal(last.items[0].store_id,STORE);
 const urls=f.calls.filter(c=>c.url?.includes('/products?')).map(c=>new URL(c.url));assert.deepEqual(urls.map(u=>u.searchParams.get('offset')),['0','80','160']);assert.ok(urls.every(u=>u.searchParams.get('order').endsWith('id.asc')));
});
test('search remains scoped to the selected store',async()=>{
 const f=fixture('store');await f.renderer.getCatalogPage(0,'beans%*');const q=new URL(f.calls.find(c=>c.url?.includes('/products?')).url).searchParams;assert.equal(q.get('store_id'),'eq.'+STORE);assert.equal(q.get('name'),'ilike.*beans*');
});
test('rendered product click emits canonical product and store identifiers',async()=>{
 const f=fixture('store');await f.renderer.getCatalogPage();f.frames.shift()(2000);const canvas=f.elements.get('#pgCanvas');canvas.events.click({clientX:60,clientY:370});assert.deepEqual(f.events.find(e=>e.type==='product'),{type:'product',productId:PRODUCT,storeId:STORE});
});
test('updating approved envelope cannot trigger editor loading or writes',()=>{
 const f=fixture('shome');const next={...f.RT.envelope,settings:{title:{text:'Saved exact title'}}};f.renderer.update(next);assert.equal(f.calls.length,0);assert.throws(()=>f.renderer.update({...next,page:'store',storeId:'not-a-store'}),/valid store ID/);f.renderer.pause(true);f.renderer.pause(false);assert.equal(f.calls.length,0);
});

test('production failures remain visible rather than becoming empty catalogs',async()=>{
 const f=fixture('store',false,{failProducts:true});const result=await f.renderer.getCatalogPage();assert.equal(result.error,'Products could not be loaded.');f.frames.shift()(2000);assert.ok(f.drawn.includes('Products could not be loaded.'));assert.ok(!f.drawn.includes('No products for this store yet'));
});
test('catalog supports explicit scrolling when saved auto-scroll is zero',async()=>{
 const f=fixture('store',false,{settings:{list:{scroll:0}}});await f.renderer.getCatalogPage();f.frames.shift()(2000);assert.ok(f.drawn.includes('Product 0'));f.drawn.length=0;f.elements.get('#pgCanvas').events.wheel({deltaY:1200,preventDefault(){}});f.frames.shift()(2100);assert.ok(f.drawn.some(s=>/^Product (?:[4-9]|[1-9]\d)$/.test(s)));assert.ok(!f.drawn.includes('Product 0'));
});
test('asset collector includes unrendered declared layers and resolves displayed static assets',()=>{
 const asset='https://assets.example/layer.png';const f=fixture('home',true,{settings:{_studioLayers:[{id:'a',src:asset,show:false}]}});assert.ok(f.renderer.referencedAssets().includes(asset));f.frames.shift()(2000);assert.ok(f.calls.filter(c=>c.asset).every(c=>c.asset.startsWith('https://assets.example/')));assert.ok(f.renderer.referencedAssets().some(s=>/^bg\//.test(s)));
});
test('paused runtime stays paused across new envelopes and context does not load drafts',()=>{
 const f=fixture('shome');f.renderer.pause(true);f.renderer.update({...f.RT.envelope,settings:{title:{text:'Paused'}}});assert.equal(f.nav.S.motion.paused,true);f.renderer.setContext({capabilities:{navigate:true}});assert.equal(f.nav.S.motion.paused,true);f.renderer.pause(false);assert.equal(f.nav.S.motion.paused,false);assert.equal(f.calls.length,0);assert.throws(()=>f.renderer.update({...f.RT.envelope,page:'constructor'}),/Unsupported page/);assert.throws(()=>f.renderer.update({...f.RT.envelope,page:'browse',pageType:'arbitrary'}),/store category/);
});
test('publication descriptor distinguishes available callbacks from full app parity',()=>{
 const store=fixture('store').renderer.descriptor();assert.equal(store.actions,true);assert.equal(store.fullAppParity,false);assert.match(store.note,/callback and FlutterFlow device testing/);const alerts=fixture('heimdall').renderer.descriptor();assert.equal(alerts.actions,false);assert.ok(alerts.missingBindings.includes('real notification events'));
});

test('live catalog photos are allowed as data assets and excluded from frozen UI dependencies',async()=>{
 const productImage='https://catalog.example/can of beans.png',f=fixture('store',false,{productImage});await f.renderer.getCatalogPage();assert.ok(f.allowed.includes(productImage));assert.ok(f.allowed.includes('https://catalog.example/can%20of%20beans.png'));f.frames.shift()(2000);assert.ok(!f.renderer.referencedAssets().some(s=>s.includes('catalog.example')));
});
