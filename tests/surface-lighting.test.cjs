const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const context = vm.createContext({ window: {} });
for (const file of ['bh-engine.js', 'raven-scene.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
}
const { BH_DEFAULTS, surfaceLighting, projectedProfile, settleLighting, materialFor, supplyAngle, ANGLE_STUDIES } = context.window.BH;
const hole = changes => ({ ...BH_DEFAULTS, x:.5, y:.5, size:32.5, disk:0, ...changes });
const light = (h, pixels=null, others=[]) => surfaceLighting(h, [h,...others], pixels,390,844,{crest:2.2});
function sky(value=0, spot=null, spotRadius=4) {
  const p=new Uint8ClampedArray(78*169*4);
  for(let y=0;y<169;y++) for(let x=0;x<78;x++) {
    const i=(y*78+x)*4, bright=spot && Math.hypot(x-spot[0],y-spot[1])<spotRadius;
    p[i]=p[i+1]=p[i+2]=bright?255:value; p[i+3]=255;
  } return p;
}
test('black sky and unlit/dust-only disks produce no crest at any angle',()=>{
  for(const rotX of [0,12,45,88,90]) for(const disk of [0,1]) {
    const h=hole({rotX,disk,dust:disk,glow:0}); const l=light(h,sky());
    assert.equal(l.crest[0],0); assert.equal(l.surfaceLight[3],0);
  }
});
test('uniform sky, even bright, cannot invent a directional lamp',()=>{
  const l=light(hole({rotX:12}),sky(220));
  assert.equal(l.crest[0],0); assert.equal(l.surfaceLight[3],0);
});
test('a luminous disk gives an inclined crest but none face-on',()=>{
  const edge=light(hole({rotX:12,disk:1}));
  const head=light(hole({rotX:90,disk:1}));
  assert.ok(edge.crest[0]>0); assert.equal(head.crest[0],0);
});
test('rotating the disk changes the crest direction',()=>{
  const a=light(hole({rotX:12,rotZ:0,disk:1}));
  const b=light(hole({rotX:12,rotZ:60,disk:1}));
  assert.ok(Math.abs((b.crest[1]-a.crest[1])-Math.PI/3)<1e-6);
});
test('passing bright patches move the head-on reflection without adding a crest',()=>{
  const h=hole({rotX:90});
  const left=light(h,sky(0,[29,84])); const right=light(h,sky(0,[49,84]));
  assert.ok(left.surfaceLight[3]>0); assert.ok(right.surfaceLight[3]>0);
  assert.ok(left.surfaceLight[0]<-.5); assert.ok(right.surfaceLight[0]>.5);
  assert.equal(left.crest[0],0); assert.equal(right.crest[0],0);
  assert.equal(light(h,sky()).surfaceLight[3],0);
});
test('nearby emitting holes illuminate, hidden or dust-only neighbors do not',()=>{
  const h=hole({rotX:90}); const other=hole({x:.8,disk:1,size:40});
  assert.ok(light(h,null,[other]).surfaceLight[3]>0);
  assert.equal(light(h,null,[{...other,opacity:0}]).surfaceLight[3],0);
  assert.equal(light(h,null,[{...other,dust:1}]).surfaceLight[3],0);
});
test('small nearby lights between the old sampling rings are detected',()=>{
  const h=hole({rotX:90});
  const l=light(h,sky(0,[52,84],1.5));
  assert.ok(l.surfaceLight[3]>0); assert.ok(l.surfaceLight[0]>.5);
});
test('disabled, zero-brightness, unformed and invisible disks cannot light themselves',()=>{
  for(const change of [{disk:0},{diskBright:0},{diskOpacity:0},{opacity:0},{form:0}]) {
    assert.equal(light(hole({rotX:12,disk:1,...change})).crest[0],0);
  }
});
test('clip gating is applied before lighting, preventing a phantom disk crest',()=>{
  const scene=Object.create(context.window.Raven.RavenScene.prototype);
  scene.time=0; scene._dtLast=.016; scene._sampleSky=()=>null; scene.friendSizeAt=()=>32.5;
  scene.s={holes:{rule:{on:true,lens:1,reach:1,edge:1,taper:0,tiltMin:12,tiltMax:12,tumble:0},
    behavior:{sizeScale:1},dashboards:{friends:{tiers:[{}]}},clips:{on:true}}};
  const h=hole({_vi:1,seed:1,disk:1});
  const result=scene._lightHoles(scene._gateByFuel([h]));
  assert.equal(result[0].disk,0); assert.equal(result[0].crest[0],0);
});
test('the sphere never flattens when the disk or camera angle changes',()=>{
  for(const rotX of [0,7,32,60,90])for(const rotY of [-45,0,45])for(const rotZ of [-80,0,80]){
    const p=projectedProfile(hole({rotX,rotY,rotZ,openingAspect:.4}));
    assert.deepEqual(Array.from(p),[1,0,1,0]);
  }
});
test('the crest stays on the exposed rim when competing source positions change',()=>{
  const h=hole({rotX:38,rotZ:-37,disk:1});
  const left=light(h,sky(0,[29,84])),right=light(h,sky(0,[49,84]));
  assert.equal(left.crest[1],right.crest[1]);
});
test('light does not blink or chase a source that switches sides every quarter-second',()=>{
  const h=hole({rotX:38,rotZ:-37,disk:1});
  const left=light(h,sky(0,[29,84])),right=light(h,sky(0,[49,84]));
  let p=settleLighting(left,null,1/60);
  for(let i=0;i<600;i++){
    const n=settleLighting(Math.floor(i/15)%2?right:left,p,1/60);
    assert.ok(Math.abs(n.crest[0]-p.crest[0])<.04);
    assert.ok(n.surfaceLight[0]<0,'reflection must not chase brief opposite flashes');p=n;
  }
  const off=light(hole({rotX:90}),sky());
  for(let i=0;i<600;i++)p=settleLighting(off,p,1/60);
  assert.equal(p.crest[0],0);assert.equal(p.surfaceLight[3],0);
});
test('angle practice keeps its chosen perspective and luminous disk without changing saved settings',()=>{
  const scene=Object.create(context.window.Raven.RavenScene.prototype);
  scene.time=0;scene.friendSizeAt=()=>32.5;
  scene.s={holes:{rule:{on:true,lens:1,reach:1,edge:1,taper:0,tiltMin:4,tiltMax:70},behavior:{sizeScale:1},dashboards:{friends:{tiers:[{}]}},clips:{on:true}}};
  const before=JSON.stringify(scene.s);
  const h=hole({...ANGLE_STUDIES.diagonal,_angleStudy:true,_vi:-1});
  const result=scene._gateByFuel([h])[0];
  assert.equal(result.rotX,32);assert.equal(result.rotZ,-37);assert.equal(result.disk,1);
  assert.equal(JSON.stringify(scene.s),before);
});
test('cold foreground gas respects tier, gas toggle, pairs and footage',()=>{
  const scene=Object.create(context.window.Raven.RavenScene.prototype);
  scene.time=0;scene.friendSizeAt=i=>27.5+i*5;
  scene.s={holes:{mode:'focus',rule:{on:true,lens:1,reach:1,edge:1,taper:0,dust:0},
    behavior:{sizeScale:1},gas:{on:true},dashboards:{friends:{tiers:Array.from({length:6},()=>({}))}},clips:{on:true}}};
  const inputs=Array.from({length:6},(_,i)=>hole({_vi:-1,size:27.5+i*5,rotX:7,rotZ:-37}));
  const before=JSON.stringify(scene.s),result=scene._gateByFuel(inputs);
  assert.equal(result[0].gasDisk,0);
  for(let i=1;i<6;i++){
    assert.ok(result[i].gasDisk>result[i-1].gasDisk);
    assert.equal(result[i].disk,0,'cold material must not become a luminous disk');
    assert.equal(result[i].rotX,7);assert.equal(result[i].rotZ,-37);
  }
  assert.equal(JSON.stringify(scene.s),before);
  for(const change of [{_vi:0},{_vi:3},{_pairB:true}]){
    const h=scene._gateByFuel([hole({_vi:-1,size:52.5,...change})])[0];assert.equal(h.gasDisk,0);
  }
  scene.s.holes.gas.on=false;
  assert.equal(scene._gateByFuel([hole({_vi:-1,size:52.5})])[0].gasDisk,0);
});
test('fine inner detail only resolves on large top-tier holes or enlarged angle practice',()=>{
  assert.equal(materialFor(hole({_fTier:5,size:32.5}))[2],0);
  assert.equal(materialFor(hole({_fTier:4,size:70}))[2],0);
  assert.ok(materialFor(hole({_fTier:5,size:52.5}))[2]>0);
  assert.equal(materialFor(hole({_angleStudy:true,size:32.5}))[2],0);
  assert.equal(materialFor(hole({_angleStudy:true,size:69}))[2],1);
});
test('feeding direction follows nearby gas and holds steady when gas is absent or uniform',()=>{
  const h=hole({rotX:32,rotZ:0,feedAngle:.7});
  const left=supplyAngle(h,sky(0,[14,84],5),390,844),right=supplyAngle(h,sky(0,[64,84],5),390,844);
  assert.ok(Math.cos(left)<-.8);assert.ok(Math.cos(right)>.8);
  for(const p of [null,sky(),sky(100)])assert.equal(supplyAngle(h,p,390,844),.7);
});
test('pausing freezes both the highlight and the feeding direction',()=>{
  const scene=Object.create(context.window.Raven.RavenScene.prototype);
  scene.s={holes:{rule:{crest:1}}};scene.playing=false;scene._dtLast=.05;
  scene._sampleSky=()=>sky(0,[49,84]);scene._sampleGas=()=>sky(0,[64,84],5);
  const h=hole({_fid:'pause',rotX:32,rotZ:0,disk:1});
  const previous={...light(h),_feedAngle:2};
  scene._holeLights=new Map([['pause:main',previous]]);
  scene._lightHoles([h]);
  assert.equal(h.feedAngle,2);assert.equal(h.crest[0],previous.crest[0]);assert.equal(h.crest[1],previous.crest[1]);
});
