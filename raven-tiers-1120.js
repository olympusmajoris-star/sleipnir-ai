/* Read-only bridge from Danny's saved Raven tiers to the see-through directory.
   Reuses the existing tier renderers and saved looks; no copied presets. */
(() => {
  'use strict';
  const K = window.StudioKit;
  let settings, pending, error, engine, reference, snapshot, composite, cacheFrame = -1, cachedPoses = [];
  const finite = (v, d) => Number.isFinite(Number(v)) ? Number(v) : d;
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
  function reload() { pending = null; error = null; settings = null; return load(); }
  function models(h, p, g, time) {
    const W = K.W, H = K.H, selected = Number(p['hh.tier'] || 0);
    const tiers = selected ? [selected] : [1, 2, 3, 4];
    const top = Math.max(65, finite(p['hh.top'], 21) + 40);
    const bottom = Math.max(top + 70, g.cy - g.radius - 16), height = bottom - top;
    const base = tiers.length === 1 ? Math.min(W * .105, height * .20) : Math.min(W * .052, height * .085);
    const radius = Math.max(6, base * K.clamp(finite(p['hh.size'], 1), .3, 3));
    const bend = p['hh.lens'] ? finite(p['hh.bend'], 1.16) / 1.16 : 0;
    const reach = finite(p['hh.reach'], 3.5) / 3.5;
    return tiers.map((tier, i) => {
      let x = tiers.length === 1 ? .5 : i % 2 === 0 ? .25 : .75;
      const y = (top + height * (tiers.length === 1 ? .48 : i < 2 ? .25 : .75)) / H;
      if (p['hh.drift']) x += .022 * Math.sin(time * .10 * finite(p['hh.speed'], 1) + i * 1.6);
      let look;
      if (tier === 1) look = window.AsgardModelPreview.quiet(h);
      else if (tier === 2) {
        look = { ...h.referencePreview };
        if (h.referenceGrowth?.on) look = window.AsgardVariants.tier2At(look, h.referenceGrowth.views, h.referenceGrowth);
      } else look = window.AsgardModelPreview.hole(window.AsgardModelPreview.forTier(h, tier), time);
      look = { ...look, x, y, size: radius, radius, drift: false, driftOn: false, wobble: 0, lens: finite(look.lens, 1) * bend };
      if (tier === 2) look.lensReach = finite(look.lensReach, 3.24) * reach;
      else look.reach = finite(look.reach, .55) * reach;
      return { tier, look, c: [x * W, y * H], r: radius, name: 'Tier ' + tier };
    });
  }
  function ensureRenderer() {
    if (engine) return;
    snapshot = document.createElement('canvas');
    composite = document.createElement('canvas');
    const nextEngine = new window.BH.BHScene(document.createElement('canvas'), { scale: 1 });
    nextEngine.refl = { on: false };
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
        const poses = models(settings, p, g, time);
        if (snapshot.width !== W || snapshot.height !== H) {
          snapshot.width = composite.width = W; snapshot.height = composite.height = H;
          engine.resize(W, H);
        }
        // Capture the same live camera/tilt frame as the directory, every frame.
        const bg = snapshot.getContext('2d'); bg.clearRect(0, 0, W, H); K.drawBackground(bg, p);
        engine.setBackground('A', snapshot);
        engine.holes = poses.filter(q => q.tier !== 2).map(q => q.look);
        engine.render(time);
        const out = composite.getContext('2d'); out.clearRect(0, 0, W, H); out.drawImage(engine.canvas, 0, 0, W, H);
        const two = poses.find(q => q.tier === 2);
        if (two) reference.draw(out, snapshot, two.look, time, W, H);
        cachedPoses = poses; cacheFrame = frame;
      }
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(g.cx, g.cy, g.radius, 0, K.TAU, true); ctx.clip('evenodd');
      ctx.drawImage(composite, 0, 0, W, H);
      if (p['hh.names']) {
        ctx.font = `500 ${p['hh.nameSize']}px Roboto`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillStyle = p['hh.nameColor']; ctx.shadowColor = '#000'; ctx.shadowBlur = K.shadowBlurFor(ctx, 5);
        for (const q of cachedPoses) ctx.fillText(q.name, q.c[0], q.c[1] + q.r + 13);
      }
      ctx.restore(); return cachedPoses;
    } catch (e) { error = e.message; K.status('Saved tier preview could not render: ' + error); return []; }
  }
  window.RavenSavedTiers = Object.freeze({ load, reload, draw, models });
})();
