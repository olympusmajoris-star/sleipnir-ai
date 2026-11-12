const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const context=vm.createContext({window:{},console});
for(const file of ['bh-engine.js','reference-variants.js','model-preview.js','raven-scene.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);
const G=context.window,M=G.AsgardModelPreview,item={id:'v2-galaxy-ring',name:'Ring + galaxy disk + jet'},plain=x=>JSON.parse(JSON.stringify(x));
test('selected model copies the exact library preset without mutating tier 2',()=>{
 const previous={radius:40,x:.5,y:.235,ringSize:1.26,density:1.05},saved=plain(previous),m=M.create(item,previous);
 assert.deepEqual(plain(m.look),{...plain(G.BH.BH_PRESETS['orange-garg']),size:40,faceAmt:0});assert.deepEqual(previous,saved);
 m.look.diskBright=0;assert.equal(G.BH.BH_PRESETS['orange-garg'].diskBright,3);
});
test('every model control reaches the live hole with no clip or fuel override',()=>{
 const m=M.create(item);Object.assign(m.look,{size:25,diskSpin:2,diskOpacity:.4,rotX:60,rotY:20,rotZ:-50,diskOut:21,lens:1.6,ring:2.1});
 const h=M.hole(m,10);for(const [k,v]of Object.entries(m.look))if(!['x','y'].includes(k))assert.equal(h[k],v,k);
});
test('drift changes position but never the axis or size',()=>{
 const m=M.create(item);m.drift=true;const a=M.hole(m,0),b=M.hole(m,20);assert.notEqual(a.x,b.x);for(const k of ['rotX','rotY','rotZ','size'])assert.equal(a[k],b[k]);
});
test('tier 1 stays quiet and keeps its own saved lens controls',()=>{
 const settings={dashboards:{viewers:{tiers:[{look:{lens:1.4,reach:.55}}]}},referencePreview:{radius:40},quietPreview:{size:26,lens:.8,reach:.4}};
 const before=plain(settings),h=M.quiet(settings);assert.equal(h.size,26);assert.equal(h.lens,.8);assert.equal(h.reach,.4);
 for(const k of ['disk','ring','corona','glow','jets','flare','faceAmt'])assert.equal(h[k],0);assert.deepEqual(settings,before);
});
test('random axes stay fixed per streamer across time and saved reloads',()=>{
 const m=M.create(item);m.randomAxis=true;const a=M.hole(m,0),b=M.hole(plain(m),500);for(const k of ['rotX','rotY','rotZ'])assert.equal(a[k],b[k]);m.streamerId='thor';assert.notEqual(a.rotZ,M.hole(m).rotZ);
});
test('live renderer gives selected model precedence and passes scene time for its spin',()=>{
 const prototype=G.Raven.RavenScene.prototype,m=M.create(item),seen=[];
 const scene={s:{holes:{modelPreview:m,referencePreview:{on:true},behavior:{autoQuality:false},hideFaces:true,refl:{}},rolodex:{settle:false}},time:10,speed:1,playing:true,roll:{vel:0},_last:1000,
 engine:{render(t){seen.push([this.holes,t]);}},_updateSky(){},_updateFeed(){},_composeBg(){},_drawClips(){},_drawOverlay(){},_loop(){}};
 context.requestAnimationFrame=()=>{};prototype._loop.call(scene,1016);
 assert.equal(seen[0][0].length,1);assert.equal(seen[0][0][0]._modelPreview,true);assert.equal(seen[0][0][0].disk,1);assert.equal(seen[0][0][0].diskBright,3);assert.ok(seen[0][1]>10);
});
test('returning to tier 2 removes the 3D model without altering reference settings',()=>{
 const prototype=G.Raven.RavenScene.prototype,m=M.create(item);m.on=false;G.AsgardReference={};
 const reference={on:true,ringSize:1.26},scene={s:{holes:{modelPreview:m,referencePreview:reference,behavior:{autoQuality:false}},rolodex:{settle:false}},time:0,playing:false,roll:{vel:0},engine:{render(){}},_updateSky(){},_updateFeed(){},_composeBg(){},_drawClips(){},_drawOverlay(){},_loop(){}};
 context.requestAnimationFrame=()=>{};prototype._loop.call(scene,1);assert.equal(scene.engine.holes.length,0);assert.deepEqual(reference,{on:true,ringSize:1.26});
});
