/* A transparent, exact-target player, also shared by native WebView hosts. */
(() => {
  'use strict';
  const mounts=new WeakMap();
  function mount(host,input) {
    const old=mounts.get(host);old?.dispose();
    const target=window.PortableLayerStore.target(input);
    const stamp=window.PortableLayerStore.stamp(target);
    const holder=document.createElement('div'), plane=document.createElement('div');
    holder.style.cssText='position:absolute;inset:0;overflow:hidden;pointer-events:none';
    plane.style.cssText='position:absolute;inset:0;pointer-events:none';
    host.append(holder);holder.append(plane);
    const doc={_studioLayers:[]};let alive=true,seq=0;
    const engine=window.StudioPageTools.mount({stage:holder,canvas:plane,getState:()=>({page:stamp,S:doc,sec:''}),readOnly:true,
      onAction:action=>{if (typeof input.onAction==='function') input.onAction(action);
        else window.dispatchEvent(new CustomEvent('studio:portable-action',{detail:{target,action}}));}});
    const appearance=window.SleipnirSelectionAppearance?.watch(holder,target);
    async function refresh() {
      const turn=++seq; const row=await window.PortableLayerStore.read(target);
      if(alive && turn===seq){doc._studioLayers=row.layers;engine.sync();await appearance?.refresh();}
      return row;
    }
    function notification(detail) {
      if(detail?.target && window.PortableLayerStore.stamp(detail.target)===stamp) refresh().catch(()=>{});
    }
    const changed=e=>notification(e.detail), channel=window.BroadcastChannel?new BroadcastChannel('studio:portable-layers'):null;
    channel?.addEventListener('message',e=>notification(e.data));window.addEventListener('studio:portable-published',changed);
    const api={ready:refresh(),refresh,dispose(){alive=false;appearance?.dispose();engine.dispose?.();holder.remove();channel?.close();window.removeEventListener('studio:portable-published',changed);mounts.delete(host);}};
    mounts.set(host,api);return api;
  }
  window.PortableLayerSurface={mount};
})();
