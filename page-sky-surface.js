/* Transparent visual plane for native WebViews and the Flutter web iframe. */
(() => {
  'use strict';
  const api = window.SleipnirSkyLayers, canvas=document.getElementById('sky'), ctx=canvas.getContext('2d');
  const reduced=matchMedia('(prefers-reduced-motion:reduce)'), filter=location.hash.slice(1);
  const channel='sleipnir-page-sky';
  let scene={}, lighting='local', paused=true, motion=false, timer=0, ownerOrigin='';
  let portableKey='', portableMount=null, portableScripts=null, portableTarget=null, portableEpoch=0;
  function loadPortable() {
    if(window.PortableLayerSurface) return Promise.resolve(window.PortableLayerSurface);
    if(portableScripts)return portableScripts;
    if(!document.querySelector('link[data-portable-media]')) {
      const css=document.createElement('link');css.rel='stylesheet';css.href='studio-media.css';css.dataset.portableMedia='';
      document.head.append(css);
    }
    portableScripts=(async()=>{
      for(const [file,global] of [['studio-component-layers.js','StudioComponentLayers'],['studio-page-tools.js','StudioPageTools'],['studio-media.js','SharedStudioMedia'],['portable-layer-store.js','PortableLayerStore'],
        ['page-transition-store.js','SleipnirTransitionStore'],['page-target-effects.js','SleipnirTargetEffects'],
        ['page-glass.js','PageGlass'],['scene-transitions.js','SleipnirSceneTransitions'],
        ['portable-selection-effects.js','SleipnirSelectionAppearance'],['portable-layer-surface.js','PortableLayerSurface']]) {
        if(window[global])continue;
        await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=file;script.onload=resolve;
          script.onerror=()=>{script.remove();
            if(global==='StudioComponentLayers')resolve(); // PageTools will retry only if an authored embedded component needs it.
            else reject(Error('Could not load '+file));
          };document.head.append(script);});
      }
      return window.PortableLayerSurface;
    })().catch(e=>{portableScripts=null;throw e;});
    return portableScripts;
  }
  function applyPortable(target) {
    const normalized=target && typeof target.page==='string' && target.page ? Object.fromEntries(
      ['page','store','aisle','part','layer'].map(k=>[k,typeof target[k]==='string' ? target[k] : ''])) : null;
    const key=normalized?JSON.stringify(normalized):'';
    if(key===portableKey)return;
    portableKey=key;const epoch=++portableEpoch;
    portableMount?.dispose();portableMount=null;
    const host=document.getElementById('portable');host.replaceChildren();
    if(!normalized)return;
    loadPortable().then(api=>{
      if(epoch!==portableEpoch || !api)return;
      const instance=api.mount(host,normalized);portableMount=instance;
      return instance?.ready;
    }).catch(()=>{if(epoch===portableEpoch){portableMount?.dispose();portableMount=null;host.replaceChildren();portableKey='';}});
  }
  if (document.referrer) { try {ownerOrigin=new URL(document.referrer).origin;} catch {} }
  const notifyReady=()=>{ if(window.parent!==window) window.parent.postMessage({source:channel,type:'ready'},ownerOrigin||'*'); };
  let localClip=null;
  function render() {
    clearTimeout(timer);timer=0;
    if(document.hidden||paused)return;
    const width=canvas.clientWidth,height=canvas.clientHeight;
    if(!width||!height)return;
    const dpr=Math.min(2,devicePixelRatio||1);
    const w=Math.round(width*dpr),h=Math.round(height*dpr);
    if(canvas.width!==w)canvas.width=w;
    if(canvas.height!==h)canvas.height=h;
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
    api.draw(ctx,scene,width,height,{lighting,onUpdate:render,timeSeconds:motion?0:performance.now()/1000});
    if(localClip) {
      ctx.save();ctx.globalCompositeOperation='destination-in';ctx.drawImage(localClip,0,0,width,height);ctx.restore();
    }
    const live=scene.features?.streamers, light=api.lighting(scene,{lighting});
    const moving=live?.enabled && (live.schedule==='both'||!live.schedule||live.schedule===light) && live.opacity!==0 && api.status().count>0;
    timer=setTimeout(render,moving&&!motion?1000/30:15000);
  }
  function configure(value={}) {
    if(!value||typeof value!=='object')return;
    const raw=value.settings && typeof value.settings==='object'?value.settings:{};
    scene=Object.hasOwn(api.catalog.features,filter)?{features:{[filter]:raw.features?.[filter]},day_start:raw.day_start,night_start:raw.night_start}:raw;
    api.setLiveSessions(value.liveSessions ?? null,value.liveStatus);
    lighting=['local','day','night'].includes(value.lighting)?value.lighting:'local';paused=value.paused===true;
    portableTarget=value.portableTarget||null;
    applyPortable(paused||document.hidden?null:portableTarget);
    motion=!!value.reducedMotion||reduced.matches;render();
  }
  window.SleipnirSkySurface=Object.freeze({configure,setLocalClip(value){localClip=value;}});
  addEventListener('message',ev=>{
    // The direct embedding app owns only this read-only, filtered visual frame.
    if(ev.source!==window.parent||!ev.origin||ev.origin==='null'||ownerOrigin&&ev.origin!==ownerOrigin||ev.data?.source!==channel)return;
    if(!ownerOrigin) ownerOrigin=ev.origin;
    if(ev.data.type==='configure')configure(ev.data);
    else if(ev.data.type==='hello')notifyReady();
  });
  const resize=new ResizeObserver(render);resize.observe(canvas);
  document.addEventListener('visibilitychange',()=>{applyPortable(paused||document.hidden?null:portableTarget);render();});
  addEventListener('pagehide',()=>{clearTimeout(timer);applyPortable(null);});
  addEventListener('pageshow',()=>{applyPortable(paused||document.hidden?null:portableTarget);render();});
  notifyReady();
})();
