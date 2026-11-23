// Studio preview copy of the FlutterFlow custom widget FreightBoard.
// The widget code below is the app's code. Only two imports differ:
// geolocator -> fixed test location, supabase_flutter -> supabase.
import 'package:sleipnir_app_pages/backend/supabase/supabase.dart';
import 'package:sleipnir_app_pages/flutter_flow/flutter_flow_util.dart';
import 'package:flutter/material.dart';

// Begin custom code — DO NOT REMOVE OR MODIFY THE CODE ABOVE!

import 'dart:async';

class FreightBoard extends StatefulWidget {
  const FreightBoard({
    super.key,
    this.width,
    this.height,
  });

  final double? width;
  final double? height;

  @override
  State<FreightBoard> createState() => _FreightBoardState();
}

const Color _fbBg = Color(0xFF0F0F10);
const Color _fbCard = Color(0xFF1B1B1E);
const Color _fbLine = Color(0xFF2C2C31);
const Color _fbGold = Color(0xFFF2B63D);
const Color _fbGreen = Color(0xFF43C46B);
const Color _fbMuted = Color(0xFF9A9AA3);
const double _fbDriverShare = 0.80;

double _fbD(dynamic v) {
  if (v == null) return 0;
  if (v is num) return v.toDouble();
  return double.tryParse('$v') ?? 0;
}

int _fbI(dynamic v) {
  if (v == null) return 0;
  if (v is num) return v.toInt();
  return int.tryParse('$v') ?? (double.tryParse('$v')?.toInt() ?? 0);
}

String _fbMoney(double v) => '\$${v.toStringAsFixed(2)}';

String _fbThousands(int v) {
  final s = v.toString();
  final b = StringBuffer();
  for (var i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 == 0) b.write(',');
    b.write(s[i]);
  }
  return b.toString();
}

String _fbTime(DateTime t) {
  final h = t.hour % 12 == 0 ? 12 : t.hour % 12;
  final m = t.minute.toString().padLeft(2, '0');
  return '$h:$m ${t.hour < 12 ? 'AM' : 'PM'}';
}

String _fbWindow(dynamic a, dynamic b) {
  final s = a == null ? null : DateTime.tryParse('$a')?.toLocal();
  final e = b == null ? null : DateTime.tryParse('$b')?.toLocal();
  if (s == null) return 'Flexible time';
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final diff = DateTime(s.year, s.month, s.day).difference(today).inDays;
  final day = diff == 0
      ? 'Today'
      : diff == 1
          ? 'Tomorrow'
          : '${s.month}/${s.day}';
  return e == null ? '$day ${_fbTime(s)}' : '$day ${_fbTime(s)}–${_fbTime(e)}';
}

InputDecoration _fbInput(String label, {String? prefix}) => InputDecoration(
      labelText: label,
      prefixText: prefix,
      labelStyle: const TextStyle(color: _fbMuted),
      prefixStyle: const TextStyle(color: Colors.white),
      filled: true,
      fillColor: const Color(0xFF16161A),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: _fbLine),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: _fbGold),
      ),
    );

class _FreightBoardState extends State<FreightBoard> {
  String? _uid;
  bool _loading = true;
  bool _busy = false;
  String? _error;
  Map<String, dynamic>? _rig;
  bool _editRig = false;
  List<Map<String, dynamic>> _classes = [];
  List<Map<String, dynamic>> _board = [];
  List<Map<String, dynamic>> _mine = [];
  int _tab = 0;
  Timer? _timer;

  String _fClass = 'pickup';
  final TextEditingController _fMake = TextEditingController();
  final TextEditingController _fPayload = TextEditingController();
  final TextEditingController _fLength = TextEditingController();
  final TextEditingController _fCity = TextEditingController();
  bool _fLift = false;

  @override
  void initState() {
    super.initState();
    _uid = SupaFlow.client.auth.currentUser?.id;
    _loadAll();
    _timer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted && !_editRig && _rig != null && !_busy) _refresh();
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _fMake.dispose();
    _fPayload.dispose();
    _fLength.dispose();
    _fCity.dispose();
    super.dispose();
  }

  String _classLabel(String code) {
    for (final c in _classes) {
      if ('${c['code']}' == code) return '${c['label']}';
    }
    return code;
  }

  int _maxPayload(String code) {
    for (final c in _classes) {
      if ('${c['code']}' == code) return _fbI(c['max_payload_lbs']);
    }
    return 0;
  }

  void _toast(String msg) {
    final sm = ScaffoldMessenger.maybeOf(context);
    sm?.hideCurrentSnackBar();
    sm?.showSnackBar(SnackBar(
      content: Text(msg),
      behavior: SnackBarBehavior.floating,
      duration: const Duration(seconds: 2),
    ));
  }

  Future<void> _loadAll() async {
    if (_uid == null) {
      setState(() => _loading = false);
      return;
    }
    try {
      final cls =
          await SupaFlow.client.from('freight_classes').select().order('rank');
      _classes = (cls as List)
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();
      final rig = await SupaFlow.client
          .from('valkyrie_rigs')
          .select()
          .eq('driver_id', _uid!)
          .maybeSingle();
      _rig = rig == null ? null : Map<String, dynamic>.from(rig as Map);
      if (_rig == null && _fPayload.text.trim().isEmpty) {
        _fPayload.text = '${_maxPayload(_fClass)}';
      }
      if (_rig != null) await _fetchLists();
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = '$e';
      });
    }
  }

  Future<void> _fetchLists() async {
    final b = await SupaFlow.client.rpc('freight_board');
    final list = b is List ? b : <dynamic>[];
    _board = list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    final m = await SupaFlow.client
        .from('freight_loads')
        .select()
        .eq('driver_id', _uid!)
        .order('assigned_at', ascending: false)
        .limit(50);
    _mine =
        (m as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  Future<void> _refresh() async {
    try {
      await _fetchLists();
      if (mounted) setState(() {});
    } catch (_) {}
  }

  Future<void> _rpc(String fn, Map<String, dynamic> params,
      {int? thenTab}) async {
    setState(() => _busy = true);
    try {
      final r = await SupaFlow.client.rpc(fn, params: params);
      final m = r is Map ? Map<String, dynamic>.from(r) : <String, dynamic>{};
      _toast('${m['msg'] ?? 'Done'}');
      await _fetchLists();
      if (m['ok'] == true && thenTab != null) _tab = thenTab;
    } catch (e) {
      _toast('Error: $e');
    }
    if (mounted) setState(() => _busy = false);
  }

  void _openRigForm() {
    final r = _rig;
    if (r != null) {
      _fClass = '${r['class_code']}';
      _fMake.text = '${r['make_model'] ?? ''}';
      _fPayload.text = '${_fbI(r['payload_lbs'])}';
      _fLength.text =
          r['cargo_length_ft'] == null ? '' : '${_fbD(r['cargo_length_ft'])}';
      _fCity.text = '${r['home_city'] ?? ''}';
      _fLift = r['has_liftgate'] == true;
    }
    setState(() => _editRig = true);
  }

  Future<void> _saveRig() async {
    final payload =
        int.tryParse(_fPayload.text.replaceAll(',', '').trim()) ?? 0;
    if (payload <= 0) {
      _toast('Enter your max payload in lbs');
      return;
    }
    setState(() => _busy = true);
    try {
      await SupaFlow.client.from('valkyrie_rigs').upsert({
        'driver_id': _uid,
        'class_code': _fClass,
        'make_model': _fMake.text.trim(),
        'payload_lbs': payload,
        'cargo_length_ft': double.tryParse(_fLength.text.trim()),
        'has_liftgate': _fLift,
        'home_city': _fCity.text.trim(),
        'updated_at': DateTime.now().toUtc().toIso8601String(),
      }, onConflict: 'driver_id');
      _editRig = false;
      await _loadAll();
      _toast('Rig saved');
    } catch (e) {
      _toast('Could not save: $e');
    }
    if (mounted) setState(() => _busy = false);
  }

  Future<void> _setAvailable(bool v) async {
    setState(() => _rig!['is_available'] = v);
    try {
      await SupaFlow.client
          .from('valkyrie_rigs')
          .update({'is_available': v}).eq('driver_id', _uid!);
    } catch (e) {
      _toast('Could not update: $e');
    }
  }

  Future<void> _claim(Map<String, dynamic> l) async {
    final price = _fbD(l['price']);
    final ok = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        backgroundColor: _fbCard,
        title: const Text('Claim this load?',
            style: TextStyle(color: Colors.white)),
        content: Text(
          '${l['title']}\n\nJob ${_fbMoney(price)}  ·  you earn ${_fbMoney(price * _fbDriverShare)}',
          style: const TextStyle(color: _fbMuted),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(c, false),
            child: const Text('Cancel', style: TextStyle(color: _fbMuted)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
                backgroundColor: _fbGold, foregroundColor: Colors.black),
            onPressed: () => Navigator.pop(c, true),
            child: const Text('Claim'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    await _rpc('freight_claim', {'p_load': l['id']}, thenTab: 2);
  }

  Future<void> _bid(Map<String, dynamic> l) async {
    final start = _fbD(l['my_bid']) > 0 ? _fbD(l['my_bid']) : _fbD(l['price']);
    final pc = TextEditingController(text: start.toStringAsFixed(2));
    final nc = TextEditingController();
    final res = await showDialog<bool>(
      context: context,
      builder: (c) => StatefulBuilder(builder: (c, setD) {
        final v = double.tryParse(pc.text.trim()) ?? 0;
        return AlertDialog(
          backgroundColor: _fbCard,
          title:
              const Text('Your price', style: TextStyle(color: Colors.white)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Posted at ${_fbMoney(_fbD(l['price']))}',
                  style: const TextStyle(color: _fbMuted)),
              const SizedBox(height: 12),
              TextField(
                controller: pc,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                onChanged: (_) => setD(() {}),
                style: const TextStyle(color: Colors.white),
                decoration: _fbInput('Job price', prefix: '\$ '),
              ),
              const SizedBox(height: 8),
              Text('You earn ${_fbMoney(v * _fbDriverShare)}',
                  style: const TextStyle(
                      color: _fbGreen, fontWeight: FontWeight.w700)),
              const SizedBox(height: 12),
              TextField(
                controller: nc,
                maxLines: 2,
                style: const TextStyle(color: Colors.white),
                decoration: _fbInput('Note to poster (optional)'),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(c, false),
              child: const Text('Cancel', style: TextStyle(color: _fbMuted)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                  backgroundColor: _fbGold, foregroundColor: Colors.black),
              onPressed: () => Navigator.pop(c, true),
              child: const Text('Send bid'),
            ),
          ],
        );
      }),
    );
    if (res != true) return;
    final price = double.tryParse(pc.text.trim()) ?? 0;
    final note = nc.text.trim();
    await _rpc('freight_bid', {
      'p_load': l['id'],
      'p_price': price,
      'p_note': note.isEmpty ? null : note,
    });
  }

  String _left(dynamic until) {
    final u = until == null ? null : DateTime.tryParse('$until')?.toLocal();
    if (u == null) return '';
    final d = u.difference(DateTime.now());
    if (d.isNegative) return '0 min';
    return '${d.inMinutes} min';
  }

  Widget _chip(String t) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
        decoration: BoxDecoration(
          color: const Color(0xFF26262B),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(t,
            style: const TextStyle(color: Colors.white70, fontSize: 12)),
      );

  Widget _msg(String t) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(t,
              textAlign: TextAlign.center,
              style: const TextStyle(color: _fbMuted, fontSize: 15)),
        ),
      );

  Widget _header() {
    final r = _rig!;
    final avail = r['is_available'] == true;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 12, 8),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Load Board',
                    style: TextStyle(
                        color: Colors.white,
                        fontSize: 22,
                        fontWeight: FontWeight.w800)),
                const SizedBox(height: 4),
                GestureDetector(
                  onTap: _openRigForm,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Flexible(
                        child: Text(
                          '${_classLabel('${r['class_code']}')} · ${_fbThousands(_fbI(r['payload_lbs']))} lb${r['has_liftgate'] == true ? ' · Liftgate' : ''}',
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: _fbMuted, fontSize: 13),
                        ),
                      ),
                      const SizedBox(width: 4),
                      const Icon(Icons.edit, size: 14, color: _fbMuted),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Switch(
                value: avail,
                activeColor: _fbGreen,
                onChanged: _setAvailable,
              ),
              Text(avail ? 'Available' : 'Off',
                  style: TextStyle(
                      color: avail ? _fbGreen : _fbMuted, fontSize: 11)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _tabs(int a, int b, int c) {
    Widget t(int i, String label, int n) {
      final sel = _tab == i;
      return Expanded(
        child: GestureDetector(
          onTap: () => setState(() => _tab = i),
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 4),
            padding: const EdgeInsets.symmetric(vertical: 10),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: sel ? _fbGold : _fbCard,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text('$label ($n)',
                style: TextStyle(
                    color: sel ? Colors.black : Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 13)),
          ),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(8, 0, 8, 8),
      child: Row(children: [
        t(0, 'Open', a),
        t(1, 'Sent to you', b),
        t(2, 'My loads', c),
      ]),
    );
  }

  Widget _loadCard(Map<String, dynamic> l) {
    final price = _fbD(l['price']);
    final myBid = _fbD(l['my_bid']);
    final bidPending = myBid > 0 && '${l['my_bid_status']}' == 'pending';
    final direct = l['is_direct'] == true;
    final pallets = _fbI(l['pallets']);
    final pieces = _fbI(l['pieces']);
    final stairs = _fbI(l['stairs_flights']);
    final details = '${l['details'] ?? ''}'.trim();
    final chips = <String>[
      '${l['class_label'] ?? _classLabel('${l['required_class']}')}',
      if (_fbI(l['weight_lbs']) > 0)
        '${_fbThousands(_fbI(l['weight_lbs']))} lb',
      if (pallets > 0) '$pallets pallet${pallets == 1 ? '' : 's'}',
      if (pieces > 0) '$pieces piece${pieces == 1 ? '' : 's'}',
      if (l['needs_liftgate'] == true) 'Liftgate',
      if (stairs > 0) '$stairs flight${stairs == 1 ? '' : 's'} of stairs',
      _fbWindow(l['window_start'], l['window_end']),
    ];
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _fbCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: direct ? _fbGold : _fbLine),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (direct)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Text('Sent to you · ${_left(l['direct_until'])} left',
                  style: const TextStyle(
                      color: _fbGold,
                      fontSize: 12,
                      fontWeight: FontWeight.w700)),
            ),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text('${l['title']}',
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w700)),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text('You earn ${_fbMoney(price * _fbDriverShare)}',
                      style: const TextStyle(
                          color: _fbGreen,
                          fontSize: 16,
                          fontWeight: FontWeight.w800)),
                  Text('Job ${_fbMoney(price)}',
                      style: const TextStyle(color: _fbMuted, fontSize: 12)),
                ],
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            '${l['pickup_city'] ?? 'Pickup'}  →  ${l['drop_city'] ?? 'Drop-off'}  ·  ${_fbD(l['miles']).toStringAsFixed(1)} mi',
            style: const TextStyle(color: Colors.white70, fontSize: 14),
          ),
          if (details.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(details,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: _fbMuted, fontSize: 13)),
          ],
          const SizedBox(height: 10),
          Wrap(spacing: 6, runSpacing: 6, children: chips.map(_chip).toList()),
          const SizedBox(height: 12),
          if (bidPending)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text('Your bid ${_fbMoney(myBid)} · waiting on the poster',
                  style: const TextStyle(color: _fbGold, fontSize: 13)),
            ),
          Row(
            children: [
              Expanded(
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _fbGold,
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: () => _claim(l),
                  child: Text('Claim ${_fbMoney(price)}',
                      style: const TextStyle(fontWeight: FontWeight.w800)),
                ),
              ),
              if (l['allow_bids'] == true) ...[
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white,
                      side: const BorderSide(color: _fbGold),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: () => _bid(l),
                    child: Text(bidPending ? 'Change bid' : 'Bid'),
                  ),
                ),
              ],
              if (bidPending)
                IconButton(
                  tooltip: 'Withdraw bid',
                  icon: const Icon(Icons.close, color: _fbMuted),
                  onPressed: () =>
                      _rpc('freight_withdraw_bid', {'p_load': l['id']}),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _mineCard(Map<String, dynamic> l) {
    final price = _fbD(l['final_price'] ?? l['price']);
    final status = '${l['status']}';
    final labels = {
      'assigned': 'Assigned · head to pickup',
      'picked_up': 'Picked up · on the way',
      'delivered': 'Delivered',
      'cancelled': 'Cancelled',
    };
    final colors = {
      'assigned': _fbGold,
      'picked_up': const Color(0xFF5EA8FF),
      'delivered': _fbGreen,
      'cancelled': _fbMuted,
    };
    final col = colors[status] ?? _fbMuted;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _fbCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _fbLine),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text('${l['title']}',
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w700)),
              ),
              Text(_fbMoney(price * _fbDriverShare),
                  style: const TextStyle(
                      color: _fbGreen,
                      fontSize: 16,
                      fontWeight: FontWeight.w800)),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            '${l['pickup_city'] ?? 'Pickup'}  →  ${l['drop_city'] ?? 'Drop-off'}  ·  ${_fbD(l['miles']).toStringAsFixed(1)} mi',
            style: const TextStyle(color: Colors.white70, fontSize: 14),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: col.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: col),
                ),
                child: Text(labels[status] ?? status,
                    style: TextStyle(
                        color: col, fontSize: 12, fontWeight: FontWeight.w700)),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(_fbWindow(l['window_start'], l['window_end']),
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: _fbMuted, fontSize: 12)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _rigForm() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(_rig == null ? 'Register your rig' : 'Edit your rig',
            style: const TextStyle(
                color: Colors.white,
                fontSize: 22,
                fontWeight: FontWeight.w800)),
        const SizedBox(height: 4),
        const Text('The board only shows loads your rig can carry.',
            style: TextStyle(color: _fbMuted)),
        const SizedBox(height: 18),
        DropdownButtonFormField<String>(
          value: _fClass,
          dropdownColor: _fbCard,
          style: const TextStyle(color: Colors.white, fontSize: 15),
          decoration: _fbInput('Vehicle type'),
          items: _classes
              .map((c) => DropdownMenuItem<String>(
                    value: '${c['code']}',
                    child: Text('${c['label']}'),
                  ))
              .toList(),
          onChanged: (v) {
            if (v == null) return;
            setState(() {
              _fClass = v;
              if (_rig == null) _fPayload.text = '${_maxPayload(v)}';
            });
          },
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _fMake,
          style: const TextStyle(color: Colors.white),
          decoration: _fbInput('Year / make / model'),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _fPayload,
          keyboardType: TextInputType.number,
          style: const TextStyle(color: Colors.white),
          decoration: _fbInput('Max payload (lbs)'),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _fLength,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          style: const TextStyle(color: Colors.white),
          decoration: _fbInput('Bed / box length (ft)'),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _fCity,
          style: const TextStyle(color: Colors.white),
          decoration: _fbInput('Home city'),
        ),
        const SizedBox(height: 6),
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          value: _fLift,
          activeColor: _fbGold,
          onChanged: (v) => setState(() => _fLift = v),
          title: const Text('Liftgate', style: TextStyle(color: Colors.white)),
        ),
        const SizedBox(height: 16),
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: _fbGold,
            foregroundColor: Colors.black,
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
          onPressed: _busy ? null : _saveRig,
          child: const Text('Save rig',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
        ),
        if (_rig != null)
          TextButton(
            onPressed: () => setState(() => _editRig = false),
            child: const Text('Cancel', style: TextStyle(color: _fbMuted)),
          ),
      ],
    );
  }

  Widget _boardView() {
    final direct = _board.where((l) => l['is_direct'] == true).toList();
    final open = _board.where((l) => l['is_direct'] != true).toList();
    final lists = [open, direct, _mine];
    final cur = lists[_tab];
    return Column(
      children: [
        _header(),
        _tabs(open.length, direct.length, _mine.length),
        Expanded(
          child: RefreshIndicator(
            color: _fbGold,
            onRefresh: _refresh,
            child: cur.isEmpty
                ? ListView(
                    children: [
                      const SizedBox(height: 120),
                      Center(
                        child: Text(
                          _tab == 2
                              ? 'No loads yet'
                              : 'No loads right now. Pull to refresh.',
                          style: const TextStyle(color: _fbMuted),
                        ),
                      ),
                    ],
                  )
                : ListView.builder(
                    padding: const EdgeInsets.fromLTRB(12, 4, 12, 24),
                    itemCount: cur.length,
                    itemBuilder: (c, i) =>
                        _tab == 2 ? _mineCard(cur[i]) : _loadCard(cur[i]),
                  ),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    Widget body;
    if (_loading) {
      body = const Center(child: CircularProgressIndicator(color: _fbGold));
    } else if (_uid == null) {
      body = _msg('Sign in as a Valkyrie to see loads.');
    } else if (_error != null) {
      body = _msg(_error!);
    } else if (_rig == null || _editRig) {
      body = _rigForm();
    } else {
      body = _boardView();
    }
    return Container(
      width: widget.width,
      height: widget.height,
      color: _fbBg,
      child: SafeArea(
        child: Stack(
          children: [
            Positioned.fill(child: body),
            if (_busy)
              const Positioned.fill(
                child: ColoredBox(
                  color: Color(0x66000000),
                  child: Center(
                    child: CircularProgressIndicator(color: _fbGold),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
