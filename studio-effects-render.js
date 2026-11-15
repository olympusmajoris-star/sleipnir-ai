(function(G){'use strict';const C=typeof module!=='undefined'?require('./studio-effects-core'):G.StudioEffects;
function construction(ctx,w,h,t,input,image=null){const d=C.clean(input),c=d.construction,p=Math.max(0,Math.min(1,t/c.duration));ctx.fillStyle=c.paper;ctx.fillRect(0,0,w,h);const camera=d.camera,angle=(camera.angle+Math.sin(p*Math.PI)*camera.sweep)*Math.PI/180,tilt=camera.tilt*Math.PI/180;const project=(x,y,z)=>{const a=x*Math.cos(angle)+z*Math.sin(angle),zz=-x*Math.sin(angle)+z*Math.cos(angle),b=y*Math.cos(tilt)-zz*Math.sin(tilt),depth=y*Math.sin(tilt)+zz*Math.cos(tilt),scale=650/(650+depth);return{x:w/2+a*scale*camera.zoom,y:h/2+b*scale*camera.zoom};};const path=(points,close=true)=>{ctx.beginPath();points.forEach((v,i)=>i?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y));if(close)ctx.closePath();};const aw=w*.68,ah=h*.48;ctx.lineWidth=c.lineWidth;ctx.strokeStyle=c.ink;const draw=C.ease(p/.22),seat=C.ease((p-.2)/.43),retire=1-C.ease((p-.65)/.26);
 if(c.guides){ctx.globalAlpha=.22*retire;for(const n of [-1,0,1]){path([project(-aw*.7,ah*.65*n,0),project(aw*.7*draw,ah*.65*n,0)],false);ctx.stroke();path([project(aw*.65*n,-ah*.7,0),project(aw*.65*n,ah*.7*draw,0)],false);ctx.stroke();}}
 for(let layer=3;layer>=0;layer--){const z=(layer+1)*35*(1-seat)*c.depth,yOffset=-(1-seat)*layer*9*c.lift,pts=[[-aw/2,-ah/2],[aw/2,-ah/2],[aw/2,ah/2],[-aw/2,ah/2]].map(([x,y])=>project(x,y+yOffset,z));const color=[c.ink,c.blue,c.amber,c.red][layer];ctx.strokeStyle=color;ctx.fillStyle=color;ctx.globalAlpha=.05*draw*retire;path(pts);ctx.fill();ctx.globalAlpha=.8*retire;const total=draw*4;for(let edge=0;edge<4;edge++){if(total<=edge)break;const a=pts[edge],b=pts[(edge+1)%4],f=Math.min(1,total-edge);path([a,{x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f}],false);ctx.stroke();}if(c.guides&&layer>0){ctx.globalAlpha=.2*retire;for(let i=0;i<4;i++){const q=[[-aw/2,-ah/2],[aw/2,-ah/2],[aw/2,ah/2],[-aw/2,ah/2]][i];path([project(q[0],q[1],0),pts[i]],false);ctx.stroke();}}}
 // Revealed material uses the selected image. Every cell lands on the same final surface.
 for(const b of C.pieces(p,d)){if(!b.reveal)continue;const x=-aw/2+b.x*aw,y=-ah/2+b.y*ah;const a=project(x,y,0),q=project(x+b.width*aw,y,0),r=project(x,y+b.height*ah*b.reveal,0);ctx.save();ctx.transform((q.x-a.x)/(b.width*aw),(q.y-a.y)/(b.width*aw),(r.x-a.x)/(b.height*ah*b.reveal),(r.y-a.y)/(b.height*ah*b.reveal),a.x,a.y);ctx.globalAlpha=1;const iw=image?.videoWidth||image?.naturalWidth||image?.width,ih=image?.videoHeight||image?.naturalHeight||image?.height;if(iw&&ih)ctx.drawImage(image,b.x*iw,b.y*ih,b.width*iw,b.height*ih*b.reveal,0,0,b.width*aw,b.height*ah*b.reveal);else{ctx.fillStyle='#172d38';ctx.fillRect(0,0,b.width*aw,b.height*ah*b.reveal);}ctx.restore();}
 ctx.globalAlpha=1;return p;
}
const cloudKeys=['cloud-mine-billows-v27.webp','cloud-peer-billows-v27.webp','cloud-anvil-258398-v29.webp','cloud-tower-365034-v29.webp','cloud-billows-166852-v29.webp'];
const crowns=[[[100,94,285,180],[260,82,435,181]],[[178,98,355,184],[300,82,470,183]],[[140,137,340,272],[390,124,578,272]],[[98,157,288,282],[340,99,535,247]],[[160,171,310,278],[365,161,490,283]]];
function cloudCrown(index,side,custom){if(custom)return C.crop(custom);const b=crowns[index%crowns.length][side<0?0:1];return{x:b[0]/640,y:b[1]/426,width:(b[2]-b[0])/640,height:(b[3]-b[1])/426};}
const surfaces=new WeakMap();
function surface(ctx){let s=surfaces.get(ctx);if(!s){const canvas=typeof document!=='undefined'?document.createElement('canvas'):new ctx.canvas.constructor(256,160);canvas.width=256;canvas.height=160;s={canvas,ctx:canvas.getContext('2d'),inks:[]};surfaces.set(ctx,s);}return s;}
function cloudFragment(ctx,image,crop,settings,age,fade=0){
 const layer=surface(ctx),x=layer.ctx,w=256,h=160,iw=image?.naturalWidth||image?.width,ih=image?.naturalHeight||image?.height;if(!iw||!ih)return null;
 x.clearRect(0,0,w,h);x.globalCompositeOperation='source-over';x.globalAlpha=1;
 // Only photographed crown detail enters a fragment. No white writing core.
 const shift=Math.sin(age*.17)*settings.deformation*.012,sx=Math.max(0,Math.min(1-crop.width,crop.x+shift));
 x.drawImage(image,sx*iw,crop.y*ih,crop.width*iw,crop.height*ih,0,0,w,h);
 x.globalCompositeOperation='destination-in';
 const soft=Math.min(.45,settings.edgeSoftness+fade*.18),gx=x.createLinearGradient(0,0,w,0);gx.addColorStop(0,'transparent');gx.addColorStop(soft,'white');gx.addColorStop(1-soft,'white');gx.addColorStop(1,'transparent');x.fillStyle=gx;x.fillRect(0,0,w,h);
 const gy=x.createLinearGradient(0,0,0,h);gy.addColorStop(0,'transparent');gy.addColorStop(soft*.7,'white');gy.addColorStop(1-soft,'white');gy.addColorStop(1,'transparent');x.fillStyle=gy;x.fillRect(0,0,w,h);
 x.save();x.translate(w/2,h/2);x.scale(w/2,h/2);const radial=x.createRadialGradient(0,0,0,0,0,1.12);radial.addColorStop(0,'white');radial.addColorStop(Math.max(.1,.65-soft*.45-fade*.2),'white');radial.addColorStop(1,'transparent');x.fillStyle=radial;x.fillRect(-1,-1,2,2);x.restore();x.globalCompositeOperation='source-over';return layer.canvas;
}
function readableInk(pixels){
 let sum=0,n=0;const linear=v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;};
 for(let i=0;i<pixels.length;i+=16){sum+=.2126*linear(pixels[i])+.7152*linear(pixels[i+1])+.0722*linear(pixels[i+2]);n++;}
 const l=n?sum/n:1;return(l+.05)/.05>=1.05/(l+.05)?'#101b28':'#ffffff';
}
function cloudText(ctx,text,x,y,scale,settings){
 const t=settings;ctx.save();ctx.font=`${Math.round(t.weight/100)*100} ${t.size}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';
 const lines=[];let line='';for(const word of String(text).split(/\s+/)){const next=line?line+' '+word:word;if(ctx.measureText(next).width>234&&line){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);
 let color=t.color;if(t.autoContrast){try{const left=Math.max(0,Math.round((x-100)*scale)),top=Math.max(0,Math.round((y-12)*scale));color=readableInk(ctx.getImageData(left,top,Math.round(200*scale),Math.round(24*scale)).data);}catch{color='#101b28';}}
 ctx.globalAlpha=t.opacity;ctx.fillStyle=color;
 const hex=t.shadowColor,alpha=Math.round(t.shadowOpacity*255).toString(16).padStart(2,'0');ctx.shadowColor=hex+alpha;ctx.shadowBlur=t.shadowBlur;ctx.shadowOffsetY=t.shadowDistance;
 const lineHeight=t.size*t.lineHeight;lines.slice(0,4).forEach((line,i)=>{const yy=y+(i-(Math.min(4,lines.length)-1)/2)*lineHeight;if(t.outlineWidth>0){ctx.lineJoin='round';ctx.lineWidth=t.outlineWidth*2;ctx.strokeStyle=t.outlineColor;ctx.strokeText(line,x,yy,234);}ctx.fillText(line,x,yy,234);});ctx.restore();return color;
}
function fragmentPosition(p,anchorX,anchorY,settings,contained){
 const distance=Math.max(0,p.age-p.attach)*7*settings.speed;
 // Travel begins at the sampled crown. Constraining the old full-cloud
 // coordinates before translating to this crown trapped fragments inside it.
 const drift=contained?90*(1-Math.exp(-distance/90)):distance;
 let x=anchorX+p.side*(p.width*.12*p.growth+drift)+Math.sin(p.age*.13+p.phase)*settings.wander*8;
 let y=anchorY-drift*.7+Math.cos(p.age*.11+p.phase)*settings.wander*4;
 if(contained){const half=Math.min(185,p.width/2);x=Math.max(half+5,Math.min(385-half,x));y=Math.max(25,Math.min(475,y));}
 if(p.fate==='absorb'&&p.finish>0){x+=(195-x)*p.finish;y+=(155+((p.source+1)%3)*125-y)*p.finish;}
 return{x,y};
}
function clouds(ctx,w,h,t,input,images=[],seed=137,text='Your message takes shape',background=null,preview={}){
 const d=C.clean(input);ctx.fillStyle='#172b38';ctx.fillRect(0,0,w,h);
 if(background?.naturalWidth){ctx.globalAlpha=.55;const r=Math.max(w/background.naturalWidth,h/background.naturalHeight),bw=background.naturalWidth*r,bh=background.naturalHeight*r;ctx.drawImage(background,(w-bw)/2,(h-bh)/2,bw,bh);ctx.globalAlpha=1;}
 const scale=w/390;ctx.save();ctx.scale(scale,scale);
 const draw=(im,x,y,width,height,alpha=1,turn=0)=>{if(!im||!(im.naturalWidth||im.width))return;ctx.save();ctx.translate(x,y);ctx.rotate(turn);ctx.globalAlpha=Math.max(0,Math.min(1,alpha));ctx.drawImage(im,-width/2,-height/2,width,height);ctx.restore();};
 const sourceFor=i=>i===1&&preview.focusSource>=3?preview.focusSource:i;
 for(let i=0;i<3;i++)draw(images[sourceFor(i)%images.length],195,155+i*125,320,320*.68,.95);
 const parts=preview.editing?C.cloudPreviewAt(t,d,seed,preview.stage):C.cloudsAt(t,d,seed);
 if(preview.manualAt!=null){const e=C.cloudEvents(d,seed,1)[0],p=C.cloudParticle(e,t-preview.manualAt+e.attach*.5,d.clouds,true);if(p)parts.push(p);}
 for(const p of parts){
  const index=sourceFor(p.source)%images.length,custom=index===preview.draftSource?{x:.2,y:.08,width:.55,height:.42}:d.cloudAssets[cloudKeys[index]]?.crown;
  const crop=cloudCrown(index,p.side,custom),patch=cloudFragment(ctx,images[index],crop,d.clouds,p.age,p.fate==='dissolve'?p.finish:0);if(!patch)continue;
  const parentY=155+p.source*125,anchorX=35+(crop.x+crop.width/2)*320,anchorY=parentY-108.8+(crop.y+crop.height/2)*217.6;
  const {x:px,y:py}=fragmentPosition(p,anchorX,anchorY,d.clouds,preview.editing);
  const stretch=1+d.clouds.deformation*.12*Math.sin(p.age*.23+p.phase),width=p.width*(.42+.58*p.growth)*stretch,height=width*Math.min(.9,crop.height*426/(crop.width*640))/stretch;
  const opacity=p.opacity*d.clouds.density;
  // A narrowing trail of the same moving cloud texture maintains continuity
  // through detachment; it never pastes a second complete cloud silhouette.
  if(p.connection>.001){const count=5;for(let i=0;i<count;i++){const f=(i+.5)/count,neck=width*(.4+.18*Math.sin(f*Math.PI))*p.connection;draw(patch,anchorX+(px-anchorX)*f,anchorY+(py-anchorY)*f,neck,neck*.55,opacity*p.connection*.58,p.turn*f);}}
  draw(patch,px,py,width,height,opacity,p.turn);
 }
 for(let i=0;i<3;i++)cloudText(ctx,i===1?text:'Message cloud '+(i+1),195,158+i*125,scale,d.text);
 ctx.restore();return parts;
}

function cloudClip(ctx,w,h,source,input){
 const d=C.clean(input),iw=source?.videoWidth||source?.naturalWidth||source?.width,ih=source?.videoHeight||source?.naturalHeight||source?.height;
 ctx.clearRect(0,0,w,h);if(!iw||!ih)return;
 const b=d.media.crop,scale=Math.min(w/(iw*b.width),h/(ih*b.height)),dw=iw*b.width*scale,dh=ih*b.height*scale;
 ctx.save();ctx.filter=`brightness(${d.media.brightness}) contrast(${d.media.contrast}) saturate(${d.media.saturation})`;
 ctx.drawImage(source,b.x*iw,b.y*ih,b.width*iw,b.height*ih,(w-dw)/2,(h-dh)/2,dw,dh);ctx.restore();
 if(d.preparation.removeBackground){const pixels=ctx.getImageData(0,0,w,h);C.keyPixels(pixels.data,d);ctx.putImageData(pixels,0,0);}
}

const api={construction,clouds,cloudClip,cloudCrown,cloudFragment,fragmentPosition,readableInk,cloudText};if(typeof module!=='undefined')module.exports=api;G.StudioEffectsRender=api;
})(typeof window==='undefined'?globalThis:window);
