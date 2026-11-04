import {HEROES,DIFFICULTIES,SPECIAL_CHARGE,clamp,seeded} from './data.js';
import {approach} from './combat.js';

export const VEHICLES=Object.freeze({
 thundertank:{name:'THUNDERTANK',row:0,hull:240,speed:245,width:104,height:128,fire:.22,power:24,boost:'OVERDRIVE',special:'CANNON BARRAGE',ground:true},
 thunderclaw:{name:'THUNDERCLAW',row:1,hull:175,speed:315,width:100,height:100,fire:.17,power:19,boost:'EVASIVE BURST',special:'CLAW SHOCKWAVE',ground:false},
 feliner:{name:'FELINER',row:2,hull:210,speed:275,width:142,height:132,fire:.21,power:23,boost:'AFTERBURNER',special:'LASER NOVA',ground:false}
});
export const VEHICLE_MISSIONS=[
 {id:'tank-run',name:'THUNDERTANK · CANYON RUN',tag:'Break the blockade',vehicle:'thundertank',terrain:0,length:10500,scrollSpeed:145,boss:'FISTPOUNDER',bossType:'fistpounder',sections:['CANYON ROAD','MUTANT MINEFIELD','PLUN-DARR BLOCKADE'],story:'Drive the Thundertank through the canyon. Break the NoseDiver blockade and defeat Monkian’s Fistpounder.'},
 {id:'claw-flight',name:'THUNDERCLAW · SKY CHASE',tag:'Take back the skies',vehicle:'thunderclaw',terrain:1,length:11800,scrollSpeed:175,boss:'SKYCUTTER COMMANDER',bossType:'skycutter',sections:['FOREST CANOPY','STORM PASS','SKYCUTTER SQUADRON'],story:'Pilot the ThunderClaw above Third Earth. Weave through cliffs and clouds, then defeat the Skycutter squadron.'},
 {id:'feliner-flight',name:'FELINER · ORBITAL ASSAULT',tag:'Intercept the Ratstar',vehicle:'feliner',terrain:2,length:13500,scrollSpeed:195,boss:'RATAR-O’S RATSTAR',bossType:'ratstar',sections:['LOW ORBIT','ASTEROID BELT','RATSTAR INTERCEPT'],story:'Launch the Feliner into orbit. Cross the asteroid belt and stop Ratar-O’s Ratstar before returning to the Black Pyramid.'}
].map(s=>({...s,mode:'vehicle',theme:s.id}));
const ENEMY={skycutter:{row:0,hp:66,width:73,height:88,speed:100,fire:2.1},nosediver:{row:1,hp:105,width:82,height:114,speed:86,fire:2.7},fistpounder:{row:2,hp:1800,width:220,height:205,speed:40,fire:.95},ratstar:{row:3,hp:2300,width:295,height:210,speed:30,fire:.85}};
let id=0;
export class VehicleGame{
 constructor({mission=VEHICLE_MISSIONS[0],pilot,difficulty='normal',onEvent=()=>{},seed=1985,score=0,kills=0,time=0,bestCombo=0}={}){
  this.mode='vehicle';this.stage=mission;this.spec=VEHICLES[mission.vehicle];this.rules=DIFFICULTIES[difficulty]||DIFFICULTIES.normal;this.difficulty=difficulty;this.onEvent=onEvent;this.random=seeded(seed);this.players=[{hero:0,hp:HEROES[0].hp,maxHp:HEROES[0].hp,lives:this.rules.lives,energy:0,kills:0,score:0,...pilot,slot:0}];this.status='playing';
  this.score=score;this.kills=kills;this.time=time;this.bestCombo=bestCombo;this.combo=0;this.comboTimer=0;this.stageTime=0;this.distance=0;this.prevDistance=0;this.scroll=0;this.prevScroll=0;this.tracks=[];this.trackClock=0;this.sectionIndex=0;this.banner=4;this.shake=0;
  this.ship={x:480,y:410,prevX:480,prevY:410,vx:0,vy:0,hp:this.spec.hull,maxHp:this.spec.hull,energy:0,invuln:2.5,fireCd:0,boost:0,boostCd:0,flash:0,tilt:0};
  this.enemies=[];this.shots=[];this.projectiles=[];this.obstacles=[];this.pickups=[];this.particles=[];this.texts=[];this.nextWave=350;this.nextHazard=1000;this.nextRepair=2100;this.bossStarted=false;this.bossDefeated=false;this.exitTime=0;this.wave=0;
 }
 emit(type,data={}){this.onEvent(type,data);}
 clearInput(){}
 burst(x,y,color,count=12){for(let i=0;i<count;i++)this.particles.push({x,y,vx:(this.random()-.5)*190,vy:(this.random()-.5)*190,life:.3+this.random()*.3,color,size:2+this.random()*4});}
 spawn(type,x,y=-90,boss=false){const s=ENEMY[type];const e={id:id++,type,row:s.row,x,y,prevX:x,prevY:y,baseX:x,age:0,width:boss?s.width* (type==='skycutter'?2.1:1):s.width,height:boss?s.height*(type==='skycutter'?1.8:1):s.height,hp:(boss&&type==='skycutter'?1500:s.hp)*this.rules.health,maxHp:0,boss,fireCd:boss?1.6:1.5+this.random(),flash:0,phase:0,shot:false};e.maxHp=e.hp;this.enemies.push(e);return e;}
 spawnFormation(){
  const type=this.stage.vehicle==='thundertank'?'nosediver':'skycutter',count=3+Math.min(2,this.sectionIndex),pattern=this.wave++%4;
  for(let i=0;i<count;i++){
   let x=140+i*(680/(count-1)),y=-80-i*55;if(pattern===1)x=200+i*120;if(pattern===2)x=i%2?800-i*40:150+i*40;if(pattern===3){x=210+(this.wave%2)*260+i*55;y=-80-i*95;}
   this.spawn(this.stage.vehicle==='thundertank'&&i===count-1&&this.sectionIndex>0?'skycutter':type,x,y);
  }
 }
 shoot(){
  const p=this.ship,s=this.spec;if(p.fireCd>0)return;p.fireCd=s.fire;
  for(const offset of [-s.width*.23,s.width*.23])this.shots.push({x:p.x+offset,y:p.y-s.height*.38,prevY:p.y-s.height*.38,vx:0,vy:-640,power:s.power,life:1.1});
  this.emit('vehicleShot');
 }
 special(){
  const p=this.ship;if(p.energy<100)return false;p.energy=0;p.invuln=Math.max(p.invuln,1);this.projectiles=[];
  this.pulse={time:0,x:p.x,y:p.y};this.shake=9;this.emit('tankFire');
  for(const e of this.enemies)if(e.y>-80&&e.y<570)this.hitEnemy(e,e.boss?Math.round(e.maxHp*.2):160,false);
  for(const o of this.obstacles){o.hp=0;this.burst(o.x,o.y,'#d5bd99');}return true;
 }
 hitEnemy(e,power,charge=true){
  if(e.hp<=0)return;e.hp=Math.max(0,e.hp-power);e.flash=.09;this.score+=power*5;this.players[0].score+=power*5;
  if(charge)this.ship.energy=clamp(this.ship.energy+SPECIAL_CHARGE.hit,0,100);
  this.combo++;this.comboTimer=1.8;this.bestCombo=Math.max(this.bestCombo,this.combo);this.burst(e.x,e.y,'#ffd687',3);
  if(e.hp<=0){this.kills++;this.players[0].kills++;this.score+=e.boss?5000:250;this.burst(e.x,e.y,e.boss?'#ffd1a0':'#f2a76c',e.boss?45:16);this.emit(e.boss?'bossDefeated':'break');
   if(e.boss){this.bossDefeated=true;this.projectiles=[];for(const minor of this.enemies)if(!minor.boss)minor.hp=0;this.shake=12;}
   else if(this.random()<.22)this.pickups.push({x:e.x,y:e.y,type:this.random()<.7?'repair':'power'});
  }
 }
 damage(power){
  const p=this.ship;if(p.invuln>0||p.hp<=0)return false;p.hp=Math.max(0,p.hp-power*this.rules.damage);p.invuln=.85;p.flash=.2;this.shake=6;this.combo=0;this.burst(p.x,p.y,'#ffb071',16);this.emit('hit',{player:true});
  if(p.hp<=0){const pilot=this.players[0];if(pilot.lives>0){pilot.lives--;p.hp=p.maxHp;p.invuln=3;p.boost=0;this.projectiles=[];this.emit('vehicleContinue');}else{pilot.hp=0;this.status='gameover';this.emit('gameover');}}return true;
 }
 enemyFire(e){
  const boss=e.boss,count=boss?(e.hp<e.maxHp*.5?7:5):1,p=this.ship,angle=Math.atan2(p.y-e.y,p.x-e.x);
  for(let i=0;i<count;i++){const a=angle+(i-(count-1)/2)*(boss?.23:0),speed=boss?170:155;this.projectiles.push({x:e.x,y:e.y+e.height*.3,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:boss?6:5,power:boss?22:15,life:5});}
  e.shot=true;e.flash=Math.max(e.flash,.05);
 }
 update(dt,inputs=[]){
  if(this.status!=='playing')return;dt=Math.min(dt,.04);const input=inputs[0]||{},p=this.ship,s=this.spec;this.time+=dt;this.stageTime+=dt;this.banner=Math.max(0,this.banner-dt);this.shake=Math.max(0,this.shake-dt*22);this.comboTimer-=dt;if(this.comboTimer<=0)this.combo=0;
  p.prevX=p.x;p.prevY=p.y;this.prevDistance=this.distance;for(const key of ['fireCd','boost','boostCd','flash','invuln'])p[key]=Math.max(0,p[key]-dt);
  if((input.jumpPressed||input.dodgePressed)&&p.boostCd<=0){p.boost=.65;p.boostCd=2.4;p.invuln=Math.max(p.invuln,.48);this.emit('dodge');}
  const mx=input.moveX??Number(!!input.right)-Number(!!input.left),my=input.moveY??Number(!!input.down)-Number(!!input.up),length=Math.max(1,Math.hypot(mx,my)),speed=s.speed*(p.boost>0?1.65:1);
  p.vx=approach(p.vx,mx/length*speed,2200*dt);p.vy=approach(p.vy,my/length*speed,2200*dt);p.x=clamp(p.x+p.vx*dt,70+s.width*.22,890-s.width*.22);p.y=clamp(p.y+p.vy*dt,145,470);p.tilt=approach(p.tilt,p.vx/s.speed,6*dt);
  if(input.attack||input.attackPressed)this.shoot();if(input.specialPressed)this.special();
  const scroll=this.bossStarted&&!this.bossDefeated?this.stage.scrollSpeed*.3:this.stage.scrollSpeed*(p.boost>0?1.25:1);
  this.prevScroll=this.scroll;this.scroll+=scroll*dt;this.trackClock+=scroll*dt;
  if(s.ground&&this.trackClock>16){this.trackClock=0;this.tracks.push({x:p.x,y:p.y+s.height*.36,scroll:this.scroll});}this.tracks=this.tracks.filter(t=>t.y+this.scroll-t.scroll<580);
  if(!this.bossStarted)this.distance=Math.min(this.stage.length-900,this.distance+scroll*dt);else if(this.bossDefeated)this.distance+=scroll*dt;
  const section=Math.min(2,Math.floor(this.distance/(this.stage.length/3)));if(section!==this.sectionIndex){this.sectionIndex=section;this.texts.push({text:this.stage.sections[section],life:2});}
  if(!this.bossStarted&&this.distance>=this.nextWave){this.spawnFormation();this.nextWave=this.distance+(this.difficulty==='hard'?440:610)-this.sectionIndex*40;}
  if(!this.bossStarted&&this.distance>=this.nextHazard){const gap=150+this.random()*660;for(let i=0;i<7;i++){const x=100+i*125;if(Math.abs(x-gap)<115)continue;this.obstacles.push({x,y:-80-i%2*50,r:21+this.random()*12,hp:48,type:this.stage.terrain===0?'mine':this.stage.terrain===1?'rock':'asteroid',seed:this.random()*6});}this.nextHazard=this.distance+1100-this.sectionIndex*100;}
  if(!this.bossStarted&&this.distance>=this.nextRepair){this.pickups.push({x:230+this.random()*500,y:-20,type:'repair'});this.nextRepair+=2100;}
  if(!this.bossStarted&&this.distance>=this.stage.length-900){this.bossStarted=true;this.spawn(this.stage.bossType,480,-150,true);this.texts.push({text:this.stage.boss,life:2.5});this.emit('encounter',{boss:true});}
  for(const e of this.enemies){e.prevX=e.x;e.prevY=e.y;e.age+=dt;e.flash=Math.max(0,e.flash-dt);e.fireCd-=dt;
   if(e.boss){e.y=approach(e.y,155,95*dt);e.x=480+Math.sin(e.age*.7)*235;}
   else{e.y+=(ENEMY[e.type].speed+scroll*.32)*dt;e.x=clamp(e.baseX+Math.sin(e.age*1.7+e.id)*55,60,900);}
   if(e.hp>0&&e.y>40&&e.y<410&&e.fireCd<.5&&e.fireCd>0)e.warning=true;else e.warning=false;
   if(e.hp>0&&e.y>45&&e.y<420&&e.fireCd<=0){this.enemyFire(e);e.fireCd=ENEMY[e.type].fire/(this.difficulty==='hard'?1.25:1);}
   if(e.hp>0&&Math.abs(e.x-p.x)<(e.boss?65:35)&&Math.abs(e.y-p.y)<(e.boss?65:42))this.damage(e.boss?35:24);
  }
  for(const shot of this.shots){shot.prevY=shot.y;shot.y+=shot.vy*dt;shot.life-=dt;
   const e=this.enemies.find(e=>e.hp>0&&Math.abs(e.x-shot.x)<e.width*.4&&shot.y<e.y+e.height*.4&&shot.prevY>e.y-e.height*.4);if(e){this.hitEnemy(e,shot.power);shot.life=0;}
   if(shot.life>0)for(const o of this.obstacles)if(o.hp>0&&Math.hypot(shot.x-o.x,shot.y-o.y)<o.r+8){o.hp-=shot.power;shot.life=0;if(o.hp<=0){this.burst(o.x,o.y,'#e3c7a2');this.score+=50;}break;}
  }
  for(const b of this.projectiles){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(Math.hypot(b.x-p.x,b.y-p.y)<22+b.r){if(this.damage(b.power))b.life=0;}}
  for(const o of this.obstacles){o.y+=scroll*dt;if(o.hp>0&&Math.hypot(o.x-p.x,o.y-p.y)<o.r+24){if(this.damage(28))o.hp=0;}}
  for(const pick of this.pickups){pick.y+=scroll*.8*dt;if(Math.hypot(pick.x-p.x,pick.y-p.y)<44){if(pick.type==='repair')p.hp=Math.min(p.maxHp,p.hp+45);else p.energy=Math.min(100,p.energy+SPECIAL_CHARGE.crystal);pick.used=true;this.emit('pickup');}}
  for(const q of this.particles){q.life-=dt;q.x+=q.vx*dt;q.y+=q.vy*dt;}
  for(const t of this.texts)t.life-=dt;if(this.pulse){this.pulse.time+=dt;if(this.pulse.time>.6)this.pulse=null;}
  this.enemies=this.enemies.filter(e=>e.hp>0&&e.y<650);this.shots=this.shots.filter(b=>b.life>0&&b.y>-40);this.projectiles=this.projectiles.filter(b=>b.life>0&&b.y<600&&b.x>-50&&b.x<1010);this.obstacles=this.obstacles.filter(o=>o.hp>0&&o.y<620);this.pickups=this.pickups.filter(o=>!o.used&&o.y<600);this.particles=this.particles.filter(q=>q.life>0);this.texts=this.texts.filter(t=>t.life>0);
  if(this.bossDefeated){this.exitTime+=dt;if(this.exitTime>3&&this.status==='playing'){this.status='stageclear';this.emit('stageclear');}}
 }
}
