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
 const bounds=scene.bounds||{},thread=(bounds.thread||[7,12,86,62]).slice(),composer=(bounds.composer||[7,78,86,6]).slice(),dock=(bounds.controls||[7,90,86,6]).slice();
 composer[1]=Math.min(composer[1],84.5);composer[3]=Math.max(5.3,composer[3]);dock[1]=Math.min(dock[1],90.5);dock[3]=Math.max(5.3,dock[3]);
 if(dock[2]<82){dock[0]-=(82-dock[2])/2;dock[2]=82;}
 if(dock[1]<composer[1]&&dock[1]+dock[3]+1>composer[1])dock[1]=composer[1]-dock[3]-1;
 const bottom=thread[1]+thread[3];thread[1]=Math.max(11.5,thread[1]);thread[3]=Math.max(20,Math.min(bottom-thread[1],composer[1]-thread[1]-1));
 const make=(id,label,kind,b,extra={})=>({id,label,kind,defaults:{...objectBase,x:b[0],y:b[1],width:b[2],height:b[3],...extra}});
 const out=[
 make('thread','Message thread','thread',thread),
 make('composer','Typing bar','composer',composer,{background:'#091822',opacity:.94,radius:8,border:1}),
 make('header','Conversation header','text',[thread[0],Math.max(5.5,thread[1]-4.8),Math.min(thread[2],70),4.4],{text:'Alex',background:'#081923',opacity:.92,radius:8,textAlign:'left'}),
 make('controls','Control group','group',dock)
 ];
 (scene.surfaces||[]).slice(0,3).forEach((s,i)=>out.push(make('sign'+(i+1),s.label||'Display artwork '+(i+1),'surface',s.bounds||[10+i*25,6,20,8],{rotation:s.rotation||0,visible:false,background:'#0B1725',text:'',radius:2})));
 while(out.length<7){const i=out.length-3;out.push(make('sign'+i,'Display artwork '+i,'surface',[10+i*20,8,18,8],{visible:false,background:'#0B1725'}));}
 return out;
}
function workspace(scene){
 const defs=definitions(scene),objects=Object.fromEntries(defs.map(s=>[s.id,clone(s.defaults)])),dock=objects.controls,bar=objects.composer;
 const controls=Object.fromEntries(actions.map(([id],i)=>[id,{icon:actions[i][2],x:id==='send'?bar.x+bar.width-5:dock.x+dock.width*(i+.5)/7,y:id==='send'?bar.y+bar.height/2:dock.y+dock.height/2,size:20,rotation:0,color:'#5FD8FF',opacity:1,visible:true,locked:false,style:'glyph',background:'#007AFF',radius:24,shadow:.3}]));
 return {objects,controls,appearance:{...appearance},background:{...background}};
}
function design(catalog){return {kind:'asgard-raven-scenes',version:1,scene:catalog[0].id,presentation:{device:'iphone',orientation:'portrait',width:390,height:844,compare:false},sample:clone(sample),workspaces:Object.fromEntries(catalog.map(scene=>[scene.id,workspace(scene)]))};}
function validate(value,catalog,validIcon=()=>true){
 keys(value,['kind','version','scene','presentation','sample','workspaces'],'design');
 if(value.kind!=='asgard-raven-scenes'||value.version!==1)throw Error('Choose a Raven scene design exported by this Studio.');
 const ids=catalog.map(s=>s.id);if(!ids.includes(value.scene))throw Error('Unknown scene.');
 keys(value.workspaces,ids,'workspaces');
 const result={kind:'asgard-raven-scenes',version:1,scene:value.scene,presentation:{...design(catalog).presentation,...presentationPatch(value.presentation,true)},sample:[],workspaces:{}};
 if(!Array.isArray(value.sample)||value.sample.length>100)throw Error('Use up to 100 sample messages.');
 result.sample=value.sample.map(m=>{keys(m,['direction','text'],'sample message');if(!['in','out'].includes(m.direction)||typeof m.text!=='string'||m.text.length>4000)throw Error('Invalid sample message.');return {...m};});
 for(const scene of catalog){
  const input=value.workspaces[scene.id],base=workspace(scene);keys(input,['objects','controls','appearance','background'],scene.label+' workspace');
  keys(input.objects,Object.keys(base.objects),'objects');keys(input.controls,actions.map(a=>a[0]),'controls');
  for(const id of Object.keys(base.objects)){if(!input.objects[id])throw Error('Missing object: '+id);base.objects[id]={...base.objects[id],...patch(input.objects[id],'object',true,validIcon)};}
  for(const [id]of actions){if(!input.controls[id])throw Error('Missing control: '+id);base.controls[id]={...base.controls[id],...patch(input.controls[id],'control',true,validIcon)};}
  base.appearance={...appearance,...patch(input.appearance,'appearance',true)};base.background={...background,...patch(input.background,'background',true)};result.workspaces[scene.id]=base;
 }
 return result;
}
G.RavenScenesModel={clone,clamp,MAX_JSON,actions,sample,appearance,background,definitions,workspace,design,validate,patch,presentationPatch,url};
})(window);

