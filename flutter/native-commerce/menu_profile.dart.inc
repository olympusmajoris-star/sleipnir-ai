  Map<String,Map<String,dynamic>> _menuPublished = {};
  Map<String,String> _menuCatalogPhotos = {};
  int _menuEpoch = 0;
  String _menuStore = '';

  Future<void> _readMenuDesigns() async {
    final store = __STORE__;
    final epoch = ++_menuEpoch;
    if (_menuStore != store) {_menuPublished={};_menuCatalogPhotos={};}
    _menuStore=store;
    if(store.isEmpty) return;
    try {
      final result = await SupaFlow.client.rpc('studio_menu_designs',params:{'p_store_id':store},get:true);
      if(result is! List || !mounted || epoch!=_menuEpoch || store!=__STORE__)return;
      final all=<String,Map<String,dynamic>>{}, ids=<String>[];
      for(final row in result){
        if(row is! Map || row['store_id']!=store || row['settings'] is! Map)continue;
        final kind=row['target_kind'], key=row['target_key'];
        if(kind is! String || key is! String || !{'product','page','menu'}.contains(kind))continue;
        if(kind=='product' && row['product_id']!=key)continue;
        final settings=Map<String,dynamic>.from(row['settings']);
        all['$kind/$key']=settings;
        if(kind=='product' && settings['mode']=='catalog')ids.add(key);
      }
      final photos=<String,String>{};
      for(var off=0;off<ids.length;off+=50){
        final batch=ids.skip(off).take(50).toList();
        final rows=await SupaFlow.client.from('products').select('id,image_url').eq('store_id',store).inFilter('id',batch);
        if(!mounted || epoch!=_menuEpoch || store!=__STORE__)return;
        for(final r in rows){final url=r['image_url'];if(url is String)photos[r['id'].toString()]=url;}
      }
      if(mounted && epoch==_menuEpoch && store==__STORE__)setState((){_menuPublished=all;_menuCatalogPhotos=photos;__RESET_LAYOUT__});
    }catch(_){ /* A disconnected shopper keeps the current native menu. */ }
  }

  Map<String,dynamic> _menuDesign(String kind,String key){
    final id='$kind/$key';
    __DRAFT_OVERRIDE__
    return _menuPublished[id]??const <String,dynamic>{};
  }
  Map<String,dynamic> _menuPage(String key)=>{..._menuDesign('menu','menu'),..._menuDesign('page',key)};
  String _menuText(String key,String field,String fallback){final k=_menuPage(key)[field];return k is String && k.isNotEmpty?k:fallback;}
  Color _menuColor(String key,String field,Color fallback){
    final v=_menuPage(key)[field];
    return v is String && RegExp(r'^#[0-9a-fA-F]{6}$').hasMatch(v)?Color(0xff000000|int.parse(v.substring(1),radix:16)):fallback;
  }
  String? _menuURL(dynamic value){
    if(value is! String || value.isEmpty)return null;
    final u=Uri.tryParse(value);return u!=null&&u.scheme=='https'&&u.host.isNotEmpty&&u.userInfo.isEmpty?value:null;
  }
  String? _menuPhotoURL(String id,String? original){
    final d=_menuDesign('product',id);
    if(d['mode']=='hidden')return null;
    if(d['mode']=='custom')return _menuURL(d['photo_url']);
    if(d['mode']=='catalog')return _menuURL(d['catalogPreview']??_menuCatalogPhotos[id]);
    return original==null||original.isEmpty?null:original;
  }
  double _menuNumber(dynamic v,double fallback,double low,double high)=>v is num&&v.isFinite?v.toDouble().clamp(low,high).toDouble():fallback;
  Widget _menuPhoto(String id,Image image){
    final d=_menuDesign('product',id);if(d.isEmpty)return image;
    final x=_menuNumber(d['x'],0,-1,1),y=_menuNumber(d['y'],0,-1,1),z=_menuNumber(d['zoom'],1,.5,4);
    final align=Alignment(x,y);
    final framed=Image(image:image.image,width:image.width,height:image.height,
        fit:d['fit']=='contain'?BoxFit.contain:d['fit']=='cover'?BoxFit.cover:image.fit,
        alignment:align,errorBuilder:image.errorBuilder,semanticLabel:image.semanticLabel,
        excludeFromSemantics:image.excludeFromSemantics,filterQuality:image.filterQuality);
    if(z==1)return framed;
    return SizedBox(width:image.width,height:image.height,child:ClipRect(child:Transform.scale(scale:z,alignment:align,child:framed)));
  }
  Widget _menuPaper(String key,Widget child){
    final d=_menuPage(key), url=_menuURL(_menuPage(key)['background_url']);
    if(url==null && d['background_color']==null)return child;
    final align=Alignment(_menuNumber(d['x'],0,-1,1),_menuNumber(d['y'],0,-1,1));
    final zoom=_menuNumber(d['zoom'],1,.5,4);
    return Stack(fit:StackFit.passthrough,children:[
      Positioned.fill(child:ColoredBox(color:_menuColor(key,'background_color',Colors.transparent),child:url==null?null:ClipRect(child:Transform.scale(scale:zoom,alignment:align,child:Image.network(url,fit:d['fit']=='contain'?BoxFit.contain:BoxFit.cover,alignment:align,errorBuilder:(_,__,___)=>const SizedBox.shrink()))))),
      child
    ]);
  }
