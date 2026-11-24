/* Native browser voice controls for Raven. No application network requests.
 * Browser speech services may process audio/text remotely; offline use is not promised.
 * Optional transcribe(blob,{language,signal}) adapter enables a bounded recorder
 * fallback when native recognition is absent. The adapter owns service/auth/network.
 * Call startListening() directly from a user gesture. Transcripts never send messages.
 * onTranscript(text, {isFinal,cumulative,language,sessionId}): append FINAL deltas only;
 * show interim text separately. onStatus({code,message,tone}); onState(snapshot).
 */
(function (root) {
  'use strict';

  function create(options) {
    options = options || {};
    var Recognition = root.SpeechRecognition || root.webkitSpeechRecognition;
    var synth = root.speechSynthesis;
    var nativeRecognition = typeof Recognition === 'function';
    var recorderAvailable = !!(typeof options.transcribe === 'function' && typeof root.MediaRecorder === 'function' &&
      root.navigator && root.navigator.mediaDevices && typeof root.navigator.mediaDevices.getUserMedia === 'function');
    var canListen = nativeRecognition || recorderAvailable;
    var canSpeak = !!(synth && typeof root.SpeechSynthesisUtterance === 'function');
    var disposed = false, mic = null, sessionId = 0, micTimer = null;
    var pendingRead = null, read = null, utterance = null, speechId = 0;
    var micPhase = 'idle', speechPhase = 'idle', nativeVoices = [];
    var language = validLanguage(options.lang) || validLanguage(root.navigator && root.navigator.language) || 'en-US';
    var voiceURI = typeof options.voiceURI === 'string' ? options.voiceURI : '';
    var rate = bounded(options.rate, 0.1, 10, 1);
    var lastStatus = { code: 'ready', message: 'Voice controls ready.', tone: 'info' };
    var previousVoicesHandler, voicesHandler;

    function bounded(value, min, max, fallback) {
      var number = Number(value);
      return value != null && Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
    }
    function validLanguage(value) {
      if (typeof value !== 'string' || !value.trim()) return '';
      try { return Intl.getCanonicalLocales(value.trim())[0] || ''; } catch (_) { return ''; }
    }
    function emit(name) {
      if (disposed || typeof options[name] !== 'function') return;
      try { options[name].apply(null, Array.prototype.slice.call(arguments, 1)); } catch (_) {}
    }
    function voiceList() {
      return nativeVoices.map(function (voice) {
        return { voiceURI: voice.voiceURI, name: voice.name, lang: voice.lang,
          default: !!voice.default, localService: !!voice.localService };
      });
    }
    function snapshot() {
      return { canListen: canListen, canSpeak: canSpeak, dictationMode: nativeRecognition ? 'native' : recorderAvailable ? 'recorder' : 'unavailable', mic: micPhase, speech: speechPhase,
        language: language, voiceURI: voiceURI, rate: rate, voices: voiceList(),
        disposed: disposed, status: Object.assign({}, lastStatus) };
    }
    function publish() { emit('onState', snapshot()); }
    function status(code, message, tone) {
      lastStatus = { code: code, message: message, tone: tone || 'info' };
      emit('onStatus', Object.assign({}, lastStatus));
      publish();
    }
    function refreshVoices(quiet) {
      if (disposed || !canSpeak) return;
      try { nativeVoices = Array.from(synth.getVoices() || []); } catch (_) { nativeVoices = []; }
      if (!quiet) publish();
    }
    function clearMicTimer() { if (micTimer != null) root.clearTimeout(micTimer); micTimer = null; }
    function detachMic(capture) {
      if (capture.kind === 'recorder') {
        root.clearTimeout(capture.limitTimer); root.clearTimeout(capture.transcribeTimer);
        stopTracks(capture);
        if (capture.engine) capture.engine.onstart = capture.engine.ondataavailable = capture.engine.onerror = capture.engine.onstop = null;
        capture.chunks = [];
        return;
      }
      capture.engine.onstart = capture.engine.onaudiostart = capture.engine.onresult = null;
      capture.engine.onerror = capture.engine.onend = null;
    }
    function interim(capture, text) {
      emit('onTranscript', text, { isFinal: false, cumulative: capture.final.join(' '),
        language: capture.language, sessionId: capture.id });
    }
    function finishMic(capture) {
      if (disposed || mic !== capture) return;
      clearMicTimer();
      detachMic(capture);
      mic = null; micPhase = 'idle';
      var next = pendingRead, previousSpeechId = speechId;
      pendingRead = null;
      interim(capture, '');
      if (disposed) return;
      if (next) beginRead(next);
      else if (!capture.error && !mic && speechId === previousSpeechId && !read) status('dictation-ended', capture.final.length ? 'Dictation added to your draft.' : 'Dictation stopped.');
      else publish();
    }
    function endMic(discard) {
      if (!mic) return false;
      var capture = mic;
      if (capture.kind === 'recorder' && micPhase === 'transcribing') discard = true;
      capture.discard = capture.discard || discard;
      if (discard) interim(capture, '');
      if (mic !== capture || disposed) return false;
      capture.stopping = true; micPhase = 'stopping';
      if (capture.kind === 'recorder') return endRecorder(capture);
      try {
        if (discard) capture.engine.abort(); else capture.engine.stop();
      } catch (_) {
        try { capture.engine.abort(); } catch (_) {}
        pendingRead = null;
        capture.error = true;
        status('microphone-stop-failed', 'The microphone could not finish. Try the control again.', 'error');
        finishMic(capture);
        return false;
      }
      // Some engines omit end after abort. Never leave a read waiting indefinitely.
      if (mic === capture) {
        clearMicTimer();
        micTimer = root.setTimeout(function () {
          if (disposed || mic !== capture) return;
          pendingRead = null; speechPhase = 'idle'; capture.error = true;
          try { capture.engine.abort(); } catch (_) {}
          status('microphone-timeout', 'The microphone did not finish. Tap the control to try again.', 'error');
          finishMic(capture);
        }, 3500);
        publish();
      }
      return true;
    }
    function haltSpeech(announce) {
      pendingRead = null; speechId += 1; read = null;
      if (utterance) {
        utterance.onstart = utterance.onend = utterance.onerror = utterance.onpause = utterance.onresume = null;
        utterance = null;
      }
      try { if (canSpeak) { synth.cancel(); if (synth.paused) synth.resume(); } }
      catch (_) {
        status('speech-stop-failed', 'Reading could not be stopped. Try Stop again.', 'error');
        return false;
      }
      speechPhase = 'idle';
      if (announce) status('speech-stopped', 'Reading stopped.');
      return true;
    }
    function stopTracks(capture) {
      if (!capture.stream) return;
      capture.stream.getTracks().forEach(function (track) { try { track.stop(); } catch (_) {} });
      capture.stream = null;
    }
    function recorderFailure(capture, code, message) {
      if (disposed || mic !== capture) return;
      capture.error = true; capture.discard = true;
      if (capture.abort) capture.abort.abort();
      if (capture.engine && capture.engine.state !== 'inactive') { try { capture.engine.stop(); } catch (_) {} }
      stopTracks(capture);
      status(code, message, 'error'); finishMic(capture);
    }
    function transcribeRecording(capture) {
      if (disposed || mic !== capture) return;
      clearMicTimer(); root.clearTimeout(capture.limitTimer); stopTracks(capture);
      if (capture.discard || !capture.bytes) { finishMic(capture); return; }
      var blob = new root.Blob(capture.chunks, { type: capture.engine.mimeType || capture.chunks[0].type || 'audio/webm' });
      capture.chunks = []; micPhase = 'transcribing';
      status('transcribing', 'Transcribing your recording. You can cancel while it finishes.');
      if (disposed || mic !== capture || capture.discard) return;
      capture.transcribeTimer = root.setTimeout(function () {
        recorderFailure(capture, 'transcription-timeout', 'Transcription took too long. Your existing draft is safe.');
      }, 60000);
      Promise.resolve().then(function () {
        if (disposed || mic !== capture || capture.discard) return null;
        var baseLanguage = capture.language.split('-')[0].toLowerCase();
        return options.transcribe(blob, { language: /^[a-z]{2}$/.test(baseLanguage) ? baseLanguage : undefined,
          signal: capture.abort && capture.abort.signal });
      }).then(function (result) {
        if (disposed || mic !== capture || capture.discard) return;
        var text = typeof result === 'string' ? result : result && result.text;
        if (typeof text !== 'string' || !text.trim()) {
          recorderFailure(capture, 'transcription-empty', 'No speech was transcribed. Your existing draft is safe.'); return;
        }
        text = text.trim(); capture.final.push(text);
        emit('onTranscript', text, { isFinal: true, cumulative: text, language: capture.language, sessionId: capture.id });
        finishMic(capture);
      }).catch(function (error) {
        if (disposed || mic !== capture || capture.discard) return;
        recorderFailure(capture, 'transcription-failed', error && (error.status === 401 || error.status === 403)
          ? 'Sign in to use the configured transcription service. Your draft is safe.'
          : 'The transcription service could not finish. Your existing draft is safe.');
      });
    }
    function endRecorder(capture) {
      root.clearTimeout(capture.limitTimer);
      if (capture.discard && capture.abort) capture.abort.abort();
      if (!capture.engine || capture.engine.state === 'inactive') {
        stopTracks(capture); finishMic(capture); return true;
      }
      try { capture.engine.stop(); } catch (_) {
        recorderFailure(capture, 'recording-stop-failed', 'The recording could not finish. Your draft is safe.'); return false;
      }
      stopTracks(capture);
      if (capture.discard) { finishMic(capture); return true; }
      if (mic === capture && micPhase !== 'transcribing') {
        clearMicTimer();
        micTimer = root.setTimeout(function () {
          recorderFailure(capture, 'recording-timeout', 'The recording did not finish. Your draft is safe.');
        }, 3500);
        publish();
      }
      return true;
    }
    function startRecorder(config) {
      var capture = { kind: 'recorder', engine: null, stream: null, chunks: [], bytes: 0,
        id: ++sessionId, language: validLanguage(config.lang) || language, final: [],
        discard: false, stopping: false, error: false,
        abort: typeof root.AbortController === 'function' ? new root.AbortController() : null };
      mic = capture; micPhase = 'starting';
      var request;
      try { request = root.navigator.mediaDevices.getUserMedia({ audio: true }); }
      catch (_) { recorderFailure(capture, 'microphone-not-allowed', recognitionError('not-allowed')); return false; }
      status('microphone-starting', 'Starting a recording for the configured transcription service. Your browser may ask for microphone permission.');
      Promise.resolve(request).then(function (stream) {
        capture.stream = stream;
        if (disposed || mic !== capture || capture.discard || capture.stopping) { stopTracks(capture); return; }
        var types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
        var mime = typeof root.MediaRecorder.isTypeSupported === 'function' && types.find(function (type) { return root.MediaRecorder.isTypeSupported(type); });
        var recorder = new root.MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
        capture.engine = recorder;
        recorder.onstart = function () {
          if (disposed || mic !== capture || capture.stopping) return;
          micPhase = 'listening'; status('recording', 'Recording. Tap Stop to transcribe; recordings stop after 60 seconds.');
        };
        recorder.ondataavailable = function (event) {
          if (disposed || mic !== capture || capture.discard || !event.data || !event.data.size) return;
          if (capture.bytes + event.data.size > 10000000) {
            recorderFailure(capture, 'recording-too-large', 'The recording reached the 10 MB limit. Try a shorter message.'); return;
          }
          capture.bytes += event.data.size; capture.chunks.push(event.data);
        };
        recorder.onstop = function () { transcribeRecording(capture); };
        recorder.onerror = function () { recorderFailure(capture, 'recording-failed', 'The microphone recording failed. Your draft is safe.'); };
        recorder.start(1000);
        if (mic === capture && !capture.stopping) capture.limitTimer = root.setTimeout(function () {
          if (!disposed && mic === capture) endMic(false);
        }, 60000);
      }).catch(function (error) {
        if (disposed || mic !== capture) { stopTracks(capture); return; }
        recorderFailure(capture, 'microphone-failed', error && error.name === 'NotAllowedError'
          ? recognitionError('not-allowed') : 'The microphone could not start recording. Check permissions and try again.');
      });
      return true;
    }
    function recognitionError(code) {
      return {
        'not-allowed': 'Microphone access was not allowed. Check browser permissions or open Raven directly.',
        'service-not-allowed': 'Your browser has not allowed its speech recognition service.',
        'audio-capture': 'No microphone is available. Check the microphone and its permissions.',
        'network': 'The browser speech service could not connect. Your existing draft is safe.',
        'no-speech': 'No speech was detected. Tap the microphone to try again.',
        'language-not-supported': 'The browser speech service does not support this dictation language.'
      }[code] || 'Dictation could not continue. Your existing draft is safe.';
    }
    function startListening(config) {
      if (disposed) return false;
      config = config || {};
      if (!canListen) {
        status('dictation-unsupported', 'Browser dictation is unavailable here. Type, or use your device keyboard’s microphone if available.', 'warning');
        return false;
      }
      if (root.navigator && root.navigator.userActivation && !root.navigator.userActivation.isActive) {
        status('gesture-required', 'Tap the microphone to start dictation.', 'warning'); return false;
      }
      if (root.document && root.document.hidden) {
        status('page-hidden', 'Open Raven before starting dictation.', 'warning'); return false;
      }
      if (mic) {
        status('microphone-busy', micPhase === 'transcribing' ? 'Transcription is finishing. Cancel it before starting again.' : mic.stopping ? 'The microphone is stopping. Try again in a moment.' : 'Dictation is already listening.', 'info');
        return false;
      }
      if (!haltSpeech(false) || disposed) return false;
      if (!nativeRecognition) return startRecorder(config);
      var engine, capture;
      try {
        engine = new Recognition();
        capture = { engine: engine, id: ++sessionId, language: validLanguage(config.lang) || language,
          final: [], seen: new Set(), discard: false, stopping: false, error: false };
        engine.lang = capture.language;
        engine.continuous = config.continuous === true;
        engine.interimResults = config.interimResults !== false;
        engine.maxAlternatives = 1;
        mic = capture; micPhase = 'starting';
        engine.onstart = engine.onaudiostart = function () {
          if (disposed || mic !== capture || capture.stopping) return;
          micPhase = 'listening'; status('listening', 'Listening. Tap Stop when you are finished.');
        };
        engine.onresult = function (event) {
          if (disposed || mic !== capture || capture.discard) return;
          var additions = [], pending = [];
          for (var i = 0; i < event.results.length; i += 1) {
            var result = event.results[i];
            var text = result[0] && String(result[0].transcript || '').trim();
            if (!text) continue;
            if (result.isFinal) {
              if (!capture.seen.has(i)) { capture.seen.add(i); capture.final.push(text); additions.push(text); }
            } else pending.push(text);
          }
          if (additions.length) emit('onTranscript', additions.join(' '), { isFinal: true,
            cumulative: capture.final.join(' '), language: capture.language, sessionId: capture.id });
          if (!disposed && mic === capture && !capture.discard) interim(capture, pending.join(' '));
        };
        engine.onerror = function (event) {
          if (disposed || mic !== capture) return;
          if (event.error === 'aborted' && capture.stopping) { finishMic(capture); return; }
          capture.error = true; capture.discard = true;
          status('dictation-' + (event.error || 'error'), recognitionError(event.error), 'error');
          try { engine.abort(); } catch (_) {}
          finishMic(capture);
        };
        engine.onend = function () { finishMic(capture); };
        engine.start();
        if (mic === capture && micPhase === 'starting') status('microphone-starting', 'Starting dictation. Your browser may ask for microphone permission.');
        return true;
      } catch (error) {
        if (capture && mic === capture) {
          capture.error = true; capture.discard = true; capture.stopping = true;
          try { capture.engine.abort(); } catch (_) {}
          finishMic(capture);
        }
        var denied = error && (error.name === 'NotAllowedError' || error.name === 'SecurityError');
        status(denied ? 'dictation-not-allowed' : 'dictation-start-failed', denied ? recognitionError('not-allowed') : 'Dictation could not start in this browser. Your existing draft is safe.', 'error');
        return false;
      }
    }
    function chunksOf(text) {
      var chunks = [];
      while (text.length > 240) {
        var boundary = text.lastIndexOf(' ', 240);
        if (boundary < 80) boundary = 240;
        chunks.push(text.slice(0, boundary).trim()); text = text.slice(boundary).trim();
      }
      if (text) chunks.push(text);
      return chunks;
    }
    function sayChunk(job) {
      if (disposed || read !== job || speechId !== job.id) return;
      var item;
      try { item = new root.SpeechSynthesisUtterance(job.chunks[job.index]); }
      catch (_) { read = null; speechPhase = 'idle'; status('speech-start-failed', 'Reading aloud could not start in this browser.', 'error'); return; }
      utterance = item; // Retain while the browser speaks.
      item.lang = job.language; item.rate = job.rate; item.pitch = job.pitch; item.volume = job.volume;
      var chosen = nativeVoices.find(function (voice) { return job.voiceURI && voice.voiceURI === job.voiceURI; }) ||
        nativeVoices.find(function (voice) { return voice.lang.toLowerCase() === job.language.toLowerCase(); }) ||
        nativeVoices.find(function (voice) { return voice.lang.split('-')[0].toLowerCase() === job.language.split('-')[0].toLowerCase(); });
      if (chosen) item.voice = chosen;
      function current() { return !disposed && read === job && speechId === job.id && utterance === item; }
      item.onstart = function () { if (current()) { speechPhase = 'speaking'; status('reading', 'Reading the message aloud.'); } };
      item.onpause = function () { if (current()) { speechPhase = 'paused'; publish(); } };
      item.onresume = function () { if (current()) { speechPhase = 'speaking'; publish(); } };
      item.onend = function () {
        if (!current()) return;
        utterance = null; job.index += 1;
        if (job.index < job.chunks.length) {
          if (speechPhase !== 'paused') sayChunk(job);
        } else { read = null; speechPhase = 'idle'; status('reading-ended', 'Finished reading.'); }
      };
      item.onerror = function (event) {
        if (!current()) return;
        read = null; utterance = null; speechPhase = 'idle';
        var messages = {
          'not-allowed': 'Tap Read aloud to allow playback in this browser.',
          'language-unavailable': 'No speech voice is available for this language on this device.',
          'voice-unavailable': 'The selected voice is unavailable. Choose another voice.',
          'audio-busy': 'The audio device is busy. Try Read aloud again.',
          'audio-hardware': 'The browser could not access an audio output device.'
        };
        status('speech-' + (event.error || 'error'), messages[event.error] || 'Reading aloud could not continue in this browser.', 'error');
      };
      try { synth.speak(item); }
      catch (_) { item.onerror({ error: 'start-failed' }); }
    }
    function beginRead(job) {
      if (disposed || job.id !== speechId) return;
      read = job; speechPhase = 'queued'; publish(); sayChunk(job);
    }
    function speak(text, config) {
      if (disposed) return false;
      if (!canSpeak) { status('speech-unsupported', 'Reading aloud is unavailable in this browser.', 'warning'); return false; }
      text = typeof text === 'string' ? text.trim() : '';
      if (!text) { status('nothing-to-read', 'There is no message text to read.', 'info'); return false; }
      config = config || {};
      if (!haltSpeech(false) || disposed) return false;
      refreshVoices(true);
      var job = { id: speechId, chunks: chunksOf(text), index: 0,
        language: validLanguage(config.lang) || language,
        voiceURI: typeof config.voiceURI === 'string' ? config.voiceURI : voiceURI,
        rate: bounded(config.rate, 0.1, 10, rate), pitch: bounded(config.pitch, 0, 2, 1),
        volume: bounded(config.volume, 0, 1, 1) };
      if (mic) {
        pendingRead = job; speechPhase = 'waiting-for-microphone';
        status('microphone-stopping', 'Stopping the microphone before reading.');
        return endMic(true);
      }
      beginRead(job); return true;
    }
    function pauseSpeaking() {
      if (disposed || !read || !canSpeak) return false;
      try { synth.pause(); if (synth.paused) speechPhase = 'paused'; publish(); return true; }
      catch (_) { status('pause-unavailable', 'This browser could not pause reading.', 'warning'); return false; }
    }
    function resumeSpeaking() {
      if (disposed || !read || !canSpeak) return false;
      try {
        synth.resume(); speechPhase = 'speaking';
        if (!utterance) sayChunk(read);
        publish(); return true;
      } catch (_) { status('resume-unavailable', 'This browser could not resume reading.', 'warning'); return false; }
    }
    function dispose() {
      if (disposed) return;
      disposed = true;
      haltSpeech(false); clearMicTimer();
      var capture = mic; mic = null; micPhase = 'idle';
      if (capture) {
        detachMic(capture);
        if (capture.abort) capture.abort.abort();
        try { if (capture.kind === 'recorder') { if (capture.engine && capture.engine.state !== 'inactive') capture.engine.stop(); } else capture.engine.abort(); } catch (_) {}
      }
      if (canSpeak && typeof synth.removeEventListener === 'function') synth.removeEventListener('voiceschanged', voicesHandler);
      else if (canSpeak && synth.onvoiceschanged === voicesHandler) synth.onvoiceschanged = previousVoicesHandler;
      if (root.removeEventListener) root.removeEventListener('pagehide', dispose);
      if (root.document && root.document.removeEventListener) root.document.removeEventListener('visibilitychange', onVisibility);
      options = {};
    }
    function onVisibility() {
      if (!disposed && root.document.hidden && mic) {
        endMic(true); status('microphone-hidden', 'Dictation stopped because Raven is no longer visible.');
      }
    }

    voicesHandler = function (event) {
      if (typeof previousVoicesHandler === 'function') { try { previousVoicesHandler.call(synth, event); } catch (_) {} }
      refreshVoices();
    };
    if (canSpeak) {
      if (typeof synth.addEventListener === 'function') synth.addEventListener('voiceschanged', voicesHandler);
      else { previousVoicesHandler = synth.onvoiceschanged; synth.onvoiceschanged = voicesHandler; }
      try { nativeVoices = Array.from(synth.getVoices() || []); } catch (_) {}
    }
    if (root.addEventListener) root.addEventListener('pagehide', dispose);
    if (root.document && root.document.addEventListener) root.document.addEventListener('visibilitychange', onVisibility);
    Promise.resolve().then(publish);

    return Object.freeze({
      startListening: startListening,
      stopListening: function () { return !disposed && endMic(false); },
      cancelListening: function () { return !disposed && endMic(true); },
      speak: speak, pauseSpeaking: pauseSpeaking, resumeSpeaking: resumeSpeaking,
      stopSpeaking: function () { return !disposed && haltSpeech(true); },
      setLanguage: function (value) { var next = validLanguage(value); if (disposed || !next) return false; language = next; publish(); return true; },
      setRate: function (value) { if (disposed || !Number.isFinite(Number(value))) return false; rate = bounded(value, 0.1, 10, rate); publish(); return true; },
      setVoice: function (value) { if (disposed || typeof value !== 'string') return false; voiceURI = value; publish(); return true; },
      getState: snapshot, getVoices: function () { return voiceList(); }, dispose: dispose
    });
  }

  root.RavenVoiceControls = Object.freeze({ create: create });
})(window);
