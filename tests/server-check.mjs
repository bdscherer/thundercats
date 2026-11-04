import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {networkInterfaces} from 'node:os';
import {fileURLToPath} from 'node:url';
const file=fileURLToPath(new URL('../server.mjs',import.meta.url));
const child=spawn(process.execPath,[file],{env:{...process.env,HOST:'0.0.0.0',PORT:'0'},stdio:['ignore','pipe','pipe'],windowsHide:true});
let output='',stderr='';child.stderr.on('data',data=>stderr+=data);
try{
 const port=await new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>reject(new Error('Server startup timed out: '+stderr)),10000);
  child.stdout.on('data',data=>{output+=data;const match=output.match(/Local: http:\/\/localhost:(\d+)/);if(match){clearTimeout(timeout);resolve(Number(match[1]));}});
  child.once('error',error=>{clearTimeout(timeout);reject(error);});child.once('exit',code=>{clearTimeout(timeout);reject(new Error('Server exited '+code+': '+stderr));});
 });
 const base='http://127.0.0.1:'+port;const checks=[];
 for(const [route,expected,method='GET']of [['/',200],['/style.css',200],['/src/main.js',200],['/assets/sigil.svg',200],['/README.md',404],['/package.json',404],['/.git/config',404],['/node_modules/playwright/package.json',404],['/%E0%A4%A',400],['/',405,'POST'],['/',200,'HEAD']]){
  const response=await fetch(base+route,{method});assert.equal(response.status,expected,route);if(method==='HEAD')assert.equal(await response.text(),'');checks.push({route,method,status:response.status});
 }
 assert.match(output,/Listening: 0\.0\.0\.0:/);
 assert.doesNotMatch(output,/Network: http:\/\/0\.0\.0\.0:/);
 const addresses=Object.values(networkInterfaces()).flat().filter(item=>item.family==='IPv4'&&!item.internal&&!item.address.startsWith('169.254.')).map(item=>item.address);
 const networkChecks=[];for(const address of addresses){const url='http://'+address+':'+port;const response=await fetch(url,{signal:AbortSignal.timeout(5000)});assert.equal(response.status,200);networkChecks.push({address,status:response.status});}
 console.log(JSON.stringify({listening:'0.0.0.0',checks,networkChecks}));
}finally{child.kill();}
