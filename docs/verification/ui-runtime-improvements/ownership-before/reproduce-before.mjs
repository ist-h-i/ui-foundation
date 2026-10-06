import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {stringify} from './legacy-source/node_modules/yaml/dist/index.js';
import {parseConfig} from './legacy-source/src/config.ts';
import {checkProject,syncProject,SyncConflictError} from './legacy-source/src/sync.ts';
const own=resolve(import.meta.dirname),baseCommit='9f5430ca87e249af204cc335a8610d0d8040621f';
const source=await readFile(resolve(own,'legacy-source/examples/ui.config.example.yaml'),'utf8');
const sha=b=>createHash('sha256').update(b).digest('hex');
async function vector(root){const out=[];async function visit(dir){for(const e of await readdir(resolve(root,dir),{withFileTypes:true})){const name=dir?dir+'/'+e.name:e.name;if(e.isDirectory())await visit(name);else if(e.isFile()&&name!=='ui.config.yaml'){const b=await readFile(resolve(root,name));out.push({path:name,bytes:b.length,sha256:sha(b)});}}}await visit('');return out.sort((a,b)=>a.path.localeCompare(b.path));}
const results=[];
for(const scenario of ['output-change','same-content-target','edited-skill']){
 const root=resolve(own,'fixtures',scenario);await mkdir(root,{recursive:true});await writeFile(resolve(root,'ui.config.yaml'),source);
 const config=parseConfig(source);assert.equal(config.output,'.ui/generated');const first=await syncProject({root});assert.equal(first.written,true);
 assert.deepEqual(await syncProject({root}),{changes:[],written:false});assert.deepEqual(await checkProject({root}),{valid:true,differences:[]});
 await writeFile(resolve(root,'application.ts'),'application-owned keep\n');
 if(scenario==='same-content-target'){await mkdir(resolve(root,'.ui/moved'),{recursive:true});await writeFile(resolve(root,'.ui/moved/tokens.css'),await readFile(resolve(root,'.ui/generated/tokens.css')));}
 if(scenario==='edited-skill')await writeFile(resolve(root,'.agents/skills/project-ui/SKILL.md'),'manual generated Skill edit keep\n');
 const before=await vector(root);config.output='.ui/moved';await writeFile(resolve(root,'ui.config.yaml'),stringify(config));
 const attempts=[];
 for(const dryRun of [true,false]){
  let error;try{await syncProject({root,dryRun});}catch(e){error=e;}
  assert.ok(error instanceof SyncConflictError);assert.match(error.message,/Unowned file.*\.agents\/skills\/project-ui/);
  if(scenario==='same-content-target')assert.match(error.message,/Unowned file.*\.ui\/moved\/tokens\.css/);
  assert.deepEqual(await vector(root),before);attempts.push({dryRun,errorName:error.name,issues:error.issues,noFileChange:true});
 }
 const oldManifest=JSON.parse(await readFile(resolve(root,'.ui/generated/manifest.json'),'utf8'));
 assert.equal(oldManifest.version,1);assert.ok(oldManifest.files['.agents/skills/project-ui/SKILL.md']);
 assert.ok(!before.some(x=>x.path==='.ui/moved/manifest.json'));
 results.push({scenario,baselineSyncCheckAndRepeatPassed:true,legacyManifestVersion:1,managedVectorBefore:before,attempts});
}
const report={baseCommit,sourceSnapshot:'source-snapshot.json',observationActualExitExpected:0,productOutputChangeSucceeded:false,p2Reproduced:true,legacyFixedSkillOwnershipAtOldManifest:true,newOutputManifestMissing:true,sharedChanges:false,results};
await writeFile(resolve(own,'before-reproduction.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({baseCommit,scenarioCount:results.length,p2Reproduced:true,observationExit:0,productOutputChangeSucceeded:false,sharedChanges:false}));
