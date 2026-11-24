/* Paint the official Lucide icons after the phone template has been mounted. */
(function (G) {
  'use strict';
  if (G.lucide && typeof G.lucide.createIcons === 'function') {
    G.lucide.createIcons({ attrs: { 'aria-hidden': 'true', focusable: 'false' } });
  }
})(window);
