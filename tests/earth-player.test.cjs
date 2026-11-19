const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const timeline=require('../studio-clip-timeline.js');
function fixture(){
 const videos=[],ctx={save(){},restore(){},clearRect(){},drawImage(){},translate(){},rotate(){},scale(){}};
 const hold={id:'earthVideoHold',style:{},append(){}};
 const document={getElementById(){return hold;},body:{append(){}},createElement(tag){if(tag==='canvas')return {width:390,height:844,getContext:()=>ctx};if(tag==='video'){const v={duration:10,currentTime:0,videoWidth:1920,videoHeight:1080,readyState:4,paused:true,ended:false,seeking:false,setAttribute(){},addEventListener(){},pause(){this.paused=true;},play(){this.paused=false;return Promise.resolve();}};videos.push(v);return v;}return {style:{},append(){}};}};
 const sandbox={window:{StudioClipTimeline:timeline},document,performance:{now:()=>0},console};vm.runInNewContext(fs.readFileSync(require.resolve('../studio-earth-tools.js'),'utf8'),sandbox);
 const player=sandbox.window.StudioEarthTools.createPlayer({src:p=>p}),settings={day_speed:8,ground_brightness:1,earth:{}},clips=[{p:'a.mp4',speed:1,segments:[{start:0,end:2},{start:5,end:10}]}];
 let t=0;const tick=(seconds=.1)=>{t+=seconds;player.draw(ctx,t,settings,{clips});return player.status();};tick(0);return {player,settings,clips,tick,videos};
}
test('map playback skips removed source ranges instead of hiding edits only in UI',()=>{
 const f=fixture();for(let i=0;i<22;i++)f.tick();const at=f.player.status();assert.ok(at.time>=5&&at.time<5.3);assert.equal(at.segment,1);assert.ok(f.videos[0].currentTime>=5);
});
test('pause freezes map time and speed changes continue from current position',()=>{
 const f=fixture();for(let i=0;i<6;i++)f.tick();f.settings.earth.paused=true;const before=f.tick().time;for(let i=0;i<5;i++)f.tick();assert.equal(f.player.status().time,before);f.settings.day_speed=16;f.settings.earth.paused=false;const after=f.tick().time;assert.equal(after,before);assert.ok(f.tick().time-after>.19);
});
test('reverse walks source times backward and inspection stays on its selected frame',()=>{
 const f=fixture();f.settings.earth.playback='reverse';f.player.preview(0);f.tick();const before=f.tick().time;assert.ok(before>9);assert.ok(f.tick().time<before);f.player.preview(0,6.25);for(let i=0;i<4;i++)f.tick();assert.equal(f.player.status().time,6.25);assert.equal(f.videos[0].paused,true);
});
test('playlist advances while selected cut preview loops its own map',()=>{
 const f=fixture();f.clips[0].segments=[{start:0,end:.2}];f.clips.push({p:'b.mp4',speed:1});for(let i=0;i<5;i++)f.tick();assert.equal(f.player.status().index,1);f.player.preview(0);for(let i=0;i<8;i++)f.tick();assert.equal(f.player.status().index,0);assert.ok(f.player.status().time<.2);
});
