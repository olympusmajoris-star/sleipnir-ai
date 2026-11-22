/* Keep the Asgard feed, labels and orbs above the shared sky in its original strip. */
(() => {
  'use strict';
  const kit = window.StudioKit;
  function intercept(context, name, wrap) {
    const original = context[name], own = Object.getOwnPropertyDescriptor(context,name);
    const undo = () => {
      if (own) Object.defineProperty(context,name,own);
      else delete context[name];
    };
    context[name] = wrap(original,undo);
    return undo;
  }
  kit.paintAsgardScene = (ctx, sc, paint) => {
    const strip = sc._layer || (sc._layer = document.createElement('canvas'));
    const W = kit.W, H = Math.min(sc.P['strip.max'], kit.H * sc.P['strip.share']);
    // The original painter resets this dedicated canvas, paints its sky, then saves
    // the context before drawing the orbs, names and other foreground marks.
    const sky = kit.hasPageSky?.(sc.id);
    const restoreSky = sky && intercept(strip.getContext('2d'),'save',(save,undo) => function() {
      undo();
      kit.drawPageSky(this,sc.id,W,H);
      return save.call(this);
    });
    // Other views of this screen (e.g. a flight) don't composite this strip.
    // Only an actual full-strip blit establishes a separable foreground boundary.
    const restoreFrame = intercept(ctx,'drawImage',(blit,undo) => function(...args) {
      const result = blit.apply(this,args);
      if (args.length === 9 && args[0] === strip && args[1] === 0 && args[2] === 0 &&
          args[3] === strip.width && args[4] === strip.height &&
          args[5] === 0 && args[6] === 0 && args[7] === W && args[8] === H) {
        undo(); kit.transitionBoundary(ctx);
      }
      return result;
    });
    try { paint(); } finally { restoreFrame(); if (restoreSky) restoreSky(); }
  };
})();
