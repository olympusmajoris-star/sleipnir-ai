const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {runInNewContext}=require('node:vm');
const test=require('node:test');
const context={page:'GroceryAisle',store:'12345678-1abc-42ab-bcba-123456789abc',aisle:'Dairy & Eggs',part:'sku'};
function setup() {
  const calls=[],events=[];
  let wrong=false;
  const w={dispatchEvent:e=>events.push(e.detail),BroadcastChannel:class{postMessage(d){events.push(d);}close(){}},
    StudioJobs:{async request(path,args){
      calls.push({path,...args});
      return {page:args.body.p_page,target:wrong?{layer:'different'}:args.body.p_target,settings:args.body.p_settings||w.SleipnirTransitionStore.defaults,revision:1};
    }}};
  const env={window:w,CustomEvent:class{constructor(name,opts){this.detail=opts.detail;}},TextEncoder};
  for(const file of ['page-sky-store.js','page-transition-store.js','page-target-effects.js']) runInNewContext(readFileSync(join(__dirname,'..',file),'utf8'),env);
  return {w,calls,events,mismatch:()=>{wrong=true;}};
}
test('scoped save, notifications and clear retain the full original selection',async()=>{
 const {w,calls,events}=setup(), s=w.SleipnirTargetEffects, config={...w.SleipnirTransitionStore.defaults,effect:'mesh'};
 assert.equal((await s.read(context)).settings.effect,'off');
 assert.equal(calls[0].auth,false);
 const saved=await s.save(context,config,0);
 assert.equal(saved.target.part,'sku');assert.equal(calls[1].auth,true);assert.equal(calls[1].body.p_target.aisle,'Dairy & Eggs');
 assert.equal(calls[1].body.p_expected_revision,0);assert.equal(events.length,2);
 await s.save(context,null,1);assert.equal(calls[2].body.p_settings,null);
});
test('refuses page-wide, ambiguous and mismatched effects',async()=>{
 const {w,calls,mismatch}=setup(),s=w.SleipnirTargetEffects;
 await assert.rejects(s.read({page:'HomePage'}),/individual/);
 await assert.rejects(s.read({page:'GroceryAisle',aisle:'Milk'}),/wired store/);
 await assert.rejects(s.save(context,{...w.SleipnirTransitionStore.defaults,effect:'unknown'},0),/Invalid/);
 assert.equal(calls.length,0);
 mismatch();await assert.rejects(s.read(context),/another selection/);
});
test('native embedded reader sends only public credentials and offers no write fallback',async()=>{
  const {w}=setup(), calls=[];delete w.StudioJobs;
  w.StudioTransferConfig={url:'https://example.test',key:'public-key'};
  w.fetch=async(url,opts)=>{
    calls.push({url,opts});const params=JSON.parse(opts.body);
    return {ok:true,json:async()=>({page:params.p_page,target:params.p_target,revision:0,settings:w.SleipnirTransitionStore.defaults})};
  };
  assert.equal((await w.SleipnirTargetEffects.read(context)).settings.effect,'off');
  assert.equal(calls[0].url,'https://example.test/rest/v1/rpc/studio_target_effects');
  assert.equal(calls[0].opts.credentials,'omit');
  assert.equal(calls[0].opts.headers.apikey,'public-key');
  await assert.rejects(w.SleipnirTargetEffects.save(context,null,0),/Studio owner/);
  await assert.rejects(w.SleipnirPageSky.draft('GroceryAisle'),/Studio owner/);
  await assert.rejects(w.SleipnirPageSky.publicRPC('studio_save_target_effects',{}),/Unknown public/);
  assert.equal(calls.length,1);
});
