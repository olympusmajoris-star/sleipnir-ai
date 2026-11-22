(function(root){
  'use strict';
  const tools=root.StudioToolbox;
  const topics=pairs=>pairs.map(([id,title])=>({id,title}));
  const screens = {HomePage:'home',Asgard:'sky','Asgard/dial':'dial','Asgard/horn':'horn','Asgard/way':'way','Asgard/directory':'directory','Asgard/conversation':'conversation'};
  function transitions(target,topic) {
    const dest=target.page==='@default'?'Asgard/dial':target.page;
    const from=target.from||(dest==='HomePage'?'Asgard/dial':'HomePage');
    const q=tools.targetQuery(target);
    for(const [k,v] of Object.entries({transitionEditor:'1',workshopFocus:'1',from,to:dest,
      scope:target.type!=='page'?'selection':target.page==='@default'?'default':target.from?'route':'page',group:topic}))q.set(k,v);
    return 'sleipnir-studio-1120.html?'+q+'#'+(screens[dest]||'dial');
  }
  tools.register({id:'transitions',title:'Page transitions',scope:'selection',supportsDefault:true,
    topics:topics([['style','Effect & layer'],['timing','Timing'],['scope','Pages & direction']]),openURL:transitions});
  tools.register({id:'glass',title:'Glass & camera',scope:'selection',supportsDefault:true,
    topics:topics([['material','Glass material'],['placement','Position & size'],['camera','Camera & visibility'],['scope','Pages & direction']]),openURL:transitions});
  tools.register({id:'sky',title:'Sky',scope:'selection',ownsChooser:true,topics:[],
    openURL(target,topic){const q=tools.targetQuery(target);if(topic)q.set('feature',topic);return 'page-sky-editor.html?'+q;}});
  tools.register({id:'layers',title:'Layers & tools',scope:'selection',
    topics:topics([['layers','Layers'],['size','Size & position'],['media','Images & video'],['panels','Panels & frames'],['style','Style'],['light','Lighting'],['text','Text'],['motion','Motion'],['action','Actions']]),
    openURL(target,topic){const q=tools.targetQuery(target);if(topic)q.set('topic',topic);return 'portable-layers.html?'+q;}});
  tools.register({id:'components',title:'Studio components',scope:'selection',ownsChooser:true,topics:[],
    openURL(target,topic){const q=tools.targetQuery(target);if(topic)q.set('topic',topic);return 'studio-component-editor.html?'+q;}});
})(window);
