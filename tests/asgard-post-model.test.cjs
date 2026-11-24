'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Model = require('../asgard-post-model.js');
const root = path.join(__dirname, '..');

test('symbol controls are optional on existing layouts and imported settings stay bounded', () => {
  for (const preset of Model.PRESETS) {
    for (const piece of Model.createDocument(preset.id).elements) {
      assert.equal(piece.symbolSource, 'none'); assert.equal(piece.symbolId, '');
    }
  }
  const symbol = Model.createElement('symbol', { symbolSource: 'library', symbolId: 'ph:share-network', symbolWeight: 'duotone', symbolFinish: 'hologram', symbolSize: 1e9, symbolScaleX: 0, symbolScaleY: Infinity, symbolOpacity: -1, symbolGlow: 99, symbolColor: 'url(javascript:alert(1))', symbolSrc: 'javascript:alert(1)' });
  assert.equal(symbol.type, 'symbol'); assert.equal(symbol.action, 'none'); assert.equal(symbol.text, '');
  assert.equal(symbol.symbolId, 'ph:share-network'); assert.equal(symbol.symbolWeight, 'duotone');
  assert.equal(symbol.symbolFinish, 'hologram'); assert.equal(symbol.symbolPlacement, 'only');
  assert.equal(symbol.symbolSize, 240); assert.equal(symbol.symbolScaleX, .25); assert.equal(symbol.symbolScaleY, 1);
  assert.equal(symbol.symbolOpacity, 0); assert.equal(symbol.symbolGlow, 40);
  assert.equal(symbol.symbolColor, '#d9effa'); assert.equal(symbol.symbolSrc, '');
  for (const id of ['ph:../../script', 'javascript:alert(1)', '<svg>', 'ph:bookmark\"']) assert.equal(Model.createElement('symbol', { symbolId: id }).symbolId, '');
});

test('blank is genuinely empty while every starting layout preserves Keep wording', () => {
  assert.deepEqual(Model.createDocument('blank').elements, []);
  for (const { id } of Model.PRESETS) {
    const doc = Model.createDocument(id);
    assert.deepEqual(doc.vocabulary, { keep: 'Keep', kept: 'Kept', keeps: 'Your Keeps' });
    assert.equal(doc.page.width, 390);
    assert.equal(doc.page.height, 844);
    assert.ok(doc.elements.length <= 150);
    if (id !== 'blank') {
      assert.ok(doc.elements.some(e => e.action === 'keep' && e.text === 'Keep'));
      assert.ok(doc.elements.some(e => e.action === 'keeps' && e.text === 'Your Keeps'));
      assert.ok(doc.elements.some(e => e.action === 'create' && e.text === 'Create Saga'));
      for (const postId of ['sample-1', 'sample-2']) {
        for (const action of ['appreciate', 'reply', 'share', 'keep']) assert.ok(doc.elements.some(e => e.postId === postId && e.action === action), id + '/' + postId + '/' + action);
      }
    }
  }
});

test('normalization sanitizes dangerous URL/CSS values and nonfinite imported numbers', () => {
  const input = JSON.parse('{"projectNote":{"owner":"Danny","__proto__":{"polluted":true}},"__proto__":{"polluted":true}}');
  input.page = { width: NaN, height: Infinity, contentHeight: -5, background: 'url(javascript:alert(1))', backgroundImage: 'javascript:alert(1)' };
  input.elements = [{ type: 'image', x: Infinity, y: NaN, width: -99, height: 1e12, opacity: 19, visible: 'false', src: 'java\nscript:alert(1)', poster: 'file:///etc/passwd', background: 'red;background:url(x)', fontFamily: 'Arial;position:fixed', action: 'delete-account', motion: 'arbitrary-keyframes', text: '<script>stay text</script>', contrast: Infinity, grayscale: 300 }];
  input.unknownMetadata = { nested: ['keep this', 42] };
  const out = Model.normalize(input), e = out.elements[0];
  assert.equal(out.page.width, 390);
  assert.equal(out.page.height, 844);
  assert.equal(out.page.contentHeight, 844);
  assert.equal(out.page.background, '#080e18');
  assert.equal(out.page.backgroundImage, '');
  assert.equal(e.src, ''); assert.equal(e.poster, '');
  assert.equal(e.width, 1); assert.equal(e.height, 12000); assert.equal(e.opacity, 1);
  assert.equal(e.x, 24); assert.equal(e.y, 180); assert.equal(e.contrast, 100); assert.equal(e.grayscale, 100);
  assert.equal(e.visible, true); assert.equal(e.action, 'none'); assert.equal(e.motion, 'none');
  assert.equal(e.fontFamily, 'system-ui, sans-serif');
  assert.equal(e.text, '<script>stay text</script>');
  assert.deepEqual(out.unknownMetadata, { nested: ['keep this', 42] });
  assert.deepEqual(out.projectNote, { owner: 'Danny' });
  assert.equal(Object.hasOwn(out, '__proto__'), false);
  assert.equal({}.polluted, undefined);
  for (const field of Object.values(e)) if (typeof field === 'number') assert.ok(Number.isFinite(field));
});

test('safe media paths support hosted, relative and raster data images without executable protocols', () => {
  for (const value of ['bg/bg04.jpg', './asgard/sky.jpeg', '../assets/photo.png', '/assets/photo.webp', 'https://example.com/photo.png?v=2', 'http://localhost:3000/video.mp4', 'data:image/png;base64,aGVsbG8=']) assert.equal(Model.safeURL(value), value);
  for (const value of ['javascript:alert(1)', 'file:///tmp/pic.png', 'data:text/html;base64,aA==', 'data:image/svg+xml,<svg onload=alert(1)>', 'ftp://example.com/a', '//evil.test/pic.jpg', '\\evil.test\\pic.jpg', 'https://user:secret@example.com/pic.jpg', 'https://example.com/\u0000image']) assert.equal(Model.safeURL(value), '', value);
});

test('temporary upload blobs are restricted to the current editor origin and UUID paths', () => {
  const scope = { location: { origin: 'https://studio.example' }, URL, crypto: require('node:crypto').webcrypto };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'asgard-post-model.js'), 'utf8'), scope);
  const safe = 'blob:https://studio.example/a073f355-8aa8-4c97-b6ea-ae71e99f2292';
  assert.equal(scope.AsgardPostModel.safeURL(safe), safe);
  assert.equal(scope.AsgardPostModel.normalize({ elements: [{ type: 'image', src: safe }] }).elements[0].src, safe);
  for (const value of [safe.replace('studio.example', 'elsewhere.example'), 'blob:null/a073f355-8aa8-4c97-b6ea-ae71e99f2292', safe + '?script=1', 'blob:https://studio.example/not-a-uuid']) assert.equal(scope.AsgardPostModel.safeURL(value), '');
});

test('all preset and default media references exist in this repository', () => {
  const elements = Model.PRESETS.flatMap(p => Model.createDocument(p.id).elements).concat(Model.TYPES.map(t => Model.createElement(t.id)));
  const paths = new Set(elements.flatMap(e => [e.src, e.poster]).filter(Boolean));
  assert.ok(paths.size >= 5);
  for (const asset of paths) {
    assert.equal(Model.safeURL(asset), asset);
    assert.ok(!asset.includes('://'), 'Samples should use the existing local artwork: ' + asset);
    assert.ok(fs.statSync(path.join(root, asset)).isFile(), asset);
  }
});

test('duplicate IDs are repaired, layer count is capped, and first valid IDs remain stable', () => {
  const entries = Array.from({ length: 175 }, (_, i) => ({ id: i < 3 ? 'same-id' : 'layer-' + i, type: i === 4 ? 'script' : 'text' }));
  const doc = Model.normalize({ elements: entries });
  assert.equal(doc.elements.length, 150);
  assert.equal(doc.elements[0].id, 'same-id');
  assert.equal(new Set(doc.elements.map(e => e.id)).size, 150);
  assert.equal(doc.elements[4].type, 'text');
  assert.equal(Model.normalize(doc).elements[0].id, 'same-id');
});

test('presets and snapshots are independent, contain complete defaults, and fit the initial page', () => {
  const first = Model.createDocument('content'), original = Model.clone(first), second = Model.createDocument('content');
  first.elements[0].text = 'Changed'; first.page.title = 'Changed'; first.vocabulary.keep = 'Changed';
  assert.equal(second.elements[0].text, 'Gathering');
  assert.equal(original.elements[0].text, 'Gathering');
  assert.equal(second.page.title, 'Gathering'); assert.equal(second.vocabulary.keep, 'Keep');
  assert.notEqual(first.elements[0].id, second.elements[0].id);
  const layouts = Model.PRESETS.filter(p => p.id !== 'blank').map(p => Model.createDocument(p.id));
  assert.notDeepEqual(layouts[0].elements.map(e => [e.type, e.x, e.y, e.width, e.height]), layouts[1].elements.map(e => [e.type, e.x, e.y, e.width, e.height]));
  for (const doc of layouts) for (const e of doc.elements) {
    for (const key of Object.keys(Model.FIELD_SCHEMA)) assert.ok(Object.hasOwn(e, key), key);
    assert.ok(e.x >= 0 && e.y >= 0 && e.x + e.width <= doc.page.width, e.name + ' fits horizontally');
    assert.ok(e.y + e.height <= doc.page.contentHeight, e.name + ' fits vertically');
    if (['image', 'avatar'].includes(e.type)) assert.equal(e.fit, 'contain');
    if (e.type === 'button') assert.ok(e.height >= 44);
  }
});

test('cloning and normalization leave incoming state untouched and tolerate circular metadata', () => {
  const input = { projectNote: { title: 'Preserve this' }, elements: [{ id: 'author', type: 'text', text: 'Author' }] };
  input.projectNote.self = input.projectNote;
  const result = Model.normalize(input);
  assert.equal(result.projectNote.title, 'Preserve this');
  assert.equal(Object.hasOwn(result.projectNote, 'self'), false);
  result.elements[0].text = 'Changed';
  assert.equal(input.elements[0].text, 'Author');
  assert.equal(input.projectNote.self, input.projectNote);
});

test('user media can be masked to an edge while all starting layouts stay clean', () => {
  assert.deepEqual(Model.PRESETS.map(p => p.id), ['content', 'conversation', 'minimal', 'blank']);
  for (const preset of Model.PRESETS) {
    assert.ok(Model.createDocument(preset.id).elements.every(e => e.effectMask === 'none'));
  }
  const edge = Model.createElement('video', { effectMask: 'edge', playbackRate: 999, edgeWidth: -1, edgeSoftness: NaN, edgeStyle: 'smoke' });
  assert.equal(edge.effectMask, 'edge'); assert.equal(edge.playbackRate, 3);
  assert.equal(edge.edgeSoftness, 0); assert.equal(edge.edgeWidth, 1);
  assert.equal(Object.hasOwn(edge, 'edgeStyle'), false);
  assert.equal(Model.createElement('image', { effectMask: 'arbitrary-css' }).effectMask, 'none');
  assert.equal(Model.createElement('video', { playbackRate: .001 }).playbackRate, .25);
});

test('fourteen optional frame choices preserve content and never apply themselves to page presets', () => {
  const expected = ['none', 'line', 'double', 'corners', 'etched', 'silver', 'bronze', 'stone', 'obsidian', 'glass', 'frosted', 'braid', 'cyan', 'gold'];
  assert.deepEqual(Model.FRAMES.map(frame => frame.id), expected);
  assert.deepEqual(Model.FIELD_SCHEMA.frameStyle.options, expected);
  for (const preset of Model.PRESETS) assert.ok(Model.createDocument(preset.id).elements.every(element => element.frameStyle === 'none'));
  const picture = Model.createElement('image', { id: 'my-photo', src: 'asgard/sky.jpeg', text: 'My caption', background: '#080e18', x: 35, y: 72, width: 300, height: 360, action: 'keep' });
  for (const frame of Model.FRAMES) {
    assert.equal(frame.values.frameStyle, frame.id);
    for (const key of ['src', 'poster', 'text', 'background', 'opacity', 'positionMode', 'x', 'y', 'width', 'height', 'action']) assert.equal(Object.hasOwn(frame.values, key), false, frame.id + ' preserves ' + key);
    const styled = Model.normalize({ elements: [{ ...picture, ...frame.values }] }).elements[0];
    assert.equal(styled.frameStyle, frame.id);
    for (const key of ['id', 'src', 'text', 'background', 'x', 'y', 'width', 'height', 'action']) assert.equal(styled[key], picture[key], frame.id + '/' + key);
    for (const key of Object.keys(frame.values)) assert.deepEqual(styled[key], frame.values[key], frame.id + ' has a valid ' + key);
  }
  assert.equal(Model.createElement('image', { frameStyle: 'javascript-frame' }).frameStyle, 'none');
});

test('fixed placement and explicit box or silhouette shadows are optional and safely normalized', () => {
  for (const preset of Model.PRESETS) for (const element of Model.createDocument(preset.id).elements) {
    assert.equal(element.positionMode, 'page');
    assert.equal(element.shadowMode, 'none');
  }
  const button = Model.createElement('button', { positionMode: 'fixed', shadowMode: 'silhouette', shadowOpacity: .72, shadowX: 4, shadowY: 18, shadowBlur: 12 });
  assert.equal(button.positionMode, 'fixed');
  assert.equal(button.shadowMode, 'silhouette'); assert.equal(button.shadowOpacity, .72);
  assert.equal(button.shadowY, 18); assert.equal(button.shadowBlur, 12);
  const invalid = Model.createElement('image', { positionMode: 'arbitrary-css', shadowMode: 'url(script)', shadowOpacity: Infinity });
  assert.equal(invalid.positionMode, 'page'); assert.equal(invalid.shadowMode, 'none'); assert.equal(invalid.shadowOpacity, .5);
  assert.equal(Model.createElement('shape', { shadowMode: 'box', shadowOpacity: 99 }).shadowOpacity, 1);
  for (const frame of Model.FRAMES) assert.equal(frame.values.shadowMode, frame.values.shadowBlur > 0 ? 'box' : 'none');
});

test('page transparency controls only the backplate and backdrop URLs are validated', () => {
  for (const preset of Model.PRESETS) {
    const document = Model.createDocument(preset.id);
    assert.equal(document.page.backgroundOpacity, 1);
    assert.equal(document.page.previewBackdrop, 'asgard/sky.jpeg');
    assert.equal(document.page.previewBackdropFit, 'cover');
  }
  const original = Model.createDocument('content');
  const transparent = Model.normalize({ ...original, page: { ...original.page, backgroundOpacity: 0, previewBackdrop: 'bg/bg04.jpg', previewBackdropFit: 'contain' } });
  assert.equal(transparent.page.backgroundOpacity, 0);
  assert.equal(transparent.page.background, original.page.background);
  assert.equal(transparent.page.previewBackdrop, 'bg/bg04.jpg');
  assert.equal(transparent.page.previewBackdropFit, 'contain');
  assert.deepEqual(transparent.elements, original.elements, 'Backplate transparency must not fade text or media pieces');
  const unsafe = Model.normalize({ page: { backgroundOpacity: NaN, previewBackdrop: 'javascript:alert(1)', previewBackdropFit: 'url(script)' } });
  assert.equal(unsafe.page.backgroundOpacity, 1); assert.equal(unsafe.page.previewBackdrop, ''); assert.equal(unsafe.page.previewBackdropFit, 'cover');
  assert.equal(Model.normalize({ page: { backgroundOpacity: 9, previewBackdrop: 'file:///private/photo.png' } }).page.backgroundOpacity, 1);
  assert.equal(Model.normalize({ page: { previewBackdrop: 'file:///private/photo.png' } }).page.previewBackdrop, '');
  assert.equal(Model.normalize({ page: { backgroundOpacity: -3 } }).page.backgroundOpacity, 0);
});
