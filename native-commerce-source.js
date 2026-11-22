/* Check a private Dart file against the code actually served for this store display. */
(function (global) {
  'use strict';
  const families = {
    retail:['retail','RetailStore'],
    convenience:['retail','RetailStore'],
    fast_food:['fast_food','McDonaldsComboPanel'],
    drive_thru:['fast_food','McDonaldsComboPanel'],
    fast_casual:['fast_casual','FastCasualMenuBoard'],
    sit_down:['sit_down','SitDownRestaurantMenu'],
    restaurant:['sit_down','SitDownRestaurantMenu'],
    valhalla:['valhalla','ValhallaStreet']
  };
  const hash = /^[0-9a-f]{64}$/;
  const make = (tag,text) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    return node;
  };
  async function sha256(bytes) {
    const result = new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
    return Array.from(result,b => b.toString(16).padStart(2,'0')).join('');
  }
  async function mount(host,config) {
    const family = families[config.adapter];
    if (!Array.isArray(family)) { config.onState?.({status:'error'});host.textContent='This widget has no verified source record.';return; }
    const [key,widgetName] = family;
    const folder = key === 'valhalla' ? 'native-valhalla' : 'native-commerce-preview';
    const manifestURL = new URL(folder + '/release.json',location.href);
    const shopperManifest = new URL('native-shopper-preview/release.json',location.href);
    const releaseURL = new URL(config.releaseURL,location.href);
    const currentDigest = config.expectedArtifactSHA256 || '';
    const storageKey = 'studio-selected-native-dart-v1/' + config.storeId + '/' + key;
    const heading=make('h2','Dart source'),label=make('label','Choose '+widgetName+'.dart'),input=make('input');
    input.type='file';input.accept='.dart,text/plain';input.id='native-dart-file';label.htmlFor=input.id;
    const status=make('p');status.id='native-dart-status';status.setAttribute('role','status');
    const identity=make('code');identity.style.overflowWrap='anywhere';
    const restore=make('button','Use published build');restore.type='button';restore.hidden=true;
    const retry=make('button','Retry verification');retry.type='button';retry.hidden=true;
    const privacy=make('small','Your Dart file is checked on this device.');
    host.replaceChildren(heading,label,input,privacy,status,identity,restore,retry);
    let sequence=0,selected=null,disposed=false;
    function remember(value) {
      try {
        if(value) sessionStorage.setItem(storageKey,JSON.stringify(value));
        else sessionStorage.removeItem(storageKey);
      } catch (_) { /* A blocked session store leaves the selection in memory. */ }
    }
    function notify(state,description,digest='',artifact='',previewURL='') {
      status.textContent=description;
      identity.textContent=digest ? 'SHA-256 ' + digest : '';
      restore.hidden=!selected;
      restore.textContent=state==='shopper' ? 'Return to interactive Studio' : 'Use published build';
      retry.hidden=state!=='error';
      config.onState?.({status:state,sourceSha256:digest,artifactSha256:artifact,previewURL});
    }
    async function readRelease(complete,shopper=false) {
      if(releaseURL.href!==manifestURL.href) throw Error('The source record is outside this display’s release.');
      const url=shopper?shopperManifest:manifestURL;
      const res=await fetch(url,{cache:'no-store',credentials:'omit'});
      if(shopper && res.status===404) return null;
      if(!res.ok) throw Error('The source record is unavailable.');
      const release=await res.json();
      const original=release.sources?.[key],artifact=release.artifactSHA256;
      if(!hash.test(original || '') || !hash.test(artifact || '')) throw Error('This widget has no complete source and build record.');
      if(!shopper && currentDigest && currentDigest!==artifact) throw Error('The published build changed. Reload the store before comparing this file.');
      const accepted=[original];
      if(!shopper && key!=='valhalla' && hash.test(release.studioSources?.[key] || '')) accepted.push(release.studioSources[key]);
      if(!shopper && key==='valhalla' && hash.test(release.studioSourceSHA256 || '')) accepted.push(release.studioSourceSHA256);
      if(complete) {
        const js=await fetch(new URL('main.dart.js',url),{cache:'no-store',credentials:'omit'});
        if(!js.ok || await sha256(await js.arrayBuffer())!==artifact) throw Error('The compiled display does not match its published build record.');
      }
      return {original,accepted,artifact};
    }
    async function verify(choice,serial,recheckPublished=false) {
      try {
        const release=await readRelease(recheckPublished);
        if(disposed || serial!==sequence) return;
        if(!choice) {
          notify('published','Published '+widgetName+' build.',release.original,release.artifact);
          return;
        }
        const shopper = !release.accepted.includes(choice.sha) && key!=='valhalla';
        const candidate = shopper ? await readRelease(false,true) : release;
        if(disposed || serial!==sequence) return;
        if(!candidate?.accepted.includes(choice.sha)) {
          notify('unbuilt',choice.filename+' has no matching compiled build for '+widgetName+'.',choice.sha);
          return;
        }
        const checked=await readRelease(true,shopper);
        if(disposed || serial!==sequence) return;
        if(!checked?.accepted.includes(choice.sha) || checked.artifact!==candidate.artifact) throw Error('The published source changed during verification.');
        if(shopper) {
          const preview=new URL('index.html',shopperManifest);
          preview.searchParams.set('store',config.storeId);
          notify('shopper',choice.filename+' matches the compiled shopper widget. Browse this store or return to Studio to edit products.',
            choice.sha,checked.artifact,preview.href);
        } else {
          notify('verified',choice.filename+' matches the compiled '+widgetName+' display.',choice.sha,checked.artifact);
        }
      } catch(err) {
        if(!disposed && serial===sequence) notify('error',err.message || 'Source verification failed.',choice?.sha);
      }
    }
    async function choose(file) {
      if(!file || disposed) return;
      const serial=++sequence;
      const placeholder={filename:file.name.slice(0,220),sha:''};
      selected=placeholder;
      notify('checking','Checking '+placeholder.filename+'…');
      try {
        if(!/\.dart$/i.test(file.name)||!file.size) throw Error('Choose a nonempty Dart source file.');
        const bytes=await file.arrayBuffer();
        const digest=await sha256(bytes);
        if(disposed || serial!==sequence) return;
        selected={filename:placeholder.filename,sha:digest};
        remember(selected);
        await verify(selected,serial);
      } catch(err) {
        if(!disposed && serial===sequence) notify('error',err.message || 'The Dart file could not be read.');
      }
    }
    async function usePublished() {
      selected=null;
      remember(null);
      input.value='';
      const serial=++sequence;
      notify('checking','Opening the published build…');
      await verify(null,serial,true);
    }
    input.addEventListener('change',()=>{
      const file=input.files[0];
      input.value='';
      choose(file);
    });
    restore.onclick=usePublished;
    retry.onclick=()=>{
      if(selected && !selected.sha) { input.value='';input.click();return; }
      const serial=++sequence;
      notify('checking','Checking the published build…',selected?.sha);
      verify(selected,serial,!selected);
    };
    try {
      const prior=JSON.parse(sessionStorage.getItem(storageKey) || 'null');
      if(prior && hash.test(prior.sha || '') && typeof prior.filename==='string')
        selected={filename:prior.filename.slice(0,220),sha:prior.sha};
    } catch (_) { /* Fresh session. */ }
    const serial=++sequence;
    notify('checking',selected ? 'Checking '+selected.filename+'…' : 'Checking the published source…',selected?.sha);
    await verify(selected,serial);
    return {select:choose,usePublished,dispose:()=>{disposed=true;++sequence;host.replaceChildren();}};
  }
  global.NativeCommerceSource={mount};
})(window);
