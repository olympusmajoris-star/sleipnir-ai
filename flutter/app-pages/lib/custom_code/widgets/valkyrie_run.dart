// Studio preview copy of the FlutterFlow custom widget ValkyrieRun.
// The widget code below is the app's code. Only two imports differ:
// geolocator -> fixed test location, supabase_flutter -> supabase.
import 'package:sleipnir_app_pages/backend/supabase/supabase.dart';
import 'package:sleipnir_app_pages/flutter_flow/flutter_flow_util.dart';
import 'package:flutter/material.dart';

import 'package:flutter/material.dart';

import 'dart:async';
import 'dart:math' as math;
import 'dart:typed_data';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart' as ll;
import 'package:sleipnir_app_pages/shims/geo.dart' as geo;
import 'package:image_picker/image_picker.dart' as ip;
import 'package:supabase/supabase.dart' as sb;

class ValkyrieRun extends StatefulWidget {
  const ValkyrieRun({
    super.key,
    this.width,
    this.height,
  });

  final double? width;
  final double? height;

  @override
  State<ValkyrieRun> createState() => _ValkyrieRunState();
}

const Color _vrBg = Color(0xFF11151C);
const Color _vrPanel = Color(0xFF202630);
const Color _vrYellow = Color(0xFFFFC72C);
const Color _vrMuted = Color(0xFFB8C0CB);
const Color _vrGreen = Color(0xFF2FBF71);
const Color _vrRed = Color(0xFFFF7A7A);

double _vrNum(dynamic v) {
  if (v is num) return v.toDouble();
  return double.tryParse((v ?? '')
          .toString()
          .replaceAll('\$', '')
          .replaceAll(',', '')
          .trim()) ??
      0.0;
}

int _vrInt(dynamic v) {
  if (v is num) return v.toInt();
  return int.tryParse((v ?? '').toString().trim()) ?? 0;
}

double _vrR2(double v) => (v * 100).round() / 100.0;

String _vrMoney(double v) => '\$${v.toStringAsFixed(2)}';

String _vrClock(String iso) {
  final d = DateTime.tryParse(iso)?.toLocal();
  if (d == null) return '';
  final h = d.hour % 12 == 0 ? 12 : d.hour % 12;
  final m = d.minute < 10 ? '0${d.minute}' : '${d.minute}';
  return '$h:$m ${d.hour >= 12 ? 'PM' : 'AM'}';
}

ll.LatLng? _vrPt(dynamic la, dynamic lo) {
  if (la == null || lo == null) return null;
  final a = _vrNum(la);
  final b = _vrNum(lo);
  if (a == 0 || b == 0) return null;
  return ll.LatLng(a, b);
}

List<Map<String, dynamic>> _vrRows(dynamic res) {
  final out = <Map<String, dynamic>>[];
  if (res is List) {
    for (final dynamic r in res) {
      if (r is Map) out.add(Map<String, dynamic>.from(r));
    }
  }
  return out;
}

class _VrPhoto {
  _VrPhoto(this.bytes, this.ext);
  final Uint8List bytes;
  final String ext;
}

class _ValkyrieRunState extends State<ValkyrieRun> {
  final MapController _map = MapController();
  final ll.LatLng _palmCoast = ll.LatLng(29.5845, -81.2079);
  final TextEditingController _receiptCtl = TextEditingController();
  Timer? _pollTimer;
  Timer? _locTimer;
  bool _loading = true;
  bool _polling = false;
  bool _busy = false;
  bool _fitted = false;
  bool _done = false;
  String? _error;

  Map<String, dynamic>? _order;
  List<Map<String, dynamic>> _stops = <Map<String, dynamic>>[];
  List<Map<String, dynamic>> _items = <Map<String, dynamic>>[];
  Map<String, Map<String, dynamic>> _stores = <String, Map<String, dynamic>>{};
  int _unread = 0;
  ll.LatLng? _pos;

  String _receiptForStop = '';
  _VrPhoto? _receiptPhoto;
  _VrPhoto? _deliveryPhoto;
  double _earned = 0;

  @override
  void initState() {
    super.initState();
    _load();
    _pollTimer = Timer.periodic(const Duration(seconds: 4), (_) => _load());
    _locTimer =
        Timer.periodic(const Duration(seconds: 6), (_) => _pushLocation());
    _pushLocation();
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _locTimer?.cancel();
    _receiptCtl.dispose();
    super.dispose();
  }

  // ---------------------------------------------------------------- data
  Future<void> _load() async {
    if (_polling || _done) return;
    final user = SupaFlow.client.auth.currentUser;
    if (user == null) {
      if (mounted) setState(() => _loading = false);
      return;
    }
    _polling = true;
    try {
      Map<String, dynamic>? order;
      if (_order == null) {
        final dynamic res = await SupaFlow.client
            .from('orders')
            .select()
            .eq('driver_id', user.id)
            .inFilter('status', <String>['accepted', 'picked_up'])
            .order('created_at', ascending: false)
            .limit(1);
        final list = _vrRows(res);
        if (list.isNotEmpty) order = list.first;
      } else {
        final dynamic res = await SupaFlow.client
            .from('orders')
            .select()
            .eq('id', _order!['id'].toString())
            .maybeSingle();
        if (res != null) order = Map<String, dynamic>.from(res as Map);
      }
      if (order == null) {
        if (mounted) {
          setState(() {
            _order = null;
            _loading = false;
          });
        }
        return;
      }
      final id = order['id'].toString();
      final stopsRes = await SupaFlow.client
          .from('order_stops')
          .select()
          .eq('order_id', id)
          .order('stop_index', ascending: true);
      final itemsRes = await SupaFlow.client
          .from('order_items')
          .select()
          .eq('order_id', id)
          .order('created_at', ascending: true);
      final msgRes = await SupaFlow.client
          .from('order_messages')
          .select('id,sender,read_at')
          .eq('order_id', id);
      final stops = _vrRows(stopsRes);
      if (_stores.isEmpty && stops.isNotEmpty) {
        final ids = stops
            .map((s) => (s['store_id'] ?? '').toString())
            .where((s) => s.isNotEmpty)
            .toSet()
            .toList();
        if (ids.isNotEmpty) {
          final dynamic sres = await SupaFlow.client
              .from('stores')
              .select('id,name,address')
              .inFilter('id', ids);
          for (final r in _vrRows(sres)) {
            _stores[(r['id'] ?? '').toString()] = r;
          }
        }
      }
      int unread = 0;
      for (final m in _vrRows(msgRes)) {
        if ((m['sender'] ?? '') == 'customer' && m['read_at'] == null) unread++;
      }
      if (!mounted) return;
      setState(() {
        _order = order;
        _stops = stops;
        _items = _vrRows(itemsRes);
        _unread = unread;
        _loading = false;
        _error = null;
      });
      if (!_fitted) {
        _fitted = true;
        _fitView();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Could not refresh. $e';
          _loading = false;
        });
      }
    } finally {
      _polling = false;
    }
  }

  Future<void> _pushLocation() async {
    final user = SupaFlow.client.auth.currentUser;
    if (user == null || _done) return;
    try {
      final enabled = await geo.Geolocator.isLocationServiceEnabled();
      if (!enabled) return;
      var perm = await geo.Geolocator.checkPermission();
      if (perm == geo.LocationPermission.denied) {
        perm = await geo.Geolocator.requestPermission();
      }
      if (perm == geo.LocationPermission.denied ||
          perm == geo.LocationPermission.deniedForever) {
        return;
      }
      final p = await geo.Geolocator.getCurrentPosition()
          .timeout(const Duration(seconds: 12));
      if (mounted) setState(() => _pos = ll.LatLng(p.latitude, p.longitude));
      final stamp = DateTime.now().toUtc().toIso8601String();
      if (_order != null) {
        await SupaFlow.client.from('orders').update(<String, dynamic>{
          'driver_lat': p.latitude,
          'driver_lng': p.longitude,
          'driver_location_at': stamp,
        }).eq('id', _order!['id'].toString());
      }
      await SupaFlow.client.from('drivers').update(<String, dynamic>{
        'last_lat': p.latitude,
        'last_lng': p.longitude,
        'last_seen_at': stamp,
      }).eq('id', user.id);
    } catch (_) {}
  }

  // ---------------------------------------------------------------- derived
  String get _status => (_order?['status'] ?? '').toString();

  Map<String, dynamic>? get _currentStop {
    for (final s in _stops) {
      final st = (s['status'] ?? '').toString();
      if (st == 'pending' || st == 'shopping') return s;
    }
    return null;
  }

  String get _stage {
    if (_done || _status == 'delivered') return 'done';
    if (_status == 'picked_up') return 'deliver';
    final cur = _currentStop;
    if (cur == null) return 'start_delivery';
    return (cur['status'] ?? '') == 'shopping' ? 'shop' : 'goto';
  }

  List<Map<String, dynamic>> _itemsFor(Map<String, dynamic> stop) {
    final sid = (stop['id'] ?? '').toString();
    return _items.where((i) => (i['stop_id'] ?? '').toString() == sid).toList();
  }

  ll.LatLng? get _dropPt =>
      _vrPt(_order?['dropoff_lat'], _order?['dropoff_lng']);

  String get _subPref => (_order?['sub_preference'] ?? 'best_match').toString();

  bool get _leaveAtDoor => (_order?['dropoff_mode'] ?? '') == 'leave_at_door';

  double _itemCost(Map<String, dynamic> it) {
    final status = (it['status'] ?? '').toString();
    final qty = _vrInt(it['qty']);
    final unit = _vrNum(it['unit_price']);
    if (status == 'refunded') return 0;
    if (status == 'swapped') {
      final sp = _vrNum(it['sub_price']);
      return (sp > 0 ? sp : unit) * qty;
    }
    return unit * qty;
  }

  double _finalTotal() {
    double sum = 0;
    for (final s in _stops) {
      final rt = _vrNum(s['receipt_total']);
      if (s['is_food'] != true && rt > 0) {
        sum += rt;
        continue;
      }
      for (final it in _itemsFor(s)) {
        sum += _itemCost(it);
      }
    }
    sum += _vrNum(_order?['delivery_fee']) + _vrNum(_order?['tip_amount']);
    return _vrR2(sum);
  }

  // ---------------------------------------------------------------- map
  List<ll.LatLng> _remainingPoints() {
    final pts = <ll.LatLng>[];
    for (final s in _stops) {
      final st = (s['status'] ?? '').toString();
      if (st == 'done' || st == 'skipped') continue;
      final p = _vrPt(s['lat'], s['lng']);
      if (p != null) pts.add(p);
    }
    final d = _dropPt;
    if (d != null) pts.add(d);
    return pts;
  }

  void _fitView() {
    final pts = <ll.LatLng>[..._remainingPoints()];
    if (_pos != null) pts.add(_pos!);
    if (pts.isEmpty) return;
    double minLa = pts.first.latitude;
    double maxLa = minLa;
    double minLo = pts.first.longitude;
    double maxLo = minLo;
    for (final p in pts) {
      minLa = math.min(minLa, p.latitude);
      maxLa = math.max(maxLa, p.latitude);
      minLo = math.min(minLo, p.longitude);
      maxLo = math.max(maxLo, p.longitude);
    }
    final span = math.max(math.max(maxLa - minLa, maxLo - minLo) * 1.8, 0.004);
    final z = (math.log(360 * 340 / (256 * span)) / math.ln2)
        .clamp(8.0, 16.0)
        .toDouble();
    final center =
        ll.LatLng((minLa + maxLa) / 2 - span * 0.2, (minLo + maxLo) / 2);
    try {
      _map.move(center, z);
    } catch (_) {}
  }

  Widget _mapLayer() {
    final markers = <Marker>[];
    int idx = 0;
    for (final s in _stops) {
      idx++;
      final p = _vrPt(s['lat'], s['lng']);
      if (p == null) continue;
      final done = (s['status'] ?? '') == 'done';
      markers.add(Marker(
        point: p,
        width: 34,
        height: 34,
        child: Container(
          decoration: BoxDecoration(
            color: done ? _vrGreen : _vrYellow,
            shape: BoxShape.circle,
            border: Border.all(color: Colors.black, width: 2),
          ),
          alignment: Alignment.center,
          child: done
              ? const Icon(Icons.check, size: 18, color: Colors.black)
              : Text('$idx',
                  style: const TextStyle(
                      color: Colors.black,
                      fontWeight: FontWeight.w800,
                      fontSize: 14)),
        ),
      ));
    }
    final d = _dropPt;
    if (d != null) {
      markers.add(Marker(
        point: d,
        width: 44,
        height: 44,
        alignment: Alignment.topCenter,
        child:
            const Icon(Icons.home_rounded, color: Color(0xFFFF4D4D), size: 42),
      ));
    }
    if (_pos != null) {
      markers.add(Marker(
        point: _pos!,
        width: 24,
        height: 24,
        child: Container(
          decoration: BoxDecoration(
            color: const Color(0xFF3B82F6),
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 3),
          ),
        ),
      ));
    }
    final line = <ll.LatLng>[];
    if (_pos != null) line.add(_pos!);
    line.addAll(_remainingPoints());
    ll.LatLng start = _palmCoast;
    final rp = _remainingPoints();
    if (rp.isNotEmpty) start = rp.first;
    return FlutterMap(
      mapController: _map,
      options: MapOptions(
        initialCenter: start,
        initialZoom: 13,
        interactionOptions: const InteractionOptions(
            flags: InteractiveFlag.all & ~InteractiveFlag.rotate),
      ),
      children: [
        TileLayer(
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          userAgentPackageName: 'com.sleipnir.app',
        ),
        if (line.length >= 2)
          PolylineLayer(polylines: [
            Polyline(points: line, strokeWidth: 4, color: _vrYellow),
          ]),
        MarkerLayer(markers: markers),
      ],
    );
  }

  String _mapsUrl(List<ll.LatLng> pts) {
    final dest = pts.last;
    final b = StringBuffer(
        'https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=${dest.latitude},${dest.longitude}');
    if (pts.length > 1) {
      final way = pts
          .sublist(0, pts.length - 1)
          .take(9)
          .map((p) => '${p.latitude},${p.longitude}')
          .join('%7C');
      b.write('&waypoints=$way');
    }
    return b.toString();
  }

  Future<void> _navigate(List<ll.LatLng> pts) async {
    if (pts.isEmpty) {
      setState(() => _error = 'No map location for that stop.');
      return;
    }
    await launchURL(_mapsUrl(pts));
  }

  // ---------------------------------------------------------------- photos
  Future<_VrPhoto?> _pickPhoto() async {
    final src = await showModalBottomSheet<ip.ImageSource>(
      context: context,
      backgroundColor: _vrPanel,
      builder: (c) => SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          ListTile(
            leading: const Icon(Icons.photo_camera, color: _vrYellow),
            title: const Text('Take a photo',
                style: TextStyle(color: Colors.white)),
            onTap: () => Navigator.pop(c, ip.ImageSource.camera),
          ),
          ListTile(
            leading: const Icon(Icons.photo_library, color: _vrYellow),
            title: const Text('Choose from your photos',
                style: TextStyle(color: Colors.white)),
            onTap: () => Navigator.pop(c, ip.ImageSource.gallery),
          ),
        ]),
      ),
    );
    if (src == null) return null;
    try {
      final x = await ip.ImagePicker()
          .pickImage(source: src, maxWidth: 1800, imageQuality: 82);
      if (x == null) return null;
      final bytes = await x.readAsBytes();
      return _VrPhoto(
          bytes, x.name.toLowerCase().endsWith('.png') ? 'png' : 'jpg');
    } catch (e) {
      if (mounted) setState(() => _error = 'Could not get that photo. $e');
      return null;
    }
  }

  Future<String> _upload(String path, _VrPhoto p) async {
    await SupaFlow.client.storage.from('order-photos').uploadBinary(
          path,
          p.bytes,
          fileOptions: sb.FileOptions(
            contentType: p.ext == 'png' ? 'image/png' : 'image/jpeg',
            upsert: true,
          ),
        );
    return path;
  }

  // ---------------------------------------------------------------- actions
  Future<void> _run(Future<void> Function() job) async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await job();
      await _load();
    } catch (e) {
      if (mounted) setState(() => _error = '$e');
    }
    if (mounted) setState(() => _busy = false);
  }

  Future<void> _arrive(Map<String, dynamic> stop) => _run(() async {
        final now = DateTime.now().toUtc().toIso8601String();
        await SupaFlow.client.from('order_stops').update(<String, dynamic>{
          'status': 'shopping',
          'arrived_at': now,
        }).eq('id', stop['id'].toString());
        if (_order?['shopping_started_at'] == null) {
          await SupaFlow.client
              .from('orders')
              .update(<String, dynamic>{'shopping_started_at': now}).eq(
                  'id', _order!['id'].toString());
        }
      });

  Future<void> _setItem(Map<String, dynamic> it, Map<String, dynamic> patch) =>
      _run(() async {
        final data = <String, dynamic>{
          ...patch,
          'updated_at': DateTime.now().toUtc().toIso8601String(),
        };
        await SupaFlow.client
            .from('order_items')
            .update(data)
            .eq('id', it['id'].toString());
      });

  Future<void> _markAllFound(Map<String, dynamic> stop) => _run(() async {
        for (final it in _itemsFor(stop)) {
          if ((it['status'] ?? 'pending') == 'pending') {
            await SupaFlow.client.from('order_items').update(<String, dynamic>{
              'status': 'found',
              'found_qty': _vrInt(it['qty']),
              'updated_at': DateTime.now().toUtc().toIso8601String(),
            }).eq('id', it['id'].toString());
          }
        }
      });

  Future<void> _outOfStock(Map<String, dynamic> it) async {
    if (_subPref == 'refund') {
      await _setItem(it, <String, dynamic>{
        'status': 'refunded',
        'sub_name': null,
        'sub_price': null,
      });
      return;
    }
    final res = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: _vrBg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      builder: (c) => _VrOosSheet(
        itemName: (it['item_name'] ?? '').toString(),
        askFirst: _subPref == 'text_me',
      ),
    );
    if (res == null) return;
    final subName = (res['name'] ?? '').toString().trim();
    final subPrice = _vrNum(res['price']);
    final user = SupaFlow.client.auth.currentUser;
    if (_subPref == 'text_me') {
      await _setItem(it, <String, dynamic>{
        'status': 'waiting_customer',
        'sub_name': subName.isEmpty ? null : subName,
        'sub_price': subPrice > 0 ? subPrice : null,
      });
      try {
        final body = subName.isEmpty
            ? '${it['item_name']} is out of stock. Want me to remove it and refund you? Answer in your order screen.'
            : '${it['item_name']} is out of stock. Swap for $subName${subPrice > 0 ? ' (${_vrMoney(subPrice)})' : ''}? Answer in your order screen.';
        await SupaFlow.client.from('order_messages').insert(<String, dynamic>{
          'order_id': _order!['id'].toString(),
          'sender': 'driver',
          'sender_id': user?.id,
          'body': body,
        });
      } catch (_) {}
      return;
    }
    if (subName.isEmpty) {
      await _setItem(it, <String, dynamic>{
        'status': 'refunded',
        'sub_name': null,
        'sub_price': null,
      });
    } else {
      await _setItem(it, <String, dynamic>{
        'status': 'swapped',
        'sub_name': subName,
        'sub_price': subPrice > 0 ? subPrice : null,
      });
    }
  }

  Future<void> _finishStop(Map<String, dynamic> stop) => _run(() async {
        final items = _itemsFor(stop);
        for (final it in items) {
          final st = (it['status'] ?? 'pending').toString();
          if (st == 'pending') throw 'Mark every item first.';
          if (st == 'waiting_customer')
            throw 'Waiting on the customer to answer a swap.';
        }
        final data = <String, dynamic>{
          'status': 'done',
          'done_at': DateTime.now().toUtc().toIso8601String(),
        };
        if (stop['is_food'] != true) {
          final total =
              double.tryParse(_receiptCtl.text.replaceAll('\$', '').trim()) ??
                  0;
          if (_receiptPhoto == null) throw 'Take a photo of the receipt.';
          if (total <= 0) throw 'Enter the receipt total.';
          final path = await _upload(
              '${_order!['id']}/receipt_${stop['id']}.${_receiptPhoto!.ext}',
              _receiptPhoto!);
          data['receipt_photo_url'] = path;
          data['receipt_total'] = _vrR2(total);
        }
        await SupaFlow.client
            .from('order_stops')
            .update(data)
            .eq('id', stop['id'].toString());
        _receiptPhoto = null;
        _receiptCtl.clear();
        _receiptForStop = '';
      });

  Future<void> _startDelivery() => _run(() async {
        await SupaFlow.client.from('orders').update(<String, dynamic>{
          'status': 'picked_up',
          'on_the_way_at': DateTime.now().toUtc().toIso8601String(),
        }).eq('id', _order!['id'].toString());
      });

  Future<void> _deliver() => _run(() async {
        if (_leaveAtDoor && _deliveryPhoto == null) {
          throw 'Take a photo of the order at the door first.';
        }
        String? path;
        if (_deliveryPhoto != null) {
          path = await _upload(
              '${_order!['id']}/delivery.${_deliveryPhoto!.ext}',
              _deliveryPhoto!);
        }
        final total = _finalTotal();
        final pay = _vrNum(_order!['valkyrie_pay']);
        await SupaFlow.client.from('orders').update(<String, dynamic>{
          'status': 'delivered',
          'delivered_at': DateTime.now().toUtc().toIso8601String(),
          'delivery_photo_url': path,
          'final_total': total,
        }).eq('id', _order!['id'].toString());
        _pollTimer?.cancel();
        _earned = pay;
        if (mounted) setState(() => _done = true);
      });

  Future<void> _drop() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        backgroundColor: _vrPanel,
        title: const Text('Drop this order?',
            style: TextStyle(color: Colors.white)),
        content: const Text('It goes back to the board for another Valkyrie.',
            style: TextStyle(color: Colors.white70)),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(c, false),
              child: const Text('Keep it', style: TextStyle(color: _vrMuted))),
          TextButton(
              onPressed: () => Navigator.pop(c, true),
              child: const Text('Drop it', style: TextStyle(color: _vrRed))),
        ],
      ),
    );
    if (ok != true || _order == null) return;
    await _run(() async {
      final dynamic res = await SupaFlow.client.rpc('valkyrie_drop_order',
          params: <String, dynamic>{'p_order': _order!['id'].toString()});
      if (res != true) throw 'You cannot drop it after you start shopping.';
      _pollTimer?.cancel();
      if (mounted) context.goNamed('DriverDashboard');
    });
  }

  void _openChat() {
    final user = SupaFlow.client.auth.currentUser;
    if (user == null || _order == null) return;
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: _vrBg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      builder: (c) =>
          _VrChat(orderId: _order!['id'].toString(), userId: user.id),
    ).then((_) => _load());
  }

  // ---------------------------------------------------------------- UI helpers
  BoxDecoration _box() =>
      BoxDecoration(color: _vrPanel, borderRadius: BorderRadius.circular(14));

  Widget _pill(String label, bool filled, VoidCallback? onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: filled
              ? (onTap == null ? Colors.white12 : _vrYellow)
              : Colors.transparent,
          border: Border.all(color: filled ? Colors.transparent : _vrMuted),
          borderRadius: BorderRadius.circular(22),
        ),
        child: Text(label,
            style: TextStyle(
                color: filled ? Colors.black : Colors.white,
                fontSize: 13,
                fontWeight: FontWeight.w800)),
      ),
    );
  }

  Widget _big(String label, VoidCallback? onTap) {
    return SizedBox(
      width: double.infinity,
      height: 54,
      child: ElevatedButton(
        onPressed: (_busy || onTap == null) ? null : onTap,
        style: ElevatedButton.styleFrom(
          backgroundColor: _vrYellow,
          foregroundColor: Colors.black,
          disabledBackgroundColor: Colors.white12,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
        child: _busy
            ? const SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(
                    strokeWidth: 2, color: Colors.black),
              )
            : Text(label,
                style:
                    const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
      ),
    );
  }

  Widget _roundBtn(IconData icon, VoidCallback onTap, {int badge = 0}) {
    return GestureDetector(
      onTap: onTap,
      child: Stack(clipBehavior: Clip.none, children: [
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: _vrBg,
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white24),
            boxShadow: const [BoxShadow(color: Colors.black45, blurRadius: 6)],
          ),
          child: Icon(icon, color: Colors.white, size: 20),
        ),
        if (badge > 0)
          Positioned(
            right: -3,
            top: -5,
            child: Container(
              padding: const EdgeInsets.all(5),
              decoration:
                  const BoxDecoration(color: _vrRed, shape: BoxShape.circle),
              child: Text('$badge',
                  style: const TextStyle(
                      color: Colors.black,
                      fontSize: 10,
                      fontWeight: FontWeight.w800)),
            ),
          ),
      ]),
    );
  }

  Widget _photoRow(
      String title, String hint, _VrPhoto? photo, VoidCallback onPick) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.all(12),
      decoration: _box(),
      child: Row(children: [
        Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
              color: Colors.black26, borderRadius: BorderRadius.circular(10)),
          child: photo != null
              ? ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: Image.memory(photo.bytes, fit: BoxFit.cover),
                )
              : const Icon(Icons.add_a_photo, color: _vrMuted, size: 26),
        ),
        const SizedBox(width: 12),
        Expanded(
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title,
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w700)),
            Text(photo != null ? 'Photo added' : hint,
                style: TextStyle(
                    color: photo != null ? _vrGreen : _vrMuted, fontSize: 12)),
          ]),
        ),
        _pill(photo == null ? 'Add' : 'Retake', false, onPick),
      ]),
    );
  }

  Widget _itemRow(Map<String, dynamic> it) {
    final status = (it['status'] ?? 'pending').toString();
    final qty = _vrInt(it['qty']);
    final name = (it['item_name'] ?? '').toString();
    final unit = _vrNum(it['unit_price']);
    final subName = (it['sub_name'] ?? '').toString();
    final subPrice = _vrNum(it['sub_price']);
    Widget state;
    switch (status) {
      case 'found':
        state = const Text('Found',
            style: TextStyle(
                color: _vrGreen, fontSize: 12, fontWeight: FontWeight.w800));
        break;
      case 'swapped':
        state = Text(
            'Swapped${subName.isEmpty ? '' : ' for $subName'}${subPrice > 0 ? ' (${_vrMoney(subPrice)})' : ''}',
            style: const TextStyle(
                color: _vrYellow, fontSize: 12, fontWeight: FontWeight.w700));
        break;
      case 'refunded':
        state = const Text('Removed, customer refunded',
            style: TextStyle(
                color: _vrRed, fontSize: 12, fontWeight: FontWeight.w700));
        break;
      case 'waiting_customer':
        state = Text(
            'Waiting for the customer${subName.isEmpty ? '' : ' - swap: $subName'}',
            style: const TextStyle(
                color: _vrYellow, fontSize: 12, fontWeight: FontWeight.w700));
        break;
      default:
        state = const SizedBox.shrink();
    }
    final pending = status == 'pending';
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(
            child: Text('${qty}x $name',
                style: TextStyle(
                    color: status == 'refunded' ? _vrMuted : Colors.white,
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    decoration: status == 'refunded'
                        ? TextDecoration.lineThrough
                        : TextDecoration.none)),
          ),
          Text(_vrMoney(unit * qty),
              style: const TextStyle(color: _vrMuted, fontSize: 13)),
        ]),
        const SizedBox(height: 4),
        if (pending)
          Wrap(spacing: 8, runSpacing: 8, children: [
            _pill(
                'Found',
                true,
                _busy
                    ? null
                    : () => _setItem(it, <String, dynamic>{
                          'status': 'found',
                          'found_qty': qty
                        })),
            _pill('Out of stock', false, _busy ? null : () => _outOfStock(it)),
          ])
        else
          Row(children: [
            Expanded(child: state),
            if (status != 'waiting_customer')
              GestureDetector(
                onTap: _busy
                    ? null
                    : () => _setItem(it, <String, dynamic>{
                          'status': 'pending',
                          'sub_name': null,
                          'sub_price': null,
                          'found_qty': null,
                        }),
                child: const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  child: Text('Change',
                      style: TextStyle(color: _vrMuted, fontSize: 12)),
                ),
              ),
          ]),
      ]),
    );
  }

  // ---------------------------------------------------------------- stage panels
  Widget _stageGoto(Map<String, dynamic> stop) {
    final store = _stores[(stop['store_id'] ?? '').toString()];
    final addr = (store?['address'] ?? '').toString();
    final name = (stop['store_name'] ?? '').toString();
    final p = _vrPt(stop['lat'], stop['lng']);
    final isFood = stop['is_food'] == true;
    final items = _itemsFor(stop);
    final qty = items.fold<int>(0, (a, i) => a + _vrInt(i['qty']));
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('Head to $name',
          style: const TextStyle(
              color: Colors.white, fontSize: 21, fontWeight: FontWeight.w800)),
      if (addr.isNotEmpty)
        Padding(
          padding: const EdgeInsets.only(top: 4),
          child:
              Text(addr, style: const TextStyle(color: _vrMuted, fontSize: 13)),
        ),
      Padding(
        padding: const EdgeInsets.only(top: 6),
        child: Text('$qty items  -  ${isFood ? 'pick up' : 'shop'}',
            style: const TextStyle(color: _vrMuted, fontSize: 13)),
      ),
      const SizedBox(height: 14),
      Wrap(spacing: 8, runSpacing: 8, children: [
        _pill('Navigate here', true,
            p == null ? null : () => _navigate(<ll.LatLng>[p])),
        _pill('Whole route', false, () => _navigate(_remainingPoints())),
      ]),
      const SizedBox(height: 14),
      _big(
          isFood
              ? 'I am here - pick up the order'
              : 'I am here - start shopping',
          () => _arrive(stop)),
    ]);
  }

  Widget _stageShop(Map<String, dynamic> stop) {
    final name = (stop['store_name'] ?? '').toString();
    final isFood = stop['is_food'] == true;
    final items = _itemsFor(stop);
    final sid = (stop['id'] ?? '').toString();
    if (_receiptForStop != sid) {
      _receiptForStop = sid;
      _receiptPhoto = null;
      _receiptCtl.clear();
    }
    final anyPending =
        items.any((i) => (i['status'] ?? 'pending') == 'pending');
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(isFood ? 'Picking up at $name' : 'Shopping at $name',
          style: const TextStyle(
              color: Colors.white, fontSize: 21, fontWeight: FontWeight.w800)),
      const SizedBox(height: 6),
      Row(children: [
        Expanded(
          child: Text(
              _subPref == 'best_match'
                  ? 'If something is out, pick the closest match.'
                  : (_subPref == 'refund'
                      ? 'If something is out, remove it. The customer is refunded.'
                      : 'If something is out, ask the customer before swapping.'),
              style: const TextStyle(color: _vrMuted, fontSize: 12)),
        ),
        if (anyPending) _pill('All found', false, () => _markAllFound(stop)),
      ]),
      Container(
        width: double.infinity,
        margin: const EdgeInsets.only(top: 10),
        padding: const EdgeInsets.fromLTRB(14, 2, 14, 14),
        decoration: _box(),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          for (final it in items) _itemRow(it),
        ]),
      ),
      if (!isFood) ...[
        _photoRow('Receipt photo', 'Required before you finish this stop',
            _receiptPhoto, () async {
          final p = await _pickPhoto();
          if (p != null && mounted) setState(() => _receiptPhoto = p);
        }),
        Container(
          margin: const EdgeInsets.only(top: 10),
          child: TextField(
            controller: _receiptCtl,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            style: const TextStyle(color: Colors.white, fontSize: 16),
            decoration: InputDecoration(
              labelText: 'Receipt total',
              labelStyle: const TextStyle(color: _vrMuted),
              prefixText: '\$ ',
              prefixStyle: const TextStyle(color: Colors.white),
              filled: true,
              fillColor: _vrPanel,
              isDense: true,
              contentPadding: const EdgeInsets.all(14),
              border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none),
            ),
          ),
        ),
      ],
      const SizedBox(height: 14),
      _big(isFood ? 'Order picked up' : 'Done shopping here',
          () => _finishStop(stop)),
    ]);
  }

  Widget _stageStartDelivery() {
    final p = _dropPt;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('All stops done',
          style: TextStyle(
              color: Colors.white, fontSize: 21, fontWeight: FontWeight.w800)),
      const SizedBox(height: 4),
      const Text('Head to the customer now.',
          style: TextStyle(color: _vrMuted, fontSize: 13)),
      const SizedBox(height: 14),
      _big('Start delivery', _startDelivery),
      if (p != null)
        Padding(
          padding: const EdgeInsets.only(top: 10),
          child: _pill('Navigate to the customer', false,
              () => _navigate(<ll.LatLng>[p])),
        ),
    ]);
  }

  Widget _stageDeliver() {
    final addr = (_order?['dropoff_address'] ?? '').toString();
    final p = _dropPt;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('Deliver to the customer',
          style: TextStyle(
              color: Colors.white, fontSize: 21, fontWeight: FontWeight.w800)),
      const SizedBox(height: 8),
      Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Icon(Icons.home_rounded, color: _vrRed, size: 22),
        const SizedBox(width: 8),
        Expanded(
          child: Text(addr.isEmpty ? 'See the map' : addr,
              style: const TextStyle(
                  color: Colors.white, fontSize: 14, height: 1.35)),
        ),
      ]),
      const SizedBox(height: 8),
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: (_leaveAtDoor ? _vrYellow : _vrMuted).withOpacity(0.15),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Text(
            _leaveAtDoor
                ? 'Leave at the door - photo required'
                : 'Hand it to the customer',
            style: TextStyle(
                color: _leaveAtDoor ? _vrYellow : _vrMuted,
                fontSize: 12,
                fontWeight: FontWeight.w800)),
      ),
      const SizedBox(height: 12),
      if (p != null)
        _pill(
            'Navigate to the customer', true, () => _navigate(<ll.LatLng>[p])),
      _photoRow(
        'Delivery photo',
        _leaveAtDoor ? 'Required - show the order at the door' : 'Optional',
        _deliveryPhoto,
        () async {
          final ph = await _pickPhoto();
          if (ph != null && mounted) setState(() => _deliveryPhoto = ph);
        },
      ),
      const SizedBox(height: 14),
      _big('Mark delivered', _deliver),
    ]);
  }

  Widget _stageDone() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Column(children: [
        const Icon(Icons.check_circle, color: _vrGreen, size: 74),
        const SizedBox(height: 12),
        const Text('Delivered!',
            style: TextStyle(
                color: Colors.white,
                fontSize: 26,
                fontWeight: FontWeight.w800)),
        const SizedBox(height: 6),
        Text(_earned > 0 ? 'You earned ${_vrMoney(_earned)}' : 'Nice work.',
            style: const TextStyle(
                color: _vrYellow, fontSize: 20, fontWeight: FontWeight.w800)),
        const SizedBox(height: 18),
        _big('Back to orders', () => context.goNamed('DriverDashboard')),
      ]),
    );
  }

  Widget _stagePanel() {
    switch (_stage) {
      case 'done':
        return _stageDone();
      case 'deliver':
        return _stageDeliver();
      case 'start_delivery':
        return _stageStartDelivery();
      case 'shop':
        return _stageShop(_currentStop!);
      default:
        return _stageGoto(_currentStop!);
    }
  }

  Widget _upNext() {
    final cur = _currentStop;
    final rest = <Map<String, dynamic>>[];
    for (final s in _stops) {
      final st = (s['status'] ?? '').toString();
      if (st == 'done' || st == 'skipped') continue;
      if (cur != null && s['id'] == cur['id']) continue;
      rest.add(s);
    }
    if (rest.isEmpty || _stage == 'done' || _stage == 'deliver')
      return const SizedBox.shrink();
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(top: 16),
      padding: const EdgeInsets.all(12),
      decoration: _box(),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Up next',
            style: TextStyle(
                color: _vrMuted, fontSize: 12, fontWeight: FontWeight.w700)),
        for (final s in rest)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Row(children: [
              Icon(s['is_food'] == true ? Icons.restaurant : Icons.storefront,
                  color: _vrYellow, size: 18),
              const SizedBox(width: 8),
              Expanded(
                child: Text((s['store_name'] ?? '').toString(),
                    style: const TextStyle(color: Colors.white, fontSize: 14)),
              ),
            ]),
          ),
      ]),
    );
  }

  Widget _sheet() {
    final pay = _vrNum(_order?['valkyrie_pay']);
    return DraggableScrollableSheet(
      initialChildSize: 0.55,
      minChildSize: 0.22,
      maxChildSize: 0.94,
      builder: (context, controller) {
        return Container(
          decoration: const BoxDecoration(
            color: _vrBg,
            borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
            boxShadow: [BoxShadow(color: Colors.black54, blurRadius: 14)],
          ),
          child: ListView(
            controller: controller,
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 30),
            children: [
              Center(
                child: Container(
                  width: 44,
                  height: 5,
                  decoration: BoxDecoration(
                      color: Colors.white24,
                      borderRadius: BorderRadius.circular(3)),
                ),
              ),
              const SizedBox(height: 10),
              if (pay > 0 && _stage != 'done')
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Text('You earn ${_vrMoney(pay)}',
                      style: const TextStyle(
                          color: _vrYellow,
                          fontSize: 14,
                          fontWeight: FontWeight.w800)),
                ),
              _stagePanel(),
              _upNext(),
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Text(_error!,
                      style: const TextStyle(color: _vrRed, fontSize: 13)),
                ),
              if (_status == 'accepted' &&
                  _order?['shopping_started_at'] == null &&
                  _stage != 'done')
                Padding(
                  padding: const EdgeInsets.only(top: 16),
                  child: Center(child: _pill('Drop this order', false, _drop)),
                ),
            ],
          ),
        );
      },
    );
  }

  Widget _message(String title, String body) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Text(title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                  color: Colors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.w800)),
          const SizedBox(height: 10),
          Text(body,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.white70, fontSize: 15)),
          const SizedBox(height: 18),
          _pill(
              'Back to orders', true, () => context.goNamed('DriverDashboard')),
        ]),
      ),
    );
  }

  Widget _body() {
    if (_loading)
      return const Center(child: CircularProgressIndicator(color: _vrYellow));
    if (SupaFlow.client.auth.currentUser == null) {
      return _message('Log in first', 'Log in with your Valkyrie account.');
    }
    if (_order == null) {
      return _message(
          'No active order', 'Pick one from the board to get started.');
    }
    return Stack(children: [
      Positioned.fill(child: _mapLayer()),
      Positioned(
        left: 12,
        top: 12,
        child: _roundBtn(
            Icons.arrow_back_ios_new, () => Navigator.maybePop(context)),
      ),
      Positioned(
        right: 12,
        top: 12,
        child: Column(children: [
          _roundBtn(Icons.chat_bubble_outline, _openChat, badge: _unread),
          const SizedBox(height: 10),
          _roundBtn(Icons.my_location, _fitView),
        ]),
      ),
      Positioned(
        left: 8,
        top: 62,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
          color: Colors.white70,
          child: const Text('© OpenStreetMap',
              style: TextStyle(color: Colors.black87, fontSize: 9)),
        ),
      ),
      Positioned.fill(child: _sheet()),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: widget.width,
      height: widget.height,
      child: ColoredBox(color: _vrBg, child: SafeArea(child: _body())),
    );
  }
}

// -------------------------------------------------------------------- out of stock sheet
class _VrOosSheet extends StatefulWidget {
  const _VrOosSheet({required this.itemName, required this.askFirst});

  final String itemName;
  final bool askFirst;

  @override
  State<_VrOosSheet> createState() => _VrOosSheetState();
}

class _VrOosSheetState extends State<_VrOosSheet> {
  final TextEditingController _name = TextEditingController();
  final TextEditingController _price = TextEditingController();

  @override
  void dispose() {
    _name.dispose();
    _price.dispose();
    super.dispose();
  }

  Widget _field(TextEditingController c, String label, {bool money = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: TextField(
        controller: c,
        keyboardType: money
            ? const TextInputType.numberWithOptions(decimal: true)
            : TextInputType.text,
        textCapitalization:
            money ? TextCapitalization.none : TextCapitalization.sentences,
        style: const TextStyle(color: Colors.white, fontSize: 15),
        decoration: InputDecoration(
          labelText: label,
          labelStyle: const TextStyle(color: _vrMuted),
          prefixText: money ? '\$ ' : null,
          prefixStyle: const TextStyle(color: Colors.white),
          filled: true,
          fillColor: _vrPanel,
          isDense: true,
          contentPadding: const EdgeInsets.all(14),
          border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(16, 14, 16, 16 + bottom),
      child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Expanded(
                child: Text('Out of stock: ${widget.itemName}',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.w800)),
              ),
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close, color: Colors.white),
              ),
            ]),
            Text(
                widget.askFirst
                    ? 'The customer wants to approve swaps. Enter what you found, or ask them to remove it.'
                    : 'Enter the closest match you found, or remove the item and refund the customer.',
                style: const TextStyle(color: _vrMuted, fontSize: 13)),
            const SizedBox(height: 14),
            _field(_name, 'Swap item (name and size)'),
            _field(_price, 'Price of the swap', money: true),
            const SizedBox(height: 4),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: () {
                  if (_name.text.trim().isEmpty) return;
                  Navigator.pop(context, <String, dynamic>{
                    'name': _name.text.trim(),
                    'price': double.tryParse(
                            _price.text.replaceAll('\$', '').trim()) ??
                        0.0,
                  });
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: _vrYellow,
                  foregroundColor: Colors.black,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
                child: Text(
                    widget.askFirst
                        ? 'Ask the customer about this swap'
                        : 'Use this swap',
                    style: const TextStyle(
                        fontWeight: FontWeight.w800, fontSize: 15)),
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: OutlinedButton(
                onPressed: () => Navigator.pop(
                    context, <String, dynamic>{'name': '', 'price': 0.0}),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: _vrMuted),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
                child: Text(
                    widget.askFirst
                        ? 'No swap - ask to remove it'
                        : 'No swap - remove and refund',
                    style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                        fontSize: 14)),
              ),
            ),
          ]),
    );
  }
}

// -------------------------------------------------------------------- chat sheet
class _VrChat extends StatefulWidget {
  const _VrChat({required this.orderId, required this.userId});

  final String orderId;
  final String userId;

  @override
  State<_VrChat> createState() => _VrChatState();
}

class _VrChatState extends State<_VrChat> {
  final TextEditingController _ctl = TextEditingController();
  final ScrollController _scroll = ScrollController();
  Timer? _timer;
  List<Map<String, dynamic>> _msgs = <Map<String, dynamic>>[];
  bool _sending = false;
  String? _err;

  @override
  void initState() {
    super.initState();
    _load();
    _timer = Timer.periodic(const Duration(seconds: 3), (_) => _load());
  }

  @override
  void dispose() {
    _timer?.cancel();
    _ctl.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final dynamic res = await SupaFlow.client
          .from('order_messages')
          .select()
          .eq('order_id', widget.orderId)
          .order('created_at', ascending: true);
      final list = _vrRows(res);
      final unreadIds = <String>[];
      for (final m in list) {
        if ((m['sender'] ?? '') == 'customer' && m['read_at'] == null) {
          unreadIds.add(m['id'].toString());
        }
      }
      if (unreadIds.isNotEmpty) {
        await SupaFlow.client.from('order_messages').update(<String, dynamic>{
          'read_at': DateTime.now().toUtc().toIso8601String()
        }).inFilter('id', unreadIds);
      }
      if (!mounted) return;
      final grew = list.length != _msgs.length;
      setState(() => _msgs = list);
      if (grew) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (_scroll.hasClients)
            _scroll.jumpTo(_scroll.position.maxScrollExtent);
        });
      }
    } catch (_) {}
  }

  Future<void> _send() async {
    final text = _ctl.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() {
      _sending = true;
      _err = null;
    });
    try {
      await SupaFlow.client.from('order_messages').insert(<String, dynamic>{
        'order_id': widget.orderId,
        'sender': 'driver',
        'sender_id': widget.userId,
        'body': text,
      });
      _ctl.clear();
      await _load();
    } catch (e) {
      if (mounted) setState(() => _err = 'Message not sent. $e');
    }
    if (mounted) setState(() => _sending = false);
  }

  Widget _bubble(Map<String, dynamic> m) {
    final sender = (m['sender'] ?? '').toString();
    final body = (m['body'] ?? '').toString();
    final time = _vrClock((m['created_at'] ?? '').toString());
    if (sender == 'system') {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Center(
            child: Text(body,
                style: const TextStyle(color: _vrMuted, fontSize: 12))),
      );
    }
    final mine = sender == 'driver';
    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints:
            BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.74),
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
        decoration: BoxDecoration(
          color: mine ? _vrYellow : _vrPanel,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              if (!mine)
                const Text('Customer',
                    style: TextStyle(
                        color: _vrYellow,
                        fontSize: 11,
                        fontWeight: FontWeight.w800)),
              Text(body,
                  style: TextStyle(
                      color: mine ? Colors.black : Colors.white, fontSize: 14)),
              const SizedBox(height: 2),
              Text(time,
                  style: TextStyle(
                      color: mine ? Colors.black54 : _vrMuted, fontSize: 10)),
            ]),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).viewInsets.bottom;
    return SizedBox(
      height: MediaQuery.of(context).size.height * 0.82,
      child: Padding(
        padding: EdgeInsets.fromLTRB(14, 10, 14, 12 + bottom),
        child: Column(children: [
          Row(children: [
            const Expanded(
              child: Text('Chat with the customer',
                  style: TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.w800)),
            ),
            IconButton(
              onPressed: () => Navigator.pop(context),
              icon: const Icon(Icons.close, color: Colors.white),
            ),
          ]),
          Expanded(
            child: _msgs.isEmpty
                ? const Center(
                    child: Text('No messages yet.',
                        style: TextStyle(color: _vrMuted, fontSize: 14)),
                  )
                : ListView.builder(
                    controller: _scroll,
                    itemCount: _msgs.length,
                    itemBuilder: (context, i) => _bubble(_msgs[i]),
                  ),
          ),
          if (_err != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Text(_err!,
                  style: const TextStyle(color: _vrRed, fontSize: 12)),
            ),
          Row(children: [
            Expanded(
              child: TextField(
                controller: _ctl,
                style: const TextStyle(color: Colors.white, fontSize: 15),
                textCapitalization: TextCapitalization.sentences,
                onSubmitted: (_) => _send(),
                decoration: InputDecoration(
                  hintText: 'Message',
                  hintStyle: const TextStyle(color: _vrMuted),
                  filled: true,
                  fillColor: _vrPanel,
                  isDense: true,
                  contentPadding: const EdgeInsets.all(14),
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(24),
                      borderSide: BorderSide.none),
                ),
              ),
            ),
            const SizedBox(width: 8),
            GestureDetector(
              onTap: _send,
              child: Container(
                width: 48,
                height: 48,
                decoration: const BoxDecoration(
                    color: _vrYellow, shape: BoxShape.circle),
                child: _sending
                    ? const Padding(
                        padding: EdgeInsets.all(13),
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.black),
                      )
                    : const Icon(Icons.send, color: Colors.black, size: 20),
              ),
            ),
          ]),
        ]),
      ),
    );
  }
}
