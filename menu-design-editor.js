/* Store-scoped authoring for real native restaurant boards and menu books. */
(function(global){
  'use strict';
  const uuid=/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
  const el=(tag,text)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;return e;};
  const button=(title,fn)=>{const b=el('button',title);b.type='button';b.onclick=fn;return b;};
  const copy=v=>JSON.parse(JSON.stringify(v));
  const asRow=r=>Array.isArray(r)?r[0]:r;
  const eq=(a,b)=>JSON.stringify(a,Object.keys(a).sort())===JSON.stringify(b,Object.keys(b).sort());
  const label=(txt,input)=>{const l=el('label',txt);l.append(input);return l;};
  function mount(host,{store,send,confirmOwner,current,chooseProduct}){
    const sid=store.id, jobs=global.StudioJobs;
    const isBook=['sit_down','restaurant'].includes(store.menu_type)&&store.app_surface!=='valhalla';
    const noun=isBook?'Menu book':'Menu board';
    const db=(name,p={},auth=true)=>jobs.request('/rest/v1/rpc/'+name,{method:'POST',body:{p_store_id:sid,...p},auth});
    const notice=el('p');notice.setAttribute('role','status');
    const tabs=el('div');tabs.className='menu-tabs';tabs.setAttribute('role','tablist');
    const body=el('div');body.className='menu-body';const heading=el('h2',noun);host.className='native-menu-editor';host.append(heading,tabs,body,notice);
    const section=button(noun,()=>{tab='design';render();}),food=button('Food photo',()=>{tab='food';render();});
    for(const b of [section,food])b.setAttribute('role','tab');tabs.append(section,food);
    let tab='design',p=null,page=null,scope='page',verified=false,busy=false,authenticated=false,dishSeq=0,contextSeq=0;
    const pub=new Map(), privateRows=new Map(), work=new Map(), pictureURLs=new Map(), dishes=new Map(), previewSeq=new Map();
    const identity=(k,key)=>k+'/'+key;
    const readSettings=(k,key)=>{const id=identity(k,key);return work.get(id)??privateRows.get(id)?.settings??pub.get(id)?.settings??{};};
    const match=(row,k,key)=>row&&row.store_id===sid&&row.target_kind===k&&row.target_key===key&&(k!=='product'||row.product_id===key);
    const supports=()=>new Set(page?.supports||[]);
    const tid=()=>tab==='food'?(p?['product',p.id]:null):scope==='menu'||page?.key==='menu'?['menu','menu']:page?['page',page.key]:null;
    function signal(message){notice.textContent=message||'';}
    async function ensureOwner(){
      await confirmOwner();if(authenticated)return false;
      const rows=await db('studio_menu_design_drafts');for(const r of rows||[])if(match(r,r.target_kind,r.target_key))privateRows.set(identity(r.target_kind,r.target_key),r);
      authenticated=true;return true;
    }
    function required(k,key){if(!current()||!verified)throw Error('Open the verified Studio menu to edit its designs.');
      if(k==='product'&&(!p||p.id!==key))throw Error('The selected dish changed.');if(k==='page'&&page?.key!==key)throw Error('The visible menu section changed.');}
    async function imageURL(url){
      if(!url)return '';if(pictureURLs.has(url))return pictureURLs.get(url);
      try{const actual=await global.StudioMenuImages.preview(url);pictureURLs.set(url,actual);return actual;}catch{return url;}
    }
    async function sync(k,key,settings){
      if(!current()||!verified)return;
      const id=identity(k,key),seq=(previewSeq.get(id)||0)+1;previewSeq.set(id,seq);const display=copy(settings);
      for(const field of ['photo_url','background_url'])if(display[field])display[field]=await imageURL(display[field]);
      if(seq!==previewSeq.get(id)||!verified||!current())return;
      if(k==='product'&&key===p?.id&&display.mode==='catalog')display.catalogPreview=p.image_url||'';
      send('menu-design',{store_id:sid,target_kind:k,target_key:key,settings:display});
    }
    function changed(k,key,next){required(k,key);work.set(identity(k,key),next);sync(k,key,next).catch(e=>signal(e.message));}
    function fieldChange(k,key,name,value){
      const next={...readSettings(k,key)};if(value===''||value==null)delete next[name];else next[name]=value;
      if(k==='product'){next.mode??='catalog';if(next.mode!=='custom')delete next.photo_url;}
      changed(k,key,next);
    }
    async function operation(fn){if(busy)return;busy=true;render();try{await fn();}catch(e){signal(e.message||'The operation could not finish.');}finally{busy=false;render();}}
    function metadata(k,key){const saved=privateRows.get(identity(k,key)),live=pub.get(identity(k,key));return {saved,live,rev:saved?.revision||0};}
    function updateState(r,k,key){if(!match(r,k,key)||!Number.isInteger(r.revision))throw Error('The selected menu revision could not be verified.');privateRows.set(identity(k,key),r);return r;}
    async function save(k,key){
      required(k,key);const id=identity(k,key), local=work.get(id);if(!local){signal('No changes to save.');return;}
      const before=metadata(k,key).rev,first=await ensureOwner();required(k,key);
      if(first&&metadata(k,key).rev!==before){signal('An existing private draft was found. Review that revision and your edits before saving again.');return;}
      const r=asRow(await db('studio_menu_design_save',{p_target_kind:k,p_target_key:key,p_expected_revision:metadata(k,key).rev,p_settings:local}));
      updateState(r,k,key);if(eq(work.get(id)||{},local))work.delete(id);signal('Private draft saved · revision '+r.revision+'.');
    }
    async function publish(k,key){
      required(k,key);await ensureOwner();required(k,key);const id=identity(k,key), {saved,rev}=metadata(k,key);
      if(!saved||work.has(id))throw Error('Save the draft before publishing.');
      const r=asRow(await global.StudioMenuImages.publish({p_store_id:sid,p_target_kind:k,p_target_key:key,p_expected_revision:rev},saved.settings));updateState(r,k,key);
      const rows=await db('studio_menu_designs',{},false),found=rows.find(x=>match(x,k,key));
      if(!found||found.published_revision!==r.published_revision)throw Error('The menu has not confirmed this published revision.');
      pub.set(id,found);pictureURLs.clear();await sync(k,key,found.settings);signal('Published revision '+found.published_revision+' · shopper read verified.');
    }
    async function restore(k,key,rev){
      required(k,key);await ensureOwner();required(k,key);const id=identity(k,key);
      const r=asRow(await db('studio_menu_design_revert',{p_target_kind:k,p_target_key:key,p_expected_revision:metadata(k,key).rev,p_target_revision:rev}));
      updateState(r,k,key);work.delete(id);await sync(k,key,r.settings);signal('Revision '+rev+' restored as a private draft.');
    }
    async function unpublish(k,key){
      required(k,key);await ensureOwner();required(k,key);const id=identity(k,key);
      const r=asRow(await db('studio_menu_design_unpublish',{p_target_kind:k,p_target_key:key,p_expected_revision:metadata(k,key).rev}));
      updateState(r,k,key);const live=await db('studio_menu_designs',{},false);if(live.some(x=>match(x,k,key)))throw Error('The shopper registry still shows a published revision.');
      pub.delete(id);work.delete(id);await sync(k,key,{});signal('Original shopper appearance restored. The private draft is retained.');
    }
    function editorActions(k,key){
      const id=identity(k,key),{saved,live}=metadata(k,key);const box=el('div');box.className='menu-versions';
      const status=el('p',work.has(id)?'Unsaved changes':saved?'Private draft '+saved.revision:live?'Published revision '+live.published_revision:'Original menu appearance');
      box.append(status);
      const actions=el('div');actions.className='menu-actions';const saveBtn=button('Save private draft',()=>operation(()=>save(k,key)));
      saveBtn.disabled=busy||!work.has(id);const pubBtn=button('Publish to shoppers',()=>operation(()=>publish(k,key)));pubBtn.disabled=busy||!saved||work.has(id)||(saved.revision===live?.published_revision);actions.append(saveBtn,pubBtn);
      if(work.has(id))actions.append(button('Discard unsaved edits',()=>{work.delete(id);sync(k,key,readSettings(k,key));signal('Unsaved edits discarded.');render();}));
      if(!authenticated)actions.append(button('Load saved drafts',()=>operation(async()=>{await ensureOwner();required(k,key);await sync(k,key,readSettings(k,key));signal('Private drafts loaded.');})));
      if(saved?.history?.length){const versions=el('select');versions.setAttribute('aria-label','Menu revision');for(const h of saved.history)versions.append(new Option('Revision '+h.revision+' · '+h.action,String(h.revision)));
        const restoreBtn=button('Restore revision as draft',()=>operation(()=>restore(k,key,Number(versions.value))));actions.append(versions,restoreBtn);}
      if(live)actions.append(button('Restore original for shoppers',()=>operation(()=>unpublish(k,key))));
      box.append(actions);return box;
    }
    function addControls(k,key,target,fields){
      const values=readSettings(k,key);
      for(const [field,name,type,opts] of fields){
        const input=type==='select'?el('select'):type==='textarea'?el('textarea'):el('input');input.setAttribute('aria-label',name);
        if(type==='select'){for(const [v,h]of opts)input.append(new Option(h,v));input.value=values[field]||opts[0][0];}
        else if(type==='range'){input.type='range';[input.min,input.max,input.step]=opts;input.value=values[field]??(field==='zoom'?1:0);}
        else {if(input.tagName==='INPUT')input.type='text';input.value=values[field]||'';if(type==='color')input.placeholder='#RRGGBB';if(field==='title')input.maxLength=180;if(field==='body')input.maxLength=2000;}
        const l=label(name,input);
        let output;if(type==='range'){output=el('output',String(input.value));l.append(output);}
        const handle=()=>{let v=type==='range'?Number(input.value):input.value.trim();
          if(type==='color'&&v&&!/^#[0-9a-f]{6}$/i.test(v)){signal('Enter a six-digit hexadecimal color.');return;}
          try{fieldChange(k,key,field,v);if(output)output.textContent=String(v);const pic=body.querySelector('.menu-photo-proof img');if(pic){const a=readSettings(k,key);pic.style.objectFit=a.fit||'cover';pic.style.objectPosition=((Number(a.x||0)+1)*50)+'% '+((Number(a.y||0)+1)*50)+'%';pic.style.transform='scale('+Number(a.zoom||1)+')';}signal('Preview updated.');redrawActions(k,key);}catch(e){signal(e.message);}
        };input.addEventListener(type==='select'?'change':'input',handle);target.append(l);
      }
    }
    function redrawActions(k,key){const old=body.querySelector('.menu-versions');if(old)old.replaceWith(editorActions(k,key));}
    async function attachFile(k,key,file){if(!file)return;required(k,key);await ensureOwner();required(k,key);
      const asset=await global.StudioMenuImages.upload(sid,k==='product'?key:null,file);pictureURLs.set(asset.url,asset.preview_url);
      const next={...readSettings(k,key),[k==='product'?'photo_url':'background_url']:asset.url};if(k==='product')next.mode='custom';
      // A slow upload belongs to the original target, including after a natural page flip.
      work.set(identity(k,key),next);if(current()&&(k!=='product'||p?.id===key)&&(k!=='page'||page?.key===key))await sync(k,key,next);
      signal('Image attached to a private draft.');render();
    }
    function upload(k,key,title){const input=el('input');input.type='file';input.accept='image/png,image/jpeg,image/webp,image/avif';input.setAttribute('aria-label',title);input.onchange=()=>{const f=input.files[0];if(f)operation(()=>attachFile(k,key,f));};return label(title,input);}
    function media(target,url,placeholder,alt,settings){
      const fig=el('figure');fig.className='menu-photo-proof';target.append(fig);
      if(!url){fig.append(el('p',placeholder));return;}
      const img=el('img');img.alt=alt;img.referrerPolicy='no-referrer';img.style.objectFit=settings.fit||'cover';img.style.objectPosition=((Number(settings.x||0)+1)*50)+'% '+((Number(settings.y||0)+1)*50)+'%';img.style.transform='scale('+Number(settings.zoom||1)+')';
      img.onerror=()=>fig.replaceChildren(el('p','Photo unavailable.'));fig.append(img);
      imageURL(url).then(actual=>{if(fig.isConnected)img.src=actual;});
    }
    const transform=[['fit','Photo fit','select',[['cover','Fill the frame'],['contain','Fit the complete image']]],['zoom','Zoom','range',['0.5','4','0.01']],['x','Horizontal crop','range',['-1','1','0.01']],['y','Vertical crop','range',['-1','1','0.01']]];
    function photoTab(){
      if(!p){body.append(el('p','Tap a dish in the menu or choose one from this page.'));listDishes();return;}
      const k='product',key=p.id,settings=readSettings(k,key),mode=settings.mode||'catalog',url=mode==='custom'?settings.photo_url:p.image_url;
      body.append(el('h3',p.name),el('p',p.price!=null?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(p.price)):'Price unavailable'));
      if(page?.photo_surface==='embedded')body.append(el('p','The dish is printed into this board. These controls edit its separate detail photo. Use the board artwork control to replace the printed image.'));
      if(store.app_surface==='valhalla'&&!p.image_url)body.append(el('p','The original menu may display embedded dish artwork. An uploaded photo can supply an independent image for this menu item.'));
      media(body,mode==='hidden'?'':url,mode==='hidden'?'Photo hidden.':'No catalog photo is available.',p.name,settings);
      const choose=el('select');choose.setAttribute('aria-label','Food photo source');choose.append(new Option('Catalog photo','catalog'));if(settings.photo_url)choose.append(new Option('Uploaded photo','custom'));choose.append(new Option('Hide photo','hidden'));choose.value=mode;
      choose.onchange=()=>{fieldChange(k,key,'mode',choose.value);render();};body.append(label('Food photo source',choose),upload(k,key,'Upload food photo'));
      const cut=button('Remove background / touch up',async()=>{try{required(k,key);if(!global.MenuPhotoCutout?.edit)throw Error('The food-photo editing tool could not load.');const actual=await imageURL(url);
        await global.MenuPhotoCutout.edit({url:actual,name:p.name,onApply:async f=>{required(k,key);await attachFile(k,key,f);}});}catch(e){signal(e.message);}});cut.disabled=!url;body.append(cut);
      if(mode!=='hidden')addControls(k,key,body,transform);
      body.append(editorActions(k,key));listDishes();
    }
    function listDishes(){if(!dishes.size)return;const details=el('details');const summary=el('summary','Dishes on this page ('+dishes.size+')');details.append(summary);
      for(const r of dishes.values())details.append(button(r.name,()=>{chooseProduct(r.id);send('focus-product',{product_id:r.id});}));body.append(details);}
    function designTab(){
      if(!page){body.append(el('p','Open a menu page in the shopper preview to display its supported controls.'));return;}
      body.append(el('h3',page.label),el('p',(isBook?'Page ':'Panel ')+page.page+' of '+page.pages));
      if(page.key!=='menu'){const s=el('select');s.append(new Option(page.key.startsWith('category:')?'This section':'This panel','page'),new Option('Entire menu','menu'));s.value=scope;s.onchange=()=>{scope=s.value;render();};body.append(label('Apply design to',s));}
      const [k,key]=tid(),set=supports(),v=readSettings(k,key);
      if(set.has('background_url')){if(v.background_url)media(body,v.background_url,'','Menu artwork',v);body.append(upload(k,key,page.photo_surface==='embedded'?'Replace complete board artwork':'Upload page artwork'));
        if(v.background_url)body.append(button('Remove artwork override',()=>{fieldChange(k,key,'background_url','');render();}));}
      const fields=[['title','Menu heading','text'],['body','Introductory text','textarea'],['heading_color','Heading color','color'],['ink_color','Dish text color','color'],['background_color','Page background color','color'],...transform.map(x=>x[0]==='fit'?[x[0],'Artwork fit',...x.slice(2)]:x)].filter(x=>set.has(x[0]));
      addControls(k,key,body,fields);
      if(page.photo_surface==='embedded')body.append(el('p','Complete board artwork uses the original size and tap regions. Keep dish positions aligned when replacing it.'));
      body.append(editorActions(k,key),button('Choose a dish photo',()=>{tab='food';render();}));listDishes();
    }
    function render(){body.replaceChildren();section.setAttribute('aria-selected',String(tab==='design'));food.setAttribute('aria-selected',String(tab==='food'));
      if(!verified||!current()){body.append(el('p','Open the verified Studio menu to edit its design.'));return;}if(tab==='food')photoTab();else designTab();
      if(busy)for(const control of body.querySelectorAll('input,textarea,select,button'))control.disabled=true;
    }
    async function choose(picked){const seq=++dishSeq;if(!picked){p=null;render();return;}if(!uuid.test(picked.id))return;
      const rows=await jobs.request('/rest/v1/products?'+new URLSearchParams({id:'eq.'+picked.id,store_id:'eq.'+sid,select:'id,store_id,name,price,image_url,category',limit:1}),{auth:false});
      if(seq!==dishSeq||!verified||!rows.some(x=>x.id===picked.id&&x.store_id===sid))return;p=rows[0];tab='food';render();
      if(authenticated&&privateRows.has(identity('product',p.id)))sync('product',p.id,readSettings('product',p.id));
    }
    async function move(m){if(m.store_id!==sid||!verified||!Number.isInteger(m.page)||!Number.isInteger(m.pages)||m.page<1||m.page>m.pages||typeof m.key!=='string'||!Array.isArray(m.supports))return;
      const seq=++contextSeq;if(page&&p&&(page.page!==m.page||page.key!==m.key)&&Array.isArray(m.products)&&!m.products.includes(p.id)){dishSeq++;p=null;tab='design';}page={...m};dishes.clear();render();
      if(authenticated){for(const [kind,target] of [['menu','menu'],['page',m.key]]){if(privateRows.has(identity(kind,target)) || work.has(identity(kind,target)))sync(kind,target,readSettings(kind,target)).catch(e=>signal(e.message));}}
      const ids=[...new Set((Array.isArray(m.products)?m.products:[]).filter(x=>uuid.test(x)))];
      for(let i=0;i<ids.length;i+=40){
        const r=await jobs.request('/rest/v1/products?'+new URLSearchParams({id:'in.('+ids.slice(i,i+40).join(',')+')',store_id:'eq.'+sid,select:'id,store_id,name,price,image_url,category',order:'name'}),{auth:false});
        if(seq!==contextSeq)return;for(const row of r)if(ids.includes(row.id)&&row.store_id===sid)dishes.set(row.id,row);
      }if(seq===contextSeq)render();
    }
    const state=value=>{verified=!!value;if(!verified){dishSeq++;p=null;page=null;dishes.clear();}render();};
    db('studio_menu_designs',{},false).then(rows=>{for(const r of rows||[])if(match(r,r.target_kind,r.target_key))pub.set(identity(r.target_kind,r.target_key),r);render();}).catch(e=>signal(e.message));
    if(jobs.current?.())ensureOwner().then(()=>render()).catch(e=>signal(e.message));
    render();return {choose:p=>choose(p).catch(e=>signal(e.message)),page:m=>move(m).catch(e=>signal(e.message)),state,open:()=>{tab='design';render();host.scrollIntoView({block:'start',behavior:'smooth'});}};
  }
  global.StudioRestaurantMenus={mount};
})(window);
