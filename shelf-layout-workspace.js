/* Store-scoped organizer for the products on a grocery aisle. */
(() => {
  'use strict';
  const el = id => document.getElementById(id);
  const dialog = el('layout-workspace');
  const drafts = new Map();
  let session = null, activity = 0;
  const defaults = () => ({rows:4,rail:3,tabHeight:24,groupBy:'type',products:{}});
  const keyFor = s => [s.store,s.key].join('/');
  const groupOf = (s,p) => s.layout.groupBy === 'type'
    ? s.layout.products[p.id]?.group || p.kind || p.group || s.aisle
    : p.group || s.aisle;

  function status(text,retry=false) {
    el('layout-status').textContent = text;
    el('layout-retry').hidden = !retry;
  }
  function groupItems(s) {
    s.groups = new Map();
    for (const item of s.items) {
      const group = groupOf(s,item);
      if (!s.groups.has(group)) s.groups.set(group,[]);
      s.groups.get(group).push(item);
    }
  }
  function renderTabs(s) {
    const list = el('layout-groups');
    const largest = Math.max(1,...s.geometry.slots.map(slot=>slot.scale));
    const tabHeight = Math.max(18,s.layout.tabHeight - Math.max(0,s.layout.rows-4)*1.5 - Math.min(6,(largest-1)*3));
    el('layout-phone').style.setProperty('--tab-height',tabHeight+'px');
    const active = s.group;
    const names = [...s.groups.keys()];
    if (list.children.length !== names.length || names.some((v,i) => list.children[i]?.textContent !== v)) {
      list.replaceChildren(...names.map(name => {
        const button = document.createElement('button');
        button.type='button';
        button.textContent=name;
        button.addEventListener('click',() => {
          if(session!==s)return;
          s.group=name;
          s.page=0;
          paint(s,s.layout.groupBy==='original' ? s.groups.get(name)[0].id : null);
          s.controls?.refresh({groupChanged:true});
        });
        return button;
      }));
    }
    for (const button of list.children) {
      const on = button.textContent === active;
      button.setAttribute('aria-pressed',String(on));
      if (on && active!==s.visibleTab) button.scrollIntoView({block:'nearest',inline:'nearest'});
    }
    s.visibleTab=active;
  }
  function paint(s,anchorId) {
    if (!s.items.length || session!==s) return;
    if (anchorId && s.byId.has(anchorId)) s.group = groupOf(s,s.byId.get(anchorId));
    if (!s.groups.has(s.group)) s.group=s.groups.keys().next().value;
    const grouped = s.layout.groupBy==='type';
    const items = grouped ? s.groups.get(s.group) : s.items;
    const receipt=window.ShelfLayoutCanvas.render(el('layout-surface'),{
      items, fixture:s.data.fixture, plate:s.data.plate, rows:s.layout.rows, rail:s.layout.rail,
      tabHeight:s.layout.tabHeight, transforms:s.layout.products, page:s.page, anchorId
    });
    s.geometry=receipt;
    s.page=receipt.page;
    const first=receipt.slots[0];
    if (!grouped && first && !anchorId && s.byId.has(first.id)) s.group=groupOf(s,s.byId.get(first.id));
    renderTabs(s);
    const keys=[...s.groups.keys()], index=keys.indexOf(s.group);
    el('layout-page').textContent=(grouped ? s.group+' · ' : '')+'Bay '+(s.page+1)+' of '+receipt.pages;
    el('layout-prev').disabled=s.page<=0 && (!grouped||index<=0);
    el('layout-next').disabled=s.page+1>=receipt.pages && (!grouped||index===keys.length-1);
    s.controls?.refresh();
  }
  function turn(delta) {
    const s=session;
    if (!s?.geometry) return;
    const oldGroup=s.group, next=s.page+delta;
    if (next>=0 && next<s.geometry.pages) s.page=next;
    else if (s.layout.groupBy==='type') {
      const keys=[...s.groups.keys()],name=keys[keys.indexOf(s.group)+delta];
      if (!name)return;
      s.group=name;
      s.page=delta<0?Number.MAX_SAFE_INTEGER:0;
    } else return;
    paint(s);
    s.controls.refresh({groupChanged:oldGroup!==s.group});
  }
  function setDraft(s,layout,meta={}) {
    if (session!==s || !layout) return;
    const old=s.layout;
    s.layout=layout;
    if (old.groupBy!==layout.groupBy || meta.kind==='group' || meta.kind==='reset') groupItems(s);
    s.dirty=!s.published || JSON.stringify(s.layout)!==JSON.stringify(s.saved);
    if(s.dirty) drafts.set(keyFor(s),{revision:s.revision,layout});
    else drafts.delete(keyFor(s));
    status(s.dirty?'Unsaved layout':'');
    paint(s,meta.anchorId);
  }
  async function save(s) {
    if (session!==s || s.saving || !s.dirty) return false;
    const savingLayout=structuredClone(s.layout), expected=s.revision;
    s.saving=true;
    try {
      await s.options.authorize();
      if (session!==s) return false;
      const actual=await window.ShelfLayoutStore.save(s.store,s.key,savingLayout,expected);
      if (!actual.layout || !Number.isInteger(actual.revision) || actual.revision<=expected) throw Error('The store could not confirm this layout.');
      s.revision=actual.revision;s.saved=savingLayout;s.published=true;
      s.dirty=JSON.stringify(s.layout)!==JSON.stringify(savingLayout);
      if(s.dirty) drafts.set(keyFor(s),{revision:s.revision,layout:s.layout});
      else drafts.delete(keyFor(s));
      if(session===s)status(s.dirty?'Layout saved. Newer edits are still open.':'Layout saved.');
      return true;
    } catch(error) {
      if(session===s)status(error.message||'Could not save the layout.');
      throw error;
    } finally {s.saving=false;s.controls?.refresh();}
  }
  async function load(s) {
    el('layout-panels').hidden=true;
    status('Loading shelf products…');
    try {
      const [data,snapshot]=await Promise.all([
        window.ShelfLayoutData.load({store:s.store,aisle:s.aisle,authoredId:s.options.authoredId,signal:s.abort.signal}),
        s.options.saved || window.ShelfLayoutStore.load(s.store,s.key),
        s.options.getScaleData?.()
      ]);
      if(session!==s)return;
      const baseScales=s.options.getScales?.()||{};
      s.data=data;
      s.items=data.items.map(p=>({...p,scale:baseScales[p.id]??p.scale??1}));
      s.byId=new Map(s.items.map(p=>[p.id,p]));
      if(!s.items.length){status('This aisle has no stocked products.');return;}
      s.saved={...defaults(),...snapshot.layout};
      if (!snapshot.layout) {
        // Wide cartons need a second lane to read at phone size. Preserve previous SKU size decisions.
        for (const item of s.items) {
          if (item.kind==='Eggs' && item.aspect>=2.35 && !Object.hasOwn(baseScales,item.id))
            s.saved.products[item.id]={scale:1.8,x:0,y:0};
        }
      }
      s.published=Boolean(snapshot.layout);
      s.revision=snapshot.revision;
      const local=drafts.get(keyFor(s));
      const resume=local && local.revision===s.revision;
      s.layout=structuredClone(resume ? local.layout : s.saved);
      s.dirty=Boolean(resume) || !s.published;
      groupItems(s);
      const anchor=s.options.anchorId;
      s.group=s.options.group || '';
      if(!s.groups.has(s.group)) s.group=[...s.groups.keys()].find(k=>k.toLowerCase()===s.group.toLowerCase())||'';
      s.page=0;
      el('layout-panels').hidden=false;
      status(local&&!resume?'The store has a newer saved layout.':resume?'Unsaved layout':!s.published?'Save this layout to use it in the aisle.':'');
      paint(s,anchor || (s.layout.groupBy==='original' ? s.groups.get(s.group)?.[0]?.id : null));
      s.controls=window.ShelfLayoutControls.mount({
        surface:el('layout-surface'),inspector:el('layout-inspector'),getLayout:()=>s.layout,
        getItems:()=>s.items,getGroupItems:()=>s.groups.get(s.group)||[],getGeometry:()=>s.geometry,onChange:(value,meta)=>setDraft(s,value,meta),
        onSave:()=>save(s),isDirty:()=>s.dirty
      });
      if(anchor && s.byId.has(anchor)) s.controls.select?.([anchor]);
      s.controls.refresh();
    } catch(error) {
      if(session===s)status(error.message||'This aisle could not load.',true);
    }
  }
  function open(options) {
    if(dialog.open || !options.store||!options.aisle)return;
    activity++;
    const s=session={store:options.store,aisle:options.aisle,key:options.authoredId?'studio:'+options.authoredId:options.aisle,
      options,abort:new AbortController(),items:[],page:0,dirty:false};
    el('layout-heading').textContent=s.aisle;
    el('layout-inspector').replaceChildren();
    el('layout-groups').replaceChildren();
    dialog.showModal();
    load(s);
  }
  el('layout-surface').addEventListener('shelf-layout-metrics',event=>{
    event.preventDefault();
    if(session?.geometry)paint(session);
  });
  el('layout-prev').onclick=()=>turn(-1);
  el('layout-next').onclick=()=>turn(1);
  el('layout-close').onclick=()=>dialog.close();
  el('layout-retry').onclick=()=>{if(session)load(session);};
  dialog.addEventListener('close',()=>{
    if (dialog.open)return;
    session?.abort.abort();
    session?.controls?.destroy();
    el('layout-surface').replaceChildren();
    session=null;
  });
  window.ShelfLayoutWorkspace={open,get activity(){return activity;}};
})();
