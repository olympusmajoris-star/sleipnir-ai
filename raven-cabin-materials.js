/* Material masks for the original 1926×817 Raven cabin artwork.
   Geometry restricts each mask to a physical surface; source pixels refine it.
   Colors are applied by the camera shader, so edits do not alter the source. */
(function (G) {
  'use strict';
  const SOURCE_WIDTH=1926,SOURCE_HEIGHT=817;
  const clamp=(n,a=0,b=1)=>Math.min(b,Math.max(a,n));
  const smooth=(a,b,n)=>{const t=clamp((n-a)/(b-a));return t*t*(3-2*t);};
  const leather=[
    // Left lower dashboard, inset from the air vent and door trim.
    [[0,512],[36,497],[39,531],[42,574],[72,590],[67,632],[60,676],[60,716],[0,746]],
    // Upholstery down the left side of the center console.
    [[422,616],[460,628],[495,655],[523,670],[508,687],[501,744],[491,817],[438,817],[438,734],[419,699]],
    // Passenger lower dashboard; the upper edge is below the chrome screen rim.
    [[788,637],[878,623],[1042,614],[1177,602],[1214,604],[1221,633],[1204,727],[1163,727],[1069,718],[974,718],[905,741],[837,779],[796,813],[784,813],[786,731],[778,687],[764,674]],
    // Upholstered center armrest in the foreground.
    [[539,771],[571,754],[630,755],[691,765],[726,783],[741,817],[524,817],[529,792]],
    // Passenger door upholstery, including its padded armrest.
    [[1214,493],[1291,510],[1451,539],[1619,565],[1841,590],[1853,631],[1842,693],[1810,736],[1744,777],[1650,813],[1538,815],[1473,778],[1449,743],[1427,723],[1385,709],[1357,691],[1330,666],[1288,648],[1244,649],[1238,615]],
    // The visible edge of the passenger seat.
    [[1902,680],[1926,649],[1926,817],[1828,817],[1846,790],[1882,714]]
  ];
  const wheel={cx:246,cy:556,rx:178,ry:176,innerCX:246,innerCY:554,innerRX:147,innerRY:142};
  const wheelTrim=[
    [[98,542],[111,534],[184,532],[197,539],[198,590],[109,594],[98,584]],
    [[312,533],[382,535],[400,545],[402,580],[391,592],[312,594]]
  ];
  const protectedTrim=[
    // The entire door control/handle assembly, including its warm chrome.
    [[1296,509],[1412,526],[1561,550],[1630,560],[1638,587],[1624,613],[1590,629],[1494,617],[1360,589],[1308,568]],
    // Passenger door speaker and window-switch assembly.
    [[1240,650],[1263,647],[1300,671],[1340,753],[1325,768],[1263,748],[1234,697]],
    [[1312,631],[1383,619],[1462,634],[1492,650],[1464,668],[1381,656]],
    // The lower console's polished border is outside the wood mask.
    [[743,675],[764,676],[777,706],[773,758],[749,764],[746,741]],
    // Glovebox latch and left dashboard vent/bright surround.
    [[881,648],[990,646],[992,660],[881,666]],
    [[31,491],[133,491],[137,580],[40,586]]
  ];
  const wood=[[[534,676],[735,676],[746,687],[748,710],[739,739],[700,736],[677,731],[650,728],[614,727],[582,730],[553,734],[527,744],[523,719],[527,692]]];
  const woodTrim=[[[585,725],[674,725],[686,738],[680,746],[578,747]]];
  // The instrument glow is deliberately absent. These are the actual ambient
  // strip centerlines, measured in source pixels, with no bridge over the wheel.
  const led=[
    [[0,485],[20,478],[40,471],[60,465],[80,460],[99,458]],
    [[442,456],[500,456],[700,456],[900,456],[1000,456],[1100,458],[1150,460],[1190,463],[1220,468],[1250,471],[1300,478],[1350,484],[1400,490],[1450,497],[1500,505],[1550,512],[1600,520],[1650,529],[1700,538],[1750,546],[1800,555],[1850,565],[1873,570]]
  ];

  function inside(x,y,polygon){let hit=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
  const any=(x,y,polygons)=>polygons.some(p=>inside(x,y,p));
  function inWheel(x,y){return ((x-wheel.cx)/wheel.rx)**2+((y-wheel.cy)/wheel.ry)**2<=1&&((x-wheel.innerCX)/wheel.innerRX)**2+((y-wheel.innerCY)/wheel.innerRY)**2>=1&&!any(x,y,wheelTrim);}
  function distanceToLine(x,y,line){let result=Infinity;for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i],dx=b[0]-a[0],dy=b[1]-a[1],t=clamp(((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy));result=Math.min(result,Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy));}return result;}
  // This pure counterpart is useful for source-pixel checks without a GPU.
  function coverageAt(x,y){
    const l=inWheel(x,y)||(any(x,y,leather)&&!any(x,y,protectedTrim)),w=any(x,y,wood)&&!any(x,y,woodTrim);
    const distance=Math.min(...led.map(line=>distanceToLine(x,y,line)));
    return [l?255:0,w?255:0,distance<=1.5?255:distance<=7?127:0];
  }
  function classifyPixel(rgb,coverage){
    const [r,g,b]=rgb,max=Math.max(r,g,b),min=Math.min(r,g,b),saturation=max?(max-min)/max:0;
    const warm=smooth(-2,8,r-b)*smooth(-3,5,g-b);
    const leatherStrength=coverage[0]/255*warm*smooth(28,76,max)*(1-smooth(.42,.7,saturation));
    // Grain stays in the mask even in dark grooves. The shader retains its
    // luminance; bright metal has already been excluded by the physical region.
    const woodStrength=coverage[1]/255*(1-smooth(105,165,max))*(1-smooth(.38,.65,saturation));
    const ledOuter=clamp(coverage[2]/127),ledCore=clamp((coverage[2]-127)/128);
    const cyan=smooth(7,32,Math.min(g,b)-r)*smooth(35,90,Math.max(g,b));
    const whiteCore=ledCore*smooth(170,230,min);
    return [clamp(leatherStrength),clamp(woodStrength),clamp(ledOuter*Math.max(cyan,whiteCore))];
  }
  function sample(x,y,rgb){return classifyPixel(rgb,coverageAt(x,y));}
  function parseColor(value){
    if(typeof value!=='string')return null;const match=/^#([\da-f]{3}|[\da-f]{6})$/i.exec(value.trim());if(!match)return null;
    const hex=match[1].length===3?[...match[1]].map(c=>c+c).join(''):match[1];return [0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255);
  }
  function polygon(ctx,points){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}
  function paintRegions(ctx,width,height){
    ctx.save();ctx.scale(width/SOURCE_WIDTH,height/SOURCE_HEIGHT);
    ctx.fillStyle='#ff0000';leather.forEach(p=>polygon(ctx,p));
    ctx.globalCompositeOperation='destination-out';protectedTrim.forEach(p=>polygon(ctx,p));ctx.globalCompositeOperation='source-over';
    ctx.beginPath();ctx.ellipse(wheel.cx,wheel.cy,wheel.rx,wheel.ry,0,0,Math.PI*2);ctx.ellipse(wheel.innerCX,wheel.innerCY,wheel.innerRX,wheel.innerRY,0,0,Math.PI*2);ctx.fill('evenodd');
    ctx.globalCompositeOperation='destination-out';wheelTrim.forEach(p=>polygon(ctx,p));ctx.globalCompositeOperation='source-over';
    ctx.fillStyle='#00ff00';wood.forEach(p=>polygon(ctx,p));ctx.globalCompositeOperation='destination-out';woodTrim.forEach(p=>polygon(ctx,p));ctx.globalCompositeOperation='source-over';
    ctx.lineCap='round';ctx.lineJoin='round';
    for(const [color,width] of [['#00007f',14],['#0000ff',3]]){ctx.strokeStyle=color;ctx.lineWidth=width;for(const line of led){ctx.beginPath();line.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();}}
    ctx.restore();
  }
  function makeMask(image,geometry){
    const D=image.ownerDocument||G.document;if(!D)throw Error('A document is required for cabin material masks.');
    const width=Math.round(geometry.width),height=Math.round(geometry.height);
    if(!(width>0&&height>0&&width*height<=10000000))throw Error('Invalid cabin material dimensions.');
    const source=D.createElement('canvas'),mask=D.createElement('canvas');source.width=mask.width=width;source.height=mask.height=height;
    const sourceContext=source.getContext('2d',{willReadFrequently:true}),maskContext=mask.getContext('2d',{willReadFrequently:true});
    if(!sourceContext||!maskContext)throw Error('Canvas color controls are unavailable.');
    sourceContext.drawImage(image,0,0,width,height);const pixels=sourceContext.getImageData(0,0,width,height).data;
    paintRegions(maskContext,width,height);const hints=maskContext.getImageData(0,0,width,height),out=maskContext.createImageData(width,height),result=out.data;
    for(let i=0;i<result.length;i+=4){
      if(hints.data[i]||hints.data[i+1]||hints.data[i+2]){
        const alpha=hints.data[i+3]/255,coverage=[hints.data[i]*alpha,hints.data[i+1]*alpha,hints.data[i+2]*alpha],weights=classifyPixel([pixels[i],pixels[i+1],pixels[i+2]],coverage);
        result[i]=Math.round(weights[0]*255);result[i+1]=Math.round(weights[1]*255);result[i+2]=Math.round(weights[2]*255);
      }
      result[i+3]=255;
    }
    maskContext.putImageData(out,0,0);source.width=source.height=1;return mask;
  }
  G.RavenCabinMaterials={makeMask,parseColor,classifyPixel,coverageAt,sample,sourceSize:[SOURCE_WIDTH,SOURCE_HEIGHT]};
})(window);
