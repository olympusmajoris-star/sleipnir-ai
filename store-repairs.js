(function(){
  'use strict';
  const el=id=>document.getElementById(id), jobs=window.StudioJobs;
  const scope=el('scope'), form=el('report'), list=el('flags');
  const stores=new Map();
  let authorized=false, sequence=0, sending=false, loaded=false;
  const elem=(tag,text)=>{const e=document.createElement(tag);e.textContent=text;return e;};
  const say=v=>{el('status').textContent=v;};
  const api=(name,params)=>jobs.request('/rest/v1/'+name+'?'+new URLSearchParams(params));
  const rpc=(name,body)=>jobs.request('/rest/v1/rpc/'+name,{method:'POST',body});
  function showScope(){
    form.hidden=!authorized||!scope.value;el('inbox').hidden=!authorized;
  }
  async function records(table,fields){
    const out=[],step=200, selected=scope.value?[scope.value]:[...stores.keys()];
    if(!selected.length)return out;
    for(let offset=0;;offset+=step){
      const rows=await api(table,{select:fields,status:'eq.open',order:'created_at.asc,id.asc',limit:step,offset,
        store_id:'in.('+selected.join(',')+')'});
      out.push(...rows.filter(r=>stores.has(r.store_id)));
      if(rows.length<step)return out;
    }
  }
  async function refresh(){
    const current=++sequence;
    showScope();list.replaceChildren();el('empty').hidden=true;el('retry').hidden=true;
    if(!authorized)return;
    try{
      say('Loading repair flags…');
      const [storeRows,items]=await Promise.all([
        records('studio_store_display_flags','id,store_id,surface,note,created_at'),
        records('studio_grocery_product_flags','id,store_id,product_id,aisle,note,created_at,products(name)')]);
      if(current!==sequence)return;
      const flags=[...storeRows,...items].sort((a,b)=>b.created_at.localeCompare(a.created_at));
      for(const f of flags){
        const li=document.createElement('li'), loc=stores.get(f.store_id);
        li.append(elem('strong',f.products?.name||f.surface||f.aisle));
        li.append(elem('small',[loc.name,f.product_id?f.aisle:'',new Date(f.created_at).toLocaleDateString()].filter(Boolean).join(' · ')));
        if(f.note)li.append(elem('p',f.note));
        const done=elem('button','Mark resolved');
        done.onclick=async()=>{
          done.disabled=true;
          try{await rpc(f.product_id?'studio_resolve_grocery_product_flag':'studio_resolve_store_display_flag',{p_id:f.id});await refresh();}
          catch(e){say(e.message);done.disabled=false;}
        };
        li.append(done);list.append(li);
      }
      el('empty').hidden=flags.length>0;
      say(scope.value?stores.get(scope.value).name:flags.length+' open across your Palm Coast stores');
    }catch(e){if(current===sequence){say(e.message);el('retry').hidden=false;}}
  }
  async function connect(){
    el('connect').disabled=true;
    try{
      await jobs.connect();if(!await rpc('studio_grocery_editor_access',{}))throw Error('The Studio owner account is required to manage flags.');
      authorized=true;el('connect').hidden=true;await refresh();
    }catch(e){say(e.message);}finally{el('connect').disabled=false;}
  }
  async function open(){
    el('retry').hidden=true;
    try{
      const options=await window.StudioWorkspaceCore.loadAppStores();
      for(const row of options){stores.set(row.id,row);}
      const selected=new URLSearchParams(location.search).get('store');
      if(selected&&!stores.has(selected)){say('This location is outside the app’s store list.');return;}
      for(const s of [...stores.values()].sort((a,b)=>a.name.localeCompare(b.name))){
        const o=elem('option',s.name+(s.address?' · '+s.address:''));o.value=s.id;scope.append(o);
      }
      scope.value=selected||'';scope.disabled=false;loaded=true;
      if(jobs.current())await connect();else{say('Connect your Studio owner account to view and save repair flags.');el('connect').hidden=false;}
    }catch(e){say(e.message);el('retry').hidden=false;}
  }
  scope.onchange=()=>{
    const u=new URL(location.href);if(scope.value)u.searchParams.set('store',scope.value);else u.searchParams.delete('store');
    history.replaceState(null,'',u);el('surface').value='';el('note').value='';refresh();
  };
  form.onsubmit=async e=>{
    e.preventDefault();if(sending||!authorized||!stores.has(scope.value))return;
    const id=scope.value, surface=el('surface').value.trim(), note=el('note').value.trim();if(!surface||!note)return;
    sending=true;const submit=form.querySelector('button');submit.disabled=true;scope.disabled=true;
    try{await rpc('studio_flag_store_display',{p_store_id:id,p_surface:surface,p_note:note});el('note').value='';await refresh();}
    catch(err){say(err.message);}finally{sending=false;submit.disabled=false;scope.disabled=false;}
  };
  el('connect').onclick=connect;el('retry').onclick=()=>loaded?refresh():open();open();
})();
