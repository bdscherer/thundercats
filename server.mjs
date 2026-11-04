import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {networkInterfaces} from 'node:os';
const root = path.dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT||4173);
const host=process.env.HOST||'0.0.0.0';
function openGame(actualPort=port){const url='http://localhost:'+actualPort;const child=process.platform==='win32'?spawn('rundll32.exe',['url.dll,FileProtocolHandler',url],{windowsHide:true,detached:true,stdio:'ignore'}):spawn(process.platform==='darwin'?'open':'xdg-open',[url],{detached:true,stdio:'ignore'});child.on('error',()=>console.log('Open '+url+' in your browser.'));child.unref();}
const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png' };
const server = http.createServer((req, res) => {
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'}).end();return;}
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end('Invalid URL');return;}
  if(pathname==='/googlesite'){res.writeHead(301,{'Location':'/googlesite/'+new URL(req.url,'http://localhost').search}).end();return;}
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname === '/googlesite/' ? '/googlesite/index.html' : pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  // LAN visitors get the game files, without access to the rest of the workspace.
  const relative=path.relative(root,file).split(path.sep).join('/'),ext=path.extname(file);
  const embedded=relative.startsWith('googlesite/'),appPath=embedded?relative.slice('googlesite/'.length):relative;
  const publicFile=appPath==='index.html'||appPath==='style.css'||(appPath.startsWith('src/')&&ext==='.js')||(appPath.startsWith('assets/')&&Object.hasOwn(types,ext))||(embedded&&['embed.css','standalone.html','embed-preview.html','embed-code.html'].includes(appPath));
  if(!publicFile){res.writeHead(404).end('Not found');return;}
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-cache' });
    res.end(req.method==='HEAD'?undefined:data);
  });
});
server.on('error',error=>{if(error.code==='EADDRINUSE'&&process.argv.includes('--open')){console.log('Port '+port+' is in use; opening the existing local address.');openGame();}else{console.error(error.message);process.exitCode=1;}});
server.listen(port,host,()=>{
 const actualPort=server.address().port;
 console.log('ThunderCats: Third Earth');console.log('Local: http://localhost:'+actualPort);console.log('Listening: '+host+':'+actualPort);
 if(host==='0.0.0.0'||host==='::'){
  for(const items of Object.values(networkInterfaces()))for(const item of items)if(item.family==='IPv4'&&!item.internal&&!item.address.startsWith('169.254.'))console.log('Network: http://'+item.address+':'+actualPort);
 }else if(host!=='127.0.0.1'&&host!=='localhost')console.log('Network: http://'+host+':'+actualPort);
 if(process.argv.includes('--open'))openGame(actualPort);
});
