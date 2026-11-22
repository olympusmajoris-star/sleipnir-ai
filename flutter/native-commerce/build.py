"""Build verified private app widgets for the read-only shopping surface inside Studio."""
from pathlib import Path
import argparse,hashlib,json,shutil,re,subprocess,os
from menu import integrate as menu_integrate
D=Path(__file__).resolve().parent
NAMES={'retail':'RetailStore','fast_food':'McDonaldsComboPanel','fast_casual':'FastCasualMenuBoard','sit_down':'SitDownRestaurantMenu'}
def replace_one(s,start,extra):
 if s.count(start)!=1:raise ValueError('Original widget changed at '+start)
 return s.replace(start,start+extra)
def surround(s,pattern,key=None):
 for m in reversed(list(re.finditer(pattern,s))):
  pos=s.index('Image.network(',m.start());begin=s.index('(',pos);depth=1;end=begin+1
  while depth:
   depth+=int(s[end]=='(')-int(s[end]==')');end+=1
  s=s[:pos]+'scaleSku('+(key or ("(hero?.imageUrl == null ? '' : hero!.id)" if 'heroImageUrl' in m[0] else ('item.productId' if 'item.productId' in pattern else 'item.id')))+', '+s[pos:end]+')'+s[end:]
 return s
def instrument(s,k):
 s="import '/bridge.dart';\n"+s
 if k in ('fast_casual','sit_down'):
  cls='_FcItem' if k=='fast_casual' else '_SdItem';s=replace_one(s,'Future<void> _openItem('+cls+' item) async {',"\n    if(chooseSku(item.id,scalable:item.imageUrl?.isNotEmpty==true)) return;")
  s=surround(s,r'Image\.network\(\s*item.imageUrl!')
  anchor='_all = items;' if k=='fast_casual' else '_sections\n          ..clear()'
  reachable='visible' if k=='fast_casual' else 'items'
  s=s.replace(anchor,'nativeCatalog({for(final i in '+reachable+')i.id:()=>_openItem(i)});\n        '+anchor)
  if k=='fast_casual':s=surround(s,r'Image\.network\(\s*heroImageUrl')
 elif k=='retail':
  s=replace_one(s,'Future<void> _openDetails(_RetailItem item) async {','\n    if(chooseSku(item.id,scalable:item.imageUrl.isNotEmpty)) return;')
  s=s.replace('_products = items;', '_products = items;\n        nativeCatalog({for(final i in items)i.id:()=>_openDetails(i)});')
  s=s.replace('_image(item.imageUrl)','scaleSku(item.id, _image(item.imageUrl))')
 else:
  s=replace_one(s,'Future<void> openItemPopup(MenuItem item) async {','\n    final editing=chooseSku(item.productId, scalable:item.imageUrl.isNotEmpty);\n    if(editing && item.imageUrl.isEmpty) return;')
  s=surround(s,r'Image\.network\(\s*popupImage','productForSize(popupSize??"sand")')
  s=s.replace('return PanelData(\n        families: slice,', 'reportNativePanel(const [],slice);\n      return PanelData(\n        families: slice,')
  s=s.replace('final chunk = sliceForPanel(items);','final chunk = sliceForPanel(items);\n    reportNativePanel(chunk,const []);')
  anchor="      return const PanelData(families: [], rows: [], title: '');\n    }\n    imageMode = false;"
  s=s.replace(anchor, """      final visibleItems=<MenuItem>[], visibleFamilies=<BoardFamily>[];
      for(final spec in pageHalves){
        for(var i=0;i<spec.slots.length;i++){
          final slot=spec.slots[i];if(slot.x1<=slot.x0 || slot.y1<=slot.y0)continue;
          if(spec.mode=='combos'){
            final families=familiesFor(spec);final index=spec.comboOffset+i;
            if(index>=0 && index<families.length)visibleFamilies.add(families[index]);
          }else if(spec.mode=='items'){
            final item=itemsByName[normName(slot.name)];if(item!=null)visibleItems.add(item);
          }else if(slot.names.isNotEmpty){
            for(final name in slot.names){final item=itemsByName[normName(name)];if(item!=null)visibleItems.add(item);}
          }else{
            visibleItems.addAll(itemsByCategory[slot.category]??<MenuItem>[]);
          }
        }
      }
      reportNativePanel(visibleItems,visibleFamilies);
"""+anchor)
  s=s.replace('  Future<PanelData> loadPanel() async {', '''  void reportNativePanel(Iterable<MenuItem> menu,Iterable<BoardFamily> families){
    final choices=<String,VoidCallback>{for(final i in menu)i.productId:()=>openItemPopup(i)};
    for(final family in families){for(final r in family.rows){for(final size in {'sand':r.sandwichProductId,'sm':r.smallProductId,'med':r.mediumProductId,'lg':r.largeProductId}.entries){if(skuPattern.hasMatch(size.value))choices[size.value]=(){openComboPopup(family,r);setState(()=>popupSize=size.key);chooseSku(size.value,scalable:r.imageUrl.isNotEmpty);};}}}
    nativeCatalog(choices);
  }
  Future<PanelData> loadPanel() async {''')
  s=replace_one(s,'void addToOrder() {\n    final size = popupSize;\n    if (size == null) return;', '\n    if(chooseSku(productForSize(size), scalable:popupImage.isNotEmpty)){return;}')
  s=s.replace("'ADD TO ORDER'", "nativeEditing.value ? 'SELECT PRODUCT' : 'ADD TO ORDER'")
 return s
def main():
 ap=argparse.ArgumentParser();[ap.add_argument('--'+k,required=True,type=Path) for k in ('originals','template','work','output','flutter')];ap.add_argument('--shopper-widgets',type=Path);a=ap.parse_args()
 inventory={i['widgets'][0]:i['sha256'] for i in json.loads((D.parent.parent/'native-source-inventory.json').read_text())['sources']}
 if not a.work.exists():shutil.copytree(a.template,a.work)
 # The archive stores generated imports separately from custom widget bodies.
 def exported(relative):
  command=['unzip','-p',str(a.originals/'SleipnirProject.zip'),relative]
  result=subprocess.run(command,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
  if not result.stdout: raise ValueError('Missing exported dependency '+relative)
  return result.stdout.decode()
 widgets=a.work/'lib/custom_code/widgets'
 bar=exported('custom-widgets/id-hrr0y/widget-code.dart')
 (widgets/'cart_mini_bar.dart').write_text("import 'package:flutter/material.dart';\nimport '/flutter_flow/flutter_flow_util.dart';\n"+bar)
 (widgets/'index.dart').write_text("export 'cart_mini_bar.dart';\n")
 backgrounds=exported('custom-functions/id-4eskh/function-code.dart')
 (a.work/'lib/flutter_flow/custom_functions.dart').write_text('List<String> norseBgUrls() {'+backgrounds+'}\n')
 baseline={}
 staged={}
 private={r['widget']:r for r in json.loads((a.shopper_widgets/'manifest.json').read_text())} if a.shopper_widgets else {}
 for k,n in NAMES.items():
  f=a.originals/(n+'.dart');digest=hashlib.sha256(f.read_bytes()).hexdigest();assert digest==inventory[n];baseline[k]=digest
  path=a.work/'lib/custom_code/widgets'/(k+'.dart')
  if a.shopper_widgets:
   uploaded=a.shopper_widgets/(n+'.dart')
   if hashlib.sha256(uploaded.read_bytes()).hexdigest()!=private[n]['sha256'] or private[n]['baseline_sha256']!=digest:raise ValueError('Shopper source digest mismatch')
   shutil.copyfile(uploaded,path)
  else:path.write_text(menu_integrate(instrument(f.read_text(),k),k,True))
  staged[k]=hashlib.sha256(path.read_bytes()).hexdigest()
 for k in ('main.dart','bridge.dart'):shutil.copyfile(D/k,a.work/'lib'/k)
 if a.shopper_widgets:
  harness=a.work/'lib/main.dart'
  harness.write_text(harness.read_text().replace("'stores','products'","'studio_grocery_product_scales','stores','products'").replace("'type':'ready','renderer'","'type':'ready','view':'shopper','renderer'"))
 for k in ('frame.js','scope.js','index.html'):shutil.copyfile(D/k,a.work/'web'/k)
 env={**os.environ,'CI':'true','FLUTTER_SUPPRESS_ANALYTICS':'true'}
 for args in [['pub','get','--offline'],['build','web','--release','--no-pub','--no-wasm-dry-run','--csp','--no-web-resources-cdn','--pwa-strategy=none']]:
  subprocess.run([str(a.flutter.resolve())]+args,cwd=a.work,env=env,check=True)
 built=a.work/'build/web';a.output.mkdir(exist_ok=True,parents=True)
 for fn in ['index.html','flutter_bootstrap.js','frame.js','scope.js','main.dart.js']:
  shutil.copyfile(built/fn,a.output/fn)
 for part in ['canvaskit/canvaskit.js','canvaskit/canvaskit.wasm']:
  dest=a.output/part;dest.parent.mkdir(exist_ok=True);shutil.copyfile(built/part,dest)
 shutil.copytree(built/'assets',a.output/'assets',dirs_exist_ok=True)
 fonts=a.flutter.resolve().parent/'cache/artifacts/material_fonts'
 faces=[]
 for name,weight,style in [('Regular',400,'normal'),('Medium',500,'normal'),('Bold',700,'normal'),('Italic',400,'italic')]:
  filename='Roboto-'+name+'.ttf'
  shutil.copyfile(fonts/filename,a.output/'assets/fonts'/filename)
  faces.append({'asset':'fonts/'+filename,'weight':weight,'style':style})
 font_manifest=a.output/'assets/FontManifest.json'
 assigned=[row for row in json.loads(font_manifest.read_text()) if row['family']!='Roboto']
 font_manifest.write_text(json.dumps(assigned+[{'family':'Roboto','fonts':faces}],separators=(',',':')))
 with (a.output/'assets/NOTICES').open('ab') as f:f.write(b'\n\nRoboto font family\n'+(fonts/'Roboto_LICENSE.txt').read_bytes())
 artifact=hashlib.sha256((a.output/'main.dart.js').read_bytes()).hexdigest()
 bootstrap=a.output/'flutter_bootstrap.js'
 original=bootstrap.read_text()
 anchor='"mainJsPath":"main.dart.js"'
 if original.count(anchor)!=1:raise ValueError('Flutter entrypoint configuration changed')
 bootstrap.write_text(original.replace(anchor,'"mainJsPath":"main.dart.js?v='+artifact+'"'))
 bootstrap_sha=hashlib.sha256(bootstrap.read_bytes()).hexdigest()
 (a.output/'release.json').write_text(json.dumps({'sources':staged if a.shopper_widgets else baseline,**({'baselineSources':baseline,'view':'shopper'} if a.shopper_widgets else {'studioSources':staged}),'artifactSHA256':artifact,'bootstrapSHA256':bootstrap_sha},indent=2))
if __name__=='__main__':main()
