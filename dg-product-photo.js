/* Convert the retailer's studio photograph into a transparent, tight packshot.
   The same pixel operation is used for published images and new catalog stock. */
(function (root) {
  'use strict';

  function occupiedBounds(pixels, width, height) {
    let left = width, top = height, right = -1, bottom = -1;
    for (let y = 0, i = 3; y < height; y++) {
      for (let x = 0; x < width; x++, i += 4) {
        if (pixels[i] < 16) continue;
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
    if (right < left) return [0, 0, width, height];
    left = Math.max(0, left - 1);
    top = Math.max(0, top - 1);
    right = Math.min(width - 1, right + 1);
    bottom = Math.min(height - 1, bottom + 1);
    return [left, top, right - left + 1, bottom - top + 1];
  }

  // Bounded distance in pixels to the nearest zero. The two raster passes
  // close small gaps in a white bottle's edge without filling its shoulders.
  function distanceToZero(field, width, height) {
    for (let y = 0; y < height; y++) {
      for (let x = 0, i = y * width; x < width; x++, i++) {
        if (!field[i]) continue;
        let nearest = field[i];
        if (x) nearest = Math.min(nearest, field[i - 1] + 1);
        if (y) {
          nearest = Math.min(nearest, field[i - width] + 1);
          if (x) nearest = Math.min(nearest, field[i - width - 1] + 1);
          if (x + 1 < width) nearest = Math.min(nearest, field[i - width + 1] + 1);
        }
        field[i] = nearest;
      }
    }
    for (let y = height - 1; y >= 0; y--) {
      for (let x = width - 1, i = (y + 1) * width - 1; x >= 0; x--, i--) {
        if (!field[i]) continue;
        let nearest = field[i];
        if (x + 1 < width) nearest = Math.min(nearest, field[i + 1] + 1);
        if (y + 1 < height) {
          nearest = Math.min(nearest, field[i + width] + 1);
          if (x) nearest = Math.min(nearest, field[i + width - 1] + 1);
          if (x + 1 < width) nearest = Math.min(nearest, field[i + width + 1] + 1);
        }
        field[i] = nearest;
      }
    }
    return field;
  }

  function preparePackshot(pixels, width, height) {
    const count = width * height;
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || pixels.length !== count * 4)
      throw new RangeError('Expected RGBA pixels with matching image dimensions.');

    let white = 0, clear = 0, border = 0;
    const borderLuma = [];
    const inspect = i => {
      border++;
      const p = i * 4;
      if (pixels[p + 3] < 16) { clear++; return; }
      const low = Math.min(pixels[p], pixels[p + 1], pixels[p + 2]);
      const high = Math.max(pixels[p], pixels[p + 1], pixels[p + 2]);
      if (low >= 239 && high - low <= 12) { white++; borderLuma.push(Math.round((low + high) / 2)); }
    };
    for (let x = 0; x < width; x++) { inspect(x); if (height > 1) inspect(count - width + x); }
    for (let y = 1; y < height - 1; y++) { inspect(y * width); if (width > 1) inspect((y + 1) * width - 1); }

    const receipt = cutout => ({pixels, bounds: occupiedBounds(pixels, width, height), cutout});
    if (clear > border * .2 || white < border * .64 || !white) return receipt(clear > border * .2);
    const paper = borderLuma.sort((a, b) => a - b)[Math.floor(white / 2)];
    const radius = Math.max(1, Math.min(3, Math.round(Math.min(width, height) / 270)));
    const inkDistance = new Uint8Array(count);
    const contrast = new Uint8Array(count);
    for (let i = 0, p = 0; i < count; i++, p += 4) {
      const low = Math.min(pixels[p], pixels[p + 1], pixels[p + 2]);
      contrast[i] = pixels[p + 3] > 15 ? Math.max(0, paper - low) : 0;
      inkDistance[i] = contrast[i] >= 9 ? 0 : 12;
    }
    distanceToZero(inkDistance, width, height);

    const outsideDistance = new Uint8Array(count).fill(12);
    const queue = new Int32Array(count);
    let head = 0, tail = 0;
    const flood = i => {
      if (outsideDistance[i] && inkDistance[i] > radius) {
        outsideDistance[i] = 0;
        queue[tail++] = i;
      }
    };
    for (let x = 0; x < width; x++) { flood(x); flood(count - width + x); }
    for (let y = 1; y < height - 1; y++) { flood(y * width); flood((y + 1) * width - 1); }
    while (head < tail) {
      const i = queue[head++], x = i % width;
      if (x) flood(i - 1);
      if (x + 1 < width) flood(i + 1);
      if (i >= width) flood(i - width);
      if (i + width < count) flood(i + width);
    }
    if (!tail) return receipt(false);
    distanceToZero(outsideDistance, width, height);

    // Undo the temporary closing only along the exterior. White lettering and
    // white packaging bounded by a printed or shaded outline stay opaque.
    const edgeDistance = inkDistance;
    for (let i = 0; i < count; i++)
      edgeDistance[i] = outsideDistance[i] <= radius + 1 && contrast[i] < 9 ? 0 : 8;
    distanceToZero(edgeDistance, width, height);

    for (let i = 0, p = 0; i < count; i++, p += 4) {
      const depth = edgeDistance[i];
      if (!depth) { pixels[p + 3] = 0; continue; }
      if (depth > 2 || contrast[i] > 225) continue;
      // At the contour, partially covered JPEG pixels mix the subject with
      // white. Estimate their coverage using nearby *interior* color, then
      // unmix that white before compositing against the dark physical shelf.
      const x = i % width, y = Math.floor(i / width);
      let reference = contrast[i];
      const reach = 3;
      for (let yy = Math.max(y - reach, 0); yy <= Math.min(y + reach, height - 1); yy++) {
        for (let xx = Math.max(x - reach, 0); xx <= Math.min(x + reach, width - 1); xx++) {
          const sample = yy * width + xx;
          if (edgeDistance[sample] > depth) reference = Math.max(reference, contrast[sample]);
        }
      }
      if (reference < 12) continue;
      const alpha = Math.max(depth === 1 ? .035 : .42, Math.min(1, contrast[i] / reference));
      if (alpha >= .985) continue;
      for (let c = 0; c < 3; c++) pixels[p + c] = Math.max(0, Math.min(255, Math.round(paper + (pixels[p + c] - paper) / alpha)));
      pixels[p + 3] = Math.round(pixels[p + 3] * alpha);
    }
    return receipt(true);
  }

  const api = {preparePackshot};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.DollarGeneralPhoto = api;
})(typeof window === 'undefined' ? globalThis : window);
