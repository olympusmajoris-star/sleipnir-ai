/* Publix Island Walk's frozen seafood. The station supplies the stock and the live prices. */
(function (global) {
  'use strict';
  const store = '189581c9-d728-4e5d-9e02-ae4de19a15af';
  const station = 'Publix Frozen Seafood Priced 20261120';
  const surfaces = 'grocery-station-surfaces/';
  const photoDirectory = surfaces + 'seafood-products/';
  const shell = surfaces + 'publix-seafood-freezer.webp';
  const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
  // Measured on the 1024 × 1536 cabinet, from the front of each shelf and ticket rail.
  const left = 76/1024, right = 935/1024;
  const shelves = [
    { contact:389/1536, railTop:405/1536, railBottom:431/1536 },
    { contact:705/1536, railTop:721/1536, railBottom:747/1536 },
    { contact:1007/1536, railTop:1024/1536, railBottom:1051/1536 },
    { contact:1321/1536, railTop:1343/1536, railBottom:1370/1536 }
  ];

  function ticketLabel(name) {
    // Print the product or flavor on the narrow rail. The full catalog name is on its hit target.
    const cedar = /cedar planked/i.test(name);
    if (cedar && /pepper/i.test(name)) return 'Pepper';
    if (cedar && /hickory/i.test(name)) return 'Maple';
    if (cedar && /applewood/i.test(name)) return 'Applewood';
    const productName = name.replace(/^(?:Red Lobster|Trident Seafoods|Alaskan Leader Seafood|Shaws Premium Seafood)\s+/i,'');
    const detail = productName.match(/\b(?:medley|scampi|alfredo|grits|coconut|tempura|popcorn|garlic|parmesan|haddock|cod|crab cakes?|fish sticks|clam strips|fish sandwich|mahi-mahi|flounder|salmon|tuna|pollock|octopus|calamari|scallops|mussels|clams|tilapia|swordfish|crawfish|biscuits|shrimp|fillets|fish|lobster)\b/ig) || [];
    const main = detail.find(word => /^(?:medley|scampi|alfredo|grits|coconut|tempura|popcorn|garlic|parmesan|haddock|cod|crab cakes?|fish sticks|clam strips|fish sandwich)$/i.test(word)) || detail[0];
    if (!main) return name;
    const label=main.replace(/^fish /i,'').replace(/^clam strips$/i,'strips');
    return label.charAt(0).toUpperCase()+label.slice(1).toLowerCase();
  }

  function productsFor(rows, catalog, photoUrl) {
    const products = new Map();
    for (const row of rows) {
      if (row.store_id !== store || row.station !== station || !uuid.test(row.product_id) ||
          !row.product_name?.trim() || products.has(row.product_id)) continue;
      const original = photoUrl(row.product_image);
      const prepared = catalog[row.product_id];
      const hasPrepared = prepared?.source === row.product_image &&
        typeof prepared.file === 'string' && /^[a-z\d][a-z\d._-]*\.webp$/i.test(prepared.file);
      products.set(row.product_id, {
        id:row.product_id, name:row.product_name, price:row.price,
        photo:hasPrepared ? photoDirectory + prepared.file : original,
        fallbackPhoto:hasPrepared ? original : '',
        ticketLabel:ticketLabel(row.product_name),
        aspect:hasPrepared && prepared.width>0 && prepared.height>0 ? prepared.width/prepared.height : null,
        shape:hasPrepared && ['carton','pouch','tray','loose'].includes(prepared.shape) ? prepared.shape : 'loose',
        flank:hasPrepared && Array.isArray(prepared.flank) && prepared.flank.length===4 &&
          prepared.flank.every(n=>Number.isFinite(n) && n>=0 && n<=100) ? prepared.flank : null,
      });
    }
    return Array.from(products.values());
  }

  function place(product, row, column, columns) {
    const shelf = shelves[row];
    const cellWidth = (right - left) / Math.max(4, columns);
    const cellLeft = left + cellWidth * column, center = cellLeft + cellWidth/2;
    const clearTop = row ? shelves[row-1].railBottom : .075;
    // Work in the native cabinet coordinates so neither a tall bag nor a wide box
    // acquires the proportions of its slot. Outer lanes have room for a visible return.
    const smallerPack = /(?:crab cakes?|shrimp scampi|pasta bowl|crab delights)/i.test(product.name);
    const maxWidth = Math.min(cellWidth*.81, smallerPack ? .142 : .171);
    const maxHeight = Math.min((shelf.contact-clearTop)*.82, smallerPack ? .112 : .139);
    const aspect = product.aspect && product.aspect * 1536/1024;
    const width = aspect ? Math.min(maxWidth,maxHeight*aspect) : maxWidth;
    const height = aspect ? width/aspect : maxHeight;

    // The camera faces the case just above the second shelf. Receding units
    // converge from the sides and recede up or down depending on shelf height.
    const seed = parseInt(product.id.slice(-6),16);
    const vanishX=.49, eyeLine=.31;
    const toward = Math.abs(vanishX-center)>.025 ? Math.sign(vanishX-center) : (seed%2 ? 1 : -1);
    const frontX = center - toward*Math.min((cellWidth-width)*.27,cellWidth*.055);
    const side = Math.abs(vanishX-center)<.045 ? 'none' : toward===1 ? 'right' : 'left';
    const copies = 2 + seed%3;
    const run = Math.max(Math.abs(vanishX-frontX)*.16,cellWidth*.21);
    const roomForRear = toward>0 ? cellLeft+cellWidth-frontX : frontX-cellLeft;
    const farX = Math.min(run,roomForRear-width*.84/2-.002);
    const farContact = shelf.contact + (eyeLine-shelf.contact)*.14;
    const facings = [];
    for (let depth=copies-1; depth>=0; depth--) {
      // A two-pack lane stops closer to the glass than a four-pack lane.
      const t=depth/(copies-1)*(.52+.24*(copies-2)), scale=1-.16*t;
      const half=width*scale/2, unitHeight=height*scale;
      const cx=frontX+toward*farX*t;
      const contact=shelf.contact+(farContact-shelf.contact)*t;
      facings.push({depth, side, box:[cx-half,contact-unitHeight,cx+half,contact]});
    }
    const photoBox = facings[facings.length-1].box;
    const tagWidth = Math.min(cellWidth*.91,.154);
    const tagBox = [center-tagWidth/2,shelf.railTop,center+tagWidth/2,shelf.railBottom];
    const laneBox = [cellLeft,clearTop,cellLeft+cellWidth,shelf.railTop-.001];
    const hit = [cellLeft,clearTop,cellLeft+cellWidth,shelf.railBottom];
    return {...product, row:row+1, column:column+1, boxes:[hit], laneBox, facings, photoBox, tagBox};
  }

  function panelsFor(rows, catalog, photoUrl) {
    const stock = productsFor(rows, catalog, photoUrl);
    const count = Math.ceil(stock.length/20);
    const panels = [];
    let offset = 0;
    for (let bay=0; bay<count; bay++) {
      const quantity = Math.floor(stock.length/count) + Number(bay < stock.length%count);
      const rowCount = Math.ceil(quantity/5);
      const spots = [];
      for (let row=0; row<rowCount; row++) {
        const columns = Math.floor(quantity/rowCount) + Number(row < quantity%rowCount);
        for (let column=0; column<columns; column++)
          spots.push(place(stock[offset++], row, column, columns));
      }
      panels.push({url:shell, label:'Frozen seafood', layered:true, seafoodFreezer:true,
        width:1024, height:1536, spots});
    }
    return panels;
  }

  async function load({read, photoUrl, signal}) {
    const [rows, catalog] = await Promise.all([
      read('station_render_v', {
        select:'station,store_id,image_order,spot_no,product_id,product_name,product_image,price',
        store_id:'eq.'+store, station:'eq.'+station, order:'image_order,spot_no'
      }, signal),
      fetch(photoDirectory+'catalog.json', {signal}).then(async response => response.ok ? await response.json() : {})
        .catch(error => { if (signal?.aborted) throw error; return {}; })
    ]);
    return panelsFor(rows, catalog || {}, photoUrl);
  }

  const api = {load, panelsFor};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.PublixSeafoodFreezer = api;
})(typeof window === 'undefined' ? globalThis : window);
