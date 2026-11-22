const {test}=require('node:test');
const assert=require('node:assert/strict');
const {layout}=require('../shelf-layout-canvas.js');

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
