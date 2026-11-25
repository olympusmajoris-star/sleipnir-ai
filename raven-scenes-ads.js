/* Sample house ads for Raven's editable billboard surfaces.
 * Local preview only: no campaign requests, impressions, billing, or tracking.
 * Future live source, already present in the shared app: authenticated read-only
 * GET /rest/v1/rpc/asgard_ads?p_county=...&p_state=...&p_topic=...
 * It selects approved, paid, current campaigns and respects scope/hidden ads.
 */
(function(G){
'use strict';
const creatives=Object.freeze([
 {id:'raven-night',brand:'RAVEN',headline:'MAKE IT A\nCONVERSATION',body:'Your words. Your world.',image:'raven/scenes/boardwalk.jpg',position:'50% 68%',accent:'#5FD8FF',background:'#06192B',color:'#F3FBFF'},
 {id:'valhalla-local',brand:'VALHALLA',headline:'YOUR CITY.\nYOUR STOPS.',body:'Explore the places around you.',image:'raven/scenes/diner.jpg',position:'50% 78%',accent:'#FFBE6C',background:'#2D1510',color:'#FFF7EA'},
 {id:'valkyrie-next',brand:'VALKYRIE RUN',headline:'THE\nNEXT RUN',body:'Open offers. Real routes.',image:'raven/scenes/train.jpg',position:'50% 50%',accent:'#9CEFD1',background:'#092B2A',color:'#F2FFFA'},
 {id:'freight-next',brand:'FREIGHTBOARD',headline:'FIND YOUR\nNEXT LOAD',body:'Loads. Bids. Drivers.',image:'raven/scenes/gas-station.jpg',position:'50% 28%',accent:'#FFC47A',background:'#10202E',color:'#FFF8EC'},
 {id:'adstudio-mark',brand:'ADSTUDIO',headline:'MAKE\nYOUR MARK',body:'A place for your business.',image:'raven/scenes/cinema.jpg',position:'50% 18%',accent:'#D6A6FF',background:'#1D1039',color:'#FFF7FF'},
 {id:'saga-story',brand:'SAGA',headline:'POST YOUR\nSTORY',body:'Pictures. Moments. Keeps.',image:'raven/scenes/stadium.jpg',position:'50% 65%',accent:'#FF96AA',background:'#31142C',color:'#FFF7F9'}
].map(c=>Object.freeze({...c,mediaType:'image',sample:true})));
const clone=value=>JSON.parse(JSON.stringify(value));
function cadence(value){if(typeof value!=='number'||!Number.isFinite(value))throw Error('Use an ad interval from 5 to 120 seconds.');return Math.max(5,Math.min(120,Math.round(value)));}
function create({slots=['sign1','sign2','sign3'],interval=20,playing=true,shuffle=false,onChange,document:doc=G.document,random=Math.random,setTimeout:schedule=G.setTimeout.bind(G),clearTimeout:cancel=G.clearTimeout.bind(G)}={}){
 if(!Array.isArray(slots)||!slots.length||slots.length>12||slots.some(id=>typeof id!=='string'||!id)||new Set(slots).size!==slots.length)throw Error('Choose unique billboard slots.');
 const ids=[...slots],listeners=new Set(),timers=new Map(),assignments=new Map(ids.map((id,i)=>[id,creatives[(i*2)%creatives.length].id]));
 // Six slots still start with six distinct creatives.
 if(ids.length>3)ids.forEach((id,i)=>assignments.set(id,creatives[i%creatives.length].id));
 let seconds=cadence(interval),isPlaying=!!playing,isShuffle=!!shuffle,disposed=false,suspended=!!doc?.hidden;
 const find=id=>creatives.find(c=>c.id===id);
 const settings=()=>({mode:'sample',interval:seconds,playing:isPlaying,shuffle:isShuffle,assignments:Object.fromEntries(assignments)});
 const state=()=>({...settings(),suspended,creatives:creatives.map(clone),slots:ids.map(id=>({id,creative:clone(find(assignments.get(id)))})),status:isPlaying?(suspended?'paused-hidden':'playing'):'paused',message:'Sample ads · '+(isPlaying?'changing every '+seconds+' seconds':'paused')});
 function emit(){if(disposed)return;const value=state();for(const fn of listeners)try{fn(value);}catch(_){}if(typeof onChange==='function')try{onChange(value);}catch(_){}}
 function clear(){for(const timer of timers.values())cancel(timer);timers.clear();}
 function nextFor(id){const current=assignments.get(id),taken=new Set(ids.filter(x=>x!==id).map(x=>assignments.get(x))),available=creatives.filter(c=>c.id!==current&&!taken.has(c.id)),choices=available.length?available:creatives.filter(c=>c.id!==current);let next;
  if(isShuffle){const n=Math.min(choices.length-1,Math.max(0,Math.floor(Number(random())*choices.length)||0));next=choices[n];}
  else{const start=creatives.findIndex(c=>c.id===current);for(let n=1;n<=creatives.length;n++){const c=creatives[(start+n)%creatives.length];if(c.id!==current&&(!taken.has(c.id)||!available.length)){next=c;break;}}}
  if(next)assignments.set(id,next.id);
 }
 function arm(id,delay){if(disposed||!isPlaying||suspended)return;const timer=schedule(()=>{timers.delete(id);if(disposed||!isPlaying||suspended)return;nextFor(id);emit();arm(id,seconds*1000);},delay);timers.set(id,timer);}
 function restart(){clear();if(!isPlaying||suspended||disposed)return;ids.forEach((id,i)=>arm(id,seconds*1000*(1+i/ids.length)));}
 function next(id){if(disposed)return false;if(id!==undefined&&!assignments.has(id))throw Error('Choose a billboard.');for(const target of id===undefined?ids:[id])nextFor(target);emit();return true;}
 function setInterval(value){const n=cadence(value);if(disposed||n===seconds)return;seconds=n;restart();emit();}
 function setPlaying(value){if(typeof value!=='boolean')throw Error('Choose play or pause.');if(disposed||value===isPlaying)return;isPlaying=value;restart();emit();}
 function setShuffle(value){if(typeof value!=='boolean')throw Error('Choose sequential or shuffled ads.');if(disposed||value===isShuffle)return;isShuffle=value;emit();}
 function setCreative(slot,id){if(!assignments.has(slot)||!find(id))throw Error('Choose an available billboard and sample ad.');if(disposed)return;assignments.set(slot,id);emit();}
 function applySettings(value){if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid sample ad settings.');const allowed=['mode','interval','playing','shuffle','assignments'];if(Object.keys(value).some(k=>!allowed.includes(k))||value.mode!==undefined&&value.mode!=='sample')throw Error('Use sample ad settings.');const nextSeconds=value.interval===undefined?seconds:cadence(value.interval);for(const key of ['playing','shuffle'])if(value[key]!==undefined&&typeof value[key]!=='boolean')throw Error('Invalid '+key+' option.');const nextAssignments=new Map(assignments);if(value.assignments!==undefined){const a=value.assignments;if(!a||typeof a!=='object'||Array.isArray(a))throw Error('Invalid billboard assignments.');for(const [id,creative]of Object.entries(a)){if(!assignments.has(id)||!find(creative))throw Error('Unknown billboard or sample ad.');nextAssignments.set(id,creative);}}
  if(disposed)return;seconds=nextSeconds;isPlaying=value.playing??isPlaying;isShuffle=value.shuffle??isShuffle;for(const [id,creative]of nextAssignments)assignments.set(id,creative);restart();emit();
 }
 function visibility(){if(disposed)return;suspended=!!doc.hidden;restart();emit();}
 doc?.addEventListener?.('visibilitychange',visibility);
 const api={getState:state,getSettings:settings,subscribe(fn){if(typeof fn!=='function')throw Error('Provide an ad listener.');if(disposed)return()=>{};listeners.add(fn);fn(state());return()=>listeners.delete(fn);},next,setInterval,setPlaying,setShuffle,setCreative,applySettings,dispose(){if(disposed)return;disposed=true;clear();listeners.clear();doc?.removeEventListener?.('visibilitychange',visibility);}};
 restart();emit();return api;
}
G.RavenScenesAds={create,creatives};
})(window);
