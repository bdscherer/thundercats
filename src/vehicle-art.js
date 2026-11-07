import {HEROES,clamp,seeded} from './data.js';
import {VEHICLE_VILLAINS} from './bosses.js';
const blend=(a,b,t)=>(a??b)+(b-(a??b))*t;
function label(c,s,x,y,size=12,color='#eee8d4',align='left'){c.font=`800 ${size}px "Trebuchet MS",sans-serif`;c.textAlign=align;c.lineJoin='round';c.strokeStyle='#081722';c.lineWidth=3;c.strokeText(s,x,y);c.fillStyle=color;c.fillText(s,x,y);}
function oval(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
function path(c,points,fill,stroke='#27353d'){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}
export class VehicleRenderer{
 constructor(renderer){this.r=renderer;renderer.loadAnimation('vehicles','assets/vehicle-heroes-topdown.png',3,2);renderer.loadAnimation('vehicleEnemies','assets/vehicle-enemies-topdown.png',4,2);this.terrain=new Image();this.terrain.src='assets/vehicle-terrain-topdown-v2.png';this.clock=0;this.stars=Array.from({length:80},(_,i)=>{const r=seeded(940+i);return {x:r()*960,y:r()*540,size:1+r()*2};});}
 sprite(c,bankName,row,frame,x,y,width,height,angle=0,flash=false){
  const bank=this.r.animations[bankName],record=bank.frames.get(row*2+frame);if(!bank.ready||!record)return;
  const img=record.canvas;c.save();c.translate(x,y);c.rotate(angle);
  // Skycutter's canonical overhead model faces right; rotate the complete craft.
  if(bankName==='vehicleEnemies'&&row===0){c.rotate(Math.PI/2);c.drawImage(img,-height/2,-width/2,height,width);}
  else c.drawImage(img,-width/2,-height/2,width,height);
  if(flash){c.globalAlpha=.25;c.fillStyle='#fff4d1';c.fillRect(-width*.3,-height*.3,width*.6,height*.6);}c.restore();
 }
 bossBank(){return this.r.animations.vehicleBosses||this.r.loadAnimation('vehicleBosses','assets/boss-vehicles-1985.png',1,3);}
 bossSprite(c,e,x,y){const bank=this.bossBank(),frame=bank.frames.get(e.bossArt);if(!bank.ready||!frame)return;c.save();c.translate(x,y);c.rotate(Math.sin(e.age*1.3)*.028);if(e.flash>0)c.filter='brightness(1.35)';const art=frame.canvas,scale=Math.min(e.width/art.width,e.height/art.height),w=art.width*scale,h=art.height*scale;c.drawImage(art,-w/2,-h/2,w,h);c.restore();}
 render(g,dt,{alpha=1}={}){
  const r=this.r,c=r.ctx,ratio=r.resolutionScale||1,s=g.spec,p=g.ship,time=this.clock+=dt,scroll=blend(g.prevScroll,g.scroll,alpha),x=blend(p.prevX,p.x,alpha),y=blend(p.prevY,p.y,alpha);
  if(VEHICLE_VILLAINS[g.stage.bossType]?.art!==undefined)this.bossBank();
  c.setTransform(ratio,0,0,ratio,0,0);c.imageSmoothingEnabled=true;c.save();if(g.shake&&!r.reducedMotion)c.translate(Math.sin(time*90)*g.shake*.5,Math.cos(time*110)*g.shake*.3);
  c.fillStyle=['#cb9c64','#326456','#161a37'][g.stage.terrain];c.fillRect(0,0,960,540);
  if(this.terrain.complete&&this.terrain.naturalWidth){const tw=this.terrain.width/2,th=this.terrain.height/2,row=g.stage.terrain===2?1:0,col=g.stage.terrain===1?1:0,h=650,stride=550;
   // Overlap top-down terrain too, keeping the crop inside its own biome.
   for(let i=Math.floor(-scroll/stride)-1;i<=Math.floor((540-scroll)/stride);i++){
    const tile=r.sceneryTile(this.terrain,960,h,{fade:h-stride,axis:'y',mirrorY:!!(i%2),crop:[col*tw+2,row*th+2,tw-4,th-4]});if(tile)c.drawImage(tile,0,scroll+i*stride);
   }
  }
  const distance=blend(g.prevDistance,g.distance,alpha);let shade=0;for(let i=1;i<g.stage.sections.length;i++){const t=clamp((distance-g.stage.length*i/3+400)/800,0,1);shade+=t*t*(3-2*t);}
  c.fillStyle=['#3e2122','#142e4a','#3d1c60'][g.stage.terrain];c.globalAlpha=shade*.045;c.fillRect(0,0,960,540);c.globalAlpha=1;
  if(g.stage.environment){c.fillStyle={ice:'#c0e8ee66',storm:'#17264077',nebula:'#67397755'}[g.stage.environment];c.fillRect(0,0,960,540);for(let i=0;i<45;i++){const xx=(i*137+scroll*.1)%960,yy=(i*91+scroll*1.25)%540;if(g.stage.environment==='storm'){c.strokeStyle='#a5cadd66';c.lineWidth=1;c.beginPath();c.moveTo(xx,yy);c.lineTo(xx-10,yy+24);c.stroke();}else oval(c,xx,yy,g.stage.environment==='ice'?2:1.5,2,g.stage.environment==='ice'?'#f0fcf3aa':'#e5bbf7');}}
  for(const h of g.hazards||[]){c.save();const color={gravity:'#d698ff',psych:'#d6aaff',laser:'#ffb1a0',lightning:'#d8faff'}[h.kind]||'#d8faff';c.strokeStyle=color;c.fillStyle=color+(h.hit?'88':'22');c.lineWidth=3;if(h.kind==='laser'){c.fillRect(h.x-h.r,0,h.r*2,540);c.strokeRect(h.x-h.r,0,h.r*2,540);}else{c.beginPath();c.arc(h.x,h.y,h.r,0,Math.PI*2);c.fill();c.stroke();}if(!h.hit)label(c,({gravity:'GRAVITY WELL',psych:'PSYCHIC PULSE',laser:'LASER LANE',lightning:'LIGHTNING'}[h.kind]||'DANGER'),h.x,h.y+4,10,color,'center');else if(h.kind==='lightning'){c.strokeStyle='#f0ffff';c.lineWidth=7;c.beginPath();c.moveTo(h.x+30,0);c.lineTo(h.x-12,h.y*.55);c.lineTo(h.x+18,h.y*.6);c.lineTo(h.x,h.y);c.stroke();}c.restore();}
  this.worldFrame={scroll,backgroundY:scroll%550,mode:'top-down',axis:'vertical',vehicle:g.stage.vehicle};
  if(g.stage.terrain===2)for(const star of this.stars){const yy=(star.y+scroll*1.28)%540;c.fillStyle='#cbe8fa99';c.fillRect(star.x,yy,star.size,star.size+(p.boost>0?12:0));}
  for(const track of g.tracks){const yy=track.y+scroll-track.scroll;c.fillStyle='#70583d44';for(const side of [-1,1])c.fillRect(track.x+side*s.width*.31-8,yy,16,10);}
  for(const o of g.obstacles){
   oval(c,o.x+7,o.y+9,o.r,o.r*.7,'#102a2c55');
   if(o.type==='mine'){oval(c,o.x,o.y,o.r,o.r,'#42454c');oval(c,o.x,o.y,o.r*.63,o.r*.63,'#788077');oval(c,o.x,o.y,5,5,Math.sin(time*8)>0?'#ff8361':'#853b37');for(let i=0;i<8;i++){const a=i*Math.PI/4;oval(c,o.x+Math.cos(a)*o.r,o.y+Math.sin(a)*o.r,4,4,'#b0ad83');}}
   else{const points=Array.from({length:8},(_,i)=>{const a=i*Math.PI/4,d=o.r*(.86+Math.sin(o.seed+i*5)*.14);return [o.x+Math.cos(a)*d,o.y+Math.sin(a)*d];});path(c,points,o.type==='asteroid'?'#81798f':'#818d83');oval(c,o.x-6,o.y-5,o.r*.3,o.r*.22,'#b1b9ae66');}
  }
  for(const q of g.pickups){oval(c,q.x,q.y,20,20,'#102e37b8');c.strokeStyle=q.type==='repair'?'#a9ecc0':'#eed27d';c.lineWidth=2;c.strokeRect(q.x-13,q.y-13,26,26);label(c,q.type==='repair'?'+':'◆',q.x,q.y+7,25,q.type==='repair'?'#a9ecc0':'#eed27d','center');}
  for(const e of g.enemies){const ex=blend(e.prevX,e.x,alpha),ey=blend(e.prevY,e.y,alpha);if(g.stage.terrain!==2)oval(c,ex+10,ey+16,e.width*.35,e.height*.28,'#10233155');if(e.bossArt!==undefined)this.bossSprite(c,e,ex,ey);else this.sprite(c,'vehicleEnemies',e.row,e.shot&&e.fireCd>.65?1:0,ex,ey,e.width,e.height,0,e.flash>0);
   if(e.warning){oval(c,ex,ey-e.height*.25,9,9,'#ffd28d');label(c,'!',ex,ey-e.height*.25+5,15,'#693b37','center');}
   if(!e.boss&&e.hp<e.maxHp){c.fillStyle='#15232b';c.fillRect(ex-24,ey-e.height*.5-9,48,4);c.fillStyle='#eab77e';c.fillRect(ex-23,ey-e.height*.5-8,46*e.hp/e.maxHp,2);}
  }
  for(const b of g.shots){c.strokeStyle='#efaa53aa';c.lineWidth=7;c.beginPath();c.moveTo(b.x,b.y+16);c.lineTo(b.x,b.y-4);c.stroke();c.strokeStyle='#fff9c1';c.lineWidth=3;c.stroke();}
  for(const b of g.projectiles){oval(c,b.x,b.y,b.r+3,b.r+3,'#d95d6a55');oval(c,b.x,b.y,b.r,b.r,({gravity:'#c08df8',psych:'#f796d8',laser:'#ff5c64',orbit:'#e8d481',crossfire:'#8df0e7'}[b.weapon]||'#ed9c78'));oval(c,b.x-1,b.y-1,b.r*.45,b.r*.45,'#fff1c2');}
  if(!s.ground){
   if(g.stage.terrain!==2)oval(c,x+18,y+22,s.width*.33,s.height*.23,'#122b3444');
   for(const side of [-1,1]){const ex=x+side*s.width*(g.stage.vehicle==='feliner'?.22:.14),ey=y+s.height*.35;path(c,[[ex-7,ey],[ex,ey+18+(p.boost>0?26:0)+Math.sin(time*26)*4],[ex+7,ey]],p.boost>0?'#b4f8f1':'#f8c778','#82d9da77');}
  }else{oval(c,x,y+5,s.width*.42,s.height*.43,'#10232144');for(const side of [-1,1])for(let i=0;i<4;i++)oval(c,x+side*s.width*.35,y+s.height*.35+12+i*6,3+i,2+i*.8,'#d0bd9580');}
  if(p.invuln<=0||p.invuln>4||Math.floor(g.stageTime*14)%2===0)this.sprite(c,'vehicles',s.row,Math.abs(p.tilt)>.25?1:0,x,y,s.width,s.height,p.tilt*(s.ground?.05:.1),p.flash>0);
  if(p.boost>0){c.strokeStyle='#c2f3ee77';c.lineWidth=2;c.beginPath();c.ellipse(x,y,s.width*.58,s.height*.6,0,0,Math.PI*2);c.stroke();}
  if(g.pulse){const t=g.pulse.time/.6;c.save();c.globalAlpha=1-t;c.strokeStyle='#bce9ef';c.lineWidth=8*(1-t);c.beginPath();c.arc(g.pulse.x,g.pulse.y,t*1000,0,Math.PI*2);c.stroke();c.restore();}
  for(const q of g.particles){c.globalAlpha=clamp(q.life/.2,0,1);oval(c,q.x,q.y,q.size,q.size,q.color);}c.globalAlpha=1;
  if(g.stage.terrain===1){c.globalAlpha=.14;for(let i=0;i<4;i++){const yy=(i*230+scroll*1.35)%850-140;oval(c,100+i*235,yy,90,30,'#e8f1e9');oval(c,135+i*235,yy-15,55,33,'#e8f1e9');}c.globalAlpha=1;}
  c.restore();this.hud(c,g);
 }
 hud(c,g){
  const p=g.ship,s=g.spec,hero=HEROES[g.players[0].hero];c.fillStyle='#081c28ed';c.fillRect(16,14,928,69);c.fillStyle=hero.color;c.fillRect(16,14,3,69);
  label(c,s.name,30,36,17);label(c,'PILOT · '+hero.name+'    ×'+g.players[0].lives,30,53,9,hero.color);label(c,g.stage.sections[g.sectionIndex],30,71,10,'#d8c69e');
  label(c,'HULL',735,33,9,'#b7cfcb');c.fillStyle='#30434b';c.fillRect(735,40,192,10);c.fillStyle=p.hp>p.maxHp*.3?'#9cddc4':'#f4997e';c.fillRect(735,40,192*p.hp/p.maxHp,10);label(c,Math.ceil(p.hp)+' / '+p.maxHp,927,66,10,'#e6e5d3','right');
  label(c,g.stage.name.split(' · ')[1],480,37,16,'#f0dfad','center');label(c,'HOLD FIRE · KEEP MOVING',480,55,8,'#9ac3cb','center');label(c,'SCORE '+String(g.score).padStart(7,'0'),480,71,10,'#f0dfad','center');
  c.fillStyle='#081c28e8';c.fillRect(16,488,928,38);label(c,p.energy>=100?s.special+' READY — L':s.special+' · '+Math.floor(p.energy)+'%',29,503,9,p.energy>=100?'#fff1a3':'#c2d4d2');
  c.fillStyle='#30434b';c.fillRect(29,510,192,4);c.fillStyle='#e5c77f';c.fillRect(29,510,192*p.energy/100,4);
  label(c,p.boostCd<=0?'K / I · '+s.boost+' READY':'BOOST '+Math.ceil(p.boostCd)+'s',360,511,9,p.boostCd<=0?'#aae5e2':'#a7aead','center');
  const boss=g.enemies.find(e=>e.boss);if(boss){label(c,g.stage.boss+' · PHASE '+(boss.phase+1)+'/3',671,502,9,'#e6b58c','center');c.fillStyle='#45393e';c.fillRect(500,509,340,5);c.fillStyle='#d89177';c.fillRect(500,509,340*boss.hp/boss.maxHp,5);for(const t of [.25,.62]){c.fillStyle='#eed7b7';c.fillRect(500+340*t,508,1,7);}}else{label(c,g.bossDefeated?'ROUTE CLEAR':'ROUTE '+Math.min(100,Math.floor(g.distance/g.stage.length*100))+'%',671,502,9,'#c7cda8','center');c.fillStyle='#30434b';c.fillRect(500,509,340,4);c.fillStyle='#8fc2aa';c.fillRect(500,509,340*Math.min(1,g.distance/g.stage.length),4);}
  label(c,'ESC PAUSE',927,511,8,'#b7c8c8','right');
  if(g.banner>0){const a=clamp(Math.min(g.banner,4-g.banner)*2,0,1);c.save();c.globalAlpha=a;c.fillStyle='#081b29df';c.fillRect(170,178,620,123);label(c,s.ground?'DRIVE THE THUNDERTANK':'TAKE THE CONTROLS',480,202,10,'#adcdd0','center');label(c,g.stage.tag.toUpperCase(),480,235,27,'#ffe0a4','center');label(c,'WASD / ARROWS · STEER     J / SPACE · FIRE',480,259,10,'#d8e7dd','center');label(c,'K / I · BOOST     L · CHARGED WEAPON',480,279,10,'#b7cdc9','center');c.restore();}
  for(const t of g.texts){c.save();c.globalAlpha=clamp(t.life,0,1);label(c,t.text,480,130,23,'#f5d297','center');c.restore();}
 }
}
