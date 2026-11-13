const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const context=vm.createContext({window:{},console});
for(const file of ['bh-engine.js','reference-variants.js','model-preview.js','raven-scene.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);
const G=context.window,M=G.AsgardModelPreview,item={id:'v2-galaxy-ring',name:'Ring + galaxy disk + jet'},plain=x=>JSON.parse(JSON.stringify(x));
test('selected model copies the exact library preset without mutating tier 2',()=>{
 const previous={radius:40,x:.5,y:.235,ringSize:1.26,density:1.05},saved=plain(previous),m=M.create(item,previous);
 assert.deepEqual(plain(m.look),{...plain(G.BH.BH_PRESETS['orange-garg']),size:40,faceAmt:0});assert.deepEqual(previous,saved);
 m.look.diskBright=0;assert.equal(G.BH.BH_PRESETS['orange-garg'].diskBright,3);
});
test('adding growth controls preserves the currently edited look until endpoints change',()=>{
 const m=M.create(item);m.look.diskOut=5.6;m.look.size=35.5;m.look.diskSpin=1.75;m.growth=M.growth(m);
 assert.equal(m.growth.ringStart,5.6);assert.equal(m.growth.ringEnd,5.6);
 assert.equal(M.hole(m).diskOut,5.6);assert.equal(M.hole(m).size,35.5);assert.equal(M.hole(m).diskSpin,1.75);
});
test('tier 3 grows between exact endpoints without changing sphere size or axes',()=>{
 const m=M.create(item);m.growth={on:true,ringStart:4,ringEnd:12,views:150};const start=M.hole(m);
 assert.equal(start.diskOut,4);m.growth.views=499;assert.equal(M.hole(m).diskOut,12);
 m.growth.views=324.5;const mid=M.hole(m);assert.equal(mid.diskOut,8);
 for(const k of ['size','rotX','rotY','rotZ','diskSpin','diskOpacity'])assert.equal(mid[k],start[k]);
});
test('editing an endpoint previews it, keeps smallest below largest, and avoids collapsing the disk',()=>{
 const m=M.create(item);M.setEndpoint(m,'ringStart',18);assert.equal(m.growth.views,150);assert.equal(m.growth.ringEnd,18);
 M.setEndpoint(m,'ringEnd',5);assert.equal(m.growth.views,499);assert.equal(m.growth.ringStart,5);
 m.look.diskIn=8;assert.ok(M.hole(m).diskOut>m.look.diskIn);assert.equal(M.growth(m).ringStart,8.1);
});
test('growth clamps to tier 3 and manual ring sizing remains available',()=>{
 const m=M.create(item);m.growth={on:true,ringStart:4,ringEnd:12,views:0};assert.equal(M.hole(m).diskOut,4);
 m.growth.views=1000;assert.equal(M.hole(m).diskOut,12);m.growth.on=false;m.look.diskOut=7;assert.equal(M.hole(m).diskOut,7);
});
test('growth endpoints and per-streamer fixed axes survive saved variants',()=>{
 const m=M.create(item);m.randomAxis=true;m.growth={on:true,ringStart:4,ringEnd:11,views:300};
 assert.deepEqual(plain(M.hole(plain(m),10)),plain(M.hole(m,10)));
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
function pairSettings(){
 const s=G.Raven.ensureDashboards(plain(G.Raven.DEFAULT_SETTINGS));
 const m=s.holes.modelPreview=M.create(item);m.randomAxis=true;m.growth={on:true,views:150,ringStart:12.7,ringEnd:14.2};
 s.holes.referencePreview={on:true,radius:40,speed:1.35,ringSize:1.26};
 s.holes.together={on:true,followers:50,drift:true,speed:6.5,variety:false};return s;
}
test('both tiers use their saved renderers, distinct stable axes, and the same follower radius',()=>{
 const s=pairSettings(),before=plain(s),a=M.together(s.holes,0,29.2),b=M.together(s.holes,100,29.2);
 assert.equal(a.reference.ringSize,1.26);assert.equal(a.model.diskOut,12.7);
 assert.equal(a.reference.radius,29.2);assert.equal(a.model.size,29.2);
 assert.notEqual(a.id2,a.id3);assert.notEqual(a.reference.axisZ,a.model.rotZ);
 assert.equal(a.reference.axisZ,b.reference.axisZ);assert.equal(a.model.rotZ,b.model.rotZ);
 assert.notEqual(a.reference.x,b.reference.x);assert.notEqual(a.model.x,b.model.x);
 assert.equal(a.reference.driftOn,false);assert.deepEqual(plain(s),before);
});
test('both tiers respond to views and follower changes independently',()=>{
 const s=pairSettings();s.holes.referenceGrowth.views=21;s.holes.modelPreview.growth.views=150;
 const a=M.together(s.holes,0,29.2);s.holes.referenceGrowth.views=149;s.holes.modelPreview.growth.views=499;
 const b=M.together(s.holes,0,29.2),c=M.together(s.holes,0,42);
 assert.equal(a.reference.ringSize,.45);assert.equal(b.reference.ringSize,1.26);
 assert.equal(a.model.diskOut,12.7);assert.equal(b.model.diskOut,14.2);
 assert.equal(a.model.size,b.model.size);assert.equal(a.reference.radius,b.reference.radius);
 assert.equal(c.model.size,42);assert.equal(c.reference.radius,42);
 assert.equal(b.model.diskOut,c.model.diskOut);assert.equal(b.reference.ringSize,c.reference.ringSize);
});
test('simultaneous mode renders the model and the reference on the same animation clock',()=>{
 const p=G.Raven.RavenScene.prototype,s=pairSettings(),seen=[],draws=[];
 const scene={s,time:0,speed:1,playing:true,roll:{vel:0},_last:1000,
 engine:{render(t){seen.push({time:t,model:plain(this.holes[0])});}},friendSizeAt:i=>26+i*3.2,
 _updateSky(){},_updateFeed(){},_composeBg(){},_drawOverlay(){},_loop(){},ovScale:1,
 fx:{style:{},width:390,height:844,getContext(){return {setTransform(){},clearRect(){},save(){},restore(){},beginPath(){},rect(){},arc(){},moveTo(){},clip(){}};}},gl:{liveSky:true},
 referenceHole:{draw(...args){draws.push(args);}},_drawClips(){p._drawClips.call(this);}};
 G.AsgardReference={};context.requestAnimationFrame=()=>{};
 p._loop.call(scene,1016);p._loop.call(scene,1055);
 assert.equal(draws.length,2);assert.equal(scene._tagged.length,3);assert.equal(scene._tagged[0].label,'Tier 1');assert.equal(scene._tagged[1].label,'Tier 2');assert.equal(scene._tagged[2].label,'Tier 3');
 assert.equal(draws[0][1],scene.gl);assert.equal(draws[0][3],seen[0].time);assert.equal(draws[1][3],seen[1].time);
 assert.ok(seen[1].time>seen[0].time);assert.equal(seen[0].model.rotZ,seen[1].model.rotZ);
 assert.equal(seen[0].model.size,draws[0][2].radius);assert.equal(scene.fx.style.mixBlendMode,'normal');
});

test('mixed sky includes diskless holes and small, middle and large disks from both feeding tiers',()=>{
 const s=pairSettings(),before=plain(s),group=M.population(s.holes,0,n=>26+Math.min(16,n/100));
 assert.deepEqual([...new Set(group.entries.map(e=>e.tier))],[1,2,3]);assert.equal(group.entries.length,4);assert.equal(group.catalog.length,9);
 for(const e of group.entries.filter(e=>e.tier===1))for(const k of ['disk','ring','corona','glow','jets','flare'])assert.equal(e.hole[k],0);
 const refs=group.catalog.filter(e=>e.tier===2),models=group.catalog.filter(e=>e.tier===3);
 assert.equal(refs[0].reference.ringSize,.45);assert.equal(refs[2].reference.ringSize,1.26);assert.ok(refs[1].reference.ringSize>.45&&refs[1].reference.ringSize<1.26);
 assert.equal(models[0].hole.diskOut,12.7);assert.equal(models[2].hole.diskOut,14.2);assert.ok(models[1].hole.diskOut>12.7&&models[1].hole.diskOut<14.2);
 assert.ok(new Set(group.catalog.map(e=>e.radius)).size>2);assert.deepEqual(plain(s),before);
});
test('every mixed hole moves left to right and wraps only after its full field leaves the screen',()=>{
 const s=pairSettings();s.holes.together.speed=18;
 const a=M.population(s.holes,0),b=M.population(s.holes,.01);
 a.entries.forEach((e,i)=>{assert.ok(Math.abs((b.entries[i].x-e.x)*390-.18)<1e-8);const lap=M.population(s.holes,e.cycle/18);assert.ok(Math.abs(e.x-lap.entries[i].x)<1e-8);assert.equal(e.span,390+2*e.pad);});
 for(let t=0;t<60;t+=.5){const x=M.population(s.holes,t),y=M.population(s.holes,t+.5);
  x.entries.forEach((e,i)=>{const next=y.entries[i];if(next.x<e.x){assert.ok(e.x*390-e.pad>390-9);assert.ok(next.x*390+next.pad<9);}});
 }
});
test('random axes stay fixed across movement and a full lap and follower sizing remains independent of views',()=>{
 const s=pairSettings(),size=n=>n<100?28:42,a=M.population(s.holes,0,size),b=M.population(s.holes,300,size);
 const axes=e=>e.hole?[e.hole.rotX,e.hole.rotY,e.hole.rotZ]:[e.reference.tilt,e.reference.axisY,e.reference.axisZ];
 a.catalog.forEach((e,i)=>{assert.deepEqual(axes(e),axes(b.catalog[i]));assert.equal(e.radius,size(e.followers));});
 assert.equal(new Set(a.catalog.map(e=>JSON.stringify(axes(e)))).size,9);
 s.holes.together.variedFollowers=false;s.holes.together.followers=50;const equal=M.population(s.holes,0,size);
 equal.entries.forEach(e=>assert.equal(e.radius,28));assert.deepEqual(equal.entries.map(e=>e.views),a.entries.map(e=>e.views));
});
test('live sky sends all mixed tiers to their original renderers and composites reference fields',()=>{
 const p=G.Raven.RavenScene.prototype,s=pairSettings();s.holes.together.variety=true;const draws=[],rendered=[];
 const cx={setTransform(){},clearRect(){},drawImage(){},save(){},restore(){},beginPath(){},rect(){},arc(){},moveTo(){},clip(){}};context.document={createElement:()=>({width:0,height:0,getContext:()=>cx})};
 const scene={s,time:0,speed:1,playing:true,roll:{vel:0},_last:1000,engine:{render(t){rendered.push({time:t,holes:plain(this.holes)});}},friendSizeAt:i=>26+i*3.2,
 _updateSky(){},_updateFeed(){},_composeBg(){},_drawOverlay(){},_loop(){},ovScale:1,
 fx:{style:{},width:390,height:844,getContext:()=>cx},gl:{width:390,height:844},referenceHole:{draw(...a){draws.push(a);}},_drawClips(){p._drawClips.call(this);}};
 G.AsgardReference={};context.requestAnimationFrame=()=>{};p._loop.call(scene,1016);
 assert.equal(scene._errShown,undefined);assert.equal(rendered[0].holes.filter(h=>h._quietPreview).length,2);assert.equal(rendered[0].holes.filter(h=>h._modelPreview).length,1);
 assert.ok(rendered[0].holes.length<=G.BH.MAXH);assert.ok(draws.length>=1);assert.ok(scene._tagged.some(t=>t.label==='Tier 1'));
 assert.ok(scene._tagged.some(t=>t.label==='Tier 2'));assert.ok(scene._tagged.some(t=>t.label==='Tier 3'));
 for(const d of draws)assert.equal(d[3],rendered[0].time);
});

test('mixed sky keeps manual angles and manual ring sizes editable without stopping drift',()=>{
 const s=pairSettings();s.holes.modelPreview.randomAxis=false;s.holes.modelPreview.growth.on=false;Object.assign(s.holes.modelPreview.look,{rotX:61,rotY:12,rotZ:-33,diskOut:17});
 s.holes.orientation.random=false;s.holes.referenceGrowth.on=false;Object.assign(s.holes.referencePreview,{tilt:37,axisY:7,axisZ:24,ringSize:.8});
 const a=M.population(s.holes,0),b=M.population(s.holes,1);
 for(const e of a.entries.filter(e=>e.tier===3)){assert.equal(e.hole.rotX,61);assert.equal(e.hole.rotY,12);assert.equal(e.hole.rotZ,-33);assert.equal(e.hole.diskOut,17);}
 for(const e of a.entries.filter(e=>e.tier===2)){assert.equal(e.reference.tilt,37);assert.equal(e.reference.axisZ,24);assert.equal(e.reference.ringSize,.8);}
 assert.notEqual(a.entries[0].x,b.entries[0].x);
});

test('sky count is capped at four, with a fifth only alongside small spheres',()=>{
 const s=pairSettings();s.holes.behavior.count=4;
 for(let t=0;t<300;t+=2)assert.equal(M.population(s.holes,t).entries.length,4);
 s.holes.behavior.count=20;
 for(let t=0;t<300;t+=2){
  const big=M.population(s.holes,t,()=>42);assert.equal(big.entries.length,4);
  const mixed=M.population(s.holes,t,n=>n<200?28:42);
  assert.ok(mixed.entries.length<=5);
  if(mixed.entries.length===5)assert.ok(mixed.entries.filter(e=>e.radius<=32.5).length>=2);
 }
});
test('all saved view-growth examples reappear over time without changing axes in flight',()=>{
 const s=pairSettings();s.holes.together.speed=18;const views=new Set(),last=new Map();
 const axes=e=>JSON.stringify(e.hole?[e.hole.rotX,e.hole.rotY,e.hole.rotZ]:[e.reference.tilt,e.reference.axisY,e.reference.axisZ]);
 for(let t=0;t<400;t+=.5)for(const e of M.population(s.holes,t).entries){
  views.add(e.views);if(last.has(e.id))assert.equal(axes(e),last.get(e.id));last.set(e.id,axes(e));
 }
 assert.deepEqual([...views].sort((a,b)=>a-b),[0,10,20,21,85,149,150,325,499]);
});
test('sustained slow frames do not reduce the saved rendering sharpness',()=>{
 const p=G.Raven.RavenScene.prototype,s=pairSettings();let rendered=0;
 const scene={s,contacts:[],time:0,speed:1,playing:true,roll:{vel:0},engine:{render(){rendered++;}},friendSizeAt:()=>32.5,
  _updateSky(){},_updateFeed(){},_composeBg(){},_drawClips(){},_drawOverlay(){},_loop(){},_resize(){throw Error('Sharpness was silently changed');}};
 const scale=s.holes.behavior.renderScale;context.requestAnimationFrame=()=>{};
 for(let t=100;t<30100;t+=100)p._loop.call(scene,t);
 assert.equal(scene._aq,1);assert.equal(s.holes.behavior.renderScale,scale);assert.equal(rendered,300);
});
