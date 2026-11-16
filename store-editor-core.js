(function(G){'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
const options={
 menuitems:['Choose menu'],
 cards:['Choose product display'],
 checkout:['Choose checkout','Size and position','Lighting and shadows','Text size'],
 storepage:['Choose page','Colors','Size and position','Lighting and shadows','Text size'],
 basket:['Choose basket','Size and position','Lighting and shadows','Text size'],
 shelves:['Choose shelf','Shelf layout','Size and position','Shelf appearance','Products on shelf','Product sizing','Product spacing','Product alignment','Pricing','Signs and headers','Lighting and shadows','Images and renders','Movement and browsing','Tap actions'],
 entrances:['Choose entrance','Size and position','Lighting and shadows','Images and renders','Signs and headers'],
 aisles:['Choose aisle','Size and position','Lighting and shadows','Images and renders','Movement and browsing'],
 boards:['Choose menu board','Size and position','Lighting and shadows','Images and renders','Signs and headers'],
 stations:['Choose department display','Size and position','Lighting and shadows','Images and renders','Signs and headers'],
 produce:['Choose produce display','Size and position','Lighting and shadows','Images and renders','Signs and headers'],
 products:['Choose product','Product sizing','Pricing'],
};
const defaults={x:0,y:0,width:100,height:100,angle:0,brightness:100,contrast:100,saturation:100,opacity:100,shadow:0,shadowX:0,shadowY:0,shadowColor:'#000000',tint:'#ffffff',tintOpacity:0,fit:'contain',cropX:50,cropY:50,zoom:1,scroll:0,scrollSpeed:1,products:[],signs:[]};
function effectiveProducts(original,edit={}){const byId=new Map();for(const p of original)byId.set(p.id,p);for(const p of edit.products||[])if(!byId.has(p.id))byId.set(p.id,{...p,image_url:p.url});const removed=new Set(edit.removedProducts||[]),overrides=edit.productOverrides||{},rows=[...byId.values()].filter(p=>!removed.has(p.id)).map(p=>({...p,...overrides[p.id]}));const rank=new Map((edit.productOrder||[]).map((id,i)=>[id,i]));return rows.sort((a,b)=>(rank.get(a.id)??1e9)-(rank.get(b.id)??1e9));}
function identity(a){return a.table+':'+[a.row.id||'',a.row.aisle||a.row.station||a.row.zone||'',a.row.render_no||a.row.panel_no||a.row.image_order||'',a.url].join('|');}
function childSelection(state,level,value){const n={...state};if(level==='feature'){n.feature=value;n.option='';n.asset='';}else if(level==='asset'){n.asset=value;n.option='';}else n.option=value;return n;}
function shelfCategories(rows,supported,{dynamic=false,breadRolls=false}={}){const available=rows.filter(r=>Number(r.product_count)>0).map(r=>r.category);if(breadRolls)available.push('Bread & Rolls');return [...new Set(available)].filter(name=>name&&(dynamic||supported.includes(name)));}
function imageURL(base,path){if(!path)return '';if(/^https:\/\//.test(path))return path;return base+'/storage/v1/object/public/menu-images/'+path.replace(/^\/?menu-images\//,'').replace(/^\//,'').split('/').map(encodeURIComponent).join('/');}
function style(s){return {left:s.x+'%',top:s.y+'%',width:s.width+'%',height:s.height+'%',objectFit:s.fit,objectPosition:s.cropX+'% '+s.cropY+'%',opacity:s.opacity/100,transform:`translateX(${-s.scroll}%) rotate(${s.angle}deg) scale(${s.zoom})`,filter:`brightness(${s.brightness}%) contrast(${s.contrast}%) saturate(${s.saturation}%) drop-shadow(${s.shadowX}px ${s.shadowY}px ${s.shadow}px ${s.shadowColor})`};}
const api={shelfCategories,effectiveProducts,clone,options,defaults,identity,childSelection,imageURL,style};if(typeof module!=='undefined')module.exports=api;G.StoreEditorCore=api;
})(typeof window==='undefined'?globalThis:window);
