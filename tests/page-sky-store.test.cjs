const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const {runInNewContext} = require('node:vm');
const test = require('node:test');
const script = readFileSync(join(__dirname, '..', 'page-sky-store.js'), 'utf8');
const storeId = '12345678-1abc-42ab-bcba-123456789abc';

function setup() {
  const calls=[], notifications=[];
  let failure, wrong=false;
  const window = {
    StudioJobs:{async request(path, args) {
      calls.push({path, ...args});
      if (failure) throw failure;
      const b=args.body, settings=b.p_settings || {features:{}};
      return {page:b.p_page,target:wrong ? {layer:'wrong'} : b.p_target, revision:3, publishedRevision:1,
        settings, exactSettings:settings,sources:[]};
    }},
    dispatchEvent:e=>notifications.push(['local',e.type,e.detail]),
    BroadcastChannel:class {
      constructor(name){this.name=name;}
      postMessage(v){notifications.push(['channel',this.name,v]);}
      close(){}
    }
  };
  class CustomEvent {constructor(type,{detail}){this.type=type;this.detail=detail;}}
  runInNewContext(script,{window,CustomEvent,TextEncoder});
  return {store:window.SleipnirPageSky,calls,notifications,break:()=>{failure=Error('conflict');},mismatch:()=>{wrong=true;}};
}
test('absent targets keep the existing page RPC and private owner flags', async()=>{
  const {store,calls}=setup();
  await store.read('ValhallaV2');
  await store.draft('ValhallaV2');
  assert.equal(calls[0].auth,false);
  assert.deepEqual(Object.keys(calls[0].body),['p_page']);
  assert.equal(calls[1].auth,true);
  assert.match(calls[1].path,/studio_page_sky_draft$/);
});
test('scoped CAS uses stable containing IDs and publishes only after success', async()=>{
  const {store,calls,notifications,break:fail}=setup();
  const target={part:'sku',aisle:'Dairy & Eggs',store:storeId};
  const row=await store.save('GroceryAisle',{features:{}},3,target);
  assert.deepEqual(Object.keys(row.target),['store','aisle','part']);
  assert.equal(calls[0].body.p_expected_draft_revision,3);
  assert.equal(notifications.length,0);
  await store.publish('GroceryAisle',3,0,target);
  assert.deepEqual(notifications.map(n=>n[0]),['local','channel']);
  assert.equal(notifications[0][2].target.store,storeId);
  assert.equal(notifications[1][2].target.aisle,'Dairy & Eggs');
  fail();
  await assert.rejects(store.publish('GroceryAisle',3,0,target),/conflict/);
  assert.equal(notifications.length,2);
});
test('resolving explicitly opts into merged settings, ambiguous scopes fail locally',async()=>{
  const {store,calls,mismatch}=setup();
  const result=await store.resolve('Asgard/dial',{layer:'sky'});
  assert.match(calls[0].path,/studio_resolve_page_sky$/);
  assert.deepEqual(Object.keys(result.exactSettings.features),[]);
  await assert.rejects(store.read('ValhallaV2',{aisle:'Frozen'}),/wired store/);
  mismatch();await assert.rejects(store.read('ValhallaV2',{store:storeId}),/different page or target/);
  assert.equal(calls.length,2);
});
test('catalog selections keep authentic assets scoped to their intended feature',()=>{
  const {store}=setup(), base='https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/';
  assert.equal(store.assetURL(base+'asgard_ui/raven_v3/ic_raven.webp','raven'),true);
  assert.equal(store.assetURL(base+'black%20hole/86697_web.jpg','stars'),true);
  assert.equal(store.assetURL(base+'asgard_ui/raven_v3/ic_raven.webp','stars'),false);
  assert.equal(store.assetURL(base+'studio/my%20saved.webp','background'),true);
  for(const url of ['https://outside.test/x.png',base+'studio/%2fescape.png',base+'studio/../escape.png'])assert.equal(store.assetURL(url,'raven'),false);
  assert.equal(store.assetURL(base+'studio/streamer.png','streamers'),false);
});
