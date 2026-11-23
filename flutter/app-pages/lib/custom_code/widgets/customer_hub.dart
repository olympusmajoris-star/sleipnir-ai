// Studio preview copy of the FlutterFlow custom widget CustomerHub.
// The widget code below is the app's code. Only two imports differ:
// geolocator -> fixed test location, supabase_flutter -> supabase.
import 'package:sleipnir_app_pages/backend/supabase/supabase.dart';
import 'package:sleipnir_app_pages/flutter_flow/flutter_flow_util.dart';
import 'package:flutter/material.dart';
import 'package:flutter/material.dart';

import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart' as ll;
import 'package:sleipnir_app_pages/shims/geo.dart' as geo;

class CustomerHub extends StatefulWidget {
  const CustomerHub({
    super.key,
    this.width,
    this.height,
  });

  final double? width;
  final double? height;

  @override
  State<CustomerHub> createState() => _CustomerHubState();
}

const Color _chBg = Color(0xFF11151C);
const Color _chPanel = Color(0xFF202630);
const Color _chYellow = Color(0xFFFFC72C);
const Color _chMuted = Color(0xFFB8C0CB);
const Color _chGreen = Color(0xFF2FBF71);
const Color _chRed = Color(0xFFFF7A7A);

double _chNum(dynamic v) {
  if (v is num) return v.toDouble();
  return double.tryParse((v ?? '')
          .toString()
          .replaceAll('\$', '')
          .replaceAll(',', '')
          .trim()) ??
      0.0;
}

int _chInt(dynamic v) {
  if (v is num) return v.toInt();
  return int.tryParse((v ?? '').toString().trim()) ?? 0;
}

double _chR2(double v) => (v * 100).round() / 100.0;

String _chMoney(double v) => '\$${v.toStringAsFixed(2)}';

final RegExp _chUuid = RegExp(
    r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$');

const List<String> _chMonths = <String>[
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

String _chWhen(dynamic iso) {
  final d = DateTime.tryParse((iso ?? '').toString())?.toLocal();
  if (d == null) return '';
  final h = d.hour % 12 == 0 ? 12 : d.hour % 12;
  final m = d.minute < 10 ? '0${d.minute}' : '${d.minute}';
  return '${_chMonths[d.month - 1]} ${d.day}  -  $h:$m ${d.hour >= 12 ? 'PM' : 'AM'}';
}

List<Map<String, dynamic>> _chRows(dynamic res) {
  final out = <Map<String, dynamic>>[];
  if (res is List) {
    for (final dynamic r in res) {
      if (r is Map) out.add(Map<String, dynamic>.from(r));
    }
  }
  return out;
}

Future<List<Map<String, dynamic>>> _chSearch(String q) async {
  final out = <Map<String, dynamic>>[];
  try {
    final uri = Uri.https('nominatim.openstreetmap.org', '/search', {
      'q': q,
      'format': 'jsonv2',
      'limit': '5',
      'countrycodes': 'us',
      'viewbox': '-82.2,30.2,-80.4,28.8',
    });
    final res = await http.get(uri, headers: {
      'Accept': 'application/json',
      'User-Agent': 'SleipnirApp/1.0',
    }).timeout(const Duration(seconds: 12));
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
                .take(3)
                .join(',')
                .trim(),
            'lat': la,
            'lng': lo,
          });
        }
      }
    }
  } catch (_) {}
  return out;
}

Future<String> _chReverse(ll.LatLng p) async {
  try {
    final uri = Uri.https('nominatim.openstreetmap.org', '/reverse', {
      'lat': p.latitude.toString(),
      'lon': p.longitude.toString(),
      'format': 'jsonv2',
      'zoom': '18',
      'addressdetails': '1',
    });
    final res = await http.get(uri, headers: {
      'Accept': 'application/json',
      'User-Agent': 'SleipnirApp/1.0',
    }).timeout(const Duration(seconds: 12));
    if (res.statusCode == 200) {
      final j = jsonDecode(res.body);
      if (j is Map) {
        final a = j['address'];
        if (a is Map) {
          final street = <dynamic>[a['house_number'], a['road']]
              .where((e) => e != null && e.toString().isNotEmpty)
              .join(' ');
          final city =
              (a['city'] ?? a['town'] ?? a['village'] ?? a['hamlet'] ?? '')
                  .toString();
          final line =
              <String>[street, city].where((e) => e.isNotEmpty).join(', ');
          if (line.isNotEmpty) return line;
        }
        final dn = (j['display_name'] ?? '').toString();
        if (dn.isNotEmpty) return dn.split(',').take(3).join(',').trim();
      }
    }
  } catch (_) {}
  return '${p.latitude.toStringAsFixed(5)}, ${p.longitude.toStringAsFixed(5)}';
}

String _chStatus(String s) {
  switch (s) {
    case 'pending':
      return 'Finding a Valkyrie';
    case 'accepted':
      return 'Valkyrie on the way to the store';
    case 'picked_up':
      return 'On the way to you';
    case 'delivered':
      return 'Delivered';
    case 'cancelled':
      return 'Cancelled';
    default:
      return s;
  }
}

class _CustomerHubState extends State<CustomerHub> {
  Timer? _timer;
  int _tab = 0;
  bool _loading = true;
  String? _error;
  String? _notice;

  Map<String, dynamic>? _customer;
  List<Map<String, dynamic>> _orders = <Map<String, dynamic>>[];
  List<Map<String, dynamic>> _addresses = <Map<String, dynamic>>[];
  List<Map<String, dynamic>> _tickets = <Map<String, dynamic>>[];

  final TextEditingController _nameCtl = TextEditingController();
  final TextEditingController _phoneCtl = TextEditingController();
  bool _profileLoaded = false;
  bool _savingProfile = false;

  @override
  void initState() {
    super.initState();
    _load(first: true);
    _timer = Timer.periodic(const Duration(seconds: 8), (_) => _load());
  }

  @override
  void dispose() {
    _timer?.cancel();
    _nameCtl.dispose();
    _phoneCtl.dispose();
    super.dispose();
  }

  // ---------------------------------------------------------------- data
  Future<void> _load({bool first = false}) async {
    final user = SupaFlow.client.auth.currentUser;
    if (user == null) {
      if (mounted) setState(() => _loading = false);
      return;
    }
    try {
      dynamic crow = await SupaFlow.client
          .from('customers')
          .select()
          .eq('id', user.id)
          .maybeSingle();
      if (crow == null) {
        final meta = user.userMetadata ?? <String, dynamic>{};
        final fresh = <String, dynamic>{
          'id': user.id,
          'full_name':
              (meta['full_name'] ?? meta['name'] ?? user.email ?? 'Customer')
                  .toString(),
        };
        if ((user.email ?? '').isNotEmpty) fresh['email'] = user.email;
        await SupaFlow.client.from('customers').upsert(fresh, onConflict: 'id');
        crow = await SupaFlow.client
            .from('customers')
            .select()
            .eq('id', user.id)
            .maybeSingle();
      }
      final ordersRes = await SupaFlow.client
          .from('orders')
          .select(
              'id,status,store_name,created_at,total_amount,final_total,estimated_total,rating,rated_at,tip_amount,delivery_fee,subtotal,is_test,dropoff_address')
          .eq('customer_id', user.id)
          .order('created_at', ascending: false)
          .limit(60);
      final addrRes = await SupaFlow.client
          .from('customer_addresses')
          .select()
          .eq('customer_id', user.id)
          .order('created_at', ascending: true);
      final tixRes = await SupaFlow.client
          .from('support_tickets')
          .select()
          .eq('customer_id', user.id)
          .order('created_at', ascending: false)
          .limit(20);
      if (!mounted) return;
      setState(() {
        _customer =
            crow == null ? null : Map<String, dynamic>.from(crow as Map);
        _orders = _chRows(ordersRes);
        _addresses = _chRows(addrRes);
        _tickets = _chRows(tixRes);
        _loading = false;
        _error = null;
        if (!_profileLoaded && _customer != null) {
          _nameCtl.text = (_customer!['full_name'] ?? '').toString();
          _phoneCtl.text = (_customer!['phone'] ?? '').toString();
          _profileLoaded = true;
        }
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Could not load your account. $e';
          _loading = false;
        });
      }
    }
  }

  Map<String, dynamic>? get _activeOrder {
    for (final o in _orders) {
      final s = (o['status'] ?? '').toString();
      if (s == 'pending' || s == 'accepted' || s == 'picked_up') return o;
    }
    return null;
  }

  // ---------------------------------------------------------------- actions
  Future<void> _reorder(Map<String, dynamic> order) async {
    try {
      final itemsRes = await SupaFlow.client
          .from('order_items')
          .select('product_id,qty')
          .eq('order_id', order['id'].toString());
      final items = _chRows(itemsRes);
      final ids = items
          .map((i) => (i['product_id'] ?? '').toString())
          .where((id) => _chUuid.hasMatch(id))
          .toSet()
          .toList();
      final products = <String, Map<String, dynamic>>{};
      if (ids.isNotEmpty) {
        final pres = await SupaFlow.client
            .from('products')
            .select('id,name,price,image_url,store_id')
            .inFilter('id', ids);
        for (final p in _chRows(pres)) {
          products[(p['id'] ?? '').toString()] = p;
        }
      }
      final cart = <Map<String, dynamic>>[];
      for (final dynamic raw in FFAppState().cart) {
        if (raw is Map) cart.add(Map<String, dynamic>.from(raw));
      }
      int added = 0;
      int skipped = 0;
      for (final i in items) {
        final pid = (i['product_id'] ?? '').toString();
        final p = products[pid];
        final price = p == null ? 0.0 : _chNum(p['price']);
        if (p == null || price <= 0) {
          skipped++;
          continue;
        }
        final qty = math_max1(_chInt(i['qty']));
        final idx = cart.indexWhere((l) =>
            (l['product_id'] ?? '').toString() == pid &&
            (l['size'] ?? '').toString().isEmpty);
        if (idx >= 0) {
          final q = _chInt(cart[idx]['qty']) + qty;
          cart[idx]['qty'] = q;
          cart[idx]['unit_price'] = price;
          cart[idx]['price'] = _chR2(price * q);
        } else {
          cart.add(<String, dynamic>{
            'product_id': pid,
            'store_id': (p['store_id'] ?? '').toString(),
            'name': (p['name'] ?? '').toString(),
            'display_name': (p['name'] ?? '').toString(),
            'image_url': (p['image_url'] ?? '').toString(),
            'qty': qty,
            'unit_price': price,
            'price': _chR2(price * qty),
            'size': '',
            'mods': <dynamic>[],
            'special_request': '',
            'sold_by': 'each',
            'source': 'reorder',
          });
        }
        added++;
      }
      FFAppState().update(() {
        FFAppState().cart = cart.map((l) => l as dynamic).toList();
      });
      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (c) => AlertDialog(
          backgroundColor: _chPanel,
          title: Text(added > 0 ? 'Added to your bag' : 'Nothing to add',
              style: const TextStyle(color: Colors.white)),
          content: Text(
              added > 0
                  ? '$added item${added == 1 ? '' : 's'} added at today\'s prices.${skipped > 0 ? ' $skipped could not be added.' : ''} Sizes and customizations are not copied.'
                  : 'Those items are not available to reorder.',
              style: const TextStyle(color: Colors.white70)),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(c),
                child: const Text('Close', style: TextStyle(color: _chMuted))),
            if (added > 0)
              TextButton(
                  onPressed: () {
                    Navigator.pop(c);
                    context.pushNamed('Cart');
                  },
                  child: const Text('Open my bag',
                      style: TextStyle(color: _chYellow))),
          ],
        ),
      );
    } catch (e) {
      if (mounted) setState(() => _error = 'Could not reorder. $e');
    }
  }

  int math_max1(int v) => v < 1 ? 1 : v;

  Future<void> _openOrder(Map<String, dynamic> order) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: _chBg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      builder: (c) => _ChOrderSheet(
        order: order,
        onReorder: () {
          Navigator.pop(c);
          _reorder(order);
        },
        onHelp: () {
          Navigator.pop(c);
          _openHelp(orderId: order['id'].toString());
        },
      ),
    );
    _load();
  }

  Future<void> _openHelp({String? orderId}) async {
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: _chBg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      builder: (c) => _ChHelpSheet(orderId: orderId, orders: _orders),
    );
    if (ok == true) {
      if (mounted)
        setState(
            () => _notice = 'Passed to the Sleipnir team. Replies show here.');
      _load();
    }
  }

  Future<void> _addPlace() async {
    final res = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: _chBg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      builder: (c) => const _ChPlaceSheet(),
    );
    final user = SupaFlow.client.auth.currentUser;
    if (res == null || user == null) return;
    try {
      await SupaFlow.client.from('customer_addresses').insert(<String, dynamic>{
        'customer_id': user.id,
        'label': res['label'],
        'address': res['address'],
        'lat': res['lat'],
        'lng': res['lng'],
        'note': res['note'],
        'is_default': _addresses.isEmpty,
      });
      await _load();
    } catch (e) {
      if (mounted) setState(() => _error = 'Could not save that place. $e');
    }
  }

  Future<void> _makeDefault(Map<String, dynamic> a) async {
    final user = SupaFlow.client.auth.currentUser;
    if (user == null) return;
    try {
      await SupaFlow.client.from('customer_addresses').update(
          <String, dynamic>{'is_default': false}).eq('customer_id', user.id);
      await SupaFlow.client.from('customer_addresses').update(
          <String, dynamic>{'is_default': true}).eq('id', a['id'].toString());
      await _load();
    } catch (e) {
      if (mounted) setState(() => _error = 'Could not change your default. $e');
    }
  }

  Future<void> _deletePlace(Map<String, dynamic> a) async {
    try {
      await SupaFlow.client
          .from('customer_addresses')
          .delete()
          .eq('id', a['id'].toString());
      await _load();
    } catch (e) {
      if (mounted) setState(() => _error = 'Could not remove that place. $e');
    }
  }

  Future<void> _saveProfile() async {
    final user = SupaFlow.client.auth.currentUser;
    if (user == null || _savingProfile) return;
    setState(() {
      _savingProfile = true;
      _notice = null;
    });
    try {
      await SupaFlow.client.from('customers').update(<String, dynamic>{
        'full_name': _nameCtl.text.trim(),
        'phone': _phoneCtl.text.trim(),
      }).eq('id', user.id);
      if (mounted) setState(() => _notice = 'Saved.');
    } catch (e) {
      if (mounted) setState(() => _error = 'Could not save. $e');
    }
    if (mounted) setState(() => _savingProfile = false);
  }

  // ---------------------------------------------------------------- UI helpers
  BoxDecoration _box() =>
      BoxDecoration(color: _chPanel, borderRadius: BorderRadius.circular(14));

  Widget _pill(String label, bool filled, VoidCallback? onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
        decoration: BoxDecoration(
          color: filled ? _chYellow : Colors.transparent,
          border: Border.all(color: filled ? _chYellow : _chMuted),
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
    final titles = <String>['My orders', 'My places', 'Account'];
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
              Icon(icon, color: on ? _chYellow : _chMuted, size: 24),
              const SizedBox(height: 2),
              Text(label,
                  style: TextStyle(
                      color: on ? _chYellow : _chMuted,
                      fontSize: 11,
                      fontWeight: FontWeight.w700)),
            ]),
          ),
        ),
      );
    }

    return Container(
      decoration: const BoxDecoration(
        color: _chPanel,
        border: Border(top: BorderSide(color: Colors.white12)),
      ),
      child: Row(children: [
        item(0, Icons.receipt_long_outlined, 'Orders'),
        item(1, Icons.place_outlined, 'Places'),
        item(2, Icons.person_outline, 'Account'),
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
        color: bad ? const Color(0xFF3A2226) : _chGreen.withOpacity(0.14),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: bad ? _chRed : _chGreen),
      ),
      child: Text(bad ? _error! : _notice!,
          style: const TextStyle(color: Colors.white, fontSize: 13)),
    );
  }

  // ---------------------------------------------------------------- tabs
  Widget _ordersTab() {
    final active = _activeOrder;
    final past = _orders.where((o) {
      final s = (o['status'] ?? '').toString();
      return s == 'delivered' || s == 'cancelled';
    }).toList();
    return ListView(
      padding: const EdgeInsets.fromLTRB(14, 4, 14, 24),
      children: [
        _noticeBar(),
        if (active != null)
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: _chYellow.withOpacity(0.12),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: _chYellow),
            ),
            child: Row(children: [
              const Icon(Icons.local_shipping_outlined,
                  color: _chYellow, size: 26),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(_chStatus((active['status'] ?? '').toString()),
                          style: const TextStyle(
                              color: Colors.white,
                              fontSize: 15,
                              fontWeight: FontWeight.w800)),
                      Text((active['store_name'] ?? '').toString(),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style:
                              const TextStyle(color: _chMuted, fontSize: 12)),
                    ]),
              ),
              _pill('Track', true, () => context.pushNamed('OrderTracking')),
            ]),
          ),
        _h('Past orders'),
        if (past.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: _box(),
            child: const Text('Your finished orders show up here.',
                textAlign: TextAlign.center,
                style: TextStyle(color: _chMuted, fontSize: 14)),
          ),
        for (final o in past) _orderCard(o),
      ],
    );
  }

  Widget _orderCard(Map<String, dynamic> o) {
    final status = (o['status'] ?? '').toString();
    final total = o['final_total'] != null
        ? _chNum(o['final_total'])
        : (o['estimated_total'] != null
            ? _chNum(o['estimated_total'])
            : _chNum(o['total_amount']));
    final rated = o['rated_at'] != null;
    return GestureDetector(
      onTap: () => _openOrder(o),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: _box(),
        child: Row(children: [
          Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text((o['store_name'] ?? '').toString(),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.w800)),
              const SizedBox(height: 3),
              Text(_chWhen(o['created_at']),
                  style: const TextStyle(color: _chMuted, fontSize: 12)),
              const SizedBox(height: 6),
              Row(children: [
                Text(status == 'delivered' ? 'Delivered' : 'Cancelled',
                    style: TextStyle(
                        color: status == 'delivered' ? _chGreen : _chRed,
                        fontSize: 12,
                        fontWeight: FontWeight.w800)),
                if (status == 'delivered' && !rated)
                  const Padding(
                    padding: EdgeInsets.only(left: 10),
                    child: Text('Rate your Valkyrie',
                        style: TextStyle(
                            color: _chYellow,
                            fontSize: 12,
                            fontWeight: FontWeight.w700)),
                  ),
                if (rated)
                  Padding(
                    padding: const EdgeInsets.only(left: 10),
                    child: Text('${'*' * _chInt(o['rating'])}',
                        style: const TextStyle(color: _chYellow, fontSize: 14)),
                  ),
              ]),
            ]),
          ),
          Text(_chMoney(total),
              style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w800)),
          const SizedBox(width: 4),
          const Icon(Icons.chevron_right, color: _chMuted),
        ]),
      ),
    );
  }

  Widget _placesTab() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(14, 4, 14, 24),
      children: [
        _noticeBar(),
        const Text(
            'Save the places you order to, then pick them in one tap at checkout.',
            style: TextStyle(color: _chMuted, fontSize: 13)),
        const SizedBox(height: 12),
        if (_addresses.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: _box(),
            child: const Text('No saved places yet.',
                textAlign: TextAlign.center,
                style: TextStyle(color: _chMuted, fontSize: 14)),
          ),
        for (final a in _addresses)
          Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(14),
            decoration: _box(),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Icon(
                  a['label'].toString().toLowerCase() == 'work'
                      ? Icons.work_outline
                      : Icons.home_outlined,
                  color: _chYellow,
                  size: 24),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(children: [
                        Text((a['label'] ?? '').toString(),
                            style: const TextStyle(
                                color: Colors.white,
                                fontSize: 15,
                                fontWeight: FontWeight.w800)),
                        if (a['is_default'] == true)
                          Container(
                            margin: const EdgeInsets.only(left: 8),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 7, vertical: 2),
                            decoration: BoxDecoration(
                              color: _chGreen.withOpacity(0.16),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Text('Default',
                                style: TextStyle(
                                    color: _chGreen,
                                    fontSize: 10,
                                    fontWeight: FontWeight.w800)),
                          ),
                      ]),
                      const SizedBox(height: 2),
                      Text((a['address'] ?? '').toString(),
                          style:
                              const TextStyle(color: _chMuted, fontSize: 13)),
                      if ((a['note'] ?? '').toString().isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 2),
                          child: Text((a['note'] ?? '').toString(),
                              style: const TextStyle(
                                  color: _chMuted, fontSize: 12)),
                        ),
                      const SizedBox(height: 8),
                      Wrap(spacing: 8, runSpacing: 6, children: [
                        if (a['is_default'] != true)
                          _pill('Make default', false, () => _makeDefault(a)),
                        _pill('Remove', false, () => _deletePlace(a)),
                      ]),
                    ]),
              ),
            ]),
          ),
        const SizedBox(height: 4),
        _pill('Add a place', true, _addPlace),
      ],
    );
  }

  Widget _tf(TextEditingController c, String label, {TextInputType? type}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: TextField(
        controller: c,
        keyboardType: type,
        style: const TextStyle(color: Colors.white, fontSize: 15),
        decoration: InputDecoration(
          labelText: label,
          labelStyle: const TextStyle(color: _chMuted),
          filled: true,
          fillColor: _chPanel,
          isDense: true,
          contentPadding: const EdgeInsets.all(14),
          border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none),
        ),
      ),
    );
  }

  Widget _accountTab() {
    final user = SupaFlow.client.auth.currentUser;
    return ListView(
      padding: const EdgeInsets.fromLTRB(14, 4, 14, 24),
      children: [
        _noticeBar(),
        _tf(_nameCtl, 'Name'),
        _tf(_phoneCtl, 'Phone', type: TextInputType.phone),
        Container(
          width: double.infinity,
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(14),
          decoration: _box(),
          child: Row(children: [
            const Icon(Icons.email_outlined, color: _chMuted, size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                  (user?.email ?? '').isEmpty
                      ? 'No email on file'
                      : user!.email!,
                  style: const TextStyle(color: _chMuted, fontSize: 14)),
            ),
          ]),
        ),
        _pill(_savingProfile ? 'Saving...' : 'Save changes', true,
            _savingProfile ? null : _saveProfile),
        _h('Help'),
        Row(children: [
          Expanded(
            child: Text(
                'Missing item, late order, wrong order or a payment question? Chat with Sleipnir Support.',
                style: const TextStyle(color: _chMuted, fontSize: 13)),
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
                  child: Text(_chWhen(t['created_at']),
                      style: const TextStyle(color: _chMuted, fontSize: 12)),
                ),
                Text(
                    (t['status'] ?? '') == 'open'
                        ? 'With our team'
                        : ((t['status'] ?? '') == 'closed'
                            ? 'Closed'
                            : 'Answered'),
                    style: TextStyle(
                        color: (t['status'] ?? '') == 'open'
                            ? _chYellow
                            : _chGreen,
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
      return const Center(child: CircularProgressIndicator(color: _chYellow));
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
            const Text('Log in to see your orders and saved places.',
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
      content = _placesTab();
    } else if (_tab == 2) {
      content = _accountTab();
    } else {
      content = _ordersTab();
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
      child: ColoredBox(color: _chBg, child: SafeArea(child: _body())),
    );
  }
}

// -------------------------------------------------------------------- order detail sheet
class _ChOrderSheet extends StatefulWidget {
  const _ChOrderSheet(
      {required this.order, required this.onReorder, required this.onHelp});

  final Map<String, dynamic> order;
  final VoidCallback onReorder;
  final VoidCallback onHelp;

  @override
  State<_ChOrderSheet> createState() => _ChOrderSheetState();
}

class _ChOrderSheetState extends State<_ChOrderSheet> {
  List<Map<String, dynamic>> _items = <Map<String, dynamic>>[];
  bool _loading = true;
  int _stars = 0;
  double _tip = 0;
  bool _custom = false;
  bool _busy = false;
  bool _rated = false;
  String? _err;
  final TextEditingController _comment = TextEditingController();
  final TextEditingController _tipCtl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _rated = widget.order['rated_at'] != null;
    _stars = _chInt(widget.order['rating']);
    _loadItems();
  }

  @override
  void dispose() {
    _comment.dispose();
    _tipCtl.dispose();
    super.dispose();
  }

  Future<void> _loadItems() async {
    try {
      final res = await SupaFlow.client
          .from('order_items')
          .select('item_name,qty,unit_price,status,sub_name,sub_price')
          .eq('order_id', widget.order['id'].toString())
          .order('created_at', ascending: true);
      if (mounted) {
        setState(() {
          _items = _chRows(res);
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _submit() async {
    if (_stars < 1 || _busy) return;
    setState(() {
      _busy = true;
      _err = null;
    });
    try {
      final tip = _custom
          ? (double.tryParse(_tipCtl.text.replaceAll('\$', '').trim()) ?? 0.0)
          : _tip;
      final dynamic ok = await SupaFlow.client
          .rpc('customer_rate_order', params: <String, dynamic>{
        'p_order': widget.order['id'].toString(),
        'p_rating': _stars,
        'p_comment': _comment.text.trim(),
        'p_extra_tip': tip < 0 ? 0 : tip,
      });
      if (!mounted) return;
      setState(() {
        _busy = false;
        if (ok == true) {
          _rated = true;
        } else {
          _err = 'This order was already rated.';
        }
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _busy = false;
          _err = 'Could not send your rating. $e';
        });
      }
    }
  }

  Widget _tipChip(String label, double v, {bool custom = false}) {
    final on = custom ? _custom : (!_custom && _tip == v);
    return GestureDetector(
      onTap: () => setState(() {
        _custom = custom;
        if (!custom) _tip = v;
      }),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
        decoration: BoxDecoration(
          color: on ? _chYellow : _chPanel,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(label,
            style: TextStyle(
                color: on ? Colors.black : Colors.white,
                fontSize: 13,
                fontWeight: FontWeight.w800)),
      ),
    );
  }

  Widget _ratingBlock() {
    if (_rated) {
      return Container(
        width: double.infinity,
        margin: const EdgeInsets.only(top: 14),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
            color: _chPanel, borderRadius: BorderRadius.circular(14)),
        child: Row(children: [
          const Icon(Icons.check_circle, color: _chGreen),
          const SizedBox(width: 10),
          Text(
              _stars > 0
                  ? 'You rated this ${'*' * _stars}'
                  : 'Thanks for rating',
              style: const TextStyle(color: Colors.white, fontSize: 14)),
        ]),
      );
    }
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(top: 14),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
          color: _chPanel, borderRadius: BorderRadius.circular(14)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('How was your Valkyrie?',
            style: TextStyle(
                color: Colors.white,
                fontSize: 15,
                fontWeight: FontWeight.w800)),
        const SizedBox(height: 8),
        Row(children: [
          for (int i = 1; i <= 5; i++)
            GestureDetector(
              onTap: () => setState(() => _stars = i),
              child: Padding(
                padding: const EdgeInsets.only(right: 6),
                child: Icon(i <= _stars ? Icons.star : Icons.star_border,
                    color: _chYellow, size: 36),
              ),
            ),
        ]),
        const SizedBox(height: 10),
        TextField(
          controller: _comment,
          maxLines: 2,
          style: const TextStyle(color: Colors.white, fontSize: 14),
          decoration: InputDecoration(
            hintText: 'Anything to add? (optional)',
            hintStyle: const TextStyle(color: _chMuted),
            filled: true,
            fillColor: _chBg,
            isDense: true,
            contentPadding: const EdgeInsets.all(12),
            border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none),
          ),
        ),
        const SizedBox(height: 10),
        const Text('Add a tip (100% goes to your Valkyrie)',
            style: TextStyle(color: _chMuted, fontSize: 12)),
        const SizedBox(height: 6),
        Wrap(spacing: 8, runSpacing: 8, children: [
          _tipChip('No tip', 0),
          _tipChip('\$2', 2),
          _tipChip('\$5', 5),
          _tipChip('\$10', 10),
          _tipChip('Other', 0, custom: true),
        ]),
        if (_custom)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: TextField(
              controller: _tipCtl,
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              style: const TextStyle(color: Colors.white, fontSize: 15),
              decoration: InputDecoration(
                hintText: 'Tip in dollars',
                hintStyle: const TextStyle(color: _chMuted),
                prefixText: '\$ ',
                prefixStyle: const TextStyle(color: Colors.white),
                filled: true,
                fillColor: _chBg,
                isDense: true,
                contentPadding: const EdgeInsets.all(12),
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none),
              ),
            ),
          ),
        if (_err != null)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(_err!,
                style: const TextStyle(color: _chRed, fontSize: 12)),
          ),
        const SizedBox(height: 12),
        SizedBox(
          width: double.infinity,
          height: 48,
          child: ElevatedButton(
            onPressed: (_stars < 1 || _busy) ? null : _submit,
            style: ElevatedButton.styleFrom(
              backgroundColor: _chYellow,
              foregroundColor: Colors.black,
              disabledBackgroundColor: Colors.white12,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
            child: _busy
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.black))
                : const Text('Send',
                    style:
                        TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
          ),
        ),
      ]),
    );
  }

  @override
  Widget build(BuildContext context) {
    final o = widget.order;
    final status = (o['status'] ?? '').toString();
    final rows = <Widget>[];
    for (final it in _items) {
      final st = (it['status'] ?? '').toString();
      final qty = _chInt(it['qty']);
      final unit = _chNum(it['unit_price']);
      String extra = '';
      if (st == 'swapped' && (it['sub_name'] ?? '').toString().isNotEmpty) {
        extra = 'Swapped for ${it['sub_name']}';
      } else if (st == 'refunded') {
        extra = 'Removed and refunded';
      }
      rows.add(Padding(
        padding: const EdgeInsets.only(top: 8),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          SizedBox(
              width: 30,
              child: Text('${qty}x',
                  style: const TextStyle(color: _chMuted, fontSize: 13))),
          Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text((it['item_name'] ?? '').toString(),
                  style: TextStyle(
                      color: st == 'refunded' ? _chMuted : Colors.white,
                      fontSize: 14,
                      decoration: st == 'refunded'
                          ? TextDecoration.lineThrough
                          : TextDecoration.none)),
              if (extra.isNotEmpty)
                Text(extra,
                    style: TextStyle(
                        color: st == 'refunded' ? _chRed : _chYellow,
                        fontSize: 12)),
            ]),
          ),
          Text(_chMoney(unit * qty),
              style: const TextStyle(color: _chMuted, fontSize: 13)),
        ]),
      ));
    }
    final total = o['final_total'] != null
        ? _chNum(o['final_total'])
        : (o['estimated_total'] != null
            ? _chNum(o['estimated_total'])
            : _chNum(o['total_amount']));
    return SizedBox(
      height: MediaQuery.of(context).size.height * 0.88,
      child: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 8, 4),
          child: Row(children: [
            Expanded(
              child: Text((o['store_name'] ?? '').toString(),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 19,
                      fontWeight: FontWeight.w800)),
            ),
            IconButton(
              onPressed: () => Navigator.pop(context),
              icon: const Icon(Icons.close, color: Colors.white),
            ),
          ]),
        ),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            children: [
              Text('${_chWhen(o['created_at'])}  -  ${_chStatus(status)}',
                  style: const TextStyle(color: _chMuted, fontSize: 13)),
              if ((o['dropoff_address'] ?? '').toString().isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text((o['dropoff_address'] ?? '').toString(),
                      style: const TextStyle(color: _chMuted, fontSize: 12)),
                ),
              if (_loading)
                const Padding(
                  padding: EdgeInsets.all(20),
                  child: Center(
                      child: CircularProgressIndicator(color: _chYellow)),
                ),
              ...rows,
              const Divider(color: Colors.white24, height: 28),
              _sum('Items', _chMoney(_chNum(o['subtotal']))),
              _sum('Delivery fee', _chMoney(_chNum(o['delivery_fee']))),
              _sum('Tip', _chMoney(_chNum(o['tip_amount']))),
              _sum('Total', _chMoney(total), bold: true),
              if (status == 'delivered') _ratingBlock(),
              const SizedBox(height: 14),
              Wrap(spacing: 10, runSpacing: 10, children: [
                if (status == 'delivered')
                  ElevatedButton(
                    onPressed: widget.onReorder,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _chYellow,
                      foregroundColor: Colors.black,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(22)),
                    ),
                    child: const Text('Reorder',
                        style: TextStyle(fontWeight: FontWeight.w800)),
                  ),
                OutlinedButton(
                  onPressed: widget.onHelp,
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: _chMuted),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(22)),
                  ),
                  child: const Text('Problem with this order?',
                      style: TextStyle(
                          color: Colors.white, fontWeight: FontWeight.w700)),
                ),
              ]),
            ],
          ),
        ),
      ]),
    );
  }

  Widget _sum(String label, String value, {bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(children: [
        Expanded(
          child: Text(label,
              style: TextStyle(
                  color: bold ? Colors.white : _chMuted,
                  fontSize: bold ? 16 : 13,
                  fontWeight: bold ? FontWeight.w800 : FontWeight.w500)),
        ),
        Text(value,
            style: TextStyle(
                color: bold ? _chYellow : Colors.white,
                fontSize: bold ? 16 : 13,
                fontWeight: bold ? FontWeight.w800 : FontWeight.w600)),
      ]),
    );
  }
}

// -------------------------------------------------------------------- AI help chat sheet
class _ChHelpSheet extends StatefulWidget {
  const _ChHelpSheet({required this.orderId, required this.orders});

  final String? orderId;
  final List<Map<String, dynamic>> orders;

  @override
  State<_ChHelpSheet> createState() => _ChHelpSheetState();
}

class _ChHelpSheetState extends State<_ChHelpSheet> {
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
          color: mine ? _chYellow : _chPanel,
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
                            ? _chYellow.withOpacity(0.2)
                            : _chPanel,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                            color:
                                _orderId == null ? _chYellow : Colors.white12),
                      ),
                      child: const Text('Not about an order',
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
                              ? _chYellow.withOpacity(0.2)
                              : _chPanel,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                              color: _orderId == o['id'].toString()
                                  ? _chYellow
                                  : Colors.white12),
                        ),
                        child: Text(
                            '${(o['store_name'] ?? '').toString().split(' + ').first}  -  ${_chWhen(o['created_at']).split('  -  ').first}',
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
                    'Hi, I am Sleipnir Support, an AI assistant. What is going on with your order?'),
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
                        color: _chPanel,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: _chYellow),
                      ),
                    ),
                  ),
                if (_err != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(_err!,
                        style: const TextStyle(color: _chRed, fontSize: 13)),
                  ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
            decoration: const BoxDecoration(
              color: _chPanel,
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
                    hintStyle: const TextStyle(color: _chMuted),
                    filled: true,
                    fillColor: _chBg,
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
                    color: _busy ? Colors.white12 : _chYellow,
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

// -------------------------------------------------------------------- add place sheet
class _ChPlaceSheet extends StatefulWidget {
  const _ChPlaceSheet();

  @override
  State<_ChPlaceSheet> createState() => _ChPlaceSheetState();
}

class _ChPlaceSheetState extends State<_ChPlaceSheet> {
  final TextEditingController _search = TextEditingController();
  final TextEditingController _note = TextEditingController();
  final TextEditingController _otherLabel = TextEditingController();
  Timer? _debounce;
  String _label = 'Home';
  List<Map<String, dynamic>> _results = <Map<String, dynamic>>[];
  Map<String, dynamic>? _picked;
  bool _busy = false;
  String? _err;

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    _note.dispose();
    _otherLabel.dispose();
    super.dispose();
  }

  void _changed(String q) {
    _debounce?.cancel();
    final t = q.trim();
    if (t.length < 4) {
      setState(() => _results = <Map<String, dynamic>>[]);
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 700), () async {
      final r = await _chSearch(t);
      if (mounted) setState(() => _results = r);
    });
  }

  Future<void> _useMyLocation() async {
    setState(() {
      _busy = true;
      _err = null;
    });
    try {
      final enabled = await geo.Geolocator.isLocationServiceEnabled();
      if (!enabled) throw 'Turn on location services on your phone.';
      var perm = await geo.Geolocator.checkPermission();
      if (perm == geo.LocationPermission.denied) {
        perm = await geo.Geolocator.requestPermission();
      }
      if (perm == geo.LocationPermission.denied ||
          perm == geo.LocationPermission.deniedForever) {
        throw 'Location is off for Sleipnir. You can search for the address instead.';
      }
      final p = await geo.Geolocator.getCurrentPosition()
          .timeout(const Duration(seconds: 20));
      final addr = await _chReverse(ll.LatLng(p.latitude, p.longitude));
      if (mounted) {
        setState(() {
          _picked = <String, dynamic>{
            'label': addr,
            'lat': p.latitude,
            'lng': p.longitude
          };
          _results = <Map<String, dynamic>>[];
        });
      }
    } catch (e) {
      if (mounted) setState(() => _err = e.toString());
    }
    if (mounted) setState(() => _busy = false);
  }

  void _save() {
    if (_picked == null) {
      setState(() => _err = 'Pick an address first.');
      return;
    }
    final label = _label == 'Other' ? _otherLabel.text.trim() : _label;
    if (label.isEmpty) {
      setState(() => _err = 'Give this place a name.');
      return;
    }
    Navigator.pop(context, <String, dynamic>{
      'label': label,
      'address': _picked!['label'],
      'lat': _picked!['lat'],
      'lng': _picked!['lng'],
      'note': _note.text.trim().isEmpty ? null : _note.text.trim(),
    });
  }

  Widget _field(TextEditingController c, String hint,
      {ValueChanged<String>? onChanged, IconData? icon}) {
    return TextField(
      controller: c,
      onChanged: onChanged,
      style: const TextStyle(color: Colors.white, fontSize: 15),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: _chMuted),
        prefixIcon: icon == null ? null : Icon(icon, color: _chMuted),
        filled: true,
        fillColor: _chPanel,
        isDense: true,
        contentPadding: const EdgeInsets.all(14),
        border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).viewInsets.bottom;
    return SizedBox(
      height: MediaQuery.of(context).size.height * 0.86,
      child: Padding(
        padding: EdgeInsets.fromLTRB(16, 14, 16, 16 + bottom),
        child: ListView(children: [
          Row(children: [
            const Expanded(
              child: Text('Add a place',
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
          const SizedBox(height: 6),
          Wrap(spacing: 8, runSpacing: 8, children: [
            for (final l in <String>['Home', 'Work', 'Other'])
              GestureDetector(
                onTap: () => setState(() => _label = l),
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
                  decoration: BoxDecoration(
                    color: _label == l ? _chYellow : _chPanel,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(l,
                      style: TextStyle(
                          color: _label == l ? Colors.black : Colors.white,
                          fontSize: 13,
                          fontWeight: FontWeight.w800)),
                ),
              ),
          ]),
          if (_label == 'Other')
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: _field(_otherLabel, 'Name (Mom, Lake house...)'),
            ),
          const SizedBox(height: 12),
          _field(_search, 'Search an address',
              onChanged: _changed, icon: Icons.search),
          const SizedBox(height: 8),
          Row(children: [
            GestureDetector(
              onTap: _busy ? null : _useMyLocation,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                decoration: BoxDecoration(
                  border: Border.all(color: _chYellow),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(_busy ? 'Finding you...' : 'Use my location',
                    style: const TextStyle(
                        color: _chYellow,
                        fontSize: 13,
                        fontWeight: FontWeight.w700)),
              ),
            ),
          ]),
          for (final r in _results)
            GestureDetector(
              onTap: () => setState(() {
                _picked = r;
                _results = <Map<String, dynamic>>[];
                _search.clear();
                FocusScope.of(context).unfocus();
              }),
              child: Container(
                width: double.infinity,
                margin: const EdgeInsets.only(top: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                    color: _chPanel, borderRadius: BorderRadius.circular(12)),
                child: Row(children: [
                  const Icon(Icons.place_outlined, color: _chYellow, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text((r['label'] ?? '').toString(),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style:
                            const TextStyle(color: Colors.white, fontSize: 13)),
                  ),
                ]),
              ),
            ),
          if (_picked != null)
            Container(
              width: double.infinity,
              margin: const EdgeInsets.only(top: 12),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: _chGreen.withOpacity(0.12),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: _chGreen),
              ),
              child: Row(children: [
                const Icon(Icons.check_circle, color: _chGreen, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text((_picked!['label'] ?? '').toString(),
                      style:
                          const TextStyle(color: Colors.white, fontSize: 14)),
                ),
              ]),
            ),
          const SizedBox(height: 12),
          _field(_note, 'Gate code, apartment, where to leave it (optional)'),
          if (_err != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(_err!,
                  style: const TextStyle(color: _chRed, fontSize: 13)),
            ),
          const SizedBox(height: 14),
          SizedBox(
            height: 50,
            child: ElevatedButton(
              onPressed: _save,
              style: ElevatedButton.styleFrom(
                backgroundColor: _chYellow,
                foregroundColor: Colors.black,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('Save place',
                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            ),
          ),
        ]),
      ),
    );
  }
}