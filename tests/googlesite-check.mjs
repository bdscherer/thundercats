import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs/promises';
import {existsSync,readdirSync} from 'node:fs';
import {homedir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),out=path.join(root,'googlesite');
const child=spawn(process.execPath,[path.join(root,'server.mjs')],{env:{...process.env,HOST:'127.0.0.1',PORT:'0'},stdio:['ignore','pipe','pipe'],windowsHide:true});
let logs='',stderr='',browser,parent;
child.stdout.on('data',d=>logs+=d);child.stderr.on('data',d=>stderr+=d);
const report={testedAt:new Date().toISOString(),scope:'Local static hosting, cross-origin sandboxed iframe, and opaque-origin standalone iframe; not a published Google Site.',checks:[],errors:[]};
try{
 const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Server startup timed out: '+stderr)),10000);child.stdout.on('data',()=>{const m=logs.match(/Local: http:\/\/localhost:(\d+)/);if(m){clearTimeout(timer);resolve(Number(m[1]));}});child.once('error',reject);});
 const base='http://127.0.0.1:'+port;
 const manifest=JSON.parse(await fs.readFile(path.join(out,'build-manifest.json'),'utf8'));
 for(const f of manifest.files){const response=await fetch(base+'/googlesite/'+f.path);assert.equal(response.status,200,f.path);if(f.path.endsWith('.js'))assert.match(response.headers.get('content-type'),/javascript/);await response.arrayBuffer();}
 assert.equal((await fetch(base+'/googlesite',{redirect:'manual'})).status,301);
 assert.equal((await fetch(base+'/googlesite/')).status,200);
 for(const route of ['/googlesite/README.md','/googlesite/../package.json','/node_modules/playwright/package.json'])assert.equal((await fetch(base+route)).status,404,route);
 report.checks.push({name:'Subdirectory paths, modules, artwork, MIME types, redirect and private-file protection',files:manifest.files.length,passed:true});
 const snippet=await fs.readFile(path.join(out,'embed-code.html'),'utf8');
 parent=http.createServer((req,res)=>{
  const standalone=req.url.startsWith('/standalone'),src=base+'/googlesite/'+(standalone?'standalone.html':'index.html');
  res.writeHead(200,{'Content-Type':'text/html','Permissions-Policy':'gamepad=()'});
  res.end('<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#eee;font:16px system-ui}header{padding:12px}iframe{display:block;width:100%;height:760px;border:0}</style><header>External website — embedded ThunderCats</header>'+snippet.replace(/src="[^"]+"/,'src="'+src+'"').replace('<iframe','<iframe id="game-frame" sandbox="allow-scripts'+(standalone?'':' allow-same-origin')+'"')+'</html>');
 });
 await new Promise(resolve=>parent.listen(0,'127.0.0.1',resolve));const parentBase='http://localhost:'+parent.address().port;
 const cache=path.join(homedir(),'AppData','Local','ms-playwright'),exe=existsSync(cache)?readdirSync(cache).filter(n=>/^chromium-/.test(n)).map(n=>path.join(cache,n,'chrome-win','chrome.exe')).find(existsSync):undefined;
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||exe||(existsSync("C:/Program Files/Google/Chrome/Application/chrome.exe")?"C:/Program Files/Google/Chrome/Application/chrome.exe":undefined)});
 await fs.mkdir(path.join(root,'test-results'),{recursive:true});
 for(const standalone of [false,true]){
  const context=await browser.newContext({viewport:{width:1200,height:850}}),page=await context.newPage(),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url().slice(0,200));});
  page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(parentBase))requests.push(r.url());});
  await page.goto(parentBase+(standalone?'/standalone':'/host'),{timeout:120000});
  const frame=await page.waitForEvent('framenavigated',{predicate:f=>f.url().startsWith(base+'/googlesite/'),timeout:1000}).catch(()=>page.frames().find(f=>f.url().startsWith(base+'/googlesite/')));
  assert.ok(frame,'Missing game frame');
  await frame.waitForFunction(()=>window.thundercats&&Object.values(thundercats.renderer.animations).every(b=>b.ready)&&thundercats.renderer.backdrops.every(img=>img.complete&&img.naturalWidth)&&thundercats.vehicleRenderer.terrain.naturalWidth>0,{},{timeout:120000});
  const backgroundTransition=await frame.evaluate(()=>{const r=thundercats.renderer,make=camera=>{const cv=document.createElement('canvas');cv.width=960;cv.height=540;const c=cv.getContext('2d');r.world(c,0,camera,0,{scenery:[]});return c.getImageData(0,338,960,202).data;},a=make(2949.98),b=make(2950.02);let sum=0,n=0;for(let i=0;i<a.length;i+=16)for(let ch=0;ch<3;ch++){sum+=Math.abs(a[i+ch]-b[i+ch]);n++;}const tile=r.sceneryTile(r.backdrops[0],1080,540,{fade:200,both:true}),c=tile.getContext('2d');return {floorChange:sum/n,edgeAlpha:c.getImageData(0,100,1,1).data[3],centerAlpha:c.getImageData(540,100,1,1).data[3]};});
  assert.ok(backgroundTransition.floorChange<1.5);assert.ok(backgroundTransition.edgeAlpha<2);assert.equal(backgroundTransition.centerAlpha,255);
  assert.equal(await frame.evaluate(()=>getComputedStyle(document.documentElement).color),'rgb(239, 233, 213)','Exported theme failed to apply');
  const restrictions=await frame.evaluate(()=>{let gamepadBlocked=false,storageBlocked=false;try{navigator.getGamepads();}catch{gamepadBlocked=true;}try{localStorage.getItem('tc-save');}catch{storageBlocked=true;}return {gamepadBlocked,storageBlocked};});
  assert.equal(restrictions.gamepadBlocked,true);if(standalone)assert.equal(restrictions.storageBlocked,true);
  await frame.locator('#newGame').click();assert.equal(await frame.locator('#missionStart option').count(),18);await frame.locator('[data-hero="0"]').click();await frame.locator('#begin').click();
  await page.keyboard.press('3');await frame.waitForFunction(()=>thundercats.campaign.hero===2);await page.waitForTimeout(800);await page.keyboard.press('1');await frame.waitForFunction(()=>thundercats.campaign.hero===0);
  const before=await frame.evaluate(()=>thundercats.game.players[0].x);
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(350);await page.keyboard.up('ArrowRight');
  const after=await frame.evaluate(()=>({x:thundercats.game.players[0].x,focus:document.hasFocus(),active:document.activeElement?.id,view:thundercats.view}));
  assert.ok(after.x>before+30,'Arrow keys failed in iframe: '+JSON.stringify({before,after,standalone,errors}));
  await page.keyboard.press('k');await page.waitForTimeout(100);assert.ok(await frame.evaluate(()=>thundercats.game.players[0].z)>0,'Jump failed in iframe');
  const pitReturn=await frame.evaluate(()=>{const g=thundercats.game,p=g.players[0],pit=g.pits[0];g.completed=new Set([0,1]);g.props=[];g.enemies=[];g.camera=g.prevCamera=pit.x-300;Object.assign(p,{x:pit.x+35,y:pit.y+30,z:0,vz:0,invuln:0,action:'idle',timer:0,safeGround:{x:pit.x-45,y:pit.y+30}});const hp=p.hp;g.update(1/60,[{}]);const fell=p.action==='pitfall';for(let i=0;i<100&&p.fall;i++)g.update(1/60,[{}]);return {fell,damage:hp-p.hp,expected:Math.ceil(p.maxHp*.22),blink:p.pitBlink,protection:p.invuln};});
  assert.equal(pitReturn.fell,true);assert.equal(pitReturn.damage,pitReturn.expected);assert.equal(pitReturn.blink,1);assert.equal(pitReturn.protection,1);
  await page.keyboard.press('Escape');await frame.locator('#quit').click();await frame.locator('#newGame').click();
  const routes=[];
  for(const [mission,vehicle] of [[1,'thundertank'],[3,'thunderclaw'],[6,'feliner'],[9,'thundertank'],[12,'thunderclaw'],[15,'feliner']]){
   await frame.selectOption('#missionStart',String(mission));await frame.locator('#begin').click();
   await frame.waitForFunction(()=>thundercats.game.mode==='vehicle');await frame.evaluate(()=>{const g=thundercats.game;g.banner=0;g.ship.invuln=99;g.spawn(g.spec.ground?'nosediver':'skycutter',g.ship.x,g.ship.y-170);});
   const scroll=await frame.evaluate(()=>thundercats.game.scroll);await page.keyboard.down('Space');await page.waitForTimeout(1000);await page.keyboard.up('Space');
   const state=await frame.evaluate(()=>({mode:thundercats.game.mode,vehicle:thundercats.game.stage.vehicle,scroll:thundercats.game.scroll,energy:thundercats.game.ship.energy,frames:thundercats.renderer.animations.vehicles.frames.size}));
   assert.equal(state.vehicle,vehicle);assert.ok(state.scroll>scroll+70);assert.equal(state.frames,6);assert.ok(state.energy>0,'Firing failed in iframe');routes.push(vehicle);
   if(!standalone)await page.screenshot({path:path.join(root,'test-results','googlesite-'+vehicle+'.png')});
   await page.keyboard.press('Escape');await frame.locator('#quit').click();await frame.locator('#newGame').click();
  }
  const expeditions=[];for(const [mission,id] of [[7,'canopy'],[13,'plundarr'],[16,'astral-gate']]){
   await frame.selectOption('#missionStart',String(mission));await frame.locator('#begin').click();await frame.waitForFunction(id=>thundercats.campaign.stage.id===id,id);
   await frame.waitForFunction(()=>thundercats.renderer.expeditionAtlases?.filter(Boolean).every(img=>img.complete&&img.naturalWidth>0),{},{timeout:120000});
   const bosses=await frame.evaluate(()=>{const g=thundercats.game;g.beginEncounter(g.bossEncounter);return g.enemies.filter(e=>e.boss).length;});assert.equal(bosses,id==='canopy'?1:2);expeditions.push(id);
   await page.keyboard.press('Escape');await frame.locator('#quit').click();await frame.locator('#newGame').click();
  }
  await frame.selectOption('#missionStart','0');await frame.locator('#begin').click();
  const villains=[];
  for(let index=0;index<18;index++){
   const state=await frame.evaluate(index=>{
    const {campaign,renderer}=thundercats;campaign.loadMission(index);const g=campaign.active;
    g.banner=0;g.texts=[];
    if(g.mode==='battle'){
     const gate=g.encounterGates.at(-1);g.camera=g.prevCamera=gate-220;g.props=[];
     Object.assign(g.players[0],{x:gate+80,prevX:gate+80,y:415,prevY:415,invuln:99});
     g.beginEncounter(g.bossEncounter);
     g.enemies=g.enemies.filter(e=>e.boss);
     for(const e of g.enemies){Object.assign(e,{action:'spawn',timer:99});renderer.bossBank(e.type);}
     renderer.bossFrames={};
    }else{
     g.nextWave=g.nextHazard=Infinity;g.distance=g.stage.length-901;g.update(1/60,[{}]);g.ship.invuln=99;
     for(const e of g.enemies.filter(e=>e.boss))Object.assign(e,{y:155,prevY:155,fireCd:99});
    }
    return {id:g.stage.id,bosses:g.enemies.filter(e=>e.boss).map(e=>e.villain),expected:g.stage.villains};
   },index);
   assert.deepEqual(state.bosses,state.expected,state.id);villains.push(...state.bosses);
   await frame.waitForFunction(()=>{
    const {game:g,renderer:r,vehicleRenderer:v}=thundercats;
    return g.enemies.filter(e=>e.boss).every(e=>g.mode==='battle'?r.bossBank(e.type)?.ready&&r.bossFrames?.[e.type]:e.bossArt===undefined?r.animations.vehicleEnemies.ready:v.bossBank().ready&&v.bossBank().frames.has(e.bossArt));
   },{},{timeout:12000}).catch(async error=>{
    const banks=await frame.evaluate(()=>Object.fromEntries(Object.entries(thundercats.renderer.animations).filter(([k])=>k.startsWith('boss-')||k.startsWith('vehicle')).map(([k,b])=>[k,{ready:b.ready,frames:[...b.frames.keys()]}])));
    throw new Error('Boss artwork did not render: '+state.id+' '+JSON.stringify(banks),{cause:error});
   });
   if(!standalone&&['ruins','snow-pass','plundarr','astral-gate','feliner-deep'].includes(state.id))await frame.locator('#game').screenshot({path:path.join(root,'test-results','villain-'+state.id+'.png')});
  }
  assert.equal(villains.length,20);assert.equal(new Set(villains).size,20);
  await page.keyboard.press('Escape');await frame.locator('#quit').click();await frame.locator('#newGame').click();
  if(!standalone){await page.setViewportSize({width:740,height:720});await page.screenshot({path:path.join(root,'test-results','googlesite-mobile.png')});const fit=await frame.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);assert.equal(fit,true,'Horizontal overflow inside iframe');}
  if(standalone)assert.ok(requests.every(url=>url===base+'/googlesite/standalone.html'),'Standalone loaded external files: '+requests.map(s=>s.slice(0,140)).join(', '));
  assert.deepEqual(errors,[]);report.checks.push({name:standalone?'Standalone HTML in opaque sandbox, no storage or gamepad permission':'Hosted subdirectory in cross-origin sandbox with gamepad denied',restrictions,backgroundTransition,pitReturn,routes,expeditions,villains,heroSwitching:true,externalRequests:standalone?requests.length:undefined,passed:true});
  await context.close();
 }
 report.passed=true;await fs.writeFile(path.join(out,'TEST-RESULTS.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}catch(error){report.passed=false;report.errors.push(error.message);await fs.writeFile(path.join(out,'TEST-RESULTS.json'),JSON.stringify(report,null,2)+'\n');throw error;}
finally{if(browser)await browser.close();if(parent)await new Promise(resolve=>parent.close(resolve));child.kill();}
