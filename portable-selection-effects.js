/* A selection keeps its hit targets, ambient motion and original authored pixels. */
(function (G) {
  'use strict';
  const eventName = 'sleipnir:target-effects-saved';
  const levels = ['page','store','aisle','part','layer'];
  const stamp = target => JSON.stringify(levels.map(k => target?.[k] || ''));
  const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));
  const isMedia = node => ['IMG','VIDEO','CANVAS'].includes(node.tagName);
  const frames = new WeakMap();

  function mediaSize(node) {
    return [node.videoWidth || node.naturalWidth || node.width, node.videoHeight || node.naturalHeight || node.height];
  }

  function drawMedia(ctx, node, left, top, width, height) {
    const [sw,sh] = mediaSize(node);
    if (!(sw > 0 && sh > 0) || (node.tagName === 'VIDEO' && node.readyState < 2)) return false;
    const style = getComputedStyle(node), fit = style.objectFit;
    const ratio = fit === 'cover' ? Math.max(width/sw,height/sh) : Math.min(width/sw,height/sh);
    const dw = fit === 'fill' ? width : sw * ratio, dh = fit === 'fill' ? height : sh * ratio;
    const [px,py] = style.objectPosition.split(' ').map(s => parseFloat(s)/100);
    ctx.save(); ctx.beginPath(); ctx.rect(left,top,width,height); ctx.clip();
    try {ctx.drawImage(node,left+(width-dw)*(Number.isFinite(px)?px:.5),top+(height-dh)*(Number.isFinite(py)?py:.5),dw,dh);}
    finally {ctx.restore();}
    return true;
  }

  // Use the browser's actual wrapping and font metrics even when the stage is scaled or rotated.
  function drawText(ctx, node, width, height) {
    if (!node.textContent) return;
    const style = getComputedStyle(node), copy = node.cloneNode(false);
    for (const key of ['fontFamily','fontSize','fontWeight','fontStyle','lineHeight','letterSpacing','textAlign',
      'padding','boxSizing','alignItems','justifyContent','whiteSpace','overflowWrap','display','direction']) copy.style[key] = style[key];
    Object.assign(copy.style,{position:'fixed',left:'-16000px',top:'0',width:width+'px',height:height+'px',visibility:'hidden',transform:'none'});
    copy.removeAttribute('id'); copy.textContent=node.textContent; copy.ariaHidden='true';
    document.body.append(copy);
    try {
      const box=copy.getBoundingClientRect(), range=document.createRange(), text=copy.firstChild;
      let index=0, line=null;
      ctx.fillStyle=style.color; ctx.font=[style.fontStyle,style.fontWeight,style.fontSize,style.fontFamily].join(' ');
      ctx.direction=style.direction; ctx.textBaseline='alphabetic'; ctx.textAlign='left';
      if ('letterSpacing' in ctx) ctx.letterSpacing=style.letterSpacing==='normal'?'0px':style.letterSpacing;
      const metrics=ctx.measureText('Mg');
      const ascent=metrics.fontBoundingBoxAscent || parseFloat(style.fontSize)*.8;
      const descent=metrics.fontBoundingBoxDescent || parseFloat(style.fontSize)*.2;
      function paint() {
        if(!line)return;
        const y=line.cy+(ascent-descent)/2;
        ctx.fillText(line.text,line.x,y);
        if(style.textDecorationLine.includes('underline')) ctx.fillRect(line.x,y+1,ctx.measureText(line.text).width,Math.max(1,parseFloat(style.fontSize)/16));
      }
      for(const ch of text.textContent) {
        range.setStart(text,index);index+=ch.length;range.setEnd(text,index);
        const r=range.getBoundingClientRect(), cy=r.top-box.top+r.height/2;
        if(!r.width || ch==='\n')continue;
        if(!line || Math.abs(line.cy-cy)>1){paint();line={cy,x:r.left-box.left,text:''};}
        line.x=Math.min(line.x,r.left-box.left);line.text+=ch;
      }
      paint();
    } finally {copy.remove();}
  }

  function snapshot(content, surface, includeFinish) {
    const width=surface.clientWidth || content.clientWidth, height=surface.clientHeight || content.clientHeight;
    if(!width || !height) return null;
    const image=document.createElement('canvas'), ratio=Math.min(2,G.devicePixelRatio||1,960/Math.max(width,height));
    image.width=Math.max(1,Math.round(width*ratio));image.height=Math.max(1,Math.round(height*ratio));
    const ctx=image.getContext('2d',{willReadFrequently:true});ctx.scale(image.width/width,image.height/height);
    const track=surface.querySelector(':scope > .spt-panels');
    const media=track ? [...track.children].filter(isMedia) : [...surface.children].filter(isMedia);
    const text=surface.querySelector(':scope > .spt-text'), style=getComputedStyle(surface);
    // Embedded components, controls and custom artwork should keep their live DOM, including during a reveal.
    if([...surface.children].some(n=>n!==track && n!==text && !isMedia(n) &&
      !n.hasAttribute('data-selection-material') && !n.classList.contains('spt-product-zones')))return null;
    if(style.backgroundImage!=='none' || (style.borderTopStyle!=='solid' && parseFloat(style.borderTopWidth)>0))return null;
    // An opaque native canvas is already an exact capture supplied by the page editor.
    if (!media.length && !text?.textContent) return null;
    try {
      if(includeFinish) {
        const border=parseFloat(style.borderTopWidth)||0;
        const radius=style.borderTopLeftRadius.endsWith('%') ? parseFloat(style.borderTopLeftRadius)*Math.min(width,height)/100 : parseFloat(style.borderTopLeftRadius)||0;
        ctx.beginPath();ctx.roundRect(0,0,width,height,Math.min(radius,width/2,height/2));
        ctx.fillStyle=style.backgroundColor;ctx.fill();
        if(border>0) {ctx.lineWidth=2*border;ctx.strokeStyle=style.borderTopColor;ctx.clip();ctx.stroke();}
      }
      for (const node of media) {
        const x=track ? node.offsetLeft-track.scrollLeft : node.offsetLeft;
        const y=track ? node.offsetTop-track.scrollTop : node.offsetTop;
        const w=node.clientWidth||width,h=node.clientHeight||height;
        if(x>=width || y>=height || x+w<=0 || y+h<=0)continue;
        if(!drawMedia(ctx,node,x,y,w,h))return null;
      }
      if(text)drawText(ctx,text,width,height);
      // Some external media can be displayed but cannot be sampled for contour extraction.
      ctx.getImageData(0,0,1,1);
      return image;
    } catch {return null;}
  }

  function localClip(settings, t) {
    const reverse=settings.direction==='reverse', variant=settings.variant, strength=settings.intensity??.65;
    if(settings.effect==='aperture' || settings.effect==='mesh')
      return 'circle('+(t*146)+'% at '+(reverse?'85%':'15%')+' 50%)';
    const taper=(settings.effect==='filaments'?26:settings.effect==='draw'&&variant==='pencil'?15:5)*strength;
    const count=settings.effect==='glass'?4:settings.effect==='mesh'?8:22;
    const edge = n => {
      const noise=Math.sin(n*2.17+(settings.seed||1))*taper*Math.sin(Math.PI*t);
      const v=Math.max(0,Math.min(100,100*t+noise));
      return (reverse?100-v:v)+'% '+(100*n/count)+'%';
    };
    const side=reverse?'100%':'0%';
    return 'polygon('+side+' 0%,'+Array.from({length:count+1},(_,n)=>edge(n)).join(',')+','+side+' 100%)';
  }

  function mount(element, options={}) {
    if(!(element instanceof HTMLElement) || element===document.body || element===document.documentElement)
      throw new Error('Choose a single layer or a measured region.');
    frames.get(element)?.dispose();
    const motion=element.querySelector(':scope > .spt-motion') || element;
    const surface=motion.querySelector(':scope > .spt-surface') || motion;
    const reduced=G.matchMedia?.('(prefers-reduced-motion:reduce)');
    const beforeClip=element.style.clipPath;
    let active=true, settings, pane=null, materialHost=null, renderer=null, canvas=null;
    let raf=0, timeout=0, lastT=1, start=performance.now(), frozen=false, snapped=false;
    const hiddenChildren = new Map();
    const finishAttribute='data-sleipnir-selection-finish';
    if(!document.getElementById('sleipnir-selection-style')){
      const style=document.createElement('style');style.id='sleipnir-selection-style';
      style.textContent='['+finishAttribute+']{background-color:transparent!important;border-color:transparent!important}';
      document.head.append(style);
    }
    function stop(){cancelAnimationFrame(raf);clearTimeout(timeout);raf=timeout=0;}
    function release() {
      renderer?.dispose();renderer=null;canvas?.remove();canvas=null;snapped=false;
      for(const [child,value] of hiddenChildren){child.style.opacity=value;}
      hiddenChildren.clear();surface.removeAttribute(finishAttribute);element.style.clipPath=beforeClip;
    }
    function paneClock(elapsedMs) {
      const supplied=options.clock?.() || {}, camera=G.StudioKit?.transitionCamera;
      return {...supplied,elapsedMs,transitionMs:settings.effect==='off' || reduced?.matches ? 0:settings.durationMs,
        camera:Object.hasOwn(supplied,'camera')?supplied.camera:camera?.source?.() || null,
        mirror:supplied.mirror ?? camera?.mirrored?.() ?? false};
    }
    function material(elapsedMs) {
      const glass=settings?.glass;
      if(glass?.material && glass.material!=='none' && G.PageGlass) {
        if(!materialHost) {
          materialHost=document.createElement('div');materialHost.ariaHidden='true';materialHost.dataset.selectionMaterial='';
          materialHost.style.cssText='position:absolute;inset:0;overflow:hidden;pointer-events:none;';
          surface.insertBefore(materialHost,surface.firstChild);
        }
        // PageTools can prepend a replacement photo when an author changes its source.
        if(surface.firstChild!==materialHost) surface.prepend(materialHost);
        if(!pane)pane=G.PageGlass.installPane(materialHost,glass,null,paneClock(elapsedMs));
        else pane.update(glass,paneClock(elapsedMs));
      } else {pane?.dispose();pane=null;materialHost?.remove();materialHost=null;}
    }
    function prepare() {
      if(snapped)return;snapped=true;
      if(!G.SleipnirSceneTransitions)return;
      const img=snapshot(motion,surface,!pane);
      if(!img)return;
      canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;canvas.ariaHidden='true';
      canvas.dataset.selectionArtwork='';canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:3;';
      renderer=G.SleipnirSceneTransitions.prepare({...settings,layer:'controls',toLayer:img});
      for(const child of surface.children)if(child!==materialHost && child instanceof HTMLElement){
        hiddenChildren.set(child,child.style.opacity);child.style.opacity='0';
      }
      if(!pane)surface.setAttribute(finishAttribute,'');
      surface.append(canvas);
    }
    function render(t,elapsedMs) {
      lastT=clamp(t);
      material(elapsedMs);
      if(lastT>=1 || settings.effect==='off' || reduced?.matches) {
        if(snapped)release();return;
      }
      prepare();
      if(renderer) renderer.draw(canvas.getContext('2d'),lastT);
      else element.style.clipPath=localClip(settings,lastT);
    }
    function tick(now) {
      if(!active || frozen)return;
      const elapsed=Math.max(0,now-start),duration=settings.durationMs;
      render(settings.effect==='off' || reduced?.matches ? 1:elapsed/duration,elapsed);
      if(lastT<1) {raf=requestAnimationFrame(tick);return;}
      const g=settings.glass;
      if(!pane)return;
      // Sleeping scene materials cost no frames. Camera frames follow an already-active camera only.
      if(g.source==='camera' && G.PageGlass.visible(g,paneClock(elapsed)) && !document.hidden) {
        timeout=setTimeout(()=>tick(performance.now()),66);return;
      }
      const next=[paneClock(elapsed).transitionMs, g.show==='window'?g.delayMs:0, g.show==='window'?g.delayMs+g.visibleMs:0].filter(v=>v>elapsed).sort((a,b)=>a-b)[0];
      if(next!==undefined)timeout=setTimeout(()=>tick(performance.now()),Math.ceil(next-elapsed)+1);
    }
    function replay(){if(!active)return;stop();release();start=performance.now();frozen=false;tick(start);}
    function seek(t,elapsedMs){
      if(!active)return;
      stop();frozen=true;const p=clamp(t);
      render(p,Number.isFinite(elapsedMs)?elapsedMs:p*settings.durationMs);
    }
    function update(value) {
      if(!active)return;
      settings={effect:'off',durationMs:900,...value};
      release();
      if(options.autoplay===false || options.active===false)seek(lastT);
      else replay();
    }
    function refresh(){if(active && !frozen){stop();tick(performance.now());}}
    function dispose(){
      if(!active)return;active=false;stop();release();pane?.dispose();materialHost?.remove();
      reduced?.removeEventListener('change',refresh);document.removeEventListener('visibilitychange',refresh);
      frames.delete(element);
    }
    const api={update,replay,seek,dispose};
    frames.set(element,api);reduced?.addEventListener('change',refresh);document.addEventListener('visibilitychange',refresh);
    update(options.settings);return api;
  }

  function watch(host,containerTarget) {
    const entries=new Map(), cache=new Map(), inflight=new Map();
    let live=true,queued=false;
    function accept(row) {
      if(!live || !row?.target || !Number.isSafeInteger(row.revision))return;
      const key=stamp(row.target);
      if(![...entries.values()].some(e=>e.key===key))return;
      if(cache.has(key) && row.revision<=cache.get(key).revision)return;
      cache.set(key,row);
      for(const [element,entry] of entries)if(entry.key===key) {
        if (row.settings?.effect==='off' && (!row.settings.glass?.material || row.settings.glass.material==='none')) {
          entry.api?.dispose();entry.api=null;
        } else if(row.settings) {
          if(entry.api)entry.api.update(row.settings);
          else entry.api=mount(element,{target:row.target,settings:row.settings});
        }
      }
    }
    async function refresh() {
      if(!live)return;
      const nodes=new Set(host.querySelectorAll('.spt-layer[data-layer]'));
      for(const [node,entry] of entries)if(!nodes.has(node) || node.dataset.layer!==entry.target.layer) {
        entry.api?.dispose();entries.delete(node);
      }
      const work=[];
      for(const node of nodes) {
        const existing=entries.get(node);
        if(existing){const pending=inflight.get(existing.key);if(pending)work.push(pending);continue;}
        if(!node.dataset.layer)continue;
        const target=Object.fromEntries(levels.filter(k=>k!=='layer' && containerTarget[k]).map(k=>[k,containerTarget[k]]));
        target.layer=node.dataset.layer;const key=stamp(target), entry={key,target,api:null};
        entries.set(node,entry);
        const row=cache.get(key);
        if(row?.settings && (row.settings.effect!=='off'||(row.settings.glass?.material && row.settings.glass.material!=='none')))entry.api=mount(node,{target,settings:row.settings});
        else if(!row) {
          if(!inflight.has(key))inflight.set(key,Promise.resolve().then(()=>G.SleipnirTargetEffects.read(target)).then(accept)
            .catch(()=>{if(entries.get(node)===entry)entries.delete(node);}).finally(()=>inflight.delete(key)));
          work.push(inflight.get(key));
        }
      }
      await Promise.all(work);
    }
    const observer=new MutationObserver(records=>{
      if(queued || !records.some(r=>r.type==='attributes'||[...r.addedNodes,...r.removedNodes].some(n=>
        n.nodeType===1 && (n.matches('.spt-layer[data-layer]')||n.querySelector('.spt-layer[data-layer]')))))return;
      queued=true;queueMicrotask(()=>{queued=false;refresh();});
    });
    observer.observe(host,{childList:true,subtree:true,attributes:true,attributeFilter:['data-layer']});
    const saved=e=>accept(e.detail),channel=G.BroadcastChannel?new BroadcastChannel(eventName):null;
    G.addEventListener(eventName,saved);channel?.addEventListener('message',e=>accept(e.data));
    return {ready:refresh(),refresh,dispose(){
      live=false;observer.disconnect();channel?.close();G.removeEventListener(eventName,saved);
      for(const entry of entries.values())entry.api?.dispose();
      entries.clear();cache.clear();inflight.clear();
    }};
  }
  G.SleipnirSelectionAppearance=Object.freeze({mount,watch});
})(window);
