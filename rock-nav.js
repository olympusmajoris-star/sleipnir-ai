/* Asgard's shared asteroid navigation. Source rock textures remain untouched.
   Rune grooves, rune emission, original fissure emission and debris are independent layers. */
(function(root){
'use strict';
const IDS=['home','swap','messages','track','share'];
const META={home:['Home','ᛟ','Othala'],swap:['Swap','ᚷ','Gebo'],messages:['Messages','ᚨ','Ansuz'],track:['Track','ᚱ','Raidho'],share:['Share','ᚹ','Wunjo']};
const PATHS={
 home:[[-.34,.02,0,-.43],[0,-.43,.34,.02],[.34,.02,0,.35],[0,.35,-.34,.02],[0,.35,.23,.57],[0,.35,-.23,.57]],
 swap:[[-.34,-.43,.34,.43],[.34,-.43,-.34,.43]],
 messages:[[-.25,-.48,-.25,.48],[-.25,-.48,.34,-.12],[-.25,-.12,.34,.24]],
 track:[[-.3,-.48,-.3,.48],[-.3,-.48,.26,-.3],[.26,-.3,.26,-.02],[.26,-.02,-.3,.12],[-.3,.12,.34,.48]],
 share:[[-.28,-.48,-.28,.48],[-.28,-.48,.3,-.22],[.3,-.22,-.28,.08]]
};
const clone=x=>JSON.parse(JSON.stringify(x)), clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const seed=n=>{const v=Math.sin(n*127.17+91.79)*43758.5453;return v-Math.floor(v);};
function noise(x,y){const a=Math.floor(x),b=Math.floor(y);let u=x-a,v=y-b;u=u*u*(3-2*u);v=v*v*(3-2*v);return (seed(a+b*71)*(1-u)+seed(a+1+b*71)*u)*(1-v)+(seed(a+(b+1)*71)*(1-u)+seed(a+1+(b+1)*71)*u)*v;}
const placements=[[.48,.45,.47,-9,0,1],[.51,.48,.36,15,-.12,.82],[.39,.46,.36,-14,-.05,1.1],[.70,.32,.31,-28,.05,1],[.63,.58,.37,-26,.16,.82]];
function defaults(){return {version:1,layout:{size:68,gap:8,x:.5,y:.90,labels:true,labelSize:10,fadeTop:.77,black:1},motion:{speed:1,paused:false},debris:{count:24,min:3,max:12,speed:18,direction:-1,spread:112,y:0,opacity:.82,depth:.75,orbit:2,orbitSpeed:.18,orbitRadius:45,spin:.3},stars:{count:35,size:.65,brightness:.5,speed:3,layers:3},active:{glow:1.35,extraDebris:2,speed:1.3},rocks:Object.fromEntries(IDS.map((id,i)=>[id,{size:1,x:0,y:0,rotation:0,lean:0,brightness:1,drift:2,driftSpeed:.16,turn:1.3,rune:{x:placements[i][0],y:placements[i][1],size:placements[i][2],angle:placements[i][3],slant:placements[i][4],height:placements[i][5],width:.038,depth:.85,roughness:.72,follow:.7,intensity:1.1,color:'#66e4ff',spread:.8,softness:.6,pulse:0,pulseSpeed:.12},cracks:{intensity:1,spread:.15,recolor:false,color:'#66e4ff'}}])),variants:[]};}
function merge(a,b){const o=clone(a);for(const k of Object.keys(a)){if(b&&Object.prototype.hasOwnProperty.call(b,k)){if(a[k]&&typeof a[k]==='object'&&!Array.isArray(a[k]))o[k]=merge(a[k],b[k]);else if(typeof b[k]===typeof a[k]&&(typeof b[k]!=='number'||Number.isFinite(b[k])))o[k]=b[k];}}return o;}
function visible(page,shareAvailable){return IDS.filter(id=>id!=='share'||(page!=='convo'&&page!=='messages'&&!!shareAvailable));}
function activeId(page){return page==='convo'?'messages':IDS.includes(page)?page:null;}
function get(o,p){return p.split('.').reduce((v,k)=>v?.[k],o);}
function set(o,p,v){const keys=p.split('.');if(keys.some(k=>['__proto__','prototype','constructor'].includes(k)))return;let a=o;for(const k of keys.slice(0,-1))a=a[k]??(a[k]={});a[keys.at(-1)]=v;}
function patch(base,edits){const out=clone(base);for(const [p,v]of edits)set(out,p,clone(v));return out;}
function distance(x,y,s){const dx=s[2]-s[0],dy=s[3]-s[1],t=clamp(((x-s[0])*dx+(y-s[1])*dy)/(dx*dx+dy*dy),0,1);return Math.hypot(x-s[0]-t*dx,y-s[1]-t*dy);}
const API={IDS,META,PATHS,defaults,visible,activeId,merge,patch,distance};
if(typeof module!=='undefined')module.exports=API;
if(typeof document==='undefined')return;
const make=(w,h=w)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const rgb=h=>{const n=parseInt(h.slice(1),16);return [n>>16&255,n>>8&255,n&255];};
const tint=(src,color)=>{const c=make(src.width,src.height),x=c.getContext('2d');x.drawImage(src,0,0);x.globalCompositeOperation='source-in';x.fillStyle=color;x.fillRect(0,0,c.width,c.height);return c;};
class RockTexture{
 constructor(id,url){this.id=id;this.ready=false;this.error=false;this.img=new Image();this.img.crossOrigin='anonymous';this.img.onload=()=>{this.base=make(512);const c=this.base.getContext('2d',{willReadFrequently:true});c.drawImage(this.img,0,0,512,512);this.data=c.getImageData(0,0,512,512);this.emission=make(512);const e=this.emission.getContext('2d'),d=e.createImageData(512,512);for(let p=0;p<d.data.length;p+=4){const a=this.data.data;const m=clamp((Math.max(a[p+1],a[p+2])-a[p]*1.25-12)/140,0,1)*clamp((a[p+1]+a[p+2]-75)/260,0,1);d.data[p]=a[p];d.data[p+1]=a[p+1];d.data[p+2]=a[p+2];d.data[p+3]=a[p+3]*m;}e.putImageData(d,0,0);this.ready=true;};this.img.onerror=()=>this.error=true;this.img.src=url;}
 sample(u,v){const x=clamp(Math.round(u*511),0,511),y=clamp(Math.round(v*511),0,511),p=(y*512+x)*4,d=this.data.data;return (d[p]*.21+d[p+1]*.72+d[p+2]*.07)/255;}
 build(S){if(!this.ready)return;const r=S.rune,k=JSON.stringify([r.x,r.y,r.size,r.angle,r.slant,r.height,r.width,r.depth,r.roughness,r.follow,r.color,S.cracks.intensity,S.cracks.recolor,S.cracks.color]);if(k===this.key)return;this.key=k;
  this.groove=make(512);this.light=make(512);this.body=make(512);const gx=this.groove.getContext('2d'),lx=this.light.getContext('2d'),bx=this.body.getContext('2d');const gd=gx.createImageData(512,512),ld=lx.createImageData(512,512),bd=new ImageData(new Uint8ClampedArray(this.data.data),512,512);const col=rgb(r.color),cr=rgb(S.cracks.color),em=this.emission.getContext('2d').getImageData(0,0,512,512).data,ang=-r.angle*Math.PI/180,ca=Math.cos(ang),sa=Math.sin(ang);
  const width=Math.max(.003,r.width),size=Math.max(.08,r.size),hei=Math.max(.25,r.height);
  for(let y=0;y<512;y++)for(let x=0;x<512;x++){const p=(y*512+x)*4,a=this.data.data[p+3]/255;if(a<.01)continue;const u=x/512,v=y/512,lum=this.sample(u,v),m=em[p+3]/255;for(let j=0;j<3;j++){const base=bd.data[p+j],original=em[p+j]*m;bd.data[p+j]=clamp(base-original+(S.cracks.recolor?cr[j]*m:original)*S.cracks.intensity,0,255);}
   let qx=(u-r.x)/size,qy=(v-r.y)/size;const rx=qx*ca-qy*sa,ry=(qx*sa+qy*ca)/hei;qx=rx-ry*r.slant;qy=ry;
   if(Math.abs(qx)>.75||Math.abs(qy)>.75)continue;
   const n=noise(u*57+3,v*57+9),n2=noise(u*173,v*173),ridge=(this.sample(u+.004,v)-this.sample(u-.004,v));
   qx+=(noise(u*24,v*29)-.5)*.035*r.roughness+ridge*.11*r.follow;
   qy+=(noise(u*29+31,v*24)-.5)*.025*r.roughness+(lum-this.sample(u,v+.008))*.10*r.follow;
   let d=9,nx=0,ny=0;for(const seg of PATHS[this.id]){const dx=seg[2]-seg[0],dy=seg[3]-seg[1],q=clamp(((qx-seg[0])*dx+(qy-seg[1])*dy)/(dx*dx+dy*dy),0,1),vx=qx-seg[0]-q*dx,vy=qy-seg[1]-q*dy,nd=Math.hypot(vx,vy);if(nd<d){d=nd;nx=vx/(nd||1);ny=vy/(nd||1);}}
   const w=width*(1+(n-.5)*.9*r.roughness+(n2-.5)*.5*r.roughness),edge=1-clamp((d-w*2.25)/.010,0,1);if(edge<=0)continue;
   const inner=1-clamp((d-w*.27)/(w*.72),0,1),bevel=clamp(1-Math.abs(d-w*1.75)/(w*.46),0,1);const ledge=(.3+.7*n)*bevel*r.depth*clamp(-nx*.6-ny*.8,0,1);
   for(let j=0;j<3;j++){gd.data[p+j]=clamp(this.data.data[p+j]*(.20+.8*(1-r.depth))+(j===0?52:64)*ledge,0,255);ld.data[p+j]=Math.min(255,col[j]*(.77+.23*n2)+(1-clamp(d/(w*.25),0,1))*25);}
   gd.data[p+3]=edge*a*255;ld.data[p+3]=inner*a*255*(.58+.42*n)*(1-clamp(lum-.25,0,.5)*r.follow);
  }
  bx.putImageData(bd,0,0);gx.putImageData(gd,0,0);lx.putImageData(ld,0,0);this.crackLight=S.cracks.recolor?tint(this.emission,S.cracks.color):this.emission;
 }
 draw(x,S,cx,cy,size,t,boost=1,layer='all'){
  if(!this.ready)return;this.build(S);x.save();x.translate(cx,cy);x.rotate((S.rotation+Math.sin(t*S.driftSpeed*.7)*S.turn)*Math.PI/180);x.transform(1,0,Math.sin(S.lean*Math.PI/180)*.32,Math.cos(S.lean*Math.PI/180),0,0);x.filter=`brightness(${S.brightness})`;const draw=c=>x.drawImage(c,-size/2,-size/2,size,size);
  if(layer==='all'||layer==='rock')draw(layer==='rock'?this.base:this.body);
  if(layer==='all'||layer==='carving')draw(this.groove);
  x.filter='none';x.globalCompositeOperation='lighter';
  if(layer==='all'||layer==='cracks'){const c=S.cracks;if(layer==='cracks'){x.globalAlpha=clamp(c.intensity,0,1);draw(this.crackLight);}if(c.spread>0){x.globalAlpha=.22*c.intensity*boost;x.filter=`blur(${Math.max(.1,size*.015*c.spread)}px)`;draw(this.crackLight);x.filter='none';}if(boost>1){x.globalAlpha=Math.min(1,(boost-1)*.35);draw(this.crackLight);}}
  if(layer==='all'||layer==='rune'){const r=S.rune,pulse=1-r.pulse*(.5+.5*Math.sin(t*r.pulseSpeed)),power=r.intensity*boost*pulse;if(power>0){x.globalAlpha=Math.min(1,power*.36);x.filter=`blur(${size*.018*r.spread+size*.003*r.softness}px)`;draw(this.light);x.filter='none';x.globalAlpha=Math.min(1,power);draw(this.light);if(power>1){x.globalAlpha=Math.min(.7,(power-1)*.3);draw(this.light);}}}x.restore();
 }
}
class Navigation{
 constructor(o){this.o=o;this.S=defaults();this.page=o.page||'home';this.share=!!o.shareAvailable;this.selected='home';this.edits=new Map();this.history=[];this.future=[];this.t=0;this.saved='Loading shared navigation…';this.assets={};this.root=document.createElement('div');this.root.className='rock-nav-layer';o.stage.style.position='relative';o.stage.appendChild(this.root);this.canvas=make(780,1688);this.canvas.className='rock-nav-canvas';this.root.appendChild(this.canvas);this.ctx=this.canvas.getContext('2d');this.links=document.createElement('nav');this.links.className='rock-nav-links';this.links.setAttribute('aria-label','Asgard navigation');this.root.appendChild(this.links);
  // Navigation taps must not start the underlying Raven drag or pointer capture.
  for(const type of ['pointerdown','pointermove','pointerup','click'])this.links.addEventListener(type,e=>e.stopPropagation());
  const base=o.assetBase||'rocks/';for(const id of IDS)this.assets[id]=new RockTexture(id,base+id+'.png');this.debrisImage=new Image();this.debrisImage.crossOrigin='anonymous';this.debrisImage.src=base+'debris.png';this.setContext(this.page,this.share);this.load();this.tick=this.tick.bind(this);requestAnimationFrame(this.tick);window.addEventListener('focus',()=>{if(!this.edits.size&&!this.saving)this.load();});
 }
 headers(extra){return Object.assign({apikey:this.o.key,Authorization:'Bearer '+this.o.key},extra);}
 url(){return this.o.url+'/rest/v1/studio_designs';}
 async load(){try{const r=await fetch(this.url()+'?id=eq.navigation&select=data,updated_at',{headers:this.headers()});if(!r.ok)throw Error(r.status);const a=await r.json();if(!this.edits.size){this.S=merge(defaults(),a[0]?.data||{});this.saved='Loaded from shared studio';this.syncEditor();}}catch(e){try{this.S=merge(defaults(),JSON.parse(localStorage.getItem('asgard-rock-navigation')||'{}'));}catch{}this.saved='Shared save unavailable · local copy';}this.status();}
 change(p,v,record=true){if(record){this.history.push(clone(this.S));if(this.history.length>60)this.history.shift();this.future=[];}set(this.S,p,v);this.edits.set(p,clone(v));this.saved='Saving navigation…';this.status();clearTimeout(this.saveTimer);this.saveTimer=setTimeout(()=>this.save(),600);}
 async save(){if(this.saving||!this.edits.size)return;this.saving=true;const batch=[...this.edits];this.edits.clear();let done=false;try{for(let attempt=0;attempt<3;attempt++){const r=await fetch(this.url()+'?id=eq.navigation&select=data,updated_at',{headers:this.headers()});if(!r.ok)throw Error('read');const rows=await r.json(),row=rows[0],data=patch(merge(defaults(),row?.data||{}),batch);const req=row?{method:'PATCH',url:this.url()+'?id=eq.navigation&updated_at=eq.'+encodeURIComponent(row.updated_at),body:{data,updated_by:'studio-navigation',updated_at:new Date().toISOString()}}:{method:'POST',url:this.url()+'?on_conflict=id',body:{id:'navigation',page:'navigation',data,updated_by:'studio-navigation',updated_at:new Date().toISOString()}};const rr=await fetch(req.url,{method:req.method,headers:this.headers({'Content-Type':'application/json',Prefer:row?'return=representation':'resolution=ignore-duplicates,return=representation'}),body:JSON.stringify(req.body)});if(!rr.ok)throw Error('write');if((await rr.json()).length){done=true;break;}}if(!done)throw Error('conflict');this.saved='Saved to shared studio';}catch(e){for(const [p,v] of batch)if(!this.edits.has(p))this.edits.set(p,v);this.saved='Not saved online · retry available';}finally{this.saving=false;try{localStorage.setItem('asgard-rock-navigation',JSON.stringify(this.S));}catch{}this.status();if(done&&this.edits.size)this.saveTimer=setTimeout(()=>this.save(),100);}}
 status(){if(this.statusEl)this.statusEl.textContent=this.saved;}
 replace(s){this.history.push(clone(this.S));this.future=[];this.applyState(s);}
 applyState(s){this.S=merge(defaults(),s);for(const k of Object.keys(this.S))this.edits.set(k,clone(this.S[k]));this.saved='Saving navigation…';this.status();clearTimeout(this.saveTimer);this.saveTimer=setTimeout(()=>this.save(),300);this.syncEditor();}
 setContext(page,shareAvailable){this.page=page;this.share=!!shareAvailable;this.links.innerHTML='';for(const id of visible(page,this.share)){const b=document.createElement('button');b.type='button';b.dataset.rock=id;b.setAttribute('aria-label',META[id][0]);b.title=META[id][0];if(activeId(page)===id)b.setAttribute('aria-current','page');b.addEventListener('click',()=>{if(this.editing){this.selected=id;this.syncEditor();}else if(this.o.onNavigate)this.o.onNavigate(id==='messages'?'convo':id);else location.href='pages.html?page='+(id==='messages'?'convo':id);});this.links.appendChild(b);}}
 positions(){const a=visible(this.page,this.share),L=this.S.layout,span=(a.length-1)*(L.size+L.gap);return a.map((id,i)=>({id,x:390*L.x-span/2+i*(L.size+L.gap)+this.S.rocks[id].x,y:844*L.y+this.S.rocks[id].y,size:L.size*this.S.rocks[id].size}));}
 tick(now){if(!this.last)this.last=now;const dt=Math.min(.05,(now-this.last)/1000);this.last=now;if(!this.S.motion.paused)this.t+=dt*this.S.motion.speed;this.draw();requestAnimationFrame(this.tick);}
 draw(){this.updateFocus();const x=this.ctx,S=this.S,t=this.t,L=S.layout,rect=this.root.getBoundingClientRect();const dpr=Math.min(2,window.devicePixelRatio||1),w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);if(!w||!h)return;if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}x.setTransform(w/390,0,0,h/844,0,0);x.clearRect(0,0,390,844);const top=844*L.fadeTop,end=Math.min(844,844*L.y-30);const g=x.createLinearGradient(0,Math.min(top,end-1),0,end);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,`rgba(0,0,0,${L.black})`);x.fillStyle=g;x.fillRect(0,Math.min(top,end-1),390,844-Math.min(top,end-1));
  const stars=S.stars,sh=844-top;for(let i=0;i<stars.count;i++){const depth=(i%Math.max(1,Math.round(stars.layers))+1)/Math.max(1,stars.layers),px=((seed(i+87)*430-t*stars.speed*depth)%430+430)%430-20,py=top+seed(i+201)*sh;const fade=clamp((py-top)/40,0,1);x.fillStyle=`rgba(190,209,225,${stars.brightness*fade*(.25+.65*depth)})`;x.beginPath();x.arc(px,py,stars.size*(.45+.7*depth),0,Math.PI*2);x.fill();}
  this.drawDebris(x,t,false);const ps=this.positions(),active=activeId(this.page);for(const p of ps){const R=S.rocks[p.id],bob=Math.sin(t*R.driftSpeed+IDS.indexOf(p.id)*1.7)*R.drift;this.assets[p.id].draw(x,R,p.x,p.y+bob,p.size,t,active===p.id?S.active.glow:1);if(L.labels){x.fillStyle=p.id===active?'#d8f8ff':'#97acb6';x.font=`${p.id===active?600:400} ${L.labelSize}px system-ui`;x.textAlign='center';x.fillText(META[p.id][0],p.x,p.y+p.size*.55+L.labelSize+3);}const b=this.links.querySelector(`[data-rock="${p.id}"]`);if(b){Object.assign(b.style,{left:((p.x-p.size/2)/390*100)+'%',top:((p.y+bob-p.size/2)/844*100)+'%',width:(p.size/390*100)+'%',height:(p.size/844*100)+'%'});}}
  this.drawDebris(x,t,true);if(this.detailCanvas&&this.detailCanvas.isConnected&&this.focusMode==='detail'){const c=this.detailCanvas,dc=c.getContext('2d');dc.clearRect(0,0,c.width,c.height);dc.fillStyle='#020609';dc.fillRect(0,0,c.width,c.height);this.assets[this.selected].draw(dc,S.rocks[this.selected],c.width/2,c.height/2,c.height*.45*S.rocks[this.selected].size,t,1,this.detailLayer||'all');}
 }
 fragment(x,i,px,py,size,angle,opacity){const im=this.debrisImage;if(!im.complete||!im.naturalWidth)return;const cw=im.naturalWidth/3,ch=im.naturalHeight/2,k=i%6;x.save();x.translate(px,py);x.rotate(angle);x.globalAlpha=clamp(opacity,0,1);x.drawImage(im,(k%3)*cw,Math.floor(k/3)*ch,cw,ch,-size/2,-size*.75,size,size*1.5);x.restore();}
 drawDebris(x,t,front){const D=this.S.debris,y=844*this.S.layout.y+D.y;for(let i=0;i<Math.round(D.count);i++){const z=seed(i+6);if((z>.65)!==front)continue;const speed=D.speed*(1-D.depth*.8+D.depth*z*1.7),px=((seed(i+91)*450+t*speed*D.direction)%450+450)%450-30,py=y+(seed(i+70)-.5)*D.spread;this.fragment(x,i,px,py,D.min+(D.max-D.min)*z,t*D.spin*(seed(i+81)-.5)+i,D.opacity*(.35+.65*z));}
  for(const p of this.positions()){const act=p.id===activeId(this.page),n=Math.round(D.orbit+(act?this.S.active.extraDebris:0));for(let j=0;j<n;j++){const phase=t*D.orbitSpeed*(act?this.S.active.speed:1)+j*2.399+IDS.indexOf(p.id),z=Math.sin(phase);if((z>0)!==front)continue;const px=p.x+Math.cos(phase)*D.orbitRadius,py=p.y+Math.sin(phase)*D.orbitRadius*.33;this.fragment(x,j+IDS.indexOf(p.id),px,py,(D.min+(D.max-D.min)*.38)*(.8+z*.2),phase*.35,D.opacity*(.5+z*.15));}}
 }
 showEditor(host){this.host=host;this.editing=!this.testMode;this.focusView(true);this.syncEditor();}
 hideEditor(){this.editing=false;this.host=null;this.detailCanvas=null;this.focusView(false);}
 focusView(enabled){
  const phone=this.o.stage.closest('.phone');if(!phone)return;
  if(!this.focusViewport&&enabled){
    const viewport=document.createElement('div');viewport.className='rn-focus-viewport';
    this.o.stage.parentNode.insertBefore(viewport,this.o.stage);viewport.appendChild(this.o.stage);this.focusViewport=viewport;
    const bar=document.createElement('div');bar.className='rn-focus-toolbar';bar.setAttribute('aria-label','Rock preview view');
    this.focusButtons=[];for(const [label,mode]of [['Rock row','row'],['Selected rock','detail'],['Whole phone','phone']]){const b=document.createElement('button');b.className='rn-button';b.type='button';b.textContent=label;b.dataset.view=mode;b.onclick=()=>{this.focusMode=mode;this.focusView(true);};bar.appendChild(b);this.focusButtons.push(b);}
    phone.parentNode.insertBefore(bar,phone);this.focusToolbar=bar;
    const detail=document.createElement('div');detail.className='rn-main-detail';detail.hidden=true;const canvas=document.createElement('canvas');canvas.width=canvas.height=600;canvas.setAttribute('aria-label','Live enlarged selected rock');detail.appendChild(canvas);phone.parentNode.appendChild(detail);this.mainDetail=detail;this.mainDetailCanvas=canvas;
  }
  if(!this.focusViewport)return;this.focusEnabled=enabled;this.focusToolbar.hidden=!enabled;
  phone.parentNode.classList.toggle('rn-focus-active',enabled);
  const mode=this.focusMode||'row';phone.classList.toggle('rn-phone-focus',enabled&&mode==='row');
  phone.classList.toggle('rn-detail-active',enabled&&mode==='detail');this.mainDetail.hidden=!(enabled&&mode==='detail');this.detailCanvas=enabled?this.mainDetailCanvas:null;
  this.focusButtons.forEach(b=>{const active=b.dataset.view===mode;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});
  this.updateFocus();
 }
 updateFocus(){if(!this.focusEnabled||(this.focusMode||'row')!=='row')return;
  const center=844*this.S.layout.y+(this.S.rocks[this.selected]?.y||0),top=Math.round(clamp(center-130,0,584));
  if(top!==this.focusTop){this.focusViewport.style.setProperty('--rn-crop-top',top);this.focusTop=top;}
 }
 syncEditor(){if(!this.host||!this.host.isConnected)return;this.renderEditor(this.host);}
}
root.AsgardRockNav=Object.assign(API,{Navigation,RockTexture});
})(typeof window!=='undefined'?window:globalThis);
