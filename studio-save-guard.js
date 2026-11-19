/* Serialize shared page saves and reject stale documents instead of overwriting another editor. */
(function(G){'use strict';
function create({request,writeLocal=()=>{},now=()=>new Date().toISOString()}){
 const versions=new Map(),saved=new Map(),queues=new Map();
 function loaded(id,stamp,data){versions.set(id,stamp??null);saved.set(id,JSON.stringify(data));}
 function save(id,page,data){
  const snapshot=JSON.parse(JSON.stringify(data)),json=JSON.stringify(snapshot);
  try{writeLocal(id,json);}catch{}
  const job=(queues.get(id)||Promise.resolve()).catch(()=>{}).then(async()=>{
   if(!versions.has(id))throw Error('Shared settings could not be loaded. Your edit is kept on this computer; reload when connected before saving.');
   if(saved.get(id)===json)return {unchanged:true};
   const stamp=versions.get(id),body={data:snapshot,updated_by:'studio',updated_at:now()};
   const query=stamp===null?'?select=updated_at':'?'+new URLSearchParams({id:'eq.'+id,updated_at:'eq.'+stamp,select:'updated_at'});
   const rows=await request('/rest/v1/studio_designs'+query,{method:stamp===null?'POST':'PATCH',headers:{'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify(stamp===null?{id,page,...body}:body)});
   if(!Array.isArray(rows)||rows.length!==1||!rows[0].updated_at)throw Error('Someone saved newer settings. Your edit is kept on this computer; reload the shared version before making more changes.');
   versions.set(id,rows[0].updated_at);saved.set(id,json);return {updatedAt:rows[0].updated_at};
  });
  queues.set(id,job);const clear=()=>{if(queues.get(id)===job)queues.delete(id);};job.then(clear,clear);return job;
 }
 return {loaded,save};
}
const api={create};if(typeof module!=='undefined'&&module.exports)module.exports=api;G.StudioSaveGuard=api;
})(typeof window==='undefined'?globalThis:window);
