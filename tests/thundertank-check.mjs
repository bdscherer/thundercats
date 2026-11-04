import {chromium} from 'playwright';
import {existsSync,readdirSync} from 'node:fs';
import fs from 'node:fs/promises';
import {homedir} from 'node:os';
import path from 'node:path';
const cache=path.join(homedir(),'AppData','Local','ms-playwright');
const exe=existsSync(cache)?readdirSync(cache).filter(n=>/^chromium-/.test(n)).map(n=>path.join(cache,n,'chrome-win','chrome.exe')).find(existsSync):undefined;
await fs.mkdir('test-results',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||exe});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>Object.values(thundercats.renderer.animations).every(b=>b.ready));
 await page.locator('#newGame').click();await page.locator('[data-hero="2"]').click();await page.locator('#begin').click();
 const before=await page.evaluate(()=>{
  const g=thundercats.game;g.completed=new Set(g.encounterGates.map((_,i)=>i).filter(i=>i!==g.bossEncounter));g.props=[];g.pits=[];g.traps=[];g.banner=0;g.camera=g.prevCamera=350;
  g.players.forEach((p,i)=>Object.assign(p,{x:[500,570,840,650][i],prevX:[500,570,840,650][i],y:405+i*17,invuln:999}));
  for(const [i,type] of ['mutant','guard','lancer','scout','bomber','shaman','archer','brute'].entries()){
   const e=g.spawn(type,g.camera+(i===0?25:630+i*35),340+i%4*35);Object.assign(e,{hp:1000,maxHp:1000,cooldown:99,summonCd:99,speed:0});
  }
  const boss=g.spawn('jackalman',g.camera+730,420,true);boss.cooldown=99;boss.speed=0;
  g.players[0].energy=100;
  const r=thundercats.renderer,draw=r.thundertank.bind(r);window.__tankSeen=[];r.thundertank=(...args)=>{draw(...args);if(r.tankFrame)__tankSeen.push({...r.tankFrame});};
  return {hp:g.enemies.map(e=>({id:e.id,hp:e.hp,boss:e.boss})),party:g.players.map(p=>p.hp)};
 });
 await page.keyboard.press('l');
 await page.waitForFunction(()=>thundercats.game.tank?.time>.35);await page.screenshot({path:'test-results/thundertank-arrival.png',fullPage:true});
 await page.waitForFunction(()=>thundercats.game.tank?.volleys===2&&thundercats.game.tank?.bolts.length>0);
 await page.screenshot({path:'test-results/thundertank-fire.png',fullPage:true});
 await page.waitForFunction(()=>thundercats.game.tank?.time>3.25);
 const barrage=await page.evaluate(before=>{
  const g=thundercats.game,r=thundercats.renderer,heroHeight=r.heroFrames.get(8).canvas.height*126/(r.heroAtlas.height/4);
  return {volleys:g.tank.volleys,damage:before.hp.map(e=>({boss:e.boss,damage:e.hp-(g.enemies.find(v=>v.id===e.id)?.hp??0)})),energy:g.players[0].energy,party:g.players.map(p=>p.hp),frames:[...new Set(__tankSeen.map(f=>f.index))],tankSize:r.tankFrame,heroHeight,widthInHeroHeights:r.tankFrame.width/heroHeight,grounding:__tankSeen.map(f=>({pose:f.index,treadY:f.treadY,groundY:f.groundY,contactFraction:f.contactFraction}))};
 },before);
 if(barrage.volleys!==3||barrage.energy!==0||barrage.damage.some(e=>e.damage<=0)||JSON.stringify(barrage.party)!==JSON.stringify(before.party))throw new Error('Barrage failed: '+JSON.stringify(barrage));
 if(barrage.frames.length!==4||barrage.widthInHeroHeights<3.5||barrage.widthInHeroHeights>4.8||barrage.tankSize.height/barrage.heroHeight>2.2)throw new Error('Tank art/scale failed: '+JSON.stringify(barrage));
 if(barrage.grounding.some(f=>Math.abs(f.treadY-f.groundY)>.01||f.treadY<400||f.treadY>464||f.contactFraction<.6||f.contactFraction>1))throw new Error('Tank treads left the fighting floor');
 await page.waitForFunction(()=>thundercats.game.tank?.time>4.1);await page.screenshot({path:'test-results/thundertank-departure.png',fullPage:true});
 await page.waitForFunction(()=>!thundercats.game.tank);
 if(errors.length)throw new Error(errors.join('\n'));
 console.log(JSON.stringify({barrage:{...barrage,grounding:[...new Map(barrage.grounding.map(f=>[f.pose,f])).values()]},errors}));
}finally{await browser.close();}
