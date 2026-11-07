import {HEROES,STAGES,DIFFICULTIES,SUPPORTS,ENEMIES,SPECIAL_CHARGE,THUNDERTANK,PIT_FALL_DURATION,pitContains,sectionAt,clamp,dist,seeded} from './data.js';
import {ATTACKS,AIR_ATTACK,INPUT_BUFFER,GRAVITY,approach} from './combat.js';
let uid=0;
export class Game {
 constructor({heroes=[0],difficulty='normal',stage=0,stageSpec,onEvent=()=>{},seed=1985}={}){
  this.difficulty=DIFFICULTIES[difficulty]?difficulty:'normal';this.rules=DIFFICULTIES[this.difficulty];this.random=seeded(seed);this.onEvent=onEvent;
  this.players=heroes.slice(0,4).map((hero,i)=>({id:uid++,slot:i,hero,x:160+i*55,y:365+i*23,z:0,vz:0,face:1,hp:HEROES[hero].hp,maxHp:HEROES[hero].hp,energy:0,lives:this.rules.lives,action:'idle',timer:0,cooldown:0,specialCd:0,combo:0,comboTime:0,invuln:2,downTime:0,revive:0,kills:0,score:0,trail:[],pad:null}));
  this.score=0;this.kills=0;this.time=0;this.camera=0;this.shake=0;this.hitstop=0;this.status='playing';this.stageIndex=stage;this.stage=STAGES[stage];this.stageTime=0;this.combo=0;this.comboTimer=0;this.bestCombo=0;this.particles=[];this.texts=[];this.enemies=[];this.pickups=[];this.projectiles=[];this.props=[];this.encounter=-1;this.wave=0;this.gate=null;this.completed=new Set();this.banner=4;this.exitTime=0;this.pits=[];this.loadStage(stage,stageSpec);
 }
 emit(type,data={}){this.onEvent(type,data);}
 loadStage(index,stageSpec){
  this.stageIndex=index;this.stage=stageSpec||STAGES[index];this.stageTime=0;this.camera=0;this.encounter=-1;this.wave=0;this.gate=null;this.completed=new Set();this.enemies=[];this.projectiles=[];this.props=[];this.pickups=[];this.particles=[];this.texts=[];this.summons=[];this.call=null;this.banner=4.5;this.exitTime=0;this.environmentClock=3;
  this.pits=this.stage.pits.map(p=>({...p}));this.spawnQueue=[];this.zones=[];this.tank=null;this.traps=this.stage.traps.map((t,i)=>({...t,offset:i*1.3,active:false,warning:false}));this.sectionIndex=0;this.totalSpawned=0;
  this.scenery=[];const heights={lair:[220,95,175,245],forest:[275,90,110,205],ruins:[255,165,195,190],desert:[215,235,230,120],pyramid:[270,180,180,260]};
  for(let x=330;x<this.stage.length;x+=540+this.random()*190){const section=sectionAt(this.stage,x),col=section.decor[Math.floor(this.random()*section.decor.length)];this.scenery.push({x,y:335,col,height:heights[this.stage.theme][col]*(.86+this.random()*.25)});}
  for(let x=480;x<this.stage.length-500;x+=300+this.random()*250)this.props.push({id:uid++,x,y:345+this.random()*110,hp:36,type:this.stage.theme==='lair'?'crate':this.random()>.4?'urn':'crate',flash:0});
  this.hitstop=0;this.prevCamera=0;
  for(const [i,p] of this.players.entries()){
   p.x=145+i*45;p.y=365+i*24;p.z=0;p.vz=0;p.hp=Math.max(p.hp,p.maxHp*.65);
   Object.assign(p,{vx:0,vy:0,prevX:p.x,prevY:p.y,prevZ:0,animTime:0,walkPhase:0,actionTime:0,action:'idle',timer:0,invuln:2,downTime:0,buffer:{},attackTargets:new Set(),propTargets:new Set(),attackElapsed:0,attackDuration:0,comboTime:0,dodgeCd:0,landSquash:0,trail:[],revive:0,veil:0,fall:null,pitGrace:0,pitBlink:0,safeGround:{x:p.x,y:p.y}});
  }
  this.emit('stage',{index,stage:this.stage});
 }
 spawn(type,x,y,boss=false){
  const profile=ENEMIES[type]||{},n=this.players.length;let hp=(boss?(570+this.stageIndex*110)*(1.25+(this.stage.bossTier||1)*.1):profile.hp||65)*this.rules.health*(1+(n-1)*(boss?.7:.3));
  const e={id:uid++,type,x,y,z:0,vz:0,vx:0,vy:0,prevX:x,prevY:y,prevZ:0,animTime:0,walkPhase:0,actionTime:0,face:-1,hp,maxHp:hp,boss,action:'spawn',timer:.5,cooldown:.5+this.random(),invuln:0,flash:0,attackHit:false,attackTargets:new Set(),target:null,targetThink:0,dead:0,phase:0,speed:type==='brute'?78:boss?103:101+this.stageIndex*9,seed:this.random()*100};
  e.speed=boss?103:(profile.speed||106)+this.stageIndex*3;e.profile=profile;e.summonCd=6;e.guardBroken=0;e.guardPressure=0;e.hover=type==='bomber'?34:0;e.z=e.hover;e.prevZ=e.z;
  this.enemies.push(e);this.totalSpawned++;return e;
 }
 get encounterGates(){return this.stage.encounters;}
 get bossEncounter(){return this.encounterGates.length-1;}
 get maxActiveEnemies(){return 10+this.players.length*2;}
 get waveLimit(){const waves=this.stage.waves[this.encounter]||1;return this.difficulty==='story'?1:waves+(this.difficulty==='hard'&&this.encounter!==this.bossEncounter&&this.encounter%3===1?1:0);}
 fillSpawns(){while(this.spawnQueue.length&&this.enemies.filter(e=>e.hp>0).length<this.maxActiveEnemies){const e=this.spawnQueue.shift();this.spawn(e.type,e.x,e.y);}}
 beginEncounter(index){
  this.encounter=index;this.wave=1;this.gate=this.encounterGates[index];this.spawnQueue=[];this.spawnWave(index);this.emit('encounter',{boss:index===this.bossEncounter});
  if(index!==this.bossEncounter)this.announce(this.stage.objectives[index],this.stage.accent,2);
 }
 spawnWave(index){
  const boss=index===this.bossEncounter;const n=Math.ceil((4+this.stageIndex*.7+this.players.length*1.1)*this.rules.count)+(this.wave-1)*2;
  if(boss&&this.wave===1){this.spawn(this.stage.bossType,this.gate+330,375,true);if(this.stage.bossPair)this.spawn(this.stage.bossPair,this.gate+190,445,true);this.announce(this.stage.boss,'#f58768',2.5);this.drop(this.gate+60,350,'food');}
  const total=boss?Math.min(3+this.players.length,n):n,formation=this.stage.formations[index];
  for(let i=0;i<total;i++){const left=(i+index)%3===0,x=clamp(this.gate+(left?-170:350)+this.random()*90,this.camera+25,this.stage.length-60);this.spawnQueue.push({type:formation[(i+this.wave-1)%formation.length],x,y:340+this.random()*110});}
  this.fillSpawns();
 }
 announce(text,color='#f5d790',life=1.4){this.texts=this.texts.filter(t=>!t.screen||!t.big);this.texts.push({text,x:480,y:150,life,max:life,color,screen:true,big:true});}
 burst(x,y,color,count=10){for(let i=0;i<count;i++)this.particles.push({x,y,vx:(this.random()-.5)*240,vy:-this.random()*190,life:.25+this.random()*.4,max:.7,size:2+this.random()*3,color});}
 floating(text,x,y,color='#fff0bd'){this.texts.push({text,x,y,life:1,max:1,color});}
 damage(target,amount,from,knock=1,impact={}){
  if(target.hp<=0||target.invuln>0||target.action==='pitfall'||target.action==='dodge'||(target.hero===3&&target.veil>0))return false;
  const player='hero'in target;let blocked=player&&target.action==='guard'&&Math.sign(from.x-target.x)===target.face;
  const frontalGuard=!player&&target.type==='guard'&&target.guardBroken<=0&&!['hurt','attack','knockdown','rise'].includes(target.action)&&Math.sign(from.x-target.x)===target.face&&from.action!=='special'&&!from.summonDamage&&!impact.special;
  if(frontalGuard){
   if(impact.finisher||impact.air||++target.guardPressure>=3){target.guardBroken=2.4;target.guardPressure=0;this.floating('GUARD BREAK',target.x,target.y-105,'#f7d990');this.burst(target.x,target.y-45,'#e3e9bc',12);}
   else{amount*=.25;this.floating('SHIELD',target.x,target.y-98,'#b4d6e2');}
  }
  amount=Math.round(amount*(blocked?.16:1));target.hp=Math.max(0,target.hp-amount);target.invuln=player?(blocked?.2:.52):0;target.flash=.11;target.hitReact=.16;
  const push=(impact.push??knock*100)*(blocked?.18:target.boss?.22:1),direction=Math.sign(target.x-from.x||from.face||1);
  target.vx=direction*push;target.vy=0;
  if(!blocked){
   if(!target.boss||!['telegraph','attack'].includes(target.action)){target.action='hurt';target.timer=target.boss?.08:player?.22:.19;target.actionTime=0;}
   if(!player&&!target.boss&&impact.finisher){target.action='knockdown';target.timer=.65;target.actionTime=0;target.vz=250;target.invuln=.18;this.emit('launch');}
  }
  const heavy=!!impact.finisher;this.burst(target.x,target.y-target.z-38,blocked?'#83e6ea':heavy?'#ffeeb4':'#ffcd82',blocked?4:heavy?17:9);
  if(!blocked)this.particles.push({x:target.x,y:target.y-target.z-44,vx:0,vy:0,life:.105,max:.105,size:heavy?20:12,color:'#fff4cd',kind:'impact'});
  this.floating(blocked?'BLOCK':String(amount),target.x,target.y-target.z-65,player?'#ff9984':'#fff0bd');
  this.emit(blocked?'block':'hit',{player,slot:from.slot,heavy});this.shake=Math.max(this.shake,blocked?1.5:heavy?8:3.5);this.hitstop=Math.max(this.hitstop,blocked?.018:heavy?.06:.028);
  if(!player){this.combo++;this.comboTimer=2;this.bestCombo=Math.max(this.bestCombo,this.combo);this.score+=amount*10;from.score=(from.score||0)+amount*10;if('hero'in from&&from.action!=='special'&&!from.summonDamage&&!impact.special){const before=from.energy;from.energy=clamp(from.energy+(from.combo===2?SPECIAL_CHARGE.finisher:SPECIAL_CHARGE.hit),0,100);if(before<100&&from.energy>=100){this.floating('SPECIAL READY!',from.x,from.y-110,HEROES[from.hero].color);this.emit('charged',{hero:from.hero});}}}
  if(target.hp<=0){
   if(player){target.action='down';target.downTime=12;target.timer=0;target.z=0;this.emit('down');}
   else{target.action='dead';target.actionTime=0;target.dead=1;this.kills++;if('kills'in from)from.kills++;this.score+=target.boss?5000:250;this.burst(target.x,target.y-35,target.boss?'#a0e7d9':'#d9a569',20);if(target.boss){this.emit('bossDefeated');this.shake=12;for(let i=0;i<4;i++)this.drop(target.x+(i-2)*25,target.y+i*9,'gem');}else if(this.random()<.33)this.drop(target.x,target.y,this.random()<.5?'food':'energy');}
  }return true;
 }
 drop(x,y,type){this.pickups.push({id:uid++,x,y,type,life:30,t:this.random()*6});}
 addZone(x,y,r,power,kind='hex',delay=.8){this.zones.push({id:uid++,x,y,r,power,kind,delay,elapsed:0,detonated:false,life:delay+.4});}
 updateZones(dt,alive){
  for(const zone of this.zones){zone.elapsed+=dt;zone.life-=dt;if(!zone.detonated&&zone.elapsed>=zone.delay){zone.detonated=true;this.burst(zone.x,zone.y-8,zone.kind==='bomb'?'#ffc87a':'#8bf0b8',18);this.shake=Math.max(this.shake,4);for(const p of alive)if(Math.hypot(p.x-zone.x,(p.y-zone.y)*1.5)<zone.r&&p.z<32)this.damage(p,zone.power*this.rules.damage,{x:zone.x,y:zone.y,face:1},1.4);}}
  this.zones=this.zones.filter(z=>z.life>0);
  for(const trap of this.traps){const phase=(this.stageTime+trap.offset)%trap.period;trap.active=phase>trap.period-.7;trap.warning=phase>trap.period-1.8;
   if(trap.active)for(const p of alive)if(Math.hypot(p.x-trap.x,(p.y-trap.y)*1.5)<trap.r&&p.z<30)this.damage(p,trap.power*this.rules.damage,{x:trap.x,y:trap.y,face:1},.5);
  }
 }
 updateProjectiles(dt,alive){
  for(const s of this.projectiles){
   s.life-=dt;
   if(s.kind==='bomb'){s.elapsed+=dt;const t=clamp(s.elapsed/s.flight,0,1);s.x=s.fromX+(s.targetX-s.fromX)*t;s.y=s.fromY+(s.targetY-s.fromY)*t;s.z=52*(1-t)+220*t*(1-t);if(t>=1){s.life=0;this.addZone(s.targetX,s.targetY,76,s.power,'bomb',.12);}continue;}
   s.x+=s.vx*dt;s.y+=s.vy*dt;
   for(const p of alive)if(s.life>0&&Math.abs(p.x-s.x)<22&&Math.abs(p.y-s.y)<20&&p.z<55){if(this.damage(p,s.power*this.rules.damage,{x:s.x-Math.sign(s.vx)*30,face:Math.sign(s.vx)},1))s.life=0;}
  }
  this.projectiles=this.projectiles.filter(s=>s.life>0);
 }
 attack(p,special=false){
  if(p.hp<=0||p.action==='pitfall')return false;
  const h=HEROES[p.hero];if(special){if(p.energy<100||p.specialCd>0||(p.hero===2&&this.tank)){this.emit('empty');return false;}p.energy=0;p.specialCd=1.2;p.action='special';p.actionTime=0;p.timer=.8;p.invuln=1;this.shake=7;this.emit('special',{hero:p.hero});
   if(p.hero===0){this.callThunderCats(p);return true;}
   if(p.hero===1){p.timer=.52;p.specialTargets=new Set();this.burst(p.x,p.y-35,h.color,20);return true;}
   if(p.hero===2){this.callThundertank(p);return true;}
   if(p.hero===3)p.veil=5;
   for(const e of this.enemies)if(Math.abs(e.x-p.x)<255&&Math.abs(e.y-p.y)<95)this.damage(e,h.power*2.8,p,3);
   this.burst(p.x,p.y-35,h.color,35);return true;
  }
  const air=p.z>8||p.vz>0;if(air&&p.airAttackUsed)return false;if(air)p.airAttackUsed=true;
  p.combo=air?0:p.comboTime>0?(p.combo+1)%3:0;p.move=air?AIR_ATTACK:ATTACKS[p.hero][p.combo];
  p.comboTime=p.move.duration+.52;p.action=air?'airattack':'attack';p.actionTime=0;p.attackElapsed=0;p.attackDuration=p.move.duration;p.timer=p.move.duration;p.cooldown=0;p.attackFace=p.face;p.attackTargets=new Set();p.propTargets=new Set();p.attackHit=false;
  this.emit('swing',{hero:p.hero,combo:p.combo});return true;
 }
 clearInput(){for(const p of this.players)p.buffer={};}
 bufferInputs(dt,inputs){
  for(const p of this.players){p.buffer??={};if(p.action==='pitfall'){p.buffer={};continue;}const input=inputs[p.slot]||{};for(const action of ['attack','jump','special','dodge']){p.buffer[action]=Math.max(0,(p.buffer[action]||0)-dt);if(input[action+'Pressed']||(action==='attack'&&input.attack))p.buffer[action]=INPUT_BUFFER;}}
 }
 strikeEnemies(p){
  const h=HEROES[p.hero],move=p.move;if(!move)return;
  const reach=h.reach+(p.action==='airattack'?18:0),lane=p.combo===2?43:34;
  for(const e of this.enemies){
   if(p.attackTargets.has(e.id)||e.hp<=0)continue;const dx=(e.x-p.x)*p.attackFace;
   if(dx>=-22&&dx<=reach&&Math.abs(e.y-p.y)<=lane&&Math.abs(e.z-p.z)<80){
    if(this.damage(e,h.power*move.power,p,1,{push:move.knock,finisher:p.combo===2&&p.action!=='airattack',air:p.action==='airattack'})){p.attackTargets.add(e.id);p.attackHit=true;}
   }
  }
  for(const prop of this.props){const dx=(prop.x-p.x)*p.attackFace;if(prop.hp<=0||p.propTargets.has(prop.id)||dx< -20||dx>reach||Math.abs(prop.y-p.y)>40||p.z>55)continue;
   p.propTargets.add(prop.id);prop.hp-=h.power*move.power;prop.flash=.16;this.burst(prop.x,prop.y-20,'#c5a57a',7);
   if(prop.hp<=0){this.drop(prop.x,prop.y,this.random()<.55?'food':'energy');this.score+=100;this.emit('break');}
  }
 }
 callThunderCats(p){
  p.timer=1.5;p.invuln=3.5;p.z=0;p.vz=0;this.call={time:0,duration:3.7,source:p,hit:false};this.projectiles=[];
  const occupied=new Set(this.players.map(player=>player.hero));const roster=HEROES.map((h,hero)=>({name:h.name,hero})).filter(h=>!occupied.has(h.hero)).concat(SUPPORTS.map((s,support)=>({name:s.name,support})));
  this.summons=roster.map((h,i)=>({...h,id:uid++,x:this.camera-60-i*30,y:350+(i%5)*24,z:0,face:1,hp:1,action:'walk',timer:0,combo:i%3,delay:i*.085,life:3.7,seed:i,hit:false}));
  this.texts=this.texts.filter(t=>!t.screen);this.texts.push({text:'THUNDERCATS, HO!',x:480,y:287,life:2.4,max:2.4,color:'#f7d684',screen:true,big:true});this.emit('call');
 }
 callThundertank(p){
  p.timer=.65;p.invuln=1.8;p.z=0;p.vz=0;
  this.tank={source:p,time:0,x:this.camera-320,prevX:this.camera-320,y:THUNDERTANK.lane,width:THUNDERTANK.width,travel:0,volleys:0,bolts:[],flash:0,dust:0};
  this.announce('THUNDERTANK — OPEN FIRE!',HEROES[2].color,1.8);this.emit('tankEngine');
 }
 updateThundertank(dt){
  const tank=this.tank;if(!tank)return;const spec=THUNDERTANK;
  tank.prevX=tank.x;tank.time+=dt;tank.flash=Math.max(0,tank.flash-dt);tank.dust-=dt;
  const enter=clamp(tank.time/spec.arrival,0,1),leave=clamp((tank.time-spec.departure)/(spec.duration-spec.departure),0,1);
  if(tank.time>=spec.departure&&tank.time-dt<spec.departure)this.emit('tankEngine');
  tank.x=this.camera-320+560*(1-(1-enter)**3)+1100*leave*leave;
  tank.travel+=Math.abs(tank.x-tank.prevX);
  if((enter<1||leave>0)&&tank.dust<=0){tank.dust=.08;this.particles.push({x:tank.x-spec.width*.38,y:tank.y-5,vx:-75,vy:-25,life:.4,max:.4,size:9,color:'#b4b3a27a',kind:'dust'});}
  if(tank.volleys<spec.volleys&&tank.time>=spec.firstVolley+tank.volleys*spec.volleyInterval){
   tank.volleys++;tank.flash=.16;this.shake=Math.max(this.shake,5);this.emit('tankFire');
   const targets=this.enemies.filter(e=>e.hp>0&&e.x>=this.camera&&e.x<=this.camera+960);
   for(const [i,target] of targets.entries()){
    const front=i%2===1&&target.x>tank.x+160,fromX=tank.x+(front?205:157),fromY=tank.y-(front?74:200);
    tank.bolts.push({target,fromX,fromY,x:fromX,y:fromY,prevX:fromX,prevY:fromY,targetX:target.x,targetY:target.y-target.z-48,elapsed:0,flight:.16+Math.min(.25,Math.abs(target.x-fromX)/2400),power:target.boss?Math.round(target.maxHp*.08):HEROES[2].power*2.4,hit:false});
   }
  }
  for(const bolt of tank.bolts){
   bolt.elapsed+=dt;bolt.prevX=bolt.x;bolt.prevY=bolt.y;
   if(!bolt.hit){if(bolt.target.hp>0){bolt.targetX=bolt.target.x;bolt.targetY=bolt.target.y-bolt.target.z-48;}
    const t=clamp(bolt.elapsed/bolt.flight,0,1);bolt.x=bolt.fromX+(bolt.targetX-bolt.fromX)*t;bolt.y=bolt.fromY+(bolt.targetY-bolt.fromY)*t;
    if(t===1){bolt.hit=true;if(bolt.target.hp>0){bolt.target.invuln=0;this.damage(bolt.target,bolt.power,tank.source,1.5,{special:true});}this.burst(bolt.x,bolt.y,'#fbe4a0',7);}
   }
  }
  tank.bolts=tank.bolts.filter(b=>b.elapsed<b.flight+.16);
  if(tank.time>spec.duration&&!tank.bolts.length)this.tank=null;
 }
 updateSummons(dt){
  if(!this.call)return;const call=this.call;call.time+=dt;
  for(const ally of this.summons){ally.life-=dt;if(call.time<ally.delay)continue;const target=this.enemies.find(e=>e.hp>0&&!e.boss&&Math.abs(e.y-ally.y)<45)||this.enemies.find(e=>e.hp>0);const tx=target?target.x:this.camera+1030;const t=call.time-ally.delay;
   ally.x+=dt*(t<1.5?470:350);ally.action=target&&Math.abs(tx-ally.x)<130?'attack':'walk';ally.timer=.12;ally.combo=Math.floor(t*6)%3;ally.animTime=t;ally.walkPhase=t*2.7%1;if(ally.hero!==undefined){ally.move=ATTACKS[ally.hero][ally.combo];ally.attackElapsed=t%ally.move.duration;}
   if(ally.support!==undefined&&SUPPORTS[ally.support].small)ally.z=14+Math.sin(t*7)*8;
   if(ally.action==='attack'&&Math.floor(t*20)%4===0)this.burst(ally.x+30,ally.y-40,'#f7d687',3);
  }
  if(!call.hit&&call.time>.95){call.hit=true;const source=call.source;source.summonDamage=true;for(const e of this.enemies)if(e.hp>0&&e.x>=this.camera-80&&e.x<=this.camera+1060){e.invuln=0;this.damage(e,e.boss?Math.round(e.maxHp*.28):e.hp+1,source,2);}source.summonDamage=false;this.projectiles=[];this.shake=14;this.emit('thunderImpact');}
  this.summons=this.summons.filter(s=>s.life>0&&s.x<this.camera+1170);if(call.time>call.duration){this.call=null;this.summons=[];}
 }
 beginPitFall(p,pit){
  const minX=this.camera+35,maxX=Math.min(this.stage.length-65,this.camera+915,this.gate===null?Infinity:this.gate+470);
  const candidates=[p.safeGround,{x:pit.x-36,y:p.y},{x:p.x,y:pit.y-28},{x:pit.x+pit.w+36,y:p.y},{x:p.x,y:330}].filter(Boolean).map(q=>({x:clamp(q.x,minX,maxX),y:clamp(q.y,330,460)}));
  const safe=candidates.find(q=>Math.hypot(q.x-p.x,q.y-p.y)<260&&!this.pits.some(h=>pitContains(h,q.x,q.y,18)))||{x:clamp(p.x,minX,maxX),y:330};
  p.fall={pit:{...pit},elapsed:0,duration:PIT_FALL_DURATION,respawn:safe};p.action='pitfall';p.actionTime=0;p.timer=PIT_FALL_DURATION;p.vx=p.vy=p.vz=p.z=0;p.invuln=0;p.comboTime=0;p.buffer={};p.trail=[];this.emit('pitFall');
 }
 updatePitFall(p,dt){
  const fall=p.fall;fall.elapsed+=dt;p.buffer={};if(fall.elapsed<fall.duration)return;
  const damage=Math.ceil(p.maxHp*.22);p.hp=Math.max(0,p.hp-damage);p.x=p.prevX=fall.respawn.x;p.y=p.prevY=fall.respawn.y;p.z=p.prevZ=p.vz=p.vx=p.vy=0;
  p.action=p.hp>0?'idle':'down';p.actionTime=0;p.timer=0;p.fall=null;p.safeGround={x:p.x,y:p.y};p.invuln=1;p.pitGrace=1;p.pitBlink=1;p.flash=0;p.landSquash=0;p.airAttackUsed=false;
  this.floating('-'+damage,p.x,p.y-75,'#ffb298');this.emit('pitReturn');if(p.hp<=0){p.downTime=12;this.emit('down');}
 }
 playerUpdate(p,input,dt){
  const h=HEROES[p.hero];p.animTime+=dt;p.actionTime+=dt;p.invuln=Math.max(0,p.invuln-dt);p.flash=Math.max(0,(p.flash||0)-dt);p.hitReact=Math.max(0,(p.hitReact||0)-dt);p.cooldown=Math.max(0,p.cooldown-dt);p.dodgeCd=Math.max(0,p.dodgeCd-dt);p.specialCd=Math.max(0,p.specialCd-dt);p.comboTime-=dt;p.veil=Math.max(0,(p.veil||0)-dt);p.timer=Math.max(0,p.timer-dt);p.landSquash=Math.max(0,p.landSquash-dt);
  p.pitGrace=Math.max(0,(p.pitGrace||0)-dt);p.pitBlink=Math.max(0,(p.pitBlink||0)-dt);
  if(p.action==='pitfall'&&p.fall){this.updatePitFall(p,dt);return;}
  if(p.hp<=0){
   if(p.action==='out')return;
   p.downTime-=dt;let helping=false;
   for(const mate of this.players)if(mate.hp>0&&dist(mate,p)<95&&this.inputs[mate.slot]?.revive){helping=true;p.revive+=dt;mate.action='revive';mate.timer=.1;}
   if(!helping)p.revive=Math.max(0,p.revive-dt*.5);
   if(p.revive>=2){p.hp=p.maxHp*.45;p.revive=0;p.action='idle';p.actionTime=0;p.invuln=3;p.vx=p.vy=0;this.floating('REVIVED',p.x,p.y-70,'#bce79f');this.emit('revive');}
   else if(p.downTime<=0){if(p.lives>0){p.lives--;p.hp=p.maxHp;p.energy=0;p.action='idle';p.invuln=3;p.vx=p.vy=p.vz=0;p.x=clamp(p.x,this.camera+90,this.camera+750);p.y=400;p.buffer={};this.announce(h.name+' RETURNS');}else{p.action='out';}}
   return;
  }
  let dx=Number.isFinite(input.moveX)?input.moveX:Number(!!input.right)-Number(!!input.left),dy=Number.isFinite(input.moveY)?input.moveY:Number(!!input.down)-Number(!!input.up);
  const magnitude=Math.hypot(dx,dy);if(magnitude>1){dx/=magnitude;dy/=magnitude;}
  let striking=['attack','airattack'].includes(p.action);
  if(striking){
   p.attackElapsed+=dt;p.timer=Math.max(0,p.attackDuration-p.attackElapsed);p.face=p.attackFace;
   const active=p.attackElapsed>=p.move.startup&&p.attackElapsed<p.move.startup+p.move.active;
   if(active)this.strikeEnemies(p);
   const recovering=p.attackElapsed>=p.move.startup+p.move.active;
   const cancel=recovering&&(p.buffer.dodge>0||p.buffer.jump>0||p.buffer.special>0||input.guard);
   if(p.timer<=0||cancel||(p.timer<.025&&p.buffer.attack>0)){p.action='idle';p.actionTime=0;striking=false;}
  }
  if(p.timer<=0&&['special','dodge','hurt','revive','land'].includes(p.action)){p.action='idle';p.actionTime=0;}
  let locked=striking||(['special','dodge','hurt','revive','land'].includes(p.action)&&p.timer>0);
  if(!locked){
   if(Math.abs(dx)>.05)p.face=Math.sign(dx);
   if(p.buffer.special>0){p.buffer.special=0;locked=this.attack(p,true);}
   if(!locked&&p.buffer.dodge>0&&p.dodgeCd<=0){
    p.buffer.dodge=0;p.action='dodge';p.actionTime=0;p.timer=.30;p.dodgeCd=.55;p.invuln=Math.max(p.invuln,.31);const norm=Math.hypot(dx,dy);
    p.dodgeX=norm>.05?dx/norm:p.face;p.dodgeY=norm>.05?dy/norm:0;this.emit('dodge');locked=true;
   }
   if(!locked&&input.guard&&p.z===0){p.action='guard';}
   else if(!locked){
    if(p.buffer.jump>0&&p.z===0){p.buffer.jump=0;p.vz=410;p.z=.01;p.airAttackUsed=false;p.action='jump';p.actionTime=0;this.emit('jump');}
    else p.action=p.z>0?'jump':Math.hypot(dx,dy)>.03?'walk':'idle';
    if(p.buffer.attack>0){p.buffer.attack=0;locked=this.attack(p);}
   }
  }
  if(p.action==='dodge'){
   const speed=460-220*clamp(p.actionTime/.3,0,1);p.vx=p.dodgeX*speed;p.vy=p.dodgeY*speed*.62;
  }else if(['attack','airattack'].includes(p.action)){
   const active=p.attackElapsed>=p.move.startup&&p.attackElapsed<p.move.startup+p.move.active;
   if(p.z>0){p.vx=approach(p.vx,dx*h.speed*.8,1600*dt);p.vy=approach(p.vy,dy*h.speed*.38,1200*dt);}
   else{p.vx=active?p.attackFace*p.move.lunge:approach(p.vx,0,2600*dt);p.vy=approach(p.vy,0,2600*dt);}
  }else if(p.action==='hurt'){
   p.vx=approach(p.vx,0,650*dt);p.vy=approach(p.vy,0,650*dt);
  }else if(p.action==='special'&&p.hero===1){
   p.vx=p.actionTime<.33?p.face*650:approach(p.vx,0,4500*dt);p.vy=approach(p.vy,0,2600*dt);
   if(p.actionTime<.4)for(const e of this.enemies)if(!p.specialTargets.has(e.id)&&(e.x-p.x)*p.face>=-35&&(e.x-p.x)*p.face<105&&Math.abs(e.y-p.y)<50){if(this.damage(e,h.power*2.8,p,2.5))p.specialTargets.add(e.id);}
  }else if(['special','revive'].includes(p.action)){p.vx=approach(p.vx,0,2600*dt);p.vy=approach(p.vy,0,2600*dt);}
  else{
   const guard=p.action==='guard',speed=guard?0:h.speed*(this.stage.mud&&p.y>410&&p.z===0?.74:1),braking=Math.hypot(dx,dy)<.03;
   p.vx=approach(p.vx,dx*speed,(braking?(this.stage.ice&&p.z===0?440:4200):dx*p.vx<0?6000:p.z>0?1700:3000)*dt);
   p.vy=approach(p.vy,dy*speed*(p.z>0?.38:.62),(braking?4200:dy*p.vy<0?5000:2600)*dt);
  }
  const oldX=p.x,oldY=p.y;p.x+=p.vx*dt;p.y+=p.vy*dt;
  if(!['hurt','special','guard'].includes(p.action)){if(this.stage.wind)p.x+=this.stage.wind*Math.sin(this.stageTime*.7)*dt;if(this.stage.conveyor&&p.z===0)p.x+=(p.y>405?-40:40)*dt;}
  if(p.vz||p.z){p.z+=p.vz*dt;p.vz-=GRAVITY*dt;if(p.z<=0){
   p.z=0;p.vz=0;p.airAttackUsed=false;p.landSquash=.13;this.emit('land');
   for(let i=0;i<5;i++)this.particles.push({x:p.x,y:p.y,vx:(i-2)*24,vy:-10,life:.23,max:.23,size:4,color:'#cfbb97',kind:'dust'});
   if(['jump','walk','idle','airattack'].includes(p.action)){p.action='land';p.timer=.055;p.actionTime=0;}
  }}
  p.x=clamp(p.x,this.camera+25,Math.min(this.stage.length-65,this.camera+925,this.gate===null?Infinity:this.gate+480));p.y=clamp(p.y,330,464);
  const travelled=Math.hypot(p.x-oldX,(p.y-oldY)/.62);if(p.action==='walk')p.walkPhase=(p.walkPhase+travelled/(p.hero===1?91:100))%1;
  const pit=p.z<8&&p.pitGrace<=0?this.pits.find(h=>pitContains(h,p.x,p.y)):null;
  if(pit){this.beginPitFall(p,pit);return;}
  if(p.z===0&&!this.pits.some(h=>pitContains(h,p.x,p.y,28)))p.safeGround={x:p.x,y:p.y};
  if(p.action==='walk'||p.action==='dodge'){p.trail.push({x:p.x,y:p.y,z:p.z,life:.15});if(p.trail.length>6)p.trail.shift();}p.trail.forEach(t=>t.life-=dt);p.trail=p.trail.filter(t=>t.life>0);
  for(const pick of this.pickups)if(pick.life>0&&p.z<30&&Math.abs(pick.x-p.x)<28&&Math.abs(pick.y-p.y)<25){pick.life=0;if(pick.type==='food'){p.hp=Math.min(p.maxHp,p.hp+38);this.floating('+38 HEALTH',p.x,p.y-65,'#bde49e');}else if(pick.type==='energy'){p.energy=Math.min(100,p.energy+SPECIAL_CHARGE.crystal);this.floating('+'+SPECIAL_CHARGE.crystal+' POWER',p.x,p.y-65,'#a4dfef');}else{this.score+=500;this.floating('+500',p.x,p.y-65,'#ffe9a3');}this.emit('pickup');}
 }
 updateEnvironment(dt,alive){
  this.environmentClock-=dt;if(!this.stage.hazard||this.environmentClock>0||!alive.length)return;this.environmentClock=6.5;
  const p=alive[0],kind=this.stage.hazard,power=kind==='poison'?12:17;
  this.addZone(clamp(p.x+70,this.camera+35,this.camera+920),clamp(p.y,340,455),kind==='shell'?68:76,power,kind,1.35);
  if(kind==='spirit')this.addZone(clamp(p.x-120,this.camera+35,this.camera+920),p.y>400?360:445,65,16,kind,1.65);
 }
 bossUpdate(e,target,alive,dt){
  const nextPhase=e.hp<e.maxHp*.25?2:e.hp<e.maxHp*.62?1:0;
  if(nextPhase>e.phase){e.phase=nextPhase;e.invuln=.45;e.action='recover';e.timer=.75;e.actionTime=0;e.vx=0;e.cooldown=.8;this.announce(e.type.toUpperCase()+' · PHASE '+(e.phase+1),'#f6ba83',1.4);this.burst(e.x,e.y-70,'#c9a6f5',22);for(let i=0;i<2;i++)if(this.enemies.filter(a=>a.hp>0).length<this.maxActiveEnemies)this.spawn(e.type==='mummra'?'shaman':i?'lancer':'scout',clamp(e.x+(i?130:-130),this.camera+45,this.camera+880),i?350:450);}
  if(e.action==='recover'){if(e.timer<=0){e.action='idle';e.cooldown=.25;}return;}
  if(e.action==='telegraph'){if(e.timer<=0){e.action='attack';e.actionTime=0;e.timer=e.attackKind==='rush'?.75:.55;e.attackHit=false;e.attackTargets=new Set();this.emit('enemySwing');}return;}
  if(e.action==='attack'){
   if(e.attackKind==='rush'&&e.actionTime>.1&&e.actionTime<.55){e.vx=e.face*(340+e.phase*45);for(const p of alive)if(!e.attackTargets.has(p.id)&&(p.x-e.x)*e.face>-30&&(p.x-e.x)*e.face<100&&Math.abs(p.y-e.y)<38&&p.z<40)if(this.damage(p,25*this.rules.damage,e,1.6))e.attackTargets.add(p.id);}
   else if(e.actionTime>.1&&!e.attackHit){
    e.attackHit=true;const ax=clamp(e.aimX,this.camera+40,this.camera+900),ay=clamp(e.aimY,340,455),kind=e.attackKind;
    if(kind==='melee'){for(const p of alive)if((p.x-e.x)*e.face>-25&&(p.x-e.x)*e.face<140&&Math.abs(p.y-e.y)<44&&p.z<48)this.damage(p,26*this.rules.damage,e,1.8);}
    if(kind==='slam'){this.shake=10;this.addZone(e.x,e.y,165,28,'shockwave',.3);if(e.phase>0)for(const side of [-1,1])this.addZone(clamp(e.x+side*190,this.camera+35,this.camera+920),e.y,95,20,'shockwave',.8);}
    if(kind==='rockfall'||kind==='bombard'){for(let i=0;i<3+e.phase;i++)this.addZone(clamp(ax+(i-1)*100,this.camera+35,this.camera+920),i%2?350:440,58,22,kind==='rockfall'?'stone':'bomb',.7+i*.16);}
    if(kind==='venom'){for(let i=0;i<2+e.phase;i++)this.addZone(clamp(ax+(i-1)*90,this.camera+35,this.camera+920),clamp(ay+(i%2?35:-25),335,460),65,18,'poison',.85+i*.12);}
    if(kind==='hex'){for(let i=0;i<3+e.phase;i++)this.addZone(clamp(ax+(i-1)*110,this.camera+35,this.camera+920),i%2?350:445,65,21,'spirit',.9+i*.1);}
    if(kind==='shot'){const angle=Math.atan2((ay-e.y)*1.7,ax-e.x),count=3+e.phase*2;for(let i=0;i<count;i++){const a=angle+(i-(count-1)/2)*.22;this.projectiles.push({x:e.x,y:e.y,z:32,vx:Math.cos(a)*235,vy:Math.sin(a)*135,life:4,power:20,boss:true});}}
    if(kind==='summon'){for(const [i,type] of ['guard','shaman'].entries())if(this.enemies.filter(a=>a.hp>0).length<this.maxActiveEnemies)this.spawn(type,clamp(e.x+(i?150:-150),this.camera+40,this.camera+890),i?350:450);}
    if(kind==='teleport'){this.addZone(e.x,e.y,100,20,'spirit',.85);e.x=e.prevX=clamp(ax-(ax<this.camera+480?-190:190),this.camera+55,this.camera+880);e.y=e.prevY=ay>400?350:445;this.burst(e.x,e.y-50,'#b99dee',25);}
   }
   if(e.timer<=0){e.vx=0;e.action='recover';e.actionTime=0;e.timer=.45;e.cooldown=Math.max(.45,1.15-e.phase*.24);}return;
  }
  const scripts={slythe:['melee','rush','venom','slam'],monkian:['slam','rockfall','rush','shot'],jackalman:['rush','shot','bombard','melee'],mummra:['hex','shot','summon','teleport']},script=scripts[e.type]||scripts.slythe;
  e.face=target.x>=e.x?1:-1;
  const otherWindup=this.enemies.some(other=>other.id!==e.id&&other.boss&&other.hp>0&&other.action==='telegraph');
  if(e.cooldown<=0&&dist(e,target)<550&&!otherWindup){e.attackCycle=(e.attackCycle??-1)+1;e.attackKind=script[e.attackCycle%script.length];if(e.phase===2&&e.attackCycle%3===2)e.attackKind=e.type==='mummra'?'hex':e.type==='monkian'?'rockfall':'rush';if(e.attackKind==='melee'&&dist(e,target)>155)e.attackKind='rush';e.action='telegraph';e.actionTime=0;e.timer=.8-e.phase*.09;e.aimX=target.x;e.aimY=target.y;return;}
  const dx=target.x-e.x,dy=target.y-e.y,ideal=e.type==='mummra'?235:95;e.action='walk';if(Math.abs(dx)>ideal)e.x+=Math.sign(dx)*(100+e.phase*15)*dt;if(Math.abs(dy)>12)e.y+=Math.sign(dy)*65*dt;
  e.x=clamp(e.x,this.camera+30,Math.min(this.camera+920,this.gate===null?Infinity:this.gate+450));e.y=clamp(e.y,335,460);
 }
 enemyUpdate(e,dt){
  const profile=e.profile||{};e.animTime+=dt;e.actionTime+=dt;e.hitReact=Math.max(0,(e.hitReact||0)-dt);e.invuln=Math.max(0,e.invuln-dt);e.flash=Math.max(0,e.flash-dt);e.cooldown-=dt;e.timer-=dt;e.targetThink-=dt;e.guardBroken=Math.max(0,e.guardBroken-dt);e.summonCd-=dt;
  e.x+=e.vx*dt;e.y+=e.vy*dt;e.vx=approach(e.vx,0,(e.z>0?180:600)*dt);e.vy=approach(e.vy,0,600*dt);
  if(e.hover&&e.hp>0&&!['knockdown','rise'].includes(e.action)){e.z=e.hover+Math.sin(e.animTime*4)*4;e.vz=0;}
  else if(e.z>0||e.vz){e.z+=e.vz*dt;e.vz-=GRAVITY*dt;if(e.z<=0){e.z=0;e.vz=0;}}
  e.x=clamp(e.x,this.camera+8,Math.min(this.camera+950,this.stage.length-25,this.gate===null?Infinity:this.gate+450));e.y=clamp(e.y,330,464);
  if(e.hp<=0){e.dead-=dt;return;}
  const alive=this.players.filter(p=>p.hp>0&&p.action!=='pitfall');if(!alive.length)return;
  let target=alive.find(p=>p.id===e.target);
  if(!target||(e.targetThink<=0&&!['attack','telegraph'].includes(e.action))){
   const cost=p=>dist(p,e)+this.enemies.filter(other=>other.id!==e.id&&other.target===p.id&&other.hp>0).length*27;
   target=alive.reduce((a,b)=>cost(a)<cost(b)?a:b);e.target=target.id;e.targetThink=.4;
  }
  if(e.action==='knockdown'){if(e.timer<=0&&e.z===0){e.action='rise';e.actionTime=0;e.timer=.23;e.invuln=.25;}return;}
  if(e.action==='rise'){if(e.timer<=0){e.action='idle';e.actionTime=0;e.cooldown=.35;}return;}
  if(e.action==='hurt'&&e.timer>0)return;
  if(e.action==='spawn'&&e.timer>0)return;
  if(e.boss){this.bossUpdate(e,target,alive,dt);return;}
  if(e.action==='telegraph'){
   if(e.timer<=0){
    e.action='attack';e.actionTime=0;e.timer=e.boss||e.attackKind==='rush'?.48:.36;e.attackTargets=new Set();e.attackHit=false;this.emit('enemySwing');
   }return;
  }
  if(e.action==='attack'){
   if(e.attackKind==='rush'&&e.actionTime>=.08&&e.actionTime<.35)e.vx=e.face*480;
   if(e.actionTime>=.08&&e.actionTime<(e.attackKind==='rush'?.36:.21)){
    if(e.attackKind==='shot'&&!e.attackHit){
     e.attackHit=true;const angle=Math.atan2(e.aimY-e.y,e.aimX-e.x),count=e.boss?5:1;
     for(let i=0;i<count;i++){const a=angle+(i-(count-1)/2)*.23;this.projectiles.push({x:e.x,y:e.y,z:30,vx:Math.cos(a)*(e.boss?240:225),vy:Math.sin(a)*150,life:4,owner:e.id,power:e.boss?22:13,boss:e.boss});}
    }else if(e.attackKind==='bomb'&&!e.attackHit){
     e.attackHit=true;this.projectiles.push({kind:'bomb',x:e.x,y:e.y,z:52,fromX:e.x,fromY:e.y,targetX:clamp(e.aimX,this.camera+30,this.camera+920),targetY:clamp(e.aimY,330,464),elapsed:0,flight:.68,life:2,power:profile.damage||20});
    }else if(e.attackKind==='hex'&&!e.attackHit){
     e.attackHit=true;this.addZone(clamp(e.aimX,this.camera+30,this.camera+920),clamp(e.aimY,330,464),75,profile.damage||18,'hex',.82);
    }else if(e.attackKind==='summon'&&!e.attackHit){
     e.attackHit=true;e.summonCd=10;if(this.enemies.filter(a=>a.hp>0).length<this.maxActiveEnemies&&!this.spawnQueue.length){const minion=this.spawn(this.stage.theme==='pyramid'?'mutant':'scout',clamp(e.x-e.face*55,this.camera+30,this.camera+900),clamp(e.y+25,330,460));this.burst(minion.x,minion.y-30,'#8bf0b8',15);}
    }else if(e.attackKind==='slam'&&!e.attackHit){
     e.attackHit=true;this.shake=10;this.burst(e.x,e.y,'#dcd5a7',28);for(const p of alive)if(dist(e,p)<155&&p.z<24)this.damage(p,28*this.rules.damage,e,2);
    }else if(['melee','thrust','rush'].includes(e.attackKind))for(const p of alive)if(!e.attackTargets.has(p.id)&&(p.x-e.x)*e.face>-22&&(p.x-e.x)*e.face<(e.boss?115:e.attackKind==='thrust'?145:76)&&Math.abs(p.y-e.y)<35&&p.z<46){if(this.damage(p,(e.boss?23:profile.damage||13)*this.rules.damage,e,1.7))e.attackTargets.add(p.id);}
   }
   if(e.timer<=0){e.action='idle';e.actionTime=0;e.cooldown=e.boss?.68:.8+this.random()*.6;}
   return;
  }
  e.face=target.x>=e.x?1:-1;
  e.action='walk';const d=dist(e,target),kind=profile.kind||(e.type==='mummra'?'shot':'melee'),ranged=['shot','bomb','hex'].includes(kind);
  const engaged=this.enemies.filter(other=>other.id!==e.id&&other.hp>0&&other.target===target.id&&['telegraph','attack'].includes(other.action)).length;
  if(e.cooldown<=0&&(e.boss||engaged<(ranged?2:1))&&d<(e.boss?(ranged?440:120):profile.reach||79)){
   e.action='telegraph';e.actionTime=0;e.timer=e.boss?.67:profile.windup||.44;e.aimX=target.x;e.aimY=target.y;
   e.attackKind=e.type==='shaman'&&e.summonCd<=0?'summon':e.boss&&!ranged&&this.random()<.4?'slam':kind;
   if(e.boss&&e.hp<e.maxHp*.5&&e.phase===0){e.phase=1;this.announce('ENRAGED','#f2906e');for(let i=0;i<this.players.length+1;i++)this.spawn('mutant',e.x+(i%2?150:-150),350+i*20);}
  }else{
   const ideal=profile.ideal||(ranged?235:48)+(e.id%3)*6;const flank=e.type==='scout'&&Math.abs(target.x-e.x)>100?(e.id%2?26:-26):0;const dy=target.y+(e.id%3-1)*8+flank-e.y;const dx=target.x-e.x;
   if(Math.abs(dx)>ideal)e.x+=Math.sign(dx)*e.speed*dt;else if(ranged&&Math.abs(dx)<130)e.x-=Math.sign(dx)*e.speed*.65*dt;
   if(Math.abs(dy)>11)e.y+=Math.sign(dy)*e.speed*.65*dt;
   if(Math.abs(dx)<ideal+5&&Math.abs(dy)<15)e.action='idle';
   for(const other of this.enemies)if(other.id!==e.id&&other.hp>0&&Math.abs(other.x-e.x)<29&&Math.abs(other.y-e.y)<19)e.y+=(e.id<other.id?-1:1)*33*dt;
  }
  e.x=clamp(e.x,this.camera+8,Math.min(this.camera+950,this.stage.length-25,this.gate===null?Infinity:this.gate+450));e.y=clamp(e.y,330,464);
 }
 update(dt,inputs=[]){
  if(this.status!=='playing')return;dt=Math.min(dt,.04);this.inputs=inputs;this.bufferInputs(dt,inputs);this.prevCamera=this.camera;
  for(const actor of [...this.players,...this.enemies]){actor.prevX=actor.x;actor.prevY=actor.y;actor.prevZ=actor.z;}
  this.time+=dt;this.stageTime+=dt;this.banner=Math.max(0,this.banner-dt);this.shake=Math.max(0,this.shake-dt*25);this.comboTimer-=dt;if(this.comboTimer<=0)this.combo=0;
  if(this.hitstop>0){this.hitstop-=dt;return;}
  for(const p of this.players)this.playerUpdate(p,inputs[p.slot]||{},dt);
  this.updateSummons(dt);
  this.updateThundertank(dt);
  const alive=this.players.filter(p=>p.hp>0&&p.action!=='pitfall');const recoverable=this.players.some(p=>p.hp>0||p.lives>0||p.downTime>0);
  if(!recoverable){this.status='gameover';this.emit('gameover');return;}
  for(const e of [...this.enemies]){this.enemyUpdate(e,dt);if(e.action==='walk')e.walkPhase=(e.walkPhase+Math.hypot(e.x-e.prevX,(e.y-e.prevY)/.62)/95)%1;}
  this.enemies=this.enemies.filter(e=>e.hp>0||e.dead>0);
  this.fillSpawns();this.updateEnvironment(dt,alive);this.updateProjectiles(dt,alive);this.updateZones(dt,alive);
  for(const prop of this.props)prop.flash=Math.max(0,prop.flash-dt);
  for(const pick of this.pickups){pick.life-=dt;pick.t+=dt*3;}this.pickups=this.pickups.filter(p=>p.life>0);
  for(const p of this.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=400*dt;p.life-=dt;}this.particles=this.particles.filter(p=>p.life>0);
  for(const t of this.texts){t.life-=dt;if(!t.screen)t.y-=dt*35;}this.texts=this.texts.filter(t=>t.life>0);
  if(alive.length){
   const minX=Math.min(...alive.map(p=>p.x)),maxX=Math.max(...alive.map(p=>p.x));const desired=clamp(Math.min((minX+maxX)*.5-320,minX-60),0,this.stage.length-960);this.camera=Math.max(this.camera,this.camera+(desired-this.camera)*(1-Math.exp(-dt*9)));
   const gates=this.encounterGates;for(let i=0;i<gates.length;i++)if(this.gate===null&&!this.completed.has(i)&&maxX>gates[i]-200){this.beginEncounter(i);break;}
   const section=this.stage.sections.findIndex((s,i)=>maxX>=s.x&&(!this.stage.sections[i+1]||maxX<this.stage.sections[i+1].x));if(section>this.sectionIndex){this.sectionIndex=section;this.announce(this.stage.sections[section].name,this.stage.accent,2);}
  }
  if(this.gate!==null&&!this.enemies.some(e=>e.hp>0)&&!this.spawnQueue.length){
   if(this.wave<this.waveLimit){this.wave++;this.spawnWave(this.encounter);this.announce('REINFORCEMENTS · WAVE '+this.wave);}
   else{this.completed.add(this.encounter);this.gate=null;this.announce(this.encounter===this.bossEncounter?'AREA CLEAR':'GO!  →','#d9e9a6');this.emit('clear');for(const p of alive){p.hp=Math.min(p.maxHp,p.hp+14);}}
  }
  if(this.completed.size===this.encounterGates.length&&!this.enemies.some(e=>e.hp>0)&&!this.spawnQueue.length){this.exitTime+=dt;if(this.exitTime>3){if(this.stageIndex===STAGES.length-1){this.status='victory';this.emit('victory');}else{this.status='stageclear';this.emit('stageclear',{next:this.stageIndex+1});}}}
 }
 nextStage(){if(this.stageIndex<STAGES.length-1){this.loadStage(this.stageIndex+1);this.status='playing';}}
 snapshot(){return {version:2,stage:this.stageIndex,stageId:this.stage.theme,heroes:this.players.map(p=>p.hero),difficulty:this.difficulty,score:this.score,kills:this.kills,time:this.time,bestCombo:this.bestCombo,players:this.players.map(p=>({hp:p.hp,lives:p.lives,energy:p.energy,kills:p.kills,score:p.score}))};}
 static restore(save,opts={}){
  if(!save||!Array.isArray(save.heroes)||!save.heroes.length||save.heroes.length>4||save.heroes.some(h=>!Number.isInteger(h)||!HEROES[h]))throw new Error('Invalid save');
  // Saves from the original four-chapter campaign used numeric positions only.
  const legacyThemes=['forest','ruins','desert','pyramid'];
  const theme=typeof save.stageId==='string'?save.stageId:Number.isInteger(save.stage)&&!save.version?legacyThemes[save.stage]:null;
  const stage=STAGES.findIndex(s=>s.theme===theme);if(stage<0)throw new Error('Invalid save');
  const g=new Game({...opts,heroes:save.heroes,difficulty:save.difficulty,stage});g.score=Number(save.score)||0;g.kills=Number(save.kills)||0;g.time=Number(save.time)||0;g.bestCombo=Number(save.bestCombo)||0;
  for(const [i,p] of g.players.entries()){const s=save.players?.[i];if(s){p.lives=clamp(Number(s.lives)||0,0,9);p.hp=clamp(Number(s.hp)||p.maxHp,p.maxHp*.5,p.maxHp);p.energy=clamp(Number(s.energy)||0,0,100);p.kills=Number(s.kills)||0;p.score=Number(s.score)||0;}}
  return g;
 }
}
