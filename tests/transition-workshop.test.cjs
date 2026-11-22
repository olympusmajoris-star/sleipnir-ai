const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const {runInNewContext} = require('node:vm');
const test = require('node:test');
const core = require('../workspace-core.js');

const window = {};
const ctx={window,URLSearchParams,URL,document:{baseURI:'https://studio.test/workshop.html'},location:{origin:'https://studio.test'}};
for (const file of ['studio-toolbox.js','studio-toolbox-tools.js','toolbox-target.js','transition-workshop.js']) {
  runInNewContext(readFileSync(join(__dirname,'..',file),'utf8'),ctx);
}
const workshop = window.TransitionWorkshop;

test('street keeps its original shopping entry and has a Valhalla sky branch', () => {
  assert.equal(core.normalizeLocation({group:'shopping',page:'vbrowse',store:'selected'}).store,'selected');
  const loc=core.normalizeLocation({group:'valhalla',page:'street',feature:'sky',topic:'stars'});
  assert.equal(loc.group,'shopping');assert.ok(workshop.sky(loc));assert.ok(workshop.focused(loc));
  let next;
  const trail=workshop.crumbs(loc,value => next=value);
  assert.deepEqual(Array.from(trail,c=>c[0]),['Palm Coast storefronts','Storefront sky','Stars']);
  trail[1][1]();
  assert.equal(next.topic,'');assert.ok(workshop.sky(next));
});

test('actual app routes including Asgard subpages each have independent sky and motion edit locations', () => {
  const inventory=require('../original-page-inventory.json').pages.map(p=>p.name);
  for(const page of [...inventory,'Asgard/dial','Asgard/horn','Asgard/way','Asgard/directory','Asgard/conversation']){
    const sky=core.normalizeLocation({group:'shopping',page:'app-pages',asset:page,feature:'sky',topic:'raven'});
    assert.ok(workshop.sky(sky),page);assert.ok(workshop.focused(sky),page);
    const route={...sky,from:'HomePage',feature:'glass',topic:'material'};
    assert.equal(core.normalizeLocation(route).from,'HomePage');
    assert.ok(workshop.focused(route));
    const h=core.historyPush({items:[sky],at:0},route);
    assert.equal(h.items[0].topic,'raven');assert.equal(h.items[h.at].topic,'material');
  }
  assert.equal(workshop.sky({page:'app-pages',asset:'@default',feature:'sky'}),false);
  assert.equal(workshop.focused({page:'app-pages',feature:'glass',topic:'unknown'}),false);
});

test('one registered tool gets the exact store, aisle and SKU independently of native page', () => {
  const loc={group:'shopping',page:'grocery',toolbox:true,toolPage:'GroceryAislePage',toolNative:'GroceryAislePage',
    store:'branch-one',aisle:'Dairy & Eggs',part:'selected-sku',targetType:'part'};
  const t=window.StudioToolTargets.capture(loc);
  assert.equal(t.page,'GroceryAislePage');assert.equal(t.type,'part');
  const query=new URL(window.StudioToolbox.url('layers',t,'media')).searchParams;
  assert.equal(query.get('store'),'branch-one');assert.equal(query.get('aisle'),'Dairy & Eggs');
  assert.equal(query.get('part'),'selected-sku');assert.equal(query.get('topic'),'media');
  assert.deepEqual(Array.from(window.StudioToolbox.all(),s=>s.id),['transitions','glass','sky','layers','components']);
  const late={id:'new-tool',title:'New tool',topics:[],openURL:()=> 'new-tool.html'};
  window.StudioToolbox.register(late);
  assert.equal(window.StudioToolbox.get('new-tool').title,late.title);
  const expanded=window.StudioToolTargets.select(t,'page');
  assert.equal(expanded.store,'');assert.equal(expanded.aisle,'');assert.equal(expanded.part,'');
});
