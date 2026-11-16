const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../workspace-core.js');
const fs=require('node:fs'),path=require('node:path');
test('functional navigation resolves every page and keeps independent store identity',()=>{
 for(const g of C.GROUPS)for(const p of g.pages)assert.equal(C.normalizeLocation({group:g.id,page:p[0]}).page,p[0]);
 assert.equal(C.normalizeLocation({group:'shopping',page:'stores',store:'abc'}).store,'abc');
 assert.equal(C.normalizeLocation({group:'removed',page:'removed'}).page,'shome');
});
test('back then new selection truncates forward history without mutating prior locations',()=>{
 let h={items:[C.normalizeLocation({group:'sky',page:'raven'})],at:0};
 h=C.historyPush(h,{group:'shopping',page:'stores',store:'a'});
 h=C.historyPush(h,{group:'shopping',page:'stores',store:'b'});h.at=1;
 h=C.historyPush(h,{group:'social',page:'home'});
 assert.equal(h.items.length,3);assert.equal(h.items[1].store,'a');assert.equal(h.items[2].page,'home');
});
test('loading a look protects locked values and retains the complete-look library',()=>{
 const old={ring:{size:1.2,density:1},_studioEditor:{locks:{'ring.size':{value:1.2}},presets:[{name:'my look'}]}};
 const result=C.preserveLocks(old,{ring:{size:.5,density:2}});
 assert.equal(result.ring.size,1.2);assert.equal(result.ring.density,2);
 assert.deepEqual(result._studioEditor.presets,old._studioEditor.presets);
 assert.equal(old.ring.density,1);
});
test('a layer lock follows its identity through reorder and prevents accidental removal',()=>{
 const old={_studioLayers:[{id:'one',width:100},{id:'two',width:200}],_studioEditor:{locks:{'_studioLayers.1.width':{value:200,layerId:'two'}}}};
 const reordered=C.preserveLocks(old,{_studioLayers:[{id:'two',width:1},{id:'one',width:2}]});
 assert.equal(reordered._studioLayers[0].width,200);assert.equal(reordered._studioLayers[1].width,2);
 assert.ok(reordered._studioEditor.locks['_studioLayers.0.width']);
 const removed=C.preserveLocks(old,{_studioLayers:[{id:'one',width:100}]});assert.equal(removed._studioLayers[1].id,'two');
});
test('saved looks do not recursively copy earlier looks',()=>{
 const p=C.preset({color:'gold',_studioEditor:{presets:[{document:{huge:true}}],locks:{}}});
 assert.equal(p._studioEditor.presets,undefined);assert.equal(p.color,'gold');
});
test('untrusted setting paths cannot pollute object prototypes',()=>{
 for(const p of ['__proto__.x','a.constructor.prototype.x','a..b'])assert.throws(()=>C.set({},p,1));
 assert.equal({}.x,undefined);
});
test('duplicate inspection keeps different stores and package sizes separate',()=>{
 const products=[{store_id:'one',name:'Beans 15 oz',id:1},{store_id:'one',name:'BEANS 15 OZ',id:2},{store_id:'one',name:'Beans 28 oz',id:3},{store_id:'two',name:'Beans 15 oz',id:4}];
 assert.deepEqual(C.duplicates(products).map(g=>g.map(p=>p.id)),[[1,2]]);assert.equal(products.length,4);
});
test('render briefs preserve exact products and facings, flag missing brands and split overflow',()=>{
 const products=Array.from({length:7},(_,i)=>({id:'p'+i,name:'Product '+i,category:'Frozen',price:i,image_url:'https://store.test/'+i,brand:i?'Brand A':null}));
 const p=C.renderPlan(products,{rows:2,brandsPerRow:3,facings:4});
 assert.equal(p.boards.length,2);assert.equal(p.productCount,7);assert.equal(p.needsBrandReview,true);
 assert.equal(p.boards[0].display,'freezer');assert.ok(p.boards.flatMap(b=>b.slots).every(s=>s.facings===4));
 assert.deepEqual(p.boards.flatMap(b=>b.products).map(p=>p.id).sort(),products.map(p=>p.id).sort());
 assert.ok(p.boards.every(b=>b.slots.every(s=>s.row<=2&&s.column<=3)));
});
test('automatic fixture choice can be overridden without changing product identity',()=>{
 const product={id:'milk',name:'Milk',category:'Dairy',brand:'Given'};
 assert.equal(C.renderPlan([product]).boards[0].display,'refrigerator');
 assert.equal(C.renderPlan([product],{display:'shelf'}).boards[0].display,'shelf');
});
test('fixture categories resolve to existing files and original image folders stay present',()=>{
 const root=path.join(__dirname,'..'),catalog=JSON.parse(fs.readFileSync(path.join(root,'shared-media-catalog.json')));
 const assets=catalog.assets.filter(a=>a.path.startsWith('assets/fixtures/'));
 assert.equal(assets.length,3);for(const a of assets)assert.ok(fs.statSync(path.join(root,a.path)).size>10000);
 for(const id of ['menu-images','studio','asgard_ui','raven_earth'])assert.ok(catalog.sources.some(s=>s.id===id));
});
test('app presentation exports exclude draft catalog prices, saved looks and source records',()=>{
 const T=require('../studio-transfer-core.js'),source={_studioEditor:{presets:[{name:'saved'}]},_catalogDraft:{overrides:{a:{price:1}}},_studioLayers:[{id:'one',panels:[{url:'https://assets.example/panel.png'}],sourceRecord:{image_path:'private-reference'},sourceTable:'aisle_renders'}]};
 const exported=T.presentationSettings(source);
 assert.equal(exported._catalogDraft,undefined);assert.equal(exported._studioEditor,undefined);assert.equal(exported._studioLayers[0].sourceRecord,undefined);
 assert.equal(exported._studioLayers[0].panels[0].url,'https://assets.example/panel.png');assert.ok(source._catalogDraft);
});
