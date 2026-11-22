/* Keep the current Studio page as the destination when opening the app workshop. */
(() => {
  'use strict';
  const params = new URLSearchParams(location.search);
  if (params.has('workshopFocus') || params.has('transition-frame')) return;
  const kit = window.StudioKit, bar = document.getElementById('bar');
  if (!bar) return;
  let picked=false;
  document.addEventListener('pointerup',e=>{if(e.target.closest?.('#stage,#tabs,#chips,#controls'))picked=true;});
  const link = document.createElement('a');
  link.id = 'app-workshop-link'; link.textContent = 'App workshop';
  function destination() {
    const id = kit.cur?.id || location.hash.slice(1) || 'home';
    const route = kit.transitionRoute(id);
    const u = new URL('workshop.html', document.baseURI);
    u.search = new URLSearchParams({group:'social',item:'app-pages',asset:route,returnStudio:id});
    const spec=kit.cur?.SPEC||[], ids=new Set(), candidates=[];
    for(const row of spec){if(!row.target||ids.has(row.target))continue;ids.add(row.target);candidates.push({type:'part',id:row.target,label:row.section||row.target});}
    const part=picked ? kit.currentTarget?.()||'' : '';
    if(part){u.searchParams.set('part',part);u.searchParams.set('targetType','part');u.searchParams.set('targetLabel',candidates.find(c=>c.id===part)?.label||part);}
    try{sessionStorage.setItem('studio-tool-target:'+JSON.stringify(['social','app-pages','','',route]),JSON.stringify({candidates,page:route,nativePage:route,part,layer:''}));}catch{}
    link.href = u.href;
  }
  destination(); link.addEventListener('focus',destination);
  link.addEventListener('pointerdown',destination);
  window.addEventListener('studio:page-shown',()=>{picked=false;destination();});
  bar.insertBefore(link,document.getElementById('screenBtns'));
  // On a phone the Studio bar lives in the collapsible controls drawer.
  const compact = link.cloneNode(true); compact.id='app-workshop-compact';
  compact.addEventListener('click',()=>{destination();compact.href=link.href;});
  document.body.append(compact);
})();
