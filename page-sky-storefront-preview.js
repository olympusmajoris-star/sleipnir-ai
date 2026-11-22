/* Read-only preview of a wired property's released artwork while the street phone loads. */
(() => {
  'use strict';
  const W=941,H=1672,defaultCurb=1475/H;
  const bounded=(n,f,lo,hi)=>Number.isFinite(n)?Math.min(hi,Math.max(lo,n)):f;
  function originURL(url) {
    try{
      const root=StudioTransferConfig.url, file=new URL(url,root);
      return file.origin===new URL(root).origin && file.pathname.startsWith('/storage/v1/object/public/') ? file.href : '';
    }catch{return '';}
  }
  function publicURL(bucket,path){
    return originURL('/storage/v1/object/public/'+[bucket,...path.split('/')].map(encodeURIComponent).join('/'));
  }
  async function imageURI(uri){
    const image=new Image();image.crossOrigin='anonymous';image.src=uri;await image.decode();return image;
  }
  function viewport(width,height) {
    const top=50,available=Math.max(0,height-50-106);
    const w=Math.min(width,available*W/H),h=w*H/W;
    return {x:(width-w)/(2*width),y:(top+(available-h)/2)/height,width:w/width,height:h/height};
  }
  async function open(row) {
    const id=row.id;
    const [art,street]=await Promise.all([ValhallaPhotoSky.open(id),
      StudioJobs.request('/rest/v1/rpc/studio_valhalla_street_published',{method:'POST',body:{},auth:false}).catch(()=>null)]);
    const facade=document.createElement('canvas');facade.width=W;facade.height=H;
    const fc=facade.getContext('2d');fc.drawImage(art.picture,0,0);
    if(!art.authoredAlpha){fc.globalCompositeOperation='destination-out';fc.drawImage(art.matte,0,0);fc.globalCompositeOperation='source-over';}
    const legacy=street?.settings||{},front=legacy.fronts?.[id]||{},images=new Map();
    function pictureAt(url,redraw) {
      if(!url)return null;
      const uri=originURL(url)||(!url.includes(':')?publicURL(url.split('/')[0],url.split('/').slice(1).join('/')):'');
      if(!uri || images.has(uri))return images.get(uri);
      images.set(uri,null);imageURI(uri).then(image=>{images.set(uri,image);redraw();}).catch(()=>{});return null;
    }
    function draw(ctx,width,height,settings,lighting,redraw,logicalWidth,logicalHeight) {
      const rect=viewport(logicalWidth||width,logicalHeight||height),w=width*rect.width,h=height*rect.height;
      const scene={...legacy.sky,...settings},day=SleipnirSkyLayers.lighting(scene,{lighting})==='day';
      const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,day?'#68aee0':'#071326');sky.addColorStop(1,day?'#dcf0fa':'#36405a');
      ctx.save();ctx.fillStyle='#0a1117';ctx.fillRect(0,0,width,height);
      ctx.translate(width*rect.x,height*rect.y);ctx.beginPath();ctx.rect(0,0,w,h);ctx.clip();ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
      const legacyBg=pictureAt(legacy.sky?.[day?'day_url':'night_url'],redraw);
      if(legacyBg){const s=Math.max(w/legacyBg.width,h/legacyBg.height);ctx.drawImage(legacyBg,(w-legacyBg.width*s)/2,(h-legacyBg.height*s)/2,legacyBg.width*s,legacyBg.height*s);}
      SleipnirSkyLayers.draw(ctx,scene,w,h,{lighting,onUpdate:redraw});
      const curb=bounded(legacy.curb_y,defaultCurb,.4,.95);
      ctx.fillStyle='#404044';ctx.fillRect(0,h*curb,w,h*(1-curb));ctx.fillStyle='#a7a29c';ctx.fillRect(0,h*curb,w,h*52/H);
      const zoom=bounded(front.scale,1,.5,2),x=(.5+bounded(front.offset_x,0,-.4,.4)-zoom*.5)*w,y=(curb+bounded(front.offset_y,0,-.4,.4)-zoom*bounded(front.source_curb_y,defaultCurb,0,1))*h;
      ctx.translate(x,y);ctx.scale(w*zoom/W,h*zoom/H);ctx.drawImage(facade,0,0);
      for(const item of front.windows||[]){
        const img=pictureAt(item.image_url,redraw);if(!img)continue;
        const xx=bounded(item.x,0,0,1)*W,yy=bounded(item.y,0,0,1)*H,bw=bounded(item.w,.15,.005,1)*W,bh=bounded(item.h,.1,.005,1)*H;
        const scale=Math.min(bw/img.width,bh/img.height);ctx.drawImage(img,xx+(bw-img.width*scale)/2,yy+(bh-img.height*scale)/2,img.width*scale,img.height*scale);
      }
      ctx.restore();return rect;
    }
    return {name:art.name||row.name,masked:true,draw};
  }
  window.ValhallaStorefrontArtwork={open};
})();
