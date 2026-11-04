import {VehicleGame,VEHICLE_MISSIONS} from '../src/vehicle.js';
const results=[];
for(const mission of VEHICLE_MISSIONS){
 const g=new VehicleGame({mission});let ticks=0;
 while(g.status==='playing'&&ticks++<60*240){
  const p=g.ship,boss=g.enemies.find(e=>e.boss),foes=g.enemies.filter(e=>e.y>60&&e.y<p.y-70),repair=g.pickups.find(q=>q.type==='repair'&&p.hp<p.maxHp*.8&&q.y>100&&q.y<450);
  const enemy=boss||foes.sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0],tx=repair?.x??enemy?.x??480,ty=repair?Math.min(440,repair.y):410;
  const input={attack:true,moveX:Math.abs(tx-p.x)>12?Math.sign(tx-p.x):0,moveY:Math.abs(ty-p.y)>12?Math.sign(ty-p.y):0,specialPressed:p.energy>=100};
  const danger=g.projectiles.find(b=>Math.hypot(b.x+b.vx*.3-p.x,b.y+b.vy*.3-p.y)<55)||g.obstacles.find(o=>Math.abs(o.x-p.x)<o.r+45&&o.y>p.y-110&&o.y<p.y+40);
  if(danger){input.moveX=p.x<danger.x?-1:1;input.moveY=0;if(p.boostCd<=0)input.dodgePressed=true;}
  g.update(1/60,[input]);
 }
 results.push({mission:mission.id,status:g.status,seconds:Math.round(g.stageTime),kills:g.kills,hull:Math.ceil(g.ship.hp),continues:g.players[0].lives,bossDefeated:g.bossDefeated});
}
console.log(JSON.stringify(results,null,2));if(results.some(r=>r.status!=='stageclear'))process.exitCode=1;
