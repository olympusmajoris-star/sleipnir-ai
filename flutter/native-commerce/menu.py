"""Add versioned menu design reads to the existing audited Flutter widget sources."""
from pathlib import Path
import re
D=Path(__file__).parent
METHODS=(D/'menu_profile.dart.inc').read_text()
def one(source,old,new):
    if source.count(old)!=1:raise ValueError(f'Original menu changed at {old[:110]} ({source.count(old)} matches)')
    return source.replace(old,new)
def picture(source,arg,sku):
    expr=re.compile(r'Image\.network\(\s*'+arg+r'\s*,')
    for m in reversed(list(expr.finditer(source))):
        start=m.start();end=source.index('(',start)+1;depth=1
        while depth:
            depth+=int(source[end]=='(')-int(source[end]==')');end+=1
        source=source[:start]+'_menuPhoto('+sku+', '+source[start:end]+')'+source[end:]
    return source
def integrate(s,k,studio):
    if k=='retail':return s
    store='activeStoreId' if k=='fast_food' else 'widget.storeId.trim()'
    reset='_lastW=-1;' if k=='sit_down' else ''
    methods=METHODS.replace('__STORE__',store).replace('__RESET_LAYOUT__',reset).replace('__DRAFT_OVERRIDE__',"if(nativeMenuDrafts.value.containsKey(id))return nativeMenuDrafts.value[id]!;" if studio else '')
    anchor='  Future<PanelData> loadPanel() async {' if k=='fast_food' else '  Future<void> _load() async {'
    s=one(s,anchor,methods+'\n'+anchor+'\n    _readMenuDesigns();')
    if studio:
        init='    super.initState();';end='  void dispose() {'
        s=one(s,init,init+'\n    nativeMenuDrafts.addListener(_menuChanged);')
        s=one(s,end,'  void _menuChanged(){if(mounted)setState((){'+reset+'});}\n\n'+end+'\n    nativeMenuDrafts.removeListener(_menuChanged);')
    if k in ('fast_casual','sit_down'):
        for name in ['item','it','x']:
            s=s.replace(name+'.imageUrl != null',"_menuPhotoURL("+name+'.id,'+name+'.imageUrl) != null')
        s=picture(s,r'item\.imageUrl!', 'item.id')
        s=s.replace('item.imageUrl!,','_menuPhotoURL(item.id,item.imageUrl)!,')
        s=s.replace('item.imageUrl?.isNotEmpty==true','_menuPhotoURL(item.id,item.imageUrl)!=null')
        if k=='fast_casual':
            s=one(s,'final heroImageUrl = hero?.imageUrl ?? first.imageUrl;',"final heroImageUrl = hero==null?first.imageUrl:_menuPhotoURL(hero.id,hero.imageUrl);")
            s=picture(s,'heroImageUrl',"hero?.id??''")
    else:
        s=one(s,"if (item != null) return item.imageUrl;\n    return popupRow?.imageUrl ?? '';", "final id=productForSize(popupSize??'sand');\n    return _menuPhotoURL(id,item?.imageUrl??popupRow?.imageUrl)??'';")
        s=picture(s,'popupImage',"productForSize(popupSize??'sand')")
        s=s.replace('if(editing && item.imageUrl.isEmpty) return;', 'if(editing && _menuPhotoURL(item.productId,item.imageUrl)==null) return;')
        # A shared category header and baked board are independent of any single SKU.
        for row in ('mainRow','row'):
            s=picture(s,row+r'\.imageUrl',row+'.sandwichProductId')
            s=s.replace(row+'.imageUrl.isEmpty',"(_menuPhotoURL("+row+'.sandwichProductId,'+row+'.imageUrl)??\'\').isEmpty')
            s=re.sub(r'(Image\.network\(\s*)'+row+r'\.imageUrl,',lambda m:m[1]+'_menuPhotoURL('+row+'.sandwichProductId,'+row+'.imageUrl)!,',s)
    from menu_pages import integrate as page_integration
    return page_integration(s,k,studio)
