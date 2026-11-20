const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const env=require('../raven-environment-1120.js'),glass=require('../raven-glass-1120.js');
const angle=(a,b)=>Math.acos(Math.max(-1,Math.min(1,a.reduce((s,v,i)=>s+v*b[i],0))));
test('Camera illumination comes from the bright region and its actual color',()=>{
 const pixels=new Uint8ClampedArray(16*16*4);for(let y=1;y<5;y++)for(let x=1;x<5;x++){let a=(y*16+x)*4;pixels[a]=255;pixels[a+1]=100;pixels[a+2]=30;pixels[a+3]=255;}
 const light=env.analyze(pixels,16,16);assert.ok(light.direction[0]<0);assert.ok(light.direction[1]>0);assert.ok(light.color[0]>light.color[1]);assert.ok(light.intensity>0);
 const dark=env.analyze(new Uint8ClampedArray(16*16*4),16,16);assert.equal(dark.intensity,0);assert.ok(dark.direction.every(Number.isFinite));
});
test('A sudden light swing and flash respect separate direction and brightness limits',()=>{
 const p={'env.response':.001,'env.maxTurn':30,'env.maxChange':.3,'env.deadband':0};let state={direction:[0,0,1],color:[1,1,1],intensity:.1};
 const target={direction:[1,0,0],color:[1,.3,.1],intensity:1};
 for(let i=0;i<60;i++){const next=env.stabilize(state,target,p,1/60);assert.ok(angle(state.direction,next.direction)<=Math.PI/180*.50001);assert.ok(next.intensity-state.intensity<=.0050001);state=next;}
 assert.ok(Math.abs(state.intensity-.4)<1e-9);assert.ok(Math.abs(angle([0,0,1],state.direction)-Math.PI/6)<1e-6);
});
test('Locked lighting, small changes and black frames do not produce a wild jump',()=>{
 const state={direction:[0,1,0],color:[1,.2,.1],intensity:.4},target={direction:[0,-1,0],color:[0,0,0],intensity:0};
 assert.equal(env.stabilize(state,target,{'env.lock':true},.1),state);
 const small=env.stabilize(state,{...target,intensity:.405},{'env.deadband':.02},.1);assert.equal(small.intensity,.4);
 const black=env.stabilize(state,target,{},1/60);assert.ok(black.color.every(Number.isFinite));assert.ok(black.intensity>.3);
 const opposite=env.turnToward([0,1,0],[0,-1,0],.1);assert.ok(Math.abs(angle([0,1,0],opposite)-.1)<1e-9);
});
test('Lighting easing is consistent across frame rates and obeys the brightness ceiling',()=>{
 const p={'env.response':.4,'env.maxTurn':720,'env.maxChange':100,'env.deadband':0,'env.maximum':.6,'env.minimum':.8},target={direction:[1,0,0],color:[.8,.3,.2],intensity:1};
 const run=hz=>{let s={direction:[0,0,1],color:[1,1,1],intensity:.1};for(let i=0;i<hz;i++)s=env.stabilize(s,target,p,1/hz);return s};
 const a=run(30),b=run(120);assert.ok(Math.abs(a.intensity-b.intensity)<1e-9);assert.ok(angle(a.direction,b.direction)<1e-7);assert.ok(a.intensity<=.6);
});
test('Cached refraction continues to use each new camera frame and moves with the panel',()=>{
 const W=80,H=80,points=glass.bevelPoints(W,H,{l:10,r:70,t:10,b:70,radius:8},6,.8,.3),plan=glass.sourcePlan(points,W,H,0,0),src=new Uint8ClampedArray(W*H*4),dst=new Uint8ClampedArray(src.length);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){let i=(y*W+x)*4;src[i]=x*3;src[i+1]=y*3;src[i+2]=30;}
 glass.refractPixels(src,dst,plan);const before=dst.slice();for(let i=2;i<src.length;i+=4)src[i]=180;glass.refractPixels(src,dst,plan);
 assert.equal(dst[points[20].at+2],180);assert.equal(before[points[20].at+2],30);
 const moved=glass.sourcePlan(points,W,H,4,0);glass.refractPixels(src,dst,moved);const q=points.find(p=>p.x<60&&p.x>10);assert.ok(dst[q.at]>before[q.at]);
});
test('Actual background compositor offers camera, a blend, and a fully opaque backdrop',()=>{
 const source=fs.readFileSync(require.resolve('../studio-kit-1119.js'),'utf8'),start=source.indexOf('function drawBackground('),end=source.indexOf('/* ---------- highlight ---------- */',start);
 const calls=[],ctx={globalAlpha:1,fillRect(){},save(){this.saved??=[];this.saved.push(this.globalAlpha)},restore(){this.globalAlpha=this.saved.pop()},beginPath(){},rect(){},clip(){}};
 const K={W:390,H:844},sandbox={K,camState:'on',cam:{videoWidth:1280,videoHeight:720},bgImg:{complete:true,naturalWidth:800,naturalHeight:600},bgLoaded:'bg/bg02.jpg',tilt:{x:0,y:0},blur:()=>{},rgba:()=>'',clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),cover:(ctx,src)=>calls.push({camera:src===sandbox.cam,alpha:ctx.globalAlpha})};
 vm.runInNewContext(source.slice(start,end),sandbox);
 const p={'bg.mode':'camera','bg.image':'bg02','bg.zoom':1,'bg.tilt':0,'bg.overlay':true};
 for(const opacity of [0,.5,1]){calls.length=0;K.drawBackground(ctx,{...p,'bg.overlayOpacity':opacity});assert.equal(calls[0].camera,true);assert.equal(calls[0].alpha,1);assert.equal(calls[1].alpha,opacity);}
 calls.length=0;K.drawEnvironment(ctx,{...p,'bg.overlayOpacity':1},'camera');assert.equal(calls.length,1);assert.equal(calls[0].camera,true);
});
test('Directory preserves sphere geometry controls and wires lighting and Rolodex response',()=>{
 const {harness}=require('./helpers/dial-harness.cjs'),h=harness();
 h.context.Image=class{constructor(){this.complete=false;this.naturalWidth=0;}};
 h.K.hsv=()=>[100,170,220];h.K.shadowBlurFor=()=>0;h.K.drawEnvironment=h.K.drawBackground;
 h.window.RavenSavedTiers={draw:()=>[],reload:()=>{}};
 vm.runInContext(fs.readFileSync(require.resolve('../raven-environment-1120.js'),'utf8'),h.context);
 vm.runInContext(fs.readFileSync(require.resolve('../raven-directory-1119.js'),'utf8'),h.context);
 const d=h.K.screens.directory;assert.equal(d.P['sphere.x'],.42);assert.equal(d.P['sphere.height'],-.17);assert.equal(d.P['sphere.scale'],1);
 for(const key of ['sb.ambient','sb.topLight','sb.topSharp','sb.topColor','sb.rimLight','light.reachX','light.reachY','light.cap','motion.friction','motion.settle','path.step','bust.min'])assert.ok(key in d.P,key);
 for(const key of ['env.on','env.source','env.reflection','env.highlight','env.roughness','env.maxTurn','env.maxChange','env.lock','motion.inertia','motion.direction','motion.swipe','motion.maxSpeed'])assert.ok(key in d.P,key);
 d.P['env.source']='manual';d.P['hh.on']=false;d.onShow();d.update(.016);d.draw(h.canvas.getContext('2d'),16,false);
 d.ST.scroll=5;d.P['motion.inertia']=false;const e={pointerId:4};d.pointer.down({x:100,y:400},e);d.pointer.move({x:100,y:350},e);d.pointer.up({x:100,y:350},e);assert.equal(d.ST.velocity,0);assert.ok(d.ST.scroll>5);
 d.ST.scroll=5;d.P['motion.direction']=-1;d.pointer.down({x:100,y:400},e);d.pointer.move({x:100,y:350},e);d.pointer.up({x:100,y:350},e);assert.ok(d.ST.scroll<5);
});
