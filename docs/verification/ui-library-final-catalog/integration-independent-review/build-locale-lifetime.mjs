import {build} from 'esbuild';
import {transformAsync} from '@babel/core';
import linkerPlugin from '@angular/compiler-cli/linker/babel';
import {needsLinking} from '@angular/compiler-cli/linker';
import {mkdir,readFile,writeFile,copyFile,cp} from 'node:fs/promises';
await mkdir('dist-locale-lifetime',{recursive:true});
await build({entryPoints:['build-locale-lifetime/locale-lifetime-consumer.js'],outdir:'dist-locale-lifetime',bundle:true,splitting:true,format:'esm',target:'es2022',minify:true,sourcemap:true,define:{ngDevMode:'false'},plugins:[{name:'angular-linker',setup(builder){builder.onLoad({filter:/\.mjs$/},async({path})=>{const source=await readFile(path,'utf8');if(!needsLinking(path,source))return;const result=await transformAsync(source,{filename:path,babelrc:false,configFile:false,plugins:[linkerPlugin],sourceMaps:'inline'});if(!result?.code)throw new Error('Angular linker did not produce code');return {contents:result.code,loader:'js'};});}}]});
await copyFile('repository/.ui/generated/tokens.css','dist-locale-lifetime/tokens.css');
await copyFile('repository/.ui/generated/angular/styles.css','dist-locale-lifetime/styles.css');
await writeFile('dist-locale-lifetime/index.html','<!doctype html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Independent UI review</title><link rel="stylesheet" href="tokens.css"><link rel="stylesheet" href="styles.css"></head><body><locale-lifetime-review></locale-lifetime-review><script type="module" src="locale-lifetime-consumer.js"></script></body></html>');
console.log('Fresh independent public-barrel consumer bundle built.');

await mkdir("dist-locale-lifetime/assets/pdf",{recursive:true});
await copyFile("node_modules/pdfjs-dist/build/pdf.worker.mjs","dist-locale-lifetime/assets/pdf/pdf.worker.mjs");
for(const name of ["cmaps","standard_fonts","wasm","iccs"])await cp("node_modules/pdfjs-dist/"+name,"dist-locale-lifetime/assets/pdf/"+name,{recursive:true});
await copyFile("node_modules/pdfjs-dist/LICENSE","dist-locale-lifetime/assets/pdf/LICENSE");
await cp("repository/assets/media","dist-locale-lifetime/assets/media",{recursive:true});
await cp("repository/assets/pdf-source","dist-locale-lifetime/assets/pdf/source",{recursive:true});
await cp("repository/assets/third-party","dist-locale-lifetime/assets/third-party",{recursive:true});
