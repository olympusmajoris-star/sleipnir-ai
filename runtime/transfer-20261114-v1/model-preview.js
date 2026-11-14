/* Editable gallery models use exactly the same preset and renderer as the library preview. */
(function(G){
'use strict';
const copy=x=>JSON.parse(JSON.stringify(x));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function range(model){return model.tier===4?[500,1999]:[150,499];}
function forTier(settings,tier){return Number(tier)===3?settings.modelPreview:settings.tierModels?.[tier];}
function active(settings){return forTier(settings,settings.quickTier>=3?settings.quickTier:3);}
function modelPath(tier){return Number(tier)===3?'holes.modelPreview':'holes.tierModels.'+tier;}
function select(settings,tier){
  tier=Number(tier);settings.quickTier=tier;settings.active='viewers';settings.selTier=tier-1;
  if(settings.modelPreview)settings.modelPreview.on=tier===3;
  for(const [key,m]of Object.entries(settings.tierModels||{}))m.on=Number(key)===tier;
  if(settings.referencePreview)settings.referencePreview.on=tier===2;
  return forTier(settings,tier);
}
function put(settings,tier,model){
  if(Number(tier)===3)settings.modelPreview=model;
  else{settings.tierModels ||= {};settings.tierModels[tier]=model;}
  return model;
}
function tier4(previous){
  const look={...copy(G.BH.BH_DEFAULTS),size:previous?.radius??40,
    rotX:10,rotY:0,rotZ:13,camDist:32,disk:1,diskIn:1.9,diskOut:8.2,
    diskBright:3.6,diskFalloff:1.8,diskColorIn:'#fff4ed',diskColorOut:'#efb39d',
    diskThick:.085,diskOpacity:.94,diskTexture:.55,diskStreaks:.65,diskSpin:.65,diskDir:-1,
    doppler:.8,clumps:0,ring:0,ringWidth:.06,ringColor:'#ffe7da',secondaryLight:.08,
    corona:0,glow:.08,glowColor:'#efbba7',shellMotion:0,faceAmt:0,jets:0};
  return {tier:4,id:'danny-tier4-start',name:'Tier 4 · pale-gold lensed disk',on:true,
    x:previous?.x??.5,y:previous?.y??.235,drift:false,driftSpeed:1,randomAxis:false,skyRandomAxis:true,
    streamerId:'tier4-preview',seed:1,look,originalLook:copy(look),
    sourceName:'Recording 2026-11-08 111306(1).mp4',
    sourceTime:5.9,
    growth:{on:true,views:500,ringStart:look.diskOut,ringEnd:look.diskOut,endChosen:false}};
}
function growth(model){
  const [minViews,maxViews]=range(model);
  const g=model.growth||{},floor=Math.max(3.2,(model.look.diskIn??3)+.1),current=clamp(model.look.diskOut??14,floor,40);
  const start=clamp(g.ringStart??current,floor,40),end=clamp(g.ringEnd??current,start,40);
  return {...g,on:g.on??true,views:clamp(g.views??minViews,minViews,maxViews),ringStart:start,ringEnd:end};
}
function setEndpoint(model,key,value){
  const g=growth(model),floor=Math.max(3.2,(model.look.diskIn??3)+.1);
  g[key]=clamp(value,floor,40);g.on=true;
  const [minViews,maxViews]=range(model);
  if(key==='ringStart'){g.ringEnd=model.tier===4&&!g.endChosen?g.ringStart:Math.max(g.ringEnd,g.ringStart);g.views=minViews;}
  else{g.ringStart=Math.min(g.ringStart,g.ringEnd);g.views=maxViews;g.endChosen=true;}
  model.growth=g;return g;
}
function create(item,previous){
  const preset=G.BH.LIB_TO_PRESET[item.id];
  if(!preset||!G.BH.BH_PRESETS[preset])return null;
  return {on:true,id:item.id,name:item.name,preset,x:previous?.x??.5,y:previous?.y??.235,
    drift:false,driftSpeed:1,randomAxis:false,streamerId:'freya',seed:1,
    look:{...copy(G.BH.BH_PRESETS[preset]),size:previous?.radius??40,faceAmt:0}};
}
function hole(model,time=0){
  const look={...G.BH.BH_DEFAULTS,...model.look};
  if(model.growth?.on){const g=growth(model),[lo,hi]=range(model),t=(g.views-lo)/(hi-lo);look.diskOut=g.ringStart+(g.ringEnd-g.ringStart)*t;}
  look.diskOut=Math.max(look.diskOut,look.diskIn+.1);
  if(model.randomAxis&&G.AsgardVariants){
    const a=G.AsgardVariants.orientationFor(model.streamerId,model.seed);
    look.rotX=a.tilt;look.rotY=a.axisY;look.rotZ=a.axisZ;
  }
  const t=time*.07*(model.driftSpeed??1);
  return {...look,x:model.x+(model.drift?.05*Math.sin(t):0),
    y:model.y+(model.drift?.016*Math.sin(t*.7):0),faceAmt:0,
    _modelPreview:true,_fid:'gallery-'+model.id};
}
function quiet(settings){
  const saved=settings.dashboards.viewers.tiers[0].look,q=settings.quietPreview||{},ref=settings.referencePreview||{};
  return {...G.BH.BH_DEFAULTS,...saved,x:q.x??ref.x??.5,y:q.y??ref.y??.235,size:q.size??ref.radius??40,
    lens:q.lens??saved.lens,reach:q.reach??saved.reach,disk:0,ring:0,corona:0,glow:0,jets:0,flare:0,envFeed:0,faceAmt:0,_quietPreview:true};
}
// Preview both approved tiers without changing either saved look. A shared follower
// count sets the sphere radius; views only select each disk's growth amount.
function together(settings,time=0,radius=32.5){
  const cfg=settings.together||{},moving=cfg.drift!==false;
  const fourth=forTier(settings,4),number=fourth?4:3;
  // Tiers 1, 2 and 3 run across the sky continuously, evenly spaced, wrapping off one edge and back in the other.
  const dir=(settings.behavior?.direction??1)<0?-1:1,span=1.5,lo=-.25;
  const travel=moving?time*Math.max(0,cfg.speed??6.5)/220:0;
  const xAt=k=>{const ph=((k/number+dir*travel/span)%1+1)%1;return lo+ph*span;};
  const g2=settings.referenceGrowth||{},g3=growth(settings.modelPreview);
  const id2=g2.streamerId||'freya',wanted=settings.modelPreview.streamerId||'baldr';
  const id3=wanted===id2?(id2==='baldr'?'freya':'baldr'):wanted;
  const b=settings.behavior||{},rule=settings.rule||{};
  const reference=G.AsgardVariants.liveSettings({...settings.referencePreview,
    x:xAt(1),y:.16,radius,driftOn:false,wobble:0,
    lens:(rule.lens??.9)*(b.lensAll??1),lensReach:Math.min(5.5,Math.max(2.5,1+(rule.edge??1.6)*1.4))},
    id2,settings.orientation,g2);
  const model=hole({...settings.modelPreview,streamerId:id3,x:xAt(2),y:.39,drift:false},time);
  model.size=radius;model._fid='together-tier3-'+id3;
  const q=quiet(settings);q.x=xAt(0);q.y=.28;q.size=radius;q._fid='together-tier1';
  const extra=fourth?hole({...fourth,x:xAt(3),y:.48,drift:false},time):null;
  if(extra){extra.size=radius;extra._fid='together-tier4-'+fourth.streamerId;}
  return {reference,model,quiet:q,extra,views4:fourth?growth(fourth).views:500,followers:cfg.followers??50,views2:clamp(g2.views??21,21,149),views3:g3.views,id2,id3};
}
// A continuous sky population: view counts select gas size, while an independent
// follower count selects sphere size. Identity, counts and axes survive every lap.
function population(settings,time=0,radiusForFollowers=()=>32.5){
  const cfg=settings.together||{},b=settings.behavior||{},rule=settings.rule||{};
  const fourth=forTier(settings,4);
  const views=[0,21,150,10,85,325,20,149,499,...(fourth?[500,1250,1999]:[])];
  const followers=[3,50,200,1000,15,20000,100,600,60,50,200,1000];
  const rows=[.12,.53,.91],top=b.bandTop??.08,bottom=Math.max(top+.15,b.bandBottom??.42);
  const seed=settings.orientation?.seed??1;
  const catalog=views.map((v,i)=>{
    const id='sky-streamer-'+i,fc=cfg.variedFollowers===false?(cfg.followers??50):followers[i];
    const radius=radiusForFollowers(fc),tier=v<21?1:v<150?2:v<500?3:4,model=forTier(settings,tier);
    const a=G.AsgardVariants.orientationFor(id,seed);
    const h=tier===1?quiet(settings):tier>=3?hole({...model,randomAxis:model.skyRandomAxis??(model.randomAxis!==false),streamerId:id,seed,
      drift:false,growth:{...growth(model),views:v}},time):null;
    if(h){Object.assign(h,{size:radius,_fid:id});if(tier===1&&settings.orientation?.random!==false)Object.assign(h,{rotX:a.tilt,rotY:a.axisY,rotZ:a.axisZ});h.lens*=b.lensAll??1;}
    const reference=tier===2?G.AsgardVariants.liveSettings({...settings.referencePreview,radius,
      driftOn:false,wobble:0,lens:(rule.lens??.9)*(b.lensAll??1),
      lensReach:Math.min(5.5,Math.max(2.5,1+(rule.edge??1.6)*1.4))},id,{...settings.orientation,seed},
      settings.referenceGrowth,v):null;
    const reach=tier===2?Math.max(4.6,G.AsgardVariants.extent(reference)/54):tier>=3?Math.max(5,h.diskOut/2):5;
    return {id,tier,views:v,followers:fc,radius,hole:h,reference,pad:radius*reach,y:top+(bottom-top)*rows[i%3]};
  });
  // Four traffic lanes, not nine simultaneous objects. Each lane advances to
  // its next saved example only once the previous object's entire field exits.
  // Counts and axes belong to the identity, and never change during a crossing.
  const requested=clamp(Math.round(b.count??4),1,5);
  const small=catalog.filter(e=>e.radius<=32.5);
  const count=requested===5&&small.length<2?4:requested;
  const playlists=[[0,3,6],[1,4,7],[2,5,8],fourth?[9,10,11]:[6,0,3],[1,4,7]];
  // With fewer lanes, rotate every tier through those lanes rather than hide one.
  for(let lane=count;lane<4;lane++)playlists[lane%count].push(...playlists[lane]);
  if(count===5){
    const indices=catalog.map((e,i)=>e.radius<=32.5?i:-1).filter(i=>i>=0);
    playlists[3]=indices.filter((_,i)=>i%2===0);playlists[4]=indices.filter((_,i)=>i%2===1);
    if(fourth)playlists[2].push(...[9,10,11].filter(i=>!indices.includes(i)));
  }
  const starts=[65,290,180,-120,-200],ys=[.12,.57,.94,.32,.77];
  const travel=cfg.drift===false?0:time*Math.max(0,cfg.speed??18)*(b.direction===-1?-1:1);
  const entries=[];
  for(let lane=0;lane<count;lane++){
    const list=playlists[lane].map(i=>catalog[i]);
    const cycle=list.reduce((sum,e)=>sum+390+2*e.pad,0);
    let distance=((starts[lane]+list[0].pad+travel)%cycle+cycle)%cycle;
    let pick=list[0];
    for(const e of list){pick=e;const length=390+2*e.pad;if(distance<length)break;distance-=length;}
    const e={...pick,hole:pick.hole?{...pick.hole}:null,reference:pick.reference?{...pick.reference}:null,lane};
    e.span=390+2*e.pad;e.cycle=cycle;e.x=(distance-e.pad)/390;
    e.y=clamp(top+(bottom-top)*ys[lane],(e.radius+8)/844,1-(e.radius+8)/844);
    // Repeated quiet examples remain separate physical objects.
    if(lane>=3){e.id+='-lane'+lane;if(e.hole)e.hole._fid=e.id;}
    if(e.hole)Object.assign(e.hole,{x:e.x,y:e.y});
    if(e.reference)Object.assign(e.reference,{x:e.x,y:e.y});
    entries.push(e);
  }
  // With five lanes, two always carry naturally small examples. No mid-flight
  // disappearance, and no changing saved follower sizes to force them to fit.
  return {entries,catalog,holes:entries.filter(e=>e.hole).map(e=>e.hole),references:entries.filter(e=>e.reference),span:Math.max(...entries.map(e=>e.span))};
}
G.AsgardModelPreview={create,hole,quiet,together,population,copy,growth,setEndpoint,range,forTier,active,modelPath,select,put,tier4};
})(window);
