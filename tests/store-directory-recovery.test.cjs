const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

test('repeated catalog query timeouts preserve the wired store list and bound concurrent reads',async()=>{
  const ids=Array.from({length:122},(_,i)=>'00000000-0000-4000-8000-'+String(i).padStart(12,'0'));
  const returned=new Set();
  let active=0,peak=0,largest=0;
  const fetch=async url=>{
    if(url==='store-scope.json')return {ok:true,json:async()=>({stores:ids.map(id=>({id}))})};
    const batch=new URL(url).searchParams.get('p_store_ids').slice(1,-1).split(',');
    largest=Math.max(largest,batch.length);
    active++;
    peak=Math.max(peak,active);
    await new Promise(resolve=>setImmediate(resolve));
    active--;
    if(batch.length>4)return {ok:false,status:500,json:async()=>({code:'57014'})};
    const rows=batch.map(id=>{
      assert.ok(!returned.has(id));
      returned.add(id);
      return {id,is_live:true,address:'123 Test Street, Palm Coast, FL',menu_type:'retail',app_surface:'ordinary',product_count:1};
    });
    return {ok:true,json:async()=>rows};
  };
  const context={window:{fetch,StudioTransferConfig:{url:'https://example.test',key:'test'}},URL,URLSearchParams};
  vm.runInNewContext(readFileSync(path.join(__dirname,'../workspace-core.js'),'utf8'),context);
  const stores=await context.window.StudioWorkspaceCore.loadAppStores();
  assert.deepEqual(Array.from(stores,s=>s.id),ids);
  assert.ok(largest>16 && largest<=32);
  assert.equal(peak,4);
});
