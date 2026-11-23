// Sleipnir app pages — studio preview.
// Runs the real FlutterFlow custom widgets (unchanged) on test data.
// Pick the page with ?w=home | offers | run | hub | freight | signup | admin | customer
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import 'package:sleipnir_app_pages/backend/supabase/supabase.dart' show SupaFlow, SupabaseClient;
import 'package:sleipnir_app_pages/custom_code/widgets/admin_valkyries.dart';
import 'package:sleipnir_app_pages/custom_code/widgets/customer_hub.dart';
import 'package:sleipnir_app_pages/custom_code/widgets/freight_board.dart';
import 'package:sleipnir_app_pages/custom_code/widgets/valkyrie_home.dart';
import 'package:sleipnir_app_pages/custom_code/widgets/valkyrie_hub.dart';
import 'package:sleipnir_app_pages/custom_code/widgets/valkyrie_run.dart';
import 'package:sleipnir_app_pages/custom_code/widgets/valkyrie_signup.dart';
import 'package:sleipnir_app_pages/flutter_flow/flutter_flow_util.dart' show previewMessenger, previewRoute;
import 'package:sleipnir_app_pages/preview/backend.dart';
import 'package:sleipnir_app_pages/preview/seed.dart';

const Color _bg = Color(0xFF11151C);

void main() {
  final http.Client real = http.Client();
  final String scene =
      (Uri.base.queryParameters['w'] ?? 'home').trim().toLowerCase();
  final PreviewSeed seed = PreviewSeed.forScene(scene);
  final Map<String, dynamic> session = seed.session();
  final PreviewBackend backend =
      PreviewBackend(seed.db, seed.user.id, real, session);

  http.runWithClient<void>(() {
    WidgetsFlutterBinding.ensureInitialized();
    SupaFlow.client = SupabaseClient(
      PreviewBackend.url,
      PreviewBackend.anonKey,
      httpClient: backend,
    );
    previewRoute = _route;
    final Future<void> ready = _signIn(session);
    runApp(PreviewApp(scene: scene, ready: ready));
  }, () => backend);
}

Future<void> _signIn(Map<String, dynamic> session) async {
  try {
    await SupaFlow.client.auth.recoverSession(jsonEncode(session));
  } catch (_) {
    // The page still opens; it shows its own logged-out state.
  }
}

Widget? _route(String name) {
  switch (name) {
    case 'ValkyrieRun':
      return const PreviewPage(kind: 'run');
    case 'DriverDashboard':
      return const PreviewPage(kind: 'home');
    case 'BecomeValkyrie':
      return const PreviewPage(kind: 'signup');
  }
  return null;
}

class PreviewApp extends StatelessWidget {
  const PreviewApp({super.key, required this.scene, required this.ready});

  final String scene;
  final Future<void> ready;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Sleipnir app preview',
      debugShowCheckedModeBanner: false,
      scaffoldMessengerKey: previewMessenger,
      theme: ThemeData(
        useMaterial3: false,
        scaffoldBackgroundColor: _bg,
      ),
      home: FutureBuilder<void>(
        future: ready,
        builder: (BuildContext context, AsyncSnapshot<void> snap) {
          if (snap.connectionState != ConnectionState.done) {
            return const Scaffold(
              backgroundColor: _bg,
              body: Center(child: CircularProgressIndicator()),
            );
          }
          return PreviewPage(kind: scene);
        },
      ),
    );
  }
}

class PreviewPage extends StatelessWidget {
  const PreviewPage({super.key, required this.kind});

  final String kind;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (BuildContext context, BoxConstraints box) =>
              _page(kind, box.maxWidth, box.maxHeight),
        ),
      ),
    );
  }
}

Widget _page(String kind, double w, double h) {
  switch (kind) {
    case 'home':
    case 'offers':
      return ValkyrieHome(width: w, height: h);
    case 'run':
      return ValkyrieRun(width: w, height: h);
    case 'hub':
      return ValkyrieHub(width: w, height: h);
    case 'freight':
      return FreightBoard(width: w, height: h);
    case 'signup':
      return ValkyrieSignup(width: w, height: h);
    case 'admin':
      return AdminValkyries(width: w, height: h);
    case 'customer':
      return CustomerHub(width: w, height: h);
  }
  return Center(
    child: Text('No preview page called "$kind".',
        style: const TextStyle(color: Colors.white70)),
  );
}
