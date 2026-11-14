// FlutterFlow custom widget: AsgardStudioSurface.
// Production reads approved releases only. It never reads studio drafts.
// This displays the shared web renderer; it does not replace app backends.
// Pin dependencies listed in flutter-transfer.md before adding this widget.
import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';
import 'package:webview_flutter_wkwebview/webview_flutter_wkwebview.dart';

const asgardStudioRuntimeUrl =
    'https://olympusmajoris-star.github.io/sleipnir-ai/runtime/transfer-20261114-v1/app-runtime.html';

const asgardStudioPages = <String>{
  'raven',
  'home',
  'shome',
  'browse',
  'store',
  'swap',
  'ads',
  'shoppost',
  'deals',
  'share',
  'convo',
  'heimdall',
  'track',
  'navigation',
};

final _asgardUuid = RegExp(
  r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
);
final _asgardIdentifier = RegExp(r'^[A-Za-z0-9_.:-]{1,128}$');
const _asgardBrowseTypes = <String>{
  'grocery',
  'fast_food',
  'restaurant',
  'retail',
  'valhalla',
};

/// Validates the actual page-to-document mapping used by the studio.
/// There is deliberately no mode, draft, preview, token or arbitrary URL input.
Uri asgardApprovedRuntimeUri({
  required String page,
  required String designId,
  String? storeId,
  String? releaseId,
}) {
  if (!asgardStudioPages.contains(page)) {
    throw const FormatException('Choose a supported studio page.');
  }
  final store = storeId?.trim() ?? '';
  final design = designId.trim();
  String expected;
  if (page == 'raven' || page == 'navigation') {
    expected = page;
  } else if (page == 'store') {
    if (!_asgardUuid.hasMatch(store)) {
      throw const FormatException('Choose a store with a valid store ID.');
    }
    expected = 'page_store_$store';
  } else if (page == 'browse') {
    const prefix = 'page_browse_';
    if (!design.startsWith(prefix) ||
        !_asgardBrowseTypes.contains(design.substring(prefix.length))) {
      throw const FormatException('Choose a supported store-list design.');
    }
    expected = design;
  } else {
    expected = 'page_$page';
  }
  if (design != expected) {
    throw const FormatException('The design ID does not belong to this page.');
  }
  if (page != 'store' && store.isNotEmpty) {
    throw const FormatException('Only a store page accepts a store ID.');
  }
  final release = releaseId?.trim() ?? '';
  if (release.isNotEmpty && !_asgardUuid.hasMatch(release)) {
    throw const FormatException('Choose a valid approved release ID.');
  }
  return Uri.parse(asgardStudioRuntimeUrl).replace(
    queryParameters: {
      'mode': 'approved',
      'design': design,
      'page': page,
      if (page == 'browse') 'type': design.substring('page_browse_'.length),
      if (store.isNotEmpty) 'store': store,
      if (release.isNotEmpty) 'release': release,
    },
  );
}

/// Only the runtime itself may be the top-level document. Its renderer iframe
/// may load the two known studio pages, on the exact same trusted origin.
bool asgardAllowsNavigation(Uri runtime, String value, bool isMainFrame) {
  final uri = Uri.tryParse(value);
  if (uri == null ||
      uri.scheme != 'https' ||
      !uri.hasAuthority ||
      uri.host.isEmpty ||
      uri.userInfo.isNotEmpty ||
      uri.origin != runtime.origin)
    return false;
  if (isMainFrame) {
    return uri.replace(fragment: '').toString() ==
        runtime.replace(fragment: '').toString();
  }
  final directory = runtime.path.substring(
    0,
    runtime.path.lastIndexOf('/') + 1,
  );
  return <String>{
    runtime.path,
    '${directory}index.html',
    '${directory}pages.html',
  }.contains(uri.path);
}

/// Decodes only supported event shapes. No received JavaScript or URL executes.
Map<String, dynamic>? asgardBridgeEvent(String message) {
  if (message.length > 16384) return null;
  try {
    final value = jsonDecode(message);
    if (value is! Map<String, dynamic> || value['v'] != 1) return null;
    final type = value['type'];
    if (type == 'ready') {
      final design = value['design'];
      if (design is! String || !_asgardIdentifier.hasMatch(design)) return null;
      return {'v': 1, 'type': type, 'design': design};
    }
    if (type == 'error') {
      final reason = value['message'];
      return {
        'v': 1,
        'type': type,
        'message': reason is String
            ? reason.substring(0, reason.length.clamp(0, 500))
            : 'The approved design could not be loaded.',
      };
    }
    if (type == 'navigate') {
      final target = value['target'];
      final store = value['storeId'] ?? '';
      final pageType = value['pageType'] ?? '';
      if (target is! String ||
          !asgardStudioPages.contains(target) ||
          store is! String ||
          pageType is! String ||
          (store.isNotEmpty && !_asgardUuid.hasMatch(store)) ||
          (target == 'store' && store.isEmpty) ||
          (target != 'store' && store.isNotEmpty) ||
          (target == 'browse' && !_asgardBrowseTypes.contains(pageType)) ||
          (target != 'browse' && pageType.isNotEmpty))
        return null;
      return {
        'v': 1,
        'type': type,
        'target': target,
        'storeId': store,
        'pageType': pageType,
      };
    }
    if (type == 'product') {
      final product = value['productId'];
      final store = value['storeId'];
      if (product is! String ||
          store is! String ||
          !_asgardUuid.hasMatch(product) ||
          !_asgardUuid.hasMatch(store))
        return null;
      return {'v': 1, 'type': type, 'productId': product, 'storeId': store};
    }
    if (type == 'contact') {
      final contact = value['contactId'];
      if (contact is! String || !_asgardIdentifier.hasMatch(contact))
        return null;
      return {'v': 1, 'type': type, 'contactId': contact};
    }
  } catch (_) {
    return null;
  }
  return null;
}

List<Map<String, dynamic>> asgardContacts(String? input) {
  if (input == null || input.trim().isEmpty) return [];
  if (input.length > 1024 * 1024) {
    throw const FormatException('The contact list is too large.');
  }
  final decoded = jsonDecode(input);
  if (decoded is! List || decoded.length > 1000) {
    throw const FormatException(
      'Contacts must be a list of at most 1,000 people.',
    );
  }
  String text(dynamic value, int max) {
    final s = value is String ? value : '';
    return s.substring(0, s.length.clamp(0, max));
  }

  String image(dynamic value) {
    if (value is! String || value.length > 8192) return '';
    final uri = Uri.tryParse(value);
    return uri != null &&
            uri.scheme == 'https' &&
            uri.host.isNotEmpty &&
            uri.userInfo.isEmpty
        ? uri.toString()
        : '';
  }

  return decoded.map((entry) {
    if (entry is! Map ||
        entry['id'] is! String ||
        !_asgardIdentifier.hasMatch(entry['id'] as String)) {
      throw const FormatException('Each contact needs a valid ID.');
    }
    final counts = entry['counts'] is Map ? entry['counts'] as Map : const {};
    int count(String key) {
      final value = counts[key];
      return value is num && value.isFinite
          ? value.toInt().clamp(0, 1000000000)
          : 0;
    }

    return <String, dynamic>{
      'id': entry['id'],
      'name': text(entry['name'], 120),
      'msg': text(entry['msg'], 2000),
      'unread': entry['unread'] == true,
      'bust': image(entry['bust']),
      'face': image(entry['face']),
      'counts': {
        'friends': count('friends'),
        'followers': count('followers'),
        'viewers': count('viewers'),
      },
    };
  }).toList();
}

class AsgardStudioSurface extends StatefulWidget {
  const AsgardStudioSurface({
    super.key,
    this.width,
    this.height,
    this.page = 'raven',
    this.designId = 'raven',
    this.storeId,
    this.releaseId,
    this.contactsJson,
    this.onNavigate,
    this.onProductTap,
    this.onContactTap,
  });

  final double? width;
  final double? height;
  final String page;
  final String designId;
  final String? storeId;

  /// Optional approved release UUID. Leave empty to follow the latest approval.
  final String? releaseId;

  /// Real contacts supplied by the authenticated app; empty means no contacts.
  final String? contactsJson;
  final Future Function(String target, String storeId, String pageType)?
  onNavigate;
  final Future Function(String productId, String storeId)? onProductTap;
  final Future Function(String contactId)? onContactTap;

  @override
  State<AsgardStudioSurface> createState() => _AsgardStudioSurfaceState();
}

class _AsgardStudioSurfaceState extends State<AsgardStudioSurface>
    with WidgetsBindingObserver {
  WebViewController? _controller;
  Uri? _runtime;
  Timer? _readyTimeout;
  String? _error;
  bool _ready = false;
  int _loadGeneration = 0;
  int _progress = 0;

  bool get _supported =>
      !kIsWeb &&
      <TargetPlatform>{
        TargetPlatform.android,
        TargetPlatform.iOS,
        TargetPlatform.macOS,
      }.contains(defaultTargetPlatform);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    if (_supported) {
      unawaited(_configure());
    } else {
      _error =
          'This app widget requires Android, iOS or macOS. '
          'Use the studio’s app preview in a browser.';
    }
  }

  Future<void> _configure() async {
    final generation = ++_loadGeneration;
    _readyTimeout?.cancel();
    try {
      final uri = asgardApprovedRuntimeUri(
        page: widget.page,
        designId: widget.designId,
        storeId: widget.storeId,
        releaseId: widget.releaseId,
      );
      asgardContacts(widget.contactsJson);
      PlatformWebViewControllerCreationParams params =
          const PlatformWebViewControllerCreationParams();
      if (WebViewPlatform.instance is WebKitWebViewPlatform) {
        params = WebKitWebViewControllerCreationParams(
          allowsInlineMediaPlayback: true,
          mediaTypesRequiringUserAction: const <PlaybackMediaTypes>{},
        );
      }
      final controller = WebViewController.fromPlatformCreationParams(params);
      await controller.setJavaScriptMode(JavaScriptMode.unrestricted);
      await controller.setBackgroundColor(const Color(0xFF000000));
      await controller.enableZoom(false);
      if (controller.platform is AndroidWebViewController) {
        await (controller.platform as AndroidWebViewController)
            .setMediaPlaybackRequiresUserGesture(false);
      }
      await controller.addJavaScriptChannel(
        'AsgardBridge',
        onMessageReceived: (message) {
          if (generation == _loadGeneration && mounted) {
            unawaited(_message(message.message));
          }
        },
      );
      await controller.setNavigationDelegate(
        NavigationDelegate(
          onNavigationRequest: (request) =>
              asgardAllowsNavigation(uri, request.url, request.isMainFrame)
              ? NavigationDecision.navigate
              : NavigationDecision.prevent,
          onProgress: (progress) {
            if (generation == _loadGeneration && mounted) {
              setState(() => _progress = progress);
            }
          },
          onPageStarted: (_) {
            if (generation != _loadGeneration || !mounted) return;
            setState(() {
              _ready = false;
              _error = null;
              _progress = 0;
            });
          },
          onPageFinished: (url) {
            if (generation != _loadGeneration ||
                !mounted ||
                !asgardAllowsNavigation(uri, url, true))
              return;
            // This is transport completion, not successful design loading.
            // A separate ready event from the runtime completes the hand-off.
            unawaited(_pushContext());
          },
          onWebResourceError: (error) {
            if (generation == _loadGeneration && error.isForMainFrame == true) {
              _fail(
                'The app design could not load. Check your connection and retry.',
              );
            }
          },
          onHttpError: (error) {
            if (generation == _loadGeneration &&
                error.request?.uri == uri &&
                (error.response?.statusCode ?? 0) >= 400) {
              _fail(
                'The app design is unavailable. Retry or restore an approved version.',
              );
            }
          },
        ),
      );
      if (!mounted || generation != _loadGeneration) return;
      final old = _controller;
      setState(() {
        _controller = controller;
        _runtime = uri;
        _ready = false;
        _error = null;
        _progress = 0;
      });
      if (old != null) {
        unawaited(
          old.removeJavaScriptChannel('AsgardBridge').catchError((_) {}),
        );
      }
      _readyTimeout = Timer(const Duration(seconds: 30), () {
        if (generation == _loadGeneration && !_ready) {
          _fail('The approved design did not finish loading. Please retry.');
        }
      });
      await controller.loadRequest(uri);
    } on FormatException catch (error) {
      if (generation == _loadGeneration) _fail(error.message);
    } catch (_) {
      if (generation == _loadGeneration) {
        _fail('The app design could not start on this device. Please retry.');
      }
    }
  }

  Future<void> _pushContext() async {
    final controller = _controller;
    if (controller == null || _runtime == null) return;
    try {
      final payload = <String, dynamic>{
        'v': 1,
        'contacts': asgardContacts(widget.contactsJson),
        'capabilities': {
          'navigate': widget.onNavigate != null,
          'product': widget.onProductTap != null,
          'contact': widget.onContactTap != null,
        },
      };
      final literal = jsonEncode(jsonEncode(payload));
      await controller.runJavaScript(
        'if(window.AsgardApp&&window.AsgardApp.setContext){'
        'window.AsgardApp.setContext(JSON.parse($literal));}',
      );
    } on FormatException catch (_) {
      _fail(
        'The contact data is invalid. The app must supply a valid contact list.',
      );
    } catch (_) {
      // A document reload will send ready and repeat the context handshake.
    }
  }

  Future<void> _message(String raw) async {
    final event = asgardBridgeEvent(raw);
    if (event == null || !mounted) return;
    if (!_ready && event['type'] != 'ready' && event['type'] != 'error') return;
    try {
      switch (event['type']) {
        case 'ready':
          if (event['design'] != widget.designId) return;
          _readyTimeout?.cancel();
          setState(() {
            _ready = true;
            _error = null;
          });
          await _pushContext();
          break;
        case 'error':
          _fail(event['message'] as String);
          break;
        case 'navigate':
          if (widget.onNavigate == null) {
            _notice('This page action has not been connected in the app yet.');
          } else {
            await widget.onNavigate!(
              event['target'] as String,
              event['storeId'] as String,
              event['pageType'] as String,
            );
          }
          break;
        case 'product':
          if (widget.onProductTap == null) {
            _notice('Product actions have not been connected in the app yet.');
          } else {
            await widget.onProductTap!(
              event['productId'] as String,
              event['storeId'] as String,
            );
          }
          break;
        case 'contact':
          if (widget.onContactTap == null) {
            _notice('Contact actions have not been connected in the app yet.');
          } else {
            await widget.onContactTap!(event['contactId'] as String);
          }
          break;
      }
    } catch (_) {
      _notice('That app action could not complete. Please try again.');
    }
  }

  void _notice(String text) {
    if (!mounted) return;
    ScaffoldMessenger.maybeOf(context)
        ?.showSnackBar(SnackBar(content: Text(text)));
  }

  void _fail(String text) {
    _readyTimeout?.cancel();
    if (mounted)
      setState(() {
        _error = text;
        _ready = false;
      });
  }

  @override
  void didUpdateWidget(covariant AsgardStudioSurface oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.page != widget.page ||
        oldWidget.designId != widget.designId ||
        oldWidget.storeId != widget.storeId ||
        oldWidget.releaseId != widget.releaseId) {
      if (_supported) unawaited(_configure());
    } else if (_ready) {
      unawaited(_pushContext());
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final controller = _controller;
    if (controller == null || !_ready) return;
    final active = state == AppLifecycleState.resumed;
    unawaited(
      controller
          .runJavaScript(
            'if(window.AsgardApp&&window.AsgardApp.setActive){'
            'window.AsgardApp.setActive($active);}',
          )
          .catchError((_) {}),
    );
    if (active) unawaited(_pushContext());
  }

  @override
  void dispose() {
    _loadGeneration++;
    _readyTimeout?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    final controller = _controller;
    if (controller != null) {
      unawaited(
        controller.removeJavaScriptChannel('AsgardBridge').catchError((_) {}),
      );
      unawaited(
        controller
            .runJavaScript(
              'if(window.AsgardApp&&window.AsgardApp.setActive){window.AsgardApp.setActive(false);}',
            )
            .catchError((_) {}),
      );
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: widget.width ?? double.infinity,
      height: widget.height ?? double.infinity,
      child: ColoredBox(
        color: const Color(0xFF000000),
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (_controller != null && _error == null)
              WebViewWidget(controller: _controller!),
            if (!_ready && _error == null)
              Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const CircularProgressIndicator(color: Color(0xFF7FE3E0)),
                    const SizedBox(height: 16),
                    Text(
                      'Loading approved design… $_progress%',
                      style: const TextStyle(color: Colors.white),
                    ),
                  ],
                ),
              ),
            if (_error != null)
              Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        _error!,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                        ),
                      ),
                      if (_supported) ...[
                        const SizedBox(height: 16),
                        FilledButton(
                          onPressed: () => unawaited(_configure()),
                          child: const Text('Retry'),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
