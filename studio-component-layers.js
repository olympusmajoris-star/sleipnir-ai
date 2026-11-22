/* A layer references an authored Studio screen. Its overrides belong to one placement. */
(() => {
  'use strict';
  const root=new URL('.',document.currentScript.src);
  const sources=Object.freeze({home:'Sleipnir home',sky:'Asgard sky',horn:'Heimdall',way:'Wayfinder',dial:'Raven dial',directory:'Raven directory',conversation:'Raven conversation'});
  const mounts=new WeakMap();
  // The conversation paints its artwork and controls together in the original canvas.
  const foregroundAvailable=screen=>screen!=='conversation';
  function scene(input) {
    if (!input || input.version!==1 || !Object.hasOwn(sources,input.screen) ||
        !['foreground','full'].includes(input.plane) || !input.values || typeof input.values!=='object'||Array.isArray(input.values)) throw Error('Invalid Studio component.');
    const entries=Object.entries(input.values);
    if(entries.length>2048 || entries.some(([key,value])=>!key||key.length>100||['__proto__','constructor','prototype'].includes(key)||
      !(typeof value==='boolean'||Number.isFinite(value)||typeof value==='string' && value.length<=500))) throw Error('Invalid component settings.');
    return {version:1,screen:input.screen,plane:foregroundAvailable(input.screen)?input.plane:'full',values:Object.fromEntries(entries)};
  }
  function mount(host,initial) {
    if(mounts.has(host)){const existing=mounts.get(host);existing.update(initial);return existing;}
    let state,frame,timer,ready,ok,fail,signature,nonce,live=false,serial=0,visible=true;
    function receive(e) {
      const m=e.data;
      if(e.origin!==root.origin || e.source!==frame?.contentWindow || m?.nonce!==nonce) return;
      if(m.type==='studio:component-loaded'){send(true);}
      else if(m.type==='studio:component-ready'){live=true;clearTimeout(timer);ok(m.metadata);}
      else if(m.type==='studio:component-error'){clearTimeout(timer);frame.hidden=true;fail(Error(m.message||'Component could not render.'));}
    }
    function send(initial=false){if(live||initial)frame.contentWindow.postMessage({type:'studio:component-apply',nonce,scene:state,visible},root.origin);}
    function update(input) {
      const next=scene(input), key=JSON.stringify(next);
      if(key===signature)return ready;
      const replace=state?.screen!==next.screen;state=next;signature=key;
      if(!replace){send();return ready;}
      clearTimeout(timer);if(frame){fail(Error('Component source changed.'));frame.remove();}
      live=false;nonce=crypto.randomUUID();serial++;
      ready=new Promise((resolve,reject)=>{ok=resolve;fail=reject;});
      ready.catch(()=>{});
      frame=document.createElement('iframe');frame.dataset.studioComponent=state.screen;
      frame.title=sources[state.screen];frame.inert=true;frame.tabIndex=-1;
      frame.setAttribute('aria-hidden','true');frame.setAttribute('sandbox','allow-scripts allow-same-origin');
      frame.setAttribute('allow',"camera 'none'; microphone 'none'; geolocation 'none'; payment 'none'");
      frame.style.cssText='position:absolute;inset:0;width:100%;height:100%;border:0;pointer-events:none;background:transparent';
      const url=new URL('studio-component-surface.html',root);url.searchParams.set('screen',state.screen);url.searchParams.set('nonce',nonce);
      frame.src=url.href;host.append(frame);const current=serial;
      timer=setTimeout(()=>{if(current===serial&&!live)fail(Error('The component source did not load.'));},30000);
      return ready;
    }
    const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{
      visible=entries.at(-1)?.isIntersecting!==false;
      if(live)frame.contentWindow.postMessage({type:'studio:component-visibility',nonce,visible},root.origin);
    }):null;
    observer?.observe(host);
    const api={get ready(){return ready;},update,dispose(){observer?.disconnect();clearTimeout(timer);if(!live)fail?.(Error('Component closed.'));removeEventListener('message',receive);frame?.remove();mounts.delete(host);}};
    addEventListener('message',receive);mounts.set(host,api);update(initial);return api;
  }
  window.StudioComponentLayers=Object.freeze({sources,foregroundAvailable,scene,mount});
})();
