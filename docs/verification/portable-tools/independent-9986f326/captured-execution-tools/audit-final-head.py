from pathlib import Path, PurePosixPath
import json,hashlib,subprocess,re
from datetime import datetime,timezone
base=Path('/tmp/ui-foundation-portable-tools-independent-review-20261006')
repo=Path('/Users/inouehiroshi/Documents/GitHub/ui-foundation')
private=base/'relocated checkout 日本語'
head='9986f3265784e7a39ad0079460ced3d278882d7f'
code='91a9c78e0a18270e79210b34e964ef9ba9bc89ed'
main='9b8bb12861228c2bb610be2f8827710e7e2e9932'
rootprefix='docs/verification/portable-tools/root/'
expectedmf='a2aca6f559a3ec2f71c0c9e3c6d40961d5e151250ccfafa1c0d5cb1fd86e1419'
def git(*args):return subprocess.check_output(['git',*args],cwd=repo)
def blob(commit,path):return git('show',commit+':'+path)
def sha(data):return hashlib.sha256(data).hexdigest()
def fail(condition,msg):
 if not condition:raise AssertionError(msg)
fail(git('rev-parse','HEAD').decode().strip()==head,'HEAD differs')
fail(git('status','--porcelain','--untracked-files=all')==b'','Shared tree not clean')
fail(git('rev-parse',head+'^').decode().strip()==code,'Proof parent differs')
sourcepaths={'scripts/verification/audit-media.mjs','scripts/verification/build-handoff.py','scripts/verification/build-public-proof.py','scripts/verification/evidence_pack.py','package.json','tests/verification-tools/portable.test.mjs','docs/ui-runtime-improvements.ja.md','docs/verification-tools.ja.md'}
changes=[x.split('\t') for x in git('diff','--name-status',main,code).decode().splitlines()]
fail({x[1] for x in changes}==sourcepaths and len(changes)==8,'Code8 scope differs')
fail({x[1] for x in changes if x[0]=='M'}=={'package.json','docs/ui-runtime-improvements.ja.md'},'Original files changed outside2')
fail(all(x[0] in ('A','M') for x in changes),'Deletion/rename outside scope')
manifestraw=blob(head,rootprefix+'PACK-MANIFEST.json')
fail(sha(manifestraw)==expectedmf and manifestraw==(repo/rootprefix/'PACK-MANIFEST.json').read_bytes(),'Root manifest SHA differs')
manifest=json.loads(manifestraw);rows=manifest['files']
fail(len(rows)==manifest['fileCount']==78 and len({r['path'] for r in rows})==78,'Root78 count/path differs')
expectedadds={rootprefix+r['path'] for r in rows}|{rootprefix+'PACK-MANIFEST.json'}
proofchanges=[x.split('\t') for x in git('diff','--name-status',code,head).decode().splitlines()]
fail(len(proofchanges)==79 and all(x[0]=='A' for x in proofchanges) and {x[1] for x in proofchanges}==expectedadds,'Proof79 additions differ')
total=0
for row in rows:
 path=PurePosixPath(row['path']);fail(not path.is_absolute() and '..' not in path.parts and str(path)==row['path'],'Unsafe root proof path')
 data=blob(head,rootprefix+row['path']);file=repo/rootprefix/row['path']
 fail(file.is_file() and not file.is_symlink() and data==file.read_bytes(),'Root proof Git/live mismatch')
 fail(len(data)==row['bytes'] and sha(data)==row['sha256'],'Root proof SHA/bytes mismatch')
 total+=len(data)
fail(total==manifest['totalBytes']==3391143,'Root total bytes mismatch')
results=json.loads(blob(head,rootprefix+'RESULTS.json'))
fail(results['codeCommit']==code and results['baselineCommit']==main and results['wholeNewPrIndependentApprovalPending'] is True,'Capture targets/pending differ')
for row in results['sourceFiles']:
 fail(row['path'] in sourcepaths and blob(code,row['path'])==blob(head,row['path']) and sha(blob(head,row['path']))==row['sha256'] and len(blob(head,row['path']))==row['bytes'],'Results source8 SHA mismatch')
fail({row['path'] for row in results['sourceFiles']}==sourcepaths,'Results source8 paths differ')
for path in sourcepaths-{'docs/ui-runtime-improvements.ja.md','docs/verification-tools.ja.md'}:
 fail((private/path).read_bytes()==blob(head,path),'Independently executed candidate differs: '+path)
original=json.loads(blob(head,rootprefix+'original-before-inputs.json'))
oldpaths=set(git('ls-tree','-r','--name-only',main).decode().splitlines())
fail(original['head']==main and original['count']==len(original['files'])==len(oldpaths)==5519 and {x['path'] for x in original['files']}==oldpaths,'Original5519 inventory differs')
fail(results['originalTrackedCount']==5519 and results['originalUnchangedCount']==5517 and {r['path'] for r in results['changedOriginal']}=={'package.json','docs/ui-runtime-improvements.ja.md'},'Original preservation accounting differs')
for row in results['changedOriginal']:
 fail(sha(blob(main,row['path']))==row['beforeSha256'] and sha(blob(head,row['path']))==row['afterSha256'],'Changed2 SHA differs')
checkresults=[]
for rec in results['checks']:
 root=PurePosixPath(rec['path']).parent.as_posix()
 result=json.loads(blob(head,rootprefix+rec['path']))
 before=json.loads(blob(head,rootprefix+root+'/inputs-before.json'))
 after=json.loads(blob(head,rootprefix+root+'/inputs-after.json'))
 fail(len(before)==len(after)==result['inputFiles']==463 and before==after and result['inputsUnchanged'] is True,'Root463 before/after differs')
 fail(result['actualExit']==rec['actualExit'],'Recorded actual exit differs')
 inner=json.loads(blob(head,rootprefix+root+'/EVIDENCE-MANIFEST.json'))
 for row in inner['files']:
  data=blob(head,rootprefix+root+'/'+row['path']);fail(len(data)==row['bytes'] and sha(data)==row['sha256'],'Inner evidence MF differs')
 if root in ('checks/portable-tool-regressions-v3','checks/portable-tool-media-final-v4'):
  for row in before:
   data=blob(head,row['path']);fail(len(data)==row['bytes'] and sha(data)==row['sha256'],'Final463 differs from finalHEAD')
 checkresults.append({'scope':root,'actualExit':result['actualExit'],'inputCount':463,'unchanged':True})
finalresult=results['actualRegressionsFinal'];fail(finalresult=={'total':47,'pass':47,'fail':0,'skip':0,'retry':0,'result':'checks/portable-tool-regressions-v3/RESULT.json'},'Final47 differs')
log=blob(head,rootprefix+'checks/portable-tool-regressions-v3/stdout-stderr.log').decode()
fail(re.search(r'(?:ℹ|#) tests 47',log) and re.search(r'(?:ℹ|#) pass 47',log) and re.search(r'(?:ℹ|#) fail 0',log),'Final47 rawlog differs')
media=json.loads(blob(head,rootprefix+'native/real-media-final-v4/media-audit.json'))
fail(media['pass'] is True and media['matcherCount']==228 and media['titleCount']==18 and media['afterAny']==0 and media['compiler']['actualExit']==0 and media['missingCompilerSpecs']==[],'Final Media report differs')
receipt=json.loads(blob(head,rootprefix+'native/real-media-final-v4/audit-receipt.json'))
fail(receipt['actualExit']==0 and receipt['nativeTestsReexecuted'] is False and receipt['historicalApprovalRenewed'] is False,'Final Media scope differs')
transports=[]
for kind,name in [('media-tree-independent','handoff'),('cross-browser-author','cross-browser')]:
 r=json.loads(blob(head,rootprefix+'native/real-entrypoints-v1/'+name+'/transport-receipt.json'))
 own=base/'evidence'/(kind+'-default-export')
 fail(r['operation']=='verified-historical-evidence-transport' and r['historicalNativeResultsReexecuted'] is False and r['historicalReviewDecisionsRenewed'] is False and r['currentUiVerificationPerformed'] is False,'Transport renews historical scope')
 fail(r['archive']['sha256']==sha((own/'payload.tar.gz').read_bytes()) and r['archive']['bytes']==(own/'payload.tar.gz').stat().st_size,'Root/independent deterministic archive differs')
 for row in r['payload']:
  data=(own/'payload'/row['path']).read_bytes();fail(len(data)==row['bytes'] and sha(data)==row['sha256'],'Root/independent transported payload differs')
 transports.append({'kind':kind,'listedFiles':r['listedArtifactCount'],'payloadFiles':r['payloadFileCount'],'rootIndependentArchiveAndPayloadExact':True})
guide=blob(head,'docs/verification-tools.ja.md').decode()
fail('47/47' in guide and 'UI操作の件数ではない' in guide and '書式だけの変更も不一致' in guide and 'コンパイラの対象集合に固定3spec' in guide and '過去の実終了値や独立承認を書き直さない' in guide,'Scope documentation differs')
for rel in ['audit-media.mjs','build-handoff.py','build-public-proof.py']:
 fail('scripts/verification/'+rel in guide,'Missing maintained entrypoint')
for row in results['sourceFiles']:
 if row['path'] in ('docs/verification-tools.ja.md','docs/ui-runtime-improvements.ja.md'):
  fail(blob(head,row['path'])==(repo/row['path']).read_bytes(),'Live doc mismatch')
fail(results['nativeUiSuiteReexecuted'] is False and results['historicalReviewRenewed'] is False,'Results renew historical UI scope')
fail(git('rev-parse','HEAD').decode().strip()==head and git('status','--porcelain','--untracked-files=all')==b'','Root changed during review')
report={'verdict':'APPROVE_PORTABLE_VERIFICATION_TOOLS_PR15_9986F326','reviewedHead':head,'codeCommit':code,'actualReadOnlyFinalAuditExit':0,'wholeScopedPrApproval':True,'remainingBlockers':[],
 'scope':'Only3 maintained entrypoints for captured one-shot scripts and existing2 historical packs; no generic format/framework/tar input or new UI run',
 'codeChanges':8,'proofOnlyAdditions':79,'rootManifest':{'sha256':expectedmf,'payloadFiles':78,'payloadBytes':total,'GitLiveAllShaBytesExact':True},
 'original5519':{'unchanged':5517,'changedOriginal':['package.json','docs/ui-runtime-improvements.ja.md'],'original181AndOldProofRetained':True},
 'rootChecksAudited':checkresults,'rootFinalMedia':{'matchers':228,'titles':18,'any':0,'compilerActualExit':0},'rootFinalRegressions':{'pass':47,'actualExit':0},'transports':transports,
 'ownSourceChecks':'Relocated independentGit Japanese/space checkout; actual final Media228/18/0, root47 suite47/47, independent false-negative repairs and true compiler refusal, existing2pack Python -O/reexport/deterministic tar/owned-output preservation',
 'failuresAndScopesRetained':'Ownold literal false-positive actual0 and compiler omission actual0 preserved as counterexamples; root44/46 and IPC failure1 remain historical. New receipt passes transport/static-only and does not renew APPROVE/native results.',
 'capturePendingState':'Root RESULTS capture-time wholeNewPrIndependentApprovalPending remains unchanged; this subsequent exactHEAD decision is authoritative within PR15 scope',
 'independence':{'productAuthor':False,'sharedSourceGitHostWrites':0,'newUiOrBrowserServer':False,'otherOwnerProcessesKilled':0},
 'futureGitHubActions':'CI/human GitHub approval/Ready/merge are not claimed. Following reviewpack/guide-pointer-only adoption needs final exact byte bridge.',
 'completedUtc':datetime.now(timezone.utc).isoformat()}
(base/'evidence/final-head-audit-9986f326.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:report[k] for k in ['verdict','reviewedHead','actualReadOnlyFinalAuditExit','remainingBlockers','codeChanges','proofOnlyAdditions','rootManifest','rootFinalMedia','rootFinalRegressions']},ensure_ascii=False,indent=2))
