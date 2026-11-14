import 'dart:convert';
import 'dart:io';

import 'contract_under_test.dart';

int checks = 0;
void check(bool condition, String name) {
  checks++;
  if (!condition) throw StateError('FAILED: $name');
}

void rejects(void Function() action, String name) {
  try {
    action();
  } on FormatException {
    checks++;
    return;
  }
  throw StateError('FAILED: $name did not reject the input');
}

void main() {
  const store = '189581c9-d728-4e5d-9e02-ae4de19a15af';
  const product = '9d5102f3-acd7-48e7-adc8-fc4156aacc66';
  const release = '11111111-2222-4333-8444-555555555555';
  final raven = asgardApprovedRuntimeUri(page: 'raven', designId: 'raven');
  check(
    raven.path == '/sleipnir-ai/runtime/transfer-20261114-v1/app-runtime.html',
    'pin immutable renderer build',
  );
  check(raven.queryParameters['mode'] == 'approved', 'production mode');
  check(!raven.toString().contains('preview'), 'no draft preview parameter');
  for (final p in asgardStudioPages.where(
    (p) => !{'store', 'browse', 'raven', 'navigation'}.contains(p),
  )) {
    final u = asgardApprovedRuntimeUri(page: p, designId: 'page_$p');
    check(u.queryParameters['design'] == 'page_$p', '$p mapping');
  }
  check(
    asgardApprovedRuntimeUri(
          page: 'navigation',
          designId: 'navigation',
        ).queryParameters['design'] ==
        'navigation',
    'navigation mapping',
  );
  final storeUri = asgardApprovedRuntimeUri(
    page: 'store',
    designId: 'page_store_$store',
    storeId: store,
    releaseId: release,
  );
  check(storeUri.queryParameters['release'] == release, 'pin approved release');
  check(storeUri.queryParameters['store'] == store, 'store identity');
  for (final type in [
    'grocery',
    'fast_food',
    'restaurant',
    'retail',
    'valhalla',
  ]) {
    final uri = asgardApprovedRuntimeUri(
      page: 'browse',
      designId: 'page_browse_$type',
    );
    check(uri.queryParameters['type'] == type, 'browse type $type');
  }
  rejects(
    () => asgardApprovedRuntimeUri(page: 'home', designId: 'raven'),
    'cross page design',
  );
  rejects(
    () =>
        asgardApprovedRuntimeUri(page: 'store', designId: 'page_store_$store'),
    'missing store',
  );
  rejects(
    () => asgardApprovedRuntimeUri(
      page: 'raven',
      designId: 'raven',
      storeId: store,
    ),
    'unexpected store',
  );
  rejects(
    () => asgardApprovedRuntimeUri(
      page: 'raven',
      designId: 'raven',
      releaseId: 'latest?mode=preview',
    ),
    'release injection',
  );
  rejects(
    () => asgardApprovedRuntimeUri(
      page: 'browse',
      designId: 'page_browse_../../drafts',
    ),
    'browse injection',
  );
  rejects(
    () =>
        asgardApprovedRuntimeUri(page: 'raven&mode=preview', designId: 'raven'),
    'page injection',
  );
  check(
    asgardAllowsNavigation(raven, raven.toString(), true),
    'initial runtime navigation',
  );
  check(
    asgardAllowsNavigation(
      raven,
      raven.resolve('pages.html?runtime=1').toString(),
      false,
    ),
    'renderer iframe',
  );
  check(
    !asgardAllowsNavigation(
      raven,
      raven.resolve('pages.html').toString(),
      true,
    ),
    'block top-level editor',
  );
  for (final u in [
    'https://evil.example/runtime.html',
    'https://olympusmajoris-star.github.io.evil.example/sleipnir-ai/app-runtime.html',
    'javascript:alert(1)',
    'file:///etc/passwd',
    'http://olympusmajoris-star.github.io/sleipnir-ai/app-runtime.html',
    'https:evil',
    'https://user:password@olympusmajoris-star.github.io/sleipnir-ai/pages.html',
  ]) {
    check(!asgardAllowsNavigation(raven, u, true), 'block navigation $u');
  }
  check(
    !asgardAllowsNavigation(
      raven,
      raven
          .replace(
            queryParameters: {...raven.queryParameters, 'mode': 'preview'},
          )
          .toString(),
      true,
    ),
    'block runtime query change',
  );
  check(
    !asgardAllowsNavigation(
      raven,
      raven.resolve('workshop.html').toString(),
      false,
    ),
    'block editor iframe',
  );
  check(
    asgardBridgeEvent(
          jsonEncode({'v': 1, 'type': 'ready', 'design': 'raven'}),
        )?['type'] ==
        'ready',
    'ready event',
  );
  check(
    asgardBridgeEvent('{"v":1,"type":"ready"}') == null,
    'require ready design identity',
  );
  check(
    asgardBridgeEvent(
          jsonEncode({'v': 1, 'type': 'navigate', 'target': 'convo'}),
        )?['storeId'] ==
        '',
    'navigate event',
  );
  check(
    asgardBridgeEvent(
          jsonEncode({
            'v': 1,
            'type': 'navigate',
            'target': 'store',
            'storeId': store,
          }),
        )?['storeId'] ==
        store,
    'store navigation',
  );
  check(
    asgardBridgeEvent(
          jsonEncode({
            'v': 1,
            'type': 'navigate',
            'target': 'browse',
            'pageType': 'retail',
          }),
        )?['pageType'] ==
        'retail',
    'preserve browse type',
  );
  check(
    asgardBridgeEvent(
          jsonEncode({
            'v': 1,
            'type': 'navigate',
            'target': 'browse',
            'pageType': 'bad',
          }),
        ) ==
        null,
    'reject invalid browse type',
  );
  check(
    asgardBridgeEvent(
          jsonEncode({'v': 1, 'type': 'navigate', 'target': 'browse'}),
        ) ==
        null,
    'require browse type',
  );
  check(
    asgardBridgeEvent(
          jsonEncode({
            'v': 1,
            'type': 'product',
            'productId': product,
            'storeId': store,
          }),
        )?['productId'] ==
        product,
    'product event',
  );
  check(
    asgardBridgeEvent(
          jsonEncode({'v': 1, 'type': 'contact', 'contactId': 'real-user-1'}),
        )?['contactId'] ==
        'real-user-1',
    'contact event',
  );
  for (final value in [
    null,
    [],
    {'v': 2, 'type': 'ready'},
    {'v': 1, 'type': 'navigate', 'target': 'https://evil.example'},
    {'v': 1, 'type': 'navigate', 'target': 'store'},
    {'v': 1, 'type': 'product', 'productId': product},
    {'v': 1, 'type': 'contact', 'contactId': '<script>'},
    {'v': 1, 'type': 'eval', 'code': 'alert(1)'},
  ]) {
    check(
      asgardBridgeEvent(jsonEncode(value)) == null,
      'reject malformed event $value',
    );
  }
  check(asgardBridgeEvent('bad json') == null, 'malformed JSON');
  check(asgardBridgeEvent('x' * 16385) == null, 'oversized bridge');
  check(
    asgardContacts(null).isEmpty &&
        asgardContacts('').isEmpty &&
        asgardContacts('[]').isEmpty,
    'no demo contact fallback',
  );
  final people = asgardContacts(
    jsonEncode([
      {
        'id': 'real-user-1',
        'name': 'Test',
        'face': 'javascript:alert(1)',
        'bust': 'https://example.com/person.png',
        'counts': {'friends': -5, 'followers': 12.5, 'viewers': 99999999999},
        'access_token': 'must-not-pass',
      },
    ]),
  );
  check(people.single['face'] == '', 'reject unsafe image URL');
  check(
    people.single['bust'] == 'https://example.com/person.png',
    'keep secure image URL',
  );
  check(
    !people.single.containsKey('access_token'),
    'strip unknown contact fields',
  );
  check(
    people.single['counts']['friends'] == 0 &&
        people.single['counts']['followers'] == 12 &&
        people.single['counts']['viewers'] == 1000000000,
    'bound contact counts',
  );
  rejects(() => asgardContacts('{}'), 'non-list contacts');
  rejects(() => asgardContacts('[{}]'), 'missing contact identity');
  rejects(() => asgardContacts('x' * 1048577), 'oversized contacts');
  final source = File('asgard_studio_surface.dart').readAsStringSync();
  check(!source.contains("from('studio_designs')"), 'no studio draft read');
  check(
    !source.contains('this.preview') && !source.contains('this.runtimeUrl'),
    'no production preview override',
  );
  print('PASS: $checks production contract checks.');
}
