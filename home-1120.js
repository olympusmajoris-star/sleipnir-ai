/* =====================================================================
   SLEIPNIR HOME — the deliveries home page. Screen module for
   studio-kit-1119. Port of the FlutterFlow HomePage (export 2026-11-19):
   ScrollingNorseBackground (Valhalla bg photos), GlowingLogo, "sleipnir"
   title, search field, horse image, category grid, second grid,
   the 4 buttons, top-right account button. Asgard opens Asgard.
   ===================================================================== */
(() => {
'use strict';
const K = window.StudioKit;
const { TAU, clamp, rgba, scaleOf } = K;
let P = {};
const im = (src, cors) => { const i = new Image(); if (cors) i.crossOrigin = 'anonymous'; i.src = src; return i; };
const BG_URLS = ["https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/Vahalla%20bg/ancient-arcane-runes-stockcake.jpg", "https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/Vahalla%20bg/weathered-norse-inscription-stockcake.jpg", "https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/Vahalla%20bg/ancient-bronze-craftsmanship-stockcake.jpg", "https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/Vahalla%20bg/ancient-carved-stone-stockcake.jpg", "https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/Vahalla%20bg/ancient-carved-wing-stockcake.jpg", "https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/Vahalla%20bg/ancient-egyptian-carvings-stockcake.jpg", "https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/Vahalla%20bg/ancient-egyptian-pattern-stockcake.jpg", "https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/Vahalla%20bg/ancient-egyptian-relief-stockcake.jpg", "https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/Vahalla%20bg/ancient-limestone-geometry-stockcake.webp", "https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/Vahalla%20bg/ancient-mystical-tablet-stockcake.jpg", "https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/Vahalla%20bg/ancient-norse-serpents-stockcake.jpg", "https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/Vahalla%20bg/ancient-norse-valknut-stockcake.jpg", "https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/Vahalla%20bg/ancient-runic-circle-stockcake.jpg", "https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/Vahalla%20bg/ancient-runic-magic-stockcake.jpg", "https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/Vahalla%20bg/ancient-runic-portal-stockcake.jpg", "https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/Vahalla%20bg/ancient-runic-stone-stockcake.jpg", "https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/Vahalla%20bg/ancient-sacred-carving-stockcake.jpg", "https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/Vahalla%20bg/ancient-sacred-emblems-stockcake.jpg", "https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/Vahalla%20bg/ancient-stone-circles-stockcake.jpg", "https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/Vahalla%20bg/ancient-stone-guardian-stockcake.jpg", "https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/Vahalla%20bg/ancient-stone-pattern-stockcake.jpg", "https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/Vahalla%20bg/ancient-stone-patterns-stockcake.jpg", "https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/Vahalla%20bg/ancient-stone-patterns-stockcakeghkiu.jpg", "https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/Vahalla%20bg/ancient-stone-patterns-stockcakeu.jpg", "https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/Vahalla%20bg/ancient-stone-patterns-stockcakew.jpg", "https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/Vahalla%20bg/ancient-stone-relief-stockcake.webp", "https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/Vahalla%20bg/ancient-stone-texture-stockcake.jpg", "https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/Vahalla%20bg/ancient-temple-ruins-stockcake.jpg", "https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/Vahalla%20bg/ancient-viking-carving-stockcake.jpg", "https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/Vahalla%20bg/ancient-viking-runestone-stockcake.jpg", "https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/Vahalla%20bg/ancient-wisdom-revealed-stockcake.jpg", "https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/Vahalla%20bg/carved-wooden-face-stockcake.jpg", "https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/Vahalla%20bg/celtic-knot-evolution-stockcake.jpg", "https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/Vahalla%20bg/textured-artisan-landscape-stockcake.jpg", "https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/Vahalla%20bg/soulful-wooden-gaze-stockcake.jpg", "https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/Vahalla%20bg/sacred-stone-mandala-stockcakeyu.jpg", "https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/Vahalla%20bg/sacred-ruins-mandala-stockcake.jpg", "https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/Vahalla%20bg/proud-nordic-warrior-stockcake.jpg", "https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/Vahalla%20bg/ornate-wooden-door-stockcake.jpg", "https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/Vahalla%20bg/viking-warrior-posed-stockcake.webp"];
const BG = BG_URLS.map(u => im(u, true)).sort(() => Math.random() - .5);
const LOGO = im('https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/slei-logo/logo%20trans.png', true);
const HORSE = im('home/horse.webp');
const FASTCASUAL = im('https://picsum.photos/seed/663/600', true);
const T1 = [['grocery', 'Grocery', 60, 70, 13], ['fastfood', 'Fast Food', 52, 52, 11], ['restaurant', 'Restaurant', 52, 52, 11], ['retail', 'Retail', 50, 54, 11], ['pharmacy', 'Pharmacy', 55, 55, 11], ['convenience', 'Convenience Store', 55, 55, 11], [null, 'Fast Casual', 55, 55, 11], ['picscan', 'PicScan', 65, 65, 11]].map(([f, label, w, h, fs]) => ({ img: f ? im('home/' + f + '.webp') : FASTCASUAL, label, w, h, fs }));
const ODIN = im('home/odin.webp'), VSHOP = im('home/virtualshop.webp');
const ST = { scroll: 0 };
{ const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700&family=Inter:wght@400;500;700&display=swap'; document.head.appendChild(l); }
let G = {};
const PERSON = new Path2D('M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z');
function cover(ctx, img, x, y, w, h) { if (!img.complete || !img.naturalWidth) return false; const s = Math.max(w / img.naturalWidth, h / img.naturalHeight), sw = w / s, sh = h / s; ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h); return true; }
function button(ctx, label, cx, y, h) { ctx.font = `500 ${P['btn.size']}px Inter, Roboto, sans-serif`; const w = ctx.measureText(label).width + 32; ctx.fillStyle = P['btn.color']; ctx.beginPath(); ctx.roundRect(cx - w / 2, y, w, h, P['btn.round']); ctx.fill(); ctx.fillStyle = P['btn.text']; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, cx, y + h / 2); return { x: cx - w / 2, y, w, h, label }; }
const sc = K.screen({
  id: 'home', title: 'Sleipnir home', docId: 'sleipnir_home',
  crumb: 'Sleipnir › Home (deliveries) <small>· HomePage</small>',
  docMeta: { widget: 'HomePage', part: 'Deliveries home page', source: 'FlutterFlow export 2026-11-19' },
  startGroup: 'Top', startSection: 'Logo',
  spec(def) {
    def('Background', 'Scrolling photos', 'bgphotos', 'bg2.on', 'Scrolling Norse photos', 'bool', true);
    def('Background', 'Scrolling photos', 'bgphotos', 'bg2.alpha', 'Photo strength', 'num', .15, { min: 0, max: 1, step: .01 });
    def('Background', 'Scrolling photos', 'bgphotos', 'bg2.speed', 'Scroll speed', 'num', 10, { min: 0, max: 120, step: 1, unit: 'px/s' });
    def('Background', 'Scrolling photos', 'bgphotos', 'bg2.tile', 'Photo width', 'num', 300, { min: 80, max: 800, step: 5, unit: 'px' });
    def('Background', 'Scrolling photos', 'bgphotos', 'bg2.page', 'Page color', 'color', '#FFFFFF');
    def('Top', 'Logo', 'logo', 'logo.size', 'Logo size', 'num', 120, { min: 40, max: 240, step: 1, unit: 'px' });
    def('Top', 'Logo', 'logo', 'logo.glow', 'Glow color', 'color', '#E9FFFF');
    def('Top', 'Logo', 'logo', 'logo.glowR', 'Glow size', 'num', 10, { min: 0, max: 40, step: .5, unit: 'px' });
    def('Top', 'Logo', 'logo', 'logo.header', 'Header height', 'num', 150, { min: 80, max: 300, step: 1, unit: 'px' });
    def('Top', 'Title', 'title', 'tt.text', 'Title', 'text', 'sleipnir');
    def('Top', 'Title', 'title', 'tt.size', 'Size', 'num', 20, { min: 10, max: 48, step: .5, unit: 'px' });
    def('Top', 'Title', 'title', 'tt.color', 'Color', 'color', '#932424');
    def('Top', 'Title', 'title', 'tt.shadow', 'Shadow color', 'color', '#57636C');
    def('Top', 'Title', 'title', 'tt.shadowBlur', 'Shadow blur', 'num', 4, { min: 0, max: 20, step: .5, unit: 'px' });
    def('Top', 'Search', 'search', 'sr.w', 'Width', 'num', 359, { min: 150, max: 420, step: 1, unit: 'px' });
    def('Top', 'Search', 'search', 'sr.h', 'Height', 'num', 44, { min: 28, max: 70, step: 1, unit: 'px' });
    def('Top', 'Search', 'search', 'sr.border', 'Border color', 'color', '#FFD700');
    def('Top', 'Search', 'search', 'sr.borderW', 'Border width', 'num', 2, { min: 0, max: 6, step: .5, unit: 'px' });
    def('Top', 'Search', 'search', 'sr.round', 'Roundness', 'num', 45, { min: 0, max: 60, step: 1, unit: 'px' });
    def('Top', 'Search', 'search', 'sr.fill', 'Fill', 'color', '#000000');
    def('Top', 'Search', 'search', 'sr.hint', 'Hint word', 'text', 'TextField');
    def('Top', 'Search', 'search', 'sr.hintColor', 'Hint color', 'color', '#57636C');
    def('Top', 'Horse', 'horse', 'hs.w', 'Horse width', 'num', 55, { min: 20, max: 160, step: 1, unit: 'px' });
    def('Top', 'Horse', 'horse', 'hs.h', 'Horse height', 'num', 78.9, { min: 20, max: 200, step: .5, unit: 'px' });
    def('Categories', 'Grid', 'grid1', 'g1.cols', 'Columns', 'int', 4, { min: 2, max: 6, step: 1 });
    def('Categories', 'Grid', 'grid1', 'g1.gap', 'Gap', 'num', 8, { min: 0, max: 30, step: 1, unit: 'px' });
    def('Categories', 'Grid', 'grid1', 'g1.aspect', 'Tile shape (width ÷ height)', 'num', .9, { min: .5, max: 2, step: .01 });
    def('Categories', 'Grid', 'grid1', 'g1.icon', 'Icon size ×', 'num', 1, { min: .4, max: 2, step: .05 });
    def('Categories', 'Labels', 'grid1', 'lb.color', 'Label color', 'color', '#4A3728');
    def('Categories', 'Labels', 'grid1', 'lb.size', 'Label size', 'num', 11, { min: 6, max: 20, step: .5, unit: 'px' });
    def('Categories', 'Labels', 'grid1', 'lb.sizeGrocery', 'Grocery label size', 'num', 13, { min: 6, max: 24, step: .5, unit: 'px' });
    def('More', 'Grid', 'grid2', 'g2.aspect', 'Tile shape (width ÷ height)', 'num', 1.1, { min: .5, max: 2.5, step: .01 });
    def('More', 'Buttons', 'buttons', 'btn.color', 'Button color', 'color', '#4B39EF');
    def('More', 'Buttons', 'buttons', 'btn.text', 'Button text color', 'color', '#FFFFFF');
    def('More', 'Buttons', 'buttons', 'btn.size', 'Button text size', 'num', 14, { min: 8, max: 24, step: .5, unit: 'px' });
    def('More', 'Buttons', 'buttons', 'btn.h', 'Button height', 'num', 40, { min: 24, max: 70, step: 1, unit: 'px' });
    def('More', 'Buttons', 'buttons', 'btn.round', 'Roundness', 'num', 8, { min: 0, max: 30, step: .5, unit: 'px' });
    def('More', 'Buttons', 'buttons', 'btn.gap', 'Gap between buttons', 'num', 8, { min: 0, max: 30, step: 1, unit: 'px' });
    def('More', 'Account button', 'account', 'ac.size', 'Size', 'num', 40, { min: 24, max: 70, step: 1, unit: 'px' });
    def('More', 'Account button', 'account', 'ac.color', 'Color', 'color', '#4B39EF');
  },
  onShow() { P = sc.P; },
  update(dt) { P = sc.P; ST.scroll += P['bg2.speed'] * dt; },
  draw(ctx, now, studio) {
    P = sc.P; sc.ty = 0; const W = K.W, H = K.H, k = scaleOf(ctx); G = { tiles: [], tiles2: [], btns: [] };
    ctx.fillStyle = P['bg2.page']; ctx.fillRect(0, 0, W, H);
    if (P['bg2.on']) { const tw = P['bg2.tile'], n = BG.length, total = tw * n, off = ST.scroll % total; ctx.save(); ctx.globalAlpha = P['bg2.alpha']; for (let i = 0; i < n * 2; i++) { const x = i * tw - off; if (x > W || x + tw < 0) continue; cover(ctx, BG[i % n], x, 0, tw, H); } ctx.restore(); }
    K.transitionBoundary?.(ctx);
    // header: glowing logo + title
    const hh = P['logo.header'], ls = P['logo.size'], lx = W / 2, ly = ls / 2, gr = P['logo.glowR'];
    for (const [a, blur, spread] of [[.2, gr * 4, 12], [.5, gr * 2, 8], [.9, gr, 4]]) { ctx.save(); ctx.shadowColor = rgba(P['logo.glow'], a); ctx.shadowBlur = K.shadowBlurFor(ctx, blur); ctx.fillStyle = rgba(P['logo.glow'], a); ctx.beginPath(); ctx.arc(lx, ly, ls / 2 + spread, 0, TAU); ctx.fill(); ctx.restore(); }
    ctx.save(); ctx.beginPath(); ctx.arc(lx, ly, ls / 2, 0, TAU); ctx.clip(); ctx.fillStyle = '#fff'; ctx.fillRect(lx - ls / 2, ly - ls / 2, ls, ls); cover(ctx, LOGO, lx - ls / 2, ly - ls / 2, ls, ls); ctx.restore();
    G.logo = { x: lx - ls / 2, y: 0, w: ls, h: ls };
    ctx.font = `700 ${P['tt.size']}px "Cinzel Decorative", Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; const tx = W / 2 + (18 - 30) / 2;
    ctx.save(); ctx.shadowColor = P['tt.shadow']; ctx.shadowBlur = K.shadowBlurFor(ctx, P['tt.shadowBlur']); ctx.shadowOffsetX = -3 * k; ctx.shadowOffsetY = 3 * k; ctx.fillStyle = P['tt.color']; ctx.fillText(P['tt.text'], tx, ls); ctx.restore();
    const tw0 = ctx.measureText(P['tt.text']).width; G.title = { x: tx - tw0 / 2, y: ls, w: tw0, h: P['tt.size'] * 1.3 };
    // search field
    let y = hh; const sw = Math.min(P['sr.w'], W), sh = P['sr.h'], sx = (W - sw) / 2;
    ctx.fillStyle = P['sr.fill']; ctx.beginPath(); ctx.roundRect(sx, y, sw, sh, Math.min(P['sr.round'], sh / 2)); ctx.fill(); if (P['sr.borderW'] > 0) { ctx.lineWidth = P['sr.borderW']; ctx.strokeStyle = P['sr.border']; ctx.beginPath(); ctx.roundRect(sx + P['sr.borderW'] / 2, y + P['sr.borderW'] / 2, sw - P['sr.borderW'], sh - P['sr.borderW'], Math.min(P['sr.round'], sh / 2)); ctx.stroke(); }
    ctx.font = '400 14px Inter, Roboto, sans-serif'; ctx.fillStyle = P['sr.hintColor']; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(P['sr.hint'], sx + 16, y + sh / 2); G.search = { x: sx, y, w: sw, h: sh }; y += sh;
    // horse
    const hw = P['hs.w'], hhh = P['hs.h']; ctx.save(); ctx.beginPath(); ctx.roundRect(W / 2 - hw / 2, y, hw, hhh, 8); ctx.clip(); cover(ctx, HORSE, W / 2 - hw / 2, y, hw, hhh); ctx.restore(); G.horse = { x: W / 2 - hw / 2, y, w: hw, h: hhh }; y += hhh;
    // the two grids share what is left above the buttons
    const bh = P['btn.h'], btnBlock = 4 * bh + 3 * P['btn.gap'], rest = Math.max(0, H - y - btnBlock), gridH = rest / 2;
    const cols = Math.round(P['g1.cols']), gap = P['g1.gap'], cw = (W - (cols - 1) * gap) / cols;
    const tile = (x, ty, w, h, img, iw, ih, label, fs) => { const s = P['g1.icon']; iw *= s; ih *= s; const lh = fs * 1.2, total = (img ? ih : 0) + (label ? lh : 0), top = ty + (h - total) / 2; if (img) { ctx.save(); ctx.beginPath(); ctx.roundRect(x + w / 2 - iw / 2, top, iw, ih, 8); ctx.clip(); cover(ctx, img, x + w / 2 - iw / 2, top, iw, ih); ctx.restore(); } if (label) { ctx.font = `700 ${fs}px Inter, Roboto, sans-serif`; ctx.fillStyle = P['lb.color']; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(label, x + w / 2, top + (img ? ih : 0)); } };
    ctx.save(); ctx.beginPath(); ctx.rect(0, y, W, gridH); ctx.clip();
    const th1 = cw / P['g1.aspect'];
    T1.forEach((t, i) => { const c = i % cols, r = Math.floor(i / cols), x = c * (cw + gap), ty = y + r * (th1 + gap); tile(x, ty, cw, th1, t.img, t.w, t.h, t.label, t.label === 'Grocery' ? P['lb.sizeGrocery'] : P['lb.size']); G.tiles.push({ x, y: ty, w: cw, h: th1, label: t.label }); });
    ctx.restore(); G.grid1 = { x: 0, y, w: W, h: gridH }; y += gridH;
    ctx.save(); ctx.beginPath(); ctx.rect(0, y, W, gridH); ctx.clip();
    const th2 = cw / P['g2.aspect'], items = [['img', ODIN, 48, 48, 'Odin Concierge'], ['btn', 'Button'], ['btnlabel', 'Valhalla'], ['img', VSHOP, 48, 48, 'Virtual Shop'], ['text', 'P2P']];
    items.forEach((it, i) => { const c = i % 4, r = Math.floor(i / 4), x = c * (cw + 8), ty = y + r * (th2 + 8);
      if (it[0] === 'img') tile(x, ty, cw, th2, it[1], it[2], it[3], it[4], P['lb.size']);
      else if (it[0] === 'text') tile(x, ty, cw, th2, null, 0, 0, it[1], P['lb.size']);
      else { const lh = it[0] === 'btnlabel' ? P['lb.size'] * 1.2 : 0, top = ty + (th2 - bh - lh) / 2; const b = button(ctx, it[1], x + cw / 2, top, bh); G.btns.push(b); if (lh) { ctx.font = `700 ${P['lb.size']}px Inter, Roboto, sans-serif`; ctx.fillStyle = P['lb.color']; ctx.textBaseline = 'top'; ctx.fillText(it[1], x + cw / 2, top + bh); } }
      G.tiles2.push({ x, y: ty, w: cw, h: th2, label: it[it.length - 1] }); });
    ctx.restore(); G.grid2 = { x: 0, y, w: W, h: gridH }; y += gridH;
    for (const label of ['Become a Valkyrie', 'My account', 'Asgard', 'Admin']) { G.btns.push(button(ctx, label, W / 2, y, bh)); y += bh + P['btn.gap']; }
    // account button (top right)
    const as = P['ac.size']; ctx.fillStyle = P['ac.color']; ctx.beginPath(); ctx.roundRect(W - as, 0, as, as, 8); ctx.fill(); ctx.save(); ctx.translate(W - as / 2 - 14, as / 2 - 14); ctx.scale(28 / 24, 28 / 24); ctx.fillStyle = '#fff'; ctx.fill(PERSON); ctx.restore(); G.account = { x: W - as, y: 0, w: as, h: as };
    if (studio) K.hl(ctx, now);
  },
  highlight(ctx, base, sub, H1) {
    const box = (b, pad = 3, r = 6) => () => { ctx.beginPath(); ctx.roundRect(b.x - pad, b.y - pad, b.w + pad * 2, b.h + pad * 2, r); };
    const W = K.W, H = K.H;
    if (base === 'logo' && G.logo) H1(() => { ctx.beginPath(); ctx.arc(G.logo.x + G.logo.w / 2, G.logo.w / 2, G.logo.w / 2 + 6, 0, TAU); });
    else if (base === 'title' && G.title) H1(box(G.title, 4));
    else if (base === 'search' && G.search) H1(box(G.search, 3, 24));
    else if (base === 'horse' && G.horse) H1(box(G.horse, 3));
    else if (base === 'grid1') G.tiles.forEach(t => H1(box(t, -1, 8)));
    else if (base === 'grid2') G.tiles2.forEach(t => H1(box(t, -1, 8)));
    else if (base === 'buttons') G.btns.forEach(b => H1(box(b, 3, 10)));
    else if (base === 'account' && G.account) H1(box(G.account, 3, 10));
    else H1(() => { ctx.beginPath(); ctx.rect(4, 4, W - 8, H - 8); });
  },
  bounds(base) {
    const W = K.W, H = K.H, sq = (x, y, s) => ({ x: x - s / 2, y: y - s / 2, s });
    const c = b => b ? sq(b.x + b.w / 2, b.y + b.h / 2, Math.max(b.w, b.h) * 1.6) : sq(W / 2, H / 2, W);
    if (base === 'logo' || base === 'title') return sq(W / 2, 80, 200);
    if (base === 'search') return sq(W / 2, G.search ? G.search.y + 20 : 170, W);
    if (base === 'horse') return c(G.horse);
    if (base === 'grid1') return sq(W / 2, G.grid1.y + G.grid1.h / 2, W);
    if (base === 'grid2') return sq(W / 2, G.grid2.y + G.grid2.h / 2, W);
    if (base === 'buttons') return sq(W / 2, H - 100, W * .8);
    if (base === 'account') return sq(W - 40, 40, 120);
    return sq(W / 2, H / 2, W);
  },
  pick(p) {
    const inR = b => b && p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
    if (inR(G.account)) return ['More', 'Account button'];
    for (const b of G.btns) if (inR(b)) return ['More', 'Buttons'];
    if (inR(G.logo)) return ['Top', 'Logo']; if (inR(G.title)) return ['Top', 'Title']; if (inR(G.search)) return ['Top', 'Search']; if (inR(G.horse)) return ['Top', 'Horse'];
    if (inR(G.grid1)) return ['Categories', 'Grid']; if (inR(G.grid2)) return ['More', 'Grid'];
    return ['Background', 'Scrolling photos'];
  },
  pointer: {
    down(p) { ST.down = p; },
    up(p) {
      const d = ST.down; ST.down = null; if (!d || Math.hypot(p.x - d.x, p.y - d.y) > 8) return; const inR = b => b && p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
      const sections = { 'Grocery': 'grocery', 'Fast Food': 'fast_food', 'Restaurant': 'sit_down', 'Fast Casual': 'fast_casual', 'Retail': 'retail', 'Pharmacy': 'retail', 'Convenience Store': 'retail', 'Valhalla': 'valhalla' };
      const open = label => {
        const type = sections[label];
        if (!type) return false;
        K.status('Opening ' + label + '…');
        if (window.SleipnirStoreWorkspace) window.SleipnirStoreWorkspace.open(type);
        else location.href = 'pages.html?page=browse&type=' + (type === 'sit_down' || type === 'fast_casual' ? 'restaurant' : type);
        return true;
      };
      const b = G.btns.find(inR); if (b) { if (b.label === 'Asgard') K.go('sky', { href: 'sleipnir-studio-1120.html#sky' }); else if (!open(b.label)) K.status(b.label + ' is not built in the studio yet.'); return; }
      const t = G.tiles.concat(G.tiles2).find(inR); if (t) { if (!open(t.label)) K.status(t.label + ' is not built in the studio yet.'); return; }
      if (inR(G.account)) K.status('My account is not built in the studio yet.');
    },
  },
});
sc.ST = ST; sc.G = () => G;
})();
