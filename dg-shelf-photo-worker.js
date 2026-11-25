/* Prepare stock photos on demand without blocking aisle navigation or scrolling. */
importScripts('dg-product-photo.js?v=dg-shelves-20261125-3');
const cacheName = 'sleipnir-dg-packshots-3';
let sincePrune = 0;

async function remember(cache, source, blob, width, height) {
  try {
    const headers = {'Content-Type': blob.type, 'X-Photo-Width': String(width), 'X-Photo-Height': String(height)};
    await cache.put(source, new Response(blob, {headers}));
    if (++sincePrune % 24 === 1) {
      const keys = await cache.keys();
      await Promise.all(keys.slice(0, Math.max(0, keys.length - 240)).map(key => cache.delete(key)));
    }
  } catch { /* Private browsing and quota limits allow rendering without persistence. */ }
}

async function make(source) {
  const cache = await self.caches?.open(cacheName).catch(() => null);
  const existing = cache && await cache.match(source);
  if (existing) {
    return {blob: await existing.blob(), width: Number(existing.headers.get('X-Photo-Width')),
      height: Number(existing.headers.get('X-Photo-Height'))};
  }
  const response = await fetch(source, {credentials:'omit', signal:AbortSignal.timeout(18000)});
  if (!response.ok) throw Error('Source photo unavailable');
  const bitmap = await createImageBitmap(await response.blob());
  const ratio = Math.min(1, 600/Math.max(bitmap.width, bitmap.height));
  const canvas = new OffscreenCanvas(Math.max(1, Math.round(bitmap.width*ratio)), Math.max(1, Math.round(bitmap.height*ratio)));
  const pen = canvas.getContext('2d', {willReadFrequently:true});
  pen.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const rgba=pen.getImageData(0,0,canvas.width,canvas.height);
  const {bounds:[x,y,width,height]}=self.DollarGeneralPhoto.preparePackshot(rgba.data,canvas.width,canvas.height);
  const result=new OffscreenCanvas(width,height);
  result.getContext('2d').putImageData(rgba,-x,-y);
  const blob=await result.convertToBlob({type:'image/webp',quality:.92});
  if (cache) await remember(cache,source,blob,width,height);
  return {blob,width,height};
}

let active=0;
const jobs=[];
function pump() {
  while (active<3 && jobs.length) {
    const {id,source}=jobs.shift();
    active++;
    make(source).then(result=>self.postMessage({id,...result}),()=>self.postMessage({id}))
      .finally(()=>{active--;pump();});
  }
}
self.onmessage=({data})=>{jobs.push(data);pump();};
