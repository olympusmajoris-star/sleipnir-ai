/* One navigation shell around the existing editors. Controls are moved, never copied. */
(function(G){
'use strict';
const $=s=>document.querySelector(s),el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
const pages=[['raven','Raven sky'],['home','Home & posts'],['convo','Messages · clouds & earth'],['share','Share'],['heimdall','Heimdall'],['track','Track'],['swap','Swap & sell'],['ads','Local ads'],['shoppost','Shop the post'],['deals','Flash deals']];
const memory=(()=>{try{return JSON.parse(localStorage.getItem('asgard-editor-navigation-v1'))||{};}catch{return {};}})();
const saveNav=()=>{try{localStorage.setItem('asgard-editor-navigation-v1',JSON.stringify(memory));}catch{}};
let hooks={},currentPage='raven',activeKey='',currentHost=null,items=[],buttons=[],context=null;
function button(label,fn,cls='btn'){const b=el('button',cls,label);b.type='button';b.onclick=fn;return b;}
function mount(config){
 hooks=config;currentPage=config.page||'raven';document.body.classList.add('studio-shell');
 const top=$('.top'),main=$('main'),right=$('.right'),left=$('.left');
 const areas=el('nav','app-tabs');areas.setAttribute('aria-label','Main app areas');
 for(const name of ['Sleipnir','Asgard','Valhalla']){
  const b=button(name,async()=>{
   if(name==='Asgard'||b.disabled)return;
   b.disabled=true;
   try{
    await hooks.beforePage?.();
    location.href='workshop.html?area='+encodeURIComponent(name);
   }catch(error){b.disabled=false;b.title='Could not save your edits. Try again.';console.error('Area switch stopped because saving failed',error);}
  },'app-tab');
  b.setAttribute('role','tab');b.setAttribute('aria-selected',String(name==='Asgard'));areas.append(b);
 }
 top.after(areas);
 const feature=el('nav','feature-tabs');feature.setAttribute('aria-label','Page features');feature.id='studioFeatures';
 if(config.kind==='pages'){const old=$('#secNav');old.classList.remove('left');old.classList.add('feature-source');feature.append(old);const replacement=el('nav','left');main.prepend(replacement);}
 else {left.querySelectorAll('button.sec').forEach(b=>feature.append(b));left.querySelector('.cap')?.remove();}
 right.prepend(feature);
 const side=$('main>.left'),tree=el('div','page-tree');tree.setAttribute('aria-label','Asgard pages');tree.append(el('div','cap','ASGARD · PAGES'));
 for(const [id,title]of pages){const b=button(title,async()=>{if(id===currentPage)return;await hooks.beforePage?.();if(hooks.openPage)hooks.openPage(id);else location.href=id==='raven'?'index.html':'pages.html?page='+id;},'page-link');b.dataset.page=id;tree.append(b);}
 side.prepend(tree);
 const toolbar=el('div','editor-toolbar');toolbar.append(button('← Back',()=>select(null),'btn editor-back'));
 const crumb=el('span','editor-crumb','Choose an option');crumb.id='editorCrumb';toolbar.append(crumb);
 toolbar.append(button('Undo',()=>hooks.undo?.()),button('Preview',()=>hooks.preview?.()),button('Save',async()=>{const b=toolbar.querySelector('[data-editor-save]');b.disabled=true;b.textContent='Saving…';try{await hooks.save?.();b.textContent='Saved';}catch{b.textContent='Retry save';}finally{b.disabled=false;}}));toolbar.lastChild.dataset.editorSave='true';
 feature.after(toolbar);
 const menu=el('nav','option-menu');menu.id='studioOptions';menu.setAttribute('aria-label','Feature options');toolbar.after(menu);
 document.addEventListener('input',()=>{const b=toolbar.querySelector('[data-editor-save]');if(b&&!b.disabled)b.textContent='Save';});
 setPage(currentPage);
}
function setPage(page){currentPage=page;document.querySelectorAll('[data-page]').forEach(b=>{b.classList.toggle('on',b.dataset.page===page);if(b.dataset.page===page)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});}
function category(path,label,group){
 const p=path.toLowerCase(),l=label.toLowerCase();
 if(/callout|tab(s)?\.|liveviews/.test(p))return 'Names & tags';
 if(/speed|spin|direction|diskdir|seconds|orbitTime|drift|wobble|shellmotion/i.test(path)||/speed|direction/.test(l))return 'Speeds & motion';
 if(/renderScale|autoQuality/.test(path))return 'Quality';
 if(/growth|together\.variety/.test(p))return 'Ring growth with views';
 if(/rot[xyz]|tilt|axis|view3d|orientation|randomaxis|camdist|streamerid/.test(p)||/angle|lean|rotate|turning/.test(l))return 'Angles & axes';
 if(/lens|reach|edgewidth|holes\.rule\.(edge|taper|funnel|width|smear)/.test(p))return 'Light bending';
 if(/jet/.test(p))return 'Jets';
 if(/face|horizon|holes\.refl/.test(p))return 'Sphere & face';
 if(/pair|capture|sling|interact|mutual|orbit/.test(p))return 'Interactions';
 if(/bandtop|bandbottom|mingap|warpapart|behavior\.count|\.(x|y|panx|pany)$/.test(p))return 'Position & spacing';
 if((/size|radius|friendSize|scale|variedfollowers/i.test(path)||/size|zoom/.test(l))&&!/ring|dustsize/.test(p)&&!/ring/.test(l))return 'Size';
 if(/ring|diskin|diskout|diskthick|thickness|opacity|density|\.disk$/.test(p)&&!/color|glow|bright|corona/.test(p))return 'Rings & density';
 if(/color|tint|glow|bright|exposure|corona|flare|temp/.test(p)||/color|glow|brightness/.test(l))return 'Colors & light';
 if(/texture|streak|clumps|arms|swirl|doppler|turb/.test(p))return 'Gas detail';
 if(/holes\.feed|envfeed|envradius|envcolor/.test(p))return 'Feeding';
 if(/holes\.gas/.test(p))return 'Sky gas & dust';
 return group||'Setup & saved looks';
}
function arrange(host,key){
 currentHost=host;activeKey=currentPage+':'+key;items=[];buttons=[];
 const originalFields=[...host.querySelectorAll('input,select,textarea,button')];
 host.classList.add('focused-tools');
 const menu=$('#studioOptions');if(!menu)return;menu.replaceChildren();
 const original=[...host.children],bank=el('div','editor-source');bank.hidden=true;original.forEach(n=>bank.append(n));host.append(bank);
 context=bank.querySelector('[aria-label="Views tier selection"]');if(context){context.classList.add('editor-context');host.prepend(context);}
 const map=new Map();
 function unit(name){if(map.has(name))return map.get(name);const body=el('section','tool-page');body.hidden=true;body.dataset.tool=name;body.append(el('h2','tool-title',name));host.append(body);map.set(name,body);items.push({name,body});return body;}
 const fields=[...bank.querySelectorAll('.c,.pg-row,.pg-chk,.rn-control')].filter(n=>n.querySelector('input,select,textarea'));
 const headings=new Set();
 for(const row of fields){
  if(!bank.contains(row))continue;
  const inp=row.querySelector('input,select,textarea'),source=row.closest('.grp,.pg-grp,.rn-fields,.rn-quick');
  const title=source?.querySelector(':scope>summary,:scope>h3,:scope>.gb>h3')?.textContent||'';
  const name=category(inp.dataset.p||inp.dataset.control||'',row.querySelector('label')?.textContent||'',title);
  const body=unit(name),hk=name+'|'+title;if(title&&title!==name&&!headings.has(hk)){body.append(el('h3','source-heading',title));headings.add(hk);}body.append(row);
 }
 // Keep every remaining original action, saved variant, selector, upload and count field accessible.
 for(const node of [...bank.children]){
  if(node.matches('.eyebrow,h2,p.note')&&!node.querySelector('input,button,select')&&!node.matches('[role=status]'))continue;
  if(!node.matches('button,input,select,textarea')&&!node.querySelector('button,input,select,textarea,a.btn')&&!node.matches('[role=status]'))continue;
  let name='Setup & saved looks';
  if(node.querySelector('#newHoleAxes'))name='Angles & axes';
  else if(node.querySelector('#modelSmall,#modelLarge,#tier2Start,#tier2End,#bothSmall,#bothLarge'))name='Ring growth with views';
  else if(node.matches('[data-k="hTest"]'))name='Test counts';
  unit(name).append(node);if(node.tagName==='DETAILS')node.open=true;
 }
 bank.remove();
 host.dataset.originalControls=String(originalFields.length);
 host.dataset.retainedControls=String(originalFields.filter(n=>host.contains(n)).length);
 if(originalFields.some(n=>!host.contains(n)))console.error('Editor control retention failed');
 const order=['Size','Ring growth with views','Rings & density','Speeds & motion','Angles & axes','Colors & light','Light bending','Position & spacing','Gas detail','Sky gas & dust','Feeding','Interactions','Sphere & face','Jets','Names & tags','Quality','Test counts','Setup & saved looks'];
 items.sort((a,b)=>(order.indexOf(a.name)<0?50:order.indexOf(a.name))-(order.indexOf(b.name)<0?50:order.indexOf(b.name)));
 for(const item of items){const b=button(item.name,()=>select(item.name),'option-button');b.dataset.option=item.name;menu.append(b);buttons.push(b);}
 if(key==='holes'){menu.append(button('Images & videos',()=>document.getElementById('openLib')?.click(),'option-button'));}
 if(!items.length)unit('Options').append(el('p','note','Choose a page feature above.'));
 select(memory[activeKey]||null,false);
}
function select(name,persist=true){
 if(name&&!items.some(i=>i.name===name))name=null;
 items.forEach(i=>{i.body.hidden=i.name!==name;});buttons.forEach(b=>b.classList.toggle('on',b.dataset.option===name));
 const menu=$('#studioOptions');if(menu)menu.hidden=!!name;
 if(context)context.hidden=!!name;
 $('#editorCrumb').textContent=name||'Choose an option';
 const back=$('.editor-back');if(back)back.disabled=!name;
 if(currentHost)currentHost.scrollTop=0;
 memory[activeKey]=name;if(persist)saveNav();
}
async function saveNavigation(nav){
 await nav.save();const until=Date.now()+10000;
 while(nav.saving&&Date.now()<until)await new Promise(resolve=>setTimeout(resolve,80));
 if(nav.saving||nav.edits.size)throw Error('Navigation has unsaved changes');
}
G.AsgardStudioLayout={mount,setPage,arrange,select,category,saveNavigation};
})(window);

