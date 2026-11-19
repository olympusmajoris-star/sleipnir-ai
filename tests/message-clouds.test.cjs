const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../pages.js'), 'utf8');
const slice = (from, to) => source.slice(source.indexOf(from), source.indexOf(to, source.indexOf(from)));
const fxStart = source.indexOf('fx: { mineFilm:');
const fxEnd = source.indexOf('\n      msg: {}, head: {}', fxStart);
const defaults = vm.runInNewContext('(' + source.slice(fxStart + 4, fxEnd).trim().replace(/,$/, '') + ')');
function harness() {
  const context = vm.createContext({ URL, Intl, Math, console, W: 390, HH: 844,
    location: { href: 'https://studio.example/pages.html' }, document: { currentScript: { src: 'https://studio.example/pages.js' } },
    window: {}, runtimeAsset: s => s, clamp: (v,a,b) => Math.max(a,Math.min(b,v)) });
  vm.runInContext(slice('function rvWrap(', '// Cloud art has empty space') + '\n' + slice('const RVC_HOME =', '\nfunction drawConvo(') + '\nRVC.loading=true;RVC.gl=false;globalThis.cloudAPI={rvWrap,rvcMessages,rvcRand,rvcPieces,RVC};', context);
  const ctx = { canvas: { width: 390 }, font: '', letterSpacing: '0px',
    measureText: text => ({ width: Array.from(text).length * 8 }),
    save(){},restore(){},beginPath(){},closePath(){},moveTo(){},lineTo(){},fill(){} };
  return { ...context.cloudAPI, ctx };
}
test('wrapping contains long URLs, unspaced words, Unicode graphemes and explicit lines', () => {
  const { rvWrap, ctx } = harness();
  for (const text of ['https://example.test/'+'long'.repeat(40), 'a'.repeat(500), 'hello\nworld', '☁️'.repeat(30)]) {
    const lines = rvWrap(ctx,text,80);
    assert.ok(lines.length > 0);
    assert.ok(lines.every(line => ctx.measureText(line).width <= 80));
    assert.equal(lines.join('').replace(/\s/g,''), text.replace(/\s/g,''));
  }
});
test('dense cloud core contains every text corner with padding on the initial frame and while growing', () => {
  const { rvcMessages, ctx } = harness();
  const S = {fx:{},cloud_padding:18,cloud_growth_ms:250,cloud_variety:.85,cloud_speed:1,cloud_shadow:0,message_spacing:14};
  for (const [time,text] of [[0,'Hi'], [.016,'This is a considerably longer message that makes its cloud grow'], [.032,'One more word']]) {
    const clouds = rvcMessages(ctx,time,S,{...defaults},[['mine',text]],776);
    assert.equal(clouds.length,1);
    const c = clouds[0], n=c.n;
    const core = Math.pow(Math.pow((c.textW/2+18)/(c.A-c.feather),n)+Math.pow((c.textH/2+18)/(c.B-c.feather),n),1/n);
    assert.ok(core <= 1.000001, 'text plus full padding stays inside the opaque core');
    assert.ok(c.fallback, 'messages remain legible while footage loads');
  }
});
test('independent cloud identifiers have stable, different random sequences', () => {
  const { rvcRand } = harness();
  const sequence = key => { const rnd=rvcRand(key); return Array.from({length:8},()=>rnd()); };
  assert.deepEqual(sequence('mine:1:3'), sequence('mine:1:3'));
  assert.notDeepEqual(sequence('mine:1:3'), sequence('peer:1:3'));
  assert.notDeepEqual(sequence('mine:1:3'), sequence('mine:1:4'));
});
test('break-offs start disabled and disabling them restores the original edge without orphan pieces', () => {
  assert.equal(defaults.piecesOn,false);
  const {rvcPieces,RVC}=harness();
  RVC.pieces.push({state:'free'});RVC.clouds.example={list:[{busy:true,cutW:1,swell:.3,healAt:10}],extra:[{}]};
  rvcPieces(20,.016,{ambient_count:3},{...defaults,piecesOn:false},[]);
  assert.equal(RVC.pieces.length,0);
  assert.equal(RVC.clouds.example.list[0].cutW,0);
  assert.equal(RVC.clouds.example.list[0].busy,false);
  assert.equal(RVC.clouds.example.extra.length,0);
});
