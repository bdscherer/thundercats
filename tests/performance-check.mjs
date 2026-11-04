import {chromium} from 'playwright';
import {readdirSync,existsSync} from 'node:fs';
import {homedir} from 'node:os';
import path from 'node:path';
const cache=path.join(homedir(),'AppData','Local','ms-playwright');const exe=existsSync(cache)?readdirSync(cache).filter(n=>/^chromium-/.test(n)).map(n=>path.join(cache,n,'chrome-win','chrome.exe')).find(existsSync):undefined;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||exe});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1050}});await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>Object.values(thundercats.renderer.animations).every(b=>b.ready));
 await page.locator('#newGame').click();for(const i of [1,2,3])await page.locator(`[data-hero="${i}"]`).click();await page.locator('#begin').click();
 await page.evaluate(()=>{const g=thundercats.game;g.banner=0;g.players.forEach((p,i)=>{p.invuln=999;p.x=430+i*55;p.y=360+i*23;});const r=thundercats.renderer,render=r.render.bind(r);window.__cost=[];r.render=(...args)=>{const start=performance.now();render(...args);window.__cost.push(performance.now()-start);};});
 await page.keyboard.down('j');await page.keyboard.down('Numpad1');await page.keyboard.down('v');await page.keyboard.down('[');await page.waitForTimeout(800);
 const result=await page.evaluate(()=>new Promise(resolve=>{const intervals=[];let prior=performance.now();function sample(now){intervals.push(now-prior);prior=now;if(intervals.length<150)requestAnimationFrame(sample);else{const costs=window.__cost.slice(-140),mean=a=>a.reduce((x,y)=>x+y,0)/a.length;resolve({averageFrameMs:+mean(intervals.slice(1)).toFixed(2),renderMs:+mean(costs).toFixed(2),maxRenderMs:+Math.max(...costs).toFixed(2),enemies:thundercats.game.enemies.length,particles:thundercats.game.particles.length,resolution:[thundercats.fpsCanvas.width,thundercats.fpsCanvas.height]});}}requestAnimationFrame(sample);}));console.log(JSON.stringify(result));
 await page.screenshot({path:'test-results/arcade-action.png'});
}finally{await browser.close();}
