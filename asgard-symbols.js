/* Local, licensed symbol catalog. Geometry shards load only on demand.
 * Phosphor provenance and MIT license: asgard-symbols/NOTICE and LICENSE. */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root, require('./asgard-symbols-data.js'));
  } else {
    root.AsgardSymbols = factory(root, root.AsgardSymbolsData);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root, data) {
  'use strict';

  if (!data || !Array.isArray(data.icons)) {
    throw new Error('Load asgard-symbols-data.js before asgard-symbols.js.');
  }

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var SHARD_SIZE = 128;
  var weightIds = new Set(data.weights.map(function (item) { return item.id; }));
  var iconMap = new Map();
  var searchIndex = new Map();
  var weightCache = new Map();
  var geometryCache = new Map();
  var script = root.document && root.document.currentScript;
  var base = script && script.src || root.document && root.document.baseURI || '';
  var version = data.source.commit.slice(0, 12);
  var actionWords = {
    appreciate: 'appreciate appreciation like likes love respect reaction favorite favourite applaud applause',
    reply: 'reply replies respond response comment comments chat conversation message messages talk discuss discussion',
    share: 'share sharing pass along send forward export link network broadcast announce',
    keep: 'keep kept save saved bookmark bookmarks collect collection favorite favourite',
    keeps: 'your keeps saved collection bookmarks archive library',
    create: 'create compose add new post saga write upload publish',
    navigation: 'navigation navigate home feed gathering explore browse go route menu location'
  };
  var queryActions = {
    share: 'share', sharing: 'share', send: 'share', forward: 'share', 'pass along': 'share',
    reply: 'reply', replies: 'reply', chat: 'reply', message: 'reply', messages: 'reply', comment: 'reply', comments: 'reply',
    keep: 'keep', kept: 'keep', save: 'keep', saved: 'keep', bookmark: 'keep', bookmarks: 'keep', favorite: 'keep', favourite: 'keep',
    keeps: 'keeps', 'your keeps': 'keeps',
    appreciate: 'appreciate', respect: 'appreciate', like: 'appreciate', love: 'appreciate',
    create: 'create', compose: 'create', 'create saga': 'create',
    navigation: 'navigation', navigate: 'navigation'
  };

  function normalized(value) {
    return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function localURL(path) {
    // Every caller supplies a fixed catalog path, never an imported URL or icon ID.
    if (base && typeof root.URL === 'function') {
      return new root.URL(path, base).href;
    }
    return path;
  }

  var phosphorIndex = 0;
  var icons = data.icons.map(function (item) {
    var entry = Object.assign({}, item, {
      tags: Object.freeze(item.tags.slice()),
      categories: Object.freeze(item.categories.slice()),
      actions: Object.freeze((item.actions || []).slice())
    });
    if (entry.source === 'phosphor') entry.part = Math.floor(phosphorIndex++ / SHARD_SIZE);
    Object.freeze(entry);
    iconMap.set(entry.id, entry);
    var words = [entry.id, entry.name, entry.source].concat(entry.tags, entry.categories);
    entry.actions.forEach(function (action) { words.push(actionWords[action] || ''); });
    searchIndex.set(entry.id, normalized(words.join(' ')));
    return entry;
  });
  Object.freeze(icons);

  function get(id) {
    return typeof id === 'string' ? iconMap.get(id) || null : null;
  }

  function search(options) {
    options = options && typeof options === 'object' ? options : {};
    var query = normalized(options.query);
    var queryAction = Object.prototype.hasOwnProperty.call(queryActions, query) ? queryActions[query] : '';
    var terms = query && !queryAction ? query.split(/\s+/) : [];
    var category = typeof options.category === 'string' ? options.category : '';
    var source = typeof options.source === 'string' ? options.source : '';
    var action = Object.prototype.hasOwnProperty.call(actionWords, options.action) ? options.action : '';
    var matches = icons.filter(function (entry) {
      if (source && source !== 'all' && entry.source !== source) return false;
      if (category && category !== 'all' && entry.categories.indexOf(category) < 0) return false;
      if (action && entry.actions.indexOf(action) < 0) return false;
      if (queryAction && entry.actions.indexOf(queryAction) < 0) return false;
      var haystack = searchIndex.get(entry.id);
      return terms.every(function (term) { return haystack.indexOf(term) >= 0; });
    });
    if (query) {
      // Exact names lead; otherwise preserve the catalog's stable ordering.
      matches.sort(function (a, b) {
        return Number(normalized(b.name) === query) - Number(normalized(a.name) === query);
      });
    }
    return matches;
  }

  function loadWeight(weight, part) {
    var cacheKey = weight + '/' + part;
    if (weightCache.has(cacheKey)) return weightCache.get(cacheKey);
    if (typeof root.fetch !== 'function') return Promise.reject(new Error('Symbol loading is unavailable.'));
    var url = localURL('asgard-symbols/' + weight + '/part-' + String(part).padStart(2, '0') + '.json') + '?v=' + version;
    var pending = Promise.resolve().then(function () {
      return root.fetch(url, { credentials: 'same-origin', cache: 'force-cache' });
    }).then(function (response) {
      if (!response || !response.ok) throw new Error('Could not load symbol shard ' + cacheKey + '.');
      return response.json();
    }).then(function (catalog) {
      if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog) ||
          Object.keys(catalog).length !== Math.min(SHARD_SIZE, data.source.iconCount - part * SHARD_SIZE)) {
        throw new Error('Invalid local symbol catalog.');
      }
      return catalog;
    }).catch(function (error) {
      // A transient fetch failure must not permanently poison the picker.
      weightCache.delete(cacheKey);
      throw error;
    });
    weightCache.set(cacheKey, pending);
    return pending;
  }

  function parseTrustedSVG(source) {
    // Exact allowlist for this pinned catalog: svg{xmlns,viewBox,fill},
    // path{d,opacity}. No HTML parser, innerHTML, styles, links, event handlers,
    // external references, arbitrary attributes, or arbitrary SVG imports.
    if (typeof source !== 'string' || source.length > 65536) return null;
    var rootMatch = /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 256 256" fill="currentColor">([\s\S]+)<\/svg>$/.exec(source);
    if (!rootMatch) return null;
    var content = rootMatch[1];
    var pathPattern = /<path d="([MmZzLlHhVvCcSsQqTtAa0-9eE+.,\s-]+)"(?: opacity="(0\.2)")?\/>/gy;
    var paths = [];
    var offset = 0;
    while (offset < content.length) {
      pathPattern.lastIndex = offset;
      var match = pathPattern.exec(content);
      if (!match || match.index !== offset || paths.length >= 128) return null;
      paths.push(Object.freeze({ d: match[1], opacity: match[2] || '' }));
      offset = pathPattern.lastIndex;
    }
    return paths.length ? Object.freeze(paths) : null;
  }

  function createSVG(paths, entry, weight, document) {
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('xmlns', SVG_NS);
    svg.setAttribute('viewBox', '0 0 256 256');
    svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('data-symbol', entry.id);
    svg.setAttribute('data-weight', weight);
    paths.forEach(function (shape) {
      var path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', shape.d);
      if (shape.opacity) {
        path.setAttribute('opacity', shape.opacity);
        path.setAttribute('data-secondary', 'true');
      }
      svg.appendChild(path);
    });
    return svg;
  }

  function createIcon(id, requestedWeight) {
    var entry = get(id);
    var document = root.document;
    if (!entry || !document || typeof document.createElementNS !== 'function') {
      return Promise.resolve(null);
    }
    if (entry.source === 'asgard') {
      var img = document.createElement('img');
      img.setAttribute('src', localURL(entry.asset));
      img.setAttribute('alt', entry.name);
      img.setAttribute('draggable', 'false');
      img.setAttribute('decoding', 'async');
      img.setAttribute('data-symbol', entry.id);
      return Promise.resolve(img);
    }
    var weight = weightIds.has(requestedWeight) ? requestedWeight : 'regular';
    var key = entry.id + '/' + weight;
    if (geometryCache.has(key)) {
      return Promise.resolve(createSVG(geometryCache.get(key), entry, weight, document));
    }
    return loadWeight(weight, entry.part).then(function (catalog) {
      var slug = entry.id.slice(3);
      if (!Object.prototype.hasOwnProperty.call(catalog, slug)) return null;
      var paths = parseTrustedSVG(catalog[slug]);
      if (!paths) return null;
      geometryCache.set(key, paths);
      return createSVG(paths, entry, weight, document);
    }).catch(function () { return null; });
  }

  return Object.freeze({
    icons: icons,
    weights: Object.freeze(data.weights.map(function (item) { return Object.freeze(Object.assign({}, item)); })),
    categories: Object.freeze(data.categories.map(function (item) { return Object.freeze(Object.assign({}, item)); })),
    provenance: Object.freeze(Object.assign({}, data.source)),
    get: get,
    search: search,
    createIcon: createIcon
  });
});
