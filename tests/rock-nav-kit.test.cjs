const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const A=require('../rock-nav.js');
const source=fs.readFileSync(require.resolve('../rock-nav-kit-1120.js'),'utf8');
const clone=o=>JSON.parse(JSON.stringify(o));
async function fixture(saved=A.defaults()){
 let row={id:'navigation',data:clone(saved),updated_at:'2026-11-20T00:00:00Z'};
 const writes=[],timers=[],actions=[];
 const K={W:390,H:844,screens:{},order:[],viewOnly:false,status(){},openSection(){},
  screen(sc){sc.SPEC=[];sc.DEF={};sc.P={};sc.hist=[];sc.ui={group:'Rock row',section:'Show & place'};
   sc.spec?.((group,section,target,k,label,type,d)=>{sc.SPEC.push({group,section,target,k,label,type,def:d});sc.P[k]=sc.DEF[k]=d;});
   this.screens[sc.id]=sc;this.order.push(sc.id);return sc;},
  async show(id){this.cur=this.screens[id];this.cur.loaded=true;this.cur.onShow?.();},
  setVal(k,v){this.cur.P[k]=v;this.cur.onSet(k,v);}
 };
 const scope={window:{StudioKit:K,AsgardRockNav:{...A,RockTexture:class{constructor(){this.ready=true;}draw(){}}}},Image:class{},console,
  setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout(){},localStorage:{getItem(){return null},setItem(){}},
  fetch:async(url,opt={})=>{if(opt.method){const body=JSON.parse(opt.body);writes.push(body);row={...row,...body};return {ok:true,json:async()=>[row]};}return {ok:true,json:async()=>[clone(row)]};}
 };
 vm.runInNewContext(source,scope);
 for(const id of ['home','sky','horn','way','dial','directory','conversation'])K.screen({id,spec(d){d('Bottom icons','Layout','bar','bar.on','Old bar','bool',true);},rockNavigate:target=>actions.push(target)});
 await new Promise(resolve=>setImmediate(resolve));await K.show('sky');
 return {K,writes,actions,timers,row:()=>row,concurrent(fn){fn(row.data);}};
}
test('all Asgard pages have five rocks, Raven last; shopping home stays separate',async()=>{
 const {K,writes}=await fixture();
 for(const id of K.order.filter(x=>x!=='home')){
  const sc=K.screens[id];assert.equal(K.rockNav.positions(sc).length,5);assert.equal(K.rockNav.positions(sc).at(-1).id,'messages');
  assert.equal(sc.SPEC.some(s=>s.group==='Bottom icons'),false);
  assert.equal(sc.SPEC.filter(s=>s.k.startsWith('nav:debris.')).length,13);
  for(const rock of A.IDS)for(const group of ['size','x','y','rotation','lean','drift','driftSpeed','turn','rune.width','rune.depth','rune.follow','rune.roughness','rune.intensity','rune.color','rune.pulseSpeed','cracks.recolor'])assert.ok(sc.SPEC.some(s=>s.k===`nav:rocks.${rock}.${group}`),`${id}/${rock}/${group}`);
 }
 assert.equal(K.rockNav.has(K.screens.home),false);assert.equal(writes.length,0);
 const future=K.screen({id:'future-asgard'});assert.equal(K.rockNav.positions(future).length,5);
});
test('saved gap, all small-rock settings and named looks survive loading; row fits phones',async()=>{
 const data=A.defaults();data.layout.gap=31;data.debris={...data.debris,max:26,count:34,spin:.69,orbit:4,orbitRadius:51};data.variants=[{id:'one',name:'ROCK RUINS 1',data:A.defaults()}];
 const {K}=await fixture(data);assert.deepEqual(clone(K.rockNav.NAV.S.debris),data.debris);assert.deepEqual(clone(K.rockNav.NAV.S.variants),data.variants);
 assert.equal(K.rockNav.NAV.S.layout.gap,31);assert.equal(K.screens.sky.SPEC.find(s=>s.k==='navlook').opts[1][1],'ROCK RUINS 1');
 for(const width of [320,360,390,412]){K.W=width;for(const p of K.rockNav.positions(K.cur)){assert.ok(p.x-p.size*.5>=0);assert.ok(p.x+p.size*.5<=width);}}
 assert.equal(K.rockNav.NAV.S.rocks.messages.rune.symbol,'raven');
});
test('all five taps reach actual destinations, including marketplace and share action',async()=>{
 const {K,actions}=await fixture();
 for(const [id,want] of [['swap','sky'],['track','way'],['share','sky'],['messages','dial'],['home','sky']]){
  assert.equal(await K.rockNav.navigate(K.cur,id),true);assert.equal(K.cur.id,want);
 }
 assert.deepEqual(actions,['market','share-post','sky']);
 K.cur.onSet('nav:routes.home','horn');await K.rockNav.navigate(K.cur,'home');assert.equal(K.cur.id,'horn');
});
test('drag across rocks does not activate another destination; real tap does',async()=>{
 const {K}=await fixture();const sc=K.cur,p=K.rockNav.positions(sc),a=p[0],b=p[4],e={pointerId:1};
 sc.pointer.down(a,e);sc.pointer.move(b,e);sc.pointer.up(b,e);assert.equal(K.cur.id,'sky');
 sc.pointer.down(b,e);sc.pointer.up(b,e);await new Promise(resolve=>setImmediate(resolve));assert.equal(K.cur.id,'dial');
});
test('save applies only edited fields and preserves a concurrent edit and saved looks',async()=>{
 const {K,writes,timers,concurrent,row}=await fixture();
 K.cur.onSet('nav:debris.speed',22);
 concurrent(d=>{d.rocks.home.brightness=1.8;d.variants=[{id:'other',name:'Other editor',data:{}}];});
 for(const fn of timers.splice(0))await fn();
 assert.equal(writes.length,1);assert.equal(row().data.debris.speed,22);assert.equal(row().data.rocks.home.brightness,1.8);assert.equal(row().data.variants[0].id,'other');
});
test('Raven curves stay finite and independent of the original rune',()=>{
 assert.ok(A.RAVEN_PATHS.length>30);assert.ok(A.RAVEN_PATHS.every(p=>p.length===4&&p.every(Number.isFinite)));
 assert.equal(A.PATHS.messages.length,3);
});
