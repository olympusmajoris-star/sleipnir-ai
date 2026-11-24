/* Full symbol browser. Selection updates the live phone without an Apply step. */
(() => {
  'use strict';
  const PAGE_SIZE = 60;
  const ACTIONS = [['', 'All actions'], ['appreciate', 'Appreciate'], ['reply', 'Reply'], ['share', 'Pass Along'], ['keep', 'Keep'], ['create', 'Create'], ['navigation', 'Navigation']];
  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }
  function button(label, action, cls = '') {
    const node = el('button', 'ap-button ' + cls, label); node.type = 'button';
    if (action) node.addEventListener('click', action);
    return node;
  }
  function option(value, label) { const node = el('option', '', label); node.value = value; return node; }
  function mount(host, C, options = {}) {
    host.classList.add('apsp-host');
    let active = false, disposed = false, serial = 0, queryTimer = 0, limit = PAGE_SIZE;
    let results = [], iconButtons = new Map(), lastTarget = '', lastWeight = '';
    const openedActionTargets = new Set();
    const state = { query: '', category: '', action: '', source: '', weight: 'regular' };
    const catalog = () => window.AsgardSymbols;
    const selected = () => C.doc?.elements?.find(item => item.id === C.selectedId) || null;
    const eligible = item => item && ['symbol', 'button'].includes(item.type);
    const run = action => {
      try {
        const value = action();
        if (value && typeof value.catch === 'function') value.catch(error => C.setStatus?.(error.message || 'That symbol could not be selected.'));
        return value;
      } catch (error) { C.setStatus?.(error.message || 'That symbol could not be selected.'); }
    };
    function targetForArtwork() {
      let target = selected();
      if (!eligible(target)) { C.add('symbol'); target = selected(); }
      if (!eligible(target) || target.locked) return null;
      return target;
    }
    function validArtworkURL(value) {
      const safe = window.AsgardPostModel?.safeURL?.(value);
      if (!safe) return false;
      if (/^data:image\/(?:png|jpeg|gif|webp|avif|svg\+xml);/i.test(safe)) return safe.includes(',') && safe.split(',').slice(1).join(',').length > 8;
      if (/^https?:\/\//i.test(safe)) {
        try { const parsed = new URL(safe); return /\.[a-z0-9-]{2,}$/i.test(parsed.hostname) && !/\s/.test(safe); } catch { return false; }
      }
      return /\.(?:png|jpe?g|gif|webp|avif|svg|bmp)(?:[?#].*)?$/i.test(safe);
    }

    const head = el('div', 'apsp-head');
    const back = button('Back to properties', () => { active = false; options.onClose?.(); }, 'ap-quiet');
    const heading = el('div', 'apsp-heading'); heading.append(el('h2', '', 'Symbols'));
    const total = el('span', 'apsp-total'); heading.append(total);
    const targetLabel = el('p', 'apsp-target');
    const instruction = el('p', 'apsp-help', 'Changes appear on the phone instantly.');
    head.append(back, heading, targetLabel, instruction); host.append(head);

    const shortcuts = el('div', 'apsp-shortcuts');
    const none = button('None', () => run(() => C.clearSymbol()), 'apsp-none');
    const yourArtwork = button('Your artwork', () => {
      custom.open = true; custom.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      url.focus({ preventScroll: true });
    });
    shortcuts.append(none, yourArtwork); host.append(shortcuts);
    const selectedSummary = el('div', 'apsp-selected'); selectedSummary.setAttribute('role', 'status'); host.append(selectedSummary);

    const filters = el('div', 'apsp-filters');
    const searchLabel = el('label', 'apsp-search'); searchLabel.append(el('span', '', 'Search all symbols'));
    const search = el('input'); search.type = 'search'; search.placeholder = 'Search names or ideas'; search.autocomplete = 'off'; search.setAttribute('aria-label', 'Search all symbols');
    searchLabel.append(search); filters.append(searchLabel);
    const filterGrid = el('div', 'apsp-filter-grid');
    function selectControl(label, values, container = filterGrid) {
      const wrapper = el('label', 'apsp-filter'); wrapper.append(el('span', '', label));
      const input = el('select'); input.setAttribute('aria-label', label);
      values.forEach(item => input.append(option(item[0], item[1]))); wrapper.append(input); container.append(wrapper); return input;
    }
    const action = selectControl('Action', ACTIONS);
    const weight = selectControl('Weight', [['thin', 'Thin'], ['light', 'Light'], ['regular', 'Regular'], ['bold', 'Bold'], ['fill', 'Fill'], ['duotone', 'Duotone']]);
    weight.value = state.weight;
    filters.append(filterGrid);
    const moreFilters = el('details', 'apsp-more-filters');
    moreFilters.append(el('summary', '', 'More filters'));
    const extraGrid = el('div', 'apsp-filter-grid');
    const source = selectControl('Source', [['', 'All sources'], ['asgard', 'Asgard artwork'], ['phosphor', 'Symbol library']], extraGrid);
    const category = selectControl('Category', [['', 'All categories']], extraGrid);
    moreFilters.append(extraGrid);
    const weightNote = el('p', 'apsp-weight-note', 'Weights change library symbols. Asgard artwork keeps its original details.'); moreFilters.append(weightNote);
    filters.append(moreFilters);
    host.append(filters);

    const countRow = el('div', 'apsp-results-head');
    const count = el('span', 'apsp-result-count'); count.setAttribute('aria-live', 'polite');
    const clear = button('Clear filters', clearFilters, 'ap-quiet');
    countRow.append(count, clear); host.append(countRow);
    const gallery = el('div', 'apsp-gallery'); gallery.setAttribute('aria-label', 'Available symbols'); host.append(gallery);
    const empty = el('div', 'apsp-empty');
    empty.append(el('p', '', 'No symbols match these filters.'), button('Show all symbols', clearFilters, 'ap-primary'));
    empty.hidden = true; host.append(empty);
    const more = button('Show more symbols', () => { limit += PAGE_SIZE; renderResults(false); }, 'apsp-more'); host.append(more);

    const custom = el('details', 'apsp-custom');
    const customTitle = el('summary', '', 'Your own artwork');
    const customBody = el('div', 'apsp-custom-body');
    customBody.append(el('p', 'apsp-help', 'Use an image you upload, a shared image, or an image URL. Transparent artwork can keep its own silhouette.'));
    const urlLabel = el('label', 'apsp-artwork-url'); urlLabel.append(el('span', '', 'Artwork image URL'));
    const url = el('input'); url.type = 'text'; url.placeholder = 'Paste an image URL'; url.autocomplete = 'off'; url.spellcheck = false; url.setAttribute('aria-label', 'Artwork image URL');
    urlLabel.append(url); customBody.append(urlLabel);
    const artworkTools = el('div', 'apsp-artwork-tools');
    const file = el('input'); file.type = 'file'; file.accept = 'image/*'; file.hidden = true;
    const upload = button('Upload image', () => file.click());
    const shared = button('Shared media', () => run(() => C.browseAssets?.('symbolSrc')));
    artworkTools.append(upload, shared, file); customBody.append(artworkTools);
    customBody.append(el('p', 'apsp-help', 'Plain finish preserves the original image colors. Metal, glass, carved, and hologram finishes use your chosen symbol colors.'));
    custom.append(customTitle, customBody); host.append(custom);
    file.addEventListener('change', () => {
      const chosen = file.files?.[0];
      const image = chosen && (/^image\//i.test(chosen.type) || /\.(?:png|jpe?g|gif|webp|avif|svg|bmp)$/i.test(chosen.name));
      if (chosen && !image) C.setStatus?.('Choose an image for symbol artwork.');
      else if (image && targetForArtwork()) run(() => C.uploadAsset(chosen, 'symbolSrc'));
      file.value = '';
    });
    url.addEventListener('input', () => {
      const value = url.value;
      if (!value.trim() && !eligible(selected())) return;
      if (value.trim() && !validArtworkURL(value)) return;
      const target = targetForArtwork();
      if (target) C.updateElement(target.id, { symbolSrc: value, ...(value.trim() ? { symbolSource: 'custom' } : {}) }, { history: false });
    });
    url.addEventListener('change', () => C.checkpoint());

    search.addEventListener('input', () => {
      state.query = search.value; limit = PAGE_SIZE; clearTimeout(queryTimer);
      queryTimer = setTimeout(() => renderResults(true), 100);
    });
    for (const [key, control] of [['source', source], ['category', category], ['action', action]]) {
      control.addEventListener('change', () => { state[key] = control.value; limit = PAGE_SIZE; renderResults(true); });
    }
    weight.addEventListener('change', () => {
      state.weight = weight.value;
      const target = selected();
      if (eligible(target) && !target.locked) run(() => C.updateElement(target.id, { symbolWeight: state.weight }));
      lastWeight = state.weight; renderResults(true);
    });
    function clearFilters() {
      clearTimeout(queryTimer);
      state.query = ''; state.source = ''; state.category = ''; state.action = ''; limit = PAGE_SIZE;
      search.value = ''; source.value = ''; category.value = ''; action.value = '';
      renderResults(true);
    }
    function populateMetadata() {
      const library = catalog();
      if (!library) { total.textContent = 'Library unavailable'; return false; }
      total.textContent = Number(library.icons?.length || 0).toLocaleString() + ' symbols';
      if (category.options.length === 1) (library.categories || []).forEach(item => category.append(option(item.id, item.label)));
      if (library.weights?.length && weight.dataset.loaded !== '1') {
        weight.textContent = '';
        library.weights.forEach(item => weight.append(option(item.id, item.label)));
        weight.value = state.weight; weight.dataset.loaded = '1';
      }
      return true;
    }
    function renderResults(reset) {
      if (disposed || !active) return;
      clearTimeout(queryTimer);
      const library = catalog();
      if (!populateMetadata()) {
        gallery.textContent = ''; empty.hidden = false; more.hidden = true;
        empty.firstElementChild.textContent = 'The symbol library could not load. Your own artwork is still available below.';
        count.textContent = 'Library unavailable'; return;
      }
      if (reset) {
        serial++; gallery.textContent = ''; iconButtons.clear();
        results = library.search({ query: state.query, category: state.category, action: state.action, source: state.source });
      }
      const version = serial;
      const shown = Math.min(limit, results.length);
      const start = iconButtons.size;
      const fragment = document.createDocumentFragment();
      for (const icon of results.slice(start, shown)) {
        const tile = button('', () => run(() => C.chooseSymbol(icon.id, { weight: state.weight })), 'apsp-icon');
        tile.dataset.symbolId = icon.id; tile.title = icon.name; tile.setAttribute('aria-label', 'Use ' + icon.name);
        const preview = el('span', 'apsp-icon-preview'); preview.setAttribute('aria-hidden', 'true');
        const loading = el('span', 'apsp-loading', 'Loading'); preview.append(loading);
        const label = el('span', 'apsp-icon-name', icon.name);
        const origin = el('span', 'apsp-icon-source', icon.source === 'asgard' ? 'Asgard' : 'Library');
        tile.append(preview, label, origin); fragment.append(tile);
        iconButtons.set(icon.id, tile);
        Promise.resolve(library.createIcon(icon.id, state.weight)).then(art => {
          if (disposed || version !== serial || !preview.isConnected) return;
          preview.textContent = '';
          if (art) preview.append(art);
          else preview.append(el('span', 'apsp-loading', 'No preview'));
        }).catch(() => {
          if (!disposed && version === serial && preview.isConnected) { preview.textContent = ''; preview.append(el('span', 'apsp-loading', 'No preview')); }
        });
      }
      gallery.append(fragment);
      count.textContent = results.length.toLocaleString() + (results.length === 1 ? ' result' : ' results') + ' · showing ' + shown.toLocaleString();
      empty.firstElementChild.textContent = 'No symbols match these filters.';
      empty.hidden = results.length > 0;
      more.hidden = shown >= results.length;
      more.textContent = 'Show next ' + Math.min(PAGE_SIZE, Math.max(0, results.length - shown)) + ' symbols';
      refreshSelection();
    }
    function refreshSelection() {
      const target = selected();
      const canUse = eligible(target);
      targetLabel.textContent = canUse ? 'Choosing for: ' + (target.name || 'Selected piece') : 'Choosing adds a new Symbol piece.';
      const symbol = canUse ? catalog()?.get(target.symbolId) : null;
      const sourceValue = canUse ? target.symbolSource || 'none' : 'none';
      selectedSummary.textContent = target?.locked ? 'This piece is locked. Unlock it to change its symbol.' : sourceValue === 'custom' ? 'Selected: your artwork' : sourceValue === 'library' && symbol ? 'Selected: ' + symbol.name : 'Selected: none';
      none.disabled = !canUse || Boolean(target.locked);
      none.setAttribute('aria-pressed', String(sourceValue === 'none'));
      upload.disabled = Boolean(canUse && target.locked); shared.disabled = Boolean(canUse && target.locked) || typeof C.browseAssets !== 'function';
      url.disabled = Boolean(canUse && target.locked);
      if (document.activeElement !== url) url.value = canUse ? target.symbolSrc || '' : '';
      for (const [id, tile] of iconButtons) {
        const chosen = sourceValue === 'library' && target?.symbolId === id;
        tile.setAttribute('aria-pressed', String(chosen)); tile.classList.toggle('is-selected', chosen);
        tile.disabled = Boolean(canUse && target.locked);
      }
    }
    function refresh() {
      if (!active || disposed) return;
      const target = selected();
      const id = target?.id || '';
      const currentWeight = eligible(target) ? target.symbolWeight || 'regular' : state.weight;
      if (id !== lastTarget || currentWeight !== lastWeight) {
        lastTarget = id; lastWeight = currentWeight;
        if (currentWeight !== state.weight) { state.weight = currentWeight; weight.value = currentWeight; renderResults(true); }
      }
      refreshSelection();
    }
    const unsubscribe = C.subscribe(refresh);
    return {
      open() {
        active = true;
        const target = selected();
        if (target?.type === 'button' && !openedActionTargets.has(target.id)) {
          const targetAction = target.action === 'keeps' ? 'keep' : target.action;
          state.action = ACTIONS.some(item => item[0] === targetAction) ? targetAction : '';
          action.value = state.action; limit = PAGE_SIZE;
          openedActionTargets.add(target.id);
        }
        if (eligible(target)) state.weight = target.symbolWeight || 'regular';
        weight.value = state.weight; lastTarget = target?.id || ''; lastWeight = state.weight;
        renderResults(true); refreshSelection();
        search.focus({ preventScroll: true });
      },
      refresh,
      dispose() { disposed = true; active = false; serial++; clearTimeout(queryTimer); unsubscribe?.(); host.textContent = ''; },
    };
  }
  window.AsgardSymbolPicker = { mount };
})();
