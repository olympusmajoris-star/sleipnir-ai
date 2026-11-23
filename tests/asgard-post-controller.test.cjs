'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Model = require('../asgard-post-model.js');
const { createController, DESIGN_ID, STORAGE_KEY } = require('../asgard-post-controller.js');

const FIRST_VERSION = '2026-11-23T18:00:00.000Z';
const LATER_VERSION = '2026-11-23T19:00:00.000Z';
const CONFIG = { url: 'https://studio-backend.invalid', key: 'test-public-key' };
const copy = value => JSON.parse(JSON.stringify(value));
const response = (data, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => copy(data) });
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(String(key), String(value)),
    removeItem: key => values.delete(key),
  };
}
function sharedRow(document = Model.createDocument('content'), version = FIRST_VERSION, extraData = {}) {
  return { id: DESIGN_ID, page: 'Asgard/posts', data: { ...extraData, schema: 1, kind: 'asgard-post-page', document: copy(document) }, updated_at: version };
}
function fixture(t, options = {}) {
  let row = options.row ? copy(options.row) : null, intercept = null;
  const calls = [], storage = options.storage || memoryStorage();
  const apply = call => {
    const url = new URL(call.url);
    assert.equal(url.origin, CONFIG.url, 'Every request uses the configured mock backend');
    assert.equal(url.pathname, '/rest/v1/studio_designs');
    if (call.method === 'GET') {
      assert.equal(url.searchParams.get('id'), 'eq.' + DESIGN_ID);
      return response(row ? [row] : []);
    }
    if (call.method === 'POST') {
      if (row) return response({ message: 'duplicate key' }, 409);
      row = copy(call.body); return response([row], 201);
    }
    if (call.method === 'PATCH') {
      assert.equal(url.searchParams.get('id'), 'eq.' + DESIGN_ID);
      const guard = url.searchParams.get('updated_at');
      const expected = row?.updated_at ? 'eq.' + row.updated_at : 'is.null';
      if (!row || guard !== expected) return response([]);
      row = { ...row, ...copy(call.body) }; return response([row]);
    }
    throw Error('Unexpected method: ' + call.method);
  };
  const fetch = async (url, init = {}) => {
    const call = { url, method: init.method || 'GET', headers: { ...init.headers }, body: init.body ? JSON.parse(init.body) : null };
    calls.push(call);
    return intercept ? intercept(call, () => apply(call)) : apply(call);
  };
  const C = createController({ model: Model, storage, fetch, config: CONFIG, now: () => Date.parse('2026-11-23T20:00:00.000Z') });
  t.after(() => C.dispose());
  return {
    C, storage, calls,
    get row() { return row && copy(row); },
    setRow(value) { row = value ? copy(value) : null; },
    intercept(fn) { intercept = fn; },
    get writes() { return calls.filter(call => call.method !== 'GET'); },
    draft() { return JSON.parse(storage.getItem(STORAGE_KEY)); },
  };
}

test('editing, adding, frames, history, mode changes and leaving never write shared state before Save', async t => {
  const h = fixture(t, { row: sharedRow() }), { C } = h;
  assert.equal(h.calls.length, 0, 'Constructing the workspace must not fetch or save');
  await C.load();
  const originalShared = h.row;
  const image = C.doc.elements.find(e => e.type === 'image');
  C.select(image.id); C.updateElement(image.id, { x: 40, positionMode: 'fixed', shadowMode: 'silhouette', shadowOpacity: .6 });
  C.applyFrame('silver');
  C.add('button'); C.duplicate(C.selectedId); C.reorder(C.selectedId, 'back');
  C.undo(); C.redo(); C.updatePage({ padding: 24 }); C.checkpoint();
  C.setMode('try'); C.setMode('edit'); C.select(null);
  C.applyPreset('blank'); assert.equal(C.doc.elements.length, 0); C.undo();
  C.dispose();
  assert.equal(h.writes.length, 0);
  assert.equal(h.calls.length, 1, 'Only the explicit initial saved-design read is needed');
  assert.deepEqual(h.row, originalShared);
  assert.equal(h.draft().dirty, true);
  assert.ok(h.draft().document.elements.length > 0);
});

test('first Save creates only the isolated design row without upsert semantics', async t => {
  const h = fixture(t), { C } = h;
  await C.load();
  C.updatePage({ title: 'My Gathering' });
  assert.equal(await C.save(), true);
  assert.equal(h.writes.length, 1);
  const call = h.writes[0], url = new URL(call.url);
  assert.equal(call.method, 'POST');
  assert.equal(call.body.id, DESIGN_ID);
  assert.equal(call.body.page, 'Asgard/posts');
  assert.equal(call.body.data.document.page.title, 'My Gathering');
  assert.equal(url.searchParams.has('on_conflict'), false);
  assert.equal(call.headers.Prefer, 'return=representation');
  assert.ok(!/resolution|merge-duplicates/i.test(call.headers.Prefer));
  assert.equal(C.dirty, false);
  assert.equal(h.draft().baseVersion, h.row.updated_at);
  assert.equal(h.draft().dirty, false);
});

test('a loaded row is saved with its exact version guard and unrelated row metadata survives', async t => {
  const h = fixture(t, { row: sharedRow(undefined, FIRST_VERSION, { authoredBy: 'Danny', extension: { retain: true } }) });
  await h.C.load(); h.C.updatePage({ title: 'Edited title' });
  assert.equal(await h.C.save(), true);
  const call = h.writes[0], url = new URL(call.url);
  assert.equal(call.method, 'PATCH');
  assert.equal(url.searchParams.get('id'), 'eq.' + DESIGN_ID);
  assert.equal(url.searchParams.get('updated_at'), 'eq.' + FIRST_VERSION);
  assert.equal(url.searchParams.has('on_conflict'), false);
  assert.equal(Object.hasOwn(call.body, 'id'), false, 'PATCH cannot change the target identity');
  assert.equal(h.row.data.authoredBy, 'Danny');
  assert.deepEqual(h.row.data.extension, { retain: true });
  assert.equal(h.row.data.document.page.title, 'Edited title');
});

test('an empty guarded PATCH response rejects a stale save and retains the complete draft', async t => {
  const h = fixture(t, { row: sharedRow() }), { C } = h;
  await C.load(); C.updatePage({ title: 'My unsaved title' });
  const expectedDraft = copy(C.doc);
  const competing = sharedRow(Model.createDocument('minimal'), LATER_VERSION);
  h.setRow(competing);
  assert.equal(await C.save(), false);
  assert.equal(C.conflict, true); assert.equal(C.dirty, true); assert.equal(C.saving, false);
  assert.match(C.status, /draft is preserved/i);
  assert.deepEqual(C.doc, expectedDraft);
  assert.deepEqual(h.draft().document, expectedDraft);
  assert.equal(h.draft().baseVersion, FIRST_VERSION);
  assert.deepEqual(h.row, competing);
  assert.equal(h.writes.length, 1);
});

test('edits made during an outstanding Save remain dirty after that earlier snapshot is saved', async t => {
  const h = fixture(t, { row: sharedRow() }), { C } = h;
  await C.load(); C.updatePage({ title: 'Snapshot sent to Save' });
  const gate = deferred();
  h.intercept((call, apply) => call.method === 'PATCH' ? gate.promise.then(apply) : apply());
  const saving = C.save();
  assert.equal(C.saving, true);
  assert.equal(h.writes.length, 1);
  C.updatePage({ title: 'Newer live edit' });
  gate.resolve(); assert.equal(await saving, true);
  assert.equal(h.row.data.document.page.title, 'Snapshot sent to Save');
  assert.equal(C.doc.page.title, 'Newer live edit');
  assert.equal(C.dirty, true); assert.match(C.status, /newer changes.*draft/i);
  assert.equal(h.draft().document.page.title, 'Newer live edit');
  assert.equal(JSON.parse(h.draft().savedSignature).page.title, 'Snapshot sent to Save');
  h.intercept(null);
  assert.equal(await C.save(), true);
  assert.equal(C.dirty, false);
  assert.equal(h.row.data.document.page.title, 'Newer live edit');
});

test('a restored dirty device draft wins initial loading and a stale base cannot overwrite shared work', async t => {
  const saved = Model.createDocument('content'), local = Model.clone(saved);
  local.page.title = 'Device draft title';
  const selectedId = local.elements.find(e => e.type === 'image').id;
  const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify({ document: local, baseVersion: FIRST_VERSION, savedSignature: JSON.stringify(saved), dirty: true, selectedId }) });
  const remote = sharedRow(Model.createDocument('conversation'), LATER_VERSION);
  const h = fixture(t, { row: remote, storage }), { C } = h;
  await C.load();
  assert.equal(C.doc.page.title, 'Device draft title');
  assert.equal(C.selectedId, selectedId); assert.equal(C.dirty, true); assert.equal(C.conflict, true);
  assert.equal(h.writes.length, 0);
  assert.equal(await C.save(), false);
  assert.deepEqual(h.row, remote);
  assert.equal(h.draft().document.page.title, 'Device draft title');
  assert.equal(new URL(h.writes[0].url).searchParams.get('updated_at'), 'eq.' + FIRST_VERSION);
});

test('an edit made while the first read is pending is not overwritten by the arriving shared design', async t => {
  const h = fixture(t, { row: sharedRow() }), gate = deferred();
  h.intercept((call, apply) => call.method === 'GET' ? gate.promise.then(apply) : apply());
  const loading = h.C.load();
  h.C.updatePage({ title: 'Typed while loading' });
  const initialDraft = copy(h.C.doc);
  gate.resolve(); await loading;
  assert.deepEqual(h.C.doc, initialDraft);
  assert.equal(h.C.loading, false); assert.equal(h.C.dirty, true); assert.equal(h.C.conflict, true);
  assert.equal(h.writes.length, 0);
  assert.equal(h.draft().document.page.title, 'Typed while loading');
});

test('continuous property changes form one undo checkpoint and locked controls do not bypass locks', async t => {
  const h = fixture(t, { row: sharedRow() }), { C } = h;
  await C.load();
  const initial = C.doc.elements.find(e => e.type === 'image'), id = initial.id, original = copy(initial);
  C.updateElement(id, { x: 41, width: 310 }, { history: false });
  C.updateElement(id, { x: 48, width: 300 }, { history: false });
  C.checkpoint();
  C.undo(); assert.deepEqual(C.doc.elements.find(e => e.id === id), original);
  assert.equal(C.dirty, false); assert.equal(C.canRedo, true);
  C.redo(); assert.equal(C.doc.elements.find(e => e.id === id).x, 48);
  C.select(id); C.applyFrame('bronze');
  const framed = C.doc.elements.find(e => e.id === id);
  assert.equal(framed.frameStyle, 'bronze'); assert.equal(framed.src, original.src); assert.equal(framed.x, 48);
  C.updateElement(id, { locked: true });
  C.updateElement(id, { x: 200 }); C.remove(id); C.reorder(id, 'front');
  assert.equal(C.doc.elements.find(e => e.id === id).x, 48);
  C.updateElement(id, { visible: false });
  assert.equal(C.doc.elements.find(e => e.id === id).visible, false);
  C.updateElement(id, { locked: false, visible: true });
  C.duplicate(id); const duplicate = C.doc.elements.find(e => e.id === C.selectedId);
  assert.notEqual(duplicate.id, id); assert.equal(duplicate.src, original.src); assert.equal(duplicate.x, 64);
  C.remove(duplicate.id); assert.equal(C.selectedId, null);
  assert.equal(h.writes.length, 0);
});

test('import normalizes unsafe fields, preserves metadata, stays local, and can be undone', async t => {
  const h = fixture(t, { row: sharedRow() }), { C } = h;
  await C.load(); const before = copy(C.doc);
  const imported = { version: 1, page: { title: 'Imported design', width: -900, backgroundImage: 'javascript:alert(1)' }, elements: [{ id: 'same', type: 'image', src: 'file:///private/photo.png', x: 1e99 }, { id: 'same', type: 'button', action: 'run-script', text: 'Keep', opacity: -1 }], sourceNote: { retain: true } };
  const json = JSON.stringify(imported);
  await C.importJSON({ size: Buffer.byteLength(json), text: async () => json });
  assert.equal(C.doc.page.title, 'Imported design'); assert.equal(C.doc.page.width, 240);
  assert.equal(C.doc.page.backgroundImage, ''); assert.equal(C.doc.elements[0].src, '');
  assert.equal(C.doc.elements[0].x, 4000); assert.equal(C.doc.elements[1].action, 'none');
  assert.equal(C.doc.elements[1].opacity, 0);
  assert.notEqual(C.doc.elements[0].id, C.doc.elements[1].id);
  assert.deepEqual(C.doc.sourceNote, { retain: true });
  assert.equal(C.dirty, true); assert.equal(h.writes.length, 0);
  C.undo(); assert.deepEqual(C.doc, before);
  const exported = C.exportJSON(); assert.deepEqual(JSON.parse(exported), before);
});

test('explicit reload can be undone to recover the previous draft without any shared writes', async t => {
  const h = fixture(t, { row: sharedRow() }), { C } = h;
  await C.load(); C.updatePage({ title: 'Draft before reload' });
  const local = copy(C.doc), next = Model.createDocument('minimal'); next.page.title = 'Current shared title';
  h.setRow(sharedRow(next, LATER_VERSION));
  await C.reload();
  assert.equal(C.doc.page.title, 'Current shared title'); assert.equal(C.dirty, false);
  C.undo(); assert.deepEqual(C.doc, local); assert.equal(C.dirty, true);
  assert.equal(h.writes.length, 0);
});

test('a racing create returns conflict rather than silently upserting someone else’s new design', async t => {
  const h = fixture(t), { C } = h;
  await C.load(); C.updatePage({ title: 'Draft for new design' });
  const another = sharedRow(Model.createDocument('minimal'), LATER_VERSION); h.setRow(another);
  assert.equal(await C.save(), false);
  assert.equal(h.writes[0].method, 'POST'); assert.equal(C.conflict, true); assert.equal(C.dirty, true);
  assert.deepEqual(h.row, another);
  assert.equal(h.draft().document.page.title, 'Draft for new design');
});

test('temporary media on either page backplate or backdrop cannot be saved or exported', async t => {
  const h = fixture(t, { row: sharedRow() }), { C } = h;
  await C.load();
  const baseline = copy(C.doc), shared = h.row;
  const temporary = 'blob:https://studio.example/a073f355-8aa8-4c97-b6ea-ae71e99f2292';
  // The browser model accepts this editor-origin URL during upload. Put it into
  // the document directly here because the Node test runner has no window origin.
  const cases = [
    ['page background', doc => { doc.page.backgroundImage = temporary; }],
    ['preview backdrop', doc => { doc.page.previewBackdrop = temporary; }],
    ['element source', doc => { doc.elements.find(e => e.type === 'image').src = temporary; }],
    ['video poster', doc => { doc.elements.find(e => e.type === 'image').poster = temporary; }],
  ];
  for (const [label, mutate] of cases) {
    C.doc = copy(baseline); mutate(C.doc);
    assert.equal(C.pendingUploads, 0, 'The guard also covers pasted temporary links');
    assert.equal(await C.save(), false, label + ' blocks Save');
    assert.equal(C.exportJSON(), undefined, label + ' blocks Export');
    assert.match(C.status, /temporary media|uploads/i);
  }
  assert.equal(h.writes.length, 0);
  assert.deepEqual(h.row, shared);
  C.doc = baseline;
  assert.deepEqual(JSON.parse(C.exportJSON()), baseline, 'Stable media still exports normally');
});

test('edits made during an explicit reload stay visible instead of being replaced on response', async t => {
  const h = fixture(t, { row: sharedRow() }), { C } = h;
  await C.load(); C.updatePage({ title: 'Original local draft' });
  h.setRow(sharedRow(Model.createDocument('minimal'), LATER_VERSION));
  const gate = deferred();
  h.intercept((call, apply) => call.method === 'GET' ? gate.promise.then(apply) : apply());
  const loading = C.reload();
  C.updatePage({ title: 'Newer edit during reload', backgroundOpacity: .4 });
  const newer = copy(C.doc);
  gate.resolve(); await loading;
  assert.deepEqual(C.doc, newer);
  assert.equal(C.dirty, true); assert.equal(C.loading, false);
  assert.match(C.status, /newer edit.*draft has been kept/i);
  assert.equal(h.writes.length, 0);
});

test('page media pickers update only the requested page field, even with another layer selected', async t => {
  const originalMedia = globalThis.SharedStudioMedia, opened = [];
  globalThis.SharedStudioMedia = { create: () => ({ open: options => opened.push(options) }) };
  t.after(() => {
    if (originalMedia === undefined) delete globalThis.SharedStudioMedia;
    else globalThis.SharedStudioMedia = originalMedia;
  });
  const h = fixture(t, { row: sharedRow() }), { C } = h;
  await C.load();
  const image = C.doc.elements.find(e => e.type === 'image'); C.select(image.id);
  const elements = copy(C.doc.elements);
  C.browseAssets('backgroundImage');
  assert.equal(opened[0].accept, 'image/*');
  opened[0].onSelect({ kind: 'image', url: 'bg/bg04.jpg' });
  assert.equal(C.doc.page.backgroundImage, 'bg/bg04.jpg');
  assert.deepEqual(C.doc.elements, elements, 'Choosing a page image never changes the selected image layer');
  C.browseAssets('previewBackdrop'); C.select(null);
  assert.equal(opened[1].accept, 'image/*');
  opened[1].onSelect({ kind: 'image', url: 'asgard/sky.jpeg' });
  assert.equal(C.doc.page.previewBackdrop, 'asgard/sky.jpeg');
  assert.equal(C.doc.page.backgroundImage, 'bg/bg04.jpg');
  C.browseAssets('previewBackdrop');
  opened[2].onSelect({ kind: 'video', url: 'lib/clips/v1-feed-swirl.mp4' });
  assert.equal(C.doc.page.previewBackdrop, 'asgard/sky.jpeg', 'A video cannot replace an image-only page backdrop');
  assert.match(C.status, /choose an image/i);
  assert.deepEqual(C.doc.elements, elements);
  assert.equal(C.dirty, true); assert.equal(h.writes.length, 0);
});
