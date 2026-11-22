/* A selection's appearance is keyed to its original, fully qualified identity. */
(function (root) {
  'use strict';
  function target(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('Choose a selection in Studio.');
    const {page,...fields}=input;
    const sky=root.SleipnirPageSky;
    const where=sky.scope(fields);
    if (!Object.keys(where).length) throw Error('Choose an individual store, aisle, part, or layer.');
    return {page:sky.pageId(page),...where};
  }
  function revision(value) {
    if (!Number.isSafeInteger(value) || value<0) throw Error('Reload the selected appearance revision.');
    return value;
  }
  async function request(name, input, body, auth) {
    const {page,...scope}=target(input);
    const params={p_page:page,p_target:scope,...body};
    if (auth && !root.StudioJobs?.request) throw Error('Connect the Studio owner before saving an appearance.');
    const result=auth
      ? await root.StudioJobs.request('/rest/v1/rpc/'+name,{method:'POST',body:params,auth:true})
      : await root.SleipnirPageSky.publicRPC(name,params);
    const returned=target({...result.target,page:result.page});
    if (returned.page!==page || JSON.stringify(returned)!==JSON.stringify({page,...scope})) throw Error('The appearance belongs to another selection.');
    return {target:returned,settings:root.SleipnirTransitionStore.checked(result.settings),revision:revision(result.revision)};
  }
  const read = input => request('studio_target_effects',input,{},false);
  async function save(input,settings,expectedRevision) {
    const result=await request('studio_save_target_effects',input,{
      p_settings:settings===null?null:root.SleipnirTransitionStore.checked(settings),
      p_expected_revision:revision(expectedRevision)
    },true);
    const name='sleipnir:target-effects-saved';
    root.dispatchEvent(new CustomEvent(name,{detail:result}));
    if (typeof root.BroadcastChannel==='function') {
      try {
        const channel=new root.BroadcastChannel(name);
        try {channel.postMessage(result);} finally {channel.close();}
      } catch { /* Same-frame listeners still receive the saved selection. */ }
    }
    return result;
  }
  root.SleipnirTargetEffects=Object.freeze({read,save});
})(window);
