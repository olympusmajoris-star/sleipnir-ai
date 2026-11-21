/* =====================================================================
   STUDIO PEOPLE — studio 1121. Add, rename, rebuild, hide and show the
   fake test people yourself, from any studio page (toolbar: "People").
   New people: name + front photo (+ back photo = 360). Your PC's
   HoloWorker builds their 3D figure; they appear here when ready.
   Writes go through the Supabase function "studio-people" and need the
   studio passcode (asked once, remembered on this computer).
   Other screens read the list from StudioKit.people.
   ===================================================================== */
(() => {
'use strict';
const K = window.StudioKit; if (!K) return;
const FN = 'https://afnihsdxtisneuyehatw.supabase.co/functions/v1/studio-people';
const LOCAL_FIG = { 'Test Woman': 'testwoman', Freya: 'freya', Loki: 'loki', Sif: 'sif', Tyr: 'tyr', Baldr: 'baldr', Hel: 'hel' };
const LOCAL_SPIN = new Set(['testwoman', 'freya', 'tyr', 'baldr']);
const LOCAL_BUSTS = new Set(['Baldr', 'Bragi', 'Eir', 'Forseti', 'Freya', 'Gerd', 'Hel', 'Loki', 'Njord', 'Saga', 'Sif', 'Skadi', 'TestWoman', 'Tyr', 'Ullr', 'Vidar']);
const R = { people: [], loaded: false, subs: [], busy: false, timer: 0 };
const passKey = 'studioPeoplePass1121';

function mapRow(r) {
  const key = LOCAL_FIG[r.name] || r.id, local = !!LOCAL_FIG[r.name], bustName = String(r.name || '').replace(/ /g, '');
  return {
    uid: r.id, key, name: r.name || 'Test person', hidden: !!r.hidden, status: r.status || 'none', error: r.error || '', is360: !!r.is_360, inStudio: !!r.added_in_studio,
    profile: local ? `asgard/figs/${key}_profile.webp?v=1121u` : r.urls.profile, profileFrames: r.profile_frames || 25,
    spin: local && LOCAL_SPIN.has(key) ? `asgard/figs/${key}_spin.webp?v=1121u` : r.urls.spin, spinFrames: r.spin_frames || 48,
    bust: LOCAL_BUSTS.has(bustName) && r.updated_at && !r.added_in_studio ? `busts/${bustName}.webp?v=1121u` : r.urls.bust, bustFrames: r.bust_frames || 11,
    front: r.urls.front, remote: !local, updated: r.updated_at,
  };
}
R.all = () => R.people;
R.list = () => R.people.filter(p => !p.hidden && p.status === 'ready' && p.profile);
R.byKey = k => R.people.find(p => p.key === k || p.uid === k) || null;
R.on = fn => { R.subs.push(fn); if (R.loaded) try { fn(); } catch (e) {} };
R.refresh = async () => {
  try {
    const r = await fetch(FN, { cache: 'no-store' }); const j = await r.json(); if (!j.people) throw Error(j.error || 'no list');
    R.people = j.people.map(mapRow); R.loaded = true; R.subs.forEach(f => { try { f(); } catch (e) { console.error(e); } }); render();
    clearTimeout(R.timer); if (R.people.some(p => /queued|building|waiting/.test(p.status) && !p.hidden)) R.timer = setTimeout(R.refresh, 10000);
  } catch (e) { console.warn('studio people:', e); clearTimeout(R.timer); R.timer = setTimeout(R.refresh, 30000); }
};
function getPass(again) {
  let p = ''; try { p = localStorage.getItem(passKey) || ''; } catch (e) {}
  if (!p || again) { p = (window.prompt('Studio passcode (asked once on this computer):') || '').trim(); try { if (p) localStorage.setItem(passKey, p); } catch (e) {} }
  return p;
}
R.write = async (fields, files) => {
  for (let tries = 0; tries < 2; tries++) {
    const pass = getPass(tries > 0); if (!pass) return { error: 'No passcode.' };
    const fd = new FormData(); fd.append('pass', pass); for (const k in fields) fd.append(k, fields[k]); for (const k in (files || {})) if (files[k]) fd.append(k, files[k]);
    const r = await fetch(FN, { method: 'POST', body: fd }); const j = await r.json().catch(() => ({ error: 'HTTP ' + r.status }));
    if (r.status === 401) { try { localStorage.removeItem(passKey); } catch (e) {} continue; }
    return j;
  }
  return { error: 'Wrong studio passcode.' };
};

/* ---------- the panel ---------- */
let panel = null;
const css = `#spPanel{position:fixed;top:64px;right:14px;width:420px;max-height:calc(100vh - 80px);overflow:auto;z-index:60;background:#0f161f;border:1px solid #2a3a4d;border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,.6);color:#dfe9f3;font:13px Roboto,system-ui,sans-serif;padding:12px 14px;display:none}
#spPanel h3{margin:0 0 8px;font-size:15px;font-weight:600;display:flex;justify-content:space-between;align-items:center}
#spPanel .add{background:#132030;border:1px solid #24364b;border-radius:10px;padding:10px;margin-bottom:10px;display:grid;gap:6px}
#spPanel input[type=text]{background:#0b1118;border:1px solid #2a3a4d;color:#fff;border-radius:7px;padding:6px 8px}
#spPanel button{background:#1d2c3d;border:1px solid #2f4560;color:#dfe9f3;border-radius:8px;padding:5px 9px;cursor:pointer}
#spPanel button.go{background:#1E88E5;border-color:#1E88E5;color:#fff;font-weight:600}
#spPanel .row{display:grid;grid-template-columns:52px 1fr auto;gap:8px;align-items:center;padding:6px 0;border-top:1px solid #1d2a38}
#spPanel .row.off{opacity:.45}
#spPanel canvas,#spPanel img.th{width:48px;height:76px;object-fit:contain;background:#0b1118;border-radius:7px;border:1px solid #24364b}
#spPanel .st{font-size:11px;border-radius:6px;padding:1px 6px;margin-left:4px}
#spPanel .ready{background:#163d24;color:#8ff0a8}#spPanel .busy{background:#3d3416;color:#ffd77a}#spPanel .bad{background:#3d1616;color:#ff9a9a}
#spPanel .btns{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end;max-width:150px}
#spPanel .note{color:#8ea3b8;font-size:12px}`;
function el(tag, attrs, ...kids) { const e = document.createElement(tag); Object.assign(e, attrs || {}); kids.forEach(k => e.append(k)); return e; }
function fileInput(label) { const i = el('input', { type: 'file', accept: 'image/*' }); const w = el('label', { className: 'note' }, label + ' ', i); w.input = i; return w; }
function statusChip(p) {
  if (p.status === 'ready') return el('span', { className: 'st ready', textContent: 'Ready' });
  if (/failed/.test(p.status)) return el('span', { className: 'st bad', textContent: 'Failed', title: p.error });
  if (/queued|waiting/.test(p.status)) return el('span', { className: 'st busy', textContent: 'Waiting for HoloWorker' });
  if (/building/.test(p.status)) return el('span', { className: 'st busy', textContent: 'Building 3D…' });
  return el('span', { className: 'st bad', textContent: 'No 3D yet' });
}
function thumb(p) {
  const c = el('canvas', { width: 64, height: 102 });
  if (p.profile) { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => { const fw = im.naturalWidth / p.profileFrames, x = c.getContext('2d'), k = Math.min(64 / fw, 102 / im.naturalHeight); x.drawImage(im, Math.floor(p.profileFrames / 2) * fw, 0, fw, im.naturalHeight, 32 - fw * k / 2, 102 - im.naturalHeight * k, fw * k, im.naturalHeight * k); }; im.src = p.profile; }
  else if (p.front) return el('img', { className: 'th', src: p.front });
  return c;
}
function render() {
  if (!panel || panel.style.display === 'none') return;
  const body = panel.querySelector('.list'); body.innerHTML = '';
  const ppl = R.all().slice().sort((a, b) => (a.hidden - b.hidden) || a.name.localeCompare(b.name));
  for (const p of ppl) {
    const nm = el('div', {}, el('b', { textContent: p.name }), p.is360 ? el('span', { className: 'st ready', textContent: '360' }) : '', statusChip(p));
    if (/failed/.test(p.status) && p.error) nm.append(el('div', { className: 'note', textContent: p.error.slice(0, 140) }));
    const btns = el('div', { className: 'btns' });
    const act = async (fields, files, msg) => { K.status(msg); const j = await R.write(Object.assign({ id: p.uid }, fields), files); if (j.error) K.status('People: ' + j.error); else K.status('Done.'); R.refresh(); };
    btns.append(el('button', { textContent: p.hidden ? 'Show' : 'Remove', title: p.hidden ? 'Put them back in the studio' : 'Take them out of the studio (their 3D model is kept)', onclick: () => act({ action: p.hidden ? 'show' : 'hide' }, null, p.hidden ? 'Putting ' + p.name + ' back…' : 'Removing ' + p.name + ' from the studio…') }));
    btns.append(el('button', { textContent: 'Rename', onclick: () => { const n = (prompt('New name for ' + p.name + ':', p.name) || '').trim(); if (n && n !== p.name) act({ action: 'rename', name: n }, null, 'Renaming…'); } }));
    const fr = fileInput('Front'), bk = fileInput('Back (360)'), box = el('div', { style: 'display:none;grid-column:1/-1;gap:4px' }, fr, bk, el('button', { className: 'go', textContent: 'Rebuild with these photos', onclick: () => act({ action: 'rebuild' }, { front: fr.input.files[0], back: bk.input.files[0] }, 'Sending new photos for ' + p.name + '…') }));
    btns.append(el('button', { textContent: 'New photos', onclick: () => { box.style.display = box.style.display === 'none' ? 'grid' : 'none'; } }));
    if (p.status !== 'ready') btns.append(el('button', { textContent: 'Build again', onclick: () => act({ action: 'rebuild' }, null, 'Queued ' + p.name + ' for HoloWorker…') }));
    const row = el('div', { className: 'row' + (p.hidden ? ' off' : '') }, thumb(p), nm, btns); row.append(box); body.append(row);
  }
}
function build() {
  if (panel) return;
  document.head.append(el('style', { textContent: css }));
  const name = el('input', { type: 'text', placeholder: 'Name (e.g. Astrid)' }), fr = fileInput('Front photo (required)'), bk = fileInput('Back photo (optional, makes them 360)');
  const add = el('button', { className: 'go', textContent: 'Add person', onclick: async () => {
    if (!fr.input.files[0]) { K.status('Pick a front photo first.'); return; }
    add.disabled = true; K.status('Uploading ' + (name.value || 'new person') + '…');
    const j = await R.write({ action: 'add', name: name.value }, { front: fr.input.files[0], back: bk.input.files[0] });
    add.disabled = false; if (j.error) { K.status('People: ' + j.error); return; }
    K.status('Added. HoloWorker on your PC builds their 3D (about 6-10 min); they show up here when ready.'); name.value = ''; fr.input.value = ''; bk.input.value = ''; R.refresh();
  } });
  panel = el('div', { id: 'spPanel' },
    el('h3', {}, 'Test people', el('button', { textContent: '✕', onclick: () => { panel.style.display = 'none'; } })),
    el('div', { className: 'add' }, el('b', { textContent: 'Add a person' }), name, fr, bk, add,
      el('div', { className: 'note', textContent: 'Best photos: original from the camera roll (not a screenshot), head to feet, standing straight, arms a little away from the body, plain daylight. HoloWorker must be running on your PC.' })),
    el('div', { className: 'note', textContent: 'Remove takes someone out of the studio but keeps their 3D model. New people stay studio-only until Claude makes them live in the app.' }),
    el('div', { className: 'list' }));
  document.body.append(panel);
}
R.open = () => { build(); panel.style.display = panel.style.display === 'block' ? 'none' : 'block'; render(); if (panel.style.display === 'block') R.refresh(); };

// a "People" button on every studio page
const add = sc => { if (!sc || sc._spBtn) return; sc._spBtn = true; sc.toolbar = (sc.toolbar || []).concat([{ label: 'People', title: 'Add, rebuild, remove the test people', onclick: () => R.open() }]); };
for (const id of K.order) add(K.screens[id]);
const scr0 = K.screen; K.screen = function (d) { const sc = scr0.call(this, d); add(sc); return sc; };
K.people = R;
R.refresh();
})();
