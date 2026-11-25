/* Dollar General shelves share the catalog, layout and product controls used by Studio. */
(function (root) {
  'use strict';

  const THEME = 'dollar-general';
  const instances = new WeakMap();
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  const clone = value => JSON.parse(JSON.stringify(value));
  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function icon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');
    svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');
    svg.setAttribute('stroke-width','1.8');svg.setAttribute('stroke-linecap','round');
    const path = document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d',name==='menu'?'M4 6h16M4 12h16M4 18h16':name==='left'?'m14 6-6 6 6 6':name==='right'?'m10 6 6 6-6 6':'m21 21-5.2-5.2M17.3 10a7.3 7.3 0 1 1-14.6 0 7.3 7.3 0 0 1 14.6 0');
    svg.append(path);return svg;
  }
  function defaults(saved) {
    const layout = {rows:3,rail:5,tabHeight:32,groupBy:'original',productsPerRow:2,facings:2,products:{},...(saved || {})};
    layout.products = clone(layout.products || {});
    if (!finite(layout.autoStockHeight)) layout.autoStockHeight = root.ShelfLayoutCanvas.stockHeight(layout.rows,layout.rail,THEME);
    return layout;
  }

  function mount(host, options) {
    if (!host || !options?.store || !options?.aisle) throw Error('Choose a store and aisle for this shelf.');
    instances.get(host)?.destroy();
    const state = {destroyed:false,ticket:0,abort:null,data:null,layout:null,revision:0,saving:false,items:[],byId:new Map(),sourceIndex:new Map(),groups:new Map(),
      group:'',page:0,query:'',selection:null,geometry:null,scales:{...(options.scales || {})},previewScales:{...(options.draftScales || {})},shopping:options.shopping===true};
    const events = [];
    const listen = (target,name,fn,capture=false) => {target.addEventListener(name,fn,capture);events.push(()=>target.removeEventListener(name,fn,capture));};
    host.classList.add('dg-shelf');
    host.setAttribute('aria-label',options.aisle+' shelves');

    const view = node('section','dg-shelf-view');
    const header = node('header','dg-shelf-header');
    const form = node('form','dg-shelf-search');form.setAttribute('role','search');
    const menu = node('button','dg-shelf-menu');menu.type='button';menu.setAttribute('aria-label','Show product groups');menu.setAttribute('aria-expanded','false');menu.append(icon('menu'));
    const searchMark = node('span','dg-shelf-search-mark');searchMark.append(icon('search'));
    const search = node('input');search.type='search';search.placeholder='Search this aisle…';search.setAttribute('aria-label','Search '+options.aisle);search.autocomplete='off';
    form.append(menu,searchMark,search);
    const tabs = node('nav','dg-shelf-tabs');tabs.setAttribute('aria-label','Product groups');
    const chooser = node('div','dg-shelf-group-list');chooser.hidden=true;
    header.append(form,tabs,chooser);
    const stage = node('div','dg-shelf-stage');
    const surface = node('div','dg-shelf-surface');surface.setAttribute('aria-label','Products on shelves');
    const loading = node('div','dg-shelf-loading','Loading shelf products…');loading.setAttribute('role','status');
    const retry = node('button','dg-shelf-retry','Try again');retry.type='button';retry.hidden=true;
    stage.append(surface,loading,retry);
    const footer = node('nav','dg-shelf-paging');footer.setAttribute('aria-label','Shelf navigation');
    const previous = node('button','dg-shelf-page-button');previous.type='button';previous.setAttribute('aria-label','Previous shelf bay');previous.append(icon('left'));
    const caption = node('span','dg-shelf-page-label');caption.setAttribute('aria-live','polite');
    const next = node('button','dg-shelf-page-button');next.type='button';next.setAttribute('aria-label','Next shelf bay');next.append(icon('right'));
    footer.append(previous,caption,next);view.append(header,stage,footer);host.replaceChildren(view);
    let searchTimer,metricsFrame;

    function status(message,failed=false) {
      loading.textContent=message;loading.hidden=!message;
      retry.hidden=!failed;
      options.onStatus?.(message);
    }
    function groupOf(item) {
      return state.layout.groupBy==='type' ? state.layout.products[item.id]?.group || item.kind || item.group || options.aisle : item.group || options.aisle;
    }
    function allVisible() {
      const query=state.query.toLocaleLowerCase();
      return query ? state.items.filter(item=>[item.name,item.size,item.kind,item.group].join(' ').toLocaleLowerCase().includes(query)) : state.items;
    }
    function regroup() {
      state.groups=new Map();
      for(const item of allVisible()) {
        const group=groupOf(item);
        if(!state.groups.has(group))state.groups.set(group,[]);
        state.groups.get(group).push(item);
      }
      if(!state.groups.has(state.group))state.group=state.groups.keys().next().value || '';
    }
    function chooseGroup(group) {
      if(!state.groups.has(group))return;
      state.group=group;state.page=0;chooser.hidden=true;menu.setAttribute('aria-expanded','false');
      paint(state.layout.groupBy==='type'?null:state.groups.get(group)[0]?.id);
    }
    function drawTabs() {
      const names=[...state.groups.keys()];
      const key=JSON.stringify(names);
      if(tabs.dataset.groups!==key) {
        tabs.dataset.groups=key;tabs.replaceChildren();chooser.replaceChildren();
        for(const name of names) {
          const tab=node('button','dg-shelf-tab',name);tab.type='button';tab.onclick=()=>chooseGroup(name);tabs.append(tab);
          const choice=node('button','dg-shelf-group-option',name);choice.type='button';choice.onclick=()=>chooseGroup(name);chooser.append(choice);
        }
      }
      for(const tab of tabs.children)tab.setAttribute('aria-pressed',String(tab.textContent===state.group));
      for(const choice of chooser.children)choice.setAttribute('aria-pressed',String(choice.textContent===state.group));
      tabs.hidden=!names.length;menu.disabled=!names.length;
      if(state.group!==tabs.dataset.active) {
        tabs.dataset.active=state.group;
        const active=[...tabs.children].find(button=>button.textContent===state.group);
        // Move only this tab strip; do not scroll the Studio or the entire phone canvas.
        if(active && finite(active.offsetLeft)) tabs.scrollLeft=Math.max(0,active.offsetLeft-12);
      }
    }
    function selectionData(slot) {
      const item=slot.item,index=state.sourceIndex.get(item.id);
      return {store_id:options.store,aisle:options.aisle,product_id:item.id,name:item.name,size:item.size || '',scale:slot.scale,
        min_scale:slot.minScale,max_scale:Math.min(4,slot.maxScale),editable:true,
        ...(options.authoredId?{aisle_id:options.authoredId,page:Math.floor(index/12)+1,slot:index%12+1}:{render_no:null,slot:null})};
    }
    function notifySelection() {
      if(!state.selection || state.shopping)return;
      const slot=state.geometry?.slots.find(item=>item.id===state.selection);
      if(slot)options.onSelect?.(selectionData(slot));
    }
    function paint(anchorId) {
      if(state.destroyed || !state.data || !state.layout)return;
      if(anchorId && state.byId.has(anchorId)) {
        const item=state.byId.get(anchorId);
        state.group=groupOf(item);
      }
      regroup();
      const all=allVisible();
      const source=state.layout.groupBy==='type' ? state.groups.get(state.group) || [] : all;
      const items=source.map(item=>({...item,scale:finite(state.scales[item.id])?state.scales[item.id]:item.scale}));
      if(!items.length) {
        surface.replaceChildren();surface.hidden=true;state.geometry=null;
        status(state.query?'No matching products in this aisle.':'This aisle has no stocked products yet.');
        previous.disabled=next.disabled=true;caption.textContent=state.query?'0 matches':'';drawTabs();return;
      }
      surface.hidden=false;status('');
      const transforms=clone(state.layout.products);
      // Saved organizer transforms win over a SKU's base size. A deliberate size
      // change in this preview is the only temporary override of that placement.
      for(const [id,scale] of Object.entries(state.previewScales))if(finite(scale))transforms[id]={...transforms[id],scale};
      state.geometry=root.ShelfLayoutCanvas.render(surface,{items,fixture:state.data.fixture,plate:state.data.plate,theme:THEME,
        rows:state.layout.rows,rail:state.layout.rail,productsPerRow:state.layout.productsPerRow,facings:state.layout.facings,
        autoStockHeight:state.layout.autoStockHeight,transforms,page:state.page,anchorId,selected:state.selection?[state.selection]:[]});
      state.page=state.geometry.page;
      if(state.layout.groupBy!=='type' && !anchorId && state.geometry.slots[0])state.group=groupOf(state.geometry.slots[0].item);
      const names=[...state.groups.keys()],groupIndex=names.indexOf(state.group),grouped=state.layout.groupBy==='type';
      previous.disabled=state.page<=0 && (!grouped || groupIndex<=0);
      next.disabled=state.page+1>=state.geometry.pages && (!grouped || groupIndex>=names.length-1);
      caption.replaceChildren(node('strong',null,'Bay '+(state.page+1)+' of '+state.geometry.pages),node('small',null,state.query?all.length+' matching products':state.group));
      surface.classList.toggle('shelf-shopping',state.shopping);host.dataset.mode=state.shopping?'shop':'edit';
      drawTabs();
    }
    function turn(direction) {
      if(!state.geometry)return;
      const delta=direction==='left'||direction===-1?-1:direction==='right'||direction===1?1:0;
      if(!delta)return;
      const page=state.page+delta;
      if(page>=0 && page<state.geometry.pages)state.page=page;
      else if(state.layout.groupBy==='type') {
        const names=[...state.groups.keys()],name=names[names.indexOf(state.group)+delta];
        if(!name)return;
        state.group=name;state.page=delta<0?Number.MAX_SAFE_INTEGER:0;
      }else return;
      delete surface.dataset.detailId;paint();
    }
    function searchFor(query) {
      state.query=String(query || '').trim().slice(0,250);search.value=state.query;state.page=0;
      delete surface.dataset.detailId;paint();
    }
    function command(type,data={}) {
      if(state.destroyed)return;
      if(type==='set-mode') {
        state.shopping=data.mode==='shop';host.dataset.mode=state.shopping?'shop':'edit';
        surface.classList.toggle('shelf-shopping',state.shopping);
        if(state.shopping)state.selection=null;
        delete surface.dataset.detailId;paint();return;
      }
      if(type==='sync') {
        state.scales={...(data.scales || {})};
        if(Object.hasOwn(data,'draftScales'))state.previewScales={...(data.draftScales || {})};
        paint();return;
      }
      if(type==='set-scale' && finite(data.scale) && data.product_id) {
        state.previewScales[data.product_id]=data.scale;
        paint(data.product_id);notifySelection();return;
      }
      if(type==='move'){turn(data.direction);return;}
      if(type==='search'){searchFor(data.query);return;}
      if(type==='focus-product') {
        if(!state.byId.has(data.product_id)) {options.onStatus?.('This product is not on this aisle.');return;}
        state.query='';search.value='';state.selection=state.shopping?null:data.product_id;paint(data.product_id);notifySelection();
      }
    }
    async function load() {
      const ticket=++state.ticket;state.abort?.abort();state.abort=new AbortController();
      status('Loading shelf products…');surface.hidden=true;previous.disabled=next.disabled=true;
      const key=options.authoredId?'studio:'+options.authoredId:options.aisle;
      try {
        const [data,saved]=await Promise.all([
          root.ShelfLayoutData.load({store:options.store,aisle:options.aisle,authoredId:options.authoredId,mode:THEME,signal:state.abort.signal}),
          root.ShelfLayoutStore.load(options.store,key)
        ]);
        if(state.destroyed || ticket!==state.ticket)return;
        state.data=data;state.layout=defaults(saved.layout);state.revision=saved.revision;state.items=data.items;
        state.byId=new Map(state.items.map(item=>[item.id,item]));state.sourceIndex=new Map(state.items.map((item,index)=>[item.id,index]));
        state.page=0;paint(state.selection);
        return {products:state.items.length,aisle:options.aisle,revision:saved.revision};
      }catch(error) {
        if(state.destroyed || ticket!==state.ticket || error.name==='AbortError')return;
        status(error.message || 'Could not load these shelves.',true);throw error;
      }
    }
    listen(form,'submit',event=>{event.preventDefault();clearTimeout(searchTimer);searchFor(search.value);});
    listen(search,'input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>searchFor(search.value),140);});
    listen(menu,'click',()=>{chooser.hidden=!chooser.hidden;menu.setAttribute('aria-expanded',String(!chooser.hidden));});
    listen(previous,'click',()=>turn(-1));listen(next,'click',()=>turn(1));
    listen(retry,'click',()=>{api.ready=load();api.ready.catch(()=>{});});
    listen(surface,'click',event=>{
      if(state.shopping || event.target.closest?.('.sl-detail'))return;
      const product=event.target.closest?.('[data-product-id]');
      if(!product || !surface.contains(product))return;
      event.preventDefault();event.stopImmediatePropagation();state.selection=product.dataset.productId;
      delete surface.dataset.detailId;paint();notifySelection();
    },true);
    listen(surface,'shelf-layout-metrics',event=>{
      event.preventDefault();
      if(metricsFrame || state.destroyed)return;
      metricsFrame=requestAnimationFrame(()=>{metricsFrame=null;if(!state.destroyed){paint(state.selection);notifySelection();}});
    });
    listen(view,'keydown',event=>{if(event.key==='Escape'&&!chooser.hidden){chooser.hidden=true;menu.setAttribute('aria-expanded','false');menu.focus();}});
    const api={ready:null,command,reload(){api.ready=load();return api.ready;},async saveScale(productId,scale){
      // The Studio owner gate and SKU verification stay with the caller. Save
      // this one transform in the same revisioned document as the organizer.
      if(state.destroyed || !state.layout || !state.byId.has(productId))throw Error('Select a product on this aisle before saving its size.');
      if(!finite(scale)||scale<.1||scale>4)throw Error('Choose a valid product size.');
      if(state.saving)throw Error('A shelf change is still being saved.');
      const layout=clone(state.layout),expected=state.revision,key=options.authoredId?'studio:'+options.authoredId:options.aisle;
      layout.products[productId]={...layout.products[productId],scale};state.saving=true;
      try {
        const actual=await root.ShelfLayoutStore.save(options.store,key,layout,expected);
        if(!actual.layout || !Number.isInteger(actual.revision) || actual.revision<=expected || Number(actual.layout.products?.[productId]?.scale)!==scale)
          throw Error('The store did not confirm this product size.');
        if(!state.destroyed) {
          state.layout=defaults(actual.layout);state.revision=actual.revision;
          if(state.previewScales[productId]===scale)delete state.previewScales[productId];
          paint(productId);notifySelection();
        }
        return actual;
      }finally{state.saving=false;}
    },destroy(){
      if(state.destroyed)return;state.destroyed=true;state.ticket++;state.abort?.abort();
      clearTimeout(searchTimer);if(metricsFrame)cancelAnimationFrame(metricsFrame);events.forEach(remove=>remove());
      if(instances.get(host)===api){instances.delete(host);host.replaceChildren();host.classList.remove('dg-shelf');delete host.dataset.mode;}
    }};
    instances.set(host,api);api.ready=load();return api;
  }
  root.DollarGeneralShelf={mount};
})(window);
