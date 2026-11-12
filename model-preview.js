/* Editable gallery models use exactly the same preset and renderer as the library preview. */
(function(G){
'use strict';
const copy=x=>JSON.parse(JSON.stringify(x));
function create(item,previous){
  const preset=G.BH.LIB_TO_PRESET[item.id];
  if(!preset||!G.BH.BH_PRESETS[preset])return null;
  return {on:true,id:item.id,name:item.name,preset,x:previous?.x??.5,y:previous?.y??.235,
    drift:false,driftSpeed:1,randomAxis:false,streamerId:'freya',seed:1,
    look:{...copy(G.BH.BH_PRESETS[preset]),size:previous?.radius??40,faceAmt:0}};
}
function hole(model,time=0){
  const look={...G.BH.BH_DEFAULTS,...model.look};
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
G.AsgardModelPreview={create,hole,quiet,copy};
})(window);
