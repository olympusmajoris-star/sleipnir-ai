/* Component frames render public artwork and read one published design. The original editor and device APIs stay outside. */
(() => {
  // Legacy scene modules may use local preferences; keep this frame's preferences in RAM.
  for(const name of ['localStorage','sessionStorage']){
    const entries=new Map();
    Object.defineProperty(window,name,{value:{getItem:k=>entries.get(String(k))??null,
      setItem:(k,v)=>entries.set(String(k),String(v)),removeItem:k=>entries.delete(String(k)),
      clear:()=>entries.clear(),key:i=>[...entries.keys()][i]??null,get length(){return entries.size;}}});
  }
  const nativeFetch=window.fetch.bind(window), origin='https://afnihsdxtisneuyehatw.supabase.co';
  const params=new URLSearchParams(location.search);
  window.fetch=function(input,options={}) {
    const url=new URL(input instanceof Request?input.url:input,location.href);
    const method=(options.method||(input instanceof Request?input.method:'GET')).toUpperCase();
    const meta=window.StudioKit?.screens?.[params.get('screen')];
    const design=url.origin===origin && url.pathname==='/rest/v1/studio_designs' &&
      meta && url.searchParams.get('id')==='eq.'+meta.docId && url.searchParams.get('select')==='data';
    const navigation=url.origin===origin && url.pathname==='/rest/v1/studio_designs' &&
      url.searchParams.get('id')==='eq.navigation' && url.searchParams.get('select')==='data,updated_at';
    const storage=url.origin===origin && url.pathname.startsWith('/storage/v1/object/public/');
    if(!['GET','HEAD'].includes(method)||!(url.origin===location.origin||design||navigation||storage)) return Promise.reject(Error('Read-only component surface.'));
    // Give the original navigation loader time to recover with its own defaults.
    const request={...options,credentials:'omit'};
    if(navigation && !request.signal && typeof AbortSignal!=='undefined' && AbortSignal.timeout)request.signal=AbortSignal.timeout(10000);
    return nativeFetch(input,request);
  };
})();
