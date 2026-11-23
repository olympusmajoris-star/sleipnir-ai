// Test data for the studio preview. Everything here is fake: the test
// accounts (Loki, Freya, Sif, Tyr, Hel, Baldr, Test Woman) and their orders.
// Store and product rows are copied from the live catalog so names, prices
// and photos match the app.
import 'dart:convert';

import 'backend.dart';

class PreviewUser {
  const PreviewUser(this.id, this.name, this.email);

  final String id;
  final String name;
  final String email;
}

const PreviewUser kLoki =
    PreviewUser('10c1a000-0000-4000-8000-00000000a001', 'Loki', 'loki@test.sleipnir.app');
const PreviewUser kFreya =
    PreviewUser('10c1a000-0000-4000-8000-00000000a002', 'Freya', 'freya@test.sleipnir.app');
const PreviewUser kSif =
    PreviewUser('10c1a000-0000-4000-8000-00000000a003', 'Sif', 'sif@test.sleipnir.app');
const PreviewUser kBaldr =
    PreviewUser('10c1a000-0000-4000-8000-00000000a004', 'Baldr', 'baldr@test.sleipnir.app');
const PreviewUser kHel =
    PreviewUser('10c1a000-0000-4000-8000-00000000a005', 'Hel', 'hel@test.sleipnir.app');
const PreviewUser kTyr =
    PreviewUser('10c1a000-0000-4000-8000-00000000a006', 'Tyr', 'tyr@test.sleipnir.app');
const PreviewUser kTestWoman = PreviewUser(
    '10c1a000-0000-4000-8000-00000000a007', 'Test Woman', 'testwoman@test.sleipnir.app');
const PreviewUser kAdmin = PreviewUser(
    '10c1a000-0000-4000-8000-00000000a00f', 'Studio Admin', 'admin@test.sleipnir.app');

class _Store {
  const _Store(this.id, this.name, this.address, this.lat, this.lng, this.food);

  final String id;
  final String name;
  final String address;
  final double lat;
  final double lng;
  final bool food;
}

const _Store _target = _Store('35ef70d0-3d20-4599-96a3-648ee3c7c340', 'Target',
    '5100 E Highway 100, Palm Coast, FL 32164', 29.4851, -81.2314, false);
const _Store _mcd = _Store('2b145836-6d20-43dc-b01e-373c88c5aead', "McDonald's",
    '4851 Belle Terre Pkwy, Palm Coast, FL 32137', 29.546, -81.2335, true);
const _Store _aldi = _Store('e5a01340-424a-4a41-b0e6-99cb9e944733',
    'ALDI (Palm Coast Pkwy)', '645 Palm Coast Pkwy SW, Palm Coast, FL 32137',
    29.5492, -81.2263, false);
const _Store _grille = _Store('07fd76aa-9a3e-460d-8ead-4d4ec807d978',
    'Atlantic Grille', '200 Ocean Crest Dr, Palm Coast, FL 32137', 29.6255,
    -81.2052, true);
const _Store _auto = _Store('2d8bbe31-50a6-4565-b7e7-911130bfa4fa',
    'Advance Auto Parts (PC Pkwy)', '1010 Palm Coast Pkwy NW, Palm Coast, FL 32137',
    29.5552, -81.2152, false);

class _Product {
  const _Product(this.id, this.store, this.name, this.price, this.image);

  final String id;
  final _Store store;
  final String name;
  final double price;
  final String image;
}

const _Product _milk = _Product(
    '4494c54a-c320-460e-85c3-debe3a76e5b2',
    _target,
    '1% Low Fat Milk - 1gal - Good & Gather™',
    3.39,
    'https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/menu-images/products/4d4c119d-5e8f-4677-be46-65077981ecaf.jpg');
const _Product _coffee = _Product(
    'e63020c0-d68e-419a-a0ee-3ae001c54b31',
    _target,
    '100% Colombian Medium Roast Coffee - Single Serve Pods - 12ct - Market Pantry™',
    5.19,
    'https://d2lnr5mha7bycj.cloudfront.net/product-image/file/large_a0662833-57c5-4fdc-bee9-5c51c37c431a.jpeg');
const _Product _cottage = _Product(
    '4e32ec83-e82f-4f79-ba3d-d7e2a7f0c5e2',
    _target,
    '1% Milkfat Low fat Small Curd Cottage Cheese - 24oz - Good & Gather™',
    2.99,
    'https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/menu-images/products/b4873369-99da-4a13-9432-d455414d2557.webp');
const _Product _cereal = _Product(
    '908ac906-90fa-4312-968c-619159693da7',
    _target,
    ':ratio Protein Fiber Cinnamon Almond Breakfast Cereal - 15.4oz',
    7.29,
    'https://target.scene7.com/is/image/Target/GUEST_f295f880-40fb-45e0-875e-b9d9ef70dd97?fmt=png-alpha&wid=1000');
const _Product _nuggets = _Product(
    '07a1da74-2866-43d0-81b6-cae1e50d5a69',
    _mcd,
    '10 pc. Chicken McNuggets®',
    7.29,
    'https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/menu-images/products/07a1da74-2866-43d0-81b6-cae1e50d5a69.png');
const _Product _combo = _Product(
    '79fddcf4-356a-48ee-b678-c8acd105aa04',
    _mcd,
    '10 Piece Chicken McNuggets Combo (Medium)',
    9.79,
    'https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/menu-images/products/79fddcf4-356a-48ee-b678-c8acd105aa04.png');

const List<List<Object>> _drops = <List<Object>>[
  <Object>['42 Florida Park Dr N, Palm Coast, FL 32137', 29.5725, -81.2071],
  <Object>['18 Pine Grove Dr, Palm Coast, FL 32164', 29.5085, -81.2398],
  <Object>['7 Cypress Point Pkwy, Palm Coast, FL 32164', 29.4868, -81.2575],
  <Object>['311 S 7th St, Flagler Beach, FL 32136', 29.4712, -81.1305],
  <Object>['105 Seminole Woods Blvd, Palm Coast, FL 32164', 29.4702, -81.2121],
  <Object>['66 Belle Terre Pkwy, Palm Coast, FL 32164', 29.5203, -81.2286],
  <Object>['12 Ocean Palm Villa, Ormond Beach, FL 32176', 29.3205, -81.0612],
];

const Map<String, String> _phones = <String, String>{
  'Loki': '(386) 555-0142',
  'Sif': '(386) 555-0133',
  'Tyr': '(386) 555-0161',
  'Hel': '(386) 555-0188',
  'Test Woman': '(386) 555-0190',
};

class PreviewSeed {
  PreviewSeed._(this.scene, this.user);

  final String scene;
  final PreviewUser user;
  final PreviewDb db = PreviewDb();
  final DateTime _now = DateTime.now().toUtc();
  int _n = 0;

  static PreviewUser userFor(String scene) {
    switch (scene) {
      case 'customer':
        return kFreya;
      case 'signup':
        return kBaldr;
      case 'admin':
        return kAdmin;
    }
    return kLoki;
  }

  static PreviewSeed forScene(String scene) {
    final PreviewSeed s = PreviewSeed._(scene, userFor(scene));
    s._build();
    return s;
  }

  // ------------------------------------------------------------ helpers
  String _id(String tag) {
    _n++;
    final String kind = tag.codeUnits
        .fold<int>(0, (int a, int c) => (a * 31 + c) & 0xffff)
        .toRadixString(16)
        .padLeft(4, '0');
    final String tail = _n.toRadixString(16).padLeft(6, '0');
    return '5e1e$kind-0000-4000-8000-000000$tail';
  }

  String _ago(Duration d) => _now.subtract(d).toIso8601String();

  String _ahead(Duration d) => _now.add(d).toIso8601String();

  String _day(int days) {
    final DateTime d = DateTime.now().add(Duration(days: days));
    String two(int v) => v.toString().padLeft(2, '0');
    return '${d.year}-${two(d.month)}-${two(d.day)}';
  }

  static double _r2(double v) => (v * 100).roundToDouble() / 100;

  Map<String, dynamic> session() {
    String part(Map<String, dynamic> m) =>
        base64Url.encode(utf8.encode(jsonEncode(m))).replaceAll('=', '');
    final String head =
        part(<String, dynamic>{'alg': 'HS256', 'typ': 'JWT'});
    final String claims = part(<String, dynamic>{
      'sub': user.id,
      'email': user.email,
      'role': 'authenticated',
      'aud': 'authenticated',
      'iat': 1763856000,
      'exp': 4102444800,
    });
    final String token = '$head.$claims.c3R1ZGlvLXByZXZpZXc';
    return <String, dynamic>{
      'access_token': token,
      'token_type': 'bearer',
      'expires_in': 31536000,
      'expires_at': 4102444800,
      'refresh_token': 'studio-preview',
      'user': <String, dynamic>{
        'id': user.id,
        'aud': 'authenticated',
        'role': 'authenticated',
        'email': user.email,
        'app_metadata': <String, dynamic>{'provider': 'email'},
        'user_metadata': <String, dynamic>{'full_name': user.name},
        'created_at': '2026-10-01T12:00:00.000Z',
        'updated_at': '2026-11-01T12:00:00.000Z',
      },
    };
  }

  // ------------------------------------------------------------ build
  void _build() {
    _people();
    _storesAndProducts();
    _history();
    _openOrders();
    if (scene == 'run' || scene == 'customer') _activeOrder();
    _freight();
  }

  void _people() {
    final List<Map<String, dynamic>> profiles = db.t('profiles');
    for (final PreviewUser u in <PreviewUser>[
      kLoki,
      kFreya,
      kSif,
      kBaldr,
      kHel,
      kTyr,
      kTestWoman,
      kAdmin
    ]) {
      profiles.add(<String, dynamic>{
        'id': u.id,
        'full_name': u.name,
        'role': u == kAdmin
            ? 'admin'
            : (u == kLoki || u == kHel ? 'valkyrie' : 'customer'),
      });
    }

    final bool online = scene == 'offers' || scene == 'run';
    db.t('drivers').addAll(<Map<String, dynamic>>[
      <String, dynamic>{
        'id': kLoki.id,
        'full_name': kLoki.name,
        'phone': '(386) 555-0142',
        'active': true,
        'online': online,
        'created_at': _ago(const Duration(days: 38)),
        'dest_lat': null,
        'dest_lng': null,
        'dest_label': null,
        'dest_expires_at': null,
        'dest_uses_date': null,
        'dest_uses': 0,
        'last_lat': 29.5468,
        'last_lng': -81.2240,
        'last_seen_at': _ago(const Duration(minutes: 2)),
        'rating_avg': 4.92,
        'rating_count': 37,
      },
      <String, dynamic>{
        'id': kHel.id,
        'full_name': kHel.name,
        'phone': '(386) 555-0188',
        'active': true,
        'online': false,
        'created_at': _ago(const Duration(days: 58)),
        'dest_uses': 0,
        'rating_avg': 4.81,
        'rating_count': 64,
      },
    ]);

    db.t('customers').addAll(<Map<String, dynamic>>[
      <String, dynamic>{
        'id': kFreya.id,
        'full_name': kFreya.name,
        'phone': '(386) 555-0117',
        'email': kFreya.email,
        'created_at': _ago(const Duration(days: 45)),
      },
      <String, dynamic>{
        'id': kSif.id,
        'full_name': kSif.name,
        'phone': '(386) 555-0133',
        'email': kSif.email,
        'created_at': _ago(const Duration(days: 30)),
      },
      <String, dynamic>{
        'id': kTestWoman.id,
        'full_name': kTestWoman.name,
        'phone': '(386) 555-0190',
        'email': kTestWoman.email,
        'created_at': _ago(const Duration(days: 20)),
      },
    ]);

    db.t('customer_addresses').addAll(<Map<String, dynamic>>[
      <String, dynamic>{
        'id': _id('addr'),
        'customer_id': kFreya.id,
        'label': 'Home',
        'address': _drops[0][0],
        'lat': _drops[0][1],
        'lng': _drops[0][2],
        'note': 'Blue door, ring twice',
        'is_default': true,
        'created_at': _ago(const Duration(days: 44)),
      },
      <String, dynamic>{
        'id': _id('addr'),
        'customer_id': kFreya.id,
        'label': 'Work',
        'address': _drops[5][0],
        'lat': _drops[5][1],
        'lng': _drops[5][2],
        'note': null,
        'is_default': false,
        'created_at': _ago(const Duration(days: 20)),
      },
    ]);

    Map<String, dynamic> app(
      PreviewUser u, {
      required String status,
      required String type,
      required String make,
      required String model,
      required int year,
      required String color,
      required String plate,
      required List<String> services,
      required int createdDaysAgo,
      required String city,
      int insuranceDays = 140,
      String? note,
    }) {
      return <String, dynamic>{
        'id': u.id,
        'full_name': u.name,
        'phone': _phones[u.name] ?? '(386) 555-0100',
        'email': u.email,
        'vehicle_type': type,
        'vehicle_make': make,
        'vehicle_model': model,
        'vehicle_year': year,
        'vehicle_color': color,
        'plate': plate,
        'service_types': services,
        'license_photo_url': '${u.id}/license.jpg',
        'insurance_photo_url': '${u.id}/insurance.jpg',
        'vehicle_photo_url': '${u.id}/vehicle.jpg',
        'background_consent': true,
        'background_consent_at': _ago(Duration(days: createdDaysAgo)),
        'terms_accepted_at': _ago(Duration(days: createdDaysAgo)),
        'contractor_ack_at': _ago(Duration(days: createdDaysAgo)),
        'insurance_attest_at': _ago(Duration(days: createdDaysAgo)),
        'status': status,
        'reviewer_note': note,
        'reviewed_at': status == 'pending'
            ? null
            : _ago(Duration(days: createdDaysAgo > 1 ? createdDaysAgo - 1 : 0)),
        'created_at': _ago(Duration(days: createdDaysAgo, hours: 3)),
        'updated_at': _ago(Duration(days: createdDaysAgo)),
        'insurance_company': 'Progressive',
        'insurance_expires_on': _day(insuranceDays),
        'license_expires_on': _day(900),
        'date_of_birth': '1994-03-14',
        'city': city,
      };
    }

    db.t('valkyrie_applications').addAll(<Map<String, dynamic>>[
      app(kSif,
          status: 'pending',
          type: 'Car',
          make: 'Honda',
          model: 'Civic',
          year: 2019,
          color: 'Blue',
          plate: 'SIF-208',
          services: <String>['food', 'grocery_retail'],
          createdDaysAgo: 1,
          city: 'Flagler Beach'),
      app(kTyr,
          status: 'pending',
          type: 'Van',
          make: 'Ford',
          model: 'Transit',
          year: 2020,
          color: 'White',
          plate: 'TYR-611',
          services: <String>['freight', 'p2p'],
          createdDaysAgo: 0,
          city: 'Ormond Beach'),
      app(kLoki,
          status: 'approved',
          type: 'Pickup truck',
          make: 'Toyota',
          model: 'Tacoma',
          year: 2021,
          color: 'Gray',
          plate: 'LKI-442',
          services: <String>['food', 'grocery_retail', 'freight'],
          createdDaysAgo: 40,
          city: 'Palm Coast'),
      app(kHel,
          status: 'approved',
          type: 'SUV',
          make: 'Jeep',
          model: 'Grand Cherokee',
          year: 2018,
          color: 'Black',
          plate: 'HEL-913',
          services: <String>['food', 'virtual_shop'],
          createdDaysAgo: 60,
          city: 'Palm Coast'),
      app(kTestWoman,
          status: 'suspended',
          type: 'Car',
          make: 'Nissan',
          model: 'Altima',
          year: 2016,
          color: 'Silver',
          plate: 'TST-100',
          services: <String>['food'],
          createdDaysAgo: 25,
          city: 'Bunnell',
          insuranceDays: -12,
          note: 'Insurance expired. Send a new insurance card to reinstate.'),
    ]);

    db.t('support_tickets').add(<String, dynamic>{
      'id': _id('tick'),
      'customer_id': kFreya.id,
      'order_id': null,
      'kind': 'order',
      'message': 'One of my drinks was missing.',
      'status': 'answered',
      'reply': 'Sorry about that! A \$3 credit is on your account.',
      'created_at': _ago(const Duration(days: 3)),
    });
    db.t('valkyrie_tickets').add(<String, dynamic>{
      'id': _id('vtck'),
      'valkyrie_id': kLoki.id,
      'order_id': null,
      'kind': 'pay',
      'message': 'Tip from Tuesday is not showing yet.',
      'status': 'open',
      'reply': null,
      'created_at': _ago(const Duration(days: 1, hours: 4)),
    });
  }

  void _storesAndProducts() {
    for (final _Store s in <_Store>[_target, _mcd, _aldi, _grille, _auto]) {
      db.t('stores').add(<String, dynamic>{
        'id': s.id,
        'name': s.name,
        'address': s.address,
        'latitude': s.lat,
        'longitude': s.lng,
        'is_live': true,
      });
    }
    for (final _Product p in <_Product>[
      _milk,
      _coffee,
      _cottage,
      _cereal,
      _nuggets,
      _combo
    ]) {
      db.t('products').add(<String, dynamic>{
        'id': p.id,
        'name': p.name,
        'price': p.price,
        'image_url': p.image,
        'store_id': p.store.id,
      });
    }
  }

  Map<String, dynamic> _stop(String orderId, _Store s, int index, String status,
      {String? doneAt}) {
    final Map<String, dynamic> stop = <String, dynamic>{
      'id': _id('stop'),
      'order_id': orderId,
      'store_id': s.id,
      'store_name': s.name,
      'stop_index': index,
      'is_food': s.food,
      'lat': s.lat,
      'lng': s.lng,
      'status': status,
      'arrived_at': doneAt,
      'done_at': doneAt,
      'created_at': _ago(const Duration(hours: 1)),
      'receipt_photo_url': null,
      'receipt_total': null,
    };
    db.t('order_stops').add(stop);
    return stop;
  }

  void _item(String orderId, Map<String, dynamic> stop, String name, int qty,
      double price,
      {_Product? product, String status = 'pending', String? heavy}) {
    db.t('order_items').add(<String, dynamic>{
      'id': _id('item'),
      'order_id': orderId,
      'item_name': name,
      'qty': qty,
      'unit_price': price,
      'created_at': _ago(Duration(minutes: 60 - db.t('order_items').length % 50)),
      'product_id': product?.id,
      'store_id': stop['store_id'],
      'stop_id': stop['id'],
      'image_url': product?.image,
      'status': status,
      'sub_preference': null,
      'found_qty': status == 'found' ? qty : null,
      'sub_name': null,
      'sub_price': null,
      'sub_image_url': null,
      'updated_at': null,
      'delivery_class': heavy,
    });
  }

  void _itemsFor(String orderId, Map<String, dynamic> stop, _Store s,
      String status) {
    if (s == _target) {
      _item(orderId, stop, _milk.name, 1, _milk.price,
          product: _milk, status: status);
      _item(orderId, stop, _coffee.name, 1, _coffee.price,
          product: _coffee, status: status);
      _item(orderId, stop, _cereal.name, 1, _cereal.price,
          product: _cereal, status: status);
    } else if (s == _mcd) {
      _item(orderId, stop, _combo.name, 2, _combo.price,
          product: _combo, status: status);
    } else if (s == _aldi) {
      _item(orderId, stop, 'Bananas, 2 lb', 1, 1.29, status: status);
      _item(orderId, stop, 'Large eggs, 12 ct', 2, 2.89, status: status);
      _item(orderId, stop, 'Whole wheat bread', 1, 1.85, status: status);
    } else if (s == _grille) {
      _item(orderId, stop, 'Grouper sandwich', 1, 18.0, status: status);
      _item(orderId, stop, 'Hush puppies', 1, 7.0, status: status);
    } else {
      _item(orderId, stop, 'Motor oil 5W-30, 5 qt', 1, 27.99, status: status);
    }
  }

  void _history() {
    const List<_Store> stores = <_Store>[
      _target,
      _mcd,
      _aldi,
      _grille,
      _target,
      _mcd
    ];
    const List<double> fees = <double>[6.99, 5.49, 7.49, 8.99];
    const List<double> tips = <double>[4.0, 3.0, 5.0, 0.0, 6.0, 2.5];
    const List<double> subs = <double>[38.12, 14.58, 52.40, 41.75, 23.10, 19.97];
    const List<String?> comments = <String?>[
      'Fast and friendly',
      null,
      'Everything was right, thanks!',
      null,
      null
    ];
    final List<PreviewUser> buyers = <PreviewUser>[kFreya, kSif, kTestWoman];
    for (int i = 0; i < 16; i++) {
      final String id = _id('hist');
      final _Store s = stores[i % stores.length];
      final PreviewUser buyer = buyers[i % 3];
      final List<Object> drop = buyer == kFreya ? _drops[0] : _drops[1 + i % 6];
      final Duration deliveredAgo = Duration(minutes: 90 + i * 16 * 60);
      final double fee = fees[i % fees.length];
      final double tip = tips[i % tips.length];
      final double sub = subs[i % subs.length];
      final double extra = i % 8 == 0 ? 2.0 : 0.0;
      final int? rating = i % 4 == 3 ? null : <int>[5, 5, 4, 5][i % 4];
      final String delivered = _ago(deliveredAgo);
      db.t('orders').add(<String, dynamic>{
        'id': id,
        'order_type': s.food ? 'food' : 'grocery',
        'status': 'delivered',
        'customer_id': buyer.id,
        'driver_id': kLoki.id,
        'store_name': s.name,
        'pickup_address': s.address,
        'dropoff_address': drop[0],
        'dropoff_lat': drop[1],
        'dropoff_lng': drop[2],
        'delivery_miles': _r2(2.4 + (i % 7) * 0.8),
        'delivery_fee': fee,
        'tip_amount': _r2(tip + extra),
        'extra_tip': extra,
        'subtotal': sub,
        'estimated_total': _r2(sub + fee + tip),
        'final_total': _r2(sub + fee + tip + extra),
        'total_amount': _r2(sub + fee + tip + extra),
        'valkyrie_pay': _r2(fee * 0.8 + tip + extra),
        'sub_preference': 'best_match',
        'dropoff_mode': 'leave_at_door',
        'is_test': false,
        'rating': rating,
        'rating_comment': rating == null ? null : comments[i % comments.length],
        'rated_at': rating == null
            ? null
            : _ago(deliveredAgo - const Duration(minutes: 20)),
        'created_at': _ago(deliveredAgo + const Duration(minutes: 50)),
        'accepted_at': _ago(deliveredAgo + const Duration(minutes: 45)),
        'delivered_at': delivered,
      });
      final Map<String, dynamic> stop = _stop(id, s, 0, 'done', doneAt: delivered);
      _itemsFor(id, stop, s, 'found');
    }
  }

  Map<String, dynamic> _order(String id, PreviewUser buyer, _Store first,
      List<Object> drop, double fee, double tip, double sub,
      {required String status, String? driver, required Duration createdAgo}) {
    final Map<String, dynamic> o = <String, dynamic>{
      'id': id,
      'order_type': first.food ? 'food' : 'grocery',
      'status': status,
      'customer_id': buyer.id,
      'driver_id': driver,
      'store_name': first.name,
      'pickup_address': first.address,
      'dropoff_address': drop[0],
      'dropoff_lat': drop[1],
      'dropoff_lng': drop[2],
      'delivery_miles': 3.6,
      'delivery_fee': fee,
      'tip_amount': tip,
      'extra_tip': 0,
      'subtotal': sub,
      'estimated_total': _r2(sub + fee + tip),
      'final_total': null,
      'total_amount': _r2(sub + fee + tip),
      'valkyrie_pay': driver == null ? null : _r2(fee * 0.8 + tip),
      'sub_preference': 'best_match',
      'dropoff_mode': 'leave_at_door',
      'is_test': false,
      'rating': null,
      'rating_comment': null,
      'rated_at': null,
      'created_at': _ago(createdAgo),
      'accepted_at': driver == null ? null : _ago(createdAgo - const Duration(minutes: 4)),
      'shopping_started_at': null,
      'delivered_at': null,
    };
    db.t('orders').add(o);
    return o;
  }

  void _openOrders() {
    final String a = _id('open');
    _order(a, kSif, _aldi, _drops[2], 6.99, 4.0, 14.06,
        status: 'pending', createdAgo: const Duration(minutes: 3));
    _itemsFor(a, _stop(a, _aldi, 0, 'pending'), _aldi, 'pending');

    final String b = _id('open');
    _order(b, kTestWoman, _mcd, _drops[4], 5.49, 3.0, 19.58,
        status: 'pending', createdAgo: const Duration(minutes: 2));
    _itemsFor(b, _stop(b, _mcd, 0, 'pending'), _mcd, 'pending');

    final String c = _id('open');
    _order(c, kSif, _target, _drops[3], 9.99, 6.0, 33.85,
        status: 'pending', createdAgo: const Duration(minutes: 1));
    final Map<String, dynamic> c1 = _stop(c, _target, 0, 'pending');
    _itemsFor(c, c1, _target, 'pending');
    _item(c, c1, 'Spring water, 24 pack', 2, 4.99, heavy: 'heavy');
    _itemsFor(c, _stop(c, _mcd, 1, 'pending'), _mcd, 'pending');
  }

  void _activeOrder() {
    final String id = _id('actv');
    _order(id, kFreya, _target, _drops[0], 7.99, 5.0, 33.94,
        status: 'accepted',
        driver: kLoki.id,
        createdAgo: const Duration(minutes: 9));
    final Map<String, dynamic> s0 = _stop(id, _target, 0, 'pending');
    _item(id, s0, _milk.name, 1, _milk.price, product: _milk);
    _item(id, s0, _coffee.name, 1, _coffee.price, product: _coffee);
    _item(id, s0, _cottage.name, 2, _cottage.price, product: _cottage);
    _item(id, s0, _cereal.name, 1, _cereal.price, product: _cereal);
    final Map<String, dynamic> s1 = _stop(id, _mcd, 1, 'pending');
    _item(id, s1, _nuggets.name, 1, _nuggets.price, product: _nuggets);
    _item(id, s1, _combo.name, 1, _combo.price, product: _combo);
    db.t('order_messages').addAll(<Map<String, dynamic>>[
      <String, dynamic>{
        'id': _id('msg'),
        'order_id': id,
        'sender': 'system',
        'sender_id': null,
        'body': 'A Valkyrie accepted your order.',
        'image_url': null,
        'item_id': null,
        'created_at': _ago(const Duration(minutes: 5)),
        'read_at': _ago(const Duration(minutes: 4)),
      },
      <String, dynamic>{
        'id': _id('msg'),
        'order_id': id,
        'sender': 'customer',
        'sender_id': kFreya.id,
        'body': 'Hi! If the 1% milk is out, 2% is fine.',
        'image_url': null,
        'item_id': null,
        'created_at': _ago(const Duration(minutes: 3)),
        'read_at': null,
      },
    ]);
  }

  void _freight() {
    db.t('freight_classes').addAll(<Map<String, dynamic>>[
      <String, dynamic>{'code': 'pickup', 'label': 'Pickup', 'rank': 1, 'base': 35, 'per_mile': 1.5, 'max_payload_lbs': 1500},
      <String, dynamic>{'code': 'cargo_van', 'label': 'Cargo van', 'rank': 2, 'base': 45, 'per_mile': 1.75, 'max_payload_lbs': 3500},
      <String, dynamic>{'code': 'pickup_trailer', 'label': 'Pickup + trailer', 'rank': 3, 'base': 55, 'per_mile': 2.0, 'max_payload_lbs': 7000},
      <String, dynamic>{'code': 'box_truck', 'label': 'Box truck', 'rank': 4, 'base': 85, 'per_mile': 2.5, 'max_payload_lbs': 10000},
    ]);
    db.t('valkyrie_rigs').add(<String, dynamic>{
      'id': _id('rig'),
      'driver_id': kLoki.id,
      'class_code': 'pickup',
      'make_model': '2021 Toyota Tacoma',
      'payload_lbs': 1400,
      'cargo_length_ft': 6,
      'has_liftgate': false,
      'home_city': 'Palm Coast',
      'photo_url': null,
      'bio': null,
      'is_available': true,
      'rating': 4.9,
      'jobs_done': 12,
      'created_at': _ago(const Duration(days: 30)),
      'updated_at': _ago(const Duration(days: 2)),
    });

    Map<String, dynamic> load(
      String title,
      String details, {
      required String fromCity,
      required String toCity,
      required double miles,
      required int lbs,
      int pieces = 1,
      int pallets = 0,
      int stairs = 0,
      String cls = 'pickup',
      required double price,
      bool bids = false,
      String status = 'open',
      String? driver,
      String? direct,
      Duration? directFor,
      required Duration createdAgo,
      Duration? assignedAgo,
      Duration? deliveredAgo,
    }) {
      final Map<String, dynamic> l = <String, dynamic>{
        'id': _id('load'),
        'poster_id': kHel.id,
        'poster_type': 'customer',
        'store_id': null,
        'title': title,
        'details': details,
        'photo_url': null,
        'pickup_address': '$fromCity, FL',
        'pickup_city': fromCity,
        'pickup_lat': 29.55,
        'pickup_lng': -81.22,
        'drop_address': '$toCity, FL',
        'drop_city': toCity,
        'drop_lat': 29.48,
        'drop_lng': -81.13,
        'miles': miles,
        'weight_lbs': lbs,
        'pieces': pieces,
        'pallets': pallets,
        'needs_liftgate': false,
        'stairs_flights': stairs,
        'required_class': cls,
        'window_start': _ahead(const Duration(hours: 1)),
        'window_end': _ahead(const Duration(hours: 5)),
        'price': price,
        'allow_bids': bids,
        'direct_driver_id': direct,
        'direct_until': directFor == null ? null : _ahead(directFor),
        'status': status,
        'driver_id': driver,
        'final_price': driver == null ? null : price,
        'assigned_at': assignedAgo == null ? null : _ago(assignedAgo),
        'picked_up_at': null,
        'delivered_at': deliveredAgo == null ? null : _ago(deliveredAgo),
        'created_at': _ago(createdAgo),
        'updated_at': _ago(createdAgo),
      };
      db.t('freight_loads').add(l);
      return l;
    }

    load('Washer + dryer', 'Both on the ground floor. Dolly on site.',
        fromCity: 'Ormond Beach',
        toCity: 'Palm Coast',
        miles: 24.6,
        lbs: 380,
        pieces: 2,
        price: 85,
        direct: kLoki.id,
        directFor: const Duration(minutes: 22),
        createdAgo: const Duration(minutes: 6));
    load('Sectional sofa (2 pieces)', 'Second floor drop. Blankets provided.',
        fromCity: 'Palm Coast',
        toCity: 'Flagler Beach',
        miles: 11.4,
        lbs: 260,
        pieces: 2,
        stairs: 1,
        price: 95,
        createdAgo: const Duration(minutes: 14));
    load('Pallet of pavers', 'Forklift loads you at the yard.',
        fromCity: 'Palm Coast',
        toCity: 'Bunnell',
        miles: 9.8,
        lbs: 1100,
        pallets: 1,
        price: 120,
        bids: true,
        createdAgo: const Duration(minutes: 31));
    load('Lumber bundle, 2x4x8 (40 pcs)', 'Strap it down. Back gate drop.',
        fromCity: 'Palm Coast',
        toCity: 'Palm Coast',
        miles: 6.2,
        lbs: 640,
        pieces: 40,
        price: 70,
        bids: true,
        createdAgo: const Duration(minutes: 48));
    load('Shop shelving, 3 pallets', 'Needs a box truck with a liftgate.',
        fromCity: 'Daytona Beach',
        toCity: 'Palm Coast',
        miles: 33.0,
        lbs: 5200,
        pallets: 3,
        cls: 'box_truck',
        price: 260,
        createdAgo: const Duration(hours: 2));
    load('Riding mower', 'Ramp on site.',
        fromCity: 'Palm Coast',
        toCity: 'Flagler Beach',
        miles: 12.1,
        lbs: 520,
        price: 110,
        status: 'assigned',
        driver: kLoki.id,
        createdAgo: const Duration(hours: 3),
        assignedAgo: const Duration(minutes: 30));
    load('Dining table + 6 chairs', 'Delivered.',
        fromCity: 'Palm Coast',
        toCity: 'Palm Coast',
        miles: 5.4,
        lbs: 210,
        pieces: 7,
        price: 75,
        status: 'delivered',
        driver: kLoki.id,
        createdAgo: const Duration(days: 2, hours: 3),
        assignedAgo: const Duration(days: 2, hours: 2),
        deliveredAgo: const Duration(days: 2));
  }
}
