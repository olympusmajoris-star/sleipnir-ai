/* Food photos are edited in memory. Apply sends a separate transparent PNG to the selected entry. */
(function (root) {
  'use strict';
  const make=(tag,label)=>{const e=document.createElement(tag);if(label!=null)e.textContent=label;return e;};
  const btn=(label,click)=>{const b=make('button',label);b.type='button';b.onclick=click;return b;};
  function removeEdges(original,width,height,color,tolerance){
    const result=new Uint8ClampedArray(original),count=width*height,seen=new Uint8Array(count),queue=new Uint32Array(count);
    let head=0,tail=0;
    function offer(p){
      if(seen[p])return;seen[p]=1;
      const i=p*4,d=Math.max(Math.abs(original[i]-color[0]),Math.abs(original[i+1]-color[1]),Math.abs(original[i+2]-color[2]));
      if(original[i+3]!==0&&d>tolerance)return;
      result[i+3]=0;queue[tail++]=p;
    }
    for(let x=0;x<width;x++){offer(x);offer((height-1)*width+x);}
    for(let y=1;y<height-1;y++){offer(y*width);offer((y+1)*width-1);}
    while(head<tail){
      const p=queue[head++],x=p%width;if(x>0)offer(p-1);if(x+1<width)offer(p+1);if(p>=width)offer(p-width);if(p+width<count)offer(p+width);
    }
    return result;
  }
  function edit({url,name='Food photo',onApply,background='#483228'}={}){
    if(typeof onApply!=='function')return Promise.reject(Error('An editable menu entry is required.'));
    return new Promise((resolve)=>{
      const modal=make('dialog');modal.className='menu-cutout';modal.setAttribute('aria-label','Remove photo background');
      const title=make('h2','Remove background'),subtitle=make('p',name),preview=make('div'),canvas=make('canvas');
      preview.className='mc-preview';preview.append(canvas);canvas.setAttribute('aria-label','Food photo on the preview background');
      const controls=make('div'),tools=make('div'),foot=make('footer'),status=make('p');
      controls.className='mc-controls';tools.className='mc-tools';status.setAttribute('role','status');
      const range=(label,min,max,value)=>{const l=make('label',label),i=make('input'),o=make('output',value);i.type='range';i.min=min;i.max=max;i.value=value;i.setAttribute('aria-label',label);l.append(i,o);controls.append(l);return [i,o];};
      const [tol,tolV]=range('Background tolerance',0,130,32),[size,sizeV]=range('Brush size',1,160,24);
      const light=make('input');light.type='color';light.value=/^#[a-f0-9]{6}$/i.test(background)?background:'#483228';const bgLabel=make('label','Preview background');bgLabel.append(light);controls.append(bgLabel);
      const surface=make('select'),surfaceLabel=make('label','Preview surface');
      surface.setAttribute('aria-label','Preview surface');
      surface.append(new Option('Dark menu leather','leather'),new Option('Solid color','solid'));
      surfaceLabel.append(surface);controls.append(surfaceLabel);
      // The swatch samples the photographed right-hand leather edge (933,376)-(940,408)
      // of the existing native book's 1122 × 1402 menu-pages/menu-page-right.png.png.
      function paintSurface(){preview.dataset.surface=surface.value;preview.style.backgroundColor=light.value;}
      surface.onchange=paintSurface;light.oninput=()=>{surface.value='solid';paintSurface();};paintSurface();
      const file=make('input'),fileLabel=make('label','Open original photo from device');file.type='file';file.accept='image/png,image/jpeg,image/webp,image/avif';fileLabel.append(file);
      const ctx=canvas.getContext('2d',{willReadFrequently:true});
      let original,processed,baseImage,sourceCanvas,maskCanvas,active,strokes=[],future=[],working=false,closed=false,loadId=0,method='sample',auto=true,target=[255,255,255],priorURL=null;
      const methods=new Map();
      function tool(name){method=name;for(const [k,b] of methods)b.setAttribute('aria-pressed',String(k===method));canvas.style.cursor=method==='sample'?'crosshair':'cell';}
      for(const [id,label] of [['sample','Pick background color'],['erase','Erase'],['restore','Restore food']]){
        const b=btn(label,()=>tool(id));methods.set(id,b);tools.append(b);
      }
      function paint(stroke){
        const mask=maskCanvas.getContext('2d');
        mask.clearRect(0,0,canvas.width,canvas.height);mask.fillStyle='#fff';mask.strokeStyle='#fff';mask.lineWidth=stroke.size;mask.lineJoin='round';mask.lineCap='round';
        const [p,...rest]=stroke.points;
        mask.beginPath();mask.arc(p.x,p.y,stroke.size/2,0,Math.PI*2);mask.fill();
        if(rest.length){mask.beginPath();mask.moveTo(p.x,p.y);for(const q of rest)mask.lineTo(q.x,q.y);mask.stroke();}
        ctx.globalCompositeOperation='destination-out';ctx.drawImage(maskCanvas,0,0);ctx.globalCompositeOperation='source-over';
        if(stroke.method==='restore'){
          mask.globalCompositeOperation='source-in';mask.drawImage(sourceCanvas,0,0);mask.globalCompositeOperation='source-over';ctx.drawImage(maskCanvas,0,0);
        }
      }
      function draw(){
        if(!baseImage)return;ctx.putImageData(baseImage,0,0);for(const s of strokes)paint(s);
        if(active)paint(active);undo.disabled=!strokes.length;redo.disabled=!future.length;
      }
      function compute(){
        if(!original)return;
        processed=auto?removeEdges(original,canvas.width,canvas.height,target,Number(tol.value)):new Uint8ClampedArray(original);
        baseImage=new ImageData(processed,canvas.width,canvas.height);draw();
      }
      tol.oninput=()=>{tolV.value=tol.value;compute();};size.oninput=()=>{sizeV.value=size.value;};
      const undo=btn('Undo brush',()=>{if(strokes.length)future.push(strokes.pop());draw();}),redo=btn('Redo brush',()=>{if(future.length)strokes.push(future.pop());draw();});
      const edge=make('input'),edgeLabel=make('label','Remove edge background');edge.type='checkbox';edge.checked=true;edge.onchange=()=>{auto=edge.checked;compute();};edgeLabel.prepend(edge);controls.prepend(edgeLabel);
      tools.append(undo,redo);
      function point(e){const r=canvas.getBoundingClientRect();return {x:Math.max(0,Math.min(canvas.width-1,(e.clientX-r.left)*canvas.width/r.width)),y:Math.max(0,Math.min(canvas.height-1,(e.clientY-r.top)*canvas.height/r.height))};}
      canvas.onpointerdown=e=>{if(!original||working)return;const p=point(e);if(method==='sample'){
        const i=(Math.floor(p.y)*canvas.width+Math.floor(p.x))*4;target=Array.from(original.slice(i,i+3));auto=edge.checked=true;compute();status.textContent='Background color sampled. Adjust tolerance or touch up with the brushes.';return;}
        canvas.setPointerCapture(e.pointerId);active={method,size:Number(size.value),points:[p]};draw();};
      canvas.onpointermove=e=>{if(active){active.points.push(point(e));draw();}};
      canvas.onpointerup=canvas.onpointercancel=()=>{if(active){strokes.push(active);active=null;future=[];draw();}};
      function finish(result){if(closed)return;closed=true;loadId++;if(priorURL)URL.revokeObjectURL(priorURL);modal.close();modal.remove();resolve(result);}
      const cancel=btn('Cancel',()=>finish(null)),apply=btn('Use transparent photo',async()=>{
        if(!original||working)return;working=true;apply.disabled=true;cancel.disabled=true;file.disabled=true;
        try{const blob=await new Promise(res=>canvas.toBlob(res,'image/png'));if(!blob)throw Error('The PNG could not be created.');
          const png=new File([blob],(name.replace(/[^\p{L}\p{N}._-]+/gu,'-').slice(0,80)||'food')+'-cutout.png',{type:'image/png'});
          await onApply(png);finish(png);
        }catch(e){status.textContent=e.message||'The photo could not be attached. Your cutout is still here.';}
        finally{working=false;apply.disabled=false;cancel.disabled=false;file.disabled=false;}
      });
      async function open(src){
        const seq=++loadId;original=null;apply.disabled=true;strokes=[];future=[];active=null;status.textContent='Loading photo…';
        try{
          const img=new Image();img.crossOrigin='anonymous';img.src=src;await img.decode();if(seq!==loadId||closed)return;
          const scale=Math.min(1,2400/Math.max(img.naturalWidth,img.naturalHeight));canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
          sourceCanvas=make('canvas');maskCanvas=make('canvas');for(const c of [sourceCanvas,maskCanvas]){c.width=canvas.width;c.height=canvas.height;}
          const sc=sourceCanvas.getContext('2d',{willReadFrequently:true});sc.drawImage(img,0,0,canvas.width,canvas.height);
          original=sc.getImageData(0,0,canvas.width,canvas.height).data;target=[255,255,255];auto=edge.checked=true;compute();tool('sample');apply.disabled=false;
          status.textContent='PNG size '+canvas.width+' × '+canvas.height+'. Pick the background or restore any food removed.';
        }catch{if(seq===loadId&&!closed){canvas.width=canvas.height=1;status.textContent='This image could not be opened for editing. Choose its original photo from your device.';}}
      }
      file.onchange=()=>{if(file.files[0]){if(priorURL)URL.revokeObjectURL(priorURL);priorURL=URL.createObjectURL(file.files[0]);open(priorURL);}};
      modal.oncancel=e=>{e.preventDefault();if(!working)finish(null);};
      foot.append(cancel,apply);apply.disabled=undo.disabled=redo.disabled=true;modal.append(title,subtitle,preview,controls,tools,fileLabel,status,foot);
      document.body.append(modal);modal.showModal();if(url)open(url);else status.textContent='Choose the original food photo from your device.';
    });
  }
  root.MenuPhotoCutout={edit,removeEdges};
})(typeof window==='undefined'?globalThis:window);
