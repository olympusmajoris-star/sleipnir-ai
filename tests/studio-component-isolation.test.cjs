const assert=require('node:assert/strict');
const test=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
test('portable references keep source and placement data separate',()=>{
  const window={};const document={currentScript:{src:'https://studio.test/studio-component-layers.js'}};
  vm.runInNewContext(read('studio-component-layers.js'),{window,document,URL});
  const {scene,sources}=window.StudioComponentLayers;
  assert.equal(Object.keys(sources).length,7);
  const valid={version:1,screen:'home',plane:'foreground',values:{'tt.text':'<🎨>','fig.height':.7}};
  const parsed=scene(valid);assert.equal(parsed.values['tt.text'],'<🎨>');assert.notEqual(parsed.values,valid.values);
  assert.equal(scene({...valid,screen:'conversation'}).plane,'full');
  assert.equal(scene(valid).plane,'foreground');
  for(const edit of [{screen:'external'},{plane:'admin'}, {values:{text:{url:'http://example.test'}}}, {values:{n:Infinity}},
                     {values:JSON.parse('{"__proto__":"bad"}')},{values:{text:'a'.repeat(501)}}]){
    assert.throws(()=>scene({...valid,...edit}),/Invalid/);
  }
});
test('isolated source reads only its published record and pinned navigation, without source edits or device drafts',async()=>{
  const origin='https://site.test',sb='https://afnihsdxtisneuyehatw.supabase.co',calls=[];
  const location=new URL(origin+'/studio-component-surface.html?screen=home');
  const outerStorage=new Map([['studioKit1119.sleipnir_home','UNPUBLISHED']]);
  const window={localStorage:outerStorage,StudioKit:{screens:{home:{docId:'sleipnir_home'}}},fetch:async (url,o)=>{calls.push([String(url),o]);return {};}};
  vm.runInNewContext(read('studio-component-isolation.js'),{window,URL,URLSearchParams,Request,location});
  assert.equal(window.localStorage.getItem('studioKit1119.sleipnir_home'),null);
  window.localStorage.setItem('studioKit1119.sleipnir_home','instance');assert.equal(outerStorage.get('studioKit1119.sleipnir_home'),'UNPUBLISHED');
  await window.fetch(sb+'/rest/v1/studio_designs?id=eq.sleipnir_home&select=data');
  await window.fetch(sb+'/rest/v1/studio_designs?id=eq.navigation&select=data,updated_at');
  assert(calls.every(([,o])=>o.credentials==='omit'));
  for(const [url,opts] of [[sb+'/rest/v1/studio_designs?id=eq.sleipnir_home&select=data',{method:'PATCH'}],
    [sb+'/rest/v1/studio_designs?id=eq.unrelated&select=data',{}],
    [sb+'/rest/v1/private_contacts',{}],['https://external.invalid/art.js',{}]]){
    await assert.rejects(window.fetch(url,opts),/Read-only/);
  }
  assert.equal(calls.length,2);
});
