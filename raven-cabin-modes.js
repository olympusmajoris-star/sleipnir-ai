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
    let mode='chat',returnMode='video',view=g.views.chat.slice(),remoteBox=g.remote.slice(),animation=null,frame=0,mirrorFrame=0,transitionId=0;
    let disposed=false,stream=null,cameraPending=false,cameraToken=0,objectURL=null,sharedKind='',mediaToken=0,lastProjector=null;
    let controlsVisible=!!(g.presentation&&g.presentation.controlsVisible),screenOnly=!!(g.presentation&&g.presentation.screenOnly),moreOpen=false,sharedFit='fill',sharedSource='',sharedName='shared-item',followed=false,remoteStream=null;
    let savedScreenOnly=screenOnly,videoFocusProgress=screenOnly?1:0,focusPhase=screenOnly?'focused':'dashboard',focusAnimation=null,focusFrame=0,autoFocusAllowed=false;

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
    const sideSelf=node('div','rc-side-self rc-side-peer');sideSelf.setAttribute('aria-label','Other participant in the folded passenger side-view mirror');
    const sideFold=node('div','rc-side-fold',undefined,sideSelf),sideShell=node('div','rc-side-shell',undefined,sideFold),sideFace=node('div','rc-side-face',undefined,sideFold);
    const sidePeerVideo=node('video','rc-side-peer-video',undefined,sideFace);sidePeerVideo.muted=true;sidePeerVideo.defaultMuted=true;sidePeerVideo.playsInline=true;sidePeerVideo.loop=true;sidePeerVideo.hidden=true;
    const sidePeerImage=node('img','rc-side-peer-image',undefined,sideFace);sidePeerImage.alt='Other participant preview';sidePeerImage.hidden=true;
    const sidePeerPlaceholder=node('span','rc-side-peer-placeholder',undefined,sideFace),sideCameraIcon=typeof nativeIcon==='function'?nativeIcon('UserRound',18):null;if(sideCameraIcon)sidePeerPlaceholder.appendChild(sideCameraIcon);
    node('small','rc-side-peer-label','Other person',sidePeerPlaceholder);

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
    const rewind=button('rc-rewind','Rewind 10 seconds','Rewind',()=>seek(-10)),forward=button('rc-forward','Forward 10 seconds','FastForward',()=>seek(10));
    const keep=button('rc-keep','Keep shared item','Bookmark',keepShared),follow=button('rc-follow','Follow in this preview','UserPlus',()=>{followed=!followed;follow.setAttribute('aria-pressed',String(followed));icon(follow,followed?'UserCheck':'UserPlus');status(followed?'Following · local preview.':'Follow removed · local preview.');});
    const more=button('rc-more','More sharing actions','Ellipsis',()=>{moreOpen=!moreOpen;more.setAttribute('aria-expanded',String(moreOpen));requestLayout();});
    const fit=button('rc-fit','Fit shared item','Scan',()=>{sharedFit=sharedFit==='fill'?'fit':'fill';label(fit,sharedFit==='fill'?'Fit shared item':'Fill passenger window');fit.setAttribute('aria-pressed',String(sharedFit==='fit'));requestLayout();});
    const reveal=button('rc-reveal','Show dashboard controls','PanelTop',()=>setControlsVisible(!controlsVisible,true));node('span','rc-reveal-label','Dashboard',reveal);
    const fullscreen=button('rc-fullscreen','Full screen','Maximize',()=>setScreenOnly(!screenOnly));fullscreen.setAttribute('aria-pressed',String(screenOnly));
    const shareButtons=[rewind,play,forward,keep,more,follow,fit,back,pick,end];
    function seek(delta){if(sharedKind!=='video')return;const end=Number.isFinite(sharedVideo.duration)?sharedVideo.duration:Math.max(0,sharedVideo.currentTime+delta);sharedVideo.currentTime=clamp((Number(sharedVideo.currentTime)||0)+delta,0,end);}
    function keepShared(){if(!sharedSource)return;const a=D.createElement('a');a.href=sharedSource;a.download=sharedName||'shared-item';a.rel='noopener';a.style.display='none';D.body.appendChild(a);a.click();a.remove();status('A local copy was requested.');}
    function setControlsVisible(value,emit=false){controlsVisible=!!value;g.presentation={...(g.presentation||{}),controlsVisible};root.dataset.controlsVisible=String(controlsVisible);reveal.setAttribute('aria-pressed',String(controlsVisible));label(reveal,controlsVisible?'Hide dashboard controls':'Show dashboard controls');if(emit){if(typeof G.CustomEvent==='function')root.dispatchEvent(new G.CustomEvent('raven:controlsvisibility',{detail:{visible:controlsVisible}}));requestLayout();}return controlsVisible;}
    function focusState(){return {phase:focusPhase,progress:videoFocusProgress,screenOnly,targetScreenOnly:focusAnimation?focusAnimation.to===1:screenOnly};}
    function mirrorPresentation(){
      g.presentation={...(g.presentation||{}),videoActive:active()&&mode!=='sharing',screenOnly,videoFocusProgress};
      root.dataset.screenOnly=scene.dataset.screenOnly=String(videoFocusProgress>=.999);
      root.dataset.videoFocus=focusPhase;
      fullscreen.setAttribute('aria-pressed',String(screenOnly));label(fullscreen,screenOnly?'Show dashboard':'Full screen');icon(fullscreen,screenOnly?'Minimize':'Maximize',20);
    }
    function focusBoundary(phase){
      if(focusPhase===phase)return;focusPhase=phase;mirrorPresentation();
      if(typeof G.CustomEvent==='function')root.dispatchEvent(new G.CustomEvent('raven:screenfocuschange',{detail:focusState()}));
    }
    function cancelFocus(){if(focusFrame)caf(focusFrame);focusFrame=0;focusAnimation=null;}
    function focusStep(time){
      if(disposed||!focusAnimation)return;
      const run=focusAnimation;if(run.started===null)run.started=time;
      const elapsed=Math.max(0,time-run.started);
      if(elapsed<run.hold){focusFrame=raf(focusStep);return;}
      if(focusPhase!=='zooming'){screenOnly=run.to===1;focusBoundary('zooming');}
      const t=reduced.matches?1:clamp((elapsed-run.hold)/run.duration,0,1),ease=t*t*(3-2*t);
      videoFocusProgress=run.from+(run.to-run.from)*ease;mirrorPresentation();requestLayout();
      if(t<1)focusFrame=raf(focusStep);
      else{videoFocusProgress=run.to;screenOnly=run.to===1;focusAnimation=null;focusFrame=0;focusBoundary(screenOnly?'focused':'dashboard');mirrorPresentation();requestLayout();}
    }
    function startFocus(target,hold=0){
      cancelFocus();focusAnimation={from:videoFocusProgress,to:target,hold:Math.max(0,hold),duration:clamp(Number(g.videoZoomDuration)||900,150,4000),started:null};
      if(!hold)screenOnly=target===1;focusBoundary(hold?'holding':'zooming');mirrorPresentation();requestLayout();focusFrame=raf(focusStep);
    }
    function beginAutoFocus(){
      if(disposed||!active()||mode==='sharing'||!autoFocusAllowed)return;
      if(g.videoAutoZoom===false){focusBoundary('dashboard');return;}
      startFocus(1,clamp(Number.isFinite(Number(g.videoHold))?Number(g.videoHold):2000,0,15000));
    }
    function pauseVideoFocus(){
      autoFocusAllowed=false;if(!focusAnimation)return focusState();cancelFocus();focusBoundary('paused');requestLayout();return focusState();
    }
    function replayVideoFocus(){
      if(disposed)return false;if(!active()||mode==='sharing'){open('video');return true;}
      if(animation){viewChange(animation,'end',true);if(frame)caf(frame);frame=0;animation=null;view=g.views.video.slice();}
      cancelFocus();videoFocusProgress=0;screenOnly=false;autoFocusAllowed=true;focusBoundary('dashboard');mirrorPresentation();requestLayout();beginAutoFocus();return true;
    }
    function setScreenOnly(value,notify=true){
      const desired=!!value;
      if(!notify){
        if(desired!==savedScreenOnly){savedScreenOnly=desired;autoFocusAllowed=false;cancelFocus();screenOnly=desired;videoFocusProgress=desired?1:0;focusPhase=desired?'focused':'dashboard';}
        mirrorPresentation();return screenOnly;
      }
      savedScreenOnly=desired;autoFocusAllowed=false;screenOnly=desired;
      if(active()&&mode!=='sharing')startFocus(desired?1:0);
      else{cancelFocus();videoFocusProgress=desired?1:0;focusBoundary(desired?'focused':'dashboard');mirrorPresentation();requestLayout();}
      if(typeof G.CustomEvent==='function')root.dispatchEvent(new G.CustomEvent('raven:screenmodechange',{detail:{enabled:desired}}));
      return screenOnly;
    }
    function remoteSource(src,kind){
      clearVideo(remoteVideo);clearVideo(sidePeerVideo);remoteImage.removeAttribute('src');sidePeerImage.removeAttribute('src');remoteStream=null;
      remoteVideo.hidden=sidePeerVideo.hidden=kind!=='video';remoteImage.hidden=sidePeerImage.hidden=kind!=='image';remotePlaceholder.hidden=sidePeerPlaceholder.hidden=!!kind;
      if(kind==='video'){remoteVideo.src=sidePeerVideo.src=src;if(active()){safePlay(remoteVideo);safePlay(sidePeerVideo);}}
      if(kind==='image'){remoteImage.src=sidePeerImage.src=src;}
    }
    function setRemoteStream(value){if(disposed)return false;if(value!==null&&(!value||typeof value.getTracks!=='function'))return false;remoteSource('','');remoteStream=value;if(value){remoteVideo.srcObject=sidePeerVideo.srcObject=value;remoteVideo.hidden=sidePeerVideo.hidden=false;remotePlaceholder.hidden=sidePeerPlaceholder.hidden=true;if(active()){safePlay(remoteVideo);safePlay(sidePeerVideo);}}return true;}
    function setRemoteMedia(item){if(disposed||!item)return false;const kind=item.type==='video'?'video':item.type==='image'?'image':'';if(!kind||!permittedURL(item.src,kind))return false;remoteSource(item.src,kind);return true;}
    if(media.callerVideo)remoteSource(media.callerVideo,'video');else if(media.caller)remoteSource(media.caller,'image');


    function active(){return mode!=='chat'&&!disposed;}
    function viewChange(transition,phase,cancelled=false){
      if(transition&&typeof G.CustomEvent==='function')root.dispatchEvent(new G.CustomEvent('raven:viewchange',{detail:{id:transition.id,view:transition.name,phase,animated:transition.animated,cancelled}}));
    }
    function sync(){
      const onCall=active(),inShare=mode==='sharing';root.dataset.cabinMode=mode;
      g.presentation={...(g.presentation||{}),controlsVisible:onCall&&!inShare?videoFocusProgress<.999:controlsVisible};mirrorPresentation();
      remote.hidden=!onCall||inShare;remoteLabel.textContent='Call preview';mirror.hidden=!onCall||inShare;sideSelf.hidden=!onCall||!inShare;
      if(!onCall){if(mirrorFrame)caf(mirrorFrame);mirrorFrame=0;mirror.classList.remove('rc-is-open');}
      else if(!mirror.classList.contains('rc-is-open')&&!mirrorFrame){
        if(reduced.matches)mirror.classList.add('rc-is-open');
        else mirrorFrame=raf(()=>{mirrorFrame=raf(()=>{mirrorFrame=0;if(active())mirror.classList.add('rc-is-open');});});
      }
      sharing.hidden=!inShare||!sharedKind;camera.hidden=!onCall||inShare;share.hidden=!onCall||inShare;back.hidden=!inShare;pick.hidden=!inShare;end.hidden=!onCall;reveal.hidden=true;fullscreen.hidden=inShare;
      play.hidden=!inShare||sharedKind!=='video';placeholder.hidden=!!sharedKind;statusNode.hidden=!onCall||!statusNode.textContent;
      for(const [i,video] of selfVideos.entries()){video.hidden=!stream;selfPlaceholders[i].hidden=!!stream;}
      camera.setAttribute('aria-pressed',String(!!stream));camera.setAttribute('aria-busy',String(cameraPending));
      label(camera,cameraPending?'Cancel camera request':stream?'Stop camera':'Test camera');icon(camera,stream?'CameraOff':'Camera');
      if(lastProjector)requestLayout();
    }
    function advance(time){
      if(disposed)return;
      if(!animation)return;
      if(animation.started===null)animation.started=time;
      const t=clamp((time-animation.started)/clamp(Number(g.panDuration)||800,150,4000),0,1),ease=t*t*(3-2*t);
      view=blend(animation.from,animation.to,ease);remoteBox=blend(animation.remoteFrom,animation.remoteTo,ease);
      requestLayout();
      if(t<1)frame=raf(advance);else{const completed=animation;animation=null;frame=0;viewChange(completed,'end');if(completed.name==='video')beginAutoFocus();}
    }
    function changeView(name){
      if(animation)viewChange(animation,'end',true);
      if(frame)caf(frame);frame=0;
      const target=g.views[name]||g.views.video,remoteTarget=name==='sharing'&&g.remoteSharing?g.remoteSharing:g.remote;
      const transition={id:++transitionId,name,animated:!reduced.matches};
      animation=null;viewChange(transition,'start');
      if(reduced.matches){view=target.slice();remoteBox=remoteTarget.slice();requestLayout();viewChange(transition,'end');if(name==='video')beginAutoFocus();return;}
      animation={...transition,from:view.slice(),to:target.slice(),remoteFrom:remoteBox.slice(),remoteTo:remoteTarget.slice(),started:null};frame=raf(advance);requestLayout();
    }
    function releaseShared(){
      ++mediaToken;sharedSource='';sharedName='shared-item';sharedVideo.pause();sharedVideo.onloadedmetadata=null;sharedVideo.onerror=null;sharedImage.onload=null;sharedImage.onerror=null;
      sharedImage.removeAttribute('src');clearVideo(sharedVideo);sharedImage.hidden=true;sharedVideo.hidden=true;
      if(objectURL){G.URL.revokeObjectURL(objectURL);objectURL=null;}sharedKind='';
    }
    function open(next){
      if(disposed)return;
      if(next==='sharing'||next==='share'){openShare();return;}
      if(next!=='chat'&&next!=='call'&&next!=='video')return;
      cancelFocus();autoFocusAllowed=next!=='chat';videoFocusProgress=next==='chat'&&savedScreenOnly?1:0;screenOnly=videoFocusProgress===1;focusPhase=screenOnly?'focused':'dashboard';
      if(next==='chat'){stopDevices();releaseShared();remoteVideo.pause();mode='chat';status('');}
      else{if(mode==='sharing')releaseShared();mode=next;returnMode=next;cancelVoice();status('Local preview · no one contacted.');if(!remoteVideo.hidden)safePlay(remoteVideo);if(!sidePeerVideo.hidden)safePlay(sidePeerVideo);}
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
      cancelFocus();autoFocusAllowed=false;
      mode='sharing';cancelVoice();sync();changeView('sharing');
    }
    function previewPan(progress){
      if(disposed)return;
      cancelFocus();autoFocusAllowed=false;videoFocusProgress=0;screenOnly=false;focusPhase='dashboard';
      const t=clamp(Number(progress)||0,0,1);
      if(animation)viewChange(animation,'end',true);
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
      sharedVideo.pause();remoteVideo.pause();sidePeerVideo.pause();
      if(!disposed)sync();
    }
    function useMedia(src,kind,name,owned){
      releaseShared();if(owned)objectURL=src;sharedKind=kind;sharedSource=src;sharedName=name||'shared-item';const token=mediaToken;
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
    function permittedURL(value,kind){
      if(typeof value!=='string')return false;const src=value.trim();
      if(/^blob:/i.test(src))return true;
      if(kind==='image'&&/^data:image\/(jpeg|png|webp|gif|avif);base64,/i.test(src))return true;
      if(kind==='video'&&/^data:video\/(mp4|webm|ogg);base64,/i.test(src))return true;
      if(src&&!/^[a-z][a-z\d+.-]*:/i.test(src)&&!src.startsWith('//')&&!/[\\\u0000-\u001f]/.test(src))return true;
      try{const url=new G.URL(src,G.location.href);return /^https?:$/.test(url.protocol)&&url.origin===G.location.origin;}catch(_){return false;}
    }
    function receiveShared(item){
      if(disposed||!item||typeof item.src!=='string')return false;
      const type=String(item.type||''),kind=type==='image'||/^image\//i.test(type)?'image':type==='video'||/^video\//i.test(type)?'video':'';
      if(!kind){status('The incoming preview needs an image or video.');return false;}
      const src=item.src.trim();if(!permittedURL(src,kind)){status('Use a local or same-site image or video for this preview.');return false;}
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
    function windowSurface(n,poly,P){const finite=poly.filter(p=>p.every(Number.isFinite));if(finite.length<3){n.hidden=true;return [0,0,0,0];}const r=bounds(finite);n.style.transform='none';box(n,r);n.style.clipPath=polygon(finite,r);return r;}
    function nativeHit(button,x,y,P,size=20,adapted=true){
      const source=P.unproject?P.unproject(x,y):[x/P.scale,y/P.scale];
      hit(button,source,P,size,{x:x-22,y:y-22,w:44,h:44});
      button.dataset.cabinAnchorX=String(source[0]);button.dataset.cabinAnchorY=String(source[1]);
      if(adapted)button.dataset.cabinAdapted='true';else delete button.dataset.cabinAdapted;
    }
    function layout(P){
      if(disposed)return;lastProjector=P;const inShare=mode==='sharing',onCall=active(),editing=root.dataset.rceEditing==='true',studioSurface=(g.presentation||{}).studioSurface;
      const progress=P.screenOnly?1:Number.isFinite(P.videoFocusProgress)?P.videoFocusProgress:videoFocusProgress,focused=!inShare&&progress>=.999;
      root.dataset.screenOnly=scene.dataset.screenOnly=String(focused);scene.style.setProperty('--rc-focus-progress',String(progress));
      for(const button of [camera,share,end,back,pick,play,rewind,forward,keep,follow,more,fit,fullscreen]){button.hidden=true;delete button.dataset.cabinAdapted;}
      reveal.hidden=true;
      const compose=P.composeRect||P.rect(g.compose),dash=P.frontControlsRect||[0,0,0,0],compact=!!c.frontControlsAdapted;
      if(!inShare){
        if(compact){nativeHit(fullscreen,dash[0]+dash[2]/2+84,c.frontControlsRows.call,P);}
        else if(progress>0||dash[2]<44||dash[3]<44){nativeHit(fullscreen,P.width-34,clamp(compose[1]-30,30,P.height-30),P);}
        else{nativeHit(fullscreen,clamp(dash[0]+dash[2]-26,30,P.width-30),clamp(dash[1]+dash[3]-26,30,P.height-30),P,20,true);}
      }
      if(!onCall){for(const n of [remote,mirror,sideSelf,sharing,statusNode])n.hidden=true;return;}
      remote.hidden=inShare;
      if(!inShare)windowSurface(remote,P.visibleWindshield,P);
      const glass=P.sharedRect||P.rect(g.sideContent);
      const hinge=P.point(g.mirror[0]+g.mirror[2]/2,g.mirror[1]);
      const mirrorWidth=Math.min(P.width*.32,P.rect([g.mirror[0],g.mirror[1],145,1])[2]);
      const mirrorHeight=mirrorWidth*.65;
      mirror.style.transform='none';
      box(mirror,[hinge[0]-mirrorWidth/2,hinge[1],mirrorWidth,mirrorHeight]);
      mirror.hidden=inShare;
      for(let i=0;i<2;i++){const panel=selfVideos[i].parentElement;box(panel,[0,mirrorHeight/2*i,mirrorWidth,mirrorHeight/2]);box(selfVideos[i],[0,-mirrorHeight/2*i,mirrorWidth,mirrorHeight]);}
      sideSelf.hidden=!inShare;sharing.hidden=!inShare||!sharedKind;
      if(inShare){
        const sr=windowSurface(sharing,P.visibleSideWindow||(g.sideWindowFull||g.sideWindow).map(p=>P.point(...p)),P);
        box(content,[0,0,sr[2],sr[3]]);content.style.transform='none';
        sharedImage.style.objectFit=sharedVideo.style.objectFit=sharedFit==='fit'?'contain':'cover';content.dataset.fit=sharedFit;
        const shell=g.sideMirrorShell||[1260,350,195,105],nativeShell=P.rect(shell),shellWidth=clamp(nativeShell[2],185,275),shellHeight=shellWidth*shell[3]/shell[2];
        const left=clamp(nativeShell[0],8,P.width-shellWidth-8),top=clamp(nativeShell[1],8,P.height-shellHeight-116);
        sideSelf.style.transform='none';box(sideSelf,[left,top,shellWidth,shellHeight]);
        sideShell.style.backgroundImage='url('+JSON.stringify(c.photo.currentSrc||c.photo.src)+')';sideShell.style.backgroundSize=(g.width/shell[2]*100)+'% '+(g.height/shell[3]*100)+'%';sideShell.style.backgroundPosition=(shell[0]/(g.width-shell[2])*100)+'% '+(shell[1]/(g.height-shell[3])*100)+'%';
        const face=g.sideMirrorRect||[1328,367,95,68];Object.assign(sideFace.style,{left:(face[0]-shell[0])/shell[2]*100+'%',top:(face[1]-shell[1])/shell[3]*100+'%',width:face[2]/shell[2]*100+'%',height:face[3]/shell[3]*100+'%',clipPath:polygon(g.sideMirror,face)});
        const fold=clamp(((P.progress||1)-.52)/.35,0,1);sideFold.style.transform='rotateY('+((1-fold)*35)+'deg)';sideSelf.dataset.fold=String(fold);
        if(!sidePeerVideo.hidden)safePlay(sidePeerVideo);
        const door=P.doorRect||[8,P.height*.68,P.width-16,P.height*.32-8],spacing=48,total=5*spacing,leftKeys=clamp(P.point(1430,580)[0]-120,8,P.width-total-8),rowY=clamp(door[1]+12,Math.max(8,sr[1]+sr[3]+8),P.height-114);
        const list=[rewind,play,forward,keep,more,follow,fit,back,pick,end];
        list.forEach((button,i)=>{
          const playback=i<3,secondary=i>=5;if(playback&&sharedKind!=='video'&&!editing)return;if(secondary&&!editing&&!moreOpen)return;
          const x=leftKeys+(i%5)*spacing+22,y=rowY+Math.floor(i/5)*56+22,source=P.unproject?P.unproject(x,y):[x/P.scale,y/P.scale];
          hit(button,source,P,18,{x:x-22,y:y-22,w:44,h:44});button.dataset.cabinAnchorX=String(source[0]);button.dataset.cabinAnchorY=String(source[1]);
        });
      }else if(compact){
        const y=c.frontControlsRows.call;
        [camera,share,end,fullscreen].forEach((button,i)=>nativeHit(button,dash[0]+dash[2]/2+(i-1.5)*56,y,P));
      }else if(progress>0||dash[2]<44||dash[3]<44){
        const y=clamp(compose[1]-30,30,P.height-30);
        [camera,share,end,fullscreen].forEach((button,i)=>nativeHit(button,P.width/2+(i-1.5)*56,y,P));
      }else{
        const overhead=(g.overhead||[]).map(point=>P.point(...point)),overheadVisible=overhead.length===3&&overhead.every(([x,y])=>x>=22&&x<=P.width-22&&y>=22&&y<=P.height-22);
        const spacing=overheadVisible?Math.max(44,Math.abs(overhead[1][0]-overhead[0][0])):48;
        const y=overheadVisible?overhead[1][1]:clamp(compose[1]+compose[3]+30,30,P.height-30);
        const center=overheadVisible?overhead[1][0]:P.width/2;
        [camera,share,end].forEach((button,i)=>nativeHit(button,clamp(center+(i-1)*spacing,30,P.width-30),y,P,18,!overheadVisible));
      }
      if(focused)nativeHit(fullscreen,P.width-30,P.height-30,P);
      Object.assign(statusNode.style,{position:'absolute',left:'8px',right:'auto',bottom:'5px',top:'auto',width:Math.max(80,P.width-128)+'px',maxHeight:'36px',overflow:'auto'});statusNode.hidden=editing||!onCall||!statusNode.textContent||focused;
    }
    on(scene,'keydown',event=>{if(event.key==='Escape'&&active()){event.preventDefault();open(mode==='sharing'?returnMode:'chat');}});
    on(D,'visibilitychange',()=>{if(D.hidden)stopDevices();else if(active()&&!remoteVideo.hidden)safePlay(remoteVideo);});
    on(G,'pagehide',stopDevices);
    root.dataset.cabinMode='chat';mirrorPresentation();for(const n of [remote,mirror,sideSelf,sharing,camera,end,share,back,pick,statusNode])n.hidden=true;
    return {
      getView:()=>view.slice(),open,openShare,shareFile,receiveShared,previewPan,stopDevices,isActive:active,layout,setControlsVisible,getControlsVisible:()=>controlsVisible,setScreenOnly,getScreenOnly:()=>screenOnly,isScreenOnly:()=>screenOnly,replayVideoFocus,pauseVideoFocus,getVideoFocusState:focusState,setRemoteStream,setRemoteMedia,
      dispose(){if(disposed)return;cancelFocus();stopDevices();disposed=true;if(frame)caf(frame);if(mirrorFrame)caf(mirrorFrame);animation=null;frame=mirrorFrame=0;releaseShared();remoteVideo.pause();sidePeerVideo.pause();remoteVideo.srcObject=sidePeerVideo.srcObject=null;remoteStream=null;listeners.splice(0).forEach(remove=>remove());nodes.forEach(n=>n.remove());delete root.dataset.cabinMode;delete root.dataset.screenOnly;delete root.dataset.videoFocus;}
    };
  }
  G.RavenCabinModes={mount};
})(window);
