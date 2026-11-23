/* Asgard post-page preview. All gestures and sample interactions stay in this workspace. */
(function (global) {
  'use strict';

  const STYLE_ID = 'asgard-post-renderer-style';
  const CSS = `
    .apr-root{height:100%;min-height:0;display:flex;flex-direction:column;color:#e9f0f6;font:14px/1.4 system-ui,sans-serif;isolation:isolate}
    .apr-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:12px 16px;flex:none;border-bottom:1px solid #263642;background:#101a23}
    .apr-title{display:flex;align-items:center;gap:9px;font-weight:650}.apr-mode{font-size:11px;font-weight:600;letter-spacing:.025em;color:#b7c9d8;border:1px solid #344957;border-radius:5px;padding:3px 7px}
    .apr-tools{display:flex;align-items:center;gap:6px}.apr-tools button{appearance:none;font:inherit;color:#dce8f0;border:1px solid #354955;background:#182731;min-width:40px;min-height:36px;padding:6px 10px;border-radius:7px;cursor:pointer}
    .apr-tools button:hover{border-color:#88d6c2}.apr-tools button[aria-pressed=true]{background:#1b453e;color:#d4fff1;border-color:#62b39c}.apr-tools button:focus-visible{outline:2px solid #f3c56a;outline-offset:2px}.apr-zoom{min-width:38px;text-align:center;font-size:12px;color:#9cb3c5}
    .apr-stage{position:relative;flex:1;min-height:0;overflow:auto;display:grid;place-items:center;padding:16px;background:radial-gradient(ellipse at 50% 38%,#1b2c3a 0,#101923 50%,#0a111a 100%);overscroll-behavior:contain}
    .apr-device-space{position:relative;flex:none;margin:auto}.apr-device{position:absolute;top:0;left:0;box-sizing:border-box;padding:9px;border:1px solid #53616a;border-radius:35px;background:#06090d;box-shadow:0 18px 45px #0008,inset 0 0 0 2px #1c252b;transform-origin:top left}
    .apr-phone-inner{position:relative;overflow:hidden;border-radius:26px;background:#080e18;isolation:isolate}.apr-preview-backdrop{position:absolute;inset:0;pointer-events:none;background-position:center;background-repeat:no-repeat;background-color:#080e18}.ap-phone-viewport{position:relative;z-index:1;overflow:auto;overflow-x:hidden;width:100%;height:100%;scrollbar-width:thin;scrollbar-color:#546776 transparent;overscroll-behavior:contain;outline:none;touch-action:pan-y}
    .apr-fixed{position:absolute;inset:0;z-index:10010;pointer-events:none;overflow:visible}.apr-fixed>.apr-layer{pointer-events:auto}.apr-frame{position:absolute;inset:0;pointer-events:none;border-radius:inherit;z-index:2;overflow:visible}.apr-frame-ring,.apr-frame-detail{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;box-sizing:border-box}.apr-frame[hidden]{display:none}.apr-defs{position:absolute;width:0;height:0;overflow:hidden;pointer-events:none}
    .ap-phone-viewport:focus-visible{box-shadow:inset 0 0 0 2px #e6bd73}.apr-page{position:relative;min-height:100%;isolation:isolate;overflow:hidden;background:transparent}.apr-page-background{position:absolute;inset:0;pointer-events:none;z-index:0;background-repeat:no-repeat;background-position:center top}
    .apr-layer{position:absolute;box-sizing:border-box;transform-origin:center;outline:none;-webkit-tap-highlight-color:transparent;touch-action:pan-y}
    .apr-edit .apr-layer{cursor:grab;touch-action:none}.apr-edit .apr-layer[data-locked=true]{cursor:pointer}.apr-edit .apr-layer:focus-visible{outline:2px dashed #dfba76;outline-offset:2px}.apr-dragging .apr-layer{cursor:grabbing}
    .apr-body{box-sizing:border-box;width:100%;height:100%;overflow:hidden;transform-origin:center;position:relative}.apr-copy{display:flex;flex-direction:column;white-space:pre-wrap;overflow-wrap:anywhere;word-break:normal}.apr-copy>span{width:100%;box-sizing:border-box}
    .apr-press{appearance:none;display:flex;width:100%;height:100%;align-items:center;justify-content:center;margin:0;box-sizing:border-box;color:inherit;background:transparent;border:0;border-radius:inherit;font:inherit;letter-spacing:inherit;white-space:pre-wrap;overflow-wrap:anywhere;cursor:pointer;text-transform:inherit;text-decoration:inherit;box-shadow:none;line-height:inherit}
    .apr-press:hover{background:#ffffff0c}.apr-press:active{background:#ffffff18}.apr-press:focus-visible{outline:2px solid #f3c56a;outline-offset:-3px}.apr-press[aria-pressed=true]{box-shadow:inset 0 0 0 1px #7ad8bf;background:#72c7ae18}
    .apr-edit .apr-press{pointer-events:none}.apr-media{display:block;box-sizing:border-box;width:100%;height:100%;border:0;user-select:none;-webkit-user-drag:none}.apr-media-fallback{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:12px;font:500 14px/1.4 system-ui,sans-serif;color:#9bb3c5;background:linear-gradient(145deg,#162531,#0b151f)}
    .apr-media-fallback[hidden]{display:none}.apr-selection{box-sizing:border-box;position:absolute;z-index:10001;border:1.5px solid #eac379;pointer-events:none;transform-origin:center;box-shadow:0 0 0 1px #0a1118cc}
    .apr-selection[hidden]{display:none}.apr-selection-name{position:absolute;left:-1px;top:-24px;max-width:220px;background:#eac379;color:#15202a;padding:3px 7px;font:650 11px/16px system-ui,sans-serif;border-radius:4px 4px 0 0;text-overflow:ellipsis;overflow:hidden;white-space:nowrap}
    .apr-resize{position:absolute;right:-7px;bottom:-7px;width:15px;height:15px;border:2px solid #111b24;border-radius:3px;background:#eac379;pointer-events:auto;padding:0;cursor:nwse-resize;touch-action:none}
    .apr-resize:focus-visible{outline:2px solid white;outline-offset:2px}.apr-resize[hidden]{display:none}.apr-guide{position:absolute;pointer-events:none;z-index:9999;box-sizing:border-box;border:1px dashed #a8c9db26}.apr-grid{position:absolute;inset:0;pointer-events:none;z-index:0;background-image:radial-gradient(#afd0df44 .65px,transparent .65px)}
    .apr-footer{flex:none;min-height:42px;display:flex;align-items:center;justify-content:center;text-align:center;padding:9px 14px;color:#a2b7c8;font-size:12px;line-height:1.45;border-top:1px solid #253542;background:#101a23}
    .apr-toast{position:absolute;z-index:10050;left:14px;right:14px;bottom:20px;border-radius:12px;background:#132c2bf5;color:#d5f9eb;border:1px solid #4a8271;padding:12px 14px;font:500 14px/1.4 system-ui,sans-serif;box-shadow:0 5px 22px #0005;pointer-events:none}.apr-toast[hidden]{display:none}
    .apr-backdrop{position:absolute;inset:0;z-index:10020;background:#030910a8;display:flex;flex-direction:column;justify-content:flex-end;backdrop-filter:blur(4px)}
    .apr-sheet{position:relative;box-sizing:border-box;max-height:88%;overflow:auto;overscroll-behavior:contain;border:1px solid #334a5b;border-bottom:0;border-radius:22px 22px 0 0;background:#101d29;color:#e7f0f5;box-shadow:0 -12px 40px #0007;padding:18px;scrollbar-width:thin;scrollbar-color:#587083 transparent;font:14px/1.45 system-ui,sans-serif}
    .apr-sheet-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px}.apr-sheet h2{font-size:21px;font-weight:650;line-height:1.2;margin:0}.apr-sheet p{margin:8px 0 14px}.apr-sheet .apr-meta{font-size:12px;color:#93aabd;line-height:1.45}.apr-sheet button{appearance:none;box-sizing:border-box;min-height:44px;padding:10px 14px;border:1px solid #395164;border-radius:10px;color:#e7f0f5;background:#1a2d3b;font:600 14px/1.35 system-ui,sans-serif;cursor:pointer;white-space:normal}
    .apr-sheet button:hover{border-color:#87d8bd}.apr-sheet button:focus-visible,.apr-sheet textarea:focus-visible,.apr-sheet input:focus-visible{outline:2px solid #eac379;outline-offset:2px}.apr-sheet .apr-close{min-height:36px;padding:7px 11px;background:#162531;font-size:12px}.apr-sheet .apr-primary{background:#a4dccb;border-color:#a4dccb;color:#112c29}.apr-sheet form{display:flex;flex-direction:column;gap:10px;margin-top:14px}.apr-sheet textarea{box-sizing:border-box;width:100%;min-height:88px;resize:vertical;border:1px solid #3c5465;border-radius:10px;background:#0b1720;color:#edf5fa;padding:12px;font:400 15px/1.5 system-ui,sans-serif}.apr-sheet textarea::placeholder{color:#93aabd}.apr-sheet .apr-option{display:block;width:100%;margin:8px 0;text-align:left}.apr-sheet .apr-option small{display:block;font-weight:400;color:#9db7c9;margin-top:4px}.apr-sheet .apr-message{border-top:1px solid #2a4050;padding:12px 0}.apr-message strong{display:block;color:#b6e0d3;font-size:12px;margin-bottom:4px}.apr-message p{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}.apr-sheet .apr-context{display:flex;gap:10px;align-items:center;border:1px solid #2c4150;background:#0c1822;border-radius:12px;padding:9px;margin:12px 0;color:#b9cbd7}.apr-context img{width:56px;height:56px;border-radius:6px;object-fit:cover}.apr-context span{font-size:13px;overflow-wrap:anywhere}.apr-kept-card{border:1px solid #304857;border-radius:12px;overflow:hidden;margin:12px 0;background:#132330}.apr-kept-card img{display:block;width:100%;max-height:180px;object-fit:contain;background:#071018}.apr-kept-card p{padding:12px;margin:0}.apr-kept-card button{margin:0 12px 12px;font-size:12px}.apr-empty{color:#a7bdcc;padding:18px 0;text-align:center;line-height:1.6}
    @keyframes apr-fade{from{opacity:0}to{opacity:1}}@keyframes apr-float{0%,100%{transform:translateY(0)}50%{transform:translateY(calc(-1 * var(--apr-distance,5px)))}}@keyframes apr-pulse{0%,100%{transform:scale(1)}50%{transform:scale(var(--apr-pulse-scale,1.02))}}
    @media(prefers-reduced-motion:reduce){.apr-body{animation:none!important}}
    @media(max-width:650px){.apr-toolbar{padding:8px 10px;gap:6px}.apr-title{font-size:12px;gap:6px}.apr-tools button{padding:5px 8px;min-height:32px;min-width:33px}.apr-tools{gap:4px}.apr-footer{font-size:11px;padding:7px 9px;min-height:34px}.apr-stage{padding:10px}}
  `;

  const num = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const px = (value, fallback = 0) => num(value, fallback) + 'px';
  function node(tag, className, text) {
    const result = document.createElement(tag);
    if (className) result.className = className;
    if (text != null) result.textContent = text;
    return result;
  }
  function safeURL(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^data:image\/(?:png|jpe?g|webp|gif|avif|svg\+xml);base64,/i.test(raw)) return raw;
    try {
      const parsed = new URL(raw, location.href);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return raw;
      if (parsed.protocol === 'blob:' && new URL(raw.slice(5)).origin === location.origin) return raw;
    } catch (_) { /* Incomplete URLs are simply absent while the user types. */ }
    return '';
  }
  function imageCSS(url) { return url ? 'url("' + url.replace(/["\\\n\r]/g, c => '\\' + c) + '")' : 'none'; }
  function setText(el, value) { const next = String(value == null ? '' : value); if (el.textContent !== next) el.textContent = next; }
  function setStyle(el, styles) { for (const key in styles) if (el.style[key] !== String(styles[key])) el.style[key] = styles[key]; }

  let instanceCount = 0;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs) {
    const result = document.createElementNS(SVG_NS, tag);
    for (const key in attrs || {}) result.setAttribute(key, String(attrs[key]));
    return result;
  }
  function tint(color, amount, towards = 'white') { return 'color-mix(in srgb, ' + color + ' ' + amount + '%, ' + towards + ')'; }
  function shadowColor(element) { return tint(element.shadowColor || '#000000', clamp(num(element.shadowOpacity, .5), 0, 1) * 100, 'transparent'); }
  function frameCSS(style, element) {
    element = element || {};
    const width = Math.max(0, num(element.borderWidth, 2)), radius = Math.max(0, num(element.radius, 12)), color = element.borderColor || '#8ba4b8';
    const result = {
      position: 'absolute', inset: '0px', boxSizing: 'border-box', pointerEvents: 'none', borderRadius: px(radius),
      border: '0px solid transparent', backgroundColor: 'transparent', backgroundImage: 'none', backgroundSize: 'auto', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
      boxShadow: 'none', padding: '0px', maskImage: 'none', maskComposite: 'add', WebkitMaskImage: 'none', WebkitMaskComposite: 'source-over', opacity: '1'
    };
    if (!style || style === 'none' || !width) return result;
    if (style === 'line' || style === 'double' || style === 'cyan') {
      result.border = width + 'px ' + (style === 'double' ? 'double' : element.borderStyle || 'solid') + ' ' + color;
      if (style === 'cyan') result.boxShadow = '0 0 ' + Math.max(5, width * 3) + 'px ' + tint(color, 65, 'transparent') + ',inset 0 0 ' + Math.max(3, width * 2) + 'px ' + tint(color, 30, 'transparent');
      return result;
    }
    if (style === 'corners') {
      const length = Math.max(12, width * 5), horizontal = px(length) + ' ' + px(width), vertical = px(width) + ' ' + px(length);
      result.backgroundImage = Array(8).fill('linear-gradient(' + color + ',' + color + ')').join(',');
      result.backgroundSize = [horizontal, vertical, horizontal, vertical, horizontal, vertical, horizontal, vertical].join(',');
      result.backgroundPosition = 'left top,left top,right top,right top,left bottom,left bottom,right bottom,right bottom';
      return result;
    }
    result.padding = px(width);
    result.maskImage = 'linear-gradient(#fff 0 0),linear-gradient(#fff 0 0)';
    result.maskOrigin = 'content-box,border-box'; result.maskClip = 'content-box,border-box'; result.maskComposite = 'exclude';
    result.WebkitMaskImage = result.maskImage; result.WebkitMaskOrigin = 'content-box,border-box'; result.WebkitMaskClip = 'content-box,border-box'; result.WebkitMaskComposite = 'xor';
    const light = tint(color, 45), pale = tint(color, 18), dark = tint(color, 42, 'black'), deep = tint(color, 16, 'black');
    const gradients = {
      etched: 'repeating-linear-gradient(135deg,transparent 0 2px,#ffffff16 2px 3px,transparent 3px 7px),linear-gradient(135deg,' + light + ',' + dark + ' 22%,' + color + ' 48%,' + deep + ' 78%,' + light + ')',
      silver: 'repeating-linear-gradient(0deg,#ffffff17 0 1px,transparent 1px 3px),linear-gradient(130deg,' + pale + ' 0%,' + color + ' 16%,' + dark + ' 28%,' + pale + ' 45%,' + color + ' 57%,' + deep + ' 75%,' + light + ' 100%)',
      bronze: 'repeating-linear-gradient(25deg,#00000024 0 1px,transparent 1px 5px),linear-gradient(135deg,' + light + ',' + dark + ' 18%,' + color + ' 32%,' + light + ' 48%,' + dark + ' 71%,' + color + ')',
      stone: 'repeating-linear-gradient(145deg,#0000002c 0 2px,transparent 2px 9px,#ffffff0b 9px 12px),linear-gradient(25deg,' + dark + ',' + color + ' 32%,' + dark + ' 45%,' + light + ' 70%,' + dark + ')',
      obsidian: 'linear-gradient(152deg,transparent 0 39%,#ffffff34 39% 40%,transparent 40% 65%,#a0bad822 65% 66%,transparent 66%),linear-gradient(125deg,' + light + ',' + deep + ' 19%,' + dark + ' 48%,' + deep + ' 73%,' + light + ')',
      glass: 'linear-gradient(135deg,' + tint(color, 80, 'transparent') + ',#ffffff08 28%,#ffffff06 64%,' + tint(color, 50, 'transparent') + ' 86%,#ffffffa8)',
      frosted: 'repeating-linear-gradient(55deg,#ffffff16 0 1px,transparent 1px 3px),linear-gradient(135deg,' + pale + ',' + tint(color, 74, 'transparent') + ' 40%,' + light + ')',
      braid: 'repeating-linear-gradient(45deg,' + light + ' 0 2px,' + dark + ' 2px 4px,' + color + ' 4px 6px,transparent 6px 8px),repeating-linear-gradient(-45deg,' + dark + ' 0 2px,' + light + ' 2px 4px,' + color + ' 4px 6px,transparent 6px 8px)',
      gold: 'linear-gradient(125deg,' + pale + ',' + color + ' 14%,' + dark + ' 29%,' + light + ' 46%,' + color + ' 60%,' + deep + ' 77%,' + light + ')'
    };
    result.backgroundImage = gradients[style] || gradients.etched;
    return result;
  }
  function edgeMaskCSS(element) {
    if (element.effectMask !== 'edge') return 'none';
    const width = Math.max(1, num(element.width, 160)), height = Math.max(1, num(element.height, 40)), radius = clamp(num(element.radius, 0), 0, Math.min(width, height) / 2);
    const edge = clamp(num(element.edgeWidth, 12), 0, Math.min(width, height) / 2), soft = Math.max(0, num(element.edgeSoftness, 0));
    const filter = soft > 0 ? ' filter="url(#soft)"' : '';
    const markup = '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '"><defs><filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="' + soft / 2 + '"/></filter><mask id="ring" maskUnits="userSpaceOnUse" x="0" y="0" width="' + width + '" height="' + height + '"><rect width="' + width + '" height="' + height + '" rx="' + radius + '" fill="white"/><rect x="' + edge + '" y="' + edge + '" width="' + Math.max(0, width - edge * 2) + '" height="' + Math.max(0, height - edge * 2) + '" rx="' + Math.max(0, radius - edge) + '" fill="black"' + filter + '/></mask></defs><rect width="100%" height="100%" fill="white" mask="url(#ring)"/></svg>';
    return 'url("data:image/svg+xml,' + encodeURIComponent(markup) + '")';
  }

  function frameDetail(detail, element) {
    detail.replaceChildren();
    const width = Math.max(1, num(element.width, 160)), height = Math.max(1, num(element.height, 40)), line = Math.max(0, num(element.borderWidth, 2)), color = element.borderColor || '#8ba4b8';
    const r = clamp(num(element.radius, 0), 0, Math.min(width, height) / 2), inset = line / 2 + .5;
    detail.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
    if (!line) return;
    const outline = (at, opacity, strokeWidth) => detail.append(svg('rect', { x: at, y: at, width: Math.max(0, width - at * 2), height: Math.max(0, height - at * 2), rx: Math.max(0, r - at), fill: 'none', stroke: color, 'stroke-opacity': opacity, 'stroke-width': strokeWidth }));
    if (element.frameStyle === 'etched') {
      outline(.5, .85, 1); outline(Math.max(1, line - 1), .85, .7);
      const gap = Math.max(14, r + 6), paths = [];
      for (let x = gap; x < width - gap; x += 22) { paths.push('M' + x + ',1 l-3,' + Math.max(1, line - 2), 'M' + x + ',' + (height - 1) + ' l3,' + -Math.max(1, line - 2)); }
      detail.append(svg('path', { d: paths.join(' '), fill: 'none', stroke: '#101820', 'stroke-opacity': '.65', 'stroke-width': '.7' }));
    } else if (element.frameStyle === 'stone') {
      const marks = [
        'M' + width * .21 + ',0 l-2,' + line * .45 + ' 4,' + line * .4,
        'M' + width * .64 + ',0 l3,' + line * .5 + ' -5,' + line * .4,
        'M0,' + height * .31 + ' l' + line * .5 + ',3 ' + line * .4 + ',-1',
        'M' + width + ',' + height * .62 + ' l' + -line * .55 + ',-3 ' + -line * .35 + ',4',
        'M' + width * .41 + ',' + height + ' l-3,' + -line * .5 + ' 2,' + -line * .35
      ];
      detail.append(svg('path', { d: marks.join(' '), fill: 'none', stroke: '#090e15', 'stroke-opacity': '.7', 'stroke-width': 1.2 })); outline(.6, .3, 1);
    } else if (element.frameStyle === 'braid') {
      const x0 = inset, y0 = inset, w = Math.max(1, width - inset * 2), h = Math.max(1, height - inset * 2), radius = clamp(r - inset, 0, Math.min(w, h) / 2);
      const straightX = Math.max(0, w - radius * 2), straightY = Math.max(0, h - radius * 2), arc = Math.PI * radius / 2;
      const lengths = [straightX, arc, straightY, arc, straightX, arc, straightY, arc], perimeter = lengths.reduce((a, b) => a + b, 0);
      function boundary(at) {
        let segment = 0; while (segment < 7 && at > lengths[segment]) { at -= lengths[segment]; segment++; }
        if (segment === 0) return [x0 + radius + at, y0, 0, -1];
        if (segment === 2) return [x0 + w, y0 + radius + at, 1, 0];
        if (segment === 4) return [x0 + w - radius - at, y0 + h, 0, 1];
        if (segment === 6) return [x0, y0 + h - radius - at, -1, 0];
        const quarter = (segment - 1) / 2, angle = -Math.PI / 2 + quarter * Math.PI / 2 + (radius ? at / radius : 0);
        const cx = quarter < 2 ? x0 + w - radius : x0 + radius, cy = quarter === 0 || quarter === 3 ? y0 + radius : y0 + h - radius;
        return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius, Math.cos(angle), Math.sin(angle)];
      }
      for (const strand of [-1, 1]) {
        const points = [], amplitude = Math.max(.7, line * .22), period = Math.max(10, line * 2.8);
        for (let at = 0; at <= perimeter + 1; at += 2) { const q = boundary(Math.min(at, perimeter)), offset = Math.sin(at / period * Math.PI * 2) * amplitude * strand; points.push((q[0] + q[2] * offset).toFixed(2) + ',' + (q[1] + q[3] * offset).toFixed(2)); }
        detail.append(svg('polyline', { points: points.join(' '), fill: 'none', stroke: strand > 0 ? '#f1ebe0' : '#18212b', 'stroke-opacity': strand > 0 ? '.68' : '.76', 'stroke-width': Math.max(.8, line * .24), 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
      }
    } else if (element.frameStyle === 'obsidian' || element.frameStyle === 'silver' || element.frameStyle === 'gold' || element.frameStyle === 'glass') { outline(.6, .7, .8); outline(Math.max(1, line - .6), .4, .6); }
  }

  function mount(host, C) {
    if (!host || !C || typeof C.subscribe !== 'function') throw new Error('The post preview needs a host and controller.');
    if (!document.getElementById(STYLE_ID)) {
      const style = node('style'); style.id = STYLE_ID; style.textContent = CSS; document.head.appendChild(style);
    }
    const instance = ++instanceCount;
    const root = node('section', 'apr-root'); root.setAttribute('aria-label', 'Live phone preview');
    const filters = svg('svg', { class: 'apr-defs', 'aria-hidden': 'true', focusable: 'false' }), filterDefs = svg('defs'); filters.append(filterDefs);
    const toolbar = node('div', 'apr-toolbar');
    const title = node('div', 'apr-title', 'Phone preview');
    const modeLabel = node('span', 'apr-mode'); title.appendChild(modeLabel);
    const controls = node('div', 'apr-tools');
    const fitButton = node('button', '', 'Fit'); fitButton.type = 'button'; fitButton.title = 'Fit the entire phone in the preview';
    const smaller = node('button', '', '−'); smaller.type = 'button'; smaller.setAttribute('aria-label', 'Zoom out phone preview');
    const zoomLabel = node('span', 'apr-zoom');
    const larger = node('button', '', '+'); larger.type = 'button'; larger.setAttribute('aria-label', 'Zoom in phone preview');
    const gridButton = node('button', '', 'Grid'); gridButton.type = 'button'; gridButton.setAttribute('aria-pressed', 'false'); gridButton.title = 'Show positioning grid';
    controls.append(fitButton, smaller, zoomLabel, larger, gridButton); toolbar.append(title, controls);
    const stage = node('div', 'apr-stage');
    const deviceSpace = node('div', 'apr-device-space');
    const device = node('div', 'apr-device');
    const inner = node('div', 'apr-phone-inner');
    const backdrop = node('div', 'apr-preview-backdrop'); backdrop.setAttribute('aria-hidden', 'true');
    const fixedPlane = node('div', 'apr-fixed'); fixedPlane.setAttribute('aria-label', 'Fixed page controls');
    const viewport = node('div', 'ap-phone-viewport apr-viewport'); viewport.tabIndex = 0; viewport.setAttribute('aria-label', 'Post page preview. Scroll to see more posts.');
    const page = node('div', 'apr-page');
    const pageBackground = node('div', 'apr-page-background'); pageBackground.setAttribute('aria-hidden', 'true');
    const grid = node('div', 'apr-grid'); grid.setAttribute('aria-hidden', 'true');
    const guide = node('div', 'apr-guide'); guide.setAttribute('aria-hidden', 'true');
    const selection = node('div', 'apr-selection'); selection.hidden = true;
    const selectionName = node('div', 'apr-selection-name');
    const resizeHandle = node('button', 'apr-resize'); resizeHandle.type = 'button'; resizeHandle.setAttribute('aria-label', 'Resize selected piece');
    selection.append(selectionName, resizeHandle);
    const toast = node('div', 'apr-toast'); toast.hidden = true; toast.setAttribute('role', 'status'); toast.setAttribute('aria-live', 'polite');
    const footer = node('div', 'apr-footer');
    page.append(pageBackground, grid, guide, selection); viewport.append(page); inner.append(backdrop, viewport, fixedPlane, toast); device.append(inner); deviceSpace.append(device); stage.append(deviceSpace); root.append(filters, toolbar, stage, footer); host.appendChild(root);

    const cache = new Map(), kept = new Map(), appreciated = new Set(), replies = new Map();
    let disposed = false, scale = 1, fitted = true, showGrid = false, drag = null, sheet = null, sheetTrigger = null, toastTimer = 0, previousMode = C.mode, requestedFrame = 0;
    let documentIdentity = C.doc;
    const doc = () => C.doc || { page: {}, elements: [], vocabulary: {} };
    const currentLayer = id => (doc().elements || []).find(item => item.id === id);
    const words = () => Object.assign({ keep: 'Keep', kept: 'Kept', keeps: 'Your Keeps' }, doc().vocabulary || {});
    function notify(text) { if (C.setStatus) C.setStatus(text); }
    function tell(text) {
      setText(toast, text); toast.hidden = false; clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { toast.hidden = true; }, 2600);
    }
    function dimensions() {
      const p = doc().page || {};
      return { width: clamp(num(p.width, 390), 240, 1800), height: clamp(num(p.height, 844), 320, 2400), contentHeight: Math.max(num(p.height, 844), num(p.contentHeight, 1400)) };
    }
    function fit() { fitted = true; resize(); }
    function resize() {
      if (disposed) return;
      const d = dimensions(), bounds = stage.getBoundingClientRect(), width = d.width + 20, height = d.height + 20;
      if (fitted) scale = clamp(Math.min((Math.max(90, bounds.width) - 32) / width, (Math.max(150, bounds.height) - 32) / height), .12, 1.2);
      setStyle(device, { width: px(width), height: px(height), transform: 'scale(' + scale + ')' });
      setStyle(deviceSpace, { width: px(width * scale), height: px(height * scale) });
      setStyle(inner, { width: px(d.width), height: px(d.height) });
      setText(zoomLabel, Math.round(scale * 100) + '%');
      fitButton.setAttribute('aria-pressed', String(fitted));
    }
    fitButton.onclick = fit;
    smaller.onclick = () => { fitted = false; scale = Math.max(.2, scale - .1); resize(); };
    larger.onclick = () => { fitted = false; scale = Math.min(1.5, scale + .1); resize(); };
    gridButton.onclick = () => { showGrid = !showGrid; gridButton.setAttribute('aria-pressed', String(showGrid)); refresh(); };

    function postFor(element) {
      const all = doc().elements || [];
      const group = String(element.postId || element.group || '');
      let items = group ? all.filter(item => String(item.postId || item.group || '') === group) : [];
      if (!items.length) {
        const candidates = all.filter(item => (item.type === 'image' || item.type === 'video') && item.visible !== false && num(item.y, 0) <= num(element.y, 0));
        const nearest = candidates.sort((a, b) => num(b.y, 0) - num(a.y, 0))[0];
        items = nearest ? all.filter(item => num(item.y, 0) >= num(nearest.y, 0) - 70 && num(item.y, 0) <= num(element.y, 0) + 50) : [element];
      }
      const media = items.find(item => item.type === 'image' || item.type === 'video');
      const texts = items.filter(item => item.type === 'text' && String(item.text || '').trim());
      const caption = texts.find(item => /caption|message|story|meme/i.test(item.name || '')) || texts[texts.length - 1];
      const author = texts.find(item => /author|name/i.test(item.name || ''));
      return {
        id: group || (media && media.id) || element.id,
        title: author ? String(author.text) : 'Sample saga',
        text: caption ? String(caption.text) : 'A saga from your post page.',
        src: media ? safeURL(media.type === 'video' ? media.poster : media.src) : '',
        type: media ? media.type : 'text'
      };
    }
    function closeSheet() {
      if (sheet) { sheet.remove(); sheet = null; }
      if (sheetTrigger && sheetTrigger.isConnected) try { sheetTrigger.focus({ preventScroll: true }); } catch (_) { /* Focus remains usable without focus options. */ }
      sheetTrigger = null;
    }
    function openSheet(heading) {
      const trigger = document.activeElement;
      closeSheet(); sheetTrigger = trigger;
      const backdrop = node('div', 'apr-backdrop');
      const panel = node('section', 'apr-sheet'); panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', heading);
      const top = node('div', 'apr-sheet-top');
      const h = node('h2', '', heading), close = node('button', 'apr-close', 'Close'); close.type = 'button'; close.onclick = closeSheet;
      top.append(h, close); panel.append(top); backdrop.append(panel); inner.append(backdrop); sheet = backdrop;
      backdrop.addEventListener('pointerdown', event => { if (event.target === backdrop) closeSheet(); });
      panel.addEventListener('keydown', event => {
        if (event.key === 'Escape') { event.preventDefault(); closeSheet(); return; }
        if (event.key !== 'Tab') return;
        const items = Array.from(panel.querySelectorAll('button,input,textarea,select,[tabindex="0"]')).filter(item => !item.disabled && !item.hidden);
        if (!items.length) return;
        if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items[items.length - 1].focus(); }
        else if (!event.shiftKey && document.activeElement === items[items.length - 1]) { event.preventDefault(); items[0].focus(); }
      });
      close.focus({ preventScroll: true });
      return panel;
    }
    function context(panel, post) {
      const box = node('div', 'apr-context');
      if (post.src) { const image = node('img'); image.src = post.src; image.alt = ''; image.onerror = () => image.remove(); box.append(image); }
      box.append(node('span', '', post.title + ' · ' + post.text.slice(0, 110))); panel.append(box);
    }
    function showKeeps() {
      const panel = openSheet(words().keeps);
      panel.append(node('p', 'apr-meta', 'These are the sagas you kept while trying this layout.'));
      if (!kept.size) { panel.append(node('p', 'apr-empty', 'Tap ' + words().keep + ' on a saga to find it here.')); return; }
      for (const [id, post] of kept) {
        const card = node('article', 'apr-kept-card');
        if (post.src) { const image = node('img'); image.src = post.src; image.alt = post.title; image.onerror = () => image.remove(); card.append(image); }
        card.append(node('p', '', post.title + '\n' + post.text));
        const remove = node('button', '', 'Remove from ' + words().keeps); remove.type = 'button';
        remove.onclick = () => { kept.delete(id); refreshActions(); showKeeps(); }; card.append(remove); panel.append(card);
      }
    }
    function showReplies(post) {
      const panel = openSheet('Replies'); context(panel, post);
      panel.append(node('p', 'apr-meta', 'Preview conversation. Replies here stay in this test.'));
      const list = node('div'); panel.append(list);
      function paintReplies() {
        list.replaceChildren();
        const data = replies.get(post.id) || [{ author: 'Freya', text: 'This belongs in my keeps.' }];
        for (const reply of data) { const item = node('div', 'apr-message'); item.append(node('strong', '', reply.author), node('p', '', reply.text)); list.append(item); }
      }
      paintReplies();
      const form = node('form'), textarea = node('textarea'); textarea.placeholder = 'Add your reply…'; textarea.setAttribute('aria-label', 'Write a sample reply'); textarea.maxLength = 2000; textarea.rows = 3;
      const send = node('button', 'apr-primary', 'Add reply'); send.type = 'submit'; form.append(textarea, send); panel.append(form);
      form.onsubmit = event => {
        event.preventDefault(); const text = textarea.value.trim(); if (!text) { textarea.focus(); return; }
        const data = (replies.get(post.id) || [{ author: 'Freya', text: 'This belongs in my keeps.' }]).slice(); data.push({ author: 'You', text }); replies.set(post.id, data);
        textarea.value = ''; paintReplies(); panel.scrollTop = panel.scrollHeight; tell('Reply added to the preview.');
      };
    }
    function showShare(post, label) {
      const panel = openSheet(label || 'Pass Along'); context(panel, post);
      panel.append(node('p', 'apr-meta', 'Try the sharing choices. This preview does not send messages or publish posts.'));
      const friends = node('button', 'apr-option', 'Send to someone'); friends.type = 'button'; friends.append(node('small', '', 'Choose a person in Raven'));
      friends.onclick = () => {
        const picker = openSheet('Send to someone'); context(picker, post); picker.append(node('p', 'apr-meta', 'Sample recipients'));
        for (const name of ['Freya', 'Thor', 'Idun']) { const button = node('button', 'apr-option', name); button.type = 'button'; button.onclick = () => { closeSheet(); tell('Preview: ' + name + ' selected. No message was sent.'); }; picker.append(button); }
      };
      const repost = node('button', 'apr-option', 'Share to your feed'); repost.type = 'button'; repost.append(node('small', '', 'Review before posting'));
      repost.onclick = () => {
        const review = openSheet('Review your share'); context(review, post); review.append(node('p', 'apr-meta', 'This is a sample of the confirmation before a public share.'));
        const done = node('button', 'apr-primary', 'Finish preview'); done.type = 'button'; done.onclick = () => { closeSheet(); tell('Share preview complete. Nothing was published.'); }; review.append(done);
      };
      panel.append(friends, repost);
    }
    function showComposer() {
      const panel = openSheet('Create Saga'); panel.append(node('p', 'apr-meta', 'Try composing a text saga. Use the editor’s image and video pieces to design media posts.'));
      const form = node('form'), input = node('textarea'); input.rows = 6; input.maxLength = 4000; input.placeholder = 'What would you like to share?'; input.setAttribute('aria-label', 'Sample saga caption');
      const submit = node('button', 'apr-primary', 'Preview Saga'); submit.type = 'submit'; form.append(input, submit); panel.append(form);
      form.onsubmit = event => {
        event.preventDefault(); if (!input.value.trim()) { input.focus(); return; }
        const review = openSheet('Your saga preview'); review.append(node('p', 'apr-meta', 'Your text is local to this preview.'));
        const card = node('div', 'apr-message'); card.append(node('strong', '', 'You'), node('p', '', input.value.trim())); review.append(card);
        const done = node('button', 'apr-primary', 'Back to the feed'); done.type = 'button'; done.onclick = closeSheet; review.append(done);
      };
    }
    function act(element) {
      if (C.mode !== 'try') return;
      const post = postFor(element);
      switch (element.action) {
        case 'appreciate':
          if (appreciated.has(post.id)) appreciated.delete(post.id); else appreciated.add(post.id);
          refreshActions(); tell(appreciated.has(post.id) ? 'Appreciated.' : 'Appreciation removed.'); break;
        case 'keep':
          if (kept.has(post.id)) kept.delete(post.id); else kept.set(post.id, post);
          refreshActions(); tell(kept.has(post.id) ? words().kept + ' in ' + words().keeps + '.' : 'Removed from ' + words().keeps + '.'); break;
        case 'keeps': showKeeps(); break;
        case 'reply': showReplies(post); break;
        case 'share': showShare(post, element.text); break;
        case 'create': showComposer(); break;
        default: break;
      }
    }
    function refreshActions() {
      for (const element of doc().elements || []) {
        const entry = cache.get(element.id); if (!entry || !entry.press) continue;
        const post = postFor(element), keptOn = kept.has(post.id), appreciatedOn = appreciated.has(post.id);
        let label = element.text || element.name || 'Button';
        if (C.mode === 'try' && element.action === 'keep' && keptOn) label = words().kept;
        if (C.mode === 'try' && element.action === 'keeps' && kept.size) label += ' (' + kept.size + ')';
        setText(entry.press, label);
        if (element.action === 'keep' || element.action === 'appreciate') entry.press.setAttribute('aria-pressed', String(C.mode === 'try' && (element.action === 'keep' ? keptOn : appreciatedOn)));
        else entry.press.removeAttribute('aria-pressed');
        entry.press.setAttribute('aria-label', label);
      }
    }
    function makeLayer(element) {
      const layer = node('div', 'apr-layer'); layer.dataset.id = element.id;
      const body = node('div', 'apr-body'); layer.append(body);
      const frame = node('div', 'apr-frame'), frameRing = node('div', 'apr-frame-ring'), detail = svg('svg', { class: 'apr-frame-detail', 'aria-hidden': 'true', focusable: 'false', preserveAspectRatio: 'none' });
      frame.append(frameRing, detail); layer.append(frame); frame.hidden = true;
      const entry = { node: layer, body, frame, frameRing, detail, frameKey: '', shadowKey: '', shadowFilter: null, maskKey: '', type: element.type, src: null, poster: null, animated: '', press: null, media: null, text: null, fallback: null };
      if (element.type === 'text') {
        body.classList.add('apr-copy'); entry.text = node('span'); body.append(entry.text);
      } else if (element.type === 'button') {
        const button = node('button', 'apr-press'); button.type = 'button'; entry.press = button; body.append(button);
        button.onclick = event => { if (C.mode === 'try') { event.stopPropagation(); const current = currentLayer(element.id); if (current) act(current); } };
      } else if (element.type === 'image' || element.type === 'avatar' || element.type === 'video') {
        entry.media = node(element.type === 'video' ? 'video' : 'img', 'apr-media'); entry.media.draggable = false;
        if (element.type === 'video') { entry.media.playsInline = true; entry.media.preload = 'metadata'; }
        else { entry.media.loading = 'eager'; entry.media.decoding = 'async'; }
        entry.fallback = node('div', 'apr-media-fallback'); body.append(entry.media, entry.fallback);
        entry.media.addEventListener('error', () => { entry.fallback.hidden = false; setText(entry.fallback, (element.type === 'video' ? 'Video' : 'Image') + ' could not load'); });
        entry.media.addEventListener(element.type === 'video' ? 'loadeddata' : 'load', () => { entry.fallback.hidden = true; });
      }
      layer.addEventListener('pointerdown', event => startDrag(event, element.id, false));
      layer.addEventListener('pointermove', moveDrag);
      layer.addEventListener('pointerup', endDrag);
      layer.addEventListener('pointercancel', endDrag);
      layer.addEventListener('click', event => {
        if (C.mode === 'edit') return;
        const current = currentLayer(element.id);
        if (current && current.type !== 'button' && current.action && current.action !== 'none') { event.stopPropagation(); act(current); }
      });
      layer.addEventListener('keydown', event => {
        const current = currentLayer(element.id);
        if (C.mode === 'try' && current && current.type !== 'button' && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); act(current); }
      });
      (element.positionMode === 'fixed' ? fixedPlane : page).insertBefore(layer, element.positionMode === 'fixed' ? null : guide); cache.set(element.id, entry); return entry;
    }
    function shadowFilter(entry, element) {
      if (element.shadowMode !== 'silhouette' || num(element.shadowOpacity, .5) <= 0) return 'none';
      const spread = num(element.shadowSpread, 0), blur = Math.max(0, num(element.shadowBlur, 0));
      if (!spread) return 'drop-shadow(' + px(element.shadowX) + ' ' + px(element.shadowY) + ' ' + px(blur) + ' ' + shadowColor(element) + ')';
      const key = JSON.stringify([element.shadowMode, element.shadowOpacity, element.shadowColor, element.shadowX, element.shadowY, blur, spread, element.width, element.height]);
      if (entry.shadowKey !== key) {
        entry.shadowKey = key;
        if (!entry.shadowFilter) {
          entry.shadowFilter = svg('filter', { id: 'apr-shadow-' + instance + '-' + cache.size + '-' + Math.floor(Math.random() * 1e8), filterUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB' });
          filterDefs.append(entry.shadowFilter);
        }
        const extent = blur * 3 + Math.abs(num(element.shadowX, 0)) + Math.abs(num(element.shadowY, 0)) + Math.abs(spread) + 24;
        for (const [name, value] of Object.entries({ x: -extent, y: -extent, width: num(element.width, 160) + extent * 2, height: num(element.height, 40) + extent * 2 })) entry.shadowFilter.setAttribute(name, String(value));
        const morph = svg('feMorphology', { in: 'SourceAlpha', operator: spread < 0 ? 'erode' : 'dilate', radius: Math.abs(spread), result: 'spread' });
        const softness = svg('feGaussianBlur', { in: 'spread', stdDeviation: blur / 2, result: 'soft' });
        const offset = svg('feOffset', { in: 'soft', dx: num(element.shadowX, 0), dy: num(element.shadowY, 0), result: 'offset' });
        const flood = svg('feFlood', { 'flood-color': element.shadowColor || '#000000', 'flood-opacity': clamp(num(element.shadowOpacity, .5), 0, 1), result: 'ink' });
        const composite = svg('feComposite', { in: 'ink', in2: 'offset', operator: 'in', result: 'shadow' });
        const merge = svg('feMerge'); merge.append(svg('feMergeNode', { in: 'shadow' }), svg('feMergeNode', { in: 'SourceGraphic' }));
        entry.shadowFilter.replaceChildren(morph, softness, offset, flood, composite, merge);
      }
      return 'url(#' + entry.shadowFilter.id + ')';
    }
    function updateLayer(element, index) {
      let entry = cache.get(element.id);
      if (!entry || entry.type !== element.type) { if (entry) { entry.node.remove(); if (entry.shadowFilter) entry.shadowFilter.remove(); } entry = makeLayer(element); }
      const { node: layer, body } = entry;
      const plane = element.positionMode === 'fixed' ? fixedPlane : page;
      if (layer.parentNode !== plane) plane.insertBefore(layer, plane === page ? guide : null);
      layer.hidden = element.visible === false;
      layer.dataset.locked = String(!!element.locked);
      layer.tabIndex = C.mode === 'edit' || (element.type !== 'button' && element.action && element.action !== 'none') ? 0 : -1;
      if (C.mode === 'edit' || (element.type !== 'button' && element.action && element.action !== 'none')) layer.setAttribute('role', 'button'); else layer.removeAttribute('role');
      layer.setAttribute('aria-label', C.mode === 'edit' ? (element.name || element.type) + (element.locked ? ', locked piece' : ', editable piece') : (element.name || element.type));
      if (C.mode === 'edit') layer.setAttribute('aria-pressed', String(C.selectedId === element.id)); else layer.removeAttribute('aria-pressed');
      const shadow = element.shadowMode === 'box' && num(element.shadowOpacity, .5) > 0 && (num(element.shadowBlur, 0) || num(element.shadowSpread, 0) || num(element.shadowX, 0) || num(element.shadowY, 0));
      const decorated = !!element.frameStyle && element.frameStyle !== 'none', masked = element.effectMask === 'edge';
      const vAlign = element.verticalAlign === 'bottom' ? 'flex-end' : element.verticalAlign === 'middle' || element.verticalAlign === 'center' ? 'center' : 'flex-start';
      const align = ['left', 'center', 'right', 'justify'].includes(element.textAlign) ? element.textAlign : 'left';
      setStyle(layer, {
        left: px(element.x), top: px(element.y), width: px(element.width, 160), height: px(element.height, 40), zIndex: String(index + 1),
        transform: 'rotate(' + num(element.rotation, 0) + 'deg)', opacity: String(clamp(num(element.opacity, 1), 0, 1)),
        background: masked ? 'transparent' : element.background || 'transparent', color: element.color || '#e9f0f6',
        borderColor: element.borderColor || 'transparent', borderWidth: decorated ? '0px' : px(element.borderWidth), borderStyle: element.borderStyle || 'solid', borderRadius: px(element.radius),
        boxShadow: shadow ? [px(element.shadowX), px(element.shadowY), px(element.shadowBlur), px(element.shadowSpread), shadowColor(element)].join(' ') : 'none', filter: shadowFilter(entry, element),
        backdropFilter: num(element.backdropBlur, 0) > 0 ? 'blur(' + px(element.backdropBlur) + ')' : 'none', mixBlendMode: element.blendMode || 'normal',
        fontFamily: element.fontFamily || 'system-ui, sans-serif', fontSize: px(element.fontSize, 16), fontWeight: String(num(element.fontWeight, 400)),
        lineHeight: String(num(element.lineHeight, 1.4)), letterSpacing: px(element.letterSpacing), textAlign: align,
        fontStyle: element.italic ? 'italic' : 'normal', textDecoration: element.underline ? 'underline' : 'none', textTransform: element.uppercase ? 'uppercase' : 'none'
      });
      setStyle(body, { borderRadius: px(element.radius), background: masked ? element.background || 'transparent' : 'transparent', padding: px(element.padding), justifyContent: vAlign });
      const maskKey = JSON.stringify([element.effectMask, element.edgeWidth, element.edgeSoftness, element.width, element.height, element.radius]);
      if (entry.maskKey !== maskKey) { entry.maskKey = maskKey; const mask = edgeMaskCSS(element); setStyle(body, { maskImage: mask, WebkitMaskImage: mask, maskSize: '100% 100%', WebkitMaskSize: '100% 100%', maskRepeat: 'no-repeat', WebkitMaskRepeat: 'no-repeat' }); }
      entry.frame.hidden = !decorated || num(element.borderWidth, 0) <= 0;
      const frameKey = JSON.stringify([element.frameStyle, element.borderWidth, element.borderStyle, element.borderColor, element.radius, element.width, element.height]);
      if (entry.frameKey !== frameKey) {
        entry.frameKey = frameKey; entry.frameRing.style.cssText = ''; Object.assign(entry.frameRing.style, frameCSS(element.frameStyle, element)); frameDetail(entry.detail, element);
      }
      if (entry.text) setText(entry.text, element.text || '');
      if (entry.press) {
        entry.press.tabIndex = C.mode === 'try' ? 0 : -1;
        setStyle(entry.press, { padding: '0px', justifyContent: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center', alignItems: vAlign });
      }
      if (entry.media) {
        const source = safeURL(element.src), poster = safeURL(element.poster);
        const sourceChanged = entry.src !== source;
        if (sourceChanged) {
          entry.src = source; entry.fallback.hidden = false;
          setText(entry.fallback, source ? 'Loading ' + (element.type === 'video' ? 'video' : 'image') + '…' : 'Add ' + (element.type === 'video' ? 'a video' : 'an image'));
          if (source) entry.media.setAttribute('src', source); else { entry.media.removeAttribute('src'); if (element.type === 'video') entry.media.load(); }
        }
        setStyle(entry.media, {
          objectFit: ['contain', 'cover', 'fill', 'none', 'scale-down'].includes(element.fit) ? element.fit : 'contain',
          objectPosition: clamp(num(element.focalX, 50), 0, 100) + '% ' + clamp(num(element.focalY, 50), 0, 100) + '%',
          filter: 'brightness(' + num(element.brightness, 100) + '%) contrast(' + num(element.contrast, 100) + '%) saturate(' + num(element.saturation, 100) + '%) grayscale(' + num(element.grayscale, 0) + '%) blur(' + px(element.blur) + ')'
        });
        if (element.type === 'video') {
          if (poster !== entry.poster) { entry.poster = poster; if (poster) entry.media.poster = poster; else entry.media.removeAttribute('poster'); }
          entry.media.controls = C.mode === 'try'; entry.media.loop = !!element.loop; entry.media.muted = !!element.muted || !!element.autoplay;
          entry.media.playbackRate = clamp(num(element.playbackRate, 1), .25, 3);
          const wasAuto = entry.media.autoplay; entry.media.autoplay = !!element.autoplay;
          if (element.autoplay && (!wasAuto || sourceChanged) && source) entry.media.play().catch(() => {});
          else if (!element.autoplay && wasAuto) entry.media.pause();
        } else entry.media.alt = element.name || 'Post image';
      }
      const motion = ['fade', 'float', 'pulse'].includes(element.motion) ? element.motion : 'none';
      const animation = motion === 'none' ? 'none' : ['apr-' + motion, Math.max(.1, num(element.duration, 2)) + 's', element.easing || 'ease-in-out', Math.max(0, num(element.delay, 0)) + 's', motion === 'fade' ? '1 both' : 'infinite'].join(' ');
      // A selection is held still while editing, even if its animation is active.
      const effective = C.mode === 'edit' && C.selectedId === element.id ? 'none' : animation;
      if (entry.animated !== effective) { body.style.animation = effective; entry.animated = effective; }
      body.style.setProperty('--apr-distance', motion === 'float' ? px(element.distance, 5) : String(num(element.distance, 5)));
      body.style.setProperty('--apr-pulse-scale', String(1 + num(element.distance, 5) / 250));
    }
    function selectionState() {
      const element = currentLayer(C.selectedId);
      selection.hidden = C.mode !== 'edit' || !element || element.visible === false;
      if (selection.hidden) return;
      const plane = element.positionMode === 'fixed' ? fixedPlane : page;
      if (selection.parentNode !== plane) plane.appendChild(selection);
      setStyle(selection, { left: px(element.x), top: px(element.y), width: px(element.width), height: px(element.height), transform: 'rotate(' + num(element.rotation, 0) + 'deg)' });
      setText(selectionName, (element.name || element.type) + (element.locked ? ' · locked' : ''));
      selectionName.style.top = num(element.y, 0) < 25 ? '0px' : '-24px';
      resizeHandle.hidden = !!element.locked;
      resizeHandle.setAttribute('aria-label', 'Resize ' + (element.name || element.type));
    }
    function refresh(kind) {
      if (disposed) return;
      const data = doc(), d = dimensions(), p = data.page || {};
      if (previousMode !== C.mode) { closeSheet(); previousMode = C.mode; }
      if (documentIdentity !== data && (kind === 'preset' || kind === 'load' || kind === 'import')) { kept.clear(); appreciated.clear(); replies.clear(); viewport.scrollTop = 0; closeSheet(); }
      documentIdentity = data;
      root.classList.toggle('apr-edit', C.mode === 'edit');
      setText(modeLabel, C.mode === 'try' ? 'Try the page' : 'Editing live');
      setText(footer, C.mode === 'try' ? 'Try the post controls. These sample interactions stay in the preview.' : data.elements && data.elements.length ? 'Changes appear instantly. Select a piece, then drag or resize it.' : 'Your page is empty. Add a piece or choose an arranged sample.');
      gridButton.hidden = C.mode !== 'edit';
      const background = safeURL(p.backgroundImage);
      setStyle(page, { width: px(d.width), height: px(d.contentHeight) });
      setStyle(pageBackground, { backgroundColor: p.background || '#080e18', backgroundImage: imageCSS(background), backgroundSize: p.backgroundFit || 'cover', opacity: String(clamp(num(p.backgroundOpacity, 1), 0, 1)) });
      setStyle(backdrop, { backgroundImage: imageCSS(safeURL(p.previewBackdrop == null ? 'asgard/sky.jpeg' : p.previewBackdrop)), backgroundSize: p.previewBackdropFit || 'cover' });
      grid.hidden = !showGrid || C.mode !== 'edit'; setStyle(grid, { backgroundSize: px(Math.max(2, num(p.grid, 8))) + ' ' + px(Math.max(2, num(p.grid, 8))) });
      guide.hidden = C.mode !== 'edit'; const padding = Math.max(0, num(p.padding, 16));
      setStyle(guide, { left: px(padding), top: px(padding), width: px(Math.max(0, d.width - padding * 2)), height: px(Math.max(0, d.contentHeight - padding * 2)) });
      const ids = new Set((data.elements || []).map(item => item.id));
      for (const [id, entry] of cache) if (!ids.has(id)) { if (entry.media && entry.type === 'video') entry.media.pause(); if (entry.shadowFilter) entry.shadowFilter.remove(); entry.node.remove(); cache.delete(id); }
      (data.elements || []).forEach(updateLayer);
      refreshActions(); selectionState(); resize();
    }
    function startDrag(event, id, resizing) {
      if (C.mode !== 'edit' || event.button !== 0 || disposed) return;
      const element = currentLayer(id); if (!element || element.visible === false) return;
      event.stopPropagation(); event.preventDefault(); C.select(id);
      if (element.locked) { notify('Unlock this piece to move or resize it.'); return; }
      drag = { id, pointerId: event.pointerId, target: event.currentTarget, resizing, fixed: element.positionMode === 'fixed', clientX: event.clientX, clientY: event.clientY, scrollTop: viewport.scrollTop, x: num(element.x, 0), y: num(element.y, 0), width: num(element.width, 100), height: num(element.height, 40), rotation: num(element.rotation, 0), moved: false };
      try { event.currentTarget.setPointerCapture(event.pointerId); } catch (_) {}
      root.classList.add('apr-dragging');
    }
    function moveDrag(event) {
      if (!drag || event.pointerId !== drag.pointerId || C.mode !== 'edit') return;
      event.preventDefault();
      const rect = viewport.getBoundingClientRect();
      if (!drag.fixed && event.clientY > rect.bottom - 24 && viewport.scrollTop + viewport.clientHeight < viewport.scrollHeight) viewport.scrollTop += 8;
      else if (!drag.fixed && event.clientY < rect.top + 24 && viewport.scrollTop > 0) viewport.scrollTop -= 8;
      const dx = (event.clientX - drag.clientX) / scale, dy = (event.clientY - drag.clientY) / scale + (drag.fixed ? 0 : viewport.scrollTop - drag.scrollTop);
      if (Math.abs(dx) + Math.abs(dy) < 2 && !drag.moved) return;
      drag.moved = true;
      const p = doc().page || {}, step = p.snap ? Math.max(1, num(p.grid, 8)) : 1, snap = value => Math.round(value / step) * step;
      const d = dimensions(); let patch;
      if (drag.resizing) {
        const angle = drag.rotation * Math.PI / 180, localX = dx * Math.cos(angle) + dy * Math.sin(angle), localY = -dx * Math.sin(angle) + dy * Math.cos(angle);
        patch = { width: Math.max(12, snap(drag.width + localX)), height: Math.max(12, snap(drag.height + localY)) };
      } else patch = { x: snap(clamp(drag.x + dx, -drag.width + 20, d.width - 20)), y: snap(clamp(drag.y + dy, -drag.height + 20, (drag.fixed ? d.height : d.contentHeight) - 20)) };
      C.updateElement(drag.id, patch, { history: false });
    }
    function endDrag(event) {
      if (!drag || event.pointerId !== drag.pointerId) return;
      const finished = drag; drag = null; root.classList.remove('apr-dragging');
      try { if (finished.target.hasPointerCapture(event.pointerId)) finished.target.releasePointerCapture(event.pointerId); } catch (_) {}
      if (finished.moved && C.checkpoint) C.checkpoint();
    }
    resizeHandle.addEventListener('pointerdown', event => { if (C.selectedId) startDrag(event, C.selectedId, true); });
    resizeHandle.addEventListener('pointermove', moveDrag); resizeHandle.addEventListener('pointerup', endDrag); resizeHandle.addEventListener('pointercancel', endDrag);
    page.addEventListener('pointerdown', event => { if (C.mode === 'edit' && (event.target === page || event.target === grid || event.target === guide)) C.select(null); });
    root.addEventListener('keydown', event => {
      if (C.mode !== 'edit' || event.defaultPrevented || event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
      if (!viewport.contains(event.target) && !fixedPlane.contains(event.target) && !selection.contains(event.target)) return;
      const element = currentLayer(C.selectedId); if (!element || element.locked) return;
      if (event.key === 'Delete' || event.key === 'Backspace') { if (C.remove) { event.preventDefault(); C.remove(element.id); } return; }
      const axes = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }, delta = axes[event.key];
      if (!delta) return;
      event.preventDefault(); const amount = event.shiftKey ? 10 : 1, resizing = event.target === resizeHandle;
      const patch = resizing ? { width: Math.max(12, num(element.width, 100) + delta[0] * amount), height: Math.max(12, num(element.height, 40) + delta[1] * amount) } : { x: num(element.x, 0) + delta[0] * amount, y: num(element.y, 0) + delta[1] * amount };
      C.updateElement(element.id, patch, { history: false }); if (C.checkpoint) C.checkpoint();
    });
    const unsubscribe = C.subscribe(refresh);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { cancelAnimationFrame(requestedFrame); requestedFrame = requestAnimationFrame(resize); }) : null;
    if (observer) observer.observe(stage); else global.addEventListener('resize', resize);
    refresh(); requestedFrame = requestAnimationFrame(resize);
    return {
      fit, refresh,
      dispose() {
        if (disposed) return; disposed = true; clearTimeout(toastTimer); cancelAnimationFrame(requestedFrame); closeSheet();
        if (typeof unsubscribe === 'function') unsubscribe(); if (observer) observer.disconnect(); else global.removeEventListener('resize', resize);
        for (const entry of cache.values()) if (entry.media && entry.type === 'video') entry.media.pause(); cache.clear(); root.remove();
      }
    };
  }

  global.AsgardPostRenderer = { mount, frameCSS };
})(window);
