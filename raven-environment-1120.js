/* Camera/backdrop driven sphere light, with independent motion stabilization. */
(function(root){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const value=(p,k,d)=>Number.isFinite(Number(p['env.'+k]))?Number(p['env.'+k]):d;
const norm=v=>{const n=Math.hypot(...v)||1;return v.map(x=>x/n);};
function analyze(data,W,H){
 let sum=0,sx=0,sy=0,energy=0;const color=[0,0,0];
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const i=(y*W+x)*4,r=data[i]/255,g=data[i+1]/255,b=data[i+2]/255,lum=.2126*r+.7152*g+.0722*b,weight=lum**4;
  sum+=weight;sx+=(x/(W-1)*2-1)*weight;sy+=(1-y/(H-1)*2)*weight;energy+=lum;
  color[0]+=r*weight;color[1]+=g*weight;color[2]+=b*weight;
 }
 const intensity=energy/(W*H);
 return {direction:sum>1e-7?norm([sx/sum,sy/sum,.7]):[0,0,1],color:sum>1e-7?color.map(v=>v/sum):[0,0,0],intensity};
}
function turnToward(a,b,maxAngle){
 const dot=clamp(a.reduce((s,v,i)=>s+v*b[i],0),-1,1),angle=Math.acos(dot);
 if(angle<1e-7||angle<=maxAngle)return b.slice();
 if(maxAngle<=0)return a.slice();
 const t=maxAngle/angle,s=Math.sin(angle);
 if(Math.abs(s)<1e-5){const basis=Math.abs(a[1])<.9?[0,1,0]:[1,0,0],dot=basis.reduce((n,v,i)=>n+v*a[i],0),tangent=norm(basis.map((v,i)=>v-dot*a[i]));return a.map((v,i)=>v*Math.cos(maxAngle)+tangent[i]*Math.sin(maxAngle));}
 return a.map((v,i)=>(v*Math.sin((1-t)*angle)+b[i]*Math.sin(t*angle))/s);
}
function stabilize(previous,target,p,dt){
 const ceiling=value(p,'maximum',1),floor=Math.min(ceiling,value(p,'minimum',0)),maximumColor=Math.max(...target.color),targetColor=maximumColor>1e-6?target.color.map(v=>v/maximumColor):(previous?.color||[1,1,1]);
 if(!previous)return {direction:target.direction.slice(),color:targetColor.slice(),intensity:clamp(target.intensity,floor,ceiling)};
 if(p['env.lock'])return previous;
 dt=clamp(dt,0,.2);
 const response=1-Math.exp(-dt/Math.max(.001,value(p,'response',.35)));
 const angle=Math.acos(clamp(previous.direction.reduce((s,v,i)=>s+v*target.direction[i],0),-1,1));
 const direction=turnToward(previous.direction,target.direction,Math.min(angle*response,value(p,'maxTurn',120)*Math.PI/180*dt));
 const intensity=clamp(target.intensity,floor,ceiling);
 const difference=intensity-previous.intensity,deadband=value(p,'deadband',.015);
 const change=Math.abs(difference)<deadband?0:clamp(difference*response,-value(p,'maxChange',1)*dt,value(p,'maxChange',1)*dt);
 return {direction,color:previous.color.map((v,i)=>v+(targetColor[i]-v)*response),intensity:clamp(previous.intensity+change,0,4)};
}
let input,filtered,environment,reflection,state=null,lastFrame=-1,lastTime=0,reflectFrame=-1,coords,source='',warned=false;
function manual(p){
 const K=root.StudioKit,a=value(p,'azimuth',-25)*Math.PI/180,b=value(p,'altitude',40)*Math.PI/180;
 return {direction:[Math.sin(a)*Math.cos(b),Math.sin(b),Math.cos(a)*Math.cos(b)],color:K.rgb(p['env.color']).map(v=>v/255),intensity:value(p,'manualBrightness',.5)};
}
function frame(p,time){
 const K=root.StudioKit,id=K.frameId();
 if(lastFrame===id&&environment)return environment;
 input ||= document.createElement('canvas');filtered ||= document.createElement('canvas');
 const W=80,H=80;
 if(input.width!==W){input.width=filtered.width=W;input.height=filtered.height=H;}
 const dt=Math.max(1/120,Math.min(.2,time-lastTime||1/60));lastTime=time;lastFrame=id;
 const mode=p['env.source']||'display',reset=source!==mode;source=mode;
 const ctx=input.getContext('2d',{willReadFrequently:true}),fx=filtered.getContext('2d',{willReadFrequently:true});
 if(!p['env.lock']||!environment||reset){
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,W,H);
  let target;
  if(mode==='manual'){target=manual(p);ctx.fillStyle=p['env.color'];ctx.fillRect(0,0,W,H);}
  else{
   ctx.save();ctx.scale(W/K.W,H/K.H);K.drawEnvironment(ctx,p,mode);ctx.restore();
   try{target=analyze(ctx.getImageData(0,0,W,H).data,W,H);}catch(error){target={direction:[0,0,1],color:[0,0,0],intensity:0};if(!warned){warned=true;K.status('This background cannot be sampled for lighting: '+error.message);}}
  }
  state=stabilize(reset?null:state,target,p,dt);
  fx.save();fx.globalAlpha=!environment||reset?1:1-Math.exp(-dt/Math.max(.001,value(p,'reflectionResponse',.2)));fx.drawImage(input,0,0);fx.restore();
 }
 if(!state)state=manual(p);
 const colorMix=value(p,'colorPickup',.65),luma=.2126*state.color[0]+.7152*state.color[1]+.0722*state.color[2],power=p['env.on']?Math.min(value(p,'peak',1.5),state.intensity*2**value(p,'exposure',0)*2):0;
 environment={canvas:filtered,direction:state.direction,color:state.color.map(v=>Math.min(value(p,'peak',1.5),(luma+(v-luma)*colorMix)*power)),power,intensity:state.intensity};
 return environment;
}
function sphereOverlay(ctx,g,p,time,fallback){
 if(!p['env.on'])return;
 const e=frame(p,time),K=root.StudioKit;
 if(fallback&&value(p,'diffuse',.6)>0){
  const x=g.cx+e.direction[0]*g.radius*.65,y=g.cy-e.direction[1]*g.radius*.65,c=e.color.map(v=>Math.round(clamp(v,0,1)*255));
  ctx.save();ctx.beginPath();ctx.arc(g.cx,g.cy,g.radius,0,Math.PI*2);ctx.clip();const grad=ctx.createRadialGradient(x,y,0,x,y,g.radius*1.5);grad.addColorStop(0,K.rgba(c,Math.min(1,value(p,'diffuse',.6)*.5)));grad.addColorStop(1,K.rgba(c,0));ctx.fillStyle=grad;ctx.fillRect(g.cx-g.radius,g.cy-g.radius,g.radius*2,g.radius*2);ctx.restore();
 }
 if(value(p,'reflection',.18)<=0&&value(p,'highlight',.45)<=0)return;
 if(reflectFrame!==K.frameId()){
  const N=144,W=80;reflection ||= document.createElement('canvas');if(reflection.width!==N)reflection.width=reflection.height=N;
  if(!coords){coords=[];for(let y=0;y<N;y++)for(let x=0;x<N;x++){const nx=(x+.5)/N*2-1,ny=1-(y+.5)/N*2,r=nx*nx+ny*ny;if(r>=1)continue;const z=Math.sqrt(1-r),u=clamp(.5+nx*z,0,1),v=clamp(.5-ny*z,0,1);coords.push({at:(y*N+x)*4,sx:u*(W-1),sy:v*(W-1),z,nx,ny});}}
  const tmp=input.getContext('2d',{willReadFrequently:true});tmp.setTransform(1,0,0,1,0,0);tmp.clearRect(0,0,W,W);tmp.save();tmp.filter=`blur(${value(p,'roughness',.25)*6}px)`;tmp.drawImage(e.canvas,0,0);tmp.restore();
  try{
   const pixels=tmp.getImageData(0,0,W,W).data,rx=reflection.getContext('2d'),image=rx.createImageData(N,N),out=image.data;
   let mean=0;for(let i=0;i<pixels.length;i+=4)mean+=.2126*pixels[i]+.7152*pixels[i+1]+.0722*pixels[i+2];mean/=W*W*255;
   const pick=value(p,'colorPickup',.65),amount=value(p,'reflection',.18),gloss=value(p,'highlight',.45),rough=value(p,'roughness',.25),peak=value(p,'peak',1.5),exposure=2**value(p,'exposure',0)*clamp(e.intensity/Math.max(.001,mean),0,10),half=norm([e.direction[0],e.direction[1],e.direction[2]+1]);
   for(const q of coords){
    const X=Math.round(q.sx),Y=Math.round(q.sy),at=(Y*W+X)*4,lum=.2126*pixels[at]+.7152*pixels[at+1]+.0722*pixels[at+2],spec=Math.max(0,q.nx*half[0]+q.ny*half[1]+q.z*half[2])**(6+(1-rough)**3*180)*gloss;
    for(let c=0;c<3;c++)out[q.at+c]=Math.min(255*peak,(lum+(pixels[at+c]-lum)*pick)*amount*exposure*(.35+.65*(1-q.z)**3)+e.color[c]*255*spec);
    out[q.at+3]=Math.round(255*clamp(q.z*20,0,1));
   }rx.putImageData(image,0,0);
  }catch(error){/* A blocked camera frame contributes no synthetic light. */}
  reflectFrame=K.frameId();
 }
 ctx.save();ctx.globalCompositeOperation='screen';ctx.drawImage(reflection,g.cx-g.radius,g.cy-g.radius,g.radius*2,g.radius*2);ctx.restore();
}
function controls(def){
 const d=(section,key,label,type,initial,extra={})=>def('Sphere',section,'sphere','env.'+key,label,type,initial,extra);
 d('Surrounding light','on','Surrounding light affects sphere','bool',true);
 d('Surrounding light','source','What lights the sphere','select','display',{opts:[['display','Camera / background mix'],['camera','Camera only'],['backdrop','Chosen backdrop only'],['manual','My fixed light']],info:'Camera and backdrop lighting are simulated from the image. Existing body lights and message-tab lights remain separate.'});
 d('Surrounding light','diffuse','Light reveals the surface','num',.6,{min:0,max:3,step:.05});
 d('Surrounding light','reflection','Reflection strength','num',.18,{min:0,max:1,step:.01});
 d('Surrounding light','highlight','Highlight strength','num',.45,{min:0,max:3,step:.05});
 d('Surrounding light','roughness','Highlight softness','num',.25,{min:0,max:1,step:.01,info:'Low = polished, tight highlights. High = softer, broader light.'});
 d('Surrounding light','colorPickup','Surrounding color pickup','num',.65,{min:0,max:1,step:.01});
 d('Surrounding light','exposure','Light exposure','num',0,{min:-4,max:4,step:.1,unit:'stops'});
 d('Moving light response','response','Direction / brightness response','num',.35,{min:.001,max:4,step:.01,unit:'s',info:'Lower follows movement quickly. Higher settles more gently.'});
 d('Moving light response','reflectionResponse','Reflection response','num',.2,{min:.001,max:4,step:.01,unit:'s'});
 d('Moving light response','maxTurn','Maximum light swing speed','num',120,{min:0,max:720,step:5,unit:'° / s'});
 d('Moving light response','maxChange','Maximum brightness change','num',1,{min:0,max:8,step:.05,unit:'/ s'});
 d('Moving light response','deadband','Ignore tiny brightness changes','num',.015,{min:0,max:.25,step:.005});
 d('Moving light response','minimum','Minimum sampled brightness','num',0,{min:0,max:1,step:.01});
 d('Moving light response','maximum','Maximum sampled brightness','num',1,{min:0,max:1,step:.01});
 d('Moving light response','peak','Highlight brightness ceiling','num',1.5,{min:0,max:4,step:.05});
 d('Moving light response','lock','Lock current light and reflections','bool',false,{info:'The camera keeps moving. Only the sphere lighting is held.'});
 d('Fixed surrounding light','color','Light color','color','#D8EFFF');
 d('Fixed surrounding light','manualBrightness','Brightness','num',.5,{min:0,max:1,step:.01});
 d('Fixed surrounding light','azimuth','Direction left / right','num',-25,{min:-180,max:180,step:1,unit:'°'});
 d('Fixed surrounding light','altitude','Direction up / down','num',40,{min:-85,max:85,step:1,unit:'°'});
}
const api={analyze,turnToward,stabilize,frame,sphereOverlay,controls};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RavenEnvironment=api;
})(typeof window!=='undefined'?window:this);
