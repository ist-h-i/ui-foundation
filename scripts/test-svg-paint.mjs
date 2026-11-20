import {mkdtemp,cp,readFile,writeFile,mkdir,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {prepareSvgConsumer} from './verification/prepare-svg-consumer.mjs';

const root=await realpath(process.argv[2]??fileURLToPath(new URL('../',import.meta.url)));
const fixtures=fileURLToPath(new URL('../tests/consumer-svg-paint/',import.meta.url));
const work=await mkdtemp(join(tmpdir(),'ui-svg-paint-'));
const output=resolve(process.env.UI_SVG_EVIDENCE??join(root,'test-results/svg-paint'));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
await mkdir(join(work,'evidence'));await mkdir(output,{recursive:true});
const {sourceFiles,installed}=await prepareSvgConsumer({root,work,fixtures});
await writeFile(join(work,'evidence/source-input.json'),JSON.stringify({root,work,sourceFiles,installed},null,2)+'\n');
// Diagnostic helper filters must never narrow the permanent 34-scenario contract.
const childEnvironment={...process.env};
for(const name of ['PAINT_CONFIG','PAINT_ONE','SVG_PAINT_EVIDENCE_DIR','SVG_CONSUMER_URL','SVG_PORT'])delete childEnvironment[name];
const steps=[];let nativeContract=null,successful=false;
async function run(name,args,env={}){
 const child=spawn(process.execPath,args,{cwd:work,env:{...childEnvironment,...env},stdio:['ignore','pipe','pipe']});let stdout='',stderr='';child.stdout.on('data',data=>{stdout+=data;process.stdout.write(data);});child.stderr.on('data',data=>{stderr+=data;process.stderr.write(data);});
 const exit=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',(code,signal)=>resolve({code,signal}));});
 await writeFile(join(work,'evidence',name+'.log'),stdout+stderr);await writeFile(join(work,'evidence',name+'.exit'),String(exit.code??exit.signal)+'\n');steps.push({name,command:[process.execPath,...args],...exit});assert.equal(exit.code,0,name);
}
let server,serverExit;
try{
 await run('canonical-sync',['--import','tsx','src/cli.ts','sync','--config','examples/ui.config.repository.yaml']);
 const manifestBefore=digest(await readFile(join(work,'.ui/generated/manifest.json')));
 const managed=JSON.parse(await readFile(join(work,'.ui/generated/manifest.json'),'utf8')),managedHashes={};for(const path of Object.keys(managed.files))managedHashes[path]=digest(await readFile(join(work,path)));
 await run('canonical-check',['--import','tsx','src/cli.ts','check','--config','examples/ui.config.repository.yaml']);
 await run('canonical-idempotent',['--import','tsx','src/cli.ts','sync','--config','examples/ui.config.repository.yaml']);
 await run('canonical-dry-run',['--import','tsx','src/cli.ts','sync','--dry-run','--config','examples/ui.config.repository.yaml']);
 assert.equal(digest(await readFile(join(work,'.ui/generated/manifest.json'))),manifestBefore,'CLI manifest idempotency');for(const [path,sha] of Object.entries(managedHashes))assert.equal(digest(await readFile(join(work,path))),sha,'Owned output idempotency '+path);
 await run('public-consumer-production-build',['build-consumer.mjs']);
 server=spawn(process.execPath,['serve-consumer.mjs'],{cwd:work,env:{...childEnvironment,SVG_PORT:'0'},stdio:['ignore','pipe','pipe']});serverExit=new Promise(resolve=>server.once('exit',(code,signal)=>resolve({code,signal})));let serverLog='';server.stderr.on('data',data=>{serverLog+=data;});
 const ready=await new Promise((resolve,reject)=>{let buffer='';server.stdout.on('data',data=>{buffer+=data;serverLog+=data;const newline=buffer.indexOf('\n');if(newline!==-1){try{resolve(JSON.parse(buffer.slice(0,newline)));}catch(error){reject(error);}}});server.once('error',reject);server.once('exit',()=>reject(Error('Own server exited before readiness')));});
 assert.ok(ready.port>0&&ready.pid===server.pid,'Owned ephemeral localhost listener');
 await run('native-glyph-paint-contrast',['harness/verify-paint.mjs'],{SVG_CONSUMER_URL:`http://127.0.0.1:${ready.port}/`,SVG_PAINT_EVIDENCE_DIR:pathToFileURL(join(work,'evidence')+'/').href});
 const native=JSON.parse(await readFile(join(work,'evidence/candidate-paint-native.json'),'utf8'));
 assert.ok(Array.isArray(native.rows),'Native result must record the executed scenarios');
 assert.equal(native.rows.length,34,'Permanent verification requires all 34 scenarios; zero or filtered cases cannot pass');
 assert.equal(new Set(native.rows.map(row=>JSON.stringify([row.profile,row.width,row.direction,row.locale,row.precision,row.data]))).size,34,'All 34 scenario results must be distinct');
 assert.equal(native.allExpected,true,'Native aggregate must report success');
 assert.ok(native.rows.every(row=>row.passed===true&&Array.isArray(row.errors)&&row.errors.length===0),'Every scenario must pass without runtime errors');
 nativeContract={requiredScenarios:34,recordedScenarios:native.rows.length,allSuccessful:true,evidencePath:join(work,'evidence/candidate-paint-native.json')};
 assert.equal(steps.length,6,'All canonical generation/build/native steps must execute');
 assert.ok(steps.every(step=>step.code===0),'Every required step must exit successfully');
 successful=true;
 await writeFile(join(work,'evidence/server.log'),serverLog);
}finally{
 if(server&&server.exitCode===null){server.kill('SIGTERM');await serverExit;}
 for(const file of sourceFiles)assert.equal(digest(await readFile(join(root,file.path))),file.sha256,'Source unchanged during consumer verification '+file.path);
 await writeFile(join(work,'evidence/execution.json'),JSON.stringify({root,work,output,steps,successful,nativeContract,sourceUnchanged:true,ignoredSelectionEnvironment:['PAINT_CONFIG','PAINT_ONE'],ownServerPid:server?.pid??null,ownServerClosed:server?server.exitCode!==null||server.signalCode!==null:true},null,2)+'\n');
 await cp(join(work,'evidence'),output,{recursive:true});
 console.log(JSON.stringify({scope:'Generated public Chart consumer, exact glyph/clip/contrast/native behavior; axe incomplete retained independently',output,work,successful,nativeContract,steps:steps.map(step=>({name:step.name,exit:step.code}))}));
}
