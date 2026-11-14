/* Shared programmatic access for ChatGPT and Opus; existing app authorization applies. */
(function(G){'use strict';
function create({url,publicKey,accessToken,fetch:send=globalThis.fetch,baseURL='https://olympusmajoris-star.github.io/sleipnir-ai/'}={}){
 if(!/^https:\/\/afnihsdxtisneuyehatw\.supabase\.co\/?$/.test(url||''))throw Error('Use the existing Asgard project.');url=url.replace(/\/$/,'');
 async function request(path,{owner=false,method='GET',body}={}){const token=owner?(typeof accessToken==='function'?await accessToken():accessToken):publicKey;if(!token)throw Error(owner?'Owner connection required.':'Public project key required.');const r=await send(url+path,{method,headers:{apikey:publicKey,Authorization:'Bearer '+token,'Content-Type':'application/json',...(method==='POST'?{Prefer:'return=representation'}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});if(!r.ok)throw Error('Shared studio request failed ('+r.status+').');if(r.status===204)return null;return r.json();}
 async function document(path){const r=await send(new URL(path,baseURL),{cache:'no-store'});if(!r.ok)throw Error('Studio catalog unavailable.');return r.json();}
 const query=o=>new URLSearchParams(o).toString();
 return {
  discover:()=>document('studio-tool-catalog.json'),
  mediaCatalog:()=>document('shared-media-catalog.json'),
  listDesigns:()=>request('/rest/v1/studio_designs?select=id,page,updated_by,updated_at&order=updated_at.desc'),
  getDesign:async id=>{if(typeof id!=='string'||!id)throw Error('Choose a design ID.');const rows=await request('/rest/v1/studio_designs?'+query({id:'eq.'+id,select:'*'}));return rows[0]||null;},
  listMedia:async(bucket,prefix='',offset=0)=>{const m=await document('shared-media-catalog.json');if(!m.sources.some(s=>s.id===bucket&&s.live))throw Error('Use the media catalog for this source.');if(!Number.isSafeInteger(offset)||offset<0||prefix.split('/').includes('..'))throw Error('Invalid folder page.');return request('/storage/v1/object/list/'+encodeURIComponent(bucket),{method:'POST',body:{prefix,offset,limit:100,sortBy:{column:'name',order:'asc'}}});},
  workers:()=>request('/rest/v1/studio_forge_workers?select=id,name,capabilities,heartbeat_at,version&order=heartbeat_at.desc',{owner:true}),
  jobs:()=>request('/rest/v1/studio_work_jobs?select=*&order=created_at.desc&limit=100',{owner:true}),
  queue:({kind,storeId=null,label,payload,idempotencyKey})=>{if(!['scrape','render','image_inspection','cloud_prepare'].includes(kind)||!label||!payload||typeof payload!=='object'||Array.isArray(payload)||!/^[a-f0-9-]{36}$/i.test(idempotencyKey||''))throw Error('Use a supported job, payload and stable idempotency key.');return request('/rest/v1/studio_work_jobs',{owner:true,method:'POST',body:{kind,store_id:storeId,label:String(label).slice(0,160),payload,idempotency_key:idempotencyKey}});},
  artifact:async path=>{if(typeof path!=='string'||!path.startsWith('533a05da-fed8-4c92-ba94-7e4867ebce8f/')||path.split('/').includes('..'))throw Error('Invalid private artifact path.');const r=await request('/storage/v1/object/sign/studio-job-artifacts/'+path.split('/').map(encodeURIComponent).join('/'),{owner:true,method:'POST',body:{expiresIn:600}});return url+'/storage/v1'+(r.signedURL||r.signedUrl);}
 };
}
if(typeof module!=='undefined')module.exports={create};G.SharedStudioAgent={create};
})(typeof window==='undefined'?globalThis:window);
