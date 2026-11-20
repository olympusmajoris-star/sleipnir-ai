const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
function harness(options={}){
 let now=0,frame=0;const pages=[],status=[];
 const checked=args=>{for(const v of args)if(typeof v==='number'&&!Number.isFinite(v))throw Error('Non-finite canvas coordinate: '+v);};
 class FakePath{moveTo(...a){checked(a)}lineTo(...a){checked(a)}arc(...a){checked(a)}closePath(){}bezierCurveTo(...a){checked(a)}quadraticCurveTo(...a){checked(a)}rect(...a){checked(a)}}
 function fakeCanvas(){const canvas={width:390,height:844},values={globalAlpha:1,filter:'none'},ctx=new Proxy(values,{get:(t,k)=>{
  if(k==='getTransform')return()=>({a:1,b:0,c:0,d:1});
  if(k==='getImageData'||k==='createImageData')return(...a)=>({data:new Uint8ClampedArray((k==='getImageData'?a[2]*a[3]:a[0]*a[1])*4)});
  if(k==='createLinearGradient'||k==='createRadialGradient')return(...a)=>{checked(a);return{addColorStop:()=>{}}};
  if(k==='measureText')return t=>({width:t.length*8});
  if(k in t)return t[k];return(...a)=>checked(a);
 },set:(t,k,v)=>{checked([v]);t[k]=v;return true;}});canvas.getContext=kind=>kind==='2d'?ctx:null;return canvas;}
 const makeCanvas=options.makeCanvas||fakeCanvas;
 const rgb=x=>{if(Array.isArray(x))return x;const n=parseInt(String(x).replace('#',''),16)||0;return[(n>>16)&255,(n>>8)&255,n&255];};
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),rgba=(x,a)=>`rgba(${rgb(x).join(',')},${clamp(a,0,1)})`,scaleOf=c=>{const m=c.getTransform();return Math.sqrt(Math.abs(m.a*m.d-m.b*m.c))};
 const K={W:390,H:844,TAU:Math.PI*2,D2R:Math.PI/180,WHITE:[255,255,255],clamp,rgb,rgba,scaleOf,
  ease:t=>1-(1-t)**3,smooth:t=>{t=clamp(t,0,1);return t*t*(3-2*t)},wrap:a=>Math.atan2(Math.sin(a),Math.cos(a)),mix:(a,b,t)=>rgb(a).map((v,i)=>Math.round(v+(rgb(b)[i]-v)*t)),
  blur:(c,s)=>c.filter=s>0?`blur(${s*scaleOf(c)}px)`:'none',
  arc(c,p,r,a,s,w,col,alpha,glow){if(w<=0||alpha<=0||r<=0||s===0)return;c.save();c.lineWidth=w;c.strokeStyle=rgba(col,alpha);if(glow)K.blur(c,glow);c.beginPath();c.arc(p.x,p.y,r,a,a+s,s<0);c.stroke();c.restore();},
  frameId:()=>frame,vibrate:()=>{},status:t=>status.push(t),show:id=>pages.push(id),go:id=>pages.push(id),hl:()=>{},currentTarget:()=>'',
  drawBackground:options.background||((c)=>{c.fillStyle='#172029';c.fillRect(0,0,390,844);}),
  screens:{conversation:{},directory:{}},screen(sc){const p={};sc.spec((g,s,t,k,l,type,d)=>p[k]=d);sc.P={...p,'bg.mode':'camera','bg.dim':0};this.screens[sc.id]=sc;return sc;}
 };
 const w={StudioKit:K,RavenMotion:require('../../raven-motion-1120.js'),devicePixelRatio:1};
 const context=vm.createContext({window:w,document:{createElement:()=>makeCanvas()},Path2D:options.Path2D||FakePath,performance:{now:()=>now},Date,setTimeout:()=>{throw Error('Unscheduled automatic navigation');}});
 for(const name of ['raven-glass-1120.js','raven-dial-1119.js'])vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),context);
 const dial=K.screens.dial;dial.onLoad();dial.onShow();const canvas=makeCanvas();
 const draw=()=>{frame++;const x=canvas.getContext('2d');K.drawBackground(x,dial.P);dial.draw(x,now,false);return canvas};
 return {dial,K,pages,status,canvas,context,window:w,draw,tick(t){while(now<t){const d=Math.min(16.667,t-now);now+=d;dial.update(d/1000,now);}return draw();},now:()=>now};
}
module.exports={harness};
