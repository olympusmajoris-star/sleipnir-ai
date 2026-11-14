/* Apply narrowly checked additions to the original full widget on the owner's device. */
(function(G){'use strict';
function patch(source,helper,candidate=''){
 if(source.includes('ASGARD_NATIVE_STUDIO_V1')) {
  const pattern=/this\.studioTestCandidate(?: = '[a-f0-9-]{36}')?}/i;
  if(!pattern.test(source))throw Error('Integrated widget constructor changed; no file created.');
  if(candidate&&!/^[a-f0-9-]{36}$/i.test(candidate))throw Error('Invalid test copy');
  return source.replace(pattern, 'this.studioTestCandidate'+(candidate?" = '"+candidate+"'":'')+'}');
 }
 if(!source.includes('class AsgardRaven extends StatefulWidget')||!source.includes('class _RvConversation'))throw Error('Choose the full original AsgardRaven source, including its conversation.');
 if(candidate&&!/^[a-f0-9-]{36}$/i.test(candidate))throw Error('Invalid test copy');
 function replace(a,b){if(source.split(a).length!==2)throw Error('Original source changed near '+a.slice(0,65)+'. No partial file was created.');source=source.replace(a,b);}
 replace('const AsgardRaven({super.key, this.width, this.height});',`const AsgardRaven({super.key, this.width, this.height, this.studioTestCandidate${candidate?" = '"+candidate+"'":''}});\n  final String? studioTestCandidate;`);
 replace('  Future<void> _loadRavenTuning() async {',`  String? _nativeStudioError;\n  Future<void> _loadApprovedRavenTuning() async {\n    final user = _accountId;\n    try {\n      final data = await _rvApprovedNativeSettings(widget.studioTestCandidate);\n      if (!mounted || user != _accountId || _ravenTuningTouched) return;\n      if (data == null) { if (_nativeStudioError != null) setState(() => _nativeStudioError = null); return; }\n      double read(String key, double old, double lo, double hi) {\n        final v = data[key];\n        return v is num && v.toDouble().isFinite ? v.toDouble().clamp(lo, hi).toDouble() : old;\n      }\n      setState(() {\n        _nativeStudioError = null;\n        _scene.readExtras({..._scene.extraSettings, ...data, 'preview_repeat': false});\n        _scene.tabGlow = read('glow', _scene.tabGlow, 0, 3);\n        _scene.revealBrightness = read('reveal', _scene.revealBrightness, 0, 4);\n        _scene.tilt = read('tilt', _scene.tilt, -90, 90);\n        _scene.tabHue = read('hue', _scene.tabHue, 0, 360);\n        _scene.sphereX = read('x', _scene.sphereX, .25, .65);\n        _scene.spinSpeed = read('spin', _scene.spinSpeed, 0, 12);\n        _scene.sphereOffset = read('height', _scene.sphereOffset, -.35, .15);\n      });\n      _scene.refresh();\n    } catch (_) {\n      if (mounted && widget.studioTestCandidate != null) setState(() => _nativeStudioError = 'Native test copy could not load. Existing scene retained.');\n    }\n  }\n\n  Future<void> _loadRavenTuning() async {`);
 replace('    if (!_canTuneRaven) return;\n    try {\n      final prefs = await rv_prefs.SharedPreferences.getInstance();', '    if (!_canTuneRaven) { await _loadApprovedRavenTuning(); return; }\n    try {\n      final prefs = await rv_prefs.SharedPreferences.getInstance();');
 replace('      /* Retain working defaults if saved preferences are unavailable. */\n    }','      /* Retain working defaults if saved preferences are unavailable. */\n    } finally {\n      await _loadApprovedRavenTuning();\n    }');
 replace('    _appActive = state == AppLifecycleState.resumed;\n    _lastTick', '    _appActive = state == AppLifecycleState.resumed;\n    if (_appActive) unawaited(_loadApprovedRavenTuning());\n    _lastTick');
 const marker='                children: [\n                  const Positioned.fill(child: ColoredBox(color: Colors.black)),';
 // Append a test label to this Stack using a spread whose last overlay stays visible.
 const start=source.indexOf(marker),end=source.indexOf('\n                ],',start);if(start<0||end<0)throw Error('Native scene boundary unavailable');
 source=source.slice(0,end)+`\n                  if (widget.studioTestCandidate != null) Positioned(left: 8, right: 8, top: MediaQuery.of(context).padding.top + 4, child: IgnorePointer(child: ColoredBox(color: const Color(0xCC153C45), child: Padding(padding: const EdgeInsets.all(6), child: Text(_nativeStudioError ?? 'DEVICE TEST — original Raven, contacts and messages', style: const TextStyle(color: Colors.white, fontSize: 12), textAlign: TextAlign.center))))),`+source.slice(end);
 source+='\n\n'+helper+'\n';return source;
}
if(typeof module!=='undefined')module.exports={patch};G.NativeRavenPatcher={patch};
})(typeof window!=='undefined'?window:globalThis);
