const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const w={StudioKit:{W:390,H:844,clamp:(v,a,b)=>Math.max(a,Math.min(b,v))}};
const scope=vm.createContext({window:w,performance:{now:()=>0}});
for(const name of ['bh-engine.js','reference-variants.js','model-preview.js','raven-tiers-1120.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',name),'utf8'),scope);
const R=w.RavenSavedTiers;
const saved={refl:{on:true,size:.7,bright:.8,gloss:.7,blur:.6,rimSky:.5,catch:0},together:{speed:18},dashboards:{viewers:{tiers:[{look:{lens:1,reach:.55}}]}},quietPreview:{size:40},referencePreview:{radius:40,lens:.45},referenceGrowth:{on:true,views:149,ringEnd:1.26,densityEnd:1.05},modelPreview:{id:'third',x:.5,y:.235,look:{diskOut:11,corona:1.2}},tierModels:{4:{id:'fourth',x:.5,y:.235,look:{diskIn:1.8,diskOut:8,diskOpacity:.08}}}};
const geometry={cy:500,radius:110},params={'hh.lens':true,'hh.drift':true,'hh.speed':1,'hh.direction':1,'hh.wobble':0};
const at=(t,p=params,m)=>R.models(saved,p,geometry,t,m);
test('every tier floats in the requested direction and at the requested speed',()=>{
 const a=at(0),b=at(1),rev=at(1,{...params,'hh.direction':-1}),fast=at(1,{...params,'hh.speed':2});
 for(let i=0;i<4;i++){assert.ok(Math.abs(b[i].c[0]-a[i].c[0]-18)<1e-8);assert.ok(Math.abs(rev[i].c[0]-a[i].c[0]+18)<1e-8);assert.ok(Math.abs(fast[i].c[0]-a[i].c[0]-36)<1e-8);}
 assert.deepEqual(at(50,{...params,'hh.drift':false}),at(0,{...params,'hh.drift':false}));
});
test('speed, pause and direction edits preserve position before advancing',()=>{
 const state={distance:0,phase:0};R.advanceMotion(state,saved,params,4);const before=at(4,params,state);
 const reversed={...params,'hh.direction':-1,'hh.speed':2};
 assert.deepEqual(at(4,reversed,state).map(q=>q.c),before.map(q=>q.c));
 R.advanceMotion(state,saved,reversed,.5);
 assert.ok(Math.abs(at(4.5,reversed,state)[0].c[0]-before[0].c[0]+18)<1e-8);
 const old={...state};R.advanceMotion(state,saved,{...params,'hh.drift':false},5);assert.deepEqual(state,old);
});
test('a tier wraps only after its full visible field has left and keeps its identity',()=>{
 for(const q of at(0)){
  const wrapAt=(390+q.pad-q.c[0])/18,a=at(wrapAt-.001)[q.tier-1],b=at(wrapAt+.001)[q.tier-1];
  assert.ok(a.c[0]>390+q.pad-.1);assert.ok(b.c[0]<-q.pad+.1);assert.equal(a.identity,b.identity);assert.equal(a.tier,b.tier);assert.equal(a.r,b.r);
 }
});
test('faces use the existing reflection style; controls alter real renderer inputs',()=>{
 const p={...params,'hh.faceX':.2,'hh.faceY':-.1,'hh.faceTurn':30,'hh.faceZoom':1.6,'hh.faceAmount':.7,'hh.face4':'Saga'};
 const q=at(1,p)[3],look=R.engineLook(q);
 assert.equal(q.identity,'Saga');assert.equal(look.faceAmt,.7);assert.equal(look.faceShiftX,.2);assert.equal(look.faceShiftY,-.1);assert.equal(look.faceRotate,30);assert.equal(look.reflectionZoom,1.6);
 const refl=R.reflectionSettings(saved,{'hh.faceGloss':1.3,'hh.faceSize':.55,'hh.faceBright':1.1});
 assert.equal(refl.on,true);assert.equal(refl.gloss,1.3);assert.equal(refl.size,.55);assert.equal(refl.bright,1.1);assert.equal(refl.blur,.6);
 assert.equal(at(0,{'hh.faces':false})[0].look.faceAmt,0);
});
test('tier 2 retains a curved reflection under its saved gas and does not change shared settings',()=>{
 const original=JSON.stringify(saved),q=at(0)[1],proxy=R.engineLook(q);
 assert.equal(proxy.disk,0);assert.equal(proxy.lens,0);assert.equal(proxy.faceAmt,.85);assert.equal(proxy.x,q.look.x);assert.equal(proxy.size,q.r);
 assert.equal(JSON.stringify(saved),original);assert.equal(at(0)[3].look.diskOpacity,.08);
});
test('the full directory bridge loads portraits, renders all tiers and preserves the face under tier-2 gas',async()=>{
 let frame=0,engine,referenceCalls=[],errors=[];
 const noop=()=>{},context2d=new Proxy({}, {get:(o,k)=>{
  if(k==='getImageData')return()=>({data:new Uint8ClampedArray(78*169*4)});
  return o[k]??noop;
 },set:(o,k,v)=>(o[k]=v,true)});
 const canvas=()=>({width:0,height:0,getContext:()=>context2d});
 class Portrait {constructor(){this.complete=true;this.naturalWidth=512;this.width=512;this.height=512;}}
 class Engine {constructor(c){this.canvas=c;this.faces=[];engine=this;this.frames=0;}resize(W,H){this.canvas.width=W;this.canvas.height=H;}setBackground(){} _uploadFaces(){this.uploaded=this.faces.map(f=>f?.src||null);}render(){this.frames++;for(const h of this.holes)assert.ok(h.surfaceLight.every(Number.isFinite));}}
 const k={W:390,H:844,TAU:Math.PI*2,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),status:e=>errors.push(e),frameId:()=>frame,shadowBlurFor:()=>0,drawBackground:noop,readSavedDesign:async()=>({holes:JSON.parse(JSON.stringify(saved))})};
 const win={StudioKit:k,BH:{...w.BH,BHScene:Engine},AsgardModelPreview:w.AsgardModelPreview,AsgardVariants:w.AsgardVariants,AsgardReference:{ReferenceHole:class {draw(...args){referenceCalls.push(args);}}}};
 const c=vm.createContext({window:win,Image:Portrait,document:{createElement:canvas}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../raven-tiers-1120.js'),'utf8'),c);
 const bridge=win.RavenSavedTiers;await bridge.load();
 const p={...params,'hh.faces':true,'hh.faceBright':.9,'hh.names':true,'hh.nameSize':13,'hh.nameColor':'#fff'},g={...geometry,cx:164};
 for(frame=1;frame<=8;frame++){assert.equal(bridge.draw(context2d,p,g,frame/60).length,4);bridge.draw(context2d,p,g,frame/60);}
 assert.deepEqual(errors,[]);assert.equal(engine.frames,8);assert.equal(referenceCalls.length,8);
 assert.deepEqual(Array.from(engine.uploaded),['faces/Baldr.jpg','faces/Freya.jpg','faces/Loki.jpg','faces/Hel.jpg']);
 assert.equal(engine.refl.on,true);assert.equal(engine.refl.bright,.9);
 assert.equal(referenceCalls[0][2].faceWindow,true);assert.equal(referenceCalls[0][1],engine.canvas);
 frame++;bridge.draw(context2d,{...p,'hh.faces':false},g,frame/60);
 assert.ok(engine.holes.every(h=>h.faceAmt===0));assert.ok(engine.uploaded.every(f=>f===null));
 assert.equal(referenceCalls.at(-1)[2].faceWindow,false);
 frame++;bridge.draw(context2d,{...p,'hh.face3':'Saga'},g,frame/60);
 assert.equal(engine.uploaded[2],'faces/Saga.jpg');assert.deepEqual(errors,[]);
});

