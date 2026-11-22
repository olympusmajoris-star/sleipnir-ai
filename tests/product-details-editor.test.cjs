const {test}=require('node:test');
const assert=require('node:assert/strict');
const {edits,payload}=require('../product-details-editor.js');
const store='11111111-1111-4111-8111-111111111111', id='22222222-2222-4222-8222-222222222222', change='33333333-3333-4333-8333-333333333333';
const current={id,store_id:store,name:'Penne',description:null,price:1.99,image_url:null,category:'Dry Goods',section:null,shelf_group:'Pasta',full_name:null};
test('an edited popup is an exact existing SKU and a change to the specified fields',()=>{
 const patch=edits(current,{name:'Penne',price:'2.29',description:'Bronze-cut pasta',full_name:''});
 assert.deepEqual(patch,{price:2.29,description:'Bronze-cut pasta'});
 const body=payload(store,current,patch,change);
 assert.equal(body.p_items[0].id,id);assert.equal(body.p_items[0].expected.price,1.99);assert.equal(body.p_items[0].expected.shelf_group,'Pasta');
 assert.equal(Object.keys(body.p_items[0].expected).length,8);
});
test('field and store checks prevent invalid or misdirected catalog changes',()=>{
 for(const value of ['-1','2.345','1e5','Infinity'])assert.throws(()=>edits(current,{price:value}));
 for(const value of ['javascript:alert(1)','http://unsecured.test/p','https://a:b@place.test/x'])assert.throws(()=>edits(current,{image_url:value}));
 assert.throws(()=>payload(id,current,{price:2},change));
 assert.throws(()=>payload(store,{...current,id:'bad'},{price:2},change));
 const incomplete={...current};delete incomplete.full_name;assert.throws(()=>payload(store,incomplete,{price:2},change));
 assert.throws(()=>payload(store,current,{store_id:id},change));
 assert.deepEqual(edits(current,{price:'.99',image_url:'https://images.test/pack.png'}),{price:.99,image_url:'https://images.test/pack.png'});
});
test('only genuine existing catalog aisles can be chosen on an explicitly dynamic fixture',()=>{
 assert.throws(()=>edits(current,{category:'Bakery'}));
 assert.throws(()=>edits(current,{category:'Made up'},['Bakery','Dry Goods']));
 assert.deepEqual(edits(current,{category:'Bakery'},['Bakery','Dry Goods']),{category:'Bakery'});
 assert.deepEqual(edits(current,{category:'Dry Goods'}),{});
});
test('round-trips unchanged source text and distinguishes clearing a field',()=>{
 assert.deepEqual(edits({...current,description:' pack  '},{description:' pack  ',price:'1.99'}),{});
 assert.deepEqual(edits({...current,description:'old'},{description:'',price:''}),{description:null,price:null});
});
