import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CAMPAIGN,Campaign} from '../src/campaign.js';
import {GROUND_BOSSES} from '../src/bosses.js';

test('all 19 missions spawn distinct villains, including both members of each duo',()=>{
 const roster=[];
 for(const [stage,mission] of CAMPAIGN.entries()){
  const {active:g}=new Campaign({stage});
  if(g.mode==='battle')g.beginEncounter(g.bossEncounter);
  else{g.distance=g.stage.length-(g.mode==='hoverboard'?1:901);g.update(1/60,[{}]);}
  const names=g.enemies.filter(e=>e.boss).map(e=>e.villain);
  assert.deepEqual(names,mission.villains,mission.id);
  assert.ok(names.length>=1,mission.id);
  roster.push(...names);
 }
 assert.equal(CAMPAIGN.length,19);
 assert.equal(CAMPAIGN.filter(m=>m.villains.length===2).length,2);
 assert.equal(roster.length,21);
 assert.equal(new Set(roster).size,21);
});

function signature(id){
 const stage=CAMPAIGN.findIndex(m=>m.villains.includes(id)),{active:g}=new Campaign({stage});
 const p=g.players[0],e=g.spawn(id,480,400,true);
 Object.assign(p,{x:690,y:400,invuln:0});
 Object.assign(e,{action:'attack',actionTime:.11,timer:.25,aimX:p.x,aimY:p.y,face:1,attackKind:GROUND_BOSSES[id].moves[0]});
 g.bossUpdate(e,p,[p],1/60);
 return {g,p,e};
}

test('Red-Eye’s projectiles double back and Chilla’s frost only slows after its warning',()=>{
 const {g}=signature('redeye');
 assert.equal(g.projectiles.length,2);
 const disc=g.projectiles[0],velocity=disc.vx;
 assert.ok(velocity>0);
 g.updateProjectiles(1.3,[]);
 assert.equal(disc.vx,-velocity);
 const {g:ice,p}=signature('chilla'),hp=p.hp;
 ice.updateZones(.85,[p]);
 assert.equal(p.hp,hp);
 assert.equal(p.slow,0);
 ice.updateZones(.1,[p]);
 assert.ok(p.hp<hp);
 assert.equal(p.slow,1.25);
});

test('the Vertus laser hits its warned column even when the pilot moves vertically',()=>{
 const {active:g}=new Campaign({stage:CAMPAIGN.findIndex(m=>m.villains.includes('shiner'))});
 const boss=g.spawn(g.stage.bossType,480,155,true),ship=g.ship;
 ship.x=210;
 Object.assign(boss,{pattern:2,phase:1,fireCd:99});
 g.bossStarted=true;g.enemyFire(boss);
 const [lane]=g.hazards;
 assert.equal(lane.kind,'laser');
 assert.equal(lane.x,ship.x);
 g.projectiles=[];ship.invuln=0;ship.y=145;
 assert.ok(Math.abs(ship.y-lane.y)>lane.r);
 const hp=ship.hp;
 for(let i=0;i<80;i++)g.update(1/60,[{}]);
 assert.equal(ship.hp,hp);
 for(let i=0;i<12;i++)g.update(1/60,[{}]);
 assert.ok(ship.hp<hp);
});
