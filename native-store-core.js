/* Original StoreEntrances: a separate test file, never a live-table update. */
(function(G){'use strict';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const TARGET='35ef70d0-3d20-4599-96a3-648ee3c7c340';
function box(b){return b&&['x','y','width','height'].every(k=>typeof b[k]==='number'&&Number.isFinite(b[k]))&&b.x>=0&&b.y>=0&&b.width>0&&b.height>0&&b.x+b.width<=1.00000001&&b.y+b.height<=1.00000001;}
function validate(d,{frozen=true}={}){
 if(!d||d.version!==1||!UUID.test(d.storeId||''))throw Error('Choose the exact store.');
 if(d.storeId.toLowerCase()===TARGET)throw Error('Target uses GroceryAisle and needs its own adapter. Its approved photo plan is preserved.');
 if(typeof d.aisle!=='string'||!d.aisle.trim()||d.aisle.length>160||!Number.isSafeInteger(d.renderNo)||d.renderNo<0)throw Error('Choose an existing aisle and display number.');
 if(!Number.isSafeInteger(d.width)||!Number.isSafeInteger(d.height)||d.width<1||d.height<1||d.width*d.height>40000000)throw Error('Invalid display size.');
 const url=new URL(d.url);if(url.protocol!=='https:'||url.username||url.password)throw Error('Display needs a secure image URL.');
 if(frozen&&!/^https:\/\/afnihsdxtisneuyehatw\.supabase\.co\/storage\/v1\/object\/public\/studio-published-media\/sha256\/[a-f0-9]{64}\.(png|jpg|webp)$/.test(d.url))throw Error('Preserve the exact display image before exporting.');
 if(!Array.isArray(d.zones)||!d.zones.length||d.zones.length>144)throw Error('Display needs 1–144 product areas.');
 const ids=new Set();for(const z of d.zones){if(!UUID.test(z.productId||'')||ids.has(z.productId)||typeof z.name!=='string'||!z.name||typeof z.price!=='number'||!Number.isFinite(z.price)||z.price<0||!box(z.box))throw Error('Invalid or duplicate product, price or tap area.');ids.add(z.productId);}
 for(let i=0;i<d.zones.length;i++)for(let j=i+1;j<d.zones.length;j++){const a=d.zones[i].box,b=d.zones[j].box;if(Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)>1e-8&&Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)>1e-8)throw Error('Product tap areas overlap.');}
 return d;
}
function checkProducts(d,rows){validate(d,{frozen:false});const byId=new Map(rows.filter(p=>p.store_id===d.storeId).map(p=>[p.id,p]));for(const z of d.zones){const p=byId.get(z.productId);if(!p||p.name!==z.name||p.price==null||Number(p.price)!==z.price)throw Error('A product is missing or its name/price changed. Render this display again.');}return true;}
function patch(source,helper,document=null){
 if(!source.includes('class StoreEntrances extends StatefulWidget')||source.includes('ASGARD_STORE_TEST_V1'))throw Error('Choose the complete original StoreEntrances file.');
 if(document)validate(document);
 function replace(a,b){if(source.split(a).length!==2)throw Error('StoreEntrances changed near '+a.slice(0,65)+'. No partial file was created.');source=source.replace(a,b);}
 replace("import 'dart:async';","import 'dart:async';\nimport 'dart:convert';");
 replace('_SERender(this.no, this.url, this.aspect);','_SERender(this.no, this.url, this.aspect, {this.studio = false});\n  final bool studio;');
 replace('    this.img,\n  );','    this.img, {this.studioBox}\n  );\n  final Rect? studioBox;');
 replace('      _renders = renders;', '      await _applyStudioDisplay(renders);\n      _renders = renders;');
 replace('  Widget _page(_SERender r, double w, double h) {','  Widget _page(_SERender r, double w, double h) {\n    if (r.studio) return _studioDisplay(r, w, h);');
 replace('  double _pageW(_SERender r) => _walkH * r.aspect;',helper+'\n\n  double _pageW(_SERender r) => _walkH * r.aspect;');
 replace('                  widget.aisle,',"                  'STORE TEST • ' + widget.aisle,");
 replace('            if (_results.isNotEmpty || _searching)',"            Positioned(left: 8, right: 8, bottom: 4 + botPad, child: IgnorePointer(child: Text('STORE TEST • uses your shared cart', textAlign: TextAlign.center, style: TextStyle(color: Colors.cyanAccent, fontSize: 12)))),\n            if (_results.isNotEmpty || _searching)");
 source=source.replace(/\bStoreEntrances\b/g,'StoreEntrancesStudioTest').replace(/\b_StoreEntrancesState\b/g,'_StoreEntrancesStudioTestState');
 source=source.replace('// Replace the existing StoreEntrancesStudioTest custom widget with this complete file.','// Add as a separate test widget. Keep the working StoreEntrances unchanged.');
 const json=JSON.stringify(document),encoded=typeof Buffer!=='undefined'?Buffer.from(json).toString('base64'):btoa(String.fromCharCode(...new TextEncoder().encode(json)));
 return source+"\n// ASGARD_STORE_TEST_V1: presentation test; no live display writes.\nfinal dynamic _seStudioDocument = jsonDecode(utf8.decode(base64Decode('"+encoded+"')));\n";
}
const api={validate,checkProducts,patch,box};if(typeof module!=='undefined')module.exports=api;G.NativeStoreCore=api;
})(typeof window!=='undefined'?window:globalThis);
