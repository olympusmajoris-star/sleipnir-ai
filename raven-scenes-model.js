/* Scene design data and validation. Rendering and browser storage are separate. */
(function(G){
'use strict';
const clone=v=>JSON.parse(JSON.stringify(v)),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const HEX=/^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i;
const MAX_JSON=32*1024*1024;
const actions=[
 ['photo','Photos','Image','image'],['mic','Talk to text','Mic','mic'],['read','Read aloud','Volume2','radio'],
 ['translate','Translation','Languages','language'],['share','Pass along','Share2','share'],['call','Voice call','Phone','call'],['video','Video call','Video','video'],['send','Send message','ArrowUp','send']
];
const sample=[['in','Still meeting tonight?'],['out','Definitely.'],['in','Same place as last time?'],['out','That works.'],['in','I just got here.'],['out','Leaving now.'],['in','Where are you?'],['out','On my way.'],['in','Want me to wait?'],['out','Yes, five minutes.'],['in','I’ll be outside.'],['out','See you there.']].map(([direction,text])=>({direction,text}));
const appearance={fontSize:17,lineHeight:23,gap:6,incoming:'#F3F5F7',incomingText:'#101B28',outgoing:'#134B7C',outgoingText:'#FFFFFF',bubbleOpacity:.96,bubbleRadius:17};
const background={zoom:1,x:50,y:50,brightness:1,blur:0,src:'',mediaType:'image',playing:false};
const objectBase={rotation:0,opacity:1,visible:true,locked:false,background:'#00000000',color:'#E8F7FF',radius:6,border:0,text:'',src:'',fit:'contain',mediaType:'image',fontSize:16,textAlign:'center',playing:false};
const objectRanges={x:[-50,150],y:[-50,150],width:[1,150],height:[1,150],rotation:[-180,180],opacity:[0,1],radius:[0,60],border:[0,8],fontSize:[8,72]};
const controlRanges={x:[-50,150],y:[-50,150],size:[8,80],rotation:[-180,180],opacity:[0,1],radius:[0,50],shadow:[0,1]};
const appearanceRanges={fontSize:[12,30],lineHeight:[16,42],gap:[0,24],bubbleOpacity:[.25,1],bubbleRadius:[0,32]};
const backgroundRanges={zoom:[1,3],x:[0,100],y:[0,100],brightness:[.3,1.8],blur:[0,16]};
function plain(value,label){if(!value||typeof value!=='object'||Array.isArray(value))throw Error(label+' must be an object.');}
function keys(value,allowed,label){plain(value,label);for(const key of Object.keys(value))if(!allowed.includes(key))throw Error('Unsupported '+label+' field: '+key);}
function url(value){
 if(typeof value!=='string'||value.length>24*1024*1024)throw Error('Choose a media URL or supported file.');
 if(!value)return '';
 if(/^data:(?:image\/(?:jpeg|png|webp|gif|avif)|video\/(?:mp4|webm|ogg));base64,[a-z0-9+/=\r\n]+$/i.test(value))return value;
 if(/^raven\/scenes\/[a-z0-9-]+\.(?:jpg|png|webp|mp4|webm)$/i.test(value))return value;
 let parsed;try{parsed=new URL(value);}catch(_){throw Error('Use a complete https:// media URL.');}
 if(!['https:','http:'].includes(parsed.protocol)||parsed.username||parsed.password)throw Error('Use a regular image or video URL.');
 return parsed.href;
}
function patch(value,type,strict=false,validIcon=()=>true){
 const ranges=type==='object'?objectRanges:type==='control'?controlRanges:type==='appearance'?appearanceRanges:backgroundRanges;
 const colors=type==='appearance'?['incoming','incomingText','outgoing','outgoingText']:type==='object'||type==='control'?['background','color']:[];
 const bools=type==='object'?['visible','locked','playing']:type==='control'?['visible','locked']:type==='background'?['playing']:[];
 const extra=type==='object'?['text','src','fit','mediaType','textAlign']:type==='control'?['icon','style']:type==='background'?['src','mediaType']:[];
 keys(value,[...Object.keys(ranges),...colors,...bools,...extra],type);const out={};
 for(const [key,v]of Object.entries(value)){
  if(ranges[key]){if(typeof v!=='number'||!Number.isFinite(v)||strict&&(v<ranges[key][0]||v>ranges[key][1]))throw Error(key+' is outside the supported range.');out[key]=clamp(v,...ranges[key]);}
  else if(colors.includes(key)){if(typeof v!=='string'||!HEX.test(v))throw Error('Use a six- or eight-digit hex color.');out[key]=v.toUpperCase();}
  else if(bools.includes(key)){if(typeof v!=='boolean')throw Error(key+' must be true or false.');out[key]=v;}
  else if(key==='src')out.src=url(v);
  else if(key==='icon'){if(typeof v!=='string'||!validIcon(v))throw Error('Choose an icon from the installed catalog.');out.icon=v;}
  else if(key==='text'){if(typeof v!=='string'||v.length>4000)throw Error('Use text under 4,000 characters.');out.text=v;}
  else if(key==='style'){if(!['glyph','tile','glass'].includes(v))throw Error('Choose Glyph, Tile, or Glass.');out.style=v;}
  else if(key==='fit'){if(!['contain','cover'].includes(v))throw Error('Choose Fit or Fill.');out.fit=v;}
  else if(key==='mediaType'){if(!['image','video'].includes(v))throw Error('Choose image or video media.');out.mediaType=v;}
  else if(key==='textAlign'){if(!['left','center','right'].includes(v))throw Error('Choose text alignment.');out.textAlign=v;}
 }
 return out;
}
function presentationPatch(value,strict=false){
 keys(value,['device','orientation','width','height','compare'],'presentation');const out={};
 for(const [key,v]of Object.entries(value)){
  if(key==='compare'){if(typeof v!=='boolean')throw Error('Compare must be true or false.');out[key]=v;}
  else if(key==='width'||key==='height'){if(typeof v!=='number'||!Number.isFinite(v)||strict&&(v<320||v>1440))throw Error('Canvas dimensions must be between 320 and 1440.');out[key]=Math.round(clamp(v,320,1440));}
  else {const list=key==='device'?['iphone','wide']:['portrait','landscape'];if(!list.includes(v))throw Error('Choose a supported canvas.');out[key]=v;}
 }return out;
}
function definitions(scene){
 const physical=!!scene.physical,bounds=scene.bounds||{},thread=(bounds.thread||[7,12,86,62]).slice(),composer=(bounds.composer||[7,78,86,6]).slice(),dock=(bounds.controls||[7,90,86,6]).slice();
 if(!physical){
  composer[1]=Math.min(composer[1],84.5);composer[3]=Math.max(5.3,composer[3]);dock[1]=Math.min(dock[1],90.5);dock[3]=Math.max(5.3,dock[3]);
  if(dock[2]<82){dock[0]-=(82-dock[2])/2;dock[2]=82;}
  if(dock[1]<composer[1]&&dock[1]+dock[3]+1>composer[1])dock[1]=composer[1]-dock[3]-1;
  const bottom=thread[1]+thread[3];thread[1]=Math.max(11.5,thread[1]);thread[3]=Math.max(20,Math.min(bottom-thread[1],composer[1]-thread[1]-1));
 }
 const make=(id,label,kind,b,extra={})=>({id,label,kind,defaults:{...objectBase,x:b[0],y:b[1],width:b[2],height:b[3],...extra}});
 const out=[
 make('thread','Message thread','thread',thread),
 make('composer','Typing bar','composer',composer,{background:'#091822',opacity:.94,radius:physical?3:8,border:1}),
 make('header','Conversation header','text',bounds.header||[thread[0],Math.max(5.5,thread[1]-4.8),Math.min(thread[2],70),4.4],{text:'Alex',background:'#081923',opacity:.92,radius:physical?3:8,textAlign:'left'}),
 make('controls','Control group','group',dock)
 ];
 (scene.surfaces||[]).slice(0,physical?8:3).forEach((s,i)=>out.push(make('sign'+(i+1),s.label||'Display artwork '+(i+1),'surface',s.bounds||[10+i*25,6,20,8],{rotation:s.rotation||0,visible:physical&&!!s.adSlot,background:physical&&s.adSlot?'#00000000':'#0B1725',text:'',radius:2})));
 while(out.length<7){const i=out.length-3;out.push(make('sign'+i,'Display artwork '+i,'surface',[10+i*20,8,18,8],{visible:false,background:'#0B1725'}));}
 return out;
}
function layoutDefinition(scene,revision){return scene.physical&&revision<(scene.layoutRevision||2)?{...scene,physical:null,layoutRevision:1,image:scene.legacyImage||scene.image,dimensions:scene.legacyDimensions||scene.dimensions,bounds:scene.legacyBounds||scene.bounds,surfaces:scene.legacySurfaces||scene.surfaces}:scene;}
function workspace(scene){
 const defs=definitions(scene),objects=Object.fromEntries(defs.map(s=>[s.id,clone(s.defaults)])),dock=objects.controls,bar=objects.composer,rows=scene.physical?.controlRows===2?2:1;
 const controls=Object.fromEntries(actions.map(([id],i)=>{const row=rows===2&&i>=4?1:0,count=rows===2?(row?3:4):7,column=rows===2&&row?i-4:i;return[id,{icon:actions[i][2],x:id==='send'?bar.x+bar.width-5:dock.x+dock.width*(column+.5)/count,y:id==='send'?bar.y+bar.height/2:dock.y+dock.height*(row+.5)/rows,size:20,rotation:0,color:'#5FD8FF',opacity:1,visible:true,locked:false,style:'glyph',background:'#007AFF',radius:24,shadow:.3}];}));
 const out={objects,controls,appearance:{...appearance},background:{...background}};
 if(scene.physical){out.layoutRevision=scene.layoutRevision||2;Object.assign(out.background,scene.physical.initial||{});}
 return out;
}
/* Physical scenes use the same cover/crop/zoom transform as their photograph.
   Positions and viewport dimensions move; text and touch-target sizes stay native. */
function projector(scene,presentation,bg=background,options={}){
 const width=presentation.width,height=presentation.height,enabled=options.physical===undefined?!!scene.physical:!!options.physical;
 const dims=options.dimensions||scene.dimensions||[width,height],iw=Math.max(1,dims[0]),ih=Math.max(1,dims[1]);
 const zoom=enabled?bg.zoom||1:1,scale=enabled?Math.max(width/iw,height/ih):1,px=(bg.x??50)/100,py=(bg.y??50)/100;
 const sx=enabled?iw*scale*zoom/100:width/100,sy=enabled?ih*scale*zoom/100:height/100;
 const ox=enabled?width*px+((width-iw*scale)*px-width*px)*zoom:0,oy=enabled?height*py+((height-ih*scale)*py-height*py)*zoom:0;
 const point=(x,y)=>[ox+x*sx,oy+y*sy],inverse=(x,y)=>[(x-ox)/sx,(y-oy)/sy],delta=(x,y)=>[x/sx,y/sy];
 const rect=value=>{const at=point(value.x,value.y);return{x:at[0],y:at[1],w:value.width*sx,h:value.height*sy};};
 const bounds=scene.physical?.screen,source=scene.physical?.clip||(bounds?[[bounds[0],bounds[1]],[bounds[0]+bounds[2],bounds[1]],[bounds[0]+bounds[2],bounds[1]+bounds[3]],[bounds[0],bounds[1]+bounds[3]]]:[]);
 const clip=enabled?source.map(p=>point(p[0],p[1])):[],composerClip=enabled?(scene.physical?.composerClip||source).map(p=>point(p[0],p[1])):[],controlsClip=enabled?(scene.physical?.controlsClip||source).map(p=>point(p[0],p[1])):[],surfaceClips={};
 if(enabled)(scene.surfaces||[]).slice(0,8).forEach((s,i)=>{const r=s.bounds,poly=s.clip||(r?[[r[0],r[1]],[r[0]+r[2],r[1]],[r[0]+r[2],r[1]+r[3]],[r[0],r[1]+r[3]]]:[]);surfaceClips['sign'+(i+1)]=poly.map(p=>point(p[0],p[1]));});
 return{enabled,point,inverse,delta,rect,clip,composerClip,controlsClip,surfaceClips,sx,sy,offset:[ox,oy],sourceDimensions:[iw,ih]};
}
function clipPolygon(subject,boundary){
 if(!boundary||boundary.length<3)return subject;
 let out=subject.slice();const orientation=Math.sign(boundary.reduce((sum,a,i)=>{const b=boundary[(i+1)%boundary.length];return sum+a[0]*b[1]-b[0]*a[1];},0))||1;
 for(let i=0;i<boundary.length&&out.length;i++){
  const a=boundary[i],b=boundary[(i+1)%boundary.length],cross=p=>orientation*((b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0])),input=out;out=[];
  let previous=input[input.length-1],pd=cross(previous);
  for(const current of input){const cd=cross(current),inside=cd>=-1e-7,wasInside=pd>=-1e-7;if(inside!==wasInside){const t=pd/(pd-cd);out.push([previous[0]+(current[0]-previous[0])*t,previous[1]+(current[1]-previous[1])*t]);}if(inside)out.push(current);previous=current;pd=cd;}
 }
 return out;
}
function design(catalog){return {kind:'asgard-raven-scenes',version:1,scene:catalog[0].id,presentation:{device:'iphone',orientation:'portrait',width:390,height:844,compare:false},sample:clone(sample),workspaces:Object.fromEntries(catalog.map(scene=>[scene.id,workspace(scene)]))};}
function validateWorkspace(input,scene,validIcon,allowPrevious=true){
 const active=layoutDefinition(scene,input?.layoutRevision||1),base=workspace(active),allowed=['objects','controls','appearance','background','layoutRevision'];if(allowPrevious)allowed.push('previousLayout');keys(input,allowed,scene.label+' workspace');
 keys(input.objects,Object.keys(base.objects),'objects');keys(input.controls,actions.map(a=>a[0]),'controls');
 for(const id of Object.keys(base.objects)){if(!input.objects[id]){if(active.physical&&/^sign[4-8]$/.test(id))continue;throw Error('Missing object: '+id);}base.objects[id]={...base.objects[id],...patch(input.objects[id],'object',true,validIcon)};}
 for(const [id]of actions){if(!input.controls[id])throw Error('Missing control: '+id);base.controls[id]={...base.controls[id],...patch(input.controls[id],'control',true,validIcon)};}
 base.appearance={...appearance,...patch(input.appearance,'appearance',true)};base.background={...background,...patch(input.background,'background',true)};
 if(scene.physical||Object.hasOwn(input,'layoutRevision')){const revision=input.layoutRevision??1;if(!Number.isInteger(revision)||revision<1||revision>(scene.layoutRevision||(scene.physical?2:1)))throw Error('Unsupported scene layout revision.');base.layoutRevision=revision;}
 if(Object.hasOwn(input,'previousLayout')){if(!allowPrevious)throw Error('Nested previous layouts are unsupported.');base.previousLayout=validateWorkspace(input.previousLayout,scene,validIcon,false);}
 return base;
}
function validate(value,catalog,validIcon=()=>true){
 keys(value,['kind','version','scene','presentation','sample','workspaces'],'design');
 if(value.kind!=='asgard-raven-scenes'||value.version!==1)throw Error('Choose a Raven scene design exported by this Studio.');
 const ids=catalog.map(s=>s.id);if(!ids.includes(value.scene))throw Error('Unknown scene.');
 keys(value.workspaces,ids,'workspaces');
 const result={kind:'asgard-raven-scenes',version:1,scene:value.scene,presentation:{...design(catalog).presentation,...presentationPatch(value.presentation,true)},sample:[],workspaces:{}};
 if(!Array.isArray(value.sample)||value.sample.length>100)throw Error('Use up to 100 sample messages.');
 result.sample=value.sample.map(m=>{keys(m,['direction','text'],'sample message');if(!['in','out'].includes(m.direction)||typeof m.text!=='string'||m.text.length>4000)throw Error('Invalid sample message.');return {...m};});
 for(const scene of catalog)result.workspaces[scene.id]=validateWorkspace(value.workspaces[scene.id],scene,validIcon);
 return result;
}
function migrate(value,catalog){
 const result=clone(value),previous=clone(value),changed=[];
 for(const scene of catalog){const old=result.workspaces[scene.id],target=scene.layoutRevision||(scene.physical?2:1);if(!scene.physical||!old||(old.previousLayout&&(old.layoutRevision||1)<(old.previousLayout.layoutRevision||1))||(old.layoutRevision||1)>=target)continue;
  const next=workspace(scene),oldDefaults=workspace(layoutDefinition(scene,old.layoutRevision||1));next.appearance=clone(old.appearance);
  for(const [id,object]of Object.entries(old.objects)){if(!next.objects[id])continue;for(const [key,value]of Object.entries(object))if(!['x','y','width','height','rotation'].includes(key)&&JSON.stringify(value)!==JSON.stringify(oldDefaults.objects[id]?.[key]))next.objects[id][key]=clone(value);}
  for(const [id,control]of Object.entries(old.controls))for(const [key,value]of Object.entries(control))if(!['x','y'].includes(key)&&JSON.stringify(value)!==JSON.stringify(oldDefaults.controls[id]?.[key]))next.controls[id][key]=clone(value);
  const archive=clone(old);delete archive.previousLayout;archive.layoutRevision=old.layoutRevision||1;next.previousLayout=archive;
  const newer=clone(next);delete newer.previousLayout;previous.workspaces[scene.id].previousLayout=newer;
  result.workspaces[scene.id]=next;changed.push(scene.id);
 }
 return{design:result,previous,changed};
}
G.RavenScenesModel={clone,clamp,MAX_JSON,actions,sample,appearance,background,definitions,layoutDefinition,workspace,design,validate,migrate,projector,clipPolygon,patch,presentationPatch,url};
})(window);

