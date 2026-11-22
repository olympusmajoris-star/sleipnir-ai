/* Source routes and part IDs come from the currently open editor or its source inventory. */
(function(root) {
  'use strict';
  const nativeWidgets=new Map();
  const knownPages=new Set(), partsByPage=new Map(), cached=new Map();
  function index(pages) {
    for(const p of pages) {
      knownPages.add(p.name);partsByPage.set(p.name,p.customWidgets||[]);
      for(const w of p.customWidgets||[]) {
        const prev=nativeWidgets.get(w);
        nativeWidgets.set(w,prev===undefined||prev===p.name?p.name:'');
      }
    }
  }
  const studioPages={
    shome:'HomePage',home:'HomePage',raven:'Asgard',convo:'Asgard/conversation',
    heimdall:'Asgard/horn',track:'OrderTracking',rocks:'Asgard',vbrowse:'ValhallaV2'
  };
  function capture(loc, win) {
    const source={group:loc.group,item:loc.page,store:loc.store||'',aisle:loc.aisle||'',feature:loc.feature||'',topic:loc.topic||'',asset:loc.asset||''};
    const from=loc.from||''; let store=source.store, aisle=loc.aisle||'', bounds;
    try{const b=typeof loc.bounds==='string'?JSON.parse(loc.bounds):loc.bounds;
      if(b&&['x','y','width','height'].every(k=>Number.isFinite(b[k])&&b[k]>=0&&b[k]<=1)&&b.width&&b.height&&b.x+b.width<=1.000001&&b.y+b.height<=1.000001)bounds=b;
    }catch{}
    let nativePage='', page='', candidates=[], selectedPart=loc.part||'', selectedLayer=loc.layer||'';
    const add=(type,id,label)=>{if(typeof id==='string'&&id&&!candidates.some(c=>c.type===type&&c.id===id))candidates.push({type,id,label:String(label||id)});};
    const appPage=loc.page==='app-pages';
    const cacheKey=JSON.stringify([loc.group,loc.page,loc.store||'',loc.aisle||'',loc.asset||'']);
    let prior=cached.get(cacheKey);
    if(!prior){try{prior=JSON.parse(root.sessionStorage?.getItem('studio-tool-target:'+cacheKey)||'null');}catch{}}
    if(prior)for(const c of prior.candidates||[])add(c.type,c.id,c.label);
    if(appPage) page=loc.asset||'';
    else if(['shopping','valhalla'].includes(loc.group)&&loc.page==='street') page='ValhallaV2';
    if(page && page!=='@default' && !page.startsWith('Studio_'))nativePage=page;
    try {
      const editor=win?.AsgardWorkspaceEditor, api=win?.StudioSelectionToolbox?.current?.()||win?.StudioSelectionTarget?.()||editor?.toolTarget?.()||null;
      const kit=win?.StudioKit;
      if(api?.page){page=api.page;nativePage=api.nativePage===false?'':api.page;}
      if(api?.store)store=api.store;if(api?.aisle)aisle=api.aisle;if(api?.bounds)bounds=api.bounds;
      if(!page && kit?.cur && kit.transitionRoute)nativePage=page=kit.transitionRoute(kit.cur.id);
      if(api) {
        for(const p of api.parts||[])add('part',p.id,p.label);
        for(const l of api.layers||[])add('layer',l.id,l.label);
        selectedPart ||= api.part||'';selectedLayer ||= api.layer||'';
      }
      // Existing page-layer DOM carries stable authored layer IDs. Only read
      // that public rendering surface, never a complete scene or user record.
      if(win?.AsgardPageEditor) {
        const doc=win.document;
        for(const node of doc.querySelectorAll('.spt-layer[data-layer]'))add('layer',node.dataset.layer,node.getAttribute('aria-label'));
        selectedLayer ||= doc.querySelector('.spt-layer.spt-selected[data-layer]')?.dataset.layer||'';
      }
      const components=win?.StoreComponentEditor;
      if(components) {
        const s=components.selection, a=components.assets?.find(r=>r.id===s.asset);
        for(const v of components.assets||[])add('part',v.id,v.name);
        selectedPart ||= a?.id||'';
        const candidate=a?.sourcePage||a?.renderer||a?.widget||a?.table;
        if(!page && candidate)nativePage=page=knownPages.has(candidate)?candidate:nativeWidgets.get(candidate)||'';
      }
      if(!page && win?.location?.search) {
        const renderer=new URLSearchParams(win.location.search).get('renderer');
        nativePage=page=nativeWidgets.get(renderer)||'';
      }
      if(kit?.cur?.SPEC) {
        for(const row of kit.cur.SPEC)add('part',row.target,row.section);
        selectedPart ||= kit.currentTarget?.()||'';
      }
    } catch { /* An external source may still be addressed by its Workshop location. */ }
    if(!page&&loc.toolPage){page=loc.toolPage;nativePage=loc.toolNative||'';}
    if(!page && !appPage && studioPages[loc.page])nativePage=page=studioPages[loc.page];
    if(!page)page=loc.toolPage||'Studio_'+loc.group+'_'+loc.page.replaceAll('-','_');
    if(loc.toolNative)nativePage=loc.toolNative;
    if(prior && !win && !loc.toolPage && page.startsWith('Studio_')){nativePage=prior.nativePage;page=prior.page;}
    for(const widget of partsByPage.get(nativePage)||[])add('part','widget:'+widget,widget);
    if(!loc.targetType){selectedPart ||= prior?.part||'';selectedLayer ||= prior?.layer||'';}
    if(!appPage && source.asset)add('part',source.asset,source.asset);
    if(!selectedPart&&!appPage&&!loc.toolbox){selectedPart=source.asset||source.feature||'';}
    add('part',selectedPart,selectedPart);add('layer',selectedLayer,selectedLayer);
    add('store',store,loc.storeLabel||store);add('aisle',aisle,loc.aisleLabel||aisle);
    if(loc.targetType==='page'){bounds=undefined;selectedPart='';selectedLayer='';store='';aisle='';}
    if(loc.targetType==='store'){selectedPart='';selectedLayer='';aisle='';}
    if(loc.targetType==='aisle'){selectedPart='';selectedLayer='';}
    add('store',store,loc.storeLabel||store);
    add('aisle',aisle,loc.aisleLabel||aisle);
    if(loc.targetType==='part')selectedLayer='';
    const value={page,nativePage,store,aisle,from,bounds,part:selectedPart,layer:selectedLayer,
      type:selectedLayer?'layer':selectedPart?'part':aisle?'aisle':store?'store':'page',id:selectedLayer||selectedPart||aisle||store||page,
      label:loc.targetLabel||candidates.find(c=>c.id===(selectedLayer||selectedPart||aisle||store))?.label||selectedLayer||selectedPart||aisle||store||page,source,candidates};
    if(win){cached.set(cacheKey,value);try{root.sessionStorage?.setItem('studio-tool-target:'+cacheKey,JSON.stringify(value));}catch{}}
    return value;
  }
  function select(context,type,id) {
    if(type==='page')return {...context,store:'',aisle:'',part:'',layer:'',type,id:context.page,label:context.page};
    const option=context.candidates.find(c=>c.type===type&&c.id===id);
    if(!option)throw Error('Select a part or layer from this source.');
    return {...context,...option,bounds:undefined,store:type==='store'?id:context.store||context.source.store,
      aisle:type==='aisle'?id:type==='store'?'':context.aisle||context.source.aisle,
      part:type==='part'?id:type==='layer'?context.part:'',layer:type==='layer'?id:''};
  }
  root.StudioToolTargets=Object.freeze({index,capture,select});
})(window);
