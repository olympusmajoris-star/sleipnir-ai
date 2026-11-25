/* Perspective camera over a continuous photographic environment.
   This is rotational reprojection, not a geometric model of a vehicle. */
(function (G) {
  'use strict';
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
  const finite=(n,fallback)=>Number.isFinite(n)?n:fallback;

  function createProjector(geometry,requested,width,height){
    const g=geometry,cfg=g.camera||{},presentation=g.presentation||{},chat=g.views.chat,video=g.views.video,sharing=g.views.sharing;
    const view=Array.isArray(requested)&&requested.length===4&&requested.every(Number.isFinite)&&requested[2]>0&&requested[3]>0?requested.slice():chat.slice();
    width=Math.max(1,finite(width,1));height=Math.max(1,finite(height,width*chat[3]/chat[2]));
    const phone=presentation.device==='iphone',portrait=height>width,zoom=clamp(finite(presentation.zoom,1),1,2.5),controls=!!presentation.controlsVisible;
    const cx=finite(cfg.cx,630),cy=finite(cfg.cy,300),f=Math.max(1,finite(cfg.f,1600));
    const t1=clamp((view[0]-chat[0])/Math.max(1,video[0]-chat[0]),0,1),t2=clamp((view[0]-video[0])/Math.max(1,sharing[0]-video[0]),0,1);
    const videoYaw=finite(cfg.videoYaw,16),sharingYaw=finite(cfg.sharingYaw,58),yaw=(videoYaw*t1+(sharingYaw-videoYaw)*t2)*Math.PI/180,sin=Math.sin(yaw),cos=Math.cos(yaw);
    const z=x=>sin*(x-cx)/f+cos,q=x=>(cos*(x-cx)/f-sin)/z(x),v=(x,y)=>(y-cy)/(f*z(x));
    const mix=(a,b,t)=>a+(b-a)*t;
    function pose(which){
      let x,y,vertical,fraction=.5,lens;
      if(which==='sharing'){
        const qa=q(1270),qb=q(g.width),mid=(qa+qb)/2;x=cx+f*(cos*mid+sin)/(cos-sin*mid);y=310;fraction=.45;
        lens=width/(qb-qa)*zoom;
      }else if(controls&&g.layoutHasTablet){
        x=622;y=portrait?460:570;vertical=portrait?600:500;
        const fitX=(width-24)/Math.max(.0001,q(746)-q(502)),fitY=(height-64)/Math.max(.0001,v(x,751)-v(x,390));
        lens=Math.min(height*f*z(x)/vertical*zoom,fitX,fitY);
      }else if(controls){
        x=810;y=portrait?390:440;vertical=portrait?700:650;lens=height*f*z(x)/vertical*zoom;
      }else if(which==='chat'&&!phone){
        x=630;y=300;fraction=300/817;lens=width/(q(1260)-q(0))*zoom;
      }else{
        x=which==='chat'?810:950;y=which==='chat'?260:255;vertical=which==='chat'?360:290;fraction=which==='chat'?.425:.45;
        lens=height*f*z(x)/vertical*zoom;
      }
      return {x,y,fraction,lens:Math.max(1,lens)};
    }
    const a=pose('chat'),b=pose('video'),d=pose('sharing'),focusX=mix(mix(a.x,b.x,t1),d.x,t2),focusY=mix(mix(a.y,b.y,t1),d.y,t2),fraction=mix(mix(a.fraction,b.fraction,t1),d.fraction,t2);
    let focal=Math.exp(mix(mix(Math.log(a.lens),Math.log(b.lens),t1),Math.log(d.lens),t2)),principalX,principalY,covered=false,lower=0,upper=0;
    const q0=q(0),qW=q(g.width);
    function horizontal(){
      principalX=width/2-focal*q(focusX);
      principalX=clamp(principalX,width-focal*qW,-focal*q0);
    }
    // Increase the field's sampling density until every visible ray reaches
    // the continuous source photo. No empty outside-photo wedges are exposed.
    focal=Math.max(focal,width/Math.max(.0001,qW-q0));
    for(let i=0;i<18;i++){
      horizontal();
      const sourceX=p=>{const u=(p-principalX)/focal;return cx+f*(cos*u+sin)/(cos-sin*u);};
      const maxZ=Math.max(z(sourceX(0)),z(sourceX(width)));
      lower=height-focal*(g.height-cy)/(f*maxZ);upper=focal*cy/(f*maxZ);
      if(lower<=upper+1e-7){covered=true;break;}focal*=1.12;
    }
    horizontal();
    const preferred=height*fraction-focal*v(focusX,focusY),neutral=clamp(preferred,lower,upper),lift=clamp(finite(presentation.windshieldLift,0),-20,20)*(1-t2);
    principalY=clamp(neutral-height*lift/100,lower,upper);
    function point(x,y){const depth=z(x);if(depth<=1e-7)return [NaN,NaN];return [principalX+focal*q(x),principalY+focal*(y-cy)/(f*depth)];}
    function unproject(x,y){const u=(x-principalX)/focal,vv=(y-principalY)/focal,depth=cos-sin*u;if(depth<=1e-7)return [NaN,NaN];return [cx+f*(cos*u+sin)/depth,cy+f*vv/depth];}
    const quad=([x,y,w,h])=>[point(x,y),point(x+w,y),point(x+w,y+h),point(x,y+h)];
    const bounds=points=>{if(!points.length||points.some(p=>!p.every(Number.isFinite)))return [0,0,0,0];const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),x=Math.min(...xs),y=Math.min(...ys);return [x,y,Math.max(...xs)-x,Math.max(...ys)-y];};
    const rect=source=>bounds(quad(source));
    function clip(points){
      let out=points.filter(p=>p.every(Number.isFinite));
      for(const [axis,edge,keep]of [[0,0,1],[0,width,-1],[1,0,1],[1,height,-1]]){
        const input=out;out=[];if(!input.length)break;
        for(let i=0;i<input.length;i++){const p=input[i],before=input[(i+input.length-1)%input.length],inside=(p[axis]-edge)*keep>=0,old=(before[axis]-edge)*keep>=0;if(inside!==old){const k=(edge-before[axis])/(p[axis]-before[axis]);out.push([before[0]+(p[0]-before[0])*k,before[1]+(p[1]-before[1])*k]);}if(inside)out.push(p);}
      }return out;
    }
    function scan(poly,y){
      const xs=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];if(y>=Math.min(a[1],b[1])-.01&&y<=Math.max(a[1],b[1])+.01){if(Math.abs(b[1]-a[1])<.001){xs.push(a[0],b[0]);}else{const t=(y-a[1])/(b[1]-a[1]);xs.push(a[0]+(b[0]-a[0])*t);}}}
      return xs.length?[Math.min(...xs),Math.max(...xs)]:null;
    }
    function inner(poly,maxWidth){
      if(!poly.length)return [10,10,Math.max(0,width-20),0];const b=bounds(poly),ys=[];
      for(let i=0;i<=32;i++)ys.push(b[1]+8+(b[3]-16)*i/32);
      let best=[10,10,Math.max(0,width-20),0],area=-1;
      for(let i=0;i<ys.length-1;i++)for(let j=i+1;j<ys.length;j++){
        const top=scan(poly,ys[i]),bottom=scan(poly,ys[j]);if(!top||!bottom)continue;
        const left=Math.max(10,top[0]+8,bottom[0]+8),right=Math.min(width-10,top[1]-8,bottom[1]-8),w=Math.min(maxWidth,right-left),h=ys[j]-ys[i];
        if(w>0&&w*h>area){area=w*h;best=[left+(right-left-w)/2,ys[i],w,h];}
      }return best;
    }
    const windshieldPolygon=(g.windshield||[]).map(p=>point(...p)),sideWindowPolygon=(g.sideWindowFull||g.sideWindow||[]).map(p=>point(...p)),visibleWindshield=clip(windshieldPolygon),visibleSideWindow=clip(sideWindowPolygon);
    const rawCompose=rect(g.compose),composeWidth=Math.min(width-16,Math.max(100,rawCompose[2])),composeX=clamp(rawCompose[0]+rawCompose[2]/2-composeWidth/2,8,Math.max(8,width-8-composeWidth)),composeY=clamp(rawCompose[1]+rawCompose[3]/2-22,8,Math.max(8,height-52)),composeRect=[composeX,composeY,composeWidth,44];
    let threadRect=inner(visibleWindshield,phone?width-20:460);const threadBottom=Math.min(threadRect[1]+threadRect[3],composeRect[1]-8,height-8);threadRect[3]=Math.max(0,threadBottom-threadRect[1]);
    const sharedRect=bounds(visibleSideWindow),rawDoor=rect([1270,490,640,250]),doorTop=clamp(rawDoor[1],height*.58,height-108),doorRect=[8,doorTop,width-16,Math.max(96,height-doorTop-8)];
    return {point,unproject,quad,rect,scale:width/view[2],width,height,view,progress:t1*.5+t2*.5,threadRect,composeRect,sharedRect,doorRect,windshieldPolygon,sideWindowPolygon,visibleWindshield,visibleSideWindow,tabletRect:rect(g.tabletRect||[514,666,216,72]),tabletBezelRect:rect(g.tabletBezel||[502,653,244,98]),
      camera:{cx,cy,f,yaw,sin,cos,focal,principalX,principalY,covered,windshieldLift:lift,windshieldLiftApplied:(neutral-principalY)/height*100}};
  }
  const vertexSource='attribute vec2 position; varying vec2 uv; void main(){ uv=position*.5+.5; gl_Position=vec4(position,0.,1.); }';
  function fragmentSource(precision){return `precision ${precision} float;
    varying vec2 uv;
    uniform sampler2D photoTexture, maskTexture, roadTexture, materialTexture;
    uniform vec2 viewport, sourceSize, principal, yaw, roadScale;
    uniform vec3 intrinsics, background;
    uniform vec4 glass, leatherColor, woodColor, ledColor;
    uniform float focal, hasRoad, ledBrightness, woodReference;
    vec3 materialTint(vec3 original,vec3 target,float reference){
      float luminance=dot(original,vec3(.2126,.7152,.0722));
      float shade=luminance/reference;
      // The neutral highlight keeps black finishes dimensional. Both terms
      // depend on the original luminance, retaining grain and stitch shading.
      float highlight=pow(clamp(luminance,0.,1.),8.)*.22;
      return clamp(target*shade+vec3(highlight)*(1.-target),0.,1.);
    }
    vec3 lightTint(vec3 original,vec3 target){
      // The default Asgard cyan is an identity transform, preserving the
      // photographed bloom. Other hues retain the original bright light core.
      vec3 baseline=vec3(95./255.,216./255.,1.);
      float energy=max(max(original.r,original.g),original.b);
      float whiteCore=smoothstep(.88,1.,min(min(original.r,original.g),original.b)/max(.001,energy));
      vec3 colored=original*target/baseline;
      return clamp(mix(colored,original,whiteCore*.55)*ledBrightness,0.,1.);
    }
    void main(){
      vec2 pixel=vec2(uv.x,1.-uv.y)*viewport;
      vec3 ray=vec3((pixel-principal)/focal,1.);
      vec3 world=vec3(yaw.y*ray.x+yaw.x,ray.y,-yaw.x*ray.x+yaw.y);
      if(world.z<=.000001){gl_FragColor=vec4(background,1.);return;}
      vec2 source=intrinsics.xy+intrinsics.z*world.xy/world.z;
      if(source.x<0.||source.y<0.||source.x>sourceSize.x||source.y>sourceSize.y){gl_FragColor=vec4(background,1.);return;}
      vec2 photoUV=source/sourceSize;
      photoUV.y=1.-photoUV.y;
      vec4 color=texture2D(photoTexture,photoUV);
      vec3 materials=texture2D(materialTexture,photoUV).rgb;
      color.rgb=mix(color.rgb,materialTint(color.rgb,leatherColor.rgb,.72),materials.r*leatherColor.a);
      color.rgb=mix(color.rgb,materialTint(color.rgb,woodColor.rgb,woodReference),materials.g*woodColor.a);
      color.rgb=mix(color.rgb,lightTint(color.rgb,ledColor.rgb),materials.b*ledColor.a);
      float mask=texture2D(maskTexture,photoUV).a*hasRoad;
      vec2 roadUV=.5+((source-glass.xy)/glass.zw-.5)*roadScale;
      if(mask>.0001&&roadUV.x>=0.&&roadUV.y>=0.&&roadUV.x<=1.&&roadUV.y<=1.){
        roadUV.y=1.-roadUV.y;
        color=mix(color,texture2D(roadTexture,roadUV),mask);
      }
      gl_FragColor=vec4(color.rgb,1.);
    }`;}

  function create({scene,image,road,poster,geometry:g,onReady}){
    const D=scene.ownerDocument,canvas=D.createElement('canvas'),note=D.createElement('div'),listeners=[];
    canvas.className='rc-camera-canvas';canvas.setAttribute('aria-hidden','true');canvas.hidden=true;
    Object.assign(canvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',zIndex:'0',pointerEvents:'none'});
    note.className='rc-camera-unavailable';note.setAttribute('role','status');note.hidden=true;
    Object.assign(note.style,{position:'absolute',zIndex:'12',left:'8px',right:'8px',bottom:'8px',padding:'8px',font:'12px/17px Arial,sans-serif',color:'#e5f6ff',background:'#101b24ef',borderRadius:'6px'});
    scene.prepend(canvas);scene.appendChild(note);
    let gl=null,program=null,buffer=null,photoTexture=null,maskTexture=null,roadTexture=null,materialTexture=null,uniforms={};
    let ready=false,disposed=false,failed=false,error='',photoLoaded=false,hasRoad=false,roadBlocked=false,lastVideoTime=-1;
    let materialsReady=false,materialError='',woodReference=.20;
    let roadSize=[1,1],projection=null,animationFrame=null,lastLiveFrame=0,posterImage=null,lastReported='';
    const maxDpr=clamp(finite(g.camera&&g.camera.maxDpr,2),1,3);
    const on=(target,type,fn,options)=>{if(!target||!target.addEventListener)return;target.addEventListener(type,fn,options);listeners.push(()=>target.removeEventListener(type,fn,options));};
    function readiness(next){
      ready=next;canvas.hidden=!next;
      const detail={ready,supported:!disposed&&!!gl&&!failed,error};
      const signature=JSON.stringify(detail);if(signature===lastReported)return;lastReported=signature;
      if(typeof onReady==='function')onReady(detail);
      if(typeof G.CustomEvent==='function')scene.dispatchEvent(new G.CustomEvent('ravencamera:ready',{detail}));
    }
    function unavailable(message){failed=true;error=message;readiness(false);canvas.hidden=true;note.textContent=message;note.hidden=false;cancelFrames();}
    function compile(type,source){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const log=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw Error(log||'Shader compilation failed.');}return shader;}
    function texture(unit){const t=gl.createTexture();gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,0]));return t;}
    function upload(target,unit,source){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,target);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);}
    function makeMask(){
      const mask=D.createElement('canvas');mask.width=g.width;mask.height=g.height;const ctx=mask.getContext('2d');if(!ctx)throw Error('A source-glass mask could not be created.');
      ctx.clearRect(0,0,g.width,g.height);ctx.fillStyle='#fff';
      if(g.glassPath&&typeof G.Path2D==='function')ctx.fill(new G.Path2D(g.glassPath));
      else{ctx.beginPath();g.windshield.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}
      ctx.globalCompositeOperation='destination-out';
      if(g.wheelOuter&&g.wheelOuter.length===4){ctx.beginPath();ctx.ellipse(...g.wheelOuter,0,0,Math.PI*2);ctx.fill();}
      else if(g.wheelPath){
        // Only the first closed contour is used: the entire rim and interior
        // are excluded from the road, not merely the annular ring.
        const starts=[...g.wheelPath.matchAll(/[Mm]/g)],outer=g.wheelPath.slice(0,starts[1]?starts[1].index:g.wheelPath.length);
        if(typeof G.Path2D==='function')ctx.fill(new G.Path2D(outer));
        else{const n=outer.match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi).map(Number);ctx.beginPath();ctx.ellipse(n[0]-n[2],n[1],n[2],n[3],0,0,Math.PI*2);ctx.fill();}
      }
      ctx.globalCompositeOperation='source-over';return mask;
    }
    function initialize(){
      try{
        gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,premultipliedAlpha:false,preserveDrawingBuffer:false,powerPreference:'low-power'});
        if(!gl){unavailable('Perspective graphics are unavailable in this browser. The initial cabin remains visible.');return;}
        const high=gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT),vs=compile(gl.VERTEX_SHADER,vertexSource),fs=compile(gl.FRAGMENT_SHADER,fragmentSource(high&&high.precision?'highp':'mediump'));
        program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
        if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program)||'Shader linking failed.');
        gl.useProgram(program);buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
        const attribute=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(attribute);gl.vertexAttribPointer(attribute,2,gl.FLOAT,false,0,0);
        for(const name of ['photoTexture','maskTexture','roadTexture','materialTexture','viewport','sourceSize','principal','yaw','roadScale','intrinsics','background','glass','focal','hasRoad','leatherColor','woodColor','ledColor','ledBrightness','woodReference'])uniforms[name]=gl.getUniformLocation(program,name);
        photoTexture=texture(0);maskTexture=texture(1);roadTexture=texture(2);materialTexture=texture(3);gl.uniform1i(uniforms.photoTexture,0);gl.uniform1i(uniforms.maskTexture,1);gl.uniform1i(uniforms.roadTexture,2);gl.uniform1i(uniforms.materialTexture,3);
        upload(maskTexture,1,makeMask());
      }catch(_){unavailable('Perspective graphics could not start in this browser. The initial cabin remains visible.');}
    }
    function loadPhoto(){
      if(disposed||failed||!gl||!image.naturalWidth)return;
      try{
        upload(photoTexture,0,image);photoLoaded=true;materialsReady=false;
        if(materialError&&note.textContent===materialError)note.hidden=true;materialError='';
        if(G.RavenCabinMaterials){
          try{const mask=G.RavenCabinMaterials.makeMask(image,g);upload(materialTexture,3,mask);woodReference=clamp(finite(mask.ravenMaterialReference&&mask.ravenMaterialReference.wood,.20),.08,.75);materialsReady=true;}
          catch(_){materialError='Cabin colors could not be applied to this image.';note.textContent=materialError;note.hidden=false;}
        }
        render();
      }catch(_){unavailable('The cabin image could not be used by the perspective renderer.');}
    }
    function updateMaterials(){
      const state=g.materialColors||{},parse=G.RavenCabinMaterials&&G.RavenCabinMaterials.parseColor;
      const brightness=clamp(finite(state.ledBrightness,1),0,2);
      for(const [key,uniform] of [['leather','leatherColor'],['wood','woodColor'],['led','ledColor']]){
        let value=typeof parse==='function'?parse(state[key]):null;
        if(key==='led'&&!value&&brightness!==1)value=[95/255,216/255,1];
        const color=value||[0,0,0];
        gl.uniform4f(uniforms[uniform],...color,materialsReady&&value?1:0);
      }
      gl.uniform1f(uniforms.ledBrightness,brightness);gl.uniform1f(uniforms.woodReference,woodReference);
    }
    function updateRoad(){
      if(!road||roadBlocked||road.readyState<2||!road.videoWidth||!road.videoHeight)return;
      if(lastVideoTime===road.currentTime&&hasRoad)return;
      try{upload(roadTexture,2,road);roadSize=[road.videoWidth,road.videoHeight];hasRoad=true;lastVideoTime=road.currentTime;}
      catch(_){roadBlocked=true;note.textContent='Road motion could not load in the perspective view.';note.hidden=false;}
    }
    function cancelFrames(){
      if(animationFrame!==null&&typeof G.cancelAnimationFrame==='function')G.cancelAnimationFrame(animationFrame);
      animationFrame=null;
    }
    function schedule(){
      if(disposed||failed||!ready||!road||road.paused||road.ended||D.hidden)return;
      // The source video can be visually hidden because the canvas displays it.
      // A bounded RAF loop does not depend on that video's compositor visibility.
      if(animationFrame===null&&typeof G.requestAnimationFrame==='function')animationFrame=G.requestAnimationFrame(time=>{animationFrame=null;if(time-lastLiveFrame>=1000/30){lastLiveFrame=time;render();}else schedule();});
    }
    function render(){
      if(disposed||failed||!gl||!photoLoaded)return;
      if(!projection){const w=scene.clientWidth,h=scene.clientHeight;if(!w||!h)return;projection=createProjector(g,g.views.chat,w,h);}
      const p=projection,m=p.camera,dpr=Math.min(maxDpr,G.devicePixelRatio||1),pixelWidth=Math.max(1,Math.round(p.width*dpr)),pixelHeight=Math.max(1,Math.round(p.height*dpr));
      if(canvas.width!==pixelWidth)canvas.width=pixelWidth;if(canvas.height!==pixelHeight)canvas.height=pixelHeight;
      updateRoad();gl.viewport(0,0,pixelWidth,pixelHeight);gl.useProgram(program);
      gl.uniform2f(uniforms.viewport,p.width,p.height);gl.uniform2f(uniforms.sourceSize,g.width,g.height);gl.uniform2f(uniforms.principal,m.principalX,m.principalY);gl.uniform2f(uniforms.yaw,m.sin,m.cos);
      gl.uniform3f(uniforms.intrinsics,m.cx,m.cy,m.f);gl.uniform1f(uniforms.focal,m.focal);gl.uniform4f(uniforms.glass,...g.glass);gl.uniform1f(uniforms.hasRoad,hasRoad?1:0);
      updateMaterials();
      const aspect=roadSize[0]/roadSize[1],glassAspect=g.glass[2]/g.glass[3];gl.uniform2f(uniforms.roadScale,Math.min(1,glassAspect/aspect),Math.min(1,aspect/glassAspect));
      const background=g.camera&&g.camera.background||[.025,.035,.045];gl.uniform3f(uniforms.background,...background);
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      if(!ready){if(gl.getError()!==gl.NO_ERROR){unavailable('Perspective graphics could not draw this cabin.');return;}readiness(true);}
      schedule();
    }
    initialize();
    on(image,'load',loadPhoto);on(image,'error',()=>unavailable('The cabin image could not be loaded.'));
    on(road,'loadeddata',()=>{lastVideoTime=-1;render();});on(road,'play',()=>{render();schedule();});on(road,'pause',()=>{cancelFrames();render();});on(road,'seeked',()=>{lastVideoTime=-1;render();});on(road,'timeupdate',()=>{if(road.paused)render();});
    on(D,'visibilitychange',()=>{if(D.hidden)cancelFrames();else render();});
    on(canvas,'webglcontextlost',event=>{event.preventDefault();unavailable('Perspective graphics were interrupted. Reload this preview to restore them.');});
    if(poster&&!failed){posterImage=D.createElement('img');on(posterImage,'load',()=>{if(disposed||failed||!gl||lastVideoTime>=0)return;try{upload(roadTexture,2,posterImage);roadSize=[posterImage.naturalWidth,posterImage.naturalHeight];hasRoad=true;render();}catch(_){}});posterImage.src=poster;}
    if(image.complete&&image.naturalWidth)loadPhoto();
    return {
      get ready(){return ready;},get supported(){return !disposed&&!!gl&&!failed;},get error(){return error;},get materialsReady(){return materialsReady;},get materialError(){return materialError;},canvas,
      project(view,width,height){projection=createProjector(g,view,width,height);render();return projection;},render,
      dispose(){if(disposed)return;disposed=true;cancelFrames();readiness(false);listeners.splice(0).forEach(remove=>remove());if(posterImage)posterImage.removeAttribute('src');if(gl){for(const t of [photoTexture,maskTexture,roadTexture,materialTexture])if(t)gl.deleteTexture(t);if(buffer)gl.deleteBuffer(buffer);if(program)gl.deleteProgram(program);}canvas.remove();note.remove();}
    };
  }
  G.RavenCabinCamera={create,createProjector};
})(window);
