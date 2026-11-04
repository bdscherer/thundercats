// Startup, active and recovery are seconds at the game's fixed 60 Hz simulation rate.
const strike=(startup,active,recovery,power,knock,lunge)=>({startup,active,recovery,power,knock,lunge,duration:startup+active+recovery});
export const ATTACKS=[
 [strike(.065,.095,.12,1,78,82),strike(.055,.105,.12,1.1,95,66),strike(.12,.12,.21,1.75,355,148)],
 [strike(.045,.08,.095,1,65,104),strike(.045,.09,.10,1.05,82,90),strike(.09,.12,.16,1.75,315,180)],
 [strike(.08,.11,.135,1,100,65),strike(.075,.11,.14,1.1,115,58),strike(.15,.13,.23,1.9,430,132)],
 [strike(.07,.12,.12,1,74,55),strike(.065,.12,.12,1.1,95,48),strike(.125,.14,.20,1.75,345,122)]
];
export const AIR_ATTACK=strike(.055,.14,.15,1.3,190,0);
export const INPUT_BUFFER=.18;
export const GRAVITY=1100;
export const approach=(value,target,step)=>value<target?Math.min(target,value+step):Math.max(target,value-step);
export function stick(x=0,y=0,deadzone=.2){
 const length=Math.hypot(x,y);if(length<=deadzone)return {x:0,y:0};
 const magnitude=Math.min(1,(length-deadzone)/(1-deadzone));return {x:x/length*magnitude,y:y/length*magnitude};
}
