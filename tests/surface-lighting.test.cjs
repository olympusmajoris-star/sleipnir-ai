const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const context = vm.createContext({ window: {} });
for (const file of ['bh-engine.js', 'raven-scene.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
}
const { BH_DEFAULTS, surfaceLighting, projectedProfile, settleLighting, ANGLE_STUDIES } = context.window.BH;
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
test('oblique opening projects as an oval, aligned with the disk rather than a circle',()=>{
  const h=hole({...ANGLE_STUDIES.diagonal});const p=projectedProfile(h);
  assert.ok(p[2]<.7);assert.ok(Math.abs(Math.atan2(p[1],p[0])-h.rotZ*Math.PI/180)<1e-6);
  assert.equal(projectedProfile(hole({rotX:90}))[2],1);
  assert.equal(projectedProfile({...h,_vi:2})[2],1);
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
  assert.equal(result.rotX,38);assert.equal(result.rotZ,-37);assert.equal(result.disk,1);
  assert.equal(JSON.stringify(scene.s),before);
});
