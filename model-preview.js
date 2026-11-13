/* Editable gallery models use exactly the same preset and renderer as the library preview. */
(function(G){
'use strict';
const copy=x=>JSON.parse(JSON.stringify(x));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function growth(model){
  const g=model.growth||{},floor=Math.max(3.2,(model.look.diskIn??3)+.1),current=clamp(model.look.diskOut??14,floor,40);
  const start=clamp(g.ringStart??current,floor,40),end=clamp(g.ringEnd??current,start,40);
  return {on:g.on??true,views:clamp(g.views??150,150,499),ringStart:start,ringEnd:end};
}
function setEndpoint(model,key,value){
  const g=growth(model),floor=Math.max(3.2,(model.look.diskIn??3)+.1);
  g[key]=clamp(value,floor,40);g.on=true;
  if(key==='ringStart'){g.ringEnd=Math.max(g.ringEnd,g.ringStart);g.views=150;}
  else{g.ringStart=Math.min(g.ringStart,g.ringEnd);g.views=499;}
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
  if(model.growth?.on){const g=growth(model),t=(g.views-150)/349;look.diskOut=g.ringStart+(g.ringEnd-g.ringStart)*t;}
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
  // Tiers 1, 2 and 3 run across the sky continuously, evenly spaced, wrapping off one edge and back in the other.
  const dir=(settings.behavior?.direction??1)<0?-1:1,span=1.5,lo=-.25;
  const travel=moving?time*Math.max(0,cfg.speed??6.5)/220:0;
  const xAt=k=>{const ph=((k/3+dir*travel/span)%1+1)%1;return lo+ph*span;};
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
  return {reference,model,quiet:q,followers:cfg.followers??50,views2:clamp(g2.views??21,21,149),views3:g3.views,id2,id3};
}
// A continuous sky population: view counts select gas size, while an independent
// follower count selects sphere size. Identity, counts and axes survive every lap.
function population(settings,time=0,radiusForFollowers=()=>32.5){
  const cfg=settings.together||{},b=settings.behavior||{},rule=settings.rule||{};
  const views=[0,21,150,10,85,325,20,149,499];
  const followers=[3,50,200,1000,15,20000,100,600,60];
  const rows=[.12,.53,.91],top=b.bandTop??.08,bottom=Math.max(top+.15,b.bandBottom??.42);
  const seed=settings.orientation?.seed??1;
  const entries=views.map((v,i)=>{
    const id='sky-streamer-'+i,fc=cfg.variedFollowers===false?(cfg.followers??50):followers[i];
    const radius=radiusForFollowers(fc),tier=v<21?1:v<150?2:3;
    const a=G.AsgardVariants.orientationFor(id,seed);
    const h=tier===1?quiet(settings):tier===3?hole({...settings.modelPreview,randomAxis:settings.modelPreview.randomAxis!==false,streamerId:id,seed,
      drift:false,growth:{...growth(settings.modelPreview),views:v}},time):null;
    if(h){Object.assign(h,{size:radius,_fid:id});if(tier===1&&settings.orientation?.random!==false)Object.assign(h,{rotX:a.tilt,rotY:a.axisY,rotZ:a.axisZ});h.lens*=b.lensAll??1;}
    const reference=tier===2?G.AsgardVariants.liveSettings({...settings.referencePreview,radius,
      driftOn:false,wobble:0,lens:(rule.lens??.9)*(b.lensAll??1),
      lensReach:Math.min(5.5,Math.max(2.5,1+(rule.edge??1.6)*1.4))},id,{...settings.orientation,seed},
      settings.referenceGrowth,v):null;
    const reach=tier===2?Math.max(4.6,G.AsgardVariants.extent(reference)/54):tier===3?Math.max(5,h.diskOut/2):5;
    return {id,tier,views:v,followers:fc,radius,hole:h,reference,pad:radius*reach,y:top+(bottom-top)*rows[i%3]};
  });
  const span=390+2*Math.max(...entries.map(e=>e.pad));
  const travel=cfg.drift===false?0:time*Math.max(0,cfg.speed??18)*(b.direction===-1?-1:1);
  entries.forEach((e,i)=>{
    e.span=390+2*e.pad;
    e.x=((((70+i*e.span/entries.length+travel+e.pad)%e.span)+e.span)%e.span-e.pad)/390;
    if(e.hole)Object.assign(e.hole,{x:e.x,y:e.y});
    if(e.reference)Object.assign(e.reference,{x:e.x,y:e.y});
  });
  return {entries,holes:entries.filter(e=>e.hole).map(e=>e.hole),references:entries.filter(e=>e.reference),span};
}
G.AsgardModelPreview={create,hole,quiet,together,population,copy,growth,setEndpoint};
})(window);
