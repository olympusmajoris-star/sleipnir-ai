/* The original Flutter street remains interactive. This plane takes its alpha
   from the same registered, verified public storefront photograph. */
(() => {
  'use strict';
  const script=new URL(document.currentScript.src), relative=p=>new URL(p,script).href;
  const key='sleipnir-page-sky', page='ValhallaV2';
  const clamp=(x,low,high,fallback)=>Number.isFinite(x)?Math.min(high,Math.max(low,x)):fallback;
  const rect=(W,H)=>{
    const space=Math.max(0,H-50-106),w=Math.min(W,space*941/1672),h=w*1672/941;
    return {x:(W-w)/2,y:50+(space-h)/2,width:w,height:h};
  };
  async function paint(canvas,{store,settings={}}){
    const {matte}=await window.ValhallaPhotoSky.open(store);
    const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
    const f=settings.fronts?.[store]||{},z=clamp(f.scale,.5,2,1),curb=clamp(settings.curb_y,.4,.95,1475/1672);
    const x=(.5+clamp(f.offset_x,-.4,.4,0)-z*.5)*w;
    const y=(curb+clamp(f.offset_y,-.4,.4,0)-z*clamp(f.source_curb_y,0,1,1475/1672))*h;
    ctx.clearRect(0,0,w,h);ctx.fillStyle='white';ctx.fillRect(0,0,w,h*curb);
    ctx.clearRect(x,y,z*w,z*h);ctx.drawImage(matte,x,y,z*w,z*h);
    // Optional window graphics are authored in front of the sky by the shop.
    // Disconnected signs and windows retain their photographed appearance.
    return true;
  }
  window.ValhallaSkyMatte=Object.freeze({rect,paint});
  const q=new URLSearchParams(location.search), preview=q.get('store');
  if(q.get('street')!=='1'||!preview)return;
  let relaying=false,lastStreet='',streetKnown=false;
  let street={},streetReceived=false,current='',draft=null,scope={},light='local',published={},pageBase={},readToken=0;
  let pane=null,frame=null,localClip=null,frameReady=false,sessionRows,sessionStatus,dragX=null,moved=false,suppressUntil=0,paintToken=0,stable=false,ack=null;
  function up(event){document.dispatchEvent(new CustomEvent('sleipnir-preview-up',{detail:JSON.stringify({...event,store_id:preview})}));}
  function bounds(){const r=rect(innerWidth,innerHeight);return {x:r.x/innerWidth,y:r.y/innerHeight,width:r.width/innerWidth,height:r.height/innerHeight};}
  function effective(){return draft&&(!scope.store||scope.store===current)?draft:published;}
  function config(){const s=effective()||{};return {day_start:street.sky?.day_start??6,night_start:street.sky?.night_start??19,...s};}
  function enabled(s){return s.day_url||s.night_url||Object.values(s.features||{}).some(x=>x?.enabled===true);}
  function legacyLighting(){
    if(relaying||!streetKnown)return;
    const s=effective()||{},sky={...street.sky};
    for(const field of ['day_start','night_start','day_url','night_url'])if(Object.hasOwn(s,field))sky[field]=s[field];
    const detail={type:'street-settings',store_id:preview,settings:{...street,sky},sky_override:light};
    const next=JSON.stringify(detail);if(next===lastStreet)return;
    lastStreet=next;relaying=true;
    try{document.dispatchEvent(new CustomEvent('sleipnir-preview-down',{detail:next}));}
    finally{relaying=false;}
  }
  function applied(){if(ack){up({type:'page-sky-applied',page,target:ack,sky_rect:bounds()});ack=null;}}
  let liveTimer=0,liveGeneration=0,lastSubject=null,lastRead=0,reading=false;
  function studioSession(){
    let win=window;
    try {
      while(true){
        if(win.location.origin!==location.origin)return null;
        if(win.StudioJobs?.current?.()?.user?.id)return win.StudioJobs;
        if(win===win.parent)return null;
        win=win.parent;
      }
    }catch{return null;}
  }
  function refreshFeed(){
    clearTimeout(liveTimer);liveTimer=0;
    const s=config(),f=s.features?.streamers;
    if(!pane||document.hidden||!f?.enabled){
      ++liveGeneration;lastSubject=null;sessionRows=undefined;sessionStatus=undefined;reading=false;lastRead=0;return;
    }
    const hour=new Date().getHours(),day=s.day_start??6,night=s.night_start??19;
    const phase=light==='local'?((day<=night?hour>=day&&hour<night:hour>=day||hour<night)?'day':'night'):light;
    liveTimer=setTimeout(refreshFeed,5000);
    const jobs=studioSession(),subject=jobs?.current()?.user?.id??null;
    if(subject!==lastSubject){++liveGeneration;reading=false;lastRead=0;lastSubject=subject;sessionRows=null;sessionStatus='loading';send();}
    if(!subject||(f.schedule&&f.schedule!=='both'&&f.schedule!==phase)){sessionRows=null;sessionStatus='signed-out';send();return;}
    if(reading||Date.now()-lastRead<30000)return;
    const token=liveGeneration;reading=true;lastRead=Date.now();
    jobs.request('/rest/v1/live_streams?select=id,host_id,avatar_url,viewer_count,follower_count,provider,is_live,ended_at&is_live=eq.true&ended_at=is.null&provider=neq.test&order=viewer_count.desc,id.asc&limit=60',{auth:true}).then(rows=>{
      if(token!==liveGeneration||studioSession()?.current()?.user?.id!==subject)return;
      sessionRows=Array.isArray(rows)?rows.filter(row=>row.is_live===true&&row.ended_at==null&&row.provider&&row.provider!=='test'):[];
      sessionStatus='ready';send();
    }).catch(()=>{if(token===liveGeneration){sessionRows=null;sessionStatus='unavailable';send();}}).finally(()=>{if(token===liveGeneration)reading=false;});
  }
  function remove(){pane?.remove();pane=frame=localClip=null;frameReady=false;stable=false;refreshFeed();}
  function send(){
    if(!frameReady||!stable||!frame)return;
    if(!frame.contentWindow.SleipnirSkySurface?.setLocalClip)return;
    frame.contentWindow.SleipnirSkySurface.setLocalClip(localClip);
    frame.contentWindow.postMessage({source:key,type:'configure',settings:config(),lighting:light,
      ...(sessionRows!==undefined?{liveSessions:sessionRows,liveStatus:sessionStatus}:{}),
      paused:document.hidden||performance.now()<suppressUntil,
      reducedMotion:matchMedia('(prefers-reduced-motion:reduce)').matches},location.origin);applied();
  }
  function show(){if(pane)pane.style.visibility=stable&&!moved&&performance.now()>=suppressUntil?'visible':'hidden';}
  async function refresh(){
    legacyLighting();
    const token=++paintToken,settings=config();
    if(!current||!enabled(settings)){remove();applied();return;}
    const r=rect(innerWidth,innerHeight);if(!r.width||!r.height)return;
    const matte=document.createElement('canvas');const density=Math.min(2,devicePixelRatio||1);matte.width=Math.max(1,Math.round(r.width*density));matte.height=Math.max(1,Math.round(r.height*density));
    let valid=false;try{valid=await paint(matte,{store:current,settings:street});}catch{}
    if(token!==paintToken)return;
    if(!valid){remove();if(ack){up({type:'page-sky-unavailable',page,target:ack,message:'The released storefront photograph could not be verified for sky editing.'});ack=null;}return;}
    if(!pane){
      pane=document.createElement('div');pane.id='valhalla-authored-sky';pane.setAttribute('aria-hidden','true');
      pane.style.cssText='position:fixed;z-index:1;pointer-events:none;overflow:hidden;visibility:hidden';
      frame=document.createElement('iframe');frame.tabIndex=-1;frame.title='Street sky';frame.src=relative('../page-sky-surface.html');frame.style.cssText='border:0;width:100%;height:100%;pointer-events:none;background:transparent';
      pane.append(frame);document.body.append(pane);
    }
    localClip=matte;
    Object.assign(pane.style,{left:r.x+'px',top:r.y+'px',width:r.width+'px',height:r.height+'px'});
    stable=true;send();show();refreshFeed();
  }
  async function read(name,args){
    const cfg=window.StudioTransferConfig;
    if(!cfg)return {};
    const r=await fetch(cfg.url+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:cfg.key,Authorization:'Bearer '+cfg.key,'Content-Type':'application/json'},body:JSON.stringify(args),cache:'no-store'});
    if(!r.ok)return {};return r.json();
  }
  function stop(store){
    if(current===store){if(!stable)refresh();return;}
    const id=++readToken;current=store;published=pageBase;stable=false;show();
    refresh();
    if(!store)return;
    read('studio_resolve_page_sky',{p_page:page,p_target:{store}}).then(data=>{
      if(id===readToken&&data.page===page){published=data.settings||{};refresh();}
    }).catch(()=>{});
  }
  read('studio_page_sky_published',{p_page:page}).then(r=>{
    if(r.page===page&&r.settings){pageBase=r.settings;if(!Object.keys(published).length){published=pageBase;refresh();}}
  }).catch(()=>{});
  read('studio_valhalla_street_published',{}).then(r=>{if(!streetReceived&&r.settings){streetKnown=true;street=r.settings;refresh();}}).catch(()=>{});
  addEventListener('message',e=>{
    if(e.origin===location.origin&&e.source===frame?.contentWindow&&e.data?.source===key&&e.data.type==='ready'){frameReady=true;send();}
  });
  document.addEventListener('sleipnir-preview-down',e=>{
    let d;try{d=JSON.parse(e.detail);}catch{return;}
    if(relaying||d.store_id!==preview)return;
    if(d.type==='street-move'){suppressUntil=performance.now()+460;show();setTimeout(()=>{show();send();},470);return;}
    if(d.type==='street-settings'){streetReceived=true;streetKnown=true;street=d.settings||{};lastStreet='';}
    else if(d.type==='page-sky-settings'&&d.page===page){
      const target=d.target||{};
      if(Object.keys(target).some(k=>k!=='store')||(target.store&&target.store!==current))return;
      draft=d.settings??null;scope=target;ack=target;
      sessionRows=Array.isArray(d.liveSessions)?d.liveSessions:undefined;sessionStatus=d.liveStatus;
    }else return;
    if(['day','night','local'].includes(d.sky_override))light=d.sky_override;
    queueMicrotask(refresh);
  });
  document.addEventListener('sleipnir-preview-up',e=>{
    let d;try{d=JSON.parse(e.detail);}catch{return;}
    if(d.type==='street-stop')stop(d.is_ad?'':d.merchant_id);
  });
  addEventListener('resize',refresh);document.addEventListener('visibilitychange',()=>{refreshFeed();send();}); addEventListener('storage',refreshFeed); addEventListener('pagehide',()=>clearTimeout(liveTimer));
  addEventListener('pointerdown',e=>{dragX=e.clientX;moved=false;},{capture:true,passive:true});
  addEventListener('pointermove',e=>{if(dragX!==null&&Math.abs(e.clientX-dragX)>6){moved=true;show();}},{capture:true,passive:true});
  function finish(){dragX=null;if(moved){suppressUntil=performance.now()+380;moved=false;setTimeout(()=>{show();send();},390);}}
  addEventListener('pointerup',finish,{capture:true,passive:true});addEventListener('pointercancel',finish,{capture:true,passive:true});
  // Native chevron presses animate the same PageView for about 320 ms.
  addEventListener('click',e=>{if(e.clientY>=innerHeight-106&&e.clientY<innerHeight-62){suppressUntil=performance.now()+380;show();setTimeout(()=>{show();send();},390);}},{capture:true,passive:true});
})();
