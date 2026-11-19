/* Deterministic authoring values shared by the studio, assistant clients and native exporter. */
(function(G){'use strict';
const fields=[
 ['construction','duration','Build duration (seconds)',4.8,1,30,.1,'Timing'],['construction','columns','Material columns',4,2,12,1,'Build pieces'],['construction','rows','Material rows',7,2,16,1,'Build pieces'],['construction','depth','Distance between separated layers',1,0,4,.05,'Build pieces'],['construction','lift','How far parts travel into place',1,0,4,.05,'Build pieces'],['construction','lineWidth','Drawing line thickness',1,.2,4,.05,'Drawing'],['construction','guides','Show measuring lines',true,0,1,1,'Drawing'],['construction','paper','Unbuilt surface color','#f0e2bf',0,0,0,'Drawing'],['construction','ink','Drawing color','#413b32',0,0,0,'Drawing'],['construction','amber','First material color','#aa7034',0,0,0,'Drawing'],['construction','red','Second material color','#b64f32',0,0,0,'Drawing'],['construction','blue','Glass / lining color','#48747a',0,0,0,'Drawing'],
 ['clouds','interval','Average seconds between break-offs',30,5,180,1,'Break-off timing'],['clouds','jitter','Randomness of break-off timing',.26,0,.9,.01,'Break-off timing'],['clouds','fixedSeed','Repeat the same random sequence',false,0,1,1,'Randomness'],['clouds','seed','Sequence number',137,1,999999,1,'Randomness'],['clouds','sizeVariation','Variation in cloud size',1,0,2,.05,'Randomness'],['clouds','smallChance','Chance of a small piece',.62,0,1,.01,'Cloud sizes'],['clouds','mediumShare','Medium share of the remaining pieces',.29/.38,0,1,.01,'Cloud sizes'],['clouds','size','Size of break-off clouds',1,.25,2,.05,'Cloud sizes'],['clouds','attach','Time growing before breaking away',1,.2,3,.05,'Cloud life'],['clouds','life','How long drifting clouds last',1,.2,3,.05,'Cloud life'],['clouds','fade','How slowly clouds dissolve',1,.2,3,.05,'Cloud life'],['clouds','merge','How slowly clouds join another cloud',1,.2,3,.05,'Cloud life'],['clouds','dissolveChance','Small pieces that dissolve',.72,0,1,.01,'Cloud outcomes'],['clouds','absorbChance','Medium pieces that join another cloud',.58,0,1,.01,'Cloud outcomes'],['clouds','footageSpeed','Cloud footage speed',1,.1,3,.05,'Cloud motion'],['clouds','speed','Break-off travel speed',1,0,3,.05,'Cloud motion'],['clouds','wander','Side-to-side wandering',1,0,3,.05,'Cloud motion'],['clouds','turn','Cloud rotation variation',1,0,3,.05,'Cloud motion'],
 ['clouds','edgeSoftness','Softness of break-off edges',.22,.05,.45,.01,'Break-off shape'],['clouds','density','Density of break-off clouds',.86,.15,1,.01,'Break-off shape'],['clouds','connection','How long the wispy connection lasts',1,.2,3,.05,'Break-off shape'],['clouds','deformation','Slow billowing and stretching',.3,0,1,.01,'Break-off shape'],
 ['text','autoContrast','Choose readable text color automatically',true,0,1,1,'Message text'],['text','color','Text color','#101b28',0,0,0,'Message text'],['text','size','Letter size',19,10,36,1,'Message text'],['text','weight','Letter thickness',600,300,900,100,'Message text'],['text','opacity','Text opacity',1,.2,1,.05,'Message text'],['text','lineHeight','Space between lines',1.35,1,2,.05,'Message text'],['text','outlineWidth','Text outline thickness',0,0,4,.25,'Text outline & shadow'],['text','outlineColor','Text outline color','#ffffff',0,0,0,'Text outline & shadow'],['text','shadowOpacity','Text shadow strength',0,0,1,.05,'Text outline & shadow'],['text','shadowColor','Text shadow color','#000000',0,0,0,'Text outline & shadow'],['text','shadowBlur','Text shadow softness',3,0,16,1,'Text outline & shadow'],['text','shadowDistance','Text shadow distance',1,0,8,.5,'Text outline & shadow'],
 ['camera','angle','Preview angle',-20,-65,65,1,'Preview camera'],['camera','tilt','Preview tilt',15,-45,45,1,'Preview camera'],['camera','zoom','Preview zoom',1,.4,2,.05,'Preview camera'],['camera','sweep','Preview camera sweep',0,0,45,1,'Preview camera'],
 ['preparation','removeBackground','Remove the clip background',true,0,1,1,'Cloud cutout'],['preparation','keyColor','Background color to remove','#000000',0,0,0,'Cloud cutout'],['preparation','similarity','How much similar color to remove',.10,.01,.9,.01,'Cloud cutout'],['preparation','softness','Softness of the transparent edge',.12,0,.8,.01,'Cloud cutout'],['preparation','pingpong','Forward / reverse seamless loop',true,0,1,1,'Cloud loop'],['preparation','fps','Cloud frames per second',8,4,10,1,'Cloud loop'],['preparation','quality','Prepared cloud quality',85,50,100,1,'Cloud loop'],
 ['media','speed','Playback speed',1,.1,3,.05,'Clip playback'],['media','reverse','Play footage in reverse',false,0,1,1,'Clip playback'],['media','joinBlend','Blend at a cut (seconds)',0,0,2,.05,'Clip playback'],['media','loopBlend','Also blend the loop join',false,0,1,1,'Clip playback'],
 ['media','brightness','Brightness',1,.2,2,.05,'Clip look'],['media','contrast','Contrast',1,.2,2,.05,'Clip look'],['media','saturation','Color strength',1,0,2,.05,'Clip look'],['media','hue','Color shift (degrees)',0,-180,180,1,'Clip look'],['media','grayscale','Black and white amount',0,0,1,.01,'Clip look'],['media','sepia','Warm sepia amount',0,0,1,.01,'Clip look'],['media','blur','Soft focus (pixels)',0,0,12,.25,'Clip look'],['media','opacity','Clip opacity',1,0,1,.01,'Clip look'],
 ['media','zoom','Zoom inside the frame',1,.25,4,.01,'Clip framing'],['media','x','Move sideways (% of frame)',0,-100,100,.5,'Clip framing'],['media','y','Move up / down (% of frame)',0,-100,100,.5,'Clip framing'],['media','rotate','Rotate the footage (degrees)',0,-180,180,1,'Clip framing'],['media','flipX','Mirror the footage',false,0,1,1,'Clip framing'],['media','flipY','Flip footage upside down',false,0,1,1,'Clip framing']
];
function defaults(){const d={schemaVersion:1,construction:{},clouds:{},text:{},camera:{},preparation:{},cloudAssets:{},media:{url:'',in:0,out:0,crop:{x:0,y:0,width:1,height:1}},locks:{},presets:[]};for(const[g,k,l,v]of fields)d[g][k]=v;return d;}
function clean(input={}){const d=defaults();for(const[g,k,l,v,min,max,step]of fields){const n=input?.[g]?.[k];if(typeof v==='boolean')d[g][k]=typeof n==='boolean'?n:v;else if(typeof v==='string')d[g][k]=/^#[0-9a-f]{6}$/i.test(n||'')?n:v;else if(typeof n==='number'&&Number.isFinite(n))d[g][k]=Math.max(min,Math.min(max,step===1?Math.round(n):n));}for(const[g,k]of fields)if(input.locks?.[g+'.'+k]===true)d.locks[g+'.'+k]=true;const allowed=['cloud-mine-billows-v27.webp','cloud-peer-billows-v27.webp','cloud-anvil-258398-v29.webp','cloud-tower-365034-v29.webp','cloud-billows-166852-v29.webp'];for(const key of allowed){const a=input.cloudAssets?.[key];if(a&&/^https:\/\/afnihsdxtisneuyehatw\.supabase\.co\/storage\/v1\/object\/public\/studio-published-media\/sha256\/[a-f0-9]{64}\.webp$/.test(a.url||''))d.cloudAssets[key]={url:a.url,speed:Math.max(.1,Math.min(3,Number(a.speed)||1)),crown:crop(a.crown)};}const m=input.media||{};d.media.url=typeof m.url==='string'&&/^https:\/\//.test(m.url)?m.url:'';for(const k of ['in','out'])d.media[k]=Number.isFinite(m[k])&&m[k]>=0?m[k]:0;d.media.crop=crop(m.crop);if(Array.isArray(m.segments)){d.media.segments=m.segments.filter(s=>s&&Number.isFinite(s.start)&&Number.isFinite(s.end)&&s.start>=0&&s.end-s.start>=.05).slice(0,100).map(s=>({start:s.start,end:s.end}));if(!d.media.segments.length)delete d.media.segments;}d.text.weight=Math.round(d.text.weight/100)*100;d.presets=Array.isArray(input.presets)?input.presets.filter(p=>p&&typeof p.name==='string'&&p.values&&typeof p.values==='object').slice(0,40).map(p=>({name:p.name.slice(0,80),values:{...p.values,presets:[]}})):[];return d;}
function crop(b={}){const n=(v,f)=>Number.isFinite(v)?v:f,x=Math.min(.95,Math.max(0,n(b?.x,0))),y=Math.min(.95,Math.max(0,n(b?.y,0)));return{x,y,width:Math.max(.05,Math.min(1-x,n(b?.width,1))),height:Math.max(.05,Math.min(1-y,n(b?.height,1)))};}
function trim(media,duration){if(!Number.isFinite(duration)||duration<=0)throw Error('Wait for the clip to load.');const start=Math.max(0,Math.min(duration-.05,media.in||0)),end=Math.max(start+.05,Math.min(duration,media.out>0?media.out:duration));return{start,end,duration:end-start};}
// One edit recipe drives source preview, cloud preview and the downloadable video.
// Crossfades overlap moving frames; the next segment resumes after its blended portion.
function editedFrame(media,duration,elapsed,loop=true){
 const T=G.StudioClipTimeline||(typeof module!=='undefined'?require('./studio-clip-timeline'):null);
 let segments=T.normalizeSegments(media,duration);if(!segments.length)throw Error('Keep at least one part of the clip.');
 if(media.reverse)segments=segments.slice().reverse();
 const count=segments.length,lengths=segments.map(s=>s.end-s.start),fades=segments.map((s,i)=>i===count-1&&(!loop||!media.loopBlend)?0:Math.min(Math.max(0,+media.joinBlend||0),lengths[i]/2,lengths[(i+1)%count]/2));
 const spans=lengths.map((length,i)=>length-(i?fades[i-1]:loop?fades[count-1]:0)),total=spans.reduce((a,b)=>a+b,0);
 const ended=!loop&&elapsed>=total;let cursor=loop?((elapsed%total)+total)%total:Math.max(0,Math.min(total-1e-6,elapsed)),index=0;
 while(index<count-1&&cursor>=spans[index])cursor-=spans[index++];
 const previous=index?fades[index-1]:loop?fades[count-1]:0,local=previous+cursor,fade=fades[index],next=(index+1)%count,overlap=Math.max(0,local-(lengths[index]-fade)),mix=fade>0?Math.min(1,overlap/fade):0;
 const sourceTime=(i,localTime)=>media.reverse?segments[i].end-localTime:segments[i].start+localTime;
 return{time:sourceTime(index,local),nextTime:mix>0?sourceTime(next,overlap):null,mix,index,total,ended,segments};
}
function random(seed){let s=seed>>>0;return()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
// The editing view and the real-time view share one lifecycle. Preview options
// never enter the saved settings or the native export.
function cloudEvents(input,seed=137,count=300){
 const c=clean(input).clouds,r=random(c.fixedSeed?c.seed:seed),out=[];let at=0;
 for(let id=0;id<count;id++){
  at+=c.interval*(1-c.jitter+r()*c.jitter*2);
  const roll=r(),small=roll<c.smallChance,medium=!small&&roll<c.smallChance+(1-c.smallChance)*c.mediumShare;
  const width=((small?93:medium?139:191)+(r()-.5)*(small?34:medium?46:42)*c.sizeVariation)*c.size;
  const attach=(5.5+r()*3)*c.attach,life=(small?15+r()*15:44+r()*28)*c.life;
  const side=r()<.5?-1:1,source=Math.floor(r()*3),phase=r()*Math.PI*2;
  const fate=small?(r()<c.dissolveChance?'dissolve':'drift'):medium?(r()<c.absorbChance?'absorb':'drift'):'drift';
  out.push({id,at,width,attach,life,side,source,phase,fate,sizeClass:small?'small':medium?'medium':'large'});
 }
 return out;
}
function cloudParticle(event,age,c,contained=false){
 const e=event,ending=e.fate==='absorb'?4.2*c.merge:8*c.fade;
 if(age<0||age>e.attach+e.life+ending)return null;
 const growth=ease(age/e.attach),travel=Math.max(0,age-e.attach),finish=ease((travel-e.life)/ending);
 const parentY=155+e.source*125,targetY=155+((e.source+1)%3)*125;
 const position=seconds=>{
  const distance=seconds*7*c.speed;
  const attachment=95+e.width*.15*growth,reach=Math.max(10,180-attachment-e.width*.5);
  return {x:195+e.side*(attachment+(contained?reach*(1-Math.exp(-distance/reach)):distance))+Math.sin(age*.13+e.phase)*c.wander*8,
   y:parentY-32+(contained?Math.min(30,seconds*1.5):seconds*1.5)+Math.cos(age*.11+e.phase)*c.wander*4};
 };
 const pos=position(Math.min(travel,e.life));
 if(contained){const half=Math.min(190,e.width*(.42+.58*growth)/2);pos.x=Math.max(half+5,Math.min(385-half,pos.x));pos.y=Math.max(half*.68+5,Math.min(495-half*.68,pos.y));}
 if(e.fate==='absorb'){pos.x+=(195-pos.x)*finish;pos.y+=(targetY-pos.y)*finish;}
 else if(e.fate==='drift'&&travel>e.life){pos.x+=e.side*(travel-e.life)*7*c.speed;}
 return {...e,age,growth,opacity:(.42+.58*growth)*(1-finish),...pos,
  turn:Math.sin(e.phase+travel*.06)*.3*c.turn*(e.fate==='absorb'?1-finish:1),
  connection:1-ease((age-e.attach)/(4.5*c.connection)),sourceX:195+e.side*95,sourceY:parentY-32,
  stage:age<e.attach?'growing':travel<e.life?'drifting':e.fate==='absorb'?'joining':e.fate==='dissolve'?'dissolving':'leaving',finish};
}
function cloudsAt(time,input,seed=137){
 const c=clean(input).clouds;
 return cloudEvents(input,seed).filter(e=>e.at<=time).map(e=>cloudParticle(e,time-e.at,c)).filter(Boolean);
}
function cloudPreviewAt(time,input,seed=137,stage='cycle'){
 const c=clean(input).clouds;
 return cloudEvents(input,seed,3).map((event,i)=>{
  const e={...event,source:i};let age;
  // An elapsed-time clock makes duration changes visibly change progress.
  // Forced outcomes are explicitly labelled demonstrations in the UI.
  if(stage==='grow')age=(time+.65+i*.1)%(e.attach+.3);
  else if(stage==='drift')age=e.attach+(time+8+i*6)%(e.life+8*c.fade);
  else if(stage==='dissolve'){e.fate='dissolve';age=e.attach+e.life+(time+1+i*.1)%(8*c.fade+.3);}
  else if(stage==='join'){e.fate='absorb';age=e.attach+e.life+(time+.65+i*.05)%(4.2*c.merge+.3);}
  else {const total=e.attach+e.life+(e.fate==='absorb'?4.2*c.merge:8*c.fade);age=(time+(i===0?e.attach*.65:i===1?e.attach+8:e.attach+e.life+1))%total;}
  return cloudParticle(e,age,c,true);
 }).filter(Boolean);
}
function cloudReadout(time,input,seed=137){
 const c=clean(input).clouds,next=cloudEvents(input,seed).find(e=>e.at>time);
 return {small:c.smallChance,medium:(1-c.smallChance)*c.mediumShare,large:(1-c.smallChance)*(1-c.mediumShare),
  soonest:c.interval*(1-c.jitter),latest:c.interval*(1+c.jitter),nextIn:next?next.at-time:null};
}

function pieces(progress,input){const c=clean(input).construction,out=[];for(let row=0;row<c.rows;row++)for(let col=0;col<c.columns;col++){const start=.42+row*.36/c.rows+col*.36/c.rows*.14,amount=ease((progress-start)/(.36/c.rows*.58));out.push({row,col,x:col/c.columns,y:row/c.rows,width:1/c.columns,height:1/c.rows,reveal:progress>=.78?1:amount});}return out;}
function keyPixels(pixels,settings){const p=settings.preparation||settings;if(!p.removeBackground)return pixels;const hex=(p.keyColor||'#000000').slice(1),color=[parseInt(hex.slice(0,2),16),parseInt(hex.slice(2,4),16),parseInt(hex.slice(4,6),16)],similarity=p.similarity??.1,soft=p.softness??.12;for(let i=0;i<pixels.length;i+=4){const distance=Math.sqrt(((pixels[i]-color[0])**2+(pixels[i+1]-color[1])**2+(pixels[i+2]-color[2])**2)/3)/255;pixels[i+3]=Math.round(pixels[i+3]*(soft?Math.max(0,Math.min(1,(distance-similarity)/soft)):Number(distance>similarity)));}return pixels;}
function webpInfo(bytes){const b=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes),word=i=>String.fromCharCode(...b.slice(i,i+4)),u32=i=>(b[i]+b[i+1]*256+b[i+2]*65536+b[i+3]*16777216)>>>0; if(b.length<20||word(0)!=='RIFF'||word(8)!=='WEBP')throw Error('Choose a prepared animated WebP file.');if(u32(4)+8!==b.length)throw Error('Cloud file size is invalid.');let frames=0,duration=0,width=0,height=0;for(let i=12;i+8<=b.length;){const n=u32(i+4),k=word(i);if(i+8+n>b.length)throw Error('Cloud file is truncated.');if(k==='VP8X'&&n>=10){width=1+b[i+12]+b[i+13]*256+b[i+14]*65536;height=1+b[i+15]+b[i+16]*256+b[i+17]*65536;}if(k==='ANMF'&&n>=16){frames++;duration+=(b[i+20]+b[i+21]*256+b[i+22]*65536)/1000;}i+=8+n+n%2;}if(frames<2||frames>600||duration<=0||width!==640||height!==426)throw Error('Prepare a moving cloud at 640 × 426 before assigning it.');return{frames,duration,width,height};}
const api={fields,defaults,clean,crop,trim,editedFrame,random,ease,cloudEvents,cloudParticle,cloudsAt,cloudPreviewAt,cloudReadout,pieces,keyPixels,webpInfo};if(typeof module!=='undefined')module.exports=api;G.StudioEffects=api;
})(typeof window==='undefined'?globalThis:window);
