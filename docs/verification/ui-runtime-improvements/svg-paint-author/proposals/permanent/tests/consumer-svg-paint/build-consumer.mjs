import {build} from 'esbuild';
import {transformAsync} from '@babel/core';
import linkerPlugin from '@angular/compiler-cli/linker/babel';
import {needsLinking} from '@angular/compiler-cli/linker';
import {readFile,writeFile,mkdir,rm,copyFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
await mkdir('evidence',{recursive:true});
const results=[];
for(const [name,command,args] of [['check','node',['--import','tsx','src/cli.ts','check','--config','examples/ui.config.example.yaml']],['aot','node',['node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js','-p','tsconfig.consumer.json']]]){
 const result=spawnSync(command,args,{encoding:'utf8'});await writeFile('evidence/'+name+'.log',result.stdout+result.stderr);results.push({name,command:[command,...args],exit:result.status});assert.equal(result.status,0,name);
}
await rm('dist',{recursive:true,force:true});await mkdir('dist');
const result=await build({entryPoints:{main:'compiled/consumer.js'},outdir:'dist',splitting:true,chunkNames:'chunks/[name]-[hash]',bundle:true,format:'esm',target:'es2022',minify:true,sourcemap:true,metafile:true,define:{ngDevMode:'false'},plugins:[{name:'angular-linker',setup(builder){builder.onLoad({filter:/\.mjs$/},async({path})=>{const source=await readFile(path,'utf8');if(!needsLinking(path,source))return;const linked=await transformAsync(source,{filename:path,babelrc:false,configFile:false,plugins:[linkerPlugin]});assert.ok(linked?.code);return{contents:linked.code,loader:'js'};});}}]});
await writeFile('evidence/bundle-metafile.json',JSON.stringify(result.metafile,null,2)+'\n');
for(const [source,target] of [['.ui/generated/tokens.css','tokens.css'],['.ui/generated/angular/styles.css','styles.css'],['.ui/generated/angular/specialist.css','specialist.css'],['tests/fixture-app/app.css','app.css']])await copyFile(source,'dist/'+target);
await writeFile('dist/index.html','<!doctype html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><link rel="stylesheet" href="/tokens.css"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/specialist.css"><link rel="stylesheet" href="/app.css"><title>SVG paint verification</title></head><body><paint-review></paint-review><script type="module" src="/main.js"></script></body></html>');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
await writeFile('evidence/build-results.json',JSON.stringify({results,production:true,ngDevMode:false,include:['consumer.ts'],publicBarrelOnly:true,consumerSha:hash(await readFile('consumer.ts')),templates:{chart:hash(await readFile('templates/angular/chart.ts')),options:hash(await readFile('templates/angular/chart-options.ts'))},generatedManifest:hash(await readFile('.ui/generated/manifest.json')),outputs:Object.keys(result.metafile.outputs).length},null,2)+'\n');
console.log(JSON.stringify({results,outputs:Object.keys(result.metafile.outputs).length}));
