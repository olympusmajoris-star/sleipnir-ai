const test = require('node:test');
const assert = require('node:assert/strict');
const { prepare, load } = require('../studio-store-catalog.js');
const scope = require('../store-scope.json');

test('the agreed store list retains all 122 distinct store records', () => {
  assert.equal(scope.stores.length, 122);
  assert.equal(new Set(scope.stores.map(s=>s.id)).size, 122);
  assert.equal(scope.stores.filter(s=>/Mezzaluna/.test(s.name)).length, 3);
});
test('missing images do not make a stocked store empty, and new stocked stores stay separate', () => {
  const rows=prepare([
    {id:'approved',product_count:900,image_count:0},
    {id:'blank',product_count:0,image_count:0},
    {id:'new',product_count:10,image_count:10},
  ],{stores:[{id:'approved'}]});
  assert.deepEqual(rows.map(s=>s.folder),['working','empty','other']);
});
test('unknown inventory is an error, never a false empty-store classification', () => {
  assert.throws(()=>prepare([{id:'unknown'}],{stores:[]}),/verified/);
});
test('loads beyond the first page so none of the 535 stores disappear', async () => {
  const calls=[];
  const rows=await load({baseUrl:'https://example.test',headers:{apikey:'test'},fetcher:async url=>{
    calls.push(url);
    if(url==='store-scope.json')return {ok:true,json:async()=>({stores:[{id:'store-534'}]})};
    const offset=Number(new URL(url).searchParams.get('offset'));
    return {ok:true,json:async()=>Array.from({length:offset===0?500:35},(_,i)=>({id:'store-'+(offset+i),product_count:1,image_count:0}))};
  }});
  assert.equal(rows.length,535);
  assert.equal(rows[534].folder,'working');
  assert.equal(calls.length,3);
});
test('failed fetches remain retryable errors rather than a fabricated empty catalog', async () => {
  await assert.rejects(load({baseUrl:'https://example.test',headers:{},fetcher:async url=>url==='store-scope.json'?{ok:true,json:async()=>({stores:[]})}:{ok:false}}),/current store inventory/);
});
