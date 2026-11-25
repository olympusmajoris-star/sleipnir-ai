
/// A compact filter strip with explicit navigation for touch, mouse and keyboard.
class _RetailFilterRail extends StatefulWidget {
  const _RetailFilterRail({super.key, required this.label, required this.open,
    required this.color, required this.selected, required this.selectionRevision,
    required this.options, required this.chip, required this.height});
  final String label;
  final VoidCallback open;
  final Color color;
  final String selected;
  final int selectionRevision;
  final List<String> options;
  final Widget Function(BuildContext, int) chip;
  final double height;

  @override
  State<_RetailFilterRail> createState() => _RetailFilterRailState();
}

class _RetailFilterRailState extends State<_RetailFilterRail> {
  final _controller = ScrollController();
  final _selectedAnchor = GlobalKey();
  bool _canEarlier = false, _canLater = false;
  bool _edgeUpdatePending = false;

  @override
  void initState() {
    super.initState();
    _controller.addListener(_updateEdges);
    _revealSelection();
  }

  @override
  void didUpdateWidget(covariant _RetailFilterRail old) {
    super.didUpdateWidget(old);
    if (old.selected != widget.selected || old.selectionRevision != widget.selectionRevision) {
      _revealSelection();
    }
  }

  @override
  void dispose() {
    _controller.removeListener(_updateEdges);
    _controller.dispose();
    super.dispose();
  }

  void _updateEdges() {
    if (!mounted || !_controller.hasClients || !_controller.position.hasContentDimensions) return;
    final position = _controller.position;
    final earlier = position.extentBefore > 1, later = position.extentAfter > 1;
    if (earlier != _canEarlier || later != _canLater) {
      setState(() { _canEarlier = earlier; _canLater = later; });
    }
  }

  void _afterLayout() {
    if (_edgeUpdatePending) return;
    _edgeUpdatePending = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _edgeUpdatePending = false;
      _updateEdges();
    });
  }

  void _revealSelection() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !_controller.hasClients) return;
      final anchor = _selectedAnchor.currentContext?.findRenderObject();
      if (anchor == null || !anchor.attached) return;
      _controller.position.ensureVisible(anchor, alignment: .40,
          duration: const Duration(milliseconds: 190), curve: Curves.easeOut);
      _afterLayout();
    });
  }

  void _page(int direction) {
    final p = _controller.position;
    final jump = (p.viewportDimension * .8).clamp(70.0, 280.0);
    _controller.animateTo((p.pixels + jump * direction).clamp(p.minScrollExtent, p.maxScrollExtent).toDouble(),
        duration: const Duration(milliseconds: 210), curve: Curves.easeOut);
  }

  void _wheel(PointerSignalEvent event) {
    if (event is! PointerScrollEvent || !_controller.hasClients) return;
    // Flutter's horizontal scrollable handles horizontal trackpad motion itself.
    if (event.scrollDelta.dx.abs() >= event.scrollDelta.dy.abs()) return;
    final p = _controller.position;
    final dest = (p.pixels + event.scrollDelta.dy).clamp(p.minScrollExtent, p.maxScrollExtent).toDouble();
    if (dest == p.pixels) return;
    GestureBinding.instance.pointerSignalResolver.register(event, (_) {
      if (mounted && _controller.hasClients) _controller.jumpTo(dest);
    });
  }

  Widget _arrow(int direction) {
    final enabled = direction < 0 ? _canEarlier : _canLater;
    return IconButton(
      onPressed: enabled ? () => _page(direction) : null,
      tooltip: '${direction < 0 ? 'Previous' : 'Next'} ${widget.label.toLowerCase()}',
      color: widget.color, disabledColor: widget.color.withValues(alpha: .28),
      constraints: const BoxConstraints.tightFor(width: 30, height: 44),
      padding: EdgeInsets.zero, visualDensity: VisualDensity.compact,
      icon: Icon(direction < 0 ? Icons.chevron_left : Icons.chevron_right, size: 23));
  }

  @override
  Widget build(BuildContext context) {
    final scrollBehavior = ScrollConfiguration.of(context);
    return SizedBox(height: widget.height, child: Row(children: [
      TextButton.icon(onPressed: widget.open, icon: const Icon(Icons.grid_view_rounded, size: 15),
        label: Text(widget.label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
        style: TextButton.styleFrom(foregroundColor: widget.color, padding: const EdgeInsets.symmetric(horizontal: 7))),
      _arrow(-1),
      Expanded(child: NotificationListener<ScrollMetricsNotification>(
        onNotification: (_) { _afterLayout(); return false; },
        child: ScrollConfiguration(behavior: scrollBehavior.copyWith(scrollbars: false,
          dragDevices: {...scrollBehavior.dragDevices, PointerDeviceKind.mouse, PointerDeviceKind.trackpad}),
          child: Listener(onPointerSignal: _wheel, child: SingleChildScrollView(
            controller: _controller, scrollDirection: Axis.horizontal,
            child: Row(children: [
              for (var i = 0; i < widget.options.length; i++)
                Padding(key: widget.options[i] == widget.selected ? _selectedAnchor : null,
                  padding: const EdgeInsets.symmetric(horizontal: 2),
                  child: widget.chip(context, i)),
            ])))))),
      _arrow(1),
    ]));
  }
}
