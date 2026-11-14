const test=require('node:test'),assert=require('node:assert/strict'),F=require('../fixture-placement.js'),C=require('../studio-render-core.js');
function board(){return{display:'shelf',rows:2,brandsPerRow:2,facings:2,fixture:{url:'https://example.com/shelf.png'},fixtureRegion:{left:.05,top:.1,right:.95,bottom:.9},fixtureRows:[{left:.1,top:.2,right:.9,bottom:.4},{left:.15,top:.55,right:.85,bottom:.8}],products:[{id:'a'},{id:'b'}],slots:[{productId:'a',row:1,column:1,facings:2},{productId:'b',row:2,column:2,facings:2}]};}
test('calibrated shelves respect their own position, width and photo aspect ratio',()=>{
 const p=C.layout(board(),{width:1800,height:1200});assert.equal(p.cells[0].x,180);assert.equal(p.cells[0].y,240);assert.equal(p.cells[1].x,900);assert.equal(p.cells[1].y,660);for(const cell of p.cells)for(const box of cell.images){assert.ok(box.y+box.height<cell.tag.y);assert.ok(box.width>0);}
});
test('overlapping shelves, changed row counts and crowding are rejected',()=>{
 let b=board();b.fixtureRows[1]=b.fixtureRows[0];assert.throws(()=>C.layout(b),/overlap/);b=board();b.rows=3;assert.throws(()=>C.layout(b),/positions/);b=board();b.brandsPerRow=12;b.facings=12;b.slots.forEach(s=>s.facings=12);assert.throws(()=>C.layout(b),/crowded/);
});
test('default shelf bands partition the selected area and malformed placements fail',()=>{
 const rows=F.rowsFor({rows:4,fixtureRegion:{left:.1,top:.2,right:.9,bottom:.8}});assert.equal(rows.length,4);assert.equal(rows[0].top,.2);assert.equal(rows[3].bottom,.8);assert.throws(()=>F.rowsFor({rows:2,fixtureRows:[rows[0]]}));assert.equal(F.validBox({left:0,top:0,right:2,bottom:1}),false);
});
