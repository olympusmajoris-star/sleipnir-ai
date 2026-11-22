/* Edit one location's actual entrance, sign, fixture and ordered catalog SKUs. */
(()=>{
  'use strict';
  const el=id=>document.getElementById(id), jobs=window.StudioJobs, core=window.StudioWorkspaceCore;
  const cfg=window.StudioTransferConfig, params=new URLSearchParams(location.search);
  const store=(params.get('store')||'').toLowerCase(), uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
  const channel='sleipnir-aisle-editor-v1', features=['entrance','sign','fixture','stock','versions'];
  const fields=['entrance_title','entrance_url','board_title','board_body','board_color','ink_color','shelf_sign','ticket_color','ticket_ink'];
  const defaults={board_color:'#242825',ink_color:'#ffffff',ticket_color:'#f6f4e9',ticket_ink:'#202020'};
  const productFields='id,name,price,image_url,store_id', pageSize=12;
  const state={info:null,mode:'',draft:null,known:new Map(),products:new Map(),doors:new Map(),owner:false,busy:false,
    dirty:false,saved:null,undo:[],redo:[],tab:'entrance',side:'door',page:0,searchOffset:0,query:'',searchTicket:0,
    frameReady:false,frameSha:'',lastSend:0,previewTimer:null,detailTicket:0,storageError:false,
    previewMode:'select',selection:null,checkingProduct:null,selectionTicket:0,pendingSizes:new Map(),productBusy:false};
  const text=(id,v)=>el(id).textContent=v;
  const say=v=>text('status',v);
  const create=(tag,t)=>{const n=document.createElement(tag);if(t!=null)n.textContent=t;return n;};
  const button=(caption,fn)=>{const b=create('button',caption);b.type='button';b.onclick=fn;return b;};
  const option=(v,t)=>{const o=create('option',t);o.value=v;return o;};
  const rpc=(name,data,auth=true)=>jobs.request('/rest/v1/rpc/'+name,{auth,method:'POST',body:data});
  const read=(table,query)=>jobs.request('/rest/v1/'+table+'?'+new URLSearchParams(query),{auth:false});
  const copy=v=>structuredClone(v);
  const price=v=>v!=null&&Number.isFinite(Number(v))?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(v)):'Price unavailable';
  const link=(page,extras={})=>page+'?'+new URLSearchParams({store,...extras});
  function blank(source='',id=crypto.randomUUID()){
    return {aisle_id:id,store_id:store,title:source,fixture:/frozen|freezer/i.test(source)?'freezer':/dairy|eggs|deli/i.test(source)?'cooler':'shelf',
      product_ids:[],revision:0,published_revision:null,history:[],appearance:{},source_aisle:source||null};
  }
  function acceptRow(raw){
    const r=Array.isArray(raw)?raw[0]:raw;
    if(!r||r.store_id!==store||!uuid.test(r.aisle_id)||!Array.isArray(r.product_ids))throw Error('The store did not confirm this aisle.');
    return {...blank(r.source_aisle||'',r.aisle_id),...r,history:r.history||[],appearance:{...(r.appearance||{})},product_ids:[...r.product_ids]};
  }
  function tempKey(){return 'sleipnir-aisle-working-v1:'+store+':'+(state.draft?.aisle_id||'');}
  function cacheDraft(){try{if(state.dirty||!state.draft.revision)sessionStorage.setItem(tempKey(),JSON.stringify(state.draft));else sessionStorage.removeItem(tempKey());}catch{state.storageError=true;}}
  function routeDraft(){const u=new URL(location.href);u.searchParams.set('aisle',state.draft.aisle_id);if(state.draft.source_aisle)u.searchParams.set('source',state.draft.source_aisle);else u.searchParams.delete('source');history.replaceState(null,'',u);}
  function loadLocal(id){
    if(!uuid.test(id||''))return null;
    try{const raw=sessionStorage.getItem('sleipnir-aisle-working-v1:'+store+':'+id);return raw?acceptRow(JSON.parse(raw)):null;}catch{return null;}
  }
  function changed(mutator){
    if(state.busy||!state.draft)return;
    const prev=copy(state.draft);mutator(state.draft);
    if(state.draft.product_ids.length)delete state.draft.startEmpty;
    else if(prev.product_ids.length&&state.draft.source_aisle)state.draft.startEmpty=true;
    if(JSON.stringify(prev)===JSON.stringify(state.draft))return;
    if(state.selection){
      state.selection.aisle=state.draft.title||state.draft.source_aisle||'Untitled aisle';
      const where=state.draft.product_ids.indexOf(state.selection.id);
      if(where>=0){state.selection.page=Math.floor(where/pageSize)+1;state.selection.slot=where%pageSize+1;state.selection.custom=true;drawProduct();}
      else if(state.selection.custom||state.draft.product_ids.length)clearProduct();
    }
    state.undo.push(prev);if(state.undo.length>64)state.undo.shift();state.redo=[];
    state.dirty=true;routeDraft();cacheDraft();paint(false);schedule();
  }
  function historyMove(from,to){
    if(!state[from].length||state.busy)return;
    state[to].push(copy(state.draft));state.draft=state[from].pop();clearProduct();state.dirty=true;cacheDraft();paint(true);schedule();
  }
  function setSide(which){
    state.side=which;el('door').hidden=which!=='door';el('frame').hidden=which!=='shelf';
    el('panel-nav').hidden=which!=='shelf'||(state.draft?.product_ids.length||0)<=pageSize;
    el('preview-modes').hidden=which!=='shelf';
    el('door-tab').setAttribute('aria-pressed',String(which==='door'));el('shelf-tab').setAttribute('aria-pressed',String(which==='shelf'));
    if(which==='shelf'&&!el('frame').getAttribute('src')&&state.info)loadFrame().catch(e=>text('preview-status',e.message));
    drawDoor();
  }
  function tab(name){
    if(!features.includes(name))return;state.tab=name;
    for(const b of document.querySelectorAll('[data-tab]'))b.setAttribute('aria-pressed',String(b.dataset.tab===name));
    for(const p of document.querySelectorAll('[data-pane]'))p.hidden=p.dataset.pane!==name;
    if(name==='sign'||name==='entrance')setSide('door');
    if(name==='stock'||name==='fixture')setSide('shelf');
  }
  function safePhoto(url){try{const p=new URL(url);return p.protocol==='https:'&&!p.username&&!p.password?p.href:'';}catch{return '';}}
  function drawDoor(){
    if(!state.draft)return;
    const d=state.draft,a=d.appearance;
    if(window.GroceryDoorPreview){window.GroceryDoorPreview.render({container:el('door'),storeId:store,source:d.source_aisle,title:d.title,art:state.doors.get(d.source_aisle)||'',appearance:a,groups:state.boardGroups?.get(d.source_aisle)||[],selected:state.tab,onSelect:tab});if(state.side==='door')text('preview-status',state.doors.get(d.source_aisle)||a.entrance_url?'Select the artwork or a blackboard.':'Choose artwork for this entrance.');return;}
    const img=el('door-art'),art=safePhoto(a.entrance_url)||state.doors.get(d.source_aisle)||'';
    if(art&&img.getAttribute('src')!==art){img.hidden=false;img.src=art;}
    if(!art){img.removeAttribute('src');img.hidden=true;}
    text('door-title',a.entrance_title||d.title||'');
    const board=el('board');board.hidden=!(a.board_title||a.board_body);
    text('board-title',a.board_title||'');text('board-body',a.board_body||'');
    board.style.backgroundColor=a.board_color||defaults.board_color;board.style.color=a.ink_color||defaults.ink_color;
    if(state.side==='door')text('preview-status',art?'Entrance artwork and sign preview.':d.source_aisle?'This entrance uses the store’s native display. Choose artwork to replace its background.':'Choose entrance artwork or add a sign.');
  }
  function setDraft(d,{local=false}={}){
    clearProduct();
    state.draft=copy(d);state.undo=[];state.redo=[];state.dirty=local;state.page=0;state.detailTicket++;
    routeDraft();cacheDraft();drawChooser();paint(true);ensureVisibleDetails();schedule();
    const source=d.source_aisle;
    state.boardGroups??=new Map();
    if(source&&state.mode==='publix'&&state.doors.get(source)?.includes('grocery-aisle-entrance-phone')&&!state.boardGroups.has(source)&&window.GroceryDoorPreview){
      state.boardGroups.set(source,[]);window.GroceryDoorPreview.readGroups(store,source,read).then(rows=>{state.boardGroups.set(source,rows);if(state.draft.source_aisle===source)drawDoor();}).catch(()=>state.boardGroups.delete(source));
    }
  }
  function drawChooser(){
    if(!state.draft)return;const s=el('aisles');s.replaceChildren(option('new','＋ Start a new aisle'));
    const labels=new Set();for(const row of state.known.values()){s.append(option(row.aisle_id,row.title+(row.published_revision?'':' · draft')));if(row.source_aisle)labels.add(row.source_aisle);}
    const originals=[...state.doors.keys()].filter(k=>!labels.has(k)).sort();
    if(originals.length){const group=create('optgroup');group.label='Original store entrances';for(const t of originals)group.append(option('original:'+t,t));s.append(group);}
    if(!state.known.has(state.draft.aisle_id))s.append(option(state.draft.aisle_id,state.draft.title||'Untitled aisle'));
    s.value=state.draft.aisle_id;
  }
  function productLine(p){
    const row=create('div');row.className='item';
    const url=safePhoto(p.image_url);
    if(url){const im=new Image();im.alt='';im.loading='lazy';im.referrerPolicy='no-referrer';im.src=url;im.onerror=()=>im.remove();row.append(im);}
    const desc=create('span');desc.className='desc';desc.append(create('span',p.name||p.id),create('small',price(p.price)));row.append(desc);return row;
  }
  function drawSlots(){
    const d=state.draft,ids=d.product_ids,start=Math.min(state.page*pageSize,Math.max(0,Math.floor((ids.length-1)/pageSize)*pageSize));
    state.page=Math.floor(start/pageSize);
    const list=el('slots');list.replaceChildren();
    text('stock-count',ids.length?ids.length+' products · panel '+(state.page+1)+' of '+Math.ceil(ids.length/pageSize):
      d.source_aisle&&!d.startEmpty?'Using the original store arrangement.':'Add your first product to stock the shelf.');
    el('source-stock').hidden=!d.source_aisle||ids.length>0;
    el('empty-stock').hidden=!!d.startEmpty;el('keep-stock').hidden=!d.startEmpty;
    el('load-stock').hidden=!!d.startEmpty;
    text('stock-msg',d.startEmpty?'Add a product before saving this arrangement, or keep the original placement.':'Keep the existing placement or start an empty arrangement.');
    for(let j=start;j<Math.min(ids.length,start+pageSize);j++){
      const id=ids[j],p=state.products.get(id)||{id,name:'Loading product…'};
      const li=create('li'),row=productLine(p);
      const pos=create('input');pos.className='position';pos.type='number';pos.min=1;pos.max=ids.length;pos.value=j+1;pos.setAttribute('aria-label','Shelf position for '+(p.name||id));
      const reorder=()=>{const i=Number(pos.value)-1;if(!Number.isInteger(i)||i<0||i>=ids.length){pos.value=j+1;return;}changed(s=>{s.product_ids.splice(j,1);s.product_ids.splice(i,0,id);});};
      pos.onchange=reorder;const remove=button('Remove',()=>changed(s=>s.product_ids.splice(s.product_ids.indexOf(id),1)));
      row.append(pos,remove);li.append(row);list.append(li);
    }
    el('stock-pages').hidden=ids.length<=pageSize;el('stock-prev').disabled=!state.page;el('stock-next').disabled=start+pageSize>=ids.length;
    el('panel-nav').hidden=state.side!=='shelf'||ids.length<=pageSize;
    el('prev').disabled=!state.page;el('next').disabled=start+pageSize>=ids.length;
  }
  function moveStock(delta){
    const ids=state.draft?.product_ids||[],max=Math.max(0,Math.ceil(ids.length/pageSize)-1);
    const next=Math.max(0,Math.min(max,state.page+delta));
    if(next===state.page)return;
    state.page=next;send('move',{direction:delta<0?'left':'right'});drawSlots();ensureVisibleDetails();
  }
  async function ensureVisibleDetails(){
    const ticket=++state.detailTicket, ids=state.draft.product_ids.slice(state.page*pageSize,(state.page+1)*pageSize).filter(id=>!state.products.has(id));
    if(!ids.length)return;
    try{const rows=await read('products',{select:productFields,store_id:'eq.'+store,id:'in.('+ids.join(',')+')'});
      for(const p of rows)if(p.store_id===store)state.products.set(p.id,p);
      if(ticket===state.detailTicket)drawSlots();
    }catch(e){if(ticket===state.detailTicket)say(e.message);}
  }
  function paint(inputs){
    const d=state.draft;if(!d)return;
    const unfinishedPlacement=!!d.source_aisle&&!!d.startEmpty&&!d.product_ids.length;
    if(inputs){el('title').value=d.title;el('fixture').value=d.fixture;for(const f of fields)el(f).value=d.appearance[f]||defaults[f]||'';}
    el('undo').disabled=!state.undo.length||state.busy;el('redo').disabled=!state.redo.length||state.busy;
    el('save').disabled=state.busy||unfinishedPlacement||!d.title.trim()||(!state.dirty&&d.revision>0);
    el('publish').disabled=state.busy||unfinishedPlacement||!d.title.trim()||(!d.product_ids.length&&!d.source_aisle)||(!state.dirty&&d.revision>0&&d.revision===d.published_revision);
    text('state',state.dirty?(state.storageError?'Unsaved edits in this tab.':'Unsaved edits kept in this tab.'):(d.published_revision?'Published revision '+d.published_revision+(d.revision!==d.published_revision?' · draft revision '+d.revision:''):d.revision?'Draft revision '+d.revision:'New draft'));
    el('history').replaceChildren(...(d.history||[]).map(x=>option(String(x.revision),'Revision '+x.revision)));
    el('restore').disabled=state.busy||!el('history').options.length;
    el('unpublish').hidden=!d.published_revision;el('reload-draft').disabled=!d.revision;
    drawDoor();drawSlots();
  }
  function send(type,body={}){if(state.frameReady)el('frame').contentWindow.postMessage({channel,type,...body},location.origin);}
  function clearProduct(){
    state.selection=null;state.checkingProduct=null;state.selectionTicket++;el('selected-sku').hidden=true;
    el('sku-note').value='';text('sku-status','');
  }
  function mode(value){
    state.previewMode=value;send('set-mode',{mode:value});
    el('select-mode').setAttribute('aria-pressed',String(value==='select'));
    el('shop-mode').setAttribute('aria-pressed',String(value==='shop'));
    if(value==='shop')clearProduct();
  }
  function setSize(value){
    const p=state.selection;if(!p?.editable||state.productBusy||!Number.isFinite(value))return;
    const scale=Number(Math.max(p.min,Math.min(p.max,value)).toFixed(3));
    if(scale===p.saved)state.pendingSizes.delete(p.id);else state.pendingSizes.set(p.id,scale);
    send('set-scale',{product_id:p.id,scale});drawProduct();
  }
  function drawProduct(){
    const p=state.selection;if(!p)return;
    const scale=state.pendingSizes.get(p.id)??p.saved;
    el('selected-sku').hidden=false;text('sku-heading',p.name);text('sku-detail',[price(p.price),p.size].filter(Boolean).join(' · '));
    text('sku-placement',[p.page!=null?'Panel '+p.page:'',p.slot!=null?'Position '+p.slot:''].filter(Boolean).join(' · '));
    el('sku-size').hidden=!p.editable;el('sku-fixed').hidden=p.editable;
    const input=el('sku-scale');input.min=p.min;input.max=p.max;input.value=scale;input.disabled=state.productBusy;
    text('sku-percent',Math.round(scale*1000)/10+'%');
    el('sku-smaller').disabled=state.productBusy||scale<=p.min;el('sku-larger').disabled=state.productBusy||scale>=p.max;
    el('sku-save').disabled=state.productBusy||!p.revisionLoaded||!state.pendingSizes.has(p.id);
    el('sku-flag').disabled=state.productBusy||!el('sku-note').value.trim();
  }
  async function selectProduct(m){
    const d=state.draft;if(!d||state.previewMode!=='select'||!uuid.test(m.product_id||''))return;
    const draftId=d.aisle_id,id=m.product_id,isCustom=d.product_ids.length>0||!d.source_aisle||d.startEmpty;
    let page=m.page,slot=m.slot;
    if(isCustom){
      if(m.aisle_id!==draftId||!Number.isInteger(page)||page<1||!Number.isInteger(slot)||slot<1||slot>12||
          d.product_ids[(page-1)*pageSize+slot-1]!==id)return;
    }else{
      if(m.aisle!==d.source_aisle)return;
      page=Number.isInteger(m.page)?m.page:Number.isInteger(m.render_no)?m.render_no:null;
      slot=Number.isInteger(slot)?slot:null;
    }
    const key=[draftId,id,page,slot].join('/');if(state.checkingProduct===key)return;
    clearProduct();state.checkingProduct=key;const ticket=state.selectionTicket;
    text('preview-status','Checking the selected product…');
    try{
      const proof=read('products',{select:productFields,store_id:'eq.'+store,id:'eq.'+id,limit:1});
      const sourceProof=isCustom?Promise.resolve(true):read('rpc/studio_grocery_aisle_original_stock',{
        p_store_id:store,p_source_aisle:d.source_aisle,product_id:'eq.'+id,limit:1}).then(rows=>rows.some(r=>r.product_id===id));
      const [rows,listed]=await Promise.all([proof,sourceProof]);
      if(ticket!==state.selectionTicket||state.draft?.aisle_id!==draftId)return;
      const item=rows.find(r=>r.id===id&&r.store_id===store);
      if(!listed||!item)throw Error('This product is no longer listed on this shelf.');
      text('preview-status','Product selected.');
      state.products.set(id,item);
      const min=Math.ceil(Math.max(.1,Number(m.min_scale))*1000)/1000;
      const max=Math.floor(Math.min(4,Number(m.max_scale))*1000)/1000;
      const editable=m.editable===true&&Number.isFinite(min)&&Number.isFinite(max)&&max>=min;
      const p={...item,aisleId:draftId,aisle:d.title||d.source_aisle||'Untitled aisle',custom:isCustom,page,slot,size:typeof m.size==='string'?m.size:'',
        editable,min:editable?min:1,max:editable?max:1,saved:editable?Math.min(max,Math.max(min,Number(m.scale)||1)):1,revision:0,revisionLoaded:false};
      el('sku-note').value='';text('sku-status','');state.selection=p;
      if(isCustom)state.page=page-1;tab('stock');drawSlots();ensureVisibleDetails();drawProduct();
      if(matchMedia('(max-width:720px)').matches)el('sku-heading').focus();
      if(!editable)return;
      const saved=await read('studio_grocery_product_scales',{select:'store_id,product_id,scale,revision',store_id:'eq.'+store,product_id:'eq.'+id,limit:1});
      if(ticket!==state.selectionTicket)return;
      const row=saved.find(r=>r.product_id===id&&r.store_id===store);
      p.saved=Math.min(max,Math.max(min,row?Number(row.scale):1));p.revision=row?Number(row.revision):0;p.revisionLoaded=true;
      if(state.pendingSizes.has(id))send('set-scale',{product_id:id,scale:state.pendingSizes.get(id)});
      drawProduct();
    }catch(err){if(ticket===state.selectionTicket)text(state.selection?'sku-status':'preview-status',err.message);}
    finally{if(ticket===state.selectionTicket)state.checkingProduct=null;}
  }
  async function productAction(action){
    const p=state.selection;if(!p||state.productBusy)return;
    const note=el('sku-note').value.trim(),value=state.pendingSizes.get(p.id);
    if(action==='save'&&(!p.editable||!p.revisionLoaded||value==null)||action==='flag'&&!note)return;
    state.productBusy=true;drawProduct();
    try{
      if(!state.owner)await connect();
      if(state.selection!==p)return;
      const response=action==='save'?await rpc('studio_save_grocery_product_scale',{
        p_store_id:store,p_product_id:p.id,p_scale:value,p_expected_revision:p.revision}):
        await rpc('studio_flag_grocery_product',{p_store_id:store,p_product_id:p.id,p_aisle:p.aisle,p_version:state.frameSha,
          p_page_key:'studio:'+p.aisleId+(p.page!=null?'/page/'+p.page:'')+(p.slot!=null?'/slot/'+p.slot:''),p_note:note});
      const row=Array.isArray(response)?response[0]:response;
      if(!row||row.store_id!==store||row.product_id!==p.id)throw Error('The store did not confirm this product change.');
      if(action==='save'){
        if(Number(row.scale)!==value||!Number.isInteger(Number(row.revision))||Number(row.revision)<p.revision)throw Error('The store did not confirm this size.');
        p.saved=value;p.revision=Number(row.revision);state.pendingSizes.delete(p.id);
      }
      if(state.selection===p){
        if(action==='flag')el('sku-note').value='';
        text('sku-status',action==='save'?'Product size saved for this store.':'Product flagged for repair.');
      }
    }catch(e){
      if(action==='save'&&state.selection===p){
        try{
          const rows=await read('studio_grocery_product_scales',{select:'store_id,product_id,scale,revision',store_id:'eq.'+store,product_id:'eq.'+p.id,limit:1});
          const current=rows.find(r=>r.store_id===store&&r.product_id===p.id);
          if(current){p.saved=Math.min(p.max,Math.max(p.min,Number(current.scale)));p.revision=Number(current.revision);}
        }catch{}
      }
      if(state.selection===p)text('sku-status',e.message);
    }
    finally{state.productBusy=false;drawProduct();}
  }
  function schedule(){
    clearTimeout(state.previewTimer);state.previewTimer=setTimeout(()=>{
      const d=state.draft;if(!state.frameReady||!d)return;
      const revision=++state.lastSend;
      send('preview-authored-aisle',{store_id:store,aisle_id:d.aisle_id,title:d.title||'Untitled aisle',fixture:d.fixture,source_aisle:d.source_aisle,
        stock_mode:d.source_aisle&&!d.product_ids.length&&!d.startEmpty?'native':'custom',product_ids:d.product_ids,appearance:d.appearance,revision});
    },180);
  }
  async function loadFrame(){
    const frame=el('frame');if(frame.dataset.loading)return;frame.dataset.loading='1';
    try{
      const response=await fetch('aisle-preview/manifest.json',{cache:'no-cache'});
      if(!response.ok)throw Error('The Flutter preview could not be loaded.');
      const m=await response.json(),v=m.versions?.[m.defaultSourceSha256];
      if(!v||!/^([a-f0-9]{64})$/.test(m.defaultSourceSha256)||!v.capabilities?.includes('preview-authored-aisle'))throw Error('The installed preview cannot open an authored aisle.');
      state.frameSha=m.defaultSourceSha256;
      const u=new URL('aisle-preview/'+state.frameSha+'/index.html',location.href);
      u.search=new URLSearchParams({store,authoring:'1'});
      frame.onload=()=>frame.contentWindow.postMessage({channel,type:'hello'},u.origin);
      frame.src=u.href;text('preview-status','Opening the compiled aisle…');
    }finally{delete frame.dataset.loading;}
  }
  window.addEventListener('message',e=>{
    const m=e.data;if(e.source!==el('frame').contentWindow||e.origin!==location.origin||m?.channel!==channel||m.store_id!==store)return;
    if(m.type==='ready'&&m.sourceSha256===state.frameSha&&m.capabilities?.includes('preview-authored-aisle')){state.frameReady=true;mode(state.previewMode);schedule();}
    if(m.type==='authored-preview-ready'&&m.revision===state.lastSend&&state.side==='shelf'){
      if(Number.isInteger(m.page)&&m.page>0&&state.draft.product_ids.length){state.page=m.page-1;drawSlots();ensureVisibleDetails();}
      text('preview-status','Flutter preview updated.');
    }
    if(m.type==='error'&&state.side==='shelf'&&(m.revision==null||m.revision===state.lastSend))text('preview-status',m.message||'Unable to load this aisle.');
    if(m.type==='select'&&state.frameReady)selectProduct(m);
  });
  async function search(more=false){
    const token=++state.searchTicket,offset=more?state.searchOffset:0,query=el('search').value.trim();
    if(!more)el('results').replaceChildren();
    el('more').hidden=true;
    const req={select:productFields,store_id:'eq.'+store,order:'name,id',limit:24,offset};
    if(query)req.name='ilike.*'+query.replace(/[\\%_*]/g,c=>'\\'+c)+'*';
    try{
      const rows=await read('products',req);if(token!==state.searchTicket)return;
      for(const p of rows){
        if(p.store_id!==store)continue;state.products.set(p.id,p);const row=productLine(p),add=button('Add',()=>importStock(p));
        row.append(add);el('results').append(row);
      }
      if(!offset&&!rows.length)el('results').append(create('p','No matching products in this store.'));
      state.searchOffset=offset+rows.length;el('more').hidden=rows.length<24;
    }catch(e){if(token===state.searchTicket)say(e.message);}
  }
  async function originalStock(source){
    const result=[],seen=new Set();
    for(let offset=0;;offset+=500){
      const batch=await read('rpc/studio_grocery_aisle_original_stock',{p_store_id:store,p_source_aisle:source,order:'position',limit:500,offset});
      for(const row of batch){if(!uuid.test(row.product_id)||seen.has(row.product_id))throw Error('The original product order could not be verified.');seen.add(row.product_id);result.push(row.product_id);}
      if(batch.length<500)return result;
    }
  }
  async function importStock(extra){
    const d=state.draft;if(!d||state.busy)return;
    if(d.source_aisle&&!d.product_ids.length&&!d.startEmpty){
      lock(true);
      try{
        const ids=await originalStock(d.source_aisle);if(!ids.length){say('No original product positions are available. Choose “Start empty” to arrange products yourself.');return;}
        lock(false);changed(x=>{x.product_ids=ids;if(extra&&!ids.includes(extra.id))x.product_ids.push(extra.id);});
        say('Loaded '+ids.length+' original products'+(extra&&!ids.includes(extra.id)?' and added '+extra.name:'')+'.');
      }catch(e){say(e.message);}finally{lock(false);}
    }else if(extra){if(d.product_ids.includes(extra.id)){say('This product is already on the shelf.');return;}changed(x=>x.product_ids.push(extra.id));say('Added '+extra.name+'.');}
    if(extra&&d.product_ids.includes(extra.id))state.page=Math.floor(d.product_ids.indexOf(extra.id)/pageSize);
    drawSlots();ensureVisibleDetails();
  }
  function lock(busy){state.busy=busy;for(const n of [el('work'),el('owner')])n.inert=busy;if(state.draft)paint(false);}
  async function listKnown(privateRows){
    const rows=await rpc(privateRows?'studio_grocery_aisle_drafts':'studio_grocery_aisles',{p_store_id:store},privateRows);
    const map=new Map();for(const raw of rows){const row=acceptRow({...raw,revision:raw.revision??raw.published_revision});map.set(row.aisle_id,row);}
    state.known=map;drawChooser();
  }
  async function connect(){
    await jobs.connect();
    if(await rpc('studio_grocery_editor_access',{})!==true)throw Error('This store requires a Studio publisher account.');
    state.owner=true;text('owner','Owner connected');await listKnown(true);
  }
  function choose(value,source=''){
    if(value==='new'){setDraft(blank());return;}
    if(value.startsWith('original:'))source=value.slice(9);
    const local=loadLocal(value);if(local){setDraft(local,{local:true});return;}
    const existing=state.known.get(value)||[...state.known.values()].find(r=>source&&r.source_aisle===source);
    if(existing){const work=loadLocal(existing.aisle_id);setDraft(work||existing,{local:!!work});return;}
    if(source&&state.doors.has(source)&&(!uuid.test(value)||!params.has('aisle'))){setDraft(blank(source));return;}
    if(value){el('work').hidden=true;say('Connect the owner account to open this saved draft.');return;}
    if(source)throw Error('This original entrance could not be found in the selected store.');
    setDraft(blank());
  }
  async function ownerAction(mode){
    if(state.busy||!state.draft)return;
    const desiredRevision=Number(el('history').value);
    lock(true);
    try{
      const d=state.draft,localRevision=d.revision;
      await connect();
      const server=state.known.get(d.aisle_id);
      if((server?.revision||0)!==localRevision)throw Error('A newer draft was saved elsewhere. Your edits are kept in this tab. Open Versions and load the saved draft to review it.');
      const base={p_store_id:store,p_aisle_id:d.aisle_id};
      const record=async (verb,extra)=>{
        const row=acceptRow(await rpc('studio_grocery_aisle_'+verb,{...base,p_expected_revision:state.draft.revision,...extra}));
        state.known.set(row.aisle_id,row);setDraft(row);cacheDraft();return row;
      };
      if(mode==='save'||mode==='publish'){
        if(state.dirty||d.revision===0)await record('save',{p_title:d.title.trim(),p_fixture:d.fixture,p_product_ids:d.product_ids,p_source_aisle:d.source_aisle,p_appearance:d.appearance});
        if(mode==='publish'){await record('publish',{});say('Published. Open the store entrance to see this version.');}
        else say('Draft saved. You can return to this aisle and keep editing.');
      }else if(mode==='restore'){await record('revert',{p_target_revision:desiredRevision});say('Restored as a new draft.');}
      else if(mode==='unpublish'){await record('unpublish',{});say('Taken off display. Your saved aisle can still be edited.');}
    }catch(e){say(e.message);}finally{lock(false);}
  }
  async function loadDoors(){
    const assets=window.GroceryDoorAssets, doors=state.doors;
    if(state.mode==='publix'){for(const d of assets.publixDoors())doors.set(d.label,assets.mediaPath(d.art,cfg.url));}
    else{
      const rows=await read('store_entrances',{select:'label,image_path,sort',store_id:'eq.'+store,is_active:'eq.true',order:'sort,label'});
      for(const r of rows)if(r.label)doors.set(r.label,assets.mediaPath(r.image_path,cfg.url,state.mode==='target'?'target-entrances':''));
      if(state.mode==='target'||(!doors.size&&state.mode!=='published')){
        const cats=state.mode==='target'?await rpc('target_catalog_categories',{},false):await rpc('studio_product_categories',{p_store_id:store},false);
        const available=new Set(cats.filter(c=>c.product_count>0).map(c=>c.category));for(const n of doors.keys())if(!available.has(n))doors.delete(n);
        for(const label of available)if(!doors.has(label))doors.set(label,'');
      }
    }
    const gallery=el('door-gallery');for(const [label,url] of doors)if(url)gallery.append(option(label,label));
  }
  async function start(){
    if(!store){el('owner').hidden=true;const chooser=el('pick-store');chooser.hidden=false;const rows=(await core.loadAppStores()).filter(r=>core.groceryModeForStore(r));text('status','Choose a Palm Coast grocery store.');
      for(const r of rows){const p=create('p'),a=create('a',r.name);a.href='grocery-aisle-builder.html?'+new URLSearchParams({store:r.id});p.append(a);chooser.append(p);}return;}
    state.info=uuid.test(store)&&await core.appStoreById(store);state.mode=state.info&&core.groceryModeForStore(state.info);
    if(!state.mode)throw Error('This location is unavailable in the app’s grocery editor.');
    text('store-name',state.info.name);el('back').href=link('grocery-entrance.html');text('back','‹ Store entrance');
    const results=await Promise.allSettled([loadDoors(),listKnown(false)]);for(const r of results)if(r.status==='rejected')throw r.reason;
    if(jobs.current())await connect();
    el('work').hidden=false;say('Select a part of the aisle to edit.');
    choose(params.get('aisle')||'',params.get('source')||'');
  }
  el('owner').onclick=async()=>{if(!state.mode||state.busy)return;try{await connect();if(!state.draft){el('work').hidden=false;choose(params.get('aisle')||'',params.get('source')||'');}else if(!state.dirty&&state.known.has(state.draft.aisle_id))setDraft(state.known.get(state.draft.aisle_id));say('Connected to your saved aisles.');}catch(e){say(e.message);}};
  el('aisles').onchange=e=>{cacheDraft();choose(e.target.value);say('Select a part of the aisle to edit.');};
  for(const b of document.querySelectorAll('[data-tab]'))b.onclick=()=>tab(b.dataset.tab);
  for(const f of fields)el(f).oninput=e=>changed(d=>{const v=e.target.value;if(v)d.appearance[f]=v;else delete d.appearance[f];});
  el('title').oninput=e=>changed(d=>d.title=e.target.value);
  el('fixture').onchange=e=>changed(d=>d.fixture=e.target.value);
  el('door-gallery').onchange=e=>{changed(d=>{if(e.target.value)d.appearance.entrance_url=state.doors.get(e.target.value);else delete d.appearance.entrance_url;});paint(true);};
  el('clear-sign').onclick=()=>{changed(d=>{for(const f of ['board_title','board_body','board_color','ink_color'])delete d.appearance[f];});paint(true);};
  el('door-tab').onclick=()=>tab('entrance');el('shelf-tab').onclick=()=>tab('fixture');
  el('door-art').onerror=()=>{el('door-art').hidden=true;text('preview-status','This entrance image could not be loaded.');};
  el('door').onclick=e=>{if(!window.GroceryDoorPreview)tab(e.target.closest('#board')?'sign':'entrance');};
  el('prev').onclick=()=>moveStock(-1);el('next').onclick=()=>moveStock(1);
  el('select-mode').onclick=()=>mode('select');el('shop-mode').onclick=()=>mode('shop');
  el('sku-scale').oninput=e=>setSize(Number(e.target.value));
  for(const [id,delta] of [['sku-smaller',-.05],['sku-larger',.05]])el(id).onclick=()=>setSize(Number(el('sku-scale').value)+delta);
  el('sku-reset').onclick=()=>setSize(1);el('sku-note').oninput=drawProduct;
  el('sku-save').onclick=()=>productAction('save');el('sku-flag').onclick=()=>productAction('flag');
  el('search-form').onsubmit=e=>{e.preventDefault();search();};el('more').onclick=()=>search(true);
  el('load-stock').onclick=()=>importStock(null);
  el('empty-stock').onclick=()=>{clearProduct();changed(d=>{d.startEmpty=true;});};
  el('keep-stock').onclick=()=>{clearProduct();changed(d=>{delete d.startEmpty;});};
  for(const [id,delta] of [['stock-prev',-1],['stock-next',1]])el(id).onclick=()=>moveStock(delta);
  el('undo').onclick=()=>{historyMove('undo','redo');ensureVisibleDetails();};el('redo').onclick=()=>{historyMove('redo','undo');ensureVisibleDetails();};
  for(const action of ['save','publish','restore','unpublish'])el(action).onclick=()=>ownerAction(action);
  el('reload-draft').onclick=async()=>{try{await connect();const row=state.known.get(state.draft.aisle_id);if(!row)throw Error('This aisle has no saved version yet.');const before=copy(state.draft);setDraft(row);state.undo.push(before);cacheDraft();paint(true);say('Saved version loaded. Undo brings back your previous edits.');}catch(e){say(e.message);}};
  el('photo-file').onchange=async e=>{const file=e.target.files[0];if(!file||state.busy)return;const d=state.draft;lock(true);try{
    if(!/\.(?:png|jpe?g|webp|avif)$/i.test(file.name)||!file.type.startsWith('image/'))throw Error('Choose a PNG, JPG, WebP or AVIF image.');
    await connect();const library=window.SharedStudioMedia.create({url:cfg.url,headers:extra=>({apikey:cfg.key,Authorization:'Bearer '+jobs.current().access_token,...extra})});
    const image=await library.upload(file);if(state.draft.aisle_id!==d.aisle_id)return;
    lock(false);changed(row=>row.appearance.entrance_url=image.url);paint(true);say('Image uploaded and placed on this draft.');
  }catch(err){say(err.message);}finally{lock(false);e.target.value='';}};
  start().catch(e=>say(e.message));
})();
