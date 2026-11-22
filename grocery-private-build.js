(function (root) {
  'use strict';
  const broker = 'http://127.0.0.1:48179';
  const preview = 'http://127.0.0.1:48180';
  const sessionKey = 'sleipnir.aisle.compiler.session.v1';
  function error(code, message) { return Object.assign(new Error(message), {code}); }
  function token() { try { return sessionStorage.getItem(sessionKey) || ''; } catch { return ''; } }
  function clear() { try { sessionStorage.removeItem(sessionKey); } catch {} }
  async function request(path, options = {}, signal) {
    const ctrl = new AbortController();
    const cancel = () => ctrl.abort();
    if (signal?.aborted) throw error('cancelled', 'Preview request cancelled.');
    signal?.addEventListener('abort', cancel, {once:true});
    const timer = setTimeout(() => ctrl.abort(), path === '/build' ? 25000 : 7000);
    try {
      const response = await fetch(broker + path, {...options, signal:ctrl.signal,
        mode:'cors', credentials:'omit', cache:'no-store', redirect:'error', referrerPolicy:'no-referrer'});
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) clear();
        throw error(response.status === 401 ? 'unpaired' : data.error || 'compile_failed',
          data.message || 'The local compiler could not complete this request.');
      }
      return data;
    } catch (cause) {
      if (signal?.aborted) throw error('cancelled','Preview request cancelled.');
      if (cause.code && typeof cause.code === 'string') throw cause;
      throw error('offline','Open the local compiler and allow this Studio to connect to your computer.');
    } finally { clearTimeout(timer); signal?.removeEventListener('abort',cancel); }
  }
  // Call directly from a button click so the browser can open the consent page.
  function pair() {
    const nonce = crypto.randomUUID();
    const popup = root.open(broker + '/pair?nonce=' + encodeURIComponent(nonce),
      'sleipnir-aisle-compiler-pair', 'width=520,height=460,popup');
    if (!popup) return Promise.reject(error('popup_blocked','Allow the pairing window and try again.'));
    return new Promise((resolve,reject) => {
      function finish(ok, value) {
        clearTimeout(deadline);clearInterval(closed); root.removeEventListener('message',receive);
        if (ok) resolve(value); else reject(value);
      }
      function receive(e) {
        const d=e.data;
        if (e.source!==popup || e.origin!==broker || d?.type!=='target-studio.local-compiler.paired.v1' ||
            d.nonce!==nonce || typeof d.token!=='string' || d.token.length<24 || d.token.length>512) return;
        try { sessionStorage.setItem(sessionKey,d.token); } catch { finish(false,error('storage','Allow session storage in this tab to pair the compiler.')); return; }
        finish(true,true);
      }
      const deadline=setTimeout(()=>finish(false,error('timeout','Pairing timed out. Open the compiler and try again.')),120000);
      const closed=setInterval(()=>{if(popup.closed)finish(false,error('cancelled','Pairing window closed.'));},750);
      root.addEventListener('message',receive);
    });
  }
  async function open(file, {onStatus=()=>{},signal} = {}) {
    if (!(file instanceof Blob) || file.size===0 || file.size>8*1024*1024)
      throw error('file','Select a nonempty GroceryAisle Dart file up to 8 MiB.');
    const bytes=await file.arrayBuffer();
    const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),
      n=>n.toString(16).padStart(2,'0')).join('');
    const key=token();
    const auth=key ? {Authorization:'Bearer '+key}: {};
    const status=await request('/health',{headers:auth},signal);
    if (!status.paired) throw error('unpaired','Pair the local compiler with this tab to preview this version.');
    onStatus('Submitting your Dart to the paired compiler…');
    let job=await request('/build',{method:'POST',body:bytes,headers:{...auth,
      'Content-Type':'application/octet-stream','X-Source-SHA256':digest}},signal);
    if (job.sourceSha256!==digest || typeof job.jobId!=='string' || !/^[\w-]{1,128}$/.test(job.jobId))
      throw error('integrity','The compiler returned a different file identity.');
    const jobId=job.jobId, deadline=Date.now()+35*60*1000;
    let last=null;
    while (job.status!=='ready') {
      if (job.status==='failed') throw error('compile_failed',String(job.error || 'Flutter could not compile this file.').slice(0,3000));
      if (!['queued','building'].includes(job.status)) throw error('compile_failed','Unrecognized build status.');
      if (job.status!==last) onStatus(job.status==='queued'?'Waiting for the compiler…':'Compiling your Dart with Flutter…');
      last=job.status;
      if(Date.now()>deadline) throw error('timeout','The compiler did not finish in time. Its status is available on your computer.');
      if(signal?.aborted) throw error('cancelled','Preview request cancelled.');
      await new Promise(r=>setTimeout(r,1500));
      job=await request('/build/'+encodeURIComponent(jobId),{headers:auth},signal);
      if(job.sourceSha256!==digest || job.jobId!==jobId) throw error('integrity','The compiler returned a different build.');
    }
    const url=preview+'/preview/'+digest+'/index.html';
    if(job.previewUrl!==url) throw error('integrity','The preview did not match the selected file.');
    onStatus('Flutter preview ready.');
    return {url,sha256:digest,capabilities:job.capabilities || [],readOnly:job.readOnly===true};
  }
  root.GroceryPrivateBuild=Object.freeze({open,pair,clear,broker,preview});
})(window);
