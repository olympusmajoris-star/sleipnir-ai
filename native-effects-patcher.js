/* Frozen effects in an isolated copy of the complete, original Raven widget. */
(function(G){'use strict';
const C=typeof module!=='undefined'?require('./studio-effects-core'):G.StudioEffects;
function patch(source,input){const d=C.clean(input),c=d.construction,f=d.clouds;
 if(!source.includes('class AsgardRavenStudioTest extends StatefulWidget')||source.includes('ASGARD_EFFECTS_TEST_V1'))throw Error('Use a freshly generated AsgardRavenStudioTest source.');
 function replace(a,b){if(source.split(a).length!==2)throw Error('Original effects source changed near '+a.slice(0,70)+'. No partial file was created.');source=source.replace(a,b);}
 const n=x=>Number(x).toFixed(6).replace(/0+$/,'').replace(/\.$/,'.0');
 replace('final _rvEntranceSeconds = ValueNotifier<double>(4.8);','final _rvEntranceSeconds = ValueNotifier<double>('+n(c.duration)+');');
 replace('final _rvOffshootSeconds = ValueNotifier<double>(30);','final _rvOffshootSeconds = ValueNotifier<double>('+n(f.interval)+');');
 replace("_control('Construction duration', _rvEntranceSeconds, 3.2, 9)","_control('Construction duration', _rvEntranceSeconds, 1, 30)");
 replace("_control('Average cloud breakoff interval', _rvOffshootSeconds, 18, 90)","_control('Average cloud breakoff interval', _rvOffshootSeconds, 5, 180)");
 replace('offshootIntervalSeconds.clamp(18.0, 90.0)','offshootIntervalSeconds.clamp(5.0, 180.0)');
 replace('const int _rvConstructionBlockColumns = 4;','const int _rvConstructionBlockColumns = '+c.columns+';');
 replace('const int _rvConstructionBlockRows = 7;','const int _rvConstructionBlockRows = '+c.rows+';');
 replace('const Color _rvConstructionPaperColor = Color(0xFFF0E2BF);','const Color _rvConstructionPaperColor = Color(0xFF'+c.paper.slice(1).toUpperCase()+');');
 for(const[k,old]of [['ink','413B32'],['amber','AA7034'],['red','B64F32'],['blue','48747A']]){const name=k==='ink'?'charcoal':k;replace('static const _'+name+' = Color(0xFF'+old+');','static const _'+name+' = Color(0xFF'+c[k].slice(1).toUpperCase()+');');}
 replace('..translate(fromSide * (1 - p), -lift * (1 - p))','..translate(fromSide * (1 - p) * '+n(c.lift)+', -lift * (1 - p) * '+n(c.lift)+')');
 replace('final z = (1 - seated) * (layer + 1) * (composer ? 13.0 : 10.0);','final z = (1 - seated) * (layer + 1) * (composer ? 13.0 : 10.0) * '+n(c.depth)+';');
 replace('final z = (1 - seated) * (24 + layer * 22.0);','final z = (1 - seated) * (24 + layer * 22.0) * '+n(c.depth)+';');
 const begin=source.indexOf('class _RvConstructionPainter extends CustomPainter'),end=source.indexOf('class _RvTerrainBlueprint',begin);if(begin<0||end<0)throw Error('Construction painter unavailable.');let painter=source.slice(begin,end),widths=0;painter=painter.replace(/(\.\.strokeWidth = )([^\n,;]+)/g,(m,a,b)=>{widths++;return a+'('+b.trim()+') * '+n(c.lineWidth);});if(widths<10)throw Error('Construction line definitions changed.');if(!c.guides){const a=painter.indexOf('  void _measure('),b=painter.indexOf('  void _frame(',a);if(a<0||b<0)throw Error('Measuring line method changed.');painter=painter.slice(0,a)+'  void _measure(Canvas canvas, Offset a, Offset b, double amount, double alpha) {}\n\n'+painter.slice(b);}source=source.slice(0,begin)+painter+source.slice(end);
 if(f.fixedSeed)replace('_RvMistScene([int? seed]) : random = math.Random(seed);','_RvMistScene([int? seed]) : random = math.Random(seed ?? '+f.seed+');');
 replace('interval * (.74 + random.nextDouble() * .52);','interval * ('+n(1-f.jitter)+' + random.nextDouble() * '+n(f.jitter*2)+');');
 replace('final kind = roll < .62','final kind = roll < '+n(f.smallChance));replace(': roll < .91',': roll < '+n(f.smallChance+(1-f.smallChance)*f.mediumShare));
 for(const[a,base,range]of [['76 + random.nextDouble() * 34',93,34],['116 + random.nextDouble() * 46',139,46],['170 + random.nextDouble() * 42',191,42]])replace(a,'('+n(base)+' + (random.nextDouble() - .5) * '+n(range*f.sizeVariation)+') * '+n(f.size));
 replace('random.nextDouble() < .72','random.nextDouble() < '+n(f.dissolveChance));replace('random.nextDouble() < .58','random.nextDouble() < '+n(f.absorbChance));
 replace('(kind == _RvMistSize.large ? 5.0 : 6 + random.nextDouble() * 3),','(kind == _RvMistSize.large ? 5.0 : 6 + random.nextDouble() * 3) * '+n(f.speed)+',');
 replace('? 15 + random.nextDouble() * 15\n          : 44 + random.nextDouble() * 28,','? (15 + random.nextDouble() * 15) * '+n(f.life)+'\n          : (44 + random.nextDouble() * 28) * '+n(f.life)+',');
 replace('attachDuration: 5.5 + random.nextDouble() * 3,','attachDuration: (5.5 + random.nextDouble() * 3) * '+n(f.attach)+',');
 replace('turn: (random.nextDouble() - .5) * .65,','turn: (random.nextDouble() - .5) * .65 * '+n(f.turn)+',');
 replace('p.velocity + wander','p.velocity + wander * '+n(f.wander));
 replace('p.merging + dt / 4.2','p.merging + dt / (4.2 * '+n(f.merge)+')');
 replace('dt / (p.distant ? 6 : 8)','dt / ((p.distant ? 6 : 8) * '+n(f.fade)+')');
 replace('p.age > 180) p.dead = true;','p.age > math.max(180.0, (p.life + p.attachDuration) * 2)) p.dead = true;');
 if(Object.keys(d.cloudAssets).length){
  replace('_ticker = vsync.createTicker(_tick);', '_ticker = vsync.createTicker(_tick);\n    playbackSpeed = _rvCustomCloudRates[asset] ?? 1.0;');
  replace(".get(Uri.parse('$_rvArtworkRoot$asset'))",".get(Uri.parse(_rvCustomCloudUrls[asset] ?? '$_rvArtworkRoot$asset'))");
  replace('final bounds = switch (asset) {',"if (_rvCustomCloudUrls.containsKey(asset)) return full;\n  final bounds = switch (asset) {");
  replace('  final choices = switch (film?.asset) {',"  final custom = _rvCustomCloudCrowns[film?.asset];\n  if (custom != null) return custom;\n  final choices = switch (film?.asset) {");
  replace('film.playbackSpeed = _scene.value.cloudSpeed;',"film.playbackSpeed = _scene.value.cloudSpeed * (_rvCustomCloudRates[film.asset] ?? 1.0);");
  replace("final unsafe = original?.asset == 'cloud-billows-166852-v29.webp';","final unsafe = original?.asset == 'cloud-billows-166852-v29.webp' && !_rvCustomCloudUrls.containsKey(original?.asset);");
  source+='\nconst _rvCustomCloudUrls = <String,String>{'+Object.entries(d.cloudAssets).map(([k,a])=>"'"+k+"':'"+a.url+"'").join(',')+'};\n';
  source+='const _rvCustomCloudRates = <String,double>{'+Object.entries(d.cloudAssets).map(([k,a])=>"'"+k+"':"+n(a.speed)).join(',')+'};\n';
  source+='const _rvCustomCloudCrowns = <String,Rect>{'+Object.entries(d.cloudAssets).map(([k,a])=>"'"+k+"':Rect.fromLTWH("+[a.crown.x*640,a.crown.y*426,a.crown.width*640,a.crown.height*426].map(n).join(',')+')').join(',')+'};\n';
 }
 source=source.replace(/\bAsgardRavenStudioTest\b/g,'AsgardRavenEffectsTest').replace(/\b_AsgardRavenStudioTestState\b/g,'_AsgardRavenEffectsTestState');
 return '// ASGARD_EFFECTS_TEST_V1 — separate native effects test; original widget retained.\n'+source;
}
if(typeof module!=='undefined')module.exports={patch};G.NativeEffectsPatcher={patch};
})(typeof window==='undefined'?globalThis:window);
