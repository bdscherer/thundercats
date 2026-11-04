import {chromium} from 'playwright';
import {readdirSync,existsSync} from 'node:fs';
import {homedir} from 'node:os';
import path from 'node:path';
const cache=path.join(homedir(),'AppData','Local','ms-playwright');const exe=existsSync(cache)?readdirSync(cache).filter(n=>/^chromium-/.test(n)).map(n=>path.join(cache,n,'chrome-win','chrome.exe')).find(existsSync):undefined;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||exe});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1050}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>Object.values(thundercats.renderer.animations).every(b=>b.image.complete));await page.waitForTimeout(200);
 const banks=await page.evaluate(()=>Object.fromEntries(Object.entries(thundercats.renderer.animations).map(([name,b])=>[name,{ready:b.ready,frames:b.frames.size,dimensions:[b.image.width,b.image.height],missing:Array.from({length:b.rows*b.cols},(_,i)=>i).filter(i=>!b.frames.has(i)),largest:Math.max(...[...b.frames.values()].map(f=>f.area))}])));
 console.log(JSON.stringify({banks,errors}));await page.screenshot({path:'test-results/animation-title.png'});
}finally{await browser.close();}
