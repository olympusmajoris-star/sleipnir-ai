/* Explicit WebP frame playback for Canvas, including Firefox. drawImage(img)
 * uses an animation's first frame; decode and compose its individual frames.
 * Container rules: https://developers.google.com/speed/webp/docs/riff_container */
(function(G){'use strict';
const text=(b,i,n=4)=>String.fromCharCode(...b.subarray(i,i+n));
const u24=(b,i)=>b[i]+b[i+1]*256+b[i+2]*65536;
const u32=(b,i)=>(u24(b,i)+b[i+3]*16777216)>>>0;
function parse(input){
 const b=input instanceof Uint8Array?input:new Uint8Array(input);
 if(b.length<20||text(b,0)!=='RIFF'||text(b,8)!=='WEBP'||u32(b,4)+8!==b.length)throw Error('Invalid WebP cloud file.');
 let width=0,height=0,duration=0,background=[0,0,0,0];const frames=[];
 for(let p=12;p+8<=b.length;){
  const size=u32(b,p+4),end=p+8+size,k=text(b,p);if(end>b.length)throw Error('Truncated WebP cloud.');const q=p+8;
  if(k==='VP8X'&&size>=10){width=u24(b,q+4)+1;height=u24(b,q+7)+1;}
  if(k==='ANIM'&&size>=6)background=[b[q+2],b[q+1],b[q],b[q+3]];
  if(k==='ANMF'){
   if(size<24)throw Error('Invalid cloud animation frame.');
   const frame={x:u24(b,q)*2,y:u24(b,q+3)*2,width:u24(b,q+6)+1,height:u24(b,q+9)+1,duration:Math.max(10,u24(b,q+12)),dispose:!!(b[q+15]&1),replace:!!(b[q+15]&2),data:b.subarray(q+16,end),start:duration};
   if(!width||!height||frame.x+frame.width>width||frame.y+frame.height>height)throw Error('Cloud frame leaves its canvas.');
   duration+=frame.duration;frames.push(frame);
  }
  p=end+(size%2);
 }
 if(width*height>16777216||frames.length>1200)throw Error('Cloud animation is too large for this preview.');
 return {width,height,frames,duration,background,bytes:b};
}
function frameWebP(frame){
 // VP8X carries alpha and dimensions for ALPH + VP8 frame payloads.
 const out=new Uint8Array(30+frame.data.length),v=new DataView(out.buffer);
 for(const [offset,s]of [[0,'RIFF'],[8,'WEBP'],[12,'VP8X']])for(let i=0;i<s.length;i++)out[offset+i]=s.charCodeAt(i);
 v.setUint32(4,out.length-8,true);v.setUint32(16,10,true);out[20]=16;
 for(const [offset,value]of [[24,frame.width-1],[27,frame.height-1]]){out[offset]=value&255;out[offset+1]=(value>>>8)&255;out[offset+2]=(value>>>16)&255;}
 out.set(frame.data,30);return out;
}
function frameIndex(animation,seconds){
 if(!animation.frames.length)return -1;
 const ms=((seconds*1000)%animation.duration+animation.duration)%animation.duration;
 let lo=0,hi=animation.frames.length-1;
 while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(animation.frames[mid].start<=ms)lo=mid;else hi=mid-1;}return lo;
}
class Player{
 constructor(animation,{makeCanvas,decode,cacheSize=4}={}){
  this.animation=animation;this.canvas=makeCanvas?makeCanvas():document.createElement('canvas');this.canvas.width=animation.width;this.canvas.height=animation.height;
  this.ctx=this.canvas.getContext('2d');this.decode=decode||((bytes)=>createImageBitmap(new Blob([bytes],{type:'image/webp'})));
  this.cache=new Map();this.cacheSize=cacheSize;this.index=-1;this.wanted=-1;this.pending=null;this.closed=false;this.elapsed=0;
 }
 background(x=0,y=0,w=this.canvas.width,h=this.canvas.height){const [r,g,b,a]=this.animation.background;this.ctx.clearRect(x,y,w,h);if(a){this.ctx.fillStyle=`rgba(${r},${g},${b},${a/255})`;this.ctx.fillRect(x,y,w,h);}}
 async bitmap(i){
  if(this.cache.has(i)){const b=this.cache.get(i);this.cache.delete(i);this.cache.set(i,b);return b;}
  const b=await this.decode(frameWebP(this.animation.frames[i]));if(this.closed){b.close?.();return null;}
  this.cache.set(i,b);while(this.cache.size>this.cacheSize){const key=this.cache.keys().next().value;this.cache.get(key).close?.();this.cache.delete(key);}return b;
 }
 async render(target){
  const frames=this.animation.frames;if(target<this.index){this.index=-1;this.background();}
  // A complete replacement frame has no dependency on preceding frames.
  const last=frames[target];if(last.replace&&last.x===0&&last.y===0&&last.width===this.canvas.width&&last.height===this.canvas.height)this.index=target-1;
  while(this.index<target&&!this.closed){
   const next=this.index+1,frame=frames[next],bitmap=await this.bitmap(next);if(!bitmap||this.closed)return;
   if(this.index<0)this.background();else {const prev=frames[this.index];if(prev.dispose)this.background(prev.x,prev.y,prev.width,prev.height);}
   if(frame.replace)this.ctx.clearRect(frame.x,frame.y,frame.width,frame.height);
   this.ctx.drawImage(bitmap,frame.x,frame.y);this.index=next;
  }
 }
 request(seconds){
  if(this.closed)return Promise.resolve();this.wanted=frameIndex(this.animation,seconds);if(this.wanted<0)return Promise.resolve();
  if(!this.pending&&this.wanted!==this.index){this.pending=(async()=>{while(!this.closed&&this.wanted!==this.index)await this.render(this.wanted);})().finally(()=>{this.pending=null;});}
  return this.pending||Promise.resolve();
 }
 advance(dt,playing=true,speed=1){if(playing)this.elapsed+=dt*speed;return this.request(this.elapsed);}
 seek(seconds=0){this.elapsed=seconds;return this.request(seconds);}
 destroy(){this.closed=true;for(const b of this.cache.values())b.close?.();this.cache.clear();}
}
async function load(url,options={}){
 const response=await (options.fetch||fetch)(url,{signal:options.signal});if(!response.ok)throw Error('Cloud footage could not load ('+response.status+').');
 const parsed=parse(await response.arrayBuffer());if(!parsed.frames.length)return null;
 const p=new Player(parsed,options);try{await p.seek(0);return p;}catch(e){p.destroy();throw e;}
}
const api={parse,frameWebP,frameIndex,Player,load};if(typeof module!=='undefined')module.exports=api;G.StudioCloudPlayback=api;
})(typeof window==='undefined'?globalThis:window);
