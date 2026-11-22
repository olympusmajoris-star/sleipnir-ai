/* Transparent pass from AsgardDeepSpacePainter, using the same Dart PRNG and dimensions. */
(function (root) {
'use strict';
const TAU = 2 * Math.PI;
const clamp = (n, a, b) => Math.max(a, Math.min(b,n));
const rgba = (hex,a) => { const n = parseInt(hex.slice(1),16); return 'rgba('+[n >> 16,(n >> 8) & 255,n & 255,a].join(',')+')'; };
class DartRandom {
  constructor(seed) {
    const M = (1n << 64n) - 1n, s64 = v => BigInt.asIntN(64, v);
    let s = BigInt(seed);
    s = s64((~s) + (s << 21n)); s = s64(s ^ (s >> 24n)); s = s64((s + (s << 3n)) + (s << 8n)); s = s64(s ^ (s >> 14n));
    s = s64((s + (s << 2n)) + (s << 4n)); s = s64(s ^ (s >> 28n)); s = s64(s + (s << 31n)); if (s === 0n) s = 0x5a17n;
    const u = s & M; this.lo = u & 0xFFFFFFFFn; this.hi = (u >> 32n) & 0xFFFFFFFFn;
    for (let i = 0; i < 4; i++) this.next();
  }
  next() { const st = 0xFFFFDA61n * this.lo + this.hi; this.lo = st & 0xFFFFFFFFn; this.hi = (st >> 32n) & 0xFFFFFFFFn; }
  nextInt(max) {
    if ((max & -max) === max) { this.next(); return Number(this.lo & BigInt(max - 1)); }
    let r, res; do { this.next(); r = Number(this.lo); res = r % max; } while (r - res + max > 4294967296); return res;
  }
  nextDouble() { return (this.nextInt(1 << 26) * 134217728 + this.nextInt(1 << 27)) / 9007199254740992; }
}
const cache = new Map();
function field(w,h,k=1,config={}) {
  const small = config['deep.stars'] ?? 4700, brightness = config['deep.starAlpha'] ?? 1, bright = config['deep.bright'] ?? 25;
  const key = [w,h,k,small,brightness,bright].join('|');
  if (cache.has(key)) return cache.get(key);
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.ceil(w*k));canvas.height=Math.max(1,Math.ceil(h*k));
  const x=canvas.getContext('2d');x.scale(k,k);
  paint(x,w,h,small,brightness,bright);
  cache.set(key,canvas);if(cache.size>5) cache.delete(cache.keys().next().value);
  return canvas;
}
function paint(x,w,h,small,brightness,bright) {
  const tones=['#E5F0FF','#D2E3F7','#FFF6DD','#FFDFB2','#E8C6B5'],bandY=xn=>.65-.39*xn;
  const rng = new DartRandom(10801920);
  for (let i = 0; i < 4700; i++) {
    const inBand = i >= 3550, px = rng.nextDouble() * w; let y = rng.nextDouble() * h;
    if (inBand) { const a = rng.nextDouble() + rng.nextDouble() - 1; y = bandY(px / w) * h + a * h * .105; }
    if (y < 0 || y >= h) continue; if (y > .80 * h && rng.nextDouble() < .64) continue;
    const p = rng.nextDouble(), r = p < .86 ? .13 + rng.nextDouble() * .25 : .39 + rng.nextDouble() * .44, strength = (inBand ? .29 : .20) + rng.nextDouble() * .58, dim = y > h * .8 ? .48 : 1;
    const tone = tones[rng.nextInt(100) < 71 ? rng.nextInt(2) : 2 + rng.nextInt(3)];
    if (i >= small) continue; x.fillStyle = rgba(tone, clamp(strength * dim * brightness, 0, 1)); x.beginPath(); x.arc(px, y, r, 0, TAU); x.fill();
  }
  const br = new DartRandom(402026);
  for (let i = 0; i < 25; i++) {
    const px = w * (.035 + br.nextDouble() * .93), y = h * (.035 + br.nextDouble() * .76);
    const color = i < 11 ? tones[br.nextInt(2)] : i < 18 ? tones[2] : i < 23 ? tones[3] : tones[4], r = .62 + br.nextDouble() * .82;
    if (i >= bright) continue;
    const halo = x.createRadialGradient(px, y, 0, px, y, r * 5.6); halo.addColorStop(0, rgba(color, .20)); halo.addColorStop(.28, rgba(color, .052)); halo.addColorStop(1, rgba(color, 0)); x.fillStyle = halo; x.beginPath(); x.arc(px, y, r * 5.6, 0, TAU); x.fill();
    if (i % 7 === 0) { const len = r * 4.5; x.strokeStyle = rgba(color, .17); x.lineWidth = .42; x.lineCap = 'round'; x.beginPath(); x.moveTo(px - len, y); x.lineTo(px + len, y); x.moveTo(px, y - len); x.lineTo(px, y + len); x.stroke(); }
    x.fillStyle = rgba(color, .36); x.beginPath(); x.arc(px, y, r * 1.43, 0, TAU); x.fill(); x.fillStyle = rgba(color, .95); x.beginPath(); x.arc(px, y, r * .70, 0, TAU); x.fill();
  }

}
root.AsgardStarField=Object.freeze({field,paint,DartRandom});
})(window);
