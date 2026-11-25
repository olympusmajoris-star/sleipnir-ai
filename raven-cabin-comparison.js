/* Reference chat-space guide. Measurements use the current native canvas. */
(function(G){
  'use strict';
  const finite=(n,f=0)=>Number.isFinite(Number(n))?Number(n):f;
  function measure({width,height,presentation={},actualThread=null,actualComposer=null,mode='chat',lineHeight=22}={}){
    const w=Math.max(0,finite(width)),h=Math.max(0,finite(height)),phone=presentation.device==='iphone',portrait=presentation.orientation!=='landscape';
    const safeTop=phone&&portrait?47:0,safeBottom=phone?(portrait?34:21):0,header=56,typing=52,margin=12;
    const referenceThread=[margin,safeTop+header,Math.max(0,w-2*margin),Math.max(0,h-safeTop-safeBottom-header-typing-8)];
    const referenceComposer=[margin,Math.max(0,h-safeBottom-typing),Math.max(0,w-2*margin),typing];
    const clip=r=>{if(!Array.isArray(r)||r.length!==4||!r.every(Number.isFinite))return null;const x=Math.max(0,r[0]),y=Math.max(0,r[1]),right=Math.min(w,r[0]+r[2]),bottom=Math.min(h,r[1]+r[3]);return right>x&&bottom>y?[x,y,right-x,bottom-y]:null;};
    const thread=mode==='chat'?clip(actualThread):null,composer=clip(actualComposer),area=referenceThread[2]*referenceThread[3];
    return {mode,referenceThread,referenceComposer,actualThread:thread,actualComposer:composer,visibleLines:thread?Math.floor(thread[3]/Math.max(1,lineHeight)):0,referenceLines:Math.floor(referenceThread[3]/Math.max(1,lineHeight)),retainedPercent:thread&&area?thread[2]*thread[3]/area*100:0,benchmark:{safeTop,safeBottom,header,typing,margin},note:'Dotted outlines show a reference chat layout with a 56 px header and 52 px typing bar. This is not a measurement of a specific app; line counts are approximate.'};
  }
  function mount({scene}={}){
    const D=scene.ownerDocument,overlay=D.createElement('div');overlay.className='rwc-comparison';overlay.setAttribute('aria-hidden','true');overlay.hidden=true;
    const thread=D.createElement('div'),composer=D.createElement('div');thread.className='rwc-reference-thread';composer.className='rwc-reference-compose';
    for(const [node,text]of [[thread,'Reference thread'],[composer,'Reference typing bar']]){const label=D.createElement('span');label.textContent=text;node.appendChild(label);overlay.appendChild(node);}scene.appendChild(overlay);
    function update(options){const report=measure(options);overlay.hidden=!options.presentation?.compare;for(const [node,r]of [[thread,report.referenceThread],[composer,report.referenceComposer]])Object.assign(node.style,{left:r[0]+'px',top:r[1]+'px',width:r[2]+'px',height:r[3]+'px'});return report;}
    return {update,dispose(){overlay.remove();}};
  }
  G.RavenCabinComparison={measure,mount};
})(window);

