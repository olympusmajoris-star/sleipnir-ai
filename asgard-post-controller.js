/* Post-page drafts. Preview is immediate; only Save writes a shared design. */
(function (G) {
'use strict';
const DESIGN_ID = 'asgard_post_page_builder_v1';
const STORAGE_KEY = 'asgard.posts.workspace.v1';
function createController(options) {
  options = options || {};
  const M = options.model || G.AsgardPostModel;
  const storage = options.storage || G.localStorage;
  const send = options.fetch || (G.fetch && G.fetch.bind(G));
  const config = options.config || G.StudioTransferConfig || {};
  const now = options.now || Date.now;
  const listeners = new Set(), uploads = new Map();
  let history = [], cursor = 0, baseVersion = null, exists = false;
  let savedSignature = '', remoteData = {}, edits = 0, draftTimer = null;
  let readComplete = false, media = null, loadSequence = 0;
  const signature = doc => JSON.stringify(doc);
  const C = {
    doc: M.createDocument('content'), selectedId: null, mode: 'edit',
    dirty: true, saving: false, loading: true, pendingUploads: 0,
    status: 'Opening your post workspace…', conflict: false,
    get canUndo() { return cursor > 0; },
    get canRedo() { return cursor < history.length - 1; },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    notify(kind) { for (const fn of listeners) { try { fn(kind || 'document'); } catch (e) { console.error(e); } } },
    setStatus(text) { C.status = text; C.notify('status'); },
  };
  function readDraft() {
    try { const d = JSON.parse(storage.getItem(STORAGE_KEY)); return d && d.document && Array.isArray(d.document.elements) ? d : null; }
    catch (_) { return null; }
  }
  function portableDocument() {
    const doc = M.clone(C.doc);
    for (const u of uploads.values()) {
      const target = u.page ? doc.page : doc.elements.find(e => e.id === u.id);
      if (target && target[u.field] === u.temporary) Object.assign(target, u.original);
    }
    return doc;
  }
  function hasTemporaryMedia(doc) {
    return /^blob:/.test(doc.page.backgroundImage || '') || /^blob:/.test(doc.page.previewBackdrop || '') ||
      doc.elements.some(e => /^blob:/.test(e.src || '') || /^blob:/.test(e.poster || '') || /^blob:/.test(e.symbolSrc || ''));
  }
  function persist() {
    clearTimeout(draftTimer);
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify({
        document: portableDocument(), baseVersion, savedSignature, dirty: C.dirty,
        selectedId: C.selectedId, savedAt: now(),
      }));
    } catch (_) {
      C.status = 'Preview updated. Device storage is full; save or export the design to keep these changes.';
      C.notify('status');
    }
  }
  function refreshDirty() { C.dirty = signature(C.doc) !== savedSignature; }
  function changed(kind) {
    edits++; refreshDirty();
    C.status = C.dirty ? 'Live preview · changes kept as a draft. Save design when ready.' : 'Saved design · preview is up to date.';
    clearTimeout(draftTimer); draftTimer = setTimeout(persist, 120);
    C.notify(kind || 'document');
  }
  function ensureSelection() {
    if (C.selectedId && !C.doc.elements.some(e => e.id === C.selectedId)) C.selectedId = null;
  }
  C.checkpoint = function () {
    const snap = signature(portableDocument());
    if (history[cursor] !== snap) {
      history = history.slice(0, cursor + 1); history.push(snap);
      if (history.length > 70) history.shift();
      cursor = history.length - 1;
    }
    refreshDirty(); persist(); C.notify('history');
  };
  function replaceDocument(doc, kind) {
    C.doc = M.normalize(doc); ensureSelection(); changed(kind || 'structure'); C.checkpoint();
  }
  C.select = id => {
    C.selectedId = C.doc.elements.some(e => e.id === id) ? id : null;
    C.notify('selection');
  };
  C.updateElement = function (id, patch, settings) {
    const i = C.doc.elements.findIndex(e => e.id === id); if (i < 0) return;
    const element = C.doc.elements[i];
    if (element.locked && Object.keys(patch).some(k => !['locked', 'visible'].includes(k))) {
      C.setStatus('Unlock this piece before changing it.'); return;
    }
    if (Object.hasOwn(patch, 'symbolSrc') && M.safeURL(patch.symbolSrc) && !Object.hasOwn(patch, 'symbolSource')) patch = Object.assign({}, patch, { symbolSource: 'custom' });
    const doc = M.clone(C.doc);
    doc.elements[i] = Object.assign({}, element, patch, { id: element.id });
    C.doc = M.normalize(doc); changed('document');
    if (!settings || settings.history !== false) C.checkpoint();
  };
  C.updatePage = function (patch, settings) {
    C.doc = M.normalize(Object.assign({}, C.doc, { page: Object.assign({}, C.doc.page, patch) }));
    changed('document'); if (!settings || settings.history !== false) C.checkpoint();
  };
  C.add = function (type) {
    if (C.doc.elements.length >= 150) { C.setStatus('This design already has 150 pieces. Remove a piece before adding another.'); return; }
    const element = M.createElement(type, { x: 24, y: 100 + (C.doc.elements.length % 6) * 24 });
    C.doc.elements.push(element); C.selectedId = element.id;
    changed('structure'); C.checkpoint();
  };
  C.remove = function (id) {
    const e = C.doc.elements.find(e => e.id === id); if (!e) return;
    if (e.locked) { C.setStatus('Unlock this piece before removing it.'); return; }
    C.doc.elements = C.doc.elements.filter(e => e.id !== id);
    ensureSelection(); changed('structure'); C.checkpoint();
  };
  C.duplicate = function (id) {
    const e = C.doc.elements.find(e => e.id === id); if (!e) return;
    if (C.doc.elements.length >= 150) { C.setStatus('Remove a piece before adding another.'); return; }
    const copy = M.createElement(e.type, Object.assign({}, M.clone(e), {
      id: M.uid(), name: e.name + ' copy', x: e.x + 16, y: e.y + 16, locked: false,
    }));
    const index = C.doc.elements.indexOf(e);
    C.doc.elements.splice(index + 1, 0, copy); C.selectedId = copy.id;
    changed('structure'); C.checkpoint();
  };
  C.reorder = function (id, direction) {
    const from = C.doc.elements.findIndex(e => e.id === id); if (from < 0) return;
    const item = C.doc.elements[from];
    if (item.locked) { C.setStatus('Unlock this piece before moving it.'); return; }
    let to = direction === 'front' ? C.doc.elements.length - 1 : direction === 'back' ? 0 :
      from + (direction === 'up' ? 1 : -1);
    to = Math.max(0, Math.min(C.doc.elements.length - 1, to));
    if (to === from) return;
    C.doc.elements.splice(from, 1); C.doc.elements.splice(to, 0, item);
    changed('structure'); C.checkpoint();
  };
  C.applyPreset = id => {
    if (!M.PRESETS.some(p => p.id === id)) return;
    C.selectedId = null; replaceDocument(M.createDocument(id), 'structure');
    C.setStatus(id === 'blank' ? 'Empty page ready. Add any piece. Undo restores the previous arrangement.' : 'Sample arrangement loaded. Every piece is editable; Undo restores your previous arrangement.');
  };
  C.applyFrame = id => {
    const frame = (M.FRAMES || []).find(f => f.id === id);
    if (!C.selectedId || !frame) return;
    C.updateElement(C.selectedId, M.clone(frame.values));
  };
  function placeSymbol(selection, name, targetId) {
    const element = C.doc.elements.find(e => e.id === targetId);
    if (!element || !['button', 'symbol'].includes(element.type)) {
      if (C.doc.elements.length >= 150) { C.setStatus('Remove a piece before adding another.'); return; }
      const symbol = M.createElement('symbol', { name, ...selection, x: 24, y: 100 + (C.doc.elements.length % 6) * 24 });
      C.doc.elements.push(symbol); C.selectedId = symbol.id; changed('structure'); C.checkpoint(); return;
    }
    C.updateElement(element.id, selection);
  }
  C.chooseSymbol = (id, settings) => {
    const catalog = options.symbols || G.AsgardSymbols;
    const item = catalog && catalog.get(id);
    if (!item) { C.setStatus('That symbol is unavailable. Choose another from the library.'); return; }
    const selection = { symbolSource: 'library', symbolId: id, ...(settings && settings.weight ? { symbolWeight: settings.weight } : {}) };
    placeSymbol(selection, item.name + ' symbol', C.selectedId);
  };
  C.clearSymbol = () => {
    const element = C.doc.elements.find(e => e.id === C.selectedId);
    if (element) C.updateElement(element.id, { symbolSource: 'none', symbolId: '', symbolSrc: '' });
  };
  C.undo = () => {
    if (!C.canUndo) return;
    C.doc = M.normalize(JSON.parse(history[--cursor])); ensureSelection();
    changed('structure'); persist(); C.notify('history');
  };
  C.redo = () => {
    if (!C.canRedo) return;
    C.doc = M.normalize(JSON.parse(history[++cursor])); ensureSelection();
    changed('structure'); persist(); C.notify('history');
  };
  C.setMode = mode => {
    C.mode = mode === 'try' ? 'try' : 'edit';
    C.notify('mode');
    C.setStatus(C.mode === 'try' ? 'Try the sample actions. These interactions stay in this preview.' : 'Select, drag, resize, or edit any piece. All changes appear immediately.');
  };
  function headers(extra) {
    let token = config.key;
    try {
      const owner = G.top && G.top.location.origin === G.location.origin ? G.top.__asgardStudioOwnerSession : null;
      if (owner && owner.access_token && owner.expires_at > now() / 1000 + 30) token = owner.access_token;
    } catch (_) {}
    return Object.assign({ apikey: config.key, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, extra || {});
  }
  async function request(url, init) {
    if (!send || !config.url || !config.key) throw Error('Shared storage is unavailable. Your draft remains on this device.');
    const response = await send(url, Object.assign({ cache: 'no-store' }, init));
    let data = null;
    try { data = await response.json(); } catch (_) {}
    if (!response.ok) {
      if (response.status === 409) { const error = Error('A newer design already exists. Load saved design before replacing it.'); error.conflict = true; throw error; }
      if (response.status === 401 || response.status === 403) throw Error('Shared save was not permitted. Your draft is still here; reconnect the existing studio owner account.');
      throw Error('Shared storage could not complete the request (HTTP ' + response.status + '). Your draft is still here.');
    }
    return data;
  }
  const endpoint = () => config.url + '/rest/v1/studio_designs';
  async function readRemote() {
    const rows = await request(endpoint() + '?id=eq.' + DESIGN_ID + '&select=id,data,updated_at', { headers: headers() });
    if (!Array.isArray(rows)) throw Error('The saved design response was not recognized. Your draft is unchanged.');
    return rows[0] || null;
  }
  function validRemote(row) {
    if (!row) return null;
    const d = row.data && row.data.document;
    if (!d || d.version !== 1 || !Array.isArray(d.elements) || !d.page) throw Error('This saved design uses a different format. It has not been replaced.');
    return M.normalize(d);
  }
  C.load = async function () {
    const seq = ++loadSequence, atStart = edits;
    const draft = readDraft();
    if (draft) {
      C.doc = M.normalize(draft.document);
      baseVersion = draft.baseVersion || null; savedSignature = draft.savedSignature || '';
      C.selectedId = draft.selectedId || null; ensureSelection(); refreshDirty();
    }
    history = [signature(C.doc)]; cursor = 0; C.notify('structure');
    try {
      const row = await readRemote(), remote = validRemote(row);
      if (seq !== loadSequence) return;
      readComplete = true; exists = !!row; remoteData = row && row.data || {};
      if (edits === atStart && !(draft && draft.dirty)) {
        if (remote) C.doc = remote;
        baseVersion = row && row.updated_at || null;
        savedSignature = remote ? signature(remote) : '';
        history = [signature(C.doc)]; cursor = 0; ensureSelection(); refreshDirty();
        C.status = remote ? 'Saved post design loaded. Changes preview immediately.' : 'Sample arrangement ready. Edit any piece, or start empty.';
      } else {
        C.conflict = (row && row.updated_at || null) !== baseVersion;
        C.status = C.conflict ? 'Your draft is restored. A newer shared design exists; load it before saving over it.' : 'Your unsaved draft is restored. The phone preview is live.';
      }
    } catch (e) {
      C.status = e.message + ' You can continue editing and export your work.';
    } finally {
      if (seq === loadSequence) { C.loading = false; persist(); C.notify('structure'); }
    }
  };
  C.save = async function () {
    if (C.saving) return false;
    if (C.loading) { C.setStatus('Wait for the saved design check to finish before saving.'); return false; }
    if (C.pendingUploads || hasTemporaryMedia(C.doc)) {
      C.setStatus('Wait for the media upload to finish before saving. The preview already shows your selection.'); return false;
    }
    C.checkpoint(); C.saving = true; C.setStatus('Saving your post design…');
    const document = M.normalize(M.clone(C.doc)), sentSignature = signature(document);
    try {
      if (!readComplete) {
        const row = await readRemote(); validRemote(row); readComplete = true; exists = !!row; remoteData = row && row.data || {};
        if ((row && row.updated_at || null) !== baseVersion) { const error = Error('A shared design already exists. Load saved design before replacing it.'); error.conflict = true; throw error; }
      }
      const timestamp = new Date(Math.max(now(), baseVersion ? Date.parse(baseVersion) + 1 : 0)).toISOString();
      const data = Object.assign({}, remoteData, { schema: 1, kind: 'asgard-post-page', document });
      const body = { data, updated_at: timestamp, updated_by: 'asgard-post-editor' };
      let rows;
      if (exists) {
        const guard = baseVersion ? '&updated_at=eq.' + encodeURIComponent(baseVersion) : '&updated_at=is.null';
        rows = await request(endpoint() + '?id=eq.' + DESIGN_ID + guard, {
          method: 'PATCH', headers: headers({ Prefer: 'return=representation' }), body: JSON.stringify(body),
        });
        if (!Array.isArray(rows) || rows.length !== 1) { const error = Error('A newer shared design was saved elsewhere. Your draft is preserved; load saved design before replacing it.'); error.conflict = true; throw error; }
      } else {
        rows = await request(endpoint(), {
          method: 'POST', headers: headers({ Prefer: 'return=representation' }),
          body: JSON.stringify(Object.assign({ id: DESIGN_ID, page: 'Asgard/posts' }, body)),
        });
        if (!Array.isArray(rows) || rows.length !== 1) throw Error('Shared save was not confirmed. Your draft is preserved.');
      }
      exists = true; baseVersion = rows[0].updated_at; remoteData = rows[0].data || data;
      savedSignature = sentSignature; C.conflict = false; refreshDirty(); persist();
      C.status = C.dirty ? 'Saved. Your newer changes are still a live draft.' : 'Saved to the shared studio. Keep editing whenever you want.';
      return true;
    } catch (e) {
      C.conflict = !!e.conflict; C.status = e.message; persist(); return false;
    } finally { C.saving = false; C.notify('status'); }
  };
  C.reload = async function () {
    if (C.loading || C.saving) return;
    if (C.dirty && G.confirm && !G.confirm('Load the shared saved design? You can use Undo to return to this draft.')) return;
    C.loading = true; C.setStatus('Loading the saved design…');
    const atStart = edits;
    try {
      const row = await readRemote(), doc = validRemote(row);
      if (!doc) { C.setStatus('No shared post design has been saved yet. Your draft is unchanged.'); return; }
      if (edits !== atStart) { C.setStatus('You made a newer edit while the saved design was loading. Your live draft has been kept.'); return; }
      C.checkpoint(); exists = true; baseVersion = row.updated_at; remoteData = row.data; readComplete = true;
      savedSignature = signature(doc); C.conflict = false; C.selectedId = null; replaceDocument(doc);
      C.setStatus('Saved design loaded. Undo can restore your previous draft.');
    } catch (e) { C.setStatus(e.message); }
    finally { C.loading = false; C.notify('status'); }
  };
  C.exportJSON = () => {
    if (C.pendingUploads || hasTemporaryMedia(C.doc)) { C.setStatus('Finish media uploads or replace temporary media links before exporting.'); return; }
    const text = JSON.stringify(C.doc, null, 2);
    if (!G.document) return text;
    const blob = new Blob([text], { type: 'application/json' }), url = URL.createObjectURL(blob);
    const a = G.document.createElement('a'); a.href = url; a.download = 'Asgard_Post_Page_Design.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); C.setStatus('Design exported, including every piece and its properties.');
    return text;
  };
  C.importJSON = async file => {
    try {
      if (file.size > 8 * 1024 * 1024) throw Error('Choose a design JSON file smaller than 8 MB.');
      const value = JSON.parse(await file.text());
      if (value.version !== 1 || !value.page || !Array.isArray(value.elements)) throw Error('Choose an Asgard post design export.');
      C.selectedId = null; replaceDocument(value); C.setStatus('Design imported into the live preview. Undo restores your previous draft.');
    } catch (e) { C.setStatus('Import stopped: ' + e.message); }
  };
  function sharedMedia() {
    if (!media && G.SharedStudioMedia) media = G.SharedStudioMedia.create({ url: config.url, headers });
    if (!media) throw Error('The shared media browser is unavailable.');
    return media;
  }
  C.browseAssets = field => {
    field = field || 'src';
    const page = ['backgroundImage', 'previewBackdrop'].includes(field);
    const id = C.selectedId; if (!page && !id && field !== 'symbolSrc') return;
    try { sharedMedia().open({
      accept: page || ['poster', 'symbolSrc'].includes(field) ? 'image/*' : 'image/*,video/*',
      onSelect(asset) {
        if (page) {
          if (asset.kind === 'video') { C.setStatus('Choose an image for the page background.'); return; }
          C.updatePage({ [field]: asset.url }); return;
        }
        const patch = { [field]: asset.url };
        if (field === 'symbolSrc') {
          if (asset.kind === 'video') { C.setStatus('Choose an image for the symbol artwork.'); return; }
          if (!M.safeURL(asset.url)) { C.setStatus('Choose artwork with a valid image URL.'); return; }
          placeSymbol({ symbolSrc: asset.url, symbolSource: 'custom' }, 'Your symbol', id); return;
        }
        const layer = C.doc.elements.find(e => e.id === id);
        if (layer && field === 'src' && ['image', 'video'].includes(layer.type)) patch.type = asset.kind;
        C.updateElement(id, patch);
      },
    }); } catch (e) { C.setStatus(e.message); }
  };
  C.uploadAsset = async function (file, field) {
    field = field || 'src';
    const page = ['backgroundImage', 'previewBackdrop'].includes(field);
    const id = C.selectedId, layer = C.doc.elements.find(e => e.id === id);
    if (!page && (!layer || layer.locked)) return;
    if (!file || !/^(image|video)\//.test(file.type)) { C.setStatus('Choose an image or video file.'); return; }
    if ((page || ['poster', 'symbolSrc'].includes(field)) && !file.type.startsWith('image/')) { C.setStatus('Choose an image for this background, poster, or symbol.'); return; }
    if (file.size > 50 * 1024 * 1024) { C.setStatus('Choose a file below 50 MB, or use a hosted media URL.'); return; }
    const uploadKey = (page ? 'page' : id) + ':' + field;
    const previous = uploads.get(uploadKey);
    const original = previous ? previous.original : page ? { [field]: C.doc.page[field] } : { [field]: layer[field], type: layer.type, ...(field === 'symbolSrc' ? { symbolSource: layer.symbolSource } : {}) };
    const temporary = URL.createObjectURL(file);
    uploads.set(uploadKey, { id, page, field, temporary, original });
    const update = (value, settings) => page ? C.updatePage(value, settings) : C.updateElement(id, value, settings);
    const currentSource = () => (page ? C.doc.page : C.doc.elements.find(e => e.id === id))?.[field];
    const patch = { [field]: temporary };
    if (field === 'symbolSrc') patch.symbolSource = 'custom';
    if (!page && field === 'src' && ['image', 'video'].includes(layer.type)) patch.type = file.type.startsWith('video/') ? 'video' : 'image';
    C.pendingUploads++; update(patch, { history: false }); C.setStatus('Previewing your file now. Uploading it for saving…');
    try {
      const asset = await sharedMedia().upload(file);
      if (currentSource() === temporary) update({ [field]: asset.url });
      C.setStatus('Media added. Adjust any property and save when ready.');
    } catch (e) {
      if (currentSource() === temporary) update(original);
      C.setStatus(e.message + ' The previous media has been restored.');
    } finally {
      if (uploads.get(uploadKey)?.temporary === temporary) uploads.delete(uploadKey);
      C.pendingUploads--; URL.revokeObjectURL(temporary); persist(); C.notify('status');
    }
  };
  C.dispose = () => { clearTimeout(draftTimer); persist(); listeners.clear(); loadSequence++; };
  history = [signature(C.doc)];
  return C;
}
const api = { createController, DESIGN_ID, STORAGE_KEY };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
G.AsgardPostController = api;
if (G.document) {
  const boot = () => {
    const root = G.document.getElementById('post-editor'); if (!root || !G.AsgardPostUI || !G.AsgardPostRenderer) return;
    const controller = createController();
    const ui = G.AsgardPostUI.mount(root, controller);
    const preview = G.AsgardPostRenderer.mount(ui.previewHost, controller);
    G.AsgardPostWorkspaceController = controller;
    controller.load();
    const leave = event => { if (controller.pendingUploads) { event.preventDefault(); event.returnValue = ''; } };
    G.addEventListener('beforeunload', leave);
    G.addEventListener('pagehide', () => { controller.dispose(); preview.dispose(); ui.dispose(); }, { once: true });
  };
  if (G.document.readyState === 'loading') G.document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
}
})(typeof window === 'undefined' ? globalThis : window);
