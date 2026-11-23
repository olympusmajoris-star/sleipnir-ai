// Studio preview backend: answers every Supabase call from an in-memory copy
// of test data, so the real app widgets run without touching the live
// database. Writes change only this in-memory copy and vanish on reload.
import 'dart:convert';
import 'dart:math' as math;

import 'package:http/http.dart' as http;

class PreviewDb {
  final Map<String, List<Map<String, dynamic>>> tables =
      <String, List<Map<String, dynamic>>>{};

  List<Map<String, dynamic>> t(String name) =>
      tables.putIfAbsent(name, () => <Map<String, dynamic>>[]);

  Map<String, dynamic>? byId(String table, Object? id) {
    final String key = '$id';
    for (final Map<String, dynamic> r in t(table)) {
      if ('${r['id']}' == key) return r;
    }
    return null;
  }
}

String previewNow() => DateTime.now().toUtc().toIso8601String();

class PreviewBackend extends http.BaseClient {
  PreviewBackend(this.db, this.userId, this.passthrough, this.session);

  static const String host = 'afnihsdxtisneuyehatw.supabase.co';
  static const String url = 'https://afnihsdxtisneuyehatw.supabase.co';
  static const String anonKey = 'studio-preview';

  final PreviewDb db;
  final String userId;
  final http.Client passthrough;
  final Map<String, dynamic> session;
  final math.Random _rnd = math.Random();

  static const Set<String> _reserved = <String>{
    'select',
    'order',
    'limit',
    'offset',
    'on_conflict',
    'columns',
  };

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    if (request.url.host != host) return passthrough.send(request);
    final List<int> raw = await request.finalize().toBytes();
    dynamic body;
    if (raw.isNotEmpty) {
      try {
        body = jsonDecode(utf8.decode(raw));
      } catch (_) {
        body = null;
      }
    }
    final String path = request.url.path;
    try {
      if (path.startsWith('/rest/v1/rpc/')) {
        final Map<String, dynamic> params = body is Map
            ? Map<String, dynamic>.from(body)
            : <String, dynamic>{};
        return _json(request, 200, _rpc(path.substring(13), params));
      }
      if (path.startsWith('/rest/v1/')) {
        return _rest(request, path.substring(9), body);
      }
      if (path.startsWith('/storage/v1/')) {
        return _storage(request, path.substring(12));
      }
      if (path.startsWith('/functions/v1/')) {
        return _json(request, 200, <String, dynamic>{
          'reply':
              'Studio preview: this is where Sleipnir Support answers in the app.',
          'ticket_id': '',
        });
      }
      if (path.startsWith('/auth/v1/token')) {
        return _json(request, 200, session);
      }
      if (path.startsWith('/auth/v1/user')) {
        return _json(request, 200, session['user']);
      }
      if (path.startsWith('/auth/v1/logout')) {
        return _json(request, 204, null);
      }
      return _json(request, 200, <String, dynamic>{});
    } catch (e) {
      return _json(request, 400, <String, dynamic>{
        'code': 'PREVIEW',
        'message': '$e',
        'details': null,
        'hint': null,
      });
    }
  }

  // ------------------------------------------------------------ responses
  http.StreamedResponse _json(http.BaseRequest req, int status, Object? data) {
    final List<int> out =
        data == null && status != 200 ? <int>[] : utf8.encode(jsonEncode(data));
    return http.StreamedResponse(
      Stream<List<int>>.value(out),
      status,
      contentLength: out.length,
      request: req,
      headers: <String, String>{
        'content-type': 'application/json; charset=utf-8',
      },
    );
  }

  http.StreamedResponse _rows(http.BaseRequest req,
      List<Map<String, dynamic>> rows, bool single, int okStatus) {
    if (single) {
      if (rows.length == 1) return _json(req, okStatus, rows.first);
      return _json(req, 406, <String, dynamic>{
        'code': 'PGRST116',
        'details': 'The result contains ${rows.length} rows',
        'hint': null,
        'message': 'JSON object requested, multiple (or no) rows returned',
      });
    }
    return _json(req, okStatus, rows);
  }

  // ------------------------------------------------------------ rest
  http.StreamedResponse _rest(
      http.BaseRequest req, String table, dynamic body) {
    final Map<String, List<String>> q = req.url.queryParametersAll;
    final String accept = req.headers['accept'] ?? '';
    final String prefer = req.headers['prefer'] ?? '';
    final bool single = accept.contains('vnd.pgrst.object');
    final bool rep = prefer.contains('return=representation');
    final List<Map<String, dynamic>> rows = db.t(table);
    final String method = req.method.toUpperCase();

    if (method == 'GET' || method == 'HEAD') {
      List<Map<String, dynamic>> list = filter(rows, q);
      list = _sorted(list, q['order']?.first);
      final int offset = int.tryParse(q['offset']?.first ?? '') ?? 0;
      final int? limit = int.tryParse(q['limit']?.first ?? '');
      if (offset > 0) list = list.skip(offset).toList();
      if (limit != null && list.length > limit) list = list.take(limit).toList();
      return _rows(req, list, single, 200);
    }

    if (method == 'POST') {
      final List<dynamic> incoming = body is List
          ? body
          : (body == null ? <dynamic>[] : <dynamic>[body]);
      final bool upsert = prefer.contains('resolution=');
      final bool ignoreDup = prefer.contains('ignore-duplicates');
      final List<String> keys = (q['on_conflict']?.first ?? 'id')
          .split(',')
          .map((String s) => s.trim())
          .where((String s) => s.isNotEmpty)
          .toList();
      final List<Map<String, dynamic>> out = <Map<String, dynamic>>[];
      for (final dynamic item in incoming) {
        if (item is! Map) continue;
        final Map<String, dynamic> m = Map<String, dynamic>.from(item);
        Map<String, dynamic>? existing;
        if (upsert) {
          for (final Map<String, dynamic> r in rows) {
            bool same = keys.isNotEmpty;
            for (final String k in keys) {
              if (m[k] == null || '${r[k]}' != '${m[k]}') same = false;
            }
            if (same) {
              existing = r;
              break;
            }
          }
        }
        if (existing != null) {
          if (!ignoreDup) existing.addAll(m);
          out.add(existing);
        } else {
          m.putIfAbsent('id', newId);
          m.putIfAbsent('created_at', previewNow);
          rows.add(m);
          out.add(m);
        }
      }
      if (rep) return _rows(req, out, single, 201);
      return _json(req, 201, null);
    }

    if (method == 'PATCH') {
      final List<Map<String, dynamic>> hit = filter(rows, q);
      if (body is Map) {
        final Map<String, dynamic> patch = Map<String, dynamic>.from(body);
        for (final Map<String, dynamic> r in hit) {
          r.addAll(patch);
        }
      }
      if (rep) return _rows(req, hit, single, 200);
      return _json(req, 204, null);
    }

    if (method == 'DELETE') {
      final List<Map<String, dynamic>> hit = filter(rows, q);
      rows.removeWhere((Map<String, dynamic> r) => hit.contains(r));
      if (rep) return _rows(req, hit, single, 200);
      return _json(req, 204, null);
    }

    return _json(req, 200, <dynamic>[]);
  }

  List<Map<String, dynamic>> filter(
      List<Map<String, dynamic>> rows, Map<String, List<String>> q) {
    return rows.where((Map<String, dynamic> r) {
      for (final MapEntry<String, List<String>> e in q.entries) {
        if (_reserved.contains(e.key)) continue;
        for (final String expr in e.value) {
          if (!_match(r, e.key, expr)) return false;
        }
      }
      return true;
    }).toList();
  }

  static String _s(dynamic v) {
    if (v is double && v == v.truncateToDouble() && v.abs() < 1e15) {
      return v.toInt().toString();
    }
    return '$v';
  }

  static List<String> _inList(String v) {
    String s = v.trim();
    if (s.startsWith('(')) s = s.substring(1);
    if (s.endsWith(')')) s = s.substring(0, s.length - 1);
    final List<String> out = <String>[];
    final StringBuffer cur = StringBuffer();
    bool quoted = false;
    for (int i = 0; i < s.length; i++) {
      final String c = s[i];
      if (c == '"') {
        quoted = !quoted;
      } else if (c == ',' && !quoted) {
        out.add(cur.toString());
        cur.clear();
      } else {
        cur.write(c);
      }
    }
    if (cur.isNotEmpty || s.isNotEmpty) out.add(cur.toString());
    return out;
  }

  static int _cmp(dynamic a, dynamic b) {
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    final num? na = a is num ? a : num.tryParse('$a');
    final num? nb = b is num ? b : num.tryParse('$b');
    if (na != null && nb != null) return na.compareTo(nb);
    return '$a'.compareTo('$b');
  }

  static bool _match(Map<String, dynamic> row, String col, String expr) {
    bool neg = false;
    String x = expr;
    if (x.startsWith('not.')) {
      neg = true;
      x = x.substring(4);
    }
    final int dot = x.indexOf('.');
    if (dot < 0) return true;
    final String op = x.substring(0, dot);
    final String val = x.substring(dot + 1);
    final dynamic cell = row[col];
    bool r;
    switch (op) {
      case 'eq':
        r = cell != null && _s(cell) == val;
        break;
      case 'neq':
        r = cell != null && _s(cell) != val;
        break;
      case 'in':
        r = cell != null && _inList(val).contains(_s(cell));
        break;
      case 'is':
        if (val == 'null') {
          r = cell == null;
        } else if (val == 'true') {
          r = cell == true;
        } else if (val == 'false') {
          r = cell == false;
        } else {
          r = true;
        }
        break;
      case 'gt':
        r = cell != null && _cmp(cell, val) > 0;
        break;
      case 'gte':
        r = cell != null && _cmp(cell, val) >= 0;
        break;
      case 'lt':
        r = cell != null && _cmp(cell, val) < 0;
        break;
      case 'lte':
        r = cell != null && _cmp(cell, val) <= 0;
        break;
      case 'like':
      case 'ilike':
        final String pat = RegExp.escape(val)
            .replaceAll('\\*', '.*')
            .replaceAll('%', '.*');
        r = cell != null &&
            RegExp('^$pat\$', caseSensitive: op == 'like').hasMatch('$cell');
        break;
      default:
        r = true;
    }
    return neg ? !r : r;
  }

  static List<Map<String, dynamic>> _sorted(
      List<Map<String, dynamic>> list, String? order) {
    if (order == null || order.trim().isEmpty) return list;
    final List<List<String>> keys = order
        .split(',')
        .map((String s) => s.trim().split('.'))
        .where((List<String> p) => p.isNotEmpty && p.first.isNotEmpty)
        .toList();
    final List<Map<String, dynamic>> out = List<Map<String, dynamic>>.of(list);
    out.sort((Map<String, dynamic> a, Map<String, dynamic> b) {
      for (final List<String> k in keys) {
        final bool desc = k.contains('desc');
        final bool nullsFirst = k.contains('nullsfirst');
        final dynamic va = a[k.first];
        final dynamic vb = b[k.first];
        int c;
        if (va == null || vb == null) {
          if (va == null && vb == null) {
            c = 0;
          } else if (va == null) {
            c = nullsFirst ? -1 : 1;
          } else {
            c = nullsFirst ? 1 : -1;
          }
        } else {
          c = _cmp(va, vb);
          if (desc) c = -c;
        }
        if (c != 0) return c;
      }
      return 0;
    });
    return out;
  }

  // ------------------------------------------------------------ storage
  http.StreamedResponse _storage(http.BaseRequest req, String rest) {
    if (rest.startsWith('object/sign/')) {
      final String p = rest.substring('object/sign/'.length);
      return _json(req, 200, <String, dynamic>{
        'signedURL': '/object/sign/$p?token=studio-preview',
      });
    }
    if (rest.startsWith('object/')) {
      final String p = rest.substring('object/'.length);
      return _json(req, 200, <String, dynamic>{'Key': p, 'Id': newId()});
    }
    return _json(req, 200, <String, dynamic>{});
  }

  // ------------------------------------------------------------ helpers
  String newId() {
    String h(int n) {
      final StringBuffer b = StringBuffer();
      for (int i = 0; i < n; i++) {
        b.write(_rnd.nextInt(16).toRadixString(16));
      }
      return b.toString();
    }

    return '${h(8)}-${h(4)}-4${h(3)}-a${h(3)}-${h(12)}';
  }

  static double _num(dynamic v) {
    if (v is num) return v.toDouble();
    return double.tryParse('${v ?? ''}') ?? 0.0;
  }

  static double _r2(double v) => (v * 100).roundToDouble() / 100;

  bool _valkyrieOk() {
    final Map<String, dynamic>? d = db.byId('drivers', userId);
    return d != null && d['active'] == true;
  }

  Map<String, dynamic>? _rig() {
    for (final Map<String, dynamic> r in db.t('valkyrie_rigs')) {
      if ('${r['driver_id']}' == userId) return r;
    }
    return null;
  }

  int _rank(Object? code) {
    for (final Map<String, dynamic> c in db.t('freight_classes')) {
      if ('${c['code']}' == '$code') return (c['rank'] as num?)?.toInt() ?? 0;
    }
    return 0;
  }

  String _classLabel(Object? code) {
    for (final Map<String, dynamic> c in db.t('freight_classes')) {
      if ('${c['code']}' == '$code') return '${c['label']}';
    }
    return '$code';
  }

  bool _fits(Map<String, dynamic> load) {
    final Map<String, dynamic>? r = _rig();
    if (r == null) return false;
    if (_rank(r['class_code']) < _rank(load['required_class'])) return false;
    if (_num(r['payload_lbs']) < _num(load['weight_lbs'])) return false;
    if (load['needs_liftgate'] == true && r['has_liftgate'] != true) {
      return false;
    }
    return true;
  }

  bool _activeOrder() {
    for (final Map<String, dynamic> o in db.t('orders')) {
      if ('${o['driver_id']}' == userId &&
          (o['status'] == 'accepted' || o['status'] == 'picked_up')) {
        return true;
      }
    }
    return false;
  }

  void _systemMessage(Object? orderId, String body) {
    db.t('order_messages').add(<String, dynamic>{
      'id': newId(),
      'order_id': '$orderId',
      'sender': 'system',
      'sender_id': null,
      'body': body,
      'image_url': null,
      'item_id': null,
      'created_at': previewNow(),
      'read_at': null,
    });
  }

  // ------------------------------------------------------------ rpc
  Object? _rpc(String fn, Map<String, dynamic> p) {
    switch (fn) {
      case 'valkyrie_open_orders':
        return _openOrders();
      case 'valkyrie_accept_order':
        return _accept(p['p_order']);
      case 'valkyrie_drop_order':
        return _drop(p['p_order']);
      case 'valkyrie_hot_zones':
        return _hotZones();
      case 'freight_board':
        return _freightBoard();
      case 'freight_claim':
        return _freightClaim(p['p_load']);
      case 'freight_bid':
        return _freightBid(p['p_load'], p['p_price'], p['p_note']);
      case 'freight_withdraw_bid':
        for (final Map<String, dynamic> b in db.t('freight_bids')) {
          if ('${b['load_id']}' == '${p['p_load']}' &&
              '${b['driver_id']}' == userId &&
              b['status'] == 'pending') {
            b['status'] = 'withdrawn';
          }
        }
        return <String, dynamic>{'ok': true, 'msg': 'Bid withdrawn'};
      case 'customer_rate_order':
        return _rate(p);
    }
    return null;
  }

  List<Map<String, dynamic>> _openOrders() {
    if (!_valkyrieOk()) return <Map<String, dynamic>>[];
    final List<Map<String, dynamic>> out = <Map<String, dynamic>>[];
    final List<Map<String, dynamic>> pending = db
        .t('orders')
        .where((Map<String, dynamic> o) =>
            o['status'] == 'pending' && o['driver_id'] == null)
        .toList()
      ..sort((Map<String, dynamic> a, Map<String, dynamic> b) =>
          '${a['created_at']}'.compareTo('${b['created_at']}'));
    for (final Map<String, dynamic> o in pending) {
      final String id = '${o['id']}';
      int qty = 0;
      int heavy = 0;
      for (final Map<String, dynamic> i in db.t('order_items')) {
        if ('${i['order_id']}' != id) continue;
        qty += (i['qty'] as num?)?.toInt() ?? 0;
        if (i['delivery_class'] == 'heavy') heavy++;
      }
      final List<Map<String, dynamic>> stops = db
          .t('order_stops')
          .where((Map<String, dynamic> s) => '${s['order_id']}' == id)
          .toList()
        ..sort((Map<String, dynamic> a, Map<String, dynamic> b) =>
            _cmp(a['stop_index'], b['stop_index']));
      out.add(<String, dynamic>{
        'id': id,
        'created_at': o['created_at'],
        'store_name': o['store_name'],
        'dropoff_lat': _r2(_num(o['dropoff_lat'])),
        'dropoff_lng': _r2(_num(o['dropoff_lng'])),
        'delivery_fee': o['delivery_fee'],
        'tip_amount': o['tip_amount'],
        'sub_preference': o['sub_preference'],
        'dropoff_mode': o['dropoff_mode'],
        'pay': _r2(_num(o['delivery_fee']) * 0.8 + _num(o['tip_amount'])),
        'item_qty': qty,
        'heavy_count': heavy,
        'stops': stops
            .map((Map<String, dynamic> s) => <String, dynamic>{
                  'name': s['store_name'],
                  'lat': s['lat'],
                  'lng': s['lng'],
                  'is_food': s['is_food'],
                  'stop_index': s['stop_index'],
                })
            .toList(),
      });
    }
    return out;
  }

  bool _accept(Object? orderId) {
    if (!_valkyrieOk() || _activeOrder()) return false;
    final Map<String, dynamic>? o = db.byId('orders', orderId);
    if (o == null || o['status'] != 'pending' || o['driver_id'] != null) {
      return false;
    }
    o['driver_id'] = userId;
    o['status'] = 'accepted';
    o['accepted_at'] = previewNow();
    o['valkyrie_pay'] =
        _r2(_num(o['delivery_fee']) * 0.8 + _num(o['tip_amount']));
    _systemMessage(orderId, 'A Valkyrie accepted your order.');
    return true;
  }

  bool _drop(Object? orderId) {
    final Map<String, dynamic>? o = db.byId('orders', orderId);
    if (o == null ||
        '${o['driver_id']}' != userId ||
        o['status'] != 'accepted' ||
        o['shopping_started_at'] != null) {
      return false;
    }
    o['driver_id'] = null;
    o['status'] = 'pending';
    o['accepted_at'] = null;
    _systemMessage(orderId,
        'Your Valkyrie had to drop the order. We are finding you another one.');
    return true;
  }

  List<Map<String, dynamic>> _hotZones() {
    if (!_valkyrieOk()) return <Map<String, dynamic>>[];
    final Map<String, int> n = <String, int>{};
    final RegExp re = RegExp(r',\s*([^,]+),\s*[A-Za-z]{2}\s*\d*\s*$');
    final DateTime since = DateTime.now().toUtc().subtract(const Duration(days: 7));
    for (final Map<String, dynamic> o in db.t('orders')) {
      final DateTime? c = DateTime.tryParse('${o['created_at']}');
      final String addr = '${o['dropoff_address'] ?? ''}';
      if (c == null || c.isBefore(since) || addr.isEmpty) continue;
      final RegExpMatch? m = re.firstMatch(addr);
      final String area = m == null ? 'Other' : m.group(1)!.trim();
      n[area] = (n[area] ?? 0) + 1;
    }
    final List<MapEntry<String, int>> list = n.entries.toList()
      ..sort((MapEntry<String, int> a, MapEntry<String, int> b) =>
          b.value.compareTo(a.value));
    return list
        .take(8)
        .map((MapEntry<String, int> e) =>
            <String, dynamic>{'area': e.key, 'orders': e.value})
        .toList();
  }

  List<Map<String, dynamic>> _freightBoard() {
    final DateTime now = DateTime.now().toUtc();
    final List<Map<String, dynamic>> out = <Map<String, dynamic>>[];
    for (final Map<String, dynamic> l in db.t('freight_loads')) {
      if (l['status'] != 'open') continue;
      if ('${l['poster_id']}' == userId) continue;
      final String? direct =
          l['direct_driver_id'] == null ? null : '${l['direct_driver_id']}';
      final DateTime? until = DateTime.tryParse('${l['direct_until'] ?? ''}');
      final bool directLive = until != null && until.isAfter(now);
      if (direct != null && direct != userId && directLive) continue;
      if (!_fits(l)) continue;
      Map<String, dynamic>? bid;
      for (final Map<String, dynamic> b in db.t('freight_bids')) {
        if ('${b['load_id']}' == '${l['id']}' && '${b['driver_id']}' == userId) {
          bid = b;
        }
      }
      out.add(<String, dynamic>{
        ...l,
        'class_label': _classLabel(l['required_class']),
        'is_direct': direct == userId && directLive,
        'my_bid': bid?['price'],
        'my_bid_status': bid?['status'],
      });
    }
    out.sort((Map<String, dynamic> a, Map<String, dynamic> b) {
      final int d = (b['is_direct'] == true ? 1 : 0) - (a['is_direct'] == true ? 1 : 0);
      if (d != 0) return d;
      return '${b['created_at']}'.compareTo('${a['created_at']}');
    });
    return out;
  }

  Map<String, dynamic> _freightClaim(Object? loadId) {
    final Map<String, dynamic>? l = db.byId('freight_loads', loadId);
    if (l == null || l['status'] != 'open') {
      return <String, dynamic>{'ok': false, 'msg': 'Load is no longer open'};
    }
    if ('${l['poster_id']}' == userId) {
      return <String, dynamic>{'ok': false, 'msg': 'You posted this load'};
    }
    final DateTime? until = DateTime.tryParse('${l['direct_until'] ?? ''}');
    if (l['direct_driver_id'] != null &&
        '${l['direct_driver_id']}' != userId &&
        until != null &&
        until.isAfter(DateTime.now().toUtc())) {
      return <String, dynamic>{
        'ok': false,
        'msg': 'Load is reserved for another driver'
      };
    }
    if (!_fits(l)) {
      return <String, dynamic>{
        'ok': false,
        'msg': "Your rig can't carry this load"
      };
    }
    l['status'] = 'assigned';
    l['driver_id'] = userId;
    l['final_price'] = l['price'];
    l['assigned_at'] = previewNow();
    l['updated_at'] = previewNow();
    for (final Map<String, dynamic> b in db.t('freight_bids')) {
      if ('${b['load_id']}' == '$loadId' && b['status'] == 'pending') {
        b['status'] = 'declined';
      }
    }
    return <String, dynamic>{'ok': true, 'msg': 'Load claimed'};
  }

  Map<String, dynamic> _freightBid(Object? loadId, Object? price, Object? note) {
    final double pr = _num(price);
    if (pr <= 0) return <String, dynamic>{'ok': false, 'msg': 'Enter a price'};
    final Map<String, dynamic>? l = db.byId('freight_loads', loadId);
    if (l == null || l['status'] != 'open') {
      return <String, dynamic>{'ok': false, 'msg': 'Load is no longer open'};
    }
    if (l['allow_bids'] != true) {
      return <String, dynamic>{
        'ok': false,
        'msg': 'This load does not take bids'
      };
    }
    if ('${l['poster_id']}' == userId) {
      return <String, dynamic>{'ok': false, 'msg': 'You posted this load'};
    }
    if (!_fits(l)) {
      return <String, dynamic>{
        'ok': false,
        'msg': "Your rig can't carry this load"
      };
    }
    Map<String, dynamic>? bid;
    for (final Map<String, dynamic> b in db.t('freight_bids')) {
      if ('${b['load_id']}' == '$loadId' && '${b['driver_id']}' == userId) {
        bid = b;
      }
    }
    if (bid == null) {
      db.t('freight_bids').add(<String, dynamic>{
        'id': newId(),
        'load_id': '$loadId',
        'driver_id': userId,
        'price': _r2(pr),
        'note': note,
        'status': 'pending',
        'created_at': previewNow(),
      });
    } else {
      bid['price'] = _r2(pr);
      bid['note'] = note;
      bid['status'] = 'pending';
      bid['created_at'] = previewNow();
    }
    return <String, dynamic>{'ok': true, 'msg': 'Bid sent'};
  }

  bool _rate(Map<String, dynamic> p) {
    final int rating = (p['p_rating'] as num?)?.toInt() ?? 0;
    if (rating < 1 || rating > 5) return false;
    final Map<String, dynamic>? o = db.byId('orders', p['p_order']);
    if (o == null ||
        '${o['customer_id']}' != userId ||
        o['status'] != 'delivered' ||
        o['rated_at'] != null) {
      return false;
    }
    final double extra = math.max(0.0, _num(p['p_extra_tip']));
    final String comment = '${p['p_comment'] ?? ''}'.trim();
    o['rating'] = rating;
    o['rating_comment'] = comment.isEmpty ? null : comment;
    o['rated_at'] = previewNow();
    o['extra_tip'] = extra;
    o['tip_amount'] = _r2(_num(o['tip_amount']) + extra);
    if (o['final_total'] != null) {
      o['final_total'] = _r2(_num(o['final_total']) + extra);
    }
    if (o['valkyrie_pay'] != null) {
      o['valkyrie_pay'] = _r2(_num(o['valkyrie_pay']) + extra);
    }
    final Map<String, dynamic>? d = db.byId('drivers', o['driver_id']);
    if (d != null) {
      final int n = (d['rating_count'] as num?)?.toInt() ?? 0;
      d['rating_avg'] = _r2((_num(d['rating_avg']) * n + rating) / (n + 1));
      d['rating_count'] = n + 1;
    }
    return true;
  }
}
