import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const manifest='/tmp/ui-foundation-final-integration/root-message-final-source-freeze.json',bytes=await readFile(manifest),freeze=JSON.parse(bytes.toString());
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),input=JSON.parse(await readFile('evidence/input-final.json','utf8'));
const compared=[];
for(const entry of freeze.files){
 const path=entry.path;if(!/^(?:templates|src|examples)\//.test(path)&&!['package.json','package-lock.json','scripts/build.mjs'].includes(path))continue;
 const bases=['/Users/inouehiroshi/Documents/GitHub/ui-foundation',input.source];if(path!=='scripts/build.mjs')bases.push(process.cwd());
 const actual={};for(const base of bases)actual[base]=hash(await readFile(base+'/'+path));
 compared.push({path,sha256:entry.sha256,actual,allEqual:Object.values(actual).every(sha=>sha===entry.sha256)});
}
const mismatches=compared.filter(entry=>!entry.allEqual),report={manifest,manifestSha256:hash(bytes),time:freeze.time,scope:freeze.scope,inputSha256:input.sha256,comparedFiles:compared.length,allEqual:mismatches.length===0,mismatches,files:compared};
await writeFile('evidence/root-product-freeze-guard.json',JSON.stringify(report,null,2)+'\n');assert.equal(mismatches.length,0,'current freeze ledger and root/private/own product bytes must match');
console.log(JSON.stringify({inputSha256:input.sha256,manifestSha256:report.manifestSha256,comparedFiles:compared.length,allEqual:true}));
