/* Mount a published whole-page composition over the same bounds as the Studio phone. */
(() => {
  'use strict';
  const params = new URLSearchParams(location.search);
  if (params.has('transition-frame') || params.has('sky-editor-frame')) return;
  const kit = window.StudioKit;
  const sceneForAction = {home:'home',shome:'home',raven:'sky',convo:'conversation',heimdall:'horn'};
  let stage, wrap, surface, player, page = '';
  function bounds() {
    if (!surface) return;
    const css = getComputedStyle(stage);
    Object.assign(surface.style,{left:stage.offsetLeft+'px',top:stage.offsetTop+'px',
      width:css.width,height:css.height,borderRadius:css.borderRadius});
  }
  function perform(action, target) {
    if (page !== target.page) return;
    const event = new CustomEvent('studio:portable-action',{cancelable:true,detail:{target,action}});
    if (!window.dispatchEvent(event)) return;
    const next = action.type === 'navigate' ? sceneForAction[action.target] : null;
    if (next && kit.screens[next]) { kit.go(next); return; }
    const destination = action.type === 'product' ? 'Product details' : action.type === 'contact' ? 'Contact' : action.target;
    kit.status('This layer is configured for ' + destination + '. That action needs a connected app preview.');
  }
  function clear() {
    player?.dispose(); player = null; page = '';
    if (surface) { surface.remove(); surface = null; }
  }
  function mount() {
    const id = kit.cur?.id;
    if (!id || !kit.cur.loaded) return;
    const next = kit.transitionRoute(id);
    if (next === page && player) return;
    clear(); page = next;
    surface = document.createElement('div'); surface.id = 'studio-published-layers';
    surface.style.cssText = 'position:absolute;pointer-events:none;overflow:hidden;z-index:1;';
    wrap.append(surface); bounds();
    // These native scenes expose a page viewport. A selected Studio inspector
    // part is not a published overlay anchor and must not widen a scoped layer.
    const target = {page:next,store:'',aisle:'',part:'',layer:''};
    const node = surface;
    player = window.PortableLayerSurface.mount(node,{...target,onAction:a=>perform(a,target)});
    player.ready.then(row => { node.dataset.status = row.layers.length ? 'visible' : 'empty'; })
      .catch(() => { node.dataset.status = 'unavailable'; });
  }
  async function start() {
    await kit.ready;
    stage = document.getElementById('stage'); wrap = document.getElementById('stageWrap');
    if (!stage || !wrap || !window.PortableLayerSurface) return;
    const resize = new ResizeObserver(bounds); resize.observe(stage); resize.observe(wrap);
    addEventListener('studio:page-leaving',clear);
    addEventListener('studio:page-shown',mount);
    addEventListener('pageshow',e=>{ if(e.persisted)mount(); });
    addEventListener('pagehide',e=>{ clear(); if(!e.persisted)resize.disconnect(); });
    mount();
  }
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();
