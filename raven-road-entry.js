/* One modal controller for Raven's cabin and scene workspaces. */
(function(G){
'use strict';
const route=hash=>hash==='#raven-scenes'?'scenes':hash==='#raven-cabin'||hash==='#raven-road'?'cabin':null;
const pages={cabin:{title:'Raven · Cabin designer',url:'raven-cabin-studio.html?embed=1&v=1124scenes1',hash:'#raven-cabin'},scenes:{title:'Raven · Scene designer',url:'raven-scenes-studio.html?embed=1&v=1124scenes1',hash:'#raven-scenes'}};
const requested=route(location.hash);
let previous=requested?'#conversation':location.hash||'#conversation',opening=null,mounted=false,originalAllow=null;
function close(){const dialog=document.getElementById('extDlg');if(opening&&dialog?.open)dialog.close();}
function open(kind='cabin',fromHistory=false){
 const page=pages[kind],dialog=document.getElementById('extDlg'),frame=document.getElementById('extFrame');if(!page||!dialog||!frame)return;
 if(!opening){if(!route(location.hash))previous=location.hash||'#conversation';originalAllow=frame.getAttribute('allow');}
 document.getElementById('extTitle').textContent=page.title;frame.title=page.title;frame.setAttribute('allow','microphone; camera; autoplay');
 if(opening!==kind||!dialog.open)frame.src=new URL(page.url,location.href).href;
 opening=kind;if(G.StudioKit)G.StudioKit.previewCovered=true;if(!dialog.open)dialog.showModal();
 if(!fromHistory&&route(location.hash)!==kind)history.pushState(null,'',page.hash);
 if(!mounted){mounted=true;dialog.addEventListener('close',()=>{if(!opening)return;opening=null;if(originalAllow===null)frame.removeAttribute('allow');else frame.setAttribute('allow',originalAllow);frame.src='about:blank';if(G.StudioKit)G.StudioKit.previewCovered=false;if(route(location.hash))history.replaceState(null,'',previous);});}
}
function navigate(event){
 const kind=route(location.hash),dialog=document.getElementById('extDlg');
 if(kind){
  if(!opening&&event?.oldURL){try{const oldHash=new URL(event.oldURL).hash;if(!route(oldHash))previous=oldHash||'#conversation';}catch(_){}}
  if(opening!==kind||!dialog?.open)open(kind,true);
 }else{previous=location.hash||'#conversation';if(opening&&dialog?.open)dialog.close();}
}
G.addEventListener('popstate',navigate);G.addEventListener('hashchange',navigate);
G.RavenWindshieldWorkspace={open:()=>open('cabin'),close};G.RavenScenesWorkspace={open:()=>open('scenes'),close};
document.addEventListener('DOMContentLoaded',()=>{Promise.resolve(G.StudioKit?.ready).then(()=>{
 const kind=route(location.hash)||requested;if(!kind)return;
 const restoreHash=!route(location.hash);open(kind,true);
 // Studio's initial page selection replaces an unknown hash before ready resolves.
 if(restoreHash&&opening===kind)history.replaceState(null,'',pages[kind].hash);
});},{once:true});
})(window);
