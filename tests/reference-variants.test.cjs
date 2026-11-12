const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const context=vm.createContext({window:{},Math,Float32Array,Float64Array,Uint8ClampedArray,Number,Object,console});
for(const file of ['reference-hole.js','reference-variants.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);
const V=context.window.AsgardVariants;
const n=113,W=390,H=844,base={radius:40,x:.5,y:.235,speed:1.35,view3d:true,lens:.9,lensReach:3.24,driftOn:false};
const atlas=new Uint8ClampedArray(512*256*4),sky=new Uint8ClampedArray(W*H*4);
for(let y=0;y<256;y++)for(let x=0;x<512;x++){const r=(y+.5)/256*5.4,v=100+75*Math.sin(x/512*Math.PI*6+y*.1);atlas.set([v,v*.55,v*.75,r>1.05&&r<4.6?220:0],(y*512+x)*4);}
for(let i=0;i<W*H;i++)sky.set([i%251,(i/W)%251,30,255],i*4);
function frame(extra={},t=1,bg=sky){const s=V.settings({...base,...extra}),out=new Uint8ClampedArray(n*n*4);V.renderSoftware(out,{},atlas,bg,W,H,s,t,n);return out;}
function diff(a,b){let sum=0;for(let i=0;i<a.length;i++)sum+=Math.abs(a[i]-b[i]);return sum;}
test('approved original stays on its exact original renderer until a style or camera control changes',()=>{
 assert.ok(V.isOriginal({speed:1.35,radius:40}));for(const change of [{ringSize:1.2},{density:.5},{glow:1.4},{axisZ:20},{view3d:true},{tintAmount:1}])assert.equal(V.isOriginal(change),false);
});
test('axis basis remains orthonormal and preserves the spherical shadow at every view',()=>{
 for(const tilt of [3,28,60,90])for(const axisY of [-70,0,70]){
  const b=V.basis(V.settings({tilt,axisY,axisZ:17}));for(const v of [b.u,b.v,b.n])assert.ok(Math.abs(Math.hypot(...v)-1)<1e-10);
  assert.ok(Math.abs(b.u.reduce((s,v,i)=>s+v*b.v[i],0))<1e-10);
  const a=frame({tilt,axisY});assert.deepEqual(Array.from(a.slice((Math.floor(n/2)*n+Math.floor(n/2))*4,(Math.floor(n/2)*n+Math.floor(n/2))*4+4)),[0,0,0,255]);
 }
});
test('near disk passes in front of sphere; far disk is occluded; crest vanishes from above',()=>{
 const s=V.settings({...base,tilt:8,axisZ:0}),g=V.geometry(s,320),at=(x,y)=>(y*320+x)*22;
 const front=at(160,165),back=at(160,155);
 assert.ok(g[front+10]>.9);assert.ok(g[back+10]<.1);
 const top=V.geometry(V.settings({...base,tilt:90,axisY:0}),n);for(let i=0;i<n*n;i++)assert.ok(top[i*22+7]<.000001);
});
test('ring size, density, color, glow, camera angle and both axes alter the actual renderer',()=>{
 const a=frame();for(const st of [{ringSize:1.6},{density:.3},{glow:1.8},{tintAmount:1,tintColor:'#3fbbff'},{tilt:60},{axisY:45},{axisZ:20}])assert.ok(diff(a,frame(st))>20000,JSON.stringify(st));
});
test('rotation runs continuously, supports reverse and freeze, and keeps the center black',()=>{
 assert.ok(diff(frame({},0),frame({},4))>20000);assert.ok(diff(frame({spinDirection:1},3),frame({spinDirection:-1},3))>10000);
 assert.equal(diff(frame({speed:0},0),frame({speed:0},20)),0);
});
test('live lens responds to current background and has clear outside edges at maximum ring size',()=>{
 const a=frame({ringSize:1.8}),b=frame({ringSize:1.8,lens:0}),changed=frame({ringSize:1.8},1,sky.map((v,i)=>i%4===3?255:255-v));assert.ok(diff(a,b)>20000);assert.ok(diff(a,changed)>20000);
 for(let x=0;x<n;x++){assert.equal(a[x*4+3],0);assert.equal(a[((n-1)*n+x)*4+3],0);}
});

test('visible disk material keeps the source angle and radius rather than repeating one near-side strip',()=>{
 const art=new Uint8ClampedArray(224*166*4),core=new Uint8ClampedArray(art.length);
 for(let y=0;y<166;y++)for(let x=0;x<224;x++)art.set([x,y,100,255],(y*224+x)*4);
 const material=V.makeAtlas({art,core});
 for(const [x,y] of [[20,150],[150,150],[280,150],[400,150]]){
  const rho=(y+.5)/256*5.4,theta=(x+.5)/512*Math.PI*2,u=Math.cos(theta)*rho*27,v=Math.sin(theta)*rho*27*.47;
  const px=102+u*.64278761+v*.76604444-.5,py=89-u*.76604444+v*.64278761-.5,i=(y*512+x)*4;
  assert.ok(Math.abs(material[i]-px)<1);assert.ok(Math.abs(material[i+1]-py)<1);
 }
});
test('hours of running cannot accumulate radial texture shear',()=>{
 for(const tilt of [8,28,60,90]){
  const st={tilt,speed:1,driftOn:false};
  assert.equal(diff(frame(st,2),frame(st,1802)),0);
  assert.equal(diff(frame(st,22),frame(st,3622)),0);
 }
});
test('flow renewals remain continuous instead of flashing or snapping',()=>{
 for(const t of [6,12,180,3600]){
  const a=frame({speed:1},t-.001),b=frame({speed:1},t+.001);
  assert.ok(diff(a,b)/(a.length)<.04,`visible reset at ${t}s`);
 }
});
