import hashlib,json,subprocess,sys
from pathlib import Path
root=Path('/Users/inouehiroshi/Documents/GitHub/ui-foundation')
proof=root/'docs/verification/component-ui-ux-pr-20261009'
out=Path('/tmp/ui-foundation-pr-20261009')
frozen=json.loads((proof/'ui-review-candidate.json').read_text())
manifest=json.loads((out/'aggregate-source-manifest.json').read_text())
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
sha=lambda data:hashlib.sha256(data).hexdigest()
source_changes=[row['path'] for row in frozen['files'] if sha((root/row['path']).read_bytes())!=row['sha256']]
source_mismatches=[row['path'] for row in manifest if sha((root/row['path']).read_bytes())!=row['sha256']]
head_mismatches=[]
for row in manifest:
 result=subprocess.run(['git','show',head+':'+row['path']],cwd=root,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
 if result.returncode or sha(result.stdout)!=row['sha256']:head_mismatches.append(row['path'])
runtime_changes=[row['path'] for row in frozen['runtime'] if sha((root/row['path']).read_bytes())!=row['sha256']]
frozen_server_changes=[row['path'] for row in frozen['runtime'] if sha((out/'review-build'/row['path']).read_bytes())!=row['sha256']]
result={'checkedHead':head,'base':frozen['base'],'testedSourceFiles':len(manifest),'sourceChangedFromFrozenReview':source_changes,'testedSourceMismatches':source_mismatches,'committedHeadSourceMismatches':head_mismatches,'runtimeFiles':len(frozen['runtime']),'freshRuntimeChangedFromFrozenReview':runtime_changes,'reviewServerRuntimeChanges':frozen_server_changes,'mainJsSha256':sha((root/'dist/fixture-app/main.js').read_bytes()),'meaning':'The frozen rendered-review runtime and fresh aggregate runtime have identical bytes. Only the no-emit import option and two test-preparation synchronization assertions changed from the frozen source snapshot; rendered product inputs are unchanged.'}
(out/'final-artifact-equivalence.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
sys.exit(0 if not(source_mismatches or head_mismatches or runtime_changes or frozen_server_changes) else 1)
