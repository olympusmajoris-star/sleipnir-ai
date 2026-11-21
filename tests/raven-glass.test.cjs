const {test}=require('node:test'),assert=require('node:assert/strict');
const glass=require('../raven-glass-1120.js'),{harness}=require('./helpers/dial-harness.cjs');
const base={'anim.rise':1600,'anim.slide':.4,'glass.entry.style':'slide','glass.entry.duration':0,'dial.entry.duration':2600,'dial.entry.waitGlass':true};
test('Glass keeps existing rise timing and dial can wait until it settles',()=>{
 assert.equal(glass.duration(base,'glass'),640);assert.equal(glass.delay(base,'dial'),640);
 assert.equal(glass.entry(base,'glass',0,390,844).y,844);assert.equal(glass.entry(base,'glass',640,390,844).y,0);
 assert.equal(glass.entry({...base,'dial.entry.style':'blueprint'},'dial',600,390,844).alpha,0);
 assert.equal(glass.entry({...base,'dial.entry.style':'blueprint'},'dial',3240,390,844).progress,1);
 assert.equal(glass.duration({...base,'anim.rise':2000},'glass'),800);
 assert.equal(glass.duration({...base,'glass.entry.duration':320},'glass'),320);
});
test('Four slide directions, settled offset, instant close and independent delays',()=>{
 for(const [direction,axis,sign] of [['left','x',-1],['right','x',1],['top','y',-1],['bottom','y',1]]){
  const p={...base,'glass.entry.direction':direction,'glass.entry.distance':.5,'glass.finalY':23};
  const start=glass.entry(p,'glass',0,390,844),end=glass.entry(p,'glass',640,390,844);
  assert.equal(start[axis]-(axis==='y'?23:0),(axis==='x'?390:844)*.5*sign);assert.equal(Math.abs(end.x),0);assert.equal(end.y,23);
 }
 const p={...base,'glass.entry.style':'instant','glass.entry.delay':200};
 assert.equal(glass.entry(p,'glass',199,390,844).alpha,0);assert.equal(glass.entry(p,'glass',200,390,844).alpha,1);assert.equal(glass.entry(p,'glass',200,390,844,0).alpha,0);
});
test('All construction outlines finish before color and remain complete afterwards',()=>{
 const p={'build.colorAt':.72,'build.stagger':.035};
 for(let i=0;i<5;i++){
  const ready=glass.formation(p,.72,i);assert.equal(ready.trace,1);assert.equal(ready.assemble,1);assert.equal(ready.color,0);
  const done=glass.formation(p,1,i);assert.equal(done.color,1);assert.equal(done.assemble,1);
 }
 assert.equal(glass.formation(p,0).trace,0);assert.ok(glass.formation(p,.86).color>.4);
});
test('Refraction bends actual source samples only within the rounded glass bevel',()=>{
 const box={l:10,r:90,t:10,b:90,radius:12};
 assert.equal(glass.edgeSample(50,50,box,10,1),null);assert.equal(glass.edgeSample(1,1,box,10,1),null);assert.equal(glass.edgeSample(10,10,box,10,1),null);
 const q=glass.edgeSample(15,50,box,10,1);assert.ok(q.x>15);assert.equal(q.y,50);
 const still=glass.edgeSample(15,50,box,10,0);assert.equal(still.x,15);
 const data=new Uint8ClampedArray(100*100*4);for(let y=0;y<100;y++)for(let x=0;x<100;x++){data[(y*100+x)*4]=x*2;data[(y*100+x)*4+1]=y*2;data[(y*100+x)*4+3]=255;}
 assert.equal(glass.sample(data,100,100,q.x,q.y,0),q.x*2);assert.equal(glass.sample(data,100,100,q.x,q.y,1),100);assert.equal(glass.sample(data,100,100,-100,1000,1),198);
});
test('Actual render accepts every arrival style and all rotating shapes without invalid coordinates',()=>{
 const h=harness();h.dial.P['glass.refract']=0;
 for(const style of ['blueprint','follow','slide','materialize','grow','scan','trace','segments','instant']){
  h.dial.P['dial.entry.style']=style;h.dial.replay();const start=h.now();
  for(const at of [0,400,900,1800,3300])h.tick(start+at);
 }
 for(const axis of ['x','y','z','custom']){h.dial.P['s0.axis']=axis;h.tick(h.now()+1000);}
});
test('Arrivals and idle time do not dismiss; only a valid middle confirmation starts the exit',()=>{
 const h=harness();h.dial.P['glass.refract']=0;h.tick(5000);const d=h.dial,m=d.metrics(),e={pointerId:1};
 const middle={x:m.cx,y:m.cy},rim={x:m.cx+m.radius,y:m.cy};
 d.pointer.down(rim,e);d.pointer.up(rim,e);h.tick(6000);assert.equal(d.ST.dis,-1);assert.deepEqual(h.pages,[]);
 d.pointer.down({x:0,y:0},e);d.pointer.up({x:0,y:0},e);h.tick(7000);assert.equal(d.ST.dis,-1);
 d.pointer.down(middle,e);d.pointer.up({x:middle.x+25,y:middle.y},e);assert.equal(d.ST.dis,-1);
 d.pointer.down(middle,e);d.pointer.up(middle,e);assert.equal(d.ST.dis,0);assert.deepEqual(h.pages,[]);
 d.pointer.down(rim,e);assert.equal(d.ST.active,null);
 h.tick(7500);assert.deepEqual(h.pages,[]);h.tick(8300);assert.deepEqual(h.pages,['directory']);h.tick(9000);assert.deepEqual(h.pages,['directory']);
});
test('Turning selects and settles without navigating; entrance blocks premature taps',()=>{
 const h=harness();h.dial.P['glass.refract']=0;h.tick(500);let m=h.dial.metrics();const e={pointerId:3};
 h.dial.pointer.down({x:m.cx,y:m.cy},e);h.dial.pointer.up({x:m.cx,y:m.cy},e);assert.equal(h.dial.ST.dis,-1);
 h.tick(5000);m=h.dial.metrics();
 h.dial.pointer.down({x:m.cx+m.radius,y:m.cy},e);
 for(let i=1;i<=8;i++)h.dial.pointer.move({x:m.cx+Math.cos(i*.12)*m.radius,y:m.cy+Math.sin(i*.12)*m.radius},e);
 h.dial.pointer.up({x:m.cx+Math.cos(.96)*m.radius,y:m.cy+Math.sin(.96)*m.radius},e);h.tick(5500);
 assert.ok(h.dial.ST.ready);assert.equal(h.dial.ST.dis,-1);assert.deepEqual(h.pages,[]);
});
test('Preview exit returns to the entrance without opening any page',()=>{
 const h=harness();h.dial.P['glass.refract']=0;h.tick(4000);h.dial.toolbar.find(b=>b.label==='Play exit').onclick();h.tick(5300);
 assert.equal(h.dial.ST.dis,-1);assert.equal(h.dial.ST.closing,false);assert.deepEqual(h.pages,[]);
});
