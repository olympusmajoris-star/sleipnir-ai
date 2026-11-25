/* Published product assets inherit catalog identity. A changed source uses the live photo pipeline. */
(function (root) {
  'use strict';
  const base = new URL('./dg-packshots/v1/', document.currentScript?.src || document.baseURI);
  const sheets = new Map();
  const dgSource = 'https://s7d1.scene7.com/is/image/dolgen/';
  const folder = 'menu-images/dg-studio/product-photos/v1/';
  const slug = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  function index(aisle) {
    if (!sheets.has(aisle)) {
      const request = fetch(new URL(slug(aisle) + '.json', base))
        .then(response => response.ok ? response.json() : null)
        .catch(() => null);
      sheets.set(aisle, request);
      request.then(result => { if (!result) sheets.delete(aisle); });
    }
    return sheets.get(aisle);
  }
  async function apply(items, rows) {
    const categories = [...new Set(items.map(item => rows.get(item.id)?.category).filter(Boolean))];
    const maps = new Map(await Promise.all(categories.map(async name => [name, await index(name)])));
    for (const item of items) {
      const row = rows.get(item.id);
      const record = maps.get(row?.category)?.[item.id];
      if (!record || typeof row.image_url !== 'string') continue;
      const source = row.image_url.startsWith(dgSource) ? row.image_url.slice(dgSource.length) : row.image_url;
      const [publishedSource, hash, width, height] = record;
      if (source !== publishedSource || !/^[a-f0-9]{64}$/.test(hash) || !(width > 0 && height > 0)) continue;
      const image = root.StudioTransferConfig.url + '/storage/v1/object/public/' + folder + hash + '.webp';
      item.originalPhoto = item.image;
      item.photos = [image, ...item.photos];
      item.image = image;
      item.aspect = width / height;
      item.packshot = true;
    }
  }
  const workerURL = new URL('dg-shelf-photo-worker.js?v=dg-shelves-20261125-3', document.currentScript?.src || document.baseURI);
  const pending = new Map();
  let worker, disabled = false, sequence = 0;
  function failWorker() {
    disabled = true;
    worker?.terminate();
    worker = null;
    for (const done of pending.values()) done(null);
    pending.clear();
  }
  function prepare(source) {
    if (disabled || !root.Worker || !root.OffscreenCanvas || !root.createImageBitmap) return Promise.resolve(null);
    try {
      if (!worker) {
        worker = new Worker(workerURL);
        worker.onerror = failWorker;
        worker.onmessage = ({data}) => {
          const done = pending.get(data.id);
          if (!done) return;
          pending.delete(data.id);
          done(data.blob && data.width > 0 && data.height > 0 ? {
            image: URL.createObjectURL(data.blob), w:data.width, h:data.height,
            aspect:data.width/data.height, crop:[0,0,data.width,data.height]
          } : null);
        };
      }
      const id = ++sequence;
      return new Promise(resolve => {
        pending.set(id, resolve);
        try { worker.postMessage({id,source}); } catch { failWorker(); }
      });
    } catch { failWorker();return Promise.resolve(null); }
  }
  root.DollarGeneralShelfPhotos = {apply,prepare};
})(window);
