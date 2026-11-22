const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {readFileSync}=require('node:fs'),{webcrypto}=require('node:crypto');
const store='3eb517cb-1328-4e94-a73e-68ed48398c7d',sku='aaaaaaaa-0000-4000-8000-000000000001';
const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAJUb5VAAAAAASUVORK5CYII=','base64');
const base='https://example.supabase.co',publicBucket='studio-menu-published';
function fixture(){
 const state={objects:new Map(),draft:null,published:null,wrongRead:false,owner:true};
 const browser={URL,URLSearchParams,Blob,Uint8Array,crypto:webcrypto,StudioTransferConfig:{url:base,key:'public'},createImageBitmap:async()=>({width:1,height:1,close(){}})};
 browser.StudioJobs={current:()=>({access_token:'owner'}),request:async(path,opts)=>{
  if(path.endsWith('studio_grocery_editor_access'))return state.owner;
  if(path.startsWith('/storage/v1/object/sign/'))return {signedURL:path.slice('/storage/v1'.length)+'?token=limited'};
  if(path.endsWith('/studio_menu_design_draft'))return state.draft;
  if(path.endsWith('/studio_menu_design_publish')){const body=opts.body;state.published={store_id:body.p_store_id,target_kind:body.p_target_kind,target_key:body.p_target_key,published_revision:2};return state.published;}
  if(path.startsWith('/rest/v1/rpc/studio_menu_designs?'))return [state.published];
  throw Error('Unrecognized request');
 }};
 browser.fetch=async(url,opts={})=>{
  const parsed=new URL(url),key=parsed.pathname.replace(/^\/storage\/v1\/object\/(?:sign\/|public\/)?/,'');
  if(opts.method==='POST'){
   assert.equal(opts.headers['x-upsert'],'false');assert.equal(opts.headers.Authorization,'Bearer owner');
   if(state.objects.has(key))return new Response(JSON.stringify({message:'The resource already exists'}),{status:409});
   state.objects.set(key,opts.body instanceof Blob?new Uint8Array(await opts.body.arrayBuffer()):new Uint8Array(opts.body));
   return new Response('{}');
  }
  const value=state.objects.get(key);
  if(!value)return new Response('{}',{status:404});
  if(opts.method==='HEAD')return new Response(null);
  return new Response(state.wrongRead?value.slice(0,12):value);
 };
 vm.runInNewContext(readFileSync(require.resolve('../studio-menu-images.js'),'utf8'),browser);
 return {api:browser.StudioMenuImages,state};
}
test('private upload, signed preview, SHA verification, stale-revision rejection and explicit publication',async()=>{
 const {api,state}=fixture(),blob=new Blob([image],{type:'image/png'});
 const file=await api.upload(store,sku,blob);
 assert.equal(file.sha256.length,64);assert.ok(file.url.includes('/'+publicBucket+'/'+store+'/product/'+sku+'/'));
 assert.ok(file.preview_url.includes('/object/sign/studio-menu-drafts/'));assert.equal(state.objects.size,1);
 assert.equal(await api.preview(file.url),file.preview_url);
 await api.upload(store,sku,blob);assert.equal(state.objects.size,1);
 state.draft={revision:1,settings:{mode:'custom',photo_url:file.url}};
 const fields={p_store_id:store,p_target_kind:'product',p_target_key:sku,p_expected_revision:0};
 await assert.rejects(api.publish(fields),/newer/);assert.equal(state.objects.size,1);
 fields.p_expected_revision=1;
 assert.equal((await api.publish(fields)).published_revision,2);assert.equal(state.objects.size,2);
 assert.equal(await api.preview(file.url),file.url);
});
test('corrupt storage bytes, unsupported file, cross-SKU promotion and unauthorized owner are rejected',async()=>{
 const {api,state}=fixture(),blob=new Blob([image]); state.wrongRead=true;
 await assert.rejects(api.upload(store,sku,blob),/did not match/);
 await assert.rejects(api.upload(store,sku,new Blob(['<svg/>'])),/PNG/);
 state.wrongRead=false;state.owner=false;await assert.rejects(api.upload(store,sku,blob),/Publisher/);
 state.owner=true;
 const art=await api.upload(store,null,blob);
 state.draft={revision:1,settings:{mode:'custom',photo_url:art.url}};
 await assert.rejects(api.publish({p_store_id:store,p_target_kind:'product',p_target_key:sku,p_expected_revision:1}),/another menu component/);
 assert.equal(state.published,null);
});
