import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {stringify} from './candidate-source/node_modules/yaml/dist/index.js';
import {parseConfig} from './candidate-source/src/config.ts';
import {syncProject,stableJSON} from './candidate-source/src/sync.ts';
const own=resolve(import.meta.dirname),root=resolve(own,'nested-target-manifest-counterexample');
await mkdir(root,{recursive:true});const yaml=await readFile(resolve(own,'candidate-source/examples/ui.config.example.yaml'),'utf8');
await writeFile(resolve(root,'ui.config.yaml'),yaml);await syncProject({root});
const oldOutput='.ui/generated',newOutput=oldOutput+'/nested',newManifestPath=newOutput+'/manifest.json';
const existing='{"version":1,"applicationOwnedData":"KEEP EXISTING TARGET MANIFEST"}\n';
await mkdir(resolve(root,newOutput));await writeFile(resolve(root,newManifestPath),existing);
const oldManifest=JSON.parse(await readFile(resolve(root,oldOutput+'/manifest.json'),'utf8'));
oldManifest.files[newManifestPath]={sha256:createHash('sha256').update(existing).digest('hex')};
await writeFile(resolve(root,oldOutput+'/manifest.json'),stableJSON(oldManifest));
const registryBefore=await readFile(resolve(root,'.agents/skills/project-ui/ownership.json'),'utf8');
const config=parseConfig(yaml);config.output=newOutput;await writeFile(resolve(root,'ui.config.yaml'),stringify(config));
const plan=await syncProject({root,dryRun:true});
assert.equal(await readFile(resolve(root,newManifestPath),'utf8'),existing);
const actual=await syncProject({root});
const after=await readFile(resolve(root,newManifestPath),'utf8');
const report={sourceSha256:'cdb58ff346ebcb27e2f9af2612ee54c0704c281106c2c3202519fbb4b9b9b0d3',oldOutput,newOutput,newManifestPath,
 setup:'A structurally accepted v1 old manifest lists an existing nested target manifest with matching SHA; registry matches this old manifest. Scoped files are permitted by readManifest; no hand edited owned data or unowned regular file exists.',
 expected:'Reject every preexisting different target manifest before any write, as stated candidate migration contract.',
 actual:{dryRunAccepted:true,change:plan.changes.find(x=>x.path===newManifestPath),written:actual.written,targetOverwritten:after!==existing,registryChanged:registryBefore!==await readFile(resolve(root,'.agents/skills/project-ui/ownership.json'),'utf8')},
 oldTargetBytes:existing,newTargetBytes:after,observationDriverExitExpected:0,productInvariantPass:after===existing};
await writeFile(resolve(own,'nested-target-manifest-counterexample.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({source:report.sourceSha256,dryRunAccepted:true,targetOverwritten:report.actual.targetOverwritten,observedChange:report.actual.change,productInvariantPass:report.productInvariantPass}));
