(function (global) {
  'use strict';
  const expectedFields = ['name', 'description', 'price', 'image_url', 'category', 'section', 'shelf_group', 'full_name'];
  const labels = {name:'Product name', full_name:'Full display name', description:'Description', price:'Base price ($)', image_url:'Primary product photo URL', category:'Catalog aisle'};
  const uid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
  const human = v => v == null || v === '' ? 'Empty' : String(v);
  const same = (a,b) => a === b || (a == null && b == null);
  function edits(before, values, aisles = []) {
    const patch = {};
    for (const field of Object.keys(labels)) {
      if (!Object.hasOwn(values,field) || !Object.hasOwn(before,field)) continue;
      const raw = String(values[field] ?? '');
      if (raw === String(before[field] ?? '')) continue;
      const text = raw.trim();
      let value = text || null;
      if (field === 'name' && (!text || text.length > 500)) throw Error('Enter a product name of 1–500 characters.');
      if (text.length > 10000) throw Error(labels[field]+' exceeds the catalog’s text limit.');
      if (field === 'price' && text) {
        const number = Number(text);
        if (!/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(text) || !Number.isFinite(number)) throw Error('Enter a nonnegative price with up to two decimal places.');
        value = number;
      }
      if (field === 'image_url' && text) {
        let url;
        try { url = new URL(text); } catch (_) {}
        if (!url || url.protocol!=='https:' || !url.hostname || url.username || url.password || /\s/.test(text)) throw Error('Enter a public HTTPS photo URL.');
      }
      if (field === 'category' && !aisles.includes(text)) throw Error('Select an existing aisle in this store.');
      if (!same(before[field], value)) patch[field] = value;
    }
    return patch;
  }
  function payload(storeId,before,patch,requestId) {
    if (!uid.test(storeId) || !uid.test(requestId) || !uid.test(before?.id) || before.store_id !== storeId ||
        !expectedFields.every(field => Object.hasOwn(before,field)) || !Object.keys(patch).length ||
        !Object.keys(patch).every(field => Object.hasOwn(labels,field))) throw Error('The complete product record must match the selected store.');
    return {p_store_id:storeId,p_request_id:requestId,p_items:[{id:before.id,expected:Object.fromEntries(expectedFields.map(k=>[k,before[k]])),patch}]};
  }
  const node = (tag,text) => {const el=document.createElement(tag); if(text!==undefined)el.textContent=text;return el;};
  const control = (label,fn) => {const b=node('button',label);b.type='button';b.addEventListener('click',fn);return b;};
  function button(options) {
    return control('Edit product details',()=>open(options));
  }
  async function open({storeId,productId,aisles=[],surface='',current=()=>true,onSaved=()=>{}}) {
    if (!uid.test(storeId)||!uid.test(productId)||!current()) return;
    const jobs=global.StudioJobs;
    const modal=node('dialog');modal.className='product-edit-dialog';modal.setAttribute('aria-label','Edit product details');
    const title=node('h2','Edit product details'), sub=node('p'), pane=node('div'), status=node('p','Loading the current catalog record…');
    status.setAttribute('role','status');
    const dismiss=control('Close',()=>modal.close());
    modal.append(title,sub,pane,status,dismiss);document.body.append(modal);
    let busy=false,closed=false;
    modal.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
    modal.addEventListener('close',()=>{closed=true;modal.remove();},{once:true});modal.showModal();
    function selected(){if(closed||!current())throw Error('The selected product changed. Reopen its editor.');}
    const request=()=>jobs.request('/rest/v1/products?'+new URLSearchParams({store_id:'eq.'+storeId,id:'eq.'+productId,select:['id','store_id',...expectedFields].join(','),limit:'1'}),{auth:false});
    async function read(){const r=await request();if(!Array.isArray(r)||r.length!==1||r[0].id!==productId||r[0].store_id!==storeId)throw Error('This product could not be verified in the selected store.');return r[0];}
    let before, values, seenChange;
    const showError=e=>{if(!closed)status.textContent=e.message||'The catalog operation could not be completed.';};
    function fields() {
      pane.replaceChildren();status.textContent='';dismiss.disabled=false;
      const hint=node('p',surface);if(surface)pane.append(hint);
      const inputs={};
      for(const [k,label] of Object.entries(labels)) {
        if(k==='category'&&!aisles.length)continue;
        const wrapper=node('label',label);let input;
        if(k==='category'){
          input=node('select');
          for(const name of [...new Set([before.category,...aisles].filter(Boolean))]){const opt=node('option',name);opt.value=name;input.append(opt);}
        } else {
          input=node(k==='description'?'textarea':'input');
          if(k==='price'){input.inputMode='decimal';}
          if(k==='image_url'){input.type='url';}
          if(k==='name')input.maxLength=500;
          if(k==='description')input.rows=3;
        }
        input.setAttribute('aria-label',label);input.value=values[k]??'';input.name=k;wrapper.append(input);pane.append(wrapper);inputs[k]=input;
      }
      pane.append(control('Review changes',()=>{
        try {
          selected();values=Object.fromEntries(Object.entries(inputs).map(([k,el])=>[k,el.value]));
          const patch=edits(before,values,aisles);
          if(!Object.keys(patch).length){status.textContent='No fields have changed.';return;}
          review(patch);
        }catch(e){showError(e);}
      }));
    }
    function comparison(from,patch){
      const list=node('dl');for(const [k,v] of Object.entries(patch)){
        list.append(node('dt',labels[k]),node('dd','Current: '+human(from[k])),node('dd','Proposed: '+human(v)));
      }return list;
    }
    function locked(on){busy=on;dismiss.disabled=on;for(const b of pane.querySelectorAll('button'))b.disabled=on;}
    function review(patch){
      const id=global.crypto.randomUUID(),body=payload(storeId,before,patch,id);
      pane.replaceChildren(node('h3','Review catalog changes'),comparison(before,patch));status.textContent='';
      pane.append(control('Edit draft',fields),control('Apply to app catalog',async()=>{
        if(busy)return;
        try {
          selected();locked(true);await jobs.connect();selected();
          const receipt=await jobs.request('/rest/v1/rpc/apply_studio_catalog_review',{method:'POST',body});
          if(receipt?.id!==id||Number(receipt.applied)!==1)throw Error('The catalog did not confirm this review.');
          seenChange={id,patch};const after=await read();
          if(!Object.entries(patch).every(([k,v])=>same(after[k],v)))throw Error('The catalog accepted the change, but its current values differ. Reopen the product to see its latest state.');
          await complete(after,false);
        }catch(e){showError(e);}
        finally{if(!closed)locked(false);}
      }));
    }
    async function complete(row,restored){
      if(closed)return;
      pane.replaceChildren();status.textContent=restored?'Previous catalog values restored.':'Catalog changes saved and verified.';
      // Keep our receipt available even if the underlying preview is no longer mounted.
      try{await onSaved(row,seenChange.patch,restored);}catch(_){status.textContent+=' Reopen the display to reload it.';}
      if(restored||closed)return;
      pane.append(control('Review undo',()=>{
        const original=Object.fromEntries(Object.keys(seenChange.patch).map(k=>[k,before[k]]));
        pane.replaceChildren(node('h3','Restore previous values'),comparison(row,original));
        pane.append(control('Keep saved changes',()=>complete(row,false)),control('Restore these values',async()=>{
          if(busy)return;
          try{
            locked(true);await jobs.connect();
            const receipt=await jobs.request('/rest/v1/rpc/restore_studio_catalog_review',{method:'POST',body:{p_change_id:seenChange.id}});
            if(Number(receipt?.restored)!==1)throw Error('The catalog did not confirm the restore.');
            const previous=await read();if(!Object.entries(original).every(([k,v])=>same(previous[k],v)))throw Error('The restored values could not be verified.');
            await complete(previous,true);
          }catch(e){showError(e);}finally{if(!closed)locked(false);}
        }));
      }));
    }
    try{before=await read();selected();sub.textContent=before.name;values={...before};fields();}
    catch(e){showError(e);}
  }
  const api={edits,payload,button,open};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  global.StudioProductDetails=api;
})(typeof window!=='undefined'?window:globalThis);
