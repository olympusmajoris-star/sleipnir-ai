/* Studio previews only: on a desktop, a left-button mouse drag acts like a finger,
   so Flutter rows and pages swipe the same way they do on the phone.
   Touch devices are left alone. */
(function () {
  'use strict';
  if (window.__studioMouseDrag) return;
  window.__studioMouseDrag = true;
  try { if (window.matchMedia && matchMedia('(hover: none) and (pointer: coarse)').matches) return; } catch (e) {}
  var down = false;
  function forward(e) {
    if (e.pointerType !== 'mouse') return;
    if (e.type === 'pointerdown') { if (e.button !== 0) return; down = true; }
    else if (e.type === 'pointermove') { if (!down) return; }
    else { if (!down) return; down = false; }
    e.stopImmediatePropagation();
    var touch = new PointerEvent(e.type, {
      bubbles: true, cancelable: true, composed: true, view: window,
      pointerId: 9001, pointerType: 'touch', isPrimary: true,
      clientX: e.clientX, clientY: e.clientY, screenX: e.screenX, screenY: e.screenY,
      button: e.type === 'pointermove' ? -1 : 0, buttons: e.type === 'pointerup' || e.type === 'pointercancel' ? 0 : 1,
      pressure: e.type === 'pointerup' || e.type === 'pointercancel' ? 0 : 0.5, width: 1, height: 1
    });
    (e.target || document).dispatchEvent(touch);
  }
  ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'].forEach(function (type) {
    window.addEventListener(type, forward, true);
  });
})();
