import {DIFFICULTIES, SPECIAL_CHARGE, clamp} from './data.js';
import {approach} from './combat.js';

export const TUSKANIA_SPILLWAY = {
 id:'tuskania-spillway', mode:'hoverboard', name:'SPACE BOARDS · TUSKANIA SPILLWAY',
 title:'TUSKANIA SPILLWAY',
 story:'The Giant Technopede is headed for Tuskania’s water supply. WilyKat and WilyKit take their Space Boards through the spillway to intercept it.',
 sections:['HEADWATER BLUFFS','THE FLOODGATES','TUSKANIA RESERVOIR'],
 background:'assets/tuskania-spillway.png', bossArt:'assets/giant-technopede.png',
 length:9200, speed:218, bossType:'technopede', boss:'GIANT TECHNOPEDE', bossHp:1230
};

export const HOVERBOARD_MISSION = {
 id:'berserker-coast', mode:'hoverboard', name:'SPACE BOARDS · BERSERKER COAST',
 title:'BERSERKER COAST',
 story:'WilyKat and WilyKit skim the pirate coast on their Space Boards. Weave through sea stacks, fend off the raiders, and stop Hammerhand’s gunboat.',
 sections:['SUNSET BLUFFS','THE SEA STACKS','BERSERKER WATERS'],
 background:'assets/berserker-coast.png', bossArt:'assets/hammerhand-gunboat.png',
 length:11000, speed:235, bossType:'hammerhand', boss:'HAMMERHAND', bossHp:1700
};

// Vertical coordinates describe altitude on the side-view screen.
export class HoverboardGame {
 constructor({mission, pilot, difficulty='normal', onEvent=()=>{}, score=0, kills=0, time=0, bestCombo=0}){
  this.stage=mission;
  this.mode=mission.mode;
  this.rules=DIFFICULTIES[difficulty]||DIFFICULTIES.normal;
  this.players=[pilot];
  this.onEvent=onEvent;
  Object.assign(this,{score,kills,time,bestCombo,status:'playing',stageTime:0,distance:0,scroll:0,prevScroll:0,
   sectionIndex:0,nextWave:600,wave:0,banner:4,exitTime:0,bossStarted:false,bossDefeated:false,combo:0,comboTime:0,pulse:0});
  this.board={x:230,y:270,prevX:230,prevY:270,vx:0,vy:0,hp:180,maxHp:180,energy:0,fireCd:0,boostCd:0,boost:0,invuln:1.5};
  this.partner={x:148,y:300,prevX:148,prevY:300};
  this.enemies=[];
  this.shots=[];
  this.projectiles=[];
  this.obstacles=[];
  this.pickups=[];
  this.effects=[];
 }

 clearInput(){}

 spawnWave(){
  const pattern=this.wave++;
  const band=[155,255,365][pattern%3];
  for(let i=0;i<Math.round(3*this.rules.count);i++){
   this.enemies.push({type:i===1?'raider':'scout',x:1010+i*74,y:band+i*25,baseY:band+i*25,
    hp:i===1?48:24,age:0,fireCd:1.25+i*.26});
  }
  if(this.stage.id===TUSKANIA_SPILLWAY.id){
   if(this.sectionIndex>0||pattern%2===1){
    const opening=[221,337,258,311][pattern%4];
    this.obstacles.push({kind:'gate',x:1320,y:opening,gap:this.sectionIndex===2?154:180,width:90});
   }
  }else if(this.sectionIndex>0||pattern%2===1){
   const bottom=pattern%2===0;
   this.obstacles.push({x:1280,y:bottom?370:185,bottom,width:110});
   if(this.sectionIndex>0&&pattern%3===1)this.obstacles.push({x:1510,y:bottom?195:350,bottom:!bottom,width:96});
  }
  if(pattern%4===2)this.pickups.push({x:1440,y:pattern%2===0?205:337});
 }

 startBoss(){
  this.bossStarted=true;
  this.obstacles=[];
  this.pickups=[];
  const maxHp=Math.round(this.stage.bossHp*this.rules.health);
  this.enemies.push({type:this.stage.bossType,villain:this.stage.bossType,boss:true,
   x:1120,y:364,hp:maxHp,maxHp,phase:0,age:0,fireCd:1.5,volley:0,warning:null});
  this.onEvent('encounter',{boss:true});
 }

 shoot(){
  const p=this.board,kit=this.partner;
  if(p.fireCd>0)return;
  p.fireCd=.22;
  this.shots.push(
   {x:p.x+26,y:p.y-6,vx:630,vy:0,power:18,color:'#ffb15c'},
   {x:kit.x+24,y:kit.y-6,vx:680,vy:-38,power:12,color:'#7ee9ff'}
  );
  this.onEvent('vehicleShot');
 }

 special(){
  const p=this.board;
  if(p.energy<100)return;
  p.energy=0;
  this.pulse=.62;
  p.invuln=Math.max(p.invuln,.65);
  this.projectiles=[];
  for(const e of this.enemies)if(e.x<995)this.hit(e,e.boss?Math.round(e.maxHp*.22):e.hp,false);
  this.onEvent('tankFire');
 }

 hit(e,power,charge=true){
  if(e.hp<=0)return;
  e.hp=Math.max(0,e.hp-power);
  e.flash=.1;
  this.score+=power*5;
  if(charge)this.board.energy=clamp(this.board.energy+SPECIAL_CHARGE.hit,0,100);
  this.combo++;
  this.comboTime=1.65;
  this.bestCombo=Math.max(this.bestCombo,this.combo);
  if(e.hp>0)return;
  this.kills++;
  this.players[0].kills++;
  this.score+=e.boss?5000:250;
  this.effects.push({x:e.x,y:e.y,life:.62,boss:e.boss});
  this.onEvent(e.boss?'bossDefeated':'break');
  if(e.boss){
   this.bossDefeated=true;
   this.projectiles=[];
   for(const other of this.enemies)other.hp=0;
  }
 }

 damage(power){
  const p=this.board,pilot=this.players[0];
  if(p.invuln>0||this.bossDefeated)return;
  p.hp=Math.max(0,p.hp-power*this.rules.damage);
  p.invuln=.95;
  this.combo=0;
  this.onEvent('hit',{player:true});
  if(p.hp>0)return;
  if(pilot.lives>0){
   pilot.lives--;
   Object.assign(p,{hp:p.maxHp,invuln:2.6,vx:0,vy:0});
   this.projectiles=[];
   this.onEvent('vehicleContinue');
  }else{
   pilot.hp=0;
   this.status='gameover';
   this.onEvent('gameover');
  }
 }

 fire(x,y,angle,speed,power,kind){
  this.projectiles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,power,kind});
 }

 updateBoss(e,dt){
  const p=this.board;
  e.x=approach(e.x,790,155*dt);
  e.y=365+Math.sin(e.age*1.6)*(e.type==='technopede'?21:12);
  e.phase=e.hp<e.maxHp*.27?2:e.hp<e.maxHp*.63?1:0;
  if(e.x>865)return;
  if(e.type==='technopede'){
   this.updateTechnopede(e,dt);
   return;
  }
  if(e.warning){
   const warning=e.warning;
   warning.time-=dt;
   if(warning.time>0)return;
   if(warning.kind==='grapple'){
    // A straight mechanical fist leaves the other altitudes open.
    this.fire(e.x-55,warning.y,Math.PI,590,34,'fist');
   }else{
    for(const y of warning.lanes){
     this.fire(e.x-70,y,Math.PI,335+e.phase*42,23);
     this.fire(e.x-23,y,Math.PI,335+e.phase*42,23);
    }
   }
   e.warning=null;
   e.fireCd=1.25-e.phase*.24;
   this.onEvent('enemySwing');
   return;
  }
  if(e.fireCd>0)return;
  const volley=e.volley++;
  if(volley%3===0){
   const angle=Math.atan2(p.y-e.y,p.x-e.x);
   for(let i=-2;i<=2;i++)this.fire(e.x-65,e.y-15,angle+i*.23,215+e.phase*35,17);
   e.fireCd=1.5-e.phase*.2;
  }else if(e.phase>0&&volley%3===2){
   e.warning={kind:'grapple',y:clamp(p.y,145,421),time:.78};
  }else{
   const y=clamp(p.y,140,423);
   const lanes=e.phase===0?[y]:[y,y<282?y+110:y-110];
   e.warning={kind:'cannon',lanes,time:.93-e.phase*.08};
  }
 }

 updateTechnopede(e,dt){
  if(e.warning){
   e.warning.time-=dt;
   if(e.warning.time>0)return;
   for(const y of e.warning.lanes)this.fire(e.x-120,y,Math.PI,237+e.phase*25,21,'star-shell');
   e.warning=null;
   e.fireCd=1.65-e.phase*.2;
   this.onEvent('enemySwing');
   return;
  }
  if(e.fireCd>0)return;
  const y=clamp(this.board.y,155,414);
  const lanes=e.phase>0&&e.volley++%2===0?[y,y<287?y+114:y-114]:[y];
  e.warning={kind:'star-shell',lanes,time:1.04-e.phase*.09};
 }

 updateProjectiles(dt){
  const projectiles=this.projectiles,bursts=[],p=this.board;
  for(const shot of projectiles){
   shot.x+=shot.vx*dt;
   shot.y+=shot.vy*dt;
   const fist=shot.kind==='fist';
   if(Math.abs(p.x-shot.x)<(fist?38:22)&&Math.abs(p.y-shot.y)<(fist?31:20)){
    this.damage(shot.power);
    shot.spent=true;
    if(this.projectiles!==projectiles)return;
   }else if(shot.kind==='star-shell'&&shot.x<=482){
    bursts.push(shot);
    shot.spent=true;
   }
  }
  for(const shell of bursts){
   for(const offset of [-.72,-.36,0,.36,.72])this.fire(shell.x,shell.y,Math.PI+offset,275,13,'spark');
   this.effects.push({x:shell.x,y:shell.y,life:.36});
  }
 }

 update(dt,[input={}]=[]){
  if(this.status!=='playing')return;
  dt=Math.min(dt,.04);
  const p=this.board,kit=this.partner;
  this.time+=dt;
  this.stageTime+=dt;
  this.banner=Math.max(0,this.banner-dt);
  this.pulse=Math.max(0,this.pulse-dt);
  this.comboTime-=dt;
  if(this.comboTime<=0)this.combo=0;
  for(const timer of ['invuln','boost','boostCd','fireCd'])p[timer]=Math.max(0,p[timer]-dt);
  if((input.jumpPressed||input.dodgePressed)&&p.boostCd===0){
   p.boost=.55;
   p.boostCd=2.1;
   p.invuln=Math.max(p.invuln,.47);
   this.onEvent('dodge');
  }
  const mx=input.moveX??Number(!!input.right)-Number(!!input.left);
  const my=input.moveY??Number(!!input.down)-Number(!!input.up);
  const speed=(p.boost>0?405:268)/Math.max(1,Math.hypot(mx,my));
  p.prevX=p.x;p.prevY=p.y;kit.prevX=kit.x;kit.prevY=kit.y;
  p.vx=approach(p.vx,mx*speed,2300*dt);
  p.vy=approach(p.vy,my*speed,2300*dt);
  p.x=clamp(p.x+p.vx*dt,115,565);
  p.y=clamp(p.y+p.vy*dt,132,439);
  kit.x=approach(kit.x,p.x-78,420*dt);
  kit.y=approach(kit.y,clamp(p.y+31,152,456),310*dt);
  if(input.attack||input.attackPressed)this.shoot();
  if(input.specialPressed)this.special();

  const scrollSpeed=this.bossStarted?112:this.stage.speed;
  this.prevScroll=this.scroll;
  this.scroll+=scrollSpeed*dt;
  if(!this.bossStarted){
   this.distance=Math.min(this.stage.length,this.distance+scrollSpeed*dt);
   this.sectionIndex=Math.min(2,Math.floor(this.distance/(this.stage.length/3)));
   if(this.distance>=this.nextWave&&this.distance<this.stage.length-650){
    this.spawnWave();
    this.nextWave+=this.sectionIndex===2?690:820;
   }
   if(this.distance===this.stage.length)this.startBoss();
  }

  for(const e of this.enemies){
   if(e.hp<=0)continue;
   e.age+=dt;
   e.fireCd-=dt;
   e.flash=Math.max(0,(e.flash||0)-dt);
   if(e.boss){this.updateBoss(e,dt);continue;}
   e.x-=(e.type==='scout'?205:167)*dt;
   e.y=e.baseY+Math.sin(e.age*3+e.baseY)*27;
   if(e.fireCd<=0&&e.x>p.x+70&&e.x<900){
    this.fire(e.x-18,e.y,Math.atan2(p.y-e.y,p.x-e.x),245,13);
    e.fireCd=1.8;
   }
   if(Math.abs(p.x-e.x)<38&&Math.abs(p.y-e.y)<27)this.damage(17);
  }
  for(const shot of this.shots){
   shot.x+=shot.vx*dt;
   shot.y+=shot.vy*dt;
   const enemy=this.enemies.find(e=>e.hp>0&&(e.boss
    ?Math.abs(e.x-shot.x)<128&&Math.abs(e.y+18-shot.y)<60
    :Math.abs(e.x-shot.x)<31&&Math.abs(e.y-shot.y)<24));
   if(enemy){this.hit(enemy,shot.power);shot.spent=true;}
  }
  this.updateProjectiles(dt);
  for(const rock of this.obstacles){
   rock.x-=scrollSpeed*dt;
   if(rock.kind==='gate'){
    if(Math.abs(p.x-rock.x)<rock.width/2+12&&Math.abs(p.y-rock.y)>rock.gap/2-12)this.damage(26);
    continue;
   }
   const depth=rock.bottom?p.y-rock.y:rock.y-p.y;
   const halfWidth=Math.min(rock.width*.63,rock.width*.16+depth*.55);
   if(depth>8&&Math.abs(p.x-rock.x)<halfWidth+12)this.damage(30);
  }
  for(const pickup of this.pickups){
   pickup.x-=scrollSpeed*dt;
   if(Math.hypot(pickup.x-p.x,pickup.y-p.y)<30){
    p.hp=Math.min(p.maxHp,p.hp+45);
    pickup.used=true;
    this.onEvent('pickup');
   }
  }
  for(const effect of this.effects)effect.life-=dt;
  this.enemies=this.enemies.filter(e=>e.hp>0&&e.x>-80);
  this.shots=this.shots.filter(s=>!s.spent&&s.x<1090);
  this.projectiles=this.projectiles.filter(s=>!s.spent&&s.x>-50&&s.x<1060&&s.y>60&&s.y<550);
  this.obstacles=this.obstacles.filter(o=>o.x>-90);
  this.pickups=this.pickups.filter(o=>!o.used&&o.x>-30);
  this.effects=this.effects.filter(e=>e.life>0);
  if(this.bossDefeated){
   this.exitTime+=dt;
   if(this.exitTime>2.2&&this.status==='playing'){
    this.status='stageclear';
    this.onEvent('stageclear');
   }
  }
 }
}
