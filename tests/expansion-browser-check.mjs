import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import {existsSync,readdirSync} from 'node:fs';
import {homedir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),out=path.join(root,'test-results');
const child=spawn(process.execPath,[path.join(root,'server.mjs')],{env:{...process.env,HOST:'127.0.0.1',PORT:'0'},stdio:['ignore','pipe','pipe'],windowsHide:true});
let logs='',stderr='',browser;child.stdout.on('data',d=>logs+=d);child.stderr.on('data',d=>stderr+=d);
async function checkControllerMenus(page,url){
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{
  const pad={index:2,connected:true,axes:[0,0],buttons:Array.from({length:17},()=>({pressed:false}))};
  Object.defineProperty(navigator,'getGamepads',{value:()=>[null,null,pad]});
  window.setMenuPad=(button,axis)=>new Promise(resolve=>{
   pad.buttons.forEach((state,index)=>state.pressed=index===button);
   pad.axes=axis;
   requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  });
 });
 await page.goto(url);
 await page.waitForFunction(()=>window.thundercats);
 const pad=(button=null,axis=[0,0])=>page.evaluate(([button,axis])=>window.setMenuPad(button,axis),[button,axis]);
 const tap=async(button,axis)=>{await pad(button,axis);await pad();};
 const focus=async selector=>{
  const actual=await page.evaluate(()=>document.querySelector('[data-pad-focus]')?.outerHTML.slice(0,170));
  assert.equal(await page.locator(selector+'[data-pad-focus]').count(),1,'Expected focus on '+selector+', saw '+actual);
 };
 await tap(null,[.85,0]);await focus('#titleControls');
 await tap(0);assert.equal(await page.evaluate(()=>thundercats.view),'help');
 await tap(1);await focus('#newGame');
 await tap(0);await focus('[data-hero="0"]');
 await tap(15);await focus('[data-hero="1"]');
 await tap(0);await focus('[data-hero="1"]');
 assert.equal(await page.locator('[data-hero="1"]').getAttribute('aria-pressed'),'true');
 // From the first hero, the next row contains the mission selector.
 await tap(14);await focus('[data-hero="0"]');
 await tap(13);await focus('#missionStart');
 await tap(0);await tap(13);
 assert.equal(await page.locator('#missionStart').inputValue(),'1');
 await tap(1);assert.equal(await page.locator('#missionStart').inputValue(),'0');
 await tap(0);
 for(let i=0;i<4;i++)await tap(13);
 await tap(0);assert.equal(await page.locator('#missionStart').inputValue(),'4');
 await tap(15);await focus('#difficulty');await tap(0);await tap(13);await tap(0);
 assert.equal(await page.locator('#difficulty').inputValue(),'hard');
 await tap(9);
 assert.deepEqual(await page.evaluate(()=>[thundercats.campaign.stage.id,thundercats.campaign.hero,thundercats.campaign.difficulty]),['tuskania-spillway',1,'hard']);
 await tap(9);await focus('#resume');await tap(13);await focus('#pauseControls');
 await tap(0);await focus('#helpBack');await tap(1);await focus('#resume');
 await tap(13);await tap(13);await focus('#settings');await tap(0);await focus('#volume');
 await tap(0);await tap(14);await tap(0);
 assert.equal(await page.locator('#volume').inputValue(),'0.34');
 await tap(13);await focus('#music');await tap(0);
 assert.equal(await page.locator('#music').isChecked(),false);
 await tap(1);await focus('#resume');
 await pad(0);
 assert.equal(await page.evaluate(()=>thundercats.view),'playing');
 assert.equal(await page.evaluate(()=>thundercats.game.board.boostCd),0,'Menu confirm leaked into the boost action');
 await pad();await tap(0);
 assert.ok(await page.evaluate(()=>thundercats.game.board.boostCd)>0);
 await page.evaluate(()=>{const g=thundercats.game;g.startBoss();g.hit(g.enemies.at(-1),9999);g.exitTime=3;});
 await page.waitForFunction(()=>thundercats.view==='stageclear');
 await focus('#nextStage');await tap(0);
 assert.equal(await page.evaluate(()=>thundercats.campaign.stage.id),'ruins');
 await page.evaluate(()=>{const g=thundercats.game;g.status='gameover';g.emit('gameover');});
 await page.waitForFunction(()=>thundercats.view==='gameover');
 await focus('#retry');await tap(13);await focus('#resultTitle');await tap(0);
 await focus('#newGame');await tap(15);await focus('#continueGame');await tap(0);
 assert.equal(await page.evaluate(()=>thundercats.campaign.stage.id),'ruins');
 assert.deepEqual(errors,[],url);
}
try{
 const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Server startup timed out: '+stderr)),10000);child.stdout.on('data',()=>{const m=logs.match(/Local: http:\/\/localhost:(\d+)/);if(m){clearTimeout(timer);resolve(Number(m[1]));}});child.once('error',reject);});
 const cache=path.join(homedir(),'AppData','Local','ms-playwright'),exe=existsSync(cache)?readdirSync(cache).filter(n=>/^chromium-/.test(n)).map(n=>path.join(cache,n,'chrome-win','chrome.exe')).find(existsSync):undefined;
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||exe||(existsSync("C:/Program Files/Google/Chrome/Application/chrome.exe")?"C:/Program Files/Google/Chrome/Application/chrome.exe":undefined)});const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
 const controllerMenus=['/','/googlesite/','/googlesite/standalone.html'];
 for(const route of controllerMenus){
  const menuPage=await browser.newPage({viewport:{width:1280,height:900}});
  await checkControllerMenus(menuPage,'http://127.0.0.1:'+port+route);
  await menuPage.close();
 }
 await page.addInitScript(()=>{window.__pads=[];Object.defineProperty(navigator,'getGamepads',{value:()=>window.__pads});});
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});await fs.mkdir(out,{recursive:true});await page.goto('http://127.0.0.1:'+port);
 await page.waitForFunction(()=>window.thundercats&&Object.values(thundercats.renderer.animations).every(b=>b.ready)&&thundercats.vehicleRenderer.terrain.naturalWidth>0);
 await page.locator('#newGame').click();assert.equal(await page.locator('#missionStart option').count(),20);await page.locator('#begin').click();
 await page.evaluate(()=>{const g=thundercats.game,p=g.players[0];g.completed=new Set([0,1]);g.banner=0;g.props=[];p.hp=p.maxHp*.6;p.energy=42;});
 const switches=[];
 for(const [key,hero] of [['2',1],['3',2],['q',1],['e',2]]){await page.keyboard.press(key);await page.waitForFunction(hero=>thundercats.campaign.hero===hero,hero);switches.push(hero);await page.waitForTimeout(800);}
 await page.locator('[data-input="hero3"]').click();await page.waitForFunction(()=>thundercats.campaign.hero===3);await page.waitForTimeout(800);
 await page.evaluate(()=>{window.__pads=[null,null,{index:2,connected:true,axes:[0,0],buttons:Array.from({length:17},(_,i)=>({pressed:i===5}))}];});await page.waitForFunction(()=>thundercats.campaign.hero===0);await page.evaluate(()=>window.__pads=[]);
 const shared=await page.evaluate(()=>{const p=thundercats.game.players[0];return {ratio:p.hp/p.maxHp,energy:p.energy,players:thundercats.game.players.length};});assert.ok(Math.abs(shared.ratio-.6)<1e-8);assert.equal(shared.energy,42);assert.equal(shared.players,1);
 await page.screenshot({path:path.join(out,'expansion-switching.png')});const missions=[];
 for(let index=8;index<=17;index++){
  const state=await page.evaluate(index=>{const c=thundercats.campaign;c.loadMission(index);const g=c.active;g.banner=0;
   if(g.mode==='battle'){g.props=[];g.completed=new Set(g.encounterGates.map((_,i)=>i).filter(i=>i!==g.bossEncounter));const gate=g.encounterGates.at(-1);g.camera=g.prevCamera=gate-220;Object.assign(g.players[0],{x:gate+80,prevX:gate+80,y:415,prevY:415,invuln:999});g.beginEncounter(g.bossEncounter);for(const e of g.enemies.filter(e=>e.boss))Object.assign(e,{phase:1,hp:e.maxHp*.55,action:'telegraph',timer:4,attackKind:e.type==='monkian'?'rockfall':e.type==='mummra'?'hex':'rush'});}
   else{g.enemies=[];g.nextWave=g.nextHazard=Infinity;g.bossStarted=true;g.distance=g.prevDistance=g.stage.length-900;g.ship.invuln=999;const e=g.spawn(g.stage.bossType,480,155,true);e.phase=1;e.hp=e.maxHp*.55;e.fireCd=5;}
   return {index,id:c.stage.id,environment:g.stage.environment,mode:g.mode,bosses:g.enemies.filter(e=>e.boss).length};},index);
  if(state.mode==='battle'){await page.waitForFunction(()=>thundercats.renderer.expeditionAtlases?.filter(Boolean).every(img=>img.complete&&img.naturalWidth));await page.waitForTimeout(800);}else await page.waitForTimeout(120);await page.locator('#game').screenshot({path:path.join(out,'expansion-'+state.id+'.png')});missions.push(state);
 }
 assert.equal(missions.filter(m=>m.mode==='battle').length,7);assert.equal(missions.filter(m=>m.mode==='vehicle').length,3);assert.equal(missions.find(m=>m.id==='plundarr').bosses,2);assert.equal(missions.find(m=>m.id==='astral-gate').bosses,2);
 await page.keyboard.press('Escape');assert.equal(await page.locator('#heroSwitch').isVisible(),false);await page.locator('#quit').click();await page.locator('#continueGame').click();assert.equal(await page.evaluate(()=>thundercats.campaign.stage.id),'astral-gate');
 await page.setViewportSize({width:740,height:850});await page.waitForTimeout(150);assert.equal(await page.locator('[data-input="hero1"]').isVisible(),true);await page.locator('[data-input="hero1"]').click();await page.waitForFunction(()=>thundercats.campaign.hero===1);await page.screenshot({path:path.join(out,'expansion-mobile.png')});
 assert.deepEqual(errors,[]);const report={testedAt:new Date().toISOString(),controllerMenus,switches,shared,missions,errors};await fs.writeFile(path.join(out,'expansion-browser-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{if(browser)await browser.close();child.kill();}
