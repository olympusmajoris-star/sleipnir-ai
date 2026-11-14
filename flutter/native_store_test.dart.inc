  bool _studioAdding = false;

  Future<void> _applyStudioDisplay(List<_SERender> renders) async {
    final d = _seStudioDocument;
    if (d is! Map || d['storeId'] != widget.storeId ||
        d['aisle'] != widget.aisle) return;
    try {
      final index = renders.indexWhere((r) => r.no == d['renderNo']);
      if (index < 0) throw StateError('The selected original display is missing.');
      final zones = List<Map<String, dynamic>>.from(
          (d['zones'] as List).map((z) => Map<String, dynamic>.from(z as Map)));
      final ids = zones.map((z) => z['productId'] as String).toList();
      final rows = await SupaFlow.client.from('products')
          .select('id,store_id,name,description,price,image_url,shelf_group')
          .eq('store_id', widget.storeId).inFilter('id', ids)
          .timeout(const Duration(seconds: 12));
      final byId = {for (final p in rows) p['id']: p};
      final slots = <_SESlot>[];
      for (int i = 0; i < zones.length; i++) {
        final z = zones[i];
        final p = byId[z['productId']];
        if (p == null || p['store_id'] != widget.storeId ||
            p['name'] != z['name'] || p['price'] == null ||
            _num(p['price']) != _num(z['price'])) {
          throw StateError('Product names or prices changed. Render a fresh test.');
        }
        final b = z['box'] as Map;
        final rect = Rect.fromLTWH(_num(b['x']), _num(b['y']),
            _num(b['width']), _num(b['height']));
        if (rect.left < 0 || rect.top < 0 || rect.width <= 0 || rect.height <= 0 ||
            rect.right > 1.00000001 || rect.bottom > 1.00000001) {
          throw StateError('Invalid product area.');
        }
        slots.add(_SESlot(d['renderNo'] as int, i + 1, p['id'] as String,
            (p['shelf_group'] ?? '').toString(), p['name'] as String,
            (p['description'] ?? '').toString(), _num(p['price']),
            (p['image_url'] ?? '').toString(), studioBox: rect));
      }
      // Commit the local replacement only after every product has passed.
      renders[index] = _SERender(d['renderNo'] as int, d['url'] as String,
          _num(d['width']) / _num(d['height']), studio: true);
      _slots[d['renderNo'] as int] = slots;
    } catch (_) {
      if (mounted) WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _toast('Studio display unavailable or stale. Original aisle retained.');
      });
    }
  }

  Future<void> _addStudioProduct(_SESlot slot) async {
    if (_studioAdding) return;
    _studioAdding = true;
    try {
      final p = await SupaFlow.client.from('products').select('id,name,price')
          .eq('store_id', widget.storeId).eq('id', slot.pid).maybeSingle()
          .timeout(const Duration(seconds: 12));
      if (!mounted) return;
      if (p == null || p['name'] != slot.name || p['price'] == null ||
          _num(p['price']) != slot.price) {
        _toast('This display is out of date. Render a fresh test before adding.');
        return;
      }
      _add(slot); // Original app cart contract and product identity.
    } catch (_) {
      if (mounted) _toast('Could not verify this product. Nothing was added.');
    } finally {
      _studioAdding = false;
    }
  }

  Widget _studioDisplay(_SERender r, double w, double h) {
    final slots = _slots[r.no] ?? const <_SESlot>[];
    return SizedBox(width: w, height: h, child: Image.network(r.url,
      width: w, height: h, fit: BoxFit.fill,
      frameBuilder: (context, child, frame, sync) => Stack(children: [
        Positioned.fill(child: child),
        if (frame != null || sync)
          for (final s in slots)
            if (s.studioBox != null)
              Positioned(left: s.studioBox!.left * w, top: s.studioBox!.top * h,
                width: s.studioBox!.width * w, height: s.studioBox!.height * h,
                child: Semantics(label: 'Add ${s.name}', button: true,
                  child: GestureDetector(behavior: HitTestBehavior.opaque,
                    onTap: () => _addStudioProduct(s),
                    child: ColoredBox(color: _flash == '${s.render}-${s.slot}'
                        ? const Color(0x44FFFFFF) : Colors.transparent))))
      ]),
      errorBuilder: (context, error, stack) => const Center(child: Text(
        'Test image unavailable. Product taps disabled.',
        style: TextStyle(color: Colors.white), textAlign: TextAlign.center)),
    ));
  }
