(function(){
  'use strict';
  const core=window.StudioWorkspaceCore;
  const node=id=>document.getElementById(id);
  const q=node('query'), kind=node('kind'), status=node('status'), cards=node('locations'), more=node('more'), retry=node('retry');
  const params=new URLSearchParams(location.search), pageSize=36;
  q.value=params.get('q')||'';
  kind.value=Array.from(kind.options).some(o=>o.value===params.get('type'))?params.get('type'):'';
  let stores=[], selected=[], drawn=0, loaded=false, ticket=0;
  function writeFilters(){
    const u=new URL(location.href);
    for(const [key,val] of [['q',q.value.trim()],['type',kind.value]]){
      if(val)u.searchParams.set(key,val);else u.searchParams.delete(key);
    }
    history.replaceState(null,'',u);
  }
  function category(s){
    if(s.app_surface==='valhalla')return 'valhalla';
    if(core.groceryModeForStore(s))return 'grocery';
    return s.menu_type||'retail';
  }
  function searchText(v){return String(v??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
  function make(tag,cls,value){
    const e=document.createElement(tag);if(cls)e.className=cls;if(value!=null)e.textContent=value;return e;
  }
  function storeCard(s){
    const a=make('a','store');a.href=core.storeEditorForStore(s);
    const mark=make('span','mark',String(s.name||'Store').trim().slice(0,1).toUpperCase());
    mark.setAttribute('aria-hidden','true');
    try{
      const u=new URL(s.logo_url);
      if(u.protocol==='https:'){
        const image=new Image();image.alt='';image.loading='lazy';image.referrerPolicy='no-referrer';
        image.addEventListener('error',()=>image.remove(),{once:true});
        image.addEventListener('load',()=>{for(const n of Array.from(mark.childNodes))if(n!==image)n.remove();},{once:true});
        mark.prepend(image);image.src=u.href;
      }
    }catch{}
    const body=make('span'), name=make('span','name',s.name), address=make('span','address',s.address);
    body.append(name);if(s.address)body.append(address);
    const street=s.app_surface==='valhalla';
    const count=Number(street?s.valhalla_menu_count:s.product_count);
    body.append(make('span','meta', count===0?'No catalog products':count.toLocaleString()+(street?(count===1?' orderable menu item':' orderable menu items'):(count===1?' catalog item':' catalog items'))));
    const arrow=make('span','arrow','›');arrow.setAttribute('aria-hidden','true');a.append(mark,body,arrow);return a;
  }
  function append(){
    const group=document.createDocumentFragment();
    for(const s of selected.slice(drawn,drawn+pageSize))group.append(storeCard(s));
    drawn=Math.min(drawn+pageSize,selected.length);cards.append(group);
    more.hidden=drawn>=selected.length;
  }
  function repaint(){
    if(!loaded)return;
    const words=searchText(q.value).trim().split(/\s+/).filter(Boolean);
    selected=stores.filter(s=>(!kind.value||category(s)===kind.value)&&words.every(w=>s.search.includes(w)));
    cards.replaceChildren();drawn=0;append();
    status.textContent=selected.length ? selected.length.toLocaleString()+(selected.length===1?' location':' locations') :
      'No matching stores. Try another name or city.';
  }
  async function load(){
    const me=++ticket;loaded=false;retry.hidden=true;more.hidden=true;status.textContent='Loading stores…';
    try{
      const out=await core.loadAppStores();
      if(me!==ticket)return;
      stores=out.map(s=>({...s,search:searchText([s.name,s.address,s.category].filter(Boolean).join(' '))}));
      stores.sort((a,b)=>Number(b.product_count>0)-Number(a.product_count>0)||a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
      const kinds=new Set(stores.map(category));
      for(const o of kind.options){if(o.value)o.hidden=!kinds.has(o.value);}
      if(kind.value&&!kinds.has(kind.value))kind.value='';
      loaded=true;repaint();
    }catch{
      if(me!==ticket)return;cards.replaceChildren();status.textContent='The store directory is unavailable. Retry to load your stores.';retry.hidden=false;
    }
  }
  q.addEventListener('input',()=>{writeFilters();repaint();});
  kind.addEventListener('change',()=>{writeFilters();repaint();});
  node('filters').addEventListener('submit',e=>{e.preventDefault();repaint();});
  more.addEventListener('click',append);retry.addEventListener('click',load);load();
})();
