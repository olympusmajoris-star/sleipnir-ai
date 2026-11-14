const test=require('node:test'),assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');global.crypto=webcrypto;
const {safeAction,makeLayer,safeProductMap,projectProductZones}=require('../studio-page-tools.js');
const storeId='189581c9-d728-4e5d-9e02-ae4de19a15af',productId='6e179aa7-cdf9-4872-8972-a72c14d06ea4';
test('button actions are explicit and inert by default',()=>{assert.equal(safeAction(makeLayer('button').action),null);});
test('valid product and page destinations preserve identity and strip extra properties',()=>{assert.deepEqual(safeAction({type:'product',productId,storeId,script:'bad'}),{type:'product',productId,storeId});assert.deepEqual(safeAction({type:'navigate',target:'browse',pageType:'retail',url:'javascript:bad'}),{type:'navigate',target:'browse',pageType:'retail'});});
test('invalid targets, IDs and arbitrary URL actions cannot run',()=>{for(const action of [{type:'navigate',target:'https://evil.example'},{type:'navigate',target:'browse',pageType:'unknown'},{type:'product',storeId,productId:'bad'},{type:'navigate',target:'store'},{type:'eval',code:'alert()'}])assert.equal(safeAction(action),null);});
const map={storeId,width:1000,height:500,zones:[{productId,name:'Beans',box:{x:.2,y:.2,width:.3,height:.4}}]};
test('stocked-display tap areas follow contain fitting and cover cropping',()=>{
 assert.deepEqual(projectProductZones(map,200,200)[0].rect,{x:40,y:70,width:60,height:40});
 assert.deepEqual(projectProductZones(map,200,200,'cover')[0].rect,{x:-20,y:40,width:120,height:80});
 assert.deepEqual(projectProductZones(map,200,200,'cover',0,50)[0].rect,{x:80,y:40,width:120,height:80});
 assert.equal(makeLayer('image',{productMap:map}).productMap.zones[0].productId,productId);
});
test('malformed and out-of-bounds product maps never become active buttons',()=>{
 for(const bad of [{...map,storeId:'wrong'},{...map,width:0},{...map,zones:[{...map.zones[0],box:{x:.9,y:0,width:.2,height:1}}]},{...map,zones:[{...map.zones[0],productId:'bad'}]}])assert.equal(safeProductMap(bad),null);
 assert.deepEqual(projectProductZones(null,200,100),[]);
});
