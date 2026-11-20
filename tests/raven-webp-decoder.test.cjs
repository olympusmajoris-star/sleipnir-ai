const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const decoder=require('../raven-webp-decoder-1120.js');
const source=()=>{const b=fs.readFileSync(path.join(__dirname,'fixtures/cloud-animation.webp'));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);};
test('Animated WebP frame bounds and independent durations are retained',()=>{
  const a=decoder.parse(source());assert.equal(a.width,40);assert.equal(a.height,32);assert.equal(a.frames.length,3);
  assert.deepEqual(a.frames.map(f=>f.duration),[100,200,300]);
  for(const f of a.frames){assert.ok(f.w>0&&f.h>0);assert.ok(f.x+f.w<=40&&f.y+f.h<=32);}
});
test('Extracted pictures have a complete WebP container and exact dimensions',()=>{
  for(const f of decoder.parse(source()).frames){const s=decoder.still(f);assert.equal(Buffer.from(s.subarray(0,4)).toString(),'RIFF');assert.equal(new DataView(s.buffer).getUint32(4,true),s.length-8);assert.equal(s[24]+(s[25]<<8)+(s[26]<<16)+1,f.w);assert.equal(s[27]+(s[28]<<8)+(s[29]<<16)+1,f.h);}
});
test('Invalid and truncated cloud footage are rejected',()=>{
  assert.throws(()=>decoder.parse(new Uint8Array(20).buffer),/Invalid WebP/);
  assert.throws(()=>decoder.parse(source().slice(0,60)),/Incomplete|missing/);
});
