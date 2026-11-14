/* Variants of Danny's reference. Original view retains its silhouette. The adjustable
 * view uses a spherical occluder and a disk in 3D, textured from that same reference.
 * The bent far-side image is an artistic lens approximation, not a GR simulation. */
(function(G){
'use strict';
const TAU=Math.PI*2,R=27,AW=512,AH=256,AR=5.4;
const defaults=Object.freeze({ringSize:1,density:1,glow:1,tintColor:'#eaa6bb',tintAmount:0,view3d:false,tilt:28,axisY:0,axisZ:-50,thickness:1});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const mod=(x,n)=>(x%n+n)%n;
function settings(s){const a={...defaults,...s};for(const [k,lo,hi] of [['ringSize',.45,1.8],['density',0,3],['glow',0,3],['tintAmount',0,1],['tilt',3,90],['axisY',-80,80],['axisZ',-180,180],['thickness',.3,2]])a[k]=clamp(Number.isFinite(+a[k])?+a[k]:defaults[k],lo,hi);return a;}

// Stable per-streamer orientation: never depends on time, position, views or tier.
function orientationFor(id,seed=1){
  let h=2166136261;for(const ch of String(seed)+'|'+String(id))h=Math.imul(h^ch.charCodeAt(0),16777619);
  const unit=k=>{let v=Math.imul(h^Math.imul(k,0x9e3779b9),0x85ebca6b);v^=v>>>13;v=Math.imul(v,0xc2b2ae35);v^=v>>>16;return (v>>>0)/4294967296;};
  return {view3d:true,tilt:12+66*unit(1),axisY:-45+90*unit(2),axisZ:-180+360*unit(3)};
}
function tier2At(input,views,config={}){
  const t=clamp(((Number.isFinite(+views)?+views:21)-21)/128,0,1);
  return {...input,ringSize:(config.ringStart??.45)+((config.ringEnd??1.26)-(config.ringStart??.45))*t,
    density:(config.densityStart??.65)+((config.densityEnd??1.05)-(config.densityStart??.65))*t};
}
function liveSettings(input,id,orientation={},growth=null,views){
  let result={...input};
  if(growth?.on)result=tier2At(result,views??growth.views,growth);
  if(orientation.random!==false)Object.assign(result,orientationFor(id,orientation.seed??1));
  return result;
}

function basis(s){const t=s.tilt*Math.PI/180,y=s.axisY*Math.PI/180,z=s.axisZ*Math.PI/180,ct=Math.cos(t),st=Math.sin(t),cy=Math.cos(y),sy=Math.sin(y),cz=Math.cos(z),sz=Math.sin(z);
  const u=[cy*cz,cy*sz,-sy],v=[sy*ct*cz-st*sz,sy*ct*sz+st*cz,cy*ct];
  return {u,v,n:[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]};
}
function extent(s){return Math.max(320,(27+115*s.ringSize)*2+24);}
function isOriginal(input){const s=settings(input);return !s.view3d&&s.ringSize===1&&s.density===1&&s.glow===1&&s.tintAmount===0&&s.axisZ===-50;}
function sample(a,w,h,x,y,k,wrap=false){x=wrap?mod(x,w):clamp(x,0,w-1);y=clamp(y,0,h-1);const X=Math.floor(x),Y=Math.floor(y),f=x-X,g=y-Y,X1=wrap?(X+1)%w:Math.min(X+1,w-1),Y1=Math.min(Y+1,h-1);return (a[(Y*w+X)*4+k]*(1-f)+a[(Y*w+X1)*4+k]*f)*(1-g)+(a[(Y1*w+X)*4+k]*(1-f)+a[(Y1*w+X1)*4+k]*f)*g;}
function sample4(a,w,h,x,y,out,wrap=false){
  x=wrap?mod(x,w):clamp(x,0,w-1);y=clamp(y,0,h-1);const X=Math.floor(x),Y=Math.floor(y),f=x-X,g=y-Y,X1=wrap?(X+1)%w:Math.min(X+1,w-1),Y1=Math.min(Y+1,h-1),i=(Y*w+X)*4,j=(Y*w+X1)*4,k=(Y1*w+X)*4,l=(Y1*w+X1)*4,a0=(1-f)*(1-g),a1=f*(1-g),a2=(1-f)*g,a3=f*g;
  for(let c=0;c<4;c++)out[c]=a[i+c]*a0+a[j+c]*a1+a[k+c]*a2+a[l+c]*a3;
  return out;
}
// Unproject the whole visible disk, preserving its angular wisps and broad gas.
// Only the part hidden by the original horizon is reconstructed from visible
// neighbouring material. Never replace a radial row with its average colour.
function makeAtlas(p){
  const out=new Uint8ClampedArray(AW*AH*4),a=p.art,c=p.core;
  const read=(rho,theta)=>{const u=Math.cos(theta)*rho*R,v=Math.sin(theta)*rho*R*.47,x=102+u*.64278761+v*.76604444-.5,y=89-u*.76604444+v*.64278761-.5;
    const inside=x>=0&&x<224&&y>=0&&y<166;
    const shadow=inside?Math.max(sample(c,224,166,x,y,0),sample(c,224,166,x+3,y,0),sample(c,224,166,x-3,y,0),sample(c,224,166,x,y+3,0),sample(c,224,166,x,y-3,0))/255:0;
    return [sample(a,224,166,x,y,0),sample(a,224,166,x,y,1),sample(a,224,166,x,y,2),inside?sample(a,224,166,x,y,3):0,1-smooth(0,.7,shadow)];};
  for(let y=0;y<AH;y++){
    const rho=(y+.5)/AH*AR,row=Array.from({length:AW},(_,x)=>read(rho,(x+.5)/AW*TAU));
    const good=[];for(let x=0;x<AW;x++)if(row[x][4]>.99)good.push(x);
    for(let x=0;x<AW;x++){
      const theta=(x+.5)/AW*TAU,q=row[x],i=(y*AW+x)*4;
      if(q[4]<1){
        let fill;
        if(good.length){
          let l=x,r=x;for(let d=1;d<AW;d++){l=mod(x-d,AW);if(row[l][4]>.99)break;}
          for(let d=1;d<AW;d++){r=mod(x+d,AW);if(row[r][4]>.99)break;}
          const dl=mod(x-l,AW),dr=mod(r-x,AW),blend=smooth(0,1,dl/Math.max(1,dl+dr));
          fill=row[l].map((v,k)=>v*(1-blend)+row[r][k]*blend);
          // Carry broad wisps into the hidden portion without repeating a tiny strip.
          const detail=read(Math.max(2.25,rho+.5),theta),mean=(detail[0]+detail[1]+detail[2])/3;
          for(let k=0;k<3;k++)fill[k]*=.82+.36*smooth(20,160,mean);
        }else fill=read(2.25,theta);
        for(let k=0;k<4;k++)q[k]=q[k]*q[4]+fill[k]*(1-q[4]);
      }
      const edge=smooth(1.03,1.12,rho)*(1-smooth(4.7,5.35,rho));
      for(let k=0;k<4;k++)out[i+k]=q[k]*(k===3?edge:1);
    }
  }return out;
}
const VS=`attribute vec2 p;varying vec2 uv;void main(){uv=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}`;
const FS=`precision highp float;
varying vec2 uv;
uniform sampler2D art,core,base,flow,atlas,sky;
uniform float time,spinDirection,lens,lensReach,patchSize,ringSize,density,glow,tintAmount,view3d,thickness;
uniform vec3 tint,axisU,axisV,normal;
uniform vec2 roll;
uniform vec4 placement;
const float TAU=6.283185307;
vec3 color(vec3 c){float l=dot(c,vec3(.2126,.7152,.0722));vec3 dyed=tint*l/max(dot(tint,vec3(.2126,.7152,.0722)),.15);dyed=mix(dyed,vec3(l),smoothstep(.6,1.,l)*.65);return clamp(mix(c,dyed,tintAmount)*glow,0.,1.);}
float opacity(float a){return density<=1.?a*density:1.-pow(max(1.-a,.000001),density);}
vec4 over(vec4 front,vec4 back){return vec4(front.rgb*front.a+back.rgb*(1.-front.a),front.a+back.a*(1.-front.a));}
// Two overlapping, smoothly renewed flow phases bound differential shear.
// The reset phase is invisible; the disk never winds into concentric wires.
vec4 orbitSample(sampler2D tex,float angle,float row,float omega){
  float t=mod(time,180.),phase=mod(t,12.),a=phase-6.,b=mod(t+6.,12.)-6.;
  float blend=.5+.5*cos(phase*6.283185307/12.);
  float rigid=t/180.,shear=omega/6.283185307-1./180.;
  vec4 A=texture2D(tex,vec2(fract(angle/6.283185307-spinDirection*(rigid+a*shear)),row));
  vec4 B=texture2D(tex,vec2(fract(angle/6.283185307-spinDirection*(rigid+b*shear)),row));
  float alpha=mix(A.a,B.a,blend);
  return vec4(mix(A.rgb*A.a,B.rgb*B.a,blend)/max(alpha,.000001),alpha);
}
vec4 disk(float rho,float angle){float rr=1.06+(rho-1.06)/ringSize;float omega=.46*pow(1.4074/max(rho,1.111),1.5);vec4 q=orbitSample(atlas,angle,clamp(rr/5.4,0.,1.),omega);q.a*=step(1.06,rho)*step(rr,5.4);q.rgb=color(q.rgb);q.a=opacity(q.a);return q;}
void main(){
  vec2 d=(uv-.5)*patchSize;float r=length(d),rn=r/27.;vec4 gas=vec4(0.);
  if(view3d<.5){
    vec2 local=vec2(d.x*roll.x+d.y*roll.y,-d.x*roll.y+d.y*roll.x);
    vec2 plane=vec2(dot(local,vec2(.64278761,-.76604444)),dot(local,vec2(.76604444,.64278761))/.47);
    float rho=length(plane),rr=min(rho,58.)+max(rho-58.,0.)/ringSize;
    vec2 sd=local*(rr/max(rho,.0001));vec2 p=(sd+vec2(102.,89.))/vec2(224.,166.);
    vec2 cp=(local+vec2(102.,89.))/vec2(224.,166.);
    float inside=step(0.,p.x)*step(p.x,1.)*step(0.,p.y)*step(p.y,1.);
    float cin=step(0.,cp.x)*step(cp.x,1.)*step(0.,cp.y)*step(cp.y,1.);
    vec4 q=texture2D(art,p)*inside;float sourceCore=texture2D(core,p).r*inside;
    float shadow=max(texture2D(core,cp).r*cin,1.-smoothstep(.975,1.,rn));
    float rim=max(max(texture2D(core,p+vec2(2./224.,0.)).r,texture2D(core,p-vec2(2./224.,0.)).r),max(texture2D(core,p+vec2(0.,2./166.)).r,texture2D(core,p-vec2(0.,2./166.)).r))*inside;
    float omega=.46*pow(38./max(rho,30.),1.5);
    vec3 detail=orbitSample(flow,atan(plane.y,plane.x),clamp(rr/160.,0.,1.),omega).rgb;
    float moving=.92*(1.-rim)*smoothstep(23.,30.,length(sd));
    vec3 c=color(mix(q.rgb,texture2D(base,p).rgb*detail*2.,moving))*(1.-sourceCore);
    float a=opacity(q.a*(1.-sourceCore));
    gas=over(vec4(c,a),vec4(0.,0.,0.,shadow));
  }else{
    vec2 q=d/27.;float sphere=1.-smoothstep(.987,1.012,rn);
    gas=vec4(0.,0.,0.,sphere);
    // Bent image of the far half of the disk rises above the sphere. It fades
    // continuously toward a top view; there is no blinking light animation.
    vec2 farDir=normalize(normal.xy+vec2(.000001));
    float farSide=max(0.,dot(q,farDir)/max(rn,.001)),incl=sqrt(max(0.,1.-normal.z*normal.z));
    float archR=1.06+(rn-1.025)*5.5/max(.3,incl);
    float archAngle=atan(-abs(dot(q,farDir)),dot(q,axisU.xy));
    vec4 arch=disk(archR,archAngle);arch.a*=smoothstep(1.008,1.04,rn)*smoothstep(.03,.25,farSide)*incl*.78*(1.-smoothstep(1.45,1.9,rn));
    gas=over(arch,gas);
    // A clean, light-dependent crest follows only the illuminated far limb.
    float crest=exp(-pow((rn-1.02)/.018,2.))*pow(farSide,.7)*incl*.32*density;
    gas=over(vec4(color(vec3(.94,.77,.72)),clamp(crest,0.,1.)),gas);
    float frontZ=sqrt(max(0.,1.-dot(q,q)));
    for(int layer=0;layer<3;layer++){
      float height=(float(layer)-1.)*.026*thickness*min(1.,normal.z/.08);
      float z=(height-dot(normal.xy,q))/max(.015,normal.z);
      vec3 hit=vec3(q,z);float u=dot(hit,axisU),v=dot(hit,axisV),rho=length(vec2(u,v));
      vec4 material=disk(rho,atan(v,u));
      material.a=1.-pow(1.-min(material.a,.999999),.333333);
      material.a*=mix(1.,smoothstep(frontZ-.012,frontZ+.012,z),sphere);
      gas=over(material,gas);
    }
  }
  float falloff=1.-smoothstep(1.75,lensReach,rn),sourceRadius=rn-lens*2.1025*falloff/max(rn,.65);
  vec2 bent=placement.xy+d*placement.zw*(sourceRadius/max(rn,.0001));
  vec3 bg=texture2D(sky,clamp(bent,vec2(0.),vec2(1.))).rgb;
  float field=step(.00001,lens)*(1.-smoothstep(lensReach-.3,lensReach,rn));
  float a=gas.a+field*(1.-gas.a);gl_FragColor=vec4((gas.rgb+bg*field*(1.-gas.a))/max(a,.00001),a);
}`;
function tintOf(s){return /^#[0-9a-f]{6}$/i.test(s.tintColor)?[1,3,5].map(i=>parseInt(s.tintColor.slice(i,i+2),16)/255):[.918,.651,.733];}
function color(c,s,tint){const lum=c[0]*.2126+c[1]*.7152+c[2]*.0722,tl=tint[0]*.2126+tint[1]*.7152+tint[2]*.0722,white=smooth(.6,1,lum)*.65;return c.map((v,k)=>clamp((v*(1-s.tintAmount)+(tint[k]*lum/Math.max(tl,.15)*(1-white)+lum*white)*s.tintAmount)*s.glow,0,1));}
function over(c,a,b){const keep=1-a;b[0]=c[0]*a+b[0]*keep;b[1]=c[1]*a+b[1]*keep;b[2]=c[2]*a+b[2]*keep;b[3]=a+b[3]*keep;}
// Precompute camera/disk intersections when a shape control changes, not each frame.
function geometry(s,n){s=settings(s);const size=extent(s),b=basis(s),geo=new Float32Array(n*n*22),roll=(s.axisZ+50)*Math.PI/180,cs=Math.cos(roll),sn=Math.sin(roll),incl=Math.sqrt(Math.max(0,1-b.n[2]**2)),fl=Math.hypot(b.n[0],b.n[1])||1;
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const i=(y*n+x)*22,dx=((x+.5)/n-.5)*size,dy=((y+.5)/n-.5)*size,r=Math.hypot(dx,dy),rn=r/R,reach=s.lensReach??3.24,lens=Math.max(0,s.lens??.9),beta=rn-lens*2.1025*(1-smooth(1.75,reach,rn))/Math.max(rn,.65);
    geo.set([dx*beta/Math.max(rn,.0001),dy*beta/Math.max(rn,.0001),lens>0?1-smooth(reach-.3,reach,rn):0],i);
    if(!s.view3d){const lx=dx*cs+dy*sn,ly=-dx*sn+dy*cs,u=lx*.64278761-ly*.76604444,v=(lx*.76604444+ly*.64278761)/.47,rho=Math.hypot(u,v),rr=Math.min(rho,58)+Math.max(rho-58,0)/s.ringSize,sc=rr/Math.max(rho,.0001);
      geo.set([lx*sc+101.5,ly*sc+88.5,lx+101.5,ly+88.5,Math.atan2(v,u)/TAU,rr/160,.46*Math.pow(38/Math.max(rho,30),1.5)/TAU,Math.hypot(lx*sc,ly*sc)],i+3);
    }else{
      const qx=dx/R,qy=dy/R,sphere=1-smooth(.987,1.012,rn),farSide=Math.max(0,(qx*b.n[0]+qy*b.n[1])/fl/Math.max(rn,.001));
      const ar=1.06+(rn-1.025)*5.5/Math.max(.3,incl),aa=Math.atan2(-Math.abs((qx*b.n[0]+qy*b.n[1])/fl),qx*b.u[0]+qy*b.u[1]);
      geo.set([sphere,ar,aa,smooth(1.008,1.04,rn)*smooth(.03,.25,farSide)*incl*.78*(1-smooth(1.45,1.9,rn)),Math.exp(-Math.pow((rn-1.02)/.018,2))*Math.pow(farSide,.7)*incl*.32*s.density],i+3);
      const frontZ=Math.sqrt(Math.max(0,1-qx*qx-qy*qy));
      for(let j=0;j<3;j++){const z=((j-1)*.026*s.thickness*Math.min(1,b.n[2]/.08)-b.n[0]*qx-b.n[1]*qy)/Math.max(.015,b.n[2]),u=qx*b.u[0]+qy*b.u[1]+z*b.u[2],v=qx*b.v[0]+qy*b.v[1]+z*b.v[2];geo.set([Math.hypot(u,v),Math.atan2(v,u),1-sphere+sphere*smooth(frontZ-.012,frontZ+.012,z)],i+8+j*3);}
    }
  }return geo;
}
function renderSoftware(out,pixels,atlas,bg,W,H,input,time,n,cache){
  const s=settings(input),geo=cache||geometry(s,n),size=extent(s),pos=G.AsgardReference.positionAt({...s,extent:size/(2*R)},time,W,H),t=time*(s.speed??1),dir=s.spinDirection<0?-1:1,tint=tintOf(s),motion=G.AsgardReference.motionAt(t);
  const opacity=a=>s.density<=1?a*s.density:1-Math.pow(Math.max(1-a,.000001),s.density);
  const rgba=new Float64Array(4),rgb=new Float64Array(3),gas=new Float64Array(4),skyPixel=new Float64Array(4),hi=new Float64Array(4),lo=new Float64Array(4),detail=new Float64Array(4),alternate=new Float64Array(4);
  const tintL=Math.max(.15,tint[0]*.2126+tint[1]*.7152+tint[2]*.0722);
  const colorFast=c=>{const lum=c[0]*.2126+c[1]*.7152+c[2]*.0722,white=smooth(.6,1,lum)*.65;for(let k=0;k<3;k++)c[k]=clamp((c[k]*(1-s.tintAmount)+(tint[k]*lum/tintL*(1-white)+lum*white)*s.tintAmount)*s.glow,0,1);return c;};
  const disk=(rho,angle)=>{
    const rr=1.06+(rho-1.06)/s.ringSize;if(rho<1.06||rr>AR){rgba.fill(0);return rgba;}
    const omega=.46*Math.pow(1.4074/Math.max(rho,1.111),1.5),x=mod(angle/TAU-(motion.turns+motion.a*(omega/TAU-1/180))*dir,1)*AW-.5,x2=mod(angle/TAU-(motion.turns+motion.b*(omega/TAU-1/180))*dir,1)*AW-.5,y=clamp(rr/AR,0,1)*AH-.5;
    sample4(atlas,AW,AH,x,y,rgba,true);sample4(atlas,AW,AH,x2,y,alternate,true);
    const alpha=rgba[3]*(1-motion.blend)+alternate[3]*motion.blend;
    for(let k=0;k<3;k++)rgba[k]=(rgba[k]*rgba[3]*(1-motion.blend)+alternate[k]*alternate[3]*motion.blend)/Math.max(alpha,.000001)/255;
    rgba[3]=alpha;colorFast(rgba);rgba[3]=opacity(rgba[3]/255);return rgba;
  };
  const crestColor=color([.94,.77,.72],s,tint);
  for(let i=0;i<n*n;i++){
    const g=i*22,j=i*4;gas.fill(0);
    if(!s.view3d){const x=geo[g+3],y=geo[g+4],cx=geo[g+5],cy=geo[g+6],inside=x>=-.5&&x<223.5&&y>=-.5&&y<165.5,cin=cx>=-.5&&cx<223.5&&cy>=-.5&&cy<165.5;
      const lx=cx-101.5,ly=cy-88.5;gas[3]=Math.max(cin?sample(pixels.core,224,166,cx,cy,0)/255:0,1-smooth(.975,1,Math.hypot(lx,ly)/R));
      if(inside){const core=sample(pixels.core,224,166,x,y,0)/255,rim=Math.max(sample(pixels.core,224,166,x+2,y,0),sample(pixels.core,224,166,x-2,y,0),sample(pixels.core,224,166,x,y+2,0),sample(pixels.core,224,166,x,y-2,0))/255,moving=.92*(1-rim)*smooth(23,30,geo[g+10]),fu=mod(geo[g+7]-(motion.turns+motion.a*(geo[g+9]-1/180))*dir,1)*512-.5,fu2=mod(geo[g+7]-(motion.turns+motion.b*(geo[g+9]-1/180))*dir,1)*512-.5,fv=clamp(geo[g+8],0,1)*128-.5;
        sample4(pixels.art,224,166,x,y,hi);sample4(pixels.base,224,166,x,y,lo);sample4(pixels.flow,512,128,fu,fv,detail,true);sample4(pixels.flow,512,128,fu2,fv,alternate,true);for(let k=0;k<3;k++)detail[k]=detail[k]*(1-motion.blend)+alternate[k]*motion.blend;
        for(let k=0;k<3;k++)rgb[k]=(hi[k]*(1-moving)+lo[k]*detail[k]/127.5*moving)/255;
        colorFast(rgb);for(let k=0;k<3;k++)rgb[k]*=1-core;
        over(rgb,opacity(hi[3]/255*(1-core)),gas);
      }
    }else{
      gas[3]=geo[g+3];let a;if(geo[g+6]>.00001){a=disk(geo[g+4],geo[g+5]);over(a,a[3]*geo[g+6],gas);}
      if(geo[g+7]>.00001)over(crestColor,clamp(geo[g+7],0,1),gas);
      for(let l=0;l<3;l++){if(geo[g+10+l*3]<.00001)continue;a=disk(geo[g+8+l*3],geo[g+9+l*3]);over(a,(1-Math.pow(1-Math.min(a[3],.999999),1/3))*geo[g+10+l*3],gas);}
    }
    const field=geo[g+2],alpha=gas[3]+field*(1-gas[3]);
    if(alpha<.00001){out[j]=out[j+1]=out[j+2]=out[j+3]=0;continue;}
    sample4(bg,W,H,pos.x+geo[g]*pos.scale-.5,pos.y+geo[g+1]*pos.scale-.5,skyPixel);
    for(let k=0;k<3;k++)out[j+k]=(gas[k]*255+skyPixel[k]*field*(1-gas[3]))/alpha;
    out[j+3]=alpha*255;
  }
}
class Renderer{
  constructor(prepared){
    this.prepared=prepared;this.atlas=makeAtlas(prepared.pixels);const ac=this.atlasCanvas=document.createElement('canvas');ac.width=AW;ac.height=AH;const ax=ac.getContext('2d'),im=ax.createImageData(AW,AH);im.data.set(this.atlas);ax.putImageData(im,0,0);
    this.canvas=document.createElement('canvas');this.canvas.width=this.canvas.height=640;
    try{const gl=this.gl=this.canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true});if(!gl)return;
      const shader=(type,source)=>{const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh;};
      const p=this.program=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,VS));gl.attachShader(p,shader(gl.FRAGMENT_SHADER,FS));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));gl.useProgram(p);
      gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);const loc=gl.getAttribLocation(p,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
      this.uniforms={};for(const k of ['art','core','base','flow','atlas','sky','time','spinDirection','lens','lensReach','patchSize','ringSize','density','glow','tintAmount','view3d','thickness','tint','axisU','axisV','normal','roll','placement'])this.uniforms[k]=gl.getUniformLocation(p,k);
      this.textures=Array.from({length:6},(_,i)=>{const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,i===3||i===4?gl.REPEAT:gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;});
    }catch(e){console.warn('Reference variants: using software renderer',e);this.gl=null;}
  }
  draw(ctx,background,input,time,W,H){
    const s=settings(input),size=extent(s),pos=G.AsgardReference.positionAt({...s,extent:size/(2*R)},time,W,H),gl=this.gl;
    if(gl){gl.useProgram(this.program);gl.viewport(0,0,640,640);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
      // WebGL1 needs power-of-two textures for mipmaps. Filter only the sampled
      // sky; the original gas artwork and fine disk texture stay untouched.
      const sky=this.filteredSky||(this.filteredSky=document.createElement('canvas'));
      const power=n=>Math.min(2048,Math.max(256,2**Math.round(Math.log2(Math.max(1,n)))));
      const bw=power(background.width),bh=power(background.height);
      if(sky.width!==bw||sky.height!==bh){sky.width=bw;sky.height=bh;}
      sky.getContext('2d').drawImage(background,0,0,bw,bh);
      [this.prepared.art,this.prepared.core,this.prepared.base,this.prepared.flow,this.atlasCanvas,sky].forEach((src,i)=>{gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,this.textures[i]);if(i===5||!this.uploaded)gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,src);if(i===5){gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);}gl.uniform1i(this.uniforms[['art','core','base','flow','atlas','sky'][i]],i);});this.uploaded=true;
      const b=basis(s),roll=(s.axisZ+50)*Math.PI/180;
      for(const [k,v] of Object.entries({time:time*(s.speed??1),spinDirection:s.spinDirection<0?-1:1,lens:Math.max(0,s.lens??.9),lensReach:s.lensReach??3.24,patchSize:size,ringSize:s.ringSize,density:s.density,glow:s.glow,tintAmount:s.tintAmount,view3d:s.view3d?1:0,thickness:s.thickness}))gl.uniform1f(this.uniforms[k],v);
      for(const [k,v] of Object.entries({tint:tintOf(s),axisU:b.u,axisV:b.v,normal:b.n}))gl.uniform3fv(this.uniforms[k],v);
      gl.uniform2f(this.uniforms.roll,Math.cos(roll),Math.sin(roll));gl.uniform4f(this.uniforms.placement,pos.x/W,pos.y/H,pos.scale/W,pos.scale/H);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    }else{
      const n=224;if(!this.sw){const c=document.createElement('canvas');c.width=c.height=n;const x=c.getContext('2d'),bg=document.createElement('canvas');this.sw={canvas:c,ctx:x,frame:x.createImageData(n,n),sky:bg,bx:bg.getContext('2d',{willReadFrequently:true})};}
      const sw=this.sw,key=JSON.stringify([s.view3d,s.ringSize,s.tilt,s.axisY,s.axisZ,s.thickness,s.density,s.lens,s.lensReach]),all=JSON.stringify(s);
      if(sw.key!==key){sw.geo=geometry(s,n);sw.key=key;}
      if(sw.time===undefined||Math.abs(time-sw.time)>=1/24||sw.all!==all){if(sw.sky.width!==W||sw.sky.height!==H){sw.sky.width=W;sw.sky.height=H;}sw.bx.drawImage(background,0,0,W,H);renderSoftware(sw.frame.data,this.prepared.pixels,this.atlas,sw.bx.getImageData(0,0,W,H).data,W,H,s,time,n,sw.geo);sw.ctx.putImageData(sw.frame,0,0);sw.time=time;sw.all=all;}
    }
    ctx.drawImage(gl?this.canvas:this.sw.canvas,pos.x-size/2*pos.scale,pos.y-size/2*pos.scale,size*pos.scale,size*pos.scale);return true;
  }
}
G.AsgardVariants={orientationFor,tier2At,liveSettings,defaults,settings,isOriginal,basis,extent,makeAtlas,geometry,renderSoftware,Renderer,VS,FS};
})(window);
