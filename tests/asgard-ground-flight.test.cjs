const {test}=require('node:test');
const assert=require('node:assert/strict');
const {skyHarness}=require('./helpers/sky-harness.cjs');
test('the lower horizon anchors all six feet to the floor above navigation on phone sizes',()=>{
 for(const [width,height]of[[360,780],[390,844],[412,915]]){
  const h=skyHarness({width,height}),s=h.openShare();
  assert.equal(s.geoms.length,6);assert.ok(s.floor.hz>=height*.58);
  for(const g of s.geoms){assert.ok(g.y+g.h>s.floor.hz);assert.ok(g.y+g.h<height-130);assert.ok(g.y>height*.54);}
  assert.ok(Math.min(...s.geoms.map(g=>g.h))<Math.max(...s.geoms.map(g=>g.h))*.65);
  for(const o of s.orbs)assert.ok(o.y+s.orbTop+o.d/2<s.floor.hz);
 }
});
test('a visible sky hole opens from sharing; return restores the same selected favourites',()=>{
 const h=skyHarness(),s=h.openShare();const first=s.figBoxes.at(-1);
 h.tap(first.x+first.w/2,first.y+first.h/2);assert.equal(s.pick.length,1);
 const o=s.orbs.find(o=>o.x>o.d/2&&o.x<h.K.W-o.d/2);assert.ok(o);
 h.tap(o.x,o.y+s.orbTop);const f=h.sc.ST.flight;assert.ok(f);assert.equal(f.orb.person.id,o.person.id);
 assert.equal(f.target[1],o.y+s.orbTop);assert.ok(f.ground);assert.equal(h.sc.SH(),s);
 h.tick(f.ms+20);assert.equal(f.dir,0);
 h.tap(f.ret.x+f.ret.w/2,f.ret.y+f.ret.h/2);assert.equal(f.dir,-1);
 h.tick(f.ms+20);assert.equal(h.sc.ST.flight,null);assert.equal(h.sc.SH(),s);assert.equal(s.pick.length,1);
});
test('floor flight starts at the actual ground view and passes nearer people first',()=>{
 const h=skyHarness(),s=h.openShare(),o=s.orbs[0];
 h.sc.buttons?.find(b=>b.label==='Fly into a hole')?.onclick();
 if(!h.sc.ST.flight){h.tap(o.x,o.y+s.orbTop);}
 const f=h.sc.ST.flight;assert.ok(f);const m=h.sc.testGeometry,cam=m.groundCam(f,0,h.K.W,h.K.H);
 assert.equal(cam.s,1);assert.equal(cam.z,0);assert.ok(Math.abs(cam.bank)<1e-12);
 const p=m.groundPoint(f.ground,cam,h.K.W,100,s.nearY);assert.ok(Math.abs(p[0]-100)<1e-7);assert.ok(Math.abs(p[1]-s.nearY)<1e-7);
 for(let i=0;i<=100;i++){
  const c=m.groundCam(f,i/100,h.K.W,h.K.H);assert.ok([c.x,c.z,c.eye,c.s,c.bank,...c.c].every(Number.isFinite));
 }
 const end=m.groundCam(f,1,h.K.W,h.K.H);assert.deepEqual(Array.from(end.c),Array.from(f.target));
 assert.ok(end.z>Math.max(...f.ground.figures.map(p=>p.z)));
});
test('swiping the sharing layer does not enter a black hole',()=>{
 const h=skyHarness(),s=h.openShare(),o=s.orbs[0],p={x:o.x,y:o.y+s.orbTop};
 h.sc.pointer.down(p);h.sc.pointer.move({...p,x:p.x+30});h.sc.pointer.up({...p,x:p.x+30});
 assert.equal(h.sc.ST.flight,null);
});
