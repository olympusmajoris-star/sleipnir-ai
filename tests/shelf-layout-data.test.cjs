const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const home=path.join(__dirname,'..');
const source=readFileSync(path.join(home,'shelf-layout-data.js'),'utf8');
const rules=JSON.parse(readFileSync(path.join(home,'shelf-product-kinds.json'),'utf8'));
const dgRules=JSON.parse(readFileSync(path.join(home,'dg-product-kinds.json'),'utf8'));
const target='35ef70d0-3d20-4599-96a3-648ee3c7c340';
const foreign='189581c9-d728-4e5d-9e02-ae4de19a15af';
const milk='fffb6855-d7cb-48f4-a9aa-06a0b8ec59f0',eggs='fffb6855-d7cb-48f4-a9aa-06a0b8ec59f1';
const other='fffb6855-d7cb-48f4-a9aa-06a0b8ec59f2';
const scene='target-renders/dairy-eggs/'+ 'a'.repeat(64)+'.png';
const atlas='target-renders/dairy-eggs/'+ 'f'.repeat(64)+'.webp';

function build({products,tableRows,stock,manifest,store=target}) {
  const win={StudioTransferConfig:{url:'https://db.test',key:'anonymous-test'}};
  const fetch=async(url,options)=>{
    const u=new URL(url);
    let output;
    if(u.pathname.endsWith('/dg-product-kinds.json'))output=dgRules;
    else if(u.pathname.endsWith('/shelf-product-kinds.json'))output=rules;
    else if(u.pathname.endsWith('.json'))output=manifest;
    else if(u.pathname.endsWith('/studio_grocery_aisle_original_stock')){
      assert.equal(u.searchParams.get('p_store_id'),store);
      output=stock.map((id,i)=>({position:i+1,product_id:id}));
    }else if(u.pathname.endsWith('/target_renders'))output=tableRows;
    else if(u.pathname.endsWith('/products')){
      assert.equal(u.searchParams.get('store_id'),'eq.'+store);
      output=products;
    }else throw Error('Unexpected request to '+u.pathname);
    return {ok:true,json:async()=>output};
  };
  vm.runInNewContext(source,{window:win,document:{baseURI:'https://studio.test/'},URL,URLSearchParams,fetch});
  return win.ShelfLayoutData;
}

test('layout keeps native membership, current price and the calibrated dairy cutout and group',async()=>{
  const crop=[120,7,90,213],base=[14,21,45,104];
  const milkProduct={id:milk,store_id:target,name:'Whole Milk',shelf_group:'Eggs',price:3.99};
  const eggProduct={id:eggs,store_id:target,name:'Cage-Free Eggs',shelf_group:'Milk',price:4.59};
  const products=[eggProduct,milkProduct,{...eggProduct,id:other,store_id:foreign}];
  const slots=[{product_id:eggs,slot:3,shelf_group:'Eggs'},{product_id:milk,slot:1,shelf_group:'Milk'}];
  const provider=build({products,stock:[milk,eggs,other,milk],
    tableRows:[{render_no:11983,image_path:scene,target_render_slots:slots}],
    manifest:{atlasHeight:1536,atlasWidth:1152,panels:{11983:{scene,fixture:'glass_cooler',atlas,slots:[{id:milk,src:crop,dst:base}]}}}});
  const result=await provider.load({store:target,aisle:'Dairy & Eggs'});
  assert.deepEqual(Array.from(result.items,p=>p.id),[milk,eggs]);
  const p=result.items[0];
  assert.deepEqual(Array.from(result.kinds),['Milk','Eggs']);
  assert.equal(p.price,3.99);
  assert.deepEqual(p.source,crop);
  assert.equal(p.aspect,90/213);
  assert.ok(p.atlas.endsWith(atlas));
  assert.equal(result.items[1].atlas,undefined);
});

test('pasta made from brown rice and egg noodles stay with pasta',async()=>{
  const products=[{id:milk,store_id:target,name:'Brown Rice Spaghetti Pasta',shelf_group:'Dry Goods'},
    {id:eggs,store_id:target,name:'Extra-Wide Egg Noodles',shelf_group:'Dry Goods'}];
  const provider=build({products,stock:[milk,eggs]});
  const result=await provider.load({store:target,aisle:'Dry Goods & Pasta'});
  assert.deepEqual(Array.from(result.kinds),['Pasta']);
});


test('DG uses product identity for display groups while retaining the original order and campaign label',async()=>{
  const store='0600cb61-45f9-402b-a209-134abdaef10f',aisle='Soda, Water & Drinks';
  const names=['Clover Valley Hydrating Electrolyte Drink Mix, 4 Sticks','Pepsi Soda Cola 2 Liter','Milo’s Raspberry Lemonade, 20 fl oz'];
  const ids=[milk,eggs,other];
  const products=ids.map((id,i)=>({id,store_id:store,name:names[i],shelf_group:'Game Day Food Drinks'}));
  const result=await build({products,stock:ids,store}).load({store,aisle});
  assert.deepEqual(Array.from(result.items,p=>p.kind),['Drink mixes','Cola & pepper soda','Juice & lemonade']);
  assert.deepEqual(Array.from(result.items,p=>p.sourceIndex),[0,1,2]);
  assert.ok(result.items.every(p=>p.group==='Game Day Food Drinks'));
  assert.equal(result.items[1].kindOrder,0);
});
