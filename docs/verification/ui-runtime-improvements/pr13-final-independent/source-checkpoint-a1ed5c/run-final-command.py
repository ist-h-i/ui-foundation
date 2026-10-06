import datetime,json,pathlib,subprocess,sys,os
root=pathlib.Path(__file__).resolve().parent
label,*argv=sys.argv[1:]
stage=root/'repository-a1ed5c';evidence=root/'evidence-a1ed5c'
started=datetime.datetime.now(datetime.timezone.utc).isoformat()
out=evidence/(label+'.log')
with out.open('wb') as log:
    result=subprocess.run(argv,cwd=stage,stdout=log,stderr=subprocess.STDOUT,env=os.environ.copy())
record={'label':label,'argv':argv,'cwd':str(stage),'sourceCommit':'a1ed5c012c5b35a50e8df1038e04ade71cf044c4','startedUtc':started,'endedUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'actualExit':result.returncode,'log':out.name}
(evidence/(label+'.exit')).write_text(str(result.returncode)+'\n')
(evidence/(label+'.command.json')).write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps(record));print(out.read_text()[-1800:])
sys.exit(result.returncode)
