(function(G){'use strict';const C=typeof module!=='undefined'?require('./studio-effects-core'):G.StudioEffects;
function construction(ctx,w,h,t,input,image=null){const d=C.clean(input),c=d.construction,p=Math.max(0,Math.min(1,t/c.duration));ctx.fillStyle=c.paper;ctx.fillRect(0,0,w,h);const camera=d.camera,angle=(camera.angle+Math.sin(p*Math.PI)*camera.sweep)*Math.PI/180,tilt=camera.tilt*Math.PI/180;const project=(x,y,z)=>{const a=x*Math.cos(angle)+z*Math.sin(angle),zz=-x*Math.sin(angle)+z*Math.cos(angle),b=y*Math.cos(tilt)-zz*Math.sin(tilt),depth=y*Math.sin(tilt)+zz*Math.cos(tilt),scale=650/(650+depth);return{x:w/2+a*scale*camera.zoom,y:h/2+b*scale*camera.zoom};};const path=(points,close=true)=>{ctx.beginPath();points.forEach((v,i)=>i?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y));if(close)ctx.closePath();};const aw=w*.68,ah=h*.48;ctx.lineWidth=c.lineWidth;ctx.strokeStyle=c.ink;const draw=C.ease(p/.22),seat=C.ease((p-.2)/.43),retire=1-C.ease((p-.65)/.26);
 if(c.guides){ctx.globalAlpha=.22*retire;for(const n of [-1,0,1]){path([project(-aw*.7,ah*.65*n,0),project(aw*.7*draw,ah*.65*n,0)],false);ctx.stroke();path([project(aw*.65*n,-ah*.7,0),project(aw*.65*n,ah*.7*draw,0)],false);ctx.stroke();}}
 for(let layer=3;layer>=0;layer--){const z=(layer+1)*35*(1-seat)*c.depth,yOffset=-(1-seat)*layer*9*c.lift,pts=[[-aw/2,-ah/2],[aw/2,-ah/2],[aw/2,ah/2],[-aw/2,ah/2]].map(([x,y])=>project(x,y+yOffset,z));const color=[c.ink,c.blue,c.amber,c.red][layer];ctx.strokeStyle=color;ctx.fillStyle=color;ctx.globalAlpha=.05*draw*retire;path(pts);ctx.fill();ctx.globalAlpha=.8*retire;const total=draw*4;for(let edge=0;edge<4;edge++){if(total<=edge)break;const a=pts[edge],b=pts[(edge+1)%4],f=Math.min(1,total-edge);path([a,{x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f}],false);ctx.stroke();}if(c.guides&&layer>0){ctx.globalAlpha=.2*retire;for(let i=0;i<4;i++){const q=[[-aw/2,-ah/2],[aw/2,-ah/2],[aw/2,ah/2],[-aw/2,ah/2]][i];path([project(q[0],q[1],0),pts[i]],false);ctx.stroke();}}}
 // Revealed material uses the selected image. Every cell lands on the same final surface.
 for(const b of C.pieces(p,d)){if(!b.reveal)continue;const x=-aw/2+b.x*aw,y=-ah/2+b.y*ah;const a=project(x,y,0),q=project(x+b.width*aw,y,0),r=project(x,y+b.height*ah*b.reveal,0);ctx.save();ctx.transform((q.x-a.x)/(b.width*aw),(q.y-a.y)/(b.width*aw),(r.x-a.x)/(b.height*ah*b.reveal),(r.y-a.y)/(b.height*ah*b.reveal),a.x,a.y);ctx.globalAlpha=1;const iw=image?.videoWidth||image?.naturalWidth||image?.width,ih=image?.videoHeight||image?.naturalHeight||image?.height;if(iw&&ih)ctx.drawImage(image,b.x*iw,b.y*ih,b.width*iw,b.height*ih*b.reveal,0,0,b.width*aw,b.height*ah*b.reveal);else{ctx.fillStyle='#172d38';ctx.fillRect(0,0,b.width*aw,b.height*ah*b.reveal);}ctx.restore();}
 ctx.globalAlpha=1;return p;
}
function clouds(ctx,w,h,t,input,images=[],seed=137,text='Your message takes shape',background=null,preview={}){
 const d=C.clean(input);ctx.fillStyle='#172b38';ctx.fillRect(0,0,w,h);
 if(background?.naturalWidth){ctx.globalAlpha=.55;const r=Math.max(w/background.naturalWidth,h/background.naturalHeight),bw=background.naturalWidth*r,bh=background.naturalHeight*r;ctx.drawImage(background,(w-bw)/2,(h-bh)/2,bw,bh);ctx.globalAlpha=1;}
 const scale=w/390;ctx.save();ctx.scale(scale,scale);
 const draw=(im,x,y,width,alpha=1,turn=0,crop=null)=>{
  const iw=im?.naturalWidth||im?.width,ih=im?.naturalHeight||im?.height;if(!iw||!ih)return;
  ctx.save();ctx.translate(x,y);ctx.rotate(turn);ctx.globalAlpha=alpha;const height=width*.68;
  if(crop)ctx.drawImage(im,crop.x*iw,crop.y*ih,crop.width*iw,crop.height*ih,-width/2,-height/2,width,height);
  else ctx.drawImage(im,-width/2,-height/2,width,height);ctx.restore();
 };
 for(let i=0;i<3;i++)draw(images[i%images.length],195,155+i*125,320,.95);
 const parts=preview.editing?C.cloudPreviewAt(t,d,seed,preview.stage):C.cloudsAt(t,d,seed);
 if(preview.manualAt!=null){const e=C.cloudEvents(d,seed,1)[0],p=C.cloudParticle(e,t-preview.manualAt+e.attach*.5,d.clouds,true);if(p)parts.push(p);}
 const keys=['cloud-mine-billows-v27.webp','cloud-peer-billows-v27.webp','cloud-anvil-258398-v29.webp','cloud-tower-365034-v29.webp','cloud-billows-166852-v29.webp'];
 for(const p of parts){const index=p.id%images.length;draw(images[index],p.x,p.y,p.width*(.42+.58*p.growth),p.opacity,p.turn,d.cloudAssets[keys[index]]?.crown);}
 for(let i=0;i<3;i++){ctx.save();ctx.shadowColor='#17313d';ctx.shadowBlur=5;ctx.shadowOffsetY=2;ctx.fillStyle='white';ctx.font='15px system-ui';ctx.textAlign='center';ctx.fillText(i===1?text:'Message cloud '+(i+1),195,158+i*125,230);ctx.restore();}
 if(preview.editing){ctx.font='12px system-ui';for(const p of parts){if(p.opacity<.08)continue;const label=p.stage,tw=ctx.measureText(label).width,x=Math.max(6,Math.min(384-tw-12,p.x-tw/2-6)),y=Math.max(30,Math.min(480,p.y+Math.min(60,p.width*.25)));ctx.fillStyle='#0d202ddd';ctx.fillRect(x,y-14,tw+12,20);ctx.fillStyle='#8ff3df';ctx.fillText(label,x+6,y);}}
 ctx.restore();return parts;
}

const api={construction,clouds};if(typeof module!=='undefined')module.exports=api;G.StudioEffectsRender=api;
})(typeof window==='undefined'?globalThis:window);
