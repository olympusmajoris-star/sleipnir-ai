const {test}=require('node:test');
const assert=require('node:assert/strict');
const {layout,stockHeight}=require('../shelf-layout-canvas.js');

const stock=Array.from({length:84},(_,index)=>({
  id:'sku-'+index, aspect:[3.8,.57,1.9,.23][index%4]
}));

test('enlarged carton takes additional lanes, retains both facings and keeps source order across bays',()=>{
  const params={items:stock,fixture:'cooler',rows:4,rail:4};
  const normal=layout(params), id=stock[10].id;
  const large=layout({...params,transforms:{[id]:{scale:2.4}},anchorId:id});
  const previous=normal.allSlots.find(s=>s.id===id), next=large.slots.find(s=>s.id===id);
  assert.equal(previous.span,1);
  assert.equal(next.span,3);
  assert.ok(next.width>previous.width*2.2);
  assert.equal(next.scale,2.4);
  assert.equal(large.page,large.pageFor(id));
  assert.deepEqual(large.allSlots.map(s=>s.id), stock.map(p=>p.id));
});

test('cooler products stay above their own price rail and inside each post after extreme group edits',()=>{
  for(const rows of [1,3,4,8])for(const rail of [1,6,15]){
    const transforms=Object.fromEntries(stock.map((p,i)=>[p.id,{scale:6,x:i%2?1:-1,y:i%3?1:-1}]));
    const m=layout({fixture:'freezer',rows,rail,items:stock,transforms});
    for(const s of m.allSlots){
      const c=s.cell;
      assert.ok(s.left>=.085-1e-9 && s.left+s.width<=.915+1e-9);
      assert.ok(s.left>=c.left && s.left+s.width<=c.left+c.width);
      assert.ok(s.top>=c.top && s.top+s.height<s.tag.top);
      assert.ok(s.faceWidth*2<s.width);
    }
    assert.deepEqual(m.allSlots.map(s=>s.id),stock.map(p=>p.id));
    for(let i=1;i<m.allSlots.length;i++){
      const a=m.allSlots[i-1], b=m.allSlots[i];
      if(a.page===b.page&&a.row===b.row)assert.ok(a.cell.left+a.cell.width<=b.cell.left+1e-9);
    }
  }
});

test('removing a shelf carries the entire removed row into the next bay in aisle order',()=>{
  const options={items:stock.slice(0,29),fixture:'cooler',productsPerRow:3,facings:2};
  const full=layout({...options,rows:4});
  const reduced=layout({...options,rows:3});
  const ids=slots=>slots.map(s=>s.id);
  assert.deepEqual(ids(reduced.slots),ids(full.slots.filter(s=>s.row<3)));
  assert.deepEqual(ids(reduced.allSlots.filter(s=>s.page===1 && s.row===0)),
    ids(full.slots.filter(s=>s.row===3)));
  assert.deepEqual(ids(reduced.allSlots),ids(options.items));
  assert.deepEqual(ids(reduced.allSlots.filter(s=>s.page===2)),ids(options.items.slice(18,27)));
  const last=layout({...options,rows:3,page:3});
  assert.deepEqual(ids(last.slots),ids(options.items.slice(27)));
  assert.equal(last.pages,4);
});

test('Auto preserves exact row membership while shelves and rail thickness change',()=>{
  const transforms=Object.fromEntries(stock.map((item,i)=>[item.id,
    {scale:[1.8,.8,3,1,2.5][i%5],facings:[2,1,3][i%3]}]));
  const params={items:stock,fixture:'cooler',transforms};
  for(const oldRows of [2,3,4,5,6,7,8])for(const rail of [1,4,15]){
    const frozen={...params,autoStockHeight:stockHeight(oldRows,rail)};
    const before=layout({...frozen,rows:oldRows,rail}).allSlots;
    const after=layout({...frozen,rows:oldRows-1,rail:rail===15?1:15}).allSlots;
    assert.ok(before.some(s=>s.span>1));
    assert.deepEqual(after.map(s=>s.id),before.map(s=>s.id));
    after.forEach((s,i)=>{
      const oldLine=before[i].page*oldRows+before[i].row;
      const newLine=s.page*(oldRows-1)+s.row;
      assert.equal(newLine,oldLine);
      assert.equal(s.span,before[i].span);
      if(oldLine>=oldRows-1)assert.ok(s.page>0);
    });
  }
});

test('legacy three-row stock keeps its original lane assignments after saving and re-opening at four rows',()=>{
  const items=Array.from({length:40},(_,i)=>({
    id:'sku-'+i,aspect:[.2,.35,1,2.8][i%4],scale:[2.1,1.4,1.75,1.8][i%4]
  }));
  const saved={rows:3,rail:4,fixture:'cooler'};
  const basis=stockHeight(saved.rows,saved.rail);
  const original=layout({...saved,items,autoStockHeight:basis});
  assert.deepEqual(original.allSlots.slice(0,4).map(s=>s.span),[1,2,2,2]);
  const reopened=JSON.parse(JSON.stringify({...saved,rows:4,rail:10,autoStockHeight:basis}));
  const changed=layout({...reopened,items});
  assert.deepEqual(changed.allSlots.map(s=>[s.span,s.page*4+s.row]),
    original.allSlots.map(s=>[s.span,s.page*3+s.row]));
});

test('distinct products per row, aisle copies and per-SKU copies remain independent at any scale',()=>{
  for(const productsPerRow of [1,2,3,4,5,6])for(const facings of [1,2,3]){
    const items=stock.slice(0,23);
    const transforms=Object.fromEntries(items.map((p,i)=>[p.id,
      i%4===0?{scale:6,facings:1}:{scale:i%2?6:.1}]));
    const params={fixture:'cooler',items,productsPerRow,facings,transforms,rows:3};
    const model=layout(params);
    const original=layout({...params,transforms:{}});
    assert.ok(original.allSlots.every(s=>Math.abs(s.scale-1)<1e-9));
    assert.equal(model.pages,Math.ceil(items.length/(3*productsPerRow)));
    model.allSlots.forEach((s,i)=>{
      assert.equal(s.page,Math.floor(i/(productsPerRow*3)));
      assert.equal(s.row,Math.floor(i/productsPerRow)%3);
      assert.equal(s.facings,i%4===0?1:facings);
      assert.equal(s.span,1);
      assert.deepEqual(s.cell,original.allSlots[i].cell);
      assert.ok(Math.abs(s.width-s.facings*s.faceWidth-(s.facings-1)*6/1024)<1e-9);
      assert.ok(s.left>=s.cell.left && s.left+s.width<=s.cell.left+s.cell.width);
      assert.ok(s.top>=s.cell.top && s.top+s.height<s.tag.top);
    });
  }
});
