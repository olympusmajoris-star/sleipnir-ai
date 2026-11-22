/* Optional, page-scoped sky layers. Render after scenery and before controls. */
(function (root) {
  'use strict';
  const base = new URL('.', document.currentScript?.src || location.href);
  const project = 'https://afnihsdxtisneuyehatw.supabase.co', storage = project + '/storage/v1/object/public/';
  const raven = {label:'Asgard perched raven',url:storage+'asgard_ui/raven_v3/ic_raven.webp'};
  const backgrounds = [
    {label:'Raven sky · clouds',url:storage+'asgard_ui/raven_sky/clouds_v1.jpg'},
    {label:'Raven sky · Midgard',url:storage+'asgard_ui/raven_sky/midgard_v1.jpg'},
    {label:'Space photograph',url:storage+'black%20hole/86697_web.jpg'}
  ];
  function feature(label,schedule,x,y,assets) {
    return {label,defaults:{enabled:false,schedule,opacity:1,scale:1,x,y},assets};
  }
  const catalog = {backgrounds,features:{
    stars:feature('Asgard stars','night',.5,.5,backgrounds),
    raven:feature('Perched raven','both',.78,.16,[raven]),
    streamers:feature('Live streamer black holes','both',.5,.18,[])
  }};
  const clamp = (n,a,b) => Math.max(a, Math.min(b,n));
  const bounded = (n,d,lo,hi) => Number.isFinite(n) ? clamp(n,lo,hi) : d;
  function allowedAsset(candidate,group) {
    return root.SleipnirPageSky?.assetURL(candidate,group) === true;
  }
  function lighting(settings,options={}) {
    if (options.lighting==='day'||options.lighting==='night') return options.lighting;
    const date = options.now instanceof Date ? options.now : new Date();
    const h = date.getHours(), day = settings.day_start ?? 6, night = settings.night_start ?? 19;
    return (day<night ? h>=day&&h<night : h>=day||h<night) ? 'day' : 'night';
  }
  const images = new Map(), subscriptions = new Map(), scripts = new Map();
  let state = {streamers:'idle',count:0,message:''}, feed = [], designs = {}, nextFeed = 0, nextDesign = 0;
  let readingFeed = false, readingDesign = false, art = null, lastRenderError = 0;
  let nativeFeed=false, principal=null, feedVersion=0;
  const cachedSubjects = new Map();
  function updated() {
    const listeners=[...subscriptions.values()]; subscriptions.clear();
    for(const callback of listeners) { try {callback();} catch {/* Preview may already be closed. */} }
  }
  function loadScript(name,globalName) {
    if(root[globalName]||scripts.has(name)) return;
    const tag=document.createElement('script'); scripts.set(name,tag); tag.src=new URL(name,base);
    tag.onload=updated;
    tag.onerror=()=>{tag.remove();setTimeout(()=>scripts.delete(name),30000);state.message='The authored sky renderer could not load.';updated();};
    document.head.append(tag);
  }
  function image(url,cache=images) {
    let item=cache.get(url);
    if(!item||(!item.ready && item.retry && performance.now()>=item.retry)) {
      const el=new Image(); el.crossOrigin='anonymous'; item={el,ready:false}; cache.set(url,item);
      el.onload=()=>{item.ready=true;updated();};
      el.onerror=()=>{item.retry=performance.now()+30000;updated();}; el.src=url;
      if(cache.size>40) cache.delete(cache.keys().next().value);
    }
    return item.ready ? item.el : null;
  }
  async function read(path,auth=false) {
    if(root.StudioJobs) return root.StudioJobs.request('/rest/v1/'+path,{auth});
    const cfg=root.StudioTransferConfig;
    if(!cfg?.key) throw Error('The sky data connection is unavailable.');
    const res=await fetch(project+'/rest/v1/'+path,{headers:{apikey:cfg.key,Authorization:'Bearer '+cfg.key},cache:'no-store'});
    if(!res.ok) throw Error('Sky data is unavailable ('+res.status+').');
    return res.json();
  }
  function fetchDesigns() {
    const now=performance.now();
    if(readingDesign||now<nextDesign) return;
    readingDesign=true;nextDesign=now+300000;
    read('studio_designs?id=in.(raven,asgard_sky)&select=id,data').then(rows=>{
      designs=Object.fromEntries(rows.map(r=>[r.id,r.data]));
    }).catch(()=>{nextDesign=performance.now()+30000;}).finally(()=>{readingDesign=false;updated();});
  }
  function liveRows(rows) {
    return rows.filter(r=>r?.is_live===true && r.ended_at==null && typeof r.id==='string' && typeof r.host_id==='string' && r.id && r.host_id &&
      typeof r.provider==='string' && r.provider.toLowerCase()!=='test' && !/^aaaaaaaa-0000-4000-8000-/i.test(r.host_id));
  }
  function applyRows(rows,reason) {
    feed=Array.isArray(rows)?liveRows(rows).slice(0,12):[];
    state=Array.isArray(rows)?{streamers:feed.length?'live':'empty',count:feed.length,message:feed.length?'':'No eligible streamers are live.'}:
      reason==='unavailable'?{streamers:'unavailable',count:0,message:'Live stream data is unavailable.'}:
      {streamers:'unsigned',count:0,message:'Sign in to see real live streamers.'};
  }
  function setLiveSessions(rows,reason) {
    nativeFeed=true;++feedVersion;applyRows(rows,reason);
  }
  function refreshLive() {
    if(nativeFeed)return;
    const subject=root.StudioJobs?.current?.()?.user?.id||null;
    if(!subject){if(principal!==null){++feedVersion;readingFeed=false;nextFeed=0;cachedSubjects.clear();} principal=null;applyRows(null);return;}
    if(subject!==principal){principal=subject;++feedVersion;readingFeed=false;nextFeed=0;feed=[];cachedSubjects.clear();}
    const now=performance.now();
    if(readingFeed||now<nextFeed) return;
    readingFeed=true;nextFeed=now+30000;
    if(!feed.length) state={streamers:'loading',count:0,message:'Checking live streamers…'};
    const v=feedVersion;
    read('live_streams?select=id,host_id,avatar_url,viewer_count,follower_count,provider,is_live,ended_at&is_live=eq.true&ended_at=is.null&provider=neq.test&order=viewer_count.desc.nullslast,id.asc&limit=12',true).then(rows=>{
      if(v===feedVersion)applyRows(rows);
    }).catch(()=>{if(v===feedVersion)applyRows(null,'unavailable');}).finally(()=>{if(v===feedVersion){readingFeed=false;updated();}});
  }
  function cover(ctx,im,W,H) {
    const s=Math.max(W/im.naturalWidth,H/im.naturalHeight), w=im.naturalWidth*s, h=im.naturalHeight*s;
    ctx.drawImage(im,(W-w)/2,(H-h)/2,w,h);
  }
  function active(settings,key,light) {
    const f=settings.features?.[key], d=catalog.features[key].defaults;
    if(!f || f.enabled!==true || (f.schedule??d.schedule)!=='both'&&(f.schedule??d.schedule)!==light) return null;
    return {...f,x:bounded(f.x,d.x,0,1),y:bounded(f.y,d.y,0,1),opacity:bounded(f.opacity,d.opacity,0,1),scale:bounded(f.scale,d.scale,.2,3)};
  }
  function starField(ctx,f,W,H) {
    if(f.asset_url && allowedAsset(f.asset_url,'stars')) {
      const im=image(f.asset_url); if(im) {ctx.translate(f.x*W,f.y*H);ctx.scale(f.scale,f.scale);ctx.translate(-W/2,-H/2);cover(ctx,im,W,H);}
      return;
    }
    if(!root.AsgardStarField) {loadScript('asgard-star-field.js','AsgardStarField');return;}
    fetchDesigns();
    const logicalW=390, logicalH=clamp(Math.round(logicalW*H/W),1,2200);
    const stars=root.AsgardStarField.field(logicalW,logicalH,1.5,designs.asgard_sky?.values || {});
    ctx.drawImage(stars,(f.x-f.scale/2)*W,(f.y-f.scale/2)*H,W*f.scale,H*f.scale);
  }
  function drawRaven(ctx,f,W,H) {
    const im=f.asset_url ? allowedAsset(f.asset_url,'raven') && image(f.asset_url) : image(new URL('asgard/raven.webp',base).href);
    if(!im) return;
    const width=Math.min(W,H)*.14*f.scale, height=width*im.naturalHeight/im.naturalWidth;
    ctx.drawImage(im,W*f.x-width/2,H*f.y-height/2,width,height);
  }
  function tierIndex(tiers,n) {
    let i=0;for(let j=1;j<tiers.length;j++) if(n>=tiers[j].start) i=j;
    return i;
  }
  function hash(text) {let h=7;for(const c of text) h=(h*31+c.charCodeAt(0))>>>0;return h;}
  function artist() {
    for (const [globalName,name] of [['BH','bh-engine.js'],['AsgardReference','reference-hole.js'],['AsgardVariants','reference-variants.js'],['AsgardModelPreview','model-preview.js']])
      if(!root[globalName]) {loadScript(name,globalName); return null;}
    if(art) return art;
    if(performance.now()<lastRenderError) return null;
    try {
      const canvas=document.createElement('canvas');
      art={engine:new root.BH.BHScene(canvas,{scale:1,isolatedLayer:true}),reference:null,background:document.createElement('canvas'),faces:[],w:0,h:0};
      return art;
    } catch {
      lastRenderError=performance.now()+30000;
      state.message='The saved black-hole renderer requires WebGL 2 on this device.';return null;
    }
  }
  function streamArt(ctx,f,W,H,time) {
    refreshLive();fetchDesigns();
    const hs=designs.raven?.holes,T=hs?.dashboards;
    if(!feed.length||!T?.viewers?.tiers?.length||!T.friends?.tiers?.length) return;
    const a=artist();if(!a)return;
    const w=390,h=clamp(Math.round(390*H/W),1,2200);
    if(a.w!==w||a.h!==h) {a.w=w;a.h=h;a.engine.resize(w,h);a.background.width=w;a.background.height=h;}
    const bctx=a.background.getContext('2d');bctx.clearRect(0,0,w,h);
    const t=ctx.getTransform();
    if(t.a>0&&t.d>0) bctx.drawImage(ctx.canvas,t.e,t.f,W*t.a,H*t.d,0,0,w,h);
    a.engine.setBackground('A',a.background);
    const live=feed.slice(0,clamp(hs.behavior?.count??4,1,root.BH.MAXH)), poses=[];
    const fi=T.friends.tiers, vi=T.viewers.tiers;
    for(let i=0;i<live.length;i++) {
      const row=live[i], idx=tierIndex(vi,row.viewer_count||0), friend=tierIndex(fi,row.follower_count||0), sd=hash(row.host_id);
      const saved=vi[idx]?.look,friendLook=fi[friend].look;if(!saved||!friendLook)continue;
      const size=hs.friendSize?.auto ? hs.friendSize.min+(hs.friendSize.max-hs.friendSize.min)*friend/Math.max(1,fi.length-1) : friendLook.size;
      const radius=Math.max(2,(size||12)*(hs.behavior?.sizeScale??1)*f.scale);
      const spread=live.length>1 ? ((i/(live.length-1))-.5)*.70 : 0;
      const drift=(hs.behavior?.speed??0)/390, phase=(sd%628)/100;
      const x=f.x+spread+(drift?Math.sin(time*drift+phase)*.085:0);
      const y=f.y+(live.length>1?(i%2-.5)*.055:0)+(hs.behavior?.wobble??0)*Math.sin(time*.13+phase)*.012;
      let look,ref=null;
      if(idx===0) look=root.AsgardModelPreview.quiet(hs);
      else if(idx===1 && hs.referencePreview) {
        ref=root.AsgardVariants.liveSettings({...hs.referencePreview,x,y,radius,driftOn:false},row.host_id,hs.orientation||{},hs.referenceGrowth,row.viewer_count);
        look={...root.BH.BH_DEFAULTS,...friendLook,disk:0,ring:0,corona:0,glow:0,jets:0,flare:0,envFeed:0};
      } else {
        const model=root.AsgardModelPreview.forTier(hs,idx+1);
        if(model?.look) look=root.AsgardModelPreview.hole({...model,streamerId:row.host_id,randomAxis:model.skyRandomAxis??model.randomAxis,
          growth:model.growth?{...model.growth,views:row.viewer_count}:undefined},time);
        else look={...root.BH.BH_DEFAULTS,...friendLook,...saved};
      }
      const src=typeof row.avatar_url==='string'&&/^https:\/\//i.test(row.avatar_url)?row.avatar_url:'';
      const face=hs.hideFaces===true||!src?null:image(src,cachedSubjects);
      poses.push({ref,face,look:{...look,x,y,size:radius,radius,faceAmt:face?(hs.refl?.amount??.85):0,seed:(sd%10000)/1000}});
    }
    if(!poses.length)return;
    a.engine.holes=poses.map(p=>p.look);a.engine.refl=hs.refl||{};
    const faces=poses.map(p=>p.face);
    if(faces.length!==a.faces.length||faces.some((im,i)=>im!==a.faces[i])){a.faces=faces;a.engine.faces=faces;a.engine._uploadFaces();}
    a.engine.render(time);
    ctx.drawImage(a.engine.canvas,0,0,W,H);
    ctx.save();ctx.scale(W/w,H/h);
    for(const p of poses)if(p.ref){
      if(!a.reference) {
        a.reference=new root.AsgardReference.ReferenceHole();
        a.reference.image.addEventListener('load',updated,{once:true});
      }
      a.reference.draw(ctx,a.background,p.ref,time,w,h);
    }
    ctx.restore();
  }
  function draw(ctx,settings,W,H,options={}) {
    if(!settings||!W||!H) return;
    if(typeof options.onUpdate==='function') subscriptions.set(ctx,options.onUpdate);
    const light=lighting(settings,options), url=light==='day'?settings.day_url:settings.night_url;
    ctx.save();ctx.beginPath();ctx.rect(0,0,W,H);ctx.clip();
    try {
      if(allowedAsset(url,'background')) {const im=image(url);if(im)cover(ctx,im,W,H);}
      for(const [key,render] of [['stars',starField],['streamers',streamArt],['raven',drawRaven]]) {
        const f=active(settings,key,light);if(!f||f.opacity<=0)continue;
        ctx.save();ctx.globalAlpha*=f.opacity;
        try {render(ctx,f,W,H,options.timeSeconds??performance.now()/1000);}
        finally {ctx.restore();}
      }
    } finally {ctx.restore();}
  }
  root.SleipnirSkyLayers=Object.freeze({catalog,draw,lighting,allowedAsset,setLiveSessions,status:()=>({...state})});
})(window);
