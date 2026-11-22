/* Reuse the registered source screen's real draw function and control definitions. */
(async () => {
  'use strict';
  const params=new URLSearchParams(location.search), id=params.get('screen'), nonce=params.get('nonce');
  const output=document.getElementById('stage'), kit=window.StudioKit;
  const send=(type,detail)=>parent.postMessage({type,nonce,...detail},location.origin);
  const dependencies={
    home:['home-1120'],sky:['asgard-sky-1120'],horn:['asgard-heimdall-1120'],way:['asgard-wayfinder-1120'],
    dial:['raven-motion-1120','raven-glass-1120','raven-dial-1119','raven-unread-1121'],
    directory:['bh-engine','reference-hole','reference-variants','model-preview','raven-tiers-1120','raven-environment-1120','raven-directory-1119'],
    conversation:['raven-webp-decoder-1120','raven-earth-controls-1120','raven-conversation-1119']
  };
  if(parent===window || !Object.hasOwn(dependencies,id) || !nonce)return;
  function script(name) {return new Promise((ok,fail)=>{const s=document.createElement('script');s.src=name+'.js';s.onload=ok;s.onerror=()=>fail(Error('Studio source could not load.'));document.head.append(s);});}
  try {
    kit.componentInstance=true;kit.viewOnly=true;
    kit.openSection=kit.openSectionOf=kit.rebuild=kit.commit=()=>{};kit.go=()=>false;kit.show=async()=>{};
    if(id!=='home'){
      await script('rock-nav');await script('rock-nav-kit-1120');
      const until=performance.now()+15000;
      while(!kit.rockNav?.NAV?.loaded){
        if(performance.now()>=until)throw Error('Navigation settings took too long to load. Reload the preview to retry.');
        await new Promise(resolve=>setTimeout(resolve,30));
      }
    }
    for(const name of dependencies[id]) await script(name);
    if(id==='sky')await script('studio-asgard-scene');
    await script('text-layer-1121');
    const sc=kit.screens[id], rows=[], byKey=new Map();
    for(const s of sc.SPEC) {
      if(byKey.has(s.k)||!['num','int','bool','color','select','text'].includes(s.type)) continue;
      if(s.k==='bg.facing'||/^(?:navlook|nav:routes[.])|(?:^|[.])(?:tap|tryStudio|follow|navigate|targetRoute)$/.test(s.k)||/(?:^|\.)(?:url|uri|src|href|token|password|endpoint|device)(?:$|\.)/i.test(s.k))continue;
      const row={key:s.k,label:s.label,type:s.type,group:s.group,section:s.section,default:s.def};
      if(['num','int'].includes(s.type)){
        if(!Number.isFinite(s.min)||!Number.isFinite(s.max))continue;
        Object.assign(row,{min:s.min,max:s.max,step:s.step||1,unit:s.unit||''});
      }
      if(s.type==='select'){
        row.options=(s.opts||[]).filter(a=>Array.isArray(a)&&['string','number','boolean'].includes(typeof a[0]) && a[0]!=='camera').map(a=>[a[0],String(a[1])]);
        if(!row.options.length)continue;
      }
      rows.push(row);byKey.set(s.k,row);
    }
    function valid(key,v){
      const f=byKey.get(key);if(!f)return false;
      if(f.type==='num'||f.type==='int')return Number.isFinite(v)&&v>=f.min&&v<=f.max&&(f.type!=='int'||Number.isInteger(v));
      if(f.type==='select')return f.options.some(([value])=>value===v);
      if(f.type==='bool')return typeof v==='boolean';
      if(f.type==='color')return typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v);
      return typeof v==='string'&&v.length<=500&&!/[\x00-\x08\x0e-\x1f]/.test(v);
    }
    const render=await kit.openComponentScene(id,output,valid);
    for(const f of rows) f.baseline=render.baseline[f.key];
    let plane='foreground', last=0, alive=true, initialized=false, visible=true, frame=0;
    let fatal=false;
    const error=e=>{if(!fatal)send('studio:component-error',{message:e.message||'The component could not render.'});fatal=true;};
    addEventListener('message',e=>{
      const m=e.data;
      if(e.source!==parent||e.origin!==location.origin||m?.nonce!==nonce)return;
      if(m.type==='studio:component-visibility'){
        visible=m.visible===true;resume();return;
      }
      if(m.type!=='studio:component-apply')return;
      try {
        const scene=StudioComponentLayers.scene(m.scene);
        if(scene.screen!==id || Object.entries(scene.values).some(([k,v])=>!valid(k,v)))throw Error('Unsupported component override.');
        visible=m.visible!==false;plane=scene.plane;render.apply(scene.values);
        if(!initialized){
          render.draw(performance.now(),0,plane);initialized=true;
          send('studio:component-ready',{metadata:{screen:id,title:sc.title,source:render.source,fields:rows}});
          resume();
        }
      }catch(err){error(err);}
    });
    function resume(){if(alive&&initialized&&visible&&!document.hidden&&!frame) frame=requestAnimationFrame(tick);}
    document.addEventListener('visibilitychange',resume);
    function tick(now){
      frame=0;if(!alive||!visible||document.hidden)return;
      if(!document.hidden && now-last>=1000/24) {
        try {render.draw(now,last ? Math.min(.08,(now-last)/1000):0,plane);} catch(e){error(e);return;}
        last=now;
      }
      resume();
    }
    send('studio:component-loaded',{});
    addEventListener('pagehide',()=>{alive=false;render.dispose();},{once:true});
  }catch(e){send('studio:component-error',{message:e.message});}
})();
