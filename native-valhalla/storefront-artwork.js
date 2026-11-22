/* Work only with the released storefront selected from the street. The photograph
   and all alpha calculations stay in this document. No mask files are needed. */
(() => {
  'use strict';
  const cache = new Map();
  const canvas = (w, h) => Object.assign(document.createElement('canvas'), {width:w, height:h});

  function skyConfidence(r,g,b) {
    const low=Math.min(r,g,b), high=Math.max(r,g,b);
    const blue=Math.min((b-r-5)/20,(b-g-2)/13,(b-100)/70);
    const cloud=Math.min((low-185)/35,(28-high+low)/18);
    const cool=(b>=g-2 && b>=r-2) ? Math.min((low-185)/30,(48-high+low)/20) : 0;
    const v=Math.min(1,Math.max(0,blue,cloud,cool));
    return v*v*(3-2*v);
  }

  function skyFromPhoto(photo) {
    const w=photo.width,h=photo.height,matte=canvas(w,h),ctx=matte.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(photo,0,0);
    const pixels=ctx.getImageData(0,0,w,h),rgba=pixels.data;
    let transparentTop=0;
    for(let x=0;x<w;x++) if(rgba[4*x+3]<245) transparentTop++;
    const authoredAlpha=transparentTop>=Math.max(1,w*.02);
    if(authoredAlpha) {
      for(let i=3;i<rgba.length;i+=4) rgba[i]=255-rgba[i];
    } else {
      // Grow from visible sky along four-neighbour paths. This keeps similarly
      // coloured signs, windows and pavement separated by the roof untouched.
      const alpha=new Uint8Array(w*h),queue=new Int32Array(w*h);
      let next=0,end=0;
      for(let p=0,i=0;p<alpha.length;p++,i+=4) {
        alpha[p]=Math.round(255*skyConfidence(rgba[i],rgba[i+1],rgba[i+2]));
        rgba[i+3]=0;
      }
      function visit(p) {
        const a=alpha[p];
        if(a<=7)return;
        alpha[p]=0;
        rgba[4*p+3]=a;
        if(a>=20)queue[end++]=p;
      }
      for(let x=0;x<w;x++)visit(x);
      while(next<end) {
        const p=queue[next++],x=p%w;
        if(x)visit(p-1);
        if(x+1<w)visit(p+1);
        if(p>=w)visit(p-w);
        if(p+w<alpha.length)visit(p+w);
      }
    }
    ctx.putImageData(pixels,0,0);
    return {matte,authoredAlpha};
  }

  async function rows(table,filter) {
    const cfg=window.StudioTransferConfig;
    const r=await fetch(cfg.url+'/rest/v1/'+table+'?'+new URLSearchParams(filter),{
      headers:{apikey:cfg.key,Authorization:'Bearer '+cfg.key},cache:'no-store'});
    if(!r.ok)throw Error('Storefront artwork could not be read.');
    return r.json();
  }
  async function load(id) {
    const [store]=await rows('valhalla_stores',{select:'store_id,display_name,storefront_key',store_id:'eq.'+id,is_active:'eq.true',limit:1});
    if(!store?.storefront_key||store.store_id!==id)throw Error('This store has no released storefront.');
    const [a]=await rows('valhalla_assets',{select:'asset_key,bucket,image_path,img_w,img_h,expected_sha256,upload_verified',asset_key:'eq.'+store.storefront_key,limit:1});
    if(!a?.upload_verified||a.asset_key!==store.storefront_key||!a.bucket||!a.image_path||
       Number(a.img_w)!==941||Number(a.img_h)!==1672||!/^[0-9a-f]{64}$/i.test(a.expected_sha256))
      throw Error('The released storefront photograph could not be verified.');
    const path=[a.bucket,...a.image_path.split('/')];
    if(path.some(part=>!part||part==='.'||part==='..'))throw Error('Invalid storefront photograph path.');
    const r=await fetch(window.StudioTransferConfig.url+'/storage/v1/object/public/'+path.map(encodeURIComponent).join('/'));
    if(!r.ok)throw Error('The storefront photograph could not load.');
    const blob=await r.blob();
    const digest=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer());
    const hex=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
    if(hex!==a.expected_sha256.toLowerCase())throw Error('The storefront photograph has changed.');
    const picture=await createImageBitmap(blob);
    if(picture.width!==Number(a.img_w)||picture.height!==Number(a.img_h)){picture.close();throw Error('Unexpected storefront dimensions.');}
    try { return {picture,name:store.display_name,...skyFromPhoto(picture)}; }
    catch(e){picture.close();throw e;}
  }
  function open(id) {
    if(cache.has(id))return cache.get(id);
    if(cache.size>=2)cache.delete(cache.keys().next().value);
    const entry=load(id).catch(e=>{if(cache.get(id)===entry)cache.delete(id);throw e;});
    cache.set(id,entry);return entry;
  }
  window.ValhallaPhotoSky=Object.freeze({open,skyFromPhoto});
})();
