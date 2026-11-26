(function(){
  'use strict';
  const core=window.StudioWorkspaceCore;
  const node=id=>document.getElementById(id);
  const q=node('query'), kind=node('kind'), status=node('status'), cards=node('locations'), more=node('more'), retry=node('retry');
  const params=new URLSearchParams(location.search), pageSize=36;
  // The form is available before deferred scripts load. Preserve input the user has already entered.
  if (!q.value && params.has('q')) q.value=params.get('q');
  const requestedType=params.get('type');
  if (!kind.value && requestedType && Array.from(kind.options).some(o=>o.value===requestedType)) kind.value=requestedType;
  let stores=[], selected=[], drawn=0, loaded=false, ticket=0;
  let complete=false, nameTimer=0, searchRevision=0;
  function searchable(s){return {...s,search:searchText([s.name,s.address,s.category].filter(Boolean).join(' '))};}
  function searchWhileLoading(){
    clearTimeout(nameTimer);
    const query=q.value.trim(),rev=++searchRevision;
    if(complete || query.length<2 || !window.PalmCoastDesignLocations?.findDiningRooms)return;
    nameTimer=setTimeout(async()=>{
      try{
        const hits=await window.PalmCoastDesignLocations.findDiningRooms(query);
        if(complete || rev!==searchRevision || q.value.trim()!==query)return;
        const branches=window.PalmCoastDesignLocations?.withDiningRooms(hits)||hits;
        const matches=branches.filter(s=>searchText(s.name).includes(searchText(query)));
        if(matches.length){stores=matches.map(searchable);loaded=true;repaint();}
      }catch{/* The main directory request retains retry and error handling. */}
    },180);
  }
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
  const menus=new Set(['fast_food','drive_thru','fast_casual','sit_down','restaurant','valhalla']);
  function searchText(v){return String(v??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’‘]/g,"'");}
  function make(tag,cls,value){
    const e=document.createElement(tag);if(cls)e.className=cls;if(value!=null)e.textContent=value;return e;
  }
  function storeCard(s){
    const a=make('a','store');
    const diningRoom=s.designRoomUrl||window.DiningRoomNavigation?.urlFor(s);
    a.href=diningRoom||core.storeEditorForStore(s);
    if(diningRoom)a.target='_top';
    else if(kind.value==='menus'){const href=new URL(a.href);href.searchParams.set('tab','menu');a.href=href.href;}
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
    body.append(make('span','meta', s.designRoomUrl?'Dining room design':count===0?'No catalog products':count.toLocaleString()+(street?(count===1?' orderable menu item':' orderable menu items'):(count===1?' catalog item':' catalog items'))));
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
    selected=stores.filter(s=>(!kind.value||(kind.value==='menus'?menus.has(category(s)):category(s)===kind.value))&&words.every(w=>s.search.includes(w)));
    cards.replaceChildren();drawn=0;append();
    if(!complete){
      status.textContent=selected.length?selected.length+(selected.length===1?' matching location':' matching locations')+' · loading all stores…':'Loading stores…';
      return;
    }
    status.textContent=selected.length ? selected.length.toLocaleString()+(selected.length===1?' location':' locations') :
      'No matching stores. Try another name or city.';
  }
  async function load(){
    const me=++ticket;loaded=false;complete=false;searchWhileLoading();retry.hidden=true;more.hidden=true;status.textContent='Loading stores…';
    try{
      const out=await core.loadAppStores();
      if(me!==ticket)return;
      stores=(window.PalmCoastDesignLocations?.withDiningRooms(out)||out).map(searchable);
      const hasCatalogOrDesign=s=>s.product_count>0||Boolean(s.designRoomUrl);
      stores.sort((a,b)=>Number(hasCatalogOrDesign(b))-Number(hasCatalogOrDesign(a))||a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
      const kinds=new Set(stores.map(category));if([...kinds].some(k=>menus.has(k)))kinds.add('menus');
      for(const o of kind.options){if(o.value)o.hidden=!kinds.has(o.value);}
      if(kind.value&&!kinds.has(kind.value))kind.value='';
      complete=true;loaded=true;repaint();
    }catch{
      if(me!==ticket)return;if(!loaded)cards.replaceChildren();status.textContent='The full directory is unavailable. Retry to load all stores.';retry.hidden=false;
    }
  }
  q.addEventListener('input',()=>{writeFilters();repaint();searchWhileLoading();});
  kind.addEventListener('change',()=>{writeFilters();repaint();});
  node('filters').addEventListener('submit',e=>{e.preventDefault();repaint();});
  more.addEventListener('click',append);retry.addEventListener('click',load);load();
})();
