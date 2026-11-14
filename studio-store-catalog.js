/* Read-only store organization shared by studio editors. No app/catalog writes. */
(function (root) {
  'use strict';
  function folderFor(store, approved) {
    if (!Number.isInteger(store.product_count) || store.product_count < 0)
      throw new Error('Store inventory could not be verified.');
    if (store.product_count === 0) return 'empty';
    return approved.has(store.id) ? 'working' : 'other';
  }
  function prepare(rows, scope) {
    const approved = new Set(scope.stores.map(s => s.id));
    return rows.map(row => ({ ...row, folder: folderFor(row, approved) }));
  }
  async function load({ baseUrl, headers, scopeUrl = 'store-scope.json', fetcher = fetch }) {
    const scopeResponse = await fetcher(scopeUrl, { cache: 'no-cache' });
    if (!scopeResponse.ok) throw new Error('Could not load your selected store list.');
    const scope = await scopeResponse.json(), rows = [], size = 500;
    for (let offset = 0; ; offset += size) {
      const response = await fetcher(baseUrl + '/rest/v1/studio_store_summary_v?select=*&order=id&limit=' + size + '&offset=' + offset, { headers, cache: 'no-cache' });
      if (!response.ok) throw new Error('Could not load current store inventory.');
      const batch = await response.json();
      if (!Array.isArray(batch)) throw new Error('Store inventory returned an invalid result.');
      rows.push(...batch);
      if (batch.length < size) break;
    }
    return prepare(rows, scope);
  }
  const api = { folderFor, prepare, load };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.StudioStoreCatalog = api;
})(typeof window === 'undefined' ? globalThis : window);
