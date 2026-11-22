/* Tools register once. Each invocation receives the original selection and its owning page. */
(function (root) {
  'use strict';
  const tools = new Map();
  const token = /^[a-z][a-z0-9-]{0,59}$/;

  function register(spec) {
    if (!spec || !token.test(spec.id) || typeof spec.title !== 'string' ||
        typeof spec.openURL !== 'function' || !Array.isArray(spec.topics)) throw Error('Invalid Studio tool.');
    if (tools.has(spec.id)) throw Error('Studio tool already registered: '+spec.id);
    const topics = spec.topics.map(t=>{
      if (!token.test(t.id) || !t.title) throw Error('Invalid edit type for '+spec.title);
      return Object.freeze({...t});
    });
    const tool = Object.freeze({...spec,topics:Object.freeze(topics)});
    tools.set(tool.id,tool);
    root.dispatchEvent?.(new CustomEvent('studio:tool-registered',{detail:{id:tool.id}}));
    return tool;
  }
  function targetQuery(t) {
    const query = new URLSearchParams({page:t.page});
    for (const [key,value] of Object.entries({store:t.store,aisle:t.aisle,part:t.part,layer:t.layer,targetType:t.type,targetLabel:t.label,
      sourceGroup:t.source.group,sourceItem:t.source.item,sourceFeature:t.source.feature,
      sourceTopic:t.source.topic,sourceAsset:t.source.asset})) if (value) query.set(key,value);
    if(t.bounds&&t.type!=='page')query.set('bounds',JSON.stringify(t.bounds));
    if (!t.nativePage && t.page!=='@default') query.set('previewSource','studio-only');
    return query;
  }
  function url(id,target,topic) {
    const tool=tools.get(id);
    if (!tool) throw Error('This tool is unavailable.');
    const raw=tool.openURL(target,topic||'');
    const address=new URL(raw,document.baseURI);
    if(address.origin!==location.origin)throw Error('Studio tools must use a local editor.');
    return address.href;
  }
  root.StudioToolbox=Object.freeze({register,get:id=>tools.get(id),all:()=>[...tools.values()],targetQuery,url});
})(window);
