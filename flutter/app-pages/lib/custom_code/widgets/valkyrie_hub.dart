// Studio preview copy of the FlutterFlow custom widget ValkyrieHub.
// The widget code below is the app's code. Only two imports differ:
// geolocator -> fixed test location, supabase_flutter -> supabase.
import 'package:sleipnir_app_pages/backend/supabase/supabase.dart';
import 'package:sleipnir_app_pages/flutter_flow/flutter_flow_util.dart';
import 'package:flutter/material.dart';
import 'package:flutter/material.dart';

import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;

class ValkyrieHub extends StatefulWidget {
  const ValkyrieHub({
    super.key,
    this.width,
    this.height,
  });

  final double? width;
  final double? height;

  @override
  State<ValkyrieHub> createState() => _ValkyrieHubState();
}

const Color _vhBg = Color(0xFF11151C);
const Color _vhPanel = Color(0xFF202630);
const Color _vhYellow = Color(0xFFFFC72C);
const Color _vhMuted = Color(0xFFB8C0CB);
const Color _vhGreen = Color(0xFF2FBF71);
const Color _vhRed = Color(0xFFFF7A7A);

double _vhNum(dynamic v) {
  if (v is num) return v.toDouble();
  return double.tryParse((v ?? '')
          .toString()
          .replaceAll('\$', '')
          .replaceAll(',', '')
          .trim()) ??
      0.0;
}

int _vhInt(dynamic v) {
  if (v is num) return v.toInt();
  return int.tryParse((v ?? '').toString().trim()) ?? 0;
}

String _vhMoney(double v) => '\$${v.toStringAsFixed(2)}';

const List<String> _vhMonths = <String>[
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

const List<String> _vhWeekdays = <String>[
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
  'Sun'
];

String _vhWhen(dynamic iso) {
  final d = DateTime.tryParse((iso ?? '').toString())?.toLocal();
  if (d == null) return '';
  final h = d.hour % 12 == 0 ? 12 : d.hour % 12;
  final m = d.minute < 10 ? '0${d.minute}' : '${d.minute}';
  return '${_vhMonths[d.month - 1]} ${d.day}  -  $h:$m ${d.hour >= 12 ? 'PM' : 'AM'}';
}

String _vhDayLabel(DateTime d) =>
    '${_vhWeekdays[d.weekday - 1]}, ${_vhMonths[d.month - 1]} ${d.day}';

String _vhDateOnly(dynamic iso) {
  final d = DateTime.tryParse((iso ?? '').toString());
  if (d == null) return 'Not on file';
  return '${_vhMonths[d.month - 1]} ${d.day}, ${d.year}';
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

class _ValkyrieHubState extends State<ValkyrieHub> {
  Timer? _timer;
  int _tab = 0;
  bool _loading = true;
  String? _error;
  String? _notice;

  List<Map<String, dynamic>> _orders = <Map<String, dynamic>>[];
  List<Map<String, dynamic>> _zones = <Map<String, dynamic>>[];
  List<Map<String, dynamic>> _tickets = <Map<String, dynamic>>[];
  Map<String, dynamic>? _driver;
  Map<String, dynamic>? _app;
  final Set<String> _open = <String>{};

  @override
  void initState() {
    super.initState();
    _load();
    _timer = Timer.periodic(const Duration(seconds: 20), (_) => _load());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  // ---------------------------------------------------------------- data
  Future<void> _load() async {
    final user = SupaFlow.client.auth.currentUser;
    if (user == null) {
      if (mounted) setState(() => _loading = false);
      return;
    }
    try {
      final ordersRes = await SupaFlow.client
          .from('orders')
          .select(
              'id,status,store_name,created_at,delivered_at,valkyrie_pay,tip_amount,extra_tip,delivery_miles,rating,rating_comment,rated_at,dropoff_address')
          .eq('driver_id', user.id)
          .order('created_at', ascending: false)
          .limit(300);
      final dynamic drvRes = await SupaFlow.client
          .from('drivers')
          .select('rating_avg,rating_count')
          .eq('id', user.id)
          .maybeSingle();
      final dynamic appRes = await SupaFlow.client
          .from('valkyrie_applications')
          .select(
              'status,full_name,license_expires_on,insurance_expires_on,insurance_company,vehicle_year,vehicle_make,vehicle_model,vehicle_color,plate,reviewer_note')
          .eq('id', user.id)
          .maybeSingle();
      final tixRes = await SupaFlow.client
          .from('valkyrie_tickets')
          .select()
          .eq('valkyrie_id', user.id)
          .order('created_at', ascending: false)
          .limit(20);
      List<Map<String, dynamic>> zones = <Map<String, dynamic>>[];
      try {
        final dynamic z = await SupaFlow.client.rpc('valkyrie_hot_zones');
        dynamic zz = z;
        if (zz is String) zz = jsonDecode(zz);
        zones = _vhRows(zz);
      } catch (_) {}
      if (!mounted) return;
      setState(() {
        _orders = _vhRows(ordersRes);
        _driver =
            drvRes == null ? null : Map<String, dynamic>.from(drvRes as Map);
        _app = appRes == null ? null : Map<String, dynamic>.from(appRes as Map);
        _tickets = _vhRows(tixRes);
        _zones = zones;
        _loading = false;
        _error = null;
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Could not load your Valkyrie hub. $e';
          _loading = false;
        });
      }
    }
  }

  List<Map<String, dynamic>> get _delivered => _orders
      .where((o) => (o['status'] ?? '').toString() == 'delivered')
      .toList();

  DateTime? _doneAt(Map<String, dynamic> o) =>
      DateTime.tryParse((o['delivered_at'] ?? o['created_at'] ?? '').toString())
          ?.toLocal();

  double _sumSince(DateTime from) {
    double s = 0;
    for (final o in _delivered) {
      final t = _doneAt(o);
      if (t != null && !t.isBefore(from)) s += _vhNum(o['valkyrie_pay']);
    }
    return s;
  }

  int _countSince(DateTime from) {
    int c = 0;
    for (final o in _delivered) {
      final t = _doneAt(o);
      if (t != null && !t.isBefore(from)) c++;
    }
    return c;
  }

  Future<void> _openHelp({String? orderId}) async {
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: _vhBg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      builder: (c) => _VhHelpSheet(orderId: orderId, orders: _orders),
    );
    if (ok == true) {
      if (mounted)
        setState(
            () => _notice = 'Passed to the Sleipnir team. Replies show here.');
      _load();
    }
  }

  // ---------------------------------------------------------------- UI helpers
  BoxDecoration _box() =>
      BoxDecoration(color: _vhPanel, borderRadius: BorderRadius.circular(14));

  Widget _pill(String label, bool filled, VoidCallback? onTap) {
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

  Widget _h(String t) => Padding(
        padding: const EdgeInsets.fromLTRB(2, 18, 2, 8),
        child: Text(t,
            style: const TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.w800)),
      );

  Widget _header() {
    final titles = <String>[
      'Earnings',
      'Trips and ratings',
      'Documents',
      'Help'
    ];
    return Padding(
      padding: const EdgeInsets.fromLTRB(6, 6, 14, 6),
      child: Row(children: [
        IconButton(
          onPressed: () => Navigator.maybePop(context),
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white),
        ),
        Text(titles[_tab],
            style: const TextStyle(
                color: Colors.white,
                fontSize: 22,
                fontWeight: FontWeight.w800)),
      ]),
    );
  }

  Widget _bottomNav() {
    Widget item(int i, IconData icon, String label) {
      final on = _tab == i;
      return Expanded(
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: () => setState(() {
            _tab = i;
            _notice = null;
          }),
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
        item(0, Icons.attach_money, 'Earnings'),
        item(1, Icons.history, 'Trips'),
        item(2, Icons.description_outlined, 'Documents'),
        item(3, Icons.chat_bubble_outline, 'Help'),
      ]),
    );
  }

  Widget _noticeBar() {
    if (_notice == null && _error == null) return const SizedBox.shrink();
    final bad = _error != null;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: bad ? const Color(0xFF3A2226) : _vhGreen.withOpacity(0.14),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: bad ? _vhRed : _vhGreen),
      ),
      child: Text(bad ? _error! : _notice!,
          style: const TextStyle(color: Colors.white, fontSize: 13)),
    );
  }

  Widget _statCard(String label, String value, String sub) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: _box(),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: const TextStyle(color: _vhMuted, fontSize: 12)),
          const SizedBox(height: 4),
          Text(value,
              style: const TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w800)),
          const SizedBox(height: 2),
          Text(sub, style: const TextStyle(color: _vhMuted, fontSize: 11)),
        ]),
      ),
    );
  }

  // ---------------------------------------------------------------- earnings tab
  Widget _earningsTab() {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final weekStart = today.subtract(Duration(days: now.weekday - 1));
    final monthStart = DateTime(now.year, now.month, 1);
    final allStart = DateTime(2000);

    final dayMap = <String, List<Map<String, dynamic>>>{};
    final dayDate = <String, DateTime>{};
    for (final o in _delivered) {
      final t = _doneAt(o);
      if (t == null) continue;
      final d = DateTime(t.year, t.month, t.day);
      if (d.isBefore(today.subtract(const Duration(days: 13)))) continue;
      final key = '${d.year}-${d.month}-${d.day}';
      dayMap.putIfAbsent(key, () => <Map<String, dynamic>>[]).add(o);
      dayDate[key] = d;
    }
    final keys = dayMap.keys.toList();
    keys.sort((a, b) => dayDate[b]!.compareTo(dayDate[a]!));

    int maxZone = 1;
    for (final z in _zones) {
      final n = _vhInt(z['orders']);
      if (n > maxZone) maxZone = n;
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(14, 4, 14, 24),
      children: [
        _noticeBar(),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: _vhYellow.withOpacity(0.12),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: _vhYellow),
          ),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Today',
                style: TextStyle(color: _vhMuted, fontSize: 13)),
            const SizedBox(height: 4),
            Text(_vhMoney(_sumSince(today)),
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 32,
                    fontWeight: FontWeight.w800)),
            const SizedBox(height: 2),
            Text('${_countSince(today)} deliveries',
                style: const TextStyle(color: _vhMuted, fontSize: 13)),
          ]),
        ),
        const SizedBox(height: 10),
        Row(children: [
          _statCard('This week', _vhMoney(_sumSince(weekStart)),
              '${_countSince(weekStart)} deliveries'),
          const SizedBox(width: 10),
          _statCard('This month', _vhMoney(_sumSince(monthStart)),
              '${_countSince(monthStart)} deliveries'),
          const SizedBox(width: 10),
          _statCard('All time', _vhMoney(_sumSince(allStart)),
              '${_countSince(allStart)} deliveries'),
        ]),
        _h('Hot zones this week'),
        if (_zones.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(18),
            decoration: _box(),
            child: const Text('No orders in the last 7 days yet.',
                textAlign: TextAlign.center,
                style: TextStyle(color: _vhMuted, fontSize: 14)),
          ),
        for (final z in _zones)
          Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(12),
            decoration: _box(),
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Expanded(
                  child: Text((z['area'] ?? '').toString(),
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.w800)),
                ),
                Text('${_vhInt(z['orders'])} orders',
                    style: const TextStyle(color: _vhMuted, fontSize: 12)),
              ]),
              const SizedBox(height: 8),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: _vhInt(z['orders']) / maxZone,
                  minHeight: 6,
                  backgroundColor: Colors.white12,
                  valueColor: const AlwaysStoppedAnimation<Color>(_vhYellow),
                ),
              ),
            ]),
          ),
        _h('Recent days'),
        if (keys.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(18),
            decoration: _box(),
            child: const Text(
                'Your earnings by day show up here after your first delivery.',
                textAlign: TextAlign.center,
                style: TextStyle(color: _vhMuted, fontSize: 14)),
          ),
        for (final k in keys)
          Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(14),
            decoration: _box(),
            child: Row(children: [
              Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(_vhDayLabel(dayDate[k]!),
                          style: const TextStyle(
                              color: Colors.white,
                              fontSize: 14,
                              fontWeight: FontWeight.w800)),
                      Text('${dayMap[k]!.length} deliveries',
                          style:
                              const TextStyle(color: _vhMuted, fontSize: 12)),
                    ]),
              ),
              Text(
                  _vhMoney(dayMap[k]!.fold<double>(
                      0.0, (s, o) => s + _vhNum(o['valkyrie_pay']))),
                  style: const TextStyle(
                      color: _vhGreen,
                      fontSize: 16,
                      fontWeight: FontWeight.w800)),
            ]),
          ),
      ],
    );
  }

  // ---------------------------------------------------------------- trips tab
  Widget _stars(int n) {
    return Row(mainAxisSize: MainAxisSize.min, children: [
      for (int i = 1; i <= 5; i++)
        Icon(i <= n ? Icons.star : Icons.star_border,
            color: _vhYellow, size: 16),
    ]);
  }

  Widget _tripsTab() {
    final done = _orders.where((o) {
      final s = (o['status'] ?? '').toString();
      return s == 'delivered' || s == 'cancelled';
    }).toList();
    final avg = _vhNum(_driver?['rating_avg']);
    final cnt = _vhInt(_driver?['rating_count']);
    return ListView(
      padding: const EdgeInsets.fromLTRB(14, 4, 14, 24),
      children: [
        _noticeBar(),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: _box(),
          child: Row(children: [
            const Icon(Icons.star, color: _vhYellow, size: 34),
            const SizedBox(width: 12),
            Expanded(
              child: cnt == 0
                  ? const Text(
                      'No ratings yet. They show here after customers rate you.',
                      style: TextStyle(color: _vhMuted, fontSize: 14))
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                          Text(avg.toStringAsFixed(2),
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 26,
                                  fontWeight: FontWeight.w800)),
                          Text('$cnt rating${cnt == 1 ? '' : 's'}',
                              style: const TextStyle(
                                  color: _vhMuted, fontSize: 13)),
                        ]),
            ),
          ]),
        ),
        _h('Trip history'),
        if (done.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(18),
            decoration: _box(),
            child: const Text('Your finished trips show up here.',
                textAlign: TextAlign.center,
                style: TextStyle(color: _vhMuted, fontSize: 14)),
          ),
        for (final o in done) _tripCard(o),
      ],
    );
  }

  Widget _tripCard(Map<String, dynamic> o) {
    final id = (o['id'] ?? '').toString();
    final status = (o['status'] ?? '').toString();
    final isOpen = _open.contains(id);
    final rated = o['rated_at'] != null;
    final miles = _vhNum(o['delivery_miles']);
    return GestureDetector(
      onTap: () => setState(() {
        if (isOpen) {
          _open.remove(id);
        } else {
          _open.add(id);
        }
      }),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: _box(),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text((o['store_name'] ?? '').toString(),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            color: Colors.white,
                            fontSize: 15,
                            fontWeight: FontWeight.w800)),
                    const SizedBox(height: 3),
                    Text(_vhWhen(o['delivered_at'] ?? o['created_at']),
                        style: const TextStyle(color: _vhMuted, fontSize: 12)),
                    const SizedBox(height: 6),
                    Row(children: [
                      Text(status == 'delivered' ? 'Delivered' : 'Cancelled',
                          style: TextStyle(
                              color: status == 'delivered' ? _vhGreen : _vhRed,
                              fontSize: 12,
                              fontWeight: FontWeight.w800)),
                      if (rated)
                        Padding(
                          padding: const EdgeInsets.only(left: 10),
                          child: _stars(_vhInt(o['rating'])),
                        ),
                    ]),
                  ]),
            ),
            Text(
                status == 'delivered'
                    ? _vhMoney(_vhNum(o['valkyrie_pay']))
                    : '-',
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w800)),
            const SizedBox(width: 4),
            Icon(isOpen ? Icons.expand_less : Icons.expand_more,
                color: _vhMuted),
          ]),
          if (isOpen) ...[
            const Divider(color: Colors.white24, height: 22),
            if ((o['dropoff_address'] ?? '').toString().isNotEmpty)
              Text('Drop-off: ${o['dropoff_address']}',
                  style: const TextStyle(color: _vhMuted, fontSize: 13)),
            if (miles > 0)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text('${miles.toStringAsFixed(1)} miles',
                    style: const TextStyle(color: _vhMuted, fontSize: 13)),
              ),
            if (_vhNum(o['extra_tip']) > 0)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                    'Tip added after delivery: ${_vhMoney(_vhNum(o['extra_tip']))}',
                    style: const TextStyle(color: _vhGreen, fontSize: 13)),
              ),
            if ((o['rating_comment'] ?? '').toString().isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text('"${o['rating_comment']}"',
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 13,
                        fontStyle: FontStyle.italic)),
              ),
            const SizedBox(height: 10),
            _pill(
                'Problem with this trip?', false, () => _openHelp(orderId: id)),
          ],
        ]),
      ),
    );
  }

  // ---------------------------------------------------------------- documents tab
  int _daysLeft(dynamic iso) {
    final d = DateTime.tryParse((iso ?? '').toString());
    if (d == null) return -9999;
    final now = DateTime.now();
    return DateTime(d.year, d.month, d.day)
        .difference(DateTime(now.year, now.month, now.day))
        .inDays;
  }

  Widget _docCard(String title, String detail, dynamic expires) {
    final left = _daysLeft(expires);
    Color c = _vhGreen;
    String status = 'Valid';
    if (left == -9999) {
      c = _vhRed;
      status = 'Not on file';
    } else if (left < 0) {
      c = _vhRed;
      status = 'Expired';
    } else if (left <= 30) {
      c = _vhYellow;
      status = 'Expires in $left day${left == 1 ? '' : 's'}';
    }
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: _box(),
      child: Row(children: [
        Expanded(
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title,
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 15,
                    fontWeight: FontWeight.w800)),
            if (detail.isNotEmpty)
              Text(detail,
                  style: const TextStyle(color: _vhMuted, fontSize: 12)),
            const SizedBox(height: 4),
            Text('Expires ${_vhDateOnly(expires)}',
                style: const TextStyle(color: _vhMuted, fontSize: 13)),
          ]),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          decoration: BoxDecoration(
            color: c.withOpacity(0.16),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text(status,
              style: TextStyle(
                  color: c, fontSize: 12, fontWeight: FontWeight.w800)),
        ),
      ]),
    );
  }

  Widget _docsTab() {
    final a = _app;
    if (a == null) {
      return ListView(
        padding: const EdgeInsets.fromLTRB(14, 4, 14, 24),
        children: [
          _noticeBar(),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: _box(),
            child: const Text('No Valkyrie application on file for this login.',
                textAlign: TextAlign.center,
                style: TextStyle(color: _vhMuted, fontSize: 14)),
          ),
        ],
      );
    }
    final licLeft = _daysLeft(a['license_expires_on']);
    final insLeft = _daysLeft(a['insurance_expires_on']);
    final soon = licLeft <= 30 || insLeft <= 30;
    final status = (a['status'] ?? '').toString();
    final vehicle = <String>[
      (a['vehicle_year'] ?? '').toString(),
      (a['vehicle_color'] ?? '').toString(),
      (a['vehicle_make'] ?? '').toString(),
      (a['vehicle_model'] ?? '').toString(),
    ].where((e) => e.isNotEmpty && e != 'null').join(' ');
    return ListView(
      padding: const EdgeInsets.fromLTRB(14, 4, 14, 24),
      children: [
        _noticeBar(),
        if (soon)
          Container(
            width: double.infinity,
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFF3A2226),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: _vhRed),
            ),
            child: const Text(
                'A document is expired or about to expire. You cannot take orders with an expired license or insurance. Message support to update it.',
                style: TextStyle(color: Colors.white, fontSize: 13)),
          ),
        Container(
          width: double.infinity,
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(14),
          decoration: _box(),
          child: Row(children: [
            Expanded(
              child: Text((a['full_name'] ?? 'Valkyrie').toString(),
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w800)),
            ),
            Text(
                status == 'approved'
                    ? 'Approved'
                    : (status == 'pending'
                        ? 'In review'
                        : (status == 'rejected' ? 'Not approved' : status)),
                style: TextStyle(
                    color: status == 'approved'
                        ? _vhGreen
                        : (status == 'pending' ? _vhYellow : _vhRed),
                    fontSize: 13,
                    fontWeight: FontWeight.w800)),
          ]),
        ),
        _docCard('License', '', a['license_expires_on']),
        _docCard('Insurance', (a['insurance_company'] ?? '').toString(),
            a['insurance_expires_on']),
        if (vehicle.isNotEmpty)
          Container(
            width: double.infinity,
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(14),
            decoration: _box(),
            child: Row(children: [
              const Icon(Icons.directions_car_outlined, color: _vhYellow),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(vehicle,
                          style: const TextStyle(
                              color: Colors.white,
                              fontSize: 14,
                              fontWeight: FontWeight.w700)),
                      if ((a['plate'] ?? '').toString().isNotEmpty)
                        Text('Plate ${a['plate']}',
                            style:
                                const TextStyle(color: _vhMuted, fontSize: 12)),
                    ]),
              ),
            ]),
          ),
        if ((a['reviewer_note'] ?? '').toString().isNotEmpty &&
            status != 'approved')
          Container(
            width: double.infinity,
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(14),
            decoration: _box(),
            child: Text('Note from Sleipnir: ${a['reviewer_note']}',
                style: const TextStyle(color: Colors.white, fontSize: 13)),
          ),
        const SizedBox(height: 4),
        _pill('Update a document: message support', true, () {
          setState(() => _tab = 3);
          _openHelp();
        }),
      ],
    );
  }

  // ---------------------------------------------------------------- help tab
  Widget _helpTab() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(14, 4, 14, 24),
      children: [
        _noticeBar(),
        Row(children: [
          const Expanded(
            child: Text(
                'Order problem, customer or store issue, pay question, or an app bug? Chat with Sleipnir Support.',
                style: TextStyle(color: _vhMuted, fontSize: 13)),
          ),
          const SizedBox(width: 10),
          _pill('Chat', true, () => _openHelp()),
        ]),
        if (_tickets.isNotEmpty) _h('Your messages to us'),
        for (final t in _tickets)
          Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(14),
            decoration: _box(),
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Expanded(
                  child: Text(_vhWhen(t['created_at']),
                      style: const TextStyle(color: _vhMuted, fontSize: 12)),
                ),
                Text(
                    (t['status'] ?? '') == 'open'
                        ? 'With our team'
                        : ((t['status'] ?? '') == 'closed'
                            ? 'Closed'
                            : 'Answered'),
                    style: TextStyle(
                        color: (t['status'] ?? '') == 'open'
                            ? _vhYellow
                            : _vhGreen,
                        fontSize: 12,
                        fontWeight: FontWeight.w800)),
              ]),
              const SizedBox(height: 6),
              Text((t['message'] ?? '').toString(),
                  maxLines: 5,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.white, fontSize: 14)),
            ]),
          ),
      ],
    );
  }

  Widget _body() {
    if (_loading)
      return const Center(child: CircularProgressIndicator(color: _vhYellow));
    if (SupaFlow.client.auth.currentUser == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Text('Log in first',
                style: TextStyle(
                    color: Colors.white,
                    fontSize: 22,
                    fontWeight: FontWeight.w800)),
            const SizedBox(height: 10),
            const Text('Log in to see your Valkyrie hub.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.white70, fontSize: 15)),
            const SizedBox(height: 18),
            _pill('Log in', true, () => context.pushNamed('LoginPage')),
          ]),
        ),
      );
    }
    Widget content;
    if (_tab == 1) {
      content = _tripsTab();
    } else if (_tab == 2) {
      content = _docsTab();
    } else if (_tab == 3) {
      content = _helpTab();
    } else {
      content = _earningsTab();
    }
    return Column(children: [
      _header(),
      Expanded(child: content),
      _bottomNav(),
    ]);
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

// -------------------------------------------------------------------- AI help chat sheet
class _VhHelpSheet extends StatefulWidget {
  const _VhHelpSheet({required this.orderId, required this.orders});

  final String? orderId;
  final List<Map<String, dynamic>> orders;

  @override
  State<_VhHelpSheet> createState() => _VhHelpSheetState();
}

class _VhHelpSheetState extends State<_VhHelpSheet> {
  final TextEditingController _msg = TextEditingController();
  final ScrollController _scroll = ScrollController();
  final List<Map<String, String>> _chat = <Map<String, String>>[];
  String? _orderId;
  String? _ticketId;
  bool _busy = false;
  String? _err;

  @override
  void initState() {
    super.initState();
    _orderId = widget.orderId;
  }

  @override
  void dispose() {
    _msg.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _toBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(_scroll.position.maxScrollExtent,
            duration: const Duration(milliseconds: 250), curve: Curves.easeOut);
      }
    });
  }

  Future<void> _send() async {
    final text = _msg.text.trim();
    if (text.isEmpty || _busy) return;
    final session = SupaFlow.client.auth.currentSession;
    if (session == null) {
      setState(() => _err = 'Log in first.');
      return;
    }
    setState(() {
      _chat.add(<String, String>{'role': 'user', 'content': text});
      _msg.clear();
      _busy = true;
      _err = null;
    });
    _toBottom();
    try {
      final res = await http
          .post(
            Uri.parse(
                'https://afnihsdxtisneuyehatw.supabase.co/functions/v1/support-ai'),
            headers: <String, String>{
              'Content-Type': 'application/json',
              'apikey': 'sb_publishable_vW_PYB4UB5Nl78LuuYu6Aw_HGueXszb',
              'Authorization': 'Bearer ${session.accessToken}',
            },
            body: jsonEncode(<String, dynamic>{
              'audience': 'valkyrie',
              'messages': _chat,
              'order_id': _orderId,
              'ticket_id': _ticketId,
            }),
          )
          .timeout(const Duration(seconds: 40));
      final dynamic j = jsonDecode(res.body);
      if (res.statusCode == 200 &&
          j is Map &&
          (j['reply'] ?? '').toString().isNotEmpty) {
        if (mounted) {
          setState(() {
            _chat.add(<String, String>{
              'role': 'assistant',
              'content': j['reply'].toString()
            });
            final tid = (j['ticket_id'] ?? '').toString();
            if (tid.isNotEmpty) _ticketId = tid;
            _busy = false;
          });
        }
      } else {
        if (mounted) {
          setState(() {
            if (_chat.isNotEmpty) _chat.removeLast();
            _msg.text = text;
            _busy = false;
            _err = 'Could not reach support. Try again.';
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          if (_chat.isNotEmpty) _chat.removeLast();
          _msg.text = text;
          _busy = false;
          _err = 'Could not reach support. Try again.';
        });
      }
    }
    _toBottom();
  }

  Widget _bubble(String role, String text) {
    final mine = role == 'user';
    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints:
            BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: mine ? _vhYellow : _vhPanel,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Text(text,
            style: TextStyle(
                color: mine ? Colors.black : Colors.white,
                fontSize: 14,
                fontWeight: mine ? FontWeight.w600 : FontWeight.w500)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).viewInsets.bottom;
    final avail = MediaQuery.of(context).size.height * 0.88 - bottom;
    final height = avail < 320 ? 320.0 : avail;
    final recent = widget.orders.take(5).toList();
    return Padding(
      padding: EdgeInsets.only(bottom: bottom),
      child: SizedBox(
        height: height,
        child: Column(children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 8, 0),
            child: Row(children: [
              const Expanded(
                child: Text('Sleipnir Support',
                    style: TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.w800)),
              ),
              IconButton(
                onPressed: () => Navigator.pop(context, _ticketId != null),
                icon: const Icon(Icons.close, color: Colors.white),
              ),
            ]),
          ),
          if (_chat.isEmpty && recent.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 6),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Wrap(spacing: 8, runSpacing: 8, children: [
                  GestureDetector(
                    onTap: () => setState(() => _orderId = null),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: _orderId == null
                            ? _vhYellow.withOpacity(0.2)
                            : _vhPanel,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                            color:
                                _orderId == null ? _vhYellow : Colors.white12),
                      ),
                      child: const Text('Not about a trip',
                          style: TextStyle(color: Colors.white, fontSize: 12)),
                    ),
                  ),
                  for (final o in recent)
                    GestureDetector(
                      onTap: () =>
                          setState(() => _orderId = o['id'].toString()),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: _orderId == o['id'].toString()
                              ? _vhYellow.withOpacity(0.2)
                              : _vhPanel,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                              color: _orderId == o['id'].toString()
                                  ? _vhYellow
                                  : Colors.white12),
                        ),
                        child: Text(
                            '${(o['store_name'] ?? '').toString().split(' + ').first}  -  ${_vhWhen(o['created_at']).split('  -  ').first}',
                            style: const TextStyle(
                                color: Colors.white, fontSize: 12)),
                      ),
                    ),
                ]),
              ),
            ),
          Expanded(
            child: ListView(
              controller: _scroll,
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 8),
              children: [
                _bubble('assistant',
                    'Hi, I am Sleipnir Support, an AI assistant for Valkyries. What is going on?'),
                for (final m in _chat)
                  _bubble(m['role'] ?? 'user', m['content'] ?? ''),
                if (_busy)
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        color: _vhPanel,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: _vhYellow),
                      ),
                    ),
                  ),
                if (_err != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(_err!,
                        style: const TextStyle(color: _vhRed, fontSize: 13)),
                  ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
            decoration: const BoxDecoration(
              color: _vhPanel,
              border: Border(top: BorderSide(color: Colors.white12)),
            ),
            child: Row(children: [
              Expanded(
                child: TextField(
                  controller: _msg,
                  minLines: 1,
                  maxLines: 4,
                  textCapitalization: TextCapitalization.sentences,
                  onSubmitted: (_) => _send(),
                  style: const TextStyle(color: Colors.white, fontSize: 15),
                  decoration: InputDecoration(
                    hintText: 'Type your message',
                    hintStyle: const TextStyle(color: _vhMuted),
                    filled: true,
                    fillColor: _vhBg,
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 12),
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(22),
                        borderSide: BorderSide.none),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              GestureDetector(
                onTap: _busy ? null : _send,
                child: Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    color: _busy ? Colors.white12 : _vhYellow,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.send_rounded,
                      color: Colors.black, size: 22),
                ),
              ),
            ]),
          ),
        ]),
      ),
    );
  }
}