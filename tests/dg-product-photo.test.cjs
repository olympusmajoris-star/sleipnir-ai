const {test} = require('node:test');
const assert = require('node:assert/strict');
const {preparePackshot} = require('../dg-product-photo.js');
const {layout, packageSize} = require('../shelf-layout-canvas.js');

test('follows a bottle shoulder and retains enclosed white cap and label', () => {
  const width=80, height=100, data=new Uint8ClampedArray(width*height*4).fill(255);
  function rectangle(x0,y0,x1,y1,color) {
    for(let y=y0;y<y1;y++) for(let x=x0;x<x1;x++) {
      const p=(y*width+x)*4;
      data.set([...color,255],p);
    }
  }
  rectangle(31,8,49,25,[160,158,151]); rectangle(33,10,47,22,[255,255,255]);
  rectangle(35,25,45,40,[22,98,42]); rectangle(14,41,66,89,[22,98,42]);
  rectangle(25,55,55,75,[255,255,255]);
  const result=preparePackshot(data,width,height);
  assert.equal(result.cutout,true);
  const alpha=(x,y)=>data[(y*width+x)*4+3];
  assert.equal(alpha(20,36),0);
  assert.equal(alpha(40,33),255);
  assert.equal(alpha(39,14),255);
  assert.equal(alpha(40,63),255);
  assert.deepEqual(result.bounds,[13,7,54,83]);
});

test('retains the source and crop of an already transparent product and an opaque color photo',()=>{
  const raw=new Uint8ClampedArray(32*32*4);
  for(let y=8;y<24;y++) for(let x=8;x<24;x++) raw.set([246,246,246,255],(y*32+x)*4);
  const expected=raw.slice();
  assert.deepEqual(preparePackshot(raw,32,32).bounds,[7,7,18,18]);
  assert.deepEqual(raw,expected);
  const backdrop=new Uint8Array(12*12*4);
  for(let p=0;p<backdrop.length;p+=4)backdrop.set([170,112,80,255],p);
  assert.equal(preparePackshot(backdrop,12,12).cutout,false);
});

test('individual price holders retain the catalog size and larger bottles are taller',()=>{
  const items=['7UP Soda, 20 fl oz Bottle','7UP Soda, 2 Liters','Root Beer, 16.9 fl oz bottles, 6 pk']
    .map((name,i)=>({id:String(i),name,aspect:.36}));
  const model=layout({theme:'dollar-general',items,rows:3,rail:5,productsPerRow:3,facings:1});
  assert.deepEqual(items.map(item=>packageSize(item).label),['20 fl oz','2 L','6 pk · 16.9 fl oz']);
  assert.ok(model.slots[1].height>1.4*model.slots[0].height);
  assert.equal(packageSize({name:'Weekly specials'}).label,'');
});
