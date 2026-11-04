import {HEROES,STAGES,SUPPORTS,ENEMIES,THUNDERTANK,pitOutline,sectionAt,clamp,seeded} from './data.js';
const W=960,H=540;
const smoothBlend=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const THUNDERCATS_EMBLEM=new Image();THUNDERCATS_EMBLEM.src='assets/thundercats-emblem.png';
function poly(c,points,fill,stroke){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}}
function line(c,x,y,x2,y2,color,width=2){c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke();}
function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
function catMark(c,x,y,r=8){if(THUNDERCATS_EMBLEM.complete&&THUNDERCATS_EMBLEM.naturalWidth)c.drawImage(THUNDERCATS_EMBLEM,x-r,y-r,r*2,r*2);else ellipse(c,x,y,r,r,'#e04736');}
function text(c,s,x,y,size=12,color='#f2e9c8',align='left'){c.font=`800 ${size+1}px "Trebuchet MS", sans-serif`;c.textAlign=align;c.lineJoin='round';c.strokeStyle='#09151cd9';c.lineWidth=size>18?4:2;c.strokeText(s,x,y);c.fillStyle=color;c.fillText(s,x,y);}
function limb(c,a,b,d,width,color,highlight){line(c,...a,...b,'#17262c',width+4);line(c,...b,...d,'#17262c',width+3);line(c,...a,...b,color,width);line(c,...b,...d,color,width-1);if(highlight)line(c,a[0]-2,a[1],b[0]-2,b[1],highlight,2);}
function hitFlash(frame){if(!frame.flash){const cv=document.createElement('canvas');cv.width=frame.canvas.width;cv.height=frame.canvas.height;const c=cv.getContext('2d');c.drawImage(frame.canvas,0,0);c.globalCompositeOperation='source-atop';c.fillStyle='#ffffffbb';c.fillRect(0,0,cv.width,cv.height);frame.flash=cv;}return frame.flash;}
// Extract connected figures, so variable-width weapon poses never bleed into a neighboring frame.
function spriteFrames(img,rows,cols){
 const cv=document.createElement('canvas');cv.width=img.width;cv.height=img.height;const c=cv.getContext('2d',{willReadFrequently:true});c.drawImage(img,0,0);const {data}=c.getImageData(0,0,cv.width,cv.height),w=cv.width,h=cv.height,seen=new Uint8Array(w*h),queue=new Uint32Array(w*h),frames=new Map();
 for(let start=0;start<w*h;start++){
  if(seen[start]||data[start*4+3]<16)continue;let count=1,head=0,minX=w,maxX=0,minY=h,maxY=0;queue[0]=start;seen[start]=1;
  while(head<count){const p=queue[head++],x=p%w,y=Math.floor(p/w);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);const adjacent=[x>0?p-1:-1,x<w-1?p+1:-1,y>0?p-w:-1,y<h-1?p+w:-1];for(const q of adjacent)if(q>=0&&!seen[q]&&data[q*4+3]>=16){seen[q]=1;queue[count++]=q;}}
  if(count<250)continue;const row=clamp(Math.floor((minY+maxY)/2/(h/rows)),0,rows-1),col=clamp(Math.floor((minX+maxX)/2/(w/cols)),0,cols-1),key=row*cols+col;if((frames.get(key)?.area||0)>count)continue;
  const out=document.createElement('canvas');out.width=maxX-minX+1;out.height=maxY-minY+1;const ctx=out.getContext('2d'),pixels=ctx.createImageData(out.width,out.height);
  let hipMass=0,hipX=0;
  for(let i=0;i<count;i++){const p=queue[i],x=p%w-minX,y=Math.floor(p/w)-minY,to=(y*out.width+x)*4;pixels.data[to]=data[p*4];pixels.data[to+1]=data[p*4+1];pixels.data[to+2]=data[p*4+2];pixels.data[to+3]=data[p*4+3];if(y>out.height*.59&&y<out.height*.72){hipMass+=data[p*4+3];hipX+=x*data[p*4+3];}}
  ctx.putImageData(pixels,0,0);frames.set(key,{canvas:out,area:count,anchor:hipMass?hipX/hipMass:out.width*.5});
 }
 return frames;
}
function treadContact(frame){
 if(frame.treadContact!==undefined)return frame.treadContact;
 const img=frame.canvas,pixels=img.getContext('2d').getImageData(0,0,img.width,img.height).data;
 // The lower tread edge is left of the red pistons and raised front claws.
 let contact=0;
 for(let y=Math.floor(img.height*.5);y<img.height;y++)for(let x=Math.floor(img.width*.08);x<img.width*.38;x++){
  const i=(y*img.width+x)*4;if(pixels[i+3]>190&&pixels[i]<100&&pixels[i+1]<110&&pixels[i+2]<130)contact=Math.max(contact,y);
 }
 frame.treadContact=contact||img.height*.88;return frame.treadContact;
}
export class Renderer {
 constructor(canvas){this.canvas=canvas;this.canvas.width=1920;this.canvas.height=1080;this.ctx=canvas.getContext('2d',{alpha:false,desynchronized:true});this.layers=new Map();this.clock=0;this.reducedMotion=false;this.makeBackground(0);this.heroAtlas=new Image();this.heroAtlas.onload=()=>this.heroFrames=spriteFrames(this.heroAtlas,4,4);this.heroAtlas.src='assets/heroes-hd.png';this.enemyAtlas=new Image();this.enemyAtlas.onload=()=>this.enemyFrames=spriteFrames(this.enemyAtlas,4,4);this.enemyAtlas.src='assets/villains-hd.png';this.supportAtlas=new Image();this.supportAtlas.onload=()=>this.supportFrames=spriteFrames(this.supportAtlas,3,3);this.supportAtlas.src='assets/supports-1985.png';this.backdrops=STAGES.map(s=>{const img=new Image();img.src=`assets/${s.theme}-hd.png`;return img;});this.animations={};this.loadAnimation('run','assets/heroes-run.png',4,8);this.loadAnimation('lionRun','assets/lion-o-run-v2.png',2,4);this.loadAnimation('combo','assets/heroes-combo.png',4,6);this.loadAnimation('actions','assets/heroes-actions.png',4,8);this.loadAnimation('enemyRun','assets/villains-run.png',4,8);this.loadAnimation('specialists','assets/enemy-specialists.png',5,6);this.loadAnimation('landmarks','assets/world-landmarks.png',5,4);this.loadAnimation('tank','assets/thundertank-1985.png',2,2);for(const name of ['slythe','monkian','jackalman','mummra'])this.loadAnimation('boss-'+name,'assets/boss-'+name+'-1985.png',3,4);this.groundTiles=new Map();this.emblem=THUNDERCATS_EMBLEM;}
 loadAnimation(name,file,rows,cols){const image=new Image();const bank={image,frames:new Map(),rows,cols,ready:false};this.animations[name]=bank;image.onload=()=>{bank.frames=spriteFrames(image,rows,cols);bank.ready=bank.frames.size===rows*cols;};image.src=file;return bank;}
 resize(){const ratio=clamp((this.canvas.clientWidth||960)*(globalThis.devicePixelRatio||1)/960,1,2),width=Math.round(960*ratio),height=Math.round(540*ratio);if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height;}this.resolutionScale=width/960;}
 groundTexture(stage,section){
  const key=stage.theme+':'+section.ground;if(this.groundTiles.has(key))return this.groundTiles.get(key);
  const tile=document.createElement('canvas');tile.width=1024;tile.height=212;const c=tile.getContext('2d'),random=seeded(515+STAGES.indexOf(stage)*99),stone=['lair','ruins','pyramid'].includes(stage.theme);
  const gradient=c.createLinearGradient(0,0,0,212);gradient.addColorStop(0,section.ground);gradient.addColorStop(1,stage.theme==='pyramid'?'#303b48':stage.theme==='forest'?'#3e5140':stage.theme==='desert'?'#a17c5a':'#817d70');c.fillStyle=gradient;c.fillRect(0,0,1024,212);
  if(stone){
   const edges=[0,21,53,99,160,212],counts=[16,12,8,6,4];
   for(let row=0;row<5;row++){const y=edges[row],bottom=edges[row+1],width=1024/counts[row],offset=row%2?width*.5:0;for(let x=-width+offset;x<1024+width;x+=width){
    poly(c,[[x+7,y+1],[x+width-2,y+1],[x+width-12,bottom-1],[x-8,bottom-1]],row%2?'#ffffff09':'#00000004');
    line(c,x+7,y+1,x+width-2,y+1,'#1d2a323d',1);line(c,x+7,y+1,x-8,bottom-1,'#1d2a3238',1);line(c,x+7,y+3,x+width-4,y+3,'#f5e7bf30',1);
    if(random()<.5){const xx=x+width*.3+random()*width*.4;line(c,xx,y+6,xx-5,y+(bottom-y)*.5,'#26323b30',1);line(c,xx-5,y+(bottom-y)*.5,xx+3,bottom-6,'#26323b30',1);}
   }}
  }else{
   for(let i=0;i<70;i++){const x=random()*1024,y=random()*212;ellipse(c,x,y,9+random()*36,2+random()*7,i%3?'#222b1d10':'#f6d9a21d');if(stage.theme==='desert')line(c,x,y,x+20+random()*45,y-2,'#f6d7a12a',1);}
  }
  for(let i=0;i<100;i++){const x=random()*1024,y=random()*212;ellipse(c,x,y,1+random()*3,.6+random()*1.5,i%2?'#1b272522':'#efdba032');}
  this.groundTiles.set(key,tile);return tile;
 }
 sceneryTile(img,width,height,{fade=160,axis='x',both=false,mirrorX=false,mirrorY=false,crop=null}={}){
  if(!img?.complete||!img.naturalWidth)return null;
  // Cache the feathered art; do not allocate or mask full images every frame.
  this.sceneryTiles??=new WeakMap();let cache=this.sceneryTiles.get(img);if(!cache){cache=new Map();this.sceneryTiles.set(img,cache);}
  const key=JSON.stringify([width,height,fade,axis,both,mirrorX,mirrorY,crop]);if(cache.has(key))return cache.get(key);
  const tile=document.createElement('canvas');tile.width=width;tile.height=height;const c=tile.getContext('2d');c.save();c.translate(mirrorX?width:0,mirrorY?height:0);c.scale(mirrorX?-1:1,mirrorY?-1:1);
  if(crop)c.drawImage(img,...crop,0,0,width,height);else c.drawImage(img,0,0,width,height);c.restore();
  const extent=axis==='x'?width:height,fraction=Math.min(fade,extent*.5)/extent,mask=c.createLinearGradient(0,0,axis==='x'?width:0,axis==='y'?height:0);
  for(let i=0;i<=16;i++)mask.addColorStop(fraction*i/16,`rgba(255,255,255,${smoothBlend(i/16)})`);
  if(both)for(let i=0;i<=16;i++)mask.addColorStop(1-fraction+fraction*i/16,`rgba(255,255,255,${1-smoothBlend(i/16)})`);else mask.addColorStop(1,'#fff');
  c.globalCompositeOperation='destination-in';c.fillStyle=mask;c.fillRect(0,0,width,height);cache.set(key,tile);return tile;
 }
 tileScenery(c,img,camera,factor,width=1120){
  const overlap=160,stride=width-overlap,offset=camera*factor;
  // Each incoming tile covers its outgoing neighbor with a soft, opaque overlap.
  for(let i=Math.floor(offset/stride)-1;i<=Math.floor((offset+W)/stride);i++){
   const tile=this.sceneryTile(img,width,540,{fade:overlap,mirrorX:!!(i%2)});if(tile)c.drawImage(tile,i*stride-offset,0);
  }
 }
 ground(c,stage,camera){
  const half=320,draw=(ctx,section)=>{const tile=this.groundTexture(stage,section),offset=((camera%tile.width)+tile.width)%tile.width;ctx.drawImage(tile,-offset,0);ctx.drawImage(tile,tile.width-offset,0);};
  // Section colors blend at fixed world coordinates; cracks and paving stay put.
  let base=0;while(base+1<stage.sections.length&&stage.sections[base+1].x+half<=camera)base++;
  c.save();c.translate(0,328);draw(c,stage.sections[base]);
  for(let i=base+1;i<stage.sections.length;i++){
   const boundary=stage.sections[i].x-camera;if(boundary-half>=W)break;
   this.groundBlend??=document.createElement('canvas');const layer=this.groundBlend;if(layer.width!==W||layer.height!==212){layer.width=W;layer.height=212;}
   const ctx=layer.getContext('2d');ctx.clearRect(0,0,W,212);ctx.globalCompositeOperation='source-over';draw(ctx,stage.sections[i]);
   const mask=ctx.createLinearGradient(boundary-half,0,boundary+half,0);for(let j=0;j<=16;j++)mask.addColorStop(j/16,`rgba(255,255,255,${smoothBlend(j/16)})`);
   ctx.globalCompositeOperation='destination-in';ctx.fillStyle=mask;ctx.fillRect(0,0,W,212);ctx.globalCompositeOperation='source-over';c.drawImage(layer,0,0);
  }
  c.restore();
 }
 sectionTint(c,stage,camera){
  const tint=c.createLinearGradient(0,0,W,0),rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
  for(let x=0;x<=W;x+=60){
   const worldX=camera+x;let from=0,to=0,mix=0;
   for(let i=1;i<stage.sections.length;i++){const boundary=stage.sections[i].x;if(worldX>=boundary+320){from=to=i;continue;}if(worldX>boundary-320){to=i;mix=smoothBlend((worldX-boundary+320)/640);}break;}
   const a=rgb(stage.sections[from].tint),b=rgb(stage.sections[to].tint),color=a.map((n,i)=>Math.round(n+(b[i]-n)*mix)),opacity=.035+(from+(to-from)*mix)*.035;
   tint.addColorStop(x/W,`rgba(${color.join(',')},${opacity})`);
  }
  c.fillStyle=tint;c.fillRect(0,0,W,338);
 }
 drawLandmark(c,theme,prop,camera){
  const bank=this.animations.landmarks;if(!bank?.ready)return;const row=['lair','forest','ruins','desert','pyramid'].indexOf(theme),frame=bank.frames.get(row*4+prop.col);if(!frame)return;
  const img=frame.canvas,scale=prop.height/img.height,x=prop.x-camera;
  if(x< -img.width*scale||x>W+img.width*scale)return;
  c.drawImage(img,x-img.width*scale*.5,prop.y-img.height*scale,img.width*scale,img.height*scale);
 }
 world(c,index,camera,time,game){
  const stage=STAGES[index],section=sectionAt(stage,camera+350);
  this.worldFrame={camera,groundOffset:-camera,landmarkOffset:-camera,backdropOffset:-camera*.42,section:section.name};
  const gradient=c.createLinearGradient(0,0,0,338);gradient.addColorStop(0,stage.sky[0]);gradient.addColorStop(1,stage.sky[1]);c.fillStyle=gradient;c.fillRect(0,0,960,338);
  c.save();c.beginPath();c.rect(0,0,960,338);c.clip();
  if(stage.theme==='lair'){
   this.tileScenery(c,this.backdrops[1],camera,.24);
   const lair=this.sceneryTile(this.backdrops[index],1080,540,{fade:200,both:true});if(lair)c.drawImage(lair,20-camera*.42,0);
  }else this.tileScenery(c,this.backdrops[index],camera,.42);
  this.sectionTint(c,stage,camera);c.restore();
  this.ground(c,stage,camera);
  line(c,0,329,960,329,stage.theme==='pyramid'?'#9c9d7b':'#d3c69a',2);
  if(game)for(const prop of game.scenery)this.drawLandmark(c,stage.theme,prop,camera);
  else for(let i=0;i<3;i++)this.drawLandmark(c,stage.theme,{x:180+i*560,y:335,col:section.decor[i%section.decor.length],height:190+i%2*30},camera%600);
 }
 makeBackground(stageIndex){
  if(this.layers.has(stageIndex))return this.layers.get(stageIndex);
  const stage=STAGES[stageIndex],r=seeded(902+stageIndex),layers=[];
  for(let layer=0;layer<4;layer++){
   const cv=document.createElement('canvas');cv.width=1600;cv.height=540;const c=cv.getContext('2d');
   if(layer===0){
    const grad=c.createLinearGradient(0,0,0,480);grad.addColorStop(0,stage.sky[0]);grad.addColorStop(1,stage.sky[1]);c.fillStyle=grad;c.fillRect(0,0,1600,540);
    if(stage.theme==='desert'){ellipse(c,1170,138,61,61,'#f8d89c');ellipse(c,1170,138,72,72,'#f8d89c15');}else{ellipse(c,1080,110,38,38,stage.theme==='pyramid'?'#b3d4c4':'#cfddba');ellipse(c,1090,99,34,33,stage.sky[0]);}
    for(let i=0;i<150;i++){const x=r()*1600,y=r()*230;if(stage.theme==='pyramid'){c.fillStyle=i%4?'#c8dbd866':'#d2e6cf';c.fillRect(x,y,2,2);}else{const color=stage.theme==='desert'?'#e4c4b236':'#b5cebc19';ellipse(c,x,y,35+r()*110,5+r()*14,color);}}
    for(let i=0;i<20;i++){const x=i*110;poly(c,[[x-120,350],[x+60,120+r()*130],[x+190,350]],stage.theme==='desert'?'#8f737a':stage.theme==='pyramid'?'#303449':'#39646b');}
    if(stage.theme==='pyramid'){poly(c,[[520,356],[870,80],[1200,356]],'#25323b');poly(c,[[870,80],[1200,356],[970,356]],'#1c2833');for(let j=0;j<18;j++)line(c,640-j*8,180+j*10,985+j*8,180+j*10,'#41616c22',2);}
   }
   if(layer===1){
    if(stage.theme==='forest'){
     for(let i=0;i<18;i++){const x=i*100+r()*50;poly(c,[[x-35,390],[x-20,80],[x+10,10],[x+18,80],[x+45,390]],'#285859');for(let k=0;k<8;k++)ellipse(c,x-80+r()*160,70+r()*140,40+r()*70,18+r()*30,'#356a62');}
     poly(c,[[680,150],[716,148],[704,363],[663,363]],'#9cc9b099');for(let j=0;j<5;j++)line(c,685+j*5,170,668+j*6,361,'#d4ead175',2);
    }else if(stage.theme==='ruins'){
     for(let i=0;i<11;i++){const x=i*160;poly(c,[[x,365],[x,140+r()*50],[x+70,138],[x+90,365]],'#5b7270');c.fillStyle='#394f59';c.fillRect(x+22,200,26,165);poly(c,[[x-10,145],[x+30,108],[x+82,145]],'#7f9180');}
    }else if(stage.theme==='desert'){for(let i=0;i<8;i++)poly(c,[[i*260-150,390],[i*260+80,260+r()*80],[i*260+360,390]],i%2?'#ae877c':'#c7997b');}
    else{for(let i=0;i<12;i++){const x=i*150;poly(c,[[x,375],[x+10,220],[x+55,190],[x+100,375]],'#374753');line(c,x+37,245,x+47,357,'#556477',4);}}
   }
   if(layer===2){
    if(stage.theme==='lair'){
     // A recognizable feline fortress remains visible while its HD backdrop loads.
     poly(c,[[300,340],[340,250],[470,250],[520,340]],'#9baeb2','#334b5e');poly(c,[[950,340],[1000,250],[1130,250],[1180,340]],'#9baeb2','#334b5e');
     poly(c,[[450,305],[570,250],[990,250],[1100,305],[1080,340],[480,340]],'#a6babe','#334b5e');
     poly(c,[[625,250],[635,192],[610,145],[622,58],[680,99],[750,80],[820,99],[880,58],[892,145],[866,192],[875,250]],'#b3c5c6','#334b5e');
     poly(c,[[649,150],[697,157],[680,169],[653,165]],'#e8d47a','#334b5e');poly(c,[[804,157],[855,150],[851,165],[821,169]],'#e8d47a','#334b5e');
     poly(c,[[683,188],[750,170],[816,188],[828,225],[750,245],[672,225]],'#324c5c','#334b5e');
     poly(c,[[689,190],[708,194],[699,225]],'#edf0da');poly(c,[[791,194],[812,190],[802,225]],'#edf0da');
     poly(c,[[711,244],[790,244],[875,340],[627,340]],'#d3c9ac','#334b5e');
     for(let j=0;j<6;j++)line(c,645-j*12,310+j*5,856+j*12,310+j*5,'#687f87',2);
    }else if(stage.theme==='forest'){
     for(let i=0;i<7;i++){const x=i*270+30;poly(c,[[x-80,400],[x-45,355],[x-28,235],[x-45,80],[x-30,-10],[x+20,-10],[x+20,130],[x+10,280],[x+45,370],[x+90,400]],'#1b3838','#162e30');poly(c,[[x-20,0],[x-7,0],[x-3,250],[x-24,350],[x-33,351],[x-12,245]],'#375549');line(c,x+5,165,x+90,62,'#1b3838',16);line(c,x-20,130,x-100,80,'#1b3838',18);for(let j=0;j<8;j++)line(c,x-20+r()*48,100+r()*260,x-18+r()*50,130+r()*260,'#4a625035',2);}
     for(let i=0;i<140;i++){const x=r()*1600,y=r()*110;ellipse(c,x,y,20+r()*60,15+r()*25,i%3===0?'#486947':'#284b3e');ellipse(c,x-9,y-5,25,9,'#6f875336');}
     for(let i=0;i<14;i++){const x=r()*1600;line(c,x,50,x+10,210+r()*70,'#6b8153',2);for(let j=0;j<5;j++)poly(c,[[x+6,j*28+80],[x+16,j*28+65],[x+21,j*28+89]],'#72864e');}
    }else if(stage.theme==='ruins'){
     for(let i=0;i<5;i++){const x=i*360;const y=160+i%2*30;c.fillStyle='#7b8776';c.fillRect(x,y,64,215);c.fillRect(x+170,y,64,215);c.fillRect(x-12,y-20,258,32);c.fillStyle='#53675f';c.fillRect(x+12,y+15,11,195);c.fillRect(x+183,y+10,12,205);poly(c,[[x-15,y-20],[x+92,y-62],[x+246,y-20]],'#a3a58a');for(let j=0;j<12;j++){line(c,x,y+j*19,x+63,y+j*19,'#4c60594a',2);line(c,x+170,y+j*19,x+233,y+j*19,'#4c60594a',2);}for(let j=0;j<6;j++)ellipse(c,x+r()*64,y+r()*200,8,4,'#6c7d4a');}
    }else if(stage.theme==='desert'){
     for(let i=0;i<7;i++){const x=i*270+90;poly(c,[[x-27,390],[x-15,300],[x+10,288],[x+70,390]],'#987563');poly(c,[[x-8,390],[x+7,310],[x+42,390]],'#bd926d');}
     for(let i=0;i<4;i++){const x=190+i*430;line(c,x,355,x+30,175,'#6c6450',13);line(c,x+5,350,x+34,182,'#bc9b64',5);for(let j=0;j<9;j++){const a=j*.65;const ex=x+25+Math.cos(a)*95,ey=180+Math.sin(a)*40;poly(c,[[x+28,174],[ex,ey],[ex-14,ey+8],[x+20,189]],j%2?'#627458':'#78865c');}}
    }else{
     for(let i=0;i<7;i++){const x=i*265;c.fillStyle='#29383e';c.fillRect(x,70,88,320);c.fillStyle='#46555b';c.fillRect(x+6,75,65,310);c.fillStyle='#667278';c.fillRect(x+7,78,9,305);for(let j=0;j<16;j++)line(c,x+6,84+j*19,x+70,84+j*19,'#263b43',2);poly(c,[[x-18,82],[x-18,63],[x+100,63],[x+100,82]],'#607073');poly(c,[[x-8,388],[x-15,362],[x+95,362],[x+105,388]],'#6b7579');for(let j=0;j<8;j++)poly(c,[[x+24,115+j*24],[x+40,108+j*24],[x+53,115+j*24],[x+40,125+j*24]],'#718984');}
    }
   }
   if(layer===3){
    for(let i=0;i<130;i++){const x=r()*1600,y=315+r()*24;if(['forest','ruins','lair'].includes(stage.theme)){ellipse(c,x,y,8+r()*15,4+r()*9,i%3===0?'#748b56':'#354b3e');line(c,x,y,x+8,y-12,'#8b9961',2);}else poly(c,[[x-20,y+10],[x-10,y-12],[x+5,y-17],[x+25,y+12]],stage.theme==='desert'?'#947a61':'#35464e');}
   }
   layers.push(cv);
  }
  this.layers.set(stageIndex,layers);return layers;
 }
 background(c,index,camera,time){
  const stage=STAGES[index];
  const art=this.backdrops[index];if(art.complete&&art.naturalWidth){
   const width=stage.theme==='lair'?1040:1440,offset=stage.theme==='lair'?20+camera*.015:camera*.115;
   c.drawImage(art,-offset,0,width,540);
   c.save();c.globalAlpha=.1;const r=seeded(79+index);for(let i=0;i<90;i++){const x=((r()*2000-camera)%1000+1000)%1000,y=350+r()*150;ellipse(c,x,y,1+r()*4,.5+r(),stage.theme==='pyramid'?'#91d9da':'#fff0b7');}c.restore();return;
  }
  const layers=this.makeBackground(index);const factors=[.06,.18,.42,.72];
  layers.forEach((cv,i)=>{const offset=(camera*factors[i])%1600;c.drawImage(cv,-offset,0);c.drawImage(cv,1600-offset,0);});
  if(stage.theme==='forest'){c.save();c.globalAlpha=.08;for(let i=0;i<5;i++)poly(c,[[120+i*220,0],[165+i*220,0],[450+i*220,390],[290+i*220,390]],'#f1e9b0');c.restore();}
  c.fillStyle=stage.ground;c.fillRect(0,337,960,203);
  const r=seeded(79+index);for(let i=0;i<580;i++){const x=((r()*2500-camera)%1000+1000)%1000,y=340+r()*200,w=2+r()*17;line(c,x,y,x+w,y,stage.theme==='forest'?(i%3?'#8b93603d':'#bac08a39'):stage.theme==='desert'?(i%3?'#d6ad783b':'#795f503b'):(i%3?'#b7b29c27':'#252f3b30'),2);}
  line(c,0,337,960,337,stage.theme==='forest'?'#9aab6e':'#b3aa90',4);
  if(stage.theme==='ruins'||stage.theme==='pyramid'){for(let y=346;y<540;y+=42){line(c,0,y,960,y,'#28383b55',2);const offset=(camera+(y%84?70:0))%140;for(let x=-offset;x<1000;x+=140)line(c,x,y,x-14,y+42,'#28383b55',2);}}
  if(stage.theme==='forest'){const offset=camera*.8%960;ellipse(c,800-offset,510,250,38,'#6b8e7b');for(let j=0;j<16;j++)line(c,600-offset+j*17,500+j%4*7,640-offset+j*18,500+j%4*7,'#a6c4a175',2);}
 }
 hero(c,p,time,scale=1){
  if(p.action==='pitfall'&&p.fall){this.fallingHero(c,p,scale);return;}
  if(this.heroFrames?.size===16){this.heroSprite(c,p,time,scale);return;}
  const h=HEROES[p.hero];const moving=p.action==='walk';const attack=['attack','airattack','special'].includes(p.action);const special=p.action==='special';const dead=p.hp<=0;const dodge=p.action==='dodge';const stride=moving?Math.sin(time*(p.hero===1?17:13)+p.id)*14:Math.sin(time*2)*1.2;
  ellipse(c,p.x,p.y+2,dodge?28:22,6,'#071a2355');
  if((p.pitBlink>0||(p.invuln>0&&p.invuln<2))&&Math.floor(time*16)%2===0)return;
  c.save();c.translate(Math.round(p.x),Math.round(p.y-p.z));c.scale(p.face*scale*(p.hero===1?.85:1),scale);
  if(dead){c.rotate(-Math.PI/2);c.translate(28,-5);}if(dodge){c.rotate(.9);c.translate(-12,-17);}
  if(p.veil>0)c.globalAlpha=.4;
  if(p.flash>0){c.filter='brightness(2)';}
  const bob=moving?Math.abs(Math.sin(time*13))*3:Math.sin(time*2)*1.3;c.translate(0,-bob);
  const skin=h.skin,shade=p.hero===2?'#607b91':p.hero===3?'#b9794b':'#cf956f';
  const wide=p.hero===2?4:0;
  // Back arm and the moving legs are outlined before their highlights.
  limb(c,[-10-wide,-55],[-19,-38],[-13+stride*.2,-28],9,shade);
  if(p.hero===0){poly(c,[[-23,-44],[-12,-46],[-7,-39],[-7,-25],[-13,-19],[-25,-24],[-27,-35]],'#cba159','#3b4445');for(let k=0;k<3;k++){line(c,-22+k*5,-40,-21+k*5,-28,'#f2d78a',3);poly(c,[[-23+k*5,-29],[-21+k*5,-19],[-18+k*5,-28]],'#ead6a6');}ellipse(c,-17,-35,5,5,'#a27442');}
  limb(c,[-7,-28],[-12-stride*.55,-16],[-9-stride,-2],10,h.dark,h.color);
  poly(c,[[-18-stride,-9],[-5-stride,-9],[-2-stride,0],[-21-stride,0]],h.color,'#1b2930');
  limb(c,[7,-28],[10+stride*.55,-15],[10+stride,-2],11,skin,h.skin);
  poly(c,[[3+stride,-14],[16+stride,-14],[18+stride,-4],[23+stride,0],[3+stride,0]],h.dark,'#1a292e');line(c,7+stride,-11,15+stride,-11,h.color,3);
  // Hair silhouette.
  if(p.hero!==2){poly(c,[[-19,-69],[-22,-84],[-15,-89],[-18,-99],[-5,-95],[1,-104],[9,-97],[19,-98],[17,-90],[26,-84],[20,-74],[23,-62],[13,-64],[8,-73]],h.hair,'#293137');if(p.hero===1)poly(c,[[-17,-84],[-23,-51],[-13,-54],[-17,-35],[0,-48],[8,-78]],h.hair,'#453b32');else if(p.hero===0)poly(c,[[-17,-90],[-17,-72],[-26,-68],[-17,-66],[-10,-75]],'#fb9450');}
  // Torso and shorts.
  poly(c,[[-12-wide,-62],[11+wide,-62],[16+wide,-48],[10,-29],[-11,-29],[-17-wide,-48]],p.hero===2?skin:h.color,'#182a32');poly(c,[[-12-wide,-58],[-5,-53],[-4,-32],[-11,-31],[-16-wide,-48]],p.hero===2?'#697fa2':h.dark);poly(c,[[3,-58],[10+wide,-58],[12,-45],[7,-35],[2,-35]],p.hero===2?'#b1c0d7':p.hero===1?'#ffc457':'#b1e0e6');
  if(p.hero===0){poly(c,[[-7,-62],[8,-62],[7,-53],[-6,-53]],skin);poly(c,[[-5,-40],[4,-40],[3,-35],[-4,-35]],skin);}
  if(p.hero===1){poly(c,[[-11,-62],[6,-63],[5,-54],[-4,-52],[-12,-53]],skin);for(let k=0;k<7;k++)ellipse(c,-12+(k%3)*8,-51+Math.floor(k/3)*6,2,2,'#734830');}
  if(p.hero===2){line(c,-16,-61,11,-35,h.dark,7);line(c,14,-61,-10,-35,h.dark,7);for(const side of [-1,1]){poly(c,[[side*11,-62],[side*21,-63],[side*24,-54],[side*12,-53]],h.dark);for(let k=0;k<3;k++)poly(c,[[side*(13+k*4),-61],[side*(14+k*4),-69-k%2*2],[side*(17+k*4),-60]],'#c7cddd','#31405a');}}
  if(p.hero===3){poly(c,[[-13,-61],[1,-62],[4,-52],[-4,-45],[-16,-48]],skin);for(let k=0;k<4;k++)line(c,-13,-59+k*4,-5,-57+k*4,'#644630',2);}
  poly(c,[[-12,-33],[12,-33],[13,-24],[2,-21],[-13,-25]],h.dark,'#25333b');line(c,-11,-32,12,-32,'#d1ba7c',3);
  catMark(c,p.hero===2?0:0,p.hero===2?-31:-48,p.hero===2?6:8);
  // Head and facial features.
  poly(c,[[-10,-82],[-5,-90],[8,-88],[14,-80],[10,-68],[3,-64],[-7,-69]],skin,'#28353a');poly(c,[[-10,-82],[-5,-77],[-5,-69],[-8,-71]],shade);poly(c,[[3,-88],[9,-86],[14,-80],[13,-76],[7,-78]],h.hair);
  if(p.hero===2){poly(c,[[-10,-83],[-14,-86],[-14,-77],[-7,-75]],skin);poly(c,[[7,-85],[13,-89],[15,-79],[10,-76]],skin);line(c,-3,-86,6,-87,'#d1dde0',2);}else if(p.hero===3){for(let i=0;i<3;i++)line(c,-8,-82+i*5,-3,-80+i*5,'#543a2d',2);poly(c,[[-8,-88],[-12,-94],[-2,-91]],h.hair);}
  line(c,2,-79,10,-79,'#31404a',2);c.fillStyle='#f6ecd1';c.fillRect(3,-80,7,2);c.fillStyle='#3a5963';c.fillRect(7,-80,2,3);poly(c,[[10,-78],[16,-75],[10,-74]],skin);line(c,6,-70,11,-70,'#875a4d',2);
  if(p.hero===0)poly(c,[[-12,-88],[-8,-94],[6,-96],[14,-91],[8,-87],[2,-91],[-3,-86]],'#ed673b');
  if(p.hero===1){poly(c,[[0,-83],[12,-84],[14,-77],[7,-74],[0,-77]],'#ac573c');for(let k=0;k<9;k++)ellipse(c,-19+(k%4)*8,-91+Math.floor(k/4)*7,1.5,2,'#a46b37');}
  if(p.hero===3){poly(c,[[-7,-73],[4,-74],[12,-70],[7,-65],[-3,-66]],'#eee4ce');}
  // Front arm follows the weapon through a three-hit combo.
  let elbow=[18,-43],hand=[22,-30];
  if(attack){const phase=clamp(1-p.timer/(special?.65:p.combo===2?.4:.28),0,1);elbow=[20,-58];hand=[35+Math.sin(phase*Math.PI)*16,-55+Math.sin(phase*Math.PI*1.5)*18];if(p.combo===2)hand=[35,-80+phase*72];}
  if(p.action==='guard'){elbow=[24,-59];hand=[9,-73];}
  if(p.action==='revive'){elbow=[23,-30];hand=[33,-10];}
  limb(c,[11+wide,-57],elbow,hand,9,skin,h.skin);line(c,elbow[0]+2,elbow[1]-1,hand[0],hand[1]-1,h.dark,5);ellipse(c,...hand,5,5,skin);
  c.save();c.translate(...hand);c.rotate(attack?(-1+p.timer*5):.24);
  if(p.hero===0){poly(c,[[-2,5],[-3,-9],[-6,-16],[-2,-55],[0,-64],[4,-55],[7,-16],[3,-9],[2,5]],'#cce4de','#284a59');poly(c,[[0,-60],[0,-16],[4,-17],[3,-53]],'#f7f6cf');line(c,-10,-11,11,-11,'#dfb963',4);ellipse(c,0,-10,5,4,'#e34b39');line(c,0,-8,0,4,'#9b7652',4);}
  else if(p.hero===1){line(c,0,35,0,-65,'#534232',6);line(c,-1,33,-1,-64,'#e2b56a',3);line(c,0,-55,0,-42,'#ead8a4',5);line(c,0,19,0,29,'#ead8a4',5);}
  else if(p.hero===2){line(c,0,0,3,-24,'#5c8cbe',7);line(c,2,-24,17,-34,'#c6c7a2',2);line(c,17,-34,attack?33:27,attack?-56:-12,'#d9503e',7);line(c,3,-20,3,-7,'#a1c8cd',2);}
  else{for(let i=0;i<3;i++){c.strokeStyle='#aa8d62';c.lineWidth=2;c.beginPath();c.moveTo(0,0);c.bezierCurveTo(35,-15,attack?95:42,(attack?-37:22)+i*6,(attack?112:20)+i*4,(attack?-18:30)+i*7);c.stroke();ellipse(c,(attack?112:20)+i*4,(attack?-18:30)+i*7,4,4,'#bb493e');}}
  c.restore();
  if(attack){c.save();c.globalAlpha=.5;c.strokeStyle=special?'#d9f4ad':p.hero===0?'#f3eec2':h.color;c.lineWidth=special?9:5;c.beginPath();c.ellipse(29,-53,p.hero===3?112:56,47,-.1,-1.5,1.1);c.stroke();c.globalAlpha=.9;c.lineWidth=2;c.stroke();c.restore();}
  if(special){c.strokeStyle=h.color;c.lineWidth=3;for(let i=0;i<3;i++){c.beginPath();c.ellipse(0,-35,45+i*20,18+i*12,0,time*6+i,time*6+i+3);c.stroke();}}
  c.restore();
 }
 heroSprite(c,p,time,scale=1){
  if(this.animations?.run?.ready&&this.animations?.combo?.ready&&this.animations?.actions?.ready){this.animatedHero(c,p,time,scale);return;}
  const moving=p.action==='walk',attack=['attack','airattack','special'].includes(p.action),dead=p.hp<=0,dodge=p.action==='dodge';
  ellipse(c,p.x,p.y+2,dodge?29:23,6,'#071a2355');if((p.pitBlink>0||(p.invuln>0&&p.action!=='special'&&p.invuln<2))&&Math.floor(time*16)%2===0)return;
  let frame=moving?(Math.floor(time*10)%4===0?0:1):attack?2:0;if(p.z>15||dodge)frame=3;
  if(p.action==='attack'&&p.combo===2&&p.timer>.25)frame=3;
  if(p.action==='special'&&p.hero===0)frame=3;
  c.save();c.translate(Math.round(p.x),Math.round(p.y-p.z));c.scale(p.face*scale,scale);if(attack){const anticipation=Math.sin(clamp(p.timer/.4,0,1)*Math.PI);c.scale(1+anticipation*.045,1-anticipation*.025);c.rotate((p.combo===2?-.07:.035)*anticipation);}if(dead){c.rotate(-1.45);c.translate(38,-2);}if(dodge){c.rotate(.7);c.translate(-20,-10);}if(p.veil>0)c.globalAlpha=.36;if(p.flash>0)c.filter='brightness(1.8)';
  const sz=this.heroAtlas.width/4,s=126/sz,sy=p.hero*sz;const xs=[0,1,2,3].map(v=>v*sz),widths=[1,1,1,1].map(v=>v*sz),anchor=[.5,1.5,2.5,3.5].map(v=>v*sz);const feet=(p.hero+.94)*sz;
  const sx=xs[frame],sw=Math.min(widths[frame],this.heroAtlas.width-sx),sh=sz,art=this.heroFrames?.get(p.hero*4+frame)?.canvas;
  const bob=moving?Math.abs(Math.sin(time*14))*3:Math.sin(time*2)*1;
  const draw=(offset=0,alpha=1)=>{c.save();c.globalAlpha*=alpha;if(art)c.drawImage(art,-art.width*s*(frame===2?.38:.5)+offset,-art.height*s-bob,art.width*s,art.height*s);else c.drawImage(this.heroAtlas,sx,sy,sw,sh,(sx-anchor[frame])*s+offset,(sy-feet)*s-bob,sw*s,sh*s);c.restore();};
  if(p.action==='special'&&p.hero===1)for(let i=4;i>0;i--)draw(-i*35,.1+(4-i)*.07);
  draw();
  if(attack&&p.hero!==0||p.action==='attack'&&p.hero===0){c.save();c.globalAlpha=.5;c.strokeStyle=HEROES[p.hero].color;c.lineWidth=3;c.beginPath();c.ellipse(36,-58,p.hero===3?104:59,39,0,-1.3,1.3);c.stroke();c.restore();}
  if(p.action==='guard'){c.strokeStyle=p.hero===0?'#eed390':'#b7e6e3';c.lineWidth=3;c.beginPath();c.ellipse(26,-57,17,28,.1,-1.6,1.6);c.stroke();}
  c.restore();
 }
 animatedHero(c,p,time,scale=1){
  const clock=p.animTime??time,air=p.z>1||p.vz>0,dead=p.hp<=0;
  const old=this.heroFrames.get(p.hero*4);let art=old,bank=null,frame=0;
  const choose=(name,index)=>{bank=this.animations[name];frame=index;art=bank.frames.get(p.hero*bank.cols+index);};
  if(dead)choose('actions',7);
  else if(p.action==='hurt')choose('actions',6);
  else if(p.action==='dodge')choose('actions',4);
  else if(p.action==='guard')choose('actions',5);
  else if(p.action==='airattack')choose('actions',1);
  else if(p.action==='special'){
   if(p.hero===0)choose('combo',4);
   else if(p.hero===1)choose('run',Math.floor((p.actionTime||0)*22)%8);
   else if(p.hero===2)choose('actions',5);
   else choose('combo',5);
  }else if(air)choose('actions',p.vz>25?0:2);
  else if(p.action==='land')choose('actions',3);
  else if(p.action==='attack'){
   const windup=(p.attackElapsed||0)<(p.move?.startup||.06);choose('combo',clamp(p.combo||0,0,2)*2+(windup?0:1));
  }else if(p.action==='walk'){
   const index=Math.floor((p.walkPhase??(clock*2%1))*8)%8;
   if(p.hero===0&&this.animations.lionRun?.ready){bank=this.animations.lionRun;frame=index;art=bank.frames.get(index);}else choose('run',index);
  }
  if(!art)return;
  const cell=bank?bank.image.height/bank.rows:this.heroAtlas.height/4,s=126/cell,img=p.flash>0?hitFlash(art):art.canvas,anchor=art.anchor??img.width*.5;
  const shadow=1-clamp(p.z/220,0,.45);ellipse(c,p.x,p.y+2,23*shadow,6*shadow,'#071a2349');
  if((p.pitBlink>0||(p.invuln>0&&p.action!=='special'&&p.invuln<2))&&Math.floor(clock*16)%2===0)return;
  c.save();c.translate(p.x,p.y-p.z);c.scale(p.face*scale,scale);
  const idle=p.action==='idle',breath=idle?Math.sin(clock*2.6)*.006:0,squash=(p.landSquash||0)/.13;
  c.scale(1-breath+squash*.055,1+breath-squash*.055);
  if(p.veil>0)c.globalAlpha=.4;if(p.action==='out')c.globalAlpha=.35;
  const attack=p.action==='attack',elapsed=p.attackElapsed||0,move=p.move;
  const active=attack&&move&&elapsed>=move.startup&&elapsed<move.startup+move.active;
  const phase=active?(elapsed-move.startup)/move.active:0;
  if(attack)c.translate(active?Math.sin(phase*Math.PI)*5:0,0);
  if(p.action==='hurt')c.rotate(-.06*Math.sin((p.actionTime||0)*15));
  const draw=(offset=0,opacity=1)=>{c.save();c.globalAlpha*=opacity;c.drawImage(img,-anchor*s+offset,-img.height*s,img.width*s,img.height*s);c.restore();};
  if(p.action==='dodge')for(let i=3;i>0;i--)draw(-i*13*(p.dodgeX||p.face)*p.face,.035*(4-i));
  if(p.action==='special'&&p.hero===1)for(let i=4;i>0;i--)draw(-i*30,.05*(5-i));
  draw();
  if(active){
   c.save();c.strokeStyle=p.combo===2?'#fff0ba':HEROES[p.hero].color;c.lineWidth=p.combo===2?7:4;c.globalAlpha=.7;
   c.beginPath();c.ellipse(30,-55,p.hero===3?105:60,41,p.combo===1?-.35:.15,-1.5+phase*.4,-1+phase*2.7);c.stroke();c.lineWidth=1.5;c.strokeStyle='#fffbea';c.stroke();c.restore();
  }
  if(p.action==='guard'){c.strokeStyle=p.hero===0?'#eed390':'#b7e6e3';c.lineWidth=2;c.globalAlpha=.6;c.beginPath();c.ellipse(30,-54,14,28,.1,-1.4,1.4);c.stroke();}
  c.restore();
 }
 enemy(c,e,time){
  if(e.boss&&this.animations['boss-'+e.type]?.ready){this.bossSprite(c,e,time);return;}
  if(Number.isInteger(ENEMIES[e.type]?.row)&&this.animations.specialists?.ready){this.specialist(c,e,time);return;}
  if(this.enemyFrames?.size===16){this.enemySprite(c,e,time);return;}
  const boss=e.boss,scale=boss?(e.type==='mummra'?1.55:1.45):e.type==='brute'?1.25:1;const move=e.action==='walk';const stride=move?Math.sin(time*10+e.seed)*12:0;const hurt=e.action==='hurt';
  ellipse(c,e.x,e.y+2,23*scale,6,'#081a2355');c.save();c.translate(Math.round(e.x),Math.round(e.y-e.z));c.scale(e.face*scale,scale);if(e.hp<=0){c.globalAlpha=Math.max(0,e.dead/.7);c.rotate(-1.2);c.translate(12,-8);}if(e.flash>0)c.filter='brightness(2)';
  const reptile=e.type==='mutant'||e.type==='slythe',fur=e.type==='monkian'||e.type==='jackalman';const skin=reptile?'#7e9863':e.type==='mummra'?'#8db5a8':fur?'#c5b29b':e.type==='archer'?'#ba8d6c':'#96919a';const shadow=reptile?'#456553':e.type==='mummra'?'#577e83':'#65585a';const cloth=e.type==='mummra'?'#a54a47':e.type==='archer'?'#66577a':'#805d50';
  if(e.type==='mummra'){poly(c,[[-19,-79],[-44,-16],[-29,-25],[-18,-8],[-9,-19],[8,-5],[27,-17],[40,-11],[24,-74]],'#6b3b49','#202b38');poly(c,[[-19,-79],[-28,-20],[-14,-32],[-7,-65]],'#b45955');}
  if(reptile)poly(c,[[-10,-30],[-37,-13],[-48,-18],[-34,-22],[-18,-45]],shadow,'#253e3d');
  limb(c,[-9,-30],[-12-stride*.5,-16],[-10-stride,-1],11,shadow);limb(c,[9,-30],[13+stride*.5,-16],[13+stride,-2],12,skin);line(c,-17-stride,-1,-3-stride,-1,'#4c4646',8);line(c,7+stride,-1,23+stride,-1,'#493f42',8);
  limb(c,[-14,-58],[-23,-42],[-21,-26],10,shadow);
  poly(c,[[-16,-61],[12,-63],[21,-48],[13,-29],[-13,-29],[-22,-46]],skin,'#223339');poly(c,[[-20,-49],[0,-53],[18,-46],[12,-29],[-13,-29]],cloth);line(c,-12,-32,13,-32,'#c3a57c',4);poly(c,[[-16,-59],[-8,-66],[-2,-53],[-9,-40]],'#514b4c');ellipse(c,4,-44,5,5,'#bca56c');
  if(fur){poly(c,[[-18,-78],[-19,-91],[-6,-88],[0,-94],[9,-88],[18,-91],[15,-78],[23,-72],[12,-65],[-9,-65]],e.type==='monkian'?'#e1d7bd':'#bc8e55','#393b3c');}
  poly(c,[[-11,-84],[3,-91],[13,-83],[16,-73],[9,-63],[-7,-68],[-14,-75]],skin,'#25353b');poly(c,[[7,-77],[22,-75],[23,-69],[10,-66]],skin,'#25353b');line(c,4,-80,12,-79,'#2d3638',3);c.fillStyle='#eeb772';c.fillRect(7,-80,4,2);line(c,12,-70,21,-70,'#2c3535',2);c.fillStyle='#e7dcc1';c.fillRect(16,-71,3,3);
  if(reptile){for(let i=0;i<4;i++)poly(c,[[-11-i,-83+i*6],[-23,-84+i*7],[-14,-75+i*5]],'#b4ad77');poly(c,[[-7,-87],[0,-96],[7,-87]],'#a5ad75');}
  if(e.type==='mummra'){poly(c,[[-15,-84],[-16,-99],[-4,-93],[0,-104],[8,-94],[19,-99],[16,-80],[8,-85],[-4,-84]],'#d4b16d','#343b43');ellipse(c,5,-92,3,4,'#d45049');line(c,-7,-73,6,-73,'#c9d3ae',3);}
  const tele=e.action==='telegraph';const atk=e.action==='attack';const hand=tele?[15,-85]:atk?[48,-43]:[25,-30];limb(c,[14,-58],tele?[27,-68]:[26,-46],hand,11,skin);
  if(e.type==='mummra'){line(c,hand[0]-2,hand[1],hand[0]+7,hand[1]-6,'#c3b67b',5);if(tele){ellipse(c,hand[0]+9,hand[1]-7,18+Math.sin(time*20)*4,18,'#77d9cb88');ellipse(c,hand[0]+9,hand[1]-7,8,8,'#c7f1c3');}}
  else if(e.type==='monkian'){c.strokeStyle='#c6c7ae';c.lineWidth=2;c.beginPath();c.moveTo(...hand);c.quadraticCurveTo(hand[0]+25,hand[1]-35,hand[0]+48,hand[1]-17);c.stroke();ellipse(c,hand[0]+48,hand[1]-17,11,11,'#879eac');for(let k=0;k<7;k++){const a=k*Math.PI*2/7;line(c,hand[0]+48+Math.cos(a)*10,hand[1]-17+Math.sin(a)*10,hand[0]+48+Math.cos(a)*16,hand[1]-17+Math.sin(a)*16,'#c3cbc3',3);}ellipse(c,-21,-34,16,21,'#899ca0');ellipse(c,-23,-35,8,9,'#2d4251');}
  else if(e.type==='archer'){line(c,hand[0],hand[1]+16,hand[0],hand[1]-50,'#a18a61',5);ellipse(c,hand[0],hand[1]-52,9,10,'#ca9c67');if(tele)ellipse(c,hand[0],hand[1]-52,15+Math.sin(time*20)*4,15,'#d9875755');}
  else{line(c,hand[0],hand[1],hand[0]+8,hand[1]-28,'#8b7258',5);poly(c,[[hand[0]+1,hand[1]-20],[hand[0]-4,hand[1]-43],[hand[0]+9,hand[1]-50],[hand[0]+18,hand[1]-27]],'#b5beb1','#364c50');line(c,hand[0]+4,hand[1]-42,hand[0]+10,hand[1]-33,'#e0d9b6',3);}
  if(hurt)c.translate(-3,0);c.restore();
  if(tele){if(e.attackKind==='slam'){c.save();c.globalAlpha=.35+Math.sin(time*20)*.12;ellipse(c,e.x,e.y,155,55,'#ed7651');c.restore();}else{ellipse(c,e.x,e.y-110*scale,10,10,'#f2b46b');text(c,'!',e.x,e.y-104*scale,18,'#542a28','center');}}
  if(e.hp>0&&!boss&&e.hp<e.maxHp){c.fillStyle='#14252c';c.fillRect(e.x-20,e.y-112*scale,40,4);c.fillStyle='#d88b67';c.fillRect(e.x-19,e.y-112*scale,38*e.hp/e.maxHp,3);}
 }
 enemySprite(c,e,time){
  time=e.animTime??time;
  const row={mutant:0,slythe:0,brute:1,monkian:1,archer:2,jackalman:2,mummra:3}[e.type]||0;const cell=this.enemyAtlas.width/4,s=(e.boss?170:e.type==='brute'?115:105)/cell;let frame=e.action==='walk'?(Math.floor(time*9+e.seed)%4===0?0:1):e.action==='attack'?2:e.action==='hurt'||e.hp<=0?3:0;
  if(e.action==='attack'&&e.actionTime<.08)frame=0;
  if(['knockdown','rise'].includes(e.action))frame=3;
  ellipse(c,e.x,e.y+3,e.boss?38:24,7,'#081a2366');c.save();c.translate(e.x,e.y-e.z);c.scale(e.face,1);
  if(e.hp<=0)c.globalAlpha=clamp(e.dead/.3,0,1);
  if(['dead','knockdown','rise'].includes(e.action)){const fall=e.action==='rise'?1-clamp(e.actionTime/.23,0,1):clamp(e.actionTime/.18,0,1);c.translate(0,-35);c.rotate(-1.4*fall);c.translate(0,35);}
  if(e.action==='telegraph')c.rotate(-.045*Math.sin(clamp(e.actionTime/.44,0,1)*Math.PI));
  const bank=this.animations?.enemyRun,walking=e.action==='walk'&&bank?.ready;
  const walk=walking?bank.frames.get(row*8+Math.floor((e.walkPhase||0)*8)%8):null;
  const record=walk||this.enemyFrames?.get(row*4+frame),art=record?(e.flash>0?hitFlash(record):record.canvas):null,scale=walk?(e.boss?170:e.type==='brute'?115:105)/(bank.image.height/4):s;
  if(art)c.drawImage(art,-(record.anchor??art.width*(frame===2?.38:.5))*scale,-art.height*scale,art.width*scale,art.height*scale);
  c.restore();
  if(e.action==='telegraph'){if(e.attackKind==='slam'){c.save();c.globalAlpha=.35+Math.sin(time*20)*.12;ellipse(c,e.x,e.y,155,55,'#ed7651');c.restore();}ellipse(c,e.x,e.y-(e.boss?174:116),10,10,'#f2b46b');text(c,'!',e.x,e.y-(e.boss?168:110),18,'#542a28','center');}
  if(e.hp>0&&!e.boss&&e.hp<e.maxHp){c.fillStyle='#14252c';c.fillRect(e.x-20,e.y-108,40,4);c.fillStyle='#d88b67';c.fillRect(e.x-19,e.y-108,38*e.hp/e.maxHp,3);}
 }
 bossSprite(c,e,time){
  const bank=this.animations['boss-'+e.type],ready=bank.frames.get(0);
  let index=e.action==='walk'?4+Math.floor((e.walkPhase||0)*8)%8:e.action==='telegraph'?1:e.action==='attack'?(e.actionTime<.08?1:2):['hurt','knockdown','rise','dead'].includes(e.action)?3:0;
  const frame=bank.frames.get(index);if(!frame||!ready)return;
  const heights={slythe:132,monkian:145,jackalman:140,mummra:174},scale=heights[e.type]/ready.canvas.height;
  const img=e.flash>0?hitFlash(frame):frame.canvas,clock=e.animTime??time;
  ellipse(c,e.x,e.y+2,e.type==='slythe'?40:32,7,'#071a2355');c.save();c.translate(e.x,e.y-e.z);c.scale(e.face,1);
  if(e.hp<=0){c.globalAlpha=clamp(e.dead/.3,0,1);c.translate(0,-35);c.rotate(-1.35*clamp(e.actionTime/.25,0,1));c.translate(0,35);}
  if(e.action==='idle')c.scale(1,1+Math.sin(clock*2.3)*.004);
  c.drawImage(img,-frame.anchor*scale,-img.height*scale,img.width*scale,img.height*scale);c.restore();
  if(e.type==='mummra'&&['telegraph','attack'].includes(e.action)){
   const x=e.x+e.face*48,y=e.y-e.z-110,pulse=1+Math.sin(clock*15)*.15;
   ellipse(c,x,y,18*pulse,18*pulse,'#64e7b44a');ellipse(c,x,y,7*pulse,7*pulse,'#b8f8d3bb');
  }
  if(e.action==='telegraph'){
   if(e.attackKind==='slam'){c.save();c.globalAlpha=.35+Math.sin(clock*20)*.12;ellipse(c,e.x,e.y,155,55,'#ed7651');c.restore();}
   ellipse(c,e.x,e.y-e.z-heights[e.type]-15,10,10,'#f2b46b');text(c,'!',e.x,e.y-e.z-heights[e.type]-9,18,'#542a28','center');
  }
  this.bossFrames??={};this.bossFrames[e.type]={index,height:img.height*scale,feet:e.y-e.z};
 }
 specialist(c,e,time){
  const profile=ENEMIES[e.type],bank=this.animations.specialists,row=profile.row;
  let frame=e.action==='walk'?1+Math.floor((e.walkPhase||0)*4)%2:e.action==='telegraph'?3:e.action==='attack'?(e.actionTime<.08?3:4):['hurt','knockdown','rise','dead'].includes(e.action)?5:0;
  const record=bank.frames.get(row*6+frame);if(!record)return;const art=e.flash>0?hitFlash(record):record.canvas,scale=116/(bank.image.height/5);
  ellipse(c,e.x,e.y+2,24-e.z*.12,6,'#091f2a55');c.save();c.translate(e.x,e.y-e.z);c.scale(e.face,1);
  if(e.hp<=0)c.globalAlpha=clamp(e.dead/.3,0,1);
  if(['knockdown','rise','dead'].includes(e.action)){const progress=e.action==='rise'?1-clamp(e.actionTime/.23,0,1):clamp(e.actionTime/.2,0,1);c.translate(0,-35);c.rotate(-progress*1.4);c.translate(0,35);}
  c.drawImage(art,-record.anchor*scale,-art.height*scale,art.width*scale,art.height*scale);c.restore();
  if(e.action==='telegraph'){
   ellipse(c,e.x,e.y-e.z-125,10,10,'#f2b46b');text(c,'!',e.x,e.y-e.z-119,18,'#542a28','center');
   if(e.attackKind==='thrust'||e.attackKind==='rush'){c.save();c.globalAlpha=.18;poly(c,[[e.x,e.y-15],[e.x+e.face*(e.attackKind==='thrust'?145:190),e.y-15],[e.x+e.face*(e.attackKind==='thrust'?145:190),e.y+15],[e.x,e.y+15]],'#ffc776');c.restore();}
  }
  if(e.hp>0&&(e.hp<e.maxHp||e.action==='telegraph')){const y=e.y-e.z-114;c.fillStyle='#14252c';c.fillRect(e.x-23,y,46,4);c.fillStyle=e.type==='guard'?'#d4bd77':e.type==='shaman'?'#9ad6bb':'#dc9f80';c.fillRect(e.x-22,y,44*e.hp/e.maxHp,3);}
 }
 prop(c,p){c.save();c.translate(Math.round(p.x),Math.round(p.y));if(p.flash>0)c.filter='brightness(2)';ellipse(c,0,1,18,5,'#18282555');if(p.type==='crate'){poly(c,[[-18,0],[-18,-32],[14,-32],[20,-27],[20,0]],'#8d6e48','#3d4940');c.fillStyle='#b29662';c.fillRect(-16,-30,29,4);c.fillRect(-15,-9,29,4);line(c,-13,-25,12,-5,'#4d513b',5);line(c,-12,-24,13,-4,'#c0a579',2);line(c,16,-28,16,-2,'#5b563e',3);}else{poly(c,[[-11,-39],[10,-39],[8,-31],[17,-22],[18,-10],[10,0],[-10,0],[-18,-10],[-17,-23],[-8,-31]],'#b08c63','#494a3d');ellipse(c,0,-39,11,3,'#c9ac77');line(c,-12,-23,12,-23,'#d0b480',4);line(c,-14,-14,14,-14,'#77633e',4);line(c,-10,-29,-14,-14,'#d5b684',3);}c.restore();}
 dangers(c,game,time){
  const ring=(x,y,r,color,progress,active=false)=>{c.save();c.globalAlpha=active?.5:.13+progress*.18;ellipse(c,x,y,r,r*.34,color);c.globalAlpha=.7;c.strokeStyle=color;c.lineWidth=2;c.setLineDash(active?[]:[7,5]);c.beginPath();c.ellipse(x,y,r,r*.34,0,0,Math.PI*2);c.stroke();c.setLineDash([]);if(!active)text(c,'!',x,y+4,14,color,'center');c.restore();};
  for(const z of game.zones)ring(z.x,z.y,z.r,z.kind==='bomb'?'#f4a26a':'#83e1b7',clamp(z.elapsed/z.delay,0,1),z.detonated);
  for(const s of game.projectiles)if(s.kind==='bomb')ring(s.targetX,s.targetY,76,'#f4ad6b',s.elapsed/s.flight);
  for(const trap of game.traps)if(trap.warning||trap.active){const color=trap.kind==='poison'?'#b2d776':trap.kind==='spirit'?'#79e5cc':'#d8bd84';ring(trap.x,trap.y,trap.r,color,.6,trap.active);if(trap.active)for(let i=0;i<5;i++){const x=trap.x+(i-2)*15,y=trap.y+Math.sin(i+time*8)*7;poly(c,[[x-8,y],[x-3,y-28-Math.sin(time*9+i)*14],[x+9,y]],color);}}
 }
 support(c,a,time){
  if(this.supportAtlas.complete&&this.supportAtlas.naturalWidth){const h=SUPPORTS[a.support],cell=this.supportAtlas.width/3,row=Math.floor(a.support/3),col=a.support%3;const height=h.snarf?68:h.small?91:131,s=height/cell,bob=Math.sin(time*15+a.seed)*3;c.save();c.globalAlpha=h.spirit?.72:Math.min(1,a.life);c.translate(a.x,a.y-a.z-bob);c.scale(a.face,1);c.rotate(Math.sin(time*12+a.seed)*.025);ellipse(c,0,2,20,5,'#12262e55');const art=this.supportFrames?.get(a.support)?.canvas;if(art)c.drawImage(art,-art.width*s*.5,-art.height*s,art.width*s,art.height*s);else c.drawImage(this.supportAtlas,col*cell,row*cell,cell,cell,-height*.5,-height*.96,height,height);c.restore();return;}
  const h=SUPPORTS[a.support];const run=Math.sin(time*17+a.seed)*13,attack=a.action==='attack';ellipse(c,a.x,a.y+2,20,5,'#12262e55');c.save();c.translate(Math.round(a.x),Math.round(a.y-a.z));c.scale(h.small?.7:1,h.small?.75:1);if(h.spirit)c.globalAlpha=.65;
  if(h.snarf){poly(c,[[-23,-15],[-38,-28],[-42,-48],[-34,-37],[-29,-25],[-19,-24]],h.hair,'#35464a');ellipse(c,0,-19,24,17,h.hair);ellipse(c,8,-17,15,13,h.skin);line(c,-11,-12,-19+run*.4,0,h.dark,7);line(c,12,-11,19-run*.4,0,h.dark,7);ellipse(c,11,-38,17,14,h.hair);poly(c,[[-2,-43],[-5,-61],[7,-49],[17,-49],[28,-61],[26,-40]],h.hair,'#35464a');ellipse(c,15,-34,12,8,h.skin);line(c,6,-43,12,-43,'#2a3b42',3);line(c,19,-43,25,-43,'#2a3b42',3);ellipse(c,16,-38,3,2,'#513e3f');line(c,0,-34,-10,-37,h.skin,2);line(c,0,-31,-12,-30,h.skin,2);c.restore();return;}
  if(h.spirit){poly(c,[[-17,-71],[-35,-8],[-14,-18],[-2,-8],[26,-13],[21,-69]],h.dark,'#283955');}
  limb(c,[-8,-34],[-14-run*.4,-18],[-10-run,-2],9,h.dark,h.color);limb(c,[8,-34],[12+run*.4,-18],[13+run,-2],9,h.color,h.skin);line(c,-16-run,-1,-5-run,-1,h.dark,7);line(c,8+run,-1,22+run,-1,h.dark,7);
  limb(c,[-12,-65],[-22,-45],[-15,-33],8,h.skin);
  poly(c,[[-14,-69],[11,-69],[16,-52],[10,-34],[-12,-34],[-19,-53]],h.color,'#243840');poly(c,[[-12,-66],[-4,-60],[-4,-36],[-12,-36],[-16,-51]],h.dark);line(c,-11,-36,11,-36,'#d7b273',3);catMark(c,0,-53,7);
  poly(c,[[-14,-82],[-16,-94],[-8,-93],[-5,-101],[1,-95],[10,-98],[15,-90],[17,-77],[9,-74],[-7,-75]],h.hair,'#34404a');poly(c,[[-9,-87],[5,-92],[12,-84],[11,-73],[3,-69],[-6,-74]],h.skin,'#34404a');line(c,1,-81,9,-81,'#34404a',2);line(c,5,-74,10,-74,'#76564c',2);
  if(h.name==='BENGALI')for(let k=0;k<3;k++)line(c,-9,-84+k*5,-3,-82+k*5,'#4d6e9a',2);
  if(h.name==='JAGA'){poly(c,[[-13,-87],[-10,-100],[0,-105],[14,-98],[17,-85],[8,-88],[-3,-88]],'#a6b2d3','#354f79');for(const s of [-1,1])poly(c,[[s*9,-98],[s*22,-106],[s*18,-88],[s*12,-84]],'#ddbc6d');poly(c,[[-9,-77],[3,-74],[10,-77],[4,-63],[-2,-65]],'#eee8cf');}
  if(h.name==='LYNX-O'){line(c,-7,-81,12,-81,'#b5704f',4);poly(c,[[-11,-77],[-9,-70],[-6,-67],[-3,-72]],h.hair);poly(c,[[10,-77],[15,-72],[10,-65],[5,-71]],h.hair);}
  const hand=attack?[43,-53]:[24,-38];limb(c,[12,-64],[24,-52],hand,8,h.skin,h.skin);
  if(h.weapon==='sword'){line(c,...hand,hand[0]+14,hand[1]-54,'#d8e7eb',5);line(c,hand[0]-5,hand[1]-10,hand[0]+13,hand[1]-7,'#e1be75',4);}
  else if(h.weapon==='hammer'){line(c,...hand,hand[0]+10,hand[1]-45,'#a07956',5);poly(c,[[hand[0]-5,hand[1]-51],[hand[0]+23,hand[1]-46],[hand[0]+19,hand[1]-30],[hand[0]-8,hand[1]-35]],'#b5c5cc','#344f70');}
  else if(h.weapon==='shield'){ellipse(c,-17,-46,14,21,'#d6bd78');ellipse(c,-17,-46,10,15,'#bb6846');}
  else if(h.weapon==='capsules'){for(let k=0;k<3;k++){const bx=hand[0]+(time*180+k*29)%100;ellipse(c,bx,hand[1]-Math.sin(time*6+k)*15,4,4,['#a0c4ec','#dba994','#a8d7a0'][k]);}}
  else{c.strokeStyle='#d4be8c';c.lineWidth=2;c.beginPath();c.ellipse(hand[0]+22,hand[1]-12,24,11,time*12,0,Math.PI*2);c.stroke();}
  if(h.small){ellipse(c,0,8,28,5,'#8992bf');line(c,-22,8,22,8,'#cfb5e3',2);}
  c.restore();
 }
 thundertank(c,tank,opacity=1){
  const bank=this.animations.tank;if(!bank?.ready)return;
  const deployed=tank.time>THUNDERTANK.arrival*.82&&tank.time<THUNDERTANK.departure;
  const index=deployed?(tank.flash>0?3:2):Math.floor((tank.travel||0)/19)%2,frame=bank.frames.get(index);if(!frame)return;
  const img=frame.canvas,scale=tank.width/img.width,height=img.height*scale;
  const contact=treadContact(frame),top=tank.y-contact*scale,bottom=top+height,left=tank.x-tank.width*.5;
  // Place the actual tread rubber on the floor, independent of hanging weapons.
  ellipse(c,tank.x,tank.y+3,tank.width*.43,14,'#08172266');
  const recoil=tank.flash>0?-Math.sin(tank.flash/.16*Math.PI)*3:0;
  c.save();c.globalAlpha=opacity;c.drawImage(img,left+recoil,top,tank.width,height);c.restore();
  this.tankFrame={index,width:tank.width,height,left,bottom,treadY:top+contact*scale,groundY:tank.y,top,contactFraction:contact/img.height,travel:tank.travel};
 }
 tankShots(c,tank){
  for(const bolt of tank.bolts){
   if(bolt.hit){ellipse(c,bolt.x,bolt.y,8,8,'#fff4bc88');continue;}
   const dx=bolt.targetX-bolt.fromX,dy=bolt.targetY-bolt.fromY,length=Math.hypot(dx,dy)||1;
   const tailX=bolt.x-dx/length*35,tailY=bolt.y-dy/length*35;
   line(c,tailX,tailY,bolt.x,bolt.y,'#ed6c3b88',10);line(c,tailX,tailY,bolt.x,bolt.y,'#ffc265',5);line(c,tailX,tailY,bolt.x,bolt.y,'#fffbe0',2);
   if(bolt.elapsed<.11){ellipse(c,bolt.fromX,bolt.fromY,12,8,'#ffd78ccc');ellipse(c,bolt.fromX,bolt.fromY,5,4,'#fffbe0');}
  }
 }
 thunderSignal(c,game,time){if(!game.call)return;const t=game.call.time,alpha=clamp(Math.min(t*3,(3.7-t)*2),0,1),x=480,y=177;c.save();c.globalAlpha=alpha*.2;ellipse(c,x,y,91+Math.sin(time*10)*3,91,'#f22d27');c.globalAlpha=alpha;c.shadowColor='#ef3b2e';c.shadowBlur=18;catMark(c,x,y,73);c.shadowBlur=0;for(let i=0;i<10;i++){const angle=i*Math.PI/5+time*.15;line(c,x+Math.cos(angle)*86,y+Math.sin(angle)*86,x+Math.cos(angle)*(105+Math.sin(time*8)*10),y+Math.sin(angle)*105,'#eeb76a55',2);}c.globalAlpha=alpha*.16;poly(c,[[game.call.source.x-game.camera,game.call.source.y-110],[x-65,y+35],[x+65,y+35]],'#f9e7a6');c.restore();}
 fallingHero(c,p,scale=1){
  const bank=this.animations.actions,art=bank?.frames.get(p.hero*8+2)||this.heroFrames?.get(p.hero*4+3);if(!art)return;
  const t=clamp(p.fall.elapsed/p.fall.duration,0,1),pit=p.fall.pit,points=pitOutline(pit),img=art.canvas,s=126/(bank?.image.height/bank.rows||this.heroAtlas.height/4);
  c.save();c.beginPath();c.rect(p.x-600,-600,1200,pit.y+602);
  points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.clip();
  c.translate(p.x,p.y+220*t*t);c.scale(p.face*scale*(1-t*.15),scale*(1-t*.15));c.rotate(-.12*Math.sin(t*Math.PI));c.globalAlpha*=1-clamp((t-.7)/.3,0,1);
  c.drawImage(img,-art.anchor*s,-img.height*s,img.width*s,img.height*s);c.restore();
 }
 groundDetail(c,game,camera=game.camera){
  const theme=game.stage.theme,palette={forest:['#344338','#8b9470','#546346'],desert:['#806346','#d5b27a','#a17d50'],pyramid:['#34454e','#8eaaa0','#53656a'],lair:['#676654','#c1b58c','#8c896e'],ruins:['#656a60','#b1af91','#818779']}[theme];
  for(const p of game.pits){
   if(p.x+p.w<camera-30||p.x>camera+990)continue;
   const points=pitOutline(p).map(([x,y])=>[x-camera,y]),cx=p.x+p.w*.5-camera,cy=p.y+Math.min(56,482-p.y)*.5;
   const rim=points.map(([x,y])=>[cx+(x-cx)*1.13,cy+(y-cy)*1.16]);
   poly(c,rim.map(([x,y])=>[x,y+5]),'#17232955');poly(c,rim,palette[0]);
   for(let i=0;i<points.length;i++){const j=(i+1)%points.length;poly(c,[rim[i],rim[j],points[j],points[i]],i<4?palette[2]:palette[1]);}
   const dark=c.createLinearGradient(0,p.y,0,482);dark.addColorStop(0,'#17201e');dark.addColorStop(.25,'#070f15');dark.addColorStop(1,'#02070c');poly(c,points,dark);
   c.save();c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.clip();
   // Only a shallow rear wall is visible; the opening lies flat in the floor.
   for(let i=0;i<4;i++)poly(c,[points[i],points[i+1],[points[i+1][0]-3,points[i+1][1]+9],[points[i][0]+2,points[i][1]+12]],i%2?'#3a4338':'#42483b');
   if(theme==='pyramid')ellipse(c,cx,cy+14,p.w*.38,5,'#5abca923');c.restore();
   for(const i of [0,2,5,7,9]){const [x,y]=rim[i],dx=(x-cx)*.18,dy=(y-cy)*.22;line(c,x,y,x+dx,y+dy,'#26322c88',1.5);line(c,x+dx,y+dy,x+dx+7,y+dy-2,'#26322c66',1);}
   if(theme==='forest')for(const i of [1,3,8]){const [x,y]=rim[i];ellipse(c,x,y,8,2,'#78915b');}
  }
 }
 foreground(c,index,camera,time){
  const stage=STAGES[index];
  if(this.animations.landmarks?.ready){const col={lair:1,forest:1,ruins:1,desert:3,pyramid:2}[stage.theme];for(let x=Math.floor(camera*1.14/1150)*1150;x<camera*1.14+2100;x+=1150)this.drawLandmark(c,stage.theme,{x:x+740,y:554,col,height:stage.theme==='pyramid'?85:65},camera*1.14);}
  if(this.backdrops[index].complete&&this.backdrops[index].naturalWidth){for(let i=0;i<18;i++){const x=((i*137+time*(stage.theme==='desert'?45:13)-camera*.7)%1040+1040)%1040-40,y=(i*91+time*12)%510;c.save();c.globalAlpha=.25;c.translate(x,y);if(['forest','ruins','lair'].includes(stage.theme)){c.rotate(time+i);ellipse(c,0,0,4,1.5,i%3===0?'#e7b85e':'#bcce85');}else if(stage.theme==='desert')line(c,0,0,10,-1,'#f4d7a5',1);else{c.shadowColor='#6df2da';c.shadowBlur=8;ellipse(c,0,0,1.8,1.8,'#84e9d7');}c.restore();}return;}
  if(stage.theme==='forest'||stage.theme==='ruins'){const r=seeded(56);for(let i=0;i<70;i++){const x=((i*29-camera*1.12)%1040+1040)%1040-40,y=514+r()*30;const color=i%3===0?'#446445':'#213f38';for(let j=0;j<4;j++){const tip=x+(j-1.5)*10;poly(c,[[x,y+24],[tip-4,y-13-r()*15],[tip+8,y],[x+13,y+24]],color);if(i%6===0)line(c,tip,y,tip-2,y-15,'#819056',2);}}}
  else{const r=seeded(8);for(let i=0;i<25;i++){const x=((i*63-camera*1.1)%1040+1040)%1040-40;poly(c,[[x-12,540],[x,517-r()*10],[x+16,515],[x+40,540]],stage.theme==='desert'?'#6c6054':'#253a40');}}
  for(let i=0;i<25;i++){const t=time*(stage.theme==='desert'?34:8);const x=((i*149+t-camera*.2)%1000+1000)%1000;const y=(i*97+Math.sin(time+i)*8)%440+40;if(stage.theme==='forest'){ellipse(c,x,y,2,2,'#e0d99777');}else if(stage.theme==='desert'){line(c,x,y,x+8,y-2,'#ffdc9e33',2);}else if(stage.theme==='pyramid'){ellipse(c,x,y,1.5,1.5,'#a7ede28c');}}
 }
 render(game,dt,{demo=false,alpha=1}={}){
  const blend=(previous,current)=>(previous??current)+(current-(previous??current))*alpha;
  const pose=p=>({...p,x:blend(p.prevX,p.x),y:blend(p.prevY,p.y),z:blend(p.prevZ,p.z)});
  this.clock+=dt;const c=this.ctx;const ratio=this.resolutionScale||2;const t=this.reducedMotion?0:this.clock;const index=game?.stageIndex||0;const camera=game?blend(game.prevCamera,game.camera):(t*9%600);c.setTransform(ratio,0,0,ratio,0,0);c.imageSmoothingEnabled=true;c.clearRect(0,0,W,H);c.save();if(game?.shake&&!this.reducedMotion)c.translate(Math.sin(t*113)*game.shake,Math.cos(t*97)*game.shake*.5);
  this.world(c,index,camera,t,game);
  if(game&&!demo){
   this.groundDetail(c,game,camera);c.save();c.translate(-camera,0);this.dangers(c,game,t);
   const objects=[...(game.tank?[{...game.tank,x:blend(game.tank.prevX,game.tank.x),draw:'tank'}]:[]),...game.props.filter(p=>p.hp>0).map(p=>({...p,draw:'prop'})),...game.pickups.map(p=>({...p,draw:'pick'})),...game.players.map(p=>({...pose(p),draw:'hero'})),...game.summons.filter(a=>game.call?.time>=a.delay).map(a=>({...a,draw:a.hero!==undefined?'hero':'support'})),...game.enemies.map(e=>({...pose(e),draw:'enemy'}))].sort((a,b)=>a.y-b.y);
   for(const o of objects){if(o.x<camera-(o.draw==='tank'?300:150)||o.x>camera+(o.draw==='tank'?1250:1100))continue;if(o.draw==='hero')this.hero(c,o,t);else if(o.draw==='tank'){this.thundertank(c,o);for(const p of game.players.filter(p=>p.hp>0&&p.y<o.y&&p.y>o.y-100&&Math.abs(p.x-o.x)<o.width*.55)){c.save();c.globalAlpha=.5;this.hero(c,pose(p),t);c.restore();}}else if(o.draw==='support')this.support(c,o,t);else if(o.draw==='enemy')this.enemy(c,o,t);else if(o.draw==='prop')this.prop(c,o);else{const y=o.y-10+Math.sin(o.t)*4;ellipse(c,o.x,o.y,12,3,'#142b2a55');if(o.type==='food'){ellipse(c,o.x,y,9,8,'#cb624a');poly(c,[[o.x-1,y-6],[o.x,y-14],[o.x+7,y-14],[o.x+3,y-7]],'#a4bd77');line(c,o.x-4,y-4,o.x-5,y,'#f7b582',3);}else if(o.type==='energy'){poly(c,[[o.x,y-14],[o.x-9,y],[o.x,y+9],[o.x+9,y]],'#75d3d6','#e7efc6');}else{poly(c,[[o.x-8,y-6],[o.x,y-12],[o.x+9,y-6],[o.x+7,y+5],[o.x-7,y+5]],'#ebc46a','#fff1ad');}}}
   if(game.tank)this.tankShots(c,game.tank);
   for(const s of game.projectiles){if(s.kind==='bomb'){ellipse(c,s.x,s.y-s.z,9,9,'#27303c');ellipse(c,s.x-3,s.y-s.z-3,3,3,'#7b8d95');line(c,s.x+3,s.y-s.z-7,s.x+8,s.y-s.z-13,'#d6b982',2);ellipse(c,s.x+8,s.y-s.z-13,3,3,'#ffd28c');}else{ellipse(c,s.x,s.y-s.z,s.boss?10:6,s.boss?8:5,s.boss?'#8fe5d1':'#ffc37b');line(c,s.x-s.vx*.05,s.y-s.z-s.vy*.05,s.x,s.y-s.z,'#e8f5b877',5);}}
   for(const p of game.particles){c.globalAlpha=clamp(p.life/(p.kind==='dust'?p.max:.12),0,1);const s=p.size*1.3;c.save();c.translate(p.x,p.y);if(p.kind==='dust'){ellipse(c,0,0,s*(2-p.life/p.max),s*.4,p.color);}else{c.rotate(p.life*12);poly(c,[[0,-s],[s*.35,-s*.3],[s,0],[s*.3,s*.3],[0,s],[-s*.3,s*.3],[-s,0],[-s*.3,-s*.3]],p.color,'#273335');}c.restore();}c.globalAlpha=1;
   for(const p of game.players)if(p.hp<=0&&p.action!=='out'){text(c,`REVIVE ${Math.ceil(p.downTime)}s`,p.x,p.y-26,10,'#eeb788','center');c.fillStyle='#203b3a';c.fillRect(p.x-25,p.y-17,50,5);c.fillStyle='#accf8c';c.fillRect(p.x-25,p.y-17,50*p.revive/2,5);}
   for(const q of game.texts.filter(q=>!q.screen)){c.globalAlpha=clamp(q.life*2,0,1);text(c,q.text,q.x,q.y,11,q.color,'center');}c.globalAlpha=1;c.restore();
   if(game.gate===null&&game.completed.size&&game.exitTime===0){const x=898+Math.sin(t*5)*5;poly(c,[[x,245],[x+24,260],[x,275],[x+5,260]],'#eee5a0');text(c,'GO',x,235,12,'#eee5a0');}
  }else{
   for(let i=0;i<4;i++)this.hero(c,{id:i,hero:i,x:330+i*100,y:434+(i%2)*13,z:0,face:i<2?1:-1,hp:100,action:'idle',timer:0,combo:0},t,1.08);
   for(let i=0;i<5;i++)ellipse(c,335+i*88,452+(i%2)*10,40,5,'#b5bc7833');
  }
  this.foreground(c,index,camera,t);if(game&&!demo)this.thunderSignal(c,game,t);c.restore();
  const ctx=this.ctx;ctx.setTransform(ratio,0,0,ratio,0,0);
  if(game&&!demo)this.hud(ctx,game);
 }
 hud(c,g){
  const n=g.players.length;const width=(916-(n-1)*12)/n;
  for(const [i,p]of g.players.entries()){
   const h=HEROES[p.hero],x=22+i*(width+12),y=18;c.fillStyle='#0a191ddb';c.fillRect(x,y,width,58);c.fillStyle=h.color;c.fillRect(x,y,3,58);text(c,g.solo?'SOLO':`P${i+1}`,x+11,y+15,9,h.color);text(c,h.name,x+(g.solo?55:38),y+15,12,'#eee9cf');text(c,'×'+p.lives,x+width-12,y+15,11,'#d5ccb2','right');
   c.fillStyle='#2d3939';c.fillRect(x+12,y+25,width-24,9);c.fillStyle=p.hp>p.maxHp*.3?h.color:'#e67558';c.fillRect(x+12,y+25,(width-24)*Math.max(0,p.hp/p.maxHp),9);c.fillStyle='#ffffff33';c.fillRect(x+12,y+25,(width-24)*Math.max(0,p.hp/p.maxHp),2);
   c.fillStyle='#2d3939';c.fillRect(x+12,y+41,width-24,4);c.fillStyle=p.energy>=100?'#fff0aa':'#e6bb71';c.fillRect(x+12,y+41,(width-24)*p.energy/100,4);text(c,p.action==='out'?'OUT':p.hp<=0?'DOWN — REVIVE!':p.energy>=100?'SPECIAL READY!':`SPECIAL ${Math.floor(p.energy)}% · HIT TO CHARGE`,x+12,y+54,7,p.hp<=0?'#f6aa8b':p.energy>=100?'#ffe7a0':'#9aaea3');
  }
  text(c,`${String(g.campaignNumber||g.stageIndex+1).padStart(2,'0')} / ${g.stage.name}`,23,99,10,'#d6dbc2');text(c,'SCORE '+String(g.score).padStart(7,'0'),937,99,11,'#eee2b5','right');
  text(c,g.stage.sections[g.sectionIndex].name,23,113,8,'#c5c6a5');
  if(g.combo>2){text(c,g.combo+' HITS',936,133,22,'#f3c86c','right');text(c,g.combo>12?'THUNDEROUS!':g.combo>6?'UNSTOPPABLE':'KEEP IT GOING',935,150,9,'#e9e3bb','right');}
  for(const t of g.texts.filter(t=>t.screen)){c.save();c.globalAlpha=clamp(t.life*2,0,1);text(c,t.text,t.x,t.y,t.big?29:16,t.color,'center');c.restore();}
  const boss=g.enemies.find(e=>e.boss&&e.hp>0);if(boss){c.fillStyle='#091a20e8';c.fillRect(222,488,516,34);text(c,g.stage.boss,480,500,10,'#eedbc2','center');c.fillStyle='#3f393b';c.fillRect(236,507,488,7);c.fillStyle='#c77761';c.fillRect(236,507,488*boss.hp/boss.maxHp,7);}else{
   const fighting=g.gate!==null,left=fighting?350:196,width=744-left;c.fillStyle='#0d1b1dcc';c.fillRect(22,504,fighting?315:160,16);text(c,fighting?`ENCOUNTER ${g.encounter+1}/${g.encounterGates.length} · WAVE ${g.wave}/${g.waveLimit} · ${g.enemies.filter(e=>e.hp>0).length+g.spawnQueue.length} LEFT`:'ADVANCE →',29,515,8,fighting?'#f0b795':'#c9d9a8');c.fillStyle='#294b43';c.fillRect(left,510,width,3);c.fillStyle='#b9c68d';c.fillRect(left,510,width*clamp((g.camera+400)/g.stage.length,0,1),3);text(c,'ESC PAUSE',937,516,8,'#b9c6ab','right');}
  if(g.banner>0){const alpha=clamp(Math.min(g.banner,4.5-g.banner)*2,0,1);c.save();c.globalAlpha=alpha;c.fillStyle='#071b1fbd';c.fillRect(0,190,960,109);text(c,`CHAPTER ${String(g.campaignNumber||g.stageIndex+1).padStart(2,'0')}`,480,219,11,'#d7bf88','center');text(c,g.stage.name,480,255,28,'#eee3bd','center');text(c,g.stage.tag.toUpperCase(),480,279,10,'#adc7b5','center');c.restore();}
 }
 portrait(canvas,hero){canvas.width=360;canvas.height=224;const c=canvas.getContext('2d');c.setTransform(2,0,0,2,0,0);c.imageSmoothingEnabled=true;this.hero(c,{id:hero,hero,x:90,y:112,z:0,face:1,hp:100,action:'idle',timer:0,combo:0},0,.93);}
}
