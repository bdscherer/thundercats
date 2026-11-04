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
 await page.goto('http://127.0.0.1:4173');
 await page.waitForFunction(()=>Object.values(thundercats.renderer.animations).every(b=>b.ready)&&thundercats.renderer.emblem.naturalWidth>0);
 await page.locator('#newGame').click();
 
 await page.locator('#begin').click();
 await page.evaluate(()=>{
  const g=thundercats.game;g.completed=new Set(g.encounterGates.map((_,i)=>i).filter(i=>i!==g.bossEncounter));g.enemies=[];g.spawnQueue=[];g.gate=null;g.props=[];g.banner=0;
  g.players.forEach((p,i)=>Object.assign(p,{x:330+i*30,prevX:330+i*30,y:365+i*24,invuln:999}));
  window.__worldPixels=()=>{const canvas=document.createElement('canvas');canvas.width=960;canvas.height=540;const c=canvas.getContext('2d',{willReadFrequently:true});thundercats.renderer.world(c,g.stageIndex,g.camera,0,g);return c.getImageData(0,135,960,170).data;};
 });
 await page.waitForTimeout(600);
 const before=await page.evaluate(()=>{window.__before=__worldPixels();return {...thundercats.renderer.worldFrame};});
 const keys=['d'];for(const key of keys)await page.keyboard.down(key);
 await page.waitForTimeout(3000);for(const key of keys)await page.keyboard.up(key);
 await page.waitForTimeout(1000);
 const scrolling=await page.evaluate(()=>{
  const pixels=__worldPixels();let changed=0;for(let i=0;i<pixels.length;i+=4)if(Math.abs(pixels[i]-__before[i])+Math.abs(pixels[i+1]-__before[i+1])+Math.abs(pixels[i+2]-__before[i+2])>15)changed++;
  return {...thundercats.renderer.worldFrame,changedBackgroundPixels:changed};
 });
 await page.screenshot({path:'test-results/world-lair.png',fullPage:true});
 await page.waitForTimeout(500);
 const idleDrift=await page.evaluate(prior=>Math.abs(thundercats.renderer.worldFrame.camera-prior),scrolling.camera);
 if(scrolling.camera-before.camera<250||scrolling.changedBackgroundPixels<20000||idleDrift>1)throw new Error('Scrolling or camera braking failed: '+JSON.stringify({before,scrolling,idleDrift}));
 if(scrolling.groundOffset!==scrolling.landmarkOffset||Math.abs(scrolling.backdropOffset/scrolling.groundOffset-.42)>.001)throw new Error('Incorrect world-layer speed');
 const sections=[];
 for(const [stageIndex,sectionIndex] of [[0,2],[1,2],[2,1],[3,1],[4,1]]){
  const section=await page.evaluate(({stageIndex,sectionIndex})=>{
   const g=thundercats.game;g.loadStage(stageIndex);const section=g.stage.sections[sectionIndex],cam=section.x+250;
   g.camera=g.prevCamera=cam;g.completed=new Set(g.encounterGates.map((_,i)=>i).filter(i=>i!==g.bossEncounter));g.props=[];g.banner=0;g.texts=[];g.sectionIndex=sectionIndex;
   g.players.forEach((p,i)=>Object.assign(p,{x:cam+220+i*50,prevX:cam+220+i*50,y:370+i*27,invuln:999}));
   for(const [i,type] of ['guard','lancer','scout','bomber','shaman'].entries()){const e=g.spawn(type,cam+570+i*65,350+i*24);e.cooldown=99;}
   return {stage:g.stage.theme,name:section.name};
  },{stageIndex,sectionIndex});
  await page.waitForTimeout(250);await page.screenshot({path:`test-results/world-${section.stage}-section.png`,fullPage:true});sections.push(section);
 }
 await page.evaluate(()=>{
  const g=thundercats.game;g.players[0].energy=100;
  const r=thundercats.renderer,draw=r.ctx.drawImage.bind(r.ctx);window.__emblemDraws=0;
  r.ctx.drawImage=(img,...args)=>{if(img===r.emblem&&args[2]>100)window.__emblemDraws++;return draw(img,...args);};
 });
 await page.keyboard.press('l');await page.waitForTimeout(700);
 await page.screenshot({path:'test-results/world-classic-signal.png',fullPage:true});
 const signal=await page.evaluate(()=>({draws:__emblemDraws,source:thundercats.renderer.emblem.src,minors:thundercats.game.enemies.filter(e=>!e.boss&&e.hp>0).length}));
 if(signal.draws===0||!signal.source.endsWith('/assets/thundercats-emblem.png')||signal.minors!==0)throw new Error('Classic signal failed: '+JSON.stringify(signal));
 if(errors.length)throw new Error(errors.join('\n'));
 console.log(JSON.stringify({scrolling,idleDrift,sections,signal,errors}));
}finally{await browser.close();}
