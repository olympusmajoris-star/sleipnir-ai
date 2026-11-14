// ASGARD_NATIVE_STUDIO_V1 — approved presentation settings only.
const _rvNativeRenderer = 'native-raven-20261114-v1';

Map<String, dynamic>? _rvNativeDocument(dynamic row, String page) {
  if (row is! Map || row['page_key'] != page ||
      row['renderer_version'] != _rvNativeRenderer) return null;
  final d = row['document'];
  if (d is! Map || d['schemaVersion'] != 1 || d['designId'] != page ||
      d['rendererVersion'] != _rvNativeRenderer ||
      d['assetsFrozen'] != true || d['settings'] is! Map) return null;
  final settings = d['settings'];
  if (settings['nativeSchema'] != 1 || settings['raven'] is! Map) return null;
  return Map<String, dynamic>.from(settings['raven'] as Map);
}

Future<Map<String, dynamic>?> _rvApprovedNativeSettings(String? candidate) async {
  dynamic row;
  if (candidate != null && candidate.isNotEmpty) {
    if (!RegExp(r'^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$').hasMatch(candidate)) {
      throw StateError('Invalid native test copy');
    }
    row = await SupaFlow.client.from('studio_app_candidates').select()
        .eq('id', candidate).eq('page_key', 'raven').maybeSingle()
        .timeout(const Duration(seconds: 12));
    final value = _rvNativeDocument(row, 'raven');
    if (value == null) throw StateError('Native test copy is unavailable or incompatible');
    return value;
  }
  final channel = await SupaFlow.client.from('studio_app_channels')
      .select('active_release_id').eq('page_key', 'raven').maybeSingle()
      .timeout(const Duration(seconds: 12));
  final id = channel?['active_release_id'];
  if (id == null) return null;
  row = await SupaFlow.client.from('studio_app_releases').select()
      .eq('id', id).eq('page_key', 'raven').maybeSingle()
      .timeout(const Duration(seconds: 12));
  // Web renderer approvals cannot replace the original native scene.
  return _rvNativeDocument(row, 'raven');
}
