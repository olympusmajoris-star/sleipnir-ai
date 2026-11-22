const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const {runInNewContext} = require('node:vm');
const {test} = require('node:test');

function scene() {
  const steps = [];
  const context = {save() { steps.push('save'); }, drawImage() { steps.push('composite'); }};
  const sky = Object.create(context), frame = Object.create(context);
  const strip = {width:780, height:480, getContext() { return sky; }};
  const sc = {_layer:strip,P:{'strip.max':240,'strip.share':.5},id:'sky'};
  const kit = {
    W:390,H:844,hasPageSky:() => true,
    drawPageSky(ctx,id,width,height) { assert.equal(ctx,sky); assert.equal(id,'sky'); assert.equal(width,390); assert.equal(height,240); steps.push('sky'); },
    transitionBoundary(ctx) { assert.equal(ctx,frame); steps.push('boundary'); }
  };
  const source = readFileSync(join(__dirname,'..','studio-asgard-scene.js'),'utf8');
  runInNewContext(source,{window:{StudioKit:kit}});
  return {steps,sky,frame,strip,sc,kit};
}

test('the authored strip receives sky before its controls and establishes the full-page split', () => {
  const {steps,sky,frame,strip,sc,kit} = scene();
  kit.paintAsgardScene(frame,sc,() => {
    steps.push('scenery'); sky.save(); steps.push('orbs and labels');
    frame.drawImage(strip,0,0,780,480,0,0,390,240); steps.push('page controls');
  });
  assert.deepEqual(steps,['scenery','sky','save','orbs and labels','composite','boundary','page controls']);
  assert.equal(Object.hasOwn(frame,'drawImage'),false); assert.equal(Object.hasOwn(sky,'save'),false);
});

test('a different canvas or partial crop does not report separate layers', () => {
  const {steps,sky,frame,strip,sc,kit} = scene();
  kit.paintAsgardScene(frame,sc,() => {
    frame.drawImage({},0,0,780,480,0,0,390,240);
    frame.drawImage(strip,0,0,779,480,0,0,390,240);
  });
  assert.deepEqual(steps,['composite','composite']);
  assert.equal(Object.hasOwn(sky,'save'),false); assert.equal(Object.hasOwn(frame,'drawImage'),false);
});
