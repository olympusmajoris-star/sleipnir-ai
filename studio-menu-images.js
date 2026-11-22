/* Private dish and menu artwork, promoted only when an owner explicitly publishes the saved revision. */
(function(G){
'use strict';
const draftBucket='studio-menu-drafts',publishedBucket='studio-menu-published';
const uuid=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
const mime={png:'image/png',jpg:'image/jpeg',webp:'image/webp',avif:'image/avif'};
const conf=()=>G.StudioTransferConfig,client=()=>G.StudioJobs;
function pathFor(store,product,hash,ext){
 if(!uuid.test(store)||(product!=null&&!uuid.test(product))||!Object.hasOwn(mime,ext)||!/^[a-f0-9]{64}$/.test(hash))throw Error('Invalid store, product or image identity.');
 return store+(product?'/product/'+product:'/menu')+'/'+hash+'.'+ext;
}
function reference(url){
 const prefix=conf().url+'/storage/v1/object/public/'+publishedBucket+'/';
 if(typeof url!=='string'||!url.startsWith(prefix))throw Error('Use an image uploaded for this menu.');
 const path=url.slice(prefix.length),parts=path.split('/'),product=parts[1]==='product'?parts[2]:null;
 const match=/^([a-f0-9]{64})\.(png|jpg|webp|avif)$/.exec(parts.at(-1));
 if(!match||pathFor(parts[0],product,match[1],match[2])!==path)throw Error('Invalid menu image URL.');
 return {path,store:parts[0],product,hash:match[1],ext:match[2]};
}
function format(bytes){
 const ascii=(start,end)=>String.fromCharCode(...bytes.subarray(start,end));
 if(bytes.length>=8&&[137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n))return 'png';
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'jpg';
 if(ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP')return 'webp';
 if(ascii(4,8)==='ftyp'&&/avif|avis/.test(ascii(8,32)))return 'avif';
 throw Error('Choose a PNG, JPEG, WebP or AVIF image.');
}
async function digest(bytes){return [...new Uint8Array(await G.crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function owner(){
 if(!await client().request('/rest/v1/rpc/studio_grocery_editor_access',{method:'POST',body:{}}))throw Error('Publisher access is required to edit menu artwork.');
 const s=client().current();
 if(!s?.access_token)throw Error('Connect your publisher account.');
 return {apikey:conf().key,Authorization:'Bearer '+s.access_token};
}
async function uploadBytes(bucket,path,bytes,ext,headers){
 const r=await G.fetch(conf().url+'/storage/v1/object/'+bucket+'/'+path,{method:'POST',headers:{...headers,'Content-Type':mime[ext],'x-upsert':'false'},body:bytes});
 if(r.ok)return;
 const error=await r.json().catch(()=>({}));
 if([400,409].includes(r.status)&&/duplicate|already exists/i.test(String(error.error||'')+' '+String(error.message||'')))return;
 throw Error(error.message||'Menu artwork could not be saved.');
}
async function signed(path){
 const value=await client().request('/storage/v1/object/sign/'+draftBucket+'/'+path,{method:'POST',body:{expiresIn:900}});
 if(!value?.signedURL)throw Error('Private menu artwork could not be loaded.');
 const url=new URL(value.signedURL,conf().url+'/storage/v1/');
 // Storage returns a service-relative /object/sign path.
 return url.pathname.startsWith('/object/sign/')?conf().url+'/storage/v1'+url.pathname+url.search:url.href;
}
async function checkedBytes(url,expected){
 const r=await G.fetch(url,{cache:'no-store'});
 if(!r.ok)throw Error('The stored menu image is unavailable.');
 const data=await r.arrayBuffer();
 if(await digest(data)!==expected.hash||format(new Uint8Array(data))!==expected.ext)throw Error('The stored image did not match the selected file.');
 return data;
}
async function upload(store,product,file){
 if(!file||typeof file.arrayBuffer!=='function')throw Error('Choose an image file.');
 const bytes=await file.arrayBuffer(),ext=format(new Uint8Array(bytes)),hash=await digest(bytes),path=pathFor(store,product,hash,ext);
 const blob=new Blob([bytes],{type:mime[ext]});
 if(G.createImageBitmap){
  let bitmap;try{bitmap=await G.createImageBitmap(blob);if(!bitmap.width||!bitmap.height)throw Error();}catch{throw Error('The file could not be decoded as a menu image.');}finally{bitmap?.close();}
 }else{
  const local=URL.createObjectURL(blob);try{
   const image=new Image();image.src=local;await image.decode();
   if(!image.naturalWidth||!image.naturalHeight)throw Error();
  }catch{throw Error('The file could not be decoded as a menu image.');}finally{URL.revokeObjectURL(local);}
 }
 const headers=await owner();await uploadBytes(draftBucket,path,blob,ext,headers);
 const previewUrl=await signed(path);await checkedBytes(previewUrl,{hash,ext});
 return {url:conf().url+'/storage/v1/object/public/'+publishedBucket+'/'+path,preview_url:previewUrl,sha256:hash};
}
async function preview(url){
 const ref=reference(url);
 const r=await G.fetch(url,{method:'HEAD',cache:'no-store'});
 return r.ok?url:await signed(ref.path);
}
async function publish(params){
 const expected=params.p_expected_revision;
 const {p_store_id,p_target_kind,p_target_key}=params;
 const identity={p_store_id,p_target_kind,p_target_key};
 const saved=await client().request('/rest/v1/rpc/studio_menu_design_draft',{method:'POST',body:identity});
 if(!saved||saved.revision!==expected)throw Error('A newer menu revision exists. Reload the draft.');
 for(const url of new Set([saved.settings.photo_url,saved.settings.background_url].filter(Boolean))){
  const ref=reference(url);
  if(ref.store!==p_store_id||ref.product!==(p_target_kind==='product'?p_target_key:null))throw Error('This image belongs to another menu component.');
  const publicCheck=await G.fetch(url,{method:'HEAD',cache:'no-store'});
  if(!publicCheck.ok){
   const bytes=await checkedBytes(await signed(ref.path),ref);
   await uploadBytes(publishedBucket,ref.path,bytes,ref.ext,await owner());
  }
  await checkedBytes(url,ref);
 }
 const applied=await client().request('/rest/v1/rpc/studio_menu_design_publish',{method:'POST',body:{...identity,p_expected_revision:expected}});
 const query=new URLSearchParams({p_store_id,target_kind:'eq.'+p_target_kind,target_key:'eq.'+p_target_key});
 const published=await client().request('/rest/v1/rpc/studio_menu_designs?'+query,{auth:false});
 if(!published.some(row=>row.store_id===p_store_id&&row.target_kind===p_target_kind&&row.target_key===p_target_key&&row.published_revision===applied.published_revision))
  throw Error('The menu design was submitted. Its public revision could not be verified.');
 return applied;
}
const api=Object.freeze({upload,preview,publish});
if(typeof module!=='undefined'&&module.exports)module.exports={...api,reference,pathFor,format};
G.StudioMenuImages=api;
})(typeof window==='undefined'?globalThis:window);
