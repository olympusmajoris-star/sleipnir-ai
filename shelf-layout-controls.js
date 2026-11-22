(function (G) {
  'use strict';

  const markup = `
    <section class="sl-tools" aria-label="Shelf layout controls">
      <h2>Aisle organizer</h2>
      <label>Arrange products
        <select data-field="groupBy"><option value="type">Group by product type</option><option value="original">Original shelf order</option></select>
      </label>
      <div class="sl-control-row"><span>Shelves per bay</span>
        <div class="sl-step"><button type="button" data-action="row-minus" aria-label="Remove a shelf">−</button>
          <output data-field="rows" aria-label="Shelf count"></output>
          <button type="button" data-action="row-plus" aria-label="Add a shelf">+</button></div>
      </div>
      <label class="sl-range">Shelf thickness <output data-field="rail-value"></output>
        <input data-field="rail" type="range" min="1" max="15" step="0.25"></label>
      <label class="sl-range">Quick-jump tab height <output data-field="tabs-value"></output>
        <input data-field="tabs" type="range" min="18" max="48" step="1"></label>
      <hr>
      <div class="sl-control-row"><h3>Products</h3>
        <button type="button" data-action="clear">Clear selection</button></div>
      <div class="sl-modes" role="group" aria-label="Selection tools">
        <button type="button" data-action="multi" aria-pressed="false">Select multiple</button>
        <button type="button" data-action="box" aria-pressed="false">Box select</button>
        <button type="button" data-action="select-group">Select group</button>
      </div>
      <p data-field="help" class="sl-hint"></p>
      <p data-field="selection" class="sl-selected-name" aria-live="polite"></p>
      <fieldset data-field="product-controls" disabled>
        <label>Move selection to group
          <input data-field="group-name" type="text" maxlength="80" autocomplete="off" placeholder="Choose or type a group">
        </label>
        <datalist data-field="group-options"></datalist>
        <div class="sl-modes">
          <button type="button" data-action="assign-group">Move to group</button>
          <button type="button" data-action="catalog-group">Use catalog group</button>
        </div>
        <label class="sl-size-label"><span data-field="size-label">Size</span>
          <span><input data-field="size-number" type="number" step="1" inputmode="numeric" aria-label="Size percent"> %</span></label>
        <div class="sl-adjust">
          <button type="button" data-action="smaller" aria-label="Make selection smaller">−10%</button>
          <input data-field="size" type="range" step="1" aria-label="Product size">
          <button type="button" data-action="larger" aria-label="Make selection larger">+10%</button>
        </div>
        <div class="sl-offsets">
          <label>Horizontal % <input data-field="x" type="number" step="1" min="-100" max="100"></label>
          <label>Lift % <input data-field="y" type="number" step="1" min="-100" max="100"></label>
        </div>
        <div class="sl-nudges" role="group" aria-label="Nudge selected products">
          <button type="button" data-action="left" aria-label="Move left">←</button>
          <button type="button" data-action="up" aria-label="Move up">↑</button>
          <button type="button" data-action="down" aria-label="Move down">↓</button>
          <button type="button" data-action="right" aria-label="Move right">→</button>
        </div>
        <button type="button" data-action="reset">Reset selected products</button>
      </fieldset>
      <button class="sl-save" type="button" data-action="save">Save shelf layout</button>
      <p data-field="status" role="status" class="sl-hint"></p>
    </section>`;

  const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
  const round = n => Math.round(n * 10000) / 10000;
  const numeric = (v, fallback) => typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  const sameIds = (a,b) => a.size === b.size && [...a].every(id => b.has(id));

  function mount({surface, inspector, getLayout, getGeometry, getItems, getGroups, getGroupItems, onChange, onSave, onSelection, isDirty}) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = markup;
    const panel = wrapper.firstElementChild;
    inspector.append(panel);
    const fields = Object.fromEntries(Array.from(panel.querySelectorAll('[data-field]'), e=>[e.dataset.field,e]));
    const actions = Object.fromEntries(Array.from(panel.querySelectorAll('[data-action]'), e=>[e.dataset.action,e]));
    const groupListId='sl-group-'+crypto.randomUUID();
    fields['group-options'].id=groupListId;
    fields['group-name'].setAttribute('list',groupListId);
    let groupSignature='';
    const selected = new Set(), groupBase = new Map(), knownSlots = new Map();
    let wholeGroup = false, mode = 'move', gesture = null, saving = false, dirty = false, generation = 0;
    const signalController = new AbortController();
    const listen = (node, name, handler) => node.addEventListener(name, handler, {signal:signalController.signal});
    const priorTab = surface.getAttribute('tabindex');
    if (priorTab === null) surface.tabIndex = 0;
    surface.classList.add('sl-edit-surface');

    function geometry() { return getGeometry?.() || {}; }
    function layout() { return getLayout?.() || {}; }
    function itemById(id) { return knownSlots.get(id)?.item || (getItems?.() || []).find(item => item.id === id); }
    function snapshot(id) {
      const slot = knownSlots.get(id) || {}, limits = slot.limits || {}, t = layout().products?.[id] || {};
      return {
        id, scale:numeric(slot.scale,numeric(t.scale,numeric(itemById(id)?.scale,1))),
        x:numeric(slot.x,numeric(t.x,0)), y:numeric(slot.y,numeric(t.y,0)),
        minScale:numeric(limits.minScale,numeric(slot.minScale,.1)), maxScale:numeric(limits.maxScale,numeric(slot.maxScale,6)),
        minX:numeric(limits.minX,-1),maxX:numeric(limits.maxX,1),minY:numeric(limits.minY,-1),maxY:numeric(limits.maxY,1),
        cell:slot.cell
      };
    }
    function selectedItems() { return Array.from(selected,snapshot); }
    function groupIds() {
      const members=getGroupItems?.() || [];
      return new Set(members.map(item=>typeof item==='string'?item:item?.id).filter(Boolean));
    }
    function select(ids, followGroup=false) {
      wholeGroup=followGroup;
      if(sameIds(selected,ids)){refresh();return;}
      fields['group-name'].value='';
      selected.clear(); groupBase.clear();
      for (const id of ids) { selected.add(id); groupBase.set(id,snapshot(id).scale); }
      onSelection?.([...selected]);
      refresh();
    }
    function update(next, kind) {
      dirty=true; generation++;
      fields.status.textContent='';
      onChange(next,{kind,anchorId:selected.values().next().value || null});
      refresh();
    }
    function changeProducts(items, alter, kind) {
      const l=layout(), next = {...l.products};
      let changed=false;
      for (const item of items) {
        const p=alter(item);
        if (p === null) {
          if(Object.hasOwn(next,item.id)) {delete next[item.id]; changed=true;}
        } else if(p && (p.x!==item.x || p.y!==item.y || p.scale!==item.scale)) {
          next[item.id]={...next[item.id],...p}; changed=true;
        }
      }
      if(changed) update({...l,products:next},kind);
    }
    function moveGroup(raw) {
      const name=raw.trim().slice(0,80);
      const l=layout(), edits={...l.products};
      let changed=false;
      for(const id of selected){
        const current=edits[id] || {}, {scale,x,y}=snapshot(id);
        if(name===(current.group||''))continue;
        const next={scale,x,y,...current};
        if(name)next.group=name;
        else delete next.group;
        if(!Object.hasOwn(next,'group') && next.x===0 && next.y===0 && next.scale===(itemById(id)?.scale || 1))delete edits[id];
        else edits[id]=next;
        changed=true;
      }
      if(changed || (name && l.groupBy==='original'))update({...l,groupBy:name ? 'type' : l.groupBy,products:edits},'group');
    }
    function changeFixture(key,value) {
      const l=layout();
      if(l[key]!==value)update({...l,[key]:value},'fixture');
    }
    function sizeRange(items) {
      if (items.length===1) return {value:items[0].scale,min:items[0].minScale,max:items[0].maxScale};
      let min=.01, max=Infinity;
      for (const i of items) {
        const base=groupBase.get(i.id) || i.scale;
        min=Math.max(min,i.minScale/base); max=Math.min(max,i.maxScale/base);
      }
      return {value:items[0].scale/(groupBase.get(items[0].id)||items[0].scale),min,max};
    }
    function resize(value) {
      const items=selectedItems();
      if(!items.length || !Number.isFinite(value))return;
      const r=sizeRange(items), factor=clamp(value,r.min,r.max);
      changeProducts(items,p=>({x:p.x,y:p.y,scale:round(items.length===1?factor:factor*(groupBase.get(p.id)||p.scale))}),'size');
    }
    function nudge(dx,dy) {
      const items=selectedItems();
      if(!items.length || !Number.isFinite(dx)|| !Number.isFinite(dy))return;
      dx=clamp(dx,Math.max(...items.map(p=>p.minX-p.x)),Math.min(...items.map(p=>p.maxX-p.x)));
      dy=clamp(dy,Math.max(...items.map(p=>p.minY-p.y)),Math.min(...items.map(p=>p.maxY-p.y)));
      changeProducts(items,p=>({x:round(p.x+dx),y:round(p.y+dy),scale:p.scale}),'move');
    }
    function numberField(input,value) {
      if(document.activeElement!==input || input.type==='range') input.value=String(value);
    }
    function refresh({clearSelection=false,groupChanged=false}={}) {
      if(clearSelection) {
        cancelGesture();
        wholeGroup=false;selected.clear();groupBase.clear();knownSlots.clear();fields.status.textContent='';
        fields['group-name'].value='';
        onSelection?.([]);
      }
      const g=geometry();
      for(const slot of (g.allSlots||[])) knownSlots.set(slot.id,slot);
      for(const slot of (g.slots||[])) knownSlots.set(slot.id,slot);
      if(groupChanged && !clearSelection) {
        cancelGesture();
        select(wholeGroup?groupIds():new Set(),wholeGroup);
      }
      const l=layout(), rows=l.rows??4, rail=l.rail??4, tabHeight=l.tabHeight??24;
      const groupNames=new Set(getGroups?.() || []);
      if(!getGroups)for(const item of getItems?.()||[]) {const label=item.kind || item.group;if(label)groupNames.add(label);}
      for(const edit of Object.values(l.products||{}))if(edit.group)groupNames.add(edit.group);
      const options=[...groupNames].filter(s=>typeof s==='string'&&s.trim()).sort((a,b)=>a.localeCompare(b));
      const signature=JSON.stringify(options);
      if(signature!==groupSignature) {
        fields['group-options'].replaceChildren(...options.map(value=>new Option(value,value)));
        groupSignature=signature;
      }
      actions['assign-group'].disabled=!selected.size || !fields['group-name'].value.trim();
      actions['catalog-group'].disabled=!Array.from(selected,id=>l.products?.[id]?.group).some(Boolean);
      fields.groupBy.value=l.groupBy==='original'?'original':'type';
      fields.rows.textContent=rows; actions['row-minus'].disabled=rows<=1; actions['row-plus'].disabled=rows>=8;
      fields.rail.value=rail; fields['rail-value'].textContent=rail+'%';
      fields.tabs.value=tabHeight; fields['tabs-value'].textContent=tabHeight+' px';
      actions.multi.setAttribute('aria-pressed',mode==='multi');
      actions.box.setAttribute('aria-pressed',mode==='box');
      surface.dataset.slTool=mode;
      fields.help.textContent=mode==='box'?'Drag a box around the products you want to edit.':
        mode==='multi'?'Tap products to add or remove them. Drag a selected product to move the group.':
        'Drag a product to move it, or drag across empty shelf space to select a group.';
      for(const node of surface.querySelectorAll('.sl-slot[data-product-id]')) {
        const active=selected.has(node.dataset.productId);
        node.classList.toggle('sl-picked',active);
        node.dataset.selected=String(active);
        node.classList.toggle('is-selected',active);
        node.querySelector('.sl-faces')?.setAttribute('aria-pressed',String(active));
      }
      const items=selectedItems(), p=items[0];
      fields['product-controls'].disabled=!p;
      actions.clear.disabled=!p;
      const group=groupIds();
      actions['select-group'].disabled=!group.size || (wholeGroup && sameIds(group,selected));
      fields.selection.textContent=items.length>1 ? items.length+' products selected' : p?(itemById(p.id)?.name || '1 product selected'):'';
      fields['size-label'].textContent=items.length>1?'Group size':'Product size';
      const r=p?sizeRange(items):{min:.1,max:6,value:1};
      const low=Math.ceil(100*r.min-1e-6),high=Math.max(low,Math.floor(100*r.max+1e-6)), value=Math.round(100*r.value);
      for(const f of [fields.size,fields['size-number']]){
        f.min=low;f.max=high;numberField(f,value);
      }
      fields.size.setAttribute('aria-valuetext', value+' percent');
      actions.smaller.disabled=!p || value<=low;
      actions.larger.disabled=!p || value>=high;
      for(const [k,kMin,kMax] of [['x','minX','maxX'],['y','minY','maxY']]){
        const input=fields[k], sign=k==='x'?1:-1;
        const lo=p ? p[k]+Math.max(...items.map(i=>i[kMin]-i[k])) : 0;
        const hi=p ? p[k]+Math.min(...items.map(i=>i[kMax]-i[k])) : 0;
        input.min=Math.ceil(Math.min(lo*sign,hi*sign)*100-1e-6);input.max=Math.floor(Math.max(lo*sign,hi*sign)*100+1e-6);
        numberField(input,p?Math.round(sign*p[k]*100):0);
      }
      for (const [action,key,bound] of [['left','x','minX'],['right','x','maxX'],['up','y','minY'],['down','y','maxY']])
        actions[action].disabled=!p || items.some(i=>Math.abs(i[key]-i[bound])<.0001);
      actions.save.disabled=saving || !(isDirty?isDirty():dirty);
      actions.save.textContent=saving?'Saving…':'Save shelf layout';
    }
    function productNode(target) { return target instanceof Element && target.closest('.sl-slot[data-product-id]'); }
    function isFace(target) { return target instanceof Element && target.closest('.sl-faces,.sl-label'); }
    function pickedIds(id,additive) {
      if(!id)return additive?new Set(selected):new Set();
      if(!additive)return new Set([id]);
      const ids=new Set(selected);if(ids.has(id))ids.delete(id);else ids.add(id);return ids;
    }
    function pointerDown(e) {
      if(gesture || !e.isPrimary || e.button!==0 || !geometry().slots?.length)return;
      if(e.target.closest?.('a,button,input,select')&&!productNode(e.target))return;
      const node=productNode(e.target), pId=node?.dataset.productId;
      gesture={pointer:e.pointerId,x:e.clientX,y:e.clientY,prevX:e.clientX,prevY:e.clientY,id:pId,
        additive:mode==='multi' || e.shiftKey || e.metaKey || e.ctrlKey,
        type:(mode==='box' || !isFace(e.target) || !pId)?'box':'move',started:false,selection:new Set(selected)};
      surface.setPointerCapture(e.pointerId);
      surface.focus({preventScroll:true});
      e.preventDefault();
    }
    function drawBox(ev) {
      const s=surface.getBoundingClientRect();
      const left=clamp(Math.min(gesture.x,ev.clientX),s.left,s.right),right=clamp(Math.max(gesture.x,ev.clientX),s.left,s.right);
      const top=clamp(Math.min(gesture.y,ev.clientY),s.top,s.bottom),bottom=clamp(Math.max(gesture.y,ev.clientY),s.top,s.bottom);
      if(!gesture.box) {
        gesture.box=document.createElement('div'); gesture.box.className='sl-rubber-band';
        gesture.box.setAttribute('aria-hidden','true');(surface.closest('dialog[open]') || document.body).append(gesture.box);
      }
      Object.assign(gesture.box.style,{left:left+'px',top:top+'px',width:(right-left)+'px',height:(bottom-top)+'px'});
      const next=gesture.additive?new Set(gesture.selection):new Set();
      for(const slot of surface.querySelectorAll('.sl-slot[data-product-id]')){
        const rect=slot.querySelector('.sl-faces')?.getBoundingClientRect();
        if(rect && rect.width>0 && rect.height>0 && rect.left<right && rect.right>left && rect.top<bottom && rect.bottom>top) next.add(slot.dataset.productId);
      }
      select(next);
    }
    function drag(e) {
      if(!gesture || e.pointerId!==gesture.pointer)return;
      if(!gesture.started && Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)<4)return;
      if(!gesture.started) {
        gesture.started=true;
        if(gesture.type==='move' && !selected.has(gesture.id)){
          const next=gesture.additive?new Set(selected):new Set();next.add(gesture.id);select(next);
        }
      }
      if(gesture.type==='box')drawBox(e);
      else {
        const items=selectedItems(),surfaceRect=surface.getBoundingClientRect();
        const pxX=e.clientX-gesture.prevX,pxY=e.clientY-gesture.prevY;
        if(items.length) {
          const sizes=items.map(p=>({w:Math.max(1,(p.cell?.width||1)*surfaceRect.width),h:Math.max(1,(p.cell?.height||1)*surfaceRect.height)}));
          const dx=clamp(pxX,Math.max(...items.map((p,i)=>(p.minX-p.x)*sizes[i].w)),Math.min(...items.map((p,i)=>(p.maxX-p.x)*sizes[i].w)));
          const dy=clamp(pxY,Math.max(...items.map((p,i)=>(p.minY-p.y)*sizes[i].h)),Math.min(...items.map((p,i)=>(p.maxY-p.y)*sizes[i].h)));
          let i=0;
          changeProducts(items,p=>{const {w,h}=sizes[i++];return {scale:p.scale,x:round(p.x+dx/w),y:round(p.y+dy/h)};},'move');
        }
      }
      gesture.prevX=e.clientX;gesture.prevY=e.clientY;
    }
    function cancelGesture() {
      const active=gesture;if(!active)return;
      gesture=null;active.box?.remove();if(surface.hasPointerCapture(active.pointer))surface.releasePointerCapture(active.pointer);
    }
    function pointerUp(e) {
      if(!gesture || e.pointerId!==gesture.pointer)return;
      drag(e);
      if(!gesture.started)select(pickedIds(gesture.id,gesture.additive));
      cancelGesture();
    }
    listen(surface,'pointerdown',pointerDown);
    listen(surface,'pointermove',drag);
    listen(surface,'pointerup',pointerUp);
    listen(surface,'pointercancel',cancelGesture);
    listen(surface,'lostpointercapture',cancelGesture);
    listen(surface,'click',e=>{
      // Keyboard and assistive-technology activation have no preceding pointer event.
      const node=productNode(e.target);
      if(e.detail===0 && node)select(pickedIds(node.dataset.productId,mode==='multi'||e.shiftKey||e.ctrlKey||e.metaKey));
    });
    listen(surface,'keydown',e=>{
      if(e.altKey || e.ctrlKey || e.metaKey)return;
      const nudges={ArrowLeft:[-1,0],ArrowUp:[0,-1],ArrowDown:[0,1],ArrowRight:[1,0]};
      if(e.key==='Escape') {cancelGesture();select(new Set());}
      else if(selected.size && nudges[e.key]) {
        e.preventDefault();const [x,y]=nudges[e.key],step=e.shiftKey ? .05 : .01;nudge(x*step,y*step);
      } else if(e.key==='Enter' || e.key===' ') {
        const node=productNode(e.target);
        if(node && !(node instanceof HTMLButtonElement)) { e.preventDefault(); select(pickedIds(node.dataset.productId,mode==='multi'||e.shiftKey)); }
      }
    });
    listen(panel,'click',async e=>{
      const a=e.target.closest('button[data-action]')?.dataset.action;
      if(!a)return;
      if(a==='multi'||a==='box'){mode=mode===a?'move':a;refresh();}
      else if(a==='clear')select(new Set());
      else if(a==='select-group')select(groupIds(),true);
      else if(a==='row-plus'||a==='row-minus')changeFixture('rows',clamp((layout().rows??4)+(a==='row-plus'?1:-1),1,8));
      else if(a==='larger'||a==='smaller'){
        const r=sizeRange(selectedItems());resize(r.value+(a==='larger' ? .10 : -.10));
      } else if(a==='reset'){
        const l=layout(), edits={...l.products};
        for(const id of selected){
          if(edits[id]?.group)edits[id]={x:0,y:0,scale:itemById(id)?.scale||1,group:edits[id].group};
          else delete edits[id];
        }
        if(JSON.stringify(edits)!==JSON.stringify(l.products||{}))update({...l,products:edits},'reset');
        for(const p of selectedItems())groupBase.set(p.id,p.scale);
        refresh();
      } else if(a==='assign-group'){
        if(fields['group-name'].value.trim())moveGroup(fields['group-name'].value);
      } else if(a==='catalog-group')moveGroup('');
      else if(a==='save'){
        if(saving)return;
        const ticket=generation; saving=true;refresh();
        try{
          if(await onSave()!==false){
            if(generation===ticket){dirty=false;fields.status.textContent='Shelf layout saved.';}
          }
        }catch(err){fields.status.textContent=err?.message || 'Could not save the shelf layout.';}
        finally{saving=false;refresh();}
      } else {
        const d={left:[-.02,0],right:[.02,0],up:[0,-.02],down:[0,.02]}[a];if(d)nudge(...d);
      }
    });
    listen(fields.size,'input',()=>resize(fields.size.valueAsNumber/100));
    listen(fields['size-number'],'change',()=>{resize(fields['size-number'].valueAsNumber/100); fields['size-number'].value=fields.size.value;});
    listen(fields['group-name'],'input',()=>{actions['assign-group'].disabled=!selected.size || !fields['group-name'].value.trim();});
    listen(fields['group-name'],'keydown',e=>{
      if(e.key==='Enter' && fields['group-name'].value.trim()){e.preventDefault();moveGroup(fields['group-name'].value);}
    });
    listen(fields.groupBy,'change',()=>changeFixture('groupBy',fields.groupBy.value));
    listen(fields.rail,'input',()=>changeFixture('rail',fields.rail.valueAsNumber));
    listen(fields.tabs,'input',()=>changeFixture('tabHeight',fields.tabs.valueAsNumber));
    for(const key of ['x','y'])listen(fields[key],'change',()=>{
      const p=selectedItems()[0],sign=key==='x'?1:-1,v=Number(fields[key].value);
      if(p && Number.isFinite(v)) {
        const delta=v/100*sign-p[key];nudge(key==='x'?delta:0,key==='y'?delta:0);
        fields[key].value=Math.round(snapshot(p.id)[key]*sign*100);
      }
    });
    refresh();
    return {
      refresh, select(ids){select(new Set(ids));},
      destroy(){
        signalController.abort();cancelGesture();panel.remove();surface.classList.remove('sl-edit-surface');
        for(const node of surface.querySelectorAll('.sl-picked'))node.classList.remove('sl-picked');
        delete surface.dataset.slTool;
        if(priorTab===null)surface.removeAttribute('tabindex');else surface.setAttribute('tabindex',priorTab);
      }
    };
  }
  G.ShelfLayoutControls={mount};
})(window);
