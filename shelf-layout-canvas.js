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
  const isDG = theme => theme==='dollar-general';
  const sceneHeight = theme => isDG(theme) ? 1280 : H;
  const metricsKey = (photo,theme) => isDG(theme) ? 'dg:'+photo : photo;
  function fractionBox(x,y,w,h,height=H) { return {left:x/W,top:y/height,width:w/W,height:h/height}; }
  function photoKey(p) {
    return [p.image,p.photo,...(Array.isArray(p.photos) ? p.photos : [])].find(v=>v && !failedPhotos.has(v)) || '';
  }
  function getAspect(p,theme) {
    if (p.aspect > 0 && Number.isFinite(p.aspect) && (!p.packshot || photoKey(p) === p.image)) return p.aspect;
    if (p.source?.[2] > 0 && p.source?.[3] > 0) return p.source[2]/p.source[3];
    return photoMetrics.get(metricsKey(photoKey(p),theme))?.aspect || 1;
  }
  // Compare sizes within a fixture. A single-serve drink and a two-liter
  // bottle keep their different heights even when both photos are square.
  const packageSizes = new WeakMap();
  const packageUnits = {
    'fl oz':'fl oz', 'fluid ounces':'fl oz', 'fluid ounce':'fl oz', 'floz':'fl oz',
    'oz':'oz','ounce':'oz','ounces':'oz','liter':'L','liters':'L','litre':'L','litres':'L','l':'L',
    'ml':'mL','milliliter':'mL','milliliters':'mL','gal':'gal','gallon':'gal','gallons':'gal',
    'qt':'qt','quart':'qt','quarts':'qt','pt':'pt','pint':'pt','pints':'pt',
    'lb':'lb','lbs':'lb','pound':'lb','pounds':'lb','g':'g','kg':'kg'
  };
  function packageSize(item) {
    const cached = packageSizes.get(item);
    if (cached) return cached;
    const name = String(item.name || '').replace(/[‐‑–]/g,'-').replace(/(\d)\.\s+(\d)/g,'$1.$2');
    const lessFractions = name.replace(/(\d+)\s+(\d+)\/(\d+)\b/g, (_,whole,num,den) => String(Number(whole)+Number(num)/Number(den)));
    const expression = /(?:^|[^\w./])(\d+(?:\.\d+)?)\s*[- ]?\s*(fl\.?\s*oz\.?|fluid ounces?|ounces?|oz\.?|liters?|litres?|l|milliliters?|ml|gallons?|gal|quarts?|qt|pints?|pt|pounds?|lbs?|kg|g)\b/ig;
    const measurements = Array.from(lessFractions.matchAll(expression));
    const m = measurements[0] || Array.from(String(item.size || '').matchAll(expression))[0];
    const unit = m && packageUnits[m[2].toLowerCase().replaceAll('.','').replace(/\s+/g,' ')];
    const quantity = m ? Number(m[1]) : 0;
    const numbers = name.match(/\b(\d{1,3})\s*[- ]?\s*(pack|pk|count|ct)\b/i)
      || name.match(/\b(?:pack|box) of (\d{1,3})\b/i)
      || name.match(/\b(\d{1,2})\s*[x×]\s*\d+(?:\.\d+)?\s*(?:fl\s*)?oz\b/i);
    const copies = numbers ? Number(numbers[1]) : 0;
    let label = quantity && unit ? quantity+' '+unit : '';
    if (copies > 1) {
      const countLabel = copies + (/^(pack|pk)$/i.test(numbers[2] || '') ? ' pk' : ' ct');
      label = label ? countLabel+' · '+label : countLabel;
    }
    const result = {label,quantity,unit,copies,name};
    packageSizes.set(item,result);
    return result;
  }

  function dgHeight(item,aspect) {
    const {quantity,unit,name} = packageSize(item);
    if (!quantity) return .88;
    const beverage = /\b(sodas?|drink|sparkling water|waters?|tea|coffee|juice|cola|lemonade|lemon.lime|root beer|ginger ale|punch|sports drink|milk|cider|lager|wine|beer)\b/i.test(name)
      && !/\b(powder|powdered|drink mix|coffee pods|ground coffee|tea bags|shampoo|cream cheese|shower|lotion|soap|cleaner)\b/i.test(name);
    const volume = {L:1000,mL:1,'fl oz':29.5735,oz:29.5735,gal:3785.4,qt:946.35,pt:473.18};
    const ml = quantity * (volume[unit] || 0);
    if (beverage && ml) {
      const can = /\bcans?\b/i.test(name);
      const carton = /\b(multipack|fridge pack|juice boxes|pouches)\b/i.test(name);
      let height = can ? 12.2 * Math.cbrt(ml/355) : 21.4 * Math.cbrt(ml/591);
      if (!can && ml >= 2600 && aspect > .5) height = 27.8;
      if (carton && ml < 400) height = Math.max(height,14);
      return clamp(height/34,.34,.95);
    }
    if (ml && /\b(cleaner|detergent|dish soap|liquid soap|shampoo|body wash|lotion|spray|disinfectant|conditioner)\b/i.test(name)) return clamp(.76*Math.cbrt(ml/650),.37,.94);
    if (unit === 'oz' && /\b(chips|pretzels|popcorn|corn snacks|crackers)\b/i.test(name))
      return clamp(.82*Math.cbrt(quantity/9),.48,.94);
    return .88;
  }

  function stockHeight(rows,rail,theme) {
    const rowH = (sceneHeight(theme)-TOP-BOTTOM)/Math.round(clamp(finite(rows,4),1,8));
    return rowH-Math.min(isDG(theme)?38:31,rowH*.12)-rowH*clamp(finite(rail,4),1,15)/100;
  }
  function layout(config) {
    const themed=isDG(config.theme), height=sceneHeight(config.theme);
    const cold = /cool|fridge|refrigerat|freez/i.test(config.fixture || '');
    const edge = W*(cold ? .085 : .043);
    const fixedColumns = Number.isInteger(config.productsPerRow);
    const columns = fixedColumns ? clamp(config.productsPerRow,1,6) : 3;
    const defaultFacings = clamp(Math.round(finite(config.facings,2)),1,3);
    const bayW = W - 2*edge, laneW = bayW/columns;
    const rows = Math.round(clamp(finite(config.rows,4),1,8));
    const rowH = (height - TOP - BOTTOM)/rows;
    const stockH = stockHeight(rows,config.rail,config.theme);
    const frontH = rowH-stockH;
    const tagH = frontH*.84;
    const railH = frontH-tagH;
    // The initial shelf opening determines horizontal allocation in Auto.
    // Editing rows or rails can resize art inside its reserved lanes, without
    // advancing or compressing any other product's absolute shelf position.
    const packingHeight = clamp(finite(config.autoStockHeight,stockHeight(themed?3:4,themed?5:3,config.theme)),100,1500);
    const moves = config.transforms || config.products || {};
    const autoPlan = themed && !fixedColumns
      ? (global.DollarGeneralPlan || (typeof require === 'function' && require('./dg-shelf-plan.js')))
      : null;
    const adaptive = autoPlan?.allocate
      ? autoPlan.allocate(config.items || [], bayW, packingHeight, defaultFacings, moves)
      : null;
    let line = 0, used = 0;
    const allSlots = [], locations = new Map();
    for (const item of config.items || []) {
      if (!item?.id) continue;
      const aspect = clamp(getAspect(item,config.theme),.04,32);
      const move = moves instanceof Map ? moves.get(item.id) : moves[item.id];
      const facings = clamp(Math.round(finite(move?.facings,defaultFacings)),1,3);
      const position = adaptive?.get(item.id);
      const lane = position?.width || laneW;
      const faceGaps = (facings-1)*GAP;
      const baseWidthLimit = Math.min(lane*(themed?.93:.90),lane-2*EDGE-faceGaps)/facings;
      const fillHeight=themed ? dgHeight(item,aspect) : .72;
      const baseW = Math.min(baseWidthLimit,aspect*stockH*fillHeight);
      const baseH = baseW/aspect;
      const availableW = position ? lane : fixedColumns ? laneW : bayW;
      const maxScale = Math.max(.1,Math.min(6,(availableW-2*EDGE-faceGaps)/(facings*baseW),(stockH-2*EDGE)/baseH));
      const requestedScale = finite(move?.scale,finite(item.scale,1));
      const scale = clamp(requestedScale,.1,maxScale);
      let span = 1;
      if (!fixedColumns && !position) {
        const refW = Math.min(baseWidthLimit,aspect*packingHeight*fillHeight);
        const maxRefScale = Math.min(6,(bayW-2*EDGE-faceGaps)/(facings*refW),(packingHeight-2*EDGE)*aspect/refW);
        const referencePack = facings*refW*clamp(requestedScale,.1,maxRefScale)+faceGaps;
        span = clamp(Math.ceil((referencePack+2*EDGE)/laneW-1e-9),1,columns);
      }
      if (!position && used && used+span>columns) { line++; used=0; }
      const currentLine = position ? position.line : line;
      const page = Math.floor(currentLine/rows), row = currentLine%rows;
      const cellLeft = edge + (position ? position.left : used*laneW);
      const cellTop = TOP + row*rowH, cellW = position ? position.width : span*laneW;
      const faceW = Math.min(baseW*scale,(cellW-2*EDGE-faceGaps)/facings);
      const packW = facings*faceW+faceGaps, packH = faceW/aspect;
      const maxX = Math.max(0,(cellW-packW-2*EDGE)/(2*cellW));
      const minY = Math.min(0,-(stockH-packH-2*EDGE)/rowH);
      const x = clamp(finite(move?.x,0),-maxX,maxX), y = clamp(finite(move?.y,0),minY,0);
      const left = cellLeft+(cellW-packW)/2+x*cellW;
      const bottom = cellTop+stockH-EDGE+y*rowH;
      const limits = {minX:-maxX,maxX,minY,maxY:0,minScale:.1,maxScale};
      const slot = {id:item.id,item,page,row,span,facings,x,y,scale,...limits,limits,
        ...fractionBox(left,bottom-packH,packW,packH,height),
        cell:fractionBox(cellLeft,cellTop,cellW,rowH,height), faceWidth:faceW/W,
        tag:fractionBox(cellLeft+2,cellTop+stockH,cellW-4,tagH,height)};
      allSlots.push(slot);
      if (!locations.has(item.id)) locations.set(item.id,page);
      used+=span;
      if (used===columns) { used=0; line++; }
    }
    const pages=allSlots.length ? allSlots[allSlots.length-1].page+1 : 0;
    const pageFor=id=>locations.get(id) ?? -1;
    const page=locations.has(config.anchorId) ? pageFor(config.anchorId) :
      clamp(Math.floor(finite(config.page,0)),0,Math.max(0,pages-1));
    return {page,pages,slots:allSlots.filter(s=>s.page===page),allSlots,pageFor,rows,productsPerRow:columns,railH,rowH,tagH,stockH,cold,width:W,height,theme:config.theme};
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
    if (isDG(m.theme) && !m.cold) {
      const warm=imageURL('dg-fixtures/warm-shelf.webp');
      const band=(top,height,sourceY,sourceHeight)=>{
        const node=element('div','sl-fixture-band');
        styleRect(node,0,top/m.height,1,height/m.height);
        photoCrop(node,warm,[0,sourceY,2172,sourceHeight],2172,724);
        parent.append(node);
      };
      band(0,TOP,0,25);
      for (let row=0;row<m.rows;row++) {
        const top=TOP+row*m.rowH;
        band(top,m.stockH,0,638);
        band(top+m.stockH,m.tagH+m.railH,638,86);
      }
      band(m.height-BOTTOM,BOTTOM,712,12);
      return;
    }
    function slice(cellTop,cellHeight,sx,sy,sw,sh,x=0,w=W) {
      const node=element('div','sl-fixture-band');
      styleRect(node,x/W,cellTop/m.height,w/W,cellHeight/m.height);
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
    slice(m.height-BOTTOM,BOTTOM,0,1534,W,2);
  }
  function measurePhoto(key,photo,theme) {
    if (photoMetrics.has(key)) return Promise.resolve(photoMetrics.get(key));
    if (measuring.has(key)) return measuring.get(key);
    const measureOnCanvas=()=>new Promise(resolve=>{
      const img=new Image();
      img.crossOrigin='anonymous';
      img.onerror=()=>resolve(null);
      img.onload=()=>{
        const w=img.naturalWidth,h=img.naturalHeight;
        if (!w || !h) {resolve(null);return;}
        const data={aspect:w/h};
        try {
          const ratio=Math.min(1,(isDG(theme)?512:256)/Math.max(w,h)),can=document.createElement('canvas');
          const pw=can.width=Math.max(1,Math.round(w*ratio)),ph=can.height=Math.max(1,Math.round(h*ratio));
          const ctx=can.getContext('2d',{willReadFrequently:true});
          ctx.drawImage(img,0,0,pw,ph);
          const imageData=ctx.getImageData(0,0,pw,ph);
          const pixels=imageData.data;
          if (isDG(theme) && global.DollarGeneralPhoto) {
            const result=global.DollarGeneralPhoto.preparePackshot(pixels,pw,ph);
            if (result.cutout) {
              ctx.putImageData(imageData,0,0);
              data.image=can.toDataURL('image/png');
              data.crop=result.bounds;
              data.w=pw;data.h=ph;
            } else {
              const [x,y,width,height]=result.bounds;
              data.w=w;data.h=h;
              data.crop=[x*w/pw,y*h/ph,width*w/pw,height*h/ph];
            }
            data.aspect=data.crop[2]/data.crop[3];
            resolve(data);
            return;
          }
          // Transparent catalog photos sometimes contain far more empty canvas than
          // package. An opaque photo may use a flat white studio backdrop instead.
          // Only white adjoining a consistently white outer border is treated as air.
          const white=i=>pixels[i*4+3]>=250 && Math.min(pixels[i*4],pixels[i*4+1],pixels[i*4+2])>=248;
          const boundary=[];
          for(let x=0;x<pw;x++) boundary.push(x,(ph-1)*pw+x);
          for(let y=1;y<ph-1;y++) boundary.push(y*pw,y*pw+pw-1);
          const background=new Uint8Array(pw*ph);
          const whiteBackdrop=boundary.filter(white).length>=boundary.length*.97;
          if(whiteBackdrop) {
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
    });
    const worker = isDG(theme) ? global.DollarGeneralShelfPhotos : null;
    const prepared = worker?.prepare ? Promise.race([Promise.resolve().then(()=>worker.prepare(photo)).catch(()=>null),new Promise(resolve=>setTimeout(()=>resolve(null),12000))]) : Promise.resolve(null);
    const task=prepared.then(data=>data || measureOnCanvas()).then(data=>{
      measuring.delete(key);
      if(data) {
        photoMetrics.set(key,data);
        // Derived PNGs are a display cache, not catalog assets. Bound their memory
        // while a shopper browses a large store; the original URL can recreate one.
        const textures=[...photoMetrics].filter(([,value])=>value.image);
        for(const [old] of textures.slice(0,Math.max(0,textures.length-96)))photoMetrics.delete(old);
      }
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
  // Shelf tags carry a two-word label. The full name, size and price open in a pop-up.
  const sizeWord=/^\d+(?:\.\d+)?(?:ct|oz|pk|lbs?|g|kg|ml|l|fl|gal|pc|pcs|count)?$/i;
  function shortName(p) {
    const clean=s=>String(s||'').replace(/[™®]/g,'').split(/\s+/)
      .filter(w=>w && !/^[&+\-–—:,|/]+$/.test(w) && !sizeWord.test(w) && !/^(the|a|an)$/i.test(w))
      .map(w=>w.replace(/[,:;]+$/,''));
    const words=clean(String(p.name||'').split(' - ')[0]);
    return (words.length ? words : clean(p.name)).slice(0,2).join(' ');
  }
  function closeDetail(host) {
    host.querySelector(':scope > .sl-detail')?.remove();
    delete host.dataset.detailId;
  }
  function openDetail(host,id) {
    const record=surfaces.get(host), slot=record?.model.slots.find(s=>s.id===id);
    if(!slot) {closeDetail(host);return;}
    closeDetail(host);
    const p=slot.item, layer=element('div','sl-detail'), card=element('div','sl-detail-card');
    layer.setAttribute('role','dialog');layer.setAttribute('aria-label',p.name||'Product details');
    const close=element('button','sl-detail-close');close.type='button';close.textContent='×';close.setAttribute('aria-label','Close');
    const pic=element('div','sl-detail-photo');
    const atlas=imageURL(p.atlas), key=photoKey(p), photo=imageURL(key), info=photoMetrics.get(metricsKey(key,record.config.theme));
    const original=imageURL(p.originalPhoto);
    if (isDG(record.config.theme) && (original || (photo && atlas))) {
      const img=element('img','sl-detail-img');
      img.alt='';img.draggable=false;
      img.onerror=()=>{
        if (photo && img.src !== photo) {
          img.onerror=null;img.src=photo;return;
        }
        if (!Array.isArray(p.source)) return;
        const face=element('span','sl-detail-crop');
        face.style.aspectRatio=String(p.source[2]/p.source[3]);
        photoCrop(face,atlas,p.source,p.atlasWidth||1152,p.atlasHeight||1536);
        pic.replaceChildren(face);
      };
      img.src=original || photo;pic.append(img);
    } else if(atlas && Array.isArray(p.source) && p.source[2]>0 && p.source[3]>0) {
      const face=element('span','sl-detail-crop');face.style.aspectRatio=String(p.source[2]/p.source[3]);
      photoCrop(face,atlas,p.source,p.atlasWidth||1152,p.atlasHeight||1536);pic.append(face);
    } else if(photo && info?.crop) {
      const face=element('span','sl-detail-crop');face.style.aspectRatio=String(info.crop[2]/info.crop[3]);
      photoCrop(face,info.image||photo,info.crop,info.w,info.h);pic.append(face);
    } else if(photo) {
      const img=element('img','sl-detail-img');img.alt='';img.draggable=false;img.src=photo;pic.append(img);
    }
    const name=element('div','sl-detail-name');name.textContent=p.name||'';
    const meta=element('div','sl-detail-meta');meta.textContent=[p.size,p.group].filter(Boolean).join(' · ');
    const n=p.price==null || p.price==='' ? NaN : Number(p.price);
    const price=element('div','sl-detail-price');price.textContent=Number.isFinite(n)?currency.format(n):'';
    card.append(close,pic,name,meta,price);layer.append(card);host.append(layer);
    host.dataset.detailId=id;
  }
  const detailHosts=new WeakSet();
  function bindDetail(host) {
    if(detailHosts.has(host))return;
    detailHosts.add(host);
    host.addEventListener('pointerdown',e=>{if(e.target.closest?.('.sl-detail'))e.stopPropagation();},true);
    host.addEventListener('click',e=>{
      const layer=e.target.closest?.('.sl-detail');
      if(layer) {
        e.stopPropagation();
        if(e.target===layer || e.target.closest('.sl-detail-close'))closeDetail(host);
        return;
      }
      const tag=e.target.closest?.('.sl-label'), face=e.target.closest?.('.sl-faces');
      // While organizing, a product click selects it for editing; its tag opens the details.
      const shopping=host.closest('.shelf-shopping') || !host.closest('#layout-workspace');
      const target=tag || (shopping ? face : null);
      if(target?.dataset.productId && (surfaces.get(host)?.config.showPopups!==false || !shopping))openDetail(host,target.dataset.productId);
    });
    host.addEventListener('keydown',e=>{if(e.key==='Escape' && host.dataset.detailId)closeDetail(host);});
  }
  function render(host,config) {
    const m=layout(config);
    const active = config.selected instanceof Set ? config.selected : new Set(config.selected || []);
    const fragment=document.createDocumentFragment();
    host.classList.add('sl-bay');
    host.dataset.theme=isDG(config.theme)?'dollar-general':'';
    host.dataset.fixture=m.cold ? 'cold' : 'ambient';
    host.style.setProperty('--shelf-bay-ratio',m.width+' / '+m.height);
    const plate=imageURL(config.plate?.url || config.plate) || (m.cold ? coolerPlate : shelfPlate);
    const art=element('div','sl-art');
    art.setAttribute('aria-hidden','true');
    fixtureArtwork(art,m,plate);
    fragment.append(art);
    const record={config,model:m};
    surfaces.set(host,record);
    let pendingPhotos=0;
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
      const addFace = face => {
        const width = slot.faceWidth/slot.width*100+'%';
        if (!isDG(config.theme)) { face.style.width=width;faces.append(face);return; }
        const unit=element('span','sl-unit');
        unit.style.width=width;
        // A single staggered rear unit gives catalog shelves depth, without a uniform cloned train. Use only prepared transparent cutouts.
        const seed=String(p.id).split('').reduce((n,c)=>n+c.charCodeAt(0),0);
        if((p.packshot || (face.tagName==='SPAN'&&face.style.backgroundImage))&&slot.facings===1&&seed%5!==0){
          const rear=face.cloneNode(true);rear.classList.add('sl-rear-face');rear.style.setProperty('--rear-x',7+seed%9+'%');rear.style.setProperty('--rear-y',-(3+seed%5)+'%');unit.append(rear);
        }
        unit.append(face);
        faces.append(unit);
      };
      if (atlas && Array.isArray(p.source) && p.source[2]>0 && p.source[3]>0) {
        for(let i=0;i<slot.facings;i++) {
          const face=element('span','sl-face');
          photoCrop(face,atlas,p.source,p.atlasWidth||1152,p.atlasHeight||1536);
          addFace(face);
        }
      } else if(photo) {
        const published=p.packshot && key===p.image;
        const metric=metricsKey(key,config.theme),info=published ? {aspect:p.aspect} : photoMetrics.get(metric);
        const preparing=isDG(config.theme) && !info;
        if(preparing)pendingPhotos++;
        if(!info) {
          measurePhoto(metric,photo,config.theme).then(loaded=>{
            // If pixel reads are unavailable, an ordinary image can still display.
            if (!loaded && preparing) photoMetrics.set(metric,{aspect:0});
            if (loaded || preparing) notifyMetrics(host,key);
          });
        }
        for(let i=0;i<slot.facings;i++) {
          const face=element(info?.crop || preparing ? 'span' : 'img','sl-face');
          if (preparing) { addFace(face);continue; }
          if(info?.crop)photoCrop(face,info.image||photo,info.crop,info.w,info.h);
          else {
            face.alt='';face.draggable=false;
            if(!i && !published)face.onload=()=>{
              // Cross-origin photos without CORS still expose their intrinsic dimensions.
              if(!photoMetrics.get(metric)?.aspect) {
                const aspect=face.naturalWidth/face.naturalHeight;
                if(aspect>0&&Number.isFinite(aspect)) {
                  photoMetrics.set(metric,{aspect});notifyMetrics(host,key);
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
          addFace(face);
        }
      } else {
        const missing=element('span','sl-missing');missing.textContent='Photo unavailable';faces.append(missing);
      }
      const tag=element('button','sl-label');
      tag.type='button';tag.tabIndex=-1;tag.dataset.productId=p.id;
      if (isDG(config.theme)) {
        const zoom=clamp(finite(config.priceTagScale,1.4),.75,2.2)/1.4;
        const width=Math.min(c.width*.96,.159*zoom);const tall=Math.min(slot.tag.height*.96,slot.tag.height*.87*zoom);
        styleRect(tag,(1-width/c.width)/2,(slot.tag.top-c.top+(slot.tag.height-tall)/2)/c.height,width/c.width,tall/c.height);
        if(finite(config.priceTextSize,0)>0)tag.style.setProperty('--dg-price-font',clamp(config.priceTextSize,9,22)+'px');
      } else styleRect(tag,(slot.tag.left-c.left)/c.width,(slot.tag.top-c.top)/c.height,slot.tag.width/c.width,slot.tag.height/c.height);
      const name=element('span','sl-tag-name'), price=element('b','sl-tag-price');
      name.textContent=isDG(config.theme) ? packageSize(p).label : shortName(p);
      if (isDG(config.theme) && !name.textContent) name.hidden=true;
      const n=p.price==null || p.price==='' ? NaN : Number(p.price);
      price.textContent=Number.isFinite(n)?currency.format(n):'';
      // Keep the whole price readable on narrow holders, including long amounts.
      tag.style.setProperty('--price-width-units',price.textContent.length+2.5);
      tag.title=[[p.name,p.size].filter(Boolean).join(' · '),price.textContent].filter(Boolean).join(', ');
      tag.setAttribute('aria-label',tag.title);
      if(config.showPrices===false&&isDG(config.theme))tag.hidden=true;
      tag.append(name,price);cell.append(faces,tag);fragment.append(cell);
    }
    const openId=host.dataset.detailId;
    m.pendingPhotos=pendingPhotos;host.dataset.preparing=String(pendingPhotos>0);
    host.replaceChildren(fragment);
    bindDetail(host);
    if(openId&&config.showPopups!==false)openDetail(host,openId);else if(openId)closeDetail(host);
    return m;
  }
  function prefetch(items,theme){
    for(const item of items||[]){const photo=photoKey(item);if(!photo||item.packshot)continue;const k=metricsKey(photo,theme);if(!photoMetrics.has(k))measurePhoto(k,photo,theme).then(info=>{if(!info)photoMetrics.set(k,{aspect:0});});}
  }
  const api={render,layout,stockHeight,shortName,packageSize,prefetch};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  global.ShelfLayoutCanvas=api;
})(typeof window==='undefined'?globalThis:window);

