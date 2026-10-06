import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const registry='.agents/skills/project-ui/ownership.json';
const manifest='.ui/generated/manifest.json';
const original=await readFile(manifest);const owned=JSON.parse(original);
const before={};for(const file of Object.keys(owned.files))before[file]=hash(await readFile(file));
const commands=[];
for(const args of [['check'],['sync','--dry-run'],['sync'],['check']]){
 const result=spawnSync(process.execPath,['--import','tsx','src/cli.ts',...args,'--config','examples/ui.config.example.yaml'],{encoding:'utf8'});
 commands.push({argv:[process.execPath,'--import','tsx','src/cli.ts',...args,'--config','examples/ui.config.example.yaml'],actualExit:result.status,stdout:result.stdout,stderr:result.stderr});
 assert.equal(result.status,0);if(args[0]==='sync')assert.match(result.stdout,/current/);
 assert.deepEqual(await readFile(manifest),original,'Manifest bytes stable');
 for(const [file,sha] of Object.entries(before))assert.equal(hash(await readFile(file)),sha,'Owned bytes stable '+file);
}
const own=JSON.parse(await readFile(registry));assert.deepEqual(own,{schema_version:1,output:'.ui/generated',manifest_path:manifest});
assert.equal(owned.version,1);assert.equal(owned.files[registry].sha256,hash(await readFile(registry)));
await writeFile('../evidence-a1ed5c/canonical-regeneration-result.json',JSON.stringify({sourceCommit:'a1ed5c012c5b35a50e8df1038e04ade71cf044c4',commands,ownedFiles:Object.keys(owned.files).length,manifestVersion:owned.version,registry,ownershipExactlyMatches:true,allManagedBytesStable:true},null,2)+'\n');
console.log(JSON.stringify({commands:commands.length,ownedFiles:Object.keys(owned.files).length,allManagedBytesStable:true,ownershipExactlyMatches:true}));
