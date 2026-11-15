const test=require('node:test'),a=require('node:assert/strict'),fs=require('fs'),C=require('../studio-effects-core'),R=require('../studio-effects-render');
test('defaults retain native entry timing, cloud interval and five-source behavior',()=>{const d=C.defaults();a.equal(d.construction.duration,4.8);a.equal(d.clouds.interval,30);a.equal(d.clouds.jitter,.26);a.deepEqual(d.cloudAssets,{});});
test('clean clamps nonfinite values, preserves valid locks and excludes untrusted cloud URLs',()=>{const d=C.clean({construction:{duration:Infinity,rows:50,ink:'javascript:bad'},locks:{'construction.rows':true,'not.real':true},cloudAssets:{'cloud-mine-billows-v27.webp':{url:'https://example.com/cloud.mp4'}}});a.equal(d.construction.duration,4.8);a.equal(d.construction.rows,16);a.equal(d.construction.ink,'#413b32');a.deepEqual(d.locks,{'construction.rows':true});a.deepEqual(d.cloudAssets,{});});
test('fixed random sequence is reproducible, another seed produces a different sequence',()=>{const d=C.defaults();d.clouds.fixedSeed=true;const v=C.cloudsAt(90,d,3);a.deepEqual(v,C.cloudsAt(90,d,999));d.clouds.seed++;a.notDeepEqual(v,C.cloudsAt(90,d,3));});
test('zero timing variation schedules exactly and cloud objects remain bounded',()=>{const d=C.defaults();d.clouds.jitter=0;const list=C.cloudsAt(31,d);a.equal(list.length,1);a.equal(list[0].age,1);a.equal(C.cloudsAt(29,d).length,0);for(const p of C.cloudsAt(150,d))a.ok(p.width>0&&p.opacity>=0&&p.opacity<=1);});
test('material completes every cell; timing changes preserve topology',()=>{const d=C.defaults();a.equal(C.pieces(1,d).length,28);a.ok(C.pieces(1,d).every(p=>p.reveal===1));a.ok(C.pieces(0,d).every(p=>p.reveal===0));d.construction.rows=12;d.construction.columns=8;a.equal(C.pieces(1,d).length,96);});
test('clip bounds/crops cannot leave source or become empty',()=>{a.deepEqual(C.crop({x:.9,width:5,y:-1,height:.2}),{x:.9,y:0,width:1-.9,height:.2});const t=C.trim({in:50,out:2},10);a.ok(t.end<=10&&t.duration>0);a.throws(()=>C.trim({},NaN));});
test('native exporter rejects wrong source and never modifies an installed widget in place',()=>{const P=require('../native-effects-patcher');a.throws(()=>P.patch('class AsgardRaven {}',{}));});
test('construction renderer reaches a solid selected source without invalid canvas geometry',()=>{const {createCanvas}=require('@napi-rs/canvas'),cv=createCanvas(390,500),x=cv.getContext('2d'),source=createCanvas(120,80),s=source.getContext('2d');s.fillStyle='#f50';s.fillRect(0,0,120,80);for(const t of [0,1,2,4.8])a.ok(Number.isFinite(R.construction(x,390,500,t,C.defaults(),source)));a.ok(cv.toBuffer('image/png').length>200);});
test('background key preserves cloud whites and existing alpha, with a soft edge',()=>{const d=C.defaults(),pixels=new Uint8ClampedArray([0,0,0,255,255,255,255,128,40,40,40,255]);C.keyPixels(pixels,d);a.equal(pixels[3],0);a.equal(pixels[7],128);a.ok(pixels[11]>0&&pixels[11]<255);d.preparation.removeBackground=false;const before=Array.from(pixels);C.keyPixels(pixels,d);a.deepEqual(Array.from(pixels),before);});
function cloudFile({width=640,height=426,frames=2,duration=125}={}){const chunks=[];function chunk(name,bytes){const h=Buffer.alloc(8);h.write(name);h.writeUInt32LE(bytes.length,4);chunks.push(h,bytes);if(bytes.length%2)chunks.push(Buffer.alloc(1));}const size=Buffer.alloc(10);size[0]=18;size.writeUIntLE(width-1,4,3);size.writeUIntLE(height-1,7,3);chunk('VP8X',size);for(let i=0;i<frames;i++){const frame=Buffer.alloc(16);frame.writeUIntLE(duration,12,3);chunk('ANMF',frame);}const body=Buffer.concat([Buffer.from('WEBP'),...chunks]),header=Buffer.alloc(8);header.write('RIFF');header.writeUInt32LE(body.length,4);return Buffer.concat([header,body]);}
test('cloud file validation checks dimensions, changing frames, duration and truncation',()=>{a.deepEqual(C.webpInfo(cloudFile()),{width:640,height:426,frames:2,duration:.25});for(const b of [cloudFile({frames:1}),cloudFile({width:1280}),cloudFile({duration:0}),cloudFile().subarray(0,-1)])a.throws(()=>C.webpInfo(b));});
test('editing preview shows pieces immediately while real timing keeps the chosen delay',()=>{
 const d=C.defaults();d.clouds.interval=44;d.clouds.jitter=0;const before=JSON.stringify(d);
 a.equal(C.cloudsAt(0,d).length,0);a.equal(C.cloudsAt(43,d).length,0);a.equal(C.cloudsAt(45,d)[0].age,1);
 const parts=C.cloudPreviewAt(0,d);a.equal(parts.length,3);a.ok(parts.every(p=>p.opacity>0));a.equal(JSON.stringify(d),before);
 a.equal(C.cloudReadout(20,d).nextIn,24);
});
test('mix and timing readouts reflect the actual conditional probabilities',()=>{
 const d=C.defaults();Object.assign(d.clouds,{smallChance:.68,mediumShare:.26,interval:44,jitter:.08});
 const r=C.cloudReadout(0,d);a.ok(Math.abs(r.small+r.medium+r.large-1)<1e-12);a.ok(Math.abs(r.medium-.0832)<1e-12);a.equal(r.soonest,40.480000000000004);a.equal(r.latest,47.52);
 for(const smallChance of [0,1]){d.clouds.smallChance=smallChance;d.clouds.mediumShare=1;const samples=C.cloudEvents(d,137,200);a.ok(samples.every(p=>p.sizeClass===(smallChance?'small':'medium')));}
});
test('joining moves a piece to another parent and merge duration controls that journey',()=>{
 const d=C.defaults();Object.assign(d.clouds,{smallChance:0,mediumShare:1,absorbChance:1});const e=C.cloudEvents(d,137,1)[0];
 const start=C.cloudParticle(e,e.attach+e.life,d.clouds,true),finish=C.cloudParticle(e,e.attach+e.life+4.2,d.clouds,true);
 a.equal(start.stage,'joining');a.equal(finish.x,195);a.equal(finish.y,155+((e.source+1)%3)*125);a.ok(finish.opacity<1e-12);
 const age=e.attach+e.life+1,fast=C.cloudParticle(e,age,{...d.clouds,merge:.3},true),slow=C.cloudParticle(e,age,{...d.clouds,merge:3},true);
 a.ok(fast.finish>slow.finish);a.notEqual(fast.y,slow.y);
});
test('size, growth, lifetime, dissolve and motion controls change visible preview state',()=>{
 const base=C.defaults(),sample=(key,value,stage='cycle')=>{const d=C.defaults();d.clouds[key]=value;return C.cloudPreviewAt(0,d,137,stage);};
 a.notDeepEqual(sample('size',.25),sample('size',2));a.notDeepEqual(sample('sizeVariation',0),sample('sizeVariation',2));
 a.ok(sample('attach',.2,'grow')[0].growth>sample('attach',3,'grow')[0].growth);
 a.notDeepEqual(sample('life',.2,'drift'),sample('life',3,'drift'));
 a.ok(sample('fade',.2,'dissolve')[0].opacity<sample('fade',3,'dissolve')[0].opacity);
 for(const key of ['speed','wander','turn'])a.notDeepEqual(sample(key,0,'drift'),sample(key,3,'drift'),key);
 const d=C.defaults();d.clouds.size=2;for(let t=0;t<20;t+=.2)for(const p of C.cloudPreviewAt(t,d))a.ok(Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.opacity>=0&&p.opacity<=1);
});
test('cloud renderer paints different frames when size, movement or joining duration changes',()=>{
 const {createCanvas}=require('@napi-rs/canvas'),source=createCanvas(100,68),sx=source.getContext('2d');
 sx.fillStyle='white';sx.beginPath();sx.ellipse(50,34,45,26,0,0,Math.PI*2);sx.fill();sx.fillStyle='#8ab9d4';sx.fillRect(30,25,40,12);
 const render=(key,value,stage)=>{const d=C.defaults();d.clouds[key]=value;const cv=createCanvas(390,500);R.clouds(cv.getContext('2d'),390,500,0,d,[source],137,undefined,null,{editing:true,stage});return cv.toBuffer('image/png');};
 for(const [key,stage,lo,hi]of [['size','cycle',.25,2],['speed','drift',0,3],['merge','join',.2,3],['fade','dissolve',.2,3],['attach','grow',.2,3]])a.notDeepEqual(render(key,lo,stage),render(key,hi,stage),key);
});
test('automatic lettering chooses dark ink over white clouds and white over dark clouds',()=>{
 a.equal(R.readableInk(new Uint8ClampedArray([255,255,255,255,255,255,255,255])),'#101b28');
 a.equal(R.readableInk(new Uint8ClampedArray([12,20,30,255,12,20,30,255])),'#ffffff');
 const {createCanvas}=require('@napi-rs/canvas'),cv=createCanvas(390,500),ctx=cv.getContext('2d'),d=C.defaults();ctx.fillStyle='white';ctx.fillRect(0,0,390,500);
 a.equal(R.cloudText(ctx,'Readable',195,155,1,d.text),'#101b28');d.text.autoContrast=false;d.text.color='#a01040';a.equal(R.cloudText(ctx,'Manual',195,280,1,d.text),'#a01040');
});
test('break-off texture excludes the baked writing plate and has feathered crop edges',()=>{
 const {createCanvas}=require('@napi-rs/canvas'),source=createCanvas(640,426),sx=source.getContext('2d'),cv=createCanvas(390,500),d=C.defaults();
 sx.fillStyle='#ff0000';sx.fillRect(0,80,640,100);sx.fillStyle='white';sx.fillRect(0,180,640,240);
 const patch=R.cloudFragment(cv.getContext('2d'),source,R.cloudCrown(0,-1),d.clouds,0),pixels=patch.getContext('2d').getImageData(0,0,256,160).data;
 a.equal(pixels[3],0);let visible=0,white=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]>100){visible++;if(pixels[i+1]>200&&pixels[i+2]>200)white++;}a.ok(visible>500);a.equal(white,0);
});
test('text and fragment appearance survive cleaning, with safe export ranges',()=>{
 const d=C.clean({text:{size:50,weight:651,autoContrast:false,color:'#e81794',outlineWidth:2,shadowOpacity:.7},clouds:{edgeSoftness:.9,connection:2,density:.4}});
 a.equal(d.text.size,36);a.equal(d.text.weight,700);a.equal(d.text.color,'#e81794');a.equal(d.clouds.edgeSoftness,.45);a.equal(d.clouds.connection,2);a.equal(d.clouds.density,.4);
});
