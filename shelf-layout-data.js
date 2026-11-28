/* Shelf layout uses the same store stock list as the aisle editor. */
(() => {
  'use strict';

  const dollarGeneralStores = new Set(['0600cb61-45f9-402b-a209-134abdaef10f','fea775c8-8612-4f2e-bfc6-70d8e6ace6be']);
  const target = '35ef70d0-3d20-4599-96a3-648ee3c7c340';
  const uuid = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
  const targetRooms = new Map([
    ['Canned Goods & Soups', 'dark_shelf'],
    ['Condiments & Sauces', 'dark_shelf'],
    ['Dairy & Eggs', 'glass_cooler']
  ]);
  const assets = 'target-studio/product-scale/v1/';
  const manifest = assets + 'a18331f4777f1067fd3c0a2c22b08745128a477f24b08ace9751cbc92acf3a63.json';
  const plateFiles = {
    shelf: assets + 'f15c230adeff3a1593fe24ba227e99816ebd0ef57540f4ba738976954030cf6c.png',
    cooler: assets + '3cf7c88db2375354e6dfe501f70e43876ca9697266e0077ef49c0cf343a77418.png'
  };
  const rulesURL = new URL('shelf-product-kinds.json', document.currentScript?.src || document.baseURI);
  const dgRulesURL = new URL('dg-product-kinds.json', document.currentScript?.src || document.baseURI);
  const fields = 'id,store_id,category,name,full_name,price,image_url,image_url_orig,shelf_group';
  const base = () => window.StudioTransferConfig.url;
  const media = path => base() + '/storage/v1/object/public/menu-images/' + path;
  const immutable = new Map();

  function staticJSON(url) {
    const href = String(url);
    if (!immutable.has(href)) {
      immutable.set(href, fetch(href).then(response => {
        if (!response.ok) throw Error('Could not load the shelf artwork or product groups.');
        return response.json();
      }).catch(error => { immutable.delete(href); throw error; }));
    }
    return immutable.get(href);
  }

  async function read(table, query, signal) {
    const {url,key} = window.StudioTransferConfig;
    const request = url + '/rest/v1/' + table + '?' + new URLSearchParams(query);
    for (let attempt = 0; ; attempt++) {
      const response = await fetch(request,{signal,headers:{apikey:key,Authorization:'Bearer '+key}});
      if (response.ok) return response.json();
      if (attempt || response.status < 500) throw Error('The store could not load its shelf products. Try again.');
    }
  }

  async function pages(table, query, signal) {
    const all = [];
    for (let offset = 0; ; offset += 1000) {
      const batch = await read(table,{...query,limit:1000,offset},signal);
      all.push(...batch);
      if (batch.length < 1000) return all;
    }
  }

  async function byIds(store, ids, signal) {
    const batches = [];
    for (let i = 0; i < ids.length; i += 65) batches.push(ids.slice(i,i+65));
    const rows = [];
    for (let i = 0; i < batches.length; i += 4) {
      const responses = await Promise.all(batches.slice(i,i+4).map(batch =>
        read('products',{select:fields,store_id:'eq.'+store,id:'in.('+batch.join(',')+')'},signal)));
      for (const result of responses) rows.push(...result);
    }
    return rows;
  }

  function photo(value) {
    if (typeof value !== 'string' || !value.trim()) return '';
    const raw = value.trim();
    try {
      const url = raw.includes(':') ? new URL(raw) : new URL(media(raw));
      return url.protocol === 'https:' && !url.username && !url.password &&
        !/\.svg(?:$|[?#])/i.test(url.pathname) ? url.href : '';
    } catch { return ''; }
  }

  // Ask DG's own image service for a sharp, bandwidth-conscious shelf photo.
  // The original URL remains available as a fallback and is never overwritten.
  function dollarGeneralPhoto(value) {
    try {
      const url = new URL(value);
      if (url.hostname !== 's7d1.scene7.com' || !url.pathname.startsWith('/is/image/dolgen/')) return value;
      for (const [key,val] of Object.entries({wid:'600',hei:'600',fit:'constrain',fmt:'jpeg',qlt:'90'})) url.searchParams.set(key,val);
      return url.href;
    } catch { return value; }
  }

  // Prefer the calibrated Target group. Some raw milk records have catalog group "Eggs".
  function kindFor(rules, aisle, group, name, calibrated) {
    const family = rules[aisle];
    if (!family) return group || aisle;
    const alias = family.aliases[group.toLowerCase()];
    if (calibrated && alias) return alias;
    const title = name.split(' - ')[0].replace(/[™®]/g,'');
    for (const [kind, pattern] of family.rules) if (pattern.test(title)) return kind;
    return alias || group || aisle;
  }

  // Match specific names first, then use only the supplier groups that describe
  // merchandise. Campaign and brand names never become default aisle tabs.
  function dollarGeneralKinds(entries, aisle) {
    const rules = entries.map(([label, pattern, ...aliases]) => ({
      label, pattern:pattern ? new RegExp(pattern,'i') : null, aliases
    }));
    const drinkOrder = [
      'Cola & pepper soda', 'Citrus soda', 'Root beer & cream soda', 'Ginger ale',
      'Fruit & specialty soda', 'Drinking water', 'Sparkling & flavored water',
      'Sports & hydration drinks', 'Energy drinks', 'Juice & lemonade', 'Iced tea',
      'Chocolate & coffee drinks', 'Drink mixes', 'Beer & hard beverages', 'Bottled beverages'
    ];
    const labels = aisle === 'Soda, Water & Drinks' ? drinkOrder : rules.map(rule => rule.label);
    const ranks = new Map(labels.map((label,index) => [label,index]));
    return (name, group) => {
      const title = name.replace(/&#(?:8217|39);|&apos;|[’‘]/g, "'").replace(/&amp;/g,'&');
      const matched = rules.find(rule => rule.pattern?.test(title)) ||
        rules.find(rule => rule.aliases.includes(group)) || rules.at(-1);
      const kind = matched?.label || aisle;
      return {kind,kindOrder:ranks.get(kind) ?? labels.length};
    };
  }

  function naturalSize(name) {
    return (name.match(/\b\d+(?:\.\d+)?\s*(?:fl\.?\s*oz|lbs?|oz|gals?|ml|kg|g|ct)\b/i)||[])[0] || '';
  }

  function safeAtlas(path, scene) {
    if (typeof path !== 'string' || typeof scene !== 'string') return false;
    const folder=scene.slice(0,scene.lastIndexOf('/')+1);
    const prefix=path.startsWith(assets) ? assets : folder;
    return (prefix===assets || /^target-renders\/[a-z-]+\/$/.test(prefix)) &&
      path.startsWith(prefix) && /^[0-9a-f]{64}\.webp$/.test(path.slice(prefix.length));
  }

  async function sourceArt(aisle, signal) {
    if (!targetRooms.has(aisle)) return new Map();
    const [atlas, rows] = await Promise.all([
      staticJSON(media(manifest)),
      pages('target_renders',{select:'render_no,image_path,target_render_slots(product_id,slot,shelf_group,size)',aisle:'eq.'+aisle,
        status:'eq.done',facings:'eq.2',display:'eq.'+targetRooms.get(aisle),order:'render_no'},signal)
    ]);
    const art = new Map();
    for (const row of rows) {
      const panel = atlas.panels?.[row.render_no];
      const matched = panel?.scene === row.image_path && panel.fixture === targetRooms.get(aisle) && safeAtlas(panel.atlas,panel.scene);
      const cropById = new Map((matched ? panel.slots : []).map(crop=>[crop.id,crop]));
      for (const spot of row.target_render_slots || []) {
        const id=spot.product_id;
        if (!uuid.test(id) || art.has(id)) continue;
        const crop = cropById.get(id), extra = {};
        if (crop && Array.isArray(crop.src) && crop.src.length===4 && crop.src.every(Number.isFinite) &&
            crop.src[0]>=0 && crop.src[1]>=0 && crop.src[2]>0 && crop.src[3]>0 &&
            crop.src[0]+crop.src[2]<=atlas.atlasWidth && crop.src[1]+crop.src[3]<=atlas.atlasHeight) {
          Object.assign(extra,{source:crop.src,atlas:media(panel.atlas),aspect:crop.src[2]/crop.src[3],base:crop.dst});
        }
        art.set(id,{group:String(spot.shelf_group||'').trim(),size:String(spot.size||'').trim(),panel:row.render_no,slot:spot.slot,...extra});
      }
    }
    return art;
  }

  async function load({store,aisle,authoredId,mode,signal}) {
    if (!uuid.test(store||'') || !String(aisle||'').trim() || (authoredId && !uuid.test(authoredId))) {
      throw Error('Choose a store and an aisle.');
    }
    let source = aisle, custom, fixture;
    if (authoredId) {
      const rows = await read('rpc/studio_grocery_aisles',{p_store_id:store},signal);
      const match=rows.find(row=>row.store_id===store && row.aisle_id===authoredId && row.published_revision>0);
      if (!match) throw Error('This published aisle is unavailable at this store.');
      fixture = match.fixture;
      source = match.source_aisle || match.title;
      if (match.stock_mode==='custom') custom=match.product_ids;
    }
    const isDollarGeneral = dollarGeneralStores.has(store);
    const catalogPromise = custom ? Promise.resolve([]) :
      pages('products',{select:fields,store_id:'eq.'+store,category:'eq.'+source,order:'shelf_group.nullslast,name,id'},signal);
    // Both DG formats use their own live catalog for ordinary merchandise; a special
    // physical render is shown in its own bay, not duplicated on a code shelf.
    const stockPromise = custom ? Promise.resolve(custom) : isDollarGeneral && !authoredId ?
      catalogPromise.then(rows=>rows.map(row=>row.id)) :
      pages('rpc/studio_grocery_aisle_original_stock',{p_store_id:store,p_source_aisle:source,order:'position'},signal).then(rows=>rows.map(row=>row.product_id));
    const renderedPromise = isDollarGeneral && !authoredId ? pages('aisle_slots',{select:'product_id',store_id:'eq.'+store,tag_x:'not.is.null',tag_y:'not.is.null',tag_w:'not.is.null',tag_h:'not.is.null',order:'product_id'},signal).then(rows=>new Set(rows.map(row=>row.product_id))) : Promise.resolve(new Set());
    const [ids,stock,art,rulesJSON,dgRules,renderedIds] = await Promise.all([
      stockPromise,catalogPromise,store===target ? sourceArt(source,signal) : Promise.resolve(new Map()),staticJSON(rulesURL),
      isDollarGeneral ? staticJSON(dgRulesURL) : Promise.resolve(null),renderedPromise
    ]);
    const scoped = new Map(stock.filter(row=>row.store_id===store).map(row=>[row.id,row]));
    const ordered = [...new Set(ids.filter(id=>typeof id==='string' && uuid.test(id) && !renderedIds.has(id)))];
    const missing = ordered.filter(id=>!scoped.has(id));
    for (const row of await byIds(store,missing,signal)) if (row.store_id===store) scoped.set(row.id,row);
    const rules = Object.fromEntries(Object.entries(rulesJSON).map(([key,value])=>[key,{
      aliases:value.aliases,rules:value.rules.map(([kind,pattern])=>[kind,new RegExp(pattern,'i')])
    }]));
    const dgAlias={'Cleaning':'Household Cleaning','Household':'Home Decor & Storage','Beauty':'Beauty & Hair Care','Health':'Health & Wellness','Electronics':'Electronics & Tech','Baby':'Baby & Diapers','Pet':'Pet Supplies','Office & School Supplies':'School & Office','Party & Occasions':'Party & Celebrations','Outdoor Living':'Outdoor & Garden','Seasonal':'Seasonal & Holidays','Apparel':'Apparel & Accessories','Toys':'Toys & Games'};
    const dgEntries=isDollarGeneral?(dgRules[source]||dgRules[dgAlias[source]]):null;
    const classify = dgEntries ? dollarGeneralKinds(dgEntries,source) : null;
    const items=[];
    for (const [sourceIndex,id] of ordered.entries()) {
      const row = scoped.get(id);
      if (!row) continue; // The SKU may have been removed since the membership read.
      const calibrated=art.get(id), group=calibrated?.group || String(row.shelf_group || '').trim() || source;
      const name=String(row.name||row.full_name||'').trim();
      const price=row.price==null || !Number.isFinite(Number(row.price)) || Number(row.price)<0 ? null : Number(row.price);
      const originals=[...new Set([photo(row.image_url),photo(row.image_url_orig)].filter(Boolean))];
      const dollarGeneral=mode==='dollar-general' || isDollarGeneral;
      const photos=[...new Set([...(dollarGeneral?originals.map(dollarGeneralPhoto):[]),...originals])];
      const type = classify ? classify(name,group) : {kind:kindFor(rules,source,group,name,Boolean(calibrated?.group))};
      items.push({...calibrated,id,sourceIndex,name,price,group,...type,
        size:calibrated?.size || naturalSize(row.full_name||name),image:photos[0]||'',photos});
    }
    if (isDollarGeneral && window.DollarGeneralShelfPhotos) await window.DollarGeneralShelfPhotos.apply(items,scoped);
    fixture = fixture || (/frozen|freezer/i.test(source) ? 'freezer' : /dairy|refrigerated|seafood|meat|deli/i.test(source) ? 'cooler' : 'shelf');
    return {items,fixture,plate:media(plateFiles[fixture] || (fixture==='freezer'?plateFiles.cooler:plateFiles.shelf)),
      groups:[...new Set(items.map(item=>item.group))], kinds:[...new Set(items.map(item=>item.kind))]};
  }

  window.ShelfLayoutData = {load};
})();

