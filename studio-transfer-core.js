/* Shared transfer contract. Drafts are never a production fallback. */
(function(G){
'use strict';
const VERSION='transfer-20261114-v1';
const SOURCE_COMMIT='e4147b86435180e85c612c2e65297ae3c7797e26';
const PAGES=['raven','navigation','home','shome','browse','store','convo','share','heimdall','track','swap','ads','shoppost','deals'];
const TYPES=['grocery','fast_food','restaurant','retail','valhalla'];
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clone=x=>JSON.parse(JSON.stringify(x));
function designId(page,storeId='',pageType='grocery'){
 if(!PAGES.includes(page))throw Error('Unknown app page');
 if(page==='raven'||page==='navigation')return page;
 if(page==='store'){if(!UUID.test(storeId))throw Error('Choose a store first');return 'page_store_'+storeId;}
 if(page==='browse'){if(!TYPES.includes(pageType))throw Error('Unknown store category');return 'page_browse_'+pageType;}
 return 'page_'+page;
}
function checkEnvelope(e,{approved=false}={}){
 const errors=[];
 if(!e||e.schemaVersion!==1||typeof e.settings!=='object'||Array.isArray(e.settings)||!e.settings)return ['The saved design format is not supported.'];
 try{if(designId(e.page,e.storeId,e.pageType)!==e.designId)errors.push('The page and saved design do not match.');}catch(x){errors.push(x.message);}
 if(e.rendererVersion!==VERSION)errors.push('This renderer version is not supported.');
 if(!e.navigation||typeof e.navigation!=='object'||Array.isArray(e.navigation))errors.push('Navigation settings are missing.');
 if(approved&&e.assetsFrozen!==true)errors.push('Approve a copy of the media before publishing.');
 function walk(v,path){if(!v||typeof v!=='object')return;for(const [k,x]of Object.entries(v)){
   if(['__proto__','constructor','prototype','access_token','refresh_token','service_role','password','authorization','apikey','contacts','contactsJson'].includes(k))errors.push('Private or unsupported field: '+path+k);
   if(typeof x==='string'&&(/^(javascript:|data:text\/html)/i.test(x)||/\/rest\/v1\/studio_designs(?:\?|$)/.test(x)))errors.push('Unsafe app resource: '+path+k);
   if(approved&&typeof x==='string'&&/^(idb:|blob:)/.test(x))errors.push('Local media must be uploaded: '+path+k);
   walk(x,path+k+'.');
 }}walk(e,'');
 return [...new Set(errors)];
}
function mediaRefs(e){const out=new Set();function scan(v){if(typeof v==='string'&&(/^(https:\/\/|data:(image|video|audio)\/|blob:|idb:)/i.test(v)||/\.(png|jpg|jpeg|webp|gif|svg|avif|mp4|webm|mov|woff2?)(\?|$)/i.test(v)))out.add(v);else if(v&&typeof v==='object')for(const x of Object.values(v))scan(x);}scan(e.settings);scan(e.navigation);return [...out];}
function rewriteRefs(value,map){if(typeof value==='string')return map[value]||value;if(Array.isArray(value))return value.map(x=>rewriteRefs(x,map));if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,rewriteRefs(v,map)]));return value;}
function statusFor(page){
 const connected=['raven','navigation','shome','browse','store'];
 return {visual:true,actions:connected.includes(page),note:connected.includes(page)?'Connect the exported callbacks to your app and verify this page on a device.':'Appearance preview is available. The original app data and interactions still need connecting.'};
}
function parseRequest(search){const q=new URLSearchParams(search),mode=q.get('mode')||'approved',page=q.get('page')||'raven',storeId=q.get('store')||'',pageType=q.get('type')||'grocery';if(!['approved','preview','test'].includes(mode))throw Error('Unknown viewing mode');const id=designId(page,storeId,pageType);if(q.get('design')&&q.get('design')!==id)throw Error('The requested design does not match this page');const release=q.get('release')||'';if(release&&!UUID.test(release))throw Error('Invalid saved version');const candidate=q.get('candidate')||'';if(mode==='test'&&!UUID.test(candidate))throw Error('Invalid device test copy');if(mode!=='test'&&candidate)throw Error('Device test copies are separate from production');return {mode,page,storeId,pageType,designId:id,release,candidate};}
function testDart(source,id){if(!UUID.test(id)||!source.includes("'mode': 'approved',"))throw Error('Invalid test export');return '// DEVICE TEST ONLY — immutable test copy; never reads the live channel.\n'+source.replaceAll('AsgardStudioSurface','AsgardStudioTestSurface').replace("'mode': 'approved',","'mode': 'test',\n      'candidate': '"+id+"',");}
const api={testDart,VERSION,SOURCE_COMMIT,PAGES,TYPES,UUID,clone,designId,checkEnvelope,mediaRefs,rewriteRefs,statusFor,parseRequest};
if(typeof module!=='undefined'&&module.exports)module.exports=api;G.StudioTransferCore=api;
})(typeof window!=='undefined'?window:globalThis);
