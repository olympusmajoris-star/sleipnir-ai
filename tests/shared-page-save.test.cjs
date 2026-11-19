const test=require('node:test'),assert=require('node:assert/strict');
const {create}=require('../studio-save-guard.js');
test('opening a page and saving unchanged settings never rewrites shared data',async()=>{
 let calls=0;const save=create({request:async()=>{calls++;}});save.loaded('page_convo','v1',{fx:{a:1}});assert.deepEqual(await save.save('page_convo','convo',{fx:{a:1}}),{unchanged:true});assert.equal(calls,0);
});
test('rapid saves serialize and use the returned version for the next conditional update',async()=>{
 const calls=[];let version=1;const save=create({request:async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});await new Promise(r=>setTimeout(r,5));return [{updated_at:'v'+(++version)}];}});
 save.loaded('page_convo','v1',{value:0});await Promise.all([save.save('page_convo','convo',{value:1}),save.save('page_convo','convo',{value:2})]);
 assert.equal(new URL('https://test'+calls[0].url).searchParams.get('updated_at'),'eq.v1');assert.equal(new URL('https://test'+calls[1].url).searchParams.get('updated_at'),'eq.v2');assert.equal(calls[1].body.data.value,2);
});
test('a stale version never retries as an upsert and retains the local edit',async()=>{
 const methods=[],local=[];const save=create({request:async(url,options)=>{methods.push(options.method);return [];},writeLocal:(id,json)=>local.push(JSON.parse(json))});save.loaded('page_convo','old',{value:0});
 await assert.rejects(save.save('page_convo','convo',{value:7}),/newer settings/);assert.deepEqual(methods,['PATCH']);assert.equal(local[0].value,7);
});
test('unloaded documents cannot overwrite shared state; new documents use insert without upsert',async()=>{
 let request;const save=create({request:async(url,options)=>{request={url,options};return [{updated_at:'v1'}];}});
 await assert.rejects(save.save('unknown','convo',{}),/could not be loaded/);assert.equal(request,undefined);save.loaded('new',null,{});await save.save('new','convo',{value:1});assert.equal(request.options.method,'POST');assert.ok(!request.url.includes('on_conflict'));assert.equal(JSON.parse(request.options.body).id,'new');
});
