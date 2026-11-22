const test = require('node:test');
const assert = require('node:assert/strict');
const {groceryEntranceForStore} = require('../workspace-core.js');
const {PUBLIX,TARGET,publixDoors,mediaPath,validBox,panelsFor} = require('../grocery-entrance.js');
const source='https://afnihsdxtisneuyehatw.supabase.co';
const media=path=>mediaPath(path,source);
test('only supported stores reach their actual entrance',()=>{
 for(const store of [PUBLIX,TARGET])assert.equal(groceryEntranceForStore(store),'grocery-entrance.html?store='+store);
 for(const other of ['',null,'0600cb61-45f9-402b-a209-134abdaef10f','example'])assert.equal(groceryEntranceForStore(other),'');
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
