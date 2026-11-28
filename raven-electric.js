(() => {
  'use strict';
  const groups={
    Write:[['Emoji','Smile','#df9100'],['Stickers','Sticker','#9254cb'],['GIFs','Film','#cc507d'],['Quick replies','MessageCircle','#229960']],
    Translate:[['Translate','Languages','#3675d0'],['Auto-translate','Repeat','#13959a'],['Read aloud','Volume2','#8259bf'],['Speak translation','AudioLines','#d17e33']],
    Voice:[['Dictate','Mic','#169eaa'],['Record note','CircleDot','#db5556'],['Play note','Play','#407dc3'],['Transcript','FileText','#8659c4']],
    Share:[['Photos','Image','#318bc2'],['Camera','Camera','#687f96'],['Files','Paperclip','#d38230'],['Location','MapPin','#349458']],
    Conversation:[['Reply','Reply','#367fca'],['React','Heart','#cb567a'],['Forward','Forward','#78983b'],['Keep','Bookmark','#a16fc5']],
    Find:[['Search','Search','#448ec3'],['Kept','BookmarkCheck','#956fcd'],['Media','Images','#319b91'],['By date','Calendar','#c56955']]
  };
  const names=Object.keys(groups),langs={en:'English',es:'Spanish',fr:'French',de:'German',it:'Italian',pt:'Portuguese',ja:'Japanese'};
  const defaults={veneer:'Honey ash',size:32,curve:16,fade:280,glow:'#ffc074',duration:720,haptics:true,x:0,y:0,order:{},placement:{}};
  const key='raven.panoramic.design.1';let prefs={...defaults};
  try{Object.assign(prefs,JSON.parse(localStorage.getItem(key)||'{}'));}catch{}
  let host,dialog,feedback,tools,panels=[],category='Write',draft='',attachment=null,selected=1,target='es',auto=false,spoken=false,reading=false,typing=false;
  let requestingMic=false,recorder=null,recorded=null,audio=null,recognition=null,replyTo='',sequence=1,turn=0,opened=false;
  const messages=[{id:1,text:'Are we still meeting tonight?',date:new Date(),out:false,lang:'en'}];
  const uris=[];
  const urlFor=b=>{const u=URL.createObjectURL(b);uris.push(u);return u;};
  function el(tag,cls,parent,txt){const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;if(parent)parent.append(n);return n;}
  function btn(parent,label,fn,cls=''){const b=el('button',cls,parent,label);b.type='button';b.onclick=fn;return b;}
  function icon(n,name){const def=window.lucide?.icons?.[name]||window.lucide?.[name];if(!def){n.textContent='●';return;}function build([tag,attrs,children]){const e=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs||{}).forEach(([k,v])=>e.setAttribute(k,v));(children||[]).forEach(c=>e.append(build(c)));return e;}const svg=build(def);svg.setAttribute('aria-hidden','true');svg.setAttribute('width','20');svg.setAttribute('height','20');n.append(svg);}
  function note(s){feedback.textContent=s;}
  function flash(n){if(!n)return;n.classList.remove('ev-flash');void n.offsetWidth;n.classList.add('ev-flash');}
  function touch(n){flash(n);if(prefs.haptics)navigator.vibrate?.(9);}
  function modal(title,fill){dialog.replaceChildren();el('h3','',dialog,title);const body=el('div','ev-items',dialog);fill(body);btn(el('footer','',dialog),'Close',()=>dialog.close());if(!dialog.open)dialog.showModal();}
  function choices(title,items,fn){modal(title,p=>items.forEach(x=>btn(p,x,()=>{dialog.close();fn(x);}))); }
  const chosen=()=>messages.find(m=>m.id===selected)||messages.at(-1);
  function appendText(txt){draft+=draft?' '+txt:txt;syncDraft();panels.find(p=>p.scene.offsetWidth)?.input.focus();}
  function syncDraft(){for(const p of panels){if(p.input.value!==draft)p.input.value=draft;p.input.placeholder=attachment?'Send '+attachment.name:replyTo?'Reply to '+replyTo:'Message Alex…';p.send.disabled=p.push.disabled=!draft.trim()&&!attachment;}}
  function send(){if(!draft.trim()&&!attachment)return;const msg={id:++sequence,date:new Date(),text:draft.trim(),attachment,replyTo,out:true,lang:'en'};messages.push(msg);selected=msg.id;draft='';attachment=null;replyTo='';syncDraft();thread();renderAux();}
  function thread(){for(const p of panels){p.thread.replaceChildren();for(const m of messages){
    const b=btn(p.thread,'',()=>{selected=m.id;thread();renderAux();},'ev-bubble'+(m.out?' out':'')+(selected===m.id?' selected':''));
    b.dataset.id=m.id;b.textContent=[m.kept?'★':'',m.replyTo?'↪ '+m.replyTo:'',m.translation||m.text,m.reaction].filter(Boolean).join(' ');
    if(m.attachment){const a=m.attachment;if(a.type.startsWith('image/')){const img=el('img','',b);img.alt=a.name;img.src=a.url;}else{el('span','',b,' 📎 '+a.name);b.ondblclick=()=>openMedia(a);}}
  }p.thread.scrollTop=p.thread.scrollHeight;}}
  function openMedia(a){modal(a.name,p=>{if(a.type.startsWith('audio/')||a.type.startsWith('video/')){const v=el(a.type.startsWith('audio')?'audio':'video','',p);v.src=a.url;v.controls=true;v.style.maxWidth='100%';}else if(a.type.startsWith('image/')){const i=el('img','',p);i.src=a.url;i.alt=a.name;i.style.maxWidth='100%';}else{const l=el('a','',p,'Download '+a.name);l.download=a.name;l.href=a.url;}});}
  function pick(accept,capture=false){const f=el('input');f.type='file';f.accept=accept;if(capture)f.setAttribute('capture','environment');f.onchange=()=>{const b=f.files[0];if(!b)return;attachment={url:urlFor(b),name:b.name,type:b.type};syncDraft();note('Ready to send '+b.name);};f.click();}
  function list(title,items){modal(title,p=>{if(!items.length)el('span','',p,'No matching messages.');for(const m of items)btn(p,m.text||m.attachment?.name||'Message',()=>{selected=m.id;dialog.close();thread();panels.forEach(v=>v.thread.querySelector('[data-id="'+m.id+'"]')?.scrollIntoView({block:'nearest'}));renderAux();});});}
  function query(title,type,fn){modal(title,p=>{const input=el('input','',p);input.type=type;input.setAttribute('aria-label',title);const submit=()=>{const v=input.value;if(v){dialog.close();fn(v);}};btn(p,'Apply',submit);input.onkeydown=e=>{if(e.key==='Enter')submit();};setTimeout(()=>input.focus(),0);});}
  function stopVoice(){window.speechSynthesis?.cancel();audio?.pause();reading=false;renderAux();}
  function speak(text,language){if(!window.speechSynthesis)throw Error('Read aloud is unavailable in this browser.');stopVoice();const u=new SpeechSynthesisUtterance(text);u.lang=language;reading=true;u.onend=u.onerror=()=>{reading=false;renderAux();};speechSynthesis.speak(u);renderAux();}
  async function translate(m,language){if(!m?.text)throw Error('Select a message with text.');if(m.lang===language)return m.text;const result=await window.RavenWindshieldServices.translate({text:m.text,sourceLanguage:m.lang||'auto',targetLanguage:language});const txt=typeof result==='string'?result:result.translatedText;if(!txt)throw Error('No translation returned.');m.translation=txt;m.translationLang=language;thread();return txt;}
  async function record(){if(recorder?.state==='recording'){recorder.stop();return;}if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw Error('Voice recording needs a browser with microphone access.');if(requestingMic)return;requestingMic=true;let stream;try{stream=await navigator.mediaDevices.getUserMedia({audio:true});}finally{requestingMic=false;}if(!opened){stream.getTracks().forEach(t=>t.stop());return;}const chunks=[];try{recorder=new MediaRecorder(stream);recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onstop=()=>{stream.getTracks().forEach(t=>t.stop());const blob=new Blob(chunks,{type:recorder.mimeType});recorded={blob,url:urlFor(blob),type:blob.type,name:'Voice note'};attachment=recorded;recorder=null;syncDraft();renderAux();note('Voice note ready. Play it or tap Send.');};recorder.start();renderAux();}catch(e){stream.getTracks().forEach(t=>t.stop());throw e;}}
  async function act(id){const m=chosen();switch(id){
    case 'Emoji':return choices(id,['😊','❤️','👍','🎉','👋','😂'],appendText);
    case 'Stickers':return choices(id,['🌟','🪐','🦅','🌈','🚀'],x=>{const c=document.createElement('canvas');c.width=c.height=192;const ctx=c.getContext('2d');ctx.font='128px sans-serif';ctx.textAlign='center';ctx.fillText(x,96,144);attachment={type:'image/png',url:c.toDataURL(),name:'Sticker '+x};syncDraft();});
    case 'GIFs':return pick('image/gif');
    case 'Quick replies':return choices(id,['On my way','Sounds good','Call you soon','Take your time'],appendText);
    case 'Translate':await translate(m,target);return note('Translation ready.');
    case 'Auto-translate':auto=!auto;break;
    case 'Read aloud':return speak(m.translation||m.text,m.translationLang||m.lang);
    case 'Speak translation':spoken=!spoken;if(spoken){try{speak(await translate(m,target),target);}catch(e){spoken=false;throw e;}}break;
    case 'Dictate':{if(recognition){recognition.stop();return;}const R=window.SpeechRecognition||window.webkitSpeechRecognition;if(!R)throw Error('Use the native keyboard microphone for dictation in this browser.');recognition=new R();recognition.onresult=e=>appendText(e.results[0][0].transcript);recognition.onerror=e=>note('Dictation: '+e.error);recognition.onend=()=>{recognition=null;renderAux();};recognition.start();break;}
    case 'Record note':return record();
    case 'Play note':if(!recorded)throw Error('Record a voice note first.');audio?.pause();audio=new Audio(recorded.url);await audio.play();break;
    case 'Transcript':if(!recorded)throw Error('Record a voice note first.');{const r=await window.RavenWindshieldServices.transcribe(recorded.blob,{language:'en'});const t=r.text||r.transcript;if(!t)throw Error('No transcript returned.');appendText(t);}break;
    case 'Photos':return pick('image/*');case 'Camera':return pick('image/*',true);case 'Files':return pick('*/*');
    case 'Location':if(!navigator.geolocation)throw Error('Location is unavailable.');return navigator.geolocation.getCurrentPosition(p=>appendText('https://maps.google.com/?q='+p.coords.latitude.toFixed(5)+','+p.coords.longitude.toFixed(5)),e=>note(e.message));
    case 'Reply':replyTo=m.text||m.attachment?.name;syncDraft();panels.find(p=>p.scene.offsetWidth)?.input.focus();break;
    case 'React':return choices(id,['❤️','👍','😂','🎉'],x=>{m.reaction=x;thread();});
    case 'Forward':if(navigator.share){await navigator.share({text:m.text||m.attachment?.name});}else{await navigator.clipboard.writeText(m.text||m.attachment?.name);note('Copied for forwarding.');}break;
    case 'Keep':m.kept=!m.kept;thread();break;
    case 'Search':return query('Search this thread','search',x=>list('Search results',messages.filter(m=>(m.text||'').toLowerCase().includes(x.toLowerCase()))));
    case 'Kept':return list('Kept messages',messages.filter(m=>m.kept));
    case 'Media':return modal('Shared media',p=>{const a=messages.filter(m=>m.attachment);if(!a.length)el('span','',p,'No shared media yet.');a.forEach(m=>btn(p,m.attachment.name,()=>openMedia(m.attachment)));});
    case 'By date':return query('Jump to date','date',x=>list('Messages on '+x,messages.filter(m=>m.date.toLocaleDateString('en-CA')===x||[m.date.getFullYear(),String(m.date.getMonth()+1).padStart(2,'0'),String(m.date.getDate()).padStart(2,'0')].join('-')===x)));
  }renderAux();}
  function run(fn){Promise.resolve().then(fn).catch(e=>{if(e.name!=='AbortError')note(e.message);renderAux();});}
  function renderAux(){for(const p of panels){p.aux.replaceChildren();p.status.replaceChildren();
    if(category==='Translate'){const s=el('select','',p.aux);s.setAttribute('aria-label','Translation language');Object.entries(langs).forEach(([k,v])=>s.add(new Option(v,k)));s.value=target;s.onchange=()=>{target=s.value;renderAux();};}
    else el('span','ev-note',p.aux,({Write:'Message Alex',Voice:recorder?'Recording…':recorded?'Voice note ready':'Voice tools',Share:attachment?.name||'Attachments',Conversation:chosen().kept?'Message kept':'Selected message',Find:messages.length+' messages'})[category]);
    if(reading)btn(p.status,'Stop reading',stopVoice);else if(recorder)btn(p.status,'Stop',()=>run(record));else if(recognition)btn(p.status,'Stop',()=>recognition.stop());else el('span','ev-note',p.status,category==='Translate'?[auto?'Auto on':'Manual',spoken?'Voice on':''].filter(Boolean).join(' · '):typing?'Typing':category);
    if(attachment)btn(p.aux,'Remove',()=>{attachment=null;syncDraft();renderAux();});}}
  function drawTiles(){for(const p of panels){p.tiles.replaceChildren();p.midTiles.replaceChildren();p.smallTiles.replaceChildren();p.title.textContent=category;
    const entries=[...groups[category]],offset=Number(prefs.order[category])||0;
    for(let i=0;i<entries.length;i++){
      const [label,glyph,color]=entries[(i+offset)%entries.length],zone=prefs.placement[label]||'Main';
      const parent=zone==='Middle'?p.midTiles:zone==='Small'?p.smallTiles:p.tiles;
      const tile=btn(parent,'',()=>{touch(tile);flash(p.aux);run(()=>act(label));},'ev-tile');
      tile.setAttribute('aria-label',label);tile.style.setProperty('--icon',color);
      tile.style.setProperty('--angle',(1.5-i)*prefs.curve/1.5+'deg');
      icon(el('span','ev-face',tile),glyph);el('span','',tile,label);
    }
    for(const dial of [p.consoleDial,p.vent]){dial.setAttribute('aria-valuetext',category);dial.setAttribute('aria-valuenow',names.indexOf(category)+1);}
  }renderAux();}
  function switchTo(name){if(!groups[name]||name===category)return;const ticket=++turn;const ms=matchMedia('(prefers-reduced-motion: reduce)').matches?0:prefs.fade/2;
    category=name;tileEditor();tools.querySelector('[name=category]').value=name;tools.querySelector('[name=order]').value=prefs.order[name]||0;
    panels.flatMap(p=>[p.tiles,p.midTiles,p.smallTiles]).forEach(n=>n.animate([{opacity:1},{opacity:0}],{duration:ms,fill:'forwards'}));setTimeout(()=>{if(ticket!==turn)return;drawTiles();panels.forEach(p=>{for(const n of [p.tiles,p.midTiles,p.smallTiles]){n.getAnimations().forEach(a=>a.cancel());n.animate([{opacity:0},{opacity:1}],{duration:ms});}flash(p.status);});},ms);}
  function dial(n,id){n.dataset.dial=id;n.setAttribute('aria-label',id+' category dial');n.setAttribute('role','slider');n.setAttribute('aria-valuemin','1');n.setAttribute('aria-valuemax','6');let start=null,turned=false;
    const step=d=>{switchTo(names[(names.indexOf(category)+d+6)%6]);n.setAttribute('aria-valuenow',names.indexOf(category)+1);touch(n);};
    n.onpointerdown=e=>{e.preventDefault();n.setPointerCapture(e.pointerId);start={x:e.clientX,y:e.clientY};turned=false;};
    n.onpointermove=e=>{if(!start)return;const dx=e.clientX-start.x,dy=start.y-e.clientY;const delta=Math.abs(dx)>Math.abs(dy)?dx:dy;if(Math.abs(delta)>16){step(Math.sign(delta));start={x:e.clientX,y:e.clientY};turned=true;}};
    n.onpointerup=()=>{start=null;};n.onpointercancel=()=>{start=null;turned=true;};n.onclick=()=>{if(!turned)step(1);turned=false;};
    n.onkeydown=e=>{if(['ArrowLeft','ArrowDown','ArrowRight','ArrowUp'].includes(e.key)){e.preventDefault();step(['ArrowLeft','ArrowDown'].includes(e.key)?-1:1);}};el('b','',n,id==='console'?'Categories':'Options');}
  function panel(parent){const scene=el('section','ev-scene',parent);el('div','ev-photo',scene);el('div','ev-wood',scene);el('div','ev-glass-surface',scene);const thread=el('div','ev-thread',scene),form=el('form','ev-input',scene),input=el('input','',form);input.setAttribute('aria-label','Message Alex');input.enterKeyHint='send';input.oninput=()=>{draft=input.value;syncDraft();};input.onfocus=()=>{typing=true;renderAux();};input.onblur=()=>{typing=false;renderAux();};
    const arr=el('button','',form);arr.type='submit';arr.setAttribute('aria-label','Send message');icon(arr,'ArrowUp');form.onsubmit=e=>{e.preventDefault();touch(arr);send();input.focus();};
    const push=btn(scene,'PUSH\nSEND',()=>{touch(push);send();},'ev-push');push.setAttribute('aria-label','Push to send');
    for(const b of [push,arr])b.onpointerdown=e=>e.preventDefault();
    const main=el('div','ev-main',scene),title=el('strong','ev-heading',main),tiles=el('div','ev-tiles',main),middle=el('div','ev-aux',scene),small=el('div','ev-status',scene),aux=el('div','',middle),midTiles=el('div','ev-items',middle),status=el('div','',small),smallTiles=el('div','ev-items',small);
    const vent=btn(scene,'',null,'ev-dial'),consoleDial=btn(scene,'',null,'ev-dial');dial(vent,'vent');dial(consoleDial,'console');return {scene,thread,input,send:arr,push,title,tiles,aux,status,midTiles,smallTiles,consoleDial,vent};}
  function style(){host.style.setProperty('--depth',String(prefs.curve/135));host.style.setProperty('--veneer',({'Honey ash':'none',Walnut:'saturate(.88) brightness(.72)',Driftwood:'saturate(.2) brightness(1.02)',Ebony:'saturate(.2) brightness(.57)',Copper:'sepia(.45) saturate(1.55)'})[prefs.veneer]);
    for(const [k,v] of Object.entries({'--size':'clamp(17px,'+prefs.size/7+'cqw,'+prefs.size+'px)','--glow':prefs.glow,'--glow-time':prefs.duration+'ms','--mx':prefs.x+'%','--my':prefs.y+'%'}))host.style.setProperty(k,v);drawTiles();}
  function field(label,name,kind,values){const l=el('label','',tools,label+' '),n=el(kind==='select'?'select':'input','',l);n.name=name;if(kind==='select')values.forEach(v=>n.add(new Option(v,v)));else{n.type=kind;if(kind==='range'){n.min=values[0];n.max=values[1];}}n.value=name==='category'?category:name==='order'?(prefs.order[category]||0):prefs[name];if(kind==='checkbox')n.checked=prefs[name];n.oninput=()=>{if(name==='category')return switchTo(n.value);if(name==='order')prefs.order[category]=+n.value;else prefs[name]=kind==='range'?+n.value:kind==='checkbox'?n.checked:n.value;style();note('Unsaved design changes');};}
  function tileEditor(){
    const action=tools.querySelector('[name=action]'),zone=tools.querySelector('[name=zone]');
    if(!action)return;
    action.replaceChildren();groups[category].forEach(([label])=>action.add(new Option(label,label)));
    const update=()=>{zone.value=prefs.placement[action.value]||'Main';};
    action.onchange=update;update();
    zone.onchange=()=>{prefs.placement[action.value]=zone.value;drawTiles();note('Unsaved tile placement');};
  }
  async function receive(text,language='en'){if(!text.trim())return;const m={id:++sequence,text,lang:language,date:new Date(),out:false};messages.push(m);selected=m.id;thread();renderAux();if(auto||spoken){const t=await translate(m,target);if(spoken)speak(t,target);}}
  function mountPhone(device){
    const viewport=el('div','ev-phone-viewport',device),scroller=el('div','ev-phone-scroll',viewport);
    scroller.tabIndex=0;scroller.setAttribute('aria-label','Pan across the cabin');
    const phone=panel(scroller),scene=phone.scene;
    const nav=el('nav','ev-phone-nav',viewport);nav.setAttribute('aria-label','Phone framing');
    const stops=[['Driver',.16],['Center',.5],['Passenger',.86]];
    let center=.5;
    function pan(fraction,smooth=false){
      scroller.scrollTo({left:scene.offsetWidth*fraction-scroller.clientWidth/2,
        behavior:smooth&&!matchMedia('(prefers-reduced-motion: reduce)').matches?'smooth':'instant'});
    }
    const buttons=stops.map(([name,fraction])=>btn(nav,name,()=>pan(fraction,true)));
    function align(){
      const w=scene.offsetWidth,visible=scroller.clientWidth;
      if(!visible||!w)return;
      const x=scroller.scrollLeft;
      center=(x+visible/2)/w;
      const nearest=stops.reduce((best,stop,i)=>Math.abs(stop[1]-center)<Math.abs(stops[best][1]-center)?i:best,0);
      buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===nearest)));
      // Anchor the input to the visible part of the actual passenger rail.
      const left=Math.max(.368*w,x+8),right=Math.min(.858*w,x+visible-8);
      const form=phone.input.form;
      Object.assign(form.style,{left:left+'px',right:'auto',width:Math.max(0,right-left)+'px',visibility:right-left>=104?'visible':'hidden'});
      phone.thread.style.left=(x+16)+'px';phone.thread.style.width=(visible-32)+'px';phone.thread.style.right='auto';
    }
    function resize(){
      if(!device.clientWidth||!device.clientHeight)return;
      const native=matchMedia('(max-width:680px) and (pointer:coarse)').matches;
      const w=native?device.clientWidth:390,scale=device.clientWidth/w,h=device.clientHeight/scale;
      Object.assign(viewport.style,{width:w+'px',height:h+'px',transform:'scale('+scale+')'});
      Object.assign(scene.style,{width:Math.max(w,h*1.5)+'px',height:h+'px'});
      pan(center);align();
    }
    scroller.addEventListener('scroll',align,{passive:true});
    scene.setAttribute('aria-label','Live iPhone preview');
    new ResizeObserver(resize).observe(device);resize();
    return phone;
  }
  function show(){opened=true;const link=new URL(location.href);link.searchParams.set('layout','electric');history.replaceState(null,'',link);const studio=document.getElementById('raven-cabin-studio');studio.hidden=true;if(host){host.hidden=false;return;}
    host=el('main','ev',document.body);const h=el('header','',host);el('strong','',h,'Raven · Panoramic cabin');btn(h,'Cabin layouts',()=>{host.hidden=true;opened=false;studio.hidden=false;stopVoice();if(recorder)recorder.stop();recognition?.stop();history.replaceState(null,'',location.pathname);window.dispatchEvent(new Event('resize'));});btn(h,'Save in browser',()=>{try{localStorage.setItem(key,JSON.stringify(prefs));note('Design saved in this browser.');}catch{note('Browser storage is unavailable.');}});
    const pair=el('div','ev-pair',host),wide=panel(pair),device=el('aside','ev-phone',pair);panels=[wide,mountPhone(device)];
    tools=el('div','ev-tools',host);field('Category','category','select',names);field('Veneer','veneer','select',['Honey ash','Walnut','Driftwood','Ebony','Copper']);field('Tile size','size','range',[20,52]);field('Glass curve','curve','range',[0,36]);field('Tiles X','x','range',[-20,20]);field('Tiles Y','y','range',[-30,30]);field('First tile','order','range',[0,3]);field('Fade (ms)','fade','range',[0,800]);field('Glow','glow','color');field('Glow (ms)','duration','range',[150,1500]);field('Haptics','haptics','checkbox');btn(tools,'Preview incoming',()=>query('Preview incoming message','text',x=>run(()=>receive(x))));
    for(const [name,title,options] of [['action','Tile',[]],['zone','Screen',['Main','Middle','Small']]]){
      const select=el('select','',el('label','',tools,title+' '));select.name=name;options.forEach(x=>select.add(new Option(x,x)));
    }
    tileEditor();
    feedback=el('div','ev-feedback',host);feedback.setAttribute('role','status');dialog=el('dialog','',host);style();thread();syncDraft();}
  window.RavenElectric={open:show,receive:(text,lang)=>opened&&run(()=>receive(text,lang))};
  if(new URLSearchParams(location.search).get('layout')==='electric')show();
  window.addEventListener('pagehide',()=>{recorder?.stream.getTracks().forEach(t=>t.stop());recognition?.abort();uris.forEach(u=>URL.revokeObjectURL(u));});
})();
