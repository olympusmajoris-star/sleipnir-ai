/* Asgard post workspace: live inputs, independent pieces, and explicit saving. */
(() => {
  'use strict';

  const FONT_OPTIONS = [
    ['system-ui, sans-serif', 'System'], ['Arial, sans-serif', 'Arial'],
    ['Georgia, serif', 'Georgia'], ['Verdana, sans-serif', 'Verdana'],
    ['"Trebuchet MS", sans-serif', 'Trebuchet'], ['"Times New Roman", serif', 'Times'],
    ['"Courier New", monospace', 'Courier'], ['Impact, sans-serif', 'Impact'],
  ];
  const ACTION_OPTIONS = [
    ['none', 'No action'], ['appreciate', 'Appreciate'], ['reply', 'Reply'],
    ['share', 'Pass Along'], ['keep', 'Keep / Kept'], ['keeps', 'Open Your Keeps'],
    ['create', 'Create Saga'],
  ];
  const EASING_OPTIONS = ['ease', 'linear', 'ease-in', 'ease-out', 'ease-in-out'];
  const BLEND_OPTIONS = ['normal', 'multiply', 'screen', 'overlay', 'soft-light', 'hard-light', 'difference', 'exclusion', 'color-dodge', 'luminosity'];
  const TYPE_WORDS = { text: 'Text', image: 'Image', video: 'Video', button: 'Button', symbol: 'Symbol', shape: 'Shape', avatar: 'Avatar', divider: 'Divider' };
  const SYMBOL_WEIGHTS = [['thin', 'Thin'], ['light', 'Light'], ['regular', 'Regular'], ['bold', 'Bold'], ['fill', 'Fill'], ['duotone', 'Duotone']];

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text != null) element.textContent = text;
    return element;
  }
  function button(label, handler, className = '') {
    const element = node('button', 'ap-button ' + className, label);
    element.type = 'button';
    if (handler) element.addEventListener('click', handler);
    return element;
  }
  function option(value, label) {
    const element = document.createElement('option');
    element.value = String(value); element.textContent = label == null ? String(value) : label;
    return element;
  }
  const field = (key, label, type, extra) => ({ key, label, type, ...(extra || {}) });
  const number = (key, label, min, max, step = 1, unit = '') => field(key, label, 'number', { min, max, step, unit });
  const choices = (key, label, options, extra) => field(key, label, 'select', { options, ...extra });
  const toggle = (key, label) => field(key, label, 'toggle');
  const color = (key, label, transparent = false) => field(key, label, 'color', { transparent });

  function elementGroups(element) {
    const text = ['text', 'button', 'avatar', 'symbol'].includes(element.type);
    const media = ['image', 'avatar', 'video'].includes(element.type);
    const hasSymbol = ['button', 'symbol'].includes(element.type);
    const content = [field('name', 'Piece name', 'text')];
    if (['text', 'button', 'symbol'].includes(element.type)) content.push(field('text', 'Words', 'textarea'));
    if (media) content.push(field('src', element.type === 'video' ? 'Video source' : 'Image source', 'asset', { accept: element.type === 'video' ? 'video/*' : 'image/*' }));
    if (element.type === 'video') content.push(field('poster', 'Video cover image', 'asset', { accept: 'image/*' }));
    content.push(field('postId', 'Post group', 'text', { help: 'Use the same group for a post and its buttons. Keeps and replies stay with that post.' }));
    content.push(toggle('visible', 'Visible'), toggle('locked', 'Lock position and properties'));
    const groups = [
      { id: 'content', title: 'Content', fields: content },
      { id: 'frames', title: 'Frames & borders', kind: 'frames', fields: [], help: 'Choose a frame or None. Refine its colors, thickness, corners, and shadow in the controls below.' },
      { id: 'position', title: 'Position & size', fields: [
        choices('positionMode', 'Position behavior', [['page', 'Scroll with page'], ['fixed', 'Fixed on screen']]),
        number('x', 'Left', -2000, 2000, 1, 'px'), number('y', 'Top', -4000, 6000, 1, 'px'),
        number('width', 'Width', 2, 2000, 1, 'px'), number('height', 'Height', 2, 4000, 1, 'px'),
        number('rotation', 'Rotation', -180, 180, 1, '°'),
      ] },
      { id: 'appearance', title: 'Appearance', fields: [
        color('background', 'Fill', true), number('opacity', 'Opacity', 0, 1, 0.01),
        number('radius', 'Corner roundness', 0, 240, 1, 'px'), number('padding', 'Inside spacing', 0, 100, 1, 'px'),
        number('borderWidth', 'Border thickness', 0, 24, 1, 'px'), color('borderColor', 'Border color', true),
        choices('borderStyle', 'Border style', ['solid', 'dashed', 'dotted', 'double', 'none']),
        number('backdropBlur', 'Blur behind', 0, 40, 1, 'px'),
        choices('blendMode', 'Blend', BLEND_OPTIONS),
      ] },
      { id: 'shadow', title: 'Shadow & glow', fields: [
        choices('shadowMode', 'Shadow shape', [['none', 'None'], ['box', 'Panel outline'], ['silhouette', 'Artwork silhouette']]),
        color('shadowColor', 'Shadow color', true), number('shadowOpacity', 'Shadow opacity', 0, 1, 0.01), number('shadowBlur', 'Softness', 0, 120, 1, 'px'),
        number('shadowX', 'Across', -100, 100, 1, 'px'), number('shadowY', 'Down', -100, 100, 1, 'px'),
        number('shadowSpread', 'Spread', -30, 60, 1, 'px'),
      ] },
    ];
    if (hasSymbol) groups.splice(1, 0,
      { id: 'symbol', title: 'Symbol', help: 'Choose from the complete library or use your own artwork. None leaves the words and action alone.', fields: [
        choices('symbolSource', 'Symbol source', [['none', 'None'], ['library', 'Symbol library'], ['custom', 'Your artwork']]),
        field('symbolId', 'Choose from the library', 'symbol-picker'),
        field('symbolSrc', 'Your artwork image', 'asset', { accept: 'image/*' }),
        choices('symbolWeight', 'Symbol weight', SYMBOL_WEIGHTS),
        choices('symbolPlacement', 'Symbol and words', [['before', 'Symbol before words'], ['after', 'Symbol after words'], ['above', 'Symbol above words'], ['below', 'Symbol below words'], ['only', 'Symbol only'], ['label', 'Words only']]),
        number('symbolGap', 'Space from words', 0, 80, 1, 'px'),
      ] },
      { id: 'symbol-shape', title: 'Symbol size & shape', fields: [
        number('symbolSize', 'Symbol size', 8, 240, 1, 'px'), number('symbolRotation', 'Symbol rotation', -360, 360, 1, '°'),
        number('symbolScaleX', 'Symbol width scale', 0.25, 4, 0.05, '×'), number('symbolScaleY', 'Symbol height scale', 0.25, 4, 0.05, '×'),
        toggle('symbolFlipX', 'Flip horizontally'), toggle('symbolFlipY', 'Flip vertically'),
      ] },
      { id: 'symbol-material', title: 'Symbol finish & light', help: 'Library symbols use these colors. Plain artwork keeps its original colors; the other finishes color its silhouette.', fields: [
        choices('symbolFinish', 'Finish', [['plain', 'Plain'], ['metal', 'Metal'], ['glass', 'Glass'], ['carved', 'Carved'], ['hologram', 'Hologram']]),
        color('symbolColor', 'Symbol color'), color('symbolAccent', 'Accent color'), number('symbolOpacity', 'Symbol opacity', 0, 1, 0.01),
        number('symbolGlow', 'Symbol glow', 0, 40, 1, 'px'), color('symbolGlowColor', 'Glow color'),
      ] },
    );
    if (text) groups.push({ id: 'type', title: 'Text style', fields: [
      choices('fontFamily', 'Typeface', FONT_OPTIONS), number('fontSize', 'Text size', 8, 100, 1, 'px'),
      choices('fontWeight', 'Weight', [[300, 'Light'], [400, 'Regular'], [500, 'Medium'], [600, 'Semibold'], [700, 'Bold'], [800, 'Heavy'], [900, 'Black']], { numeric: true }),
      color('color', 'Text color'), number('lineHeight', 'Line spacing', 0.8, 3, 0.05),
      number('letterSpacing', 'Letter spacing', -2, 12, 0.1, 'px'),
      choices('textAlign', 'Across', [['left', 'Left'], ['center', 'Center'], ['right', 'Right']]),
      choices('verticalAlign', 'Vertically', [['top', 'Top'], ['middle', 'Center'], ['bottom', 'Bottom']]),
      toggle('italic', 'Italic'), toggle('underline', 'Underline'), toggle('uppercase', 'Uppercase'),
    ] });
    if (media) {
      const fields = [
        choices('fit', 'Image fit', [['contain', 'Show whole image'], ['cover', 'Fill and crop'], ['fill', 'Stretch to fit'], ['none', 'Original size'], ['scale-down', 'Shrink to fit']]),
        number('focalX', 'Focus across', 0, 100, 1, '%'), number('focalY', 'Focus down', 0, 100, 1, '%'),
        number('brightness', 'Brightness', 0, 200, 1, '%'), number('contrast', 'Contrast', 0, 200, 1, '%'),
        number('saturation', 'Color strength', 0, 200, 1, '%'), number('grayscale', 'Black and white', 0, 100, 1, '%'),
        number('blur', 'Image blur', 0, 40, 0.5, 'px'),
      ];
      if (element.type === 'video') fields.push(toggle('autoplay', 'Play automatically'), toggle('loop', 'Loop video'), toggle('muted', 'Muted'), number('playbackRate', 'Playback speed', 0.25, 3, 0.05, '×'));
      groups.push({ id: 'media', title: 'Media', fields });
      groups.push({ id: 'edges', title: 'Effects & edge mask', help: 'Use your own image or video as an overlay. Edges only leaves the center clear; opacity, blend, and blur remain adjustable in the other groups.', fields: [
        choices('effectMask', 'Show media', [['none', 'Full media'], ['edge', 'Edges only']]),
        number('edgeWidth', 'Edge width', 1, 60, 1, 'px'), number('edgeSoftness', 'Edge softness', 0, 24, 0.5, 'px'),
      ] });
    }
    groups.push({ id: 'motion', title: 'Motion', fields: [
      choices('motion', 'Animation', [['none', 'None'], ['fade', 'Fade in'], ['float', 'Float'], ['pulse', 'Pulse']]),
      number('duration', 'Duration', 0.1, 20, 0.1, 's'), number('delay', 'Delay', 0, 10, 0.1, 's'),
      number('distance', 'Travel', 0, 100, 1, 'px'), choices('easing', 'Timing', EASING_OPTIONS),
    ] });
    if (element.type !== 'divider') groups.push({ id: 'action', title: 'When tapped', help: 'Switch to Try page to test actions with sample posts. No messages are sent to real people.', fields: [choices('action', 'Action', ACTION_OPTIONS)] });
    return groups;
  }

  function pageGroups() {
    return [
      { id: 'page', title: 'Page', fields: [
        field('title', 'Design name', 'text'), number('width', 'Phone width', 280, 768, 1, 'px'),
        number('height', 'Phone height', 480, 1200, 1, 'px'), number('contentHeight', 'Scrollable page height', 480, 6000, 1, 'px'),
      ] },
      { id: 'backdrop', title: 'Background & transparency', help: 'Lower the background opacity to see through the sides and gaps between posts. Each post piece keeps its own opacity.', fields: [
        color('background', 'Page color'), number('backgroundOpacity', 'Background opacity', 0, 1, 0.01),
        field('backgroundImage', 'Background image', 'asset', { accept: 'image/*', page: true }),
        choices('backgroundFit', 'Image fit', [['cover', 'Fill page'], ['contain', 'Show whole image'], ['fill', 'Stretch to fit']]),
      ] },
      { id: 'behind', title: 'Behind transparent areas', help: 'Choose what sits behind the page while you arrange it. This backdrop stays visible wherever the page and its pieces are transparent.', fields: [
        field('previewBackdrop', 'Backdrop behind transparent areas', 'asset', { accept: 'image/*', page: true }),
        choices('previewBackdropFit', 'Backdrop fit', [['cover', 'Fill phone'], ['contain', 'Show whole image'], ['fill', 'Stretch to fit']]),
      ] },
      { id: 'placement', title: 'Placement guides', fields: [
        number('padding', 'Safe margin', 0, 80, 1, 'px'), number('grid', 'Grid spacing', 1, 48, 1, 'px'), toggle('snap', 'Snap pieces to grid'),
      ] },
    ];
  }

  function mount(root, C) {
    const M = window.AsgardPostModel;
    if (!M) throw new Error('AsgardPostModel must be loaded before the workspace.');
    root.className = 'ap-editor'; root.dataset.pane = 'properties';
    root.textContent = '';
    let disposed = false, inspectorKey = '', layerKey = '', pendingPreset = null, symbolPicker = null;
    let fieldViews = [], frameViews = [], inspectorGroups = [], layerViews = new Map();
    const expanded = { content: true, symbol: true, position: true, page: true, backdrop: true };
    const cleanup = [];
    const run = action => {
      try {
        const result = action();
        if (result && typeof result.catch === 'function') result.catch(error => C.setStatus?.(error.message || 'That action could not finish.'));
        return result;
      } catch (error) { C.setStatus?.(error.message || 'That action could not finish.'); }
    };
    const selected = () => C.doc?.elements?.find(element => element.id === C.selectedId) || null;
    const update = (key, value) => {
      const current = selected();
      if (current) {
        if (current.locked && key !== 'locked' && key !== 'visible') return;
        C.updateElement(current.id, { [key]: value }, { history: false });
      } else C.updatePage({ [key]: value }, { history: false });
    };

    const header = node('header', 'ap-header');
    const identity = node('div', 'ap-identity');
    identity.append(node('span', 'ap-eyebrow', 'ASGARD'), node('h1', '', 'Post page'));
    const promise = node('p', 'ap-live-note', 'Change a piece. See it immediately.');
    identity.append(promise);
    const actions = node('div', 'ap-header-actions');
    const modeGroup = node('div', 'ap-segment', null); modeGroup.setAttribute('aria-label', 'Workspace mode');
    const edit = button('Edit pieces', () => C.setMode('edit'));
    const tryPage = button('Try page', () => C.setMode('try'));
    modeGroup.append(edit, tryPage);
    const undo = button('Undo', () => run(() => C.undo()), 'ap-quiet');
    const redo = button('Redo', () => run(() => C.redo()), 'ap-quiet');
    const symbols = button('Symbols', () => openSymbolPicker(), 'ap-symbols-button');
    const files = node('details', 'ap-file-tools');
    const summary = node('summary', '', 'Design file');
    const fileMenu = node('div', 'ap-file-menu');
    const importFile = node('input'); importFile.type = 'file'; importFile.accept = '.json,application/json'; importFile.hidden = true;
    importFile.addEventListener('change', () => { const file = importFile.files?.[0]; if (file) run(() => C.importJSON(file)); importFile.value = ''; files.open = false; });
    const exportButton = button('Export design', () => { files.open = false; run(() => C.exportJSON()); });
    const importButton = button('Import design', () => importFile.click());
    const reloadButton = button('Reload saved design', () => { files.open = false; askPreset('__reload__'); });
    fileMenu.append(exportButton, importButton, reloadButton); files.append(summary, fileMenu, importFile);
    const save = button('Save design', () => run(() => C.save()), 'ap-primary');
    actions.append(modeGroup, symbols, undo, redo, files, save); header.append(identity, actions);
    root.append(header);

    const mobileTabs = node('nav', 'ap-mobile-tabs'); mobileTabs.setAttribute('aria-label', 'Editor panels');
    const piecesTab = button('Pieces & samples', () => { root.dataset.pane = 'layers'; mobileTabsUpdate(); });
    const propertiesTab = button('Properties', () => { root.dataset.pane = 'properties'; mobileTabsUpdate(); });
    mobileTabs.append(piecesTab, propertiesTab); root.append(mobileTabs);
    function mobileTabsUpdate() {
      piecesTab.setAttribute('aria-pressed', String(root.dataset.pane === 'layers'));
      propertiesTab.setAttribute('aria-pressed', String(root.dataset.pane === 'properties'));
    }
    mobileTabsUpdate();

    const confirmation = node('section', 'ap-confirmation'); confirmation.hidden = true; confirmation.setAttribute('aria-label', 'Confirm design change');
    const confirmWords = node('p');
    const confirmAction = button('Start empty', () => {
      const id = pendingPreset; pendingPreset = null; confirmation.hidden = true;
      run(() => id === '__reload__' ? C.reload() : C.applyPreset(id));
    }, 'ap-primary');
    const cancelAction = button('Cancel', () => { pendingPreset = null; confirmation.hidden = true; });
    confirmation.append(confirmWords, confirmAction, cancelAction); root.append(confirmation);
    function askPreset(id) {
      pendingPreset = id;
      if (id === 'blank') { confirmWords.textContent = 'Clear this post design and build it piece by piece? Undo brings the current arrangement back.'; confirmAction.textContent = 'Start empty'; }
      else if (id === '__reload__') { confirmWords.textContent = 'Reload the last saved design? Your current layout will be replaced.'; confirmAction.textContent = 'Reload saved'; }
      else { const preset = M.PRESETS.find(item => item.id === id); confirmWords.textContent = 'Arrange the “' + (preset?.label || id) + '” sample here? Undo returns to your current design.'; confirmAction.textContent = 'Arrange sample'; }
      confirmation.hidden = false;
      confirmAction.focus({ preventScroll: true });
    }

    const workspace = node('main', 'ap-workspace');
    const layers = node('aside', 'ap-layers'); layers.setAttribute('aria-label', 'Pieces and sample arrangements');
    const presets = node('section', 'ap-presets');
    presets.append(node('h2', '', 'Sample arrangements'), node('p', 'ap-muted', 'Every piece in these samples is editable.'));
    for (const preset of M.PRESETS.filter(item => item.id !== 'blank')) {
      const sample = button('', () => askPreset(preset.id), 'ap-sample');
      sample.append(node('strong', '', preset.label), node('span', '', preset.description || 'A starting arrangement'));
      sample.dataset.preset = preset.id;
      presets.append(sample);
    }
    presets.append(button('Start empty', () => askPreset('blank'), 'ap-empty-start'));
    layers.append(presets);
    const piecesHead = node('div', 'ap-panel-heading');
    const piecesTitle = node('h2', '', 'Pieces'); const pieceCount = node('span', 'ap-count'); piecesHead.append(piecesTitle, pieceCount);
    layers.append(piecesHead);
    const addRow = node('div', 'ap-add-row');
    const addType = node('select'); addType.setAttribute('aria-label', 'Type of piece to add');
    M.TYPES.forEach(type => addType.append(option(type.id, type.label)));
    const add = button('Add', () => { run(() => C.add(addType.value)); root.dataset.pane = 'properties'; mobileTabsUpdate(); if (addType.value === 'symbol') openSymbolPicker(); }, 'ap-primary');
    addRow.append(addType, add); layers.append(addRow);
    const pageButton = button('Page & background', () => { C.select(null); root.dataset.pane = 'properties'; mobileTabsUpdate(); }, 'ap-page-button');
    layers.append(pageButton);
    const layerList = node('div', 'ap-layer-list'); layerList.setAttribute('aria-label', 'Layer order, front to back');
    layers.append(layerList);
    const layerEmpty = node('p', 'ap-layer-empty', 'Your page is empty. Add a piece above, or choose a sample.');
    layers.append(layerEmpty);

    const previewPanel = node('section', 'ap-preview-panel'); previewPanel.setAttribute('aria-label', 'Live phone preview');
    const previewHost = node('div', 'ap-preview-host'); previewPanel.append(previewHost);

    const inspector = node('aside', 'ap-inspector'); inspector.setAttribute('aria-label', 'Selected piece properties');
    const inspectorHead = node('div', 'ap-inspector-heading');
    const inspectorEyebrow = node('span', 'ap-eyebrow', 'PAGE');
    const inspectorTitle = node('h2', '', 'Page & background');
    const fieldCount = node('span', 'ap-property-count');
    inspectorHead.append(inspectorEyebrow, inspectorTitle, fieldCount); inspector.append(inspectorHead);
    const selectedActions = node('div', 'ap-piece-actions');
    const framesButton = button('Frames', () => {
      filter.value = ''; filterProperties();
      const group = inspectorGroups.find(item => item.id === 'frames');
      if (group) { group.element.open = true; expanded.frames = true; group.element.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    }, 'ap-frames-button');
    const duplicate = button('Duplicate', () => { if (C.selectedId) run(() => C.duplicate(C.selectedId)); });
    const remove = button('Remove', () => { if (C.selectedId) run(() => C.remove(C.selectedId)); }, 'ap-danger');
    const symbolButton = button('Symbols', () => openSymbolPicker(), 'ap-symbols-button');
    selectedActions.append(framesButton, symbolButton, duplicate, remove); inspector.append(selectedActions);
    const orderActions = node('div', 'ap-order-actions');
    for (const [label, direction] of [['Forward', 'up'], ['Back', 'down'], ['To front', 'front'], ['To back', 'back']]) {
      const b = button(label, () => { if (C.selectedId) run(() => C.reorder(C.selectedId, direction)); });
      b.title = 'Move selected piece ' + label.toLowerCase(); orderActions.append(b);
    }
    inspector.append(orderActions);
    const lockNote = node('p', 'ap-lock-note', 'This piece is locked. Unlock it in Content to change its properties.'); lockNote.hidden = true; inspector.append(lockNote);
    const filterLabel = node('label', 'ap-property-search');
    const filter = node('input'); filter.type = 'search'; filter.placeholder = 'Find a property'; filter.setAttribute('aria-label', 'Find a property');
    filterLabel.append(filter); inspector.append(filterLabel);
    const propertyBody = node('div', 'ap-property-body'); inspector.append(propertyBody);
    const noProperties = node('p', 'ap-no-properties', 'No matching properties.'); noProperties.hidden = true; inspector.append(noProperties);
    filter.addEventListener('input', filterProperties);
    const symbolPickerHost = node('div', 'ap-symbol-picker-host'); inspector.append(symbolPickerHost);
    function openSymbolPicker() {
      if (!window.AsgardSymbolPicker) { C.setStatus?.('The symbol browser could not load. Reload the editor to try again.'); return; }
      if (!symbolPicker) symbolPicker = window.AsgardSymbolPicker.mount(symbolPickerHost, C, { onClose() { delete inspector.dataset.symbolPicker; } });
      inspector.dataset.symbolPicker = 'open'; root.dataset.pane = 'properties'; mobileTabsUpdate();
      inspector.scrollTop = 0; symbolPicker.open();
    }

    workspace.append(layers, previewPanel, inspector); root.append(workspace);
    const footer = node('footer', 'ap-footer');
    const saveState = node('span', 'ap-save-state');
    const status = node('span', 'ap-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    footer.append(saveState, status); root.append(footer);

    function renderLayers() {
      const elements = C.doc?.elements || [];
      const signature = elements.map(item => item.id).join('|');
      if (signature !== layerKey) {
        layerKey = signature; layerViews = new Map(); layerList.textContent = '';
        for (const element of [...elements].reverse()) {
          const row = node('div', 'ap-layer'); row.dataset.layerId = element.id;
          const choose = button('', () => { C.select(element.id); root.dataset.pane = 'properties'; mobileTabsUpdate(); }, 'ap-layer-select');
          const name = node('strong'); const kind = node('span'); choose.append(name, kind);
          const visibility = button('', () => run(() => {
            const item = C.doc.elements.find(candidate => candidate.id === element.id);
            if (item) C.updateElement(item.id, { visible: !item.visible });
          }), 'ap-layer-mini');
          const lock = button('', () => run(() => {
            const item = C.doc.elements.find(candidate => candidate.id === element.id);
            if (item) C.updateElement(item.id, { locked: !item.locked });
          }), 'ap-layer-mini');
          const tools = node('div', 'ap-layer-tools'); tools.append(visibility, lock); row.append(choose, tools); layerList.append(row);
          layerViews.set(element.id, { row, choose, name, kind, visibility, lock });
        }
      }
      for (const element of elements) {
        const view = layerViews.get(element.id); if (!view) continue;
        view.row.classList.toggle('is-selected', element.id === C.selectedId);
        view.row.classList.toggle('is-hidden', element.visible === false);
        view.name.textContent = element.name || TYPE_WORDS[element.type] || 'Piece';
        view.kind.textContent = TYPE_WORDS[element.type] || element.type;
        view.choose.setAttribute('aria-label', 'Edit ' + view.name.textContent);
        view.choose.setAttribute('aria-pressed', String(element.id === C.selectedId));
        view.visibility.textContent = element.visible === false ? 'Show' : 'Hide';
        view.visibility.setAttribute('aria-label', (element.visible === false ? 'Show ' : 'Hide ') + view.name.textContent);
        view.lock.textContent = element.locked ? 'Unlock' : 'Lock';
        view.lock.setAttribute('aria-label', (element.locked ? 'Unlock ' : 'Lock ') + view.name.textContent);
      }
      pieceCount.textContent = String(elements.length);
      layerEmpty.hidden = elements.length > 0;
      pageButton.classList.toggle('is-selected', !selected());
      pageButton.setAttribute('aria-pressed', String(!selected()));
      add.disabled = elements.length >= 150;
      add.title = add.disabled ? 'This design has reached 150 pieces.' : 'Add an editable piece';
    }

    function propertyControl(spec, groupId, current) {
      const row = node('div', 'ap-field'); row.dataset.key = spec.key;
      const inputId = 'ap-' + groupId + '-' + spec.key;
      const label = node('label', 'ap-field-label', spec.label); label.htmlFor = inputId;
      row.append(label);
      const box = node('div', 'ap-field-control'); row.append(box);
      const inputs = [];
      let readValue, writeValue;
      const commit = () => C.checkpoint();
      const onInput = () => { update(spec.key, readValue()); };
      if (spec.type === 'number') {
        const range = node('input'); range.type = 'range'; range.min = spec.min; range.max = spec.max; range.step = spec.step; range.setAttribute('aria-label', spec.label + ' slider');
        const direct = node('input'); direct.type = 'number'; direct.id = inputId; direct.min = spec.min; direct.max = spec.max; direct.step = spec.step; direct.inputMode = 'decimal';
        const numberWrap = node('div', 'ap-number-wrap'); numberWrap.append(direct); if (spec.unit) numberWrap.append(node('span', '', spec.unit));
        box.classList.add('ap-range-control'); box.append(range, numberWrap);
        const apply = source => { const value = Number(source.value); if (source.value !== '' && Number.isFinite(value)) update(spec.key, value); };
        range.addEventListener('input', () => { direct.value = range.value; apply(range); });
        direct.addEventListener('input', () => { if (direct.value !== '') range.value = direct.value; apply(direct); });
        range.addEventListener('change', commit); direct.addEventListener('change', commit);
        inputs.push(range, direct);
        writeValue = value => { if (document.activeElement !== range) range.value = value; if (document.activeElement !== direct) direct.value = value; };
      } else if (spec.type === 'toggle') {
        const input = node('input'); input.type = 'checkbox'; input.id = inputId; input.className = 'ap-checkbox';
        box.classList.add('ap-toggle-control'); box.append(input);
        input.addEventListener('input', () => update(spec.key, input.checked)); input.addEventListener('change', commit);
        inputs.push(input); writeValue = value => { input.checked = Boolean(value); };
      } else if (spec.type === 'select') {
        const select = node('select'); select.id = inputId;
        spec.options.forEach(item => select.append(Array.isArray(item) ? option(item[0], item[1]) : option(item)));
        box.append(select); readValue = () => spec.numeric ? Number(select.value) : select.value;
        select.addEventListener('input', onInput); select.addEventListener('change', () => { onInput(); commit(); });
        inputs.push(select);
        writeValue = value => {
          const str = String(value ?? '');
          if (![...select.options].some(item => item.value === str)) select.append(option(str, str || 'None'));
          if (document.activeElement !== select) select.value = str;
        };
      } else if (spec.type === 'color') {
        const picker = node('input'); picker.type = 'color'; picker.setAttribute('aria-label', spec.label + ' picker');
        const input = node('input'); input.type = 'text'; input.id = inputId; input.spellcheck = false; input.placeholder = spec.transparent ? '#112233 or transparent' : '#112233';
        box.classList.add('ap-color-control'); box.append(picker, input);
        picker.addEventListener('input', () => { input.value = picker.value; update(spec.key, picker.value); });
        input.addEventListener('input', () => update(spec.key, input.value));
        picker.addEventListener('change', commit); input.addEventListener('change', commit);
        if (spec.transparent) {
          const clear = button('Clear', () => { update(spec.key, 'transparent'); commit(); }, 'ap-inline-button');
          clear.title = 'Make this color transparent'; box.append(clear); inputs.push(clear);
        }
        inputs.push(input, picker); writeValue = value => {
          if (document.activeElement !== input) input.value = value ?? '';
          const hex = /^#[0-9a-f]{6}$/i.test(value || '') ? value : /^#[0-9a-f]{3}$/i.test(value || '') ? '#' + value.slice(1).split('').map(c => c + c).join('') : '#000000';
          if (document.activeElement !== picker) picker.value = hex;
        };
      } else if (spec.type === 'symbol-picker') {
        const summary = node('div', 'ap-symbol-current');
        const preview = node('span', 'ap-symbol-current-preview'); preview.setAttribute('aria-hidden', 'true');
        const label = node('span', 'ap-symbol-current-label'); summary.append(preview, label);
        const choose = button('Choose symbol', () => openSymbolPicker(), 'ap-symbol-choose'); choose.id = inputId;
        box.append(summary, choose); inputs.push(choose);
        let previous = '', revision = 0;
        writeValue = value => {
          const element = selected(); if (!element) return;
          const key = [element.symbolSource, value, element.symbolWeight, element.symbolSrc].join('|');
          if (key === previous) return; previous = key; const currentRevision = ++revision;
          preview.textContent = '';
          const library = window.AsgardSymbols;
          if (element.symbolSource === 'custom') {
            label.textContent = element.symbolSrc ? 'Your artwork' : 'Choose your artwork';
            if (element.symbolSrc) { const image = node('img'); image.alt = ''; image.src = element.symbolSrc; preview.append(image); }
          } else if (element.symbolSource === 'library') {
            label.textContent = library?.get(value)?.name || 'Choose a library symbol';
            if (value && library) Promise.resolve(library.createIcon(value, element.symbolWeight || 'regular')).then(art => {
              if (art && currentRevision === revision && !disposed && preview.isConnected) preview.append(art);
            }).catch(() => { /* The selected name stays readable when artwork is unavailable. */ });
          } else label.textContent = 'No symbol';
        };
      } else {
        const input = node(spec.type === 'textarea' ? 'textarea' : 'input');
        if (input.tagName === 'INPUT') input.type = 'text';
        else input.rows = 4;
        input.id = inputId; input.autocomplete = 'off';
        if (spec.type === 'asset') { input.placeholder = 'Paste an image or video URL'; input.spellcheck = false; }
        box.append(input); readValue = () => input.value;
        input.addEventListener('input', onInput); input.addEventListener('change', commit);
        inputs.push(input); writeValue = value => { if (document.activeElement !== input) input.value = value ?? ''; };
        if (spec.type === 'asset') {
          const tools = node('div', 'ap-asset-tools');
          const chooseFile = node('input'); chooseFile.type = 'file'; chooseFile.accept = spec.accept; chooseFile.hidden = true;
          const upload = button('Upload file', () => chooseFile.click());
          chooseFile.addEventListener('change', () => {
            const file = chooseFile.files?.[0];
            if (file) run(() => C.uploadAsset(file, spec.key));
            chooseFile.value = '';
          });
          tools.append(upload, chooseFile); inputs.push(upload);
          if (typeof C.browseAssets === 'function') {
            const browse = button('Shared media', () => run(() => C.browseAssets(spec.key)));
            tools.append(browse); inputs.push(browse);
          }
          const clear = button('Clear source', () => { update(spec.key, ''); commit(); }, 'ap-quiet');
          tools.append(clear); inputs.push(clear);
          box.append(tools);
        }
      }
      if (spec.help) row.append(node('p', 'ap-field-help', spec.help));
      writeValue(current[spec.key]);
      const refresh = data => {
        writeValue(data[spec.key]);
        const locked = selected()?.locked && spec.key !== 'locked' && spec.key !== 'visible';
        inputs.forEach(input => { input.disabled = Boolean(locked); });
      };
      return { row, key: spec.key, label: spec.label, refresh };
    }

    function renderInspector() {
      const current = selected();
      const key = current ? current.id + '|' + current.type : '__page__';
      inspectorTitle.textContent = current ? current.name || TYPE_WORDS[current.type] || 'Piece' : 'Page & background';
      inspectorEyebrow.textContent = current ? TYPE_WORDS[current.type] || current.type : 'PAGE';
      selectedActions.hidden = !current; orderActions.hidden = !current;
      symbolButton.hidden = !current || !['button', 'symbol'].includes(current.type);
      remove.disabled = Boolean(current?.locked); duplicate.disabled = !current || (C.doc.elements.length >= 150);
      [...orderActions.querySelectorAll('button')].forEach(item => { item.disabled = Boolean(current?.locked); });
      lockNote.hidden = !current?.locked;
      if (key !== inspectorKey) {
        inspectorKey = key; propertyBody.textContent = ''; fieldViews = []; frameViews = []; inspectorGroups = [];
        inspector.scrollTop = 0;
        filter.value = '';
        const groups = current ? elementGroups(current) : pageGroups();
        const data = current || C.doc.page;
        for (const group of groups) {
          const details = node('details', 'ap-property-group'); details.open = expanded[group.id] ?? false;
          const summary = node('summary'); summary.append(node('span', '', group.title), node('span', 'ap-group-count', String(group.kind === 'frames' ? (M.FRAMES || []).length : group.fields.length)));
          details.append(summary);
          details.addEventListener('toggle', () => { if (!filter.value) expanded[group.id] = details.open; });
          const body = node('div', 'ap-group-fields');
          if (group.help) body.append(node('p', 'ap-group-help', group.help));
          const views = group.fields.map(spec => propertyControl(spec, group.id, data));
          views.forEach(view => { fieldViews.push(view); body.append(view.row); });
          const frames = [];
          if (group.kind === 'frames') {
            const gallery = node('div', 'ap-frame-gallery');
            for (const frame of M.FRAMES || []) {
              const tile = button('', () => run(() => C.applyFrame(frame.id)), 'ap-frame-choice');
              tile.dataset.frame = frame.id; tile.title = frame.description || frame.label;
              tile.setAttribute('aria-label', frame.label + ' frame');
              const swatch = node('span', 'ap-frame-swatch'); swatch.setAttribute('aria-hidden', 'true');
              const center = node('span', 'ap-frame-center');
              const overlay = node('span', 'ap-frame-overlay');
              const sample = { width: 96, height: 54, borderWidth: 2, borderColor: '#7ab4bf', radius: 8, opacity: 1, ...(frame.values || {}), frameStyle: frame.id };
              const previewStyle = window.AsgardPostRenderer?.frameCSS?.(frame.id, sample);
              if (previewStyle) Object.assign(overlay.style, previewStyle);
              else { overlay.dataset.frame = frame.id; overlay.style.border = frame.id === 'none' ? 'none' : '2px solid ' + sample.borderColor; overlay.style.borderRadius = sample.radius + 'px'; }
              swatch.append(center, overlay); tile.append(swatch, node('span', 'ap-frame-label', frame.label));
              gallery.append(tile);
              const view = { id: frame.id, label: frame.label, description: frame.description, button: tile };
              frames.push(view); frameViews.push(view);
            }
            body.append(gallery);
          }
          details.append(body); propertyBody.append(details);
          inspectorGroups.push({ element: details, id: group.id, title: group.title, views, frames });
        }
        fieldCount.textContent = fieldViews.length + ' editable properties';
        noProperties.hidden = true;
        if (current) { root.dataset.pane = 'properties'; mobileTabsUpdate(); }
      }
      const data = current || C.doc.page;
      fieldViews.forEach(view => view.refresh(data));
      frameViews.forEach(view => {
        const active = (current?.frameStyle || 'none') === view.id;
        view.button.setAttribute('aria-pressed', String(active));
        view.button.classList.toggle('is-selected', active);
        view.button.disabled = Boolean(current?.locked);
      });
    }

    function filterProperties() {
      const term = filter.value.trim().toLowerCase();
      let visible = 0;
      for (const group of inspectorGroups) {
        let matching = 0;
        group.views.forEach(view => {
          const matches = !term || (group.title + ' ' + view.label + ' ' + view.key).toLowerCase().includes(term);
          view.row.hidden = !matches; if (matches) matching++;
        });
        (group.frames || []).forEach(view => {
          const matches = !term || ('frames borders ' + view.label + ' ' + view.description).toLowerCase().includes(term);
          view.button.hidden = !matches; if (matches) matching++;
        });
        group.element.hidden = matching === 0;
        if (term && matching) group.element.open = true;
        else if (!term) group.element.open = expanded[group.id] ?? false;
        visible += matching;
      }
      noProperties.hidden = visible > 0;
    }

    function refresh() {
      if (disposed || !C.doc) return;
      edit.setAttribute('aria-pressed', String(C.mode !== 'try'));
      tryPage.setAttribute('aria-pressed', String(C.mode === 'try'));
      root.dataset.mode = C.mode || 'edit';
      undo.disabled = !C.canUndo; redo.disabled = !C.canRedo;
      save.disabled = Boolean(C.saving || C.loading);
      save.textContent = C.saving ? 'Saving…' : 'Save design';
      saveState.textContent = C.loading ? 'Loading design' : C.saving ? 'Saving design' : C.dirty ? 'Unsaved design' : 'Design saved';
      saveState.classList.toggle('is-dirty', Boolean(C.dirty));
      if (status.textContent !== String(C.status || '')) status.textContent = C.status || 'Changes appear immediately. Save keeps your design.';
      renderLayers(); renderInspector();
    }
    const unsubscribe = C.subscribe(refresh); cleanup.push(unsubscribe);
    refresh();
    return {
      previewHost,
      dispose() { disposed = true; symbolPicker?.dispose(); cleanup.forEach(fn => { if (typeof fn === 'function') fn(); }); root.textContent = ''; },
    };
  }

  window.AsgardPostUI = { mount };
})();
