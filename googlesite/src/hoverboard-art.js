import {clamp} from './data.js';

const W=960,H=540;
const blend=(a,b,t)=>a+(b-a)*t;

function label(c,text,x,y,size,color='#fff0cf',align='left'){
 c.font='800 '+size+'px "Trebuchet MS", sans-serif';
 c.textAlign=align;
 c.strokeStyle='#101c2b';
 c.lineWidth=3;
 c.strokeText(text,x,y);
 c.fillStyle=color;
 c.fillText(text,x,y);
}

function shape(c,points,fill,stroke='#192536'){
 c.beginPath();
 for(const [i,[x,y]] of points.entries())i?c.lineTo(x,y):c.moveTo(x,y);
 c.closePath();
 c.fillStyle=fill;c.fill();
 c.strokeStyle=stroke;c.lineWidth=2;c.stroke();
}

function oval(c,x,y,rx,ry,color){
 c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();
}

function imageAsset(file){
 const art=new Image();
 art.src=file;
 return art;
}

export class HoverboardRenderer {
 constructor(renderer){this.r=renderer;}

 load(){
  if(this.coast)return;
  this.coast=imageAsset('assets/berserker-coast.png');
  this.boss=imageAsset('assets/hammerhand-gunboat.png');
  this.riders=this.r.loadAnimation('spaceboards','assets/spaceboard-riders.png',2,3,96);
 }

 scenery(c,scroll,time){
  const sky=c.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,'#708fa9');
  sky.addColorStop(.65,'#f1b783');
  sky.addColorStop(1,'#1f7785');
  c.fillStyle=sky;c.fillRect(0,0,W,H);
  if(this.coast.naturalWidth)this.r.tileScenery(c,this.coast,scroll,.43,1640);
  // Spray and foam pass faster than the distant cliffs.
  for(let i=0;i<32;i++){
   const x=((i*151-scroll*.8)%1110+1110)%1110-85;
   const y=470+(i*17)%68+Math.sin(time*3+i)*3;
   oval(c,x,y,12+(i%5)*9,1.1+(i%3)*.45,'#ccffef45');
  }
 }

 rider(c,rider,board,index,alpha,time){
  const x=blend(rider.prevX,rider.x,alpha);
  const y=blend(rider.prevY,rider.y,alpha)+Math.sin(time*7+index)*2.5;
  const color=index?'#7ee9ff':'#ffb15c';
  const pose=board.fireCd>.11?2:board.boost>0||Math.abs(board.vy)>175?1:0;
  const art=this.riders.frames.get(index*3+pose)?.canvas;
  c.save();c.translate(x,y+24);
  c.rotate(clamp(board.vy/1300,-.19,.19));
  const length=board.boost>0?93:35;
  shape(c,[[-42,-3],[-42-length,4],[-42,7],[-23,1]],color+'99',color+'22');
  if(art){
   const h=86*(art.height/(this.riders.frames.get(index*3)?.canvas.height||art.height));
   const w=h*art.width/art.height;
   c.imageSmoothingEnabled=true;
   c.imageSmoothingQuality='high';
   c.drawImage(art,-w*.5,-h,w,h);
  }else{
   oval(c,0,-22,15,24,index?'#36a5cf':'#bb5128');
   oval(c,8,-54,15,16,'#e77d45');
   shape(c,[[-47,-3],[-34,4],[37,4],[52,-5],[26,-3]],color);
  }
  c.restore();
 }

 rock(c,o){
  const {x,y,width:w}=o,sign=o.bottom?1:-1,edge=o.bottom?H:0;
  shape(c,[[x-w*.65,edge],[x-w*.43,y+sign*39],[x-w*.23,y+sign*12],[x+4,y],
   [x+w*.26,y+sign*12],[x+w*.46,y+sign*40],[x+w*.65,edge]],'#784b49');
  shape(c,[[x-w*.65,edge],[x-w*.43,y+sign*39],[x-w*.23,y+sign*12],[x+4,y],
   [x+w*.12,y+sign*28],[x-w*.13,y+sign*64],[x-w*.27,edge]],'#ca895d');
  shape(c,[[x-w*.1,y+sign*81],[x+w*.27,y+sign*43],[x+w*.45,edge],[x-w*.08,edge]],'#493d4a');
 }

 enemy(c,e){
  c.save();c.translate(e.x,e.y);
  if(e.flash)c.filter='brightness(1.6)';
  if(e.boss&&this.boss.naturalWidth){
   const w=348,h=w*this.boss.naturalHeight/this.boss.naturalWidth;
   c.drawImage(this.boss,-w*.5,106-h,w,h);
  }else if(e.boss){
   shape(c,[[-130,34],[118,34],[101,91],[-66,91]],'#6f4244');
   oval(c,-9,16,33,38,'#a84936');oval(c,-18,-21,23,22,'#ded4b5');
   oval(c,-53,17,26,20,'#b3c5cd');
  }else{
   const raider=e.type==='raider';
   oval(c,23,4,22,3,'#fa9b58aa');
   shape(c,[[-40,1],[-9,-11],[21,-8],[33,6],[11,13],[-22,11]],raider?'#864c51':'#3e5366');
   shape(c,[[-15,3],[5,-23],[20,-11],[10,6]],raider?'#bd7956':'#779aa7');
   oval(c,-16,0,7,3,raider?'#ffc87e':'#99fff0');
  }
  c.restore();
 }

 warning(c,warning){
  if(!warning)return;
  const lanes=warning.lanes||[warning.y];
  const color=warning.kind==='grapple'?'#ffa8bd':'#ffd29a';
  for(const y of lanes){
   c.fillStyle=color+'28';c.fillRect(0,y-16,770,32);
   c.strokeStyle=color;c.setLineDash([8,10]);
   c.strokeRect(0,y-16,770,32);c.setLineDash([]);
   label(c,warning.kind==='grapple'?'MECHANICAL FIST':'CANNON LINE',748,y+4,11,color,'right');
  }
 }

 render(g,dt,{alpha=1}={}){
  this.load();
  const c=this.r.ctx,scale=this.r.canvas.width/W,p=g.board,t=g.stageTime;
  c.setTransform(scale,0,0,scale,0,0);
  this.scenery(c,blend(g.prevScroll,g.scroll,alpha),t);
  for(const o of g.obstacles)this.rock(c,o);
  for(const e of g.enemies){this.warning(c,e.warning);this.enemy(c,e);}
  for(const pickup of g.pickups){
   oval(c,pickup.x,pickup.y,16,16,'#c3f4b784');
   c.fillStyle='#285e56';c.fillRect(pickup.x-11,pickup.y-11,22,22);
   label(c,'+',pickup.x,pickup.y+6,18,'#dbffc4','center');
  }
  for(const s of g.shots){
   oval(c,s.x-7,s.y,13,3,s.color+'55');
   oval(c,s.x,s.y,5,4,s.color);
  }
  for(const s of g.projectiles){
   if(s.fist){
    shape(c,[[s.x-23,s.y-14],[s.x+3,s.y-21],[s.x+24,s.y-12],[s.x+23,s.y+13],
     [s.x-12,s.y+18],[s.x-26,s.y+9]],'#bdc4d4');
   }else{
    oval(c,s.x,s.y,10,8,'#da614b88');oval(c,s.x,s.y,5,5,'#ffcc83');
   }
  }
  if(p.invuln<=0||Math.floor(t*14)%2===0||this.r.reducedMotion){
   this.rider(c,g.partner,p,1,alpha,t);
   this.rider(c,p,p,0,alpha,t);
  }
  for(const e of g.effects){
   const progress=1-e.life/.62;
   oval(c,e.x,e.y,12+progress*(e.boss?105:32),8+progress*35,'#ffbd72'+(e.life>.28?'99':'44'));
  }
  if(g.pulse>0){
   c.save();c.globalAlpha=g.pulse/.62;c.strokeStyle='#d6f7ff';c.lineWidth=7;
   c.beginPath();c.arc(p.x,p.y,(1-g.pulse/.62)*1030+12,0,Math.PI*2);c.stroke();c.restore();
  }
  this.hud(c,g);
 }

 hud(c,g){
  const p=g.board,boss=g.enemies.find(e=>e.boss);
  c.fillStyle='#101d2beb';c.fillRect(16,14,928,65);c.fillRect(16,490,928,36);
  label(c,'WILYKAT + WILYKIT',30,37,18);
  label(c,'SPACE BOARDS   ×'+g.players[0].lives,30,59,11,'#ffc591');
  label(c,g.stage.sections[g.sectionIndex],480,37,16,'#ffe0ae','center');
  label(c,'SCORE '+String(g.score).padStart(7,'0'),480,59,10,'#cde4df','center');
  label(c,'TEAM ARMOR',719,35,10,'#e5eee6');
  c.fillStyle='#3f4651';c.fillRect(719,43,210,9);
  c.fillStyle=p.hp/p.maxHp>.3?'#8fdfc8':'#f9957c';c.fillRect(719,43,210*p.hp/p.maxHp,9);
  label(c,p.energy>=100?'TRICK PELLET BURST READY · L':'TRICK PELLET BURST · '+Math.floor(p.energy)+'%',30,507,11);
  c.fillStyle='#3f4651';c.fillRect(30,513,222,4);
  c.fillStyle='#ffd580';c.fillRect(30,513,222*p.energy/100,4);
  label(c,p.boostCd<=0?'K / I · BOOST READY':'BOOST '+p.boostCd.toFixed(1)+'s',370,511,11,'#a8e9eb','center');
  if(boss){
   label(c,'HAMMERHAND · PHASE '+(boss.phase+1)+'/3',701,506,11,'#ffc295','center');
   c.fillStyle='#543d46';c.fillRect(510,513,382,5);
   c.fillStyle='#e58b74';c.fillRect(510,513,382*boss.hp/boss.maxHp,5);
  }else label(c,g.bossDefeated?'COAST CLEAR':'COAST '+Math.floor(100*g.distance/g.stage.length)+'%',701,512,11,'#cbece2','center');
  if(g.banner>0){
   c.save();c.globalAlpha=clamp(Math.min(g.banner,4-g.banner)*2,0,1);
   c.fillStyle='#101d2bee';c.fillRect(199,168,562,108);
   label(c,'BERSERKER COAST',480,206,29,'#ffe3b2','center');
   label(c,'WASD / ARROWS · STEER     J / SPACE · THROW',480,234,12,'#e7f0e7','center');
   label(c,'K / I · BOOST     L · CHARGED PELLET BURST',480,255,11,'#bce4de','center');
   c.restore();
  }
 }
}
