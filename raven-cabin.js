(function () {
  'use strict';
  const root=document.getElementById('raven-cabin');
  if(!root)return;
  const media=JSON.parse(document.getElementById('rw-media').textContent);
  const template=document.getElementById('rw-phone-template');
  const services=window.RavenWindshieldServices||{};
  const state={opacity:100,font:17,leading:22,gap:4,blur:4,speed:1};
  const cars={cabin:window.RavenCabinGeometry};
  if(!cars.cabin)return;
  const initial=[['in','Still meeting tonight?'],['out','Definitely.'],['in','Same place as last time?'],['out','That works.'],['in','I just got here.'],['out','Leaving now.'],['in','Where are you?'],['out','On my way.'],['in','Want me to wait?'],['out','Yes, five minutes.'],['in','I’ll be outside.'],['out','See you there.']];
  const model={messages:initial.map(([direction,text],i)=>({id:i+1,direction,text,language:'en'})),draft:'',attachment:null,target:'en-US',dictationLanguage:'en-US',autoTranslate:false,autoRead:false,translations:new Map(),translationVersion:0};
  const controllers=[];
  let active=null,voice=null,toastTimer=0,translateRun=0,disposed=false;
  const nativeTranslators=new Map();
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const ns='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(ns,'svg');svg.setAttribute('width','0');svg.setAttribute('height','0');svg.setAttribute('aria-hidden','true');svg.style.position='absolute';
  const defs=document.createElementNS(ns,'defs');svg.appendChild(defs);root.after(svg);
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
  function nativeIcon(name,size){
    const library=window.lucide,definition=library&&((library.icons&&library.icons[name])||library[name]);
    if(!Array.isArray(definition))return null;
    const build=([tag,attributes,children])=>{const node=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attributes||{}))node.setAttribute(key,String(value));for(const child of children||[])node.appendChild(build(child));return node;};
    const icon=build(definition);icon.setAttribute('width',String(size));icon.setAttribute('height',String(size));icon.setAttribute('aria-hidden','true');return icon;
  }
  const shortLanguage=language=>String(language||'en').split('-')[0];
  const translated=message=>model.translations.get(message.id+'|'+model.target);
  const allDrafts=()=>controllers.forEach(c=>c.syncDraft());
  const status=text=>{controllers.forEach(c=>{c.status.textContent=text||'';if(c.layout)c.layout();});};
  function toast(text){if(!active)return;clearTimeout(toastTimer);active.toast.textContent=text;active.toast.hidden=false;toastTimer=setTimeout(()=>{controllers.forEach(c=>c.toast.hidden=true);},4500);}
  function voiceStatus(message){const text=typeof message==='string'?message:message.message||'';controllers.forEach(c=>c.radioStatus.textContent=text);if(active&&!active.panel){active.status.textContent=text;if(active.layout)active.layout();}}
  function updateVoice(s){
    s=s||(voice&&voice.getState?voice.getState():{});
    const busy=!!s.mic&&s.mic!=='idle',speaking=!!s.speech&&s.speech!=='idle',paused=s.speech==='paused';
    controllers.forEach(c=>{
      c.dictate.textContent=busy?'Stop dictation':'Talk to text';c.dictate.setAttribute('aria-pressed',String(busy));c.dictateShort.setAttribute('aria-label',busy?'Stop dictation':'Talk to text');c.dictateShort.setAttribute('data-tooltip',busy?'Stop dictation':'Talk to text');c.dictateShort.setAttribute('aria-pressed',String(busy));
      c.read.textContent=speaking?(paused?'Resume reading':'Reading…'):'Read messages';c.read.setAttribute('aria-pressed',String(speaking));
      c.pauseSpeech.disabled=!speaking;c.pauseSpeech.textContent=paused?'Resume':'Pause';c.stopSpeech.disabled=!speaking&&!busy;
      c.radioLauncher.setAttribute('data-tooltip',speaking?'Reading aloud · voice settings':'Read aloud');
    });
  }
  function refreshVoices(){
    if(!voice||!voice.getVoices)return;
    const voices=voice.getVoices();
    controllers.forEach(c=>{const old=c.voiceSelect.value;c.voiceSelect.replaceChildren(el('option','', 'Device default'));c.voiceSelect.firstChild.value='';for(const v of voices){const o=el('option','',v.name+' · '+v.lang);o.value=v.voiceURI||v.name;c.voiceSelect.appendChild(o);}c.voiceSelect.value=old;});
  }
  function startDictation(c){
    active=c;if(!voice){voiceStatus('Dictation is unavailable here. You can use your keyboard microphone.');return;}
    const s=voice.getState();if(s.mic==='transcribing'){voice.cancelListening();return;}if(s.mic!=='idle'){voice.stopListening();return;}
    c.open('message');voice.setLanguage(model.dictationLanguage);voice.startListening({lang:model.dictationLanguage});
  }
  function readConversation(c){
    active=c;if(!voice){voiceStatus('Reading aloud is unavailable in this browser.');return;}
    const s=voice.getState();if(s.speech==='paused'){voice.resumeSpeaking();return;}
    const last=model.messages.slice(-6).map(m=>(m.direction==='in'?'Alex: ':'You: ')+(translated(m)||m.text)+(m.image?' Photo.':'')).join('\n');
    voice.speak(last,{lang:model.target});
  }
  async function translateText(message,target){
    if(shortLanguage(message.language)===shortLanguage(target))return message.text;
    if(typeof services.translate==='function'){
      const response=await services.translate({text:message.text,sourceLanguage:message.language||'auto',targetLanguage:shortLanguage(target)});
      const result=typeof response==='string'?response:response.translatedText;
      if(typeof result!=='string'||!result.trim())throw Error('Translation returned no text. Your original is kept.');return result;
    }
    if(typeof window.Translator==='undefined')throw Error('Translation needs the connected Raven preview in this browser. Original messages are still available.');
    if(!message.language)throw Error('Choose the message language before using this browser’s translator.');
    const pair=shortLanguage(message.language)+'|'+shortLanguage(target);
    let translator=nativeTranslators.get(pair);
    if(!translator){const options={sourceLanguage:shortLanguage(message.language),targetLanguage:shortLanguage(target)};const availability=await window.Translator.availability(options);if(availability==='unavailable')throw Error('This language pair is unavailable in this browser.');translator=await window.Translator.create(options);nativeTranslators.set(pair,translator);}
    return translator.translate(message.text);
  }
  async function translateConversation(){
    const run=++translateRun,target=model.target;
    controllers.forEach(c=>{c.translateNow.disabled=true;c.translationStatus.textContent='Translating…';});
    try{
      for(const m of model.messages.filter(m=>m.direction==='in'&&m.text)){
        if(run!==translateRun||disposed)return;
        const key=m.id+'|'+target;if(model.translations.has(key))continue;
        const result=await translateText(m,target);if(run!==translateRun||disposed)return;
        if(result!==m.text)model.translations.set(key,result);
      }
      if(run!==translateRun)return;
      controllers.forEach(c=>{c.renderMessages();c.translationStatus.textContent='Translation ready. Open Original below a translated message to compare.';});
      if(model.messages.every(m=>m.direction!=='in'||shortLanguage(m.language)===shortLanguage(target)))controllers.forEach(c=>c.translationStatus.textContent='These incoming messages are already in your selected language.');
    }catch(error){if(run===translateRun){model.autoTranslate=false;controllers.forEach(c=>{c.autoTranslate.checked=false;c.translationStatus.textContent=error.message||'Translation is unavailable. Original messages are kept.';});}}
    finally{if(run===translateRun)controllers.forEach(c=>c.translateNow.disabled=false);}
  }
  function submit(c){
    const text=model.draft.trim(),attachment=model.attachment;if(!text&&!attachment)return;
    if(voice)voice.cancelListening();
    model.messages.push({id:Date.now(),direction:'out',text,image:attachment&&attachment.src,imageName:attachment&&attachment.name,language:shortLanguage(model.dictationLanguage)});
    model.draft='';model.attachment=null;allDrafts();controllers.forEach(item=>{item.renderMessages();item.newest();});
    c.close(false);c.input.focus();
  }
  function attach(c,src,name){model.attachment={src,name};allDrafts();c.open('message');}
  function chooseFile(c,file){
    if(!file)return;
    if(file.size>10*1024*1024){status('Choose a photo under 10 MB.');return;}
    if(!/^image\/(jpeg|png|webp|gif|avif)$/i.test(file.type)){status('Use a JPG, PNG, WebP, GIF or AVIF photo.');return;}
    const reader=new FileReader();reader.onerror=()=>status('That photo could not be opened. Choose another.');
    reader.onload=()=>{if(disposed)return;const picture=new Image();picture.onerror=()=>status('That photo format could not be displayed.');picture.onload=()=>attach(c,reader.result,file.name||'Photo');picture.src=String(reader.result);};reader.readAsDataURL(file);
  }
  for(const mount of root.querySelectorAll('.rw-mount')){
    mount.appendChild(template.content.cloneNode(true));
    const phone=mount.querySelector('.rw-phone'),section=mount.closest('[data-variant]'),key=mount.dataset.car,car=cars[key];
    phone.dataset.car=key;
    const q=selector=>phone.querySelector(selector),qa=selector=>Array.from(phone.querySelectorAll(selector));
    const c={phone,section,key,car,scene:q('.rw-scene'),photo:q('.rw-dash'),wheel:q('.rw-wheel'),glass:q('.rw-glass'),tray:q('.rw-tray'),video:q('.rw-road'),thread:q('.rw-thread'),compose:q('.rw-compose'),console:q('.rw-console'),input:q('textarea'),status:q('.rw-console-status'),toast:q('.rw-toast'),radioStatus:q('.rw-radio-status'),radioLauncher:q('.rw-radio'),dictate:q('.rw-dictate'),dictateShort:q('.rw-dictate-short'),read:q('.rw-read'),pauseSpeech:q('.rw-pause-speech'),stopSpeech:q('.rw-stop-speech'),voiceSelect:q('.rw-voice'),translationStatus:q('.rw-translation-status'),translateNow:q('.rw-translate-now'),autoTranslate:q('.rw-auto-translate'),panel:null,mediaStream:null,callToken:0};
    const makeClip=(id,d,transform)=>{const clip=document.createElementNS(ns,'clipPath');clip.id=id;clip.setAttribute('clipPathUnits','objectBoundingBox');const path=document.createElementNS(ns,'path');path.setAttribute('d',d);path.setAttribute('clip-rule','evenodd');path.setAttribute('fill-rule','evenodd');path.setAttribute('transform',transform);clip.appendChild(path);defs.appendChild(clip);return 'url(#'+id+')';};
    const [glassX,glassY,glassW,glassH]=car.glass;
    const glassClip=makeClip('rw-cabin-glass',car.glassPath,'scale('+(1/glassW)+' '+(1/glassH)+') translate('+(-glassX)+' '+(-glassY)+')');
    c.video.style.clipPath=glassClip;c.glass.style.clipPath=glassClip;
    c.wheel.style.clipPath=makeClip('rw-cabin-wheel',car.wheelPath,'scale('+(1/car.width)+' '+(1/car.height)+')');
    c.photo.src=media[key];c.wheel.src=media[key];c.photo.alt='Original Raven cabin with the complete steering wheel and a continuous passenger door and side window.';
    c.video.src=media.road;c.video.poster=media.poster;c.video.muted=true;c.video.defaultMuted=true;c.video.playbackRate=state.speed;q('.rw-sample-photo img').src=media.poster;
    if(window.RavenCabinCamera)c.camera=window.RavenCabinCamera.create({
      scene:c.scene,image:c.photo,road:c.video,poster:media.poster,geometry:car,
      onReady:detail=>{if(disposed)return;c.scene.dataset.cameraReady=String(detail.ready);if(!detail.ready&&c.cabin&&c.cabin.isActive())c.cabin.open('chat');if(c.layout)c.layout();}
    });
    let wantsMotion=!reduced.matches,playRequest=0,wasVisible=false,viewed=false,lastLauncher=null;
    const nearBottom=()=>c.thread.scrollHeight-c.thread.scrollTop-c.thread.clientHeight<65;
    c.newest=()=>{c.thread.scrollTop=c.thread.scrollHeight;q('.rw-latest').hidden=true;};
    c.renderMessages=()=>{
      const pinned=nearBottom(),old=c.thread.scrollTop;c.thread.replaceChildren();
      for(const m of model.messages){const bubble=el('article','rw-message'+(m.direction==='out'?' rw-out':''));bubble.setAttribute('aria-label',m.direction==='in'?'Alex':'You');
        if(m.image){const image=el('img');image.src=m.image;image.alt=m.imageName||'Shared photo';image.onload=()=>{if(pinned)c.newest();};bubble.appendChild(image);}
        const protectText=node=>{const color=m.direction==='out'?'#ffffff':'#101b28';node.style.setProperty('color',color,'important');node.style.setProperty('-webkit-text-fill-color',color,'important');node.style.setProperty('opacity','1','important');node.style.setProperty('margin','0','important');node.style.setProperty('font-size','var(--rw-font)','important');node.style.setProperty('line-height','var(--rw-leading)','important');node.style.setProperty('font-family','Arial, sans-serif','important');node.style.setProperty('font-weight','400','important');};
        const tx=translated(m);if(m.text){const text=el('p','',tx||m.text);text.lang=tx?model.target:m.language;protectText(text);bubble.appendChild(text);}
        if(tx){const details=el('details');details.appendChild(el('summary','cursor-interaction','Original'));const original=el('p','',m.text);original.lang=m.language;protectText(original);details.appendChild(original);bubble.appendChild(details);}
        c.thread.appendChild(bubble);
      }if(pinned)c.newest();else c.thread.scrollTop=old;
    };
    c.syncDraft=()=>{if(c.input.value!==model.draft)c.input.value=model.draft;q('.rw-send').disabled=!model.draft.trim()&&!model.attachment;const a=q('.rw-attachment');a.hidden=!model.attachment;if(model.attachment){a.querySelector('img').src=model.attachment.src;q('.rw-attachment-name').textContent=model.attachment.name;}q('.rw-draft-status').textContent='';c.input.style.height='22px';if(c.layout)c.layout();};
    c.layout=()=>{
      const w=c.scene.clientWidth,h=c.scene.clientHeight;if(!w||!h)return;
      const view=c.cabin?c.cabin.getView():car.views.chat;
      const base=w/car.views.chat[2];
      const fallback={point:(x,y)=>[x*base,y*base],rect:([x,y,width,height])=>[x*base,y*base,width*base,height*base],scale:base,width:w,height:h,view:car.views.chat};
      const projection=c.camera&&c.camera.supported?c.camera.project(view,w,h):fallback;
      const {point,rect}=projection;
      c.scene.dataset.cameraReady=String(!!(c.camera&&c.camera.ready));
      const inCall=!!(c.cabin&&c.cabin.isActive()),mode=root.dataset.cabinMode==='call'?'video':root.dataset.cabinMode||'chat',presentation=car.presentation||{};
      const studioDashboard=['cabin','dashboard'].includes(presentation.studioSurface);
      const focusProgress=projection.screenOnly?1:Number.isFinite(projection.videoFocusProgress)?projection.videoFocusProgress:presentation.screenOnly?1:0;
      const showDashboard=mode!=='sharing'&&focusProgress<.999;
      const box=(node,left,top,width,height)=>Object.assign(node.style,{left:left+'px',top:top+'px',width:width+'px',height:height+'px',right:'auto',bottom:'auto'});
      const polygon=(node,source)=>{if(!node||!source)return;const points=source.map(p=>point(...p)),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),left=Math.min(...xs),top=Math.min(...ys),width=Math.max(...xs)-left,height=Math.max(...ys)-top;box(node,left,top,width,height);node.style.clipPath='polygon('+points.map(([x,y])=>((x-left)/width*100)+'% '+((y-top)/height*100)+'%').join(',')+')';};
      // Static first-paint layers retain the front view until the camera renderer is ready.
      box(c.photo,...fallback.rect([0,0,car.width,car.height]));box(c.wheel,...fallback.rect([0,0,car.width,car.height]));
      box(c.video,...fallback.rect(car.glass));box(c.glass,...fallback.rect(car.glass));
      polygon(q('.rw-input-surface'),car.rail);for(const pad of qa('[data-pad]')){pad.hidden=!showDashboard;polygon(pad,car.pads[pad.dataset.pad]);}for(const screen of qa('[data-screen]')){screen.hidden=!showDashboard||screen.dataset.screen==='tablet'&&!car.layoutHasTablet;polygon(screen,car.screens[screen.dataset.screen]);}

      // Tap targets stay native-sized; only the photo coordinates scale.
      const [barX,barY,barW,barH]=projection.composeRect||rect(car.compose);
      const composerX=Math.max(8,barX),composerRight=Math.min(w-8,barX+barW),composerY=barY+barH/2;
      const composerWidth=Math.max(0,composerRight-composerX),sendX=composerRight-22;
      const sendLeft=clamp(sendX-22,0,w-44),sendTop=projection.composeRect?composerY-22:Math.min(composerY-22,point(0,515)[1]-55),sendBottom=sendTop+44;
      box(c.compose,composerX,composerY-22,composerWidth,44);
      c.compose.hidden=mode==='sharing'||composerWidth<100||composerY<22||composerY>h-22;
      q('.rw-input-surface').hidden=c.compose.hidden;
      if(projection.composeRect){box(q('.rw-input-surface'),composerX-3,composerY-25,composerWidth+6,50);q('.rw-input-surface').style.clipPath='none';}
      c.input.style.width=Math.max(0,sendLeft-composerX-5)+'px';
      const send=q('.rw-send');box(send,sendLeft-composerX,sendTop-(composerY-22),44,44);
      if(projection.unproject){const anchor=projection.unproject(sendX,composerY);send.dataset.cabinAnchorX=String(anchor[0]);send.dataset.cabinAnchorY=String(anchor[1]);send.dataset.cabinAdapted='true';}
      const sendIcon=send.querySelector('svg');if(sendIcon)Object.assign(sendIcon.style,{left:(sendX-sendLeft-9)+'px',top:(composerY-sendTop-9)+'px'});

      const front=projection.frontControlsRect||[0,0,0,0],nativeFront=(inCall||!studioDashboard&&(presentation.device==='iphone'||projection.studioSurface==='windshield'||w<600&&h>w))&&front[2]>=264&&front[3]>=104;
      c.frontControlsAdapted=showDashboard&&nativeFront;
      for(const button of qa('[data-control]')){delete button.dataset.cabinAdapted;delete button.dataset.cabinUnavailable;}
      if(c.frontControlsAdapted){
        const keys=['image','mic','call','video','radio','language'],spacing=Math.min(60,(front[2]-44)/5),center=front[0]+front[2]/2,y=front[1]+28;
        for(const button of qa('[data-control]')){
          const index=keys.indexOf(button.dataset.control);if(index<0){button.hidden=true;continue;}
          const x=center+(index-2.5)*spacing,anchor=projection.unproject?projection.unproject(x,y):car.slots[button.dataset.control];
          box(button,x-22,y-22,44,44);button.hidden=false;button.style.setProperty('--rw-icon','20px');
          button.dataset.cabinAnchorX=String(anchor[0]);button.dataset.cabinAnchorY=String(anchor[1]);button.dataset.cabinAdapted='true';delete button.dataset.tabletControl;
          const icon=button.querySelector('svg');if(icon)Object.assign(icon.style,{left:'12px',top:'12px'});
          if(button.dataset.control==='image'){button.setAttribute('aria-label',inCall?'Share on passenger window':'Attach photo');button.setAttribute('data-tooltip',inCall?'Share':'Photos');}
        }
      }else if(car.layoutHasTablet){
        const keys=car.tabletControlIds||['image','mic','call'],points=keys.map(name=>point(...car.slots[name]));
        const centerX=points.reduce((n,p)=>n+p[0],0)/points.length,centerY=points.reduce((n,p)=>n+p[1],0)/points.length;
        const dx=Math.max(44,Math.abs(points[1][0]-points[0][0]));
        const left=clamp(centerX-(keys.length-1)*dx/2-22,0,Math.max(0,w-(keys.length-1)*dx-44));
        for(const button of qa('[data-control]')){
          const name=button.dataset.control,slot=car.slots[name],i=keys.indexOf(name);button.hidden=!slot||!showDashboard;if(!slot)continue;
          const nativePoint=point(...slot);
          if(!studioDashboard&&(nativePoint[0]<0||nativePoint[0]>w||nativePoint[1]<0||nativePoint[1]>h)){button.hidden=true;continue;}
          const x=i<0?nativePoint[0]:left+i*dx+22,y=i<0?nativePoint[1]:centerY;
          if(x<0||x>w||y<0||y>h){button.hidden=true;continue;}
          const buttonLeft=clamp(x-22,0,w-44),buttonTop=clamp(y-22,0,h-44);
          box(button,buttonLeft,buttonTop,44,44);button.style.setProperty('--rw-icon','18px');
          if(i<0)delete button.dataset.tabletControl;else button.dataset.tabletControl='true';
          const anchor=projection.unproject?projection.unproject(x,y):slot;button.dataset.cabinAnchorX=String(anchor[0]);button.dataset.cabinAnchorY=String(anchor[1]);
          const icon=button.querySelector('svg');if(icon)Object.assign(icon.style,{left:(x-buttonLeft-9)+'px',top:(y-buttonTop-9)+'px'});
          if(name==='image'){button.setAttribute('aria-label',inCall?'Share on passenger window':'Attach photo');button.setAttribute('data-tooltip',inCall?'Share':'Photos');}
        }
      }else{
      const lcdKeys=['image','mic','call','video'],lcdPoints=lcdKeys.map(name=>point(...car.slots[name]));
      const pack=lcdPoints.some((p,i)=>i&&p[0]-lcdPoints[i-1][0]<44);
      const groupLeft=clamp((lcdPoints[0][0]+lcdPoints[3][0])/2-88,0,w-176),lcdTop=Math.max(point(...car.slots.image)[1]-22,sendBottom+1,composerY+11);
      const firstLcdLeft=pack?groupLeft:lcdPoints[0][0]-22;
      for(const button of qa('[data-control]')){
        const name=button.dataset.control,slot=car.slots[name];button.hidden=!slot;if(!slot)continue;
        const [sourceX,sourceY]=slot,[x,y]=point(sourceX,sourceY),lcdIndex=lcdKeys.indexOf(name),wheel=lcdIndex<0;
        button.hidden=!showDashboard||x<12||x>w-12||y<12||y>h-12;
        if(name==='image'){button.setAttribute('aria-label',inCall?'Share on passenger window':'Attach photo');button.setAttribute('data-tooltip',inCall?'Share':'Photos');}
        let left=lcdIndex<0?x-22:pack?groupLeft+lcdIndex*44:x-22;
        if(name==='language')left=Math.min(left,firstLcdLeft-48);
        const top=wheel?y-22:inCall?clamp(y-22,0,h-44):lcdTop,iconSize=wheel?16:18;
        box(button,left,top,44,44);button.style.setProperty('--rw-icon',iconSize+'px');
        const icon=button.querySelector('svg');if(icon)Object.assign(icon.style,{left:(x-left-iconSize/2)+'px',top:(y-top-iconSize/2)+'px'});
      }
      if(!showDashboard||inCall&&focusProgress>0&&!c.frontControlsAdapted){for(const button of qa('[data-control]')){button.hidden=true;button.dataset.cabinUnavailable='true';}}
        for(const button of qa('[data-control]')){delete button.dataset.tabletControl;delete button.dataset.cabinAnchorX;delete button.dataset.cabinAnchorY;}
      }
      const [headerX,headerY]=point(...car.instrument),[motionX,motionY]=point(...car.motion);
      box(q('.rw-header'),headerX-45,headerY-10,90,20);
      const motionLeft=clamp(motionX-22,0,w-44),motionTop=clamp(motionY-22,0,h-44);
      box(q('.rw-motion'),motionLeft,motionTop,44,44);
      const motionIcon=q('.rw-motion svg');if(motionIcon)Object.assign(motionIcon.style,{position:'absolute',left:(motionX-motionLeft-8)+'px',top:(motionY-motionTop-8)+'px'});
      q('.rw-header').hidden=inCall||focusProgress>0;q('.rw-motion').hidden=inCall||focusProgress>0;

      const sourceThread=projection.threadRect||rect(car.chat),threadX=Math.max(10,sourceThread[0]),threadY=Math.max(8,sourceThread[1]),threadRight=Math.min(w-10,sourceThread[0]+sourceThread[2]),threadBottom=Math.min(h-8,sourceThread[1]+sourceThread[3],c.compose.hidden?h-8:composerY-(focusProgress>0?80:28));
      const chatRect=[threadX,threadY,Math.max(0,threadRight-threadX),Math.max(0,threadBottom-threadY)],threadWidth=Math.min(presentation.device==='iphone'?w-20:460,chatRect[2]),threadLeft=chatRect[0]+(chatRect[2]-threadWidth)/2,threadTop=chatRect[1],threadHeight=chatRect[3];
      c.thread.hidden=inCall;c.thread.style.setProperty('display',inCall?'none':'flex','important');
      c.tray.hidden=c.compose.hidden||(!model.attachment&&!q('.rw-draft-status').textContent&&!c.status.textContent);
      Object.assign(c.tray.style,{left:Math.max(8,threadLeft)+'px',top:'auto',right:'auto',bottom:Math.max(8,h-chatRect[1]-chatRect[3])+'px',width:Math.min(threadWidth,w-16)+'px',maxHeight:Math.min(90,threadHeight)+'px'});
      const trayHeight=c.tray.hidden?0:Math.min(threadHeight,c.tray.offsetHeight);
      box(c.thread,threadLeft,threadTop,threadWidth,Math.max(0,threadHeight-trayHeight-(trayHeight?4:0)));
      const latest=q('.rw-latest');Object.assign(latest.style,{left:(threadLeft+threadWidth/2)+'px',top:(threadTop+Math.max(0,threadHeight-trayHeight-32))+'px',bottom:'auto'});
      const panelWidth=Math.min(440,w-16),panelTop=Math.max(8,point(0,glassY)[1]);
      Object.assign(c.console.style,{left:((w-panelWidth)/2)+'px',right:'auto',top:panelTop+'px',bottom:'auto',width:panelWidth+'px',maxHeight:Math.min(340,h-panelTop-8)+'px'});
      Object.assign(c.toast.style,{left:threadLeft+'px',right:'auto',top:threadTop+'px',bottom:'auto',width:threadWidth+'px',maxHeight:threadHeight+'px',overflow:'auto'});
      if(c.cabin)c.cabin.layout(projection);
      if(c.editor)c.editor.layout(projection);
      if(c.objects)c.objects.layout(projection);
      if(c.comparisonOverlay){
        const displayedRect=(node,id,fallback)=>{
          if(!node||node.hidden||node.closest('[hidden]'))return null;
          let objectRect;
          if(c.objects&&typeof c.objects.getRect==='function'){try{objectRect=c.objects.getRect(id);}catch(_){}if(objectRect===null)return null;}
          try{
            const visible=typeof window.getComputedStyle==='function'?window.getComputedStyle(node):null;
            if(visible&&(visible.display==='none'||visible.visibility==='hidden'||visible.opacity==='0'))return null;
            const area=c.scene.getBoundingClientRect(),r=node.getBoundingClientRect();
            if(area.width>0&&area.height>0&&r.width>0&&r.height>0)return [(r.left-area.left)*w/area.width,(r.top-area.top)*h/area.height,r.width*w/area.width,r.height*h/area.height];
          }catch(_){}
          return Array.isArray(objectRect)&&objectRect.length===4?objectRect:fallback;
        };
        const previous=JSON.stringify(c.comparison);
        c.comparison=c.comparisonOverlay.update({width:w,height:h,presentation,mode:inCall?mode:'chat',actualThread:displayedRect(c.thread,'messageThread',[threadLeft,threadTop,threadWidth,Math.max(0,threadHeight-trayHeight-(trayHeight?4:0))]),actualComposer:displayedRect(c.compose,'typingBar',[composerX,composerY-22,composerWidth,44]),lineHeight:Math.max(state.leading,state.font+5)});
        if(JSON.stringify(c.comparison)!==previous&&c.editor&&c.editor.notifyComparison)c.editor.notifyComparison();
      }
      const incoming=root.querySelector('.rw-preview-receive');if(incoming)incoming.disabled=!inCall||root.dataset.cabinMode==='sharing'||!!(c.camera&&!c.camera.ready);
      if(!viewed&&!section.hidden){c.newest();viewed=true;}
    };
    c.stopDevices=()=>{if(c.cabin)c.cabin.stopDevices();++c.callToken;if(c.mediaStream){c.mediaStream.getTracks().forEach(track=>track.stop());c.mediaStream=null;}const video=q('.rw-self-video');video.pause();video.srcObject=null;video.hidden=true;q('.rw-call-avatar').hidden=false;q('.rw-call-mute').disabled=true;q('.rw-call-mute').textContent='Mute';};
    if(window.RavenCabinModes)c.cabin=window.RavenCabinModes.mount({controller:c,media,geometry:car,root,requestLayout:()=>c.layout(),cancelVoice:()=>{if(voice){const state=voice.getState();if(state.mic&&state.mic!=='idle')voice.cancelListening();if(state.speech&&state.speech!=='idle')voice.stopSpeaking();}},toast,nativeIcon});
    c.open=tab=>{
      if(c.camera&&!c.camera.ready&&(tab==='video'||tab==='call')){active=c;toast(c.camera.supported?'The cabin is loading. Try the call control in a moment.':'The perspective cabin is unavailable in this view. Text messaging is still available.');return;}
      if(c.cabin&&(tab==='video'||tab==='call')){active=c;c.panel=null;c.console.hidden=true;c.cabin.open(tab);return;}
      if(c.cabin&&c.cabin.isActive()&&tab==='image'){active=c;c.panel=null;c.console.hidden=true;c.cabin.openShare();return;}
      active=c;if(c.panel==='call'&&tab!=='call'&&tab!=='video')c.stopDevices();
      if(tab==='message'){c.panel=null;c.console.hidden=true;qa('[data-open]').forEach(button=>button.setAttribute('aria-expanded','false'));c.layout();c.input.focus();return;}
      c.panel=tab==='video'?'call':tab;c.callMode=tab==='video'?'video':'voice';c.console.hidden=false;
      for(const panel of qa('.rw-panel'))panel.hidden=!panel.classList.contains('rw-panel-'+c.panel);
      qa('[data-tab]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.tab===c.panel)));
      qa('[data-open]').forEach(button=>button.setAttribute('aria-expanded',String(button.dataset.open===tab)));
      q('.rw-display-name').textContent='RAVEN / '+(tab==='call'?'VOICE CALL':tab.toUpperCase());
      q('.rw-console-tabs').hidden=c.panel==='call';
      if(c.panel==='call'){c.stopDevices();q('.rw-device-test').textContent=tab==='video'?'Test camera & mic':'Test microphone';q('.rw-call-status').textContent='Call layout preview · no one contacted';}
      c.status.textContent='';c.layout();if(tab==='radio')refreshVoices();
    };
    c.close=(restoreFocus=true)=>{if(!c.cabin||!c.cabin.isActive())c.stopDevices();if(voice){const mic=voice.getState().mic;if(mic==='starting'||mic==='listening')voice.stopListening();}c.panel=null;c.console.hidden=true;qa('[data-open]').forEach(button=>button.setAttribute('aria-expanded','false'));c.layout();if(restoreFocus&&lastLauncher)lastLauncher.focus();};
    function motionButton(){const b=q('.rw-motion'),name=wantsMotion?'Pause':'Play',label=wantsMotion?'Pause road':'Play road';if(b.dataset.motionIcon!==name){const icon=nativeIcon(name,16);if(icon){b.replaceChildren(icon);b.dataset.motionIcon=name;}}b.setAttribute('aria-label',label);b.setAttribute('data-tooltip',label);b.setAttribute('aria-pressed',String(!wantsMotion));}
    function playback(){const visible=!section.hidden&&!document.hidden,request=++playRequest;if(visible&&wantsMotion){const promise=c.video.play();if(promise&&promise.catch)promise.catch(error=>{if(error.name==='AbortError'||request!==playRequest||section.hidden||document.hidden||!wantsMotion)return;wantsMotion=false;motionButton();});}else c.video.pause();motionButton();if(visible&&!wasVisible){active=c;c.layout();}if(!visible&&wasVisible){c.stopDevices();if(active===c&&voice){voice.cancelListening();voice.stopSpeaking();}}wasVisible=visible;}
    qa('[data-open]').forEach(button=>button.addEventListener('click',()=>{lastLauncher=button;c.open(button.dataset.open);}));qa('[data-tab]').forEach(button=>button.addEventListener('click',()=>c.open(button.dataset.tab)));
    q('.rw-close').addEventListener('click',c.close);c.console.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();c.close();}});
    c.input.addEventListener('focus',()=>{active=c;});c.input.addEventListener('input',()=>{active=c;model.draft=c.input.value;allDrafts();});c.input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();submit(c);}});q('form').addEventListener('submit',event=>{event.preventDefault();active=c;submit(c);});
    q('.rw-remove').addEventListener('click',()=>{model.attachment=null;allDrafts();c.layout();});
    q('.rw-pick-photo').addEventListener('click',()=>q('.rw-file-input').click());q('.rw-camera').addEventListener('click',()=>q('.rw-camera-input').click());
    for(const selector of ['.rw-file-input','.rw-camera-input'])q(selector).addEventListener('change',event=>{chooseFile(c,event.target.files&&event.target.files[0]);event.target.value='';});
    q('.rw-use-sample').addEventListener('click',()=>attach(c,media.poster,'Road view'));
    c.dictate.addEventListener('click',()=>startDictation(c));c.dictateShort.addEventListener('click',()=>startDictation(c));c.read.addEventListener('click',()=>readConversation(c));
    c.pauseSpeech.addEventListener('click',()=>{if(voice){const s=voice.getState();if(s.speech==='paused')voice.resumeSpeaking();else voice.pauseSpeaking();}});c.stopSpeech.addEventListener('click',()=>{if(voice){voice.cancelListening();voice.stopSpeaking();}});
    c.voiceSelect.addEventListener('change',()=>{if(voice)voice.setVoice(c.voiceSelect.value);controllers.forEach(item=>item.voiceSelect.value=c.voiceSelect.value);});
    q('.rw-rate').addEventListener('input',event=>{const rate=Number(event.target.value);if(voice)voice.setRate(rate);controllers.forEach(item=>{item.phone.querySelector('.rw-rate').value=String(rate);item.phone.querySelector('.rw-rate-value').textContent=rate+'×';});});
    q('.rw-auto-read').addEventListener('change',event=>{model.autoRead=event.target.checked;controllers.forEach(item=>item.phone.querySelector('.rw-auto-read').checked=model.autoRead);voiceStatus(model.autoRead?'New incoming messages will be read aloud while this chat is open.':'Automatic reading is off.');});
    q('.rw-language').addEventListener('change',event=>{++translateRun;model.target=event.target.value;controllers.forEach(item=>{item.phone.querySelector('.rw-language').value=model.target;item.renderMessages();item.translateNow.disabled=false;});if(model.autoTranslate)translateConversation();});
    q('.rw-dictation-language').addEventListener('change',event=>{model.dictationLanguage=event.target.value;if(voice)voice.setLanguage(model.dictationLanguage);controllers.forEach(item=>item.phone.querySelector('.rw-dictation-language').value=model.dictationLanguage);});
    c.autoTranslate.addEventListener('change',event=>{model.autoTranslate=event.target.checked;controllers.forEach(item=>item.autoTranslate.checked=model.autoTranslate);if(model.autoTranslate)translateConversation();else{++translateRun;controllers.forEach(item=>{item.translateNow.disabled=false;item.translationStatus.textContent='Automatic translation is off. Originals stay available.';});}});
    c.translateNow.addEventListener('click',translateConversation);
    q('.rw-motion').addEventListener('click',()=>{wantsMotion=!wantsMotion;playback();});c.video.addEventListener('loadeddata',playback);c.video.addEventListener('error',()=>{wantsMotion=false;motionButton();});
    c.thread.addEventListener('scroll',()=>q('.rw-latest').hidden=nearBottom(),{passive:true});q('.rw-latest').addEventListener('click',c.newest);
    q('.rw-device-test').addEventListener('click',async()=>{
      active=c;const token=++c.callToken;const button=q('.rw-device-test');if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){q('.rw-call-status').textContent='Camera and microphone access are unavailable here.';return;}
      if(voice){voice.cancelListening();voice.stopSpeaking();}button.disabled=true;q('.rw-call-status').textContent='Waiting for device permission…';
      try{const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:c.callMode==='video'?{facingMode:'user'}:false});if(token!==c.callToken||section.hidden||c.panel!=='call'){stream.getTracks().forEach(track=>track.stop());return;}if(c.mediaStream)c.mediaStream.getTracks().forEach(track=>track.stop());c.mediaStream=stream;const self=q('.rw-self-video');if(c.callMode==='video'){self.srcObject=stream;self.hidden=false;q('.rw-call-avatar').hidden=true;await self.play().catch(()=>{});}q('.rw-call-mute').disabled=false;q('.rw-call-status').textContent=c.callMode==='video'?'Camera & microphone preview · no call placed':'Microphone ready · no call placed';c.layout();}catch(error){q('.rw-call-status').textContent=error.name==='NotAllowedError'?'Permission was not granted. You can try again.':'Could not open the camera or microphone.';}finally{button.disabled=false;}
    });
    q('.rw-call-mute').addEventListener('click',()=>{if(!c.mediaStream)return;const tracks=c.mediaStream.getAudioTracks(),enabled=tracks.some(track=>track.enabled);tracks.forEach(track=>track.enabled=!enabled);q('.rw-call-mute').textContent=enabled?'Unmute':'Mute';});q('.rw-call-end').addEventListener('click',c.close);
    c.resizeObserver=new ResizeObserver(c.layout);c.resizeObserver.observe(c.scene);c.resizeObserver.observe(c.console);c.resizeObserver.observe(c.compose);c.resizeObserver.observe(c.tray);c.mutationObserver=new MutationObserver(playback);c.mutationObserver.observe(section,{attributes:true,attributeFilter:['hidden']});document.addEventListener('visibilitychange',playback);c.playback=playback;
    if(window.RavenCabinComparison)c.comparisonOverlay=window.RavenCabinComparison.mount({scene:c.scene});
    if(window.RavenCabinEditBridge)c.editor=window.RavenCabinEditBridge.mount({controller:c,root,media,geometry:car,nativeIcon,requestLayout:()=>c.layout(),enabled:root.dataset.editor==='true'||new URLSearchParams(location.search).get('editor')==='1'});
    controllers.push(c);c.renderMessages();c.syncDraft();requestAnimationFrame(()=>{c.layout();c.newest();playback();});
  }
  if(window.lucide&&typeof window.lucide.createIcons==='function')window.lucide.createIcons({attrs:{width:18,height:18}});
  if(window.RavenVoiceControls){
    voice=window.RavenVoiceControls.create({
      ...(typeof services.transcribe==='function'?{transcribe:services.transcribe}:{}),
      onTranscript:(text,info)=>{if(info&&info.isFinal&&text){model.draft=(model.draft.trimEnd()+' '+text).trimStart().slice(0,4000);allDrafts();}else controllers.forEach(c=>{c.phone.querySelector('.rw-draft-status').textContent=text?'Listening…':'';c.layout();});},
      onStatus:voiceStatus,onState:updateVoice
    });updateVoice(voice.getState());refreshVoices();
  }
  const render=()=>{root.style.setProperty('--rw-bubble-opacity',state.opacity/100);root.style.setProperty('--rw-font',state.font+'px');root.style.setProperty('--rw-leading',Math.max(state.leading,state.font+5)+'px');root.style.setProperty('--rw-gap',state.gap+'px');root.style.setProperty('--rw-blur',state.blur+'px');controllers.forEach(c=>{c.video.playbackRate=state.speed;c.layout();});};
  render();if(globalThis.Tweak){const tweak=new Tweak({container:root,onChange:render});tweak.addSlider(state,'opacity',{label:'Message background opacity',min:50,max:100,unit:'%'});tweak.addSlider(state,'font',{label:'Message text size',min:14,max:22,unit:'px'});tweak.addSlider(state,'leading',{label:'Line spacing',min:20,max:31,unit:'px'});tweak.addSlider(state,'gap',{label:'Space between messages',min:4,max:18,unit:'px'});tweak.addSlider(state,'blur',{label:'Blur behind messages',min:0,max:16,unit:'px'});tweak.addSlider(state,'speed',{label:'Road speed',min:.35,max:1.5,step:.05,unit:'×'});}
  window.RavenWindshield={
    setRemoteStream(stream){return controllers[0]&&controllers[0].cabin&&controllers[0].cabin.setRemoteStream(stream);},
    setRemoteMedia(value){return controllers[0]&&controllers[0].cabin&&controllers[0].cabin.setRemoteMedia(value);},
    receive(message){if(!message||typeof message.text!=='string'||!message.text.trim())return;const m={id:Date.now(),direction:'in',text:message.text.slice(0,4000),language:message.language||''};model.messages.push(m);controllers.forEach(c=>c.renderMessages());const read=()=>{if(model.autoRead&&voice&&active&&!document.hidden)voice.speak(translated(m)||m.text,{lang:translated(m)?model.target:m.language||model.target});};if(model.autoTranslate)translateConversation().then(read);else read();},
    show(mode){const c=controllers[0];if(!c||!c.cabin)return;if(mode==='chat')c.cabin.open('chat');else c.open(mode==='call'?'call':'video');},
    receiveShared(item){const c=controllers[0];return !!(c&&c.cabin&&(!c.camera||c.camera.ready)&&c.cabin.receiveShared(item));},
    dispose(){disposed=true;++translateRun;clearTimeout(toastTimer);if(voice)voice.dispose();controllers.forEach(c=>{c.video.pause();c.stopDevices();if(c.editor)c.editor.dispose();if(c.comparisonOverlay)c.comparisonOverlay.dispose();if(c.cabin)c.cabin.dispose();if(c.camera)c.camera.dispose();c.resizeObserver.disconnect();c.mutationObserver.disconnect();document.removeEventListener('visibilitychange',c.playback);});nativeTranslators.forEach(t=>{if(t.destroy)t.destroy();});svg.remove();}
  };
  const previewReceive=root.querySelector('.rw-preview-receive');
  if(previewReceive)previewReceive.addEventListener('click',()=>window.RavenWindshield.receiveShared({src:media.poster,type:'image',name:'Incoming road photo'}));
  window.addEventListener('pagehide',()=>window.RavenWindshield.dispose(),{once:true});
})();
