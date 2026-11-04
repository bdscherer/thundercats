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
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||exe});const page=await browser.newPage({viewport:{width:1280,height:850}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+port);
 await page.waitForFunction(()=>window.thundercats&&thundercats.renderer.backdrops.every(img=>img.complete&&img.naturalWidth)&&Object.values(thundercats.renderer.animations).every(b=>b.ready)&&thundercats.vehicleRenderer.terrain.naturalWidth>0);
 const result=await page.evaluate(async()=>{
  const {STAGES}=await import('./src/data.js'),{VehicleGame,VEHICLE_MISSIONS}=await import('./src/vehicle.js'),r=thundercats.renderer,vr=thundercats.vehicleRenderer;
  const canvas=()=>{const cv=document.createElement('canvas');cv.width=960;cv.height=540;return cv;};
  const world=(stage,camera)=>{const cv=canvas();r.world(cv.getContext('2d'),stage,camera,0,{scenery:[]});return cv;};
  const difference=(a,b,y=0,h=540)=>{const aa=a.getContext('2d').getImageData(0,y,960,h).data,bb=b.getContext('2d').getImageData(0,y,960,h).data;let total=0,n=0;for(let i=0;i<aa.length;i+=16){for(let j=0;j<3;j++){total+=Math.abs(aa[i+j]-bb[i+j]);n++;}}return total/n;};
  const sections=[];
  for(const [stageIndex,stage] of STAGES.entries())for(const section of stage.sections.slice(1)){
   // The old implementation changed the whole screen at x-350. Also check
   // both ends of the new spatial blend and its final fully opaque handover.
   for(const camera of [section.x-350,section.x-320,section.x,section.x+320]){
    const a=world(stageIndex,camera-.02),b=world(stageIndex,camera+.02);sections.push({theme:stage.theme,boundary:section.x,camera,sky:difference(a,b,0,328),floor:difference(a,b,338,202)});
   }
  }
  const camera=1200,edge=Math.round(1100-camera*.42),soft=world(0,camera),hard=canvas(),hc=hard.getContext('2d');r.tileScenery(hc,r.backdrops[1],camera,.24);hc.drawImage(r.backdrops[0],20-camera*.42,0,1080,540);
  const seam=cv=>{const pixels=cv.getContext('2d').getImageData(edge-1,0,2,328).data;let total=0;for(let y=0;y<328;y++)for(let ch=0;ch<3;ch++)total+=Math.abs(pixels[y*8+ch]-pixels[y*8+4+ch]);return total/(328*3);};
  const lair={legacySeam:seam(hard),blendedSeam:seam(soft)};
  const coverage=[];for(const stage of [0,1,2,3,4])for(const offset of [-1,.01,959.99,960,1919.99,4800]){
   const cv=canvas(),c=cv.getContext('2d');r.tileScenery(c,r.backdrops[stage],offset/.42,.42);const pixels=c.getImageData(0,0,960,338).data;let minAlpha=255;for(let i=3;i<pixels.length;i+=4)minAlpha=Math.min(minAlpha,pixels[i]);coverage.push({stage,offset,minAlpha});
  }
  const vehicle=(mission,scroll,distance)=>{const cv=canvas(),g=new VehicleGame({mission});g.scroll=g.prevScroll=scroll;g.distance=g.prevDistance=distance;g.sectionIndex=Math.min(2,Math.floor(distance/(mission.length/3)));g.banner=0;const ctx=r.ctx,ratio=r.resolutionScale;try{r.ctx=cv.getContext('2d');r.resolutionScale=1;vr.render(g,0,{alpha:1});}finally{r.ctx=ctx;r.resolutionScale=ratio;}return cv;};
  const vehicles=[];for(const mission of VEHICLE_MISSIONS){for(const scroll of [550,650,1100,1950])vehicles.push({mission:mission.id,kind:'tile wrap',at:scroll,change:difference(vehicle(mission,scroll-.02,1000),vehicle(mission,scroll+.02,1000),100,230)});for(const distance of [mission.length/3,mission.length*2/3])vehicles.push({mission:mission.id,kind:'section',at:distance,change:difference(vehicle(mission,400,distance-.02),vehicle(mission,400,distance+.02),100,230)});}
  const sheet=document.createElement('canvas');sheet.width=1440;sheet.height=310*5;const sc=sheet.getContext('2d');sc.fillStyle='#0c2028';sc.fillRect(0,0,sheet.width,sheet.height);sc.font='16px sans-serif';sc.fillStyle='#eee';
  for(let i=0;i<5;i++){for(let j=0;j<3;j++){const cam=i===0?[900,1200,1500][j]:STAGES[i].sections[1].x-700+j*320;sc.drawImage(world(i,cam),j*480,i*310+30,480,270);sc.fillText(STAGES[i].theme+' — camera '+cam,j*480+12,i*310+21);}}
  return {sections,lair,coverage,vehicles,screenshot:sheet.toDataURL('image/png')};
 });
 const {screenshot,...report}=result;await fs.mkdir(path.join(root,'test-results'),{recursive:true});await fs.writeFile(path.join(root,'test-results','background-transitions.png'),Buffer.from(screenshot.split(',')[1],'base64'));
 for(const row of report.sections){assert.ok(row.sky<1.5&&row.floor<1.5,'Background popped at a section boundary: '+JSON.stringify(row));}
 assert.ok(report.lair.blendedSeam<report.lair.legacySeam*.35,'Cat’s Lair still has a hard image edge: '+JSON.stringify(report.lair));
 assert.ok(report.coverage.every(row=>row.minAlpha===255),'A scenery tile left a transparent seam: '+JSON.stringify(report.coverage.filter(row=>row.minAlpha<255)));
 assert.ok(report.vehicles.every(row=>row.change<1.5),'Vehicle background popped: '+JSON.stringify(report.vehicles));assert.deepEqual(errors,[]);
 await fs.writeFile(path.join(root,'test-results','background-transition-report.json'),JSON.stringify({...report,errors},null,2));console.log(JSON.stringify({sectionChecks:report.sections.length,maxSectionChange:Math.max(...report.sections.flatMap(r=>[r.sky,r.floor])),lair:report.lair,coverageChecks:report.coverage.length,vehicleChecks:report.vehicles.length,maxVehicleChange:Math.max(...report.vehicles.map(r=>r.change)),errors}));
}finally{if(browser)await browser.close();child.kill();}
