from pathlib import Path
import subprocess,json,hashlib
from datetime import datetime,timezone
base=Path('/tmp/ui-foundation-portable-tools-independent-review-20261006')
repo=base/'relocated checkout 日本語';shared=Path('/Users/inouehiroshi/Documents/GitHub/ui-foundation')
ev=base/'nocheck-supplement';ev.mkdir()
fixture=base/'literal whitespace fixture'
ref=subprocess.check_output(['git','rev-parse','HEAD'],cwd=fixture,text=True).strip()
original=subprocess.check_output(['git','show',ref+':tests/ui/media.spec.ts'],cwd=fixture,text=True)
config=json.loads(subprocess.check_output(['git','show',ref+':tsconfig.ui-media.json'],cwd=fixture,text=True))
file=repo/'scripts/verification/audit-media.mjs'
before=file.read_bytes();after=(shared/'scripts/verification/audit-media.mjs').read_bytes()
assert hashlib.sha256(before).hexdigest()=='dc88ac8d913ae77f11b2b1e8611c092e3329caa5971c0f345413dc77d04dfd85'
assert hashlib.sha256(after).hexdigest()=='8af7eccc9de63547ab9bc86ba09846d963fdc41d758348866ee4fca7bafeaae1'
changes=[]
def run(name):
 args=['node',str(file),'--repo',str(fixture),'--baseline',ref,'--output',str(ev/name)]
 started=datetime.now(timezone.utc).isoformat();r=subprocess.run(args,cwd=base/'unrelated cwd',capture_output=True,text=True,timeout=130)
 (ev/(name+'.log')).write_text(r.stdout+r.stderr);(ev/(name+'.exit')).write_text(str(r.returncode)+'\n')
 report=json.loads((ev/name/'media-audit.json').read_text())
 record={'name':name,'argv':args,'cwd':str(base/'unrelated cwd'),'startedUtc':started,'endedUtc':datetime.now(timezone.utc).isoformat(),'actualProcessExit':r.returncode,'sourceSha256':hashlib.sha256(file.read_bytes()).hexdigest(),'stdout':r.stdout,'stderr':r.stderr,'compilerActualExit':report['compiler']['actualExit'],'compilerOptions':report['compilerOptions'],'missingCompilerSpecs':report['missingCompilerSpecs'],'configSafe':report['configSafe'],'pass':report['pass'],'strictCompilerOutput':(ev/name/'strict.stdout.log').read_text()};changes.append(record);return record
(fixture/'tsconfig.ui-media.json').write_text(json.dumps({**config,'compilerOptions':{**config['compilerOptions'],'noCheck':True}}))
(fixture/'tests/ui/media.spec.ts').write_text(original+"const invalid:number='text';\n")
old=run('before-nocheck-hidden-typeerror');assert old['actualProcessExit']==0 and old['compilerActualExit']==0 and old['pass'] is True
file.write_bytes(after)
new=run('after-nocheck-invalid-type');assert new['actualProcessExit']==1 and new['compilerActualExit']==2 and new['configSafe'] is False and new['compilerOptions']['noCheck'] is True and new['missingCompilerSpecs']==[]
(fixture/'tests/ui/media.spec.ts').write_text(original)
healthy_disabled=run('after-nocheck-no-typeerror');assert healthy_disabled['actualProcessExit']==1 and healthy_disabled['compilerActualExit']==0 and healthy_disabled['configSafe'] is False
(fixture/'tsconfig.ui-media.json').write_text(json.dumps({**config,'compilerOptions':{**config['compilerOptions'],'noCheck':False}}))
valid=run('after-nocheck-false-valid');assert valid['actualProcessExit']==0 and valid['compilerActualExit']==0 and valid['configSafe'] is True and valid['compilerOptions']['noCheck'] is False
(fixture/'tsconfig.ui-media.json').write_text(json.dumps(config))
for name,sha in [('build-handoff.py','9afe19b4419401f1d0b574cde9ec7c6528f6264dd90c40e94117c3d7c6013ad8'),('build-public-proof.py','8c2311e699c2427214f89a48e44f7011c3f241e5f60e4ed187ad32ec4db7e6c2'),('evidence_pack.py','5eca660dc5a92cc3c94f88e90f7a5061f59a051273864eea4510ceb63b5fb639')]:
 assert hashlib.sha256((shared/'scripts/verification'/name).read_bytes()).hexdigest()==hashlib.sha256((repo/'scripts/verification'/name).read_bytes()).hexdigest()==sha
report={'scope':'Only noCheck strict-option delta; no other hole exploration or UI run','actualIndependentDeltaCheckExit':0,'beforeAuditSha256':hashlib.sha256(before).hexdigest(),'afterAuditSha256':hashlib.sha256(after).hexdigest(),'baselineFixtureCommit':ref,'cases':changes,'typedError':"const invalid:number='text';",'Python3SourcesUnchanged':True,'sharedWrites':0,'newNativeStaticFullSuiteExecuted':False,'createdUtc':datetime.now(timezone.utc).isoformat()}
(ev/'NO-CHECK-RESULTS.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'actualDeltaExit':0,'beforeProcessCompiler':[old['actualProcessExit'],old['compilerActualExit']],'afterInvalidProcessCompiler':[new['actualProcessExit'],new['compilerActualExit']],'afterHealthyNoCheckProcessCompiler':[healthy_disabled['actualProcessExit'],healthy_disabled['compilerActualExit']],'afterValidFalseProcessCompiler':[valid['actualProcessExit'],valid['compilerActualExit']],'finalAuditSha256':report['afterAuditSha256']},ensure_ascii=False,indent=2))
