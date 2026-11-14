/* Deterministic catalog checks. No inferred product identities or live deletions. */
(function(G){'use strict';
const tidy=s=>typeof s==='string'?s.replace(/\s+/g,' ').trim():s;
const normalized=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
function analyzePixels(data,width,height){
 if(!data||data.length!==width*height*4||width<1||height<1)throw Error('Invalid image pixels');
 let visible=0,white=0,borderWhite=0,border=0,alpha=0,minX=width,minY=height,maxX=-1,maxY=-1;
 const shades=new Set();for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4,r=data[i],g=data[i+1],b=data[i+2],a=data[i+3],edge=x===0||y===0||x===width-1||y===height-1,isWhite=r>242&&g>242&&b>242&&a>245;if(edge){border++;if(isWhite)borderWhite++;}if(a<245)alpha++;if(a>12){visible++;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);if(isWhite)white++;shades.add((r>>5)*64+(g>>5)*8+(b>>5));}}
 const reasons=[];if(!visible)reasons.push('Empty transparent image');if(visible&&white/visible>.985)reasons.push('Almost entirely white');if(shades.size<3&&visible)reasons.push('Almost no image detail');if(alpha===0&&borderWhite/Math.max(1,border)>.96)reasons.push('White background around the image');
 return {visibleFraction:visible/(width*height),whiteFraction:white/Math.max(1,visible),transparentFraction:alpha/(width*height),borderWhiteFraction:borderWhite/Math.max(1,border),bounds:visible?{x:minX,y:minY,width:maxX-minX+1,height:maxY-minY+1}:null,reasons,blank:!visible||(visible>0&&white/visible>.985)};
}
function removeEdgeBackground(data,width,height,{threshold=242,tolerance=18}={}){
 if(data.length!==width*height*4)throw Error('Invalid image pixels');const out=new Uint8ClampedArray(data),seen=new Uint8Array(width*height),queue=new Int32Array(width*height);let head=0,tail=0,removed=0;
 const add=(x,y)=>{if(x<0||x>=width||y<0||y>=height)return;const p=y*width+x;if(seen[p])return;seen[p]=1;const i=p*4,low=Math.min(out[i],out[i+1],out[i+2]),high=Math.max(out[i],out[i+1],out[i+2]);if(out[i+3]===0||(low>=threshold&&high-low<=tolerance))queue[tail++]=p;};
 for(let x=0;x<width;x++){add(x,0);add(x,height-1);}for(let y=0;y<height;y++){add(0,y);add(width-1,y);}while(head<tail){const p=queue[head++],x=p%width,y=Math.floor(p/width);if(out[p*4+3])removed++;out[p*4+3]=0;add(x-1,y);add(x+1,y);add(x,y-1);add(x,y+1);}return{data:out,removed};
}
function cleanup(products,qa={}){
 const patches={},decisions=[],seen=new Map();for(const p of products){const patch={};for(const k of ['name','description','category','shelf_group'])if(typeof p[k]==='string'&&tidy(p[k])!==p[k])patch[k]=tidy(p[k]);
 const q=qa[p.id],bad=!tidy(p.name)||!p.image_url||['missing','broken','blank'].includes(q?.status)||/\b(placeholder|image[ _-]?not[ _-]?found|no[ _-]?image|coming[ _-]?soon)\b/i.test(String(p.image_url));
 if(bad){patch.excludeFromRenders=true;decisions.push({id:p.id,kind:'excluded',reason:!p.image_url?'Missing product image':q?.reason||'Missing name or placeholder image'});}
 const identity=q?.hash||p.image_url;const key=JSON.stringify([p.store_id,normalized(p.name),normalized(p.full_name),p.price,normalized(p.description),normalized(p.variant),p.weight_lbs??null,p.combo_drink??null,p.combo_upcharge??null,normalized(p.gender),normalized(p.section),identity]);
 if(!bad&&identity&&tidy(p.name)){if(seen.has(key)){patch.excludeFromRenders=true;decisions.push({id:p.id,kind:'duplicate',keepId:seen.get(key),reason:'Same store, full name, variant, description, price and image'});}else seen.set(key,p.id);}
 if(Object.keys(patch).length)patches[p.id]=patch;
 }return{patches,decisions,changed:Object.keys(patches).length};
}
function applyCleanup(draft,plan){const before={},after={};for(const [id,patch]of Object.entries(plan.patches)){before[id]=JSON.parse(JSON.stringify(draft.overrides[id]||{}));draft.overrides[id]={...draft.overrides[id],...patch};after[id]=JSON.parse(JSON.stringify(draft.overrides[id]));}return{before,after,decisions:plan.decisions,at:new Date().toISOString()};}
function undoCleanup(draft,run){let restored=0,skipped=0;for(const [id,after]of Object.entries(run.after)){if(JSON.stringify(draft.overrides[id]||{})!==JSON.stringify(after)){skipped++;continue;}if(Object.keys(run.before[id]).length)draft.overrides[id]=run.before[id];else delete draft.overrides[id];restored++;}return{restored,skipped};}
function imageGeometry(imageWidth,imageHeight,boxWidth,boxHeight,fit='contain',cropX=50,cropY=50){const scale=fit==='cover'?Math.max(boxWidth/imageWidth,boxHeight/imageHeight):Math.min(boxWidth/imageWidth,boxHeight/imageHeight);const width=imageWidth*scale,height=imageHeight*scale;return{x:(boxWidth-width)*cropX/100,y:(boxHeight-height)*cropY/100,width,height};}
const api={tidy,analyzePixels,removeEdgeBackground,cleanup,applyCleanup,undoCleanup,imageGeometry};if(typeof module!=='undefined')module.exports=api;G.CatalogQualityCore=api;
})(typeof window!=='undefined'?window:globalThis);
