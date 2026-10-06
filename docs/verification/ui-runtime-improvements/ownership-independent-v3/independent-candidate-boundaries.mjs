import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chmod,mkdir,readFile,readdir,readlink,rename,rm,symlink,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {stringify} from './legacy-source/node_modules/yaml/dist/index.js';
const own=resolve(import.meta.dirname),sourceDir=resolve(own,process.argv[2]),runName=process.argv[3];
const api=await import(resolve(sourceDir,'src/sync.ts'));
const {parseConfig,resolveConfig}=await import(resolve(sourceDir,'src/config.ts'));
const legacy=await import(resolve(own,'legacy-source/src/sync.ts'));
const sha=b=>createHash('sha256').update(b).digest('hex'),yaml=await readFile(resolve(sourceDir,'examples/ui.config.example.yaml'),'utf8');
const folder=resolve(own,runName);await mkdir(folder);const records=[];
async function snapshot(root){const out=[];async function walk(dir){for(const ent of await readdir(resolve(root,dir),{withFileTypes:true})){const path=dir?dir+'/'+ent.name:ent.name;if(ent.isDirectory())await walk(path);else if(ent.isSymbolicLink())out.push({path,symlink:await readlink(resolve(root,path))});else{const b=await readFile(resolve(root,path));out.push({path,bytes:b.length,sha256:sha(b)});}}}await walk('');return out.sort((a,b)=>a.path.localeCompare(b.path));}
const scenarios=['legacy-unowned-identical-registry','registry-schema','registry-manifest-mismatch','registry-unsafe-parent','registry-git','registry-skill-overlap','registry-hash','registry-symlink','manifest-symlink','old-ancestor-symlink','new-ancestor-symlink','manifest-version','manifest-outside-record','manifest-self-record','manifest-hash-format','from-node-modules','from-absolute','from-duplicate-owner','nested-owned-target-manifest','nested-target-extra-file','case-only'];
for(const scenario of scenarios){
 const root=resolve(folder,scenario);await mkdir(root);await writeFile(resolve(root,'ui.config.yaml'),yaml);
 const reg='.agents/skills/project-ui/ownership.json',old='.ui/generated';let config=parseConfig(yaml),fromOutput;
 await (scenario==='legacy-unowned-identical-registry'?legacy:api).syncProject({root});
 await writeFile(resolve(root,'application.txt'),'app must survive\n');
 let destination='consumer/generated';const oldManPath=resolve(root,old+'/manifest.json');const man=JSON.parse(await readFile(oldManPath,'utf8'));
 const changedReg=value=>writeFile(resolve(root,reg),api.stableJSON(value));
 if(scenario==='legacy-unowned-identical-registry')await changedReg({schema_version:1,output:old,manifest_path:old+'/manifest.json'});
 if(scenario==='registry-schema')await changedReg({schema_version:2,output:old,manifest_path:old+'/manifest.json'});
 if(scenario==='registry-manifest-mismatch')await changedReg({schema_version:1,output:old,manifest_path:old+'/other.json'});
 if(scenario==='registry-unsafe-parent')await changedReg({schema_version:1,output:'../outside',manifest_path:'../outside/manifest.json'});
 if(scenario==='registry-git')await changedReg({schema_version:1,output:'.git/generated',manifest_path:'.git/generated/manifest.json'});
 if(scenario==='registry-skill-overlap')await changedReg({schema_version:1,output:'.agents',manifest_path:'.agents/manifest.json'});
 if(scenario==='registry-hash')await writeFile(resolve(root,reg),(await readFile(resolve(root,reg),'utf8'))+'\n');
 if(scenario==='registry-symlink'){await rm(resolve(root,reg));await symlink(resolve(root,'application.txt'),resolve(root,reg));}
 if(scenario==='manifest-symlink'){await rm(oldManPath);await symlink(resolve(root,'application.txt'),oldManPath);}
 if(scenario==='old-ancestor-symlink'){await rename(resolve(root,'.ui'),resolve(root,'old-ui'));await symlink(resolve(root,'old-ui'),resolve(root,'.ui'));}
 if(scenario==='new-ancestor-symlink'){await mkdir(resolve(root,'external'));await symlink(resolve(root,'external'),resolve(root,'consumer'));}
 if(scenario==='manifest-version')man.version=2;
 if(scenario==='manifest-outside-record')man.files['application.txt']={sha256:sha(await readFile(resolve(root,'application.txt')))};
 if(scenario==='manifest-self-record')man.files[old+'/manifest.json']={sha256:'a'.repeat(64)};
 if(scenario==='manifest-hash-format')man.files[reg].sha256='NOT A HASH';
 if(['manifest-version','manifest-outside-record','manifest-self-record','manifest-hash-format'].includes(scenario))await writeFile(oldManPath,api.stableJSON(man));
 if(scenario==='from-node-modules')fromOutput='node_modules/owned';
 if(scenario==='from-absolute')fromOutput=resolve(root,old);
 if(scenario==='from-duplicate-owner')fromOutput='other/generated';
 if(scenario==='nested-owned-target-manifest'){
  destination=old+'/nested';await mkdir(resolve(root,destination));const path=destination+'/manifest.json',content='{"version":1,"keep":"scoped-old-owned-target"}\n';await writeFile(resolve(root,path),content);man.files[path]={sha256:sha(content)};await writeFile(oldManPath,api.stableJSON(man));
 }
 if(scenario==='nested-target-extra-file'){destination=old+'/nested';await mkdir(resolve(root,destination));await writeFile(resolve(root,destination+'/application.txt'),'do not adopt\n');}
 if(scenario==='case-only')destination='.UI/generated';
 config.output=destination;await writeFile(resolve(root,'ui.config.yaml'),stringify(config));const before=await snapshot(root);const attempts=[];
 for(const dryRun of [true,false]){let error;try{await api.syncProject({root,fromOutput,dryRun});}catch(e){error=e;}assert.ok(error,scenario+' must reject');assert.deepEqual(await snapshot(root),before,scenario+' full file/symlink snapshot');attempts.push({dryRun,errorName:error.name,message:error.message,noChanges:true});}
 records.push({scenario,attempts});
}
// Exercise a real late registry write failure after a new manifest, using only own directory permissions.
const root=resolve(folder,'late-registry-io');await mkdir(root);await writeFile(resolve(root,'ui.config.yaml'),yaml);await api.syncProject({root});
let config=parseConfig(yaml);config.output='late/generated';const newFiles=await api.generatedFiles(resolveConfig(config));const context='.agents/skills/project-ui/project-context.md';
await writeFile(resolve(root,context),newFiles.get(context));const manPath=resolve(root,'.ui/generated/manifest.json'),man=JSON.parse(await readFile(manPath,'utf8'));man.files[context]={sha256:sha(newFiles.get(context))};await writeFile(manPath,api.stableJSON(man));
await writeFile(resolve(root,'ui.config.yaml'),stringify(config));const before=await snapshot(root);let ioError;const skill=resolve(root,'.agents/skills/project-ui');
await chmod(skill,0o555);try{await api.syncProject({root});}catch(e){ioError=e;}finally{await chmod(skill,0o755);}
assert.ok(ioError);assert.equal(ioError.code,'EACCES');assert.deepEqual(await snapshot(root),before);
await api.syncProject({root});assert.deepEqual(await api.checkProject({root}),{valid:true,differences:[]});assert.deepEqual(await api.syncProject({root}),{changes:[],written:false});
records.push({scenario:'late-registry-io',realPermissionFailure:true,errorCode:ioError.code,fullRollbackByteExact:true,retryCheckAndIdempotencyPassed:true});
await writeFile(resolve(folder,'RESULT.json'),JSON.stringify({sourceSyncSha256:sha(await readFile(resolve(sourceDir,'src/sync.ts'))),sourceDir,scenarioCount:records.length,negativeAttempts:scenarios.length*2,realLateRegistryRollback:true,failures:[],records,sharedChanges:false},null,2)+'\n');
console.log(JSON.stringify({sourceDir,scenarioCount:records.length,negativeAttempts:scenarios.length*2,realLateRegistryRollback:true,failures:[]}));
