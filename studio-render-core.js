/* Deterministic display compositor. Product pixels and identities are never generated. */
(function(G){'use strict';
const displays=['shelf','refrigerator','freezer','produce','pegboard','clothing','menu'];
function count(n,lo,hi){if(!Number.isInteger(n)||n<lo||n>hi)throw Error('Invalid display dimensions');return n;}
function layout(board){
 if(!board||!displays.includes(board.display))throw Error('Unsupported display type');
 const rows=count(board.rows,1,12),columns=count(board.brandsPerRow,1,12),facings=count(board.facings,1,12);
 if(!Array.isArray(board.products)||!board.products.length||board.products.length>rows*columns)throw Error('Display product count does not fit');
 const ids=new Set();for(const p of board.products){if(typeof p.id!=='string'||!p.id||ids.has(p.id))throw Error('Missing or duplicate product identity');ids.add(p.id);}
 const products=new Map(board.products.map(p=>[p.id,p])),seen=new Set(),cells=[];
 if(!Array.isArray(board.slots)||board.slots.length!==products.size)throw Error('Every product needs one slot');
 const occupied=new Set(),width=1800,height=Math.max(1050,rows*330+160),left=70,top=95,cw=(width-140)/columns,rh=(height-160)/rows;
 for(const s of board.slots){const row=count(s.row,1,rows),column=count(s.column,1,columns),key=row+':'+column,p=products.get(s.productId);if(!p||seen.has(p.id)||occupied.has(key)||s.facings!==facings)throw Error('Conflicting product slots');seen.add(p.id);occupied.add(key);const x=left+(column-1)*cw,y=top+(row-1)*rh;
  cells.push({product:p,row,column,facings,x,y,width:cw,height:rh,images:Array.from({length:facings},(_,i)=>({x:x+10+i*(cw-20)/facings,y:y+14,width:(cw-20)/facings-4,height:rh-86})),tag:{x:x+10,y:y+rh-66,width:cw-20,height:54}});
 }
 return {width,height,rows,columns,display:board.display,category:String(board.category||''),cells};
}
function imageURL(value){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)throw Error('Product image must use HTTPS');return u.href;}
function fit(w,h,box){const scale=Math.min(box.width/w,box.height/h);return{x:box.x+(box.width-w*scale)/2,y:box.y+box.height-h*scale,width:w*scale,height:h*scale};}
async function productImage(url){const r=await fetch(imageURL(url),{credentials:'omit',signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error('Image could not load');const b=await r.blob();if(b.size>15*1024*1024||!/^image\/(png|jpeg|webp|gif|avif)$/.test(b.type))throw Error('Unsupported product image');const im=await createImageBitmap(b);if(im.width*im.height>40000000){im.close();throw Error('Image dimensions are too large');}return im;}
function lines(ctx,text,x,y,width,lineHeight,maxLines){const words=String(text).split(/\s+/);let line='',n=0;for(const word of words){if(ctx.measureText(line+' '+word).width>width&&line){ctx.fillText(line,x,y+n++*lineHeight);line='';if(n>=maxLines)return;}line+=(line?' ':'')+word;}if(n<maxLines)ctx.fillText(line,x,y+n*lineHeight);}
async function render(board,{checkpoint=async()=>{},loadImage=productImage,canvasFactory=()=>document.createElement('canvas')}={}){
 const plan=layout(board),c=canvasFactory();c.width=plan.width;c.height=plan.height;const ctx=c.getContext('2d');if(!ctx)throw Error('Canvas renderer unavailable');
 const dark=['menu','clothing'].includes(plan.display),bg=ctx.createLinearGradient(0,0,0,c.height);bg.addColorStop(0,dark?'#202628':'#a6a9a8');bg.addColorStop(1,dark?'#090d0f':'#e0e2df');ctx.fillStyle=bg;ctx.fillRect(0,0,c.width,c.height);
 ctx.fillStyle=dark?'#f4f5f1':'#202729';ctx.font='600 32px system-ui';ctx.fillText(plan.category,70,55,c.width-140);
 if(plan.display==='pegboard'){ctx.fillStyle='#535b5d';for(let y=100;y<c.height-40;y+=24)for(let x=72;x<c.width-60;x+=24){ctx.beginPath();ctx.arc(x,y,2,0,Math.PI*2);ctx.fill();}}
 const zones=[],warnings=[];
 for(const cell of plan.cells){await checkpoint();let im;try{im=await loadImage(cell.product.image_url);}catch(e){throw Error('Product image failed: '+cell.product.name+' ('+cell.product.id+'). '+e.message);}
  try{for(const box of cell.images){const f=fit(im.width,im.height,box);ctx.save();ctx.shadowColor='rgba(0,0,0,.35)';ctx.shadowBlur=12;ctx.shadowOffsetY=5;ctx.drawImage(im,f.x,f.y,f.width,f.height);ctx.restore();} }finally{im.close?.();}
  const t=cell.tag;if(plan.display!=='menu'){const g=ctx.createLinearGradient(0,t.y-8,0,t.y+8);g.addColorStop(0,'#f1f2ed');g.addColorStop(.4,'#8e9593');g.addColorStop(1,'#343b3d');ctx.fillStyle=g;ctx.fillRect(cell.x,t.y-8,cell.width,17);}
  ctx.fillStyle='#faf7e9';ctx.fillRect(t.x,t.y+10,t.width,t.height-10);ctx.fillStyle='#172022';ctx.font='600 18px system-ui';lines(ctx,cell.product.name,t.x+6,t.y+29,t.width-12,18,1);ctx.font='700 20px system-ui';const price=cell.product.price==null?'Price not supplied':Number.isFinite(Number(cell.product.price))?'$'+Number(cell.product.price).toFixed(2):String(cell.product.price);ctx.fillText(price,t.x+6,t.y+49,t.width-12);
  zones.push({productId:cell.product.id,box:{x:cell.x/c.width,y:cell.y/c.height,width:cell.width/c.width,height:cell.height/c.height},tag:{x:t.x/c.width,y:t.y/c.height,width:t.width/c.width,height:t.height/c.height},name:cell.product.name,price:cell.product.price,facings:cell.facings});
 }
 await checkpoint();const blob=await new Promise(resolve=>c.toBlob(resolve,'image/png'));if(!blob)throw Error('Could not export display');return {blob,width:c.width,height:c.height,zones,warnings,renderer:'exact-product-compositor-v1',style:'Composited product display'};
}
const api={layout,imageURL,fit,render,productImage};if(typeof module!=='undefined')module.exports=api;G.StudioRenderCore=api;
})(typeof window!=='undefined'?window:globalThis);
