/* Shared by the DG entrance, shopping view and organizer so the same aisle has one shelf order. */
(function (root) {
  'use strict';
  const compare = new Intl.Collator('en', { numeric: true, sensitivity: 'base' }).compare;

  function defaults(saved, authored) {
    return {
      rows: 4,
      rail: 5,
      tabHeight: 32,
      facings: 1,
      groupBy: authored ? 'original' : 'type',
      ...saved,
      products: { ...saved?.products }
    };
  }

  function packageGroup(item, aisle) {
    if (aisle !== 'Soda, Water & Drinks') return 0;
    const name = item.name || '';
    if (/\b(?:[2-9]|[1-9]\d)\s*[- ]?\s*(?:count|pack|pk|ct)\b|\bfridge pack|\bmultipack/i.test(name)) return 2;
    if (/\b(?:[1-9]\d*(?:[.,]\d+)?\s*(?:l\b|liters?|litres?|gallons?|gal\b)|(?:4[0-9]|[5-9]\d|1\d\d)\s*(?:fl\.?\s*)?oz)\b/i.test(name)) return 1;
    return 0;
  }

  function brandKey(name) {
    const title = String(name || '').toLowerCase();
    const familiar = title.match(/coca[ -]?cola|\bcoke\b|pepsi|dr\.? pepper|clover valley/);
    if (familiar) return /coca|coke/.test(familiar[0]) ? 'coca-cola' : familiar[0];
    return (title.match(/[\p{L}\p{N}]+/u) || [title])[0];
  }

  function merchandise(items, aisle) {
    const formats = new Map();
    const ordered = [...items].sort((a,b) => compare(a.name,b.name) || compare(a.size || '',b.size || '') || compare(a.id,b.id));
    for (const item of ordered) {
      const format = packageGroup(item, aisle);
      if (!formats.has(format)) formats.set(format,new Map());
      const brands = formats.get(format);
      const brand = brandKey(item.name);
      if (!brands.has(brand)) brands.set(brand,[]);
      brands.get(brand).push(item);
    }
    const result = [];
    for (const [,brands] of [...formats].sort(([a],[b]) => a-b)) {
      // Show different labels across a row of the same kind before its next flavors.
      const lines = [...brands.values()];
      for (let index=0; lines.some(line => line.length>index); index++) {
        for (const line of lines) if (line[index]) result.push(line[index]);
      }
    }
    return result;
  }

  function groups(items, layout, aisle) {
    const result = new Map();
    const ranks = new Map();
    for (const item of items) {
      const name = layout.groupBy === 'type'
        ? layout.products[item.id]?.group || item.kind || item.group || aisle
        : item.group || aisle;
      if (!result.has(name)) result.set(name, []);
      result.get(name).push(item);
      if (name === item.kind && Number.isFinite(item.kindOrder)) ranks.set(name, item.kindOrder);
    }
    if (layout.groupBy !== 'type') return result;
    for (const [name, products] of result) result.set(name, merchandise(products, aisle));
    return new Map([...result].sort(([a], [b]) =>
      (ranks.get(a) ?? Infinity) - (ranks.get(b) ?? Infinity) || compare(a, b)));
  }
  // Allocate shelf space before images load. Known photo proportions take priority.
  // For new items, use their package format until the next catalog artwork release.
  // The layout stays put while the shopper moves between bays.
  function estimatedAspect(item) {
    if (item.aspect > 0) return item.aspect;
    const description = [item.kind, item.name].join(' ');
    if (/\b(case|fridge pack|diapers|wipes|pizza|plates|12.pack|24.pack)\b/i.test(description)) return 1.5;
    if (/\b(bottles?|shampoo|body wash|sparkling water|soda|sports drinks?|wine|juice|liquid soap|ketchup|spray)\b/i.test(description)) return .43;
    if (/\b(cans?|canned|soups?|tomato paste|beans|corn|peaches|metal tin)\b/i.test(description)) return .67;
    if (/\b(chips|pouches|cereal|coffee|bags?|crackers)\b/i.test(description)) return .76;
    return .94;
  }

  function allocate(items, available, referenceHeight, defaultFacings, transforms) {
    const cells = new Map();
    let row = [], used = 0, line = 0;
    function place(finalRow) {
      if (!row.length) return;
      // A short final row keeps the package spacing of its neighbors.
      const stretch = finalRow ? 1 : Math.min(1.25, available / used);
      let left = 0;
      for (const [id, requested] of row) {
        const width = requested * stretch;
        cells.set(id, {line, left, width});
        left += width;
      }
      line++;
      row = [];
      used = 0;
    }
    for (const item of items) {
      if (!item?.id) continue;
      const move = transforms instanceof Map ? transforms.get(item.id) : transforms[item.id];
      const facings = Math.min(3, Math.max(1, move?.facings || defaultFacings));
      const packageWidth = estimatedAspect(item) * referenceHeight * .67;
      const desired = Math.min(available * .62, Math.max(available / 4, packageWidth + available * .018));
      const width = Math.min(available, desired * facings);
      if (row.length && used + width > available + .001) place(false);
      row.push([item.id, width]);
      used += width;
    }
    place(true);
    return cells;
  }
  const plan = {defaults, groups, allocate};
  root.DollarGeneralPlan = plan;
  if (typeof module !== 'undefined' && module.exports) module.exports = plan;
})(typeof window === 'undefined' ? globalThis : window);

