import {Game} from './game.js';
import {HEROES,STAGES,DIFFICULTIES} from './data.js';
import {VehicleGame,VEHICLE_MISSIONS} from './vehicle.js';
export const CAMPAIGN=[
 {id:'lair',ground:0},VEHICLE_MISSIONS[0],{id:'forest',ground:1},VEHICLE_MISSIONS[1],{id:'ruins',ground:2},{id:'desert',ground:3},VEHICLE_MISSIONS[2],{id:'pyramid',ground:4}
].map(m=>m.ground===undefined?m:{...STAGES[m.ground],...m,theme:m.id,mode:'battle'});
export class Campaign{
 constructor({heroes=[0],hero=heroes[0],difficulty='normal',stage=0,onEvent=()=>{},pilot,score=0,kills=0,time=0,bestCombo=0}={}){
  this.hero=Number.isInteger(hero)&&HEROES[hero]?hero:0;this.difficulty=difficulty;this.onEvent=onEvent;
  this.loadMission(stage,{pilot,score,kills,time,bestCombo});
 }
 get stage(){return CAMPAIGN[this.stageIndex];}
 get players(){return this.active.players;}
 get status(){return this.active.status;}
 get score(){return this.active.score;}
 get kills(){return this.active.kills;}
 get time(){return this.active.time;}
 get bestCombo(){return this.active.bestCombo;}
 get enemies(){return this.active.enemies;}
 loadMission(index,stats={}){
  if(!CAMPAIGN[index])throw new Error('Unknown mission');this.stageIndex=index;const stage=this.stage;
  const events=(type,data={})=>{
   if(type==='stage')return;
   if(type==='stageclear'&&this.stageIndex===CAMPAIGN.length-1){this.active.status='victory';this.onEvent('victory');return;}
   this.onEvent(type,data);
  };
  // Stage completion is controlled by this eight-mission campaign, including the
  // original final battle, whose engine emits victory directly.
  if(stage.mode==='battle'){
   this.active=new Game({heroes:[this.hero],difficulty:this.difficulty,stage:stage.ground,onEvent:events});
   if(stats.pilot)Object.assign(this.active.players[0],stats.pilot,{hero:this.hero,slot:0,hp:Math.max(stats.pilot.hp,HEROES[this.hero].hp*.65)});
   for(const key of ['score','kills','time','bestCombo'])this.active[key]=stats[key]||0;
   this.active.mode='battle';
   this.active.solo=true;this.active.campaignNumber=index+1;
  }else{
   const pilot=stats.pilot||{hero:this.hero,slot:0,hp:HEROES[this.hero].hp,maxHp:HEROES[this.hero].hp,lives:(DIFFICULTIES[this.difficulty]||DIFFICULTIES.normal).lives,energy:0,kills:0,score:0};
   this.active=new VehicleGame({...stats,mission:stage,pilot,difficulty:this.difficulty,onEvent:events});
  }
  this.onEvent('stage',{index,stage});
 }
 update(dt,inputs){this.active.update(dt,inputs);}
 clearInput(){this.active.clearInput();}
 nextStage(){if(this.stageIndex<CAMPAIGN.length-1)this.loadMission(this.stageIndex+1,this.stats());}
 stats(){const p=this.players[0];return {score:this.score,kills:this.kills,time:this.time,bestCombo:this.bestCombo,pilot:{hero:this.hero,hp:p.hp,maxHp:p.maxHp,lives:p.lives,energy:p.energy,kills:p.kills||0,score:p.score||0}};}
 snapshot(next=false){const index=this.stageIndex+(next?1:0);return {version:3,mission:index,missionId:CAMPAIGN[index]?.id,hero:this.hero,difficulty:this.difficulty,...this.stats()};}
 static restore(save,opts={}){
  if(!save)throw new Error('No save');
  if(save.version===3){const index=CAMPAIGN.findIndex(m=>m.id===save.missionId);if(index<0||!Number.isInteger(save.hero)||!HEROES[save.hero])throw new Error('Invalid mission save');return new Campaign({...opts,stage:index,hero:save.hero,difficulty:save.difficulty,pilot:save.pilot,score:save.score,kills:save.kills,time:save.time,bestCombo:save.bestCombo});}
  const legacy=Game.restore(save),p=legacy.players[0],index=CAMPAIGN.findIndex(m=>m.id===legacy.stage.theme);
  return new Campaign({...opts,stage:index,hero:p.hero,difficulty:legacy.difficulty,pilot:{hp:p.hp,maxHp:p.maxHp,lives:p.lives,energy:p.energy,kills:p.kills,score:p.score},score:legacy.score,kills:legacy.kills,time:legacy.time,bestCombo:legacy.bestCombo});
 }
}
