(() => {
  'use strict';
  const params=new URLSearchParams(location.search), $=id=>document.getElementById(id);
  const topics={layers:'Layer & order',size:'Size & placement',media:'Image & video',panels:'Display panels',style:'Style & piping',light:'Shadows & glow',text:'Text & fonts',motion:'Floating & motion',action:'Tap action'};
  const qs=Object.fromEntries(params);
  if (!qs.page) { $('status').textContent='Choose a target in the Studio toolbox.'; return; }
  const target=PortableLayerStore.target(qs), key='studio.portable.draft.v1.'+PortableLayerStore.stamp(target);
  const doc={_studioLayers:[]}, past=[];
  let topic=topics[params.get('topic')]?params.get('topic'):'', rev=0, last='[]', dirty=false, writing=false, loaded=false, trying=false;
  const media=SharedStudioMedia.create({url:StudioTransferConfig.url,headers:more=>({apikey:StudioTransferConfig.key,Authorization:'Bearer '+(StudioJobs.current()?.access_token||StudioTransferConfig.key),...more})});
  const history=() => { $('undo').disabled=!past.length||writing; $('publish').disabled=writing||!loaded||!dirty; };
  function stash(){
    try { localStorage.setItem(key,JSON.stringify({revision:rev,layers:doc._studioLayers})); $('status').textContent='Draft saved on this device.'; }
    catch { $('status').textContent='This device could not save the draft. Keep this editor open.'; }
    history();
  }
  function change(){
    const next=JSON.stringify(doc._studioLayers);
    if(next===last) return;
    if(past.length===80)past.shift();past.push(last);last=next;dirty=true;stash();
  }
  function arrange(host){
    const context=host.querySelector('.spt-context');
    const add=context?.querySelector('.sm-actions');
    if(add) add.hidden=topic!=='layers' && doc._studioLayers.length>0;
    context?.querySelectorAll('p').forEach(p=>p.hidden=topic!=='layers');
    for(const group of host.querySelectorAll('[data-studio-group]'))group.hidden=group.dataset.studioGroup!==topics[topic];
    if(topic==='action' && doc._studioLayers.length && !host.querySelector('[data-studio-group="Tap action"]')){
      const msg=document.createElement('p');msg.textContent='Select or add a button layer to edit its tap action.';host.append(msg);
    }
  }
  const engine=StudioPageTools.mount({stage:$('art'),canvas:$('scene'),media,getState:()=>({page:key,S:doc,sec:trying?'':'design'}),onAction:action=>{const destination=action.target||action.productId||action.contactId;$('status').textContent='Preview action · '+action.type+' '+destination;},save:change,selectSection(){topic='layers';display();},arrange});
  function display(){
    $('options').hidden=Boolean(topic);$('panel').hidden=!topic;
    $('title').textContent=topic?topics[topic]:'Choose a layer tool';
    if(topic)engine.panel($('panel'));engine.sync();history();
  }
  function back(){
    if(window.parent!==window){window.parent.postMessage({type:'studio:portable-back'},location.origin);return;}
    if(topic){topic='';display();return;}
    location.href='workshop.html?group=shopping&item=app-pages';
  }
  $('target').textContent=[target.page, target.store && (params.get('storeName')||'Store '+target.store),target.aisle,target.part,target.layer].filter(Boolean).join(' › ');
  Object.entries(topics).forEach(([k,title])=>{const b=document.createElement('button');b.textContent=title;b.onclick=()=>{topic=k;display();};$('options').append(b);});
  $('back').onclick=back;
  $('preview').onclick=()=>{trying=!trying;engine.setInteracting(trying);$('preview').textContent=trying?'Return to editing':'Preview';engine.sync();};
  $('undo').onclick=()=>{if(!past.length)return;last=past.pop();doc._studioLayers=JSON.parse(last);dirty=true;stash();display();};
  let saveEpoch=0;
  async function read(useDraft){
    const epoch=++saveEpoch;
    const existing=useDraft?localStorage.getItem(key):null;
    if(existing){try{const draft=JSON.parse(existing);if(Array.isArray(draft.layers)){doc._studioLayers=draft.layers;rev=draft.revision;last=JSON.stringify(draft.layers);dirty=true;display();}}catch{}}
    try{
      const r=await PortableLayerStore.read(target);if(epoch!==saveEpoch)return;
      loaded=true;
      if(!dirty){rev=r.revision;doc._studioLayers=r.layers;last=JSON.stringify(r.layers);}
      $('status').textContent=dirty?(r.revision===rev?'Draft on this device.':'Your draft is based on an older publication.'):'Showing published layers.';
      $('reload').hidden=!dirty || r.revision===rev;
    }catch(e){if(epoch===saveEpoch){$('status').textContent=e.message;$('reload').hidden=false;}}
    display();
  }
  $('reload').onclick=()=>{if(dirty && !confirm('Replace this device draft with the current published layers?'))return;dirty=false;past.length=0;localStorage.removeItem(key);read(false);};
  $('publish').onclick=async()=>{
    if(writing||!loaded)return;
    writing=true;history();const submitted=JSON.stringify(doc._studioLayers);
    try{const r=await PortableLayerStore.publish(target,JSON.parse(submitted),rev);rev=r.revision;dirty=JSON.stringify(doc._studioLayers)!==submitted;
      if(dirty)stash();else{localStorage.removeItem(key);$('status').textContent='Published to this target.';}
    }catch(e){$('status').textContent=e.message;$('reload').hidden=false;}
    finally{writing=false;history();}
  };
  // The Studio can provide the authored page as a reference behind the editing plane.
  const screens={HomePage:'home',Asgard:'sky','Asgard/dial':'dial','Asgard/directory':'directory','Asgard/conversation':'conversation','Asgard/horn':'horn','Asgard/way':'way'};
  const id=screens[target.page];
  if(!id || target.store || target.aisle || target.part || target.layer){
    $('caption').textContent='Layer-only preview for this target';
  }else{
    const f=document.createElement('iframe');f.setAttribute('allow',"camera 'none'; microphone 'none'");f.inert=true;f.setAttribute('aria-hidden','true');f.title='Scene capture';
    f.style.cssText='position:fixed;left:-10000px;top:0;width:390px;height:844px;pointer-events:none;border:0';f.src='sleipnir-studio-1120.html?transition-frame=1#'+id;
    f.onload=async()=>{try{const k=f.contentWindow.StudioKit;await k.ready;await k.show(id,{replace:true});k.previewCovered=true;
      const frame=k.captureTransitionScreen(id);if(!frame)return;
      $('scene').getContext('2d').drawImage(frame.full,0,0,390,844);$('caption').textContent=k.screens[id].title;
    }catch{ $('caption').textContent='Layer-only preview'; }finally{f.remove();}};
    document.body.append(f);
  }
  display();read(true);
  window.addEventListener('pagehide',()=>engine.dispose());
})();
