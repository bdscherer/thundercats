// Three poses per row in the new atlases: ready, attack, recoil. Each villain
// has a separate combat profile, even when sharing a movement archetype.
// Sheet C has a translucent matte between poses; use its opaque figures.
export const BOSS_SHEETS={a:{rows:3},b:{rows:3},c:{rows:3,minAlpha:170},d:{rows:2}};
export const GROUND_BOSSES={
 jackalman:{name:'JACKALMAN',height:158,moves:['rush','shot','bombard','melee']},
 slythe:{name:'SLITHE',height:153,moves:['melee','rush','venom','slam']},
 monkian:{name:'MONKIAN',height:168,moves:['slam','rockfall','rush','shot'],final:'rockfall'},
 mummra:{name:'MUMM-RA',height:200,ideal:235,moves:['hex','shot','summon','teleport'],final:'hex'},
 grune:{name:'GRUNE THE DESTROYER',atlas:'a',row:0,height:178,moves:['fault','melee','slam','rush'],final:'fault'},
 safari:{name:'SAFARI JOE',atlas:'a',row:1,height:149,ideal:175,moves:['snare','shot','bombard','melee'],final:'snare'},
 redeye:{name:'RED-EYE',atlas:'a',row:2,height:164,ideal:145,moves:['disc','rush','shot','melee'],final:'disc'},
 chilla:{name:'CHILLA',atlas:'b',row:0,height:150,ideal:165,moves:['freeze','shot','teleport','melee'],final:'freeze'},
 demolisher:{name:'THE DEMOLISHER',atlas:'b',row:1,height:184,moves:['uppercut','rush','slam','fault'],final:'uppercut'},
 bubbler:{name:'THE MAD BUBBLER',atlas:'b',row:2,height:132,ideal:165,moves:['bubble','venom','summon','slam'],final:'bubble'},
 luna:{name:'LUNA',atlas:'c',row:0,height:100,health:.64,ideal:175,moves:['command','shot','hex','teleport'],final:'command'},
 amok:{name:'AMOK',atlas:'c',row:1,height:193,health:.96,moves:['pounce','slam','melee','rush'],final:'pounce'},
 driller:{name:'DRILLER',atlas:'c',row:2,height:165,moves:['drill','fault','rockfall','rush'],final:'drill'},
 shadowmaster:{name:'SHADOWMASTER',atlas:'d',row:0,height:176,health:.91,ideal:160,moves:['shadow','teleport','summon','hex'],final:'shadow'},
 zaxx:{name:'ZAXX',atlas:'d',row:1,height:178,health:.91,ideal:175,moves:['medallion','shot','hex','teleport'],final:'medallion'}
};

export const VEHICLE_VILLAINS={
 fistpounder:{id:'monkian',name:'MONKIAN · FISTPOUNDER',pattern:'cannon'},
 skycutter:{id:'vultureman',name:'VULTUREMAN · SKYCUTTER',pattern:'crossfire'},
 ratstar:{id:'rataro',name:'RATAR-O · RATSTAR',pattern:'orbit'},
 lunatacker:{id:'tugmug',name:'TUG-MUG · LUNA TACKER',pattern:'gravity',art:0},
 skytomb:{id:'alluro',name:'ALLURO · SKYTOMB',pattern:'psych',art:1},
 vertus:{id:'shiner',name:'CAPTAIN SHINER · VERTUS',pattern:'laser',art:2}
};
