/* Live object geometry. Native layout remains the baseline on every frame. */
(function (G) {
  'use strict';
  const specs=[
    {id:'screenFrame',label:'Screen frame',group:'Screen',kind:'group',members:['messageThread','mainVideo','typingBar']},
    {id:'messageThread',label:'Message thread',group:'Windshield',kind:'layer',view:'chat',selector:'.rw-thread'},
    {id:'typingBar',label:'Typing bar',group:'Dashboard',kind:'layer',view:'chat',selector:'.rw-compose'},
    {id:'mainVideo',label:'Main video screen',group:'Video call',kind:'layer',view:'video',selector:'.rc-remote'},
    {id:'selfMirror',label:'Your folding mirror',group:'Video call',kind:'layer',view:'video',selector:'.rc-mirror'},
    {id:'sharedScreen',label:'Passenger window screen',group:'Sharing',kind:'layer',view:'sharing',selector:'.rc-sharing'},
    {id:'sideMirror',label:'Passenger side mirror',group:'Sharing',kind:'layer',view:'sharing',selector:'.rc-side-peer'},
    {id:'doorControls',label:'Door controls',group:'Control groups',kind:'group',view:'sharing',selector:'.rc-control:not(.rc-reveal)'},
    {id:'tabletControls',label:'Dashboard controls',group:'Control groups',kind:'group',view:'chat',selector:'[data-control]'}
  ];
  const baseline={x:0,y:0,width:100,height:100,rotation:0,opacity:1,visible:true,locked:false};
  const defaults=()=>Object.fromEntries(specs.map(spec=>[spec.id,{...baseline}]));
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
  const finite=(v,fallback=0)=>Number.isFinite(Number(v))?Number(v):fallback;
  const radians=degrees=>degrees*Math.PI/180;
  function rotate([x,y],angle){const co=Math.cos(angle),si=Math.sin(angle);return [x*co-y*si,x*si+y*co];}
  const center=r=>[r.x+r.w/2,r.y+r.h/2];
  function union(rects){const x=Math.min(...rects.map(r=>r.x)),y=Math.min(...rects.map(r=>r.y));return {x,y,w:Math.max(...rects.map(r=>r.x+r.w))-x,h:Math.max(...rects.map(r=>r.y+r.h))-y};}
  function config(value){const v={...baseline,...value};return {x:clamp(finite(v.x),-40,40),y:clamp(finite(v.y),-40,40),width:clamp(finite(v.width,100),25,200),height:clamp(finite(v.height,100),25,200),rotation:clamp(finite(v.rotation),-30,30),opacity:clamp(finite(v.opacity,1),0,1),visible:v.visible!==false,locked:v.locked===true};}
  function mount({controller:c,root,geometry:g={},getState=()=>({}),updateObject=()=>{},selectObject=()=>{},requestLayout=()=>{},beginEdit=()=>{},endEdit=()=>{}}={}) {
    const scene=c.scene,D=scene.ownerDocument,listeners=[],decorated=new Map(),rendered=new Map(),inverses=new Map(),groupFrames=new Map();
    let disposed=false,lastP=null,pointer=null,lastSelected='';
    const q=selector=>scene.querySelector(selector),qa=selector=>Array.from(scene.querySelectorAll(selector));
    const on=(node,type,handler,options)=>{node.addEventListener(type,handler,options);listeners.push(()=>node.removeEventListener(type,handler,options));};
    function touch(node){if(!decorated.has(node))decorated.set(node,new Set());return decorated.get(node);}
    function attr(node,key,value){touch(node).add('@'+key);node.setAttribute(key,value);}
    function variable(node,key,value){const name='--rco-'+key;touch(node).add(name);node.style.setProperty(name,String(value));}
    function clearDecorations(){for(const [node,properties]of decorated){for(const name of properties){if(name[0]==='@')node.removeAttribute(name.slice(1));else node.style.removeProperty(name);}}decorated.clear();}
    function rawRect(node){return {x:finite(parseFloat(node.style.left)),y:finite(parseFloat(node.style.top)),w:Math.max(0,finite(parseFloat(node.style.width),node.offsetWidth||0)),h:Math.max(0,finite(parseFloat(node.style.height),node.offsetHeight||0))};}
    function nativeVisible(node){return !!node&&!node.hidden&&!node.closest('[hidden]')&&node.style.display!=='none';}
    function layer(node,r,rotation=0,opacity=1,visible=true){if(!node)return;attr(node,'data-rco-layer','');for(const [key,value]of Object.entries({left:r.x+'px',top:r.y+'px',width:r.w+'px',height:r.h+'px',rotation:rotation+'deg',opacity}))variable(node,key,value);if(!visible)attr(node,'data-rco-hidden','true');}
    function child(node,r){if(!node)return;attr(node,'data-rco-child','');for(const [key,value]of Object.entries({left:r.x+'px',top:r.y+'px',width:r.w+'px',height:r.h+'px'}))variable(node,key,value);}
    function displaced(node,base,to,rotation,opacity=1,visible=true){const from=center(base);attr(node,'data-rco-member','');variable(node,'dx',(to[0]-from[0])+'px');variable(node,'dy',(to[1]-from[1])+'px');variable(node,'rotation',rotation+'deg');variable(node,'opacity',opacity);if(!visible)attr(node,'data-rco-hidden','true');}
    function affine(base,value,P){const origin=center(base),angle=radians(value.rotation),sx=value.width/100,sy=value.height/100,offset=[value.x/100*P.width,value.y/100*P.height],target=[origin[0]+offset[0],origin[1]+offset[1]];return {origin,target,angle,sx,sy,
      forward(point){const r=rotate([(point[0]-origin[0])*sx,(point[1]-origin[1])*sy],angle);return [target[0]+r[0],target[1]+r[1]];},
      inverse(point){const r=rotate([point[0]-target[0],point[1]-target[1]],-angle);return [origin[0]+r[0]/sx,origin[1]+r[1]/sy];},
      rect:{x:target[0]-base.w*sx/2,y:target[1]-base.h*sy/2,w:base.w*sx,h:base.h*sy}};}
    function controlId(node,view){if(node.dataset.rceControl)return node.dataset.rceControl;if(node.dataset.control)return node.dataset.control;for(const [cls,id]of [['rc-play','play'],['rc-rewind','rewind'],['rc-forward','forward'],['rc-keep','keep'],['rc-follow','follow'],['rc-more','more'],['rc-return','return'],['rc-pick','pick'],['rc-fit','fit'],['rc-camera','camera'],['rc-share','share'],['rc-end',view==='sharing'?'end-share':'end-call']])if(node.classList.contains(cls))return id;return '';}
    function associatedHandles(id){return qa('.rce-handle').filter(node=>node.dataset.controlId===id);}
    function moveIconHandles(id,baseCenter,targetCenter,angle,visible,opacity=1){
      const controls=associatedHandles(id),selected=controls.some(node=>node.dataset.selected==='true'),resize=selected?q('.rce-resize'):null;if(resize&&!resize.hidden)controls.push(resize);
      for(const handle of controls){const r=rawRect(handle),at=center(r),delta=rotate([at[0]-baseCenter[0],at[1]-baseCenter[1]],angle);displaced(handle,r,[targetCenter[0]+delta[0],targetCenter[1]+delta[1]],angle*180/Math.PI,opacity,visible);}
    }
    function localVisualCenter(node){const r=rawRect(node),match=(node.style.transform||'').match(/^matrix3d\(([^)]+)\)$/);if(!match)return center(r);const m=match[1].split(',').map(Number),x=r.w/2,y=r.h/2,den=m[3]*x+m[7]*y+m[15];if(m.length!==16||!Number.isFinite(den)||Math.abs(den)<1e-8)return center(r);return [r.x+(m[0]*x+m[4]*y+m[12])/den,r.y+(m[1]*x+m[5]*y+m[13])/den];}
    function resizeComposer(node,base,A,value){
      const resized=value.width!==100||value.height!==100;if(resized)attr(node,'data-rco-composer','');
      const surface=q('.rw-input-surface');if(surface){const r=rawRect(surface),at=A.forward(center(r));layer(surface,{x:at[0]-r.w*A.sx/2,y:at[1]-r.h*A.sy/2,w:r.w*A.sx,h:r.h*A.sy},value.rotation,value.opacity,value.visible);}
      const send=node.querySelector('.rw-send');if(!send)return;
      const old=rawRect(send),oldCenter=center(old),w=Math.max(44,old.w),h=Math.max(44,old.h),newX=resized?clamp(oldCenter[0]*A.sx,w/2,Math.max(w/2,A.rect.w-w/2)):oldCenter[0],newY=resized?A.rect.h/2:oldCenter[1];
      if(resized){child(send,{x:newX-w/2,y:newY-h/2,w,h});variable(node,'input-width',Math.max(0,newX-w/2-8)+'px');}
      const visual=send.querySelector('.rce-visual'),svg=send.querySelector('svg');if(resized&&visual){const at=localVisualCenter(visual);attr(visual,'data-rco-send-visual','');variable(visual,'dx',(w/2-at[0])+'px');variable(visual,'dy',(h/2-at[1])+'px');}else if(resized&&svg){const size=finite(parseFloat(svg.style.width),18);child(svg,{x:w/2-size/2,y:h/2-size/2,w:size,h:size});}
      const baseCenter=[base.x+oldCenter[0],base.y+oldCenter[1]],local=rotate([newX-A.rect.w/2,newY-A.rect.h/2],A.angle),to=[A.target[0]+local[0],A.target[1]+local[1]];
      moveIconHandles('send',baseCenter,to,A.angle,value.visible);
      inverses.set('send',point=>{const delta=rotate([point[0]-to[0],point[1]-to[1]],-A.angle);return [baseCenter[0]+delta[0],baseCenter[1]+delta[1]];});
    }
    function geometryStamp(P){let points=[];if(typeof P.point==='function')for(const at of [[0,0],[g.width||1926,g.height||817],[(g.width||1926)/2,(g.height||817)/2]])points.push(...P.point(...at));return [P.width,P.height,c.photo&&(c.photo.currentSrc||c.photo.src)||'',...points.map(v=>Math.round(v*1000)/1000),JSON.stringify(g.slots||{}),JSON.stringify(g.doorControls||{})].join('|');}
    function screenFrame(P,s,view){
      if(!['chat','video'].includes(view))return null;
      const contentId=view==='video'?'mainVideo':'messageThread',content=q(view==='video'?'.rc-remote':'.rw-thread'),composer=q('.rw-compose');
      const members=[content,composer].filter(nativeVisible).map(rawRect).filter(r=>r.w>0&&r.h>0);if(!members.length)return null;
      const base=union(members),value=valueFor('screenFrame',s),bar=nativeVisible(composer)?rawRect(composer):null,barValue=valueFor('typingBar',s),barHeight=bar?bar.h*barValue.height/100:0;
      // Resizing the frame reflows its content above a native-height typing bar.
      const height=Math.max(base.h*value.height/100,barHeight+(bar?24:1)),A=affine(base,{...value,height:height/base.h*100},P),sy=bar?(A.rect.h-barHeight)/Math.max(1,base.h-bar.h):A.sy;
      const mapping=(kind)=>{
        const factor=kind==='composer'?A.sy:sy,offset=kind==='composer'?A.rect.h/2-barHeight/2-(base.y+base.h-bar.y-bar.h)*A.sy:-A.rect.h/2;
        const sourceY=kind==='composer'?bar.y+bar.h/2:base.y;
        return {forward(point){const at=rotate([(point[0]-A.origin[0])*A.sx,offset+(point[1]-sourceY)*factor],A.angle);return[A.target[0]+at[0],A.target[1]+at[1]];},inverse(point){const at=rotate([point[0]-A.target[0],point[1]-A.target[1]],-A.angle);return[A.origin[0]+at[0]/A.sx,sourceY+(at[1]-offset)/factor];}};
      };
      return {base,value,A,contentId,sy,content:mapping('content'),composer:bar?mapping('composer'):null};
    }
    function memberAffine(base,value,P,frame,id){
      const own=affine(base,value,P),parent=frame&&(id===frame.contentId?frame.content:id==='typingBar'?frame.composer:null);if(!parent)return{A:own,effective:value,parent:null};
      const target=parent.forward(own.target),origin=center(base),effective={...value,x:(target[0]-origin[0])/P.width*100,y:(target[1]-origin[1])/P.height*100,width:value.width*frame.A.sx,height:value.height*(id==='typingBar'?1:frame.sy),rotation:value.rotation+frame.value.rotation,opacity:value.opacity*frame.value.opacity,visible:value.visible&&frame.value.visible};
      return{A:affine(base,effective,P),effective,parent};
    }
    function renderGroup(spec,value,P,view,stamp){
      const members=qa(spec.selector).filter(nativeVisible);if(!members.length)return;
      const rects=members.map(node=>rawRect(node));let frame=groupFrames.get(spec.id);if(!frame||frame.stamp!==stamp){frame={stamp,rect:union(rects)};groupFrames.set(spec.id,frame);}
      const base=frame.rect,A=affine(base,value,P);rendered.set(spec.id,{base,rect:A.rect,value,angle:A.angle});
      for(let i=0;i<members.length;i++){const node=members[i],r=rects[i],from=center(r),to=A.forward(from),id=controlId(node,view);displaced(node,r,to,value.rotation,value.opacity,value.visible);if(id){inverses.set(id,A.inverse);moveIconHandles(id,from,to,A.angle,value.visible);}}
    }
    const outline=D.createElement('div');outline.className='rco-selection';outline.hidden=true;scene.appendChild(outline);
    const move=D.createElement('button');move.type='button';move.className='rco-object-move';outline.appendChild(move);
    const resize=D.createElement('button');resize.type='button';resize.className='rco-object-resize';resize.setAttribute('aria-label','Resize selected object');outline.appendChild(resize);
    const live=D.createElement('span');live.className='rco-announcement';live.setAttribute('aria-live','polite');scene.appendChild(live);
    const frameOutline=D.createElement('div');frameOutline.className='rco-screen-frame';frameOutline.hidden=true;scene.appendChild(frameOutline);
    const frameMove=D.createElement('button');frameMove.type='button';frameMove.className='rco-frame-move';frameMove.textContent='Screen frame';frameMove.setAttribute('aria-label','Move screen frame');frameMove.title='Drag the screen frame. The cabin stays in place.';frameOutline.appendChild(frameMove);
    const frameResize=D.createElement('button');frameResize.type='button';frameResize.className='rco-frame-resize';frameResize.setAttribute('aria-label','Resize screen frame');frameResize.title='Resize the whole screen frame; the typing bar keeps its height.';frameOutline.appendChild(frameResize);
    const frameEdges=['top','right','bottom','left'].map(edge=>{const button=D.createElement('button');button.type='button';button.className='rco-frame-edge';button.dataset.edge=edge;button.tabIndex=-1;button.setAttribute('aria-label','Move screen frame from '+edge+' edge');frameOutline.appendChild(button);return button;});
    function state(){return getState()||{};}
    function valueFor(id,s=state()){const values=s.objects||{},source=Array.isArray(values)?values.find(item=>item.id===id):values[id];return config(source);}
    function layout(P){
      if(disposed||!P||!P.width||!P.height)return;lastP=P;clearDecorations();rendered.clear();inverses.clear();outline.hidden=true;frameOutline.hidden=true;
      const s=state(),view=root.dataset.cabinMode==='call'?'video':root.dataset.cabinMode||'chat',stamp=geometryStamp(P);
      const frame=screenFrame(P,s,view);if(frame)rendered.set('screenFrame',{base:frame.base,rect:frame.A.rect,value:frame.value,angle:frame.A.angle});
      for(const spec of specs){
        if(spec.id==='screenFrame')continue;
        const relevant=spec.id==='typingBar'||spec.id==='tabletControls'?view==='chat'||view==='video':spec.view===view;if(!relevant)continue;
        const value=valueFor(spec.id,s);if(spec.kind==='group'){renderGroup(spec,value,P,view,stamp);continue;}
        const node=q(spec.selector);if(!node||!nativeVisible(node))continue;const base=rawRect(node);if(base.w<=0||base.h<=0)continue;
        const {A,effective,parent}=memberAffine(base,value,P,frame,spec.id);layer(node,A.rect,effective.rotation,effective.opacity,effective.visible);attr(node,'data-rco-object-id',spec.id);rendered.set(spec.id,{base,rect:A.rect,value,angle:A.angle,parent,visible:effective.visible,opacity:effective.opacity});
        if(spec.id==='typingBar')resizeComposer(node,base,A,effective);
        if(spec.id==='sharedScreen'){const content=node.querySelector('.rc-share-content');if(content){const r=rawRect(content);child(content,{x:r.x*A.sx,y:r.y*A.sy,w:r.w*A.sx,h:r.h*A.sy});}}
      }
      const selected=typeof s.selectedObject==='string'?s.selectedObject:s.selectedObject&&s.selectedObject.id,entry=rendered.get(selected),spec=specs.find(item=>item.id===selected);
      if(s.editing&&frame){const r=frame.A.rect;Object.assign(frameOutline.style,{left:r.x+'px',top:r.y+'px',width:r.w+'px',height:r.h+'px',transform:'rotate('+frame.value.rotation+'deg)'});frameOutline.hidden=false;frameOutline.dataset.active=String(selected==='screenFrame');frameOutline.dataset.locked=String(frame.value.locked);frameOutline.dataset.visible=String(frame.value.visible);frameResize.hidden=frame.value.locked;for(const edge of frameEdges)edge.disabled=frame.value.locked;frameMove.textContent='Screen frame'+(frame.value.locked?' · locked':'');}
      lastSelected=selected||'';if(!s.editing||!entry||!spec)return;
      if(selected==='screenFrame')return;
      const {rect:r,value}=entry;Object.assign(outline.style,{left:r.x+'px',top:r.y+'px',width:r.w+'px',height:r.h+'px',transform:'rotate('+(entry.angle*180/Math.PI)+'deg)'});outline.hidden=false;outline.dataset.locked=String(value.locked);outline.dataset.objectId=selected;outline.dataset.visible=String(value.visible);
      move.textContent=spec.label+(value.locked?' · locked':'');move.setAttribute('aria-label',(value.locked?'Select locked ':'Move ')+spec.label);move.title=value.locked?'Unlock this object in the inspector to move it.':'Drag to move. Arrow keys nudge; Shift moves faster.';resize.hidden=value.locked;resize.title='Drag to resize. Arrow keys resize; Shift changes faster.';
    }
    function scenePoint(event){if(!lastP)return null;const r=scene.getBoundingClientRect(),x=(event.clientX-r.left)*lastP.width/Math.max(1,r.width),y=(event.clientY-r.top)*lastP.height/Math.max(1,r.height);return Number.isFinite(x)&&Number.isFinite(y)?[x,y]:null;}
    function start(event,kind,chosen){const s=state(),id=chosen||lastSelected,entry=rendered.get(id);if(!s.editing||!entry||event.button>0)return;event.preventDefault();event.stopPropagation();if((id==='screenFrame'||entry.parent)&&c.cabin?.pauseVideoFocus)c.cabin.pauseVideoFocus();selectObject(id);if(entry.value.locked)return;const raw=scenePoint(event),point=raw&&(entry.parent?entry.parent.inverse(raw):raw);if(!point)return;beginEdit();pointer={id,kind,idNumber:event.pointerId,target:event.currentTarget,point,value:{...entry.value},base:{...entry.base},rect:{...entry.rect},angle:radians(entry.value.rotation),inverse:entry.parent?.inverse,width:lastP.width,height:lastP.height};try{event.currentTarget.setPointerCapture(event.pointerId);}catch(_){} }
    function apply(id,patch){updateObject(id,patch);requestLayout();}
    function drag(event){if(!pointer||event.pointerId!==pointer.idNumber)return;const raw=scenePoint(event);if(!raw)return;event.preventDefault();const p=pointer,at=p.inverse?p.inverse(raw):raw,dx=at[0]-p.point[0],dy=at[1]-p.point[1];if(p.kind==='move'){apply(p.id,{x:clamp(p.value.x+dx/p.width*100,-40,40),y:clamp(p.value.y+dy/p.height*100,-40,40)});return;}
      const local=rotate([dx,dy],-p.angle),width=clamp(p.value.width+local[0]/Math.max(1,p.base.w)*100,25,200),height=clamp(p.value.height+local[1]/Math.max(1,p.base.h)*100,25,200),dw=p.base.w*(width-p.value.width)/100,dh=p.base.h*(height-p.value.height)/100,shift=rotate([dw/2,dh/2],p.angle);
      apply(p.id,{width,height,x:clamp(p.value.x+shift[0]/p.width*100,-40,40),y:clamp(p.value.y+shift[1]/p.height*100,-40,40)});
    }
    function finish(event){if(!pointer||event&&event.pointerId!==pointer.idNumber)return;const p=pointer;pointer=null;try{p.target.releasePointerCapture(p.idNumber);}catch(_){}endEdit();live.textContent=(specs.find(spec=>spec.id===p.id)||{}).label+' updated.';}
    function keyboard(event,kind,chosen){const s=state(),id=chosen||lastSelected,value=valueFor(id,s);if(!s.editing||!id||value.locked||!lastP)return;if(event.key==='Escape'){event.preventDefault();event.stopPropagation();selectObject(null);requestLayout();return;}
      const delta=event.shiftKey?10:1,patch={};if(kind==='resize'){if(event.key==='ArrowLeft')patch.width=clamp(value.width-delta,25,200);else if(event.key==='ArrowRight')patch.width=clamp(value.width+delta,25,200);else if(event.key==='ArrowUp')patch.height=clamp(value.height-delta,25,200);else if(event.key==='ArrowDown')patch.height=clamp(value.height+delta,25,200);else return;}else{if(event.key==='ArrowLeft')patch.x=clamp(value.x-delta/lastP.width*100,-40,40);else if(event.key==='ArrowRight')patch.x=clamp(value.x+delta/lastP.width*100,-40,40);else if(event.key==='ArrowUp')patch.y=clamp(value.y-delta/lastP.height*100,-40,40);else if(event.key==='ArrowDown')patch.y=clamp(value.y+delta/lastP.height*100,-40,40);else return;}
      const entry=rendered.get(id);if(kind!=='resize'&&entry?.parent){const origin=center(entry.rect),at=entry.parent.inverse(origin),next=entry.parent.inverse([origin[0]+(patch.x===undefined?0:(patch.x-value.x)/100*lastP.width),origin[1]+(patch.y===undefined?0:(patch.y-value.y)/100*lastP.height)]);patch.x=clamp(value.x+(next[0]-at[0])/lastP.width*100,-40,40);patch.y=clamp(value.y+(next[1]-at[1])/lastP.height*100,-40,40);}
      event.preventDefault();event.stopPropagation();if((id==='screenFrame'||entry?.parent)&&c.cabin?.pauseVideoFocus)c.cabin.pauseVideoFocus();selectObject(id);beginEdit();apply(id,patch);endEdit();
    }
    on(move,'pointerdown',event=>start(event,'move'));on(resize,'pointerdown',event=>start(event,'resize'));on(move,'keydown',event=>keyboard(event,'move'));on(resize,'keydown',event=>keyboard(event,'resize'));
    for(const button of [move,resize])on(button,'click',event=>{event.preventDefault();event.stopPropagation();});
    for(const button of [frameMove,...frameEdges]){on(button,'pointerdown',event=>start(event,'move','screenFrame'));on(button,'keydown',event=>keyboard(event,'move','screenFrame'));on(button,'click',event=>{event.preventDefault();event.stopPropagation();selectObject('screenFrame');requestLayout();});}
    on(frameResize,'pointerdown',event=>start(event,'resize','screenFrame'));on(frameResize,'keydown',event=>keyboard(event,'resize','screenFrame'));on(frameResize,'click',event=>{event.preventDefault();event.stopPropagation();selectObject('screenFrame');requestLayout();});
    on(D,'pointermove',drag,{passive:false});on(D,'pointerup',finish);on(D,'pointercancel',finish);on(G,'blur',()=>finish());
    on(scene,'click',event=>{if(!state().editing||!event.target.closest)return;const node=event.target.closest('[data-rco-object-id]');if(!node||event.target.closest('input,textarea,button,select,a'))return;event.preventDefault();event.stopPropagation();selectObject(node.dataset.rcoObjectId);requestLayout();});
    function getRect(id){
      id=id==='thread'?'messageThread':id==='composer'?'typingBar':id;const entry=rendered.get(id);if(!entry||!(entry.visible??entry.value.visible)||(entry.opacity??entry.value.opacity)<=0||!lastP)return null;
      const r=entry.rect,at=center(r),points=[[-r.w/2,-r.h/2],[r.w/2,-r.h/2],[r.w/2,r.h/2],[-r.w/2,r.h/2]].map(point=>{const p=rotate(point,entry.angle);return [at[0]+p[0],at[1]+p[1]];}),x=Math.max(0,Math.min(...points.map(p=>p[0]))),y=Math.max(0,Math.min(...points.map(p=>p[1]))),right=Math.min(lastP.width,Math.max(...points.map(p=>p[0]))),bottom=Math.min(lastP.height,Math.max(...points.map(p=>p[1])));
      return right>x&&bottom>y?[x,y,right-x,bottom-y]:null;
    }
    return {layout,getRect,inversePointForControl(id,point){const inverse=inverses.get(id);return inverse?inverse(point):point;},dispose(){if(disposed)return;finish();disposed=true;listeners.splice(0).forEach(remove=>remove());clearDecorations();outline.remove();frameOutline.remove();live.remove();rendered.clear();inverses.clear();groupFrames.clear();}};
  }
  G.RavenCabinObjects={specs,defaults,mount};
})(window);
