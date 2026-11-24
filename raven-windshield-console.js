(function () {
  'use strict';
  const root=document.getElementById('raven-windshield-console');
  if(!root)return;
  const media=JSON.parse(document.getElementById('rw-media').textContent);
  const template=document.getElementById('rw-phone-template');
  const services=window.RavenWindshieldServices||{};
  const state={opacity:90,font:16,leading:23,gap:9,blur:7,speed:.8};
  const cars={
    maybach:{width:960,height:640,cropX:230,cropWidth:530,endY:535,topY:300,slots:{message:[421,374,102,65],image:[523,374,102,65],radio:[625,374,103,65],call:[427,454,100,74],video:[530,454,100,74]},mask:'M 0 365 L 170 350 L 194 345 C 196 324 222 303 265 300 C 307 298 337 313 355 331 L 380 324 L 435 325 L 480 323 L 530 324 L 565 326 L 719 327 L 764 344 L 960 362 L 960 640 L 0 640 Z M 230 323 C 251 307 286 306 316 322 L 230 323 Z'},
    g63:{width:1200,height:800,cropX:330,cropWidth:360,endY:485,topY:263,slots:{message:[500,305,75.5,50],image:[575.5,305,75.5,50],radio:[500,427,151,50],call:[530,372,50,50],video:[621,372,50,50]},mask:'M 0 396 L 279 326 C 291 296 320 267 377 263 C 423 261 454 277 475 301 L 484 283 L 646 283 C 659 283 665 289 668 300 L 870 301 L 935 317 L 1200 386 L 1200 800 L 0 800 Z M 343 289 C 363 276 400 273 425 285 L 444 297 L 343 297 Z'},
    range:{width:800,height:450,cropX:80,cropWidth:720,endY:450,topY:155,slots:{message:[540,325,120,95],image:[660,325,120,95],radio:[350,345,120,100],call:[140,220,100,80],video:[300,235,100,80]},mask:'M 0 209 C 59 173 142 153 212 156 C 299 154 376 174 439 210 L 480 202 L 570 204 L 665 215 L 800 232 L 800 450 L 0 450 Z'}
  };
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
  const shortLanguage=language=>String(language||'en').split('-')[0];
  const translated=message=>model.translations.get(message.id+'|'+model.target);
  const allDrafts=()=>controllers.forEach(c=>c.syncDraft());
  const status=text=>{controllers.forEach(c=>c.status.textContent=text||'');};
  function toast(text){if(!active)return;clearTimeout(toastTimer);active.toast.textContent=text;active.toast.hidden=false;toastTimer=setTimeout(()=>{controllers.forEach(c=>c.toast.hidden=true);},4500);}
  function voiceStatus(message){const text=typeof message==='string'?message:message.message||'';controllers.forEach(c=>c.radioStatus.textContent=text);if(active&&active.panel==='message')active.status.textContent=text;}
  function updateVoice(s){
    s=s||(voice&&voice.getState?voice.getState():{});
    const busy=!!s.mic&&s.mic!=='idle',speaking=!!s.speech&&s.speech!=='idle',paused=s.speech==='paused';
    controllers.forEach(c=>{
      c.dictate.textContent=busy?'Stop dictation':'Talk to text';c.dictateShort.textContent=busy?'Stop dictation':'Talk to text';c.dictate.setAttribute('aria-pressed',String(busy));
      c.read.textContent=speaking?(paused?'Resume reading':'Reading…'):'Read messages';c.read.setAttribute('aria-pressed',String(speaking));
      c.pauseSpeech.disabled=!speaking;c.pauseSpeech.textContent=paused?'Resume':'Pause';c.stopSpeech.disabled=!speaking&&!busy;
      c.radioLauncher.querySelector('.rw-launch-detail').textContent=busy?'Listening':speaking?'Reading':'Voice';
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
    c.close();toast('Added to this sample conversation.');
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
    const c={phone,section,key,car,scene:q('.rw-scene'),photo:q('.rw-dash'),video:q('.rw-road'),thread:q('.rw-thread'),console:q('.rw-console'),input:q('textarea'),status:q('.rw-console-status'),toast:q('.rw-toast'),radioStatus:q('.rw-radio-status'),radioLauncher:q('.rw-radio'),dictate:q('.rw-dictate'),dictateShort:q('.rw-dictate-short'),read:q('.rw-read'),pauseSpeech:q('.rw-pause-speech'),stopSpeech:q('.rw-stop-speech'),voiceSelect:q('.rw-voice'),translationStatus:q('.rw-translation-status'),translateNow:q('.rw-translate-now'),autoTranslate:q('.rw-auto-translate'),panel:null,mediaStream:null,callToken:0};
    const clip=document.createElementNS(ns,'clipPath');clip.id='rw-mask-'+key;clip.setAttribute('clipPathUnits','objectBoundingBox');const path=document.createElementNS(ns,'path');path.setAttribute('d',car.mask);path.setAttribute('clip-rule','evenodd');path.setAttribute('transform','scale('+(1/car.width)+' '+(1/car.height)+')');clip.appendChild(path);defs.appendChild(clip);c.photo.style.clipPath='url(#'+clip.id+')';c.photo.src=media[key];c.photo.alt=section.dataset.variant+' real dashboard, with the original steering-wheel emblem visible.';
    c.video.src=media.road;c.video.poster=media.poster;c.video.muted=true;c.video.defaultMuted=true;c.video.playbackRate=state.speed;q('.rw-sample-photo img').src=media.poster;
    let wantsMotion=!reduced.matches,playRequest=0,wasVisible=false,viewed=false,lastLauncher=null;
    const nearBottom=()=>c.thread.scrollHeight-c.thread.scrollTop-c.thread.clientHeight<65;
    c.newest=()=>{c.thread.scrollTop=c.thread.scrollHeight;q('.rw-latest').hidden=true;};
    c.renderMessages=()=>{
      const pinned=nearBottom(),old=c.thread.scrollTop;c.thread.replaceChildren();
      for(const m of model.messages){const bubble=el('article','rw-message'+(m.direction==='out'?' rw-out':''));bubble.setAttribute('aria-label',m.direction==='in'?'Alex':'You');
        if(m.image){const image=el('img');image.src=m.image;image.alt=m.imageName||'Shared photo';image.onload=()=>{if(pinned)c.newest();};bubble.appendChild(image);}
        const tx=translated(m);if(m.text){const text=el('p','',tx||m.text);text.lang=tx?model.target:m.language;bubble.appendChild(text);}
        if(tx){const details=el('details');details.appendChild(el('summary','cursor-interaction','Original'));const original=el('p','',m.text);original.lang=m.language;details.appendChild(original);bubble.appendChild(details);}
        c.thread.appendChild(bubble);
      }if(pinned)c.newest();else c.thread.scrollTop=old;
    };
    c.syncDraft=()=>{if(c.input.value!==model.draft)c.input.value=model.draft;q('.rw-send').disabled=!model.draft.trim()&&!model.attachment;q('.rw-write .rw-launch-label').textContent=model.draft||model.attachment?'Draft':'Write';q('.rw-write .rw-launch-detail').textContent=model.draft?'Continue':'Message';const a=q('.rw-attachment');a.hidden=!model.attachment;if(model.attachment){a.querySelector('img').src=model.attachment.src;q('.rw-attachment-name').textContent=model.attachment.name;}q('.rw-draft-status').textContent='';};
    c.layout=()=>{
      const w=c.scene.clientWidth,h=c.scene.clientHeight;if(!w||!h)return;
      const s=w/car.cropWidth,left=-car.cropX*s,top=h-car.endY*s;
      Object.assign(c.photo.style,{width:car.width*s+'px',height:car.height*s+'px',left:left+'px',top:top+'px'});
      for(const button of qa('[data-open]')){const [x,y,bw,bh]=car.slots[button.dataset.open],width=Math.max(44,bw*s),height=Math.max(44,bh*s);Object.assign(button.style,{left:Math.min(w-width-2,Math.max(2,left+x*s))+'px',top:Math.min(h-height-4,top+y*s)+'px',width:width+'px',height:height+'px'});}
      const dashHeight=(car.endY-car.topY)*s;
      const panelBottom=Math.max(120,Math.min(155,dashHeight-9));
      c.console.style.bottom=panelBottom+'px';
      c.console.style.maxHeight=Math.max(200,Math.min(360,h-panelBottom-164))+'px';
      let bottom=Math.max(145,dashHeight+12);
      if(c.panel){bottom=panelBottom+(c.console.offsetHeight||Math.min(300,parseFloat(c.console.style.maxHeight)))+9;}
      c.thread.style.bottom=bottom+'px';q('.rw-latest').style.bottom=(bottom+10)+'px';c.toast.style.bottom=(Math.max(panelBottom+14,dashHeight+12))+'px';
      if(!viewed&&!section.hidden){c.newest();viewed=true;}
    };
    c.stopDevices=()=>{++c.callToken;if(c.mediaStream){c.mediaStream.getTracks().forEach(track=>track.stop());c.mediaStream=null;}const video=q('.rw-self-video');video.pause();video.srcObject=null;video.hidden=true;q('.rw-call-avatar').hidden=false;q('.rw-call-mute').disabled=true;q('.rw-call-mute').textContent='Mute';};
    c.open=tab=>{
      active=c;if(c.panel==='call'&&tab!=='call'&&tab!=='video')c.stopDevices();
      c.panel=tab==='video'?'call':tab;c.callMode=tab==='video'?'video':'voice';c.console.hidden=false;
      for(const panel of qa('.rw-panel'))panel.hidden=!panel.classList.contains('rw-panel-'+c.panel);
      qa('[data-tab]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.tab===c.panel)));
      qa('[data-open]').forEach(button=>button.setAttribute('aria-expanded',String(button.dataset.open===tab)));
      q('.rw-display-name').textContent='RAVEN / '+(tab==='call'?'VOICE CALL':tab.toUpperCase());
      q('.rw-console-tabs').hidden=c.panel==='call';
      if(c.panel==='call'){c.stopDevices();q('.rw-device-test').textContent=tab==='video'?'Test camera & mic':'Test microphone';q('.rw-call-status').textContent='Call layout preview · no one contacted';}
      c.status.textContent='';c.layout();if(tab==='message')c.input.focus();if(tab==='radio')refreshVoices();
    };
    c.close=()=>{c.stopDevices();if(voice){const mic=voice.getState().mic;if(mic==='starting'||mic==='listening')voice.stopListening();}c.panel=null;c.console.hidden=true;qa('[data-open]').forEach(button=>button.setAttribute('aria-expanded','false'));c.layout();if(lastLauncher)lastLauncher.focus();};
    function motionButton(){const b=q('.rw-motion');b.textContent=wantsMotion?'Pause road':'Play road';b.setAttribute('aria-pressed',String(!wantsMotion));}
    function playback(){const visible=!section.hidden&&!document.hidden,request=++playRequest;if(visible&&wantsMotion){const promise=c.video.play();if(promise&&promise.catch)promise.catch(error=>{if(error.name==='AbortError'||request!==playRequest||section.hidden||document.hidden||!wantsMotion)return;wantsMotion=false;motionButton();});}else c.video.pause();motionButton();if(visible&&!wasVisible){active=c;c.layout();}if(!visible&&wasVisible){c.stopDevices();if(active===c&&voice){voice.cancelListening();voice.stopSpeaking();}}wasVisible=visible;}
    qa('[data-open]').forEach(button=>button.addEventListener('click',()=>{lastLauncher=button;c.open(button.dataset.open);}));qa('[data-tab]').forEach(button=>button.addEventListener('click',()=>c.open(button.dataset.tab)));
    q('.rw-close').addEventListener('click',c.close);c.console.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();c.close();}});
    c.input.addEventListener('input',()=>{model.draft=c.input.value;allDrafts();});c.input.addEventListener('keydown',event=>{if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();submit(c);}});q('form').addEventListener('submit',event=>{event.preventDefault();submit(c);});
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
    c.resizeObserver=new ResizeObserver(c.layout);c.resizeObserver.observe(c.scene);c.resizeObserver.observe(c.console);c.mutationObserver=new MutationObserver(playback);c.mutationObserver.observe(section,{attributes:true,attributeFilter:['hidden']});document.addEventListener('visibilitychange',playback);c.playback=playback;
    controllers.push(c);c.renderMessages();c.syncDraft();requestAnimationFrame(()=>{c.layout();c.newest();playback();});
  }
  if(window.RavenVoiceControls){
    voice=window.RavenVoiceControls.create({
      ...(typeof services.transcribe==='function'?{transcribe:services.transcribe}:{}),
      onTranscript:(text,info)=>{if(info&&info.isFinal&&text){model.draft=(model.draft.trimEnd()+' '+text).trimStart().slice(0,4000);allDrafts();}else controllers.forEach(c=>{c.phone.querySelector('.rw-draft-status').textContent=text?'Listening…':'';});},
      onStatus:voiceStatus,onState:updateVoice
    });updateVoice(voice.getState());refreshVoices();
  }
  const render=()=>{root.style.setProperty('--rw-bubble-opacity',state.opacity/100);root.style.setProperty('--rw-font',state.font+'px');root.style.setProperty('--rw-leading',Math.max(state.leading,state.font+5)+'px');root.style.setProperty('--rw-gap',state.gap+'px');root.style.setProperty('--rw-blur',state.blur+'px');controllers.forEach(c=>{c.video.playbackRate=state.speed;c.layout();});};
  render();if(globalThis.Tweak){const tweak=new Tweak({container:root,onChange:render});tweak.addSlider(state,'opacity',{label:'Message background opacity',min:50,max:100,unit:'%'});tweak.addSlider(state,'font',{label:'Message text size',min:14,max:22,unit:'px'});tweak.addSlider(state,'leading',{label:'Line spacing',min:20,max:31,unit:'px'});tweak.addSlider(state,'gap',{label:'Space between messages',min:4,max:18,unit:'px'});tweak.addSlider(state,'blur',{label:'Blur behind messages',min:0,max:16,unit:'px'});tweak.addSlider(state,'speed',{label:'Road speed',min:.35,max:1.5,step:.05,unit:'×'});}
  window.RavenWindshield={
    receive(message){if(!message||typeof message.text!=='string'||!message.text.trim())return;const m={id:Date.now(),direction:'in',text:message.text.slice(0,4000),language:message.language||''};model.messages.push(m);controllers.forEach(c=>c.renderMessages());const read=()=>{if(model.autoRead&&voice&&active&&!document.hidden)voice.speak(translated(m)||m.text,{lang:translated(m)?model.target:m.language||model.target});};if(model.autoTranslate)translateConversation().then(read);else read();},
    dispose(){disposed=true;++translateRun;clearTimeout(toastTimer);if(voice)voice.dispose();controllers.forEach(c=>{c.video.pause();c.stopDevices();c.resizeObserver.disconnect();c.mutationObserver.disconnect();document.removeEventListener('visibilitychange',c.playback);});nativeTranslators.forEach(t=>{if(t.destroy)t.destroy();});svg.remove();}
  };
  window.addEventListener('pagehide',()=>window.RavenWindshield.dispose(),{once:true});
})();
