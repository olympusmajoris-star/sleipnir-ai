/* Branches with an editable dining room but no connected local ordering catalog. */
(() => {
  'use strict';
  const studio = 'https://palm-coast-chain-dining-studio.transparentmoth1.chatgpt.site/';
  const branches = [
    ['brass-tap', 'The Brass Tap', '250 Palm Coast Pkwy NE Suite 201'],
    ['carrabbas', "Carrabba's Italian Grill", '160 Cypress Edge Drive'],
    ['millers', "Miller's Ale House", '5861 State Highway 100 E'],
    ['olive-garden', 'Olive Garden', '5294 E Highway 100'],
    ['outback', 'Outback Steakhouse', '45 Plaza Drive'],
    ['sonnys', "Sonny’s BBQ", '25 Cypress Edge Drive'],
    ['texas-roadhouse', 'Texas Roadhouse', '1298 Palm Coast Pkwy SW'],
  ];

  const nameKey = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const streetKey = address => String(address || '').split(',')[0].toLowerCase()
    .replace(/\b(?:(?:(?:east|e)\s+)?(?:state\s+)?(?:highway|hwy|road)|fl|sr)[- ]*100(?:\s+(?:east|e))?\b/g,'sr100')
    .replace(/\b(drive|parkway|highway|suite)\b/g, word =>
      ({drive:'dr', parkway:'pkwy', highway:'hwy', suite:'ste'})[word])
    .replace(/[^a-z0-9]/g, '');

  function withDiningRooms(stores) {
    const rows = stores.slice();
    for (const [slug, name, street] of branches) {
      const id = 'palm-coast-' + slug;
      const address = street + ', Palm Coast, FL';
      const matches = row => window.StudioWorkspaceCore.physicalCity(row).toLowerCase() === 'palm coast' &&
        nameKey(row.name).startsWith(nameKey(name)) && streetKey(row.address) === streetKey(street);
      // A connected local branch retains the app's existing route and inventory.
      if (stores.some(matches)) continue;
      rows.push({id, name, address, town:'Palm Coast', menu_type:'sit_down', designRoomUrl:studio + '?store=' + id});
    }
    return rows;
  }
  const scopeUrl = new URL('store-scope.json', document.currentScript.src);
  let approvedNames, checkedAt=0;
  async function findDiningRooms(term) {
    const query=nameKey(term);
    if(query.length<2)return [];
    if(!approvedNames || Date.now()-checkedAt>60000){
      const response=await fetch(scopeUrl,{cache:'no-cache'});
      if(!response.ok)throw Error('Store names unavailable');
      const scope=await response.json();
      approvedNames=scope.stores;
      checkedAt=Date.now();
    }
    const ids=approvedNames.filter(row=>nameKey(row.name).includes(query)).map(row=>row.id);
    if(!ids.length || ids.length>10 || ids.some(id=>!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)))return [];
    const config=window.StudioTransferConfig;
    const params=new URLSearchParams({p_store_ids:'{'+ids.join(',')+'}'});
    const response=await fetch(config.url+'/rest/v1/rpc/studio_palm_coast_editor_locations?'+params,{
      headers:{apikey:config.key,Authorization:'Bearer '+config.key},cache:'no-cache'
    });
    if(!response.ok)throw Error('Dining room lookup unavailable');
    const rows=await response.json();
    return rows.filter(row=>ids.includes(row.id) && Number(row.product_count)>0 && window.DiningRoomNavigation.urlFor(row));
  }
  window.PalmCoastDesignLocations = Object.freeze({withDiningRooms,findDiningRooms});
})();
