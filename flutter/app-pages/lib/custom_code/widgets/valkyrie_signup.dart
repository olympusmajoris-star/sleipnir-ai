// Studio preview copy of the FlutterFlow custom widget ValkyrieSignup.
// The widget code below is the app's code. Only two imports differ:
// geolocator -> fixed test location, supabase_flutter -> supabase.
import 'package:sleipnir_app_pages/backend/supabase/supabase.dart';
import 'package:sleipnir_app_pages/flutter_flow/flutter_flow_util.dart';
import 'package:flutter/material.dart';
import 'package:flutter/material.dart';

import 'dart:typed_data';
import 'package:image_picker/image_picker.dart' as ip;
import 'package:supabase/supabase.dart' as sb;

class ValkyrieSignup extends StatefulWidget {
  const ValkyrieSignup({
    super.key,
    this.width,
    this.height,
  });

  final double? width;
  final double? height;

  @override
  State<ValkyrieSignup> createState() => _ValkyrieSignupState();
}

String _vsTwo(int n) => n < 10 ? '0$n' : '$n';

String _vsFmt(DateTime d) => '${_vsTwo(d.month)}/${_vsTwo(d.day)}/${d.year}';

String _vsIso(DateTime d) => '${d.year}-${_vsTwo(d.month)}-${_vsTwo(d.day)}';

class _ValkyrieSignupState extends State<ValkyrieSignup> {
  static const Color _bg = Color(0xFF11151C);
  static const Color _panel = Color(0xFF202630);
  static const Color _yellow = Color(0xFFFFC72C);
  static const Color _muted = Color(0xFFB8C0CB);
  static const Color _green = Color(0xFF2FBF71);
  static const Color _red = Color(0xFFFF7A7A);

  final TextEditingController _name = TextEditingController();
  final TextEditingController _phone = TextEditingController();
  final TextEditingController _city = TextEditingController(text: 'Palm Coast');
  final TextEditingController _make = TextEditingController();
  final TextEditingController _model = TextEditingController();
  final TextEditingController _year = TextEditingController();
  final TextEditingController _color = TextEditingController();
  final TextEditingController _plate = TextEditingController();
  final TextEditingController _insCompany = TextEditingController();

  bool _loading = true;
  bool _busy = false;
  String? _error;
  Map<String, dynamic>? _existing;

  DateTime? _dob;
  DateTime? _insExp;
  DateTime? _licExp;
  String _vehicleType = '';
  final Set<String> _services = <String>{};
  final Map<String, Uint8List> _bytes = <String, Uint8List>{};
  final Map<String, String> _ext = <String, String>{};
  final Map<String, String> _existingPath = <String, String>{};
  bool _okContractor = false;
  bool _okInsurance = false;
  bool _okBackground = false;
  bool _okTerms = false;
  bool _justSubmitted = false;

  static const List<String> _vehicleTypes = <String>[
    'Car',
    'SUV',
    'Pickup truck',
    'Van',
    'Box truck',
  ];

  static const List<List<String>> _serviceOptions = <List<String>>[
    <String>['food', 'Food delivery'],
    <String>['grocery_retail', 'Grocery and retail'],
    <String>['virtual_shop', 'Virtual shopping'],
    <String>['freight', 'Freight and hauling'],
    <String>['p2p', 'Marketplace and P2P hauls'],
  ];

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _city.dispose();
    _make.dispose();
    _model.dispose();
    _year.dispose();
    _color.dispose();
    _plate.dispose();
    _insCompany.dispose();
    super.dispose();
  }

  // ---------------------------------------------------------------- load
  Future<void> _load() async {
    final user = SupaFlow.client.auth.currentUser;
    if (user == null) {
      if (mounted) setState(() => _loading = false);
      return;
    }
    try {
      final dynamic row = await SupaFlow.client
          .from('valkyrie_applications')
          .select()
          .eq('id', user.id)
          .maybeSingle();
      if (row != null) {
        final m = Map<String, dynamic>.from(row as Map);
        _existing = m;
        _name.text = (m['full_name'] ?? '').toString();
        _phone.text = (m['phone'] ?? '').toString();
        _city.text = (m['city'] ?? 'Palm Coast').toString();
        _make.text = (m['vehicle_make'] ?? '').toString();
        _model.text = (m['vehicle_model'] ?? '').toString();
        _year.text = (m['vehicle_year'] ?? '').toString();
        _color.text = (m['vehicle_color'] ?? '').toString();
        _plate.text = (m['plate'] ?? '').toString();
        _insCompany.text = (m['insurance_company'] ?? '').toString();
        _vehicleType = (m['vehicle_type'] ?? '').toString();
        _dob = DateTime.tryParse((m['date_of_birth'] ?? '').toString());
        _insExp =
            DateTime.tryParse((m['insurance_expires_on'] ?? '').toString());
        _licExp = DateTime.tryParse((m['license_expires_on'] ?? '').toString());
        final sv = m['service_types'];
        if (sv is List) {
          for (final e in sv) {
            _services.add(e.toString());
          }
        }
        _existingPath['license'] = (m['license_photo_url'] ?? '').toString();
        _existingPath['insurance'] =
            (m['insurance_photo_url'] ?? '').toString();
        _existingPath['vehicle'] = (m['vehicle_photo_url'] ?? '').toString();
      } else {
        final meta = user.userMetadata ?? <String, dynamic>{};
        _name.text = (meta['full_name'] ?? meta['name'] ?? '').toString();
        _phone.text = (user.phone ?? '').toString();
      }
    } catch (e) {
      _error = 'Could not load your application. $e';
    }
    if (mounted) setState(() => _loading = false);
  }

  // ---------------------------------------------------------------- actions
  Future<void> _pickPhoto(String key) async {
    final src = await showModalBottomSheet<ip.ImageSource>(
      context: context,
      backgroundColor: _panel,
      builder: (c) => SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          ListTile(
            leading: const Icon(Icons.photo_camera, color: _yellow),
            title: const Text('Take a photo',
                style: TextStyle(color: Colors.white)),
            onTap: () => Navigator.pop(c, ip.ImageSource.camera),
          ),
          ListTile(
            leading: const Icon(Icons.photo_library, color: _yellow),
            title: const Text('Choose from your photos',
                style: TextStyle(color: Colors.white)),
            onTap: () => Navigator.pop(c, ip.ImageSource.gallery),
          ),
        ]),
      ),
    );
    if (src == null) return;
    try {
      final x = await ip.ImagePicker()
          .pickImage(source: src, maxWidth: 1800, imageQuality: 82);
      if (x == null) return;
      final bytes = await x.readAsBytes();
      final name = x.name.toLowerCase();
      if (!mounted) return;
      setState(() {
        _bytes[key] = bytes;
        _ext[key] = name.endsWith('.png') ? 'png' : 'jpg';
        _error = null;
      });
    } catch (e) {
      if (mounted) setState(() => _error = 'Could not get that photo. $e');
    }
  }

  Future<void> _pickDate(String which) async {
    final now = DateTime.now();
    DateTime first;
    DateTime last;
    DateTime initial;
    if (which == 'dob') {
      first = DateTime(1940, 1, 1);
      last = DateTime(now.year - 18, now.month, now.day);
      initial = _dob ?? DateTime(now.year - 30, 1, 1);
    } else {
      first = now;
      last = DateTime(now.year + 10, now.month, now.day);
      initial = (which == 'ins' ? _insExp : _licExp) ??
          now.add(const Duration(days: 180));
    }
    if (initial.isBefore(first)) initial = first;
    if (initial.isAfter(last)) initial = last;
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: first,
      lastDate: last,
    );
    if (picked == null || !mounted) return;
    setState(() {
      if (which == 'dob') {
        _dob = picked;
      } else if (which == 'ins') {
        _insExp = picked;
      } else {
        _licExp = picked;
      }
    });
  }

  bool _hasPhoto(String key) =>
      _bytes[key] != null || (_existingPath[key] ?? '').isNotEmpty;

  String? _validate() {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    if (_name.text.trim().length < 3) return 'Enter your full legal name.';
    if (_phone.text.replaceAll(RegExp(r'[^0-9]'), '').length < 10) {
      return 'Enter a phone number with 10 digits.';
    }
    if (_dob == null) return 'Pick your date of birth.';
    final eighteen = DateTime(_dob!.year + 18, _dob!.month, _dob!.day);
    if (eighteen.isAfter(today)) return 'You must be 18 or older.';
    if (_city.text.trim().isEmpty) return 'Enter your city.';
    if (_vehicleType.isEmpty) return 'Choose your vehicle type.';
    if (_make.text.trim().isEmpty) return 'Enter your vehicle make.';
    if (_model.text.trim().isEmpty) return 'Enter your vehicle model.';
    final y = int.tryParse(_year.text.trim());
    if (y == null || y < 1995 || y > now.year + 1)
      return 'Enter a valid vehicle year (1995 or newer).';
    if (_color.text.trim().isEmpty) return 'Enter your vehicle color.';
    if (_plate.text.trim().isEmpty) return 'Enter your license plate.';
    if (_services.isEmpty) return 'Choose at least one thing you want to do.';
    if (_insCompany.text.trim().isEmpty) return 'Enter your insurance company.';
    if (_insExp == null || !_insExp!.isAfter(today)) {
      return 'Your insurance must have an expiration date in the future.';
    }
    if (_licExp == null || !_licExp!.isAfter(today)) {
      return 'Your license must have an expiration date in the future.';
    }
    if (!_hasPhoto('license')) return 'Add a photo of your driver license.';
    if (!_hasPhoto('insurance')) return 'Add a photo of your insurance card.';
    if (!_hasPhoto('vehicle')) return 'Add a photo of your vehicle.';
    if (!_okContractor || !_okInsurance || !_okBackground || !_okTerms) {
      return 'Check all four agreements at the bottom.';
    }
    return null;
  }

  Future<void> _submit() async {
    if (_busy) return;
    final err = _validate();
    if (err != null) {
      setState(() => _error = err);
      return;
    }
    final user = SupaFlow.client.auth.currentUser;
    if (user == null) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final paths = <String, String>{};
      for (final k in <String>['license', 'insurance', 'vehicle']) {
        final bytes = _bytes[k];
        if (bytes != null) {
          final ext = _ext[k] ?? 'jpg';
          final path = '${user.id}/$k.$ext';
          await SupaFlow.client.storage.from('valkyrie-docs').uploadBinary(
                path,
                bytes,
                fileOptions: sb.FileOptions(
                  contentType: ext == 'png' ? 'image/png' : 'image/jpeg',
                  upsert: true,
                ),
              );
          paths[k] = path;
        } else {
          paths[k] = _existingPath[k] ?? '';
        }
      }
      final stamp = DateTime.now().toUtc().toIso8601String();
      await SupaFlow.client.from('valkyrie_applications').upsert(
        <String, dynamic>{
          'id': user.id,
          'full_name': _name.text.trim(),
          'phone': _phone.text.trim(),
          'email': user.email,
          'date_of_birth': _vsIso(_dob!),
          'city': _city.text.trim(),
          'vehicle_type': _vehicleType,
          'vehicle_make': _make.text.trim(),
          'vehicle_model': _model.text.trim(),
          'vehicle_year': int.parse(_year.text.trim()),
          'vehicle_color': _color.text.trim(),
          'plate': _plate.text.trim().toUpperCase(),
          'service_types': _services.toList(),
          'license_photo_url': paths['license'],
          'insurance_photo_url': paths['insurance'],
          'vehicle_photo_url': paths['vehicle'],
          'insurance_company': _insCompany.text.trim(),
          'insurance_expires_on': _vsIso(_insExp!),
          'license_expires_on': _vsIso(_licExp!),
          'background_consent': true,
          'background_consent_at': stamp,
          'contractor_ack_at': stamp,
          'insurance_attest_at': stamp,
          'terms_accepted_at': stamp,
          'status': 'pending',
          'reviewer_note': null,
        },
        onConflict: 'id',
      );
      if (!mounted) return;
      setState(() {
        _busy = false;
        _justSubmitted = true;
        _existing = <String, dynamic>{'status': 'pending'};
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = 'Could not send your application. $e';
      });
    }
  }

  // ---------------------------------------------------------------- UI helpers
  BoxDecoration _box() =>
      BoxDecoration(color: _panel, borderRadius: BorderRadius.circular(12));

  Widget _h(String t) => Padding(
        padding: const EdgeInsets.fromLTRB(2, 22, 2, 8),
        child: Text(t,
            style: const TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.w800)),
      );

  Widget _btn(String label, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
        decoration: BoxDecoration(
          border: Border.all(color: _yellow),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(label,
            style: const TextStyle(
                color: _yellow, fontSize: 13, fontWeight: FontWeight.w700)),
      ),
    );
  }

  Widget _tf(TextEditingController c, String label,
      {TextInputType? type,
      TextCapitalization caps = TextCapitalization.words}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: TextField(
        controller: c,
        keyboardType: type,
        textCapitalization: caps,
        style: const TextStyle(color: Colors.white, fontSize: 15),
        decoration: InputDecoration(
          labelText: label,
          labelStyle: const TextStyle(color: _muted, fontSize: 14),
          filled: true,
          fillColor: _panel,
          isDense: true,
          contentPadding: const EdgeInsets.all(14),
          border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none),
        ),
      ),
    );
  }

  Widget _dateTile(String label, DateTime? value, String which) {
    return GestureDetector(
      onTap: () => _pickDate(which),
      child: Container(
        width: double.infinity,
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: _box(),
        child: Row(children: [
          const Icon(Icons.calendar_today, color: _yellow, size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Text(label,
                style: const TextStyle(color: _muted, fontSize: 14)),
          ),
          Text(value == null ? 'Pick a date' : _vsFmt(value),
              style: TextStyle(
                  color: value == null ? _yellow : Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w700)),
        ]),
      ),
    );
  }

  Widget _chip(String label, bool on, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: on ? _yellow : _panel,
          borderRadius: BorderRadius.circular(22),
        ),
        child: Text(label,
            style: TextStyle(
                color: on ? Colors.black : Colors.white,
                fontSize: 13,
                fontWeight: FontWeight.w700)),
      ),
    );
  }

  Widget _photoTile(String key, String title, String hint) {
    final bytes = _bytes[key];
    final has = _hasPhoto(key);
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: _box(),
      child: Row(children: [
        Container(
          width: 64,
          height: 64,
          decoration: BoxDecoration(
            color: Colors.black26,
            borderRadius: BorderRadius.circular(10),
          ),
          child: bytes != null
              ? ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: Image.memory(bytes, fit: BoxFit.cover),
                )
              : Icon(has ? Icons.check_circle : Icons.add_a_photo,
                  color: has ? _green : _muted, size: 28),
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
            const SizedBox(height: 2),
            Text(bytes == null && has ? 'On file' : hint,
                style: TextStyle(
                    color: bytes == null && has ? _green : _muted,
                    fontSize: 12)),
          ]),
        ),
        _btn(has ? 'Replace' : 'Add', () => _pickPhoto(key)),
      ]),
    );
  }

  Widget _check(bool value, ValueChanged<bool> onChanged, String text) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () => onChanged(!value),
      child: Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(value ? Icons.check_box : Icons.check_box_outline_blank,
              color: value ? _yellow : _muted, size: 24),
          const SizedBox(width: 10),
          Expanded(
            child: Text(text,
                style: const TextStyle(
                    color: Colors.white, fontSize: 13, height: 1.35)),
          ),
        ]),
      ),
    );
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
              style: const TextStyle(
                  color: Colors.white70, fontSize: 15, height: 1.4)),
          const SizedBox(height: 18),
          Wrap(spacing: 10, runSpacing: 10, children: actions),
        ]),
      ),
    );
  }

  Widget _header() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(6, 6, 14, 6),
      child: Row(children: [
        IconButton(
          onPressed: () => Navigator.maybePop(context),
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white),
        ),
        const SizedBox(width: 4),
        const Text('Become a Valkyrie',
            style: TextStyle(
                color: Colors.white,
                fontSize: 20,
                fontWeight: FontWeight.w800)),
      ]),
    );
  }

  // ---------------------------------------------------------------- views
  Widget _form() {
    final note = (_existing?['reviewer_note'] ?? '').toString();
    final rejected = (_existing?['status'] ?? '') == 'rejected';
    return Column(children: [
      _header(),
      Expanded(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(14, 0, 14, 20),
          children: [
            if (rejected)
              Container(
                width: double.infinity,
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF3A2226),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: _red),
                ),
                child: Text(
                    note.isEmpty
                        ? 'Your last application was not approved. Fix anything that is out of date and send it again.'
                        : 'Your last application was not approved: $note',
                    style: const TextStyle(color: Colors.white, fontSize: 13)),
              ),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: _box(),
              child: const Text(
                  'Valkyries are independent contractors. You carry your own auto insurance, and it must cover delivery for hire. Many personal policies do not, so check with your insurer before you apply.',
                  style: TextStyle(
                      color: Colors.white70, fontSize: 13, height: 1.4)),
            ),
            _h('About you'),
            _tf(_name, 'Full legal name'),
            _tf(_phone, 'Phone',
                type: TextInputType.phone, caps: TextCapitalization.none),
            _dateTile('Date of birth', _dob, 'dob'),
            _tf(_city, 'City'),
            _h('Your vehicle'),
            Wrap(spacing: 8, runSpacing: 8, children: [
              for (final v in _vehicleTypes)
                _chip(v, _vehicleType == v,
                    () => setState(() => _vehicleType = v)),
            ]),
            const SizedBox(height: 12),
            _tf(_make, 'Make'),
            _tf(_model, 'Model'),
            _tf(_year, 'Year',
                type: TextInputType.number, caps: TextCapitalization.none),
            _tf(_color, 'Color'),
            _tf(_plate, 'License plate', caps: TextCapitalization.characters),
            _h('What do you want to do?'),
            Wrap(spacing: 8, runSpacing: 8, children: [
              for (final s in _serviceOptions)
                _chip(s[1], _services.contains(s[0]), () {
                  setState(() {
                    if (_services.contains(s[0])) {
                      _services.remove(s[0]);
                    } else {
                      _services.add(s[0]);
                    }
                  });
                }),
            ]),
            if (_services.contains('freight'))
              const Padding(
                padding: EdgeInsets.only(top: 8),
                child: Text(
                    'We will ask about your truck or trailer before you can take freight loads.',
                    style: TextStyle(color: _muted, fontSize: 12)),
              ),
            _h('Insurance and license'),
            _tf(_insCompany, 'Insurance company'),
            _dateTile('Insurance expires', _insExp, 'ins'),
            _dateTile('Driver license expires', _licExp, 'lic'),
            _h('Photos'),
            _photoTile('license', 'Driver license', 'Front of your license'),
            _photoTile(
                'insurance', 'Insurance card', 'Must show your name and dates'),
            _photoTile('vehicle', 'Your vehicle', 'The vehicle you will drive'),
            _h('Agreements'),
            _check(_okContractor, (v) => setState(() => _okContractor = v),
                'I am an independent contractor. I am not an employee of Sleipnir, and I choose when I work.'),
            _check(_okInsurance, (v) => setState(() => _okInsurance = v),
                'I carry my own auto insurance that covers delivery for hire, and I will keep it current. Sleipnir does not insure me or my vehicle.'),
            _check(_okBackground, (v) => setState(() => _okBackground = v),
                'I agree to a background check and a driving record check.'),
            _check(_okTerms, (v) => setState(() => _okTerms = v),
                'I accept the Valkyrie terms of service.'),
          ],
        ),
      ),
      Container(
        padding: const EdgeInsets.fromLTRB(14, 10, 14, 12),
        decoration: const BoxDecoration(
          color: _panel,
          border: Border(top: BorderSide(color: Colors.white12)),
        ),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(_error!,
                  style: const TextStyle(color: _red, fontSize: 13)),
            ),
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton(
              onPressed: _busy ? null : _submit,
              style: ElevatedButton.styleFrom(
                backgroundColor: _yellow,
                foregroundColor: Colors.black,
                disabledBackgroundColor: Colors.white12,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
              child: _busy
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.black),
                    )
                  : const Text('Send my application',
                      style:
                          TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            ),
          ),
        ]),
      ),
    ]);
  }

  Widget _body() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: _yellow));
    }
    if (SupaFlow.client.auth.currentUser == null) {
      return _message(
          'Log in first', 'You need a Sleipnir account to apply.', <Widget>[
        _btn('Log in', () => context.pushNamed('LoginPage')),
      ]);
    }
    final st = (_existing?['status'] ?? '').toString();
    if (st == 'pending') {
      return _message(
        _justSubmitted ? 'Application sent' : 'Application under review',
        'We are checking your license, insurance and vehicle. You can take orders once you are approved.',
        <Widget>[_btn('Back', () => Navigator.maybePop(context))],
      );
    }
    if (st == 'approved') {
      return _message(
        'You are a Valkyrie',
        'You are approved. Open your dashboard to start taking orders.',
        <Widget>[
          _btn('Open dashboard', () => context.pushNamed('DriverDashboard'))
        ],
      );
    }
    if (st == 'suspended') {
      return _message(
        'Account paused',
        'Your Valkyrie account is paused. Contact Sleipnir support.',
        <Widget>[_btn('Back', () => Navigator.maybePop(context))],
      );
    }
    return _form();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: widget.width,
      height: widget.height,
      child: ColoredBox(
        color: _bg,
        child: SafeArea(child: _body()),
      ),
    );
  }
}