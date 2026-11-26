const test = require('node:test');
const assert = require('node:assert/strict');
const {panelsFor} = require('../publix-seafood-freezer.js');
const {PUBLIX, TARGET, validBox} = require('../grocery-entrance.js');

const stock = Array.from({length:102}, (_,i)=>({
  store_id:PUBLIX, station:'Publix Frozen Seafood Priced 20261120',
  product_id:'10000000-0000-4000-8000-'+String(i).padStart(12,'0'),
  product_name:'Seafood '+i, price:2.49+i, product_image:'https://images.example/pack-'+i+'.png'
}));
const identity = url=>url;

test('real-station layout accepts only its store and station, keeping the first location of each SKU', ()=>{
  const rows = [
    {...stock[9],store_id:TARGET}, {...stock[8],station:'Seafood'},
    ...stock.slice(0,6), ...stock.slice(2,5), ...stock.slice(6), ...stock.slice(85,99)
  ];
  const cases = panelsFor(rows,{},identity);
  assert.equal(cases.length,6);
  const ordered = cases.flatMap(p=>p.spots);
  assert.deepEqual(ordered.map(p=>[p.id,p.price]),stock.map(r=>[r.product_id,r.price]));
  for(const panel of cases){
    assert.equal(panel.seafoodFreezer,true);
    assert.equal(panel.layered,true);
    assert.deepEqual([1,2,3,4].map(row=>panel.spots.filter(p=>p.row===row).length),[5,4,4,4]);
    for(const p of panel.spots){
      for(const box of [p.photoBox,p.tagBox,p.boxes[0]])assert.ok(validBox(box));
      const [x,y,right,bottom]=p.boxes[0];
      for(const [left,top,r,b] of [p.photoBox,p.tagBox]){
        assert.ok(left>=x && top>=y && r<=right && b<=bottom);
      }
      assert.equal(p.photoBox[3],[389,705,1007,1321][p.row-1]/1536);
      assert.ok(p.tagBox[1]>p.photoBox[3]);
    }
  }
});

test('prepared photo matches its current source and gracefully falls back when a new catalog image is assigned', ()=>{
  const [first,changed,unsafe]=stock;
  const catalog={
    [first.product_id]:{source:first.product_image,file:first.product_id+'.webp'},
    [changed.product_id]:{source:'https://images.example/old.png',file:changed.product_id+'.webp'},
    [unsafe.product_id]:{source:unsafe.product_image,file:'../wrong.webp'}
  };
  const [panel]=panelsFor(stock.slice(0,3),catalog,identity);
  assert.equal(panel.spots[0].photo,'grocery-station-surfaces/seafood-products/'+first.product_id+'.webp');
  assert.equal(panel.spots[0].fallbackPhoto,first.product_image);
  assert.deepEqual(panel.spots.slice(1).map(p=>p.photo),[changed.product_image,unsafe.product_image]);
  assert.deepEqual(panelsFor([],{},identity),[]);
  assert.deepEqual(panelsFor(stock.slice(0,20),{},identity).map(p=>p.spots.length),[20]);
  assert.deepEqual(panelsFor(stock.slice(0,21),{},identity).map(p=>p.spots.length),[11,10]);
});

test('stock lanes share one price and one click target while opaque rear units recede inside the shelf opening', ()=>{
  const cases=panelsFor(stock,{},identity);
  const copyCounts=new Set();
  for(const {spots} of cases){
    for(const product of spots){
      const {facings,laneBox}=product;
      copyCounts.add(facings.length);
      assert.equal(product.boxes.length,1);
      assert.ok(laneBox[3]<product.tagBox[1]);
      assert.equal(facings.at(-1).depth,0);
      assert.deepEqual(facings.at(-1).box,product.photoBox);
      for(let i=0;i<facings.length;i++){
        const face=facings[i], box=face.box;
        assert.equal(face.depth,facings.length-i-1);
        assert.ok(['left','right','none'].includes(face.side));
        assert.ok(box[0]>=laneBox[0] && box[2]<=laneBox[2]);
        assert.ok(box[1]<laneBox[3] && box[3]>laneBox[1]);
        if(i===0)continue;
        const rear=facings[i-1].box;
        assert.ok(rear[2]-rear[0] < box[2]-box[0]);
        assert.ok(rear[3]-rear[1] < box[3]-box[1]);
        assert.ok(product.row===1 ? rear[3]>box[3] : rear[3]<box[3]);
      }
    }
  }
  assert.deepEqual([...copyCounts].sort(),[2,3,4]);
});

test('tickets distinguish visible screenshot variants, omitting brand-only prefixes', ()=>{
  const names=["Cedar Bay Atlantic Salmon, Cedar Planked, Hickory Maple","Cedar Bay Atlantic Salmon, Cedar Planked, Maple & Smoked Pepper","Gorton's Air Fried Garlic & Herb Fish Fillets","Gorton's Classic Crunchy Breadcrumbs Haddock Fish Sticks","Gorton's Classic Crunchy Cod Fish Sticks","Red Lobster Cheddar Bay Biscuit Shrimp"];
  const result=panelsFor(names.map((name,i)=>({...stock[i],product_name:name})),{},identity)[0];
  assert.deepEqual(result.spots.map(p=>p.ticketLabel),['Maple','Pepper','Garlic','Haddock','Cod','Shrimp']);
  assert.deepEqual(result.spots.map(p=>p.name),names);
});
