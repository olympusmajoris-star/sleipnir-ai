const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../raven-earth-controls-1120.js');
const near=(a,b)=>a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<1e-9));
test('Map defaults preserve the original cover geometry',()=>{
  const m=E.matrix({},390,844);near(m,[1,0,0,1,0,0]);near(E.point(m,93,201),[93,201]);
});
test('Water, footage and terrain share an exact transform',()=>{
  const p={'earth.zoom':2,'earth.angle':90,'earth.x':.1,'earth.y':-.1};
  const m=E.matrix(p,400,800);near(E.point(m,200,400),[240,320]);near(E.point(m,210,400),[240,340]);
  near(E.point(E.matrix({'earth.flipX':true},400,800),100,200),[300,200]);
});
test('A recording keeps its final seconds instead of fading early',()=>{
  const c={duration:60,currentTime:59.8,ended:false};
  assert.equal(E.journey(c,{readyState:4},null,100,1200,true,true).type,'hold');
  c.currentTime=60;assert.equal(E.journey(c,{readyState:0},null,100,1200,true,true).type,'prepare');
});
test('Transition waits for video readiness and only then starts its fade',()=>{
  const c={duration:60,currentTime:60,ended:true},s={t0:null};
  assert.equal(E.journey(c,{readyState:0},s,100,1200,true,true).type,'waiting');
  assert.equal(E.journey(c,{readyState:2},s,4000,1200,true,true).type,'start');
  s.t0=4000;assert.equal(E.journey(c,{readyState:4},s,4600,1200,true,true).progress,.5);
  assert.equal(E.journey(c,{readyState:4},s,5200,1200,true,true).type,'commit');
});
test('Pause and disabled cycling keep the current frame',()=>{
  const c={duration:60,currentTime:60,ended:true};
  assert.equal(E.journey(c,{readyState:4},null,6000,0,true,false).type,'hold');
  assert.equal(E.journey(c,{readyState:4},{t0:100},6000,1200,false,true).type,'hold');
});
test('Conversation controls drive the real playlist and independent cloud clocks',()=>{
  const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
  const makeVideo=()=>({dataset:{},src:'',readyState:4,duration:60,currentTime:0,ended:false,paused:true,pause(){this.paused=true;},play(){this.paused=false;return Promise.resolve();}});
  const K={TAU:Math.PI*2,W:390,H:844,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),screens:{},screen(sc){sc.P={};sc.spec((g,s,t,k,l,type,d)=>sc.P[k]=d);this.screens[sc.id]=sc;return sc;}};
  const context=vm.createContext({window:{StudioKit:K,RavenEarthControls:E},document:{createElement:type=>type==='video'?makeVideo():{getContext:()=>({})}},Path2D:class{},performance:{now:()=>0},fetch:()=>Promise.resolve({json:()=>Promise.resolve(null)}),console});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../raven-conversation-1119.js'),'utf8'),context);
  const sc=K.screens.conversation;sc.onSet('earth.clip',0);sc.update(.016,100);
  assert.equal(sc.videos[0].paused,false);assert.equal(sc.videos[1].paused,true);
  sc.videos[0].currentTime=60;sc.videos[0].ended=true;sc.videos[1].readyState=0;
  sc.update(.016,116);assert.equal(sc.ST.swap.t0,null);
  sc.update(.016,132);assert.equal(sc.ST.swap.t0,null);
  sc.videos[1].readyState=4;sc.update(.016,148);assert.equal(sc.ST.swap.t0,148);assert.equal(sc.videos[1].paused,false);
  sc.P['earth.play']=false;sc.onSet('earth.play',false);assert.ok(sc.videos.every(v=>v.paused));
  for(const f of sc.FILMS){f.ready=true;f.dec={};f.motion=0;f.blend=0;f.dur=10;}
  sc.P['film.0.dir']=-1;sc.P['film.1.speed']=2;sc.update(.02,168);
  assert.equal(sc.FILMS[0].motion,-.02);assert.equal(sc.FILMS[1].motion,.04);
  sc.P['cl.play']=false;sc.update(.02,188);assert.equal(sc.FILMS[0].motion,-.02);
});
