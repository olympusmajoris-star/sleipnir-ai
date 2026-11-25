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
