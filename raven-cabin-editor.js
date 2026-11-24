/* Local live editing for controls attached to the cabin's projected surfaces. */
(function (G) {
  'use strict';
  const clone=value=>JSON.parse(JSON.stringify(value));
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
  const number=value=>typeof value==='number'&&Number.isFinite(value);
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const HEX=/^#[0-9a-f]{6}$/i;
  const STORAGE='asgard.raven.cabin.design.v2';
  const CYAN='#5FD8FF';
  const SKINS=['clean','illuminated'];
  const fields=['icon','x','y','size','rotation','color','opacity','visible','locked','style','background','radius','shadow'];
  const materialDefaults={leather:null,wood:null,led:null,ledBrightness:1};

  function mount({controller:c,root,media={},geometry:g,nativeIcon,requestLayout=()=>{},enabled=false}){
    const D=c.scene.ownerDocument,scene=c.scene,catalog=G.RavenCabinIconCatalog?G.RavenCabinIconCatalog.create(G.lucide):[];
    const listeners=[],subscribers=new Set(),handles=new Map(),decorated=new Set(),renderedSources=new Map();
    const raf=G.requestAnimationFrame?G.requestAnimationFrame.bind(G):fn=>G.setTimeout(()=>fn(Date.now()),16);
    const caf=G.cancelAnimationFrame?G.cancelAnimationFrame.bind(G):G.clearTimeout.bind(G);
    const q=selector=>scene.querySelector(selector),base=[
      ['image','Photos','Dashboard','Image',g.slots.image,'[data-control="image"]','chat'],
      ['mic','Talk to text','Dashboard','Mic',g.slots.mic,'[data-control="mic"]','chat'],
      ['call','Voice call','Dashboard','Phone',g.slots.call,'[data-control="call"]','chat'],
      ['video','Video call','Dashboard','Video',g.slots.video,'[data-control="video"]','chat'],
      ['radio','Read aloud','Steering wheel','Volume2',g.slots.radio,'[data-control="radio"]','chat'],
      ['language','Translation','Steering wheel','Languages',g.slots.language,'[data-control="language"]','chat'],
      ['send','Send message','Dashboard','ArrowUp',[g.compose[0]+g.compose[2]-28,g.compose[1]+g.compose[3]/2],'.rw-send','chat'],
      ['motion','Road motion','Overhead','Pause',g.motion,'.rw-motion','chat'],
      ['camera','Self camera','Overhead','Camera',g.overhead[0],'.rc-camera','video'],
      ['share','Share','Overhead','Image',g.overhead[1],'.rc-share','video'],
      ['end-call','End call','Overhead','PhoneOff',g.overhead[2],'.rc-end','video'],
      ['return','Return to call','Passenger door','ArrowLeft',g.shareKeys[0],'.rc-return','sharing'],
      ['pick','Choose shared media','Passenger door','ImagePlus',g.shareKeys[1],'.rc-pick','sharing'],
      ['end-share','End call','Passenger door','PhoneOff',g.shareKeys[2],'.rc-end','sharing'],
      ['play','Shared-video playback','Passenger window','Play',[g.sideContent[0]+g.sideContent[2]-36,g.sideContent[1]+g.sideContent[3]-36],'.rc-play','sharing']
    ];
    const specs=base.map(([id,label,group,icon,point,selector,view])=>({id,label,group,icon,point:point.slice(),selector,view})),specById=new Map(specs.map(s=>[s.id,s]));
    const defaults=Object.fromEntries(specs.map(s=>[s.id,{icon:s.icon,x:s.point[0],y:s.point[1],size:['radio','language','motion','play'].includes(s.id)?16:['camera','share','end-call','return','pick','end-share'].includes(s.id)?14:18,rotation:0,color:CYAN,opacity:1,visible:true,locked:false,style:'glyph',background:'#007AFF',radius:24,shadow:.3}]));
    const workspace=()=>({controls:clone(defaults),materials:{...materialDefaults}});
    let design={kind:'asgard-raven-cabin',version:2,skin:'clean',workspaces:{clean:workspace(),illuminated:workspace()},motion:{duration:800,videoYaw:10,sharingYaw:35}};
    let selected='image',editing=!!enabled,activeDesign=!!enabled,disposed=false,lastProjector=null;
    let history=[],future=[],lastChangeKey='',lastChangeTime=0,gestureDepth=0,gestureStart=null,pointer=null;
    let panFrame=0,noticeFrame=0,initialFrame=0,refreshFrame=0,panTime=null,lastSaved='',status='Changes preview live. Save keeps this design in this browser.';
    let lastViewStamp='',lastSkinSource='',savedAt=null;
    const on=(target,type,fn,options)=>{target.addEventListener(type,fn,options);listeners.push(()=>target.removeEventListener(type,fn,options));};
    const current=()=>design.workspaces[design.skin];
    const serialize=()=>JSON.stringify(design);
    const mode=()=>root.dataset.cabinMode==='call'?'video':root.dataset.cabinMode||'chat';
    const progress=()=>{
      const view=c.cabin&&c.cabin.getView?c.cabin.getView():g.views.chat,x=view[0];
      return clamp(x<=g.views.video[0]?(x-g.views.chat[0])/(g.views.video[0]-g.views.chat[0])*.5:.5+(x-g.views.video[0])/(g.views.sharing[0]-g.views.video[0])*.5,0,1);
    };
    function validIcon(value){return typeof value==='string'&&!!(catalog.get?catalog.get(value):(G.lucide&&Array.isArray((G.lucide.icons||G.lucide)[value])));}
    function canonicalIcon(value){return catalog.get?catalog.get(value).name:value;}
    function assertPlain(value,label){if(!value||typeof value!=='object'||Array.isArray(value))throw Error(label+' must be an object.');}
    function keys(value,allowed,label){assertPlain(value,label);for(const key of Object.keys(value))if(!allowed.includes(key))throw Error('Unsupported '+label+' field: '+key);}
    function controlPatch(patch,strict=false){
      keys(patch,fields,'control');const out={};
      for(const [key,value] of Object.entries(patch)){
        if(key==='icon'){if(!validIcon(value))throw Error('Choose an icon from the installed catalog.');out.icon=canonicalIcon(value);}
        else if(key==='color'||key==='background'){if(typeof value!=='string'||!HEX.test(value))throw Error('Use a six-digit hex color.');out[key]=value.toUpperCase();}
        else if(key==='visible'||key==='locked'){if(typeof value!=='boolean')throw Error(key+' must be true or false.');out[key]=value;}
        else if(key==='style'){if(!['glyph','tile','glass'].includes(value))throw Error('Choose Glyph, Tile, or Glass.');out.style=value;}
        else{
          if(!number(value))throw Error(key+' must be a finite number.');
          const ranges={x:[0,g.width],y:[0,g.height],size:[8,80],rotation:[-180,180],opacity:[0,1],radius:[0,50],shadow:[0,1]},[min,max]=ranges[key];
          if(strict&&(value<min||value>max))throw Error(key+' is outside the supported range.');out[key]=clamp(value,min,max);
        }
      }
      return out;
    }
    function materialsPatch(patch,strict=false){
      keys(patch,Object.keys(materialDefaults),'material');const out={};
      for(const [key,value] of Object.entries(patch)){
        if(key==='ledBrightness'){if(!number(value)||(strict&&(value<0||value>2)))throw Error('LED brightness must be between 0 and 2.');out[key]=clamp(value,0,2);}
        else{if(value!==null&&(typeof value!=='string'||!HEX.test(value)))throw Error('Material colors must be a six-digit hex color or null.');out[key]=value===null?null:value.toUpperCase();}
      }return out;
    }
    function motionPatch(patch,strict=false){
      keys(patch,['duration','videoYaw','sharingYaw'],'motion');const out={};
      for(const [key,value] of Object.entries(patch)){
        const range=key==='duration'?[150,4000]:key==='videoYaw'?[0,30]:[15,55];
        if(!number(value)||(strict&&(value<range[0]||value>range[1])))throw Error('That camera setting is outside the supported range.');out[key]=clamp(value,...range);
      }return out;
    }
    function validate(value){
      keys(value,['kind','version','skin','workspaces','motion'],'design');
      if(value.kind!=='asgard-raven-cabin'||value.version!==2)throw Error('Choose a Raven cabin design exported by this editor.');
      if(!SKINS.includes(value.skin))throw Error('Unknown cabin workspace.');keys(value.workspaces,SKINS,'workspace collection');
      const result={kind:'asgard-raven-cabin',version:2,skin:value.skin,workspaces:{},motion:{...design.motion,...motionPatch(value.motion,true)}};
      for(const skin of SKINS){
        const source=value.workspaces[skin];keys(source,['controls','materials'],skin+' workspace');keys(source.controls,specs.map(s=>s.id),'controls');
        const controls={};for(const spec of specs){if(!source.controls[spec.id])throw Error('Missing control: '+spec.label);controls[spec.id]={...defaults[spec.id],...controlPatch(source.controls[spec.id],true)};}
        result.workspaces[skin]={controls,materials:{...materialDefaults,...materialsPatch(source.materials||{},true)}};
      }return result;
    }
    try{
      const stored=G.localStorage&&G.localStorage.getItem(STORAGE);
      if(stored){const parsed=JSON.parse(stored);design=validate(parsed.design||parsed);lastSaved=serialize();savedAt=parsed.savedAt||null;activeDesign=true;status='Saved design restored from this browser.';}
    }catch(_){status='Browser storage is unavailable or contains an older design. Live editing still works.';}

    function getState(){return {
      selected,editing,view:mode(),pan:progress(),canUndo:history.length>0||!!(gestureStart&&gestureStart!==serialize()),canRedo:future.length>0,
      saved:lastSaved===serialize(),savedAt,status,skin:design.skin,skinAvailable:{clean:!!media.cabin,illuminated:!!media.cabinLit},
      controls:specs.map(spec=>({id:spec.id,label:spec.label,group:spec.group,...clone(current().controls[spec.id])})),
      motion:{...design.motion},materials:{...current().materials},playingPan:!!panFrame
    };}
    function notify(){
      if(disposed||noticeFrame)return;
      noticeFrame=raf(()=>{noticeFrame=0;if(disposed)return;const state=getState();for(const fn of subscribers)try{fn(state);}catch(_){} });
    }
    function cancelPan(){if(panFrame)caf(panFrame);panFrame=0;panTime=null;}
    function pushHistory(snapshot){history.push(snapshot);if(history.length>80)history.shift();future=[];}
    function beginEdit(){if(disposed)return;if(!gestureDepth)gestureStart=serialize();gestureDepth++;lastChangeKey='';}
    function endEdit(){if(!gestureDepth)return;if(--gestureDepth)return;const before=gestureStart;gestureStart=null;if(before&&before!==serialize())pushHistory(before);notify();}
    function flushGesture(){while(gestureDepth)endEdit();}
    function applyEnvironment(){
      g.panDuration=design.motion.duration;g.camera={...(g.camera||{}),videoYaw:design.motion.videoYaw,sharingYaw:design.motion.sharingYaw};
      g.materialColors={...current().materials};
      const source=design.skin==='illuminated'?media.cabinLit:media.cabin;
      if(source&&source!==lastSkinSource){lastSkinSource=source;c.photo.src=source;c.wheel.src=source;}
      root.dataset.cabinSkin=design.skin;root.dataset.rceEditing=String(editing);
    }
    function changed(key,operation){
      if(disposed)return false;cancelPan();const before=serialize();operation();const after=serialize();if(before===after)return false;
      activeDesign=true;const now=Date.now();if(!gestureDepth){if(key!==lastChangeKey||now-lastChangeTime>600||future.length)pushHistory(before);else future=[];lastChangeKey=key;lastChangeTime=now;}
      status='Live changes · not saved yet.';applyEnvironment();requestLayout();notify();return true;
    }
    function updateControl(id,patch){
      if(!specById.has(id))throw Error('Choose a cabin control.');const next=controlPatch(patch),old=current().controls[id];
      if(next.style&&next.style!=='glyph'&&old.style==='glyph'&&!Object.hasOwn(next,'color')&&old.color.toUpperCase()===CYAN)next.color='#FFFFFF';
      return changed('control:'+id+':'+Object.keys(next).sort().join(','),()=>Object.assign(current().controls[id],next));
    }
    function updateMaterials(patch){const next=materialsPatch(patch);return changed('materials:'+Object.keys(next).sort().join(','),()=>Object.assign(current().materials,next));}
    function updateMotion(patch){const next=motionPatch(patch);return changed('motion:'+Object.keys(next).sort().join(','),()=>Object.assign(design.motion,next));}
    function undo(){flushGesture();if(!history.length)return;cancelPan();future.push(serialize());design=JSON.parse(history.pop());lastChangeKey='';status='Edit undone · preview updated.';applyEnvironment();requestLayout();notify();}
    function redo(){flushGesture();if(!future.length)return;cancelPan();history.push(serialize());design=JSON.parse(future.pop());lastChangeKey='';status='Edit restored · preview updated.';applyEnvironment();requestLayout();notify();}
    function setView(view){
      if(!['chat','video','sharing'].includes(view))return false;cancelPan();if(!c.cabin)return false;
      if(view==='sharing')c.cabin.receiveShared({src:media.poster,type:'image',name:'Studio shared-photo sample'});
      else c.cabin.open(view);notify();return true;
    }
    function setPanProgress(value){
      if(!number(value))return false;cancelPan();if(!c.cabin||!c.cabin.previewPan)return false;c.cabin.previewPan(clamp(value,0,1));notify();return true;
    }
    function playPan(){
      cancelPan();if(!c.cabin||!c.cabin.previewPan)return false;
      const start=progress()>=.99?0:progress(),duration=design.motion.duration*2*(1-start);
      c.cabin.previewPan(start);
      const tick=time=>{if(disposed)return;if(panTime===null)panTime=time;const t=clamp((time-panTime)/Math.max(150,duration),0,1),smooth=t*t*(3-2*t);c.cabin.previewPan(start+(1-start)*smooth);notify();if(t<1)panFrame=raf(tick);else{panFrame=0;panTime=null;notify();}};
      panFrame=raf(tick);notify();return true;
    }
    function select(id){
      if(!specById.has(id))return false;selected=id;const spec=specById.get(id),node=q(spec.selector);
      if(!node||node.hidden||node.closest('[hidden]'))setView(spec.view);
      requestLayout();notify();return true;
    }
    function setEditing(value){cancelPan();editing=!!value;activeDesign=activeDesign||editing;root.dataset.rceEditing=String(editing);requestLayout();notify();}
    function setSkin(skin){
      if(!SKINS.includes(skin))return false;if(skin==='illuminated'&&!media.cabinLit){status='The illuminated cabin is still loading.';notify();return false;}
      flushGesture();return changed('skin',()=>{design.skin=skin;});
    }
    function save(){
      flushGesture();try{savedAt=new Date().toISOString();G.localStorage.setItem(STORAGE,JSON.stringify({design,savedAt}));lastSaved=serialize();status='Saved in this browser. Both cabin workspaces are kept.';notify();return {ok:true,message:status};}
      catch(_){savedAt=null;status='This browser could not save the design. Export it to keep a copy.';notify();return {ok:false,message:status};}
    }
    function importDesign(text){
      if(typeof text!=='string'||text.length>150000)throw Error('Choose a Raven design JSON file under 150 KB.');let parsed;try{parsed=JSON.parse(text);}catch(_){throw Error('That file is not valid JSON.');}
      const next=validate(parsed);flushGesture();changed('import',()=>{design=next;});status='Design imported. Changes are visible; save to keep them in this browser.';notify();return true;
    }
    function iconName(spec,config,node){
      return config.icon===defaults[spec.id].icon&&(node.dataset.motionIcon||node.dataset.icon)?node.dataset.motionIcon||node.dataset.icon:config.icon;
    }
    function eligible(spec,view){
      if(spec.id==='end-call')return view==='video';if(spec.id==='end-share')return view==='sharing';
      if(spec.id==='send')return true;if(spec.id==='image')return view!=='sharing';return spec.view===view;
    }
    function parentOrigin(node){
      if(node.parentElement===scene)return [0,0];
      if(c.compose&&c.compose.contains(node))return [parseFloat(c.compose.style.left)||0,parseFloat(c.compose.style.top)||0];
      return [0,0];
    }
    function plane(visual,center,extent,rotation,P,origin){
      const sourceSize=extent/Math.max(.001,P.width/g.views.chat[2]),half=sourceSize/2,angle=rotation*Math.PI/180,co=Math.cos(angle),si=Math.sin(angle);
      const corners=[[-half,-half],[half,-half],[half,half],[-half,half]].map(([x,y])=>P.point(center[0]+x*co-y*si,center[1]+x*si+y*co));
      if(corners.some(p=>!p.every(Number.isFinite)))return null;
      const p=corners.map(v=>[v[0]-origin[0],v[1]-origin[1]]),[a,b,d,e]=p,dx1=b[0]-d[0],dx2=e[0]-d[0],dx3=a[0]-b[0]+d[0]-e[0],dy1=b[1]-d[1],dy2=e[1]-d[1],dy3=a[1]-b[1]+d[1]-e[1],den=dx1*dy2-dx2*dy1;
      let u=0,v=0;if(Math.abs(den)>1e-8){u=(dx3*dy2-dx2*dy3)/den;v=(dx1*dy3-dx3*dy1)/den;}
      const matrix=[(b[0]-a[0]+u*b[0])/extent,(b[1]-a[1]+u*b[1])/extent,0,u/extent,(e[0]-a[0]+v*e[0])/extent,(e[1]-a[1]+v*e[1])/extent,0,v/extent,0,0,1,0,a[0],a[1],0,1];
      Object.assign(visual.style,{left:'0px',top:'0px',width:extent+'px',height:extent+'px',transformOrigin:'0 0',transform:'matrix3d('+matrix.join(',')+')'});
      const xs=corners.map(p=>p[0]),ys=corners.map(p=>p[1]);return {left:Math.min(...xs),top:Math.min(...ys),right:Math.max(...xs),bottom:Math.max(...ys)};
    }
    function target(handle,rect){Object.assign(handle.style,{left:rect.x+'px',top:rect.y+'px',width:rect.w+'px',height:rect.h+'px'});}
    function ensureHandle(spec){
      if(handles.has(spec.id))return handles.get(spec.id);
      const button=D.createElement('button');button.type='button';button.className='rce-handle cursor-interaction';button.dataset.controlId=spec.id;button.setAttribute('aria-label','Move '+spec.label);button.setAttribute('data-tooltip','Drag '+spec.label);button.hidden=true;scene.appendChild(button);
      on(button,'click',event=>{event.preventDefault();event.stopPropagation();select(spec.id);});
      on(button,'pointerdown',event=>startPointer(event,spec.id,'move'));on(button,'keydown',event=>keyboard(event,spec.id));
      handles.set(spec.id,button);return button;
    }
    const resize=D.createElement('button');resize.type='button';resize.className='rce-resize cursor-interaction';resize.setAttribute('aria-label','Resize selected icon');resize.setAttribute('data-tooltip','Drag to resize');resize.hidden=true;scene.appendChild(resize);
    on(resize,'pointerdown',event=>startPointer(event,selected,'size'));on(resize,'click',event=>{event.preventDefault();event.stopPropagation();});on(resize,'keydown',event=>keyboard(event,selected));
    const live=D.createElement('span');live.className='rce-announcement';live.setAttribute('aria-live','polite');scene.appendChild(live);
    function sourcePoint(event){
      if(!lastProjector)return null;const rect=scene.getBoundingClientRect(),x=(event.clientX-rect.left)*lastProjector.width/Math.max(1,rect.width),y=(event.clientY-rect.top)*lastProjector.height/Math.max(1,rect.height);
      const point=lastProjector.unproject?lastProjector.unproject(x,y):[x/lastProjector.scale,y/lastProjector.scale];return point.every(Number.isFinite)?point:null;
    }
    function startPointer(event,id,kind){
      if(!editing||disposed||event.button>0)return;event.preventDefault();event.stopPropagation();cancelPan();selected=id;const config=current().controls[id];if(config.locked){status='Unlock this control to move or resize it.';requestLayout();notify();return;}
      const point=sourcePoint(event);if(!point)return;flushGesture();beginEdit();const start=clone(config),shown=renderedSources.get(id);if(kind==='move'&&shown){start.x=shown[0];start.y=shown[1];}pointer={id,kind,pointerId:event.pointerId,source:point,start,x:event.clientX,y:event.clientY,target:event.currentTarget};
      try{event.currentTarget.setPointerCapture(event.pointerId);}catch(_){}requestLayout();notify();
    }
    function movePointer(event){
      if(!pointer||event.pointerId!==pointer.pointerId)return;event.preventDefault();const p=pointer;
      if(p.kind==='move'){const at=sourcePoint(event);if(at)updateControl(p.id,{x:p.start.x+at[0]-p.source[0],y:p.start.y+at[1]-p.source[1]});}
      else updateControl(p.id,{size:p.start.size+(event.clientX-p.x+event.clientY-p.y)/2});
    }
    function endPointer(event){if(!pointer||event&&event.pointerId!==pointer.pointerId)return;const p=pointer;pointer=null;try{p.target.releasePointerCapture(p.pointerId);}catch(_){}endEdit();live.textContent=specById.get(p.id).label+' updated.';notify();}
    function keyboard(event,id){
      if(!editing)return;const config=current().controls[id],amount=event.shiftKey?10:1,patch={};
      if(event.key==='Enter'||event.key===' '){event.preventDefault();select(id);return;}
      if(config.locked)return;
      if(event.key==='ArrowLeft')patch.x=config.x-amount;else if(event.key==='ArrowRight')patch.x=config.x+amount;else if(event.key==='ArrowUp')patch.y=config.y-amount;else if(event.key==='ArrowDown')patch.y=config.y+amount;else if(event.key==='+'||event.key==='=')patch.size=config.size+(event.shiftKey?4:1);else if(event.key==='-'||event.key==='_')patch.size=config.size-(event.shiftKey?4:1);else return;
      event.preventDefault();event.stopPropagation();selected=id;updateControl(id,patch);
    }
    on(D,'pointermove',movePointer,{passive:false});on(D,'pointerup',endPointer);on(D,'pointercancel',endPointer);
    on(scene,'click',event=>{
      if(!editing)return;const control=event.target.closest&&event.target.closest('[data-rce-control]');if(!control||control.classList.contains('rce-handle'))return;
      event.preventDefault();event.stopImmediatePropagation();select(control.dataset.rceControl);
    },true);
    on(scene,'keydown',event=>{
      if(!editing||event.target.closest('input,textarea,select'))return;
      if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();event.stopPropagation();if(event.shiftKey)redo();else undo();}
    });
    // Native state changes replace icons (Pause/Play, Camera/CameraOff). Reapply
    // the selected treatment after that replacement without observing styles.
    const iconObserver=typeof G.MutationObserver==='function'?new G.MutationObserver(records=>{
      if(disposed||!activeDesign||refreshFrame)return;
      if(records.some(record=>record.target.nodeType===1&&record.target.hasAttribute('data-rce-control')&&!record.target.querySelector('.rce-visual'))){refreshFrame=raf(()=>{refreshFrame=0;if(!disposed)requestLayout();});}
    }):null;
    if(iconObserver)iconObserver.observe(scene,{childList:true,subtree:true});

    function layout(P){
      if(disposed)return;lastProjector=P;const view=mode();root.dataset.rceEditing=String(editing);
      for(const handle of handles.values())handle.hidden=true;resize.hidden=true;
      if(!activeDesign)return;
      for(const spec of specs){
        const node=q(spec.selector);if(!node||!eligible(spec,view))continue;
        const config=current().controls[spec.id],def=defaults[spec.id],positioned=config.x!==def.x||config.y!==def.y;
        const parentHidden=!!node.parentElement.closest('[hidden]');
        const baselineHidden=spec.id==='send'?parentHidden:spec.id==='play'?(!editing&&!!q('.rc-shared-video')&&q('.rc-shared-video').hidden)||parentHidden:!!node.hidden||parentHidden;
        const sharedVideo=q('.rc-shared-video'),playUnavailable=spec.id==='play'&&!editing&&(!sharedVideo||sharedVideo.hidden);
        node.dataset.rceControl=spec.id;decorated.add(node);node.hidden=!config.visible||playUnavailable||(baselineHidden&&!positioned&&!(editing&&spec.id==='play'));
        if(!config.visible||node.hidden||node.parentElement.closest('[hidden]'))continue;
        let [x,y]=P.point(config.x,config.y);if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>P.width||y<0||y>P.height){node.hidden=true;continue;}
        const origin=parentOrigin(node),initialSvg=node.querySelector('svg');
        const rootSize=parseFloat(node.style.getPropertyValue('--rw-icon'))||parseFloat(node.style.getPropertyValue('--rc-icon'))||(spec.id==='send'?18:16);
        const initialLeft=parseFloat(node.style.left)||0,initialTop=parseFloat(node.style.top)||0;
        if(!positioned&&initialSvg){const sx=parseFloat(initialSvg.style.left),sy=parseFloat(initialSvg.style.top);if(Number.isFinite(sx)&&Number.isFinite(sy)){x=origin[0]+initialLeft+sx+rootSize/2;y=origin[1]+initialTop+sy+rootSize/2;}}
        const source=!positioned&&P.unproject?P.unproject(x,y):[config.x,config.y];renderedSources.set(spec.id,source);
        const size=config.size===def.size?rootSize:config.size,padding=config.style==='glyph'?0:8,extent=size+padding*2;
        let rect={x:origin[0]+initialLeft,y:origin[1]+initialTop,w:parseFloat(node.style.width)||44,h:parseFloat(node.style.height)||44};
        const enlarged=config.style!=='glyph'||config.size!==def.size;
        if(positioned||enlarged){const side=Math.max(44,extent+8);rect={x:clamp(x-side/2,0,Math.max(0,P.width-side)),y:clamp(y-side/2,0,Math.max(0,P.height-side)),w:side,h:side};}
        Object.assign(node.style,{left:(rect.x-origin[0])+'px',top:(rect.y-origin[1])+'px',right:'auto',bottom:'auto',width:rect.w+'px',height:rect.h+'px',minWidth:'44px',minHeight:'44px',overflow:'visible'});
        node.style.setProperty('opacity',editing?'1':'','important');
        let visual=node.querySelector('.rce-visual');if(!visual){visual=D.createElement('span');visual.className='rce-visual';node.replaceChildren(visual);}
        const chosen=iconName(spec,config,node);let svg=visual.querySelector('svg');
        if(!svg||svg.dataset.rceIcon!==chosen){const replacement=nativeIcon(chosen,size);if(replacement){replacement.dataset.rceIcon=chosen;visual.replaceChildren(replacement);svg=replacement;}}
        if(!svg)continue;
        visual.dataset.style=config.style;visual.style.opacity=String(config.opacity);visual.style.borderRadius=config.radius+'%';visual.style.background=config.style==='glyph'?'none':config.style==='glass'?config.background+'a6':config.background;
        visual.style.boxShadow=config.style==='glyph'?'none':'0 '+Math.round(2+config.shadow*5)+'px '+Math.round(5+config.shadow*14)+'px rgba(0,0,0,'+(config.shadow*.65)+'),inset 0 1px 0 #ffffff55';
        for(const [key,value] of Object.entries({position:'absolute',left:padding+'px',top:padding+'px',width:size+'px',height:size+'px',color:config.color,opacity:'1',filter:'none',transform:'none'}))svg.style.setProperty(key,value,'important');
        const bound=plane(visual,source,extent,config.rotation,P,[rect.x,rect.y]);if(!bound)continue;
        if(enlarged){
          const next={x:Math.min(rect.x,bound.left),y:Math.min(rect.y,bound.top),w:Math.max(rect.x+rect.w,bound.right)-Math.min(rect.x,bound.left),h:Math.max(rect.y+rect.h,bound.bottom)-Math.min(rect.y,bound.top)};
          rect=next;Object.assign(node.style,{left:(rect.x-origin[0])+'px',top:(rect.y-origin[1])+'px',width:rect.w+'px',height:rect.h+'px'});plane(visual,source,extent,config.rotation,P,[rect.x,rect.y]);
        }
        if(editing){
          const handle=ensureHandle(spec);target(handle,{x:clamp(rect.x,0,P.width-44),y:clamp(rect.y,0,P.height-44),w:Math.max(44,Math.min(rect.w,P.width)),h:Math.max(44,Math.min(rect.h,P.height))});handle.hidden=false;handle.dataset.selected=String(selected===spec.id);handle.dataset.locked=String(config.locked);handle.setAttribute('aria-pressed',String(selected===spec.id));handle.setAttribute('aria-label',(config.locked?'Locked ':'Move ')+spec.label);
          if(selected===spec.id&&!config.locked){
            const right=rect.x+rect.w+38<=P.width,bottom=rect.y+rect.h+38<=P.height;
            resize.dataset.horizontal=right?'right':'left';resize.dataset.vertical=bottom?'bottom':'top';
            target(resize,{x:clamp(right?rect.x+rect.w-6:rect.x-38,0,P.width-44),y:clamp(bottom?rect.y+rect.h-6:rect.y-38,0,P.height-44),w:44,h:44});resize.hidden=false;
          }
        }
      }
      const stamp=view+'|'+progress().toFixed(4);if(stamp!==lastViewStamp){lastViewStamp=stamp;notify();}
    }
    applyEnvironment();
    const api={
      getState,subscribe(fn){if(typeof fn!=='function')return()=>{};subscribers.add(fn);fn(getState());return()=>subscribers.delete(fn);},select,setEditing,updateControl,
      resetControl(id){if(!specById.has(id))return false;return changed('reset:'+id,()=>{current().controls[id]=clone(defaults[id]);});},undo,redo,beginEdit,endEdit,setView,setPanProgress,playPan,updateMotion,updateMaterials,setSkin,save,
      exportDesign(){return JSON.stringify(design,null,2);},importDesign,
      getCatalog(){const action=selected.startsWith('end-')?'end':selected==='play'?'motion':selected;return {all:catalog,suggestions:catalog.forAction?catalog.forAction(action).map(entry=>entry.name):[]};},
      layout,
      dispose(){if(disposed)return;disposed=true;cancelPan();if(noticeFrame)caf(noticeFrame);if(initialFrame)caf(initialFrame);if(refreshFrame)caf(refreshFrame);if(iconObserver)iconObserver.disconnect();listeners.splice(0).forEach(remove=>remove());handles.forEach(node=>node.remove());resize.remove();live.remove();subscribers.clear();for(const node of decorated){delete node.dataset.rceControl;const visual=node.querySelector('.rce-visual');if(visual){const icon=visual.querySelector('svg');if(icon){icon.removeAttribute('style');node.replaceChildren(icon);}else visual.remove();}node.style.removeProperty('opacity');}delete root.dataset.rceEditing;if(G.RavenCabinEditor===api)delete G.RavenCabinEditor;}
    };
    G.RavenCabinEditor=api;initialFrame=raf(()=>{initialFrame=0;requestLayout();notify();});return api;
  }
  G.RavenCabinEditBridge={mount};
})(window);
