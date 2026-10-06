import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {dirname,extname,resolve,sep} from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const cwd=process.cwd(),require=createRequire(import.meta.url),evidence=resolve(process.env.UI_CROSS_BROWSER_EVIDENCE??'test-results/cross-browser');
const engines=process.env.UI_CROSS_BROWSER_ENGINES??'chromium,firefox,webkit';
const names=engines.split(',');if(!names.length||new Set(names).size!==names.length||names.some(name=>!['chromium','firefox','webkit'].includes(name)))throw new Error('Select distinct supported engines with UI_CROSS_BROWSER_ENGINES.');
const filters=process.argv.slice(2);if(filters.some(value=>value.startsWith('-c')||/^--(?:config|retries|repeat-each|pass-with-no-tests|ignore-snapshots)/.test(value)))throw new Error('Config, retries, repeated runs and no-test masking cannot be overridden.');
await mkdir(evidence,{recursive:true});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const receipt={startedAtUtc:new Date().toISOString(),engines:names,explicitPlaywrightFilters:filters,playwright:require('@playwright/test/package.json').version,scope:'Explicit focused cross-browser suite only; npm test/default UI discovery unchanged',build:'RUNNING',native:'NOT RUN',serverClosed:false};
const save=()=>writeFile(resolve(evidence,'run-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
await save();
const run=(command,args,env=process.env)=>new Promise((done,reject)=>{const child=spawn(command,args,{cwd,env,stdio:'inherit'});child.once('error',reject);child.once('exit',(code,signal)=>done({code,signal}));});
const build=await run(process.platform==='win32'?'npm.cmd':'npm',['run','build']);receipt.build=build;await save();
if(build.code!==0){process.exitCode=build.code??1;}else{
 const root=resolve('dist/fixture-app'),mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.pdf':'application/pdf','.svg':'image/svg+xml','.json':'application/json','.vtt':'text/vtt','.wav':'audio/wav','.webm':'video/webm','.png':'image/png','.map':'application/json'};
 receipt.bundleSha256=hash(await readFile(resolve(root,'main.js')));
 const server=createServer(async(request,response)=>{try{
  const pathname=decodeURIComponent(new URL(request.url,'http://127.0.0.1').pathname);
  if(pathname==='/favicon.ico'){response.writeHead(204).end();return;}
  const path=resolve(root,'.'+(pathname==='/'||pathname==='/catalog'||pathname.startsWith('/catalog/')?'/index.html':pathname));
  if(!path.startsWith(root+sep)){response.writeHead(403).end();return;}
  const body=await readFile(path);response.writeHead(200,{'Content-Type':mime[extname(path)]??'application/octet-stream','Cache-Control':'no-store'});response.end(body);
 }catch{response.writeHead(404).end('Not found');}});
 try{
  await new Promise((done,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',done);});
  const address=server.address();if(!address||typeof address==='string')throw Error('No owned loopback address');
  receipt.origin='http://127.0.0.1:'+address.port;await save();
  const playwrightPackage=require('playwright/package.json'),cli=resolve(dirname(require.resolve('playwright/package.json')),playwrightPackage.bin.playwright);
  const native=await run(process.execPath,[cli,'test','-c','playwright.cross-browser.config.ts',...filters],{...process.env,UI_CROSS_BROWSER_URL:receipt.origin,UI_CROSS_BROWSER_ENGINES:engines,UI_CROSS_BROWSER_EVIDENCE:evidence});
  receipt.native=native;process.exitCode=native.code??1;
 }finally{
  server.closeAllConnections();await new Promise(done=>server.close(done));receipt.serverClosed=true;receipt.completedAtUtc=new Date().toISOString();await save();
 }
}
