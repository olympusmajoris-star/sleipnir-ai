"""Bind original menu pages and native viewport pagination to editable source surfaces."""
import re
def single(s,old,new):
    n=s.count(old)
    if n!=1:raise ValueError(f'Menu page changed at {old[:80]} ({n})')
    return s.replace(old,new)
def function_block(s,start,stop,transform):
    a=s.index(start);b=s.index(stop,a+len(start));return s[:a]+transform(s[a:b])+s[b:]
def surround_call(s,old,prefix):
    a=s.index(old);b=s.index('(',a)+1;depth=1
    while depth:depth+=int(s[b]=='(')-int(s[b]==')');b+=1
    return s[:a]+prefix+s[a:b]+')'+s[b:]
support="['background_url','background_color','heading_color','ink_color','title','body','fit','x','y','zoom']"
def integrate(s,k,studio):
    if k=='retail':return s
    if studio and k!='fast_food':
        coll='_panels' if k=='fast_casual' else '_pages'
        s=single(s,'    nativeMenuDrafts.addListener(_menuChanged);','''    nativeMenuDrafts.addListener(_menuChanged);
    nativeMenuMove=_moveMenuPage;''')
        s=single(s,'  void _menuChanged()',"""  void _moveMenuPage(int delta){if(!mounted||!_pc.hasClients||COLL.isEmpty)return;final pos=(_page+delta).clamp(0,COLL.length-1).toInt();_pc.animateToPage(pos,duration:const Duration(milliseconds:300),curve:Curves.easeOut);}
  void _menuChanged()""".replace('COLL',coll))
        s=single(s,'    nativeMenuDrafts.removeListener(_menuChanged);','    if(nativeMenuMove==_moveMenuPage)nativeMenuMove=null;\n    nativeMenuDrafts.removeListener(_menuChanged);')
    if k=='fast_casual':
        s=single(s,'final first = panel.sections.first;','final first = panel.sections.first;\n    final menuKey=\'category:\'+first.title;')
        s=function_block(s,'  Widget _panelCard(','  List<Widget> _panelChildren(',lambda b:surround_call(b.replace('first.title.toUpperCase()',"_menuText(menuKey,'title',first.title.toUpperCase())").replace("color: Colors.white,\n                                  fontSize: 20,","color: _menuColor(menuKey,'heading_color',Colors.white),\n                                  fontSize: 20,").replace("color: _fcInk,\n                          fontSize: 21,","color: _menuColor(menuKey,'heading_color',_fcInk),\n                          fontSize: 21,").replace('style: const TextStyle(','style: TextStyle('),'ListView(\n                  primary:',"_menuPaper(menuKey,"))
        s=single(s,'    final out = <Widget>[];',"""    final out = <Widget>[];
    final menuKey='category:'+panel.sections.first.title;
    final intro=_menuText(menuKey,'body','');
    if(intro.isNotEmpty)out.add(Padding(padding:const EdgeInsets.only(bottom:8),child:Text(intro,style:TextStyle(color:_menuColor(menuKey,'ink_color',_fcInk)))));""")
        s=s.replace('out.add(_row(item));','out.add(_row(item,menuKey));').replace('Widget _row(_FcItem item) {','Widget _row(_FcItem item,String menuKey) {')
        s=function_block(s,'  Widget _row(_FcItem','  // -------------------------------------------------------------- search',lambda b:b.replace('style: const TextStyle(','style: TextStyle(').replace('color: _fcInk,',"color: _menuColor(menuKey,'ink_color',_fcInk),").replace('color: _fcMuted,',"color: _menuColor(menuKey,'ink_color',_fcMuted),"))
        if studio:s=single(s,'  Widget _boardArea(double w, double h) {',"""  Widget _boardArea(double w, double h) {
    if(!_loading && _panels.isNotEmpty && _page>=0 && _page<_panels.length){
      final p=_panels[_page];nativeMenuReport(key:'category:'+p.sections.first.title,label:p.sections.first.title,page:_page+1,pages:_panels.length,photoSurface:'separate',supports:SUP,products:p.sections.expand((s)=>s.items).map((i)=>i.id).toList());
    }""".replace('SUP',support))
    if k=='sit_down':
        s=single(s,'    final rightPage = index.isEven;',"""    final menuKey='category:'+page.firstSection;
    final menuTitle=_menuText(menuKey,'title',''),menuIntro=_menuText(menuKey,'body','');
    final rightPage = index.isEven;"""+("""\n    if(index==_page)nativeMenuReport(key:menuKey,label:page.firstSection,page:index+1,pages:_pages.length,photoSurface:'separate',supports:SUP,products:page.blocks.where((b)=>b.item!=null).map((b)=>b.item!.id).toList());""".replace('SUP',support) if studio else ''))
        s=single(s,'_norseLayer(textWidth, textHeight),',"_norseLayer(textWidth, textHeight),\n                            Positioned.fill(child:_menuPaper(menuKey,const SizedBox.expand())),")
        s=single(s,'                                  _crest(),',"""                                  _crest(),
                                  if(menuTitle.isNotEmpty)Text(menuTitle,textAlign:TextAlign.center,style:TextStyle(color:_menuColor(menuKey,'heading_color',_sdInk),fontSize:19,fontWeight:FontWeight.w800)),
                                  if(menuIntro.isNotEmpty)Text(menuIntro,style:TextStyle(color:_menuColor(menuKey,'ink_color',_sdInk))),""")
        s=single(s,'key: b.navigationKey)','key: b.navigationKey,menuKey:menuKey)');s=single(s,': _row(b.item!)),',': _row(b.item!,menuKey)),')
        s=single(s,'Widget _sectionBand(String title, {Key? key})','Widget _sectionBand(String title, {Key? key,String menuKey=\'\'})')
        s=function_block(s,'  Widget _sectionBand(','  Widget _row(',lambda b:b.replace('style: const TextStyle(','style: TextStyle(').replace('color: _sdInk,',"color: _menuColor(menuKey,'heading_color',_sdInk),"))
        s=single(s,'Widget _row(_SdItem item) {','Widget _row(_SdItem item,String menuKey) {')
        s=function_block(s,'  Widget _row(_SdItem','  Future<',lambda b:b.replace('style: const TextStyle(','style: TextStyle(').replace('color: _sdInk,',"color: _menuColor(menuKey,'ink_color',_sdInk),").replace('color: _sdSub,',"color: _menuColor(menuKey,'ink_color',_sdSub),"))
    if k=='fast_food':
        s=single(s,'  bool imageMode = false;','''  bool imageMode = false;
  int _menuBoardPages=1;
  String get _boardKey=>'board:$activeDaypart:${pageHalves.isEmpty?activePanel:pageHalves.first.panelNo}';''')
        s=single(s,'      final idx = activePanel - 1;','      _menuBoardPages=pageUrls.length;\n      final idx = activePanel - 1;')
        s=s.replace('          first.imageUrl,\n          fit: BoxFit.fill,',"""          _menuURL(_menuPage(_boardKey)['background_url'])??first.imageUrl,
          fit: BoxFit.fill,""").replace('          spec.imageUrl,\n          fit: BoxFit.fill,',"""          _menuURL(_menuPage(_boardKey)['background_url'])??spec.imageUrl,
          fit: BoxFit.fill,""")
        s=single(s,'                    data.title,',"""                    _menuText(_boardKey,'title',data.title),""")
        if studio:
            s=single(s,'          if (data == null) return const SizedBox.shrink();',"""          if (data == null) return const SizedBox.shrink();
          nativeMenuReport(key:imageMode?_boardKey:'menu',label:imageMode?'Board '+activePanel.toString():(data.title.isEmpty?'Menu':data.title),page:activePanel,pages:imageMode?_menuBoardPages:1,photoSurface:imageMode?'embedded':'separate',supports:imageMode?const ['background_url']:const ['title'],products:nativeItems.keys.toList());""")
        s=s.replace("_menuText(_boardKey,'title',data.title)","_menuText('','title',data.title)")
    return s
