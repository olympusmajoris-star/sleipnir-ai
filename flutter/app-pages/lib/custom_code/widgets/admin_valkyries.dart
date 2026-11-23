// Studio preview copy of the FlutterFlow custom widget AdminValkyries.
// The widget code below is the app's code. Only two imports differ:
// geolocator -> fixed test location, supabase_flutter -> supabase.
import 'package:sleipnir_app_pages/backend/supabase/supabase.dart';
import 'package:sleipnir_app_pages/flutter_flow/flutter_flow_util.dart';
import 'package:flutter/material.dart';
import 'package:flutter/material.dart';

import 'dart:async';

class AdminValkyries extends StatefulWidget {
  const AdminValkyries({
    super.key,
    this.width,
    this.height,
  });

  final double? width;
  final double? height;

  @override
  State<AdminValkyries> createState() => _AdminValkyriesState();
}

const Color _avBg = Color(0xFF11151C);
const Color _avPanel = Color(0xFF202630);
const Color _avYellow = Color(0xFFFFC72C);
const Color _avMuted = Color(0xFFB8C0CB);
const Color _avGreen = Color(0xFF2FBF71);
const Color _avRed = Color(0xFFFF7A7A);

String _avS(dynamic v) => (v ?? '').toString();

class _AdminValkyriesState extends State<AdminValkyries> {
  bool _loading = true;
  bool _isAdmin = false;
  String? _error;
  int _tab = 0; // 0 pending, 1 approved, 2 rejected/suspended
  List<Map<String, dynamic>> _apps = [];
  final Map<String, String> _signed = {};
  String? _busyId;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final uid = SupaFlow.client.auth.currentUser?.id;
      if (uid == null) {
        setState(() {
          _loading = false;
          _isAdmin = false;
        });
        return;
      }
      final prof = await SupaFlow.client
          .from('profiles')
          .select('role')
          .eq('id', uid)
          .maybeSingle();
      final admin = _avS(prof?['role']) == 'admin';
      if (!admin) {
        if (!mounted) return;
        setState(() {
          _isAdmin = false;
          _loading = false;
        });
        return;
      }
      final rows = await SupaFlow.client
          .from('valkyrie_applications')
          .select()
          .order('created_at', ascending: false);
      if (!mounted) return;
      setState(() {
        _isAdmin = true;
        _apps = (rows as List)
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Could not load: $e';
        _loading = false;
      });
    }
  }

  List<Map<String, dynamic>> get _shown {
    return _apps.where((a) {
      final s = _avS(a['status']);
      if (_tab == 0) return s == 'pending' || s.isEmpty;
      if (_tab == 1) return s == 'approved';
      return s == 'rejected' || s == 'suspended';
    }).toList();
  }

  int _count(int tab) {
    return _apps.where((a) {
      final s = _avS(a['status']);
      if (tab == 0) return s == 'pending' || s.isEmpty;
      if (tab == 1) return s == 'approved';
      return s == 'rejected' || s == 'suspended';
    }).length;
  }

  Future<String?> _urlFor(String? path) async {
    if (path == null || path.isEmpty) return null;
    if (path.startsWith('http')) return path;
    if (_signed.containsKey(path)) return _signed[path];
    try {
      final u = await SupaFlow.client.storage
          .from('valkyrie-docs')
          .createSignedUrl(path, 3600);
      _signed[path] = u;
      return u;
    } catch (_) {
      return null;
    }
  }

  void _toast(String m, {bool bad = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(m),
      backgroundColor: bad ? _avRed : _avGreen,
    ));
  }

  Future<void> _setStatus(Map<String, dynamic> a, String status,
      {String? note}) async {
    final id = _avS(a['id']);
    setState(() => _busyId = id);
    try {
      final upd = <String, dynamic>{'status': status};
      if (note != null) upd['reviewer_note'] = note;
      upd['reviewed_at'] = DateTime.now().toUtc().toIso8601String();
      await SupaFlow.client
          .from('valkyrie_applications')
          .update(upd)
          .eq('id', id);
      _toast(status == 'approved'
          ? 'Approved. They can run orders now.'
          : 'Marked $status.');
      await _load();
    } catch (e) {
      var msg = e.toString();
      final i = msg.indexOf('Cannot approve');
      if (i >= 0) msg = msg.substring(i);
      _toast(msg, bad: true);
    } finally {
      if (mounted) setState(() => _busyId = null);
    }
  }

  Future<void> _askNote(Map<String, dynamic> a, String status) async {
    final c = TextEditingController(text: _avS(a['reviewer_note']));
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: _avPanel,
        title: Text(
            status == 'rejected' ? 'Reject application' : 'Suspend Valkyrie',
            style: const TextStyle(color: Colors.white)),
        content: TextField(
          controller: c,
          maxLines: 3,
          style: const TextStyle(color: Colors.white),
          decoration: const InputDecoration(
            hintText: 'Reason (they will see this)',
            hintStyle: TextStyle(color: _avMuted),
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          TextButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: Text(status == 'rejected' ? 'Reject' : 'Suspend',
                  style: const TextStyle(color: _avRed))),
        ],
      ),
    );
    if (ok == true) {
      await _setStatus(a, status, note: c.text.trim());
    }
  }

  Future<void> _openImage(String? path, String label) async {
    final u = await _urlFor(path);
    if (!mounted) return;
    if (u == null) {
      _toast('No $label on file', bad: true);
      return;
    }
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.black,
        insetPadding: const EdgeInsets.all(12),
        child: Stack(children: [
          InteractiveViewer(
            child: Image.network(u,
                fit: BoxFit.contain,
                errorBuilder: (_, __, ___) => const Padding(
                      padding: EdgeInsets.all(40),
                      child: Text('Could not load image',
                          style: TextStyle(color: Colors.white)),
                    )),
          ),
          Positioned(
            top: 4,
            right: 4,
            child: IconButton(
              icon: const Icon(Icons.close, color: Colors.white),
              onPressed: () => Navigator.pop(ctx),
            ),
          ),
        ]),
      ),
    );
  }

  String _date(dynamic v) {
    final s = _avS(v);
    return s.length >= 10 ? s.substring(0, 10) : (s.isEmpty ? 'missing' : s);
  }

  bool _expired(dynamic v) {
    final d = DateTime.tryParse(_avS(v));
    if (d == null) return true;
    final n = DateTime.now();
    return d.isBefore(DateTime(n.year, n.month, n.day));
  }

  Widget _chip(String t, Color c) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
            color: c.withOpacity(0.18), borderRadius: BorderRadius.circular(8)),
        child: Text(t,
            style:
                TextStyle(color: c, fontSize: 12, fontWeight: FontWeight.w700)),
      );

  Widget _docBtn(String label, String? path) {
    final has = path != null && path.isNotEmpty;
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.only(right: 6),
        child: OutlinedButton.icon(
          onPressed: has ? () => _openImage(path, label) : null,
          icon: Icon(has ? Icons.image : Icons.block, size: 16),
          label: Text(label, style: const TextStyle(fontSize: 12)),
          style: OutlinedButton.styleFrom(
            foregroundColor: has ? _avYellow : _avMuted,
            side: BorderSide(color: has ? _avYellow : _avMuted),
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
          ),
        ),
      ),
    );
  }

  Widget _line(String k, String v, {Color? c}) => Padding(
        padding: const EdgeInsets.only(top: 3),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          SizedBox(
              width: 112,
              child: Text(k,
                  style: const TextStyle(color: _avMuted, fontSize: 13))),
          Expanded(
              child: Text(v,
                  style: TextStyle(
                      color: c ?? Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w600))),
        ]),
      );

  Widget _card(Map<String, dynamic> a) {
    final id = _avS(a['id']);
    final status = _avS(a['status']).isEmpty ? 'pending' : _avS(a['status']);
    final busy = _busyId == id;
    final insExp = _expired(a['insurance_expires_on']);
    final licExp =
        a['license_expires_on'] != null && _expired(a['license_expires_on']);
    final consent = a['background_consent'] == true;
    final contractor = a['contractor_ack_at'] != null;
    final attest = a['insurance_attest_at'] != null;
    final services = (a['service_types'] is List)
        ? (a['service_types'] as List).join(', ')
        : _avS(a['service_types']);
    final vehicle = [
      _avS(a['vehicle_year']),
      _avS(a['vehicle_color']),
      _avS(a['vehicle_make']),
      _avS(a['vehicle_model'])
    ].where((x) => x.isNotEmpty && x != 'null').join(' ');
    final ready = !insExp &&
        consent &&
        contractor &&
        attest &&
        _avS(a['license_photo_url']).isNotEmpty &&
        _avS(a['insurance_photo_url']).isNotEmpty &&
        _avS(a['vehicle_photo_url']).isNotEmpty;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
          color: _avPanel, borderRadius: BorderRadius.circular(12)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(
              child: Text(
                  _avS(a['full_name']).isEmpty
                      ? 'No name'
                      : _avS(a['full_name']),
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 17,
                      fontWeight: FontWeight.w800))),
          _chip(
              status.toUpperCase(),
              status == 'approved'
                  ? _avGreen
                  : (status == 'pending' ? _avYellow : _avRed)),
        ]),
        const SizedBox(height: 6),
        _line('Phone', _avS(a['phone'])),
        _line('Email', _avS(a['email'])),
        _line('City', _avS(a['city'])),
        _line('Date of birth', _date(a['date_of_birth'])),
        _line(
            'Vehicle',
            vehicle.isEmpty
                ? _avS(a['vehicle_type'])
                : '$vehicle (${_avS(a['vehicle_type'])})'),
        _line('Plate', _avS(a['plate'])),
        _line('Delivers', services),
        _line('Insurance',
            '${_avS(a['insurance_company'])}  exp ${_date(a['insurance_expires_on'])}',
            c: insExp ? _avRed : _avGreen),
        _line('License exp', _date(a['license_expires_on']),
            c: licExp ? _avRed : Colors.white),
        _line('Background OK', consent ? 'Yes' : 'No',
            c: consent ? _avGreen : _avRed),
        _line('Contractor terms', contractor ? 'Accepted' : 'No',
            c: contractor ? _avGreen : _avRed),
        _line('Insurance attest', attest ? 'Yes' : 'No',
            c: attest ? _avGreen : _avRed),
        if (_avS(a['reviewer_note']).isNotEmpty)
          _line('Note', _avS(a['reviewer_note'])),
        const SizedBox(height: 10),
        Row(children: [
          _docBtn('License', _avS(a['license_photo_url'])),
          _docBtn('Insurance', _avS(a['insurance_photo_url'])),
          _docBtn('Vehicle', _avS(a['vehicle_photo_url'])),
        ]),
        const SizedBox(height: 10),
        if (busy)
          const Center(
              child: SizedBox(
                  height: 22,
                  width: 22,
                  child: CircularProgressIndicator(
                      strokeWidth: 2, color: _avYellow)))
        else if (status == 'pending')
          Row(children: [
            Expanded(
              child: ElevatedButton(
                onPressed: ready ? () => _setStatus(a, 'approved') : null,
                style: ElevatedButton.styleFrom(
                    backgroundColor: _avGreen,
                    foregroundColor: Colors.white,
                    disabledBackgroundColor: const Color(0xFF3A4350)),
                child: Text(ready ? 'Approve' : 'Missing items'),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: OutlinedButton(
                onPressed: () => _askNote(a, 'rejected'),
                style: OutlinedButton.styleFrom(
                    foregroundColor: _avRed,
                    side: const BorderSide(color: _avRed)),
                child: const Text('Reject'),
              ),
            ),
          ])
        else if (status == 'approved')
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: () => _askNote(a, 'suspended'),
              style: OutlinedButton.styleFrom(
                  foregroundColor: _avRed,
                  side: const BorderSide(color: _avRed)),
              child: const Text('Suspend'),
            ),
          )
        else
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: ready ? () => _setStatus(a, 'approved') : null,
              style: ElevatedButton.styleFrom(
                  backgroundColor: _avGreen, foregroundColor: Colors.white),
              child: const Text('Reinstate / approve'),
            ),
          ),
      ]),
    );
  }

  Widget _tabBtn(int i, String label) {
    final sel = _tab == i;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _tab = i),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: sel ? _avYellow : _avPanel,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Center(
            child: Text('$label (${_count(i)})',
                style: TextStyle(
                    color: sel ? Colors.black : Colors.white,
                    fontWeight: FontWeight.w800,
                    fontSize: 13)),
          ),
        ),
      ),
    );
  }

  Widget _body() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: _avYellow));
    }
    if (_error != null) {
      return Center(
          child: Padding(
        padding: const EdgeInsets.all(24),
        child: Text(_error!, style: const TextStyle(color: _avRed)),
      ));
    }
    if (!_isAdmin) {
      return const Center(
          child: Padding(
        padding: EdgeInsets.all(24),
        child: Text('Admins only.',
            style: TextStyle(color: Colors.white, fontSize: 18)),
      ));
    }
    final list = _shown;
    return Column(children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
        child: Row(children: [
          _tabBtn(0, 'Pending'),
          const SizedBox(width: 6),
          _tabBtn(1, 'Approved'),
          const SizedBox(width: 6),
          _tabBtn(2, 'Closed'),
        ]),
      ),
      Expanded(
        child: RefreshIndicator(
          onRefresh: _load,
          child: list.isEmpty
              ? ListView(children: const [
                  SizedBox(height: 80),
                  Center(
                      child: Text('Nothing here.',
                          style: TextStyle(color: _avMuted, fontSize: 16))),
                ])
              : ListView.builder(
                  padding: const EdgeInsets.fromLTRB(12, 4, 12, 24),
                  itemCount: list.length,
                  itemBuilder: (_, i) => _card(list[i]),
                ),
        ),
      ),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: widget.width,
      height: widget.height,
      child: ColoredBox(
        color: _avBg,
        child: SafeArea(
          child: Column(children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 8, 0),
              child: Row(children: [
                const Expanded(
                    child: Text('Approve Valkyries',
                        style: TextStyle(
                            color: Colors.white,
                            fontSize: 22,
                            fontWeight: FontWeight.w800))),
                IconButton(
                    icon: const Icon(Icons.refresh, color: _avYellow),
                    onPressed: _load),
              ]),
            ),
            Expanded(child: _body()),
          ]),
        ),
      ),
    );
  }
}