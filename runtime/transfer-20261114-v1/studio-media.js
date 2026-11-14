/* Shared design assets. Existing storage policies are used without widening access. */
(function(G){
'use strict';
const kind=u=>/\.(mp4|webm|mov|m4v)(?:[?#]|$)/i.test(u)?'video':'image';
const clean=p=>String(p||'').split('/').filter(x=>x&&x!=='.'&&x!=='..').join('/');
const enc=p=>clean(p).split('/').map(encodeURIComponent).join('/');
function safeURL(u){try{const x=new URL(u,typeof location==='undefined'?'https://example.org/':location.href);return ['http:','https:'].includes(x.protocol)?x.href:'';}catch{return '';}}
function localList(assets,source,path,search=''){
 const prefix=path?clean(path)+'/':''; const out=new Map();
 for(const a of assets){if(a.source!==source||!a.path.startsWith(prefix))continue;const rest=a.path.slice(prefix.length),at=rest.indexOf('/');const name=at<0?rest:rest.slice(0,at);if(!name.toLowerCase().includes(search.toLowerCase()))continue;out.set(name,at<0?{...a,name,folder:false}:{name,folder:true,path:prefix+name});}
 return [...out.values()].sort((a,b)=>Number(b.folder)-Number(a.folder)||a.name.localeCompare(b.name));
}
const util={kind,clean,enc,safeURL,localList};
if(typeof module!=='undefined'&&module.exports)module.exports=util;
if(!G.document)return;
const E=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
function create({url,headers}){
 let manifestPromise,lastSource='studio',lastPath='';
 const manifest=()=>manifestPromise||(manifestPromise=fetch('shared-media-catalog.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Could not load shared folders');return r.json();}).catch(e=>{manifestPromise=null;throw e;}));
 const assetURL=a=>a.url||(a.source==='Studio files'?new URL(enc(a.path),location.href).href:url+'/storage/v1/object/public/'+encodeURIComponent(a.source)+'/'+enc(a.path));
 async function upload(file){
  if(!/^(image|video)\//.test(file.type))throw Error('Choose an image or video file.');
  const path='uploads/shared/'+Date.now()+'-'+crypto.randomUUID()+'-'+file.name.replace(/[^\w.-]/g,'_');
  const r=await fetch(url+'/storage/v1/object/studio/'+path,{method:'POST',headers:headers({'Content-Type':file.type}),body:file});
  if(!r.ok)throw Error('Upload failed. Your previous selection is unchanged.');
  return {url:url+'/storage/v1/object/public/studio/'+path,kind:file.type.startsWith('video/')?'video':'image',name:file.name};
 }
 function field(label,value,onChange,accept='image/*'){
  const row=E('div','pg-row sm-field'),lab=E('label',null,label),actions=E('div','sm-actions');row.append(lab,actions);
  const browse=E('button','ghost','Browse all folders');browse.type='button';browse.onclick=()=>open({accept,onSelect:onChange});
  const pick=E('input');pick.type='file';pick.accept=accept;pick.setAttribute('aria-label','Upload '+label);
  const status=E('small','sm-status',value?decodeURIComponent(String(value).split('/').pop().split('?')[0]):'Nothing selected');status.setAttribute('role','status');
  pick.onchange=async()=>{const f=pick.files[0];if(!f)return;pick.disabled=true;status.textContent='Uploading…';try{onChange(await upload(f));}catch(e){status.textContent=e.message;}finally{pick.disabled=false;}};
  const clear=E('button','ghost','Clear');clear.type='button';clear.disabled=!value;clear.onclick=()=>onChange({url:'',kind:'image',name:''});actions.append(browse,clear);row.append(pick,status);return row;
 }
 async function open({accept='image/*,video/*',multiple=false,onSelect}){
  const previous=document.activeElement,dialog=E('dialog','sm-dialog'),head=E('header'),title=E('h2',null,'Shared images & videos'),close=E('button','ghost','Close');close.type='button';head.append(title,close);
  dialog.setAttribute('aria-label','Shared images and videos');
  const tools=E('div','sm-tools'),source=E('select','pg-sel'),up=E('button','ghost','↑ Parent folder'),search=E('input','pg-sel'),type=E('select','pg-sel');
  source.setAttribute('aria-label','Image folder source');search.type='search';search.placeholder='Search this folder';search.setAttribute('aria-label','Search this folder');type.setAttribute('aria-label','Media type');
  for(const [v,l]of [['all','Images & videos'],['image','Images'],['video','Videos']]){if(v==='video'&&!accept.includes('video'))continue;const o=E('option',null,l);o.value=v;type.append(o);}if(!accept.includes('video'))type.value='image';
  tools.append(source,up,search,type);const pathLabel=E('div','sm-path'),status=E('p','sm-status','Loading folders…'),grid=E('div','sm-grid'),pager=E('div','sm-actions'),prev=E('button','ghost','Previous'),next=E('button','ghost','Next'),foot=E('footer'),chosen=E('span',null,'Choose a file to preview'),apply=E('button','primary','Use selected');apply.disabled=true;pager.append(prev,next);foot.append(chosen,apply);dialog.append(head,tools,pathLabel,status,grid,pager,foot);document.body.append(dialog);dialog.showModal();
  let path='',offset=0,revision=0,selected=null,data=null,abort=null;const selections=new Map();
  function stopMedia(){grid.querySelectorAll('video').forEach(v=>{v.pause();v.removeAttribute('src');v.load();});}
  function finish(){revision++;abort?.abort();stopMedia();dialog.close();dialog.remove();previous?.focus();}
  close.onclick=finish;dialog.addEventListener('cancel',e=>{e.preventDefault();finish();});
  apply.onclick=()=>{if(multiple?!selections.size:!selected)return;const a=multiple?[...selections.values()]:selected;finish();onSelect(a);};
  async function draw(){
   const rev=++revision;abort?.abort();abort=new AbortController();selected=null;apply.disabled=multiple?selections.size===0:true;chosen.textContent=multiple&&selections.size?selections.size+' files selected':'Choose a file to preview';stopMedia();grid.replaceChildren();status.textContent='Loading…';up.disabled=!path;prev.disabled=!offset;next.disabled=true;pathLabel.textContent=source.options[source.selectedIndex]?.text+' / '+(path||'');
   try{
    const src=data.sources.find(s=>s.id===source.value);let entries,total;
    if(src.live){const r=await fetch(url+'/storage/v1/object/list/'+encodeURIComponent(src.id),{method:'POST',headers:headers({'Content-Type':'application/json'}),signal:abort.signal,body:JSON.stringify({prefix:path,offset,limit:60,sortBy:{column:'name',order:'asc'},search:search.value})});if(!r.ok)throw Error('This folder could not be loaded. Retry or choose another folder.');const rows=await r.json();if(!Array.isArray(rows))throw Error('Unexpected folder response');entries=rows.map(a=>({source:src.id,name:a.name,path:clean(path+'/'+a.name),folder:a.id===null,kind:kind(a.name)}));total=rows.length;next.disabled=total<60;}
    else {const all=localList(data.assets,src.id,path,search.value);total=all.length;entries=all.slice(offset,offset+60);next.disabled=offset+60>=total;}
    if(rev!==revision)return;
    const visible=entries.filter(a=>a.folder||(/\.(png|jpe?g|gif|webp|avif|svg|mp4|webm|mov|m4v)$/i.test(a.path)&&(type.value==='all'||a.kind===type.value)));
    for(const a of visible){const card=E('button','sm-card');card.type='button';card.title=a.name;card.setAttribute('aria-label',(a.folder?'Open folder ':'Select ')+a.name);
     if(a.folder){card.append(E('span','sm-folder','▱'),E('span',null,a.name));card.onclick=()=>{path=a.path;offset=0;search.value='';draw();};}
     else {a.url=assetURL(a);const media=E(a.kind==='video'?'video':'img');if(a.kind==='video'){media.muted=true;media.loop=true;media.playsInline=true;media.preload='none';}else{media.loading='lazy';media.alt=a.name;}media.src=a.url;media.onerror=()=>{card.classList.add('sm-broken');};card.append(media,E('span',null,a.name),E('small',null,a.kind==='video'?'Video · click to play':'Image'));card.classList.toggle('selected',selections.has(a.url));card.onclick=()=>{if(!multiple)grid.querySelectorAll('.selected').forEach(n=>n.classList.remove('selected'));grid.querySelectorAll('video').forEach(v=>v.pause());selected=a;if(multiple){if(selections.has(a.url))selections.delete(a.url);else selections.set(a.url,a);card.classList.toggle('selected',selections.has(a.url));chosen.textContent=selections.size+' files selected';apply.disabled=selections.size===0;apply.textContent='Add '+selections.size+' selected';}else{card.classList.add('selected');chosen.textContent=a.name;apply.disabled=false;}if(a.kind==='video')media.play().catch(()=>{status.textContent='Video preview unavailable in this browser.';});};}
     grid.append(card);
    }
    lastSource=source.value;lastPath=path;status.textContent=visible.length?`${visible.length} items on this page`:'No matching media on this page.';if(!next.disabled)status.textContent+=' More items available with Next.';
   }catch(e){if(rev!==revision||e.name==='AbortError')return;status.textContent=e.message;const retry=E('button','ghost','Retry');retry.onclick=draw;grid.append(retry);}
  }
  source.onchange=()=>{path='';offset=0;search.value='';draw();};up.onclick=()=>{path=path.split('/').slice(0,-1).join('/');offset=0;search.value='';draw();};prev.onclick=()=>{offset=Math.max(0,offset-60);draw();};next.onclick=()=>{offset+=60;draw();};type.onchange=()=>{offset=0;draw();};let timer;search.oninput=()=>{clearTimeout(timer);timer=setTimeout(()=>{offset=0;draw();},250);};dialog.addEventListener('close',()=>clearTimeout(timer));
  try{data=await manifest();if(!dialog.isConnected)return;for(const s of data.sources){const o=E('option',null,s.label);o.value=s.id;source.append(o);}source.value=lastSource;path=lastPath;await draw();}catch(e){status.textContent=e.message;}
 }
 return {open,field,upload,assetURL};
}
G.SharedStudioMedia={...util,create};
})(typeof window==='undefined'?globalThis:window);
