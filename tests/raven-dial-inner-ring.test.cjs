const test=require('node:test'),assert=require('node:assert/strict');
const {harness}=require('./helpers/dial-harness.cjs');
test('Inner circle spins counter-clockwise on its own and keeps going after a grab', () => {
  const h=harness();h.tick(4000);const a=h.dial.ST.own.inner;
  h.dial.ST.idle=false;h.tick(7000);const b=h.dial.ST.own.inner;
  assert.ok(a<0&&b<a);
});
test('Rings left on "spin with the main ring" keep the original Dart motion', () => {
  const h=harness();for(const k of ['band1','band2','band3','ticks','contours'])assert.equal(h.dial.P[k+'.mode'],'follow');
  h.tick(6000);for(const k of ['band1','band2','band3','ticks','contours'])assert.equal(h.dial.ST.own[k],undefined);
});
test('Each ring can take its own direction, stand still, and still draws with finite geometry', () => {
  const h=harness();Object.assign(h.dial.P,{'band2.mode':'own','band2.dir':-1,'band2.keep':true,'ticks.mode':'still','contours.mode':'own','inner.style':'dashes'});
  h.tick(9000);assert.ok(h.dial.ST.own.band2<0);assert.equal(h.dial.ST.own.ticks,undefined);
  assert.ok(Object.values(h.dial.bounds('ring.inner')).every(Number.isFinite));
});
