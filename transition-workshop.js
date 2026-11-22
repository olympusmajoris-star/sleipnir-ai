/* The app-pages branch uses the Workshop's normal group, item and breadcrumb
   history and opens the same controls that are available on the Studio phone. */
(function (root) {
  'use strict';
  const item = 'app-pages';
  const labels = {
    HomePage:'Home', Asgard:'Asgard sky', 'Asgard/dial':'Raven dial',
    'Asgard/horn':'Heimdall horn', 'Asgard/way':'Wayfinder',
    'Asgard/directory':'Raven directory', 'Asgard/conversation':'Raven conversation',
    '@default':'App default'
  };
  const views = Object.keys(labels).filter(k => k !== '@default');
  const registry=root.StudioToolbox,targets=root.StudioToolTargets;
  const label = id => labels[id] || String(id || '').replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  const street = location => ['shopping','valhalla'].includes(location.group) && location.page === 'street';
  const active = location => !!location.toolbox || location.page === item || street(location);
  const feature = location => location.toolbox ? location.tool || '' : location.feature;
  const topic = location => location.toolbox ? location.edit || '' : location.topic;
  const change = (where,tool,edit='') => where.toolbox ? {...where,tool,edit} : {...where,feature:tool,topic:edit};
  const sky = location => active(location) && feature(location) === 'sky' && (location.toolbox || street(location) || (!!location.asset && location.asset !== '@default'));
  const skyTopic = key => typeof key === 'string' && (key === '' || /^[a-z][a-z0-9-]{0,59}$/.test(key));
  const focused = location => {
    const tool=registry.get(feature(location));
    return !!tool && !(tool.scope==='page'&&location.targetType&&location.targetType!=='page') && (tool.ownsChooser ? !!topic(location) : tool.topics.some(e=>e.id===topic(location)));
  };
  const skyTitles = {stars:'Stars',streamers:'Streamer black holes',raven:'Perched raven',day:'Day sky',night:'Night sky'};
  let inventoryJob;

  function inventory() {
    if (!inventoryJob) inventoryJob = fetch('original-page-inventory.json').then(async result => {
      if (!result.ok) throw new Error('The app page list could not load.');
      const data = await result.json();targets.index(data.pages);
      return [...new Set(data.pages.map(page => page.name).filter(Boolean))];
    }).catch(error => { inventoryJob = null; throw error; });
    return inventoryJob;
  }

  function groupOptions(select, label, routes) {
    const group = document.createElement('optgroup'); group.label = label;
    routes.forEach(id => group.append(new Option(labels[id] || id, id)));
    select.append(group);
  }
  function makeSelect(title) {
    const field = document.createElement('label');
    field.textContent = title;
    const select = document.createElement('select'); select.setAttribute('aria-label', title);
    field.append(select); return [field,select];
  }
  function button(text, handler) {
    const result = document.createElement('button');
    result.type='button'; result.textContent=text; result.onclick=handler;
    return result;
  }

  function crumbs(location,go) {
    const base=change(location,'','');
    const r=location.toolbox ? [[label(location.page),()=>go({...location,toolbox:false,tool:'',edit:''})],['Toolbox',()=>go(base)]] :
      street(location) ? [['Palm Coast storefronts',()=>go(base)]] : [['App pages',()=>go({...base,asset:'',from:'',part:'',layer:'',aisle:'',targetType:'',toolPage:'',toolNative:'',targetLabel:'',bounds:''})]];
    if (!location.toolbox && !street(location) && location.asset) r.push([label(location.asset),()=>go(base)]);
    if (location.from) r.push(['From '+label(location.from),()=>go({...base,from:''})]);
    const tool=registry.get(feature(location)), edit=topic(location);
    if(tool)r.push([street(location)&&tool.id==='sky'?'Storefront sky':tool.title,()=>go(change(location,tool.id))]);
    if(edit)r.push([tool?.topics.find(t=>t.id===edit)?.title||skyTitles[edit]||label(edit),null]);
    return r;
  }

  function toolView(location,nodes,go,show) {
    const target=targets.capture(location), tool=registry.get(feature(location)), edit=topic(location);
    const needsPage=tool?.scope==='page' && target.type!=='page';
    if(tool && !tool.supportsDefault && target.page==='@default'){
      show(null);const panel=document.createElement('section');panel.className='transition-workshop-picker';
      const heading=document.createElement('h1');heading.textContent=tool.title;
      const note=document.createElement('p');note.textContent='Choose the app page or one of its parts for this tool.';
      const pick=button('Choose target page',()=>{const select=nodes.nav.querySelector('[aria-label="App page"]');if(select)select.focus();else go({group:location.group,page:'app-pages'});});
      panel.append(heading,note,pick);nodes.empty.replaceChildren(panel);return;
    }
    if(tool && !needsPage && (tool.ownsChooser || tool.topics.some(t=>t.id===edit)))return show(registry.url(tool.id,target,edit));
    show(null);
    const panel=document.createElement('section');panel.className='transition-workshop-picker';
    const heading=document.createElement('h1');
    heading.textContent=tool?.title || (street(location)?'Palm Coast storefronts':label(target.page));
    panel.append(heading);nodes.empty.replaceChildren(panel);
    if(target.page!=='@default'){
      const [field,select]=makeSelect('Apply tools to');
      select.append(new Option('Whole page',''));
      for(const type of ['store','aisle','part','layer']){
        const list=target.candidates.filter(c=>c.type===type);
        if(!list.length)continue;
        const group=document.createElement('optgroup');group.label={store:'Stores',aisle:'Aisles',part:'Page parts',layer:'Layers'}[type];
        for(const v of list)group.append(new Option(v.label,JSON.stringify([type,v.id])));
        select.append(group);
      }
      select.value=target.type==='page'?'':JSON.stringify([target.type,target.id]);
      field.className='toolbox-target-picker';panel.append(field);
      select.onchange=()=>{const [type,id]=select.value?JSON.parse(select.value):['page',''];const t=targets.select(target,type,id);go({...location,part:t.part,layer:t.layer,targetType:t.type,targetLabel:t.label,bounds:t.bounds?JSON.stringify(t.bounds):''});};
      if(!target.nativePage){const n=document.createElement('p');n.textContent='Studio surface · native preview unavailable';panel.append(n);}
      if(needsPage){
        const n=document.createElement('p'); n.textContent=tool.title+' applies to the entire '+label(target.page)+' page. Your selected '+target.type+' is '+target.label+'.';panel.append(n);
        panel.append(button('Use whole page for '+tool.title,()=>go({...location,targetType:'page',part:'',layer:'',targetLabel:''})));return;
      }
    }
    const choices=document.createElement('nav');choices.setAttribute('aria-label',tool?'Edit types':'Page features');
    if(tool)tool.topics.forEach(t=>choices.append(button(t.title,()=>go(change(location,tool.id,t.id)))));
    else {
      registry.all().forEach(t=>choices.append(button(street(location)&&t.id==='sky'?'Storefront sky':t.title,()=>go(change(location,t.id)))));
      if(street(location))choices.append(button('Stores & storefronts',()=>go({group:'shopping',page:'vbrowse'})));
    }
    panel.append(choices);
  }
  function render(location, nodes, go, show, current) {
    const {nav,empty} = nodes;
    if (street(location)||location.toolbox) { inventory().catch(()=>{}); return toolView(location,nodes,go,show); }
    const host = document.createElement('div'); host.className = 'transition-page-tree';
    nav.querySelector('[data-p="app-pages"]').after(host);
    const [pageLabel,page] = makeSelect('App page');
    page.append(new Option('Choose a page…',''),new Option(labels['@default'],'@default'));
    groupOptions(page,'Asgard pages',views);
    host.append(pageLabel);
    const [fromLabel,from] = makeSelect('Arrival from');
    from.append(new Option('Any page',''));
    groupOptions(from,'Asgard pages',views);
    fromLabel.hidden = !location.asset || location.asset === '@default' || sky(location);
    host.append(fromLabel);
    // Preserve a deep-linked destination while the full native inventory loads.
    if (location.asset && !Array.from(page.options).some(o=>o.value===location.asset)) {
      page.append(new Option(label(location.asset),location.asset));
    }
    if (location.from && !Array.from(from.options).some(o=>o.value===location.from)) {
      from.append(new Option(label(location.from),location.from));
    }
    page.value=location.asset; from.value=location.from || '';
    page.onchange = () => go({...location,asset:page.value,from:'',feature:'',topic:'',part:'',layer:'',aisle:'',targetType:'',toolPage:'',toolNative:'',targetLabel:'',bounds:''});
    from.onchange = () => go({...location, from:from.value, topic:''});

    function fill() {
      inventory().then(pages=>{
        if (!host.isConnected) return;
        for (const field of [page,from]) {
          const existing = new Set(Array.from(field.options).map(o=>o.value));
          groupOptions(field, 'Native app pages', pages.filter(id=>!existing.has(id)).sort());
        }
      }).catch(()=>{
        if (host.isConnected) { const retry=button('Retry native page list',()=>{retry.remove();fill();});host.append(retry); }
      });
    }
    fill();
    if(location.asset)return toolView(location,nodes,go,show);
    show(null);
    if(!current())return;
    const panel=document.createElement('section');panel.className='transition-workshop-picker';
    const heading=document.createElement('h1');heading.textContent='Choose an app page';panel.append(heading);
    panel.append(button('Choose app page',()=>page.focus()));
    empty.replaceChildren(panel);
  }

  root.TransitionWorkshop = Object.freeze({item,active,sky,skyTopic,focused,crumbs,render,label,topic,feature,change,inventory});
})(window);
