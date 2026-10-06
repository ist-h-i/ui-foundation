from pathlib import Path
import subprocess,json,hashlib,datetime
ROOT=Path('/Users/inouehiroshi/Documents/GitHub/ui-foundation')
OWN=Path('/tmp/ui-foundation-pr13-independent-final-review')
STAGE=OWN/'repository-a1ed5c'
OUT=OWN/'evidence-a1ed5c'
BASE='9f5430ca87e249af204cc335a8610d0d8040621f'
BEFORE='37ecf88b05b6cae1510e3291d7fc75e62217892b'
AFTER='a1ed5c012c5b35a50e8df1038e04ade71cf044c4'
sha=lambda b:hashlib.sha256(b).hexdigest()
git=lambda commit,path:subprocess.check_output(['git','show',commit+':'+path],cwd=ROOT)
tree=lambda commit,path:subprocess.check_output(['git','rev-parse',commit+':'+path],cwd=ROOT,text=True).strip()
oldledger=git(BEFORE,'docs/verification/ui-runtime-improvements/ROOT-SOURCE-ADOPTION.json')
assert oldledger==git(AFTER,'docs/verification/ui-runtime-improvements/ROOT-SOURCE-ADOPTION.json')
supplement=git(AFTER,'docs/verification/ui-runtime-improvements/ROOT-SOURCE-ADOPTION-SUPPLEMENT.json')
assert sha(supplement)=='6af26d13f89ca742805a103b8b4e1a170e1518221ddf53abf9db096434af18cc'
s=json.loads(supplement); assert s['baseSourceCheckpoint']==BEFORE
assert len(s['files'])==9
actual_changed=subprocess.check_output(['git','diff','--name-only',BEFORE,AFTER,'--','.ui','.agents','README.md','src','templates','skills','examples','package.json','package-lock.json','scripts','tests','tsconfig.ui-runtime.json'],cwd=ROOT,text=True).splitlines()
assert set(actual_changed)==set(r['path'] for r in s['files'])
for r in s['files']:
 assert sha(git(AFTER,r['path']))==r['afterSha256']
 assert len(git(AFTER,r['path']))==r['bytes']
 if r['beforeSha256'] is not None: assert sha(git(BEFORE,r['path']))==r['beforeSha256']
assert s['additionalRootStrictScope']['entries']==json.loads((STAGE/'tsconfig.ui-runtime.json').read_text())['include']
assert s['additionalRootStrictScope']['allUiStrictClaim'] is False

products=sorted(p.relative_to(STAGE).as_posix() for p in (STAGE/'templates/angular').glob('*.ts'))
assert len(products)==139
product_changes=[]
for path in products:
 if git(BEFORE,path)!=git(AFTER,path):product_changes.append(path)
 assert (STAGE/path).read_bytes()==git(AFTER,path)
assert product_changes==['templates/angular/menu.ts']
for path in ['src/sync.ts','src/cli.ts','package-lock.json','package.json','skills/ui-development/SKILL.md','skills/ui-development/references/ui-library-runtime.md']:
 assert git(BEFORE,path)==git(AFTER,path),path

protected=[]
for path in ['docs/ui-library-request.ja.md','docs/ui-library-matrix.json','docs/ui-library-consumer-guide.ja.md']:
 data=git(BASE,path);assert data==git(BEFORE,path)==git(AFTER,path)
 protected.append({'path':path,'sha256':sha(data),'sameAsBase9f':True})
oldproof='docs/verification/ui-library-final-catalog'
proof_trees={c:tree(c,oldproof) for c in [BASE,BEFORE,AFTER]}
assert len(set(proof_trees.values()))==1
proof_count=len(subprocess.check_output(['git','ls-tree','-r','--name-only',AFTER,'--',oldproof],cwd=ROOT,text=True).splitlines())
assert proof_count==2020
beforematrix=json.loads(git(BASE,'docs/ui-library-matrix.json'))
assert len(beforematrix['requirements'])==181

managed=json.loads((STAGE/'.ui/generated/manifest.json').read_text())
generated=[]
for path,entry in managed['files'].items():
 data=(STAGE/path).read_bytes()
 assert sha(data)==entry['sha256']
 assert data==git(AFTER,path),path
 generated.append({'path':path,'sha256':sha(data)})
assert (STAGE/'.ui/generated/manifest.json').read_bytes()==git(AFTER,'.ui/generated/manifest.json')
assert managed['version']==1
assert (STAGE/'.ui/generated/angular/menu.ts').read_bytes()==(STAGE/'templates/angular/menu.ts').read_bytes()

snapshot=json.loads((OUT/'initial-source-snapshot.json').read_text())
drift=[]
for r in snapshot['files']:
 if sha((STAGE/r['path']).read_bytes())!=r['sha256']:drift.append(r['path'])
assert not drift
result={'scope':'Frozen a1ed5c source/adoption/original-proof transition; root affected native regression and final proof/doc head still pending','ownActualExit':0,'wholePrApproval':False,'sourceCommit':AFTER,'priorSourceCheckpoint':BEFORE,'supplementSha256':sha(supplement),'supplementRows':s['files'],'productSourceCount':139,'productChangesAfter37':product_changes,'productSourcesUnchangedAfter37':138,'coreAndPackageDependenciesUnchangedAfter37':True,'protectedOriginalDocs':protected,'requirements':181,'originalProofFilesUnchanged':proof_count,'originalProofTreeIds':proof_trees,'canonicalGeneratedFiles':generated,'canonicalManifestMatchesRootFrozen':True,'manifestVersion':1,'generatedManuallyEdited':False,'inputSnapshotFiles':len(snapshot['files']),'inputDrift':drift,'createdAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat()}
(OUT/'source-adoption-transition.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:result[k] for k in ['ownActualExit','wholePrApproval','sourceCommit','productSourceCount','productChangesAfter37','originalProofFilesUnchanged','manifestVersion','canonicalManifestMatchesRootFrozen','inputDrift']},ensure_ascii=False))
