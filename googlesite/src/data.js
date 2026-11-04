export const HEROES = [
  {name:'LION-O',role:'LORD OF THE THUNDERCATS',weapon:'Sword of Omens + Claw Shield',special:'Eye of Thundera',color:'#67c9ec',dark:'#267cba',hair:'#ec5034',skin:'#f7c499',speed:182,power:19,hp:125,reach:90},
  {name:'CHEETARA',role:'THE LIGHTNING FAST',weapon:'Telescoping staff',special:'Super-speed rush',color:'#ef9c38',dark:'#ae4b30',hair:'#ffe783',skin:'#f6d18d',speed:238,power:15,hp:100,reach:111},
  {name:'PANTHRO',role:'THE WARRIOR ENGINEER',weapon:'Red + blue nunchaku',special:'Thundertank barrage',color:'#91a9ce',dark:'#303d83',hair:'#b6c8df',skin:'#8c9fc1',speed:156,power:25,hp:155,reach:81},
  {name:'TYGRA',role:'THE INVISIBLE HUNTER',weapon:'Three-tailed bolo whip',special:'Invisibility',color:'#a3d9d3',dark:'#367d82',hair:'#dc8745',skin:'#edb278',speed:194,power:18,hp:115,reach:135}
];
export const SPECIAL_CHARGE = Object.freeze({hit:3,finisher:4,crystal:12});
// Roughly four standing adult heights long, rather than the undersized vintage toy.
export const THUNDERTANK = Object.freeze({width:470,lane:424,arrival:1.1,firstVolley:1.25,volleyInterval:.68,volleys:3,departure:3.6,duration:4.9});
export const STAGES = [
 {name:'THE CAT’S LAIR',tag:'Defend our home',theme:'lair',boss:'JACKALMAN',bossType:'jackalman',length:10000,
  encounters:[650,1900,3100,4400,5700,6900,8200,9400],waves:[1,2,1,2,2,2,2,1],
  formations:[['mutant','scout'],['guard','archer'],['lancer','mutant'],['bomber','guard'],['scout','brute','archer'],['guard','lancer'],['bomber','scout','brute'],['guard','scout','bomber']],
  objectives:['HOLD THE MAIN PLAZA','CLEAR THE BARRICADES','BREAK THE SPEAR LINE','STOP THE BOMBARDMENT','DEFEND THE HANGARS','BREACH THE SHIELD WALL','TURN BACK THE LAST ASSAULT'],
  sections:[{x:0,name:'THE MAIN PLAZA',decor:[0,2,3],tint:'#f8dca5',ground:'#b6ac8c'},{x:3300,name:'THE OUTER TERRACES',decor:[0,1,3],tint:'#a4cbd2',ground:'#a7ac9d'},{x:6600,name:'THE HANGAR APPROACH',decor:[1,2,3],tint:'#e8a66c',ground:'#b5a58d'}],
  pits:[{x:2220,w:95,y:405},{x:4950,w:105,y:390},{x:7600,w:100,y:415}],traps:[],sky:['#427e9d','#b9d9b4'],ground:'#b6ac8c',accent:'#f1d799',story:'A full Mutant siege has reached the Cat’s Lair. Defend the plaza, outer terraces and hangar approach before facing Jackalman.'},
 {name:'THE WHISPERING FOREST',tag:'Beneath the canopy',theme:'forest',boss:'SLITHE',bossType:'slythe',length:11600,
  encounters:[700,1950,3200,4450,5700,7000,8250,9500,11000],waves:[1,2,2,1,2,2,2,2,1],
  formations:[['scout','mutant'],['lancer','scout'],['mutant','brute'],['bomber','scout'],['lancer','archer'],['shaman','mutant'],['scout','brute','lancer'],['shaman','guard','mutant'],['lancer','scout','brute']],
  objectives:['SCOUTS IN THE CANOPY','HOLD THE ROOT CROSSING','CLEAR THE FALLEN GIANTS','AMBUSH AT THE BRIDGE','SPEARS IN THE MIST','SILENCE THE BOG CASTERS','BREAK OUT OF THE THICKET','THE MUTANTS MAKE A STAND'],
  sections:[{x:0,name:'THE SUNLIT CANOPY',decor:[0,1],tint:'#d6e8a0',ground:'#75865a'},{x:3800,name:'THE ROOT BRIDGES',decor:[0,3,1],tint:'#91c8b2',ground:'#5d7556'},{x:7600,name:'THE POISON BOG',decor:[0,2,1],tint:'#658b91',ground:'#4e675a'}],
  pits:[{x:2600,w:100,y:395},{x:5000,w:110,y:370},{x:7400,w:100,y:405},{x:10100,w:105,y:395}],traps:[{x:6100,y:440,r:60,kind:'poison',period:5,power:9},{x:8600,y:345,r:60,kind:'poison',period:5.8,power:9}],sky:['#102d39','#558d80'],ground:'#677449',accent:'#daca8c',story:'Scout packs haunt the canopy, broken root bridges cross the ravines, and spirit casters poison the deep bog. Hunt down Slithe.'},
 {name:'THE LOST CITY',tag:'Stones remember',theme:'ruins',boss:'MONKIAN',bossType:'monkian',length:12200,
  encounters:[700,2000,3300,4600,5900,7200,8500,9900,11600],waves:[1,2,2,2,1,2,2,2,1],
  formations:[['guard','mutant'],['brute','archer'],['guard','lancer'],['bomber','brute'],['lancer','scout'],['guard','brute'],['shaman','guard'],['brute','lancer','archer'],['brute','guard','lancer']],
  objectives:['TAKE THE BROKEN ARCHWAY','HEAVIES IN THE STREET','SHIELDS AT THE AQUEDUCT','CLEAR THE ROOFTOP RAID','REACH THE SUNKEN STEPS','BREAK THE PHALANX','THE TEMPLE IS CURSED','MONKIAN’S LAST LINE'],
  sections:[{x:0,name:'THE BROKEN AVENUE',decor:[0,1,3],tint:'#d9dab2',ground:'#a6a68f'},{x:4000,name:'THE OLD AQUEDUCT',decor:[0,3],tint:'#8dbfc5',ground:'#818f89'},{x:8000,name:'THE GUARDIAN PLAZA',decor:[1,2,0],tint:'#d3ac78',ground:'#9e947d'}],
  pits:[{x:2650,w:100,y:390},{x:5200,w:110,y:385},{x:7750,w:100,y:410},{x:10600,w:105,y:370}],traps:[{x:3900,y:430,r:65,kind:'stone',period:6,power:18},{x:9150,y:350,r:65,kind:'stone',period:5.5,power:18}],sky:['#242c4a','#8c908c'],ground:'#777a68',accent:'#decb91',story:'Fight shield formations through the broken avenues, survive the falling masonry at the aqueduct, and defeat Monkian in the guardian plaza.'},
 {name:'THE BURNING SANDS',tag:'Into the golden wastes',theme:'desert',boss:'JACKALMAN',bossType:'jackalman',length:13200,
  encounters:[700,2000,3300,4600,5900,7200,8500,9800,11100,12600],waves:[1,2,2,2,1,2,2,2,2,1],
  formations:[['scout','archer'],['lancer','scout'],['bomber','scout'],['guard','lancer'],['scout','mutant'],['bomber','archer'],['lancer','brute'],['scout','guard','bomber'],['lancer','scout','archer'],['scout','lancer','bomber']],
  objectives:['JACKALS ON THE RIDGE','SPEARS IN THE DUNES','STOP THE BOMB THROWERS','THE CARAVAN AMBUSH','CROSS THE BONE WASTES','RAIDERS IN THE STORM','THE OBELISK GUARD','BREAK THE CANYON TRAP','THE LAST DUNE'],
  sections:[{x:0,name:'THE GOLDEN DUNES',decor:[0,1],tint:'#f0c477',ground:'#c29c69'},{x:4400,name:'THE BONE CANYON',decor:[0,3,2],tint:'#e69f79',ground:'#b78861'},{x:8800,name:'THE TWILIGHT OBELISKS',decor:[2,3,0],tint:'#8a7198',ground:'#a58577'}],
  pits:[{x:2700,w:100,y:400},{x:5300,w:110,y:390},{x:7900,w:100,y:415},{x:10500,w:110,y:365}],traps:[{x:3900,y:355,r:65,kind:'sand',period:5,power:12},{x:9200,y:440,r:65,kind:'sand',period:6,power:12}],sky:['#51405a','#eab780'],ground:'#b38c60',accent:'#f5cf8c',story:'Cross the dunes, bone canyon and twilight obelisks while raider packs, spear fighters and bomb throwers try to trap you in the sand.'},
 {name:'THE BLACK PYRAMID',tag:'Ancient spirits of evil',theme:'pyramid',boss:'MUMM-RA',bossType:'mummra',length:13800,
  encounters:[700,2050,3400,4750,6100,7450,8800,10150,11500,13200],waves:[1,2,2,2,2,2,2,2,2,1],
  formations:[['guard','mutant'],['shaman','mutant'],['lancer','guard'],['shaman','brute'],['guard','archer'],['shaman','lancer'],['brute','mutant','shaman'],['guard','lancer','brute'],['shaman','guard','mutant'],['shaman','guard','brute']],
  objectives:['BREACH THE BLACK GATE','SILENCE THE DEAD','THE SNAKE PASSAGE','CASTERS IN THE CRYPT','BREAK THE GOLDEN GUARD','THE SPIRITS AWAKEN','CLEAR THE BURIAL VAULT','MUMM-RA’S HONOR GUARD','THE ANCIENT SPIRITS’ TRIAL'],
  sections:[{x:0,name:'THE OUTER CRYPTS',decor:[0,3],tint:'#8488b5',ground:'#596477'},{x:4600,name:'THE SPIRIT VAULTS',decor:[1,2,0],tint:'#6bc6ab',ground:'#486763'},{x:9200,name:'THE SARCOPHAGUS HALL',decor:[0,1,3],tint:'#aa7499',ground:'#63586d'}],
  pits:[{x:2750,w:100,y:390},{x:5450,w:110,y:410},{x:8150,w:100,y:380},{x:10850,w:105,y:400}],traps:[{x:4100,y:440,r:65,kind:'spirit',period:5,power:14},{x:9700,y:350,r:65,kind:'spirit',period:5.5,power:14}],sky:['#17172e','#505368'],ground:'#545965',accent:'#80ded2',story:'Survive the outer crypts, spirit vaults and sarcophagus hall. Destroy the summoning casters, break Mumm-Ra’s guard, and face the Ever-Living.'}
];
export const ENEMIES={
 mutant:{name:'REPTILIAN',hp:65,speed:106,reach:76,ideal:48,damage:13,windup:.44,kind:'melee'},
 brute:{name:'SIMIAN BRUISER',hp:95,speed:78,reach:80,ideal:54,damage:22,windup:.58,kind:'melee'},
 archer:{name:'JACKAL THROWER',hp:48,speed:101,reach:440,ideal:230,damage:13,windup:.55,kind:'shot'},
 guard:{name:'SHIELD GUARD',hp:98,speed:84,reach:90,ideal:60,damage:17,windup:.57,kind:'melee',row:0},
 lancer:{name:'SPEAR FIGHTER',hp:67,speed:105,reach:145,ideal:108,damage:18,windup:.56,kind:'thrust',row:1},
 scout:{name:'JACKAL RAIDER',hp:45,speed:156,reach:215,ideal:58,damage:12,windup:.43,kind:'rush',row:2},
 bomber:{name:'VULTURE BOMBER',hp:50,speed:105,reach:440,ideal:225,damage:20,windup:.8,kind:'bomb',row:3},
 shaman:{name:'SPIRIT CASTER',hp:62,speed:83,reach:430,ideal:220,damage:18,windup:.8,kind:'hex',row:4}
};
export const DIFFICULTIES = {story:{name:'Adventure',damage:.65,health:.8,count:.8,lives:4},normal:{name:'Arcade',damage:1,health:1,count:1,lives:3},hard:{name:'Thunder',damage:1.4,health:1.3,count:1.3,lives:2}};
export const SUPPORTS = [
 {name:'WILYKIT',skin:'#f3c992',hair:'#ed804c',color:'#cd8394',dark:'#8b5979',weapon:'capsules',small:true},
 {name:'WILYKAT',skin:'#efc28b',hair:'#df7642',color:'#a3b597',dark:'#586e69',weapon:'lasso',small:true},
 {name:'JAGA',skin:'#d0b6a1',hair:'#ededdf',color:'#667bc3',dark:'#776096',weapon:'sword',spirit:true},
 {name:'BENGALI',skin:'#d6e6ed',hair:'#b8deeb',color:'#6996cf',dark:'#335a94',weapon:'hammer'},
 {name:'PUMYRA',skin:'#f0c69e',hair:'#8d543f',color:'#e3ad6a',dark:'#a75b42',weapon:'sling'},
 {name:'LYNX-O',skin:'#deb28b',hair:'#e8e4d8',color:'#ba694a',dark:'#7c4f4a',weapon:'shield'},
 {name:'SNARF',skin:'#efd28d',hair:'#bc5e47',color:'#c5744e',dark:'#834b3e',weapon:'none',snarf:true}
];
export const KEYMAP = [
 {up:'KeyW',down:'KeyS',left:'KeyA',right:'KeyD',attack:'KeyJ',jump:'KeyK',special:'KeyL',dodge:'KeyI',guard:'KeyU',revive:'KeyO'},
 {up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight',attack:'Numpad1',jump:'Numpad2',special:'Numpad3',dodge:'Numpad5',guard:'Numpad4',revive:'Numpad6'},
 {up:'KeyT',down:'KeyG',left:'KeyF',right:'KeyH',attack:'KeyV',jump:'KeyB',special:'KeyN',dodge:'KeyY',guard:'KeyR',revive:'KeyC'},
 {up:'Digit8',down:'KeyM',left:'Digit7',right:'Digit9',attack:'BracketLeft',jump:'BracketRight',special:'Backslash',dodge:'Minus',guard:'Digit0',revive:'Equal'}
];
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const dist=(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y)*1.6);
export const sectionAt=(stage,x)=>stage.sections.reduce((section,next)=>x>=next.x?next:section,stage.sections[0]);
export const PIT_FALL_DURATION=.72;
// A shallow, perspective opening: use the same outline for feet collision and art.
export function pitOutline(pit){const {x,w,y}=pit,d=Math.min(56,482-y);return [[x+w*.24,y+3],[x+w*.48,y],[x+w*.72,y+2],[x+w*.96,y+d*.2],[x+w+7,y+d*.49],[x+w*.95,y+d*.77],[x+w*.74,y+d-2],[x+w*.49,y+d],[x+w*.22,y+d-3],[x-w*.02,y+d*.75],[x-8,y+d*.45],[x+w*.04,y+d*.19]];}
export function pitContains(pit,x,y,margin=0){
 const cx=pit.x+pit.w*.5,cy=pit.y+Math.min(56,482-pit.y)*.5,points=pitOutline(pit).map(([px,py])=>[cx+(px-cx)*(1+margin/(pit.w*.5)),cy+(py-cy)*(1+margin/28)]);let inside=false;
 for(let i=0,j=points.length-1;i<points.length;j=i++){const [ax,ay]=points[i],[bx,by]=points[j];if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;}return inside;
}
export function seeded(seed=1){return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
