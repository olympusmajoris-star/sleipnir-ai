const {test}=require('node:test');
const assert=require('node:assert/strict');
const {layout,stockHeight}=require('../shelf-layout-canvas.js');

const stock=Array.from({length:75},(_,index)=>({id:'dg-'+index,aspect:[.25,.65,1,1.9,.4][index%5]}));
const base={theme:'dollar-general',rows:3,rail:5,productsPerRow:2,facings:2,items:stock};

test('every DG product stays reachable across dense three-row bays with natural proportions',()=>{
  const first=layout(base),seen=[];
  for(let page=0;page<first.pages;page++) {
    const bay=layout({...base,page});
    assert.equal(bay.rows,3);
    for(const slot of bay.slots) {
      seen.push(slot.id);
      assert.equal(slot.facings,2);
      assert.ok(Math.abs((slot.faceWidth*bay.width)/(slot.height*bay.height)-slot.item.aspect)<1e-9);
      assert.ok(slot.top>=slot.cell.top);
      assert.ok(slot.top+slot.height<slot.tag.top);
      assert.ok(slot.left>=slot.cell.left && slot.left+slot.width<=slot.cell.left+slot.cell.width+1e-9);
    }
  }
  assert.deepEqual(seen,stock.map(item=>item.id));
});

test('DG upgrade preserves saved layout rows, per-product facings and scale decisions',()=>{
  const result=layout({...base,rows:5,rail:8,productsPerRow:3,
    transforms:{'dg-0':{scale:.55,facings:3,x:.06,y:-.05}}});
  const first=result.slots[0];
  assert.equal(result.rows,5);
  assert.equal(result.productsPerRow,3);
  assert.equal(first.scale,.55);
  assert.equal(first.facings,3);
  assert.ok(first.y<0);
  assert.ok(first.left>=first.cell.left && first.left+first.width<=first.cell.left+first.cell.width);
});

test('DG theme fills more of its shelf without changing the legacy baseline',()=>{
  const item={id:'tall-pack',aspect:.25};
  const legacy=layout({rows:3,rail:5,productsPerRow:2,facings:2,items:[item]});
  const dg=layout({...base,items:[item]});
  const fill=bay=>bay.slots[0].height*bay.height/bay.stockH;
  assert.ok(fill(dg)>fill(legacy));
  assert.ok(Math.abs(fill(legacy)-.72)<1e-9);
  assert.equal(legacy.height,1536);
  assert.equal(dg.height,1280);
  assert.equal(stockHeight(3,5,'dollar-general'),dg.stockH);
});

test('DG auto shelves fit five slender products or fewer bulky ones without repeating an ID',()=>{
  const items=Array.from({length:93},(_,i)=>({id:String(i),aspect:i<15?.54:i%2?1.6:.78}));
  const config={theme:'dollar-general',rows:3,facings:1,items};
  const first=layout(config);
  assert.equal(first.slots.filter(slot=>slot.row===0).length,5);
  const all=[];
  for(let page=0;page<first.pages;page++){
    const bay=layout({...config,page});
    for(let row=0;row<3;row++){
      const line=bay.slots.filter(slot=>slot.row===row);
      assert.ok(line.length<=5);
      for(let k=1;k<line.length;k++)assert.ok(line[k].left>=line[k-1].left+line[k-1].width-1e-8);
      all.push(...line.map(slot=>slot.id));
    }
  }
  assert.ok(layout({...config,page:1}).slots.length<15);
  assert.deepEqual(all,items.map(item=>item.id));
});
