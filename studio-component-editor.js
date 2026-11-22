(() => {
  'use strict';
  const $=id=>document.getElementById(id), node=(tag,value)=>{const e=document.createElement(tag);if(value!=null)e.textContent=value;return e;};
  const params=new URLSearchParams(location.search);
  const target=Object.fromEntries(['page','store','aisle','part','layer'].map(k=>[k,params.get(k)||'']));
  const store=window.PortableLayerStore, component=window.StudioComponentLayers;
  const clone=structuredClone;
  const key='studio.component.instances.v1.'+JSON.stringify(Object.values(target));
  let layers=[],revision=0,selected='',meta=null,handle=null,active='',dirty=false,loaded=false,busy=false,seq=0,group='';
  const isComponent=l=>l?.kind==='frame' && l.scene?.version===1 && Object.hasOwn(component.sources,l.scene.screen);
  const item=()=>layers.find(l=>isComponent(l)&&l.id===selected);
  const groupId=f=>JSON.stringify([f.group,f.section]);
  const notify=(topic,title)=>{if(parent!==window)parent.postMessage({type:'studio:toolbox-topic',tool:'components',topic,title},location.origin);};
  function status(text){$('status').textContent=text;}
  function syncButtons(){
    $('publish').disabled=!dirty||busy||!loaded;$('add').disabled=busy||!loaded;
    $('remove').disabled=busy;$('instances').disabled=busy;
  }
  function changed(){
    dirty=true;try{localStorage.setItem(key,JSON.stringify({revision,layers}));}catch{}
    status('Instance draft on this device.');syncButtons();
  }
  function options(select, rows, value) {
    select.replaceChildren(...rows.map(([v,txt])=>{const o=node('option',txt);o.value=v;return o;}));
    select.value=value;
  }
  function pickFields(){
    $('fields').replaceChildren();
    if(!meta||!item())return;
    const groups=[...new Map(meta.fields.map(f=>[groupId(f),f.group+' · '+f.section])).entries()];
    if(!groups.some(([k])=>k===group)) group='';
    options($('group'),[['','Choose an adjustment group'],...groups],group);
    if(!group)return;
    const current=item().scene;
    for(const f of meta.fields.filter(f=>groupId(f)===group)){
      const label=node('label'), title=node('span',f.label+(f.unit?' ('+f.unit+')':''));
      const input=node(f.type==='select'?'select':'input'),reset=node('button','Reset');reset.type='button';
      input.setAttribute('aria-label',f.label);reset.setAttribute('aria-label','Reset '+f.label);
      if(f.type==='select'){
        const opts=f.options.map(([v,t])=>[JSON.stringify(v),t]);
        if(!f.options.some(([v])=>v===f.baseline))opts.unshift([JSON.stringify(f.baseline),'Source default (device unavailable)']);
        options(input,opts,JSON.stringify(current.values[f.key]??f.baseline));
      }else {
        input.type=({num:'number',int:'number',text:'text',color:'color',bool:'checkbox'})[f.type];
        const val=Object.hasOwn(current.values,f.key)?current.values[f.key]:f.baseline;
        if(f.type==='bool')input.checked=!!val;
        else input.value=val??'';
        if(['num','int'].includes(f.type)){input.min=f.min;input.max=f.max;input.step=f.step;}
        if(f.type==='text')input.maxLength=500;
      }
      reset.disabled=!Object.hasOwn(current.values,f.key);
      input.onchange=()=>{
        if(busy||!item())return;
        let value=input.value;
        if(f.type==='bool')value=input.checked;
        else if(f.type==='select')value=JSON.parse(value);
        else if(['num','int'].includes(f.type)){
          value=input.valueAsNumber;
          if(!Number.isFinite(value)||value<f.min||value>f.max||(f.type==='int'&&!Number.isInteger(value))){input.reportValidity();return;}
        }
        if(!Object.hasOwn(current.values,f.key)&&Object.keys(current.values).length>=2048){status('This instance has 2,048 overrides. Reset one to add another.');return;}
        if(value===f.baseline)delete current.values[f.key];else current.values[f.key]=value;
        reset.disabled=!Object.hasOwn(current.values,f.key);handle.update(current);changed();
      };
      reset.onclick=()=>{if(busy)return;delete current.values[f.key];handle.update(current);changed();pickFields();};
      label.append(title,input,reset);$('fields').append(label);
    }
  }
  async function display(resetGroup=false){
    const token=++seq,layer=item();
    options($('instances'),[['','Add a component…'],...layers.filter(isComponent).map(l=>[l.id,l.name])],layer?.id||'');
    $('choose').hidden=!!layer;$('edit').hidden=!layer;
    if(resetGroup){group='';notify('','');}
    if(!layer){
      handle?.dispose();handle=null;active='';meta=null;$('fields').replaceChildren();$('caption').textContent='Choose a source screen to place.';syncButtons();return;
    }
    const separate=component.foregroundAvailable(layer.scene.screen);
    $('plane').options[0].disabled=!separate;
    $('plane').options[1].textContent=separate?'Full scene':'Full scene (art and controls together)';
    $('plane').value=separate?layer.scene.plane:'full';
    $('plane').disabled=!separate;
    $('edit-source').value=layer.scene.screen;
    if(active!==layer.id){handle?.dispose();handle=null;active=layer.id;meta=null;}
    handle=component.mount($('art'),layer.scene);$('caption').textContent='Loading '+component.sources[layer.scene.screen]+'…';
    try {
      const data=await handle.ready;if(token!==seq)return;meta=data;
      $('caption').textContent=data.title+' · '+data.source;pickFields();
    }catch(e){if(token===seq)status(e.message);}
    syncButtons();
  }
  function restorePublished(row) {
    layers=clone(row.layers);revision=row.revision;dirty=false;
    selected=layers.find(isComponent)?.id||'';try{localStorage.removeItem(key);}catch{}
  }
  async function load(useDraft){
    const n=++seq;busy=true;syncButtons();
    try{
      const row=await store.read(target);if(n!==seq)return;loaded=true;
      let local;
      if(useDraft)try{local=JSON.parse(localStorage.getItem(key));}catch{}
      if(local&&Array.isArray(local.layers)&&Number.isInteger(local.revision)){
        layers=local.layers;revision=local.revision;dirty=true;selected=layers.find(isComponent)?.id||'';
        status(row.revision===revision?'Device draft restored.':'Your draft is based on an older publication. Reload to use the current target.');
      }else{restorePublished(row);status('Published target loaded.');}
    }catch(e){status(e.message);}finally{busy=false;display(true);}
  }
  $('target').textContent=[params.get('storeName')||target.store,target.aisle,target.part,target.layer].filter(Boolean).join(' › ')||target.page;
  options($('source'),Object.entries(component.sources),'home');
  options($('edit-source'),Object.entries(component.sources),'home');
  $('edit-source').onchange=()=>{
    const layer=item(), screen=$('edit-source').value;
    if(busy||!layer||layer.scene.screen===screen)return;
    if(Object.keys(layer.scene.values).length && !confirm('Replace this instance’s adjustments with the new source?')){
      $('edit-source').value=layer.scene.screen;return;
    }
    layer.scene=component.scene({version:1,screen,plane:layer.scene.plane,values:{}});
    layer.name=component.sources[screen];changed();display(true);
  };
  $('add').onclick=()=>{
    if(!loaded||busy)return;
    const id=$('source').value;const layer=StudioPageTools.makeLayer('frame',{name:component.sources[id]});
    Object.assign(layer,{name:component.sources[id],x:195,y:422,width:234,height:506,style:'image',fillOpacity:0,border:0,padding:0,scene:component.scene({version:1,screen:id,plane:'foreground',values:{}})});
    layers.push(layer);selected=layer.id;changed();display(true);
  };
  $('instances').onchange=()=>{selected=$('instances').value;display(true);};
  $('plane').onchange=()=>{if(busy||!item())return;item().scene.plane=$('plane').value;handle?.update(item().scene);changed();};
  $('group').onchange=()=>{group=$('group').value;pickFields();notify(group,group?JSON.parse(group).join(' · '):'');};
  $('remove').onclick=()=>{if(busy||!item())return;layers=layers.filter(l=>l.id!==selected);selected=layers.find(isComponent)?.id||'';changed();display(true);};
  $('publish').onclick=async()=>{
    if(!loaded||!dirty||busy)return;busy=true;syncButtons();
    const submitted=clone(layers);
    try{
      const r=await store.publish(target,submitted,revision);
      revision=r.revision;dirty=false;try{localStorage.removeItem(key);}catch{}
      status('Published components to this target.');
    }catch(e){status(e.message+' Your instance draft is kept on this device.');}finally{busy=false;syncButtons();}
  };
  $('reload').onclick=()=>{if(!busy && (!dirty||confirm('Replace these instance edits with the latest published target?')))load(false);};
  $('back').onclick=()=>{if(group){group='';pickFields();notify('','');return;}
    if(parent!==window)parent.postMessage({type:'studio:toolbox-back'},location.origin);
    else history.back();};
  addEventListener('pagehide',()=>handle?.dispose(),{once:true});
  const level=params.get('targetType')||'page';
  if(!/^[A-Za-z][A-Za-z0-9_]{0,79}(\/[A-Za-z][A-Za-z0-9_-]{0,39})?$/.test(target.page) ||
     (target.aisle&&!target.store) || !['page','store','aisle','part','layer'].includes(level) || !target[level] ||
     (target.store&&!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(target.store))){
    status('Choose a page and its original containing target.');syncButtons();return;
  }
  load(true);
})();
