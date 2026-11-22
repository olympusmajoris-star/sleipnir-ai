/* Approved layers are scoped to exact target IDs. Unsubmitted work stays local. */
(() => {
  'use strict';
  const keys = ['page','store','aisle','part','layer'];
  function target(input) {
    const t = Object.fromEntries(keys.map(k=>[k,String(input[k] || '')]));
    if (!t.page || (t.aisle && !t.store)) throw Error('A page and the containing store for an aisle are required.');
    return t;
  }
  const stamp = t => JSON.stringify(keys.map(k=>t[k]));
  function query(t) {
    const q = new URLSearchParams({select:'revision,layers'});
    keys.forEach((k,i) => q.set(i ? k+'_id' : k, 'eq.' + t[k]));
    return q;
  }
  async function read(input) {
    const t = target(input), config = window.StudioTransferConfig;
    const r=await fetch(config.url+'/rest/v1/studio_portable_layers?'+query(t),{headers:{apikey:config.key,Authorization:'Bearer '+config.key},cache:'no-store'});
    if(!r.ok) throw Error('The published layers could not load ('+r.status+').');
    return (await r.json())[0] || {revision:0,layers:[]};
  }
  async function publish(input,layers,revision) {
    const t=target(input);
    const row=await window.StudioJobs.request('/rest/v1/rpc/studio_publish_portable_layers',{method:'POST',body:{
      p_page:t.page,p_store:t.store,p_aisle:t.aisle,p_part:t.part,p_layer:t.layer,p_expected:revision,p_layers:layers
    }});
    const detail={target:t,revision:row.revision};
    dispatchEvent(new CustomEvent('studio:portable-published',{detail}));
    if(window.BroadcastChannel){const c=new BroadcastChannel('studio:portable-layers');c.postMessage(detail);c.close();}
    return row;
  }
  window.PortableLayerStore={read,publish,target,stamp};
})();
