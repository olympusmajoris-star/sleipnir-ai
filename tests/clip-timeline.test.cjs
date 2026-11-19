const test=require('node:test'),assert=require('node:assert/strict');
const T=require('../studio-clip-timeline.js');
test('full source remains default and cuts retain original source coordinates',()=>{
  assert.deepEqual(T.normalizeSegments({},10),[{start:0,end:10}]);
  const original={p:'original.mp4'},segments=T.remove(original,10,3,6);
  assert.deepEqual(segments,[{start:0,end:3},{start:6,end:10}]);
  assert.deepEqual(original,{p:'original.mp4'});
  assert.equal(T.locate(segments,3.1).time,6.1);
});
test('successive edits never restore an already removed middle',()=>{
  const clip={segments:T.remove({},12,4,7)};
  assert.deepEqual(T.keep(clip,12,2,9),[{start:2,end:4},{start:7,end:9}]);
  assert.deepEqual(T.remove(clip,12,1,8),[{start:0,end:1},{start:8,end:12}]);
});
test('boundary edits and zero length results are guarded',()=>{
  assert.deepEqual(T.remove({},10,-2,2),[{start:2,end:10}]);
  assert.deepEqual(T.remove({},10,8,20),[{start:0,end:8}]);
  assert.throws(()=>T.remove({},10,0,10),/Keep at least/);
  assert.throws(()=>T.normalizeSegments({},Infinity),/duration/);
  assert.throws(()=>T.keep({segments:[{start:0,end:2}]},10,4,7),/Keep at least/);
  assert.deepEqual(T.normalizeSegments({segments:[{start:-3,end:4},{start:2,end:6},{start:9.99,end:10}]},10),[{start:0,end:6}]);
});
test('reverse playback traverses kept segments backwards and wraps correctly',()=>{
  const rows=[{start:1,end:3},{start:6,end:10}];
  assert.equal(T.totalDuration(rows),6);
  assert.equal(T.locate(rows,0,{reverse:true}).time,10);
  assert.equal(T.locate(rows,4.5,{reverse:true}).time,2.5);
  assert.equal(T.locate(rows,6.5).time,1.5);
  assert.equal(T.locate(rows,99,{loop:false}).ended,true);
});
