(function(G){'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
const options={
 shelves:['Choose shelf','Size and position','Shelf appearance','Products on shelf','Product sizing','Product spacing','Product alignment','Pricing','Signs and headers','Lighting and shadows','Images and renders','Movement and browsing','Tap actions'],
 entrances:['Choose entrance','Size and position','Lighting and shadows','Images and renders','Signs and headers'],
 aisles:['Choose aisle','Size and position','Lighting and shadows','Images and renders','Movement and browsing'],
 boards:['Choose menu board','Size and position','Lighting and shadows','Images and renders','Signs and headers'],
 stations:['Choose department display','Size and position','Lighting and shadows','Images and renders','Signs and headers'],
 produce:['Choose produce display','Size and position','Lighting and shadows','Images and renders','Signs and headers'],
 products:['Choose product','Product sizing','Pricing'],
};
const defaults={x:0,y:0,width:100,height:100,angle:0,brightness:100,contrast:100,saturation:100,opacity:100,shadow:0,shadowX:0,shadowY:0,shadowColor:'#000000',tint:'#ffffff',tintOpacity:0,fit:'contain',cropX:50,cropY:50,zoom:1,scroll:0,scrollSpeed:1,products:[],signs:[]};
function identity(a){return a.table+':'+[a.row.id||'',a.row.aisle||a.row.station||a.row.zone||'',a.row.render_no||a.row.panel_no||a.row.image_order||'',a.url].join('|');}
function childSelection(state,level,value){const n={...state};if(level==='feature'){n.feature=value;n.option='';n.asset='';}else if(level==='asset'){n.asset=value;n.option='';}else n.option=value;return n;}
function imageURL(base,path){if(!path)return '';if(/^https:\/\//.test(path))return path;return base+'/storage/v1/object/public/menu-images/'+path.replace(/^\/?menu-images\//,'').replace(/^\//,'').split('/').map(encodeURIComponent).join('/');}
function style(s){return {left:s.x+'%',top:s.y+'%',width:s.width+'%',height:s.height+'%',objectFit:s.fit,objectPosition:s.cropX+'% '+s.cropY+'%',opacity:s.opacity/100,transform:`translateX(${-s.scroll}%) rotate(${s.angle}deg) scale(${s.zoom})`,filter:`brightness(${s.brightness}%) contrast(${s.contrast}%) saturate(${s.saturation}%) drop-shadow(${s.shadowX}px ${s.shadowY}px ${s.shadow}px ${s.shadowColor})`};}
const api={clone,options,defaults,identity,childSelection,imageURL,style};if(typeof module!=='undefined')module.exports=api;G.StoreEditorCore=api;
})(typeof window==='undefined'?globalThis:window);
