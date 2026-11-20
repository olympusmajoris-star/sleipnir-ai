const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const motion = require('../raven-motion-1120.js');
const defaults = { spinOn: true, period: 22, dir: 1, start: 11.459, tilt: -10.886, axis: 'y', response: .18 };
const near = (a,b,tol=1e-9) => a.forEach((v,i) => assert.ok(Math.abs(v-b[i])<tol, `${v} != ${b[i]}`));
const advance = (s,p,seconds,hz=60) => { for(let i=0;i<seconds*hz;i++)motion.advance(s,p,1/hz); };
test('Default geometry stays equal to the original Dart Y-spin and X-tilt', () => {
  const s=motion.create(defaults); advance(s,defaults,15);
  const phase=(defaults.start*Math.PI/180)+15*2*Math.PI/22, tilt=defaults.tilt*Math.PI/180;
  for(const v of [[1,0,0],[0,1,0],[0,0,1],[.2,-.5,.7]]) {
    const x=v[0]*Math.cos(phase)+v[2]*Math.sin(phase), z=v[2]*Math.cos(phase)-v[0]*Math.sin(phase);
    near(motion.rotate(s,defaults,v),[x,v[1]*Math.cos(tilt)-z*Math.sin(tilt),v[1]*Math.sin(tilt)+z*Math.cos(tilt)]);
  }
});
test('Changing speed, direction, axis, or pause never resets the visible pose', () => {
  const p={...defaults},s=motion.create(p); advance(s,p,9);
  for(const change of [{period:2},{dir:-1},{axis:'x'},{axis:'custom',axisX:.2,axisY:-.5,axisZ:.8},{spinOn:false}]) {
    const before=motion.rotate(s,p,[.2,.3,.4]); Object.assign(p,change);
    near(motion.rotate(s,p,[.2,.3,.4]),before);
  }
  const before=s.q.slice(); advance(s,p,3); near(s.q,before);
});
test('X, Y and Z quarter-turns follow the expected axes', () => {
  const cases=[['x',[0,1,0],[0,0,1]],['y',[0,0,1],[1,0,0]],['z',[1,0,0],[0,1,0]]];
  for(const [axis,v,want] of cases) {
    const p={...defaults,axis,start:0,tilt:0,period:4}; const s=motion.create(p); advance(s,p,1); near(motion.rotate(s,p,v),want);
  }
});
test('Independent shapes, custom zero-axis fallback and long-run stability', () => {
  const p={...defaults,axis:'custom',axisX:0,axisY:0,axisZ:0}; const s=motion.create(p), untouched=motion.create(defaults);
  const before=untouched.q.slice(); advance(s,p,120); near(untouched.q,before);
  assert.ok(s.q.every(Number.isFinite)); assert.ok(Math.abs(Math.hypot(...s.q)-1)<1e-10);
  assert.ok(Math.abs(Math.hypot(...motion.rotate(s,p,[.4,.5,.7]))-Math.hypot(.4,.5,.7))<1e-9);
});
test('Smoothed speed reversal is consistent at 30 and 120 fps', () => {
  const p={...defaults},a=motion.create(p),b=motion.create(p);p.dir=-1;
  advance(a,p,2,30);advance(b,p,2,120);near(a.q,b.q,1e-9);
});
test('Actual dial registration wires all four controls and advances once per update', () => {
  const K={TAU:Math.PI*2,D2R:Math.PI/180,W:390,H:844,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),screens:{},screen(sc){const p={};sc.spec((g,s,t,k,l,type,d)=>p[k]=d);sc.P=p;this.screens[sc.id]=sc;return sc;}};
  const context=vm.createContext({window:{StudioKit:K,RavenMotion:motion},Path2D:class{moveTo(){}lineTo(){}arc(){}closePath(){}bezierCurveTo(){}quadraticCurveTo(){}rect(){}},performance:{now:()=>0}});
  vm.runInContext(fs.readFileSync(path.join(root,'raven-dial-1119.js'),'utf8'),context);
  const dial=K.screens.dial;dial.onLoad();
  for (const sub of [undefined,'0','1','2','3']) assert.ok(Object.values(dial.bounds('shape',sub)).every(Number.isFinite));
  for(let i=0;i<4;i++){assert.equal(dial.P[`s${i}.axis`],'y');assert.equal(dial.P[`s${i}.yaw`],0);assert.equal(dial.P[`s${i}.roll`],0);}
  dial.update(1/60,17);dial.P['s1.axis']='x';dial.onSet('s1.axis');dial.update(1/60,34);
  assert.ok(Number.isFinite(dial.ST.amb));
});
test('Saved tier previews preserve approved model parameters and all four stay visible', () => {
  const h={dashboards:{viewers:{tiers:[{look:{lens:1,reach:.55}}]}},quietPreview:{size:40},referencePreview:{radius:40,lens:.45},referenceGrowth:{on:true,views:149,ringEnd:1.26,densityEnd:1.05},modelPreview:{id:'saved-third',x:.5,y:.235,look:{diskIn:3,diskOut:11,corona:1.2}},tierModels:{4:{id:'saved-fourth',x:.5,y:.235,look:{diskIn:1.8,diskOut:8,diskOpacity:.08}}}};
  const original=JSON.stringify(h);
  const K={W:390,H:844,clamp:(v,a,b)=>Math.max(a,Math.min(b,v))};
  const w={StudioKit:K,BH:{BH_DEFAULTS:{}}};const context=vm.createContext({window:w});
  vm.runInContext(fs.readFileSync(path.join(root,'model-preview.js'),'utf8'),context);
  w.AsgardVariants={tier2At:(input,views,cfg)=>({...input,ringSize:cfg.ringEnd,density:cfg.densityEnd})};
  vm.runInContext(fs.readFileSync(path.join(root,'raven-tiers-1120.js'),'utf8'),context);
  const poses=w.RavenSavedTiers.models(h,{'hh.lens':true,'hh.size':1,'hh.drift':true},{cy:414,radius:111},12);
  assert.deepEqual(Array.from(poses,p=>p.tier),[1,2,3,4]);
  assert.equal(poses[3].look.diskOpacity,h.tierModels['4'].look.diskOpacity);
  assert.equal(poses[2].look.corona,h.modelPreview.look.corona);
  assert.equal(poses[0].look.disk,0);
  for(const p of poses){assert.ok(p.c[0]>0&&p.c[0]<390);assert.ok(p.c[1]>0&&p.c[1]<303);}
  assert.equal(JSON.stringify(h),original);
  const solo=w.RavenSavedTiers.models(h,{'hh.tier':4,'hh.lens':false},{cy:414,radius:111},12);
  assert.equal(solo.length,1);assert.equal(solo[0].look.lens,0);assert.ok(solo[0].r>poses[3].r);
});
