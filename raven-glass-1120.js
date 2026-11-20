/* Camera-backed glass optics and editable hologram entrances. */
(function(root) {
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const number=(v,d)=>Number.isFinite(Number(v))?Number(v):d;
  function ease(t,kind) {
    t=clamp(t,0,1);
    if(kind==='linear')return t;
    if(kind==='smooth')return t*t*(3-2*t);
    if(kind==='soft')return 1-Math.pow(1-t,5);
    return 1-Math.pow(1-t,3);
  }
  function duration(p,part) {
    const explicit=number(p[part+'.entry.duration'],0);
    return explicit>0?explicit:Math.max(1,number(p['anim.rise'],1600)*(part==='glass'?number(p['anim.slide'],.4):1));
  }
  function delay(p,part) {
    const value=Math.max(0,number(p[part+'.entry.delay'],0));
    return part==='dial'&&p['dial.entry.waitGlass']?Math.max(value,Math.max(0,number(p['glass.entry.delay'],0))+(p['glass.entry.style']==='instant'?0:duration(p,'glass'))):value;
  }
  function formation(p,progress,index=0) {
    const colorAt=clamp(number(p['build.colorAt'],.72),.4,.95),delay=Math.min(colorAt*.5,Math.max(0,index*number(p['build.stagger'],.035)));
    const local=clamp((progress-delay)/Math.max(.01,colorAt-delay),0,1);
    return {trace:ease(clamp(local/.78,0,1),'smooth'),assemble:ease(clamp((local-.15)/.85,0,1),'smooth'),color:ease(clamp((progress-colorAt)/(1-colorAt),0,1),'smooth'),guides:Math.sin(Math.PI*clamp(local,0,1))};
  }
  function entry(p,part,elapsed,W,H,close) {
    const prefix=part+'.entry.',style=p[prefix+'style']||'slide';
    const wait=delay(p,part),ms=duration(p,part);
    const progress=close==null?clamp((elapsed-wait)/ms,0,1):clamp(close,0,1);
    const t=ease(progress,p[prefix+'ease']),result={style,progress,t,x:0,y:0,scale:1,alpha:1,trace:1,scan:1,blur:0};
    if(progress<=0)result.alpha=0;
    if(style==='slide') {
      const direction=p[prefix+'direction']||'bottom',distance=number(p[prefix+'distance'],1)*(direction==='left'||direction==='right'?W:H)*(1-t);
      result.x=direction==='left'?-distance:direction==='right'?distance:0;
      result.y=direction==='top'?-distance:direction==='bottom'?distance:0;
    } else if(style==='materialize'){result.alpha=t;result.blur=(1-t)*number(p[prefix+'softness'],14);}
    else if(style==='grow'){result.scale=number(p[prefix+'startScale'],.05)+(1-number(p[prefix+'startScale'],.05))*t;result.alpha=t;}
    else if(style==='scan'){result.scan=t;result.alpha=progress>0?1:0;}
    else if(style==='trace'){result.trace=progress;result.alpha=progress>0?1:0;}
    else if(style==='segments'){result.segments=t;result.alpha=progress>0?1:0;}
    else if(style==='blueprint'){result.alpha=progress>0?1:0;}
    else if(style==='instant'){result.alpha=elapsed>=wait&&close!==0?1:0;result.progress=result.t=result.alpha;}
    if(part==='glass')result.y+=number(p['glass.finalY'],0);
    return result;
  }
  function edgeSample(x,y,box,width,strength) {
    const radius=Math.max(0,Math.min(box.radius,(box.r-box.l)/2,(box.b-box.t)/2));
    const dx=x-(box.l+box.r)/2,dy=y-(box.t+box.b)/2;
    const qx=Math.abs(dx)-((box.r-box.l)/2-radius),qy=Math.abs(dy)-((box.b-box.t)/2-radius);
    const px=Math.max(qx,0),py=Math.max(qy,0),length=Math.hypot(px,py);
    const signed=Math.min(Math.max(qx,qy),0)+length-radius;
    if(signed>0||signed < -width||width<=0)return null;
    let nx=0,ny=0;
    if(length>0){nx=Math.sign(dx)*px/length;ny=Math.sign(dy)*py/length;}
    else if(qx>qy)nx=Math.sign(dx);else ny=Math.sign(dy);
    const bend=Math.sin(clamp(-signed/width,0,1)*Math.PI)*width*strength;
    return {x:x-nx*bend,y:y-ny*bend,nx,ny,alpha:clamp(-signed+.5,0,1)};
  }
  function sample(data,W,H,x,y,c) {
    x=clamp(x,0,W-1);y=clamp(y,0,H-1);const X=Math.floor(x),Y=Math.floor(y),u=x-X,v=y-Y,X1=Math.min(W-1,X+1),Y1=Math.min(H-1,Y+1);
    return (data[(Y*W+X)*4+c]*(1-u)+data[(Y*W+X1)*4+c]*u)*(1-v)+(data[(Y1*W+X)*4+c]*(1-u)+data[(Y1*W+X1)*4+c]*u)*v;
  }
  // Geometry is cached independently of the moving camera. Only source pixels
  // are refreshed per frame; no repeated signed-distance or normal calculation.
  function bevelPoints(W,H,box,width,strength,dispersion) {
    const points=[];
    for(let y=Math.max(0,Math.floor(box.t));y<Math.min(H,Math.ceil(box.b));y++)for(let x=Math.max(0,Math.floor(box.l));x<Math.min(W,Math.ceil(box.r));x++){
      if(y>box.t+box.radius+width&&y<box.b-box.radius-width&&x>box.l+width&&x<box.r-width){x=Math.ceil(box.r-width)-1;continue;}
      const q=edgeSample(x+.5,y+.5,box,width,strength);if(!q)continue;
      points.push({at:(y*W+x)*4,x:q.x,y:q.y,nx:q.nx*dispersion,ny:q.ny*dispersion,alpha:Math.round(255*q.alpha)});
    }
    return points;
  }
  function sourcePlan(points,W,H,offsetX,offsetY) {
    const length=points.length*3,indices=new Int32Array(length*4),weights=new Float32Array(length*4),dest=new Int32Array(length);
    let j=0;
    for(const p of points)for(let c=0;c<3;c++,j++){
      const x=clamp(p.x+offsetX+(c-1)*p.nx,0,W-1),y=clamp(p.y+offsetY+(c-1)*p.ny,0,H-1),X=Math.floor(x),Y=Math.floor(y),u=x-X,v=y-Y,X1=Math.min(W-1,X+1),Y1=Math.min(H-1,Y+1),k=j*4;
      indices[k]=(Y*W+X)*4+c;indices[k+1]=(Y*W+X1)*4+c;indices[k+2]=(Y1*W+X)*4+c;indices[k+3]=(Y1*W+X1)*4+c;
      weights[k]=(1-u)*(1-v);weights[k+1]=u*(1-v);weights[k+2]=(1-u)*v;weights[k+3]=u*v;dest[j]=p.at+c;
    }
    return {indices,weights,dest};
  }
  function refractPixels(src,dst,plan) {
    const {indices:a,weights:b,dest}=plan;
    for(let i=0,k=0;i<dest.length;i++,k+=4)dst[dest[i]]=src[a[k]]*b[k]+src[a[k+1]]*b[k+1]+src[a[k+2]]*b[k+2]+src[a[k+3]]*b[k+3];
  }
  let snapshot,edge,reflection,lastFrame=-1,failed=false,backgroundKey='',geometryKey='',offsetKey='',points,plan,edgePixels;
  const canvas=()=>document.createElement('canvas');
  function surface(ctx,m,p,e,touch) {
    const K=root.StudioKit,W=K.W,H=K.H;
    snapshot ||= canvas();edge ||= canvas();reflection ||= canvas();
    const frame=K.frameId(),box={l:m.glassLeft,r:m.glassRight,t:m.glassTop,b:m.glassBottom,radius:p['glass.round']};
    if(snapshot.width!==W||snapshot.height!==H){snapshot.width=edge.width=W;snapshot.height=edge.height=H;lastFrame=-1;}
    if(frame!==lastFrame) {
      const key=p['bg.mode']+':'+p['bg.image']+':'+p['bg.facing'];
      if(key!==backgroundKey){failed=false;backgroundKey=key;snapshot.width=W;}
      const bg=snapshot.getContext('2d',{willReadFrequently:true});bg.clearRect(0,0,W,H);K.drawBackground(bg,p);
      const ex=edge.getContext('2d');ex.clearRect(0,0,W,H);
      if(p['glass.refract']>0&&!failed) {
        try {
          const src=bg.getImageData(0,0,W,H).data,bw=number(p['glass.bevel'],10),disp=number(p['glass.dispersion'],.35);
          const geometry=[W,H,box.l,box.r,box.t,box.b,box.radius,bw,p['glass.refract'],disp].join(',');
          if(geometry!==geometryKey){points=bevelPoints(W,H,box,bw,p['glass.refract'],disp);edgePixels=ex.createImageData(W,H);for(const q of points)edgePixels.data[q.at+3]=q.alpha;geometryKey=geometry;offsetKey='';}
          const offset=e.x+','+e.y;if(offset!==offsetKey){plan=sourcePlan(points,W,H,e.x,e.y);offsetKey=offset;}
          refractPixels(src,edgePixels.data,plan);ex.putImageData(edgePixels,0,0);
        }catch(error){failed=true;K.status('Glass edge refraction could not read this background: '+error.message);}
      }
      // Reflections use a mirrored, enlarged version of the same live camera.
      // A broad diagonal highlight mask makes it read as glass glare rather
      // than a second sharp scene. No camera frames leave the browser.
      reflection.width=Math.max(2,Math.round(W*.5));reflection.height=Math.max(2,Math.round(H*.5));
      const rx=reflection.getContext('2d'),rw=reflection.width,rh=reflection.height;
      rx.save();rx.translate(rw,0);rx.scale(-1,1);rx.filter='saturate(.25) contrast(1.5) brightness(1.3)';rx.drawImage(snapshot,-rw*.08,-rh*.08,rw*1.16,rh*1.16);rx.restore();
      rx.globalCompositeOperation='destination-in';
      const response=number(p['glass.glareMotion'],.1)*(touch?.press||0),angle=number(p['glass.glareAngle'],-28)*Math.PI/180,cx=rw*(.5+number(p['glass.glareX'],0)+(touch?.x||0)*response),cy=rh*(.5+number(p['glass.glareY'],0)+(touch?.y||0)*response);
      const span=Math.max(4,rw*number(p['glass.glareWidth'],.3)),dx=Math.cos(angle)*span,dy=Math.sin(angle)*span;
      const mask=rx.createLinearGradient(cx-dx,cy-dy,cx+dx,cy+dy);
      mask.addColorStop(0,'rgba(255,255,255,0)');mask.addColorStop(.38,'rgba(255,255,255,.12)');mask.addColorStop(.5,'rgba(255,255,255,.8)');mask.addColorStop(.62,'rgba(255,255,255,.12)');mask.addColorStop(1,'rgba(255,255,255,0)');
      rx.fillStyle=mask;rx.fillRect(0,0,rw,rh);rx.globalCompositeOperation='source-over';
      lastFrame=frame;
    }
    ctx.save();ctx.beginPath();ctx.roundRect(m.glassLeft,m.glassTop,m.glassRight-m.glassLeft,m.glassBottom-m.glassTop,box.radius);ctx.clip();
    if(p['glass.frost']>0){ctx.save();K.blur(ctx,p['glass.frost']);ctx.drawImage(snapshot,-e.x,-e.y,W,H);ctx.restore();}
    ctx.drawImage(edge,0,0,W,H);
    if(p['glass.tintStrength']>0){ctx.save();ctx.globalAlpha*=p['glass.tintStrength'];ctx.fillStyle=p['glass.tint'];ctx.fillRect(m.glassLeft,m.glassTop,m.glassRight-m.glassLeft,m.glassBottom-m.glassTop);ctx.restore();}
    if(p['glass.glare']>0){ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha*=p['glass.glare'];K.blur(ctx,p['glass.glareSoftness']);ctx.drawImage(reflection,-e.x,-e.y,W,H);ctx.restore();}
    ctx.restore();
  }
  const api=Object.freeze({ease,duration,delay,formation,entry,edgeSample,sample,bevelPoints,sourcePlan,refractPixels,surface});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RavenGlass=api;
})(typeof window!=='undefined'?window:this);
