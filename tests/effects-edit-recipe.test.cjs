const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../studio-effects-core'),R=require('../studio-effects-render');
test('saved video recipes preserve retained source parts and new controls',()=>{
 const raw={media:{url:'https://example.org/source.mp4',in:2,out:4,segments:[{start:0,end:2},{start:4,end:12}],reverse:true,joinBlend:.4,loopBlend:true,zoom:1.4,rotate:30,hue:20},locks:{'media.joinBlend':true}};
 const d=C.clean(raw);assert.deepEqual(d.media.segments,raw.media.segments);assert.equal(d.media.reverse,true);assert.equal(d.media.joinBlend,.4);assert.equal(d.media.zoom,1.4);assert.equal(d.locks['media.joinBlend'],true);assert.deepEqual(C.clean(d),d);assert.equal(raw.media.out,4);
});
test('a cut blends moving frames then continues after the overlapped portion',()=>{
 const m={segments:[{start:0,end:4},{start:8,end:12}],joinBlend:1};
 const middle=C.editedFrame(m,12,3.5,false);assert.equal(middle.time,3.5);assert.equal(middle.nextTime,8.5);assert.equal(middle.mix,.5);assert.equal(middle.total,7);
 const after=C.editedFrame(m,12,4.001,false);assert.ok(Math.abs(after.time-9.001)<1e-8);assert.equal(after.mix,0);assert.equal(C.editedFrame(m,12,8,false).ended,true);
});
test('reverse runs both retained parts backwards and the loop seam has no time reset',()=>{
 const m={segments:[{start:0,end:4},{start:8,end:12}],joinBlend:1,reverse:true};
 const reverse=C.editedFrame(m,12,3.5,false);assert.equal(reverse.time,8.5);assert.equal(reverse.nextTime,3.5);
 m.reverse=false;m.loopBlend=true;const start=C.editedFrame(m,12,0,true),seam=C.editedFrame(m,12,5.5,true),wrapped=C.editedFrame(m,12,6,true);assert.equal(start.time,1);assert.equal(seam.time,11.5);assert.equal(seam.nextTime,.5);assert.equal(seam.mix,.5);assert.equal(seam.total,6);assert.equal(wrapped.time,start.time);
});
test('large blend values never produce an empty span or leave source bounds',()=>{
 const m={segments:[{start:1,end:1.05},{start:8,end:9}],joinBlend:20,loopBlend:true};for(const reverse of [false,true])for(let elapsed=0;elapsed<4;elapsed+=.001){const f=C.editedFrame({...m,reverse},10,elapsed,true);assert.ok(Number.isFinite(f.time)&&f.time>=1&&f.time<=9);assert.ok(f.total>0);assert.ok(f.mix>=0&&f.mix<=1);if(f.nextTime!==null)assert.ok(f.nextTime>=1&&f.nextTime<=9);}
});
test('the same frame renderer changes framing, color and opacity without changing source pixels',()=>{
 const {createCanvas}=require('@napi-rs/canvas'),source=createCanvas(40,40),sourceContext=source.getContext('2d');sourceContext.fillStyle='#a03020';sourceContext.fillRect(0,0,20,40);sourceContext.fillStyle='#2080c0';sourceContext.fillRect(20,0,20,40);const before=source.toBuffer('image/png');
 const paint=changes=>{const cv=createCanvas(60,60),d=C.defaults();Object.assign(d.media,changes);R.mediaFrame(cv.getContext('2d'),60,60,source,d);return cv.toBuffer('image/png');};
 for(const changes of [{flipX:true},{rotate:45},{zoom:.5},{x:20},{y:20},{opacity:.5},{saturation:0},{hue:75}])assert.notDeepEqual(paint({}),paint(changes));assert.deepEqual(source.toBuffer('image/png'),before);
});
