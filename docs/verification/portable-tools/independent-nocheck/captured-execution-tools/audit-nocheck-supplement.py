from pathlib import Path
import json,hashlib,subprocess,re
from datetime import datetime,timezone
base=Path('/tmp/ui-foundation-portable-tools-independent-review-20261006')
root=Path('/Users/inouehiroshi/Documents/GitHub/ui-foundation')
head='9986f3265784e7a39ad0079460ced3d278882d7f'
expected='8af7eccc9de63547ab9bc86ba09846d963fdc41d758348866ee4fca7bafeaae1'
def git(*args):return subprocess.check_output(['git',*args],cwd=root)
def sha(data):return hashlib.sha256(data).hexdigest()
def require(condition,msg):
 if not condition:raise AssertionError(msg)
before=git('show',head+':scripts/verification/audit-media.mjs').decode()
after=(root/'scripts/verification/audit-media.mjs').read_text()
calculated=before.replace('!parsed.options.incremental && !parsed.options.composite && missingCompilerSpecs.length === 0;', '!parsed.options.incremental && !parsed.options.composite && !parsed.options.noCheck && missingCompilerSpecs.length === 0;').replace("'--incremental', 'false'],", "'--incremental', 'false', '--noCheck', 'false'],").replace('composite: parsed.options.composite},','composite: parsed.options.composite, noCheck: parsed.options.noCheck},')
require(after==calculated and sha(after.encode())==expected,'Audit delta exceeds3 lines')
oldtest=git('show',head+':tests/verification-tools/portable.test.mjs').decode()
newtest=(root/'tests/verification-tools/portable.test.mjs').read_text()
added="""  await t.test('noCheck cannot hide a type error while strict and all selected entries remain enabled',async()=>{
    await writeFile(file,original+"const invalid:number='text';\\n");
    await writeFile(join(fixture,'tsconfig.ui-media.json'),JSON.stringify({...config,compilerOptions:{...config.compilerOptions,noCheck:true}}));
    assert.notEqual(audit('no-check').status,0);
    const report=JSON.parse(await readFile(join(temporary,'no-check','media-audit.json'),'utf8'));
    assert.equal(report.compilerOptions.noCheck,true);assert.notEqual(report.compiler.actualExit,0);
    await writeFile(file,original);await writeFile(join(fixture,'tsconfig.ui-media.json'),JSON.stringify(config));
  });
"""
require(newtest.count(added)==1 and newtest.replace(added,'')==oldtest,'Regression delta exceeds one added case')
oldguide=git('show',head+':docs/verification-tools.ja.md').decode()
newguide=(root/'docs/verification-tools.ja.md').read_text()
expectedguide=oldguide.replace('strict/noEmitが有効であることも検査する。','strict/noEmitが有効であることも検査する。型検査を無効にする `noCheck=true` は拒否し、実コンパイラにも `--noCheck false` を明示する。').replace('47/47','48/48').replace('独立レビューで見つかった文字列内空白の偽一致と、コンパイラからの3spec除外も専用回帰で検査する。','独立レビューで見つかった文字列内空白の偽一致とコンパイラからの3spec除外、最終確認で実証したnoCheckによる型検査の無効化は専用回帰で検査する。')
require(newguide==expectedguide,'Guide delta exceeds3 reviewed lines')
paths=git('diff','--name-only',head,'--','src','templates','scripts','tests','package.json','package-lock.json','README.md','.ui','.agents','skills','examples','assets').decode().splitlines()
require(set(paths)=={'scripts/verification/audit-media.mjs','tests/verification-tools/portable.test.mjs'},'Other code/product changes')
oldmf=root/'docs/verification/portable-tools/root/PACK-MANIFEST.json'
require(sha(oldmf.read_bytes())=='a2aca6f559a3ec2f71c0c9e3c6d40961d5e151250ccfafa1c0d5cb1fd86e1419','Root78 historical manifest changed')
producer=base/'handoff-pr15-independent-review-9986f326-v1'
copied=root/'docs/verification/portable-tools/independent-9986f326'
require((producer/'PACK-MANIFEST.json').read_bytes()==(copied/'PACK-MANIFEST.json').read_bytes() and sha((copied/'PACK-MANIFEST.json').read_bytes())=='c5fa1ae836f30c3ec66eab23bfd0c09cd25f5d5786fe53d7ac203e50d5924ad5','Prior approval pack changed')
for row in json.loads((copied/'PACK-MANIFEST.json').read_text())['files']:
 data=(copied/row['path']).read_bytes();require(data==(producer/row['path']).read_bytes() and len(data)==row['bytes'] and sha(data)==row['sha256'],'Prior15 payload changed')
checks=[]
for name in ['portable-tool-regressions-v4','portable-tool-media-final-v5']:
 p=Path('/tmp/ui-foundation-runtime-improvements/checks')/name
 result=json.loads((p/'RESULT.json').read_text());bf=json.loads((p/'inputs-before.json').read_text());af=json.loads((p/'inputs-after.json').read_text())
 require(result['actualExit']==0 and result['inputsUnchanged'] is True and len(bf)==len(af)==463 and bf==af,'Root463 final check differs')
 for row in bf:
  data=(root/row['path']).read_bytes();require(len(data)==row['bytes'] and sha(data)==row['sha256'],'Final input differs '+row['path'])
 manifest=json.loads((p/'EVIDENCE-MANIFEST.json').read_text())
 for row in manifest['files']:
  data=(p/row['path']).read_bytes();require(len(data)==row['bytes'] and sha(data)==row['sha256'],'Check manifest differs')
 if 'regressions' in name:
  log=(p/'stdout-stderr.log').read_text();require(re.search(r'(?:ℹ|#) tests 48',log) and re.search(r'(?:ℹ|#) pass 48',log) and re.search(r'(?:ℹ|#) fail 0',log),'Root48 actual log differs')
 checks.append({'name':name,'actualExit':0,'inputs':463,'beforeAfterAndLiveExact':True,'resultSha256':sha((p/'RESULT.json').read_bytes()),'manifestSha256':sha((p/'EVIDENCE-MANIFEST.json').read_bytes())})
normal=Path('/tmp/ui-foundation-portable-tools-root/real-media-final-v5/media-audit.json')
normaljson=json.loads(normal.read_text());require(normaljson['pass'] is True and normaljson['matcherCount']==228 and normaljson['titleCount']==18 and normaljson['afterAny']==0 and normaljson['compiler']['actualExit']==0,'Normal final Media differs')
probes=json.loads((base/'nocheck-supplement/NO-CHECK-RESULTS.json').read_text());require(probes['actualIndependentDeltaCheckExit']==0 and probes['afterAuditSha256']==expected,'Own delta probes mismatch')
report={'verdict':'APPROVE_NOCHECK_SOURCE_AND_DOC_DELTA_8AF7ECCC','reviewedAgainstHistoricalHead':head,'finalAuditSha256':expected,'reviewedFiles':[{'path':path,'bytes':(root/path).stat().st_size,'sha256':sha((root/path).read_bytes())} for path in ['scripts/verification/audit-media.mjs','tests/verification-tools/portable.test.mjs','docs/verification-tools.ja.md']],
 'actualReadOnlySupplementAuditExit':0,'remainingBlockers':[],'scope':'Only noCheck option false-success repair; no other exploratory checks or UI tests','delta':{'auditLinesReplaced':3,'regressionAdded':1,'guideLinesReplaced':3,'otherCodeProductsGeneratedChanged':False},'ownActualNoCheckProbes':{'beforeInvalidProcessCompiler':[0,0],'afterInvalidProcessCompiler':[1,2],'afterHealthyNoCheckProcessCompiler':[1,0],'afterNoCheckFalseHealthyProcessCompiler':[0,0]},'rootFinalChecks':checks,'rootFinalMedia':{'matchers':228,'titles':18,'any':0,'compilerActualExit':0},
 'historicalPacksUnchanged':{'root78ManifestSha256':'a2aca6f559a3ec2f71c0c9e3c6d40961d5e151250ccfafa1c0d5cb1fd86e1419','independent15ManifestSha256':'c5fa1ae836f30c3ec66eab23bfd0c09cd25f5d5786fe53d7ac203e50d5924ad5','oldApprovalHead998RemainsHistorical':True},
 'futureFinalHead':'Needs exact bridge after root commits this guard, review adoption, final root evidence and guide pointer. Prior998 evidence remains immutable.',
 'sharedWrites':0,'nativeUiOrFullSuiteReexecutedByReviewer':False,'createdUtc':datetime.now(timezone.utc).isoformat()}
(base/'nocheck-supplement/SUPPLEMENT-AUDIT.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:report[k] for k in ['verdict','actualReadOnlySupplementAuditExit','remainingBlockers','finalAuditSha256','delta']},ensure_ascii=False,indent=2))
