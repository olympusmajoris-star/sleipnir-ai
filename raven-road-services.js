/* Uses the existing Studio account connection; never stores credentials in a design. */
(function (G) {
  'use strict';
  const endpoint = '/functions/v1/raven-language';
  const note = () => document.getElementById('rr-service-note');
  async function request(options) {
    const jobs = G.StudioJobs;
    if (!jobs || typeof jobs.request !== 'function') throw Error('Connect your existing Studio account to use translation and recorded dictation.');
    try {
      const result = await jobs.request(endpoint + (options.audio ? '?action=transcribe' : ''), {
        method: 'POST', body: options.body, signal: options.signal,
        authContext: { title: 'Connect Raven', note: 'Use your existing Studio owner account for translation and recorded dictation.' },
      });
      const message = note();
      if (message) { message.hidden = true; message.textContent = ''; }
      return result;
    } catch (error) {
      if (error && error.name === 'AbortError') throw error;
      const message = error && error.message || 'Translation and recorded dictation are unavailable right now. Your original text is kept.';
      const host = note();
      if (host) { host.textContent = message; host.hidden = false; }
      throw Error(message);
    }
  }
  G.RavenWindshieldServices = {
    translate({ text, targetLanguage, sourceLanguage = 'auto', signal }) {
      return request({ body: { text, targetLanguage, sourceLanguage }, signal });
    },
    transcribe(blob, { language, signal } = {}) {
      const type = String(blob.type || '').split(';')[0].toLowerCase();
      const extensions = { 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/flac': 'flac' };
      const form = new FormData();
      form.append('file', blob, 'recording.' + (extensions[type] || 'webm'));
      if (language) form.append('language', language);
      return request({ audio: true, body: form, signal });
    },
  };
})(window);
