const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function markup(file,tier,active='viewers',together=false){
 const ctx=vm.createContext({window:{},console});for(const f of ['bh-engine.js','reference-variants.js','model-preview.js','raven-scene.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),ctx);
 const G=ctx.window,s=G.Raven.ensureDashboards(JSON.parse(JSON.stringify(G.Raven.DEFAULT_SETTINGS)));s.holes.modelPreview=G.AsgardModelPreview.create({id:'v2-galaxy-ring',name:'Chosen disk'});s.holes.quickTier=tier;if(tier===4)s.holes.tierModels={4:G.AsgardModelPreview.tier4()};s.holes.modelPreview.on=tier===3;s.holes.active=active;s.holes.selTier=0;s.holes.together={on:together};
 Object.assign(ctx,{S:s,Raven:G.Raven,AsgardVariants:G.AsgardVariants,AsgardModelPreview:G.AsgardModelPreview,LIB:[],DASH:{friends:'Followers',viewers:'Views'},COUNT_WORD:{friends:'followers',viewers:'views'},ui:{open:{}},scene:{engine:{gl:{}},contacts:[{id:'freya',name:'Freya',face:'',counts:{friends:50,viewers:21}}]},clone:x=>JSON.parse(JSON.stringify(x)),esc:x=>String(x??''),head:()=>'',curTier:()=>s.holes.dashboards[active].tiers[0]});
 for(const k of ['R','K','C','SEL'])ctx[k]=(path)=>({path});ctx.ctlHtml=c=>`<input data-p="${c.path}">`;ctx.group=(title,cs)=>cs.map(ctx.ctlHtml).join('');
 const src=fs.readFileSync(file,'utf8');vm.runInContext(src.slice(src.indexOf('const LOOK ='),src.indexOf('function secMedia(){')),ctx);return new Set([...vm.runInContext('secHoles()',ctx).matchAll(/data-p="([^"]+)"/g)].map(m=>m[1]));
}
const current=path.join(__dirname,'../studio.js');
const expected=JSON.parse(fs.readFileSync(path.join(__dirname,'editor-control-paths.json'),'utf8'));
for(const tier of [1,2,3])test(`Views tier ${tier}: existing controls survive the all-tier view`,()=>{
 const now=markup(current,tier,'viewers',true);assert.ok(now.size>100);
 for(const field of expected['viewers:'+tier])assert.ok(now.has(field),`Missing ${field}`);
});
test('every formerly available control stays reachable through Views and Followers',()=>{
 const now=new Set();for(const active of ['viewers','friends'])for(const tier of [1,2,3])for(const p of markup(current,tier,active,true))now.add(p);
 for(const fields of Object.values(expected))for(const p of fields)assert.ok(now.has(p),`Removed control ${p}`);
});

test('Tier 4 exposes its own complete model controls and never writes tier 3 control paths',()=>{
 const now=markup(current,4,'viewers',false);
 for(const key of ['growth.ringStart','growth.ringEnd','growth.views','look.diskOut','look.diskOpacity','look.secondaryLight','look.rotX','look.rotY','look.rotZ','look.diskSpin','look.lens','look.size','skyRandomAxis'])assert.ok(now.has('holes.tierModels.4.'+key),key);
 assert.ok(!now.has('holes.modelPreview.look.diskOut'));
 for(const path of expected['viewers:3'].filter(p=>!p.startsWith('holes.modelPreview.')))assert.ok(now.has(path),'Lost shared control '+path);
});
