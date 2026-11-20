/* Saved tiers, original curved face reflections, and continuous sky travel. */
(() => {
  'use strict';
  const K = window.StudioKit, defaults = ['Baldr', 'Freya', 'Loki', 'Hel'];
  const people = ['Freya','Baldr','Loki','Hel','Tyr','Sif','Saga','Eir','Skadi','Njord','Bragi','Ullr','Vidar','Forseti','Gerd'];
  const portraits = new Map(), lighting = new Map();
  const travel = { distance: 0, phase: 0 };
  let settings, pending, error, engine, reference, snapshot, composite, lightCanvas, lastTime = 0;
  let cacheFrame = -1, cachedPoses = [], faceKey = '';
  const finite = (v, d) => Number.isFinite(Number(v)) ? Number(v) : d;
  const mod = (v, n) => ((v % n) + n) % n;
  function load() {
    if (pending) return pending;
    pending = K.readSavedDesign('raven').then(data => {
      const h = data.holes;
      if (!h?.dashboards?.viewers?.tiers?.[0]?.look || !h.referencePreview || !h.modelPreview?.look || !h.tierModels?.['4']?.look) throw Error('Saved Raven tiers 1–4 are incomplete');
      settings = h; error = null; cacheFrame = -1;
      return h;
    }).catch(e => { error = e.message; K.status('Tier previews: ' + error + '. Use Reload saved tiers to retry.'); return null; });
    return pending;
  }
  function reload() { pending = null; error = null; settings = null; lighting.clear(); portraits.clear(); faceKey = ''; return load(); }
  function identity(p, tier) {
    const name = p['hh.face' + tier];
    return people.includes(name) ? name : defaults[tier - 1];
  }
  function portrait(name) {
    if (!portraits.has(name)) {
      const image = new Image();
      image.onload = () => { faceKey = ''; cacheFrame = -1; };
      image.onerror = () => K.status('Could not load the ' + name + ' preview face. Press Reload saved tiers to retry.');
      image.src = 'faces/' + name + '.jpg'; portraits.set(name, image);
    }
    return portraits.get(name);
  }
  function floatingSpeed(h, p) { return p['hh.drift'] === false ? 0 : Math.max(0, finite(p['hh.speed'], 1)) * Math.max(0, finite(h.together?.speed, finite(h.behavior?.speed, 18))); }
  function advanceMotion(state, h, p, dt) {
    const speed = floatingSpeed(h, p), direction = finite(p['hh.direction'], h.behavior?.direction ?? 1) < 0 ? -1 : 1;
    state.distance += Math.max(0, dt) * speed * direction;
    if (speed > 0) state.phase += Math.max(0, dt);
    return state;
  }
  function models(h, p, g, time, motion) {
    const W = K.W, H = K.H, selected = Number(p['hh.tier'] || 0);
    const tiers = selected ? [selected] : [1, 2, 3, 4];
    const top = Math.max(65, finite(p['hh.top'], 21) + 40);
    const bottom = Math.max(top + 70, g.cy - g.radius - 16), height = bottom - top;
    const base = tiers.length === 1 ? Math.min(W * .105, height * .20) : Math.min(W * .052, height * .085);
    const radius = Math.max(6, base * K.clamp(finite(p['hh.size'], 1), .3, 3));
    const bend = p['hh.lens'] ? finite(p['hh.bend'], 1.16) / 1.16 : 0;
    const reach = finite(p['hh.reach'], 3.5) / 3.5;
    const speed = floatingSpeed(h, p);
    const direction = finite(p['hh.direction'], h.behavior?.direction ?? 1) < 0 ? -1 : 1;
    return tiers.map(tier => {
      const i = tier - 1;
      let look;
      if (tier === 1) look = window.AsgardModelPreview.quiet(h);
      else if (tier === 2) {
        look = { ...h.referencePreview };
        if (h.referenceGrowth?.on) look = window.AsgardVariants.tier2At(look, h.referenceGrowth.views, h.referenceGrowth);
      } else look = window.AsgardModelPreview.hole(window.AsgardModelPreview.forTier(h, tier), time);
      const pad = radius * Math.max(6.5, finite(look.diskOut, 0) / 2 + 1, finite(look.lensReach, 0) + 1);
      const start = (tiers.length === 1 ? .5 : [.15, .65, .37, .87][i]) * W;
      const px = mod(start + pad + (motion?.distance ?? time * speed * direction), W + pad * 2) - pad;
      const lane = tiers.length === 1 ? .48 : [.20, .38, .65, .85][i];
      const phase = motion?.phase ?? (speed ? time : 0);
      const wobble = Math.sin(phase * .13 + i * 1.7) * finite(p['hh.wobble'], .35) * 8;
      const x = px / W, y = (top + height * lane + wobble) / H;
      look = { ...look, x, y, size: radius, radius, drift: false, driftOn: false, wobble: 0,
        lens: finite(look.lens, 1) * bend, faceAmt: p['hh.faces'] === false ? 0 : finite(p['hh.faceAmount'], .85),
        faceShiftX: finite(p['hh.faceX'], 0), faceShiftY: finite(p['hh.faceY'], 0),
        faceRotate: finite(p['hh.faceTurn'], 0), reflectionZoom: finite(p['hh.faceZoom'], 1) };
      if (tier === 2) look.lensReach = finite(look.lensReach, 3.24) * reach;
      else look.reach = finite(look.reach, .55) * reach;
      return { tier, look, pad, identity: identity(p, tier), c: [px, y * H], r: radius, name: 'Tier ' + tier };
    });
  }
  function reflectionSettings(h, p) {
    const r = h.refl || {};
    return { ...r, on: true, size: finite(p['hh.faceSize'], r.size ?? .7),
      bright: finite(p['hh.faceBright'], r.bright ?? .8), blur: finite(p['hh.faceBlur'], r.blur ?? .6),
      gloss: finite(p['hh.faceGloss'], r.gloss ?? .7), rimSky: finite(p['hh.faceRim'], r.rimSky ?? .5),
      catch: finite(p['hh.faceCatch'], r.catch ?? 0) };
  }
  function engineLook(q) {
    if (q.tier !== 2) return q.look;
    // Tier 2's saved gas renderer draws over this same spherical reflection.
    return { ...window.BH.BH_DEFAULTS, ...q.look, disk: 0, ring: 0, corona: 0, glow: 0,
      jets: 0, flare: 0, lens: 0, faceWindow: false };
  }
  function ensureRenderer() {
    if (engine) return;
    snapshot = document.createElement('canvas'); composite = document.createElement('canvas');
    lightCanvas = document.createElement('canvas'); lightCanvas.width = 78; lightCanvas.height = 169;
    const nextEngine = new window.BH.BHScene(document.createElement('canvas'), { scale: 1 });
    const nextReference = new window.AsgardReference.ReferenceHole();
    engine = nextEngine; reference = nextReference;
  }
  function draw(ctx, p, g, time) {
    if (!settings) { load(); return []; }
    if (error) return [];
    try {
      ensureRenderer();
      const W = K.W, H = K.H, frame = K.frameId();
      if (cacheFrame !== frame) {
        const dt = Math.max(0, Math.min(.1, time - lastTime));
        advanceMotion(travel, settings, p, dt);
        const poses = models(settings, p, g, time, travel);
        if (snapshot.width !== W || snapshot.height !== H) {
          snapshot.width = composite.width = W; snapshot.height = composite.height = H; engine.resize(W, H);
        }
        const bg = snapshot.getContext('2d'); bg.clearRect(0, 0, W, H); K.drawBackground(bg, p);
        engine.setBackground('A', snapshot);
        engine.holes = poses.map(engineLook);
        engine.refl = reflectionSettings(settings, p);
        const images = poses.map(q => p['hh.faces'] === false ? null : portrait(q.identity));
        const ready = images.map(im => im?.complete && im.naturalWidth ? im : null);
        const key = poses.map((q, i) => q.tier + ':' + q.identity + ':' + !!ready[i]).join('|');
        if (key !== faceKey) { engine.faces = ready; engine._uploadFaces(); faceKey = key; }
        // Keep the original surrounding-light response, without changing saved disk artwork.
        const lx = lightCanvas.getContext('2d', { willReadFrequently: true });
        lx.drawImage(snapshot, 0, 0, 78, 169);
        const pixels = lx.getImageData(0, 0, 78, 169).data;
        engine.holes.forEach((h, i) => {
          const next = window.BH.surfaceLighting(h, engine.holes, pixels, W, H, settings.rule || {});
          next.surfaceLight[3] *= finite(p['hh.faceLight'], 1);
          const current = window.BH.settleLighting(next, lighting.get(poses[i].tier), dt);
          lighting.set(poses[i].tier, current);
          h.surfaceLight = current.surfaceLight; h.surfaceColor = current.surfaceColor;
        });
        lastTime = time; engine.render(time);
        const out = composite.getContext('2d'); out.clearRect(0, 0, W, H); out.drawImage(engine.canvas, 0, 0, W, H);
        const two = poses.find(q => q.tier === 2);
        if (two) {
          out.save();
          // A lens field cannot erase another hole's face or foreground sphere.
          for (const q of poses.filter(q => q.tier !== 2)) {
            out.beginPath(); out.rect(0, 0, W, H); out.moveTo(q.c[0] + q.r + 2, q.c[1]);
            out.arc(q.c[0], q.c[1], q.r + 2, 0, K.TAU); out.clip('evenodd');
          }
          reference.draw(out, engine.canvas, { ...two.look, faceWindow: p['hh.faces'] !== false }, time, W, H);
          out.restore();
        }
        cachedPoses = poses; cacheFrame = frame;
      }
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.moveTo(g.cx + g.radius, g.cy);
      ctx.arc(g.cx, g.cy, g.radius, 0, K.TAU, true); ctx.clip('evenodd');
      ctx.drawImage(composite, 0, 0, W, H);
      if (p['hh.names']) {
        ctx.font = '500 ' + p['hh.nameSize'] + 'px Roboto'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillStyle = p['hh.nameColor']; ctx.shadowColor = '#000'; ctx.shadowBlur = K.shadowBlurFor(ctx, 5);
        for (const q of cachedPoses) ctx.fillText(q.name, q.c[0], q.c[1] + q.r + 13);
      }
      ctx.restore(); return cachedPoses;
    } catch (e) { error = e.message; K.status('Saved tier preview could not render: ' + error); return []; }
  }
  window.RavenSavedTiers = Object.freeze({ load, reload, draw, models, reflectionSettings, engineLook, advanceMotion });
})();
