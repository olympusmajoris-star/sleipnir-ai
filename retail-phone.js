(() => {
  'use strict';
  const device = document.querySelector('#device');
  const query = new URLSearchParams(location.search);
  const store = query.get('store') || '';
  if (!/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(store)) {
    device.hidden = true;
    document.querySelector('#unavailable').hidden = false;
    return;
  }
  function fit() {
    const bounds = device.parentElement.getBoundingClientRect();
    const margin = bounds.width < 500 ? 8 : 32;
    device.style.setProperty('--zoom', Math.min(1, (bounds.width-margin)/412, (bounds.height-margin)/866));
  }
  function time() {
    document.querySelector('#clock').textContent = new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit',hour12:true}).replace(/\s*[AP]M$/i,'');
  }
  fit();
  new ResizeObserver(fit).observe(device.parentElement);
  time(); setInterval(time, 30000);
  const frame = document.querySelector('#shop');
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== frame.contentWindow ||
        event.data?.channel !== 'sleipnir-native-commerce-v1' || event.data.type !== 'ready') return;
    if (typeof event.data.store_name === 'string') {
      document.title = event.data.store_name + ' · iPhone preview';
      frame.title = event.data.store_name + ' shopper preview';
    }
  });
  const params = new URLSearchParams({store});
  const category = query.get('category')?.trim();
  if (category && category.length <= 120) params.set('category', category);
  frame.src = 'native-shopper-preview/index.html?' + params;
})();
