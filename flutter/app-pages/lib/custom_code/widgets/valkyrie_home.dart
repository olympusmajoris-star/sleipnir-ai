// Studio preview copy of the FlutterFlow custom widget ValkyrieHome.
// The widget code below is the app's code. Only two imports differ:
// geolocator -> fixed test location, supabase_flutter -> supabase.
import 'package:sleipnir_app_pages/backend/supabase/supabase.dart';
import 'package:sleipnir_app_pages/flutter_flow/flutter_flow_util.dart';
import 'package:flutter/material.dart';
import 'package:flutter/material.dart';

import 'dart:async';
import 'dart:convert';
import 'package:flutter/services.dart';
import 'dart:math' as math;
import 'package:http/http.dart' as http;
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart' as ll;
import 'package:sleipnir_app_pages/shims/geo.dart' as geo;

class ValkyrieHome extends StatefulWidget {
  const ValkyrieHome({
    super.key,
    this.width,
    this.height,
  });

  final double? width;
  final double? height;

  @override
  State<ValkyrieHome> createState() => _ValkyrieHomeState();
}

const Color _vhBg = Color(0xFF11151C);
const Color _vhPanel = Color(0xFF202630);
const Color _vhYellow = Color(0xFFFFC72C);
const Color _vhMuted = Color(0xFFB8C0CB);
const Color _vhGreen = Color(0xFF2FBF71);
const Color _vhRed = Color(0xFFFF7A7A);

double _vhNum(dynamic v) {
  if (v is num) return v.toDouble();
  return double.tryParse((v ?? '').toString().replaceAll('\$', '').trim()) ??
      0.0;
}

int _vhInt(dynamic v) {
  if (v is num) return v.toInt();
  return int.tryParse((v ?? '').toString().trim()) ?? 0;
}

String _vhMoney(double v) => '\$${v.toStringAsFixed(2)}';

double _vhHav(ll.LatLng a, ll.LatLng b) {
  const r = 3958.8;
  double rad(double d) => d * math.pi / 180.0;
  final dLat = rad(b.latitude - a.latitude);
  final dLon = rad(b.longitude - a.longitude);
  final x = math.sin(dLat / 2) * math.sin(dLat / 2) +
      math.cos(rad(a.latitude)) *
          math.cos(rad(b.latitude)) *
          math.sin(dLon / 2) *
          math.sin(dLon / 2);
  return 2 * r * math.asin(math.min(1.0, math.sqrt(x)));
}

ll.LatLng? _vhPt(dynamic la, dynamic lo) {
  if (la == null || lo == null) return null;
  final a = _vhNum(la);
  final b = _vhNum(lo);
  if (a == 0 || b == 0) return null;
  return ll.LatLng(a, b);
}

List<Map<String, dynamic>> _vhRows(dynamic res) {
  final out = <Map<String, dynamic>>[];
  if (res is List) {
    for (final dynamic r in res) {
      if (r is Map) out.add(Map<String, dynamic>.from(r));
    }
  }
  return out;
}

// Straight-line route miles x 1.3 for a start point, stop points and a dropoff.
double _vhRunMiles(ll.LatLng? start, List<ll.LatLng> stops, ll.LatLng? drop) {
  final pts = <ll.LatLng>[];
  if (start != null) pts.add(start);
  pts.addAll(stops);
  if (drop != null) pts.add(drop);
  double m = 0;
  for (int i = 0; i < pts.length - 1; i++) {
    m += _vhHav(pts[i], pts[i + 1]);
  }
  return m * 1.3;
}

List<ll.LatLng> _vhStopPoints(Map<String, dynamic> order) {
  final out = <ll.LatLng>[];
  final stops = order['stops'];
  if (stops is List) {
    for (final dynamic s in stops) {
      if (s is Map) {
        final p = _vhPt(s['lat'], s['lng']);
        if (p != null) out.add(p);
      }
    }
  }
  return out;
}

class _ValkyrieHomeState extends State<ValkyrieHome> {
  Timer? _timer;
  int _tick = 0;
  bool _loading = true;
  bool _busyOnline = false;
  bool _polling = false;
  String? _error;
  String? _notice;

  Map<String, dynamic>? _driver;
  Map<String, dynamic>? _active;
  List<Map<String, dynamic>> _orders = <Map<String, dynamic>>[];
  ll.LatLng? _pos;
  String? _locError;
  int _tab = 0;
  Set<String> _seen = <String>{};
  bool _seenInit = false;
  List<Map<String, dynamic>> _trips = <Map<String, dynamic>>[];
  bool _tripsLoaded = false;
  Map<String, dynamic>? _app;

  @override
  void initState() {
    super.initState();
    _boot();
    _timer = Timer.periodic(const Duration(seconds: 6), (_) => _poll());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  bool get _online => _driver?['online'] == true;

  bool get _destActive {
    final d = _driver;
    if (d == null) return false;
    if (_vhPt(d['dest_lat'], d['dest_lng']) == null) return false;
    final exp = DateTime.tryParse((d['dest_expires_at'] ?? '').toString());
    if (exp == null) return false;
    return exp.isAfter(DateTime.now());
  }

  ll.LatLng? get _destPt =>
      _destActive ? _vhPt(_driver!['dest_lat'], _driver!['dest_lng']) : null;

  // ---------------------------------------------------------------- data
  Future<void> _boot() async {
    await _loadAll();
    await _loadApp();
    if (_online || _active != null) await _updatePos();
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _poll() async {
    if (_polling || _loading) return;
    _polling = true;
    try {
      _tick++;
      await _loadAll();
      if (_tab == 1 && _tick % 5 == 0) await _loadTrips();
      if ((_online || _active != null) && _tick % 2 == 0) await _updatePos();
    } finally {
      _polling = false;
    }
  }

  Future<void> _loadAll() async {
    final user = SupaFlow.client.auth.currentUser;
    if (user == null) return;
    try {
      final dynamic row = await SupaFlow.client
          .from('drivers')
          .select()
          .eq('id', user.id)
          .maybeSingle();
      final driver = row == null ? null : Map<String, dynamic>.from(row as Map);
      Map<String, dynamic>? active;
      List<Map<String, dynamic>> orders = <Map<String, dynamic>>[];
      if (driver != null) {
        final dynamic a = await SupaFlow.client
            .from('orders')
            .select('id,status,store_name')
            .eq('driver_id', user.id)
            .inFilter('status', <String>['accepted', 'picked_up']).limit(1);
        final list = _vhRows(a);
        if (list.isNotEmpty) active = list.first;
        if (driver['online'] == true && active == null) {
          final dynamic res = await SupaFlow.client.rpc('valkyrie_open_orders');
          orders = _vhRows(res);
        }
      }
      bool newOrder = false;
      final ids = orders.map((o) => (o['id'] ?? '').toString()).toSet();
      if (_seenInit && driver != null && driver['online'] == true) {
        for (final id in ids) {
          if (!_seen.contains(id)) newOrder = true;
        }
      }
      _seen = ids;
      _seenInit = true;
      if (newOrder) {
        SystemSound.play(SystemSoundType.alert);
        HapticFeedback.heavyImpact();
      }
      if (!mounted) return;
      setState(() {
        _driver = driver;
        _active = active;
        _orders = orders;
        _error = null;
      });
    } catch (e) {
      if (mounted) setState(() => _error = 'Could not refresh. $e');
    }
  }

  Future<void> _updatePos() async {
    final user = SupaFlow.client.auth.currentUser;
    if (user == null) return;
    try {
      final enabled = await geo.Geolocator.isLocationServiceEnabled();
      if (!enabled) throw 'Turn on location so we can show orders near you.';
      var perm = await geo.Geolocator.checkPermission();
      if (perm == geo.LocationPermission.denied) {
        perm = await geo.Geolocator.requestPermission();
      }
      if (perm == geo.LocationPermission.denied ||
          perm == geo.LocationPermission.deniedForever) {
        throw 'Location is off for Sleipnir. Turn it on to take orders.';
      }
      final p = await geo.Geolocator.getCurrentPosition()
          .timeout(const Duration(seconds: 15));
      final pt = ll.LatLng(p.latitude, p.longitude);
      if (mounted) {
        setState(() {
          _pos = pt;
          _locError = null;
        });
      }
      await SupaFlow.client.from('drivers').update(<String, dynamic>{
        'last_lat': p.latitude,
        'last_lng': p.longitude,
        'last_seen_at': DateTime.now().toUtc().toIso8601String(),
      }).eq('id', user.id);
    } catch (e) {
      if (mounted) setState(() => _locError = e.toString());
    }
  }

  // ---------------------------------------------------------------- actions
  Future<void> _toggleOnline(bool v) async {
    final user = SupaFlow.client.auth.currentUser;
    if (user == null || _driver == null || _busyOnline) return;
    if (v && _docProblem() != null) {
      setState(() => _notice = _docProblem());
      return;
    }
    setState(() => _busyOnline = true);
    try {
      await SupaFlow.client
          .from('drivers')
          .update(<String, dynamic>{'online': v}).eq('id', user.id);
      if (v) await _updatePos();
      await _loadAll();
    } catch (e) {
      if (mounted) setState(() => _error = 'Could not change status. $e');
    }
    if (mounted) setState(() => _busyOnline = false);
  }

  Future<void> _openDestSheet() async {
    final res = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: _vhBg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      builder: (c) => const _VhDestSheet(),
    );
    if (res == null) return;
    final user = SupaFlow.client.auth.currentUser;
    if (user == null || _driver == null) return;
    final now = DateTime.now();
    final today =
        '${now.year}-${now.month < 10 ? '0' : ''}${now.month}-${now.day < 10 ? '0' : ''}${now.day}';
    final sameDay = (_driver!['dest_uses_date'] ?? '').toString() == today;
    final uses = sameDay ? _vhInt(_driver!['dest_uses']) : 0;
    if (uses >= 3) {
      setState(
          () => _notice = 'You have used all 3 destination trips for today.');
      return;
    }
    try {
      await SupaFlow.client.from('drivers').update(<String, dynamic>{
        'dest_lat': res['lat'],
        'dest_lng': res['lng'],
        'dest_label': res['label'],
        'dest_expires_at':
            now.add(const Duration(hours: 4)).toUtc().toIso8601String(),
        'dest_uses_date': today,
        'dest_uses': uses + 1,
      }).eq('id', user.id);
      setState(() => _notice = null);
      await _loadAll();
    } catch (e) {
      if (mounted)
        setState(() => _error = 'Could not save your destination. $e');
    }
  }

  Future<void> _clearDest() async {
    final user = SupaFlow.client.auth.currentUser;
    if (user == null) return;
    try {
      await SupaFlow.client.from('drivers').update(<String, dynamic>{
        'dest_lat': null,
        'dest_lng': null,
        'dest_label': null,
        'dest_expires_at': null,
      }).eq('id', user.id);
      await _loadAll();
    } catch (e) {
      if (mounted)
        setState(() => _error = 'Could not clear your destination. $e');
    }
  }

  Future<void> _openOffer(Map<String, dynamic> order) async {
    final result = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: _vhBg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      builder: (c) => _VhOffer(order: order, pos: _pos, dest: _destPt),
    );
    if (!mounted) return;
    if (result == 'accepted') {
      await _loadAll();
      if (!mounted) return;
      context.pushNamed('ValkyrieRun');
    } else if (result == 'taken') {
      setState(() => _notice =
          'Another Valkyrie got that one, or you already have an order.');
      await _loadAll();
    }
  }

  // ---------------------------------------------------------------- tabs, earnings, account
  Future<void> _loadApp() async {
    final user = SupaFlow.client.auth.currentUser;
    if (user == null) return;
    try {
      final dynamic r = await SupaFlow.client
          .from('valkyrie_applications')
          .select()
          .eq('id', user.id)
          .maybeSingle();
      if (mounted)
        setState(() =>
            _app = r == null ? null : Map<String, dynamic>.from(r as Map));
    } catch (_) {}
  }

  Future<void> _loadTrips() async {
    final user = SupaFlow.client.auth.currentUser;
    if (user == null) return;
    try {
      final dynamic res = await SupaFlow.client
          .from('orders')
          .select(
              'id,store_name,valkyrie_pay,tip_amount,delivery_miles,delivered_at')
          .eq('driver_id', user.id)
          .eq('status', 'delivered')
          .order('delivered_at', ascending: false)
          .limit(300);
      if (!mounted) return;
      setState(() {
        _trips = _vhRows(res);
        _tripsLoaded = true;
      });
    } catch (e) {
      if (mounted) setState(() => _error = 'Could not load your trips. $e');
    }
  }

  int? _daysTo(dynamic iso) {
    final d = DateTime.tryParse((iso ?? '').toString());
    if (d == null) return null;
    final t = DateTime.now();
    return DateTime(d.year, d.month, d.day)
        .difference(DateTime(t.year, t.month, t.day))
        .inDays;
  }

  String? _docProblem() {
    final a = _app;
    if (a == null) return null;
    final ins = _daysTo(a['insurance_expires_on']);
    final lic = _daysTo(a['license_expires_on']);
    if (ins != null && ins < 0)
      return 'Your insurance has expired. Update it to go online.';
    if (lic != null && lic < 0)
      return 'Your driver license has expired. Update it to go online.';
    return null;
  }

  Widget _docBanner() {
    final a = _app;
    if (a == null) return const SizedBox.shrink();
    final ins = _daysTo(a['insurance_expires_on']);
    final lic = _daysTo(a['license_expires_on']);
    String? msg;
    bool bad = false;
    if (_docProblem() != null) {
      msg = _docProblem();
      bad = true;
    } else if (ins != null && ins <= 30) {
      msg =
          'Your insurance expires in $ins day${ins == 1 ? '' : 's'}. Send us the new card before then.';
    } else if (lic != null && lic <= 30) {
      msg = 'Your driver license expires in $lic day${lic == 1 ? '' : 's'}.';
    }
    if (msg == null) return const SizedBox.shrink();
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: bad ? const Color(0xFF3A2226) : _vhYellow.withOpacity(0.12),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: bad ? _vhRed : _vhYellow),
      ),
      child:
          Text(msg, style: const TextStyle(color: Colors.white, fontSize: 13)),
    );
  }

  DateTime? _when(Map<String, dynamic> t) =>
      DateTime.tryParse((t['delivered_at'] ?? '').toString())?.toLocal();

  double _sumBetween(DateTime from, DateTime to) {
    double sum = 0;
    for (final t in _trips) {
      final w = _when(t);
      if (w != null && !w.isBefore(from) && w.isBefore(to))
        sum += _vhNum(t['valkyrie_pay']);
    }
    return sum;
  }

  int _countBetween(DateTime from, DateTime to) {
    int n = 0;
    for (final t in _trips) {
      final w = _when(t);
      if (w != null && !w.isBefore(from) && w.isBefore(to)) n++;
    }
    return n;
  }

  Widget _statBox(String label, String value) {
    return Expanded(
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 4),
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        decoration: _box(),
        child: Column(children: [
          Text(value,
              style: const TextStyle(
                  color: Colors.white,
                  fontSize: 17,
                  fontWeight: FontWeight.w800)),
          const SizedBox(height: 2),
          Text(label, style: const TextStyle(color: _vhMuted, fontSize: 11)),
        ]),
      ),
    );
  }

  Widget _earningsTab() {
    if (!_tripsLoaded) {
      _loadTrips();
      return const Center(child: CircularProgressIndicator(color: _vhYellow));
    }
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final tomorrow = today.add(const Duration(days: 1));
    final weekStart = today.subtract(const Duration(days: 6));
    final monthStart = DateTime(now.year, now.month, 1);
    final allStart = DateTime(2000, 1, 1);
    final weekTotal = _sumBetween(weekStart, tomorrow);
    final weekTrips = _countBetween(weekStart, tomorrow);
    final dayTotals = <double>[];
    final dayLetters = <String>[];
    const letters = <String>['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    for (int i = 6; i >= 0; i--) {
      final d = today.subtract(Duration(days: i));
      dayTotals.add(_sumBetween(d, d.add(const Duration(days: 1))));
      dayLetters.add(letters[d.weekday - 1]);
    }
    final maxDay = dayTotals.fold<double>(1.0, (a, b) => math.max(a, b));
    const months = <String>[
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec'
    ];
    final tripWidgets = <Widget>[];
    for (final t in _trips.take(40)) {
      final w = _when(t);
      final pay = _vhNum(t['valkyrie_pay']);
      final tip = _vhNum(t['tip_amount']);
      final h = w == null ? 0 : (w.hour % 12 == 0 ? 12 : w.hour % 12);
      final label = w == null
          ? ''
          : '${months[w.month - 1]} ${w.day}  -  $h:${w.minute < 10 ? '0' : ''}${w.minute} ${w.hour >= 12 ? 'PM' : 'AM'}';
      tripWidgets.add(Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(12),
        decoration: _box(),
        child: Row(children: [
          Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text((t['store_name'] ?? '').toString(),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w700)),
              const SizedBox(height: 2),
              Text(
                  '$label${_vhNum(t['delivery_miles']) > 0 ? '  -  ${_vhNum(t['delivery_miles']).toStringAsFixed(1)} mi' : ''}',
                  style: const TextStyle(color: _vhMuted, fontSize: 12)),
            ]),
          ),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text(_vhMoney(pay),
                style: const TextStyle(
                    color: _vhYellow,
                    fontSize: 16,
                    fontWeight: FontWeight.w800)),
            if (tip > 0)
              Text('tip ${_vhMoney(tip)}',
                  style: const TextStyle(color: _vhMuted, fontSize: 11)),
          ]),
        ]),
      ));
    }
    return ListView(
      padding: const EdgeInsets.fromLTRB(14, 4, 14, 24),
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: _box(),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Last 7 days',
                style: TextStyle(color: _vhMuted, fontSize: 13)),
            Text(_vhMoney(weekTotal),
                style: const TextStyle(
                    color: _vhYellow,
                    fontSize: 36,
                    fontWeight: FontWeight.w800)),
            Text('$weekTrips trip${weekTrips == 1 ? '' : 's'}',
                style: const TextStyle(color: _vhMuted, fontSize: 13)),
            const SizedBox(height: 14),
            SizedBox(
              height: 130,
              child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
                for (int i = 0; i < dayTotals.length; i++)
                  Expanded(
                    child: Column(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Text(
                              dayTotals[i] > 0
                                  ? '\$${dayTotals[i].toStringAsFixed(0)}'
                                  : '',
                              style: const TextStyle(
                                  color: _vhMuted, fontSize: 10)),
                          const SizedBox(height: 3),
                          Container(
                            margin: const EdgeInsets.symmetric(horizontal: 6),
                            height: math.max(4.0, 84.0 * dayTotals[i] / maxDay),
                            decoration: BoxDecoration(
                              color:
                                  dayTotals[i] > 0 ? _vhYellow : Colors.white12,
                              borderRadius: BorderRadius.circular(5),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(dayLetters[i],
                              style: const TextStyle(
                                  color: _vhMuted, fontSize: 11)),
                        ]),
                  ),
              ]),
            ),
          ]),
        ),
        const SizedBox(height: 10),
        Row(children: [
          _statBox('Today', _vhMoney(_sumBetween(today, tomorrow))),
          _statBox('This month', _vhMoney(_sumBetween(monthStart, tomorrow))),
          _statBox('All time', _vhMoney(_sumBetween(allStart, tomorrow))),
        ]),
        const SizedBox(height: 12),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: _box(),
          child: Row(children: [
            const Icon(Icons.account_balance_outlined,
                color: _vhMuted, size: 22),
            const SizedBox(width: 12),
            const Expanded(
              child: Text(
                  'Payouts are not connected yet. Everything you earn is tracked here, and cash-out turns on when payments go live.',
                  style:
                      TextStyle(color: _vhMuted, fontSize: 12, height: 1.35)),
            ),
          ]),
        ),
        const SizedBox(height: 16),
        const Text('Trips',
            style: TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.w800)),
        const SizedBox(height: 8),
        if (tripWidgets.isEmpty)
          const Text('No finished trips yet.',
              style: TextStyle(color: _vhMuted, fontSize: 13)),
        ...tripWidgets,
      ],
    );
  }

  Widget _docRow(String label, String value, Color c) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 7),
      child: Row(children: [
        Expanded(
            child: Text(label,
                style: const TextStyle(color: _vhMuted, fontSize: 13))),
        Flexible(
          child: Text(value,
              textAlign: TextAlign.right,
              style: TextStyle(
                  color: c, fontSize: 13, fontWeight: FontWeight.w700)),
        ),
      ]),
    );
  }

  String _docStatus(dynamic iso, List<Color> out) {
    final d = _daysTo(iso);
    if (d == null) {
      out.add(_vhMuted);
      return 'Not on file';
    }
    if (d < 0) {
      out.add(_vhRed);
      return 'Expired';
    }
    if (d <= 30) {
      out.add(_vhYellow);
      return 'Expires in $d day${d == 1 ? '' : 's'}';
    }
    out.add(_vhGreen);
    final dt = DateTime.parse(iso.toString());
    return 'Valid until ${dt.month}/${dt.day}/${dt.year}';
  }

  Widget _accountTab() {
    final a = _app;
    if (a == null) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text('No application on file for this account.',
              textAlign: TextAlign.center,
              style: TextStyle(color: _vhMuted, fontSize: 14)),
        ),
      );
    }
    final insColor = <Color>[];
    final insText = _docStatus(a['insurance_expires_on'], insColor);
    final licColor = <Color>[];
    final licText = _docStatus(a['license_expires_on'], licColor);
    final vehicle = <String>[
      (a['vehicle_color'] ?? '').toString(),
      (a['vehicle_make'] ?? '').toString(),
      (a['vehicle_model'] ?? '').toString(),
    ].where((e) => e.isNotEmpty).join(' ');
    final svc = a['service_types'] is List
        ? (a['service_types'] as List).map((e) {
            switch (e.toString()) {
              case 'food':
                return 'Food';
              case 'grocery_retail':
                return 'Grocery and retail';
              case 'virtual_shop':
                return 'Virtual shopping';
              case 'freight':
                return 'Freight';
              case 'p2p':
                return 'Marketplace and P2P';
              default:
                return e.toString();
            }
          }).join(', ')
        : '';
    return ListView(
      padding: const EdgeInsets.fromLTRB(14, 4, 14, 24),
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: _box(),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text((a['full_name'] ?? '').toString(),
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.w800)),
            const SizedBox(height: 4),
            Text(
                (a['status'] ?? '') == 'approved'
                    ? 'Approved Valkyrie'
                    : (a['status'] ?? '').toString(),
                style: const TextStyle(
                    color: _vhGreen,
                    fontSize: 13,
                    fontWeight: FontWeight.w700)),
          ]),
        ),
        const SizedBox(height: 12),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: _box(),
          child: Column(children: [
            _docRow('Vehicle', vehicle.isEmpty ? '-' : vehicle, Colors.white),
            _docRow('Plate', (a['plate'] ?? '-').toString(), Colors.white),
            _docRow('Doing', svc.isEmpty ? '-' : svc, Colors.white),
            const Divider(color: Colors.white12),
            _docRow('Insurance (${(a['insurance_company'] ?? '').toString()})',
                insText, insColor.first),
            _docRow('Driver license', licText, licColor.first),
          ]),
        ),
        const SizedBox(height: 12),
        const Text(
            'To update your insurance, license or vehicle, message Sleipnir support. You cannot go online with expired documents.',
            style: TextStyle(color: _vhMuted, fontSize: 12, height: 1.35)),
      ],
    );
  }

  Widget _bottomNav() {
    Widget item(int i, IconData icon, String label) {
      final on = _tab == i;
      return Expanded(
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: () {
            setState(() => _tab = i);
            if (i == 1) _loadTrips();
            if (i == 2) _loadApp();
          },
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 10),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              Icon(icon, color: on ? _vhYellow : _vhMuted, size: 24),
              const SizedBox(height: 2),
              Text(label,
                  style: TextStyle(
                      color: on ? _vhYellow : _vhMuted,
                      fontSize: 11,
                      fontWeight: FontWeight.w700)),
            ]),
          ),
        ),
      );
    }

    return Container(
      decoration: const BoxDecoration(
        color: _vhPanel,
        border: Border(top: BorderSide(color: Colors.white12)),
      ),
      child: Row(children: [
        item(0, Icons.list_alt, 'Orders'),
        item(1, Icons.payments_outlined, 'Earnings'),
        item(2, Icons.person_outline, 'Account'),
      ]),
    );
  }

  // ---------------------------------------------------------------- UI helpers
  Widget _pill(String label, bool filled, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
        decoration: BoxDecoration(
          color: filled ? _vhYellow : Colors.transparent,
          border: Border.all(color: filled ? _vhYellow : _vhMuted),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(label,
            style: TextStyle(
                color: filled ? Colors.black : Colors.white,
                fontSize: 13,
                fontWeight: FontWeight.w700)),
      ),
    );
  }

  BoxDecoration _box() =>
      BoxDecoration(color: _vhPanel, borderRadius: BorderRadius.circular(14));

  Widget _header() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(6, 6, 14, 6),
      child: Row(children: [
        IconButton(
          onPressed: () => Navigator.maybePop(context),
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white),
        ),
        const Expanded(
          child: Text('Valkyrie',
              style: TextStyle(
                  color: Colors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.w800)),
        ),
        Text(_online ? 'Online' : 'Offline',
            style: TextStyle(
                color: _online ? _vhGreen : _vhMuted,
                fontSize: 14,
                fontWeight: FontWeight.w700)),
        const SizedBox(width: 6),
        Switch(
          value: _online,
          activeColor: _vhYellow,
          onChanged: _busyOnline ? null : _toggleOnline,
        ),
      ]),
    );
  }

  Widget _activeCard() {
    final a = _active;
    if (a == null) return const SizedBox.shrink();
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _vhYellow.withOpacity(0.12),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _vhYellow),
      ),
      child: Row(children: [
        const Icon(Icons.directions_run, color: _vhYellow, size: 26),
        const SizedBox(width: 12),
        Expanded(
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('You have an order in progress',
                style: TextStyle(
                    color: Colors.white,
                    fontSize: 15,
                    fontWeight: FontWeight.w800)),
            Text((a['store_name'] ?? '').toString(),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: _vhMuted, fontSize: 12)),
          ]),
        ),
        _pill('Continue', true, () => context.pushNamed('ValkyrieRun')),
      ]),
    );
  }

  Widget _destCard() {
    if (_destActive) {
      final exp =
          DateTime.tryParse((_driver!['dest_expires_at'] ?? '').toString());
      final mins = exp == null ? 0 : exp.difference(DateTime.now()).inMinutes;
      final left = mins >= 60
          ? '${(mins / 60).floor()}h ${mins % 60}m left'
          : '${math.max(mins, 1)}m left';
      return Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(14),
        decoration: _box(),
        child: Row(children: [
          const Icon(Icons.flag, color: _vhYellow, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Heading to ${(_driver!['dest_label'] ?? '').toString()}',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w800)),
              Text('$left - matching orders show first',
                  style: const TextStyle(color: _vhMuted, fontSize: 12)),
            ]),
          ),
          _pill('Clear', false, _clearDest),
        ]),
      );
    }
    final now = DateTime.now();
    final today =
        '${now.year}-${now.month < 10 ? '0' : ''}${now.month}-${now.day < 10 ? '0' : ''}${now.day}';
    final used = (_driver?['dest_uses_date'] ?? '').toString() == today
        ? _vhInt(_driver?['dest_uses'])
        : 0;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: _box(),
      child: Row(children: [
        const Icon(Icons.flag_outlined, color: _vhMuted, size: 22),
        const SizedBox(width: 12),
        Expanded(
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Heading somewhere?',
                style: TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w800)),
            Text(
                'Set a destination and orders on your way show first. ${math.max(0, 3 - used)} left today.',
                style: const TextStyle(color: _vhMuted, fontSize: 12)),
          ]),
        ),
        _pill('Set', false, _openDestSheet),
      ]),
    );
  }

  double _score(Map<String, dynamic> o) {
    final stops = _vhStopPoints(o);
    final drop = _vhPt(o['dropoff_lat'], o['dropoff_lng']);
    double s = 0;
    final dest = _destPt;
    if (dest != null && drop != null && _vhHav(drop, dest) <= 4.0) s -= 1000;
    if (_pos != null && stops.isNotEmpty) s += _vhHav(_pos!, stops.first);
    return s;
  }

  bool _towardDest(Map<String, dynamic> o) {
    final dest = _destPt;
    final drop = _vhPt(o['dropoff_lat'], o['dropoff_lng']);
    return dest != null && drop != null && _vhHav(drop, dest) <= 4.0;
  }

  Widget _orderCard(Map<String, dynamic> o) {
    final stops =
        o['stops'] is List ? _vhRows(o['stops']) : <Map<String, dynamic>>[];
    final names = stops
        .map((s) => (s['name'] ?? '').toString())
        .where((n) => n.isNotEmpty)
        .toList();
    final allFood =
        stops.isNotEmpty && stops.every((s) => s['is_food'] == true);
    final pts = _vhStopPoints(o);
    final drop = _vhPt(o['dropoff_lat'], o['dropoff_lng']);
    final miles =
        _vhRunMiles(_pos ?? (pts.isNotEmpty ? pts.first : null), pts, drop);
    final pay = _vhNum(o['pay']);
    final heavy = _vhInt(o['heavy_count']);
    final tags = <Widget>[
      _tag(allFood ? 'Food' : 'Shopping', _vhYellow),
      if (_towardDest(o)) _tag('On your way', _vhGreen),
      if (heavy > 0) _tag('Heavy items', _vhRed),
      if ((o['dropoff_mode'] ?? '') == 'leave_at_door')
        _tag('Leave at door', _vhMuted),
    ];
    return GestureDetector(
      onTap: () => _openOffer(o),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: _box(),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(child: Wrap(spacing: 6, runSpacing: 6, children: tags)),
            Text(_vhMoney(pay),
                style: const TextStyle(
                    color: _vhYellow,
                    fontSize: 22,
                    fontWeight: FontWeight.w800)),
          ]),
          const SizedBox(height: 10),
          Text(
              names.isEmpty
                  ? (o['store_name'] ?? '').toString()
                  : names.join('  >  '),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                  color: Colors.white,
                  fontSize: 15,
                  fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          Text(
              '${_vhInt(o['item_qty'])} items  -  about ${miles.toStringAsFixed(1)} mi${miles > 0 ? '  -  ${_vhMoney(pay / math.max(miles, 1))}/mi' : ''}',
              style: const TextStyle(color: _vhMuted, fontSize: 13)),
        ]),
      ),
    );
  }

  Widget _tag(String t, Color c) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: c.withOpacity(0.16),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: c),
      ),
      child: Text(t,
          style:
              TextStyle(color: c, fontSize: 11, fontWeight: FontWeight.w800)),
    );
  }

  Widget _board() {
    if (_active != null) return const SizedBox.shrink();
    if (!_online) {
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: _box(),
        child: const Column(children: [
          Icon(Icons.power_settings_new, color: _vhMuted, size: 34),
          SizedBox(height: 8),
          Text('You are offline',
              style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w800)),
          SizedBox(height: 4),
          Text('Switch on at the top to see open orders.',
              textAlign: TextAlign.center,
              style: TextStyle(color: _vhMuted, fontSize: 13)),
        ]),
      );
    }
    final sorted = List<Map<String, dynamic>>.from(_orders)
      ..sort((a, b) => _score(a).compareTo(_score(b)));
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Text('Open orders (${sorted.length})',
            style: const TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.w800)),
      ),
      if (sorted.isEmpty)
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: _box(),
          child: const Text(
              'No open orders right now. New ones show up here on their own.',
              textAlign: TextAlign.center,
              style: TextStyle(color: _vhMuted, fontSize: 14)),
        ),
      for (final o in sorted) _orderCard(o),
    ]);
  }

  Widget _message(String title, String body, List<Widget> actions) {
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
          Wrap(spacing: 10, runSpacing: 10, children: actions),
        ]),
      ),
    );
  }

  Widget _body() {
    if (_loading)
      return const Center(child: CircularProgressIndicator(color: _vhYellow));
    if (SupaFlow.client.auth.currentUser == null) {
      return _message(
          'Log in first', 'Log in with your Valkyrie account.', <Widget>[
        _pill('Log in', true, () => context.pushNamed('LoginPage')),
      ]);
    }
    if (_driver == null) {
      return _message(
          'You are not a Valkyrie yet',
          'Apply first. Once you are approved, your orders show up here.',
          <Widget>[
            _pill('Apply now', true, () => context.pushNamed('BecomeValkyrie'))
          ]);
    }
    if (_driver!['active'] != true) {
      return _message(
          'Account paused',
          'Your Valkyrie account is not active. Contact Sleipnir support.',
          <Widget>[_pill('Back', true, () => Navigator.maybePop(context))]);
    }
    return Column(children: [
      _header(),
      Expanded(child: _tabContent()),
      _bottomNav(),
    ]);
  }

  Widget _tabContent() {
    if (_tab == 1) return _earningsTab();
    if (_tab == 2) return _accountTab();
    return _ordersTab();
  }

  Widget _ordersTab() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(14, 4, 14, 24),
      children: [
        _docBanner(),
        if (_notice != null)
          Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF3A2226),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: _vhRed),
            ),
            child: Text(_notice!,
                style: const TextStyle(color: Colors.white, fontSize: 13)),
          ),
        if (_locError != null && (_online || _active != null))
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Text(_locError!,
                style: const TextStyle(color: _vhRed, fontSize: 12)),
          ),
        _activeCard(),
        if (_active == null) _destCard(),
        _board(),
        if (_error != null)
          Padding(
            padding: const EdgeInsets.only(top: 12),
            child: Text(_error!,
                style: const TextStyle(color: _vhRed, fontSize: 12)),
          ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: widget.width,
      height: widget.height,
      child: ColoredBox(color: _vhBg, child: SafeArea(child: _body())),
    );
  }
}

// -------------------------------------------------------------------- offer sheet
class _VhOffer extends StatefulWidget {
  const _VhOffer({required this.order, required this.pos, required this.dest});

  final Map<String, dynamic> order;
  final ll.LatLng? pos;
  final ll.LatLng? dest;

  @override
  State<_VhOffer> createState() => _VhOfferState();
}

class _VhOfferState extends State<_VhOffer> {
  bool _busy = false;
  String? _err;

  Future<void> _accept() async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _err = null;
    });
    try {
      final dynamic ok = await SupaFlow.client.rpc('valkyrie_accept_order',
          params: <String, dynamic>{'p_order': widget.order['id'].toString()});
      if (!mounted) return;
      Navigator.pop(context, ok == true ? 'accepted' : 'taken');
    } catch (e) {
      if (mounted) {
        setState(() {
          _busy = false;
          _err = 'Could not accept. $e';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final o = widget.order;
    final stops =
        o['stops'] is List ? _vhRows(o['stops']) : <Map<String, dynamic>>[];
    final pts = _vhStopPoints(o);
    final drop = _vhPt(o['dropoff_lat'], o['dropoff_lng']);
    final pos = widget.pos;
    final line = <ll.LatLng>[];
    if (pos != null) line.add(pos);
    line.addAll(pts);
    if (drop != null) line.add(drop);
    final miles =
        _vhRunMiles(pos ?? (pts.isNotEmpty ? pts.first : null), pts, drop);
    final pay = _vhNum(o['pay']);
    final tip = _vhNum(o['tip_amount']);
    final heavy = _vhInt(o['heavy_count']);

    ll.LatLng center = ll.LatLng(29.5845, -81.2079);
    double zoom = 11;
    if (line.isNotEmpty) {
      double minLa = line.first.latitude;
      double maxLa = minLa;
      double minLo = line.first.longitude;
      double maxLo = minLo;
      for (final p in line) {
        minLa = math.min(minLa, p.latitude);
        maxLa = math.max(maxLa, p.latitude);
        minLo = math.min(minLo, p.longitude);
        maxLo = math.max(maxLo, p.longitude);
      }
      center = ll.LatLng((minLa + maxLa) / 2, (minLo + maxLo) / 2);
      final span =
          math.max(math.max(maxLa - minLa, maxLo - minLo) * 1.6, 0.004);
      zoom = (math.log(360 * 340 / (256 * span)) / math.ln2)
          .clamp(8.0, 16.0)
          .toDouble();
    }

    final markers = <Marker>[];
    for (int i = 0; i < pts.length; i++) {
      markers.add(Marker(
        point: pts[i],
        width: 34,
        height: 34,
        child: Container(
          decoration: BoxDecoration(
            color: _vhYellow,
            shape: BoxShape.circle,
            border: Border.all(color: Colors.black, width: 2),
          ),
          alignment: Alignment.center,
          child: Text('${i + 1}',
              style: const TextStyle(
                  color: Colors.black,
                  fontWeight: FontWeight.w800,
                  fontSize: 14)),
        ),
      ));
    }
    if (drop != null) {
      markers.add(Marker(
        point: drop,
        width: 44,
        height: 44,
        alignment: Alignment.topCenter,
        child:
            const Icon(Icons.home_rounded, color: Color(0xFFFF4D4D), size: 42),
      ));
    }
    if (pos != null) {
      markers.add(Marker(
        point: pos,
        width: 22,
        height: 22,
        child: Container(
          decoration: BoxDecoration(
            color: const Color(0xFF3B82F6),
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 3),
          ),
        ),
      ));
    }

    final rows = <Widget>[];
    for (int i = 0; i < stops.length; i++) {
      rows.add(Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Row(children: [
          Container(
            width: 24,
            height: 24,
            decoration:
                const BoxDecoration(color: _vhYellow, shape: BoxShape.circle),
            alignment: Alignment.center,
            child: Text('${i + 1}',
                style: const TextStyle(
                    color: Colors.black,
                    fontSize: 12,
                    fontWeight: FontWeight.w800)),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text((stops[i]['name'] ?? '').toString(),
                style: const TextStyle(color: Colors.white, fontSize: 14)),
          ),
          Text(stops[i]['is_food'] == true ? 'Pick up' : 'Shop',
              style: const TextStyle(color: _vhMuted, fontSize: 12)),
        ]),
      ));
    }
    rows.add(Row(children: [
      const Icon(Icons.home_rounded, color: _vhRed, size: 24),
      const SizedBox(width: 10),
      const Expanded(
        child: Text('Drop-off (exact address shows after you accept)',
            style: TextStyle(color: Colors.white, fontSize: 14)),
      ),
    ]));

    return SizedBox(
      height: MediaQuery.of(context).size.height * 0.88,
      child: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 8, 4),
          child: Row(children: [
            const Expanded(
              child: Text('Order offer',
                  style: TextStyle(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.w800)),
            ),
            IconButton(
              onPressed: () => Navigator.pop(context),
              icon: const Icon(Icons.close, color: Colors.white),
            ),
          ]),
        ),
        SizedBox(
          height: 230,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: FlutterMap(
              options: MapOptions(
                initialCenter: center,
                initialZoom: zoom,
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
                    Polyline(points: line, strokeWidth: 4, color: _vhYellow),
                  ]),
                MarkerLayer(markers: markers),
              ],
            ),
          ),
        ),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
            children: [
              Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
                Text(_vhMoney(pay),
                    style: const TextStyle(
                        color: _vhYellow,
                        fontSize: 34,
                        fontWeight: FontWeight.w800)),
                const SizedBox(width: 10),
                Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Text(
                      tip > 0 ? 'includes ${_vhMoney(tip)} tip' : 'no tip yet',
                      style: const TextStyle(color: _vhMuted, fontSize: 13)),
                ),
              ]),
              const SizedBox(height: 4),
              Text(
                  'About ${miles.toStringAsFixed(1)} mi  -  ${_vhMoney(pay / math.max(miles, 1))} per mile  -  ${_vhInt(o['item_qty'])} items',
                  style: const TextStyle(color: _vhMuted, fontSize: 13)),
              if (widget.dest != null &&
                  drop != null &&
                  _vhHav(drop, widget.dest!) <= 4.0)
                const Padding(
                  padding: EdgeInsets.only(top: 6),
                  child: Text('This one ends near your destination.',
                      style: TextStyle(
                          color: _vhGreen,
                          fontSize: 13,
                          fontWeight: FontWeight.w700)),
                ),
              if (heavy > 0)
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(
                      'Includes $heavy heavy item${heavy == 1 ? '' : 's'} (30+ lbs).',
                      style: const TextStyle(
                          color: _vhRed,
                          fontSize: 13,
                          fontWeight: FontWeight.w700)),
                ),
              if ((o['dropoff_mode'] ?? '') == 'leave_at_door')
                const Padding(
                  padding: EdgeInsets.only(top: 6),
                  child: Text(
                      'Customer wants it left at the door. A photo is required.',
                      style: TextStyle(color: _vhMuted, fontSize: 13)),
                ),
              const SizedBox(height: 16),
              ...rows,
              if (_err != null)
                Padding(
                  padding: const EdgeInsets.only(top: 10),
                  child: Text(_err!,
                      style: const TextStyle(color: _vhRed, fontSize: 13)),
                ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 6, 16, 16),
          child: SizedBox(
            width: double.infinity,
            height: 54,
            child: ElevatedButton(
              onPressed: _busy ? null : _accept,
              style: ElevatedButton.styleFrom(
                backgroundColor: _vhYellow,
                foregroundColor: Colors.black,
                disabledBackgroundColor: Colors.white12,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
              ),
              child: _busy
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.black),
                    )
                  : const Text('Accept order',
                      style:
                          TextStyle(fontWeight: FontWeight.w800, fontSize: 17)),
            ),
          ),
        ),
      ]),
    );
  }
}

// -------------------------------------------------------------------- destination sheet
class _VhDestSheet extends StatefulWidget {
  const _VhDestSheet();

  @override
  State<_VhDestSheet> createState() => _VhDestSheetState();
}

class _VhDestSheetState extends State<_VhDestSheet> {
  final TextEditingController _ctl = TextEditingController();
  Timer? _debounce;
  List<Map<String, dynamic>> _results = <Map<String, dynamic>>[];
  bool _busy = false;

  static const List<List<dynamic>> _quick = <List<dynamic>>[
    <dynamic>['Palm Coast', 29.5845, -81.2079],
    <dynamic>['Daytona Beach', 29.2108, -81.0228],
    <dynamic>['Port Orange', 29.1383, -81.0065],
    <dynamic>['Ormond Beach', 29.2858, -81.0559],
    <dynamic>['Bunnell', 29.4663, -81.2576],
    <dynamic>['Flagler Beach', 29.4749, -81.1273],
  ];

  @override
  void dispose() {
    _debounce?.cancel();
    _ctl.dispose();
    super.dispose();
  }

  void _changed(String q) {
    _debounce?.cancel();
    final t = q.trim();
    if (t.length < 3) {
      setState(() => _results = <Map<String, dynamic>>[]);
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 700), () => _search(t));
  }

  Future<void> _search(String t) async {
    setState(() => _busy = true);
    try {
      final uri = Uri.https('nominatim.openstreetmap.org', '/search', {
        'q': t,
        'format': 'jsonv2',
        'limit': '5',
        'countrycodes': 'us',
        'viewbox': '-83.5,31.0,-80.0,28.0',
      });
      final res = await http.get(uri, headers: {
        'Accept': 'application/json',
        'User-Agent': 'SleipnirApp/1.0',
      }).timeout(const Duration(seconds: 12));
      final out = <Map<String, dynamic>>[];
      if (res.statusCode == 200) {
        final list = jsonDecode(res.body);
        if (list is List) {
          for (final dynamic m in list) {
            final la = double.tryParse((m['lat'] ?? '').toString());
            final lo = double.tryParse((m['lon'] ?? '').toString());
            if (la == null || lo == null) continue;
            out.add(<String, dynamic>{
              'label': (m['display_name'] ?? '')
                  .toString()
                  .split(',')
                  .take(2)
                  .join(',')
                  .trim(),
              'lat': la,
              'lng': lo,
            });
          }
        }
      }
      if (mounted) setState(() => _results = out);
    } catch (_) {}
    if (mounted) setState(() => _busy = false);
  }

  Widget _row(String label, double la, double lo) {
    return GestureDetector(
      onTap: () => Navigator.pop(
          context, <String, dynamic>{'label': label, 'lat': la, 'lng': lo}),
      child: Container(
        width: double.infinity,
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
            color: _vhPanel, borderRadius: BorderRadius.circular(12)),
        child: Row(children: [
          const Icon(Icons.place_outlined, color: _vhYellow, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(label,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: Colors.white, fontSize: 14)),
          ),
        ]),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).viewInsets.bottom;
    return SizedBox(
      height: MediaQuery.of(context).size.height * 0.8,
      child: Padding(
        padding: EdgeInsets.fromLTRB(16, 12, 16, 12 + bottom),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            const Expanded(
              child: Text('Where are you headed?',
                  style: TextStyle(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.w800)),
            ),
            IconButton(
              onPressed: () => Navigator.pop(context),
              icon: const Icon(Icons.close, color: Colors.white),
            ),
          ]),
          const Text(
              'Orders ending within 4 miles of here show first for the next 4 hours.',
              style: TextStyle(color: _vhMuted, fontSize: 12)),
          const SizedBox(height: 12),
          TextField(
            controller: _ctl,
            onChanged: _changed,
            style: const TextStyle(color: Colors.white, fontSize: 15),
            decoration: InputDecoration(
              hintText: 'Search a city or address',
              hintStyle: const TextStyle(color: _vhMuted),
              prefixIcon: const Icon(Icons.search, color: _vhMuted),
              suffixIcon: _busy
                  ? const Padding(
                      padding: EdgeInsets.all(12),
                      child: SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: _vhYellow)),
                    )
                  : null,
              filled: true,
              fillColor: _vhPanel,
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(vertical: 14),
              border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none),
            ),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: ListView(children: [
              for (final r in _results)
                _row((r['label'] ?? '').toString(), _vhNum(r['lat']),
                    _vhNum(r['lng'])),
              if (_results.isEmpty) ...[
                const Padding(
                  padding: EdgeInsets.only(bottom: 8),
                  child: Text('Quick picks',
                      style: TextStyle(color: _vhMuted, fontSize: 12)),
                ),
                for (final q in _quick)
                  _row(q[0].toString(), (q[1] as num).toDouble(),
                      (q[2] as num).toDouble()),
              ],
            ]),
          ),
        ]),
      ),
    );
  }
}