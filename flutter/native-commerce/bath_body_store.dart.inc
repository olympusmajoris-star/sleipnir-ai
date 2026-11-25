  static const _ink = Color(0xFF112D4B);
  static const _secondaryInk = Color(0xFF44607B);
  static const _outline = Color(0xFFD1DDE6);
  static const _tint = Color(0xFFE8F2FA);
  static const _paper = Color(0xFFF6F8FA);
  bool get _isBBW => widget.storeId == '__STORE_ID__';
  _BBWType? _type;
  Map<String, List<_BBWType>> _typesByCategory = {};
  static final Map<String, List<_BBWType>> _definitions = {
__GROUPS__
  };

  static final List<_RetailNameRule> _retailRules =
      (retailSymbolCodec.jsonDecode(r'''__TYPE_RULES_JSON__''') as List)
        .map((raw) => _RetailNameRule(Map<String, dynamic>.from(raw as Map))).toList();
  final Map<String, String> _stockTypeIds = {};

  bool _itemMatchesType(_RetailItem item, _BBWType type) =>
      type.pattern != null ? type.matches(item) : _stockTypeIds[item.id] == type.id;

  bool _namedGroup(String name, String category) {
    final key = name.toLowerCase();
    return key.isNotEmpty && key != category.toLowerCase() &&
        !const {'all', 'other', 'misc', 'miscellaneous', 'general', 'uncategorized', 'none', 'n/a'}.contains(key);
  }

  Map<String, List<_BBWType>> _stockTypes(List<_RetailItem> items) {
    final sections = <String, List<_RetailItem>>{};
    _stockTypeIds.clear();
    for (final item in items) {
      (sections[item.category] ??= []).add(item);
    }
    final result = <String, List<_BBWType>>{};
    for (final section in sections.entries) {
      final defined = _isBBW ? _definitions[section.key] : null;
      if (defined != null) {
        result[section.key] = defined.where((type) => section.value.any(type.matches)).toList();
        continue;
      }
      final rules = _retailRules.where((rule) => rule.applies(widget.storeId, section.key)).toList();
      final groups = <String, _BBWType>{};
      for (final item in section.value) {
        _BBWType? group;
        if (_namedGroup(item.shelfGroup, section.key)) {
          group = _BBWType.catalog(item.shelfGroup);
        } else {
          for (final rule in rules) {
            if (rule.pattern.hasMatch(item.name)) { group = rule.type; break; }
          }
          group ??= _BBWType.catalog(_namedGroup(item.section, section.key) ? item.section : 'Other');
        }
        final selected = groups.putIfAbsent(group.id, () => group!);
        _stockTypeIds[item.id] = selected.id;
      }
      final types = groups.values.toList()..sort((a,b) {
        if (a.id == b.id) return 0;
        if (a.id == 'other') return 1;
        if (b.id == 'other') return -1;
        return a.label.toLowerCase().compareTo(b.label.toLowerCase());
      });
      result[section.key] = types;
    }
    return result;
  }

  static final Map<String, MemoryImage> _symbols =
      <String, String>__RETAIL_SYMBOLS__.map((key, png) =>
          MapEntry(key, MemoryImage(retailSymbolCodec.base64Decode(png))));

  Widget _retailSymbol(String key, Color color) {
    final image = _symbols[key];
    if (image == null) return Icon(Icons.category_outlined, size: 21, color: color);
    return Image(image: image, width: 21, height: 21, color: color,
        colorBlendMode: BlendMode.srcIn, excludeFromSemantics: true);
  }

  List<String> get _departments => ['All', ..._categories.map((c) => c.name)];

  int _departmentChoice = 0, _typeChoice = 0;

  void _chooseDepartment(String value) {
    FocusScope.of(context).unfocus();
    setState(() {
      _category = value;
      _type = null;
      _departmentChoice++;
      _typeChoice++;
    });
  }

  void _chooseType(_BBWType? value) {
    setState(() { _type = value; _typeChoice++; });
  }

  Future<void> _pickFilter(bool departments, List<_BBWType> types) async {
    final labels = departments ? _departments : ['All types', ...types.map((t) => t.label)];
    final selected = departments ? _category : _type?.label ?? 'All types';
    final result = await showModalBottomSheet<int>(
      context: context, backgroundColor: Colors.white, showDragHandle: true,
      isScrollControlled: true,
      constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * .85),
      builder: (ctx) => SafeArea(child: Column(mainAxisSize: MainAxisSize.min, children: [
        Padding(padding: const EdgeInsets.fromLTRB(18, 2, 18, 10),
          child: Align(alignment: Alignment.centerLeft, child: Text(departments ? 'Categories' : '$_category types',
            style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w700, color: _ink)))),
        Flexible(child: ListView.builder(shrinkWrap: true, itemCount: labels.length,
          itemBuilder: (_, i) => ListTile(
            leading: departments ? null : _retailSymbol(i == 0 ? 'grid' : types[i-1].icon, _ink),
            title: Text(labels[i], style: const TextStyle(color: _ink)), selected: selected == labels[i],
            trailing: selected == labels[i] ? const Icon(Icons.check, color: _ink) : null,
            onTap: () => Navigator.pop(ctx, i)))),
      ])),
    );
    if (!mounted || result == null) return;
    if (departments) { _chooseDepartment(labels[result]); }
    else { _chooseType(result == 0 ? null : types[result - 1]); }
  }

  Widget _bbwHeader() {
    final wordmark = Text(_storeName.isEmpty ? 'Bath & Body Works' : _storeName,
      textAlign: TextAlign.center, maxLines: 1, overflow: TextOverflow.ellipsis,
      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, letterSpacing: -.7, color: _ink));
    return Column(children: [
      const SizedBox(width: double.infinity, height: 10, child: CustomPaint(painter: _BBWChecks())),
      SizedBox(height: 49, child: Row(children: [
        IconButton(tooltip: 'Back', icon: const Icon(Icons.arrow_back_ios_new, color: _ink, size: 18),
          onPressed: () => Navigator.maybePop(context)),
        Expanded(child: Center(child: _storeLogo.trim().isEmpty ? wordmark :
          Semantics(label: 'Bath & Body Works', image: true, child: Image.network(_storeLogo,
            height: 36, width: 210, fit: BoxFit.contain, excludeFromSemantics: true,
            frameBuilder: (_, image, frame, sync) => sync || frame != null ? image : wordmark,
            errorBuilder: (_, __, ___) => wordmark)))),
        const SizedBox(width: 48),
      ])),
    ]);
  }

  Widget _bbwSearch() => Padding(
    padding: const EdgeInsets.fromLTRB(12, 1, 12, 5),
    child: SizedBox(height: 40, child: TextField(controller: _searchController,
      textAlignVertical: TextAlignVertical.center,
      style: const TextStyle(color: _ink, fontSize: 14), cursorColor: _ink,
      decoration: InputDecoration(isDense: true, filled: true, fillColor: _paper,
        hintText: 'Search products', hintStyle: const TextStyle(color: _secondaryInk),
        prefixIcon: const Icon(Icons.search, color: _secondaryInk, size: 19),
        suffixIcon: _searchTerm.isEmpty ? null : IconButton(tooltip: 'Clear search', iconSize: 16,
          icon: const Icon(Icons.close, color: _ink), onPressed: _searchController.clear),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(24),
          borderSide: const BorderSide(color: _outline)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(24),
          borderSide: const BorderSide(color: _ink))),
    )));

  Widget _retailDepartments() {
    final departments = _departments;
    final foreground = _isBBW ? _ink : Colors.white;
    return _RetailFilterRail(label: 'Categories', open: () => _pickFilter(true, const []),
      color: foreground, selected: _category, selectionRevision: _departmentChoice,
      options: departments, height: 46, chip: (context, i) {
        final label = departments[i], active = label == _category;
        final background = active ? (_isBBW ? _ink : _yellow) : (_isBBW ? _tint : _panel);
        final text = active ? (_isBBW ? Colors.white : Colors.black) : foreground;
        return Material(color: background, borderRadius: BorderRadius.circular(20),
          child: Semantics(selected: active, button: true, child: InkWell(
            borderRadius: BorderRadius.circular(20), onTap: () => _chooseDepartment(label),
            child: Padding(padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 8),
              child: Text(label, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: text))))));
      });
  }

  Widget _bbwTypes(List<_BBWType> types) => Container(decoration: const BoxDecoration(
    color: Colors.white, border: Border(bottom: BorderSide(color: _outline))),
    child: _RetailFilterRail(key: ValueKey('types/$_category'), label: 'Types', open: () => _pickFilter(false, types),
      color: _ink, selected: _type?.id ?? '', selectionRevision: _typeChoice,
      options: ['', ...types.map((t) => t.id)], height: 64, chip: (ctx, i) {
        final type = i == 0 ? null : types[i - 1];
        final selected = _type == type;
        return Semantics(button: true, selected: selected, child: InkWell(
          onTap: () => _chooseType(type),
          child: Container(constraints: const BoxConstraints(minWidth: 48),
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              Container(width: 30, height: 30, decoration: BoxDecoration(color: selected ? _ink : _tint,
                shape: BoxShape.circle), child: Center(
                child: _retailSymbol(type?.icon ?? 'grid', selected ? Colors.white : _ink))),
              const SizedBox(height: 4),
              Text(type?.label ?? 'All types', style: TextStyle(color: _ink, fontSize: 11.5,
                fontWeight: selected ? FontWeight.w800 : FontWeight.w500)),
            ]))));
      }));

  Widget _bbwCard(_RetailItem item) => Material(
    color: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10),
      side: const BorderSide(color: _outline)), clipBehavior: Clip.antiAlias,
    child: InkWell(onTap: () => _openDetails(item), child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Expanded(child: Padding(padding: const EdgeInsets.fromLTRB(7, 7, 7, 0),
          child: __SKU_PHOTO__)),
        Padding(padding: const EdgeInsets.fromLTRB(9, 7, 9, 0), child: Text(item.name,
          maxLines: 1, overflow: TextOverflow.ellipsis,
          style: const TextStyle(color: _ink, fontWeight: FontWeight.w700, fontSize: 14))),
        Padding(padding: const EdgeInsets.fromLTRB(9, 2, 7, 0), child: Text(item.description,
          maxLines: 2, overflow: TextOverflow.ellipsis,
          style: const TextStyle(color: _secondaryInk, fontSize: 12, height: 1.18))),
        Padding(padding: const EdgeInsets.only(left: 9, right: 2), child: Row(children: [
          Expanded(child: Text(item.price == null ? 'No price' : _money(item.price!),
            style: const TextStyle(color: _ink, fontWeight: FontWeight.w700, fontSize: 15))),
          IconButton(tooltip: 'Add ${item.name}', onPressed: item.price == null ? null : () => _addToCart(item, 1),
            icon: const Icon(Icons.add_circle), color: _ink, iconSize: 30),
        ])),
      ])));

  Widget _bbwStore(List<_RetailItem> visible) {
    final types = _typesByCategory[_category] ?? const <_BBWType>[];
    return ColoredBox(color: Colors.white, child: Column(children: [
      _bbwHeader(), _bbwSearch(), _retailDepartments(),
      if (types.length > 1) _bbwTypes(types),
      Expanded(child: ColoredBox(color: _paper,
        child: visible.isEmpty
          ? const Center(child: Text('No matching products.', style: TextStyle(color: _ink)))
          : GridView.builder(key: ValueKey('$_category/${_type?.id}/$_searchTerm'),
            padding: const EdgeInsets.fromLTRB(10, 9, 10, 12),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2,
              crossAxisSpacing: 8, mainAxisSpacing: 8, mainAxisExtent: 223),
            itemCount: visible.length, itemBuilder: (_, i) => _bbwCard(visible[i])))),
      AnimatedBuilder(animation: FFAppState(), builder: (_, __) => _cartCount == 0
        ? Container(height: 43, alignment: Alignment.center,
        decoration: const BoxDecoration(color: Colors.white, border: Border(top: BorderSide(color: _outline))),
        child: const Text('Tap + to add items', style: TextStyle(fontSize: 13, color: _secondaryInk))) : _cartBar()),
    ]));
  }
