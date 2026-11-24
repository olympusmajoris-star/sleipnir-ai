/* Local cabin-view extension. Coordinates and presentation belong to the host. */
(function (G) {
  'use strict';
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
  const blend=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
  const overlap=(a,b)=>a.x<b.x+b.w-.1&&a.x+a.w>b.x+.1&&a.y<b.y+b.h-.1&&a.y+a.h>b.y+.1;

  function mount({controller:c,media={},geometry:g,root,requestLayout=()=>{},cancelVoice=()=>{},nativeIcon}) {
    const D=c.scene.ownerDocument,scene=c.scene,listeners=[],nodes=[];
    const reduced=G.matchMedia?G.matchMedia('(prefers-reduced-motion: reduce)'):{matches:false};
    const raf=G.requestAnimationFrame?G.requestAnimationFrame.bind(G):fn=>G.setTimeout(()=>fn(Date.now()),16);
    const caf=G.cancelAnimationFrame?G.cancelAnimationFrame.bind(G):G.clearTimeout.bind(G);
    let mode='chat',returnMode='video',view=g.views.chat.slice(),remoteBox=g.remote.slice(),animation=null,frame=0,mirrorFrame=0;
    let disposed=false,stream=null,cameraPending=false,cameraToken=0,objectURL=null,sharedKind='',mediaToken=0,lastProjector=null;

    function node(tag,cls,text,parent=scene){const n=D.createElement(tag);n.className=cls;if(text!==undefined)n.textContent=text;parent.appendChild(n);if(parent===scene)nodes.push(n);return n;}
    function on(target,type,fn,options){target.addEventListener(type,fn,options);listeners.push(()=>target.removeEventListener(type,fn,options));}
    function icon(button,name,size=16){if(button.dataset.icon===name)return;const svg=typeof nativeIcon==='function'?nativeIcon(name,size):null;if(svg){button.replaceChildren(svg);svg.setAttribute('aria-hidden','true');svg.style.pointerEvents='none';button.dataset.icon=name;}}
    function button(cls,label,name,handler,parent=scene){const n=node('button','rc-control '+cls,undefined,parent);n.type='button';n.setAttribute('aria-label',label);n.setAttribute('data-tooltip',label);n.title=label;icon(n,name);on(n,'click',handler);return n;}
    function label(button,text){button.setAttribute('aria-label',text);button.setAttribute('data-tooltip',text);button.title=text;}
    function status(text){statusNode.textContent=text||'';statusNode.hidden=!text||mode==='chat';}
    function safePlay(video){try{const p=video.play();if(p&&p.catch)p.catch(()=>{});}catch(_){} }
    function clearVideo(video){video.pause();video.removeAttribute('src');video.srcObject=null;try{video.load();}catch(_){} }

    const remote=node('div','rc-remote');remote.setAttribute('aria-label','Local call preview; no one is contacted');
    const remoteImage=node('img','rc-remote-image',undefined,remote);remoteImage.alt='Sample caller for the local call preview';remoteImage.hidden=true;
    const remoteVideo=node('video','rc-remote-video',undefined,remote);remoteVideo.muted=true;remoteVideo.defaultMuted=true;remoteVideo.loop=true;remoteVideo.playsInline=true;remoteVideo.hidden=true;
    const remotePlaceholder=node('div','rc-remote-placeholder',undefined,remote);
    const remoteSymbol=typeof nativeIcon==='function'?nativeIcon('Video',16):null;if(remoteSymbol)remotePlaceholder.appendChild(remoteSymbol);
    node('span','rc-remote-title','Call preview',remotePlaceholder);
    const remoteLabel=node('span','rc-remote-label','Demo · no one contacted',remote);
    if(media.callerVideo){remoteVideo.src=media.callerVideo;remoteVideo.hidden=false;remotePlaceholder.hidden=true;}
    else if(media.caller){remoteImage.src=media.caller;remoteImage.hidden=false;remotePlaceholder.hidden=true;}
    on(remoteImage,'error',()=>{remoteImage.hidden=true;remotePlaceholder.hidden=false;});
    on(remoteVideo,'error',()=>{remoteVideo.hidden=true;remotePlaceholder.hidden=false;});

    const mirror=node('div','rc-mirror');mirror.setAttribute('aria-label','Folding mirror for your local camera preview');
    const selfVideos=[],selfPlaceholders=[];
    for(const half of ['upper','lower']){
      const panel=node('div','rc-mirror-panel rc-mirror-'+half,undefined,mirror);
      const video=node('video','rc-self-video',undefined,panel);video.muted=true;video.defaultMuted=true;video.playsInline=true;video.hidden=true;selfVideos.push(video);
      const placeholder=node('span','rc-self-placeholder',half==='upper'?'Your camera':'Camera off',panel);selfPlaceholders.push(placeholder);
    }
    const sideSelf=node('div','rc-side-self');sideSelf.setAttribute('aria-label','Your camera in the passenger side-view mirror');
    const sideSelfVideo=node('video','rc-side-self-video',undefined,sideSelf);sideSelfVideo.muted=true;sideSelfVideo.defaultMuted=true;sideSelfVideo.playsInline=true;sideSelfVideo.hidden=true;selfVideos.push(sideSelfVideo);
    const sideSelfPlaceholder=node('span','rc-side-self-placeholder',undefined,sideSelf);sideSelfPlaceholder.setAttribute('aria-label','Camera off');selfPlaceholders.push(sideSelfPlaceholder);
    const sideCameraIcon=typeof nativeIcon==='function'?nativeIcon('CameraOff',14):null;if(sideCameraIcon)sideSelfPlaceholder.appendChild(sideCameraIcon);

    const sharing=node('div','rc-sharing');sharing.setAttribute('aria-label','Passenger-window local media preview');
    const content=node('div','rc-share-content',undefined,sharing);
    const sharedImage=node('img','rc-shared-image',undefined,content);sharedImage.alt='Selected photo shown locally on the passenger window';sharedImage.hidden=true;
    const sharedVideo=node('video','rc-shared-video',undefined,content);sharedVideo.playsInline=true;sharedVideo.preload='metadata';sharedVideo.hidden=true;
    const placeholder=node('div','rc-share-placeholder',undefined,content);
    node('span','rc-share-prompt','Photo or video',placeholder);
    const sample=node('button','rc-sample','Try sample',placeholder);sample.type='button';sample.setAttribute('aria-label','Show sample road photo on the passenger window');
    const play=button('rc-play','Play shared video','Play',()=>{if(sharedVideo.paused)safePlay(sharedVideo);else sharedVideo.pause();});
    const file=node('input','rc-file-input');file.type='file';file.accept='image/jpeg,image/png,image/webp,image/gif,image/avif,video/*';file.hidden=true;
    const statusNode=node('div','rc-status');statusNode.setAttribute('role','status');statusNode.setAttribute('aria-live','polite');
    const camera=button('rc-camera','Test camera','Camera',testCamera);
    const end=button('rc-end','End local preview and return to chat','PhoneOff',()=>open('chat'));
    const share=button('rc-share','Open passenger window','Image',openShare);
    const back=button('rc-return','Return to call preview','ArrowLeft',()=>open(returnMode));
    const pick=button('rc-pick','Choose a local photo or video','ImagePlus',()=>file.click());

    function active(){return mode!=='chat'&&!disposed;}
    function sync(){
      const onCall=active(),inShare=mode==='sharing';root.dataset.cabinMode=mode;
      remote.hidden=!onCall;remoteLabel.textContent=inShare?'Demo':'Demo · no one contacted';mirror.hidden=!onCall||inShare;sideSelf.hidden=!onCall||!inShare;
      if(!onCall){if(mirrorFrame)caf(mirrorFrame);mirrorFrame=0;mirror.classList.remove('rc-is-open');}
      else if(!mirror.classList.contains('rc-is-open')&&!mirrorFrame){
        if(reduced.matches)mirror.classList.add('rc-is-open');
        else mirrorFrame=raf(()=>{mirrorFrame=raf(()=>{mirrorFrame=0;if(active())mirror.classList.add('rc-is-open');});});
      }
      sharing.hidden=!inShare||!sharedKind;camera.hidden=!onCall||inShare;share.hidden=!onCall||inShare;back.hidden=!inShare;pick.hidden=!inShare;end.hidden=!onCall;
      play.hidden=!inShare||sharedKind!=='video';placeholder.hidden=!!sharedKind;statusNode.hidden=!onCall||!statusNode.textContent;
      for(const [i,video] of selfVideos.entries()){video.hidden=!stream;selfPlaceholders[i].hidden=!!stream;}
      camera.setAttribute('aria-pressed',String(!!stream));camera.setAttribute('aria-busy',String(cameraPending));
      label(camera,cameraPending?'Cancel camera request':stream?'Stop camera':'Test camera');icon(camera,stream?'CameraOff':'Camera');
      if(lastProjector)layout(lastProjector);
    }
    function advance(time){
      if(disposed)return;
      if(!animation)return;
      if(animation.started===null)animation.started=time;
      const t=clamp((time-animation.started)/clamp(Number(g.panDuration)||800,150,4000),0,1),ease=t*t*(3-2*t);
      view=blend(animation.from,animation.to,ease);remoteBox=blend(animation.remoteFrom,animation.remoteTo,ease);
      requestLayout();
      if(t<1)frame=raf(advance);else{animation=null;frame=0;}
    }
    function changeView(name){
      if(frame)caf(frame);frame=0;
      const target=g.views[name]||g.views.video,remoteTarget=name==='sharing'&&g.remoteSharing?g.remoteSharing:g.remote;
      if(reduced.matches){animation=null;view=target.slice();remoteBox=remoteTarget.slice();requestLayout();return;}
      animation={from:view.slice(),to:target.slice(),remoteFrom:remoteBox.slice(),remoteTo:remoteTarget.slice(),started:null};frame=raf(advance);requestLayout();
    }
    function releaseShared(){
      ++mediaToken;sharedVideo.pause();sharedVideo.onloadedmetadata=null;sharedVideo.onerror=null;sharedImage.onload=null;sharedImage.onerror=null;
      sharedImage.removeAttribute('src');clearVideo(sharedVideo);sharedImage.hidden=true;sharedVideo.hidden=true;
      if(objectURL){G.URL.revokeObjectURL(objectURL);objectURL=null;}sharedKind='';
    }
    function open(next){
      if(disposed)return;
      if(next==='sharing'||next==='share'){openShare();return;}
      if(next!=='chat'&&next!=='call'&&next!=='video')return;
      if(next==='chat'){stopDevices();releaseShared();remoteVideo.pause();mode='chat';status('');}
      else{if(mode==='sharing')releaseShared();mode=next;returnMode=next;cancelVoice();status('Local preview · no one contacted.');if(!remoteVideo.hidden)safePlay(remoteVideo);}
      sync();changeView(next==='chat'?'chat':'video');
      if(next==='chat'&&c.input)try{c.input.focus({preventScroll:true});}catch(_){c.input.focus();}
    }
    function openShare(){
      if(disposed)return;
      if(mode==='chat')open('video');
      file.click();
    }
    function activateShare(){
      if(mode!=='sharing')returnMode=mode==='call'?'call':'video';
      mode='sharing';cancelVoice();sync();changeView('sharing');
    }
    function previewPan(progress){
      if(disposed)return;
      const t=clamp(Number(progress)||0,0,1);
      if(frame)caf(frame);frame=0;animation=null;
      if(t===0){mode='chat';remoteVideo.pause();}
      else if(t<=.5){mode='video';returnMode='video';}
      else{if(!sharedKind&&media.poster)useMedia(media.poster,'image','Sample road photo',false);mode='sharing';returnMode='video';}
      const a=t<=.5?g.views.chat:g.views.video,b=t<=.5?g.views.video:g.views.sharing,p=t<=.5?t*2:(t-.5)*2;
      view=blend(a,b,p);remoteBox=t<=.5?g.remote.slice():blend(g.remote,g.remoteSharing||g.remote,p);
      sync();status('');requestLayout();
    }
    async function testCamera(){
      if(disposed||!active())return;
      if(stream||cameraPending){stopDevices();status('Camera off.');return;}
      const devices=G.navigator&&G.navigator.mediaDevices;
      if(!devices||typeof devices.getUserMedia!=='function'){status('Camera access is unavailable here.');return;}
      const token=++cameraToken;cameraPending=true;cancelVoice();status('Waiting for camera permission…');sync();
      try{
        const result=await devices.getUserMedia({video:{facingMode:'user'},audio:false});
        if(disposed||token!==cameraToken||!active()||D.hidden||(c.section&&c.section.hidden)){result.getTracks().forEach(track=>track.stop());if(token===cameraToken&&!disposed){cameraPending=false;sync();}return;}
        stream=result;cameraPending=false;for(const video of selfVideos){video.srcObject=stream;safePlay(video);}status('Your camera stays in this local preview.');sync();
        for(const track of stream.getTracks())on(track,'ended',()=>{if(stream&&stream.getTracks().every(item=>item.readyState==='ended')){stopDevices();status('Camera stopped.');}});
      }catch(error){if(token!==cameraToken||disposed)return;cameraPending=false;status(error&&error.name==='NotAllowedError'?'Camera permission was not granted.':'The camera could not be opened.');sync();}
    }
    function stopDevices(){
      ++cameraToken;cameraPending=false;
      if(stream){const old=stream;stream=null;old.getTracks().forEach(track=>track.stop());}
      for(const video of selfVideos){video.pause();video.srcObject=null;video.hidden=true;}
      sharedVideo.pause();remoteVideo.pause();
      if(!disposed)sync();
    }
    function useMedia(src,kind,name,owned){
      releaseShared();if(owned)objectURL=src;sharedKind=kind;const token=mediaToken;
      const failed=()=>{if(disposed||token!==mediaToken)return;releaseShared();if(mode==='sharing')open(returnMode);status('This file could not be displayed. Choose another photo or video.');sync();requestLayout();};
      if(kind==='image'){sharedImage.alt=name||'Local shared photo';sharedImage.onerror=failed;sharedImage.src=src;sharedImage.hidden=false;}
      else{sharedVideo.onerror=failed;sharedVideo.src=src;sharedVideo.hidden=false;sharedVideo.muted=false;sharedVideo.defaultMuted=false;sharedVideo.load();}
      sync();status('Shown only in this preview.');requestLayout();
    }
    async function shareFile(selected){
      if(disposed||!selected)return false;
      const type=String(selected.type||''),image=/^image\/(jpeg|png|webp|gif|avif)$/i.test(type),video=/^video\//i.test(type);
      if(!image&&!video){status('Choose a JPG, PNG, WebP, GIF, AVIF, or video file.');return false;}
      if(selected.size>(video?100:20)*1024*1024){status(video?'Choose a video under 100 MB.':'Choose a photo under 20 MB.');return false;}
      if(!G.URL||typeof G.URL.createObjectURL!=='function'){status('Local file preview is unavailable here.');return false;}
      let url;try{url=G.URL.createObjectURL(selected);}catch(_){status('This file could not be opened.');return false;}
      useMedia(url,image?'image':'video',selected.name||'Local media',true);activateShare();return true;
    }
    function receiveShared(item){
      if(disposed||!item||typeof item.src!=='string')return false;
      const type=String(item.type||''),kind=type==='image'||/^image\//i.test(type)?'image':type==='video'||/^video\//i.test(type)?'video':'';
      if(!kind){status('The incoming preview needs an image or video.');return false;}
      const src=item.src.trim();let permitted=false;
      if(/^blob:/i.test(src))permitted=true;
      else if(kind==='image'&&/^data:image\/(jpeg|png|webp|gif|avif);base64,/i.test(src))permitted=true;
      else if(kind==='video'&&/^data:video\/(mp4|webm|ogg);base64,/i.test(src))permitted=true;
      else if(src&&!/^[a-z][a-z\d+.-]*:/i.test(src)&&!src.startsWith('//')&&!/[\\\u0000-\u001f]/.test(src))permitted=true;
      else try{const url=new G.URL(src,G.location.href);permitted=/^https?:$/.test(url.protocol)&&url.origin===G.location.origin;}catch(_){}
      if(!permitted){status('Use a local or same-site image or video for this preview.');return false;}
      useMedia(src,kind,item.name||'Incoming shared media',false);activateShare();status('Incoming item · local preview.');return true;
    }
    on(file,'change',()=>{const chosen=file.files&&file.files[0];file.value='';if(chosen)shareFile(chosen);});
    on(sample,'click',()=>{if(media.poster)receiveShared({src:media.poster,type:'image',name:'Incoming road photo'});else openShare();});
    on(sharedVideo,'play',()=>{icon(play,'Pause');label(play,'Pause shared video');play.setAttribute('aria-pressed','true');});
    on(sharedVideo,'pause',()=>{icon(play,'Play');label(play,'Play shared video');play.setAttribute('aria-pressed','false');});
    on(sharedVideo,'ended',()=>{icon(play,'Play');label(play,'Replay shared video');play.setAttribute('aria-pressed','false');});

    function box(n,[x,y,w,h]){Object.assign(n.style,{position:'absolute',left:x+'px',top:y+'px',width:Math.max(0,w)+'px',height:Math.max(0,h)+'px',right:'auto',bottom:'auto'});}
    function bounds(points){const x=Math.min(...points.map(p=>p[0])),y=Math.min(...points.map(p=>p[1]));return [x,y,Math.max(...points.map(p=>p[0]))-x,Math.max(...points.map(p=>p[1]))-y];}
    function polygon(points,rectangle){const [x,y,w,h]=rectangle;return 'polygon('+points.map(p=>((p[0]-x)/w*100)+'% '+((p[1]-y)/h*100)+'%').join(',')+')';}
    // A perspective host can supply four projected corners, TL/TR/BR/BL.
    // This maps media planes without assuming the screen projection is affine.
    function surface(n,source,P,origin=[0,0]){
      const fallback=P.rect(source),quad=typeof P.quad==='function'?P.quad(source):null;
      if(!Array.isArray(quad)||quad.length!==4||quad.some(p=>!Array.isArray(p)||!p.every(Number.isFinite))){n.style.transform='none';box(n,[fallback[0]-origin[0],fallback[1]-origin[1],fallback[2],fallback[3]]);return {width:fallback[2],height:fallback[3],bounds:fallback};}
      const q=quad.map(p=>[p[0]-origin[0],p[1]-origin[1]]),width=Math.max(1,source[2]*P.scale),height=Math.max(1,source[3]*P.scale);
      const [p0,p1,p2,p3]=q,dx1=p1[0]-p2[0],dx2=p3[0]-p2[0],dx3=p0[0]-p1[0]+p2[0]-p3[0],dy1=p1[1]-p2[1],dy2=p3[1]-p2[1],dy3=p0[1]-p1[1]+p2[1]-p3[1];
      const denominator=dx1*dy2-dx2*dy1;
      let a=0,b=0;if(Math.abs(denominator)>.000001&&(Math.abs(dx3)>.000001||Math.abs(dy3)>.000001)){a=(dx3*dy2-dx2*dy3)/denominator;b=(dx1*dy3-dx3*dy1)/denominator;}
      const matrix=[(p1[0]-p0[0]+a*p1[0])/width,(p1[1]-p0[1]+a*p1[1])/width,0,a/width,(p3[0]-p0[0]+b*p3[0])/height,(p3[1]-p0[1]+b*p3[1])/height,0,b/height,0,0,1,0,p0[0],p0[1],0,1];
      box(n,[0,0,width,height]);n.style.transformOrigin='0 0';n.style.transform='matrix3d('+matrix.join(',')+')';return {width,height,bounds:bounds(quad)};
    }
    function hit(button,position,P,size=14,forced){
      const [x,y]=P.point(...position);
      if(x<0||x>P.width||y<0||y>P.height){button.hidden=true;return null;}
      const r=forced||{x:clamp(x-22,0,P.width-44),y:clamp(y-22,0,P.height-44),w:44,h:44};
      box(button,[r.x,r.y,44,44]);button.hidden=false;button.style.setProperty('--rc-icon',size+'px');
      const svg=button.querySelector('svg');if(svg)Object.assign(svg.style,{position:'absolute',left:(x-r.x-size/2)+'px',top:(y-r.y-size/2)+'px',width:size+'px',height:size+'px',pointerEvents:'none'});
      return r;
    }
    function layout(P){
      if(disposed)return;lastProjector=P;
      if(!active()){for(const n of [remote,mirror,sideSelf,sharing,camera,end,share,back,pick,statusNode])n.hidden=true;return;}
      surface(remote,remoteBox,P);remote.style.clipPath=polygon(g.windshield,remoteBox);
      const mappedMirror=surface(mirror,g.mirror,P),mr=mappedMirror.bounds;
      for(let i=0;i<2;i++){
        const panel=selfVideos[i].parentElement;box(panel,[0,mappedMirror.height/2*i,mappedMirror.width,mappedMirror.height/2]);box(selfVideos[i],[0,-mappedMirror.height/2*i,mappedMirror.width,mappedMirror.height]);
      }
      mirror.hidden=mode==='sharing'||mr[0]+mr[2]<=0||mr[0]>=P.width||mr[1]+mr[3]<=0||mr[1]>=P.height;
      if(g.sideMirror&&g.sideMirrorRect){surface(sideSelf,g.sideMirrorRect,P);sideSelf.style.clipPath=polygon(g.sideMirror,g.sideMirrorRect);sideSelf.hidden=mode!=='sharing';}
      else sideSelf.hidden=true;
      const projectedGlass=g.sideWindow.map(p=>P.point(...p)),sr=bounds(projectedGlass);
      box(sharing,sr);sharing.style.clipPath=polygon(projectedGlass,sr);surface(content,g.sideContent,P,[sr[0],sr[1]]);
      const mediaRect=P.rect(g.sideContent);box(play,[clamp(mediaRect[0]+mediaRect[2]-48,0,P.width-44),clamp(mediaRect[1]+mediaRect[3]-48,0,P.height-44),44,44]);
      Object.assign(statusNode.style,{position:'absolute',left:'8px',right:'8px',bottom:'5px',top:'auto',maxHeight:'36px',overflow:'auto'});
      const size=clamp(28*P.scale,10,16);
      camera.hidden=share.hidden=back.hidden=pick.hidden=true;
      if(mode==='sharing'){
        const pts=g.shareKeys.map(p=>P.point(...p)),packed=pts.some((p,i)=>i&&p[0]-pts[i-1][0]<45),left=clamp(pts[0][0]-22,0,P.width-134);
        [back,pick,end].forEach((button,i)=>hit(button,g.shareKeys[i],P,size,packed?{x:left+i*45,y:clamp(pts[i][1]-22,0,P.height-44),w:44,h:44}:undefined));
      }else{
        const points=[g.overhead[0],g.overhead[2]],projected=points.map(p=>P.point(...p)),gap=projected[1][0]-projected[0][0];
        const packed=gap<44,groupLeft=clamp((projected[0][0]+projected[1][0])/2-44,0,P.width-88);
        const rows=points.map((p,i)=>({x:packed?groupLeft+i*44:clamp(projected[i][0]-22,0,P.width-44),y:clamp(projected[i][1]-22,0,P.height-44),w:44,h:44}));
        hit(camera,points[0],P,size,rows[0]);hit(end,points[1],P,size,rows[1]);
        const middle=P.point(...g.overhead[1]),middleRect={x:clamp(middle[0]-22,0,P.width-44),y:clamp(middle[1]-22,0,P.height-44),w:44,h:44};
        if(!rows.some(r=>overlap(r,middleRect)))hit(share,g.overhead[1],P,size);
      }
    }
    on(scene,'keydown',event=>{if(event.key==='Escape'&&active()){event.preventDefault();open(mode==='sharing'?returnMode:'chat');}});
    on(D,'visibilitychange',()=>{if(D.hidden)stopDevices();else if(active()&&!remoteVideo.hidden)safePlay(remoteVideo);});
    on(G,'pagehide',stopDevices);
    root.dataset.cabinMode='chat';for(const n of [remote,mirror,sideSelf,sharing,camera,end,share,back,pick,statusNode])n.hidden=true;
    return {
      getView:()=>view.slice(),open,openShare,shareFile,receiveShared,previewPan,stopDevices,isActive:active,layout,
      dispose(){if(disposed)return;stopDevices();disposed=true;if(frame)caf(frame);if(mirrorFrame)caf(mirrorFrame);animation=null;frame=mirrorFrame=0;releaseShared();remoteVideo.pause();listeners.splice(0).forEach(remove=>remove());nodes.forEach(n=>n.remove());delete root.dataset.cabinMode;}
    };
  }
  G.RavenCabinModes={mount};
})(window);
