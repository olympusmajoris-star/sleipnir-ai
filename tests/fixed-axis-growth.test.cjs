const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const context=vm.createContext({window:{}});
for(const file of ['bh-engine.js','reference-hole.js','reference-variants.js','raven-scene.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);
const V=context.window.AsgardVariants,R=context.window.Raven,base={radius:40,x:.5,y:.235,ringSize:1.26,density:1.05,speed:1.35,glow:1,thickness:1};
test('each streamer gets a distinct fixed orientation, independent of position, time and views',()=>{
 const axes=new Set();
 for(let i=0;i<200;i++){
  const id='streamer-'+i,a=V.orientationFor(id,1);axes.add(JSON.stringify(a));
  assert.ok(a.tilt>=12&&a.tilt<78&&a.axisY>=-45&&a.axisY<45&&a.axisZ>=-180&&a.axisZ<180);
  const n=V.basis(a).n;assert.ok(n[2]>.14,'keep all random views within the supported disk projection');
  for(const views of [21,85,149]){
   const s=V.liveSettings({...base,x:views/200,time:views*100},id,{random:true,seed:1},{on:true},views);
   for(const key of ['view3d','tilt','axisY','axisZ'])assert.equal(s[key],a[key]);
   assert.equal(s.radius,40);
  }
 }
 assert.equal(axes.size,200);
 assert.ok(JSON.stringify(V.orientationFor('streamer-1',1))!==JSON.stringify(V.orientationFor('streamer-1',2)));
});
test('tier 2 hits both approved endpoints and grows monotonically without changing follower size or style',()=>{
 const before=JSON.stringify(base),start=V.tier2At(base,21),end=V.tier2At(base,149);
 assert.equal(start.ringSize,.45);assert.equal(start.density,.65);assert.equal(end.ringSize,1.26);assert.equal(end.density,1.05);
 let prev=start;
 for(let views=22;views<=149;views++){
  const s=V.tier2At(base,views);assert.ok(s.ringSize>prev.ringSize&&s.density>prev.density);
  for(const key of ['radius','x','y','speed','glow','thickness'])assert.equal(s[key],base[key]);prev=s;
 }
 assert.equal(V.tier2At(base,150).ringSize,1.26);assert.equal(V.tier2At(base,0).ringSize,.45);
 assert.equal(JSON.stringify(base),before);
});
test('manual orientation and manual disk settings remain available',()=>{
 const s={...base,view3d:false,tilt:28,axisY:7,axisZ:-50};
 assert.deepEqual(V.liveSettings(s,'freya',{random:false},{on:false}),s);
});
test('scene preserves per-contact axes across time and tier changes and leaves angle studies alone',()=>{
 const scene=Object.create(R.RavenScene.prototype);scene.s={holes:{orientation:{random:true,seed:1}}};
 const out=[],c={id:'baldr',name:'Baldr',counts:{viewers:21}};
 scene._expand({seed:99,_fid:'initial',x:.2,y:.3,size:32.5},c,out,[]);
 const first=scene._orientHoles(out)[0],axes=[first.rotX,first.rotY,first.rotZ];
 for(const time of [0,100,10000]){
  scene.time=time;const next={...first,seed:14,_fid:'changed',x:.9,y:.1,size:52.5,rotX:1,rotY:2,rotZ:3};
  scene._orientHoles([next]);assert.deepEqual([next.rotX,next.rotY,next.rotZ],axes);
  assert.equal(next.x,.9);assert.equal(next.size,52.5);
 }
 const study={_angleStudy:true,rotX:7,rotY:0,rotZ:8};scene._orientHoles([study]);assert.equal(study.rotX,7);assert.equal(study.rotZ,8);
});
test('live reference preview uses growth and fixed identity without mutating saved settings',()=>{
 const calls=[],ctx={setTransform(){},clearRect(){}};
 const scene=Object.create(R.RavenScene.prototype);
 scene.fx={style:{},width:390,height:844,getContext:()=>ctx};scene.ovScale=1;scene.bgc={};
 scene.s={holes:{referencePreview:{...base,on:true},referenceGrowth:{on:true,views:21,streamerId:'baldr'},orientation:{random:true,seed:1},behavior:{driftViews:true,speed:8,direction:1,wobble:.35},rule:{lens:.9,edge:1.6}}};
 scene.referenceHole={draw:(x,b,s,t)=>calls.push({s,t})};const original=JSON.stringify(scene.s.holes.referencePreview);
 scene.time=0;scene._drawClips();scene.time=120;scene.s.holes.referenceGrowth.views=149;scene._drawClips();
 assert.equal(calls[0].s.ringSize,.45);assert.equal(calls[1].s.ringSize,1.26);
 for(const k of ['tilt','axisY','axisZ','radius'])assert.equal(calls[0].s[k],calls[1].s[k]);
 assert.equal(JSON.stringify(scene.s.holes.referencePreview),original);
});
test('random axes preserve black centers and visible disks in the software renderer',()=>{
 const n=65,W=390,H=844,sky=new Uint8ClampedArray(W*H*4),atlas=new Uint8ClampedArray(512*256*4);
 for(let y=0;y<256;y++)for(let x=0;x<512;x++)atlas.set([180,110,140,y>53&&y<220?220:0],(y*512+x)*4);
 for(let i=0;i<18;i++){
  const s=V.liveSettings({...base,lens:0,driftOn:false},'streamer-'+i,{random:true},{on:true},i%2?21:149),out=new Uint8ClampedArray(n*n*4);
  V.renderSoftware(out,{},atlas,sky,W,H,s,70,n);
  const center=(32*n+32)*4;assert.deepEqual(Array.from(out.slice(center,center+4)),[0,0,0,255]);
  let lit=0;for(let j=0;j<out.length;j+=4)if(out[j]>20&&out[j+3]>15)lit++;
  assert.ok(lit>25,'disk must remain visible at random orientation '+i);
 }
});
