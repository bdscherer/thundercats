import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import {existsSync,readdirSync} from 'node:fs';
import {homedir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const child=spawn(process.execPath,[path.join(root,'server.mjs')],{env:{...process.env,HOST:'127.0.0.1',PORT:'0'},stdio:['ignore','pipe','pipe'],windowsHide:true});
let logs='',stderr='',browser;child.stdout.on('data',d=>logs+=d);child.stderr.on('data',d=>stderr+=d);
try{
 const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Server startup timed out: '+stderr)),10000);child.stdout.on('data',()=>{const m=logs.match(/Local: http:\/\/localhost:(\d+)/);if(m){clearTimeout(timer);resolve(Number(m[1]));}});child.once('error',reject);});
 const cache=path.join(homedir(),'AppData','Local','ms-playwright'),exe=existsSync(cache)?readdirSync(cache).filter(n=>/^chromium-/.test(n)).map(n=>path.join(cache,n,'chrome-win','chrome.exe')).find(existsSync):undefined;
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||exe});
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await fs.mkdir(path.join(root,'test-results'),{recursive:true});
 await page.goto('http://127.0.0.1:'+port);await page.waitForFunction(()=>window.thundercats&&Object.values(thundercats.renderer.animations).every(b=>b.ready));
 await page.locator('#newGame').click();await page.locator('#begin').click();
 await page.evaluate(()=>{const g=thundercats.game;g.banner=0;g.props=[];g.completed=new Set([0,1]);const p=g.players[0];p.invuln=0;p.y=p.prevY=395;window.__runFrames=[];window.__oldRunFrames=[];for(const [name,seen] of [['lionRun',__runFrames],['run',__oldRunFrames]]){const map=thundercats.renderer.animations[name].frames,get=map.get.bind(map);map.get=k=>{seen.push(k);return get(k);};}});
 await page.keyboard.down('ArrowRight');await page.waitForTimeout(1200);await page.locator('#game').screenshot({path:path.join(root,'test-results','lion-o-run-fixed.png')}).catch(()=>page.screenshot({path:path.join(root,'test-results','lion-o-run-fixed.png')}));await page.keyboard.up('ArrowRight');
 const run=await page.evaluate(()=>({frames:[...new Set(__runFrames)].sort(),oldFrames:[...new Set(__oldRunFrames)],x:thundercats.game.players[0].x}));
 assert.deepEqual(run.frames,[0,1,2,3,4,5,6,7]);assert.deepEqual(run.oldFrames,[]);assert.ok(run.x>250);
 await page.keyboard.down('ArrowLeft');await page.waitForTimeout(300);await page.keyboard.up('ArrowLeft');assert.equal(await page.evaluate(()=>thundercats.game.players[0].face),-1);
 await page.keyboard.press('Escape');await page.addStyleTag({content:'#overlay{display:none}'});
 const canvas=page.locator('canvas').first();
 for(let stage=0;stage<5;stage++){
  await page.evaluate(index=>{const g=thundercats.game;g.loadStage(index);g.props=[];g.enemies=[];g.banner=0;const pit=g.pits[0],p=g.players[0];g.camera=g.prevCamera=pit.x-470;p.x=p.prevX=pit.x-85;p.y=p.prevY=440;p.animTime=1;p.invuln=0;},stage);
  await page.waitForTimeout(50);await canvas.screenshot({path:path.join(root,'test-results','hole-'+stage+'.png')});
 }
 const before=await page.evaluate(()=>{const g=thundercats.game;g.loadStage(0);g.props=[];g.enemies=[];g.banner=0;g.completed=new Set([0,1]);const p=g.players[0],pit=g.pits[0];g.camera=g.prevCamera=pit.x-470;p.x=p.prevX=pit.x+35;p.y=p.prevY=440;p.invuln=0;p.safeGround={x:pit.x-45,y:440};g.update(1/60,[{}]);return {hp:p.hp,action:p.action};});
 assert.equal(before.action,'pitfall');
 await page.evaluate(()=>{for(let i=0;i<24;i++)thundercats.game.update(1/60,[{}]);});await page.waitForTimeout(40);await canvas.screenshot({path:path.join(root,'test-results','hole-falling.png')});
 const returned=await page.evaluate(()=>{const g=thundercats.game,p=g.players[0];for(let i=0;i<100&&p.fall;i++)g.update(1/60,[{}]);return {hp:p.hp,maxHp:p.maxHp,x:p.x,y:p.y,blink:p.pitBlink,invuln:p.invuln,action:p.action};});
 assert.equal(returned.hp,before.hp-Math.ceil(returned.maxHp*.22));assert.equal(returned.blink,1);assert.equal(returned.invuln,1);assert.equal(returned.action,'idle');
 const blink=await page.evaluate(()=>{const g=thundercats.game,p=g.players[0],r=thundercats.renderer,cv=document.createElement('canvas');cv.width=200;cv.height=180;const c=cv.getContext('2d'),counts=[];for(let i=0;i<11;i++){c.clearRect(0,0,200,180);r.hero(c,{...p,x:100,y:150,prevX:100,prevY:150},0);const pixels=c.getImageData(0,0,200,180).data;let n=0;for(let a=3;a<pixels.length;a+=4)if(pixels[a]>150)n++;counts.push(n);if(i<10)for(let j=0;j<6;j++)g.update(1/60,[{}]);}return {counts,blink:p.pitBlink,invuln:p.invuln};});
 assert.ok(blink.counts.some(n=>n>1000)&&blink.counts.some(n=>n===0),'Hero did not visibly blink: '+JSON.stringify(blink));assert.ok(blink.blink<1e-9);assert.ok(blink.invuln<1e-9);
 await page.waitForTimeout(50);await canvas.screenshot({path:path.join(root,'test-results','hole-returned.png')});
 assert.deepEqual(errors,[]);const report={testedAt:new Date().toISOString(),run,fall:before,returned,blink,errors};await fs.writeFile(path.join(root,'test-results','pit-animation-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{if(browser)await browser.close();child.kill();}
