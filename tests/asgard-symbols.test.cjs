'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const data = require('../asgard-symbols-data.js');
const symbols = require('../asgard-symbols.js');
const dataScript = fs.readFileSync(path.join(root, 'asgard-symbols-data.js'), 'utf8');
const runtimeScript = fs.readFileSync(path.join(root, 'asgard-symbols.js'), 'utf8');
const phosphorEntries = data.icons.filter(entry => entry.source === 'phosphor');
const shardCount = Math.ceil(phosphorEntries.length / 128);
const shardName = part => 'part-' + String(part).padStart(2, '0') + '.json';
const shardMaps = Object.fromEntries(data.weights.map(({ id }) => [id,
  Array.from({ length: shardCount }, (_, part) => JSON.parse(
    fs.readFileSync(path.join(root, 'asgard-symbols', id, shardName(part)), 'utf8')))]));
const weightMaps = Object.fromEntries(data.weights.map(({ id }) => [id, Object.assign({}, ...shardMaps[id])]));

class Element {
  constructor(tag, namespace) { this.tagName = tag; this.namespaceURI = namespace || null; this.attributes = {}; this.children = []; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  appendChild(child) { this.children.push(child); return child; }
}

function browser(fetcher) {
  const calls = [];
  const context = vm.createContext({
    URL, Promise,
    document: {
      currentScript: { src: 'https://studio.example.test/sleipnir/asgard-symbols.js?v=editor' },
      baseURI: 'https://studio.example.test/sleipnir/post-editor.html',
      createElement: tag => new Element(tag),
      createElementNS: (namespace, tag) => new Element(tag, namespace)
    },
    fetch: async (url, options) => {
      calls.push({ url, options });
      const match = /\/asgard-symbols\/(\w+)\/part-(\d{2})\.json/.exec(url);
      const weight = match?.[1], part = match ? Number(match[2]) : null;
      if (fetcher) return fetcher({ url, options, weight, part, calls });
      const shard = shardMaps[weight]?.[part];
      return { ok: !!shard, json: async () => shard };
    }
  });
  vm.runInContext(dataScript, context, { filename: 'asgard-symbols-data.js' });
  vm.runInContext(runtimeScript, context, { filename: 'asgard-symbols.js' });
  return { symbols: context.AsgardSymbols, calls };
}

function ids(result) { return Array.from(result, entry => entry.id).sort(); }

test('the pinned catalog has every canonical icon in all six weights, without alias duplicates', () => {
  assert.equal(data.source.commit, '2b75f3ad12b420c9504ef05df8d2564a28f8500e');
  assert.equal(data.source.iconCount, 1512);
  assert.equal(data.source.variantCount, 9072);
  assert.deepEqual(data.weights.map(x => x.id), ['thin', 'light', 'regular', 'bold', 'fill', 'duotone']);
  assert.equal(new Set(symbols.icons.map(x => x.id)).size, symbols.icons.length);
  const canonical = symbols.icons.filter(x => x.source === 'phosphor').map(x => x.id.slice(3)).sort();
  assert.equal(canonical.length, 1512);
  for (const [weight, map] of Object.entries(weightMaps)) {
    assert.deepEqual(Object.keys(map).sort(), canonical, weight + ' must contain the complete canonical set');
    assert.equal(shardMaps[weight].length, 12);
    assert.equal(fs.existsSync(path.join(root, 'asgard-symbols', weight + '.json')), false, 'Large weight files are no longer shipped');
    shardMaps[weight].forEach((shard, part) => {
      const expected = phosphorEntries.slice(part * 128, (part + 1) * 128).map(entry => entry.id.slice(3));
      assert.deepEqual(Object.keys(shard), expected, weight + '/' + part + ' follows metadata order');
      assert.equal(Object.keys(shard).length, part === 11 ? 104 : 128);
    });
  }
  phosphorEntries.forEach((entry, index) => assert.equal(symbols.get(entry.id).part, Math.floor(index / 128)));
  assert.equal(symbols.get('ph:caduceus'), null, 'aliases are search terms, not duplicate entries');
  assert.ok(ids(symbols.search({ query: 'caduceus' })).includes('ph:asclepius'));
});

test('bundled integrity hashes and MIT license accompany the exact SVG catalog', () => {
  const notice = fs.readFileSync(path.join(root, 'asgard-symbols/NOTICE'), 'utf8');
  const license = fs.readFileSync(path.join(root, 'asgard-symbols/LICENSE'), 'utf8');
  assert.match(license, /Copyright \(c\) 2023 Phosphor Icons/);
  assert.match(license, /Permission is hereby granted, free of charge/);
  assert.ok(notice.includes(data.source.commit));
  for (const { id } of data.weights) {
    for (let part = 0; part < shardCount; part++) {
      const filename = id + '/' + shardName(part);
      const bytes = fs.readFileSync(path.join(root, 'asgard-symbols', filename));
      const hash = crypto.createHash('sha256').update(bytes).digest('hex');
      assert.ok(notice.includes(filename + ': ' + Object.keys(shardMaps[id][part]).length + ' icons; ' + bytes.length + ' bytes; ' + hash), filename + ' has its shipped checksum');
      assert.ok(bytes.length < 100000, filename + ' remains below the publication-size budget');
    }
  }
});

test('all catalog categories and reviewed existing artwork are valid and local', () => {
  const categoryIds = new Set(symbols.categories.map(x => x.id));
  for (const icon of symbols.icons) {
    assert.ok(icon.name.length > 0);
    assert.ok(icon.categories.length > 0);
    assert.ok(icon.categories.every(category => categoryIds.has(category)), icon.id);
    assert.ok(Array.isArray(icon.tags));
  }
  const artwork = symbols.search({ source: 'asgard' });
  assert.equal(artwork.length, 7);
  for (const icon of artwork) {
    assert.match(icon.asset, /^(asgard|home|launch)\/[a-z-]+\.webp$/);
    assert.ok(fs.existsSync(path.join(root, icon.asset)), icon.asset);
    assert.equal(icon.supportsWeights, false);
  }
  assert.ok(!artwork.some(x => x.asset === 'raven/runes.webp'), 'tiled texture is not presented as an action symbol');
});

test('search exposes the full library and broad equivalent action vocabularies', () => {
  assert.equal(symbols.search().length, 1519);
  assert.equal(symbols.search({ action: 'unrecognized' }).length, 1519);
  const share = ids(symbols.search({ action: 'share' }));
  assert.ok(share.length > 100);
  for (const id of ['ph:arrow-square-out', 'ph:arrow-bend-up-right', 'ph:arrow-right', 'ph:export', 'ph:share-network', 'ph:link', 'ph:paper-plane-tilt']) {
    assert.ok(share.includes(id), id + ' remains an offered sharing choice');
  }
  for (const query of ['share', 'send', 'pass along']) assert.deepEqual(ids(symbols.search({ query })), share);
  const replies = ids(symbols.search({ action: 'reply' }));
  assert.ok(replies.length > 40);
  for (const query of ['reply', 'chat', 'message']) assert.deepEqual(ids(symbols.search({ query })), replies);
  const keeps = ids(symbols.search({ action: 'keep' }));
  for (const query of ['keep', 'save', 'bookmark', 'favorite']) assert.deepEqual(ids(symbols.search({ query })), keeps);
  for (const id of ['ph:bookmark', 'ph:heart', 'ph:star', 'ph:archive']) assert.ok(keeps.includes(id));
  assert.deepEqual(ids(symbols.search({ query: 'your keeps' })), ids(symbols.search({ action: 'keeps' })));
  assert.ok(symbols.search({ query: 'PAPER-PLANE' }).length >= 3);
  assert.ok(symbols.search({ query: 'not-an-existing-symbol-phrase' }).length === 0);
  const filtered = symbols.search({ source: 'phosphor', category: 'arrows', action: 'share' });
  assert.ok(filtered.length > 50);
  assert.ok(filtered.every(x => x.source === 'phosphor' && x.categories.includes('arrows') && x.actions.includes('share')));
});

test('metadata and search are synchronous; weight/shard pairs load once locally and create independent DOM nodes', async () => {
  const runtime = browser();
  assert.equal(runtime.symbols.search().length, 1519);
  assert.equal(runtime.calls.length, 0);
  const [first, second] = await Promise.all([
    runtime.symbols.createIcon('ph:share-network', 'duotone'),
    runtime.symbols.createIcon('ph:share-network', 'duotone')
  ]);
  assert.equal(runtime.calls.length, 1);
  const sharePart = symbols.get('ph:share-network').part;
  assert.equal(runtime.calls[0].url, 'https://studio.example.test/sleipnir/asgard-symbols/duotone/' + shardName(sharePart) + '?v=2b75f3ad12b4');
  assert.equal(runtime.calls[0].options.credentials, 'same-origin');
  assert.notEqual(first, second);
  assert.notEqual(first.children[0], second.children[0]);
  assert.equal(first.tagName, 'svg');
  assert.equal(first.getAttribute('fill'), 'currentColor');
  assert.equal(first.getAttribute('viewBox'), '0 0 256 256');
  assert.ok(first.children.some(x => x.getAttribute('data-secondary') === 'true' && x.getAttribute('opacity') === '0.2'));
  first.children[0].setAttribute('fill', '#bada55');
  const third = await runtime.symbols.createIcon('ph:share-network', 'duotone');
  assert.equal(third.children[0].getAttribute('fill'), null, 'coloring a rendered icon must not contaminate later uses');
  assert.equal(runtime.calls.length, 1);
  await runtime.symbols.createIcon(phosphorEntries[sharePart * 128].id, 'duotone');
  assert.equal(runtime.calls.length, 1, 'Another icon in the same shard reuses its weight/shard fetch');
  const otherPart = sharePart === 0 ? 1 : 0;
  await runtime.symbols.createIcon(phosphorEntries[otherPart * 128].id, 'duotone');
  assert.equal(runtime.calls.length, 2, 'A different shard of the same weight loads independently');
  assert.equal(runtime.calls[1].url, 'https://studio.example.test/sleipnir/asgard-symbols/duotone/' + shardName(otherPart) + '?v=2b75f3ad12b4');
  await runtime.symbols.createIcon('ph:share-network', 'bold');
  assert.equal(runtime.calls.length, 3, 'Another weight uses its own shard cache');
});

test('every shipped SVG variant passes the same strict runtime geometry parser', async () => {
  const runtime = browser();
  for (const { id: weight } of data.weights) {
    for (const slug of Object.keys(weightMaps[weight])) {
      const node = await runtime.symbols.createIcon('ph:' + slug, weight);
      assert.ok(node && node.tagName === 'svg', weight + '/' + slug);
      assert.ok(node.children.length > 0);
      assert.ok(node.children.every(child => child.tagName === 'path'));
    }
  }
  assert.equal(runtime.calls.length, 72, '9,072 variants require only 72 local shard fetches');
  assert.equal(new Set(runtime.calls.map(call => call.url)).size, 72, 'Each weight/shard is fetched exactly once');
});

test('owned artwork returns images without a library fetch; unknown IDs cannot request a URL', async () => {
  const runtime = browser();
  const image = await runtime.symbols.createIcon('as:raven', 'bold');
  assert.equal(image.tagName, 'img');
  assert.equal(image.getAttribute('src'), 'https://studio.example.test/sleipnir/asgard/raven.webp');
  assert.equal(image.getAttribute('alt'), 'Golden Raven');
  assert.equal(await runtime.symbols.createIcon('ph:../../untrusted', 'regular'), null);
  assert.equal(await runtime.symbols.createIcon('https://remote.test/icon.svg', 'regular'), null);
  assert.equal(runtime.calls.length, 0);
});

test('the SVG allowlist rejects script, event, external-resource, and unsupported markup', async () => {
  const original = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M0,0L1,1"/></svg>';
  const invalid = [
    original.replace('<path', '<script>alert(1)</script><path'),
    original.replace('<path', '<path onclick="alert(1)"'),
    original.replace('<path d="M0,0L1,1"/>', '<image href="https://untrusted.test/pixel.svg"/>'),
    original.replace('<path d="M0,0L1,1"/>', '<foreignObject><div>untrusted</div></foreignObject>'),
    original.replace('fill="currentColor"', 'fill="url(https://untrusted.test)"'),
    original.replace('d="M0,0L1,1"', 'd="M0,0L1,1" style="filter:url(file:///private)"'),
    original.replace('d="M0,0L1,1"', 'd="javascript:alert(1)"'),
    original.replace('</svg>', '<g><path d="M0,0"/></g></svg>')
  ];
  const map = Object.assign({}, shardMaps.regular[0]);
  const slugs = Object.keys(map).slice(0, invalid.length);
  slugs.forEach((slug, index) => { map[slug] = invalid[index]; });
  const runtime = browser(async () => ({ ok: true, json: async () => map }));
  for (const slug of slugs) assert.equal(await runtime.symbols.createIcon('ph:' + slug, 'regular'), null, slug);
  assert.equal(runtime.calls.length, 1);
});

test('a failed shard load can be retried and malformed catalogs fail without unsafe DOM', async () => {
  const retry = browser(async ({ calls, weight, part }) => calls.length === 1
    ? { ok: false }
    : { ok: true, json: async () => shardMaps[weight][part] });
  assert.equal(await retry.symbols.createIcon('ph:heart', 'regular'), null);
  assert.equal((await retry.symbols.createIcon('ph:heart', 'regular')).tagName, 'svg');
  assert.equal(retry.calls.length, 2);
  const broken = browser(async () => ({ ok: true, json: async () => ({ heart: '<svg/>' }) }));
  assert.equal(await broken.symbols.createIcon('ph:heart', 'regular'), null);
});
