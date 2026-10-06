import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir,readFile,readdir,rm,symlink,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {stringify} from './legacy-source/node_modules/yaml/dist/index.js';
const own=resolve(import.meta.dirname),source=resolve(own,process.argv[2]),runName=process.argv[3],stage=resolve(own,runName);
const {parseConfig}=await import(resolve(source,'src/config.ts'));
const yaml=await readFile(resolve(source,'examples/ui.config.example.yaml'),'utf8');const sha=b=>createHash('sha256').update(b).digest('hex');
await mkdir(stage);const commands=[];
function execute(command,cwd,label,expected){const r=spawnSync(command[0],command.slice(1),{cwd,encoding:'utf8'});commands.push({label,command,cwd,actualExit:r.status,expectedExit:expected,stdout:r.stdout,stderr:r.stderr,error:r.error?.message});assert.equal(r.status,expected,label+': '+r.stderr);return r;}
function cli(tool,root,args,label,exit=0){return execute([process.execPath,'--import',resolve(tool,'node_modules/tsx/dist/loader.mjs'),resolve(tool,'src/cli.ts'),...args],root,label,exit);}
async function vector(root){const out=[];async function walk(p){for(const e of await readdir(resolve(root,p),{withFileTypes:true})){const file=p?p+'/'+e.name:e.name;if(e.isDirectory())await walk(file);else if(e.isFile()){const b=await readFile(resolve(root,file));out.push({path:file,sha256:sha(b)});}}}await walk('');return out.sort((a,b)=>a.path.localeCompare(b.path));}
async function consumer(root,output,label){
 await writeFile(resolve(root,'consumer.ts'),`import {Component} from '@angular/core';\nimport {FormControl,ReactiveFormsModule} from '@angular/forms';\nimport {Card,TextInput,ActionControl,type TreeNode} from './${output}/angular/index';\n@Component({selector:'ownership-consumer',standalone:true,imports:[Card,TextInput,ActionControl,ReactiveFormsModule],template:\`<ui-card [title]="title"><ui-text-input controlId="ownership-field" label="保持する入力" [formControl]="value"/><button uiAction type="button">保存</button></ui-card>\`})\nexport class OwnershipConsumer {readonly title='移動した公開consumer';readonly value=new FormControl<string|null>('raw保持');readonly typedNodes:readonly TreeNode<{amount:number}>[]=[{id:'a',label:'A',data:{amount:1}}];}\n`);
 const tsconfig={compilerOptions:{target:'ES2022',module:'ES2022',moduleResolution:'bundler',lib:['ES2022','DOM'],strict:true,experimentalDecorators:true,skipLibCheck:true,noEmitOnError:true,outDir:'compiled-'+label},angularCompilerOptions:{compilationMode:'full',strictTemplates:true,strictInjectionParameters:true},include:['consumer.ts']};
 await writeFile(resolve(root,'tsconfig.consumer.json'),JSON.stringify(tsconfig,null,2)+'\n');
 execute([process.execPath,resolve(source,'node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js'),'-p','tsconfig.consumer.json'],root,label+' public-only strict/full AOT',0);
 const emitted=await readFile(resolve(root,'compiled-'+label+'/consumer.js'),'utf8');assert.match(emitted,/ɵɵdefineComponent/);
 return{label,output,entryInclude:['consumer.ts'],strictTemplates:true,compilationMode:'full',actualExit:0,componentDefinitionEmitted:true,consumerTsSha256:sha(await readFile(resolve(root,'consumer.ts')))};
}
const consumers=[];
for(const mode of ['fresh','real-v1-inplace','real-v1-immediate-move']){
 const root=resolve(stage,mode);await mkdir(root);await symlink(resolve(source,'node_modules'),resolve(root,'node_modules'), 'dir');await writeFile(resolve(root,'ui.config.yaml'),yaml);
 await writeFile(resolve(root,'application-owned.txt'),'app must survive migration\n');
 if(mode==='fresh'){
  const before=await vector(root);const dry=cli(source,root,['sync','--dry-run'],mode+' initial dry-run');assert.match(dry.stdout,/no files written/);assert.deepEqual(await vector(root),before);
  cli(source,root,['check'],mode+' missing output check',1);cli(source,root,['sync'],mode+' initial sync');
 }else{
  cli(resolve(own,'legacy-source'),root,['sync'],mode+' true base9f legacy sync');
  assert.equal(JSON.parse(await readFile(resolve(root,'.ui/generated/manifest.json'),'utf8')).version,1);
  await assert.rejects(readFile(resolve(root,'.agents/skills/project-ui/ownership.json')),{code:'ENOENT'});
  if(mode==='real-v1-inplace')cli(source,root,['sync'],mode+' bootstrap fixed registry');
 }
 if(mode!=='real-v1-immediate-move'){
  cli(source,root,['check'],mode+' current check');const repeat=cli(source,root,['sync'],mode+' repeat');assert.match(repeat.stdout,/current/);
  consumers.push(await consumer(root,'.ui/generated',mode+'-before'));
 }
 const config=parseConfig(yaml);config.output='relocated/ui';config.context.product='move with app-context change';config.default_profile='dense';config.profiles.dense.label='移動後の一覧';config.primitives[config.semantic['color.action']].value='#273899';await writeFile(resolve(root,'ui.config.yaml'),stringify(config));
 const before=await vector(root);cli(source,root,['check'],mode+' pending move check',1);
 const from=mode==='real-v1-immediate-move'?['--from-output','.ui/generated']:[];
 if(mode==='real-v1-immediate-move'){cli(source,root,['sync'],mode+' missing explicit legacy old path',1);assert.deepEqual(await vector(root),before);}
 const dry=cli(source,root,['sync',...from,'--dry-run'],mode+' migration dry-run');assert.match(dry.stdout,/delete: \.ui\/generated\/manifest\.json/);assert.deepEqual(await vector(root),before);
 cli(source,root,['sync',...from],mode+' real relocation');cli(source,root,['check'],mode+' post relocation check');const repeat=cli(source,root,['sync'],mode+' relocated repeat');assert.match(repeat.stdout,/current/);
 await assert.rejects(readFile(resolve(root,'.ui/generated/manifest.json')),{code:'ENOENT'});
 assert.equal(await readFile(resolve(root,'application-owned.txt'),'utf8'),'app must survive migration\n');
 const registry=await readFile(resolve(root,'.agents/skills/project-ui/ownership.json'),'utf8'),manifest=JSON.parse(await readFile(resolve(root,'relocated/ui/manifest.json'),'utf8'));
 assert.equal(manifest.version,1);assert.equal(JSON.parse(registry).output,'relocated/ui');assert.equal(manifest.files['.agents/skills/project-ui/ownership.json'].sha256,sha(registry));
 assert.match(await readFile(resolve(root,'relocated/ui/tokens.css'),'utf8'),/#273899/);assert.match(await readFile(resolve(root,'relocated/ui/profiles.ts'),'utf8'),/移動後の一覧/);
 consumers.push(await consumer(root,'relocated/ui',mode+'-after'));
 for(const args of [['check','--from-output','relocated/ui'],['init','--from-output','relocated/ui'],['sync','--from-output'],['sync','--from-output','relocated/ui','--from-output','relocated/ui'],['sync','--from-output','../outside'],['sync','--from-output',resolve(root,'relocated/ui')]]){
  const current=await vector(root);cli(source,root,args,mode+' parser/path rejection '+args.join(' '),1);assert.deepEqual(await vector(root),current);
 }
}
await writeFile(resolve(stage,'commands.json'),JSON.stringify(commands,null,2)+'\n');
await writeFile(resolve(stage,'RESULT.json'),JSON.stringify({sourceDir:source,sourceSyncSha256:sha(await readFile(resolve(source,'src/sync.ts'))),realCliCommands:commands.filter(x=>!x.label.includes('AOT')).length,publicStrictFullAot:consumers.length,consumers,modeCount:3,normalCli:true,trueLegacySource:'9f5430ca87e249af204cc335a8610d0d8040621f',dryRunsFileNoChange:true,parserErrorsNoChange:true,contextPrimitiveProfileMovedTogether:true,appFilePreserved:true,sharedChanges:false,newBrowserNativeRun:false},null,2)+'\n');
console.log(JSON.stringify({modeCount:3,realCliCommands:commands.filter(x=>!x.label.includes('AOT')).length,publicStrictFullAot:consumers.length,allExpectedExits:true,sharedChanges:false}));
