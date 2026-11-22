(() => {
  'use strict';
  const islandWalk = '189581c9-d728-4e5d-9e02-ae4de19a15af';
  const dairy = 'Dairy & Eggs', alcohol = 'Beer & Wine';
  const dairyStations = new Set(['Cheese','Yogurt','Butter','Milk','Eggs','Milk Alternatives & Creamer','More Dairy']);
  const script = document.currentScript?.src || document.baseURI;
  const shellURL = name => new URL('./grocery-station-surfaces/' + name + '.png', script).href;
  const box = (l,t,w,h) => [l,t,l+w,t+h];

  // StationWall._facings draws farthest to nearest; all share the same shelf contact.
  function facings(box, count) {
    const [x,y,r,b] = box, width=r-x, height=b-y;
    const faceWidth=width*(count>=4 ? .52 : .62), step=count<=1 ? 0 : (width-faceWidth)/(count-1);
    return Array.from({length:count},(_,offset)=>{
      const j=count-1-offset, left=x+step*j;
      return {box:[left, b-height*(1-j*.025),left+faceWidth,b],
        opacity:j===0 ? 1 : Math.min(.90, Math.max(.58,.92-j*.08))};
    });
  }

  function identity(row, name, url, media) {
    const id = row.product_id, raw = row.price;
    if(typeof id!=='string' || !id || typeof name!=='string' || !name.trim()) return null;
    return {id, name, price: raw==null || raw==='' || !Number.isFinite(Number(raw)) ? null : Number(raw),
      photo: url ? media(url) || '' : ''};
  }

  function dairyPanels(rows, section, store, media) {
    const byImage=new Map();
    for(const row of rows) {
      if(row.store_id!==store || row.station!==section || !row.image_url)continue;
      // The virtual image denotes a page group. Physical dairy uses a drawn case.
      if(!byImage.has(row.image_url))byImage.set(row.image_url,[]);
      byImage.get(row.image_url).push(row);
    }
    const h=(1-.055-.035)/4;
    return Array.from(byImage.values(),(list,page)=>{
      const items=list.slice(0,20), few=items.length<=4;
      const spots=[];
      items.forEach((row,i)=>{
        const spot=identity(row,row.label ?? row.product_name,row.product_image,media);
        if(!spot)return;
        const top=.055+h*(few?i:Math.floor(i/5)),left=(i%5)/5;
        const photoBox=few ? box(.055+.08,top+h*.025,.89-2*.08,h*.69)
          :box(left+.018+.2*.02,top+h*.035,.2-.036-2*.2*.02,h*.68);
        const tagBox=few ? box(.10,top+h*.765,.80,h*.105) : box(left+.012,top+h*.765,.2-.024,h*.105);
        const zone=few ? box(.025,top+h*.01,.95,h*.90) : box(left+.005,top+h*.01,.2-.010,h*.90);
        spots.push({...spot,slot:i+1,boxes:[zone],photoBox,tagBox,facings:facings(photoBox,few?5:section==='Eggs'?2:3)});
      });
      return {url:shellURL('dairy'),label:section+' · '+(page+1),width:1672,height:941,
        station:section,layered:true,spots};
    }).filter(page=>page.spots.length);
  }

  function fixturePanels(rows, definitions, section, store, media) {
    const defs=new Map(definitions.filter(d=>d.station===section &&
      ((section===alcohol && ['beer-photo-sliced','wine-photo-sliced'].includes(d.folder)) ||
       (section==='Packaged Deli Meat' && d.folder==='packaged-deli-products') ||
       (section==='Specialty Cheese' && d.folder==='specialty-cheese-products')) &&
      Array.isArray(d.cx) && d.cx.length && Array.isArray(d.tops) && d.tops.length)
      .map(d=>[d.folder,d]));
    const groups=new Map();
    for(const row of rows){
      if(row.store_id!==store || row.station!==section || !defs.has(row.folder))continue;
      const name=row.shelf_group ?? 'Other';
      if(!groups.has(name))groups.set(name,{name,rank:Infinity,order:Infinity,folders:new Map()});
      const g=groups.get(name);
      g.rank=Math.min(g.rank,Number(row.shelf_rank ?? 0));
      g.order=Math.min(g.order,Number(row.ord ?? 0));
      if(!g.folders.has(row.folder))g.folders.set(row.folder,[]);
      g.folders.get(row.folder).push(row);
    }
    const result=[];
    for(const group of Array.from(groups.values()).sort((a,b)=>a.order-b.order||a.rank-b.rank)){
      for(const [folder,items] of Array.from(group.folders).sort((a,b)=>Number(defs.get(a[0]).ord)-Number(defs.get(b[0]).ord))){
        const def=defs.get(folder),cols=def.cx.length,rows=def.tops.length,cap=cols*rows;
        const deli=section!==alcohol, beer=folder==='beer-photo-sliced';
        // The physical backgrounds correspond to four deli shelves or three beverage shelves.
        if(deli ? (rows!==4 || cols!==5) : (rows!==3 || cols!==6)) continue;
        const w=1/cols,h=(1-.055-.035)/rows;
        for(let first=0;first<items.length;first+=cap){
          const spots=[];
          items.slice(first,first+cap).forEach((row,i)=>{
            const spot=identity(row,row.name,row.image_url,media);
            if(!spot)return;
            const left=w*(i%cols),top=.055+h*Math.floor(i/cols);
            const photoBox=box(left+w*.06,top+h*.035,w*.88,h*(deli ? .67 : .69));
            spots.push({...spot,slot:i+1,boxes:[box(left+w*.015,top+h*.01,w*.97,h*.90)],
              photoBox,tagBox:box(left+w*.045,top+h*.765,w*.91,h*.105),
              facings:facings(photoBox,beer?4:3),
              ...(beer?{railBox:box(left+w*.035,top+h*.705,w*.93,h*.035)}:{})});
          });
          if(spots.length)result.push({url:shellURL(deli?'dairy':beer?'beer':'wine'),station:section,
            label:group.name+' · '+(1+Math.floor(first/cap)),width:Number(def.img_w),height:Number(def.img_h),
            layered:true,spots});
        }
      }
    }
    return result;
  }

  async function subsPage(store, {read,media,signal}) {
    const [boards,rows]=await Promise.all([
      read('menu_boards',{select:'station,image_path,img_w,img_h,heads,cols,titles',station:'eq.Subs'},signal),
      read('menu_items_v',{select:'store_id,station,col,ord,label,product_id,price,product_image',
        store_id:'eq.'+store,station:'eq.Subs',order:'col.asc,ord.asc'},signal)
    ]);
    const board=boards.find(b=>b.station==='Subs');
    if(!board || !Array.isArray(board.cols) || !Array.isArray(board.heads) || !Array.isArray(board.titles))return [];
    const boardURL=media(board.image_path),ratio=Number(board.img_w)/Number(board.img_h);
    const valid=b=>Array.isArray(b)&&b.length===4&&b.every(n=>Number.isFinite(n)&&n>=0&&n<=1)&&b[2]>b[0]&&b[3]>b[1];
    if(!boardURL || !Number.isFinite(ratio) || ratio<=0 || !board.cols.every(valid))return [];
    const headings=board.heads.map((box,i)=>({box,label:board.titles[i]})).filter(h=>valid(h.box)&&typeof h.label==='string');
    const chalk=['#ffe45e','#5ee0ff','#ff7bc5','#b6ff6e','#ffb347'];
    const spots=[];
    board.cols.forEach((column,col)=>{
      const items=rows.filter(r=>r.store_id===store && r.station==='Subs' && Number(r.col)===col+1);
      // Native _menuPage bases each row's box, margins and square thumbnail on its line height.
      const h=(column[3]-column[1])/Math.max(8,items.length),px=h/ratio;
      items.forEach((r,i)=>{
        const spot=identity(r,r.label,r.product_image,media);
        if(!spot)return;
        const y=column[1]+h*(i*1.07+.035), x=column[0],right=column[2];
        const rowBox=[x,y,right,y+h], photoBox=box(x+px*.19,y+h*.12,px*.76,h*.76);
        const tagBox=[x+px*1.16,y,right-px*.22,y+h];
        spots.push({...spot,slot:spots.length+1,boxes:[rowBox],photoBox,tagBox,facings:[{box:photoBox,opacity:1}],
          menuRow:true,rowBox,thumbnailBox:box(x+px*.14,y+h*.07,px*.86,h*.86),textColor:chalk[i%chalk.length]});
      });
    });
    return spots.length?[{url:boardURL,station:'Subs',label:'Subs',width:board.img_w,height:board.img_h,layered:true,menu:true,headings,spots}]:[];
  }

  async function loadSection(door, section, storeId, {read,media,signal}) {
    if(storeId!==islandWalk || !section || section.door!==door)return [];
    const st=section.station;
    if(door===dairy && section.kind==='render' && dairyStations.has(st)){
      const rows=await read('station_render_v',{select:'store_id,station,image_url,image_order,spot_no,product_id,label,product_name,price,product_image',
        store_id:'eq.'+storeId,station:'eq.'+st,order:'image_order.asc,spot_no.asc'},signal);
      return dairyPanels(rows,st,storeId,media);
    }
    if(section.kind==='fixture' && ((door===alcohol && st===alcohol) ||
        (door==='Deli' && ['Packaged Deli Meat','Specialty Cheese'].includes(st)))){
      const [defs,rows]=await Promise.all([
        read('fixture_defs',{select:'station,folder,ord,cx,tops,img_w,img_h',station:'eq.'+st,order:'ord.asc'},signal),
        read('fixture_items_v',{select:'store_id,station,folder,ord,shelf_group,shelf_rank,name,product_id,image_url,price',
          store_id:'eq.'+storeId,station:'eq.'+st,order:'ord.asc,shelf_rank.asc,name.asc,product_id.asc'},signal)
      ]);
      return fixturePanels(rows,defs,st,storeId,media);
    }
    if(door==='Deli' && section.kind==='menu' && st==='Subs')return subsPage(storeId,{read,media,signal});
    return [];
  }

  async function load(door, storeId, {read,media,signal}) {
    if(storeId!==islandWalk || ![dairy,alcohol].includes(door))return [];
    const sections=await read('door_sections',{select:'door,kind,station,ord',door:'eq.'+door,order:'ord.asc'},signal);
    const pages=await Promise.all(sections.map(section=>loadSection(door,section,storeId,{read,media,signal})));
    return pages.flat();
  }
  window.GroceryStationFixtures=Object.freeze({load,loadSection});
})();
