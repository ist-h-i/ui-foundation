from pathlib import Path
import subprocess,datetime,json,hashlib
root=Path('/tmp/ui-foundation-collections-contrast-audit')
command=['python3',str(root/'verify-evidence.py')]
started=datetime.datetime.now(datetime.timezone.utc).isoformat()
with (root/'logs/verification.log').open('w') as log:
 process=subprocess.run(command,cwd=root,stdout=log,stderr=subprocess.STDOUT)
result={'command':command,'startedAtUTC':started,'finishedAtUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'actualExitCode':process.returncode,'log':str(root/'logs/verification.log'),'logSha256':hashlib.sha256((root/'logs/verification.log').read_bytes()).hexdigest()}
(root/'verification-run.json').write_text(json.dumps(result,indent=2)+'\n')
(root/'verification-run.exit').write_text(str(process.returncode)+'\n')
print(json.dumps(result))
raise SystemExit(process.returncode)
