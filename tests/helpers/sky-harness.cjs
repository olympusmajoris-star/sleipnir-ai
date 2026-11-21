const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function skyHarness(options={}) {
 let now=0,frame=0;const status=[];
 const finite=args=>{for(const a of args)if(typeof a==='number'&&!Number.isFinite(a))throw Error('Non-finite drawing value '+a);};
 function canvas(){
  const c={width:390,height:844},state={canvas:c,globalAlpha:1};
  const x=new Proxy(state,{get(t,k){
   if(k==='getTransform')return()=>({a:1,b:0,c:0,d:1});
   if(k==='measureText')return s=>({width:String(s).length*7});
   if(k==='createLinearGradient'||k==='createRadialGradient')return(...a)=>{finite(a);return{addColorStop(...v){finite(v)}}};
   if(k==='getImageData')return(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)});
   if(k in t)return t[k];return(...a)=>finite(a);
  },set(t,k,v){finite([v]);t[k]=v;return true;}});
  c.getContext=kind=>kind==='2d'?x:null;return c;
 }
 class EmptyImage{constructor(){this.complete=false;this.naturalWidth=0;this.naturalHeight=0;}removeAttribute(){}}
 const makeCanvas=options.makeCanvas||canvas,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const K={W:options.width||390,H:options.height||844,TAU:Math.PI*2,clamp,
  rgba(color,a){const n=parseInt(String(color).replace('#',''),16)||0;return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${clamp(a,0,1)})`;},
  scaleOf(c){const m=c.getTransform();return Math.sqrt(Math.abs(m.a*m.d-m.b*m.c));},
  shadowBlurFor:()=>0,frameId:()=>frame,hl(){},status:t=>status.push(t),drawBackground(){},
  rockNav:{has:()=>true,footprint:()=>options.footprint||130},screens:{},
  screen(sc){const p={};sc.spec((g,s,t,k,l,type,d)=>p[k]=d);sc.P=p;this.screens[sc.id]=sc;return sc;}
 };
 const window={StudioKit:K,devicePixelRatio:1};
 const context=vm.createContext({window,document:{createElement:()=>makeCanvas()},Image:options.Image||EmptyImage,
  Path2D:options.Path2D||class{},performance:{now:()=>now},console,setTimeout(){}});
 const src=fs.readFileSync(path.join(__dirname,'../../asgard-sky-1120.js'),'utf8');
 vm.runInContext(src.replace('sc.ST = ST;', 'sc.testGeometry = { groundCam, groundPoint, holeAt }; sc.ST = ST;'),context);
 const sc=K.screens.sky;sc.onShow();sc.ST.paused=true;
 const c=makeCanvas();c.width=K.W;c.height=K.H;
 const draw=()=>{frame++;sc.draw(c.getContext('2d'),now,false);return c;};
 const tick=ms=>{const end=now+ms;while(now<end){const dt=Math.min(1000/60,end-now);now+=dt;sc.update(dt/1000);}return draw();};
 const tap=(x,y)=>{sc.pointer.down({x,y});sc.pointer.up({x,y});return draw();};
 draw();
 return {sc,K,draw,tick,tap,status,canvas:c,openShare(){sc.rockNavigate('share-post');tick(2800);return sc.SH();}};
}
module.exports={skyHarness};
