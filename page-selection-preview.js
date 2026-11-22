/* Selection previews keep native coordinates and authored source identities. */
(() => {
  'use strict';
  const ids = ['store','aisle','part','layer'];
  function target(options) {
    const input = options.target || options;
    const result = {page:input.page || options.to || ''};
    for (const key of ids) if (input[key]) result[key] = String(input[key]);
    return result;
  }
  function bounds(value) {
    try {
      const r = typeof value === 'string' ? JSON.parse(value) : value;
      if (r && ['x','y','width','height'].every(k=>Number.isFinite(r[k])) && r.x>=0 && r.y>=0 &&
          r.width>0 && r.height>0 && r.x+r.width<=1.000001 && r.y+r.height<=1.000001) return r;
    } catch {}
    return null;
  }
  const same = (a,b) => ['page',...ids].every(key=>(a?.[key]||'') === (b?.[key]||''));
  function draftKey(t) { return 'sleipnir.selection-appearance.'+JSON.stringify(['page',...ids].map(k=>t[k]||'')); }
  function draft(t) { try { return JSON.parse(localStorage.getItem(draftKey(t))); } catch {return null;} }
  function stash(t, settings, revision) { localStorage.setItem(draftKey(t),JSON.stringify({settings,revision:draft(t)?.revision ?? revision})); }
  function clear(t) { localStorage.removeItem(draftKey(t)); }
  function rectangle(node,r) {
    Object.assign(node.style,{position:'absolute',left:r.x*100+'%',top:r.y*100+'%',width:r.width*100+'%',height:r.height*100+'%'});
  }
  async function load({target:t, bounds:r, scene, stage, canvas, current, label}) {
    if (!ids.some(k=>t[k])) return {message:'Choose a store, aisle, part or layer to preview its appearance.'};
    let layer, samePage = !t.store && !t.aisle && !t.part;
    if (t.layer) {
      // A layer's authored geometry belongs to its exact containing composition.
      const data = await window.PortableLayerStore.read({...t,layer:''});
      layer = data.layers.find(l=>l.id === t.layer && l.show !== false);
    }
    if (!current()) return {};
    // A store or SKU with no independent image/geometry cannot be represented
    // by painting a whole page. The exact selection is still editable and savable.
    if (!layer && !r) return {message:'This selection has no independent preview or verified bounds. You can save its appearance here.'};
    let planes;
    if (scene && (r || samePage)) planes = await scene();
    if (!current()) return {};
    if (!layer && (!planes?.separated || !r)) return {message:'The selected region has no separate foreground in this Studio scene.'};
    const w = planes?.full.width || 390, h = planes?.full.height || 844;
    canvas.width=w; canvas.height=h; const ctx=canvas.getContext('2d'); ctx.clearRect(0,0,w,h);
    if (planes) ctx.drawImage(planes.full,0,0);
    stage.parentElement.style.setProperty('--pt-aspect',String(w/h));
    const host = document.createElement('div'); host.className='pt-selection-preview'; stage.append(host);
    let node, sceneTools;
    if (layer) {
      const plane = document.createElement('div'); plane.className='pt-selection-guide';host.append(plane);
      sceneTools=window.StudioPageTools.mount({stage:host,canvas:plane,readOnly:true,onAction:()=>{},
        getState:()=>({page:t.page,S:{_studioLayers:[layer]},sec:''})});
      sceneTools.sync();
      node=host.querySelector('.spt-layer');
    } else {
      node=document.createElement('div'); node.className='pt-selection-region'; rectangle(node,r); host.append(node);
      const ink=document.createElement('div'); ink.className='spt-motion'; node.append(ink);
      const crop=document.createElement('canvas');crop.width=Math.max(1,Math.round(r.width*w));crop.height=Math.max(1,Math.round(r.height*h));
      const sx=r.x*w,sy=r.y*h,sw=r.width*w,sh=r.height*h;
      // The original phone stays intact outside the verified rectangle.
      ctx.drawImage(planes.base,sx,sy,sw,sh,sx,sy,sw,sh);
      crop.getContext('2d').drawImage(planes.layer,sx,sy,sw,sh,0,0,crop.width,crop.height);
      ink.append(crop);
    }
    if (!node) {sceneTools?.dispose();host.remove();return {message:'The published layer could not be drawn.'};}
    let run;
    return {node, label:layer ? (planes ? 'Published layer on ' : 'Isolated published layer · ') + (planes ? t.page : layer.name || label) : 'Verified region · '+label,
      bind(settings) {
        if (run) run.update(settings);
        else run=window.SleipnirSelectionAppearance.mount(node,{target:t,settings,preview:true,autoplay:false,clock:()=>({
          camera:window.StudioKit.transitionCamera.source(),mirror:window.StudioKit.transitionCamera.mirrored()
        })});
      },
      seek(progress,elapsed){run?.seek(progress,elapsed);}, replay(){run?.replay();}, dispose(){run?.dispose();sceneTools?.dispose();host.remove();}};
  }
  window.SleipnirSelectionPreview={target,bounds,same,draft,stash,clear,load};
})();
