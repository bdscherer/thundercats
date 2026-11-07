import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url)),out=path.join(root,'googlesite');
const sourceNames=['main','campaign','game','vehicle','vehicle-art','hoverboard','hoverboard-art','art','audio','input','combat','data','bosses'].map(n=>n+'.js');
const assetNames=[
 'thundercats-emblem.png','heroes-hd.png','heroes-run.png','lion-o-run-v2.png','heroes-combo.png','heroes-actions.png','villains-hd.png','villains-run.png','supports-1985.png','enemy-specialists.png','world-landmarks.png','thundertank-1985.png',
 ...['slythe','monkian','jackalman','mummra'].map(n=>'boss-'+n+'-1985.png'),
 ...['lair','forest','ruins','desert','pyramid'].map(n=>n+'-hd.png'),
 'vehicle-heroes-topdown.png','vehicle-enemies-topdown.png','vehicle-terrain-topdown-v2.png','expedition-worlds-a.png','expedition-worlds-b.png', ...['a','b','c','d'].map(id=>'boss-roster-'+id+'.png'), 'boss-vehicles-1985.png',
 'spaceboard-riders.png','berserker-coast.png','hammerhand-gunboat.png','tuskania-spillway.png','giant-technopede.png'
];
await fs.mkdir(path.join(out,'src'),{recursive:true});await fs.mkdir(path.join(out,'assets'),{recursive:true});
for(const name of sourceNames)await fs.copyFile(path.join(root,'src',name),path.join(out,'src',name));
for(const name of assetNames)await fs.copyFile(path.join(root,'assets',name),path.join(out,'assets',name));
const css=(await fs.readFile(path.join(root,'style.css'),'utf8')).replace(/^@import[^\r\n]*\r?\n/,'');
if(!css.trimStart().startsWith(':root'))throw new Error('The exported theme must begin with the root style rule');
const embedCss=`/* Compact frame layout for Google Sites and other iframe hosts. */
html,body{margin:0;min-height:0;background:#091011}#app{width:100%;max-width:none;padding:0}.masthead{height:48px;margin:0;padding:0 12px;border:0}.brand{font-size:18px;gap:8px}.brand .sigil{height:27px;width:27px}.brand-sub,.edition,.page-footer,.cabinet-label,.cabinet-bottom{display:none}.cabinet{padding:0;border:0;border-radius:0;box-shadow:none}.screen{border:0;border-radius:0;width:100%;aspect-ratio:16/9}.title-mark h1{font-size:clamp(36px,9vw,113px)}.title-screen{padding-top:4%}.title-foot{font-size:clamp(6px,.85vw,9px);gap:10px}.touch-controls{margin:8px 0;padding:0 10px}.toast{max-width:90%;text-align:center}.screen:focus{outline:0}
@media(max-width:600px){.masthead{height:42px}.brand{font-size:15px}.help-button{font-size:8px}.toolbar{gap:5px}.icon-button{width:30px;height:30px}.screen{aspect-ratio:4/3;min-height:300px}.screen canvas{object-fit:contain}.title-mark h1{font-size:clamp(31px,9vw,55px)}.panel{width:100%}.hero-card{padding:7px}.roster{gap:5px}.hero-card h3{font-size:17px}.hero-card canvas{height:65px}.hero-card .role,.hero-card .weapon{font-size:6px}.title-foot{letter-spacing:.5px}.lobby-bottom{gap:7px}.lobby-bottom .primary{min-height:36px}.touch-actions{gap:4px}}
`;
await fs.writeFile(path.join(out,'style.css'),css);await fs.writeFile(path.join(out,'embed.css'),embedCss);
let index=await fs.readFile(path.join(root,'index.html'),'utf8');
index=index.replace('<link rel="stylesheet" href="style.css" />','<link rel="stylesheet" href="style.css" />\n  <link rel="stylesheet" href="embed.css" />').replace('id="screen"','id="screen" tabindex="0"');
await fs.writeFile(path.join(out,'index.html'),index);
const assets={};for(const name of assetNames)assets['assets/'+name]='data:image/png;base64,'+(await fs.readFile(path.join(root,'assets',name))).toString('base64');
const modules=[];
for(const name of sourceNames){
 let code=await fs.readFile(path.join(root,'src',name),'utf8');const exports=[];
 code=code.replace(/^import\s*\{([^}]+)\}\s*from\s*['"]\.\/([^'"]+)['"];?\s*$/gm,(_,bindings,id)=>'const {'+bindings.split(',').map(b=>b.trim().replace(/\s+as\s+/,':')).join(',')+'}=__load('+JSON.stringify(id)+');');
 code=code.replace(/\bexport\s+(const|let|class|function)\s+(\w+)/g,(_,kind,id)=>{exports.push(id);return kind+' '+id;});
 if(/^\s*(import|export)\s/m.test(code))throw new Error('Unsupported module syntax in '+name);
 code=code.replace(/(\.src\s*=\s*)([^;\n]+);/g,'$1__asset($2);');
 // The emblem is also inserted through HTML strings rather than Image.src.
 code=code.replaceAll('src="assets/thundercats-emblem.png"','src="'+assets['assets/thundercats-emblem.png']+'"');
 modules.push(JSON.stringify(name)+':()=>{\n'+code+'\nreturn {'+exports.join(',')+'};\n}');
}
const bundle='(()=>{\n"use strict";\nconst __assets='+JSON.stringify(assets)+';\nconst __asset=url=>__assets[url]||url;\nconst __cache={};\nconst __modules={'+modules.join(',\n')+'};\nfunction __load(id){return __cache[id]||(__cache[id]=__modules[id]());}\n__load("main.js");\n})();';
let standalone=index.replace('<link rel="stylesheet" href="style.css" />','<style>'+css.replaceAll('</style','<\\/style')+'</style>').replace('<link rel="stylesheet" href="embed.css" />','<style>'+embedCss+'</style>').replace('<script type="module" src="src/main.js"></script>','<script>'+bundle.replaceAll('</script','<\\/script')+'</script>');
standalone=standalone.replaceAll('src="assets/thundercats-emblem.png"','src="'+assets['assets/thundercats-emblem.png']+'"');
await fs.writeFile(path.join(out,'standalone.html'),standalone);
const snippet='<iframe\n  src="https://YOUR-HOST.example/googlesite/"\n  title="ThunderCats: Third Earth"\n  width="100%"\n  height="720"\n  style="display:block;border:0;background:#091011;"\n  allow="autoplay; fullscreen; gamepad"\n  allowfullscreen\n></iframe>\n';
await fs.writeFile(path.join(out,'embed-code.html'),snippet);
await fs.writeFile(path.join(out,'embed-preview.html'),'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ThunderCats iframe preview</title><style>body{margin:0;background:#eee;color:#233;font:16px system-ui}main{max-width:1200px;margin:auto}p{padding:0 12px}iframe{display:block;width:100%;height:760px;border:0;background:#091011}</style><main><p>Iframe preview — click inside the game to use the keyboard.</p><iframe src="./index.html" title="ThunderCats" allow="autoplay; fullscreen; gamepad" allowfullscreen></iframe></main></html>');
const manifest={builtAt:new Date().toISOString(),entry:'index.html',standalone:'standalone.html',standaloneBytes:Buffer.byteLength(standalone),runtimeAssets:assetNames.length,files:[]};
for(const name of ['index.html','style.css','embed.css','standalone.html',...sourceNames.map(n=>'src/'+n),...assetNames.map(n=>'assets/'+n)]){const data=await fs.readFile(path.join(out,name));manifest.files.push({path:name,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});}
await fs.writeFile(path.join(out,'build-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({directory:out,runtimeAssets:assetNames.length,standaloneMB:+(manifest.standaloneBytes/1024/1024).toFixed(2),files:manifest.files.length}));
