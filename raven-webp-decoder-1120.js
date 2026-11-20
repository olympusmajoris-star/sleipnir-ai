/* Animated WebP fallback for browsers without ImageDecoder (including Safari).
   The browser still decodes each WebP picture; this only handles animation
   frame bounds, timing, blending and disposal. No external decoder service. */
(function(root) {
  'use strict';
  const text=(a,n,len)=>String.fromCharCode(...a.subarray(n,n+len));
  const u24=(a,n)=>a[n]|a[n+1]<<8|a[n+2]<<16;
  function parse(buffer) {
    const a=new Uint8Array(buffer),dv=new DataView(a.buffer,a.byteOffset,a.byteLength);
    if(a.length<12||text(a,0,4)!=='RIFF'||text(a,8,4)!=='WEBP')throw Error('Invalid WebP cloud footage');
    let width=0,height=0;const frames=[];
    for(let at=12;at+8<=a.length;) {
      const kind=text(a,at,4),len=dv.getUint32(at+4,true),start=at+8,end=start+len;
      if(end>a.length)throw Error('Incomplete WebP frame');
      if(kind==='VP8X'&&len>=10){width=u24(a,start+4)+1;height=u24(a,start+7)+1;}
      if(kind==='ANMF'&&len>=16) {
        const x=u24(a,start)*2,y=u24(a,start+3)*2,w=u24(a,start+6)+1,h=u24(a,start+9)+1;
        if(!width||!height||x+w>width||y+h>height)throw Error('Invalid cloud frame bounds');
        frames.push({x,y,w,h,duration:Math.max(100,u24(a,start+12)),dispose:!!(a[start+15]&1),replace:!!(a[start+15]&2),data:a.slice(start+16,end)});
      }
      at=end+(len&1);
    }
    if(!frames.length)throw Error('Animated cloud frames are missing');
    return {width,height,frames};
  }
  function still(frame) {
    // A standalone VP8X header preserves alpha for ALPH + VP8 pictures.
    const header=new Uint8Array(18);header.set([86,80,56,88,10,0,0,0,16]);
    for(const [n,v]of [[12,frame.w-1],[15,frame.h-1]]){header[n]=v&255;header[n+1]=(v>>8)&255;header[n+2]=(v>>16)&255;}
    const out=new Uint8Array(12+header.length+frame.data.length),dv=new DataView(out.buffer);
    out.set([82,73,70,70]);dv.setUint32(4,out.length-8,true);out.set([87,69,66,80],8);out.set(header,12);out.set(frame.data,30);
    return out;
  }
  async function picture(bytes) {
    const blob=new Blob([bytes],{type:'image/webp'});
    if(typeof createImageBitmap==='function')return createImageBitmap(blob);
    const url=URL.createObjectURL(blob),image=new Image();
    try{image.src=url;await image.decode();return image;}finally{URL.revokeObjectURL(url);}
  }
  class Decoder {
    constructor({data}) {
      this.animation=parse(data);this.tracks={ready:Promise.resolve(),selectedTrack:{frameCount:this.animation.frames.length}};
      this.canvas=document.createElement('canvas');this.canvas.width=this.animation.width;this.canvas.height=this.animation.height;
      this.context=this.canvas.getContext('2d');this.last=-1;
    }
    async decode({frameIndex}) {
      const a=this.animation,x=this.context,frames=a.frames,index=Math.max(0,Math.min(frames.length-1,frameIndex));
      let start=this.last+1;
      if(index!==this.last+1) {
        // Seek from the nearest independent full replacement, or the beginning.
        start=0;for(let i=index;i>=0;i--){const f=frames[i];if(f.replace&&f.x===0&&f.y===0&&f.w===a.width&&f.h===a.height){start=i;break;}}
        x.clearRect(0,0,a.width,a.height);this.last=-1;
      }
      for(let i=start;i<=index;i++) {
        const previous=this.last>=0?frames[this.last]:null;
        if(previous?.dispose)x.clearRect(previous.x,previous.y,previous.w,previous.h);
        const f=frames[i],image=await picture(still(f));
        if(f.replace)x.clearRect(f.x,f.y,f.w,f.h);
        x.drawImage(image,f.x,f.y);if(image.close)image.close();this.last=i;
      }
      this.canvas.duration=frames[index].duration*1000;this.canvas.close=()=>{};
      return {image:this.canvas};
    }
  }
  const api=Object.freeze({parse,still,Decoder});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RavenWebP=api;
})(typeof window!=='undefined'?window:this);
