const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const code = fs.readFileSync(path.join(__dirname, '../raven-road-entry.js'), 'utf8');

function setup(hash = '#conversation') {
  const location = new URL('https://studio.example/sleipnir-studio-1120.html' + hash);
  const attributes = new Map();
  const frame = { getAttribute: key => attributes.get(key) ?? null, setAttribute: (key, value) => attributes.set(key, value), removeAttribute: key => attributes.delete(key) };
  const dialog = new EventTarget(); dialog.open = false;
  dialog.showModal = () => { dialog.open = true; };
  dialog.close = () => { dialog.open = false; dialog.dispatchEvent(new Event('close')); };
  const title = {};
  const document = new EventTarget();
  document.getElementById = id => ({ extDlg: dialog, extFrame: frame, extTitle: title })[id];
  const window = new EventTarget(); window.StudioKit = { ready: Promise.resolve(), previewCovered: false };
  const history = { pushState(_a, _b, url) { location.hash = url; }, replaceState(_a, _b, url) { location.hash = url; } };
  vm.runInNewContext(code, { window, document, location, history, URL });
  return { window, document, frame, dialog, title, location };
}

test('windshield opens existing workspace with media permissions and restores page on close', () => {
  const { window, frame, dialog, title, location } = setup();
  window.RavenWindshieldWorkspace.open();
  assert.equal(dialog.open, true);
  assert.equal(title.textContent, 'Raven · Windshield');
  assert.equal(new URL(frame.src).pathname, '/raven-road-studio.html');
  assert.equal(frame.getAttribute('allow'), 'microphone; camera');
  assert.equal(location.hash, '#raven-road');
  window.RavenWindshieldWorkspace.close();
  assert.equal(dialog.open, false);
  assert.equal(frame.getAttribute('allow'), null);
  assert.equal(location.hash, '#conversation');
});

test('deep link survives Studio startup changing the underlying screen hash', async () => {
  const { window, document, location, dialog } = setup('#raven-road');
  location.hash = '#dial';
  document.dispatchEvent(new Event('DOMContentLoaded'));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(dialog.open, true);
  assert.equal(location.hash, '#raven-road');
  window.RavenWindshieldWorkspace.close();
  assert.equal(location.hash, '#dial');
});
