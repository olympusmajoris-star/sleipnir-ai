const test=require('node:test'),assert=require('node:assert/strict'),{createCanvas,loadImage}=require('@napi-rs/canvas'),A=require('../studio-cloud-playback');
function chunk(name,payload){const h=Buffer.alloc(8);h.write(name);h.writeUInt32LE(payload.length,4);return Buffer.concat([h,payload,...(payload.length%2?[Buffer.alloc(1)]:[])]);}
function fixture(){
 const size=Buffer.alloc(10);size[0]=18;size.writeUIntLE(7,4,3);size.writeUIntLE(7,7,3);const parts=[chunk('VP8X',size),chunk('ANIM',Buffer.alloc(6))];
 for(const [w,h,x,y,color,ms,flags]of [[8,8,0,0,'#ff0000',100,2],[4,4,2,2,'#00ff00',200,1],[4,4,4,4,'#0000ff',300,0]]){
  const cv=createCanvas(w,h),ctx=cv.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,w,h);const bytes=cv.toBuffer('image/webp'),data=[];
  for(let p=12;p+8<=bytes.length;){const n=bytes.readUInt32LE(p+4),name=bytes.toString('ascii',p,p+4),end=p+8+n+(n%2);if(['VP8 ','VP8L','ALPH'].includes(name))data.push(bytes.subarray(p,end));p=end;}
  const header=Buffer.alloc(16);header.writeUIntLE(x/2,0,3);header.writeUIntLE(y/2,3,3);header.writeUIntLE(w-1,6,3);header.writeUIntLE(h-1,9,3);header.writeUIntLE(ms,12,3);header[15]=flags;parts.push(chunk('ANMF',Buffer.concat([header,...data])));
 }
 const body=Buffer.concat([Buffer.from('WEBP'),...parts]),header=Buffer.alloc(8);header.write('RIFF');header.writeUInt32LE(body.length,4);return Buffer.concat([header,body]);
}
const player=()=>{const parsed=A.parse(fixture());return new A.Player(parsed,{makeCanvas:()=>createCanvas(8,8),decode:b=>loadImage(Buffer.from(b)),cacheSize:2});};
const pixel=(p,x,y)=>Array.from(p.ctx.getImageData(x,y,1,1).data);
test('actual animation frames replace a still image and preserve frame durations',async()=>{const p=player();await p.seek(0);assert.ok(pixel(p,3,3)[0]>200);await p.seek(.15);assert.ok(pixel(p,3,3)[1]>200);assert.ok(pixel(p,0,0)[0]>200);assert.equal(A.frameIndex(p.animation,.6),0);assert.equal(A.frameIndex(p.animation,.31),2);p.destroy();});
test('partial-frame disposal clears only its rectangle before compositing the next frame',async()=>{const p=player();await p.seek(.35);assert.equal(pixel(p,2,2)[3],0);assert.ok(pixel(p,6,6)[2]>200);assert.ok(pixel(p,0,0)[0]>200);await p.seek(0);assert.ok(pixel(p,2,2)[0]>200);assert.ok(p.cache.size<=2);p.destroy();});
test('pause freezes footage and selected speed advances the actual source clock',async()=>{const p=player();await p.seek(0);await p.advance(.15,false,3);assert.equal(p.index,0);await p.advance(.05,true,2);assert.equal(p.index,1);p.destroy();assert.equal(p.cache.size,0);});
test('a new seek during decoding lands on the latest requested frame',async()=>{const p=player();const first=p.request(0);const last=p.request(.35);await Promise.all([first,last]);assert.equal(p.index,2);assert.ok(pixel(p,6,6)[2]>200);p.destroy();});
test('malformed or out-of-bounds animation data is rejected',()=>{const b=fixture();assert.throws(()=>A.parse(b.subarray(0,-4)));const bad=Buffer.from(b),offset=bad.indexOf('ANMF')+8;bad.writeUIntLE(999,offset,3);assert.throws(()=>A.parse(bad),/leaves its canvas/);});
