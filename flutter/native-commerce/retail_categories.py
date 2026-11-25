"""Integrate the brand storefront into the verified RetailStore source for both builds."""
import json
from pathlib import Path
from retail_symbol_assets import dart_symbol_map

HERE = Path(__file__).resolve().parent

def integrate(source, studio):
    def one(before, after):
        nonlocal source
        if source.count(before) != 1:
            raise ValueError(f'RetailStore has changed near {before[:64]}')
        source = source.replace(before, after)

    catalog = json.loads((HERE.parent.parent / 'bath-body-catalog.json').read_text())
    groups = []
    for category in catalog['categories']:
        definitions = []
        for row in category['groups']:
            label, group_id, pattern, icon = (row[k] for k in ('label', 'id', 'pattern', 'icon'))
            if "'" in pattern:
                raise ValueError('Unexpected quote in type pattern')
            definitions.append(f"_BBWType({json.dumps(group_id)}, {json.dumps(label)}, {json.dumps(icon)}, r'{pattern}')")
        groups.append(f"    {json.dumps(category['label'])}: [{', '.join(definitions)}],")
    generic_rules = []
    for filename in ('retail-hardware-rules.json', 'retail-type-rules.json'):
        generic_rules.extend(json.loads((HERE.parent.parent / filename).read_text())['groups'])
    rule_json = json.dumps(generic_rules, ensure_ascii=False, separators=(',', ':'))
    if "'''" in rule_json:
        raise ValueError('Unexpected triple quote in retail type rules')
    methods = (HERE / 'bath_body_store.dart.inc').read_text()
    methods = methods.replace('__STORE_ID__', catalog['storeId']).replace('__GROUPS__', '\n'.join(groups))
    methods = methods.replace('__RETAIL_SYMBOLS__', dart_symbol_map()).replace('__TYPE_RULES_JSON__', rule_json)
    one('class RetailStore extends StatefulWidget', "import 'dart:convert' as retailSymbolCodec;\n\nclass RetailStore extends StatefulWidget")
    transfer = '_StudioFrozenSettings' in source
    photo = '_image(item.imageUrl)'
    if not transfer:
        photo = ('scaleSku' if studio else '_studioScaleSku') + '(item.id, ' + photo + ')'
    methods = methods.replace('__SKU_PHOTO__', photo)
    if transfer:
        for name, default, value in [
            ('cardColumns', 'crossAxisCount: 2', "crossAxisCount: _studioSettings.number('cardColumns',2).round().clamp(1,6)"),
            ('cardGapX', 'crossAxisSpacing: 8', "crossAxisSpacing: _studioSettings.number('cardGapX',8)"),
            ('cardGapY', 'mainAxisSpacing: 8', "mainAxisSpacing: _studioSettings.number('cardGapY',8)"),
            ('cardHeight', 'mainAxisExtent: 223', "mainAxisExtent: _studioSettings.number('cardHeight',223)"),
            ('cardRadius', 'BorderRadius.circular(10)', "BorderRadius.circular(_studioSettings.number('cardRadius',10))"),
            ('cardColor', 'color: Colors.white, shape:', "color: _studioSettings.color('cardColor',Colors.white), shape:"),
            ('productName', 'const TextStyle(color: _ink, fontWeight: FontWeight.w700, fontSize: 14)',
             "TextStyle(color: _studioSettings.color('productNameColor',_ink), fontWeight: FontWeight.w700, fontSize: _studioSettings.number('productNameSize',14))"),
            ('productPrice', 'const TextStyle(color: _ink, fontWeight: FontWeight.w700, fontSize: 15)',
             "TextStyle(color: _studioSettings.color('productPriceColor',_ink), fontWeight: FontWeight.w700, fontSize: _studioSettings.number('productPriceSize',15))"),
            ('cardPadding', 'const EdgeInsets.fromLTRB(7, 7, 7, 0)', "EdgeInsets.fromLTRB(_studioSettings.number('cardPadding',7), _studioSettings.number('cardPadding',7), _studioSettings.number('cardPadding',7), 0)"),
        ]:
            if methods.count(default) != 1:
                raise ValueError('Unknown storefront style location for ' + name)
            methods = methods.replace(default, value)
        methods = methods.replace('const SliverGridDelegateWithFixedCrossAxisCount', 'SliverGridDelegateWithFixedCrossAxisCount')
    one('    required this.sectionRank,', '    required this.shelfGroup,\n    required this.section,\n    required this.sectionRank,')
    one('  final int? sectionRank;', '  final String shelfGroup, section;\n  final int? sectionRank;')
    one("name: (row['name'] ?? '').toString().trim(),", """name: (row['name'] ?? '').toString().trim().isNotEmpty
          ? row['name'].toString().trim() : (row['full_name'] ?? '').toString().trim(),""")
    one('      sectionRank: _RetailStoreState', """      shelfGroup: (row['shelf_group'] ?? '').toString().trim(),
      section: (row['section'] ?? '').toString().trim(),
      sectionRank: _RetailStoreState""")
    one('image_url,category,section_rank', 'image_url,category,section,shelf_group,full_name,section_rank')

    one("import 'dart:convert' as retailSymbolCodec;", "import 'dart:convert' as retailSymbolCodec;\nimport 'package:flutter/gestures.dart';")
    before = '  List<_RetailItem> get _visibleProducts {'
    one(before, methods + '\n' + before)
    one("""      if (_searchTerm.isNotEmpty &&
          !item.name.toLowerCase().contains(_searchTerm)) {
        return false;
      }""", """      if (_type != null && !_itemMatchesType(item, _type!)) return false;
      if (_searchTerm.isNotEmpty) {
        return (item.name + ' ' + item.description + ' ' + item.category).toLowerCase().contains(_searchTerm);
      }""")
    one("        _categories = <_RetailCategory>[];", "        _typesByCategory = {};\n        _type = null;\n        _categories = <_RetailCategory>[];")
    one('        _categories = categories;', '''        _categories = categories;
        _typesByCategory = _stockTypes(items);
        final initial = Uri.base.queryParameters['category'];
        if (categories.any((c) => c.name == initial)) _category = initial!;''')
    one('    final visible = _visibleProducts;', '    final visible = _visibleProducts;\n    if (_isBBW) return _bbwStore(visible);')
    one('        _categoryChips(),', '''        _retailDepartments(),
        if ((_typesByCategory[_category]?.length ?? 0) > 1)
          _bbwTypes(_typesByCategory[_category]!),''')
    start = source.index('  Widget _categoryChips() {')
    end = source.index('  Widget _cartBar() {', start)
    source = source[:start] + source[end:]
    source += (HERE / 'retail_filter_rail.dart.inc').read_text()
    one('              : GridView.builder(', '''              : GridView.builder(
                  key: ValueKey('$_category/${_type?.id}'),''')
    source += (HERE / 'bath_body_types.dart.inc').read_text()
    return source
