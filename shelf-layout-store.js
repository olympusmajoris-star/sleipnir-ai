(function (root) {
  'use strict';

  function result(value) {
    if (!value || !Number.isInteger(value.revision) || value.revision < 0 ||
        !(value.layout === null || (value.layout && typeof value.layout === 'object' && !Array.isArray(value.layout)))) {
      throw new Error('The store returned an invalid shelf layout.');
    }
    return {revision:value.revision, layout:value.layout};
  }

  async function call(name, body, auth) {
    const response = await root.StudioJobs.request('/rest/v1/rpc/' + name, {method:'POST', body, auth});
    return result(response);
  }

  root.ShelfLayoutStore = {
    load(storeId, aisleKey) {
      return call('studio_grocery_shelf_layout', {p_store_id:storeId, p_aisle_key:aisleKey}, false);
    },
    save(storeId, aisleKey, layout, expectedRevision) {
      return call('studio_save_grocery_shelf_layout', {
        p_store_id:storeId, p_aisle_key:aisleKey, p_layout:layout, p_expected_revision:expectedRevision
      }, true);
    }
  };
})(window);
