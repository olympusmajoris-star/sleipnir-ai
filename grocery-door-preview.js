(function(root){
  'use strict';
  const base='https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/';
  const boardPhoto='menu-images/grocery stations/grocery-aisle-entrance-phone-v3.png';
  const colors=['#ffe45e','#5ee0ff','#ff7bc5','#b6ff6e','#ffb347','#c79bff'];
  const states=new WeakMap();
  function media(value){
    if(typeof value!=='string'||!value.trim())return '';
    try{
      const u=new URL(value);
      if(!u.href.startsWith(base)||u.username||u.password||!/[.](png|jpe?g|webp|avif)$/i.test(u.pathname))return '';
      return u.href;
    }catch{return '';}
  }
  function el(tag,cls,words){const e=document.createElement(tag);e.className=cls;if(words!=null)e.textContent=words;return e;}
  function color(raw){return /^#[a-f0-9]{6}$/i.test(raw||'')?raw:'';}
  function fit(width,height,ratio){
    const w=Math.min(width,height*ratio),h=w/ratio;
    return {left:(width-w)/2,top:(height-h)/2,width:w,height:h};
  }
  async function readGroups(storeId,source,read){
    if(typeof read!=='function'||!storeId||!source)return [];
    const names=new Set();
    for(let from=0;from<8000;from+=500){
      const query={select:'shelf_group,shelf_rank',store_id:'eq.'+storeId,
        category:'eq.'+(source==='Bread & Rolls'?'Bakery':source),shelf_group:source==='Bread & Rolls'?'eq.Bread & Rolls':'not.is.null',
        order:'shelf_rank.asc,id.asc',offset:from,limit:500};
      const rows=await read('products',query);if(!Array.isArray(rows))break;
      rows.forEach(row=>{const name=String(row.shelf_group||'').trim();if(name)names.add(name);});
      if(rows.length<500)break;
    }
    return Array.from(names);
  }
  function render({container,storeId,source,title,art,appearance={},onSelect,groups=[],selected,shopping=false}){
    if(!container)return;
    const app=appearance||{},photo=media(app.entrance_url)||media(art),original=media(art);
    const physical=original && decodeURIComponent(new URL(original).pathname).endsWith('/'+boardPhoto);
    const key=JSON.stringify([storeId,source,title,original,app,groups,selected,shopping]);
    let old=states.get(container);
    if(old?.key===key){old.onSelect=onSelect;return;}
    old?.observer?.disconnect();old?.stage?.remove();
    container.classList.add('gd-preview');
    const stage=el('div','gd-root'),frame=el('div','gd-photo-frame');
    container.append(stage);stage.append(frame);
    const state={key,stage,onSelect};states.set(container,state);
    const select=(target)=>state.onSelect?.(target);
    const enterLabel='Enter '+(app.entrance_title||title||source||'aisle');
    const openArt=el('button','gd-art-button');openArt.type='button';openArt.setAttribute('aria-label',shopping?enterLabel:'Edit entrance artwork');openArt.onclick=()=>select('entrance');
    frame.append(openArt);
    if(photo){const image=el('img','gd-art');image.alt='';image.src=photo;openArt.append(image);}
    const caption=app.entrance_title||((!physical||!photo)?title:'');
    if(caption){const h=el('button','gd-caption',caption);h.type='button';if(shopping)h.setAttribute('aria-label',enterLabel);h.onclick=()=>select('entrance');frame.append(h);}
    const lines=app.board_body?String(app.board_body).split(/\r?\n/):groups;
    if(physical){
      const half=Math.ceil(lines.length/2);
      for(const [side,rows] of [lines.slice(0,half),lines.slice(half)].entries()){
        const board=el('button','gd-side-board '+(side?'gd-right':'gd-left'));board.type='button';board.dataset.pick='sign';
        board.setAttribute('aria-label',shopping?enterLabel:'Edit '+(side?'right':'left')+' blackboard');
        board.onclick=()=>select('sign');
        if(color(app.board_color))board.style.backgroundColor=color(app.board_color);
        let ci=side;
        for(const [i,words] of [String(app.board_title||source||title||'').trim().split(/\s+/).filter(Boolean),rows].entries()){
          for(const wordsLine of words){
            const line=el('span',i?'gd-board-line':'gd-board-heading',wordsLine);
            line.style.color=color(app.ink_color)||colors[(ci++)%colors.length];board.append(line);
          }
        }
        frame.append(board);
      }
    }else if(app.board_title||app.board_body){
      const sign=el('button','gd-sign');sign.type='button';sign.dataset.pick='sign';sign.onclick=()=>select('sign');sign.setAttribute('aria-label',shopping?enterLabel:'Edit entrance sign');
      sign.style.backgroundColor=color(app.board_color)||'#242923';sign.style.color=color(app.ink_color)||'#ffffff';
      if(app.board_title)sign.append(el('strong','',app.board_title));
      if(app.board_body)sign.append(el('span','',app.board_body));
      stage.append(sign);
    }
    if(selected)stage.dataset.selected=selected;
    function size(){
      const W=stage.clientWidth,H=stage.clientHeight;
      if(!W||!H)return;
      const r=physical?fit(W,H,943/1595):{left:0,top:0,width:W,height:H};
      Object.assign(frame.style,{top:r.top+'px',left:r.left+'px',width:r.width+'px',height:r.height+'px'});
      frame.classList.toggle('gd-physical',!!physical);
      if(physical){
        const width=r.width*.185*.86;
        for (const board of frame.querySelectorAll('.gd-side-board')) {
          board.style.paddingTop=(r.height*.70*.03)+'px';
          const firstLine=board.querySelector('.gd-board-line');if(firstLine)firstLine.style.marginTop=(r.height*.70*.02)+'px';
        }
        for(const span of frame.querySelectorAll('.gd-side-board span')){
          const base=span.className==='gd-board-heading'?34:22;
          span.style.fontSize=base+'px';
          const natural=span.scrollWidth;
          if(natural>width)span.style.fontSize=Math.max(1,base*width/natural)+'px';
        }
      }
    }
    if(typeof ResizeObserver!=='undefined'){state.observer=new ResizeObserver(size);state.observer.observe(stage);}
    size();
  }
  root.GroceryDoorPreview={render,readGroups,fit};
})(typeof window==='undefined'?globalThis:window);
