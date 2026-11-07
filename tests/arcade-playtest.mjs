import {Campaign} from '../src/campaign.js';
import {HEROES,dist} from '../src/data.js';
function vehicleInput(g){
 const p=g.ship,boss=g.enemies.find(e=>e.boss),foes=g.enemies.filter(e=>e.y>60&&e.y<p.y-70),repair=g.pickups.find(q=>q.type==='repair'&&p.hp<p.maxHp*.8&&q.y>100&&q.y<450);
 const enemy=boss||foes.sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0],tx=repair?.x??enemy?.x??480,ty=repair?Math.min(440,repair.y):410;
 const input={attack:true,moveX:Math.abs(tx-p.x)>12?Math.sign(tx-p.x):0,moveY:Math.abs(ty-p.y)>12?Math.sign(ty-p.y):0,specialPressed:p.energy>=100};
 const danger=g.projectiles.find(b=>Math.hypot(b.x+b.vx*.3-p.x,b.y+b.vy*.3-p.y)<55)||g.obstacles.find(o=>Math.abs(o.x-p.x)<o.r+45&&o.y>p.y-110&&o.y<p.y+40);
 if(danger){input.moveX=p.x<danger.x?-1:1;input.moveY=0;if(p.boostCd<=0)input.dodgePressed=true;}return input;
}
function battleInput(g){
 const p=g.players[0];if(p.hp<=0)return {};const input={},h=HEROES[p.hero],foes=g.enemies.filter(e=>e.hp>0);
 const food=g.pickups.find(a=>a.type==='food'&&p.hp<p.maxHp*.7&&dist(p,a)<170),priority=e=>dist(e,p)*(e.type==='shaman'?.42:e.type==='bomber'?.7:1),enemy=foes.sort((a,b)=>priority(a)-priority(b))[0];
 const target=food||(enemy?{x:enemy.x+(p.x<enemy.x?-1:1)*Math.min(55,h.reach*.6),y:enemy.y}:{x:p.x+200,y:385});
 input.moveX=Math.abs(target.x-p.x)>10?Math.sign(target.x-p.x):0;input.moveY=Math.abs(target.y-p.y)>9?Math.sign(target.y-p.y):0;
 if(enemy){input.attack=Math.abs(enemy.x-p.x)<h.reach+10&&Math.abs(enemy.y-p.y)<34;if(input.attack)input.moveX=Math.sign(enemy.x-p.x)*.12;if(p.energy>=100&&dist(enemy,p)<260)input.specialPressed=true;
  const danger=foes.find(e=>e.action==='telegraph'&&dist(e,p)<145&&e.timer<.22);if(danger&&p.dodgeCd<=0){input.dodgePressed=true;input.moveX=-danger.face;input.moveY=p.y>400?-1:1;}else if(danger&&p.z===0){input.guard=true;input.moveX=Math.sign(danger.x-p.x);}
 }
 for(const pit of g.pits)if(input.moveX>0&&p.x>pit.x-65&&p.x<pit.x+pit.w&&p.y>pit.y-5)input.jumpPressed=true;
 const groundDanger=g.zones.find(z=>!z.detonated&&Math.hypot(p.x-z.x,(p.y-z.y)*1.5)<z.r+12&&z.delay-z.elapsed<.35)||g.traps.find(t=>t.warning&&Math.hypot(p.x-t.x,(p.y-t.y)*1.5)<t.r+12);
 if(groundDanger&&p.z<1){input.jumpPressed=true;if(p.dodgeCd<=0){input.dodgePressed=true;input.moveY=p.y>groundDanger.y?1:-1;}}return input;
}
function hoverboardInput(g){
 const p=g.board,boss=g.enemies.find(e=>e.boss);
 const enemy=boss||g.enemies.find(e=>e.x>p.x+80&&e.x<800);
 let targetY=enemy?.y??272;
 const rock=g.obstacles.find(o=>o.x>p.x-70&&o.x<p.x+170);
 if(rock)targetY=rock.bottom?Math.min(targetY,rock.y-45):Math.max(targetY,rock.y+45);
 const warning=boss?.warning;
 if(warning){
  const lanes=warning.lanes||[warning.y];
  if(lanes.some(y=>Math.abs(y-targetY)<42))targetY=[310,350,395,245].find(y=>lanes.every(lane=>Math.abs(lane-y)>44))??220;
 }
 const danger=g.projectiles.find(s=>Math.hypot(s.x+s.vx*.18-p.x,s.y+s.vy*.18-p.y)<49);
 return {attack:true,moveY:Math.abs(targetY-p.y)>12?Math.sign(targetY-p.y):0,dodgePressed:!!danger,specialPressed:p.energy>=100};
}
function play(hero,switching=false){
 const reached=[],g=new Campaign({hero,onEvent:(type,data)=>{if(type==='stage')reached.push(data.stage.id);}});let ticks=0;
 let switches=0,lastSwitch=0;while(ticks++<60*3600&&g.status!=='victory'&&g.status!=='gameover'){
  if(g.status==='stageclear'){g.nextStage();continue;}
  if(switching&&g.time-lastSwitch>15&&g.switchHero((g.hero+1)%4)){switches++;lastSwitch=g.time;}
  const gMode=g.active.mode;
  g.update(1/60,[gMode==='hoverboard'?hoverboardInput(g.active):gMode==='vehicle'?vehicleInput(g.active):battleInput(g.active)]);
 }
 return {hero:HEROES[hero].name,switches,status:g.status,reached,seconds:Math.round(g.time),kills:g.kills,score:g.score,hp:Math.round(g.players[0].hp),continues:g.players[0].lives,...(g.status!=='victory'?{mission:g.stage.id,gate:g.active.gate,x:g.players[0].x,y:g.players[0].y,enemies:g.enemies.map(e=>({type:e.type,x:e.x,y:e.y,hp:e.hp}))}:{})};
}
const arg=process.argv.slice(2).find(a=>/^\d$/.test(a)),switching=process.argv.includes('--switch');const results=arg!==undefined?[play(Number(arg),switching)]:[play(0,switching),play(2,switching)];console.log(JSON.stringify(results,null,2));if(results.some(r=>r.status!=='victory'))process.exitCode=1;
