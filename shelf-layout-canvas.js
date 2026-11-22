/* A shelf bay is laid out in the coordinate system of the original fixture photograph. */
(function (global) {
  'use strict';
  const W = 1024, H = 1536, TOP = 30, BOTTOM = 16;
  const EDGE = 4, GAP = 6;
  const fixtureRoot = 'https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/menu-images/target-studio/product-scale/v1/';
  const shelfPlate = fixtureRoot + 'f15c230adeff3a1593fe24ba227e99816ebd0ef57540f4ba738976954030cf6c.png';
  const coolerPlate = fixtureRoot + '3cf7c88db2375354e6dfe501f70e43876ca9697266e0077ef49c0cf343a77418.png';
  const photoMetrics = new Map(), measuring = new Map(), failedPhotos = new Set();
  const surfaces = new WeakMap();
  const currency = new Intl.NumberFormat('en-US', {style:'currency', currency:'USD'});
  const finite = (v, fallback) => Number.isFinite(v) ? v : fallback;
  const clamp = (v, min, max) => Math.max(min, Math.min(v, max));
  function fractionBox(x,y,w,h) { return {left:x/W,top:y/H,width:w/W,height:h/H}; }
  function photoKey(p) {
    return [p.image,p.photo,...(Array.isArray(p.photos) ? p.photos : [])].find(v=>v && !failedPhotos.has(v)) || '';
  }
  function getAspect(p) {
    if (p.aspect > 0 && Number.isFinite(p.aspect)) return p.aspect;
    if (p.source?.[2] > 0 && p.source?.[3] > 0) return p.source[2]/p.source[3];
    return photoMetrics.get(photoKey(p))?.aspect || 1;
  }
  function layout(config) {
    const cold = /cool|fridge|refrigerat|freez/i.test(config.fixture || '');
    const edge = W*(cold ? .085 : .043);
    const bayW = W - 2*edge, laneW = bayW/3;
    const rows = Math.round(clamp(finite(config.rows,4),1,8));
    const rowH = (H - TOP - BOTTOM)/rows;
    const railH = rowH*clamp(finite(config.rail,4),1,15)/100;
    const tagH = Math.min(31,rowH*.12);
    const stockH = rowH - railH - tagH;
    const moves = config.transforms || config.products || {};
    let line = 0, used = 0;
    const allSlots = [], locations = new Map();
    for (const item of config.items || []) {
      if (!item?.id) continue;
      const aspect = clamp(getAspect(item),.04,32);
      const move = moves instanceof Map ? moves.get(item.id) : moves[item.id];
      const baseW = Math.min(laneW*.45,aspect*stockH*.72);
      const baseH = baseW/aspect;
      const maxScale = Math.max(.1,Math.min(6,(bayW-2*EDGE-GAP)/(2*baseW),(stockH-2*EDGE)/baseH));
      const scale = clamp(finite(move?.scale,finite(item.scale,1)),.1,maxScale);
      const packW = 2*baseW*scale+GAP, packH = baseH*scale;
      const span = clamp(Math.ceil((packW+EDGE*2)/laneW - 1e-9),1,3);
      if (used && used+span>3) { line++; used=0; }
      const page = Math.floor(line/rows), row = line%rows;
      const cellLeft = edge+used*laneW, cellTop = TOP+row*rowH, cellW = span*laneW;
      const maxX = Math.max(0,(cellW-packW-2*EDGE)/(2*cellW));
      const minY = Math.min(0,-(stockH-packH-2*EDGE)/rowH);
      const x = clamp(finite(move?.x,0),-maxX,maxX), y = clamp(finite(move?.y,0),minY,0);
      const left = cellLeft+(cellW-packW)/2+x*cellW;
      const bottom = cellTop+stockH-EDGE+y*rowH;
      const limits = {minX:-maxX,maxX,minY,maxY:0,minScale:.1,maxScale};
      const slot = {id:item.id,item,page,row,span,x,y,scale,...limits,limits,
        ...fractionBox(left,bottom-packH,packW,packH),
        cell:fractionBox(cellLeft,cellTop,cellW,rowH), faceWidth:baseW*scale/W,
        tag:fractionBox(cellLeft+2,cellTop+stockH,cellW-4,tagH)};
      allSlots.push(slot);
      if (!locations.has(item.id)) locations.set(item.id,page);
      used+=span;
      if (used===3) { used=0; line++; }
    }
    const pages=allSlots.length ? allSlots[allSlots.length-1].page+1 : 0;
    const pageFor=id=>locations.get(id) ?? -1;
    const page=locations.has(config.anchorId) ? pageFor(config.anchorId) :
      clamp(Math.floor(finite(config.page,0)),0,Math.max(0,pages-1));
    return {page,pages,slots:allSlots.filter(s=>s.page===page),allSlots,pageFor,rows,railH,rowH,tagH,stockH,cold};
  }
  const styleRect = (node,x,y,w,h) => {
    node.style.left=x*100+'%'; node.style.top=y*100+'%';
    node.style.width=w*100+'%'; node.style.height=h*100+'%';
  };
  const element=(tag,css)=>{const e=document.createElement(tag); e.className=css; return e;};
  function imageURL(value) {
    try {
      if (typeof value!=='string' || !value.trim()) return '';
      const url = new URL(value, document.baseURI);
      return ['https:','http:'].includes(url.protocol) ? url.href : '';
    } catch {return '';}
  }
  function photoCrop(node,url,crop,w,h) {
    const [x,y,sw,sh]=crop;
    node.style.backgroundImage='url('+JSON.stringify(url)+')';
    node.style.backgroundSize=(w/sw*100)+'% '+(h/sh*100)+'%';
    node.style.backgroundPosition=(w===sw ? 0 : x/(w-sw)*100)+'% '+(h===sh ? 0 : y/(h-sh)*100)+'%';
  }
  // Sample an empty interior and the original rail independently. The photographed
  // rails contain baked blank holders. Cover these with metal taken between them.
  function fixtureArtwork(parent,m,plate) {
    function slice(cellTop,cellHeight,sx,sy,sw,sh,x=0,w=W) {
      const node=element('div','sl-fixture-band');
      styleRect(node,x/W,cellTop/H,w/W,cellHeight/H);
      photoCrop(node,plate,[sx,sy,sw,sh],W,H);
      parent.append(node);
    }
    slice(0,TOP,0,0,W,30);
    const lipLeft=m.cold ? 34 : 20;
    for(let row=0;row<m.rows;row++) {
      const y=TOP+m.rowH*row;
      // Cycle the four original shelf cavities, preserving texture and door posts.
      const sourceRow=row%4;
      const start=sourceRow===0 ? 30 : sourceRow*384+10;
      const contact=sourceRow*384+336;
      slice(y,m.stockH,0,start,W,contact-start);
      slice(y+m.stockH,m.tagH+m.railH,0,contact,W,46);
      slice(y+m.stockH,m.tagH+m.railH,340,contact+1,17,42,lipLeft,W-2*lipLeft);
    }
    slice(H-BOTTOM,BOTTOM,0,1534,W,2);
  }
  function measurePhoto(key,photo) {
    if (photoMetrics.has(key)) return Promise.resolve(photoMetrics.get(key));
    if (measuring.has(key)) return measuring.get(key);
    const task=new Promise(resolve=>{
      const img=new Image();
      img.crossOrigin='anonymous';
      img.onerror=()=>resolve(null);
      img.onload=()=>{
        const w=img.naturalWidth,h=img.naturalHeight;
        if (!w || !h) {resolve(null);return;}
        const data={aspect:w/h};
        try {
          const ratio=Math.min(1,256/Math.max(w,h)),can=document.createElement('canvas');
          const pw=can.width=Math.max(1,Math.round(w*ratio)),ph=can.height=Math.max(1,Math.round(h*ratio));
          const ctx=can.getContext('2d',{willReadFrequently:true});
          ctx.drawImage(img,0,0,pw,ph);
          const pixels=ctx.getImageData(0,0,pw,ph).data;
          // Transparent catalog photos sometimes contain far more empty canvas than
          // package. An opaque photo may use a flat white studio backdrop instead.
          // Only white adjoining a consistently white outer border is treated as air.
          const white=i=>pixels[i*4+3]>=250 && Math.min(pixels[i*4],pixels[i*4+1],pixels[i*4+2])>=248;
          const boundary=[];
          for(let x=0;x<pw;x++) boundary.push(x,(ph-1)*pw+x);
          for(let y=1;y<ph-1;y++) boundary.push(y*pw,y*pw+pw-1);
          const background=new Uint8Array(pw*ph);
          if(boundary.filter(white).length>=boundary.length*.97) {
            const queue=new Int32Array(pw*ph);
            let head=0,tail=0;
            const visit=i=>{if(!background[i]&&white(i)){background[i]=1;queue[tail++]=i;}};
            for(const i of boundary)visit(i);
            while(head<tail) {
              const i=queue[head++], x=i%pw;
              if(x>0)visit(i-1);if(x<pw-1)visit(i+1);
              if(i>=pw)visit(i-pw);if(i<(ph-1)*pw)visit(i+pw);
            }
          }
          let x0=pw,y0=ph,x1=-1,y1=-1;
          for(let y=0;y<ph;y++)for(let x=0;x<pw;x++){
            const i=y*pw+x;
            if(pixels[i*4+3]>28 && !background[i]) {
              x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);
            }
          }
          if(x1>x0&&y1>y0) {
            x0=Math.max(0,x0-1);y0=Math.max(0,y0-1);x1=Math.min(pw,x1+2);y1=Math.min(ph,y1+2);
            if(x1-x0<pw-1||y1-y0<ph-1) {
              data.crop=[x0*w/pw,y0*h/ph,(x1-x0)*w/pw,(y1-y0)*h/ph];
              data.w=w;data.h=h;data.aspect=data.crop[2]/data.crop[3];
            }
          }
        } catch { /* A server may allow image display but deny pixel reads. */ }
        resolve(data);
      };
      img.src=photo;
    }).then(data=>{
      measuring.delete(key);
      if(data)photoMetrics.set(key,data);
      return data;
    });
    measuring.set(key,task);
    return task;
  }
  function notifyMetrics(host,key) {
    const current=surfaces.get(host);
    if(!current || current.frame || !current.model.slots.some(s=>s.id===key || photoKey(s.item)===key))return;
    current.frame=requestAnimationFrame(()=>{
      if(surfaces.get(host)!==current)return;
      // The controller updates its receipt before enabling drag/nudge at the new size.
      const event=new CustomEvent('shelf-layout-metrics',{bubbles:true,cancelable:true});
      if(host.dispatchEvent(event))render(host,current.config);
    });
  }
  function render(host,config) {
    const m=layout(config);
    const active = config.selected instanceof Set ? config.selected : new Set(config.selected || []);
    const fragment=document.createDocumentFragment();
    host.classList.add('sl-bay');
    const plate=imageURL(config.plate?.url || config.plate) || (m.cold ? coolerPlate : shelfPlate);
    const art=element('div','sl-art');
    art.setAttribute('aria-hidden','true');
    fixtureArtwork(art,m,plate);
    fragment.append(art);
    const record={config,model:m};
    surfaces.set(host,record);
    for(const slot of m.slots) {
      const p=slot.item, c=slot.cell;
      const cell=element('div','sl-slot shelf-layout-cell');
      styleRect(cell,c.left,c.top,c.width,c.height);
      cell.dataset.productId=p.id;
      cell.dataset.selected=String(active.has(p.id));
      cell.classList.toggle('is-selected',active.has(p.id));
      const faces=element('button','sl-faces shelf-layout-stock');
      faces.type='button';
      faces.dataset.productId=p.id;
      faces.setAttribute('aria-label',p.name || 'Shelf product');
      faces.setAttribute('aria-pressed',String(active.has(p.id)));
      styleRect(faces,(slot.left-c.left)/c.width,(slot.top-c.top)/c.height,slot.width/c.width,slot.height/c.height);
      const atlas=imageURL(p.atlas);
      const key=photoKey(p), photo=imageURL(key);
      if (atlas && Array.isArray(p.source) && p.source[2]>0 && p.source[3]>0) {
        for(let i=0;i<2;i++) {
          const face=element('span','sl-face');
          face.style.width=slot.faceWidth/slot.width*100+'%';
          photoCrop(face,atlas,p.source,p.atlasWidth||1152,p.atlasHeight||1536);
          faces.append(face);
        }
      } else if(photo) {
        const info=photoMetrics.get(key);
        if(!info) {
          measurePhoto(key,photo).then(loaded=>{if(loaded)notifyMetrics(host,key);});
        }
        for(let i=0;i<2;i++) {
          const face=element(info?.crop?'span':'img','sl-face');
          face.style.width=slot.faceWidth/slot.width*100+'%';
          if(info?.crop)photoCrop(face,photo,info.crop,info.w,info.h);
          else {
            face.alt='';face.draggable=false;
            if(!i)face.onload=()=>{
              // Cross-origin photos without CORS still expose their intrinsic dimensions.
              if(!photoMetrics.has(key)) {
                const aspect=face.naturalWidth/face.naturalHeight;
                if(aspect>0&&Number.isFinite(aspect)) {
                  photoMetrics.set(key,{aspect});notifyMetrics(host,key);
                }
              }
            };
            if(!i)face.onerror=()=>{
              if(!failedPhotos.has(key)){
                failedPhotos.add(key);
                notifyMetrics(host,p.id);
              }
            };
            face.src=photo;
          }
          faces.append(face);
        }
      } else {
        const missing=element('span','sl-missing');missing.textContent='Photo unavailable';faces.append(missing);
      }
      const tag=element('button','sl-label');
      tag.type='button';tag.tabIndex=-1;tag.dataset.productId=p.id;
      styleRect(tag,(slot.tag.left-c.left)/c.width,(slot.tag.top-c.top)/c.height,slot.tag.width/c.width,slot.tag.height/c.height);
      const name=element('span','sl-tag-name'), price=element('b','sl-tag-price');
      name.textContent=[p.name,p.size].filter(Boolean).join(' · ');
      const n=p.price==null || p.price==='' ? NaN : Number(p.price);
      price.textContent=Number.isFinite(n)?currency.format(n):'';
      tag.setAttribute('aria-label',[name.textContent,price.textContent].filter(Boolean).join(', '));
      tag.append(name,price);cell.append(faces,tag);fragment.append(cell);
    }
    host.replaceChildren(fragment);
    return m;
  }
  const api={render,layout};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  global.ShelfLayoutCanvas=api;
})(typeof window==='undefined'?globalThis:window);
