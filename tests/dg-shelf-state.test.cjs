const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const geometry=require('../shelf-layout-canvas.js');

// Exercise controller state without pretending this is browser visual QA.
class Element {
  constructor(){this.children=[];this.dataset={};this.classList={add(){},remove(){},toggle(){}};this.hidden=false;}
  setAttribute(){} addEventListener(){} removeEventListener(){} focus(){}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=[...nodes];}
  contains(node){return this.children.includes(node);}
}
function setup({layout=null,items,authoredId}={}) {
  const host=new Element(),rendered=[];
  const root={
    DollarGeneralPlan:require('../dg-shelf-plan.js'),
    ShelfLayoutCanvas:{...geometry,render(surface,config){const result=geometry.layout(config);rendered.push({config,result});return result;}},
    ShelfLayoutData:{load:async()=>({items:items||[{id:'one',name:'A real package',group:'Shelf group',aspect:.6}],fixture:'shelf'})},
    ShelfLayoutStore:{load:async()=>({layout,revision:4})}
  };
  const context={window:root,document:{createElement:()=>new Element(),createElementNS:()=>new Element()},
    AbortController,setTimeout,clearTimeout,requestAnimationFrame:fn=>setTimeout(fn,0),cancelAnimationFrame:clearTimeout};
  vm.runInNewContext(fs.readFileSync(require.resolve('../dg-shelf-presentation.js'),'utf8'),context);
  const selected=[];
  const view=root.DollarGeneralShelf.mount(host,{store:'store',aisle:'aisle',authoredId,scales:{one:.9},onSelect:value=>selected.push(value)});
  return {view,host,rendered,selected,root};
}

test('saved organizer placement survives base sync while explicit preview drafts can override it',async()=>{
  const fixture=setup({layout:{products:{one:{scale:.6,x:.05,y:-.03}},rows:3,productsPerRow:2}});
  await fixture.view.ready;
  const scale=()=>fixture.rendered.at(-1).result.slots[0].scale;
  assert.equal(scale(),.6);
  fixture.view.command('sync',{scales:{one:1}});
  assert.equal(scale(),.6);
  fixture.view.command('set-scale',{product_id:'one',scale:.95});
  assert.equal(scale(),.95);
  fixture.view.command('sync',{scales:{one:1}});
  assert.equal(scale(),.95);
  fixture.view.command('sync',{scales:{one:1},draftScales:{}});
  assert.equal(scale(),.6);
  assert.equal(fixture.rendered.at(-1).config.transforms.one.x,.05);
  fixture.view.destroy();
});

test('authored product selection retains original twelve-position membership after visual repacking',async()=>{
  const items=Array.from({length:20},(_,index)=>({id:'product-'+index,name:'Product '+index,group:'Stock',aspect:.6}));
  const fixture=setup({items,authoredId:'authored-aisle'});
  await fixture.view.ready;
  fixture.view.command('focus-product',{product_id:'product-14'});
  const selection=fixture.selected.at(-1);
  assert.equal(selection.product_id,'product-14');
  assert.equal(selection.aisle_id,'authored-aisle');
  assert.equal(selection.page,2);
  assert.equal(selection.slot,3);
  assert.equal(fixture.rendered.at(-1).result.page,0);
  fixture.view.destroy();
});

test('search and bay navigation retain products beyond the entrance sample',async()=>{
  const items=Array.from({length:75},(_,index)=>({id:'product-'+index,name:index===74?'Last catalog item':'Product '+index,group:'Stock',aspect:.6}));
  const fixture=setup({items});await fixture.view.ready;
  assert.equal(fixture.rendered.at(-1).result.pages,5);
  assert.ok(fixture.rendered.at(-1).result.slots.every(slot=>slot.facings===1));
  fixture.view.command('move',{direction:'right'});
  assert.equal(fixture.rendered.at(-1).result.page,1);
  fixture.view.command('search',{query:'Last catalog'});
  assert.equal(fixture.rendered.at(-1).result.slots[0].id,'product-74');
  assert.equal(fixture.rendered.at(-1).result.pages,1);
  fixture.view.destroy();
  assert.equal(fixture.host.children.length,0);
});

test('saving one size preserves the rest of the layout and a newer preview edit',async()=>{
  const layout={rows:5,rail:8,productsPerRow:2,products:{
    one:{scale:.6,x:.04,y:-.03,facings:2},other:{scale:.72,facings:3,group:'Keep this group'}
  }};
  const fixture=setup({layout});await fixture.view.ready;
  let complete,request;
  fixture.root.ShelfLayoutStore.save=(store,key,record,revision)=>{
    request={store,key,record,revision};return new Promise(resolve=>{complete=resolve;});
  };
  fixture.view.command('set-scale',{product_id:'one',scale:.8});
  const saving=fixture.view.saveScale('one',.8);
  assert.equal(request.store,'store');assert.equal(request.key,'aisle');assert.equal(request.revision,4);
  assert.equal(request.record.rows,5);assert.equal(request.record.rail,8);
  assert.deepEqual(JSON.parse(JSON.stringify(request.record.products.other)),layout.products.other);
  assert.deepEqual(JSON.parse(JSON.stringify(request.record.products.one)),{...layout.products.one,scale:.8});
  fixture.view.command('set-scale',{product_id:'one',scale:.9});
  complete({layout:request.record,revision:5});await saving;
  assert.equal(fixture.rendered.at(-1).result.slots[0].scale,.9);
  fixture.view.command('sync',{scales:{one:1},draftScales:{}});
  assert.equal(fixture.rendered.at(-1).result.slots[0].scale,.8);
  fixture.view.destroy();
});

test('a false or conflicting save confirmation cannot discard the preview draft',async()=>{
  for(const failure of ['stale-revision','wrong-size','conflict']) {
    const fixture=setup({layout:{products:{one:{scale:.6}}}});await fixture.view.ready;
    fixture.view.command('set-scale',{product_id:'one',scale:.9});
    fixture.root.ShelfLayoutStore.save=async(store,key,record)=>{
      if(failure==='conflict')throw Error('A newer shelf layout has been saved.');
      return {layout:failure==='wrong-size'?{...record,products:{one:{scale:.5}}}:record,
        revision:failure==='stale-revision'?4:5};
    };
    await assert.rejects(fixture.view.saveScale('one',.9));
    assert.equal(fixture.rendered.at(-1).result.slots[0].scale,.9);
    let retryRevision;
    fixture.root.ShelfLayoutStore.save=async(store,key,record,revision)=>{
      retryRevision=revision;return {layout:record,revision:5};
    };
    await fixture.view.saveScale('one',.9);
    assert.equal(retryRevision,4);
    fixture.view.destroy();
  }
});
