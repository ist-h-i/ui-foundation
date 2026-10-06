from pathlib import Path
import subprocess,hashlib,json,datetime
root=Path('/tmp/ui-foundation-portable-tools-root');repo=root/'relocated-checkout';cwd=root/'unrelated-cwd';out=root/'real-entrypoints-v1';out.mkdir(exist_ok=False)
commands=[
 ('media',['node',str(repo/'scripts/verification/audit-media.mjs'),'--baseline','9f5430ca87e249af204cc335a8610d0d8040621f','--output',str(out/'media')]),
 ('handoff',['python3',str(repo/'scripts/verification/build-handoff.py'),'--manifest-sha256','bc9049f0128c315ea963e1d7ac371b2a65b7e1789996668fc333ae32777f4998','--transport-metadata-sha256','a87cc9844bcd51bc4bc76db85d72d73ae0a981ade45c1dd0544896738bd6dcef','--output',str(out/'handoff')]),
 ('cross-browser',['python3',str(repo/'scripts/verification/build-public-proof.py'),'--manifest-sha256','e929d1d31b57b55717dcf511388fd82991273b6e661f6afbd737ccfcd184ca78','--transport-metadata-sha256','b87271548398f71268790e0710a001622402437ed1ee75bd11b3ebf1391cbe06','--output',str(out/'cross-browser')])
]
records=[]
for name,argv in commands:
 started=datetime.datetime.now(datetime.timezone.utc).isoformat();run=subprocess.run(argv,cwd=cwd,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
 (out/(name+'.stdout.log')).write_bytes(run.stdout);(out/(name+'.stderr.log')).write_bytes(run.stderr)
 row={'name':name,'argv':argv,'cwd':str(cwd),'startedUtc':started,'finishedUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'actualExit':run.returncode};records.append(row)
 print(json.dumps({'name':name,'actualExit':run.returncode,'stdout':run.stdout.decode(),'stderr':run.stderr.decode()}),flush=True)
 (out/'commands.json').write_text(json.dumps(records,indent=2)+'\n')
 if run.returncode:raise SystemExit(run.returncode)
report=json.loads((out/'media/media-audit.json').read_text());assert report['matcherCount']==228 and report['titleCount']==18 and report['afterAny']==0 and report['pass'] and report['compiler']['actualExit']==0
for name,count in [('handoff',139),('cross-browser',359)]:
 receipt=json.loads((out/name/'transport-receipt.json').read_text());assert receipt['listedArtifactCount']==count and receipt['historicalNativeResultsReexecuted'] is False and receipt['historicalReviewDecisionsRenewed'] is False and receipt['currentUiVerificationPerformed'] is False
print(json.dumps({'realEntries':3,'actualExit':0,'mediaTitles':report['titleCount'],'mediaMatchers':report['matcherCount'],'allOriginalPayloads':498,'nativeTestsReexecuted':False}),flush=True)
