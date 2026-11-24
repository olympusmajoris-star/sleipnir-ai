/* The editable Asgard post document. No DOM, storage, or network writes. */
(function (root, factory) {
  'use strict';
  const model = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = model;
  else root.AsgardPostModel = model;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  const LIMITS = Object.freeze({ layers: 150, text: 8000, mediaURL: 2100000, contentHeight: 12000 });
  const VOCABULARY = Object.freeze({ keep: 'Keep', kept: 'Kept', keeps: 'Your Keeps' });
  const TYPES = Object.freeze([
    { id: 'text', label: 'Text' }, { id: 'image', label: 'Image' },
    { id: 'video', label: 'Video' }, { id: 'button', label: 'Button' }, { id: 'symbol', label: 'Symbol' },
    { id: 'shape', label: 'Shape' }, { id: 'avatar', label: 'Avatar' },
    { id: 'divider', label: 'Divider' }
  ].map(Object.freeze));
  const PRESETS = Object.freeze([
    { id: 'content', label: 'Content first', description: 'Large media, a clear caption, and a labeled row of actions.' },
    { id: 'conversation', label: 'Conversation first', description: 'A prominent question and reply button, with room for a photo.' },
    { id: 'minimal', label: 'Open layout', description: 'An uncluttered page with generous spacing and simple dividers.' },
    { id: 'blank', label: 'Blank page', description: 'An empty page. Add and arrange each piece yourself.' }
  ].map(Object.freeze));
  // These are optional style choices, not applied layouts. They never replace
  // an element's media, text, background, geometry, or interaction.
  const frameValues = values => Object.freeze({ borderStyle: 'solid', shadowColor: '#00000000', shadowBlur: 0, shadowX: 0, shadowY: 0, shadowSpread: 0, shadowMode: values.shadowBlur > 0 ? 'box' : 'none', shadowOpacity: .5, backdropBlur: 0, ...values });
  const FRAMES = Object.freeze([
    { id: 'none', label: 'None', description: 'Remove the decorative border and frame lighting.', values: frameValues({ frameStyle: 'none', borderWidth: 0 }) },
    { id: 'line', label: 'Fine line', description: 'A quiet outline that leaves the story in focus.', values: frameValues({ frameStyle: 'line', borderWidth: 1, borderColor: '#7896ad', radius: 14 }) },
    { id: 'double', label: 'Double rim', description: 'Two clean rims with a little space between them.', values: frameValues({ frameStyle: 'double', borderWidth: 3, borderStyle: 'double', borderColor: '#a3b9c9', radius: 16 }) },
    { id: 'corners', label: 'Carved corners', description: 'Distinct corner brackets with open space along the sides.', values: frameValues({ frameStyle: 'corners', borderWidth: 3, borderColor: '#85d4de', radius: 10 }) },
    { id: 'etched', label: 'Etched metal', description: 'Dark metal with fine engraved lines.', values: frameValues({ frameStyle: 'etched', borderWidth: 4, borderColor: '#687b8a', radius: 10, shadowColor: '#00000080', shadowBlur: 6, shadowY: 2 }) },
    { id: 'silver', label: 'Silver', description: 'A cool silver edge with restrained highlights.', values: frameValues({ frameStyle: 'silver', borderWidth: 4, borderColor: '#c6d4df', radius: 16, shadowColor: '#00000088', shadowBlur: 14, shadowY: 6 }) },
    { id: 'bronze', label: 'Aged bronze', description: 'Warm bronze with a weathered metal finish.', values: frameValues({ frameStyle: 'bronze', borderWidth: 5, borderColor: '#987349', radius: 14, shadowColor: '#110d08aa', shadowBlur: 16, shadowY: 6 }) },
    { id: 'stone', label: 'Dark stone', description: 'A substantial slate edge for the Norse setting.', values: frameValues({ frameStyle: 'stone', borderWidth: 7, borderColor: '#4c5865', radius: 10, shadowColor: '#00000099', shadowBlur: 16, shadowY: 5 }) },
    { id: 'obsidian', label: 'Obsidian', description: 'A deep black rim with a polished edge.', values: frameValues({ frameStyle: 'obsidian', borderWidth: 6, borderColor: '#273241', radius: 20, shadowColor: '#000000bb', shadowBlur: 24, shadowY: 8 }) },
    { id: 'glass', label: 'Clear glass', description: 'A pale transparent rim that keeps the media visible.', values: frameValues({ frameStyle: 'glass', borderWidth: 2, borderColor: '#b6e1e880', radius: 22, shadowColor: '#7ac8d422', shadowBlur: 18 }) },
    { id: 'frosted', label: 'Frosted glass', description: 'A softly frosted glass edge with cool highlights.', values: frameValues({ frameStyle: 'frosted', borderWidth: 3, borderColor: '#c5e8ed99', radius: 20, shadowColor: '#00000066', shadowBlur: 16, backdropBlur: 10 }) },
    { id: 'braid', label: 'Braided rim', description: 'An interwoven border inspired by Norse knotwork.', values: frameValues({ frameStyle: 'braid', borderWidth: 6, borderColor: '#9caaad', radius: 16, shadowColor: '#00000070', shadowBlur: 10, shadowY: 4 }) },
    { id: 'cyan', label: 'Cyan glow', description: 'A narrow cyan rim with a soft surrounding glow.', values: frameValues({ frameStyle: 'cyan', borderWidth: 2, borderColor: '#82dce7', radius: 16, shadowColor: '#5ac8dd99', shadowBlur: 20, shadowSpread: 1 }) },
    { id: 'gold', label: 'Warm gold', description: 'A warm golden edge with subtle reflected light.', values: frameValues({ frameStyle: 'gold', borderWidth: 3, borderColor: '#d3ae69', radius: 16, shadowColor: '#bb8d414d', shadowBlur: 16, shadowSpread: 1 }) }
  ].map(Object.freeze));
  let sequence = 0;
  const forbidden = key => ['__proto__', 'prototype', 'constructor'].includes(key);
  const record = value => !!value && typeof value === 'object' && !Array.isArray(value);

  // History snapshots and imported metadata must not retain executable values or cycles.
  function clone(value) {
    const ancestors = new WeakSet();
    function copy(input, depth) {
      if (input === null || typeof input === 'string' || typeof input === 'boolean') return input;
      if (typeof input === 'number') return Number.isFinite(input) ? input : null;
      if (!input || typeof input !== 'object' || depth > 20 || ancestors.has(input)) return undefined;
      if (input instanceof Date) return Number.isFinite(input.getTime()) ? input.toISOString() : null;
      ancestors.add(input);
      let result;
      if (Array.isArray(input)) result = input.slice(0, 4096).map(v => copy(v, depth + 1) ?? null);
      else {
        result = {};
        for (const key of Object.keys(input).slice(0, 1024)) {
          if (forbidden(key)) continue;
          const descriptor = Object.getOwnPropertyDescriptor(input, key);
          if (!descriptor || !Object.hasOwn(descriptor, 'value')) continue;
          const v = copy(descriptor.value, depth + 1);
          if (v !== undefined) result[key] = v;
        }
      }
      ancestors.delete(input);
      return result;
    }
    return copy(value, 0);
  }

  function uid(prefix = 'part') {
    const name = String(prefix).replace(/[^a-z0-9_-]/gi, '').slice(0, 24) || 'part';
    const random = root.crypto?.randomUUID?.();
    return name + '-' + (random || Date.now().toString(36) + '-' + (++sequence).toString(36) + '-' + Math.random().toString(36).slice(2, 10));
  }

  function finite(value, fallback, min, max, integer = false) {
    const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
    const safe = Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
    return integer ? Math.round(safe) : safe;
  }
  const text = (value, fallback, limit = LIMITS.text) => typeof value === 'string' ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').slice(0, limit) : fallback;
  const choice = (value, choices, fallback) => choices.includes(value) ? value : fallback;
  const bool = (value, fallback) => typeof value === 'boolean' ? value : fallback;
  const identifier = value => typeof value === 'string' && /^[a-z0-9][a-z0-9_.-]{0,99}$/i.test(value) ? value : '';

  function safeURL(value) {
    if (typeof value !== 'string') return '';
    const url = value.trim();
    if (!url || url.length > LIMITS.mediaURL || /[\u0000-\u001f\u007f<>"'`\\]/.test(url)) return '';
    if (/^data:/i.test(url)) return /^data:image\/(?:png|jpe?g|gif|webp|avif|bmp);base64,[a-z0-9+/=]+$/i.test(url) ? url : '';
    if (/^blob:/i.test(url)) {
      // Temporary uploads belong only to this running editor. The controller
      // replaces these before a shared save or export.
      try {
        const parsed = new URL(url.slice(5));
        if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== root.location?.origin ||
            !/^\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(parsed.pathname) ||
            parsed.search || parsed.hash || parsed.username || parsed.password) return '';
        return url;
      } catch { return ''; }
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(url)) {
      try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password ? url : '';
      } catch { return ''; }
    }
    if (url.startsWith('//') || /^[^/?#]*:/.test(url) || /\s/.test(url)) return '';
    return url;
  }

  function color(value, fallback) {
    if (typeof value !== 'string') return fallback;
    const v = value.trim();
    if (/^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.test(v) || /^(?:transparent|black|white|currentcolor)$/i.test(v)) return v;
    const m = v.match(/^(rgba?|hsla?)\(([^()]*)\)$/i);
    if (!m) return fallback;
    const parts = m[2].split(',').map(s => s.trim());
    const alpha = m[1].toLowerCase().endsWith('a');
    if (parts.length !== (alpha ? 4 : 3)) return fallback;
    if (alpha && (!/^(?:0(?:\.\d+)?|1(?:\.0+)?)$/.test(parts[3]) || Number(parts[3]) > 1)) return fallback;
    const rgb = m[1].toLowerCase().startsWith('rgb');
    for (let i = 0; i < 3; i++) {
      const p = parts[i], percent = p.endsWith('%');
      if (!/^-?\d+(?:\.\d+)?%?$/.test(p)) return fallback;
      const n = parseFloat(p);
      if (rgb ? n < 0 || n > (percent ? 100 : 255) : i ? !percent || n < 0 || n > 100 : percent || Math.abs(n) > 3600) return fallback;
    }
    return v;
  }

  const numberField = (label, fallback, min, max, step = 1) => ({ label, type: 'number', default: fallback, min, max, step });
  const selectField = (label, fallback, options) => ({ label, type: 'select', default: fallback, options });
  const FIELD_SCHEMA = {
    id: { label: 'ID', type: 'id', default: '' }, type: selectField('Type', 'text', TYPES.map(t => t.id)),
    name: { label: 'Layer name', type: 'text', default: 'Text' }, postId: { label: 'Post', type: 'text', default: '' }, group: { label: 'Group', type: 'text', default: '' },
    positionMode: selectField('Scroll behavior', 'page', ['page', 'fixed']),
    x: numberField('Left', 24, -4000, 4000), y: numberField('Top', 180, -4000, 12000),
    width: numberField('Width', 260, 1, 4000), height: numberField('Height', 64, 1, 12000),
    rotation: numberField('Rotation', 0, -360, 360), opacity: numberField('Opacity', 1, 0, 1, .01),
    visible: { label: 'Visible', type: 'boolean', default: true }, locked: { label: 'Locked', type: 'boolean', default: false },
    background: { label: 'Background', type: 'color', default: 'transparent' }, color: { label: 'Text color', type: 'color', default: '#edf4fb' },
    frameStyle: selectField('Frame style', 'none', FRAMES.map(frame => frame.id)),
    borderColor: { label: 'Border color', type: 'color', default: '#33465b' }, borderWidth: numberField('Border width', 0, 0, 40, .5),
    borderStyle: selectField('Border style', 'solid', ['solid', 'dashed', 'dotted', 'double', 'none']), radius: numberField('Corner radius', 0, 0, 1000), padding: numberField('Padding', 0, 0, 200),
    shadowMode: selectField('Shadow type', 'none', ['none', 'box', 'silhouette']), shadowOpacity: numberField('Shadow opacity', .5, 0, 1, .01),
    shadowColor: { label: 'Shadow color', type: 'color', default: '#00000066' }, shadowBlur: numberField('Shadow blur', 0, 0, 200),
    shadowX: numberField('Shadow left / right', 0, -200, 200), shadowY: numberField('Shadow up / down', 0, -200, 200), shadowSpread: numberField('Shadow spread', 0, -100, 100),
    backdropBlur: numberField('Background blur', 0, 0, 80), blendMode: selectField('Blend mode', 'normal', ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'soft-light', 'hard-light', 'difference', 'exclusion', 'color-dodge', 'color-burn', 'hue', 'saturation', 'color', 'luminosity']),
    effectMask: selectField('Media mask', 'none', ['none', 'edge']), edgeWidth: numberField('Edge width', 12, 1, 60), edgeSoftness: numberField('Edge softness', 0, 0, 24),
    symbolSource: selectField('Symbol source', 'none', ['none', 'library', 'custom']),
    symbolId: { label: 'Symbol', type: 'symbolid', default: '' }, symbolSrc: { label: 'Your symbol artwork', type: 'url', default: '' },
    symbolWeight: selectField('Symbol weight', 'regular', ['thin', 'light', 'regular', 'bold', 'fill', 'duotone']),
    symbolSize: numberField('Symbol size', 32, 8, 240), symbolRotation: numberField('Symbol rotation', 0, -360, 360),
    symbolScaleX: numberField('Symbol width scale', 1, .25, 4, .05), symbolScaleY: numberField('Symbol height scale', 1, .25, 4, .05),
    symbolFlipX: { label: 'Flip symbol horizontally', type: 'boolean', default: false }, symbolFlipY: { label: 'Flip symbol vertically', type: 'boolean', default: false },
    symbolColor: { label: 'Symbol color', type: 'color', default: '#d9effa' }, symbolAccent: { label: 'Symbol accent', type: 'color', default: '#67d9ca' },
    symbolOpacity: numberField('Symbol opacity', 1, 0, 1, .01), symbolGap: numberField('Symbol and label gap', 8, 0, 80),
    symbolPlacement: selectField('Symbol and label', 'before', ['before', 'after', 'above', 'below', 'only', 'label']),
    symbolFinish: selectField('Symbol finish', 'plain', ['plain', 'metal', 'glass', 'carved', 'hologram']),
    symbolGlow: numberField('Symbol glow', 0, 0, 40), symbolGlowColor: { label: 'Symbol glow color', type: 'color', default: '#67d9ca' },
    text: { label: 'Text', type: 'text', default: 'Your text' }, fontFamily: { label: 'Font', type: 'font', default: 'system-ui, sans-serif' },
    fontSize: numberField('Font size', 18, 8, 160, .5), fontWeight: numberField('Font weight', 500, 100, 900, 100), lineHeight: numberField('Line height', 1.4, .8, 3, .05), letterSpacing: numberField('Letter spacing', 0, -5, 30, .1),
    textAlign: selectField('Text alignment', 'left', ['left', 'center', 'right', 'justify']), verticalAlign: selectField('Vertical alignment', 'top', ['top', 'middle', 'bottom']),
    italic: { label: 'Italic', type: 'boolean', default: false }, underline: { label: 'Underline', type: 'boolean', default: false }, uppercase: { label: 'Uppercase', type: 'boolean', default: false },
    src: { label: 'Media URL', type: 'url', default: '' }, poster: { label: 'Video poster', type: 'url', default: '' }, fit: selectField('Media fit', 'contain', ['contain', 'cover', 'fill', 'none', 'scale-down']),
    focalX: numberField('Horizontal focus', 50, 0, 100), focalY: numberField('Vertical focus', 50, 0, 100),
    brightness: numberField('Brightness', 100, 0, 200), contrast: numberField('Contrast', 100, 0, 200), saturation: numberField('Saturation', 100, 0, 200), grayscale: numberField('Grayscale', 0, 0, 100), blur: numberField('Media blur', 0, 0, 50, .5),
    autoplay: { label: 'Autoplay', type: 'boolean', default: false }, loop: { label: 'Loop', type: 'boolean', default: true }, muted: { label: 'Muted', type: 'boolean', default: true }, playbackRate: numberField('Playback speed', 1, .25, 3, .05),
    action: selectField('Action', 'none', ['none', 'appreciate', 'reply', 'share', 'keep', 'keeps', 'create']),
    motion: selectField('Motion', 'none', ['none', 'fade', 'float', 'pulse']), duration: numberField('Duration', 3, .1, 120, .1), delay: numberField('Delay', 0, 0, 120, .1), distance: numberField('Movement distance', 8, 0, 400),
    easing: selectField('Easing', 'ease-in-out', ['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out'])
  };
  for (const field of Object.values(FIELD_SCHEMA)) { if (field.options) Object.freeze(field.options); Object.freeze(field); }
  Object.freeze(FIELD_SCHEMA);

  const PROPERTY_GROUPS = Object.freeze([
    { id: 'layout', label: 'Position & size', fields: ['name', 'positionMode', 'x', 'y', 'width', 'height', 'rotation', 'opacity', 'visible', 'locked'] },
    { id: 'surface', label: 'Surface', fields: ['frameStyle', 'background', 'borderColor', 'borderWidth', 'borderStyle', 'radius', 'padding', 'backdropBlur', 'blendMode'] },
    { id: 'mask', label: 'Media edge mask', fields: ['effectMask', 'edgeWidth', 'edgeSoftness'] },
    { id: 'text', label: 'Text', fields: ['text', 'color', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textAlign', 'verticalAlign', 'italic', 'underline', 'uppercase'] },
    { id: 'media', label: 'Image & video', fields: ['src', 'poster', 'fit', 'focalX', 'focalY', 'brightness', 'contrast', 'saturation', 'grayscale', 'blur', 'autoplay', 'loop', 'muted', 'playbackRate'] },
    { id: 'symbol', label: 'Symbol', fields: ['symbolSource', 'symbolId', 'symbolSrc', 'symbolWeight', 'symbolSize', 'symbolRotation', 'symbolScaleX', 'symbolScaleY', 'symbolFlipX', 'symbolFlipY', 'symbolColor', 'symbolAccent', 'symbolOpacity', 'symbolPlacement', 'symbolGap', 'symbolFinish', 'symbolGlow', 'symbolGlowColor'] },
    { id: 'shadow', label: 'Shadow & light', fields: ['shadowMode', 'shadowOpacity', 'shadowColor', 'shadowBlur', 'shadowX', 'shadowY', 'shadowSpread'] },
    { id: 'interaction', label: 'Action & motion', fields: ['action', 'motion', 'duration', 'delay', 'distance', 'easing'] }
  ].map(g => Object.freeze({ ...g, fields: Object.freeze(g.fields) })));

  function typeDefaults(type) {
    const values = Object.fromEntries(Object.entries(FIELD_SCHEMA).map(([key, field]) => [key, field.default]));
    values.type = type;
    values.name = TYPES.find(t => t.id === type).label;
    if (type === 'image') Object.assign(values, { width: 326, height: 320, src: 'bg/bg04.jpg', text: '', radius: 16 });
    if (type === 'video') Object.assign(values, { width: 326, height: 240, src: 'lib/clips/v1-feed-swirl.mp4', poster: 'lib/stills/v1-feed-swirl.jpg', text: '', background: '#05090e', radius: 16 });
    if (type === 'avatar') Object.assign(values, { width: 44, height: 44, src: 'asgard/avatars/a17.jpg', text: '', radius: 1000, background: '#203149' });
    if (type === 'button') Object.assign(values, { width: 128, height: 44, text: 'Button', background: '#1a2b3e', color: '#d9effa', borderWidth: 1, radius: 12, padding: 8, fontSize: 14, fontWeight: 600, textAlign: 'center', verticalAlign: 'middle', lineHeight: 1.15, symbolSize: 24 });
    if (type === 'symbol') Object.assign(values, { width: 64, height: 64, text: '', name: 'Symbol', symbolPlacement: 'only', padding: 4, fontSize: 14, textAlign: 'center', verticalAlign: 'middle', lineHeight: 1.15 });
    if (type === 'shape') Object.assign(values, { width: 180, height: 120, text: '', background: '#132235', radius: 16 });
    if (type === 'divider') Object.assign(values, { width: 342, height: 1, text: '', background: '#29394b' });
    return values;
  }

  function normalizeElement(input, expectedType) {
    const source = record(input) ? input : {};
    const type = choice(expectedType || source.type, TYPES.map(t => t.id), 'text');
    const base = typeDefaults(type), out = { ...base };
    for (const [key, field] of Object.entries(FIELD_SCHEMA)) {
      const value = source[key];
      if (field.type === 'number') out[key] = finite(value, base[key], field.min, field.max, key === 'fontWeight');
      else if (field.type === 'boolean') out[key] = bool(value, base[key]);
      else if (field.type === 'select') out[key] = choice(value, field.options, base[key]);
      else if (field.type === 'color') out[key] = color(value, base[key]);
      else if (field.type === 'url') out[key] = value === undefined ? base[key] : safeURL(value);
      else if (field.type === 'font') out[key] = typeof value === 'string' && /^[a-z0-9\s,'"._-]{1,160}$/i.test(value) ? value : base[key];
      else if (field.type === 'text') out[key] = text(value, base[key], key === 'text' ? LIMITS.text : 120);
      else if (field.type === 'symbolid') out[key] = typeof value === 'string' && /^(?:ph|as):[a-z0-9][a-z0-9-]{0,100}$/.test(value) ? value : '';
    }
    out.type = type;
    out.id = identifier(source.id) || uid(type);
    out.postId = identifier(source.postId);
    out.group = text(source.group, '', 120);
    return out;
  }

  function createElement(type, overrides = {}) {
    return normalizeElement(clone(record(overrides) ? overrides : {}), type);
  }

  function normalize(input) {
    const source = record(input) ? clone(input) : {};
    const page = record(source.page) ? source.page : {};
    const height = finite(page.height, 844, 320, 2400, true);
    const seen = new Set();
    const elements = (Array.isArray(source.elements) ? source.elements : []).slice(0, LIMITS.layers).filter(record).map(e => {
      const element = normalizeElement(e);
      if (seen.has(element.id)) element.id = uid(element.type);
      seen.add(element.id);
      return element;
    });
    return {
      ...source,
      version: 1,
      page: {
        ...page, title: text(page.title, 'Gathering', 160), width: finite(page.width, 390, 240, 1600, true), height,
        contentHeight: finite(page.contentHeight, Math.max(1400, height), height, LIMITS.contentHeight, true),
        background: color(page.background, '#080e18'), backgroundImage: safeURL(page.backgroundImage), backgroundOpacity: finite(page.backgroundOpacity, 1, 0, 1),
        backgroundFit: choice(page.backgroundFit, ['contain', 'cover', 'fill'], 'cover'),
        previewBackdrop: page.previewBackdrop === undefined ? 'asgard/sky.jpeg' : safeURL(page.previewBackdrop), previewBackdropFit: choice(page.previewBackdropFit, ['contain', 'cover', 'fill'], 'cover'),
        padding: finite(page.padding, 16, 0, 160), grid: finite(page.grid, 8, 1, 64, true), snap: bool(page.snap, true)
      },
      elements, vocabulary: { ...(record(source.vocabulary) ? source.vocabulary : {}), ...VOCABULARY }
    };
  }

  function createDocument(presetId = 'content') {
    const preset = PRESETS.some(p => p.id === presetId) ? presetId : 'content';
    const doc = normalize({ preset, page: {}, elements: [] });
    if (preset === 'blank') return doc;
    const add = (type, name, x, y, width, height, more = {}) => {
      const element = createElement(type, { name, x, y, width, height, ...more });
      doc.elements.push(element); return element;
    };
    const label = (name, value, x, y, width, height, more = {}) => add('text', name, x, y, width, height, { text: value, ...more });
    const button = (name, value, action, x, y, width, more = {}) => add('button', name, x, y, width, 44, { text: value, action, ...more });
    const card = (postId, y, height) => add('shape', postId + ' · Card', 16, y, 358, height, { postId, group: postId, background: '#0e1928', borderWidth: 1, borderColor: '#24364a', radius: 20 });
    const author = (postId, y, second = false, left = 32) => {
      const shared = { postId, group: postId };
      add('avatar', postId + ' · Author photo', left, y, 44, 44, { ...shared, src: second ? 'asgard/avatars/a12.jpg' : 'asgard/avatars/a17.jpg' });
      label(postId + ' · Author name', second ? 'Vidar' : 'Saga', left + 56, y - 1, 240, 25, { ...shared, fontSize: 18, fontWeight: 700 });
      label(postId + ' · Author details', second ? '@vidar · 1 hour ago' : '@saga · 12 minutes ago', left + 56, y + 26, 240, 20, { ...shared, fontSize: 13, color: '#9aafc3' });
    };
    const actions = (postId, y, left = 32, minimal = false) => {
      const shared = { postId, group: postId, fontSize: 13, borderColor: '#30455c', ...(minimal ? { background: 'transparent', borderWidth: 0, padding: 2 } : {}) };
      button(postId + ' · Appreciate', 'Appreciate', 'appreciate', left, y, 94, shared);
      button(postId + ' · Reply', 'Reply', 'reply', left + 100, y, 56, shared);
      button(postId + ' · Pass Along', 'Pass Along', 'share', left + 162, y, 100, shared);
      button(postId + ' · Keep', 'Keep', 'keep', left + 268, y, 58, { ...shared, color: '#99e3ee', borderColor: '#3e7986' });
    };
    const nav = () => {
      add('shape', 'Navigation background', 16, 1332, 358, 52, { background: '#111f30', borderWidth: 1, borderColor: '#293e53', radius: 16 });
      ['Home', 'Swap', 'Track', 'Share', 'Raven'].forEach((word, i) => button('Navigation · ' + word, word, 'none', 23 + i * 70, 1336, 64, { fontSize: 13, background: 'transparent', borderWidth: 0, padding: 0, color: i ? '#a6b9cd' : '#a2e7ef' }));
    };
    label('Page title', 'Gathering', 20, 24, 240, 42, { fontSize: 30, fontWeight: 750, lineHeight: 1.2, letterSpacing: -.6 });
    button('Your Keeps', 'Your Keeps', 'keeps', 270, 24, 100, { fontSize: 13, background: 'transparent', borderWidth: 0, padding: 2, color: '#9fe5ed' });
    label('Page introduction', preset === 'conversation' ? 'Every story starts a conversation.' : 'Memes, moments & stories.', 20, 78, 214, 40, { fontSize: 14, color: '#9caec2', lineHeight: 1.35 });
    button('Create Saga', 'Create Saga', 'create', 244, 72, 126, { background: '#b5edf0', color: '#09212a', borderWidth: 0, fontWeight: 700 });
    add('divider', 'Header divider', 16, 132, 358, 1);

    if (preset === 'conversation') {
      card('sample-1', 152, 660); author('sample-1', 174);
      label('sample-1 · Question', 'What is one small thing\nthat made today better?', 32, 240, 326, 96, { postId: 'sample-1', group: 'sample-1', fontSize: 27, fontWeight: 700, lineHeight: 1.22 });
      add('image', 'sample-1 · Photo', 32, 352, 326, 220, { postId: 'sample-1', group: 'sample-1', src: 'asgard/sky.jpeg', background: '#070c14' });
      label('sample-1 · Caption', 'A good view. A kind message.\nThere is always a story worth sharing.', 32, 590, 326, 56, { postId: 'sample-1', group: 'sample-1', fontSize: 17, color: '#d6e2ee' });
      button('sample-1 · Reply', 'Reply', 'reply', 32, 664, 326, { postId: 'sample-1', group: 'sample-1', background: '#b5edf0', color: '#09212a', borderWidth: 0, fontSize: 17, fontWeight: 700 });
      [['Appreciate', 'appreciate'], ['Pass Along', 'share'], ['Keep', 'keep']].forEach(([word, action], i) => button('sample-1 · ' + word, word, action, 32 + i * 111, 732, 104, { postId: 'sample-1', group: 'sample-1', fontSize: 13, ...(action === 'keep' ? { color: '#99e3ee', borderColor: '#3e7986' } : {}) }));
      card('sample-2', 846, 450); author('sample-2', 866, true);
      label('sample-2 · Title', 'A thought to keep.', 32, 938, 326, 36, { postId: 'sample-2', group: 'sample-2', fontSize: 23, fontWeight: 650, color: '#a4e6ed' });
      label('sample-2 · Text post', 'Life is short.\nTake the scenic route.', 32, 994, 326, 106, { postId: 'sample-2', group: 'sample-2', fontSize: 29, fontWeight: 700, lineHeight: 1.35 });
      label('sample-2 · Caption', 'A small reminder from the feed.', 32, 1130, 326, 40, { postId: 'sample-2', group: 'sample-2', fontSize: 16, color: '#bac9d8' });
      label('sample-2 · Counts', '24 appreciations · 8 replies', 32, 1180, 326, 22, { postId: 'sample-2', group: 'sample-2', fontSize: 13, color: '#91a6bd' });
      actions('sample-2', 1228);
    } else if (preset === 'minimal') {
      doc.page.background = '#090e15';
      author('sample-1', 156, false, 20);
      add('image', 'sample-1 · Photo', 16, 220, 358, 370, { postId: 'sample-1', group: 'sample-1', src: 'bg/bg04.jpg', radius: 12, background: '#070b10' });
      label('sample-1 · Caption', 'Some nights you just need a bigger view.', 20, 610, 350, 62, { postId: 'sample-1', group: 'sample-1', fontSize: 18, lineHeight: 1.4 });
      label('sample-1 · Counts', '18 appreciations · 6 replies', 20, 680, 350, 22, { postId: 'sample-1', group: 'sample-1', fontSize: 13, color: '#91a6bd' });
      actions('sample-1', 718, 32, true);
      add('divider', 'Post divider', 20, 792, 350, 1, { background: '#293647' });
      author('sample-2', 820, true, 20);
      add('image', 'sample-2 · Meme photo', 20, 886, 350, 250, { postId: 'sample-2', group: 'sample-2', src: 'asgard/sky.jpeg', radius: 10 });
      label('sample-2 · Meme headline', 'I NEEDED SOME SPACE.', 38, 928, 314, 90, { postId: 'sample-2', group: 'sample-2', textAlign: 'center', fontSize: 29, fontWeight: 800, lineHeight: 1.18, shadowColor: '#000000', shadowBlur: 8, shadowY: 2 });
      label('sample-2 · Meme punchline', 'Found plenty.', 38, 1050, 314, 50, { postId: 'sample-2', group: 'sample-2', textAlign: 'center', fontSize: 27, fontWeight: 750, shadowColor: '#000000', shadowBlur: 8 });
      label('sample-2 · Caption', 'A little perspective for your day.', 20, 1156, 350, 42, { postId: 'sample-2', group: 'sample-2', fontSize: 17, color: '#bdcbd9' });
      actions('sample-2', 1222, 32, true);
    } else {
      card('sample-1', 152, 650); author('sample-1', 172);
      add('image', 'sample-1 · Photo', 32, 236, 326, 358, { postId: 'sample-1', group: 'sample-1', src: 'bg/bg04.jpg', background: '#080f19', radius: 14 });
      label('sample-1 · Caption', 'Some nights you just need a bigger view.', 32, 612, 326, 62, { postId: 'sample-1', group: 'sample-1', fontSize: 18, lineHeight: 1.4 });
      label('sample-1 · Counts', '18 appreciations · 6 replies', 32, 688, 326, 22, { postId: 'sample-1', group: 'sample-1', fontSize: 13, color: '#91a6bd' });
      actions('sample-1', 738);
      card('sample-2', 834, 462); author('sample-2', 854, true);
      add('image', 'sample-2 · Meme photo', 32, 918, 326, 244, { postId: 'sample-2', group: 'sample-2', src: 'asgard/sky.jpeg', radius: 14 });
      label('sample-2 · Meme headline', 'I NEEDED\nSOME SPACE.', 48, 946, 294, 96, { postId: 'sample-2', group: 'sample-2', textAlign: 'center', fontSize: 29, fontWeight: 800, lineHeight: 1.18, shadowColor: '#000000', shadowBlur: 8, shadowY: 2 });
      label('sample-2 · Meme punchline', 'Found plenty.', 48, 1080, 294, 48, { postId: 'sample-2', group: 'sample-2', textAlign: 'center', fontSize: 25, fontWeight: 750, shadowColor: '#000000', shadowBlur: 8 });
      label('sample-2 · Caption', 'A little perspective for your day.', 32, 1180, 326, 34, { postId: 'sample-2', group: 'sample-2', fontSize: 16, color: '#bdcbd9' });
      actions('sample-2', 1228);
    }
    nav();
    return normalize(doc);
  }

  return Object.freeze({ PRESETS, TYPES, FRAMES, LIMITS, VOCABULARY, FIELD_SCHEMA, PROPERTY_GROUPS, createDocument, createElement, normalize, clone, uid, safeURL });
});
