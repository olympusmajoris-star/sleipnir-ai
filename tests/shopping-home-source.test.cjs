const test=require('node:test'),assert=require('node:assert/strict');
const {migrate,SOURCE}=require('../shopping-home-source.js');
test('old placeholder values are upgraded without replacing custom art, controls, layers or routes',()=>{
 const old={bg:{color:'#bdbdbd'},logo:{img:'',size:.3},title:{text:'SLEIPNIR'},tiles:{t1:{icon:'',target:'browse'}},norse:{media:[]}};
 const current={bg:{color:'#fff'},logo:{img:'original.png',size:.31},title:{text:'SLEIPNIR'},tiles:{t1:{icon:'grocery.png',target:'browse'}},norse:{media:[{url:'original-bg.jpg'}]}};
 const saved={...structuredClone(old),logo:{img:'my-custom-logo.png',size:.3},title:{text:'Danny’s title'},tiles:{t1:{icon:'',target:'custom-page'}},_studioLayers:[{id:'my-layer'}]};
 const next=migrate(saved,old,current);
 assert.equal(next.bg.color,'#fff');assert.equal(next.logo.img,'my-custom-logo.png');assert.equal(next.logo.size,.31);assert.equal(next.title.text,'Danny’s title');assert.equal(next.tiles.t1.icon,'grocery.png');assert.equal(next.tiles.t1.target,'custom-page');assert.deepEqual(next._studioLayers,saved._studioLayers);assert.equal(saved.bg.color,'#bdbdbd');
});
test('locks survive baseline restoration and edited upgraded documents are not migrated twice',()=>{
 const old={bg:{color:'#bdbdbd'}},current={bg:{color:'#fff'}};
 const saved={...structuredClone(old),_studioEditor:{locks:{'bg.color':{value:'#bdbdbd'}},presets:[{name:'Saved look'}]}};
 const next=migrate(saved,old,current);assert.equal(next.bg.color,'#bdbdbd');assert.deepEqual(next._studioEditor,saved._studioEditor);
 next.bg.color='#123456';assert.deepEqual(migrate(next,old,current),next);
});
test('source playlist contains actual artwork URLs and no exported Hello World entry',()=>{
 assert.equal(SOURCE.sourcePage,'HomePage');assert.equal(SOURCE.backgrounds.length,40);assert.ok(SOURCE.backgrounds.every(url=>new URL(url).protocol==='https:'));assert.match(SOURCE.assets.logo,/slei-logo/);assert.ok(SOURCE.assets.Image_mkewq9x0.includes('dfjmyz51pe6j'));
});
