const test=require('node:test'),assert=require('node:assert/strict');
const Q=require('../catalog-quality-core.js'),Review=require('../catalog-review.js');
function pixels(w,h,rgba=[255,255,255,255]){return new Uint8ClampedArray(Array.from({length:w*h},()=>rgba).flat());}
test('image inspection identifies blank alpha and white, without calling a colored package blank',()=>{
 assert.equal(Q.analyzePixels(pixels(4,4,[0,0,0,0]),4,4).blank,true);
 assert.equal(Q.analyzePixels(pixels(4,4),4,4).blank,true);
 assert.equal(Q.analyzePixels(pixels(4,4,[120,50,80,255]),4,4).blank,false);
 assert.throws(()=>Q.analyzePixels(new Uint8Array(3),2,2));
});
test('edge cleanup preserves enclosed white packaging and colored product pixels',()=>{
 const p=pixels(7,7);for(let y=1;y<6;y++)for(let x=1;x<6;x++)if(y===1||x===1||y===5||x===5)p.set([40,60,80,255],(y*7+x)*4);
 const r=Q.removeEdgeBackground(p,7,7);assert.equal(r.removed,24);assert.equal(r.data[3],0);assert.equal(r.data[(3*7+3)*4+3],255);assert.equal(r.data[(1*7+1)*4+3],255);assert.equal(p[3],255);
});
const product={id:'a',store_id:'store',name:'Beans',full_name:'Beans 12 oz',description:'Black beans',price:2,image_url:'https://example.com/beans.png'};
test('cleanup excludes exact duplicates but preserves full names, location, weights, price and variant differences',()=>{
 const list=[product,{...product,id:'duplicate'},...Object.entries({full_name:'Beans 24 oz',store_id:'other',weight_lbs:2,price:4,variant:'spicy'}).map(([k,v],i)=>({...product,id:'keep'+i,[k]:v}))];
 const r=Q.cleanup(list);assert.deepEqual(Object.keys(r.patches),['duplicate']);assert.equal(r.decisions[0].keepId,'a');
});
test('network failures remain unverified, while known blank images are excluded from draft renders',()=>{
 const r=Q.cleanup([{...product,name:'  Beans   with rice ',id:'a'},{...product,id:'b',image_url:''},{...product,id:'c'}],{a:{status:'unverified'},c:{status:'blank'}});
 assert.equal(r.patches.a.name,'Beans with rice');assert.equal(r.patches.a.excludeFromRenders,undefined);assert.equal(r.patches.b.excludeFromRenders,true);assert.equal(r.patches.c.excludeFromRenders,true);
});
test('undo cleanup preserves edits made afterwards',()=>{
 const draft={overrides:{a:{brand:'Original'}}},run=Q.applyCleanup(draft,{patches:{a:{name:'Trimmed'},b:{excludeFromRenders:true}},decisions:[]});draft.overrides.a.brand='New';assert.deepEqual(Q.undoCleanup(draft,run),{restored:1,skipped:1});assert.equal(draft.overrides.a.brand,'New');assert.equal(draft.overrides.b,undefined);
});
test('catalog review applies only catalog fields and keeps a deliberately cleared value',()=>{
 assert.deepEqual(Review.difference({name:'Beans',price:2},{name:'Beans',price:null,brand:'X',excludeFromRenders:true,store_id:'other'}),{price:null});
});
