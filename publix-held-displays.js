/* Studio-only, held full-shelf photos for Island Walk. No catalog, status or Dart writes. */
(function(global){
'use strict';
const storeId='189581c9-d728-4e5d-9e02-ae4de19a15af';
const regular=new Set(['Snacks','Beverages','Condiments & Sauces','Dry Goods & Pasta']);
const sourceFor=label=>label==='Deli'?'Deli & Prepared Foods':label;
const supports=label=>regular.has(label)||label==='Dairy & Eggs'||label==='Deli';
// These complete images contain products from the existing Subs menu. Leave
// them held and keep the already approved menu instead of duplicating it.
const excludedDeli=new Set([7,8,9,10,11,35,43]);
const boxOK=b=>b.length===4&&b.every(x=>Number.isFinite(x)&&x>=0&&x<=1)&&b[2]>b[0]&&b[3]>b[1];
function rowCounts(layout,n){
 const m=/^rows:([0-9]+(?:,[0-9]+)*)$/.exec(layout||'');
 const count=m?m[1].split(',').map(Number):null;
 return count&&count.every(x=>x>=1&&x<=4)&&count.reduce((a,b)=>a+b,0)===n?count:null;
}
function makePanels(renders,slots,products,aisle,media,protectedIds=new Set()){
 const result=[],byRender=new Map();
 for(const s of slots){if(s.store_id!==storeId||s.aisle!==aisle)continue;
   if(!byRender.has(s.render_no))byRender.set(s.render_no,[]);byRender.get(s.render_no).push(s);}
 for(const r of renders){
   if(r.store_id!==storeId||r.aisle!==aisle||!['held','draft','ready'].includes(r.publish_status)||
     !String(r.image_path).startsWith('store-renders/publix-island-walk/')||
     (aisle==='Deli & Prepared Foods'&&excludedDeli.has(r.render_no)))continue;
   const rows=(byRender.get(r.render_no)||[]).sort((a,b)=>a.slot-b.slot),counts=rowCounts(r.layout,rows.length);
   const url=media(r.image_path,'store-renders');if(!url||!counts||!(r.width>0&&r.height>0))continue;
   if(rows.some((s,i)=>s.slot!==i+1||!products.has(s.product_id)||protectedIds.has(s.product_id)))continue;
   const tags=rows.map(s=>[s.tag_x,s.tag_y,s.tag_w,s.tag_h].map(x=>x==null?NaN:Number(x))).map(([x,y,w,h])=>[x,y,x+w,y+h]);
   if(tags.some(t=>!boxOK(t)))continue;
   let start=0,top=0,spots=[],valid=true;
   for(const count of counts){
     const segment=rows.slice(start,start+count),rt=tags.slice(start,start+count);
     const centers=rt.map(t=>(t[0]+t[2])/2),bottom=Math.max(...rt.map(t=>t[3]));
     if(bottom<=top||centers.some((v,i)=>i&&v<=centers[i-1])){valid=false;break;}
     for(let c=0;c<count;c++){
       const s=segment[c],p=products.get(s.product_id),left=c?(centers[c-1]+centers[c])/2:0,right=c<count-1?(centers[c]+centers[c+1])/2:1;
       const click=[left,top,right,bottom];if(!boxOK(click)){valid=false;break;}
       spots.push({id:p.id,name:p.name,price:p.price,description:p.description||'',shelfGroup:s.shelf_group||'',boxes:[click,rt[c]],tagBox:rt[c]});
     }
     top=bottom;start+=count;
   }
   if(!valid||spots.length!==rows.length)continue;
   const groups=[...new Set(spots.map(s=>s.shelfGroup).filter(Boolean))];
   result.push({url,spots,groups,label:groups[0]||aisle,renderNo:r.render_no,width:r.width,height:r.height,heldRender:true,publishStatus:r.publish_status});
 }
 return result.sort((a,b)=>a.renderNo-b.renderNo);
}
async function load(label,{read,media,signal,protectedIds=new Set()}){
 if(!supports(label))return [];
 const aisle=sourceFor(label),scope={store_id:'eq.'+storeId,aisle:'eq.'+aisle};
 const [renders,slots]=await Promise.all([
   read('aisle_renders',{...scope,select:'store_id,aisle,render_no,image_path,width,height,layout,publish_status',publish_status:'in.(held,draft,ready)',order:'render_no'},signal),
   read('aisle_slots',{...scope,select:'store_id,aisle,render_no,slot,product_id,shelf_group,tag_x,tag_y,tag_w,tag_h',order:'render_no,slot'},signal)
 ]);
 if(aisle==='Deli & Prepared Foods'){
   const menu=await read('menu_items_v',{store_id:'eq.'+storeId,station:'eq.Subs',select:'product_id'},signal);
   protectedIds=new Set([...protectedIds,...menu.map(m=>m.product_id)]);
 }
 const ids=[...new Set(slots.map(s=>s.product_id))],batches=[];
 for(let i=0;i<ids.length;i+=50)batches.push(read('products',{store_id:'eq.'+storeId,id:'in.('+ids.slice(i,i+50).join(',')+')',select:'id,store_id,name,price,description'},signal));
 const records=(await Promise.all(batches)).flat();
 const products=new Map(records.filter(p=>p.store_id===storeId).map(p=>[p.id,p]));
 return makePanels(renders,slots,products,aisle,media,protectedIds);
}
// Keep every original photo/menu untouched. Only suppress the covered
// separately positioned product layers, leaving any uncovered SKU accessible.
function merge(label,original,fresh){
 if(!fresh.length)return original;
 const covered=new Set(fresh.flatMap(p=>p.spots.map(s=>s.id)));
 const remainder=original.flatMap(p=>{
   if(!p.layered||p.menu)return [p];
   const spots=p.spots.filter(s=>!covered.has(s.id));
   return spots.length?[{...p,spots}]:[];
 });
 if(label==='Deli'){
   const at=remainder.findIndex(p=>p.layered&&!p.menu);
   return at===-1?[...remainder,...fresh]:[...remainder.slice(0,at),...fresh,...remainder.slice(at)];
 }
 return [...fresh,...remainder];
}
const api={storeId,regular,supports,sourceFor,rowCounts,makePanels,load,merge};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
global.PublixHeldDisplays=api;
})(typeof window!=='undefined'?window:globalThis);
