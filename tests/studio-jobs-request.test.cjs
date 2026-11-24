const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const code = fs.readFileSync(path.join(__dirname, '../studio-jobs.js'), 'utf8');

function setup(fetcher) {
  const calls = [];
  const window = {
    location: { origin: 'https://studio.example' },
    StudioTransferConfig: { url: 'https://example.supabase.co', key: 'fixture-public', owner: 'fixture-owner' },
    __asgardStudioOwnerSession: { access_token: 'fixture-access', refresh_token: 'fixture-refresh', expires_at: Date.now() / 1000 + 3600 },
  };
  window.top = window;
  vm.runInNewContext(code, {
    window, location: window.location, Headers, FormData, DOMException,
    document: { createElement() { throw Error('Unexpected sign-in prompt in offline fixture.'); } },
    fetch: async (url, init) => {
      calls.push({ url, init });
      return fetcher ? fetcher(url, init) : new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
    },
  });
  return { window, calls, request: window.StudioJobs.request };
}

test('existing JSON request contract and authenticated headers are preserved', async () => {
  const { request, calls } = setup();
  assert.deepEqual(await request('/rest/v1/fixture', { method: 'POST', body: { value: 4 }, headers: { Prefer: 'return=representation' } }), { ok: true });
  assert.equal(calls[0].init.body, '{"value":4}');
  assert.equal(calls[0].init.headers.get('Authorization'), 'Bearer fixture-access');
  assert.equal(calls[0].init.headers.get('Content-Type'), 'application/json');
  assert.equal(calls[0].init.headers.get('Prefer'), 'return=representation');
});

test('multipart body crosses window boundary intact, omits Content-Type and carries cancellation', async () => {
  const { request, calls } = setup();
  const form = new FormData(); form.append('file', new Blob(['synthetic audio'], { type: 'audio/webm' }), 'recording.webm');
  const controller = new AbortController();
  await request('/functions/v1/raven-language?action=transcribe', { method: 'POST', body: form, signal: controller.signal });
  assert.equal(calls[0].init.body, form);
  assert.equal(calls[0].init.headers.has('Content-Type'), false);
  assert.equal(calls[0].init.headers.get('Authorization'), 'Bearer fixture-access');
  assert.equal(calls[0].init.signal, controller.signal);
});

test('already-cancelled request never opens sign-in or contacts network', async () => {
  const { request, calls, window } = setup();
  window.__asgardStudioOwnerSession = null;
  const controller = new AbortController(); controller.abort();
  await assert.rejects(request('/functions/v1/raven-language', { signal: controller.signal }), { name: 'AbortError' });
  assert.equal(calls.length, 0);
});

test('refresh retains original JSON auth flow and attaches refreshed bearer to multipart', async () => {
  const { request, calls, window } = setup(url => new Response(JSON.stringify(url.includes('/auth/v1/token') ? { access_token: 'fixture-new-access', refresh_token: 'fixture-new-refresh', expires_in: 3600 } : { text: 'fixture words' })));
  window.__asgardStudioOwnerSession.expires_at = 1;
  const form = new FormData(); form.append('file', new Blob(['fixture'], { type: 'audio/webm' }), 'recording.webm');
  await request('/functions/v1/raven-language?action=transcribe', { method: 'POST', body: form });
  assert.equal(calls.length, 2);
  assert.equal(JSON.parse(calls[0].init.body).refresh_token, 'fixture-refresh');
  assert.equal(calls[1].init.headers.get('Authorization'), 'Bearer fixture-new-access');
  assert.equal(calls[1].init.body, form);
  assert.equal(window.__asgardStudioOwnerSession.access_token, 'fixture-new-access');
});

test('public requests and service error messages keep their previous behavior', async () => {
  const anonymous = setup(); anonymous.window.__asgardStudioOwnerSession = null;
  await anonymous.request('/rest/v1/fixture', { auth: false });
  assert.equal(anonymous.calls[0].init.headers.get('Authorization'), 'Bearer fixture-public');
  const failing = setup(() => new Response(JSON.stringify({ message: 'The language service is busy.' }), { status: 503 }));
  await assert.rejects(failing.request('/functions/v1/raven-language'), /language service is busy/);
});
