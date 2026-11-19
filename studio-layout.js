/* One navigation shell around the existing editors. Controls are moved, never copied. */
(function(G){
'use strict';
const $=s=>document.querySelector(s),el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
const pages=[['raven','Raven sky'],['home','Home & posts'],['convo','Messages · clouds & earth'],['share','Share'],['heimdall','Heimdall'],['track','Track'],['swap','Swap & sell'],['ads','Local ads'],['shoppost','Shop the post'],['deals','Flash deals']];
const memory=(()=>{try{return JSON.parse(localStorage.getItem('asgard-editor-navigation-v1'))||{};}catch{return {};}})();
const saveNav=()=>{try{localStorage.setItem('asgard-editor-navigation-v1',JSON.stringify(memory));}catch{}};
let hooks={},currentPage='raven',activeKey='',currentHost=null,items=[],buttons=[],context=null,controlBrowser=null;
function button(label,fn,cls='btn'){const b=el('button',cls,label);b.type='button';b.onclick=fn;return b;}
function mount(config){
 hooks=config;currentPage=config.page||'raven';document.body.classList.add('studio-shell');
 const top=$('.top'),main=$('main'),right=$('.right'),left=$('.left');
 const center=$('.center'),title=$('.ctitle');
 if(center&&title){
  const sizes=el('label','phone-size-control','Phone size '),select=el('select');select.setAttribute('aria-label','Phone canvas size');
  for(const [value,label]of [['original','Original size'],['large','125%'],['largest','150%'],['fit','Fit on screen']]){const o=el('option','',label);o.value=value;select.append(o);}
  sizes.append(select);title.append(sizes);
  let size='fit';
  const apply=()=>{const value=select.value;document.body.dataset.phoneSize=value;document.documentElement.style.setProperty('--studio-phone-height',(value==='fit'?Math.max(560,Math.floor(innerHeight-((document.querySelector('.phonewrap')||{getBoundingClientRect:()=>({top:120})}).getBoundingClientRect().top)-12)):{original:820,large:1025,largest:1230}[value])+'px');try{localStorage.setItem('asgard-phone-size-v1',value);}catch{}};
  select.value=['original','large','largest','fit'].includes(size)?size:'original';select.onchange=apply;apply();addEventListener('resize',()=>{if(select.value==='fit')apply();});setTimeout(apply,400);
 }

 const areas=el('nav','app-tabs');areas.setAttribute('aria-label','Main app areas');
 const groups=G.StudioWorkspaceCore.GROUPS,activeGroup=groups.find(g=>g.pages.some(p=>p[0]===currentPage))?.id||'sky';
 for(const {id,name} of groups){
  const b=button(name,async()=>{
   if(b.disabled)return;
   b.disabled=true;
   try{
    await hooks.beforePage?.();
    location.href='workshop.html?group='+encodeURIComponent(id);
   }catch(error){b.disabled=false;b.title='Could not save your edits. Try again.';console.error('Area switch stopped because saving failed',error);}
  },'app-tab');
  b.setAttribute('role','tab');b.setAttribute('aria-selected',String(id===activeGroup));areas.append(b);
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
 // Zone 4 (options) sits in a narrow column beside zone 5 (controls); picking an option hides it so the controls get the full width.
 const work=el('div','work-area');toolbar.after(work);work.append(menu);const pnl=$('#panel');if(pnl)work.append(pnl);
 const empty=el('div','work-empty','← Pick what to change. Or click anything in the phone preview.');empty.id='workEmpty';work.append(empty);
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
 context=bank.querySelector('[aria-label="Views tier selection"],[data-editor-context]');if(context){context.classList.add('editor-context');host.prepend(context);}
 const map=new Map();
 function unit(name){if(map.has(name))return map.get(name);const body=el('section','tool-page');body.hidden=true;body.dataset.tool=name;body.append(el('h2','tool-title',name));host.append(body);map.set(name,body);items.push({name,body});return body;}
 for(const node of [...bank.querySelectorAll('[data-workbench-topic],details[data-studio-group]')])unit(node.dataset.workbenchTopic||node.dataset.studioGroup).append(node);
 const fields=[...bank.querySelectorAll('.c,.pg-row,.pg-chk,.rn-control')].filter(n=>n.querySelector('input,select,textarea'));
 const headings=new Set();
 for(const row of fields){
  if(!bank.contains(row))continue;
  const inp=row.querySelector('input,select,textarea'),source=row.closest('.grp,.pg-grp,.rn-fields,.rn-quick');
  const title=source?.querySelector(':scope>summary,:scope>h3,:scope>.gb>h3')?.textContent||'';
  const name=source?.dataset.studioGroup||(String(inp.dataset.control||'').startsWith('norse.')?'Scrolling Norse art':category(inp.dataset.p||inp.dataset.control||'',row.querySelector('label')?.textContent||'',title));
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
 for(const group of host.querySelectorAll('details[data-studio-group]')){const grid=el('div','control-grid');for(const child of [...group.children])if(child.tagName!=='SUMMARY')grid.append(child);group.append(grid);}
 compactInputs(host);
 controlBrowser=el('div','controls-browser');controlBrowser.hidden=true;
 const heading=el('div','controls-browser-heading'),count=host.querySelectorAll('input[data-control],select[data-control],textarea[data-control],input[data-p],select[data-p]').length;
 const title=el('strong','',count+' controls for this feature'),search=el('input','controls-search');search.type='search';search.placeholder='Find a control';search.setAttribute('aria-label','Find a control in this feature');
 heading.append(title,search);controlBrowser.append(heading);
 const jumps=el('nav','control-jumps');jumps.setAttribute('aria-label','Related control groups');
 for(const item of items){const b=button(item.name,()=>{search.value='';filterControls('');item.body.scrollIntoView({block:'start',behavior:'smooth'});$('#editorCrumb').textContent=item.name;},'control-jump');jumps.append(b);}
 const empty=el('p','controls-no-results','No matching controls. Try another word.');empty.hidden=true;
 function filterControls(value){const query=value.trim().toLowerCase();let visible=0;for(const item of items){let matches=0;for(const row of item.body.querySelectorAll('.c,.pg-row,.pg-chk,.rn-control')){if(row.parentElement?.closest('.c,.pg-row,.pg-chk,.rn-control'))continue;const words=(item.name+' '+row.textContent+' '+[...row.querySelectorAll('[aria-label]')].map(n=>n.getAttribute('aria-label')).join(' ')).toLowerCase();row.hidden=!!query&&!words.includes(query);if(!row.hidden)matches++;}item.body.hidden=!!query&&!matches;if(!item.body.hidden)visible++;}empty.hidden=visible>0;}
 search.addEventListener('input',()=>filterControls(search.value));controlBrowser.append(jumps,empty);host.prepend(controlBrowser);if(context)host.prepend(context);
 select(null,false);
 G.StudioWorkbench?.enhance(host,items.find(i=>!i.body.hidden)?.name||key);
 G.dispatchEvent(new CustomEvent('workspace-feature',{detail:{page:currentPage,feature:key,topic:memory[activeKey]||''}}));
}
function select(name,persist=true){
 if(name&&!items.some(i=>i.name===name))name=null;
 // An option opens the entire feature workspace; its related controls remain visible.
 // Move the chosen group first, keeping every original field and event handler intact.
 const selected=items.find(i=>i.name===name);
 for(const item of (selected?[selected,...items.filter(i=>i!==selected)]:items)){item.body.hidden=!name;currentHost?.append(item.body);for(const row of item.body.querySelectorAll('[hidden]'))if(row.matches('.c,.pg-row,.pg-chk,.rn-control'))row.hidden=false;}
 buttons.forEach(b=>b.classList.toggle('on',b.dataset.option===name));
 if(controlBrowser){controlBrowser.hidden=!name;controlBrowser.querySelector('input').value='';controlBrowser.querySelector('.controls-no-results').hidden=true;}
 const menu=$('#studioOptions');if(menu)menu.hidden=!!name;
 if(context)context.hidden=false;
 $('#editorCrumb').textContent=name||'Choose an option';
 const back=$('.editor-back');if(back)back.disabled=!name;
 if(currentHost){currentHost.scrollTop=0;G.StudioWorkbench?.enhance(currentHost,name||activeKey.split(':').at(-1));}
 G.__studioOption=name||'';
 const emptyNote=$('#workEmpty');if(emptyNote)emptyNote.hidden=!!name||!items.length;
 // Lots of controls: give them the room (the page list folds away until Back).
 const shown=items.find(i=>i.name===name),many=false;
 document.body.classList.toggle('wide-tools',many);
 // A feature that is switched off can't show changes: say so instead of leaving dead-looking sliders.
 if(shown){const sw=[...shown.body.querySelectorAll('input[type=checkbox]')].find(i=>/(^|\.)(on|show)$/.test(i.dataset.control||i.dataset.p||''));let note=shown.body.querySelector('.off-note');
  const upd=()=>{const off=!!sw&&!sw.checked;shown.body.classList.toggle('feature-off',off);if(off&&!note){note=el('div','off-note','This is switched off, so the preview won’t change. Turn on “'+((sw.closest('label')?.textContent||'Show it').trim())+'” first.');shown.body.querySelector('.tool-title')?.after(note);}if(note)note.hidden=!off;};
  if(sw&&!sw.dataset.offWatch){sw.dataset.offWatch='1';sw.addEventListener('change',upd);}upd();}try{if(parent!==G)parent.postMessage({type:'studio-wide',on:many},location.origin);}catch(e){}
 memory[activeKey]=name;if(persist){saveNav();G.dispatchEvent(new CustomEvent('workspace-feature',{detail:{page:currentPage,feature:activeKey.split(':').at(-1),topic:name||''}}));}
}
function compactInputs(host){
 for(const row of host.querySelectorAll('.c,.pg-row,.pg-chk,.rn-control')){
  const range=[...row.querySelectorAll('input[type=range]')].find(n=>n.closest('.c,.pg-row,.pg-chk,.rn-control')===row&&n.dataset.editorLocal!=='true');if(!range||range.dataset.compact==='1')continue;range.dataset.compact='1';
  const labelNode=row.querySelector('label'),label=range.getAttribute('aria-label')||(labelNode?[...labelNode.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim():'')||range.dataset.control||range.dataset.p||'Value';
  let exact=[...row.querySelectorAll('input[type=number]')].find(n=>n.closest('.c,.pg-row,.pg-chk,.rn-control')===row&&n.dataset.editorLocal!=='true');
  if(!exact){exact=el('input','control-number');exact.type='number';exact.min=range.min;exact.max=range.max;exact.step=range.step;exact.value=range.value;exact.setAttribute('aria-label',label+' exact value');const line=el('div','compact-range-line');range.before(line);line.append(range,exact);
   const update=(commit=false)=>{if(exact.value.trim()==='')return;const n=Number(exact.value),min=Number(range.min||0),max=Number(range.max||100);if(!Number.isFinite(n)||(!commit&&(n<min||n>max)))return;range.value=String(Math.max(min,Math.min(max,n)));range.dataset.fromExact='1';range.dispatchEvent(new Event('input',{bubbles:true}));range.dispatchEvent(new Event('change',{bubbles:true}));delete range.dataset.fromExact;};exact.addEventListener('input',()=>update(false));exact.addEventListener('change',()=>{update(true);exact.value=range.value;});
  }else exact.classList.add('control-number');
  range.addEventListener('input',()=>{if(range.dataset.fromExact!=='1')exact.value=range.value;});
  // The exact field is part of the same saved/locked setting, never a second value.
  range.setAttribute('aria-label',label);row.classList.add('compact-control');
 }
}
function custom(host,title){currentHost=host;items=[];buttons=[];context=null;controlBrowser=null;const menu=$('#studioOptions');if(menu){menu.replaceChildren();menu.hidden=true;}$('#editorCrumb').textContent=title;const back=$('.editor-back');if(back)back.disabled=true;const empty=$('#workEmpty');if(empty)empty.hidden=true;G.__studioOption=title;document.body.classList.remove('wide-tools');}
async function saveNavigation(nav){
 await nav.save();const until=Date.now()+10000;
 while(nav.saving&&Date.now()<until)await new Promise(resolve=>setTimeout(resolve,80));
 if(nav.saving||nav.edits.size)throw Error('Navigation has unsaved changes');
}
G.AsgardStudioLayout={mount,setPage,arrange,select,custom,category,saveNavigation,rememberFeature(key){memory[currentPage+':feature']=key;saveNav();},lastFeature(page){return memory[page+':feature'];}};
})(window);


