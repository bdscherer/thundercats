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
 await page.locator('#newGame').click();await page.locator('#begin').click();
 const results=[];
 for(const [type,stage] of [['slythe',1],['monkian',2],['jackalman',3],['mummra',4]]){
  const result=await page.evaluate(({type,stage})=>{
   const g=thundercats.game,r=thundercats.renderer;g.loadStage(stage);g.banner=0;g.props=[];g.pits=[];g.traps=[];g.texts=[];
   g.players[0].x=350;g.players[0].prevX=350;g.players[0].y=425;g.players[0].invuln=999;
   g.completed=new Set(g.encounterGates.map((_,i)=>i).filter(i=>i!==g.bossEncounter));g.gate=600;g.encounter=g.bossEncounter;g.wave=1;
   const e=g.spawn(type,640,413,true);Object.assign(e,{action:'idle',cooldown:999,speed:0,timer:0});window.__boss=e;
   const bank=r.animations['boss-'+type],seen=[];
   for(const [index,frame] of bank.frames){const sample={...e,action:index>=4?'walk':['idle','telegraph','attack','hurt'][index],actionTime:index===2?.15:0,walkPhase:index>=4?(index-4+.1)/8:0};r.bossSprite(r.ctx,sample,0);seen.push(r.bossFrames[type].index);}
   return {type,frames:bank.frames.size,seen,source:bank.image.src};
  },{type,stage});
  await page.waitForTimeout(200);await page.screenshot({path:`test-results/boss-${type}-ready.png`,fullPage:true});
  await page.evaluate(()=>Object.assign(__boss,{action:'telegraph',actionTime:0,timer:2,attackKind:__boss.type==='mummra'?'shot':'melee'}));
  await page.waitForTimeout(150);await page.screenshot({path:`test-results/boss-${type}-windup.png`,fullPage:true});
  if(result.frames!==12||new Set(result.seen).size!==12||!result.source.includes(`boss-${type}-1985.png`))throw new Error('Missing boss animation: '+JSON.stringify(result));
  results.push(result);
 }
 if(errors.length)throw new Error(errors.join('\n'));
 console.log(JSON.stringify({results,errors}));
}finally{await browser.close();}
