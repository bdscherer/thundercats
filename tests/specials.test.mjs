import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
function arena(heroes=[2]){const g=new Game({heroes});g.props=[];g.completed=new Set(g.encounterGates.map((_,i)=>i).filter(i=>i!==g.bossEncounter));return g;}
function dummy(g,x=600,type='guard',boss=false){const e=g.spawn(type,x,400,boss);e.hp=e.maxHp=10000;e.action='idle';e.cooldown=999;return e;}
function tickTank(g,seconds){for(let i=0;i<Math.ceil(seconds*60);i++)g.updateThundertank(1/60);}
test('all four heroes gain three charge per regular hit and four per finisher',()=>{
 for(let hero=0;hero<4;hero++){const g=arena([hero]),p=g.players[0],e=dummy(g);g.damage(e,1,p,0);assert.equal(p.energy,3);p.combo=2;g.damage(e,1,p,0);assert.equal(p.energy,7);}
});
test('power crystals restore twelve charge and respect the meter cap',()=>{
 const g=arena(),p=g.players[0];g.drop(p.x,p.y,'energy');g.update(1/60);assert.equal(p.energy,12);p.energy=94;g.drop(p.x,p.y,'energy');g.update(1/60);assert.equal(p.energy,100);
});
test('Thundertank drives into position before any shots or damage',()=>{
 const g=arena(),p=g.players[0],e=dummy(g);p.energy=100;g.attack(p,true);const start=g.tank.x;
 tickTank(g,1.15);assert.ok(g.tank.x>start+500);assert.equal(g.tank.volleys,0);assert.equal(e.hp,10000);assert.equal(g.tank.width,470);
});
test('three tank volleys hit all visible lanes and both sides while leaving distant enemies untouched',()=>{
 const g=arena(),p=g.players[0],visible=[dummy(g,20),dummy(g,410),dummy(g,945)],offscreen=dummy(g,1200);
 visible[0].y=330;visible[2].y=464;p.energy=100;g.attack(p,true);tickTank(g,3.4);
 assert.equal(g.tank.volleys,3);for(const e of visible)assert.equal(e.hp,9820);assert.equal(offscreen.hp,10000);
});
test('tank fire deals bounded boss damage, credits Panthro, and never charges the special',()=>{
 const g=arena([0,2,1,3]),p=g.players[1],boss=dummy(g,650,'mummra',true),partyHp=g.players.map(p=>p.hp);p.energy=100;g.attack(p,true);
 // Panthro is back to regular play before the vehicle fires.
 p.action='idle';p.timer=0;tickTank(g,3.4);
 assert.equal(boss.hp,7600);assert.equal(p.energy,0);assert.equal(p.score,24000);assert.deepEqual(g.players.map(p=>p.hp),partyHp);
});
test('tank damage cannot refill Panthro while he uses a regular attack',()=>{
 const g=arena(),p=g.players[0],e=dummy(g);p.energy=100;g.attack(p,true);p.action='attack';g.damage(e,1,p,0);assert.equal(p.energy,3);tickTank(g,3.4);assert.equal(p.energy,3);
});
test('an active Thundertank cannot be replaced and the vehicle leaves after its barrage',()=>{
 const g=arena(),p=g.players[0];p.energy=100;g.attack(p,true);const tank=g.tank;p.specialCd=0;p.energy=100;
 assert.equal(g.attack(p,true),false);assert.equal(g.tank,tank);assert.equal(p.energy,100);tickTank(g,4.4);assert.ok(g.tank.x>g.camera+500);tickTank(g,.7);assert.equal(g.tank,null);
});
test('chapter transitions remove the tank and all pending friendly shots',()=>{
 const g=arena(),p=g.players[0];dummy(g);p.energy=100;g.attack(p,true);tickTank(g,1.3);assert.ok(g.tank.bolts.length);g.loadStage(1);assert.equal(g.tank,null);assert.equal(g.stage.theme,'forest');
});
test('later volleys acquire newly visible enemies and stop firing at enemies that leave the screen',()=>{
 const g=arena(),p=g.players[0],arriving=dummy(g,1200),leaving=dummy(g,400);p.energy=100;g.attack(p,true);tickTank(g,1.8);
 assert.equal(arriving.hp,10000);assert.equal(leaving.hp,9940);arriving.x=650;leaving.x=1200;tickTank(g,1.6);
 assert.equal(arriving.hp,9880);assert.equal(leaving.hp,9940);
});
