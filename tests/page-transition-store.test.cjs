const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const {runInNewContext} = require('node:vm');
const test = require('node:test');

function client() {
  let result;
  const calls = [];
  const local = new Map();
  const window = {
    localStorage: {
      getItem: key => local.get(key) ?? null,
      setItem: (key, value) => local.set(key, value),
      removeItem: key => local.delete(key)
    },
    StudioJobs: {
      request: async (path, args) => {
        calls.push({path, ...args});
        return structuredClone(result);
      }
    }
  };
  runInNewContext(readFileSync(join(__dirname, '..', 'page-transition-store.js'), 'utf8'), {window});
  const store = window.SleipnirTransitionStore;
  result = {version: 1, default: store.defaults, routes: []};
  return {store, calls, remote: value => { result = value; }};
}

test('resolves in arrival order and preserves an explicit off override', () => {
  const {store} = client();
  const off = store.defaults, global = {...off, effect:'mesh'};
  const arrival = {...off, glass:{...off.glass, source:'camera', material:'clear'}};
  const m = {version:1, default:global, routes:[
    {from:'*', to:'Asgard/dial', settings:arrival},
    {from:'Cart', to:'Asgard/dial', settings:off}
  ]};
  assert.equal(store.resolve(m, 'HomePage', 'Asgard/dial'), arrival);
  assert.equal(store.resolve(m, 'Cart', 'Asgard/dial'), off);
  assert.equal(store.resolve(m, 'Asgard/dial', 'HomePage'), global);
});

test('owner save uses the original baseline even if editor mutated the response', async () => {
  const {store, calls} = client();
  const initial = await store.read();
  initial.default.glass.material = 'clear';
  await store.save({settings:initial.default});
  assert.equal(calls[0].auth, false);
  assert.equal(calls[1].auth, true);
  assert.equal(calls[1].body.p_settings.glass.material, 'clear');
  assert.equal(calls[1].body.p_expected_settings.glass.material, 'none');
});

test('resumed browser draft retains its original baseline after external publication', async () => {
  const {store, calls, remote} = client();
  const settings = {...store.defaults, effect:'draw', variant:'pencil'};
  const where = {from:'*',to:'HomePage'};
  await store.read();
  store.setDraft({...where, settings});
  remote({version:1,default:store.defaults,routes:[{...where,settings:{...store.defaults,effect:'aperture'}}]});
  await store.read();
  const draft = store.getDraft(where);
  assert.equal(draft.effect, 'draw');
  await store.save({...where,settings:draft});
  assert.equal(calls.at(-1).body.p_expected_settings, null);
  store.clearDraft(where);
  assert.equal(store.getDraft(where), null);
  await store.save({...where, settings:null});
  assert.equal(calls.at(-1).body.p_expected_settings.effect, 'aperture');
});

test('validates placement and camera timing before any write; fills legacy defaults', async () => {
  const {store, calls} = client();
  const old = {...store.defaults, glass:{material:'frosted',frost:.55}};
  await store.save({from:'HomePage',to:'Asgard',settings:old});
  assert.equal(calls.at(-1).body.p_settings.glass.show, 'always');
  assert.equal(calls.at(-1).body.p_settings.glass.transmission, .9);
  await assert.rejects(() => store.save({from:'HomePage',to:'Asgard',settings:{
    ...old,glass:{source:'camera',show:'window',visibleMs:15}
  }}), /glass/);
  await assert.rejects(() => store.save({from:'HomePage',to:'Asgard',settings:{...old,glass:{x:.5,width:.7}}}), /glass/);
  await assert.rejects(() => store.save({from:'HomePage',to:'*',settings:old}), /pages/);
  assert.equal(calls.length, 2);
});
