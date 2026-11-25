
class _BBWType {
  _BBWType(this.id, this.label, this.icon, String pattern)
      : pattern = RegExp(pattern, caseSensitive: false);
  _BBWType.catalog(String subtype, [this.icon = 'category'])
      : id = subtype.toLowerCase(), label = subtype, pattern = null;
  final String id, label, icon;
  final RegExp? pattern;
  bool matches(_RetailItem item) =>
      pattern?.hasMatch(item.description.isEmpty ? item.name : item.description)
          ?? false;
}

class _RetailNameRule {
  _RetailNameRule(Map<String, dynamic> value)
      : type = _BBWType.catalog(value['label'] as String, value['icon'] as String),
        pattern = RegExp(value['pattern'] as String, caseSensitive: false),
        stores = (value['stores'] as List?)?.cast<String>().toSet(),
        categories = (value['categories'] as List?)?.cast<String>().toSet();
  final _BBWType type;
  final RegExp pattern;
  final Set<String>? stores, categories;

  bool applies(String? store, String category) =>
      (stores == null || stores!.contains(store)) && (categories == null || categories!.contains(category));
}

class _BBWChecks extends CustomPainter {
  const _BBWChecks();
  @override
  void paint(Canvas canvas, Size size) {
    const step = 5.0;
    final blue = Paint()..color = const Color(0x733A83BB);
    canvas.drawColor(const Color(0xFFF7FAFF), BlendMode.src);
    for (double x = 0; x < size.width; x += 2 * step) {
      canvas.drawRect(Rect.fromLTWH(x, 0, step, size.height), blue);
    }
    for (double y = 0; y < size.height; y += 2 * step) {
      canvas.drawRect(Rect.fromLTWH(0, y, size.width, step), blue);
    }
  }
  @override
  bool shouldRepaint(covariant _BBWChecks oldDelegate) => false;
}
