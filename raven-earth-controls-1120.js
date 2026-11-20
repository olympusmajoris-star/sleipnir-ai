/* One map transform for footage, water masks, and registered terrain lines. */
(function(root) {
  'use strict';
  const finite=(v,d)=>Number.isFinite(Number(v))?Number(v):d;
  function matrix(p,W,H) {
    const a=finite(p['earth.angle'],0)*Math.PI/180, z=Math.max(.1,finite(p['earth.zoom'],1));
    const sx=z*(p['earth.flipX']?-1:1), sy=z*(p['earth.flipY']?-1:1), c=Math.cos(a), s=Math.sin(a);
    const A=c*sx,B=s*sx,C=-s*sy,D=c*sy;
    return [A,B,C,D,W/2+finite(p['earth.x'],0)*W-A*W/2-C*H/2,H/2+finite(p['earth.y'],0)*H-B*W/2-D*H/2];
  }
  const point=(m,x,y)=>[m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]];
  // The last clean frame stays visible until the incoming video can draw.
  function journey(current,incoming,swapping,now,fade,playing,cycle) {
    if (!playing) return { type:'hold' };
    const ended=current.ended||(Number.isFinite(current.duration)&&current.duration>0&&current.currentTime>=current.duration-.001);
    if (!swapping) return ended&&cycle ? {type:'prepare'} : {type:'hold'};
    if (incoming.readyState<2) return {type:'waiting'};
    if (swapping.t0==null) return {type:'start',t0:now};
    const progress=Math.max(0,Math.min(1,(now-swapping.t0)/Math.max(1,fade)));
    return progress>=1 ? {type:'commit',progress:1} : {type:'blend',progress};
  }
  const api=Object.freeze({matrix,point,journey});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RavenEarthControls=api;
})(typeof window!=='undefined'?window:this);
