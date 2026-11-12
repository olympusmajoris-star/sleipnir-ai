const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const scope=vm.createContext({window:{}});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../reference-hole.js'),'utf8'),scope);
const {positionAt,geometry,renderSoftware,WIDTH,HEIGHT,CX,CY,PATCH}=scope.window.AsgardReference;
const W=390,H=844,n=120,settings={radius:40,x:.5,y:.235,lens:.9,lensReach:3.24,speed:1,driftOn:false};
const pixels={art:new Uint8ClampedArray(WIDTH*HEIGHT*4),base:new Uint8ClampedArray(WIDTH*HEIGHT*4),core:new Uint8ClampedArray(WIDTH*HEIGHT*4),flow:new Uint8ClampedArray(512*128*4)};
for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++){
  const i=(y*WIDTH+x)*4,r=Math.hypot(x-CX,y-CY),shadow=r<24;
  pixels.art.set([shadow?0:150,shadow?0:65,shadow?0:95,r<65?255:0],i);
  pixels.base.set(pixels.art.slice(i,i+4),i);pixels.core.set([shadow?255:0,0,0,255],i);
}
for(let y=0;y<128;y++)for(let x=0;x<512;x++){
  const i=(y*512+x)*4,v=128+55*Math.sin(x/512*Math.PI*14+y*.3);
  pixels.flow.set([v,v,v,255],i);
}
const sky=new Uint8ClampedArray(W*H*4);
for(let y=0;y<H;y++)for(let x=0;x<W;x++)sky.set([x%255,y%255,(x+y)%255,255],(y*W+x)*4);
function frame(time,extra={},bg=sky){const out=new Uint8ClampedArray(n*n*4);renderSoftware(out,pixels,bg,W,H,{...settings,...extra},time,n);return out;}
test('drift follows the saved speed and direction; pause is deterministic',()=>{
  const s={...settings,driftOn:true,driftSpeed:6.5,driftDirection:1};
  assert.equal(positionAt(s,8,W,H).x-positionAt(s,0,W,H).x,52);
  assert.equal(positionAt({...s,driftDirection:-1},8,W,H).x-positionAt(s,0,W,H).x,-52);
  assert.equal(positionAt({...s,driftOn:false},8,W,H).x,195);
  assert.deepEqual(positionAt(s,8,W,H),positionAt(s,8,W,H));
});
test('wrapping occurs only after the whole visible disk and lens field leave',()=>{
  const s={...settings,driftOn:true,driftSpeed:6.5},pad=40*4.6,atWrap=(W+pad-195)/6.5;
  assert.ok(positionAt(s,atWrap-.01,W,H).x>W+180);
  assert.ok(positionAt(s,atWrap+.01,W,H).x<-180);
});
test('gas circulates while the projected disk envelope and black center stay fixed',()=>{
  const a=frame(0),b=frame(4);let moving=0;
  for(let i=0;i<a.length;i+=4){assert.equal(a[i+3],b[i+3]);if(a[i]!==b[i])moving++;}
  assert.ok(moving>300);
  const i=((n/2)*n+n/2)*4;assert.deepEqual(Array.from(b.slice(i,i+4)),[0,0,0,255]);
});
test('stopped gas and paused time retain exactly the same frame',()=>{
  assert.deepEqual(frame(0,{speed:0}),frame(80,{speed:0}));
  assert.deepEqual(frame(2),frame(2));
});
test('lensing samples current sky pixels, has no visible rectangle and can be turned off',()=>{
  const a=frame(0),off=frame(0,{lens:0}),changed=frame(0,{},sky.map((v,i)=>i%4===3?255:255-v));
  let differences=0,skyUpdates=0;
  for(let i=0;i<a.length;i+=4){if(a[i]!==off[i])differences++;if(a[i]!==changed[i])skyUpdates++;}
  assert.ok(differences>500);assert.ok(skyUpdates>500);
  for(let x=0;x<n;x++){assert.equal(a[x*4+3],0);assert.equal(a[((n-1)*n+x)*4+3],0);}
});
test('inner gas moves faster than the outer gas',()=>{
  const g=geometry(settings,320),index=(x,y)=>(y*320+x)*10;
  assert.ok(g[index(190,160)+6]>g[index(250,160)+6]);
});
