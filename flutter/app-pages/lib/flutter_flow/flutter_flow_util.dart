// Studio preview stand-in for FlutterFlow's flutter_flow_util.dart.
// Only the pieces the Sleipnir custom widgets use.
import 'package:flutter/material.dart';

export 'dart:convert' show jsonEncode, jsonDecode;
export 'dart:math' show min, max;
export 'dart:typed_data' show Uint8List;

/// Set by the preview: returns the page for an app route name, or null when
/// that page is not part of the preview.
Widget? Function(String routeName)? previewRoute;

final GlobalKey<ScaffoldMessengerState> previewMessenger =
    GlobalKey<ScaffoldMessengerState>();

void previewNotice(String text) {
  final ScaffoldMessengerState? m = previewMessenger.currentState;
  if (m == null) return;
  m.hideCurrentSnackBar();
  m.showSnackBar(SnackBar(
    content: Text(text),
    behavior: SnackBarBehavior.floating,
    duration: const Duration(seconds: 3),
  ));
}

class FFAppState extends ChangeNotifier {
  static final FFAppState _instance = FFAppState._internal();

  factory FFAppState() => _instance;

  FFAppState._internal();

  List<dynamic> cart = <dynamic>[];

  void update(VoidCallback callback) {
    callback();
    notifyListeners();
  }
}

Future<void> launchURL(String url) async {
  previewNotice('Opens the maps app on the phone. Not part of this preview.');
}

String _routeLabel(String name) {
  switch (name) {
    case 'LoginPage':
      return 'The login page';
    case 'OrderTracking':
      return 'Order tracking';
    case 'Cart':
      return 'The cart';
  }
  return name;
}

// Same shapes as go_router's pushNamed / goNamed that FlutterFlow uses.
extension FFPreviewNavigation on BuildContext {
  Future<T?> pushNamed<T extends Object?>(
    String name, {
    Map<String, String> pathParameters = const <String, String>{},
    Map<String, dynamic> queryParameters = const <String, dynamic>{},
    Object? extra,
  }) async {
    final Widget? page = previewRoute?.call(name);
    if (page == null) {
      previewNotice('${_routeLabel(name)} opens here in the app. Not part of this preview.');
      return null;
    }
    return Navigator.of(this).push<T>(MaterialPageRoute<T>(builder: (_) => page));
  }

  void goNamed(
    String name, {
    Map<String, String> pathParameters = const <String, String>{},
    Map<String, dynamic> queryParameters = const <String, dynamic>{},
    Object? extra,
    String? fragment,
  }) {
    final Widget? page = previewRoute?.call(name);
    if (page == null) {
      previewNotice('${_routeLabel(name)} opens here in the app. Not part of this preview.');
      return;
    }
    Navigator.of(this).pushAndRemoveUntil<void>(
      MaterialPageRoute<void>(builder: (_) => page),
      (Route<dynamic> r) => false,
    );
  }
}
