// RGB decoding/WebP encoding is done by Pillow. Reuse the browser's exact matte here.
const {readSync, writeSync} = require('node:fs');
const {preparePackshot} = require('../../dg-product-photo.js');
function read(size) {
  const data = Buffer.allocUnsafe(size);
  let offset = 0;
  while (offset < size) {
    const bytes = readSync(0, data, offset, size - offset);
    if (!bytes && !offset) return null;
    if (!bytes) throw new Error('Incomplete product image');
    offset += bytes;
  }
  return data;
}
function write(buffer) {
  let offset = 0;
  while (offset < buffer.length) offset += writeSync(1, buffer, offset, buffer.length - offset);
}
for (;;) {
  const header = read(8);
  if (!header) break;
  const width = header.readUInt32LE(0), height = header.readUInt32LE(4);
  const rgba = read(width * height * 4);
  const {bounds, cutout} = preparePackshot(rgba, width, height);
  const result = Buffer.alloc(20);
  [...bounds, Number(cutout)].forEach((value, index) => result.writeUInt32LE(value, index * 4));
  write(result);
  write(rgba);
}
