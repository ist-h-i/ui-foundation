import {build} from 'esbuild';
import {transformAsync} from '@babel/core';
import linkerPlugin from '@angular/compiler-cli/linker/babel';
import {needsLinking} from '@angular/compiler-cli/linker';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const out='dist/fixture-app/direct-consumer';
await mkdir(out,{recursive:true});
await build({entryPoints:{main:'build/direct-runtime/consumer/direct-runtime.js','assets/sheet-formula.worker':'build/direct-runtime/.ui/generated/angular/sheet-formula.worker.js'},outdir:out,splitting:true,chunkNames:'chunks/[name]-[hash]',bundle:true,format:'esm',target:'es2022',minify:true,sourcemap:true,plugins:[{name:'angular-linker',setup(builder){builder.onLoad({filter:/\.mjs$/},async({path})=>{const source=await readFile(path,'utf8');if(!needsLinking(path,source))return;const linked=await transformAsync(source,{filename:path,babelrc:false,configFile:false,plugins:[linkerPlugin],sourceMaps:'inline'});if(!linked?.code)throw Error('Angular linker output absent');return{contents:linked.code,loader:'js'};});}}]});
await writeFile(out+'/index.html','<!doctype html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="icon" href="data:,"><link rel="stylesheet" href="/styles.css"><title>独立した公開APIの検証</title></head><body><review-final></review-final><script type="module" src="./main.js"></script></body></html>');
