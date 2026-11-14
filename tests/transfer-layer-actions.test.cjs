const test=require('node:test'),assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');global.crypto=webcrypto;
const {safeAction,makeLayer}=require('../studio-page-tools.js');
const storeId='189581c9-d728-4e5d-9e02-ae4de19a15af',productId='6e179aa7-cdf9-4872-8972-a72c14d06ea4';
test('button actions are explicit and inert by default',()=>{assert.equal(safeAction(makeLayer('button').action),null);});
test('valid product and page destinations preserve identity and strip extra properties',()=>{assert.deepEqual(safeAction({type:'product',productId,storeId,script:'bad'}),{type:'product',productId,storeId});assert.deepEqual(safeAction({type:'navigate',target:'browse',pageType:'retail',url:'javascript:bad'}),{type:'navigate',target:'browse',pageType:'retail'});});
test('invalid targets, IDs and arbitrary URL actions cannot run',()=>{for(const action of [{type:'navigate',target:'https://evil.example'},{type:'navigate',target:'browse',pageType:'unknown'},{type:'product',storeId,productId:'bad'},{type:'navigate',target:'store'},{type:'eval',code:'alert()'}])assert.equal(safeAction(action),null);});
